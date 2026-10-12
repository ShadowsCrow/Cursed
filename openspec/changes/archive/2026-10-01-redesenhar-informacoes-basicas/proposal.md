# Proposta — redesenhar-informacoes-basicas

## Why

A aba **Informações básicas** é onde o jogador confere e corrige quem é o personagem: nome, classe, arquétipo, raça, nível, idade, altura, sexo e tamanho. Hoje ela é uma grade de rótulos e botões soltos dentro da moldura comum, sem hierarquia: o nome tem o mesmo peso que a altura, e o conceito do arquétipo aparece como nota de rodapé. Depois do Resumo e do Inventário, é a aba que mais destoa da nova estética.

O usuário enviou uma imagem de referência (2026-09-29): folha de pergaminho com cantos dourados, título grande com pena e paisagem de castelo em sépia, dois quadros lado a lado ("Características pessoais" e "Classificação e origem"), cada campo numa linha com ícone, rótulo, valor e botão "Editar", e uma faixa final com o **conceito do arquétipo** entre duas naturezas-mortas pintadas.

Classificação: **núcleo, apenas interface**. Nenhuma regra, limite, catálogo ou dado muda. Os campos, as permissões, as consequências das trocas (cartas que saem e entram, escolha do Tamanho) e os avisos do servidor continuam exatamente como estão.

## What Changes

- **Folha da aba**: a aba deixa a moldura comum das seções e passa a usar a folha do Resumo — pergaminho, moldura dupla, cantos grandes e flores nas bordas em SVG.
  - Cabeçalho: etiqueta "IDENTIDADE", título "Informações básicas" com uma pena, subtítulo "Dados fundamentais sobre o personagem." e um friso.
  - À direita, uma **paisagem em sépia** pintada (castelo, ponte, árvores); sem ela, a rosa dos ventos em SVG.
- **Dois quadros** com a moldura recortada dos quadros do Resumo e um emblema no título:
  - **Características pessoais**: Nome, Arquétipo, Nível, Altura (m), Tamanho base.
  - **Classificação e origem**: Classe, Raça, Idade, Sexo, Tamanho atual.
  - Cada campo é uma linha: ícone próprio, rótulo em versalete, valor em fonte de exibição e o botão "✎ Editar" (só para quem pode editar aquele campo, como hoje).
- **Faixa do conceito do arquétipo**: moldura dourada, ícone de livro, título "Conceito do arquétipo {nome}", friso e o texto; à esquerda a natureza-morta já pintada para o Resumo, à direita uma pintura nova (livros e tecido azul). Sem arquétipo com conceito, a faixa não aparece, como hoje.
- **Pinturas opcionais**, como no Resumo: prompts em `arte/prompts.md`, preparo no `preparar_arte.py`, e a folha fica completa só com o SVG quando faltam.
- Duas colunas em telas largas; uma coluna e pinturas omitidas no celular, sem rolagem horizontal a partir de 360 px.

## Capabilities

### Modified Capabilities
- `visual-da-ficha`: a aba Informações básicas ganha folha própria, no lugar da moldura comum das seções.

## Non-goals

- Tornar editável o **Tamanho base**: ele vem da raça. A linha aparece sem "Editar", com "Da raça {nome}".
- Novos campos (origem, altura com unidade diferente, pronomes) ou mudança de catálogo.
- Mudar o comportamento da edição (popover, consequências, aprovação do Narrador, avisos).
- Redesenhar outras abas (Personalidade, Atributos, Perícias etc.).
- Mostrar a faixa do conceito vazia quando não há conceito.

## Impact

- **Frontend:** `platform/frontend/src/app/characters/sheet/IdentityPanel.tsx` (nova composição), novo `informacoes/` com ornamentos, ícones e CSS; `CharacterSheetPage.tsx` (a aba usa a folha); `resumo/ornamentos.tsx` reaproveitado.
- **Arte:** `platform/frontend/scripts/preparar_arte.py` (pinturas da aba), `public/arte/` (saídas), prompts na mudança.
- **Testes:** `IdentityPanel.test.tsx`, `CharacterSheetPage.test.tsx`, `test_preparar_arte.py`, e2e `ficha-visual.spec.mjs` e capturas em `e2e/capturas-ficha.mjs`.
- **Sem API, sem migração, sem mudança nas regras.**
- **Ordem de arquivamento:** o requisito modificado vem de `reformular-visual-da-ficha`, ainda não arquivada; esta mudança só pode ser arquivada depois dela.
