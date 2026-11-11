/* Simulações do Capítulo 6 — Compartilhamento de recursos. Cada uma é registrada em Redes.registrar. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, svg = u.svg;

    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }
    function faixa(rotulo, min, max, passo, valor) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor });
        var mostra = el("span", { class: "fw-semibold" });
        var linha = el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id = u.novoId("faixa") }, rotulo, mostra), input);
        return { input: input, mostra: mostra, linha: linha };
    }
    function barra(fracao, classe) {
        return el("div", { class: "barra-carga" + (classe ? " " + classe : ""), style: "width:" + Math.max(0, Math.min(100, fracao * 100)) + "%" });
    }

    /* ------------------------------------------------------------------
     * 1. Topologias (Fig. 55–59)
     * ------------------------------------------------------------------ */
    R.registrar("topologias", function (raiz) {
        var tipo = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "malha" }, "Malha completa (Fig. 55)"),
            el("option", { value: "barramento" }, "Barramento (Fig. 56)"),
            el("option", { value: "estrela", selected: true }, "Estrela (Fig. 57)"),
            el("option", { value: "anel" }, "Anel (Fig. 58)"),
            el("option", { value: "arvore" }, "Árvore (Fig. 59)"));
        var n = faixa("Hosts", 3, 8, 1, 5);
        var desenho = svg("svg", { viewBox: "0 0 640 300", class: "sim-svg w-100", style: "max-height:320px" });
        var info = el("div", { class: "small mt-2", "aria-live": "polite" });
        var cortes = {};
        var modelo = null;
        var concluir = R.desafio(raiz, "topologia-estrela", 15, "Os dois cortes da estrela");
        var feitos = {};

        function monta(t, k) {
            var nos = [], arestas = [];
            var cx = 320, cy = 150, raio = 115;
            function host(i, x, y) { nos.push({ id: "H" + (i + 1), x: x, y: y, host: true }); }
            if (t === "barramento") {
                for (var i = 0; i < k; i++) {
                    var x = 70 + i * (500 / (k - 1));
                    host(i, x, 90);
                    nos.push({ id: "T" + (i + 1), x: x, y: 210, host: false, derivacao: true });
                    arestas.push({ a: "H" + (i + 1), b: "T" + (i + 1), id: "d" + i, rotulo: "" });
                    if (i > 0) arestas.push({ a: "T" + i, b: "T" + (i + 1), id: "s" + i, cabo: true });
                }
            } else if (t === "arvore") {
                var niveis = [[0], [1, 2], [3, 4, 5, 6], [7]];
                niveis.forEach(function (nivel, ni) {
                    var lista = nivel.filter(function (j) { return j < k; });
                    lista.forEach(function (j, pos) {
                        host(j, 320 + (pos - (lista.length - 1) / 2) * (ni === 1 ? 260 : 140), 40 + ni * 75);
                    });
                });
                for (var j = 1; j < k; j++) {
                    var pai = Math.floor((j - 1) / 2);
                    arestas.push({ a: "H" + (pai + 1), b: "H" + (j + 1), id: "e" + j });
                }
            } else {
                for (var h = 0; h < k; h++) {
                    var ang = -Math.PI / 2 + h * 2 * Math.PI / k;
                    host(h, cx + raio * Math.cos(ang), cy + raio * Math.sin(ang));
                }
                if (t === "malha") {
                    for (var a = 0; a < k; a++) for (var b = a + 1; b < k; b++) arestas.push({ a: "H" + (a + 1), b: "H" + (b + 1), id: "m" + a + "-" + b });
                } else if (t === "estrela") {
                    nos.push({ id: "Centro", x: cx, y: cy, host: false, centro: true });
                    for (var e = 0; e < k; e++) arestas.push({ a: "Centro", b: "H" + (e + 1), id: "c" + e });
                } else if (t === "anel") {
                    for (var r = 0; r < k; r++) arestas.push({ a: "H" + (r + 1), b: "H" + ((r + 1) % k + 1), id: "r" + r, sentido: true });
                }
            }
            return { tipo: t, nos: nos, arestas: arestas };
        }

        function no(id) { return modelo.nos.filter(function (x) { return x.id === id; })[0]; }
        function cortavel(nd) { return nd.centro || (modelo.tipo === "arvore" && modelo.arestas.some(function (a) { return a.a === nd.id; })); }

        function grupos() {
            var pai = {};
            function acha(x) { while (pai[x] !== x) x = pai[x] = pai[pai[x]]; return x; }
            modelo.nos.forEach(function (x) { if (!cortes["v:" + x.id]) pai[x.id] = x.id; });
            if (modelo.tipo === "anel" && modelo.arestas.some(function (a) { return cortes["e:" + a.id]; })) {
                // Anel unidirecional: um enlace cortado interrompe o sinal para todos.
                return modelo.nos.map(function (x) { return [x.id]; });
            }
            modelo.arestas.forEach(function (a) {
                if (cortes["e:" + a.id] || !(a.a in pai) || !(a.b in pai)) return;
                pai[acha(a.a)] = acha(a.b);
            });
            var g = {};
            modelo.nos.forEach(function (x) {
                if (!x.host) return;
                var chave = x.id in pai ? acha(x.id) : "fora-" + x.id;
                (g[chave] = g[chave] || []).push(x.id);
            });
            return Object.keys(g).map(function (k) { return g[k]; });
        }

        function desenha() {
            desenho.replaceChildren(svg("title", { text: "Topologia " + tipo.options[tipo.selectedIndex].text + " com " + n.input.value + " hosts. Clique num enlace ou no nó central para cortá-lo." }));
            modelo.arestas.forEach(function (a) {
                var p = no(a.a), q = no(a.b), cortada = !!cortes["e:" + a.id];
                var linha = svg("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: cortada ? "linha" : (a.cabo ? "linha-ativa" : "linha"), "stroke-dasharray": cortada ? "4 6" : null, opacity: cortada ? 0.5 : 1 });
                var alvo = svg("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: "transparent", "stroke-width": 14, style: "cursor:pointer", tabindex: 0, role: "button", "aria-label": (cortada ? "Religar" : "Cortar") + " enlace " + a.a + "–" + a.b });
                function alterna() { if (cortes["e:" + a.id]) delete cortes["e:" + a.id]; else cortes["e:" + a.id] = true; atualiza(); }
                alvo.addEventListener("click", alterna);
                alvo.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); alterna(); } });
                desenho.append(linha, alvo);
                if (cortada) desenho.appendChild(svg("text", { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 + 5, "text-anchor": "middle", class: "seq-x" }, "✕"));
            });
            modelo.nos.forEach(function (nd) {
                if (nd.derivacao) { desenho.appendChild(svg("circle", { cx: nd.x, cy: nd.y, r: 4, class: "no" })); return; }
                var off = !!cortes["v:" + nd.id];
                var g = svg("g", cortavel(nd) ? { style: "cursor:pointer", tabindex: 0, role: "button", "aria-label": (off ? "Religar " : "Desligar ") + nd.id } : null,
                    svg("circle", { cx: nd.x, cy: nd.y, r: nd.centro ? 22 : 18, class: off ? "camada" : "no", opacity: off ? 0.5 : 1 }),
                    svg("text", { x: nd.x, y: nd.y + 4, "text-anchor": "middle", "font-size": nd.centro ? 11 : 12 }, off ? "✕" : nd.id));
                if (cortavel(nd)) {
                    var alterna = function () { if (cortes["v:" + nd.id]) delete cortes["v:" + nd.id]; else cortes["v:" + nd.id] = true; atualiza(); };
                    g.addEventListener("click", alterna);
                    g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); alterna(); } });
                }
                desenho.appendChild(g);
            });
            if (modelo.tipo === "barramento") desenho.appendChild(svg("text", { x: 320, y: 245, "text-anchor": "middle", "font-size": 11 }, "cabo compartilhado: clique num trecho para cortá-lo"));
            if (modelo.tipo === "anel") desenho.appendChild(svg("text", { x: 320, y: 290, "text-anchor": "middle", "font-size": 11 }, "o sinal percorre o anel num só sentido"));
        }

        function atualiza() {
            desenha();
            var k = Number(n.input.value);
            n.mostra.textContent = k;
            var hosts = modelo.nos.filter(function (x) { return x.host; });
            var graus = hosts.map(function (h) { return modelo.arestas.filter(function (a) { return a.a === h.id || a.b === h.id; }).length; });
            var gMin = Math.min.apply(null, graus), gMax = Math.max.apply(null, graus);
            var enlaces = modelo.tipo === "barramento" ? "1 cabo compartilhado" : modelo.arestas.length + " enlaces físicos";
            var gs = grupos();
            var nCortes = Object.keys(cortes).length;
            var situacao;
            if (gs.length === 1) situacao = el("p", { class: "quiz-ok mb-1" }, "✔ Os " + k + " hosts continuam conversando entre si.");
            else {
                var isolados = gs.filter(function (g) { return g.length === 1; }).length;
                situacao = el("p", { class: "quiz-no mb-1" }, "✘ A rede se dividiu em " + gs.length + " grupos: " + gs.map(function (g) { return "{" + g.join(", ") + "}"; }).join(" ") +
                    (modelo.tipo === "anel" ? " (num anel unidirecional, um enlace cortado para a rede inteira)" : "") + ".");
                if (modelo.tipo === "estrela" && nCortes === 1 && isolados === 1 && gs.length === 2) feitos.um = true;
            }
            if (modelo.tipo === "estrela" && nCortes === 1 && gs.length === k) feitos.todos = true;
            info.replaceChildren(
                el("p", { class: "mb-1" }, el("strong", null, enlaces), " · interfaces por host: " + (gMin === gMax ? gMin : gMin + " a " + gMax)),
                situacao,
                el("p", { class: "text-muted mb-0" }, "Desafio na estrela: " + (feitos.um ? "✔" : "○") + " um corte que isola um único host · " + (feitos.todos ? "✔" : "○") + " um corte que separa todos os hosts."));
            if (feitos.um && feitos.todos) concluir();
        }

        function novo() { cortes = {}; modelo = monta(tipo.value, Number(n.input.value)); atualiza(); }
        tipo.addEventListener("change", novo);
        n.input.addEventListener("input", novo);

        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-6" }, u.campo("Organização física", tipo)),
                el("div", { class: "col-sm-4" }, n.linha),
                el("div", { class: "col-sm-2 mb-2" }, u.botao("Religar tudo", "btn-outline-secondary", novo))),
            desenho, info,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Clique num enlace (ou no nó central da estrela, ou num host intermediário da árvore) para cortá-lo. Desafio (15 pts): na estrela, ache um corte que isole um único host e outro que separe todos (livro, pág. 81–82 do PDF)."));
        novo();
    });

    /* ------------------------------------------------------------------
     * 2. Justiça max-min (Fig. 60)
     * ------------------------------------------------------------------ */
    R.registrar("max-min", function (raiz) {
        var ENLACES = [{ id: "R1-R2", cap: 10 }, { id: "R2-R3", cap: 20 }];
        var FLUXOS = [
            { id: "A1→A2", usa: ["R1-R2"] },
            { id: "B1→B2", usa: ["R1-R2", "R2-R3"] },
            { id: "C1→C2", usa: ["R2-R3"] }
        ];
        var controles = FLUXOS.map(function (f) { return faixa("Fluxo " + f.id + " (Mbit/s)", 0, 20, 1, 0); });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var concluir = R.desafio(raiz, "max-min-alocar", 20, "Encontrar a alocação max-min");
        var temporizador = null;

        var desenho = svg("svg", { viewBox: "0 0 640 150", class: "sim-svg w-100", style: "max-height:170px" },
            svg("title", { text: "Rede da Fig. 60: A1 e B1 ligados a R1; A2 e C1 ligados a R2; B2 e C2 ligados a R3. O enlace R1–R2 tem 10 Mbit/s e o enlace R2–R3, 20 Mbit/s. A1 envia a A2, B1 a B2 e C1 a C2." }));
        var pos = { R1: [180, 60], R2: [340, 60], R3: [500, 60], A1: [70, 40], B1: [70, 120], A2: [290, 130], C1: [390, 130], B2: [580, 130], C2: [580, 30] };
        [["A1", "R1"], ["B1", "R1"], ["A2", "R2"], ["C1", "R2"], ["B2", "R3"], ["C2", "R3"]].forEach(function (p) {
            desenho.appendChild(svg("line", { x1: pos[p[0]][0], y1: pos[p[0]][1], x2: pos[p[1]][0], y2: pos[p[1]][1], class: "linha" }));
        });
        var linhasEnlace = {
            "R1-R2": svg("line", { x1: 180, y1: 60, x2: 340, y2: 60, class: "linha-ativa" }),
            "R2-R3": svg("line", { x1: 340, y1: 60, x2: 500, y2: 60, class: "linha-ativa" })
        };
        desenho.append(linhasEnlace["R1-R2"], linhasEnlace["R2-R3"],
            svg("text", { x: 260, y: 50, "text-anchor": "middle", "font-size": 12 }, "10 Mbit/s"),
            svg("text", { x: 420, y: 50, "text-anchor": "middle", "font-size": 12 }, "20 Mbit/s"));
        Object.keys(pos).forEach(function (k) {
            var roteador = k[0] === "R";
            desenho.append(svg(roteador ? "rect" : "circle", roteador ? { x: pos[k][0] - 20, y: pos[k][1] - 14, width: 40, height: 28, rx: 6, class: "no" } : { cx: pos[k][0], cy: pos[k][1], r: 16, class: "camada" }),
                svg("text", { x: pos[k][0], y: pos[k][1] + 4, "text-anchor": "middle", "font-size": 12 }, k));
        });

        function valores() { return controles.map(function (c) { return Number(c.input.value); }); }
        function cargas(v) {
            var c = {};
            ENLACES.forEach(function (e) { c[e.id] = 0; });
            FLUXOS.forEach(function (f, i) { f.usa.forEach(function (e) { c[e] += v[i]; }); });
            return c;
        }
        function avalia(v) {
            var c = cargas(v);
            var viavel = ENLACES.every(function (e) { return c[e.id] <= e.cap; });
            // Max-min: cada fluxo tem um enlace saturado onde ele é (um dos) maiores.
            var gargalos = FLUXOS.map(function (f, i) {
                return f.usa.filter(function (e) {
                    var cap = ENLACES.filter(function (x) { return x.id === e; })[0].cap;
                    var maior = FLUXOS.every(function (g, j) { return g.usa.indexOf(e) < 0 || v[j] <= v[i]; });
                    return c[e] === cap && maior;
                });
            });
            return { c: c, viavel: viavel, maxmin: viavel && gargalos.every(function (g) { return g.length > 0; }), gargalos: gargalos };
        }

        function render(manual) {
            var v = valores();
            controles.forEach(function (c, i) { c.mostra.textContent = v[i] + " Mbit/s"; });
            var r = avalia(v);
            ENLACES.forEach(function (e) {
                linhasEnlace[e.id].setAttribute("stroke-width", 3 + 6 * Math.min(1, r.c[e.id] / e.cap));
                linhasEnlace[e.id].style.stroke = r.c[e.id] > e.cap ? "var(--bad)" : r.c[e.id] === e.cap ? "var(--warn)" : "";
            });
            var linhas = ENLACES.map(function (e) {
                return el("div", { class: "mb-2" },
                    el("div", { class: "d-flex justify-content-between" }, el("span", null, "Enlace " + e.id),
                        el("span", { class: r.c[e.id] > e.cap ? "quiz-no" : "" }, r.c[e.id] + " de " + e.cap + " Mbit/s" + (r.c[e.id] > e.cap ? " — congestionado" : r.c[e.id] === e.cap ? " — saturado" : ""))),
                    barra(r.c[e.id] / e.cap));
            });
            var veredito;
            if (!r.viavel) veredito = el("p", { class: "quiz-no mb-0" }, "✘ Algum enlace recebe mais do que a capacidade: a alocação não é viável.");
            else if (r.maxmin) veredito = el("p", { class: "quiz-ok mb-0" }, "✔ Alocação max-min justa: nenhum fluxo cresce sem diminuir outro que já tem a mesma banda ou menos.");
            else {
                var livres = FLUXOS.filter(function (f, i) { return r.gargalos[i].length === 0; }).map(function (f) { return f.id; });
                veredito = el("p", { class: "mb-0" }, "Viável, mas não max-min: " + livres.join(", ") + (livres.length > 1 ? " podem" : " pode") + " crescer sem prejudicar um fluxo menor.");
            }
            saida.replaceChildren.apply(saida, linhas.concat([veredito]));
            if (r.maxmin && manual) concluir();
        }
        controles.forEach(function (c) { c.input.addEventListener("input", function () { pararPreenchimento(); render(true); }); });

        function define(v) { pararPreenchimento(); controles.forEach(function (c, i) { c.input.value = v[i]; }); render(false); }
        function pararPreenchimento() { if (temporizador) { clearInterval(temporizador); temporizador = null; } }
        function preencher() {
            pararPreenchimento();
            define([0, 0, 0]);
            var candidatos = [true, true, true];
            function passo() {
                var v = valores();
                var c = cargas(v);
                FLUXOS.forEach(function (f, i) {
                    if (!candidatos[i]) return;
                    var cheio = f.usa.some(function (e) { return c[e] >= ENLACES.filter(function (x) { return x.id === e; })[0].cap; });
                    if (cheio) candidatos[i] = false;
                });
                if (!candidatos.some(Boolean)) { pararPreenchimento(); render(false); return false; }
                controles.forEach(function (ctl, i) { if (candidatos[i]) ctl.input.value = v[i] + 1; });
                // Não deixa nenhum enlace passar da capacidade no mesmo passo.
                var c2 = cargas(valores());
                if (ENLACES.some(function (e) { return c2[e.id] > e.cap; })) controles.forEach(function (ctl, i) { if (candidatos[i]) ctl.input.value = v[i]; });
                render(false);
                return true;
            }
            if (R.reduzMovimento()) { var guarda = 0; while (passo() && guarda++ < 60); return; }
            temporizador = setInterval(function () { if (!passo()) pararPreenchimento(); }, 220);
        }

        raiz.append(desenho,
            el("div", { class: "row g-3" },
                el("div", { class: "col-md-6" }, controles.map(function (c) { return c.linha; }),
                    el("div", { class: "d-flex gap-2 flex-wrap" },
                        u.botao("Igual para todos", "btn-outline-secondary", function () { define([5, 5, 5]); }),
                        u.botao("Injusta", "btn-outline-secondary", function () { define([10, 0, 20]); }),
                        u.botao("Preenchimento progressivo", "btn-outline-primary", preencher))),
                el("div", { class: "col-md-6" }, saida)),
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (20 pts): usando os controles deslizantes, encontre a alocação max-min justa (livro, pág. 83 do PDF)."));
        render(false);
    });

    /* ------------------------------------------------------------------
     * 3. Buffer de R1 absorvendo rajadas (Fig. 61)
     * ------------------------------------------------------------------ */
    function simulaBuffer(rajada, buffer) {
        var fila = [], enlace = null, linhas = [], descartes = 0, atrasos = [];
        var restam = { A: rajada, B: rajada }, cont = { A: 0, B: 0 };
        for (var t = 1; t <= 40; t++) {
            if (enlace) { atrasos.push(t - 1 - enlace.chegada); enlace = null; }
            if (fila.length) enlace = fila.shift();
            var chegadas = [], perdidos = [];
            ["A", "B"].forEach(function (h) {
                if (restam[h] > 0) { restam[h]--; cont[h]++; chegadas.push({ nome: h + cont[h], chegada: t }); }
            });
            chegadas.forEach(function (p) {
                if (!enlace) enlace = p;
                else if (fila.length < buffer) fila.push(p);
                else { perdidos.push(p.nome); descartes++; }
            });
            linhas.push({ t: t, chegadas: chegadas.map(function (p) { return p.nome; }), enlace: enlace ? enlace.nome : "—", fila: fila.map(function (p) { return p.nome; }), perdidos: perdidos });
            if (!enlace && !fila.length && restam.A === 0 && restam.B === 0) break;
        }
        var soma = atrasos.reduce(function (a, b) { return a + b; }, 0);
        return { linhas: linhas, descartes: descartes, atrasoMedio: atrasos.length ? soma / atrasos.length : 0, atrasoMax: atrasos.length ? Math.max.apply(null, atrasos) : 0 };
    }

    R.registrar("buffer-roteador", function (raiz) {
        var rajada = faixa("Rajada de A e de B (pacotes cada)", 1, 6, 1, 3);
        var buffer = faixa("Buffer de R1 (pacotes em espera)", 0, 8, 1, 1);
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var concluir = R.desafio(raiz, "buffer-minimo", 15, "Menor buffer sem descartes");

        function render() {
            var k = Number(rajada.input.value), b = Number(buffer.input.value);
            rajada.mostra.textContent = k; buffer.mostra.textContent = b;
            var r = simulaBuffer(k, b);
            var tabela = el("table", { class: "table table-sm small mb-2" },
                el("thead", null, el("tr", null, el("th", null, "t (s)"), el("th", null, "Chegam a R1"), el("th", null, "Sendo enviado a R2"), el("th", null, "No buffer"), el("th", null, "Descartados"))),
                el("tbody", null, r.linhas.map(function (l) {
                    return el("tr", null, el("td", null, String(l.t)), el("td", { class: "mono" }, l.chegadas.join(" ") || "—"), el("td", { class: "mono" }, l.enlace),
                        el("td", null, el("div", { class: "buffer" }, Array.from({ length: Math.max(b, 1) }, function (_, i) {
                            return el("span", { class: "slot" + (l.fila[i] ? " cheio" : "") }, l.fila[i] || (i < b ? "" : "∅"));
                        }))),
                        el("td", { class: "mono" + (l.perdidos.length ? " quiz-no" : "") }, l.perdidos.join(" ") || "—"));
                })));
            var semPerda = r.descartes === 0;
            var minimo = semPerda && (b === 0 || simulaBuffer(k, b - 1).descartes > 0);
            saida.replaceChildren(
                el("div", { class: "table-responsive" }, tabela),
                el("p", { class: "mb-1 " + (semPerda ? "quiz-ok" : "quiz-no") }, (semPerda ? "✔ Nenhum pacote descartado." : "✘ " + r.descartes + " pacote(s) descartado(s).") +
                    " Atraso médio na fila: " + num(r.atrasoMedio, 1) + " s; máximo: " + r.atrasoMax + " s."),
                minimo ? el("p", { class: "quiz-ok mb-0" }, "✔ Este é o menor buffer que absorve a rajada sem descartes.") : "");
            if (minimo) concluir();
        }
        rajada.input.addEventListener("input", render);
        buffer.input.addEventListener("input", render);

        raiz.append(
            el("p", { class: "small mb-2" }, "Todos os enlaces levam 1 pacote por segundo (1000 bit/s com pacotes de 1000 bits). A e B começam a rajada ao mesmo tempo; R1 só consegue repassar 1 pacote por segundo para R2."),
            el("div", { class: "row g-3" }, el("div", { class: "col-sm-6" }, rajada.linha), el("div", { class: "col-sm-6" }, buffer.linha)),
            saida,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): encontre o menor buffer que não descarta nada para a rajada escolhida (livro, pág. 84 do PDF)."));
        render();
    });

    /* ------------------------------------------------------------------
     * 4. Políticas de descarte: tail drop, drop from front, RED
     * ------------------------------------------------------------------ */
    function chegadasDescarte() {
        // Transferência de arquivo (F) em rajadas e um fluxo interativo (I) esparso.
        var lista = [];
        for (var t = 0; t < 30; t++) {
            var c = [];
            if (t < 16) { c.push("F"); if (t % 2 === 0) c.push("F"); }
            else if (t % 3 === 0) c.push("F");
            if (t % 4 === 2) c.push("I");
            lista.push(c);
        }
        return lista;
    }
    function simulaDescarte(politica, capacidade) {
        var sorteio = u.aleatorio(7);
        var fila = [], media = 0, ocup = [], perdas = { F: 0, I: 0 }, enviados = { F: 0, I: 0 }, linha = [];
        chegadasDescarte().forEach(function (chegam, t) {
            var marcas = [];
            chegam.forEach(function (fluxo) {
                var p = { fluxo: fluxo, t: t };
                if (politica === "red") {
                    var minimo = 2, maximo = capacidade - 1;
                    var prob = media <= minimo ? 0 : media >= maximo ? 1 : (media - minimo) / (maximo - minimo) * 0.6;
                    if (fila.length >= capacidade || sorteio() < prob) { perdas[fluxo]++; marcas.push(fluxo); return; }
                    fila.push(p); return;
                }
                if (fila.length < capacidade) { fila.push(p); return; }
                if (politica === "frente") { var velho = fila.shift(); perdas[velho.fluxo]++; marcas.push(velho.fluxo); fila.push(p); }
                else { perdas[fluxo]++; marcas.push(fluxo); }
            });
            if (fila.length) enviados[fila.shift().fluxo]++;
            media = 0.7 * media + 0.3 * fila.length;
            ocup.push(fila.length);
            linha.push(marcas);
        });
        var soma = ocup.reduce(function (a, b) { return a + b; }, 0);
        return { perdas: perdas, enviados: enviados, ocupMedia: soma / ocup.length, ocup: ocup, marcas: linha };
    }

    R.registrar("politicas-descarte", function (raiz) {
        var capacidade = 5;
        var NOMES = { cauda: "Tail drop", frente: "Drop from front", red: "RED (probabilístico)" };
        var area = el("div", { class: "row g-3" });
        var chegadas = chegadasDescarte();
        var totalF = 0, totalI = 0;
        chegadas.forEach(function (c) { c.forEach(function (f) { if (f === "F") totalF++; else totalI++; }); });

        Object.keys(NOMES).forEach(function (p) {
            var r = simulaDescarte(p, capacidade);
            var colunas = r.ocup.map(function (o, t) {
                var marca = r.marcas[t];
                return el("div", { class: "d-flex flex-column-reverse align-items-center", style: "width:3.2%;height:70px", title: "t=" + t + ": " + o + " na fila" + (marca.length ? "; descartado(s): " + marca.join(", ") : "") },
                    el("div", { style: "width:80%;height:" + (o / capacidade * 52) + "px;background:var(--accent);border-radius:2px" }),
                    marca.length ? el("span", { class: "quiz-no", style: "font-size:.65rem;line-height:1.1" }, marca.join("")) : null);
            });
            area.appendChild(el("div", { class: "col-md-4" },
                el("div", { class: "card-soft p-2 h-100", style: "border:1px solid var(--line);border-radius:8px" },
                    el("p", { class: "fw-semibold small mb-1" }, NOMES[p]),
                    el("div", { class: "d-flex align-items-end", role: "img", "aria-label": "Ocupação da fila ao longo do tempo com " + NOMES[p] }, colunas),
                    el("ul", { class: "small mb-0 mt-2 ps-3" },
                        el("li", null, "Descartes da transferência (F): " + r.perdas.F + " de " + totalF),
                        el("li", { class: r.perdas.I ? "quiz-no" : "" }, "Descartes do fluxo interativo (I): " + r.perdas.I + " de " + totalI),
                        el("li", null, "Ocupação média da fila: " + num(r.ocupMedia, 1) + " de " + capacidade)))));
        });

        raiz.append(
            el("p", { class: "small mb-2" }, "Mesma sequência de chegadas nas três filas (capacidade de 5 pacotes, 1 pacote enviado por instante): uma transferência de arquivo (F) em rajadas e um fluxo interativo (I) com poucos pacotes. As barras mostram a ocupação da fila; as letras acima delas, os pacotes descartados em cada instante."),
            area,
            el("p", { class: "small text-muted mt-2 mb-0" }, "No RED, a média é móvel e o sorteio usa uma semente fixa; os parâmetros foram simplificados para caber numa fila de 5 pacotes."));
    });

    /* ------------------------------------------------------------------
     * 5. Escalonador round-robin (Fig. 63)
     * ------------------------------------------------------------------ */
    R.registrar("round-robin", function (raiz) {
        var TAMANHOS = [500, 1000, 1500];
        var seletores = [0, 1, 2, 3, 4].map(function (i) {
            return el("select", { class: "form-select form-select-sm", "aria-label": "Tamanho dos pacotes do fluxo " + (i + 1) },
                TAMANHOS.map(function (t) { return el("option", { value: t, selected: t === 1000 }, t + " bytes"); }));
        });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var ordem = el("p", { class: "small mono mb-2" });
        var concluir = R.desafio(raiz, "rr-dobro", 15, "Fazer o round-robin favorecer um fluxo");

        function render() {
            var tam = seletores.map(function (s) { return Number(s.value); });
            var bytes = [0, 0, 0, 0, 0], pacotes = [0, 0, 0, 0, 0], tempo = 0, prox = 0, sequencia = [];
            while (tempo < 30000) {               // tempo do enlace medido em bytes transmitidos
                bytes[prox] += tam[prox]; pacotes[prox]++; tempo += tam[prox];
                if (sequencia.length < 15) sequencia.push("F" + (prox + 1));
                prox = (prox + 1) % 5;
            }
            var total = bytes.reduce(function (a, b) { return a + b; }, 0);
            var max = Math.max.apply(null, bytes);
            ordem.textContent = "Ordem de envio: " + sequencia.join(" → ") + " …";
            saida.replaceChildren.apply(saida, bytes.map(function (b, i) {
                return el("div", { class: "mb-2" },
                    el("div", { class: "d-flex justify-content-between" }, el("span", null, "Fluxo " + (i + 1) + " (" + tam[i] + " bytes)"),
                        el("span", null, pacotes[i] + " pacotes · " + num(b / total * 100, 1) + "% da banda")),
                    barra(b / max));
            }));
            if (bytes[0] >= 2 * bytes[1]) concluir();
        }
        seletores.forEach(function (s) { s.addEventListener("change", render); });

        raiz.append(
            el("p", { class: "small mb-2" }, "Cinco filas sempre cheias. A cada oportunidade de transmissão, o escalonador envia o pacote da cabeça da próxima fila, em rodízio."),
            el("div", { class: "row g-2" }, seletores.map(function (s, i) { return el("div", { class: "col-6 col-sm" }, u.campo("Fluxo " + (i + 1), s)); })),
            ordem, saida,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): escolha os tamanhos de modo que o fluxo 1 receba pelo menos o dobro da banda do fluxo 2 (livro, pág. 88 do PDF)."));
        render();
    });

    /* ------------------------------------------------------------------
     * 6. Distribuindo a carga: servidor único × BitTorrent
     * ------------------------------------------------------------------ */
    R.registrar("bittorrent", function (raiz) {
        var BLOCOS = 8, CLIENTES = 5;
        var modo = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "servidor" }, "Só o servidor envia blocos"),
            el("option", { value: "bt" }, "BitTorrent: quem já tem um bloco também envia"));
        var grade = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var resultados = {};
        var concluir = R.desafio(raiz, "bittorrent-comparar", 10, "Comparar servidor único e BitTorrent");
        var tem, rodada;

        function zera() {
            tem = Array.from({ length: CLIENTES }, function () { return Array(BLOCOS).fill(false); });
            rodada = 0;
            desenha();
        }
        function completo() { return tem.every(function (c) { return c.every(Boolean); }); }

        function passo() {
            if (completo()) return false;
            rodada++;
            var recebe = Array(CLIENTES).fill(false);
            // Cada fonte envia no máximo um bloco por rodada; cada cliente recebe no máximo um.
            var fontes = [{ id: "S", blocos: Array(BLOCOS).fill(true) }];
            if (modo.value === "bt") tem.forEach(function (c, i) { fontes.push({ id: i, blocos: c.slice() }); });
            var novos = [];
            fontes.forEach(function (f, k) {
                var melhor = null;
                for (var j = 0; j < CLIENTES; j++) {
                    var c = (j + rodada + k) % CLIENTES;
                    if (recebe[c] || c === f.id) continue;
                    // Bloco mais raro entre os que a fonte tem e o cliente não tem.
                    var cand = [];
                    for (var b = 0; b < BLOCOS; b++) if (f.blocos[b] && !tem[c][b]) cand.push(b);
                    if (!cand.length) continue;
                    cand.sort(function (x, y) {
                        var cx = tem.filter(function (t) { return t[x]; }).length, cy = tem.filter(function (t) { return t[y]; }).length;
                        return cx - cy || x - y;
                    });
                    melhor = [c, cand[0]]; break;
                }
                if (melhor) { recebe[melhor[0]] = true; novos.push(melhor); }
            });
            novos.forEach(function (m) { tem[m[0]][m[1]] = true; });
            desenha();
            if (completo()) {
                resultados[modo.value] = rodada;
                if (resultados.servidor && resultados.bt) concluir();
                desenha();
            }
            return true;
        }

        function desenha() {
            grade.replaceChildren.apply(grade, tem.map(function (c, i) {
                return el("div", { class: "d-flex align-items-center gap-2 mb-1" },
                    el("span", { class: "small", style: "width:4.5rem" }, "Cliente " + (i + 1)),
                    el("div", { class: "buffer" }, c.map(function (x, b) { return el("span", { class: "slot" + (x ? " cheio" : ""), title: "bloco " + (b + 1) }, x ? String(b + 1) : ""); })));
            }));
            var partes = ["Rodada " + rodada + (completo() ? ": todos os clientes têm o arquivo." : ".")];
            if (resultados.servidor) partes.push("Só o servidor: " + resultados.servidor + " rodadas.");
            if (resultados.bt) partes.push("BitTorrent: " + resultados.bt + " rodadas.");
            resumo.textContent = partes.join(" ");
        }

        modo.addEventListener("change", zera);
        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-6" }, u.campo("Como o arquivo é distribuído", modo)),
                el("div", { class: "col-sm-6 mb-2 d-flex gap-2 flex-wrap" },
                    u.botao("Próxima rodada", "btn-primary", passo),
                    u.botao("Até o fim", "btn-outline-primary", function () { var g = 0; while (passo() && g++ < 100); }),
                    u.botao("Recomeçar", "btn-outline-secondary", zera))),
            el("p", { class: "small text-muted mb-1" }, "Arquivo de 8 blocos e 5 clientes. Em cada rodada, cada fonte envia um bloco e cada cliente recebe um."),
            grade, resumo,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): distribua o arquivo inteiro nos dois modos e compare o número de rodadas (livro, pág. 89 do PDF)."));
        zera();
    });

    /* ------------------------------------------------------------------
     * 7. Multiplexação por divisão de tempo (Fig. 64)
     * ------------------------------------------------------------------ */
    R.registrar("tdm", function (raiz) {
        var trafego = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "voz" }, "Quatro conversas telefônicas (taxa constante)"),
            el("option", { value: "dados" }, "Quatro computadores (liga-desliga)"));
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var semente = 3;
        var QUADROS = 8, FONTES = ["A", "B", "C", "D"];

        function render() {
            var sorteio = u.aleatorio(semente);
            var ativo = FONTES.map(function () { return sorteio() < 0.25; });
            var usados = 0, total = 0;
            var quadros = [];
            for (var q = 0; q < QUADROS; q++) {
                var slots = FONTES.map(function (f, i) {
                    if (trafego.value === "dados") {
                        // Períodos ligados e desligados: muda de estado com probabilidade 0,3 por quadro.
                        if (sorteio() < 0.3) ativo[i] = !ativo[i];
                    }
                    var usa = trafego.value === "voz" || ativo[i];
                    total++; if (usa) usados++;
                    return el("span", { class: "slot" + (usa ? " cheio" : ""), title: usa ? "byte da fonte " + f : "intervalo de " + f + " vazio" }, usa ? f : "·");
                });
                quadros.push(el("div", { class: "buffer", style: "border-right:2px solid var(--text);padding-right:4px;margin-right:4px" }, slots));
            }
            area.replaceChildren(el("div", { class: "d-flex flex-wrap", role: "img", "aria-label": "Oito quadros de 125 microssegundos, cada um com uma posição para A, B, C e D." }, quadros),
                el("p", { class: "small text-muted mb-0 mt-1" }, "Cada quadro dura 125 µs; a linha vertical é a fronteira entre quadros. A posição de cada fonte é sempre a mesma."));
            resumo.replaceChildren(
                el("strong", null, "Intervalos usados: " + usados + " de " + total + " (" + num(usados / total * 100) + "%)."),
                " " + (trafego.value === "voz"
                    ? "Conversas de voz enviam um byte a cada 125 µs, e a divisão estática aproveita todos os intervalos."
                    : "Quando um computador está desligado, o intervalo dele fica vazio; quando está ligado, ele só usa 1/4 do enlace, mesmo com os outros calados."));
        }
        trafego.addEventListener("change", render);
        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-8" }, u.campo("Quem compartilha o enlace", trafego)),
                el("div", { class: "col-sm-4 mb-2" }, u.botao("Novo sorteio", "btn-outline-secondary", function () { semente++; render(); }))),
            area, resumo);
        render();
    });

    /* ------------------------------------------------------------------
     * 8. ALOHA e ALOHA com slots
     * ------------------------------------------------------------------ */
    function simulaAloha(G, comSlots, sorteio, duracao) {
        var quadros = [], t = 0;
        while (true) {
            t += -Math.log(1 - sorteio()) / G;
            if (t > duracao) break;
            quadros.push(comSlots ? Math.ceil(t) : t);
        }
        var ok = quadros.map(function (q, i) {
            if (comSlots) return quadros.filter(function (x) { return x === q; }).length === 1;
            return (i === 0 || q - quadros[i - 1] >= 1) && (i === quadros.length - 1 || quadros[i + 1] - q >= 1);
        });
        var sucessos = ok.filter(Boolean).length;
        return { quadros: quadros, ok: ok, S: sucessos / duracao };
    }
    function teoria(G, comSlots) { return comSlots ? G * Math.exp(-G) : G * Math.exp(-2 * G); }

    R.registrar("aloha", function (raiz) {
        var modo = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "puro" }, "ALOHA puro"),
            el("option", { value: "slots" }, "ALOHA com slots (slotted)"));
        var carga = faixa("Carga oferecida G (quadros por tempo de quadro, com retransmissões)", 0.1, 3, 0.1, 1.5);
        var grafico = svg("svg", { viewBox: "0 0 340 200", class: "sim-svg w-100", style: "max-height:240px" });
        var linhaTempo = svg("svg", { viewBox: "0 0 640 70", class: "sim-svg w-100", style: "max-height:90px" });
        var saida = el("div", { class: "small", "aria-live": "polite" });
        var concluir = R.desafio(raiz, "aloha-maximo", 15, "Achar a carga de utilização máxima");
        var feitos = {};
        var semente = 5;

        function px(G) { return 40 + G / 3 * 280; }
        function py(S) { return 170 - S / 0.4 * 150; }

        function desenhaGrafico(G, S, comSlots) {
            grafico.replaceChildren(svg("title", { text: "Utilização S em função da carga G: curva G·e^(−2G) do ALOHA puro, com máximo de 0,184 em G = 0,5, e curva G·e^(−G) do ALOHA com slots, com máximo de 0,368 em G = 1. O ponto marca a carga escolhida." }),
                svg("line", { x1: 40, y1: 170, x2: 325, y2: 170, class: "linha" }), svg("line", { x1: 40, y1: 170, x2: 40, y2: 15, class: "linha" }),
                svg("text", { x: 336, y: 166, "text-anchor": "end", "font-size": 11 }, "G"), svg("text", { x: 8, y: 20, "font-size": 11 }, "S"));
            [0, 1, 2, 3].forEach(function (g) { grafico.appendChild(svg("text", { x: px(g), y: 184, "text-anchor": "middle", "font-size": 10 }, String(g))); });
            [0.1, 0.2, 0.3, 0.4].forEach(function (s) { grafico.appendChild(svg("text", { x: 34, y: py(s) + 4, "text-anchor": "end", "font-size": 10 }, num(s, 1))); });
            [false, true].forEach(function (slots) {
                var pts = [];
                for (var g = 0; g <= 3.001; g += 0.05) pts.push(px(g).toFixed(1) + "," + py(teoria(g, slots)).toFixed(1));
                grafico.appendChild(svg("polyline", { points: pts.join(" "), fill: "none", class: slots === comSlots ? "linha-ativa" : "linha", "stroke-dasharray": slots === comSlots ? null : "5 4" }));
            });
            grafico.append(svg("text", { x: px(1) + 6, y: py(0.368) - 4, "font-size": 10 }, "com slots"), svg("text", { x: px(0.5) + 6, y: py(0.184) - 6, "font-size": 10 }, "puro"),
                svg("circle", { cx: px(G), cy: py(S), r: 5, class: "pacote" }));
        }

        function render() {
            var G = Number(carga.input.value), comSlots = modo.value === "slots";
            carga.mostra.textContent = num(G, 1);
            var r = simulaAloha(G, comSlots, u.aleatorio(semente), 2000);
            var St = teoria(G, comSlots);
            desenhaGrafico(G, St, comSlots);
            // Linha do tempo dos primeiros 12 tempos de quadro.
            linhaTempo.replaceChildren(svg("title", { text: "Primeiros 12 tempos de quadro: quadros transmitidos com sucesso e quadros que colidiram." }),
                svg("line", { x1: 10, y1: 55, x2: 630, y2: 55, class: "linha" }));
            for (var k = 0; k <= 12; k++) linhaTempo.appendChild(svg("line", { x1: 10 + k * 51.6, y1: 50, x2: 10 + k * 51.6, y2: 60, class: "linha", "stroke-dasharray": comSlots ? null : "2 3" }));
            r.quadros.forEach(function (q, i) {
                if (q > 12) return;
                var ini = comSlots ? q - 1 : q;
                var nivel = r.quadros.slice(0, i).filter(function (x) { return Math.abs(x - q) < 1; }).length % 3;
                linhaTempo.appendChild(svg("rect", { x: 10 + ini * 51.6, y: 40 - nivel * 13, width: 51.6, height: 11, rx: 2, style: "fill:" + (r.ok[i] ? "var(--ok)" : "var(--bad)") + ";opacity:.75" }));
            });
            linhaTempo.appendChild(svg("text", { x: 630, y: 69, "text-anchor": "end", "font-size": 10 }, "verde: sucesso · vermelho: colisão"));
            saida.replaceChildren(
                el("p", { class: "mb-1" }, "Utilização medida em 2000 tempos de quadro: ", el("strong", null, num(r.S, 3)), " · teoria: " + num(St, 3) + " · máximo teórico: " + (comSlots ? "1/e ≈ 0,368 (G = 1)" : "1/(2e) ≈ 0,184 (G = 0,5)") + "."),
                el("p", { class: "text-muted mb-0" }, G > (comSlots ? 1 : 0.5) ? "Carga alta: as retransmissões colidem cada vez mais e a utilização cai." : "Carga baixa: quase não há colisões, mas o canal fica ocioso a maior parte do tempo."));
            if (St >= (comSlots ? 0.35 : 0.175)) feitos[modo.value] = true;
            if (feitos.puro && feitos.slots) concluir();
        }
        modo.addEventListener("change", render);
        carga.input.addEventListener("input", render);

        raiz.append(
            el("div", { class: "row g-3" },
                el("div", { class: "col-md-5" }, u.campo("Variante", modo), carga.linha, u.botao("Novo sorteio", "btn-outline-secondary", function () { semente++; render(); }), el("div", { class: "mt-2" }, saida)),
                el("div", { class: "col-md-7" }, grafico)),
            linhaTempo,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Chegadas aleatórias (Poisson) e quadros de tamanho fixo. Desafio (15 pts): ajuste G para chegar perto da utilização máxima no ALOHA puro e no ALOHA com slots (livro, pág. 92–93 do PDF)."));
        render();
    });

    /* ------------------------------------------------------------------
     * 9. CSMA/CD: diagrama espaço-tempo e backoff exponencial binário
     * ------------------------------------------------------------------ */
    R.registrar("csma-cd", function (raiz) {
        var inicioB = faixa("B começa a transmitir em (fração de τ)", 0, 0.95, 0.05, 0.6);
        var duracao = faixa("Duração do quadro (em τ)", 0.25, 3, 0.25, 1);
        var desenho = svg("svg", { viewBox: "0 0 640 300", class: "sim-svg w-100", style: "max-height:330px" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var fb = u.feedback();
        var log = el("ul", { class: "log mt-2" });
        var concluir = R.desafio(raiz, "csmacd-quadro-minimo", 15, "Achar o tamanho mínimo de quadro");

        var X0 = 90, X1 = 550, Y0 = 40, ESC = 70;      // ESC: pixels por τ
        function y(t) { return Y0 + t * ESC; }
        function faixaSinal(xIni, t0, t1, classe) {
            // O sinal emitido entre t0 e t1 em xIni ocupa uma faixa inclinada no diagrama espaço-tempo.
            var xFim = xIni === X0 ? X1 : X0;
            return svg("polygon", { points: [xIni, y(t0), xFim, y(t0 + 1), xFim, y(t1 + 1), xIni, y(t1)].join(" "), style: "fill:" + classe + ";opacity:.28" });
        }

        function render() {
            var d = Number(inicioB.input.value), D = Number(duracao.input.value);
            inicioB.mostra.textContent = num(d, 2) + " τ"; duracao.mostra.textContent = num(D, 2) + " τ";
            var fimA = D, fimB = d + D;
            var bDetecta = fimB > 1;                 // o primeiro bit de A chega a B em τ
            var aDetecta = fimA > d + 1;             // o primeiro bit de B chega a A em d + τ
            if (bDetecta) fimB = 1;
            if (aDetecta) fimA = d + 1;
            desenho.replaceChildren(svg("title", { text: "Diagrama espaço-tempo de um barramento: A à esquerda, B à direita, o tempo cresce para baixo. Faixas inclinadas mostram o sinal de cada host se propagando; onde as faixas se cruzam, há colisão." }),
                svg("line", { x1: X0, y1: 28, x2: X0, y2: 290, class: "seq-lane" }), svg("line", { x1: X1, y1: 28, x2: X1, y2: 290, class: "seq-lane" }),
                svg("text", { x: X0, y: 20, "text-anchor": "middle", class: "seq-col" }, "A"), svg("text", { x: X1, y: 20, "text-anchor": "middle", class: "seq-col" }, "B"),
                faixaSinal(X0, 0, fimA, "var(--accent)"), faixaSinal(X1, d, fimB, "var(--warn)"));
            [0, 1, 2, 3].forEach(function (k) { desenho.appendChild(svg("text", { x: X0 - 10, y: y(k) + 4, "text-anchor": "end", "font-size": 11 }, k === 0 ? "0" : k + "τ")); });
            function marca(x, t, texto, ok) {
                desenho.append(svg("circle", { cx: x, cy: y(t), r: 5, style: "fill:" + (ok ? "var(--bad)" : "var(--muted)") }),
                    svg("text", { x: x + (x === X0 ? 10 : -10), y: y(t) + 4, "text-anchor": x === X0 ? "start" : "end", "font-size": 11 }, texto));
            }
            if (bDetecta) marca(X1, 1, "B detecta e para (τ)", true);
            else marca(X1, d + D, "B termina sem perceber", false);
            if (aDetecta) marca(X0, d + 1, "A detecta e para (" + num(d + 1, 2) + "τ)", true);
            else marca(X0, D, "A termina sem perceber", false);

            saida.replaceChildren(
                el("p", { class: "mb-1" }, "A começa em 0; B começa em " + num(d, 2) + "τ, antes de o sinal de A chegar até ele. O primeiro bit de B chega a A em " + num(d + 1, 2) + "τ."),
                el("p", { class: "mb-0 " + (aDetecta ? "quiz-ok" : "quiz-no") }, aDetecta
                    ? "✔ A ainda está transmitindo quando o sinal de B chega: detecta a colisão e retransmite depois."
                    : "✘ A terminou o quadro antes de o sinal de B chegar: acha que o quadro foi entregue (o problema do quadro curto, Fig. 68)."));
        }
        inicioB.input.addEventListener("input", render);
        duracao.input.addEventListener("input", render);

        function conferir() {
            var D = Number(duracao.input.value);
            // Pior caso: B começa um instante antes de τ, e A só detecta perto de 2τ.
            if (D === 2) { u.marca(fb, true, "2τ é o menor quadro que garante a detecção para qualquer início de B: é o slot time."); concluir(); }
            else if (D > 2) u.marca(fb, false, "Funciona, mas não é o menor: dá para diminuir sem perder a garantia.");
            else u.marca(fb, false, "Ponha B para começar perto de τ (0,95τ): A ainda detecta a colisão?");
        }

        function backoff() {
            var sorteio = Math.random;
            log.replaceChildren();
            for (var N = 1; N <= 16; N++) {
                var k = Math.min(10, N), lim = Math.pow(2, k) - 1;
                var ra = Math.floor(sorteio() * (lim + 1)), rb = Math.floor(sorteio() * (lim + 1));
                var ok = ra !== rb;
                log.appendChild(el("li", { class: ok ? "quiz-ok" : "" }, "colisão " + N + ": sorteio entre 0 e " + lim + " slots → A espera " + ra + ", B espera " + rb +
                    (ok ? " → " + (ra < rb ? "A" : "B") + " transmite primeiro, sem nova colisão" : " → empate, nova colisão")));
                if (ok) break;
            }
        }

        raiz.append(
            el("div", { class: "row g-3" }, el("div", { class: "col-sm-6" }, inicioB.linha), el("div", { class: "col-sm-6" }, duracao.linha)),
            desenho, saida,
            el("div", { class: "d-flex gap-2 flex-wrap mt-2" }, u.botao("Conferir: menor quadro seguro", "btn-primary", conferir)), fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "τ é o tempo de propagação de uma ponta à outra do cabo. Desafio (15 pts): escolha a menor duração de quadro que garante que A detecte a colisão, seja qual for o instante em que B começa (livro, pág. 95–96 do PDF)."),
            el("hr"),
            el("p", { class: "small fw-semibold mb-1" }, "Backoff exponencial binário com dois hosts"),
            u.botao("Simular uma disputa", "btn-outline-primary", backoff), log);
        render();
        backoff();
    });

    /* ------------------------------------------------------------------
     * 10. CSMA/CA: estação escondida e RTS/CTS (Fig. 72–73)
     * ------------------------------------------------------------------ */
    R.registrar("estacao-escondida", function (raiz) {
        var rts = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("rts") });
        var area = el("div", { class: "mt-2" });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var viuColisao = false;
        var concluir = R.desafio(raiz, "rts-cts", 10, "Resolver a estação escondida");

        var cena = svg("svg", { viewBox: "0 0 640 110", class: "sim-svg w-100", style: "max-height:130px" },
            svg("title", { text: "A e C ficam dos dois lados de uma parede e não se ouvem; os dois alcançam B, que está no meio." }),
            svg("circle", { cx: 300, cy: 60, r: 150, fill: "none", class: "linha", "stroke-dasharray": "4 4" }),
            svg("circle", { cx: 340, cy: 60, r: 150, fill: "none", class: "linha", "stroke-dasharray": "4 4" }),
            svg("rect", { x: 316, y: 5, width: 8, height: 40, class: "camada" }),
            svg("text", { x: 320, y: 100, "text-anchor": "middle", "font-size": 11 }, "parede"));
        [["A", 160], ["B", 320], ["C", 480]].forEach(function (p) {
            cena.append(svg("circle", { cx: p[1], cy: 60, r: 18, class: "no" }), svg("text", { x: p[1], y: 64, "text-anchor": "middle", "font-size": 13 }, p[0]));
        });

        function rodar() {
            var eventos, ok;
            if (!rts.checked) {
                eventos = [
                    { nota: 0, t: 0, rotulo: "canal livre (DIFS)" },
                    { de: 0, para: 1, t0: 1, t1: 4, rotulo: "DATA de A", tipo: "erro" },
                    { nota: 2, t: 1.6, rotulo: "C não ouve A: canal livre" },
                    { de: 2, para: 1, t0: 2.5, t1: 5, rotulo: "DATA de C", tipo: "erro" },
                    { nota: 1, t: 5.2, rotulo: "colisão em B: nada é confirmado" }
                ];
                ok = false; viuColisao = true;
            } else {
                eventos = [
                    { de: 0, para: 1, t0: 0.5, t1: 1.5, rotulo: "RTS (duração)", tipo: "ctrl" },
                    { de: 1, para: 0, t0: 2, t1: 3, rotulo: "CTS (duração)", tipo: "ctrl" },
                    { de: 1, para: 2, t0: 2, t1: 3, rotulo: "CTS (duração)", tipo: "ctrl" },
                    { nota: 2, t: 3.3, rotulo: "C adia até o fim da reserva" },
                    { de: 0, para: 1, t0: 3.5, t1: 6, rotulo: "DATA de A", tipo: "ok" },
                    { de: 1, para: 0, t0: 6.5, t1: 7.5, rotulo: "ACK", tipo: "ok" },
                    { de: 2, para: 1, t0: 8, t1: 9, rotulo: "RTS de C", tipo: "ctrl" }
                ];
                ok = true;
            }
            area.replaceChildren(R.diagramaSequencia({
                titulo: ok ? "Com RTS/CTS: o CTS de B avisa C, que adia sua transmissão; A envia o quadro e recebe o ACK." : "Sem RTS/CTS: A e C transmitem ao mesmo tempo e os quadros colidem em B.",
                colunas: ["A", "B", "C"], eventos: eventos, passo: 30, margem: 110
            }));
            if (ok) {
                u.marca(saida, true, "O CTS foi ouvido por C, que conhece a duração da reserva e espera. O quadro de A chega inteiro.");
                if (viuColisao) concluir();
            } else u.marca(saida, false, "A e C sentiram o canal livre, mas não se ouvem: os quadros colidem em B e nenhum dos dois sabe disso até o timeout do ACK.");
        }
        rts.addEventListener("change", rodar);

        raiz.append(cena,
            el("div", { class: "form-check" }, rts, el("label", { class: "form-check-label small", for: rts.id }, "Usar reserva RTS/CTS")),
            area, saida,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): veja a colisão sem reserva e depois resolva o problema com RTS/CTS (livro, pág. 101 do PDF)."));
        rodar();
    });

    /* ------------------------------------------------------------------
     * 11. Token Ring com Monitor (Fig. 74)
     * ------------------------------------------------------------------ */
    R.registrar("token-ring", function (raiz) {
        var N = 5, MONITOR = 2;          // S3 é o Monitor, como no exemplo do livro
        var desenho = svg("svg", { viewBox: "0 0 640 260", class: "sim-svg w-100", style: "max-height:290px" });
        var log = el("ul", { class: "log mt-2", "aria-live": "polite" });
        var estado = el("p", { class: "small mt-2 mb-0" });
        var origem = el("select", { class: "form-select form-select-sm" }, Array.from({ length: N }, function (_, i) { return el("option", { value: i }, "S" + (i + 1)); }));
        var concluir = R.desafio(raiz, "token-monitor", 15, "Entregar quadros e recuperar o token");
        var st;

        function zera() {
            st = { modo: "token", pos: 0, filas: Array(N).fill(0), ligada: Array(N).fill(true), quadro: null, semToken: 0, entregues: 0, recuperacoes: 0 };
            log.replaceChildren();
            registra("S1 envia o primeiro token.");
            desenha();
        }
        function registra(t) { log.insertBefore(el("li", null, t), log.firstChild); while (log.children.length > 10) log.removeChild(log.lastChild); }
        function ponto(i) { var a = -Math.PI / 2 + i * 2 * Math.PI / N; return [320 + 105 * Math.cos(a), 130 + 105 * Math.sin(a)]; }

        function desenha() {
            desenho.replaceChildren(svg("title", { text: "Anel unidirecional com cinco estações, S1 a S5, girando no sentido horário. S3 é o Monitor. Um círculo amarelo marca o token; um retângulo marca um quadro de dados." }),
                svg("circle", { cx: 320, cy: 130, r: 105, fill: "none", class: "linha-ativa" }));
            for (var i = 0; i < N; i++) {
                var p = ponto(i);
                desenho.append(svg("circle", { cx: p[0], cy: p[1], r: 22, class: st.ligada[i] ? (i === MONITOR ? "no no-ativo" : "no") : "camada" }),
                    svg("text", { x: p[0], y: p[1] + 4, "text-anchor": "middle", "font-size": 12 }, "S" + (i + 1)),
                    svg("text", { x: p[0] + (p[0] >= 320 ? 30 : -30), y: p[1] + 4, "text-anchor": p[0] >= 320 ? "start" : "end", "font-size": 11 },
                        (i === MONITOR ? "Monitor · " : "") + (st.ligada[i] ? st.filas[i] + " na fila" : "desligada")));
            }
            if (st.modo === "token") {
                var q = ponto(st.pos);
                desenho.appendChild(svg("circle", { cx: q[0] + (320 - q[0]) * 0.32, cy: q[1] + (130 - q[1]) * 0.32, r: 9, class: "pacote" }));
            } else if (st.modo === "quadro") {
                var f = ponto(st.quadro.pos);
                var fx = f[0] + (320 - f[0]) * 0.32, fy = f[1] + (130 - f[1]) * 0.32;
                desenho.append(svg("rect", { x: fx - 26, y: fy - 9, width: 52, height: 18, rx: 3, class: "pacote-resp" }),
                    svg("text", { x: fx, y: fy + 4, "text-anchor": "middle", "font-size": 10 }, "S" + (st.quadro.de + 1) + "→S" + (st.quadro.para + 1)));
            }
            desenho.appendChild(svg("text", { x: 320, y: 134, "text-anchor": "middle", "font-size": 11 }, st.modo === "nada" ? "sem token no anel" : "sentido horário"));
            estado.textContent = "Quadros entregues: " + st.entregues + " · recuperações pelo Monitor: " + st.recuperacoes + ".";
            if (st.entregues >= 2 && st.recuperacoes >= 1) concluir();
        }

        function passo() {
            if (st.modo === "token") {
                st.pos = (st.pos + 1) % N;
                if (st.pos === MONITOR) st.semToken = 0;
                if (st.ligada[st.pos] && st.filas[st.pos] > 0) {
                    st.filas[st.pos]--;
                    var destino = (st.pos + 2) % N;
                    st.modo = "quadro";
                    st.quadro = { de: st.pos, para: destino, pos: st.pos };
                    registra("S" + (st.pos + 1) + " captura o token (zera o bit Token) e envia um quadro para S" + (destino + 1) + ".");
                }
            } else if (st.modo === "quadro") {
                st.quadro.pos = (st.quadro.pos + 1) % N;
                if (st.quadro.pos === st.quadro.para) registra("S" + (st.quadro.para + 1) + " reconhece o seu endereço e copia o quadro.");
                if (st.quadro.pos === st.quadro.de) {
                    st.entregues++;
                    registra("O quadro volta a S" + (st.quadro.de + 1) + ", que o retira do anel e libera o token.");
                    st.modo = "token"; st.pos = st.quadro.de; st.quadro = null;
                }
                st.semToken++;
            } else {
                st.semToken++;
                if (st.ligada[MONITOR] && st.semToken > 2 * N) {
                    st.recuperacoes++;
                    registra("O Monitor (S3) não vê o token há " + st.semToken + " passos: reinicializa o anel e envia um token novo.");
                    st.modo = "token"; st.pos = MONITOR; st.semToken = 0;
                }
            }
            desenha();
        }

        function perdeToken() {
            if (st.modo !== "token") { registra("Espere o token estar circulando para desligar a estação que o captura."); return; }
            var alvo = (st.pos + 1) % N;
            if (alvo === MONITOR) alvo = (alvo + 1) % N;
            st.ligada[alvo] = false;
            st.filas[alvo] = 0;
            st.modo = "nada"; st.semToken = 0;
            registra("S" + (alvo + 1) + " captura o token e é desligada antes de devolvê-lo: o token some do anel.");
            // A interface de uma estação desligada continua repassando os bits do anel; só não captura o token.
            desenha();
        }

        raiz.append(desenho,
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-3" }, u.campo("Estação", origem)),
                el("div", { class: "col-sm-9 mb-2 d-flex gap-2 flex-wrap" },
                    u.botao("Dar um quadro à estação", "btn-outline-primary", function () { st.filas[Number(origem.value)]++; desenha(); }),
                    u.botao("Passo", "btn-primary", passo),
                    u.botao("10 passos", "btn-outline-primary", function () { for (var i = 0; i < 10; i++) passo(); }),
                    u.botao("Perder o token", "btn-outline-danger", perdeToken),
                    u.botao("Recomeçar", "btn-outline-secondary", zera))),
            estado, log,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Cada passo leva o token (ou o quadro) à estação seguinte. Desafio (15 pts): entregue dois quadros e depois faça o token se perder para ver o Monitor agir (livro, pág. 102–104 do PDF)."));
        zera();
    });

    /* ------------------------------------------------------------------
     * 12a. Plano de alocações: AIMD × AIAD (Fig. 81–82)
     * ------------------------------------------------------------------ */
    R.registrar("aimd-plano", function (raiz) {
        var CAP = 2, ALFA = 0.1, BETA = 0.5, DEC_AD = 0.3;
        var alg = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "aimd" }, "AIMD: soma 0,1 / multiplica por 0,5"),
            el("option", { value: "aiad" }, "AIAD: soma 0,1 / subtrai 0,3"));
        var desenho = svg("svg", { viewBox: "0 0 300 300", class: "sim-svg w-100", style: "max-height:320px" });
        var saida = el("div", { class: "small", "aria-live": "polite" });
        var concluir = R.desafio(raiz, "aimd-justo", 15, "Levar o AIMD até a reta de justiça");
        var ponto, caminho;

        function p(x, y) { return [40 + x / 2.5 * 240, 260 - y / 2.5 * 240]; }
        function zera() { ponto = { b: 1.6, a: 0.1 }; caminho = [[ponto.b, ponto.a]]; desenha(); }

        function desenha() {
            var o = p(0, 0), fx = p(2.5, 0), fy = p(0, 2.5);
            desenho.replaceChildren(svg("title", { text: "Plano de alocações: eixo x é a taxa de B e eixo y a taxa de A, de 0 a 2,5 Mbit/s. A reta de eficiência liga (2, 0) a (0, 2); a reta de justiça é a diagonal x = y. O caminho mostra a evolução das taxas." }),
                svg("line", { x1: o[0], y1: o[1], x2: fx[0], y2: fx[1], class: "linha" }), svg("line", { x1: o[0], y1: o[1], x2: fy[0], y2: fy[1], class: "linha" }),
                svg("text", { x: 285, y: 282, "text-anchor": "end", "font-size": 11 }, "taxa de B"), svg("text", { x: 8, y: 14, "font-size": 11 }, "taxa de A"));
            var e1 = p(2, 0), e2 = p(0, 2), j1 = p(0, 0), j2 = p(2.4, 2.4);
            desenho.append(svg("line", { x1: e1[0], y1: e1[1], x2: e2[0], y2: e2[1], class: "linha-ativa" }),
                svg("line", { x1: j1[0], y1: j1[1], x2: j2[0], y2: j2[1], class: "linha", "stroke-dasharray": "6 4" }),
                svg("text", { x: p(0.3, 1.75)[0], y: p(0.3, 1.75)[1], "text-anchor": "start", "font-size": 10 }, "eficiência (x + y = 2)"),
                svg("text", { x: j2[0] - 8, y: j2[1] - 2, "text-anchor": "end", "font-size": 10 }, "justiça (x = y)"));
            [0, 1, 2].forEach(function (k) {
                var q = p(k, 0), r = p(0, k);
                desenho.append(svg("text", { x: q[0], y: q[1] + 14, "text-anchor": "middle", "font-size": 10 }, String(k)), svg("text", { x: r[0] - 6, y: r[1] + 4, "text-anchor": "end", "font-size": 10 }, String(k)));
            });
            desenho.appendChild(svg("polyline", { points: caminho.map(function (c) { return p(c[0], c[1]).join(","); }).join(" "), fill: "none", style: "stroke:var(--warn);stroke-width:1.5" }));
            var atual = p(ponto.b, ponto.a);
            desenho.appendChild(svg("circle", { cx: atual[0], cy: atual[1], r: 5, class: "pacote" }));
            var dif = Math.abs(ponto.a - ponto.b);
            saida.replaceChildren(
                el("p", { class: "mb-1" }, "Taxa de A: " + num(ponto.a, 2) + " · taxa de B: " + num(ponto.b, 2) + " · soma: " + num(ponto.a + ponto.b, 2) + " de " + CAP + " Mbit/s."),
                el("p", { class: "mb-1" }, "Diferença entre as taxas: " + num(dif, 2) + " Mbit/s · passos: " + (caminho.length - 1) + "."),
                el("p", { class: "text-muted mb-0" }, alg.value === "aimd"
                    ? "A redução multiplicativa diminui mais quem tem mais; a diferença encolhe a cada congestionamento."
                    : "Somar e subtrair o mesmo valor dos dois mantém a diferença: o caminho anda paralelo à reta de justiça."));
            if (alg.value === "aimd" && caminho.length > 5 && dif <= 0.1) concluir();
        }

        function passo() {
            var congestionado = ponto.a + ponto.b > CAP;
            if (congestionado) {
                if (alg.value === "aimd") { ponto.a *= BETA; ponto.b *= BETA; }
                else { ponto.a = Math.max(0, ponto.a - DEC_AD); ponto.b = Math.max(0, ponto.b - DEC_AD); }
            } else { ponto.a += ALFA; ponto.b += ALFA; }
            caminho.push([ponto.b, ponto.a]);
            if (caminho.length > 400) caminho.shift();
        }

        alg.addEventListener("change", zera);
        raiz.append(
            el("div", { class: "row g-3" },
                el("div", { class: "col-md-6" }, desenho),
                el("div", { class: "col-md-6" }, u.campo("Algoritmo de adaptação", alg),
                    el("div", { class: "d-flex gap-2 flex-wrap mb-2" },
                        u.botao("1 passo", "btn-outline-primary", function () { passo(); desenha(); }),
                        u.botao("20 passos", "btn-primary", function () { for (var i = 0; i < 20; i++) passo(); desenha(); }),
                        u.botao("Recomeçar", "btn-outline-secondary", zera)),
                    saida)),
            el("p", { class: "small text-muted mt-2 mb-0" }, "Os dois hosts partem de uma alocação injusta (B com 1,6 e A com 0,1 Mbit/s) e recebem a mesma realimentação binária: congestionado se a soma passa de 2 Mbit/s. Desafio (15 pts): com AIMD, chegue a uma diferença de no máximo 0,1 Mbit/s entre as taxas (livro, pág. 107–108 do PDF)."));
        zera();
    });

    /* ------------------------------------------------------------------
     * 12b. Janela de congestionamento com realimentação binária (DECbit)
     * ------------------------------------------------------------------ */
    R.registrar("janela-aimd", function (raiz) {
        var cap = faixa("Segmentos por RTT que o gargalo absorve sem formar fila", 2, 8, 1, 2);
        var grafico = svg("svg", { viewBox: "0 0 640 220", class: "sim-svg w-100", style: "max-height:250px" });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });

        function render() {
            var c = Number(cap.input.value);
            cap.mostra.textContent = c;
            var cwin = 1, serie = [], marcas = [];
            for (var r = 0; r < 30; r++) {
                serie.push(cwin);
                var marcado = Math.floor(cwin) > c;    // há fila em R1: o roteador marca o bit de congestionamento
                marcas.push(marcado);
                cwin = marcado ? Math.max(1, cwin / 2) : cwin + 1;
            }
            var maxY = Math.max(10, Math.max.apply(null, serie) + 1);
            function x(i) { return 50 + i * 19; }
            function y(v) { return 190 - v / maxY * 170; }
            grafico.replaceChildren(svg("title", { text: "Janela de congestionamento ao longo de 30 RTTs: cresce um segmento por RTT e cai pela metade quando os pacotes voltam marcados; a linha tracejada é a capacidade do gargalo." }),
                svg("line", { x1: 50, y1: 190, x2: 620, y2: 190, class: "linha" }), svg("line", { x1: 50, y1: 190, x2: 50, y2: 15, class: "linha" }),
                svg("line", { x1: 50, y1: y(c), x2: 620, y2: y(c), class: "linha", "stroke-dasharray": "6 4" }),
                svg("text", { x: 618, y: y(c) - 5, "text-anchor": "end", "font-size": 10 }, "capacidade do gargalo"),
                svg("text", { x: 620, y: 210, "text-anchor": "end", "font-size": 11 }, "RTT"), svg("text", { x: 8, y: 14, "font-size": 11 }, "cwin"));
            for (var t = 0; t <= maxY; t += 2) grafico.appendChild(svg("text", { x: 44, y: y(t) + 4, "text-anchor": "end", "font-size": 10 }, String(t)));
            grafico.appendChild(svg("polyline", { points: serie.map(function (v, i) { return x(i) + "," + y(v); }).join(" "), fill: "none", class: "linha-ativa" }));
            serie.forEach(function (v, i) {
                grafico.appendChild(svg("circle", { cx: x(i), cy: y(v), r: 3.5, style: "fill:" + (marcas[i] ? "var(--bad)" : "var(--accent)") }));
            });
            var uso = serie.reduce(function (a, v) { return a + Math.min(Math.floor(v), c); }, 0) / (serie.length * c);
            saida.textContent = "Pontos vermelhos: RTTs com pacotes marcados (havia fila em R1). Uso médio do gargalo: " + num(uso * 100) + "%. Com a janela acima da capacidade, a vazão não aumenta: os pacotes extras só esperam no buffer.";
        }
        cap.input.addEventListener("input", render);
        raiz.append(cap.linha, grafico, saida);
        render();
    });
}());
