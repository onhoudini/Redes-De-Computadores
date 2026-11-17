/* Simulações do Capítulo 30 — Prática: construindo uma rede (seção 4.4 do livro, pág. 286–292 do PDF).
 * As topologias foram transcritas das figuras das págs. 287–291. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, s = u.svg;
    var INF = Infinity;

    function escolha(rotulo, lista, vazio) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            vazio === false ? null : el("option", { value: "" }, "escolha…"),
            lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    function linhaPergunta(texto, controle) {
        return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, texto), el("div", { class: "col-sm-5" }, controle));
    }
    function fmt(x) { return x === INF ? "∞" : String(x).replace("-", "−"); }
    // Desenha um grafo: nos = {id: [x, y, "host"|"rot"]}, arestas = [[a, b, rotulo]]
    function grafo(svgEl, W, H, nos, arestas, opc) {
        opc = opc || {};
        var g = s("g", { "font-size": 12, "text-anchor": "middle" });
        g.append(s("rect", { x: 0, y: 0, width: W, height: H, style: "fill: var(--bs-body-bg)" }));
        arestas.forEach(function (e) {
            var a = nos[e[0]], b = nos[e[1]], chave = e[0] + "|" + e[1], chave2 = e[1] + "|" + e[0];
            var ativa = opc.arestas && (opc.arestas[chave] || opc.arestas[chave2]);
            var morta = opc.mortas && (opc.mortas[chave] || opc.mortas[chave2]);
            var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
            if (e[3]) { // aresta em arco: e[3] é o deslocamento do ponto de controle
                g.append(s("path", { class: ativa ? "linha-ativa" : "linha", fill: "none", d: "M" + a[0] + " " + a[1] + " Q" + mx + " " + (my + 2 * e[3]) + " " + b[0] + " " + b[1], "stroke-dasharray": morta ? "4 5" : null, style: morta ? "opacity:.45" : null }));
                my += e[3];
            } else {
                g.append(s("line", { class: ativa ? "linha-ativa" : "linha", x1: a[0], y1: a[1], x2: b[0], y2: b[1], "stroke-dasharray": morta ? "4 5" : null, style: morta ? "opacity:.45" : null }));
            }
            if (e[2] !== undefined && e[2] !== null && e[2] !== "") {
                g.append(s("rect", { x: mx - 13, y: my - 9, width: 26, height: 16, rx: 3, style: "fill: var(--bs-body-bg)" }), s("text", { x: mx, y: my + 4, "font-size": 11 }, String(e[2])));
            }
        });
        Object.keys(nos).forEach(function (id) {
            var p = nos[id], ativo = opc.nos && opc.nos[id];
            if (p[2] === "host") g.append(s("circle", { class: ativo ? "no no-ativo" : "no", cx: p[0], cy: p[1], r: 15 }));
            else g.append(s("rect", { class: ativo ? "no no-ativo" : "no", x: p[0] - 19, y: p[1] - 13, width: 38, height: 26, rx: 3 }));
            g.append(s("text", { x: p[0], y: p[1] + 4, "font-size": id.length > 3 ? 10 : 12 }, id));
        });
        svgEl.replaceChildren(s("title", null, opc.titulo || "Topologia"), g);
    }
    function adjacencia(arestas, pesos) {
        var g = {};
        arestas.forEach(function (e) {
            var a = e[0], b = e[1];
            (g[a] = g[a] || {})[b] = pesos ? pesos(a, b) : 1;
            (g[b] = g[b] || {})[a] = pesos ? pesos(b, a) : 1;
        });
        return g;
    }
    // Dijkstra que guarda todos os caminhos de mesmo custo (para detectar empates).
    function dijkstra(g, origem) {
        var dist = {}, cam = {}, feito = {};
        Object.keys(g).forEach(function (n) { dist[n] = INF; cam[n] = []; });
        dist[origem] = 0; cam[origem] = [[origem]];
        for (;;) {
            var u0 = null;
            Object.keys(g).forEach(function (n) { if (!feito[n] && dist[n] < INF && (u0 === null || dist[n] < dist[u0])) u0 = n; });
            if (u0 === null) break;
            feito[u0] = true;
            Object.keys(g[u0]).forEach(function (v) {
                var nd = dist[u0] + g[u0][v];
                if (nd < dist[v] - 1e-9) { dist[v] = nd; cam[v] = cam[u0].map(function (c) { return c.concat([v]); }); }
                else if (Math.abs(nd - dist[v]) < 1e-9 && !feito[v]) cam[v] = cam[v].concat(cam[u0].map(function (c) { return c.concat([v]); }));
            });
        }
        return { dist: dist, cam: cam };
    }
    R.dijkstra30 = dijkstra;

    /* ------------------------------------------------------------------
     * Atividade 1 — endereços planos e hierárquicos
     * ------------------------------------------------------------------ */
    var EXEMPLOS = [
        ["Endereço postal (país, cidade, rua, número)", "h"], ["Telefone fixo com código do país e DDD", "h"],
        ["CEP", "h"], ["Número de série de um aparelho", "p"], ["Endereço MAC de 48 bits de uma placa de rede", "p"], ["Endereço IPv6", "h"]
    ];
    R.registrar("classifica-enderecos", function (raiz) {
        var sels = EXEMPLOS.map(function (e) { return escolha("Tipo de endereço: " + e[0], [["h", "hierárquico"], ["p", "plano"]]); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "classifica-enderecos", 10, "Planos e hierárquicos");
        raiz.append(el("p", { class: "small fw-semibold mb-1" }, "Desafio (10 pts): classifique cada identificador do dia a dia."),
            el("div", null, EXEMPLOS.map(function (e, i) { return linhaPergunta(e[0], sels[i]); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = EXEMPLOS.filter(function (e, i) { return sels[i].value === e[1]; }).length;
                u.marca(fb, certas === EXEMPLOS.length, certas === EXEMPLOS.length
                    ? "Isso. Nos hierárquicos, uma parte do endereço já diz \"para que lado\" ir; nos planos, o valor não diz nada sobre a localização."
                    : certas + " de " + EXEMPLOS.length + ". Pergunte: dá para saber onde está o dono só olhando o começo do endereço?");
                if (certas === EXEMPLOS.length) concluir();
            }), fb);
    });

    /* ------------------------------------------------------------------
     * Atividade 2 — tabela porta-endereço (pág. 36–37; 4.4.2 Q2–3; 4.4.3 Q1–2)
     * ------------------------------------------------------------------ */
    var HOSTS = { A: 1, B: 1, C: 1 };
    var TOPOS = {
        arvore: { nome: "Q2: a rede em árvore", viz: { A: ["R1"], B: ["R3"], C: ["R3"], R1: ["A", "R2"], R2: ["R1", "R3"], R3: ["R2", "B", "C"] } },
        ciclo: { nome: "Q3: com o enlace R1–R3", viz: { A: ["R1"], B: ["R3"], C: ["R3"], R1: ["A", "R2", "R3"], R2: ["R1", "R3"], R3: ["R2", "B", "C", "R1"] } }
    };
    var POS = { A: [50, 40, "host"], R1: [160, 40], R2: [270, 40], R3: [160, 120], B: [270, 120, "host"], C: [270, 190, "host"] };
    var POS_MOVIDO = { A: [50, 150, "host"], R1: [160, 40], R2: [270, 40], R3: [160, 120], B: [270, 120, "host"], C: [270, 190, "host"] };
    function arestasDe(viz) {
        var vistas = {}, out = [];
        Object.keys(viz).forEach(function (a) { viz[a].forEach(function (b) { var k = [a, b].sort().join("|"); if (!vistas[k]) { vistas[k] = 1; out.push([a, b]); } }); });
        return out;
    }
    // Envia um pacote com a regra da pág. 36: aprende a origem; se conhece o destino, encaminha; senão, manda por todas as outras portas.
    function enviaPacote(viz, tab, orig, dest, limite) {
        var fila = [[viz[orig][0], orig]], trans = [], entregues = 0, perdidos = 0;
        while (fila.length && trans.length < limite) {
            var item = fila.shift(), no = item[0], de = item[1];
            if (viz[de].indexOf(no) < 0) { perdidos++; trans.push([de, no, "sem enlace"]); continue; }
            trans.push([de, no]);
            if (HOSTS[no]) { if (no === dest) entregues++; continue; }
            tab[no][orig] = de;
            if (tab[no][dest] !== undefined) fila.push([tab[no][dest], no]);
            else viz[no].forEach(function (v) { if (v !== de) fila.push([v, no]); });
        }
        return { trans: trans, entregues: entregues, pendentes: fila.length, perdidos: perdidos };
    }
    R.enviaPacote30 = function (topo, envios, limite) {
        var viz = JSON.parse(JSON.stringify(TOPOS[topo].viz)), tab = { R1: {}, R2: {}, R3: {} };
        return envios.map(function (e) { return enviaPacote(viz, tab, e[0], e[1], limite || 30); }).concat([tab]);
    };

    R.registrar("aprende-portas", function (raiz) {
        var topo = escolha("Topologia", Object.keys(TOPOS).map(function (k) { return [k, TOPOS[k].nome]; }), false);
        var viz, tab, movido, ultimo;
        var desenho = s("svg", { viewBox: "0 0 330 215", class: "sim-svg w-100", style: "max-height:240px", role: "img", "aria-label": "Rede com hosts A, B e C e roteadores R1, R2 e R3." });
        var tabelas = el("div", { class: "row g-2 mt-1" });
        var log = el("ul", { class: "log mt-2", "aria-live": "polite" });
        function reinicia() {
            viz = JSON.parse(JSON.stringify(TOPOS[topo.value].viz)); tab = { R1: {}, R2: {}, R3: {} }; movido = false; ultimo = null;
            log.replaceChildren(el("li", null, "Rede ligada: as três tabelas começam vazias."));
            mostra();
        }
        function mostra() {
            var marcadas = {};
            if (ultimo) ultimo.trans.forEach(function (t) { marcadas[t[0] + "|" + t[1]] = 1; });
            grafo(desenho, 330, 215, movido ? POS_MOVIDO : POS, arestasDe(viz), { arestas: marcadas, titulo: "Topologia e o último envio" });
            tabelas.replaceChildren.apply(tabelas, ["R1", "R2", "R3"].map(function (r) {
                var ks = Object.keys(tab[r]).sort();
                return el("div", { class: "col-4" }, el("div", { class: "small fw-semibold" }, "Tabela de " + r),
                    el("table", { class: "table table-sm small mono mb-0" }, el("tbody", null,
                        ks.length ? ks.map(function (k) { return el("tr", null, el("td", null, k), el("td", null, "→ " + tab[r][k])); }) : el("tr", null, el("td", { class: "text-muted" }, "vazia")))));
            }));
        }
        function envia(o, d) {
            ultimo = enviaPacote(viz, tab, o, d, 30);
            var texto = o + " → " + d + ": " + ultimo.trans.length + " transmissões; " + d + " recebeu " + ultimo.entregues + " cópia(s)" +
                (ultimo.perdidos ? "; " + ultimo.perdidos + " cópia(s) perdida(s) num enlace que não existe mais" : "") +
                (ultimo.pendentes ? ". Parei em 30 transmissões, e ainda há " + ultimo.pendentes + " cópias circulando: com o ciclo, a inundação não termina." : ".");
            log.prepend(el("li", null, texto));
            mostra();
        }
        var orig = escolha("Origem", [["A", "A"], ["B", "B"], ["C", "C"]], false), dest = escolha("Destino", [["A", "A"], ["B", "B"], ["C", "C"]], false);
        orig.value = "C"; dest.value = "B";
        topo.addEventListener("change", reinicia);
        var P1 = escolha("Por qual vizinho R1 manda um pacote para B", [["A", "A"], ["R2", "R2"], ["R3", "R3"], ["todos", "por todas as portas"]]);
        var P2 = el("input", { type: "number", min: 0, class: "form-control form-control-sm", "aria-label": "Transmissões do primeiro envio" });
        var P3 = escolha("O que acontece com C → B na Q3", [["igual", "o mesmo que na árvore"], ["laco", "as cópias circulam sem parar no ciclo R1–R2–R3"], ["perde", "o pacote é descartado em R3"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "aprende-portas", 15, "Tabelas porta-endereço");
        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-5" }, u.campo("Topologia", topo)),
                el("div", { class: "col-3 col-sm-2" }, u.campo("Origem", orig)),
                el("div", { class: "col-3 col-sm-2" }, u.campo("Destino", dest)),
                el("div", { class: "col-6 col-sm-3 mb-2" }, u.botao("Enviar", "btn-primary w-100", function () { envia(orig.value, dest.value); }))),
            el("div", { class: "d-flex flex-wrap gap-2 mb-2" },
                u.botao("Os três envios do livro (C→B, A→C, B→A)", "btn-outline-primary", function () { reinicia(); envia("C", "B"); envia("A", "C"); envia("B", "A"); }),
                u.botao("Mover A para R3", "btn-outline-secondary", function () {
                    if (movido) return;
                    viz.R1 = viz.R1.filter(function (x) { return x !== "A"; }); viz.A = ["R3"]; viz.R3 = viz.R3.concat(["A"]); movido = true; ultimo = null;
                    log.prepend(el("li", null, "A trocou o enlace com R1 por um enlace com R3. As tabelas não sabem disso."));
                    mostra();
                }),
                u.botao("Recomeçar", "btn-outline-secondary", reinicia)),
            desenho, tabelas, log,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): responda pela rede em árvore, depois dos três envios do livro."),
            linhaPergunta("Por qual vizinho R1 encaminha um pacote para B?", P1),
            linhaPergunta("Quantas transmissões (enlaces percorridos) o primeiro envio, C → B, causou?", P2),
            linhaPergunta("Com o enlace R1–R3 (Q3), o que acontece com o primeiro envio?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === "R2" && Number(P2.value) === 5 && P3.value === "laco";
                u.marca(fb, ok, ok ? "Isso: R1 aprendeu B pela porta de R2 quando B mandou o pacote para A. O C → B foi inundado por 5 enlaces; com o ciclo, a inundação nunca acaba."
                    : "Ainda não. Use \"Os três envios do livro\" e conte as transmissões do primeiro envio no registro.");
                if (ok) concluir();
            }), fb);
        reinicia();
    });

    /* ------------------------------------------------------------------
     * Atividade 3 — peso negativo (4.4.2 Q4)
     * ------------------------------------------------------------------ */
    var NEG = [["R1", "R2", 1], ["R1", "R3", -1], ["R2", "R3", -3]];
    function dvSincrono(arestas, rodadas) {
        var g = {};
        arestas.forEach(function (e) { (g[e[0]] = g[e[0]] || {})[e[1]] = e[2]; (g[e[1]] = g[e[1]] || {})[e[0]] = e[2]; });
        var nos = Object.keys(g).sort(), d = {}, hist = [];
        nos.forEach(function (a) { d[a] = {}; nos.forEach(function (b) { d[a][b] = a === b ? 0 : INF; }); });
        for (var r = 0; r < rodadas; r++) {
            var novo = {};
            nos.forEach(function (a) {
                novo[a] = {};
                nos.forEach(function (b) {
                    if (a === b) { novo[a][b] = 0; return; }
                    var m = INF;
                    Object.keys(g[a]).forEach(function (n) { m = Math.min(m, g[a][n] + d[n][b]); });
                    novo[a][b] = m;
                });
            });
            d = novo; hist.push(novo);
        }
        return hist;
    }
    R.dvSincrono30 = dvSincrono;
    R.registrar("peso-negativo", function (raiz) {
        var rodada = 0, MAX = 8;
        var desenho = s("svg", { viewBox: "0 0 300 150", class: "sim-svg w-100", style: "max-height:170px", role: "img", "aria-label": "Três roteadores com pesos 1, −1 e −3." });
        grafo(desenho, 300, 150, { R1: [70, 35], R2: [230, 35], R3: [70, 120] }, [["R1", "R2", "1"], ["R1", "R3", "−1"], ["R2", "R3", "−3"]], { titulo: "A rede da Q4" });
        var tabela = el("div");
        var saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            var hist = dvSincrono(NEG, MAX);
            tabela.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Rodada"), el("th", null, "R2 até R1"), el("th", null, "R3 até R1"), el("th", null, "R1 até R2"))),
                el("tbody", null, hist.slice(0, rodada).map(function (h, i) {
                    return el("tr", null, el("td", null, String(i + 1)), el("td", null, fmt(h.R2.R1)), el("td", null, fmt(h.R3.R1)), el("td", null, fmt(h.R1.R2)));
                })))));
            saida.textContent = rodada === 0 ? "Cada rodada: todo roteador recebe os vetores dos vizinhos e recalcula d(x) = min(peso do enlace + distância anunciada)."
                : rodada < 3 ? "As distâncias estão caindo." : "As distâncias caem para sempre: cada volta no ciclo soma um custo negativo e \"melhora\" a rota. O protocolo nunca converge, e os pacotes ficam presos num laço.";
        }
        var resp = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Distância de R3 até R1 na rodada 4" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "peso-negativo", 10, "Pesos negativos");
        raiz.append(desenho,
            el("div", { class: "d-flex gap-2 mb-2" }, u.botao("Próxima rodada", "btn-primary", function () { if (rodada < MAX) rodada++; mostra(); }), u.botao("Recomeçar", "btn-outline-secondary", function () { rodada = 0; mostra(); })),
            tabela, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): sem avançar além da rodada 3, calcule a distância de R3 até R1 na rodada 4."),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === dvSincrono(NEG, 4)[3].R3.R1;
                u.marca(fb, ok, ok ? "−8: na rodada 4, R3 usa o anúncio de R2 da rodada 3 (−5) mais o peso −3." : "Não. R3 escolhe o mínimo entre −1 (direto) e −3 + o que R2 anunciou na rodada 3.");
                if (ok) concluir();
            })), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * Atividade 4 — métricas na rede Abilene (Fig. 4, 4.4.2 Q5)
     * ------------------------------------------------------------------ */
    var AB_POS = {
        "Seattle": [70, 30], "Sunnyvale": [35, 110], "Los Angeles": [85, 180], "Denver": [190, 115], "Kansas City": [300, 135],
        "Houston": [290, 250], "Chicago": [370, 65], "Indianapolis": [415, 120], "Atlanta": [440, 210], "New York": [520, 55], "Washington": [515, 135]
    };
    var AB = [["Seattle", "Sunnyvale"], ["Seattle", "Denver"], ["Sunnyvale", "Denver"], ["Sunnyvale", "Los Angeles"], ["Los Angeles", "Houston"],
        ["Denver", "Kansas City"], ["Kansas City", "Houston"], ["Kansas City", "Indianapolis"], ["Houston", "Atlanta"], ["Indianapolis", "Chicago"],
        ["Indianapolis", "Atlanta"], ["Chicago", "New York"], ["New York", "Washington"], ["Washington", "Atlanta"]];
    var SIGLA = { "Seattle": "SEA", "Sunnyvale": "SNV", "Los Angeles": "LA", "Denver": "DEN", "Kansas City": "KC", "Houston": "HOU", "Chicago": "CHI", "Indianapolis": "IND", "Atlanta": "ATL", "New York": "NY", "Washington": "WAS" };
    function caminhoTxt(c) { return c.map(function (n) { return SIGLA[n]; }).join("→"); }
    function usaEnlace(c, a, b) { for (var i = 0; i + 1 < c.length; i++) if ((c[i] === a && c[i + 1] === b) || (c[i] === b && c[i + 1] === a)) return true; return false; }
    // Avalia os três objetivos da Q5 para um conjunto de pesos por sentido.
    function objetivosAbilene(peso) {
        var g = adjacencia(AB, peso), res = {};
        var la = dijkstra(g, "Los Angeles"), ny = dijkstra(g, "New York");
        var pNY = la.cam["New York"], pWA = la.cam["Washington"], pVolta = ny.cam["Los Angeles"];
        res.empate = pNY.length > 1 || pWA.length > 1 || pVolta.length > 1;
        res.difNyWa = !res.empate && pNY[0].indexOf("Washington") < 0;
        var meio1 = pNY[0].slice(1, -1), meio2 = pVolta[0].slice(1, -1);
        res.assim = !res.empate && meio1.every(function (n) { return meio2.indexOf(n) < 0; });
        var exclusivo = true, usaDK = false;
        Object.keys(g).forEach(function (o) {
            var d = dijkstra(g, o);
            Object.keys(g).forEach(function (t) {
                if (t === o) return;
                d.cam[t].forEach(function (c) {
                    if (!usaEnlace(c, "Denver", "Kansas City")) return;
                    var par = (o === "Denver" && t === "Kansas City") || (o === "Kansas City" && t === "Denver");
                    if (par && d.cam[t].length === 1) usaDK = true; else exclusivo = false;
                });
            });
        });
        res.denverKC = exclusivo && usaDK;
        res.caminhos = { ny: pNY.map(caminhoTxt).join(" ou "), wa: pWA.map(caminhoTxt).join(" ou "), volta: pVolta.map(caminhoTxt).join(" ou ") };
        return res;
    }
    R.objetivosAbilene = function (pesos) { return objetivosAbilene(function (a, b) { return pesos[a + ">" + b] || 1; }); };

    R.registrar("abilene-metricas", function (raiz) {
        var entradas = {}, porSentido = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") });
        var origem = escolha("Origem", Object.keys(AB_POS).map(function (n) { return [n, n]; }), false), destino = escolha("Destino", Object.keys(AB_POS).map(function (n) { return [n, n]; }), false);
        origem.value = "Los Angeles"; destino.value = "New York";
        var desenho = s("svg", { viewBox: "0 0 560 280", class: "sim-svg w-100", style: "max-height:300px", role: "img", "aria-label": "A rede Abilene com onze roteadores." });
        var saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        var grade = el("div", { class: "row g-1 small" });
        function peso(a, b) { var x = Number(entradas[a + ">" + b].value); return x > 0 ? x : 1; }
        AB.forEach(function (e) {
            [[e[0], e[1]], [e[1], e[0]]].forEach(function (p) {
                var i = el("input", { type: "number", min: 1, max: 99, value: 1, class: "form-control form-control-sm", "aria-label": "Peso de " + p[0] + " para " + p[1] });
                i.addEventListener("input", function () { if (!porSentido.checked) entradas[p[1] + ">" + p[0]].value = i.value; mostra(); });
                entradas[p[0] + ">" + p[1]] = i;
            });
            grade.append(el("div", { class: "col-6 col-md-4 d-flex align-items-center gap-1" },
                el("span", { class: "mono", style: "min-width:6.5em" }, SIGLA[e[0]] + "–" + SIGLA[e[1]]),
                entradas[e[0] + ">" + e[1]], el("span", { class: "sentido", title: "sentido inverso" }, "↔"), entradas[e[1] + ">" + e[0]]));
        });
        function sincroniza() {
            grade.querySelectorAll(".sentido").forEach(function (x) { x.textContent = porSentido.checked ? "/" : "↔"; });
            AB.forEach(function (e) { entradas[e[1] + ">" + e[0]].disabled = !porSentido.checked; if (!porSentido.checked) entradas[e[1] + ">" + e[0]].value = entradas[e[0] + ">" + e[1]].value; });
        }
        function mostra() {
            var g = adjacencia(AB, peso), d = dijkstra(g, origem.value), cams = d.cam[destino.value];
            var marcadas = {};
            cams.forEach(function (c) { for (var i = 0; i + 1 < c.length; i++) marcadas[c[i] + "|" + c[i + 1]] = 1; });
            var nosAt = {}; cams.forEach(function (c) { c.forEach(function (n) { nosAt[n] = 1; }); });
            var nos = {}; Object.keys(AB_POS).forEach(function (n) { nos[SIGLA[n]] = AB_POS[n]; });
            var ar = AB.map(function (e) { var a = peso(e[0], e[1]), b = peso(e[1], e[0]); return [SIGLA[e[0]], SIGLA[e[1]], a === b ? a : a + "/" + b]; });
            var m2 = {}; Object.keys(marcadas).forEach(function (k) { var p = k.split("|"); m2[SIGLA[p[0]] + "|" + SIGLA[p[1]]] = 1; });
            var n2 = {}; Object.keys(nosAt).forEach(function (k) { n2[SIGLA[k]] = 1; });
            grafo(desenho, 560, 280, nos, ar, { arestas: m2, nos: n2, titulo: "Abilene: caminho de menor custo" });
            saida.textContent = origem.value === destino.value ? "Escolha origem e destino diferentes." :
                "Custo " + d.dist[destino.value] + ": " + cams.map(caminhoTxt).join("  ou  ") + (cams.length > 1 ? " (empate: há mais de um caminho de menor custo)." : ".");
        }
        porSentido.addEventListener("change", function () { sincroniza(); mostra(); });
        origem.addEventListener("change", mostra); destino.addEventListener("change", mostra);
        var feitos = { difNyWa: false, assim: false, denverKC: false };
        var estado = el("ul", { class: "small mb-1" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "abilene-metricas", 20, "Configurar as métricas da Abilene");
        function mostraEstado() {
            var nomes = { difNyWa: "LA → NY sem passar por Washington, enquanto LA → Washington continua direto", assim: "LA → NY e NY → LA sem nenhum roteador intermediário em comum", denverKC: "o enlace DEN–KC só carrega o tráfego entre Denver e Kansas City" };
            estado.replaceChildren.apply(estado, Object.keys(nomes).map(function (k) { return el("li", null, (feitos[k] ? "✔ " : "○ ") + nomes[k]); }));
        }
        raiz.append(
            el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Origem", origem)), el("div", { class: "col-6" }, u.campo("Destino", destino))),
            desenho, saida,
            el("div", { class: "form-check my-2" }, porSentido, el("label", { class: "form-check-label small", for: porSentido.id }, "Pesos diferentes em cada sentido (o segundo campo vale para o sentido inverso)")),
            grade,
            el("div", { class: "d-flex gap-2 mt-2" }, u.botao("Todos os pesos = 1", "btn-outline-secondary", function () { Object.keys(entradas).forEach(function (k) { entradas[k].value = 1; }); mostra(); })),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (20 pts): consiga cada objetivo da Q5 com os pesos (um de cada vez vale) e clique em Verificar. Empates não contam."),
            estado,
            u.botao("Verificar os pesos atuais", "btn-primary", function () {
                var r = objetivosAbilene(peso), novos = [];
                Object.keys(feitos).forEach(function (k) { if (r[k] && !feitos[k]) { feitos[k] = true; novos.push(k); } });
                mostraEstado();
                var todos = feitos.difNyWa && feitos.assim && feitos.denverKC;
                u.marca(fb, todos, todos ? "Os três objetivos foram alcançados." : (r.empate ? "Há empate em algum dos caminhos de LA ou de NY: mude um peso para desempatar. " : "") +
                    "Agora: LA→NY " + r.caminhos.ny + "; LA→WAS " + r.caminhos.wa + "; NY→LA " + r.caminhos.volta + "." + (novos.length ? " Objetivo novo alcançado!" : ""));
                if (todos) concluir();
            }), fb);
        sincroniza(); mostraEstado(); mostra();
    });

    /* ------------------------------------------------------------------
     * Atividade 5 — caminhos desejados (4.4.2 Q6–Q11)
     * ------------------------------------------------------------------ */
    var CENARIOS = {
        q6: { nome: "Q6", pos: { R1: [150, 30], R3: [80, 100], R2: [220, 100], R5: [80, 170], R4: [220, 170] },
            arestas: [["R1", "R3"], ["R1", "R2"], ["R3", "R2"], ["R3", "R5"], ["R2", "R4"], ["R5", "R4"]],
            desejados: [["R5", "R3", "R1"], ["R3", "R2", "R1"]], possivel: false },
        q7: { nome: "Q7", pos: { R1: [150, 30], R3: [80, 100], R2: [220, 100], R5: [80, 170], R4: [220, 170] },
            arestas: [["R1", "R3"], ["R1", "R2"], ["R3", "R2"], ["R3", "R5"], ["R2", "R4"], ["R5", "R4"]],
            desejados: [["R5", "R3", "R1"], ["R4", "R2", "R3", "R1"]], possivel: true },
        q9: { nome: "Q9", pos: { R3: [100, 40], R4: [220, 40], R1: [40, 130], R2: [160, 130], R5: [280, 130] },
            arestas: [["R1", "R3"], ["R3", "R2"], ["R1", "R2"], ["R2", "R4"], ["R4", "R5"], ["R2", "R5"]],
            desejados: [["R3", "R2", "R4", "R5"], ["R1", "R2", "R5"]], possivel: false },
        q10: { nome: "Q10", pos: { R3: [100, 40], R4: [220, 40], R1: [40, 130], R2: [160, 130], R5: [280, 130] },
            arestas: [["R1", "R3"], ["R3", "R2"], ["R1", "R2"], ["R3", "R4"], ["R2", "R4"], ["R4", "R5"], ["R2", "R5"]],
            desejados: [["R1", "R2", "R4"], ["R3", "R2", "R5", "R4"]], possivel: false },
        q11: { nome: "Q11", pos: { R3: [100, 40], R4: [220, 40], R1: [40, 130], R2: [160, 130], R5: [280, 130] },
            arestas: [["R1", "R3"], ["R3", "R2"], ["R1", "R2"], ["R2", "R4"], ["R4", "R5"], ["R2", "R5"], ["R1", "R5"]],
            desejados: [["R1", "R5", "R4"], ["R3", "R2", "R4"]], possivel: true }
    };
    // Encaminhamento por destino: cada nó tem um só próximo salto por destino.
    function consistencia(caminhos) {
        var prox = {};
        for (var i = 0; i < caminhos.length; i++) {
            var p = caminhos[i], t = p[p.length - 1];
            for (var j = 0; j + 1 < p.length; j++) {
                var k = p[j] + ">" + t;
                if (prox[k] && prox[k] !== p[j + 1]) return { ok: false, no: p[j], destino: t, a: prox[k], b: p[j + 1] };
                prox[k] = p[j + 1];
            }
        }
        return { ok: true };
    }
    R.consistencia30 = consistencia;
    R.registrar("caminhos-desejados", function (raiz) {
        var cen = escolha("Questão", Object.keys(CENARIOS).map(function (k) { return [k, CENARIOS[k].nome + ": " + CENARIOS[k].desejados.map(function (c) { return c.join("→"); }).join(" e ")]; }), false);
        var desenho = s("svg", { viewBox: "0 0 320 200", class: "sim-svg w-100", style: "max-height:220px", role: "img", "aria-label": "Topologia da questão escolhida." });
        var grade = el("div", { class: "row g-1 small" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var entradas = {};
        function monta() {
            var c = CENARIOS[cen.value]; entradas = {};
            grade.replaceChildren.apply(grade, c.arestas.map(function (e) {
                var i = el("input", { type: "number", min: 1, max: 99, value: 1, class: "form-control form-control-sm", "aria-label": "Peso de " + e[0] + "–" + e[1] });
                i.addEventListener("input", mostra);
                entradas[e[0] + "|" + e[1]] = i;
                return el("div", { class: "col-4 col-md-3 d-flex align-items-center gap-1" }, el("span", { class: "mono" }, e[0] + "–" + e[1]), i);
            }));
            mostra();
        }
        function peso(a, b) { var i = entradas[a + "|" + b] || entradas[b + "|" + a]; var x = Number(i.value); return x > 0 ? x : 1; }
        function mostra() {
            var c = CENARIOS[cen.value], g = adjacencia(c.arestas, peso), marcadas = {}, linhas = [];
            c.desejados.forEach(function (p) {
                var d = dijkstra(g, p[0]), cams = d.cam[p[p.length - 1]];
                var bate = cams.length === 1 && cams[0].join() === p.join();
                cams.forEach(function (cc) { for (var i = 0; i + 1 < cc.length; i++) marcadas[cc[i] + "|" + cc[i + 1]] = 1; });
                linhas.push(el("li", null, "Desejado " + p.join("→") + "; o menor custo dá " + cams.map(function (x) { return x.join("→"); }).join(" ou ") + (bate ? " ✔" : " ✘")));
            });
            grafo(desenho, 320, 200, c.pos, c.arestas.map(function (e) { return [e[0], e[1], peso(e[0], e[1])]; }), { arestas: marcadas, titulo: "Caminhos de menor custo" });
            saida.replaceChildren(el("ul", { class: "mb-1" }, linhas));
        }
        cen.addEventListener("change", monta);
        var teste = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        var ordem = ["q6", "q7", "q9", "q10", "q11"];
        var sels = ordem.map(function (k) { return escolha("Possível na " + CENARIOS[k].nome, [["sim", "possível com LS/DV"], ["nao", "só com circuitos virtuais"]]); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "caminhos-desejados", 15, "Caminhos desejados");
        raiz.append(u.campo("Questão do livro", cen), desenho, el("p", { class: "small mb-1" }, "Pesos dos enlaces (iguais nos dois sentidos):"), grade, saida,
            u.botao("Teste de consistência", "btn-outline-primary mt-1", function () {
                var r = consistencia(CENARIOS[cen.value].desejados);
                teste.textContent = r.ok ? "Os caminhos desejados são compatíveis com o encaminhamento por destino: falta só achar os pesos."
                    : "Impossível com encaminhamento por destino: em " + r.no + ", os pacotes para " + r.destino + " teriam de sair por " + r.a + " e também por " + r.b + ". Nenhum peso resolve; só circuitos virtuais (ou roteamento pela origem).";
            }), teste,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): em cada questão, os caminhos pedidos são possíveis com estado de enlace ou vetor de distância?"),
            el("div", null, ordem.map(function (k, i) { return linhaPergunta(CENARIOS[k].nome + ": " + CENARIOS[k].desejados.map(function (c) { return c.join("→"); }).join(" e "), sels[i]); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = ordem.filter(function (k, i) { return sels[i].value === (CENARIOS[k].possivel ? "sim" : "nao"); }).length;
                u.marca(fb, certas === ordem.length, certas === ordem.length ? "Isso: Q7 e Q11 têm pesos que funcionam; Q6, Q9 e Q10 exigem dois próximos saltos diferentes para o mesmo destino no mesmo roteador."
                    : certas + " de " + ordem.length + ". Use o teste de consistência em cada questão.");
                if (certas === ordem.length) concluir();
            }), fb);
        monta();
    });

    /* ------------------------------------------------------------------
     * Atividade 6 — transitórios depois da falha de B–C (4.4.3 Q5–Q6)
     * ------------------------------------------------------------------ */
    var TP = [["A", "B", 1], ["B", "C", 1], ["C", "D", 1], ["B", "D", 3], ["A", "E", 8], ["D", "E", 1]];
    var TPOS = { A: [40, 95], B: [130, 95], C: [220, 95], D: [310, 95], E: [175, 170] };
    var NOS5 = ["A", "B", "C", "D", "E"];
    function tabelas(arestas) {
        var g = adjacencia(arestas.map(function (e) { return [e[0], e[1]]; }), function (a, b) { var e = arestas.find(function (x) { return (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a); }); return e[2]; });
        var t = {};
        NOS5.forEach(function (o) { var d = dijkstra(g, o); t[o] = {}; NOS5.forEach(function (x) { t[o][x] = { custo: d.dist[x], via: x === o ? o : d.cam[x][0][1] }; }); });
        return t;
    }
    var ANTES = tabelas(TP), SEM = TP.filter(function (e) { return !(e[0] === "B" && e[1] === "C"); }), DEPOIS = tabelas(SEM);
    function vivo(a, b) { return SEM.some(function (e) { return (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a); }); }
    function destinoAlcancado(prox, o, t) {
        var no = o, vistos = {};
        while (no !== t) { if (vistos[no]) return "laço"; vistos[no] = 1; var nx = prox[no][t]; if (!vivo(no, nx)) return "perdido em " + no; no = nx; }
        return "ok";
    }
    function paresOk(prox) {
        var n = 0;
        NOS5.forEach(function (a) { NOS5.forEach(function (b) { if (a < b && destinoAlcancado(prox, a, b) === "ok" && destinoAlcancado(prox, b, a) === "ok") n++; }); });
        return n;
    }
    R.lsTransitorio30 = function (ordem) {
        var prox = {}; NOS5.forEach(function (o) { prox[o] = {}; NOS5.forEach(function (x) { prox[o][x] = ANTES[o][x].via; }); });
        var out = [paresOk(prox)];
        ordem.forEach(function (r) { NOS5.forEach(function (x) { prox[r][x] = DEPOIS[r][x].via; }); out.push(paresOk(prox)); });
        return out;
    };
    // Vetor de distância com split horizon e atualizações disparadas: cada roteador que muda manda o vetor a todos os vizinhos (fila FIFO).
    function dvDisparado() {
        var g = {}; SEM.forEach(function (e) { (g[e[0]] = g[e[0]] || {})[e[1]] = e[2]; (g[e[1]] = g[e[1]] || {})[e[0]] = e[2]; });
        var tab = {}; NOS5.forEach(function (o) { tab[o] = {}; NOS5.forEach(function (x) { tab[o][x] = { custo: ANTES[o][x].custo, via: ANTES[o][x].via }; }); });
        [["B", "C"], ["C", "B"]].forEach(function (p) { NOS5.forEach(function (x) { if (tab[p[0]][x].via === p[1]) tab[p[0]][x] = { custo: INF, via: "—" }; }); });
        var eventos = [], fila = ["B", "C"];
        while (fila.length && eventos.length < 200) {
            var x = fila.shift();
            Object.keys(g[x]).forEach(function (v) {
                var mudou = [];
                NOS5.forEach(function (d) {
                    if (d === v) return;
                    var c = tab[x][d].via === v ? INF : tab[x][d].custo; // split horizon
                    var novo = c + g[v][x], at = tab[v][d];
                    if (novo < at.custo || (at.via === x && novo !== at.custo)) { tab[v][d] = { custo: novo, via: novo < INF ? x : "—" }; mudou.push(d); }
                });
                eventos.push({ de: x, para: v, mudou: mudou, foto: JSON.parse(JSON.stringify(tab, function (k, val) { return val === INF ? "∞" : val; })) });
                if (mudou.length && fila.indexOf(v) < 0) fila.push(v);
            });
        }
        return eventos;
    }
    R.dvDisparado30 = dvDisparado;
    R.registrar("microlacos", function (raiz) {
        var modo = escolha("Protocolo", [["ls", "Estado de enlace: B, D, A, C e E recalculam, nessa ordem (Q6)"], ["dv", "Vetor de distância com split horizon e atualizações disparadas (Q5)"]], false);
        var passo = 0, ORDEM = ["B", "D", "A", "C", "E"], eventos = dvDisparado();
        var desenho = s("svg", { viewBox: "0 0 350 195", class: "sim-svg w-100", style: "max-height:210px", role: "img", "aria-label": "Rede A, B, C, D, E com o enlace B–C em falha." });
        var tabela = el("div", { class: "table-responsive mt-1" }), saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function linhaTab(t, destaque) {
            return el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Destino"), NOS5.map(function (r) { return el("th", { class: destaque === r ? "table-warning" : null }, "em " + r); }))),
                el("tbody", null, NOS5.map(function (d) { return el("tr", null, el("td", null, d), NOS5.map(function (r) { var c = t[r][d]; return el("td", { class: destaque === r ? "table-warning" : null }, (c.custo === INF ? "∞" : c.custo) + (r === d ? "" : " via " + c.via)); })); })));
        }
        function mostra() {
            grafo(desenho, 350, 195, TPOS, TP.map(function (e) { return [e[0], e[1], e[2], e[0] === "B" && e[1] === "D" ? -38 : (e[0] === "A" && e[1] === "E" ? 0 : 0)]; }), { mortas: { "B|C": 1 }, titulo: "Topologia de 4.4.3 Q5, com B–C em falha" });
            if (modo.value === "ls") {
                var prox = {}, t = {};
                NOS5.forEach(function (o) { var fonte = ORDEM.indexOf(o) < passo ? DEPOIS : ANTES; t[o] = fonte[o]; prox[o] = {}; NOS5.forEach(function (x) { prox[o][x] = fonte[o][x].via; }); });
                tabela.replaceChildren(linhaTab(t, passo ? ORDEM[passo - 1] : null));
                var probs = [];
                NOS5.forEach(function (a) { NOS5.forEach(function (b) { if (a !== b) { var r = destinoAlcancado(prox, a, b); if (r !== "ok") probs.push(a + "→" + b + " (" + r + ")"); } }); });
                saida.textContent = (passo ? ORDEM.slice(0, passo).join(", ") + " já recalcularam. " : "B–C acabou de falhar; ninguém recalculou ainda. ") +
                    paresOk(prox) + " de 10 pares se comunicam nos dois sentidos." + (probs.length ? " Sem entrega: " + probs.join(", ") + "." : " Tudo convergiu.");
            } else {
                var ev = passo ? eventos[passo - 1] : null;
                var foto = ev ? ev.foto : null;
                if (!foto) {
                    foto = {}; NOS5.forEach(function (o) { foto[o] = {}; NOS5.forEach(function (x) { foto[o][x] = { custo: ANTES[o][x].custo, via: ANTES[o][x].via }; }); });
                    [["B", "C"], ["C", "B"]].forEach(function (p) { NOS5.forEach(function (x) { if (foto[p[0]][x].via === p[1]) foto[p[0]][x] = { custo: "∞", via: "—" }; }); });
                }
                tabela.replaceChildren(linhaTab(foto, ev ? ev.para : null));
                saida.textContent = !ev ? "B e C perceberam a falha e marcaram com ∞ as rotas que usavam B–C. Eles começam mandando seus vetores." :
                    "Mensagem " + passo + " de " + eventos.length + ": " + ev.de + " manda o vetor a " + ev.para + (ev.mudou.length ? "; " + ev.para + " muda as rotas para " + ev.mudou.join(", ") + " e vai anunciar." : "; nada muda em " + ev.para + ".") +
                    (passo === eventos.length ? " A rede convergiu." : "");
            }
        }
        modo.addEventListener("change", function () { passo = 0; mostra(); });
        var P1 = el("input", { type: "number", min: 0, max: 10, class: "form-control form-control-sm", "aria-label": "Pares depois de B e D" });
        var P2 = escolha("Quem ainda não alcança A depois que A recalculou", NOS5.map(function (n) { return [n, n]; }));
        var P3 = el("input", { type: "number", min: 0, class: "form-control form-control-sm", "aria-label": "Mensagens até convergir" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "microlacos", 15, "Transitórios depois de uma falha");
        raiz.append(u.campo("Protocolo", modo), desenho,
            el("div", { class: "d-flex gap-2 mb-1" },
                u.botao("Próximo passo", "btn-primary", function () { var max = modo.value === "ls" ? ORDEM.length : eventos.length; if (passo < max) passo++; mostra(); }),
                u.botao("Recomeçar", "btn-outline-secondary", function () { passo = 0; mostra(); })),
            tabela, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Estado de enlace: depois que B e D recalcularam, quantos pares se comunicam nos dois sentidos?", P1),
            linhaPergunta("Estado de enlace: depois que A recalculou, quem ainda não alcança A?", P2),
            linhaPergunta("Vetor de distância: quantas mensagens até convergir, na ordem desta simulação?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === R.lsTransitorio30(["B", "D"])[2] && P2.value === "C" && Number(P3.value) === eventos.length;
                u.marca(fb, ok, ok ? "Isso. Enquanto C não recalcula, ele ainda manda para B pelo enlace que caiu: os pacotes de C para A e B se perdem." : "Ainda não. Avance os passos nos dois modos e leia a contagem de pares e de mensagens.");
                if (ok) concluir();
            }), fb);
        mostra();
    });
}());
