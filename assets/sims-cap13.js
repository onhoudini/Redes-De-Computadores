/* Simulações do Capítulo 13 — Deixando o HTTP mais rápido (seção 3.5 do livro).
 * Cada uma é registrada em Redes.registrar. Os exemplos vêm do livro; os demais usam
 * nomes reservados para documentação (RFC 2606). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function hex2(n) { return n.toString(16).padStart(2, "0"); }
    function entrada(valor, rotulo) {
        return el("input", { class: "form-control form-control-sm mono", value: valor || "", "aria-label": rotulo || null, spellcheck: "false", autocomplete: "off" });
    }
    function faixa(rotulo, min, max, passo, valor, unidade) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor, id: u.novoId("faixa") });
        var mostra = el("span", { class: "fw-semibold" });
        function atualiza() { mostra.textContent = input.value + (unidade || ""); }
        input.addEventListener("input", atualiza);
        atualiza();
        var linha = el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id }, rotulo, mostra), input);
        return { input: input, mostra: mostra, linha: linha };
    }
    function caixa(rotulo, marcada) {
        var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: !!marcada });
        return { input: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, rotulo)) };
    }
    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }

    /* ---------- URI segundo a RFC 3986 (apêndice B) ---------- */
    var PORTAS = { http: 80, https: 443, ftp: 21, telnet: 23, ssh: 22 };
    function leURI(texto) {
        var m = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/.exec(String(texto || "").trim());
        if (!m) return null;
        var r = { esquema: m[2] || "", autoridade: m[4], caminho: m[5] || "", consulta: m[7], fragmento: m[9], usuario: undefined, host: undefined, porta: undefined };
        if (r.autoridade !== undefined) {
            var a = r.autoridade, arroba = a.lastIndexOf("@");
            if (arroba >= 0) { r.usuario = a.slice(0, arroba); a = a.slice(arroba + 1); }
            var mm = /^(\[[^\]]*\]|[^:]*)(:(\d*))?$/.exec(a);
            if (mm) { r.host = mm[1].replace(/^\[|\]$/g, ""); r.porta = mm[3]; }
            else r.host = a;
        }
        return r;
    }
    R.leURI = leURI;

    /* ------------------------------------------------------------------
     * 1. Dissecando uma URI (pág. 149–150 do PDF)
     * ------------------------------------------------------------------ */

    /* ------------------------------------------------------------------
     * 5. Proxy numa pequena empresa (pág. 159 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("proxy-cache", function (raiz) {
        var OBJ = { "jornal.example/": 120, "jornal.example/foto.jpg": 900, "tempo.example/": 60, "banco.example/": 200, "video.example/aula.mp4": 4000, "jornal.example/esporte": 150 };
        var nomes = Object.keys(OBJ);
        var sorteio = u.aleatorio(42);
        var PEDIDOS = [];
        var PESOS = [5, 4, 3, 2, 1, 2];
        for (var i = 0; i < 30; i++) {
            var x = sorteio() * 17, k = 0;
            while (x > PESOS[k]) { x -= PESOS[k]; k++; }
            PEDIDOS.push(nomes[k]);
        }
        var usaProxy = caixa("Usar o proxy da empresa", true);
        var tabela = el("div", { class: "small mt-2", "aria-live": "polite" });
        var fb = u.feedback(), feitos = {};
        var concluir = R.desafio(raiz, "proxy-economia", 10, "Comparar o tráfego no enlace lento com e sem proxy");
        function roda() {
            var cache = {}, pelo = 0, kb = 0, acertos = 0;
            PEDIDOS.forEach(function (p) {
                if (usaProxy.input.checked && cache[p]) { acertos++; return; }
                cache[p] = true; pelo++; kb += OBJ[p];
            });
            var segundos = kb * 8 / 2000;
            feitos[usaProxy.input.checked ? "com" : "sem"] = { pelo: pelo, kb: kb, s: segundos };
            tabela.replaceChildren(el("table", { class: "table table-sm mb-0" },
                el("thead", null, el("tr", null, el("th", null, ""), el("th", null, "Pedidos pelo enlace"), el("th", null, "kB pelo enlace"), el("th", null, "Tempo a 2 Mbit/s"))),
                el("tbody", null, ["sem", "com"].filter(function (m) { return feitos[m]; }).map(function (m) {
                    var f = feitos[m];
                    return el("tr", null, el("td", null, m === "com" ? "Com proxy" : "Sem proxy"), el("td", null, String(f.pelo) + " de 30"), el("td", null, num(f.kb)), el("td", null, num(f.s, 1) + " s"));
                }))));
            if (usaProxy.input.checked) fb.textContent = acertos + " dos 30 pedidos foram atendidos pelo cache do proxy, sem usar o enlace lento.";
            else fb.textContent = "Sem proxy, cada navegador busca tudo pelo enlace lento (o cache de cada navegador ajuda só a ele mesmo).";
            fb.className = "small mt-2 mb-0";
            if (feitos.com && feitos.sem) {
                var eco = Math.round(100 * (1 - feitos.com.kb / feitos.sem.kb));
                u.marca(fb, true, "Com o proxy, o enlace lento carrega " + eco + "% menos dados: a mesma página baixada por várias pessoas só passa uma vez.");
                concluir();
            }
        }
        raiz.append(el("p", { class: "small mb-2" }, "Doze funcionários fazem 30 pedidos durante a manhã. A empresa sai para a Internet por um enlace de 2 Mbit/s."),
            usaProxy.linha, u.botao("Rodar os 30 pedidos", "btn-primary mt-2", roda), tabela, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): rode os pedidos sem proxy e com proxy e compare."));
    });

    /* ------------------------------------------------------------------
     * 6. Pedidos em sequência contra pipelining (pág. 161–162 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("pipelining", function (raiz) {
        var modo = el("select", { class: "form-select form-select-sm" }, el("option", { value: "seq" }, "Um pedido de cada vez"), el("option", { value: "pipe" }, "Pipelining"));
        var area = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function desenha() {
            var ev = [];
            if (modo.value === "seq") {
                for (var i = 0; i < 5; i++) {
                    ev.push({ de: 0, para: 1, rotulo: "GET /obj" + (i + 1), t0: i * 3, t1: i * 3 + 1.5 });
                    ev.push({ de: 1, para: 0, rotulo: "objeto " + (i + 1), t0: i * 3 + 1.5, t1: i * 3 + 3 });
                }
                ev.push({ nota: 0, rotulo: "1000 ms", t: 14.5 });
                resumo.textContent = "Cada pedido espera a resposta anterior: 5 × 200 ms = 1000 ms (o exemplo do livro: 100 ms em cada sentido, 1 Gbit/s, objetos de 100 bytes).";
            } else {
                for (var j = 0; j < 5; j++) ev.push({ de: 0, para: 1, rotulo: "GET /obj" + (j + 1), t0: j * 0.45, t1: j * 0.45 + 1.5 });
                for (var k = 0; k < 5; k++) ev.push({ de: 1, para: 0, rotulo: "objeto " + (k + 1), t0: 1.5 + k * 0.45, t1: 3 + k * 0.45 });
                ev.push({ nota: 0, rotulo: "≈ 200 ms", t: 4.5 });
                resumo.textContent = "Os cinco pedidos saem juntos, e as respostas chegam uma atrás da outra: cerca de 200 ms no total, cinco vezes menos.";
            }
            area.replaceChildren(R.diagramaSequencia({ titulo: modo.value === "seq" ? "Cinco pedidos HTTP, um de cada vez." : "Cinco pedidos HTTP com pipelining.", colunas: ["Cliente", "Servidor"], eventos: ev, passo: 22, margem: 150 }));
        }
        modo.addEventListener("change", desenha);
        raiz.append(u.campo("Modo", modo), area, resumo);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 7. Quadros do HTTP/2 e o bloqueio do primeiro da fila (pág. 162–164 do PDF)
     * ------------------------------------------------------------------ */
    function agendaHttp2(f, cabecalho) {
        var LONGO = 12500, CURTO = 125, H = cabecalho ? 9 : 0, quadros = [];
        var restaLongo = LONGO;
        var primeiro = Math.min(f, restaLongo);
        quadros.push({ obj: "longo", bytes: primeiro }); restaLongo -= primeiro;
        var restaCurto = CURTO;
        while (restaCurto > 0) { var c = Math.min(f, restaCurto); quadros.push({ obj: "curto", bytes: c }); restaCurto -= c; }
        while (restaLongo > 0) { var l = Math.min(f, restaLongo); quadros.push({ obj: "longo", bytes: l }); restaLongo -= l; }
        var t = 0, chegadaCurto = 0, cab = 0, total = 0;
        quadros.forEach(function (q) {
            q.inicio = t; t += (q.bytes + H) * 8 / 1e6; q.fim = t;
            cab += H; total += q.bytes + H;
            if (q.obj === "curto") chegadaCurto = t;
        });
        return { quadros: quadros, curto: chegadaCurto * 1000, fim: t * 1000, custo: total ? 100 * cab / total : 0 };
    }
    R.agendaHttp2 = agendaHttp2;

    R.registrar("hol-http2", function (raiz) {
        var f = faixa("Tamanho máximo do quadro (bytes de dados)", 100, 12500, 50, 12500, " bytes");
        var cab = caixa("Contar o cabeçalho de 9 bytes de cada quadro", true);
        var barra = el("div", { class: "d-flex mt-2", style: "height:28px;border:1px solid var(--line);border-radius:6px;overflow:hidden", role: "img" });
        var resumo = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "http2-quadro", 15, "Escolher um tamanho de quadro para o HTTP/2");
        function desenha() {
            var a = agendaHttp2(Number(f.input.value), cab.input.checked);
            barra.replaceChildren();
            barra.setAttribute("aria-label", a.quadros.length + " quadros; o objeto curto chega em " + num(a.curto, 1) + " ms.");
            a.quadros.forEach(function (q) {
                var largura = 100 * (q.fim - q.inicio) / (a.fim / 1000);
                barra.append(el("div", { title: q.obj + ": " + q.bytes + " bytes", style: "width:" + largura + "%;border-right:1px solid var(--bs-body-bg, #fff);background:" + (q.obj === "curto" ? "#d63384" : "#2f80ed") }));
            });
            resumo.replaceChildren(el("span", { style: "color:#2f80ed", "aria-hidden": "true" }, "■"), " objeto longo (12 500 bytes)  ", el("span", { style: "color:#d63384", "aria-hidden": "true" }, "■"), " objeto curto (125 bytes) · ",
                a.quadros.length + " quadros · o objeto curto chega em ", el("strong", null, num(a.curto, 1) + " ms"), " · cabeçalhos = ", el("strong", null, num(a.custo, 2) + "%"), " dos bytes enviados (1 Mbit/s).");
        }
        [f.input, cab.input].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        function confere() {
            var a = agendaHttp2(Number(f.input.value), true);
            var ok = a.curto <= 12 && a.custo < 1;
            u.marca(fb, ok, ok ? "Equilíbrio encontrado: o curto chega em " + num(a.curto, 1) + " ms e os cabeçalhos custam " + num(a.custo, 2) + "%."
                : a.curto > 12 ? "O objeto curto ainda espera demais (" + num(a.curto, 1) + " ms): diminua o quadro." : "Quadros pequenos demais: os cabeçalhos já custam " + num(a.custo, 2) + "%. Aumente o quadro.");
            if (ok) concluir();
        }
        raiz.append(f.linha, cab.linha, barra, resumo,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): com o cabeçalho de 9 bytes contado, escolha um tamanho de quadro em que o objeto curto chegue em até 12 ms e os cabeçalhos custem menos de 1% dos bytes."),
            u.botao("Conferir", "btn-primary", confere), fb);
        desenha();
    });
}());
