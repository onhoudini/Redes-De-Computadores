/* Simulações do Capítulo 7 — Modelos de referência. Cada uma é registrada em Redes.registrar. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, svg = u.svg;

    var CAMADAS = ["Aplicação", "Transporte", "Rede", "Enlace", "Física"];
    var UNIDADE = { "Aplicação": "SDU (ou ADU)", "Transporte": "segmento", "Rede": "pacote", "Enlace": "quadro", "Física": "bit" };

    /* ------------------------------------------------------------------
     * 1. A pilha de cinco camadas, de A até B passando por um roteador (Fig. 91–96)
     * ------------------------------------------------------------------ */
    R.registrar("pilha-camadas", function (raiz) {
        var COLS = [
            { nome: "Host A", x: 30, camadas: CAMADAS },
            { nome: "Roteador", x: 255, camadas: ["Rede", "Enlace", "Física"] },
            { nome: "Host B", x: 480, camadas: CAMADAS }
        ];
        var caixas = {};      // "col:camada" → rect
        var desenho = svg("svg", { viewBox: "0 0 640 300", class: "sim-svg w-100", style: "max-height:320px" });
        desenho.appendChild(svg("title", { text: "Host A e Host B com as cinco camadas; no meio, um roteador com as camadas de rede, enlace e física. Um destaque mostra a camada que está tratando a mensagem." }));
        COLS.forEach(function (c, ci) {
            desenho.appendChild(svg("text", { x: c.x + 65, y: 18, "text-anchor": "middle", "font-size": 13, "font-weight": 600 }, c.nome));
            c.camadas.forEach(function (cam) {
                var i = CAMADAS.indexOf(cam);
                var y = 28 + i * 46;
                var r = svg("rect", { x: c.x, y: y, width: 130, height: 38, rx: 5, class: "camada" });
                caixas[ci + ":" + cam] = r;
                desenho.append(r, svg("text", { x: c.x + 65, y: y + 24, "text-anchor": "middle", "font-size": 12 }, cam));
            });
        });
        desenho.append(svg("line", { x1: 95, y1: 270, x2: 545, y2: 270, class: "linha" }),
            svg("line", { x1: 95, y1: 252, x2: 95, y2: 270, class: "linha" }),
            svg("line", { x1: 320, y1: 252, x2: 320, y2: 270, class: "linha" }),
            svg("line", { x1: 545, y1: 252, x2: 545, y2: 270, class: "linha" }),
            svg("text", { x: 320, y: 290, "text-anchor": "middle", "font-size": 11 }, "meio de transmissão físico"));

        // Caminho: desce em A, sobe no roteador até a rede, desce, sobe em B.
        var caminho = [];
        CAMADAS.forEach(function (c) { caminho.push([0, c]); });
        ["Física", "Enlace", "Rede", "Enlace", "Física"].forEach(function (c) { caminho.push([1, c]); });
        CAMADAS.slice().reverse().forEach(function (c) { caminho.push([2, c]); });
        var DESCRICAO = {
            "0:Aplicação": "A aplicação de A entrega uma SDU à camada de transporte.",
            "0:Transporte": "O transporte põe a SDU num segmento (identifica o fluxo, por exemplo com portas).",
            "0:Rede": "A rede põe o segmento num pacote com origem e destino.",
            "0:Enlace": "O enlace põe o pacote num quadro para o vizinho direto.",
            "0:Física": "A física recebe um Data.request por bit do quadro e transmite o sinal.",
            "1:Física": "A física do roteador decodifica o sinal e entrega os bits ao enlace.",
            "1:Enlace|sobe": "O enlace do roteador remonta o quadro e entrega o pacote à rede.",
            "1:Rede": "A rede do roteador lê o destino e escolhe o próximo enlace. O roteador não tem camada de transporte.",
            "1:Enlace|desce": "O pacote vai num novo quadro, para o próximo enlace.",
            "1:Física|desce": "Os bits do novo quadro saem pelo outro enlace.",
            "2:Física": "A física de B recebe o sinal e recupera os bits.",
            "2:Enlace": "O enlace de B remonta o quadro e entrega o pacote.",
            "2:Rede": "A rede de B vê que o pacote é para ela e entrega o segmento.",
            "2:Transporte": "O transporte de B identifica o fluxo e entrega a SDU à aplicação certa.",
            "2:Aplicação": "A aplicação de B recebe a SDU enviada por A."
        };
        var passo = -1, completou = false, temporizador = null;
        var saida = el("p", { class: "small mt-2 mb-1", "aria-live": "polite" });
        var progresso = el("p", { class: "small text-muted mb-0" });

        function chaveDescricao(k) {
            var c = caminho[k], base = c[0] + ":" + c[1];
            if (c[0] === 1 && c[1] === "Enlace") return base + (k < 8 ? "|sobe" : "|desce");
            if (c[0] === 1 && c[1] === "Física" && k > 5) return base + "|desce";
            return base;
        }

        function desenha() {
            Object.keys(caixas).forEach(function (k) { caixas[k].setAttribute("class", "camada"); });
            if (passo < 0) {
                saida.textContent = "Clique em Próximo passo para enviar uma mensagem de A para B.";
                progresso.textContent = "";
                return;
            }
            var c = caminho[passo];
            caixas[c[0] + ":" + c[1]].setAttribute("class", "no no-ativo");
            saida.replaceChildren(el("strong", null, COLS[c[0]].nome + " · " + c[1] + " · unidade: " + UNIDADE[c[1]] + ". "), DESCRICAO[chaveDescricao(passo)]);
            progresso.textContent = "Passo " + (passo + 1) + " de " + caminho.length + ".";
            if (passo === caminho.length - 1) completou = true;
        }
        function avanca() { if (passo < caminho.length - 1) { passo++; desenha(); return true; } return false; }
        function parar() { if (temporizador) { clearInterval(temporizador); temporizador = null; } }

        // Desafio: em que camadas o roteador processa a mensagem?
        var marcas = CAMADAS.map(function (c) {
            var ck = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("rot") });
            return { camada: c, ck: ck, linha: el("div", { class: "form-check form-check-inline" }, ck, el("label", { class: "form-check-label small", for: ck.id }, c)) };
        });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "pilha-roteador", 15, "Camadas tratadas pelo roteador");
        function conferir() {
            var escolhidas = marcas.filter(function (m) { return m.ck.checked; }).map(function (m) { return m.camada; });
            var certo = escolhidas.join() === "Rede,Enlace,Física";
            if (!completou) { u.marca(fb, false, "Acompanhe a mensagem até a aplicação de B antes de responder."); return; }
            if (certo) { u.marca(fb, true, "O roteador sobe só até a rede: lê o destino do pacote e o põe num novo quadro."); concluir(); }
            else u.marca(fb, false, "Reveja os passos 6 a 10: quais caixas do roteador ficaram destacadas?");
        }

        raiz.append(desenho, saida, progresso,
            el("div", { class: "d-flex gap-2 flex-wrap mt-2" },
                u.botao("Próximo passo", "btn-primary", function () { parar(); avanca(); }),
                u.botao("Animar", "btn-outline-primary", function () {
                    parar();
                    if (passo >= caminho.length - 1) passo = -1;
                    if (R.reduzMovimento()) { while (avanca()); return; }
                    temporizador = setInterval(function () { if (!avanca()) parar(); }, 700);
                }),
                u.botao("Recomeçar", "btn-outline-secondary", function () { parar(); passo = -1; desenha(); })),
            el("hr"),
            el("p", { class: "small fw-semibold mb-1" }, "Em quais camadas o roteador trata a mensagem?"),
            el("div", null, marcas.map(function (m) { return m.linha; })),
            u.botao("Conferir", "btn-outline-primary", conferir), fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): acompanhe a mensagem de A até B e marque as camadas do roteador (livro, pág. 116–117 do PDF)."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 2. A camada física não é confiável (Fig. 92)
     * ------------------------------------------------------------------ */
    R.registrar("fisica-nao-confiavel", function (raiz) {
        var ENVIADO = "01010010100010101001010";   // a sequência da Fig. 92
        var TIPOS = { troca: "Bit trocado", insere: "Bits a mais", remove: "Bits a menos" };
        var sorteio = u.aleatorio(9);
        var atual = null, acertos = 0, ordem = ["troca", "insere", "remove"];
        var concluir = R.desafio(raiz, "fisica-diagnostico", 15, "Diagnosticar erros da camada física");
        var area = el("div", { class: "mono small" });
        var fb = u.feedback();
        var placar = el("p", { class: "small text-muted mb-0" });

        function novo() {
            // As três primeiras rodadas mostram um de cada tipo, em ordem embaralhada.
            var tipo = acertos < 3 ? ordem[acertos] : ["troca", "insere", "remove"][Math.floor(sorteio() * 3)];
            var i = 2 + Math.floor(sorteio() * (ENVIADO.length - 4));
            var recebido;
            if (tipo === "troca") recebido = ENVIADO.slice(0, i) + (ENVIADO[i] === "0" ? "1" : "0") + ENVIADO.slice(i + 1);
            else if (tipo === "insere") recebido = ENVIADO.slice(0, i) + (sorteio() < 0.5 ? "0" : "1") + ENVIADO.slice(i);
            else recebido = ENVIADO.slice(0, i) + ENVIADO.slice(i + 1);
            atual = { tipo: tipo, recebido: recebido, i: i, respondido: false };
            area.replaceChildren(
                el("div", null, "enviado:  ", ENVIADO, " (" + ENVIADO.length + " bits)"),
                el("div", null, "recebido: ", recebido, " (" + recebido.length + " bits)"));
            fb.textContent = "";
        }
        function responde(tipo) {
            if (!atual || atual.respondido) return;
            if (tipo === atual.tipo) {
                atual.respondido = true;
                acertos++;
                var marcado = atual.recebido.slice(0, atual.i) + "[" + (atual.tipo === "remove" ? "" : atual.recebido[atual.i]) + "]" + atual.recebido.slice(atual.tipo === "remove" ? atual.i : atual.i + 1);
                u.marca(fb, true, TIPOS[tipo] + " na posição " + (atual.i + 1) + ": " + marcado);
                placar.textContent = "Diagnósticos corretos: " + acertos + (acertos < 3 ? " de 3." : ".");
                if (acertos >= 3) concluir();
            } else {
                u.marca(fb, false, "Compare primeiro o número de bits; se for igual, procure a posição que mudou.");
            }
        }
        ordem.sort(function () { return sorteio() - 0.5; });

        raiz.append(
            el("p", { class: "small mb-2" }, "A camada física pode trocar o valor de um bit, entregar bits a mais ou entregar bits a menos. Qual foi o caso?"),
            area,
            el("div", { class: "d-flex gap-2 flex-wrap mt-2" },
                Object.keys(TIPOS).map(function (k) { return u.botao(TIPOS[k], "btn-outline-primary", function () { responde(k); }); }),
                u.botao("Nova transmissão", "btn-outline-secondary", novo)),
            fb, placar,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça três diagnósticos corretos (livro, pág. 115 do PDF)."));
        novo();
    });

    /* ------------------------------------------------------------------
     * 3. Unidades de cada camada (terminologia do livro)
     * ------------------------------------------------------------------ */
    R.registrar("unidades-camadas", function (raiz) {
        var CERTO = { "Aplicação": "SDU", "Transporte": "segmento", "Rede": "pacote", "Enlace": "quadro", "Física": "bit" };
        var OPCOES = ["escolha…", "bit", "quadro", "pacote", "segmento", "SDU"];
        var seletores = {};
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "unidades-associar", 10, "Associar unidades e camadas");
        var linhas = CAMADAS.map(function (c) {
            var s = el("select", { class: "form-select form-select-sm", "aria-label": "Unidade trocada pela camada " + c },
                OPCOES.map(function (o, i) { return el("option", { value: i ? o : "" }, o); }));
            seletores[c] = s;
            return el("div", { class: "row g-2 align-items-center mb-1" },
                el("div", { class: "col-5 col-sm-4 small fw-semibold" }, "Camada " + c.toLowerCase()),
                el("div", { class: "col-7 col-sm-4" }, s));
        });
        function conferir() {
            var erradas = CAMADAS.filter(function (c) { return seletores[c].value !== CERTO[c]; });
            CAMADAS.forEach(function (c) { seletores[c].classList.toggle("is-invalid", seletores[c].value !== "" && seletores[c].value !== CERTO[c]); });
            if (!erradas.length) { u.marca(fb, true, "Bits, quadros, pacotes, segmentos e SDUs: a terminologia que o livro usa daqui em diante."); concluir(); }
            else u.marca(fb, false, erradas.length + " camada(s) com a unidade errada ou sem resposta.");
        }
        raiz.append(el("p", { class: "small mb-2" }, "Que unidade de informação as entidades de cada camada trocam entre si?"),
            el("div", null, linhas), u.botao("Conferir", "btn-primary", conferir), fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): associe as cinco unidades (livro, pág. 117–118 do PDF)."));
    });

    /* ------------------------------------------------------------------
     * 4. OSI × cinco camadas × TCP/IP (Fig. 97)
     * ------------------------------------------------------------------ */
    R.registrar("comparar-modelos", function (raiz) {
        // Cada bloco ocupa linhas da grade de 7 linhas do OSI.
        var MODELOS = [
            { nome: "OSI (7 camadas)", blocos: [["Aplicação", 0, 1], ["Apresentação", 1, 1], ["Sessão", 2, 1], ["Transporte", 3, 1], ["Rede", 4, 1], ["Enlace", 5, 1], ["Física", 6, 1]] },
            { nome: "Livro (5 camadas)", blocos: [["Aplicação", 0, 3], ["Transporte", 3, 1], ["Rede", 4, 1], ["Enlace", 5, 1], ["Física", 6, 1]] },
            { nome: "TCP/IP (RFC 1122)", blocos: [["Aplicação", 0, 3], ["Transporte", 3, 1], ["Internet", 4, 1], ["Enlace (link)", 5, 2]] }
        ];
        var EXPLICA = {
            "Sessão": "OSI: organiza e sincroniza o diálogo e esconde as falhas das conexões de transporte.",
            "Apresentação": "OSI: oferece uma representação comum dos dados (por exemplo, com ASN.1).",
            "Aplicação": "Os mecanismos e estruturas de dados de que as aplicações precisam.",
            "Transporte": "Distingue os fluxos de comunicação entre dois hosts (TCP, UDP); troca segmentos.",
            "Rede": "Leva pacotes entre hosts que não estão no mesmo meio, passando por roteadores.",
            "Internet": "TCP/IP: equivale à camada de rede do modelo do livro.",
            "Enlace": "Troca quadros entre hosts ligados diretamente.",
            "Física": "Transfere bits por um meio físico, sem garantias.",
            "Enlace (link)": "TCP/IP: junta as funções das camadas física e de enlace."
        };
        var ALT = 32;
        var desenho = svg("svg", { viewBox: "0 0 640 " + (40 + 7 * ALT), class: "sim-svg w-100", style: "max-height:300px" });
        desenho.appendChild(svg("title", { text: "Três pilhas lado a lado: o OSI com sete camadas, o modelo do livro com cinco e o TCP/IP com quatro. A aplicação do livro e do TCP/IP corresponde a aplicação, apresentação e sessão do OSI; o enlace do TCP/IP corresponde a enlace e física." }));
        var retangulos = [];
        var info = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" }, "Clique numa camada para ver as correspondências.");
        MODELOS.forEach(function (m, mi) {
            var x = 20 + mi * 210;
            desenho.appendChild(svg("text", { x: x + 95, y: 20, "text-anchor": "middle", "font-size": 12, "font-weight": 600 }, m.nome));
            m.blocos.forEach(function (b) {
                var y = 30 + b[1] * ALT, h = b[2] * ALT - 4;
                var r = svg("rect", { x: x, y: y, width: 190, height: h, rx: 5, class: "camada" });
                var g = svg("g", { style: "cursor:pointer", tabindex: 0, role: "button", "aria-label": m.nome + ": " + b[0] }, r,
                    svg("text", { x: x + 95, y: y + h / 2 + 4, "text-anchor": "middle", "font-size": 12 }, b[0]));
                var item = { r: r, ini: b[1], fim: b[1] + b[2], nome: b[0], modelo: m.nome };
                retangulos.push(item);
                function seleciona() {
                    retangulos.forEach(function (o) {
                        var cruza = o.ini < item.fim && item.ini < o.fim;
                        o.r.setAttribute("class", o === item ? "no no-ativo" : cruza ? "no" : "camada");
                    });
                    var pares = retangulos.filter(function (o) { return o.modelo !== item.modelo && o.ini < item.fim && item.ini < o.fim; })
                        .map(function (o) { return o.modelo.split(" ")[0] + ": " + o.nome; });
                    info.replaceChildren(el("strong", null, item.modelo + " · " + item.nome + ". "), EXPLICA[item.nome] + " Corresponde a — " + pares.join("; ") + ".");
                }
                g.addEventListener("click", seleciona);
                g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); seleciona(); } });
                desenho.appendChild(g);
            });
        });

        var FUNCOES = [
            ["Organizar e sincronizar o diálogo, escondendo falhas das conexões de transporte", "Sessão (OSI)"],
            ["Oferecer uma representação comum dos dados, por exemplo com ASN.1", "Apresentação (OSI)"],
            ["Juntar as funções das camadas física e de enlace", "Enlace do TCP/IP"],
            ["Distinguir fluxos de comunicação entre dois hosts, como fazem o TCP e o UDP", "Transporte"],
            ["Transferir bits por um meio físico, sem garantias", "Física"],
            ["Ser, no TCP/IP, o equivalente da camada de rede do livro", "Internet do TCP/IP"]
        ];
        var OPCOES = ["escolha…", "Física", "Enlace", "Rede", "Transporte", "Sessão (OSI)", "Apresentação (OSI)", "Aplicação", "Enlace do TCP/IP", "Internet do TCP/IP"];
        var concluir = R.desafio(raiz, "modelos-classificar", 20, "Classificar funções nos modelos");
        var fb = u.feedback();
        var sels = FUNCOES.map(function (f) {
            return el("select", { class: "form-select form-select-sm", "aria-label": "Camada para: " + f[0] }, OPCOES.map(function (o, i) { return el("option", { value: i ? o : "" }, o); }));
        });
        function conferir() {
            var erros = 0;
            FUNCOES.forEach(function (f, i) {
                var ok = sels[i].value === f[1];
                if (!ok) erros++;
                sels[i].classList.toggle("is-invalid", sels[i].value !== "" && !ok);
                sels[i].classList.toggle("is-valid", ok);
            });
            if (!erros) { u.marca(fb, true, "As seis funções estão na camada certa."); concluir(); }
            else u.marca(fb, false, erros + " função(ões) ainda fora do lugar. Clique nas camadas do diagrama para ler o papel de cada uma.");
        }
        raiz.append(desenho, info, el("hr"),
            el("p", { class: "small fw-semibold mb-2" }, "Em que camada fica cada função?"),
            el("div", null, FUNCOES.map(function (f, i) {
                return el("div", { class: "row g-2 align-items-center mb-2" }, el("div", { class: "col-md-7 small" }, f[0]), el("div", { class: "col-md-5" }, sels[i]));
            })),
            u.botao("Conferir", "btn-primary", conferir), fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (20 pts): classifique as seis funções (livro, pág. 118–119 do PDF)."));
    });
}());

/* Etapa "3. Visualização" dos conceitos enlace, rede e transporte (Figs. 93–95, pág. 116–117 do PDF). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, s = u.svg;
    function escolha(rotulo, lista) {
        return el("select", { class: "form-select form-select-sm", "aria-label": rotulo },
            el("option", { value: "" }, "escolha…"), lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }));
    }
    function fundo(w, h) { return s("rect", { x: 0, y: 0, width: w, height: h, style: "fill: var(--bs-body-bg)" }); }
    // Uma pilha de camadas; `acesas` diz quais camadas aparecem destacadas.
    function pilha(x, y, nome, camadas, acesas, larg) {
        var w = larg || 110, g = s("g", { "font-size": 11, "text-anchor": "middle" });
        g.append(s("text", { x: x + w / 2, y: y - 6, "font-weight": "bold" }, nome));
        camadas.forEach(function (c, i) {
            var ativa = acesas && acesas.indexOf(c) >= 0;
            g.append(s("rect", { class: ativa ? "no no-ativo" : "camada", x: x, y: y + i * 28, width: w, height: 26, rx: 4 }),
                s("text", { x: x + w / 2, y: y + i * 28 + 17 }, c));
        });
        return g;
    }

    /* ---------- Fig. 93: o quadro desce bit a bit ---------- */
    function requestsPorQuadro(bytes) { return bytes * 8; }
    R.requestsPorQuadro = requestsPorQuadro;

    R.registrar("quadro-bits", function (raiz) {
        var entrada = el("input", { class: "form-control form-control-sm mono", value: "10110010", maxlength: 16, "aria-label": "Bits do quadro", spellcheck: "false" });
        var ruido = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") });
        var desenho = s("svg", { viewBox: "0 0 640 240", class: "sim-svg w-100", style: "max-height:260px", role: "img", "aria-label": "Duas entidades de enlace trocam um quadro; na verdade cada bit desce à camada física, vira sinal e sobe do outro lado." });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var enviados = 0;
        function bits() { return entrada.value.replace(/[^01]/g, "").slice(0, 16); }
        function recebido(b) { return b.split("").map(function (x, i) { return ruido.checked && i === 4 ? (x === "1" ? "0" : "1") : x; }).join(""); }
        function desenha() {
            var b = bits(), rx = recebido(b), n = Math.min(enviados, b.length);
            var g = s("g", null, fundo(640, 240));
            g.append(pilha(20, 30, "Host A", ["Enlace", "Física"], n > 0 && n < b.length ? ["Enlace", "Física"] : null));
            g.append(pilha(510, 30, "Host B", ["Enlace", "Física"], n > 0 && n < b.length ? ["Física", "Enlace"] : null));
            g.append(s("line", { class: "linha", x1: 130, y1: 44, x2: 510, y2: 44, "stroke-dasharray": "5 4" }),
                s("text", { x: 320, y: 38, "font-size": 11, "text-anchor": "middle" }, "o quadro, \"diretamente\" (Fig. 93)"));
            // sinal NRZ-L no meio físico: 1 = nível alto, 0 = nível baixo
            var x0 = 150, larg = 340 / Math.max(b.length, 1), pts = [];
            for (var i = 0; i < n; i++) {
                var y = rx[i] === "1" ? 80 : 108;
                pts.push((x0 + i * larg) + "," + y, (x0 + (i + 1) * larg) + "," + y);
                g.append(s("text", { x: x0 + i * larg + larg / 2, y: 128, "font-size": 11, "text-anchor": "middle", class: rx[i] !== b[i] ? "text-danger" : null, style: rx[i] !== b[i] ? "fill: var(--bs-danger)" : null }, rx[i]));
            }
            g.append(s("rect", { class: "camada", x: 130, y: 70, width: 380, height: 48, rx: 4, style: "fill-opacity:.35" }));
            if (pts.length) g.append(s("polyline", { points: pts.join(" "), fill: "none", class: "linha-ativa" }));
            g.append(s("text", { x: 320, y: 146, "font-size": 11, "text-anchor": "middle" }, "meio físico (sinal NRZ-L: 1 = nível alto, 0 = nível baixo)"));
            var reqs = [], inds = [];
            for (var j = 0; j < n; j++) { reqs.push("Data.request(" + b[j] + ")"); inds.push("Data.indication(" + rx[j] + ")"); }
            g.append(s("text", { x: 20, y: 172, "font-size": 11 }, "A emitiu " + n + " de " + b.length + " Data.request"));
            g.append(s("text", { x: 620, y: 172, "font-size": 11, "text-anchor": "end" }, "B recebeu " + n + " Data.indication"));
            g.append(s("text", { x: 20, y: 192, "font-size": 10, class: "mono" }, reqs.slice(-3).join("  ")));
            g.append(s("text", { x: 620, y: 192, "font-size": 10, "text-anchor": "end", class: "mono" }, inds.slice(-3).join("  ")));
            if (n === b.length && b.length) g.append(s("text", { x: 320, y: 222, "font-size": 12, "text-anchor": "middle", "font-weight": "bold" }, "B montou o quadro " + rx + (rx === b ? " = o enviado" : " ≠ " + b + " (erro de transmissão)")));
            desenho.replaceChildren(s("title", null, "Um quadro atravessa a camada física bit a bit"), g);
            saida.textContent = !b.length ? "Digite bits 0 e 1." : n === 0 ? "Cada bit do quadro vira um Data.request para a camada física."
                : n < b.length ? "Bit " + n + ": A pediu Data.request(" + b[n - 1] + "); a física de B decodificou o sinal e entregou Data.indication(" + rx[n - 1] + ")."
                : rx === b ? "Sem erros de transmissão, B recebe exatamente o quadro que A enviou." : "O ruído inverteu o 5º bit no meio físico: a camada física não percebe, e o quadro chega errado.";
        }
        function reinicia() { enviados = 0; desenha(); }
        entrada.addEventListener("input", reinicia);
        ruido.addEventListener("change", reinicia);
        var resp = el("input", { type: "number", class: "form-control form-control-sm", min: 0, "aria-label": "Número de Data.request" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "quadro-bits", 10, "Contar as primitivas de um quadro");
        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-5" }, u.campo("Bits do quadro (até 16)", entrada)),
                el("div", { class: "col-sm-7 d-flex flex-wrap gap-2 mb-2" },
                    u.botao("Próximo bit", "btn-primary", function () { if (enviados < bits().length) enviados++; desenha(); }),
                    u.botao("Quadro inteiro", "btn-outline-primary", function () { enviados = bits().length; desenha(); }),
                    u.botao("Recomeçar", "btn-outline-secondary", reinicia))),
            el("div", { class: "form-check mb-2" }, ruido, el("label", { class: "form-check-label small", for: ruido.id }, "Ruído no meio: inverter o 5º bit")),
            desenho, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): quantos Data.request a entidade de enlace emite para enviar um quadro de 1500 bytes?"),
            el("div", { class: "d-flex gap-2 align-items-center" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === requestsPorQuadro(1500);
                u.marca(fb, ok, ok ? "12 000: um por bit, e um byte tem 8 bits." : "Não. A entidade de enlace emite um Data.request para cada bit do quadro.");
                if (ok) concluir();
            })), fb);
        desenha();
    });

    /* ---------- Fig. 94: o pacote atravessa roteadores ---------- */
    var NOS = [{ nome: "Host A", tipo: "host" }, { nome: "Roteador R1", tipo: "rot" }, { nome: "Roteador R2", tipo: "rot" }, { nome: "Host B", tipo: "host" }];
    var CAMADAS3 = ["Rede", "Enlace", "Física"];
    function passosPacote(nRoteadores) {
        var p = [{ no: 0, camadas: ["Rede", "Enlace", "Física"], texto: "Host A: a camada de rede monta o pacote (origem A, destino B) e o entrega ao enlace, que o põe num quadro." }];
        for (var r = 1; r <= nRoteadores; r++) {
            p.push({ no: r, camadas: ["Física", "Enlace", "Rede"], texto: "Roteador R" + r + ": o quadro chega, o enlace tira o pacote dele, e a camada de rede lê o destino para escolher a próxima saída. O pacote não sobe além da rede." });
        }
        p.push({ no: nRoteadores + 1, camadas: ["Física", "Enlace", "Rede"], texto: "Host B: o pacote chega ao destino e a camada de rede o entrega para cima." });
        return p;
    }
    function enlacesNoCaminho(nRoteadores) { return nRoteadores + 1; }
    R.enlacesNoCaminho = enlacesNoCaminho;

    R.registrar("pacote-roteadores", function (raiz) {
        var passos = passosPacote(2), atual = 0;
        var desenho = s("svg", { viewBox: "0 0 640 190", class: "sim-svg w-100", style: "max-height:230px", role: "img", "aria-label": "Um pacote vai do host A ao host B passando por dois roteadores." });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function desenha() {
            var p = passos[atual], g = s("g", null, fundo(640, 190));
            NOS.forEach(function (n, i) {
                var x = 15 + i * 160;
                g.append(pilha(x, 40, n.nome, CAMADAS3, p.no === i ? p.camadas : null, 130));
                if (i < NOS.length - 1) {
                    var ativo = p.no === i;
                    g.append(s("line", { class: ativo ? "linha-ativa" : "linha", x1: x + 130, y1: 107, x2: x + 160, y2: 107 }));
                }
            });
            var xp = 15 + p.no * 160 + 65;
            g.append(s("rect", { class: "pacote", x: xp - 30, y: 140, width: 60, height: 22, rx: 4 }), s("text", { x: xp, y: 155, "font-size": 11, "text-anchor": "middle", class: "balao-texto" }, "A → B"));
            g.append(s("text", { x: 320, y: 182, "font-size": 11, "text-anchor": "middle" }, "passo " + (atual + 1) + " de " + passos.length + " · " + enlacesNoCaminho(2) + " enlaces no caminho"));
            desenho.replaceChildren(s("title", null, "O pacote e as camadas usadas em cada nó"), g);
            saida.textContent = p.texto;
        }
        var PERG1 = escolha("Até que camada o pacote sobe num roteador", [["fisica", "Física"], ["enlace", "Enlace"], ["rede", "Rede"], ["transporte", "Transporte"]]);
        var PERG2 = el("input", { type: "number", min: 0, class: "form-control form-control-sm", "aria-label": "Número de quadros" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "pacote-roteadores", 10, "O pacote nos roteadores");
        raiz.append(el("div", { class: "d-flex flex-wrap gap-2 mb-2" },
                u.botao("◀ Passo anterior", "btn-outline-primary", function () { atual = Math.max(0, atual - 1); desenha(); }),
                u.botao("Próximo passo ▶", "btn-primary", function () { atual = Math.min(passos.length - 1, atual + 1); desenha(); })),
            desenho, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, "Até que camada o pacote sobe dentro de um roteador?"), el("div", { class: "col-sm-5" }, PERG1)),
            el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-7 small" }, "Com 4 roteadores entre A e B, em quantos quadros diferentes (um por enlace) o pacote viaja?"), el("div", { class: "col-sm-5" }, PERG2)),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok1 = PERG1.value === "rede", ok2 = Number(PERG2.value) === enlacesNoCaminho(4);
                u.marca(fb, ok1 && ok2, ok1 && ok2 ? "Isso. O roteador só precisa da camada de rede para escolher a saída, e cada um dos 5 enlaces leva o pacote num quadro próprio."
                    : (ok1 ? "" : "O roteador lê o destino do pacote, que é informação da camada de rede. ") + (ok2 ? "" : "Conte os enlaces: há um a mais que o número de roteadores."));
                if (ok1 && ok2) concluir();
            }), fb);
        desenha();
    });

    /* ---------- Fig. 95: segmentos dentro de pacotes ---------- */
    var FLUXOS = [
        { id: "web", nome: "navegador → servidor web", transporte: "TCP", po: 52100, pd: 80 },
        { id: "mail", nome: "cliente de e-mail → servidor SMTP", transporte: "TCP", po: 52101, pd: 25 },
        { id: "dns", nome: "resolvedor → servidor DNS", transporte: "UDP", po: 53000, pd: 53 }
    ];
    R.fluxosEncapsula = FLUXOS;

    R.registrar("encapsula", function (raiz) {
        var sel = el("select", { class: "form-select form-select-sm", "aria-label": "Fluxo entre os hosts A e B" }, FLUXOS.map(function (f) { return el("option", { value: f.id }, f.nome + " (" + f.transporte + ")"); }));
        var caixa = el("div", { class: "mt-2" });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function bloco(cor, titulo, campos, dentro) {
            return el("div", { class: "border rounded p-2 mt-1", style: "border-color: " + cor + " !important; border-width: 2px !important" },
                el("div", { class: "small fw-semibold" }, titulo),
                el("div", { class: "small mono" }, campos), dentro || null);
        }
        function mostra() {
            var f = FLUXOS.find(function (x) { return x.id === sel.value; });
            caixa.replaceChildren(
                bloco("var(--muted)", "Quadro (enlace) — cabeçalho do enlace", "muda a cada enlace do caminho",
                    bloco("var(--accent)", "Pacote (rede) — cabeçalho", "origem: host A · destino: host B · protocolo: " + f.transporte,
                        bloco("var(--warn)", "Segmento (transporte) — cabeçalho", "porta de origem: " + f.po + " · porta de destino: " + f.pd,
                            el("div", { class: "small border rounded p-1 mt-1" }, "dados da aplicação")))));
            saida.textContent = "Os três fluxos usam os mesmos dois hosts, então o cabeçalho do pacote só difere no campo de protocolo. Quem separa os fluxos é a camada de transporte, pelas portas. Os roteadores do caminho não têm camada de transporte (Fig. 95): só os hosts leem as portas.";
        }
        sel.addEventListener("change", mostra);
        var PERG1 = escolha("O que distingue os fluxos", [["enderecos", "os endereços de rede dos hosts"], ["portas", "o protocolo de transporte e as portas"], ["quadro", "o cabeçalho do quadro"]]);
        var PERG2 = escolha("Quem lê as portas", [["rot", "os roteadores do caminho"], ["hosts", "só os dois hosts"], ["todos", "todos os nós"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "encapsula", 10, "Segmentos, pacotes e quadros");
        raiz.append(u.campo("Fluxo entre os hosts A e B", sel), caixa, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-6 small" }, "O que distingue dois fluxos entre os mesmos hosts?"), el("div", { class: "col-sm-6" }, PERG1)),
            el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-6 small" }, "Quem lê as portas no caminho de A até B?"), el("div", { class: "col-sm-6" }, PERG2)),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = PERG1.value === "portas" && PERG2.value === "hosts";
                u.marca(fb, ok, ok ? "Isso: identificar o fluxo é tarefa da camada de transporte, que só existe nos hosts." : "Ainda não. Compare os cabeçalhos dos três fluxos e veja que camadas os roteadores têm na Fig. 95.");
                if (ok) concluir();
            }), fb);
        mostra();
    });
}());
