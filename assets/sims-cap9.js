/* Simulações do Capítulo 9 — DNS e correio eletrônico (seções 3.1 a 3.3 do livro).
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
     * 2. Cabeçalho DNS de 12 bytes (Fig. 3, pág. 135 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("cabecalho-dns", function (raiz) {
        var id = el("input", { type: "number", class: "form-control form-control-sm", min: 0, max: 65535, value: 4660 });
        var qr = el("select", { class: "form-select form-select-sm" }, el("option", { value: "0" }, "0 — consulta"), el("option", { value: "1" }, "1 — resposta"));
        var opcode = el("select", { class: "form-select form-select-sm" }, el("option", { value: "0" }, "0 — consulta padrão"), el("option", { value: "5" }, "5 — atualização (UPDATE)"));
        var rcode = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "0" }, "0 — sem erro"), el("option", { value: "2" }, "2 — falha do servidor"),
            el("option", { value: "3" }, "3 — nome não existe"), el("option", { value: "5" }, "5 — recusado"));
        var bits = {};
        var caixas = el("div", { class: "d-flex flex-wrap gap-3 mb-2" });
        [["AA", "autoridade"], ["TC", "truncada"], ["RD", "recursão desejada"], ["RA", "recursão disponível"]].forEach(function (b) {
            var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("dns") });
            bits[b[0]] = c;
            caixas.append(el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, b[0] + " (" + b[1] + ")")));
        });
        var contadores = {};
        var linhaCont = el("div", { class: "row g-2" });
        [["QD", "Question"], ["AN", "Answer"], ["NS", "Authority"], ["AR", "Additional"]].forEach(function (c) {
            var inp = el("input", { type: "number", class: "form-control form-control-sm", min: 0, max: 65535, value: c[0] === "QD" ? 1 : 0 });
            contadores[c[0]] = inp;
            linhaCont.append(el("div", { class: "col-6 col-md-3" }, u.campo(c[0] + "COUNT (" + c[1] + ")", inp)));
        });
        var bytes = el("div", { class: "d-flex flex-wrap mt-2" });
        var detalhe = el("pre", { class: "log mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var metas = [
            { nome: "consulta recursiva de um cliente (1 pergunta)", flags: 0x0100, cont: [1, 0, 0, 0] },
            { nome: "resposta da Fig. 5 do livro (flags qr rd ra; 1, 1, 6 e 11 registros)", flags: 0x8180, cont: [1, 1, 6, 11] }
        ];
        var feitas = {};
        var listaMetas = el("ul", { class: "small mb-2" });
        var concluir = R.desafio(raiz, "dns-cabecalho", 15, "Montar o cabeçalho de uma consulta e de uma resposta DNS");

        function inteiro(inp, max) { var v = Math.floor(Number(inp.value)); return isFinite(v) ? Math.max(0, Math.min(max, v)) : 0; }
        function flags() {
            return (Number(qr.value) << 15) | (Number(opcode.value) << 11) | (bits.AA.checked ? 1 << 10 : 0) | (bits.TC.checked ? 1 << 9 : 0) |
                (bits.RD.checked ? 1 << 8 : 0) | (bits.RA.checked ? 1 << 7 : 0) | Number(rcode.value);
        }
        function contagens() { return ["QD", "AN", "NS", "AR"].map(function (k) { return inteiro(contadores[k], 65535); }); }
        function desenhaMetas() {
            listaMetas.replaceChildren();
            metas.forEach(function (m, i) { listaMetas.append(el("li", null, (feitas[i] ? "✔ " : "○ ") + m.nome)); });
        }
        function mostra() {
            var f = flags(), c = contagens(), ident = inteiro(id, 65535);
            var palavras = [ident, f].concat(c);
            var nomes = ["ID", "flags", "QDCOUNT", "ANCOUNT", "NSCOUNT", "ARCOUNT"];
            bytes.replaceChildren();
            palavras.forEach(function (w, i) {
                var classe = i === 0 ? "" : i === 1 ? " ctrl" : " ok";
                bytes.append(el("span", { class: "byte-cell" + classe }, hex2(w >> 8) + " " + hex2(w & 255), el("small", null, nomes[i])));
            });
            var b = bin(f, 16);
            var cols = [["QR", b[0]], ["Opcode", b.slice(1, 5)], ["AA", b[5]], ["TC", b[6]], ["RD", b[7]], ["RA", b[8]], ["Z", b.slice(9, 12)], ["RCODE", b.slice(12)]];
            var l1 = "", l2 = "";
            cols.forEach(function (c) { var larg = Math.max(c[0].length, c[1].length) + 2; l1 += c[0].padEnd(larg); l2 += c[1].padEnd(larg); });
            detalhe.textContent = "flags = 0x" + hex4(f) + " = " + b + "\n" + l1 + "\n" + l2 + "\n" +
                "12 bytes: " + palavras.map(function (w) { return hex2(w >> 8) + " " + hex2(w & 255); }).join(" ");
        }
        function confere() {
            var f = flags(), c = contagens(), achou = -1;
            metas.forEach(function (m, i) { if (m.flags === f && m.cont.every(function (v, j) { return v === c[j]; })) achou = i; });
            if (achou < 0) {
                u.marca(fb, false, "Este cabeçalho não corresponde a nenhuma das metas. Confira QR, os bits e os quatro contadores.");
                return;
            }
            feitas[achou] = true;
            desenhaMetas();
            u.marca(fb, true, "Confere com a meta \"" + metas[achou].nome + "\": flags 0x" + hex4(f) + ".");
            if (feitas[0] && feitas[1]) concluir();
        }
        [id, qr, opcode, rcode].concat(Object.keys(bits).map(function (k) { return bits[k]; }), Object.keys(contadores).map(function (k) { return contadores[k]; }))
            .forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });

        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-3" }, u.campo("Transaction ID", id)),
                el("div", { class: "col-6 col-md-3" }, u.campo("QR", qr)),
                el("div", { class: "col-6 col-md-3" }, u.campo("Opcode", opcode)),
                el("div", { class: "col-6 col-md-3" }, u.campo("RCODE", rcode))),
            caixas, linhaCont, bytes, detalhe,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): monte os dois cabeçalhos abaixo (o ID pode ser qualquer um) e clique em Conferir."),
            listaMetas, u.botao("Conferir", "btn-primary", confere), fb);
        desenhaMetas();
        mostra();
    });

    /* ------------------------------------------------------------------
     * 3. TTL e cache do resolvedor (pág. 132 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("cache-ttl", function (raiz) {
        var ttl = faixa("TTL que o servidor autoritativo põe nas respostas", 30, 3600, 30, 3600);
        var relogio = 0, cache = null, proximo = 0, historico = [];
        var POOL = ["203.0.113.10", "203.0.113.11", "203.0.113.12", "203.0.113.13"];
        var estado = el("div", { class: "small mt-2", "aria-live": "polite" });
        var log = el("ul", { class: "log mt-2" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dns-ttl", 15, "Distribuir clientes entre servidores com um TTL curto");

        function texto(s) { var m = Math.floor(s / 60), r = s % 60; return m ? m + " min" + (r ? " " + r + " s" : "") : r + " s"; }
        function desenha() {
            ttl.mostra.textContent = texto(Number(ttl.input.value));
            var resta = cache ? cache.expira - relogio : 0;
            estado.replaceChildren(
                el("div", null, "Relógio: ", el("strong", null, "t = " + texto(relogio))),
                el("div", null, "Cache do resolvedor: ", cache && resta > 0
                    ? el("span", { class: "mono" }, "www.loja.example AAAA → " + cache.endereco + " (expira em " + texto(resta) + ")")
                    : el("span", { class: "text-muted" }, "vazio ou expirado")));
        }
        function registra(linha, classe) { log.prepend(el("li", { class: classe || null }, linha)); }
        function consulta() {
            var hit = cache && cache.expira > relogio;
            if (!hit) {
                var end = POOL[proximo % POOL.length];
                proximo++;
                cache = { endereco: end, expira: relogio + Number(ttl.input.value) };
                registra("t = " + texto(relogio) + ": falta no cache → o resolvedor pergunta ao autoritativo, que indica o servidor menos carregado: " + end + " (TTL " + texto(Number(ttl.input.value)) + ")");
            } else {
                registra("t = " + texto(relogio) + ": acerto no cache → " + cache.endereco + " (o autoritativo nem fica sabendo)");
            }
            historico.push({ t: relogio, end: cache.endereco });
            var janela = historico.filter(function (h) { return h.t >= relogio - 300; });
            var distintos = {};
            janela.forEach(function (h) { distintos[h.end] = true; });
            var n = Object.keys(distintos).length;
            if (n >= 3) { u.marca(fb, true, "Em 5 minutos, os clientes foram mandados para " + n + " servidores diferentes. TTL curto = mais consultas ao autoritativo, mas mais controle sobre a carga."); concluir(); }
            else fb.textContent = "Servidores diferentes entregues nos últimos 5 minutos: " + n + ".";
            desenha();
        }
        function avanca() { relogio += 60; registra("… passam 60 s", "text-muted"); desenha(); }
        function reinicia() { relogio = 0; cache = null; proximo = 0; historico = []; log.replaceChildren(); fb.textContent = ""; desenha(); }
        ttl.input.addEventListener("input", desenha);

        raiz.append(ttl.linha,
            el("div", { class: "d-flex flex-wrap gap-2" },
                u.botao("Um cliente consulta www.loja.example", "btn-primary", consulta),
                u.botao("Avançar 60 s", "btn-outline-secondary", avanca),
                u.botao("Recomeçar", "btn-outline-secondary", reinicia)),
            estado, log, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça os clientes serem mandados para 3 servidores diferentes dentro de 5 minutos de relógio. Com o TTL de 1 hora, dá?"));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 4. DNS reverso: in-addr.arpa e ip6.arpa (pág. 133 do PDF)
     * ------------------------------------------------------------------ */
    function nomeReverso(texto) {
        var s = String(texto || "").trim();
        var m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (m) {
            var n = m.slice(1).map(Number);
            if (n.some(function (x) { return x > 255; })) return null;
            return { tipo: 4, partes: n.map(String), nome: n.slice().reverse().join(".") + ".in-addr.arpa" };
        }
        var g = leIPv6(s);
        if (!g) return null;
        var nibbles = g.map(hex4).join("").split("");
        return { tipo: 6, partes: nibbles, nome: nibbles.slice().reverse().join(".") + ".ip6.arpa" };
    }
    R.nomeReverso = nomeReverso;

    R.registrar("nome-reverso", function (raiz) {
        var campo = entrada("2001:1890:123a::1:1e", "Endereço IP");
        var pecas = el("div", { class: "d-flex flex-wrap mt-2" });
        var saida = el("pre", { class: "log mt-2 mb-0", "aria-live": "polite" });
        function mostra() {
            var r = nomeReverso(campo.value);
            pecas.replaceChildren();
            if (!r) { saida.textContent = "Digite um endereço IPv4 (ex.: 192.0.2.11) ou IPv6."; return; }
            r.partes.slice().reverse().forEach(function (p, i) {
                pecas.append(el("span", { class: "byte-cell" + (i === 0 ? " ctrl" : ""), style: "min-width:" + (r.tipo === 4 ? "2.6rem" : "1.4rem") }, p));
            });
            saida.textContent = "Pergunta PTR para:\n" + r.nome + "\n" + (r.tipo === 4
                ? "Os 4 bytes do endereço aparecem em ordem inversa (o último byte primeiro)."
                : "São 32 nibbles (4 bits cada), do menos significativo (em amarelo) ao mais significativo.");
        }
        campo.addEventListener("input", mostra);

        var r4 = entrada("", "Nome PTR de 198.51.100.7"), r6 = entrada("", "Quatro primeiros rótulos para 2001:db8::abcd");
        var fb = u.feedback(), feitas = {};
        var concluir = R.desafio(raiz, "dns-reverso", 10, "Escrever nomes do DNS reverso");
        function confere() {
            var ok4 = normaliza(r4.value) === "7.100.51.198.in-addr.arpa";
            var ok6 = normaliza(r6.value) === "d.c.b.a";
            if (ok4) feitas.v4 = true;
            if (ok6) feitas.v6 = true;
            if (feitas.v4 && feitas.v6) { u.marca(fb, true, "Os dois conferem."); concluir(); }
            else u.marca(fb, false, (ok4 ? "O IPv4 está certo. " : "Confira o IPv4: inverta os 4 bytes e acrescente in-addr.arpa. ") +
                (ok6 ? "O IPv6 está certo." : "Confira o IPv6: o último grupo é abcd, e o primeiro rótulo é o último nibble."));
        }
        raiz.append(u.campo("Endereço (IPv4 ou IPv6)", campo), pecas, saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (10 pts)"),
            u.campo("Nome PTR completo de 198.51.100.7", r4),
            u.campo("Os quatro primeiros rótulos do nome PTR de 2001:db8::abcd (separados por pontos)", r6),
            u.botao("Conferir", "btn-primary", confere), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 5. Seguindo as linhas Received: (pág. 136 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("rastreia-received", function (raiz) {
        // Linhas do cabeçalho do livro, de cima para baixo (a de cima foi acrescentada por último).
        var LINHAS = [
            { from: "smtp3.sgsi.ucl.ac.be", by: "mmp.sipr-dc.ucl.ac.be", data: "11:37:17 +0100", utc: "10:37:17" },
            { from: "mail.ietf.org", by: "smtp3.sgsi.ucl.ac.be", data: "11:36:51 +0100", utc: "10:36:51" },
            { from: "localhost [127.0.0.1]", by: "core3.amsl.com", data: "02:36:38 -0800", utc: "10:36:38" },
            { from: "localhost [127.0.0.1]", by: "core3.amsl.com", data: "02:36:37 -0800", utc: "10:36:37" },
            { from: "mail.ietf.org", by: "localhost (core3.amsl.com, filtro amavisd-new)", data: "02:36:36 -0800", utc: "10:36:36" },
            { from: "gair.firstpr.com.au", by: "core3.amsl.com", data: "02:36:35 -0800", utc: "10:36:35" },
            { from: "[10.0.0.6] (wira.firstpr.com.au)", by: "gair.firstpr.com.au", data: "21:36:37 +1100", utc: "10:36:37" }
        ];
        var ordemCerta = [6, 5, 4, 3, 2, 1, 0];
        var embaralhada = [3, 0, 5, 2, 6, 1, 4];
        var escolhidas = [];
        var lista = el("div", { class: "ordem-lista", role: "list" });
        var caminho = el("ol", { class: "small mt-2 mb-0" });
        var fb = u.feedback();
        var tabela = el("div", { class: "mt-2" });
        var concluir = R.desafio(raiz, "received-caminho", 15, "Reconstruir o caminho de uma mensagem pelas linhas Received:");

        function desenha() {
            lista.replaceChildren();
            embaralhada.forEach(function (i) {
                var L = LINHAS[i], usada = escolhidas.indexOf(i) >= 0;
                lista.append(el("div", { class: "ordem-item", role: "listitem" },
                    el("span", { class: "mono" }, "Received: from " + L.from + " by " + L.by + "; 08 Mar 2010 " + L.data),
                    u.botao(usada ? "✔" : "Próximo salto", usada ? "btn-success" : "btn-outline-primary", function () { escolhe(i); }, usada ? "Já escolhida" : "Escolher como próximo salto: de " + L.from + " para " + L.by)));
            });
            caminho.replaceChildren();
            escolhidas.forEach(function (i) { caminho.append(el("li", null, LINHAS[i].from + " → " + LINHAS[i].by + " (" + LINHAS[i].utc + " UTC)")); });
        }
        function escolhe(i) {
            if (escolhidas.indexOf(i) >= 0) return;
            var esperado = ordemCerta[escolhidas.length];
            if (i !== esperado) {
                var dica = escolhidas.length === 0
                    ? "O primeiro salto sai do computador de quem escreveu a mensagem (wira.firstpr.com.au)."
                    : "O \"from\" do próximo salto costuma ser o \"by\" do anterior; dentro do mesmo servidor, use os horários.";
                u.marca(fb, false, "Ainda não. " + dica);
                return;
            }
            escolhidas.push(i);
            fb.textContent = "";
            desenha();
            if (escolhidas.length === LINHAS.length) {
                u.marca(fb, true, "Caminho completo. No cabeçalho original, essa ordem é a de baixo para cima: cada servidor acrescenta a sua linha no topo.");
                tabela.replaceChildren(el("p", { class: "small mb-0" },
                    "Repare nos horários em UTC: gair.firstpr.com.au marca 10:36:37, e o salto seguinte, em core3.amsl.com, marca 10:36:35, dois segundos antes. ",
                    "Cada servidor usa o próprio relógio, e eles não estão perfeitamente sincronizados."));
                concluir();
            }
        }
        raiz.append(
            el("p", { class: "small mb-2" }, "As 7 linhas Received: do exemplo do livro, embaralhadas. Clique nelas na ordem em que a mensagem passou pelos servidores."),
            lista, caminho, fb, tabela,
            u.botao("Recomeçar", "btn-outline-secondary mt-2", function () { escolhidas = []; fb.textContent = ""; tabela.replaceChildren(); desenha(); }),
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): reconstrua o caminho inteiro."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 6. Montando uma mensagem MIME (pág. 136–138 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("monta-mime", function (raiz) {
        var TEXTO = "Oi, turma!\r\nNuma mensagem MIME, cada parte começa com uma linha assim:\r\n--simple boundary\r\nPor isso a fronteira precisa ser escolhida com cuidado.";
        var HTML = "<p>Oi, turma!</p><p>Veja a mensagem em <b>texto simples</b>.</p>";
        var PNG = "iVBORw0KGgo=";   // os 8 bytes da assinatura PNG em Base64
        var partes = {
            texto: el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("mime"), checked: true }),
            html: el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("mime"), checked: true }),
            imagem: el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("mime") })
        };
        var tipo = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "mixed" }, "multipart/mixed"), el("option", { value: "alternative" }, "multipart/alternative"));
        var fronteira = entrada("simple boundary", "Fronteira (boundary)");
        var msg = el("pre", { class: "log mt-2 mb-0", style: "max-height:320px" });
        var analise = el("div", { class: "small mt-2", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "mime-fronteira", 15, "Montar uma mensagem MIME que o destinatário separa corretamente");

        function corpoPartes() {
            var lista = [];
            if (partes.texto.checked) lista.push({ nome: "texto", cab: "Content-Type: text/plain; charset=UTF-8", corpo: TEXTO });
            if (partes.html.checked) lista.push({ nome: "HTML", cab: "Content-Type: text/html; charset=UTF-8", corpo: HTML });
            if (partes.imagem.checked) lista.push({ nome: "imagem", cab: "Content-Type: image/png\r\nContent-Transfer-Encoding: base64", corpo: PNG });
            return lista;
        }
        function mostra() {
            var b = fronteira.value;
            var lista = corpoPartes();
            var linhas = ["From: Professor <prof@example.edu>", "To: Turma <turma@example.edu>", "Subject: Formato MIME",
                "Date: Mon, 8 Mar 2010 19:55:06 -0600", "MIME-Version: 1.0", "Content-Type: multipart/" + tipo.value + "; boundary=\"" + b + "\"", "",
                "preâmbulo, ignorado pelo leitor de e-mail"];
            lista.forEach(function (p) { linhas.push("", "--" + b, p.cab, "", p.corpo); });
            linhas.push("", "--" + b + "--");
            var texto = linhas.join("\r\n");
            msg.textContent = texto.replace(/\r\n/g, "\n");

            // Como o destinatário separa: corta em toda linha que comece com "--fronteira" (menos a linha final "--fronteira--").
            var achadas = 0, corpo = texto.slice(texto.indexOf("\r\n\r\n") + 4);
            if (b.length) {
                corpo.split("\r\n").forEach(function (l) { if (l.indexOf("--" + b) === 0 && l !== "--" + b + "--") achadas++; });
            }
            var problemas = [];
            if (!b.trim()) problemas.push("A fronteira está vazia.");
            if (!partes.texto.checked) problemas.push("Mantenha a parte de texto simples: é ela que o desafio pede para entregar inteira.");
            else if (achadas !== lista.length) problemas.push("O destinatário encontrou " + achadas + " partes, mas a mensagem tem " + lista.length + ": a fronteira aparece dentro de uma parte e corta o texto no lugar errado.");
            if (lista.length < 2) problemas.push("Escolha pelo menos duas partes para ter uma mensagem multipart.");
            if (partes.imagem.checked && tipo.value === "alternative") problemas.push("multipart/alternative é para várias versões da mesma informação; uma imagem anexada é outra informação (use mixed).");
            if (!partes.imagem.checked && lista.length >= 2 && tipo.value === "mixed") problemas.push("Texto e HTML com o mesmo conteúdo são versões alternativas: o tipo adequado é multipart/alternative.");
            analise.replaceChildren(el("div", null, "O destinatário encontrou ", el("strong", null, String(achadas)), " parte(s); a mensagem tem ", el("strong", null, String(lista.length)), "."));
            return problemas;
        }
        function confere() {
            var problemas = mostra();
            if (problemas.length) { u.marca(fb, false, problemas[0]); return; }
            u.marca(fb, true, "O destinatário separa as partes certas, e o tipo combina com o conteúdo.");
            concluir();
        }
        [partes.texto, partes.html, partes.imagem, tipo, fronteira].forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });

        raiz.append(
            el("div", { class: "d-flex flex-wrap gap-3 mb-2" },
                el("div", { class: "form-check" }, partes.texto, el("label", { class: "form-check-label small", for: partes.texto.id }, "Texto simples")),
                el("div", { class: "form-check" }, partes.html, el("label", { class: "form-check-label small", for: partes.html.id }, "O mesmo texto em HTML")),
                el("div", { class: "form-check" }, partes.imagem, el("label", { class: "form-check-label small", for: partes.imagem.id }, "Imagem anexada (PNG)"))),
            el("div", { class: "row g-2" },
                el("div", { class: "col-sm-6" }, u.campo("Content-Type da mensagem", tipo)),
                el("div", { class: "col-sm-6" }, u.campo("Fronteira (boundary)", fronteira))),
            msg, analise,
            u.botao("Conferir a mensagem", "btn-primary mt-2", confere), fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça o destinatário separar as partes corretamente, com o tipo multipart adequado ao conteúdo. Leia o texto da primeira parte."));
        mostra();
    });

    /* ------------------------------------------------------------------
     * 7. Base64 passo a passo (pág. 138–139 do PDF)
     * ------------------------------------------------------------------ */
    var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function base64(bytes) {
        var grupos = [];
        for (var i = 0; i < bytes.length; i += 3) {
            var g = bytes.slice(i, i + 3);
            var bits = g.map(function (b) { return bin(b, 8); }).join("");
            var nSextetos = Math.ceil(bits.length / 6);
            bits = bits.padEnd(nSextetos * 6, "0");
            var sext = [];
            for (var k = 0; k < nSextetos; k++) sext.push(parseInt(bits.slice(k * 6, k * 6 + 6), 2));
            var cod = sext.map(function (v) { return B64[v]; }).join("") + "=".repeat(4 - nSextetos);
            grupos.push({ bytes: g, sextetos: sext, codigo: cod });
        }
        return grupos;
    }
    R.base64 = function (bytes) { return base64(bytes).map(function (g) { return g.codigo; }).join(""); };

    R.registrar("base64-bits", function (raiz) {
        var modo = el("select", { class: "form-select form-select-sm" }, el("option", { value: "hex" }, "bytes em hexadecimal"), el("option", { value: "texto" }, "texto (UTF-8)"));
        var campo = entrada("14fb9c03d97e", "Entrada");
        var exemplos = el("div", { class: "d-flex flex-wrap gap-2 mb-2" });
        [["14fb9c03d97e", "RFC 4648"], ["14", "1 byte"], ["14fb", "2 bytes"]].forEach(function (e) {
            exemplos.append(u.botao("0x" + e[0] + " (" + e[1] + ")", "btn-outline-secondary", function () { modo.value = "hex"; campo.value = e[0]; mostra(); }));
        });
        var tabela = el("div", { class: "mt-2" });
        var resultado = el("p", { class: "mono mt-2 mb-0", "aria-live": "polite" });

        function bytesDaEntrada() {
            if (modo.value === "texto") return Array.from(new TextEncoder().encode(campo.value));
            var h = campo.value.replace(/^0x/i, "").replace(/\s+/g, "");
            if (!/^([0-9a-fA-F]{2})*$/.test(h)) return null;
            var out = [];
            for (var i = 0; i < h.length; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
            return out;
        }
        function mostra() {
            var bytes = bytesDaEntrada();
            tabela.replaceChildren();
            if (!bytes) { resultado.textContent = "Hexadecimal inválido: use pares de dígitos (ex.: 14fb)."; return; }
            if (!bytes.length) { resultado.textContent = "Base64: (vazio)"; return; }
            var grupos = base64(bytes.slice(0, 12));
            grupos.forEach(function (g, gi) {
                tabela.append(el("div", { class: "demo-box py-2 mb-2" },
                    el("div", { class: "small text-muted" }, "Grupo " + (gi + 1) + (g.bytes.length < 3 ? " (incompleto: " + g.bytes.length + " byte" + (g.bytes.length > 1 ? "s" : "") + ")" : "")),
                    el("div", { class: "d-flex flex-wrap" }, g.bytes.map(function (b) { return el("span", { class: "byte-cell" }, bin(b, 8), el("small", null, "0x" + hex2(b))); })),
                    el("div", { class: "d-flex flex-wrap" }, g.sextetos.map(function (s, i) {
                        var preenchido = i * 6 + 6 > g.bytes.length * 8;
                        return el("span", { class: "byte-cell " + (preenchido ? "ctrl" : "ok") }, bin(s, 6), el("small", null, s + " → " + B64[s]));
                    }), "=".repeat(4 - g.sextetos.length).split("").map(function () { return el("span", { class: "byte-cell muted" }, "=", el("small", null, "enchimento")); }))));
            });
            resultado.textContent = "Base64: " + R.base64(bytes) + (bytes.length > 12 ? "  (a tabela mostra só os 12 primeiros bytes)" : "");
        }
        [modo, campo].forEach(function (c) { c.addEventListener("input", mostra); c.addEventListener("change", mostra); });

        var r1 = entrada("", "Texto que vira UmVkZXM="), r2 = entrada("", "Bytes que viram FPs=");
        var fb = u.feedback(), feitas = {};
        var concluir = R.desafio(raiz, "base64-inverso", 15, "Achar a entrada de duas codificações Base64");
        function confere() {
            if (r1.value.trim() === "Redes") feitas.a = true;
            if (r2.value.replace(/^0x/i, "").trim().toLowerCase() === "14fb") feitas.b = true;
            if (feitas.a && feitas.b) { u.marca(fb, true, "As duas conferem. Repare que FPs= vem de 0x14fb, e não de 0x14b9, como está impresso no livro."); concluir(); }
            else u.marca(fb, false, (feitas.a ? "O texto está certo. " : "O texto ainda não confere (use o codificador para testar). ") + (feitas.b ? "Os bytes estão certos." : "Os bytes ainda não conferem: são dois bytes, escritos em hexadecimal."));
        }

        raiz.append(exemplos,
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-4" }, u.campo("Tipo de entrada", modo)), el("div", { class: "col-sm-8" }, u.campo("Entrada", campo))),
            el("p", { class: "small text-muted mb-0" }, "Verde: bits que vieram da entrada. Amarelo: sexteto completado com zeros. Cinza: caractere de enchimento \"=\"."),
            tabela, resultado,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): descubra as entradas."),
            u.campo("Qual texto vira UmVkZXM= ?", r1), u.campo("Quais bytes (em hexadecimal) viram FPs= ?", r2),
            u.botao("Conferir", "btn-primary", confere), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 8. Registros MX e preferência (pág. 139–140 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("mx-preferencia", function (raiz) {
        var MX = [
            { pref: 10, nome: "mx1.b.example" },
            { pref: 20, nome: "mx2.b.example" },
            { pref: 30, nome: "backup.provedor.example" }
        ];
        var fora = {};
        var tabela = el("table", { class: "table table-sm small mb-2" });
        var log = el("ul", { class: "log" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "mx-backup", 10, "Ver a entrega cair para o MX reserva e ficar na fila");

        function desenha() {
            tabela.replaceChildren(el("thead", null, el("tr", null, el("th", null, "Preferência"), el("th", null, "Servidor"), el("th", null, "Situação"))),
                el("tbody", null, MX.map(function (m) {
                    var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("mx"), checked: !fora[m.nome] });
                    c.addEventListener("change", function () { fora[m.nome] = !c.checked; });
                    return el("tr", null, el("td", null, String(m.pref)), el("td", { class: "mono" }, m.nome),
                        el("td", null, el("div", { class: "form-check mb-0" }, c, el("label", { class: "form-check-label", for: c.id }, "no ar"))));
                })));
        }
        function entrega() {
            log.replaceChildren(el("li", null, "Servidor de a.example pergunta ao DNS: MX de b.example → " + MX.map(function (m) { return m.pref + " " + m.nome; }).join(", ")));
            var ordenados = MX.slice().sort(function (a, b) { return a.pref - b.pref; });
            for (var i = 0; i < ordenados.length; i++) {
                var m = ordenados[i];
                if (fora[m.nome]) { log.append(el("li", { class: "text-danger" }, "Tenta " + m.nome + " (preferência " + m.pref + "): não responde")); continue; }
                log.append(el("li", { class: "text-success" }, "Tenta " + m.nome + " (preferência " + m.pref + "): conexão aceita, mensagem entregue"));
                if (i === 0) vistos.direto = true; else if (i === ordenados.length - 1) vistos.reserva = true;
                fb.textContent = i === 0 ? "Entregue no servidor de menor preferência numérica, o preferido." : "Entregue em " + m.nome + ", porque os mais preferidos estavam fora do ar.";
                fb.className = "small mt-2 mb-0";
                checa();
                return;
            }
            log.append(el("li", null, "Nenhum MX respondeu: a mensagem fica na fila do servidor de a.example, que tenta de novo mais tarde."));
            vistos.fila = true;
            fb.textContent = "Ninguém respondeu: a mensagem espera na fila.";
            fb.className = "small mt-2 mb-0";
            checa();
        }
        function checa() {
            if (vistos.reserva && vistos.fila) { u.marca(fb, true, fb.textContent.replace(/^[✔✘] /, "") + " Você viu o reserva receber e a mensagem esperar na fila."); concluir(); }
        }
        raiz.append(tabela, u.botao("Enviar a mensagem de alice@a.example para bob@b.example", "btn-primary mb-2", entrega), log, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): faça a mensagem ser entregue no servidor reserva e, depois, ficar na fila porque nenhum MX responde."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 9. Diálogo SMTP (pág. 140–142 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("dialogo-smtp", function (raiz) {
        var chat = el("div", { class: "chat", role: "log", "aria-live": "polite" });
        var botoes = el("div", { class: "d-flex flex-wrap gap-2 mt-2" });
        var fb = u.feedback();
        var st, vistos = {};
        var concluir = R.desafio(raiz, "smtp-dialogo", 20, "Entregar uma mensagem por SMTP e provocar um erro de ordem");

        function msg(lado, texto) {
            var classe = lado === "C" ? "chat-esq" : /^[45]/.test(texto) ? "chat-erro" : "chat-dir";
            chat.append(el("div", { class: "chat-msg mono " + classe }, lado + ": " + texto));
            chat.scrollTop = chat.scrollHeight;
        }
        function reinicia() {
            st = { fase: "saudacao", remetente: false, destinos: 0, fechado: false };
            chat.replaceChildren();
            msg("S", "220 smtp.example.com ESMTP MTA information");
            fb.textContent = "";
        }
        function responde(cmd) {
            if (st.fechado) { u.marca(fb, false, "A conexão já foi fechada. Clique em Recomeçar."); return; }
            msg("C", cmd);
            var r;
            if (cmd.indexOf("EHLO") === 0) {
                if (st.fase !== "saudacao") r = "503 Bad sequence of commands";
                else { st.fase = "pronto"; r = "250 Hello mta.example.org, glad to meet you"; }
            } else if (cmd.indexOf("MAIL FROM") === 0) {
                if (st.fase !== "pronto" || st.remetente) r = "503 Bad sequence of commands";
                else { st.remetente = true; r = "250 Ok"; }
            } else if (cmd.indexOf("RCPT TO") === 0) {
                if (!st.remetente) r = "503 Bad sequence of commands";
                else if (cmd.indexOf("ninguem@") >= 0) r = "550 Requested action not taken: mailbox unavailable";
                else { st.destinos++; r = "250 Ok"; }
            } else if (cmd === "DATA") {
                if (!st.remetente || !st.destinos) r = "503 Bad sequence of commands";
                else {
                    msg("S", "354 End data with <CR><LF>.<CR><LF>");
                    ["From: \"Alice Doe\" <alice@example.org>", "To: Bob Smith <bob@example.com>", "Date: Mon, 9 Mar 2010 18:22:32 +0100",
                        "Subject: Hello", "", "Hello Bob", "Best regards,", "Alice", "."].forEach(function (l) { msg("C", l); });
                    st.remetente = false; st.destinos = 0;
                    vistos.entregue = true;
                    r = "250 Ok: queued as 12345";
                }
            } else if (cmd === "QUIT") {
                st.fechado = true;
                r = "221 Bye";
                if (vistos.entregue) vistos.saiu = true;
            }
            msg("S", r);
            if (/^503/.test(r)) vistos.e503 = true;
            if (/^550/.test(r)) vistos.e550 = true;
            var faltam = [];
            if (!vistos.saiu) faltam.push("entregar uma mensagem (250 queued) e encerrar com QUIT");
            if (!vistos.e503) faltam.push("provocar um 503 (comando fora de ordem)");
            if (faltam.length) { fb.className = "small mt-2 mb-0"; fb.textContent = "Falta: " + faltam.join("; ") + "."; }
            else { u.marca(fb, true, "Mensagem entregue e um 503 provocado: o servidor confere a ordem MAIL FROM → RCPT TO → DATA." + (vistos.e550 ? " Você também viu o 550 de um destinatário inexistente." : "")); concluir(); }
        }
        ["EHLO mta.example.org", "MAIL FROM:<alice@example.org>", "RCPT TO:<bob@example.com>", "RCPT TO:<ninguem@example.com>", "DATA", "QUIT"].forEach(function (c) {
            botoes.append(u.botao(c, "btn-outline-primary mono", function () { responde(c); }, "Cliente envia " + c));
        });
        botoes.append(u.botao("Recomeçar", "btn-outline-secondary", reinicia));
        raiz.append(chat, botoes, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Você é o cliente SMTP. Desafio (20 pts): entregue a mensagem a bob@example.com, feche a sessão com QUIT e, em algum momento, mande um comando fora de ordem para ver o 503."));
        reinicia();
    });

    /* ------------------------------------------------------------------
     * 10. Diálogo POP3 (pág. 143–144 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("dialogo-pop", function (raiz) {
        var caixa = [{ n: 1, tam: 120 }, { n: 2, tam: 500 }];
        var chat = el("div", { class: "chat", role: "log", "aria-live": "polite" });
        var botoes = el("div", { class: "d-flex flex-wrap gap-2 mt-2" });
        var situacao = el("div", { class: "small mt-2" });
        var fb = u.feedback();
        var sessao = null, vistos = {};
        var concluir = R.desafio(raiz, "pop-dele", 15, "Apagar uma mensagem no POP3 e entender a fase de atualização");

        function msg(lado, texto) {
            var classe = lado === "C" ? "chat-esq" : /^-ERR/.test(texto) ? "chat-erro" : lado === "!" ? "chat-erro" : "chat-dir";
            chat.append(el("div", { class: "chat-msg mono " + classe }, (lado === "!" ? "" : lado + ": ") + texto));
            chat.scrollTop = chat.scrollHeight;
        }
        function vivas() { return caixa.filter(function (m) { return !sessao || !sessao.apagar[m.n]; }); }
        function total(lista) { return lista.reduce(function (s, m) { return s + m.tam; }, 0); }
        function desenhaSituacao() {
            situacao.replaceChildren(el("div", null, "Caixa de alice no servidor: ",
                caixa.length ? caixa.map(function (m) { return el("span", { class: "chip" + (sessao && sessao.apagar[m.n] ? " chip-bad" : "") }, "msg " + m.n + " (" + m.tam + " octetos)" + (sessao && sessao.apagar[m.n] ? " — marcada" : "")); }) : el("em", null, "vazia")),
                el("div", { class: "text-muted" }, "Fase: " + (sessao ? sessao.fase : "sem conexão")));
        }
        function conecta() {
            if (sessao) { u.marca(fb, false, "Já existe uma conexão aberta."); return; }
            sessao = { fase: "autorização", usuario: false, apagar: {} };
            chat.replaceChildren();
            msg("S", "+OK POP3 server ready");
            desenhaSituacao();
        }
        function envia(cmd) {
            if (!sessao) { u.marca(fb, false, "Primeiro abra a conexão com o servidor POP."); return; }
            msg("C", cmd);
            var partes = cmd.split(" "), verbo = partes[0], arg = Number(partes[1]);
            var r;
            if (sessao.fase === "autorização") {
                if (verbo === "USER") { sessao.usuario = true; r = "+OK"; }
                else if (verbo === "PASS" && sessao.usuario) { sessao.fase = "transação"; var v = vivas(); r = "+OK alice's maildrop has " + v.length + " messages (" + total(v) + " octets)"; }
                else if (verbo === "QUIT") { r = "+OK POP3 server signing off"; sessao = null; }
                else r = "-ERR comando inválido nesta fase";
            } else {
                var alvo = caixa.filter(function (m) { return m.n === arg; })[0];
                if (verbo === "STAT") { var v2 = vivas(); r = "+OK " + v2.length + " " + total(v2); }
                else if (verbo === "LIST") {
                    var v3 = vivas();
                    msg("S", "+OK " + v3.length + " messages (" + total(v3) + " octets)");
                    v3.forEach(function (m) { msg("S", m.n + " " + m.tam); });
                    r = ".";
                } else if (verbo === "RETR") {
                    if (!alvo || sessao.apagar[arg]) r = "-ERR no such message";
                    else { msg("S", "+OK " + alvo.tam + " octets"); msg("S", "<o servidor envia a mensagem " + arg + ">"); r = "."; }
                } else if (verbo === "DELE") {
                    if (!alvo || sessao.apagar[arg]) r = "-ERR no such message";
                    else { sessao.apagar[arg] = true; r = "+OK message " + arg + " deleted"; }
                } else if (verbo === "QUIT") {
                    var apagadas = Object.keys(sessao.apagar).length;
                    caixa = caixa.filter(function (m) { return !sessao.apagar[m.n]; });
                    r = "+OK POP3 server signing off (" + caixa.length + " message" + (caixa.length === 1 ? "" : "s") + " left)";
                    if (apagadas) vistos.quit = true;
                    sessao = null;
                } else r = "-ERR comando inválido nesta fase";
            }
            msg("S", r);
            desenhaSituacao();
            avalia();
        }
        function cai() {
            if (!sessao) { u.marca(fb, false, "Não há conexão aberta."); return; }
            var tinha = Object.keys(sessao.apagar).length;
            sessao = null;
            msg("!", "A conexão caiu antes do QUIT.");
            if (tinha) vistos.queda = true;
            desenhaSituacao();
            avalia();
        }
        function avalia() {
            if (vistos.queda && vistos.quit) { u.marca(fb, true, "Isso: DELE só marca. A remoção acontece na fase de atualização, depois do QUIT; se a conexão cai antes, a mensagem continua no servidor."); concluir(); }
            else { fb.className = "small mt-2 mb-0"; fb.textContent = (vistos.queda ? "✔ Você viu a marcação se perder com a queda. " : "Falta: marcar uma mensagem com DELE e deixar a conexão cair. ") + (vistos.quit ? "✔ Você apagou uma mensagem de verdade com QUIT." : "Falta: apagar uma mensagem de verdade (DELE e depois QUIT)."); }
        }
        botoes.append(u.botao("Abrir conexão (porta 110)", "btn-primary", conecta));
        ["USER alice", "PASS 12345pass", "STAT", "LIST", "RETR 1", "DELE 1", "DELE 2", "QUIT"].forEach(function (c) {
            botoes.append(u.botao(c, "btn-outline-primary mono", function () { envia(c); }, "Cliente envia " + c));
        });
        botoes.append(u.botao("Derrubar a conexão", "btn-outline-danger", cai),
            u.botao("Restaurar a caixa", "btn-outline-secondary", function () { caixa = [{ n: 1, tam: 120 }, { n: 2, tam: 500 }]; sessao = null; chat.replaceChildren(); desenhaSituacao(); }));
        raiz.append(chat, situacao, botoes, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): marque uma mensagem com DELE e derrube a conexão; reconecte e veja que ela continua lá. Depois apague uma mensagem de verdade."));
        desenhaSituacao();
    });
}());
