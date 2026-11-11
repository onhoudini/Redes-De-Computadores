/* Simulações do Capítulo 12 — UDP e TCP (seções 3.10 a 3.12 do livro).
 * Cada uma é registrada em Redes.registrar. Os modelos de tempo são simplificados e dizem isso na tela. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el;

    function hex4(n) { return n.toString(16).padStart(4, "0"); }
    function hex2(n) { return n.toString(16).padStart(2, "0"); }
    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }
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
    function desafioNumero(raiz, id, pontos, titulo, pergunta, certo, explica, dica) {
        var resp = el("input", { type: "number", step: "any", class: "form-control form-control-sm", "aria-label": "Resposta" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, id, pontos, titulo);
        return el("div", null,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (" + pontos + " pts): " + pergunta),
            el("div", { class: "d-flex gap-2" }, resp, u.botao("Conferir", "btn-primary", function () {
                var ok = certo(Number(resp.value));
                u.marca(fb, ok, ok ? explica : dica);
                if (ok) concluir();
            })), fb);
    }

    /* ---------- checksum da Internet (RFC 1071) ---------- */
    var ORIGEM = { "2001:db8::1": [0x2001, 0x0db8, 0, 0, 0, 0, 0, 1], "2001:db8::9": [0x2001, 0x0db8, 0, 0, 0, 0, 0, 9] };
    var DESTINO = [0x2001, 0x0db8, 0, 0, 0, 0, 0, 2];
    function palavras(bytes) { var p = []; for (var i = 0; i < bytes.length; i += 2) p.push((bytes[i] << 8) | (bytes[i + 1] || 0)); return p; }
    function somaInternet(ws) { var t = 0; ws.forEach(function (w) { t += w; t = (t & 0xffff) + (t >>> 16); }); return t; }
    function palavrasUdp(origem, carga, ck) {
        var tam = 8 + carga.length;
        var pseudo = ORIGEM[origem].concat(DESTINO, [tam >>> 16, tam & 0xffff, 0, 17]);
        return { pseudo: pseudo, cabecalho: [1234, 5678, tam, ck], dados: palavras(carga) };
    }
    function checksumUdp(origem, carga) {
        var p = palavrasUdp(origem, carga, 0);
        return 0xffff - somaInternet(p.pseudo.concat(p.cabecalho, p.dados));
    }
    R.checksumUdp = function (texto) { return checksumUdp("2001:db8::1", Array.from(new TextEncoder().encode(texto))); };

    /* ------------------------------------------------------------------
     * 1. O checksum do UDP (pág. 186–187 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("checksum-udp", function (raiz) {
        var dadosEnv = entrada("ABCD", "Dados enviados");
        var grade = el("div", { class: "mt-2" });
        var resumo = el("p", { class: "mono small mt-2 mb-0" });
        var dadosRec = entrada("ABCD", "Dados recebidos");
        var origemRec = el("select", { class: "form-select form-select-sm" }, el("option", { value: "2001:db8::1" }, "2001:db8::1 (a verdadeira)"), el("option", { value: "2001:db8::9" }, "2001:db8::9 (outra)"));
        var verif = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "checksum-fraco", 15, "Achar uma alteração que o checksum não detecta");
        var ck = 0;
        function bytes(inp) { return Array.from(new TextEncoder().encode(inp.value)); }
        function linha(rotulo, ws, classe) {
            return el("div", { class: "d-flex flex-wrap align-items-center" }, el("span", { class: "small text-muted me-2", style: "min-width:7.5rem" }, rotulo),
                ws.map(function (w) { return el("span", { class: "byte-cell " + (classe || ""), style: "min-width:3.1rem" }, hex4(w)); }));
        }
        function calcula() {
            var c = bytes(dadosEnv);
            ck = checksumUdp("2001:db8::1", c);
            var p = palavrasUdp("2001:db8::1", c, ck);
            var soma = somaInternet(p.pseudo.concat(p.cabecalho.slice(0, 3), [0], p.dados));
            grade.replaceChildren(
                linha("pseudo-cabeçalho", p.pseudo, "muted"),
                linha("cabeçalho UDP", p.cabecalho.slice(0, 3).concat([ck]), "ctrl"),
                linha("dados", p.dados, "ok"));
            resumo.textContent = "soma (com o checksum zerado) = 0x" + hex4(soma) + " → checksum = 0xffff − soma = 0x" + hex4(ck);
            confere();
        }
        function confere() {
            var c = bytes(dadosRec);
            var p = palavrasUdp(origemRec.value, c, ck);
            var total = somaInternet(p.pseudo.concat(p.cabecalho, p.dados));
            var ok = total === 0xffff;
            verif.replaceChildren("O receptor soma tudo, inclusive o checksum recebido: ", el("strong", { class: "mono" }, "0x" + hex4(total)),
                ok ? " = 0xffff → segmento aceito." : " ≠ 0xffff → segmento descartado (erro detectado).");
            var mudou = dadosRec.value !== dadosEnv.value;
            if (ok && mudou && origemRec.value === "2001:db8::1") { u.marca(fb, true, "Alteração não detectada! A soma não depende da ordem das palavras de 16 bits, e erros que se compensam passam despercebidos. Por isso o checksum só pega erros de transmissão comuns, não ataques."); concluir(); }
            else if (!ok && origemRec.value !== "2001:db8::1" && !mudou) { fb.className = "small mt-2 mb-0"; fb.textContent = "O pseudo-cabeçalho entra na soma: um segmento entregue com outro endereço de origem é descartado."; }
            else fb.textContent = "";
        }
        dadosEnv.addEventListener("input", function () { dadosRec.value = dadosEnv.value; calcula(); });
        [dadosRec, origemRec].forEach(function (c) { c.addEventListener("input", confere); c.addEventListener("change", confere); });
        raiz.append(el("p", { class: "small mb-2" }, "Um segmento UDP de 2001:db8::1, porta 1234, para 2001:db8::2, porta 5678. O checksum soma, em complemento de um, as palavras de 16 bits do pseudo-cabeçalho, do cabeçalho e dos dados."),
            u.campo("Dados enviados", dadosEnv), grade, resumo,
            el("div", { class: "row g-2 mt-2" }, el("div", { class: "col-sm-6" }, u.campo("Dados que chegaram (altere à vontade)", dadosRec)), el("div", { class: "col-sm-6" }, u.campo("Endereço de origem no pacote recebido", origemRec))),
            verif, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): mude os dados recebidos de um jeito que o receptor NÃO perceba."));
        calcula();
    });

    /* ------------------------------------------------------------------
     * 2. Lendo um cabeçalho TCP (pág. 187–194 do PDF)
     * ------------------------------------------------------------------ */
    var FLAGS = ["FIN", "SYN", "RST", "PSH", "ACK", "URG"];
    function leTcp(bytes) {
        if (bytes.length < 20) return null;
        var dv = new DataView(new Uint8Array(bytes).buffer);
        var thl = (bytes[12] >> 4) * 4;
        var r = { portaO: dv.getUint16(0), portaD: dv.getUint16(2), seq: dv.getUint32(4), ack: dv.getUint32(8), thl: thl,
            flags: FLAGS.filter(function (f, i) { return bytes[13] & (1 << i); }), janela: dv.getUint16(14), checksum: dv.getUint16(16), opcoes: [] };
        var i = 20;
        while (i < thl && i < bytes.length) {
            var tipo = bytes[i];
            if (tipo === 0) { r.opcoes.push("fim da lista (0)"); break; }
            if (tipo === 1) { r.opcoes.push("NOP (1)"); i++; continue; }
            var tam = bytes[i + 1], v = bytes.slice(i + 2, i + tam);
            if (tipo === 2) r.opcoes.push("MSS (2) = " + ((v[0] << 8) | v[1]) + " bytes");
            else if (tipo === 3) r.opcoes.push("escala de janela (3) = " + v[0]);
            else if (tipo === 4) r.opcoes.push("SACK permitido (4)");
            else if (tipo === 8) r.opcoes.push("timestamps (8)");
            else r.opcoes.push("tipo " + tipo + ", " + tam + " bytes");
            i += Math.max(tam, 2);
        }
        return r;
    }
    R.leTcp = leTcp;

    R.registrar("cabecalho-tcp", function (raiz) {
        var AMOSTRAS = [
            ["SYN do cliente", "c0 00 01 bb 12 34 56 78 00 00 00 00 80 02 fa f0 00 00 00 00 02 04 05 a0 01 03 03 07 04 02 00 00"],
            ["SYN+ACK do servidor", "01 bb c0 00 9a bc de f0 12 34 56 79 70 12 fe 88 00 00 00 00 02 04 05 b4 01 03 03 07"],
            ["FIN+ACK", "c0 00 01 bb 12 34 5a 00 9a bc f0 00 50 11 01 f6 00 00 00 00"]
        ];
        var campo = el("textarea", { class: "form-control form-control-sm mono", rows: 2, "aria-label": "Cabeçalho TCP em hexadecimal", spellcheck: "false" });
        campo.value = AMOSTRAS[0][1];
        var botoes = el("div", { class: "d-flex flex-wrap gap-2 mb-2" });
        AMOSTRAS.forEach(function (a) { botoes.append(u.botao(a[0], "btn-outline-secondary", function () { campo.value = a[1]; mostra(); })); });
        var saida = el("div", { class: "mt-2", "aria-live": "polite" });
        function mostra() {
            var h = campo.value.replace(/[^0-9a-fA-F]/g, "");
            var bytes = []; for (var i = 0; i + 1 < h.length; i += 2) bytes.push(parseInt(h.slice(i, i + 2), 16));
            var r = leTcp(bytes);
            if (!r) { saida.textContent = "São necessários pelo menos 20 bytes (o cabeçalho mínimo)."; return; }
            var linhas = [
                ["Porta de origem", String(r.portaO)], ["Porta de destino", String(r.portaD)],
                ["Número de sequência", r.seq + " (0x" + r.seq.toString(16) + ")"], ["Número de confirmação", r.ack + (r.flags.indexOf("ACK") < 0 ? " (ignorado: ACK desligado)" : "")],
                ["Tamanho do cabeçalho (THL)", (r.thl / 4) + " palavras de 32 bits = " + r.thl + " bytes"], ["Flags", r.flags.join(" + ") || "nenhuma"],
                ["Janela", r.janela + " bytes"], ["Checksum", "0x" + hex4(r.checksum)], ["Opções", r.opcoes.join(" · ") || "nenhuma"]
            ];
            saida.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mb-0" },
                el("tbody", null, linhas.map(function (l) { return el("tr", null, el("th", { scope: "row", class: "fw-normal text-muted" }, l[0]), el("td", { class: "mono" }, l[1])); })))));
        }
        campo.addEventListener("input", mostra);
        var r1 = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Porta de destino" });
        var r2 = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "MSS" });
        var r3 = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Tamanho do cabeçalho" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "tcp-cabecalho", 15, "Ler porta, MSS e tamanho de um cabeçalho TCP");
        raiz.append(botoes, u.campo("Cabeçalho TCP (hexadecimal)", campo), saida,
            el("p", { class: "small fw-semibold mt-3 mb-1" }, "Desafio (15 pts): leia os bytes do \"SYN do cliente\", sem usar a tabela: 2 bytes de porta de origem, 2 de destino… e as opções no fim."),
            el("div", { class: "row g-2" },
                el("div", { class: "col-sm-4" }, u.campo("Porta de destino", r1)),
                el("div", { class: "col-sm-4" }, u.campo("MSS anunciado (bytes)", r2)),
                el("div", { class: "col-sm-4" }, u.campo("Tamanho do cabeçalho (bytes)", r3))),
            u.botao("Conferir", "btn-primary", function () {
                var ok = Number(r1.value) === 443 && Number(r2.value) === 1440 && Number(r3.value) === 32;
                u.marca(fb, ok, ok ? "Isso: 0x01bb = 443; a opção 02 04 05 a0 é o MSS 0x05a0 = 1440; o THL 8 (o 8 de 0x80) dá 8 × 4 = 32 bytes." : "Ainda não. Dica: 0x01bb, 0x05a0 e o primeiro dígito do byte 13 (0x80).");
                if (ok) concluir();
            }), fb);
        mostra();
    });

    /* ------------------------------------------------------------------
     * 3. Abertura: os estados da máquina (pág. 189–192 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("fsm-abertura", function (raiz) {
        var cenario = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "normal" }, "Abertura normal (three-way handshake)"),
            el("option", { value: "recusa" }, "Abertura recusada pelo servidor"),
            el("option", { value: "simultanea" }, "Abertura simultânea"));
        var area = el("div", { class: "mt-2" });
        var texto = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function desenha() {
            var ev, t;
            if (cenario.value === "normal") {
                ev = [{ nota: 0, rotulo: "SYN SENT", t: 0 }, { de: 0, para: 1, rotulo: "SYN seq=x", t0: 0.6, t1: 2 }, { nota: 1, rotulo: "SYN RCVD", t: 2 },
                    { de: 1, para: 0, rotulo: "SYN+ACK seq=y ack=x+1", t0: 2.6, t1: 4 }, { nota: 0, rotulo: "ESTABLISHED", t: 4 },
                    { de: 0, para: 1, rotulo: "ACK seq=x+1 ack=y+1", t0: 4.6, t1: 6 }, { nota: 1, rotulo: "ESTABLISHED", t: 6 }];
                t = "O SYN e o SYN+ACK consomem um número de sequência cada. O cliente considera a conexão aberta ao receber o SYN+ACK; o servidor, ao receber o ACK. O primeiro byte de dados do cliente terá o número x+1, e o do servidor, y+1.";
            } else if (cenario.value === "recusa") {
                ev = [{ nota: 0, rotulo: "SYN SENT", t: 0 }, { de: 0, para: 1, rotulo: "SYN seq=x", t0: 0.6, t1: 2 }, { nota: 1, rotulo: "ninguém escuta a porta", t: 2 },
                    { de: 1, para: 0, rotulo: "RST+ACK ack=x+1", t0: 2.6, t1: 4, tipo: "erro" }, { nota: 0, rotulo: "conexão recusada", t: 4 }];
                t = "Sem processo na porta de destino, sem recursos ou por política, o servidor recusa com um segmento RST cujo número de confirmação é o do SYN mais 1 (Fig. 23).";
            } else {
                ev = [{ nota: 0, rotulo: "SYN SENT", t: 0 }, { nota: 1, rotulo: "SYN SENT", t: 0 },
                    { de: 0, para: 1, rotulo: "SYN seq=x", t0: 0.6, t1: 2 }, { de: 1, para: 0, rotulo: "SYN seq=y", t0: 0.6, t1: 2 },
                    { nota: 0, rotulo: "SYN RCVD", t: 2 }, { nota: 1, rotulo: "SYN RCVD", t: 2 },
                    { de: 0, para: 1, rotulo: "SYN+ACK seq=x ack=y+1", t0: 2.6, t1: 4 }, { de: 1, para: 0, rotulo: "SYN+ACK seq=y ack=x+1", t0: 2.6, t1: 4 },
                    { nota: 0, rotulo: "ESTABLISHED", t: 4 }, { nota: 1, rotulo: "ESTABLISHED", t: 4 }];
                t = "Os dois lados mandam SYN ao mesmo tempo, passam por SYN RCVD ao receber o SYN do outro e chegam a ESTABLISHED com o SYN+ACK (Fig. 25). Só acontece se as portas coincidirem, por exemplo entre pares que não usam portas efêmeras.";
            }
            area.replaceChildren(R.diagramaSequencia({ titulo: cenario.options[cenario.selectedIndex].text, colunas: ["Cliente", "Servidor"], eventos: ev, passo: 28, margem: 150, largura: 720 }));
            texto.textContent = t;
        }
        cenario.addEventListener("change", desenha);
        raiz.append(u.campo("Cenário", cenario), area, texto);
        desenha();
    });

    /* ------------------------------------------------------------------
     * 4. SYN flood e SYN cookies (pág. 192–193 do PDF)
     * ------------------------------------------------------------------ */
    function simulaSynFlood(taxaAtaque, cookies) {
        var fila = [], ok = 0, falha = 0, accA = 0, accL = 0;
        for (var passo = 0; passo < 2000; passo++) {           // 20 s em passos de 10 ms
            fila = fila.filter(function (expira) { return expira > passo; });
            accA += taxaAtaque * 0.01;
            while (accA >= 1) { accA -= 1; if (!cookies && fila.length < 100) fila.push(passo + 300); }   // SYN falso: TCB preso por 3 s
            accL += 20 * 0.01;
            while (accL >= 1) {
                accL -= 1;
                if (cookies) ok++;
                else if (fila.length < 100) { ok++; fila.push(passo + 5); }   // cliente legítimo responde em 50 ms
                else falha++;
            }
        }
        return 100 * ok / (ok + falha);
    }
    R.simulaSynFlood = simulaSynFlood;

    R.registrar("syn-flood", function (raiz) {
        var taxa = faixa("SYNs falsos por segundo (com endereços de origem forjados)", 0, 300, 5, 20, function (v) { return v + "/s"; });
        var cookies = caixa("Servidor usa SYN cookies", false);
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "syn-flood", 15, "Derrubar um servidor com SYN flood e protegê-lo com SYN cookies");
        function roda() {
            var r = Number(taxa.input.value), p = simulaSynFlood(r, cookies.input.checked);
            saida.replaceChildren(el("div", null, "Clientes legítimos atendidos: ", el("strong", null, num(p, 0) + "%"), " (20 por segundo, durante 20 s)."),
                el("div", { class: "progress mt-1", style: "height:12px", role: "img", "aria-label": num(p, 0) + "% dos clientes atendidos" }, el("div", { class: "progress-bar " + (p < 50 ? "bg-danger" : "bg-success"), style: "width:" + p + "%" })));
            if (!cookies.input.checked && p < 50) vistos.derrubou = true;
            if (cookies.input.checked && r >= 50 && p > 99) vistos.protegeu = true;
            if (vistos.derrubou && vistos.protegeu) { u.marca(fb, true, "Sem cookies, poucos SYNs por segundo lotam os 100 TCBs em SYN RCVD; com cookies, o servidor não guarda estado até receber o ACK, e o ataque perde o efeito."); concluir(); }
            else { fb.className = "small mt-2 mb-0"; fb.textContent = (vistos.derrubou ? "✔ Servidor derrubado. Agora ligue os SYN cookies (com o ataque em pelo menos 50/s)." : "Aumente o ataque até menos da metade dos clientes ser atendida."); }
        }
        [taxa.input, cookies.input].forEach(function (c) { c.addEventListener("input", roda); c.addEventListener("change", roda); });
        raiz.append(el("p", { class: "small mb-2" }, "O servidor guarda no máximo 100 TCBs em SYN RCVD, e um TCB de SYN falso fica lá 3 s esperando um ACK que nunca vem."),
            taxa.linha, cookies.linha, saida, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): derrube o servidor e depois proteja-o com SYN cookies."));
        roda();
    });

    /* ------------------------------------------------------------------
     * 5. O algoritmo de Nagle (pág. 195–196 do PDF)
     * ------------------------------------------------------------------ */
    var TEXTO_NAGLE = "ls -la /home/alice\n";
    function simulaNagle(texto, intervalo, rtt, nagle) {
        var chegadas = texto.split("").map(function (c, i) { return [i * intervalo, c]; });
        var segs = [], buffer = "", ackEm = null, i = 0, t;
        while (i < chegadas.length || buffer) {
            var prox = i < chegadas.length ? chegadas[i][0] : null;
            if (ackEm !== null && (prox === null || ackEm <= prox)) { t = ackEm; ackEm = null; }
            else { t = chegadas[i][0]; buffer += chegadas[i][1]; i++; }
            if (buffer && (!nagle || ackEm === null)) { segs.push([t, buffer]); buffer = ""; ackEm = t + rtt; }
        }
        return segs;
    }
    R.simulaNagle = function (rtt, nagle) { return simulaNagle(TEXTO_NAGLE, 100, rtt, nagle); };

    R.registrar("nagle", function (raiz) {
        var rtt = faixa("RTT", 20, 1000, 10, 300, function (v) { return v + " ms"; });
        var nagle = caixa("Algoritmo de Nagle ligado", true);
        var segs = el("div", { class: "d-flex flex-wrap mt-2" });
        var resumo = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "nagle", 10, "Ver o Nagle agrupar caracteres");
        function roda() {
            var s = simulaNagle(TEXTO_NAGLE, 100, Number(rtt.input.value), nagle.input.checked);
            segs.replaceChildren();
            s.forEach(function (x) { segs.append(el("span", { class: "byte-cell" }, JSON.stringify(x[1]).slice(1, -1), el("small", null, x[0] + " ms"))); });
            resumo.textContent = s.length + " segmentos para " + TEXTO_NAGLE.length + " bytes de dados: " + 40 * s.length + " bytes de cabeçalho TCP e IPv4 (20 + 20 por segmento).";
            if (nagle.input.checked && s.length <= 5) { u.marca(fb, true, "Com RTT longo, o Nagle junta o que foi digitado enquanto espera o ACK: um segmento parcial por RTT."); concluir(); }
            else fb.textContent = "";
        }
        [rtt.input, nagle.input].forEach(function (c) { c.addEventListener("input", roda); c.addEventListener("change", roda); });
        raiz.append(el("p", { class: "small mb-2" }, "Alice digita \"ls -la /home/alice\" e Enter numa sessão ssh, um caractere a cada 100 ms."),
            rtt.linha, nagle.linha, segs, resumo, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): com o Nagle ligado, ache um RTT em que os 19 caracteres viajem em no máximo 5 segmentos."));
        roda();
    });

    /* ------------------------------------------------------------------
     * 6. A janela de 16 bits e a escala de janela (pág. 196–197 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("escala-janela", function (raiz) {
        var rtt = faixa("RTT", 1, 500, 1, 100, function (v) { return v + " ms"; });
        var banda = faixa("Vazão desejada", 1, 10000, 1, 1000, function (v) { return num(v) + " Mbit/s"; });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        function desenha() {
            var T = Number(rtt.input.value) / 1000, B = Number(banda.input.value) * 1e6;
            var janela = B * T / 8, max16 = 65535 * 8 / T / 1e6;
            var S = 0; while (65535 * Math.pow(2, S) < janela && S < 14) S++;
            var cabe = 65535 * Math.pow(2, S) >= janela;
            saida.replaceChildren(
                el("div", null, "Janela necessária = vazão × RTT = ", el("strong", null, num(janela) + " bytes")),
                el("div", null, "Sem escala (janela de até 65 535 bytes), a vazão máxima é ", el("strong", null, num(max16, 2) + " Mbit/s")),
                el("div", null, cabe ? "Menor fator de escala que basta: " : "Nem com o fator máximo (14) dá: ", el("strong", null, "S = " + S),
                    " → janela anunciada até 65 535 × 2^" + S + " = " + num(65535 * Math.pow(2, S)) + " bytes"));
        }
        [rtt.input, banda.input].forEach(function (c) { c.addEventListener("input", desenha); });
        raiz.append(rtt.linha, banda.linha, saida,
            desafioNumero(raiz, "escala-janela", 10, "Calcular o fator de escala da janela",
                "qual é o menor fator de escala S que permite 1 Gbit/s com RTT de 100 ms?",
                function (v) { return v === 8; }, "Isso: são 12,5 MB de janela; 65 535 × 2^7 ≈ 8,4 MB não basta, e 65 535 × 2^8 ≈ 16,8 MB basta.", "Ainda não. Calcule a janela (vazão × RTT / 8) e compare com 65 535 × 2^S."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 7. O cálculo do rto (pág. 197–199 do PDF)
     * ------------------------------------------------------------------ */
    function jacobson(medidas) {
        var out = [], srtt = null, var_ = null;
        medidas.forEach(function (rtt) {
            if (srtt === null) { srtt = rtt; var_ = rtt / 2; }
            else { var_ = 0.75 * var_ + 0.25 * Math.abs(srtt - rtt); srtt = 0.875 * srtt + 0.125 * rtt; }
            out.push({ rtt: rtt, srtt: srtt, rttvar: var_, rto: srtt + 4 * var_ });
        });
        return out;
    }
    function rfc793(medidas) {
        var out = [], srtt = null;
        medidas.forEach(function (rtt) { srtt = srtt === null ? rtt : 0.875 * srtt + 0.125 * rtt; out.push(Math.min(60000, Math.max(1000, 2 * srtt))); });
        return out;
    }
    R.jacobson = jacobson;

    R.registrar("calculo-rto", function (raiz) {
        var campo = entrada("500, 550, 450, 500, 2000, 2100, 1900, 500, 500", "Medidas de RTT em ms");
        var grafico = el("div", { class: "mt-2" });
        var tabela = el("div", { class: "mt-2" });
        function desenha() {
            var m = campo.value.split(",").map(function (x) { return Number(x.trim()); }).filter(function (x) { return x > 0 && isFinite(x); }).slice(0, 30);
            if (!m.length) { tabela.textContent = "Digite medidas positivas separadas por vírgula."; grafico.replaceChildren(); return; }
            var j = jacobson(m), v = rfc793(m);
            var maxY = Math.max.apply(null, j.map(function (x) { return x.rto; }).concat(v, m)) * 1.1;
            var W = 640, H = 220, ml = 50, mb = 26, sx = (W - ml - 10) / Math.max(1, m.length - 1), sy = (H - mb - 10) / maxY;
            function P(i, y) { return (ml + i * sx).toFixed(1) + "," + (H - mb - y * sy).toFixed(1); }
            var svg = u.svg("svg", { viewBox: "0 0 " + W + " " + H, class: "sim-svg w-100", role: "img", "aria-label": "RTT medido, rto de Jacobson e rto do RFC 793 a cada medida" });
            svg.append(u.svg("title", { text: "RTT medido e rto calculado" }), u.svg("text", { x: 4, y: 12, "font-size": 11 }, "ms"));
            [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
                var y = maxY * f;
                svg.append(u.svg("line", { x1: ml, x2: W - 10, y1: H - mb - y * sy, y2: H - mb - y * sy, stroke: "currentColor", "stroke-opacity": 0.15 }),
                    u.svg("text", { x: ml - 6, y: H - mb - y * sy + 4, "text-anchor": "end", "font-size": 11 }, num(y)));
            });
            function linha(pontos, cor, tracejado) { svg.append(u.svg("polyline", { points: pontos.map(function (y, i) { return P(i, y); }).join(" "), fill: "none", stroke: cor, "stroke-width": 2.5, "stroke-dasharray": tracejado ? "6 4" : null })); }
            linha(m, "#adb5bd"); linha(j.map(function (x) { return x.rto; }), "#0d6efd"); linha(v, "#d63384", true);
            m.forEach(function (y, i) { svg.append(u.svg("circle", { cx: ml + i * sx, cy: H - mb - y * sy, r: 3.5, fill: "#6c757d" })); });
            grafico.replaceChildren(svg, el("p", { class: "small mb-0" }, el("span", { style: "color:#6c757d", "aria-hidden": "true" }, "● "), "RTT medido  ",
                el("span", { style: "color:#0d6efd", "aria-hidden": "true" }, "━ "), "rto de Jacobson  ", el("span", { style: "color:#d63384", "aria-hidden": "true" }, "╍ "), "rto do RFC 793 (2 × srtt, mínimo 1 s)"));
            tabela.replaceChildren(el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mono mb-0" },
                el("thead", null, el("tr", null, ["rtt", "srtt", "rttvar", "rto (Jacobson)", "rto (RFC 793)"].map(function (h) { return el("th", null, h); }))),
                el("tbody", null, j.map(function (x, i) {
                    return el("tr", { class: v[i] < x.rtt ? "table-danger" : null }, el("td", null, num(x.rtt)), el("td", null, num(x.srtt, 1)), el("td", null, num(x.rttvar, 1)), el("td", null, num(x.rto, 1)), el("td", null, num(v[i], 1) + (v[i] < x.rtt ? " < rtt!" : "")));
                })))));
        }
        campo.addEventListener("input", desenha);
        raiz.append(u.campo("Medidas de RTT (ms), separadas por vírgula", campo), grafico, tabela,
            el("p", { class: "small text-muted mt-1 mb-0" }, "Linhas destacadas: o rto do RFC 793 ficou menor que o RTT real, e o emissor retransmitiria sem necessidade."),
            desafioNumero(raiz, "rto-jacobson", 15, "Calcular o rto de Jacobson",
                "para as medidas 100, 100, 100 e 300 ms, qual é o rto de Jacobson depois da quarta medida (em ms, uma casa decimal)?",
                function (v) { return Math.abs(v - 409.4) < 0.15; }, "Isso: srtt = 125, rttvar ≈ 71,1 e rto = 125 + 4 × 71,1 ≈ 409,4 ms. O salto pesou mais no rttvar do que no srtt.", "Ainda não. Use a ferramenta acima com essas quatro medidas, ou faça as contas com α = 1/8 e β = 1/4 (o rttvar usa o srtt antigo)."));
        desenha();
    });

    /* ------------------------------------------------------------------
     * 8. Retransmissão rápida e SACK (pág. 197–199 do PDF)
     * ------------------------------------------------------------------ */
    function recepcao(n, perdidos) {
        var recebidos = {}, acks = [];
        for (var seg = 1; seg <= n; seg++) {
            if (perdidos[seg]) continue;
            recebidos[seg] = true;
            var prox = 1; while (recebidos[prox]) prox++;
            var blocos = [], s = prox + 1;
            while (s <= n) {
                if (recebidos[s]) { var ini = s; while (recebidos[s + 1]) s++; blocos.push([ini, s]); }
                s++;
            }
            blocos.sort(function (a, b) {          // primeiro o bloco que acabou de mudar, depois os mais altos
                var ca = a[0] <= seg && seg <= a[1] ? 0 : 1, cb = b[0] <= seg && seg <= b[1] ? 0 : 1;
                return ca - cb || b[0] - a[0];
            });
            acks.push({ chegou: seg, ack: prox, sack: blocos.slice(0, 3) });
        }
        return acks;
    }
    function rapida(acks) {
        var dup = 0, ultimo = null;
        for (var i = 0; i < acks.length; i++) {
            dup = acks[i].ack === ultimo ? dup + 1 : 0;
            ultimo = acks[i].ack;
            if (dup === 3) return { seg: acks[i].ack, depois: acks[i].chegou };
        }
        return null;
    }
    R.recepcaoTcp = recepcao; R.retransmissaoRapida = rapida;

    R.registrar("fast-retransmit", function (raiz) {
        var N = 10, caixas = [];
        var linhaCx = el("div", { class: "d-flex flex-wrap gap-2" });
        for (var i = 1; i <= N; i++) {
            var c = caixa(String(i), i === 4);
            caixas.push(c.input);
            linhaCx.append(c.linha);
        }
        var log = el("ul", { class: "log mt-2" });
        var fb = u.feedback(), vistos = {};
        var concluir = R.desafio(raiz, "fast-retransmit", 15, "Ver a retransmissão rápida funcionar e falhar");
        function roda() {
            var perdidos = {};
            caixas.forEach(function (c, i) { if (c.checked) perdidos[i + 1] = true; });
            var acks = recepcao(N, perdidos), r = rapida(acks);
            log.replaceChildren();
            if (!Object.keys(perdidos).length) { log.append(el("li", null, "Nada se perdeu: os ACKs avançam 2, 3, … 11.")); fb.textContent = ""; return; }
            var anterior = null;
            acks.forEach(function (a) {
                var dup = a.ack === anterior;
                log.append(el("li", { class: dup ? "text-danger" : null }, "chegou " + a.chegou + " → ACK " + a.ack + (dup ? " (duplicado)" : "") + (a.sack.length ? "  SACK " + a.sack.map(function (b) { return b[0] === b[1] ? b[0] : b[0] + "–" + b[1]; }).join(", ") : "")));
                anterior = a.ack;
            });
            if (r) { vistos.rapida = true; u.marca(fb, true, "Três ACKs duplicados depois do segmento " + r.depois + ": o emissor retransmite o " + r.seg + " sem esperar o rto."); }
            else { vistos.rto = true; u.marca(fb, false, "Menos de três ACKs duplicados: o emissor só percebe a perda quando o rto expira."); }
            if (vistos.rapida && vistos.rto) { concluir(); fb.textContent += " Você viu os dois casos."; }
        }
        caixas.forEach(function (c) { c.addEventListener("change", roda); });
        raiz.append(el("p", { class: "small mb-2" }, "O emissor manda os segmentos 1 a 10 de uma vez. Marque os que se perdem (os números são de segmentos, não de bytes)."),
            linhaCx, log, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): ache uma perda que a retransmissão rápida resolve e outra que obriga o emissor a esperar o rto."));
        roda();
    });

    /* ------------------------------------------------------------------
     * 9. Liberação da conexão (pág. 199–201 do PDF)
     * ------------------------------------------------------------------ */
    R.registrar("fsm-fechamento", function (raiz) {
        var cenario = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "normal" }, "O cliente fecha primeiro"),
            el("option", { value: "simultaneo" }, "Fechamento simultâneo"),
            el("option", { value: "perdido" }, "O último ACK se perde"),
            el("option", { value: "rst" }, "Liberação abrupta (RST)"));
        var area = el("div", { class: "mt-2" });
        var texto = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function desenha() {
            var ev, t, v = cenario.value;
            if (v === "normal") {
                ev = [{ nota: 0, rotulo: "FIN_WAIT1", t: 0 }, { de: 0, para: 1, rotulo: "FIN seq=z+1", t0: 0.6, t1: 2 }, { nota: 1, rotulo: "CLOSE_WAIT", t: 2 },
                    { de: 1, para: 0, rotulo: "ACK z+2", t0: 2.6, t1: 4 }, { nota: 0, rotulo: "FIN_WAIT2", t: 4 }, { nota: 1, rotulo: "(ainda pode enviar dados)", t: 3.3 },
                    { nota: 1, rotulo: "LAST_ACK", t: 5 }, { de: 1, para: 0, rotulo: "FIN", t0: 5.6, t1: 7 }, { nota: 0, rotulo: "TIME_WAIT (2 MSL)", t: 7 },
                    { de: 0, para: 1, rotulo: "ACK", t0: 7.6, t1: 9 }, { nota: 1, rotulo: "CLOSED", t: 9 }, { nota: 0, rotulo: "CLOSED, depois de 2 MSL", t: 10.5 }];
                t = "Cada lado fecha o seu sentido com um FIN, que consome um número de sequência e é confirmado. Quem fecha primeiro passa por FIN_WAIT1 e FIN_WAIT2; quem recebe o FIN, por CLOSE_WAIT e LAST_ACK. Quem manda o último ACK fica em TIME_WAIT por 2 MSL.";
            } else if (v === "simultaneo") {
                ev = [{ nota: 0, rotulo: "FIN_WAIT1", t: 0 }, { nota: 1, rotulo: "FIN_WAIT1", t: 0 },
                    { de: 0, para: 1, rotulo: "FIN", t0: 0.6, t1: 2 }, { de: 1, para: 0, rotulo: "FIN", t0: 0.6, t1: 2 },
                    { nota: 0, rotulo: "CLOSING", t: 2 }, { nota: 1, rotulo: "CLOSING", t: 2 },
                    { de: 0, para: 1, rotulo: "ACK", t0: 2.6, t1: 4 }, { de: 1, para: 0, rotulo: "ACK", t0: 2.6, t1: 4 },
                    { nota: 0, rotulo: "TIME_WAIT", t: 4 }, { nota: 1, rotulo: "TIME_WAIT", t: 4 }];
                t = "Se os dois mandam FIN ao mesmo tempo, cada um recebe o FIN do outro em FIN_WAIT1 e vai para CLOSING; com o ACK do seu FIN, vai para TIME_WAIT.";
            } else if (v === "perdido") {
                ev = [{ nota: 0, rotulo: "FIN_WAIT2", t: 0 }, { nota: 1, rotulo: "LAST_ACK", t: 0 }, { de: 1, para: 0, rotulo: "FIN", t0: 0.6, t1: 2 }, { nota: 0, rotulo: "TIME_WAIT", t: 2 },
                    { de: 0, para: 1, rotulo: "ACK", t0: 2.6, t1: 4, tipo: "perda" }, { nota: 1, rotulo: "temporizador expira", t: 4.6 },
                    { de: 1, para: 0, rotulo: "FIN (retransmitido)", t0: 5.2, t1: 6.6 }, { de: 0, para: 1, rotulo: "ACK", t0: 7.2, t1: 8.6 }, { nota: 1, rotulo: "CLOSED", t: 8.6 }];
                t = "O último ACK se perdeu, e o servidor retransmite o FIN. Como o cliente ainda está em TIME_WAIT, com o TCB guardado, ele repete o ACK. Sem o TIME_WAIT, responderia com RST, e a liberação não seria ordenada.";
            } else {
                ev = [{ nota: 0, rotulo: "ESTABLISHED", t: 0 }, { nota: 1, rotulo: "ESTABLISHED", t: 0 }, { de: 0, para: 1, rotulo: "RST seq=atual", t0: 0.6, t1: 2, tipo: "erro" },
                    { nota: 0, rotulo: "CLOSED (TCB descartado)", t: 2.4 }, { nota: 1, rotulo: "CLOSED", t: 2.4 }];
                t = "Um único segmento RST fecha os dois sentidos na hora, e dados ainda não entregues podem se perder. Ninguém responde a um RST com outro RST, para evitar \"guerras de RST\".";
            }
            area.replaceChildren(R.diagramaSequencia({ titulo: cenario.options[cenario.selectedIndex].text, colunas: ["Cliente", "Servidor"], eventos: ev, passo: 28, margem: 160, largura: 720 }));
            texto.textContent = t;
        }
        cenario.addEventListener("change", desenha);
        raiz.append(u.campo("Cenário", cenario), area, texto,
            desafioNumero(raiz, "time-wait", 10, "Calcular os TCBs em TIME_WAIT",
                "um servidor fecha 5 000 conexões por segundo, e o MSL é de 60 s. Quantos TCBs ele mantém em TIME_WAIT ao mesmo tempo?",
                function (v) { return v === 600000; }, "Isso: cada conexão fica 2 × 60 = 120 s em TIME_WAIT; 5 000 × 120 = 600 000 TCBs.", "Ainda não. Quanto tempo dura o TIME_WAIT, e quantas conexões entram nele nesse intervalo?"));
        desenha();
    });
}());
