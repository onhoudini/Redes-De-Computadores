/* Simulações do Capítulo 11 — Protocolos seguros: ssh, TLS e DNSSEC (seções 3.7 a 3.9 do livro).
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
    R.registrar("telnet-captura", function (raiz) {
        var proto = el("select", { class: "form-select form-select-sm" }, el("option", { value: "telnet" }, "telnet (porta 23)"), el("option", { value: "ssh" }, "ssh (porta 22)"));
        var usuario = entrada("alice", "Usuário"), senha = entrada("s3nh@", "Senha");
        var terminal = el("pre", { class: "log mb-0" });
        var eve = el("pre", { class: "log mb-0", "aria-live": "polite" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "telnet-ssh", 10, "Comparar o que Eve captura no telnet e no ssh");
        var sorteio = u.aleatorio(5);
        function cifrado(n) { var s = ""; for (var i = 0; i < n; i++) s += Math.floor(sorteio() * 256).toString(16).padStart(2, "0"); return s; }
        function login() {
            var us = usuario.value || "alice", se = senha.value || "x";
            terminal.textContent = "login: " + us + "\nPassword: \n$ ls\nnotas.txt  trabalho.pdf";
            if (proto.value === "telnet") {
                var pacotes = [];
                (us + "\r").split("").forEach(function (c) { pacotes.push("cliente → servidor  '" + (c === "\r" ? "\\r" : c) + "'"); });
                pacotes.push("servidor → cliente  'Password: '");
                (se + "\r").split("").forEach(function (c) { pacotes.push("cliente → servidor  '" + (c === "\r" ? "\\r" : c) + "'"); });
                pacotes.push("cliente → servidor  'ls\\r'", "servidor → cliente  'notas.txt  trabalho.pdf'");
                eve.textContent = "Eve capturou (TCP, porta 23):\n" + pacotes.join("\n") + "\n\n→ senha de " + us + ": " + se;
                vistos.telnet = true;
            } else {
                var linhas = ["cliente → servidor  SSH-2.0-OpenSSH_9.6", "servidor → cliente  SSH-2.0-OpenSSH_9.6", "… negociação e troca de chaves …"];
                for (var i = 0; i < 5; i++) linhas.push((i % 2 ? "servidor → cliente  " : "cliente → servidor  ") + cifrado(16) + "…");
                eve.textContent = "Eve capturou (TCP, porta 22):\n" + linhas.join("\n") + "\n\n→ só as versões aparecem em claro; usuário, senha e comandos vão cifrados.";
                vistos.ssh = true;
            }
            if (vistos.telnet && vistos.ssh) { u.marca(fb, true, "No telnet, cada tecla atravessa a rede em claro, inclusive a senha. No ssh, Eve só vê as linhas de versão e bytes cifrados."); concluir(); }
        }
        raiz.append(el("div", { class: "row g-2" },
            el("div", { class: "col-sm-4" }, u.campo("Protocolo", proto)),
            el("div", { class: "col-sm-4" }, u.campo("Usuário", usuario)),
            el("div", { class: "col-sm-4" }, u.campo("Senha", senha))),
            u.botao("Fazer login e rodar ls", "btn-primary mb-2", login),
            el("div", { class: "row g-2" },
                el("div", { class: "col-md-5" }, el("div", { class: "small text-muted" }, "O que Alice vê"), terminal),
                el("div", { class: "col-md-7" }, el("div", { class: "small text-muted" }, "O que Eve, na mesma rede, vê"), eve)),
            fb, el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): faça o login pelos dois protocolos e compare o que Eve consegue ler."));
    });

    /* ------------------------------------------------------------------
     * 2. Negociação de algoritmos do ssh e o ataque de rebaixamento (pág. 170–171 do PDF)
     * ------------------------------------------------------------------ */
    function negocia(cliente, servidor) {
        for (var i = 0; i < cliente.length; i++) if (servidor.indexOf(cliente[i]) >= 0) return cliente[i];
        return null;
    }
    R.negociaSsh = negocia;

    R.registrar("negociacao-ssh", function (raiz) {
        var TIPOS = [
            { nome: "Troca de chaves", c: ["curve25519-sha256", "diffie-hellman-group14-sha256"], s: ["diffie-hellman-group14-sha256", "curve25519-sha256"] },
            { nome: "Cifra", c: ["cifra-128", "cifra-48"], s: ["cifra-48", "cifra-128"] },
            { nome: "MAC", c: ["hmac-sha2-256", "hmac-sha1"], s: ["hmac-sha1", "hmac-sha2-256"] },
            { nome: "Compressão", c: ["none", "zlib"], s: ["none"] }
        ];
        var mallory = caixa("Mallory apaga a cifra-128 da lista que o cliente envia", false);
        var hash = caixa("O servidor assina um hash de todas as mensagens da troca (como faz o ssh)", true);
        var tabela = el("div", { class: "mt-2" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "ssh-rebaixamento", 15, "Ver um ataque de rebaixamento funcionar e ser detectado");
        function conecta() {
            var linhas = [], comprometido = false;
            TIPOS.forEach(function (t) {
                var enviada = t.c.slice();
                if (t.nome === "Cifra" && mallory.input.checked) { enviada = enviada.filter(function (x) { return x !== "cifra-128"; }); comprometido = true; }
                linhas.push({ t: t, enviada: enviada, escolhido: negocia(enviada, t.s) });
            });
            tabela.replaceChildren(el("table", { class: "table table-sm small mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Tipo"), el("th", null, "Lista do cliente (preferida primeiro)"), el("th", null, "Lista do servidor"), el("th", null, "Escolhido"))),
                el("tbody", null, linhas.map(function (l) {
                    return el("tr", null, el("td", null, l.t.nome),
                        el("td", { class: "mono" }, l.t.c.map(function (x, i) {
                            var item = l.enviada.indexOf(x) < 0 ? el("s", { title: "apagado por Mallory" }, x) : x;
                            return i ? [", ", item] : item;
                        })),
                        el("td", { class: "mono" }, l.t.s.join(", ")),
                        el("td", { class: "mono fw-semibold" }, l.escolhido || "nenhum"));
                }))));
            if (!comprometido) { u.marca(fb, true, "Sem ataque: em cada tipo vale o primeiro algoritmo do cliente que o servidor aceita, inclusive a cifra-128."); return; }
            if (hash.input.checked) {
                vistos.detectado = true;
                u.marca(fb, true, "Ataque detectado: o hash assinado pelo servidor cobre a lista que ELE recebeu, sem a cifra-128; o cliente calcula o hash com a lista que ENVIOU, e os dois não batem. O cliente encerra a conexão.");
            } else {
                vistos.rebaixado = true;
                u.marca(fb, false, "Rebaixamento: a sessão usa a cifra-48, que Mallory consegue quebrar, e ninguém percebe.");
            }
            if (vistos.detectado && vistos.rebaixado) { concluir(); fb.textContent += " Você viu os dois casos."; }
        }
        raiz.append(mallory.linha, hash.linha, u.botao("Conectar", "btn-primary mt-2", conecta), tabela, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "As cifras \"cifra-128\" e \"cifra-48\" são as do exemplo do livro (chaves de 128 e de 48 bits). Desafio (15 pts): faça o rebaixamento passar despercebido e depois ser detectado."));
        conecta();
    });

    /* ------------------------------------------------------------------
     * 3. A chave do servidor guardada pelo cliente (pág. 170–171 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("chave-servidor", function (raiz) {
        var CHAVES = {
            real: "SHA256:q3Rv8mT0bW1yK5sXcL9eA2uH6nJ4pZ7gD0fQ8iVwE1o",
            mallory: "SHA256:Zx7Lp2Qs9Vb4Nm1Kt6Hy3Gd8Fr5Ew0Ac2Ju7Ik4Ol9P",
            nova: "SHA256:Hk4Tn8Wq1Ys6Pb3Mv9Lc2Xd7Ge5Rf0Ja8Uo1Si3Zt6E"
        };
        var quem = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "real" }, "o servidor verdadeiro"),
            el("option", { value: "mallory" }, "Mallory, no meio do caminho"),
            el("option", { value: "nova" }, "o servidor verdadeiro, reinstalado com uma chave nova"));
        var conhecida = null;
        var tela = el("pre", { class: "log mb-2", "aria-live": "polite" });
        var escolhas = el("div", { class: "d-flex flex-wrap gap-2" });
        var memoria = el("p", { class: "small mb-0" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "ssh-chave", 15, "Guardar a chave certa e recusar a de Mallory");
        function mostraMemoria() { memoria.textContent = "Chave guardada pelo cliente (known_hosts): " + (conhecida || "nenhuma"); }
        function decide(aceita) {
            var q = quem.value;
            escolhas.replaceChildren();
            if (aceita) {
                conhecida = CHAVES[q];
                tela.textContent += "\n> yes\nConectado.";
                if (q === "mallory") u.marca(fb, false, "Você aceitou a chave de Mallory: agora ele decifra e altera toda a sessão. Em caso de dúvida, confira a impressão digital com o administrador por outro meio.");
                else if (q === "real") { vistos.guardou = true; u.marca(fb, true, "Chave verdadeira guardada. Das próximas vezes, o cliente confere sozinho."); }
                else u.marca(fb, true, "Chave nova aceita. Faça isso só depois de confirmar com o administrador que o servidor foi mesmo reinstalado.");
            } else {
                tela.textContent += "\n> no\nConexão recusada.";
                if (q === "mallory" && conhecida === CHAVES.real) { vistos.recusou = true; u.marca(fb, true, "Isso: a chave mudou, e era Mallory. Recusar protege a sua senha e a sessão."); }
                else u.marca(fb, true, "Conexão recusada.");
            }
            mostraMemoria();
            if (vistos.guardou && vistos.recusou) concluir();
        }
        function conecta() {
            var q = quem.value, fp = CHAVES[q];
            escolhas.replaceChildren(); fb.textContent = "";
            tela.textContent = "$ ssh alice@servidor.example";
            if (!conhecida) {
                tela.textContent += "\nThe authenticity of host 'servidor.example' can't be established.\nED25519 key fingerprint is " + fp + ".\nAre you sure you want to continue connecting (yes/no)?";
            } else if (conhecida === fp) {
                tela.textContent += "\n(a chave confere com a guardada)\nalice@servidor.example's password:\nConectado.";
                return;
            } else {
                tela.textContent += "\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\nIT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!\nThe fingerprint for the ED25519 key sent by the remote host is\n" + fp + ".\nAceitar a chave nova (yes/no)?";
            }
            escolhas.append(u.botao("yes", "btn-outline-danger", function () { decide(true); }), u.botao("no", "btn-outline-secondary", function () { decide(false); }));
        }
        raiz.append(u.campo("Quem responde em servidor.example", quem), u.botao("ssh alice@servidor.example", "btn-primary mb-2 mono", conecta),
            tela, escolhas, memoria, fb,
            u.botao("Esquecer a chave guardada", "btn-outline-secondary btn-sm mt-2", function () { conhecida = null; mostraMemoria(); }),
            el("p", { class: "small text-muted mt-2 mb-0" }, "A impressão digital verdadeira, publicada pelo administrador, é " + CHAVES.real + ". Desafio (15 pts): na primeira conexão, guarde a chave verdadeira; depois, com Mallory no meio, recuse a conexão."));
        mostraMemoria();
    });

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
            area.replaceChildren(R.diagramaSequencia({ titulo: "Handshake do TLS 1.2 com troca de chaves " + troca.value + ".", colunas: ["Cliente", "Servidor"], eventos: m.slice(0, passo), passo: 30, margem: 160 }));
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

    /* ------------------------------------------------------------------
     * 7. Envenenamento de cache do DNS (pág. 181–182 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("envenenamento-dns", function (raiz) {
        var k = faixa("Respostas falsas que Mallory consegue enviar a cada consulta de Alice", 0, 16, 1, 10, function (v) { return num(Math.pow(2, v)); });
        var t = faixa("Consultas que Mallory consegue provocar", 1, 1000, 1, 1, function (v) { return num(v); });
        var porta = caixa("Alice sorteia a porta de origem de cada consulta", false);
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        function desenha() {
            var K = Math.pow(2, Number(k.input.value)), N = Number(t.input.value);
            var espaco = porta.input.checked ? Math.pow(2, 32) : Math.pow(2, 16);
            var p1 = Math.min(1, K / espaco), pn = 1 - Math.pow(1 - p1, N);
            saida.replaceChildren(
                el("div", null, "Combinações a adivinhar: ", el("strong", null, porta.input.checked ? "2^16 IDs × 2^16 portas ≈ 4,3 bilhões" : "2^16 = 65 536 IDs")),
                el("div", null, "Chance de envenenar numa consulta: ", el("strong", null, (100 * p1).toLocaleString("pt-BR", { maximumSignificantDigits: 3 }) + "%")),
                el("div", null, "Chance em " + num(N) + " consulta(s): ", el("strong", null, (100 * pn).toLocaleString("pt-BR", { maximumSignificantDigits: 3 }) + "%")),
                el("div", { class: "progress mt-1", style: "height:10px", role: "img", "aria-label": "Chance acumulada" }, el("div", { class: "progress-bar bg-danger", style: "width:" + (100 * pn) + "%" })));
        }
        [k.input, t.input, porta.input].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var resp = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Número de respostas falsas" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dns-envenenamento", 10, "Calcular o esforço do envenenamento de cache");
        raiz.append(k.linha, t.linha, porta.linha, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): com a porta fixa, quantas respostas falsas Mallory precisa enviar para ter 50% de chance numa única consulta?"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === 32768;
                u.marca(fb, ok, ok ? "Isso: metade dos 65 536 identificadores. Com a porta sorteada, a mesma chance exigiria mais de 2 bilhões." : "Ainda não. Quantos IDs diferentes existem, e que fração deles Mallory precisa cobrir?");
                if (ok) concluir();
            })), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 8. A cadeia de confiança do DNSSEC (pág. 183–184 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("cadeia-dnssec", function (raiz) {
        var ataque = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "nada" }, "Nenhum ataque"),
            el("option", { value: "aaaa" }, "Mallory troca o endereço do AAAA de www.example.org"),
            el("option", { value: "chave" }, "Mallory troca a DNSKEY de example.org pela dele"),
            el("option", { value: "ds" }, "Mallory troca a DNSKEY de example.org e o DS guardado em .org"));
        var lista = el("ol", { class: "small mt-2 mb-0" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "dnssec-cadeia", 15, "Ver onde a cadeia do DNSSEC quebra em cada ataque");
        function verifica() {
            var a = ataque.value;
            var chaveEx = a === "chave" || a === "ds" ? "chave-de-mallory" : "chave-example.org";
            var dsEmOrg = a === "ds" ? resumo("chave-de-mallory") : resumo("chave-example.org");
            var endereco = a === "aaaa" ? "203.0.113.66 (de Mallory)" : "2001:db8::80";
            var passos = [
                ["Âncora de confiança: a resolvedora já tem a DNSKEY da raiz, obtida fora do DNS.", true],
                ["DS de .org, na raiz, com RRSIG feita pela chave da raiz.", true],
                ["DNSKEY de .org confere com o resumo do DS: " + resumo("chave-org") + ".", true],
                ["DS de example.org, em .org, com RRSIG feita pela chave de .org.", a !== "ds", "a assinatura de .org não confere com o DS trocado, e Mallory não tem a chave privada de .org"],
                ["DNSKEY de example.org confere com o resumo do DS: resumo(" + chaveEx + ") = " + resumo(chaveEx) + " · DS = " + dsEmOrg + ".", a !== "chave" && a !== "ds", "o resumo da chave recebida é diferente do DS"],
                ["AAAA de www.example.org = " + endereco + ", com RRSIG feita pela chave de example.org.", a !== "aaaa", "a assinatura cobre o endereço original, e Mallory não tem a chave privada de example.org"]
            ];
            lista.replaceChildren();
            var quebrou = false;
            passos.forEach(function (p) {
                if (quebrou) { lista.append(el("li", { class: "text-muted" }, p[0] + " (não verificado)")); return; }
                lista.append(el("li", { class: p[1] ? "" : "text-danger" }, (p[1] ? "✔ " : "✘ ") + p[0] + (p[1] ? "" : " Falha: " + p[2] + ".")));
                if (!p[1]) quebrou = true;
            });
            if (a === "nada") u.marca(fb, true, "A cadeia DS → DNSKEY vai da raiz até o registro: a resposta é autêntica.");
            else { vistos[a] = true; u.marca(fb, true, "A resolvedora rejeita a resposta: a cadeia quebra no passo marcado."); }
            if (vistos.aaaa && vistos.chave && vistos.ds) { concluir(); fb.textContent += " Os três ataques foram barrados."; }
        }
        raiz.append(u.campo("Ataque", ataque), u.botao("Validar www.example.org AAAA", "btn-primary", verifica), lista, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Resumos e assinaturas simplificados, só para mostrar a cadeia. Desafio (15 pts): rode os três ataques e veja onde cada um é barrado."));
        verifica();
    });

    /* ------------------------------------------------------------------
     * 9. NSEC: provando que um nome não existe (pág. 184–185 do PDF)
     * ------------------------------------------------------------------ */
    function chaveCanonica(nome) { return nome.toLowerCase().replace(/\.$/, "").split(".").reverse(); }
    function compara(a, b) {
        var x = chaveCanonica(a), y = chaveCanonica(b);
        for (var i = 0; i < Math.min(x.length, y.length); i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; }
        return x.length - y.length;
    }
    function nsecQueCobre(zona, nome) {
        var z = zona.slice().sort(compara);
        if (z.some(function (n) { return compara(n, nome) === 0; })) return null;
        for (var i = 0; i < z.length; i++) {
            var dono = z[i], prox = z[(i + 1) % z.length];
            var depois = compara(dono, nome) < 0, antes = compara(nome, prox) < 0, volta = compara(prox, dono) <= 0;
            if ((depois && antes) || (volta && (depois || antes))) return { dono: dono, prox: prox };
        }
        return null;
    }
    R.nsecQueCobre = nsecQueCobre;

    R.registrar("nsec", function (raiz) {
        var zona = ["alpha.example.org", "beta.example.org", "gamma.example.org"];
        var consulta = entrada("delta.example.org", "Nome consultado");
        var registros = el("pre", { class: "log mt-2 mb-0" });
        var resposta = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        registros.textContent = zona.map(function (n, i) { return n + " NSEC " + zona[(i + 1) % zona.length]; }).join("\n");
        function responde() {
            var q = consulta.value.trim().toLowerCase();
            if (!q) return;
            var c = nsecQueCobre(zona, q);
            resposta.replaceChildren(c ? el("span", null, "Não existe. O servidor devolve, já assinado: ", el("strong", { class: "mono" }, c.dono + " NSEC " + c.prox), " — entre esses dois nomes não há outro.")
                : el("span", null, q + " existe na zona: o servidor devolve os registros dele."));
        }
        consulta.addEventListener("input", responde);
        var perguntas = [["delta.example.org", "beta.example.org"], ["pi.example.org", "gamma.example.org"], ["aaa.example.org", "gamma.example.org"]];
        var selects = perguntas.map(function (p) {
            return el("select", { class: "form-select form-select-sm", "aria-label": "Registro NSEC que prova que " + p[0] + " não existe" },
                el("option", { value: "" }, "escolha…"), zona.map(function (n, i) { return el("option", { value: n }, n + " NSEC " + zona[(i + 1) % zona.length]); }));
        });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dnssec-nsec", 15, "Escolher o NSEC que prova a inexistência de um nome");
        var passeio = el("p", { class: "small mt-2 mb-0" });
        raiz.append(el("div", { class: "small text-muted" }, "Os registros NSEC da zona do livro (pág. 184 do PDF)"), registros,
            u.campo("Consulte um nome", consulta), resposta,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): qual registro NSEC prova que cada nome não existe?"),
            perguntas.map(function (p, i) { return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-5 mono small" }, p[0]), el("div", { class: "col-sm-7" }, selects[i])); }),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = perguntas.filter(function (p, i) { return selects[i].value === p[1]; }).length;
                u.marca(fb, certas === 3, certas === 3 ? "Os três certos. aaa.example.org viria antes de alpha: é o último NSEC, que dá a volta, que o cobre." : certas + " de 3 certos. Ordene os nomes e veja entre quais dois cada consulta cairia.");
                if (certas === 3) concluir();
            }), fb,
            u.botao("Seguir os NSEC a partir de alpha", "btn-outline-secondary btn-sm mt-2", function () {
                passeio.textContent = "Seguindo cada NSEC até voltar ao início: " + zona.join(" → ") + " → alpha.example.org. Qualquer um pode listar a zona inteira assim (complemento: o NSEC3 dificulta isso).";
            }), passeio);
        responde();
    });
}());
