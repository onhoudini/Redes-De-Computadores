/* Simulações do Capítulo 12 — O protocolo HTTP (seção 3.4 do livro).
 * Cada uma é registrada em Redes.registrar. Os exemplos vêm do livro; os demais usam
 * nomes reservados para documentação (RFC 2606). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function hex2(n) { return n.toString(16).padStart(2, "0"); }
    function entrada(valor, rotulo) {
        return el("input", { class: "form-control form-control-sm mono", value: valor || "", "aria-label": rotulo || null, spellcheck: "false", autocomplete: "off" });
    }
    function faixa(rotulo, min, max, passo, valor, unidade) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor, id: u.novoId("faixa") });
        var mostra = el("span", { class: "fw-semibold" });
        function atualiza() { mostra.textContent = input.value + (unidade || ""); }
        input.addEventListener("input", atualiza);
        atualiza();
        var linha = el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id }, rotulo, mostra), input);
        return { input: input, mostra: mostra, linha: linha };
    }
    function caixa(rotulo, marcada) {
        var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: !!marcada });
        return { input: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, rotulo)) };
    }
    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }

    /* ---------- URI segundo a RFC 3986 (apêndice B) ---------- */
    var PORTAS = { http: 80, https: 443, ftp: 21, telnet: 23, ssh: 22 };
    function leURI(texto) {
        var m = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/.exec(String(texto || "").trim());
        if (!m) return null;
        var r = { esquema: m[2] || "", autoridade: m[4], caminho: m[5] || "", consulta: m[7], fragmento: m[9], usuario: undefined, host: undefined, porta: undefined };
        if (r.autoridade !== undefined) {
            var a = r.autoridade, arroba = a.lastIndexOf("@");
            if (arroba >= 0) { r.usuario = a.slice(0, arroba); a = a.slice(arroba + 1); }
            var mm = /^(\[[^\]]*\]|[^:]*)(:(\d*))?$/.exec(a);
            if (mm) { r.host = mm[1].replace(/^\[|\]$/g, ""); r.porta = mm[3]; }
            else r.host = a;
        }
        return r;
    }
    R.leURI = leURI;

    /* ------------------------------------------------------------------
     * 1. Dissecando uma URI (pág. 149–150 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("dissecar-uri", function (raiz) {
        var EXEMPLOS = [
            "http://tools.ietf.org/html/rfc3986.html",
            "mailto:infobot@example.com?subject=current-issue",
            "http://docs.python.org/library/basehttpserver.html?highlight=http#BaseHTTPServer.BaseHTTPRequestHandler",
            "telnet://[2001:db8:3080:3::2]:2323/",
            "ftp://cnn.example.com&story=breaking_news@10.0.0.1/top_story.htm",
            "http://alice:segredo@www.example.com:8080/docs/caf%C3%A9.html?x=1#fim"
        ];
        var campo = entrada(EXEMPLOS[4], "URI");
        var botoes = el("div", { class: "d-flex flex-wrap gap-2 mb-2" });
        EXEMPLOS.forEach(function (e, i) {
            botoes.append(u.botao(i < 5 ? "Exemplo " + (i + 1) + " do livro" : "Com senha e porta", "btn-outline-secondary", function () { campo.value = e; mostra(); }));
        });
        var partes = el("div", { class: "d-flex flex-wrap mt-2" });
        var avisos = el("ul", { class: "small mt-2 mb-0", "aria-live": "polite" });

        function mostra() {
            var r = leURI(campo.value);
            partes.replaceChildren(); avisos.replaceChildren();
            if (!r || !r.esquema) { avisos.append(el("li", null, "Uma URI começa com um esquema seguido de dois-pontos (http:, mailto:, ftp:…).")); return; }
            function peca(nome, valor, classe) {
                if (valor === undefined || valor === "") return;
                partes.append(el("span", { class: "byte-cell " + (classe || "") }, valor, el("small", null, nome)));
            }
            peca("esquema", r.esquema, "ctrl");
            peca("usuário", r.usuario, "bad");
            peca("host", r.host, "");
            peca("porta", r.porta, "ok");
            peca("caminho", r.caminho, "muted");
            peca("consulta", r.consulta, "ok");
            peca("fragmento", r.fragmento, "ctrl");
            if (r.autoridade === undefined) avisos.append(el("li", null, "Sem \"//\": esta URI não tem autoridade (host). Em mailto:, o destinatário está no caminho."));
            if (r.usuario !== undefined) avisos.append(el("li", null, r.usuario.indexOf(":") >= 0
                ? "Há uma senha antes do @ (" + r.usuario.split(":")[1] + "): isso é obsoleto e inseguro, porque a URI fica visível em históricos, registros e no Referer."
                : "Tudo o que vem antes do último @ da autoridade é o usuário, não o host."));
            if (r.porta) avisos.append(el("li", null, "Porta " + r.porta + (PORTAS[r.esquema] && String(PORTAS[r.esquema]) === r.porta ? ": é a porta padrão do esquema, e poderia ser omitida." : PORTAS[r.esquema] ? " (a padrão de " + r.esquema + " é " + PORTAS[r.esquema] + ")." : ".")));
            else if (PORTAS[r.esquema] && r.host) avisos.append(el("li", null, "Sem porta: o cliente usa a padrão de " + r.esquema + ", " + PORTAS[r.esquema] + "."));
            if (/%[0-9a-f]{2}/i.test(campo.value)) {
                var dec = campo.value;
                try { dec = decodeURIComponent(r.caminho); } catch (_) {}
                avisos.append(el("li", null, "Há caracteres codificados com % (pct-encoded). O caminho decodificado é " + dec + "."));
            }
            if (r.fragmento) avisos.append(el("li", null, "O fragmento (depois de #) não é enviado ao servidor: o navegador o usa para ir a um trecho do documento."));
        }
        campo.addEventListener("input", mostra);

        var r1 = entrada("", "Host do exemplo 5"), r2 = entrada("", "Porta do exemplo 4"), r3 = entrada("", "Fragmento do exemplo 3");
        var fb = u.feedback(), feitas = {};
        var concluir = R.desafio(raiz, "uri-partes", 15, "Achar o host, a porta e o fragmento de URIs do livro");
        function confere() {
            if (r1.value.trim() === "10.0.0.1") feitas.a = true;
            if (r2.value.trim() === "2323") feitas.b = true;
            if (r3.value.trim().replace(/^#/, "") === "BaseHTTPServer.BaseHTTPRequestHandler") feitas.c = true;
            var n = Object.keys(feitas).length;
            if (n === 3) { u.marca(fb, true, "Os três conferem. No exemplo 5, cnn.example.com&story=breaking_news é o nome de usuário, e o documento vem de 10.0.0.1."); concluir(); }
            else u.marca(fb, false, n + " de 3 certos. Use os botões de exemplo para ver as partes de cada URI.");
        }
        raiz.append(botoes, u.campo("URI", campo), partes, avisos,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            u.campo("De qual host o exemplo 5 (ftp://cnn.example.com&…) busca o documento?", r1),
            u.campo("Em qual porta está o servidor do exemplo 4 (telnet)?", r2),
            u.campo("Qual é o fragmento do exemplo 3?", r3),
            u.botao("Conferir", "btn-primary", confere), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 2. Um servidor HTTP com dois sites (pág. 151–154 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("servidor-http", function (raiz) {
        var SITES = {
            "web.example.com": {
                "/index.html": { corpo: "<html>Página inicial de web.example.com</html>", lm: Date.UTC(2010, 2, 9, 21, 26, 53) },
                "/antigo.html": { mover: "http://web.example.com/index.html" }
            },
            "www.example.net": {
                "/index.html": { corpo: "<html>Página inicial de www.example.net</html>", lm: Date.UTC(2010, 2, 15, 8, 0, 0) },
                "/contato.html": { corpo: "<html>Fale conosco</html>", lm: Date.UTC(2010, 1, 1, 12, 0, 0) }
            }
        };
        var DATAS = [Date.UTC(2010, 2, 1, 0, 0, 0), Date.UTC(2010, 2, 9, 21, 26, 53), Date.UTC(2010, 2, 15, 8, 0, 0)];
        function httpData(ms) { return new Date(ms).toUTCString(); }

        var metodo = el("select", { class: "form-select form-select-sm" }, ["GET", "HEAD", "POST"].map(function (m) { return el("option", { value: m }, m); }));
        var caminho = entrada("/index.html", "Caminho");
        var versao = el("select", { class: "form-select form-select-sm" }, el("option", { value: "HTTP/1.1" }, "HTTP/1.1"), el("option", { value: "HTTP/1.0" }, "HTTP/1.0"));
        var usaHost = caixa("Enviar Host:", true);
        var host = el("select", { class: "form-select form-select-sm", "aria-label": "Valor do Host" }, Object.keys(SITES).map(function (h) { return el("option", { value: h }, h); }));
        var usaIms = caixa("Enviar If-Modified-Since:", false);
        var ims = el("select", { class: "form-select form-select-sm", "aria-label": "Data do If-Modified-Since" }, DATAS.map(function (d, i) { return el("option", { value: i }, httpData(d)); }));
        var pedido = el("pre", { class: "log mb-2" });
        var resposta = el("pre", { class: "log mb-0", "aria-live": "polite" });
        var lista = el("ul", { class: "small mb-2" });
        var fb = u.feedback(), vistos = {};
        var METAS = [["200net", "200 OK vindo de www.example.net"], ["304", "304 Not Modified"], ["301", "301 Moved Permanently"], ["404", "404 Not Found"]];
        var concluir = R.desafio(raiz, "http-codigos", 20, "Obter as respostas 200, 304, 301 e 404 de um servidor HTTP");

        function desenhaMetas() {
            lista.replaceChildren();
            METAS.forEach(function (m) { lista.append(el("li", null, (vistos[m[0]] ? "✔ " : "○ ") + m[1])); });
        }
        function textoPedido() {
            var linhas = [metodo.value + " " + (caminho.value.trim() || "/") + " " + versao.value];
            if (usaHost.input.checked) linhas.push("Host: " + host.value);
            linhas.push("User-Agent: curl/7.19.4");
            if (usaIms.input.checked) linhas.push("If-Modified-Since: " + httpData(DATAS[Number(ims.value)]));
            if (metodo.value === "POST") linhas.push("Content-Type: application/x-www-form-urlencoded", "Content-Length: 13", "", "nome=Alice&x=1");
            else linhas.push("");
            return linhas.join("\n");
        }
        function envia() {
            pedido.textContent = textoPedido();
            var cab = ["Date: Mon, 15 Mar 2010 13:40:38 GMT", "Server: Apache/2.2.4"], status, corpo = "", nota = "";
            var site;
            if (!usaHost.input.checked && versao.value === "HTTP/1.1") {
                status = "400 Bad Request"; nota = "No HTTP/1.1, o Host: é obrigatório (complemento: RFC 9112).";
            } else {
                if (usaHost.input.checked) site = host.value;
                else { site = "web.example.com"; nota = "Sem Host:, o servidor não sabe qual dos dois sites você quer e devolve o padrão, web.example.com."; }
                var doc = SITES[site][caminho.value.trim() || "/"];
                if (!doc) { status = "404 Not Found"; corpo = "<html>Documento não encontrado</html>"; }
                else if (doc.mover) { status = "301 Moved Permanently"; cab.push("Location: " + doc.mover); corpo = "<html>Mudou para " + doc.mover + "</html>"; }
                else if (metodo.value === "POST") { status = "200 OK"; corpo = "<html>Formulário recebido</html>"; }
                else if (usaIms.input.checked && DATAS[Number(ims.value)] >= doc.lm) {
                    status = "304 Not Modified"; nota = "O documento não mudou desde a data enviada: use a cópia do cache.";
                } else { status = "200 OK"; cab.push("Last-Modified: " + httpData(doc.lm)); corpo = doc.corpo; }
            }
            if (corpo) cab.push("Content-Length: " + new TextEncoder().encode(corpo).length, "Content-Type: text/html");
            var semCorpo = metodo.value === "HEAD" || /^304/.test(status);
            resposta.textContent = versao.value + " " + status + "\n" + cab.join("\n") + "\n\n" + (semCorpo ? (metodo.value === "HEAD" && corpo ? "(HEAD: só o cabeçalho, sem o documento)" : "") : corpo) + (nota ? "\n\n# " + nota : "");
            var codigo = status.slice(0, 3);
            if (codigo === "200" && site === "www.example.net" && metodo.value !== "POST") vistos["200net"] = true;
            if (codigo === "304" || codigo === "301" || codigo === "404") vistos[codigo] = true;
            desenhaMetas();
            if (METAS.every(function (m) { return vistos[m[0]]; })) { u.marca(fb, true, "As quatro respostas apareceram. Repare que o 304 não traz o documento, e o 301 traz o novo endereço em Location:."); concluir(); }
        }

        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-4 col-md-2" }, u.campo("Método", metodo)),
                el("div", { class: "col-8 col-md-6" }, u.campo("Caminho", caminho)),
                el("div", { class: "col-12 col-md-4" }, u.campo("Versão", versao))),
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-md-6" }, usaHost.linha, host),
                el("div", { class: "col-md-6" }, usaIms.linha, ims)),
            u.botao("Enviar o pedido", "btn-primary my-2", envia),
            el("div", { class: "row g-2" },
                el("div", { class: "col-md-6" }, el("div", { class: "small text-muted" }, "Pedido do cliente"), pedido),
                el("div", { class: "col-md-6" }, el("div", { class: "small text-muted" }, "Resposta do servidor"), resposta)),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (20 pts): o servidor hospeda web.example.com (com /index.html e /antigo.html) e www.example.net (com /index.html e /contato.html). Obtenha:"),
            lista, fb);
        desenhaMetas();
        envia();
    });

    /* ------------------------------------------------------------------
     * 3. HTTP/1.0 contra conexão persistente (pág. 154–156 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("conexoes-http", function (raiz) {
        var n = faixa("Objetos na página (HTML + imagens)", 1, 4, 1, 3, "");
        var rtt = faixa("RTT", 20, 200, 10, 100, " ms");
        var modo = el("select", { class: "form-select form-select-sm" }, el("option", { value: "10" }, "HTTP/1.0: uma conexão por objeto"), el("option", { value: "11" }, "HTTP/1.1: conexão persistente"));
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });

        function desenha() {
            var N = Number(n.input.value), T = Number(rtt.input.value), ev = [];
            var objs = ["/", "/img1.gif", "/img2.gif", "/img3.gif"];
            if (modo.value === "10") {
                for (var i = 0; i < N; i++) {
                    ev.push({ de: 0, para: 1, rotulo: "SYN (abre)", tipo: "ctrl" }, { de: 1, para: 0, rotulo: "SYN+ACK", tipo: "ctrl" },
                        { de: 0, para: 1, rotulo: "GET " + objs[i] + " HTTP/1.0" }, { de: 1, para: 0, rotulo: "200 OK + documento" }, { nota: 1, rotulo: "fecha a conexão" });
                }
            } else {
                ev.push({ de: 0, para: 1, rotulo: "SYN (abre)", tipo: "ctrl" }, { de: 1, para: 0, rotulo: "SYN+ACK", tipo: "ctrl" });
                for (var j = 0; j < N; j++) {
                    ev.push({ de: 0, para: 1, rotulo: "GET " + objs[j] + " (Connection: Keep-Alive)" }, { de: 1, para: 0, rotulo: "200 OK (Keep-Alive: timeout=15, max=" + (100 - j) + ")" });
                }
            }
            area.replaceChildren(R.diagramaSequencia({ titulo: "Cliente busca " + N + " objetos de um servidor web.", colunas: ["Cliente", "Servidor"], eventos: ev, passo: 26, margem: 150 }));
            var t10 = N * 2 * T, t11 = T + N * T;
            resumo.replaceChildren("Tempo até o último objeto (sem contar transmissão): HTTP/1.0 = ", el("strong", null, N + " × 2 RTT = " + t10 + " ms"),
                "; persistente = ", el("strong", null, "1 RTT + " + N + " RTT = " + t11 + " ms"), ". Diferença: " + (t10 - t11) + " ms.");
        }
        [n.input, rtt.input, modo].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });

        var resp = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Diferença em milissegundos" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "http-persistente", 10, "Calcular o ganho da conexão persistente");
        raiz.append(el("div", { class: "row g-2" },
            el("div", { class: "col-md-4" }, n.linha), el("div", { class: "col-md-4" }, rtt.linha), el("div", { class: "col-md-4" }, u.campo("Modo", modo))),
            area, resumo,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): uma página tem 20 objetos e o RTT é 50 ms. Quantos milissegundos o HTTP/1.0 gasta a mais do que a conexão persistente (no mesmo modelo, sem transmissão)?"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === 950;
                u.marca(fb, ok, ok ? "Isso: 20 × 2 × 50 = 2000 ms contra 50 + 20 × 50 = 1050 ms." : "Ainda não. HTTP/1.0: N × 2 RTT; persistente: 1 RTT + N RTT.");
                if (ok) concluir();
            })), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 4. Cookies e rastreamento (pág. 157–158 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("cookies", function (raiz) {
        var SITES = ["noticias.example", "loja.example", "blog.example"];
        var bloqueia = caixa("Bloquear cookies de terceiros no navegador", false);
        var pote = {}, registroAnuncios = {}, contador = 0, vistos = {};
        var jarra = el("ul", { class: "small mb-2" });
        var log = el("ul", { class: "log mt-2" });
        var anuncios = el("div", { class: "small mt-2", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "cookies-rastreio", 15, "Ver um anunciante rastrear visitas e o bloqueio de cookies de terceiros");

        function desenha() {
            jarra.replaceChildren();
            var chaves = Object.keys(pote);
            if (!chaves.length) jarra.append(el("li", { class: "text-muted" }, "nenhum cookie guardado"));
            chaves.forEach(function (d) { jarra.append(el("li", { class: "mono" }, d + " → " + pote[d])); });
            var ids = Object.keys(registroAnuncios);
            anuncios.replaceChildren(el("strong", null, "O que anuncios.example sabe: "),
                ids.length ? el("ul", { class: "mb-0" }, ids.map(function (id) { return el("li", { class: "mono" }, id + " visitou " + registroAnuncios[id].join(", ")); })) : "nada ainda.");
        }
        function linha(t, classe) { log.append(el("li", { class: classe || null }, t)); log.scrollTop = log.scrollHeight; }
        function visita(site) {
            linha("GET / HTTP/1.1  Host: " + site + (pote[site] ? "  Cookie: " + pote[site] : ""));
            if (!pote[site]) { pote[site] = "sessao=" + site.split(".")[0]; linha("  ← 200 OK  Set-Cookie: " + pote[site] + " (cookie do próprio site)"); }
            else linha("  ← 200 OK (página com o anúncio de anuncios.example)");
            var terceiro = bloqueia.input.checked;
            var enviado = !terceiro && pote["anuncios.example"];
            linha("GET /banner.gif  Host: anuncios.example  Referer: http://" + site + "/" + (enviado ? "  Cookie: " + pote["anuncios.example"] : ""), "text-muted");
            if (terceiro) {
                linha("  ← 200 OK  Set-Cookie: id=… (o navegador descarta: cookie de terceiro bloqueado)", "text-muted");
                vistos.bloqueio = true;
            } else {
                if (!pote["anuncios.example"]) { contador++; pote["anuncios.example"] = "id=7f3a" + contador; linha("  ← 200 OK  Set-Cookie: " + pote["anuncios.example"], "text-muted"); }
                var id = pote["anuncios.example"];
                registroAnuncios[id] = registroAnuncios[id] || [];
                if (registroAnuncios[id].indexOf(site) < 0) registroAnuncios[id].push(site);
                if (registroAnuncios[id].length >= 3) vistos.rastreio = true;
            }
            desenha();
            if (vistos.rastreio && vistos.bloqueio) { u.marca(fb, true, "Com o mesmo cookie, anuncios.example ligou as visitas aos três sites. Bloqueando os cookies de terceiros, ele deixa de receber o identificador (mas ainda vê o Referer)."); concluir(); }
            else if (vistos.rastreio) { fb.className = "small mt-2 mb-0"; fb.textContent = "anuncios.example já liga três sites a você. Agora ligue o bloqueio e visite um site."; }
        }
        var botoes = el("div", { class: "d-flex flex-wrap gap-2" });
        SITES.forEach(function (s) { botoes.append(u.botao("Visitar " + s, "btn-outline-primary", function () { visita(s); })); });
        botoes.append(u.botao("Apagar cookies", "btn-outline-secondary", function () { pote = {}; log.replaceChildren(); desenha(); }));
        raiz.append(el("p", { class: "small mb-2" }, "Os três sites mostram anúncios de anuncios.example: cada página inclui uma imagem desse servidor."),
            botoes, bloqueia.linha,
            el("div", { class: "row g-2 mt-1" },
                el("div", { class: "col-md-5" }, el("div", { class: "small text-muted" }, "Cookies guardados pelo navegador"), jarra, anuncios),
                el("div", { class: "col-md-7" }, el("div", { class: "small text-muted" }, "Pedidos e respostas"), log)),
            fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça anuncios.example ligar as suas visitas aos três sites; depois, ligue o bloqueio e visite um site de novo."));
        desenha();
    });
}());

/* Etapa "3. Visualização" do conceito web: URI, HTML e HTTP num clique (pág. 148–149 do PDF). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;
    function escolha(rotulo, lista) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            el("option", { value: "" }, "escolha…"), lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    var LINKS = [
        { texto: "a lista de protocolos", uri: "http://docs.example.org/protocolos.html", titulo: "Protocolos", corpo: "Os protocolos da web: o HTTP e os que ele usa." },
        { texto: "o histórico do projeto", uri: "http://www.example.com/historia.html", titulo: "Histórico", corpo: "De mesh a world wide web." }
    ];
    function decompoe(uri) {
        var m = /^([a-z][a-z0-9+.-]*):\/\/([^/:]+)(?::(\d+))?(\/[^?#]*)?/i.exec(uri);
        return m ? { esquema: m[1], host: m[2], porta: m[3] || (m[1] === "http" ? "80" : ""), caminho: m[4] || "/" } : null;
    }
    R.decompoeUri = decompoe;

    R.registrar("tres-pecas", function (raiz) {
        var etapas = el("ol", { class: "small mt-2 mb-0 ps-3" });
        var pre = function (t) { return el("pre", { class: "log mt-1 mb-2", style: "white-space: pre-wrap" }, t); };
        function segue(l) {
            var d = decompoe(l.uri);
            var html = "<html>\n  <head><title>" + l.titulo + "</title></head>\n  <body>\n    <h1>" + l.titulo + "</h1>\n    <p>" + l.corpo + "</p>\n  </body>\n</html>";
            etapas.replaceChildren(
                el("li", null, el("strong", null, "URI: "), "o link aponta para ", el("code", null, l.uri), ". Esquema ", el("code", null, d.esquema), ", host ", el("code", null, d.host), " (porta " + d.porta + "), caminho ", el("code", null, d.caminho), "." +
                    (d.host === "www.example.com" ? " É o mesmo host da página atual." : " É outro host: a novidade da web foi deixar um link apontar para outra máquina.")),
                el("li", null, el("strong", null, "HTTP: "), "o navegador abre uma conexão com " + d.host + " e pede o documento:", pre("GET " + d.caminho + " HTTP/1.1\nHost: " + d.host + "\n\n")),
                el("li", null, el("strong", null, "HTML: "), "o servidor responde com o documento, que o navegador desenha:", pre("HTTP/1.1 200 OK\nContent-Type: text/html\n\n" + html)));
        }
        var pagina = el("div", { class: "border rounded p-2", style: "background: var(--surface)" },
            el("div", { class: "small text-muted mono mb-1" }, "http://www.example.com/index.html"),
            el("div", { class: "fw-semibold" }, "Projeto de documentação"),
            el("p", { class: "small mb-0" }, "Veja ", LINKS.map(function (l, i) {
                return [i ? " e " : "", el("a", { href: "#", onclick: function (ev) { ev.preventDefault(); segue(l); } }, l.texto)];
            }), "."));
        var PAPEIS = [["identifica cada documento sem ambiguidade", "uri"], ["descreve o documento e os seus links", "html"], ["busca o documento no servidor", "http"]];
        var selects = PAPEIS.map(function (p) { return escolha(p[0], [["uri", "URI"], ["html", "HTML"], ["http", "HTTP"]]); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "tres-pecas", 10, "As três peças da web");
        raiz.append(el("p", { class: "small mb-2" }, "Uma página no host www.example.com. Clique num dos links e veja as três peças trabalhando (os nomes de host são do bloco reservado para exemplos, RFC 2606)."),
            pagina, etapas,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): que peça faz cada coisa?"),
            el("div", null, PAPEIS.map(function (p, i) { return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, p[0]), el("div", { class: "col-sm-5" }, selects[i])); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = PAPEIS.filter(function (p, i) { return selects[i].value === p[1]; }).length;
                u.marca(fb, certas === 3, certas === 3 ? "Isso: endereço (URI), formato (HTML) e protocolo (HTTP)." : certas + " de 3. Clique num link e veja o papel de cada peça.");
                if (certas === 3) concluir();
            }), fb);
        segue(LINKS[0]);
    });
}());
