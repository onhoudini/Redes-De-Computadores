# AGENTS.md

Guia para agentes que trabalham neste repositório. O modelo pedagógico completo está no [SPEC.md](SPEC.md); este arquivo diz o que fazer e o que não fazer.

## O projeto

O repositório transforma o livro *Computer Networking: Principles, Protocols and Practice* (Bonaventure, Release 2021, arquivo `livro.pdf` na raiz) em páginas web interativas, um capítulo por vez. Na Parte 1 do livro (*Principles*), o capítulo N do site corresponde à seção 2.N. Na Parte 2 (*Protocols*), cada capítulo agrupa seções 3.x de um mesmo tema e aprofunda um capítulo da Parte 1. A tabela abaixo é a referência.

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
| 9 — DNS e correio eletrônico | 3.1–3.3 (133–148) | pronto |
| 10 — A web e as chamadas remotas | 3.4–3.6 (148–169) | pronto |
| 11 — Protocolos seguros: ssh, TLS e DNSSEC | 3.7–3.9 (169–185) | pronto |
| 12 — UDP e TCP | 3.10–3.12 (185–205) | pronto |
| 13 a 16 (roteiro) | 3.13 congestionamento; 3.14 IPv6; 3.15–3.17 roteamento; 3.18 enlace | a fazer |

### Estrutura

- `index.html`: página inicial, com um card por capítulo.
- `capitulos/capitulo-NN/index.html`: uma página por capítulo.
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
6. Acrescente o card no `index.html`, no bloco da parte certa ("Parte 1: Princípios" ou "Parte 2: Protocolos"), o capítulo no dropdown da parte em todas as navbars e o link "Próximo" no rodapé do capítulo anterior.

## Como verificar

- Sirva o site localmente com `python -m http.server`, na raiz, e abra o capítulo.
- Console sem erros, e toda `data-sim` inicializada (o registro avisa no console quando falta uma).
- Faça todas as perguntas e desafios: a pontuação máxima tem que ser alcançável, e o progresso deve continuar depois de recarregar a página.
- Confira os temas claro e escuro e a largura de 375 px, sem rolagem horizontal.
- Rode cada bloco Python no editor da página.
- Ao mexer nos capítulos 1 e 2, compare o texto visível de cada seção antes e depois.

## Pendências conhecidas

- **Cap. 2, grafo editável:** o texto diz que desligar split horizon e poison reverse "pode produzir aumento iterativo da métrica (contagem ao infinito)". O simulador recalcula as rotas do zero a cada clique, então isso não acontece. Ajustar o texto ou o simulador depende do ok do usuário.
- **Parte 2:** o agrupamento dos capítulos 9 a 12 foi aprovado pelo usuário. Os capítulos 13 a 16 da tabela são só um roteiro: confirme com o usuário antes de começá-los. O rodapé do último capítulo pronto aponta para "Todos os capítulos"; troque por "Próximo: Capítulo N →" quando o seguinte existir.
