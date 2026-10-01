# Tarefas — redesenhar-aba-atributos

## 1. Regras e dados

- [x] 1.1 Confirmar que nada muda em `rules/sistema` nem nos catálogos (verificação: `git diff rules/ cursed_platform/catalogos/` sem alterações desta mudança; o diff atual em `Carga.md` e `manifesto.json` é da `reformular-visual-da-ficha`).

## 2. Lógica de edição

- [x] 2.1 Extrair `useEdicaoEmLote` da `AttributeTable` (rascunho, limites, alterações, aprovação, gravação única, cancelar). Verificação: `AttributeTable.test.tsx` verde sem alteração nos testes.

## 3. Interface

- [x] 3.1 `atributos/icones.tsx`: nove ícones preenchidos dos atributos e três ícones de grupo (braço, aperto de mãos, livro), decorativos. Verificação: teste de que cada nome oficial tem ícone e que todos são `aria-hidden`.
- [x] 3.2 `atributos/AtributosFicha.tsx` + `atributos.css`: folha com moldura do Resumo, cabeçalho (sobretítulo, título, frase, vinhetas com legenda, "Editar valores"), cartões com faixa, medalhão e tabela; disco da base, caixa do ajuste com sinal, placa do total com fontes. Verificação: `AtributosFicha.test.tsx` (composição, ajuste com sinal, total "—" não calculável, fontes no popover, cartão "Outros", leitor sem ação de editar, tabelas nomeadas pelos títulos).
- [x] 3.3 Edição na aba: campos no disco e na caixa, erros junto ao campo, aviso de aprovação, Salvar e Cancelar no pé. Verificação: `AtributosFicha.test.tsx` (gravação única com duas alterações, base 6 recusada, NPC sem limite, aviso de aprovação, Cancelar sem gravar).
- [x] 3.4 Pinturas opcionais com fallback (emblemas SVG sem a gravura, degradê nas faixas), sem imagem quebrada nem salto. Verificação: teste de unidade do fallback após `error` e e2e da caixa de proporção reservada.
- [x] 3.5 `CharacterSheetPage`: a aba Atributos usa `AtributosFicha`. Verificação: `CharacterSheetPage.test.tsx` verde e caso novo abrindo `?secao=atributos`.

## 4. Arte

- [x] 4.1 `arte/prompts.md` com a mensagem inicial e os quatro prompts (gravura das três figuras e três faixas). Verificação: revisão do usuário (as quatro pinturas foram geradas com eles em 2026-09-29).
- [x] 4.2 `preparar_arte.py`: `ARTES_DOS_ATRIBUTOS` (gravura 11:4 → 1440 × 524; faixas 3:1 → 1200 × 400) em `public/arte/atributos/`. Verificação: `test_preparar_arte` com os tamanhos e nomes das saídas.
- [x] 4.3 Integrar as pinturas do usuário e calibrar a máscara da gravura, a posição das fitas e o degradê das faixas. Verificação: aprovação visual do usuário nas capturas.
  - 2026-10-01: aprovado pelo usuário ("tudo aprovado").

## 5. Verificação

- [x] 5.1 e2e `ficha-visual`: aba Atributos de 360 a 1440 px sem rolagem horizontal, cartões em três colunas a partir de 1100 px e em uma no celular, axe sem violações. Verificação: `node e2e/run.mjs` verde.
- [x] 5.2 Capturas da aba (1448, 1024, 375 px) em `.screenshots/atributos/`, comparadas lado a lado com a referência. Verificação: aprovação do usuário.
  - 2026-10-01: aprovado pelo usuário ("tudo aprovado").
- [x] 5.3 Suíte completa (backend, `npm test`, `typecheck`, `lint`, e2e) antes do commit.
  - 2026-10-01, uma vez no fim, com a árvore de todas as mudanças: backend 562 testes OK (16 pulados); `npm test` 91 arquivos e 692 testes; `lint`, `typecheck`, `check:client` (cliente regenerado) e `export_openapi --check` sem erros; e2e `node e2e/run.mjs` 84 testes. Para fechar: `test_preparar_arte` passou a conferir as peças da aba Cartas e do editor, com orçamento próprio de 4 MB para elas (6 MB para o resto), e `Libraries.test.tsx` simula a validação do editor aberto pelo grimório.
