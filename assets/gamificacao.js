/*
 * Gamificação dos capítulos (SPEC.md, seção 4 — Gamificação).
 *
 * - <body data-capitulo="3"> identifica o capítulo.
 * - <section data-conceito="abnf" data-titulo="Gramáticas ABNF"> marca cada conceito.
 * - Mini-quizzes (.mini-quiz) dentro de um conceito contam automaticamente.
 * - Simulações declaram desafios:  var concluir = Redes.desafio(raiz, "abnf-classificar", 20, "Classificar strings");
 *   e chamam concluir() quando o usuário acerta. Cada desafio pontua uma única vez.
 * - Um conceito é dominado quando todos os seus quizzes e desafios foram concluídos.
 */
(function () {
    "use strict";

    var Redes = window.Redes = window.Redes || {};
    var NIVEIS = [
        { min: 0, nome: "Bit" },
        { min: 0.2, nome: "Quadro" },
        { min: 0.45, nome: "Pacote" },
        { min: 0.7, nome: "Segmento" },
        { min: 0.95, nome: "Mensagem" }
    ];

    var capitulo = document.body ? document.body.getAttribute("data-capitulo") : null;
    var chave = "redes-progresso-cap" + (capitulo || "x");
    var estado = carregar();          // { feitos: {id: pontos} }
    var itens = {};                   // id → {pontos, conceito, titulo}
    var conceitos = [];               // [{id, titulo}]
    var painel = null;
    var conquistasAnunciadas = {};

    function carregar() {
        try {
            var bruto = localStorage.getItem(chave);
            var obj = bruto ? JSON.parse(bruto) : null;
            if (obj && typeof obj.feitos === "object") return obj;
        } catch (_) { /* armazenamento indisponível ou corrompido */ }
        return { feitos: {} };
    }

    function salvar() {
        try { localStorage.setItem(chave, JSON.stringify(estado)); } catch (_) { /* segue só na sessão */ }
    }

    function conceitoDe(no) {
        var sec = no && no.closest ? no.closest("[data-conceito]") : null;
        return sec ? sec.getAttribute("data-conceito") : "geral";
    }

    function declarar(id, pontos, conceito, titulo) {
        if (!itens[id]) itens[id] = { pontos: pontos, conceito: conceito, titulo: titulo || id };
        agendarRender();
    }

    function concluirItem(id, pontosGanhos) {
        if (!itens[id] || estado.feitos[id] !== undefined) return false;
        estado.feitos[id] = pontosGanhos === undefined ? itens[id].pontos : pontosGanhos;
        salvar();
        var c = itens[id].conceito;
        brinde("+" + estado.feitos[id] + " pontos — " + itens[id].titulo);
        if (conceitoDominado(c) && !conquistasAnunciadas[c]) {
            conquistasAnunciadas[c] = true;
            var info = conceitos.find(function (x) { return x.id === c; });
            if (info) setTimeout(function () { brinde("🏅 Conquista: Domínio de " + info.titulo, true); }, 900);
        }
        agendarRender();
        return true;
    }

    Redes.desafio = function (raiz, id, pontos, titulo) {
        declarar(id, pontos || 10, conceitoDe(raiz), titulo);
        return function () { return concluirItem(id); };
    };

    Redes.desafioConcluido = function (id) { return estado.feitos[id] !== undefined; };

    function itensDoConceito(c) {
        return Object.keys(itens).filter(function (id) { return itens[id].conceito === c; });
    }

    function conceitoDominado(c) {
        var lista = itensDoConceito(c);
        return lista.length > 0 && lista.every(function (id) { return estado.feitos[id] !== undefined; });
    }

    function totais() {
        var max = 0, feitos = 0;
        Object.keys(itens).forEach(function (id) {
            max += itens[id].pontos;
            if (estado.feitos[id] !== undefined) feitos += estado.feitos[id];
        });
        return { max: max, pontos: feitos };
    }

    function nivelPara(fracao) {
        var atual = NIVEIS[0];
        NIVEIS.forEach(function (n) { if (fracao >= n.min) atual = n; });
        return atual;
    }

    /* ---------- Interface ---------- */

    var renderAgendado = false;
    function agendarRender() {
        if (renderAgendado) return;
        renderAgendado = true;
        setTimeout(function () { renderAgendado = false; render(); }, 0);
    }

    function render() {
        if (!painel) return;
        var t = totais();
        var fracao = t.max ? t.pontos / t.max : 0;
        var nivel = nivelPara(fracao);
        var dominados = conceitos.filter(function (c) { return conceitoDominado(c.id); }).length;

        painel.querySelector("[data-g=pontos]").textContent = t.pontos + " / " + t.max;
        painel.querySelector("[data-g=nivel]").textContent = nivel.nome;
        painel.querySelector("[data-g=dominados]").textContent = dominados + " / " + conceitos.length;
        var barra = painel.querySelector("[data-g=barra]");
        barra.style.width = Math.round(fracao * 100) + "%";
        barra.parentNode.setAttribute("aria-valuenow", String(Math.round(fracao * 100)));

        var lista = painel.querySelector("[data-g=conceitos]");
        lista.replaceChildren();
        conceitos.forEach(function (c) {
            var ids = itensDoConceito(c.id);
            var feitos = ids.filter(function (id) { return estado.feitos[id] !== undefined; }).length;
            var ok = conceitoDominado(c.id);
            var li = document.createElement("li");
            li.className = "gami-conceito" + (ok ? " gami-ok" : "");
            var a = document.createElement("a");
            a.href = "#" + c.ancora;
            a.textContent = (ok ? "🏅 " : "○ ") + c.titulo;
            var conta = document.createElement("span");
            conta.className = "gami-conta";
            conta.textContent = feitos + "/" + ids.length;
            li.append(a, conta);
            lista.appendChild(li);
        });

        document.querySelectorAll("[data-gami-toc]").forEach(function (no) {
            no.textContent = nivel.nome + " · " + t.pontos + " pts · " + Math.round(fracao * 100) + "%";
        });
        document.querySelectorAll("#toc-nav a.nav-link").forEach(function (a) {
            var alvo = document.querySelector(a.getAttribute("href"));
            var c = alvo && alvo.getAttribute("data-conceito");
            if (c) a.classList.toggle("gami-toc-ok", conceitoDominado(c));
        });
    }

    var regiaoAnuncio = null;
    function brinde(texto, destaque) {
        if (!regiaoAnuncio) return;
        var b = document.createElement("div");
        b.className = "gami-brinde" + (destaque ? " gami-brinde-destaque" : "");
        b.textContent = texto;
        regiaoAnuncio.appendChild(b);
        setTimeout(function () { b.classList.add("gami-saindo"); }, 2600);
        setTimeout(function () { b.remove(); }, 3200);
    }

    function montarPainel(alvo) {
        painel = document.createElement("div");
        painel.className = "gami-painel card-soft p-3 p-md-4";
        painel.innerHTML =
            '<div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">' +
            '  <h2 class="h6 mb-0">Seu progresso neste capítulo</h2>' +
            '  <button type="button" class="btn btn-outline-secondary btn-sm" data-g="reiniciar">Reiniciar progresso</button>' +
            '</div>' +
            '<div class="progress mb-3" role="progressbar" aria-label="Progresso do capítulo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" style="height:10px">' +
            '  <div class="progress-bar" data-g="barra" style="width:0%"></div>' +
            '</div>' +
            '<div class="row g-2 small mb-3 text-center">' +
            '  <div class="col-4"><div class="gami-stat"><span class="gami-rotulo">Pontos</span><strong data-g="pontos">0</strong></div></div>' +
            '  <div class="col-4"><div class="gami-stat"><span class="gami-rotulo">Nível</span><strong data-g="nivel">Bit</strong></div></div>' +
            '  <div class="col-4"><div class="gami-stat"><span class="gami-rotulo">Conceitos dominados</span><strong data-g="dominados">0</strong></div></div>' +
            '</div>' +
            '<p class="small text-muted mb-2">Cada conceito tem perguntas e desafios. Responda a todos para ganhar a medalha do conceito. ' +
            'Níveis: Bit → Quadro → Pacote → Segmento → Mensagem. Acertar uma pergunta na primeira tentativa vale o dobro.</p>' +
            '<ul class="gami-lista list-unstyled mb-0" data-g="conceitos"></ul>';
        alvo.appendChild(painel);
        painel.querySelector("[data-g=reiniciar]").addEventListener("click", function () {
            if (!window.confirm("Apagar os pontos e as conquistas deste capítulo?")) return;
            estado = { feitos: {} };
            conquistasAnunciadas = {};
            salvar();
            render();
        });
    }

    function iniciar() {
        regiaoAnuncio = document.createElement("div");
        regiaoAnuncio.className = "gami-brindes";
        regiaoAnuncio.setAttribute("aria-live", "polite");
        document.body.appendChild(regiaoAnuncio);

        document.querySelectorAll("[data-conceito]").forEach(function (sec) {
            conceitos.push({ id: sec.getAttribute("data-conceito"), titulo: sec.getAttribute("data-titulo") || sec.id, ancora: sec.id });
        });

        // Mini-quizzes: 10 pontos na primeira tentativa, 5 depois.
        var contagem = {};
        document.querySelectorAll(".mini-quiz").forEach(function (quiz) {
            var c = conceitoDe(quiz);
            contagem[c] = (contagem[c] || 0) + 1;
            var id = "quiz-" + c + "-" + contagem[c];
            quiz.setAttribute("data-quiz-id", id);
            declarar(id, 10, c, "Pergunta: " + (conceitos.find(function (x) { return x.id === c; }) || { titulo: "revisão" }).titulo);
        });
        document.addEventListener("redes:quiz", function (ev) {
            if (!ev.detail || !ev.detail.correto) return;
            var id = ev.detail.quiz.getAttribute("data-quiz-id");
            if (id) concluirItem(id, ev.detail.tentativas === 1 ? 10 : 5);
        });

        // Conceitos já dominados ao carregar não são anunciados de novo.
        conceitos.forEach(function (c) { if (conceitoDominado(c.id)) conquistasAnunciadas[c.id] = true; });

        var alvo = document.getElementById("painel-progresso");
        if (alvo) montarPainel(alvo);
        render();
        // Desafios das simulações são declarados durante a inicialização delas;
        // marca as conquistas existentes depois que todas forem declaradas.
        setTimeout(function () {
            conceitos.forEach(function (c) { if (conceitoDominado(c.id)) conquistasAnunciadas[c.id] = true; });
        }, 0);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();
}());
