/*
 * Desafios pontuáveis do Capítulo 1, ligados às simulações já existentes.
 * Não altera o código das simulações: só observa entradas e saídas pelos ids atuais.
 * Cada resposta pode ser conferida no livro.pdf do repositório (páginas do PDF indicadas).
 */
(function () {
    "use strict";
    var R = window.Redes;
    if (!R || !R.desafio || !R.util) return;
    var el = R.util.el;

    function porId(id) { return document.getElementById(id); }

    // Acrescenta o enunciado logo abaixo da caixa da simulação e devolve {concluir, feedback}.
    function desafio(ancora, id, pontos, titulo, enunciado, pagina) {
        var caixa = ancora.closest(".demo-box") || ancora;
        var fb = el("span", { class: "ms-1", "aria-live": "polite" });
        var linha = el("p", { class: "small mt-2 mb-0 desafio-livro" },
            el("strong", null, "Desafio (" + pontos + " pts): "), enunciado,
            el("span", { class: "text-muted" }, " Confira no livro.pdf, pág. " + pagina + "."), fb);
        caixa.appendChild(linha);
        var concluir = R.desafio(caixa, id, pontos, titulo);
        function ok(msg) {
            if (concluir()) { fb.className = "ms-1 quiz-ok"; fb.textContent = "✔ " + msg; }
            else if (R.desafioConcluido(id)) { fb.className = "ms-1 quiz-ok"; fb.textContent = "✔ " + msg; }
        }
        if (R.desafioConcluido(id)) { fb.className = "ms-1 quiz-ok"; fb.textContent = "✔ Concluído."; }
        return { ok: ok, fb: fb, linha: linha };
    }

    function observar(no, fn) {
        if (!no) return;
        new MutationObserver(fn).observe(no, { childList: true, subtree: true, characterData: true });
    }

    document.addEventListener("DOMContentLoaded", function () {
        // 1. Texto → binário: z, @ e 0 da tabela ASCII do livro.
        var texto = porId("textInput");
        if (texto) {
            var d1 = desafio(texto, "c1-ascii", 10, "Códigos ASCII da tabela do livro",
                "digite z, @ e 0 e compare os bits com a tabela ASCII do livro (z = 1111010, @ = 1000000, 0 = 0110000; o byte tem um 0 à esquerda).", 14);
            texto.addEventListener("input", function () {
                var v = texto.value;
                if (v.indexOf("z") >= 0 && v.indexOf("@") >= 0 && v.indexOf("0") >= 0) d1.ok("Os bytes 01111010, 01000000 e 00110000 batem com a tabela do livro.");
            });
        }

        // 2. Bit stuffing: dois quadros da tabela do livro.
        var bits = porId("bitsInput"), botao = porId("stuffBtn");
        if (bits && botao) {
            var feitos = {};
            var esperados = { "0111110": "011111100111110001111110", "01111110": "0111111001111101001111110" };
            var d2 = desafio(bits, "c1-bitstuffing", 15, "Bit stuffing com a tabela do livro",
                "aplique o stuffing aos quadros 0111110 e 01111110 e compare com a coluna “Transmitted frame” da tabela do livro.", 14);
            botao.addEventListener("click", function () {
                var v = bits.value.trim();
                if (!esperados[v]) return;
                var transmitido = Array.from(porId("stuffOutput").querySelector("div").children).map(function (c) { return c.textContent; }).join("");
                if (transmitido === esperados[v]) feitos[v] = true;
                var n = Object.keys(feitos).length;
                if (n === 2) d2.ok("Os dois quadros transmitidos são iguais aos do livro.");
                else { d2.fb.className = "ms-1"; d2.fb.textContent = "Quadro " + v + " conferido (" + n + " de 2)."; }
            });
        }

        // 3. Character stuffing: montar o quadro transmitido do exemplo do livro.
        var cs = porId("characterStuffInput");
        if (cs) {
            var d3 = desafio(cs, "c1-charstuffing", 15, "Character stuffing do exemplo do livro",
                "escreva no campo o quadro transmitido para o quadro original 1 2 3 DLE STX 4 (lembre de duplicar o DLE dos dados).", 15);
            cs.addEventListener("input", function () {
                var v = cs.value.trim().replace(/\s+/g, " ").toUpperCase();
                if (v === "DLE STX 1 2 3 DLE DLE STX 4 DLE ETX") d3.ok("É exatamente o quadro transmitido da tabela do livro.");
            });
        }

        // 4. Calculadora: tempo por quadro no exemplo do satélite.
        var eff = porId("effResult");
        if (eff) {
            var d4 = desafio(eff, "c1-abp-tempo", 10, "Tempo por quadro no exemplo do livro",
                "no exemplo do livro (1000 bits, 50 kbit/s, 250 ms de propagação em cada sentido, valores já preenchidos acima), quantos milissegundos o ABP leva por quadro?", 24);
            var resp = el("input", { type: "number", class: "form-control form-control-sm", style: "max-width:8rem", "aria-label": "Tempo por quadro em milissegundos" });
            var conferir = el("button", { type: "button", class: "btn btn-sm btn-primary" }, "Conferir");
            d4.linha.after(el("div", { class: "d-flex gap-2 mt-1" }, resp, conferir));
            conferir.addEventListener("click", function () {
                if (Number(resp.value) === 520) d4.ok("20 ms de transmissão + 250 + 250 ms de propagação = 520 ms: menos de 2 kbit/s.");
                else { d4.fb.className = "ms-1 quiz-no"; d4.fb.textContent = "✘ Some L/R (em ms) ao RTT."; }
            });
        }

        // 5. Linha do tempo: janela grande demais.
        var tl = porId("timelineOutput");
        if (tl) {
            var d5 = desafio(tl, "c1-janela-max", 10, "Janela maior que o permitido",
                "marque “janela grande demais”, clique em Iniciar e leia por que o receptor confundiria um quadro novo com uma retransmissão.", 31);
            observar(tl, function () {
                if (tl.textContent.indexOf("excede o limite") >= 0) d5.ok("Com n bits: até 2ⁿ − 1 no Go-Back-N e 2ⁿ⁻¹ no Selective Repeat.");
            });
        }

        // 6. Codificação de linha: relógio desalinhado.
        var lc = porId("lineCodeOutput"), drift = porId("clockDrift");
        if (lc && drift) {
            var d6 = desafio(lc, "c1-relogio", 10, "Relógio desalinhado",
                "aumente o atraso do relógio do receptor até o NRZ-L ler algum bit errado; o Manchester tem uma transição no meio de cada período, que permite ressincronizar.", 12);
            drift.addEventListener("input", function () {
                var m = /\((\d+) bit\(s\) diferente/.exec(lc.textContent);
                if (m && Number(m[1]) > 0) d6.ok("Bits “somem” ou “aparecem” quando os relógios não batem, como no livro.");
            });
        }

        // 7. Canal ruidoso: erros que a paridade não detecta.
        var no = porId("noiseOutput"), run = porId("runNoise");
        if (no && run) {
            var d7 = desafio(no, "c1-paridade", 10, "Erros que a paridade não detecta",
                "envie 1000 quadros e encontre quadros com erro que a paridade não detectou.", "18–19");
            run.addEventListener("click", function () {
                var m = /não detectou (\d+) quadros/.exec(no.textContent);
                if (m && Number(m[1]) > 0) d7.ok("Com dois ou mais bits errados, a paridade pode não perceber o erro.");
            });
        }
    });
}());
