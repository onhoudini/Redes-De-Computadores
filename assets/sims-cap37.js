/* Simulações do Capítulo 37 — Prática: análise de capturas de pacotes (seção 4.11 do livro, pág. 316–319 do PDF).
 * A captura é a do livro (curl -6 http://www.computer-networking.info), transcrita das págs. 316–317. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function escolha(rotulo, lista, vazio) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            vazio === false ? null : el("option", { value: "" }, "escolha…"),
            lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    function linhaPergunta(texto, controle) {
        return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, texto), el("div", { class: "col-sm-5" }, controle));
    }
    function texto(rotulo) { return el("input", { type: "text", inputmode: "decimal", class: "form-control form-control-sm mono", "aria-label": rotulo, autocomplete: "off", spellcheck: "false" }); }
    function numero(v) { return Number(String(v).replace(",", ".").trim()); }

    var CLI = "2001:6a8:308f:9:0:82ff:fe68:e51c", SRV = "2001:6a8:308f:8:0:82ff:fe68:e48c";
    var LINHAS = [
        "15:50:39.827908 IP 130.104.229.28.38417 > 130.104.230.68.53: 38133+ AAAA? www.computer-networking.info. (46)",
        "15:50:39.828793 IP 130.104.230.68.53 > 130.104.229.28.38417: 38133 3/4/8 CNAME cnp3book.info.ucl.ac.be., CNAME cnp3.info.ucl.ac.be., AAAA 2001:6a8:308f:8:0:82ff:fe68:e48c (385)",
        "15:50:39.829353 IP6 " + CLI + ".34598 > " + SRV + ".80: Flags [S], seq 2681184541, win 28800, options [mss 1440,sackOK,TS val 609493767 ecr 0,nop,wscale 7], length 0",
        "15:50:39.830043 IP6 " + SRV + ".80 > " + CLI + ".34598: Flags [S.], seq 3804204915, ack 2681184542, win 28560, options [mss 1440,sackOK,TS val 1646122290 ecr 609493767,nop,wscale 7], length 0",
        "15:50:39.830074 IP6 " + CLI + ".34598 > " + SRV + ".80: Flags [.], ack 1, win 225, options [nop,nop,TS val 609493768 ecr 1646122290], length 0",
        "15:50:39.830258 IP6 " + CLI + ".34598 > " + SRV + ".80: Flags [P.], seq 1:93, ack 1, win 225, options [nop,nop,TS val 609493768 ecr 1646122290], length 92: HTTP: GET / HTTP/1.1",
        "15:50:39.830750 IP6 " + SRV + ".80 > " + CLI + ".34598: Flags [.], ack 93, win 224, options [nop,nop,TS val 1646122290 ecr 609493768], length 0",
        "15:50:39.841255 IP6 " + SRV + ".80 > " + CLI + ".34598: Flags [P.], seq 1:458, ack 93, win 224, options [nop,nop,TS val 1646122301 ecr 609493768], length 457: HTTP: HTTP/1.1 302 Found",
        "15:50:39.841270 IP6 " + CLI + ".34598 > " + SRV + ".80: Flags [.], ack 458, win 234, options [nop,nop,TS val 609493779 ecr 1646122301], length 0",
        "15:50:39.843259 IP6 " + CLI + ".34598 > " + SRV + ".80: Flags [F.], seq 93, ack 458, win 234, options [nop,nop,TS val 609493781 ecr 1646122301], length 0",
        "15:50:39.862246 IP6 " + SRV + ".80 > " + CLI + ".34598: Flags [F.], seq 458, ack 94, win 224, options [nop,nop,TS val 1646122317 ecr 609493781], length 0",
        "15:50:39.862265 IP6 " + CLI + ".34598 > " + SRV + ".80: Flags [.], ack 459, win 234, options [nop,nop,TS val 609493800 ecr 1646122317], length 0"
    ];
    var ISN = { cli: 2681184541, srv: 3804204915 };
    function parse(l) {
        var m = /^(\d+):(\d+):([\d.]+) (IP6?) (\S+)\.(\d+) > (\S+)\.(\d+): (.*)$/.exec(l);
        var p = { t: Number(m[3]) + 60 * Number(m[2]), ipv: m[4] === "IP6" ? 6 : 4, src: m[5], sport: Number(m[6]), dst: m[7], dport: Number(m[8]), resto: m[9] };
        p.tcp = /Flags \[/.test(p.resto); p.udp = !p.tcp; p.dns = p.sport === 53 || p.dport === 53;
        if (p.tcp) {
            var f = /Flags \[([^\]]+)\]/.exec(p.resto)[1];
            p.syn = f.indexOf("S") >= 0 ? 1 : 0; p.fin = f.indexOf("F") >= 0 ? 1 : 0; p.push = f.indexOf("P") >= 0 ? 1 : 0; p.ackf = f.indexOf(".") >= 0 ? 1 : 0;
            var s = /seq (\d+)(?::(\d+))?/.exec(p.resto); p.seq = s ? Number(s[1]) : null;
            var a = /ack (\d+)/.exec(p.resto); p.ack = a ? Number(a[1]) : null;
            p.win = Number(/win (\d+)/.exec(p.resto)[1]);
            p.len = Number(/length (\d+)/.exec(p.resto)[1]);
            p.doCliente = p.sport === 34598;
            var mss = /mss (\d+)/.exec(p.resto); if (mss) p.mss = Number(mss[1]);
            var ws = /wscale (\d+)/.exec(p.resto); if (ws) p.wscale = Number(ws[1]);
        } else { p.len = Number(/\((\d+)\)$/.exec(p.resto)[1]); }
        return p;
    }
    var PACOTES = LINHAS.map(parse);
    R.pacotes37 = PACOTES;
    R.isn37 = ISN;
    // Números absolutos: o tcpdump mostra relativos a partir do terceiro segmento TCP.
    function absoluto(p, campo) {
        var v = p[campo]; if (v === null || v === undefined) return null;
        if (p.syn) return v;
        var base = campo === "seq" ? (p.doCliente ? ISN.cli : ISN.srv) : (p.doCliente ? ISN.srv : ISN.cli);
        return base + v;
    }
    R.absoluto37 = absoluto;

    var CAMPOS = [
        [/^\d+:\d+:[\d.]+/, "Hora da captura, com microssegundos."],
        [/^IP6? /, "IP: pacote IPv4; IP6: pacote IPv6."],
        [/ > /, "origem.porta > destino.porta: o último número de cada endereço é a porta."],
        [/Flags \[S\]/, "Flags [S]: SYN, o primeiro segmento da abertura."],
        [/Flags \[S\.\]/, "Flags [S.]: SYN e ACK, a resposta do servidor."],
        [/Flags \[P\.\]/, "Flags [P.]: dados com PUSH (o segmento esvazia o buffer de envio) e ACK."],
        [/Flags \[F\.\]/, "Flags [F.]: FIN e ACK, quem manda terminou de enviar."],
        [/Flags \[\.\]/, "Flags [.]: só o ACK ligado, sem dados."],
        [/seq \d+:\d+/, "seq a:b: o segmento leva os bytes de a até b − 1 (números relativos)."],
        [/win \d+/, "win: a janela anunciada, que ainda deve ser multiplicada por 2^wscale."],
        [/mss 1440/, "mss 1440: o maior segmento que o lado aceita (1440 = 1500 − 40 do IPv6 − 20 do TCP)."],
        [/TS val/, "TS val/ecr: a opção de timestamps (RFC 7323)."],
        [/AAAA\?/, "38133+ AAAA?: consulta DNS de id 38133, com recursão pedida (+), por um registro AAAA."],
        [/3\/4\/8/, "3/4/8: três registros na resposta, quatro na autoridade, oito adicionais."]
    ];
    R.registrar("leitor-captura", function (raiz) {
        var expl = el("ul", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var lista = el("div", { class: "log mono small", style: "max-height: 320px" }, LINHAS.map(function (l, i) {
            return el("button", { type: "button", class: "btn btn-link btn-sm p-0 text-start d-block mono", style: "white-space: normal; word-break: break-all", onclick: function () {
                expl.replaceChildren.apply(expl, [el("li", { class: "fw-semibold" }, "Linha " + (i + 1) + ":")].concat(CAMPOS.filter(function (c) { return c[0].test(l); }).map(function (c) { return el("li", null, c[1]); })));
            } }, (i + 1) + ". " + l);
        }));
        var P1 = escolha("Tipo de consulta DNS", [["A", "A"], ["AAAA", "AAAA"], ["CNAME", "CNAME"]]), P2 = texto("Bytes da resposta HTTP"), P3 = texto("MSS anunciado");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "leitor-captura", 15, "Lendo o tcpdump");
        raiz.append(el("p", { class: "small mb-1" }, "tcpdump -n -r simple-trace.pcap (a captura das págs. 316–317 do PDF). Clique numa linha para ver o que cada campo quer dizer."), lista, expl,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Que tipo de registro o curl pediu ao DNS?", P1),
            linhaPergunta("Quantos bytes de dados tem a resposta HTTP do servidor?", P2),
            linhaPergunta("Que MSS os dois lados anunciam?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === "AAAA" && numero(P2.value) === 457 && numero(P3.value) === 1440;
                u.marca(fb, ok, ok ? "Isso: o curl pediu um AAAA porque usou -6; a resposta 302 coube num segmento de 457 bytes." : "Ainda não. Clique nas linhas 1, 3 e 8.");
                if (ok) concluir();
            }), fb);
    });

    /* ---------- Números relativos e absolutos ---------- */
    R.registrar("seq-relativos", function (raiz) {
        var modo = escolha("Números", [["rel", "relativos (o padrão do tcpdump)"], ["abs", "absolutos (tcpdump -S)"]], false);
        var tabela = el("div", { class: "table-responsive" });
        function mostra() {
            var abs = modo.value === "abs";
            tabela.replaceChildren(el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "#"), el("th", null, "Sentido"), el("th", null, "Flags"), el("th", null, "seq"), el("th", null, "ack"), el("th", null, "Dados"))),
                el("tbody", null, PACOTES.map(function (p, i) {
                    if (!p.tcp) return null;
                    var s = abs ? absoluto(p, "seq") : p.seq, a = abs ? absoluto(p, "ack") : p.ack;
                    var fl = (p.syn ? "S" : "") + (p.fin ? "F" : "") + (p.push ? "P" : "") + (p.ackf ? "." : "");
                    return el("tr", null, el("td", null, String(i + 1)), el("td", null, p.doCliente ? "C → S" : "S → C"), el("td", null, fl), el("td", null, s === null ? "—" : String(s)), el("td", null, a === null ? "—" : String(a)), el("td", null, String(p.len)));
                }).filter(Boolean))));
        }
        modo.addEventListener("change", mostra);
        var P1 = texto("ack absoluto"), P2 = texto("seq absoluto do FIN do servidor");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "seq-relativos", 15, "Números de sequência relativos");
        raiz.append(u.campo("Mostrar os números", modo), tabela,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): calcule sem trocar a tabela para absolutos."),
            linhaPergunta("O servidor confirma o pedido com ack 93 (relativo). Qual é o número absoluto?", P1),
            linhaPergunta("O FIN do servidor tem seq 458 (relativo). Qual é o número absoluto?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = numero(P1.value) === ISN.cli + 93 && numero(P2.value) === ISN.srv + 458;
                u.marca(fb, ok, ok ? "Isso: relativo + número inicial (ISN) de quem mandou os bytes." : "Ainda não. O ack do servidor conta bytes do cliente: some ao ISN do cliente.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Follow TCP stream e flow graph ---------- */
    R.registrar("fluxo-captura", function (raiz) {
        var ev = [];
        var t0 = PACOTES[2].t;
        PACOTES.forEach(function (p) {
            if (!p.tcp) return;
            var fl = (p.syn ? "SYN" : "") + (p.fin ? "FIN" : "") + (p.push ? "PSH" : "") + (p.ackf ? (p.syn || p.fin || p.push ? ",ACK" : "ACK") : "");
            var rot = ((p.t - t0) * 1000).toFixed(3).replace(".", ",") + " ms  " + fl + (p.len ? " " + p.len + " B" : "");
            ev.push(p.doCliente ? { de: 0, para: 1, rotulo: rot, tipo: p.len ? null : "tracejado" } : { de: 1, para: 0, rotulo: rot, tipo: p.len ? null : "tracejado" });
        });
        var diagrama = R.diagramaSequencia({ titulo: "Flow graph da conexão", colunas: ["cliente :34598", "servidor :80"], eventos: ev, largura: 560, margem: 110, passo: 26 });
        var stream = el("pre", { class: "log mt-2 mb-1" }, "GET / HTTP/1.1\n(… 92 bytes de pedido …)\n\nHTTP/1.1 302 Found\n(… 457 bytes de resposta: cabeçalhos e a página que manda usar https …)");
        var P1 = texto("RTT do handshake em ms"), P2 = texto("Tempo de resposta do servidor em ms"), P3 = texto("Janela real em bytes");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "fluxo-captura", 15, "O flow graph");
        raiz.append(el("p", { class: "small mb-1" }, "O flow graph do Wireshark, montado a partir da captura (tempos contados a partir do SYN):"), diagrama,
            el("p", { class: "small mb-0" }, "Follow TCP stream (os conteúdos completos não estão no livro):"), stream,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): respostas com três casas, em ms ou bytes."),
            linhaPergunta("Quanto tempo vai do SYN ao SYN+ACK (um RTT, visto do cliente)?", P1),
            linhaPergunta("Quanto tempo o servidor levou entre receber o pedido (segmento 6) e mandar a resposta (segmento 8)?", P2),
            linhaPergunta("O cliente anuncia win 225 depois de wscale 7. Qual é a janela real, em bytes?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var rtt = (PACOTES[3].t - PACOTES[2].t) * 1000, resp = (PACOTES[7].t - PACOTES[5].t) * 1000;
                var ok = Math.abs(numero(P1.value) - rtt) < 0.002 && Math.abs(numero(P2.value) - resp) < 0.002 && numero(P3.value) === 225 * 128;
                u.marca(fb, ok, ok ? "Isso: 0,690 ms de RTT, quase 11 ms de processamento no servidor e uma janela de 28 800 bytes." : "Ainda não. Subtraia as horas das linhas (os últimos dígitos são microssegundos).");
                if (ok) concluir();
            }), fb);
    });

    /* ---------- Filtros de exibição ---------- */
    function filtra(expr) {
        // Mini-linguagem no estilo do Wireshark: campo op valor, &&, ||, !, parênteses.
        var tokens = expr.match(/\(|\)|&&|\|\||!=|==|>=|<=|>|<|!|[A-Za-z_.0-9:]+/g) || [];
        var i = 0;
        function campo(p, nome) {
            var mapa = { "ipv6": p.ipv === 6, "ip": p.ipv === 4, "tcp": p.tcp, "udp": p.udp, "dns": p.dns, "http": p.tcp && (p.sport === 80 || p.dport === 80) && p.len > 0,
                "tcp.port": p.tcp ? [p.sport, p.dport] : null, "udp.port": p.udp ? [p.sport, p.dport] : null, "tcp.srcport": p.tcp ? p.sport : null, "tcp.dstport": p.tcp ? p.dport : null,
                "tcp.len": p.tcp ? p.len : null, "tcp.flags.syn": p.syn, "tcp.flags.fin": p.fin, "tcp.flags.push": p.push, "tcp.flags.ack": p.ackf, "tcp.window_size_value": p.win };
            if (!(nome in mapa)) throw new Error("campo desconhecido: " + nome);
            return mapa[nome];
        }
        function cmp(v, op, x) {
            if (Array.isArray(v)) return v.some(function (y) { return cmp(y, op, x); });
            if (v === null || v === undefined) return false;
            var n = Number(x);
            switch (op) { case "==": return v == n; case "!=": return v != n; case ">": return v > n; case "<": return v < n; case ">=": return v >= n; case "<=": return v <= n; }
            return false;
        }
        function prim(p) {
            var t = tokens[i++];
            if (t === "!") return !prim(p);
            if (t === "(") { var v = ou(p); i++; return v; }
            if (["==", "!=", ">", "<", ">=", "<="].indexOf(tokens[i]) >= 0) { var op = tokens[i++], x = tokens[i++]; return cmp(campo(p, t), op, x); }
            var c = campo(p, t); return Array.isArray(c) ? true : !!c;
        }
        function e(p) { var v = prim(p); while (tokens[i] === "&&") { i++; var w = prim(p); v = v && w; } return v; }
        function ou(p) { var v = e(p); while (tokens[i] === "||") { i++; var w = e(p); v = v || w; } return v; }
        return PACOTES.map(function (p, k) { i = 0; return ou(p) ? k + 1 : 0; }).filter(Boolean);
    }
    R.filtra37 = filtra;
    R.registrar("filtros-exibicao", function (raiz) {
        var f = el("input", { type: "text", class: "form-control form-control-sm mono", value: "tcp.flags.syn == 1", "aria-label": "Filtro de exibição", spellcheck: "false" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var ultimo = { expr: "", res: [] };
        function aplica() {
            try {
                var r = filtra(f.value); ultimo = { expr: f.value, res: r };
                saida.replaceChildren(el("p", { class: "mb-1" }, r.length + " pacote(s): " + (r.length ? r.join(", ") : "nenhum")),
                    el("pre", { class: "log mb-0", style: "white-space: pre-wrap; word-break: break-all" }, r.map(function (k) { return k + ". " + LINHAS[k - 1].slice(0, 140); }).join("\n")));
            } catch (e) { saida.replaceChildren(el("p", { class: "quiz-no mb-0" }, "Filtro inválido: " + e.message)); }
        }
        f.addEventListener("input", aplica);
        var P1 = texto("Pacotes com dados"), fb = u.feedback();
        var concluir = R.desafio(raiz, "filtros-exibicao", 10, "Filtros de exibição");
        raiz.append(el("p", { class: "small mb-1" }, "Campos aceitos: ip, ipv6, tcp, udp, dns, http, tcp.port, udp.port, tcp.srcport, tcp.dstport, tcp.len, tcp.flags.syn, tcp.flags.fin, tcp.flags.push, tcp.flags.ack, tcp.window_size_value; operadores ==, !=, >, <, >=, <=, &&, ||, ! e parênteses."),
            u.campo("Filtro", f), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): escreva um filtro que mostre só os segmentos TCP que levam dados e diga quantos são."),
            linhaPergunta("Quantos segmentos TCP levam dados?", P1),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certo = filtra("tcp.len > 0");
                var ok = numero(P1.value) === certo.length && ultimo.res.join() === certo.join() && /tcp/.test(ultimo.expr);
                u.marca(fb, ok, ok ? "Isso: só o pedido (92 bytes) e a resposta (457 bytes). Os outros 8 segmentos são de controle." : "Ainda não. O filtro atual precisa mostrar exatamente os segmentos com dados, e a contagem tem de bater.");
                if (ok) concluir();
            }), fb);
        aplica();
    });
}());
