/* Simulações do Capítulo 39 — Prática: o TCP de perto (seção 4.13 do livro, pág. 319–336 do PDF).
 * Os scripts packetdrill e os valores impressos são os do livro (pág. 320–330). */
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
    function campo(rotulo) { return el("input", { type: "text", inputmode: "decimal", class: "form-control form-control-sm mono", "aria-label": rotulo, autocomplete: "off" }); }
    function num(v) { return Number(String(v).replace(",", ".").trim()); }

    /* ---------- Atividade 1: o connect.pkt passo a passo ---------- */
    var CONNECT = [
        ["0 socket(..., SOCK_STREAM, IPPROTO_TCP) = 3", "Chamada de sistema no instante 0: cria o socket e confere que o descritor devolvido é 3 (0, 1 e 2 já são entrada, saída e erro)."],
        ["+0 setsockopt(3, SOL_SOCKET, SO_REUSEADDR, [1], 4) = 0", "Permite reusar o endereço."],
        ["+0 bind(3, ..., ...) = 0", "Liga o socket aos endereços disponíveis (por padrão, porta 8080)."],
        ["+0 listen(3, 1) = 0", "O socket passa a aceitar conexões."],
        ["+0 < S 0:0(0) win 1000 <mss 1000>", "< : o packetdrill injeta um segmento, como se viesse da rede. S: SYN, sem dados (0:0(0)), janela de 1000 bytes e MSS 1000.", "c", "SYN"],
        ["+0 > S. 0:0(0) ack 1 <...>", "> : o packetdrill espera este segmento do kernel. S.: SYN e ACK, ack 1 (números relativos). <...> aceita quaisquer opções.", "s", "SYN+ACK"],
        ["+.1 < . 1:1(0) ack 1 win 1000", "0,1 s depois, o terceiro segmento da abertura: só ACK.", "c", "ACK"],
        ["+0 accept(3, ..., ...) = 4", "A conexão está aberta: accept devolve um novo descritor, 4."],
        ["+0 write(4, ..., 10) = 10", "A aplicação escreve 10 bytes."],
        ["+0 > P. 1:11(10) ack 1", "O kernel manda os 10 bytes (1 a 10) com PUSH, porque o buffer de envio esvaziou.", "s", "1:11(10)"],
        ["+.1 < . 1:1(0) ack 11 win 1000", "O packetdrill confirma os 10 bytes.", "c", "ack 11"],
        ["+.1 < P. 1:3(2) ack 11 win 4000", "Agora o packetdrill manda 2 bytes de dados.", "c", "1:3(2)"],
        ["+0 > . 11:11(0) ack 3", "O kernel confirma: ack 3.", "s", "ack 3"],
        ["+.2 read(4, ..., 1000) = 2", "A aplicação lê os 2 bytes disponíveis, com um buffer de 1000."],
        ["+0 < F. 3:3(0) ack 11 win 4000", "O packetdrill fecha o seu sentido com FIN.", "c", "FIN"],
        ["+0 > . 11:11(0) ack 4", "O kernel confirma o FIN: ack 4 (o FIN consome um número).", "s", "ack 4"],
        ["+0 close(4) = 0", "A aplicação fecha o socket."],
        ["+0 > F. 11:11(0) ack 4", "O kernel manda o seu FIN.", "s", "FIN"],
        ["+0 < . 4:4(0) ack 12 win 4000", "O packetdrill confirma o FIN do kernel: ack 12.", "c", "ack 12"]
    ];
    R.connect39 = CONNECT;
    R.registrar("packetdrill-passo", function (raiz) {
        var passo = 0;
        var lista = el("ol", { class: "small mono mb-1 ps-4" }), expl = el("p", { class: "small mb-1", "aria-live": "polite" }), diag = el("div");
        function mostra() {
            lista.replaceChildren.apply(lista, CONNECT.map(function (l, i) { return el("li", { class: i === passo - 1 ? "fw-bold" : (i < passo ? "" : "text-muted") }, l[0]); }));
            expl.textContent = passo ? CONNECT[passo - 1][1] : "Avance linha por linha. Linhas com < são injetadas pelo packetdrill (o \"cliente\"); com >, são o que o kernel deve mandar.";
            var ev = CONNECT.slice(0, passo).filter(function (l) { return l[2]; }).map(function (l) { return l[2] === "c" ? { de: 0, para: 1, rotulo: l[3] } : { de: 1, para: 0, rotulo: l[3] }; });
            diag.replaceChildren(R.diagramaSequencia({ titulo: "connect.pkt", colunas: ["packetdrill (cliente)", "kernel Linux"], eventos: ev.length ? ev : [{ espaco: 1 }], largura: 520, margem: 120, passo: 22 }));
        }
        var P1 = campo("Valor devolvido por accept"), P2 = campo("ack do kernel aos 2 bytes"), P3 = campo("ack final do packetdrill");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "packetdrill-passo", 15, "O connect.pkt");
        raiz.append(el("div", { class: "d-flex gap-2 mb-2" }, u.botao("◀ Linha anterior", "btn-outline-primary", function () { if (passo > 0) passo--; mostra(); }), u.botao("Próxima linha ▶", "btn-primary", function () { if (passo < CONNECT.length) passo++; mostra(); })),
            lista, expl, diag,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Que descritor o accept devolve?", P1), linhaPergunta("Depois de receber 1:3(2), que ack o kernel manda?", P2),
            linhaPergunta("Com que ack o packetdrill confirma o FIN do kernel?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = num(P1.value) === 4 && num(P2.value) === 3 && num(P3.value) === 12;
                u.marca(fb, ok, ok ? "Isso: 4, 3 e 12. O FIN do kernel tem seq 11 e consome um número, por isso o ack 12." : "Ainda não. Avance o script até as linhas das perguntas.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 2: estados da conexão (tcpi_state) ---------- */
    var NOMES_ESTADO = { 1: "ESTABLISHED", 2: "SYN_SENT", 3: "SYN_RECV", 4: "FIN_WAIT1", 5: "FIN_WAIT2", 6: "TIME_WAIT", 7: "CLOSE", 8: "CLOSE_WAIT", 9: "LAST_ACK", 10: "LISTEN", 11: "CLOSING" };
    var CENARIOS_EST = {
        client: { nome: "client.pkt: abertura normal", linhas: [["+0 connect(4, ...) = -1 EINPROGRESS", 7], ["+0 > S 0:0(0) <mss 1000>", 2, true], ["+.1 < S. 0:0(0) ack 1 win 10000 <mss 1000>", 2], ["+0 > . 1:1(0) ack 1", 1, true]] },
        dual: { nome: "dual.pkt: abertura simultânea", linhas: [["+0 > S 0:0(0) <mss 1000>", 2, true], ["+.1 < S 0:0(0) win 5792 <mss 1000>", 3, true], ["+0 > S. 0:0(0) ack 1 <mss 1000>", 3, true], ["+.1 < . 1:1(0) ack 1 win 5792", 1, true]] },
        local: { nome: "local-close.pkt: o host local fecha primeiro", linhas: [["+.1 close(4) = 0 / > F. 1:1(0) ack 1", 4], ["+0 < . 1:1(0) ack 2", 5], ["+.1 < F. 1:1(0) ack 2", 6], ["+0 > . 2:2(0) ack 2", 6]] },
        local2: { nome: "local-close2.pkt: o remoto manda o FIN junto com o ACK", linhas: [["+.1 close(4) = 0 / > F. 1:1(0) ack 1", 4], ["+.1 < F. 1:1(0) ack 2", 6], ["+0 > . 2:2(0) ack 2", 6]] },
        remoto: { nome: "remote-close.pkt: o remoto fecha primeiro", linhas: [["+.1 < F. 1:1(0) ack 1", 8], ["+0 > . 1:1(0) ack 2", 8], ["+.1 close(4) = 0 / > F. 1:1(0) ack 2", 9], ["+0 < . 2:2(0) ack 2", 7]] }
    };
    R.cenariosEstado39 = CENARIOS_EST;
    R.registrar("estados-tcp", function (raiz) {
        var cen = escolha("Script", Object.keys(CENARIOS_EST).map(function (k) { return [k, CENARIOS_EST[k].nome]; }), false);
        var tabela = el("div", { class: "table-responsive" });
        function mostra() {
            var c = CENARIOS_EST[cen.value];
            tabela.replaceChildren(el("table", { class: "table table-sm small mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Linha do script"), el("th", null, "tcpi_state depois"), el("th", null, "Fonte"))),
                el("tbody", null, c.linhas.map(function (l) { return el("tr", null, el("td", { class: "mono" }, l[0]), el("td", null, l[1] + " (" + NOMES_ESTADO[l[1]] + ")"), el("td", { class: "small" }, l[2] ? "impresso no livro" : "máquina de estados (complemento)")); }))));
        }
        cen.addEventListener("change", mostra);
        var P1 = campo("Estado depois do SYN recebido na abertura simultânea"), P2 = escolha("Estado depois do FIN do remoto", Object.keys(NOMES_ESTADO).map(function (k) { return [k, k + " " + NOMES_ESTADO[k]]; }));
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "estados-tcp", 10, "Os estados da conexão");
        raiz.append(u.campo("Script", cen), tabela,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Em dual.pkt, que número o State@2 imprime, depois de receber o SYN do outro lado?", P1),
            linhaPergunta("Em remote-close.pkt, em que estado o host local fica ao receber o FIN do remoto?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = num(P1.value) === 3 && P2.value === "8";
                u.marca(fb, ok, ok ? "Isso: 3 (SYN_RECV), como o livro imprime; e CLOSE_WAIT, à espera de que a aplicação chame close." : "Ainda não. Escolha cada script e leia a tabela.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 3: o rto e a retransmissão rápida ---------- */
    var RTO = [["antes de enviar", 204000], ["depois do ACK de 1001 (o RTT foi medido)", 216000], ["depois da 1ª retransmissão (+0,216 s)", 432000], ["depois da 2ª (+0,432 s)", 864000], ["depois da 3ª (+0,864 s)", 1728000]];
    R.rto39 = RTO;
    R.registrar("rto-frr", function (raiz) {
        var g = s("svg", { viewBox: "0 0 560 170", class: "sim-svg w-100", style: "max-height:200px", role: "img", "aria-label": "Valores do rto impressos pelo script rto.pkt." });
        var grupo = s("g", { "font-size": 11 });
        grupo.append(s("rect", { x: 0, y: 0, width: 560, height: 170, style: "fill: var(--bs-body-bg)" }));
        RTO.forEach(function (r, i) {
            var h = r[1] / 1728000 * 120;
            grupo.append(s("rect", { x: 30 + i * 105, y: 140 - h, width: 70, height: h, class: "pacote" }), s("text", { x: 65 + i * 105, y: 135 - h, "text-anchor": "middle" }, (r[1] / 1000) + " ms"),
                s("text", { x: 65 + i * 105, y: 160, "text-anchor": "middle" }, "RTO @" + (i + 1)));
        });
        g.append(s("title", null, "rto.pkt"), grupo);
        var tabela = el("table", { class: "table table-sm small mb-0" }, el("tbody", null, RTO.map(function (r, i) { return el("tr", null, el("td", { class: "mono" }, "RTO @" + (i + 1)), el("td", null, r[0]), el("td", { class: "mono" }, String(r[1]))); })));
        var P1 = campo("Próximo RTO em microssegundos"), P2 = campo("Bytes retransmitidos no frr-rto2");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "rto-frr", 10, "O rto e a retransmissão rápida");
        raiz.append(el("p", { class: "small mb-1" }, "Valores de tcpi_rto impressos pelo rto.pkt (pág. 320 do PDF), em microssegundos:"), g, tabela,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Se a 4ª retransmissão também se perdesse, que valor o RTO @6 imprimiria?", P1),
            linhaPergunta("No frr-rto2.pkt, três segmentos de 1000 bytes se perdem. Quantos bytes o último tcpi_bytes_retrans mostra?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = num(P1.value) === 3456000 && num(P2.value) === 3000;
                u.marca(fb, ok, ok ? "Isso: o rto dobra a cada expiração (recuo exponencial); e o kernel retransmite só os três segmentos perdidos." : "Ainda não. Dobre o último rto; para os bytes, conte os segmentos marcados como perdidos.");
                if (ok) concluir();
            }), fb);
    });

    /* ---------- Atividade 4: a cwnd no Linux ---------- */
    var CWND = {
        ss: { nome: "slow-start.pkt (um ACK por segmento)", v: [["início", 2], ["ack 1001", 3], ["ack 2001", 4], ["ack 3001", 5], ["ack 4001", 6], ["ack 5001", 7], ["ack 6001", 8], ["ack 7001", 9], ["ack 16001", 18]] },
        atr: { nome: "slow-start-delayed.pkt (ACK atrasado)", v: [["início", 2], ["ack 2001", 4], ["ack 4001", 6], ["ack 6001", 8], ["ack 8001", 10], ["ack 16001", 18]] },
        rto2: { nome: "slow-start-rto2.pkt (perda do penúltimo segmento)", v: [["início", 2], ["ack 1001", 3], ["ack 2001", 4], ["ack 3001", 5], ["ack 4001", 6], ["ack 5001", 7], ["ack 6001", 8], ["ack 6001 (duplicado)", 8], ["retransmissão por RTO", 1], ["ack 8001", 3]] },
        frr2: { nome: "slow-start-frr2.pkt (perda do segundo segmento)", v: [["início", 2], ["ack 1001", 3], ["ack 1001 (dup)", 3], ["ack 1001 (dup)", 3], ["ack 1001 (3º dup)", 2], ["ack 1001 (dup)", 2], ["ack 6001", 2], ["ack 7001", 4], ["ack 8001", 5]] },
        frr3: { nome: "slow-start-frr3.pkt (perda do primeiro segmento)", v: [["início", 2], ["ack 1 (dup)", 2], ["ack 1 (dup)", 2], ["ack 1 (3º dup)", 1], ["ack 4001", 2], ["ack 6001", 4], ["ack 8001", 4]] }
    };
    R.cwnd39 = CWND;
    R.registrar("diagrama-cwnd", function (raiz) {
        var cen = escolha("Script", Object.keys(CWND).map(function (k) { return [k, CWND[k].nome]; }), false);
        var g = s("svg", { viewBox: "0 0 560 220", class: "sim-svg w-100", style: "max-height:240px", role: "img", "aria-label": "Evolução da cwnd impressa pelo script." });
        function mostra() {
            var v = CWND[cen.value].v, W = 520 / v.length, grupo = s("g", { "font-size": 10 });
            grupo.append(s("rect", { x: 0, y: 0, width: 560, height: 220, style: "fill: var(--bs-body-bg)" }));
            v.forEach(function (p, i) {
                var h = p[1] / 18 * 150;
                grupo.append.apply(grupo, [s("rect", { x: 30 + i * W + 4, y: 175 - h, width: W - 8, height: h, class: "pacote" }), s("text", { x: 30 + i * W + W / 2, y: 170 - h, "text-anchor": "middle", "font-size": 12 }, String(p[1])),
                    s("text", { x: 30 + i * W + W / 2, y: 192, "text-anchor": "middle" }, p[0].replace(/ \(.*\)/, "")), p[0].indexOf("(") >= 0 ? s("text", { x: 30 + i * W + W / 2, y: 205, "text-anchor": "middle" }, p[0].replace(/^.*\(/, "(")) : null].filter(Boolean));
            });
            g.replaceChildren(s("title", null, "cwnd em segmentos"), grupo);
        }
        cen.addEventListener("change", mostra);
        var P1 = campo("cwnd depois"), P2 = escolha("Regra do slow start no Linux", [["seg", "a cwnd cresce o número de segmentos que o ACK confirma"], ["um", "a cwnd cresce 1 por ACK, sempre"], ["dobra", "a cwnd dobra a cada ACK"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "diagrama-cwnd", 15, "A cwnd no Linux");
        raiz.append(u.campo("Script", cen), g, el("p", { class: "small text-muted" }, "Valores de tcpi_snd_cwnd impressos nos scripts das págs. 326–330 do PDF, em segmentos de 1000 bytes."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("No slow-start-delayed.pkt, a cwnd vale 10 quando chega o ack 16001, que confirma 8 segmentos de uma vez. Quanto ela passa a valer?", P1),
            linhaPergunta("Que regra explica os saltos de 9 para 18 e de 10 para 18?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = num(P1.value) === 18 && P2.value === "seg";
                u.marca(fb, ok, ok ? "Isso: no slow start, a cwnd cresce os segmentos confirmados (o \"appropriate byte counting\" da RFC 3465), e não um por ACK; com ACK atrasado, cada ACK vale dois." : "Ainda não. Compare quantos segmentos cada ACK confirma com o quanto a cwnd sobe.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 5: as questões abertas 4.13.2 ---------- */
    // Simulador de eventos com as hipóteses da pág. 326–327: RTT 100 ms, 1 ms por segmento, ACK sem tempo de transmissão, RTO 200 ms, limiar de 3 duplicados.
    function simulaTCP(o) {
        var x = o.x, mss = o.mss || 1000, rtt = 100, tx = 1, rtoV = 200, rwin = o.rwin || 2000;
        var st = { cwnd: o.cwnd || 1000, ss: o.ssthresh || 64000, una: 0, nxt: 0, dup: 0, livre: 0, corte: -1e9, timer: null };
        var rc = { esp: 0, fora: {}, pend: 0, timerAck: null, entregue: null };
        var ev = [], seq = 0, enviados = {}, log = [], fim = null;
        function ag(t, a) { ev.push({ t: Math.round(t * 1e6) / 1e6, k: seq++, a: a }); }
        function pega() { var m = 0; for (var i = 1; i < ev.length; i++) if (ev[i].t < ev[m].t || (ev[i].t === ev[m].t && ev[i].k < ev[m].k)) m = i; return ev.splice(m, 1)[0]; }
        function envia(t, ini, retx) {
            var tam = Math.min(mss, x - ini), i0 = Math.max(t, st.livre), f = i0 + tx, k = Math.floor(ini / mss);
            st.livre = f; enviados[k] = (enviados[k] || 0) + 1;
            var perdido = (o.perdas || []).indexOf(k) >= 0 && enviados[k] === 1;
            log.push({ tipo: "seg", t: i0, chega: f + rtt / 2, rot: ini + ":" + (ini + tam), perdido: perdido, retx: retx, cwnd: st.cwnd });
            if (!perdido) ag(f + rtt / 2, ["chega", ini, tam, (o.ecn || []).indexOf(k) >= 0 && enviados[k] === 1]);
            if (st.timer === null) { st.timer = f + rtoV; ag(st.timer, ["rto", st.timer]); }
        }
        function podeEnviar() { return st.nxt < x && st.nxt - st.una + Math.min(mss, x - st.nxt) <= Math.min(st.cwnd, rwin) + 1e-9; }
        function tenta(t) { while (podeEnviar()) { envia(t, st.nxt, false); st.nxt += Math.min(mss, x - st.nxt); } }
        function ack(t, ece) { ag(t + rtt / 2, ["ack", rc.esp, ece]); log.push({ tipo: "ack", t: t, chega: t + rtt / 2, rot: "ack " + rc.esp + (ece ? " ECE" : "") }); }
        ag(0, ["tenta"]);
        while (ev.length && fim === null) {
            var e = pega(), t = e.t, a = e.a;
            if (a[0] === "tenta") tenta(t);
            else if (a[0] === "chega") {
                if (a[1] === rc.esp) {
                    rc.esp += a[2];
                    while (rc.fora[rc.esp]) { delete rc.fora[rc.esp]; rc.esp += Math.min(mss, x - rc.esp); }
                    if (rc.esp >= x && rc.entregue === null) rc.entregue = t;
                    if (o.atrasado && !a[3]) {
                        rc.pend++;
                        if (rc.pend >= 2) { rc.pend = 0; rc.timerAck = null; ack(t, false); }
                        else if (rc.timerAck === null) { rc.timerAck = t + 50; ag(t + 50, ["atraso", rc.timerAck]); }
                    } else { rc.pend = 0; ack(t, a[3]); }
                } else if (a[1] > rc.esp) { rc.fora[a[1]] = true; ack(t, a[3]); }
                else ack(t, false);
            } else if (a[0] === "atraso") {
                if (rc.timerAck === a[1] && rc.pend) { rc.pend = 0; rc.timerAck = null; ack(t, false); }
            } else if (a[0] === "ack") {
                if (a[1] > st.una) {
                    st.una = a[1]; st.dup = 0;
                    if (a[2] && t - st.corte >= rtt) { st.ss = Math.max(st.cwnd / 2, 2 * mss); st.cwnd = st.ss; st.corte = t; log.push({ tipo: "nota", t: t, rot: "ECE: cwnd → " + Math.round(st.cwnd) }); }
                    else if (st.cwnd < st.ss) st.cwnd += mss;
                    else st.cwnd += mss * mss / st.cwnd;
                    st.timer = null;
                    if (st.una < st.nxt) { st.timer = t + rtoV; ag(st.timer, ["rto", st.timer]); }
                    if (st.una >= x) { fim = t; break; }
                    tenta(t);
                } else {
                    st.dup++;
                    if (st.dup === 3) {
                        st.ss = Math.max((st.nxt - st.una) / 2, 2 * mss); st.cwnd = st.ss; st.timer = null;
                        log.push({ tipo: "nota", t: t, rot: "3 duplicados: retransmissão rápida, cwnd → " + Math.round(st.cwnd) });
                        envia(t, st.una, true);
                    }
                }
            } else if (a[0] === "rto") {
                if (st.timer === a[1] && st.una < x) {
                    st.ss = Math.max((st.nxt - st.una) / 2, 2 * mss); st.cwnd = mss; st.timer = null;
                    log.push({ tipo: "nota", t: t, rot: "rto expira: cwnd → " + mss });
                    envia(t, st.una, true);
                }
            }
        }
        return { entregue: rc.entregue, ultimoAck: fim, log: log };
    }
    R.simulaTCP39 = simulaTCP;
    var QUESTOES = {
        q1: { nome: "Q1: cwnd 1000, rwin 2000, envia 3 KB", o: { x: 3000 } },
        q2: { nome: "Q2: cwnd inicial de 10 000 bytes", o: { x: 3000, cwnd: 10000 } },
        q3: { nome: "Q3: MSS de 500 bytes", o: { x: 3000, mss: 500, cwnd: 500 } },
        q5: { nome: "Q5: ACK atrasado (50 ms)", o: { x: 3000, atrasado: true } },
        q6: { nome: "Q6: cwnd 4000, rwin 64 000, 10 KB, sem marcas", o: { x: 10000, cwnd: 4000, rwin: 64000 } },
        q6a: { nome: "Q6a: o 2º segmento chega marcado (ECN)", o: { x: 10000, cwnd: 4000, rwin: 64000, ecn: [1] } },
        q6b: { nome: "Q6b: o 4º segmento chega marcado", o: { x: 10000, cwnd: 4000, rwin: 64000, ecn: [3] } },
        q7: { nome: "Q7: cwnd = ssthresh = 4000, o 2º segmento se corrompe", o: { x: 10000, cwnd: 4000, ssthresh: 4000, rwin: 64000, perdas: [1] } }
    };
    R.questoes39 = QUESTOES;
    function desenhaTCP(svgEl, r) {
        var tmax = Math.max.apply(null, r.log.map(function (l) { return l.chega || l.t; })) + 10, Y0 = 30, K = 360 / tmax, XS = 120, XR = 440;
        function Y(t) { return Y0 + t * K; }
        var g = s("g", { "font-size": 9 });
        g.append(s("rect", { x: 0, y: 0, width: 560, height: Y0 + 380, style: "fill: var(--bs-body-bg)" }));
        g.append(s("text", { x: XS, y: 18, "text-anchor": "middle", "font-size": 12, "font-weight": "bold" }, "emissor"), s("text", { x: XR, y: 18, "text-anchor": "middle", "font-size": 12, "font-weight": "bold" }, "receptor"),
            s("line", { x1: XS, y1: Y0, x2: XS, y2: Y0 + 370, class: "linha" }), s("line", { x1: XR, y1: Y0, x2: XR, y2: Y0 + 370, class: "linha" }));
        for (var t = 0; t <= tmax; t += 50) g.append(s("text", { x: XS - 8, y: Y(t) + 3, "text-anchor": "end" }, t + " ms"));
        r.log.forEach(function (l) {
            if (l.tipo === "seg") {
                var x2 = l.perdido ? (XS + XR) / 2 : XR, y2 = l.perdido ? (Y(l.t) + Y(l.chega)) / 2 : Y(l.chega);
                g.append(s("line", { x1: XS, y1: Y(l.t), x2: x2, y2: y2, stroke: l.retx ? "var(--warn)" : "var(--accent)", "stroke-width": 1.5 }));
                if (l.perdido) g.append(s("text", { x: x2, y: y2 + 4, "text-anchor": "middle", "font-size": 12 }, "✕"));
                g.append(s("text", { x: XS + 6, y: Y(l.t) - 2 }, l.rot + (l.retx ? " (retx)" : "")));
            } else if (l.tipo === "ack") {
                g.append(s("line", { x1: XR, y1: Y(l.t), x2: XS, y2: Y(l.chega), class: "linha", "stroke-dasharray": "3 3" }));
                g.append(s("text", { x: XR + 4, y: Y(l.t) + 3 }, l.rot));
            } else g.append(s("text", { x: 4, y: Y(l.t) + 3, "font-size": 10 }, "⚑", s("title", null, l.rot)));
        });
        svgEl.replaceChildren(s("title", null, "Diagrama de tempo"), g);
    }
    R.registrar("slowstart-diagrama", function (raiz) {
        var q = escolha("Questão", Object.keys(QUESTOES).map(function (k) { return [k, QUESTOES[k].nome]; }), false);
        var desenho = s("svg", { viewBox: "0 0 560 420", class: "sim-svg w-100", style: "max-height:460px", role: "img", "aria-label": "Diagrama de tempo entre emissor e receptor." });
        var saida = el("div", { class: "small mt-1", "aria-live": "polite" });
        function mostra() {
            var r = simulaTCP(QUESTOES[q.value].o);
            desenhaTCP(desenho, r);
            var notas = r.log.filter(function (l) { return l.tipo === "nota"; });
            saida.replaceChildren(el("p", { class: "mb-1" }, "Os dados chegam completos ao receptor em " + r.entregue + " ms; o emissor recebe o último ACK em " + r.ultimoAck + " ms."),
                notas.length ? el("ul", { class: "mb-0" }, notas.map(function (n) { return el("li", null, n.t + " ms: " + n.rot); })) : el("span"));
        }
        q.addEventListener("change", mostra);
        var P = ["Q1", "Q3", "Q5", "Q7"].map(function (k) { return campo("Entrega na " + k); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "slowstart-diagrama", 20, "As questões abertas");
        raiz.append(u.campo("Questão", q), desenho, saida,
            el("p", { class: "small text-muted" }, "Linhas cheias: segmentos (laranja: retransmissões); tracejadas: ACKs; ✕: segmento perdido; ⚑: evento no emissor. Numeração dos bytes a partir de 0, como nas figuras do livro."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (20 pts): calcule antes de escolher a questão. Em quantos ms os dados chegam completos ao receptor…"),
            linhaPergunta("…na Q1?", P[0]), linhaPergunta("…na Q3 (MSS de 500)?", P[1]), linhaPergunta("…na Q5 (ACK atrasado)?", P[2]), linhaPergunta("…na Q7 (segundo segmento corrompido)?", P[3]),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var esp = ["q1", "q3", "q5", "q7"].map(function (k) { return simulaTCP(QUESTOES[k].o).entregue; });
                var ok = P.every(function (p, i) { return num(p.value) === esp[i]; });
                u.marca(fb, ok, ok ? "Isso: 153, 255, 203 e 457 ms. MSS menor e ACK atrasado custam um RTT ou meio; a perda custa dois RTTs, mesmo com retransmissão rápida." : "Ainda não. Use a simulação para conferir cada questão.");
                if (ok) concluir();
            }), fb);
        mostra();
    });
}());
