# Tarefas — redesenhar-informacoes-basicas

## 1. Regras e dados

- [x] 1.1 Nenhuma mudança em `rules/sistema` nem nos catálogos (verificação: `git diff rules/ cursed_platform/catalogos/` sem alterações desta mudança).

## 2. Arte

- [x] 2.1 Prompts da paisagem em sépia e da natureza-morta da direita em `arte/prompts.md`; a da esquerda reaproveita `resumo-natureza-morta.webp`.
- [x] 2.2 `preparar_arte.py`: tabela `ARTES_DAS_INFORMACOES` no formato das pinturas do Resumo e preparo comum às duas tabelas. Verificação: `test_preparar_arte.py` gera as duas pinturas a partir de matrizes sintéticas (tamanho final; a natureza-morta sem fundo e a paisagem com fundo).
- [x] 2.3 Trocar os fallbacks pelas pinturas geradas pelo usuário. Verificação: capturas da aba com as pinturas e **aprovação do usuário** registrada no `HANDOFF.md`.

## 3. Interface

- [x] 3.1 Ícones das linhas, emblemas dos quadros, pena e livro em SVG decorativo (`informacoes/icones.tsx`), com o símbolo do sexo escolhido pelo valor gravado. Verificação: teste de que nenhum ícone aparece na árvore de acessibilidade e de que o símbolo muda com o valor.
- [x] 3.2 `IdentityPanel` na folha do Resumo: cabeçalho, dois quadros com os campos na divisão da referência, linhas com ícone e a faixa do conceito com as pinturas opcionais. Verificação: `IdentityPanel.test.tsx` confere os dois quadros e seus campos, a faixa com o conceito, a ausência da faixa sem conceito, o Tamanho base sem botão e o axe sem violações.
- [x] 3.3 `CharacterSheetPage` usa a folha na aba Informações básicas, no lugar da moldura comum, com o título uma única vez. Verificação: `CharacterSheetPage.test.tsx` segue verde.
- [x] 3.4 Pinturas que falham somem e o texto ocupa o espaço. Verificação: teste de componente disparando `error` nas pinturas.
- [x] 3.5 Prévia `/preview/ficha` com classes, raças e sexos do catálogo, para a aba mostrar o conceito e o Tamanho base (verificação: captura da aba na prévia).

## 4. Verificação

- [x] 4.1 e2e em `ficha-visual.spec.mjs`: quadros lado a lado em 1440 px, empilhados em 375 px, linhas sem sobreposição e sem rolagem horizontal da página em 1440, 768, 375 e 360 px.
- [x] 4.2 Capturas da aba em `.screenshots/visual-da-ficha/` (1440, 768 e 375 px) e **aprovação do usuário** registrada no `HANDOFF.md`.
- [x] 4.3 Suítes completas verdes: backend (`unittest`), `npm test`, `typecheck`, `lint` e e2e.
