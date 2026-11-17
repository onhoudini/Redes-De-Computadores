/* Simulações do Capítulo 10 — O Domain Name System (seção 3.2 do livro).
 * Cada uma é registrada em Redes.registrar. Os dados vêm dos exemplos do livro;
 * quando não vêm, usam nomes e endereços reservados para documentação (RFC 2606, RFC 3849, RFC 5737). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function hex2(n) { return n.toString(16).padStart(2, "0"); }
    function hex4(n) { return n.toString(16).padStart(4, "0"); }
    function bin(n, largura) { return n.toString(2).padStart(largura, "0"); }
    function normaliza(s) { return String(s || "").trim().toLowerCase().replace(/\.$/, ""); }
    function faixa(rotulo, min, max, passo, valor) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor, id: u.novoId("faixa") });
        var mostra = el("span", { class: "fw-semibold" });
        var linha = el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id }, rotulo, mostra), input);
        return { input: input, mostra: mostra, linha: linha };
    }
    function entrada(valor, rotulo) {
        return el("input", { class: "form-control form-control-sm mono", value: valor || "", "aria-label": rotulo || null, spellcheck: "false", autocomplete: "off" });
    }

    /* ---------- IPv6: leitura e forma compacta ---------- */
    // Devolve os 8 grupos de 16 bits, ou null se o texto não for um endereço IPv6 válido.
    function leIPv6(texto) {
        var s = String(texto || "").trim().toLowerCase();
        if (!/^[0-9a-f:]+$/.test(s) || s.indexOf(":::") >= 0) return null;
        var partes = s.split("::");
        if (partes.length > 2) return null;
        function grupos(p) { return p === "" ? [] : p.split(":"); }
        var esq = grupos(partes[0]), dir = partes.length === 2 ? grupos(partes[1]) : [];
        var todos = esq.concat(dir);
        if (todos.some(function (g) { return !/^[0-9a-f]{1,4}$/.test(g); })) return null;
        var faltam = 8 - todos.length;
        if (partes.length === 1 && faltam !== 0) return null;
        if (partes.length === 2 && faltam < 1) return null;
        var zeros = [];
        for (var i = 0; i < faltam && partes.length === 2; i++) zeros.push("0");
        return esq.concat(zeros, dir).map(function (g) { return parseInt(g, 16); });
    }
    // Maior sequência de grupos nulos (a primeira, em caso de empate), com pelo menos 2 grupos (RFC 5952).
    function maiorSequenciaZero(g) {
        var melhor = { ini: -1, tam: 0 }, ini = -1;
        for (var i = 0; i <= 8; i++) {
            if (i < 8 && g[i] === 0) { if (ini < 0) ini = i; }
            else if (ini >= 0) {
                if (i - ini > melhor.tam) melhor = { ini: ini, tam: i - ini };
                ini = -1;
            }
        }
        return melhor.tam >= 2 ? melhor : { ini: -1, tam: 0 };
    }
    function compactaIPv6(g) {
        var z = maiorSequenciaZero(g);
        var txt = g.map(function (x) { return x.toString(16); });
        if (z.ini < 0) return txt.join(":");
        return txt.slice(0, z.ini).join(":") + "::" + txt.slice(z.ini + z.tam).join(":");
    }
    function completaIPv6(g) { return g.map(hex4).join(":"); }
    R.ipv6 = { le: leIPv6, compacta: compactaIPv6 };   // exposto para os testes automáticos

    /* ------------------------------------------------------------------
     * 1. Notação IPv6 (pág. 133–134 do PDF)
     * ------------------------------------------------------------------ */

    /* ------------------------------------------------------------------
     * 2. Cabeçalho DNS de 12 bytes (Fig. 3, pág. 135 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("cabecalho-dns", function (raiz) {
        var id = el("input", { type: "number", class: "form-control form-control-sm", min: 0, max: 65535, value: 4660 });
        var qr = el("select", { class: "form-select form-select-sm" }, el("option", { value: "0" }, "0 — consulta"), el("option", { value: "1" }, "1 — resposta"));
        var opcode = el("select", { class: "form-select form-select-sm" }, el("option", { value: "0" }, "0 — consulta padrão"), el("option", { value: "5" }, "5 — atualização (UPDATE)"));
        var rcode = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "0" }, "0 — sem erro"), el("option", { value: "2" }, "2 — falha do servidor"),
            el("option", { value: "3" }, "3 — nome não existe"), el("option", { value: "5" }, "5 — recusado"));
        var bits = {};
        var caixas = el("div", { class: "d-flex flex-wrap gap-3 mb-2" });
        [["AA", "autoridade"], ["TC", "truncada"], ["RD", "recursão desejada"], ["RA", "recursão disponível"]].forEach(function (b) {
            var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("dns") });
            bits[b[0]] = c;
            caixas.append(el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, b[0] + " (" + b[1] + ")")));
        });
        var contadores = {};
        var linhaCont = el("div", { class: "row g-2" });
        [["QD", "Question"], ["AN", "Answer"], ["NS", "Authority"], ["AR", "Additional"]].forEach(function (c) {
            var inp = el("input", { type: "number", class: "form-control form-control-sm", min: 0, max: 65535, value: c[0] === "QD" ? 1 : 0 });
            contadores[c[0]] = inp;
            linhaCont.append(el("div", { class: "col-6 col-md-3" }, u.campo(c[0] + "COUNT (" + c[1] + ")", inp)));
        });
        var bytes = el("div", { class: "d-flex flex-wrap mt-2" });
        var detalhe = el("pre", { class: "log mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var metas = [
            { nome: "consulta recursiva de um cliente (1 pergunta)", flags: 0x0100, cont: [1, 0, 0, 0] },
            { nome: "resposta da Fig. 5 do livro (flags qr rd ra; 1, 1, 6 e 11 registros)", flags: 0x8180, cont: [1, 1, 6, 11] }
        ];
        var feitas = {};
        var listaMetas = el("ul", { class: "small mb-2" });
        var concluir = R.desafio(raiz, "dns-cabecalho", 15, "Montar o cabeçalho de uma consulta e de uma resposta DNS");

        function inteiro(inp, max) { var v = Math.floor(Number(inp.value)); return isFinite(v) ? Math.max(0, Math.min(max, v)) : 0; }
        function flags() {
            return (Number(qr.value) << 15) | (Number(opcode.value) << 11) | (bits.AA.checked ? 1 << 10 : 0) | (bits.TC.checked ? 1 << 9 : 0) |
                (bits.RD.checked ? 1 << 8 : 0) | (bits.RA.checked ? 1 << 7 : 0) | Number(rcode.value);
        }
        function contagens() { return ["QD", "AN", "NS", "AR"].map(function (k) { return inteiro(contadores[k], 65535); }); }
        function desenhaMetas() {
            listaMetas.replaceChildren();
            metas.forEach(function (m, i) { listaMetas.append(el("li", null, (feitas[i] ? "✔ " : "○ ") + m.nome)); });
        }
        function mostra() {
            var f = flags(), c = contagens(), ident = inteiro(id, 65535);
            var palavras = [ident, f].concat(c);
            var nomes = ["ID", "flags", "QDCOUNT", "ANCOUNT", "NSCOUNT", "ARCOUNT"];
            bytes.replaceChildren();
            palavras.forEach(function (w, i) {
                var classe = i === 0 ? "" : i === 1 ? " ctrl" : " ok";
                bytes.append(el("span", { class: "byte-cell" + classe }, hex2(w >> 8) + " " + hex2(w & 255), el("small", null, nomes[i])));
            });
            var b = bin(f, 16);
            var cols = [["QR", b[0]], ["Opcode", b.slice(1, 5)], ["AA", b[5]], ["TC", b[6]], ["RD", b[7]], ["RA", b[8]], ["Z", b.slice(9, 12)], ["RCODE", b.slice(12)]];
            var l1 = "", l2 = "";
            cols.forEach(function (c) { var larg = Math.max(c[0].length, c[1].length) + 2; l1 += c[0].padEnd(larg); l2 += c[1].padEnd(larg); });
            detalhe.textContent = "flags = 0x" + hex4(f) + " = " + b + "\n" + l1 + "\n" + l2 + "\n" +
                "12 bytes: " + palavras.map(function (w) { return hex2(w >> 8) + " " + hex2(w & 255); }).join(" ");
        }
        function confere() {
            var f = flags(), c = contagens(), achou = -1;
            metas.forEach(function (m, i) { if (m.flags === f && m.cont.every(function (v, j) { return v === c[j]; })) achou = i; });
            if (achou < 0) {
                u.marca(fb, false, "Este cabeçalho não corresponde a nenhuma das metas. Confira QR, os bits e os quatro contadores.");
                return;
            }
            feitas[achou] = true;
            desenhaMetas();
            u.marca(fb, true, "Confere com a meta \"" + metas[achou].nome + "\": flags 0x" + hex4(f) + ".");
            if (feitas[0] && feitas[1]) concluir();
        }
        [id, qr, opcode, rcode].concat(Object.keys(bits).map(function (k) { return bits[k]; }), Object.keys(contadores).map(function (k) { return contadores[k]; }))
            .forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });

        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("Transaction ID", id)),
                el("div", { class: "col-6 col-md-3" }, u.campo("QR", qr)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Opcode", opcode)),
                el("div", { class: "col-6 col-md-3" }, u.campo("RCODE", rcode))),
            caixas, linhaCont, bytes, detalhe,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): monte os dois cabeçalhos abaixo (o ID pode ser qualquer um) e clique em Conferir."),
            listaMetas, u.botao("Conferir", "btn-primary", confere), fb);
        desenhaMetas();
        mostra();
    });

    /* ------------------------------------------------------------------
     * 3. TTL e cache do resolvedor (pág. 132 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("cache-ttl", function (raiz) {
        var ttl = faixa("TTL que o servidor autoritativo põe nas respostas", 30, 3600, 30, 3600);
        var relogio = 0, cache = null, proximo = 0, historico = [];
        var POOL = ["203.0.113.10", "203.0.113.11", "203.0.113.12", "203.0.113.13"];
        var estado = el("div", { class: "small mt-2", "aria-live": "polite" });
        var log = el("ul", { class: "log mt-2" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dns-ttl", 15, "Distribuir clientes entre servidores com um TTL curto");

        function texto(s) { var m = Math.floor(s / 60), r = s % 60; return m ? m + " min" + (r ? " " + r + " s" : "") : r + " s"; }
        function desenha() {
            ttl.mostra.textContent = texto(Number(ttl.input.value));
            var resta = cache ? cache.expira - relogio : 0;
            estado.replaceChildren(
                el("div", null, "Relógio: ", el("strong", null, "t = " + texto(relogio))),
                el("div", null, "Cache do resolvedor: ", cache && resta > 0
                    ? el("span", { class: "mono" }, "www.loja.example AAAA → " + cache.endereco + " (expira em " + texto(resta) + ")")
                    : el("span", { class: "text-muted" }, "vazio ou expirado")));
        }
        function registra(linha, classe) { log.prepend(el("li", { class: classe || null }, linha)); }
        function consulta() {
            var hit = cache && cache.expira > relogio;
            if (!hit) {
                var end = POOL[proximo % POOL.length];
                proximo++;
                cache = { endereco: end, expira: relogio + Number(ttl.input.value) };
                registra("t = " + texto(relogio) + ": falta no cache → o resolvedor pergunta ao autoritativo, que indica o servidor menos carregado: " + end + " (TTL " + texto(Number(ttl.input.value)) + ")");
            } else {
                registra("t = " + texto(relogio) + ": acerto no cache → " + cache.endereco + " (o autoritativo nem fica sabendo)");
            }
            historico.push({ t: relogio, end: cache.endereco });
            var janela = historico.filter(function (h) { return h.t >= relogio - 300; });
            var distintos = {};
            janela.forEach(function (h) { distintos[h.end] = true; });
            var n = Object.keys(distintos).length;
            if (n >= 3) { u.marca(fb, true, "Em 5 minutos, os clientes foram mandados para " + n + " servidores diferentes. TTL curto = mais consultas ao autoritativo, mas mais controle sobre a carga."); concluir(); }
            else fb.textContent = "Servidores diferentes entregues nos últimos 5 minutos: " + n + ".";
            desenha();
        }
        function avanca() { relogio += 60; registra("… passam 60 s", "text-muted"); desenha(); }
        function reinicia() { relogio = 0; cache = null; proximo = 0; historico = []; log.replaceChildren(); fb.textContent = ""; desenha(); }
        ttl.input.addEventListener("input", desenha);

        raiz.append(ttl.linha,
            el("div", { class: "d-flex flex-wrap gap-2" },
                u.botao("Um cliente consulta www.loja.example", "btn-primary", consulta),
                u.botao("Avançar 60 s", "btn-outline-secondary", avanca),
                u.botao("Recomeçar", "btn-outline-secondary", reinicia)),
            estado, log, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça os clientes serem mandados para 3 servidores diferentes dentro de 5 minutos de relógio. Com o TTL de 1 hora, dá?"));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 4. DNS reverso: in-addr.arpa e ip6.arpa (pág. 133 do PDF)
     * ------------------------------------------------------------------ */
    function nomeReverso(texto) {
        var s = String(texto || "").trim();
        var m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (m) {
            var n = m.slice(1).map(Number);
            if (n.some(function (x) { return x > 255; })) return null;
            return { tipo: 4, partes: n.map(String), nome: n.slice().reverse().join(".") + ".in-addr.arpa" };
        }
        var g = leIPv6(s);
        if (!g) return null;
        var nibbles = g.map(hex4).join("").split("");
        return { tipo: 6, partes: nibbles, nome: nibbles.slice().reverse().join(".") + ".ip6.arpa" };
    }
    R.nomeReverso = nomeReverso;

    R.registrar("nome-reverso", function (raiz) {
        var campo = entrada("2001:1890:123a::1:1e", "Endereço IP");
        var pecas = el("div", { class: "d-flex flex-wrap mt-2" });
        var saida = el("pre", { class: "log mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var r = nomeReverso(campo.value);
            pecas.replaceChildren();
            if (!r) { saida.textContent = "Digite um endereço IPv4 (ex.: 192.0.2.11) ou IPv6."; return; }
            r.partes.slice().reverse().forEach(function (p, i) {
                pecas.append(el("span", { class: "byte-cell" + (i === 0 ? " ctrl" : ""), style: "min-width:" + (r.tipo === 4 ? "2.6rem" : "1.4rem") }, p));
            });
            saida.textContent = "Pergunta PTR para:\n" + r.nome + "\n" + (r.tipo === 4
                ? "Os 4 bytes do endereço aparecem em ordem inversa (o último byte primeiro)."
                : "São 32 nibbles (4 bits cada), do menos significativo (em amarelo) ao mais significativo.");
        }
        campo.addEventListener("input", mostra);

        var r4 = entrada("", "Nome PTR de 198.51.100.7"), r6 = entrada("", "Quatro primeiros rótulos para 2001:db8::abcd");
        var fb = u.feedback(), feitas = {};
        var concluir = R.desafio(raiz, "dns-reverso", 10, "Escrever nomes do DNS reverso");
        function confere() {
            var ok4 = normaliza(r4.value) === "7.100.51.198.in-addr.arpa";
            var ok6 = normaliza(r6.value) === "d.c.b.a";
            if (ok4) feitas.v4 = true;
            if (ok6) feitas.v6 = true;
            if (feitas.v4 && feitas.v6) { u.marca(fb, true, "Os dois conferem."); concluir(); }
            else u.marca(fb, false, (ok4 ? "O IPv4 está certo. " : "Confira o IPv4: inverta os 4 bytes e acrescente in-addr.arpa. ") +
                (ok6 ? "O IPv6 está certo." : "Confira o IPv6: o último grupo é abcd, e o primeiro rótulo é o último nibble."));
        }
        raiz.append(u.campo("Endereço (IPv4 ou IPv6)", campo), pecas, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            u.campo("Nome PTR completo de 198.51.100.7", r4),
            u.campo("Os quatro primeiros rótulos do nome PTR de 2001:db8::abcd (separados por pontos)", r6),
            u.botao("Conferir", "btn-primary", confere), fb);
        mostra();
    });
}());
