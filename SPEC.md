# Modelo de Conteúdo Interativo e Gamificado

Transforme cada capítulo do livro em uma experiência web didática, interativa e gamificada.

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

## 3. Desenvolvimento dos conceitos

Desenvolva cada conceito seguindo a estrutura definida na seção 1.

- **Contextualização:** apresente um problema, situação, pergunta ou exemplo que introduza o conceito.
- **Explicação:** ensine o conceito de forma clara e progressiva, utilizando exemplos e subdivisões quando necessário.
- **Visualização e exploração:** utilize diagramas, animações, comparações, gráficos, fluxos ou outras representações visuais. Sempre que aplicável, permita que o usuário manipule, experimente ou explore o conceito interativamente. Priorize a interação quando ela contribuir para a aprendizagem.
- **Prática:** proponha atividades que exijam a aplicação do conhecimento, com dificuldade adequada ao conteúdo. Inclua desafios e feedback nas próprias atividades.
- **Fixação:** resuma os pontos essenciais e verifique a compreensão quando apropriado.

Nem todas as etapas precisam aparecer em todos os conceitos. A quantidade e a profundidade dos conceitos, subconceitos e atividades devem ser determinadas pelo material.


## 4. Tecnologias e interações

Use tecnologias apropriadas quando elas aumentarem a qualidade didática da experiência.

### Código executável

Quando o conteúdo envolver programação:

- Use **Pyodide** para executar Python diretamente no navegador.
- Use **CodeMirror** como editor de código.
- Permita editar, executar e visualizar o resultado.
- Use o código executável como ferramenta de exploração e experimentação, não apenas como demonstração estática.

### Simulações

Registre simulações por marcadores no HTML, seguindo o padrão utilizado pelo `algoritmos4all`:

```html
<div data-sim="nome-da-simulacao"></div>
```

Utilize uma função centralizada para registrar e inicializar as simulações:

```javascript
registrar("nome-da-simulacao", funcao);
```

Evite scripts isolados e inicializações espalhadas pelo código. Cada simulação deve ser identificada pelo marcador correspondente e inicializada pelo sistema central.

### Acessibilidade

- Adicione `aria-label` aos controles interativos que não possuam nomes acessíveis.
- Utilize `role="img"` e um elemento `<title>` descritivo nos SVGs.
- Respeite a preferência `prefers-reduced-motion`, oferecendo alternativas estáticas para animações.

### Tema visual

- Implemente um tema escuro.
- Disponibilize um botão para alternar entre tema claro e escuro.
- Persista a preferência do usuário utilizando `localStorage`.
- Na ausência de preferência salva, utilize a preferência do sistema operacional.

### Gamificação

- Utilize elementos de gamificação para incentivar o progresso e a participação.
- Relacione pontuações, conquistas, níveis e desafios aos objetivos de aprendizagem.
- Evite elementos meramente decorativos que não contribuam para a experiência didática.