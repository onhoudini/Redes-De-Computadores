/* Simulações do Capítulo 32 — Prática: compartilhamento de recursos (seção 4.6 do livro, pág. 294–312 do PDF).
 * Os instantes dos pedidos de transmissão foram lidos das figuras das págs. 298–306. */
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
    function numero(rotulo) { return el("input", { type: "text", inputmode: "decimal", class: "form-control form-control-sm", "aria-label": rotulo, autocomplete: "off" }); }
    function valor(i) { return Number(String(i.value).replace(",", ".").trim()); }
    function br(x) { return String(Math.round(x * 100) / 100).replace(".", ","); }

    /* ------------------------------------------------------------------
     * Motor espaço-tempo de um cabo compartilhado (unidades de 0,25 µs)
     * A fica em 0, C no meio e B na outra ponta; o sinal anda 5 µs por km (pág. 294).
     * ------------------------------------------------------------------ */
    var U = 4;
    function simulaCabo(c) {
        var pos = { A: 0, C: c.L / 2, B: c.L };
        function atraso(a, b) { return Math.round(Math.abs(pos[a] - pos[b]) * 5 * U); }
        function dur(bits) { return Math.round(bits / c.mbps * U); }
        var pend = { A: [], B: [], C: [] }, tx = [], atual = { A: null, B: null, C: null }, aguardando = {}, eventos = [];
        c.quadros.forEach(function (q, i) { pend[q[0]].push({ id: i, h: q[0], t: Math.round(q[1] * U), bits: q[2], dest: q[3] || null, col: 0, tipo: "dado" }); });
        var fim = Math.round((c.fim || 400) * U);
        function sinal(x, t, menos) {
            for (var k = 0; k < tx.length; k++) {
                var o = tx[k];
                if (o === menos || o.h === x) continue;
                var d = atraso(o.h, x);
                if (o.ini + d <= t && t < o.fim + d) return true;
            }
            return false;
        }
        function recebido(o, x) {
            var d = atraso(o.h, x), a = o.ini + d, b = o.fim + d;
            for (var k = 0; k < tx.length; k++) {
                var p = tx[k];
                if (p === o) continue;
                var dp = p.h === x ? 0 : atraso(p.h, x);
                if (p.ini + dp < b && a < p.fim + dp) return false;
            }
            return true;
        }
        for (var t = 0; t < fim; t++) {
            ["A", "C", "B"].forEach(function (h) {
                var o = atual[h];
                if (!o) return;
                if (c.proto === "csmacd" && t > o.ini && sinal(h, t, o)) {
                    o.fim = t; o.abortada = true; atual[h] = null; o.q.col++;
                    eventos.push([t / U, h + " detecta a colisão e para de transmitir"]);
                    if (c.recuo) { var q = o.q, k = c.recuo(h, q.col); q.t = t + k * c.slot * U; pend[h].unshift(q); eventos.push([t / U, h + " espera " + k + " slot(s) de " + c.slot + " µs"]); }
                    return;
                }
                if (t >= o.fim) {
                    atual[h] = null;
                    if (o.tipo === "dado" && c.acks && o.q.dest) { aguardando[o.q.id] = o; if (c.timer) o.q.timeout = o.fim + Math.round(c.timer * U); }
                }
            });
            if (c.acks) {
                tx.forEach(function (o) {
                    if (o.tipo !== "dado" || !o.q.dest || o.ackado || o.abortada) return;
                    if (t === o.fim + atraso(o.h, o.q.dest)) {
                        o.ackado = true;
                        if (recebido(o, o.q.dest)) pend[o.q.dest].unshift({ id: "ack" + o.q.id, h: o.q.dest, t: t, bits: c.ackBits || 100, dest: o.h, tipo: "ack", de: o.q.id, col: 0 });
                        else eventos.push([t / U, o.q.dest + " recebe o quadro de " + o.h + " corrompido e não confirma"]);
                    }
                });
                tx.forEach(function (o) {
                    if (o.tipo !== "ack" || o.visto) return;
                    if (t === o.fim + atraso(o.h, o.q.dest)) { o.visto = true; if (recebido(o, o.q.dest)) delete aguardando[o.q.de]; else eventos.push([t / U, "a confirmação para " + o.q.dest + " chega corrompida"]); }
                });
                if (c.timer) Object.keys(aguardando).forEach(function (id) {
                    var o = aguardando[id];
                    if (t === o.q.timeout) {
                        delete aguardando[id];
                        var q2 = { id: o.q.id, h: o.h, t: t, bits: o.q.bits, dest: o.q.dest, col: 0, tipo: "dado", retx: (o.q.retx || 0) + 1 };
                        pend[o.h].push(q2); eventos.push([t / U, o.h + ": o temporizador expirou, retransmite"]);
                    }
                });
            }
            ["A", "C", "B"].forEach(function (h) {
                if (atual[h] || !pend[h].length) return;
                var q = pend[h][0];
                if (q.t > t) return;
                if ((c.proto === "csma" || c.proto === "csmacd") && q.tipo === "dado" && sinal(h, t)) return;
                pend[h].shift();
                var o = { h: h, ini: t, fim: t + dur(q.bits), q: q, tipo: q.tipo };
                tx.push(o); atual[h] = o;
            });
        }
        // colisões: dois sinais ocupando o mesmo ponto do cabo ao mesmo tempo
        var pares = [];
        for (var i = 0; i < tx.length; i++) for (var j = i + 1; j < tx.length; j++) {
            for (var k = 0; k <= 200; k++) {
                var x = c.L * k / 200, a = tx[i], b = tx[j];
                var da = Math.round(Math.abs(x - pos[a.h]) * 5 * U), db = Math.round(Math.abs(x - pos[b.h]) * 5 * U);
                if (a.ini + da < b.fim + db && b.ini + db < a.fim + da) { pares.push([i, j]); break; }
            }
        }
        return { tx: tx.map(function (o) { return { h: o.h, ini: o.ini / U, fim: o.fim / U, tipo: o.tipo, dest: o.q.dest, abortada: !!o.abortada, retx: o.q.retx || 0 }; }), pares: pares, eventos: eventos };
    }
    R.simulaCabo = simulaCabo;

    function recuoQ9(h, k) { return h === "A" ? Math.pow(2, Math.min(k, 10)) - 1 : 0; }
    var CENARIOS = {
        g1: { nome: "Pág. 294–295: A manda 2000 bits a 100 Mbps num cabo de 1 km", L: 1, mbps: 100, proto: "aloha", quadros: [["A", 0, 2000]], fim: 40, quad: 2.5 },
        g2: { nome: "Pág. 295–296: C, no meio, manda 100 bits", L: 1, mbps: 100, proto: "aloha", quadros: [["C", 0, 100]], fim: 12, quad: 2.5 },
        g3: { nome: "Exemplo: A e B transmitem quase juntos", L: 1, mbps: 100, proto: "aloha", quadros: [["A", 0, 2000], ["B", 3, 2000]], fim: 40, quad: 2.5 },
        q1: { nome: "Q1: ALOHA, 1 km, 1 Mbps, quadros de 1000 bits", L: 1, mbps: 1, proto: "aloha", quadros: [["A", 0, 1000], ["B", 1000, 1000], ["C", 1500, 1000], ["B", 3500, 1000]], fim: 5000, quad: 250 },
        q2: { nome: "Q2: ALOHA, 2 km, 100 Mbps (Fig. 5)", L: 2, mbps: 100, proto: "aloha", quadros: [["A", 0, 1000], ["B", 20, 1000], ["C", 60, 1000], ["B", 60, 1000]], fim: 90, quad: 10 },
        q3: { nome: "Q3: ALOHA com confirmações de 100 bits", L: 2, mbps: 100, proto: "aloha", acks: true, quadros: [["A", 0, 1000, "B"], ["B", 20, 1000, "A"], ["B", 60, 1000, "A"]], fim: 100, quad: 10 },
        q4: { nome: "Q4: confirmações e temporizador de 50 µs (Fig. 6)", L: 2, mbps: 100, proto: "aloha", acks: true, timer: 50, quadros: [["A", 0, 1000, "B"], ["C", 20, 1000, "A"], ["B", 60, 1000, "A"]], fim: 220, quad: 10 },
        q5: { nome: "Q5: quadros de tamanhos diferentes", L: 2, mbps: 100, proto: "aloha", acks: true, timer: 50, quadros: [["A", 0, 2000, "B"], ["C", 40, 1000, "A"], ["B", 80, 2000, "A"]], fim: 130, quad: 10 },
        q6: { nome: "Q6: CSMA (escuta antes de transmitir)", L: 2, mbps: 100, proto: "csma", quadros: [["A", 0, 2000, "B"], ["C", 20, 1000, "A"], ["B", 60, 1000, "A"]], fim: 90, quad: 10 },
        q6a: { nome: "Q6 sem escutar (ALOHA), para comparar", L: 2, mbps: 100, proto: "aloha", quadros: [["A", 0, 2000, "B"], ["C", 20, 1000, "A"], ["B", 60, 1000, "A"]], fim: 90, quad: 10 },
        q7: { nome: "Q7: CSMA/CD, 2 km, 10 Mbps, sem retransmissão", L: 2, mbps: 10, proto: "csmacd", quadros: [["A", 0, 200, "B"], ["C", 0, 100, "A"], ["B", 60, 100, "A"]], fim: 90, quad: 10 },
        q8: { nome: "Q8: CSMA/CD a 1 Gbps (primeira rodada)", L: 2, mbps: 1000, proto: "csmacd", quadros: [["A", 0, 10000, "B"], ["C", 10, 10000, "A"], ["B", 40, 10000, "A"], ["A", 45, 10000, "B"]], fim: 70, quad: 5 },
        q9: { nome: "Q9: recuo exponencial (A sorteia o máximo, B o mínimo)", L: 1, mbps: 10, proto: "csmacd", recuo: recuoQ9, slot: 10, quadros: [["B", 10, 100, "C"], ["A", 20, 100, "C"], ["B", 25, 100, "C"]], fim: 70, quad: 5 }
    };
    R.cenariosCabo = CENARIOS;
    var COR = { A: "#dc3545", B: "#0d6efd", C: "#198754" };

    function desenhaCabo(svgEl, c, r) {
        var W = 600, X0 = 60, X1 = 540, Y0 = 30, H = 300;
        function X(x) { return X0 + x / c.L * (X1 - X0); }
        function Y(t) { return Y0 + t / c.fim * H; }
        var pos = { A: 0, C: c.L / 2, B: c.L };
        var g = s("g", { "font-size": 11 });
        g.append(s("rect", { x: 0, y: 0, width: W, height: Y0 + H + 25, style: "fill: var(--bs-body-bg)" }));
        for (var t = 0; t <= c.fim + 1e-9; t += c.quad) g.append(s("line", { x1: X0, y1: Y(t), x2: X1, y2: Y(t), stroke: "var(--line)", "stroke-width": 0.6 }));
        var passoRot = Math.max(c.quad, c.quad * Math.ceil(c.fim / c.quad / 10));
        for (var t2 = 0; t2 <= c.fim + 1e-9; t2 += passoRot) g.append(s("text", { x: X0 - 6, y: Y(t2) + 4, "text-anchor": "end" }, String(t2) + " µs"));
        ["A", "C", "B"].forEach(function (h) {
            g.append(s("line", { x1: X(pos[h]), y1: Y0 - 6, x2: X(pos[h]), y2: Y0 + H, stroke: COR[h], "stroke-width": 1, "stroke-dasharray": "2 3" }));
            g.append(s("rect", { x: X(pos[h]) - 13, y: Y0 - 19, width: 6, height: 10, fill: COR[h] }));
            g.append(s("text", { x: X(pos[h]) + 2, y: Y0 - 10, "text-anchor": "middle", "font-weight": "bold" }, h));
        });
        r.tx.forEach(function (o, i) {
            var xs = X(pos[o.h]), d0 = pos[o.h] * 5, dL = (c.L - pos[o.h]) * 5;
            var partes = [];
            if (pos[o.h] > 0) partes.push([[xs, Y(o.ini)], [X(0), Y(o.ini + d0)], [X(0), Y(o.fim + d0)], [xs, Y(o.fim)]]);
            if (pos[o.h] < c.L) partes.push([[xs, Y(o.ini)], [X(c.L), Y(o.ini + dL)], [X(c.L), Y(o.fim + dL)], [xs, Y(o.fim)]]);
            partes.forEach(function (p) {
                g.append(s("polygon", { points: p.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "), fill: COR[o.h], "fill-opacity": o.tipo === "ack" ? 0.55 : 0.3, stroke: COR[o.h], "stroke-width": 1, "stroke-dasharray": o.abortada ? "4 3" : null }));
            });
            g.append(s("text", { x: xs + (pos[o.h] === c.L ? -4 : 4), y: Y(o.ini) + 11, "text-anchor": pos[o.h] === c.L ? "end" : "start", "font-weight": "bold" }, o.h + i + (o.tipo === "ack" ? " ack" : "")));
        });
        g.append(s("text", { x: X1, y: Y0 + H + 18, "text-anchor": "end" }, "tempo ↓   ·   posição no cabo →"));
        svgEl.replaceChildren(s("title", null, c.nome), g);
    }

    var DESAFIOS = {
        geometria: { pts: 10, titulo: "A representação geométrica", perguntas: [
            ["No cenário da pág. 294, em que instante (µs) o último bit do quadro de A chega a B?", "num", 25]] },
        aloha: { pts: 15, titulo: "ALOHA no cabo", perguntas: [
            ["Na Q2, que quadros colidem?", [["ab", "A0 e B1"], ["cb", "C2 e B3"], ["nenhum", "nenhum"]], "cb"],
            ["Na Q4, por que as colisões se repetem sem parar?", [["timer", "todos retransmitem exatamente quando o temporizador expira, e os mesmos quadros se encontram de novo"], ["curto", "os quadros são curtos demais"], ["ack", "as confirmações não usam o cabo"]], "timer"]] },
        csma: { pts: 15, titulo: "CSMA e CSMA/CD", perguntas: [
            ["Na Q6, com CSMA, em que instante (µs) C começa a transmitir?", "num", 25],
            ["Na Q7, em que instante (µs) A e C detectam a colisão?", "num", 5],
            ["Na Q8, quem percebe a colisão entre o quadro de B e o segundo quadro de A?", [["a", "só A"], ["b", "só B"], ["ambos", "A e B"]], "a"]] },
        recuo: { pts: 15, titulo: "O recuo exponencial", perguntas: [
            ["Na Q9, em que instante (µs) B começa a retransmissão que dá certo?", "num", 35],
            ["E em que instante (µs) A começa a dele?", "num", 50]] }
    };

    R.registrar("mac-cabo", function (raiz) {
        var lista = (raiz.getAttribute("data-cenarios") || "g1").split(",");
        var chave = raiz.getAttribute("data-desafio") || "geometria";
        var cen = escolha("Cenário", lista.map(function (k) { return [k, CENARIOS[k].nome]; }), false);
        var desenho = s("svg", { viewBox: "0 0 600 355", class: "sim-svg w-100", style: "max-height:420px", role: "img", "aria-label": "Diagrama espaço-tempo do cabo: posição na horizontal, tempo descendo." });
        var resumo = el("div", { class: "small mt-1", "aria-live": "polite" });
        function mostra() {
            var c = CENARIOS[cen.value], r = simulaCabo(c);
            desenhaCabo(desenho, c, r);
            var linhas = r.tx.map(function (o, i) {
                return el("li", null, o.h + i + ": " + (o.tipo === "ack" ? "confirmação" : "quadro") + (o.dest ? " para " + o.dest : "") + ", de " + br(o.ini) + " a " + br(o.fim) + " µs" + (o.abortada ? " (interrompido)" : "") + (o.retx ? " (retransmissão)" : ""));
            });
            var col = r.pares.length ? "Colisões (sinais no mesmo ponto do cabo ao mesmo tempo): " + r.pares.map(function (p) { return r.tx[p[0]].h + p[0] + " com " + r.tx[p[1]].h + p[1]; }).join("; ") + "." : "Nenhuma colisão.";
            resumo.replaceChildren.apply(resumo, [el("ul", { class: "mb-1" }, linhas), el("p", { class: "mb-1 fw-semibold" }, col),
                r.eventos.length ? el("ul", { class: "mb-0 text-muted" }, r.eventos.slice(0, 8).map(function (e) { return el("li", null, br(e[0]) + " µs: " + e[1]); })) : null].filter(Boolean));
        }
        cen.addEventListener("change", mostra);
        var cfg = DESAFIOS[chave], campos = cfg.perguntas.map(function (p) { return p[1] === "num" ? numero(p[0]) : escolha(p[0], p[1]); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "mac-" + chave, cfg.pts, cfg.titulo);
        raiz.append(u.campo("Cenário", cen), desenho, el("p", { class: "small text-muted mb-1" }, "Cada linha horizontal vale " + "um quadrado da figura do livro; o tamanho aparece na escala à esquerda. Quadros tracejados foram interrompidos."), resumo,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (" + cfg.pts + " pts)"),
            el("div", null, cfg.perguntas.map(function (p, i) { return linhaPergunta(p[0], campos[i]); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = cfg.perguntas.filter(function (p, i) { return p[1] === "num" ? Math.abs(valor(campos[i]) - p[2]) < 0.01 : campos[i].value === p[2]; }).length;
                var ok = certas === cfg.perguntas.length;
                u.marca(fb, ok, ok ? "Isso. Confira cada resposta no desenho: os instantes saem da geometria do cabo." : certas + " de " + cfg.perguntas.length + ". Escolha o cenário da pergunta e leia o desenho e a lista.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * Justiça max-min (4.6.2 Q1 e Q4): enchimento progressivo
     * ------------------------------------------------------------------ */
    var REDES_MM = {
        q1: { nome: "Q1 (pág. 306–307), enlaces full duplex", cap: { "R1→R2": 10, "R2→R3": 20, "R3→R2": 20, "R2→R1": 10 },
            fluxos: { S1: ["R1→R2", "R2→R3"], S2: ["R1→R2"], S3: ["R1→R2", "R2→R3"], S4: ["R3→R2", "R2→R1"], S5: ["R3→R2"] } },
        q1c: { nome: "Q1, se os dois sentidos dividissem a capacidade", cap: { "R1–R2": 10, "R2–R3": 20 },
            fluxos: { S1: ["R1–R2", "R2–R3"], S2: ["R1–R2"], S3: ["R1–R2", "R2–R3"], S4: ["R2–R3", "R1–R2"], S5: ["R2–R3"] } },
        q4: { nome: "Q4 (Fig. 7, pág. 311)", cap: { Link1: 34, Link2: 100, Link3: 100, Link4: 100 },
            fluxos: { S1: ["Link2"], S2: ["Link2", "Link4"], S3: ["Link1", "Link2"], S4: ["Link1", "Link2", "Link4"], S5: ["Link3"], S6: ["Link3", "Link4"], S7: ["Link3", "Link4"], S8: ["Link3", "Link4"] } }
    };
    function maxmin(rede) {
        var taxa = {}, livre = {}, passos = [];
        Object.keys(rede.fluxos).forEach(function (f) { taxa[f] = 0; livre[f] = true; });
        while (Object.keys(livre).length) {
            var melhor = null;
            Object.keys(rede.cap).forEach(function (e) {
                var usam = Object.keys(rede.fluxos).filter(function (f) { return rede.fluxos[f].indexOf(e) >= 0; });
                var ativos = usam.filter(function (f) { return livre[f]; });
                if (!ativos.length) return;
                var folga = (rede.cap[e] - usam.reduce(function (a, f) { return a + taxa[f]; }, 0)) / ativos.length;
                if (!melhor || folga < melhor.folga - 1e-12) melhor = { e: e, folga: folga, ativos: ativos };
            });
            Object.keys(livre).forEach(function (f) { taxa[f] += melhor.folga; });
            melhor.ativos.forEach(function (f) { delete livre[f]; });
            passos.push({ enlace: melhor.e, congela: melhor.ativos, taxa: JSON.parse(JSON.stringify(taxa)) });
        }
        return { taxa: taxa, passos: passos };
    }
    R.maxmin32 = maxmin;
    R.registrar("maxmin-justo", function (raiz) {
        var rede = escolha("Rede", Object.keys(REDES_MM).map(function (k) { return [k, REDES_MM[k].nome]; }), false);
        var passo = 0, saida = el("div", { class: "mt-2" }), texto = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            var r = REDES_MM[rede.value], res = maxmin(r), fl = Object.keys(r.fluxos);
            var atual = passo ? res.passos[passo - 1] : null;
            saida.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Fluxo"), el("th", null, "Enlaces"), el("th", null, "Taxa (Mbps)"))),
                el("tbody", null, fl.map(function (f) {
                    var congelado = res.passos.slice(0, passo).some(function (p) { return p.congela.indexOf(f) >= 0; });
                    var tx = atual ? atual.taxa[f] : 0;
                    return el("tr", { class: congelado ? "table-success" : null }, el("td", null, f), el("td", null, r.fluxos[f].join(", ")), el("td", null, br(tx) + (congelado ? " (fixa)" : "")));
                })))));
            texto.textContent = !atual ? "Todas as taxas começam em 0 e sobem juntas. O primeiro enlace a lotar fixa a taxa de quem passa por ele." :
                "Passo " + passo + ": " + atual.enlace + " lota; " + atual.congela.join(", ") + " ficam em " + br(atual.taxa[atual.congela[0]]) + " Mbps." + (passo === res.passos.length ? " Fim: ninguém pode ganhar sem tirar de alguém com taxa menor ou igual." : "");
        }
        rede.addEventListener("change", function () { passo = 0; mostra(); });
        var P = ["S1 na Q1", "S4 na Q1", "S1 na Q4", "S2 na Q4", "S5 na Q4"].map(function (t) { return numero("Taxa de " + t); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "maxmin-justo", 15, "Justiça max-min");
        raiz.append(u.campo("Rede", rede),
            el("div", { class: "d-flex gap-2 mb-1" }, u.botao("Próximo passo", "btn-primary", function () { var n = maxmin(REDES_MM[rede.value]).passos.length; if (passo < n) passo++; mostra(); }), u.botao("Recomeçar", "btn-outline-secondary", function () { passo = 0; mostra(); })),
            saida, texto,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): taxas max-min em Mbps (duas casas; Q1 com enlaces full duplex)."),
            el("div", null, ["S1 na Q1", "S4 na Q1", "S1 na Q4", "S2 na Q4", "S5 na Q4"].map(function (t, i) { return linhaPergunta(t, P[i]); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var a = maxmin(REDES_MM.q1).taxa, b = maxmin(REDES_MM.q4).taxa, esp = [a.S1, a.S4, b.S1, b.S2, b.S5];
                var ok = P.every(function (p, i) { return Math.abs(valor(p) - esp[i]) < 0.01; });
                u.marca(fb, ok, ok ? "Isso. Repare que S4 ganha 10 Mbps na Q1: no sentido R3→R1, ninguém disputa com ele." : "Ainda não. Avance os passos em cada rede e anote as taxas fixas.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * Filas, janelas e DECBIT (4.6.2 Q5): diagrama por enlace, como nas Figs. 84–87
     * ------------------------------------------------------------------ */
    // Rede A -1 Mbps- R1 -250 kbps- R2 -100 Mbps- D, propagação desprezível, segmentos de 1000 bits, ACKs instantâneos.
    function filaQ5(janela, n, decbit, maximo) {
        var LINKS = [1, 4, 0.01], cwin = decbit ? 1 : janela, livre = [0, 0, 0], enviados = 0, confirmados = 0, acks = [], linhas = [], fila = [];
        var eventos = [{ t: 0, tipo: "tenta" }], ultimoCorte = -1e9, rttMin = 5.01, marcados = {};
        function agenda(e) { eventos.push(e); eventos.sort(function (a, b) { return a.t - b.t || (a.tipo === "ack" ? -1 : 1); }); }
        while (eventos.length) {
            var e = eventos.shift();
            if (e.tipo === "tenta") {
                while (enviados < n && enviados - confirmados < Math.floor(cwin + 1e-9)) {
                    var k = enviados++, ini = Math.max(e.t, livre[0]);
                    livre[0] = ini + LINKS[0]; linhas.push({ seg: k, enlace: 0, ini: ini, fim: livre[0] });
                    agenda({ t: livre[0], tipo: "chegaR1", seg: k });
                }
            } else if (e.tipo === "chegaR1") {
                var esperando = linhas.filter(function (l) { return l.enlace === 1 && l.ini > e.t + 1e-9; }).length; // pacotes no buffer, sem contar o que está sendo transmitido
                if (decbit && esperando >= 1) marcados[e.seg] = true;
                var i1 = Math.max(e.t, livre[1]); livre[1] = i1 + LINKS[1]; linhas.push({ seg: e.seg, enlace: 1, ini: i1, fim: livre[1] });
                var i2 = Math.max(livre[1], livre[2]); livre[2] = i2 + LINKS[2]; linhas.push({ seg: e.seg, enlace: 2, ini: i2, fim: livre[2] });
                agenda({ t: livre[2], tipo: "ack", seg: e.seg });
            } else if (e.tipo === "ack") {
                confirmados++; acks.push({ seg: e.seg, t: e.t, marcado: !!marcados[e.seg], cwin: cwin });
                if (decbit) {
                    if (marcados[e.seg]) { if (e.t - ultimoCorte >= rttMin) { cwin = Math.max(1, cwin / 2); ultimoCorte = e.t; } }
                    else cwin = Math.min(maximo || 99, cwin + 1 / cwin);
                }
                agenda({ t: e.t, tipo: "tenta" });
            }
        }
        return { linhas: linhas, acks: acks, fim: acks.length ? acks[acks.length - 1].t : 0 };
    }
    R.filaQ5 = filaQ5;
    R.registrar("fila-roteador", function (raiz) {
        var modo = escolha("Controle", [["j1", "janela fixa de 1 segmento"], ["j2", "janela fixa de 2 segmentos (Q5b)"], ["j4", "janela fixa de 4 segmentos"], ["dec", "DECBIT, janela máxima de 4 (Q5c)"]], false);
        modo.value = "j2";
        var desenho = s("svg", { viewBox: "0 0 560 320", class: "sim-svg w-100", style: "max-height:360px", role: "img", "aria-label": "Diagrama dos segmentos em cada enlace ao longo do tempo." });
        var saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            var v = modo.value, r = v === "dec" ? filaQ5(1, 5, true, 4) : filaQ5(Number(v.slice(1)), 5, false);
            var tmax = Math.ceil(r.fim / 2) * 2 + 2, X = [150, 300, 450], Y0 = 30, H = 270;
            function Y(t) { return Y0 + t / tmax * H; }
            var g = s("g", { "font-size": 11, "text-anchor": "middle" });
            g.append(s("rect", { x: 0, y: 0, width: 560, height: 320, style: "fill: var(--bs-body-bg)" }));
            ["A–R1 (1 Mbps)", "R1–R2 (250 kbps)", "R2–D (100 Mbps)"].forEach(function (n, i) { g.append(s("text", { x: X[i], y: 18, "font-weight": "bold" }, n)); });
            for (var t = 0; t <= tmax; t += 2) { g.append(s("line", { x1: 70, y1: Y(t), x2: 530, y2: Y(t), stroke: "var(--line)", "stroke-width": 0.6 })); g.append(s("text", { x: 60, y: Y(t) + 4, "text-anchor": "end" }, t + " ms")); }
            var marc = {}; r.acks.forEach(function (a) { if (a.marcado) marc[a.seg] = 1; });
            r.linhas.forEach(function (l) {
                var h = Math.max(2, Y(l.fim) - Y(l.ini));
                g.append(s("rect", { x: X[l.enlace] - 40, y: Y(l.ini), width: 80, height: h, class: "pacote", rx: 2 }));
                if (h > 9) g.append(s("text", { x: X[l.enlace], y: Y(l.ini) + Math.min(h / 2 + 4, 14), class: "balao-texto" }, "S" + l.seg + (marc[l.seg] ? "*" : "")));
            });
            r.acks.forEach(function (a) { g.append(s("text", { x: 515, y: Y(a.t) + 4, "text-anchor": "end" }, "ack S" + a.seg)); });
            desenho.replaceChildren(s("title", null, "Segmentos por enlace"), g);
            saida.textContent = "Último ack em " + br(r.fim) + " ms. " + r.acks.map(function (a) { return "S" + a.seg + ": " + br(a.t) + " ms" + (a.marcado ? " (marcado)" : ""); }).join("; ") + "." + (v === "dec" ? " Janela ao chegar cada ack: " + r.acks.map(function (a) { return br(a.cwin); }).join(", ") + "." : "");
        }
        modo.addEventListener("change", mostra);
        var P1 = numero("RTT mínimo"), P2 = numero("Duração com janela 2"), P3 = numero("Duração com DECBIT");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "fila-roteador", 15, "Janelas e DECBIT");
        raiz.append(u.campo("Controle da janela de A", modo), desenho, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): respostas em ms, com duas casas."),
            linhaPergunta("Q5a: RTT mínimo de A com segmentos de 1000 bits", P1),
            linhaPergunta("Q5b: com janela 2, quando chega o ack do 5º segmento?", P2),
            linhaPergunta("Q5c: com DECBIT e janela máxima 4, quando chega o ack do 5º segmento?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var esp = [filaQ5(1, 1, false).fim, filaQ5(2, 5, false).fim, filaQ5(1, 5, true, 4).fim];
                var ok = [P1, P2, P3].every(function (p, i) { return Math.abs(valor(p) - esp[i]) < 0.01; });
                u.marca(fb, ok, ok ? "Isso: o enlace de 250 kbps dita o ritmo; uma janela maior só enche a fila de R1." : "Ainda não. Escolha cada modo e leia o último ack.");
                if (ok) concluir();
            }), fb);
        mostra();
    });
}());
