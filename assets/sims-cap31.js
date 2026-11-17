/* Simulações do Capítulo 31 — Prática: servindo aplicações (seção 4.5 do livro, pág. 292–294 do PDF). */
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
    function numero(rotulo) { return el("input", { type: "number", class: "form-control form-control-sm", "aria-label": rotulo }); }
    function decimal(rotulo) { return el("input", { type: "text", inputmode: "decimal", class: "form-control form-control-sm", "aria-label": rotulo, autocomplete: "off" }); }
    function br(x, casas) { return Number(x).toLocaleString("pt-BR", { maximumFractionDigits: casas === undefined ? 2 : casas }); }

    /* ---------- Atividade 1: o mínimo para detectar erros sem corrigir ---------- */
    var MECANISMOS = [["portas", "Números de porta, para identificar as aplicações", true], ["checksum", "Checksum ou CRC sobre o segmento", true],
        ["seq", "Números de sequência", false], ["ack", "Confirmações (ACKs)", false], ["timer", "Temporizador de retransmissão", false],
        ["janela", "Janela deslizante", false], ["handshake", "Abertura em três vias", false]];
    R.registrar("monta-protocolo", function (raiz) {
        var caixas = MECANISMOS.map(function (m) {
            var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") });
            return { m: m, c: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, m[1])) };
        });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var marcados = caixas.filter(function (x) { return x.c.checked; }).map(function (x) { return x.m[0]; });
            var extra = marcados.filter(function (k) { return ["seq", "ack", "timer", "janela", "handshake"].indexOf(k) >= 0; });
            saida.textContent = !marcados.length ? "Monte o cabeçalho escolhendo os mecanismos." :
                (marcados.indexOf("checksum") < 0 ? "Sem checksum, um bit trocado chega à aplicação sem que ninguém perceba. " : "") +
                (marcados.indexOf("portas") < 0 ? "Sem portas, o host não sabe a qual aplicação entregar o segmento. " : "") +
                (extra.length ? "Os outros mecanismos marcados servem para corrigir perdas ou ordenar segmentos, e o serviço pedido não corrige nada: são custo sem uso." : "");
        }
        caixas.forEach(function (x) { x.c.addEventListener("change", mostra); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "monta-protocolo", 10, "O protocolo mínimo");
        raiz.append(el("p", { class: "small fw-semibold mb-1" }, "Desafio (10 pts): marque só o que um transporte sem conexão, que detecta erros mas não os corrige, precisa ter."),
            el("div", null, caixas.map(function (x) { return x.linha; })), saida,
            u.botao("Conferir", "btn-primary mt-2", function () {
                var ok = caixas.every(function (x) { return x.c.checked === x.m[2]; });
                u.marca(fb, ok, ok ? "Isso: portas para multiplexar e um checksum para descartar segmentos corrompidos. É o que o UDP faz." : "Ainda não. Leia o aviso acima de cada combinação.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 2: números de sequência por segmento (Q2) ---------- */
    // Convenção da Fig. 44 (pág. 69): o ack leva o número do segmento confirmado.
    function dialogoQ2() {
        var a = 1341, b = 2141, ev = [];
        ev.push({ de: 0, para: 1, rotulo: "CR(seq=" + a + ")", tipo: "ctrl" });
        ev.push({ de: 1, para: 0, rotulo: "CA(ack=" + a + ",seq=" + b + ")", tipo: "ctrl" });
        ev.push({ de: 0, para: 1, rotulo: "CA(seq=" + a + ",ack=" + b + ")", tipo: "ctrl" });
        ev.push({ de: 1, para: 0, rotulo: "DATA(seq=" + b + ",Hello)" });
        ev.push({ de: 0, para: 1, rotulo: "ACK(ack=" + b + ")", tipo: "tracejado" });
        ev.push({ de: 0, para: 1, rotulo: "DATA(seq=" + a + ",Pleased to meet you)" });
        ev.push({ de: 1, para: 0, rotulo: "ACK(ack=" + a + ")", tipo: "tracejado" });
        ev.push({ de: 1, para: 0, rotulo: "DR(seq=" + (b + 1) + ")", tipo: "ctrl" });
        ev.push({ de: 0, para: 1, rotulo: "ACK(ack=" + (b + 1) + ")", tipo: "tracejado" });
        ev.push({ de: 0, para: 1, rotulo: "DR(seq=" + (a + 1) + ")", tipo: "ctrl" });
        ev.push({ de: 1, para: 0, rotulo: "ACK(ack=" + (a + 1) + ")", tipo: "tracejado" });
        return ev;
    }
    var ESTADOS = [
        "A pediu a conexão; guarda o número 1341 e um temporizador para o CR.",
        "B criou estado para a tentativa: 2141 é o seu número inicial. A conexão ainda não está aberta em B.",
        "A considera a conexão aberta e confirma o CA. Os dados de A vão começar em 1341; os de B, em 2141.",
        "B manda Hello no segmento 2141 e guarda uma cópia até receber o ack.",
        "A entrega Hello à aplicação e confirma o segmento 2141. Agora espera o 2142 de B.",
        "A responde no segmento 1341 e guarda uma cópia.",
        "B confirma o 1341 e pode apagar a cópia do 2141 que já foi confirmado.",
        "B terminou: o DR leva o próximo número dele, 2142, para A saber que não falta nenhum segmento.",
        "A confirma o DR: o sentido B→A está liberado. A ainda pode mandar dados.",
        "A também terminou e manda o DR com o seu próximo número, 1342.",
        "B confirma: os dois sentidos estão liberados, e os dois hosts podem apagar o estado da conexão."
    ];
    R.dialogoQ2 = dialogoQ2;
    R.registrar("dialogo-transporte", function (raiz) {
        var passo = 3, todos = dialogoQ2();
        var area = el("div"), saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            area.replaceChildren(R.diagramaSequencia({ titulo: "Q2: Hello e Pleased to meet you", colunas: ["Host A", "Host B"], eventos: todos.slice(0, passo), largura: 520, margem: 100, passo: 28 }));
            saida.textContent = ESTADOS[passo - 1];
        }
        var P1 = numero("Número de sequência do Hello"), P2 = numero("Número do DR de B"), P3 = numero("Número do DR de A");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dialogo-transporte", 15, "Números de sequência por segmento");
        raiz.append(el("div", { class: "d-flex gap-2 mb-1" },
                u.botao("◀ Voltar", "btn-outline-primary", function () { if (passo > 1) passo--; mostra(); }),
                u.botao("Próximo segmento ▶", "btn-primary", function () { if (passo < todos.length) passo++; mostra(); })),
            area, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): responda antes de avançar o diagrama."),
            linhaPergunta("Com que número de sequência B manda Hello?", P1),
            linhaPergunta("Que número vai no DR de B, depois de Hello?", P2),
            linhaPergunta("Que número vai no DR de A, depois de Pleased to meet you?", P3),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === 2141 && Number(P2.value) === 2142 && Number(P3.value) === 1342;
                u.marca(fb, ok, ok ? "Isso: cada sentido numera os seus segmentos a partir do número inicial do seu CR ou CA, e o DR leva o próximo número." : "Ainda não. A numeração dos dados de B começa no seq do CA de B (pág. 69 do PDF).");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 3: fluxo de bytes (Q4–Q7) ---------- */
    // Devolve os segmentos de dados e os acks (próximo byte esperado, como no TCP).
    function segmenta(inicio, pedidos, maximo) {
        var segs = [];
        if (!maximo) {
            var s = inicio;
            pedidos.forEach(function (p) { if (p.length) { segs.push({ seq: s, dados: p }); s += p.length; } });
        } else {
            var fluxo = pedidos.join("");
            for (var i = 0; i < fluxo.length; i += maximo) segs.push({ seq: inicio + i, dados: fluxo.slice(i, i + maximo) });
        }
        segs.forEach(function (g) { g.ack = g.seq + g.dados.length; });
        return segs;
    }
    R.segmenta31 = segmenta;
    R.registrar("segmenta-bytes", function (raiz) {
        var inicio = el("input", { type: "number", class: "form-control form-control-sm", value: 8765, "aria-label": "Número inicial" });
        var pedidos = el("textarea", { class: "form-control form-control-sm mono", rows: 4, "aria-label": "DATA.req, um por linha", spellcheck: "false" }, "a\nbcdefg\nab\nbbbbbbbbbbbb");
        var modo = escolha("Modo de envio", [["um", "um segmento por DATA.req (Q4)"], ["8", "segmentos de até 8 bytes, juntando os pedidos (Q5)"]], false);
        var tabela = el("div", { class: "table-responsive mt-2" }), saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            var lista = pedidos.value.split("\n").map(function (x) { return x.replace(/\r/g, ""); }).filter(function (x) { return x.length; });
            var segs = segmenta(Number(inicio.value) || 0, lista, modo.value === "8" ? 8 : 0);
            tabela.replaceChildren(el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, el("th", null, "Segmento de A"), el("th", null, "Bytes"), el("th", null, "Ack de B"))),
                el("tbody", null, segs.map(function (g) { return el("tr", null, el("td", null, "DATA(seq=" + g.seq + "," + g.dados + ")"), el("td", null, String(g.dados.length)), el("td", null, "ACK(ack=" + g.ack + ")")); }))));
            var total = lista.join("").length;
            saida.textContent = segs.length + " segmento(s) com " + total + " bytes ao todo. Cada seq é a posição do primeiro byte do segmento no fluxo; o ack diz o próximo byte que B espera.";
        }
        [inicio, pedidos, modo].forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });
        var P1 = numero("seq do último segmento na Q4"), P2 = numero("número de segmentos na Q5"), P3 = numero("seq do último segmento na Q5");
        var P4 = escolha("O diagrama da Q6 é válido", [["sim", "sim: num fluxo de bytes, a retransmissão pode reagrupar os bytes"], ["nao", "não: a retransmissão tem de repetir os segmentos originais"]]);
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "segmenta-bytes", 15, "Números de sequência por byte");
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-sm-4" }, u.campo("seq inicial de A", inicio)), el("div", { class: "col-sm-8" }, u.campo("Modo", modo))),
            u.campo("DATA.req de A, um por linha", pedidos), tabela, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts)"),
            linhaPergunta("Q4: com que seq sai o segmento de DATA.req(bbbbbbbbbbbb)?", P1),
            linhaPergunta("Q5: quantos segmentos de até 8 bytes?", P2),
            linhaPergunta("Q5: qual é o seq do último segmento?", P3),
            linhaPergunta("Q6: DATA(1123,abc), DATA(1126,def) e depois DATA(1123,abcdef). É válido?", P4),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var q4 = segmenta(8765, ["a", "bcdefg", "ab", "bbbbbbbbbbbb"], 0), q5 = segmenta(8765, ["a", "bcdefg", "ab", "bbbbbbbbbbbb"], 8);
                var ok = Number(P1.value) === q4[q4.length - 1].seq && Number(P2.value) === q5.length && Number(P3.value) === q5[q5.length - 1].seq && P4.value === "sim";
                u.marca(fb, ok, ok ? "Isso. Como o seq conta bytes, o emissor pode juntar ou separar os dados como quiser, inclusive numa retransmissão." : "Ainda não. Use os dois modos da simulação; para a Q6, lembre que o receptor só vê posições no fluxo.");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 4: tempo de vida máximo (Q8) ---------- */
    function taxaMaxima(bits, msl) { return Math.pow(2, bits) / msl; }
    R.taxaMaxima31 = taxaMaxima;
    R.registrar("tempo-vida", function (raiz) {
        var bits = escolha("Bits do número de sequência", [["16", "16 bits"], ["32", "32 bits"], ["64", "64 bits"]], false);
        bits.value = "32";
        var msl = el("input", { type: "number", class: "form-control form-control-sm", value: 100, min: 1, "aria-label": "Tempo de vida máximo em segundos" });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        function mostra() {
            var t = taxaMaxima(Number(bits.value), Math.max(1, Number(msl.value) || 1));
            saida.replaceChildren(el("p", { class: "mb-1" }, "No máximo ", el("strong", null, br(t, 0) + " segmentos por segundo"), ": em " + msl.value + " s, não dá para gastar mais que os 2^" + bits.value + " números."),
                el("p", { class: "mb-0" }, "Se cada número for um byte (fluxo de bytes), isso dá " + br(t * 8 / 1e9, 3) + " Gbit/s."));
        }
        [bits, msl].forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });
        var P1 = numero("Segmentos por segundo"), P2 = decimal("Gbit/s com 120 s");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "tempo-vida", 10, "O limite do tempo de vida");
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Número de sequência", bits)), el("div", { class: "col-6" }, u.campo("Tempo de vida máximo (s)", msl))), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            linhaPergunta("Q8: com 32 bits e 100 s, qual é a taxa máxima, em segmentos por segundo (arredonde para inteiro)?", P1),
            linhaPergunta("Com 32 bits contando bytes e o MSL de 2 minutos da Internet, quantos Gbit/s? (duas casas, use ponto ou vírgula)", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var a = Math.abs(Number(P1.value) - taxaMaxima(32, 100)) <= 1;
                var b = Math.abs(Number(String(P2.value).replace(",", ".")) - taxaMaxima(32, 120) * 8 / 1e9) < 0.01;
                u.marca(fb, a && b, a && b ? "Isso: cerca de 42,9 milhões de segmentos por segundo, e 0,29 Gbit/s no segundo caso. Acima disso, um segmento atrasado poderia ser confundido com um novo." : "Ainda não. Divida 2^32 pelo tempo de vida; no segundo caso, multiplique por 8 bits.");
                if (a && b) concluir();
            }), fb);
        mostra();
    });

    /* ---------- Atividade 5: um disco pelo correio (4.5.3) ---------- */
    function vazaoCorreio(terabytes, horas, binario) { var bytes = terabytes * (binario ? Math.pow(2, 40) : 1e12); return bytes * 8 / (horas * 3600); }
    R.vazaoCorreio31 = vazaoCorreio;
    R.registrar("disco-correio", function (raiz) {
        var tb = el("input", { type: "number", class: "form-control form-control-sm", value: 1, min: 0.1, step: 0.1, "aria-label": "Terabytes" });
        var h = el("input", { type: "number", class: "form-control form-control-sm", value: 24, min: 1, "aria-label": "Horas de entrega" });
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var v = vazaoCorreio(Number(tb.value) || 0, Number(h.value) || 1, false);
            saida.textContent = "O correio equivale a " + br(v / 1e6, 1) + " Mbit/s (com 1 TB = 10¹² bytes; com 2⁴⁰ bytes, " + br(vazaoCorreio(Number(tb.value) || 0, Number(h.value) || 1, true) / 1e6, 1) + " Mbit/s). E a vazão não depende da distância: o atraso é que é enorme.";
        }
        [tb, h].forEach(function (c) { c.addEventListener("input", mostra); });
        var P1 = decimal("Mbit/s");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "disco-correio", 10, "O correio como enlace");
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Disco (TB)", tb)), el("div", { class: "col-6" }, u.campo("Entrega (horas)", h))), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): com 1 TB = 10¹² bytes em 24 h, qual é a vazão mínima equivalente, em Mbit/s (uma casa)?"),
            el("div", { class: "d-flex gap-2" }, P1, u.botao("Conferir", "btn-primary", function () {
                var ok = Math.abs(Number(String(P1.value).replace(",", ".")) - vazaoCorreio(1, 24, false) / 1e6) < 0.1;
                u.marca(fb, ok, ok ? "92,6 Mbit/s: 8 × 10¹² bits em 86 400 s." : "Não. Converta para bits (× 8) e divida pelos segundos de um dia.");
                if (ok) concluir();
            })), fb);
        mostra();
    });

    /* ---------- Atividade 6: piggybacking ---------- */
    function contaSegmentos(trocas, carona) { return carona ? 2 * trocas + 1 : 4 * trocas; }
    R.contaSegmentos31 = contaSegmentos;
    R.registrar("piggyback", function (raiz) {
        var n = el("input", { type: "number", class: "form-control form-control-sm", value: 3, min: 1, max: 6, "aria-label": "Pedidos e respostas" });
        var carona = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: true });
        var area = el("div"), saida = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function mostra() {
            var k = Math.max(1, Math.min(6, Number(n.value) || 1)), ev = [];
            for (var i = 0; i < k; i++) {
                if (carona.checked) {
                    ev.push({ de: 0, para: 1, rotulo: "DATA(pedido " + (i + 1) + ")" + (i ? " + ack da resposta " + i : "") });
                    ev.push({ de: 1, para: 0, rotulo: "DATA(resposta " + (i + 1) + ") + ack do pedido " + (i + 1) });
                } else {
                    ev.push({ de: 0, para: 1, rotulo: "DATA(pedido " + (i + 1) + ")" }); ev.push({ de: 1, para: 0, rotulo: "ACK(pedido " + (i + 1) + ")", tipo: "tracejado" });
                    ev.push({ de: 1, para: 0, rotulo: "DATA(resposta " + (i + 1) + ")" }); ev.push({ de: 0, para: 1, rotulo: "ACK(resposta " + (i + 1) + ")", tipo: "tracejado" });
                }
            }
            if (carona.checked) ev.push({ de: 0, para: 1, rotulo: "ACK(resposta " + k + ")", tipo: "tracejado" });
            area.replaceChildren(R.diagramaSequencia({ titulo: "Pedidos e respostas", colunas: ["A", "B"], eventos: ev, largura: 520, margem: 90, passo: 26 }));
            saida.textContent = ev.length + " segmentos para " + k + " pedidos e " + k + " respostas" + (carona.checked ? ": as confirmações viajam de carona nos dados do outro sentido; só a última precisa de um segmento próprio." : ": cada dado precisa de um segmento de confirmação só para ele.");
        }
        n.addEventListener("input", mostra); carona.addEventListener("change", mostra);
        var P1 = numero("Segmentos sem piggybacking"), P2 = numero("Segmentos com piggybacking");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "piggyback", 10, "Piggybacking");
        raiz.append(el("div", { class: "row g-2 align-items-end" }, el("div", { class: "col-6 col-sm-4" }, u.campo("Pedidos e respostas (1 a 6)", n)),
                el("div", { class: "col-6 col-sm-8 mb-2" }, el("div", { class: "form-check" }, carona, el("label", { class: "form-check-label small", for: carona.id }, "Usar piggybacking")))),
            area, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): numa troca de 10 pedidos e 10 respostas alternados, quantos segmentos…"),
            linhaPergunta("…sem piggybacking?", P1), linhaPergunta("…com piggybacking?", P2),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var ok = Number(P1.value) === contaSegmentos(10, false) && Number(P2.value) === contaSegmentos(10, true);
                u.marca(fb, ok, ok ? "40 contra 21: quase metade dos segmentos e dos cabeçalhos." : "Ainda não. Conte na simulação com poucos pedidos e generalize.");
                if (ok) concluir();
            }), fb);
        mostra();
    });
}());
