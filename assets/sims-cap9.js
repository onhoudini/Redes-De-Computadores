/* Simulações do Capítulo 9 — A camada de aplicação (seção 3.1 do livro).
 * Cada uma é registrada em Redes.registrar. Os dados vêm dos exemplos do livro;
 * quando não vêm, usam nomes e endereços reservados para documentação (RFC 2606, RFC 3849, RFC 5737). */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function hex2(n) { return n.toString(16).padStart(2, "0"); }
    function hex4(n) { return n.toString(16).padStart(4, "0"); }
    function bin(n, largura) { return n.toString(2).padStart(largura, "0"); }
    function normaliza(s) { return String(s || "").trim().toLowerCase().replace(/\.$/, ""); }
    function faixa(rotulo, min, max, passo, valor) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor, id: u.novoId("faixa") });
        var mostra = el("span", { class: "fw-semibold" });
        var linha = el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id }, rotulo, mostra), input);
        return { input: input, mostra: mostra, linha: linha };
    }
    function entrada(valor, rotulo) {
        return el("input", { class: "form-control form-control-sm mono", value: valor || "", "aria-label": rotulo || null, spellcheck: "false", autocomplete: "off" });
    }

    /* ---------- IPv6: leitura e forma compacta ---------- */
    // Devolve os 8 grupos de 16 bits, ou null se o texto não for um endereço IPv6 válido.
    function leIPv6(texto) {
        var s = String(texto || "").trim().toLowerCase();
        if (!/^[0-9a-f:]+$/.test(s) || s.indexOf(":::") >= 0) return null;
        var partes = s.split("::");
        if (partes.length > 2) return null;
        function grupos(p) { return p === "" ? [] : p.split(":"); }
        var esq = grupos(partes[0]), dir = partes.length === 2 ? grupos(partes[1]) : [];
        var todos = esq.concat(dir);
        if (todos.some(function (g) { return !/^[0-9a-f]{1,4}$/.test(g); })) return null;
        var faltam = 8 - todos.length;
        if (partes.length === 1 && faltam !== 0) return null;
        if (partes.length === 2 && faltam < 1) return null;
        var zeros = [];
        for (var i = 0; i < faltam && partes.length === 2; i++) zeros.push("0");
        return esq.concat(zeros, dir).map(function (g) { return parseInt(g, 16); });
    }
    // Maior sequência de grupos nulos (a primeira, em caso de empate), com pelo menos 2 grupos (RFC 5952).
    function maiorSequenciaZero(g) {
        var melhor = { ini: -1, tam: 0 }, ini = -1;
        for (var i = 0; i <= 8; i++) {
            if (i < 8 && g[i] === 0) { if (ini < 0) ini = i; }
            else if (ini >= 0) {
                if (i - ini > melhor.tam) melhor = { ini: ini, tam: i - ini };
                ini = -1;
            }
        }
        return melhor.tam >= 2 ? melhor : { ini: -1, tam: 0 };
    }
    function compactaIPv6(g) {
        var z = maiorSequenciaZero(g);
        var txt = g.map(function (x) { return x.toString(16); });
        if (z.ini < 0) return txt.join(":");
        return txt.slice(0, z.ini).join(":") + "::" + txt.slice(z.ini + z.tam).join(":");
    }
    function completaIPv6(g) { return g.map(hex4).join(":"); }
    R.ipv6 = { le: leIPv6, compacta: compactaIPv6 };   // exposto para os testes automáticos

    /* ------------------------------------------------------------------
     * 1. Notação IPv6 (pág. 133–134 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("ipv6-compacto", function (raiz) {
        var campo = entrada("2001:db8:0:0:8:800:200c:417a", "Endereço IPv6");
        var grupos = el("div", { class: "d-flex flex-wrap mt-2", "aria-live": "polite" });
        var saida = el("pre", { class: "log mt-2 mb-0" });
        var tarefas = [
            ["fe80:0000:0000:0000:0219:e3ff:fed7:1204", "fe80::219:e3ff:fed7:1204"],
            ["2001:0db8:0000:0000:0001:0000:0000:0001", "2001:db8::1:0:0:1"],
            ["ff02:0:0:0:0:0:0:2", "ff02::2"]
        ];
        var concluir = R.desafio(raiz, "ipv6-compactar", 15, "Escrever três endereços IPv6 na forma compacta");
        var acertos = {};

        function mostra() {
            var g = leIPv6(campo.value);
            grupos.replaceChildren();
            if (!g) { saida.textContent = "Endereço inválido: use até 8 grupos de 1 a 4 dígitos hexadecimais, separados por dois-pontos, e no máximo um \"::\"."; return; }
            var z = maiorSequenciaZero(g);
            g.forEach(function (x, i) {
                var classe = i >= z.ini && i < z.ini + z.tam ? " ctrl" : x === 0 ? " muted" : "";
                grupos.append(el("span", { class: "byte-cell" + classe }, hex4(x), el("small", null, "grupo " + (i + 1))));
            });
            saida.textContent = "Forma completa: " + completaIPv6(g) + "\nForma compacta: " + compactaIPv6(g) +
                (z.tam ? "\n\"::\" substitui os grupos " + (z.ini + 1) + " a " + (z.ini + z.tam) + " (em amarelo), a maior sequência de zeros." : "\nNão há dois grupos nulos seguidos: nada a comprimir com \"::\".");
        }
        campo.addEventListener("input", mostra);

        var lista = el("ol", { class: "small mb-0 mt-2" });
        tarefas.forEach(function (t, i) {
            var resp = entrada("", "Forma compacta de " + t[0]);
            var fb = u.feedback();
            lista.append(el("li", { class: "mb-2" }, el("span", { class: "mono" }, t[0]),
                el("div", { class: "d-flex gap-2 mt-1" }, resp, u.botao("Conferir", "btn-outline-primary", function () {
                    var ok = normaliza(resp.value) === t[1];
                    if (ok) acertos[i] = true;
                    u.marca(fb, ok, ok ? "Certo: " + t[1] + "." : leIPv6(resp.value) && compactaIPv6(leIPv6(resp.value)) === t[1]
                        ? "É o mesmo endereço, mas não na forma compacta recomendada: tire os zeros à esquerda e use \"::\" na maior sequência de zeros (a primeira, se houver empate)."
                        : "Não confere. Escreva o endereço no campo de cima para ver os grupos.");
                    if (Object.keys(acertos).length === tarefas.length) concluir();
                })), fb));
        });

        raiz.append(u.campo("Digite um endereço IPv6 (completo ou com \"::\")", campo), grupos, saida,
            el("p", { class: "small fw-semibold mt-3 mb-0" }, "Desafio (15 pts): escreva a forma compacta de cada endereço."), lista);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 2. Fronteiras das mensagens: datagramas e fluxo de bytes
     *    (pág. 133–134 do PDF; as fronteiras são complemento)
     * ------------------------------------------------------------------ */
    function entregaFluxo(mensagens, tamLeitura) {
        var fluxo = mensagens.join(""), leituras = [];
        for (var i = 0; i < fluxo.length; i += tamLeitura) leituras.push(fluxo.slice(i, i + tamLeitura));
        return leituras;
    }
    R.entregaFluxo = entregaFluxo;

    R.registrar("fronteiras-mensagens", function (raiz) {
        var msgs = entrada("Oi|tudo|bem?", "Mensagens separadas por barra vertical");
        var leitura = el("input", { type: "number", class: "form-control form-control-sm", value: 3, min: 1, max: 40, step: 1 });
        var area = el("div", { class: "row g-2 mt-1", "aria-live": "polite" });
        function caixaLista(titulo, itens, classe) {
            return el("div", { class: "col-md-6" }, el("div", { class: "border rounded p-2 h-100" },
                el("p", { class: "small fw-semibold mb-1" }, titulo),
                itens.length ? el("div", { class: "d-flex flex-wrap gap-1" }, itens.map(function (t, i) {
                    return el("span", { class: "badge mono " + classe }, (i + 1) + ": “" + t + "”");
                })) : el("p", { class: "small text-muted mb-0" }, "nada a entregar")));
        }
        function desenha() {
            var lista = msgs.value.split("|").filter(function (m) { return m.length; });
            var t = Math.max(1, Math.min(40, Math.floor(Number(leitura.value) || 1)));
            area.replaceChildren(
                caixaLista("UDP (datagramas): uma mensagem por recepção", lista, "text-bg-primary"),
                caixaLista("TCP (fluxo de bytes): leituras de até " + t + " bytes", entregaFluxo(lista, t), "text-bg-success"),
                el("p", { class: "small col-12 mb-0" }, "Com datagramas, cada recepção devolve uma mensagem inteira. No fluxo de bytes, as mensagens viram uma sequência só (“" +
                    lista.join("") + "”), e cada leitura devolve o que houver, até o tamanho pedido. Quem marca onde cada mensagem termina é a aplicação."));
        }
        [msgs, leitura].forEach(function (c) { c.addEventListener("input", desenha); });
        var nLeituras = el("input", { type: "number", class: "form-control form-control-sm", min: 1, step: 1, "aria-label": "Número de leituras" });
        var segunda = entrada("", "Conteúdo da segunda leitura");
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "fronteiras-mensagens", 15, "Prever as leituras de um fluxo de bytes");
        raiz.append(
            el("p", { class: "small mb-2" }, "Escreva as mensagens de Alice separadas por | e escolha quantos bytes Bob pede em cada leitura. Use letras sem acento: cada uma ocupa um byte. A rede aqui não perde nada; o que muda é como as mensagens chegam."),
            el("div", { class: "row g-2" },
                el("div", { class: "col-md-8" }, u.campo("Mensagens de Alice", msgs)),
                el("div", { class: "col-md-4" }, u.campo("Bytes por leitura (TCP)", leitura))),
            area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): Alice manda, por TCP, “Oi”, “tudo” e “bem?”, e Bob lê de 3 em 3 bytes. Quantas leituras Bob faz, e o que a segunda devolve?"),
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("Leituras", nLeituras)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Segunda leitura", segunda)),
                el("div", { class: "col-12 col-md-3 d-flex align-items-end" }, u.botao("Conferir", "btn-primary", function () {
                    var txt = segunda.value.trim().replace(/^["“”']+|["“”']+$/g, "");
                    var ok = Number(nLeituras.value) === 4 && txt === "udo";
                    u.marca(fb, ok, ok ? "Isso: o fluxo é “Oitudobem?”, 10 bytes. As leituras devolvem “Oit”, “udo”, “bem” e “?”. Nenhuma coincide com uma mensagem de Alice." :
                        "Ainda não. Junte as três mensagens numa sequência só e corte de 3 em 3 caracteres; confira na simulação com essas mensagens.");
                    if (ok) concluir();
                }))), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 3. Endereços em texto e em bytes (pág. 133–134 do PDF)
     * ------------------------------------------------------------------ */
    function leIPv4(texto) {
        var s = String(texto || "").trim();
        if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return null;
        var b = s.split(".").map(Number);
        return b.every(function (x) { return x <= 255; }) ? b : null;
    }
    function bytesEndereco(texto) {
        var v4 = leIPv4(texto);
        if (v4) return { versao: 4, bytes: v4, inteiro: ((v4[0] * 256 + v4[1]) * 256 + v4[2]) * 256 + v4[3] };
        var g = leIPv6(texto);
        if (!g) return null;
        var b = [];
        g.forEach(function (x) { b.push(x >> 8, x & 255); });
        return { versao: 6, bytes: b, grupos: g, completa: completaIPv6(g), compacta: compactaIPv6(g) };
    }
    R.bytesEndereco = bytesEndereco;

    R.registrar("le-endereco", function (raiz) {
        var campo = entrada("203.0.113.56", "Endereço IPv4 ou IPv6");
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function linha(rotulo, valor) { return el("tr", null, el("th", { class: "small fw-normal text-muted" }, rotulo), el("td", { class: "mono small text-break" }, valor)); }
        function desenha() {
            var r = bytesEndereco(campo.value);
            if (!r) { area.replaceChildren(el("p", { class: "small text-danger mb-0" }, "Não é um endereço IPv4 (quatro números de 0 a 255) nem IPv6 válido.")); return; }
            var linhas = [linha("Versão", "IPv" + r.versao + " (" + r.bytes.length * 8 + " bits, " + r.bytes.length + " bytes)"),
                linha("Bytes em hexadecimal", r.bytes.map(hex2).join(" "))];
            if (r.versao === 4) {
                linhas.push(linha("Bytes em binário", r.bytes.map(function (x) { return bin(x, 8); }).join(" ")));
                linhas.push(linha("Como um inteiro de 32 bits", String(r.inteiro)));
            } else {
                linhas.push(linha("Forma completa", r.completa));
                linhas.push(linha("Forma compacta", r.compacta));
            }
            area.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm mb-0" }, el("tbody", null, linhas))));
        }
        campo.addEventListener("input", desenha);
        var exemplos = el("div", { class: "d-flex flex-wrap gap-1 mt-1" }, ["203.0.113.56", "2001:db8:3080:2:217:f2ff:fed6:65c0", "abcd:ef01:2345:6789:abcd:ef01:2345:6789", "fe80::219:e3ff:fed7:1204"].map(function (ex) {
            return u.botao(ex, "btn-outline-secondary btn-sm mono", function () { campo.value = ex; desenha(); }, "Usar o exemplo " + ex);
        }));
        var resp = el("input", { type: "text", class: "form-control form-control-sm mono", inputmode: "numeric", "aria-label": "Inteiro de 32 bits" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "le-endereco", 10, "Converter um endereço IPv4 em inteiro");
        raiz.append(el("p", { class: "small mb-2" }, "Digite um endereço IPv4 ou IPv6, ou escolha um dos exemplos do livro."),
            u.campo("Endereço", campo), exemplos, area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts): sem usar a simulação, calcule o valor de 203.0.113.56 como um único inteiro de 32 bits."),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = resp.value.replace(/[\s.]/g, "") === "3405803832";
                u.marca(fb, ok, ok ? "Isso: 203 × 16 777 216 + 0 × 65 536 + 113 × 256 + 56 = 3 405 803 832." : "Ainda não. Multiplique cada byte pela sua posição: o primeiro por 2^24, o segundo por 2^16, o terceiro por 2^8, e some o último.");
                if (ok) concluir();
            })), fb);
        desenha();
    });
}());
