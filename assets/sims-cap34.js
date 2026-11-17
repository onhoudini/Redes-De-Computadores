/* Simulações do Capítulo 34 — Prática: os protocolos de e-mail (seção 4.8 do livro, pág. 313–314 do PDF).
 * Servidores SMTP e POP3 emulados no navegador, com nomes e endereços de exemplo (RFC 2606). */
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
    function texto(rotulo) { return el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": rotulo, autocomplete: "off", spellcheck: "false" }); }

    // Um terminal estilo telnet: o usuário digita linhas; o servidor responde.
    function terminal(raiz, saudacao, responde, rotulo) {
        var tela = el("pre", { class: "log mb-2", style: "white-space: pre-wrap; max-height: 260px", "aria-live": "polite" });
        var entrada = el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": rotulo, autocomplete: "off", spellcheck: "false" });
        function escreve(t, quem) { tela.append(el("span", { class: quem === "c" ? "fw-semibold" : null }, (quem === "c" ? "C: " : "S: ") + t + "\n")); tela.scrollTop = tela.scrollHeight; }
        function envia() {
            var linha = entrada.value; entrada.value = "";
            escreve(linha, "c");
            responde(linha).forEach(function (r) { escreve(r, "s"); });
        }
        entrada.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); envia(); } });
        escreve(saudacao, "s");
        return { tela: tela, entrada: entrada, envia: envia, linha: el("div", { class: "d-flex gap-2" }, entrada, u.botao("Enviar linha", "btn-primary", envia)) };
    }

    /* ---------- SMTP (RFC 5321) ---------- */
    function ServidorSMTP() { this.estado = "inicio"; this.de = null; this.para = []; this.dados = []; this.entregues = []; }
    ServidorSMTP.prototype.linha = function (l) {
        if (this.estado === "dados") {
            if (l === ".") { this.entregues.push({ de: this.de, para: this.para.slice(), corpo: this.dados.join("\n") }); this.estado = "saudado"; this.de = null; this.para = []; this.dados = []; return ["250 2.0.0 Ok: mensagem aceita para entrega"]; }
            this.dados.push(l.indexOf("..") === 0 ? l.slice(1) : l); return [];
        }
        var cmd = l.trim().split(/\s+/)[0].toUpperCase(), arg = l.trim().slice(cmd.length).trim();
        if (cmd === "HELO" || cmd === "EHLO") {
            this.estado = "saudado";
            return cmd === "EHLO" ? ["250-mail.example.org", "250-SIZE 10240000", "250 8BITMIME"] : ["250 mail.example.org"];
        }
        if (cmd === "QUIT") { this.estado = "fim"; return ["221 2.0.0 Bye"]; }
        if (cmd === "NOOP") return ["250 Ok"];
        if (cmd === "RSET") { this.de = null; this.para = []; return ["250 Ok"]; }
        if (this.estado === "inicio") return ["503 5.5.1 Error: send HELO/EHLO first"];
        if (cmd === "MAIL") { if (!/^FROM:\s*<[^>]*>$/i.test(arg)) return ["501 5.5.4 Syntax: MAIL FROM:<endereço>"]; this.de = arg.replace(/^FROM:\s*/i, ""); return ["250 2.1.0 Ok"]; }
        if (cmd === "RCPT") {
            if (!this.de) return ["503 5.5.1 Error: need MAIL command"];
            if (!/^TO:\s*<[^>]+>$/i.test(arg)) return ["501 5.5.4 Syntax: RCPT TO:<endereço>"];
            var end = arg.replace(/^TO:\s*/i, "");
            if (!/@example\.org>$/i.test(end)) return ["554 5.7.1 " + end + ": Relay access denied"];
            this.para.push(end); return ["250 2.1.5 Ok"];
        }
        if (cmd === "DATA") { if (!this.para.length) return ["503 5.5.1 Error: need RCPT command"]; this.estado = "dados"; return ["354 End data with <CR><LF>.<CR><LF>"]; }
        return ["502 5.5.2 Error: command not recognized"];
    };
    R.ServidorSMTP34 = ServidorSMTP;
    R.registrar("sessao-smtp", function (raiz) {
        var srv = new ServidorSMTP();
        var t = terminal(raiz, "220 mail.example.org ESMTP (servidor simulado)", function (l) { return srv.linha(l); }, "Linha para o servidor SMTP");
        var P1 = escolha("Código para mandar o corpo", [["250", "250"], ["354", "354"], ["221", "221"], ["503", "503"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "sessao-smtp", 15, "Uma sessão SMTP à mão");
        raiz.append(el("p", { class: "small mb-1" }, "Você está num telnet para a porta 25 de mail.example.org. Mande uma mensagem para aluno@example.org: EHLO, MAIL FROM:<…>, RCPT TO:<…>, DATA, o texto, uma linha só com um ponto e QUIT."),
            t.tela, t.linha,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): faça o servidor aceitar uma mensagem para aluno@example.org e responda:"),
            linhaPergunta("Que código o servidor manda logo depois de DATA, para você começar o texto?", P1),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var entregou = srv.entregues.some(function (m) { return m.para.some(function (p) { return /aluno@example\.org/i.test(p); }); });
                var ok = entregou && P1.value === "354";
                u.marca(fb, ok, ok ? "Isso: a mensagem foi aceita (250 depois do ponto). Os códigos 2xx são sucesso; 3xx, \"continue\"; 5xx, erro permanente." : (entregou ? "A mensagem foi aceita, mas o código está errado: veja a resposta ao DATA." : "O servidor ainda não aceitou nenhuma mensagem para aluno@example.org."));
                if (ok) concluir();
            }), fb);
    });

    /* ---------- O código-fonte de uma mensagem (Q1) ---------- */
    var CABECALHOS = [
        ["Return-Path: <aluno@example.org>", "Acrescentado pelo servidor que entregou a mensagem na caixa: o endereço do MAIL FROM, para onde vão os avisos de erro."],
        ["Received: from mx.example.net (mx.example.net [2001:db8:2::25]) by caixa.example.net with ESMTPS; Mon, 16 Nov 2026 10:00:07 -0300", "O último salto: o relay de entrada do destinatário passou a mensagem ao servidor da caixa. Fica no topo porque cada servidor acrescenta a sua linha em cima das outras."],
        ["Received: from smtp.example.org (smtp.example.org [2001:db8:1::25]) by mx.example.net with ESMTPS; Mon, 16 Nov 2026 10:00:05 -0300", "O segundo salto: o servidor de envio do remetente entregou ao relay MX do destinatário."],
        ["Received: from [2001:db8:1::99] (notebook) by smtp.example.org with ESMTPSA; Mon, 16 Nov 2026 10:00:03 -0300", "O primeiro salto, na parte de baixo: o programa de e-mail do remetente entregou ao servidor de envio, com autenticação (o A de ESMTPSA)."],
        ["Message-ID: <a1b2c3@notebook.example.org>", "Identificador único criado pelo programa de e-mail do remetente; é usado nas respostas (In-Reply-To)."],
        ["Date: Mon, 16 Nov 2026 10:00:02 -0300", "Quando o remetente apertou enviar, com o fuso horário."],
        ["From: Aluno <aluno@example.org>", "O remetente que aparece para o usuário (não precisa ser igual ao MAIL FROM)."],
        ["To: aluno@example.net", "O destinatário que aparece para o usuário."],
        ["Subject: teste", "O assunto."],
        ["MIME-Version: 1.0", "Avisa que a mensagem usa MIME."],
        ["Content-Type: text/plain; charset=UTF-8", "O tipo do corpo: texto puro, em UTF-8."],
        ["Content-Transfer-Encoding: 8bit", "Como o corpo foi codificado para passar pelo SMTP."]
    ];
    R.registrar("fonte-mensagem", function (raiz) {
        var expl = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" }, "Clique num cabeçalho para ver de onde ele veio.");
        var lista = el("div", { class: "log mono small", style: "max-height:none" }, CABECALHOS.map(function (c, i) {
            return el("button", { type: "button", class: "btn btn-link btn-sm p-0 text-start d-block mono", style: "white-space: normal", onclick: function () { expl.textContent = c[1]; } }, c[0]);
        }), el("div", { class: "mt-2" }, "teste de uma linha só"));
        var P1 = escolha("Received acrescentado primeiro", [["topo", "o primeiro, no topo"], ["baixo", "o último, mais embaixo"]]), P2 = texto("Quantos servidores a mensagem atravessou");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "fonte-mensagem", 10, "Os cabeçalhos de uma mensagem");
        raiz.append(el("p", { class: "small mb-1" }, "O código-fonte de uma mensagem de uma linha, como no Q1 (dados ilustrativos):"), lista, expl,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Qual linha Received foi acrescentada primeiro?", P1),
            linhaPergunta("Por quantos servidores SMTP a mensagem passou (contando o da caixa)?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === "baixo" && Number(P2.value) === 3;
                u.marca(fb, ok, ok ? "Isso: smtp.example.org, mx.example.net e caixa.example.net, cada um com a sua linha Received em cima das anteriores." : "Ainda não. Leia as linhas Received de baixo para cima.");
                if (ok) concluir();
            }), fb);
    });

    /* ---------- Portas da IANA (Q2) ---------- */
    var PORTAS = [["smtp", 25, "tcp, udp"], ["submission", 587, "tcp, udp"], ["submissions", 465, "tcp"], ["pop3", 110, "tcp, udp"], ["pop3s", 995, "tcp, udp"],
        ["imap", 143, "tcp"], ["imaps", 993, "tcp"], ["domain", 53, "tcp, udp"], ["http", 80, "tcp, udp, sctp"], ["https", 443, "tcp, udp, sctp"], ["telnet", 23, "tcp, udp"]];
    R.registrar("portas-iana", function (raiz) {
        var busca = texto("Serviço ou porta");
        var tabela = el("div", { class: "table-responsive mt-2" });
        function mostra() {
            var q = busca.value.trim().toLowerCase();
            var linhas = PORTAS.filter(function (p) { return !q || p[0].indexOf(q) >= 0 || String(p[1]) === q; });
            tabela.replaceChildren(el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Serviço"), el("th", null, "Porta"), el("th", null, "Registrado em"))),
                el("tbody", null, linhas.map(function (p) { return el("tr", null, el("td", null, p[0]), el("td", null, String(p[1])), el("td", null, p[2])); }))));
        }
        busca.addEventListener("input", mostra);
        var P1 = texto("Porta do POP3"), P2 = escolha("Transporte do POP3", [["tcp", "TCP"], ["udp", "UDP"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "portas-iana", 10, "Portas reservadas");
        raiz.append(u.campo("Procure um serviço ou uma porta", busca), tabela,
            el("p", { class: "small text-muted mt-1" }, "Trecho do registro da IANA (service-names-port-numbers), consultado em novembro de 2026."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Qual é a porta padrão do POP3?", P1),
            linhaPergunta("Sobre que transporte o POP3 roda de fato?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 110 && P2.value === "tcp";
                u.marca(fb, ok, ok ? "Isso: 110. A IANA costuma reservar a mesma porta em TCP e UDP, mas a RFC 1939 diz que o servidor POP3 escuta na porta TCP 110." : "Ainda não. Procure pop3 na tabela e lembre que o POP3 precisa de um fluxo confiável.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- POP3 (RFC 1939) ---------- */
    var CAIXA = [{ tam: 1200, assunto: "Reunião amanhã" }, { tam: 52000, assunto: "Fotos da viagem" }, { tam: 3400, assunto: "Lista de exercícios" }, { tam: 870000, assunto: "Apresentação" }];
    function ServidorPOP() { this.estado = "AUTHORIZATION"; this.usuario = null; this.apagadas = {}; this.lidas = {}; this.removidas = []; }
    ServidorPOP.prototype.linha = function (l) {
        var p = l.trim().split(/\s+/), cmd = (p[0] || "").toUpperCase(), n = Number(p[1]);
        var vivas = CAIXA.map(function (m, i) { return i + 1; }).filter(function (i) { return !this.apagadas[i]; }, this);
        function existe(k) { return k >= 1 && k <= CAIXA.length && vivas.indexOf(k) >= 0; }
        if (cmd === "QUIT") {
            if (this.estado === "TRANSACTION") { this.estado = "UPDATE"; this.removidas = Object.keys(this.apagadas).map(Number); return ["+OK fechando; " + this.removidas.length + " mensagem(ns) apagada(s) na fase UPDATE"]; }
            return ["+OK até logo"];
        }
        if (this.estado === "AUTHORIZATION") {
            if (cmd === "USER") { this.usuario = p[1] || ""; return ["+OK " + this.usuario + " conhecido; mande PASS"]; }
            if (cmd === "PASS") { if (this.usuario === "aluno" && p[1] === "redes") { this.estado = "TRANSACTION"; return ["+OK caixa trancada e pronta"]; } return ["-ERR usuário ou senha inválidos"]; }
            return ["-ERR primeiro USER e PASS"];
        }
        if (this.estado !== "TRANSACTION") return ["-ERR sessão encerrada"];
        if (cmd === "STAT") { return ["+OK " + vivas.length + " " + vivas.reduce(function (a, i) { return a + CAIXA[i - 1].tam; }, 0)]; }
        if (cmd === "LIST") {
            if (p[1]) return existe(n) ? ["+OK " + n + " " + CAIXA[n - 1].tam] : ["-ERR não existe a mensagem " + p[1]];
            return ["+OK " + vivas.length + " mensagens"].concat(vivas.map(function (i) { return i + " " + CAIXA[i - 1].tam; }), ["."]);
        }
        if (cmd === "RETR") {
            if (!existe(n)) return ["-ERR não existe a mensagem " + (p[1] || "")];
            this.lidas[n] = true;
            return ["+OK " + CAIXA[n - 1].tam + " octetos", "Subject: " + CAIXA[n - 1].assunto, "", "(corpo da mensagem " + n + ")", "."];
        }
        if (cmd === "DELE") { if (!existe(n)) return ["-ERR não existe a mensagem " + (p[1] || "")]; this.apagadas[n] = true; return ["+OK mensagem " + n + " marcada para apagar"]; }
        if (cmd === "RSET") { this.apagadas = {}; return ["+OK nada será apagado"]; }
        if (cmd === "NOOP") return ["+OK"];
        return ["-ERR comando desconhecido"];
    };
    R.ServidorPOP34 = ServidorPOP;
    R.caixa34 = CAIXA;
    R.registrar("sessao-pop", function (raiz) {
        var chave = raiz.getAttribute("data-desafio") || "fases";
        var srv = new ServidorPOP();
        var t = terminal(raiz, "+OK servidor POP3 simulado pronto", function (l) { return srv.linha(l); }, "Linha para o servidor POP3");
        var fb = u.feedback(), campos, concluir, verifica;
        if (chave === "fases") {
            var P1 = escolha("Como saber se a resposta é positiva", [["ok", "pelo começo: +OK ou -ERR"], ["num", "por um código de três dígitos, como no SMTP"], ["vazio", "pela linha em branco no fim"]]);
            campos = [linhaPergunta("Como o cliente sabe, de imediato, se a resposta é positiva ou negativa?", P1)];
            concluir = R.desafio(raiz, "pop-fases", 15, "As três fases do POP3");
            verifica = function () {
                var ok = srv.removidas.indexOf(2) >= 0 && P1.value === "ok";
                u.marca(fb, ok, ok ? "Isso: DELE só marca; a mensagem 2 sumiu na fase UPDATE, depois do QUIT." : (srv.removidas.indexOf(2) >= 0 ? "A mensagem 2 foi apagada; falta a pergunta." : "A mensagem 2 ainda não foi apagada de verdade: marque com DELE 2 e termine com QUIT."));
                return ok;
            };
        } else {
            var P2 = texto("Mensagens menores que 5 KB");
            campos = [linhaPergunta("Que mensagens o cliente deve baixar? (números separados por vírgula)", P2)];
            concluir = R.desafio(raiz, "pop-pequenas", 15, "Só as mensagens pequenas");
            verifica = function () {
                var pequenas = CAIXA.map(function (m, i) { return m.tam < 5000 ? i + 1 : 0; }).filter(Boolean);
                var lidas = Object.keys(srv.lidas).map(Number).sort();
                var resp = P2.value.split(/[,\s]+/).filter(Boolean).map(Number).sort();
                var ok = resp.join() === pequenas.join() && lidas.join() === pequenas.join();
                u.marca(fb, ok, ok ? "Isso: o LIST dá os tamanhos sem baixar nada, e o cliente só pede RETR das pequenas." : "Ainda não. Use LIST para ver os tamanhos e RETR só nas mensagens com menos de 5000 octetos (e em nenhuma outra).");
                return ok;
            };
        }
        raiz.append(el("p", { class: "small mb-1" }, "Telnet para a porta 110 de pop.example.org. O usuário é aluno e a senha, redes."),
            t.tela, t.linha,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, chave === "fases" ? "Desafio (15 pts): entre na caixa, apague de verdade a mensagem 2 e responda:" : "Desafio (15 pts): baixe só as mensagens com menos de 5 KB (5000 octetos)."),
            el("div", null, campos),
            u.botao("Conferir", "btn-primary mt-1", function () { if (verifica()) concluir(); }), fb);
    });
}());
