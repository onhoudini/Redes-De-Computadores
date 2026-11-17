/* Simulações do Capítulo 19 — UDP: o User Datagram Protocol (seção 3.11 do livro).
 * Cada uma é registrada em Redes.registrar. Os modelos de tempo são simplificados e dizem isso na tela. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function hex4(n) { return n.toString(16).padStart(4, "0"); }
    function hex2(n) { return n.toString(16).padStart(2, "0"); }
    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }
    function entrada(valor, rotulo) {
        return el("input", { class: "form-control form-control-sm mono", value: valor || "", "aria-label": rotulo || null, spellcheck: "false", autocomplete: "off" });
    }
    function caixa(rotulo, marcada) {
        var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: !!marcada });
        return { input: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, rotulo)) };
    }
    function faixa(rotulo, min, max, passo, valor, formata) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor, id: u.novoId("faixa") });
        var mostra = el("span", { class: "fw-semibold" });
        function atualiza() { mostra.textContent = formata ? formata(Number(input.value)) : input.value; }
        input.addEventListener("input", atualiza);
        atualiza();
        return { input: input, mostra: mostra, linha: el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id }, rotulo, mostra), input) };
    }
    function desafioNumero(raiz, id, pontos, titulo, pergunta, certo, explica, dica) {
        var resp = el("input", { type: "number", step: "any", class: "form-control form-control-sm", "aria-label": "Resposta" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, id, pontos, titulo);
        return el("div", null,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (" + pontos + " pts): " + pergunta),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = certo(Number(resp.value));
                u.marca(fb, ok, ok ? explica : dica);
                if (ok) concluir();
            })), fb);
    }

    /* ---------- checksum da Internet (RFC 1071) ---------- */
    var ORIGEM = { "2001:db8::1": [0x2001, 0x0db8, 0, 0, 0, 0, 0, 1], "2001:db8::9": [0x2001, 0x0db8, 0, 0, 0, 0, 0, 9] };
    var DESTINO = [0x2001, 0x0db8, 0, 0, 0, 0, 0, 2];
    function palavras(bytes) { var p = []; for (var i = 0; i < bytes.length; i += 2) p.push((bytes[i] << 8) | (bytes[i + 1] || 0)); return p; }
    function somaInternet(ws) { var t = 0; ws.forEach(function (w) { t += w; t = (t & 0xffff) + (t >>> 16); }); return t; }
    function palavrasUdp(origem, carga, ck) {
        var tam = 8 + carga.length;
        var pseudo = ORIGEM[origem].concat(DESTINO, [tam >>> 16, tam & 0xffff, 0, 17]);
        return { pseudo: pseudo, cabecalho: [1234, 5678, tam, ck], dados: palavras(carga) };
    }
    function checksumUdp(origem, carga) {
        var p = palavrasUdp(origem, carga, 0);
        return 0xffff - somaInternet(p.pseudo.concat(p.cabecalho, p.dados));
    }
    R.checksumUdp = function (texto) { return checksumUdp("2001:db8::1", Array.from(new TextEncoder().encode(texto))); };

    /* ------------------------------------------------------------------
     * 1. O checksum do UDP (pág. 186–187 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("checksum-udp", function (raiz) {
        var dadosEnv = entrada("ABCD", "Dados enviados");
        var grade = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "mono small mt-2 mb-0" });
        var dadosRec = entrada("ABCD", "Dados recebidos");
        var origemRec = el("select", { class: "form-select form-select-sm" }, el("option", { value: "2001:db8::1" }, "2001:db8::1 (a verdadeira)"), el("option", { value: "2001:db8::9" }, "2001:db8::9 (outra)"));
        var verif = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "checksum-fraco", 15, "Achar uma alteração que o checksum não detecta");
        var ck = 0;
        function bytes(inp) { return Array.from(new TextEncoder().encode(inp.value)); }
        function linha(rotulo, ws, classe) {
            return el("div", { class: "d-flex flex-wrap align-items-center" }, el("span", { class: "small text-muted me-2", style: "min-width:7.5rem" }, rotulo),
                ws.map(function (w) { return el("span", { class: "byte-cell " + (classe || ""), style: "min-width:3.1rem" }, hex4(w)); }));
        }
        function calcula() {
            var c = bytes(dadosEnv);
            ck = checksumUdp("2001:db8::1", c);
            var p = palavrasUdp("2001:db8::1", c, ck);
            var soma = somaInternet(p.pseudo.concat(p.cabecalho.slice(0, 3), [0], p.dados));
            grade.replaceChildren(
                linha("pseudo-cabeçalho", p.pseudo, "muted"),
                linha("cabeçalho UDP", p.cabecalho.slice(0, 3).concat([ck]), "ctrl"),
                linha("dados", p.dados, "ok"));
            resumo.textContent = "soma (com o checksum zerado) = 0x" + hex4(soma) + " → checksum = 0xffff − soma = 0x" + hex4(ck);
            confere();
        }
        function confere() {
            var c = bytes(dadosRec);
            var p = palavrasUdp(origemRec.value, c, ck);
            var total = somaInternet(p.pseudo.concat(p.cabecalho, p.dados));
            var ok = total === 0xffff;
            verif.replaceChildren("O receptor soma tudo, inclusive o checksum recebido: ", el("strong", { class: "mono" }, "0x" + hex4(total)),
                ok ? " = 0xffff → segmento aceito." : " ≠ 0xffff → segmento descartado (erro detectado).");
            var mudou = dadosRec.value !== dadosEnv.value;
            if (ok && mudou && origemRec.value === "2001:db8::1") { u.marca(fb, true, "Alteração não detectada! A soma não depende da ordem das palavras de 16 bits, e erros que se compensam passam despercebidos. Por isso o checksum só pega erros de transmissão comuns, não ataques."); concluir(); }
            else if (!ok && origemRec.value !== "2001:db8::1" && !mudou) { fb.className = "small mt-2 mb-0"; fb.textContent = "O pseudo-cabeçalho entra na soma: um segmento entregue com outro endereço de origem é descartado."; }
            else fb.textContent = "";
        }
        dadosEnv.addEventListener("input", function () { dadosRec.value = dadosEnv.value; calcula(); });
        [dadosRec, origemRec].forEach(function (c) { c.addEventListener("input", confere); c.addEventListener("change", confere); });
        raiz.append(el("p", { class: "small mb-2" }, "Um segmento UDP de 2001:db8::1, porta 1234, para 2001:db8::2, porta 5678. O checksum soma, em complemento de um, as palavras de 16 bits do pseudo-cabeçalho, do cabeçalho e dos dados."),
            u.campo("Dados enviados", dadosEnv), grade, resumo,
            el("div", { class: "row g-2 mt-2" }, el("div", { class: "col-sm-6" }, u.campo("Dados que chegaram (altere à vontade)", dadosRec)), el("div", { class: "col-sm-6" }, u.campo("Endereço de origem no pacote recebido", origemRec))),
            verif, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): mude os dados recebidos de um jeito que o receptor NÃO perceba."));
        calcula();
    });
}());
