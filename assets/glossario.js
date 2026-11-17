/* Glossário: busca por texto (sem diferenciar acentos e maiúsculas) e filtro por letra. */
(function () {
    "use strict";
    function normal(t) { return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
    var busca = document.getElementById("busca-glossario");
    if (!busca) return;
    var verbetes = Array.prototype.slice.call(document.querySelectorAll(".verbete"));
    var titulos = Array.prototype.slice.call(document.querySelectorAll(".letra-glossario"));
    var botoes = Array.prototype.slice.call(document.querySelectorAll("button.letra"));
    var contagem = document.getElementById("contagem-glossario"), vazio = document.getElementById("vazio-glossario");
    var letra = "";
    function marca(x, ativo) {   // o botão ativo fica preenchido, com contraste nos dois temas
        x.setAttribute("aria-pressed", ativo ? "true" : "false");
        x.classList.toggle("btn-primary", ativo); x.classList.toggle("btn-outline-secondary", !ativo);
    }
    verbetes.forEach(function (v) { v.dataset.texto = normal(v.textContent); });
    function aplica() {
        var q = normal(busca.value.trim()), n = 0, visiveis = {};
        verbetes.forEach(function (v) {
            var ok = (!letra || v.dataset.letra === letra) && (!q || v.dataset.texto.indexOf(q) >= 0);
            v.classList.toggle("d-none", !ok);
            if (ok) { n++; visiveis[v.dataset.letra] = true; }
        });
        titulos.forEach(function (h) { h.classList.toggle("d-none", !visiveis[h.id.replace("letra-", "")]); });
        contagem.textContent = n + (n === 1 ? " verbete" : " verbetes");
        vazio.classList.toggle("d-none", n > 0);
    }
    busca.addEventListener("input", aplica);
    botoes.forEach(function (b) {
        b.addEventListener("click", function () {
            letra = b.dataset.letra;
            botoes.forEach(function (x) { marca(x, x === b); });
            aplica();
        });
    });
    botoes.forEach(function (x, i) { marca(x, i === 0); });
    aplica();
}());
