/* Simulações do Capítulo 3 — Aplicações. Cada uma é registrada em Redes.registrar. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, svg = u.svg;

    function hex2(n) { return n.toString(16).toUpperCase().padStart(2, "0"); }
    function bin8(n) { return n.toString(2).padStart(8, "0"); }

    // Põe um círculo (cx/cy) ou um grupo <g> (transform) na posição (x, y).
    function posiciona(no, x, y) {
        if (no.tagName.toLowerCase() === "circle") { no.setAttribute("cx", x); no.setAttribute("cy", y); }
        else no.setAttribute("transform", "translate(" + x + " " + y + ")");
    }

    // Anima um círculo ou um grupo ao longo de uma poligonal. Com movimento reduzido, pula para o fim.
    function animarCaminho(no, pontos, duracao, aoTerminar) {
        if (R.reduzMovimento() || pontos.length < 2) {
            var f = pontos[pontos.length - 1];
            posiciona(no, f[0], f[1]);
            if (aoTerminar) aoTerminar();
            return;
        }
        var comprimentos = [], total = 0;
        for (var i = 1; i < pontos.length; i++) {
            var d = Math.hypot(pontos[i][0] - pontos[i - 1][0], pontos[i][1] - pontos[i - 1][1]);
            comprimentos.push(d); total += d;
        }
        var inicio = null, terminou = false;
        function concluir() {
            if (terminou) return;
            terminou = true;
            var f = pontos[pontos.length - 1];
            posiciona(no, f[0], f[1]);
            if (aoTerminar) aoTerminar();
        }
        // Salvaguarda: se a aba estiver em segundo plano (rAF pausado), conclui pelo relógio.
        setTimeout(concluir, duracao + 400);
        function quadro(t) {
            if (terminou) return;
            if (inicio === null) inicio = t;
            var alvo = Math.min(1, (t - inicio) / duracao) * total;
            var acc = 0, k = 0;
            while (k < comprimentos.length - 1 && acc + comprimentos[k] < alvo) { acc += comprimentos[k]; k++; }
            var frac = comprimentos[k] ? (alvo - acc) / comprimentos[k] : 1;
            posiciona(no, pontos[k][0] + (pontos[k + 1][0] - pontos[k][0]) * frac, pontos[k][1] + (pontos[k + 1][1] - pontos[k][1]) * frac);
            if (alvo < total) requestAnimationFrame(quadro);
            else concluir();
        }
        requestAnimationFrame(quadro);
    }

    /* ------------------------------------------------------------------
     * 1. Modelo cliente-servidor (Fig. 36): a mensagem viaja num balão,
     *    e o servidor mostra a ação que executou antes de responder.
     * ------------------------------------------------------------------ */
    R.registrar("cliente-servidor", function (raiz) {
        var servidores = {
            web: { nome: "Servidor web", req: "GET /index.html", resp: function () { return "200 OK + página HTML"; },
                acao: function (st) { st.n = (st.n || 0) + 1; },
                estado: function (st) { return [st.n ? "Página index.html entregue " + st.n + " vez(es)." : "Nenhuma página pedida ainda."]; } },
            impressao: { nome: "Servidor de impressão", req: "IMPRIMIR relatorio.pdf", resp: function (st) { return "Trabalho " + st.fila[st.fila.length - 1] + " na fila"; },
                acao: function (st) { st.fila = st.fila || []; st.fila.push(17 + st.fila.length); },
                estado: function (st) {
                    return (st.fila || []).length
                        ? ["Fila da impressora:"].concat(st.fila.map(function (n) { return "trabalho " + n + ": relatorio.pdf"; }))
                        : ["Fila da impressora vazia."];
                } },
            email: { nome: "Servidor de e-mail", req: "ENVIAR mensagem para bob@exemplo.org", resp: function () { return "Mensagem aceita para entrega"; },
                acao: function (st) { st.n = (st.n || 0) + 1; },
                estado: function (st) { return [st.n ? "Caixa de saída: " + st.n + " mensagem(ns) para bob@exemplo.org, a caminho do servidor do destinatário." : "Caixa de saída vazia."]; } },
            musica: { nome: "Servidor de música", req: "TOCAR faixa 42", resp: function () { return "Fluxo de áudio da faixa 42"; },
                acao: function (st) { st.tocando = true; },
                estado: function (st) { return [st.tocando ? "♪ Tocando a faixa 42 para o cliente." : "Nenhuma faixa tocando."]; } }
        };
        var estados = { web: {}, impressao: {}, email: {}, musica: {} };
        var visitados = {};
        var concluir = R.desafio(raiz, "cs-servidores", 15, "Falar com os quatro tipos de servidor");

        var tipo = el("select", { class: "form-select form-select-sm" },
            Object.keys(servidores).map(function (k) { return el("option", { value: k }, servidores[k].nome); }));
        var camadas = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("camadas") });
        var enviar = u.botao("Enviar requisição", "btn-primary", rodar);
        var fase = el("p", { class: "small fw-semibold mt-2 mb-1", "aria-live": "polite" }, "Escolha um servidor e envie uma requisição.");
        var saida = el("p", { class: "small mt-1 mb-0" });
        var contagem = el("p", { class: "small text-muted mb-0" });
        var tituloPainel = el("p", { class: "small fw-semibold mb-1" });
        var listaPainel = el("ul", { class: "small mb-0 ps-3" });
        var painel = el("div", { class: "p-2 h-100", style: "border:1px solid var(--line);border-radius:8px;background:var(--surface)", "aria-live": "polite" }, tituloPainel, listaPainel);

        var NOMES = ["Aplicação", "Transporte", "Rede", "Enlace", "Física"];
        var desenho = svg("svg", { viewBox: "0 0 620 260", class: "sim-svg w-100", style: "max-height:300px", role: "img", "aria-label": "Cliente e servidor trocando requisição e resposta." });
        desenho.appendChild(svg("title", { text: "Cliente à esquerda e servidor à direita. A requisição segue num balão pela seta de requisições, o servidor executa a ação e a resposta volta pela seta de respostas; com as camadas visíveis, as mensagens descem pela pilha do cliente, atravessam a rede e sobem pela pilha do servidor." }));
        var grupoCamadas = svg("g");
        NOMES.forEach(function (n, i) {
            var y = 40 + i * 40;
            grupoCamadas.appendChild(svg("rect", { x: 20, y: y, width: 130, height: 32, rx: 5, class: "camada" }));
            grupoCamadas.appendChild(svg("text", { x: 85, y: y + 21, "text-anchor": "middle", "font-size": 12 }, n));
            grupoCamadas.appendChild(svg("rect", { x: 470, y: y, width: 130, height: 32, rx: 5, class: "camada" }));
            grupoCamadas.appendChild(svg("text", { x: 535, y: y + 21, "text-anchor": "middle", "font-size": 12 }, n));
        });
        grupoCamadas.appendChild(svg("line", { x1: 150, y1: 216, x2: 470, y2: 216, class: "linha" }));
        grupoCamadas.appendChild(svg("text", { x: 310, y: 240, "text-anchor": "middle", "font-size": 12 }, "provedor do serviço (“a rede”)"));
        var cliente = svg("rect", { x: 20, y: 40, width: 130, height: 32, rx: 5, class: "no" });
        var servidor = svg("rect", { x: 470, y: 40, width: 130, height: 32, rx: 5, class: "no" });
        var rotuloServidor = svg("text", { x: 535, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 600 }, "Servidor web");
        var idSeta = u.novoId("seta-cs");
        desenho.append(
            svg("defs", null, svg("marker", { id: idSeta, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
                svg("path", { d: "M0 0 L10 5 L0 10 z", class: "seq-arrowhead" }))),
            grupoCamadas, cliente, servidor,
            svg("text", { x: 85, y: 61, "text-anchor": "middle", "font-size": 12 }, "Aplicação"),
            svg("text", { x: 535, y: 61, "text-anchor": "middle", "font-size": 12 }, "Aplicação"),
            svg("text", { x: 85, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 600 }, "Cliente"), rotuloServidor,
            svg("line", { x1: 152, y1: 48, x2: 466, y2: 48, class: "linha", "stroke-dasharray": "6 4", "marker-end": "url(#" + idSeta + ")" }),
            svg("line", { x1: 468, y1: 66, x2: 154, y2: 66, class: "linha", "stroke-dasharray": "6 4", "marker-end": "url(#" + idSeta + ")" }),
            svg("text", { x: 310, y: 38, "text-anchor": "middle", "font-size": 11 }, "Requisições"),
            svg("text", { x: 310, y: 86, "text-anchor": "middle", "font-size": 11 }, "Respostas"));

        // Balão com o texto da mensagem; a posição animada é o centro do balão.
        var fundoBalao = svg("rect", { x: -60, y: -11, width: 120, height: 22, rx: 11, class: "pacote" });
        var textoBalao = svg("text", { x: 0, y: 4, "text-anchor": "middle", "font-size": 11, class: "balao-texto" });
        var balao = svg("g", { visibility: "hidden" }, fundoBalao, textoBalao);
        desenho.appendChild(balao);

        function preparaBalao(texto, classe) {
            var curto = texto.length > 26 ? texto.slice(0, 25) + "…" : texto;
            var largura = Math.min(190, curto.length * 6.4 + 18);
            textoBalao.textContent = curto;
            fundoBalao.setAttribute("x", -largura / 2);
            fundoBalao.setAttribute("width", largura);
            fundoBalao.setAttribute("class", classe);
            balao.setAttribute("visibility", "visible");
            return largura;
        }

        function mostraPainel() {
            var k = tipo.value, nome = servidores[k].nome;
            tituloPainel.textContent = "No " + nome.charAt(0).toLowerCase() + nome.slice(1);
            listaPainel.replaceChildren.apply(listaPainel, servidores[k].estado(estados[k]).map(function (l) { return el("li", null, l); }));
        }
        tipo.addEventListener("change", function () { rotuloServidor.textContent = servidores[tipo.value].nome; mostraPainel(); });

        function atualizaCamadas() {
            grupoCamadas.setAttribute("visibility", camadas.checked ? "visible" : "hidden");
            // Sem as camadas, o desenho encolhe para não deixar uma área vazia.
            desenho.setAttribute("viewBox", camadas.checked ? "0 0 620 260" : "0 0 620 100");
            desenho.style.maxHeight = camadas.checked ? "300px" : "130px";
        }
        camadas.addEventListener("change", atualizaCamadas);
        atualizaCamadas();

        function rodar() {
            var k = tipo.value, s = servidores[k];
            rotuloServidor.textContent = s.nome;
            enviar.disabled = true; tipo.disabled = true; camadas.disabled = true;
            servidor.setAttribute("class", "no");
            saida.textContent = "Requisição: “" + s.req + "”";
            fase.textContent = "1. A requisição vai do cliente ao servidor.";
            var w = preparaBalao(s.req, "pacote");
            var dur = camadas.checked ? 1800 : 1100;
            // Com as camadas, o balão desce pela pilha do cliente, cruza a rede e sobe pela do servidor,
            // sem sair da área do desenho.
            function pelasCamadas(larg) {
                var xe = Math.max(85, larg / 2 + 4), xd = Math.min(535, 620 - larg / 2 - 4);
                return [[xe, 56], [xe, 216], [xd, 216], [xd, 56]];
            }
            var ida = camadas.checked ? pelasCamadas(w) : [[150 + w / 2, 48], [470 - w / 2, 48]];
            posiciona(balao, ida[0][0], ida[0][1]);
            animarCaminho(balao, ida, dur, function () {
                // O servidor executa a ação pedida antes de responder.
                balao.setAttribute("visibility", "hidden");
                servidor.setAttribute("class", "no no-ativo");
                fase.textContent = "2. O servidor executa a ação pedida.";
                s.acao(estados[k]);
                mostraPainel();
                setTimeout(function () {
                    servidor.setAttribute("class", "no");
                    var resp = s.resp(estados[k]);
                    var w2 = preparaBalao(resp, "pacote-resp");
                    var volta = camadas.checked ? pelasCamadas(w2).reverse() : [[470 - w2 / 2, 66], [150 + w2 / 2, 66]];
                    posiciona(balao, volta[0][0], volta[0][1]);
                    fase.textContent = "3. A resposta volta do servidor ao cliente.";
                    animarCaminho(balao, volta, dur, function () {
                        fase.textContent = "Troca concluída: o cliente pediu, o servidor agiu e respondeu.";
                        saida.textContent = "Requisição: “" + s.req + "” · Resposta: “" + resp + "”";
                        enviar.disabled = false; tipo.disabled = false; camadas.disabled = false;
                        visitados[k] = true;
                        var n = Object.keys(visitados).length;
                        contagem.textContent = "Tipos de servidor consultados: " + n + " de 4.";
                        if (n === 4) concluir();
                    });
                }, R.reduzMovimento() ? 0 : 800);
            });
        }

        raiz.append(
            el("div", { class: "row g-2 align-items-end mb-2" },
                el("div", { class: "col-sm-5" }, u.campo("Tipo de servidor", tipo)),
                el("div", { class: "col-sm-4" }, el("div", { class: "form-check mb-2" }, camadas, el("label", { class: "form-check-label small", for: camadas.id }, "Mostrar camadas inferiores"))),
                el("div", { class: "col-sm-3 mb-2" }, enviar)),
            desenho,
            el("div", { class: "row g-2 mt-1" },
                el("div", { class: "col-md-7" }, fase, saida, contagem),
                el("div", { class: "col-md-5" }, painel)),
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): envie uma requisição a cada um dos quatro tipos de servidor (livro, pág. 55 do PDF)."));
        mostraPainel();
    });

    /* ------------------------------------------------------------------
     * 2. Protocolo de aplicação: sintaxe e fluxo
     * ------------------------------------------------------------------ */
    R.registrar("conversa-protocolo", function (raiz) {
        var cenarios = {
            hora: {
                titulo: "Que horas são? (Alice e Bob)",
                voce: "Alice", outro: "Bob",
                botoes: ["Olá", "Que horas são?", "Obrigada", "你好 (olá em chinês)"],
                // estado → {mensagem: [resposta, novoEstado]}
                regras: {
                    0: { "Olá": ["Olá", 1] },
                    1: { "Que horas são?": ["11:55", 2] },
                    2: { "Obrigada": ["De nada", 3] }
                },
                erro: function (estado, msg) {
                    if (msg.indexOf("你好") === 0) return "Bob não fala chinês: sem uma linguagem comum (sintaxe), não há conversa.";
                    if (estado === 0) return "Fora de ordem: no protocolo, Alice cumprimenta antes de perguntar.";
                    if (estado === 1 && msg === "Olá") return "Mensagem repetida: o cumprimento já foi feito.";
                    if (estado === 1) return "Fora de ordem: ainda não houve resposta para agradecer.";
                    return "Mensagem inesperada neste ponto da conversa.";
                },
                final: 3,
                dica: "Sequência esperada: cumprimento → pergunta → agradecimento."
            },
            login: {
                titulo: "Servidor com usuário e senha",
                voce: "Cliente", outro: "Servidor",
                botoes: ["LIST", "USER alice", "PASS 3.1415", "PASS 1234", "QUIT"],
                regras: {
                    0: { "USER alice": ["331 Usuário aceito, envie a senha", 1] },
                    1: { "PASS 1234": ["230 Autenticado", 2], "PASS 3.1415": ["530 Senha incorreta", 1, true] },
                    2: { "LIST": ["150 relatorio.txt  notas.txt", 2], "QUIT": ["221 Até logo", 3] }
                },
                erro: function (estado, msg) {
                    if (msg === "LIST" || msg === "QUIT") return "530 Autentique-se primeiro: o servidor exige usuário e senha antes de outros comandos.";
                    if (msg.indexOf("PASS") === 0 && estado === 0) return "503 Envie USER antes de PASS: a ordem das mensagens faz parte do protocolo.";
                    if (msg === "USER alice") return "503 Usuário já informado.";
                    return "500 Comando inesperado neste estado.";
                },
                final: 3,
                dica: "A senha correta é 1234. Antes de LIST, o servidor precisa de USER e de uma senha válida. Termine com QUIT."
            }
        };
        var concluirHora = R.desafio(raiz, "proto-hora", 10, "Conversa de Alice e Bob sem erros");
        var concluirLogin = R.desafio(raiz, "proto-login", 15, "Sessão autenticada sem erros");

        var escolha = el("select", { class: "form-select form-select-sm" },
            Object.keys(cenarios).map(function (k) { return el("option", { value: k }, cenarios[k].titulo); }));
        var chat = el("div", { class: "chat", "aria-live": "polite" });
        var botoes = el("div", { class: "d-flex flex-wrap gap-2 mt-2" });
        var status = u.feedback();
        var dica = el("p", { class: "small text-muted mt-1 mb-0" });
        var estado, erros;

        function msg(texto, classe) { chat.appendChild(el("div", { class: "chat-msg " + classe }, texto)); chat.scrollTop = chat.scrollHeight; }

        function reiniciar() {
            var c = cenarios[escolha.value];
            estado = 0; erros = 0;
            chat.replaceChildren();
            botoes.replaceChildren();
            status.textContent = "";
            dica.textContent = c.dica;
            c.botoes.forEach(function (b) {
                botoes.appendChild(u.botao(b, "btn-outline-primary", function () { enviar(b); }, "Enviar mensagem " + b));
            });
            botoes.appendChild(u.botao("Recomeçar", "btn-outline-secondary", reiniciar));
        }

        function enviar(texto) {
            var c = cenarios[escolha.value];
            if (estado === c.final) { u.marca(status, false, "A conversa terminou. Clique em Recomeçar."); return; }
            msg(c.voce + ": " + texto, "chat-esq");
            var regra = c.regras[estado] && c.regras[estado][texto];
            if (!regra) {
                erros++;
                msg(c.erro(estado, texto), "chat-erro");
                return;
            }
            msg(c.outro + ": " + regra[0], "chat-dir");
            if (regra[2]) erros++;
            estado = regra[1];
            if (estado === c.final) {
                if (erros === 0) {
                    u.marca(status, true, "Conversa concluída sem nenhuma violação do protocolo.");
                    (escolha.value === "hora" ? concluirHora : concluirLogin)();
                } else {
                    u.marca(status, false, "Conversa concluída, mas com " + erros + " erro(s). Recomece e tente sem erros para pontuar.");
                }
            }
        }

        escolha.addEventListener("change", reiniciar);
        raiz.append(u.campo("Cenário", escolha), chat, botoes, status, dica,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio: conclua cada cenário sem nenhuma mensagem fora de ordem (10 + 15 pts)."));
        reiniciar();
    });

    /* ------------------------------------------------------------------
     * 3. ASCII, CR/LF e caracteres de controle
     * ------------------------------------------------------------------ */
    R.registrar("ascii-linha", function (raiz) {
        var NOMES_CTRL = { 7: "BEL", 9: "TAB", 10: "LF", 13: "CR", 32: "SP" };
        var entrada = el("input", { class: "form-control form-control-sm mono", value: "USER alice", maxlength: 24 });
        var crlf = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("crlf"), checked: true });
        var bell = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("bell") });
        var bytes = el("div", { class: "mt-2", "aria-live": "polite" });
        var fio = el("p", { class: "small mono mt-2 mb-0", style: "overflow-wrap:anywhere" });
        var aviso = el("p", { class: "small mt-1 mb-0" });

        function render() {
            var codigos = [];
            var foraAscii = false;
            Array.from(entrada.value).forEach(function (ch) {
                var c = ch.codePointAt(0);
                if (c > 127) foraAscii = true; else codigos.push(c);
            });
            if (bell.checked) codigos.push(7);
            if (crlf.checked) codigos.push(13, 10);
            bytes.replaceChildren();
            codigos.forEach(function (c) {
                var ctrl = c < 32 || c === 127;
                var nome = NOMES_CTRL[c] || (ctrl ? "CTRL" : String.fromCharCode(c));
                bytes.appendChild(el("span", { class: "byte-cell" + (ctrl ? " ctrl" : c === 32 ? " muted" : ""), title: "Decimal " + c },
                    nome, el("small", null, "0x" + hex2(c)), el("small", null, bin8(c))));
            });
            fio.textContent = "No fio, byte a byte, do bit mais significativo ao menos significativo: " + codigos.map(bin8).join(" ");
            aviso.className = "small mt-1 mb-0 " + (foraAscii ? "quiz-no" : "text-muted");
            aviso.textContent = foraAscii
                ? "Caracteres fora da tabela ASCII (acentos, ç, emojis) foram ignorados: eles exigem outra codificação, como a UTF-8 vista no Capítulo 1."
                : codigos.length + " bytes. Cada caractere ASCII ocupa 7 bits, enviados em um byte de 8 bits cujo bit mais alto é 0.";
        }
        [entrada, crlf, bell].forEach(function (c) { c.addEventListener("input", render); c.addEventListener("change", render); });

        // Desafio: escrever o byte de três caracteres.
        var concluir = R.desafio(raiz, "ascii-bytes", 15, "Codificar três caracteres em binário");
        var alvos = [["CR", 13], ["A", 65], ["espaço", 32]];
        var rodada = 0;
        var pergunta = el("p", { class: "small fw-semibold mb-1" });
        var resposta = el("input", { class: "form-control form-control-sm mono", placeholder: "8 bits, ex.: 01000001", maxlength: 8, style: "max-width:12rem" });
        var fb = u.feedback();
        function pergunte() {
            pergunta.textContent = rodada < alvos.length
                ? "Rodada " + (rodada + 1) + " de 3: qual é o byte (8 bits) do caractere " + alvos[rodada][0] + "?"
                : "Desafio concluído.";
            resposta.value = "";
            resposta.disabled = rodada >= alvos.length;
        }
        function confere() {
            var v = resposta.value.trim();
            if (!/^[01]{8}$/.test(v)) { u.marca(fb, false, "Digite exatamente 8 dígitos 0 ou 1."); return; }
            if (parseInt(v, 2) === alvos[rodada][1]) {
                u.marca(fb, true, alvos[rodada][0] + " = " + bin8(alvos[rodada][1]) + " (0x" + hex2(alvos[rodada][1]) + ").");
                rodada++;
                if (rodada === alvos.length) concluir();
                pergunte();
            } else {
                u.marca(fb, false, "Ainda não. Digite o caractere no campo acima (ou marque CR/LF) e leia a linha de bits.");
            }
        }
        resposta.addEventListener("keydown", function (e) { if (e.key === "Enter") confere(); });

        raiz.append(
            u.campo("Texto da linha (somente ASCII)", entrada),
            el("div", { class: "d-flex flex-wrap gap-3" },
                el("div", { class: "form-check" }, crlf, el("label", { class: "form-check-label small", for: crlf.id }, "Terminar a linha com CR LF")),
                el("div", { class: "form-check" }, bell, el("label", { class: "form-check-label small", for: bell.id }, "Incluir o caractere Bell (BEL)"))),
            bytes, fio, aviso,
            el("hr"),
            el("p", { class: "small text-muted mb-1" }, "Desafio (15 pts)"),
            pergunta,
            el("div", { class: "d-flex gap-2" }, resposta, u.botao("Conferir", "btn-primary", confere)),
            fb);
        render(); pergunte();
    });

    /* ------------------------------------------------------------------
     * 4. Gramática ABNF (Fig. 37 do livro)
     * ------------------------------------------------------------------ */
    function validaABNF(linha) {
        // Devolve {ok, regra, passos: [{ok, texto}]}
        var passos = [];
        function passo(ok, texto) { passos.push({ ok: ok, texto: texto }); return ok; }
        var temCRLF = linha.slice(-2) === "\r\n";
        var corpo = temCRLF ? linha.slice(0, -2) : linha;
        var m = /^([A-Za-z]+)/.exec(corpo);
        var cmd = m ? m[1] : "";
        var regra = cmd.toLowerCase() === "user" ? "usercommand" : cmd.toLowerCase() === "pass" ? "passwordcommand" : null;
        if (!passo(!!regra, regra ? "Comando “" + cmd + "” casa com " + (regra === "usercommand" ? "\"user\"" : "\"pass\"") + " (sem diferenciar maiúsculas)." : "O início da linha não é \"user\" nem \"pass\"."))
            return { ok: false, regra: null, passos: passos };
        var resto = corpo.slice(cmd.length);
        if (!passo(resto.charAt(0) === " ", resto.charAt(0) === " " ? "SP (%x20) após o comando." : "Falta o SP (um espaço, %x20) depois do comando."))
            return { ok: false, regra: regra, passos: passos };
        var arg = resto.slice(1);
        if (regra === "usercommand") {
            if (!passo(/^[A-Za-z]+$/.test(arg), /^[A-Za-z]+$/.test(arg) ? "username contém só ALPHA." : arg === "" ? "username vazio: são exigidas de 1 a 8 letras." : "username só pode ter letras (ALPHA = %x41-5A / %x61-7A); encontrado “" + arg.replace(/[A-Za-z]/g, "") + "”."))
                return { ok: false, regra: regra, passos: passos };
            if (!passo(arg.length <= 8, arg.length <= 8 ? "username com " + arg.length + " letra(s) (1*8ALPHA)." : "username com " + arg.length + " letras: o máximo é 8 (1*8ALPHA)."))
                return { ok: false, regra: regra, passos: passos };
        } else {
            if (!passo(/^[A-Za-z]/.test(arg), /^[A-Za-z]/.test(arg) ? "password começa com ALPHA." : "password deve começar com uma letra."))
                return { ok: false, regra: regra, passos: passos };
            if (!passo(/^[A-Za-z][A-Za-z0-9]*$/.test(arg), /^[A-Za-z][A-Za-z0-9]*$/.test(arg) ? "Restante da senha: só ALPHA / DIGIT." : "password só aceita letras e dígitos depois da primeira letra (*(ALPHA / DIGIT))."))
                return { ok: false, regra: regra, passos: passos };
        }
        if (!passo(temCRLF, temCRLF ? "Termina com CRLF (%x0D %x0A)." : "Falta o CRLF no fim da linha."))
            return { ok: false, regra: regra, passos: passos };
        return { ok: true, regra: regra, passos: passos };
    }
    R.validaABNF = validaABNF;

    R.registrar("validador-abnf", function (raiz) {
        var entrada = el("input", { class: "form-control form-control-sm mono", value: "user alice" });
        var crlf = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("abnfcrlf"), checked: true });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });

        function render() {
            var linha = entrada.value + (crlf.checked ? "\r\n" : "");
            var r = validaABNF(linha);
            saida.replaceChildren(
                el("p", { class: "fw-semibold mb-1 " + (r.ok ? "quiz-ok" : "quiz-no") }, r.ok ? "✔ Válida: casa com " + r.regra + "." : "✘ Inválida."),
                el("ul", { class: "mb-0" }, r.passos.map(function (p) { return el("li", { class: p.ok ? "" : "quiz-no" }, (p.ok ? "✓ " : "✗ ") + p.texto); })));
        }
        entrada.addEventListener("input", render);
        crlf.addEventListener("change", render);

        var casos = [
            "USER alice\r\n", "user alexandre\r\n", "pass x9y8\r\n",
            "pass 3.1415\r\n", "user bob", "user  bob\r\n"
        ];
        var concluir = R.desafio(raiz, "abnf-classificar", 20, "Classificar seis linhas pela gramática");
        var acertos = {};
        var lista = el("div", { class: "d-grid gap-2" });
        var fb = u.feedback();
        casos.forEach(function (caso, i) {
            var certo = validaABNF(caso).ok;
            var mostrar = caso.replace(/ /g, "␠").replace("\r\n", "␍␊");
            var linhaFb = el("span", { class: "small" });
            function responde(valida) {
                if (valida === certo) {
                    acertos[i] = true;
                    linhaFb.className = "small quiz-ok";
                    linhaFb.textContent = "✔ " + (certo ? "válida" : "inválida: " + validaABNF(caso).passos.filter(function (p) { return !p.ok; })[0].texto);
                } else {
                    delete acertos[i];
                    linhaFb.className = "small quiz-no";
                    linhaFb.textContent = "✘ Confira de novo: cole a linha no validador acima.";
                }
                if (Object.keys(acertos).length === casos.length) { u.marca(fb, true, "Todas as seis linhas classificadas corretamente."); concluir(); }
            }
            lista.appendChild(el("div", { class: "ordem-item flex-wrap" },
                el("span", { class: "mono" }, mostrar),
                u.botao("Válida", "btn-outline-success", function () { responde(true); }, "Classificar " + mostrar + " como válida"),
                u.botao("Inválida", "btn-outline-danger", function () { responde(false); }, "Classificar " + mostrar + " como inválida"),
                el("div", { class: "w-100" }, linhaFb)));
        });

        raiz.append(
            u.campo("Linha enviada pelo cliente", entrada),
            el("div", { class: "form-check" }, crlf, el("label", { class: "form-check-label small", for: crlf.id }, "Terminar com CRLF (o teclado não digita CR/LF em um campo de uma linha)")),
            saida, el("hr"),
            el("p", { class: "small text-muted mb-2" }, "Desafio (20 pts): classifique cada linha. ␠ é um espaço e ␍␊ é o CRLF."),
            lista, fb);
        render();
    });

    /* ------------------------------------------------------------------
     * 5. Ordem dos bytes (big-endian / little-endian)
     * ------------------------------------------------------------------ */
    function bytesDe(valor, tamanho) {
        var r = [];
        for (var i = tamanho - 1; i >= 0; i--) r.push(Math.floor(valor / Math.pow(256, i)) % 256);
        return r; // big-endian
    }
    function valorDe(bytes) { return bytes.reduce(function (acc, b) { return acc * 256 + b; }, 0); }
    function hexValor(v, tamanho) { return "0x" + v.toString(16).toUpperCase().padStart(tamanho * 2, "0"); }

    R.registrar("ordem-bytes", function (raiz) {
        var valor = el("input", { class: "form-control form-control-sm mono", value: "0x1234" });
        var tamanho = el("select", { class: "form-select form-select-sm" }, el("option", { value: "2" }, "16 bits"), el("option", { value: "4" }, "32 bits"));
        var htonl = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("htonl"), checked: true });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });

        function lerNumero(texto) {
            texto = texto.trim();
            var v = /^0x[0-9a-f]+$/i.test(texto) ? parseInt(texto, 16) : /^\d+$/.test(texto) ? Number(texto) : NaN;
            return v;
        }
        function linhaBytes(rotulo, bs, classe, enderecos) {
            return el("div", { class: "mb-2" }, el("div", { class: "fw-semibold" }, rotulo),
                bs.map(function (b, i) {
                    return el("span", { class: "byte-cell " + (classe || "") }, "0x" + hex2(b), el("small", null, enderecos ? "end. " + i : "byte " + (i + 1)));
                }));
        }
        function render() {
            var t = Number(tamanho.value);
            var v = lerNumero(valor.value);
            var max = Math.pow(256, t) - 1;
            if (!Number.isFinite(v) || v < 0 || v > max) {
                saida.replaceChildren(el("p", { class: "quiz-no mb-0" }, "Digite um inteiro entre 0 e " + max + " (decimal ou hexadecimal com 0x)."));
                return;
            }
            var big = bytesDe(v, t), little = big.slice().reverse();
            var noFio = htonl.checked ? big : little;
            var lido = valorDe(noFio);
            saida.replaceChildren(
                linhaBytes("Memória de um processador big-endian", big, "", true),
                linhaBytes("Memória de um processador little-endian", little, "muted", true),
                el("p", { class: "mb-1" }, "O host emissor é little-endian e " + (htonl.checked ? "converte com htonl()/htons() antes de enviar." : "envia os bytes exatamente como estão na memória.")),
                linhaBytes("Bytes no fio, na ordem de transmissão", noFio, lido === v ? "ok" : "bad", false),
                el("p", { class: "mb-0 " + (lido === v ? "quiz-ok" : "quiz-no") },
                    "O receptor lê os bytes em ordem de rede (big-endian) e obtém " + hexValor(lido, t) + " = " + lido + (lido === v ? " ✔ (o valor original)." : " ✘ (o original era " + v + ").")));
        }
        [valor, tamanho, htonl].forEach(function (c) { c.addEventListener("input", render); c.addEventListener("change", render); });

        // Desafio: prever o valor lido quando o emissor esquece a conversão.
        var concluir = R.desafio(raiz, "endian-bug", 20, "Prever o valor corrompido pela ordem dos bytes");
        var gerador = u.aleatorio();
        var alvo;
        var pergunta = el("p", { class: "small fw-semibold mb-1" });
        var resp = el("input", { class: "form-control form-control-sm mono", placeholder: "decimal ou 0x…", style: "max-width:12rem" });
        var fb = u.feedback();
        function novo() {
            alvo = 256 + Math.floor(gerador() * 65000);
            if (alvo % 256 === Math.floor(alvo / 256)) alvo++;
            pergunta.textContent = "Um host little-endian envia o inteiro de 16 bits " + hexValor(alvo, 2) + " (" + alvo + ") sem chamar htons(). Que valor o receptor lê?";
            resp.value = ""; fb.textContent = "";
        }
        function confere() {
            var v = lerNumero(resp.value);
            var esperado = valorDe(bytesDe(alvo, 2).reverse());
            if (v === esperado) { u.marca(fb, true, "Os dois bytes chegam invertidos: " + hexValor(esperado, 2) + " = " + esperado + "."); concluir(); }
            else u.marca(fb, false, "Não. Escreva os dois bytes do valor e troque a ordem deles.");
        }
        resp.addEventListener("keydown", function (e) { if (e.key === "Enter") confere(); });

        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-sm-6" }, u.campo("Valor (decimal ou 0x…)", valor)),
                el("div", { class: "col-sm-6" }, u.campo("Tamanho do campo", tamanho))),
            el("div", { class: "form-check" }, htonl, el("label", { class: "form-check-label small", for: htonl.id }, "Emissor converte para a ordem de rede (htons/htonl)")),
            saida, el("hr"),
            el("p", { class: "small text-muted mb-1" }, "Desafio (20 pts)"),
            pergunta,
            el("div", { class: "d-flex flex-wrap gap-2" }, resp, u.botao("Conferir", "btn-primary", confere), u.botao("Outro valor", "btn-outline-secondary", novo)),
            fb);
        render(); novo();
    });

    /* ------------------------------------------------------------------
     * 6. Formato de mensagem binária (Fig. 38)
     * ------------------------------------------------------------------ */
    function montaMensagem(c) {
        // c = {f16, flags: [8 bools A..H], f24, b1, b2} → 8 bytes em ordem de rede
        var flags = c.flags.reduce(function (acc, f, i) { return acc | (f ? 1 << (7 - i) : 0); }, 0);
        return [(c.f16 >> 8) & 255, c.f16 & 255, flags, (c.f24 >> 16) & 255, (c.f24 >> 8) & 255, c.f24 & 255, c.b1 & 255, c.b2 & 255];
    }
    R.montaMensagem = montaMensagem;

    R.registrar("formato-mensagem", function (raiz) {
        var num = function (v, max) { return el("input", { type: "number", min: 0, max: max, value: v, class: "form-control form-control-sm mono" }); };
        var f16 = num(1500, 65535), f24 = num(70000, 16777215), b1 = num(7, 255), b2 = num(255, 255);
        var letras = "ABCDEFGH".split("");
        var flags = letras.map(function (l, i) { return el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("flag"), checked: i === 0 || i === 7, "aria-label": "Flag " + l }); });
        var grade = el("div", { class: "mt-3" });
        var hex = el("p", { class: "small mono mt-2 mb-0" });

        function valores() {
            function lim(inp, max) { var v = Math.floor(Number(inp.value)); return Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0; }
            return { f16: lim(f16, 65535), f24: lim(f24, 16777215), b1: lim(b1, 255), b2: lim(b2, 255), flags: flags.map(function (f) { return f.checked; }) };
        }

        function render() {
            var bytes = montaMensagem(valores());
            var bits = bytes.map(bin8).join("");
            // Rótulo e cor de cada bit (64 bits, duas linhas de 32).
            function info(i) {
                if (i < 16) return ["campo de 16 bits", "campo-a"];
                if (i < 24) return ["flag " + letras[i - 16], "campo-b"];
                if (i < 48) return ["campo de 24 bits", "campo-c"];
                if (i < 56) return ["byte 1", "campo-d"];
                return ["byte 2", "campo-e"];
            }
            grade.replaceChildren();
            var cabecalho = el("div", { class: "bit-grid", "aria-hidden": "true" });
            for (var p = 0; p < 32; p++) cabecalho.appendChild(el("div", { class: "pos" }, p % 8 === 0 || p === 31 ? String(p) : ""));
            grade.appendChild(cabecalho);
            for (var linha = 0; linha < 2; linha++) {
                var g = el("div", { class: "bit-grid mb-1", role: "group", "aria-label": "Palavra de 32 bits número " + (linha + 1) });
                for (var b = 0; b < 32; b++) {
                    var i = linha * 32 + b, inf = info(i);
                    g.appendChild(el("div", { class: "campo " + inf[1], title: inf[0] + ": bit " + bits[i] }, bits[i]));
                }
                grade.appendChild(g);
            }
            grade.appendChild(el("p", { class: "small text-muted mb-0" },
                "Azul: campo de 16 bits · Amarelo: flags A–H · Verde: campo de 24 bits (o byte mais alto fica na 1ª linha, os dois mais baixos na 2ª) · Vermelho: byte 1 · Roxo: byte 2."));
            hex.textContent = "Transmitido nesta ordem (ordem de rede): " + bytes.map(function (x) { return hex2(x); }).join(" ");
        }
        [f16, f24, b1, b2].concat(flags).forEach(function (c) { c.addEventListener("input", render); c.addEventListener("change", render); });

        // Desafio: decodificar uma mensagem recebida.
        var concluir = R.desafio(raiz, "formato-decodificar", 25, "Decodificar uma mensagem binária");
        var recebida = [0x01, 0xF4, 0x81, 0x00, 0x01, 0x00, 0x2A, 0x7F];
        var rf16 = el("input", { class: "form-control form-control-sm mono", placeholder: "decimal" });
        var rf24 = el("input", { class: "form-control form-control-sm mono", placeholder: "decimal" });
        var rflags = el("input", { class: "form-control form-control-sm mono", placeholder: "ex.: B, C" });
        var fb = u.feedback();
        function confere() {
            var ok16 = Number(rf16.value.trim()) === 500;
            var ok24 = Number(rf24.value.trim()) === 256;
            var conj = rflags.value.toUpperCase().replace(/[^A-H]/g, "").split("").sort().join("");
            var okF = conj === "AH";
            if (ok16 && ok24 && okF) { u.marca(fb, true, "Campo de 16 bits = 0x01F4 = 500; flags 0x81 = A e H; campo de 24 bits = 0x000100 = 256."); concluir(); }
            else u.marca(fb, false, "Confira: " + [ok16 ? null : "campo de 16 bits", okF ? null : "flags", ok24 ? null : "campo de 24 bits"].filter(Boolean).join(", ") + ". Dica: monte os mesmos bytes no editor acima.");
        }

        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("Campo de 16 bits", f16)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Campo de 24 bits", f24)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Byte 1", b1)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Byte 2", b2))),
            el("div", { class: "d-flex flex-wrap gap-3 small" }, el("span", { class: "fw-semibold" }, "Flags:"),
                flags.map(function (f, i) { return el("div", { class: "form-check form-check-inline me-0" }, f, el("label", { class: "form-check-label", for: f.id }, letras[i])); })),
            grade, hex, el("hr"),
            el("p", { class: "small text-muted mb-1" }, "Desafio (25 pts): uma mensagem neste formato chegou com os bytes:"),
            el("p", { class: "mono fw-semibold" }, recebida.map(hex2).join(" ")),
            el("div", { class: "row g-2" },
                el("div", { class: "col-sm-4" }, u.campo("Campo de 16 bits", rf16)),
                el("div", { class: "col-sm-4" }, u.campo("Flags ligadas", rflags)),
                el("div", { class: "col-sm-4" }, u.campo("Campo de 24 bits", rf24))),
            u.botao("Conferir", "btn-primary", confere), fb);
        render();
    });

    /* ------------------------------------------------------------------
     * 7. Cliente-servidor vs. peer-to-peer
     * ------------------------------------------------------------------ */
    R.registrar("p2p-vs-cs", function (raiz) {
        var n = el("input", { type: "range", min: 2, max: 60, value: 10, class: "form-range", id: u.novoId("n") });
        var nOut = el("output", { class: "fw-semibold" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });

        function barra(rotulo, valor, max, nota) {
            return el("div", { class: "mb-2" },
                el("div", { class: "d-flex justify-content-between" }, el("span", null, rotulo), el("span", { class: "mono" }, valor + " cópias")),
                el("div", { class: "barra-carga", style: "width:" + Math.max(1, valor / max * 100) + "%" }),
                nota ? el("div", { class: "text-muted" }, nota) : null);
        }
        function render() {
            var k = Number(n.value);
            nOut.textContent = String(k);
            var max = k;
            saida.replaceChildren(
                el("p", { class: "fw-semibold mb-1" }, "Cliente-servidor"),
                barra("Enviado pelo servidor", k, max, "O servidor envia uma cópia a cada cliente; os clientes não enviam nada."),
                el("p", { class: "fw-semibold mb-1 mt-3" }, "Peer-to-peer (caso ideal)"),
                barra("Enviado pela fonte original", 1, max, null),
                barra("Enviado, em média, por par", Number(((k - 1) / k).toFixed(2)), max, "Cada par é cliente (recebe) e servidor (repassa partes a outros pares)."));
        }
        n.addEventListener("input", render);
        raiz.append(
            el("label", { class: "form-label small", for: n.id }, "Participantes que querem o mesmo arquivo: ", nOut),
            n, saida,
            el("p", { class: "small text-muted mb-0" }, "Modelo simplificado (complemento ao livro): um arquivo distribuído a todos os participantes, ignorando a capacidade dos enlaces."));
        render();
    });
}());
