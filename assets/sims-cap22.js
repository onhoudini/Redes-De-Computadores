/* Simulações do Capítulo 22 — A camada de rede: IPv6 e ICMPv6 (seção 3.14 do livro).
 * Cada uma é registrada em Redes.registrar. Os endereços vêm dos exemplos do livro ou do bloco de
 * documentação 2001:db8::/32 (RFC 3849). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function hex2(n) { return n.toString(16).padStart(2, "0"); }
    function hex4(n) { return n.toString(16).padStart(4, "0"); }
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
    function opcoes(lista) { return lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }); }

    /* ---------- IPv6: leitura, escrita compacta e prefixos ---------- */
    function le6(texto) {
        var s = String(texto || "").trim().toLowerCase().replace(/\/.*$/, "");
        if (!/^[0-9a-f:]+$/.test(s) || s.indexOf(":::") >= 0) return null;
        var partes = s.split("::");
        if (partes.length > 2) return null;
        function g(p) { return p === "" ? [] : p.split(":"); }
        var esq = g(partes[0]), dir = partes.length === 2 ? g(partes[1]) : [];
        var todos = esq.concat(dir);
        if (todos.some(function (x) { return !/^[0-9a-f]{1,4}$/.test(x); })) return null;
        var faltam = 8 - todos.length;
        if ((partes.length === 1 && faltam !== 0) || (partes.length === 2 && faltam < 1)) return null;
        var zeros = []; for (var i = 0; i < faltam && partes.length === 2; i++) zeros.push("0");
        return esq.concat(zeros, dir).map(function (x) { return parseInt(x, 16); });
    }
    function escreve6(gr) {
        var melhor = { i: -1, n: 0 }, ini = -1;
        for (var i = 0; i <= 8; i++) {
            if (i < 8 && gr[i] === 0) { if (ini < 0) ini = i; }
            else if (ini >= 0) { if (i - ini > melhor.n) melhor = { i: ini, n: i - ini }; ini = -1; }
        }
        var t = gr.map(function (x) { return x.toString(16); });
        if (melhor.n < 2) return t.join(":");
        return t.slice(0, melhor.i).join(":") + "::" + t.slice(melhor.i + melhor.n).join(":");
    }
    function noPrefixo(gr, prefixo) {
        var p = prefixo.split("/"), rede = le6(p[0]), len = Number(p[1]);
        for (var b = 0; b < len; b++) {
            var grupo = b >> 4, bit = 15 - (b & 15);
            if (((gr[grupo] >> bit) & 1) !== ((rede[grupo] >> bit) & 1)) return false;
        }
        return true;
    }
    function bytes6(gr) { var b = []; gr.forEach(function (x) { b.push(x >> 8, x & 255); }); return b; }
    function deBytes(b) { var g = []; for (var i = 0; i < 16; i += 2) g.push((b[i] << 8) | b[i + 1]); return g; }
    R.ipv6 = R.ipv6 || {};
    R.ipv6.le6 = le6; R.ipv6.escreve6 = escreve6; R.ipv6.noPrefixo = noPrefixo;

    /* ------------------------------------------------------------------
     * 1. Maior prefixo (pág. 218–219 do PDF)
     * ------------------------------------------------------------------ */
    var TABELA = [["::/0", "fe80::dead:beef"], ["::1/128", "::1"], ["2a02:2788:2c4:16f::/64", "eth0"],
        ["2001:6a8:3080::/48", "fe80::bad:cafe"], ["2001:6a8:2d80::/48", "fe80::bad:bad"], ["2001:6a8::/32", "fe80::aaaa:bbbb"]];
    function encaminha(destino) {
        var gr = le6(destino);
        if (!gr) return null;
        var casam = TABELA.filter(function (r) { return noPrefixo(gr, r[0]); });
        var vence = casam.reduce(function (a, b) { return Number(b[0].split("/")[1]) > Number(a[0].split("/")[1]) ? b : a; });
        return { casam: casam, vence: vence };
    }
    R.encaminha6 = encaminha;

    R.registrar("maior-prefixo", function (raiz) {
        var destino = entrada("2001:6a8:3080::1234", "Endereço de destino");
        var tabela = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            var r = encaminha(destino.value);
            tabela.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Destino"), el("th", null, "Gateway"), el("th", null, "Casa?"))),
                el("tbody", null, TABELA.map(function (l) {
                    var casa = r && r.casam.indexOf(l) >= 0, vence = r && r.vence === l;
                    return el("tr", { class: vence ? "table-success" : null }, el("td", null, l[0]), el("td", null, l[1]), el("td", null, vence ? "sim — o maior prefixo" : casa ? "sim" : "não"));
                })))));
            resumo.textContent = r ? "O pacote sai por " + r.vence[1] + ": das " + r.casam.length + " rotas que casam, " + r.vence[0] + " tem o maior prefixo." : "Endereço IPv6 inválido.";
        }
        destino.addEventListener("input", mostra);
        var PERG = [["2001:6a8:2d80::99", "fe80::bad:bad"], ["2001:6a8:ffff::1", "fe80::aaaa:bbbb"], ["2001:db8::1", "fe80::dead:beef"]];
        var selects = PERG.map(function (p) { return el("select", { class: "form-select form-select-sm", "aria-label": "Gateway para " + p[0] }, el("option", { value: "" }, "escolha…"), opcoes(TABELA.map(function (l) { return [l[1], l[1]]; }))); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "maior-prefixo", 15, "Escolher o gateway pelo maior prefixo");
        raiz.append(el("p", { class: "small mb-2" }, "A tabela de rotas do livro (pág. 219 do PDF)."), u.campo("Destino do pacote", destino), tabela, resumo,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): por qual gateway sai cada pacote? Responda sem digitar os endereços no campo acima."),
            el("div", null, PERG.map(function (p, i) { return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-5 mono small" }, p[0]), el("div", { class: "col-sm-7" }, selects[i])); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = PERG.filter(function (p, i) { return selects[i].value === p[1]; }).length;
                u.marca(fb, certas === 3, certas === 3 ? "Os três certos. 2001:db8::1 não casa com nenhuma rota específica e usa a rota padrão ::/0." : certas + " de 3. Compare os primeiros grupos do endereço com cada prefixo.");
                if (certas === 3) concluir();
            }), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 2. Tipos de endereço (pág. 218–221 do PDF)
     * ------------------------------------------------------------------ */
    var ESCOPOS = { 1: "interface", 2: "enlace", 4: "administração", 5: "site", 8: "organização", 14: "global" };
    function tipo6(texto) {
        var g = le6(texto);
        if (!g) return null;
        if (g.every(function (x) { return x === 0; })) return { tipo: "nao-especificado", nome: "não especificado (::)" };
        if (g.slice(0, 7).every(function (x) { return x === 0; }) && g[7] === 1) return { tipo: "loopback", nome: "loopback (::1)" };
        if ((g[0] >> 8) === 0xff) return { tipo: "multicast", nome: "multicast, escopo " + (ESCOPOS[g[0] & 15] || (g[0] & 15)) };
        if ((g[0] & 0xffc0) === 0xfe80) return { tipo: "link-local", nome: "unicast link-local (fe80::/10)" };
        if ((g[0] & 0xfe00) === 0xfc00) return { tipo: "ula", nome: "unicast local único, ULA (fc00::/7)" };
        if ((g[0] & 0xe000) === 0x2000) return { tipo: "global", nome: "unicast global (2000::/3)" };
        return { tipo: "outro", nome: "outro (reservado)" };
    }
    R.tipo6 = tipo6;

    R.registrar("tipo-endereco", function (raiz) {
        var campo = entrada("fe80::219:e3ff:fed7:1204", "Endereço IPv6");
        var saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() { var t = tipo6(campo.value); saida.replaceChildren(t ? el("span", null, "Tipo: ", el("strong", null, t.nome)) : "Endereço inválido."); }
        campo.addEventListener("input", mostra);
        var TIPOS = [["global", "unicast global"], ["link-local", "link-local"], ["ula", "ULA"], ["multicast", "multicast"], ["loopback", "loopback"], ["nao-especificado", "não especificado"]];
        var PERG = ["ff02::2", "fd00:1::5", "2a02:2788:2c4:16f::1", "fe80::bad:cafe", "::"];
        var selects = PERG.map(function (p) { return el("select", { class: "form-select form-select-sm", "aria-label": "Tipo de " + p }, el("option", { value: "" }, "escolha…"), opcoes(TIPOS)); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "tipo-endereco", 10, "Classificar endereços IPv6");
        raiz.append(u.campo("Endereço IPv6", campo), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): classifique cada endereço."),
            el("div", null, PERG.map(function (p, i) { return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-5 mono small" }, p), el("div", { class: "col-sm-7" }, selects[i])); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = PERG.filter(function (p, i) { return selects[i].value === tipo6(p).tipo; }).length;
                u.marca(fb, certas === PERG.length, certas === PERG.length ? "Todos certos. ff02::2 é o grupo de todos os roteadores do enlace; :: é usado como origem por quem ainda não tem endereço." : certas + " de " + PERG.length + ". Olhe os primeiros bits: ff…, fe80…, fc00::/7, 2000::/3.");
                if (certas === PERG.length) concluir();
            }), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 3. O cabeçalho IPv6 (pág. 221–223 do PDF)
     * ------------------------------------------------------------------ */
    var PROXIMO = { 0: "Hop-by-Hop Options", 6: "TCP", 17: "UDP", 43: "Routing", 44: "Fragment", 50: "ESP", 51: "AH", 58: "ICMPv6", 59: "nenhum", 60: "Destination Options", 132: "SCTP" };
    function leCab6(b) {
        if (b.length < 40) return null;
        var primeira = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
        return { versao: primeira >>> 28, classe: (primeira >>> 20) & 255, fluxo: primeira & 0xfffff, carga: (b[4] << 8) | b[5], prox: b[6], saltos: b[7],
            origem: escreve6(deBytes(b.slice(8, 24))), destino: escreve6(deBytes(b.slice(24, 40))) };
    }
    R.leCab6 = leCab6;

    R.registrar("cabecalho-ipv6", function (raiz) {
        var AMOSTRAS = [
            ["Segmento TCP", "60 01 23 45 00 14 06 40 20 01 0d b8 00 00 00 00 00 00 00 00 00 00 00 01 20 01 0d b8 00 00 00 00 00 00 00 00 00 00 00 02"],
            ["Router Advertisement", "60 00 00 00 00 40 3a ff fe 80 00 00 00 00 00 00 02 45 67 ff fe 89 ab cd ff 02 00 00 00 00 00 00 00 00 00 00 00 00 00 01"],
            ["Fragmento", "60 00 00 00 04 d8 2c 40 20 01 0d b8 00 00 00 00 00 00 00 00 00 00 00 01 20 01 0d b8 00 00 00 00 00 00 00 00 00 00 00 02"]
        ];
        var campo = el("textarea", { class: "form-control form-control-sm mono", rows: 3, "aria-label": "Cabeçalho IPv6 em hexadecimal", spellcheck: "false" });
        campo.value = AMOSTRAS[0][1];
        var botoes = el("div", { class: "d-flex flex-wrap gap-2 mb-2" });
        AMOSTRAS.forEach(function (a) { botoes.append(u.botao(a[0], "btn-outline-secondary", function () { campo.value = a[1]; mostra(); })); });
        var saida = el("div", { class: "mt-2", "aria-live": "polite" });
        function mostra() {
            var h = campo.value.replace(/[^0-9a-fA-F]/g, ""), b = [];
            for (var i = 0; i + 1 < h.length; i += 2) b.push(parseInt(h.slice(i, i + 2), 16));
            var r = leCab6(b);
            if (!r) { saida.textContent = "O cabeçalho IPv6 tem 40 bytes."; return; }
            var linhas = [["Versão", String(r.versao)], ["Traffic class", r.classe + " (ECN = " + (r.classe & 3) + ")"], ["Flow label", "0x" + r.fluxo.toString(16)],
                ["Payload length", r.carga + " bytes depois deste cabeçalho"], ["Next header", r.prox + " (" + (PROXIMO[r.prox] || "?") + ")"], ["Hop limit", String(r.saltos)],
                ["Origem", r.origem + " (" + tipo6(r.origem).nome + ")"], ["Destino", r.destino + " (" + tipo6(r.destino).nome + ")"]];
            saida.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-0" },
                el("tbody", null, linhas.map(function (l) { return el("tr", null, el("th", { scope: "row", class: "fw-normal text-muted" }, l[0]), el("td", { class: "mono" }, l[1])); })))));
        }
        campo.addEventListener("input", mostra);
        var r1 = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Next header" });
        var r2 = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Hop limit" });
        var r3 = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Payload length" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "cabecalho-ipv6", 15, "Ler um cabeçalho IPv6 byte a byte");
        raiz.append(botoes, u.campo("Cabeçalho IPv6 (hexadecimal)", campo), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): leia o \"Router Advertisement\" sem usar a tabela. Os bytes 4–5 são o Payload Length, o 6 o Next Header e o 7 o Hop Limit."),
            el("div", { class: "row g-2" },
                el("div", { class: "col-sm-4" }, u.campo("Next header (decimal)", r1)),
                el("div", { class: "col-sm-4" }, u.campo("Hop limit", r2)),
                el("div", { class: "col-sm-4" }, u.campo("Payload length (bytes)", r3))),
            u.botao("Conferir", "btn-primary", function () {
                var ok = Number(r1.value) === 58 && Number(r2.value) === 255 && Number(r3.value) === 64;
                u.marca(fb, ok, ok ? "Isso: 0x3a = 58 (ICMPv6), 0xff = 255 e 0x0040 = 64. O Hop Limit 255 permite ao host conferir que o anúncio veio do próprio enlace." : "Ainda não. Converta de hexadecimal: 0x3a, 0xff e 0x0040.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 4. Fragmentação na origem (pág. 223–226 do PDF)
     * ------------------------------------------------------------------ */
    function fragmenta(carga, mtu) {
        if (40 + carga <= mtu) return [{ offset: 0, M: 0, dados: carga, plen: carga }];
        var max = 8 * Math.floor((mtu - 48) / 8), out = [], pos = 0;
        while (pos < carga) { var d = Math.min(max, carga - pos); out.push({ offset: pos / 8, M: pos + d >= carga ? 0 : 1, dados: d, plen: 8 + d }); pos += d; }
        return out;
    }
    R.fragmenta6 = fragmenta;

    R.registrar("fragmentos-ipv6", function (raiz) {
        var carga = faixa("Tamanho dos dados depois do cabeçalho IPv6", 100, 9000, 100, 3000, function (v) { return v + " bytes"; });
        var mtu = el("select", { class: "form-select form-select-sm" }, opcoes([["1280", "1280 (mínimo do IPv6)"], ["1500", "1500 (Ethernet)"], ["2272", "2272 (WiFi, segundo o livro)"], ["4352", "4352 (FDDI)"]]));
        mtu.value = "1500";
        var tabela = el("div", { class: "mt-2", "aria-live": "polite" });
        function mostra() {
            var f = fragmenta(Number(carga.input.value), Number(mtu.value));
            tabela.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, ["#", "Offset (× 8 bytes)", "Byte inicial", "M", "Dados", "Pacote"].map(function (h) { return el("th", null, h); }))),
                el("tbody", null, f.map(function (x, i) { return el("tr", null, el("td", null, String(i + 1)), el("td", null, String(x.offset)), el("td", null, String(x.offset * 8)), el("td", null, String(x.M)), el("td", null, x.dados + " B"), el("td", null, (40 + x.plen) + " B")); })))),
                el("p", { class: "small mt-1 mb-0" }, f.length === 1 ? "Cabe sem fragmentar." : f.length + " fragmentos, cada um com o cabeçalho IPv6 (40 bytes) e o cabeçalho de fragmento (8 bytes, Next Header 44). Os dados de cada fragmento, menos o último, são múltiplos de 8."));
        }
        carga.input.addEventListener("input", mostra); mtu.addEventListener("change", mostra);
        var resp = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Offset do terceiro fragmento" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "fragmentos-ipv6", 15, "Calcular o offset de um fragmento IPv6");
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-md-8" }, carga.linha), el("div", { class: "col-md-4" }, u.campo("MTU do enlace de saída", mtu))), tabela,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): com 4000 bytes de dados e MTU de 1280, qual é o Fragment Offset (em unidades de 8 bytes) do terceiro fragmento?"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === 308;
                u.marca(fb, ok, ok ? "Isso: cada fragmento leva 8 × ⌊(1280 − 48) / 8⌋ = 1232 bytes de dados; o terceiro começa no byte 2464, ou seja, offset 308." : "Ainda não. Quantos bytes de dados cabem em cada fragmento (descontando 40 + 8 bytes de cabeçalhos)? Divida o byte inicial por 8.");
                if (ok) concluir();
            })), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 5. Path MTU Discovery com Packet Too Big (pág. 228–229 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("pmtud", function (raiz) {
        var ENLACES = [["A", "R1", 1500], ["R1", "R2", 1400], ["R2", "B", 1200]];
        var pmtu = 1500, enviados = 0, icmps = 0;
        var log = el("ul", { class: "log mt-2" });
        var estado = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "pmtud", 10, "Descobrir a MTU do caminho com mensagens Packet Too Big");
        function mostraEstado() { estado.replaceChildren("MTU do caminho que A conhece para B: ", el("strong", null, pmtu + " bytes"), " · pacotes enviados: " + enviados + " · Packet Too Big recebidos: " + icmps); }
        function envia() {
            enviados++;
            var tam = pmtu;
            for (var i = 0; i < ENLACES.length; i++) {
                var e = ENLACES[i];
                if (tam > e[2]) {
                    log.append(el("li", { class: "text-danger" }, "A envia " + tam + " bytes → " + e[0] + " descarta (enlace " + e[0] + "–" + e[1] + " tem MTU " + e[2] + ") e devolve ICMPv6 tipo 2, Packet Too Big, MTU = " + e[2]));
                    pmtu = e[2]; icmps++;
                    mostraEstado();
                    return;
                }
            }
            log.append(el("li", { class: "text-success" }, "A envia " + tam + " bytes → chega a B, passando por R1 e R2."));
            mostraEstado();
            u.marca(fb, true, "Entregue com " + pmtu + " bytes, depois de " + icmps + " mensagem(ns) Packet Too Big. Um TCP ajustaria o MSS para " + (pmtu - 60) + " bytes (40 do IPv6 + 20 do TCP).");
            concluir();
        }
        raiz.append(el("p", { class: "small mb-2 mono" }, "A —1500— R1 —1400— R2 —1200— B  (MTU de cada enlace, exemplo do livro)"),
            el("div", { class: "d-flex flex-wrap gap-2" },
                u.botao("A envia um pacote do tamanho que acha que cabe", "btn-primary", envia),
                u.botao("Recomeçar", "btn-outline-secondary", function () { pmtu = 1500; enviados = 0; icmps = 0; log.replaceChildren(); fb.textContent = ""; mostraEstado(); })),
            log, estado, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): faça o pacote chegar a B."));
        mostraEstado();
    });

    /* ------------------------------------------------------------------
     * 6. EUI-64: do MAC ao identificador de interface (pág. 227–228 do PDF)
     * ------------------------------------------------------------------ */
    function leMac(t) {
        var p = String(t || "").trim().split(/[:-]/);
        if (p.length !== 6 || p.some(function (x) { return !/^[0-9a-fA-F]{1,2}$/.test(x); })) return null;
        return p.map(function (x) { return parseInt(x, 16); });
    }
    function eui64(mac) { return [mac[0] ^ 2, mac[1], mac[2], 0xff, 0xfe, mac[3], mac[4], mac[5]]; }
    R.eui64 = function (t) { var m = leMac(t); return m ? eui64(m) : null; };

    R.registrar("eui64", function (raiz) {
        var mac = entrada("00:23:45:67:89:ab", "Endereço MAC");
        var prefixo = entrada("2001:db8:1234:5678::/64", "Prefixo da sub-rede");
        var passos = el("div", { class: "mt-2", "aria-live": "polite" });
        function mostra() {
            var m = leMac(mac.value), p = le6(prefixo.value.split("/")[0]);
            if (!m || !p) { passos.textContent = "Digite um MAC (seis bytes em hexadecimal) e um prefixo /64."; return; }
            var id = eui64(m);
            var idGr = [(id[0] << 8) | id[1], (id[2] << 8) | id[3], (id[4] << 8) | id[5], (id[6] << 8) | id[7]];
            passos.replaceChildren(
                el("div", { class: "d-flex flex-wrap" }, m.map(function (x, i) { return el("span", { class: "byte-cell " + (i === 0 ? "ctrl" : ""), style: "min-width:2.4rem" }, hex2(x), el("small", null, i === 0 ? "U/L = " + ((x >> 1) & 1) : "")); })),
                el("p", { class: "small mb-1" }, "1. Inverte o bit U/L (o segundo bit menos significativo do primeiro byte): " + hex2(m[0]) + " → " + hex2(id[0]) + "."),
                el("p", { class: "small mb-1" }, "2. Insere ff:fe no meio: " + id.map(hex2).join(":") + "."),
                el("p", { class: "small mb-1" }, "Identificador de interface: ", el("strong", { class: "mono" }, idGr.map(function (x) { return x.toString(16); }).join(":"))),
                el("p", { class: "small mb-1" }, "Link-local: ", el("strong", { class: "mono" }, escreve6([0xfe80, 0, 0, 0].concat(idGr)))),
                el("p", { class: "small mb-0" }, "Global (SLAAC): ", el("strong", { class: "mono" }, escreve6(p.slice(0, 4).concat(idGr)))));
        }
        [mac, prefixo].forEach(function (c) { c.addEventListener("input", mostra); });
        var resp = entrada("", "Identificador de interface");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "eui64", 10, "Converter um MAC num identificador EUI-64");
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-sm-6" }, u.campo("MAC", mac)), el("div", { class: "col-sm-6" }, u.campo("Prefixo /64", prefixo))), passos,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): qual é o identificador de interface do roteador do livro, de MAC 00:45:67:89:ab:cd? (quatro grupos de 16 bits)"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var g = le6("::" + resp.value.trim().replace(/^:+/, ""));
                var ok = !!g && g.slice(4).join(",") === [0x0245, 0x67ff, 0xfe89, 0xabcd].join(",");
                u.marca(fb, ok, ok ? "Isso: 245:67ff:fe89:abcd. O 00 vira 02 ao inverter o bit U/L." : "Ainda não. Inverta o bit U/L do primeiro byte (00 → 02) e insira ff:fe entre o 3º e o 4º bytes.");
                if (ok) concluir();
            })), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 7. Descoberta de vizinhos e SLAAC (pág. 228–231 do PDF)
     * ------------------------------------------------------------------ */
    function solicited(gr) { return [0xff02, 0, 0, 0, 0, 1, 0xff00 | (gr[6] & 0xff), gr[7]]; }
    R.solicited = function (t) { var g = le6(t); return g ? escreve6(solicited(g)) : null; };

    R.registrar("ndp-slaac", function (raiz) {
        var duplicado = caixa("Outro host já usa o endereço global que este host vai gerar", false);
        var passo = 0;
        var area = el("div", { class: "mt-2" });
        var texto = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var LL = "fe80::223:45ff:fe67:89ab", GL = "2001:db8:1234:5678:223:45ff:fe67:89ab";
        function passos() {
            var p = [
                { ev: { nota: 0, rotulo: "link-local " + LL }, t: "O host junta fe80::/64 ao seu identificador EUI-64 e obtém o endereço link-local." },
                { ev: { de: 0, para: 2, rotulo: "NS (DAD) de :: para ff02::1:ff67:89ab", tipo: "ctrl" }, t: "Detecção de endereço duplicado (DAD): um Neighbor Solicitation, com origem :: e destino o grupo solicited-node do endereço." },
                { ev: { nota: 0, rotulo: "nenhuma resposta: link-local válido" }, t: "Ninguém respondeu: o endereço link-local é único no enlace." },
                { ev: { de: 0, para: 1, rotulo: "RS para ff02::2", tipo: "ctrl" }, t: "Em vez de esperar o anúncio periódico (uns 30 s), o host pede com um Router Solicitation." },
                { ev: { de: 1, para: 0, rotulo: "RA para ff02::1: prefixo …:5678::/64" }, t: "O roteador responde com um Router Advertisement: prefixo, tempos de vida, MTU, hop limit padrão. O Hop Limit 255 prova que veio do próprio enlace." },
                { ev: { nota: 0, rotulo: "global " + GL }, t: "O host junta o prefixo anunciado ao seu identificador: SLAAC, sem servidor e sem estado." },
                { ev: { de: 0, para: 2, rotulo: "NS (DAD) do endereço global", tipo: "ctrl" }, t: "DAD também para o endereço global." }
            ];
            if (duplicado.input.checked) p.push({ ev: { de: 2, para: 0, rotulo: "NA: este endereço já é meu!", tipo: "erro" }, t: "Outro host respondeu com um Neighbor Advertisement: o endereço é recusado, e o host precisa gerar outro ou avisar o administrador." });
            else p.push({ ev: { nota: 0, rotulo: "nenhuma resposta: endereço global pronto" }, t: "Ninguém respondeu: o host está configurado e pode falar com a Internet pelo roteador." });
            return p;
        }
        function desenha() {
            var p = passos();
            area.replaceChildren(R.diagramaSequencia({ titulo: "Autoconfiguração do host A: DAD, Router Solicitation e Router Advertisement.", colunas: ["Host A", "Roteador", "Outros hosts"], eventos: p.slice(0, passo).map(function (x) { return x.ev; }), passo: 30, margem: 130, largura: 820 }));
            texto.textContent = passo ? p[passo - 1].t : "Clique em \"Próximo passo\" para ligar o host A.";
        }
        duplicado.input.addEventListener("change", function () { passo = 0; desenha(); });
        var resp = entrada("", "Grupo solicited-node");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "solicited-node", 15, "Calcular o grupo solicited-node de um endereço");
        raiz.append(duplicado.linha,
            el("div", { class: "d-flex flex-wrap gap-2 mt-1" }, u.botao("Próximo passo", "btn-primary", function () { if (passo < passos().length) passo++; desenha(); }), u.botao("Recomeçar", "btn-outline-secondary", function () { passo = 0; desenha(); })),
            area, texto,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): para qual grupo multicast vai o Neighbor Solicitation que procura 2001:db8:1234:5678::bb? (ff02::1:ff seguido dos 24 bits finais do endereço)"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var g = le6(resp.value), ok = !!g && escreve6(g) === "ff02::1:ff00:bb";
                u.marca(fb, ok, ok ? "Isso: ff02::1:ff00:bb. Só os hosts cujo endereço termina nesses 24 bits recebem a pergunta, em vez de todos, como num broadcast." : "Ainda não. Os 24 bits finais de …::bb são 00 00 bb.");
                if (ok) concluir();
            })), fb);
        desenha();
    });
}());

/* Etapa "3. Visualização" do conceito enlaces: ponto a ponto, LAN e NBMA (Figs. 39–40, pág. 214–215 do PDF). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, s = u.svg;
    function escolha(rotulo, lista) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            el("option", { value: "" }, "escolha…"), lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    var TIPOS = { p2p: ["A", "B"], lan: ["A", "B", "C", "D", "E"], nbma: ["A", "B", "C", "D", "E"] };
    var GRUPO = ["B", "D"]; // um grupo multicast de exemplo
    // Quem recebe um quadro enviado por A. Devolve {recebem: [...]} ou {erro: texto}.
    function entrega(tipo, modo, destino) {
        var outros = TIPOS[tipo].filter(function (n) { return n !== "A"; });
        if (tipo === "p2p") {
            if (modo !== "unicast") return { recebem: ["B"], nota: "Num enlace ponto a ponto só existe um vizinho: tudo o que A manda chega a B." };
            return { recebem: ["B"] };
        }
        if (modo === "unicast") return { recebem: outros.indexOf(destino) >= 0 ? [destino] : [] };
        if (tipo === "nbma") return { erro: "O NBMA só oferece unicast: não há broadcast nem multicast. Para falar com vários, A teria de mandar uma cópia a cada um." };
        if (modo === "broadcast") return { recebem: outros };
        return { recebem: GRUPO.slice() };
    }
    R.entregaEnlace = entrega;

    R.registrar("tipos-enlace", function (raiz) {
        var tipo = el("select", { class: "form-select form-select-sm", "aria-label": "Tipo de enlace" },
            el("option", { value: "p2p" }, "ponto a ponto (Fig. 39)"), el("option", { value: "lan" }, "LAN (Fig. 40)"), el("option", { value: "nbma" }, "NBMA"));
        var modo = el("select", { class: "form-select form-select-sm", "aria-label": "Tipo de envio" },
            el("option", { value: "unicast" }, "unicast (um destino)"), el("option", { value: "broadcast" }, "broadcast (todos)"), el("option", { value: "multicast" }, "multicast (grupo B e D)"));
        var destino = el("select", { class: "form-select form-select-sm", "aria-label": "Destino do unicast" });
        var desenho = s("svg", { viewBox: "0 0 640 200", class: "sim-svg w-100", style: "max-height:230px", role: "img", "aria-label": "Dispositivos ligados por um enlace; os que recebem o quadro ficam destacados." });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function opcoesDestino() {
            var atual = destino.value;
            destino.replaceChildren.apply(destino, TIPOS[tipo.value].filter(function (n) { return n !== "A"; }).map(function (n) { return el("option", { value: n }, n); }));
            if (TIPOS[tipo.value].indexOf(atual) > 0) destino.value = atual;
            destino.disabled = modo.value !== "unicast";
        }
        function desenha() {
            opcoesDestino();
            var nos = TIPOS[tipo.value], r = entrega(tipo.value, modo.value, destino.value);
            var g = s("g", { "font-size": 12, "text-anchor": "middle" });
            g.append(s("rect", { x: 0, y: 0, width: 640, height: 200, style: "fill: var(--bs-body-bg)" }));
            var pos = {};
            if (tipo.value === "p2p") {
                pos = { A: [180, 100], B: [460, 100] };
                g.append(s("line", { class: "linha-ativa", x1: 180, y1: 100, x2: 460, y2: 100 }), s("text", { x: 320, y: 90, "font-size": 11 }, "um enlace, dois sistemas"));
            } else if (tipo.value === "lan") {
                nos.forEach(function (n, i) { pos[n] = [80 + i * 120, 60]; });
                g.append(s("line", { class: "linha-ativa", x1: 50, y1: 130, x2: 590, y2: 130 }), s("text", { x: 320, y: 150, "font-size": 11 }, "a LAN: qualquer par troca quadros diretamente"));
                nos.forEach(function (n) { g.append(s("line", { class: "linha", x1: pos[n][0], y1: 78, x2: pos[n][0], y2: 130 })); });
            } else {
                nos.forEach(function (n, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / nos.length; pos[n] = [320 + 230 * Math.cos(a), 105 + 72 * Math.sin(a)]; });
                g.append(s("ellipse", { class: "camada", cx: 320, cy: 105, rx: 140, ry: 42 }), s("text", { x: 320, y: 109, "font-size": 11 }, "rede NBMA (só unicast)"));
                nos.forEach(function (n) { g.append(s("line", { class: "linha", x1: pos[n][0], y1: pos[n][1], x2: 320 + (pos[n][0] - 320) * 0.55, y2: 105 + (pos[n][1] - 105) * 0.55 })); });
            }
            nos.forEach(function (n) {
                var recebe = r.recebem && r.recebem.indexOf(n) >= 0;
                g.append(s("circle", { class: n === "A" ? "no" : recebe ? "no no-ativo" : "camada", cx: pos[n][0], cy: pos[n][1], r: 18 }), s("text", { x: pos[n][0], y: pos[n][1] + 4, "font-weight": "bold" }, n));
                if (recebe) g.append(s("text", { x: pos[n][0], y: pos[n][1] - 24, "font-size": 11 }, "recebe"));
            });
            g.append(s("text", { x: pos.A[0], y: pos.A[1] + 34, "font-size": 11 }, "emissor"));
            desenho.replaceChildren(s("title", null, "Quem recebe o quadro de A"), g);
            saida.textContent = r.erro ? r.erro : (r.nota ? r.nota + " " : "") + (r.recebem.length ? "Recebem: " + r.recebem.join(", ") + "." : "Ninguém recebe.") +
                (tipo.value === "lan" ? " Na LAN, cada dispositivo tem um endereço de enlace único, em geral um MAC de 48 bits." : "");
        }
        [tipo, modo, destino].forEach(function (c) { c.addEventListener("change", desenha); });
        var servicos = ["unicast", "broadcast", "multicast"].map(function (n) {
            var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") });
            return { nome: n, input: c, linha: el("div", { class: "form-check form-check-inline" }, c, el("label", { class: "form-check-label small", for: c.id }, n)) };
        });
        var quantos = el("input", { type: "number", min: 0, class: "form-control form-control-sm", "aria-label": "Número de dispositivos que recebem o broadcast" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "tipos-enlace", 10, "Os três tipos de enlace");
        raiz.append(el("div", { class: "row g-2" },
                el("div", { class: "col-sm-4" }, u.campo("Tipo de enlace", tipo)),
                el("div", { class: "col-sm-5" }, u.campo("A envia um quadro em", modo)),
                el("div", { class: "col-sm-3" }, u.campo("Destino (unicast)", destino))),
            desenho, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            el("p", { class: "small mb-1" }, "Que serviços uma rede NBMA oferece?"), el("div", null, servicos.map(function (x) { return x.linha; })),
            el("div", { class: "row g-2 align-items-center mt-1 mb-1" }, el("div", { class: "col-sm-8 small" }, "Numa LAN com 12 dispositivos, um quadro de broadcast chega a quantos, sem contar o emissor?"), el("div", { class: "col-sm-4" }, quantos)),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok1 = servicos.every(function (x) { return x.input.checked === (x.nome === "unicast"); });
                var ok2 = Number(quantos.value) === 11;
                u.marca(fb, ok1 && ok2, ok1 && ok2 ? "Isso: o NBMA liga vários dispositivos como uma LAN, mas só faz unicast; e o broadcast da LAN chega aos outros 11."
                    : (ok1 ? "" : "Experimente broadcast e multicast com o NBMA. ") + (ok2 ? "" : "O broadcast vai a todos os outros dispositivos da LAN."));
                if (ok1 && ok2) concluir();
            }), fb);
        desenha();
    });
}());
