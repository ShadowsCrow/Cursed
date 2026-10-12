# Tarefas — redesenhar-aba-cartas

## 1. Regras

- [x] 1.1 Confirmar que nenhuma página de `rules/sistema` muda: esconder o Custo de Aprendizado e os Descansos Mínimos do jogador é regra de acesso da aplicação, e os valores, o ciclo de aprendizado e o framework continuam iguais. Registrar a conferência no `HANDOFF.md` (verificação: nota escrita; `git diff rules/` sem mudança desta mudança).

## 2. Servidor

- [x] 2.1 `card_lifecycle._visivel` com o papel: sem `custo_aprendizado`, `descansos_minimos` e `custo_legado` para quem não é Narrador, em `_instancia_resumo`, `_oferta_resumo` e `_apresentacao_resumo` (design D2) (verificação: testes de API — jogador sem as três chaves na lista da ficha, nas candidatas da oferta, na resposta da oferta, na transição e na apresentação; Narrador com as três; Potência de Uso, Custo de Uso e custos adicionais presentes para os dois; valores guardados inalterados depois de concluir o aprendizado).

## 3. Interface — base

- [x] 3.1 `custosDaCarta(tipo, conteudo, { narrador })` e `CardFace` com o papel. Ligar o papel em `OfferChooser`, `PresentationOverlay`, `NarratorLibrary`, `ConcederDialog` e na prévia do editor, que mostra a carta como o jogador a vê e ganha a nota (verificação: Vitest de `cardFormat` e dos consumidores — o jogador não vê as duas linhas nem com a chave presente; o Narrador vê "Não definido" quando o valor falta).
- [x] 3.2 `sheet/cartas/apresentacao.ts`: `origemDaCarta`, `categoriaDaCarta` (reaproveitando `categoriaDoItem`), `rotuloDaOrigem`, busca sem acento, ordem e contagens combinadas (design D5 e D6) (verificação: Vitest — classe, arquétipo, raça, oferta, concessão avulsa e exceção; item com subtipo, com categoria de Outros e sem formato; contagem de tipo depois da origem; busca "canalizacao"; as três ordens).
- [x] 3.3 Nome "Cartas": `SECTIONS`, `ResumoVisual.tsx` e testes que citam o nome antigo (`CharacterSheetPage`, `ResumoVisual`, `Lote1Revisao` e `Lote2Revisao`) (verificação: testes — a aba se chama "Cartas", e `?secao=habilidades` abre a aba).
- [x] 3.4 `ListaCategorias` com `titulo` e `rotuloTodos` opcionais, sem mudar o Inventário (verificação: `InventarioFicha.test.tsx` inalterado e verde; teste novo com os rótulos das cartas).

## 4. Interface — folha

- [x] 4.1 Moldura da carta em CSS com as volutas de canto em SVG (design D7.1 revisto: a moldura da referência não tem chanfro), medalhão SVG com quatro pontas para a faixa sem pintura, ícones de reserva de habilidade, magia e efeito, e a folha com cantos e flores do Resumo (verificação: teste — só pinturas e arte própria são `<img>`, e todo SVG é decorativo).
- [x] 4.2 `CartaDaFicha.tsx`: faixa, medalhão, tipo, título, texto em três linhas, custos por papel, pílula da origem, faixa inteira na ordem imagem própria → pintura da categoria → degradê com medalhão SVG, selo "v{n} disponível" para o Narrador e altura igual na linha (design D7) (verificação: Vitest cobre os cenários da spec "Carta ilustrada da ficha" — jogador, Narrador, item com foto, pinturas ausentes e texto longo).
- [x] 4.3 `FiltrosDasCartas.tsx`: barra de Origem e Tipo com contagem, combinação, "Limpar filtros" e fileiras no celular (design D5) (verificação: Vitest cobre os cenários da spec "Barra lateral de filtros das cartas").
- [x] 4.4 `DetalheDaCarta.tsx`: conteúdo inteiro, ações por papel, confirmação de remover, migrar e foco de volta na carta (design D8) (verificação: Vitest — iniciar, interromper e concluir aprendizado, migrar, remover, sem permissão sem botões, Enter abre e Esc devolve o foco).
- [x] 4.5 `CartasFicha.tsx` e `cartas.css`: cabeçalho, gravura com reserva em SVG, busca, ordem, "Conceder carta" para o Narrador, seções por estado, estado vazio, filtro sem resultado e anotações da ficha antiga (verificação: Vitest cobre os cenários das specs "Folha da aba Cartas", "Busca e ordem das cartas" e "Seções das cartas por estado").
- [x] 4.6 `CharacterSheetPage.tsx`: a aba usa `CartasFicha`, sem `MolduraSecao`. `CharacterCardsPanel` sai; os diálogos vão para `cards/dialogosDeCartas.tsx` e as tabelas de ações para `cards/acoesDeCartas.ts`; os testes do painel passam para `CartasFicha.test.tsx` e `CartasDeCatalogo.test.tsx` (verificação: `CharacterSheetPage.test.tsx` — "Cartas usa a folha própria"; o teste da moldura comum deixa de listar Cartas; os casos antigos do painel continuam cobertos).
- [x] 4.7 Larguras (design D10 revisto): quatro colunas com barra a partir de 1290 px de folha, fileiras abaixo de 780 px, até uma coluna no celular (verificação: `e2e/cartas-visual.spec.mjs` — sem rolagem horizontal, sem carta sobre a barra, sem texto vazando da carta e colunas esperadas em 1920, 1448, 1300, 1024, 768, 480, 375, 360 e 320 px).

- [x] 4.8 Rolagem própria da grade e altura igual das cartas (design D6a e D7, pedidos do usuário de 2026-09-29): a caixa das cartas rola dentro de si nas telas largas, com os títulos das seções presos no alto, a barra de filtros parada e rolagem pelo teclado; no celular, a grade rola com a página; toda carta tem a altura da referência (verificação: `cartas-visual.spec.mjs` — em 1448 × 900 a caixa rola e a página não precisa rolar para a barra seguir visível; o título fica preso; em 375 px não há rolagem interna; todas as cartas com 310 px ±5, inclusive o item sozinho na seção; axe sem violações com a caixa focável).

- [x] 4.9 Detalhe em grimório (design D8 revisto, aprovação do usuário em 2026-09-30): moldura com filigrana, livro em CSS com fechos em SVG, página da arte e do título, quadro de citação, quadros de dados em duas colunas com ícones, ações no pé da página direita, página única no celular e a cena de fundo opcional (verificação: `CartasFicha.test.tsx` cobre os cenários "Grimório de uma habilidade" e os quadros por papel e por tipo, e as ações continuam cobertas; `cartas-visual.spec.mjs` mede o grimório em 1448 px, sem rolagem horizontal em 375 e 320 px e com axe sem violações; comparação lado a lado com `referencia/detalhe-grimorio.png` pelo `fidelidade-cartas.mjs`).

- [x] 4.10 Ajuste automático das imagens de itens e cartas (pedido do usuário, 2026-09-30): apaga o fundo liso ligado às bordas e recorta a sobra em volta do objeto (`assets/recorteDeImagem.ts`, `ImagemAjustada`). Vale na célula da bolsa, no painel do item, na faixa da carta e no quadro da arte do grimório; imagens sem fundo liso ficam como estão (verificação: `recorteDeImagem.test.ts` — espada sobre fundo branco, miolo de anel preservado, fundo transparente, cena e imagem só de fundo; suítes da bolsa, das cartas e e2e `ficha-visual` e `cartas-visual` verdes; capturas na página oficial).

## 5. Arte

- [x] 5.1 Prompts em `arte/prompts.md`: gravura do cabeçalho e uma faixa por categoria (habilidades, magias, efeitos e cada categoria de item), cada faixa com a cena e o medalhão com o emblema pintados no centro, na mesma posição e tamanho, todas da mesma conversa, com a referência anexada (verificação: prompts escritos e entregues ao usuário).
- [x] 5.2 `ARTES_DAS_CARTAS` e `preparar_arte_das_cartas` no `preparar_arte.py`, em `public/arte/cartas/`: gravura multiplicada sobre o papel, uma faixa por categoria em 1024 × 304, sem recorte (verificação: `test_preparar_arte.py` — nada sem matrizes; uma saída por categoria do catálogo; tamanhos; sem canal alfa).
- [x] 5.3 `pinturasDasCartas.ts`: pré-carregamento por faixa de categoria e da gravura, cache da sessão e reserva de espaço (verificação: Vitest com `Image` simulado — carregando, prontas, ausentes e a faixa de uma categoria faltando sem afetar as outras; e2e mede `layout-shift` zero ao abrir a aba).
- [x] 5.5 Prompt do grimório pintado (`cartas-detalhe-livro`: o conceito com as páginas em branco) em `arte/prompts.md`, com preparo no `preparar_arte.py` na proporção do diálogo (verificação: prompt escrito; `test_preparar_arte.py` com o tamanho 1600 × 906).
- [x] 5.4 Integrar as pinturas geradas pelo usuário, calibrando o enquadramento da faixa, o véu e a posição do medalhão pintado (verificação: capturas com as pinturas e **aprovação do usuário**).
  - 2026-10-01: aprovado pelo usuário ("tudo aprovado").

## 6. Fidelidade à referência

- [x] 6.1 Prévia `/preview/ficha?secao=cartas&cartas=referencia` (e `papel=narrador`): a API de demonstração devolve as dez habilidades da imagem, mais duas armas e uma magia da raça (verificação: e2e confere as dez cartas, a pílula "Classe: Especialista de Combate - automática" e os quatro custos só na visão do Narrador).
- [x] 6.2 `e2e/fidelidade-cartas.mjs`: captura em 1448 × 1086 e gera em `.screenshots/cartas/` a comparação empilhada, a sobreposição a 50% e a sobreposição da carta isolada, com e sem pinturas (`--sem-pinturas`) (verificação: o script gera os arquivos; rodada registrada no `HANDOFF.md`).
- [x] 6.3 Asserções de medida no e2e (design D4 revisto; a carta não escala com a folha): carta de 266 × 310 (±4 e ±5), faixa de 79 ±3, aro do medalhão de 67 ±4 centrado na faixa, 13 px entre colunas ±3 e pílula a 11 px do pé ±3 (verificação: `cartas-visual.spec.mjs` verde).
- [x] 6.4 **Aprovação do usuário** com a comparação lado a lado, sem pinturas e com pinturas, registrada no `HANDOFF.md`, incluindo o grimório do detalhe.
  - 2026-10-01: aprovado pelo usuário ("tudo aprovado").

## 7. Verificação

- [x] 7.1 Suítes completas, uma vez no fim, todas verdes:
  - frontend: `npm run lint`, `npm run typecheck`, `npm test` e `npm run check:client`;
  - backend: `python -m unittest discover -s cursed_platform/tests -t .` e os testes de API;
  - `export_openapi --check`;
  - e2e: `node e2e/run.mjs`.
  - 2026-10-01, uma vez no fim, com a árvore de todas as mudanças: backend 562 testes OK (16 pulados); `npm test` 91 arquivos e 692 testes; `lint`, `typecheck`, `check:client` (cliente regenerado) e `export_openapi --check` sem erros; e2e `node e2e/run.mjs` 84 testes. Para fechar: `test_preparar_arte` passou a conferir as peças da aba Cartas e do editor, com orçamento próprio de 4 MB para elas (6 MB para o resto), e `Libraries.test.tsx` simula a validação do editor aberto pelo grimório.
- [x] 7.2 Acessibilidade: axe sem violações na folha, na barra e no detalhe, no Vitest e no e2e; cada carta anunciada com tipo, título e origem; filtros com `aria-pressed`; ornamentos ocultos (verificação: testes da folha e `cartas-visual.spec.mjs`).
- [x] 7.3 `HANDOFF.md` da mudança com estado, decisões do usuário e cuidados da árvore misturada; `AGENTS.md` citando a mudança ativa (verificação: arquivos escritos).
