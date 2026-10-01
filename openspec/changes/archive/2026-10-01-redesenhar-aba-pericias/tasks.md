# Tarefas — redesenhar-aba-pericias

## 1. Regras

- [x] 1.1 Confirmar que nenhuma página de `rules/sistema` muda: a aba só apresenta base, ajuste e total, e o selo da maior base não tem efeito mecânico. Registrar a conferência no `HANDOFF.md` (verificação: nota escrita, `git diff rules/` sem mudança desta mudança).

## 2. Dados

- ~~2.1 Ícones no `listas_ficha.json`~~: retirada (design D5 revisto). Os ícones seguem o padrão da aba Atributos, por nome em TS, sem mudar dados nem o Resumo.

## 3. Interface — base

- [x] 3.1 Edição em lote pelo gancho comum `useEdicaoEmLote` (extraído pela mudança `redesenhar-aba-atributos`), sem código de edição próprio (verificação: `PericiasFicha.test.tsx` — gravação em lote, limite 0–5, NPC sem limite, aprovação pendente e cancelar).
- [x] 3.2 Ícones cheios das 30 perícias em `pericias/icones.tsx` (25 desenhos e 5 dos Atributos) e o símbolo das espadas cruzadas de Técnicas; Talentos e Conhecimentos usam o braço e o livro dos Atributos (verificação: teste confere que toda perícia oficial tem ícone e que todo SVG é decorativo).
- [x] 3.3 `pericias/apresentacao.ts`: lema, estandarte e símbolo de cada grupo, ícone por nome e `maioresBases` (verificação: Vitest cobre a maior base única, empatada, com todas em 0 e sem base gravada, e a perícia extra em "Outros").

## 4. Interface — folha

- [x] 4.1 Molduras em SVG/CSS: as do cartão da aba Atributos (volutas, arcos, filigrana e cantos do Resumo), sem SVG novo de 9 fatias (design D0) (verificação: teste confere que só as pinturas são `<img>` e que todo SVG é decorativo).
- [x] 4.2 `PericiasFicha.tsx` e `pericias.css`: folha, cabeçalho, botão, três quadros com estandarte, medalhão, nome e lema, a tabela com selo, caixa de ajuste e placa do total, e o pé da edição (verificação: `PericiasFicha.test.tsx` cobre os cenários da spec: leitura, sem permissão, selo, "—" no ajuste, "+6", fontes do total, edição com limite, salvar em lote, pendente de aprovação, cancelar e perícia extra).
- [x] 4.3 Pinturas opcionais (cena e três estandartes) com o fallback em SVG e degradê (verificação: testes para pintura ausente, carregada e com falha).
- [x] 4.4 `CharacterSheetPage.tsx`: a aba Perícias usa a folha, sem `MolduraSecao` (verificação: `CharacterSheetPage.test.tsx` — "Perícias usa a folha própria com os três quadros"; o teste da moldura comum deixou de listar Perícias).
- [x] 4.5 Larguras (design D8 revisto): três colunas a partir de 1180 px de folha, uma coluna centrada abaixo disso (verificação: `e2e/pericias-visual.spec.mjs` — sem rolagem horizontal, sem sobreposição do medalhão com o texto e sem nome sobre a base, em 1920, 1448, 1300, 1024, 768, 480, 375, 360 e 320 px).

## 5. Arte

- [x] 5.1 Prompts das quatro pinturas em `arte/prompts.md` (verificação: prompts escritos e entregues ao usuário).
- [x] 5.2 `ARTES_DAS_PERICIAS` e `preparar_arte_das_pericias` no `preparar_arte.py`, em `public/arte/pericias/`; a paisagem mantém o papel, multiplicada sobre o pergaminho como a gravura dos Atributos (verificação: `ArteDasPericiasTest` — nada sem matrizes; os quatro WebP nos tamanhos, sem canal alfa).
- [x] 5.3 Integrar as pinturas geradas pelo usuário, calibrando o recorte (`topo`) e o véu do título (verificação: capturas com as pinturas e **aprovação do usuário**).

## 6. Fidelidade à referência

- [x] 6.1 Prévia com os dados da referência: `/preview/ficha?secao=pericias&pericias=referencia`, e a API de demonstração passou a calcular os totais das perícias (base + ajuste) (verificação: e2e confere Prontidão com selo 3, ajuste 3 e total +6).
- [x] 6.2 `e2e/fidelidade-pericias.mjs`: captura em 1448, 1024 e 375 px e gera a comparação empilhada e a sobreposição a 50% em `.screenshots/pericias/`, com e sem pinturas (`--sem-pinturas`) (verificação: o script gera os arquivos; rodada de 2026-09-29 registrada no `HANDOFF.md`).
- [x] 6.3 Asserções de medida no e2e, na escala da folha: cartões de 455 px ±12, estandarte de 104 px ±6, linhas de 30,7 px ±2 e centros de Base, Ajuste e Total a 51%, 68% e 88% ±2 pontos (verificação: `pericias-visual.spec.mjs` verde).
- [x] 6.4 **Aprovação do usuário** comparando lado a lado, sem pinturas e com pinturas, registrada no `HANDOFF.md`.

## 7. Verificação

- [x] 7.1 Suítes completas: `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:client`, `python -m unittest discover -s cursed_platform/tests -t .` e `export_openapi --check` verdes; e2e `node e2e/run.mjs` verde.
- [x] 7.2 Acessibilidade: axe sem violações na folha, em leitura e em edição, no Vitest e no e2e; a tabela é lida com nome, base, ajuste e total; os ornamentos ficam ocultos (verificação: `PericiasFicha.test.tsx` e `pericias-visual.spec.mjs`).
