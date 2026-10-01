# Passagem de trabalho — reformular-visual-da-ficha

## O que a mudança faz

Classificação: **núcleo**. É quase toda interface: cabeçalho, faixa de estado, abas e moldura da ficha, mais o Inventário numa bolsa de couro segundo a imagem de referência do usuário. Traz três mudanças de conteúdo:
- **raridade** do item (só etiqueta);
- **categoria** do item (organização e filtro);
- **moedas em três tipos**, sem platina.

## Decisões do usuário (2026-09-28; não reabrir sem pedir)

1. **Sem peso:** no lugar de "Peso total kg", mostrar o estado da carga.
2. **Área vermelha:** hachurada com alerta, sem cadeado.
3. **Sem "Usar item":** ações de consumir virão no futuro, numa mudança própria. O botão principal é Equipar/Desequipar e os efeitos aparecem só em texto.
4. **Raridade:** Comum, Incomum, Raro, Épico e Lendário, definida na criação, só etiqueta e cor, em JSON. Itens existentes viram Comum.
5. **Categorias:**
   - Armas, Armaduras, Escudos e Acessórios saem do tipo;
   - nos itens Outros, o Narrador escolhe entre Consumíveis, Materiais, Chaves, Itens de Missão e Diversos (JSON);
   - o filtro e a busca destacam e esmaecem, sem esconder.
6. **Sem "Ordenar por".**
7. **Moedas em três tipos (cobre, prata, ouro):** a platina sai.
   - As fichas com platina perdem essas moedas, com registro no histórico e aviso ao Narrador.
   - Não há conversão.
8. **Ações do item:**
   - Equipar/Desequipar, Girar, **Largar no chão** (nome mantido; o usuário recusou "Descartar"), Remover da grade (antes "Tirar da grade") e Oferecer;
   - sem botão Mover, porque mover é manual.
9. **Escopo:** cabeçalho, faixa, abas e moldura em todas as seções; redesenho completo só do Inventário.

## Decisões tomadas na implementação

- **Categoria "Criaturas":** criada para o subtipo `criatura` dos corpos carregados. Ela não estava na lista do usuário, mas todo item precisa de uma categoria. É fácil trocar no `itens.json`.
- Os testes do backend usam `unittest` (`.venv/Scripts/python.exe -m unittest`), não `pytest`.

## Regras

- `rules/sistema/Carga.md`, seção Moedas: "três tipos: cobre, prata e ouro". É a única mudança no livro.
- Raridade e categoria **não** entram no livro, porque não têm efeito mecânico. Ficam só no catálogo da plataforma.

## Cuidados

- **Árvore de trabalho misturada:** a branch `feature/retrato-refinamento` tem alterações sem commit de outro pedido (atributos e perícias lado a lado: `AttributeTable.tsx` e `preview.css`). Os commits precisam ser separados.
- Após mudar a API, rodar `.venv/Scripts/python.exe -m cursed_platform.export_openapi` e `npm run generate:client` (em `platform/frontend`).
- Molduras só em SVG/CSS, na técnica do Resumo. Pinturas só como ilustração.
- Marcar `[x]` só com o comportamento implementado **e verificado por testes**.

## Estado (2026-09-29)

**40 de 40 tarefas concluídas e verificadas.** Pronta para arquivar.

- **Aprovação do usuário (2026-09-29):** "Aprovado" para o visual da ficha e as pinturas da bolsa (5A.1 e 8.2), e "ok" para as capturas finais (9.2).
- **4.2, Supabase de testes:** aplicada em 2026-09-29, com autorização do usuário, pelo conector MCP no projeto `cursed` (`wvfrwmplruhwfkmwjtvl`).
  - **Antes:** `alembic_version = 0018_perfil_e_campanha`, e as tabelas que a `0019` converte (`inventory_items`, `scene_stash_items`, `characters`, `character_cards`) estavam vazias. A parte de dados da `0019` não tinha o que mudar.
  - **Aplicado numa transação:** o DDL da `0020` (`card_presentations.vistas json not null default '[]'`) e `alembic_version` passando para `0020_apresentacao_vista`.
  - **Verificado:** versão `0020_apresentacao_vista`; coluna `json NOT NULL DEFAULT '[]'::json`; nenhuma pilha com a chave `platina`; RLS ligado em `card_presentations`, sem privilégios para `anon` e `authenticated`.
  - O projeto não usa o registro de migrações do Supabase (`list_migrations` vazio); o controle é o `alembic_version`, como na `0018`.
- **9.2, capturas da ficha real:** feitas no ambiente local (5181), no personagem "Lion" da mesa "Silent Bill", vista pelo Narrador. Ficam em `.screenshots/visual-da-ficha/real/`: Inventário em 1440, 1280, 768 e 375; cabeçalho e abas em 360 (na aba Atributos, porque o Resumo usa um quadro próprio no lugar do cabeçalho); Atributos e Perícias em 1440. Nenhuma tem rolagem horizontal, e as quatro pinturas da bolsa carregaram.
  - A matriz das quatro grades (Minúsculo F1, Médio F3, Grande com mochila, Colossal F5 com mochila) vem da prévia `/preview/ficha` (`e2e/capturas-ficha.mjs`), que usa os mesmos componentes. O ambiente local não tem personagens desses tamanhos, e criá-los pelo fluxo de criação só para as capturas não compensava.
- **Técnicas reaproveitáveis:** documentadas em `docs/tecnicas-visuais.md`.
- **Commits (decisão do usuário, 2026-09-29): esperar as outras sessões.** Quatro sessões paralelas trabalhavam na mesma árvore: `redesenhar-informacoes-basicas`, `redesenhar-aba-atributos`, `redesenhar-aba-pericias` e `reformular-personalidade-da-ficha`. Os arquivos compartilhados misturam as edições (`CharacterSheetPage.tsx`, `AttributeTable.tsx`, `main.tsx`, `playwright.config.mjs` e os testes da página da ficha). Quando as quatro terminarem:
  - fazer um commit por mudança;
  - separar em commits próprios os pedidos anteriores (Atributos e Perícias lado a lado: `attribute-table__grupos` em `preview.css`; faixa "Modo dev" removida em `DevApp.tsx`);
  - não versionar `.claude/`, `.agents/skills/` (fora das `openspec-*`), `.screenshots/` nem `arte-original/`.
- **Suítes completas em 2026-09-29, com a árvore de todas as sessões:** backend 521 (16 pulados), `npm test` 571, lint, typecheck, `check:client`, `export_openapi --check` e e2e completa 41. Na primeira execução, a e2e acabou com código 1 sem nenhum teste falho; na segunda passou limpa.

## Verificação (2026-09-28)

- Backend: `.venv/Scripts/python.exe -m unittest discover -s cursed_platform/tests -t .` → 505 testes, OK (16 pulados). `export_openapi --check` → atualizado.
- Frontend: `npm test` → 76 arquivos, 545 testes. `typecheck`, `lint` e `check:client` → sem erros.
- e2e: `node e2e/run.mjs` → 22 testes (os 17 da plataforma e os 5 novos de `ficha-visual.spec.mjs`).

## Ajuste pedido depois da prova (2026-09-28)

O usuário pediu um criador de itens em que desse para enviar as duas imagens:
- **Seção "Imagens do item" no formato:**
  - "Foto do item" (arte da carta) e "Ícone na bolsa", lado a lado, cada um com sua prévia;
  - o ícone mostra a proporção pedida, por exemplo 1 × 4 → 256 × 1024 px;
  - saiu o campo de texto com o caminho do ícone.
- **Envio que antes falhava:** o `ImageUpload` ganhou `prepararEnvio`, e o editor salva o rascunho antes de enviar. O servidor recusava o ícone quando o formato recém-escolhido ainda não estava salvo.
- **Foto no item concedido:** a concessão leva a arte da carta para `imagem_ativo` do item, a foto do painel "Item selecionado". A `0019` preenche o mesmo nos itens já concedidos.
- **Nomes iguais na ficha:** o painel do item usa os mesmos nomes ("foto do item", "ícone da bolsa").
- **Testes:** `CardEditor.test.tsx` (ordem rascunho → ícone), `test_cartas` (arte → foto) e `test_migracao_moedas_raridade` (preenchimento).
- **Foto dentro do quadro da carta:** a arte da carta (a foto do item) passou a ocupar o quadro de arte do `ContentCard`, no lugar do emblema. Antes ela aparecia solta, acima da carta. Os envios do editor também atualizam a lista "Suas cartas", porque reabrir a carta mostrava o rascunho antigo, sem a foto.

## Correção de defeito relatado no teste (2026-09-28)

**Apresentação de carta reaparecia a cada recarga.** Fechar a carta só a escondia na memória da página. A apresentação fica ativa até o Narrador recolher, então voltava ao recarregar. A correção:
- **Dados:** coluna `card_presentations.vistas`, na migração `0020_apresentacao_vista`.
- **Rota nova:** `POST /mesas/{m}/apresentacoes/{id}/visualizacao`, chamada quando o participante fecha a carta.
- **Lista do jogador:** não traz as cartas que ele já viu.
- **Narrador:** vê a apresentação até recolher, com `vista_por`.
- **Spec:** delta de `cartas-de-conteudo`.
- **Testes:** `test_cartas`, testes da migração e `Libraries.test.tsx`.
- **Pendente:** a `0020` também precisa ir para o Supabase de testes (tarefa 4.2).

**Tela "piscava" a cada ação no Inventário.** Durante a gravação (debounce de 500 ms e resposta do servidor), a linha "Guardando…" era inserida no topo da aba e empurrava a bolsa uns 24 px para baixo; depois sumia e a bolsa voltava. A correção:
- **Espaço reservado:** o estado da gravação fica num espaço de tamanho fixo ao lado da busca (`.inventario-ficha__estado`). O texto troca sem mover nada, e os erros continuam no corpo da aba.
- **Prévia mais realista:** a API de demonstração passou a responder às gravações com 250 ms de demora.
- **Teste:** e2e "gravar uma ação do inventário não faz a tela saltar", que mede a posição da bolsa e os deslocamentos de layout.

## Laterais pintadas, como um lanche (2026-09-29)

O usuário reprovou as peças soltas (mapa, tecido e saco de moedas presos aos cantos) e pediu a grade entre duas imagens laterais que crescem com ela. Decisões dele: laterais de couro da bolsa; o mapa, o tecido e o saco de moedas passam a fazer parte das próprias pinturas; no celular, laterais mais finas. Registrado no design (D1, item 4, e D9) e nas specs.

- **Pinturas:** `inventario-lado-esquerdo.png` (tira à direita, mapa no alto e tecido embaixo, saindo para a esquerda) e `inventario-lado-direito.png` (tira à esquerda, fivela da alça no alto e saco de moedas embaixo). Prompts em `arte/prompts.md`.
- **Preparo (`preparar_arte.py`):**
  - `preparar_lateral` apaga o fundo, medido no canto de cima oposto à tira, e recorta rente ao objeto, com 320 px de largura.
  - `achar_miolo` encontra a faixa mais longa em que só aparece a tira (a menor largura por linha). Recusa a pintura com `ValueError` quando o terço do meio tem objetos.
  - `dividir_lateral` gera o topo, o miolo sem emenda na vertical e a base.
- **Tela:**
  - `lateraisPintadas.ts` pré-carrega as seis partes. Só com todas carregadas a `Bolsa` troca a alça, a fivela e o pingente em CSS pelas laterais, e a troca vale para a sessão inteira.
  - Cada lateral é uma coluna com o topo e a base em `<img>` e o miolo com `background-repeat: no-repeat round`.
  - `--lado` e `--lado-sobre` controlam a largura e quanto fica por cima da borda. No computador, o espaço de fora é reservado e entra na conta da célula.
  - No celular (seção com menos de 34rem), as laterais têm 2.3rem e não reservam espaço: a grade de 8 colunas precisa caber em 400 px, e elas avançam pela margem da moldura.
- **Removido:** as peças `bolsa__peca--mapa/--tecido`, o `barra-moedas__saco` e seus WebP em `public/arte/inventario/`. O `inventario-couro.webp` continua.
- **Testes:**
  - `test_preparar_arte` (17): três partes, recorte rente, miolo só com a tira, repetição sem emenda, emenda com o topo e recusa de objetos no meio.
  - `InventarioFicha.test.tsx`: alça sem as pinturas e laterais com elas.
  - `ficha-visual` (12): 6 casos novos, da grade 2 × 3 à Colossal, de 375 a 1440 px. Laterais da altura da bolsa, sem cobrir células, sem rolagem. Usam a lateral sintética de `e2e/fixtures/laterais/`, servida no lugar das pinturas.
- **Pinturas reais (2026-09-29):**
  - Nas duas, a tira encosta no alto e no pé da imagem, e o tecido corre atrás dela de cima a baixo. A detecção automática do miolo errou: pegou a ponta de cima na direita e incluiria a fivela de baixo na esquerda.
  - Por isso, `LADOS_DO_INVENTARIO` passou a aceitar a faixa do miolo em frações da altura: esquerda `(.405, .515)`, entre o mapa e a fivela de baixo; direita `(.335, .495)`, entre a fivela da alça e a argola do saco.
  - Os miolos saíram com 75 e 117 px. A franja do tecido repetida forma um serrilhado regular ao lado da tira. O `prompts.md` agora pede o miolo sem tecido.
  - Calibragem no computador: `--lado: 7.2rem` e `--lado-sobre: 2.65rem`.
- **Sem salto ao carregar:** enquanto as seis partes carregam, a bolsa já tem a classe `bolsa--lateral` e reserva o espaço, sem desenhar nada. Só um erro de carregamento traz a alça de volta. Os `<img>` do topo e da base recebem `width` e `height` naturais, lidos no pré-carregamento.
- **"(girado)" só em item não quadrado:** o painel estreitou com as laterais, e girar a poção 1 × 1 quebrava a linha Tamanho. O painel crescia 22 px e depois voltava (o e2e "não faz a tela saltar" pegou).

## Tampa e base pintadas (2026-09-29)

Depois de ver as laterais, o usuário pediu arte também no alto e no pé. Escolheu a tampa aberta centralizada no alto e a base de couro que estica embaixo. Registrado no design (D1, item 5), na spec e na tarefa 8.4.

- **Preparo:**
  - `preparar_tampa` gera a tampa sem fundo e rente ao objeto, com 640 px de largura.
  - `preparar_base` reaproveita a divisão das laterais com a pintura girada 90°: ponta esquerda, miolo sem emenda na horizontal e ponta direita, com 160 px de altura.
  - `MIOLO_DA_BASE` aceita a faixa do miolo em frações da largura, ou `None` para detectar. `recortar_objeto` passou a ser comum às três.
- **Carregamento:** `pinturasDaBolsa.ts`, que substitui o antigo `lateraisPintadas.ts`, carrega dois grupos independentes: laterais; tampa e base. Cada grupo reserva o espaço enquanto carrega e volta ao desenho em SVG/CSS só se falhar.
- **Tampa:** `<img class="bolsa__tampa">` fica atrás da bolsa (`z-index: -1`; a bolsa não cria contexto de empilhamento).
  - Tem altura fixa: `--tampa-visivel` (4.2rem) mais `--tampa-dentro` (4rem, escondidos atrás da bolsa). Tem limite de 80% da largura e `object-fit: contain`, ancorada embaixo.
  - Com a pintura real (arco largo), 1rem para dentro deixava a tampa com um quarto da largura da bolsa. Esconder a parte de baixo do arco atrás da bolsa a alarga sem ocupar mais altura. O e2e confere o `z-index` negativo e que ela termina acima das células.
  - A coluna reserva `--tampa-visivel` em cima.
- **Base:** `.bolsa__base` é um grid de três colunas, com `grid-template-rows: minmax(0, 1fr)`. Sem isso, os `<img>` com `height: 100%` voltavam ao tamanho natural e vazavam.
  - Fica sob as laterais e metade para fora da bolsa (`--base-altura` de 2.6rem), sem cobrir células. A coluna reserva a parte de fora.
- **Celular:** tampa com 2.6rem visíveis (e 2.4rem atrás da bolsa) e base com 1.8rem.
- **Pinturas reais:** a tampa (arco com fecho) veio limpa.
- **Base refeita (2026-09-29):** o usuário achou "meio feia" a primeira base, uma faixa com cantoneiras de latão. Ela virou o fundo de um saco de couro aberto, com o pano vinho das laterais caindo perto das pontas; o prompt 5 foi reescrito. A detecção automática do miolo funcionou (`MIOLO_DA_BASE = None`). Ajustes:
  - **Posição:** a pedido do usuário, a base estica até as pontas ficarem atrás das ponteiras de latão do pé das laterais. O cálculo é `left/right: calc(var(--lado-sobre) - var(--base-recuo))`, com recuo de 2.9rem no computador e .9rem no celular. O pano cai logo abaixo delas. Começando no fim da tira, ela parecia solta; ocupando toda a largura da bolsa, as laterais escondiam o pano.
  - **Altura:** `--base-altura` de 7rem, com `--base-fora` de 5.7rem para fora. No celular, 4.2rem e 3.4rem. Só o acolchoado de baixo fica dentro da bolsa. Com isso, `ALTURA_BASE` passou para 240 px.
  - **Borda de cima:** esmaece no couro da bolsa por uma máscara em cada parte. Com a máscara na base inteira, a sombra embaixo saía cortada reta.
  - **Pano cortado:** na pintura, o pano encostava nas laterais da imagem e saía cortado reto. `esmaecer_bordas_cortadas` esmaece o lado em que o objeto tocava a borda da pintura (testado em `TampaEBaseTest`).
- **Testes:**
  - `TampaEBaseTest` (5): tampa sem fundo; base em três partes com as pontas mais altas; miolo sem emenda e emendado na ponta; faixa informada; nomes dos arquivos.
  - `InventarioFicha.test.tsx` (13): grupos independentes.
  - `ficha-visual` (12): tampa no espaço reservado sem chegar à placa, base abaixo das células e nenhuma parte da base vazando da altura dela. As fixtures ficam em `e2e/fixtures/bolsa/`, que substituiu `fixtures/laterais`.

## Ajustes do painel do item (2026-09-29)

- **Botão carmesim:** a pedido do usuário ("vermelho muito gritante"), a ação principal do painel (Equipar/Desequipar) usa um carmesim puxado para o vinho do pano das laterais: degradê de `#7d1628` a `#4f0d19`. A regra vale só dentro de `.item-painel`; o `button--primary` do resto do site não mudou.
- **Painel espremido:** com as laterais de 7.2rem, a coluna da bolsa cresceu, e o painel caiu para 272 px em 1440, com o nome do item vazando. O painel agora tem mínimo de 22rem (`minmax(22rem, 1fr)`), e a reserva da célula subiu (`--reserva` de 38rem, ou 25rem no layout intermediário). Assim, são as células que encolhem, não o painel. Medido sem transbordo de 1024 a 1440 px.

## Faixa "Modo dev" removida (2026-09-29)

A pedido do usuário, o modo de desenvolvimento local não mostra mais a faixa "Modo dev · você é …" no alto. Sair fica no menu da conta, como no site. `DevApp.test.tsx` confere a entrada pela saída da tela de entrar.

## Ambiente local: SQLAlchemy sem extensão compilada (2026-09-29)

O Controle de Aplicativo do Windows passou a bloquear as DLLs compiladas do SQLAlchemy 2.1 ("Uma política de Controle de Aplicativo bloqueou este arquivo"). A política do Windows não foi alterada. As oito `.pyd` foram movidas para `.venv/sqlalchemy-pyd-bloqueados/` e o SQLAlchemy usa as versões em Python puro que ele mesmo traz (`HAS_CYEXTENSION = False`), um pouco mais lentas e com o mesmo comportamento. Um `pip install` que reinstale o SQLAlchemy traz as `.pyd` de volta, e o bloqueio volta junto.

## Como ver

- Prévia sem API: `/preview/ficha?secao=inventario&tamanho=colossal&forca=5&mochila=1&papel=narrador&nome=...`.
- Capturas da matriz: `E2E_APP_URL=http://localhost:5179 node e2e/capturas-ficha.mjs`.

## Decisões de implementação (além das do usuário)

- A placa de indicadores fica sempre dentro da bolsa; numa bolsa estreita, os blocos se empilham (spec e design D1 ajustados).
- O cabeçalho reaproveita a `MolduraOrnamentada` da navegação, em vez de criar outra moldura (design D8).
- A alça, a fivela, o pingente e as moedas ficaram em CSS/SVG. As pinturas pedidas são só couro, mapa, tecido e saco de moedas (D9).
- "Fora da grade" vai para o rodapé da aba, em largura inteira, e o painel do item fica na lateral. Os dois chegam lá por portal a partir do `InventoryGrid`, que continua com a lógica e segue igual na sala e no protótipo.
- As molduras de pergaminho da ficha ganham `background-color` real no padding-box. Sem isso, o axe não enxerga o fundo do `border-image` e acusa contraste falso.
