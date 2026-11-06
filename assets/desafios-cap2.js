/*
 * Desafios pontuáveis do Capítulo 2, ligados às simulações já existentes.
 * Não altera o código das simulações: só observa entradas e saídas pelos ids atuais.
 * Cada resposta pode ser conferida no livro.pdf do repositório (páginas do PDF indicadas).
 */
(function () {
    "use strict";
    var R = window.Redes;
    if (!R || !R.desafio || !R.util) return;
    var el = R.util.el;

    function porId(id) { return document.getElementById(id); }

    function desafio(ancora, caixa, id, pontos, titulo, enunciado, pagina) {
        var fb = el("span", { class: "ms-1", "aria-live": "polite" });
        var linha = el("p", { class: "small mt-2 mb-0 desafio-livro" },
            el("strong", null, "Desafio (" + pontos + " pts): "), enunciado,
            el("span", { class: "text-muted" }, " Confira no livro.pdf, pág. " + pagina + "."), fb);
        caixa.appendChild(linha);
        var concluir = R.desafio(ancora, id, pontos, titulo);
        if (R.desafioConcluido(id)) { fb.className = "ms-1 quiz-ok"; fb.textContent = "✔ Concluído."; }
        return {
            fb: fb,
            ok: function (msg) {
                concluir();
                fb.className = "ms-1 quiz-ok";
                fb.textContent = "✔ " + msg;
            }
        };
    }

    function observar(no, fn) {
        if (!no) return;
        new MutationObserver(fn).observe(no, { childList: true, subtree: true, characterData: true });
    }

    document.addEventListener("DOMContentLoaded", function () {
        // 1. Prefixo mais longo e buraco negro.
        var lpm = porId("lpmOutput"), lpmBtn = porId("lpmBtn");
        if (lpm && lpmBtn) {
            var vistos = {};
            var d1 = desafio(lpm, lpm.closest(".demo-box"), "c2-lpm", 15, "Prefixo mais longo e buraco negro",
                "encontre um endereço que saia por cada interface (Oeste, Norte e Sul) e um que caia num buraco negro.", "35 e 39");
            // Avalia a cada busca (o ouvinte original do botão roda antes e já atualizou a saída).
            lpmBtn.addEventListener("click", function () {
                var t = lpm.textContent;
                var m = /interface (\w+)/.exec(t);
                if (m) vistos[m[1]] = true;
                if (t.indexOf("buraco negro") >= 0) vistos.buraco = true;
                var n = ["Oeste", "Norte", "Sul", "buraco"].filter(function (k) { return vistos[k]; }).length;
                if (n === 4) d1.ok("Entre os prefixos que combinam vence o mais longo; sem nenhum, o pacote é descartado.");
                else { d1.fb.className = "ms-1"; d1.fb.textContent = n + " de 4 encontrados."; }
            });
        }

        // 2. Vetor de distância rodada a rodada até convergir.
        var dv = porId("dvOutput");
        if (dv) {
            var d2 = desafio(dv, dv.closest(".demo-box"), "c2-dv-converge", 10, "Vetor de distância até convergir",
                "avance as rodadas até a tabela de A parar de mudar.", "44–47");
            observar(dv, function () {
                if (dv.textContent.indexOf("convergiu") >= 0) d2.ok("Os vetores são trocados até nenhuma rota mudar.");
            });
        }

        // 3 e 4. Grafo editável: queda de B–D e Dijkstra passo a passo.
        var secao = porId("grafo-editavel");
        var dijOut = porId("routingDijkstraOutput"), dvOut = porId("routingDVOutput"), fila = porId("routingDijkstraQueue");
        if (secao && dijOut && dvOut && fila) {
            var area = el("div", { class: "demo-box mt-4" });
            var quiz = secao.querySelector(".mini-quiz");
            secao.insertBefore(area, quiz);
            var d3 = desafio(dvOut, area, "c2-queda-enlace", 15, "Queda de enlace: vetor de distância e Dijkstra",
                "derrube o enlace B–D, clique em Recalcular rotas e confira que o vetor de distância e o Dijkstra escolhem o mesmo caminho de A até D.", "44–50");
            var d4 = desafio(fila, area, "c2-dijkstra", 10, "Dijkstra passo a passo",
                "avance o Dijkstra a partir de A até o algoritmo terminar.", "50 e 53");
            function confereQueda() {
                var caido = !!document.querySelector('[aria-label="Ativar enlace B–D"]');
                if (!caido) return;
                var dijD = /A → D: custo (\d+); predecessor (\w)/.exec(dijOut.textContent);
                var linhaDV = Array.from(dvOut.querySelectorAll("tbody tr")).map(function (tr) {
                    return Array.from(tr.children).map(function (td) { return td.textContent; });
                }).find(function (c) { return c[0] === "A" && c[1] === "D"; });
                if (dijD && linhaDV && dijD[1] === linhaDV[2]) {
                    d3.ok("Os dois chegam ao custo " + dijD[1] + ": A → C → D.");
                }
            }
            observar(dijOut, confereQueda);
            observar(dvOut, confereQueda);
            observar(fila, function () {
                if (fila.textContent.indexOf("algoritmo concluído") >= 0) d4.ok("Cada roteador calcula a árvore de menores caminhos com Dijkstra.");
            });
        }

        // 5. Inundação de LSP: descarte de duplicata.
        var lsp = porId("lspOutput");
        if (lsp) {
            var d5 = desafio(lsp, lsp.closest(".demo-box"), "c2-lsp-duplicata", 10, "LSP duplicado na inundação",
                "avance a inundação até um roteador receber um LSP que já tinha e descartá-lo.", 51);
            observar(lsp, function () {
                if (lsp.textContent.indexOf("duplicata descartada") >= 0) d5.ok("Um LSP que já está na LSDB não é reencaminhado.");
            });
        }
    });
}());
