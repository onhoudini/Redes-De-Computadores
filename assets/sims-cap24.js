/* Simulações do Capítulo 24 — Roteamento intradomínio: RIP e OSPF (seção 3.16 do livro).
 * Cada uma é registrada em Redes.registrar. As topologias são as das figuras do livro. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function caixa(rotulo, marcada) {
        var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: !!marcada });
        return { input: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, rotulo)) };
    }
    function opcoes(lista) { return lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }); }
    function tabela(cabecalho, linhas) {
        return el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-0" },
            el("thead", null, el("tr", null, cabecalho.map(function (h) { return el("th", null, h); }))),
            el("tbody", null, linhas.map(function (l) { return el("tr", { class: l.classe || null }, l.celulas.map(function (c) { return el("td", { class: "mono" }, c); })); }))));
    }

    /* ------------------------------------------------------------------
     * 1. RIP: contagem ao infinito limitada a 16 (pág. 237–238 do PDF)
     * ------------------------------------------------------------------ */
    function contagemRip(poison) {
        var a = 2, b = 16, h = [[a, b]];
        for (var i = 0; i < 20; i++) {
            b = Math.min(16, (poison ? 16 : a) + 1);
            a = Math.min(16, b + 1);
            h.push([a, b]);
            if (a === 16 && b === 16) break;
        }
        return h;
    }
    R.contagemRip = contagemRip;

    R.registrar("rip-infinito", function (raiz) {
        var poison = caixa("Poison reverse: A anuncia 16 a B, que é o seu próximo salto para P", false);
        var rodada = 0;
        var area = el("div", { class: "mt-2" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "rip-infinito", 15, "Ver a contagem ao infinito e o poison reverse");
        function desenha() {
            var h = contagemRip(poison.input.checked);
            var linhas = h.slice(0, rodada + 1).map(function (x, i) {
                return { celulas: [i === 0 ? "0 (o enlace B–C acaba de cair)" : i + " (" + 30 * i + " s)", x[0] === 16 ? "16 (inalcançável)" : String(x[0]), x[1] === 16 ? "16 (inalcançável)" : String(x[1])], classe: x[0] === 16 && x[1] === 16 ? "table-success" : null };
            });
            area.replaceChildren(tabela(["Rodada", "Distância de A até P", "Distância de B até P"], linhas));
            var fim = rodada >= h.length - 1;
            if (fim) {
                if (poison.input.checked) { vistos.poison = true; u.marca(fb, true, "Com poison reverse, B não aprende a rota falsa de A: em uma rodada, os dois sabem que P está inalcançável."); }
                else { vistos.sem = true; u.marca(fb, true, "Sem poison reverse, A e B se enganam mutuamente e a métrica sobe de 2 em 2 até 16, o infinito do RIP: " + (h.length - 1) + " rodadas, " + 30 * (h.length - 1) + " s."); }
                if (vistos.poison && vistos.sem) { concluir(); fb.textContent += " Você viu os dois casos."; }
            } else fb.textContent = "";
        }
        poison.input.addEventListener("change", function () { rodada = 0; desenha(); });
        raiz.append(el("p", { class: "small mb-2 mono" }, "A — B —✕— C (o prefixo P está em C; o enlace B–C caiu)"), poison.linha,
            el("div", { class: "d-flex flex-wrap gap-2 mt-1" },
                u.botao("Próxima rodada (30 s)", "btn-primary", function () { if (rodada < contagemRip(poison.input.checked).length - 1) rodada++; desenha(); }),
                u.botao("Até o fim", "btn-outline-primary", function () { rodada = contagemRip(poison.input.checked).length - 1; desenha(); }),
                u.botao("Recomeçar", "btn-outline-secondary", function () { rodada = 0; desenha(); })),
            area, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Em cada rodada, B ouve o vetor de A e depois A ouve o de B. Desafio (15 pts): leve a contagem até o fim sem e com poison reverse."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 2. Áreas do OSPF e resumos (Fig. 62, pág. 239–241 do PDF)
     * ------------------------------------------------------------------ */
    var ENL = [["R4", "R5"], ["R4", "RA"], ["RA", "RB"], ["RA", "RC"], ["RB", "RC"], ["RB", "R7"], ["RC", "R8"], ["R7", "R8"], ["R7", "R9"], ["R8", "R10"]];
    var AREAS = { R4: [1], R5: [1], RA: [0, 1], RB: [0, 2], RC: [0, 2], R7: [2], R8: [2], R9: [2], R10: [2] };
    var PREF = [["2001:db8:aaaa:0::/64", "R5", 1], ["2001:db8:aaaa:1::/64", "R4", 1], ["2001:db8:1234::/48", "R9", 2], ["2001:db8:5678::/48", "R10", 2]];
    function naArea(r, a) { return AREAS[r].indexOf(a) >= 0; }
    function bfs(origem, area) {
        var dist = {}; dist[origem] = 0; var fila = [origem];
        while (fila.length) {
            var x = fila.shift();
            ENL.forEach(function (e) {
                var v = e[0] === x ? e[1] : e[1] === x ? e[0] : null;
                if (v && naArea(v, area) && naArea(x, area) && dist[v] === undefined) { dist[v] = dist[x] + 1; fila.push(v); }
            });
        }
        return dist;
    }
    function abrs(area) { return Object.keys(AREAS).filter(function (r) { return area !== 0 && naArea(r, 0) && naArea(r, area); }); }
    function noBackbone(a, p, agrega) {          // como a borda a (no backbone) conhece o prefixo p de outra área
        var area = p[2], melhor = null;
        abrs(area).forEach(function (b) {
            var resumo = agrega && area === 1 ? 2 : bfs(b, area)[p[1]];
            var d = bfs(a, 0)[b] + resumo;
            if (!melhor || d < melhor.d) melhor = { d: d, origem: b, resumo: resumo };
        });
        return melhor;
    }
    function visaoOspf(r, agrega) {
        var linhas = [];
        PREF.forEach(function (p) {
            var area = p[2], nome = agrega && area === 1 ? "2001:db8:aaaa::/63" : p[0], melhor = null;
            if (naArea(r, area)) { linhas.push({ prefixo: p[0], tipo: "intra-área (conhece a topologia)", via: "—", dist: bfs(r, area)[p[1]] }); return; }
            if (naArea(r, 0)) {                       // no backbone: recebe os resumos das bordas da área do prefixo
                var m = noBackbone(r, p, agrega);
                melhor = { prefixo: nome, tipo: "inter-área (resumo de " + m.origem + ": " + m.resumo + ")", via: m.origem, dist: m.d };
            } else {                                  // fora do backbone: recebe os resumos das bordas da própria área
                var la = AREAS[r][0];
                abrs(la).forEach(function (a) {
                    var m = noBackbone(a, p, agrega), d = bfs(r, la)[a] + m.d;
                    if (!melhor || d < melhor.dist) melhor = { prefixo: nome, tipo: "inter-área (resumo de " + a + ": " + m.d + ")", via: a, dist: d };
                });
            }
            if (!linhas.some(function (l) { return l.prefixo === melhor.prefixo; })) linhas.push(melhor);
        });
        return linhas;
    }
    R.visaoOspf = visaoOspf;

    R.registrar("ospf-areas", function (raiz) {
        var roteador = el("select", { class: "form-select form-select-sm" }, opcoes(Object.keys(AREAS).map(function (r) { return [r, r + " (área " + AREAS[r].join(" e ") + ")"]; })));
        roteador.value = "R5";
        var agrega = caixa("RA anuncia um só resumo, 2001:db8:aaaa::/63, para as duas sub-redes da área 1", false);
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function desenha() {
            var v = visaoOspf(roteador.value, agrega.input.checked);
            area.replaceChildren(tabela(["Prefixo", "Como conhece", "Distância"], v.map(function (l) { return { celulas: [l.prefixo, l.tipo, String(l.dist)] }; })),
                el("p", { class: "small mt-1 mb-0" }, roteador.value + " guarda " + v.length + " rotas. Só a área dele aparece com topologia completa; as outras chegam como resumos das bordas, como vetores de distância."));
        }
        [roteador, agrega.input].forEach(function (c) { c.addEventListener("change", desenha); });
        var resp = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Distância" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ospf-areas", 15, "Calcular uma distância entre áreas do OSPF");
        raiz.append(el("p", { class: "small mb-2" }, "A rede da Fig. 62 do livro: área 1 (R4, R5), backbone (RA, RB, RC) e área 2 (R7 a R10), com custo 1 em todos os enlaces."),
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-5" }, u.campo("Ponto de vista do roteador", roteador)), el("div", { class: "col-sm-7 d-flex align-items-end" }, agrega.linha)),
            area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): qual é a distância de R5 até 2001:db8:5678::/48? Calcule pelos resumos antes de conferir na tabela."),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === 5;
                u.marca(fb, ok, ok ? "Isso: R5 → R4 → RA são 2, e RA conhece o prefixo a distância 3 pelo resumo de RC (RA–RC–R8–R10): 2 + 3 = 5." : "Ainda não. Quanto custa ir de R5 até a borda RA, e a que distância RA conhece o prefixo?");
                if (ok) concluir();
            })), fb);
        desenha();
    });
}());
