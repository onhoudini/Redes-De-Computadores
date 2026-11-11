/* Simulações do Capítulo 10 — A web e as chamadas remotas (seções 3.4 a 3.6 do livro).
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

    /* ------------------------------------------------------------------
     * 5. Proxy numa pequena empresa (pág. 159 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("proxy-cache", function (raiz) {
        var OBJ = { "jornal.example/": 120, "jornal.example/foto.jpg": 900, "tempo.example/": 60, "banco.example/": 200, "video.example/aula.mp4": 4000, "jornal.example/esporte": 150 };
        var nomes = Object.keys(OBJ);
        var sorteio = u.aleatorio(42);
        var PEDIDOS = [];
        var PESOS = [5, 4, 3, 2, 1, 2];
        for (var i = 0; i < 30; i++) {
            var x = sorteio() * 17, k = 0;
            while (x > PESOS[k]) { x -= PESOS[k]; k++; }
            PEDIDOS.push(nomes[k]);
        }
        var usaProxy = caixa("Usar o proxy da empresa", true);
        var tabela = el("div", { class: "small mt-2", "aria-live": "polite" });
        var fb = u.feedback(), feitos = {};
        var concluir = R.desafio(raiz, "proxy-economia", 10, "Comparar o tráfego no enlace lento com e sem proxy");
        function roda() {
            var cache = {}, pelo = 0, kb = 0, acertos = 0;
            PEDIDOS.forEach(function (p) {
                if (usaProxy.input.checked && cache[p]) { acertos++; return; }
                cache[p] = true; pelo++; kb += OBJ[p];
            });
            var segundos = kb * 8 / 2000;
            feitos[usaProxy.input.checked ? "com" : "sem"] = { pelo: pelo, kb: kb, s: segundos };
            tabela.replaceChildren(el("table", { class: "table table-sm mb-0" },
                el("thead", null, el("tr", null, el("th", null, ""), el("th", null, "Pedidos pelo enlace"), el("th", null, "kB pelo enlace"), el("th", null, "Tempo a 2 Mbit/s"))),
                el("tbody", null, ["sem", "com"].filter(function (m) { return feitos[m]; }).map(function (m) {
                    var f = feitos[m];
                    return el("tr", null, el("td", null, m === "com" ? "Com proxy" : "Sem proxy"), el("td", null, String(f.pelo) + " de 30"), el("td", null, num(f.kb)), el("td", null, num(f.s, 1) + " s"));
                }))));
            if (usaProxy.input.checked) fb.textContent = acertos + " dos 30 pedidos foram atendidos pelo cache do proxy, sem usar o enlace lento.";
            else fb.textContent = "Sem proxy, cada navegador busca tudo pelo enlace lento (o cache de cada navegador ajuda só a ele mesmo).";
            fb.className = "small mt-2 mb-0";
            if (feitos.com && feitos.sem) {
                var eco = Math.round(100 * (1 - feitos.com.kb / feitos.sem.kb));
                u.marca(fb, true, "Com o proxy, o enlace lento carrega " + eco + "% menos dados: a mesma página baixada por várias pessoas só passa uma vez.");
                concluir();
            }
        }
        raiz.append(el("p", { class: "small mb-2" }, "Doze funcionários fazem 30 pedidos durante a manhã. A empresa sai para a Internet por um enlace de 2 Mbit/s."),
            usaProxy.linha, u.botao("Rodar os 30 pedidos", "btn-primary mt-2", roda), tabela, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): rode os pedidos sem proxy e com proxy e compare."));
    });

    /* ------------------------------------------------------------------
     * 6. Pedidos em sequência contra pipelining (pág. 161–162 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("pipelining", function (raiz) {
        var modo = el("select", { class: "form-select form-select-sm" }, el("option", { value: "seq" }, "Um pedido de cada vez"), el("option", { value: "pipe" }, "Pipelining"));
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function desenha() {
            var ev = [];
            if (modo.value === "seq") {
                for (var i = 0; i < 5; i++) {
                    ev.push({ de: 0, para: 1, rotulo: "GET /obj" + (i + 1), t0: i * 3, t1: i * 3 + 1.5 });
                    ev.push({ de: 1, para: 0, rotulo: "objeto " + (i + 1), t0: i * 3 + 1.5, t1: i * 3 + 3 });
                }
                ev.push({ nota: 0, rotulo: "1000 ms", t: 14.5 });
                resumo.textContent = "Cada pedido espera a resposta anterior: 5 × 200 ms = 1000 ms (o exemplo do livro: 100 ms em cada sentido, 1 Gbit/s, objetos de 100 bytes).";
            } else {
                for (var j = 0; j < 5; j++) ev.push({ de: 0, para: 1, rotulo: "GET /obj" + (j + 1), t0: j * 0.45, t1: j * 0.45 + 1.5 });
                for (var k = 0; k < 5; k++) ev.push({ de: 1, para: 0, rotulo: "objeto " + (k + 1), t0: 1.5 + k * 0.45, t1: 3 + k * 0.45 });
                ev.push({ nota: 0, rotulo: "≈ 200 ms", t: 4.5 });
                resumo.textContent = "Os cinco pedidos saem juntos, e as respostas chegam uma atrás da outra: cerca de 200 ms no total, cinco vezes menos.";
            }
            area.replaceChildren(R.diagramaSequencia({ titulo: modo.value === "seq" ? "Cinco pedidos HTTP, um de cada vez." : "Cinco pedidos HTTP com pipelining.", colunas: ["Cliente", "Servidor"], eventos: ev, passo: 22, margem: 150 }));
        }
        modo.addEventListener("change", desenha);
        raiz.append(u.campo("Modo", modo), area, resumo);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 7. Quadros do HTTP/2 e o bloqueio do primeiro da fila (pág. 162–164 do PDF)
     * ------------------------------------------------------------------ */
    function agendaHttp2(f, cabecalho) {
        var LONGO = 12500, CURTO = 125, H = cabecalho ? 9 : 0, quadros = [];
        var restaLongo = LONGO;
        var primeiro = Math.min(f, restaLongo);
        quadros.push({ obj: "longo", bytes: primeiro }); restaLongo -= primeiro;
        var restaCurto = CURTO;
        while (restaCurto > 0) { var c = Math.min(f, restaCurto); quadros.push({ obj: "curto", bytes: c }); restaCurto -= c; }
        while (restaLongo > 0) { var l = Math.min(f, restaLongo); quadros.push({ obj: "longo", bytes: l }); restaLongo -= l; }
        var t = 0, chegadaCurto = 0, cab = 0, total = 0;
        quadros.forEach(function (q) {
            q.inicio = t; t += (q.bytes + H) * 8 / 1e6; q.fim = t;
            cab += H; total += q.bytes + H;
            if (q.obj === "curto") chegadaCurto = t;
        });
        return { quadros: quadros, curto: chegadaCurto * 1000, fim: t * 1000, custo: total ? 100 * cab / total : 0 };
    }
    R.agendaHttp2 = agendaHttp2;

    R.registrar("hol-http2", function (raiz) {
        var f = faixa("Tamanho máximo do quadro (bytes de dados)", 100, 12500, 50, 12500, " bytes");
        var cab = caixa("Contar o cabeçalho de 9 bytes de cada quadro", true);
        var barra = el("div", { class: "d-flex mt-2", style: "height:28px;border:1px solid var(--line);border-radius:6px;overflow:hidden", role: "img" });
        var resumo = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "http2-quadro", 15, "Escolher um tamanho de quadro para o HTTP/2");
        function desenha() {
            var a = agendaHttp2(Number(f.input.value), cab.input.checked);
            barra.replaceChildren();
            barra.setAttribute("aria-label", a.quadros.length + " quadros; o objeto curto chega em " + num(a.curto, 1) + " ms.");
            a.quadros.forEach(function (q) {
                var largura = 100 * (q.fim - q.inicio) / (a.fim / 1000);
                barra.append(el("div", { title: q.obj + ": " + q.bytes + " bytes", style: "width:" + largura + "%;border-right:1px solid var(--bs-body-bg, #fff);background:" + (q.obj === "curto" ? "#d63384" : "#6ea8fe") }));
            });
            resumo.replaceChildren(el("span", { style: "color:#6ea8fe", "aria-hidden": "true" }, "■"), " objeto longo (12 500 bytes)  ", el("span", { style: "color:#d63384", "aria-hidden": "true" }, "■"), " objeto curto (125 bytes) · ",
                a.quadros.length + " quadros · o objeto curto chega em ", el("strong", null, num(a.curto, 1) + " ms"), " · cabeçalhos = ", el("strong", null, num(a.custo, 2) + "%"), " dos bytes enviados (1 Mbit/s).");
        }
        [f.input, cab.input].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        function confere() {
            var a = agendaHttp2(Number(f.input.value), true);
            var ok = a.curto <= 12 && a.custo < 1;
            u.marca(fb, ok, ok ? "Equilíbrio encontrado: o curto chega em " + num(a.curto, 1) + " ms e os cabeçalhos custam " + num(a.custo, 2) + "%."
                : a.curto > 12 ? "O objeto curto ainda espera demais (" + num(a.curto, 1) + " ms): diminua o quadro." : "Quadros pequenos demais: os cabeçalhos já custam " + num(a.custo, 2) + "%. Aumente o quadro.");
            if (ok) concluir();
        }
        raiz.append(f.linha, cab.linha, barra, resumo,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): com o cabeçalho de 9 bytes contado, escolha um tamanho de quadro em que o objeto curto chegue em até 12 ms e os cabeçalhos custem menos de 1% dos bytes."),
            u.botao("Conferir", "btn-primary", confere), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 8. XDR contra JSON (pág. 166–168 do PDF)
     * ------------------------------------------------------------------ */
    function xdrInt(n) { var b = []; var v = n >>> 0; for (var i = 3; i >= 0; i--) b.push((v >>> (i * 8)) & 255); return b; }
    function xdr(tipo, valor) {
        var partes = [];
        if (tipo === "int") partes.push({ papel: "inteiro", bytes: xdrInt(valor) });
        else if (tipo === "texto") {
            var dados = Array.from(new TextEncoder().encode(valor));
            partes.push({ papel: "tamanho", bytes: xdrInt(dados.length) }, { papel: "dados", bytes: dados });
            var ench = (4 - dados.length % 4) % 4;
            if (ench) partes.push({ papel: "enchimento", bytes: new Array(ench).fill(0) });
        } else {
            partes.push({ papel: "n", bytes: xdrInt(valor.length) });
            valor.forEach(function (v) { partes.push({ papel: "elemento", bytes: xdrInt(v) }); });
        }
        return partes;
    }
    R.xdr = function (tipo, valor) { return xdr(tipo, valor).reduce(function (s, p) { return s.concat(p.bytes); }, []); };

    R.registrar("xdr-vs-json", function (raiz) {
        var tipo = el("select", { class: "form-select form-select-sm" }, el("option", { value: "lista" }, "lista de inteiros"), el("option", { value: "texto" }, "texto"), el("option", { value: "int" }, "inteiro"));
        var valor = entrada("2, 3, 5, 7", "Valor");
        var bytesX = el("div", { class: "d-flex flex-wrap mt-2" });
        var saida = el("pre", { class: "log mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "xdr-json", 15, "Comparar o tamanho de XDR e JSON");
        function interpreta() {
            var t = tipo.value, v = valor.value;
            if (t === "texto") return { ok: true, v: v, json: JSON.stringify(v) };
            if (t === "int") {
                var n = Number(v.trim());
                if (!/^-?\d+$/.test(v.trim()) || n < -2147483648 || n > 2147483647) return { ok: false };
                return { ok: true, v: n, json: JSON.stringify(n) };
            }
            var itens = v.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
            if (!itens.length || itens.some(function (x) { return !/^-?\d+$/.test(x) || Number(x) < -2147483648 || Number(x) > 2147483647; })) return { ok: false };
            var lista = itens.map(Number);
            return { ok: true, v: lista, json: JSON.stringify(lista) };
        }
        function mostra() {
            var r = interpreta();
            bytesX.replaceChildren();
            if (!r.ok) { saida.textContent = "Valor inválido: use inteiros de 32 bits (de -2147483648 a 2147483647), separados por vírgula na lista."; return; }
            var partes = xdr(tipo.value === "lista" ? "lista" : tipo.value, r.v), total = 0;
            partes.forEach(function (p) {
                p.bytes.forEach(function (b, i) {
                    total++;
                    var classe = p.papel === "enchimento" ? "muted" : p.papel === "tamanho" || p.papel === "n" ? "ctrl" : "";
                    bytesX.append(el("span", { class: "byte-cell " + classe, style: "min-width:2rem" }, hex2(b), i === 0 ? el("small", null, p.papel) : el("small", null, " ")));
                });
            });
            var j = new TextEncoder().encode(r.json).length;
            saida.textContent = "XDR:  " + total + " bytes\nJSON: " + j + " bytes  " + r.json;
            if (tipo.value === "lista") {
                if (total > j) vistos.maior = true;
                if (total < j) vistos.menor = true;
            }
            if (vistos.maior && vistos.menor) { u.marca(fb, true, "Você achou os dois casos: números pequenos ocupam poucos caracteres em JSON, mas sempre 4 bytes em XDR; números grandes, o contrário."); concluir(); }
            else if (tipo.value === "lista") { fb.className = "small mt-2 mb-0"; fb.textContent = (vistos.maior ? "✔ XDR maior que JSON. " : "") + (vistos.menor ? "✔ XDR menor que JSON. " : ""); }
        }
        [tipo, valor].forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });
        tipo.addEventListener("change", function () { valor.value = tipo.value === "lista" ? "2, 3, 5, 7" : tipo.value === "texto" ? "redes" : "1"; mostra(); });
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-sm-4" }, u.campo("Tipo", tipo)), el("div", { class: "col-sm-8" }, u.campo("Valor", valor))),
            el("p", { class: "small text-muted mb-0" }, "Bytes do XDR: amarelo = tamanho ou número de elementos; cinza = enchimento até múltiplo de 4."),
            bytesX, saida, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): com o tipo \"lista de inteiros\", ache uma lista em que o XDR ocupe mais bytes que o JSON e outra em que ocupe menos."));
        mostra();
    });

    /* ------------------------------------------------------------------
     * 9. JSON-RPC, perdas e pedidos repetidos (pág. 168–169 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("json-rpc", function (raiz) {
        var perde = caixa("A rede perde a próxima resposta", false);
        var lembra = caixa("O servidor lembra os ids já atendidos", false);
        var saldo = 100, proximoId = 1, ultimo = null, atendidos = {}, vistos = {}, depositosDoId = {};
        var log = el("ul", { class: "log mt-2" });
        var estado = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "rpc-repetido", 15, "Ver um depósito duplicado e evitá-lo com o id");
        function linha(t, classe) { log.append(el("li", { class: classe || null }, t)); log.scrollTop = log.scrollHeight; }
        function atende(p) {
            if (lembra.input.checked && atendidos[p.id]) { linha("   servidor: id " + p.id + " já foi atendido; repete a resposta sem executar de novo", "text-muted"); return atendidos[p.id]; }
            var r;
            if (p.method === "sum") r = { jsonrpc: "2.0", result: p.params[0] + p.params[1], id: p.id };
            else if (p.method === "deposit") {
                saldo += p.params[0]; r = { jsonrpc: "2.0", result: saldo, id: p.id };
                depositosDoId[p.id] = (depositosDoId[p.id] || 0) + 1;
            } else r = { jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: p.id };
            atendidos[p.id] = r;
            return r;
        }
        function envia(p, repetido) {
            ultimo = p;
            linha("→ " + JSON.stringify(p) + (repetido ? "  (reenvio)" : ""));
            var r = atende(p);
            if (perde.input.checked) { perde.input.checked = false; linha("← (resposta perdida na rede)", "text-danger"); }
            else linha("← " + JSON.stringify(r));
            estado.textContent = "Saldo da conta no servidor: " + saldo;
            if (p.method === "deposit" && repetido) {
                if (depositosDoId[p.id] >= 2) vistos.duplicado = true;
                else if (lembra.input.checked) vistos.evitado = true;
            }
            if (vistos.duplicado && vistos.evitado) { u.marca(fb, true, "Sem memória dos ids, o reenvio deposita duas vezes; lembrando os ids, o servidor só repete a resposta."); concluir(); }
            else if (vistos.duplicado) { fb.className = "small mt-2 mb-0"; fb.textContent = "O depósito foi feito duas vezes! Agora ligue \"o servidor lembra os ids\" e repita a experiência."; }
        }
        function novo(metodo, params) { envia({ jsonrpc: "2.0", method: metodo, params: params, id: proximoId++ }, false); }
        raiz.append(
            el("div", { class: "d-flex flex-wrap gap-3" }, perde.linha, lembra.linha),
            el("div", { class: "d-flex flex-wrap gap-2 mt-2" },
                u.botao("sum(1, 3)", "btn-outline-primary mono", function () { novo("sum", [1, 3]); }),
                u.botao("deposit(50)", "btn-outline-primary mono", function () { novo("deposit", [50]); }),
                u.botao("mul(2, 3)", "btn-outline-primary mono", function () { novo("mul", [2, 3]); }),
                u.botao("Reenviar o último pedido (mesmo id)", "btn-outline-secondary", function () { if (ultimo) envia(ultimo, true); })),
            log, estado, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça um depósito cuja resposta se perca e reenvie o pedido. Depois, repita com o servidor lembrando os ids."));
        estado.textContent = "Saldo da conta no servidor: " + saldo;
    });
}());
