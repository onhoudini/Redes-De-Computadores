/* Simulações do Capítulo 33 — Prática: a camada de aplicação, DNS com dig (seção 4.7 do livro, pág. 312–313 do PDF).
 * Os 13 servidores raiz vêm do arquivo named.root da InterNIC (versão de 12/11/2026). Abaixo da raiz, os dados são
 * ilustrativos: o TLD .example é reservado (RFC 2606), e os endereços são de documentação (RFC 3849 e RFC 5737). */
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
    function numero(v) { return Number(String(v).replace(",", ".").trim()); }

    var RAIZ = [["a", "198.41.0.4", "2001:503:ba3e::2:30"], ["b", "170.247.170.2", "2801:1b8:10::b"], ["c", "192.33.4.12", "2001:500:2::c"],
        ["d", "199.7.91.13", "2001:500:2d::d"], ["e", "192.203.230.10", "2001:500:a8::e"], ["f", "192.5.5.241", "2001:500:2f::f"],
        ["g", "192.112.36.4", "2001:500:12::d0d"], ["h", "198.97.190.53", "2001:500:1::53"], ["i", "192.36.148.17", "2001:7fe::53"],
        ["j", "192.58.128.30", "2001:503:c27::2:30"], ["k", "193.0.14.129", "2001:7fd::1"], ["l", "199.7.83.42", "2001:500:9f::42"],
        ["m", "202.12.27.33", "2001:dc3::35"]];
    R.raiz33 = RAIZ;
    // Zonas ilustrativas. ns: servidores da zona; rr: registros; filhos: delegações.
    var ZONAS = {
        ".": { ns: RAIZ.map(function (r) { return r[0] + ".root-servers.net."; }), filhos: { "example.": { ns: ["a.nic.example.", "b.nic.example."], ttl: 172800 } } },
        "example.": { ns: ["a.nic.example.", "b.nic.example."], filhos: {
            "rede.example.": { ns: ["ns1.rede.example.", "ns2.rede.example."], ttl: 86400 },
            "video.example.": { ns: ["ns.video.example."], ttl: 86400 } } },
        "rede.example.": { ns: ["ns1.rede.example.", "ns2.rede.example."], rr: [
            ["www.rede.example.", "AAAA", 3600, "2001:db8:10::80"], ["www.rede.example.", "A", 3600, "192.0.2.80"],
            ["rede.example.", "MX", 3600, "10 mx1.rede.example."], ["rede.example.", "MX", 3600, "10 mx2.rede.example."], ["rede.example.", "MX", 3600, "20 reserva.video.example."],
            ["aluno.rede.example.", "MX", 1800, "5 mx-aluno.rede.example."], ["aluno.rede.example.", "MX", 1800, "50 mx1.rede.example."],
            ["mx1.rede.example.", "AAAA", 3600, "2001:db8:10::25"], ["mx2.rede.example.", "AAAA", 3600, "2001:db8:20::25"],
            ["mx-aluno.rede.example.", "AAAA", 3600, "2001:db8:30::25"]] },
        "video.example.": { ns: ["ns.video.example."], rr: [
            ["video.example.", "AAAA", 300, "2001:db8:a::1"], ["video.example.", "AAAA", 300, "2001:db8:a::2"], ["video.example.", "AAAA", 300, "2001:db8:a::3"],
            ["reserva.video.example.", "AAAA", 300, "2001:db8:a::25"]] }
    };
    var ENDERECO_NS = {
        "a.nic.example.": ["2001:db8:1::53", "192.0.2.53"], "b.nic.example.": ["2001:db8:2::53", "198.51.100.53"],
        "ns1.rede.example.": ["2001:db8:10::53", "192.0.2.10"], "ns2.rede.example.": ["2001:db8:20::53", "198.51.100.10"],
        "ns.video.example.": ["2001:db8:a::53", "203.0.113.53"]
    };
    RAIZ.forEach(function (r) { ENDERECO_NS[r[0] + ".root-servers.net."] = [r[2], r[1]]; });
    var RESOLVEDOR = "2001:db8:ffff::53";
    function zonaDoServidor(srv) {
        var nome = Object.keys(ENDERECO_NS).find(function (n) { return n === srv || n === srv + "." || ENDERECO_NS[n].indexOf(srv) >= 0; });
        if (!nome) return null;
        return Object.keys(ZONAS).find(function (z) { return ZONAS[z].ns.indexOf(nome) >= 0; });
    }
    function dentro(nome, zona) { return zona === "." || nome === zona || nome.slice(-zona.length - 1) === "." + zona; }
    var giro = 0;
    // Resposta de um servidor autoritativo (ou referência para a zona filha).
    function autoritativo(zona, nome, tipo) {
        var z = ZONAS[zona];
        var filho = Object.keys(z.filhos || {}).find(function (f) { return dentro(nome, f); });
        if (filho) {
            var d = z.filhos[filho];
            return { aa: false, resposta: [], autoridade: d.ns.map(function (n) { return [filho, "NS", d.ttl, n]; }),
                adicional: d.ns.map(function (n) { return [n, "AAAA", d.ttl, ENDERECO_NS[n][0]]; }), filho: filho };
        }
        var rr = (z.rr || []).filter(function (r) { return r[0] === nome && r[1] === tipo; });
        if (zona === "." && nome === "." && tipo === "NS") rr = z.ns.map(function (n) { return [".", "NS", 518400, n]; });
        if (nome === zona && tipo === "NS") rr = z.ns.map(function (n) { return [zona, "NS", 86400, n]; });
        if (rr.length > 1 && nome === "video.example.") { var k = giro++ % rr.length; rr = rr.slice(k).concat(rr.slice(0, k)); }
        var existe = (z.rr || []).some(function (r) { return r[0] === nome; }) || nome === zona;
        return { aa: true, resposta: rr, autoridade: [], adicional: [], nx: !existe };
    }
    R.autoritativo33 = autoritativo;
    // Resolvedor recursivo com cache (relógio em segundos).
    function Resolvedor() { this.cache = {}; this.relogio = 0; }
    Resolvedor.prototype.resolve = function (nome, tipo) {
        var k = nome + " " + tipo, c = this.cache[k], passos = [];
        if (c && c.expira > this.relogio) return { rr: c.rr.map(function (r) { return [r[0], r[1], c.expira - this.relogio, r[3]]; }, this), passos: ["resposta tirada do cache"], doCache: true };
        var zona = ".", servidor = "a.root-servers.net.";
        for (var i = 0; i < 6; i++) {
            var r = autoritativo(zona, nome, tipo);
            passos.push("pergunta a " + servidor + " (zona " + zona + ")" + (r.filho ? " → indica os servidores de " + r.filho : r.aa ? " → resposta" : ""));
            if (!r.filho) {
                if (r.resposta.length) this.cache[k] = { rr: r.resposta, expira: this.relogio + r.resposta[0][2] };
                return { rr: r.resposta, passos: passos, nx: r.nx };
            }
            zona = r.filho; servidor = ZONAS[zona].ns[0];
        }
        return { rr: [], passos: passos };
    };
    R.Resolvedor33 = Resolvedor;

    function formataDig(cmd, tipo, nome, r, id, servidor, flags) {
        var L = [];
        L.push("; <<>> DiG (simulado) <<>> " + cmd);
        L.push(";; ->>HEADER<<- opcode: QUERY, status: " + (r.nx ? "NXDOMAIN" : "NOERROR") + ", id: " + id);
        L.push(";; flags: " + flags + "; QUERY: 1, ANSWER: " + r.resposta.length + ", AUTHORITY: " + r.autoridade.length + ", ADDITIONAL: " + r.adicional.length);
        L.push("", ";; QUESTION SECTION:", ";" + nome + "\t\tIN\t" + tipo);
        function sec(t, lista) { if (lista.length) { L.push("", ";; " + t + " SECTION:"); lista.forEach(function (x) { L.push(x[0] + "\t" + x[2] + "\tIN\t" + x[1] + "\t" + x[3]); }); } }
        sec("ANSWER", r.resposta); sec("AUTHORITY", r.autoridade); sec("ADDITIONAL", r.adicional);
        L.push("", ";; SERVER: " + servidor + "#53");
        return L.join("\n");
    }

    /* ---------- dig simulado ---------- */
    var DESAFIOS = {
        sintaxe: { pts: 10, titulo: "A sintaxe do dig", perguntas: [
            ["Que tipo de registro guarda um endereço IPv6?", [["A", "A"], ["AAAA", "AAAA"], ["NS", "NS"], ["MX", "MX"]], "AAAA"],
            ["Que servidor responde quando você não usa @servidor?", [["raiz", "um servidor raiz"], ["resolvedor", "o resolvedor configurado no sistema"], ["autoritativo", "o servidor autoritativo do nome"]], "resolvedor"]] },
        delegacao: { pts: 15, titulo: "A delegação desde a raiz", perguntas: [
            ["Qual é o endereço IPv6 de a.root-servers.net, segundo o named.root?", "txt", "2001:503:ba3e::2:30"],
            ["Partindo da raiz, quantas consultas até o endereço IPv6 de www.rede.example?", "num", 3],
            ["Qual é o TTL (s) do registro AAAA de www.rede.example?", "num", 3600]] }
    };
    R.registrar("dig-simulado", function (raiz) {
        var chave = raiz.getAttribute("data-desafio") || "sintaxe";
        var res = new Resolvedor();
        var srv = escolha("Servidor", [["", "(nenhum: o resolvedor do sistema, " + RESOLVEDOR + ")"]].concat(
            RAIZ.slice(0, 3).map(function (r) { return [r[2], "@" + r[2] + " (" + r[0] + ".root-servers.net)"]; }),
            [["2001:db8:1::53", "@2001:db8:1::53 (a.nic.example)"], ["2001:db8:10::53", "@2001:db8:10::53 (ns1.rede.example)"], ["2001:db8:a::53", "@2001:db8:a::53 (ns.video.example)"]]), false);
        var tipo = escolha("Tipo", [["AAAA", "AAAA"], ["A", "A"], ["NS", "NS"], ["MX", "MX"]], false);
        var nome = texto("Nome"); nome.value = "www.rede.example";
        var saida = el("pre", { class: "log mt-2", style: "white-space: pre-wrap", "aria-live": "polite" });
        function roda() {
            var n = nome.value.trim().toLowerCase(); if (!n) return;
            if (n.slice(-1) !== ".") n += ".";
            var t = tipo.value, s = srv.value, id = Math.floor(Math.random() * 65536);
            var cmd = "dig " + (s ? "@" + s + " " : "") + "-t " + t + " " + nome.value.trim();
            var r, flags, servidor;
            if (!s) {
                var x = res.resolve(n, t);
                r = { resposta: x.rr, autoridade: [], adicional: [], nx: x.nx }; flags = "qr rd ra"; servidor = RESOLVEDOR;
                saida.textContent = formataDig(cmd, t, n, r, id, servidor, flags) + "\n\n;; o resolvedor fez: " + x.passos.join("; ");
                return;
            }
            var z = zonaDoServidor(s);
            if (!z) { saida.textContent = ";; servidor desconhecido"; return; }
            if (!dentro(n, z)) { r = { resposta: [], autoridade: [], adicional: [], nx: false }; flags = "qr rd"; }
            else { r = autoritativo(z, n, t); flags = "qr" + (r.aa ? " aa" : "") + " rd"; }
            saida.textContent = formataDig(cmd, t, n, r, id, s, flags) + (r.filho ? "\n\n;; sem ANSWER: o servidor indica quem responde por " + r.filho + " (registros NS em AUTHORITY)." : "");
        }
        var cfg = DESAFIOS[chave], campos = cfg.perguntas.map(function (p) { return p[1] === "num" || p[1] === "txt" ? texto(p[0]) : escolha(p[0], p[1]); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dig-" + chave, cfg.pts, cfg.titulo);
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-12 col-md-6" }, u.campo("@servidor", srv)), el("div", { class: "col-4 col-md-2" }, u.campo("-t tipo", tipo)), el("div", { class: "col-8 col-md-4" }, u.campo("nome", nome))),
            u.botao("Executar dig", "btn-primary", roda), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (" + cfg.pts + " pts)"),
            el("div", null, cfg.perguntas.map(function (p, i) { return linhaPergunta(p[0], campos[i]); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = cfg.perguntas.filter(function (p, i) {
                    if (p[1] === "num") return numero(campos[i].value) === p[2];
                    if (p[1] === "txt") return campos[i].value.trim().toLowerCase() === p[2];
                    return campos[i].value === p[2];
                }).length;
                var ok = certas === cfg.perguntas.length;
                u.marca(fb, ok, ok ? "Isso. Repare nas flags: aa aparece só nas respostas de um servidor autoritativo; ra, nas do resolvedor." : certas + " de " + cfg.perguntas.length + ". Use o dig acima para conferir.");
                if (ok) concluir();
            }), fb);
        roda();
    });

    /* ---------- TTL, cache e respostas que giram (Q6) ---------- */
    R.registrar("ttl-cache", function (raiz) {
        var res = new Resolvedor();
        var log = el("ul", { class: "log mt-2", "aria-live": "polite" });
        var relogio = el("span", { class: "fw-semibold" }, "0 s");
        function consulta() {
            var x = res.resolve("video.example.", "AAAA");
            log.prepend(el("li", null, "t = " + res.relogio + " s: " + (x.doCache ? "(cache) " : "(perguntou aos servidores) ") + x.rr.map(function (r) { return r[3] + " TTL " + r[2]; }).join(", ")));
        }
        function avanca(s) { res.relogio += s; relogio.textContent = res.relogio + " s"; }
        var P1 = texto("TTL depois de 120 s"), P2 = escolha("Por que a ordem dos endereços muda", [["giro", "o servidor gira a ordem a cada resposta, para dividir a carga"], ["erro", "é um erro do resolvedor"], ["ttl", "o TTL acabou"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "ttl-cache", 10, "TTL e cache");
        raiz.append(el("p", { class: "small mb-2" }, "Um resolvedor com cache consulta video.example (AAAA, TTL de 300 s nos dados ilustrativos). Relógio: ", relogio),
            el("div", { class: "d-flex flex-wrap gap-2" }, u.botao("dig -t AAAA video.example", "btn-primary", consulta), u.botao("+60 s", "btn-outline-secondary", function () { avanca(60); }), u.botao("+300 s", "btn-outline-secondary", function () { avanca(300); })),
            log,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Logo depois da primeira consulta, você espera 120 s e consulta de novo. Que TTL o resolvedor mostra?", P1),
            linhaPergunta("Depois que o cache expira, a ordem dos três endereços vem diferente. Por quê?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = numero(P1.value) === 180 && P2.value === "giro";
                u.marca(fb, ok, ok ? "Isso: o resolvedor conta o TTL para baixo enquanto guarda a resposta; e servidores de sites grandes giram a ordem dos endereços para espalhar os clientes." : "Ainda não. Faça a consulta, avance 60 s duas vezes e consulte de novo.");
                if (ok) concluir();
            }), fb);
    });

    /* ---------- MX e preferências (Q7) ---------- */
    function ordemMX(registros) {
        return registros.map(function (r) { var p = r[3].split(" "); return { pref: Number(p[0]), nome: p[1] }; }).sort(function (a, b) { return a.pref - b.pref; });
    }
    R.ordemMX33 = ordemMX;
    R.registrar("mx-preferencia", function (raiz) {
        var dom = escolha("Domínio", [["rede.example.", "rede.example"], ["aluno.rede.example.", "aluno.rede.example"]], false);
        var saida = el("div", { class: "mt-2", "aria-live": "polite" });
        function mostra() {
            var r = autoritativo("rede.example.", dom.value, "MX"), o = ordemMX(r.resposta);
            saida.replaceChildren(el("pre", { class: "log mb-1" }, r.resposta.map(function (x) { return x[0] + "\t" + x[2] + "\tIN\tMX\t" + x[3]; }).join("\n")),
                el("p", { class: "small mb-0" }, "Ordem de tentativa: " + o.map(function (x) { return x.nome + " (" + x.pref + ")"; }).join(" → ") + ". Preferências iguais são sorteadas entre si (RFC 5321, seção 5.1)."));
        }
        dom.addEventListener("change", mostra);
        var P1 = escolha("Primeiro relay de rede.example", [["mx", "mx1 ou mx2 (sorteio)"], ["reserva", "reserva.video.example"]]), P2 = texto("Preferência do relay de reserva de aluno.rede.example");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "mx-preferencia", 10, "Registros MX");
        raiz.append(u.campo("Domínio", dom), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Para quem um servidor SMTP tenta entregar primeiro uma mensagem para alguém@rede.example?", P1),
            linhaPergunta("Em aluno.rede.example, que preferência tem o relay usado só quando o principal falha?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === "mx" && numero(P2.value) === 50;
                u.marca(fb, ok, ok ? "Isso: menor preferência primeiro; empates dividem a carga." : "Ainda não. O número menor vem primeiro.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- O identificador da consulta (Q8–Q9) ---------- */
    function chanceAtaque(modo, n) {
        if (modo === "fixo" || modo === "incremental") return 1;     // quem já viu uma consulta prevê o id
        return 1 - Math.pow(1 - 1 / 65536, n);
    }
    R.chanceAtaque33 = chanceAtaque;
    R.registrar("adivinha-id", function (raiz) {
        var modo = escolha("Como o resolvedor escolhe o id", [["fixo", "sempre o mesmo id"], ["incremental", "id + 1 a cada consulta"], ["aleatorio", "id aleatório de 16 bits"]], false);
        modo.value = "aleatorio";
        var n = el("input", { type: "number", min: 1, max: 65536, value: 100, class: "form-control form-control-sm", "aria-label": "Respostas forjadas" });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var k = Math.max(1, Math.min(65536, Number(n.value) || 1)), p = chanceAtaque(modo.value, k);
            saida.textContent = modo.value === "aleatorio"
                ? "Com " + k + " respostas forjadas antes da verdadeira, a chance de acertar o id é de " + (p * 100).toFixed(3).replace(".", ",") + "% (cerca de " + k + " em 65 536)."
                : "Chance praticamente certa: o atacante que viu uma consulta (ou provocou uma) já sabe o próximo id e só precisa chegar antes da resposta verdadeira.";
        }
        [modo, n].forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });
        var P1 = texto("Chance com 100 respostas"), P2 = escolha("Pior gerador", [["fixo", "id fixo"], ["incremental", "id incremental"], ["ambos", "os dois são igualmente fáceis de prever"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "adivinha-id", 10, "O identificador da consulta");
        raiz.append(el("pre", { class: "log mb-2" }, "dig -t MX gmail.com\n\n; <<>> DiG 9.4.3-P3 <<>> -t MX gmail.com\n;; global options: printcmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 25718"),
            el("p", { class: "small text-muted" }, "O cabeçalho impresso no livro (pág. 313 do PDF)."),
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-7" }, u.campo("Gerador de ids do resolvedor", modo)), el("div", { class: "col-sm-5" }, u.campo("Respostas forjadas por consulta", n))),
            saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Com ids aleatórios, qual a chance (em %, duas casas) de 100 respostas forjadas acertarem o id?", P1),
            linhaPergunta("Qual gerador facilita mais o ataque?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Math.abs(numero(P1.value) - chanceAtaque("aleatorio", 100) * 100) < 0.01 && P2.value === "ambos";
                u.marca(fb, ok, ok ? "Isso: cerca de 0,15%. Por isso os resolvedores também sorteiam a porta de origem (complemento ao livro)." : "Ainda não. Leia o resultado da simulação com 100 respostas.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- DNS sobre UDP e TCP (Q10) ---------- */
    R.registrar("udp-tcp-dns", function (raiz) {
        var rtt = el("input", { type: "number", min: 1, max: 500, value: 25, class: "form-control form-control-sm", "aria-label": "RTT até o servidor raiz em ms" });
        var area = el("div"), saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            var t = Math.max(1, Number(rtt.value) || 1);
            area.replaceChildren(R.diagramaSequencia({ titulo: "UDP e TCP", colunas: ["dig (UDP)", "servidor", "dig +tcp", "servidor"], largura: 600, margem: 60, passo: 26, eventos: [
                { t0: 0, t1: 1, de: 0, para: 1, rotulo: "consulta" }, { t0: 1, t1: 2, de: 1, para: 0, rotulo: "resposta" },
                { t0: 0, t1: 1, de: 2, para: 3, rotulo: "SYN", tipo: "tracejado" }, { t0: 1, t1: 2, de: 3, para: 2, rotulo: "SYN+ACK", tipo: "tracejado" },
                { t0: 2, t1: 3, de: 2, para: 3, rotulo: "ACK + consulta" }, { t0: 3, t1: 4, de: 3, para: 2, rotulo: "resposta" }] }));
            saida.textContent = "UDP: 1 RTT = " + t + " ms. TCP: 2 RTT = " + 2 * t + " ms, porque a abertura em três vias vem antes da consulta (e o encerramento ainda gasta segmentos depois).";
        }
        rtt.addEventListener("input", mostra);
        var P1 = texto("Tempo com TCP");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "udp-tcp-dns", 10, "DNS sobre UDP e TCP");
        raiz.append(u.campo("RTT até o servidor (ms)", rtt), area, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): com RTT de 40 ms, quantos ms leva a resposta com dig +tcp, sem contar o processamento?"),
            el("div", { class: "d-flex gap-2" }, P1, u.botao("Conferir", "btn-primary", function () {
                var ok = numero(P1.value) === 80;
                u.marca(fb, ok, ok ? "80 ms: um RTT para abrir a conexão e outro para a consulta. Com UDP, 40 ms." : "Não. Conte os RTTs no diagrama.");
                if (ok) concluir();
            })), fb);
        mostra();
    });
}());
