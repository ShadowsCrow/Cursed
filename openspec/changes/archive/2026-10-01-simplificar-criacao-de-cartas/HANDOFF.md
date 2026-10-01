# Handoff — simplificar-criacao-de-cartas

Estado em 2026-09-30. Falta só a **aprovação visual do usuário** (tarefa 6.4). Depois dela, a mudança pode ser arquivada.

## Decisões do usuário (2026-09-30)

- **Uma etapa só.** O "Nova carta" abre direto o editor; não há mais a etapa de tipo e título.
- **O conceito aprovado** é `referencia/conceito-editor-mochila.png`, e o editor precisa ficar igual a ele ("antes de aplicar lembre-se de que precisa ficar igual").
- **Campos por subtipo no catálogo JSON** (`itens.json`), seguindo `rules/sistema/Equipamentos.md`.
- **Tipo de dano:** o terceiro físico é **Contundente** ("seguindo o padrão dos outros danos, cortante, perfurante, contundente"). A página `Condições e Tipos de Dano.md` ainda diz "Concussão". Ela não foi alterada e só muda se o usuário pedir.
- **Fim do peso.** "Se n tem nada para migrar n precisa se preocupar com isso, vamos abolir o peso." O banco de testes não tinha item nem carta (consulta de 2026-09-30), então não houve migração. Pelo mesmo motivo, o quadro "Não se aplicam a este tipo" saiu do plano: um campo fora do subtipo é erro de validação.

## Regras

Nenhuma página de `rules/sistema` muda nesta mudança (tarefa 1.1). O `git diff rules/` mostra só `Carga.md` (moedas sem platina), que é da `reformular-visual-da-ficha`.

## O que foi feito

- **Dados:**
  - `cursed_platform/catalogos/itens.json` ganhou `listas`, `campos` e `campos_por_subtipo`. O `catalogos.py` valida as referências ao carregar.
  - `dano`, `armadura` e `rdb` mantêm os ids de antes, então a ficha viva não muda.
- **Servidor:**
  - `cartas.validar` recusa, nos `dados` do item, valores fora do tipo do campo e campos que o subtipo não declara.
  - As mensagens do Pydantic saem em português (`_mensagem`).
  - O `PUT /rascunho` aceita `tipo` enquanto a carta não foi publicada; depois disso, responde 409.
  - O catálogo de itens serve os campos. O `openapi.json` e o `schema.ts` foram regenerados.
- **Fim do peso:** o `sem_peso` (em `domain/grade.py`) é aplicado em `ficha_viva.preparar_importacao` (códigos EQ de carta e de equipamento), em `migracao_tabelas.py` e em `migracao_json.py`. O peso também saiu da bandeja "Sem dimensão" e da definição de formato.
- **Interface:**
  - `CardEditor.tsx` foi reescrito no grimório:
    - `MolduraDoGrimorio` foi extraída do `DetalheDaCarta.tsx`;
    - o tipo fica nos marcadores, e o título se edita na carta;
    - a câmera envia a arte e cria a carta, se preciso;
    - os campos do tipo e do subtipo ficam em quadros;
    - no pé, o estado do salvamento e o selo de Publicar.
  - `useSalvamentoAutomatico.ts`: criação preguiçosa, debounce de 1 s, um envio por vez e conflito.
  - `usoDosProblemas.ts` e `problemasDoEditor.tsx`: os problemas aparecem junto do quadro.
  - `camposDoEditor.tsx`: os quadros e os controles.
  - `iconesDosCampos.tsx`: ícones do Lucide 0.469.0 (licença ISC).
  - `ItemFormatEditor`: o subtipo virou a fila de ícones `SeletorDeSubtipo`. As funções puras foram para `inventory/formatoDoItem.ts`.
  - O `NovaCartaDialog` saiu da `NarratorLibrary`.
- **Arte:** quatro pinturas geradas pelo Codex, listadas em `arte/prompts.md`, e preparadas pelo `preparar_arte.py` (`preparar_pecas_do_editor`).
- **Prévia e capturas:**
  - `/preview/editor` (`ProvaDoEditor.tsx`) roda sem API e é usada pelo `e2e/editor-visual.spec.mjs`.
  - `e2e/fidelidade-editor.mjs` usa o ambiente local com API e gera `.screenshots/editor/` (comparação, sobreposição, sem pinturas e celular).

## Diferença intencional do conceito

A página esquerda usa a arte de Acessórios, já aprovada na aba Cartas (a mochila sobre fundo marrom), e não o fundo azul do conceito. Assim, a carta do editor é a mesma que os jogadores veem no detalhe.

## Pendências e observações

- **6.4:** falta a aprovação do usuário pela `.screenshots/editor/comparacao.png`.
- **Fora desta mudança:** a ficha viva soma Armadura e RDB de capacete, luvas e botas equipados (`ficha_viva.py`), o que contraria a spec `carga-em-grade`. O usuário iniciou uma tarefa à parte para isso.
- **Falhas anteriores a esta mudança:** em `test_preparar_arte.PrepararArteTest` (com as matrizes reais), `test_todas_as_saidas…` falha porque o `ESPERADO` não lista nenhuma peça das cartas, e `test_total_abaixo_de_6_mb` falha porque o total já passa de 6 MB. As peças do editor somam ~220 KB de um total de 8,9 MB.

## Verificação

- Testes focados durante o desenvolvimento: `test_catalogos`, `test_cartas`, `test_api_catalogos`, testes de migração e de ficha viva, Vitest do editor, do hook, do `ItemFormatEditor` e do inventário, e o e2e `editor-visual` e `cartas-visual`.
- **Suítes completas (7.2), em 2026-09-30:**
  - `tsc --noEmit` e `eslint .`: sem problemas.
  - Vitest (`vitest run src`): 91 arquivos, 692 testes, todos verdes.
  - E2E (`node e2e/run.mjs`): 84 testes verdes. A semente `e2e/screenshots.mjs` criava uma espada com `peso`, que agora é recusado; trocou-se por `tipo_dano`.
  - Python (`unittest discover`): 561 testes e 16 pulados, com **2 falhas anteriores a esta mudança**, as duas de `PrepararArteTest`, que usa as matrizes reais (ver "Pendências"). Por elas a 7.2 continua aberta: fechar exige atualizar o `ESPERADO` e o limite de tamanho, ou reduzir as pinturas das outras mudanças, o que é decisão do usuário.
