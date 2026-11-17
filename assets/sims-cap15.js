/* Simulações do Capítulo 15 — Login remoto: telnet e ssh (seção 3.7 do livro).
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
            tabela.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Tipo"), el("th", null, "Lista do cliente (preferida primeiro)"), el("th", null, "Lista do servidor"), el("th", null, "Escolhido"))),
                el("tbody", null, linhas.map(function (l) {
                    return el("tr", null, el("td", null, l.t.nome),
                        el("td", { class: "mono" }, l.t.c.map(function (x, i) {
                            var item = l.enviada.indexOf(x) < 0 ? el("s", { title: "apagado por Mallory" }, x) : x;
                            return i ? [", ", item] : item;
                        })),
                        el("td", { class: "mono" }, l.t.s.join(", ")),
                        el("td", { class: "mono fw-semibold" }, l.escolhido || "nenhum"));
                })))));
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
}());
