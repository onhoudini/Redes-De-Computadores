(function () {
    "use strict";

    var pyodidePromise = null;
    var codemirrorPromise = null;

    var desafios = {
        capitulo1: [
            "Desafio: altere o quadro e provoque erros em um ou em dois bits. O que a paridade detecta?",
            "Desafio: experimente sequências com cinco ou mais bits 1 consecutivos e confira o receptor.",
            "Desafio: mude prob_perda para 0.8 e compare a quantidade de retransmissões usando a mesma semente.",
            "Aquecimento: execute e altere os bits para verificar quais erros de 1 bit a paridade detecta.",
            "Intermediário: experimente um quadro com seis bits 1 consecutivos e verifique a recuperação.",
            "Desafio: compare duas execuções ABP com sementes diferentes e depois repita a mesma semente."
        ],
        capitulo2: [
            "Desafio: altere os prefixos e encontre um destino que corresponda a mais de uma entrada.",
            "Desafio: acrescente um enlace E–D de custo 1 e rode o vetor de distância novamente.",
            "Desafio: acrescente um enlace E–D de custo 1 e rode Dijkstra novamente.",
            "Aquecimento: modifique a tabela para inserir outro prefixo e examine qual entrada é mais específica.",
            "Intermediário: adicione uma ligação bidirecional ao grafo e observe os novos custos mínimos.",
            "Desafio: acrescente um enlace E–D de custo 1 e compare os caminhos calculados."
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

        var desafio = (desafios[grupo] || [])[indice];
        if (desafio) {
            var dica = document.createElement("p");
            dica.className = "small text-primary mt-3 mb-1";
            dica.textContent = desafio;
            painel.appendChild(dica);
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