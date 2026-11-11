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
                {"nivel": "Intermediário", "texto": "Quantos rótulos tem o nome reverso do exemplo do livro? Use len(ip.reverse_pointer.split(\".\")).", "resposta": "34: os 32 nibbles do endereço (128 / 4) mais ip6 e arpa."},
                {"nivel": "Desafio", "texto": "Escreva uma função que diga quantos grupos de 16 bits o \"::\" esconde num endereço compacto. Quanto dá para \"ff01::101\"?", "resposta": "6. Conte os grupos escritos (ff01 e 101, dois) e subtraia de 8. Uma solução: 8 - len([g for g in texto.split(\":\") if g])."}
            ],
            [
                {"nivel": "Aquecimento", "texto": "Quantos bytes tem a variável consulta? Confira com len(consulta).", "resposta": "12, o tamanho fixo do cabeçalho DNS: seis inteiros de 16 bits."},
                {"nivel": "Intermediário", "texto": "Leia o cabeçalho bytes.fromhex(\"ab cd 81 83 00 01 00 00 00 01 00 00\") com le_cabecalho. O que aconteceu?", "resposta": "É uma resposta (QR = 1) com RD e RA ligados e RCODE = 3: o nome não existe. Não há registro na seção Answer, e há 1 na seção Authority."},
                {"nivel": "Desafio", "texto": "Monte a resposta à consulta 55279 com RD, RA e TC ligados e uma pergunta. Qual é o valor das flags em hexadecimal, e o que o cliente deve fazer?", "resposta": "0x8380 (QR = 0x8000, TC = 0x200, RD = 0x100, RA = 0x80). TC indica resposta truncada: o cliente repete a consulta sobre TCP."}
            ],
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
        "capitulo10": [
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
                {"nivel": "Aquecimento", "texto": "No exemplo do livro, quantos milissegundos o pipelining economiza em relação ao modo sequencial?", "resposta": "800 ms: 1000 ms contra 200 ms."},
                {"nivel": "Intermediário", "texto": "Refaça o exemplo com banda de 1 Mbit/s (1e6). Quanto dá o pipelining, e por quê?", "resposta": "204 ms: agora a transmissão conta. 5 × 100 bytes × 8 / 10^6 = 4 ms somados ao RTT de 200 ms."},
                {"nivel": "Desafio", "texto": "Para a página média do livro, 70 objetos, com RTT de 50 ms e tam = 0, quanto levam HTTP/1.0 e o modo sequencial?", "resposta": "HTTP/1.0: 70 × 2 × 50 ms = 7 s. Sequencial: 70 × 50 ms = 3,5 s (mais 50 ms para abrir a conexão, que a função não conta). Com pipelining, cerca de 50 ms."}
            ],
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
        "capitulo11": [
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
            ],
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
        "capitulo12": [
            [
                {"nivel": "Aquecimento", "texto": "Calcule o checksum para as cargas b\"ABCD\" e b\"CDAB\". O que você nota?", "resposta": "Os dois dão 0x04db. A soma não depende da ordem das palavras de 16 bits: trocar \"AB\" e \"CD\" de lugar não é detectado."},
                {"nivel": "Intermediário", "texto": "Chame confere com a origem \"2001:db8::9\", a carga b\"OLA\" e o checksum calculado para \"2001:db8::1\". O que acontece, e por quê?", "resposta": "Devolve False: o endereço de origem entra no pseudo-cabeçalho, então um segmento com outro endereço não passa na conferência."},
                {"nivel": "Desafio", "texto": "Ache uma carga de 3 bytes, diferente de b\"OLA\", que passe em confere com o checksum de b\"OLA\".", "resposta": "Por exemplo b\"PL@\": o primeiro byte sobe 1 (O → P) e o terceiro desce 1 (A → @). Os dois estão na metade alta das palavras de 16 bits (\"OL\" e \"A\" + zero), então os erros se compensam na soma."}
            ],
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