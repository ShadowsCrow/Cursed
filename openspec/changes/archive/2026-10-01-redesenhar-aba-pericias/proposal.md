# Proposta — redesenhar-aba-pericias

## Why

A aba **Perícias** é onde o jogador confere o que o personagem sabe fazer antes de pedir um teste (`1d20 + Atributo + Perícia`). Hoje ela é a tabela comum dentro da moldura das seções: três tabelas iguais, sem ícones, sem hierarquia entre Talentos, Técnicas e Conhecimentos. Depois do Resumo e do Inventário, é uma das abas que mais destoa da nova estética, e ler 30 linhas iguais cansa na hora do jogo.

O usuário enviou uma imagem de referência (2026-09-29) e pediu uma **cópia fiel**:
- folha de pergaminho com moldura dourada e cantos em volutas;
- cabeçalho com a etiqueta "ESPECIALIDADES", o título "Perícias", o texto "As perícias representam o que seu personagem sabe, pratica e é capaz de fazer no mundo." e uma **paisagem em sépia** (guerreiros, arqueiro, cidade gótica, rosas dos ventos) atrás;
- botão "✎ Editar valores" no canto de cima;
- **três quadros lado a lado**, cada um com um **estandarte pintado** (Talentos em vermelho, Técnicas em verde, Conhecimentos em azul), um **medalhão dourado** com o símbolo do grupo, o nome e uma linha em versalete ("INSTINTO E AÇÃO", "PRÁTICA E OFÍCIO", "SABEDORIA E MUNDO");
- em cada quadro, a tabela Nome · Base · Ajuste manual · Total, com **ícone próprio em cada perícia**, o ajuste numa caixinha, o total numa **placa dourada** com sinal ("+6") e a **maior base da ficha num selo escuro**.

Classificação: **núcleo, apenas interface**. Nenhuma regra, limite ou valor muda. Base, ajuste e total continuam os mesmos, com a mesma edição em lote, os mesmos limites (0 a 5 para personagens) e a mesma aprovação do Narrador.

## What Changes

- **Folha própria da aba:** a aba Perícias deixa a moldura comum das seções e passa a ter uma folha de pergaminho, na mesma construção do Resumo (cantos e flores em SVG, moldura dupla em CSS).
- **Cabeçalho:** etiqueta, título, texto e o botão "Editar valores" (só para quem pode editar alguma perícia, como hoje). Atrás, à direita, a **cena em sépia**; sem ela, uma rosa dos ventos e um friso em SVG.
- **Três quadros de grupo** com moldura recortada em SVG (9 fatias), estandarte pintado com moldura dourada em SVG por cima, medalhão SVG com braço, espadas cruzadas ou livro aberto, nome e lema do grupo. Sem a pintura, o estandarte fica num degradê da cor do grupo.
- **Linhas das perícias:**
  - ícone próprio de cada perícia (30 ícones cheios em SVG, ligados pelo `icones_ficha` do `listas_ficha.json`);
  - Base em número; a **maior base da ficha** ganha o selo escuro (todas as empatadas; nenhuma quando a maior é 0);
  - Ajuste manual numa caixa só de leitura ("—" quando vazio);
  - Total numa placa dourada com sinal, que continua abrindo as fontes do valor.
- **Edição:** "Editar valores" troca base e ajuste por campos dentro das mesmas caixas, com "Cancelar" e "Salvar alterações (n)" no pé da folha. A lógica sai de `AttributeTable` para um gancho comum, sem mudar o comportamento da aba Atributos.
- **Perícias fora da lista oficial** ("Outros registrados na ficha") num quarto quadro, sem estandarte pintado.
- **Pinturas opcionais** (cena e três estandartes): prompts em `arte/prompts.md`, preparo no `preparar_arte.py`. Sem elas, a folha fica completa só com SVG e CSS.
- **Telas menores:** três colunas em telas largas; duas colunas com o terceiro quadro centralizado; uma coluna no celular, sem rolagem horizontal a partir de 360 px.
- **Ícones no Resumo:** como o Resumo lê o mesmo `icones_ficha`, o quadro Perícias do Resumo passa a mostrar os mesmos ícones.

## Capabilities

### Modified Capabilities
- `visual-da-ficha`: a aba Perícias ganha folha própria, no lugar da moldura comum das seções.

## Non-goals

- Mudar regras, limites, cálculo do total, nomes ou grupos das perícias.
- Redesenhar Atributos, Informações básicas ou outras abas (Informações básicas tem mudança própria, `redesenhar-informacoes-basicas`).
- Editar o ajuste direto na caixa, fora de "Editar valores" (decisão do usuário, 2026-09-29).
- Dar sentido mecânico ao selo da maior base: é só leitura rápida.
- Mudar o cabeçalho, a faixa de estado e a barra de abas, já feitos em `reformular-visual-da-ficha`.

## Impact

- **Frontend:** novo `platform/frontend/src/app/characters/sheet/pericias/` (folha, quadros, linhas, CSS, molduras SVG); `AttributeTable.tsx` passa a usar o gancho de edição comum; `CharacterSheetPage.tsx` (a aba usa a folha); `resumo/ornamentos.tsx` (ícones cheios e medalhões dos grupos).
- **Dados:** `cursed_platform/catalogos/listas_ficha.json` (`icones_ficha` com um ícone por perícia). Sem mudança de contrato, API ou migração.
- **Arte:** `platform/frontend/scripts/preparar_arte.py` (quatro pinturas), `public/arte/pericias-*.webp`, prompts na mudança.
- **Testes:** Vitest da folha e do gancho, `AttributeTable.test.tsx`, `CharacterSheetPage.test.tsx`, `test_catalogos.py`, `test_preparar_arte.py`, e2e `ficha-visual.spec.mjs` e capturas em `e2e/capturas-ficha.mjs`.
- **Ordem de arquivamento:** o requisito modificado vem de `reformular-visual-da-ficha`, ainda não arquivada; esta mudança só pode ser arquivada depois dela.
