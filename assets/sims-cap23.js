/* Simulações do Capítulo 23 — Roteamento em redes IP (seção 3.15 do livro).
 * Cada uma é registrada em Redes.registrar. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function opcoes(lista) { return lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }); }

    /* ------------------------------------------------------------------
     * 1. A Fig. 58: uma Internet pequena com quatro domínios (pág. 236 do PDF).
     *    Os enlaces internos são ilustrativos; os interdomínio são os da figura.
     * ------------------------------------------------------------------ */
    var POS = {
        R1a: [112, 222], R1b: [52, 286], R1c: [122, 300], R1d: [196, 262],
        R2a: [262, 70], R2b: [222, 128], R2c: [292, 140], R2d: [366, 96], R2e: [372, 156],
        R3a: [404, 282], R3b: [466, 238], R3c: [552, 236], R3d: [544, 304],
        R4a: [462, 70], R4b: [560, 48], R4c: [532, 136], R4d: [612, 100]
    };
    var NUVENS = { 1: [126, 268, 112, 62], 2: [298, 112, 120, 66], 3: [480, 270, 118, 62], 4: [538, 92, 106, 62] };
    var CORES = { 1: "#3b5bdb", 2: "#e03131", 3: "#9c36b5", 4: "#5c940d" };
    var INTER = [["R1a", "R2b"], ["R2d", "R4a"], ["R2e", "R3b"], ["R1d", "R3a"], ["R4c", "R3c"]];
    var INTERNOS = [["R1a", "R1b"], ["R1b", "R1c"], ["R1c", "R1d"], ["R1a", "R1d"],
        ["R2a", "R2b"], ["R2a", "R2d"], ["R2b", "R2c"], ["R2c", "R2d"], ["R2d", "R2e"],
        ["R3a", "R3b"], ["R3b", "R3c"], ["R3c", "R3d"], ["R3a", "R3d"],
        ["R4a", "R4b"], ["R4b", "R4d"], ["R4d", "R4c"], ["R4a", "R4c"]];
    function dominioDe(r) { return Number(r.charAt(1)); }
    function vizinhosDominio(d) {
        var v = [];
        INTER.forEach(function (e) {
            var a = dominioDe(e[0]), b = dominioDe(e[1]);
            if (a === d && v.indexOf(b) < 0) v.push(b);
            if (b === d && v.indexOf(a) < 0) v.push(a);
        });
        return v.sort();
    }
    function bfs(origem, destino, vizinhos) {
        var anterior = {}, fila = [origem];
        anterior[origem] = null;
        while (fila.length) {
            var x = fila.shift();
            if (x === destino) break;
            vizinhos(x).forEach(function (v) { if (!(v in anterior)) { anterior[v] = x; fila.push(v); } });
        }
        if (!(destino in anterior)) return null;
        var rota = [], p = destino;
        while (p !== null) { rota.unshift(p); p = anterior[p]; }
        return rota;
    }
    function caminhoDominios(o, d) { return bfs(o, d, vizinhosDominio).map(Number); }
    function vizinhosInternos(r) {
        var v = [];
        INTERNOS.forEach(function (e) { if (e[0] === r) v.push(e[1]); if (e[1] === r) v.push(e[0]); });
        return v.sort();
    }
    // Caminho completo: o BGP escolhe a sequência de domínios; dentro de cada um, o IGP leva até a borda.
    function caminhoRoteadores(o, d) {
        var doms = caminhoDominios(dominioDe(o), dominioDe(d)), rota = [o], atual = o, usados = [];
        for (var i = 0; i + 1 < doms.length; i++) {
            var e = INTER.find(function (x) { return (dominioDe(x[0]) === doms[i] && dominioDe(x[1]) === doms[i + 1]) || (dominioDe(x[1]) === doms[i] && dominioDe(x[0]) === doms[i + 1]); });
            var saida = dominioDe(e[0]) === doms[i] ? e[0] : e[1], entrada = saida === e[0] ? e[1] : e[0];
            rota = rota.concat(bfs(atual, saida, vizinhosInternos).slice(1));
            rota.push(entrada);
            usados.push(e);
            atual = entrada;
        }
        rota = rota.concat(bfs(atual, d, vizinhosInternos).slice(1));
        return { dominios: doms, roteadores: rota, inter: usados };
    }
    R.fig58 = { dominioDe: dominioDe, caminhoDominios: caminhoDominios, caminhoRoteadores: caminhoRoteadores, inter: INTER, internos: INTERNOS };

    R.registrar("dominios-fig58", function (raiz) {
        var nomes = Object.keys(POS);
        var origem = el("select", { class: "form-select form-select-sm" }, opcoes(nomes.map(function (n) { return [n, n + " (Domínio " + dominioDe(n) + ")"]; })));
        var destino = el("select", { class: "form-select form-select-sm" }, opcoes(nomes.map(function (n) { return [n, n + " (Domínio " + dominioDe(n) + ")"]; })));
        origem.value = "R1c"; destino.value = "R2c";
        var figura = el("div", { class: "mt-2" }), texto = el("div", { class: "small mt-2", "aria-live": "polite" });
        function noCaminho(rota, a, b) {
            for (var i = 0; i + 1 < rota.length; i++) if ((rota[i] === a && rota[i + 1] === b) || (rota[i] === b && rota[i + 1] === a)) return true;
            return false;
        }
        function desenha() {
            var c = caminhoRoteadores(origem.value, destino.value);
            var s = u.svg("svg", { viewBox: "0 0 660 350", class: "sim-svg w-100", role: "img", style: "max-width: 680px",
                "aria-label": "Fig. 58: quatro domínios ligados por cinco enlaces interdomínio; destacado o caminho de " + origem.value + " a " + destino.value });
            s.append(u.svg("title", { text: "Uma Internet pequena com quatro domínios (Fig. 58)" }));
            Object.keys(NUVENS).forEach(function (d) {
                var n = NUVENS[d];
                s.append(u.svg("ellipse", { cx: n[0], cy: n[1], rx: n[2], ry: n[3], fill: CORES[d], "fill-opacity": 0.07, stroke: CORES[d], "stroke-width": 2 }));
                var ty = Number(d) === 1 || Number(d) === 3 ? n[1] + n[3] + 18 : n[1] - n[3] - 8;
                s.append(u.svg("text", { x: n[0], y: ty, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: CORES[d] }, "Domínio " + d));
            });
            INTERNOS.forEach(function (e) {
                var a = POS[e[0]], b = POS[e[1]], on = noCaminho(c.roteadores, e[0], e[1]);
                s.append(u.svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: on ? "#fab005" : "currentColor", "stroke-width": on ? 5 : 1.2, "stroke-opacity": on ? 1 : 0.45, "stroke-dasharray": on ? null : "4 4" }));
            });
            INTER.forEach(function (e) {
                var a = POS[e[0]], b = POS[e[1]], on = noCaminho(c.roteadores, e[0], e[1]);
                s.append(u.svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: on ? "#fab005" : "#4263eb", "stroke-width": on ? 7 : 4.5 }));
            });
            nomes.forEach(function (n) {
                var p = POS[n], marcado = c.roteadores.indexOf(n) >= 0;
                s.append(u.svg("rect", { x: p[0] - 19, y: p[1] - 12, width: 38, height: 24, rx: 4, style: "fill: var(--bs-body-bg)" }),
                    u.svg("rect", { x: p[0] - 19, y: p[1] - 12, width: 38, height: 24, rx: 4, fill: marcado ? "#fab005" : CORES[dominioDe(n)], "fill-opacity": marcado ? 0.55 : 0.12, stroke: CORES[dominioDe(n)], "stroke-width": 1.5 }),
                    u.svg("text", { x: p[0], y: p[1] + 5, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "currentColor" }, n));
            });
            figura.replaceChildren(s);
            var trechos = [], atual = [c.roteadores[0]];
            for (var i = 1; i < c.roteadores.length; i++) {
                if (dominioDe(c.roteadores[i]) !== dominioDe(c.roteadores[i - 1])) { trechos.push(atual); atual = []; }
                atual.push(c.roteadores[i]);
            }
            trechos.push(atual);
            texto.replaceChildren(
                el("p", { class: "mb-1" }, el("strong", null, "Caminho de domínios: "), c.dominios.join(" → ") +
                    (c.dominios.length > 1 ? " (" + c.dominios.length + " domínios, " + c.inter.length + (c.inter.length === 1 ? " enlace" : " enlaces") + " interdomínio). É o que o BGP decide." : ". Origem e destino estão no mesmo domínio: só o IGP dele trabalha.")),
                el("p", { class: "mb-0" }, el("strong", null, "Dentro de cada domínio, o IGP: "), trechos.map(function (t) { return t.join(" → "); }).join("  |  ")));
        }
        [origem, destino].forEach(function (x) { x.addEventListener("change", desenha); });
        var nd = el("input", { type: "number", class: "form-control form-control-sm", min: 1, max: 4, step: 1 });
        var ni = el("input", { type: "number", class: "form-control form-control-sm", min: 0, max: 5, step: 1 });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dominios-fig58", 15, "Contar domínios e enlaces num caminho da Fig. 58");
        raiz.append(el("p", { class: "small mb-2" }, "Escolha a origem e o destino de um pacote. As linhas azuis grossas são os cinco enlaces entre domínios da Fig. 58; as tracejadas, enlaces internos ilustrativos. Em amarelo, o caminho, com o menor número de domínios."),
            el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Origem", origem)), el("div", { class: "col-6" }, u.campo("Destino", destino))),
            figura, texto,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): um pacote vai de R1c até R4b pelo caminho com menos domínios. Por quantos domínios ele passa, contando a origem e o destino, e quantos enlaces interdomínio atravessa?"),
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("Domínios", nd)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Enlaces interdomínio", ni)),
                el("div", { class: "col-12 col-md-3 d-flex align-items-end" }, u.botao("Conferir", "btn-primary", function () {
                    var ok = Number(nd.value) === 3 && Number(ni.value) === 2;
                    u.marca(fb, ok, ok ? "Isso: 3 domínios e 2 enlaces. O Domínio 1 não tem enlace com o 4, então passa pelo 2 (ou pelo 3, que empata)." :
                        "Ainda não. O Domínio 1 tem enlaces com quais domínios? E esses, com o 4? Escolha R1c e R4b na simulação.");
                    if (ok) concluir();
                }))), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 2. Critério técnico ou política (pág. 237 do PDF)
     * ------------------------------------------------------------------ */
    var ROTAS = [
        { nome: "R1", atraso: 12, saltos: 4, banda: 1000, custo: 800 },
        { nome: "R2", atraso: 25, saltos: 2, banda: 10000, custo: 300 },
        { nome: "R3", atraso: 40, saltos: 6, banda: 100, custo: 0 }
    ];
    var CRITERIOS = {
        atraso: { nome: "menor atraso (IGP)", melhor: function (a, b) { return a.atraso < b.atraso; } },
        saltos: { nome: "menos saltos (IGP)", melhor: function (a, b) { return a.saltos < b.saltos; } },
        banda: { nome: "maior banda (IGP)", melhor: function (a, b) { return a.banda > b.banda; } },
        custo: { nome: "mais barata (política entre domínios)", melhor: function (a, b) { return a.custo < b.custo; } }
    };
    function escolhe(criterio) { return ROTAS.reduce(function (m, r) { return CRITERIOS[criterio].melhor(r, m) ? r : m; }).nome; }
    R.escolheRota = escolhe;

    R.registrar("criterio-rota", function (raiz) {
        var crit = el("select", { class: "form-select form-select-sm" }, opcoes(Object.keys(CRITERIOS).map(function (k) { return [k, CRITERIOS[k].nome]; })));
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function desenha() {
            var vence = escolhe(crit.value);
            area.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-1" },
                el("thead", null, el("tr", null, ["Rota", "Atraso", "Saltos", "Banda", "Custo mensal"].map(function (h) { return el("th", null, h); }))),
                el("tbody", null, ROTAS.map(function (r) {
                    return el("tr", { class: r.nome === vence ? "table-success" : null }, el("td", { class: "fw-semibold" }, r.nome + (r.nome === vence ? " ✔" : "")),
                        el("td", null, r.atraso + " ms"), el("td", null, String(r.saltos)), el("td", null, r.banda >= 1000 ? r.banda / 1000 + " Gbit/s" : r.banda + " Mbit/s"),
                        el("td", null, r.custo ? "R$ " + r.custo : "sem custo"));
                })))),
                el("p", { class: "small mb-0" }, "Pelo critério “" + CRITERIOS[crit.value].nome + "”, a escolhida é " + vence + "."));
        }
        crit.addEventListener("change", desenha);
        var qAtraso = el("select", { class: "form-select form-select-sm" }, opcoes([["", "escolha…"], ["R1", "R1"], ["R2", "R2"], ["R3", "R3"]]));
        var qCusto = el("select", { class: "form-select form-select-sm" }, opcoes([["", "escolha…"], ["R1", "R1"], ["R2", "R2"], ["R3", "R3"]]));
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "criterio-rota", 10, "Comparar um critério técnico com uma política");
        raiz.append(el("p", { class: "small mb-2" }, "Três rotas levam ao mesmo prefixo. Os valores são um exemplo. Troque o critério e veja qual rota ganha."),
            u.campo("Critério", crit), area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): sem trocar o critério acima, diga qual rota escolhe um IGP configurado para o menor atraso e qual escolhe uma política que busca a rota mais barata."),
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("Menor atraso", qAtraso)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Mais barata", qCusto)),
                el("div", { class: "col-12 col-md-3 d-flex align-items-end" }, u.botao("Conferir", "btn-primary", function () {
                    var ok = qAtraso.value === "R1" && qCusto.value === "R3";
                    u.marca(fb, ok, ok ? "Isso: R1 tem o menor atraso (12 ms), e R3 é a única sem custo. Os mesmos caminhos, escolhas diferentes." : "Ainda não. Compare a coluna de atraso e a de custo.");
                    if (ok) concluir();
                }))), fb);
        desenha();
    });
}());

/* Etapa "3. Visualização" do conceito dominios: IGP dentro, EGP entre domínios, e um filtro de exportação (pág. 236–237 do PDF). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, s = u.svg;
    function escolha(rotulo, lista) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            el("option", { value: "" }, "escolha…"), lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    var ROT = { R1a: [70, 70, 1], R1b: [170, 140, 1], R2a: [300, 70, 2], R2b: [380, 140, 2], R3a: [520, 70, 3], R3b: [570, 150, 3] };
    var ENLACES = [["R1a", "R1b"], ["R1b", "R2a"], ["R2a", "R2b"], ["R2b", "R3a"], ["R3a", "R3b"], ["R1a", "R2a"]];
    function tipoEnlace(a, b) { return ROT[a][2] === ROT[b][2] ? "igp" : "egp"; }
    // Domínio 1 alcança o prefixo do domínio 3? Só se o domínio 2 exportar ao 1 as rotas que aprendeu do 3.
    function alcanca13(exporta) { return !!exporta; }
    R.tipoEnlaceDominio = tipoEnlace;
    R.alcanca13 = alcanca13;

    R.registrar("igp-egp", function (raiz) {
        var sel = null;
        var exporta = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: true });
        var desenho = s("svg", { viewBox: "0 0 640 210", class: "sim-svg w-100", style: "max-height:240px", role: "img", "aria-label": "Três domínios com roteadores; enlaces dentro de um domínio usam um IGP e enlaces entre domínios usam o BGP." });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var lista = el("div", { class: "d-flex flex-wrap gap-1 mt-1" });
        function descreve(e) {
            var t = tipoEnlace(e[0], e[1]);
            return e[0] + "–" + e[1] + ": " + (t === "igp"
                ? "dentro do domínio " + ROT[e[0]][2] + ". Usa um IGP (RIP, OSPF, IS-IS ou rotas estáticas), escolhido pelo próprio domínio, atrás do caminho mais curto."
                : "entre os domínios " + ROT[e[0]][2] + " e " + ROT[e[1]][2] + ". Usa o EGP, que é um só: o BGP. Cada lado aplica a sua política.");
        }
        function desenha() {
            var g = s("g", { "font-size": 12, "text-anchor": "middle" });
            g.append(s("rect", { x: 0, y: 0, width: 640, height: 210, style: "fill: var(--bs-body-bg)" }));
            [[20, 210, 1], [250, 190, 2], [470, 150, 3]].forEach(function (d) {
                g.append(s("rect", { class: "camada", x: d[0], y: 25, width: d[1], height: 150, rx: 14, style: "fill-opacity:.5" }), s("text", { x: d[0] + d[1] / 2, y: 196, "font-size": 11 }, "Domínio " + d[2]));
            });
            ENLACES.forEach(function (e) {
                var a = ROT[e[0]], b = ROT[e[1]], t = tipoEnlace(e[0], e[1]), ativo = sel === e;
                g.append(s("line", { class: ativo ? "linha-ativa" : "linha", x1: a[0], y1: a[1], x2: b[0], y2: b[1], "stroke-dasharray": t === "egp" ? "6 4" : null }));
            });
            Object.keys(ROT).forEach(function (n) {
                var p = ROT[n], ativo = sel && sel.indexOf(n) >= 0;
                g.append(s("circle", { class: ativo ? "no no-ativo" : "no", cx: p[0], cy: p[1], r: 17 }), s("text", { x: p[0], y: p[1] + 4, "font-size": 10 }, n));
            });
            g.append(s("text", { x: 320, y: 16, "font-size": 11 }, "linha cheia: dentro do domínio (IGP) · tracejada: entre domínios (BGP)"));
            desenho.replaceChildren(s("title", null, "Domínios, IGP e BGP"), g);
            lista.replaceChildren.apply(lista, ENLACES.map(function (e) {
                return u.botao(e[0] + "–" + e[1], sel === e ? "btn-primary" : "btn-outline-primary", function () { sel = e; desenha(); saida.textContent = descreve(e); }, "Enlace " + e[0] + " a " + e[1]);
            }));
        }
        var rota = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function mostraRota() {
            rota.textContent = alcanca13(exporta.checked)
                ? "O domínio 2 anuncia ao domínio 1 a rota para o prefixo do domínio 3: o tráfego do domínio 1 para o 3 passa pelo 2."
                : "O filtro de exportação do domínio 2 não anuncia ao domínio 1 as rotas do domínio 3. Não há outro caminho, e o domínio 1 fica sem rota para o 3, mesmo com os enlaces funcionando. Foi uma decisão de política, não um critério técnico.";
        }
        exporta.addEventListener("change", mostraRota);
        var PERG = [["R1b", "R2a", "egp"], ["R2a", "R2b", "igp"], ["R3a", "R3b", "igp"]];
        var selects = PERG.map(function (q) { return escolha("Protocolo no enlace " + q[0] + "–" + q[1], [["igp", "IGP"], ["egp", "EGP (BGP)"]]); });
        var P2 = escolha("Domínio 1 alcança o domínio 3 sem a exportação", [["sim", "sim, os enlaces existem"], ["nao", "não"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "igp-egp", 10, "IGP, EGP e política");
        raiz.append(el("p", { class: "small mb-1" }, "Clique num enlace (ou nos botões) para ver que tipo de protocolo roda nele."),
            desenho, lista, saida,
            el("div", { class: "form-check mt-3" }, exporta, el("label", { class: "form-check-label small", for: exporta.id }, "O domínio 2 exporta para o domínio 1 as rotas que aprendeu do domínio 3")),
            rota,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            el("div", null, PERG.map(function (q, i) { return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, "Enlace " + q[0] + "–" + q[1]), el("div", { class: "col-sm-5" }, selects[i])); })),
            el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, "Se o domínio 2 não exporta as rotas do domínio 3 para o 1, o domínio 1 alcança o 3?"), el("div", { class: "col-sm-5" }, P2)),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok1 = PERG.every(function (q, i) { return selects[i].value === q[2]; });
                var ok2 = P2.value === (alcanca13(false) ? "sim" : "nao");
                u.marca(fb, ok1 && ok2, ok1 && ok2 ? "Isso: enlace dentro de um domínio usa IGP; entre domínios, BGP. E a política de um domínio decide que rotas os vizinhos recebem."
                    : (ok1 ? "" : "Veja se os dois roteadores do enlace estão no mesmo domínio. ") + (ok2 ? "" : "Desmarque a caixa acima e veja o que acontece."));
                if (ok1 && ok2) concluir();
            }), fb);
        // clique direto no SVG
        desenho.addEventListener("click", function (ev) {
            var pt = desenho.createSVGPoint ? desenho.createSVGPoint() : null;
            if (!pt || !desenho.getScreenCTM()) return;
            pt.x = ev.clientX; pt.y = ev.clientY;
            var p = pt.matrixTransform(desenho.getScreenCTM().inverse()), melhor = null, dmin = 14;
            ENLACES.forEach(function (e) {
                var a = ROT[e[0]], b = ROT[e[1]], dx = b[0] - a[0], dy = b[1] - a[1];
                var t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy)));
                var d = Math.hypot(p.x - a[0] - t * dx, p.y - a[1] - t * dy);
                if (d < dmin) { dmin = d; melhor = e; }
            });
            if (melhor) { sel = melhor; desenha(); saida.textContent = descreve(melhor); }
        });
        desenha();
        mostraRota();
    });
}());
