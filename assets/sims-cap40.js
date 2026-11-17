/* Simulações do Capítulo 40 — Prática: redes IPv6 (seção 4.14 do livro, pág. 336–350 do PDF).
 * Topologias, endereços e tabelas transcritos das figuras das págs. 337–343. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, s = u.svg;

    function escolha(rotulo, lista, vazio) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            vazio === false ? null : el("option", { value: "" }, "escolha…"),
            lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    function linhaPergunta(texto, controle) {
        return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, texto), el("div", { class: "col-sm-5" }, controle));
    }
    function campo(rotulo) { return el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": rotulo, autocomplete: "off", spellcheck: "false" }); }

    /* ---------- IPv6: leitura e maior prefixo ---------- */
    function le6(t) {
        var x = String(t || "").trim().toLowerCase().replace(/\/.*$/, "");
        if (!/^[0-9a-f:]+$/.test(x)) return null;
        var partes = x.split("::"); if (partes.length > 2) return null;
        function g(p) { return p === "" ? [] : p.split(":"); }
        var e = g(partes[0]), d = partes.length === 2 ? g(partes[1]) : [];
        if (e.concat(d).some(function (y) { return !/^[0-9a-f]{1,4}$/.test(y); })) return null;
        var falta = 8 - e.length - d.length;
        if ((partes.length === 1 && falta !== 0) || falta < 0) return null;
        var z = []; for (var i = 0; i < falta; i++) z.push("0");
        return e.concat(z, d).map(function (y) { return parseInt(y, 16); });
    }
    function lePrefixo(t) { var p = String(t).trim().split("/"); var g = le6(p[0]); return g ? { g: g, len: p.length > 1 ? Number(p[1]) : 128 } : null; }
    function casa(gr, pf) {
        for (var b = 0; b < pf.len; b++) { var k = b >> 4, bit = 15 - (b & 15); if (((gr[k] >> bit) & 1) !== ((pf.g[k] >> bit) & 1)) return false; }
        return true;
    }
    function bin16(n) { return n.toString(2).padStart(16, "0"); }
    R.ipv640 = { le6: le6, lePrefixo: lePrefixo, casa: casa };
    var P = "2001:db8:1341:";
    function px(t) { return t.replace(/\bp:/g, P); }

    // Rede genérica: interfaces (nó -> endereços /64) e tabelas (nó -> [prefixo, próximo salto (endereço ou nome do vizinho)]).
    function rastreia(intf, tabs, origem, destino, limite) {
        var dg = le6(destino); if (!dg) return { cam: [origem], res: "destino inválido" };
        function dono(g) { return Object.keys(intf).find(function (n) { return intf[n].some(function (a) { return le6(a).join() === g.join(); }); }); }
        var alvo = dono(dg), n = origem, cam = [origem];
        for (var i = 0; i < (limite || 16); i++) {
            if (n === alvo) return { cam: cam, res: "entregue" };
            var cands = intf[n].map(function (a) { var g = le6(a); return { pf: { g: g, len: 64 }, nh: null }; })
                .concat((tabs[n] || []).map(function (l) { return { pf: lePrefixo(l[0]), nh: l[1] }; }))
                .filter(function (c) { return c.pf && casa(dg, c.pf); });
            if (!cands.length) return { cam: cam, res: "sem rota em " + n };
            var m = cands.reduce(function (a, b) { return b.pf.len > a.pf.len ? b : a; });
            var prox;
            if (m.nh === null) { prox = alvo && intf[alvo].some(function (a) { var g = le6(a); return casa(g, m.pf); }) ? alvo : null; if (!prox) return { cam: cam, res: "endereço inexistente na rede de " + n }; }
            else if (intf[m.nh]) prox = m.nh;
            else { var g2 = le6(m.nh); prox = g2 && dono(g2); if (!prox) return { cam: cam, res: "próximo salto desconhecido em " + n }; }
            n = prox; cam.push(n);
        }
        return { cam: cam, res: "laço" };
    }
    R.rastreia40 = rastreia;
    function leTabela(texto) {
        return texto.split("\n").map(function (l) { return l.trim().split(/\s+/); }).filter(function (p) { return p.length >= 2 && p[0]; }).map(function (p) { return [px(p[0]), px(p[1])]; });
    }

    /* ---------- Atividade 1: o maior prefixo em binário ---------- */
    R.registrar("prefixo-binario", function (raiz) {
        var end = campo("Endereço"); end.value = "2001:db8:1341:13::1";
        var pf = campo("Prefixo"); pf.value = "2001:db8:1341:12::/63";
        var saida = el("pre", { class: "log mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var g = le6(end.value), p = lePrefixo(pf.value);
            if (!g || !p) { saida.textContent = "Endereço ou prefixo inválido."; return; }
            var k = Math.min(7, Math.floor(Math.max(0, p.len - 1) / 16)), corte = p.len - 16 * k;
            saida.textContent = "grupo " + (k + 1) + " do endereço: " + bin16(g[k]) + "\ngrupo " + (k + 1) + " do prefixo:  " + bin16(p.g[k]) +
                "\n" + " ".repeat(21) + "^".repeat(Math.max(0, Math.min(16, corte))) + " (os " + p.len + " primeiros bits contam)\n" +
                (casa(g, p) ? "O endereço está dentro do prefixo." : "O endereço NÃO está dentro do prefixo.");
        }
        [end, pf].forEach(function (c) { c.addEventListener("input", mostra); });
        var CASOS = [["2001:db8:1341:13::1", "2001:db8:1341:12::/63", "sim"], ["2001:db8:1341:14::1", "2001:db8:1341:12::/63", "nao"], ["2001:db8:1341:3::b", "2001:db8:1341::/60", "sim"]];
        var sels = CASOS.map(function (c) { return escolha(c[0] + " em " + c[1], [["sim", "está dentro"], ["nao", "está fora"]]); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "prefixo-binario", 10, "O maior prefixo em binário");
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-sm-6" }, u.campo("Endereço IPv6", end)), el("div", { class: "col-sm-6" }, u.campo("Prefixo", pf))), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): diga sem usar a ferramenta."),
            el("div", null, CASOS.map(function (c, i) { return linhaPergunta(c[0] + " em " + c[1] + "?", sels[i]); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = CASOS.every(function (c, i) { return sels[i].value === c[2]; });
                u.marca(fb, ok, ok ? "Isso: 0x12 e 0x13 só diferem no último bit, que fica fora de um /63; 0x14 já difere antes. E o /60 cobre os grupos 0x0 a 0xf." : "Ainda não. Escreva o quarto grupo em binário.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 2: rotas estáticas (Q1–Q4) ---------- */
    var INTF = { A: [P + "1::a"], B: [P + "4::b"], R1: [P + "1::1", P + "12::1", P + "13::1"], R2: [P + "12::2", P + "23::2", P + "24::2"],
        R3: [P + "34::3", P + "23::3", P + "13::3"], R4: [P + "34::4", P + "24::4", P + "4::4"] };
    var INTF3 = { A: INTF.A, B: INTF.B, R1: INTF.R1, R2: [P + "12::2", P + "24::2"], R3: [P + "34::3", P + "13::3"], R4: INTF.R4 };
    var INTF4 = { A: INTF.A, B: INTF.B, R1: [P + "1::1", P + "12::1", P + "13::1", P + "14::1"], R2: INTF3.R2, R3: INTF3.R3, R4: [P + "34::4", P + "24::4", P + "14::4", P + "4::4"] };
    var R1_Q1 = "p:4::/64 p:12::2\np:23::/64 p:13::3\np:34::/64 p:13::3\np:24::/64 p:12::2", R4_Q1 = "p:1::/64 p:34::3\np:23::/64 p:24::2\np:13::/64 p:34::3\np:12::/64 p:24::2";
    var CEN = {
        q1: { nome: "Q1: proponha as tabelas de R2 e R3", intf: INTF, fixas: { R1: R1_Q1, R4: R4_Q1 }, editaveis: { R2: "", R3: "" } },
        q2: { nome: "Q2: as tabelas dadas de R2 e R3", intf: INTF, fixas: { R1: R1_Q1, R4: R4_Q1, R2: "p:1::/64 p:12::1\np:4::/64 p:23::3\np:13::/64 p:23::3\np:34::/64 p:23::3", R3: "p:1::/64 p:23::2\np:4::/64 p:34::4\np:12::/64 p:23::2\np:24::/64 p:23::2" }, editaveis: {} },
        q3: { nome: "Q3: R2 e R3 só com rota padrão; configure R1 e R4", intf: INTF3, fixas: { R2: "::/0 p:12::1", R3: "::/0 p:34::4" }, editaveis: { R1: "", R4: "" } },
        q4: { nome: "Q4: com o enlace R1–R4; caminhos até os endereços de R4", intf: INTF4, fixas: { R2: "::/0 p:12::1", R3: "::/0 p:34::4" }, editaveis: { R1: "p:34::/64 p:13::3", R4: "" }, destinos: ["p:14::4", "p:34::4", "p:24::4", "p:4::b"] }
    };
    R.cenRotas40 = CEN;
    function tabelasDe(c, editadas) {
        var t = { A: [["::/0", P + "1::1"]], B: [["::/0", P + "4::4"]] };
        Object.keys(c.fixas).forEach(function (r) { t[r] = leTabela(c.fixas[r]); });
        Object.keys(c.editaveis).forEach(function (r) { t[r] = leTabela(editadas[r] !== undefined ? editadas[r] : c.editaveis[r]); });
        return t;
    }
    R.registrar("rotas-estaticas", function (raiz) {
        var cen = escolha("Questão", Object.keys(CEN).map(function (k) { return [k, CEN[k].nome]; }), false);
        var areas = el("div", { class: "row g-2" }), fixas = el("div", { class: "small mono mb-2" }), saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var editadas = {}, cache = {};
        var desenho = s("svg", { viewBox: "0 0 340 150", class: "sim-svg w-100", style: "max-height:170px", role: "img", "aria-label": "Topologia com A, R1, R2, R3, R4 e B." });
        function monta() {
            var c = CEN[cen.value]; editadas = cache[cen.value] || {};
            fixas.replaceChildren.apply(fixas, Object.keys(c.fixas).map(function (r) { return el("div", null, el("strong", null, r + ": "), c.fixas[r].replace(/\n/g, "; ")); }));
            areas.replaceChildren.apply(areas, Object.keys(c.editaveis).map(function (r) {
                var ta = el("textarea", { class: "form-control form-control-sm mono", rows: 4, spellcheck: "false", "aria-label": "Tabela de " + r, placeholder: "p:4::/64 p:24::4" }, editadas[r] !== undefined ? editadas[r] : c.editaveis[r]);
                ta.addEventListener("input", function () { editadas[r] = ta.value; cache[cen.value] = editadas; mostra(); });
                return el("div", { class: "col-sm-6" }, u.campo("Tabela de " + r + " (prefixo e próximo salto por linha; p = 2001:db8:1341)", ta));
            }));
            var q34 = cen.value === "q3" || cen.value === "q4";
            var pos = { A: [30, 40], R1: [110, 40], R2: [210, 40], R3: [110, 115], R4: [210, 115], B: [300, 115] };
            var ar = [["A", "R1"], ["R1", "R2"], ["R1", "R3"], ["R2", "R4"], ["R3", "R4"], ["R4", "B"]];
            if (!q34) ar.push(["R2", "R3"]);
            if (cen.value === "q4") ar.push(["R1", "R4"]);
            var g = s("g", { "font-size": 12, "text-anchor": "middle" }); g.append(s("rect", { x: 0, y: 0, width: 340, height: 150, style: "fill: var(--bs-body-bg)" }));
            ar.forEach(function (e) { g.append(s("line", { class: "linha", x1: pos[e[0]][0], y1: pos[e[0]][1], x2: pos[e[1]][0], y2: pos[e[1]][1] })); });
            Object.keys(pos).forEach(function (n) { var p = pos[n]; g.append(n.length === 1 ? s("circle", { class: "no", cx: p[0], cy: p[1], r: 14 }) : s("rect", { class: "no", x: p[0] - 17, y: p[1] - 12, width: 34, height: 24, rx: 3 }), s("text", { x: p[0], y: p[1] + 4 }, n)); });
            desenho.replaceChildren(s("title", null, "Topologia"), g);
            mostra();
        }
        function mostra() {
            var c = CEN[cen.value], t = tabelasDe(c, editadas);
            var destinos = c.destinos || ["p:4::b"];
            var linhas = destinos.map(function (d) { var r = rastreia(c.intf, t, "A", px(d)); return el("li", null, "A → " + d + ": " + r.cam.join(" → ") + " (" + r.res + ")"); });
            var volta = rastreia(c.intf, t, "B", P + "1::a");
            linhas.push(el("li", null, "B → p:1::a: " + volta.cam.join(" → ") + " (" + volta.res + ")"));
            saida.replaceChildren(el("ul", { class: "mb-0" }, linhas));
        }
        cen.addEventListener("change", monta);
        function funciona(k) {
            var c = CEN[k], t = tabelasDe(c, cache[k] || {});
            return rastreia(c.intf, t, "A", P + "4::b").res === "entregue" && rastreia(c.intf, t, "B", P + "1::a").res === "entregue";
        }
        var P2 = escolha("Q2: caminhos inversos", [["sim", "sim, B → A volta pelo mesmo caminho"], ["nao", "não"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "rotas-estaticas", 20, "Rotas estáticas");
        raiz.append(u.campo("Questão", cen), desenho, fixas, areas, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (20 pts): faça A e B se comunicarem nos dois sentidos na Q1 e na Q3, editando as tabelas, e responda:"),
            linhaPergunta("Na Q2, o caminho de B para A é o inverso do de A para B?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var a = funciona("q1"), b = funciona("q3"), ok = a && b && P2.value === "sim";
                u.marca(fb, ok, ok ? "Isso. Na Q3, R1 precisa mandar B para R3 e R4 precisa mandar A para R2: o contrário criaria um laço com as rotas padrão." : "Ainda falta: Q1 " + (a ? "ok" : "não funciona") + ", Q3 " + (b ? "ok" : "não funciona") + (P2.value === "sim" ? "." : ", e a pergunta da Q2."));
                if (ok) concluir();
            }), fb);
        monta();
    });

    /* ---------- Atividade 3: a configuração dos alunos (Q5) ---------- */
    var I5 = { R1: ["p:12::1", "p:13::1"], R2: ["p:12::2", "p:24::2", "p:25::2"], R3: ["p:13::3", "p:34::3"], R4: ["p:24::4", "p:34::4", "p:46::4"], R5: ["p:25::5", "p:56::5"], R6: ["p:46::6", "p:56::6"] };
    var T5 = { R1: "::/0 p:12::2\np:25::/64 p:12::2\np:34::/64 p:12::2", R2: "::/0 p:12::1\np:13::/64 p:24::4\np:56::/64 p:24::4", R3: "::/0 p:13::1\np:56::/64 p:34::4",
        R5: "::/0 p:56::6\np:12::/64 p:25::2", R4: "p:12::/63 p:24::2\np:25::/64 p:46::6", R6: "::/0 p:56::5\np:13::/64 p:46::4\np:24::/63 p:46::4\np:34::/64 p:46::4" };
    function analisaQ5(tabs) {
        var intf = {}; Object.keys(I5).forEach(function (r) { intf[r] = I5[r].map(px); });
        var t = {}; Object.keys(tabs).forEach(function (r) { t[r] = leTabela(tabs[r]); });
        var res = [];
        Object.keys(I5).forEach(function (o) { Object.keys(I5).forEach(function (d) { if (d === o) return; I5[d].forEach(function (a) { var x = rastreia(intf, t, o, px(a)); res.push({ o: o, a: a, cam: x.cam, res: x.res }); }); }); });
        return res;
    }
    R.analisaQ540 = function () { return analisaQ5(T5); };
    R.registrar("verifica-alunos", function (raiz) {
        var tabs = JSON.parse(JSON.stringify(T5));
        var grade = el("div", { class: "row g-2" }), saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        Object.keys(T5).forEach(function (r) {
            var ta = el("textarea", { class: "form-control form-control-sm mono", rows: 4, spellcheck: "false", "aria-label": "Tabela de " + r }, T5[r]);
            ta.addEventListener("input", function () { tabs[r] = ta.value; mostra(); });
            grade.append(el("div", { class: "col-6 col-md-4" }, u.campo(r + " (" + I5[r].join(", ") + ")", ta)));
        });
        function mostra() {
            var r = analisaQ5(tabs), ruins = r.filter(function (x) { return x.res !== "entregue"; });
            saida.replaceChildren(el("p", { class: "mb-1 fw-semibold" }, ruins.length + " de " + r.length + " pares (roteador, endereço de outro roteador) falham."),
                el("ul", { class: "mb-0", style: "max-height: 180px; overflow-y: auto" }, ruins.map(function (x) { return el("li", { class: "mono" }, x.o + " → " + x.a + ": " + x.res + " (" + x.cam.slice(0, 6).join(" → ") + (x.cam.length > 6 ? " …" : "") + ")"); })));
        }
        var AFIRM = [["R1 manda p:34::/64 para R2, que o devolve pela rota padrão: laço entre R1 e R2", true], ["R4 não tem rota padrão nem rota para p:56::/64", true],
            ["R4 manda p:25::/64 para R6, e o /63 de R6 o devolve a R4: laço", true], ["R3 não alcança nenhum endereço de R1", false], ["R5 manda p:12::/64 para R6", false]];
        var cx = AFIRM.map(function (a) { var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") }); return { a: a, c: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, a[0])) }; });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "verifica-alunos", 15, "A configuração dos alunos");
        raiz.append(el("p", { class: "small mb-1" }, "As tabelas dos alunos (pág. 340–341 do PDF), editáveis; cada roteador também conhece as suas próprias sub-redes."), grade, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): marque os problemas que existem na configuração original."),
            el("div", null, cx.map(function (x) { return x.linha; })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = cx.every(function (x) { return x.c.checked === x.a[1]; });
                u.marca(fb, ok, ok ? "Isso: três problemas. Corrija as tabelas acima e veja a contagem chegar a zero." : "Ainda não. Leia a lista de falhas com a configuração original.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 4: objetivos de tráfego (Q6) ---------- */
    var VIZ6 = { R1: ["R2", "R3"], R2: ["R1", "R5", "R4"], R3: ["R1", "R4"], R4: ["R2", "R3", "R6"], R5: ["R2", "R6"], R6: ["R4", "R5"] };
    var HOST6 = { A1: ["R1", "p:0000::a1"], A2: ["R3", "p:0001::a2"], B1: ["R5", "p:0002::b1"], B2: ["R6", "p:0003::b2"] };
    var LOCAL6 = { R1: "p:0000::/64", R3: "p:0001::/64", R5: "p:0002::/64", R6: "p:0003::/64" };
    function traca6(tabs, o, d) {
        var r = HOST6[o][0], dg = le6(px(HOST6[d][1])), cam = [r];
        for (var i = 0; i < 12; i++) {
            if (LOCAL6[r] && casa(dg, lePrefixo(px(LOCAL6[r])))) return { cam: cam, ok: true };
            var c = leTabela(tabs[r] || "").map(function (l) { return { pf: lePrefixo(l[0]), nh: l[1] }; }).filter(function (x) { return x.pf && casa(dg, x.pf); });
            if (!c.length) return { cam: cam, ok: false, motivo: "sem rota em " + r };
            var nh = c.reduce(function (a, b) { return b.pf.len > a.pf.len ? b : a; }).nh;
            if (VIZ6[r].indexOf(nh) < 0) return { cam: cam, ok: false, motivo: r + " não é vizinho de " + nh };
            r = nh; cam.push(r);
        }
        return { cam: cam, ok: false, motivo: "laço" };
    }
    function objetivos6(tabs) {
        var fl = [], res = {};
        ["A1", "A2"].forEach(function (a) { ["B1", "B2"].forEach(function (b) { fl.push([a, b], [b, a]); }); });
        fl.forEach(function (f) { res[f.join(">")] = traca6(tabs, f[0], f[1]); });
        var todos = fl.every(function (f) { return res[f.join(">")].ok; });
        function via(o, d, r) { return res[o + ">" + d].cam.indexOf(r) >= 0; }
        return {
            res: res, todos: todos,
            a: todos && ["A1", "A2"].every(function (a) { return ["B1", "B2"].every(function (b) { return via(b, a, "R2") && via(a, b, "R4"); }); }),
            b: todos && Object.keys(res).every(function (k) { return res[k].cam.indexOf("R4") < 0; }),
            c: todos && ["A1", "A2"].every(function (a) { return via(a, "B1", "R2") && via(a, "B2", "R4"); })
        };
    }
    R.objetivos640 = objetivos6;
    R.registrar("objetivos-estaticos", function (raiz) {
        var tabs = { R1: "", R2: "", R3: "", R4: "", R5: "", R6: "" };
        var grade = el("div", { class: "row g-2" }), saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        Object.keys(tabs).forEach(function (r) {
            var ta = el("textarea", { class: "form-control form-control-sm mono", rows: 3, spellcheck: "false", "aria-label": "Tabela de " + r, placeholder: "p:0002::/63 " + VIZ6[r][0] }, "");
            ta.addEventListener("input", function () { tabs[r] = ta.value; mostra(); });
            grade.append(el("div", { class: "col-6 col-md-4" }, u.campo(r + " (vizinhos: " + VIZ6[r].join(", ") + ")", ta)));
        });
        var feitos = { a: false, b: false, c: false }, estado = el("ul", { class: "small mb-1" });
        function mostra() {
            var o = objetivos6(tabs);
            saida.replaceChildren(el("ul", { class: "mb-0 mono" }, Object.keys(o.res).map(function (k) { var x = o.res[k]; return el("li", null, k.replace(">", " → ") + ": " + x.cam.join(" → ") + (x.ok ? "" : " (" + x.motivo + ")")); })));
        }
        function mostraEstado() {
            var nomes = { a: "(a) B → A sempre por R2 e A → B sempre por R4", b: "(b) nenhum pacote para A1, A2, B1 ou B2 passa por R4", c: "(c) A → B1 por R2 e A → B2 por R4" };
            estado.replaceChildren.apply(estado, Object.keys(nomes).map(function (k) { return el("li", null, (feitos[k] ? "✔ " : "○ ") + nomes[k]); }));
        }
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "objetivos-estaticos", 20, "Objetivos com rotas estáticas");
        raiz.append(el("p", { class: "small mb-1" }, "Escreva as rotas como \"prefixo vizinho\" (p = 2001:db8:1341). Os hosts mandam tudo ao seu roteador, e cada roteador conhece a rede do seu host."),
            grade, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (20 pts): alcance cada objetivo (um de cada vez) e clique em Verificar. Todos os oito fluxos precisam chegar."),
            estado, u.botao("Verificar as tabelas atuais", "btn-primary", function () {
                var o = objetivos6(tabs); ["a", "b", "c"].forEach(function (k) { if (o[k]) feitos[k] = true; });
                mostraEstado();
                var ok = feitos.a && feitos.b && feitos.c;
                u.marca(fb, ok, ok ? "Os três objetivos foram alcançados." : (o.todos ? "Todos os fluxos chegam; objetivos atuais: " + ["a", "b", "c"].filter(function (k) { return o[k]; }).join(", ") + "." : "Algum fluxo não chega: veja a lista acima."));
                if (ok) concluir();
            }), fb);
        mostraEstado(); mostra();
    });

    /* ---------- Atividade 5: IPMininet com rotas estáticas ---------- */
    var IM_INTF = { a: [P + "1::a"], b: [P + "3::b"], r1: [P + "1::1", P + "12::1", P + "13::1"], r2: [P + "12::2", P + "23::2"], r3: [P + "13::3", P + "23::3", P + "3::3"] };
    var IM_DEV = { r1: { "1": "r1-eth2", "12": "r1-eth0", "13": "r1-eth1" }, r2: { "12": "r2-eth0", "23": "r2-eth1" }, r3: { "13": "r3-eth0", "23": "r3-eth1", "3": "r3-eth2" } };
    var SCRIPTS = {
        "static-1.py": { r1: [["p:3::/64", "p:12::2"], ["p:23::/64", "p:13::3"]], r2: [["p:3::/64", "p:23::3"], ["p:1::/64", "p:12::1"], ["p:13::/64", "p:23::3"]], r3: [["p:1::/64", "p:13::1"], ["p:12::/64", "p:23::2"]] },
        "static-1-hole.py": { r1: [["p:3::/64", "p:12::2"]], r2: [["p:1::/64", "p:12::1"]], r3: [["p:1::/64", "p:13::1"]] },
        "static-1-loop.py": { r1: [["p:3::/64", "p:12::2"]], r2: [["2001:db8:1341::/60", "p:12::1"], ["p:1::/64", "p:12::1"]], r3: [["p:1::/64", "p:13::1"]] }
    };
    R.scripts40 = SCRIPTS;
    function terminal(script, cmd) {
        var sc = SCRIPTS[script], tabs = { a: [["::/0", P + "1::1"]], b: [["::/0", P + "3::3"]] };
        Object.keys(sc).forEach(function (r) { tabs[r] = sc[r].map(function (l) { return [px(l[0]), px(l[1])]; }); });
        var c = cmd.trim().replace(/\s+/g, " ");
        if (c === "nodes") return "available nodes are:\na b r1 r2 r3";
        if (c === "links") return "r1-eth2<->a-eth0 (OK OK)\nr1-eth0<->r2-eth0 (OK OK)\nr1-eth1<->r3-eth0 (OK OK)\nr2-eth1<->r3-eth1 (OK OK)\nr3-eth2<->b-eth0 (OK OK)";
        if (c === "pingall") {
            var ab = rastreia(IM_INTF, tabs, "a", P + "3::b").res === "entregue" && rastreia(IM_INTF, tabs, "b", P + "1::a").res === "entregue";
            return "*** Ping: testing reachability over IPv4 and IPv6\na --IPv6--> " + (ab ? "b" : "X") + "\nb --IPv6--> " + (ab ? "a" : "X") + "\n*** Results: " + (ab ? "0% dropped (2/2 received)" : "100% dropped (0/2 received)");
        }
        var m = /^(r[123]) ip -f inet6 route( show)?$/.exec(c);
        if (m) {
            var r = m[1], out = [];
            tabs[r].forEach(function (l) { var viz = l[1].split(":")[3]; out.push(l[0] + " via " + l[1] + " dev " + IM_DEV[r][viz] + " proto 196 metric 20 pref medium"); });
            IM_INTF[r].forEach(function (a) { var k = a.split(":")[3]; out.push(P + k + "::/64 dev " + IM_DEV[r][k] + " proto kernel metric 256 pref medium"); });
            return out.join("\n");
        }
        m = /^([ab]) traceroute6 -q 1 -n (\S+)$/.exec(c);
        if (m) {
            var o = m[1], d = m[2], x = rastreia(IM_INTF, tabs, o, d, 40), origemEnd = IM_INTF[o][0];
            var linhas = ["traceroute to " + d + " (" + d + ") from " + origemEnd + ", 30 hops max, 24 byte packets"];
            function sub(a) { return a.split(":").slice(0, 4).join(":"); }
            function resposta(no) {
                // o ICMPv6 (ou o "porta inalcançável" do destino) volta para a origem; sai pela interface que leva até ela
                var v = rastreia(IM_INTF, tabs, no, origemEnd, 40);
                if (v.res !== "entregue") return null;
                if (v.cam.length < 2) return IM_INTF[no][0];
                var prox = v.cam[1];
                return IM_INTF[no].find(function (a) { return IM_INTF[prox].some(function (b) { return sub(a) === sub(b); }); }) || IM_INTF[no][0];
            }
            var chegou = x.res === "entregue", max = chegou ? x.cam.length - 1 : Math.min(12, x.cam.length - 1);
            for (var h = 1; h <= max; h++) {
                var no = x.cam[h], ehDestino = chegou && h === x.cam.length - 1, end = resposta(no);
                var texto = end === null ? "*" : (ehDestino ? d : end) + "  0.1 ms";
                if (!chegou && x.res.indexOf("sem rota") === 0 && h === x.cam.length - 1 && end !== null) texto += " !N";
                linhas.push(" " + h + "  " + texto);
                if (ehDestino && end === null) { for (var k = h + 1; k <= h + 2; k++) linhas.push(" " + k + "  *"); linhas.push("^C"); }
            }
            if (!chegou && x.res === "laço") linhas.push("^C");
            return linhas.join("\n");
        }
        return "comandos aceitos: nodes, links, pingall, a|b traceroute6 -q 1 -n <endereço>, r1|r2|r3 ip -f inet6 route show";
    }
    R.terminal40 = terminal;
    R.registrar("ipmininet-rotas", function (raiz) {
        var script = escolha("Script", Object.keys(SCRIPTS).map(function (k) { return [k, k]; }), false);
        var cmd = campo("Comando do mininet"); cmd.value = "a traceroute6 -q 1 -n 2001:db8:1341:3::b";
        var tela = el("pre", { class: "log mt-2", style: "white-space: pre-wrap; max-height: 320px", "aria-live": "polite" });
        function roda() { tela.textContent = "mininet> " + cmd.value + "\n" + terminal(script.value, cmd.value); }
        cmd.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); roda(); } });
        script.addEventListener("change", roda);
        var atalhos = ["pingall", "a traceroute6 -q 1 -n 2001:db8:1341:3::b", "b traceroute6 -q 1 -n 2001:db8:1341:1::a", "r2 ip -f inet6 route show", "r1 ip -f inet6 route show"];
        var P1 = escolha("Quem devolve o !N no static-1-hole", [["r1", "r1"], ["r2", "r2"], ["r3", "r3"]]), P2 = escolha("Entre quem o pacote fica preso no static-1-loop", [["r1r2", "r1 e r2"], ["r2r3", "r2 e r3"], ["r1r3", "r1 e r3"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ipmininet-rotas", 15, "IPMininet com rotas estáticas");
        raiz.append(el("div", { class: "row g-2 align-items-end" }, el("div", { class: "col-sm-4" }, u.campo("Script", script)), el("div", { class: "col-sm-8" }, u.campo("mininet>", cmd))),
            el("div", { class: "d-flex flex-wrap gap-1" }, u.botao("Executar", "btn-primary", roda), atalhos.map(function (a) { return u.botao(a, "btn-outline-secondary", function () { cmd.value = a; roda(); }); })),
            tela,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("No static-1-hole.py, que roteador devolve o ICMPv6 de rede inalcançável (!N)?", P1),
            linhaPergunta("No static-1-loop.py, entre que roteadores os pacotes de a para b ficam presos?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === "r2" && P2.value === "r1r2";
                u.marca(fb, ok, ok ? "Isso: r2 não tem rota para 2001:db8:1341:3::/64; no laço, r2 devolve a r1 tudo o que cai no /60." : "Ainda não. Rode o traceroute6 de a nos dois scripts.");
                if (ok) concluir();
            }), fb);
        roda();
    });

    /* ---------- Atividade 6: ping6, traceroute6 e Packet Too Big ---------- */
    var CAMINHO = [["A", null], ["R1", 1500], ["R2", 1500], ["R3", 1280], ["B", 1500]];   // MTU do enlace que sai de cada nó em direção a B
    function traceroute6() {
        var out = [];
        for (var h = 1; h < CAMINHO.length; h++) {
            var no = CAMINHO[h][0];
            out.push({ hop: h, porta: 33434 + h - 1, de: no, tipo: no === "B" ? 1 : 3, codigo: no === "B" ? 4 : 0 });
        }
        return out;
    }
    function ping6(tamanho) {
        for (var i = 0; i < CAMINHO.length - 1; i++) {
            var mtu = i === 0 ? 1500 : CAMINHO[i][1];
            if (tamanho > mtu) return { de: CAMINHO[i][0], tipo: 2, mtu: mtu };
        }
        return { de: "B", tipo: 129 };
    }
    R.traceroute640 = traceroute6; R.ping640 = ping6;
    R.registrar("ping6-traceroute6", function (raiz) {
        var tam = el("input", { type: "number", class: "form-control form-control-sm", value: 1400, min: 48, max: 9000, "aria-label": "Tamanho do pacote IPv6 em bytes" });
        var saida = el("pre", { class: "log mt-2", style: "white-space: pre-wrap", "aria-live": "polite" });
        function tr() {
            saida.textContent = "traceroute6 B (sondas UDP para portas altas, hop limit 1, 2, 3…)\n" + traceroute6().map(function (x) {
                return "hop limit " + x.hop + ", porta UDP de destino " + x.porta + " → resposta de " + x.de + ": ICMPv6 tipo " + x.tipo + " código " + x.codigo + (x.tipo === 3 ? " (Time Exceeded: hop limit chegou a zero)" : " (Destination Unreachable: porta inalcançável; chegou ao destino)");
            }).join("\n");
        }
        function pg() {
            var t = Number(tam.value) || 0, r = ping6(t);
            saida.textContent = "ping6 B com pacotes de " + t + " bytes (Echo Request, tipo 128)\n" +
                (r.tipo === 129 ? "resposta de B: Echo Reply (tipo 129)" : "resposta de " + r.de + ": ICMPv6 tipo 2 (Packet Too Big), MTU = " + r.mtu + ". A origem reduz os pacotes ou fragmenta (cabeçalho de extensão Fragment, Next Header 44).");
        }
        var P1 = el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": "Tipo do Time Exceeded" }), P2 = el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": "Quem manda Packet Too Big" }), P3 = el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": "Next Header do UDP" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ping6-traceroute6", 15, "ping6 e traceroute6");
        raiz.append(el("p", { class: "small mb-1" }, "Caminho ilustrativo A → R1 → R2 → R3 → B; o enlace R3–B tem MTU de 1280 bytes, e os outros, de 1500."),
            el("div", { class: "d-flex flex-wrap gap-2 align-items-end" }, u.botao("traceroute6 B", "btn-primary", tr), el("div", null, u.campo("Tamanho do ping6 (bytes)", tam)), u.botao("ping6 B", "btn-outline-primary", pg)), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Que tipo ICMPv6 os roteadores do caminho devolvem às sondas do traceroute6?", P1),
            linhaPergunta("Com ping6 de 1400 bytes, quem devolve o Packet Too Big?", P2),
            linhaPergunta("Que valor de Next Header indica que depois do cabeçalho IPv6 vem um segmento UDP?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 3 && P2.value.trim().toUpperCase() === ping6(1400).de && Number(P3.value) === 17;
                u.marca(fb, ok, ok ? "Isso: Time Exceeded é o tipo 3; R3 avisa que o enlace dele só leva 1280 bytes; e o UDP é o Next Header 17 (o TCP é 6 e o ICMPv6, 58)." : "Ainda não. Rode as duas ferramentas e confira os números.");
                if (ok) concluir();
            }), fb);
        tr();
    });
}());
