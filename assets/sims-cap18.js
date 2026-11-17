/* Simulações do Capítulo 18 — Os protocolos de transporte da Internet (seção 3.10 do livro).
 * Cada uma é registrada em Redes.registrar. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function opcoes(lista) { return lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }); }

    /* ------------------------------------------------------------------
     * 1. O serviço da camada de rede: perdas, erros e troca de ordem (pág. 185 do PDF)
     * ------------------------------------------------------------------ */
    // Cada cenário diz, para os pacotes 1 a 8, quais se perdem, quais chegam com erro e a ordem de chegada.
    var CENARIOS = {
        perfeita: { nome: "Rede sem problemas", perdidos: [], erros: [], ordem: [1, 2, 3, 4, 5, 6, 7, 8] },
        a: { nome: "Cenário A", perdidos: [3], erros: [], ordem: [1, 2, 4, 5, 6, 7, 8] },
        b: { nome: "Cenário B", perdidos: [5], erros: [7], ordem: [1, 2, 4, 3, 6, 7, 8] }
    };
    function sorteiaCenario(semente) {
        var s = semente >>> 0 || 1;
        function aleat() { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; }
        var perdidos = [], erros = [], chegadas = [];
        for (var i = 1; i <= 8; i++) {
            if (aleat() < 0.15) { perdidos.push(i); continue; }
            if (aleat() < 0.12) erros.push(i);
            chegadas.push({ p: i, t: i + (aleat() < 0.25 ? 2.5 : 0) });
        }
        chegadas.sort(function (x, y) { return x.t - y.t; });
        return { nome: "Sorteio " + semente, perdidos: perdidos, erros: erros, ordem: chegadas.map(function (c) { return c.p; }) };
    }
    R.servicoIp = { cenarios: CENARIOS, sorteia: sorteiaCenario };

    R.registrar("servico-ip", function (raiz) {
        var atual = CENARIOS.perfeita, sorteios = 0;
        var mostra = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx") });
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function selo(p, extra, titulo) { return el("span", { class: "badge mono " + extra, title: titulo || null }, "pacote " + p); }
        function desenha() {
            var ver = mostra.checked;
            var enviados = [1, 2, 3, 4, 5, 6, 7, 8].map(function (p) {
                var perdido = atual.perdidos.indexOf(p) >= 0;
                return selo(p, perdido && ver ? "text-bg-danger text-decoration-line-through" : "text-bg-secondary", perdido && ver ? "perdido no caminho" : null);
            });
            var recebidos = atual.ordem.map(function (p) {
                var erro = atual.erros.indexOf(p) >= 0;
                return selo(p + (erro && ver ? " ⚡" : ""), erro && ver ? "text-bg-warning" : "text-bg-primary", erro && ver ? "chegou com erro" : null);
            });
            var fora = atual.ordem.some(function (p, i) { return i > 0 && p < atual.ordem[i - 1]; });
            var resumo = ver ? "Na rede: " + (atual.perdidos.length ? "perdido(s) " + atual.perdidos.join(", ") : "nenhuma perda") + "; " +
                (atual.erros.length ? "com erro " + atual.erros.join(", ") : "nenhum erro") + "; " + (fora ? "houve troca de ordem." : "sem troca de ordem.") :
                "O destino vê só a segunda linha. Marque a caixa para ver o que aconteceu na rede.";
            area.replaceChildren(
                el("p", { class: "small fw-semibold mb-1" }, atual.nome + ": enviados pela origem"), el("div", { class: "d-flex flex-wrap gap-1 mb-2" }, enviados),
                el("p", { class: "small fw-semibold mb-1" }, "Recebidos pelo destino, na ordem de chegada"), el("div", { class: "d-flex flex-wrap gap-1 mb-2" }, recebidos),
                el("p", { class: "small mb-0" }, resumo));
        }
        mostra.addEventListener("change", desenha);
        var botoes = el("div", { class: "d-flex flex-wrap gap-2 mb-2" },
            u.botao("Rede sem problemas", "btn-outline-secondary", function () { atual = CENARIOS.perfeita; desenha(); }),
            u.botao("Cenário A", "btn-outline-secondary", function () { atual = CENARIOS.a; desenha(); }),
            u.botao("Cenário B", "btn-outline-secondary", function () { atual = CENARIOS.b; desenha(); }),
            u.botao("Sortear", "btn-outline-primary", function () { sorteios++; atual = sorteiaCenario(sorteios * 7919); desenha(); }));
        var perdido = el("input", { type: "number", class: "form-control form-control-sm", min: 1, max: 8, step: 1 });
        var atrasado = el("input", { type: "number", class: "form-control form-control-sm", min: 1, max: 8, step: 1 });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "servico-ip", 15, "Ler uma entrega do serviço do IP");
        raiz.append(el("p", { class: "small mb-2" }, "A origem envia os pacotes 1 a 8. Escolha um cenário e compare o que sai com o que chega. Os pacotes aqui não levam número de sequência: os números servem só para você acompanhar."),
            botoes,
            el("div", { class: "form-check mb-1" }, mostra, el("label", { class: "form-check-label small", for: mostra.id }, "Mostrar o que aconteceu na rede")),
            area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): no cenário B, sem marcar a caixa, qual pacote se perdeu? E qual chegou atrasado, depois de um pacote enviado depois dele?"),
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("Perdido", perdido)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Atrasado", atrasado)),
                el("div", { class: "col-12 col-md-3 d-flex align-items-end" }, u.botao("Conferir", "btn-primary", function () {
                    var ok = Number(perdido.value) === 5 && Number(atrasado.value) === 3;
                    u.marca(fb, ok, ok ? "Isso: o 5 não chegou, e o 3 chegou depois do 4. Marque a caixa: o 7 também chegou com erro, e o destino não tinha como perceber sem um checksum." :
                        "Ainda não. Procure o número que falta na segunda linha e o pacote que aparece depois de um número maior.");
                    if (ok) concluir();
                }))), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 2. Qual transporte para qual aplicação (pág. 134, 144, 152 e 185 do PDF)
     * ------------------------------------------------------------------ */
    var APLICACOES = [
        { txt: "Uma consulta DNS curta", certo: "udp", por: "O DNS usa datagramas para consultas e respostas curtas (pág. 134 do PDF)." },
        { txt: "Uma resposta DNS longa", certo: "tcp", por: "Quando a resposta é longa, o DNS usa o fluxo de bytes (pág. 134 do PDF)." },
        { txt: "O envio de um e-mail com SMTP", certo: "tcp", por: "O SMTP usa o serviço de fluxo de bytes, ou seja, uma conexão TCP (pág. 144 do PDF)." },
        { txt: "Uma página web com HTTP", certo: "tcp", por: "Para buscar uma página, o cliente abre uma conexão TCP com o servidor, na porta 80 (pág. 152 do PDF)." },
        { txt: "O áudio e o vídeo de uma videoconferência", certo: "rtp", por: "O RTP é usado por aplicações multimídia (pág. 185 do PDF) e costuma rodar sobre o UDP." },
        { txt: "A sinalização numa rede de voz sobre IP", certo: "sctp", por: "É o exemplo que o livro dá para o SCTP (pág. 185 do PDF)." }
    ];
    R.aplicacoesTransporte = APLICACOES;

    R.registrar("escolhe-transporte", function (raiz) {
        var OPC = [["", "escolha…"], ["udp", "UDP"], ["tcp", "TCP"], ["sctp", "SCTP"], ["rtp", "RTP sobre UDP"]];
        var linhas = APLICACOES.map(function (a) {
            var sel = el("select", { class: "form-select form-select-sm", "aria-label": "Transporte para: " + a.txt }, opcoes(OPC));
            var nota = el("div", { class: "small" });
            return { a: a, sel: sel, nota: nota, tr: el("tr", null, el("td", { class: "small" }, a.txt), el("td", { style: "min-width: 9rem" }, sel), el("td", null, nota)) };
        });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "escolhe-transporte", 15, "Escolher o transporte de cada aplicação");
        raiz.append(el("p", { class: "small mb-2" }, "Desafio (15 pts): escolha o protocolo de transporte que o livro associa a cada aplicação e confira."),
            el("div", { class: "table-responsive" }, el("table", { class: "table table-sm align-middle mb-2" },
                el("thead", null, el("tr", null, el("th", { class: "small" }, "Aplicação"), el("th", { class: "small" }, "Transporte"), el("th", { class: "small" }, "Por quê"))),
                el("tbody", null, linhas.map(function (l) { return l.tr; })))),
            u.botao("Conferir", "btn-primary", function () {
                var certos = 0;
                linhas.forEach(function (l) {
                    var ok = l.sel.value === l.a.certo;
                    if (ok) certos++;
                    l.nota.textContent = l.sel.value ? (ok ? "✔ " + l.a.por : "✘ Reveja a explicação do conceito.") : "";
                    l.nota.className = "small " + (l.sel.value ? (ok ? "quiz-ok" : "quiz-no") : "");
                });
                var tudo = certos === linhas.length;
                u.marca(fb, tudo, tudo ? "Tudo certo: datagramas para o que é curto, fluxo de bytes para o que precisa chegar inteiro, RTP para a mídia e SCTP para a sinalização." :
                    certos + " de " + linhas.length + " corretas. As explicações aparecem ao lado de cada acerto.");
                if (tudo) concluir();
            }), fb);
    });
}());
