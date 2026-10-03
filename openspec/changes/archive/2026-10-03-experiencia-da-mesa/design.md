# Design — experiencia-da-mesa

## Context

A moldura da mesa é o `WorkspaceChrome` (`platform/frontend/src/app/shells/WorkspaceChrome.tsx`). `NarratorShell` e `PlayerShell` reaproveitam essa moldura e injetam os blocos do papel por `sidebarExtra`. O componente desenha:
- `.sidebar`: marca, cartão "Campanha atual", rótulo "MESA", navegação, `sidebarExtra` e a volta a Campanhas;
- `.preview-main`: cabeçalho, conteúdo e rodapé;
- a navegação móvel `.mobile-nav`.

O layout vem de `.preview-app { grid-template-columns: 238px minmax(0,1fr) }` em `design/preview.css`. Até 760 px, `.sidebar` some e a `.mobile-nav` aparece. A `Marca` já aceita `compacta`, que desenha o `EmblemaSimples` sem o texto. O projeto já guarda conveniências do navegador no `localStorage`, com `try/catch` e recurso para quando ele é bloqueado (`characters/creation/rascunho.ts`, `DevApp.tsx`).

**Sala (item 2):**
- `tableNavigation.ts` define a ordem das seções e o padrão por papel: `overview` para o Narrador e `character` para o jogador. `permittedTableView` cai no padrão quando `?painel=` é ausente ou inválido.
- Os shells passam `headerTitle`, `headerEyebrow` e `headerDescription` ao `WorkspaceChrome`. Ele desenha o `CabecalhoIlustrado` quando não recebe `hero`.
- `RoomView` empilha num `display:grid`:
  - o painel de cenas (Narrador);
  - o título da cena;
  - o envio do mapa;
  - o `RoomCanvas`;
  - a dica;
  - os sinais;
  - os tokens com o movimento;
  - `SceneStashes`;
  - o formulário de token.
- `RoomCanvas` usa PixiJS com `resizeTo` no `.room-canvas__surface`, de altura fixa `min(65vh, 650px)`. A célula tem 48 px, e "Centralizar" volta a escala 1 na posição 0,0, o que deixa o mapa no canto (segunda imagem do usuário). `MesaResumo` não informa se o módulo da Sala está ativo; quem descobre isso é a consulta da sala.

## Goals / Non-Goals

**Goals:**
- Recolher e expandir a barra da mesa sem duplicar a navegação: o mesmo `Navigation` serve aos dois estados.
- Trilho acessível: nomes, dicas, página atual e pendências.
- Preferência lembrada no navegador, que tolera armazenamento bloqueado.

- Sala de página única: grid preenchendo a área útil, com os controles por cima dele, sem perder nenhuma função existente.

**Non-Goals:**
- Recolher automaticamente por largura de tela entre 761 e 1100 px. Pode virar item futuro, se o usuário pedir.
- Mudar `RestDialog` ou `PlayerSnapshotPanel` para caberem no trilho.
- Trazer ficha, cartas ou registro para dentro da Sala (itens futuros).
- Trocar a interação de movimento: arrastar, depois confirmar, continua igual.

## Decisions

### Trilho de ícones em vez de esconder a barra inteira
Recolhida, a barra vira um trilho de cerca de 72 px com marca compacta, ícones das seções e volta a Campanhas.
- **Por quê:** a navegação continua a um clique, sem precisar abrir a barra de novo. A identidade visual já prevê a "barra lateral recolhida" com o emblema simplificado.
- **Alternativa considerada:** ocultar a barra por completo, deixando só um botão no cabeçalho. Ganha mais largura, mas troca de seção passaria a custar dois cliques, e a marca sumiria da mesa.

### Estado no `WorkspaceChrome`, aplicado por classe
- `WorkspaceChrome` guarda `recolhida` num hook pequeno, `useBarraRecolhida`, no mesmo arquivo ou em `shells/`.
- O hook lê e grava a chave `cursed:mesa:barra-recolhida` no `localStorage`, com `try/catch`. Sem acesso ao armazenamento, o padrão é expandida.
- A classe `workspace-app--barra-recolhida` vai no contêiner. O CSS troca a primeira coluna da grade (`238px` → `72px`) e esconde, no trilho, os textos e blocos que só existem expandidos.
- **Por quê:** os dois shells herdam o comportamento sem mudança. Os testes atuais continuam valendo com a barra expandida, que é o padrão.
- **Alternativa considerada:** contexto React global. É desnecessário, porque só a moldura consome o estado.

### Botão de alternância
- O botão fica no topo da barra, ao lado da marca, com `aria-expanded` e `aria-controls` apontando para a `<aside>`.
- O nome muda entre "Recolher barra lateral" e "Expandir barra lateral". O ícone é uma seta dupla, que se espelha conforme o estado.
- O ícone vem do `Glyph` existente. Se não houver um adequado, um SVG simples é acrescentado ao conjunto de glifos.

### Rótulos no trilho
- No trilho, o `<span>` com o nome de cada item continua no DOM, oculto visualmente (`sr-only`). Assim, o nome acessível do botão não muda entre os estados.
- A dica visível é um `title` mais um balão em CSS no `:hover` e no `:focus-visible`. Isso evita depender do atraso do `title` nativo para quem usa o teclado.
- O contador de pendências vira um ponto no canto do ícone. O texto "N pendente(s)" para leitores de tela continua igual.

### Blocos ocultos quando recolhida
- O cartão "Campanha atual", o rótulo "MESA" e o `sidebarExtra` recebem `hidden` quando recolhida, e não só `display:none` em CSS.
- Assim, eles saem também da ordem de foco e da árvore de acessibilidade. O nome da campanha continua no cabeçalho (`preview-header__title`).

### Transição
- `grid-template-columns` com `transition` na `.preview-app`, usando `--motion-fast`.
- Sob `prefers-reduced-motion: reduce`, a transição é nula.

### Sala como padrão (item 2)
- `defaultTableView` passa a devolver `room` para os dois papéis, e `room` vira o primeiro item de `tableNavigation` nos dois papéis.
- **Por quê:** o padrão continua estático, sem depender de saber se o módulo está ativo. `MesaResumo` não traz essa informação, e consultar `/sala` antes de decidir a seção atrasaria a entrada.
- **Sala desligada:** é o próprio `RoomView` que mostra o aviso, com "Ativar sala" para o Narrador e "Abrir minha ficha" para o jogador. Para o atalho do jogador, `RoomView` recebe um `onAbrirFicha` opcional, e o shell do jogador passa `() => onNavigate("character")`.
- **Alternativa considerada:** padrão condicional ao módulo. Precisaria de um campo novo na API ou de uma consulta a mais, para um caso raro.

### Modo "palco" no `WorkspaceChrome`
- **Propriedade nova `palco`:** quando ela é verdadeira, a moldura:
  - não desenha o cabeçalho ilustrado nem o rodapé;
  - aplica a classe `workspace-app--palco`;
  - deixa o `<main>` com altura `calc(100dvh - altura da barra superior)` e `overflow:hidden`, sem o `padding` de `.preview-content`.
- **Quem liga:** os shells passam `palco={view === "room"}`.
- **Por quê:** o grid ganha a tela inteira sem duplicar a moldura. As outras seções não mudam.
- **Alternativa considerada:** só esconder o cabeçalho em CSS. O rodapé e o `padding` continuariam roubando altura, e o `<h1>` ilustrado continuaria no DOM.
- **Título acessível:** sem o cabeçalho, a Sala precisa de um `<h1>` oculto visualmente ("Sala — {nome da cena}"), para manter a estrutura de títulos da página.

### Grid em tela cheia e enquadramento
- `.room-canvas__surface` passa a ter altura 100% do contêiner da Sala. A Sala é um `position:relative` que ocupa o `<main>` do palco.
- **Função pura nova em `viewport.ts`:** `enquadrar(area, mapa, margem)`. Ela devolve a escala, limitada a `ZOOM_MINIMO` e `ZOOM_MAXIMO`, e a posição que centralizam o mapa na área.
- **Quando o `RoomCanvas` enquadra:**
  - quando fica pronto;
  - quando a cena muda;
  - quando o `ResizeObserver` da superfície detecta mudança de tamanho, desde que a pessoa não tenha mexido no zoom ou no arraste desde o último enquadramento (uma marca `ajustadoPelaPessoa`).
- "Centralizar" chama `enquadrar` e limpa a marca.
- **Por quê:** é a causa do mapa no canto da segunda imagem. Ser uma função pura deixa testar no `viewport.test.ts`, sem PixiJS.

### Faixa de cenas e painel lateral
- **Camadas sobre o grid:** dentro da Sala, posicionadas de forma absoluta sobre o canvas, com `pointer-events:auto` só nas próprias caixas:
  - `room-view__faixa`, no topo à esquerda, numa linha só, rolável na horizontal quando falta largura: botões das cenas, Ativar, campo e botão "Criar cena" e envio do mapa (`ImageUpload`, com a dica de formatos só para leitores de tela);
  - o botão do painel, no topo à direita;
  - os controles do mapa (zoom e "Centralizar"), que descem para o canto inferior direito;
  - os sinais temporários, no canto inferior esquerdo, e as mensagens do movimento, embaixo, no centro.
- **Painel por cima do grid (decisão do usuário em 2026-10-02):** o grid deve passar por trás de tudo, inclusive do painel. `room-view__painel` fica em posição absoluta à direita, com 22 rem. Para ele não esconder a cena, o `RoomCanvas` recebe `reservaDireita` (a largura do painel aberto, em px, ou 0 até 760 px, onde o painel é gaveta). O enquadramento centraliza a cena na parte livre e refaz o encaixe quando o painel abre ou fecha, desde que a pessoa não tenha mexido no zoom. O botão do painel e os controles do mapa se deslocam para a esquerda do painel aberto.

### Grade infinita (decisão do usuário em 2026-10-02)
- **O que se pediu:** o usuário pediu que o grid "tome a tela", inclusive por trás da faixa, do zoom e do painel. Entre as opções apresentadas (grade infinita, cena ampliada até cobrir a tela, cena do tamanho da tela), ele escolheu a **grade infinita**.
- **Como é feita:** `desenharCena` desenha primeiro uma grade de fundo de 200 casas além de cada borda da cena, mais fraca, e depois a área da cena: fundo próprio, mapa e linhas mais fortes, com uma borda dourada discreta. 200 casas cobrem a área mesmo no zoom mínimo (40%) numa tela de 2560 px, com folga para arrastar. Isso evita redesenhar a grade a cada arraste.
- **O que não muda:**
  - a validação: o arraste de token só aceita casas dentro da cena (já era assim), o ping fora da cena é ignorado, e o servidor continua sendo a autoridade sobre posições;
  - o tamanho da cena e a API.
- **Alternativa considerada:** redesenhar só a parte visível a cada mudança de vista. Seria "infinita" de verdade, mas exigiria redesenhar em cada movimento do ponteiro, com ganho nenhum na prática.
- **Folga do enquadramento:** 24 px nas laterais e 72 px em cima e embaixo, para a faixa e os controles não cobrirem o mapa enquadrado. `enquadrar` aceita margem diferente por eixo.
- **Painel lateral:** um `<aside aria-label="Painel da cena">` com tokens e movimento, `SceneStashes` e "Colocar token". O botão de mostrar e ocultar tem `aria-expanded` e `aria-controls`. Recolhido, o conteúdo recebe `hidden`. O estado é lembrado no `localStorage` (`cursed:mesa:painel-da-cena`), com a mesma tolerância do item 1. O padrão é aberto para o Narrador e fechado para o jogador.
- Os sinais temporários viram uma região `aria-live` discreta no canto inferior esquerdo.
- **Por quê:** é a direção "tudo da Sala" do usuário. Os controles continuam todos lá, e o grid fica com a maior parte da tela.
- **Alternativa considerada:** abas embaixo do grid. Continuariam roubando altura.

### Largura ajustável do painel (item 3)
- **A alça:** `room-view__alca`, na borda esquerda do painel, com `role="separator"`, `aria-orientation="vertical"`, `aria-valuemin`, `aria-valuemax` e `aria-valuenow` em px, `aria-controls="painel-da-cena"` e `tabIndex=0`.
- **Arraste:** usa `pointerdown` com `setPointerCapture`, depois `pointermove` e `pointerup`. Durante o arraste, a largura é uma prévia local, aplicada só ao CSS. Ao soltar, ela é confirmada, gravada e passada ao `RoomCanvas` como `reservaDireita`, que reenquadra uma vez.
- **Por quê:** reenquadrar a cada movimento faria o mapa "nadar" durante o arraste.
- **Teclado:** passo de 16 px, ou 64 px com Shift.
- **Limites:** 288 a 640 px (18 a 40 rem com fonte de 16 px), e o máximo também fica limitado a 60% da largura da Sala, medida no momento do ajuste. O CSS repete `max-width: 60%` como segurança se a janela encolher.
- **Valor padrão:** dois cliques voltam a 352 px.
- **Persistência:** `cursed:mesa:largura-painel`, com um `usePreferenciaNumerica` ao lado do `usePreferenciaLocal` e a mesma tolerância a armazenamento bloqueado.
- **CSS:** a largura vai para `--largura-painel` na `.room-view`. O painel, o deslocamento do topo e os controles do mapa usam essa variável no lugar do `22rem` fixo.

### Abas do painel e chão embaixo (item 4)
- **`PainelDaSala`, em `room/PainelDaSala.tsx`:**
  - as abas seguem o padrão WAI-ARIA: `role="tablist"`, `tab` com `aria-selected` e `aria-controls`, `tabpanel`, setas e Home e End, com foco móvel;
  - a aba fica guardada em `cursed:mesa:aba-do-painel` e o estado aberto continua em `CHAVE_PAINEL_DA_CENA`;
  - o botão "Recolher painel" fica no fim da faixa de abas. O botão do topo do grid passa a existir só com o painel fechado, e se chama "Abrir painel";
  - a alça de largura continua.
- **Cena:** o conteúdo atual, sem `SceneStashes`.
- **Chat:** marcação estática, com `textarea` e botão desativados (`disabled`) e o aviso.
- **Fichas, em `room/FichasDoPainel.tsx`:**
  - os retratos vêm de `usePersonagens(api, mesaId, false)` com `useRetrato(..., quadrado=true)`, e os próprios personagens (`proprietario_id === userId`) aparecem primeiro;
  - a faixa mostra quantos retratos couberem pelo tamanho (64 px mais o espaço entre eles), calculado com `ResizeObserver`, e as setas andam um retrato por vez;
  - o resumo segue o padrão de leitura da `Vitrine`: `useFichaSnapshot`, `useValoresDerivados`, `useInventario`, `useCartasDoPersonagem`, `useClasses` e `useListasFicha`, levando a `ResumoFicha` sem `permissoes`. O `onAbrir(secao)` do resumo abre a ficha completa naquela seção;
  - a ficha completa é `CharacterSheetPage` dentro do `Dialog` existente (`className="ficha-flutuante"`, larga). O `onBack` fecha a janela. A seção vai em `?secao=`, que a página já usa, e é limpa ao fechar.
- **Cartas, em `room/CartasDoPainel.tsx`:**
  - **Narrador:** `useCatalogo` mostra só as publicadas, com busca. `EnviarCartaDialog`, `NovaOfertaDialog` e `ApresentarDialog` passam a ser exportados de `NarratorLibrary.tsx`, e `NovaOfertaDialog` ganha `inicial?: string[]` (as versões já marcadas);
  - **Jogador:** `PlayerLibrary`, com as ofertas pendentes e o `OfferChooser`, mais, para cada personagem próprio, `useCartasDoPersonagem` em linhas com tipo, título e estado.
- **Chão e baús:**
  - `room-view__chao` fica no palco, preso embaixo, entre a borda esquerda e o painel;
  - um botão com `aria-expanded` abre o corpo, de `min(40vh, 22rem)` de altura e rolagem própria, com `SceneStashes`;
  - o estado fica em `cursed:mesa:chao-aberto`, com padrão fechado;
  - com o menu aberto, os controles do mapa, os sinais e os avisos sobem pela mesma altura (classe `room-view--chao-aberto`).
- **Por quê:** reaproveitar os componentes e as regras que já existem evita duplicar regra de cartas e ficha. O servidor continua decidindo o que cada um vê e pode fazer.

### Ajustes do painel (item 5)
- **Cenas na aba Cena:** a marcação da antiga faixa vira o grupo `role="group" aria-label="Cenas"`, no topo da aba Cena (só para o Narrador). Sobre o grid fica, para os dois papéis, só a etiqueta com o nome da cena aberta.
- **Filtro por tipo:** `FiltroDeTipo`, uma fileira de botões com `aria-pressed`. A contagem é feita sobre a lista já buscada, para o Narrador, e sobre todas as cartas dos próprios personagens, para o jogador. O filtro é local da aba, não fica guardado.
- **Miniatura:** `MiniaturaDaCarta`, um quadrado de 56 px.
  - Ordem da arte: `imagemPropria(conteudo)` lida com `useAssetImage`; depois o medalhão pintado da categoria, `arteDoMedalhao(categoriaDaCarta(...))`, conferido com `usePintura`; e, sem nenhum dos dois, o ícone da categoria.
  - **Por que o medalhão:** a arte quadrada inteira deixava o emblema pequeno demais em 56 px (ajuste do item 6).
  - A categoria usa `useCatalogoItens` para os itens, como na ficha.
- **Colunas:** a lista vira `grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr))`. Com o padrão de 352 px fica uma coluna, e a partir de cerca de 490 px de painel ficam duas.

### Corpos (item 6)
- **Como se reconhece um corpo:** pelo conteúdo, com `tipo === "item"` e as etiquetas `corpo` e `padrão` juntas, que o sistema grava (`cursed_platform/corpos.py`). A função `ehCorpo(tipo, conteudo)` fica em `cartas/apresentacao.ts`.
- **Categoria:** `categoriaDaCarta` devolve `corpos`, uma categoria de carta própria ao lado de habilidades, magias e efeitos (rótulo "Corpos", ícone `corpos`), antes de consultar o catálogo de itens.
  - **Primeira versão, recusada:** devolvia `criaturas` e usava a pintura dela. Mas a pintura de Criaturas é um lobo, e o usuário recusou em 2026-10-02: corpo é no mínimo humanoide.
  - **Ícone:** o ícone `corpos` reaproveita o traço humanoide do subtipo `criatura`.
  - **Pinturas:** as de corpos (arte quadrada, faixa e medalhão) foram geradas pelo Codex com `$imagegen` em 2026-10-02, a partir das artes aprovadas de Habilidades. O emblema é um corpo humanoide deitado, como num esquife. Na faixa, um guerreiro carrega um companheiro ferido e uma maca leva um corpo sob mortalha. As pinturas passaram pelo `preparar_arte.py`, que agora inclui a categoria `corpos`. Nenhuma pintura de outra categoria é usada.
  - **Conflito com a spec:** isso diverge da frase da spec `inventario-em-grade` que põe corpos carregados em Criaturas, mas só na apresentação das cartas. O inventário não muda.
- **Painel:** o filtro da aba Cartas agrupa por `grupoDoFiltro`, que é o tipo, ou `corpo` para os corpos. As opções ficam Habilidades, Magias, Itens, Corpos e Efeitos. Sem pintura, a miniatura de qualquer carta mostra o ícone da categoria, e não mais a inicial do tipo.
- **Por que não mudar o subtipo no servidor:** `criatura` existe como subtipo, mas não é criável e muda o que se pode equipar. Trocar o subtipo dos corpos exigiria uma migração das cartas e dos itens já concedidos, e uma decisão de regra sobre a D7. A classificação na tela resolve o pedido sem tocar no dado.
- **Limite:** um item já concedido na grade do inventário continua com a categoria do próprio item (Diversos), porque o item não carrega as etiquetas da carta.

### Cena sem bordas (item 7)
- **Servidor:**
  - `sala._dentro` deixa de comparar com colunas e linhas e passa a recusar só fora de ±`LIMITE_DA_CENA` (2000) casas;
  - `CriarTokenRequest` e `MoverTokenRequest` aceitam x e y entre −2000 e 2000 (422 fora disso);
  - colunas e linhas da cena continuam guardadas, como a área do mapa.
- **Banco:** a migração `0023_cena_sem_bordas` troca `ck_scene_tokens_posicao` por `x BETWEEN -2000 AND 2000 AND y BETWEEN -2000 AND 2000`. Na descida, volta a `x >= 0 AND y >= 0`, mas falha se houver token negativo, e diz isso no log.
- **Grade:**
  - um `TilingSprite` com a textura de uma casa (48 px e as linhas) cobre de −2000 a +2000 casas, sem custo por casa. Ele substitui a grade de fundo de 200 casas e a área destacada;
  - o mapa, quando há, é um `Sprite` na área do mapa, sem borda.
- **Enquadramento:** `enquadrar` recebe o retângulo de interesse no lugar do tamanho do mapa. Esse retângulo é a área do mapa (se houver) unida às casas dos tokens, com no mínimo 16 × 10 casas, para um token sozinho não virar zoom máximo. Sem nenhum dos dois, a origem fica no centro, em escala 1.
- **Interface:**
  - os campos de coluna e linha (colocar e mover token) aceitam negativos e não têm mais máximo pela cena;
  - o arraste e o ping deixam de checar `dentro`;
  - os anúncios de posição (token, ping, cursor e arraste) passam a usar a coordenada da grade como ela é (coluna x, linha y), sem somar 1, porque agora há coordenadas negativas.
- **Impacto:** nenhum na regra de mesa (`rules/sistema`); a Sala é ferramenta digital.

### Bolsa e Música (item 8)
- **`FaixaDeRetratos`, em `room/FaixaDeRetratos.tsx`:** a faixa de retratos com setas sai de `FichasDoPainel` e vira um componente, usado pelas Fichas e pela Bolsa.
- **`BolsaDoPainel`, em `room/BolsaDoPainel.tsx`:**
  - quem aparece: o Narrador vê todos os personagens de `usePersonagens`; o jogador, só os de `proprietario_id === userId`;
  - a bolsa é a `InventoryGridPanel` da ficha, com `useFichaSnapshot` (versão), `usePermissoesFicha`, `useEfeitos` e a conexão;
  - `onVersaoConfirmada` atualiza a versão no cache da ficha, como faz a `CharacterSheetPage`.
- **Música:** `MusicaReservada`, ao lado de `ChatReservado`.
- **Abas com ícone:**
  - os ícones vêm do `Glyph`: mapa (Cena), pergaminho (Chat), livro (Fichas), bolsa (Bolsa), cartas (Cartas) e uma nota musical nova (Música);
  - a faixa de abas é um contêiner CSS: abaixo de 30 rem, o nome fica só para leitores de tela (`sr-only`), e o `title` mostra o nome ao passar o ponteiro.

### Tokens da cena (item 9)
- **Movimento direto:** sai o `useCommandPreview` de um só token. No lugar, o `RoomView` guarda `previas: Record<tokenId, {x, y}>`, que é o estado otimista.
  - **Fluxo:** soltar o token (`onDragEnd`) ou "Mover" grava a prévia e manda `POST …/movimento` com a `versao_esperada` do token. Com sucesso, atualiza o cache da sala e limpa a prévia; com erro, limpa a prévia e anuncia o motivo ("… A última posição confirmada foi restaurada.").
  - **Sem conexão:** recusa na hora, com a mensagem de offline.
  - O canvas desenha com as prévias aplicadas.
- **Personagens dos jogadores:**
  - **Lista:** `usePersonagens` filtrado por `proprietario_id` não nulo, com o retrato de `useRetrato`.
  - **Colocar:** cria o token por `POST …/tokens` com `personagem_id`, `rotulo` igual ao nome e a primeira camada de visibilidade `mesa`.
  - **Arrastar:** usa HTML5 drag-and-drop, com o tipo `application/x-cursed-personagem`. O `RoomCanvas` aceita o `drop`, converte o ponto em casa e chama `onSoltarPersonagem(id, x, y)`.
  - **Botão "Colocar":** usa a casa livre mais próxima do centro da vista (`casaLivre`), que o canvas informa por `centroDaVistaRef`, para não cair em cima de outro token.
- **Retratos no canvas:**
  - o `RoomView` monta `retratos: Record<tokenId, url>`, com a imagem enviada (`useAssetImages`) ou `retratoPadrao(tipo, true)`;
  - o `RoomCanvas` carrega as texturas numa cache por URL e desenha cada token como círculo, com a máscara circular do retrato e o aro;
  - token sem retrato: círculo com as iniciais.

### NPCs e monstros (item 10)
- **Componente:** `PersonagensDosJogadores` vira `ListaDePersonagens`, usada duas vezes: os personagens com `proprietario_id` em "Personagens dos jogadores" e os sem dono em "NPCs e monstros". Na segunda lista aparecem também o tipo e a marca "oculto" (`visibilidade === "narrador"`).
- **Colocar e arrastar:** iguais ao item 9. O token vai para a camada da mesa. A ficha oculta não esconde o token (item 12, revisão): o jogador vê o token com o nome público, sem o vínculo com a ficha.

### Retirar token e aba Cena enxuta (item 11)
- **Retirar:** `DELETE /mesas/{mesa_id}/sala/tokens/{token_id}?versao_esperada=`, que já existia e é só do Narrador, com auditoria `token.removido`. O `RoomView` usa uma mutação que, com sucesso, invalida a sala e limpa a seleção se o token retirado estava escolhido, e com erro anuncia o motivo.
- **Removidos da aba Cena:**
  - o botão de ping por token;
  - o formulário de movimento por coordenadas;
  - o formulário "Colocar token" com rótulo, camada, coluna e linha.

  Os estados `rotulo`, `x`, `y`, `camada` e `destino` saem junto. O `useMovimentoDeTokens` continua, chamado só pelo arraste.
- **Acessibilidade:** perde-se o movimento pelo teclado, e isso fica registrado na proposta como consequência aceita pelo usuário.

### Ocultar tokens, tamanho do mapa e arraste estável (item 12)
- **Ocultar e mostrar:** usa `POST …/tokens/{token_id}/visibilidade` com `{ oculto, versao_esperada }`, que já existia e é só do Narrador. O Narrador já recebe `oculto` em `TokenSala`. O canvas desenha o token oculto com `alpha` de 0,45 e um aro tracejado. Na lista, o botão de olho (`Glyph` "eye" e "eye-off", que é novo) tem `aria-pressed`.
- **Tamanho do mapa:**
  - **Servidor:** rota nova `POST /mesas/{mesa_id}/sala/cenas/{cena_id}/area-do-mapa`, com `{ colunas, linhas }` de 1 a 200 (o mesmo limite de `ck_scenes_grade`), só para o Narrador. Ela usa `sala.redimensionar_mapa`, que avança a versão da cena e emite `sala.atualizada`, e registra a auditoria `cena.mapa_redimensionado`;
  - **Banco:** sem migração;
  - **Interface (`TamanhoDoMapa`):** barras `range` de 1 a 200 que mostram o valor (`aria-valuetext`) e aplicam em `pointerup`, `keyup` e `blur`, só se algo mudou. "Manter proporção" (lembrada em `cursed:mesa:mapa-proporcional`) deixa uma barra, "Tamanho", cujo máximo respeita a razão; desligada, há uma barra para colunas e outra para linhas, partindo das linhas proporcionais. O controle é recriado (`key`) quando colunas ou linhas mudam no servidor. O enquadramento passa a depender também de colunas e linhas.
  - **Envio do mapa:** `ImageUpload` ganhou a aparência `miniatura`, com `previa` (a imagem já carregada para o grid). É um botão-quadro em 16:9 com a amostra, ou vazio e tracejado com ícone e "Enviar mapa da cena"; os formatos e o limite vão na dica (`title`). O "×" de remover fica no canto, e os erros, abaixo.
- **Arraste estável:**
  - os ouvintes do ponteiro do `RoomCanvas` passam a ser criados uma vez (dependem só de `pronto`) e leem a cena e as funções por referências (`cenaAtual` e `acoes`). O arraste em curso fica em `arrasteRef`, e um redesenho no meio do arraste repõe a peça sob o ponteiro;
  - a seleção vem do clique sem arrastar, e não do `pointertap` do Pixi;
  - o `RoomView` passa a mesma cena quando não há prévia, e o canvas compara os retratos pelo conteúdo, para não redesenhar à toa.

### Ficha oculta é diferente de token oculto (item 12, revisão de 2026-10-02)
- **Problema:** antes, `token_visivel` escondia o token de todo personagem com ficha oculta (`visibilidade = "narrador"`), que é o padrão dos monstros. Por isso um monstro posto na cena, com o token visível, não aparecia para os jogadores. O usuário decidiu: "ficha oculta é uma coisa, token oculto tem que ser outra coisa".
- **Regra nova no servidor:**
  - **Quem vê o token:** decidem só a camada (da mesa) e o próprio token (`oculto`). A ficha oculta não entra na conta. Personagem excluído continua escondendo o token.
  - **O que o jogador recebe:** `sala.token_para` monta o token por leitor.
    - **Primeira versão, descartada:** trocava o rótulo pelo nome público ou "Criatura desconhecida". O usuário decidiu que o token visível mostra o nome real e a foto.
    - **Como ficou:** com a ficha oculta, o jogador só não recebe o `personagem_id`, porque não pode abrir a ficha.
    - **Tipo do personagem:** todo token ligado leva `tipo_personagem`, para a arte padrão.
  - **Foto:** a rota nova `GET /mesas/{mesa_id}/sala/tokens/{token_id}/retrato` entrega a foto do personagem ligado (versão de exibição) a quem pode ver o token (`_token`, 404 para quem não vê), reaproveitando `assets.ler_imagem`. Sem foto enviada, responde 404 e o cliente usa `retratoPadrao(tipo)`. O `useRetratosDosTokens` busca as fotos por essa rota, para o Narrador e para o jogador.
  - **Colocar oculto:** a chave `cursed:mesa:colocar-oculto` (padrão desligada) manda `oculto` na criação do token.
- **Interface:** a lista "NPCs e monstros" marca "ficha oculta", e não mais "oculto", para não se confundir com o token oculto do botão de olho.
- **Testes:** `test_sala`. O NPC com ficha oculta aparece ao jogador como "Criatura desconhecida", sem `personagem_id`, sem o nome verdadeiro na resposta e sem controle (403 ao mover).

### Sala atualizada sem recarregar (item 12)
- **Situação encontrada:** o servidor já emite `sala.atualizada` ao pôr, mover, ocultar, mostrar e retirar tokens, inclusive ao tópico da mesa quando o token passa a ser visto ou deixa de ser. A Sala também já recarrega com esses avisos (`RoomPresence`). Mas os avisos só existem com o Supabase Realtime; no ambiente local (SQLite, identidade de desenvolvimento) não há tempo real, e o jogador precisava recarregar a página.
- **Solução:** a consulta da sala ganha `refetchInterval`, por `intervaloDaSala` em `room/atualizacao.ts`: 1 s sem tempo real (antes 3 s; reduzido a pedido do usuário) e 15 s com tempo real. O compartilhamento estrutural do TanStack Query mantém os mesmos objetos quando nada muda, então o canvas não redesenha.

### Permissão de movimento (item 13)
- **Banco:** a migração `0024_movimento_dos_tokens` acrescenta `scene_tokens.movimento_liberado` (booleano, não nulo, padrão verdadeiro), e os tokens existentes ficam liberados, que é o comportamento de antes. A lista de quem move um token sem dono usa os `controladores`, que já existiam.
- **Regra (`sala.pode_controlar`):** o Narrador sempre move; um token não visível, nunca; um token bloqueado, só o Narrador; um token liberado, o dono do personagem ligado ou um dos `controladores`.
- **Criação:** `movimento_liberado` vale verdadeiro para personagem com dono e, para os demais, verdadeiro só se vierem `controladores`.
- **Rotas, só do Narrador:**
  - `POST …/sala/tokens/{id}/movimento-permitido` com `{ liberado, controladores?, versao_esperada }`, que valida os controladores como membros da mesa;
  - `POST …/sala/cenas/{id}/permissoes` com `{ modo: "bloquear_todos" | "so_principais" | "liberar_todos" }`.

  As duas avançam a versão do token (um movimento em curso com versão antiga recebe 409), emitem `sala.atualizada` e registram auditoria do Narrador.
- **Interface:**
  - cadeado por token (glifos `lock` e `unlock` novos);
  - para token sem dono, um diálogo com os jogadores da mesa (`useParticipantes`) para escolher quem move;
  - três botões de lote no topo da seção "Tokens da cena".

### Seções retráteis (item 14)
- **Componente:** `SecaoRetratil`, uma `section` rotulada pelo botão do título, com `aria-expanded` e `aria-controls`, a contagem `aria-hidden` e o corpo só montado quando aberta.
- **Estado:** fica em `cursed:mesa:secao:{id}` (`cenas`, `jogadores`, `npcs`, `tokens`). A seção "Cenas" mantém o papel `group`.

### Seção "Tokens" (item 15)
- **`SecaoRetratil`** ganhou `interna`, que usa título `h3`, fonte menor e um filete à esquerda.
- **Narrador:** `RoomView` envolve `PersonagensDosJogadores` (dica, chave e as listas "jogadores" e "npcs") e "Tokens da cena" numa `SecaoRetratil` `tokens-grupo`, com título "Tokens" e sem contagem, para não competir com a das listas internas.
- **Jogador:** "Tokens da cena" continua como seção de nível 2, sem o envoltório.

### Telas estreitas
- Até 760 px, a faixa de cenas vira uma linha rolável na horizontal.
- O painel lateral vira uma gaveta de baixo, que cobre até 60% da altura quando aberta.
- O grid fica entre a barra superior e a navegação inferior.

## Risks / Trade-offs

- [Os atalhos do Narrador (Preparar descanso) ficam fora do trilho] → É um clique a mais para expandir. Se o usuário quiser o atalho no trilho, vira item seguinte desta mudança.
- [A animação da grade pode causar reflow em telas pesadas, como a sala] → A transição é curta e só a coluna muda. Se travar, a troca passa a ser instantânea.
- [Testes jsdom não medem layout] → Os testes verificam estado, nomes, `aria-expanded`, `hidden` e persistência. A aparência fica para captura e aprovação do usuário.

- [O jogador que entrava em Minha ficha agora cai na Sala] → É um pedido explícito do usuário. A ficha continua a um clique, e o aviso de Sala desativada tem o atalho.
- [Painel por cima do grid pode cobrir tokens] → O enquadramento desconta a largura do painel aberto. Se a pessoa arrastar a cena para baixo do painel, basta "Centralizar".
- [Faixa de cenas larga em telas estreitas] → Uma linha só, rolável na horizontal, com barra fina. Com muitas cenas, pode virar um seletor (item futuro, se o usuário pedir).
- [PixiJS e `ResizeObserver` não existem no jsdom] → `enquadrar` é testada pura. O comportamento do canvas fica para verificação no navegador local e para as capturas.
- [Testes de `RoomView` que procuram os blocos em ordem fixa] → Atualizar os testes para procurar por papel e nome, não por posição.

## Migration Plan

Só frontend, sem dados. As chaves novas do `localStorage` não precisam de migração. Na ausência da chave, a barra começa expandida, como hoje.

## Impacto sobre o jogo

Sem efeito sobre escassez, risco de combate ou regras. Durante a cena, reduz a carga visual e dá mais espaço à sala e à ficha, o que ajuda o ritmo da mesa. Começar pela Sala põe a cena compartilhada no centro da sessão, de acordo com o foco narrativo do projeto.
