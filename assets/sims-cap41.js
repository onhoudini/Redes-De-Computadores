/* Simulações do Capítulo 41 — Prática: roteamento interdomínio (seção 4.15 do livro, pág. 350–353 do PDF).
 * Relações transcritas das figuras: a seta $ vai do cliente para o provedor (Fig. 67, pág. 245); = é par (shared-cost). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, s = u.svg;

    function escolha(rotulo, lista, vazio) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            vazio === false ? null : el("option", { value: "" }, "escolha…"),
            lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    function linhaPergunta(texto, controle) {
        return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, texto), el("div", { class: "col-sm-5" }, controle));
    }
    function campo(rotulo) { return el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": rotulo, autocomplete: "off", spellcheck: "false" }); }

    /* ---------- Atividade 1: caminhos com relações comerciais ---------- */
    // Exportação: rotas próprias e de clientes vão a todos; rotas de pares e provedores, só a clientes.
    // Preferência: cliente > par > provedor; depois, o AS-path mais curto; depois, o vizinho de menor número.
    function bgp(ases, cp, pares) {
        var rel = {}; ases.forEach(function (a) { rel[a] = {}; });
        cp.forEach(function (x) { rel[x[0]][x[1]] = "provedor"; rel[x[1]][x[0]] = "cliente"; });
        pares.forEach(function (x) { rel[x[0]][x[1]] = "par"; rel[x[1]][x[0]] = "par"; });
        var pref = { cliente: 3, par: 2, provedor: 1 }, best = {}, via = {};
        ases.forEach(function (a) { best[a] = {}; via[a] = {}; best[a][a] = [a]; via[a][a] = "proprio"; });
        function chave(c, r) { return [pref[r], -c.length, -Number(c[1].replace("AS", ""))]; }
        function maior(x, y) { for (var i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] > y[i]; } return false; }
        var mudou = true, voltas = 0;
        while (mudou && voltas++ < 50) {
            mudou = false;
            ases.forEach(function (a) {
                Object.keys(rel[a]).forEach(function (v) {
                    var r = rel[a][v];
                    Object.keys(best[v]).forEach(function (d) {
                        var cam = best[v][d];
                        if (d === a || cam.indexOf(a) >= 0) return;
                        var orig = via[v][d];
                        if ((orig === "par" || orig === "provedor") && rel[v][a] !== "cliente") return;
                        var novo = [a].concat(cam), atual = best[a][d];
                        if (!atual || maior(chave(novo, r), chave(atual, via[a][d]))) { best[a][d] = novo; via[a][d] = r; mudou = true; }
                    });
                });
            });
        }
        return best;
    }
    R.bgp41 = bgp;
    var CEN = {
        q1: { nome: "Q1 (pág. 350)", ases: ["AS1", "AS2", "AS3", "AS4"], cp: [["AS1", "AS2"], ["AS4", "AS2"], ["AS1", "AS3"]], pares: [["AS2", "AS3"], ["AS4", "AS3"]],
            pos: { AS1: [70, 40], AS4: [250, 40], AS2: [160, 110], AS3: [160, 190] } },
        q2: { nome: "Q2 (pág. 350)", ases: ["AS1", "AS2", "AS3", "AS4"], cp: [["AS3", "AS1"], ["AS3", "AS4"], ["AS1", "AS4"]], pares: [["AS2", "AS1"], ["AS2", "AS3"]],
            pos: { AS2: [90, 35], AS3: [220, 90], AS1: [90, 150], AS4: [220, 200] } },
        q3: { nome: "Q3 (pág. 351)", ases: ["AS1", "AS2", "AS3", "AS4", "AS5"], cp: [["AS4", "AS2"], ["AS4", "AS1"]], pares: [["AS4", "AS5"], ["AS5", "AS3"], ["AS3", "AS2"], ["AS3", "AS1"], ["AS2", "AS1"]],
            pos: { AS4: [60, 35], AS5: [160, 35], AS3: [260, 35], AS2: [160, 115], AS1: [160, 200] } }
    };
    R.cenBgp41 = CEN;
    function desenha(svgEl, c, extra) {
        var g = s("g", { "font-size": 12, "text-anchor": "middle" });
        g.append(s("defs", null, s("marker", { id: "seta41", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, s("path", { d: "M0 0 L10 5 L0 10 z", fill: "#dc3545" }))));
        function ponta(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy); return [b[0] - dx / L * 26, b[1] - dy / L * 18]; }
        c.pares.concat(extra && extra.tipo === "par" ? [[extra.a, extra.b]] : []).forEach(function (x) {
            var a = c.pos[x[0]], b = c.pos[x[1]];
            g.append(s("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#0d6efd", "stroke-width": 3 }), s("text", { x: (a[0] + b[0]) / 2 + 8, y: (a[1] + b[1]) / 2 - 4, style: "fill: var(--bs-primary-text-emphasis)", "font-weight": "bold" }, "="));
        });
        c.cp.concat(extra && extra.tipo === "cp" ? [[extra.a, extra.b]] : []).forEach(function (x) {
            var a = c.pos[x[0]], b = c.pos[x[1]], p = ponta(a, b);
            g.append(s("line", { x1: a[0], y1: a[1], x2: p[0], y2: p[1], stroke: "#dc3545", "stroke-width": 3, "marker-end": "url(#seta41)" }), s("text", { x: (a[0] + b[0]) / 2 - 10, y: (a[1] + b[1]) / 2, style: "fill: var(--bs-danger-text-emphasis)", "font-weight": "bold" }, "$"));
        });
        Object.keys(c.pos).forEach(function (n) { var p = c.pos[n]; g.append(s("ellipse", { class: "no", cx: p[0], cy: p[1], rx: 26, ry: 16 }), s("text", { x: p[0], y: p[1] + 4 }, n)); });
        svgEl.replaceChildren(s("title", null, "Relações entre domínios"), g);
    }
    R.registrar("caminhos-relacoes", function (raiz) {
        var cen = escolha("Topologia", Object.keys(CEN).map(function (k) { return [k, CEN[k].nome]; }), false);
        var desenho = s("svg", { viewBox: "0 0 320 225", class: "sim-svg w-100", style: "max-height:240px", role: "img", "aria-label": "Domínios e as suas relações; a seta $ vai do cliente para o provedor." });
        var tabela = el("div", { class: "table-responsive mt-2" });
        var extraA = escolha("Enlace novo: de", [["", "—"]].concat(CEN.q3.ases.map(function (a) { return [a, a]; })), false), extraB = escolha("para", [["", "—"]].concat(CEN.q3.ases.map(function (a) { return [a, a]; })), false);
        var extraT = escolha("tipo", [["cp", "cliente → provedor ($)"], ["par", "par (=)"]], false);
        var extraBox = el("div", { class: "row g-2 align-items-end mt-1" }, el("div", { class: "col-4" }, u.campo("Enlace novo (só Q3): de", extraA)), el("div", { class: "col-4" }, u.campo("para", extraB)), el("div", { class: "col-4" }, u.campo("tipo", extraT)));
        var ultimoQ3 = null, aviso = el("p", { class: "small text-danger mb-0", "aria-live": "polite" });
        function mostra() {
            var c = CEN[cen.value], extra = null, cp = c.cp, pares = c.pares;
            aviso.textContent = "";
            var jaLigados = function (x, y) { return c.cp.concat(c.pares).some(function (l) { return (l[0] === x && l[1] === y) || (l[0] === y && l[1] === x); }); };
            if (cen.value === "q3" && extraA.value && extraB.value && extraA.value !== extraB.value && jaLigados(extraA.value, extraB.value)) aviso.textContent = extraA.value + " e " + extraB.value + " já têm um enlace: escolha dois domínios ainda sem ligação direta.";
            else if (cen.value === "q3" && extraA.value && extraB.value && extraA.value !== extraB.value) {
                extra = { a: extraA.value, b: extraB.value, tipo: extraT.value };
                if (extra.tipo === "cp") cp = cp.concat([[extra.a, extra.b]]); else pares = pares.concat([[extra.a, extra.b]]);
            }
            var b = bgp(c.ases, cp, pares);
            if (cen.value === "q3") ultimoQ3 = { extra: extra, completo: c.ases.every(function (a) { return c.ases.every(function (d) { return b[a][d]; }); }) };
            desenha(desenho, c, extra);
            extraBox.style.display = aviso.style.display = cen.value === "q3" ? "" : "none";
            tabela.replaceChildren(el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "AS"), c.ases.map(function (d) { return el("th", null, "→ " + d); }))),
                el("tbody", null, c.ases.map(function (a) { return el("tr", null, el("td", null, a), c.ases.map(function (d) { return el("td", { class: b[a][d] ? null : "table-danger" }, a === d ? "—" : (b[a][d] ? b[a][d].join("-") : "sem rota")); })); }))));
        }
        [cen, extraA, extraB, extraT].forEach(function (x) { x.addEventListener("change", mostra); });
        var P1 = campo("Caminho de AS4 a AS1 na Q1"), P2 = escolha("Par sem rota na Q2", [["24", "AS2 e AS4"], ["13", "AS1 e AS3"], ["12", "AS1 e AS2"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "caminhos-relacoes", 20, "Caminhos com relações comerciais");
        raiz.append(u.campo("Topologia", cen), desenho, extraBox, aviso, tabela,
            el("p", { class: "small text-muted mt-1" }, "Regras: um domínio exporta as suas rotas e as dos clientes a todos, e as aprendidas de pares e provedores só aos clientes; prefere rotas de clientes, depois de pares, depois de provedores, e então o caminho mais curto (desempate pelo menor número de AS)."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (20 pts)"),
            linhaPergunta("Na Q1, qual é o caminho de AS4 até AS1? (escreva como AS4-AS3-…)", P1),
            linhaPergunta("Na Q2, que dois domínios não se alcançam?", P2),
            el("p", { class: "small mb-1" }, "E, na Q3, acrescente um único enlace que dê conectividade completa (deixe-o selecionado ao conferir)."),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var a = P1.value.replace(/\s+/g, "").toUpperCase() === "AS4-AS3-AS1", b2 = P2.value === "24", c3 = ultimoQ3 && ultimoQ3.extra && ultimoQ3.completo;
                var ok = a && b2 && c3;
                u.marca(fb, ok, ok ? "Isso: AS4 prefere a rota do par AS3 à do provedor AS2; na Q2, nenhum domínio repassa rotas entre AS2 e AS4; e, na Q3, AS5 precisa de um provedor." : "Ainda falta: " + [a ? "" : "o caminho da Q1", b2 ? "" : "o par da Q2", c3 ? "" : "um enlace que complete a Q3"].filter(Boolean).join(", ") + ".");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 2: prefixos mais específicos (Q4 e Q5) ---------- */
    function le6(t) {
        var x = String(t).trim().toLowerCase().replace(/\/.*$/, ""), p = x.split("::"), e = p[0] ? p[0].split(":") : [], d = p.length > 1 && p[1] ? p[1].split(":") : [];
        var z = []; for (var i = 0; i < 8 - e.length - d.length; i++) z.push("0");
        return e.concat(z, d).map(function (y) { return parseInt(y, 16); });
    }
    function casa(end, pf) {
        var g = le6(end), p = pf.split("/"), q = le6(p[0]), len = Number(p[1]);
        for (var b = 0; b < len; b++) { var k = b >> 4, bit = 15 - (b & 15); if (((g[k] >> bit) & 1) !== ((q[k] >> bit) & 1)) return false; }
        return true;
    }
    function entrada(anuncios, destino) {
        // anuncios: [prefixo, provedor]; a Internet escolhe pelo maior prefixo entre os anunciados
        var c = anuncios.filter(function (a) { return casa(destino, a[0]); });
        if (!c.length) return null;
        return c.reduce(function (a, b) { return Number(b[0].split("/")[1]) > Number(a[0].split("/")[1]) ? b : a; });
    }
    R.entrada41 = entrada;
    var Q45 = {
        q4: { nome: "Q4: AS789 anuncia o /63 do cliente; AS123, só o seu /48", anuncios: [["2001:db8:dead::/48", "AS123"], ["2001:db8:beef::/48", "AS789"], ["2001:db8:dead:cafe::/63", "AS789"]], destinos: ["2001:db8:dead:cafe::1"] },
        q5a: { nome: "Q5: AS456 anuncia caff::/48 por AS123 e cafe::/48 por AS789", anuncios: [["2001:db8:caff::/48", "AS123"], ["2001:db8:cafe::/48", "AS789"]], destinos: ["2001:db8:caff::bb", "2001:db8:cafe::aa"] },
        q5b: { nome: "Q5, proposta: os dois /48 e também o /47 pelos dois provedores", anuncios: [["2001:db8:caff::/48", "AS123"], ["2001:db8:cafe::/48", "AS789"], ["2001:db8:cafe::/47", "AS123"], ["2001:db8:cafe::/47", "AS789"]], destinos: ["2001:db8:caff::bb", "2001:db8:cafe::aa"] }
    };
    R.q4541 = Q45;
    R.registrar("prefixo-especifico", function (raiz) {
        var cen = escolha("Configuração", Object.keys(Q45).map(function (k) { return [k, Q45[k].nome]; }), false);
        var falha = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        function mostra() {
            var c = Q45[cen.value], an = c.anuncios.filter(function (a) { return !(falha.checked && a[1] === "AS789" && cen.value !== "q4"); });
            saida.replaceChildren(el("p", { class: "mb-1" }, "Anúncios ativos: " + an.map(function (a) { return a[0] + " por " + a[1]; }).join("; ") + "."),
                el("ul", { class: "mb-0" }, c.destinos.map(function (d) { var e = entrada(an, d); return el("li", { class: "mono" }, d + " → " + (e ? "entra por " + e[1] + " (" + e[0] + ")" : "inalcançável")); })));
        }
        [cen, falha].forEach(function (x) { x.addEventListener("change", mostra); });
        var P1 = escolha("Por onde chega cafe::1 na Q4", [["AS123", "AS123"], ["AS789", "AS789"]]), P2 = escolha("cafe::aa com R1–R3 em falha, só com os /48", [["sim", "continua alcançável"], ["nao", "fica inalcançável"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "prefixo-especifico", 15, "Prefixos mais específicos");
        raiz.append(u.campo("Configuração", cen),
            el("div", { class: "form-check" }, falha, el("label", { class: "form-check-label small", for: falha.id }, "O enlace R1–R3 (AS456–AS789) falhou: os anúncios feitos por AS789 somem (só na Q5)")),
            saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Na Q4, por qual provedor chegam os pacotes para 2001:db8:dead:cafe::1?", P1),
            linhaPergunta("Na Q5, só com os dois /48, o que acontece com 2001:db8:cafe::aa quando R1–R3 falha?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === "AS789" && P2.value === "nao";
                u.marca(fb, ok, ok ? "Isso: o maior prefixo vence em toda a Internet; e, sem um anúncio que cubra cafe::/48 pelo outro provedor, a falha deixa essa metade inalcançável." : "Ainda não. Teste as configurações com e sem a falha.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 3: ECMP com hash de fluxo (Q6) ---------- */
    function hashFluxo(f) {   // um hash simples sobre a 5-tupla; roteadores reais usam CRC ou parecidos
        var t = f.orig + "|" + f.dest + "|" + f.proto + "|" + f.po + "|" + f.pd, h = 0;
        for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
        return h;
    }
    R.hashFluxo41 = hashFluxo;
    R.registrar("ecmp-hash", function (raiz) {
        var CAMINHOS = ["D → B → C", "D → E → C"];
        var fluxos = [
            { orig: "2001:db8:d::1", dest: "2001:db8:c::1", proto: 6, po: 52001, pd: 80 }, { orig: "2001:db8:d::1", dest: "2001:db8:c::1", proto: 6, po: 52002, pd: 80 },
            { orig: "2001:db8:d::2", dest: "2001:db8:c::1", proto: 6, po: 40000, pd: 443 }, { orig: "2001:db8:d::1", dest: "2001:db8:c::9", proto: 17, po: 5353, pd: 53 }
        ];
        var modo = escolha("Escolha da saída", [["fluxo", "hash da 5-tupla (por fluxo)"], ["pacote", "alternando a cada pacote"]], false);
        var tabela = el("div", { class: "table-responsive mt-2" }), saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            var linhas = [], cont = 0;
            fluxos.forEach(function (f, i) {
                for (var p = 1; p <= 3; p++) {
                    var k = modo.value === "fluxo" ? hashFluxo(f) % 2 : cont++ % 2;
                    linhas.push(el("tr", null, el("td", null, "fluxo " + (i + 1)), el("td", { class: "mono" }, f.po + " → " + f.pd + (f.proto === 6 ? "/tcp" : "/udp")), el("td", null, "pacote " + p), el("td", null, CAMINHOS[k])));
                }
            });
            tabela.replaceChildren(el("table", { class: "table table-sm small mb-0" }, el("thead", null, el("tr", null, el("th", null, "Fluxo"), el("th", null, "Portas"), el("th", null, "Pacote"), el("th", null, "Caminho"))), el("tbody", null, linhas)));
            saida.textContent = modo.value === "fluxo" ? "Todos os pacotes de um fluxo seguem o mesmo caminho; fluxos diferentes se espalham pelos dois." : "Os pacotes de um mesmo fluxo se alternam entre caminhos de atrasos diferentes e podem chegar fora de ordem.";
        }
        modo.addEventListener("change", mostra);
        var P1 = escolha("O que entra no hash", [["tupla", "endereços de origem e destino, protocolo e portas"], ["dest", "só o endereço de destino"], ["aleat", "um número aleatório por pacote"]]);
        var P2 = campo("Caminho do fluxo com hash par");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ecmp-hash", 10, "ECMP por fluxo");
        raiz.append(el("p", { class: "small mb-1" }, "Na Fig. 11 (pág. 352), todos os enlaces custam 1, menos A–B, que custa 4: de D até C há dois caminhos de custo 2."),
            u.campo("Como o roteador D escolhe a saída", modo), tabela, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("O que o hash deve usar para manter cada conexão TCP num só caminho e ainda espalhar as conexões?", P1),
            linhaPergunta("Com saída = hash mod 2, um fluxo de hash par vai por qual caminho? (escreva D-B-C ou D-E-C)", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === "tupla" && P2.value.replace(/\s|→/g, "-").replace(/-+/g, "-").toUpperCase() === "D-B-C";
                u.marca(fb, ok, ok ? "Isso: a 5-tupla identifica a conexão; hash mod N escolhe sempre a mesma das N saídas para ela." : "Ainda não. Índice 0 é o primeiro caminho da lista.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 4: o traceroute6 até o Google (Q7) ---------- */
    var TRACE = [
        ["1", ["2a02:2788:2c4:16f:a221:b7ff:fed8:aa90"]], ["2", ["2a02:2788:2c0::1"]], ["3", ["2a02:2788:2c0:3::1"]], ["4", ["2a02:2788:ffff:12::1"]],
        ["5", ["xe-4-2.r00.brslbe01.be.bb.gin.ntt.net"]], ["6", ["ae-10.r02.amstnl02.nl.bb.gin.ntt.net"]], ["7", ["core1.ams.net.google.com"]],
        ["8", ["2001:4860::1:0:4b3", "2001:4860::1:0:8", "2001:4860::1:0:4b3"]], ["9", ["2001:4860::8:0:519f", "2001:4860::8:0:51a0", "2001:4860::8:0:51a0"]],
        ["10", ["2001:4860::8:0:5bb8", "2001:4860::8:0:5bb9", "2001:4860::8:0:5bb9"]], ["11", ["2001:4860::1:0:3067"]], ["12", ["2001:4860:0:1::9"]], ["13", ["lhr14s23-in-x01.1e100.net"]]
    ];
    R.registrar("traceroute-google", function (raiz) {
        var lista = el("ol", { class: "small mono mb-1 ps-4" }, TRACE.map(function (t) {
            var distintos = t[1].filter(function (x, i, a) { return a.indexOf(x) === i; });
            return el("li", { class: distintos.length > 1 ? "fw-bold" : null }, distintos.join("  |  ") + (distintos.length > 1 ? "  (" + distintos.length + " endereços nas 3 sondas)" : ""));
        }));
        var P1 = campo("Saltos com mais de um endereço"), P2 = escolha("Por quê", [["ecmp", "há caminhos de mesmo custo em paralelo, e sondas com portas diferentes caem em roteadores diferentes"], ["rota", "a rota mudou durante o traceroute6"], ["erro", "o traceroute6 errou o endereço"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "traceroute-google", 10, "O traceroute6 até o Google");
        raiz.append(el("p", { class: "small mb-1" }, "traceroute6 para ipv6.google.com (pág. 353 do PDF), com as três sondas de cada salto resumidas:"), lista,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Em que saltos aparecem vários endereços? (números separados por vírgula)", P1),
            linhaPergunta("Por quê?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var nums = P1.value.split(/[,\s]+/).filter(Boolean).map(Number).sort(function (a, b) { return a - b; }).join();
                var ok = nums === "8,9,10" && P2.value === "ecmp";
                u.marca(fb, ok, ok ? "Isso: dentro da rede do Google há enlaces paralelos de mesmo custo, e cada sonda do traceroute6 usa outra porta UDP, o que muda o hash e o caminho." : "Ainda não. Procure as linhas em negrito.");
                if (ok) concluir();
            }), fb);
    });

    /* ---------- Atividade 5: mensagens de erro ICMPv6 (Q8–Q10) ---------- */
    var UNREACH = [[0, "sem rota para o destino"], [1, "comunicação proibida por política"], [2, "fora do escopo do endereço de origem"], [3, "endereço inalcançável"], [4, "porta inalcançável"], [5, "endereço de origem reprovado pela política"], [6, "rota rejeitada"]];
    function bytesNecessarios(ext) { return 40 + ext + 4; }
    R.bytesIcmp41 = bytesNecessarios;
    R.registrar("icmpv6-erros", function (raiz) {
        var ext = el("input", { type: "number", min: 0, max: 200, step: 8, value: 0, class: "form-control form-control-sm", "aria-label": "Bytes de cabeçalhos de extensão" });
        var saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() { var e = Math.max(0, Number(ext.value) || 0); saida.textContent = "40 bytes do cabeçalho IPv6 + " + e + " de extensões + 4 das portas = " + bytesNecessarios(e) + " bytes do pacote original."; }
        ext.addEventListener("input", mostra);
        var tabela = el("table", { class: "table table-sm small mb-2" }, el("thead", null, el("tr", null, el("th", null, "Código"), el("th", null, "Destination Unreachable (tipo 1)"))),
            el("tbody", null, UNREACH.map(function (x) { return el("tr", null, el("td", null, String(x[0])), el("td", null, x[1])); })));
        var P1 = campo("Bytes sem extensões"), P2 = escolha("Quem gera Time Exceeded código 1", [["host", "o host de destino, ao desistir de remontar um pacote fragmentado"], ["roteador", "um roteador, ao zerar o hop limit"]]), P3 = campo("Código para sem rota");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "icmpv6-erros", 15, "As mensagens de erro ICMPv6");
        raiz.append(el("p", { class: "small mb-1" }, "Os códigos da mensagem Destination Unreachable (RFC 4443, seção 3.1):"), tabela,
            u.campo("Bytes de cabeçalhos de extensão no pacote original", ext), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Sem extensões, quantos bytes do pacote original bastam para recuperar os endereços e as portas?", P1),
            linhaPergunta("Quem gera um Time Exceeded com código 1?", P2),
            linhaPergunta("Que código de Destination Unreachable um roteador sem rota para o destino usa?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 44 && P2.value === "host" && Number(P3.value) === 0;
                u.marca(fb, ok, ok ? "Isso: 44 bytes; a RFC 4443 manda devolver o máximo que couber num pacote de 1280 bytes, para não faltar nada mesmo com extensões." : "Ainda não. Some o cabeçalho IPv6 e os 4 primeiros bytes do UDP ou do TCP.");
                if (ok) concluir();
            }), fb);
        mostra();
    });
}());
