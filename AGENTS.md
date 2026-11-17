# AGENTS.md

Guia para agentes que trabalham neste repositório. O modelo pedagógico completo está no [SPEC.md](SPEC.md); este arquivo diz o que fazer e o que não fazer.

## O projeto

O repositório transforma o livro *Computer Networking: Principles, Protocols and Practice* (Bonaventure, Release 2021, arquivo `livro.pdf` na raiz) em páginas web interativas, um capítulo por vez. Cada capítulo do site corresponde a **uma** seção de nível 2 do livro, sem agrupar seções: o capítulo N é a seção 2.N na Parte 1 (*Principles*, caps. 1–8), o capítulo 8 + k é a seção 3.k na Parte 2 (*Protocols*, caps. 9–26) e o capítulo 26 + k é a seção 4.k na Parte 3 (*Practice*, caps. 27–43). Os capítulos da Parte 3 usam o formato de atividades da seção 1.1 do SPEC.md. O livro tem 43 seções desse nível, sem contar o prefácio e os apêndices. A tabela abaixo é a referência.

| Capítulo | Seções do livro (pág. do PDF) | Situação |
|---|---|---|
| 1 — Conectando dois hosts | 2.1 Connecting two hosts | aprovado pelo professor |
| 2 — Construindo uma rede | 2.2 Building a network | aprovado pelo professor |
| 3 — Aplicações | 2.3 Applications | pronto |
| 4 — A camada de transporte | 2.4 The transport layer | pronto |
| 5 — Nomes e endereços | 2.5 Naming and addressing | pronto |
| 6 — Compartilhamento de recursos | 2.6 Sharing resources | pronto |
| 7 — Modelos de referência | 2.7 The reference models | pronto |
| 8 — Segurança de redes | 2.8 Network security | pronto |
| 9 — A camada de aplicação | 3.1 The application layer (133–134) | pronto |
| 10 — O Domain Name System | 3.2 The Domain Name System (134–138) | pronto |
| 11 — Correio eletrônico | 3.3 Electronic mail (138–148) | pronto |
| 12 — O protocolo HTTP | 3.4 The HyperText Transfer Protocol (148–158) | pronto |
| 13 — Deixando o HTTP mais rápido | 3.5 Making HTTP faster (158–165) | pronto |
| 14 — Chamadas de procedimento remoto | 3.6 Remote Procedure Calls (165–169) | pronto |
| 15 — Login remoto: telnet e ssh | 3.7 Remote login (169–172) | pronto |
| 16 — Transport Layer Security (TLS) | 3.8 Transport Layer Security (172–181) | pronto |
| 17 — Protegendo o DNS: DNSSEC | 3.9 Securing the Domain Name System (181–185) | pronto |
| 18 — Os protocolos de transporte da Internet | 3.10 Internet transport protocols (185) | pronto |
| 19 — UDP: o User Datagram Protocol | 3.11 The User Datagram Protocol (185–187) | pronto |
| 20 — TCP: o Transmission Control Protocol | 3.12 The Transmission Control Protocol (187–205) | pronto |
| 21 — Controle de congestionamento no TCP | 3.13 Congestion control (205–213) | pronto |
| 22 — A camada de rede: IPv6 e ICMPv6 | 3.14 The network layer (213–236) | pronto |
| 23 — Roteamento em redes IP | 3.15 Routing in IP networks (236–237) | pronto |
| 24 — Roteamento intradomínio: RIP e OSPF | 3.16 Intradomain routing (237–243) | pronto |
| 25 — Roteamento interdomínio: BGP | 3.17 Interdomain routing (243–257) | pronto |
| 26 — Tecnologias de enlace: PPP, Ethernet e Wi-Fi | 3.18 Datalink layer technologies (257–276) | pronto |
| 27 — Prática: os exercícios | 4.1 Exercises (277) | pronto |
| 28 — Prática: transferência confiável | 4.2 Reliable transfer (277–279) | pronto |
| 29 — Prática: sockets | 4.3 Using sockets for inter-process communication (279–286) | pronto |
| 30 — Prática: construindo uma rede | 4.4 Building a network (286–292) | pronto |
| 31 — Prática: servindo aplicações | 4.5 Serving applications (292–294) | pronto |
| 32 — Prática: compartilhamento de recursos | 4.6 Sharing resources (294–312) | pronto |
| 33 — Prática: a camada de aplicação | 4.7 Application layer (312–313) | pronto |
| 34 — Prática: os protocolos de e-mail | 4.8 Internet email protocols (313–314) | pronto |
| 35 — Prática: HTTP | 4.9 The HyperText Transfer Protocol (314–315) | pronto |
| 36 — Prática: TLS e ssh | 4.10 TLS and ssh (315) | pronto |
| 37 — Prática: análise de capturas de pacotes | 4.11 Analyzing packet traces (316–319) | pronto |
| 38 — Prática: o básico do TCP | 4.12 TCP basics (319) | pronto |
| 39 — Prática: o TCP de perto | 4.13 A closer look at TCP (319–336) | pronto |
| 40 — Prática: redes IPv6 | 4.14 IPv6 Networks (336–350) | pronto |
| 41 — Prática: roteamento interdomínio | 4.15 Inter-domain routing (350–353) | pronto |
| 42 — Prática: explorando os protocolos de roteamento | 4.16 Exploring routing protocols (353–384) | pronto |
| 43 — Prática: Spanning Tree e VLANs | 4.17 Local Area Networks: The Spanning Tree Protocol and Virtual LANs (384–392) | pronto |
| Apêndice — Glossário | 5.1 Glossary (393–398) | pronto |

### Estrutura

- `index.html`: página inicial, com um card por capítulo, o card do glossário e o crédito da licença (CC BY 3.0).
- `capitulos/capitulo-NN/index.html`: uma página por capítulo.
- `capitulos/glossario/index.html`: o glossário (seção 5.1), sem pontuação, com busca e filtro por letra (`assets/glossario.js`).
- `assets/`:
  - `capitulo.css`: estilos comuns dos capítulos.
  - `livro.css`: tema escuro e ajustes compartilhados.
  - `playground.css`: editor de código.
  - `livro.js`: botão de tema, perguntas rápidas (`.mini-quiz`) e rótulos de acessibilidade.
  - `registro.js`: registro central de simulações (`Redes.registrar`), utilitários (`Redes.util`) e diagrama de sequência temporal.
  - `gamificacao.js`: pontos, níveis, medalhas e painel de progresso (`Redes.desafio`).
  - `playground.js`: transforma `pre.code-block` em editor Python executável (Pyodide + CodeMirror) e guarda os desafios de cada bloco.
  - `sims-capNN.js`: simulações de cada capítulo (caps. 3 em diante).
  - `desafios-cap1.js` e `desafios-cap2.js`: desafios pontuáveis ligados às simulações aprovadas dos caps. 1 e 2.
  - `simulacoes.js`: simulações antigas do cap. 2.

## Regras

1. **O conteúdo vem do `livro.pdf`.** Antes de escrever, extraia o texto da seção (`pdftotext -layout livro.pdf saida.txt`) e trabalhe a partir dele. Ao citar o livro, indique a página do PDF. O que não estiver no livro precisa ser correto e aparecer como complemento.
2. **Fontes externas só abertas.** Só cite o que abre direto com um clique, sem cadastro, login ou pagamento: RFCs, IENs, Wikipedia, páginas públicas. Na dúvida, cite a página do livro.
3. **Não altere o texto aprovado dos capítulos 1 e 2 sem o ok do usuário.** Mudanças de infraestrutura (CSS, scripts, atributos) são permitidas. Ao mexer nesses capítulos, compare o texto visível antes e depois.
4. **Erros do livro:** mantenha a informação correta na página e explique a divergência numa `<p class="nota-livro">`. Exemplo: o livro dá `1000011` como código ASCII de "A", que é o código de "C".
5. **Português do Brasil, arquivos em UTF-8.** Já houve texto corrompido ("Ilustra??o"). Confira acentos depois de editar.
6. **Dentro de `<pre class="code-block">`, escreva `<` como `&lt;`.** Senão o navegador o interpreta como uma tag.
7. **Siga o SPEC.md:** conceitos em etapas, simulações via `data-sim` + `Redes.registrar`, gamificação, tema escuro, acessibilidade.
8. **Commits só quando o usuário pedir.**

## Como criar um capítulo novo

1. Extraia as seções do capítulo (tabela acima) do `livro.pdf` e liste os conceitos, as figuras (Fig. N) e as páginas do PDF. Para ver uma figura que o `pdftotext` não extrai, renderize a página (por exemplo, com PyMuPDF).
2. Copie `capitulos/capitulo-04/index.html` como base para `capitulos/capitulo-NN/index.html`:
   - `<body data-capitulo="N">`;
   - hero, sumário lateral com `data-gami-toc`;
   - seção `#apresentacao` com objetivos tirados do livro e `#painel-progresso`;
   - uma `<section data-conceito="…" data-titulo="…">` por conceito, com as etapas do SPEC;
   - exercícios graduados, exemplos de código e referências;
   - rodapé com capítulo anterior e próximo.
3. Crie `assets/sims-capNN.js`, com cada simulação registrada por `Redes.registrar` e usada no HTML como `<div data-sim="…">`. Cada desafio de simulação usa `Redes.desafio(raiz, id, pontos, titulo)`.
4. Escreva os blocos `pre.code-block` e acrescente três desafios por bloco em `desafios["capituloN"]` (`assets/playground.js`). Rode o código com Python local para conferir as respostas.
5. Ordem dos scripts no fim da página: Bootstrap, `registro.js`, `gamificacao.js`, `sims-capNN.js`, `playground.js`, `livro.js`.
6. Acrescente o card no `index.html`, no bloco da parte certa ("Parte 1: Princípios", "Parte 2: Protocolos" ou "Parte 3: Prática"), com o selo "Capítulo N · Seção X.Y", o capítulo no dropdown da parte em todas as navbars e o link "Próximo" no rodapé do capítulo anterior.

## Como verificar

- Sirva o site localmente com `python -m http.server`, na raiz, e abra o capítulo.
- Console sem erros, e toda `data-sim` inicializada (o registro avisa no console quando falta uma).
- Faça todas as perguntas e desafios: a pontuação máxima tem que ser alcançável, e o progresso deve continuar depois de recarregar a página.
- Confira os temas claro e escuro e a largura de 375 px, sem rolagem horizontal.
- Rode cada bloco Python no editor da página.
- Ao mexer nos capítulos 1 e 2, compare o texto visível de cada seção antes e depois.

## Pendências conhecidas

- **Cap. 2, grafo editável:** o texto diz que desligar split horizon e poison reverse "pode produzir aumento iterativo da métrica (contagem ao infinito)". O simulador recalcula as rotas do zero a cada clique, então isso não acontece. Ajustar o texto ou o simulador depende do ok do usuário.
- **Um capítulo por seção:** o usuário pediu que cada seção do livro seja um capítulo do site. Em 2026-11 os antigos caps. 9–17, que agrupavam seções, foram divididos nos caps. 9–29 atuais, sem perder conteúdo; as seções curtas (3.1, 3.10, 3.15, 4.1) ganharam conceitos, simulações e blocos tirados das próprias páginas. O progresso salvo dos caps. 9 em diante recomeçou do zero, porque a chave do `localStorage` é o número do capítulo.
- **Parte 3 e glossário:** todos os capítulos (27 a 43) e o glossário estão prontos. O cap. 27 (seção 4.1) explica o formato das atividades e tem o mapa da Parte 3, com o link de cada capítulo de prática. O rodapé do cap. 43 aponta para o glossário, e o glossário aponta de volta para o cap. 43 e para "Todos os capítulos". O crédito da licença CC BY 3.0 (pág. 7 do PDF) fica no rodapé do `index.html` e nas referências do glossário.
