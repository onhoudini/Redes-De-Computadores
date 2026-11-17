/* Simulações do Capítulo 17 — Protegendo o DNS: DNSSEC (seção 3.9 do livro).
 * Cada uma é registrada em Redes.registrar. A criptografia aqui é ilustrativa: os "MACs", resumos
 * e assinaturas usam uma função simples (FNV-1a), suficiente para mostrar o mecanismo, mas sem segurança. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function entrada(valor, rotulo) {
        return el("input", { class: "form-control form-control-sm mono", value: valor || "", "aria-label": rotulo || null, spellcheck: "false", autocomplete: "off" });
    }
    function caixa(rotulo, marcada) {
        var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: !!marcada });
        return { input: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, rotulo)) };
    }
    function faixa(rotulo, min, max, passo, valor, formata) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor, id: u.novoId("faixa") });
        var mostra = el("span", { class: "fw-semibold" });
        function atualiza() { mostra.textContent = formata ? formata(Number(input.value)) : input.value; }
        input.addEventListener("input", atualiza);
        atualiza();
        return { input: input, mostra: mostra, linha: el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id }, rotulo, mostra), input) };
    }
    // Resumo didático (FNV-1a de 32 bits), só para ilustrar MACs e resumos.
    function resumo(texto) {
        var h = 0x811c9dc5;
        var b = new TextEncoder().encode(String(texto));
        for (var i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
        return h.toString(16).padStart(8, "0");
    }
    R.resumoDidatico = resumo;
    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }

    /* ------------------------------------------------------------------
     * 1. telnet contra ssh: o que Eve vê (pág. 169 do PDF)
     * ------------------------------------------------------------------ */

    /* ------------------------------------------------------------------
     * 7. Envenenamento de cache do DNS (pág. 181–182 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("envenenamento-dns", function (raiz) {
        var k = faixa("Respostas falsas que Mallory consegue enviar a cada consulta de Alice", 0, 16, 1, 10, function (v) { return num(Math.pow(2, v)); });
        var t = faixa("Consultas que Mallory consegue provocar", 1, 1000, 1, 1, function (v) { return num(v); });
        var porta = caixa("Alice sorteia a porta de origem de cada consulta", false);
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        function desenha() {
            var K = Math.pow(2, Number(k.input.value)), N = Number(t.input.value);
            var espaco = porta.input.checked ? Math.pow(2, 32) : Math.pow(2, 16);
            var p1 = Math.min(1, K / espaco), pn = 1 - Math.pow(1 - p1, N);
            saida.replaceChildren(
                el("div", null, "Combinações a adivinhar: ", el("strong", null, porta.input.checked ? "2^16 IDs × 2^16 portas ≈ 4,3 bilhões" : "2^16 = 65 536 IDs")),
                el("div", null, "Chance de envenenar numa consulta: ", el("strong", null, (100 * p1).toLocaleString("pt-BR", { maximumSignificantDigits: 3 }) + "%")),
                el("div", null, "Chance em " + num(N) + " consulta(s): ", el("strong", null, (100 * pn).toLocaleString("pt-BR", { maximumSignificantDigits: 3 }) + "%")),
                el("div", { class: "progress mt-1", style: "height:10px", role: "img", "aria-label": "Chance acumulada" }, el("div", { class: "progress-bar bg-danger", style: "width:" + (100 * pn) + "%" })));
        }
        [k.input, t.input, porta.input].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var resp = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Número de respostas falsas" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dns-envenenamento", 10, "Calcular o esforço do envenenamento de cache");
        raiz.append(k.linha, t.linha, porta.linha, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): com a porta fixa, quantas respostas falsas Mallory precisa enviar para ter 50% de chance numa única consulta?"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = Number(resp.value) === 32768;
                u.marca(fb, ok, ok ? "Isso: metade dos 65 536 identificadores. Com a porta sorteada, a mesma chance exigiria mais de 2 bilhões." : "Ainda não. Quantos IDs diferentes existem, e que fração deles Mallory precisa cobrir?");
                if (ok) concluir();
            })), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 8. A cadeia de confiança do DNSSEC (pág. 183–184 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("cadeia-dnssec", function (raiz) {
        var ataque = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "nada" }, "Nenhum ataque"),
            el("option", { value: "aaaa" }, "Mallory troca o endereço do AAAA de www.example.org"),
            el("option", { value: "chave" }, "Mallory troca a DNSKEY de example.org pela dele"),
            el("option", { value: "ds" }, "Mallory troca a DNSKEY de example.org e o DS guardado em .org"));
        var lista = el("ol", { class: "small mt-2 mb-0" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "dnssec-cadeia", 15, "Ver onde a cadeia do DNSSEC quebra em cada ataque");
        function verifica() {
            var a = ataque.value;
            var chaveEx = a === "chave" || a === "ds" ? "chave-de-mallory" : "chave-example.org";
            var dsEmOrg = a === "ds" ? resumo("chave-de-mallory") : resumo("chave-example.org");
            var endereco = a === "aaaa" ? "203.0.113.66 (de Mallory)" : "2001:db8::80";
            var passos = [
                ["Âncora de confiança: a resolvedora já tem a DNSKEY da raiz, obtida fora do DNS.", true],
                ["DS de .org, na raiz, com RRSIG feita pela chave da raiz.", true],
                ["DNSKEY de .org confere com o resumo do DS: " + resumo("chave-org") + ".", true],
                ["DS de example.org, em .org, com RRSIG feita pela chave de .org.", a !== "ds", "a assinatura de .org não confere com o DS trocado, e Mallory não tem a chave privada de .org"],
                ["DNSKEY de example.org confere com o resumo do DS: resumo(" + chaveEx + ") = " + resumo(chaveEx) + " · DS = " + dsEmOrg + ".", a !== "chave" && a !== "ds", "o resumo da chave recebida é diferente do DS"],
                ["AAAA de www.example.org = " + endereco + ", com RRSIG feita pela chave de example.org.", a !== "aaaa", "a assinatura cobre o endereço original, e Mallory não tem a chave privada de example.org"]
            ];
            lista.replaceChildren();
            var quebrou = false;
            passos.forEach(function (p) {
                if (quebrou) { lista.append(el("li", { class: "text-muted" }, p[0] + " (não verificado)")); return; }
                lista.append(el("li", { class: p[1] ? "" : "text-danger" }, (p[1] ? "✔ " : "✘ ") + p[0] + (p[1] ? "" : " Falha: " + p[2] + ".")));
                if (!p[1]) quebrou = true;
            });
            if (a === "nada") u.marca(fb, true, "A cadeia DS → DNSKEY vai da raiz até o registro: a resposta é autêntica.");
            else { vistos[a] = true; u.marca(fb, true, "A resolvedora rejeita a resposta: a cadeia quebra no passo marcado."); }
            if (vistos.aaaa && vistos.chave && vistos.ds) { concluir(); fb.textContent += " Os três ataques foram barrados."; }
        }
        raiz.append(u.campo("Ataque", ataque), u.botao("Validar www.example.org AAAA", "btn-primary", verifica), lista, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Resumos e assinaturas simplificados, só para mostrar a cadeia. Desafio (15 pts): rode os três ataques e veja onde cada um é barrado."));
        verifica();
    });

    /* ------------------------------------------------------------------
     * 9. NSEC: provando que um nome não existe (pág. 184–185 do PDF)
     * ------------------------------------------------------------------ */
    function chaveCanonica(nome) { return nome.toLowerCase().replace(/\.$/, "").split(".").reverse(); }
    function compara(a, b) {
        var x = chaveCanonica(a), y = chaveCanonica(b);
        for (var i = 0; i < Math.min(x.length, y.length); i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; }
        return x.length - y.length;
    }
    function nsecQueCobre(zona, nome) {
        var z = zona.slice().sort(compara);
        if (z.some(function (n) { return compara(n, nome) === 0; })) return null;
        for (var i = 0; i < z.length; i++) {
            var dono = z[i], prox = z[(i + 1) % z.length];
            var depois = compara(dono, nome) < 0, antes = compara(nome, prox) < 0, volta = compara(prox, dono) <= 0;
            if ((depois && antes) || (volta && (depois || antes))) return { dono: dono, prox: prox };
        }
        return null;
    }
    R.nsecQueCobre = nsecQueCobre;

    R.registrar("nsec", function (raiz) {
        var zona = ["alpha.example.org", "beta.example.org", "gamma.example.org"];
        var consulta = entrada("delta.example.org", "Nome consultado");
        var registros = el("pre", { class: "log mt-2 mb-0" });
        var resposta = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        registros.textContent = zona.map(function (n, i) { return n + " NSEC " + zona[(i + 1) % zona.length]; }).join("\n");
        function responde() {
            var q = consulta.value.trim().toLowerCase();
            if (!q) return;
            var c = nsecQueCobre(zona, q);
            resposta.replaceChildren(c ? el("span", null, "Não existe. O servidor devolve, já assinado: ", el("strong", { class: "mono" }, c.dono + " NSEC " + c.prox), " — entre esses dois nomes não há outro.")
                : el("span", null, q + " existe na zona: o servidor devolve os registros dele."));
        }
        consulta.addEventListener("input", responde);
        var perguntas = [["delta.example.org", "beta.example.org"], ["pi.example.org", "gamma.example.org"], ["aaa.example.org", "gamma.example.org"]];
        var selects = perguntas.map(function (p) {
            return el("select", { class: "form-select form-select-sm", "aria-label": "Registro NSEC que prova que " + p[0] + " não existe" },
                el("option", { value: "" }, "escolha…"), zona.map(function (n, i) { return el("option", { value: n }, n + " NSEC " + zona[(i + 1) % zona.length]); }));
        });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dnssec-nsec", 15, "Escolher o NSEC que prova a inexistência de um nome");
        var passeio = el("p", { class: "small mt-2 mb-0" });
        raiz.append(el("div", { class: "small text-muted" }, "Os registros NSEC da zona do livro (pág. 184 do PDF)"), registros,
            u.campo("Consulte um nome", consulta), resposta,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): qual registro NSEC prova que cada nome não existe?"),
            el("div", null, perguntas.map(function (p, i) { return el("div", { class: "row g-2 align-items-center mb-1" }, el("div", { class: "col-sm-5 mono small" }, p[0]), el("div", { class: "col-sm-7" }, selects[i])); })),
            u.botao("Conferir", "btn-primary mt-1", function () {
                var certas = perguntas.filter(function (p, i) { return selects[i].value === p[1]; }).length;
                u.marca(fb, certas === 3, certas === 3 ? "Os três certos. aaa.example.org viria antes de alpha: é o último NSEC, que dá a volta, que o cobre." : certas + " de 3 certos. Ordene os nomes e veja entre quais dois cada consulta cairia.");
                if (certas === 3) concluir();
            }), fb,
            u.botao("Seguir os NSEC a partir de alpha", "btn-outline-secondary btn-sm mt-2", function () {
                passeio.textContent = "Seguindo cada NSEC até voltar ao início: " + zona.join(" → ") + " → alpha.example.org. Qualquer um pode listar a zona inteira assim (complemento: o NSEC3 dificulta isso).";
            }), passeio);
        responde();
    });
}());
