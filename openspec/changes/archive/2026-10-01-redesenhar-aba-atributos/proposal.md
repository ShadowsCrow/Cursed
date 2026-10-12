# Proposta — redesenhar-aba-atributos

## Why

Os nove atributos são a base de quase toda rolagem do Cursed, mas a aba Atributos ainda é uma tabela de formulário: três listas de números soltos sob o cabeçalho comum das seções. O jogador não vê de relance onde o personagem é forte (corpo, presença ou mente), e o total com as fontes, que explica de onde vem cada bônus, se perde no meio de colunas iguais. O Resumo e o Inventário já ganharam a nova estética; a aba Atributos destoa deles.

A imagem de referência enviada pelo usuário em 2026-09-29 mostra o que se quer:
- uma **folha de pergaminho** com moldura dourada e cantos ornados, como a do Resumo;
- no alto, o sobretítulo "BASE MECÂNICA", o título "Atributos", uma frase de apresentação, **três vinhetas desenhadas** (Força do corpo, Presença social, Foco mental) com faixas de legenda e o botão "Editar valores";
- **três cartões**, um por grupo (Físicos, Sociais, Mentais), cada um com uma **faixa pintada** na cor do grupo (vinho, verde e azul), um **medalhão** com o ícone do grupo sobre a borda e o subtítulo do grupo;
- em cada cartão, a tabela Nome, Base, Ajuste manual e Total, com um **ícone por atributo**, a base num **disco escuro**, o ajuste numa **caixa** e o total numa **placa dourada** com sinal.

Classificação: **núcleo**, só interface. Nenhuma regra, valor, limite ou cálculo muda.

## What Changes

- **Aba Atributos redesenhada** segundo a referência:
  - folha de pergaminho com a moldura dupla, os cantos e as flores da borda do Resumo (SVG/CSS, sem imagem);
  - cabeçalho próprio da aba, no lugar do cabeçalho comum com medalhão: sobretítulo, título, frase, vinhetas com legenda e "Editar valores" com ícone de pena;
  - três cartões de grupo com faixa pintada, medalhão e moldura dourada em SVG/CSS;
  - linhas com ícone do atributo, disco da base, caixa do ajuste e placa do total.
- **Total com fontes:** a placa dourada continua abrindo a lista de fontes e os situacionais, como hoje.
- **Edição em lote:** "Editar valores" continua transformando base e ajuste em campos, com os mesmos limites, a mesma gravação única, o mesmo aviso de aprovação do Narrador e os mesmos erros. Os campos ficam dentro do disco e da caixa.
- **Ajuste com sinal:** o ajuste manual aparece com sinal (+1, −1); sem ajuste, "—".
- **Atributos extras da ficha:** nomes fora dos nove oficiais continuam aparecendo, num quarto cartão "Outros registrados na ficha", com faixa neutra.
- **Pinturas opcionais:** uma gravura a bico de pena com as três figuras e três cenas das faixas. Sem elas, as figuras viram emblemas em SVG e as faixas ficam em degradê na cor do grupo; nada quebra.
- **Celular:** os cartões empilham; as vinhetas encolhem e ficam abaixo do título; nada rola na horizontal a partir de 360 px.
- **Lógica de edição compartilhada:** a edição em lote sai da `AttributeTable` para um gancho comum, usado pela aba Atributos e pela aba Perícias, que não muda de aparência nesta mudança.

## Capabilities

### New Capabilities
- `atributos-da-ficha`: composição, leitura, edição e comportamento responsivo da aba Atributos da ficha.

### Modified Capabilities
- Nenhuma. Os limites dos valores (`limites-de-atributos-e-pericias`) e o cálculo do total (`calculo-de-valores-da-ficha`) não mudam.

## Non-goals

- Redesenhar a aba Perícias (ela mantém a tabela atual, com a lógica de edição compartilhada).
- Mudar valores, limites, fontes, situacionais ou a forma de cálculo dos atributos.
- Levar os textos da aba (legendas e subtítulos dos grupos) para catálogo JSON: são texto de interface, não conteúdo do sistema. Os grupos e os nomes continuam em `sheetCatalog.ts`, como hoje.
- Mudar o Resumo, o cabeçalho da ficha, a faixa de estado ou a barra de abas.
- Tarefas de validação em mesa ou em sessão real de jogo.

## Impact

- Frontend: `characters/sheet/AttributeTable.tsx` (lógica extraída), novo `characters/sheet/atributos/` (componente, ícones, CSS), `CharacterSheetPage.tsx` (a aba passa a usar o componente novo), testes de unidade e e2e.
- Arte: `platform/frontend/scripts/preparar_arte.py` ganha as quatro pinturas da aba; saídas em `public/arte/atributos/`.
- Servidor, contratos, migrações e regras: sem mudança.
