/* Simulações do Capítulo 16 — Transport Layer Security (TLS) (seção 3.8 do livro).
 * Cada uma é registrada em Redes.registrar. A criptografia aqui é ilustrativa: os "MACs", resumos
 * e assinaturas usam uma função simples (FNV-1a), suficiente para mostrar o mecanismo, mas sem segurança. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function entrada(valor, rotulo) {
        return el("input", { class: "form-control form-control-sm mono", value: valor || "", "aria-label": rotulo || null, spellcheck: "false", autocomplete: "off" });
    }
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
    // Resumo didático (FNV-1a de 32 bits), só para ilustrar MACs e resumos.
    function resumo(texto) {
        var h = 0x811c9dc5;
        var b = new TextEncoder().encode(String(texto));
        for (var i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
        return h.toString(16).padStart(8, "0");
    }
    R.resumoDidatico = resumo;
    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }

    /* ------------------------------------------------------------------
     * 1. telnet contra ssh: o que Eve vê (pág. 169 do PDF)
     * ------------------------------------------------------------------ */

    /* ------------------------------------------------------------------
     * 4. Handshake do TLS 1.2 e o sigilo futuro (pág. 173–176 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("handshake-tls", function (raiz) {
        var troca = el("select", { class: "form-select form-select-sm" }, el("option", { value: "RSA" }, "RSA"), el("option", { value: "DHE_RSA" }, "DHE_RSA (Diffie-Hellman efêmero)"));
        var passo = 0;
        var area = el("div", { class: "mt-2" });
        var explica = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var resultado = el("p", { class: "small mt-2 mb-0" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "tls-pfs", 15, "Ver o efeito do sigilo futuro (PFS) no TLS 1.2");
        function mensagens() {
            var m = [
                { de: 0, para: 1, rotulo: "ClientHello [versão, aleatório, suítes, SNI]", txt: "O cliente propõe a versão, 32 bytes aleatórios, as suítes que aceita (a preferida primeiro) e, na extensão SNI, o nome www.example.com." },
                { de: 1, para: 0, rotulo: "ServerHello [aleatório, suíte, Session Id]", txt: "O servidor escolhe a suíte, manda os seus 32 bytes aleatórios e um identificador de sessão." },
                { de: 1, para: 0, rotulo: "Certificate", txt: "A cadeia de certificados que liga www.example.com à chave pública do servidor. O cliente a valida com as chaves das autoridades raiz que já conhece." }
            ];
            if (troca.value === "DHE_RSA") m.push({ de: 1, para: 0, rotulo: "ServerKeyExchange [p, g, g^s, assinatura]", txt: "Os parâmetros de Diffie-Hellman do servidor, assinados com a chave privada dele. O segredo s é efêmero: é descartado no fim da sessão." });
            m.push({ de: 1, para: 0, rotulo: "ServerHelloDone", txt: "O servidor terminou a sua parte da primeira fase." });
            m.push(troca.value === "RSA"
                ? { de: 0, para: 1, rotulo: "ClientKeyExchange [E(Kpub, segredo de 48 bytes)]", txt: "O cliente sorteia 48 bytes e os cifra com a chave pública do certificado. Só a chave privada do servidor os decifra." }
                : { de: 0, para: 1, rotulo: "ClientKeyExchange [g^c]", txt: "O cliente manda a sua parte do Diffie-Hellman. Os dois calculam g^(cs) mod p sem que ele passe pela rede." });
            m.push({ de: 0, para: 1, rotulo: "ChangeCipherSpec, Finished", txt: "O cliente passa a cifrar. O Finished, a primeira mensagem cifrada, traz um MAC de todo o handshake: se Mallory alterou alguma mensagem, o servidor percebe." });
            m.push({ de: 1, para: 0, rotulo: "ChangeCipherSpec, Finished", txt: "O servidor confirma da mesma forma." });
            m.push({ de: 0, para: 1, rotulo: "registros cifrados (GET /)", tipo: "tracejado", txt: "Começa a transferência de dados, cifrada e autenticada com chaves derivadas do segredo comum." });
            return m;
        }
        function desenha() {
            var m = mensagens();
            area.replaceChildren(R.diagramaSequencia({ titulo: "Handshake do TLS 1.2 com troca de chaves " + troca.value + ".", colunas: ["Cliente", "Servidor"], eventos: m.slice(0, passo), passo: 30, margem: 150, largura: 820 }));
            explica.textContent = passo ? m[passo - 1].txt : "Clique em \"Próxima mensagem\".";
        }
        function proxima() { if (passo < mensagens().length) passo++; desenha(); }
        function terrence() {
            if (passo < mensagens().length) { u.marca(fb, false, "Termine o handshake primeiro."); return; }
            if (troca.value === "RSA") {
                vistos.rsa = true;
                resultado.textContent = "Com RSA, o segredo de 48 bytes viajou cifrado com a chave pública do servidor. Terrence, que gravou o tráfego, decifra esse segredo com a chave privada roubada, refaz as chaves e lê TODAS as sessões gravadas.";
            } else {
                vistos.dhe = true;
                resultado.textContent = "Com DHE_RSA, a chave privada só servia para assinar. O segredo da sessão veio de g^c e g^s, com c e s já descartados. Terrence pode se passar pelo servidor daqui para frente, mas não decifra as sessões antigas: isso é o sigilo futuro (PFS).";
            }
            if (vistos.rsa && vistos.dhe) { u.marca(fb, true, "Você viu a diferença: só a troca efêmera protege as sessões passadas."); concluir(); }
            else { fb.className = "small mt-2 mb-0"; fb.textContent = "Agora repita com a outra troca de chaves."; }
        }
        troca.addEventListener("change", function () { passo = 0; resultado.textContent = ""; desenha(); });
        raiz.append(u.campo("Troca de chaves da suíte escolhida", troca),
            el("div", { class: "d-flex flex-wrap gap-2" }, u.botao("Próxima mensagem", "btn-primary", proxima), u.botao("Recomeçar", "btn-outline-secondary", function () { passo = 0; resultado.textContent = ""; desenha(); }),
                u.botao("Seis meses depois, Terrence rouba a chave privada", "btn-outline-danger", terrence)),
            area, explica, resultado, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): complete o handshake com RSA e com DHE_RSA e veja, nos dois casos, o que Terrence consegue fazer."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 5. O protocolo de registro: MAC com número de sequência (pág. 176–177 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("registro-tls", function (raiz) {
        var CHAVE = "chave-mac-da-sessao";
        var DADOS = ["GET /conta HTTP/1.1", "POST /transferir valor=10", "GET /sair HTTP/1.1"];
        function mac(seq, dados) { return resumo(CHAVE + "|" + seq + "|23 03 03|" + dados); }
        var enviados = DADOS.map(function (d, i) { return { seq: i, dados: d, mac: mac(i, d) }; });
        var acao = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "nada" }, "Mallory não faz nada"),
            el("option", { value: "repete" }, "Mallory repete o registro 2 (a transferência)"),
            el("option", { value: "apaga" }, "Mallory apaga o registro 2"),
            el("option", { value: "altera" }, "Mallory troca valor=10 por valor=99 no registro 2"));
        var log = el("ul", { class: "log mt-2" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "tls-registro", 10, "Ver o receptor TLS detectar registros repetidos, apagados e alterados");
        function entrega() {
            var chegada = enviados.map(function (r) { return { dados: r.dados, mac: r.mac }; });
            if (acao.value === "repete") chegada.splice(2, 0, { dados: chegada[1].dados, mac: chegada[1].mac });
            if (acao.value === "apaga") chegada.splice(1, 1);
            if (acao.value === "altera") chegada[1] = { dados: chegada[1].dados.replace("valor=10", "valor=99"), mac: chegada[1].mac };
            log.replaceChildren();
            var esperado = 0, falhou = false;
            chegada.forEach(function (r) {
                if (falhou) return;
                var ok = mac(esperado, r.dados) === r.mac;
                log.append(el("li", { class: ok ? "" : "text-danger" }, "registro \"" + r.dados + "\"  MAC recebido " + r.mac + "  ·  calculado com seq " + esperado + ": " + mac(esperado, r.dados) + (ok ? "  ✔" : "  ✘ alerta: o receptor encerra a sessão")));
                if (!ok) falhou = true;
                esperado++;
            });
            if (acao.value !== "nada") vistos[acao.value] = falhou;
            if (acao.value === "nada") u.marca(fb, true, "Os três registros chegam em ordem, e todos os MACs conferem.");
            else u.marca(fb, falhou, falhou ? "Detectado: o MAC cobre o número de sequência, que não viaja no registro mas é contado nas duas pontas." : "Não detectado.");
            if (vistos.repete && vistos.apaga && vistos.altera) { concluir(); fb.textContent += " Os três ataques foram detectados."; }
        }
        raiz.append(el("p", { class: "small mb-2" }, "O cliente envia três registros. Cada MAC (simplificado) cobre a chave, o número de sequência (0, 1, 2…), o cabeçalho e os dados."),
            u.campo("O que Mallory faz no caminho", acao), u.botao("Entregar os registros", "btn-primary", entrega), log, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): experimente os três ataques."));
    });

    /* ------------------------------------------------------------------
     * 6. Quantos RTTs até a primeira resposta (pág. 178–180 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("rtts-tls", function (raiz) {
        var rtt = faixa("RTT entre o cliente e o servidor", 10, 300, 10, 100, function (v) { return v + " ms"; });
        var area = el("div", { class: "mt-2" });
        var CASOS = [
            { nome: "TLS 1.2", tcp: 1, tls: 2, http: 1 },
            { nome: "TLS 1.3", tcp: 1, tls: 1, http: 1 },
            { nome: "TLS 1.3 com 0-RTT", tcp: 1, tls: 0, http: 1 }
        ];
        function desenha() {
            var T = Number(rtt.input.value);
            area.replaceChildren();
            CASOS.forEach(function (c) {
                var total = c.tcp + c.tls + c.http;
                area.append(el("div", { class: "mb-2" },
                    el("div", { class: "small d-flex justify-content-between" }, el("span", null, c.nome), el("strong", null, total + " RTT = " + total * T + " ms")),
                    el("div", { class: "d-flex", style: "height:22px", role: "img", "aria-label": c.nome + ": " + c.tcp + " RTT de TCP, " + c.tls + " de TLS e " + c.http + " do pedido HTTP" },
                        el("div", { class: "small text-center", style: "width:" + 25 * c.tcp + "%;background:#adb5bd;color:#212529;border-right:2px solid var(--bs-body-bg,#fff)" }, "TCP"),
                        c.tls ? el("div", { class: "small text-center", style: "width:" + 25 * c.tls + "%;background:#ffc107;color:#212529;border-right:2px solid var(--bs-body-bg,#fff)" }, "TLS") : null,
                        el("div", { class: "small text-center", style: "width:" + 25 * c.http + "%;background:#6ea8fe;color:#212529" }, c.tls ? "HTTP" : "TLS + HTTP"))));
            });
        }
        rtt.input.addEventListener("input", desenha);
        var resp = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Economia em milissegundos" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "tls-rtt", 10, "Calcular o ganho do TLS 1.3 com 0-RTT");
        raiz.append(rtt.linha, area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): com RTT de 150 ms, quantos milissegundos o TLS 1.3 com 0-RTT economiza até a resposta HTTP, em relação ao TLS 1.2?"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === 300;
                u.marca(fb, ok, ok ? "Isso: 4 RTT contra 2 RTT, ou seja, 2 × 150 = 300 ms." : "Ainda não. Conte os RTTs de cada caso no gráfico.");
                if (ok) concluir();
            })), fb);
        desenha();
    });
}());

/* Etapa "3. Visualização" do conceito tls-inicio: porta dedicada ou STARTTLS (pág. 173 do PDF; RFC 3207). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;
    function escolha(rotulo, lista) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            el("option", { value: "" }, "escolha…"), lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    var CENARIOS = {
        porta: {
            titulo: "IMAP numa porta dedicada (993)",
            texto: "O cliente já se conecta à porta 993, e o handshake TLS começa logo depois da conexão TCP. Os comandos IMAP só passam pela sessão cifrada.",
            eventos: [
                { de: 0, para: 1, rotulo: "SYN (porta 993)", tipo: "tracejado" }, { de: 1, para: 0, rotulo: "SYN+ACK", tipo: "tracejado" }, { de: 0, para: 1, rotulo: "ACK", tipo: "tracejado" },
                { de: 0, para: 1, rotulo: "TLS ClientHello", tipo: "ctrl" }, { de: 1, para: 0, rotulo: "TLS ServerHello…", tipo: "ctrl" },
                { nota: 0, rotulo: "daqui em diante, tudo cifrado" },
                { de: 1, para: 0, rotulo: "* OK IMAP pronto" }, { de: 0, para: 1, rotulo: "a1 LOGIN …" }
            ]
        },
        starttls: {
            titulo: "SMTP com STARTTLS na porta normal (25)",
            texto: "A conexão começa em claro, na porta 25. O servidor anuncia STARTTLS na resposta ao EHLO; o cliente pede, o servidor aceita com 220, e o handshake TLS começa na mesma conexão. Depois dele, o cliente manda o EHLO de novo, já cifrado (RFC 3207).",
            eventos: [
                { de: 0, para: 1, rotulo: "SYN (porta 25)", tipo: "tracejado" }, { de: 1, para: 0, rotulo: "SYN+ACK", tipo: "tracejado" }, { de: 0, para: 1, rotulo: "ACK", tipo: "tracejado" },
                { de: 1, para: 0, rotulo: "220 mail.example.org" }, { de: 0, para: 1, rotulo: "EHLO cliente.example" },
                { de: 1, para: 0, rotulo: "250-STARTTLS" }, { de: 0, para: 1, rotulo: "STARTTLS" }, { de: 1, para: 0, rotulo: "220 Ready to start TLS" },
                { de: 0, para: 1, rotulo: "TLS ClientHello", tipo: "ctrl" }, { de: 1, para: 0, rotulo: "TLS ServerHello…", tipo: "ctrl" },
                { nota: 0, rotulo: "daqui em diante, tudo cifrado" },
                { de: 0, para: 1, rotulo: "EHLO cliente.example" }
            ]
        }
    };
    var ORDEM = ["EHLO", "250-STARTTLS", "STARTTLS", "220 Ready to start TLS"];
    R.starttlsOrdem = ORDEM;

    R.registrar("porta-ou-starttls", function (raiz) {
        var atual = "porta";
        var area = el("div", { class: "mt-2" });
        var saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        var botoes = {};
        function mostra() {
            var c = CENARIOS[atual];
            Object.keys(botoes).forEach(function (k) { botoes[k].className = "btn btn-sm " + (k === atual ? "btn-primary" : "btn-outline-primary"); botoes[k].setAttribute("aria-pressed", k === atual ? "true" : "false"); });
            area.replaceChildren(R.diagramaSequencia({ titulo: c.titulo, colunas: ["Cliente", "Servidor"], eventos: c.eventos, largura: 560, margem: 110, passo: 30 }));
            saida.textContent = c.texto;
        }
        botoes.porta = u.botao("Porta dedicada (IMAP, 993)", "btn-primary", function () { atual = "porta"; mostra(); });
        botoes.starttls = u.botao("STARTTLS (SMTP, 25)", "btn-outline-primary", function () { atual = "starttls"; mostra(); });
        var P1 = escolha("Porta do POP3 sobre TLS", [["110", "110"], ["443", "443"], ["993", "993"], ["995", "995"]]);
        var posicoes = ORDEM.map(function (m) { return escolha("Posição da mensagem " + m, [["1", "1º"], ["2", "2º"], ["3", "3º"], ["4", "4º"]]); });
        var embaralhada = [2, 0, 3, 1];
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "porta-ou-starttls", 15, "Começar uma sessão TLS");
        raiz.append(el("div", { class: "d-flex flex-wrap gap-2" }, botoes.porta, botoes.starttls), area, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            el("div", { class: "row g-2 align-items-center mb-2" }, el("div", { class: "col-sm-7 small" }, "Pela tabela acima, em que porta fica o POP3 sobre TLS?"), el("div", { class: "col-sm-5" }, P1)),
            el("p", { class: "small mb-1" }, "Ponha as mensagens do STARTTLS na ordem em que aparecem na conexão:"),
            el("div", null, embaralhada.map(function (i) { return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small mono" }, ORDEM[i]), el("div", { class: "col-sm-5" }, posicoes[i])); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok1 = P1.value === "995";
                var ok2 = posicoes.every(function (s, i) { return s.value === String(i + 1); });
                u.marca(fb, ok1 && ok2, ok1 && ok2 ? "Isso. O servidor anuncia (250-STARTTLS) em resposta ao EHLO, o cliente pede, e o servidor aceita com 220."
                    : (ok1 ? "" : "Veja a linha POP3 da tabela. ") + (ok2 ? "" : "A ordem ainda não está certa: compare com o diagrama do STARTTLS."));
                if (ok1 && ok2) concluir();
            }), fb);
        mostra();
    });
}());
