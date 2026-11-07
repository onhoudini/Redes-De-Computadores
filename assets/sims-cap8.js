/* Simulações do Capítulo 8 — Segurança de redes. Cada uma é registrada em Redes.registrar.
 * Todas mostram apenas os mecanismos descritos no livro, com personagens e números fictícios. */
(function () {
    "use strict";
    var R = window.Redes;
    var u = R.util, el = u.el, svg = u.svg;

    function num(n, casas) { return n.toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }
    function faixa(rotulo, min, max, passo, valor) {
        var input = el("input", { type: "range", class: "form-range", min: min, max: max, step: passo, value: valor, id: u.novoId("faixa") });
        var mostra = el("span", { class: "fw-semibold" });
        var linha = el("div", { class: "mb-2" }, el("label", { class: "form-label small mb-0 d-flex justify-content-between", for: input.id }, rotulo, mostra), input);
        return { input: input, mostra: mostra, linha: linha };
    }
    function hex(bytes) { return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(" "); }

    /* ---------- SHA-256 (FIPS 180-4), para o efeito avalanche e a cadeia de hash ---------- */
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
    function sha256(texto) {
        var bytes = new TextEncoder().encode(texto);
        var blocos = (bytes.length + 9 + 63) >> 6;
        var buf = new Uint8Array(blocos * 64);
        buf.set(bytes);
        buf[bytes.length] = 0x80;
        var dv = new DataView(buf.buffer);
        var bits = bytes.length * 8;
        dv.setUint32(buf.length - 8, Math.floor(bits / 4294967296));
        dv.setUint32(buf.length - 4, bits >>> 0);
        var H = H0.slice(), W = new Uint32Array(64);
        for (var i = 0; i < blocos; i++) {
            for (var t = 0; t < 16; t++) W[t] = dv.getUint32(i * 64 + t * 4);
            for (t = 16; t < 64; t++) {
                var s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
                var s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
                W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
            }
            var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
            for (t = 0; t < 64; t++) {
                var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
                var ch = (e & f) ^ (~e & g);
                var t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
                var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
                var maj = (a & b) ^ (a & c) ^ (b & c);
                var t2 = (S0 + maj) >>> 0;
                h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
            }
            H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
            H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
        }
        return H.map(function (x) { return x.toString(16).padStart(8, "0"); }).join("");
    }
    R.sha256 = sha256;    // exposto para os testes automáticos

    /* ------------------------------------------------------------------
     * 1. Login remoto com usuário e senha (diagrama do livro, pág. 120)
     * ------------------------------------------------------------------ */
    R.registrar("login-senha", function (raiz) {
        raiz.append(R.diagramaSequencia({
            titulo: "Alice se autentica no computador de Bob mandando o nome de usuário e a senha em claro.",
            colunas: ["Host A (Alice)", "Host B (Bob)"],
            eventos: [
                { de: 0, para: 1, rotulo: "I'm Alice", rotuloOrigem: "DATA.req", rotuloDestino: "DATA.ind" },
                { de: 1, para: 0, rotulo: "Password:", rotuloOrigem: "DATA.req", rotuloDestino: "DATA.ind" },
                { de: 0, para: 1, rotulo: "1234xyz$", rotuloOrigem: "DATA.req", rotuloDestino: "DATA.ind" },
                { de: 1, para: 0, rotulo: "Access", rotuloOrigem: "DATA.req", rotuloDestino: "DATA.ind" }
            ],
            passo: 34, margem: 170
        }));
    });

    /* ------------------------------------------------------------------
     * 2. Eve escuta e reproduz (atacante passivo)
     * ------------------------------------------------------------------ */
    R.registrar("bisbilhotagem", function (raiz) {
        var modo = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "claro" }, "Senha em claro"),
            el("option", { value: "desafio" }, "Desafio-resposta com nonce"));
        var area = el("div", { class: "mt-2" });
        var gravado = el("pre", { class: "log mb-0", "aria-live": "polite" });
        var fb = u.feedback();
        var sorteio = u.aleatorio(17);
        var concluir = R.desafio(raiz, "eve-reproduz", 15, "Reprodução com e sem desafio-resposta");
        var feito = {}, captura = null;

        function nonce() { return String(100000 + Math.floor(sorteio() * 900000)); }
        function login() {
            var eventos;
            if (modo.value === "claro") {
                captura = { tipo: "claro", senha: "1234xyz$" };
                eventos = [{ de: 0, para: 2, rotulo: "I'm Alice" }, { de: 2, para: 0, rotulo: "Password:" }, { de: 0, para: 2, rotulo: "1234xyz$" }, { de: 2, para: 0, rotulo: "Access" }];
            } else {
                var n = nonce();
                captura = { tipo: "desafio", nonce: n, resposta: "Hash(" + n + "||passwd)" };
                eventos = [{ de: 0, para: 2, rotulo: "I'm Alice" }, { de: 2, para: 0, rotulo: "Challenge:" + n }, { de: 0, para: 2, rotulo: captura.resposta }, { de: 2, para: 0, rotulo: "Access" }];
            }
            eventos.push({ nota: 1, rotulo: "Eve copia tudo o que passa" });
            area.replaceChildren(R.diagramaSequencia({ titulo: "Alice se autentica em Bob enquanto Eve, no meio do caminho, grava as mensagens.", colunas: ["Alice", "Eve", "Bob"], eventos: eventos, passo: 30, margem: 110 }));
            gravado.textContent = "Eve gravou:\n" + eventos.filter(function (e) { return e.rotulo && e.de !== undefined; }).map(function (e) { return "  " + e.rotulo; }).join("\n");
            fb.textContent = "";
        }
        function reproduz() {
            if (!captura || captura.tipo !== modo.value) { u.marca(fb, false, "Primeiro deixe Alice fazer login neste modo, para Eve ter o que gravar."); return; }
            var eventos, ok;
            if (modo.value === "claro") {
                eventos = [{ de: 1, para: 2, rotulo: "I'm Alice" }, { de: 2, para: 1, rotulo: "Password:" }, { de: 1, para: 2, rotulo: captura.senha }, { de: 2, para: 1, rotulo: "Access", tipo: "erro" }];
                ok = true;
            } else {
                var n = nonce();
                eventos = [{ de: 1, para: 2, rotulo: "I'm Alice" }, { de: 2, para: 1, rotulo: "Challenge:" + n }, { de: 1, para: 2, rotulo: captura.resposta }, { de: 2, para: 1, rotulo: "Recusado", tipo: "ok" }];
                ok = false;
            }
            area.replaceChildren(R.diagramaSequencia({ titulo: ok ? "Eve repete a senha capturada e entra como Alice." : "Bob manda um nonce novo; a resposta antiga de Eve não confere.", colunas: ["Alice", "Eve", "Bob"], eventos: eventos, passo: 30, margem: 110 }));
            if (ok) { feito.claro = true; u.marca(fb, false, "Eve entrou como Alice: bastou repetir a senha que viu passar."); }
            else { feito.desafio = true; u.marca(fb, true, "Recusado: o nonce mudou, e Eve não consegue calcular Hash(nonce||senha) sem a senha."); }
            if (feito.claro && feito.desafio) concluir();
        }
        modo.addEventListener("change", function () { captura = null; area.replaceChildren(); gravado.textContent = ""; fb.textContent = ""; });

        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-5" }, u.campo("Como Alice se autentica", modo)),
                el("div", { class: "col-sm-7 mb-2 d-flex gap-2 flex-wrap" },
                    u.botao("Alice faz login", "btn-primary", login),
                    u.botao("Eve tenta entrar como Alice", "btn-outline-danger", reproduz))),
            area, gravado, fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): faça Eve entrar com a senha em claro e depois veja a mesma tentativa falhar com desafio-resposta (livro, pág. 120–121 e 126 do PDF)."));
    });

    /* ------------------------------------------------------------------
     * 3. Mallory no meio (atacante ativo)
     * ------------------------------------------------------------------ */
    R.registrar("mallory", function (raiz) {
        var comando = el("input", { class: "form-control form-control-sm mono", value: "TRANSFIRA 10 PARA CARLOS" });
        var ativo = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("mitm"), checked: true });
        var area = el("div", { class: "mt-2" });
        function render() {
            var c = comando.value.trim() || "LISTE MEUS ARQUIVOS";
            var alterado = ativo.checked ? c.replace(/\d+/g, function (n) { return String(Number(n) * 100); }).replace(/PARA \w+/i, "PARA MALLORY") : c;
            if (ativo.checked && alterado === c) alterado = c + " E APAGUE TUDO";
            var eventos = [
                { de: 0, para: 1, rotulo: c },
                { de: 1, para: 2, rotulo: alterado, tipo: ativo.checked ? "erro" : "ok" },
                { de: 2, para: 1, rotulo: "OK: " + alterado.slice(0, 22) + (alterado.length > 22 ? "…" : "") },
                { de: 1, para: 0, rotulo: "OK: " + c.slice(0, 22) + (c.length > 22 ? "…" : ""), tipo: ativo.checked ? "erro" : "ok" }
            ];
            area.replaceChildren(R.diagramaSequencia({
                titulo: ativo.checked ? "Mallory recebe o comando de Alice, altera-o antes de entregar a Bob e altera também a resposta de volta." : "Sem Mallory, o roteador do meio só repassa as mensagens.",
                colunas: ["Alice", ativo.checked ? "Mallory (roteador)" : "Roteador", "Bob (servidor)"], eventos: eventos, passo: 30, margem: 110
            }), el("p", { class: "small mb-0 " + (ativo.checked ? "quiz-no" : "quiz-ok") }, ativo.checked
                ? "Bob executou “" + alterado + "”, e Alice recebeu uma confirmação do que ela pediu: nenhum dos dois percebe."
                : "Bob recebe exatamente o comando de Alice."));
        }
        comando.addEventListener("input", render);
        ativo.addEventListener("change", render);
        raiz.append(
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-8" }, u.campo("Comando de Alice", comando)),
                el("div", { class: "col-sm-4" }, el("div", { class: "form-check mb-2" }, ativo, el("label", { class: "form-check-label small", for: ativo.id }, "Mallory controla o roteador")))),
            area);
        render();
    });

    /* ------------------------------------------------------------------
     * 4. Reflexão e amplificação (números ilustrativos)
     * ------------------------------------------------------------------ */
    R.registrar("amplificacao", function (raiz) {
        var banda = faixa("Banda que Mallory gasta enviando requisições (Gbit/s)", 0.5, 10, 0.5, 2);
        var req = faixa("Tamanho da requisição (bytes)", 50, 500, 10, 60);
        var resp = faixa("Tamanho da resposta (bytes)", 50, 5000, 50, 3000);
        var refl = faixa("Servidores usados como refletores", 1, 1000, 1, 100);
        var verifica = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("verif") });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var palpite = el("input", { type: "number", class: "form-control form-control-sm", step: "0.1", min: "0", "aria-label": "Tráfego que chega a Alice, em Gbit/s" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "amplificacao-calcular", 10, "Calcular o tráfego de amplificação");

        function valores() {
            var k = verifica.checked ? Math.min(1, Number(resp.input.value) / Number(req.input.value)) : Number(resp.input.value) / Number(req.input.value);
            return { k: k, vitima: Number(banda.input.value) * k };
        }
        function render() {
            banda.mostra.textContent = num(Number(banda.input.value), 1);
            req.mostra.textContent = req.input.value; resp.mostra.textContent = resp.input.value; refl.mostra.textContent = refl.input.value;
            var v = valores();
            saida.replaceChildren(
                el("p", { class: "mb-1" }, "Fator de amplificação k = resposta / requisição = ", el("strong", null, num(v.k, 1)), verifica.checked ? " (os servidores só respondem grande depois de confirmar a origem)" : ""),
                el("p", { class: "mb-1" }, "Cada refletor manda a Alice cerca de " + num(v.vitima / Number(refl.input.value) * 1000, 1) + " Mbit/s; nenhum deles parece um atacante."),
                el("p", { class: "mb-0 text-muted" }, "Alice vê o ataque vindo dos refletores, não de Mallory, que pôs o endereço de Alice como origem das requisições."));
            fb.textContent = "";
        }
        [banda, req, resp, refl].forEach(function (f) { f.input.addEventListener("input", render); });
        verifica.addEventListener("change", render);
        function conferir() {
            var v = valores(), p = Number(palpite.value);
            if (Math.abs(p - v.vitima) <= Math.max(0.05, v.vitima * 0.01)) { u.marca(fb, true, "Isso: " + num(v.vitima, 1) + " Gbit/s chegam a Alice, k vezes a banda de Mallory."); concluir(); }
            else u.marca(fb, false, "Multiplique a banda de Mallory pelo fator k.");
        }

        raiz.append(
            el("div", { class: "row g-3" },
                el("div", { class: "col-md-6" }, banda.linha, req.linha),
                el("div", { class: "col-md-6" }, resp.linha, refl.linha)),
            el("div", { class: "form-check" }, verifica, el("label", { class: "form-check-label small", for: verifica.id }, "Os servidores confirmam a origem antes de mandar uma resposta grande")),
            saida,
            el("div", { class: "row g-2 align-items-end mt-1" },
                el("div", { class: "col-sm-6" }, u.campo("Quantos Gbit/s chegam a Alice?", palpite)),
                el("div", { class: "col-sm-6 mb-2" }, u.botao("Conferir", "btn-primary", conferir))),
            fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Valores ilustrativos. Desafio (10 pts): calcule o tráfego que chega à vítima com a configuração atual (livro, pág. 122 do PDF)."));
        render();
    });

    /* ------------------------------------------------------------------
     * 5a. Cifra de César
     * ------------------------------------------------------------------ */
    var ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    function cesar(texto, k) {
        return Array.from(texto.toUpperCase()).map(function (c) {
            var i = ALFABETO.indexOf(c);
            return i < 0 ? c : ALFABETO[((i + k) % 26 + 26) % 26];
        }).join("");
    }

    R.registrar("cesar", function (raiz) {
        var texto = el("input", { class: "form-control form-control-sm mono", value: "SECRET" });
        var chave = faixa("Chave k (deslocamento)", 0, 25, 1, 3);
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        var CIFRADA = cesar("REDES SAO DIVERTIDAS", 9);
        var palpite = el("input", { type: "number", class: "form-control form-control-sm", min: 1, max: 25, "aria-label": "Chave usada na mensagem interceptada" });
        var tentativas = el("ul", { class: "log mt-2", hidden: true });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "cesar-quebrar", 10, "Quebrar a cifra de César");

        function render() {
            var k = Number(chave.input.value);
            chave.mostra.textContent = k;
            saida.replaceChildren("Cifrado: ", el("strong", { class: "mono" }, cesar(texto.value, k)), " · decifrar é deslocar −" + k + ".");
        }
        texto.addEventListener("input", render);
        chave.input.addEventListener("input", render);
        function mostraTodas() {
            tentativas.hidden = false;
            tentativas.replaceChildren.apply(tentativas, Array.from({ length: 25 }, function (_, i) { return el("li", null, "k = " + (i + 1) + ": " + cesar(CIFRADA, -(i + 1))); }));
        }
        function conferir() {
            if (Number(palpite.value) === 9) { u.marca(fb, true, "k = 9: “REDES SAO DIVERTIDAS”. Com só 25 chaves, a força bruta é imediata."); concluir(); }
            else u.marca(fb, false, "Ainda não. Teste as 25 chaves e procure o texto que faz sentido.");
        }
        raiz.append(u.campo("Texto", texto), chave.linha, saida, el("hr"),
            el("p", { class: "small mb-1" }, "Eve interceptou: ", el("strong", { class: "mono" }, CIFRADA)),
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-4" }, u.campo("Chave usada", palpite)),
                el("div", { class: "col-sm-8 mb-2 d-flex gap-2 flex-wrap" }, u.botao("Conferir", "btn-primary", conferir), u.botao("Testar as 25 chaves", "btn-outline-secondary", mostraTodas))),
            fb, tentativas,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (10 pts): descubra a chave da mensagem interceptada (livro, pág. 122 do PDF)."));
        render();
    });

    /* ------------------------------------------------------------------
     * 5b. XOR, one-time pad e o perigo de reutilizar a chave
     * ------------------------------------------------------------------ */
    R.registrar("xor-otp", function (raiz) {
        var enc = new TextEncoder(), dec = new TextDecoder();
        var M1 = "ATACAR", M2 = "RECUAR";
        var sorteio = u.aleatorio(77);
        var chave = Array.from({ length: 6 }, function () { return Math.floor(sorteio() * 256); });
        function xor(a, b) { return a.map(function (x, i) { return x ^ b[i]; }); }
        var m1 = Array.from(enc.encode(M1)), m2 = Array.from(enc.encode(M2));
        var c1 = xor(m1, chave), c2 = xor(m2, chave);
        var concluir = R.desafio(raiz, "otp-reuso", 15, "Explorar a chave reutilizada");

        var a = el("input", { class: "form-control form-control-sm mono", placeholder: "bytes em hexadecimal, ex.: 41 54" });
        var b = el("input", { class: "form-control form-control-sm mono", placeholder: "bytes em hexadecimal" });
        var res = el("p", { class: "small mono mt-1 mb-0", "aria-live": "polite" });
        var palpite = el("input", { class: "form-control form-control-sm mono", maxlength: 6, "aria-label": "Segunda mensagem" });
        var fb = u.feedback();

        function le(t) { return t.trim().split(/[\s,]+/).filter(Boolean).map(function (x) { return parseInt(x, 16); }); }
        function calcula() {
            var x = le(a.value), y = le(b.value);
            if (!x.length || x.length !== y.length || x.concat(y).some(isNaN)) { res.textContent = "Digite duas sequências de bytes do mesmo tamanho."; return; }
            var r = xor(x, y);
            var texto = r.every(function (v) { return v >= 32 && v < 127; }) ? " = “" + dec.decode(new Uint8Array(r)) + "”" : "";
            res.textContent = "resultado: " + hex(r) + texto;
        }
        function conferir() {
            if (palpite.value.trim().toUpperCase() === M2) { u.marca(fb, true, "C1 ⊕ C2 = M1 ⊕ M2; conhecendo M1, Eve obtém M2 sem nunca ver a chave."); concluir(); }
            else u.marca(fb, false, "Calcule C1 ⊕ C2 na calculadora e depois aplique ⊕ M1 ao resultado.");
        }
        raiz.append(
            el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mono mb-2" },
                el("tbody", null,
                    el("tr", null, el("th", null, "M1 = “" + M1 + "”"), el("td", null, hex(m1))),
                    el("tr", null, el("th", null, "chave (aleatória)"), el("td", null, hex(chave))),
                    el("tr", null, el("th", null, "C1 = M1 ⊕ chave"), el("td", null, hex(c1))),
                    el("tr", null, el("th", null, "C2 = M2 ⊕ mesma chave"), el("td", null, hex(c2)))))),
            el("p", { class: "small mb-2" }, "Alice reutilizou a chave numa segunda mensagem M2. Eve capturou C1 e C2 e sabe (por exemplo, por um palpite) que M1 é “" + M1 + "”."),
            el("div", { class: "row g-2" }, el("div", { class: "col-sm-6" }, u.campo("Bytes X", a)), el("div", { class: "col-sm-6" }, u.campo("Bytes Y", b))),
            u.botao("Calcular X ⊕ Y", "btn-outline-primary", calcula), res,
            el("div", { class: "row g-2 align-items-end mt-2" },
                el("div", { class: "col-sm-6" }, u.campo("Qual é M2?", palpite)),
                el("div", { class: "col-sm-6 mb-2" }, u.botao("Conferir", "btn-primary", conferir))),
            fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (15 pts): descubra M2 usando só C1, C2 e M1 (livro, pág. 123 do PDF)."));
    });

    /* ------------------------------------------------------------------
     * 5c. Força bruta e tamanho da chave
     * ------------------------------------------------------------------ */
    R.registrar("forca-bruta", function (raiz) {
        var bits = el("select", { class: "form-select form-select-sm" }, [40, 56, 64, 80, 128, 192, 256].map(function (b) { return el("option", { value: b, selected: b === 56 }, b + " bits"); }));
        var taxa = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "1e6" }, "1 milhão de chaves por segundo"),
            el("option", { value: "1e9", selected: true }, "1 bilhão de chaves por segundo"),
            el("option", { value: "1e12" }, "1 trilhão de chaves por segundo"));
        var saida = el("p", { class: "small mt-2 mb-0", "aria-live": "polite" });
        function legivel(seg) {
            var ano = 365 * 24 * 3600;
            if (seg < 1) return "menos de 1 segundo";
            if (seg < 3600) return num(seg / 60, 1) + " minutos";
            if (seg < 86400 * 2) return num(seg / 3600, 1) + " horas";
            if (seg < ano) return num(seg / 86400, 1) + " dias";
            var anos = seg / ano;
            if (anos < 1e6) return num(anos, 1) + " anos";
            return "cerca de 10^" + Math.floor(Math.log10(anos)) + " anos (o universo tem cerca de 1,4 × 10^10 anos)";
        }
        function render() {
            var b = Number(bits.value), r = Number(taxa.value);
            var seg = Math.pow(2, b) / r;
            saida.replaceChildren(el("strong", null, "2^" + b + " ≈ " + Math.pow(2, b).toExponential(2).replace(".", ",") + " chaves. "),
                "Testar todas leva " + legivel(seg) + "; em média, a chave aparece na metade desse tempo.");
        }
        bits.addEventListener("change", render);
        taxa.addEventListener("change", render);
        raiz.append(el("div", { class: "row g-2" }, el("div", { class: "col-sm-6" }, u.campo("Tamanho da chave", bits)), el("div", { class: "col-sm-6" }, u.campo("Velocidade do atacante", taxa))), saida);
        render();
    });

    /* ------------------------------------------------------------------
     * 7. Checksum × hash criptográfico (efeito avalanche)
     * ------------------------------------------------------------------ */
    R.registrar("hash-avalanche", function (raiz) {
        var ORIGINAL = "PAGUE 109 A BOB";
        function checksum(t) { return Array.from(new TextEncoder().encode(t)).reduce(function (a, b) { return a + b; }, 0) % 256; }
        function bitsDiferentes(h1, h2) {
            var n = 0;
            for (var i = 0; i < h1.length; i += 8) {
                var x = (parseInt(h1.substr(i, 8), 16) ^ parseInt(h2.substr(i, 8), 16)) >>> 0;
                while (x) { n += x & 1; x >>>= 1; }
            }
            return n;
        }
        var entrada = el("input", { class: "form-control form-control-sm mono", value: ORIGINAL, maxlength: 40 });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var concluir = R.desafio(raiz, "checksum-forjar", 15, "Forjar uma mensagem com o mesmo checksum");
        function render() {
            var m = entrada.value;
            var hO = sha256(ORIGINAL), hM = sha256(m);
            var mesmo = checksum(m) === checksum(ORIGINAL);
            var diferente = m !== ORIGINAL;
            saida.replaceChildren(
                el("div", { class: "table-responsive" }, el("table", { class: "table table-sm small mono mb-2" },
                    el("thead", null, el("tr", null, el("th", null, "Mensagem"), el("th", null, "Checksum"), el("th", null, "SHA-256"))),
                    el("tbody", null,
                        el("tr", null, el("td", null, ORIGINAL), el("td", null, String(checksum(ORIGINAL))), el("td", { style: "word-break:break-all" }, hO)),
                        el("tr", null, el("td", null, m), el("td", { class: diferente && mesmo ? "quiz-no" : "" }, String(checksum(m))), el("td", { style: "word-break:break-all" }, hM))))),
                el("p", { class: "mb-0" }, diferente ? "Bits diferentes entre os dois SHA-256: " + bitsDiferentes(hO, hM) + " de 256." : "Altere a mensagem para comparar."),
                diferente && mesmo ? el("p", { class: "quiz-no mb-0 mt-1" }, "✘ Mesmo checksum com outra mensagem: o checksum não detecta a falsificação. O SHA-256, porém, mudou por completo.") : "");
            if (diferente && mesmo) concluir();
        }
        entrada.addEventListener("input", render);
        raiz.append(u.campo("Mensagem que chega a Bob (Mallory pode alterá-la)", entrada), saida,
            el("p", { class: "small text-muted mt-2 mb-0" }, "O checksum aqui é a soma dos bytes módulo 256. Desafio (15 pts): como Mallory, altere a mensagem mantendo o mesmo checksum (livro, pág. 124 do PDF)."));
        render();
    });

    /* ------------------------------------------------------------------
     * 8a. Protocolos de autenticação contra a reprodução
     * ------------------------------------------------------------------ */
    R.registrar("protocolos-autenticacao", function (raiz) {
        var PROTOCOLOS = {
            claro: { nome: "Senha em claro", resiste: false, guarda: "a senha", eventos: [["I'm Alice"], ["Password:", 1], ["1234xyz$"], ["Access", 1]], porque: "Eve só precisa repetir a senha." },
            hash: { nome: "Hash(senha)", resiste: false, guarda: "a senha ou o hash dela", eventos: [["I'm Alice"], ["Prove it", 1], ["Hash(passwd)"], ["Access granted", 1]], porque: "Eve não descobre a senha, mas não precisa: repete o mesmo Hash(passwd)." },
            desafio: { nome: "Desafio-resposta com nonce", resiste: true, guarda: "a senha em claro", eventos: [["I'm Alice"], ["Challenge:764192", 1], ["Hash(764192||passwd)"], ["Access", 1]], porque: "Cada login usa um nonce novo, então a resposta antiga não serve." },
            cadeia: { nome: "Cadeia de hash de Lamport", resiste: true, guarda: "só o último valor Hⁿ(P) e n", eventos: [["I'm Alice"], ["n = 10", 1], ["H⁹(P)"], ["Access (guarda H⁹(P), n = 9)", 1]], porque: "Depois de cada login, Bob espera o valor anterior da cadeia; o valor já usado não vale mais." }
        };
        var escolha = el("select", { class: "form-select form-select-sm" }, Object.keys(PROTOCOLOS).map(function (k) { return el("option", { value: k }, PROTOCOLOS[k].nome); }));
        var area = el("div", { class: "mt-2" });
        var info = el("p", { class: "small mt-1 mb-0", "aria-live": "polite" });
        function render() {
            var p = PROTOCOLOS[escolha.value];
            area.replaceChildren(R.diagramaSequencia({
                titulo: "Autenticação de Alice em Bob com " + p.nome + ".",
                colunas: ["Alice", "Bob"], eventos: p.eventos.map(function (e) { return { de: e[1] ? 1 : 0, para: e[1] ? 0 : 1, rotulo: e[0] }; }), passo: 30, margem: 170
            }));
            info.replaceChildren(el("strong", null, "Bob guarda: " + p.guarda + ". "), "Se Eve gravou um login anterior e o repete: " + (p.resiste ? "recusado. " : "aceito. ") + p.porque);
        }
        escolha.addEventListener("change", render);

        var concluir = R.desafio(raiz, "replay-classificar", 15, "Protocolos que resistem à reprodução");
        var acertos = {};
        var fb = u.feedback();
        var lista = el("div", { class: "d-grid gap-2" }, Object.keys(PROTOCOLOS).map(function (k) {
            var p = PROTOCOLOS[k];
            var linhaFb = el("span", { class: "small" });
            function responde(resiste) {
                if (resiste === p.resiste) { acertos[k] = true; linhaFb.className = "small quiz-ok"; linhaFb.textContent = "✔ " + p.porque; }
                else { delete acertos[k]; linhaFb.className = "small quiz-no"; linhaFb.textContent = "✘ Escolha esse protocolo no diagrama acima e leia o resultado."; }
                if (Object.keys(acertos).length === 4) { u.marca(fb, true, "Só os protocolos que nunca repetem a mesma prova resistem à reprodução."); concluir(); }
            }
            return el("div", { class: "ordem-item flex-wrap" }, el("span", null, p.nome),
                u.botao("Resiste", "btn-outline-success", function () { responde(true); }, p.nome + " resiste à reprodução"),
                u.botao("Não resiste", "btn-outline-danger", function () { responde(false); }, p.nome + " não resiste à reprodução"),
                el("div", { class: "w-100" }, linhaFb));
        }));
        raiz.append(u.campo("Protocolo", escolha), area, info, el("hr"),
            el("p", { class: "small text-muted mb-2" }, "Desafio (15 pts): Eve gravou um login anterior de Alice. Quais protocolos resistem quando ela repete as mensagens? (livro, pág. 125–126 do PDF)"),
            lista, fb);
        render();
    });

    /* ------------------------------------------------------------------
     * 8b. Cadeia de hash de Lamport
     * ------------------------------------------------------------------ */
    R.registrar("cadeia-hash", function (raiz) {
        var SENHA = "senha-de-alice";
        var N = 5;
        var cadeia = [SENHA];            // cadeia[i] = H^i(P)
        for (var i = 1; i <= N; i++) cadeia.push(sha256(cadeia[i - 1]));
        var n, ultimoEnviado;
        var estado = el("p", { class: "small mb-1" });
        var log = el("ul", { class: "log", "aria-live": "polite" });
        function curto(h) { return h.slice(0, 12) + "…"; }
        function zera() { n = N; ultimoEnviado = null; log.replaceChildren(); desenha(); }
        function desenha() {
            estado.replaceChildren("Bob guarda: H", el("sup", null, String(n)), "(P) = ", el("span", { class: "mono" }, n > 0 ? curto(cadeia[n]) : "a própria senha (a cadeia acabou)"), " e n = " + n + ".");
        }
        function registra(t, ok) { log.insertBefore(el("li", { class: ok === undefined ? "" : ok ? "quiz-ok" : "quiz-no" }, t), log.firstChild); }
        function alice() {
            if (n === 0) { registra("Não restam autenticações: a cadeia precisa ser reinicializada.", false); return; }
            var enviado = cadeia[n - 1];
            var ok = sha256(enviado) === cadeia[n];
            registra("Alice envia H^" + (n - 1) + "(P) = " + (n - 1 === 0 ? "a própria senha" : curto(enviado)) + "; Bob calcula o hash e confere com o guardado: " + (ok ? "aceito." : "recusado."), ok);
            ultimoEnviado = enviado; n--; desenha();
        }
        function eve() {
            if (!ultimoEnviado) { registra("Eve ainda não capturou nenhuma autenticação.", undefined); return; }
            var ok = sha256(ultimoEnviado) === cadeia[n];
            registra("Eve repete o último valor capturado; H(valor) não é o que Bob guarda agora: " + (ok ? "aceito." : "recusado."), ok);
        }
        raiz.append(
            el("p", { class: "small mb-2" }, "Alice calculou H⁵(P) aplicando SHA-256 cinco vezes à senha P, e Bob guardou só esse valor."),
            estado,
            el("div", { class: "d-flex gap-2 flex-wrap mb-2" },
                u.botao("Alice se autentica", "btn-primary", alice),
                u.botao("Eve repete o último valor", "btn-outline-danger", eve),
                u.botao("Reinicializar a cadeia", "btn-outline-secondary", zera)),
            log);
        zera();
    });

    /* ------------------------------------------------------------------
     * 9. Diffie-Hellman, Mallory e a troca autenticada
     * ------------------------------------------------------------------ */
    function potmod(base, exp, mod) {
        var r = 1n, b = BigInt(base) % BigInt(mod), e = BigInt(exp), m = BigInt(mod);
        while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; }
        return Number(r);
    }
    R.registrar("diffie-hellman", function (raiz) {
        var GRUPOS = { "23": 5, "2147483647": 7 };
        var grupo = el("select", { class: "form-select form-select-sm" },
            el("option", { value: "23" }, "p = 23, g = 5 (exemplo do livro)"),
            el("option", { value: "2147483647" }, "p = 2 147 483 647, g = 7"));
        var a = el("input", { type: "number", class: "form-control form-control-sm", value: 8, min: 1 });
        var b = el("input", { type: "number", class: "form-control form-control-sm", value: 13, min: 1 });
        var mitm = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("dhm") });
        var autentica = el("input", { type: "checkbox", class: "form-check-input", id: u.novoId("dha") });
        var saida = el("div", { class: "small mt-2", "aria-live": "polite" });
        var palpite = el("input", { type: "number", class: "form-control form-control-sm", "aria-label": "Chave para a = 6 e b = 15" });
        var fb = u.feedback();
        var concluir = R.desafio(raiz, "dh-chave-mitm", 20, "Diffie-Hellman: calcular e detectar Mallory");
        var feito = {};

        function render() {
            var p = Number(grupo.value), g = GRUPOS[grupo.value];
            var xa = Math.max(1, Math.floor(Number(a.value) || 1)), xb = Math.max(1, Math.floor(Number(b.value) || 1));
            var A = potmod(g, xa, p), B = potmod(g, xb, p);
            var linhas = [el("p", { class: "mb-1" }, "Públicos: p = " + p.toLocaleString("pt-BR") + ", g = " + g + ".")];
            if (!mitm.checked) {
                var Ka = potmod(B, xa, p), Kb = potmod(A, xb, p);
                linhas.push(
                    el("p", { class: "mb-1 mono" }, "Alice → Bob: A = g^a mod p = " + A),
                    el("p", { class: "mb-1 mono" }, "Bob → Alice: B = g^b mod p = " + B),
                    el("p", { class: "mb-1 quiz-ok" }, "✔ Alice calcula B^a mod p = " + Ka + "; Bob calcula A^b mod p = " + Kb + ". A chave nunca passou pela rede."),
                    el("p", { class: "mb-0 text-muted" }, p === 23
                        ? "Com p tão pequeno, Eve testa os 22 expoentes possíveis e acha a chave na hora."
                        : "Mesmo aqui, Eve teria de testar até 2 bilhões de expoentes; na prática, p tem milhares de bits e a força bruta é inviável."));
            } else {
                var xm = 6, M = potmod(g, xm, p);
                var KAM = potmod(M, xa, p), KMB = potmod(M, xb, p);
                if (autentica.checked) {
                    feito.detectou = true;
                    linhas.push(
                        el("p", { class: "mb-1 mono" }, "Bob → Alice: B = " + B + ", assinado com a chave privada de Bob e com o certificado de Ted"),
                        el("p", { class: "mb-1 mono" }, "Mallory troca B por M = " + M + ", mas não consegue assiná-lo como Bob"),
                        el("p", { class: "mb-0 quiz-ok" }, "✔ Alice confere a assinatura com a chave pública de Bob (certificada por Ted), vê que M não foi assinado por Bob e interrompe a troca."));
                } else {
                    linhas.push(
                        el("p", { class: "mb-1 mono" }, "Alice → Mallory: A = " + A + "; Mallory → Bob: M = " + M),
                        el("p", { class: "mb-1 mono" }, "Bob → Mallory: B = " + B + "; Mallory → Alice: M = " + M),
                        el("p", { class: "mb-0 quiz-no" }, "✘ Alice usa a chave " + KAM + " com Mallory, e Bob usa " + KMB + " com Mallory. Mallory decifra tudo de um lado e cifra de novo para o outro."));
                }
            }
            saida.replaceChildren.apply(saida, linhas);
            verifica();
        }
        function verifica() { if (feito.calculou && feito.detectou) concluir(); }
        [grupo, a, b].forEach(function (x) { x.addEventListener("input", render); x.addEventListener("change", render); });
        mitm.addEventListener("change", render);
        autentica.addEventListener("change", render);
        function conferir() {
            if (Number(palpite.value) === potmod(potmod(5, 15, 23), 6, 23)) { feito.calculou = true; u.marca(fb, true, "Isso: A = 8, B = 19 e a chave é 2."); }
            else u.marca(fb, false, "Calcule A = 5^6 mod 23 e B = 5^15 mod 23; depois B^6 mod 23 (ou A^15 mod 23).");
            verifica();
        }
        raiz.append(
            el("div", { class: "row g-2" },
                el("div", { class: "col-sm-6" }, u.campo("Parâmetros públicos", grupo)),
                el("div", { class: "col-6 col-sm-3" }, u.campo("Segredo a (Alice)", a)),
                el("div", { class: "col-6 col-sm-3" }, u.campo("Segredo b (Bob)", b))),
            el("div", { class: "form-check" }, mitm, el("label", { class: "form-check-label small", for: mitm.id }, "Mallory no meio (escolhe m = 6)")),
            el("div", { class: "form-check" }, autentica, el("label", { class: "form-check-label small", for: autentica.id }, "Troca autenticada: Bob assina B e envia o certificado de Ted")),
            saida, el("hr"),
            el("div", { class: "row g-2 align-items-end" },
                el("div", { class: "col-sm-7" }, u.campo("Sem a calculadora: com p = 23, g = 5, a = 6 e b = 15, qual é a chave?", palpite)),
                el("div", { class: "col-sm-5 mb-2" }, u.botao("Conferir", "btn-primary", conferir))),
            fb,
            el("p", { class: "small text-muted mt-2 mb-0" }, "Desafio (20 pts): calcule a chave do par (6, 15) e, com Mallory no meio, ative a troca autenticada para ver o ataque detectado (livro, pág. 130–131 do PDF)."));
        render();
    });
}());
