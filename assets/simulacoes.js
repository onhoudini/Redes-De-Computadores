(function () {
    "use strict";

    function iniciarGrafoRoteamento() {
        var host = document.getElementById("editableRoutingGraph");
        if (!host) return;

        var arestas = [
            ["A", "B", 1], ["A", "C", 4], ["B", "D", 2], ["C", "D", 1]
        ];
        var nos = ["A", "B", "C", "D"];
        var campos = document.getElementById("routingEdgeControls");
        var saidaDV = document.getElementById("routingDVOutput");
        var roundsOut = document.getElementById("routingDVRounds");
        var saidaDijkstra = document.getElementById("routingDijkstraOutput");
        var split = document.getElementById("routingSplitHorizon");
        var poison = document.getElementById("routingPoisonReverse");
        var pos = { A: [70, 75], B: [230, 45], C: [230, 145], D: [390, 95] };
        var dragging = null;
        var estadoDijkstra = null;
        var destinoCaminho = document.getElementById("routingDijkstraDest");
        var textoCaminhoEl = document.getElementById("routingDijkstraPath");

        function tabelaArestas() {
            campos.replaceChildren();
            arestas.forEach(function (edge, idx) {
                var linha = document.createElement("div");
                linha.className = "input-group input-group-sm mb-2";
                var titulo = document.createElement("span");
                titulo.className = "input-group-text";
                titulo.textContent = edge[0] + "–" + edge[1];
                var custo = document.createElement("input");
                custo.type = "number";
                custo.min = "1";
                custo.max = "99";
                custo.value = String(edge[2]);
                custo.className = "form-control";
                custo.setAttribute("aria-label", "Custo do enlace " + edge[0] + "–" + edge[1]);
                custo.addEventListener("change", function () {
                    var value = Number(custo.value);
                    if (Number.isInteger(value) && value > 0 && value <= 99) edge[2] = value;
                    else custo.value = String(edge[2]);
                    invalidarDijkstra();
                    desenharGrafo();
                });
                var derrubar = document.createElement("button");
                derrubar.type = "button";
                derrubar.className = "btn btn-outline-danger";
                derrubar.textContent = edge[3] ? "Ativar" : "Derrubar";
                derrubar.setAttribute("aria-label", (edge[3] ? "Ativar" : "Derrubar") + " enlace " + edge[0] + "–" + edge[1]);
                derrubar.addEventListener("click", function () {
                    edge[3] = !edge[3];
                    invalidarDijkstra();
                    derrubar.textContent = edge[3] ? "Ativar" : "Derrubar";
                    derrubar.setAttribute("aria-label", (edge[3] ? "Ativar" : "Derrubar") + " enlace " + edge[0] + "–" + edge[1]);
                    desenharGrafo();
                });
                linha.append(titulo, custo, derrubar);
                campos.appendChild(linha);
            });
        }

        function grafoAtivo() {
            var graph = {};
            nos.forEach(function (node) { graph[node] = {}; });
            arestas.forEach(function (edge) {
                if (!edge[3]) {
                    graph[edge[0]][edge[1]] = edge[2];
                    graph[edge[1]][edge[0]] = edge[2];
                }
            });
            return graph;
        }

        function desenharGrafo() {
            var graph = grafoAtivo();
            var svg = host;
            var arvore = {}, caminhoFinal = {};
            if (estadoDijkstra) {
                nos.forEach(function (n) {
                    if (estadoDijkstra.visitados[n] && estadoDijkstra.via[n]) arvore[[n, estadoDijkstra.via[n]].sort().join("-")] = true;
                });
                var destino = destinoCaminho ? destinoCaminho.value : "D";
                if (estadoDijkstra.visitados[destino]) {
                    var atualNo = destino;
                    while (estadoDijkstra.via[atualNo]) {
                        caminhoFinal[[atualNo, estadoDijkstra.via[atualNo]].sort().join("-")] = true;
                        atualNo = estadoDijkstra.via[atualNo];
                    }
                }
            }
            while (svg.firstChild) svg.removeChild(svg.firstChild);
            var ns = "http://www.w3.org/2000/svg";
            var title = document.createElementNS(ns, "title");
            title.textContent = "Grafo ponderado editável de quatro roteadores; enlaces indisponíveis aparecem tracejados em vermelho.";
            svg.appendChild(title);
            arestas.forEach(function (edge) {
                var line = document.createElementNS(ns, "line");
                line.setAttribute("x1", pos[edge[0]][0]); line.setAttribute("y1", pos[edge[0]][1]);
                line.setAttribute("x2", pos[edge[1]][0]); line.setAttribute("y2", pos[edge[1]][1]);
                var chaveAresta = [edge[0], edge[1]].sort().join("-");
                var estiloAresta = edge[3] ? ["#dc3545", "2"] : caminhoFinal[chaveAresta] ? ["#198754", "7"] : arvore[chaveAresta] ? ["#20c997", "4"] : ["#6c757d", "3"];
                line.setAttribute("stroke", estiloAresta[0]);
                line.setAttribute("stroke-width", estiloAresta[1]);
                if (edge[3]) line.setAttribute("stroke-dasharray", "6 5");
                svg.appendChild(line);
                var label = document.createElementNS(ns, "text");
                label.setAttribute("x", String((pos[edge[0]][0] + pos[edge[1]][0]) / 2));
                label.setAttribute("y", String((pos[edge[0]][1] + pos[edge[1]][1]) / 2 - 6));
                label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "graph-cost");
                label.textContent = edge[3] ? "↓" : String(edge[2]); svg.appendChild(label);
            });
            nos.forEach(function (node) {
                var circle = document.createElementNS(ns, "circle");
                circle.setAttribute("cx", pos[node][0]); circle.setAttribute("cy", pos[node][1]);
                circle.setAttribute("r", "20");
                circle.setAttribute("class", "graph-node" + (estadoDijkstra && estadoDijkstra.atual === node ? " graph-node-current" : estadoDijkstra && estadoDijkstra.visitados[node] ? " graph-node-visited" : ""));
                circle.setAttribute("data-node", node); circle.setAttribute("tabindex", "0");
                circle.setAttribute("aria-label", "Roteador " + node + ", arraste para mover"); svg.appendChild(circle);
                var label = document.createElementNS(ns, "text");
                label.setAttribute("x", pos[node][0]); label.setAttribute("y", pos[node][1] + (estadoDijkstra ? 0 : 5));
                label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "graph-label");
                label.textContent = node; svg.appendChild(label);
                if (estadoDijkstra) {
                    var distTexto = document.createElementNS(ns, "text");
                    distTexto.setAttribute("x", pos[node][0]); distTexto.setAttribute("y", pos[node][1] + 14);
                    distTexto.setAttribute("text-anchor", "middle"); distTexto.setAttribute("class", "graph-dist");
                    distTexto.textContent = "d=" + (estadoDijkstra.dist[node] === Infinity ? "∞" : estadoDijkstra.dist[node]);
                    svg.appendChild(distTexto);
                }
            });
        }

        function inicializarDV(graph) {
            var dv = {};
            nos.forEach(function (node) {
                dv[node] = {};
                nos.forEach(function (dest) {
                    dv[node][dest] = node === dest ? { cost: 0, via: node } :
                        Object.prototype.hasOwnProperty.call(graph[node], dest) ? { cost: graph[node][dest], via: dest } : { cost: Infinity, via: null };
                });
            });
            return dv;
        }

        function anuncio(dv, from, to, dest) {
            var route = dv[from][dest];
            if (from === dest || route.cost === Infinity) return route.cost;
            if (poison.checked && route.via === to) return Infinity;
            if (split.checked && route.via === to) return null;
            return route.cost;
        }

        function rodarDV(graph) {
            var dv = inicializarDV(graph);
            var limiteMetric = 16;
            var mudou = true, rounds = 0;
            var history = [];
            while (mudou && rounds++ < 32) {
                mudou = false;
                var novo = {};
                nos.forEach(function (r) { novo[r] = {}; nos.forEach(function (d) { novo[r][d] = { cost: dv[r][d].cost, via: dv[r][d].via }; }); });
                nos.forEach(function (r) {
                    nos.forEach(function (v) {
                        if (!Object.prototype.hasOwnProperty.call(graph[r], v)) return;
                        nos.forEach(function (d) {
                            if (d === r) return;
                            var adv = anuncio(dv, v, r, d);
                            if (adv === null) return;
                            var candidate = Math.min(limiteMetric, graph[r][v] + adv);
                            if (candidate < novo[r][d].cost) { novo[r][d] = { cost: candidate, via: v }; mudou = true; }
                        });
                    });
                });
                dv = novo;
                history.push(nos.map(function (r) { return r + ": " + nos.map(function (d) { return d + "=" + (dv[r][d].cost === Infinity ? "∞" : dv[r][d].cost) + " via " + (dv[r][d].via || "—"); }).join(", "); }).join(" | "));
            }
            return { table: dv, rounds: rounds - 1, converged: !mudou, history: history };
        }

        function renderTable(target, dv) {
            var table = document.createElement("table"); table.className = "table table-sm table-bordered bg-white";
            var head = document.createElement("thead"), headRow = document.createElement("tr");
            ["Roteador", "Destino", "Custo", "Próximo salto"].forEach(function (x) { var th = document.createElement("th"); th.textContent = x; headRow.appendChild(th); });
            head.appendChild(headRow); table.appendChild(head);
            var body = document.createElement("tbody");
            nos.forEach(function (r) { nos.forEach(function (d) {
                var row = document.createElement("tr");
                [r, d, dv[r][d].cost === Infinity ? "∞" : String(dv[r][d].cost), dv[r][d].via || "—"].forEach(function (v) { var cell = document.createElement("td"); cell.textContent = v; row.appendChild(cell); });
                body.appendChild(row);
            }); });
            table.appendChild(body); target.replaceChildren(table);
        }

        function rodarDijkstra(graph, origin) {
            var dist = {}, via = {}, visited = {};
            nos.forEach(function (n) { dist[n] = Infinity; via[n] = null; }); dist[origin] = 0;
            while (true) {
                var u = null;
                nos.forEach(function (n) { if (!visited[n] && (u === null || dist[n] < dist[u])) u = n; });
                if (u === null || dist[u] === Infinity) break;
                visited[u] = true;
                Object.keys(graph[u]).forEach(function (v) {
                    if (dist[u] + graph[u][v] < dist[v]) { dist[v] = dist[u] + graph[u][v]; via[v] = u; }
                });
            }
            return { dist: dist, via: via };
        }

        function iniciarDijkstra() {
            var graph = grafoAtivo();
            estadoDijkstra = { graph: graph, dist: {}, via: {}, visitados: {}, fila: [] };
            nos.forEach(function (n) { estadoDijkstra.dist[n] = Infinity; estadoDijkstra.via[n] = null; });
            estadoDijkstra.dist.A = 0;
            estadoDijkstra.fila.push([0, "A"]);
            estadoDijkstra.atual = null;
            estadoDijkstra.concluido = false;
            document.getElementById("routingDijkstraQueue").textContent = "Fila inicial: (0, A). Clique em ‘Próximo passo de Dijkstra’ para extrair o menor custo.";
            desenharGrafo(); atualizarCaminho();
        }

        function avancarDijkstra() {
            if (!estadoDijkstra) return;
            var fila = estadoDijkstra.fila;
            fila.sort(function (a, b) { return a[0] - b[0] || a[1].localeCompare(b[1]); });
            var atual = null;
            while (fila.length) {
                var candidato = fila.shift();
                if (!estadoDijkstra.visitados[candidato[1]] && candidato[0] === estadoDijkstra.dist[candidato[1]]) { atual = candidato; break; }
            }
            var statusEl = document.getElementById("routingDijkstraQueue");
            if (!atual) { statusEl.textContent = "Fila vazia: algoritmo concluído. Distâncias: " + nos.map(function (n) { return n + "=" + (estadoDijkstra.dist[n] === Infinity ? "∞" : estadoDijkstra.dist[n]); }).join(", "); estadoDijkstra.atual = null; estadoDijkstra.concluido = true; desenharGrafo(); atualizarCaminho(); return; }
            var node = atual[1]; estadoDijkstra.visitados[node] = true; estadoDijkstra.atual = node;
            Object.keys(estadoDijkstra.graph[node]).forEach(function (neighbor) {
                var cost = estadoDijkstra.dist[node] + estadoDijkstra.graph[node][neighbor];
                if (cost < estadoDijkstra.dist[neighbor]) { estadoDijkstra.dist[neighbor] = cost; estadoDijkstra.via[neighbor] = node; fila.push([cost, neighbor]); }
            });
            statusEl.textContent = "Visitado: " + node + " (distância " + atual[0] + "). Fila de prioridade: " + (fila.length ? fila.map(function (item) { return "(" + item[0] + ", " + item[1] + ")"; }).join(" → ") : "vazia") + ". Distâncias provisórias: " + nos.map(function (n) { return n + "=" + (estadoDijkstra.dist[n] === Infinity ? "∞" : estadoDijkstra.dist[n]); }).join(", ");
            desenharGrafo(); atualizarCaminho();
        }

        function invalidarDijkstra() {
            if (!estadoDijkstra) return;
            estadoDijkstra = null;
            var status = document.getElementById("routingDijkstraQueue");
            if (status) status.textContent = "Topologia alterada: clique em ‘Recalcular rotas’ ou ‘Reiniciar Dijkstra’ para recomeçar.";
            atualizarCaminho();
        }

        function atualizarCaminho() {
            if (!textoCaminhoEl) return;
            if (!estadoDijkstra) { textoCaminhoEl.textContent = ""; return; }
            var dest = destinoCaminho ? destinoCaminho.value : "D";
            if (dest === "A") { textoCaminhoEl.textContent = "A é a origem (custo 0)."; return; }
            if (!estadoDijkstra.visitados[dest]) {
                textoCaminhoEl.textContent = estadoDijkstra.concluido
                    ? dest + " é inalcançável com os enlaces ativos."
                    : "Caminho até " + dest + ": ainda não é definitivo (nó não visitado). Avance o Dijkstra.";
                return;
            }
            var caminho = [], cursor = dest;
            while (cursor) { caminho.unshift(cursor); cursor = estadoDijkstra.via[cursor]; }
            textoCaminhoEl.textContent = "Caminho final até " + dest + ": " + caminho.join(" → ") + " (custo " + estadoDijkstra.dist[dest] + ").";
        }

        function coordenadaSvg(event) {
            var point = host.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
            return point.matrixTransform(host.getScreenCTM().inverse());
        }
        host.addEventListener("pointerdown", function (event) {
            var target = event.target.closest ? event.target.closest("[data-node]") : null;
            if (target) { dragging = target.getAttribute("data-node"); host.setPointerCapture(event.pointerId); }
        });
        host.addEventListener("pointermove", function (event) {
            if (!dragging) return;
            var point = coordenadaSvg(event);
            pos[dragging] = [Math.max(25, Math.min(435, point.x)), Math.max(25, Math.min(175, point.y))];
            desenharGrafo();
        });
        host.addEventListener("pointerup", function () { dragging = null; });

        document.getElementById("runEditableRouting").addEventListener("click", function () {
            var graph = grafoAtivo();
            var result = rodarDV(graph);
            renderTable(saidaDV, result.table);
            if (roundsOut) {
                roundsOut.replaceChildren();
                result.history.forEach(function (text, index) { var li = document.createElement("li"); li.textContent = "Rodada " + (index + 1) + ": " + text; roundsOut.appendChild(li); });
            }
            var dijkstra = rodarDijkstra(graph, "A");
            var list = document.createElement("ul"); list.className = "small mb-0";
            nos.forEach(function (dest) {
                var item = document.createElement("li");
                item.textContent = "A → " + dest + ": custo " + (dijkstra.dist[dest] === Infinity ? "∞" : dijkstra.dist[dest]) + "; predecessor " + (dijkstra.via[dest] || "—");
                list.appendChild(item);
            });
            saidaDijkstra.replaceChildren(list);
            iniciarDijkstra();
            var notice = document.getElementById("routingDVStatus");
            notice.textContent = "Vetor de distância: " + result.rounds + " rodada(s)" + (result.converged ? "; convergiu." : "; atingiu o limite de rodadas.");
        });
        document.getElementById("routingDijkstraStep").addEventListener("click", avancarDijkstra);
        document.getElementById("routingDijkstraReset").addEventListener("click", iniciarDijkstra);
        if (destinoCaminho) destinoCaminho.addEventListener("change", function () { desenharGrafo(); atualizarCaminho(); });

        document.getElementById("addRoutingLinkButton").addEventListener("click", function () {
            var from = document.getElementById("addRoutingLink").value;
            var to = document.getElementById("addRoutingLinkTo").value;
            var cost = Number(document.getElementById("addRoutingCost").value);
            if (from === to || !Number.isInteger(cost) || cost < 1 || cost > 99) return;
            var existing = arestas.find(function (edge) { return (edge[0] === from && edge[1] === to) || (edge[0] === to && edge[1] === from); });
            if (existing) { existing[2] = cost; existing[3] = false; }
            else arestas.push([from, to, cost]);
            tabelaArestas(); desenharGrafo(); document.getElementById("runEditableRouting").click();
        });

        tabelaArestas(); desenharGrafo();
        document.getElementById("runEditableRouting").click();
    }

    document.addEventListener("DOMContentLoaded", iniciarGrafoRoteamento);

    function interpretarTraceroute() {
        var source = document.getElementById("tracerouteInput");
        var output = document.getElementById("tracerouteOutput");
        if (!source || !output) return;
        var parsed = source.value.split(/\r?\n/).map(function (line) {
            var match = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
            if (!match) return null;
            var rest = match[2];
            var times = Array.from(rest.matchAll(/([0-9]+(?:[.,][0-9]+)?)\s*ms\b/gi), function (item) { return Number(item[1].replace(",", ".")); });
            var hostText = rest.replace(/<?\s*[0-9]+(?:[.,][0-9]+)?\s*ms\b/gi, " ").trim();
            var candidates = hostText.split(/\s+/).filter(function (token) { return token && token !== "*"; });
            var host = candidates.length ? candidates.join(" ") : "*";
            return { hop: Number(match[1]), host: host, times: times };
        }).filter(Boolean);
        output.replaceChildren();
        if (!parsed.length) { output.textContent = "Nenhum salto reconhecido. Cole linhas iniciadas pelo número do salto (por exemplo, '1  host  2.4 ms')."; return; }
        var table = document.createElement("table"); table.className = "table table-sm table-bordered";
        var head = document.createElement("thead"), row = document.createElement("tr");
        ["Salto", "Host/endereço", "RTTs (ms)", "Média (ms)"].forEach(function (title) { var th = document.createElement("th"); th.textContent = title; row.appendChild(th); });
        head.appendChild(row); table.appendChild(head);
        var body = document.createElement("tbody");
        parsed.forEach(function (item) {
            var tr = document.createElement("tr");
            [String(item.hop), item.host, item.times.length ? item.times.join(", ") : "sem resposta", item.times.length ? (item.times.reduce(function (a, b) { return a + b; }, 0) / item.times.length).toFixed(2) : "—"].forEach(function (text) { var td = document.createElement("td"); td.textContent = text; tr.appendChild(td); });
            body.appendChild(tr);
        });
        table.appendChild(body); output.appendChild(table);
        var rtts = parsed.filter(function (item) { return item.times.length; }).map(function (item) { return { hop: item.hop, mean: item.times.reduce(function (a, b) { return a + b; }, 0) / item.times.length }; });
        var chain = document.createElement("p"); chain.className = "small";
        chain.textContent = "Saltos: " + parsed.map(function (item) { return item.hop + ": " + item.host; }).join(" → ");
        output.appendChild(chain);
        if (rtts.length) {
            var max = Math.max.apply(null, rtts.map(function (x) { return x.mean; }).concat([1]));
            var chart = document.createElement("div"); chart.setAttribute("role", "img"); chart.setAttribute("aria-label", "Gráfico de RTT médio por salto"); chart.className = "small";
            var chartTitle = document.createElement("span"); chartTitle.className = "visually-hidden"; chartTitle.textContent = "Gráfico de RTT médio em milissegundos por salto"; chart.appendChild(chartTitle);
            rtts.forEach(function (x) {
                var bar = document.createElement("div"); bar.className = "d-flex align-items-center gap-2 mb-1";
                var label = document.createElement("span"); label.textContent = "Salto " + x.hop; label.style.width = "5rem";
                var track = document.createElement("div"); track.className = "bg-primary rounded"; track.style.height = "1rem"; track.style.width = Math.max(2, x.mean / max * 75) + "%"; track.title = x.mean.toFixed(2) + " ms";
                var value = document.createElement("span"); value.textContent = x.mean.toFixed(2) + " ms";
                bar.append(label, track, value); chart.appendChild(bar);
            });
            output.appendChild(chart);
        }
    }
    document.addEventListener("DOMContentLoaded", function () {
        var button = document.getElementById("parseTraceroute");
        if (button) button.addEventListener("click", interpretarTraceroute);
    });

    document.addEventListener("DOMContentLoaded", function () {
        var ttl = 8, router = "A";
        var ttlOut = document.getElementById("ttlOutput");
        var advance = document.getElementById("runTtlLoop");
        var reset = document.getElementById("resetTtlLoop");
        var ttlPacote = document.getElementById("ttlPacket");
        var ttlCorpo = document.getElementById("ttlPacketBody");
        var ttlTexto = document.getElementById("ttlPacketText");
        var ttlPos = { A: [60, 135], B: [180, 55], C: [300, 135] };
        function desenharTtl(descartado) {
            if (!ttlPacote) return;
            ttlPacote.style.transform = "translate(" + ttlPos[router][0] + "px, " + ttlPos[router][1] + "px)";
            ttlTexto.textContent = descartado ? "✕" : String(ttl);
            ttlCorpo.setAttribute("class", descartado ? "ttl-packet ttl-packet-dead" : "ttl-packet");
        }
        if (advance && ttlOut) {
            advance.addEventListener("click", function () {
                if (ttl <= 0) { ttlOut.textContent = "O pacote já foi descartado. Clique em Reiniciar para enviar outro."; return; }
                var current = router; router = router === "A" ? "B" : router === "B" ? "C" : "A"; ttl--;
                ttlOut.textContent = ttl === 0
                    ? "Roteador " + current + " encaminhou o pacote para " + router + "; o TTL chegou a 0 e " + router + " o descartou. Na prática, costuma avisar a origem com uma mensagem ICMP “Time Exceeded”."
                    : "Pacote em " + current + " → " + router + "; TTL restante: " + ttl + ".";
                desenharTtl(ttl === 0);
            });
            reset.addEventListener("click", function () { ttl = 8; router = "A"; ttlOut.textContent = "Pacote em A; TTL inicial 8."; desenharTtl(false); });
            reset.click();
        }

        var lspSequence = 1, lspSeen = {}, lspQueue = [];
        var lspOut = document.getElementById("lspOutput");
        var lspStep = document.getElementById("stepLspFlood");
        if (lspStep && lspOut) {
            lspStep.addEventListener("click", function () {
                if (!lspQueue.length) {
                    var origin = ["A", "B", "C", "D"][((lspSequence - 1) % 4)];
                    var neighbors = { A: ["B", "C"], B: ["A", "D"], C: ["A", "D"], D: ["B", "C"] };
                    lspQueue = neighbors[origin].map(function (n) { return { sender: origin, receiver: n, origin: origin, seq: lspSequence, neighbors: neighbors }; });
                    lspOut.textContent = "Roteador " + origin + " origina LSP seq=" + lspSequence + ". Clique novamente para avançar a inundação.";
                    lspSequence++;
                    return;
                }
                var message = lspQueue.shift();
                var key = message.origin + ":" + message.seq + "@" + message.receiver;
                if (lspSeen[key]) {
                    lspOut.textContent = "Roteador " + message.receiver + " recebeu duplicata LSP " + message.origin + " seq=" + message.seq + " de " + message.sender + "; duplicata descartada.";
                    return;
                }
                lspSeen[key] = true;
                message.neighbors[message.receiver].forEach(function (next) {
                    if (next !== message.sender) lspQueue.push({ sender: message.receiver, receiver: next, origin: message.origin, seq: message.seq, neighbors: message.neighbors });
                });
                lspOut.textContent = "LSP " + message.origin + " seq=" + message.seq + " entregue a " + message.receiver + " por " + message.sender + "; encaminhamento para vizinhos restantes. Fila: " + lspQueue.length + " mensagem(ns).";
            });
            document.getElementById("resetLspFlood").addEventListener("click", function () { lspSequence = 1; lspSeen = {}; lspQueue = []; lspOut.textContent = "Estado de inundação reiniciado; números de sequência disponíveis."; });
        }

        var destination = document.getElementById("ipv4Destination");
        var prefixOutput = document.getElementById("ipv4PrefixOutput");
        function ipv4Number(address) {
            var parts = address.split("."); if (parts.length !== 4) return null;
            var value = 0;
            for (var i = 0; i < 4; i++) { if (!/^\d+$/.test(parts[i]) || Number(parts[i]) > 255) return null; value = value * 256 + Number(parts[i]); }
            return value >>> 0;
        }
        function bitsDe(valor) { return (valor >>> 0).toString(2).padStart(32, "0"); }
        function mascaraDe(comprimento) { return comprimento === 0 ? 0 : (0xffffffff << (32 - comprimento)) >>> 0; }
        function linhaBits(rotulo, valor, comprimento, referencia) {
            var linha = document.createElement("div");
            linha.className = "bit-row";
            var nome = document.createElement("span");
            nome.className = "bit-row-label"; nome.textContent = rotulo;
            linha.appendChild(nome);
            var bits = bitsDe(valor), ref = referencia === null ? null : bitsDe(referencia);
            for (var i = 0; i < 32; i++) {
                var bit = document.createElement("span");
                var classe = "bit " + (i < comprimento ? "bit-mask" : "bit-free");
                if (ref !== null && i < comprimento && bits[i] !== ref[i]) classe += " bit-bad";
                bit.className = classe; bit.textContent = bits[i];
                linha.appendChild(bit);
                if (i % 8 === 7 && i < 31) {
                    var ponto = document.createElement("span");
                    ponto.className = "bit-dot"; ponto.textContent = ".";
                    linha.appendChild(ponto);
                }
            }
            return linha;
        }
        function findPrefix() {
            if (!destination || !prefixOutput) return;
            var target = ipv4Number(destination.value.trim());
            prefixOutput.replaceChildren();
            if (target === null) { prefixOutput.textContent = "IPv4 inválido. Use quatro números de 0 a 255 separados por ponto."; return; }
            var routes = [{ network: "200.18.0.0", length: 16, iface: "if0" }, { network: "200.18.4.0", length: 22, iface: "if3" }];
            var vencedora = null;
            var blocos = routes.map(function (route) {
                var rede = (ipv4Number(route.network) & mascaraDe(route.length)) >>> 0;
                var mascara = mascaraDe(route.length);
                var resultado = (target & mascara) >>> 0;
                var combina = resultado === rede;
                if (combina && (!vencedora || route.length > vencedora.length)) vencedora = route;
                var bloco = document.createElement("div");
                bloco.className = "ip-route mb-3";
                var titulo = document.createElement("p");
                titulo.className = "fw-semibold mb-1";
                titulo.textContent = route.network + "/" + route.length + " → " + route.iface + ": " + (combina ? "combina" : "não combina");
                bloco.appendChild(titulo);
                bloco.appendChild(linhaBits("Destino", target, route.length, null));
                bloco.appendChild(linhaBits("Máscara /" + route.length, mascara, route.length, null));
                bloco.appendChild(linhaBits("Destino AND máscara", resultado, route.length, rede));
                bloco.appendChild(linhaBits("Rede da rota", rede, route.length, null));
                return bloco;
            });
            var resumo = document.createElement("p");
            resumo.className = "mb-2";
            resumo.textContent = vencedora
                ? "Prefixo mais longo: " + vencedora.network + "/" + vencedora.length + " → " + vencedora.iface + "."
                : "Nenhuma rota correspondente.";
            prefixOutput.appendChild(resumo);
            blocos.forEach(function (bloco) { prefixOutput.appendChild(bloco); });
            var legenda = document.createElement("p");
            legenda.className = "text-muted mb-0";
            legenda.textContent = "Azul: bits do prefixo, os únicos comparados. Cinza: bits ignorados pela máscara. Vermelho: bit do destino que difere da rede da rota (a rota não combina).";
            prefixOutput.appendChild(legenda);
        }
        if (destination) { destination.addEventListener("input", findPrefix); findPrefix(); }

        var forward = document.getElementById("animateForwarding");
        var forwardOut = document.getElementById("forwardingOutput");
        if (forward && forwardOut) forward.addEventListener("click", function () {
            forwardOut.textContent = "Datagrama: pacote 1 A→B→D; pacote 2 A→C→D; pacote 3 A→B→D. Circuito virtual: sinalização A→B→D estabelece VC=7; dados seguintes carregam rótulo 7 e cada roteador troca o rótulo conforme sua tabela.";
        });
    });
}());