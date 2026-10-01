# Passagem de trabalho — redesenhar-aba-atributos

## O que a mudança faz

Classificação: **núcleo**, só interface. A aba Atributos vira uma cópia fiel da referência enviada pelo usuário em 2026-09-29 (Lion, Especialista de Combate · Elfo, a 1448 px): folha de pergaminho com moldura dourada, cabeçalho com a gravura das três figuras e as fitas de legenda, e três cartões (Físicos, Sociais, Mentais) com faixa pintada, medalhão e tabela Nome / Base / Ajuste manual / Total. Nenhuma regra, valor ou cálculo muda.

## Pedido do usuário

- "Formatar a página Atributos assim como fizemos com o Inventário e o Resumo", usando tudo o que foi feito nos dois.
- "Quero uma cópia fiel dessa página; planeje bem como vamos atingir o resultado."
- O usuário gera as imagens quando pedido (ChatGPT, com os prompts de `arte/prompts.md`).

## Como a fidelidade é buscada

- `e2e/capturas-atributos.mjs` captura a folha a 1448, 1024 e 375 px em `.screenshots/atributos/`.
- A comparação é a referência e a captura empilhadas na mesma largura (`.screenshots/atributos/comparacao-referencia-1448.png`), mais recortes ampliados do cartão e do cabeçalho. Cada rodada corrigiu medidas; ver D4a no design.
- O que ainda difere é **pintura**: a gravura das três figuras e as cenas das faixas. Sem elas, a aba usa emblemas em SVG e degradês.

## Decisões de implementação

- **Gravura única** em vez de três vinhetas: na referência as figuras são um desenho contínuo.
- **Fonte:** Cormorant Garamond com algarismos alinhados e contorno fino do texto para o peso da referência. O atalho `font:` zera `font-variant-numeric`; por isso a regra `.atributos-folha *` no fim do CSS.
- **Três colunas** só a partir de 1180 px de folha; abaixo, uma coluna de até 34rem. Medido no e2e: com cartões de ~300 px, "Manipulação" encostava no disco da base.
- **Lógica de edição** extraída para `useEdicaoEmLote`, usada também pela `AttributeTable` (aba Perícias, que não mudou de aparência).
- **Ícones** novos em silhueta cheia (`atributos/icones.tsx`); o Resumo continua com os de traço.
- **Textos** das legendas e subtítulos em `atributos/apresentacao.ts` (texto de interface, não regra).
- **e2e em arquivo próprio** (`e2e/atributos-visual.spec.mjs`, incluído no `playwright.config.mjs`), porque outra sessão editava o `ficha-visual.spec.mjs` ao mesmo tempo.

## Estado (2026-09-29)

- Feito e verificado: 1.1, 2.1, 3.1–3.5, 4.1, 4.2, 5.1.
- As quatro pinturas do usuário estão integradas em `public/arte/atributos/` (gerado só com `preparar_arte_dos_atributos`, para não regravar a arte das outras telas). Ajustes do encaixe: gravura em 11:4 ancorada no alto numa caixa de 3,5:1; faixas dessaturadas e tingidas na cor do grupo; braço do medalhão de Físicos redesenhado.
- Aberto:
  - **4.3:** aprovação do usuário do encaixe das pinturas;
  - **5.2:** aprovação visual do usuário nas capturas;
  - **5.3:** suíte completa antes do commit.

## Verificação

- `npx vitest run src/app/characters/sheet` → 18 arquivos, 181 testes (inclui `AtributosFicha.test.tsx`, 11).
- `python -m unittest cursed_platform.tests.test_preparar_arte.ArteDosAtributosTest` → 2 testes.
- `E2E_APP_URL=http://localhost:5182 npx playwright test -c e2e/playwright.config.mjs atributos-visual` → 8 testes (360 a 1448 px, sem pinturas, axe em leitura e edição).
- `tsc --noEmit` e `eslint` sem erros.

## Como ver

- Prévia sem API: `/preview/ficha?secao=atributos` (servidor `atributos-preview`, porta 5182, em `.claude/launch.json`).
- Capturas: `E2E_APP_URL=http://localhost:5182 node e2e/capturas-atributos.mjs [largura...]`.

## Cuidados

- **Perícias depende desta aba** (mudança `redesenhar-aba-pericias`, avisada pela outra sessão em 2026-09-29): a folha de Perícias reaproveita as classes de `atributos.css`, `MedalhaoGrupo`, `IconeGrupo`, `IconePena`, `useEdicaoEmLote` e as peças exportadas de `AtributosFicha.tsx` (`PinturaOpcional`, `VolutaDaFaixa`, `ArcoDaFaixa`, `FiligranaDoMedalhao`). Mudar classes ou a estrutura do cartão exige conferir Perícias. Os seletores do `atributos-visual.spec.mjs` começam por `#painel-atributos`, porque os cartões escondidos de Perícias têm as mesmas classes.
- Árvore de trabalho misturada com `reformular-visual-da-ficha` e `redesenhar-informacoes-basicas` (outra sessão mexe em `preparar_arte.py`, `test_preparar_arte.py`, `CharacterSheetPage.test.tsx` e `ficha-visual.spec.mjs`). Os commits precisam ser separados.
