/* Simulações do Capítulo 11 — Correio eletrônico (seção 3.3 do livro).
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
