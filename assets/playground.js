(function () {
    "use strict";

    var pyodidePromise = null;
    var codemirrorPromise = null;

    // Três desafios por bloco (aquecimento, intermediário, desafio); as respostas foram conferidas executando o código.
    var desafios = {
        "capitulo1": [
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Troque quadro por \"1101\" e preveja o bit de paridade antes de executar.",
                    "resposta": "Há três bits 1 (quantidade ímpar), então o bit de paridade é 1 e o quadro codificado fica 11011."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Inverta dois bits quaisquer de codificado (em com_erro) e chame verifica_paridade. O erro é detectado?",
                    "resposta": "Não: duas inversões mantêm a paridade da quantidade de bits 1, então verifica_paridade devolve True e o erro passa despercebido."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Escreva um laço que inverta cada posição de codificado, uma por vez, e conte quantas inversões verifica_paridade detecta. Depois repita para todos os pares de posições (itertools.combinations).",
                    "resposta": "Para um quadro codificado de 5 bits: 5 de 5 inversões únicas são detectadas e 0 dos 10 pares de inversões."
                }
            ],
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Use dados = \"11111\" e preveja o corpo do quadro antes de executar.",
                    "resposta": "Depois de cinco bits 1 o transmissor insere um 0: o corpo é 111110, entre dois marcadores 01111110."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Apague a linha contador_uns = 0 dentro do if contador_uns == 5 de bit_stuffing e use dados = \"1\" * 12. Qual é a maior sequência de 1s no corpo do quadro?",
                    "resposta": "Com o código correto, no máximo 5 (corpo 11111011111011). Sem a linha, o contador não volta a zero, só um 0 é inserido e surgem 7 uns seguidos, o bastante para formar o marcador 01111110 por acidente."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Use dados = \"01111110\" (o próprio marcador) e verifique que quadro[len(MARCADOR):-len(MARCADOR)].find(MARCADOR) devolve -1.",
                    "resposta": "O corpo vira 011111010: o 0 inserido quebra a sequência de cinco 1s, o marcador não aparece nos dados e find devolve -1. remove_stuffing recupera os dados originais."
                }
            ],
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Mude prob_perda para 0.0. Quantas linhas começando com \"[Host A] envia\" aparecem para as três mensagens?",
                    "resposta": "Três: sem perdas cada mensagem é enviada uma única vez (tentativa 1) e confirmada."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Use prob_perda = 0.8 e compare a quantidade de linhas \"[Host A] envia\" com a de prob_perda = 0.3, mantendo a mesma semente.",
                    "resposta": "Com 0.8 há bem mais retransmissões: a chance de o quadro e o ACK chegarem é (1 − p)² = 0,04 por tentativa, contra 0,49 com p = 0,3. Em média, cerca de 25 tentativas por mensagem contra cerca de 2."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Quando só o ACK se perde, o Host B entrega a mesma mensagem outra vez à aplicação. Acrescente uma variável esperado no receptor: se o número de sequência recebido for diferente de esperado, descarte a duplicata e apenas reenvie o ACK.",
                    "resposta": "O receptor começa com esperado = 0. Ao receber D(seq): se seq == esperado, entrega e faz esperado = 1 - esperado; caso contrário descarta. Nos dois casos envia C(OK seq). Assim cada mensagem é entregue exatamente uma vez."
                }
            ]
        ],
        "capitulo2": [
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Preveja a interface do endereço \"01011011\" e depois execute com ele.",
                    "resposta": "Sul: o endereço começa com 0101101, o prefixo mais longo da tabela."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Acrescente \"01011\": \"Leste\" à tabela. Qual interface atende \"01011100\"? E \"01011010\"?",
                    "resposta": "\"01011100\" vai para Leste (01011 é o prefixo mais longo que combina). \"01011010\" continua em Sul, pois 0101101 é ainda mais longo."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Acrescente a rota padrão \"\": \"Padrão\" (prefixo vazio). O que muda para \"11111111\" e para \"01100000\"?",
                    "resposta": "O prefixo vazio combina com qualquer endereço, mas só vence quando nada mais combina: \"11111111\" passa de None para Padrão e \"01100000\" continua em Oeste."
                }
            ],
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Troque range(1, 10) por range(1, 2) e imprima tabelas[\"A\"]. O que A ainda não conhece?",
                    "resposta": "Depois de uma rodada, A só conhece B (custo 1) e C (custo 4). O destino D ainda não aparece e só entra na rodada 2."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Troque o custo B–D para 10 nos dois sentidos (topologia[\"B\"] e topologia[\"D\"]). Qual é a nova rota de A para D e em que rodada o programa converge?",
                    "resposta": "A passa a usar C, com custo 5 (A→C→D = 4 + 1). O programa imprime “Convergiu na rodada 4”."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Acrescente o roteador E ligado a D com custo 1 (\"E\": {\"D\": 1} e \"E\": 1 em topologia[\"D\"]). Qual é o custo de A até E e por qual vizinho?",
                    "resposta": "Custo 4, via B (A→B→D→E = 1 + 2 + 1). Via C seria 6."
                }
            ],
            [
                {
                    "nivel": "Aquecimento",
                    "texto": "Troque a origem de \"E\" para \"A\" e preveja os custos antes de executar.",
                    "resposta": "A→B 1, A→D 1, A→C 2 (via B) e A→E 2. Há empate entre A→B→E e A→D→E, e o código mantém o primeiro caminho encontrado (via B)."
                },
                {
                    "nivel": "Intermediário",
                    "texto": "Remova o enlace E–D nos dois sentidos e rode a partir de E. Qual é o novo caminho até D?",
                    "resposta": "E → B → A → D, com custo 3."
                },
                {
                    "nivel": "Desafio",
                    "texto": "Use caminhos[destino][1] para imprimir a tabela de encaminhamento de E (destino → próximo salto), como um roteador faria. Ignore o próprio E.",
                    "resposta": "B → B, C → C, D → D e A → B. O próximo salto é o segundo elemento do caminho completo."
                }
            ]
        ],
        "capitulo3": [
            [
                { "nivel": "Aquecimento", "texto": "Antes de executar, acrescente \"PASS Abc123\\r\\n\" à lista linhas e preveja a classificação.", "resposta": "passwordcommand (password='Abc123'): \"PASS\" casa com \"pass\" sem diferenciar maiúsculas e a senha começa com letra." },
                { "nivel": "Intermediário", "texto": "Mude a regra para aceitar usernames de até 12 letras. O que acontece com \"user alexandre\\r\\n\"?", "resposta": "Basta trocar {1,8} por {1,12}. \"alexandre\" tem 9 letras e passa a ser um usercommand válido." },
                { "nivel": "Desafio", "texto": "Crie QUITCOMMAND para a regra quitcommand = \"quit\" CRLF e teste \"quit\\r\\n\", \"QUIT\\r\\n\" e \"quit now\\r\\n\".", "resposta": "QUITCOMMAND = re.compile(r\"(?i:quit)\\r\\n\"). As duas primeiras são válidas; \"quit now\\r\\n\" não, porque a regra não admite argumento." }
            ],
            [
                { "nivel": "Aquecimento", "texto": "Troque todos os I por H (16 bits) nos formatos de pack/unpack e use valor = 0x0102. Preveja as duas linhas de bytes.", "resposta": "big-endian: 01 02; little-endian: 02 01. Sem conversão, o receptor lê 0x201 (513) em vez de 0x102 (258)." },
                { "nivel": "Intermediário", "texto": "Com o código original, use valor = 1. O que aparece em \"Lido sem conversão\"?", "resposta": "0x1000000, ou seja, 16 777 216: o byte 01 foi parar na posição mais significativa." },
                { "nivel": "Desafio", "texto": "Escreva ntohl(x) e confirme que ntohl(htonl(v)) == v para alguns valores.", "resposta": "def ntohl(x): return int.from_bytes(x.to_bytes(4, \"big\"), sys.byteorder). A conversão é simétrica, então aplicar as duas devolve o valor original." }
            ],
            [
                { "nivel": "Aquecimento", "texto": "Execute print(desempacota(bytes.fromhex(\"01f4810001002a7f\"))) e confira o desafio da simulação.", "resposta": "(500, 'AH', 256, 42, 127): campo de 16 bits 500, flags A e H, campo de 24 bits 256, bytes 42 e 127." },
                { "nivel": "Intermediário", "texto": "Chame empacota(1, \"\", 2**24, 0, 0). O que acontece e por quê?", "resposta": "OverflowError: int too big to convert. 2^24 precisa de 25 bits e não cabe no campo de 24 bits (3 bytes)." },
                { "nivel": "Desafio", "texto": "Reescreva empacota usando struct. Que parte não dá para fazer só com struct?", "resposta": "struct.pack(\"!HB\", f16, bits_flags) + f24.to_bytes(3, \"big\") + struct.pack(\"!BB\", b1, b2). O struct não tem formato de 24 bits, então esse campo continua com to_bytes." }
            ]
        ],
        "capitulo4": [
            [
                { "nivel": "Aquecimento", "texto": "Troque random.Random(7) por random.Random(1). A quantidade de DATA.ind muda? E as mensagens completas?", "resposta": "Passam a ser 12 pedaços em vez de 14, mas as quatro mensagens completas são as mesmas: USER alice, PASS 1234, LIST e QUIT. O delimitador independe de como o fluxo foi cortado." },
                { "nivel": "Intermediário", "texto": "Use Receptor(\"\\n\") em vez do delimitador padrão. O que muda nas mensagens?", "resposta": "Cada mensagem fica com um \"\\r\" sobrando no fim (por exemplo, 'USER alice\\r'), porque só o LF passa a ser tratado como delimitador." },
                { "nivel": "Desafio", "texto": "Faça transmite_fluxo simular o modo mensagem: um DATA.ind por SDU. O receptor continua funcionando?", "resposta": "Basta devolver list(sdus). Funciona: cada DATA.ind traz exatamente uma mensagem completa, e o delimitador apenas confirma a fronteira." }
            ],
            [
                { "nivel": "Aquecimento", "texto": "Antes de executar, liste os números de sequência dos segmentos gerados por segmenta.", "resposta": "1000, 1005, 1010, 1015 e 1020. O último carrega só 1 byte (b'S'). Cada seq é a posição do primeiro byte do segmento." },
                { "nivel": "Intermediário", "texto": "Use isn=0 e mss=8. Quantos segmentos são gerados e qual é o seq do último?", "resposta": "3 segmentos; o último é seq=16 com b'DORES' (bytes 16 a 20)." },
                { "nivel": "Desafio", "texto": "Faça recebe imprimir também os intervalos de bytes que ainda faltam.", "resposta": "Percorra sorted(self.fora_de_ordem) a partir de self.esperado: cada salto entre o fim de um bloco e o início do seguinte é uma lacuna. Na execução padrão, depois de seq=1010 falta o intervalo 1005–1009." }
            ],
            [
                { "nivel": "Aquecimento", "texto": "Antes de executar, preveja os três segmentos da abertura normal.", "resposta": "('CR', 100, None), ('CA', 500, 100) e ('CA', 100, 500): cada lado tira seu número do próprio relógio e confirma o do outro." },
                { "nivel": "Intermediário", "texto": "Simule um CA duplicado: chame A.conectar() sem entregar o resultado (CR perdido) e depois envia(\"rede\", A, (\"CA\", 77, 99)).", "resposta": "A responde ('REJECT', None, 77): ack=99 não corresponde a nenhum CR que A tenha enviado, então o CA antigo é recusado." },
                { "nivel": "Desafio", "texto": "Crie uma subclasse em que proximo_seq sempre devolve self.relogio, sem incrementar (relógio parado). Com o CR de A perdido, entregue o CA antigo (\"CA\", 499, 100) de uma conexão anterior.", "resposta": "A estabelece uma conexão fantasma: com o relógio parado, o ack antigo (100) confere com o seq atual. Por isso o relógio de transporte precisa avançar sempre, inclusive após reinicializações." }
            ],
            [
                { "nivel": "Aquecimento", "texto": "Qual é a vazão máxima com números de sequência de 32 bits e MSL de 120 s?", "resposta": "2^32 × 8 / 120 ≈ 286,3 Mbit/s." },
                { "nivel": "Intermediário", "texto": "Qual é o menor número de bits que permite usar com segurança um enlace de 100 Gbit/s com MSL de 120 s?", "resposta": "41 bits: é preciso 2^n ≥ 10^11 × 120 / 8 = 1,5 × 10^12, e log2 disso ≈ 40,4." },
                { "nivel": "Desafio", "texto": "Refaça os cálculos com MSL = 30 s. Com 32 bits, um enlace de 10 Gbit/s fica seguro?", "resposta": "O limite sobe para ≈ 1145 Mbit/s, ainda abaixo de 10 Gbit/s: o espaço acaba em 3,44 s, menos que os 30 s do MSL. É por isso que o TCP usa extensões como os timestamps (PAWS) em enlaces rápidos." }
            ]
        ],
        "capitulo5": [
            [
                {"nivel": "Aquecimento", "texto": "Acrescente a linha \"10.0.0.99    stanford-ai\" ao HOSTS_TXT e preveja a saída do primeiro laço.", "resposta": "stanford-ai -> 10.0.0.99. As outras duas linhas não mudam; UCLA-CCN continua resolvendo porque o código converte tudo para minúsculas."},
                {"nivel": "Intermediário", "texto": "Acrescente no fim do arquivo a linha \"10.9.9.9     sri-nic\", um nome repetido. O que o programa resolve para sri-nic?", "resposta": "10.9.9.9: o dicionário guarda a última linha e apaga a primeira sem avisar. No espaço de nomes plano, o NIC precisava recusar nomes repetidos."},
                {"nivel": "Desafio", "texto": "Mantendo 30 bytes por linha, a partir de quantos hosts uma única atualização transfere mais de 1 TB (10^12 bytes)?", "resposta": "182 575 hosts: é preciso n × n × 30 > 10^12, ou seja, n > √(3,33 × 10^10) ≈ 182 574,2."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Acrescente \"-ns.exemplo.org\" e \"ns1.exemplo.org\" à lista e preveja o resultado.", "resposta": "-ns.exemplo.org é inválido ('-ns' não começa com letra); ns1.exemplo.org é válido, porque o dígito está no meio do rótulo."},
                {"nivel": "Intermediário", "texto": "Mude LABEL para aceitar rótulos começando com dígito, como permite a RFC 1123. Qual nome da lista muda de resultado?", "resposta": "LABEL = re.compile(r\"[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\"). Só 3com.com muda: passa a ser válido."},
                {"nivel": "Desafio", "texto": "Acrescente o limite de 63 caracteres por rótulo da RFC 1035 e teste com \"a\" * 63 + \".com\" e \"a\" * 64 + \".com\".", "resposta": "Dentro do laço: if len(rotulo) > 63: return False, f\"rótulo com {len(rotulo)} caracteres\". O primeiro nome é válido e o segundo, inválido."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Acrescente \"ação.example\" à primeira lista. Qual é a forma ASCII?", "resposta": "xn--ao-siap.example. As letras ASCII (a, o) ficam no começo e os caracteres ç e ã são codificados depois do hífen."},
                {"nivel": "Intermediário", "texto": "Chame compara(\"GOOGLE.COM\", \"google.com\"). O que o código responde? E o DNS?", "resposta": "O código diz DIFERENTES, com 9 posições diferentes (todas as letras). O DNS trata os dois como o mesmo nome, porque não diferencia maiúsculas de minúsculas em ASCII (RFC 1035)."},
                {"nivel": "Desafio", "texto": "Escreva suspeito(nome), que devolve True se o nome tiver algum caractere fora do ASCII. Teste com \"\\u0430pple.com\" e \"bücher.example\". O critério é bom?", "resposta": "def suspeito(nome): return any(ord(c) > 127 for c in nome). Os dois dão True, mas bücher.example é um nome internacionalizado legítimo. Não basta ver se há Unicode; é preciso olhar a mistura de alfabetos (por exemplo, pelo unicodedata.name de cada caractere)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Acrescente \"h1.dom\" à lista de nomes. Quantas consultas o programa conta no total?", "resposta": "8: h2.dom gasta 2, h3.a.sdom1.dom gasta 4, a repetição sai do cache (0) e h1.dom gasta mais 2."},
                {"nivel": "Intermediário", "texto": "Resolva \"h1.sdom2.dom\". Até onde a resolução vai?", "resposta": "A raiz indica dom, e dom indica o servidor de sdom2.dom, que não existe no dicionário SERVIDORES: o programa avisa que ele não está na simulação e devolve None, depois de 2 consultas."},
                {"nivel": "Desafio", "texto": "Faça o resolvedor guardar também as delegações (as zonas aprendidas) e começar pela zona conhecida mais profunda. Quantas consultas cada nome de [\"h2.dom\", \"h3.a.sdom1.dom\", \"h3.a.sdom1.dom\", \"h1.a.sdom1.dom\"] gasta?", "resposta": "2, 3, 0 e 1, num total de 6. Depois de h2.dom, o resolvedor já sabe quem responde por dom; depois de h3.a.sdom1.dom, sabe quem responde por a.sdom1.dom e pergunta direto a ele."}
            ]
        ],
        "capitulo6": [
            [
                {"nivel": "Aquecimento", "texto": "Acrescente 20 à tupla de tamanhos. Quantos enlaces e interfaces por host a malha exige?", "resposta": "190 enlaces (20 × 19 / 2) e 19 interfaces por host; a estrela e o anel ficam com 20 enlaces."},
                {"nivel": "Intermediário", "texto": "A partir de quantos hosts a malha passa de 1000 enlaces?", "resposta": "46 hosts: 45 hosts dão 990 enlaces e 46 dão 1035."},
                {"nivel": "Desafio", "texto": "Escreva barramento(n) e arvore(n) no mesmo formato (enlaces, interfaces por host) e acrescente colunas à tabela.", "resposta": "barramento(n) devolve (1, 1): um único cabo compartilhado e uma interface por host. arvore(n) devolve n − 1 enlaces, porque toda árvore com n nós tem n − 1 arestas; as interfaces variam de 1 (folhas) a 3 (nós intermediários de uma árvore binária)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Mude a capacidade de R1-R2 para 30 e preveja a alocação antes de executar.", "resposta": "A1-A2 = 20, B1-B2 = 10, C1-C2 = 10. Agora o gargalo é R2-R3: B e C param em 10 quando ele satura, e A cresce até R1-R2 encher (20 + 10 = 30)."},
                {"nivel": "Intermediário", "texto": "Acrescente o fluxo \"D1-D2\": {\"R2-R3\"}. Qual é a nova alocação?", "resposta": "A1-A2 = 5, B1-B2 = 5, C1-C2 = 7,5 e D1-D2 = 7,5. R1-R2 satura primeiro e congela A e B em 5; C e D dividem os 15 Mbit/s que sobram em R2-R3."},
                {"nivel": "Desafio", "texto": "Rode com passo=3. O que dá errado e por quê?", "resposta": "A1-A2 e B1-B2 terminam com 6 cada, e R1-R2 passa a carregar 12 Mbit/s, mais que os 10 de capacidade. O código aumenta antes de verificar, então um passo grande ultrapassa o ponto de saturação. É preciso um passo pequeno ou calcular o aumento exato que satura o primeiro enlace."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Troque todos os tamanhos por 1000. Que fração da banda cada fluxo recebe?", "resposta": "20% cada: com pacotes do mesmo tamanho, o round-robin divide a banda igualmente."},
                {"nivel": "Intermediário", "texto": "Use tamanhos = [500, 500, 500, 500, 2000]. Que fração fica com o fluxo 5?", "resposta": "50%: por rodada, o fluxo 5 envia 2000 bytes e os outros quatro somam 2000. Cada um dos outros fica com 12,5%."},
                {"nivel": "Desafio", "texto": "Torne o escalonador justo em bytes: dê a cada fila um crédito de 1500 bytes por rodada, guarde o que sobrar e só envie o pacote da cabeça se ele couber no crédito (deficit round-robin).", "resposta": "Mantenha deficit[i]: na vez da fila i, some 1500 e, enquanto o pacote da cabeça couber, envie-o e desconte o tamanho. Com os tamanhos originais, as frações ficam perto de 20% para todos (por exemplo, 21; 21; 19,5; 19,5 e 19%), em vez de variar de 10 a 30%."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Acrescente G = 3 à lista. O que acontece com os dois ALOHA?", "resposta": "Puro: S ≈ 0,007; com slots: S ≈ 0,149. Com carga alta, quase todo quadro colide, sobretudo no ALOHA puro."},
                {"nivel": "Intermediário", "texto": "Por que o máximo do ALOHA puro fica em G = 0,5? Derive G·e^(−2G).", "resposta": "A derivada é e^(−2G)(1 − 2G), que se anula em G = 0,5. Ali S = 0,5·e^(−1) = 1/(2e) ≈ 0,184. Para o ALOHA com slots, a derivada de G·e^(−G) é e^(−G)(1 − G), com máximo em G = 1 e S = 1/e."},
                {"nivel": "Desafio", "texto": "Use simula_slots com G = 0,5 e G = 2 (100 000 slots) e compare com a teoria.", "resposta": "A simulação dá cerca de 0,303 e 0,271, praticamente iguais aos valores teóricos 0,5·e^(−0,5) ≈ 0,303 e 2·e^(−2) ≈ 0,271."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Antes de executar: qual é a chance de a disputa ser resolvida já na primeira colisão?", "resposta": "50%: cada host sorteia 0 ou 1, e há empate em 2 das 4 combinações. A simulação dá cerca de 49%."},
                {"nivel": "Intermediário", "texto": "Troque k = min(10, n) por k = 1, para que o intervalo nunca cresça. Quantas colisões em média até resolver?", "resposta": "Cerca de 2, a média de uma distribuição geométrica com p = 1/2. Com o intervalo dobrando, a média cai para cerca de 1,65."},
                {"nivel": "Desafio", "texto": "Com o algoritmo do livro, cerca de 38% das disputas terminam exatamente na segunda colisão. Calcule esse valor.", "resposta": "Para terminar na segunda colisão, a primeira tem de empatar (1/2) e a segunda não. Depois da segunda colisão, cada host sorteia entre 0 e 3, e o empate só acontece com probabilidade 1/4. Logo, 1/2 × 3/4 = 37,5%. O intervalo maior reduz a chance de nova colisão, à custa de esperas mais longas."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Comece com a = b = 0,1 nos dois algoritmos. As taxas ficam iguais?", "resposta": "Sim: partindo de uma alocação justa, tanto AIMD quanto AIAD continuam justos, porque os dois hosts recebem a mesma realimentação e aplicam a mesma regra."},
                {"nivel": "Intermediário", "texto": "No AIMD, troque 0,5 por 0,8 na diminuição. A diferença final (60 passos) fica maior ou menor?", "resposta": "Maior: cerca de 0,017 em vez de 0,0015 Mbit/s. Com β mais perto de 1, cada congestionamento reduz menos a diferença, e a convergência fica mais lenta."},
                {"nivel": "Desafio", "texto": "Crie o MIMD: aumento multiplicativo (× 1,1) e diminuição multiplicativa (× 0,5). Ele converge para a justiça?", "resposta": "Não: multiplicar as duas taxas pelo mesmo fator mantém a razão entre elas. Partindo de 0,1 e 1,6, a razão continua 16 para sempre. Só a combinação AIMD faz a diferença encolher."}
            ]
        ],
        "capitulo7": [
            [
                {"nivel": "Aquecimento", "texto": "Quantos bytes de cabeçalho as três camadas acrescentam? Que fração do quadro é dado da aplicação?", "resposta": "32 bytes de cabeçalho (14 + 10 + 8) para 15 bytes de dados: o quadro tem 47 bytes (376 bits), e só cerca de 32% é dado da aplicação."},
                {"nivel": "Intermediário", "texto": "Antes de chamar sobe, troque no quadro b\"[PKT A->B]\" por b\"[PKT B->A]\" (quadro.replace). Em que camada a recepção falha?", "resposta": "O enlace entrega normalmente, mas a rede falha com AssertionError: \"cabeçalho de rede não confere\". Cada camada só lê e retira o próprio cabeçalho."},
                {"nivel": "Desafio", "texto": "Acrescente o cabeçalho de aplicação (\"aplicação\", b\"[HTTP]\") no início de CABECALHOS. O que muda na ordem dos cabeçalhos no quadro?", "resposta": "O quadro passa a ser b'[QUADRO][PKT A->B][SEG porta=80][HTTP]GET /index.html': o cabeçalho da camada mais baixa fica mais à frente, porque é acrescentado por último, e é o primeiro a ser retirado na recepção."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Troque random.Random(4) por random.Random(7). Que diagnósticos aparecem?", "resposta": "bit trocado, bits a menos, bit trocado, bit trocado e bits a menos."},
                {"nivel": "Intermediário", "texto": "Conte os diagnósticos de 3000 transmissões com random.Random(0) (use collections.Counter). A distribuição é equilibrada?", "resposta": "Sim, cerca de um terço para cada tipo: 1038 bits a mais, 990 bits a menos e 972 bits trocados."},
                {"nivel": "Desafio", "texto": "Na rede de verdade, o receptor não conhece a sequência enviada. Como, então, ele percebe esses erros?", "resposta": "Não dá para usar diagnostica. A camada de enlace precisa delimitar os quadros (bit stuffing, por exemplo) para perceber bits a mais ou a menos, e acrescentar códigos de detecção de erros (paridade, CRC) para perceber bits trocados, como no Capítulo 1."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Que camadas do OSI correspondem à camada de aplicação do modelo de cinco camadas?", "resposta": "Três: aplicação, apresentação e sessão."},
                {"nivel": "Intermediário", "texto": "Acrescente a CORRESPONDE uma terceira informação, o capítulo do site em que cada camada aparece, e imprima-a numa nova coluna.", "resposta": "Por exemplo: Aplicação → 3, Transporte → 4, Rede → 2, Enlace → 1, Física → 1. Basta guardar tuplas de três elementos e desempacotar osi, tcpip, cap no laço."},
                {"nivel": "Desafio", "texto": "Escreva a função para_tcpip(camada_osi), que devolve a camada TCP/IP equivalente a qualquer camada do OSI.", "resposta": "Percorra CORRESPONDE e devolva o tcpip da entrada em que camada_osi aparece na lista osi. Sessão e Apresentação dão Aplicação; Rede dá Internet; Enlace e Física dão Enlace (link)."}
            ]
        ],
        "capitulo8": [
            [
                {"nivel": "Aquecimento", "texto": "Antes de executar: como fica cesar(\"REDE\", 3)?", "resposta": "UHGH: R→U, E→H, D→G, E→H."},
                {"nivel": "Intermediário", "texto": "Cifre \"ATAQUE\" com k = 13 e depois cifre o resultado de novo com k = 13. O que acontece?", "resposta": "A primeira vez dá NGNDHR; a segunda volta a ATAQUE. Com 26 letras, deslocar 13 duas vezes é dar a volta completa (é a cifra ROT13)."},
                {"nivel": "Desafio", "texto": "Faça o programa achar a chave sozinho: imprima só a tentativa que contém a palavra \"AO\" como palavra separada.", "resposta": "No laço, teste if \"AO\" in cesar(cifrada, -k).split(): só k = 11 passa, com ENCONTRO AO MEIO DIA. É assim que a força bruta reconhece o texto certo: por ele fazer sentido."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Imprima a chave em hexadecimal. Ela tem quantos bytes?", "resposta": "19 bytes, o tamanho de m1: ce8d7e11e3f220a08a97f32752541b35961aef. No one-time pad, a chave é tão longa quanto a mensagem."},
                {"nivel": "Intermediário", "texto": "Troque m2 por b\"ATACAR AO AMANHECER\" (igual a m1). O que Eve vê em c1 XOR c2?", "resposta": "Só bytes zero: c1 e c2 são idênticos. Mesmo sem a chave, Eve descobre que as duas mensagens são iguais, outra informação que vaza ao reutilizar a chave."},
                {"nivel": "Desafio", "texto": "Suponha que Eve só sabe que m1 começa com b\"ATACAR\". O que ela descobre de m2?", "resposta": "xor(xor(c1, c2)[:6], b\"ATACAR\") dá b\"RECUAR\": cada byte conhecido de m1 revela o byte da mesma posição de m2."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é o checksum de b\"PAGUE 109 A BOC\"? E o SHA-256 muda quanto?", "resposta": "129 (um a mais que 128, porque C vem depois de B). O SHA-256 muda cerca de metade dos bits: 126 dos 256 no exemplo do bloco."},
                {"nivel": "Intermediário", "texto": "Mantendo o checksum 128, ache outra alteração que não seja só trocar a ordem dos caracteres.", "resposta": "Some 1 a um byte e subtraia 1 de outro: por exemplo, b\"PAGUE 118 A BOB\" (0→1 e 9→8) tem o mesmo checksum 128. O SHA-256 continua totalmente diferente."},
                {"nivel": "Desafio", "texto": "Calcule também o MD5 das mensagens. Quantos bits ele tem e por que não deve ser usado para assinaturas?", "resposta": "hashlib.md5(msg).hexdigest() tem 32 dígitos hexadecimais, ou seja, 128 bits. Colisões do MD5 são conhecidas desde 2004, e a RFC 6151 desaconselha seu uso em assinaturas."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Troque random.Random(7) por random.Random(1). Os resultados mudam?", "resposta": "Não: Alice continua autenticada e Eve continua recusada. O nonce muda, mas a lógica não depende do valor; Eve só passaria se dois nonces seguidos fossem iguais."},
                {"nivel": "Intermediário", "texto": "Faça Bob usar sempre o mesmo nonce, por exemplo b\"764192\". O que acontece com Eve?", "resposta": "Eve passa a ser aceita: a resposta gravada vale de novo. O nonce precisa mesmo ser usado uma única vez."},
                {"nivel": "Desafio", "texto": "Continue o laço da cadeia até n chegar a 0. O que Alice envia na última autenticação, e por que isso é um problema?", "resposta": "Com n = 1, Alice envia H^0(P), a própria senha, em claro. Por isso a cadeia deve ser reinicializada (com uma nova senha ou um novo H^n) antes de chegar ao fim."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Use a = 3 e b = 7. Quais são A, B e a chave?", "resposta": "A = 10, B = 17 e a chave = 14 (17³ mod 23 = 10⁷ mod 23 = 14)."},
                {"nivel": "Intermediário", "texto": "Troque p por 2147483647 e g por 7 e use a = 123456789, b = 987654321. Por que a busca de Eve fica impraticável no navegador?", "resposta": "Alice e Bob calculam a mesma chave na hora com pow(g, a, p), mas Eve teria de testar até 2 bilhões de expoentes um a um. Com primos de milhares de bits, usados na prática, a busca é inviável."},
                {"nivel": "Desafio", "texto": "Mostre que Mallory consegue ler uma mensagem: cifre o número 42 com a chave Alice-Mallory (some a chave módulo 23), decifre do lado de Mallory e cifre de novo para Bob.", "resposta": "c = (42 + 4) % 23 = 0; Mallory decifra (0 − 4) % 23 = 19, que é 42 mod 23, e cifra para Bob com (19 + 18) % 23 = 14. Bob decifra (14 − 18) % 23 = 19. Os dois lados trocaram a mensagem, e Mallory leu tudo no meio."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Com 10^9 chaves por segundo, quanto tempo leva testar todas as chaves de 56 bits, em anos?", "resposta": "Cerca de 2,28 anos; em média, a chave aparece na metade disso. Com hardware dedicado, muito mais rápido, o DES deixa de ser seguro."},
                {"nivel": "Intermediário", "texto": "Quantos bits a mais na chave fazem o tempo ser multiplicado por 1000?", "resposta": "Cerca de 10 bits, porque 2^10 = 1024."},
                {"nivel": "Desafio", "texto": "Refaça a tabela supondo um atacante 10^6 vezes mais rápido (10^15 chaves por segundo). A chave de 128 bits continua segura?", "resposta": "Sim: o tempo cai para cerca de 1,08 × 10^16 anos, ainda muito maior que a idade do universo (≈ 1,4 × 10^10 anos). Já a de 56 bits cai para cerca de 72 segundos."}
            ]
        ],
        "capitulo9": [
            [
                {"nivel": "Aquecimento", "texto": "Acrescente \"2001:0db8:0000:0000:0001:0000:0000:0001\" à lista. Qual é a forma compacta, e por que o \"::\" fica no primeiro bloco de zeros?", "resposta": "2001:db8::1:0:0:1. Há duas sequências de dois grupos nulos, do mesmo tamanho; a RFC 5952 manda comprimir a primeira."},
                {"nivel": "Intermediário", "texto": "Escreva ::1 na forma completa com ipaddress.ip_address(\"::1\").exploded. Quantos caracteres ela tem?", "resposta": "39: 0000:0000:0000:0000:0000:0000:0000:0001, ou seja, 8 grupos de 4 dígitos e 7 dois-pontos."},
                {"nivel": "Desafio", "texto": "Escreva uma função que diga quantos grupos de 16 bits o \"::\" esconde num endereço compacto. Quanto dá para \"ff01::101\"?", "resposta": "6. Conte os grupos escritos (ff01 e 101, dois) e subtraia de 8. Uma solução: 8 - len([g for g in texto.split(\":\") if g])."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quanto vale int(ipaddress.ip_address(\"10.0.0.1\"))? Por quê?", "resposta": "167772161 = 10 × 2^24 + 1: o primeiro byte vale 10 × 16 777 216, e o último, 1."},
                {"nivel": "Intermediário", "texto": "Há um servidor de e-mail na porta 25. Por que o datagrama (\"UDP\", 25) é descartado?", "resposta": "Porque ele escuta na porta 25 do TCP. As portas do UDP e as do TCP são espaços separados: a aplicação é identificada pelo protocolo e pela porta juntos."},
                {"nivel": "Desafio", "texto": "Converta o inteiro 3405803832 de volta para a forma de texto.", "resposta": "ipaddress.ip_address(3405803832) dá 203.0.113.56, o exemplo do livro."}
            ]
        ],
        "capitulo10": [
            [
                {"nivel": "Aquecimento", "texto": "Quantos bytes tem a variável consulta? Confira com len(consulta).", "resposta": "12, o tamanho fixo do cabeçalho DNS: seis inteiros de 16 bits."},
                {"nivel": "Intermediário", "texto": "Leia o cabeçalho bytes.fromhex(\"ab cd 81 83 00 01 00 00 00 01 00 00\") com le_cabecalho. O que aconteceu?", "resposta": "É uma resposta (QR = 1) com RD e RA ligados e RCODE = 3: o nome não existe. Não há registro na seção Answer, e há 1 na seção Authority."},
                {"nivel": "Desafio", "texto": "Monte a resposta à consulta 55279 com RD, RA e TC ligados e uma pergunta. Qual é o valor das flags em hexadecimal, e o que o cliente deve fazer?", "resposta": "0x8380 (QR = 0x8000, TC = 0x200, RD = 0x100, RA = 0x80). TC indica resposta truncada: o cliente repete a consulta sobre TCP."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é o nome reverso de 203.0.113.56? Use ipaddress.ip_address(\"203.0.113.56\").reverse_pointer.", "resposta": "56.113.0.203.in-addr.arpa: os quatro bytes em ordem inversa, seguidos de in-addr.arpa."},
                {"nivel": "Intermediário", "texto": "Quantos rótulos tem o nome reverso do exemplo do livro? Use len(ip.reverse_pointer.split(\".\")).", "resposta": "34: os 32 nibbles do endereço (128 / 4) mais ip6 e arpa."},
                {"nivel": "Desafio", "texto": "Faça o caminho inverso: a partir de ip.reverse_pointer, recupere o endereço IPv6. Dica: pegue os 32 primeiros rótulos, inverta a ordem e junte-os em grupos de 4.", "resposta": "nib = nome.split(\".\")[:32][::-1]; s = \"\".join(nib); ipaddress.ip_address(\":\".join(s[i:i+4] for i in range(0, 32, 4))) devolve 2001:1890:123a::1:1e."}
            ]
        ],
        "capitulo11": [
            [
                {"nivel": "Aquecimento", "texto": "Rode b64(bytes.fromhex(\"14b9\")). O resultado bate com o FPs= impresso no livro?", "resposta": "Não: 0x14b9 dá FLk=. FPs= vem de 0x14fb, que é o que os bits impressos no livro mostram."},
                {"nivel": "Intermediário", "texto": "Quantos caracteres Base64 saem de 100 bytes? Confira com len(b64(bytes(100))). Qual é o aumento?", "resposta": "136: 34 grupos (33 completos e 1 de um byte) × 4 caracteres. É 36% maior; para entradas grandes, o aumento tende a 33%."},
                {"nivel": "Desafio", "texto": "Use base64.b64decode para decodificar \"T2kgdHVybWEh\". Que texto aparece?", "resposta": "b'Oi turma!' (decodifique com .decode() para ter a string Oi turma!)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quantos destinatários tem a linha To: da primeira mensagem? Use msg[\"To\"].split(\",\").", "resposta": "2: Alice Doe e Alice Smith."},
                {"nivel": "Intermediário", "texto": "Troque a última linha \"--simple boundary--\" por \"--simple boundary\", como está impresso no livro. O que muda na saída?", "resposta": "O módulo encontra uma terceira parte, vazia, e registra o defeito CloseBoundaryNotFoundDefect: sem a fronteira final com dois hífens, ele não sabe onde a mensagem termina."},
                {"nivel": "Desafio", "texto": "Acrescente uma terceira parte com Content-Type: text/html antes da fronteira final. Quantas partes o módulo encontra, e de que tipos?", "resposta": "3 partes: text/plain, text/plain e text/html. Cada parte começa com a linha --simple boundary seguida do seu cabeçalho e de uma linha vazia."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Troque a ordem para RCPT TO: antes de MAIL FROM:, como diz o texto do livro na pág. 146. O que o servidor responde?", "resposta": "503 para o RCPT TO: (falta o remetente), 250 para o MAIL FROM: e 503 para o DATA, porque nenhum destinatário foi aceito."},
                {"nivel": "Intermediário", "texto": "Acrescente \"RCPT TO:<carol@example.com>\" depois do de Bob. O que diz a resposta ao DATA?", "resposta": "250 Ok: queued para 2 destinatário(s). Uma mensagem pode ter vários RCPT TO:."},
                {"nivel": "Desafio", "texto": "Conte quantas respostas começam com 4 ou 5 na sessão [\"DATA\", \"EHLO x\", \"RCPT TO:<ninguem@example.com>\", \"MAIL FROM:<a@b>\", \"RCPT TO:<ninguem@example.com>\", \"QUIT\"].", "resposta": "3: DATA (503, antes de tudo), o primeiro RCPT TO: (503, sem remetente) e o segundo (550, caixa inexistente)."}
            ]
        ],
        "capitulo12": [
            [
                {"nivel": "Aquecimento", "texto": "Na URI 5 (ftp://cnn.example.com&...), quais são o usuário e o host?", "resposta": "Usuário: cnn.example.com&story=breaking_news. Host: 10.0.0.1. Tudo o que vem antes do @ é o usuário."},
                {"nivel": "Intermediário", "texto": "Acrescente \"https://alice:segredo@www.example.com:8443/a?x=1#fim\" à lista. O que aparece em p.password e p.port?", "resposta": "'segredo' e 8443. É por isso que senha na URI é obsoleta: qualquer um que veja a URI lê a senha."},
                {"nivel": "Desafio", "texto": "Use urllib.parse.quote para codificar \"/café com leite\". O que sai, e por que o é vira dois códigos?", "resposta": "/caf%C3%A9%20com%20leite. Em UTF-8, é ocupa dois bytes (C3 A9), e cada byte vira um %XX; o espaço vira %20."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quantos bytes tem o pedido montado? Use len(pedido).", "resposta": "63, contando os CR LF de cada linha e a linha vazia final."},
                {"nivel": "Intermediário", "texto": "Leia \"HTTP/1.1 301 Moved Permanently\r\nLocation: http://www.example.net/novo.html\r\n\r\n\" com le_resposta. Qual é a classe, e para onde o cliente deve ir?", "resposta": "Redirecionamento (3xx). O novo endereço está em cab[\"location\"]: http://www.example.net/novo.html."},
                {"nivel": "Desafio", "texto": "Faça le_resposta conferir se o corpo tem o tamanho anunciado em Content-Length. A resposta do livro passa?", "resposta": "Não: o cabeçalho anuncia 17019 bytes, mas o corpo do exemplo tem só 25 (len(corpo.encode())), porque o livro omitiu o documento HTML. Um cliente real esperaria pelos bytes que faltam."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "No exemplo do livro, quantos milissegundos a conexão persistente economiza em relação ao HTTP/1.0?", "resposta": "1000 ms: 2000 ms contra 1000 ms. O HTTP/1.0 gasta um RTT a mais por objeto só para abrir a conexão."},
                {"nivel": "Intermediário", "texto": "Para a página típica do livro, 70 objetos, com RTT de 50 ms e tam = 0, quanto levam o HTTP/1.0 e a conexão persistente?", "resposta": "HTTP/1.0: 70 × 2 × 50 ms = 7 s. Persistente: 70 × 50 ms = 3,5 s."},
                {"nivel": "Desafio", "texto": "A função sequencial supõe a conexão já aberta. Escreva persistente_nova(n, rtt, tam, banda), que soma o RTT da abertura. Quanto dá para os 70 objetos do item anterior?", "resposta": "3,55 s: return rtt + sequencial(n, rtt, tam, banda). A abertura custa um RTT só uma vez, e não uma vez por objeto."}
            ]
        ],
        "capitulo13": [
            [
                {"nivel": "Aquecimento", "texto": "No exemplo do livro, quantos milissegundos o pipelining economiza em relação ao modo sequencial?", "resposta": "800 ms: 1000 ms contra 200 ms."},
                {"nivel": "Intermediário", "texto": "Refaça o exemplo com banda de 1 Mbit/s (1e6). Quanto dá o pipelining, e por quê?", "resposta": "204 ms: agora a transmissão conta. 5 × 100 bytes × 8 / 10^6 = 4 ms somados ao RTT de 200 ms."},
                {"nivel": "Desafio", "texto": "Com quadros HTTP/2 de 625 bytes, em quanto tempo o objeto curto termina de chegar?", "resposta": "6 ms: (625 + 125) × 8 / 10^6 s. Quanto menor o quadro do objeto longo, menos o curto espera; o preço é mais cabeçalhos de quadro."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Acrescente (\"Dave\", \"/esportes\") ao fim da lista. Quantos acertos agora, e quantos bytes passam pelo enlace?", "resposta": "4 acertos em 7 pedidos, e o enlace continua com 370000 bytes: /esportes já estava no cache."},
                {"nivel": "Intermediário", "texto": "Que taxa de acerto o proxy reverso precisa para o servidor de 10 ms por pedido atender 400 pedidos por segundo?", "resposta": "75%: 100 / (1 − h) = 400 dá h = 0,75. Só um em cada quatro pedidos chega ao servidor."},
                {"nivel": "Desafio", "texto": "Mude o cache para guardar só o último objeto buscado. Quantos acertos sobram com a lista original?", "resposta": "1: só o segundo pedido (Bob pede /jornal logo depois de Alice). Uma solução: troque cache por uma variável ultimo e compare url == ultimo."}
            ]
        ],
        "capitulo14": [
            [
                {"nivel": "Aquecimento", "texto": "Qual é a saída de xdr_int(258).hex(\" \")?", "resposta": "00 00 01 02: 258 = 256 + 2, com o byte mais significativo primeiro."},
                {"nivel": "Intermediário", "texto": "Quantos bytes ocupam xdr_string(\"\"), xdr_string(\"abcd\") e xdr_string(\"maçã\")?", "resposta": "4, 8 e 12. A cadeia vazia é só o tamanho; \"abcd\" não precisa de enchimento; \"maçã\" tem 6 bytes em UTF-8, completados para 8, mais 4 do tamanho."},
                {"nivel": "Desafio", "texto": "Ache o menor inteiro positivo n para o qual a lista [n] ocupa o mesmo número de bytes em XDR e em JSON.", "resposta": "100000. Em XDR, [n] ocupa sempre 8 bytes (n e o elemento); em JSON, len(str(n)) + 2. Com 6 dígitos, \"[100000]\" tem 8 caracteres."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é a resposta para sum com params [2, 5]?", "resposta": "{\"jsonrpc\": \"2.0\", \"result\": 7, \"id\": ...}, com o id que você usou."},
                {"nivel": "Intermediário", "texto": "Troque as duas chamadas finais por atende(deposito, lembra_ids=True). Qual é o saldo?", "resposta": "150: o segundo pedido, com o mesmo id 7, recebe a resposta guardada, sem depositar de novo."},
                {"nivel": "Desafio", "texto": "Com lembra_ids=True, o que acontece se o depósito usar o id 1, já usado pelo sum?", "resposta": "O servidor devolve a resposta antiga do sum ({\"result\": 4, \"id\": 1}) e não deposita: o saldo continua 100. Os ids precisam ser únicos para cada pedido novo."}
            ]
        ],
        "capitulo15": [
            [
                {"nivel": "Aquecimento", "texto": "Rode hmac_a_mao com H=hashlib.sha1 e compare com hmac.new(chave, msg, hashlib.sha1). Os dois batem? Com que tamanho de bloco a chave foi completada?", "resposta": "Batem. A chave foi completada até 64 bytes (hashlib.sha1().block_size). O livro fala em blocos de 20 bytes, mas 20 é o tamanho do resumo do SHA-1, não do bloco."},
                {"nivel": "Intermediário", "texto": "Use uma chave de 100 bytes (b\"k\" * 100). O que a função faz com ela, e o resultado ainda bate com o módulo?", "resposta": "Como passa do tamanho do bloco (64), a chave é primeiro resumida com H (vira 32 bytes) e depois completada com zeros. O resultado bate com hmac.new, porque a RFC 2104 manda fazer exatamente isso."},
                {"nivel": "Desafio", "texto": "Calcule o HMAC de b\"PAGUE 900 A BOB\" com a mesma chave. Quantos dos 64 dígitos hexadecimais continuam iguais, na mesma posição, em relação ao de \"PAGUE 100 A BOB\"?", "resposta": "Só 4, o que se espera do acaso (64 / 16). Mudar um caractere muda o HMAC inteiro, e sem a chave Mallory não consegue calcular o novo valor."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Sem Mallory, o que é negociado se o servidor aceitar só [\"cifra-48\"]?", "resposta": "cifra-48: é o primeiro da lista do cliente que o servidor aceita. Não há ataque; o cliente aceitava essa cifra, e o hash confere."},
                {"nivel": "Intermediário", "texto": "O que devolvem negocia([\"zlib\", \"none\"], [\"none\"]) e negocia([\"a\"], [\"b\"])?", "resposta": "\"none\" (sem compressão, como na nota do livro) e None: sem algoritmo em comum, a conexão falha."},
                {"nivel": "Desafio", "texto": "Em vez de apagar, Mallory inverte a lista do cliente para [\"cifra-48\", \"cifra-128\"]. O que é negociado, e o hash detecta?", "resposta": "cifra-48 (agora é a primeira da lista recebida pelo servidor). O hash detecta: a lista que o servidor viu é diferente da que o cliente enviou, então os resumos não batem."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Imprima K_cliente. Qual é o segredo combinado?", "resposta": "3475115478 (com a semente 7). Ele nunca passou pela rede: só A e B passaram."},
                {"nivel": "Intermediário", "texto": "Troque a semente do random.Random para 8. O que muda?", "resposta": "Tudo: a, b, A, B, K e as seis chaves. Cada sessão gera segredos novos; é isso que faz a troca ser efêmera."},
                {"nivel": "Desafio", "texto": "Calcule pow(A, a, p), como diria o livro para o servidor. Dá K? Por quê?", "resposta": "Não: dá 2281168136, diferente de K. Elevar A = g^a ao próprio a dá g^(a²). O certo é combinar o valor do OUTRO lado com o PRÓPRIO segredo: o servidor faz A^b e o cliente faz B^a."}
            ]
        ],
        "capitulo16": [
            [
                {"nivel": "Aquecimento", "texto": "Com RTT de 150 ms, num enlace intercontinental, quanto a troca do TLS 1.2 pelo TLS 1.3 economiza até a resposta?", "resposta": "150 ms: 600 ms contra 450 ms. O TLS 1.3 tira uma ida e volta do handshake."},
                {"nivel": "Intermediário", "texto": "Uma página precisa de 4 conexões TLS 1.2 novas, uma depois da outra, a 50 ms de RTT. Quanto tempo só nas aberturas TCP e TLS, sem os pedidos?", "resposta": "600 ms: cada abertura custa 3 RTTs (1 do TCP e 2 do TLS 1.2), e 4 × 3 × 50 ms = 600 ms."},
                {"nivel": "Desafio", "texto": "O 0-RTT economiza mais uma ida e volta. Que risco ele traz para os dados enviados assim?", "resposta": "Os dados do 0-RTT podem ser repetidos: Mallory grava o ClientHello com o pedido e o reenvia. Por isso só pedidos idempotentes devem ir em 0-RTT (RFC 8446, seção 8)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quantos registros, e quantos bytes de cabeçalho e MAC, para 100 000 bytes de dados?", "resposta": "7 registros (6 cheios de 16 384 bytes e um de 1696) e 7 × 37 = 259 bytes."},
                {"nivel": "Intermediário", "texto": "Mallory apaga o segundo registro: rode recebe([r[0], r[2]]). O que o receptor detecta?", "resposta": "O registro 1 tem MAC inválido: chegou o registro de número 2, mas o receptor esperava o 1. Apagar um registro também é detectado."},
                {"nivel": "Desafio", "texto": "Mallory troca o primeiro byte do texto do registro 0 e mantém o MAC. Monte esse registro e rode recebe. O que acontece?", "resposta": "s, c, t, m = r[0]; recebe([(s, c, b\"y\" + t[1:], m)] + r[1:]) mostra MAC inválido já no registro 0: sem a chave, Mallory não consegue calcular o MAC do texto novo."}
            ]
        ],
        "capitulo17": [
            [
                {"nivel": "Aquecimento", "texto": "Quanto vale chance_por_tentativa(32768, False)?", "resposta": "0.5: com metade dos 65 536 IDs, a chance é de 50% numa consulta."},
                {"nivel": "Intermediário", "texto": "Com porta fixa e 1000 respostas falsas por tentativa, quantas tentativas Mallory precisa para passar de 50%?", "resposta": "46 (um laço com while chance_em(n, 1000, False) < 0.5: n += 1 confirma)."},
                {"nivel": "Desafio", "texto": "E com porta aleatória e 10 000 respostas falsas por tentativa?", "resposta": "297 705 tentativas, cerca de 300 mil. Sortear a porta multiplica o trabalho por 65 536."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual NSEC prova que aaa.example.org não existe?", "resposta": "gamma.example.org NSEC alpha.example.org: aaa viria antes de alpha, e é o último registro, que dá a volta, que cobre esse intervalo."},
                {"nivel": "Intermediário", "texto": "Acrescente \"delta.example.org\" à zona. Que registros NSEC aparecem, e o que a consulta por delta devolve agora?", "resposta": "alpha → beta, beta → delta, delta → gamma, gamma → alpha. A consulta por delta devolve None: o nome existe."},
                {"nivel": "Desafio", "texto": "Qual NSEC prova que www.beta.example.org não existe (na zona original)?", "resposta": "beta.example.org NSEC gamma.example.org. Na ordem canônica, os nomes abaixo de beta vêm logo depois de beta e antes de gamma."}
            ]
        ],
        "capitulo18": [
            [
                {"nivel": "Aquecimento", "texto": "Rode rede(enviados, 4, 0, 0, 0). O que muda, e o IP promete esse resultado?", "resposta": "Chega tudo, na ordem e sem erro. É possível, mas o IP não promete: perda, erro e troca de ordem podem acontecer a qualquer momento."},
                {"nivel": "Intermediário", "texto": "Com a semente 4, chegou um \"pac#\". Que pacote ele era? Como o destino poderia perceber o erro sozinho?", "resposta": "Pelo que chegou, não dá para saber: pac0, pac1 e pac2 não foram reconhecidos. O destino só perceberia o erro com um checksum, que o UDP e o TCP acrescentam."},
                {"nivel": "Desafio", "texto": "Numere os dados (f\"{i}:pac{i}\") antes de enviar e escreva, no destino, o código que põe os recebidos em ordem e lista os números que faltam. Quais faltam com a semente 4?", "resposta": "Faltam 1 e 2. Por exemplo: nums = sorted(int(d.split(\":\")[0]) for d in recebidos); [i for i in range(8) if i not in nums]. O 0 chegou como \"0:pac#\": sem checksum, ele passa por bom. Números de sequência e checksums são o que o transporte acrescenta."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quais protocolos oferecem portas e detectam erros? Use candidatos(portas=True, detecta_erros=True).", "resposta": "UDP, TCP e SCTP. O IP puro não tem portas nem detecta erros nos dados."},
                {"nivel": "Intermediário", "texto": "Por que o TCP não aparece em candidatos(mensagens=True, portas=True)?", "resposta": "Porque o TCP entrega um fluxo de bytes: não preserva as fronteiras das mensagens. O UDP e o SCTP preservam."},
                {"nivel": "Desafio", "texto": "Acrescente o RTP, que roda sobre o UDP e leva número de sequência e carimbo de tempo em cada pacote, e uma chave \"carimbo de tempo\" para todos. Quem aparece em candidatos(carimbo_de_tempo=True)?", "resposta": "Só o RTP, com a chave nova False nos outros quatro. O número de sequência deixa o receptor do RTP reordenar e perceber perdas, mas não há retransmissão: entrega garantida continua False."}
            ]
        ],
        "capitulo19": [
            [
                {"nivel": "Aquecimento", "texto": "Calcule o checksum para as cargas b\"ABCD\" e b\"CDAB\". O que você nota?", "resposta": "Os dois dão 0x04db. A soma não depende da ordem das palavras de 16 bits: trocar \"AB\" e \"CD\" de lugar não é detectado."},
                {"nivel": "Intermediário", "texto": "Chame confere com a origem \"2001:db8::9\", a carga b\"OLA\" e o checksum calculado para \"2001:db8::1\". O que acontece, e por quê?", "resposta": "Devolve False: o endereço de origem entra no pseudo-cabeçalho, então um segmento com outro endereço não passa na conferência."},
                {"nivel": "Desafio", "texto": "Ache uma carga de 3 bytes, diferente de b\"OLA\", que passe em confere com o checksum de b\"OLA\".", "resposta": "Por exemplo b\"PL@\": o primeiro byte sobe 1 (O → P) e o terceiro desce 1 (A → @). Os dois estão na metade alta das palavras de 16 bits (\"OL\" e \"A\" + zero), então os erros se compensam na soma."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é o campo Length da resposta? Confira em le_udp(resposta).", "resposta": "16: 8 bytes de cabeçalho mais os 8 de b\"resposta\"."},
                {"nivel": "Intermediário", "texto": "Monte um segmento da porta 1 para a porta 53 com os dados b\"oi\". Como ficam os bytes 2 e 3, a porta de destino, em hexadecimal?", "resposta": "00 35: 53 = 0x35, com o byte mais significativo primeiro (ordem da rede)."},
                {"nivel": "Desafio", "texto": "Um segmento tem 28 bytes, mas o campo Length diz 10. O que le_udp devolve como dados, e por quê?", "resposta": "Só os 2 primeiros bytes depois do cabeçalho (seg[8:10]): o Length manda. O restante seria enchimento ou lixo, e não é entregue à aplicação."}
            ]
        ],
        "capitulo20": [
            [
                {"nivel": "Aquecimento", "texto": "Qual é o THL do segmento syn e quantos bytes ele tem?", "resposta": "THL = 6 (o 6 de 0x60), ou seja, 24 bytes: 20 fixos e 4 da opção MSS."},
                {"nivel": "Intermediário", "texto": "Monte a resposta do servidor: portas trocadas, seq 5000, ack 1001, flags SYN e ACK. Quanto vale o byte das flags (o 14º byte, índice 13), em hexadecimal?", "resposta": "0x12: SYN é o bit 1 (0x02) e ACK o bit 4 (0x10)."},
                {"nivel": "Desafio", "texto": "Acrescente a opção de escala de janela, bytes([1, 3, 3, 7]) (um NOP e a opção tipo 3, tamanho 3, valor 7), depois do MSS. Qual é o novo THL, e o que le_tcp mostra nas opções?", "resposta": "THL = 7 (28 bytes, com 8 de opções) e {'MSS': '05b4', 'escala': '07'}: o NOP é pulado, e a escala 7 multiplica a janela anunciada por 2^7."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Com RTT de 50 ms e o Nagle ligado, quantos segmentos saem? Por quê?", "resposta": "19, um por caractere: o ACK chega antes de o próximo caractere ser digitado (a cada 100 ms), então nunca há dados pendentes."},
                {"nivel": "Intermediário", "texto": "Qual é o menor RTT, entre os múltiplos de 50 ms, em que o Nagle manda no máximo 5 segmentos?", "resposta": "500 ms (com 400 ms ainda são 6)."},
                {"nivel": "Desafio", "texto": "Com RTT de 1000 ms, quais segmentos saem e quando?", "resposta": "Três: 'l' em 0 ms, 's -la /ho' em 1000 ms e 'me/alice\n' em 2000 ms. Um segmento parcial por RTT, como diz a segunda regra."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é o rto de Jacobson depois da primeira medida (500 ms)? Por que é tão maior que o RTT?", "resposta": "1500 ms = 500 + 4 × 250. Na primeira medida, rttvar começa em rtt / 2: o algoritmo ainda não conhece a variação e é cauteloso."},
                {"nivel": "Intermediário", "texto": "Em quais medidas o rto da RFC 793 fica menor que o RTT medido? O que isso causaria?", "resposta": "Na 5ª (2000 ms, rto 1373,8) e na 6ª (2100 ms, rto 1727,1). O emissor retransmitiria segmentos que ainda estavam a caminho. O rto de Jacobson (2557 e 3679) acompanha o salto."},
                {"nivel": "Desafio", "texto": "Qual é o último rto de jacobson([100, 100, 100, 300])?", "resposta": "409,375 ms: srtt = 125 e rttvar ≈ 71,09. O salto de 100 para 300 aumenta muito o rttvar, que pesa 4 vezes no rto."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Perdendo só o segmento 4, depois da chegada de qual segmento acontece a retransmissão rápida?", "resposta": "Do 7: o segmento 3 gera o ACK 4 normal; o 5, o 6 e o 7 geram três ACKs 4 duplicados."},
                {"nivel": "Intermediário", "texto": "Por que perder o segmento 9 não dispara a retransmissão rápida?", "resposta": "Depois dele só chega o 10, que gera um único ACK duplicado. O emissor espera o rto, a menos que mande mais dados que gerem outros duplicados."},
                {"nivel": "Desafio", "texto": "Com perdidos = {2, 4, 6, 8}, o que o último ACK informa, e qual segmento é retransmitido rapidamente?", "resposta": "ACK 2 com SACK [(9, 10), (7, 7), (5, 5)]: há quatro blocos, mas só cabem três, e vai primeiro o que mudou por último. A retransmissão rápida reenvia o 2; os outros buracos o emissor descobre pelos blocos SACK."}
            ]
        ],
        "capitulo21": [
            [
                {"nivel": "Aquecimento", "texto": "Quantos segmentos Reno e Tahoe enviam em 20 RTTs, com as mesmas perdas? De onde vem a diferença?", "resposta": "516 contra 288. O Tahoe trata os três ACKs duplicados como congestionamento severo e volta a cwnd = 1; o Reno só divide a janela por 2 e segue em congestion avoidance."},
                {"nivel": "Intermediário", "texto": "No Reno, troque o evento do RTT 6 por \"timeout\". Quanto vale a cwnd nos RTTs 7 e 12?", "resposta": "1 no RTT 7 (recomeça o slow start) e 32 no RTT 12, o novo ssthresh (metade de 64): 1, 2, 4, 8, 16, 32."},
                {"nivel": "Desafio", "texto": "Sem eventos e com ssthresh = 32, em qual RTT a cwnd chega a 40? Confira com evolucao(20, {}, 32).", "resposta": "No RTT 13: 1, 2, 4, 8, 16, 32 (RTTs 0 a 5) e depois +1 por RTT."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "A partir de qual ACK a cwnd deixa de crescer 1000 bytes por ACK, e por quê?", "resposta": "A partir do ACK 8000: com o ACK 7000 a cwnd chegou a 8000, igual ao ssthresh, e o emissor passou ao congestion avoidance (+MSS·MSS/cwnd por ACK, cerca de 1 MSS por RTT)."},
                {"nivel": "Intermediário", "texto": "Chame e.expira() no fim. Como ficam cwnd e ssthresh?", "resposta": "cwnd = 1000 (1 MSS) e ssthresh = max(4302 // 2, 2000) = 2151."},
                {"nivel": "Desafio", "texto": "Mande só 3 ACKs duplicados, em vez de 5, antes do ACK 20000. Qual é a cwnd depois do ACK novo? Por que é igual à do caso com 5?", "resposta": "4302. Os duplicados depois do 3º só inflam a janela durante a recuperação; quando chega o ACK novo, a cwnd é desinflada para o ssthresh (4302) nos dois casos."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Use media_movel(fila, peso=1.0). O que acontece com a média, e com a rajada curta do começo?", "resposta": "A média vira a própria fila instantânea. A rajada curta (80 pacotes) já passa do limiar máximo e marcaria todos os pacotes: é a instabilidade que a média evita."},
                {"nivel": "Intermediário", "texto": "Qual é a probabilidade de marcação para uma média de 40 pacotes?", "resposta": "0.05: metade do caminho entre os limiares 20 e 60, então metade de p_max (0,1)."},
                {"nivel": "Desafio", "texto": "Troque 0.10 por 0.30. Quantas marcas por segundo cada fluxo recebe, aproximadamente?", "resposta": "Cerca de 30 para o fluxo grande e 0,3 para o pequeno: a marcação continua proporcional ao número de pacotes de cada fluxo."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é a janela máxima W prevista para p = 0,01?", "resposta": "Cerca de 16,3 segmentos: W = sqrt(8 / (3 × 0,01))."},
                {"nivel": "Intermediário", "texto": "Troque o RTT de 0.1 para 0.2 s. O que acontece com a vazão do modelo?", "resposta": "Cai à metade: a vazão é inversamente proporcional ao RTT."},
                {"nivel": "Desafio", "texto": "Que taxa de perda permite 100 Mbit/s com RTT de 10 ms e MSS de 1460 bytes, pelo modelo?", "resposta": "Cerca de 2 × 10^-4: isolando p, p = (sqrt(1,5) × 1460 / (0,01 × 12,5 × 10^6))^2 ≈ 0,000205."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Com janela inicial de 10 segmentos, quantos RTTs leva uma resposta de 15 kB?", "resposta": "2: o primeiro RTT entrega 14 600 bytes, que não bastam por pouco."},
                {"nivel": "Intermediário", "texto": "Qual é o maior tamanho de resposta que a janela inicial de 10 segmentos entrega em um único RTT?", "resposta": "14 600 bytes (10 × 1460), o tamanho médio de uma resposta de buscador que motivou a RFC 6928."},
                {"nivel": "Desafio", "texto": "Para 1 MB e RTT de 100 ms, quanto tempo a janela inicial de 10 economiza em relação à de 1?", "resposta": "300 ms: 7 RTTs contra 10."}
            ]
        ],
        "capitulo22": [
            [
                {"nivel": "Aquecimento", "texto": "Por onde sai um pacote para 2001:6a8:2d80::99?", "resposta": "Casa com ::/0, 2001:6a8::/32 e 2001:6a8:2d80::/48: sai por fe80::bad:bad, a rota de maior prefixo."},
                {"nivel": "Intermediário", "texto": "Acrescente a rota (\"2001:6a8:3080:2::/64\", \"fe80::2\"). Por onde saem agora 2001:6a8:3080::1234 e 2001:6a8:3080:2::9?", "resposta": "O primeiro continua pela /48 (fe80::bad:cafe): 2001:6a8:3080::1234 é 2001:6a8:3080:0::1234, fora da sub-rede 2. O segundo sai pela nova /64 (fe80::2)."},
                {"nivel": "Desafio", "texto": "Tire a rota ::/0 da tabela e encaminhe 2001:db8::1. O que acontece no código, e o que um roteador faria?", "resposta": "max() falha com uma lista vazia (ValueError): nenhuma rota casa. Um roteador descartaria o pacote e devolveria um ICMPv6 Destination Unreachable, código 0 (sem rota)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é o escopo de ff08::1?", "resposta": "Organização: o escopo é o 8, nos 4 bits baixos do segundo byte."},
                {"nivel": "Intermediário", "texto": "Como a função classifica fec0::1? Por quê?", "resposta": "Como \"outro\": fec0::/10 era o antigo bloco site-local, abandonado. Não é link-local (fe80::/10), não está em fc00::/7 (fc00 a fdff) nem em 2000::/3."},
                {"nivel": "Desafio", "texto": "Acrescente um teste para o bloco de documentação 2001:db8::/32 (RFC 3849), antes do teste de unicast global.", "resposta": "if a in ipaddress.IPv6Network(\"2001:db8::/32\"): return \"documentação (2001:db8::/32)\". Ele precisa vir antes do teste de 2000::/3, que também casaria."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quais são os 8 primeiros bytes do cabeçalho montado? Use cab[:8].hex(\" \").", "resposta": "60 01 23 45 00 14 06 40: versão 6, classe 0, rótulo de fluxo 0x12345, 20 bytes de carga, Next Header 6 (TCP) e Hop Limit 64."},
                {"nivel": "Intermediário", "texto": "Faça o que um roteador faz: copie o cabeçalho num bytearray, diminua o byte 7 e leia de novo. O que muda?", "resposta": "Só o Hop Limit, de 64 para 63. Como não há checksum no IPv6, o roteador não precisa recalcular nada."},
                {"nivel": "Desafio", "texto": "Monte o cabeçalho de um Router Advertisement: origem fe80::245:67ff:fe89:abcd, destino ff02::1, 64 bytes de carga, ICMPv6, Hop Limit 255. Quais são os 8 primeiros bytes?", "resposta": "60 00 00 00 00 40 3a ff: 64 = 0x40, ICMPv6 = 58 = 0x3a e 255 = 0xff. É a amostra \"Router Advertisement\" da simulação."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Fragmente 3000 bytes para uma MTU de 1500. Quais são os offsets?", "resposta": "0, 181 e 362: cada fragmento leva 8 × ((1500 − 48) // 8) = 1448 bytes de dados, e 1448 / 8 = 181."},
                {"nivel": "Intermediário", "texto": "Por que max_dados precisa ser múltiplo de 8?", "resposta": "Porque o Fragment Offset conta em unidades de 8 bytes: o fragmento seguinte precisa começar numa posição divisível por 8. Só o último pode ter um tamanho qualquer."},
                {"nivel": "Desafio", "texto": "Quantos fragmentos são precisos para 10 000 bytes com MTU de 1280? E qual seria o problema de usar payload[maxpayload+1:], como no livro?", "resposta": "9 fragmentos (8 de 1232 bytes e um de 144). Com o +1, um byte se perderia entre cada par de fragmentos, e o destino remontaria dados errados."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é o endereço global do roteador do livro, de MAC 00:45:67:89:ab:cd, no prefixo 2001:db8:1234:5678::/64?", "resposta": "2001:db8:1234:5678:245:67ff:fe89:abcd."},
                {"nivel": "Intermediário", "texto": "Calcule o link-local para o MAC 02:00:5e:10:00:01. O que acontece com o 02?", "resposta": "fe80::5eff:fe10:1. O 02 tem o bit U/L ligado (endereço administrado localmente); invertido, vira 00, e os zeros à esquerda somem na forma compacta."},
                {"nivel": "Desafio", "texto": "Qual é o grupo solicited-node de 2001:db8::abcd:1234?", "resposta": "ff02::1:ffcd:1234: os 24 bits finais são cd:12:34."}
            ]
        ],
        "capitulo23": [
            [
                {"nivel": "Aquecimento", "texto": "Quantos roteadores tem cada domínio? Use collections.Counter(dominio.values()).", "resposta": "Domínio 2: 5; domínios 1, 3 e 4: 4 cada. São os roteadores desenhados na Fig. 58."},
                {"nivel": "Intermediário", "texto": "Tire o enlace (\"R2d\", \"R4a\") da lista. Qual passa a ser o caminho de domínios de R1c a R4b?", "resposta": "[1, 3, 4]. O Domínio 2 perde o único enlace com o 4, e o caminho mais curto passa pelo 3."},
                {"nivel": "Desafio", "texto": "Que enlaces interdomínio, se falharem juntos, deixam o Domínio 1 isolado do resto?", "resposta": "R1a–R2b e R1d–R3a: são os dois únicos enlaces do Domínio 1 com outros domínios. Confira tirando os dois e vendo que 1 some de vizinhos."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Mude o filtro de importação para exigir pelo menos 1000 Mbit/s. Que rota a política escolhe agora?", "resposta": "R2: a R3 é recusada na importação, e entre R1 (800) e R2 (300), a mais barata é a R2."},
                {"nivel": "Intermediário", "texto": "Volte ao filtro original e acrescente R4: 15 ms, 3 saltos, 1000 Mbit/s e custo 0. Qual a política escolhe, e por quê?", "resposta": "R3: R3 e R4 empatam no custo, e min devolve a primeira da lista. A escolha num empate depende de um critério de desempate; o BGP tem uma lista deles (Capítulo 25)."},
                {"nivel": "Desafio", "texto": "Escreva uma classificação que prefira a mais barata e, no empate, a de menor atraso. Com R4, qual sai?", "resposta": "R4: min(aceitas, key=lambda r: (r[\"custo\"], r[\"atraso_ms\"])). A tupla compara o custo primeiro e só usa o atraso para desempatar."}
            ]
        ],
        "capitulo24": [
            [
                {"nivel": "Aquecimento", "texto": "Por que, sem poison reverse, a métrica sobe de 2 em 2 a cada rodada?", "resposta": "Porque, em cada rodada, B soma 1 ao que A anuncia e, logo depois, A soma 1 ao que B anuncia: as duas distâncias crescem juntas, uma sempre 1 à frente da outra."},
                {"nivel": "Intermediário", "texto": "Mude INFINITO para 32. Quantas rodadas, e quantos segundos, até A e B marcarem o destino como inalcançável?", "resposta": "16 rodadas, 480 s, contra 8 rodadas (240 s) com 16. Um infinito maior permite redes maiores, mas a contagem ao infinito demora o dobro."},
                {"nivel": "Desafio", "texto": "Simule só split horizon: A não anuncia nada a B sobre P (B mantém INFINITO). O que acontece? Isso resolve sempre?", "resposta": "Converge em 1 rodada, como com poison reverse: B não ouve nada e A recebe 16. Nesta rede de dois roteadores dá certo, mas split horizon e poison reverse não evitam a contagem ao infinito em laços de três ou mais roteadores."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é a distância de RA até R5, dentro da área 1? Use dijkstra(\"RA\", {\"R4\", \"R5\", \"RA\"}).", "resposta": "2 (RA–R4–R5). Por isso 2001:db8:aaaa:0::/64 fica a distância 2 de RA, e não 1 como diz o livro."},
                {"nivel": "Intermediário", "texto": "Acrescente o prefixo 2001:db8:9999::/48 em R7 (no dicionário e na tupla do último laço). Que resumos RB e RC anunciam, e qual RA escolhe?", "resposta": "RB anuncia distância 1 e RC, 2. RA escolhe o resumo de RB, com custo total 2 (1 até RB mais 1)."},
                {"nivel": "Desafio", "texto": "Qual é a distância de R5 até 2001:db8:5678::/48? R5 não vê a área 2: o que ele soma?", "resposta": "5: a distância de R5 até RA dentro da área 1 (2) mais o custo que RA anuncia para o prefixo (3). R5 só conhece o resumo da borda, não a topologia da área 2."}
            ]
        ],
        "capitulo25": [
            [
                {"nivel": "Aquecimento", "texto": "AS2 alcança o prefixo de AS3 pelo par AS1. Por que não pelo seu cliente AS4, que é par de AS3?", "resposta": "Porque AS4 aprendeu a rota de um par (AS3) e, pela regra de exportação, só anuncia ao provedor AS2 as rotas próprias e as de clientes."},
                {"nivel": "Intermediário", "texto": "Torne AS7 cliente também de AS3: provedores[\"AS7\"] = [\"AS4\", \"AS3\"]. Como AS3 passa a alcançar o prefixo de AS7?", "resposta": "Por AS3 AS7, aprendida do cliente AS7 direto, e não mais pelo par AS4. Rotas de clientes têm preferência, e o caminho também é mais curto."},
                {"nivel": "Desafio", "texto": "Desligue a regra de exportação (troque a condição do if por False). Que caminho AS2 passa a usar para o prefixo de AS3, e por que AS4 não gostaria disso?", "resposta": "AS2 AS4 AS3, aprendida do cliente AS4 (preferida à rota do par AS1). AS4 passaria a carregar, pelo enlace que paga a AS2, tráfego destinado ao par AS3: daria trânsito de graça e ainda pagaria por ele."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Sem filtro de importação, RA venceu por qual critério? Por quê?", "resposta": "Pelo menor identificador do roteador: as duas rotas empatam em todos os critérios anteriores, e RA tem router_id 1."},
                {"nivel": "Intermediário", "texto": "Sem local-pref, dê a RB o AS-Path [\"AS2\", \"AS2\", \"AS2\"]. Quem vence e por quê?", "resposta": "RA, pelo AS-Path mais curto. Repetir o próprio número (prepending) é como um domínio deixa um caminho menos atraente para os vizinhos (complemento)."},
                {"nivel": "Desafio", "texto": "Acrescente uma rota RC aprendida por iBGP, com local-pref 100, AS-Path [\"AS2\"], MED 0, custo IGP 5 e router_id 0, com RB de volta a 100. Quem vence?", "resposta": "RA. As três empatam no local-pref, no AS-Path e no MED; o critério eBGP antes de iBGP elimina RC (apesar do router_id 0), e RA vence RB pelo identificador."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Na ordem \"AS4 primeiro\", qual é o estado final e por que ele é estável?", "resposta": "(AS4, AS1): AS3 usa a rota via AS4, e AS4 a direta. AS3 deixa de anunciar a sua rota direta, e o caminho AS3 AS4 AS1 seria rejeitado por AS4, que já está no AS-Path. Ninguém tem motivo para mudar."},
                {"nivel": "Intermediário", "texto": "No modo \"ao mesmo tempo\", o que faz o BGP real sair do ciclo?", "resposta": "Os atrasos das mensagens e dos temporizadores nunca são exatamente iguais: um dos dois anuncia antes, e a rede cai num dos dois estados estáveis (pág. 255 do PDF)."},
                {"nivel": "Desafio", "texto": "Se AS3 mudar a política e preferir a rota direta de AS1, quantos estados estáveis restam?", "resposta": "Um só: AS3 usa a direta e sempre a anuncia, e AS4 usa a rota via AS3, que prefere. Sem preferências em conflito, a ordem das mensagens deixa de importar."}
            ]
        ],
        "capitulo26": [
            [
                {"nivel": "Aquecimento", "texto": "Monte o quadro do pacote 01 02 03 com o protocolo 0x0021 (IPv4). Quais são os bytes?", "resposta": "7e ff 03 00 21 01 02 03 b7 c6 7e: nenhum byte precisou de escape, e o FCS é 0xc6b7, enviado como b7 c6."},
                {"nivel": "Intermediário", "texto": "Troque o pacote por 7d 7d 7d. Quantos bytes tem o quadro?", "resposta": "14: cada 7d vira 7d 5d (6 bytes), mais 2 flags, 4 de cabeçalho e 2 de FCS. No pior caso, a inserção de bytes dobra o tamanho dos dados."},
                {"nivel": "Desafio", "texto": "Troque um byte no caminho, com y = q[:5] + b\"\\x61\" + q[6:], e chame desenquadra(y). O que acontece?", "resposta": "O pacote volta como 61 7e 00 7d 01, mas o terceiro valor é False: o FCS recalculado não bate com o recebido, e o receptor descarta o quadro."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Por que ff:ff:ff:ff:ff:ff aparece como \"local\"?", "resposta": "Porque todos os bits estão em 1, inclusive o U/L. No broadcast esse bit não tem significado: o teste de broadcast vem antes, e o endereço vale para todos os hosts da LAN."},
                {"nivel": "Intermediário", "texto": "Classifique 01:00:5e:00:00:fb.", "resposta": "Grupo (multicast), universal, OUI 01:00:5e: o primeiro byte, 0x01, tem I/G = 1 e U/L = 0."},
                {"nivel": "Desafio", "texto": "No IPv6, o MAC de um grupo multicast é 33:33 seguido dos 32 bits finais do endereço (RFC 2464). Qual é o MAC do grupo ff02::1:ff00:bb? Use ipaddress.IPv6Address(...).packed[-4:].", "resposta": "33:33:ff:00:00:bb. O primeiro byte, 0x33, tem I/G = 1 (grupo) e U/L = 1 (local)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é o tamanho do quadro com bytes(100) de dados?", "resposta": "118 bytes: 14 de cabeçalho, 100 de dados e 4 de CRC, sem enchimento."},
                {"nivel": "Intermediário", "texto": "Chame quadro_dix com bytes(1501) e formato(1501). O que acontece?", "resposta": "quadro_dix levanta ValueError (mais de 1500 bytes de dados), e formato devolve \"valor indefinido\": 1501 não é um tamanho válido nem um EtherType, que começam em 0x0600 = 1536."},
                {"nivel": "Desafio", "texto": "Troque dois bits em vez de um: ruim[20] ^= 0x04 e ruim[30] ^= 0x01. O receptor percebe?", "resposta": "Sim: o CRC-32 do quadro dá 0xad666fa2, e não o valor fixo 0x2144df1c. Num quadro desse tamanho, o CRC-32 detecta qualquer erro de 1 ou 2 bits, ao contrário do checksum da Internet, que deixa passar, por exemplo, trocas que se compensam."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Por que, no fim, SW1 não conhece B nem C?", "resposta": "Porque nenhum quadro de B ou de C passou por SW1: B → A ficou embaixo (SW2 já sabia que A estava a oeste), e C → B foi descartado por SW2. Um switch só aprende um endereço quando recebe um quadro com essa origem."},
                {"nivel": "Intermediário", "texto": "Depois da execução, rode envia(\"C\", \"B\", filtra=False). Quem vê o quadro?", "resposta": "[\"B\", \"B\", \"C\"]: B o vê duas vezes (pelo barramento e de volta pelo switch), e C recebe o próprio quadro. É o pseudo-código do livro seguido à risca."},
                {"nivel": "Desafio", "texto": "Simule a expiração da entrada de A em SW2: del tabela[\"SW2\"][\"A\"] e depois envia(\"B\", \"A\"). Quem vê o quadro, e o que muda nas tabelas?", "resposta": "C e A, como antes. Mas, sem saber onde está A, SW2 inunda o quadro também para SW1, que aprende que B está ao sul e o descarta, porque A está ao sul. SW2 só reaprende A quando A mandar um quadro."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é a BPDU de Sw9 na Fig. 90? Use stp(fig90)[0][9].", "resposta": "<1, 1, 9, p>: a raiz é Sw1, o custo é 1 (a porta 1 de Sw9) e quem envia é Sw9."},
                {"nivel": "Intermediário", "texto": "Mude o custo da porta 1 de Sw4 de 3 para 1. Que portas mudam de papel?", "resposta": "A porta 1 de Sw4 vira a raiz (custo 1), a porta 2 de Sw4 vira designada, e a porta 2 de Sw9 é bloqueada: na LAN B, <1,1,4,2> vence <1,1,9,2> pelo identificador."},
                {"nivel": "Desafio", "texto": "Na Fig. 89, derrube a LAN C. Quais portas ficam bloqueadas?", "resposta": "Sw9 na LAN B e Sw44 na LAN G. Sw7 passa a chegar à raiz pela LAN H (custo 2). Sw9 empata com custo 3 entre a LAN A (via Sw2) e a LAN B (via Sw7) e fica com Sw2, de identificador menor."}
            ]
        ],
        "capitulo28": [
            [
                {"nivel": "Aquecimento", "texto": "Use tempo_quadro para um quadro de 1500 bytes num enlace de 10 Mbit/s com 5 ms de propagação. Quanto dá?", "resposta": "0,0062 s: 1,2 ms de transmissão (12.000 bits a 10 Mbit/s) mais 5 ms de propagação."},
                {"nivel": "Intermediário", "texto": "Calcule o caso com os dados na descida: bit_alternado(dados, 25, 50e6, 1e6, 0.010). Por que a vazão quase não muda com 125 bytes, mas muda muito com 1500?", "resposta": "Com 125 bytes: 49,46 quadros/s, contra 47,61 na subida. Com 1500: 48,92, contra 31,25. Com quadros pequenos, os 20 ms de ida e volta dominam o ciclo; com 1500 bytes na subida, só transmitir o quadro a 1 Mbit/s leva 12 ms."},
                {"nivel": "Desafio", "texto": "Que janela, em quadros, ocupa todo o enlace de 10 Gbit/s da discussão? Teste janela(W, 10_000, 10e9, 0.002) com valores perto da resposta.", "resposta": "2001 quadros: cada ciclo dura 2 ms de RTT mais 1 µs de transmissão, e cabem nele 2,001 ms × 10 Gbit/s / 10.000 bits = 2001 quadros. Com 2000, a vazão fica um pouco abaixo de 10 Gbit/s."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Rode simula(\"gbn\", rto=1000, perdas=(2, 6)). Quando a transferência termina, e quantos quadros são enviados?", "resposta": "Em 2610 ms, com os mesmos 18 envios: o temporizador menor só antecipa as retransmissões em 2 s cada."},
                {"nivel": "Intermediário", "texto": "Rode simula(\"gbn\", rto=150, perdas=(2, 6)). O que muda, e por quê?", "resposta": "Termina em 757 ms, mas com 26 envios. O temporizador de 150 ms expira antes de a confirmação voltar (o RTT é de cerca de 201 ms), e o emissor retransmite quadros que chegaram, como D(0) a D(3). As perdas são recuperadas mais cedo, mas o enlace carrega muito mais dados: o temporizador precisa ser maior que o RTT."},
                {"nivel": "Desafio", "texto": "Com W=10 (janela do tamanho da transferência) e perdas=(2, 6), compare o go-back-n e o selective repeat com confirmações seletivas.", "resposta": "Go-back-n: 3410 ms e 18 envios (retransmite D(2) a D(9)). Selective repeat com sack=True: 3207 ms e 12 envios (só D(2) e D(6)). Com a janela inteira aberta, as duas perdas são recuperadas na mesma rodada de temporizadores."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Por que o Fletcher-16 percebe a troca das duas primeiras palavras, e o checksum da Internet não?", "resposta": "O checksum da Internet é uma soma, que não depende da ordem das parcelas. No Fletcher, a segunda soma, b, acumula a primeira a cada byte; assim, cada byte pesa conforme a sua posição, e trocar bytes de lugar muda b."},
                {"nivel": "Intermediário", "texto": "Faça m = bytearray(original); m[1] += 1; m[3] -= 1 e calcule o checksum da Internet de bytes(m). O que acontece?", "resposta": "A mensagem vira b'Rfdds de Computadores!', e o checksum continua 0xb331: a primeira palavra ganhou 1 e a segunda perdeu 1, e a soma não muda. O CRC-32 muda (0x0808318e)."},
                {"nivel": "Desafio", "texto": "Aplique à mensagem os 15 bits do gerador do CRC-32: x = bytearray(original); for i, b in enumerate((0x1DB710641).to_bytes(5, \"little\")): x[3 + i] ^= b. O CRC-32 percebe?", "resposta": "Não: zlib.crc32(bytes(x)) dá 0xa4f43335, o mesmo da original, embora 15 bits (um número ímpar) tenham mudado. O erro é um múltiplo do polinômio gerador, e o CRC-32 não tem o fator (x + 1): ele não detecta todo erro com número ímpar de bits. O checksum da Internet, aqui, percebe (0x5642)."}
            ]
        ],
        "capitulo29": [
            [
                {"nivel": "Aquecimento", "texto": "Depois de rodar o bloco, crie outro socket e tente bind((\"::1\", 55555)). O que acontece?", "resposta": "OSError: EADDRINUSE. O servidor já está ligado a esse endereço, e dois sockets não podem ocupar a mesma porta e o mesmo endereço."},
                {"nivel": "Intermediário", "texto": "Chame Socket().send(b\"x\"), sem connect. O que acontece, e por que sendto não tem o mesmo problema?", "resposta": "OSError: EDESTADDRREQ. send não leva destino e só funciona num socket conectado; sendto recebe o destino em cada chamada."},
                {"nivel": "Desafio", "texto": "Mande Socket().sendto(b\"hello\", (\"::1\", 9999)), uma porta onde ninguém escuta. O que sendto devolve, e o que acontece com o datagrama?", "resposta": "Devolve 5, os bytes enviados, e o datagrama é descartado em silêncio: o UDP não confirma a entrega. Num sistema real, o destino responderia com um ICMP de porta inalcançável, que o Linux só repassa (como ECONNREFUSED) a sockets conectados."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Monte o pedido de ./client -op * ::1 10000 2 3 4 com pedido(\"*\", [2, 3, 4]). Quais são os bytes, e qual é o resultado?", "resposta": "2a 00 00 03 00 00 00 02 00 00 00 03 00 00 00 04: '*' (0x2a), flags 0, três números de 32 bits. O servidor responde 00 00 00 04 00 00 00 18, ou seja, 24."},
                {"nivel": "Intermediário", "texto": "Decodifique a mensagem bytes.fromhex(\"00 50 41 00 01 bb 0a 0b\") no formato da Fig. 3.", "resposta": "struct.unpack(\"!HB\", x[:3]) dá (80, 65): o primeiro campo é 80, e as flags 0x41 = 01000001 ligam B e H. int.from_bytes(x[3:6], \"big\") dá 443; os dois bytes finais valem 10 e 11."},
                {"nivel": "Desafio", "texto": "Chame cliente(\"+\", [2147483647, 1]). O que o servidor responde, e como o cliente obtém o resultado?", "resposta": "Estado 2 (02 00 00 00): 2147483648 não cabe num inteiro de 32 bits com sinal. Com texto=True, a resposta leva os caracteres \"2147483648\" e não tem esse limite."}
            ]
        ],
        "capitulo30": [
            [
                {"nivel": "Aquecimento", "texto": "Troque a ordem dos envios para A → C, C → B e B → A. Quantas transmissões tem o primeiro envio agora, e por quê?", "resposta": "5. Com as tabelas vazias, R1 não conhece C e inunda: A→R1, R1→R2, R2→R3, e R3 manda cópias para B e para C. As tabelas finais são as mesmas."},
                {"nivel": "Intermediário", "texto": "Acrescente o enlace R1–R3 (\"R3\" na lista de R1 e \"R1\" na de R3) e deixe só o envio C → B. O que o programa mostra?", "resposta": "Ele para em 30 transmissões com \"(interrompido)\", e B recebe cinco cópias do mesmo pacote. As cópias circulam pelo ciclo R1–R2–R3, e a tabela de R3 chega a apontar C para R2, embora C esteja ligado direto a R3."},
                {"nivel": "Desafio", "texto": "Depois dos três envios do livro, acrescente o envio (\"A\", \"Z\"), para um host que não existe. Quantas transmissões? E se você mandar mais um igual?", "resposta": "5 nos dois casos: R1, R2 e R3 nunca aprendem Z, porque Z nunca envia nada, e cada pacote para Z é inundado pela árvore inteira (pág. 37 do PDF)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Acrescente um print de caminho(\"Sunnyvale\", \"Washington\"). Qual é o caminho e o custo?", "resposta": "(4, ['Sunnyvale', 'Los Angeles', 'Houston', 'Atlanta', 'Washington'])."},
                {"nivel": "Intermediário", "texto": "Ponha peso 5 no enlace Houston–Atlanta, nos dois sentidos. O que acontece com as rotas de Los Angeles?", "resposta": "LA → New York passa a ir por Houston, Kansas City, Indianapolis e Chicago (custo 5), e LA → Washington por Houston, Kansas City, Indianapolis e Atlanta (custo 5). O enlace Houston–Atlanta deixa de ser usado por LA."},
                {"nivel": "Desafio", "texto": "Configure PESO para que só os pacotes entre Denver e Kansas City usem esse enlace. A última linha deve dizer \"2 pares\".", "resposta": "Uma solução: Denver–Seattle = 2, Denver–Kansas City = 5 e Houston–Kansas City = 3 nos dois sentidos, o resto em 1. Só mexer em Denver–Kansas City não basta: com os outros em 1, o peso teria de ser menor e maior que 4 ao mesmo tempo."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Troque a ordem dos recálculos para C, B, D, A, E. Quando todos os 10 pares voltam?", "resposta": "Depois de D: C já manda por D, B também, e quando D recalcula as rotas para A e B, tudo funciona. Antes disso, continuam só 4 pares."},
                {"nivel": "Intermediário", "texto": "Faça falhar o enlace D–E em vez de B–C (troque a chave na linha de vivos). Quem fica isolado até alguém recalcular?", "resposta": "E: só os 6 pares entre A, B, C e D funcionam até E recalcular, porque E mandava tudo por D. Nesta ordem, os 10 pares só voltam depois de E."},
                {"nivel": "Desafio", "texto": "Com B–C falhando de novo, mude o peso de B–D para 1 antes de rodar. Quantos pares funcionam antes de qualquer recálculo, e por quê?", "resposta": "8: com B–D = 1, quase todos os caminhos já usavam B–D; só os caminhos entre C e A e entre C e B passavam por B–C. Esses dois pares voltam quando C recalcula."}
            ]
        ],
        "capitulo31": [
            [
                {"nivel": "Aquecimento", "texto": "Chame juntando(8765, pedidos, 4). Quantos segmentos saem, e qual é o seq do último?", "resposta": "Seis segmentos: cinco de 4 bytes e um de 1. O último tem seq = 8765 + 20 = 8785 e ack 8786."},
                {"nivel": "Intermediário", "texto": "Acrescente \"xyz\" ao fim da lista pedidos. Com que seq ele sai na Q4, e qual é o último ack?", "resposta": "DATA(seq=8786,xyz), confirmado com ack=8789: 8765 + 21 bytes anteriores = 8786."},
                {"nivel": "Desafio", "texto": "Escreva remonta(segs) que receba os segmentos da Q5 fora de ordem, por exemplo [(8773, \"bbbbbbbb\"), (8781, \"bbbbb\"), (8765, \"abcdefga\")], e devolva o fluxo original.", "resposta": "def remonta(segs): return \"\".join(d for _s, d in sorted(segs)). Ordenar pelo seq recoloca cada pedaço na sua posição: o resultado é \"abcdefgabbbbbbbbbbbbb\", os 21 bytes."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Faça B mandar também DATA \"World\" antes de fechar. Que seq leva o DR de B?", "resposta": "2143: Hello usa 2141, World usa 2142, e o DR leva o próximo número."},
                {"nivel": "Intermediário", "texto": "Chame A.recebe_ack(9999). O que acontece, e o que um protocolo real deveria fazer?", "resposta": "KeyError: 9999 não está em nao_confirmados. Um protocolo real ignora (ou registra) a confirmação de um segmento que nunca mandou, em vez de travar."},
                {"nivel": "Desafio", "texto": "Faça A mandar dois segmentos seguidos e receber os acks na ordem inversa (primeiro 1342, depois 1341). O que o programa mostra?", "resposta": "Depois de ack=1342, faltam [1341]; depois de ack=1341, a lista fica vazia. Com um ack por segmento, a ordem de chegada não importa, mas A precisa guardar a cópia de cada segmento até o ack dele chegar."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Calcule taxa_maxima(16, 100). Que protocolo aguentaria isso?", "resposta": "655,36 segmentos por segundo: um número de 16 bits só serve para conexões lentas, se o tempo de vida for de 100 s."},
                {"nivel": "Intermediário", "texto": "Com 32 bits contando bytes, qual deveria ser o MSL para um enlace de 10 Gbit/s ser seguro?", "resposta": "MSL = 2³² × 8 / 10¹⁰ ≈ 3,4 s. Como a Internet não garante algo tão curto, os TCPs rápidos usam timestamps."},
                {"nivel": "Desafio", "texto": "Quantos discos de 1 TB por dia o correio precisaria levar para igualar um enlace de 10 Gbit/s?", "resposta": "10¹⁰ × 86 400 / (8 × 10¹²) = 108 discos por dia."}
            ]
        ],
        "capitulo32": [
            [
                {"nivel": "Aquecimento", "texto": "Na Q2, atrase o pedido de C. A partir de que instante C pode começar sem colidir com o segundo quadro de B?", "resposta": "75 µs: o quadro de B (60–70 µs) passa por C entre 65 e 75 µs. Com C em 74 µs, ainda colidem perto de C."},
                {"nivel": "Intermediário", "texto": "Na Q1, mude o primeiro pedido de B para 1004, 1005 e 1006 µs. O que acontece com a colisão entre A0 e B1?", "resposta": "Com 1004 µs, ainda colidem perto de B; a partir de 1005 µs, não: o último bit de A passa por B exatamente em 1005 µs. B1 e C2 continuam colidindo."},
                {"nivel": "Desafio", "texto": "Refaça a Q2 com quadros de 2000 bits. Quais pares colidem agora?", "resposta": "A0 e B1 passam a colidir, porque o quadro de A dura 20 µs e o fim dele chega a B em 30 µs, depois que B começou (20 µs). C2 e B3 continuam colidindo."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Na Q1, aumente R1>R2 para 20 Mbps. Quais são as novas taxas?", "resposta": "S1, S2 e S3 sobem para 6,67 Mbps; S4 e S5 continuam com 10 Mbps, limitados pelo sentido R3→R2."},
                {"nivel": "Intermediário", "texto": "Na Q4, quantos passos (enlaces lotando) o programa imprime, e em que ordem?", "resposta": "Quatro: Link1 (17), Link4 (20,75), Link3 (S5 fica com 37,75) e Link2 (S1 fica com 45,25)."},
                {"nivel": "Desafio", "texto": "Modele a Q1 supondo que os dois sentidos dividem a mesma capacidade: enlaces \"R1-R2\" e \"R2-R3\", e S4 usando os dois. Quais são as taxas?", "resposta": "S1, S2, S3 e S4 ficam com 2,5 Mbps (R1-R2 lota primeiro), e S5 fica com 20 − 3 × 2,5 = 12,5 Mbps."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Chame transfere(3). Os acks mudam em relação à janela 2? Por quê?", "resposta": "Não: 5,01, 9,01, 13,01, 17,01 e 21,01 ms. Com janela 2, o enlace de 250 kbps já está sempre ocupado; uma janela maior só põe mais segmentos na fila de R1."},
                {"nivel": "Intermediário", "texto": "Mude TX para [1.0, 2.0, 0.01], um enlace de 500 kbps. Quais são os acks com janela 2?", "resposta": "3,01, 5,01, 7,01, 9,01 e 11,01 ms: um segmento a cada 2 ms, o ritmo do novo gargalo."},
                {"nivel": "Desafio", "texto": "Na Q3, suponha que B mande só 30 Mbps. Quanto D recebe de A quando A manda 100 Mbps?", "resposta": "70 Mbps: o round-robin dá a B só o que ele usa (30), e o resto da saída fica para A. A regra geral é min(taxa de A, 100 − min(taxa de B, 50))."}
            ]
        ],
        "capitulo33": [
            [
                {"nivel": "Aquecimento", "texto": "Monte consulta(1, \"rede.example\", \"MX\"). Quantos bytes tem a mensagem, e como terminam?", "resposta": "30 bytes: 12 do cabeçalho, 14 do nome (4rede7example0) e 4 da pergunta, que terminam em 00 0f 00 01: tipo MX (15) e classe IN (1)."},
                {"nivel": "Intermediário", "texto": "Que flags estão ligadas em 0x8580?", "resposta": "qr, aa, rd e ra: é a resposta de um servidor que é autoritativo e também faz recursão."},
                {"nivel": "Desafio", "texto": "Escreva le_nome(msg, i) que leia o nome a partir do byte 12 de msg e devolva \"www.rede.example\".", "resposta": "Leia o byte de comprimento, junte os rótulos até achar 0: partes = []; while msg[i]: n = msg[i]; partes.append(msg[i+1:i+1+n].decode()); i += n + 1; return \".\".join(partes). (As respostas reais podem usar ponteiros de compressão, que este código não trata.)"}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Depois das três linhas, faça relogio = 4000 e resolva www.rede.example de novo. O que muda?", "resposta": "O cache expirou (o registro valia até 3600 s): o resolvedor refaz o caminho ., example., rede.example. e devolve o TTL cheio, 3600."},
                {"nivel": "Intermediário", "texto": "Resolva (\"rede.example.\", \"MX\"). Que caminho o resolvedor faz?", "resposta": "O mesmo de www: raiz, example. e rede.example., que devolve os três MX com TTL 3600."},
                {"nivel": "Desafio", "texto": "Resolva (\"ftp.rede.example.\", \"AAAA\"). O que acontece, e como responder como um servidor de verdade?", "resposta": "KeyError: o nome não existe na zona. Um servidor real responde com status NXDOMAIN; no código, use z[\"rr\"].get(chave) e devolva ([], 0, caminho + [\"NXDOMAIN\"]) quando vier None."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Calcule chance(65536). Por que não dá 100%?", "resposta": "Cerca de 63,2%: as respostas têm ids sorteados e podem se repetir, então 65 536 respostas não cobrem todos os valores. Seria 100% se o atacante mandasse cada id uma vez."},
                {"nivel": "Intermediário", "texto": "Ache n para chance(n) passar de 50%.", "resposta": "n = 45 426 (≈ ln 0,5 / ln(1 − 1/65 536))."},
                {"nivel": "Desafio", "texto": "E com 32 bits de incerteza (id e porta sorteados)?", "resposta": "Cerca de 2,98 bilhões de respostas: inviável de mandar antes da resposta verdadeira."}
            ]
        ],
        "capitulo34": [
            [
                {"nivel": "Aquecimento", "texto": "Tire a linha RCPT da sessão. O que o servidor responde ao DATA e às linhas seguintes?", "resposta": "503 need RCPT command ao DATA. Como o servidor não entrou no modo de dados, as linhas do texto e o ponto viram comandos desconhecidos (502), até o QUIT."},
                {"nivel": "Intermediário", "texto": "Faça o servidor recusar destinatários fora de example.org com o código 554.", "resposta": "No ramo RCPT: if not l.rstrip(\">\").lower().endswith(\"@example.org\"): respostas.append(\"554 Relay access denied\") (e não acrescente a para). É assim que servidores reais evitam ser relays abertos."},
                {"nivel": "Desafio", "texto": "Implemente o dot-stuffing: no modo de dados, uma linha \"..net\" deve virar \".net\" no texto guardado.", "resposta": "Guarde as linhas numa lista texto e, no modo de dados, faça texto.append(l[1:] if l.startswith(\"..\") else l) antes do continue. Só a linha \".\" encerra o texto (RFC 5321, seção 4.5.2)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quanto tempo a mensagem levou do Date até chegar à caixa?", "resposta": "5 s: de 10:00:02 a 10:00:07 (1 + 2 + 2 s nos três saltos)."},
                {"nivel": "Intermediário", "texto": "Mude o Date para 10:00:00. O que muda na saída?", "resposta": "Só a primeira linha: smtp.example.org passa a receber 3 s depois. É assim que se descobre um relógio adiantado ou uma mensagem que esperou no computador do remetente."},
                {"nivel": "Desafio", "texto": "Imprima o caminho completo, do primeiro ao último servidor, numa linha só, como \"[2001:db8:1::99] → smtp.example.org → mx.example.net → caixa.example.net\".", "resposta": "Pegue o primeiro \"from\" e todos os \"by\": caminho = [saltos[0].split()[1]] + [r.split(\" by \")[1].split()[0] for r in saltos]; print(\" → \".join(caminho))."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Mude LIMITE para 2000. Que comandos o cliente manda?", "resposta": "RETR 1 e QUIT: só a mensagem de 1200 octetos passa."},
                {"nivel": "Intermediário", "texto": "Acrescente a linha \"5 4999\" antes do ponto na resposta do LIST. O que muda?", "resposta": "Os comandos viram RETR 1, RETR 3 e RETR 5: 4999 octetos ainda é menos que 5 KB."},
                {"nivel": "Desafio", "texto": "Faça o programa tratar uma resposta negativa, como \"-ERR caixa trancada\", em vez de quebrar no assert.", "resposta": "Troque o assert por if not positiva(linhas[0]): print(\"o servidor recusou:\", linhas[0]) e pare ali. Basta olhar o primeiro caractere: + ou -."}
            ]
        ],
        "capitulo35": [
            [
                {"nivel": "Aquecimento", "texto": "Mande \"GET / HTTP/1.1\\r\\nHost: outro.example\\r\\n\\r\\n\". O que volta?", "resposta": "200 com a página de www.example.com: o host é desconhecido e o servidor cai no site padrão."},
                {"nivel": "Intermediário", "texto": "Mande o pedido com \"host: DOCS.example.org\". Que página vem, e o que está errado?", "resposta": "A de www.example.com, porque o dicionário procura \"DOCS.example.org\" com maiúsculas. Nomes de host não diferenciam maiúsculas: use host = cabecalhos.get(\"host\", \"\").lower() or None."},
                {"nivel": "Desafio", "texto": "Faça o servidor responder 404 Not Found para qualquer caminho diferente de \"/\".", "resposta": "Logo depois de achar o host: if caminho != \"/\": return \"HTTP/1.1 404 Not Found\\r\\n\\r\\n\". O caminho já vem da linha de pedido."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quanto tempo cada versão gasta com 10 objetos e RTT de 50 ms?", "resposta": "HTTP/1.0: 1000 ms; HTTP/1.1: 550 ms; HTTP/2: 150 ms."},
                {"nivel": "Intermediário", "texto": "E com 5 objetos e TLS 1.2 (tls=2)?", "resposta": "HTTP/1.0: 5 × 4 RTT = 1000 ms; HTTP/1.1: 1 + 2 + 5 = 8 RTT = 400 ms; HTTP/2: 1 + 2 + 1 + 1 = 5 RTT = 250 ms."},
                {"nivel": "Desafio", "texto": "Sem TLS, a partir de quantos objetos o HTTP/1.1 persistente leva pelo menos o dobro do HTTP/2?", "resposta": "A partir de 5: 1 + n ≥ 2 × 3 quando n ≥ 5. Com 5 objetos, são 6 RTT contra 3."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Que versão escolhe(\"*\", DISP, \"en\") devolve, e por quê?", "resposta": "en: \"*\" aceita qualquer idioma, e en é o primeiro da lista do servidor."},
                {"nivel": "Intermediário", "texto": "Com \"fr-CA\", o programa devolve en. Como fazê-lo usar o francês genérico, como manda a regra de busca da RFC 4647?", "resposta": "Ao comparar, tente também a tag sem as subtags: if tag in (d, \"*\") or d.split(\"-\")[0] == tag or tag.split(\"-\")[0] == d. Assim, fr-CA acha fr."},
                {"nivel": "Desafio", "texto": "Com \"en;q=0\", o cliente recusa o inglês, mas o programa devolve en (o padrão). Corrija.", "resposta": "Guarde as tags com q=0 numa lista de recusadas e, se o padrão estiver nela, devolva outra versão aceitável ou responda 406 Not Acceptable. A RFC 9110 permite as duas saídas."}
            ]
        ],
        "capitulo36": [
            [
                {"nivel": "Aquecimento", "texto": "Acrescente ao fluxo um registro de dados cifrados: bytes.fromhex(\"17 0303 0045\") + bytes(69). O que o programa imprime para ele?", "resposta": "('application_data', '0x303', 69): 0x45 = 69 bytes de conteúdo, que o observador não consegue ler."},
                {"nivel": "Intermediário", "texto": "Acrescente bytes.fromhex(\"14 0303 0001 01\"). O que aparece?", "resposta": "('change_cipher_spec', '0x303', 1): o registro de um byte que, no TLS 1.2, avisa que dali em diante tudo vai cifrado."},
                {"nivel": "Desafio", "texto": "Corte o último byte do fluxo (fluxo[:-1]). O que o programa faz, e o que deveria fazer?", "resposta": "Ele ainda imprime o ServerHelloDone com tamanho 4, mas o conteúdo só tem 3 bytes. Como o TCP pode cortar um registro entre dois segmentos, o leitor precisa conferir if len(conteudo) < tam e esperar mais bytes antes de interpretar."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Tire curve25519-sha256 da lista de kex do servidor. Que troca de chaves é escolhida?", "resposta": "diffie-hellman-group14-sha256: o ecdh-sha2-nistp256 do cliente também não está no servidor, e o grupo 14 é o próximo que os dois têm."},
                {"nivel": "Intermediário", "texto": "Deixe o servidor só com aes256-gcm@openssh.com nas cifras. O que negocia() devolve, e o que acontece com a conexão?", "resposta": "None: não há cifra em comum. Pela RFC 4253, a conexão é encerrada, porque os dois lados não conseguem combinar como cifrar."},
                {"nivel": "Desafio", "texto": "Leia a identificação \"SSH-2.0-OpenSSH_9.6 Ubuntu-3\\r\\n\", que tem um comentário depois do espaço. Como separar a versão do programa do comentário?", "resposta": "Depois de tirar o \"SSH-2.0-\", separe no primeiro espaço: versao_sw, _, comentario = resto.partition(\" \"), o que dá \"OpenSSH_9.6\" e \"Ubuntu-3\" (RFC 4253, seção 4.2)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Refaça a conta de bytes com IPv6 e TCP (60 bytes de cabeçalho).", "resposta": "14 teclas viram 14 × 61 = 854 bytes, só 1,6% de dados."},
                {"nivel": "Intermediário", "texto": "Troque a senha da captura por \"redes2026\". O programa ainda a encontra?", "resposta": "Sim: ele junta todos os caracteres do cliente entre o \"Password:\" e o Enter, seja qual for a senha."},
                {"nivel": "Desafio", "texto": "Se o cliente telnet usasse o modo linha (manda a linha inteira com o Enter), quantos segmentos ele mandaria para o login e a senha? A senha ficaria protegida?", "resposta": "Dois segmentos (\"aluno\\r\" e \"segredo\\r\"), o que economiza cabeçalhos. Mas a senha continuaria em claro: o problema do telnet é a falta de cifra, não o tamanho dos segmentos."}
            ]
        ],
        "capitulo37": [
            [
                {"nivel": "Aquecimento", "texto": "Acrescente à saída a janela real (win × 128) dos segmentos depois da abertura. Que valores aparecem?", "resposta": "225 × 128 = 28 800 e 234 × 128 = 29 952 bytes no cliente; 224 × 128 = 28 672 no servidor. No SYN e no SYN+ACK, a janela ainda não é escalada."},
                {"nivel": "Intermediário", "texto": "Conte quantos segmentos cada lado mandou.", "resposta": "sum(s[\"de\"] == 34598 for s in segs) dá 6 para o cliente; os outros 4 são do servidor."},
                {"nivel": "Desafio", "texto": "Ache, pelo programa, o segmento que confirma o FIN do cliente.", "resposta": "O FIN do cliente tem seq 93; quem o confirma tem ack 94: next(i for i, s in enumerate(segs, 3) if s[\"ack\"] == 94) dá 11, o FIN do servidor, que leva o ack junto."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Qual é o número absoluto do primeiro byte do pedido HTTP?", "resposta": "2681184542: o ISN do cliente mais 1, porque o SYN gastou o número 2681184541."},
                {"nivel": "Intermediário", "texto": "Por que o último ack do servidor (absoluto 2681184635) é 93 + 2 maior que o ISN do cliente, e não 92 + 1?", "resposta": "Os números contam o SYN (1), os 92 bytes do pedido e o FIN (1): ISN + 1 + 92 + 1 = ISN + 94, o próximo número esperado."},
                {"nivel": "Desafio", "texto": "Some os bytes no fio, com 40 de IPv6 e o cabeçalho TCP de cada segmento (40 bytes nos SYNs, 32 nos outros).", "resposta": "160 + 576 + 549 = 1285 bytes no fio, para 549 de dados (42,7%)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quanto tempo vai do FIN do cliente ao último ACK?", "resposta": "t[-1] − t[7] = 19,006 ms."},
                {"nivel": "Intermediário", "texto": "Escreva um filtro que mostre só os segmentos do servidor.", "resposta": "filtro(lambda l: \" > 2001:6a8:308f:9:0:82ff:fe68:e51c\" in l) dá [4, 7, 8, 11]."},
                {"nivel": "Desafio", "texto": "Pelos valores de TS val do cliente (609493767 no SYN, 609493800 no último ACK), quantos milissegundos vale cada tique do relógio de timestamps?", "resposta": "33 tiques em 32,912 ms: cerca de 1 ms por tique, um relógio de 1000 Hz, comum no Linux."}
            ]
        ],
        "capitulo38": [
            [
                {"nivel": "Aquecimento", "texto": "Chame conexao(0, 0, [10]). Quais são os três últimos segmentos?", "resposta": "FIN do cliente com seq 11 e ack 1; FIN do servidor com seq 1 e ack 12; ACK final do cliente com seq 12 e ack 2."},
                {"nivel": "Intermediário", "texto": "Com conexao(1000, 5000, [1460] * 3), que seq leva o FIN do cliente?", "resposta": "5381: 1001 + 3 × 1460. O servidor o confirma com ack 5382."},
                {"nivel": "Desafio", "texto": "Faça o servidor mandar o ACK e o FIN separados, como numa liberação em quatro segmentos.", "resposta": "Antes do FIN do servidor, acrescente (\"S\", \".\", s, c + 1, 0): o ACK do FIN do cliente. O FIN do servidor continua com seq s e ack c + 1."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Acrescente \"wscale\": 8 ao servidor. O que muda?", "resposta": "A escala liga: (7, 8). O cliente multiplica a janela que anuncia por 2⁷ e o servidor, por 2⁸."},
                {"nivel": "Intermediário", "texto": "Tire o \"ts\" do cliente e ponha \"ts\": True no servidor. Os timestamps ficam ligados?", "resposta": "Não: como SACK e escala, os timestamps só valem se os dois lados mandarem a opção no SYN."},
                {"nivel": "Desafio", "texto": "Com a escala ligada em 7, qual é a maior janela que o cliente pode anunciar?", "resposta": "65 535 × 2⁷ = 8 388 480 bytes."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Troque a semente do embaralhamento (7) por outra. O resultado continua igual à captura?", "resposta": "Sim: a ordem sai só dos números de sequência e de confirmação, não da ordem em que os segmentos chegam à função."},
                {"nivel": "Intermediário", "texto": "Tire da lista o ACK do servidor ao pedido (SEGS[4]). O que acontece?", "resposta": "A função ainda ordena os 9 que sobram: nenhum outro segmento depende daquele ACK puro, porque a resposta do servidor também confirma o pedido."},
                {"nivel": "Desafio", "texto": "Tire o pedido do cliente (SEGS[3]). O que acontece, e por quê?", "resposta": "ValueError: chega um ponto em que nenhum segmento pode vir a seguir, porque o ack 2681184634 do servidor confirma 92 bytes que o cliente nunca mandou. Uma captura incompleta (um pacote perdido pela ferramenta) aparece assim."}
            ]
        ],
        "capitulo39": [
            [
                {"nivel": "Aquecimento", "texto": "Que números de sequência o FIN do kernel ocupa, e por que o packetdrill responde com ack 12?", "resposta": "Só o 11: o FIN não tem dados, mas consome um número. O próximo esperado é o 12."},
                {"nivel": "Intermediário", "texto": "Acrescente a linha \"+.2 read(4,...,1000)=2\" no lugar certo (depois do ack 3). O que acontece, e como corrigir?", "resposta": "O match falha (AttributeError), porque a linha não é de segmento. Pule as linhas sem < nem >, mas some o tempo delas: m = re.match(r\"^\\+?([\\d.]+)\", linha); t += float(m.group(1)) antes de testar o PADRAO. O FIN passa a sair em 0,5 s."},
                {"nivel": "Desafio", "texto": "Confira automaticamente que cada ack é o próximo número esperado do outro lado.", "resposta": "Guarde prox = {\"<\": 0, \">\": 0} com o próximo número de cada sentido (seq inicial + consome) e, para cada linha com ack, compare ack com prox do sentido oposto. No connect.pkt, todos batem."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Troque o último ACK do primeiro script (16001) por dois: 11001 e 16001. A janela final muda?", "resposta": "Não: 9 + 4 = 13 e 13 + 5 = 18. A soma dos segmentos confirmados é a mesma."},
                {"nivel": "Intermediário", "texto": "Comece a lista atrasado com cwnd=10 (janela inicial maior). Que valores saem?", "resposta": "10, 12, 14, 16, 18 e 26: cada ACK continua valendo dois segmentos."},
                {"nivel": "Desafio", "texto": "Limite o aumento a 2 segmentos por ACK, como recomenda a RFC 3465 (L = 2). O resultado ainda bate com o livro?", "resposta": "Não: o último ACK somaria só 2, e a janela ficaria em 11 e 12, não 18. O Linux usado no livro não aplica esse limite naquele ACK."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quanto dá formula(31000)?", "resposta": "470 ms: cinco rodadas (1, 2, 4, 8 e 16 segmentos), 4 × 101 + 16 + 50."},
                {"nivel": "Intermediário", "texto": "Mude RTT para 200. Quanto tempo para 3000 bytes?", "resposta": "1 × 201 + 2 + 100 = 303 ms."},
                {"nivel": "Desafio", "texto": "Generalize formula para uma janela inicial de w segmentos e calcule 31 segmentos com w = 10.", "resposta": "As rodadas mandam w, 2w, 4w...: r = ⌈log₂(n/w + 1)⌉ e ultima = n − w(2^(r−1) − 1). Com w = 10 e n = 31: r = 3, última rodada com 1 segmento, T = 2 × 101 + 1 + 50 = 253 ms."}
            ]
        ],
        "capitulo40": [
            [
                {"nivel": "Aquecimento", "texto": "Qual é o próximo salto para 2001:db8:1341:24::4?", "resposta": "2001:db8:1341:12::2, pela rota 2001:db8:1341:24::/64."},
                {"nivel": "Intermediário", "texto": "Acrescente à tabela (\"2001:db8:1341:4::b/128\", \"2001:db8:1341:13::3\"). Para onde vai 4::b agora?", "resposta": "Para 13::3: a rota de host /128 é mais longa que o /64 e vence. Os outros endereços de 4::/64 continuam indo para 12::2."},
                {"nivel": "Desafio", "texto": "Por que 2001:db8:1341:99::1 vai para 12::2?", "resposta": "Nenhuma rota específica casa com ele; só a rota padrão ::/0, que casa com qualquer endereço com o menor prefixo possível (0)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Troque a rota de R1 para (\"4::/64\", \"12::2\"). O que acontece com A → B?", "resposta": "Laço entre R1 e R2: R2 devolve tudo a R1 pela rota padrão."},
                {"nivel": "Intermediário", "texto": "Apague a rota de R4 (\"R4\": []). O que acontece com B → A?", "resposta": "'sem rota em R4': R4 só conhece as redes ligadas a ele e não tem rota padrão."},
                {"nivel": "Desafio", "texto": "Rastreie caminho(\"A\", \"34::4\") e caminho(\"B\", \"12::2\"). O que falta para os dois funcionarem?", "resposta": "Os dois param por falta de rota (em R1 e em R4): as rotas da Q3 só cobrem as redes de A e de B. Para alcançar as redes entre roteadores, R1 precisaria, por exemplo, de 34::/64 via 13::3 e R4 de 12::/64 via 24::2."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quantos /60 cabem no /56, e quantos /64 em cada /60?", "resposta": "16 e 16: um /56 tem 2⁸ = 256 sub-redes /64, em 16 blocos de 16."},
                {"nivel": "Intermediário", "texto": "De quantas rotas R2 precisa para alcançar os dois lados?", "resposta": "Duas: 2001:db8:1341:100::/60 para a esquerda e 2001:db8:1341:110::/60 para a direita (as três redes do centro ele conhece diretamente)."},
                {"nivel": "Desafio", "texto": "Se uma rede nova for ligada a R1, de onde tirar o /64 para não quebrar a agregação?", "resposta": "Do bloco da esquerda: o próximo livre é 2001:db8:1341:103::/64. Ele continua dentro de 2001:db8:1341:100::/60, e nenhuma tabela fora da esquerda precisa mudar."}
            ]
        ],
        "capitulo41": [
            [
                {"nivel": "Aquecimento", "texto": "Por que o caminho de AS4 até AS1 é AS4-AS3-AS1, e não AS4-AS2-AS1, se os dois têm o mesmo tamanho?", "resposta": "Porque AS3 é par de AS4 e AS2 é provedor: a rota do par vem antes (PREF 2 contra 1), e o tamanho só desempata dentro da mesma relação."},
                {"nivel": "Intermediário", "texto": "Troque a topologia pela da Q2: CP = [(\"AS3\",\"AS1\"),(\"AS3\",\"AS4\"),(\"AS1\",\"AS4\")] e PARES = [(\"AS1\",\"AS2\"),(\"AS2\",\"AS3\")]. Quem não alcança quem?", "resposta": "AS2 e AS4: a linha de AS2 não tem AS4, e a de AS4 não tem AS2. Os outros pares se alcançam."},
                {"nivel": "Desafio", "texto": "Use a topologia da Q3 com o conserto: CP = [(\"AS4\",\"AS2\"),(\"AS4\",\"AS1\"),(\"AS5\",\"AS1\")] e PARES = [(\"AS4\",\"AS5\"),(\"AS5\",\"AS3\"),(\"AS3\",\"AS2\"),(\"AS3\",\"AS1\"),(\"AS2\",\"AS1\")]. Qual é o caminho de AS5 até AS2?", "resposta": "AS5-AS1-AS2. AS1 repassa ao cliente AS5 a rota do par AS2; os pares AS4 e AS3 não repassam a AS5 as rotas que aprenderam de AS2 (de provedor e de par)."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Acrescente um terceiro caminho: SAIDAS = [\"via B\", \"via E\", \"via X\"]. Cada conexão continua num só caminho? Como ficam as 1000 conexões?", "resposta": "Sim, os três pacotes de cada conexão saem sempre pela mesma interface. As 1000 conexões se dividem em 314, 330 e 356: quase um terço para cada caminho."},
                {"nivel": "Intermediário", "texto": "Tire as portas e o protocolo da tupla (use só origem e destino). Como ficam as 1000 conexões?", "resposta": "Todas vão pelo mesmo caminho ({'via B': 1000, 'via E': 0}): elas têm a mesma origem e o mesmo destino, então o hash é sempre igual e o outro caminho fica ocioso."},
                {"nivel": "Desafio", "texto": "Calcule saida(\"2001:db8:d::1\", \"2001:db8:c::1\", 17, 50000, p) para p = 33434, 33435 e 33436, as portas de três sondas do traceroute6. O que você vê?", "resposta": "['via E', 'via E', 'via B']: só a porta de destino muda, mas isso basta para mudar o hash e o caminho da terceira sonda. É o que explica os vários endereços nos saltos 8 a 10 da Q7."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Por que 40 bytes não bastam?", "resposta": "Os 40 bytes do cabeçalho IPv6 trazem os endereços, mas as portas são os 4 primeiros bytes do cabeçalho UDP, nos bytes 40 a 43 do pacote."},
                {"nivel": "Intermediário", "texto": "Monte um segmento TCP: next header 6 no cabeçalho IPv6 e udp = struct.pack(\"!HHII\", 50000, 443, 0, 0). O que le() mostra com 44 bytes?", "resposta": "next header 6: 2001:db8:1::a porta 50000 -> 2001:db8:2::b porta 443. No TCP, as portas também são os 4 primeiros bytes do cabeçalho, e 44 bytes continuam bastando."},
                {"nivel": "Desafio", "texto": "Ponha um cabeçalho de extensão de 8 bytes entre o IPv6 e o UDP: next header 60 no IPv6 (payload length 28) e ext = bytes([17, 0, 1, 4, 0, 0, 0, 0]). O que le(pacote[:44]) mostra, e quantos bytes passam a ser necessários?", "resposta": "Portas erradas (4352 e 260): le() lê os bytes da extensão como se fossem o UDP. São necessários 40 + 8 + 4 = 52 bytes. Por isso a RFC 4443 manda devolver o máximo possível, até 1280 bytes no total."}
            ]
        ],
        "capitulo42": [
            [
                {"nivel": "Aquecimento", "texto": "Com os custos do script, por que o caminho de r1 a r3 custa 4, e não 5?", "resposta": "Porque r1 → r2 → r3 custa 1 + 3 = 4, menos que os 5 do enlace direto. Dijkstra acha esse caminho."},
                {"nivel": "Intermediário", "texto": "Mude o custo de r2–r3 para 5 nos custos do script. Que caminho sai?", "resposta": "['r1', 'r3'] com custo 5: pelo caminho por r2, seriam 1 + 5 = 6."},
                {"nivel": "Desafio", "texto": "Mantendo r1–r2 = 1 e r2–r3 = 3, qual é o maior custo inteiro de r1–r3 com que o caminho direto ainda vence sem empate?", "resposta": "3. Com 3, o direto custa 3, contra 4 por r2 (o bloco mostra ['r1', 'r3'] custo 3); com 4, empata."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Por que a rota para 2001:cafe:3::/48 aprendida de as2 perde, mesmo sendo uma rota válida?", "resposta": "Porque vem de um provedor (local-pref 100), e a de as3 vem de um par (150). A local-pref é comparada antes do AS-path."},
                {"nivel": "Intermediário", "texto": "Troque a relação de as3 para \"provedor\" nas duas listas. Que rotas vencem?", "resposta": "Com as duas a 100, decide o AS-path mais curto: 2001:cafe:2::/48 via as2 (2) e 2001:cafe:3::/48 via as3 (3)."},
                {"nivel": "Desafio", "texto": "Monte as rotas de as3 para 2001:cafe:1::/48: (\"as2\", \"cliente\", [2, 1]) e (\"as1\", \"par\", [1]). Qual vence? Bate com o traceroute6 do livro?", "resposta": "('as2', 'cliente', [2, 1]): a rota do cliente (200) vence a do par (150), mesmo mais longa. Bate: o traceroute6 de h3 até h1 passa por as2."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quantos bytes ocupa o NLRI de 2001:cafe:2::/48, e por quê?", "resposta": "7: 1 byte com o tamanho do prefixo (48) e 6 bytes com os 48 bits do prefixo. O BGP só manda os bytes necessários."},
                {"nivel": "Intermediário", "texto": "Anuncie 2001:cafe:2:1::/64 no lugar do /48. Que tamanhos saem?", "resposta": "MP_REACH_NLRI com 46 bytes, atributos com 71 e mensagem com 94: o prefixo passa a ocupar 8 bytes, 2 a mais."},
                {"nivel": "Desafio", "texto": "Ponha dois AS no AS_PATH, como AS3 faria ao repassar a rota: struct.pack(\"!BBH\", 0x50, 2, 10) + struct.pack(\"!BBII\", 2, 2, 3, 2). Qual é o tamanho da mensagem?", "resposta": "96 bytes: cada AS a mais ocupa 4 bytes no segmento AS_SEQUENCE, e o tamanho do atributo passa de 6 para 10."}
            ]
        ],
        "capitulo43": [
            [
                {"nivel": "Aquecimento", "texto": "Por que a s9-eth2 fica bloqueada, se s9 e s7 estão os dois a custo 1 da raiz?", "resposta": "No enlace s9–s7 há empate de custo, e o designado é o switch de menor ID, s7. A porta de s9 nesse enlace não é a raiz dele (a raiz é a eth1) e fica bloqueada."},
                {"nivel": "Intermediário", "texto": "Dê prioridade 2 a s9 (PRIO = {…, 9: 2}). Quem vira a raiz, e que portas ficam bloqueadas?", "resposta": "s9 vira a raiz. Ficam bloqueadas a s7-eth1 (s7 empata entre s3 e s9 e escolhe s9, de menor ID) e a s4-eth2 (s4 empata entre s6 e s7 e escolhe s6)."},
                {"nivel": "Desafio", "texto": "Tire o enlace s3–s9 da lista ENLACES. Que porta fica bloqueada agora?", "resposta": "A s6-eth1: s9 passa a chegar à raiz por s7 (custo 2), s6 por s4 (custo 3), e no enlace s6–s9 o designado é s9, mais perto da raiz."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "De onde vêm os 35 bytes do BPDU?", "resposta": "2 de protocolo, 1 de versão, 1 de tipo, 1 de flags, 8 do ID da raiz, 4 do custo, 8 do ID do switch, 2 da porta e 4 campos de tempo com 2 bytes cada: 35."},
                {"nivel": "Intermediário", "texto": "Monte o BPDU que s9 manda pela s9-eth3: custo 1, bridge_id(0, 9, bytes.fromhex(\"7ecc45e18e5b\")) no lugar do segundo ID e porta 0x8003. Quantos bytes ele tem, e que custo o bloco lê?", "resposta": "Continua com 35 bytes, e o custo lido é 1. A raiz anunciada continua sendo s3 (0/3/f6:35:45:ab:5f:79)."},
                {"nivel": "Desafio", "texto": "Que valor de 16 bits sai de bridge_id(8, 0, …), e o que ele significa?", "resposta": "0x8000 = 32768: prioridade 8 × 4096, a prioridade padrão dos switches, com extensão 0."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Por que os quatro primeiros trechos mostram o mesmo quadro H0→R0?", "resposta": "Porque S1, S2 e S4 são switches: repassam o quadro sem mudar os MACs nem o hop limit. O quadro só é refeito em R0."},
                {"nivel": "Intermediário", "texto": "Troque o caminho por R2: (\"R0-R2\", \"R0\", \"R2\"), (\"R2-R3\", \"R2\", \"R3\") e R2 em ROTEADORES. O que muda na saída?", "resposta": "Só o nome do segundo roteador: a sonda com hop limit 2 expira em R2, e continuam sendo 4 saltos até H1."},
                {"nivel": "Desafio", "texto": "Se R0 fosse ligado direto a R3 (um trecho (\"R0-R3\", \"R0\", \"R3\") no lugar dos dois do meio, sem R1), com que hop limit a sonda chegaria a H1?", "resposta": "Com hop limit 3: a sonda 3 já recebe o Destination Unreachable de H1, e o traceroute mostra 3 linhas (R0, R3, H1)."}
            ]
        ]
    };

    function carregarScript(src) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function carregarCodeMirror() {
        if (window.CodeMirror) return Promise.resolve();
        if (!codemirrorPromise) {
            var css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.css";
            document.head.appendChild(css);
            codemirrorPromise = carregarScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.js")
                .then(function () { return carregarScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/mode/python/python.min.js"); });
        }
        return codemirrorPromise;
    }

    function carregarPyodide() {
        if (!pyodidePromise) {
            pyodidePromise = carregarScript("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js")
                .then(function () { return window.loadPyodide(); });
        }
        return pyodidePromise;
    }

    function criarEditor(pre, indice, grupo) {
        var codigo = pre.querySelector("code");
        if (!codigo) return;

        var painel = document.createElement("div");
        painel.className = "python-playground my-3";

        var textarea = document.createElement("textarea");
        textarea.className = "python-editor";
        textarea.value = codigo.textContent;
        textarea.setAttribute("aria-label", "Editor de código Python, exemplo " + (indice + 1));
        painel.appendChild(textarea);

        var entradaLinha = document.createElement("div");
        entradaLinha.className = "mt-2";
        var entradaLabel = document.createElement("label");
        entradaLabel.className = "form-label small mb-1";
        entradaLabel.textContent = "Entrada para input() (opcional; um valor por linha)";
        var entrada = document.createElement("textarea");
        entrada.rows = 2;
        entrada.className = "form-control form-control-sm";
        entrada.placeholder = "Um valor por linha, se input() for chamado mais de uma vez";
        entrada.setAttribute("aria-label", "Valores fornecidos às chamadas input(), um por linha");
        entradaLinha.appendChild(entradaLabel);
        entradaLinha.appendChild(entrada);
        painel.appendChild(entradaLinha);

        var controles = document.createElement("div");
        controles.className = "d-flex flex-wrap align-items-center gap-2 mt-2";

        var executar = document.createElement("button");
        executar.type = "button";
        executar.className = "btn btn-success btn-sm";
        executar.textContent = "Executar Python";
        executar.setAttribute("aria-label", "Executar este exemplo Python");
        controles.appendChild(executar);

        var semente = null;
        if (/alternating_bit_protocol/.test(textarea.value)) {
            var label = document.createElement("label");
            label.className = "small";
            label.textContent = "Semente aleatória:";
            semente = document.createElement("input");
            semente.type = "number";
            semente.className = "form-control form-control-sm";
            semente.value = "42";
            semente.setAttribute("aria-label", "Semente aleatória para reproduzir a simulação ABP");
            semente.style.maxWidth = "130px";
            controles.appendChild(label);
            controles.appendChild(semente);
        }

        painel.appendChild(controles);

        var desafiosDoBloco = (desafios[grupo] || [])[indice];
        if (desafiosDoBloco && desafiosDoBloco.length) {
            var caixa = document.createElement("div");
            caixa.className = "small mt-3";
            var tituloDesafios = document.createElement("p");
            tituloDesafios.className = "fw-semibold mb-1";
            tituloDesafios.textContent = "Desafios para este código";
            caixa.appendChild(tituloDesafios);
            var lista = document.createElement("ol");
            lista.className = "mb-1";
            desafiosDoBloco.forEach(function (item) {
                var li = document.createElement("li");
                var nivel = document.createElement("strong");
                nivel.textContent = item.nivel + ": ";
                li.appendChild(nivel);
                li.appendChild(document.createTextNode(item.texto));
                var detalhes = document.createElement("details");
                var resumo = document.createElement("summary");
                resumo.textContent = "Conferir resposta";
                var resposta = document.createElement("p");
                resposta.className = "mb-1 mt-1";
                resposta.textContent = item.resposta;
                detalhes.appendChild(resumo);
                detalhes.appendChild(resposta);
                li.appendChild(detalhes);
                lista.appendChild(li);
            });
            caixa.appendChild(lista);
            painel.appendChild(caixa);
        }

        var saida = document.createElement("pre");
        saida.className = "python-output mt-2 mb-0";
        saida.setAttribute("aria-live", "polite");
        saida.textContent = "Edite o código e clique em Executar Python. O runtime será carregado apenas no primeiro clique.";
        painel.appendChild(saida);

        pre.hidden = true;
        pre.insertAdjacentElement("afterend", painel);

        carregarCodeMirror().then(function () {
            if (!window.CodeMirror || textarea.dataset.enhanced) return;
            textarea.dataset.enhanced = "true";
            var editor = window.CodeMirror.fromTextArea(textarea, {
                mode: "python",
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4,
                viewportMargin: Infinity
            });
            painel._editor = editor;
        }).catch(function () {
            // O textarea continua disponível quando a CDN/editor não estiver acessível.
        });

        executar.addEventListener("click", async function () {
            executar.disabled = true;
            executar.textContent = "Carregando/Executando…";
            saida.textContent = "";
            try {
                var pyodide = await carregarPyodide();
                var fonte = painel._editor ? painel._editor.getValue() : textarea.value;
                var seed = semente ? String(Number(semente.value) || 0) : "0";
                var usaMatplotlib = /matplotlib/.test(fonte);
                if (usaMatplotlib) await pyodide.loadPackage("matplotlib");
                var proximoInput = 0;
                var valoresInput = entrada.value.split(/\r?\n/);
                pyodide.globals.set("js_input", function (promptText) {
                    var resposta = valoresInput[proximoInput] || "";
                    proximoInput++;
                    return resposta;
                });
                pyodide.globals.set("seed_value", Number(seed));
                pyodide.globals.set("_playground_fonte", fonte);
                var wrapper = [
                    "import sys, io, builtins, random, json, base64",
                    "_playground_output = io.StringIO()",
                    "_playground_figures = []",
                    "_playground_old_stdout = sys.stdout",
                    "_playground_old_input = builtins.input",
                    "sys.stdout = _playground_output",
                    "builtins.input = lambda prompt='': (sys.stdout.write(str(prompt)), js_input(str(prompt)))[1]",
                    "random.seed(seed_value)",
                    "try:",
                    // O código roda intacto (sem recuo), para que strings de várias linhas não ganhem espaços.
                    "    exec(compile(_playground_fonte, '<código>', 'exec'), globals())",
                    "finally:",
                    "    sys.stdout = _playground_old_stdout",
                    "    builtins.input = _playground_old_input",
                    "try:",
                    "    import matplotlib.pyplot as _playground_plt",
                    "    for _playground_num in _playground_plt.get_fignums():",
                    "        _playground_buffer = io.BytesIO()",
                    "        _playground_plt.figure(_playground_num).savefig(_playground_buffer, format='png', bbox_inches='tight')",
                    "        _playground_figures.append(base64.b64encode(_playground_buffer.getvalue()).decode('ascii'))",
                    "        _playground_plt.close(_playground_num)",
                    "except ImportError:",
                    "    pass",
                    "json.dumps({'output': _playground_output.getvalue(), 'figures': _playground_figures})"
                ].join("\n");
                var resultado = await pyodide.runPythonAsync(wrapper);
                var payload = JSON.parse(resultado);
                var textoResultado = payload.output || "Execução concluída (sem saída de print).";
                if (!proximoInput) saida.textContent = textoResultado;
                else if (textoResultado) saida.textContent += "\n" + textoResultado;
                (payload.figures || []).forEach(function (imagemBase64) {
                    var imagem = document.createElement("img");
                    imagem.src = "data:image/png;base64," + imagemBase64;
                    imagem.alt = "Gráfico produzido pelo código Python executado";
                    imagem.className = "img-fluid mt-2 d-block";
                    saida.appendChild(imagem);
                });
            } catch (erro) {
                saida.textContent = "Erro na execução: " + (erro && erro.message ? erro.message : String(erro));
            } finally {
                executar.disabled = false;
                executar.textContent = "Executar Python";
            }
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        var numero = /capitulo-0*(\d+)/.exec(window.location.pathname);
        var grupo = "capitulo" + (numero ? Number(numero[1]) : 1);
        document.querySelectorAll("pre.code-block").forEach(function (pre, indice) {
            criarEditor(pre, indice, grupo);
        });
    });
}());