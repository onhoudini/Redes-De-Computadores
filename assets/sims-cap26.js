/* Simulações do Capítulo 26 — Tecnologias de enlace: PPP, Ethernet e Wi-Fi (seção 3.18 do livro).
 * Cada uma é registrada em Redes.registrar. As topologias são as das figuras do livro. */
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
    function leHex(t) {
        var s = String(t || "").replace(/0x/gi, "").replace(/[\s:.\-]/g, "").toLowerCase();
        if (!/^[0-9a-f]*$/.test(s) || s.length % 2) return null;
        var out = [];
        for (var i = 0; i < s.length; i += 2) out.push(parseInt(s.substr(i, 2), 16));
        return out;
    }
    function normHex(t) { var b = leHex(t); return b ? hex(b) : null; }
    var VERDE = "#198754", AZUL = "#0d6efd", VERMELHO = "#dc3545";
    // caixa opaca (fundo da página) com uma cor translúcida por cima, para as linhas não aparecerem através dela
    function caixaSvg(x, y, w, h, cor, opac) {
        return [u.svg("rect", { x: x, y: y, width: w, height: h, rx: 6, style: "fill: var(--bs-body-bg)" }),
            u.svg("rect", { x: x, y: y, width: w, height: h, rx: 6, fill: cor, "fill-opacity": opac, stroke: "currentColor", "stroke-width": 1.2 })];
    }

    /* ------------------------------------------------------------------
     * 1. PPP: quadro e inserção de bytes (pág. 257–258 do PDF; RFC 1662)
     * ------------------------------------------------------------------ */
    function fcs16(bytes) {
        var f = 0xFFFF;
        bytes.forEach(function (b) { f ^= b; for (var k = 0; k < 8; k++) f = f & 1 ? (f >>> 1) ^ 0x8408 : f >>> 1; });
        return (f ^ 0xFFFF) & 0xFFFF;
    }
    function enquadraPpp(prot, pacote) {
        var corpo = [0xFF, 0x03, prot >> 8, prot & 0xFF].concat(pacote);
        var f = fcs16(corpo);
        corpo.push(f & 0xFF, f >> 8);
        var saida = [{ b: 0x7E, tipo: "flag" }];
        corpo.forEach(function (b, i) {
            var campo = i < 2 ? "endereço e controle" : i < 4 ? "protocolo" : i < corpo.length - 2 ? "dados" : "FCS";
            if (b === 0x7E || b === 0x7D) saida.push({ b: 0x7D, tipo: "escape", campo: campo }, { b: b ^ 0x20, tipo: "escape", campo: campo });
            else saida.push({ b: b, tipo: campo });
        });
        saida.push({ b: 0x7E, tipo: "flag" });
        return { bytes: saida, fcs: f };
    }
    R.fcs16 = fcs16;
    R.enquadraPpp = function (prot, pacote) { return enquadraPpp(prot, pacote).bytes.map(function (x) { return x.b; }); };

    R.registrar("ppp-quadro", function (raiz) {
        var prot = el("select", { class: "form-select form-select-sm" }, opcoes([["0057", "0x0057 — IPv6"], ["0021", "0x0021 — IPv4"], ["c021", "0xc021 — LCP"], ["c023", "0xc023 — PAP"]]));
        var dados = el("input", { type: "text", class: "form-control form-control-sm mono", value: "60 7e 00 7d 01", spellcheck: "false" });
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        var COR = { flag: "text-bg-secondary", escape: "text-bg-warning", "endereço e controle": "text-bg-light border", protocolo: "text-bg-info", dados: "text-bg-light border", FCS: "text-bg-success" };
        function desenha() {
            var p = leHex(dados.value);
            if (!p) { area.replaceChildren(el("p", { class: "small text-danger mb-0" }, "Digite bytes em hexadecimal, como 60 7e 00 7d 01.")); return; }
            var q = enquadraPpp(parseInt(prot.value, 16), p);
            var esc = q.bytes.filter(function (x) { return x.tipo === "escape"; }).length / 2;
            area.replaceChildren(
                el("div", { class: "d-flex flex-wrap gap-1" }, q.bytes.map(function (x) { return el("span", { class: "badge mono " + COR[x.tipo], title: x.campo || x.tipo }, h2(x.b)); })),
                el("p", { class: "small mt-2 mb-0" }, "FCS-16 = 0x" + ("000" + q.fcs.toString(16)).slice(-4) + " (enviado com o byte menos significativo primeiro). " +
                    p.length + " bytes de dados viraram " + q.bytes.length + " bytes na linha: 2 flags, 4 de cabeçalho, 2 de FCS e " + esc + " byte(s) de escape."));
        }
        [prot, dados].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var resp = el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": "Sequência depois da inserção", spellcheck: "false" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ppp-quadro", 15, "Fazer a inserção de bytes do PPP");
        raiz.append(el("p", { class: "small mb-2" }, "Quadro da Fig. 79: flag 7e, endereço ff, controle 03, protocolo (16 bits), pacote, FCS de 16 bits e flag 7e. Dentro do quadro, 7e vira 7d 5e e 7d vira 7d 5d (o byte original com o bit 0x20 invertido)."),
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-5" }, u.campo("Protocolo", prot)), el("div", { class: "col-sm-7" }, u.campo("Pacote (hexadecimal)", dados))),
            area,
            el("p", { class: "small text-muted mt-1 mb-0" }, "Legenda: cinza = flag; amarelo = escape; azul = protocolo; verde = FCS."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): como fica a sequência 7e 01 7d dentro de um quadro PPP?"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = normHex(resp.value) === "7d 5e 01 7d 5d";
                u.marca(fb, ok, ok ? "Isso: 7d 5e 01 7d 5d. O receptor, ao ver 7d, descarta-o e inverte o bit 0x20 do byte seguinte." : "Ainda não. Cada 7e vira dois bytes, e cada 7d também.");
                if (ok) concluir();
            })), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 2. Endereços Ethernet (pág. 259 do PDF, Fig. 80)
     * ------------------------------------------------------------------ */
    function analisaMac(t) {
        var b = leHex(t);
        if (!b || b.length !== 6) return null;
        var bc = b.every(function (x) { return x === 255; });
        return { bytes: b, ig: b[0] & 1, ul: (b[0] >> 1) & 1, tipo: bc ? "broadcast" : b[0] & 1 ? "multicast" : "unicast", oui: hex(b.slice(0, 3)).replace(/ /g, ":") };
    }
    R.analisaMac = analisaMac;

    R.registrar("mac-bits", function (raiz) {
        var entrada = el("input", { type: "text", class: "form-control form-control-sm mono", value: "00:1b:21:3a:4f:10", spellcheck: "false" });
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function desenha() {
            var a = analisaMac(entrada.value);
            if (!a) { area.replaceChildren(el("p", { class: "small text-danger mb-0" }, "Digite 6 bytes, como 00:1b:21:3a:4f:10.")); return; }
            var bits = [];
            for (var i = 7; i >= 0; i--) {
                var v = (a.bytes[0] >> i) & 1, nome = i === 0 ? "I/G" : i === 1 ? "U/L" : "";
                bits.push(el("div", { class: "text-center", style: "min-width:2.2rem" }, el("div", { class: "badge mono " + (nome ? "text-bg-warning" : "text-bg-light border") }, String(v)), el("div", { class: "small text-muted" }, nome || " ")));
            }
            area.replaceChildren(
                el("div", { class: "small mb-1" }, "Primeiro byte, 0x" + h2(a.bytes[0]) + ", do bit mais alto para o mais baixo:"),
                el("div", { class: "d-flex flex-wrap gap-1 mb-2" }, bits),
                tabela(["Campo", "Valor", "Significado"], [
                    { celulas: ["I/G", String(a.ig), a.ig ? "grupo: o endereço identifica um grupo multicast" : "individual: identifica uma placa de rede"] },
                    { celulas: ["U/L", String(a.ul), a.ul ? "local: atribuído pelo administrador ou pelo software" : "universal: vem do bloco do fabricante"] },
                    { celulas: ["OUI (24 bits)", a.oui, "bloco de 2^24 = 16.777.216 endereços"] },
                    { celulas: ["Tipo", a.tipo, a.tipo === "broadcast" ? "todos os bits em 1: todos os hosts da LAN" : a.tipo === "multicast" ? "pode ser destino, nunca origem" : "pode ser origem ou destino"] }]));
        }
        entrada.addEventListener("input", desenha);
        var EXS = [["33:33:00:00:00:01", "multicast"], ["00:1b:21:3a:4f:10", "unicast-universal"], ["ff:ff:ff:ff:ff:ff", "broadcast"], ["02:00:5e:10:00:01", "unicast-local"]];
        var TIPOS = [["", "escolha…"], ["unicast-universal", "unicast universal"], ["unicast-local", "unicast local"], ["multicast", "multicast"], ["broadcast", "broadcast"]];
        var sels = EXS.map(function (e) { return el("select", { class: "form-select form-select-sm", "aria-label": e[0] }, opcoes(TIPOS)); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "mac-bits", 15, "Classificar endereços MAC pelos bits I/G e U/L");
        raiz.append(el("p", { class: "small mb-2" }, "Um endereço MAC tem 48 bits. Os 24 bits altos são o OUI do fabricante. No primeiro byte, o bit menos significativo (I/G) diz se é de grupo, e o seguinte (U/L), se foi atribuído localmente."),
            u.campo("Endereço MAC", entrada), area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): classifique os quatro endereços."),
            el("div", { class: "row g-2" }, EXS.map(function (e, i) { return el("div", { class: "col-sm-6" }, u.campo(e[0], sels[i])); })),
            u.botao("Conferir", "btn-primary", function () {
                var ok = sels.every(function (s, i) { return s.value === EXS[i][1]; });
                u.marca(fb, ok, ok ? "Isso. 0x33 tem I/G = 1 (grupo); 0x02 tem só U/L = 1 (unicast local); 0x00 tem os dois em 0; e o broadcast tem todos os bits em 1." : "Ainda não. Olhe os dois bits mais baixos do primeiro byte de cada um.");
                if (ok) concluir();
            }), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 3. O quadro Ethernet (pág. 259–261 do PDF, Figs. 82 e 83)
     * ------------------------------------------------------------------ */
    var TAB = (function () {
        var t = [];
        for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
        return t;
    }());
    function crc32(bytes) {
        var c = 0xFFFFFFFF;
        for (var i = 0; i < bytes.length; i++) c = TAB[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function quadroEth(n, tipo) {
        var enchimento = Math.max(0, 46 - n);
        var campo = tipo === "8023" ? n : parseInt(tipo, 16);
        var corpo = [255, 255, 255, 255, 255, 255, 0x00, 0x1b, 0x21, 0x3a, 0x4f, 0x10, campo >> 8, campo & 255];
        for (var i = 0; i < n + enchimento; i++) corpo.push(0);
        var c = crc32(corpo);
        return { corpo: corpo, crc: c, enchimento: enchimento, total: corpo.length + 4, campo: campo, quadro: corpo.concat([c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24]) };
    }
    function formatoEth(v) { return v <= 1500 ? "802.3: tamanho, " + v + " bytes úteis" : v >= 0x0600 ? "DIX: EtherType 0x" + ("000" + v.toString(16)).slice(-4) : "indefinido (entre 1501 e 1535)"; }
    R.crc32 = crc32;
    R.quadroEth = quadroEth;
    R.formatoEth = formatoEth;

    R.registrar("quadro-ethernet", function (raiz) {
        var n = el("input", { type: "range", class: "form-range", min: 0, max: 1500, step: 1, value: 28, id: u.novoId("faixa") });
        var tipo = el("select", { class: "form-select form-select-sm" }, opcoes([["0806", "DIX, ARP (0x0806)"], ["0800", "DIX, IPv4 (0x0800)"], ["86dd", "DIX, IPv6 (0x86dd)"], ["8023", "802.3 (campo de tamanho)"]]));
        var erro = caixa("Um bit é trocado no caminho", false);
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        var rotN = el("span", { class: "fw-semibold" });
        function desenha() {
            var q = quadroEth(Number(n.value), tipo.value);
            rotN.textContent = n.value + " bytes";
            var recebido = q.quadro.slice();
            if (erro.input.checked) recebido[20] ^= 0x04;
            var verif = crc32(recebido);
            area.replaceChildren(tabela(["Campo", "Bytes", "Valor"], [
                { celulas: ["Destino", "6", "ff:ff:ff:ff:ff:ff"] },
                { celulas: ["Origem", "6", "00:1b:21:3a:4f:10"] },
                { celulas: ["Tipo ou tamanho", "2", "0x" + ("000" + q.campo.toString(16)).slice(-4) + " → " + formatoEth(q.campo)] },
                { celulas: ["Dados", n.value, "(zeros)"] },
                { celulas: ["Enchimento", String(q.enchimento), q.enchimento ? "para chegar a 46 bytes" : "—"], classe: q.enchimento ? "table-warning" : null },
                { celulas: ["CRC-32", "4", "0x" + ("0000000" + q.crc.toString(16)).slice(-8)] }]),
                el("p", { class: "small mt-2 mb-0" }, "Quadro: " + q.total + " bytes (sem o preâmbulo); " + (100 * Number(n.value) / q.total).toFixed(1).replace(".", ",") + "% são dados úteis."),
                el("p", { class: "small mb-0 " + (verif === 0x2144DF1C ? "text-success" : "text-danger") }, "No receptor, o CRC-32 do quadro inteiro, com o CRC, dá 0x" + ("0000000" + verif.toString(16)).slice(-8) +
                    (verif === 0x2144DF1C ? ": o valor fixo de um quadro sem erros. Aceito." : ", e não o valor fixo 0x2144df1c: quadro descartado.")));
        }
        [n, tipo, erro.input].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var pad = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Bytes de enchimento" });
        var tot = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Tamanho do quadro" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "quadro-ethernet", 15, "Calcular o enchimento e o tamanho de um quadro Ethernet");
        raiz.append(el("p", { class: "small mb-2" }, "Quadro DIX da Fig. 82: destino, origem, EtherType, 46 a 1500 bytes de dados e CRC-32. No 802.3 (Fig. 83), o mesmo campo guarda o tamanho dos dados úteis."),
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-7" }, el("label", { class: "form-label small mb-1", for: n.id }, "Dados: ", rotN), n), el("div", { class: "col-sm-5" }, u.campo("Formato", tipo))),
            erro.linha, area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): um ACK do TCP sem dados, num pacote IPv4, tem 40 bytes (20 do IPv4 e 20 do TCP). Quantos bytes de enchimento o quadro leva, e qual é o seu tamanho?"),
            el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Enchimento", pad)), el("div", { class: "col-6" }, u.campo("Tamanho do quadro", tot))),
            u.botao("Conferir", "btn-primary", function () {
                var ok = Number(pad.value) === 6 && Number(tot.value) === 64;
                u.marca(fb, ok, ok ? "Isso: 46 − 40 = 6 bytes de enchimento, e 14 + 46 + 4 = 64 bytes, o quadro mínimo. Como o DIX não tem campo de tamanho, quem tira o enchimento é o IPv4, pelo seu próprio campo de tamanho." : "Ainda não. Os dados precisam ter pelo menos 46 bytes; some 14 de cabeçalho e 4 de CRC.");
                if (ok) concluir();
            }), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 4. Switches que aprendem (pág. 264–266 do PDF, Fig. 87)
     * ------------------------------------------------------------------ */
    var SEG = { o2: ["A", "SW2:Oeste"], bar: ["B", "C", "SW2:Sul"], tr: ["SW2:Norte", "SW1:Sul"], o1: ["E", "SW1:Oeste"], l1: ["D", "SW1:Leste"] };
    var PORTAS = { SW1: { Oeste: "o1", Leste: "l1", Sul: "tr" }, SW2: { Oeste: "o2", Sul: "bar", Norte: "tr" } };
    var HOSTS = ["A", "B", "C", "D", "E"], CAP = 8;
    function novaRede() { return { SW1: [], SW2: [] }; }              // tabela: lista de [endereço, porta]
    function procura(t, mac) { for (var i = 0; i < t.length; i++) if (t[i][0] === mac) return t[i]; return null; }
    function enviaQuadro(rede, src, dst, filtra) {
        var vistos = [], segs = [], pend = [[HOSTS.indexOf(src) >= 0 ? Object.keys(SEG).filter(function (s) { return SEG[s].indexOf(src) >= 0; })[0] : null, src]];
        var passos = 0;
        while (pend.length && passos++ < 50) {
            var x = pend.shift(), seg = x[0], de = x[1];
            segs.push(seg);
            SEG[seg].forEach(function (m) {
                if (m === de) return;
                if (m.indexOf(":") < 0) { vistos.push(m); return; }
                var sw = m.split(":")[0], p = m.split(":")[1], t = rede[sw];
                var e = procura(t, src);
                if (e) e[1] = p; else if (t.length < CAP) t.push([src, p]);
                var saidas, d = dst === "*" ? null : procura(t, dst);
                if (d) saidas = filtra && d[1] === p ? [] : [d[1]];
                else saidas = Object.keys(PORTAS[sw]).filter(function (o) { return o !== p; });
                saidas.forEach(function (o) { pend.push([PORTAS[sw][o], sw + ":" + o]); });
            });
        }
        return { vistos: vistos, segs: segs };
    }
    R.enviaQuadro = enviaQuadro;
    R.novaRede = novaRede;

    R.registrar("switch-aprende", function (raiz) {
        var rede = novaRede(), quadros = 0, ultimo = null, atacado = false;
        var src = el("select", { class: "form-select form-select-sm" }, opcoes(HOSTS.map(function (h) { return [h, h]; })));
        var dst = el("select", { class: "form-select form-select-sm" }, opcoes(HOSTS.map(function (h) { return [h, h]; }).concat([["*", "broadcast"]])));
        dst.value = "B";
        var livro = caixa("Seguir o pseudo-código do livro à risca (sem descartar quando o destino está do lado de onde o quadro veio)", false);
        var figura = el("div"), info = el("div", { class: "small mt-2", "aria-live": "polite" }), tabs = el("div", { class: "row g-2 mt-1" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "switch-aprende", 15, "Ensinar os dois switches com o mínimo de quadros");
        var POS = { SW1: [260, 62], SW2: [260, 158], A: [80, 158], E: [80, 40], D: [440, 40], B: [205, 282], C: [315, 282] };
        var LINHAS = { o1: [["E", "SW1"]], l1: [["D", "SW1"]], tr: [["SW1", "SW2"]], o2: [["A", "SW2"]], bar: [["SW2", "BUS"], ["B", "BUSB"], ["C", "BUSC"]] };
        function pos(n) { return n === "BUS" ? [260, 236] : n === "BUSB" ? [205, 236] : n === "BUSC" ? [315, 236] : POS[n]; }
        function desenhaFig() {
            var s = u.svg("svg", { viewBox: "0 0 520 310", class: "sim-svg w-100", role: "img", "aria-label": "Rede da Fig. 87: SW1 liga E, D e SW2; SW2 liga A e um barramento com B e C", style: "max-width:560px" });
            s.append(u.svg("title", { text: "Rede da Fig. 87" }));
            var usados = ultimo ? ultimo.segs : [];
            Object.keys(LINHAS).forEach(function (seg) {
                LINHAS[seg].forEach(function (l) {
                    var a = pos(l[0]), b = pos(l[1]), on = usados.indexOf(seg) >= 0;
                    s.append(u.svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: on ? AZUL : "currentColor", "stroke-width": on ? 4 : 1.5, "stroke-opacity": on ? 1 : 0.5 }));
                });
            });
            s.append(u.svg("line", { x1: 150, y1: 236, x2: 370, y2: 236, stroke: usados.indexOf("bar") >= 0 ? AZUL : "currentColor", "stroke-width": 6 }));
            Object.keys(POS).forEach(function (n) {
                var p = POS[n], sw = n.indexOf("SW") === 0, viu = ultimo && ultimo.vistos.indexOf(n) >= 0, origem = ultimo && ultimo.src === n;
                var w = sw ? 70 : 44;
                s.append.apply(s, caixaSvg(p[0] - w / 2, p[1] - 15, w, 30, origem ? AZUL : viu ? VERDE : "currentColor", origem || viu ? 0.45 : 0.08));
                s.append(u.svg("text", { x: p[0], y: p[1] + 5, "text-anchor": "middle", "font-size": 14, "font-weight": sw ? 700 : 400, fill: "currentColor" }, n));
            });
            [["Oeste", 205, 54], ["Leste", 315, 54], ["Sul", 278, 92], ["Norte", 286, 132], ["Oeste", 205, 150], ["Sul", 278, 196]].forEach(function (t) {
                s.append(u.svg("text", { x: t[1], y: t[2], "text-anchor": "middle", "font-size": 10, fill: "currentColor", "fill-opacity": 0.7 }, t[0]));
            });
            figura.replaceChildren(s);
        }
        function desenhaTabs() {
            tabs.replaceChildren.apply(tabs, ["SW1", "SW2"].map(function (sw) {
                var t = rede[sw];
                return el("div", { class: "col-sm-6" }, el("div", { class: "small fw-semibold" }, "Tabela de " + sw + " (" + t.length + "/" + CAP + ")"),
                    t.length ? tabela(["Endereço", "Porta"], t.map(function (e) { return { celulas: [e[0], e[1]], classe: HOSTS.indexOf(e[0]) < 0 ? "table-danger" : null }; })) : el("p", { class: "small text-muted mb-0" }, "vazia"));
            }));
        }
        function checa() {
            var todos = ["SW1", "SW2"].every(function (sw) { return HOSTS.every(function (h) { return procura(rede[sw], h); }); });
            if (todos && quadros <= 5 && !atacado) { u.marca(fb, true, "Isso: com " + quadros + " quadros, os dois switches conhecem os cinco hosts. Cada host precisa mandar pelo menos um quadro que passe pelos dois switches (um broadcast, ou um destino ainda desconhecido)."); concluir(); }
            else if (todos) { fb.className = "small mt-2 mb-0"; fb.textContent = "As tabelas estão completas, mas com " + quadros + " quadros. Recomece e tente com 5."; }
        }
        function envia() {
            if (src.value === dst.value) { info.textContent = "Escolha um destino diferente da origem."; return; }
            var r = enviaQuadro(rede, src.value, dst.value, !livro.input.checked);
            quadros++; ultimo = { segs: r.segs, vistos: r.vistos, src: src.value };
            var aceitos = r.vistos.filter(function (h) { return h === dst.value || dst.value === "*"; });
            var dup = r.vistos.length !== new Set(r.vistos).size || r.vistos.indexOf(src.value) >= 0;
            info.replaceChildren(el("div", null, el("div", null, "Quadro " + quadros + ": " + src.value + " → " + (dst.value === "*" ? "broadcast" : dst.value) + ". Viram o quadro: " + (r.vistos.join(", ") || "ninguém") + ". Aceitaram: " + (aceitos.join(", ") || "ninguém") + "."),
                dup ? el("div", { class: "text-danger" }, "O quadro voltou ao barramento de onde veio: " + (r.vistos.indexOf(src.value) >= 0 ? src.value + " recebeu o próprio quadro e " : "") + "o destino o recebeu em dobro.") : null,
                atacado && r.vistos.indexOf("E") >= 0 && dst.value !== "E" && dst.value !== "*" ? el("div", { class: "text-danger" }, "E, o atacante, viu um quadro unicast que não era para ele.") : null));
            desenhaFig(); desenhaTabs(); checa();
        }
        function reinicia() { rede = novaRede(); quadros = 0; ultimo = null; atacado = false; info.textContent = ""; fb.textContent = ""; desenhaFig(); desenhaTabs(); }
        function ataque() {
            atacado = true;
            ["SW1", "SW2"].forEach(function (sw) { rede[sw] = []; for (var i = 1; i <= CAP; i++) rede[sw].push(["falso-" + i, sw === "SW1" ? "Oeste" : "Norte"]); });
            info.replaceChildren(el("div", { class: "text-danger" }, "E mandou milhares de quadros com endereços de origem falsos. As tabelas encheram, e as entradas verdadeiras expiraram e não cabem mais: agora todo quadro unicast é inundado."));
            desenhaFig(); desenhaTabs();
        }
        raiz.append(el("p", { class: "small mb-2" }, "A rede da Fig. 87. Os switches aprendem pelo endereço de origem e inundam os quadros com destino desconhecido. Azul: quem enviou e os enlaces usados; verde: quem viu o quadro."),
            figura,
            el("div", { class: "row g-2" }, el("div", { class: "col-6 col-sm-3" }, u.campo("Origem", src)), el("div", { class: "col-6 col-sm-3" }, u.campo("Destino", dst)),
                el("div", { class: "col-sm-6 d-flex flex-wrap gap-2 align-items-end mb-2" },
                    u.botao("Enviar", "btn-primary", envia), u.botao("Recomeçar", "btn-outline-secondary", reinicia), u.botao("Ataque: inundar as tabelas", "btn-outline-danger", ataque))),
            livro.linha, info, tabs, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): com as tabelas vazias, faça os dois switches conhecerem os cinco hosts com no máximo 5 quadros."));
        desenhaFig(); desenhaTabs();
    });

    /* ------------------------------------------------------------------
     * 5. Spanning Tree (pág. 266–270 do PDF, Fig. 89)
     * ------------------------------------------------------------------ */
    var PARES = { A: [9, 2], B: [9, 7], C: [1, 7], D: [1, 22], E: [1, 44], F: [2, 44], G: [44, 22], H: [7, 22] };
    var SWS = [1, 2, 7, 9, 22, 44];
    function menor(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; }
    function stp(falhas, prio) {
        falhas = falhas || []; prio = prio || {};
        var lans = {}, n = {};
        Object.keys(PARES).sort().forEach(function (l) { PARES[l].forEach(function (s) { n[s] = (n[s] || 0) + 1; (lans[l] = lans[l] || {})[s] = n[s]; }); });
        var ativos = Object.keys(lans).filter(function (l) { return falhas.indexOf(l) < 0; });
        function id(s) { return (prio[s] || 32768) * 1000 + s; }
        var bpdu = {}, raizP = {};
        SWS.forEach(function (s) { bpdu[s] = [id(s), 0, id(s)]; });
        for (var it = 0; it < 50; it++) {
            var novo = {}, mudou = false;
            SWS.forEach(function (s) {
                var melhor = [id(s), 0, id(s), 0, 0];
                ativos.forEach(function (l) {
                    var m = lans[l];
                    if (!(s in m)) return;
                    Object.keys(m).forEach(function (v) {
                        v = Number(v);
                        if (v === s) return;
                        var vet = [bpdu[v][0], bpdu[v][1] + 1, bpdu[v][2], m[v], m[s]];
                        if (menor(vet, melhor)) melhor = vet;
                    });
                });
                novo[s] = [melhor[0], melhor[1], id(s)]; raizP[s] = melhor[4];
                if (novo[s].join() !== bpdu[s].join()) mudou = true;
            });
            bpdu = novo;
            if (!mudou) break;
        }
        var papeis = {};
        ativos.forEach(function (l) {
            var m = lans[l];
            Object.keys(m).forEach(function (s) {
                s = Number(s);
                if (bpdu[s][0] !== id(s) && m[s] === raizP[s]) { papeis[s + "|" + l] = "raiz"; return; }
                var meu = bpdu[s].concat([m[s]]);
                var ok = Object.keys(m).every(function (v) { v = Number(v); return v === s || menor(meu, bpdu[v].concat([m[v]])); });
                papeis[s + "|" + l] = ok ? "designada" : "bloqueada";
            });
        });
        return { bpdu: bpdu, papeis: papeis, lans: lans, raizP: raizP, id: id };
    }
    R.stp = stp;

    R.registrar("spanning-tree", function (raiz) {
        var POS = { 9: [70, 95], 2: [345, 40], 1: [250, 140], 44: [465, 170], 7: [125, 270], 22: [325, 285] };
        var falha = el("select", { class: "form-select form-select-sm" }, opcoes([["", "nenhuma"]].concat(Object.keys(PARES).map(function (l) { return [l, "LAN " + l]; }))));
        var prio = el("select", { class: "form-select form-select-sm" }, opcoes([["", "nenhum (todos com 32768)"]].concat(SWS.map(function (s) { return [String(s), "Sw" + s + " com prioridade 4096"]; }))));
        var figura = el("div"), info = el("div", { class: "mt-2", "aria-live": "polite" });
        function nome(idv) { return "Sw" + (idv % 1000); }
        function desenha() {
            var p = {};
            if (prio.value) p[prio.value] = 4096;
            var r = stp(falha.value ? [falha.value] : [], p);
            var s = u.svg("svg", { viewBox: "0 0 520 320", class: "sim-svg w-100", role: "img", "aria-label": "A rede da Fig. 89 com os papéis das portas", style: "max-width:560px" });
            s.append(u.svg("title", { text: "Spanning tree da Fig. 89" }));
            Object.keys(PARES).forEach(function (l) {
                var a = POS[PARES[l][0]], b = POS[PARES[l][1]], fora = falha.value === l;
                var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
                var nx = -dy / len, ny = dx / len;                       // normal à linha, para afastar o rótulo
                if (ny > 0) { nx = -nx; ny = -ny; }                      // rótulo sempre acima da linha
                var bloq = !fora && PARES[l].some(function (sw) { return r.papeis[sw + "|" + l] === "bloqueada"; });
                s.append(u.svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "currentColor", "stroke-width": bloq ? 1.5 : 3, "stroke-dasharray": fora ? "4 5" : bloq ? "6 4" : null, "stroke-opacity": fora ? 0.3 : bloq ? 0.6 : 1 }),
                    u.svg("text", { x: mx + nx * 18, y: my + ny * 18 + 4, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "currentColor" }, "LAN " + l));
                if (fora) return;
                PARES[l].forEach(function (sw, i) {
                    var o = POS[sw], d = POS[PARES[l][1 - i]], t = 52 / len;   // a 52 px do centro do switch
                    var x = o[0] + (d[0] - o[0]) * t, y = o[1] + (d[1] - o[1]) * t, papel = r.papeis[sw + "|" + l];
                    s.append(u.svg("circle", { cx: x, cy: y, r: 9, fill: papel === "bloqueada" ? VERMELHO : papel === "raiz" ? AZUL : VERDE, "fill-opacity": 0.85 }),
                        u.svg("text", { x: x, y: y + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#fff" }, papel === "bloqueada" ? "✕" : papel === "raiz" ? "R" : "D"));
                });
            });
            SWS.forEach(function (sw) {
                var o = POS[sw], eRaiz = r.bpdu[sw][0] === r.id(sw);
                s.append.apply(s, caixaSvg(o[0] - 30, o[1] - 14, 60, 28, eRaiz ? "#ffc107" : "currentColor", eRaiz ? 0.6 : 0.1));
                s.append(u.svg("text", { x: o[0], y: o[1] + 5, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "currentColor" }, "Sw" + sw));
            });
            figura.replaceChildren(s);
            info.replaceChildren(tabela(["Switch", "BPDU <R, c, T>", "Porta raiz", "Bloqueadas"], SWS.map(function (sw) {
                var b = r.bpdu[sw], eRaiz = b[0] === r.id(sw);
                var lanRaiz = Object.keys(r.lans).filter(function (l) { return r.papeis[sw + "|" + l] === "raiz"; })[0];
                var bl = Object.keys(r.lans).filter(function (l) { return r.papeis[sw + "|" + l] === "bloqueada"; });
                return { celulas: ["Sw" + sw + (eRaiz ? " (raiz)" : ""), "<" + nome(b[0]) + ", " + b[1] + ", " + nome(b[2]) + ">", eRaiz ? "—" : "LAN " + lanRaiz, bl.length ? bl.map(function (l) { return "LAN " + l; }).join(", ") : "—"] };
            })));
        }
        [falha, prio].forEach(function (c) { c.addEventListener("change", desenha); });
        var OPC = [["", "escolha…"], ["a", "Sw44 na LAN G e Sw22 na LAN H"], ["b", "Sw2 na LAN F e Sw22 na LAN H"], ["c", "Sw9 na LAN A e Sw22 na LAN H"], ["d", "Sw9 na LAN A e Sw44 na LAN F"]];
        var resp = el("select", { class: "form-select form-select-sm", "aria-label": "Portas bloqueadas" }, opcoes(OPC));
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "spanning-tree", 15, "Prever a nova árvore depois de uma falha");
        raiz.append(el("p", { class: "small mb-2" }, "A rede da Fig. 89: cada LAN liga dois switches, todas as portas com custo 1, e o identificador de cada switch é a prioridade (32768) seguida do número. R = porta raiz, D = designada, ✕ = bloqueada; a raiz aparece em amarelo."),
            figura,
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-6" }, u.campo("LAN fora do ar", falha)), el("div", { class: "col-sm-6" }, u.campo("Mudar a prioridade de", prio))),
            info,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): sem mudar as prioridades, a LAN E cai. Quais portas ficam bloqueadas? (responda antes de simular)"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = resp.value === "b";
                u.marca(fb, ok, ok ? "Isso. Sw44 passa a chegar à raiz pela LAN G (custo 2). Sw2 empata entre a LAN F (via Sw44) e a LAN A (via Sw9), com custo 3, e escolhe Sw9, de identificador menor; sua porta na LAN F fica bloqueada, e Sw9 vira designada na LAN A." : "Ainda não. Calcule de novo o custo de Sw44 e de Sw2 até Sw1 sem a LAN E, e lembre do desempate pelo identificador.");
                if (ok) concluir();
            })), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 6. VLANs e a tag 802.1Q (pág. 270 do PDF, Figs. 91 e 92)
     * ------------------------------------------------------------------ */
    function tag8021q(pcp, dei, vid) { var tci = (pcp << 13) | (dei << 12) | vid; return [0x81, 0x00, tci >> 8, tci & 255]; }
    function leTag(b) { if (!b || b.length !== 4 || b[0] !== 0x81 || b[1] !== 0) return null; var tci = (b[2] << 8) | b[3]; return { pcp: tci >> 13, dei: (tci >> 12) & 1, vid: tci & 0xFFF }; }
    var VLAN = { A: 3, Y: 3, C: 2, D: 2, B: 1, E: 1, F: 1, X: 1 };
    R.tag8021q = tag8021q;
    R.leTag = leTag;

    R.registrar("tag-8021q", function (raiz) {
        var pcp = el("input", { type: "number", class: "form-control form-control-sm", min: 0, max: 7, value: 0 });
        var vid = el("input", { type: "number", class: "form-control form-control-sm", min: 0, max: 4095, value: 1 });
        var dei = caixa("Bit C (DEI)", false);
        var saida = el("div", { class: "mt-2", "aria-live": "polite" });
        function desenha() {
            var p = Math.max(0, Math.min(7, Number(pcp.value) || 0)), v = Math.max(0, Math.min(4095, Number(vid.value) || 0)), d = dei.input.checked ? 1 : 0;
            var t = tag8021q(p, d, v), tci = (t[2] << 8) | t[3], bits = ("0000000000000000" + tci.toString(2)).slice(-16);
            saida.replaceChildren(
                el("div", { class: "mono small" }, "Tag: ", el("strong", null, hex(t))),
                el("div", { class: "mono small" }, "TPID 1000 0001 0000 0000 | PCP " + bits.slice(0, 3) + " | C " + bits[3] + " | VID " + bits.slice(4)),
                el("div", { class: "small " + (v === 0 || v === 4095 ? "text-danger" : "text-muted") }, v === 0 ? "VID 0: o quadro não pertence a nenhuma VLAN (só leva a prioridade)." : v === 4095 ? "VID 0xfff é reservado." : "VLAN " + v + ", prioridade " + p + " (0 é a mais baixa, 7 a mais alta). O quadro fica 4 bytes maior."));
        }
        [pcp, vid, dei.input].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var host = el("select", { class: "form-select form-select-sm" }, opcoes(Object.keys(VLAN).sort().map(function (h) { return [h, h + " (VLAN" + VLAN[h] + ")"]; })));
        var bc = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function broadcast() { var h = host.value; var rec = Object.keys(VLAN).sort().filter(function (x) { return x !== h && VLAN[x] === VLAN[h]; }); bc.textContent = "Um broadcast de " + h + " chega a: " + (rec.join(", ") || "ninguém") + ". Os outros hosts não o veem."; }
        host.addEventListener("change", broadcast);
        var resp = el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": "Tag em hexadecimal", spellcheck: "false" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "tag-8021q", 10, "Montar uma tag 802.1Q");
        raiz.append(el("p", { class: "small mb-2" }, "A tag da Fig. 92 tem 32 bits: TPID 0x8100, PCP (3 bits), C (1 bit) e o identificador da VLAN (12 bits). Ela vai logo depois do endereço de origem."),
            el("div", { class: "row g-2" }, el("div", { class: "col-4" }, u.campo("PCP", pcp)), el("div", { class: "col-4" }, u.campo("VID", vid)), el("div", { class: "col-4 d-flex align-items-end mb-2" }, dei.linha)),
            saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "As VLANs da Fig. 91"),
            u.campo("Host que manda um broadcast", host), bc,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): escreva, em hexadecimal, a tag de um quadro da VLAN 100 com prioridade 5 e o bit C em 0."),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = normHex(resp.value) === "81 00 a0 64";
                u.marca(fb, ok, ok ? "Isso: 81 00 a0 64. 5 em 3 bits é 101; com o C em 0 e 100 = 0000 0110 0100 em 12 bits, o TCI fica 1010 0000 0110 0100 = 0xa064." : "Ainda não. Monte os 16 bits do TCI: PCP (3), C (1) e VID (12), depois do TPID 81 00.");
                if (ok) concluir();
            })), fb);
        desenha(); broadcast();
    });

    /* ------------------------------------------------------------------
     * 7. Os três endereços do 802.11 (pág. 272–274 do PDF, Fig. 96)
     * ------------------------------------------------------------------ */
    R.registrar("enderecos-80211", function (raiz) {
        var cen = el("select", { class: "form-select form-select-sm" }, opcoes([["ida", "W1 envia um quadro ao servidor S (na LAN)"], ["ack", "O AP confirma o quadro de W1 com um ACK"]]));
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function desenha() {
            if (cen.value === "ida") {
                area.replaceChildren(el("div", { class: "small fw-semibold" }, "No ar (802.11, de W1 até o AP)"),
                    tabela(["Campo", "Valor"], [{ celulas: ["Frame Control", "quadro de dados, rumo à LAN (To DS = 1, From DS = 0)"] }, { celulas: ["Duration", "tempo de um SIFS e de um ACK"] },
                        { celulas: ["Address 1", "AP (quem recebe no ar)"] }, { celulas: ["Address 2", "W1 (quem transmite)"] }, { celulas: ["Address 3", "S (o destino final)"] }]),
                    el("div", { class: "small fw-semibold mt-2" }, "Na LAN (Ethernet, do AP até S)"),
                    tabela(["Campo", "Valor"], [{ celulas: ["Destino", "S"] }, { celulas: ["Origem", "W1 (o AP é um relay da camada de enlace e mantém a origem)"] }]));
            } else {
                area.replaceChildren(tabela(["Campo", "Valor"], [{ celulas: ["Frame Control", "ACK"] }, { celulas: ["Duration", "0"] }, { celulas: ["Address 1", "W1 (o único endereço: o destino do ACK)"] }]),
                    el("p", { class: "small mt-1 mb-0" }, "O ACK não tem origem nem número de sequência: ele confirma o quadro que acabou de chegar, no canal que o Duration reservou (Fig. 97)."));
            }
        }
        cen.addEventListener("change", desenha);
        var OP = [["", "escolha…"], ["W1", "W1"], ["AP", "AP"], ["S", "S"]];
        var a = [1, 2, 3].map(function (i) { return el("select", { class: "form-select form-select-sm", "aria-label": "Address " + i }, opcoes(OP)); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "enderecos-80211", 15, "Preencher os três endereços de um quadro 802.11");
        raiz.append(el("p", { class: "small mb-2" }, "Rede de infraestrutura (Fig. 94): a estação W1 está associada ao ponto de acesso AP, ligado por Ethernet à LAN do servidor S."),
            u.campo("Cenário", cen), area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): S responde a W1. O AP recebe o quadro Ethernet (origem S, destino W1) e o converte em 802.11. Quais são os três endereços?"),
            el("div", { class: "row g-2" }, a.map(function (s, i) { return el("div", { class: "col-4" }, u.campo("Address " + (i + 1), s)); })),
            u.botao("Conferir", "btn-primary", function () {
                var ok = a[0].value === "W1" && a[1].value === "AP" && a[2].value === "S";
                u.marca(fb, ok, ok ? "Isso: Address 1 = W1 (quem recebe no ar), Address 2 = AP (quem transmite) e Address 3 = S (a origem do quadro na LAN), com From DS = 1 (pág. 274 do PDF)." : "Ainda não. O Address 1 é sempre quem recebe no ar, e o Address 2, quem transmite.");
                if (ok) concluir();
            }), fb);
        desenha();
    });
}());
