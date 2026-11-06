/* Simulações do Capítulo 4 — A camada de transporte. Cada uma é registrada em Redes.registrar. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function embaralha(lista, rnd) {
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // Desafio de ordenação: lista com botões ↑/↓. Devolve {no, ordemAtual()}.
    function listaOrdenavel(itens, aoMudar) {
        var ordem = itens.slice();
        var no = el("div", { class: "ordem-lista", role: "list" });
        function render() {
            no.replaceChildren();
            ordem.forEach(function (item, i) {
                no.appendChild(el("div", { class: "ordem-item", role: "listitem" },
                    el("span", { class: "badge text-bg-secondary" }, String(i + 1)),
                    el("span", { class: "mono" }, item),
                    u.botao("↑", "btn-outline-secondary py-0", function () { mover(i, -1); }, "Mover " + item + " para cima"),
                    u.botao("↓", "btn-outline-secondary py-0", function () { mover(i, 1); }, "Mover " + item + " para baixo")));
            });
        }
        function mover(i, d) {
            var j = i + d;
            if (j < 0 || j >= ordem.length) return;
            var t = ordem[i]; ordem[i] = ordem[j]; ordem[j] = t;
            render();
            if (aoMudar) aoMudar();
        }
        render();
        return { no: no, ordemAtual: function () { return ordem.slice(); }, definir: function (n) { ordem = n.slice(); render(); } };
    }

    /* ------------------------------------------------------------------
     * 1. Serviço sem conexão não confiável
     * ------------------------------------------------------------------ */
    function simulaRede(qtd, p, rnd) {
        // Devolve {eventos, entregas, ocorridos}
        var eventos = [], entregas = [], ocorridos = {};
        for (var i = 0; i < qtd; i++) {
            var nome = "M" + (i + 1);
            var t0 = i * 1.2;
            if (rnd() < p.perda) {
                eventos.push({ de: 0, para: 1, t0: t0, t1: t0 + 1.4, rotulo: nome, tipo: "perda", rotuloOrigem: "DATA.req(" + nome + ")" });
                ocorridos.perda = true;
                continue;
            }
            var atraso = rnd() < p.reordem ? 2.6 + rnd() * 1.6 : 1.4;
            if (atraso > 1.4) ocorridos.reordem = true;
            var corrompe = rnd() < p.erro;
            if (corrompe) ocorridos.erro = true;
            var conteudo = corrompe ? nome.split("").reverse().join("") + "?" : nome;
            eventos.push({ de: 0, para: 1, t0: t0, t1: t0 + atraso, rotulo: nome, tipo: corrompe ? "erro" : "ok", rotuloOrigem: "DATA.req(" + nome + ")", rotuloDestino: "DATA.ind(" + conteudo + ")" });
            entregas.push({ t: t0 + atraso, texto: conteudo, original: nome, corrompido: corrompe });
            if (rnd() < p.dup) {
                ocorridos.dup = true;
                var t1 = t0 + atraso + 0.8;
                eventos.push({ de: 0, para: 1, t0: t0 + 0.4, t1: t1, rotulo: nome + " (cópia)", tipo: "dup", rotuloDestino: "DATA.ind(" + conteudo + ")" });
                entregas.push({ t: t1, texto: conteudo, original: nome, corrompido: corrompe, dup: true });
            }
        }
        entregas.sort(function (a, b) { return a.t - b.t; });
        // Reordenação só "conta" se a ordem de entrega realmente mudou.
        var ordem = entregas.filter(function (e) { return !e.dup; }).map(function (e) { return Number(e.original.slice(1)); });
        ocorridos.reordem = ordem.some(function (v, k) { return k > 0 && v < ordem[k - 1]; });
        return { eventos: eventos, entregas: entregas, ocorridos: ocorridos };
    }

    R.registrar("servico-sem-conexao", function (raiz) {
        var nomes = { perda: "Perda", dup: "Duplicação", erro: "Corrupção", reordem: "Reordenação/atraso" };
        var sliders = {};
        var controles = el("div", { class: "row g-2" });
        Object.keys(nomes).forEach(function (k) {
            var out = el("output", { class: "mono" }, "20%");
            var s = el("input", { type: "range", min: 0, max: 60, step: 5, value: 20, class: "form-range", id: u.novoId(k) });
            s.addEventListener("input", function () { out.textContent = s.value + "%"; });
            sliders[k] = s;
            controles.appendChild(el("div", { class: "col-6 col-md-3" }, el("label", { class: "form-label small mb-0", for: s.id }, nomes[k] + ": ", out), s));
        });
        var qtd = el("select", { class: "form-select form-select-sm" }, [3, 4, 5, 6].map(function (n) { return el("option", { value: n, selected: n === 4 }, n + " SDUs"); }));
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });

        function desenha(r, alvo, titulo) {
            alvo.replaceChildren(R.diagramaSequencia({
                titulo: titulo, colunas: ["Origem S", "Destino D"], eventos: r.eventos, passo: 30, largura: 560
            }));
        }
        function enviar() {
            var p = {};
            Object.keys(sliders).forEach(function (k) { p[k] = Number(sliders[k].value) / 100; });
            var r = simulaRede(Number(qtd.value), p, u.aleatorio());
            desenha(r, area, "Diagrama de sequência: SDUs enviadas de S para D por um serviço sem conexão não confiável.");
            resumo.textContent = "Entregue à aplicação em D, nesta ordem: " + (r.entregas.length ? r.entregas.map(function (e) { return e.texto; }).join(", ") : "nada") +
                ". Problemas ocorridos: " + (Object.keys(r.ocorridos).filter(function (k) { return r.ocorridos[k]; }).map(function (k) { return nomes[k].toLowerCase(); }).join(", ") || "nenhum") + ".";
        }

        // Desafio: diagnosticar as imperfeições de uma transmissão misteriosa.
        var concluir = R.desafio(raiz, "sem-conexao-diagnostico", 20, "Diagnosticar três transmissões");
        var acertos = 0, atual = null;
        var areaD = el("div");
        var marcas = {};
        var grupo = el("div", { class: "d-flex flex-wrap gap-3 small" });
        Object.keys(nomes).forEach(function (k) {
            var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("diag") });
            marcas[k] = c;
            grupo.appendChild(el("div", { class: "form-check" }, c, el("label", { class: "form-check-label", for: c.id }, nomes[k])));
        });
        var fb = u.feedback();
        var placar = el("p", { class: "small text-muted mb-1" });
        function novoMisterio() {
            var rnd = u.aleatorio();
            do {
                atual = simulaRede(5, { perda: 0.25, dup: 0.25, erro: 0.25, reordem: 0.3 }, rnd);
            } while (!Object.keys(atual.ocorridos).some(function (k) { return atual.ocorridos[k]; }));
            desenha(atual, areaD, "Transmissão misteriosa: identifique quais imperfeições ocorreram.");
            Object.keys(marcas).forEach(function (k) { marcas[k].checked = false; });
            fb.textContent = "";
            placar.textContent = "Diagnósticos corretos: " + acertos + " de 3.";
        }
        function confere() {
            var erradas = Object.keys(nomes).filter(function (k) { return !!atual.ocorridos[k] !== marcas[k].checked; });
            if (!erradas.length) {
                acertos++;
                u.marca(fb, true, "Diagnóstico correto.");
                if (acertos >= 3) { concluir(); placar.textContent = "Desafio concluído (3 de 3)."; }
                else setTimeout(novoMisterio, 1200);
            } else {
                u.marca(fb, false, "Revise: " + erradas.map(function (k) { return nomes[k].toLowerCase(); }).join(", ") + ". Dica: compare os DATA.req da esquerda com os DATA.ind da direita.");
            }
            placar.textContent = acertos >= 3 ? "Desafio concluído (3 de 3)." : "Diagnósticos corretos: " + acertos + " de 3.";
        }

        raiz.append(controles,
            el("div", { class: "d-flex flex-wrap gap-2 align-items-end" }, el("div", null, u.campo("Quantidade", qtd)), el("div", { class: "mb-2" }, u.botao("Enviar SDUs", "btn-primary", enviar))),
            area, resumo,
            el("p", { class: "small text-muted mt-1 mb-0" }, "Legenda: azul = entregue · tracejado vermelho com ✕ = perdido · laranja = corrompido · pontilhado laranja = cópia duplicada · setas que se cruzam = reordenação."),
            el("hr"),
            el("p", { class: "small text-muted mb-1" }, "Desafio (20 pts): marque as imperfeições que aconteceram nesta transmissão. Acerte três seguidas."),
            placar, areaD, grupo,
            el("div", { class: "d-flex gap-2 mt-2" }, u.botao("Conferir diagnóstico", "btn-primary", confere), u.botao("Outra transmissão", "btn-outline-secondary", novoMisterio)),
            fb);
        enviar(); novoMisterio();
    });

    /* ------------------------------------------------------------------
     * 2. Primitivas do serviço orientado a conexão
     * ------------------------------------------------------------------ */
    var CENARIOS_PRIM = {
        aceita: {
            titulo: "Conexão aceita",
            eventos: [
                { de: 0, para: 2, rotulo: "", rotuloOrigem: "CONNECT.req", rotuloDestino: "CONNECT.ind", inclinacao: 1.4 },
                { de: 2, para: 0, rotulo: "", rotuloOrigem: "CONNECT.resp", rotuloDestino: "CONNECT.conf", inclinacao: 1.4 },
                { nota: 1, rotulo: "Conexão aberta: os dois podem enviar SDUs", tipo: "ok" }
            ],
            texto: ["A pede a conexão com CONNECT.request, cujo parâmetro principal é o endereço do destino.",
                "O provedor avisa B com CONNECT.indication. B aceita com CONNECT.response; para B, a conexão já está estabelecida.",
                "O provedor entrega CONNECT.confirm a A, encerrando a fase de estabelecimento."]
        },
        recusada: {
            titulo: "Recusada pelo destino",
            eventos: [
                { de: 0, para: 2, rotulo: "", rotuloOrigem: "CONNECT.req", rotuloDestino: "CONNECT.ind", inclinacao: 1.4 },
                { de: 2, para: 0, rotulo: "motivo", rotuloOrigem: "DISCONNECT.req", rotuloDestino: "DISCONNECT.ind", tipo: "ctrl", inclinacao: 1.4 },
                { nota: 1, rotulo: "Conexão recusada", tipo: "bad" }
            ],
            texto: ["A pede a conexão.",
                "B não aceita, por política ou desempenho, e responde com DISCONNECT.request, indicando o motivo.",
                "O provedor entrega DISCONNECT.indication a A."]
        },
        inalcancavel: {
            titulo: "Destino inalcançável",
            eventos: [
                { de: 0, para: 1, rotulo: "", rotuloOrigem: "CONNECT.req", inclinacao: 1 },
                { nota: 1, rotulo: "B não está conectado ou há congestionamento", tipo: "bad" },
                { de: 1, para: 0, rotulo: "motivo", rotuloDestino: "DISCONNECT.ind", tipo: "ctrl", inclinacao: 1 }
            ],
            texto: ["A pede a conexão.",
                "O provedor não consegue alcançar B (desconectado da rede ou congestionamento).",
                "O próprio provedor responde com DISCONNECT.indication, e B nem fica sabendo da tentativa."]
        }
    };

    R.registrar("primitivas-conexao", function (raiz) {
        var escolha = el("select", { class: "form-select form-select-sm" }, Object.keys(CENARIOS_PRIM).map(function (k) { return el("option", { value: k }, CENARIOS_PRIM[k].titulo); }));
        var area = el("div", { class: "mt-2" });
        var legenda = el("p", { class: "small mb-0", "aria-live": "polite" });
        var passo = 0;
        var avancar = u.botao("Próximo passo", "btn-primary", function () { passo++; render(); });
        function render() {
            var c = CENARIOS_PRIM[escolha.value];
            var total = c.eventos.length;
            passo = Math.max(1, Math.min(passo, total));
            area.replaceChildren(R.diagramaSequencia({
                titulo: c.titulo + ": diagrama de sequência das primitivas de serviço.",
                colunas: ["Usuário A", "Provedor", "Usuário B"],
                eventos: c.eventos.slice(0, passo), largura: 600, passo: 36
            }));
            legenda.textContent = "Passo " + passo + " de " + total + ": " + c.texto[passo - 1];
            avancar.disabled = passo >= total;
        }
        escolha.addEventListener("change", function () { passo = 1; render(); });

        // Desafio: ordenar as primitivas de um estabelecimento bem-sucedido.
        var concluir = R.desafio(raiz, "primitivas-ordem", 15, "Ordenar as primitivas de conexão");
        var correta = ["CONNECT.request", "CONNECT.indication", "CONNECT.response", "CONNECT.confirm"];
        var lista = listaOrdenavel(["CONNECT.confirm", "CONNECT.response", "CONNECT.request", "CONNECT.indication"]);
        var fb = u.feedback();
        function confere() {
            var ok = lista.ordemAtual().join() === correta.join();
            if (ok) { u.marca(fb, true, "Ordem correta: request (A) → indication (B) → response (B) → confirm (A)."); concluir(); }
            else u.marca(fb, false, "Ainda não. Quem inicia usa request; quem recebe, indication; quem aceita, response; e o confirm fecha a fase.");
        }

        raiz.append(
            el("div", { class: "d-flex flex-wrap gap-2 align-items-end" },
                el("div", null, u.campo("Cenário", escolha)),
                el("div", { class: "mb-2 d-flex gap-2" }, avancar, u.botao("Mostrar tudo", "btn-outline-secondary", function () { passo = 99; render(); }), u.botao("Reiniciar", "btn-outline-secondary", function () { passo = 1; render(); }))),
            area, legenda, el("hr"),
            el("p", { class: "small text-muted mb-2" }, "Desafio (15 pts): coloque as primitivas de um estabelecimento bem-sucedido na ordem em que ocorrem."),
            lista.no, u.botao("Conferir ordem", "btn-primary mt-2", confere), fb);
        passo = 1; render();
    });

    /* ------------------------------------------------------------------
     * 3. Modo mensagem vs. modo fluxo
     * ------------------------------------------------------------------ */
    R.registrar("mensagem-vs-fluxo", function (raiz) {
        var entrada = el("input", { class: "form-control form-control-sm mono", value: "A|BCD|EF" });
        var modo = el("select", { class: "form-select form-select-sm" }, el("option", { value: "fluxo" }, "Modo fluxo (byte stream)"), el("option", { value: "mensagem" }, "Modo mensagem"));
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mb-0", "aria-live": "polite" });

        function transmitir() {
            var sdus = entrada.value.split("|").filter(function (s) { return s.length; }).slice(0, 6);
            if (!sdus.length) { resumo.textContent = "Digite ao menos uma SDU (separe com |)."; return; }
            var inds;
            if (modo.value === "mensagem") inds = sdus.slice();
            else {
                var tudo = sdus.join(""), rnd = u.aleatorio();
                inds = [];
                var i = 0;
                while (i < tudo.length) {
                    var n = 1 + Math.floor(rnd() * Math.min(4, tudo.length - i));
                    inds.push(tudo.slice(i, i + n)); i += n;
                }
            }
            var eventos = [];
            eventos.push({ de: 0, para: 1, t0: 0, t1: 0.9, rotulo: "", tipo: "ctrl", rotuloOrigem: "CONNECT.req", rotuloDestino: "CONNECT.ind" });
            eventos.push({ de: 1, para: 0, t0: 1.1, t1: 2, rotulo: "", tipo: "ctrl", rotuloOrigem: "CONNECT.resp", rotuloDestino: "CONNECT.conf" });
            var base = 2.6, n = Math.max(sdus.length, inds.length);
            sdus.forEach(function (s, k) {
                eventos.push({ de: 0, para: 1, t0: base + k * (n / sdus.length), t1: base + k * (n / sdus.length) + 0.4, rotulo: "", tipo: "tracejado", rotuloOrigem: "DATA.req(\"" + s + "\")" });
            });
            inds.forEach(function (s, k) {
                var t1 = base + 1 + k * (n / inds.length);
                eventos.push({ de: 0, para: 1, t0: t1 - 0.9, t1: t1, rotulo: "", rotuloDestino: "DATA.ind(\"" + s + "\")" });
            });
            area.replaceChildren(R.diagramaSequencia({
                titulo: "Transferência em " + (modo.value === "mensagem" ? "modo mensagem" : "modo fluxo") + ": DATA.request à esquerda, DATA.indication à direita.",
                colunas: ["Usuário A", "Usuário B"], eventos: eventos, largura: 560, passo: 30
            }));
            resumo.textContent = sdus.length + " DATA.request → " + inds.length + " DATA.indication. " +
                (modo.value === "mensagem" ? "Cada SDU chega inteira e sozinha: as fronteiras são preservadas." : "Os bytes chegam todos e em ordem, mas as fronteiras entre as SDUs se perdem. Transmita de novo e compare.");
        }
        [entrada, modo].forEach(function (c) { c.addEventListener("change", transmitir); });

        // Desafio: delimitadores no fluxo de bytes.
        var concluir = R.desafio(raiz, "fluxo-delimitador", 20, "Separar mensagens em um fluxo de bytes");
        var pedacos = ["US", "ER alice\\r\\nPA", "SS 1234", "\\r\\nLIST\\r\\nQU", "IT\\r\\n"];
        var completas = [0, 1, 1, 3, 4]; // linhas completas acumuladas após cada pedaço
        var k = 0, recebidas = 0;
        var buffer = el("p", { class: "mono small mb-1" });
        var pergunta = el("p", { class: "small fw-semibold mb-1" });
        var resp = el("input", { type: "number", min: 0, max: 9, class: "form-control form-control-sm", style: "max-width:6rem", "aria-label": "Quantidade de mensagens completas" });
        var fb = u.feedback();
        function mostra() {
            buffer.textContent = "DATA.ind recebidos até agora: " + pedacos.slice(0, k + 1).map(function (p) { return "\"" + p + "\""; }).join(" + ");
            pergunta.textContent = k < pedacos.length
                ? "Pedaço " + (k + 1) + " de " + pedacos.length + ": quantas linhas completas (terminadas em \\r\\n) a aplicação já pode processar no total?"
                : "Desafio concluído.";
            resp.value = "";
        }
        function confere() {
            if (k >= pedacos.length) return;
            if (Number(resp.value) === completas[k]) {
                recebidas = completas[k];
                u.marca(fb, true, completas[k] + " linha(s) completa(s); o resto fica no buffer esperando o próximo \\r\\n.");
                k++;
                if (k === pedacos.length) { concluir(); u.marca(fb, true, "Quatro comandos: USER alice, PASS 1234, LIST e QUIT. É assim que protocolos de texto separam mensagens em um fluxo."); k = pedacos.length - 1; pergunta.textContent = "Desafio concluído."; resp.disabled = true; return; }
                mostra();
            } else u.marca(fb, false, "Junte todos os pedaços recebidos e conte quantos \\r\\n já apareceram.");
        }
        resp.addEventListener("keydown", function (e) { if (e.key === "Enter") confere(); });

        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-5" }, u.campo("SDUs enviadas por A (separe com |)", entrada)),
                el("div", { class: "col-sm-4" }, u.campo("Organização", modo)),
                el("div", { class: "col-sm-3 mb-2" }, u.botao("Transmitir", "btn-primary", transmitir))),
            area, resumo, el("hr"),
            el("p", { class: "small text-muted mb-1" }, "Desafio (20 pts): um cliente envia comandos terminados em \\r\\n sobre um fluxo de bytes. O receptor recebe os pedaços abaixo, um de cada vez."),
            buffer, pergunta,
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", confere)), fb);
        transmitir(); mostra();
        void recebidas;
    });

    /* ------------------------------------------------------------------
     * 4. Liberação da conexão
     * ------------------------------------------------------------------ */
    R.registrar("liberacao-conexao", function (raiz) {
        var cenarios = {
            graciosa: {
                titulo: "Liberação graciosa",
                eventos: [
                    { nota: 0, rotulo: "Conexão estabelecida" },
                    { de: 0, para: 1, rotulo: "", rotuloOrigem: "DATA.req(\"A\")", rotuloDestino: "DATA.ind(\"A\")" },
                    { de: 0, para: 1, rotulo: "", rotuloOrigem: "DATA.req(\"B\")", rotuloDestino: "DATA.ind(\"B\")" },
                    { de: 0, para: 1, rotulo: "", tipo: "ctrl", rotuloOrigem: "DISCONNECT.req", rotuloDestino: "DISCONNECT.ind" },
                    { de: 1, para: 0, rotulo: "", rotuloOrigem: "DATA.req(\"C\")", rotuloDestino: "DATA.ind(\"C\")" },
                    { de: 1, para: 0, rotulo: "", tipo: "ctrl", rotuloOrigem: "DISCONNECT.req", rotuloDestino: "DISCONNECT.ind" },
                    { nota: 1, rotulo: "Conexão fechada: nada se perdeu", tipo: "ok" }
                ],
                resumo: "Cada sentido é liberado separadamente. A termina de enviar e pede a liberação do seu sentido; o provedor só entrega DISCONNECT.ind depois de todos os DATA.ind pendentes. B ainda envia “C” e só então libera o outro sentido. SDUs perdidas: nenhuma."
            },
            abruptaUsuario: {
                titulo: "Abrupta, pedida por um usuário",
                eventos: [
                    { nota: 0, rotulo: "Conexão estabelecida" },
                    { de: 0, para: 1, rotulo: "", rotuloOrigem: "DATA.req(\"A\")", rotuloDestino: "DATA.ind(\"A\")" },
                    { de: 0, para: 1, rotulo: "B", tipo: "perda", rotuloOrigem: "DATA.req(\"B\")" },
                    { de: 0, para: 1, rotulo: "", tipo: "ctrl", rotuloOrigem: "DISCONNECT.req(abrupta)", rotuloDestino: "DISCONNECT.ind" },
                    { nota: 1, rotulo: "“B” nunca foi entregue", tipo: "bad" }
                ],
                resumo: "O provedor interrompe os dois fluxos e entrega DISCONNECT.ind o quanto antes, mesmo que ainda haja dados a caminho. SDUs perdidas: “B”."
            },
            abruptaProvedor: {
                titulo: "Abrupta, forçada pelo provedor",
                eventos: [
                    { nota: 0, rotulo: "Conexão estabelecida" },
                    { de: 0, para: 1, rotulo: "", rotuloOrigem: "DATA.req(\"A\")", rotuloDestino: "DATA.ind(\"A\")" },
                    { de: 0, para: 1, rotulo: "B", tipo: "perda", rotuloOrigem: "DATA.req(\"B\")" },
                    { nota: 0, rotulo: "DISCONNECT.ind", tipo: "bad" },
                    { nota: 1, rotulo: "DISCONNECT.ind", tipo: "bad" }
                ],
                resumo: "Por falta de recursos ou porque um usuário ficou inalcançável, o provedor encerra a conexão e entrega DISCONNECT.ind aos dois lados, sem garantir a entrega do que estava em trânsito. SDUs perdidas: “B”."
            }
        };
        var escolha = el("select", { class: "form-select form-select-sm" }, Object.keys(cenarios).map(function (k) { return el("option", { value: k }, cenarios[k].titulo); }));
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mb-0", "aria-live": "polite" });
        function render() {
            var c = cenarios[escolha.value];
            area.replaceChildren(R.diagramaSequencia({ titulo: c.titulo + ": diagrama de sequência.", colunas: ["Usuário A", "Usuário B"], eventos: c.eventos, largura: 560, passo: 32 }));
            resumo.textContent = c.resumo;
        }
        escolha.addEventListener("change", render);
        raiz.append(u.campo("Tipo de liberação", escolha), area, resumo);
        render();
    });

    /* ------------------------------------------------------------------
     * 5. Multiplexação por portas e checksum
     * ------------------------------------------------------------------ */
    R.registrar("multiplexacao-portas", function (raiz) {
        var apps = [{ nome: "Servidor de chat", porta: 5678 }, { nome: "Servidor web", porta: 80 }, { nome: "Servidor de nomes", porta: 53 }];
        var segmentos = [
            { origem: "10.0.0.7:1234", dst: 5678, ok: true },
            { origem: "10.0.0.9:40001", dst: 80, ok: true },
            { origem: "10.0.0.7:1234", dst: 5678, ok: false },
            { origem: "10.0.0.5:5353", dst: 53, ok: true },
            { origem: "10.0.0.9:40002", dst: 8080, ok: true },
            { origem: "10.0.0.8:1234", dst: 5678, ok: true }
        ];
        var concluir = R.desafio(raiz, "portas-demux", 20, "Demultiplexar seis segmentos");
        var k = 0, erros = 0;
        var cartao = el("div", { class: "card-soft p-3 mb-2" });
        var botoes = el("div", { class: "d-flex flex-wrap gap-2" });
        var fb = u.feedback();
        var log = el("ul", { class: "log mt-2" });
        var caixas = {};
        var hostDiv = el("div", { class: "row g-2 mb-2" }, apps.map(function (a) {
            caixas[a.porta] = el("span", { class: "badge text-bg-light border ms-1" }, "0");
            return el("div", { class: "col-4" }, el("div", { class: "card-soft p-2 small text-center" }, el("div", { class: "fw-semibold" }, a.nome), el("div", { class: "mono" }, "porta " + a.porta), caixas[a.porta]));
        }));

        function mostra() {
            botoes.replaceChildren();
            if (k >= segmentos.length) {
                cartao.replaceChildren(el("p", { class: "mb-0 small" }, erros === 0 ? "Todos os segmentos foram tratados corretamente." : "Segmentos tratados. Erros cometidos: " + erros + "."));
                return;
            }
            var s = segmentos[k];
            cartao.replaceChildren(
                el("div", { class: "small text-muted" }, "Segmento " + (k + 1) + " de " + segmentos.length + " recebido pelo host 10.0.0.2"),
                el("div", { class: "mono small mt-1" }, "origem " + s.origem + " → destino 10.0.0.2:" + s.dst),
                el("div", { class: "mono small" }, "checksum: " + (s.ok ? "confere ✓" : "não confere ✗")));
            apps.forEach(function (a) { botoes.appendChild(u.botao("Entregar a " + a.nome + " (" + a.porta + ")", "btn-outline-primary", function () { decide(a.porta); })); });
            botoes.appendChild(u.botao("Descartar", "btn-outline-danger", function () { decide(null); }));
        }
        function decide(porta) {
            var s = segmentos[k];
            var certo = !s.ok ? null : apps.some(function (a) { return a.porta === s.dst; }) ? s.dst : null;
            if (porta === certo) {
                var motivo = !s.ok ? "checksum inválido: o segmento corrompido é descartado." :
                    certo === null ? "nenhuma aplicação registrou a porta " + s.dst + ": descartado." :
                    "entregue pela porta de destino " + s.dst + ". A resposta sairá da porta " + s.dst + " para " + s.origem + ".";
                u.marca(fb, true, motivo);
                log.appendChild(el("li", null, "Segmento " + (k + 1) + ": " + motivo));
                if (certo !== null) caixas[certo].textContent = String(Number(caixas[certo].textContent) + 1);
                k++;
                if (k === segmentos.length && erros === 0) concluir();
                mostra();
            } else {
                erros++;
                u.marca(fb, false, !s.ok ? "Olhe o checksum antes de olhar a porta." : certo === null ? "Alguma aplicação usa a porta " + s.dst + "?" : "A camada de transporte decide pela porta de destino, não pela origem.");
            }
        }
        raiz.append(hostDiv, cartao, botoes, fb, log,
            u.botao("Recomeçar", "btn-outline-secondary mt-2", function () { k = 0; erros = 0; log.replaceChildren(); Object.keys(caixas).forEach(function (p) { caixas[p].textContent = "0"; }); fb.textContent = ""; mostra(); }),
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (20 pts): você é a camada de transporte do host 10.0.0.2. Trate os seis segmentos sem nenhum erro."));
        mostra();
    });

    /* ------------------------------------------------------------------
     * 6. Three-way handshake e segmentos duplicados
     * ------------------------------------------------------------------ */
    // Cada passo: {ev: evento do diagrama} (automático) ou {decisao: {quem, recebeu, opcoes: [[texto, correta, explicação]], ev}}
    var HANDSHAKE = {
        normal: {
            titulo: "Abertura normal (Fig. 44)",
            passos: [
                { ev: { de: 0, para: 1, rotulo: "CR(seq=x)", tipo: "ctrl" }, texto: "A tira x do seu relógio de transporte e envia CR(seq=x)." },
                { decisao: { quem: "B", recebeu: "CR(seq=x)", opcoes: [
                    ["Responder CA(seq=y, ack=x)", true, "B cria estado para a tentativa e confirma x, propondo y do próprio relógio. Ainda não sabe se o CR é novo ou uma duplicata."],
                    ["Considerar a conexão estabelecida", false, "Cedo demais: B ainda não sabe se esse CR é novo ou uma duplicata antiga."],
                    ["Enviar REJECT", false, "Nada indica um problema: o CR pode ser legítimo."]],
                    ev: { de: 1, para: 0, rotulo: "CA(seq=y, ack=x)", tipo: "ctrl" } } },
                { decisao: { quem: "A", recebeu: "CA(seq=y, ack=x)", opcoes: [
                    ["Estabelecer e confirmar com CA(seq=x, ack=y)", true, "ack=x confirma o CR que A enviou. A considera a conexão aberta e confirma o y de B antes de enviar dados."],
                    ["Enviar REJECT(ack=y)", false, "O ack confere com o CR que A enviou; não há motivo para rejeitar."],
                    ["Ignorar e retransmitir o CR", false, "O CA é válido, então retransmitir não faz sentido."]],
                    ev: { de: 0, para: 1, rotulo: "CA(seq=x, ack=y)", tipo: "ctrl" } } },
                { decisao: { quem: "B", recebeu: "CA(seq=x, ack=y)", opcoes: [
                    ["Estabelecer a conexão", true, "ack=y confirma o CA de B: agora os dois lados sabem que a tentativa é nova."],
                    ["Enviar REJECT", false, "O ack confere com o y que B enviou."]],
                    ev: { nota: 1, rotulo: "Conexão estabelecida", tipo: "ok" } } }
            ]
        },
        crDuplicado: {
            titulo: "CR duplicado (Fig. 45)",
            passos: [
                { ev: { de: 0, para: 1, rotulo: "CR(seq=z) antigo", tipo: "velho" }, texto: "Um CR de uma conexão antiga, atrasado na rede, chega a B." },
                { decisao: { quem: "B", recebeu: "CR(seq=z)", opcoes: [
                    ["Responder CA(seq=y, ack=z)", true, "B não tem como saber que o CR é antigo, então trata como uma tentativa nova."],
                    ["Descartar: é uma duplicata", false, "B não guarda as conexões passadas, então não consegue reconhecer a duplicata sozinho."],
                    ["Considerar a conexão estabelecida", false, "Isso aceitaria uma conexão fantasma: exatamente o que o three-way handshake evita."]],
                    ev: { de: 1, para: 0, rotulo: "CA(seq=y, ack=z)", tipo: "ctrl" } } },
                { decisao: { quem: "A", recebeu: "CA(seq=y, ack=z)", opcoes: [
                    ["Enviar REJECT(ack=y)", true, "A não tem nenhuma tentativa com seq=z, então cancela a tentativa espúria."],
                    ["Estabelecer a conexão", false, "A nunca pediu essa conexão: ack=z não corresponde a nenhum CR atual."],
                    ["Ignorar o CA", false, "B ficaria esperando com estado alocado; o protocolo avisa com REJECT."]],
                    ev: { de: 0, para: 1, rotulo: "REJECT(ack=y)", tipo: "ctrl" } } },
                { decisao: { quem: "B", recebeu: "REJECT(ack=y)", opcoes: [
                    ["Cancelar a tentativa de conexão", true, "A duplicata foi neutralizada sem que B precisasse lembrar de conexões antigas."],
                    ["Reenviar o CA", false, "O REJECT diz exatamente que a tentativa não existe."]],
                    ev: { nota: 1, rotulo: "Tentativa cancelada", tipo: "ok" } } }
            ]
        },
        caDuplicado: {
            titulo: "CA duplicado (Fig. 46)",
            passos: [
                { ev: { de: 0, para: 1, rotulo: "CR(seq=x)", tipo: "perda" }, texto: "A envia CR(seq=x), mas o segmento se perde." },
                { ev: { de: 1, para: 0, rotulo: "CA(seq=z, ack=w) antigo", tipo: "velho" }, texto: "Um CA antigo, com ack=w, chega a A." },
                { decisao: { quem: "A", recebeu: "CA(seq=z, ack=w)", opcoes: [
                    ["Rejeitar o CA e retransmitir o CR quando o timer expirar", true, "ack=w não confirma x (x saiu do relógio de transporte, então um CA antigo não pode conhecê-lo)."],
                    ["Estabelecer a conexão", false, "O ack não confirma o CR(seq=x) que A acabou de enviar."]],
                    ev: { de: 0, para: 1, rotulo: "CR(seq=x) retransmitido", tipo: "ctrl" } } },
                { decisao: { quem: "B", recebeu: "CR(seq=x)", opcoes: [
                    ["Responder CA(seq=y, ack=x)", true, "A abertura segue normalmente a partir daqui."],
                    ["Enviar REJECT", false, "É um CR legítimo."]],
                    ev: { de: 1, para: 0, rotulo: "CA(seq=y, ack=x)", tipo: "ctrl" } } },
                { ev: { nota: 0, rotulo: "Segue como na abertura normal", tipo: "ok" }, texto: "A confirma com CA(seq=x, ack=y) e a conexão é aberta." }
            ]
        },
        ambos: {
            titulo: "CR e CA duplicados (Fig. 47)",
            passos: [
                { ev: { de: 0, para: 1, rotulo: "CR(seq=z) antigo", tipo: "velho" }, texto: "Um CR antigo chega a B." },
                { decisao: { quem: "B", recebeu: "CR(seq=z)", opcoes: [
                    ["Responder CA(seq=y, ack=z)", true, "Como antes, B não distingue o CR antigo de um novo."],
                    ["Descartar", false, "B não tem memória das conexões passadas."]],
                    ev: { de: 1, para: 0, rotulo: "CA(seq=y, ack=z)", tipo: "ctrl" } } },
                { decisao: { quem: "A", recebeu: "CA(seq=y, ack=z)", opcoes: [
                    ["Enviar REJECT(ack=y)", true, "A não tem tentativa com seq=z."],
                    ["Estabelecer", false, "A não pediu essa conexão."]],
                    ev: { de: 0, para: 1, rotulo: "REJECT(ack=y)", tipo: "perda" } } },
                { ev: { de: 0, para: 1, rotulo: "CA(seq=z, ack=k) antigo", tipo: "velho" }, texto: "O REJECT se perde, e chega a B uma retransmissão de um CA ainda mais antigo, com seq=z." },
                { decisao: { quem: "B", recebeu: "CA(seq=z, ack=k)", opcoes: [
                    ["Não aceitar: ack=k não confirma o y enviado por B", true, "O ack desse CA antigo não pode ser igual ao y que B acabou de tirar do seu relógio, então a conexão fantasma não se forma."],
                    ["Estabelecer a conexão", false, "Seria aceitar uma conexão fantasma: o ack não confirma y."]],
                    ev: { nota: 1, rotulo: "Conexão fantasma evitada", tipo: "ok" } } }
            ]
        }
    };

    R.registrar("three-way-handshake", function (raiz) {
        var desafios = {};
        Object.keys(HANDSHAKE).forEach(function (k) { desafios[k] = R.desafio(raiz, "3wh-" + k, 10, "Three-way handshake: " + HANDSHAKE[k].titulo); });
        var escolha = el("select", { class: "form-select form-select-sm" }, Object.keys(HANDSHAKE).map(function (k) { return el("option", { value: k }, HANDSHAKE[k].titulo + (R.desafioConcluido("3wh-" + k) ? " ✔" : "")); }));
        var area = el("div", { class: "mt-2" });
        var painel = el("div", { class: "mt-2" });
        var fb = u.feedback();
        var eventos, i, erros;

        function desenha() {
            area.replaceChildren(R.diagramaSequencia({
                titulo: HANDSHAKE[escolha.value].titulo + ": diagrama de sequência construído passo a passo.",
                colunas: ["Host A (iniciador)", "Host B (remoto)"], eventos: eventos.length ? eventos : [{ espaco: 1 }], largura: 560, passo: 34
            }));
        }
        function reiniciar() { eventos = []; i = 0; erros = 0; fb.textContent = ""; avanca(); }
        function avanca() {
            var c = HANDSHAKE[escolha.value];
            painel.replaceChildren();
            // Passos automáticos são aplicados até a próxima decisão.
            while (i < c.passos.length && !c.passos[i].decisao) {
                eventos.push(c.passos[i].ev);
                painel.appendChild(el("p", { class: "small mb-1" }, "• " + c.passos[i].texto));
                i++;
            }
            desenha();
            if (i >= c.passos.length) { fim(); return; }
            var d = c.passos[i].decisao;
            painel.appendChild(el("p", { class: "fw-semibold small mb-2" }, "Você é o host " + d.quem + " e recebeu " + d.recebeu + ". O que fazer?"));
            var grupo = el("div", { class: "d-grid gap-2" });
            d.opcoes.forEach(function (op) {
                var b = u.botao(op[0], "btn-outline-secondary text-start", function () {
                    if (op[1]) {
                        u.marca(fb, true, op[2]);
                        eventos.push(d.ev);
                        i++;
                        avanca();
                    } else {
                        erros++;
                        b.disabled = true;
                        b.className = "btn btn-sm btn-outline-danger text-start";
                        u.marca(fb, false, op[2]);
                    }
                });
                grupo.appendChild(b);
            });
            painel.appendChild(grupo);
        }
        function fim() {
            painel.appendChild(el("p", { class: "small fw-semibold mb-0 " + (erros ? "quiz-no" : "quiz-ok") },
                erros ? "Cenário concluído com " + erros + " erro(s). Recomece para tentar sem erros e ganhar os pontos." : "Cenário concluído sem erros!"));
            if (!erros && desafios[escolha.value]()) {
                escolha.options[escolha.selectedIndex].textContent = HANDSHAKE[escolha.value].titulo + " ✔";
            }
        }
        escolha.addEventListener("change", reiniciar);
        raiz.append(
            el("div", { class: "d-flex flex-wrap gap-2 align-items-end" }, el("div", null, u.campo("Cenário", escolha)), el("div", { class: "mb-2" }, u.botao("Recomeçar", "btn-outline-secondary", reiniciar))),
            area, painel, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts por cenário): conclua cada um dos quatro cenários sem nenhuma decisão errada. Cinza pontilhado = segmento antigo atrasado na rede."));
        reiniciar();
    });

    /* ------------------------------------------------------------------
     * 7a. Números de sequência contam bytes
     * ------------------------------------------------------------------ */
    R.registrar("numeracao-bytes", function (raiz) {
        var texto = el("input", { class: "form-control form-control-sm mono", value: "REDES DE COMPUTADORES", maxlength: 40 });
        var isn = el("input", { type: "number", class: "form-control form-control-sm mono", value: 1000, min: 0, max: 99999 });
        var tam = el("input", { type: "range", min: 2, max: 8, value: 5, class: "form-range", id: u.novoId("mss") });
        var tamOut = el("output", { class: "mono" }, "5");
        var segsDiv = el("div", { class: "d-flex flex-wrap gap-2 mt-2" });
        var receptor = el("div", { class: "buffer mt-2" });
        var entregue = el("p", { class: "small mono mt-2 mb-0", "aria-live": "polite" });
        var segs = [], recebidos = {};

        function fragmenta() {
            var t = texto.value || "?", n = Number(tam.value), base = Number(isn.value) || 0;
            tamOut.textContent = String(n);
            segs = [];
            for (var i = 0; i < t.length; i += n) segs.push({ seq: base + i, dados: t.slice(i, i + n) });
            segs = embaralha(segs, u.aleatorio());
            recebidos = {};
            render();
        }
        function render() {
            var t = texto.value || "?", base = Number(isn.value) || 0;
            segsDiv.replaceChildren();
            segs.forEach(function (s) {
                var ja = recebidos[s.seq];
                segsDiv.appendChild(u.botao("seq=" + s.seq + " “" + s.dados + "”", ja ? "btn-success" : "btn-outline-primary", function () { recebidos[s.seq] = s; render(); }, "Entregar ao receptor o segmento de número de sequência " + s.seq));
            });
            receptor.replaceChildren();
            var buf = new Array(t.length).fill(null);
            Object.keys(recebidos).forEach(function (k) {
                var s = recebidos[k];
                for (var j = 0; j < s.dados.length; j++) buf[s.seq - base + j] = s.dados[j];
            });
            buf.forEach(function (ch, j) {
                receptor.appendChild(el("div", { class: "slot" + (ch !== null ? " cheio" : ""), title: "byte " + (base + j) }, ch === null ? "" : ch === " " ? "␠" : ch));
            });
            var prefixo = 0;
            while (prefixo < buf.length && buf[prefixo] !== null) prefixo++;
            entregue.textContent = "Entregue à aplicação, em ordem: “" + buf.slice(0, prefixo).join("") + "”" +
                (prefixo < buf.length ? " · próximo byte esperado: " + (base + prefixo) : " · SDU completa!");
        }
        [texto, isn].forEach(function (c) { c.addEventListener("change", fragmenta); });
        tam.addEventListener("input", fragmenta);

        // Desafio: lacunas no fluxo.
        var concluir = R.desafio(raiz, "bytes-lacuna", 15, "Encontrar bytes que faltam");
        var rodadas = 0, alvo;
        var pergunta = el("p", { class: "small fw-semibold mb-1" });
        var ini = el("input", { type: "number", class: "form-control form-control-sm", style: "max-width:7rem", "aria-label": "Primeiro byte que falta" });
        var fim = el("input", { type: "number", class: "form-control form-control-sm", style: "max-width:7rem", "aria-label": "Último byte que falta" });
        var fb = u.feedback();
        var rnd = u.aleatorio();
        function nova() {
            var base = 100 * (1 + Math.floor(rnd() * 50)), n = 3 + Math.floor(rnd() * 6), qtd = 4, falta = 1 + Math.floor(rnd() * 2);
            var lista = [];
            for (var i = 0; i < qtd; i++) if (i !== falta) lista.push("seq=" + (base + i * n) + " (" + n + " bytes)");
            alvo = [base + falta * n, base + falta * n + n - 1];
            pergunta.textContent = "Rodada " + (rodadas + 1) + " de 3: o receptor tem os segmentos " + embaralha(lista, rnd).join(", ") + ". Quais bytes faltam (do primeiro ao último)?";
            ini.value = ""; fim.value = "";
        }
        function confere() {
            if (Number(ini.value) === alvo[0] && Number(fim.value) === alvo[1]) {
                rodadas++;
                u.marca(fb, true, "Faltam os bytes " + alvo[0] + " a " + alvo[1] + ": o receptor guarda o que veio depois e espera essa lacuna.");
                if (rodadas >= 3) { concluir(); pergunta.textContent = "Desafio concluído."; }
                else nova();
            } else u.marca(fb, false, "Cada segmento cobre os bytes de seq até seq + tamanho − 1. Procure o intervalo que nenhum deles cobre.");
        }

        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-md-6" }, u.campo("SDU da aplicação", texto)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Número de sequência inicial", isn)),
                el("div", { class: "col-6 col-md-3" }, el("label", { class: "form-label small mb-1", for: tam.id }, "Bytes por segmento: ", tamOut), tam)),
            el("div", { class: "d-flex gap-2" }, u.botao("Fragmentar e embaralhar", "btn-primary", fragmenta), u.botao("Entregar todos", "btn-outline-secondary", function () { segs.forEach(function (s) { recebidos[s.seq] = s; }); render(); })),
            el("p", { class: "small text-muted mt-2 mb-0" }, "Segmentos na ordem em que a rede os entregou (clique para o receptor recebê-los):"),
            segsDiv,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Buffer do receptor (cada quadrado é um byte):"),
            receptor, entregue, el("hr"),
            el("p", { class: "small text-muted mb-1" }, "Desafio (15 pts)"),
            pergunta,
            el("div", { class: "d-flex flex-wrap gap-2 align-items-center" }, el("span", { class: "small" }, "do byte"), ini, el("span", { class: "small" }, "ao byte"), fim, u.botao("Conferir", "btn-primary", confere)),
            fb);
        fragmenta(); nova();
    });

    /* ------------------------------------------------------------------
     * 7b. Janela dinâmica, rwin = 0 e timer de persistência
     * ------------------------------------------------------------------ */
    R.registrar("janela-dinamica", function (raiz) {
        var BUF = 4, PERSISTENCIA = 3;
        var swin = el("select", { class: "form-select form-select-sm" }, [1, 2, 3, 4].map(function (n) { return el("option", { value: n, selected: n === 3 }, String(n)); }));
        var leitura = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "0" }, "parada"), el("option", { value: "1", selected: true }, "1 por passo"), el("option", { value: "2" }, "2 por passo"));
        var perder = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("perder") });
        var persist = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("persist") });
        var visEm = el("div", { class: "buffer" }), visRec = el("div", { class: "buffer" });
        var status = el("p", { class: "small mb-1", "aria-live": "polite" });
        var log = el("ul", { class: "log" });
        var st;
        var concluirDeadlock = R.desafio(raiz, "janela-deadlock", 15, "Provocar um deadlock com rwin = 0");
        var concluirPersist = R.desafio(raiz, "janela-persistencia", 15, "Sair do bloqueio com o timer de persistência");

        function reinicia() {
            // adv: janela que o EMISSOR acredita ter; rx: última janela que o RECEPTOR anunciou.
            st = { t: 0, buffer: 0, adv: BUF, rx: BUF, enviados: 0, entregues: 0, bloqueado: false, timer: null, perdeuUpdate: false, parado: 0, recuperou: false };
            log.replaceChildren();
            render("Pronto. A janela anunciada inicial é " + BUF + " (o buffer do receptor tem " + BUF + " posições).");
        }
        function registra(txt) { log.insertBefore(el("li", null, "t=" + st.t + ": " + txt), log.firstChild); }

        function passo() {
            st.t++;
            var msgs = [];
            // 1. Aplicação lê do buffer do receptor.
            var antes = st.buffer;
            var lidos = Math.min(Number(leitura.value), st.buffer);
            st.buffer -= lidos; st.entregues += lidos;
            if (lidos) msgs.push("aplicação leu " + lidos);
            // 2. Se o receptor tinha anunciado 0 e a janela abriu, ele envia UMA atualização.
            if (st.rx === 0 && st.buffer < BUF && antes !== st.buffer) {
                st.rx = BUF - st.buffer;
                if (perder.checked) {
                    perder.checked = false;
                    st.perdeuUpdate = true;
                    msgs.push("ACK de atualização (rwin=" + st.rx + ") PERDIDO");
                } else {
                    st.adv = st.rx;
                    msgs.push("ACK de atualização: rwin=" + st.adv);
                }
            }
            // 3. Emissor envia até min(swin, rwin anunciada).
            var podem = Math.min(Number(swin.value), st.adv);
            if (podem > 0) {
                st.bloqueado = false; st.timer = null;
                var cabem = Math.min(podem, BUF - st.buffer);
                st.buffer += cabem; st.enviados += podem;
                st.adv = st.rx = BUF - st.buffer;
                msgs.push("emissor enviou " + podem + " segmento(s); ACK anuncia rwin=" + st.adv);
                if (st.perdeuUpdate) { st.recuperou = true; st.perdeuUpdate = false; }
            } else {
                if (!st.bloqueado) { st.bloqueado = true; if (persist.checked) st.timer = PERSISTENCIA; msgs.push("rwin=0: emissor bloqueado" + (persist.checked ? "; timer de persistência armado (" + PERSISTENCIA + " passos)" : "")); }
                else if (st.timer !== null) {
                    st.timer--;
                    if (st.timer <= 0) {
                        st.adv = st.rx = BUF - st.buffer;
                        msgs.push("timer de persistência expirou: emissor retransmite um segmento antigo; o novo ACK anuncia rwin=" + st.adv);
                        st.timer = st.adv === 0 ? PERSISTENCIA : null;
                        if (st.adv > 0) st.bloqueado = false;
                    } else msgs.push("emissor bloqueado; timer de persistência: " + st.timer);
                } else if (persist.checked) { st.timer = PERSISTENCIA; msgs.push("timer de persistência armado"); }
                else msgs.push("emissor bloqueado esperando um ACK com rwin > 0");
            }
            // Deadlock: emissor acha rwin=0, mas o buffer do receptor tem espaço livre e ninguém vai mandar nada.
            var deadlock = st.bloqueado && st.adv === 0 && st.buffer < BUF && st.timer === null && st.perdeuUpdate;
            st.parado = deadlock ? st.parado + 1 : 0;
            registra(msgs.join(" · ") || "nada acontece");
            if (st.parado >= 3) concluirDeadlock();
            if (st.recuperou && persist.checked) concluirPersist();
            render(deadlock
                ? "⚠ Deadlock: o emissor espera um ACK com rwin > 0, e o receptor, com o buffer livre, espera dados. Nenhum dos dois vai agir."
                : st.bloqueado ? "Emissor bloqueado pela janela anunciada igual a 0." : "Transferência em andamento.");
        }
        function render(texto) {
            visRec.replaceChildren();
            for (var i = 0; i < BUF; i++) visRec.appendChild(el("div", { class: "slot" + (i < st.buffer ? " cheio" : ""), title: i < st.buffer ? "ocupado" : "livre" }, i < st.buffer ? "■" : ""));
            visEm.replaceChildren();
            var w = Math.min(Number(swin.value), st.adv);
            for (var j = 0; j < Number(swin.value); j++) visEm.appendChild(el("div", { class: "slot" + (j < w ? " voo" : ""), title: j < w ? "pode enviar" : "bloqueado" }, j < w ? "→" : "✕"));
            status.replaceChildren(el("strong", null, texto), el("br"),
                "swin=" + swin.value + " · rwin anunciada (vista pelo emissor)=" + st.adv + " · espaço livre real no receptor=" + (BUF - st.buffer) + " · segmentos entregues à aplicação=" + st.entregues);
        }
        var auto = null;
        var botaoAuto = u.botao("▶ Rodar", "btn-outline-primary", function () {
            if (auto) { clearInterval(auto); auto = null; botaoAuto.textContent = "▶ Rodar"; }
            else { auto = setInterval(passo, R.reduzMovimento() ? 1500 : 800); botaoAuto.textContent = "⏸ Pausar"; }
        });
        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("swin (janela do emissor)", swin)),
                el("div", { class: "col-6 col-md-4" }, u.campo("Leitura da aplicação receptora", leitura)),
                el("div", { class: "col-md-5" },
                    el("div", { class: "form-check" }, perder, el("label", { class: "form-check-label small", for: perder.id }, "Perder o próximo ACK de atualização de janela")),
                    el("div", { class: "form-check" }, persist, el("label", { class: "form-check-label small", for: persist.id }, "Timer de persistência ligado")))),
            el("div", { class: "row g-3 my-1" },
                el("div", { class: "col-sm-6" }, el("p", { class: "small fw-semibold mb-1" }, "Emissor: pode enviar min(swin, rwin)"), visEm),
                el("div", { class: "col-sm-6" }, el("p", { class: "small fw-semibold mb-1" }, "Buffer do receptor (" + BUF + " posições)"), visRec)),
            status,
            el("div", { class: "d-flex gap-2 mb-2" }, u.botao("Próximo passo", "btn-primary", passo), botaoAuto, u.botao("Reiniciar", "btn-outline-secondary", reinicia)),
            log,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafios (15 + 15 pts): 1) Pare a aplicação até rwin chegar a 0, marque “perder o próximo ACK”, volte a ler e observe o deadlock por 3 passos. 2) Repita com o timer de persistência ligado e veja a transferência voltar."));
        reinicia();
    });

    /* ------------------------------------------------------------------
     * 7c. Limite de vazão imposto pelo MSL
     * ------------------------------------------------------------------ */
    R.registrar("limite-msl", function (raiz) {
        var bits = el("select", { class: "form-select form-select-sm" }, [8, 16, 32, 64].map(function (n) { return el("option", { value: n, selected: n === 32 }, n + " bits"); }));
        var msl = el("input", { type: "number", min: 1, max: 600, value: 120, class: "form-control form-control-sm" });
        var enlace = el("select", { class: "form-select form-select-sm" },
            [["1e7", "10 Mbit/s"], ["1e8", "100 Mbit/s"], ["1e9", "1 Gbit/s"], ["1e10", "10 Gbit/s"], ["1e11", "100 Gbit/s"]].map(function (o) { return el("option", { value: o[0], selected: o[0] === "1e9" }, o[1]); }));
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        function fmt(bps) {
            var u2 = ["bit/s", "kbit/s", "Mbit/s", "Gbit/s", "Tbit/s", "Pbit/s", "Ebit/s"], i = 0;
            while (bps >= 1000 && i < u2.length - 1) { bps /= 1000; i++; }
            return (bps >= 100 ? bps.toFixed(0) : bps >= 10 ? bps.toFixed(1) : bps.toFixed(2)).replace(".", ",") + " " + u2[i];
        }
        function fmtT(s) {
            if (s < 1) return (s * 1000).toFixed(2).replace(".", ",") + " ms";
            if (s < 120) return s.toFixed(1).replace(".", ",") + " s";
            if (s < 7200) return (s / 60).toFixed(1).replace(".", ",") + " min";
            if (s < 172800) return (s / 3600).toFixed(1).replace(".", ",") + " h";
            if (s < 3.15e9) return (s / 86400).toFixed(0) + " dias";
            return (s / 3.15e7).toExponential(1).replace(".", ",") + " anos";
        }
        function render() {
            var n = Number(bits.value), m = Math.max(1, Number(msl.value) || 120), v = Number(enlace.value);
            var espaco = Math.pow(2, n); // números de sequência = bytes
            var limite = espaco * 8 / m;
            var tempo = espaco * 8 / v;
            var ok = tempo > m;
            saida.replaceChildren(
                el("p", { class: "mb-1" }, "Espaço de números de sequência: 2^" + n + " = " + espaco.toLocaleString("pt-BR") + " bytes."),
                el("p", { class: "mb-1" }, "Vazão máxima sem reutilizar um número dentro do MSL: 2^" + n + " bytes ÷ " + m + " s ≈ ", el("strong", null, fmt(limite)), "."),
                el("p", { class: "mb-0 " + (ok ? "quiz-ok" : "quiz-no") },
                    "Um enlace de " + fmt(v) + " percorre todo o espaço em " + fmtT(tempo) + (ok ? ": mais que o MSL, então é seguro." : ": menos que o MSL! Um segmento atrasado poderia ser confundido com um novo.")));
        }
        [bits, msl, enlace].forEach(function (c) { c.addEventListener("input", render); c.addEventListener("change", render); });
        raiz.append(el("div", { class: "row g-2" },
            el("div", { class: "col-4" }, u.campo("Bits de sequência", bits)),
            el("div", { class: "col-4" }, u.campo("MSL (segundos)", msl)),
            el("div", { class: "col-4" }, u.campo("Velocidade do enlace", enlace))), saida);
        render();
    });
    /* ------------------------------------------------------------------
     * 8. Liberação no protocolo: segmento DR
     * ------------------------------------------------------------------ */
    R.registrar("liberacao-dr", function (raiz) {
        var cenarios = {
            abrupta: {
                titulo: "DR abrupto",
                eventos: [
                    { de: 0, para: 1, rotulo: "D(seq=1, \"a\")", rotuloOrigem: "DATA.req(\"a\")", rotuloDestino: "DATA.ind(\"a\")" },
                    { de: 1, para: 0, rotulo: "D(seq=7, \"x\")", inclinacao: 2.2, tipo: "ok" },
                    { de: 0, para: 1, rotulo: "DR", tipo: "ctrl", rotuloOrigem: "DISCONNECT.req", rotuloDestino: "DISCONNECT.ind" },
                    { nota: 0, rotulo: "\u201cx\u201d chega depois do DR: perdido", tipo: "bad" }
                ],
                texto: "A conexão é considerada liberada assim que o DR é enviado ou recebido. A não sabe se B ainda tinha dados a caminho, e o \u201cx\u201d de B é perdido."
            },
            graciosa: {
                titulo: "DR por sentido, com confirmação",
                eventos: [
                    { de: 0, para: 1, rotulo: "D(seq=1, \"a\")", rotuloOrigem: "DATA.req(\"a\")", rotuloDestino: "DATA.ind(\"a\")" },
                    { de: 0, para: 1, rotulo: "DR(seq=2)", tipo: "ctrl", rotuloOrigem: "DISCONNECT.req", rotuloDestino: "DISCONNECT.ind" },
                    { de: 1, para: 0, rotulo: "ACK(2)", tipo: "ctrl" },
                    { nota: 1, rotulo: "Sentido A→B fechado; B→A continua aberto" },
                    { de: 1, para: 0, rotulo: "D(seq=7, \"x\")", rotuloOrigem: "DATA.req(\"x\")", rotuloDestino: "DATA.ind(\"x\")" },
                    { de: 1, para: 0, rotulo: "DR(seq=8)", tipo: "ctrl", rotuloOrigem: "DISCONNECT.req", rotuloDestino: "DISCONNECT.ind" },
                    { de: 0, para: 1, rotulo: "ACK(8)", tipo: "ctrl" },
                    { nota: 1, rotulo: "Conexão fechada sem perdas", tipo: "ok" }
                ],
                texto: "O DR leva o próximo número de sequência, e o DISCONNECT.ind só é entregue depois de todos os DATA.ind anteriores. O outro lado confirma com um ACK. Cada sentido é fechado independentemente."
            }
        };
        var area = el("div", { class: "mt-2" });
        var texto = el("p", { class: "small mb-0", "aria-live": "polite" });
        var grupo = el("div", { class: "btn-group btn-group-sm", role: "group", "aria-label": "Tipo de liberação" });
        function mostra(k) {
            var c = cenarios[k];
            area.replaceChildren(R.diagramaSequencia({ titulo: c.titulo + ": segmentos trocados na liberação da conexão.", colunas: ["Entidade A", "Entidade B"], eventos: c.eventos, largura: 560, passo: 32 }));
            texto.textContent = c.texto;
            Array.from(grupo.children).forEach(function (b) { b.classList.toggle("active", b.dataset.k === k); b.setAttribute("aria-pressed", b.dataset.k === k ? "true" : "false"); });
        }
        Object.keys(cenarios).forEach(function (k) {
            var b = u.botao(cenarios[k].titulo, "btn-outline-primary", function () { mostra(k); });
            b.dataset.k = k;
            grupo.appendChild(b);
        });
        raiz.append(grupo, area, texto);
        mostra("abrupta");
    });
}());
