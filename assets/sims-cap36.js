/* Simulações do Capítulo 36 — Prática: TLS e ssh (seção 4.10 do livro, pág. 315 do PDF).
 * Capturas ilustrativas, montadas de acordo com as RFCs 854 (telnet), 5246 e 8446 (TLS) e 4253 (ssh). */
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

    /* ---------- Atividade 1: o que o telnet entrega a quem escuta ---------- */
    // No modo caractere, cada tecla vai num segmento, e o servidor ecoa o que deve aparecer na tela (a senha não é ecoada).
    var CAPTURA = [["S", "login: "]].concat("aluno".split("").reduce(function (a, c) { return a.concat([["C", c], ["S", c]]); }, []),
        [["C", "\r"], ["S", "\r\nPassword: "]], "segredo".split("").map(function (c) { return ["C", c]; }), [["C", "\r"], ["S", "\r\nLast login: …\r\n$ "]]);
    R.capturaTelnet36 = CAPTURA;
    R.registrar("telnet-claro", function (raiz) {
        var filtro = escolha("Mostrar", [["todos", "todos os segmentos"], ["C", "só os do cliente"], ["S", "só os do servidor"]], false);
        var tabela = el("div", { class: "table-responsive" });
        function mostra() {
            var linhas = CAPTURA.map(function (s, i) { return [i + 1, s]; }).filter(function (x) { return filtro.value === "todos" || x[1][0] === filtro.value; });
            tabela.replaceChildren(el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "#"), el("th", null, "Sentido"), el("th", null, "Dados (1 a poucos bytes)"))),
                el("tbody", null, linhas.map(function (x) { return el("tr", null, el("td", null, String(x[0])), el("td", null, x[1][0] === "C" ? "cliente → servidor :23" : "servidor → cliente"), el("td", null, JSON.stringify(x[1][1]).slice(1, -1))); }))));
        }
        filtro.addEventListener("change", mostra);
        var P1 = texto("Senha"), P2 = texto("Segmentos com a senha");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "telnet-claro", 10, "O telnet em claro");
        raiz.append(el("p", { class: "small mb-1" }, "Uma captura ilustrativa de uma sessão telnet na porta 23: cada tecla viaja num segmento TCP."),
            u.campo("Filtro", filtro), tabela,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Qual é a senha do usuário?", P1),
            linhaPergunta("Em quantos segmentos ela viajou (sem contar o Enter)?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value.trim() === "segredo" && Number(P2.value) === 7;
                u.marca(fb, ok, ok ? "Isso: o servidor não ecoa a senha, mas o cliente a manda letra por letra, em claro, para quem estiver escutando." : "Ainda não. Filtre os segmentos do cliente que vêm depois de \"Password: \".");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 2: registros TLS ---------- */
    var TIPO_REG = { 20: "change_cipher_spec", 21: "alert", 22: "handshake", 23: "application_data" };
    var TIPO_HS = { 1: "ClientHello", 2: "ServerHello", 4: "NewSessionTicket", 8: "EncryptedExtensions", 11: "Certificate", 12: "ServerKeyExchange", 13: "CertificateRequest", 14: "ServerHelloDone", 15: "CertificateVerify", 16: "ClientKeyExchange", 20: "Finished" };
    function leRegistro(hex) {
        var b = hex.trim().split(/\s+/).map(function (x) { return parseInt(x, 16); });
        if (b.length < 5 || b.some(isNaN)) return null;
        var r = { tipo: b[0], nome: TIPO_REG[b[0]] || "desconhecido", versao: "0x" + ((b[1] << 8) | b[2]).toString(16).padStart(4, "0"), tamanho: (b[3] << 8) | b[4] };
        if (b[0] === 22 && b.length > 5) r.hs = TIPO_HS[b[5]] || ("tipo " + b[5]);
        return r;
    }
    R.leRegistro36 = leRegistro;
    var CAPTURAS = {
        tls12: [["C", "16 03 01 00 c4 01", "ClientHello em claro: versões e cifras propostas, e o nome do servidor (SNI)."],
            ["S", "16 03 03 00 51 02", "ServerHello em claro."], ["S", "16 03 03 0b 2e 0b", "Certificate em claro: qualquer um vê o certificado do servidor."],
            ["S", "16 03 03 01 4d 0c", "ServerKeyExchange (a parte do servidor no Diffie-Hellman)."], ["S", "16 03 03 00 04 0e", "ServerHelloDone."],
            ["C", "16 03 03 00 46 10", "ClientKeyExchange."], ["C", "14 03 03 00 01 01", "ChangeCipherSpec: daqui em diante, o cliente cifra."],
            ["C", "16 03 03 00 28", "Finished, já cifrado (o tipo continua 22, mas o conteúdo não se lê)."], ["S", "14 03 03 00 01 01", "ChangeCipherSpec do servidor."],
            ["S", "16 03 03 00 28", "Finished do servidor, cifrado."], ["C", "17 03 03 01 c2", "Dados da aplicação (o pedido HTTP), cifrados."]],
        tls13: [["C", "16 03 01 00 f8 01", "ClientHello em claro, já com a parte do cliente no Diffie-Hellman (key_share) e o SNI."],
            ["S", "16 03 03 00 7a 02", "ServerHello em claro: o último registro de handshake legível."], ["S", "14 03 03 00 01 01", "ChangeCipherSpec de mentira, só para passar por caixas intermediárias antigas (RFC 8446, apêndice D.4)."],
            ["S", "17 03 03 04 75", "Parece dados da aplicação, mas leva EncryptedExtensions, Certificate, CertificateVerify e Finished, cifrados: o certificado não aparece."],
            ["C", "14 03 03 00 01 01", "ChangeCipherSpec de compatibilidade do cliente."], ["C", "17 03 03 00 35", "O Finished do cliente, cifrado."],
            ["C", "17 03 03 01 c2", "Dados da aplicação, cifrados."]]
    };
    R.capturasTLS36 = CAPTURAS;
    R.registrar("registro-tls", function (raiz) {
        var cap = escolha("Captura", [["tls12", "Handshake TLS 1.2"], ["tls13", "Handshake TLS 1.3"]], false);
        var lista = el("div", { class: "table-responsive" }), expl = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            lista.replaceChildren(el("table", { class: "table table-sm small mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Sentido"), el("th", null, "Primeiros bytes"), el("th", null, "Tipo"), el("th", null, "Versão"), el("th", null, "Tamanho"))),
                el("tbody", null, CAPTURAS[cap.value].map(function (x) {
                    var r = leRegistro(x[1]);
                    return el("tr", { style: "cursor:pointer", tabindex: 0, onclick: function () { expl.textContent = x[2]; }, onkeydown: function (e) { if (e.key === "Enter") expl.textContent = x[2]; } },
                        el("td", null, x[0] === "C" ? "C → S" : "S → C"), el("td", { class: "mono" }, x[1]), el("td", null, r.nome + (r.hs ? " (" + r.hs + ")" : "")), el("td", { class: "mono" }, r.versao), el("td", null, r.tamanho + " bytes"));
                }))));
            expl.textContent = "Clique numa linha para ver o que ela leva.";
        }
        cap.addEventListener("change", mostra);
        var hex = texto("Cabeçalho em hexadecimal"); hex.value = "17 03 03 00 45";
        var dec = el("p", { class: "small mt-1 mb-0 mono", "aria-live": "polite" });
        function decodifica() { var r = leRegistro(hex.value); dec.textContent = r ? "tipo " + r.tipo + " = " + r.nome + (r.hs ? " (" + r.hs + ")" : "") + "; versão " + r.versao + "; " + r.tamanho + " bytes de conteúdo" : "Digite pelo menos 5 bytes em hexadecimal."; }
        hex.addEventListener("input", decodifica);
        var P1 = texto("Tamanho"), P2 = escolha("Onde o certificado aparece em claro", [["12", "só no TLS 1.2"], ["13", "só no TLS 1.3"], ["ambos", "nos dois"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "registro-tls", 15, "Lendo registros TLS");
        raiz.append(u.campo("Captura", cap), lista, expl,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Decodificador de cabeçalho de registro (5 bytes: tipo, versão, tamanho)"),
            hex, dec,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("O registro 17 03 03 00 45 leva quantos bytes de conteúdo?", P1),
            linhaPergunta("Em qual versão um observador consegue ler o certificado do servidor?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 0x45 && P2.value === "12";
                u.marca(fb, ok, ok ? "Isso: 0x45 = 69 bytes. No TLS 1.3, tudo depois do ServerHello vai cifrado, inclusive o certificado; o nome do servidor ainda passa em claro no SNI do ClientHello." : "Ainda não. Use o decodificador e compare as duas capturas.");
                if (ok) concluir();
            }), fb);
        mostra(); decodifica();
    });

    /* ---------- Atividade 3: o que o ssh deixa em claro ---------- */
    var KEX = {
        cliente: { kex: ["curve25519-sha256", "ecdh-sha2-nistp256", "diffie-hellman-group14-sha256"], cifra: ["chacha20-poly1305@openssh.com", "aes128-gcm@openssh.com", "aes256-ctr"] },
        servidor: { kex: ["sntrup761x25519-sha512@openssh.com", "curve25519-sha256", "diffie-hellman-group14-sha256"], cifra: ["aes256-gcm@openssh.com", "aes128-gcm@openssh.com", "aes256-ctr"] }
    };
    function negocia(cli, srv) { return cli.find(function (a) { return srv.indexOf(a) >= 0; }) || null; }   // RFC 4253, seção 7.1
    R.negociaSSH36 = negocia;
    R.kexSSH36 = KEX;
    R.registrar("ssh-visivel", function (raiz) {
        var passos = [
            ["C → S", "SSH-2.0-OpenSSH_9.6\\r\\n", "A linha de identificação, em texto: versão do protocolo e do programa (RFC 4253, seção 4.2)."],
            ["S → C", "SSH-2.0-OpenSSH_9.7\\r\\n", "A do servidor."],
            ["C → S", "KEXINIT (mensagem 20): kex = " + KEX.cliente.kex.join(",") + "; cifras = " + KEX.cliente.cifra.join(","), "Em claro: as listas de algoritmos do cliente, em ordem de preferência."],
            ["S → C", "KEXINIT (mensagem 20): kex = " + KEX.servidor.kex.join(",") + "; cifras = " + KEX.servidor.cifra.join(","), "As listas do servidor."],
            ["C → S", "KEX_ECDH_INIT (30): a chave pública efêmera do cliente", "A troca de chaves Diffie-Hellman, ainda em claro (as chaves públicas podem ser vistas sem problema)."],
            ["S → C", "KEX_ECDH_REPLY (31): chave do host, chave efêmera e assinatura", "O servidor prova a sua identidade com a chave do host."],
            ["C ↔ S", "NEWKEYS (21)", "Daqui em diante, tudo cifrado e autenticado: usuário, senha, comandos e respostas."],
            ["C → S", "pacote cifrado de 52 bytes", "Só dá para ver o tamanho e o momento dos pacotes."]
        ];
        var lista = el("ol", { class: "small mb-1" }, passos.map(function (p) {
            return el("li", null, el("button", { type: "button", class: "btn btn-link btn-sm p-0 text-start mono", style: "white-space: normal", onclick: function () { expl.textContent = p[2]; } }, p[0] + "  " + p[1]));
        }));
        var expl = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" }, "Clique num passo.");
        var P1 = escolha("Algoritmo de troca de chaves escolhido", KEX.servidor.kex.concat(KEX.cliente.kex).filter(function (x, i, a) { return a.indexOf(x) === i; }).map(function (x) { return [x, x]; }));
        var P2 = escolha("Cifra escolhida", KEX.cliente.cifra.concat(KEX.servidor.cifra).filter(function (x, i, a) { return a.indexOf(x) === i; }).map(function (x) { return [x, x]; }));
        var P3 = texto("Número da mensagem NEWKEYS");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ssh-visivel", 15, "O que o ssh deixa ver");
        raiz.append(el("p", { class: "small mb-1" }, "O começo de uma conexão ssh, como um observador a vê (captura ilustrativa):"), lista, expl,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): a regra da RFC 4253 é escolher o primeiro algoritmo da lista do cliente que o servidor também aceita."),
            linhaPergunta("Que troca de chaves é escolhida?", P1), linhaPergunta("Que cifra é escolhida?", P2),
            linhaPergunta("Qual é o número da mensagem depois da qual tudo vai cifrado?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === negocia(KEX.cliente.kex, KEX.servidor.kex) && P2.value === negocia(KEX.cliente.cifra, KEX.servidor.cifra) && Number(P3.value) === 21;
                u.marca(fb, ok, ok ? "Isso: curve25519-sha256 e aes128-gcm@openssh.com; a preferência que manda é a do cliente." : "Ainda não. Percorra a lista do cliente em ordem e pare no primeiro que o servidor também tem.");
                if (ok) concluir();
            }), fb);
    });
}());
