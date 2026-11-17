/* Simulações do Capítulo 28 — Prática: transferência confiável (seção 4.2 do livro).
 * Cada uma é registrada em Redes.registrar. Os cenários são os dos exercícios do livro. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function caixa(rotulo, marcada) {
        var c = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("cx"), checked: !!marcada });
        return { input: c, linha: el("div", { class: "form-check" }, c, el("label", { class: "form-check-label small", for: c.id }, rotulo)) };
    }
    function opcoes(lista) { return lista.map(function (o) { return el("option", { value: o[0] }, o[1]); }); }
    function tabela(cabecalho, linhas) {
        return el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-0" },
            el("thead", null, el("tr", null, cabecalho.map(function (h) { return el("th", null, h); }))),
            el("tbody", null, linhas.map(function (l) { return el("tr", { class: l.classe || null }, l.celulas.map(function (c) { return el("td", { class: "mono" }, c); })); }))));
    }
    function h2(b) { return (b < 16 ? "0" : "") + b.toString(16); }
    function hex(lista) { return lista.map(h2).join(" "); }
    function num(v, casas) { return Number(v).toFixed(casas === undefined ? 2 : casas).replace(".", ","); }
    function leNum(t) { var v = parseFloat(String(t).replace(",", ".")); return isNaN(v) ? null : v; }
    function badge(texto, classe, titulo) { return el("span", { class: "badge mono " + classe, title: titulo || null }, texto); }

    /* ------------------------------------------------------------------
     * 1. Bit alternado num enlace assimétrico (questões 1, 2 e 5, pág. 277–278 do PDF)
     * ------------------------------------------------------------------ */
    function bitAlternado(dados, ack, bDados, bAck, prop) {
        var td = dados * 8 / bDados, ta = ack * 8 / bAck, ciclo = td + prop + ta + prop;
        return { td: td, ta: ta, prop: prop, ciclo: ciclo, quadros: 1 / ciclo, vazao: dados * 8 / ciclo };
    }
    R.bitAlternado = bitAlternado;

    R.registrar("abp-vazao", function (raiz) {
        var sobe = el("input", { type: "number", class: "form-control form-control-sm", value: 1, min: 0.01, step: "any" });
        var desce = el("input", { type: "number", class: "form-control form-control-sm", value: 50, min: 0.01, step: "any" });
        var prop = el("input", { type: "number", class: "form-control form-control-sm", value: 10, min: 0, step: "any" });
        var dados = el("input", { type: "number", class: "form-control form-control-sm", value: 125, min: 1, step: 1 });
        var ack = el("input", { type: "number", class: "form-control form-control-sm", value: 25, min: 1, step: 1 });
        var sentido = el("select", { class: "form-select form-select-sm" }, opcoes([["sobe", "dados na subida, confirmações na descida"], ["desce", "dados na descida, confirmações na subida"]]));
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function desenha() {
            var bs = Number(sobe.value) * 1e6, bd = Number(desce.value) * 1e6, p = Number(prop.value) / 1000;
            var d = Number(dados.value), a = Number(ack.value);
            if (!(bs > 0 && bd > 0 && p >= 0 && d > 0 && a > 0)) { area.replaceChildren(el("p", { class: "small text-danger mb-0" }, "Preencha valores positivos.")); return; }
            var r = sentido.value === "sobe" ? bitAlternado(d, a, bs, bd, p) : bitAlternado(d, a, bd, bs, p);
            var partes = [["transmite o quadro", r.td, "bg-primary"], ["propaga", r.prop, "bg-secondary"], ["transmite a confirmação", r.ta, "bg-success"], ["propaga de volta", r.prop, "bg-secondary"]];
            area.replaceChildren(
                el("div", { class: "progress", style: "height: 1.4rem", role: "img", "aria-label": "Divisão do ciclo do bit alternado" },
                    partes.map(function (x) { return el("div", { class: "progress-bar " + x[2], style: "width:" + (100 * x[1] / r.ciclo) + "%", title: x[0] + ": " + num(x[1] * 1000, 3) + " ms" }); })),
                tabela(["Etapa", "Tempo"], partes.map(function (x) { return { celulas: [x[0], num(x[1] * 1000, 3) + " ms"] }; })
                    .concat([{ celulas: ["ciclo completo", num(r.ciclo * 1000, 3) + " ms"], classe: "table-info" }])),
                el("p", { class: "small mt-2 mb-0" }, "Um quadro por ciclo: " + num(r.quadros) + " quadros/s, ou " + num(r.vazao / 1e3, 1) + " kbit/s de dados. O enlace dos dados fica ocupado só " +
                    num(100 * r.td / r.ciclo, 1) + "% do tempo: o resto é espera."));
        }
        [sobe, desce, prop, dados, ack, sentido].forEach(function (c) { c.addEventListener("input", desenha); c.addEventListener("change", desenha); });
        var resp = el("input", { type: "text", class: "form-control form-control-sm", "aria-label": "Quadros por segundo", inputmode: "decimal" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "abp-vazao", 15, "Calcular a vazão do bit alternado num enlace ADSL");
        raiz.append(el("p", { class: "small mb-2" }, "O emissor manda um quadro e espera a confirmação antes do próximo. Os valores iniciais são os da questão 2: ADSL com 1 Mbit/s de subida e 50 Mbit/s de descida, 10 ms de propagação, quadros de 125 bytes e confirmações de 25 bytes."),
            el("div", { class: "row g-2" },
                el("div", { class: "col-6 col-md-4" }, u.campo("Subida (Mbit/s)", sobe)), el("div", { class: "col-6 col-md-4" }, u.campo("Descida (Mbit/s)", desce)),
                el("div", { class: "col-6 col-md-4" }, u.campo("Propagação (ms)", prop)), el("div", { class: "col-6 col-md-4" }, u.campo("Dados (bytes)", dados)),
                el("div", { class: "col-6 col-md-4" }, u.campo("Confirmação (bytes)", ack)), el("div", { class: "col-12 col-md-4" }, u.campo("Sentido", sentido))),
            area,
            el("p", { class: "small text-muted mt-1 mb-0" }, "Legenda: azul = transmissão do quadro; verde = transmissão da confirmação; cinza = propagação."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): na segunda parte da questão 2, os quadros passam a ter 1500 bytes. Com os dados na subida, quantos quadros por segundo o bit alternado consegue?"),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var v = leNum(resp.value), ok = v !== null && Math.abs(v - 31.25) < 0.06;
                u.marca(fb, ok, ok ? "Isso: 12 ms para transmitir o quadro, 20 ms de ida e volta e 0,004 ms para a confirmação dão um ciclo de 32,004 ms, ou 31,25 quadros/s." : "Ainda não. Ponha 1500 nos dados e leia o resultado, ou calcule: 1500 × 8 / 1 Mbit/s + 2 × 10 ms + 25 × 8 / 50 Mbit/s.");
                if (ok) concluir();
            })), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 2. Go-back-n e selective repeat com perdas (questões 6 e 7, pág. 278 do PDF;
     *    regras do emissor e do receptor nas págs. 27–31)
     * ------------------------------------------------------------------ */
    function simulaJanela(o) {
        var n = o.n || 10, W = o.W || 4, tx = o.tx || 1, prop = o.prop === undefined ? 100 : o.prop, rto = o.rto || 3000;
        var perdas = o.perdas || [], perdeAck = o.perdeAck || function () { return false; }, sack = !!o.sack, proto = o.proto;
        var fila = [], ordem = 0, log = [], envios = [], perdidos = {}, livre = 0;
        function agenda(t, tipo, x) { fila.push({ t: t, o: ++ordem, tipo: tipo, x: x }); }
        function proximo() {
            fila.sort(function (a, b) { return a.t - b.t || a.o - b.o; });
            return fila.shift();
        }
        function transmite(t, s) {
            var ini = Math.max(t, livre); livre = ini + tx;
            envios.push(s);
            var perde = perdas.indexOf(s) >= 0 && !perdidos[s];
            if (perde) perdidos[s] = true; else agenda(ini + tx + prop, "chega", s);
            log.push({ t: ini, lado: "e", txt: "envia D(" + s + ")" + (perde ? ": perdido" : ""), tipo: perde ? "perda" : "envio" });
            return ini;
        }
        var base = 0, prox = 0, timer = null, timers = {}, esperado = 0, guardados = {}, acks = 0;
        function enche(t) {
            while (prox < n && prox < base + W) {
                var ini = transmite(t, prox);
                if (proto === "sr") { timers[prox] = ini + rto; agenda(ini + rto, "expira", prox); }
                else if (timer === null) { timer = ini + rto; agenda(timer, "expira", null); }
                prox++;
            }
        }
        enche(0);
        var ev;
        while ((ev = proximo())) {
            var t = ev.t, x = ev.x;
            if (ev.tipo === "chega") {
                if (proto === "gbn" && x === esperado) esperado++;
                if (proto === "sr" && x >= esperado && x < esperado + W) guardados[x] = true;
                while (guardados[esperado]) { delete guardados[esperado]; esperado++; }
                acks++;
                var lista = sack ? Object.keys(guardados).map(Number).sort(function (a, b) { return a - b; }) : [];
                var perdeu = perdeAck(acks);
                log.push({ t: t, lado: "r", txt: "recebe D(" + x + ") e manda OK" + (esperado - 1) + (lista.length ? " [" + lista.join(", ") + "]" : "") + (perdeu ? ": confirmação perdida" : ""), tipo: perdeu ? "perda" : "ack" });
                if (!perdeu) agenda(t + prop, "ack", { ok: esperado - 1, lista: lista });
            } else if (ev.tipo === "ack") {
                x.lista.forEach(function (s) { delete timers[s]; });
                if (x.ok >= base) {
                    for (var s = base; s <= x.ok; s++) delete timers[s];
                    base = x.ok + 1;
                    log.push({ t: t, lado: "e", txt: "recebe OK" + x.ok + ": a janela começa em " + base, tipo: "info" });
                    if (base === n) return { fim: t, envios: envios, log: log };
                    if (proto === "gbn") { timer = t + rto; agenda(timer, "expira", null); }
                    enche(t);
                }
            } else if (proto === "gbn" && x === null && t === timer) {
                var faixa = [];
                for (var k = base; k < prox; k++) faixa.push(k);
                log.push({ t: t, lado: "e", txt: "o temporizador expira: retransmite " + faixa.join(", "), tipo: "timeout" });
                faixa.forEach(function (k) { transmite(t, k); });
                timer = t + rto; agenda(timer, "expira", null);
            } else if (proto === "sr" && timers[x] === t) {
                log.push({ t: t, lado: "e", txt: "o temporizador de D(" + x + ") expira", tipo: "timeout" });
                var ini = transmite(t, x); timers[x] = ini + rto; agenda(ini + rto, "expira", x);
            }
        }
        return { fim: null, envios: envios, log: log };
    }
    R.simulaJanela = simulaJanela;

    var CENARIOS = {
        nenhuma: { nome: "sem perdas" },
        dados: { nome: "o 3º e o 7º quadros se perdem", perdas: [2, 6] },
        acks: { nome: "uma confirmação em cada duas se perde", perdeAck: function (k) { return k % 2 === 0; } }
    };

    R.registrar("gbn-sr-perdas", function (raiz) {
        var proto = el("select", { class: "form-select form-select-sm" }, opcoes([["gbn", "go-back-n"], ["sr", "selective repeat"], ["sack", "selective repeat com confirmações seletivas"]]));
        var cen = el("select", { class: "form-select form-select-sm" }, opcoes([["nenhuma", CENARIOS.nenhuma.nome], ["dados", CENARIOS.dados.nome], ["acks", CENARIOS.acks.nome]]));
        var W = el("select", { class: "form-select form-select-sm" }, opcoes([["1", "1 quadro"], ["2", "2 quadros"], ["4", "4 quadros"], ["10", "10 quadros"]]));
        W.value = "4";
        var rto = el("select", { class: "form-select form-select-sm" }, opcoes([["150", "150 ms"], ["1000", "1 s"], ["3000", "3 s"]]));
        rto.value = "3000";
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        var COR = { perda: "table-danger", timeout: "table-warning", info: "", envio: "", ack: "table-success" };
        function desenha() {
            var c = CENARIOS[cen.value];
            var r = simulaJanela({ proto: proto.value === "gbn" ? "gbn" : "sr", sack: proto.value === "sack", W: Number(W.value), rto: Number(rto.value), perdas: c.perdas, perdeAck: c.perdeAck });
            area.replaceChildren(
                el("p", { class: "small mb-2" }, el("strong", null, "Fim: " + r.fim + " ms"), ", com " + r.envios.length + " transmissões de quadros de dados (" + (r.envios.length - 10) + " retransmissões). Ordem: " + r.envios.join(", ") + "."),
                el("div", { style: "max-height: 18rem; overflow-y: auto" }, tabela(["Tempo (ms)", "Quem", "Evento"], r.log.map(function (e) {
                    return { celulas: [String(e.t), e.lado === "e" ? "emissor" : "receptor", e.txt], classe: COR[e.tipo] || null };
                }))));
        }
        [proto, cen, W, rto].forEach(function (c) { c.addEventListener("change", desenha); });
        var semSack = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Retransmissões sem confirmações seletivas" });
        var comSack = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Retransmissões com confirmações seletivas" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "gbn-sr-perdas", 15, "Comparar as retransmissões do selective repeat com e sem confirmações seletivas");
        raiz.append(el("p", { class: "small mb-2" }, "O cenário da questão 6: 10 Mbit/s, 100 ms de propagação, quadros de 10.000 bits (1 ms cada), 10 quadros e confirmações de tamanho desprezível. Escolha o protocolo, as perdas, a janela e o temporizador."),
            el("div", { class: "row g-2" },
                el("div", { class: "col-md-6" }, u.campo("Protocolo", proto)), el("div", { class: "col-md-6" }, u.campo("Perdas", cen)),
                el("div", { class: "col-6" }, u.campo("Janela", W)), el("div", { class: "col-6" }, u.campo("Temporizador", rto))),
            area,
            el("p", { class: "small text-muted mt-1 mb-0" }, "Verde: confirmações enviadas; vermelho: perdas; amarelo: temporizador expirado."),
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): com janela de 4, temporizador de 3 s e o 3º e o 7º quadros perdidos, quantas retransmissões faz o selective repeat sem confirmações seletivas? E com elas?"),
            el("div", { class: "row g-2" }, el("div", { class: "col-6" }, u.campo("Sem confirmações seletivas", semSack)), el("div", { class: "col-6" }, u.campo("Com confirmações seletivas", comSack))),
            u.botao("Conferir", "btn-primary", function () {
                var ok = Number(semSack.value) === 8 && Number(comSack.value) === 2;
                u.marca(fb, ok, ok ? "Isso: 8 contra 2. Sem as confirmações seletivas, os temporizadores de D(3), D(4) e D(5) expiram antes de a confirmação cumulativa cobri-los, e eles são reenviados à toa, como o livro avisa na pág. 31." : "Ainda não. Escolha cada variante do selective repeat, com o cenário das perdas de dados, e conte as retransmissões (transmissões menos 10).");
                if (ok) concluir();
            }), fb);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 3. Checksum da Internet, Fletcher e CRC-32 (4.2.2, pág. 278 do PDF)
     * ------------------------------------------------------------------ */
    function bytesDe(t) { return Array.from(new TextEncoder().encode(t)); }
    function checksumInternet(b) {
        var s = 0;
        for (var i = 0; i < b.length; i += 2) s += (b[i] << 8) + (i + 1 < b.length ? b[i + 1] : 0);
        while (s > 0xFFFF) s = (s & 0xFFFF) + Math.floor(s / 65536);
        return (~s) & 0xFFFF;
    }
    function fletcher16(b) {
        var a = 0, c = 0;
        b.forEach(function (x) { a = (a + x) % 255; c = (c + a) % 255; });
        return (c << 8) | a;
    }
    var TAB = (function () {
        var t = [];
        for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
        return t;
    }());
    function crc32(b) {
        var c = 0xFFFFFFFF;
        for (var i = 0; i < b.length; i++) c = TAB[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function palavras(b) {
        var p = [];
        for (var i = 0; i < b.length; i += 2) p.push(h2(b[i]) + (i + 1 < b.length ? h2(b[i + 1]) : "00"));
        return p;
    }
    function h4(v) { return ("000" + v.toString(16)).slice(-4); }
    function h8(v) { return ("0000000" + v.toString(16)).slice(-8); }
    R.checksumInternet = checksumInternet;
    R.fletcher16 = fletcher16;
    R.crc32 = crc32;

    R.registrar("checksum-cego", function (raiz) {
        var orig = el("input", { type: "text", class: "form-control form-control-sm mono", value: "Redes de Computadores!", spellcheck: "false" });
        var recebida = el("input", { type: "text", class: "form-control form-control-sm mono", value: "Redes de Computadores!", spellcheck: "false" });
        var area = el("div", { class: "mt-2", "aria-live": "polite" });
        function estado() {
            var a = bytesDe(orig.value), b = bytesDe(recebida.value);
            return { a: a, b: b, iguais: orig.value === recebida.value,
                ia: checksumInternet(a), ib: checksumInternet(b), fa: fletcher16(a), fb: fletcher16(b), ca: crc32(a), cb: crc32(b) };
        }
        function desenha() {
            var e = estado(), pa = palavras(e.a), pb = palavras(e.b);
            function linha(nome, va, vb, fmt) {
                var detecta = va !== vb;
                return { celulas: [nome, fmt(va), fmt(vb), e.iguais ? "—" : detecta ? "sim" : "não"], classe: e.iguais ? null : detecta ? "table-success" : "table-danger" };
            }
            area.replaceChildren(
                el("p", { class: "small mb-1" }, "Palavras de 16 bits da mensagem recebida (as diferentes da original estão destacadas):"),
                el("div", { class: "d-flex flex-wrap gap-1 mb-2" }, pb.map(function (w, i) { return badge(w, w === pa[i] ? "text-bg-light border" : "text-bg-warning"); })),
                tabela(["Código", "Original", "Recebida", "Percebe o erro?"], [
                    linha("Checksum da Internet", e.ia, e.ib, h4), linha("Fletcher-16", e.fa, e.fb, h4), linha("CRC-32", e.ca, e.cb, h8)]));
        }
        [orig, recebida].forEach(function (c) { c.addEventListener("input", desenha); });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "checksum-cego", 15, "Achar um erro que o checksum da Internet não detecta");
        raiz.append(el("p", { class: "small mb-2" }, "O emissor calcula os códigos sobre a mensagem original; o receptor, sobre o que chegou. Se os valores forem iguais, o receptor não percebe o erro. Edite a mensagem recebida."),
            el("div", { class: "row g-2" }, el("div", { class: "col-md-6" }, u.campo("Mensagem enviada", orig)), el("div", { class: "col-md-6" }, u.campo("Mensagem recebida", recebida))),
            area,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): mude a mensagem recebida de modo que o checksum da Internet não perceba o erro, mas o CRC-32 perceba."),
            u.botao("Conferir", "btn-primary", function () {
                var e = estado(), ok = !e.iguais && e.ia === e.ib && e.ca !== e.cb;
                u.marca(fb, ok, ok ? "Isso. O checksum da Internet só soma as palavras: trocar duas palavras de lugar, ou ganhar num bit o que se perde no mesmo bit de outra palavra, não muda a soma. O CRC-32 percebe." :
                    e.iguais ? "A mensagem recebida ainda é igual à original." : e.ia !== e.ib ? "O checksum da Internet percebeu. Tente trocar de lugar duas palavras de 16 bits, por exemplo 'Re' e 'de' no começo." : "O CRC-32 também não percebeu; tente outra mudança.");
                if (ok) concluir();
            }), fb);
        desenha();
    });
}());
