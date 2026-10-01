# Design — redesenhar-aba-cartas

## Context

A motivação está no proposal.md. A referência do usuário está em `referencia/cartas.webp`: 1448 × 1086 px, a ficha real do Lion, com cabeçalho, faixa de estado e abas. O estado atual que molda a solução:

- **Aba hoje.** `CharacterSheetPage.tsx` põe `CharacterCardsPanel` dentro de `MolduraSecao` ("Habilidades e cartas").
  - O painel agrupa por estado (`GRUPOS`) e mostra cada carta com `CardFace` → `ContentCard` (`ui/Display`).
  - As ações (`ACOES_JOGADOR`, `ACOES_NARRADOR`, migrar e remover) ficam em botões embaixo de cada carta, e "Conceder carta" fica no alto.
  - Os diálogos de conceder e migrar estão no mesmo arquivo.
  - Embaixo, as "Habilidades anotadas" da ficha antiga (`info.habilidades`).
- **Dados da carta.**
  - `CartaPersonagemResumo` traz `tipo`, `estado`, `origem` (`concessao` | `oferta`), `excecao_aprendizado`, `concedida_por` (`classe:X`, `arquetipo:X/Y`, `raca:X`), `adquirida_em` e `carta.conteudo`, com `titulo`, `texto`, `tags`, `requisitos`, `ativos` e os custos.
  - Itens têm `item_tipo` e `formato.subtipo`/`formato.categoria`.
  - `inventory/filtro.ts` já resolve a categoria (`categoriaDoItem`) com o catálogo de `itens.json` (`useCatalogoItens`) e normaliza texto para busca.
- **Custos.**
  - `cardFormat.custosDaCarta` mostra os quatro custos a todos, com "Não definido" quando o valor falta.
  - No servidor, `card_lifecycle._visivel` devolve `versao.conteudo` inteiro a qualquer participante. É o único ponto que monta `CartaVisivel` para ficha, ofertas, respostas e apresentações.
  - O catálogo (`cards.py`) já exige Narrador.
- **Arte da carta.**
  - O editor já envia "arte da carta" (habilidade, magia e efeito) e "foto do item" para `ativos`.
  - `CardFace` mostra a primeira com `useAssetImage`.
- **Técnicas aprovadas** (`docs/tecnicas-visuais.md`):
  - folha do Resumo: `Pergaminho`, `CantoDaFolha`, `FlorDaBorda` e moldura dupla em CSS;
  - ornamentos dos Atributos: `VolutaDaFaixa`, `ArcoDaFaixa`, `FiligranaDoMedalhao` e `PinturaOpcional`;
  - `ListaCategorias` e `BuscaInventario` do Inventário;
  - pré-carregamento em `pinturasDaBolsa.ts`;
  - `preparar_arte.py`.

  Molduras e ornamentos são sempre SVG ou CSS, e pintura é só ilustração.

## Goals / Non-Goals

**Goals:**
- Cópia fiel da referência em 1448 px (D11), menos as mudanças pedidas: nome "Cartas", barra lateral no lugar da caixa de categorias, e custos de aprendizado ocultos ao jogador.
- O jogador acha rápido "o que é da raça" ou "as armas", e lê o custo de uso sem abrir nada.
- O Custo de Aprendizado e os Descansos Mínimos nunca chegam ao navegador de quem não é Narrador.
- Nenhuma mudança no ciclo das cartas, nas permissões ou nos valores guardados.

**Non-Goals:**
- Redesenhar a biblioteca do Narrador, o editor, a escolha de ofertas e a apresentação. Elas só passam a esconder os dois custos do jogador.
- Registrar o progresso do aprendizado.
- Criar campo de ícone ou de categoria para habilidades e magias.

## Decisions

### D1. Nome "Cartas" e links antigos

- Em `SECTIONS`, o rótulo passa a `"Cartas"`, e o id continua `cartas`.
- `SECOES_ANTIGAS` já leva `habilidades` para `cartas`.
- O rótulo do Resumo (`ResumoVisual.tsx`) acompanha.
- A barra de abas continua com dez abas e o mesmo ícone.

### D2. Custos reservados no servidor

`_visivel(versao, narrador)` passa a receber o papel. Para quem não é Narrador, devolve uma cópia do `conteudo` sem `custo_aprendizado` e `descansos_minimos`. Os pontos de chamada, todos em `card_lifecycle.py`, repassam o `narrador` que já calculam:
- `_instancia_resumo` (lista, transição e resposta de oferta);
- `_oferta_resumo` (candidatas);
- `_apresentacao_resumo`.

`_oferta_resumo` ganha o parâmetro.

- As chaves são **removidas**, não postas como `null`, porque `null` já quer dizer "Não definido" na tela.
- O contrato não muda: `conteudo` é `dict[str, Any]`.
- `custo_legado` é texto histórico que pode conter o Custo de Aprendizado.
  - Ele também sai para quem não é Narrador. É o mesmo segredo com outro nome, e o jogador não precisa dele.
  - `CardFace` já trata a ausência.
- O catálogo (`cards.py`), a exportação e a importação são do Narrador e não mudam.

**Na tela, o papel decide o que aparece, não a presença da chave.** `custosDaCarta(tipo, conteudo, { narrador })` só monta as duas primeiras linhas para o Narrador. Assim, uma chave ausente nunca vira "Não definido" para o jogador, e um dado que vazasse de outro caminho também não apareceria.
- Consumidores do jogador: ficha, `OfferChooser` e `PresentationOverlay`.
- Consumidores do Narrador: `NarratorLibrary`, `ConcederDialog` e a prévia do editor.
- A prévia do editor, "Como os jogadores verão", passa a mostrar a carta como o jogador a vê, sem os dois custos, com a nota "Custo de aprendizado e descansos mínimos ficam só com o Narrador".

### D3. Estrutura da folha

`sheet/cartas/`:

| Arquivo | Papel |
|---|---|
| `CartasFicha.tsx` | folha, cabeçalho, barra, seções, estado vazio, legado |
| `CartaDaFicha.tsx` | a carta da grade (botão que abre o detalhe) |
| `DetalheDaCarta.tsx` | diálogo com o conteúdo inteiro e as ações |
| `FiltrosDasCartas.tsx` | barra lateral e fileiras do celular |
| `apresentacao.ts` | origem, categoria, rótulo da pílula, filtro, contagem, busca e ordem (funções puras) |
| `pinturasDasCartas.ts` | caminhos e pré-carregamento das pinturas, no padrão de `pinturasDaBolsa.ts` |
| `emblemas.tsx` | medalhão SVG e ícones da faixa sem pintura, por categoria |
| `cartas.css` | tudo o que é desta folha |

`CharacterCardsPanel.tsx` sai (revisto na implementação):
- `ConcederDialog` e `MigrarDialog` vão para `cards/dialogosDeCartas.tsx`, e as tabelas de ações, para `cards/acoesDeCartas.ts`;
- `rotuloConcessao` virou `rotuloDaOrigem`, em `apresentacao.ts`, com o texto da referência;
- os testes do painel passaram para `CartasFicha.test.tsx` e `CartasDeCatalogo.test.tsx`;
- a folha `sheet/cartas/` é a única a mostrar as cartas do personagem.

O painel da aba muda de `ficha-secao--moldura` para `ficha-secao--cartas`, como o Resumo e as Perícias.

### D4. Medidas da referência (janela de 1448 px)

Tiradas por varredura de pixels da imagem. **Revisto na implementação:** a primeira leitura (carta de 262 × 307 px, 17 px entre colunas) era aproximada; a varredura das bordas deu os valores abaixo.

| Parte | Medida |
|---|---|
| Folha | de x 8 a 1440 e de y 368 em diante; moldura dupla e cantos em volutas do Resumo |
| Recuo do texto | 46 px da borda da folha |
| Etiqueta "CARTAS" | 13 px, versalete, espaçamento .28em, tinta 700, no alto a 30 px da borda de cima |
| Título | cerca de 38 px, fonte de exibição, 700, tinta 900 |
| Título de seção ("Aprendidas") | 17 px, fonte de exibição, 700 |
| Gravura | de x 790 a 1420 e de y 372 a 470, atrás da busca |
| Busca | 223 × 34 px, com a borda direita a 380 px da borda direita da folha |
| Ordem | 156 × 34 px, encostada na borda direita da grade |
| Carta | 266 × 310 px (267 de linha escura a linha escura), com 13 px entre colunas e 9 px entre linhas; a primeira a 29 px da borda esquerda da folha |
| Faixa | 79 px de altura com o filete dourado de baixo; 3 px abaixo da borda da carta e 5 px dos lados. Na carta de item, 136 px (decisão do usuário, 2026-09-30): item não tem quadro de custos, e a imagem ocupa esse espaço sem mudar a altura da carta |
| Medalhão | aro de cerca de 67 px, centrado na faixa, com quatro pontas (N, L, S, O) |
| Texto da carta | a 22 px da borda da carta; tipo 12 px abaixo da faixa |
| Tipo | 9 px, versalete, espaçamento .16em, 700 |
| Título da carta | 19 px, fonte de exibição, 700 |
| Texto | 13,5 px, entrelinha 1.15, três linhas |
| Custos | rótulo 8,5 px em versalete 700; valor 10 px em 700; divisória vertical dourada |
| Pílula da origem | 24 px de altura, borda dourada arredondada, a 11 px do pé da carta |
| Tipografia | toda serifada (rótulos dos custos em versalete negrito, valores em negrito, pílula regular): na plataforma, a fonte de exibição |

**Onde entra a barra lateral.** A referência tem cinco colunas e nenhuma barra, entre 29 px da borda esquerda e 22 da direita (1381 px). Quatro colunas ocupam 4 × 266 + 3 × 13 = 1103 px; com 24 px de vão, a barra fica com o resto, 254 px, na folha da referência.

As cartas têm prioridade: a barra fica com o que sobra depois delas, entre 180 e 250 px (`clamp` sobre a largura da grade). Assim, cada carta mantém o tamanho da referência também na folha da prévia, que a página limita a cerca de 1376 px. A caixa "Todas as categorias" sai do cabeçalho, e a busca vai para o lugar dela, alinhada à ordem. O título da primeira seção ("Aprendidas") fica na altura da busca, como na referência.

### D5. Barra lateral de filtros

- **Construção:** a mesma da `ListaCategorias` do Inventário (`categorias--lista` e `categorias--fileira`), com dois `<nav>`: "Origem" e "Tipo".
  - `ListaCategorias` ganha `titulo` e `rotuloTodos` opcionais, com "Categorias" e "Todos" como padrão. O Inventário não muda.
  - As contagens anunciam "n cartas".
- **Origem** (`origemDaCarta`, em `apresentacao.ts`):

  | `concedida_por` | Filtro |
  |---|---|
  | `classe:…` ou `arquetipo:…` | Da classe |
  | `raca:…` | Da raça |
  | vazio (concessão avulsa, oferta ou exceção) | Concedidas |

  As quatro opções aparecem sempre, "Todas" primeiro.
- **Tipo** (`categoriaDaCarta`):
  - habilidade → `habilidades`, magia → `magias`, efeito → `efeitos`;
  - item → `categoriaDoItem({ tipo: item_tipo, subtipo: formato?.subtipo, categoria: formato?.categoria }, catalogo)`.

  A ordem da barra é "Todos", Habilidades, Magias, as categorias do `itens.json` na ordem do catálogo, e Efeitos. Só aparecem as que têm cartas.
- **Combinação:** a origem filtra primeiro, e as contagens de tipo são calculadas sobre o que ela deixou. A busca vale para as duas contagens.
  - Se o tipo escolhido fica com zero depois de trocar a origem, ele continua visível e pressionado com 0, para o jogador ver o motivo da grade vazia.
- **Estado dos filtros:** no componente, e zerado ao trocar de personagem. Não vai para a URL: a URL guarda só a aba.
- **Celular** (folha abaixo de 780 px): as duas listas viram fileiras roláveis acima da grade, e o título de cada uma fica só para leitores de tela. É a mesma barra, restilizada pelo CSS: duas cópias (lista e fileira) repetiriam os marcos de navegação para o leitor de tela.

### D6. Busca, ordem e seções

- **Busca:** `normalizar` do `inventory/filtro.ts` sobre título, texto e tags, com o mesmo `BuscaInventario`, com o rótulo "Buscar cartas" e o texto de exemplo "Buscar cartas…".
- **Ordem:** um `<select>` estilizado com o ícone ⇅ da referência: "Nome (A-Z)" (padrão), "Nome (Z-A)" e "Mais recentes" (`adquirida_em`). Nomes são comparados com `localeCompare("pt-BR", { sensitivity: "base" })`.
- **Seções:** as cinco do `GRUPOS` atual, na mesma ordem:
  - cada uma é um `<section aria-labelledby>` com `<h3>`;
  - "Disponíveis para aprender" mantém a nota;
  - "Aprendidas" fica logo abaixo do cabeçalho, como na referência.

### D6a. Rolagem própria da grade (pedido do usuário, 2026-09-29)

As cartas são grandes e muitas. Por isso a caixa da grade rola dentro de si, e o cabeçalho e a barra de filtros ficam parados ao lado:
- a altura é `max(41rem, 100dvh − 12,5rem)`, o bastante para duas linhas de cartas e, com a folha no alto da janela, a caixa inteira à vista;
- a barra de rolagem é fina e dourada, com o vão reservado (`scrollbar-gutter: stable`), para as cartas não pularem quando ela aparece;
- o título de cada seção fica preso no alto (`position: sticky`), com fundo de pergaminho e filete dourado;
- a caixa é uma região rotulada ("Cartas do personagem") e focável, para rolar pelo teclado;
- `overscroll-behavior: contain`: no fim da caixa, a página não sai rolando junto.

**Consequência:** na referência, "Aprendidas" fica na altura da busca. Com o título preso no alto da caixa, ele cobriria a busca e a ordem, e por isso a caixa começa logo abaixo delas.

**Celular** (folha abaixo de 780 px, com as fileiras): a grade volta a rolar com a página. Rolagem dentro de rolagem atrapalha o toque.

### D7. A carta da grade

Estrutura, de cima para baixo, dentro de um `<button class="carta-ficha">` com `aria-label` "{Tipo}: {título}. {origem}" e `aria-haspopup="dialog"`:

1. **Moldura (revisto na implementação):** a moldura da referência é um retângulo de cantos arredondados com linha escura de fora e filete dourado por dentro, sem chanfro. Ela ficou em CSS (borda e `box-shadow` interno), com as volutas de canto em SVG (`VolutaDaCarta`) nos cantos de cima e no pé da faixa. Não há SVG de 9 fatias. O fundo é o pergaminho no próprio elemento, para o axe.
2. **Faixa (78 px, largura toda da carta):** uma única imagem em `object-fit: cover`, com uma linha dourada embaixo em CSS. Decisão do usuário (2026-09-29): a faixa superior inteira é da imagem, na ordem abaixo.
   1. **Imagem própria:** quando `conteudo.ativos` tem imagem, ela ocupa a faixa. `useAssetImage` cuida do carregamento. Enquanto carrega, ou se falhar, vale o passo seguinte.
      - **Revisto em 2026-09-30:** a imagem aparece inteira, ajustada (`contain`), sobre a pintura da categoria desfocada e escurecida. Fotos de objetos altos, como uma espada, não viram uma fatia.
   2. **Pintura da categoria** (`cartas-faixa-{categoria}.webp`, por `PinturaOpcional`): uma cena só, com o medalhão dourado e o emblema **já pintados** no centro, como cada faixa da referência. Não há medalhão por cima em SVG nem emblema separado.
   3. **Reserva sem pintura:** degradê da cor do tipo com vinheta e, no centro, o medalhão desenhado em SVG (84 px de desenho, aro de 67 px com quatro pontas e miolo escuro com brilho), com o ícone da categoria em ouro. Os ícones são `IconeCategoria` para itens e ícones novos para habilidade, magia e efeito.

   | Tipo | Cor da reserva |
   |---|---|
   | Habilidade | azul-noite `#16233f` (a da referência) |
   | Magia | violeta `#2b1d4a` |
   | Item | bronze `#3a2a16` |
   | Efeito | verde-escuro `#1d3a33` |

   **Revisto em 2026-09-30, a pedido do usuário:** o medalhão da carta passou a ser o da arte quadrada da categoria, o mesmo do grimório, que ele achou mais bonito.
   - O `preparar_arte.py` o recorta da arte num círculo de borda suave (`cartas-medalhao-<categoria>`, `recortar_medalhao`).
   - A carta o põe por cima do centro da faixa, com 82 px e o aro de cerca de 67 px, cobrindo o medalhão pintado na faixa.
   - Sem a faixa, ele fica sobre o degradê da reserva, no lugar do medalhão em SVG.

   O medalhão pintado precisa ficar no mesmo lugar em todas as pinturas. Por isso, o prompt fixa o centro e o tamanho (um quarto da altura da faixa de raio), e o e2e confere o SVG da reserva na mesma posição.
3. **Tipo, título e texto:** o texto usa `-webkit-line-clamp: 3`.
4. **Custos** (só habilidade e magia):
   - grade de duas colunas com divisória, vinda de `custosDaCarta(…, { narrador })`;
   - Narrador: 2 × 2;
   - jogador: uma linha, com Potência de uso e Custo de uso;
   - custos adicionais só no detalhe, para a altura da carta não variar.
5. **Pílula da origem**, no pé:
   - "Classe: {nome} - automática", com o hífen da referência;
   - "Arquétipo: {nome} - automática" e "Raça: {nome} - automática";
   - "Concedida como aprendida (exceção)";
   - "Escolhida em oferta" (`origem === "oferta"`) ou "Concedida pelo Narrador".

   Nome longo trunca com reticências. O texto inteiro fica no `aria-label` e no detalhe.

**Altura igual (revisto na implementação):** toda carta da grade tem no mínimo a altura da referência, 310 px. Antes, a altura seguia o conteúdo: numa seção só de itens, como "Itens recebidos", a carta saía mais baixa, porque itens não têm quadro de custos (o usuário notou na espada). A pílula continua presa ao pé (`margin-top: auto`).

**Carta desatualizada:** para o Narrador, quando `versao_mais_recente` é maior que a versão da carta, um selo pequeno "v{n} disponível" aparece no canto de cima da faixa.

### D8. Detalhe da carta: grimório aberto (revisto em 2026-09-30)

O usuário aprovou, noutra sessão, um visual novo para a carta aberta: o conceito 5, gerado no ChatGPT e guardado em `referencia/detalhe-grimorio.png`, com as explicações em `.screenshots/cartas-conceitos/LEIA-ME.md`. Em seguida pediu que ele entrasse nesta mudança. É cópia fiel, com esta divisão entre SVG/CSS e pintura:

| Parte | Como |
|---|---|
| Moldura do diálogo: filete dourado duplo, filigrana nos quatro cantos, estrela no alto e no pé | SVG/CSS (`CantoDaFolha` do Resumo e uma estrela de quatro pontas) |
| Livro: capa de couro, maço de folhas nas bordas, lombada com sombra, fechos e rebites de latão | CSS (degradês e `repeating-linear-gradient` nas folhas); fechos em SVG |
| Páginas | o pergaminho da plataforma (`/arte/pergaminho.webp`) com sombra de curvatura para a lombada |
| Quadro da arte, quadro do título, quadro de citação e quadros de dados | molduras em CSS com filigrana de canto em SVG e estrelas nas junções |
| Arte da página esquerda | imagem própria da carta; senão, a pintura da categoria (a mesma da faixa, recortada ao centro); senão, o medalhão em SVG grande, com raios e estrelas, como no conceito |
| Ícones dos dados | SVG em traço claro sobre círculo marrom-escuro |
| Livro aberto de páginas em branco e a cena de velas, pena, livros e veludo | uma pintura opcional só, `cartas-detalhe-livro.webp`, feita a partir do próprio conceito (revisto em 2026-09-30: o usuário pediu o grimório exatamente igual, e o livro de couro e as páginas curvadas só ficam iguais pintados); sem ela, o livro em CSS na mesma geometria |

Medidas tiradas do conceito (1586 × 992, na escala ~1,095 da referência da aba):

| Parte | Medida real |
|---|---|
| Moldura do diálogo | cerca de 1270 × 720 px, limitada à janela |
| Livro | cerca de 1130 × 650 px; cada página com ~440 px |
| Quadro da arte | quadrado de ~360 px |
| Quadro do título | ~360 × 145 px; tipo em versalete, título a ~50 px na fonte de exibição |
| Quadro de citação | ~430 × 215 px, com a aspa dourada no alto à esquerda |
| Quadros de dados | duas colunas de ~220 × 100 px, 12 px de vão; círculo do ícone de ~56 px |

**Geometria (revisto em 2026-09-30, "quero que fique exatamente igual"):**
- Tudo é posicionado em frações do diálogo medidas no conceito: arte em 17,2% / 8,9% com 29% × 51,3%; título em 61,4% com 20,3% de altura; citação em 52% / 8,9% com 34,3% × 31%; quadros de dados de 41,8% a 86,7%.
- Os tamanhos são `cqw` do diálogo. O diálogo mantém a proporção 1395 × 790 e escala com a janela, e o grimório não muda de desenho em nenhuma largura de computador.
- Os quadros de dados têm moldura SVG de 9 fatias com os cantos recortados do conceito, rótulos com dois-pontos, ícones cheios cor de creme e estrela no meio da borda de baixo.
- Os pares ficam sempre lado a lado, e valores longos diminuem para caber no quadro.
- Título longo diminui para caber numa linha.
- As ações, que o conceito não mostra, ficam num friso no pé do diálogo, entre o livro e a moldura.

**Semântica:** o `Dialog` continua dando o foco preso, o Esc e a volta do foco. O título dele fica só para leitores de tela, porque o título visível está na página, como texto decorativo oculto do leitor, para não ser lido duas vezes. O "Fechar" vira o círculo dourado com X no canto de cima.

**Dados:** os quadros seguem a ordem da especificação e só aparecem os que se aplicam. O papel decide os custos reservados, como na carta (D2).

**Ações:** o conceito não as mostra. Elas ficam no pé da página direita, como placas douradas, com as mesmas permissões:
- remover continua pedindo confirmação (`Confirmation`);
- migrar abre o `MigrarDialog`.

**Texto longo:** o quadro de citação rola dentro de si. Assim a página não cresce além do livro.

**Celular** (janela abaixo de 760 px): o livro vira uma página só, com a arte e o título em cima e a citação e os dados embaixo. Os dados ficam em uma coluna abaixo de 420 px. O diálogo rola na vertical.

Ao fechar, o foco volta para a carta de origem, que o `Dialog` já devolve. Uma transição bem-sucedida fecha o detalhe, porque a carta pode mudar de seção. Um erro aparece no próprio detalhe.

### D9. Pinturas opcionais

| Arquivo | Tamanho | Uso |
|---|---|---|
| `cartas-gravura` | 1536 × 256, fundo de papel multiplicado | cabeçalho, à direita |
| `cartas-faixa-{categoria}` | 1024 × 304 (a proporção da faixa, 262 × 78) | faixa inteira da carta sem imagem própria |

Há uma faixa por categoria, cada uma com a cena e o medalhão com o emblema já pintados: habilidades, magias e efeitos, e cada categoria de item do `itens.json`. As de item são armas, armaduras, escudos, acessórios, consumíveis, materiais, chaves, itens de missão, diversos, moedas e criaturas. Uma categoria nova no catálogo sem pintura usa a reserva (degradê com o medalhão em SVG).

- As entradas vão para `ARTES_DAS_CARTAS` em `preparar_arte.py`, geradas em `public/arte/cartas/` por `preparar_arte_das_cartas`, com o mesmo `preparar_pinturas`. As faixas mantêm o fundo: são cenas, sem recorte.
- Os prompts ficam em `arte/prompts.md`. Todas as peças saem da mesma conversa do ChatGPT, com a referência anexada. Cada prompt fixa o medalhão no centro, com o mesmo tamanho, e pede cena escura nas laterais, como na referência.
- `pinturasDasCartas.ts` pré-carrega a gravura e as faixas das categorias usadas na tela, com estados `carregando`, `prontas` e `ausentes` e cache da sessão. Cada faixa é independente: uma categoria sem pintura não afeta as outras.
  - Enquanto carrega, a faixa já tem a altura e o degradê, sem salto de layout.

### D10. Larguras

A folha mede a própria largura (`container: cartas / inline-size`):

| Largura da folha | Barra | Colunas |
|---|---|---|
| a partir de 1290 px | à esquerda, 180 a 250 px | 4 |
| 1000 a 1289 | à esquerda, 180 a 250 px | 3 |
| 780 a 999 | à esquerda, 180 a 250 px | 2 |
| 480 a 779 | fileiras acima | 2 |
| abaixo de 480 | fileiras acima | 1 |

Revisto na implementação: com a barra ao lado abaixo de 780 px, as duas cartas encolhiam para 231 px (medido a 768 px de janela); com as fileiras, cabem inteiras. A grade usa `repeat(n, minmax(0, 266px))`. Abaixo de 480 px, a carta ocupa a largura toda, até 360 px. A busca e a ordem descem para baixo do título quando não cabem ao lado, e a gravura vira uma faixa desbotada atrás do título. Nenhuma largura a partir de 320 px rola na horizontal.

### D11. Como garantir a cópia fiel

1. **Prévia com os dados da referência:** `/preview/ficha?secao=cartas&cartas=referencia`.
   - A API de demonstração ganha as dez habilidades da imagem, aprendidas, `concedida_por: "classe:Especialista de Combate"`, sem custos e com os mesmos textos:
     - Segundo round, Combinação tática, Digno de atenção, Postura defensiva, Canalização arcana;
     - Passo veloz, Tiro preciso, Uso de item, Presença marcante, Curso do tempo.
   - Mais duas armas e uma magia da raça, para os filtros.
   - Um parâmetro `papel=narrador` mostra a visão do Narrador, que é a da imagem, com os quatro custos.
2. **Sobreposição:** `e2e/fidelidade-cartas.mjs` captura a prévia em 1448 × 1086, como Narrador e só com as dez cartas, e gera em `.screenshots/cartas/`:
   - a captura, a referência, as duas empilhadas e a sobreposição a 50%;
   - uma comparação lado a lado e uma sobreposição da carta isolada (267 × 310), ampliadas três vezes, com a primeira carta da referência, onde o desvio da barra lateral não interfere.
3. **Asserções de medida** no e2e: a carta tem tamanho fixo e não escala com a folha, então as medidas são absolutas: largura e altura da carta, vão entre colunas, altura da faixa, diâmetro e centro do medalhão da reserva, e distância da pílula ao pé.
4. **Aprovação do usuário:** lado a lado, primeiro sem pinturas (só SVG e CSS), depois com elas.

### Impacto no jogo

- **Escassez e risco:** nenhum número muda. Esconder o Custo de Aprendizado e os Descansos Mínimos reforça que o ritmo da evolução é do Narrador (o framework é ferramenta dele), sem tirar do jogador o que pesa na decisão em cena: quanto custa usar.
- **Ritmo e carga cognitiva:** a origem e o tipo na barra respondem, em um toque, às perguntas comuns na mesa ("o que minha raça me dá?", "quais armas tenho?"). O custo de uso fica visível na própria carta, sem abrir nada. O texto cortado em três linhas mantém a grade legível, e o detalhe guarda o resto.
- **Interações:** ofertas e apresentação deixam de mostrar os dois custos ao jogador. O Inventário continua dono dos itens na grade, e a aba Cartas só lista a carta de origem.

## Risks / Trade-offs

- **A barra lateral tira uma coluna da referência** → é pedido do usuário. As cartas mantêm o tamanho exato da referência, e a fidelidade da carta é conferida isolada (D11.2).
- **Muitas pinturas** (1 gravura e 14 faixas) → todas opcionais, com reserva em SVG e degradê. A tela fica completa sem nenhuma.
- **Imagem própria de qualidade variada ocupando a faixa** → véu escuro nas bordas e linha dourada embaixo, como nas faixas pintadas.
- **Medalhão pintado em posição diferente em cada faixa** → o prompt fixa centro e tamanho, e a aprovação com as pinturas confere a grade lado a lado.
- **Chave removida e chave `null` com sentidos diferentes** → a tela decide pelo papel (D2), e os testes de API conferem a ausência das chaves para o jogador e a presença para o Narrador.
- **Árvore de trabalho misturada** (várias mudanças sem commit tocando `CharacterSheetPage.tsx`, `preparar_arte.py` e `ProvaDaFicha.tsx`) → edições pontuais e aditivas, e commit separado.

## Migration Plan

Sem migração de banco, sem contrato novo e sem mudança nos arquivos de dados. Para voltar atrás:
- devolver a aba a `MolduraSecao` com `CharacterCardsPanel`;
- tirar o parâmetro de papel de `_visivel`.

## Open Questions

- Nenhuma. A posição da imagem própria foi decidida pelo usuário em 2026-09-29: ela ocupa a faixa superior inteira, no lugar da pintura da categoria (D7).
