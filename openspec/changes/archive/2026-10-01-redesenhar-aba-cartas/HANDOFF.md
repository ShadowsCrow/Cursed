# Passagem de trabalho — redesenhar-aba-cartas

## O que a mudança faz

Classificação: **núcleo**. A aba de cartas da ficha passa a se chamar "Cartas" e vira uma cópia fiel da referência do usuário (`referencia/cartas.webp`, 2026-09-29), com barra lateral de filtros (origem e tipo) no lugar da caixa de categorias. O Custo de Aprendizado e os Descansos Mínimos passam a ser só do Narrador, também na API.

## Decisões do usuário (2026-09-29; não reabrir sem pedir)

1. **Nome "Cartas":** habilidades também são cartas.
2. **Barra lateral** como a do Inventário:
   - no topo, a origem: da classe, da raça ou concedidas (as escolhidas em oferta contam como concedidas);
   - abaixo, o tipo: habilidades, magias, categorias de item e efeitos.
3. **Custos reservados:** o jogador não vê o Custo de Aprendizado nem os Descansos Mínimos. O servidor não manda esses valores, em nenhum lugar.
4. **Faixa superior da carta:**
   - a imagem própria, enviada pelo Narrador, ocupa a faixa inteira;
   - sem ela, a faixa recebe a pintura da categoria, gerada pelo usuário no ChatGPT, com o medalhão e o emblema já pintados.
5. **Quatro colunas** ao lado da barra, com as cartas no tamanho da referência: aceito.
6. **Rolagem própria da caixa das cartas** (pedido depois da primeira prova): as cartas são grandes e muitas, e a caixa rola dentro de si, com a barra de filtros parada (design D6a). No celular, a grade rola com a página.
7. **Altura igual:** o usuário estranhou a espada menor. Itens não têm quadro de custos, e na seção "Itens recebidos" a carta saía mais baixa; agora toda carta tem 310 px.

## Conferência das regras (tarefa 1.1)

Nenhuma página de `rules/sistema` muda nesta mudança. Esconder os dois custos é uma regra de acesso da aplicação. O framework de criação já é ferramenta do Narrador (contexto do projeto), e as regras de aprendizado (seção 25 do Framework) continuam valendo como estão.

Continuam iguais:
- os valores guardados em cada carta;
- o ciclo de aprendizado (iniciar, interromper e concluir);
- quem conclui o aprendizado.

`git status rules/` mostra só `rules/sistema/Carga.md` alterado, trabalho de outra mudança.

## Estado (2026-09-29)

Faltam:
- **5.4:** a aprovação das pinturas, já geradas e integradas pelo Codex;
- **6.4:** a aprovação do usuário com a comparação lado a lado, sem e com pinturas, incluindo o grimório;
- **7.1:** as suítes completas, depois da aprovação.

## O que foi feito

- **Servidor:** `card_lifecycle._visivel(versao, narrador)` tira `custo_aprendizado`, `descansos_minimos` e `custo_legado` para quem não é Narrador. Vale para:
  - a lista da ficha;
  - as transições;
  - as candidatas e a resposta da oferta;
  - as apresentações.

  O `custo_legado` também sai porque pode repetir o Custo de Aprendizado em texto. Teste: `test_cartas.test_custos_de_aprendizado_so_para_o_narrador`.
- **Tela, custos por papel:** `custosDaCarta(tipo, conteudo, { narrador })` monta as duas linhas reservadas só para o Narrador, pelo papel e não pela presença da chave.
  - `CardFace` recebe `narrador`.
  - Visão do Narrador: `NarratorLibrary` e `ConcederDialog`.
  - A prévia do editor mostra a visão do jogador, com uma nota.
  - Rótulos em caixa de frase: "Custo de aprendizado", "Potência de uso".
- **Folha** (`sheet/cartas/`):
  - `CartasFicha`, `CartaDaFicha`, `DetalheDaCarta` e `FiltrosDasCartas`;
  - `apresentacao.ts` (funções puras), `emblemas.tsx` (medalhão e volutas), `pinturasDasCartas.ts` e `cartas.css`.
- **Painel antigo:**
  - `CharacterCardsPanel` saiu;
  - os diálogos foram para `cards/dialogosDeCartas.tsx` e as ações, para `cards/acoesDeCartas.ts`;
  - os testes dele foram para `CartasFicha.test.tsx` e `CartasDeCatalogo.test.tsx`.
- **Reaproveitado:**
  - `ListaCategorias` ganhou `titulo`, `rotuloTodos`, `unidade` e `manterVazias`;
  - `BuscaInventario` ganhou `rotulo` e `exemplo`.

  O Inventário não mudou. Seis ícones novos em `IconeCategoria`: habilidades, magias, efeitos e as três origens.
- **Arte:**
  - `ARTES_DAS_CARTAS` e `preparar_arte_das_cartas` (uma faixa por categoria, tirada do `itens.json`, e a gravura);
  - prompts em `arte/prompts.md`.
- **Prévia:** `/preview/ficha?secao=cartas&cartas=referencia` traz as dez da imagem, duas armas e uma magia da raça; `cartas=imagem` traz só as dez.
  - `papel=narrador` mostra os quatro custos.
  - Dados em `plataforma/cartasDemonstracao.ts`.
  - Servidor de prévia: `cartas-preview`, porta 5188, em `.claude/launch.json`.

## Desvios conscientes da referência (revistos no design)

- **Medidas:** a primeira leitura (262 × 307 px) era aproximada. Pela varredura das bordas, a carta mede 266 × 310, com 13 px entre colunas e 9 entre linhas (design D4).
- **Moldura da carta:** em CSS com volutas em SVG, e não em SVG de 9 fatias. A da referência é um retângulo arredondado com linha escura e filete dourado, sem chanfro (D7.1).
- **Ordem das cartas:** a referência mostra "Nome (A-Z)" mas não está em ordem alfabética. A prévia ordena de verdade, e por isso "Segundo round" não é a primeira carta.
- **"Aprendidas"** fica sobre a grade, à direita da barra, logo abaixo da busca. Com a rolagem própria, o título fica preso no alto da caixa e cobriria a busca se começasse na altura dela.
- **Faixa da carta de item** (pedido do usuário, 2026-09-30): 136 px em vez de 79, porque item não tem quadro de custos. A carta continua com 310 px na ficha: com título de duas linhas e texto de três, o texto termina a 262 px e a pílula começa a 275. A pintura da categoria e a imagem própria do item crescem juntas.
- **Limiares de largura** revistos (D10): barra ao lado a partir de 780 px de folha, e fileiras abaixo disso. Com a barra ao lado em 768 px, as cartas encolhiam para 231 px.

## Verificação (2026-09-29)

- `python -m unittest cursed_platform.tests.test_cartas cursed_platform.tests.test_api_cartas_catalogo` → 19 testes.
- `test_preparar_arte`: `ArteDasCartasTest` e `ArteDasPericiasTest` → 5 testes.
- `npx vitest run src/app/characters/sheet src/app/cards src/app/characters/Lote2Revisao.test.tsx` → 291 testes.
- `npm run typecheck` sem erros. `eslint` limpo nos arquivos tocados.
- `E2E_APP_URL=http://localhost:5188 npx playwright test -c e2e/playwright.config.mjs cartas-visual` → 13 testes, com:
  - as medidas de 1448 px;
  - nove larguras de 320 a 1920 px, sem rolagem;
  - folha completa sem pinturas e sem salto de layout;
  - o axe na folha, na barra e no detalhe.
- **Fidelidade:** `E2E_APP_URL=http://localhost:5188 node e2e/fidelidade-cartas.mjs [--sem-pinturas]` grava em `.screenshots/cartas/`:
  - `comparacao-1448`, `sobreposicao-1448`, `carta-lado-a-lado` e `carta-sobreposicao`, com e sem pinturas;
  - as páginas de 1024 e 375 px.

  Rodada de 2026-09-29: a carta mede 266 × 313 px, contra 267 × 310 na referência. Ainda não há pinturas, então as duas rodadas saem iguais.
- **Página oficial** (API + site locais, servidor `cartas-local` do `.claude/launch.json`: API 8008, site 5189, SQLite próprio em `%TEMP%/cursed-cartas-local`):
  - a mesa de exemplo tem o Lion, com as habilidades de classe e de arquétipo do catálogo, uma magia da raça, uma magia disponível, dois itens e um efeito;
  - para entrar, use qualquer senha com `jogador@…` (visão do jogador) ou `narrador@…` (visão do Narrador).

  Conferido na rede: para o jogador, a carta traz `potencia_uso`, `custo_uso` e `custos_adicionais`; para o Narrador, também `custo_aprendizado`, `descansos_minimos` e `custo_legado`.

  O lançador fica no espaço temporário da sessão que o criou. Numa sessão nova, recrie-o a partir do `navegacao-local.mjs` e semeie pela API.

## Detalhe em grimório (2026-09-30)

A sessão "Formatar página Personalidade" avisou que o usuário tinha aprovado um visual novo para a carta aberta: o conceito 5, o grimório, com explicações em `.screenshots/cartas-conceitos/LEIA-ME.md`. O usuário decidiu que ele entra nesta mudança ("Aplique o que estamos fazendo aqui"). A referência ficou em `referencia/detalhe-grimorio.png`.

- **Tela:**
  - `DetalheDaCarta.tsx` e `cartas.css` (bloco do grimório);
  - `grimorio.tsx`: estrela, fecho de latão e ícones dos dados;
  - `dadosDoGrimorio.tsx`: os quadros e a distribuição em pares.
- **Pares de quadros:** a ordem é a da especificação. Um par com valor longo, como a origem "Classe: Especialista de Combate - automática", ocupa as duas colunas.
- **Marcações:** aparecem sem o prefixo interno ("classe:X" vira "X"); sem nenhuma, aparece "Nenhuma".
- **Fonte:** algarismos normais, porque a Cormorant desenha o "1" como "ı" nos números estilo antigo. O atalho `font:` do CSS zera essa escolha, por isso ela é reposta depois.
- **Rolagem:** quem rola é o conteúdo do diálogo; a moldura e a cena ficam presas. No celular, o livro vira uma página só.
- **"Exatamente igual" (pedido do usuário depois da primeira prova):**
  - todo o conteúdo foi posto nas posições e proporções medidas no conceito (frações do diálogo de 1395 × 790, tamanhos em `cqw`);
  - os quadros de dados ganharam a moldura SVG de cantos recortados, rótulos com dois-pontos, ícones cheios e estrelas;
  - os pares ficam sempre lado a lado.
- **Pinturas geradas (2026-09-30):** o usuário corrigiu que eu mesmo devia gerá-las ("use você os prompts, você tem acesso"). Foram geradas pelo Codex, 30 peças em `public/arte/cartas/`:
  - o grimório com as páginas em branco;
  - 14 artes quadradas de categoria;
  - 14 faixas;
  - a gravura.

  As matrizes estão em `platform/frontend/arte-original/` e os prompts em `arte/prompts-codex/`. O conteúdo do grimório foi calibrado nas páginas da pintura (13,4–47,2% e 50,4–87,2% da largura). Com mais de três linhas de quadros (magia, visão do Narrador), eles se compactam para caber sem rolar.
- **Quadros de dados menores (pedido do usuário, 2026-09-30):** o usuário pediu quadros bem menores, para dar mais espaço ao texto. Os quadros baixaram para cerca de 70 px em 790, e a citação ocupa toda a altura que sobra. Com texto longo, o quadro cresce só o necessário. Isto se afasta do conceito de propósito.
- **Medalhão das cartas da grade (pedido do usuário, 2026-09-30):** é o mesmo da arte da categoria do grimório, recortado em círculo (`cartas-medalhao-*`) e posto sobre a faixa.
- **Faixa mais alta nos itens:** em `cartas.css`, a regra `.carta-ficha--item .carta-ficha__faixa` (136 px, "a imagem cresce e ocupa esse espaço") não foi escrita nesta conversa; veio do usuário ou de outra sessão. Foi mantida.
- **Foto própria ajustada (pedido do usuário, 2026-09-30):** a imagem própria (foto do item, arte enviada) aparece inteira, ajustada à faixa (`object-fit: contain`). Na carta, fica sobre a pintura da categoria desfocada; no quadro da arte do grimório, sobre a própria foto desfocada. Antes ela era recortada para preencher, e uma espada alta virava uma fatia.
- **Ajuste automático das imagens (pedido do usuário, 2026-09-30):** `assets/recorteDeImagem.ts` e `ImagemAjustada.tsx` apagam o fundo liso ligado às bordas e recortam a sobra, no navegador, uma vez por imagem.
  - Valem na bolsa, no painel do item, na faixa da carta e no livro.
  - Uma cena sem fundo liso fica como está.
  - No jsdom, sem canvas, a imagem passa sem ajuste.
  - Isso mexe em arquivos do Inventário (`InventoryGrid.tsx`, `InventarioFicha.tsx`); a sessão "Clarificar fluxo de itens no inventário" foi avisada.
- **Edições concorrentes:** durante esta sessão, outros arquivos da aba foram alterados no disco por outras sessões, por exemplo `ArteDoGrimorio` passou a receber `tipo` e `conteudo`, e a faixa dos itens tem 136 px. Antes de editar, releia.
- **O que só fica igual pintado:** o livro de couro, as páginas curvadas, as velas, a pena e o veludo vêm da pintura `cartas-detalhe-livro`, que é o próprio conceito com as páginas em branco (prompt no item 3 de `arte/prompts.md`). Com ela, a pintura vira o fundo, e o livro em CSS sai (classe `grimorio--pintado`). Sem ela, o livro em CSS segue a mesma geometria.
- **Verificação:**
  - `CartasFicha.test.tsx`: grimório de habilidade, de magia vista pelo Narrador e de item com arte própria;
  - `cartas-visual.spec.mjs`: medidas em 1448 px e página única em 375 e 320 px, sem rolagem horizontal e com a moldura parada;
  - `fidelidade-cartas.mjs`: gera `grimorio-lado-a-lado` e `grimorio-sobreposicao` contra o conceito.

## Biblioteca da mesa (2026-09-30)

A pedido do usuário, a biblioteca do Narrador usa o mesmo esquema da ficha: a carta é o botão que abre o grimório. O grimório virou a peça `Grimorio` em `DetalheDaCarta.tsx` (moldura, arte e quadros), e as ações ficam no friso do pé: na ficha, as de aprendizado; na biblioteca, Enviar, Apresentar e Editar (Editar só nas cartas criadas na mesa). Os quadros que dependem só do conteúdo saíram para `dadosDoConteudo`. A biblioteca troca "Recebida em" por "Publicada em" e mostra a origem no catálogo ("Classe: …", "Arquétipo: …", "Raça: …", "Criada na mesa" ou "Padrão do sistema"). O lápis no canto da carta continua como atalho de editar.

## Cuidados

- **Árvore misturada:** várias mudanças estão sem commit (`reformular-visual-da-ficha`, `redesenhar-aba-atributos`, `redesenhar-aba-pericias`, `redesenhar-informacoes-basicas`, `reformular-personalidade-da-ficha`). Os commits precisam ser separados.
  - **Arquivos novos desta mudança:**
    - `sheet/cartas/`, `cards/dialogosDeCartas.tsx`, `cards/acoesDeCartas.ts` e `cards/cardFormat.test.ts`;
    - `plataforma/cartasDemonstracao.ts`;
    - `e2e/cartas-visual.spec.mjs` e `e2e/fidelidade-cartas.mjs`.
  - **Arquivo apagado:** `cards/CharacterCardsPanel.tsx`, com o teste dele.
  - **Arquivos existentes, com edição pontual:**
    - `card_lifecycle.py` e `test_cartas.py`;
    - `cardFormat.ts`, `cardView.tsx`, `NarratorLibrary.tsx`, `CardEditor.tsx` e o teste dele, `OfferChooser.test.tsx` e `CartasDeCatalogo.test.tsx`;
    - `CharacterSheetPage.tsx` e o teste dele, `ResumoVisual.tsx` e o teste dele, `Lote1Revisao.test.tsx` e `Lote2Revisao.test.tsx`;
    - `InventarioFicha.tsx` (`ListaCategorias` e `BuscaInventario`) e `iconesItem.tsx`;
    - `fichaCompletaDemonstracao.ts` e `ProvaDaFicha.tsx`;
    - `preparar_arte.py` e `test_preparar_arte.py`;
    - `e2e/playwright.config.mjs` e `.claude/launch.json`.
- **Arquivamento:** só depois de `reformular-visual-da-ficha`, de onde vem a capability `visual-da-ficha`.
- Molduras só em SVG/CSS, na técnica do Resumo. Pinturas só como ilustração.
