/* Simulações do Capítulo 14 — Chamadas de procedimento remoto (seção 3.6 do livro).
 * Cada uma é registrada em Redes.registrar. Os exemplos vêm do livro; os demais usam
 * nomes reservados para documentação (RFC 2606). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function hex2(n) { return n.toString(16).padStart(2, "0"); }
    function entrada(valor, rotulo) {
        return el("input", { class: "form-control form-control-sm mono", value: valor || "", "aria-label": rotulo || null, spellcheck: "false", autocomplete: "off" });
    }
    function faixa(rotulo, min, max, passo, valor, unidade) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor, id: u.novoId("faixa") });
        var mostra = el("span", { class: "fw-semibold" });
        function atualiza() { mostra.textContent = input.value + (unidade || ""); }
        input.addEventListener("input", atualiza);
        atualiza();
        var linha = el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id }, rotulo, mostra), input);
        return { input: input, mostra: mostra, linha: linha };
    }
    function caixa(rotulo, marcada) {
        var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: !!marcada });
        return { input: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, rotulo)) };
    }
    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }

    /* ---------- URI segundo a RFC 3986 (apêndice B) ---------- */
    var PORTAS = { http: 80, https: 443, ftp: 21, telnet: 23, ssh: 22 };
    function leURI(texto) {
        var m = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/.exec(String(texto || "").trim());
        if (!m) return null;
        var r = { esquema: m[2] || "", autoridade: m[4], caminho: m[5] || "", consulta: m[7], fragmento: m[9], usuario: undefined, host: undefined, porta: undefined };
        if (r.autoridade !== undefined) {
            var a = r.autoridade, arroba = a.lastIndexOf("@");
            if (arroba >= 0) { r.usuario = a.slice(0, arroba); a = a.slice(arroba + 1); }
            var mm = /^(\[[^\]]*\]|[^:]*)(:(\d*))?$/.exec(a);
            if (mm) { r.host = mm[1].replace(/^\[|\]$/g, ""); r.porta = mm[3]; }
            else r.host = a;
        }
        return r;
    }
    R.leURI = leURI;

    /* ------------------------------------------------------------------
     * 1. Dissecando uma URI (pág. 149–150 do PDF)
     * ------------------------------------------------------------------ */

    /* ------------------------------------------------------------------
     * 8. XDR contra JSON (pág. 166–168 do PDF)
     * ------------------------------------------------------------------ */
    function xdrInt(n) { var b = []; var v = n >>> 0; for (var i = 3; i >= 0; i--) b.push((v >>> (i * 8)) & 255); return b; }
    function xdr(tipo, valor) {
        var partes = [];
        if (tipo === "int") partes.push({ papel: "inteiro", bytes: xdrInt(valor) });
        else if (tipo === "texto") {
            var dados = Array.from(new TextEncoder().encode(valor));
            partes.push({ papel: "tamanho", bytes: xdrInt(dados.length) }, { papel: "dados", bytes: dados });
            var ench = (4 - dados.length % 4) % 4;
            if (ench) partes.push({ papel: "enchimento", bytes: new Array(ench).fill(0) });
        } else {
            partes.push({ papel: "n", bytes: xdrInt(valor.length) });
            valor.forEach(function (v) { partes.push({ papel: "elemento", bytes: xdrInt(v) }); });
        }
        return partes;
    }
    R.xdr = function (tipo, valor) { return xdr(tipo, valor).reduce(function (s, p) { return s.concat(p.bytes); }, []); };

    R.registrar("xdr-vs-json", function (raiz) {
        var tipo = el("select", { class: "form-select form-select-sm" }, el("option", { value: "lista" }, "lista de inteiros"), el("option", { value: "texto" }, "texto"), el("option", { value: "int" }, "inteiro"));
        var valor = entrada("2, 3, 5, 7", "Valor");
        var bytesX = el("div", { class: "d-flex flex-wrap mt-2" });
        var saida = el("pre", { class: "log mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "xdr-json", 15, "Comparar o tamanho de XDR e JSON");
        function interpreta() {
            var t = tipo.value, v = valor.value;
            if (t === "texto") return { ok: true, v: v, json: JSON.stringify(v) };
            if (t === "int") {
                var n = Number(v.trim());
                if (!/^-?\d+$/.test(v.trim()) || n < -2147483648 || n > 2147483647) return { ok: false };
                return { ok: true, v: n, json: JSON.stringify(n) };
            }
            var itens = v.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
            if (!itens.length || itens.some(function (x) { return !/^-?\d+$/.test(x) || Number(x) < -2147483648 || Number(x) > 2147483647; })) return { ok: false };
            var lista = itens.map(Number);
            return { ok: true, v: lista, json: JSON.stringify(lista) };
        }
        function mostra() {
            var r = interpreta();
            bytesX.replaceChildren();
            if (!r.ok) { saida.textContent = "Valor inválido: use inteiros de 32 bits (de -2147483648 a 2147483647), separados por vírgula na lista."; return; }
            var partes = xdr(tipo.value === "lista" ? "lista" : tipo.value, r.v), total = 0;
            partes.forEach(function (p) {
                p.bytes.forEach(function (b, i) {
                    total++;
                    var classe = p.papel === "enchimento" ? "muted" : p.papel === "tamanho" || p.papel === "n" ? "ctrl" : "";
                    bytesX.append(el("span", { class: "byte-cell " + classe, style: "min-width:2rem" }, hex2(b), i === 0 ? el("small", null, p.papel) : el("small", null, " ")));
                });
            });
            var j = new TextEncoder().encode(r.json).length;
            saida.textContent = "XDR:  " + total + " bytes\nJSON: " + j + " bytes  " + r.json;
            if (tipo.value === "lista") {
                if (total > j) vistos.maior = true;
                if (total < j) vistos.menor = true;
            }
            if (vistos.maior && vistos.menor) { u.marca(fb, true, "Você achou os dois casos: números pequenos ocupam poucos caracteres em JSON, mas sempre 4 bytes em XDR; números grandes, o contrário."); concluir(); }
            else if (tipo.value === "lista") { fb.className = "small mt-2 mb-0"; fb.textContent = (vistos.maior ? "✔ XDR maior que JSON. " : "") + (vistos.menor ? "✔ XDR menor que JSON. " : ""); }
        }
        [tipo, valor].forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });
        tipo.addEventListener("change", function () { valor.value = tipo.value === "lista" ? "2, 3, 5, 7" : tipo.value === "texto" ? "redes" : "1"; mostra(); });
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-sm-4" }, u.campo("Tipo", tipo)), el("div", { class: "col-sm-8" }, u.campo("Valor", valor))),
            el("p", { class: "small text-muted mb-0" }, "Bytes do XDR: amarelo = tamanho ou número de elementos; cinza = enchimento até múltiplo de 4."),
            bytesX, saida, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): com o tipo \"lista de inteiros\", ache uma lista em que o XDR ocupe mais bytes que o JSON e outra em que ocupe menos."));
        mostra();
    });

    /* ------------------------------------------------------------------
     * 9. JSON-RPC, perdas e pedidos repetidos (pág. 168–169 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("json-rpc", function (raiz) {
        var perde = caixa("A rede perde a próxima resposta", false);
        var lembra = caixa("O servidor lembra os ids já atendidos", false);
        var saldo = 100, proximoId = 1, ultimo = null, atendidos = {}, vistos = {}, depositosDoId = {};
        var log = el("ul", { class: "log mt-2" });
        var estado = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "rpc-repetido", 15, "Ver um depósito duplicado e evitá-lo com o id");
        function linha(t, classe) { log.append(el("li", { class: classe || null }, t)); log.scrollTop = log.scrollHeight; }
        function atende(p) {
            if (lembra.input.checked && atendidos[p.id]) { linha("   servidor: id " + p.id + " já foi atendido; repete a resposta sem executar de novo", "text-muted"); return atendidos[p.id]; }
            var r;
            if (p.method === "sum") r = { jsonrpc: "2.0", result: p.params[0] + p.params[1], id: p.id };
            else if (p.method === "deposit") {
                saldo += p.params[0]; r = { jsonrpc: "2.0", result: saldo, id: p.id };
                depositosDoId[p.id] = (depositosDoId[p.id] || 0) + 1;
            } else r = { jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: p.id };
            atendidos[p.id] = r;
            return r;
        }
        function envia(p, repetido) {
            ultimo = p;
            linha("→ " + JSON.stringify(p) + (repetido ? "  (reenvio)" : ""));
            var r = atende(p);
            if (perde.input.checked) { perde.input.checked = false; linha("← (resposta perdida na rede)", "text-danger"); }
            else linha("← " + JSON.stringify(r));
            estado.textContent = "Saldo da conta no servidor: " + saldo;
            if (p.method === "deposit" && repetido) {
                if (depositosDoId[p.id] >= 2) vistos.duplicado = true;
                else if (lembra.input.checked) vistos.evitado = true;
            }
            if (vistos.duplicado && vistos.evitado) { u.marca(fb, true, "Sem memória dos ids, o reenvio deposita duas vezes; lembrando os ids, o servidor só repete a resposta."); concluir(); }
            else if (vistos.duplicado) { fb.className = "small mt-2 mb-0"; fb.textContent = "O depósito foi feito duas vezes! Agora ligue \"o servidor lembra os ids\" e repita a experiência."; }
        }
        function novo(metodo, params) { envia({ jsonrpc: "2.0", method: metodo, params: params, id: proximoId++ }, false); }
        raiz.append(
            el("div", { class: "d-flex flex-wrap gap-3" }, perde.linha, lembra.linha),
            el("div", { class: "d-flex flex-wrap gap-2 mt-2" },
                u.botao("sum(1, 3)", "btn-outline-primary mono", function () { novo("sum", [1, 3]); }),
                u.botao("deposit(50)", "btn-outline-primary mono", function () { novo("deposit", [50]); }),
                u.botao("mul(2, 3)", "btn-outline-primary mono", function () { novo("mul", [2, 3]); }),
                u.botao("Reenviar o último pedido (mesmo id)", "btn-outline-secondary", function () { if (ultimo) envia(ultimo, true); })),
            log, estado, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça um depósito cuja resposta se perca e reenvie o pedido. Depois, repita com o servidor lembrando os ids."));
        estado.textContent = "Saldo da conta no servidor: " + saldo;
    });
}());
