/*
 * Registro central de simulações (SPEC.md, seção 4).
 *
 * No HTML:       <div data-sim="nome-da-simulacao"></div>
 * No JavaScript: Redes.registrar("nome-da-simulacao", function (raiz, util) { ... });
 *
 * Cada simulação monta o próprio DOM dentro de `raiz` e não depende de ids
 * globais, de modo que a mesma simulação pode aparecer mais de uma vez.
 */
(function () {
    "use strict";

    var Redes = window.Redes = window.Redes || {};
    var registros = {};
    var SVG_NS = "http://www.w3.org/2000/svg";

    Redes.registrar = function (nome, fn) {
        if (registros[nome]) console.warn("[Redes] simulação registrada duas vezes:", nome);
        registros[nome] = fn;
    };

    Redes.reduzMovimento = function () {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    };

    /* ---------- Utilitários de DOM ---------- */

    // el("button", {class: "btn", type: "button", onclick: fn}, "texto", outroNo)
    function el(tag, attrs) {
        var no = document.createElement(tag);
        aplicaAtributos(no, attrs);
        for (var i = 2; i < arguments.length; i++) anexa(no, arguments[i]);
        return no;
    }

    function svg(tag, attrs) {
        var no = document.createElementNS(SVG_NS, tag);
        aplicaAtributos(no, attrs);
        for (var i = 2; i < arguments.length; i++) anexa(no, arguments[i]);
        return no;
    }

    function aplicaAtributos(no, attrs) {
        if (!attrs) return;
        Object.keys(attrs).forEach(function (k) {
            var v = attrs[k];
            if (v === null || v === undefined || v === false) return;
            if (k.indexOf("on") === 0 && typeof v === "function") no.addEventListener(k.slice(2), v);
            else if (k === "text") no.textContent = v;
            else no.setAttribute(k, v === true ? "" : String(v));
        });
    }

    function anexa(no, filho) {
        if (filho === null || filho === undefined || filho === false) return;
        if (Array.isArray(filho)) { filho.forEach(function (f) { anexa(no, f); }); return; }
        no.appendChild(typeof filho === "string" || typeof filho === "number" ? document.createTextNode(String(filho)) : filho);
    }

    var contadorId = 0;
    function novoId(prefixo) { contadorId++; return (prefixo || "sim") + "-" + contadorId; }

    // Campo rotulado: devolve {linha, controle}
    function campo(rotulo, controle) {
        if (!controle.id) controle.id = novoId("campo");
        return el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-1", for: controle.id }, rotulo), controle);
    }

    function botao(texto, classe, onclick, rotuloAcessivel) {
        return el("button", { type: "button", class: "btn btn-sm " + (classe || "btn-primary"), onclick: onclick, "aria-label": rotuloAcessivel || null }, texto);
    }

    function feedback() {
        return el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
    }

    function marca(no, ok, texto) {
        no.className = "small mt-2 mb-0 " + (ok ? "quiz-ok" : "quiz-no");
        no.textContent = (ok ? "✔ " : "✘ ") + texto;
    }

    // Embaralhamento determinístico opcional (gerador simples com semente).
    function aleatorio(semente) {
        var s = semente === undefined ? Math.floor(Math.random() * 2147483647) : semente;
        return function () {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    /* ---------- Diagrama de sequência temporal ----------
     * Redes.diagramaSequencia({
     *   titulo: "texto do <title>",
     *   colunas: ["Origem", "Provedor", "Destino"],   // raias verticais
     *   eventos: [
     *     {de: 0, para: 2, rotulo: "DATA.req", tipo: "ok"|"perda"|"erro"|"dup"|"ctrl"|"tracejado", inclinacao: 1},
     *     {nota: 2, rotulo: "Conexão estabelecida"},          // texto ao lado de uma raia
     *     {espaco: 1}                                          // linha em branco
     *   ]
     * }) → elemento <svg>
     */
    Redes.diagramaSequencia = function (opcoes) {
        var colunas = opcoes.colunas;
        var largura = opcoes.largura || 640;
        var margem = opcoes.margem || 115;
        var passo = opcoes.passo || 34;
        var topo = 38;
        var xs = colunas.map(function (_, i) {
            return colunas.length === 1 ? largura / 2 : margem + i * (largura - 2 * margem) / (colunas.length - 1);
        });
        // Eventos com t0/t1 (ou t, para notas) usam posição absoluta no tempo, em unidades de `passo`;
        // isso permite mensagens que se cruzam (reordenação). Os demais são empilhados em sequência.
        var linhas = 0, maxAbs = 0;
        opcoes.eventos.forEach(function (ev) {
            if (ev.t0 !== undefined) maxAbs = Math.max(maxAbs, ev.t1 === undefined ? ev.t0 : ev.t1);
            else if (ev.t !== undefined) maxAbs = Math.max(maxAbs, ev.t + 1);
            else linhas += ev.espaco || (ev.inclinacao || 1);
        });
        var altura = topo + (Math.max(linhas, maxAbs) + 1) * passo + 10;

        var raiz = svg("svg", {
            viewBox: "0 0 " + largura + " " + altura,
            class: "seq-diagram w-100",
            role: "img",
            "aria-label": opcoes.titulo
        });
        raiz.appendChild(svg("title", { text: opcoes.titulo }));
        var idSeta = novoId("seta");
        raiz.appendChild(svg("defs", null,
            svg("marker", { id: idSeta, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
                svg("path", { d: "M0 0 L10 5 L0 10 z", class: "seq-arrowhead" }))));

        colunas.forEach(function (nome, i) {
            raiz.appendChild(svg("text", { x: xs[i], y: 20, "text-anchor": "middle", class: "seq-col" }, nome));
            raiz.appendChild(svg("line", { x1: xs[i], y1: 28, x2: xs[i], y2: altura - 6, class: "seq-lane" }));
        });

        var y = topo;
        opcoes.eventos.forEach(function (ev) {
            if (ev.espaco) { y += ev.espaco * passo; return; }
            if (ev.nota !== undefined) {
                var yNota = ev.t !== undefined ? topo + ev.t * passo : y;
                // Notas ficam do lado de dentro do diagrama: à direita da primeira raia, à esquerda da última.
                var lado = colunas.length === 1 ? "middle" : ev.nota === 0 ? "start" : ev.nota === colunas.length - 1 ? "end" : "middle";
                var dx = lado === "end" ? -8 : lado === "start" ? 8 : 0;
                raiz.appendChild(svg("text", { x: xs[ev.nota] + dx, y: yNota + passo / 2, "text-anchor": lado, class: "seq-note" + (ev.tipo ? " seq-" + ev.tipo : "") }, ev.rotulo));
                if (ev.t === undefined) y += passo;
                return;
            }
            var absoluto = ev.t0 !== undefined;
            var incl = ev.inclinacao || 1;
            var x1 = xs[ev.de], x2 = xs[ev.para];
            var y1 = absoluto ? topo + ev.t0 * passo + 6 : y + 6;
            var y2 = absoluto ? topo + (ev.t1 === undefined ? ev.t0 + 1 : ev.t1) * passo : y + incl * passo;
            var classe = "seq-msg seq-" + (ev.tipo || "ok");
            if (ev.tipo === "perda") {
                // A mensagem some no meio do caminho.
                var xm = x1 + (x2 - x1) * 0.55, ym = y1 + (y2 - y1) * 0.55;
                raiz.appendChild(svg("line", { x1: x1, y1: y1, x2: xm, y2: ym, class: classe }));
                raiz.appendChild(svg("text", { x: xm, y: ym + 5, "text-anchor": "middle", class: "seq-x" }, "✕"));
            } else {
                raiz.appendChild(svg("line", { x1: x1, y1: y1, x2: x2, y2: y2, class: classe, "marker-end": "url(#" + idSeta + ")" }));
            }
            // Em diagramas com setas que se cruzam (tempo absoluto), o rótulo fica perto da origem
            // para não colidir com o de outra seta no meio do caminho.
            var f = absoluto ? 0.3 : 0.5;
            var xr = x1 + (x2 - x1) * f, yr = y1 + (y2 - y1) * f - 6;
            raiz.appendChild(svg("text", { x: xr, y: yr, "text-anchor": "middle", class: "seq-label" }, ev.rotulo));
            if (ev.rotuloDestino) {
                var ladoD = x2 > x1 ? "start" : "end";
                raiz.appendChild(svg("text", { x: x2 + (x2 > x1 ? 8 : -8), y: y2 + 4, "text-anchor": ladoD, class: "seq-prim" }, ev.rotuloDestino));
            }
            if (ev.rotuloOrigem) {
                var ladoO = x2 > x1 ? "end" : "start";
                raiz.appendChild(svg("text", { x: x1 + (x2 > x1 ? -8 : 8), y: y1 + 4, "text-anchor": ladoO, class: "seq-prim" }, ev.rotuloOrigem));
            }
            if (!absoluto) y += incl * passo;
        });
        return raiz;
    };

    Redes.util = {
        el: el, svg: svg, campo: campo, botao: botao, feedback: feedback, marca: marca,
        novoId: novoId, aleatorio: aleatorio
    };

    function inicializar() {
        document.querySelectorAll("[data-sim]").forEach(function (raiz) {
            var nome = raiz.getAttribute("data-sim");
            var fn = registros[nome];
            if (!fn) { console.warn("[Redes] simulação sem registro:", nome); return; }
            if (raiz.dataset.simIniciada) return;
            raiz.dataset.simIniciada = "true";
            try { fn(raiz, Redes.util); }
            catch (erro) {
                console.error("[Redes] falha ao iniciar", nome, erro);
                raiz.textContent = "Não foi possível carregar esta simulação.";
            }
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicializar);
    else setTimeout(inicializar, 0);
}());
