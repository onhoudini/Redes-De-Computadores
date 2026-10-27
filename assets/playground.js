(function () {
    "use strict";

    var pyodidePromise = null;
    var codemirrorPromise = null;

    // Três desafios por bloco (aquecimento, intermediário, desafio); as respostas foram conferidas executando o código.
    var desafios = {
        "capitulo1": [
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Troque quadro por \"1101\" e preveja o bit de paridade antes de executar.",
                    "resposta": "Há três bits 1 (quantidade ímpar), então o bit de paridade é 1 e o quadro codificado fica 11011."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Inverta dois bits quaisquer de codificado (em com_erro) e chame verifica_paridade. O erro é detectado?",
                    "resposta": "Não: duas inversões mantêm a paridade da quantidade de bits 1, então verifica_paridade devolve True e o erro passa despercebido."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Escreva um laço que inverta cada posição de codificado, uma por vez, e conte quantas inversões verifica_paridade detecta. Depois repita para todos os pares de posições (itertools.combinations).",
                    "resposta": "Para um quadro codificado de 5 bits: 5 de 5 inversões únicas são detectadas e 0 dos 10 pares de inversões."
                }
            ],
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Use dados = \"11111\" e preveja o corpo do quadro antes de executar.",
                    "resposta": "Depois de cinco bits 1 o transmissor insere um 0: o corpo é 111110, entre dois marcadores 01111110."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Apague a linha contador_uns = 0 dentro do if contador_uns == 5 de bit_stuffing e use dados = \"1\" * 12. Qual é a maior sequência de 1s no corpo do quadro?",
                    "resposta": "Com o código correto, no máximo 5 (corpo 11111011111011). Sem a linha, o contador não volta a zero, só um 0 é inserido e surgem 7 uns seguidos, o bastante para formar o marcador 01111110 por acidente."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Use dados = \"01111110\" (o próprio marcador) e verifique que quadro[len(MARCADOR):-len(MARCADOR)].find(MARCADOR) devolve -1.",
                    "resposta": "O corpo vira 011111010: o 0 inserido quebra a sequência de cinco 1s, o marcador não aparece nos dados e find devolve -1. remove_stuffing recupera os dados originais."
                }
            ],
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Mude prob_perda para 0.0. Quantas linhas começando com \"[Host A] envia\" aparecem para as três mensagens?",
                    "resposta": "Três: sem perdas cada mensagem é enviada uma única vez (tentativa 1) e confirmada."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Use prob_perda = 0.8 e compare a quantidade de linhas \"[Host A] envia\" com a de prob_perda = 0.3, mantendo a mesma semente.",
                    "resposta": "Com 0.8 há bem mais retransmissões: a chance de o quadro e o ACK chegarem é (1 − p)² = 0,04 por tentativa, contra 0,49 com p = 0,3. Em média, cerca de 25 tentativas por mensagem contra cerca de 2."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Quando só o ACK se perde, o Host B entrega a mesma mensagem outra vez à aplicação. Acrescente uma variável esperado no receptor: se o número de sequência recebido for diferente de esperado, descarte a duplicata e apenas reenvie o ACK.",
                    "resposta": "O receptor começa com esperado = 0. Ao receber D(seq): se seq == esperado, entrega e faz esperado = 1 - esperado; caso contrário descarta. Nos dois casos envia C(OK seq). Assim cada mensagem é entregue exatamente uma vez."
                }
            ]
        ],
        "capitulo2": [
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Preveja a interface do endereço \"01011011\" e depois execute com ele.",
                    "resposta": "Sul: o endereço começa com 0101101, o prefixo mais longo da tabela."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Acrescente \"01011\": \"Leste\" à tabela. Qual interface atende \"01011100\"? E \"01011010\"?",
                    "resposta": "\"01011100\" vai para Leste (01011 é o prefixo mais longo que combina). \"01011010\" continua em Sul, pois 0101101 é ainda mais longo."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Acrescente a rota padrão \"\": \"Padrão\" (prefixo vazio). O que muda para \"11111111\" e para \"01100000\"?",
                    "resposta": "O prefixo vazio combina com qualquer endereço, mas só vence quando nada mais combina: \"11111111\" passa de None para Padrão e \"01100000\" continua em Oeste."
                }
            ],
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Troque range(1, 10) por range(1, 2) e imprima tabelas[\"A\"]. O que A ainda não conhece?",
                    "resposta": "Depois de uma rodada, A só conhece B (custo 1) e C (custo 4). O destino D ainda não aparece e só entra na rodada 2."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Troque o custo B–D para 10 nos dois sentidos (topologia[\"B\"] e topologia[\"D\"]). Qual é a nova rota de A para D e em que rodada o programa converge?",
                    "resposta": "A passa a usar C, com custo 5 (A→C→D = 4 + 1). O programa imprime “Convergiu na rodada 4”."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Acrescente o roteador E ligado a D com custo 1 (\"E\": {\"D\": 1} e \"E\": 1 em topologia[\"D\"]). Qual é o custo de A até E e por qual vizinho?",
                    "resposta": "Custo 4, via B (A→B→D→E = 1 + 2 + 1). Via C seria 6."
                }
            ],
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Troque a origem de \"E\" para \"A\" e preveja os custos antes de executar.",
                    "resposta": "A→B 1, A→D 1, A→C 2 (via B) e A→E 2. Há empate entre A→B→E e A→D→E, e o código mantém o primeiro caminho encontrado (via B)."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Remova o enlace E–D nos dois sentidos e rode a partir de E. Qual é o novo caminho até D?",
                    "resposta": "E → B → A → D, com custo 3."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Use caminhos[destino][1] para imprimir a tabela de encaminhamento de E (destino → próximo salto), como um roteador faria. Ignore o próprio E.",
                    "resposta": "B → B, C → C, D → D e A → B. O próximo salto é o segundo elemento do caminho completo."
                }
            ]
        ]
    };

    function carregarScript(src) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function carregarCodeMirror() {
        if (window.CodeMirror) return Promise.resolve();
        if (!codemirrorPromise) {
            var css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.css";
            document.head.appendChild(css);
            codemirrorPromise = carregarScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.js")
                .then(function () { return carregarScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/mode/python/python.min.js"); });
        }
        return codemirrorPromise;
    }

    function carregarPyodide() {
        if (!pyodidePromise) {
            pyodidePromise = carregarScript("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js")
                .then(function () { return window.loadPyodide(); });
        }
        return pyodidePromise;
    }

    function criarEditor(pre, indice, grupo) {
        var codigo = pre.querySelector("code");
        if (!codigo) return;

        var painel = document.createElement("div");
        painel.className = "python-playground my-3";

        var textarea = document.createElement("textarea");
        textarea.className = "python-editor";
        textarea.value = codigo.textContent;
        textarea.setAttribute("aria-label", "Editor de código Python, exemplo " + (indice + 1));
        painel.appendChild(textarea);

        var entradaLinha = document.createElement("div");
        entradaLinha.className = "mt-2";
        var entradaLabel = document.createElement("label");
        entradaLabel.className = "form-label small mb-1";
        entradaLabel.textContent = "Entrada para input() (opcional; um valor por linha)";
        var entrada = document.createElement("textarea");
        entrada.rows = 2;
        entrada.className = "form-control form-control-sm";
        entrada.placeholder = "Um valor por linha, se input() for chamado mais de uma vez";
        entrada.setAttribute("aria-label", "Valores fornecidos às chamadas input(), um por linha");
        entradaLinha.appendChild(entradaLabel);
        entradaLinha.appendChild(entrada);
        painel.appendChild(entradaLinha);

        var controles = document.createElement("div");
        controles.className = "d-flex flex-wrap align-items-center gap-2 mt-2";

        var executar = document.createElement("button");
        executar.type = "button";
        executar.className = "btn btn-success btn-sm";
        executar.textContent = "Executar Python";
        executar.setAttribute("aria-label", "Executar este exemplo Python");
        controles.appendChild(executar);

        var semente = null;
        if (/alternating_bit_protocol/.test(textarea.value)) {
            var label = document.createElement("label");
            label.className = "small";
            label.textContent = "Semente aleatória:";
            semente = document.createElement("input");
            semente.type = "number";
            semente.className = "form-control form-control-sm";
            semente.value = "42";
            semente.setAttribute("aria-label", "Semente aleatória para reproduzir a simulação ABP");
            semente.style.maxWidth = "130px";
            controles.appendChild(label);
            controles.appendChild(semente);
        }

        painel.appendChild(controles);

        var desafiosDoBloco = (desafios[grupo] || [])[indice];
        if (desafiosDoBloco && desafiosDoBloco.length) {
            var caixa = document.createElement("div");
            caixa.className = "small mt-3";
            var tituloDesafios = document.createElement("p");
            tituloDesafios.className = "fw-semibold mb-1";
            tituloDesafios.textContent = "Desafios para este código";
            caixa.appendChild(tituloDesafios);
            var lista = document.createElement("ol");
            lista.className = "mb-1";
            desafiosDoBloco.forEach(function (item) {
                var li = document.createElement("li");
                var nivel = document.createElement("strong");
                nivel.textContent = item.nivel + ": ";
                li.appendChild(nivel);
                li.appendChild(document.createTextNode(item.texto));
                var detalhes = document.createElement("details");
                var resumo = document.createElement("summary");
                resumo.textContent = "Conferir resposta";
                var resposta = document.createElement("p");
                resposta.className = "mb-1 mt-1";
                resposta.textContent = item.resposta;
                detalhes.appendChild(resumo);
                detalhes.appendChild(resposta);
                li.appendChild(detalhes);
                lista.appendChild(li);
            });
            caixa.appendChild(lista);
            painel.appendChild(caixa);
        }

        var saida = document.createElement("pre");
        saida.className = "python-output mt-2 mb-0";
        saida.setAttribute("aria-live", "polite");
        saida.textContent = "Edite o código e clique em Executar Python. O runtime será carregado apenas no primeiro clique.";
        painel.appendChild(saida);

        pre.hidden = true;
        pre.insertAdjacentElement("afterend", painel);

        carregarCodeMirror().then(function () {
            if (!window.CodeMirror || textarea.dataset.enhanced) return;
            textarea.dataset.enhanced = "true";
            var editor = window.CodeMirror.fromTextArea(textarea, {
                mode: "python",
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4,
                viewportMargin: Infinity
            });
            painel._editor = editor;
        }).catch(function () {
            // O textarea continua disponível quando a CDN/editor não estiver acessível.
        });

        executar.addEventListener("click", async function () {
            executar.disabled = true;
            executar.textContent = "Carregando/Executando…";
            saida.textContent = "";
            try {
                var pyodide = await carregarPyodide();
                var fonte = painel._editor ? painel._editor.getValue() : textarea.value;
                var seed = semente ? String(Number(semente.value) || 0) : "0";
                var usaMatplotlib = /matplotlib/.test(fonte);
                if (usaMatplotlib) await pyodide.loadPackage("matplotlib");
                var proximoInput = 0;
                var valoresInput = entrada.value.split(/\r?\n/);
                pyodide.globals.set("js_input", function (promptText) {
                    var resposta = valoresInput[proximoInput] || "";
                    proximoInput++;
                    return resposta;
                });
                pyodide.globals.set("seed_value", Number(seed));
                var wrapper = [
                    "import sys, io, builtins, random, json, base64",
                    "_playground_output = io.StringIO()",
                    "_playground_figures = []",
                    "_playground_old_stdout = sys.stdout",
                    "_playground_old_input = builtins.input",
                    "sys.stdout = _playground_output",
                    "builtins.input = lambda prompt='': (sys.stdout.write(str(prompt)), js_input(str(prompt)))[1]",
                    "random.seed(seed_value)",
                    "try:",
                    ...fonte.split("\n").map(function (line) { return "    " + line; }),
                    "finally:",
                    "    sys.stdout = _playground_old_stdout",
                    "    builtins.input = _playground_old_input",
                    "try:",
                    "    import matplotlib.pyplot as _playground_plt",
                    "    for _playground_num in _playground_plt.get_fignums():",
                    "        _playground_buffer = io.BytesIO()",
                    "        _playground_plt.figure(_playground_num).savefig(_playground_buffer, format='png', bbox_inches='tight')",
                    "        _playground_figures.append(base64.b64encode(_playground_buffer.getvalue()).decode('ascii'))",
                    "        _playground_plt.close(_playground_num)",
                    "except ImportError:",
                    "    pass",
                    "json.dumps({'output': _playground_output.getvalue(), 'figures': _playground_figures})"
                ].join("\n");
                var resultado = await pyodide.runPythonAsync(wrapper);
                var payload = JSON.parse(resultado);
                var textoResultado = payload.output || "Execução concluída (sem saída de print).";
                if (!proximoInput) saida.textContent = textoResultado;
                else if (textoResultado) saida.textContent += "\n" + textoResultado;
                (payload.figures || []).forEach(function (imagemBase64) {
                    var imagem = document.createElement("img");
                    imagem.src = "data:image/png;base64," + imagemBase64;
                    imagem.alt = "Gráfico produzido pelo código Python executado";
                    imagem.className = "img-fluid mt-2 d-block";
                    saida.appendChild(imagem);
                });
            } catch (erro) {
                saida.textContent = "Erro na execução: " + (erro && erro.message ? erro.message : String(erro));
            } finally {
                executar.disabled = false;
                executar.textContent = "Executar Python";
            }
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        var grupo = /capitulo-01/.test(window.location.pathname) ? "capitulo1" : "capitulo2";
        document.querySelectorAll("pre.code-block").forEach(function (pre, indice) {
            criarEditor(pre, indice, grupo);
        });
    });
}());