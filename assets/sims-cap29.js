/* Simulações do Capítulo 29 — Prática: sockets (seção 4.3 do livro).
 * Cada uma é registrada em Redes.registrar. Os cenários são os dos exercícios do livro. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function caixa(rotulo, marcada) {
        var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: !!marcada });
        return { input: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, rotulo)) };
    }
    function opcoes(lista) { return lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }); }
    function tabela(cabecalho, linhas) {
        return el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-0" },
            el("thead", null, el("tr", null, cabecalho.map(function (h) { return el("th", null, h); }))),
            el("tbody", null, linhas.map(function (l) { return el("tr", { class: l.classe || null }, l.celulas.map(function (c) { return el("td", { class: "mono" }, c); })); }))));
    }
    function h2(b) { return (b < 16 ? "0" : "") + b.toString(16); }
    function hex(lista) { return lista.map(h2).join(" "); }
    function num(v, casas) { return Number(v).toFixed(casas === undefined ? 2 : casas).replace(".", ","); }
    function leNum(t) { var v = parseFloat(String(t).replace(",", ".")); return isNaN(v) ? null : v; }
    function badge(texto, classe, titulo) { return el("span", { class: "badge mono " + classe, title: titulo || null }, texto); }

    /* ------------------------------------------------------------------
     * 1. Bit alternado num enlace assimétrico (questões 1, 2 e 5, pág. 277–278 do PDF)
     * ------------------------------------------------------------------ */
    function bitAlternado(dados, ack, bDados, bAck, prop) {
        var td = dados * 8 / bDados, ta = ack * 8 / bAck, ciclo = td + prop + ta + prop;
        return { td: td, ta: ta, prop: prop, ciclo: ciclo, quadros: 1 / ciclo, vazao: dados * 8 / ciclo };
    }
    R.bitAlternado = bitAlternado;

    function palavras(b) {
        var p = [];
        for (var i = 0; i < b.length; i += 2) p.push(h2(b[i]) + (i + 1 < b.length ? h2(b[i + 1]) : "00"));
        return p;
    }
    function h4(v) { return ("000" + v.toString(16)).slice(-4); }

    /* ------------------------------------------------------------------
     * 4. Dois processos e a API de sockets (4.3.1–4.3.4, pág. 279–285 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("socket-udp", function (raiz) {
        var lugar = el("select", { class: "form-select form-select-sm" }, opcoes([["mesmo", "no mesmo computador (Fig. 1)"], ["rede", "em computadores diferentes (Fig. 2)"]]));
        var st, logEl = el("div", { class: "mt-2", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "socket-udp", 15, "Trocar datagramas entre dois processos com a API de sockets");
        function ender(p) { return lugar.value === "mesmo" ? "::1" : p === "A" ? "2001:db8::a" : "2001:db8::b"; }
        function chave(e) { return "[" + e[0] + "]:" + e[1]; }
        function zera() { st = { A: null, B: null, portas: {}, efemera: 49152, remetente: null, log: [] }; mostra(); }
        function anota(p, chamada, ret, tipo) { st.log.push({ p: p, c: chamada, r: ret, tipo: tipo || "ok" }); mostra(); }
        function entrega(de, destino, dados) {
            var alvo = st.portas[chave(destino)];
            if (!alvo || (alvo.remoto && chave(alvo.remoto) !== chave(de.local))) return false;
            alvo.fila.push({ dados: dados, de: de.local });
            return true;
        }
        function enviaDe(p, dados, destino, chamada) {
            var s = st[p];
            if (!s) return anota(p, chamada, "-1 (EBADF: crie o socket antes)", "erro");
            if (!s.local) { st.efemera++; s.local = [ender(p), st.efemera]; st.portas[chave(s.local)] = s; }
            var ok = entrega(s, destino, dados);
            anota(p, chamada, dados.length + (ok ? "" : "  (ninguém recebeu: o datagrama foi descartado, e o UDP não avisa o emissor)"), ok ? "ok" : "aviso");
        }
        function le(p, chamada, comEndereco) {
            var s = st[p];
            if (!s) return anota(p, chamada, "-1 (EBADF: crie o socket antes)", "erro");
            if (!s.fila.length) return anota(p, chamada, "fila vazia: um recv de verdade ficaria bloqueado esperando", "aviso");
            var m = s.fila.shift();
            if (comEndereco) st.remetente = m.de;
            anota(p, chamada, m.dados.length + ', buffer = "' + m.dados + '"' + (comEndereco ? ", peer_addr = " + chave(m.de) : ""), "ok");
            if (p === "A" && m.dados === "world") {
                u.marca(fb, true, "Isso: B usou o endereço que o recvfrom devolveu para responder, e A leu a resposta. Repare que A não chamou bind: o sistema escolheu uma porta para ele no primeiro envio.");
                concluir();
            }
        }
        var acoes = {
            A: [
                ["socket()", function () { if (st.A) return anota("A", "socket(AF_INET6, SOCK_DGRAM, 0)", "já existe: fd 3", "aviso"); st.A = { local: null, remoto: null, fila: [] }; anota("A", "socket(AF_INET6, SOCK_DGRAM, 0)", "3"); }],
                ['sendto("hello")', function () { enviaDe("A", "hello", [ender("B"), 55555], 'sendto(3, "hello", 5, 0, [' + ender("B") + "]:55555)"); }],
                ["connect()", function () { if (!st.A) return anota("A", "connect(3, …)", "-1 (EBADF: crie o socket antes)", "erro"); st.A.remoto = [ender("B"), 55555]; anota("A", "connect(3, [" + ender("B") + "]:55555)", "0"); }],
                ['write("hello")', function () { if (st.A && !st.A.remoto) return anota("A", 'write(3, "hello", 5)', "-1 (EDESTADDRREQ: socket não conectado; use connect ou sendto)", "erro"); enviaDe("A", "hello", st.A ? st.A.remoto : null, 'write(3, "hello", 5)'); }],
                ["read()", function () { le("A", "read(3, buffer, 2500)", false); }]
            ],
            B: [
                ["socket()", function () { if (st.B) return anota("B", "socket(AF_INET6, SOCK_DGRAM, 0)", "já existe: fd 3", "aviso"); st.B = { local: null, remoto: null, fila: [] }; anota("B", "socket(AF_INET6, SOCK_DGRAM, 0)", "3"); }],
                ["bind(55555)", function () {
                    if (!st.B) return anota("B", "bind(3, …)", "-1 (EBADF: crie o socket antes)", "erro");
                    if (st.B.local) return anota("B", "bind(3, …)", "-1 (EINVAL: o socket já tem endereço)", "erro");
                    st.B.local = [ender("B"), 55555]; st.portas[chave(st.B.local)] = st.B; anota("B", "bind(3, [" + ender("B") + "]:55555)", "0");
                }],
                ["recvfrom()", function () { le("B", "recvfrom(3, buffer, 2500, 0, &peer_addr, &len)", true); }],
                ['sendto("world")', function () {
                    if (!st.remetente) return anota("B", 'sendto(3, "world", …)', "B ainda não sabe para onde responder: use recvfrom, que devolve o endereço de quem mandou", "erro");
                    enviaDe("B", "world", st.remetente, 'sendto(3, "world", 5, 0, ' + chave(st.remetente) + ")");
                }]
            ]
        };
        var CLASSE = { ok: "", aviso: "table-warning", erro: "table-danger" };
        function mostra() {
            logEl.replaceChildren(st.log.length ? el("div", { style: "max-height: 16rem; overflow-y: auto" }, tabela(["Processo", "Chamada", "Retorno"], st.log.map(function (l) {
                return { celulas: [l.p, l.c, l.r], classe: CLASSE[l.tipo] };
            }))) : el("p", { class: "small text-muted mb-0" }, "Nenhuma chamada ainda."));
        }
        function painel(p, titulo) {
            return el("div", { class: "col-md-6" }, el("div", { class: "border rounded p-2 h-100" },
                el("p", { class: "small fw-semibold mb-2" }, titulo),
                el("div", { class: "d-flex flex-wrap gap-1" }, acoes[p].map(function (a) { return u.botao(a[0], "btn-outline-primary mono", a[1], "Processo " + p + ": " + a[0]); }))));
        }
        lugar.addEventListener("change", zera);
        raiz.append(el("p", { class: "small mb-2" }, "Cada botão faz uma chamada de sistema, com os argumentos dos exemplos do livro. O retorno aparece como em C: o número de bytes, 0 para sucesso ou -1 com o erro."),
            u.campo("Os processos estão", lugar),
            el("div", { class: "row g-2" }, painel("A", "Processo A (cliente)"), painel("B", "Processo B (servidor, porta 55555)")),
            logEl,
            el("div", { class: "mt-2" }, u.botao("Recomeçar", "btn-outline-secondary", zera)),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): faça A mandar \"hello\" a B, B responder \"world\" a A, e A ler a resposta."),
            fb);
        zera();
    });

    /* ------------------------------------------------------------------
     * 5. A struct sockaddr_in6 e a ordem dos bytes (pág. 284–285 do PDF)
     * ------------------------------------------------------------------ */
    function ipv6Bytes(t) {
        t = String(t || "").trim().toLowerCase();
        if (!/^[0-9a-f:]+$/.test(t) || (t.match(/::/g) || []).length > 1) return null;
        var partes = t.split("::"), esq = partes[0] ? partes[0].split(":") : [], dir = partes.length > 1 && partes[1] ? partes[1].split(":") : [];
        var faltam = 8 - esq.length - dir.length;
        if (partes.length === 1 ? faltam !== 0 : faltam < 1) return null;
        var grupos = esq.concat(new Array(partes.length > 1 ? faltam : 0).fill("0"), dir), out = [];
        for (var i = 0; i < 8; i++) {
            if (!/^[0-9a-f]{1,4}$/.test(grupos[i])) return null;
            var v = parseInt(grupos[i], 16); out.push(v >> 8, v & 255);
        }
        return out;
    }
    function sockaddrIn6(porta, endereco, comHtons) {
        var a = ipv6Bytes(endereco);
        if (!a || !(porta >= 0 && porta <= 65535)) return null;
        var p = comHtons ? [porta >> 8, porta & 255] : [porta & 255, porta >> 8];
        return { familia: [10, 0], porta: p, fluxo: [0, 0, 0, 0], end: a, escopo: [0, 0, 0, 0], lida: p[0] * 256 + p[1] };
    }
    R.ipv6Bytes = ipv6Bytes;
    R.sockaddrIn6 = sockaddrIn6;

    R.registrar("sockaddr-in6", function (raiz) {
        var porta = el("input", { type: "number", class: "form-control form-control-sm", value: 55555, min: 0, max: 65535 });
        var end = el("input", { type: "text", class: "form-control form-control-sm mono", value: "::1", spellcheck: "false" });
        var htons = caixa("Converter a porta com htons()", true);
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function desenha() {
            var s = sockaddrIn6(Number(porta.value), end.value, htons.input.checked);
            if (!s) { area.replaceChildren(el("p", { class: "small text-danger mb-0" }, "Use uma porta de 0 a 65535 e um endereço IPv6 válido, como ::1 ou 2001:db8::b.")); return; }
            var campos = [["sin6_family", s.familia, "text-bg-secondary", "AF_INET6 = 10, na ordem da CPU (little-endian num PC x86)"],
                ["sin6_port", s.porta, htons.input.checked ? "text-bg-success" : "text-bg-danger", "porta, na ordem da rede (big-endian)"],
                ["sin6_flowinfo", s.fluxo, "text-bg-light border", "rótulo de fluxo, 0"],
                ["sin6_addr", s.end, "text-bg-info", "os 16 bytes do endereço"],
                ["sin6_scope_id", s.escopo, "text-bg-light border", "escopo, 0"]];
            area.replaceChildren(
                el("div", { class: "d-flex flex-wrap gap-1" }, campos.map(function (c) { return c[1].map(function (b) { return badge(h2(b), c[2], c[0]); }); })),
                tabela(["Campo", "Bytes", "Conteúdo"], campos.map(function (c) { return { celulas: [c[0], hex(c[1]), c[3]] }; })),
                el("p", { class: "small mt-2 mb-0 " + (s.lida === Number(porta.value) ? "text-success" : "text-danger") },
                    "O núcleo lê a porta na ordem da rede: " + s.lida + (s.lida === Number(porta.value) ? ", a porta pedida." : ". Sem htons(), a CPU little-endian gravou os bytes invertidos, e o programa usa a porta errada.")));
        }
        [porta, end, htons.input].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var resp = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Porta usada sem htons" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "sockaddr-in6", 10, "Prever o efeito de esquecer o htons()");
        raiz.append(el("p", { class: "small mb-2" }, "Os 28 bytes de uma struct sockaddr_in6 no Linux, como o exemplo do livro a preenche: família, porta, rótulo de fluxo, endereço e escopo."),
            el("div", { class: "row g-2" }, el("div", { class: "col-5" }, u.campo("Porta", porta)), el("div", { class: "col-7" }, u.campo("Endereço IPv6", end))),
            htons.linha, area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): num PC x86, um programa grava a porta 10000 sem htons(). Em que porta o servidor fica, de fato?"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === 4135;
                u.marca(fb, ok, ok ? "Isso: 10000 = 0x2710. A CPU little-endian grava 10 27, e o núcleo lê 0x1027 = 4135." : "Ainda não. Escreva 10000 em hexadecimal, inverta os dois bytes e converta de volta (ou desmarque o htons e leia o resultado).");
                if (ok) concluir();
            })), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 6. O formato de mensagem da Fig. 3 (pág. 285–286 do PDF)
     * ------------------------------------------------------------------ */
    function fig3(primeiro, flags, segundo, b1, b2) {
        return [primeiro >> 8, primeiro & 255, flags & 255, (segundo >> 16) & 255, (segundo >> 8) & 255, segundo & 255, b1 & 255, b2 & 255];
    }
    function leFig3(b) {
        var f = "ABCDEFGH".split("").filter(function (_, i) { return b[2] & (128 >> i); });
        return { primeiro: b[0] * 256 + b[1], flags: f, segundo: b[3] * 65536 + b[4] * 256 + b[5], b1: b[6], b2: b[7] };
    }
    R.fig3 = fig3;
    R.leFig3 = leFig3;

    R.registrar("ordem-bytes", function (raiz) {
        var p1 = el("input", { type: "number", class: "form-control form-control-sm", value: 4660, min: 0, max: 65535 });
        var p2 = el("input", { type: "number", class: "form-control form-control-sm", value: 11259375, min: 0, max: 16777215 });
        var b1 = el("input", { type: "number", class: "form-control form-control-sm", value: 7, min: 0, max: 255 });
        var b2 = el("input", { type: "number", class: "form-control form-control-sm", value: 255, min: 0, max: 255 });
        var flags = "ABCDEFGH".split("").map(function (l, i) { return caixa(l, i === 0 || i === 7); });
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function desenha() {
            var v1 = Number(p1.value), v2 = Number(p2.value), x1 = Number(b1.value), x2 = Number(b2.value);
            if (!(v1 >= 0 && v1 <= 65535 && v2 >= 0 && v2 <= 16777215 && x1 >= 0 && x1 <= 255 && x2 >= 0 && x2 <= 255)) {
                area.replaceChildren(el("p", { class: "small text-danger mb-0" }, "Os campos têm 16 bits (até 65535), 24 bits (até 16777215) e 8 bits (até 255).")); return;
            }
            var f = flags.reduce(function (acc, c, i) { return acc | (c.input.checked ? 128 >> i : 0); }, 0);
            var b = fig3(v1, f, v2, x1, x2);
            var COR = ["text-bg-primary", "text-bg-primary", "text-bg-warning", "text-bg-info", "text-bg-info", "text-bg-info", "text-bg-success", "text-bg-secondary"];
            var NOME = ["primeiro campo", "primeiro campo", "flags A–H", "segundo campo (byte alto)", "segundo campo", "segundo campo", "primeiro byte", "segundo byte"];
            function linha(ini) { return el("div", { class: "d-flex gap-1 mb-1" }, el("span", { class: "small text-muted me-1", style: "min-width:4.5rem" }, "bytes " + ini + "–" + (ini + 3)), b.slice(ini, ini + 4).map(function (x, i) { return badge(h2(x), COR[ini + i], NOME[ini + i]); })); }
            area.replaceChildren(
                el("p", { class: "small mb-1" }, "As duas palavras de 32 bits, na ordem em que vão para a rede:"),
                linha(0), linha(4),
                el("p", { class: "small mt-2 mb-0" }, "Flags: " + ("00000000" + f.toString(2)).slice(-8) + " (A é o bit mais alto). O primeiro campo, 0x" + h4(v1) + ", vai como " + hex(b.slice(0, 2)) +
                    "; na memória de uma CPU little-endian, ele fica como " + h2(v1 & 255) + " " + h2(v1 >> 8) + ", e por isso o programa converte com htons() antes de enviar."));
        }
        [p1, p2, b1, b2].concat(flags.map(function (c) { return c.input; })).forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var r1 = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Primeiro campo" });
        var rF = el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": "Flags ligadas", placeholder: "ex.: A C" });
        var r2 = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Segundo campo" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ordem-bytes", 10, "Decodificar uma mensagem no formato da Fig. 3");
        raiz.append(el("p", { class: "small mb-2" }, "A mensagem da Fig. 3: um campo de 16 bits, oito flags de 1 bit (A a H), um campo de 24 bits e dois bytes. Tudo vai na ordem da rede (big-endian): o byte mais significativo primeiro."),
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("Primeiro campo (16 bits)", p1)), el("div", { class: "col-6 col-md-3" }, u.campo("Segundo campo (24 bits)", p2)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Primeiro byte", b1)), el("div", { class: "col-6 col-md-3" }, u.campo("Segundo byte", b2))),
            el("div", { class: "d-flex flex-wrap gap-3 mb-1" }, flags.map(function (c) { return c.linha; })),
            area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): chegou a mensagem 00 50 41 00 01 bb 0a 0b. Quanto vale cada campo, e quais flags estão ligadas?"),
            el("div", { class: "row g-2" }, el("div", { class: "col-4" }, u.campo("Primeiro campo", r1)), el("div", { class: "col-4" }, u.campo("Flags ligadas", rF)), el("div", { class: "col-4" }, u.campo("Segundo campo", r2))),
            u.botao("Conferir", "btn-primary", function () {
                var letras = (rF.value.toUpperCase().match(/[A-H]/g) || []).sort().join("");
                var ok = Number(r1.value) === 80 && Number(r2.value) === 443 && letras === "BH";
                u.marca(fb, ok, ok ? "Isso: 0x0050 = 80; 0x41 = 01000001, com B e H ligadas; 0x0001bb = 443. Os dois últimos bytes valem 10 e 11." : "Ainda não. Os dois primeiros bytes são o primeiro campo; o terceiro são as flags, de A (bit mais alto) a H; os três seguintes, o segundo campo.");
                if (ok) concluir();
            }), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 7. O cliente e o servidor da calculadora (4.3.6, pág. 286 do PDF).
     *    O formato das mensagens é deste site: o livro não o define.
     * ------------------------------------------------------------------ */
    function int32(v) { return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; }
    function pedidoCalc(op, numeros, texto) {
        var b = [op.charCodeAt(0), texto ? 1 : 0, numeros.length >> 8, numeros.length & 255];
        numeros.forEach(function (x) { b = b.concat(int32(x)); });
        return b;
    }
    function servidorCalc(msg) {
        var op = String.fromCharCode(msg[0]), flags = msg[1], n = msg[2] * 256 + msg[3];
        if ((op !== "+" && op !== "*") || msg.length !== 4 + 4 * n) return [1, 0, 0, 0];
        var r = op === "+" ? 0n : 1n;
        for (var i = 0; i < n; i++) {
            var v = ((msg[4 + 4 * i] << 24) | (msg[5 + 4 * i] << 16) | (msg[6 + 4 * i] << 8) | msg[7 + 4 * i]) | 0;
            r = op === "+" ? r + BigInt(v) : r * BigInt(v);
        }
        if (flags & 1) {
            var txt = r.toString(), corpo = txt.split("").map(function (c) { return c.charCodeAt(0); });
            return [0, 1, corpo.length >> 8, corpo.length & 255].concat(corpo);
        }
        if (r < -2147483648n || r > 2147483647n) return [2, 0, 0, 0];
        return [0, 0, 0, 4].concat(int32(Number(r)));
    }
    function leResposta(b) {
        if (b[0]) return "erro " + b[0];
        if (b[1] === 1) return b.slice(4).map(function (c) { return String.fromCharCode(c); }).join("");
        return String(((b[4] << 24) | (b[5] << 16) | (b[6] << 8) | b[7]) | 0);
    }
    R.pedidoCalc = pedidoCalc;
    R.servidorCalc = servidorCalc;
    R.leResposta = leResposta;

    R.registrar("calculadora-udp", function (raiz) {
        var op = el("select", { class: "form-select form-select-sm" }, opcoes([["+", "-op + (soma)"], ["*", "-op * (produto)"]]));
        var texto = caixa("-s (resposta em texto)", false);
        var nums = el("input", { type: "text", class: "form-control form-control-sm mono", value: "1 3 5 7 9", spellcheck: "false" });
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        var ESTADO = { 0: "ok", 1: "pedido inválido", 2: "o resultado não cabe em 32 bits" };
        function desenha() {
            var lista = nums.value.trim().split(/[\s,]+/).filter(Boolean).map(Number);
            if (!lista.length || lista.some(function (x) { return !Number.isInteger(x) || x < -2147483648 || x > 2147483647; }) || lista.length > 1000) {
                area.replaceChildren(el("p", { class: "small text-danger mb-0" }, "Digite inteiros de 32 bits separados por espaços.")); return;
            }
            var p = pedidoCalc(op.value, lista, texto.input.checked), r = servidorCalc(p);
            var corP = function (i) { return i === 0 ? "text-bg-primary" : i === 1 ? "text-bg-warning" : i < 4 ? "text-bg-secondary" : "text-bg-light border"; };
            var corR = function (i) { return i === 0 ? (r[0] ? "text-bg-danger" : "text-bg-success") : i === 1 ? "text-bg-warning" : i < 4 ? "text-bg-secondary" : "text-bg-light border"; };
            area.replaceChildren(
                el("pre", { class: "log small mb-2" }, "$ ./client -op " + op.value + (texto.input.checked ? " -s" : "") + " ::1 10000 " + lista.join(" ") + "\nResult: " + leResposta(r)),
                el("p", { class: "small mb-1" }, "Pedido (" + p.length + " bytes de dados UDP): operação, flags, quantidade de números e os números em 32 bits:"),
                el("div", { class: "d-flex flex-wrap gap-1 mb-2" }, p.map(function (x, i) { return badge(h2(x), corP(i)); })),
                el("p", { class: "small mb-1" }, "Resposta (" + r.length + " bytes): estado (" + ESTADO[r[0]] + "), tipo, tamanho e o resultado:"),
                el("div", { class: "d-flex flex-wrap gap-1 mb-2" }, r.map(function (x, i) { return badge(h2(x), corR(i)); })),
                el("pre", { class: "log small mb-0" }, "IP6 ::1.49153 > ::1.10000: UDP, length " + p.length + "\nIP6 ::1.10000 > ::1.49153: UDP, length " + r.length));
        }
        [op, texto.input, nums].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var rP = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Bytes do pedido" });
        var rR = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Bytes da resposta" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "calculadora-udp", 15, "Medir as mensagens do protocolo da calculadora");
        raiz.append(el("p", { class: "small mb-2" }, "O cliente manda um datagrama com o pedido; o servidor calcula e responde noutro datagrama. Embaixo, as duas linhas que o tcpdump mostraria na interface lo, filtrando a porta 10000."),
            el("div", { class: "row g-2" }, el("div", { class: "col-md-4" }, u.campo("Operação", op)), el("div", { class: "col-md-8" }, u.campo("Números", nums))),
            texto.linha, area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): no segundo exemplo do livro, ./client -op * -s ::1 10000 1 3 5 7 9, quantos bytes de dados levam o pedido e a resposta?"),
            el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Pedido (bytes)", rP)), el("div", { class: "col-6" }, u.campo("Resposta (bytes)", rR))),
            u.botao("Conferir", "btn-primary", function () {
                var ok = Number(rP.value) === 24 && Number(rR.value) === 7;
                u.marca(fb, ok, ok ? "Isso: o pedido tem 4 bytes de cabeçalho e 5 × 4 de números; a resposta, 4 de cabeçalho e os 3 caracteres de \"945\"." : "Ainda não. Monte o pedido com -op *, marque -s e conte os bytes de cada mensagem.");
                if (ok) concluir();
            }), fb);
        desenha();
    });
}());
