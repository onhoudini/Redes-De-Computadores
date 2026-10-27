(function () {
    "use strict";

    function aplicarTema(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        var buttons = document.querySelectorAll(".theme-toggle");
        buttons.forEach(function (button) {
            button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
            button.textContent = theme === "dark" ? "☀️ Tema claro" : "🌙 Tema escuro";
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        var stored;
        try { stored = localStorage.getItem("redes-theme"); } catch (_) { stored = null; }
        var initial = stored || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        aplicarTema(initial);
        document.querySelectorAll(".theme-toggle").forEach(function (button) {
            button.addEventListener("click", function () {
                var theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
                aplicarTema(theme);
                try { localStorage.setItem("redes-theme", theme); } catch (_) { /* armazenamento indisponível */ }
            });
        });

        document.querySelectorAll("svg").forEach(function (svg, index) {
            var caption = svg.closest("figure") && svg.closest("figure").querySelector("figcaption");
            var title = svg.querySelector("title");
            var description = caption ? caption.textContent.trim() : (title ? title.textContent.trim() : "Ilustração vetorial do capítulo");
            if (!title) {
                title = document.createElementNS("http://www.w3.org/2000/svg", "title");
                title.textContent = description || ("Ilustração " + (index + 1));
                svg.insertBefore(title, svg.firstChild);
            }
            if (!svg.hasAttribute("role")) svg.setAttribute("role", "img");
            if (!svg.hasAttribute("aria-label")) svg.setAttribute("aria-label", description || title.textContent);
        });

        document.querySelectorAll("input, select, textarea, button").forEach(function (control, index) {
            if (control.hasAttribute("aria-label") || control.id && document.querySelector('label[for="' + control.id + '"]')) return;
            var text = control.textContent.trim();
            if (!text && control.placeholder) text = control.placeholder;
            control.setAttribute("aria-label", text || ("Controle interativo " + (index + 1)));
        });
    });
    // Questões rápidas: <div class="mini-quiz" data-options="a|b|c" data-answer="1" data-explain="..." data-hint="..."><p>Pergunta</p></div>
    function iniciarQuestoes() {
        document.querySelectorAll(".mini-quiz").forEach(function (quiz, n) {
            var opcoes = (quiz.getAttribute("data-options") || "").split("|");
            var certa = Number(quiz.getAttribute("data-answer"));
            var pergunta = quiz.querySelector("p");
            if (!pergunta || opcoes.length < 2) return;
            if (!pergunta.id) pergunta.id = "mini-quiz-pergunta-" + n;
            var grupo = document.createElement("div");
            grupo.className = "d-grid gap-2";
            grupo.setAttribute("role", "group");
            grupo.setAttribute("aria-labelledby", pergunta.id);
            var feedback = document.createElement("p");
            feedback.className = "small mt-2 mb-0";
            feedback.setAttribute("aria-live", "polite");
            var botoes = opcoes.map(function (texto, i) {
                var botao = document.createElement("button");
                botao.type = "button";
                botao.className = "btn btn-outline-secondary btn-sm text-start";
                botao.textContent = texto;
                botao.addEventListener("click", function () {
                    if (i === certa) {
                        botoes.forEach(function (outro) { outro.disabled = true; });
                        botao.className = "btn btn-success btn-sm text-start";
                        feedback.className = "small mt-2 mb-0 quiz-ok";
                        feedback.textContent = "✔ Correto. " + (quiz.getAttribute("data-explain") || "");
                    } else {
                        botao.disabled = true;
                        botao.className = "btn btn-outline-danger btn-sm text-start";
                        feedback.className = "small mt-2 mb-0 quiz-no";
                        feedback.textContent = "✘ Ainda não. " + (quiz.getAttribute("data-hint") || "Tente outra opção.");
                    }
                });
                grupo.appendChild(botao);
                return botao;
            });
            quiz.appendChild(grupo);
            quiz.appendChild(feedback);
        });
    }
    document.addEventListener("DOMContentLoaded", iniciarQuestoes);
}());
