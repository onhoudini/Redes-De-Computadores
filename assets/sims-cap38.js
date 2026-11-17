/* Simulações do Capítulo 38 — Prática: o básico do TCP (seção 4.12 do livro, pág. 319 do PDF). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function linhaPergunta(texto, controle) {
        return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, texto), el("div", { class: "col-sm-5" }, controle));
    }
    function campoNum(rotulo) { return el("input", { type: "text", inputmode: "numeric", class: "form-control form-control-sm mono", "aria-label": rotulo, autocomplete: "off" }); }
    function n(v) { return Number(String(v).trim()); }
    function sorteia() { return Math.floor(Math.random() * 4e9); }

    // Gera os segmentos de uma conexão: abertura, dados do cliente (com um ack por segmento), FINs.
    function conexao(isnC, isnS, dadosC) {
        var segs = [["C", "S", isnC, null, 0], ["S", "S.", isnS, isnC + 1, 0], ["C", ".", isnC + 1, isnS + 1, 0]];
        var s = isnC + 1;
        dadosC.forEach(function (tam) { segs.push(["C", "P.", s, isnS + 1, tam]); s += tam; segs.push(["S", ".", isnS + 1, s, 0]); });
        segs.push(["C", "F.", s, isnS + 1, 0], ["S", "F.", isnS + 1, s + 1, 0], ["C", ".", s + 1, isnS + 2, 0]);
        return segs;
    }
    R.conexao38 = conexao;

    /* ---------- Atividade 1: a abertura em três vias ---------- */
    function exercicio(raiz, chave, titulo, perguntas, gera, extra) {
        var dados, campos = perguntas.map(function (p) { return campoNum(p[0]); });
        var quadro = el("pre", { class: "log mb-2", style: "white-space: pre-wrap" }), treino = el("p", { class: "small mb-0", "aria-live": "polite" });
        function novo() { dados = gera(false); quadro.textContent = dados.mostra; campos.forEach(function (c) { c.value = ""; }); treino.textContent = ""; }
        var fb = u.feedback();
        var concluir = R.desafio(raiz, chave, 10, titulo);
        raiz.append(el("p", { class: "small mb-1" }, "Treino com números sorteados (não vale ponto):"), quadro,
            el("div", null, perguntas.map(function (p, i) { return linhaPergunta(p[0], campos[i]); })),
            el("div", { class: "d-flex flex-wrap gap-2 mt-1" },
                u.botao("Conferir o treino", "btn-outline-primary", function () {
                    var certas = perguntas.filter(function (p, i) { return n(campos[i].value) === dados.resp[i]; }).length;
                    treino.textContent = certas + " de " + perguntas.length + " certas" + (certas < perguntas.length ? ". Respostas: " + dados.resp.join(", ") + "." : ".");
                }),
                u.botao("Sortear outros números", "btn-outline-secondary", novo)), treino);
        var fixo = gera(true), camposD = perguntas.map(function (p) { return campoNum(p[0] + " (desafio)"); });
        raiz.append(el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts):"), el("pre", { class: "log mb-2", style: "white-space: pre-wrap" }, fixo.mostra),
            el("div", null, perguntas.map(function (p, i) { return linhaPergunta(p[0], camposD[i]); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = perguntas.every(function (p, i) { return n(camposD[i].value) === fixo.resp[i]; });
                u.marca(fb, ok, ok ? extra : "Ainda não. Treine com os números sorteados e confira as respostas.");
                if (ok) concluir();
            }), fb);
        novo();
    }
    R.registrar("abertura-tcp", function (raiz) {
        exercicio(raiz, "abertura-tcp", "A abertura em três vias", [["ack do SYN+ACK"], ["ack do terceiro segmento"], ["seq do primeiro byte de dados do cliente"]], function (fixo) {
            var c = fixo ? 1000 : sorteia(), s = fixo ? 5000 : sorteia();
            return { mostra: "C > S: Flags [S], seq " + c + "\nS > C: Flags [S.], seq " + s + ", ack ?\nC > S: Flags [.], ack ?", resp: [c + 1, s + 1, c + 1] };
        }, "Isso: cada SYN consome um número, então o ack é o ISN do outro + 1, e os dados do cliente começam em ISN + 1.");
    });
    R.registrar("dados-acks", function (raiz) {
        exercicio(raiz, "dados-acks", "Dados e confirmações", [["ack depois do 1º segmento"], ["ack depois do 2º"], ["ack depois do 3º"]], function (fixo) {
            var c = fixo ? 1000 : sorteia(), t = fixo ? [100, 200, 50] : [1 + Math.floor(Math.random() * 1400), 1 + Math.floor(Math.random() * 1400), 1 + Math.floor(Math.random() * 1400)];
            var s = c + 1, linhas = [], resp = [];
            t.forEach(function (x) { linhas.push("C > S: Flags [P.], seq " + s + ":" + (s + x) + ", length " + x); s += x; resp.push(s); linhas.push("S > C: Flags [.], ack ?"); });
            return { mostra: "(ISN do cliente: " + c + ")\n" + linhas.join("\n"), resp: resp };
        }, "Isso: o ack é cumulativo e diz o próximo byte esperado, o seq do segmento + o seu tamanho.");
    });
    R.registrar("fin-tcp", function (raiz) {
        exercicio(raiz, "fin-tcp", "O encerramento", [["ack do servidor ao FIN do cliente"], ["seq do FIN do servidor"], ["ack do último segmento"]], function (fixo) {
            var x = fixo ? 7001 : sorteia(), y = fixo ? 9301 : sorteia();
            return { mostra: "C > S: Flags [F.], seq " + x + ", ack " + y + ", length 0\nS > C: Flags [.], ack ?\nS > C: Flags [F.], seq ?, ack " + (x + 1) + "\nC > S: Flags [.], ack ?", resp: [x + 1, y, y + 1] };
        }, "Isso: o FIN consome um número de sequência, como o SYN; o servidor ainda não tinha mandado nada além do que já foi confirmado, então o FIN dele usa o seq que o cliente espera.");
    });

    /* ---------- Atividade 4: opções negociadas na abertura ---------- */
    function negocia(cli, srv) {
        return {
            mssC: srv.mss, mssS: cli.mss,                       // cada lado manda segmentos de até o MSS anunciado pelo outro
            escala: cli.ws !== null && srv.ws !== null,          // só vale se os dois mandarem wscale
            sack: cli.sack && srv.sack, ts: cli.ts && srv.ts
        };
    }
    R.negociaOpcoes38 = negocia;
    R.registrar("opcoes-tcp", function (raiz) {
        function lado(nome, mss, ws, sack, ts) {
            var o = { mss: el("input", { type: "number", class: "form-control form-control-sm", value: mss, "aria-label": "MSS do " + nome }),
                ws: el("input", { type: "number", class: "form-control form-control-sm", value: ws === null ? "" : ws, placeholder: "não manda", "aria-label": "wscale do " + nome }),
                sack: el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: sack }), ts: el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: ts }) };
            o.caixa = el("div", { class: "col-sm-6" }, el("div", { class: "small fw-semibold" }, "Opções no SYN do " + nome), u.campo("MSS", o.mss), u.campo("wscale (vazio = não manda)", o.ws),
                el("div", { class: "form-check" }, o.sack, el("label", { class: "form-check-label small", for: o.sack.id }, "sackOK")),
                el("div", { class: "form-check" }, o.ts, el("label", { class: "form-check-label small", for: o.ts.id }, "timestamps")));
            o.le = function () { return { mss: Number(o.mss.value), ws: o.ws.value === "" ? null : Number(o.ws.value), sack: o.sack.checked, ts: o.ts.checked }; };
            return o;
        }
        var c = lado("cliente", 1460, 7, true, true), s = lado("servidor", 1440, null, true, false);
        var saida = el("ul", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var r = negocia(c.le(), s.le());
            saida.replaceChildren(el("li", null, "O cliente manda segmentos de até " + r.mssC + " bytes; o servidor, de até " + r.mssS + "."),
                el("li", null, r.escala ? "Escala de janela ligada: cada lado multiplica a janela por 2 elevado ao wscale que ele mesmo anunciou." : "Escala de janela desligada: um dos lados não mandou wscale, e a janela fica limitada a 65 535 bytes."),
                el("li", null, "SACK " + (r.sack ? "ligado." : "desligado.")), el("li", null, "Timestamps " + (r.ts ? "ligados." : "desligados.")));
        }
        [c, s].forEach(function (o) { [o.mss, o.ws, o.sack, o.ts].forEach(function (x) { x.addEventListener("input", mostra); x.addEventListener("change", mostra); }); });
        var P1 = campoNum("Maior segmento do cliente"), P2 = el("select", { class: "form-select form-select-sm", "aria-label": "Escala de janela" }, el("option", { value: "" }, "escolha…"), el("option", { value: "sim" }, "ligada"), el("option", { value: "nao" }, "desligada"));
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "opcoes-tcp", 10, "As opções da abertura");
        raiz.append(el("div", { class: "row g-3" }, c.caixa, s.caixa), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): com as opções iniciais (cliente: MSS 1460, wscale 7, sackOK, timestamps; servidor: MSS 1440, sem wscale, sackOK)…"),
            linhaPergunta("…qual é o maior segmento que o cliente pode mandar?", P1),
            linhaPergunta("…a escala de janela fica ligada?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var r = negocia({ mss: 1460, ws: 7, sack: true, ts: true }, { mss: 1440, ws: null, sack: true, ts: false });
                var ok = n(P1.value) === r.mssC && P2.value === (r.escala ? "sim" : "nao");
                u.marca(fb, ok, ok ? "Isso: o MSS é anunciado por quem recebe, e as opções de escala e timestamps só valem se os dois lados as mandarem no SYN." : "Ainda não. Volte as opções aos valores iniciais e leia o resultado.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 5: pôr os segmentos em ordem ---------- */
    var C0 = 2681184541, S0 = 3804204915;
    var LIVRO = [["C", "S", C0, null, 0], ["S", "S.", S0, C0 + 1, 0], ["C", ".", C0 + 1, S0 + 1, 0], ["C", "P.", C0 + 1, S0 + 1, 92], ["S", ".", S0 + 1, C0 + 93, 0],
        ["S", "P.", S0 + 1, C0 + 93, 457], ["C", ".", C0 + 93, S0 + 458, 0], ["C", "F.", C0 + 93, S0 + 458, 0], ["S", "F.", S0 + 458, C0 + 94, 0], ["C", ".", C0 + 94, S0 + 459, 0]];
    R.livro38 = LIVRO;
    function linhaAbs(sg) {
        return (sg[0] === "C" ? "C > S" : "S > C") + ": Flags [" + sg[1] + "], seq " + sg[2] + (sg[4] ? ":" + (sg[2] + sg[4]) : "") + (sg[3] === null ? "" : ", ack " + sg[3]) + ", length " + sg[4];
    }
    R.registrar("reordena-segmentos", function (raiz) {
        var ordem = [6, 2, 9, 0, 4, 7, 1, 8, 3, 5];   // um embaralhamento fixo
        var lista = el("ol", { class: "small mono mb-1 ps-4" });
        function mostra() {
            lista.replaceChildren.apply(lista, ordem.map(function (k, i) {
                return el("li", { class: "mb-1" }, el("span", { class: "me-2" }, linhaAbs(LIVRO[k])),
                    u.botao("↑", "btn-outline-secondary btn-sm py-0", function () { if (i > 0) { var x = ordem[i - 1]; ordem[i - 1] = ordem[i]; ordem[i] = x; mostra(); lista.querySelectorAll("li")[i - 1].querySelector("button").focus(); } }, "Subir o segmento " + (i + 1)),
                    u.botao("↓", "btn-outline-secondary btn-sm py-0 ms-1", function () { if (i < ordem.length - 1) { var x = ordem[i + 1]; ordem[i + 1] = ordem[i]; ordem[i] = x; mostra(); lista.querySelectorAll("li")[i + 1].querySelectorAll("button")[1].focus(); } }, "Descer o segmento " + (i + 1)));
            }));
        }
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "reordena-segmentos", 15, "Pôr os segmentos em ordem");
        raiz.append(el("p", { class: "small mb-1" }, "Os dez segmentos TCP da captura do livro (pág. 316–317), em números absolutos e fora de ordem. Use ↑ e ↓ para pô-los na ordem em que foram enviados."),
            lista,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            u.botao("Conferir a ordem", "btn-primary", function () {
                var certos = ordem.filter(function (k, i) { return k === i; }).length, ok = certos === LIVRO.length;
                u.marca(fb, ok, ok ? "Isso: a ordem sai só dos números. Um segmento só pode confirmar bytes que o outro já mandou, e um ACK puro vem antes dos dados com o mesmo seq." : certos + " de 10 no lugar certo. Comece pelo SYN sem ack e, a cada passo, procure quem pode vir a seguir.");
                if (ok) concluir();
            }), fb);
        mostra();
    });
}());
