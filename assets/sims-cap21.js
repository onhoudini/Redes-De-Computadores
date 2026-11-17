/* Simulações do Capítulo 21 — Controle de congestionamento no TCP (seção 3.13 do livro).
 * Cada uma é registrada em Redes.registrar. Os modelos contam a janela em segmentos e o tempo em RTTs,
 * como as figuras do livro; as simplificações estão escritas na tela. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }
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
    // Gráfico de linhas simples: series = [{valores, cor, tracejado, rotulo}]
    function grafico(series, opcoes) {
        var W = 640, H = opcoes.altura || 220, ml = 44, mb = 28, n = 0, maxY = opcoes.maxY || 0;
        series.forEach(function (s) { n = Math.max(n, s.valores.length); s.valores.forEach(function (v) { maxY = Math.max(maxY, v); }); });
        maxY = maxY * 1.1 || 1;
        var sx = (W - ml - 12) / Math.max(1, n - 1), sy = (H - mb - 26) / maxY;   // 26 px no topo para o rótulo do eixo
        var g = u.svg("svg", { viewBox: "0 0 " + W + " " + H, class: "sim-svg w-100", role: "img", "aria-label": opcoes.titulo });
        g.append(u.svg("title", { text: opcoes.titulo }));
        [0, 0.5, 1].forEach(function (f) {
            var y = H - mb - maxY * f * sy;
            g.append(u.svg("line", { x1: ml, x2: W - 12, y1: y, y2: y, stroke: "currentColor", "stroke-opacity": 0.15 }),
                u.svg("text", { x: ml - 6, y: y + 4, "text-anchor": "end", "font-size": 11 }, num(maxY * f)));
        });
        g.append(u.svg("text", { x: W - 12, y: H - 6, "text-anchor": "end", "font-size": 11 }, opcoes.eixoX || ""),
            u.svg("text", { x: 4, y: 12, "font-size": 11 }, opcoes.eixoY || ""));
        series.forEach(function (s) {
            g.append(u.svg("polyline", { points: s.valores.map(function (v, i) { return (ml + i * sx).toFixed(1) + "," + (H - mb - v * sy).toFixed(1); }).join(" "),
                fill: "none", stroke: s.cor, "stroke-width": 2.5, "stroke-dasharray": s.tracejado ? "6 4" : null }));
        });
        return g;
    }

    /* ------------------------------------------------------------------
     * 1. A janela efetiva: min(cwnd, rwin, swin) (pág. 205–206 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("janela-efetiva", function (raiz) {
        var cwnd = faixa("cwnd (janela de congestionamento)", 1, 100, 1, 20, function (v) { return v + " MSS = " + num(v * 1460) + " bytes"; });
        var rwin = faixa("rwin (janela anunciada pelo receptor)", 4096, 262144, 4096, 65536, function (v) { return num(v) + " bytes"; });
        var swin = faixa("swin (buffer de envio)", 4096, 262144, 4096, 131072, function (v) { return num(v) + " bytes"; });
        var rtt = faixa("RTT", 10, 300, 10, 100, function (v) { return v + " ms"; });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        function desenha() {
            var c = Number(cwnd.input.value) * 1460, r = Number(rwin.input.value), s = Number(swin.input.value), T = Number(rtt.input.value) / 1000;
            var j = Math.min(c, r, s), quem = j === c ? "a rede (cwnd)" : j === r ? "o receptor (rwin)" : "o buffer de envio (swin)";
            saida.replaceChildren(
                el("div", null, "Janela usada = min(" + num(c) + ", " + num(r) + ", " + num(s) + ") = ", el("strong", null, num(j) + " bytes")),
                el("div", null, "Quem limita: ", el("strong", null, quem), "."),
                el("div", null, "Taxa máxima ≈ janela / RTT = ", el("strong", null, num(j * 8 / T / 1e6, 2) + " Mbit/s")));
        }
        [cwnd.input, rwin.input, swin.input, rtt.input].forEach(function (c) { c.addEventListener("input", desenha); });
        raiz.append(cwnd.linha, rwin.linha, swin.linha, rtt.linha, saida,
            desafioNumero(raiz, "janela-efetiva", 10, "Calcular a taxa limitada pela janela",
                "com cwnd = 30 MSS de 1460 bytes, rwin = 32 768 bytes, swin = 131 072 bytes e RTT de 50 ms, qual é a taxa máxima, em Mbit/s (duas casas)?",
                function (v) { return Math.abs(v - 5.24) < 0.011; }, "Isso: 30 × 1460 = 43 800 bytes, mas o receptor só aceita 32 768; 32 768 × 8 / 0,05 ≈ 5,24 Mbit/s.", "Ainda não. Qual das três janelas é a menor? Divida-a pelo RTT."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 2. Slow start e congestion avoidance (pág. 206 do PDF)
     * ------------------------------------------------------------------ */
    function evolucao(rtts, eventos, ssthresh, tahoe) {
        var cwnd = 1, linha = [], limiar = [];
        for (var t = 0; t < rtts; t++) {
            linha.push(cwnd); limiar.push(ssthresh);
            var ev = eventos[t];
            if (ev === "timeout" || (ev === "dupack" && tahoe)) { ssthresh = Math.max(Math.floor(cwnd / 2), 2); cwnd = 1; }
            else if (ev === "dupack") { ssthresh = Math.max(Math.floor(cwnd / 2), 2); cwnd = ssthresh; }
            else if (cwnd < ssthresh) cwnd = Math.min(2 * cwnd, ssthresh);
            else cwnd += 1;
        }
        return { cwnd: linha, ssthresh: limiar };
    }
    R.evolucaoCwnd = evolucao;

    R.registrar("slow-start", function (raiz) {
        var ss = faixa("ssthresh inicial", 2, 64, 1, 16, function (v) { return v + " segmentos"; });
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function desenha() {
            var e = evolucao(25, {}, Number(ss.input.value));
            area.replaceChildren(grafico([{ valores: e.cwnd, cor: "#0d6efd" }, { valores: e.ssthresh, cor: "#d63384", tracejado: true }],
                { titulo: "cwnd por RTT, sem perdas", eixoX: "tempo (RTTs)", eixoY: "segmentos" }));
            resumo.textContent = "cwnd por RTT: " + e.cwnd.slice(0, 12).join(", ") + "… Até o ssthresh (tracejado), a janela dobra; depois, cresce 1 segmento por RTT.";
        }
        ss.input.addEventListener("input", desenha);
        raiz.append(ss.linha, area, resumo,
            el("p", { class: "small text-muted mb-0" }, "Simplificação: a janela dobra por RTT sem passar do ssthresh; no TCP real, ela cresce 1 MSS por ACK."),
            desafioNumero(raiz, "slow-start", 10, "Contar os RTTs do slow start",
                "começando com cwnd = 1 e ssthresh = 32, em qual RTT (contando o primeiro como RTT 0) a cwnd chega a 40 segmentos?",
                function (v) { return v === 13; }, "Isso: 1, 2, 4, 8, 16, 32 nos RTTs 0 a 5, e depois +1 por RTT: 40 no RTT 13.", "Ainda não. Use o gráfico com ssthresh = 32 e conte."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 3. Congestionamento leve e severo (pág. 206–207 do PDF, Figs. 34 e 35)
     * ------------------------------------------------------------------ */
    R.registrar("cwnd-eventos", function (raiz) {
        var eventos = {}, N = 30;
        var rttEv = faixa("RTT do evento", 1, N - 2, 1, 7, function (v) { return "RTT " + v; });
        var area = el("div", { class: "mt-2" });
        var lista = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "cwnd-eventos", 15, "Comparar as reações a ACKs duplicados e ao temporizador");
        function desenha() {
            var e = evolucao(N, eventos, 64);
            area.replaceChildren(grafico([{ valores: e.cwnd, cor: "#0d6efd" }, { valores: e.ssthresh.map(function (v) { return Math.min(v, 70); }), cor: "#d63384", tracejado: true }],
                { titulo: "cwnd por RTT com os eventos escolhidos", eixoX: "tempo (RTTs)", eixoY: "segmentos", maxY: 64 }));
            var ks = Object.keys(eventos).map(Number).sort(function (a, b) { return a - b; });
            lista.textContent = ks.length ? "Eventos: " + ks.map(function (k) { return "RTT " + k + ": " + (eventos[k] === "dupack" ? "3 ACKs duplicados" : "temporizador"); }).join("; ") + "." : "Nenhum evento ainda: só slow start e congestion avoidance (ssthresh inicial 64).";
        }
        function poe(tipo) {
            var t = Number(rttEv.input.value);
            eventos[t] = tipo; vistos[tipo] = true;
            desenha();
            var e = evolucao(N, eventos, 64);
            u.marca(fb, true, tipo === "dupack"
                ? "Congestionamento leve: no RTT " + (t + 1) + " a cwnd vai a " + e.cwnd[t + 1] + " (metade de " + e.cwnd[t] + "), e segue em congestion avoidance."
                : "Congestionamento severo: a cwnd volta a 1, o ssthresh vai a " + e.ssthresh[t + 1] + ", e recomeça o slow start.");
            if (vistos.dupack && vistos.timeout) { concluir(); fb.textContent += " Você viu as duas reações (Figs. 34 e 35 do livro)."; }
        }
        rttEv.input.addEventListener("input", function () {});
        raiz.append(rttEv.linha,
            el("div", { class: "d-flex flex-wrap gap-2" },
                u.botao("3 ACKs duplicados neste RTT", "btn-outline-primary", function () { poe("dupack"); }),
                u.botao("Temporizador expira neste RTT", "btn-outline-danger", function () { poe("timeout"); }),
                u.botao("Limpar eventos", "btn-outline-secondary", function () { eventos = {}; fb.textContent = ""; desenha(); })),
            area, lista, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Azul: cwnd. Tracejado: ssthresh. Desafio (15 pts): provoque um evento de cada tipo e compare as reações."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 4. ECN: os bits CE, ECE e CWR (pág. 209–211 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("ecn-bits", function (raiz) {
        var marca = caixa("O roteador está congestionado e marca o 1º pacote (CE = 1)", true);
        var perde = caixa("O 1º ACK, com ECE, se perde", true);
        var repete = caixa("O receptor repete o ECE até receber um segmento com CWR (RFC 3168)", false);
        var area = el("div", { class: "mt-2" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "ecn-cwr", 15, "Entender por que o ECN precisa do bit CWR");
        function roda() {
            var ce = marca.input.checked, perdido = perde.input.checked, rep = repete.input.checked;
            var ev = [
                { de: 0, para: 1, rotulo: "data seq=1, ECT=1, CE=0" },
                { de: 1, para: 2, rotulo: "data seq=1, ECT=1, CE=" + (ce ? 1 : 0), tipo: ce ? "erro" : null },
                { de: 2, para: 1, rotulo: "ack=2, ECE=" + (ce ? 1 : 0) },
                { de: 1, para: 0, rotulo: "ack=2, ECE=" + (ce ? 1 : 0), tipo: ce && perdido ? "perda" : null },
                { de: 2, para: 0, rotulo: "data seq=x, ack=2, ECE=" + (ce && rep ? 1 : 0), inclinacao: 1.4 }
            ];
            var aprendeu = ce && (!perdido || rep);
            if (aprendeu) ev.push({ nota: 0, rotulo: "reduz a cwnd" }, { de: 0, para: 2, rotulo: "data seq=2, CWR=1", inclinacao: 1.4 }, { nota: 2, rotulo: "para de mandar ECE" });
            area.replaceChildren(R.diagramaSequencia({ titulo: "ECN entre cliente e servidor, passando por um roteador.", colunas: ["Cliente", "Roteador", "Servidor"], eventos: ev, passo: 30, margem: 110, largura: 720 }));
            if (!ce) { u.marca(fb, true, "Sem congestionamento, nenhum pacote é marcado e ninguém reduz a janela."); return; }
            if (aprendeu) {
                u.marca(fb, true, perdido ? "Mesmo com o primeiro ACK perdido, o receptor repetiu o ECE até ver o CWR: o emissor soube do congestionamento e confirmou com CWR." : "O ACK com ECE chegou: o emissor reduz a cwnd e avisa com CWR.");
                if (perdido && rep) vistos.salvo = true;
            } else {
                u.marca(fb, false, "A informação de congestionamento se perdeu com o ACK: o segmento seguinte confirma os dados, mas não leva o ECE, e o emissor não reduz a janela.");
                vistos.perdido = true;
            }
            if (vistos.perdido && vistos.salvo) { concluir(); fb.textContent += " É por isso que existe o bit CWR."; }
        }
        [marca.input, perde.input, repete.input].forEach(function (c) { c.addEventListener("change", roda); });
        raiz.append(marca.linha, perde.linha, repete.linha, area, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): com o 1º ACK perdido, veja a informação se perder; depois, ligue a repetição do ECE e veja o emissor reagir."));
        roda();
    });

    /* ------------------------------------------------------------------
     * 5. RED: média da fila e marcação proporcional (pág. 211 do PDF)
     * ------------------------------------------------------------------ */
    function mediaMovel(fila, peso) { var m = 0; return fila.map(function (q) { m = (1 - peso) * m + peso * q; return m; }); }
    function probabilidadeRed(m, minimo, maximo, pmax) { return m < minimo ? 0 : m >= maximo ? 1 : pmax * (m - minimo) / (maximo - minimo); }
    R.mediaMovel = mediaMovel; R.probabilidadeRed = probabilidadeRed;

    R.registrar("red-marcacao", function (raiz) {
        var FILA = [0, 5, 80, 80, 10, 5, 0, 5, 70, 75, 80, 85, 90, 85, 80, 40, 30, 20, 10, 5];
        var peso = faixa("Peso da média (w)", 0.05, 1, 0.05, 0.2, function (v) { return num(v, 2); });
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function desenha() {
            var m = mediaMovel(FILA, Number(peso.input.value));
            area.replaceChildren(grafico([{ valores: FILA, cor: "#adb5bd" }, { valores: m, cor: "#0d6efd" }, { valores: FILA.map(function () { return 20; }), cor: "#198754", tracejado: true }, { valores: FILA.map(function () { return 60; }), cor: "#d63384", tracejado: true }],
                { titulo: "Ocupação instantânea e média da fila", eixoX: "tempo", eixoY: "pacotes", maxY: 90 }));
            var marcas = m.filter(function (x) { return x >= 20; }).length;
            resumo.textContent = "Cinza: fila instantânea. Azul: média. Tracejados: limiares de 20 e 60 pacotes. A média passa do limiar mínimo em " + marcas + " de " + FILA.length + " instantes; a rajada curta do começo quase não conta.";
        }
        peso.input.addEventListener("input", desenha);
        raiz.append(peso.linha, area, resumo,
            el("p", { class: "small text-muted mb-0" }, "Os limiares e a fórmula da média são do artigo original do RED (complemento); o livro só descreve a ideia."),
            desafioNumero(raiz, "red-proporcional", 10, "Calcular a marcação proporcional",
                "o roteador congestionado marca 10% dos pacotes. Um fluxo manda 100 pacotes por segundo. Quantos pacotes dele são marcados por segundo, em média?",
                function (v) { return v === 10; }, "Isso: 10% de 100 = 10 marcas por segundo, enquanto um fluxo de 1 pacote por segundo só leva uma marca a cada 10 s, em média. A marcação acompanha o uso da rede (pág. 211 do PDF).", "Ainda não. Que fração dos pacotes é marcada?"));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 6. O modelo da raiz de p (pág. 212–213 do PDF)
     * ------------------------------------------------------------------ */
    function vazaoModelo(mss, rtt, p) { return Math.sqrt(1.5) * mss / (rtt * Math.sqrt(p)); }
    R.vazaoModelo = vazaoModelo;

    R.registrar("vazao-tcp", function (raiz) {
        var p = faixa("Taxa de perda p", -5, -1, 0.25, -3, function (v) { return Math.pow(10, v).toExponential(1).replace(".", ","); });
        var rtt = faixa("RTT", 5, 300, 5, 100, function (v) { return v + " ms"; });
        var mss = faixa("MSS", 536, 9000, 4, 1460, function (v) { return num(v) + " bytes"; });
        var jan = faixa("Janela máxima", 16, 4096, 16, 1024, function (v) { return num(v) + " KB"; });
        var area = el("div", { class: "mt-2" });
        var saida = el("div", { class: "small", "aria-live": "polite" });
        function desenha() {
            var P = Math.pow(10, Number(p.input.value)), T = Number(rtt.input.value) / 1000, M = Number(mss.input.value), J = Number(jan.input.value) * 1024;
            var W = Math.sqrt(8 / (3 * P)), perdas = vazaoModelo(M, T, P), janela = J / T;
            var dente = [], c = W / 2;
            for (var i = 0; i < 60; i++) { dente.push(c); c = c + 1 >= W ? W / 2 : c + 1; }
            area.replaceChildren(grafico([{ valores: dente, cor: "#0d6efd" }], { titulo: "Dente de serra da cwnd com perdas regulares", eixoX: "tempo (RTTs)", eixoY: "segmentos" }));
            saida.replaceChildren(
                el("div", null, "W = √(8 / 3p) = ", el("strong", null, num(W, 1) + " segmentos"), " (a cwnd oscila entre W/2 e W)"),
                el("div", null, "Limite das perdas: √(3/2) · MSS / (rtt · √p) = ", el("strong", null, num(perdas * 8 / 1e6, 2) + " Mbit/s")),
                el("div", null, "Limite da janela: janela / rtt = ", el("strong", null, num(janela * 8 / 1e6, 2) + " Mbit/s")),
                el("div", null, "Vazão < min(…) = ", el("strong", null, num(Math.min(perdas, janela) * 8 / 1e6, 2) + " Mbit/s"), perdas < janela ? " (limitada pelas perdas)" : " (limitada pela janela)"));
        }
        [p.input, rtt.input, mss.input, jan.input].forEach(function (c) { c.addEventListener("input", desenha); });
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-md-6" }, p.linha, rtt.linha), el("div", { class: "col-md-6" }, mss.linha, jan.linha)), area, saida,
            desafioNumero(raiz, "vazao-rtt", 10, "Ver a injustiça do TCP com RTTs diferentes",
                "dois fluxos têm o mesmo MSS e a mesma taxa de perda, mas RTTs de 20 ms e de 200 ms. Pelo modelo, quantas vezes mais rápido é o fluxo de 20 ms?",
                function (v) { return v === 10; }, "Isso: a vazão é inversamente proporcional ao RTT, então 200 / 20 = 10 vezes. O controle de congestionamento do TCP favorece os fluxos de RTT curto (pág. 212 do PDF).", "Ainda não. Como o RTT aparece na fórmula?"));
        desenha();
    });
}());

/* Etapa "3. Visualização" do conceito zoo: a janela depois de uma perda, Reno contra CUBIC.
 * O livro só descreve o CUBIC em palavras (pág. 213 do PDF); a função vem da RFC 9438 (C = 0,4, β = 0,7). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, s = u.svg;
    function escolha(rotulo, lista) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            el("option", { value: "" }, "escolha…"), lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    var C = 0.4, BETA = 0.7;
    function virgula(x) { return String(x).replace(".", ","); }
    // Tempo (s) para cada um voltar a Wmax depois de uma perda. rtt em segundos.
    function renoCubic(wmax, rtt) {
        return { reno: (wmax / 2) * rtt, cubic: Math.cbrt(wmax * (1 - BETA) / C) };
    }
    function janelaReno(t, wmax, rtt) { return wmax / 2 + Math.floor(t / rtt); }
    function janelaCubic(t, wmax) { var K = Math.cbrt(wmax * (1 - BETA) / C); return C * Math.pow(t - K, 3) + wmax; }
    R.renoCubic = renoCubic;

    R.registrar("reno-cubic", function (raiz) {
        var wmax = el("input", { type: "range", class: "form-range", min: 20, max: 1000, step: 10, value: 100, id: u.novoId("faixa") });
        var wTxt = el("span", { class: "fw-semibold" });
        var rtt = el("select", { class: "form-select form-select-sm", id: u.novoId("rtt") }, [10, 50, 100, 200].map(function (v) { return el("option", { value: v }, v + " ms"); }));
        rtt.value = "100";
        var grafico = s("svg", { viewBox: "0 0 640 280", class: "sim-svg w-100", style: "max-height:300px", role: "img", "aria-label": "Janela de congestionamento depois de uma perda: Reno cresce em linha reta; CUBIC segue uma curva cúbica." });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var W = Number(wmax.value), T = Number(rtt.value) / 1000, r = renoCubic(W, T);
            wTxt.textContent = W + " MSS";
            var tmax = Math.max(r.reno, r.cubic) * 1.4, ymax = W * 1.35;
            var x0 = 50, y0 = 240, larg = 570, alt = 200;
            function X(t) { return x0 + t / tmax * larg; }
            function Y(w) { return y0 - Math.min(w, ymax) / ymax * alt; }
            var g = s("g", { "font-size": 11 });
            g.append(s("rect", { x: 0, y: 0, width: 640, height: 280, style: "fill: var(--bs-body-bg)" }));
            g.append(s("line", { class: "linha", x1: x0, y1: y0, x2: x0 + larg, y2: y0 }), s("line", { class: "linha", x1: x0, y1: y0, x2: x0, y2: y0 - alt }));
            g.append(s("line", { class: "linha", x1: x0, y1: Y(W), x2: x0 + larg, y2: Y(W), "stroke-dasharray": "2 4" }), s("text", { x: x0 + 4, y: Y(W) - 4 }, "Wmax = " + W));
            for (var i = 0; i <= 4; i++) { var tt = tmax * i / 4; g.append(s("text", { x: X(tt), y: y0 + 16, "text-anchor": "middle" }, virgula(tt.toFixed(tt < 10 ? 1 : 0)) + " s")); }
            g.append(s("text", { x: x0 + larg, y: y0 + 32, "text-anchor": "end" }, "tempo desde a perda"), s("text", { x: 12, y: 24 }, "cwnd (MSS)"));
            var pr = [], pc = [], n = 240;
            for (var k = 0; k <= n; k++) {
                var t = tmax * k / n;
                pr.push(X(t) + "," + Y(janelaReno(t, W, T)));
                pc.push(X(t) + "," + Y(janelaCubic(t, W)));
            }
            g.append(s("polyline", { points: pr.join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 2.5, "stroke-dasharray": "7 4" }));
            g.append(s("polyline", { points: pc.join(" "), fill: "none", stroke: "var(--warn)", "stroke-width": 2.5 }));
            [[r.reno, "Reno"], [r.cubic, "CUBIC"]].forEach(function (m, j) {
                g.append(s("circle", { cx: X(m[0]), cy: Y(W), r: 4, fill: j ? "var(--warn)" : "var(--accent)" }));
            });
            g.append(s("line", { x1: 470, y1: 16, x2: 500, y2: 16, stroke: "var(--accent)", "stroke-width": 2.5, "stroke-dasharray": "7 4" }), s("text", { x: 505, y: 20 }, "Reno"),
                s("line", { x1: 550, y1: 16, x2: 580, y2: 16, stroke: "var(--warn)", "stroke-width": 2.5 }), s("text", { x: 585, y: 20 }, "CUBIC"));
            grafico.replaceChildren(s("title", null, "Janela depois de uma perda: Reno e CUBIC"), g);
            var rtts = Math.round(r.reno / T);
            saida.textContent = "Reno corta a janela para " + (W / 2) + " MSS e soma 1 MSS por RTT: volta a Wmax em " + rtts + " RTTs = " + virgula(r.reno.toFixed(1)) + " s. " +
                "CUBIC corta para " + (W * BETA).toFixed(0) + " MSS e volta a Wmax em K = " + virgula(r.cubic.toFixed(1)) + " s, seja qual for o RTT. " +
                (r.cubic < r.reno ? "Aqui o CUBIC chega antes." : "Aqui o Reno chega antes: com RTT curto, o aumento por RTT é rápido.");
        }
        wmax.addEventListener("input", mostra);
        rtt.addEventListener("change", mostra);
        var CENAS = [[1000, 0.1, "cubic"], [100, 0.01, "reno"]];
        var selects = CENAS.map(function (c) { return escolha("Quem volta a Wmax primeiro com Wmax " + c[0] + " e RTT " + c[1] * 1000 + " ms", [["reno", "Reno"], ["cubic", "CUBIC"]]); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "reno-cubic", 15, "Reno e CUBIC depois de uma perda");
        raiz.append(
            el("p", { class: "small mb-2" }, el("span", { class: "badge text-bg-secondary me-1" }, "Complemento"),
                "A curva do CUBIC é a da ", el("a", { href: "https://www.rfc-editor.org/rfc/rfc9438", target: "_blank", rel: "noopener" }, "RFC 9438"),
                ": W(t) = C·(t − K)³ + Wmax, com C = 0,4 e β = 0,7. O gráfico mostra só a função cúbica; a RFC também manda o CUBIC nunca crescer mais devagar que um Reno equivalente (a \"região amigável ao Reno\"), justamente para os casos de RTT curto."),
            el("div", { class: "row g-2" },
                el("div", { class: "col-sm-8" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: wmax.id }, "Janela antes da perda (Wmax)", wTxt), wmax),
                el("div", { class: "col-sm-4" }, el("label", { class: "form-label small mb-1", for: rtt.id }, "RTT"), rtt)),
            grafico, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): quem volta a Wmax primeiro? Calcule e confira no gráfico."),
            el("div", null, CENAS.map(function (c, i) { return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, "Wmax = " + c[0] + " MSS, RTT = " + c[1] * 1000 + " ms"), el("div", { class: "col-sm-5" }, selects[i])); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = CENAS.filter(function (c, i) { return selects[i].value === c[2]; }).length;
                u.marca(fb, certas === 2, certas === 2 ? "Isso: Reno leva 50 s no primeiro (500 RTTs) contra 9,1 s do CUBIC; no segundo, 0,5 s contra 4,2 s. O CUBIC foi feito para janelas grandes e RTTs longos."
                    : certas + " de 2. Reno: Wmax/2 RTTs. CUBIC: K = ∛(Wmax·0,3/0,4) segundos.");
                if (certas === 2) concluir();
            }), fb);
        mostra();
    });
}());
