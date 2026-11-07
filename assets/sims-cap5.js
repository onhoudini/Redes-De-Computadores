/* Simulações do Capítulo 5 — Nomes e endereços. Cada uma é registrada em Redes.registrar. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, svg = u.svg;

    function fmt(n) { return n.toLocaleString("pt-BR"); }
    function bytesLegivel(b) {
        if (b >= 1e9) return (b / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " GB";
        if (b >= 1e6) return (b / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " MB";
        if (b >= 1e3) return (b / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " kB";
        return b + " B";
    }

    /* ------------------------------------------------------------------
     * 1. O arquivo hosts.txt e o espaço de nomes plano
     * ------------------------------------------------------------------ */
    R.registrar("hosts-txt", function (raiz) {
        var tabela = [
            ["10.0.0.73", "sri-nic"], ["10.1.0.51", "mit-multics"],
            ["10.3.0.11", "ucla-ccn"], ["10.2.0.5", "utah-cs"]
        ];
        var versao = 1, colidiu = false, registrou = false;
        var concluir = R.desafio(raiz, "hosts-colisao", 15, "Colidir e registrar no hosts.txt");

        var nome = el("input", { class: "form-control form-control-sm mono", value: "mit-multics", maxlength: 24 });
        var registrar = u.botao("Registrar no NIC", "btn-primary", tentar);
        var fb = u.feedback();
        var arquivo = el("pre", { class: "log mb-0", "aria-live": "polite" });

        function desenhaArquivo() {
            arquivo.textContent = "# hosts.txt — versão " + versao + " (" + tabela.length + " hosts)\n" +
                tabela.map(function (l) { return l[0].padEnd(13) + l[1]; }).join("\n");
        }

        function tentar() {
            var n = nome.value.trim().toLowerCase();
            if (!/^[a-z][a-z0-9-]*$/.test(n)) {
                u.marca(fb, false, "Use letras, dígitos e hífen, começando por letra.");
                return;
            }
            var existe = tabela.some(function (l) { return l[1] === n; });
            if (existe) {
                colidiu = true;
                u.marca(fb, false, "“" + n + "” já está registrado. No espaço de nomes plano, cada nome precisa ser único na rede inteira.");
            } else {
                tabela.push(["10." + (tabela.length % 8) + ".0." + (20 + tabela.length), n]);
                versao++;
                registrou = true;
                u.marca(fb, true, "O NIC publicou a versão " + versao + ". Cada um dos " + tabela.length + " hosts precisa baixar o arquivo inteiro de novo.");
            }
            desenhaArquivo();
            if (colidiu && registrou) concluir();
        }

        // Escala: cada atualização faz todos os hosts baixarem o arquivo inteiro.
        var ESCALAS = [100, 500, 5000, 50000, 1000000];
        var escala = el("input", { type: "range", class: "form-range", min: 0, max: ESCALAS.length - 1, step: 1, value: 1 });
        var escalaTxt = el("div", { class: "small", "aria-live": "polite" });
        function atualizaEscala() {
            var n = ESCALAS[Number(escala.value)];
            var tamanho = n * 30;
            escalaTxt.replaceChildren(
                el("p", { class: "mb-1" }, el("strong", null, fmt(n) + " hosts"), n === 500 ? " (o tamanho da Internet em 1983)" : ""),
                el("p", { class: "mb-1" }, "Arquivo: ≈ " + bytesLegivel(tamanho) + " · transferido em cada atualização: ≈ " + bytesLegivel(n * tamanho)),
                el("div", { class: "barra-carga", style: "width:" + Math.max(1, Math.min(100, Math.log10(n * tamanho) / Math.log10(3e13) * 100)) + "%" }));
        }
        escala.addEventListener("input", atualizaEscala);
        escala.setAttribute("aria-label", "Número de hosts na rede");

        raiz.append(
            el("div", { class: "row g-3" },
                el("div", { class: "col-md-6" },
                    u.campo("Nome do novo host", nome), registrar, fb),
                el("div", { class: "col-md-6" }, arquivo)),
            el("hr"),
            el("p", { class: "small fw-semibold mb-1" }, "E se a rede crescer?"),
            escala, escalaTxt,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Estimativa com 30 bytes por linha. Endereços e nomes são ilustrativos."),
            el("p", { class: "small text-muted mt-1 mb-0" }, "Desafio (15 pts): tente registrar um nome que já existe e depois registre um nome livre (livro, pág. 77 do PDF)."));
        desenhaArquivo();
        atualizaEscala();
    });

    /* ------------------------------------------------------------------
     * 2. A árvore de nomes de domínio (Fig. 53)
     * ------------------------------------------------------------------ */
    var ARVORE = {
        rotulo: "", filhos: [
            { rotulo: "edu", filhos: [{ rotulo: "ucla" }, { rotulo: "mit" }] },
            { rotulo: "fr" }, { rotulo: "tv" },
            { rotulo: "com", filhos: [{ rotulo: "google" }, { rotulo: "sun" }, { rotulo: "apple" }] },
            { rotulo: "org" }, { rotulo: "net" },
            { rotulo: "be", filhos: [{ rotulo: "uclouvain", filhos: [{ rotulo: "www" }] }] },
            { rotulo: "in" }, { rotulo: "ca" },
            { rotulo: "info", filhos: [{ rotulo: "computer-networking", filhos: [{ rotulo: "www" }, { rotulo: "blog" }] }] }
        ]
    };

    R.registrar("arvore-dominios", function (raiz) {
        var LARG = 720;
        var NIVEL_Y = [26, 96, 166, 236];
        var nos = [];          // {no, pai, x, y, nome, grupo, aresta}
        var concluir = R.desafio(raiz, "arvore-hosts", 15, "Encontrar os três hosts da árvore");
        var achados = {};
        var ALVOS = ["www.uclouvain.be", "www.computer-networking.info", "blog.computer-networking.info"];

        // Posições como na Fig. 53: TLDs espaçados; filhos centrados sob o pai.
        ARVORE.x = LARG / 2; ARVORE.y = NIVEL_Y[0];
        ARVORE.filhos.forEach(function (tld, i) {
            tld.x = 50 + i * 68; tld.y = NIVEL_Y[1];
            (tld.filhos || []).forEach(function (f, j, lista) {
                var largura = f.rotulo.length > 10 ? 0 : 52;
                f.x = tld.x + (j - (lista.length - 1) / 2) * largura - (f.rotulo.length > 10 ? 22 : 0);
                f.y = NIVEL_Y[2];
                (f.filhos || []).forEach(function (g, k, l2) {
                    g.x = f.x + (k - (l2.length - 1) / 2) * 56; g.y = NIVEL_Y[3];
                });
            });
        });

        var desenho = svg("svg", { viewBox: "0 0 " + LARG + " 262", class: "sim-svg w-100", style: "max-height:300px" });
        desenho.appendChild(svg("title", { text: "Árvore de nomes de domínio da Fig. 53: a raiz no topo; abaixo, os domínios de topo edu, fr, tv, com, org, net, be, in, ca e info; abaixo deles, ucla e mit em edu, google, sun e apple em com, uclouvain em be (com o host www) e computer-networking em info (com os hosts www e blog)." }));
        var gArestas = svg("g"), gNos = svg("g");
        desenho.append(gArestas, gNos);

        function nomeCompleto(n) {
            var partes = [];
            for (var p = n; p && p.rotulo; p = p.pai) partes.push(p.rotulo);
            return partes.join(".");
        }

        function monta(n, pai) {
            n.pai = pai;
            if (pai) {
                n.aresta = svg("line", { x1: pai.x, y1: pai.y + 10, x2: n.x, y2: n.y - 11, class: "linha" });
                gArestas.appendChild(n.aresta);
            }
            var texto = n.rotulo || "raiz";
            var w = texto.length * 7 + 14;
            n.caixa = svg("rect", { x: n.x - w / 2, y: n.y - 11, width: w, height: 22, rx: 11, class: "no" });
            var t = svg("text", { x: n.x, y: n.y + 4, "text-anchor": "middle", "font-size": 12 }, texto);
            var g = svg("g", { tabindex: 0, role: "button", style: "cursor:pointer", "aria-label": n.rotulo ? "Nó " + nomeCompleto(n) : "Raiz" }, n.caixa, t);
            g.addEventListener("click", function () { seleciona(n); });
            g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); seleciona(n); } });
            gNos.appendChild(g);
            nos.push(n);
            (n.filhos || []).forEach(function (f) { monta(f, n); });
        }
        monta(ARVORE, null);

        var entrada = el("input", { class: "form-control form-control-sm mono", placeholder: "ex.: www.computer-networking.info" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var progresso = el("p", { class: "small text-muted mb-0" });

        function limpa() {
            nos.forEach(function (n) {
                n.caixa.setAttribute("class", "no");
                if (n.aresta) n.aresta.setAttribute("class", "linha");
            });
        }

        function seleciona(n) {
            limpa();
            var caminho = [];
            for (var p = n; p; p = p.pai) {
                caminho.push(p);
                p.caixa.setAttribute("class", "no no-ativo");
                if (p.aresta) p.aresta.setAttribute("class", "linha-ativa");
            }
            if (!n.rotulo) {
                saida.replaceChildren(el("p", { class: "mb-0" }, "A raiz não tem rótulo. Ela fica implícita à direita de todo nome totalmente qualificado."));
                return;
            }
            var nome = nomeCompleto(n);
            entrada.value = nome;
            var ehHost = !n.filhos && n.y === NIVEL_Y[3];
            var partes = caminho.filter(function (p) { return p.rotulo; }).map(function (p, i, lista) {
                var papel = i === lista.length - 1 ? "domínio de topo" : i === 0 && ehHost ? "host" : "domínio";
                return el("li", null, el("span", { class: "mono fw-semibold" }, p.rotulo), " — " + papel);
            });
            saida.replaceChildren(
                el("p", { class: "mb-1" }, "Nome totalmente qualificado: ", el("span", { class: "mono fw-semibold" }, nome)),
                el("ul", { class: "mb-1" }, partes),
                el("p", { class: "mb-0 text-muted" }, "Leitura da esquerda para a direita: do " + (ehHost ? "host" : "domínio") + " até o domínio de topo; a raiz fica implícita à direita."));
            if (ALVOS.indexOf(nome) >= 0) {
                achados[nome] = true;
                var k = Object.keys(achados).length;
                progresso.textContent = "Hosts encontrados: " + k + " de 3.";
                if (k === 3) concluir();
            }
        }

        function procura() {
            var texto = entrada.value.trim().toLowerCase().replace(/\.$/, "");
            if (!texto) return;
            var rotulos = texto.split(".").reverse();
            var atual = ARVORE, casou = [];
            for (var i = 0; i < rotulos.length; i++) {
                var prox = (atual.filhos || []).filter(function (f) { return f.rotulo === rotulos[i]; })[0];
                if (!prox) break;
                atual = prox; casou.push(rotulos[i]);
            }
            if (casou.length === rotulos.length) { seleciona(atual); return; }
            limpa();
            saida.replaceChildren(el("p", { class: "quiz-no mb-0" },
                casou.length === 0
                    ? "O domínio de topo “" + rotulos[0] + "” não aparece na figura (ela mostra só alguns)."
                    : "A figura vai até “" + casou.slice().reverse().join(".") + "”, mas não tem “" + rotulos[casou.length] + "” dentro dele."));
        }
        entrada.addEventListener("change", procura);

        raiz.append(desenho,
            el("div", { class: "row g-2 align-items-end mt-1" },
                el("div", { class: "col-sm-8" }, u.campo("Ou digite um nome", entrada)),
                el("div", { class: "col-sm-4 mb-2" }, u.botao("Localizar na árvore", "btn-outline-primary", procura))),
            saida, progresso,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Clique num nó para montar o nome. Desafio (15 pts): encontre os três nomes de host da figura, as folhas do último nível (livro, pág. 77–78 do PDF)."));
    });

    /* ------------------------------------------------------------------
     * 3. Validador de nomes pela BNF da Listing 1 (RFC 1035)
     * ------------------------------------------------------------------ */
    function validaFQDN(nome) {
        var passos = [];
        if (!nome) return { ok: false, passos: [{ ok: false, texto: "Nome vazio." }] };
        var rotulos = nome.split(".");
        passos.push({ ok: true, texto: "subdomain: " + rotulos.length + " rótulo(s) separados por “.”" });
        for (var i = 0; i < rotulos.length; i++) {
            var r = rotulos[i];
            if (r === "") { passos.push({ ok: false, texto: "Rótulo " + (i + 1) + " vazio: dois pontos seguidos ou ponto numa ponta." }); return { ok: false, passos: passos }; }
            if (!/^[A-Za-z]/.test(r)) { passos.push({ ok: false, texto: "“" + r + "”: label precisa começar com letter (o primeiro caractere é “" + r[0] + "”)." }); return { ok: false, passos: passos }; }
            var ruim = r.match(/[^A-Za-z0-9-]/);
            if (ruim) { passos.push({ ok: false, texto: "“" + r + "”: “" + ruim[0] + "” não é letter, digit nem “-” (let-dig-hyp)." }); return { ok: false, passos: passos }; }
            if (/-$/.test(r)) { passos.push({ ok: false, texto: "“" + r + "”: label precisa terminar com let-dig, não com “-”." }); return { ok: false, passos: passos }; }
            if (r.length > 63) { passos.push({ ok: false, texto: "“" + r.slice(0, 12) + "…”: " + r.length + " caracteres; a RFC 1035 limita o rótulo a 63 (complemento)." }); return { ok: false, passos: passos }; }
            passos.push({ ok: true, texto: "“" + r + "”: letter, depois let-dig-hyp, termina em let-dig" });
        }
        return { ok: true, passos: passos };
    }

    R.registrar("validador-fqdn", function (raiz) {
        var entrada = el("input", { class: "form-control form-control-sm mono", value: "www.computer-networking.info" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        function render() {
            var r = validaFQDN(entrada.value.trim());
            saida.replaceChildren(
                el("p", { class: "fw-semibold mb-1 " + (r.ok ? "quiz-ok" : "quiz-no") }, r.ok ? "✔ Válido pela BNF." : "✘ Inválido pela BNF."),
                el("ul", { class: "mb-0" }, r.passos.map(function (p) { return el("li", { class: p.ok ? "" : "quiz-no" }, (p.ok ? "✓ " : "✗ ") + p.texto); })));
        }
        entrada.addEventListener("input", render);

        var casos = ["mail.uclouvain.be", "3com.com", "meu_site.org", "a..b.com", "servidor-.edu", "h3.a.sdom1.dom"];
        var concluir = R.desafio(raiz, "fqdn-classificar", 20, "Classificar seis nomes pela BNF");
        var acertos = {};
        var lista = el("div", { class: "d-grid gap-2" });
        var fb = u.feedback();
        casos.forEach(function (caso, i) {
            var certo = validaFQDN(caso).ok;
            var linhaFb = el("span", { class: "small" });
            function responde(valido) {
                if (valido === certo) {
                    acertos[i] = true;
                    linhaFb.className = "small quiz-ok";
                    linhaFb.textContent = "✔ " + (certo ? "válido" : "inválido: " + validaFQDN(caso).passos.filter(function (p) { return !p.ok; })[0].texto);
                } else {
                    delete acertos[i];
                    linhaFb.className = "small quiz-no";
                    linhaFb.textContent = "✘ Confira de novo: cole o nome no validador acima.";
                }
                if (Object.keys(acertos).length === casos.length) { u.marca(fb, true, "Os seis nomes foram classificados corretamente."); concluir(); }
            }
            lista.appendChild(el("div", { class: "ordem-item flex-wrap" },
                el("span", { class: "mono" }, caso),
                u.botao("Válido", "btn-outline-success", function () { responde(true); }, "Classificar " + caso + " como válido"),
                u.botao("Inválido", "btn-outline-danger", function () { responde(false); }, "Classificar " + caso + " como inválido"),
                el("div", { class: "w-100" }, linhaFb)));
        });

        raiz.append(u.campo("Nome totalmente qualificado", entrada), saida, el("hr"),
            el("p", { class: "small text-muted mb-2" }, "Desafio (20 pts): classifique cada nome pela BNF do livro (pág. 78 do PDF)."),
            lista, fb);
        render();
    });

    /* ------------------------------------------------------------------
     * 4. Nomes internacionalizados e ataque homógrafo
     * ------------------------------------------------------------------ */
    // Nomes de alguns caracteres que aparecem nos exemplos; os demais mostram só o código.
    var NOMES_CHAR = {
        "O": "letra O maiúscula", "0": "dígito zero", "o": "letra o minúscula", "о": "letra o cirílica",
        "l": "letra l minúscula", "1": "dígito um", "a": "letra a minúscula", "а": "letra a cirílica",
        "I": "letra I maiúscula"
    };
    function codigo(c) { return "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"); }
    function paraASCII(nome) {
        try { return new URL("http://" + nome + "/").hostname; } catch (_) { return "(nome inválido)"; }
    }

    R.registrar("homografo", function (raiz) {
        var a = el("input", { class: "form-control form-control-sm mono", value: "GOOGLE.COM" });
        var b = el("input", { class: "form-control form-control-sm mono", value: "G00GLE.COM" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });

        function render() {
            var xa = Array.from(a.value), xb = Array.from(b.value);
            var n = Math.max(xa.length, xb.length);
            var difs = [];
            var celulas = [];
            for (var i = 0; i < n; i++) {
                var ca = xa[i] || "", cb = xb[i] || "";
                var igual = ca === cb;
                if (!igual) difs.push(i);
                celulas.push(el("span", { class: "byte-cell " + (igual ? "" : "bad") },
                    (ca || "∅") + (igual ? "" : " ≠ " + (cb || "∅")),
                    el("small", null, igual ? codigo(ca) : (ca ? codigo(ca) : "—") + " / " + (cb ? codigo(cb) : "—"))));
            }
            var detalhes = difs.slice(0, 4).map(function (i) {
                var ca = xa[i] || "", cb = xb[i] || "";
                return el("li", null, "posição " + (i + 1) + ": “" + ca + "” " + (ca ? codigo(ca) + (NOMES_CHAR[ca] ? " (" + NOMES_CHAR[ca] + ")" : "") : "") +
                    " × “" + cb + "” " + (cb ? codigo(cb) + (NOMES_CHAR[cb] ? " (" + NOMES_CHAR[cb] + ")" : "") : ""));
            });
            saida.replaceChildren(
                el("div", { class: "mb-2" }, celulas),
                el("p", { class: "fw-semibold mb-1 " + (difs.length ? "quiz-no" : "quiz-ok") },
                    difs.length ? "Sequências diferentes: " + difs.length + " posição(ões) não batem." : "Mesma sequência de caracteres."),
                detalhes.length ? el("ul", { class: "mb-1" }, detalhes) : "",
                el("p", { class: "mb-0" }, "Forma ASCII enviada ao DNS: ",
                    el("span", { class: "mono" }, paraASCII(a.value)), " e ", el("span", { class: "mono" }, paraASCII(b.value))));
        }
        a.addEventListener("input", render);
        b.addEventListener("input", render);

        // Desafio: quais nomes levam ao mesmo servidor que google.com?
        var CANDIDATOS = [
            { nome: "GOOGLE.COM", igual: true, porque: "o DNS não diferencia maiúsculas de minúsculas (RFC 1035, complemento)." },
            { nome: "g00gle.com", igual: false, porque: "os dois “0” são dígitos zero (U+0030)." },
            { nome: "goog1e.com", igual: false, porque: "o “1” é o dígito um (U+0031), não a letra l." },
            { nome: "gооgle.com", igual: false, porque: "os dois “о” são a letra o cirílica (U+043E); em ASCII o nome vira " + paraASCII("gооgle.com") + "." }
        ];
        var concluir = R.desafio(raiz, "homografo-identificar", 15, "Desmascarar nomes homógrafos");
        var acertos = {};
        var lista = el("div", { class: "d-grid gap-2" });
        var fb = u.feedback();
        CANDIDATOS.forEach(function (c, i) {
            var linhaFb = el("span", { class: "small" });
            function responde(igual) {
                if (igual === c.igual) {
                    acertos[i] = true;
                    linhaFb.className = "small quiz-ok";
                    linhaFb.textContent = "✔ " + (c.igual ? "Mesmo nome: " : "Outro nome: ") + c.porque;
                } else {
                    delete acertos[i];
                    linhaFb.className = "small quiz-no";
                    linhaFb.textContent = "✘ Compare caractere a caractere: copie o nome para o segundo campo acima.";
                    b.value = c.nome; render();
                }
                if (Object.keys(acertos).length === CANDIDATOS.length) { u.marca(fb, true, "Só GOOGLE.COM é o mesmo nome; os outros três são homógrafos."); concluir(); }
            }
            lista.appendChild(el("div", { class: "ordem-item flex-wrap" },
                el("span", { class: "mono" }, c.nome),
                u.botao("Mesmo nome", "btn-outline-success", function () { responde(true); }, c.nome + " é o mesmo nome que google.com"),
                u.botao("Outro nome", "btn-outline-danger", function () { responde(false); }, c.nome + " é outro nome"),
                el("div", { class: "w-100" }, linhaFb)));
        });

        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-sm-6" }, u.campo("Nome 1", a)),
                el("div", { class: "col-sm-6" }, u.campo("Nome 2", b))),
            saida, el("hr"),
            el("p", { class: "small text-muted mb-2" }, "Desafio (15 pts): quais destes nomes levam ao mesmo lugar que google.com? (livro, pág. 78 do PDF)"),
            lista, fb);
        render();
    });

    /* ------------------------------------------------------------------
     * 5. Resolução de nomes: servidores raiz, delegação e resolvedor (Fig. 54)
     * ------------------------------------------------------------------ */
    var ZONAS = {
        ".": { ns: "Raiz", delega: { dom: "dom" } },
        "dom": { ns: "ns dom", hosts: { h1: "10.0.0.1", h2: "10.0.0.2", h3: "10.0.0.3" }, delega: { sdom1: "sdom1.dom", sdom2: "sdom2.dom" } },
        "sdom1.dom": { ns: "ns sdom1.dom", delega: { a: "a.sdom1.dom", b: "b.sdom1.dom", z: "z.sdom1.dom" } },
        "a.sdom1.dom": { ns: "ns a.sdom1.dom", hosts: { h1: "10.1.1.1", h2: "10.1.1.2", h3: "10.1.1.3" } }
    };
    var COLS_SERVIDORES = [".", "dom", "sdom1.dom", "a.sdom1.dom"];

    R.registrar("resolucao-dns", function (raiz) {
        var cache = {};          // nome ou zona → endereço / true (delegação conhecida)
        var total = 0;
        var concluir = R.desafio(raiz, "dns-cache", 20, "Resolver com uma única consulta graças ao cache");

        var nome = el("select", { class: "form-select form-select-sm mono" },
            ["h2.dom", "h1.dom", "h3.a.sdom1.dom", "h1.a.sdom1.dom"].map(function (n) { return el("option", { value: n }, n); }));
        var modo = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "resolvedor" }, "Via resolvedor (consulta recursiva)"),
            el("option", { value: "direto" }, "O cliente pergunta direto aos servidores"));
        var usaCache = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("dnscache") });
        var area = el("div", { class: "mt-2" });
        var resumo = el("div", { class: "small mt-2", "aria-live": "polite" });
        var cacheTxt = el("p", { class: "small text-muted mb-0" });

        function mostraCache() {
            var k = Object.keys(cache);
            cacheTxt.textContent = "Cache do resolvedor: " + (k.length ? k.map(function (x) { return cache[x] === true ? x + " → servidor conhecido" : x + " = " + cache[x]; }).join("; ") : "vazio") + ".";
        }

        function resolver() {
            var alvo = nome.value;
            var viaResolvedor = modo.value === "resolvedor";
            var comCache = viaResolvedor && usaCache.checked;
            usaCache.disabled = !viaResolvedor;
            var colunas = ["Cliente"].concat(viaResolvedor ? ["Resolvedor"] : []).concat(COLS_SERVIDORES.map(function (z) { return ZONAS[z].ns; }));
            var quem = viaResolvedor ? 1 : 0;           // coluna de quem faz a iteração
            var colZona = function (z) { return colunas.indexOf(ZONAS[z].ns); };
            var eventos = [];
            var consultas = 0;
            if (viaResolvedor) eventos.push({ de: 0, para: 1, rotulo: alvo + " ?", tipo: "ok" });

            var endereco = null;
            if (comCache && cache[alvo]) {
                endereco = cache[alvo];
                eventos.push({ nota: 1, rotulo: "resposta no cache", tipo: "ok" });
            } else {
                var rotulos = alvo.split(".");
                // Começa pela zona mais profunda já conhecida no cache (ou pela raiz).
                var zona = ".";
                if (comCache) {
                    for (var s = 1; s < rotulos.length; s++) {
                        var suf = rotulos.slice(s).join(".");
                        if (cache[suf] === true) { zona = suf; break; }
                    }
                    if (zona !== ".") eventos.push({ nota: 1, rotulo: "cache: já sabe quem responde por " + zona, tipo: "ok" });
                }
                var guarda = 0;
                while (!endereco && guarda++ < 6) {
                    var z = ZONAS[zona];
                    consultas++;
                    eventos.push({ de: quem, para: colZona(zona), rotulo: alvo + " ?", tipo: "ok" });
                    var prefixo = zona === "." ? rotulos : rotulos.slice(0, rotulos.length - zona.split(".").length);
                    if (prefixo.length === 1 && z.hosts && z.hosts[prefixo[0]]) {
                        endereco = z.hosts[prefixo[0]];
                        eventos.push({ de: colZona(zona), para: quem, rotulo: endereco, tipo: "ok" });
                    } else {
                        var filho = prefixo.slice(-1)[0];
                        var proxZona = z.delega[filho];
                        eventos.push({ de: colZona(zona), para: quem, rotulo: "pergunte a ns " + proxZona, tipo: "ctrl" });
                        if (comCache) cache[proxZona] = true;
                        zona = proxZona;
                    }
                }
                if (comCache) cache[alvo] = endereco;
            }
            if (viaResolvedor) eventos.push({ de: 1, para: 0, rotulo: alvo + " = " + endereco, tipo: "ok" });
            total += consultas;

            var diagrama = R.diagramaSequencia({
                titulo: "Resolução de " + alvo + (viaResolvedor ? " via resolvedor" : " feita pelo próprio cliente") + ": " + consultas + " consulta(s) a servidores de nomes.",
                colunas: colunas, eventos: eventos, largura: 760, margem: 64, passo: 30
            });
            area.replaceChildren(diagrama);
            resumo.replaceChildren(
                el("p", { class: "mb-1" }, el("strong", null, alvo + " = " + endereco), " · consultas a servidores de nomes nesta resolução: ", el("strong", null, String(consultas)), " · no total: " + total + "."),
                el("p", { class: "mb-0 text-muted" }, viaResolvedor
                    ? "O cliente fez uma única consulta recursiva; quem percorreu a hierarquia foi o resolvedor."
                    : "Sem resolvedor, o próprio cliente precisa saber o endereço dos servidores raiz e percorrer a hierarquia."));
            mostraCache();
            if (comCache && consultas === 1 && /\.a\.sdom1\.dom$/.test(alvo) && !eventos.some(function (e) { return e.rotulo === "resposta no cache"; })) concluir();
        }

        modo.addEventListener("change", function () { usaCache.disabled = modo.value !== "resolvedor"; });

        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-4" }, u.campo("Nome a resolver", nome)),
                el("div", { class: "col-sm-5" }, u.campo("Quem pergunta", modo)),
                el("div", { class: "col-sm-3" }, el("div", { class: "form-check mb-2" }, usaCache, el("label", { class: "form-check-label small", for: usaCache.id }, "Resolvedor com cache")))),
            el("div", { class: "d-flex gap-2 flex-wrap" },
                u.botao("Resolver", "btn-primary", resolver),
                u.botao("Esvaziar cache", "btn-outline-secondary", function () { cache = {}; mostraCache(); })),
            area, resumo, cacheTxt,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Endereços ilustrativos. Desafio (20 pts): resolva um nome dentro de a.sdom1.dom gastando uma única consulta a servidores de nomes, sem que o nome em si já esteja no cache (livro, pág. 79 do PDF)."));
        resolver();
    });

    /* ------------------------------------------------------------------
     * 6. Benefícios dos nomes: um nome → vários endereços (2.5.1)
     * ------------------------------------------------------------------ */
    R.registrar("nome-para-enderecos", function (raiz) {
        var servidores = [
            { id: "S1", regiao: "Europa", end: "198.51.100.10", carga: 0 },
            { id: "S2", regiao: "América", end: "198.51.100.20", carga: 0 },
            { id: "S3", regiao: "Ásia", end: "198.51.100.30", carga: 0 }
        ];
        var REGIOES = ["Europa", "América", "Ásia"];
        var sorteio = u.aleatorio(11);
        var clientes = 0, movido = false, enderecoAntigo = null;
        var concluirEquilibrio = R.desafio(raiz, "nomes-equilibrar", 15, "Equilibrar a carga com o serviço de nomes");
        var concluirMover = R.desafio(raiz, "nomes-mover", 10, "Mover um servidor sem afetar os clientes");

        var estrategia = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "aleatoria" }, "Endereço aleatório do conjunto"),
            el("option", { value: "menos" }, "Servidor menos carregado"),
            el("option", { value: "proximo" }, "Servidor mais próximo do cliente"));
        var barras = el("div", { class: "small" });
        var log = el("ul", { class: "log mt-2", "aria-live": "polite" });
        var fb = u.feedback();

        function escolhe(regiao) {
            if (estrategia.value === "menos") {
                return servidores.reduce(function (m, s) { return s.carga < m.carga ? s : m; });
            }
            if (estrategia.value === "proximo") {
                return servidores.filter(function (s) { return s.regiao === regiao; })[0];
            }
            return servidores[Math.floor(sorteio() * servidores.length)];
        }

        function desenha() {
            var max = Math.max(10, Math.max.apply(null, servidores.map(function (s) { return s.carga; })));
            barras.replaceChildren.apply(barras, servidores.map(function (s) {
                return el("div", { class: "mb-2" },
                    el("div", { class: "d-flex justify-content-between" },
                        el("span", null, el("strong", null, s.id), " (" + s.regiao + ") ", el("span", { class: "mono" }, s.end)),
                        el("span", null, s.carga + " cliente(s)")),
                    el("div", { class: "barra-carga", style: "width:" + (s.carga / max * 100) + "%" }));
            }));
        }

        function registra(texto) {
            log.insertBefore(el("li", null, texto), log.firstChild);
            while (log.children.length > 12) log.removeChild(log.lastChild);
        }

        function chegam() {
            var falhas = 0;
            for (var i = 0; i < 12; i++) {
                var regiao = REGIOES[Math.floor(sorteio() * 3)];
                var s = escolhe(regiao);
                s.carga++; clientes++;
                registra("cliente " + clientes + " (" + regiao + "): www.exemplo.org → " + s.end + " (" + s.id + ")");
            }
            if (movido) {
                // Um cliente antigo com o endereço gravado no código tenta o endereço velho.
                falhas = 3;
                registra("3 clientes com o endereço " + enderecoAntigo + " fixo no código: conexão recusada");
            }
            desenha();
            var cargas = servidores.map(function (s) { return s.carga; });
            var dif = Math.max.apply(null, cargas) - Math.min.apply(null, cargas);
            if (clientes >= 24 && dif <= 1) {
                u.marca(fb, true, "Carga equilibrada: diferença de " + dif + " cliente(s) entre o servidor mais e o menos carregado.");
                concluirEquilibrio();
            } else {
                fb.className = "small mt-2 mb-0";
                fb.textContent = "Diferença entre o servidor mais e o menos carregado: " + dif + " cliente(s).";
            }
            if (movido && falhas) {
                concluirMover();
            }
        }

        function mover() {
            if (movido) return;
            movido = true;
            enderecoAntigo = servidores[0].end;
            servidores[0].end = "203.0.113.10";
            registra("S1 mudou de máquina: o serviço de nomes passa a responder www.exemplo.org → 203.0.113.10");
            desenha();
            u.marca(fb, true, "S1 mudou de endereço. Mande mais clientes: quem usa o nome segue funcionando.");
        }

        function zera() {
            servidores.forEach(function (s) { s.carga = 0; });
            clientes = 0;
            log.replaceChildren();
            fb.textContent = "";
            desenha();
        }

        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-6" }, u.campo("Estratégia do serviço de nomes para www.exemplo.org", estrategia)),
                el("div", { class: "col-sm-6 mb-2 d-flex gap-2 flex-wrap" },
                    u.botao("Chegam 12 clientes", "btn-primary", chegam),
                    u.botao("Mover S1 de máquina", "btn-outline-primary", mover),
                    u.botao("Zerar cargas", "btn-outline-secondary", zera))),
            barras, fb, log,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Endereços da faixa reservada para documentação (RFC 5737). Desafios: equilibre a carga, com diferença de no máximo 1 cliente depois de pelo menos 24 clientes (15 pts), e mova S1 de máquina e mande mais clientes (10 pts) (livro, pág. 80 do PDF)."));
        desenha();
    });
}());
