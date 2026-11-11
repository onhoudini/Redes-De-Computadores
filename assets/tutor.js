/*
 * Tutor de IA dos capítulos.
 *
 * Usa a API do OpenRouter (configurada em assets/tutor-config.js) e envia ao
 * modelo, como contexto, o texto da seção do livro correspondente ao capítulo
 * (assets/tutor/livro-capNN.txt, gerado por ferramentas/extrai_livro.py) e os
 * exercícios, desafios e notas sobre erros do livro que estão na página.
 *
 * Não dá pontos: a pontuação dos capítulos continua só nos desafios.
 */
(function () {
    "use strict";

    var cap = parseInt(document.body.getAttribute("data-capitulo"), 10);
    if (!cap) return;

    var CONFIG = window.TUTOR_CONFIG || {};
    var MODELO = CONFIG.modelo || "google/gemma-4-26b-a4b-it:free";
    var URL_API = CONFIG.url || "https://openrouter.ai/api/v1/chat/completions";
    var RESERVAS = Array.isArray(CONFIG.reservas) ? CONFIG.reservas.filter(Boolean) : [];
    var MAX_TROCAS = 10;            // trocas (pergunta + resposta) enviadas ao modelo
    var MAX_GUARDADAS = 40;         // mensagens guardadas no navegador
    var CHAVE_CONVERSA = "redes-tutor-cap" + cap;
    var CHAVE_API_LOCAL = "redes-tutor-chave";

    var CAPITULOS = {
        1: ["Conectando dois hosts", "2.1 Connecting two hosts"],
        2: ["Construindo uma rede", "2.2 Building a network"],
        3: ["Aplicações", "2.3 Applications"],
        4: ["A camada de transporte", "2.4 The transport layer"],
        5: ["Nomes e endereços", "2.5 Naming and addressing"],
        6: ["Compartilhamento de recursos", "2.6 Sharing resources"],
        7: ["Modelos de referência", "2.7 The reference models"],
        8: ["Segurança de redes", "2.8 Network security"]
    };

    // Pasta assets/, deduzida do endereço deste script.
    var script = document.currentScript;
    var BASE = script ? script.src.replace(/[^\/]*$/, "") : "../../assets/";
    var ARQUIVO_LIVRO = BASE + "tutor/livro-cap" + (cap < 10 ? "0" : "") + cap + ".txt";

    /* ---------- Armazenamento (pode falhar em janela privada) ---------- */

    function ler(chave) {
        try { return localStorage.getItem(chave); } catch (_) { return null; }
    }
    function gravar(chave, valor) {
        try {
            if (valor === null) localStorage.removeItem(chave);
            else localStorage.setItem(chave, valor);
        } catch (_) { /* armazenamento indisponível */ }
    }

    function chaveApi() {
        return ler(CHAVE_API_LOCAL) || CONFIG.chave || "";
    }

    var conversa = [];
    try { conversa = JSON.parse(ler(CHAVE_CONVERSA) || "[]"); } catch (_) { conversa = []; }
    if (!Array.isArray(conversa)) conversa = [];
    conversa = conversa.filter(function (m) {
        return m && (m.papel === "user" || m.papel === "assistant") && typeof m.texto === "string";
    });

    function salvarConversa() {
        gravar(CHAVE_CONVERSA, JSON.stringify(conversa.slice(-MAX_GUARDADAS)));
    }

    /* ---------- Markdown mínimo e seguro ---------- */

    function escapar(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    // Recebe texto JÁ escapado e aplica a formatação em linha.
    function emLinha(s) {
        var guardados = [];
        function guarda(html) { guardados.push(html); return "\u0000" + (guardados.length - 1) + "\u0000"; }
        s = s.replace(/`([^`]+)`/g, function (_, c) { return guarda("<code>" + c + "</code>"); });
        s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_, t, u) {
            return guarda('<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + "</a>");
        });
        s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, function (_, a, u) {
            return a + guarda('<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>");
        });
        s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\w)/g, "$1<em>$2</em>");
        s = s.replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, "$1<em>$2</em>");
        return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return guardados[+i]; });
    }

    function markdown(texto) {
        var html = [];
        var partes = texto.split(/```[^\n]*\n?/);
        partes.forEach(function (parte, i) {
            if (i % 2 === 1) {                      // dentro de um bloco de código
                html.push("<pre><code>" + escapar(parte.replace(/\n$/, "")) + "</code></pre>");
                return;
            }
            var linhas = escapar(parte).split("\n");
            var lista = null, paragrafo = [];
            function fechaParagrafo() {
                if (paragrafo.length) html.push("<p>" + emLinha(paragrafo.join("<br>")) + "</p>");
                paragrafo = [];
            }
            function fechaLista() {
                if (lista) html.push("<" + lista.tipo + ">" + lista.itens.join("") + "</" + lista.tipo + ">");
                lista = null;
            }
            linhas.forEach(function (linha) {
                var m;
                if (!linha.trim()) { fechaParagrafo(); fechaLista(); return; }
                if ((m = linha.match(/^\s*#{1,6}\s+(.*)$/))) {
                    fechaParagrafo(); fechaLista();
                    html.push('<p class="tutor-subtitulo"><strong>' + emLinha(m[1]) + "</strong></p>");
                    return;
                }
                var ul = linha.match(/^\s*[-*•]\s+(.*)$/), ol = linha.match(/^\s*\d+[.)]\s+(.*)$/);
                if (ul || ol) {
                    fechaParagrafo();
                    var tipo = ul ? "ul" : "ol";
                    if (!lista || lista.tipo !== tipo) { fechaLista(); lista = { tipo: tipo, itens: [] }; }
                    lista.itens.push("<li>" + emLinha((ul || ol)[1]) + "</li>");
                    return;
                }
                if (lista && /^\s{2,}\S/.test(linha)) {   // continuação de item
                    lista.itens[lista.itens.length - 1] =
                        lista.itens[lista.itens.length - 1].replace(/<\/li>$/, " " + emLinha(linha.trim()) + "</li>");
                    return;
                }
                fechaLista();
                paragrafo.push(linha);
            });
            fechaParagrafo(); fechaLista();
        });
        return html.join("");
    }

    /* ---------- Contexto enviado ao modelo ---------- */

    var textoLivro = null;
    function carregarLivro() {
        if (textoLivro !== null) return Promise.resolve(textoLivro);
        return fetch(ARQUIVO_LIVRO).then(function (r) {
            if (!r.ok) throw new Error("livro " + r.status);
            return r.text();
        }).then(function (t) { textoLivro = t; return t; });
    }

    function limpo(no) {
        return (no.innerText || no.textContent || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    }

    // Exercícios, perguntas rápidas, desafios e notas sobre erros do livro, lidos da página.
    function contextoPagina() {
        var vistos = {}, itens = [];
        function add(t) {
            t = t.replace(/\s+/g, " ").trim();
            if (t && !vistos[t]) { vistos[t] = true; itens.push("- " + t); }
        }
        document.querySelectorAll(".mini-quiz").forEach(function (q) {
            var p = q.querySelector("p");
            var opcoes = (q.getAttribute("data-options") || "").split("|").join(" / ");
            if (p) add("Pergunta rápida: " + limpo(p) + (opcoes ? " (opções: " + opcoes + ")" : ""));
        });
        // Enunciados de desafios (simulações e blocos de código), sem as respostas em <details>.
        document.querySelectorAll("p, li").forEach(function (n) {
            if (n.closest(".tutor-painel, details")) return;
            var copia = n.cloneNode(true);
            copia.querySelectorAll("details").forEach(function (d) { d.remove(); });
            var t = (copia.textContent || "").trim();
            if (t.length >= 500) return;
            if (n.closest(".python-playground")) { if (n.tagName === "LI") add("Desafio de código: " + t); }
            else if (/^Desafio\b/.test(t)) add(t);
        });
        var exercicios = document.querySelector('section[id^="exercicios"]');
        var notas = Array.prototype.map.call(document.querySelectorAll(".nota-livro"), limpo)
            .filter(Boolean).map(function (t) { return "- " + t.replace(/\s+/g, " "); });
        return {
            exercicios: exercicios ? limpo(exercicios) : "",
            desafios: itens.join("\n"),
            notas: notas.join("\n")
        };
    }

    function mensagemSistema(livro) {
        var info = CAPITULOS[cap] || ["Capítulo " + cap, "seção 2." + cap];
        var outros = Object.keys(CAPITULOS).map(function (n) {
            return "capítulo " + n + " — " + CAPITULOS[n][0] + " (seção " + CAPITULOS[n][1] + ")";
        }).join("; ");
        var pg = contextoPagina();
        return [
            "Você é o tutor do capítulo " + cap + " (\"" + info[0] + "\") de um site de estudo de redes de computadores. " +
            "O site adapta o livro aberto \"Computer Networking: Principles, Protocols and Practice\" (Olivier Bonaventure, Release 2021); " +
            "este capítulo corresponde à seção " + info[1] + " do livro.",
            "",
            "Regras:",
            "1. Responda sempre em português do Brasil, com clareza e de forma direta. Prefira respostas curtas (até uns 250 palavras), com um exemplo simples quando ajudar; aprofunde só se o aluno pedir.",
            "2. Sua fonte principal é o TEXTO DO LIVRO abaixo. Ao usar uma informação dele, cite a página no formato (pág. N do PDF), usando os marcadores [pág. N do PDF] do texto. Nunca invente páginas.",
            "3. Se precisar de algo que não está no livro, diga só o que tiver certeza de que é correto e marque com \"Complemento (fora do livro):\". Se indicar uma fonte, use apenas fontes abertas e gratuitas, como RFCs ou a Wikipedia. Nunca invente RFCs, citações ou números.",
            "4. Exercícios e desafios: a lista abaixo traz os exercícios, perguntas rápidas e desafios desta página. Se o aluno pedir a resposta de um deles (ou de algo equivalente), NÃO entregue a resposta final. Dê uma dica, indique o trecho e a página do livro que ajudam e faça uma pergunta que leve ao próximo passo. Se o aluno mostrar uma tentativa, diga se está certa e explique por quê; se estiver errada, mostre onde está o erro sem entregar a solução completa. Perguntas sobre conceitos (o que é, como funciona, por que) você responde normalmente.",
            "5. O site corrige alguns erros do livro (lista de notas abaixo). Nesses pontos, siga a versão do site e mencione a divergência.",
            "6. Mantenha o foco em redes de computadores. Para outros assuntos, recuse com educação e volte ao tema. Se a pergunta for de outro capítulo, responda em poucas linhas e indique o capítulo do site. Capítulos do site: " + outros + ".",
            "7. Formate com Markdown simples: parágrafos curtos, **negrito**, listas, `código` e blocos de código. Não use tabelas nem HTML.",
            "",
            "=== NOTAS DO SITE SOBRE ERROS DO LIVRO ===",
            pg.notas || "(nenhuma neste capítulo)",
            "",
            "=== EXERCÍCIOS, PERGUNTAS RÁPIDAS E DESAFIOS DESTA PÁGINA (não entregue as respostas) ===",
            pg.desafios || "(nenhum)",
            "",
            pg.exercicios ? "Seção de exercícios da página:\n" + pg.exercicios : "",
            "",
            "=== TEXTO DO LIVRO: SEÇÃO " + info[1] + " ===",
            livro
        ].join("\n");
    }

    /* ---------- Interface ---------- */

    function el(tag, attrs, filhos) {
        var n = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) {
            if (k === "class") n.className = attrs[k];
            else if (k === "text") n.textContent = attrs[k];
            else n.setAttribute(k, attrs[k]);
        });
        (filhos || []).forEach(function (f) { if (f) n.appendChild(typeof f === "string" ? document.createTextNode(f) : f); });
        return n;
    }

    var info = CAPITULOS[cap] || ["Capítulo " + cap];
    var fab = el("button", {
        type: "button", class: "btn btn-primary tutor-fab", "aria-controls": "tutor-painel",
        "aria-label": "Abrir o tutor de IA do capítulo"
    }, [el("span", { "aria-hidden": "true", text: "💬 " }), "Tutor"]);

    var historico = el("div", { class: "tutor-historico", role: "log", "aria-live": "polite", "aria-label": "Conversa com o tutor" });
    var sugestoes = el("div", { class: "tutor-sugestoes" });

    var campoChave = el("input", {
        type: "password", class: "form-control form-control-sm", id: "tutor-campo-chave",
        autocomplete: "off", spellcheck: "false", placeholder: "sk-or-v1-…"
    });
    var formChave = el("form", { class: "tutor-chave card-soft p-3 mb-3", hidden: "" }, [
        el("label", { for: "tutor-campo-chave", class: "form-label small fw-semibold", text: "Chave do OpenRouter" }),
        el("p", { class: "small text-muted mb-2" }, [
            "O tutor precisa de uma chave da API do OpenRouter. Crie uma de graça em ",
            el("a", { href: "https://openrouter.ai/keys", target: "_blank", rel: "noopener noreferrer", text: "openrouter.ai/keys" }),
            " e cole aqui. Ela fica guardada só neste navegador."
        ]),
        el("div", { class: "d-flex gap-2" }, [
            campoChave,
            el("button", { type: "submit", class: "btn btn-sm btn-primary", text: "Salvar" })
        ]),
        el("button", { type: "button", class: "btn btn-link btn-sm px-0 mt-1 tutor-esquecer", text: "Apagar a chave salva neste navegador", hidden: "" })
    ]);

    var entrada = el("textarea", {
        class: "form-control", id: "tutor-entrada", rows: "2",
        placeholder: "Pergunte sobre o capítulo…", "aria-label": "Sua pergunta para o tutor"
    });
    var botaoEnviar = el("button", { type: "submit", class: "btn btn-primary", text: "Enviar" });
    var botaoParar = el("button", { type: "button", class: "btn btn-outline-secondary", text: "Parar", hidden: "" });
    var botaoNova = el("button", { type: "button", class: "btn btn-link btn-sm px-0", text: "Nova conversa" });
    var botaoMinhaChave = el("button", { type: "button", class: "btn btn-link btn-sm px-0", text: "Usar minha chave" });

    var formPergunta = el("form", { class: "tutor-form" }, [
        el("div", { class: "d-flex gap-2 align-items-end" }, [
            entrada,
            el("div", { class: "d-flex flex-column gap-1" }, [botaoEnviar, botaoParar])
        ]),
        el("div", { class: "d-flex justify-content-between align-items-center mt-1" }, [botaoNova, botaoMinhaChave]),
        el("p", { class: "tutor-aviso small text-muted mb-0" },
            ["Respostas geradas por IA (" + MODELO.replace(/:free$/, "") + ", via OpenRouter) a partir do livro. Podem conter erros: confira a página citada."])
    ]);

    var painel = el("div", {
        class: "offcanvas offcanvas-end tutor-painel", id: "tutor-painel", tabindex: "-1",
        "aria-labelledby": "tutor-titulo"
    }, [
        el("div", { class: "offcanvas-header" }, [
            el("div", null, [
                el("h2", { class: "offcanvas-title h5 mb-0", id: "tutor-titulo", text: "Tutor do capítulo " + cap }),
                el("p", { class: "small text-muted mb-0", text: info[0] })
            ]),
            el("button", { type: "button", class: "btn-close", "data-bs-dismiss": "offcanvas", "aria-label": "Fechar o tutor" })
        ]),
        el("div", { class: "offcanvas-body" }, [formChave, historico, sugestoes]),
        el("div", { class: "tutor-rodape" }, [formPergunta])
    ]);

    document.body.appendChild(fab);
    document.body.appendChild(painel);

    var offcanvas = null;
    function abrir() {
        if (window.bootstrap && bootstrap.Offcanvas) {
            offcanvas = offcanvas || bootstrap.Offcanvas.getOrCreateInstance(painel);
            offcanvas.show();
        } else {
            painel.classList.add("show");
        }
    }
    fab.addEventListener("click", abrir);
    painel.addEventListener("shown.bs.offcanvas", function () {
        if (!formChave.hidden) campoChave.focus(); else entrada.focus();
        rolarFim();
    });

    function rolarFim() {
        var corpo = historico.parentNode;
        corpo.scrollTop = corpo.scrollHeight;
    }

    function bolha(papel, texto) {
        var conteudo = el("div", { class: "tutor-conteudo" });
        var b = el("div", { class: "tutor-msg tutor-" + (papel === "user" ? "aluno" : papel === "erro" ? "erro" : "tutor") }, [
            el("span", { class: "visually-hidden", text: papel === "user" ? "Você disse: " : papel === "erro" ? "Erro: " : "Tutor: " }),
            conteudo
        ]);
        if (papel === "assistant") conteudo.innerHTML = markdown(texto);
        else conteudo.textContent = texto;
        historico.appendChild(b);
        return conteudo;
    }

    function sugestoesIniciais() {
        sugestoes.textContent = "";
        if (conversa.length) return;
        var titulos = Array.prototype.map.call(document.querySelectorAll("section[data-conceito]"), function (s) {
            return s.getAttribute("data-titulo");
        }).filter(Boolean);
        // Títulos entre aspas: funcionam com qualquer data-titulo, sem ajustar a gramática.
        var perguntas = [];
        if (titulos[0]) perguntas.push("Explique “" + titulos[0] + "” com um exemplo do dia a dia.");
        if (titulos[1]) perguntas.push("Faça 3 perguntas para eu testar se entendi “" + titulos[1] + "”.");
        perguntas.push("Quais são as ideias principais deste capítulo, com as páginas do livro?");
        sugestoes.appendChild(el("p", { class: "small text-muted mb-2", text: "Sugestões para começar:" }));
        perguntas.forEach(function (p) {
            var b = el("button", { type: "button", class: "btn btn-sm btn-outline-primary text-start", text: p });
            b.addEventListener("click", function () { enviar(p); });
            sugestoes.appendChild(b);
        });
    }

    function redesenhar() {
        historico.textContent = "";
        conversa.forEach(function (m) { bolha(m.papel, m.texto); });
        sugestoesIniciais();
    }

    function mostrarChave(motivo) {
        formChave.hidden = false;
        formChave.querySelector(".tutor-esquecer").hidden = !ler(CHAVE_API_LOCAL);
        var p = formChave.querySelector("p");
        if (motivo) p.firstChild.textContent = motivo + " Crie uma chave de graça em ";
        campoChave.value = "";
        campoChave.focus();
    }

    formChave.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = campoChave.value.trim();
        if (!v) return;
        gravar(CHAVE_API_LOCAL, v);
        formChave.hidden = true;
        entrada.focus();
    });
    formChave.querySelector(".tutor-esquecer").addEventListener("click", function () {
        gravar(CHAVE_API_LOCAL, null);
        formChave.hidden = true;
    });
    botaoMinhaChave.addEventListener("click", function () {
        if (formChave.hidden) mostrarChave(); else formChave.hidden = true;
    });

    botaoNova.addEventListener("click", function () {
        if (controlador) controlador.abort();
        conversa = [];
        salvarConversa();
        redesenhar();
        entrada.focus();
    });

    entrada.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            formPergunta.requestSubmit ? formPergunta.requestSubmit() : formPergunta.dispatchEvent(new Event("submit"));
        }
    });
    formPergunta.addEventListener("submit", function (e) {
        e.preventDefault();
        enviar(entrada.value);
    });
    botaoParar.addEventListener("click", function () { if (controlador) controlador.abort(); });

    // Botão "Perguntar ao tutor" em cada conceito.
    document.querySelectorAll("section[data-conceito]").forEach(function (s) {
        var titulo = s.getAttribute("data-titulo") || "";
        var h2 = s.querySelector("h2");
        if (!h2) return;
        var b = el("button", {
            type: "button", class: "btn btn-sm btn-outline-primary tutor-perguntar",
            "aria-label": "Perguntar ao tutor sobre " + titulo
        }, [el("span", { "aria-hidden": "true", text: "💬 " }), "Perguntar ao tutor"]);
        b.addEventListener("click", function () {
            entrada.value = "Me explique \"" + titulo + "\" de forma simples, com as páginas do livro.";
            abrir();
            setTimeout(function () { entrada.focus(); entrada.select(); }, 350);
        });
        h2.insertAdjacentElement("afterend", b);
    });

    /* ---------- Chamada à API (streaming) ---------- */

    var controlador = null;

    function ocupado(sim) {
        botaoEnviar.disabled = sim;
        botaoParar.hidden = !sim;
        entrada.setAttribute("aria-busy", sim ? "true" : "false");
    }

    function mensagemErro(status, corpo) {
        var detalhe = "";
        try { detalhe = (JSON.parse(corpo).error || {}).message || ""; } catch (_) { detalhe = ""; }
        if (status === 401 || status === 403) return { texto: "A chave do OpenRouter foi recusada (inválida ou revogada). Cole uma chave válida para continuar.", chave: true };
        if (status === 402) return { texto: "A conta do OpenRouter está sem créditos para este pedido. Tente outra chave ou mais tarde." };
        if (status === 429 && limiteDoProvedor(corpo)) return { texto: "O modelo gratuito está sobrecarregado no provedor agora (o limite é dividido entre todos os usuários gratuitos do OpenRouter). Tente de novo em alguns minutos." };
        if (status === 429) return { texto: "Limite de pedidos da chave atingido. Espere um pouco e tente de novo; se persistir, o limite diário acabou e volta amanhã (ou use a sua chave)." };
        if (status === 404) return { texto: "O modelo " + MODELO + " não está disponível no OpenRouter agora." };
        return { texto: "O tutor não conseguiu responder (erro " + status + (detalhe ? ": " + detalhe : "") + "). Tente de novo em instantes." };
    }

    // 429 do provedor (limite compartilhado do modelo gratuito), e não da chave.
    function limiteDoProvedor(corpo) {
        try {
            var m = (JSON.parse(corpo).error || {}).metadata || {};
            return /upstream/.test((m.limit_source || "") + " " + (m.raw || ""));
        } catch (_) { return false; }
    }

    // Faz o pedido; num 429 do provedor, tenta de novo até 2 vezes (espera de 4 s e 8 s).
    function pedir(corpo, sinal, aviso, tentativa) {
        tentativa = tentativa || 0;
        return fetch(URL_API, {
            method: "POST",
            signal: sinal,
            headers: {
                "Authorization": "Bearer " + chaveApi(),
                "Content-Type": "application/json",
                "X-Title": "Redes de Computadores - tutor"
            },
            body: JSON.stringify(corpo)
        }).then(function (r) {
            if (r.ok) return r;
            return r.text().then(function (c) {
                if (r.status === 429 && tentativa < 2 && limiteDoProvedor(c)) {
                    var espera = 4000 * (tentativa + 1);
                    aviso("Modelo ocupado no provedor; tentando de novo em " + espera / 1000 + " s");
                    return new Promise(function (ok, falha) {
                        var t = setTimeout(ok, espera);
                        sinal.addEventListener("abort", function () {
                            clearTimeout(t);
                            falha(new DOMException("abortado", "AbortError"));
                        });
                    }).then(function () { aviso("Pensando"); return pedir(corpo, sinal, aviso, tentativa + 1); });
                }
                var e = mensagemErro(r.status, c); e.http = true; throw e;
            });
        });
    }

    function enviar(texto) {
        texto = (texto || "").trim();
        if (!texto || controlador) return;
        if (!chaveApi()) {
            mostrarChave("O tutor ainda não tem uma chave do OpenRouter configurada.");
            return;
        }
        formChave.hidden = true;
        entrada.value = "";
        sugestoes.textContent = "";
        conversa.push({ papel: "user", texto: texto });
        salvarConversa();
        bolha("user", texto);

        var alvo = bolha("assistant", "");
        var pensando = el("span", { class: "tutor-pensando", text: "Pensando" });
        alvo.appendChild(pensando);
        rolarFim();
        ocupado(true);
        controlador = new AbortController();
        var resposta = "";

        carregarLivro().then(function (livro) {
            var mensagens = [{ role: "system", content: mensagemSistema(livro) }];
            conversa.slice(-MAX_TROCAS * 2).forEach(function (m) {
                mensagens.push({ role: m.papel, content: m.texto });
            });
            var corpo = { model: MODELO, messages: mensagens, stream: true, temperature: 0.3, max_tokens: 1500 };
            if (RESERVAS.length) corpo.models = [MODELO].concat(RESERVAS);   // reserva automática do OpenRouter
            return pedir(corpo, controlador.signal, function (t) { pensando.textContent = t; });
        }).then(function (r) {
            var leitor = r.body.getReader(), dec = new TextDecoder(), resto = "";
            function passo() {
                return leitor.read().then(function (p) {
                    if (p.done) return;
                    resto += dec.decode(p.value, { stream: true });
                    var linhas = resto.split("\n");
                    resto = linhas.pop();
                    linhas.forEach(function (l) {
                        l = l.trim();
                        if (l.indexOf("data:") !== 0) return;      // comentários ": OPENROUTER PROCESSING"
                        var dado = l.slice(5).trim();
                        if (dado === "[DONE]") return;
                        var j;
                        try { j = JSON.parse(dado); } catch (_) { return; }
                        if (j.error) throw { texto: "O modelo devolveu um erro: " + (j.error.message || "desconhecido") + "." };
                        var d = j.choices && j.choices[0] && j.choices[0].delta;
                        if (d && typeof d.content === "string" && d.content) {
                            resposta += d.content;
                            alvo.innerHTML = markdown(resposta);
                            rolarFim();
                        }
                    });
                    return passo();
                });
            }
            return passo();
        }).then(function () {
            if (!resposta.trim()) throw { texto: "O modelo não devolveu texto. Tente reformular a pergunta ou tente de novo." };
            conversa.push({ papel: "assistant", texto: resposta });
            salvarConversa();
        }).catch(function (e) {
            var abortado = e && e.name === "AbortError";
            if (resposta.trim()) {       // interrompido ou erro no meio: guarda o que chegou
                if (abortado) resposta += "\n\n_(resposta interrompida)_";
                alvo.innerHTML = markdown(resposta);
                conversa.push({ papel: "assistant", texto: resposta });
                salvarConversa();
            } else {                     // nada chegou: desfaz a pergunta e devolve o texto ao campo
                alvo.parentNode.remove();
                historico.lastChild && historico.lastChild.classList.contains("tutor-aluno") && historico.lastChild.remove();
                conversa.pop();
                salvarConversa();
                if (!entrada.value) entrada.value = texto;
                if (!conversa.length) sugestoesIniciais();
            }
            if (abortado) return;
            var msg = e && e.texto ? e.texto
                : (e && /livro/.test(e.message || "")) ? "Não foi possível carregar o texto do livro para o tutor."
                : "Sem conexão com o OpenRouter. Verifique a internet e tente de novo.";
            bolha("erro", msg);
            if (e && e.chave) mostrarChave("A chave atual foi recusada.");
        }).then(function () {
            controlador = null;
            ocupado(false);
            rolarFim();
        });
    }

    redesenhar();
})();
