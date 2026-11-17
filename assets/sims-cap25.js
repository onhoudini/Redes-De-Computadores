/* Simulações do Capítulo 25 — Roteamento interdomínio: BGP (seção 3.17 do livro).
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

    /* ------------------------------------------------------------------
     * 1. RIP: contagem ao infinito limitada a 16 (pág. 237–238 do PDF)
     * ------------------------------------------------------------------ */
    function contagemRip(poison) {
        var a = 2, b = 16, h = [[a, b]];
        for (var i = 0; i < 20; i++) {
            b = Math.min(16, (poison ? 16 : a) + 1);
            a = Math.min(16, b + 1);
            h.push([a, b]);
            if (a === 16 && b === 16) break;
        }
        return h;
    }
    R.contagemRip = contagemRip;


    /* ------------------------------------------------------------------
     * 3. Relações entre domínios e regras de exportação (Fig. 67, pág. 244–245 do PDF)
     * ------------------------------------------------------------------ */
    var PROVEDORES = { AS3: ["AS1"], AS4: ["AS1", "AS2"], AS7: ["AS4"] };
    var PARES = [["AS1", "AS2"], ["AS3", "AS4"]];
    var ASES = ["AS1", "AS2", "AS3", "AS4", "AS7"];
    var PESO = { origem: 3, cliente: 2, par: 1, provedor: 0 };
    function relacao(de, para) {
        if ((PROVEDORES[de] || []).indexOf(para) >= 0) return "cliente";
        if ((PROVEDORES[para] || []).indexOf(de) >= 0) return "provedor";
        if (PARES.some(function (p) { return (p[0] === de && p[1] === para) || (p[1] === de && p[0] === para); })) return "par";
        return null;
    }
    function propaga(origem) {
        var rota = {}; rota[origem] = { caminho: [origem], de: "origem" };
        var mudou = true;
        while (mudou) {
            mudou = false;
            Object.keys(rota).forEach(function (de) {
                var r = rota[de];
                ASES.forEach(function (para) {
                    var rel = relacao(de, para);
                    if (!rel || r.caminho.indexOf(para) >= 0) return;
                    if ((rel === "cliente" || rel === "par") && r.de !== "origem" && r.de !== "cliente") return;
                    var novo = { caminho: [para].concat(r.caminho), de: rel }, at = rota[para];
                    if (!at || PESO[rel] > PESO[at.de] || (PESO[rel] === PESO[at.de] && novo.caminho.length < at.caminho.length)) { rota[para] = novo; mudou = true; }
                });
            });
        }
        return rota;
    }
    R.propagaBgp = propaga;

    R.registrar("politicas-exportacao", function (raiz) {
        var origem = el("select", { class: "form-select form-select-sm" }, opcoes(ASES.map(function (a) { return [a, a]; })));
        origem.value = "AS3";
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        var DE = { origem: "é a origem", cliente: "de um cliente", par: "de um par", provedor: "de um provedor" };
        function desenha() {
            var r = propaga(origem.value);
            area.replaceChildren(tabela(["AS", "Caminho escolhido", "Aprendida"], ASES.map(function (a) { return { celulas: [a, r[a] ? r[a].caminho.join(" ") : "sem rota", r[a] ? DE[r[a].de] : "—"] }; })));
        }
        origem.addEventListener("change", desenha);
        var CAM = [["", "escolha…"], ["AS2 AS1 AS3", "AS2 AS1 AS3"], ["AS2 AS4 AS3", "AS2 AS4 AS3"], ["AS7 AS4 AS3", "AS7 AS4 AS3"], ["AS7 AS4 AS1 AS3", "AS7 AS4 AS1 AS3"], ["sem rota", "sem rota"]];
        var s2 = el("select", { class: "form-select form-select-sm", "aria-label": "Caminho de AS2" }, opcoes(CAM));
        var s7 = el("select", { class: "form-select form-select-sm", "aria-label": "Caminho de AS7" }, opcoes(CAM));
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "politicas-exportacao", 15, "Prever caminhos com as regras de exportação");
        raiz.append(el("p", { class: "small mb-2" }, "A rede da Fig. 67 do livro. Clientes: AS3 de AS1; AS4 de AS1 e de AS2; AS7 de AS4. Pares de custo compartilhado: AS1–AS2 e AS3–AS4. Regra: para provedores e pares só se exportam as rotas próprias e as de clientes; para clientes, todas. Preferência: cliente > par > provedor."),
            u.campo("AS que anuncia o prefixo", origem), area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): para um prefixo de AS3, que caminho escolhem AS2 e AS7? (responda antes de olhar a tabela)"),
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-6" }, u.campo("AS2", s2)), el("div", { class: "col-sm-6" }, u.campo("AS7", s7))),
            u.botao("Conferir", "btn-primary", function () {
                var ok = s2.value === "AS2 AS1 AS3" && s7.value === "AS7 AS4 AS3";
                u.marca(fb, ok, ok ? "Isso. AS4 aprende a rota do par AS3 mas não a repassa ao provedor AS2; AS2 a recebe do par AS1, que a aprendeu do cliente AS3. Já AS7, cliente de AS4, recebe tudo o que AS4 usa." : "Ainda não. Lembre: rotas aprendidas de um par não vão para provedores.");
                if (ok) concluir();
            }), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 4. Mensagens UPDATE e WITHDRAW (Fig. 72, pág. 251–252 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("bgp-updates", function (raiz) {
        var rib, sessoes, log = el("ul", { class: "log mt-2" }), ribs = el("div", { class: "mt-2" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "bgp-updates", 15, "Acompanhar UPDATEs, WITHDRAWs e a detecção de laços do BGP");
        function reinicia() {
            rib = { R1: { "2001:db8:1234::/48": "local" }, R2: { "2001:db8:5678::/48": "local" }, R3: { "2001:db8:abcd::/48": "local" } };
            sessoes = {}; vistos = {}; log.replaceChildren(); fb.textContent = ""; desenha();
        }
        function msg(t, classe) { log.append(el("li", { class: classe || null }, t)); }
        function desenha() {
            ribs.replaceChildren(el("div", { class: "row g-2" }, ["R1", "R2", "R3"].map(function (r) {
                return el("div", { class: "col-md-4" }, el("div", { class: "small fw-semibold" }, r + " (AS" + { R1: 10, R2: 20, R3: 30 }[r] + ")"),
                    el("ul", { class: "small mono mb-0" }, Object.keys(rib[r]).map(function (p) { return el("li", null, p + " ← " + rib[r][p]); })));
            })));
        }
        function sessao12() {
            if (sessoes.s12) return;
            sessoes.s12 = true;
            msg("R1 → R2: U(2001:db8:1234::/48, nexthop 2001:db8::4, AS10)");
            msg("R2 → R1: U(2001:db8:5678::/48, nexthop 2001:db8::5, AS20)");
            rib.R2["2001:db8:1234::/48"] = "via 2001:db8::4, AS10";
            rib.R1["2001:db8:5678::/48"] = "via 2001:db8::5, AS20";
            if (sessoes.s23) { msg("R2 → R1: U(2001:db8:abcd::/48, nexthop 2001:db8::5, AS20 AS30)"); rib.R1["2001:db8:abcd::/48"] = "via 2001:db8::5, AS20 AS30"; msg("R2 → R3: U(2001:db8:1234::/48, nexthop 2001:db8::0, AS20 AS10)"); rib.R3["2001:db8:1234::/48"] = "via 2001:db8::0, AS20 AS10"; }
            desenha();
        }
        function sessao23() {
            if (sessoes.s23 || sessoes.caiu) return;
            sessoes.s23 = true;
            msg("R3 → R2: U(2001:db8:abcd::/48, nexthop 2001:db8::1, AS30)");
            rib.R2["2001:db8:abcd::/48"] = "via 2001:db8::1, AS30";
            msg("R2 → R3: U(2001:db8:5678::/48, nexthop 2001:db8::0, AS20)");
            rib.R3["2001:db8:5678::/48"] = "via 2001:db8::0, AS20";
            if (sessoes.s12) {
                msg("R2 → R3: U(2001:db8:1234::/48, nexthop 2001:db8::0, AS20 AS10)  (R2 troca o nexthop e acrescenta o seu AS)");
                rib.R3["2001:db8:1234::/48"] = "via 2001:db8::0, AS20 AS10";
                msg("R2 → R1: U(2001:db8:abcd::/48, nexthop 2001:db8::5, AS20 AS30)");
                rib.R1["2001:db8:abcd::/48"] = "via 2001:db8::5, AS20 AS30";
            }
            desenha();
        }
        function laco() {
            if (!sessoes.s23 || !rib.R3["2001:db8:1234::/48"]) { u.marca(fb, false, "Primeiro abra as duas sessões, para R3 conhecer a rota de 2001:db8:1234::/48."); return; }
            msg("R3 → R2: U(2001:db8:1234::/48, nexthop 2001:db8::1, AS30 AS20 AS10)");
            msg("R2: AS20 já está no AS-Path → o filtro de importação descarta a rota (seria um laço)", "text-danger");
            vistos.laco = true; checa();
        }
        function cai() {
            if (!sessoes.s23) { u.marca(fb, false, "A sessão R2–R3 ainda não foi aberta."); return; }
            sessoes.s23 = false; sessoes.caiu = true;
            msg("R2 e R3 param de receber KEEPALIVE: a sessão cai depois de 90 s", "text-danger");
            delete rib.R2["2001:db8:abcd::/48"]; delete rib.R3["2001:db8:1234::/48"]; delete rib.R3["2001:db8:5678::/48"];
            if (sessoes.s12) { msg("R2 → R1: W(2001:db8:abcd::/48)"); delete rib.R1["2001:db8:abcd::/48"]; vistos.withdraw = true; }
            desenha(); checa();
        }
        function checa() {
            if (vistos.laco && vistos.withdraw) { u.marca(fb, true, "Você viu a detecção de laço pelo AS-Path e o WITHDRAW que avisa R1 de que 2001:db8:abcd::/48 ficou inalcançável."); concluir(); }
            else if (vistos.laco) { fb.className = "small mt-2 mb-0"; fb.textContent = "✔ Laço detectado. Agora derrube o enlace R2–R3 (com a sessão R1–R2 aberta)."; }
            else if (vistos.withdraw) { fb.className = "small mt-2 mb-0"; fb.textContent = "✔ WITHDRAW enviado. Recomece e teste a detecção de laço antes de derrubar o enlace."; }
        }
        raiz.append(el("p", { class: "small mb-2" }, "Três roteadores da Fig. 72: R1 (AS10) anuncia 2001:db8:1234::/48, R2 (AS20) 2001:db8:5678::/48 e R3 (AS30) 2001:db8:abcd::/48. Enlaces: R1–R2 em 2001:db8::4/127 e R2–R3 em 2001:db8::0/127."),
            el("div", { class: "d-flex flex-wrap gap-2" },
                u.botao("Abrir a sessão R1–R2", "btn-outline-primary", sessao12),
                u.botao("Abrir a sessão R2–R3", "btn-outline-primary", sessao23),
                u.botao("R3 devolve a R2 a rota de 1234", "btn-outline-secondary", laco),
                u.botao("O enlace R2–R3 cai", "btn-outline-danger", cai),
                u.botao("Recomeçar", "btn-outline-secondary", reinicia)),
            log, ribs, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): abra as sessões, teste a detecção de laço e derrube o enlace R2–R3."));
        reinicia();
    });

    /* ------------------------------------------------------------------
     * 5. O processo de decisão do BGP (Fig. 73, pág. 252–253 do PDF)
     * ------------------------------------------------------------------ */
    var CRITERIOS = [["maior local-pref", function (r) { return -r.lp; }], ["AS-Path mais curto", function (r) { return r.asp; }], ["menor MED", function (r) { return r.med; }],
        ["eBGP antes de iBGP", function (r) { return r.ebgp ? 0 : 1; }], ["menor custo IGP até o nexthop", function (r) { return r.igp; }], ["menor identificador do roteador", function (r) { return r.id; }]];
    function decide(rotas) {
        var c = rotas.slice(), passos = [];
        for (var i = 0; i < CRITERIOS.length; i++) {
            var f = CRITERIOS[i][1], m = Math.min.apply(null, c.map(f));
            var resto = c.filter(function (r) { return f(r) === m; });
            if (resto.length < c.length) passos.push(CRITERIOS[i][0] + ": fica " + resto.map(function (r) { return r.via; }).join(", "));
            c = resto;
            if (c.length === 1) return { vence: c[0], criterio: CRITERIOS[i][0], passos: passos };
        }
        return { vence: c[0], criterio: "empate", passos: passos };
    }
    R.decideBgp = decide;

    R.registrar("decisao-bgp", function (raiz) {
        var rotas = [{ via: "RA (enlace reserva)", lp: 100, asp: 1, med: 0, ebgp: true, igp: 0, id: 1 }, { via: "RB (enlace principal)", lp: 100, asp: 1, med: 0, ebgp: true, igp: 0, id: 2 }];
        var CAMPOS = [["lp", "local-pref"], ["asp", "tamanho do AS-Path"], ["med", "MED"], ["igp", "custo IGP"]];
        var entradas = el("div", { class: "row g-2" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "decisao-bgp", 15, "Fazer o enlace principal vencer com o local-pref");
        rotas.forEach(function (r) {
            entradas.append(el("div", { class: "col-md-6" }, el("div", { class: "fw-semibold small mb-1" }, "Rota via " + r.via + " (identificador " + r.id + ")"),
                CAMPOS.map(function (c) {
                    var inp = el("input", { type: "number", class: "form-control form-control-sm", value: r[c[0]], min: 0 });
                    inp.addEventListener("input", function () { r[c[0]] = Number(inp.value) || 0; mostra(); });
                    return u.campo(c[1], inp);
                })));
        });
        function mostra() {
            var d = decide(rotas);
            saida.replaceChildren(el("div", null, "Vence: ", el("strong", null, d.vence.via), " — decidido por ", el("strong", null, d.criterio), "."),
                el("ul", { class: "mb-0" }, d.passos.map(function (p) { return el("li", null, p); })));
            if (d.vence.via.indexOf("RB") === 0 && d.criterio === "maior local-pref") { u.marca(fb, true, "Isso: com o local-pref maior, RB vence já no primeiro critério, e o enlace reserva só é usado se o principal cair."); concluir(); }
            else fb.textContent = "";
        }
        raiz.append(el("p", { class: "small mb-2" }, "AS1 recebe de AS2 as mesmas rotas pelos dois enlaces da Fig. 73. Os critérios são aplicados em ordem até sobrar uma rota."),
            entradas, saida, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça a rota via RB vencer pelo local-pref, como o filtro de importação do livro (pág. 252 do PDF)."));
        mostra();
    });

    /* ------------------------------------------------------------------
     * 6. Disagree: a ordem das mensagens decide (Fig. 76, pág. 254–255 do PDF)
     * ------------------------------------------------------------------ */
    function disagree(ordem) {
        var e = [["AS1", "AS1"]];
        if (ordem === "AS3") e.push(["AS1", "AS3"]);
        else if (ordem === "AS4") e.push(["AS4", "AS1"]);
        else for (var i = 0; i < 3; i++) e.push(["AS4", "AS3"], ["AS1", "AS1"]);
        return e;
    }
    R.disagree = disagree;

    R.registrar("disagree", function (raiz) {
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "disagree", 10, "Ver que o resultado do BGP depende da ordem das mensagens");
        function roda(ordem) {
            var e = disagree(ordem);
            area.replaceChildren(tabela(["Passo", "AS3 usa a rota de", "AS4 usa a rota de"], e.map(function (x, i) { return { celulas: [String(i), x[0], x[1]], classe: i === e.length - 1 && ordem !== "simultaneo" ? "table-success" : null }; })));
            if (ordem === "AS3") { vistos.a = true; u.marca(fb, true, "Estável: AS4 usa a rota via AS3 e não anuncia nada a AS3, que fica com a direta."); }
            else if (ordem === "AS4") { vistos.b = true; u.marca(fb, true, "Estável, mas outro: AS3 usa a rota via AS4, e AS4 fica com a direta."); }
            else u.marca(fb, false, "Ao mesmo tempo: cada um passa a preferir a rota do outro, os dois retiram os anúncios, voltam às rotas diretas… Na prática, um acaba mais rápido e o BGP converge.");
            if (vistos.a && vistos.b && ordem !== "simultaneo") { concluir(); fb.textContent += " Dois estados estáveis diferentes, para a mesma configuração."; }
        }
        raiz.append(el("p", { class: "small mb-2" }, "AS1 anuncia o prefixo a AS3 e a AS4. AS3 prefere a rota via AS4, e AS4 prefere a rota via AS3 (por exemplo, por serem mais baratas)."),
            el("div", { class: "d-flex flex-wrap gap-2" },
                u.botao("AS3 anuncia primeiro", "btn-outline-primary", function () { roda("AS3"); }),
                u.botao("AS4 anuncia primeiro", "btn-outline-primary", function () { roda("AS4"); }),
                u.botao("Os dois ao mesmo tempo", "btn-outline-danger", function () { roda("simultaneo"); })),
            area, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): encontre os dois estados estáveis."));
    });
}());
