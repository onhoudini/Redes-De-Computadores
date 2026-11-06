# Modelo de Conteúdo Interativo e Gamificado

Transforme cada capítulo do livro em uma experiência web didática, interativa e gamificada.

Cada capítulo do site corresponde a uma seção da Parte 1 (*Principles*) do livro: o capítulo N cobre a seção 2.N.

## 1. Estrutura de conteúdo

Identifique os conceitos presentes no capítulo e organize-os hierarquicamente.

Cada conceito deve ser apresentado como uma unidade independente de aprendizagem, dividida em etapas conforme a necessidade do conteúdo.

### Modelo

- **[Nome do conceito A]**
  1. Contextualização
  2. Explicação
  3. Visualização e exploração
  4. Prática
  5. Fixação

- **[Nome do conceito B]**
  1. Contextualização
  2. Explicação
  3. Visualização e exploração
  4. Prática
  5. Fixação

- **[Nome do conceito C]**
  ...

Nos capítulos 1 e 2 a etapa 3 se chama apenas "Visualização". Os dois títulos são aceitos; os capítulos novos usam "Visualização e exploração".

No HTML, cada conceito é uma `<section class="chapter-section">` com um `kicker` acima do título e as etapas como `<h3>` numerados ("1. Contextualização", "2. Explicação"…).

### Orientações

- Identifique os conceitos a partir do conteúdo real do capítulo.
- Divida conceitos complexos em subconceitos quando necessário.
- Cada subconceito pode seguir a mesma estrutura de aprendizagem.
- Adapte as etapas à natureza do conceito: não é obrigatório utilizar todas.
- Permita que uma etapa contenha múltiplos exemplos, explicações, visualizações ou atividades.
- Preserve a progressão lógica entre conceitos relacionados.
- Não estabeleça quantidade fixa de conceitos, subconceitos ou atividades.

O objetivo é transformar cada conceito em uma pequena experiência de aprendizagem: **contextualizar → ensinar → demonstrar → permitir explorar → aplicar → consolidar**.

## 2. Apresentação do capítulo

- Introduza o tema e seu contexto.
- Apresente os objetivos de aprendizagem.
- Mostre o progresso do usuário.
- Apresente os conceitos que serão abordados.

Na prática, a página começa com:

- um *hero* com o título do capítulo e um parágrafo de contexto;
- um sumário lateral (TOC), com o resumo do progresso;
- uma seção `#apresentacao` com os objetivos de aprendizagem (tirados dos tópicos do livro), uma explicação curta da pontuação e o painel de progresso (`<div id="painel-progresso">`), que lista os conceitos do capítulo.

Depois dos conceitos, o capítulo fecha com seções de exercícios graduados, exemplos de código e referências. O rodapé leva ao capítulo anterior e ao próximo.

## 3. Desenvolvimento dos conceitos

Desenvolva cada conceito seguindo a estrutura definida na seção 1.

- **Contextualização:** apresente um problema, situação, pergunta ou exemplo que introduza o conceito.
- **Explicação:** ensine o conceito de forma clara e progressiva, utilizando exemplos e subdivisões quando necessário.
- **Visualização e exploração:** utilize diagramas, animações, comparações, gráficos, fluxos ou outras representações visuais. Sempre que aplicável, permita que o usuário manipule, experimente ou explore o conceito interativamente. Priorize a interação quando ela contribuir para a aprendizagem.
- **Prática:** proponha atividades que exijam a aplicação do conhecimento, com dificuldade adequada ao conteúdo. Inclua desafios e feedback nas próprias atividades.
- **Fixação:** resuma os pontos essenciais e verifique a compreensão quando apropriado.

Nem todas as etapas precisam aparecer em todos os conceitos. A quantidade e a profundidade dos conceitos, subconceitos e atividades devem ser determinadas pelo material.

### Perguntas rápidas

As perguntas de prática e fixação usam o componente de múltipla escolha de `assets/livro.js`:

```html
<div class="demo-box mini-quiz" data-options="Opção A|Opção B|Opção C" data-answer="1"
     data-explain="Explicação mostrada no acerto." data-hint="Dica mostrada no erro.">
    <p class="fw-semibold mb-2">Pergunta</p>
</div>
```

`data-answer` é o índice (a partir de 0) da opção correta.

## 4. Fontes do conteúdo

- O conteúdo vem do livro de referência que está no repositório: `livro.pdf` (Bonaventure, *Computer Networking: Principles, Protocols and Practice*, Release 2021).
- O que não estiver na seção correspondente do livro deve ser complemento correto e identificável como tal.
- Quando o livro tiver um erro, mantenha a informação correta na página e explique a divergência numa nota (`<p class="nota-livro">`).
- Desafios indicam a página do PDF onde a resposta pode ser conferida.
- Referências externas só podem ser fontes abertas, que abrem com um clique: sem cadastro, sem login, sem pagamento (por exemplo RFCs, IENs e Wikipedia). Fontes fechadas ficam de fora, mesmo que o livro as cite.

## 5. Tecnologias e interações

Use tecnologias apropriadas quando elas aumentarem a qualidade didática da experiência.

As páginas são HTML estático com Bootstrap 5.3.8 (via CDN) e os arquivos de `assets/`. Os estilos comuns dos capítulos ficam em `assets/capitulo.css` e o tema escuro em `assets/livro.css`.

### Código executável

Quando o conteúdo envolver programação:

- Use **Pyodide** para executar Python diretamente no navegador.
- Use **CodeMirror** como editor de código.
- Permita editar, executar e visualizar o resultado.
- Use o código executável como ferramenta de exploração e experimentação, não apenas como demonstração estática.

Basta escrever o código em `<pre class="code-block"><code>…</code></pre>`: o `assets/playground.js` transforma cada bloco num editor executável e carrega o Pyodide (0.27.7) e o CodeMirror (5.65.18) só quando necessário. Dentro do bloco, o `<` precisa ser escrito como `&lt;`.

Cada bloco tem três desafios (Aquecimento, Intermediário, Desafio), com a resposta conferida executando o código. Eles ficam no objeto `desafios` de `assets/playground.js`, na chave `"capituloN"`, na mesma ordem dos blocos da página.

### Simulações

Registre simulações por marcadores no HTML, seguindo o padrão utilizado pelo `algoritmos4all`:

```html
<div data-sim="nome-da-simulacao"></div>
```

Utilize uma função centralizada para registrar e inicializar as simulações. Ela está em `assets/registro.js`:

```javascript
Redes.registrar("nome-da-simulacao", function (raiz, util) {
    // monta a simulação dentro de `raiz`, sem depender de ids globais
});
```

Evite scripts isolados e inicializações espalhadas pelo código. Cada simulação deve ser identificada pelo marcador correspondente e inicializada pelo sistema central. As simulações de cada capítulo ficam em `assets/sims-capN.js`. `Redes.util` oferece auxiliares para criar elementos e campos, e `Redes.diagramaSequencia(...)` desenha diagramas de sequência temporal.

**Exceção:** os capítulos 1 e 2 foram aprovados antes desse padrão. Suas simulações usam `getElementById`, com código inline na página (o capítulo 2 também usa `assets/simulacoes.js`), e assim devem permanecer.

### Acessibilidade

- Adicione `aria-label` aos controles interativos que não possuam nomes acessíveis.
- Utilize `role="img"` e um elemento `<title>` descritivo nos SVGs.
- Respeite a preferência `prefers-reduced-motion`, oferecendo alternativas estáticas para animações.

Em animações feitas em JavaScript, use `Redes.reduzMovimento()` para mostrar direto o estado final. Como rede de segurança, `assets/livro.js` acrescenta `aria-label`, `role` e `<title>` onde estiverem faltando.

### Tema visual

- Implemente um tema escuro.
- Disponibilize um botão para alternar entre tema claro e escuro.
- Persista a preferência do usuário utilizando `localStorage`.
- Na ausência de preferência salva, utilize a preferência do sistema operacional.

O botão tem a classe `theme-toggle`. O `assets/livro.js` grava o tema no atributo `data-theme` do `<html>` e na chave `redes-theme` do `localStorage`.

### Gamificação

- Utilize elementos de gamificação para incentivar o progresso e a participação.
- Relacione pontuações, conquistas, níveis e desafios aos objetivos de aprendizagem.
- Evite elementos meramente decorativos que não contribuam para a experiência didática.

A gamificação está em `assets/gamificacao.js`:

- `<body data-capitulo="N">` identifica o capítulo; o progresso fica no `localStorage`, na chave `redes-progresso-capN`.
- Cada conceito pontuável é uma seção com `data-conceito="id"` e `data-titulo="Nome"`.
- Perguntas rápidas valem 10 pontos se acertadas na primeira tentativa e 5 depois.
- Desafios das simulações são declarados com `Redes.desafio(raiz, id, pontos, titulo)`, que devolve a função a chamar quando o usuário acerta. Cada desafio pontua uma única vez.
- Ao concluir todas as perguntas e desafios de um conceito, o usuário ganha a medalha do conceito.
- Níveis por fração da pontuação máxima: Bit → Quadro → Pacote → Segmento → Mensagem.
- O painel permite reiniciar o progresso.
