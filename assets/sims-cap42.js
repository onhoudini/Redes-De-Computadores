/* Simulações do Capítulo 42 — Prática: explorando os protocolos de roteamento (seção 4.16 do livro, pág. 353–384 do PDF).
 * As topologias, os endereços e as capturas são os das figuras e saídas impressas no livro. */
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
    function limpa(t) { return String(t).replace(/\s+/g, "").toLowerCase(); }
    function caminhoDigitado(t) { return String(t).trim().toUpperCase().replace(/[\s→>,-]+/g, "-"); }
    function tabela(cab, linhas, extra) {
        return el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-1 " + (extra || "") },
            el("thead", null, el("tr", null, cab.map(function (c) { return el("th", null, c); }))),
            el("tbody", null, linhas)));
    }

    /* ================= Atividade 1: OSPFv3 na rede da Fig. 12 ================= */
    var P = "2001:db8:1341:";
    var OSPF_INTF = { r1: { a: "1::1", r2: "12::1", r3: "13::1" }, r2: { r1: "12::2", r3: "23::2" }, r3: { r1: "13::3", r2: "23::3", b: "3::3" } };
    var GATEWAY = { a: "r1", b: "r3" }, HOST = { a: "1::a", b: "3::b" };
    function spf(custos, falhas, origem) {
        var g = { r1: [], r2: [], r3: [] };
        Object.keys(custos).forEach(function (k) {
            if (falhas[k]) return;
            var x = k.split("-"); g[x[0]].push([x[1], custos[k]]); g[x[1]].push([x[0], custos[k]]);
        });
        var dist = {}, prev = {}, feito = {}; dist[origem] = 0;
        for (;;) {
            var n = null;
            ["r1", "r2", "r3"].forEach(function (v) { if (!feito[v] && dist[v] !== undefined && (n === null || dist[v] < dist[n])) n = v; });
            if (n === null) break;
            feito[n] = true;
            g[n].forEach(function (e) { var d = dist[n] + e[1]; if (dist[e[0]] === undefined || d < dist[e[0]]) { dist[e[0]] = d; prev[e[0]] = n; } });
        }
        return { dist: dist, prev: prev };
    }
    function proximo(custos, falhas, de, para) {   // próximo roteador de "de" até "para"
        if (de === para) return de;
        var r = spf(custos, falhas, de);
        if (r.dist[para] === undefined) return null;
        var n = para; while (r.prev[n] !== de) n = r.prev[n];
        return n;
    }
    function traceOspf(custos, falhas, org, dst) {
        var alvo = P + HOST[dst].replace("b", "B").replace("a", "A");
        var linhas = ["traceroute to " + alvo + " (" + P + HOST[dst] + ") from " + P + HOST[org] + ", 30 hops max, 24 byte packets"];
        var n = GATEWAY[org], k = 1;
        while (k < 8) {
            // o roteador responde com o endereço da interface pela qual alcança a origem
            var volta = n === GATEWAY[org] ? org : proximo(custos, falhas, n, GATEWAY[org]);
            var end = P + (volta ? OSPF_INTF[n][volta] : OSPF_INTF[n][Object.keys(OSPF_INTF[n])[0]]);
            if (n === GATEWAY[dst]) { linhas.push(" " + k + "  " + end + " (" + end + ")"); linhas.push(" " + (k + 1) + "  " + P + HOST[dst] + " (" + P + HOST[dst] + ")"); return linhas; }
            var prox = proximo(custos, falhas, n, GATEWAY[dst]);
            if (!prox) { linhas.push(" " + k + "  " + end + " (" + end + ")  !N"); return linhas; }
            linhas.push(" " + k + "  " + end + " (" + end + ")");
            n = prox; k++;
        }
        return linhas;
    }
    R.traceOspf42 = traceOspf;
    R.registrar("ospf-custos", function (raiz) {
        var LIG = [["r1-r2", 1], ["r1-r3", 5], ["r2-r3", 3]];
        var POS = { a: [30, 130], r1: [110, 130], r2: [200, 45], r3: [290, 130], b: [370, 130] };
        var ent = {}, cx = {};
        LIG.forEach(function (l) {
            ent[l[0]] = el("input", { type: "number", min: 1, max: 99, value: l[1], class: "form-control form-control-sm", "aria-label": "Custo do enlace " + l[0] });
            cx[l[0]] = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("f") });
        });
        var desenho = s("svg", { viewBox: "0 0 400 165", class: "sim-svg w-100", style: "max-height:190px", role: "img", "aria-label": "Fig. 12: a ligado a r1; r1, r2 e r3 em triângulo; r3 ligado a b." });
        var saida = el("pre", { class: "log small mb-1", "aria-live": "polite" });
        function custos() { var c = {}; LIG.forEach(function (l) { c[l[0]] = Math.max(1, Math.round(Number(ent[l[0]].value) || 1)); }); return c; }
        function falhas() { var f = {}; LIG.forEach(function (l) { f[l[0]] = cx[l[0]].checked; }); return f; }
        function mostra() {
            var c = custos(), f = falhas(), g = s("g", { "font-size": 12, "text-anchor": "middle" });
            [["a", "r1"], ["r3", "b"]].concat(LIG.map(function (l) { return l[0].split("-"); })).forEach(function (x) {
                var a = POS[x[0]], b = POS[x[1]], k = x.join("-"), caiu = f[k];
                g.append(s("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "currentColor", "stroke-width": 2, "stroke-dasharray": caiu ? "5 5" : null, opacity: caiu ? 0.4 : 1 }));
                if (c[k] !== undefined) g.append(s("text", { x: (a[0] + b[0]) / 2 + (k === "r1-r3" ? 0 : (k === "r1-r2" ? -10 : 10)), y: (a[1] + b[1]) / 2 + (k === "r1-r3" ? 16 : -4), "font-weight": "bold" }, caiu ? "×" : String(c[k])));
            });
            Object.keys(POS).forEach(function (n) { var p = POS[n]; g.append(s("ellipse", { class: "no", cx: p[0], cy: p[1], rx: 18, ry: 13 }), s("text", { x: p[0], y: p[1] + 4 }, n)); });
            desenho.replaceChildren(s("title", null, "Fig. 12: uma rede simples"), g);
            saida.textContent = "mininet> a traceroute6 " + P + "3::B\n" + traceOspf(c, f, "a", "b").join("\n") + "\nmininet> b traceroute6 " + P + "1::A\n" + traceOspf(c, f, "b", "a").join("\n");
        }
        LIG.forEach(function (l) { ent[l[0]].addEventListener("input", mostra); cx[l[0]].addEventListener("change", mostra); });
        function preset(v) { LIG.forEach(function (l, i) { ent[l[0]].value = v[i]; cx[l[0]].checked = false; }); mostra(); }
        var P1 = campo("Endereço do salto 2"), P2 = campo("Endereço do salto 3"), P3 = escolha("Custos que explicam o livro", [["153", "1, 5 e 3, como no script"], ["111", "todos iguais a 1"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ospf-custos", 15, "Os custos do OSPF");
        raiz.append(desenho,
            el("div", { class: "row g-2" }, LIG.map(function (l) {
                return el("div", { class: "col-4" }, u.campo("Custo " + l[0].replace("-", "–"), ent[l[0]]), el("div", { class: "form-check small" }, cx[l[0]], el("label", { class: "form-check-label", for: cx[l[0]].id }, "falhou")));
            })),
            el("div", { class: "d-flex flex-wrap gap-2 my-2" }, u.botao("Custos do script (1, 5, 3)", "btn-outline-secondary btn-sm", function () { preset([1, 5, 3]); }),
                u.botao("Como o IPMininet aplicou (1, 1, 1)", "btn-outline-secondary btn-sm", function () { preset([1, 1, 1]); })),
            saida, el("p", { class: "small text-muted" }, "Os tempos de cada sonda foram omitidos. Cada roteador responde com o endereço da interface pela qual ele alcança a origem."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Com os custos 1, 5 e 3 de fato aplicados, que endereço aparece no salto 2 do traceroute6 de a para b?", P1),
            linhaPergunta("E no salto 3?", P2),
            linhaPergunta("Que custos explicam a saída impressa no livro (a, r1, 13::3, b)?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = limpa(P1.value) === limpa(P + "12::2") && limpa(P2.value) === limpa(P + "23::3") && P3.value === "111";
                u.marca(fb, ok, ok ? "Isso: com 1, 5 e 3, o caminho é r1 → r2 → r3 (custo 4 contra 5); a saída do livro, direto por r1–r3, é a de todos os custos valendo 1." : "Ainda não. Use os botões e compare as duas saídas.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ================= Atividade 2: os pacotes do OSPFv3 ================= */
    var R1 = "fe80::5825:b0ff:fe60:abaa", R2 = "fe80::68bc:b4ff:fe19:42b7";
    var OSPF_CAP = [
        [1, "0.000000", R2, "ff02::5", 90, "Hello Packet"], [2, "0.932466", R1, "ff02::5", 90, "Hello Packet"], [3, "0.999946", R2, "ff02::5", 94, "Hello Packet"],
        [4, "1.935659", R1, "ff02::5", 94, "Hello Packet"], [5, "1.999919", R2, "ff02::5", 94, "Hello Packet"], [6, "2.939625", R1, "ff02::5", 94, "Hello Packet"],
        [7, "3.000114", R2, R1, 82, "DB Description"], [8, "3.000536", R2, "ff02::5", 94, "Hello Packet"], [9, "3.932596", R1, R2, 82, "DB Description"],
        [10, "3.939569", R1, "ff02::5", 94, "Hello Packet"], [11, "4.000591", R2, "ff02::5", 94, "Hello Packet"], [12, "4.943035", R1, "ff02::5", 94, "Hello Packet"],
        null,
        [16, "6.945530", R1, "ff02::5", 94, "Hello Packet"], [17, "7.005245", R2, "ff02::5", 94, "Hello Packet"], [18, "7.948247", R1, "ff02::5", 94, "Hello Packet"],
        [19, "8.001576", R2, R1, 82, "DB Description"], [20, "8.001988", R1, R2, 222, "DB Description"], [21, "8.002323", R2, R1, 154, "LS Request"],
        [22, "8.002468", R2, R1, 142, "DB Description"], [23, "8.002718", R1, "ff02::5", 394, "LS Update"], [24, "8.003391", R1, R2, 106, "LS Request"]
    ];
    var OSPF_DET = {
        1: ["Hop Limit: 1 · Next Header: OSPF IGP (89)", "Message Type: Hello Packet (1) · Packet Length: 36 · Source OSPF Router: 0.0.0.3 (r2) · Area ID: 0.0.0.0", "Interface ID: 2 · Router Priority: 10 · Hello Interval: 1 s · Router Dead Interval: 3 s · DR: 0.0.0.0 · BDR: 0.0.0.0"],
        2: ["Hop Limit: 1 · Next Header: OSPF IGP (89)", "Message Type: Hello Packet (1) · Packet Length: 36 · Source OSPF Router: 0.0.0.2 (r1)", "Interface ID: 3 · Router Priority: 10 · Hello Interval: 1 s · Router Dead Interval: 3 s"],
        9: ["Payload Length: 28 · Hop Limit: 64 · destino unicast (o link-local de r2)", "Message Type: DB Description (2) · Packet Length: 28 · Source OSPF Router: 0.0.0.2", "Interface MTU: 1500 · DB Description: 0x07, (I) Init, (M) More, (MS) Master · DD Sequence: 14795"],
        20: ["Payload Length: 168 · Hop Limit: 64", "Message Type: DB Description (2) · Packet Length: 168 · Source OSPF Router: 0.0.0.2", "DB Description: 0x00 · DD Sequence: 14794 · primeiro cabeçalho: LSA-type 8 (Link-LSA), Link State ID 0.0.0.3, Advertising Router 0.0.0.2, Sequence 0x80000001"],
        23: ["Payload Length: 340 · Hop Limit: 1 · destino ff02::5", "Message Type: LS Update (4) · Packet Length: 340 · Source OSPF Router: 0.0.0.2", "Number of LSAs: 7 · o primeiro é um Link-LSA (len 56) com o link-local fe80::5825:b0ff:fe60:abaa"]
    };
    function quem(e) { return e === R1 ? "r1" : e === R2 ? "r2" : e; }
    R.registrar("ospf-pacotes", function (raiz) {
        var det = el("div", { class: "small mt-2", "aria-live": "polite" });
        function abre(p) {
            var linhas = OSPF_DET[p[0]];
            var tam = p[4] - 54;   // 14 de Ethernet + 40 de IPv6
            det.replaceChildren(el("p", { class: "fw-semibold mb-1" }, "Pacote " + p[0] + ": " + p[5] + ", de " + quem(p[2]) + " para " + quem(p[3])),
                linhas ? el("ul", { class: "mb-1 mono" }, linhas.map(function (l) { return el("li", null, l); }))
                    : el("p", { class: "mb-1 text-muted" }, "O livro não mostra os campos deste pacote."),
                el("p", { class: "mb-0" }, p[4] + " bytes no quadro = 14 (Ethernet) + 40 (IPv6) + " + tam + " de OSPFv3."));
        }
        var linhas = OSPF_CAP.map(function (p) {
            if (!p) return el("tr", null, el("td", { colspan: 6, class: "text-muted" }, "… pacotes 13 a 15 (não aparecem nas figuras do livro)"));
            return el("tr", null, el("td", null, u.botao(String(p[0]), "btn-outline-secondary btn-sm py-0", function () { abre(p); })), el("td", null, p[1]),
                el("td", null, quem(p[2])), el("td", null, quem(p[3])), el("td", null, String(p[4])), el("td", null, p[5]));
        });
        var P1 = campo("Bytes por vizinho no Hello"), P2 = campo("Cabeçalhos de LSA no pacote 20"), P3 = campo("Segundos sem Hello");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ospf-pacotes", 15, "Os pacotes do OSPFv3");
        raiz.append(el("p", { class: "small mb-1" }, "A captura de r1 (págs. 358–364 do PDF); clique no número para ver os campos:"),
            tabela(["No.", "Tempo (s)", "Origem", "Destino", "Bytes", "Info"], linhas, "mono"), det,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Os primeiros Hello têm 90 bytes; depois, 94. Quantos bytes ocupa cada vizinho listado num Hello?", P1),
            linhaPergunta("Um DB Description sem LSAs tem 28 bytes de OSPFv3, e cada cabeçalho de LSA tem 20. Quantos cabeçalhos leva o pacote 20?", P2),
            linhaPergunta("Sem receber Hello por quantos segundos r1 considera r2 fora do ar?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 4 && Number(P2.value) === 7 && Number(P3.value) === 3;
                u.marca(fb, ok, ok ? "Isso: 4 bytes por Router ID de vizinho; (168 − 28) / 20 = 7 cabeçalhos, os mesmos 7 LSAs que r1 manda no LS Update; e o Router Dead Interval é de 3 s." : "Ainda não. Abra os pacotes 1, 3 e 20.");
                if (ok) concluir();
            }), fb);
    });

    /* ================= Atividade 3: RIPng ================= */
    var RA = "fe80::5c73:a5ff:fed5:f684", RB = "fe80::481a:48ff:fed7:292e";
    var RIP_CAP = [[1, "0.000000", RA, "ff02::9", 86, "Request"], [2, "0.642948", RB, "ff02::9", 86, "Request"], [3, "0.643283", RA, RB, 146, "Response"],
        [4, "3.363341", RB, "ff02::9", 146, "Response"], [5, "4.624354", RA, "ff02::9", 126, "Response"], [6, "18.251276", RB, "ff02::9", 166, "Response"],
        [7, "20.365110", RA, "ff02::9", 146, "Response"], [8, "42.276034", RB, "ff02::9", 166, "Response"], [9, "47.371180", RA, "ff02::9", 146, "Response"],
        [10, "83.304821", RB, "ff02::9", 166, "Response"]];
    function rtes(bytes) { return (bytes - 66) / 20; }   // 14 Ethernet + 40 IPv6 + 8 UDP + 4 RIPng
    R.rtes42 = rtes;
    R.registrar("ripng-captura", function (raiz) {
        var det = el("div", { class: "small mt-2", "aria-live": "polite" });
        function quemR(e) { return e === RA ? "r2" : e === RB ? "vizinho (" + e.slice(0, 13) + "…)" : e; }
        function abre(p) {
            var extra = p[0] === 1 ? ["Command: Request (1) · Version: 1", "Route Table Entry: IPv6 Prefix ::/0, Metric 16"]
                : p[0] === 3 ? ["Command: Response (2) · Hop Limit: 64 · UDP 521 → 521", "2001:db8:1341:3::/64 métrica 2 · 2001:db8:1341:12::/64 métrica 1 · 2001:db8:1341:13::/64 métrica 2 · (a 4ª entrada não aparece na figura)"] : null;
            det.replaceChildren(el("p", { class: "fw-semibold mb-1" }, "Pacote " + p[0] + ": " + p[5] + ", de " + quemR(p[2]) + " para " + quemR(p[3])),
                extra ? el("ul", { class: "mb-1 mono" }, extra.map(function (l) { return el("li", null, l); })) : el("p", { class: "mb-1 text-muted" }, "O livro não mostra os campos deste pacote."),
                el("p", { class: "mb-0" }, p[4] + " bytes = 66 (Ethernet, IPv6, UDP e cabeçalho RIPng) + " + (p[4] - 66) + " = " + rtes(p[4]) + " entrada(s) de 20 bytes."));
        }
        var linhas = RIP_CAP.map(function (p) {
            return el("tr", null, el("td", null, u.botao(String(p[0]), "btn-outline-secondary btn-sm py-0", function () { abre(p); })), el("td", null, p[1]),
                el("td", null, quemR(p[2])), el("td", null, quemR(p[3])), el("td", null, String(p[4])), el("td", null, p[5]));
        });
        var P1 = campo("Entradas numa Response de 166 bytes"), P2 = escolha("Destino da resposta ao pedido", [["uni", "o link-local de quem pediu"], ["multi", "ff02::9"], ["any", "ff02::1"]]);
        var P3 = escolha("O que pede o Request", [["tudo", "a tabela inteira do vizinho"], ["padrao", "só a rota padrão"], ["nada", "a remoção da rota padrão"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ripng-captura", 15, "As mensagens do RIPng");
        raiz.append(el("p", { class: "small mb-1" }, "A captura ripng-r2-trace.pcap (págs. 367–369 do PDF); clique no número:"),
            tabela(["No.", "Tempo (s)", "Origem", "Destino", "Bytes", "Info"], linhas, "mono"), det,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Quantas entradas de rota leva uma Response de 166 bytes?", P1),
            linhaPergunta("Para onde vai a Response que responde a um Request (pacote 3)?", P2),
            linhaPergunta("O que pede um Request com uma única entrada ::/0 de métrica 16?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 5 && P2.value === "uni" && P3.value === "tudo";
                u.marca(fb, ok, ok ? "Isso: (166 − 66) / 20 = 5; a resposta vai direto a quem pediu; e ::/0 com métrica 16 (infinito) é o pedido da tabela inteira (RFC 2080)." : "Ainda não. Abra os pacotes 1 e 3.");
                if (ok) concluir();
            }), fb);
    });

    /* ================= Motor BGP com as políticas do IPMininet ================= */
    // local-pref 200 para rotas de clientes, 150 de pares e 100 de provedores; rotas de pares e provedores só vão para clientes.
    var LP = { cliente: 200, par: 150, provedor: 100 };
    function relacoes(cp, pares, fora) {
        var rel = {}, caiu = function (a, b) { return fora.some(function (f) { return (f[0] === a && f[1] === b) || (f[0] === b && f[1] === a); }); };
        function poe(a, b, r) { (rel[a] = rel[a] || {})[b] = r; }
        cp.forEach(function (x) { if (!caiu(x[0], x[1])) { poe(x[0], x[1], "provedor"); poe(x[1], x[0], "cliente"); } });
        pares.forEach(function (x) { if (!caiu(x[0], x[1])) { poe(x[0], x[1], "par"); poe(x[1], x[0], "par"); } });
        return rel;
    }
    function bgp(ases, cp, pares, fora) {
        var rel = relacoes(cp, pares, fora || []);
        ases.forEach(function (a) { rel[a] = rel[a] || {}; });
        function chave(c, r) { return [LP[r], -c.length, -Number(c[1].replace("AS", ""))]; }
        function maior(x, y) { for (var i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] > y[i]; } return false; }
        var melhor = {}, rec = {}, convergiu = false;
        ases.forEach(function (a) { melhor[a] = {}; melhor[a][a] = { cam: [a], r: "proprio" }; });
        for (var volta = 0; volta < 100; volta++) {
            var novo = {}; rec = {};
            ases.forEach(function (a) { novo[a] = {}; novo[a][a] = { cam: [a], r: "proprio" }; rec[a] = {}; });
            ases.forEach(function (a) {
                Object.keys(rel[a]).sort().forEach(function (v) {
                    var r = rel[a][v];
                    Object.keys(melhor[v]).forEach(function (d) {
                        var m = melhor[v][d];
                        if (m.cam.indexOf(a) >= 0) return;
                        if ((m.r === "par" || m.r === "provedor") && rel[v][a] !== "cliente") return;
                        var c = [a].concat(m.cam);
                        (rec[a][d] = rec[a][d] || {})[v] = { cam: c, r: r };
                        if (!novo[a][d] || maior(chave(c, r), chave(novo[a][d].cam, novo[a][d].r))) novo[a][d] = { cam: c, r: r };
                    });
                });
            });
            if (JSON.stringify(novo) === JSON.stringify(melhor)) { convergiu = true; break; }
            melhor = novo;
        }
        return { melhor: melhor, rec: rec, rel: rel, convergiu: convergiu };
    }
    function exporta(res, a, n) {
        var out = {};
        Object.keys(res.melhor[a]).forEach(function (d) {
            var m = res.melhor[a][d];
            if (m.cam.indexOf(n) >= 0) return;
            if ((m.r === "par" || m.r === "provedor") && res.rel[a][n] !== "cliente") return;
            out[d] = m.cam.join(" ");
        });
        return out;
    }
    function mensagens(ases, antes, depois) {
        var lista = [];
        ases.forEach(function (a) {
            Object.keys(depois.rel[a]).sort().forEach(function (n) {
                var e0 = antes.rel[a] && antes.rel[a][n] ? exporta(antes, a, n) : {}, e1 = exporta(depois, a, n);
                Object.keys(e0).concat(Object.keys(e1)).filter(function (x, i, v) { return v.indexOf(x) === i; }).sort().forEach(function (d) {
                    if (!(d in e1)) lista.push(a + " → " + n + ": UPDATE retirando p" + d.slice(2));
                    else if (e0[d] !== e1[d]) lista.push(a + " → " + n + ": UPDATE anunciando p" + d.slice(2) + " com AS-path " + e1[d].split(" ").map(function (x) { return x.slice(2); }).join(" "));
                });
            });
        });
        return lista;
    }
    function alcanca(res, a, b) { return !!(res.melhor[a][b] && res.melhor[b][a]); }
    function ping6all(ases, res) {
        var ok = 0, tot = 0, l = ["*** Ping: testing reachability over IPv6"];
        ases.forEach(function (a) {
            l.push("h" + a.slice(2) + " --IPv6--> " + ases.filter(function (b) { return b !== a; }).map(function (b) { tot++; if (alcanca(res, a, b)) { ok++; return "h" + b.slice(2); } return "X"; }).join(" "));
        });
        l.push("*** Results: " + Math.round(100 * (tot - ok) / tot) + "% dropped (" + ok + "/" + tot + " received)");
        return l.join("\n");
    }
    R.bgp42 = bgp; R.mensagens42 = mensagens; R.ping42 = ping6all;
    function desenhaAS(c, extra, falha) {
        var g = s("g", { "font-size": 12, "text-anchor": "middle" });
        g.append(s("defs", null, s("marker", { id: "seta42" + c.id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, s("path", { d: "M0 0 L10 5 L0 10 z", fill: "#dc3545" }))));
        function caiu(a, b) { return falha && ((falha[0] === a && falha[1] === b) || (falha[0] === b && falha[1] === a)); }
        function linha(a, b, cor, seta, rot) {
            var p = c.pos[a], q = c.pos[b], arco = c.arcos && c.arcos[[a, b].sort().join("-")];
            var dx = q[0] - p[0], dy = q[1] - p[1], L = Math.sqrt(dx * dx + dy * dy), fim = seta ? [q[0] - dx / L * 28, q[1] - dy / L * 17] : q;
            var at = { stroke: cor, "stroke-width": 3, fill: "none", "marker-end": seta ? "url(#seta42" + c.id + ")" : null, "stroke-dasharray": caiu(a, b) ? "6 5" : null, opacity: caiu(a, b) ? 0.4 : 1 };
            if (arco) { at.d = "M" + p[0] + " " + p[1] + " Q" + arco[0] + " " + arco[1] + " " + fim[0] + " " + fim[1]; g.append(s("path", at)); }
            else { at.x1 = p[0]; at.y1 = p[1]; at.x2 = fim[0]; at.y2 = fim[1]; g.append(s("line", at)); }
            var mx = arco ? (p[0] + 2 * arco[0] + q[0]) / 4 : (p[0] + q[0]) / 2, my = arco ? (p[1] + 2 * arco[1] + q[1]) / 4 : (p[1] + q[1]) / 2;
            g.append(s("text", { x: mx + 9, y: my - 5, style: "fill: var(" + (seta ? "--bs-danger-text-emphasis" : "--bs-primary-text-emphasis") + ")", "font-weight": "bold" }, caiu(a, b) ? "×" : rot));
        }
        var cp = c.cp, pares = c.pares;
        if (extra) { cp = extra.cp; pares = extra.pares; }
        pares.forEach(function (x) { linha(x[0], x[1], "#0d6efd", false, "="); });
        cp.forEach(function (x) { linha(x[0], x[1], "#dc3545", true, "$"); });
        Object.keys(c.pos).forEach(function (n) { var p = c.pos[n]; g.append(s("ellipse", { class: "no", cx: p[0], cy: p[1], rx: 26, ry: 15 }), s("text", { x: p[0], y: p[1] + 4 }, n)); });
        return g;
    }

    /* ================= Atividade 4: eBGP com três domínios (Fig. 13) ================= */
    var F13 = { id: "f13", ases: ["AS1", "AS2", "AS3"], cp: [["AS1", "AS2"], ["AS2", "AS3"]], pares: [["AS1", "AS3"]],
        pos: { AS1: [60, 40], AS2: [190, 40], AS3: [320, 40] }, arcos: { "AS1-AS3": [190, 130] } };
    var F13_END = { "AS1-AS2": { AS1: "2001:cafe:1:12::1", AS2: "2001:cafe:1:12::2" }, "AS1-AS3": { AS1: "2001:cafe:1:13::1", AS3: "2001:cafe:1:13::3" },
        "AS2-AS3": { AS2: "2001:cafe:2:23::2", AS3: "2001:cafe:2:23::3" } };
    var F13_HOST = { AS1: ["2001:cafe:1:1::1", "2001:cafe:1:1::11"], AS2: ["2001:cafe:2:1::2", "2001:cafe:2:1::12"], AS3: ["2001:cafe:3:1::3", "2001:cafe:3:1::13"] };
    function trace13(res, o, d) {
        var l = ["traceroute to " + F13_HOST[d][1] + " (" + F13_HOST[d][1] + ") from " + F13_HOST[o][1] + ", 30 hops max, 24 byte packets"];
        var m = res.melhor[o][d];
        if (!m) return l.concat([" 1  " + F13_HOST[o][0] + "  !N"]);
        m.cam.forEach(function (a, i) {
            var volta = res.melhor[a][o], end;
            if (a === o) end = F13_HOST[o][0];
            else if (!volta) end = "*";
            else end = F13_END[[a, volta.cam[1]].sort().join("-")][a];
            l.push(" " + (i + 1) + "  " + end);
        });
        l.push(" " + (m.cam.length + 1) + "  " + F13_HOST[d][1]);
        return l;
    }
    function locRib(res, a, prefixo) {
        var l = ["   Network            Next Hop   LocPrf Path"];
        Object.keys(res.melhor[a]).concat(Object.keys(res.rec[a])).filter(function (x, i, v) { return v.indexOf(x) === i; }).sort().forEach(function (d) {
            var nome = prefixo(d);
            if (d === a) { l.push("*> " + (nome + "                   ").slice(0, 19) + "::                 i"); return; }
            var rotas = res.rec[a][d] || {}, m = res.melhor[a][d], primeira = true;
            Object.keys(rotas).sort().forEach(function (v) {
                var r = rotas[v], best = m && m.cam.join() === r.cam.join();
                l.push((best ? "*> " : "*  ") + ((primeira ? nome : "") + "                   ").slice(0, 19) + (v.toLowerCase() + "         ").slice(0, 11) + (LP[r.r] + "    ").slice(0, 7) + r.cam.slice(1).map(function (x) { return x.slice(2); }).join(" ") + " i");
                primeira = false;
            });
        });
        return l.join("\n");
    }
    R.trace13 = trace13; R.locRib42 = locRib;
    R.registrar("bgp-tres-as", function (raiz) {
        var res = bgp(F13.ases, F13.cp, F13.pares);
        var desenho = s("svg", { viewBox: "0 0 380 120", class: "sim-svg w-100", style: "max-height:150px", role: "img", "aria-label": "Fig. 13: AS1 cliente de AS2, AS2 cliente de AS3, AS1 e AS3 pares." }, s("title", null, "Fig. 13: uma Internet simples"), desenhaAS(F13));
        var qual = escolha("Roteador", F13.ases.map(function (a) { return [a, "as" + a.slice(2) + "> show bgp ipv6"]; }), false);
        var org = escolha("Origem", F13.ases.map(function (a) { return [a, "h" + a.slice(2)]; }), false), dst = escolha("Destino", F13.ases.map(function (a) { return [a, "h" + a.slice(2)]; }), false);
        dst.value = "AS3";
        var rib = el("pre", { class: "log small mb-1", "aria-live": "polite" }), tr = el("pre", { class: "log small mb-1", "aria-live": "polite" });
        function mostra() {
            rib.textContent = locRib(res, qual.value, function (d) { return "2001:cafe:" + d.slice(2) + "::/48"; });
            tr.textContent = org.value === dst.value ? "(escolha dois hosts diferentes)" : "mininet> h" + org.value.slice(2) + " traceroute6 -n " + F13_HOST[dst.value][1] + "\n" + trace13(res, org.value, dst.value).join("\n");
        }
        [qual, org, dst].forEach(function (x) { x.addEventListener("change", mostra); });
        var P1 = campo("LocPrf da rota de as1 aprendida de as3"), P2 = campo("Caminho de AS3 até AS1"), P3 = campo("Salto 2 de h1 para h3");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "bgp-tres-as", 15, "eBGP com três domínios");
        raiz.append(desenho, u.campo("Loc-RIB", qual), rib,
            el("p", { class: "small text-muted" }, "No livro, a coluna Next Hop traz o link-local do vizinho (por exemplo, fe80::3c81:2eff:fe19:465d para as3 em as1); aqui aparece o nome do roteador."),
            el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("traceroute6 de", org)), el("div", { class: "col-6" }, u.campo("para", dst))), tr,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Em as1, que LocPrf tem a rota para 2001:cafe:2::/48 aprendida de as3?", P1),
            linhaPergunta("Que caminho AS3 usa até AS1? (escreva como AS3-…-AS1)", P2),
            linhaPergunta("No traceroute6 de h1 para h3, que endereço aparece no salto 2?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 150 && caminhoDigitado(P2.value) === "AS3-AS2-AS1" && limpa(P3.value) === "2001:cafe:2:23::3";
                u.marca(fb, ok, ok ? "Isso: rotas de pares valem 150 e de provedores 100; AS3 prefere a rota do cliente AS2 (200); e as3 responde pela interface do enlace com AS2, por onde ele volta até h1." : "Ainda não. Compare as Loc-RIB de as1 e de as3.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ================= Atividade 5: a dinâmica do BGP ================= */
    var UPD = [["Marker", 16, "ff × 16"], ["Length", 2, "92"], ["Type", 1, "2 (UPDATE)"], ["Withdrawn Routes Length", 2, "0"], ["Total Path Attribute Length", 2, "69"],
        ["MP_REACH_NLRI: flags, tipo e tamanho (estendido)", 4, "0x90, 14, 44"], ["  AFI, SAFI e tamanho do next hop", 4, "IPv6 (2), unicast (1), 32"],
        ["  Next hop: global + link-local", 32, "2001:cafe:1:12::2 e fe80::…"], ["  SNPA", 1, "0"], ["  NLRI: tamanho do prefixo + prefixo", 7, "48, 2001:cafe:2::"],
        ["ORIGIN: flags, tipo, tamanho e valor", 4, "IGP"], ["AS_PATH: flags, tipo e tamanho (estendido)", 4, "0x50, 2, 6"], ["  segmento: tipo, tamanho e um AS de 4 bytes", 6, "AS_SEQUENCE, 1, 2"],
        ["MULTI_EXIT_DISC: flags, tipo, tamanho e valor", 7, "0"]];
    R.updBytes42 = UPD.reduce(function (t, x) { return t + x[1]; }, 0);
    R.registrar("bgp-dinamica", function (raiz) {
        var desligada = false, acao = null, cheio = bgp(F13.ases, F13.cp, F13.pares), sem23 = bgp(F13.ases, F13.cp, F13.pares, [["AS2", "AS3"]]);
        var saida = el("pre", { class: "log small mb-1", "aria-live": "polite" }), msgs = el("ul", { class: "small mb-1" });
        function mostra() {
            var agora = desligada ? sem23 : cheio;
            saida.textContent = "as2# show bgp summary\nNeighbor          V  AS  Up/Down  State/PfxRcd\n2001:cafe:1:12::1 4   1  00:08:02 1\n2001:cafe:2:23::3 4   3  00:00:10 " + (desligada ? "Idle (Admin)" : "1") + "\n\nmininet> ping6all\n" + ping6all(F13.ases, agora);
            var m = acao === null ? ["use os botões acima"] : mensagens(F13.ases, desligada ? cheio : sem23, agora);
            msgs.replaceChildren.apply(msgs, (m.length ? m : ["nenhuma"]).map(function (x) { return el("li", { class: "mono" }, x); }));
        }
        var hold = el("input", { type: "number", min: 3, max: 600, value: 180, class: "form-control form-control-sm", "aria-label": "Hold Time" }), ka = el("p", { class: "small mb-0", "aria-live": "polite" });
        function mostraHold() { var h = Math.max(3, Number(hold.value) || 3); ka.textContent = "KEEPALIVE a cada " + Math.floor(h / 3) + " s (um terço do Hold Time); sem nenhuma mensagem por " + h + " s, a sessão cai."; }
        hold.addEventListener("input", mostraHold);
        var P1 = campo("Tamanho do UPDATE"), P2 = campo("Intervalo de KEEPALIVE"), P3 = escolha("Hosts sem comunicação", [["23", "h2 e h3"], ["12", "h1 e h2"], ["13", "h1 e h3"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "bgp-dinamica", 15, "A dinâmica do BGP");
        raiz.append(el("p", { class: "small fw-semibold mb-1" }, "O UPDATE de AS2 para AS1 (pág. 378 do PDF), campo a campo:"),
            tabela(["Campo", "Bytes", "Valor"], UPD.map(function (x) { return el("tr", null, el("td", null, x[0]), el("td", null, String(x[1])), el("td", { class: "mono" }, x[2])); })),
            el("p", { class: "small" }, "Total: " + R.updBytes42 + " bytes, o valor do campo Length."),
            u.campo("Hold Time negociado no OPEN (s)", hold), ka,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "A sessão entre AS2 e AS3"),
            el("div", { class: "d-flex flex-wrap gap-2 mb-2" },
                u.botao("neighbor 2001:cafe:2:23::3 shutdown", "btn-outline-danger btn-sm", function () { desligada = true; acao = "off"; mostra(); }),
                u.botao("no neighbor 2001:cafe:2:23::3 shutdown", "btn-outline-success btn-sm", function () { desligada = false; acao = "on"; mostra(); })),
            saida, el("p", { class: "small mb-1" }, "UPDATEs que mudam alguma rota anunciada (estado final, sem os transitórios):"), msgs,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Quantos bytes tem esse UPDATE, contando o marcador?", P1),
            linhaPergunta("Com Hold Time de 180 s, de quantos em quantos segundos vão os KEEPALIVE?", P2),
            linhaPergunta("Com a sessão AS2–AS3 desligada, que hosts deixam de se comunicar?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 92 && Number(P2.value) === 60 && P3.value === "23";
                u.marca(fb, ok, ok ? "Isso: 92 bytes; 180 / 3 = 60 s, como mostra o show bgp neighbors; e AS1 não repassa rotas entre o provedor AS2 e o par AS3." : "Ainda não. Some a coluna de bytes e teste o shutdown.");
                if (ok) concluir();
            }), fb);
        mostra(); mostraHold();
    });

    /* ================= Atividade 6: os exercícios 4.16.4 ================= */
    var EX = {
        q1: { id: "q1", nome: "Q1: ebgp-bug.py (pág. 381–382)", ases: ["AS1", "AS2", "AS3", "AS4", "AS5"],
            cp: [["AS2", "AS1"], ["AS3", "AS1"], ["AS5", "AS1"], ["AS3", "AS4"]], pares: [["AS2", "AS3"], ["AS2", "AS4"], ["AS4", "AS5"]],
            pos: { AS1: [260, 30], AS2: [110, 100], AS3: [260, 100], AS5: [410, 100], AS4: [260, 165] }, arcos: {} },
        q2: { id: "q2", nome: "Q2: a variante com AS2–AS5 (pág. 382–383)", ases: ["AS1", "AS2", "AS3", "AS4", "AS5"],
            cp: [["AS2", "AS1"], ["AS3", "AS1"], ["AS5", "AS1"], ["AS4", "AS3"]], pares: [["AS2", "AS3"], ["AS2", "AS4"], ["AS4", "AS5"], ["AS2", "AS5"]],
            pos: { AS1: [260, 30], AS2: [110, 100], AS3: [260, 100], AS5: [410, 100], AS4: [260, 165] }, arcos: { "AS2-AS5": [260, 290] } },
        f14: { id: "f14", nome: "Q3: Fig. 14 (pág. 383)", ases: ["AS1", "AS2", "AS3", "AS4", "AS5", "AS6", "AS7", "AS8", "AS9"],
            cp: [["AS4", "AS5"], ["AS5", "AS7"], ["AS9", "AS7"], ["AS3", "AS4"], ["AS5", "AS6"], ["AS9", "AS1"], ["AS2", "AS3"], ["AS1", "AS8"]], pares: [["AS3", "AS6"], ["AS6", "AS8"], ["AS6", "AS7"]],
            pos: { AS2: [37, 130], AS3: [148, 130], AS4: [148, 40], AS5: [260, 40], AS6: [260, 130], AS7: [371, 40], AS8: [371, 130], AS9: [483, 40], AS1: [483, 130] }, arcos: {} },
        f15: { id: "f15", nome: "Q4: Fig. 15 (pág. 383)", ases: ["AS1", "AS2", "AS3", "AS4", "AS5", "AS6", "AS7", "AS8"],
            cp: [["AS4", "AS5"], ["AS7", "AS5"], ["AS3", "AS4"], ["AS5", "AS6"], ["AS2", "AS3"], ["AS1", "AS8"]], pares: [["AS3", "AS6"], ["AS6", "AS8"], ["AS7", "AS8"]],
            pos: { AS4: [148, 40], AS5: [260, 40], AS7: [371, 40], AS2: [37, 130], AS3: [148, 130], AS6: [260, 130], AS8: [371, 130], AS1: [483, 130] }, arcos: {} },
        f16: { id: "f16", nome: "Q5: Fig. 16, ebgp-bug-3.py (pág. 383–384)", ases: ["AS1", "AS2", "AS3", "AS4", "AS5", "AS6", "AS7", "AS8"],
            cp: [["AS1", "AS3"], ["AS3", "AS4"], ["AS4", "AS7"], ["AS7", "AS8"], ["AS2", "AS1"], ["AS2", "AS5"], ["AS7", "AS6"]], pares: [["AS3", "AS2"], ["AS4", "AS5"], ["AS5", "AS6"], ["AS6", "AS8"]],
            pos: { AS3: [148, 40], AS4: [260, 40], AS7: [371, 40], AS8: [483, 40], AS1: [37, 130], AS2: [148, 130], AS5: [260, 130], AS6: [371, 130] }, arcos: {} }
    };
    R.ex42 = EX;
    R.registrar("bgp-exercicios", function (raiz) {
        var top = escolha("Topologia", Object.keys(EX).map(function (k) { return [k, EX[k].nome]; }), false);
        var desenho = s("svg", { class: "sim-svg w-100", style: "max-height:230px", role: "img", "aria-label": "A topologia escolhida; a seta $ vai do cliente para o provedor, e = marca um par." });
        var falha = el("select", { class: "form-select form-select-sm", "aria-label": "Enlace em falha" });
        var mudaL = el("select", { class: "form-select form-select-sm", "aria-label": "Enlace com política nova" }), mudaT = escolha("Política nova", [["ab", "1º cliente do 2º"], ["ba", "2º cliente do 1º"], ["par", "par"]], false);
        var ribAS = el("select", { class: "form-select form-select-sm", "aria-label": "Loc-RIB de" }), ribP = el("select", { class: "form-select form-select-sm", "aria-label": "para o prefixo" });
        var ping = el("pre", { class: "log small mb-1", "aria-live": "polite" }), rib = el("pre", { class: "log small mb-1" }), msgs = el("ul", { class: "small mb-1" });
        var aviso = el("p", { class: "small text-danger mb-0" }), estado = null;
        function opcoes(sel, lista) { sel.replaceChildren.apply(sel, lista.map(function (o) { return el("option", { value: o[0] }, o[1]); })); }
        function ligacoes(c) { return c.cp.concat(c.pares).map(function (l) { return l.slice().sort().join("-"); }); }
        function trocaTop() {
            var c = EX[top.value], lig = ligacoes(c);
            opcoes(falha, [["", "nenhum"]].concat(lig.map(function (l) { return [l, l.replace("-", "–")]; })));
            opcoes(mudaL, [["", "nenhum"]].concat(lig.map(function (l) { return [l, l.replace("-", "–")]; })));
            opcoes(ribAS, c.ases.map(function (a) { return [a, a]; }));
            opcoes(ribP, c.ases.map(function (a) { return [a, "p" + a.slice(2)]; }));
            var maxX = Math.max.apply(null, Object.keys(c.pos).map(function (k) { return c.pos[k][0]; })) + 40;
            desenho.setAttribute("viewBox", "0 0 " + maxX + " " + (top.value === "q1" || top.value === "q2" ? 215 : 165));
            mostra();
        }
        function mostra() {
            var c = EX[top.value], cp = c.cp, pares = c.pares, extra = null;
            if (mudaL.value) {
                var ab = mudaL.value.split("-");
                cp = cp.filter(function (l) { return l.slice().sort().join("-") !== mudaL.value; });
                pares = pares.filter(function (l) { return l.slice().sort().join("-") !== mudaL.value; });
                if (mudaT.value === "ab") cp = cp.concat([[ab[0], ab[1]]]); else if (mudaT.value === "ba") cp = cp.concat([[ab[1], ab[0]]]); else pares = pares.concat([ab]);
                extra = { cp: cp, pares: pares };
            }
            var fora = falha.value ? [falha.value.split("-")] : [];
            var base = bgp(c.ases, cp, pares), res = bgp(c.ases, cp, pares, fora);
            estado = { top: top.value, res: res, muda: mudaL.value, completo: c.ases.every(function (a) { return c.ases.every(function (b) { return a === b || alcanca(res, a, b); }); }) };
            aviso.textContent = res.convergiu ? "" : "Atenção: com essas políticas, o BGP não converge (as rotas oscilam).";
            desenho.replaceChildren(s("title", null, c.nome), desenhaAS(c, extra, fora[0]));
            ping.textContent = "mininet> ping6all\n" + ping6all(c.ases, res);
            var d = ribP.value || c.ases[0], a = ribAS.value || c.ases[0], rotas = res.rec[a][d] || {}, m = res.melhor[a][d];
            rib.textContent = a === d ? a + " origina p" + d.slice(2) + "." : "Loc-RIB de " + a + " para p" + d.slice(2) + ":\n" + (Object.keys(rotas).length ? Object.keys(rotas).sort().map(function (v) {
                var r = rotas[v]; return (m && m.cam.join() === r.cam.join() ? "*> " : "*  ") + "via " + v + " (" + r.r + ", LocPrf " + LP[r.r] + ")  AS-path " + r.cam.slice(1).map(function (x) { return x.slice(2); }).join(" ");
            }).join("\n") : "nenhuma rota") + (m ? "\nCaminho dos pacotes: " + m.cam.join(" → ") : "");
            var lm = fora.length ? mensagens(c.ases, base, res) : [];
            msgs.replaceChildren.apply(msgs, (fora.length ? (lm.length ? lm : ["nenhum UPDATE: nenhuma rota anunciada muda"]) : ["escolha um enlace em falha para ver os UPDATEs"]).map(function (x) { return el("li", { class: "mono" }, x); }));
        }
        top.addEventListener("change", trocaTop);
        [falha, mudaL, mudaT, ribAS, ribP].forEach(function (x) { x.addEventListener("change", mostra); });
        var P1 = campo("Melhor caminho de AS6 até p9 na Fig. 14"), P2 = campo("Caminho de AS2 até AS7 na Fig. 16");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "bgp-exercicios", 25, "Os exercícios de BGP");
        raiz.append(u.campo("Topologia", top), desenho,
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-4" }, u.campo("Enlace em falha", falha)), el("div", { class: "col-sm-4" }, u.campo("Mudar a política do enlace", mudaL)), el("div", { class: "col-sm-4" }, u.campo("para", mudaT))),
            aviso, ping,
            el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Loc-RIB de", ribAS)), el("div", { class: "col-6" }, u.campo("para o prefixo", ribP))), rib,
            el("p", { class: "small mb-1" }, "UPDATEs depois da falha (estado final, sem os transitórios; a sessão do enlace que caiu não manda nada):"), msgs,
            el("p", { class: "small text-muted" }, "Empates de LocPrf e de tamanho do AS-path são desfeitos aqui pelo menor número de AS; um roteador real usaria outros critérios, como a idade da rota ou o router ID."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (25 pts)"),
            el("p", { class: "small mb-1" }, "Na Q1, mude a política de um único enlace para que todos os hosts se alcancem (deixe a Q1 e a mudança selecionadas, sem falha, ao conferir)."),
            linhaPergunta("Na Fig. 14, qual é o melhor caminho de AS6 até p9? (escreva como AS6-…-AS9)", P1),
            linhaPergunta("Na Fig. 16, que caminho seguem os pacotes de AS2 até AS7?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var a = estado && estado.top === "q1" && estado.muda && !falha.value && estado.completo;
                var b = caminhoDigitado(P1.value) === "AS6-AS7-AS9", c = caminhoDigitado(P2.value) === "AS2-AS5-AS6-AS7";
                var ok = a && b && c;
                u.marca(fb, ok, ok ? "Isso: AS4 precisava de um cliente ou de um provedor no caminho até AS1; na Fig. 14, a rota do par AS7 é a mais curta das duas de mesmo LocPrf; e, na Fig. 16, AS2 escolhe AS5 (caminho de 4 domínios) e não AS1 (5)." : "Ainda falta: " + [a ? "" : "a mudança na Q1", b ? "" : "o caminho na Fig. 14", c ? "" : "o caminho na Fig. 16"].filter(Boolean).join(", ") + ".");
                if (ok) concluir();
            }), fb);
        trocaTop();
    });
}());
