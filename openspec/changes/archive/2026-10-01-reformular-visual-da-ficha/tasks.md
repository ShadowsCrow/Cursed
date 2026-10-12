# Tarefas — reformular-visual-da-ficha

## 1. Regras

- [x] 1.1 Em `rules/sistema/Carga.md`, seção Moedas: moedas de três tipos (cobre, prata e ouro), sem outras mudanças no texto. Registrar no `HANDOFF.md` da mudança a decisão do usuário (2026-09-28) e que raridade e categoria não entram no livro, porque não têm efeito mecânico (verificação: `git diff rules/` mostra só essa frase; busca por "platina" em `rules/` sem resultados).

## 2. Dados do sistema

- [x] 2.1 Criar `cursed_platform/catalogos/itens.json`:
  - raridades Comum, Incomum, Raro, Épico e Lendário, com `id`, `rotulo` e `cor`;
  - categorias com `id`, `rotulo`, `icone` e `subtipos`, ou `escolha_em_outros`, e `padrao_outros` em Diversos;
  - registro no `manifesto.json` como catálogo novo.

  Verificação: teste do manifesto verde.
- [x] 2.2 `catalogos.py` lê e valida `itens.json`: ids únicos, cor hexadecimal, todo subtipo exceto `outro` coberto por exatamente uma categoria, e exatamente uma categoria `padrao_outros`. Verificação: `test_catalogos.py` com casos válidos e inválidos (id repetido, subtipo sem categoria ou em duas, dois padrões, cor inválida).
- [x] 2.3 Tirar a platina de `fixtures/grade/casos.json` (verificação: os testes de domínio e de frontend que consomem as fixtures continuam verdes).

## 3. Servidor

- [x] 3.1 `domain/grade.py`: `TIPOS_MOEDA = ("cobre", "prata", "ouro")`, com a divisão em pilhas e os rótulos sem platina. Verificação: `test_grade.py` atualizado (pilhas mistas sem platina, 147 moedas em 2 células).
- [x] 3.2 `contracts.py`:
  - moedas sem `platina` (pedido com platina recusado com 422);
  - `ConteudoItem` com `raridade` (padrão `comum`) e `categoria` (obrigatória só em `outro`, proibida nos demais);
  - `ItemInventarioResumo` com `raridade`, `categoria` e `descricao` já resolvidos.

  Verificação: testes de contrato para cada caso, incluindo uma espada com `categoria` enviada, que é recusada.
- [x] 3.3 `cartas.py`: validação da raridade e da categoria contra o catálogo ao salvar e publicar a carta de item. `cartas_ciclo.py`: concessão copia `raridade`, `categoria` e `texto → descricao` para `item.dados`. Verificação: `test_api_cartas` concede a "Chave de Ferro" (Incomum, Chaves) e confere as etiquetas e a descrição no inventário.
- [x] 3.4 Definição de formato de item existente (`inventario_grade.py`/`ficha_viva.py`) aceita e valida `raridade` e `categoria`. Verificação: `test_api_inventario_grade.py` define o formato de um item Outros com categoria Materiais e recusa uma categoria fora do catálogo.
- [x] 3.5 Endpoint de catálogo expõe raridades e categorias (verificação: `test_api_catalogos.py` confere as listas na resposta).
- [x] 3.6 Aviso da platina:
  - a marca `inventario.platina_retirada` vira aviso para o Narrador em `validacao_ficha.py`;
  - a confirmação do Narrador limpa a marca (`policies.py`, como `nivel_pela_migracao`);
  - o jogador não pode limpá-la.

  Verificação: testes do aviso, da limpeza pelo Narrador e da recusa ao jogador.
- [x] 3.7 Regenerar OpenAPI e cliente (`python -m cursed_platform.export_openapi`, `npm run generate:client`). Verificação: `export_openapi --check` e `npm run check:client` verdes.

## 4. Migração

- [x] 4.1 Revisão Alembic `0019_moedas_raridade_categoria`, conforme D7 do design:
  - retira a platina das pilhas e apaga a pilha que zerar;
  - renomeia as pilhas restantes;
  - grava um evento de auditoria e a marca por personagem afetado;
  - preenche raridade Comum e categoria Diversos nos itens Outros;
  - copia a descrição das cartas de origem;
  - tem um `downgrade` que restaura a estrutura.

  Verificação: teste de migração com pilha mista (10 ouro + 5 platina), pilha só de platina (some), personagem sem platina (sem evento), item antigo sem raridade e item concedido de carta; `downgrade` seguido de `upgrade` sem erro.
- [x] 4.2 Aplicar a `0019` e a `0020` (apresentação vista uma vez) no Supabase de testes, como na `0018` (verificação: `list_migrations` mostra as duas; consulta sem nenhuma pilha com a chave `platina`; `card_presentations` com a coluna `vistas`).

## 5. Interface — dados

- [x] 5.1 Moedas em três tipos em `gridEngine.ts`, `CoinPurse.tsx` e `InventoryPrototype.tsx` (verificação: `CoinPurse.test.tsx` e `gridEngine.test.ts` atualizados e verdes; busca por "platina" em `platform/frontend/src` sem resultados fora do cliente gerado antigo).
- [x] 5.2 `ItemFormatEditor.tsx` e `CardEditor.tsx`: seletor de raridade em todo item e de categoria só no tipo Outros, lidos do catálogo. Verificação: `ItemFormatEditor.test.tsx` mostra a categoria só em Outros e envia raridade e categoria.
- [x] 5.3 `InventoryGridPanel.tsx` resolve `icone_grade`, com `imagem_ativo` como reserva, via `useAssetImage` e passa `icones` à grade. Verificação: `InventoryGridPanel.test.tsx` confere o `<img>` do ícone na célula do item.
- [x] 5.4 `InventoryGrid.tsx`:
  - seleção controlada opcional (`selecionadoId`/`onSelecionar`);
  - prop `destaque` (ids em destaque, com o resto esmaecido);
  - selo de quantidade;
  - área vermelha com alerta;
  - sem o botão "Mover pelo teclado" (Enter ou Espaço no item inicia o movimento, com dica em `aria-describedby`).

  Verificação:
  - `InventoryGrid.test.tsx` cobre o modo controlado e o não controlado;
  - itens esmaecidos continuam clicáveis e focáveis;
  - o movimento por teclado funciona sem o botão.
- [x] 5.5 Seletores puros em `inventario/filtro.ts`: categoria efetiva por item, contagem por categoria e correspondência de busca sem diferenciar acento e maiúsculas. Verificação: Vitest com "poç" encontrando "Poção", contagem com moedas e item sem categoria tratado como Diversos.

## 5A. Prova visual

- [x] 5A.1 Página estática `/preview/ficha-inventario` com um personagem de exemplo e seletor de Tamanho, Força e mochila. Ela monta cabeçalho, faixa, abas, moldura da seção e o Inventário completo (bolsa em camadas, indicadores, painel, categorias e moedas) com fallbacks em CSS no lugar das artes. Verificação:
  - teste de renderização da página;
  - capturas da matriz Minúsculo F1, Médio F3, Grande com mochila e Colossal F5 com mochila, em 1440, 1280, 768 e 375 px, sem rolagem horizontal da página;
  - comparação lado a lado com a referência na disposição dos blocos;
  - **aprovação do usuário**, registrada no `HANDOFF.md`.

## 6. Interface — cabeçalho, faixa, abas e moldura

- [x] 6.1 Molduras do cabeçalho reaproveitando a `MolduraOrnamentada` já aprovada (painel vazio sobre a cena e quadro noturno nos recursos), moldura dourada do retrato em CSS e ícones das dez seções em `MolduraSecao.tsx`, todos `aria-hidden`. Verificação: teste de que os ornamentos não aparecem na árvore de acessibilidade.
- [x] 6.2 `SheetHeader.tsx` e `ResourcesStatus.tsx` no novo cabeçalho, com fundo ilustrado e fallback liso, e troca e remoção do retrato mantidas. Verificação:
  - `SheetHeader.test.tsx` confere nome, classe · raça, etiquetas, PV/PP com máximo, e as ações de retrato só para quem edita;
  - captura com a imagem de fundo bloqueada.
- [x] 6.3 `ActiveStateStrip.tsx` com placas e ícones, Esforço destacado e "Nenhum" sem efeitos. Verificação: teste do texto da faixa ("5/10", "Pressionado", "Nenhum").
- [x] 6.4 Barra de abas com ícone e nome, placa dourada na ativa, rolagem interna e aba ativa trazida à vista. Verificação:
  - `CharacterSheetPage.test.tsx` mantém a navegação por setas e confere a chamada de `scrollIntoView` ao trocar de aba;
  - captura em 375 px sem rolagem da página.
- [x] 6.5 Componente `MolduraSecao` (ícone, título, subtítulo, ferramentas) aplicado às nove seções, com o título migrado para a moldura sem perder o conteúdo. Verificação: os testes existentes de cada seção continuam verdes e os títulos das seções aparecem uma única vez.

## 7. Interface — Inventário

- [x] 7.1 Componente `InventarioFicha`:
  - dono da seleção, do filtro e da busca;
  - disposição larga, intermediária e estreita por container query, com a classe de faixa calculada pelas colunas;
  - ferramentas da seção (busca e "Importar código").

  Verificação: teste de que selecionar na grade abre o painel e de que a busca anuncia a contagem; capturas das três disposições.
- [x] 7.2 Bolsa em camadas (couro, `molduras/bolsa.svg` em 9 fatias, alça em três partes, peças nos cantos com larguras mínimas) e a placa de indicadores dentro ou acima da bolsa. Verificação: capturas da matriz sem peças sobre células; nenhuma imagem quebrada sem as artes.
- [x] 7.3 Célula por `clamp` com container query e rolagem interna com fade quando a grade não cabe. Verificação:
  - teste e2e de que 8 colunas cabem em 400 px sem rolagem;
  - o arraste solta na célula certa com a área rolada;
  - Colossal F5 com mochila em 375 px rola só dentro da bolsa.
- [x] 7.4 Indicadores: capacidade com barra, mãos e estado escrito ("Normal", ou "Sobrecarga · N na área vermelha"), sem nenhum peso. Verificação: teste do texto em estado normal e em sobrecarga; busca por "kg" e "peso" na aba sem resultados.
- [x] 7.5 Painel "Item selecionado":
  - conteúdo: imagem, nome, etiquetas de raridade e categoria, detalhes, descrição e efeitos em texto;
  - ações nesta ordem: Equipar/Desequipar, Empunhar, Girar, Largar no chão, Remover da grade, Oferecer;
  - envio de arte e ícone para quem edita;
  - sem ações em modo de leitura;
  - estado vazio.

  Verificação:
  - teste do cenário da poção (3 unidades, Comum, Consumíveis, sem botão de usar);
  - "Remover da grade" leva o item para "Fora da grade";
  - a ficha só de leitura mostra o painel sem ações.
- [x] 7.6 Lista de categorias com contagem e "Todos", que viram fileira na disposição intermediária e estreita. Escolher uma categoria destaca e esmaece sem mover. Verificação: teste do cenário "Armas" (adaga destacada, aljava esmaecida no mesmo lugar, anúncio "1 item em Armas").
- [x] 7.7 Barra de moedas com cobre, prata e ouro, ícones, totais e acesso ao editor de totais; saco de moedas decorativo. Verificação: teste com 24 de ouro, 17 de prata e 3 de cobre; o editor abre só para quem edita.
- [x] 7.8 "Fora da grade", "Sem dimensão" e ofertas com o acabamento da seção. Verificação: os testes existentes de `InventoryGridPanel` e `ItemOffers` continuam verdes.
- [x] 7.9 Desenhos SVG padrão dos doze subtipos (os onze do motor mais `criatura`) em `inventario/iconesItem.tsx`. Verificação: um item sem imagem de cada subtipo renderiza o desenho, com o nome em `aria-label` e `title`.
- [x] 7.10 Cores de raridade com contraste. Verificação: teste automatizado confere 4,5:1 entre o texto e o fundo de cada etiqueta de raridade do catálogo.

## 8. Artes

- [x] 8.1 Prompts em `arte/prompts.md` da mudança para textura de couro que se repete, mapa enrolado, tecido vermelho e saco de moedas, e entradas no `preparar_arte.py` (saída em `public/arte/inventario/`), já ligadas no CSS. A alça, a fivela e o pingente ficaram em CSS/SVG. Verificação: prompts escritos; `test_preparar_arte.py` gera os WebP (couro sem emenda, peças sem fundo) quando as matrizes estão em `arte-original/`.
- [x] 8.3 Laterais pintadas, como um lanche (D1, item 4; pedido do usuário em 2026-09-29): prompts das duas laterais em `arte/prompts.md`; o `preparar_arte.py` apaga o fundo, recorta rente ao objeto, detecta o miolo só de couro e gera topo, miolo sem emenda e base de cada lado; a bolsa monta as laterais com o miolo repetido e volta à alça em CSS sem as pinturas; saem as peças soltas (mapa, tecido e saco de moedas). Verificação: `test_preparar_arte.py` (três partes, miolo sem emenda e sem objetos); teste de componente (sem pinturas, alça em CSS; com pinturas, as laterais); e2e `ficha-visual` (laterais da altura da bolsa, sem cobrir células, nas quatro larguras).
- [x] 8.4 Tampa e base pintadas (D1, item 5; pedido do usuário em 2026-09-29): prompts em `arte/prompts.md`; o `preparar_arte.py` gera a tampa sem fundo e a base em ponta esquerda, miolo sem emenda na horizontal e ponta direita; a bolsa reserva a altura da tampa e da base, carrega esse grupo à parte das laterais e fica com a costura em SVG sem ele. Verificação: `test_preparar_arte.py` (tampa recortada; três partes da base, miolo sem emenda); teste de componente (sem pinturas, nada; com elas, tampa e base); e2e `ficha-visual` (tampa e base sem cobrir células nem a placa, sem rolagem, nas seis grades de teste).
- [x] 8.2 Trocar os fallbacks pelas artes geradas pelo usuário. Verificação: capturas da matriz com as artes; **aprovação do usuário** registrada no `HANDOFF.md`.

## 9. Verificação final

- [x] 9.1 Suítes completas verdes: backend (`unittest`, 505 testes), `npm test` (545), `npm run typecheck`, `npm run lint`, `npm run check:client`, `export_openapi --check` e e2e completa (`node e2e/run.mjs`, 22 testes, com os 5 novos de `ficha-visual.spec.mjs`). Verificação: execuções de 2026-09-28 registradas no `HANDOFF.md`.
- [x] 9.2 Capturas finais da ficha real no ambiente local:
  - as quatro grades da matriz nas quatro larguras;
  - cabeçalho e abas em 360 px;
  - Atributos e Perícias com a moldura nova.

  Verificação: capturas em `.screenshots/visual-da-ficha/`, sem rolagem horizontal da página, e **aprovação do usuário** registrada no `HANDOFF.md`.
