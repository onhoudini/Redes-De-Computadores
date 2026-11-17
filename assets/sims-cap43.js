/* Simulações do Capítulo 43 — Prática: Spanning Tree e VLANs (seção 4.17 do livro, pág. 384–392 do PDF).
 * As redes são as das Figs. 17 a 22; os endereços da Atividade 4 são ilustrativos (prefixos de documentação). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, s = u.svg;

    function escolha(rotulo, lista, vazio) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            vazio === false ? null : el("option", { value: "" }, "escolha…"),
            lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    function opcoes(sel, lista) { sel.replaceChildren.apply(sel, lista.map(function (o) { return el("option", { value: o[0] }, o[1]); })); }
    function linhaPergunta(texto, controle) {
        return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, texto), el("div", { class: "col-sm-5" }, controle));
    }
    function campo(rotulo) { return el("input", { type: "text", class: "form-control form-control-sm mono", "aria-label": rotulo, autocomplete: "off", spellcheck: "false" }); }
    function tabela(cab, linhas, extra) {
        return el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-1 " + (extra || "") },
            el("thead", null, el("tr", null, cab.map(function (c) { return el("th", null, c); }))), el("tbody", null, linhas)));
    }
    function conjunto(t) { return String(t).toUpperCase().split(/[\s,;]+/).filter(Boolean).sort().join(","); }

    /* ---------- 802.1d: lans = {nome: [[switch, porta, custo], ...]}; o ID do switch é o número (menor vence) ---------- */
    function menor(a, b) { for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] < b[i]; } return false; }
    function stp(lans, falhas, ids) {
        falhas = falhas || []; ids = ids || {};
        function id(sw) { return sw in ids ? ids[sw] : sw; }
        var ativos = Object.keys(lans).filter(function (l) { return falhas.indexOf(l) < 0; });
        var sws = []; Object.keys(lans).forEach(function (l) { lans[l].forEach(function (x) { if (sws.indexOf(x[0]) < 0) sws.push(x[0]); }); });
        var vet = {}, rp = {};
        sws.forEach(function (w) { vet[w] = [id(w), 0, id(w)]; });
        for (var it = 0; it < 60; it++) {
            var novo = {};
            sws.forEach(function (w) {
                var melhor = [id(w), 0, id(w), 0, 0], porta = null;
                ativos.forEach(function (l) {
                    var minha = lans[l].filter(function (x) { return x[0] === w; })[0];
                    if (!minha) return;
                    lans[l].forEach(function (v) {
                        if (v[0] === w) return;
                        var c = [vet[v[0]][0], vet[v[0]][1] + minha[2], id(v[0]), v[1], minha[1]];
                        if (menor(c, melhor)) { melhor = c; porta = [l, minha[1]]; }
                    });
                });
                novo[w] = [melhor[0], melhor[1], id(w)]; rp[w] = porta;
            });
            var igual = sws.every(function (w) { return novo[w].join() === vet[w].join(); });
            vet = novo;
            if (igual) break;
        }
        var papeis = {};
        ativos.forEach(function (l) {
            var desig = lans[l].reduce(function (a, b) { return menor([vet[b[0]][0], vet[b[0]][1], id(b[0]), b[1]], [vet[a[0]][0], vet[a[0]][1], id(a[0]), a[1]]) ? b : a; });
            lans[l].forEach(function (x) {
                var k = x[0] + "." + x[1];
                if (rp[x[0]] && rp[x[0]][0] === l && rp[x[0]][1] === x[1] && vet[x[0]][0] !== id(x[0])) papeis[k] = "raiz";
                else if (x[0] === desig[0] && x[1] === desig[1]) papeis[k] = "designada";
                else papeis[k] = "bloqueada";
            });
        });
        return { vet: vet, rp: rp, papeis: papeis, ativos: ativos };
    }
    function p2p(enlaces) {
        var cont = {}, lans = {};
        enlaces.forEach(function (e) { cont[e[0]] = (cont[e[0]] || 0) + 1; cont[e[1]] = (cont[e[1]] || 0) + 1; lans[e[0] + "-" + e[1]] = [[e[0], cont[e[0]], 1], [e[1], cont[e[1]], 1]]; });
        return lans;
    }
    R.stp43 = stp; R.p2p43 = p2p;

    var REDES = {
        f1: { nome: "Fig. 1 (Fig. 17 do PDF, pág. 385)", lans: { A: [[3, 2, 1], [17, 1, 1], [6, 2, 1]], B: [[17, 2, 1], [10, 1, 1]], C: [[10, 2, 1], [11, 1, 1]], D: [[6, 3, 1], [11, 3, 1]], E: [[3, 1, 1], [12, 1, 1]], F: [[12, 2, 1], [6, 1, 1], [11, 2, 1]] },
            pos: { 3: [90, 85], 17: [300, 40], 10: [440, 40], 6: [260, 150], 11: [430, 150], 12: [150, 235] },
            barras: { A: [200, 30, 200, 120], B: [370, 20, 370, 60], C: [410, 95, 470, 95], D: [345, 130, 345, 170], E: [60, 160, 180, 160], F: [210, 200, 470, 200] }, alt: 270 },
        q3: { nome: "Q3: a rede da pág. 385", lans: p2p([[2, 9], [2, 10], [9, 5], [5, 10], [5, 4], [10, 4]]),
            pos: { 2: [220, 30], 9: [110, 115], 5: [220, 115], 10: [330, 115], 4: [220, 200] }, alt: 230 },
        f22: { nome: "Fig. 22 (pág. 387)", lans: { s3s7: [[3, 2, 1], [7, 1, 1]], s3s9: [[3, 1, 1], [9, 1, 1]], s6s4: [[6, 2, 1], [4, 1, 1]], s6s9: [[6, 1, 1], [9, 3, 1]], s7s4: [[7, 3, 1], [4, 2, 1]], s9s7: [[9, 2, 1], [7, 2, 1]] },
            pos: { 4: [220, 30], 6: [110, 115], 9: [220, 115], 7: [330, 115], 3: [220, 200] }, alt: 230 }
    };
    R.redes43 = REDES;
    function projeta(p, b) {
        var dx = b[2] - b[0], dy = b[3] - b[1], t = ((p[0] - b[0]) * dx + (p[1] - b[1]) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t)); return [b[0] + t * dx, b[1] + t * dy];
    }
    function desenhaRede(rede, res, falhas, prefixo, usados) {
        var g = s("g", { "font-size": 11, "text-anchor": "middle" }), nomeSw = function (w) { return (prefixo || "S") + w; };
        function marca(x, y, papel) {
            var t = papel === "raiz" ? "R" : papel === "designada" ? "D" : "×";
            g.append(s("circle", { cx: x, cy: y, r: 7, style: "fill: var(--bs-body-bg)", stroke: "currentColor", "stroke-width": 1 }), s("text", { x: x, y: y + 4, "font-weight": "bold", style: "fill: var(" + (papel === "bloqueada" ? "--bs-danger-text-emphasis" : "--bs-body-color") + ")" }, t));
        }
        Object.keys(rede.lans).forEach(function (l) {
            var m = rede.lans[l], caiu = falhas.indexOf(l) >= 0;
            if (rede.barras) {
                var b = rede.barras[l];
                g.append(s("line", { x1: b[0], y1: b[1], x2: b[2], y2: b[3], stroke: "currentColor", "stroke-width": 5, opacity: caiu ? 0.3 : 1 }), s("text", { x: b[2] + 9, y: b[3] + 4, "font-size": 10 }, caiu ? "×" : l));
                m.forEach(function (x) {
                    var p = rede.pos[x[0]], q = projeta(p, b), k = x[0] + "." + x[1], papel = res.papeis[k];
                    g.append(s("line", { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: "currentColor", "stroke-width": 1.5, "stroke-dasharray": papel === "bloqueada" || caiu ? "4 4" : null, opacity: caiu ? 0.3 : 1 }));
                    if (!caiu) { var f = 0.45; marca(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, papel); }
                });
            } else {
                var a = m[0], c = m[1], pa = rede.pos[a[0]], pc = rede.pos[c[0]];
                var bloq = !caiu && (res.papeis[a[0] + "." + a[1]] === "bloqueada" || res.papeis[c[0] + "." + c[1]] === "bloqueada");
                if (usados) bloq = usados.indexOf(l) < 0;
                g.append(s("line", { x1: pa[0], y1: pa[1], x2: pc[0], y2: pc[1], stroke: "currentColor", "stroke-width": bloq ? 1.5 : 3, "stroke-dasharray": bloq || caiu ? "5 5" : null, opacity: caiu ? 0.3 : (bloq ? 0.6 : 1) }));
                if (!caiu && !usados) [[a, pa, pc], [c, pc, pa]].forEach(function (z) { marca(z[1][0] + (z[2][0] - z[1][0]) * 0.3, z[1][1] + (z[2][1] - z[1][1]) * 0.3, res.papeis[z[0][0] + "." + z[0][1]]); });
            }
        });
        Object.keys(rede.pos).forEach(function (w) {
            var p = rede.pos[w], raiz = res && res.vet[w] && res.vet[w][0] === res.vet[w][2];
            g.append(s("rect", { class: "no", x: p[0] - 22, y: p[1] - 12, width: 44, height: 24, rx: 4, "stroke-width": raiz ? 3 : 1.5 }), s("text", { x: p[0], y: p[1] + 4, "font-weight": raiz ? "bold" : null }, nomeSw(w)));
        });
        return g;
    }

    /* ---------- Atividade 1: a árvore do 802.1d (Q1 e Q3) ---------- */
    R.registrar("stp-exercicio", function (raiz) {
        var top = escolha("Rede", [["f1", REDES.f1.nome], ["q3", REDES.q3.nome]], false);
        var desenho = s("svg", { class: "sim-svg w-100", style: "max-height:300px", role: "img", "aria-label": "A rede com o papel de cada porta: R raiz, D designada, × bloqueada." });
        var lista = el("div");
        function mostra() {
            var rede = REDES[top.value], res = stp(rede.lans);
            desenho.setAttribute("viewBox", "0 0 520 " + rede.alt);
            desenho.replaceChildren(s("title", null, rede.nome), desenhaRede(rede, res, []));
            var linhas = [];
            Object.keys(rede.pos).map(Number).sort(function (a, b) { return a - b; }).forEach(function (w) {
                Object.keys(res.papeis).filter(function (k) { return Number(k.split(".")[0]) === w; }).sort().forEach(function (k) {
                    var p = res.papeis[k];
                    linhas.push(el("tr", null, el("td", null, "S" + k), el("td", null, p), el("td", null, p === "bloqueada" ? "blocking" : "forwarding"), el("td", null, String(res.vet[w][1]))));
                });
            });
            lista.replaceChildren(tabela(["Porta", "Papel", "Estado", "Custo até a raiz"], linhas, "mono"));
        }
        top.addEventListener("change", mostra);
        var P1 = campo("Portas bloqueadas na Fig. 1"), P2 = escolha("Porta raiz de S5 na Q3", [["9", "a do enlace com S9"], ["10", "a do enlace com S10"], ["4", "a do enlace com S4"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "stp-exercicio", 20, "A árvore do 802.1d");
        raiz.append(u.campo("Rede", top), desenho, el("p", { class: "small text-muted mb-1" }, "R: porta raiz · D: porta designada · ×: porta bloqueada. A raiz tem a borda mais grossa. Todos os enlaces custam 1."), lista,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (20 pts)"),
            linhaPergunta("Na Fig. 1, que portas ficam bloqueadas? (por exemplo: S3.1, S6.2)", P1),
            linhaPergunta("Na Q3, S5 chega à raiz com custo 2 por S9 ou por S10. Qual porta vira a raiz?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = conjunto(P1.value) === conjunto("S11.1,S11.3,S12.2") && P2.value === "9";
                u.marca(fb, ok, ok ? "Isso: em C, S10 e S11 empatam no custo 2 e vence o menor ID (S10); em D e em F, S6 (custo 1) é o designado; e, para S5, o empate entre S9 e S10 se desfaz pelo ID do switch designado." : "Ainda não. Compare as tabelas das duas redes.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 2: as tabelas depois da falha (Q2) ---------- */
    function tabelaPortas(rede, falhas) {
        var res = stp(rede.lans, falhas), viz = {};
        res.ativos.forEach(function (l) {
            rede.lans[l].forEach(function (x) {
                if (res.papeis[x[0] + "." + x[1]] === "bloqueada") return;
                (viz["S" + x[0]] = viz["S" + x[0]] || []).push(["L" + l, x[1]]); (viz["L" + l] = viz["L" + l] || []).push(["S" + x[0], null]);
            });
        });
        var tab = {};
        Object.keys(rede.pos).forEach(function (w) {
            (viz["S" + w] || []).forEach(function (ini) {
                var vist = {}, fila = [ini[0]]; vist["S" + w] = vist[ini[0]] = true;
                while (fila.length) {
                    var n = fila.pop();
                    if (n[0] === "L") tab[w + "|" + n.slice(1)] = ini[1];
                    (viz[n] || []).forEach(function (x) { if (!vist[x[0]]) { vist[x[0]] = true; fila.push(x[0]); } });
                }
            });
        });
        return tab;
    }
    R.tabelaPortas43 = tabelaPortas;
    R.registrar("tabelas-pos-falha", function (raiz) {
        var rede = REDES.f1, falhou = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") });
        var qual = escolha("Switch", Object.keys(rede.pos).map(function (w) { return [w, "S" + w]; }), false); qual.value = "12";
        var desenho = s("svg", { viewBox: "0 0 520 270", class: "sim-svg w-100", style: "max-height:300px", role: "img", "aria-label": "A rede da Fig. 1, com ou sem a LAN E." });
        var saida = el("div", { "aria-live": "polite" });
        function mostra() {
            var f = falhou.checked ? ["E"] : [], res = stp(rede.lans, f), t0 = tabelaPortas(rede, []), t1 = tabelaPortas(rede, ["E"]), w = qual.value;
            desenho.replaceChildren(s("title", null, "Fig. 1"), desenhaRede(rede, res, f));
            saida.replaceChildren(tabela(["Estação na LAN", "Porta antes", "Porta depois da falha de E"], Object.keys(rede.lans).map(function (l) {
                var a = t0[w + "|" + l], b = t1[w + "|" + l], muda = a !== b;
                return el("tr", { class: muda ? "table-warning" : null }, el("td", null, l), el("td", null, a ? "S" + w + "." + a : "—"), el("td", null, b ? "S" + w + "." + b : "LAN fora do ar"));
            }), "mono"));
        }
        [falhou, qual].forEach(function (x) { x.addEventListener("change", mostra); });
        var P1 = campo("Porta de S12 para a LAN A"), P2 = escolha("Switch que muda outras entradas", Object.keys(rede.pos).map(function (w) { return [w, "S" + w]; }));
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "tabelas-pos-falha", 15, "As tabelas depois da falha");
        raiz.append(el("div", { class: "form-check" }, falhou, el("label", { class: "form-check-label small", for: falhou.id }, "A LAN entre S3 e S12 (E) falhou")), desenho,
            u.campo("Tabela de portas de", qual), saida,
            el("p", { class: "small text-muted" }, "Supõe uma estação ligada a cada LAN; a tabela diz por qual porta o switch alcança as estações de cada LAN."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Depois da falha, por qual porta S12 alcança as estações da LAN A? (por exemplo: S12.1)", P1),
            linhaPergunta("Fora apagar as entradas das estações da LAN E, que switch precisa trocar a porta de outras estações?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value.replace(/\s/g, "").toUpperCase() === "S12.2" && P2.value === "12";
                u.marca(fb, ok, ok ? "Isso: S12.2, antes bloqueada, vira a porta raiz de S12, e todas as estações passam a ser alcançadas por ela. Nos outros switches, só somem as entradas da LAN E." : "Ainda não. Marque a falha e veja as linhas destacadas de cada switch.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 3: backbone em malha e STP por VLAN (Q4 e Q8) ---------- */
    var BACK = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4], [10, 1], [10, 2], [11, 1], [11, 2], [12, 3], [12, 4], [17, 3], [17, 4]];
    var BACK_POS = { 10: [60, 30], 11: [460, 30], 1: [190, 110], 2: [330, 110], 3: [190, 210], 4: [330, 210], 12: [60, 290], 17: [460, 290] };
    function usadosArvore(raizSw) {
        var lans = p2p(BACK), ids = {}; ids[raizSw] = 0;
        var res = stp(lans, [], ids);
        return Object.keys(lans).filter(function (l) { return lans[l].every(function (x) { return res.papeis[x[0] + "." + x[1]] !== "bloqueada"; }); });
    }
    R.usados43 = usadosArvore;
    R.registrar("malha-stp", function (raiz) {
        var modo = escolha("Configuração", [["s1", "Switches, uma árvore com raiz S1"], ["s2", "Switches, uma árvore com raiz S2"], ["vlan", "Switches, STP por VLAN: VLAN 10 com raiz S1 e VLAN 20 com raiz S2"], ["ospf", "Roteadores com OSPF"]], false);
        var desenho = s("svg", { viewBox: "0 0 520 320", class: "sim-svg w-100", style: "max-height:320px", role: "img", "aria-label": "O backbone da Fig. 2: quatro switches em malha completa e quatro de acesso, cada um ligado a dois do núcleo." });
        var saida = el("p", { class: "small mb-1", "aria-live": "polite" });
        var lans = p2p(BACK);
        function mostra() {
            var usados = modo.value === "ospf" ? Object.keys(lans) : modo.value === "vlan" ? usadosArvore(1).concat(usadosArvore(2)).filter(function (x, i, v) { return v.indexOf(x) === i; }) : usadosArvore(modo.value === "s1" ? 1 : 2);
            desenho.replaceChildren(s("title", null, "Fig. 2: um backbone típico"), desenhaRede({ lans: lans, pos: BACK_POS }, { vet: {}, papeis: {} }, [], "S", usados));
            saida.textContent = usados.length + " dos " + BACK.length + " enlaces levam tráfego" + (modo.value === "ospf" ? " (com caminhos de mesmo custo usados em paralelo)." : modo.value === "vlan" ? ", somando as duas VLANs; cada VLAN, sozinha, usa 7." : "; os outros " + (BACK.length - usados.length) + " ficam bloqueados.");
        }
        modo.addEventListener("change", mostra);
        var P1 = campo("Enlaces bloqueados com uma árvore"), P2 = campo("Enlaces usados com duas VLANs");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "malha-stp", 15, "Malha, STP e VLANs");
        raiz.append(u.campo("Configuração", modo), desenho, saida, el("p", { class: "small text-muted" }, "Linhas cheias: enlaces na árvore (ou roteados); tracejadas: bloqueadas."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Com switches e uma única árvore, quantos dos 14 enlaces ficam bloqueados?", P1),
            linhaPergunta("Com uma árvore por VLAN (raízes S1 e S2), quantos enlaces levam tráfego de pelo menos uma VLAN?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 7 && Number(P2.value) === 11;
                u.marca(fb, ok, ok ? "Isso: uma árvore de 8 switches tem 7 enlaces, e os outros 7 ficam parados; com duas raízes, as duas árvores juntas usam 11." : "Ainda não. Compare as configurações.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 4: traceroute através de switches e roteadores (Q5) ---------- */
    var MAC = { H0: "02:00:00:00:00:10", RES: "02:00:00:00:00:53", R0a: "02:00:00:00:00:a0", R0b: "02:00:00:00:01:a0", R1a: "02:00:00:00:01:a1", R1b: "02:00:00:00:13:a1", R3a: "02:00:00:00:13:a3", R3b: "02:00:00:00:0b:a3", H1: "02:00:00:00:00:20" };
    var IP = { H0: "2001:db8:a::10", RES: "2001:db8:a::53", R0: "2001:db8:a::1", R1: "2001:db8:1::2", R3: "2001:db8:13::3", H1: "2001:db8:b::20" };
    // trechos do caminho de H0 até H1: [enlace, MAC origem, MAC destino]
    var TRECHOS = [["H0–S1", "H0", "R0a"], ["S1–S2", "H0", "R0a"], ["S2–S4", "H0", "R0a"], ["S4–R0", "H0", "R0a"], ["R0–R1", "R0b", "R1a"], ["R1–R3", "R1b", "R3a"], ["R3–H1", "R3b", "H1"]];
    var ROTEADOR_TRECHO = { 4: "R0", 5: "R1", 6: "R3", 7: "H1" };
    function sonda(hl) {
        var l = [], h = hl;
        for (var i = 0; i < TRECHOS.length; i++) {
            if (i > 0 && ROTEADOR_TRECHO[i]) { h--; if (h === 0) return { linhas: l, expira: ROTEADOR_TRECHO[i] }; }
            l.push([TRECHOS[i][0], MAC[TRECHOS[i][1]] + " → " + MAC[TRECHOS[i][2]], IP.H0 + " → " + IP.H1, String(h)]);
        }
        return { linhas: l, expira: "H1" };
    }
    R.sonda43 = sonda;
    var FASES = [
        ["Os switches ligam", "S1, S2, S3 e S4 trocam BPDUs. Com S1 como raiz (menor ID), S4 chega à raiz por S2 ou por S3 com o mesmo custo e escolhe S2 (menor ID); a porta de S4 no enlace com S3 fica bloqueada, e o laço S1–S2–S4–S3 desaparece."],
        ["Os roteadores ligam", "R0, R1, R2 e R3 trocam Hello e as suas rotas (OSPF ou RIP). R0 aprende 2001:db8:b::/64 por R1 e por R2, dois caminhos de mesmo custo; aqui, as sondas seguem por R1."],
        ["H0 configura o endereço", "R0 manda Router Advertisements para ff02::1 com o prefixo 2001:db8:a::/64; H0 forma o seu endereço (SLAAC), confere que ninguém o usa (DAD) e anota R0 como roteador padrão. Os switches aprendem os MACs pelos quadros que passam."],
        ["H0 resolve o nome H1", "H0 descobre o MAC do resolvedor com um Neighbor Solicitation (o multicast solicited-node do endereço) e manda a consulta DNS AAAA \"H1\" em UDP, porta 53; a resposta traz 2001:db8:b::20. O quadro vai de H0 a S3 pela árvore: H0–S1–S3."],
        ["H0 descobre o MAC de R0", "H0 manda um Neighbor Solicitation para o endereço do roteador padrão e recebe o Neighbor Advertisement com o MAC de R0. Daqui em diante, todo pacote para fora da sub-rede vai num quadro para o MAC de R0."],
        ["Sonda com hop limit 1", null, 1], ["Sonda com hop limit 2", null, 2], ["Sonda com hop limit 3", null, 3], ["Sonda com hop limit 4", null, 4]
    ];
    R.registrar("camadas-traceroute", function (raiz) {
        var i = 0, titulo = el("p", { class: "fw-semibold mb-1" }), corpo = el("div", { class: "small", "aria-live": "polite" });
        function mostra() {
            var f = FASES[i];
            titulo.textContent = "Passo " + (i + 1) + " de " + FASES.length + ": " + f[0];
            if (f[1]) { corpo.replaceChildren(el("p", { class: "mb-0" }, f[1])); return; }
            var r = sonda(f[2]);
            var resp = r.expira === "H1" ? "H1 não tem nada na porta UDP da sonda e devolve um ICMPv6 Destination Unreachable, código 4 (porta inalcançável): o traceroute termina." :
                r.expira + " zera o hop limit, descarta a sonda e devolve a H0 um ICMPv6 Time Exceeded, código 0, com origem " + IP[r.expira] + ".";
            corpo.replaceChildren(el("p", { class: "mb-1" }, "A sonda UDP vai de " + IP.H0 + " para " + IP.H1 + ". Quadros que a carregam, trecho a trecho:"),
                tabela(["Trecho", "Ethernet (origem → destino)", "IPv6 (origem → destino)", "Hop limit"], r.linhas.map(function (x) { return el("tr", null, x.map(function (c) { return el("td", null, c); })); }), "mono"),
                el("p", { class: "mb-0" }, resp + " O traceroute também costuma pedir ao resolvedor o nome de cada endereço (consulta PTR)."));
        }
        var P1 = campo("Linhas do traceroute"), P2 = escolha("MAC de destino no trecho S2–S4", [["R0", "o de R0"], ["S4", "o de S4"], ["H1", "o de H1"]]), P3 = campo("Hop limit da sonda 3 ao chegar a R3");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "camadas-traceroute", 15, "Traceroute por switches e roteadores");
        raiz.append(titulo, corpo,
            el("div", { class: "d-flex gap-2 my-2" }, u.botao("← Anterior", "btn-outline-secondary btn-sm", function () { if (i > 0) { i--; mostra(); } }), u.botao("Próximo →", "btn-outline-secondary btn-sm", function () { if (i < FASES.length - 1) { i++; mostra(); } })),
            el("p", { class: "small text-muted" }, "Endereços e MACs ilustrativos, tirados dos blocos de documentação."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Quantas linhas (saltos) o traceroute mostra até H1, contando a do próprio H1?", P1),
            linhaPergunta("Nas sondas, qual é o MAC de destino dos quadros no trecho S2–S4?", P2),
            linhaPergunta("Com que hop limit a sonda 3 chega a R3?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 4 && P2.value === "R0" && Number(P3.value) === 1;
                u.marca(fb, ok, ok ? "Isso: R0, R1 (ou R2), R3 e H1; os switches não aparecem, porque não mexem no hop limit nem respondem; e a sonda 3 chega a R3 com hop limit 1, que ele zera." : "Ainda não. Percorra as sondas.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 5: VLANs (Q6) ---------- */
    function vlanComunica(v0, v1, roteador) {
        if (v0 === v1) return { ok: true, txt: "H0 e H1 estão na mesma VLAN (" + v0 + "), no mesmo domínio de broadcast: com endereços da mesma sub-rede, o Neighbor Solicitation de H0 chega a H1, e os quadros vão direto pelo switch." };
        if (!roteador) return { ok: false, txt: "O switch só repassa um quadro para portas da mesma VLAN. O Neighbor Solicitation de H0 (VLAN " + v0 + ") nunca chega à porta de H1 (VLAN " + v1 + "), e nenhum quadro passa de uma VLAN para a outra: H0 e H1 não se comunicam." };
        return { ok: true, txt: "Com um roteador ligado ao switch por uma porta trunk (VLANs " + v0 + " e " + v1 + ", uma sub-rede em cada), H0 manda o pacote ao roteador; o quadro sobe pelo trunk com a etiqueta 802.1Q " + v0 + ", o roteador encaminha o pacote e o devolve pelo mesmo trunk com a etiqueta " + v1 + ", e o switch o entrega a H1." };
    }
    R.vlan43 = vlanComunica;
    R.registrar("vlan-comunica", function (raiz) {
        var v0 = escolha("VLAN da porta de H0", [["10", "VLAN 10"], ["100", "VLAN 100"]], false), v1 = escolha("VLAN da porta de H1", [["10", "VLAN 10"], ["100", "VLAN 100"]], false);
        v1.value = "100";
        var rot = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") });
        var desenho = s("svg", { viewBox: "0 0 360 170", class: "sim-svg w-100", style: "max-height:190px", role: "img", "aria-label": "H0 e H1 ligados ao mesmo switch, cada um numa VLAN." });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var r = vlanComunica(v0.value, v1.value, rot.checked), g = s("g", { "font-size": 12, "text-anchor": "middle" });
            g.append(s("line", { x1: 60, y1: 40, x2: 180, y2: 120, stroke: "currentColor", "stroke-width": 2 }), s("line", { x1: 300, y1: 40, x2: 180, y2: 120, stroke: "currentColor", "stroke-width": 2 }),
                s("text", { x: 95, y: 95 }, "VLAN " + v0.value), s("text", { x: 265, y: 95 }, "VLAN " + v1.value));
            if (rot.checked) g.append(s("line", { x1: 180, y1: 120, x2: 180, y2: 30, stroke: "currentColor", "stroke-width": 3, "stroke-dasharray": "2 3" }), s("rect", { class: "no", x: 152, y: 14, width: 56, height: 24, rx: 4 }), s("text", { x: 180, y: 30 }, "Roteador"), s("text", { x: 214, y: 80, "font-size": 10 }, "trunk"));
            [["H0", 60, 40], ["H1", 300, 40]].forEach(function (h) { g.append(s("rect", { class: "no", x: h[1] - 22, y: h[2] - 14, width: 44, height: 26, rx: 4 }), s("text", { x: h[1], y: h[2] + 4 }, h[0])); });
            g.append(s("rect", { class: "no", x: 148, y: 110, width: 64, height: 26, rx: 4 }), s("text", { x: 180, y: 128 }, "Switch"), s("text", { x: 180, y: 160, "font-weight": "bold", style: "fill: var(" + (r.ok ? "--bs-success-text-emphasis" : "--bs-danger-text-emphasis") + ")" }, r.ok ? "comunicam" : "não comunicam"));
            desenho.replaceChildren(s("title", null, "Fig. 4: H0 e H1 se comunicam?"), g);
            saida.textContent = r.txt;
        }
        [v0, v1, rot].forEach(function (x) { x.addEventListener("change", mostra); });
        var P1 = campo("Vezes que o quadro passa pelo trunk"), fb = u.feedback();
        var concluir = R.desafio(raiz, "vlan-comunica", 10, "H0 e H1 em VLANs diferentes");
        raiz.append(desenho, el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Porta de H0", v0)), el("div", { class: "col-6" }, u.campo("Porta de H1", v1))),
            el("div", { class: "form-check mt-2" }, rot, el("label", { class: "form-check-label small", for: rot.id }, "Acrescentar um roteador numa porta trunk do switch")), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            el("p", { class: "small mb-1" }, "Mantenha H0 na VLAN 10 e H1 na VLAN 100 e faça os dois se comunicarem."),
            linhaPergunta("Nessa solução, quantas vezes cada pacote de H0 para H1 atravessa o trunk?", P1),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = v0.value === "10" && v1.value === "100" && rot.checked && Number(P1.value) === 2;
                u.marca(fb, ok, ok ? "Isso: um roteador com uma interface (ou subinterface) em cada VLAN liga os dois domínios; o pacote sobe pelo trunk na VLAN 10 e desce na VLAN 100." : "Ainda não. As VLANs devem continuar diferentes.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 6: o STP no IPMininet (Fig. 22) ---------- */
    var BPDU = [["Protocol Identifier", 2, "0x0000"], ["Protocol Version Identifier", 1, "0 (Spanning Tree)"], ["BPDU Type", 1, "0x00 (Configuration)"], ["BPDU flags", 1, "0x00"],
        ["Root Identifier", 8, "prioridade 0, extensão 3, f6:35:45:ab:5f:79"], ["Root Path Cost", 4, "0"], ["Bridge Identifier", 8, "prioridade 0, extensão 3, f6:35:45:ab:5f:79"],
        ["Port Identifier", 2, "0x8002"], ["Message Age", 2, "0"], ["Max Age", 2, "20"], ["Hello Time", 2, "2"], ["Forward Delay", 2, "15"]];
    R.bpduBytes43 = BPDU.reduce(function (t, x) { return t + x[1]; }, 0);
    var MACSW = { 3: "f63545ab5f79", 7: "2a6f5ef34984", 9: "7ecc45e18e5b" };
    R.registrar("stp-ipmininet", function (raiz) {
        var rede = REDES.f22, res = stp(rede.lans);
        var desenho = s("svg", { viewBox: "0 0 440 230", class: "sim-svg w-100", style: "max-height:250px", role: "img", "aria-label": "Fig. 22: s3 embaixo, s6, s9 e s7 no meio, s4 em cima." }, s("title", null, "Fig. 22"), desenhaRede(rede, res, [], "s"));
        var qual = escolha("Switch", [3, 4, 6, 7, 9].map(function (w) { return [String(w), "s" + w + " brctl showstp s" + w]; }), false);
        var saida = el("pre", { class: "log small mb-1", "aria-live": "polite" });
        function bid(w) { return "000" + w + "." + (MACSW[w] || "(MAC aleatório)"); }
        function mostra() {
            var w = Number(qual.value), v = res.vet[w], rp = res.rp[w], l = [];
            l.push("s" + w, " bridge id            " + bid(w), " designated root      " + bid(3), " root port            " + (rp ? rp[1] : 0), " path cost            " + v[1]);
            Object.keys(res.papeis).filter(function (k) { return Number(k.split(".")[0]) === w; }).sort().forEach(function (k) {
                var pt = Number(k.split(".")[1]), papel = res.papeis[k], lan = Object.keys(rede.lans).filter(function (n) { return rede.lans[n].some(function (x) { return x[0] === w && x[1] === pt; }); })[0];
                var desig = rede.lans[lan].reduce(function (a, b) { return menor([res.vet[b[0]][1], b[0]], [res.vet[a[0]][1], a[0]]) ? b : a; });
                l.push("", "s" + w + "-eth" + pt + " (" + pt + ")", " port id              800" + pt + "    state      " + (papel === "bloqueada" ? "blocking" : "forwarding"),
                    " designated bridge    " + bid(desig[0]) + "    designated cost  " + res.vet[desig[0]][1] + "    (" + papel + ")");
            });
            saida.textContent = l.join("\n");
        }
        qual.addEventListener("change", mostra);
        var P1 = campo("Porta bloqueada de s6"), P2 = campo("Root Path Cost pela s9-eth3"), P3 = escolha("O 3 da extensão", [["prio", "a prioridade prio=3 do script"], ["porta", "o número da porta"], ["vlan", "a VLAN 3"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "stp-ipmininet", 15, "O STP no IPMininet");
        raiz.append(desenho, u.campo("Estado do STP", qual), saida,
            el("p", { class: "small text-muted" }, "Os MACs de s3, s7 e s9 são os da saída do livro; os de s4 e s6 não aparecem nele. Timers omitidos."),
            el("p", { class: "small fw-semibold mt-2 mb-1" }, "O primeiro BPDU de s3 na captura (pág. 391 do PDF):"),
            tabela(["Campo", "Bytes", "Valor"], BPDU.map(function (x) { return el("tr", null, el("td", null, x[0]), el("td", null, String(x[1])), el("td", { class: "mono" }, x[2])); })),
            el("p", { class: "small" }, R.bpduBytes43 + " bytes de BPDU + 3 de LLC + 16 do cabeçalho da captura (Linux cooked) = 54 bytes, o tamanho do quadro na captura."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Que porta de s6 fica bloqueada? (por exemplo: s6-eth1)", P1),
            linhaPergunta("Que Root Path Cost vai nos BPDUs que s9 manda pela s9-eth3?", P2),
            linhaPergunta("No BPDU, a prioridade aparece como 0 e a System ID Extension como 3. O que é esse 3?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value.replace(/\s/g, "").toLowerCase() === "s6-eth2" && Number(P2.value) === 1 && P3.value === "prio";
                u.marca(fb, ok, ok ? "Isso: no enlace s4–s6, s4 e s6 empatam no custo 2 e s4 tem o menor ID; s9 está a custo 1 da raiz; e o 3 é o prio=3, que o Wireshark lê nos 12 bits da extensão." : "Ainda não. Veja a saída de s6 e a de s9.");
                if (ok) concluir();
            }), fb);
        mostra();
    });
}());
