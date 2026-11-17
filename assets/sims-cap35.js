/* Simulações do Capítulo 35 — Prática: HTTP (seção 4.9 do livro, pág. 314–315 do PDF).
 * Servidores e páginas ilustrativos, com nomes de exemplo (RFC 2606). */
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

    /* ---------- HTTP/1.0, 1.1 e 2: conexões e RTTs ---------- */
    function tempoPagina(versao, objetos, rtt) {
        // objetos = página HTML + imagens. Só RTTs: sem TLS, sem tempo de transmissão, sem limite de conexões paralelas.
        var imgs = objetos - 1;
        if (versao === "1.0") return { rtts: 2 * objetos, conexoes: objetos };
        if (versao === "1.1") return { rtts: 1 + objetos, conexoes: 1 };
        return { rtts: 1 + 1 + (imgs > 0 ? 1 : 0), conexoes: 1 };   // pipelining ou HTTP/2: as imagens vão juntas
    }
    R.tempoPagina35 = tempoPagina;
    R.registrar("versoes-http", function (raiz) {
        var n = el("input", { type: "number", min: 1, max: 12, value: 5, class: "form-control form-control-sm", "aria-label": "Objetos na página" });
        var rtt = el("input", { type: "number", min: 1, max: 500, value: 50, class: "form-control form-control-sm", "aria-label": "RTT em ms" });
        var tabela = el("div", { class: "table-responsive mt-2" });
        function mostra() {
            var k = Math.max(1, Math.min(12, Number(n.value) || 1)), t = Math.max(1, Number(rtt.value) || 1);
            var linhas = [["1.0", "HTTP/1.0: uma conexão por objeto"], ["1.1", "HTTP/1.1 persistente, um pedido por vez"], ["2", "HTTP/2 (ou pipelining no 1.1)"]];
            tabela.replaceChildren(el("table", { class: "table table-sm small mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Versão"), el("th", null, "Conexões TCP"), el("th", null, "RTTs"), el("th", null, "Tempo"))),
                el("tbody", null, linhas.map(function (l) { var r = tempoPagina(l[0], k, t); return el("tr", null, el("td", null, l[1]), el("td", null, String(r.conexoes)), el("td", null, String(r.rtts)), el("td", null, r.rtts * t + " ms")); }))));
        }
        [n, rtt].forEach(function (c) { c.addEventListener("input", mostra); });
        var P1 = texto("Tempo com HTTP/1.0"), P2 = texto("Tempo com HTTP/1.1"), P3 = texto("Tempo com HTTP/2");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "versoes-http", 15, "As versões do HTTP");
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Objetos (página + imagens)", n)), el("div", { class: "col-6" }, u.campo("RTT (ms)", rtt))), tabela,
            el("p", { class: "small text-muted mt-1" }, "Conta só os tempos de ida e volta: sem TLS, sem o tempo de transmitir os objetos e com a página pedida antes das imagens."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): uma página com 3 imagens (4 objetos), RTT de 80 ms. Quantos ms em cada versão?"),
            linhaPergunta("HTTP/1.0", P1), linhaPergunta("HTTP/1.1 persistente", P2), linhaPergunta("HTTP/2", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var esp = ["1.0", "1.1", "2"].map(function (v) { return tempoPagina(v, 4, 80).rtts * 80; });
                var ok = [P1, P2, P3].every(function (p, i) { return numero(p.value) === esp[i]; });
                u.marca(fb, ok, ok ? "Isso: 640, 400 e 240 ms. A conexão persistente economiza as aberturas; o HTTP/2 manda os pedidos das imagens de uma vez." : "Ainda não. Use a tabela com 4 objetos e 80 ms.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- telnet na porta 80 e o cabeçalho Host (Q1 e Q3) ---------- */
    var SITES = { "www.example.com": "<html><title>Example Com</title>…</html>", "docs.example.org": "<html><title>Documentação</title>…</html>" };
    function servidorHTTP(pedido, porta) {
        var linhas = pedido.replace(/\r/g, "").split("\n");
        var m = /^(GET|HEAD) (\S+) HTTP\/(1\.0|1\.1)$/.exec(linhas[0] || "");
        if (!m) return "HTTP/1.1 400 Bad Request\nContent-Length: 0\n";
        var host = null;
        linhas.slice(1).forEach(function (l) { var h = /^host:\s*([^\s:]+)/i.exec(l); if (h) host = h[1].toLowerCase(); });
        if (m[3] === "1.1" && !host) return "HTTP/1.1 400 Bad Request\nContent-Type: text/html\n\n<h1>400: falta o cabeçalho Host</h1>";
        if (porta === 80) return "HTTP/1.1 301 Moved Permanently\nLocation: https://" + (host || "www.example.com") + m[2] + "\nContent-Length: 0\n";
        var site = host && SITES[host] ? host : "www.example.com";
        var corpo = m[1] === "HEAD" ? "" : SITES[site];
        return "HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nContent-Length: " + new TextEncoder().encode(SITES[site]).length + "\n\n" + corpo + (host ? "" : "\n(sem Host: o servidor mostrou o site padrão)");
    }
    R.servidorHTTP35 = servidorHTTP;
    R.registrar("telnet-http", function (raiz) {
        var porta = escolha("Porta", [["80", "80 (http)"], ["443", "443 (https, como faria o curl; o TLS fica por conta dele)"]], false);
        porta.value = "443";
        var pedido = el("textarea", { class: "form-control form-control-sm mono", rows: 4, spellcheck: "false", "aria-label": "Pedido HTTP" }, "GET / HTTP/1.1\nHost: www.example.com\n");
        var resposta = el("pre", { class: "log mt-2", style: "white-space: pre-wrap", "aria-live": "polite" });
        var historico = [];
        function envia() { var r = servidorHTTP(pedido.value, Number(porta.value)); historico.push([pedido.value, Number(porta.value), r]); resposta.textContent = r; }
        var P1 = escolha("Resposta ao HTTP/1.1 sem Host", [["200", "200 OK com o site padrão"], ["400", "400 Bad Request"], ["301", "301 Moved Permanently"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "telnet-http", 15, "Telnet na porta 80 e o cabeçalho Host");
        raiz.append(el("p", { class: "small mb-1" }, "Um servidor ilustrativo hospeda dois sites no mesmo endereço: www.example.com (o padrão) e docs.example.org. Na porta 80, ele manda tudo para o https."),
            u.campo("Porta do servidor", porta), u.campo("Pedido (termine com uma linha em branco)", pedido), u.botao("Enviar", "btn-primary mt-1", envia), resposta,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): na porta 443, obtenha a página de docs.example.org (a resposta tem de trazer o título Documentação) e responda:"),
            linhaPergunta("O que o servidor responde a um pedido HTTP/1.1 sem Host?", P1),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var pegou = historico.some(function (h) { return h[1] === 443 && h[2].indexOf("Documentação") >= 0; });
                var ok = pegou && P1.value === "400";
                u.marca(fb, ok, ok ? "Isso: com vários sites no mesmo endereço, só o Host diz qual deles o cliente quer; por isso o HTTP/1.1 o torna obrigatório." : (pegou ? "A página veio; falta acertar a pergunta (teste um GET / HTTP/1.1 sem Host)." : "Ainda não veio a página de docs.example.org pela porta 443."));
                if (ok) concluir();
            }), fb);
        envia();
    });

    /* ---------- curl --trace-ascii (Q2) ---------- */
    var TRACE = [
        ["=> Send header", "O que o curl mandou:", null],
        ["GET / HTTP/1.1", "A linha de pedido: método, caminho e versão. Para http://, o curl usa HTTP/1.1; para https://, costuma negociar HTTP/2 pelo TLS (ALPN).", "versao"],
        ["Host: www.example.com", "Obrigatório no HTTP/1.1: qual site, entre os que podem dividir o mesmo endereço.", null],
        ["User-Agent: curl/8.5.0", "Identifica o cliente e a versão.", "agente"],
        ["Accept: */*", "O curl aceita qualquer tipo de conteúdo.", null],
        ["<= Recv header", "O que voltou:", null],
        ["HTTP/1.1 200 OK", "A linha de estado: versão, código e frase.", null],
        ["Date: Mon, 16 Nov 2026 13:00:00 GMT", "Quando a resposta foi gerada.", null],
        ["Server: exemplo/1.0", "O software do servidor.", null],
        ["Content-Type: text/html; charset=UTF-8", "O tipo do corpo e a codificação do texto.", null],
        ["Content-Length: 1256", "O tamanho do corpo em bytes: o cliente sabe onde a resposta termina sem fechar a conexão.", "tamanho"],
        ["Last-Modified: Fri, 13 Nov 2026 09:30:00 GMT", "Quando a página mudou pela última vez; serve para pedidos condicionais (If-Modified-Since).", null],
        ["Cache-Control: max-age=600", "Por quanto tempo uma cópia em cache continua valendo.", null]
    ];
    R.registrar("curl-trace", function (raiz) {
        var expl = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" }, "Clique numa linha do trace.");
        var tela = el("div", { class: "log mono small", style: "max-height:none" }, TRACE.map(function (t) {
            return el("button", { type: "button", class: "btn btn-link btn-sm p-0 text-start d-block mono" + (t[0].indexOf("=") === 0 || t[0].indexOf("<") === 0 ? " text-muted" : ""), onclick: function () { expl.textContent = t[1]; } }, t[0]);
        }));
        var P1 = escolha("Cabeçalho do tamanho", [["Content-Length", "Content-Length"], ["Content-Type", "Content-Type"], ["Cache-Control", "Cache-Control"]]);
        var P2 = escolha("Cabeçalho que identifica o curl", [["Host", "Host"], ["User-Agent", "User-Agent"], ["Accept", "Accept"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "curl-trace", 10, "Lendo um trace do curl");
        raiz.append(el("p", { class: "small mb-1" }, "Um trace ilustrativo de curl --trace-ascii, sem os bytes em hexadecimal:"), tela, expl,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Que cabeçalho diz ao cliente quantos bytes tem o corpo?", P1),
            linhaPergunta("Que cabeçalho o curl acrescenta para se identificar?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === "Content-Length" && P2.value === "User-Agent";
                u.marca(fb, ok, ok ? "Isso." : "Ainda não. Clique nas linhas do trace.");
                if (ok) concluir();
            }), fb);
    });

    /* ---------- Accept-Language (Q4) ---------- */
    function negocia(cabecalho, disponiveis) {
        var prefs = cabecalho.split(",").map(function (p) {
            var partes = p.trim().split(";"), tag = partes[0].trim().toLowerCase(), q = 1;
            partes.slice(1).forEach(function (x) { var m = /^\s*q\s*=\s*([0-9.]+)/.exec(x); if (m) q = Number(m[1]); });
            return { tag: tag, q: q };
        }).filter(function (p) { return p.tag && p.q > 0; }).sort(function (a, b) { return b.q - a.q; });
        for (var i = 0; i < prefs.length; i++) {
            var achou = disponiveis.find(function (d) { return d === prefs[i].tag || d.split("-")[0] === prefs[i].tag || prefs[i].tag === "*"; });
            if (achou) return achou;
        }
        return disponiveis[0];
    }
    R.negocia35 = negocia;
    R.registrar("accept-language", function (raiz) {
        var DISP = ["en", "fr", "nl"];
        var cab = texto("Accept-Language"); cab.value = "fr";
        var saida = el("pre", { class: "log mt-2", "aria-live": "polite" });
        function mostra() {
            var l = negocia(cab.value || "*", DISP);
            saida.textContent = "GET / HTTP/1.1\nHost: www.example.com\nAccept-Language: " + cab.value + "\n\nHTTP/1.1 200 OK\nContent-Language: " + l + "\nVary: Accept-Language\n\n(a versão " + l + " da página)";
        }
        cab.addEventListener("input", mostra);
        var P1 = escolha("Versão para wa", [["en", "en (a padrão)"], ["fr", "fr"], ["nl", "nl"]]), P2 = escolha("Versão para wa, fr;q=0.8, en;q=0.9", [["en", "en"], ["fr", "fr"], ["nl", "nl"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "accept-language", 10, "Negociação de idioma");
        raiz.append(el("p", { class: "small mb-1" }, "O servidor ilustrativo tem a página em inglês (en, a padrão), francês (fr) e neerlandês (nl)."),
            u.campo("Cabeçalho Accept-Language do pedido", cab), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): que versão o servidor devolve para…"),
            linhaPergunta("Accept-Language: wa (valão)", P1), linhaPergunta("Accept-Language: wa, fr;q=0.8, en;q=0.9", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = P1.value === negocia("wa", DISP) && P2.value === negocia("wa, fr;q=0.8, en;q=0.9", DISP);
                u.marca(fb, ok, ok ? "Isso: sem valão, o servidor cai na padrão; com pesos, vale a maior qualidade entre as que ele tem." : "Ainda não. Teste os dois cabeçalhos no campo acima.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Uma página, vários servidores (Q5–Q8) ---------- */
    var RECURSOS = [
        ["https://www.example.com/", "AAAA e A"], ["https://www.example.com/estilo.css", "AAAA e A"], ["https://static.example.com/logo.png", "AAAA e A"],
        ["https://static.example.com/foto1.jpg", "AAAA e A"], ["https://fonts.example.net/fonte.woff2", "AAAA e A"], ["https://cdn.example.net/biblioteca.js", "só A"],
        ["https://ads.example.org/banner.js", "só A"], ["https://ads.example.org/pixel.gif", "só A"], ["https://stats.example.org/contador.js", "AAAA e A"]
    ];
    R.registrar("servidores-pagina", function (raiz) {
        var lista = el("ul", { class: "small mono mb-1" }, RECURSOS.map(function (r) { return el("li", null, r[0] + "  (" + r[1] + ")"); }));
        var P1 = texto("Servidores diferentes"), P2 = texto("Servidores só IPv4");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "servidores-pagina", 10, "Uma página, vários servidores");
        raiz.append(el("p", { class: "small mb-1" }, "Os pedidos que um navegador fez para montar uma página ilustrativa, com os registros DNS de cada nome:"), lista,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Quantos servidores (nomes de host) diferentes a página contatou?", P1),
            linhaPergunta("Quantos deles só são alcançáveis por IPv4?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var hosts = {}, so4 = {};
                RECURSOS.forEach(function (r) { var h = r[0].split("/")[2]; hosts[h] = 1; if (r[1] === "só A") so4[h] = 1; });
                var ok = numero(P1.value) === Object.keys(hosts).length && numero(P2.value) === Object.keys(so4).length;
                u.marca(fb, ok, ok ? "Isso: 6 servidores, 2 só com IPv4. A extensão ipvfoo, citada pelo livro, mostra o mesmo para uma página real." : "Ainda não. Conte os nomes de host distintos (o que vem depois de https://).");
                if (ok) concluir();
            }), fb);
    });
}());
