# Proposta — experiencia-da-mesa

## Why

Durante a sessão, a tela da mesa (`/mesas/{id}`) é onde o Narrador e os jogadores passam mais tempo: a sala, a ficha, as cartas e o registro. Hoje a barra lateral esquerda ocupa 238 px fixos o tempo todo. Ela repete o nome da campanha e o papel, que já aparecem no cabeçalho, e tira largura justamente das telas mais densas: a grade da sala, a folha de cartas e a ficha. Em notebook, isso força rolagem e aperta o conteúdo que importa para a cena.

O usuário pediu (2026-10-02) para melhorar a experiência de entrar na campanha. O **primeiro item** é tornar a barra lateral retrátil. Esta mudança reúne os próximos pedidos sobre a experiência da mesa: cada novo pedido entra aqui como item.

Classificação: **núcleo**, só de interface. A mudança não altera regra, número, dado da mesa nem o livro de regras.

## What Changes

- **Item 1 — Barra lateral retrátil (pedido de 2026-10-02):**
  - um botão no topo da barra recolhe e expande a barra, com estado anunciado a leitores de tela;
  - **recolhida**, a barra vira um trilho estreito com:
    - o emblema simplificado da marca, que o requisito de marca da `identidade-visual-da-plataforma` já prevê para a "barra lateral recolhida";
    - os ícones das seções da mesa, com o nome em dica e para leitores de tela;
    - os contadores de pendências, como pontos;
    - o ícone de volta a Campanhas;
  - o cartão "Campanha atual" e os blocos exclusivos do papel (atalhos do Narrador, cartão do personagem do jogador) só aparecem com a barra expandida;
  - o conteúdo da mesa ocupa a largura liberada;
  - a escolha é lembrada neste navegador, para as duas mesas e os dois papéis. A barra começa expandida na primeira visita;
  - em telas estreitas (até 760 px) nada muda: a barra continua oculta, com a navegação inferior.
- **Item 2 — A Sala como página principal, com o grid tomando a tela (pedido de 2026-10-02):**
  - **direção do usuário:** a Sala deve ser uma experiência de página única. Tudo deve ser possível ver e fazer de lá. Este item é o primeiro passo dessa direção; os passos seguintes entram como novos itens;
  - **entrada na Sala:**
    - Narrador e jogador passam a entrar na mesa pela **Sala**, e não mais pela Visão geral ou por Minha ficha;
    - a Sala vira o primeiro item da navegação da mesa;
    - links com `?painel=` continuam abrindo a seção pedida;
  - **sem cabeçalho:** a Sala deixa de ter o cabeçalho ilustrado ("SALA / Cena compartilhada" com a pintura do castelo) e o rodapé da plataforma. A barra superior continua: título, conexão, presença e Sair;
  - **grid ocupando a tela:**
    - o grid preenche toda a altura e a largura disponíveis abaixo da barra superior, sem rolar a página;
    - ao abrir uma cena, o mapa inteiro se enquadra e centraliza na área. "Centralizar" volta a esse enquadramento, e não mais a 100% no canto;
    - **grade infinita (escolha do usuário em 2026-10-02):** as linhas da grade cobrem a tela inteira, inclusive por trás da faixa, do zoom e do painel. A área da cena fica destacada, e tokens só ficam dentro dela;
  - **controles por cima do grid:**
    - a escolha e a criação de cenas viram uma faixa compacta sobre o grid, só para o Narrador;
    - a lista de tokens, o movimento por número, os baús da cena e "Colocar token" saem de baixo do grid. Eles vão para um **painel lateral recolhível** à direita, por cima do grid. O enquadramento desconta o painel aberto;
  - **Sala desativada:** se o módulo da Sala estiver desligado, ela mostra o aviso no lugar do grid. O Narrador pode ativar o módulo dali, e o jogador vê um atalho para Minha ficha.
- **Item 3 — Largura ajustável do painel da cena (pedido de 2026-10-02):**
  - o painel da direita na Sala ganha uma alça na borda esquerda, que se arrasta para alargar ou estreitar o painel;
  - pelo teclado, a alça recebe foco e se ajusta com as setas; Home leva ao mínimo e End ao máximo;
  - limites: de 18 rem até 40 rem, sem passar de 60% da largura da Sala. Dois cliques na alça voltam à largura padrão (22 rem);
  - a largura é lembrada neste navegador. O enquadramento da cena acompanha a nova largura ao soltar a alça;
  - em telas estreitas (até 760 px), o painel continua como gaveta de baixo, sem alça.
- **Item 4 — Painel da Sala com abas, e chão e baús embaixo do grid (pedidos de 2026-10-02):**
  - **Abas no topo do painel direito:** o botão "Ocultar painel da cena" dá lugar a abas fixas, que escolhem o que o painel mostra (decisão do usuário: abas, e não menu suspenso). Um botão recolhe o painel. Recolhido, um botão no canto do grid o reabre. A aba escolhida fica lembrada neste navegador. As abas são:
    - **Cena:** tokens, movimento e, para o Narrador, "Colocar token";
    - **Chat:** só um espaço reservado nesta etapa. Avisa que o chat da mesa vem depois e que o registro da mesa vai aparecer nele. O campo de mensagem fica desativado;
    - **Fichas:**
      - no alto, uma faixa de retratos circulares dos personagens, com setas `<` e `>` para navegar;
      - embaixo, o resumo da ficha do personagem escolhido;
      - o botão "Abrir ficha completa" abre a ficha inteira numa janela flutuante por cima da Sala;
      - o Narrador vê todos os personagens da mesa; o jogador vê o próprio e os que a mesa deixa visíveis;
    - **Cartas:**
      - o Narrador vê as cartas já publicadas, com busca, e de cada uma pode **enviar** a um personagem, **ofertar** e **apresentar** à mesa. Criar e editar cartas continua na Biblioteca;
      - o jogador vê as cartas que os próprios personagens têm e as ofertas que aguardam a escolha dele;
  - **Chão e baús:** saem do painel direito e vão para um **menu retrátil na parte de baixo do grid**, que fica lembrado aberto ou fechado.
- **Item 5 — Ajustes do painel (pedidos de 2026-10-02):**
  - **Cenas na aba Cena:** a escolha, a ativação e a criação de cenas e o envio do mapa saem da faixa sobre o grid e vão para o topo da aba Cena (só para o Narrador). Sobre o grid fica só o nome da cena aberta;
  - **filtro por tipo nas cartas:** a aba Cartas ganha um filtro por tipo (Todas, Habilidades, Magias, Itens e Efeitos, com contagem e só os tipos presentes), que se soma à busca, para o Narrador e para o jogador;
  - **cartas com imagem:** cada carta da aba mostra uma miniatura da arte (a imagem própria enviada pelo Narrador ou a pintura da categoria), sem crescer em altura. Com o painel largo, as cartas ficam lado a lado, em pelo menos duas colunas.
- **Item 6 — Corpos separados dos itens (pedido de 2026-10-02):**
  - **Na aba Cartas:** as oito cartas de corpo do sistema (Corpo Minúsculo… Grande, inteiro e "com ajuda") saem do filtro Itens e ganham o filtro próprio **Corpos**.
  - **Imagem:** os corpos têm categoria e figura próprias, **Corpos**, com uma figura **humanoide**. A pintura de Criaturas (um lobo) não serve para corpo, e o usuário recusou essa troca em 2026-10-02. As pinturas próprias (`cartas-arte-corpos`, `cartas-faixa-corpos` e `cartas-medalhao-corpos`) foram geradas pelo Codex, no estilo das demais categorias.
  - **Fora da Sala:** nas cartas da ficha e na Biblioteca, os corpos também passam a ficar na categoria Corpos.
  - **O que não muda:** o dado salvo, o servidor e a regra. A decisão D7 de carga-por-espacos (o corpo é item do tipo Outros, não empilha e não ocupa mãos) continua valendo. Só a classificação na tela muda.
- **Item 7 — A cena é um espaço sem bordas (decisão do usuário em 2026-10-02):** "a cena é uma dimensão nova da mesa, não um quadrado, é quase como uma mesa nova".
  - **Sem limite de casas:** a cena deixa de ser um tabuleiro de colunas × linhas. Tokens podem ficar em qualquer casa da grade, inclusive em coordenadas negativas. O servidor guarda só um limite de sanidade de ±2000 casas em cada eixo.
  - **Colunas e linhas viram a área do mapa:** onde o mapa enviado pelo Narrador é desenhado. Sem mapa, a Sala não mostra quadrado, borda nem fundo diferente: é só a grade.
  - **Enquadramento:** abrir uma cena enquadra o mapa e os tokens. Sem nenhum dos dois, centraliza a origem em 100%.
  - **Migração 0023:** troca a restrição `ck_scene_tokens_posicao` (x e y ≥ 0) pelo limite de ±2000. Aplicada no banco local; no Supabase de testes, só com confirmação do usuário.
- **Item 8 — Abas Bolsa e Música (pedido de 2026-10-02):**
  - **Bolsa:** mostra o inventário em grade de um personagem. No alto fica a mesma faixa de retratos das Fichas, para o Narrador escolher de quem é a bolsa; o jogador vê só a dos próprios personagens. A grade é a mesma da ficha, com as mesmas regras de edição;
  - **Música:** só um espaço reservado nesta etapa, como o Chat;
  - **Ordem e espaço:** com seis abas, a ordem fica Cena · Chat · Fichas · Bolsa · Cartas · Música. Com o painel estreito, as abas mostram só o ícone, e o nome continua para leitores de tela e como dica.
- **Item 9 — Tokens da cena (pedido de 2026-10-02):**
  - **Movimento direto:** soltar um token no grid já o move, sem passo de "Confirmar movimento". O servidor continua validando controle, limite e versão; se recusar, o token volta à última posição confirmada e o motivo é anunciado. Pelo teclado, o painel mantém coluna e linha com o botão **Mover**;
  - **Personagens dos jogadores para o Narrador:** na aba Cena, o Narrador vê a lista dos personagens dos jogadores, cada um com o retrato redondo. Pode arrastar um deles para o grid, ou usar o botão **Colocar**, que o põe no centro da vista. Quem já está na cena aparece marcado;
  - **Tokens redondos com foto:** o token ligado a um personagem é um círculo com o retrato dele e aro dourado. O token sem personagem é um círculo com as iniciais.
- **Item 10 — NPCs e monstros numa lista à parte (pedido de 2026-10-02):** na aba Cena, abaixo dos personagens dos jogadores, o Narrador vê a lista **NPCs e monstros**: os personagens sem dono. Cada um aparece com o retrato redondo, o tipo (NPC, Monstro ou Personagem) e a marca "ficha oculta" quando a ficha está escondida dos jogadores. Pôr na cena funciona igual: "Colocar" ou arrastar para o grid. O Narrador decide, ao colocar, se o token entra visível ou oculto (revisão do item 12).
- **Item 11 — Retirar tokens e enxugar a aba Cena (pedidos de 2026-10-02):**
  - **Retirar:** na lista "Tokens da cena", o Narrador tem o botão **Retirar** em cada token, que o tira da mesa. O servidor já só permite isso ao Narrador e confere a versão;
  - **Sai da aba Cena, a pedido do usuário:** "Enviar ping neste token" (o ping continua com dois cliques no mapa), coluna e linha de destino com "Mover" e o formulário "Colocar token" (os tokens entram pelas listas de personagens, NPCs e monstros);
  - **Consequência registrada:** sem os campos de coordenada, mover um token passa a ser só arrastando no grid, sem alternativa pelo teclado. Se for preciso, um movimento pelas setas do teclado no token escolhido pode voltar como item futuro.
- **Item 12 — Ocultar tokens e tamanho do mapa (pedidos de 2026-10-02):**
  - **Ocultar e mostrar:** na lista "Tokens da cena", o Narrador tem um botão de olho em cada token. Ocultar tira o token da vista dos jogadores, e mostrar o devolve. No grid do Narrador, o token oculto aparece translúcido. Usa a rota de visibilidade que já existia;
  - **Tamanho do mapa:** na aba Cena, o Narrador ajusta quantas casas o mapa ocupa (colunas × linhas), e pode manter a proporção atual. Para isso, uma rota nova do servidor muda a área do mapa da cena; o mapa e o enquadramento acompanham;
  - **Ficha oculta ≠ token oculto (correção, decisões do usuário):**
    - **O problema:** a ficha oculta de um monstro escondia também o token dele, então o monstro posto no grid não aparecia aos jogadores;
    - **A ficha oculta:** agora só impede o jogador de abrir a ficha;
    - **Quem vê o token:** decide o Narrador, ao colocá-lo, pela chave "Colocar oculto dos jogadores", e depois pelo olho da lista;
    - **O que o token visível mostra:** o nome real e a foto do personagem. A foto vem por uma rota do token, que segue a visibilidade do token; o jogador recebe a foto e não recebe o vínculo com a ficha oculta;
    - **Onde muda:** a regra de visibilidade do servidor (`cursed_platform/sala.py`) e a rota nova `GET …/sala/tokens/{id}/retrato`;
  - **Arraste de primeira (correção):** pressionar e arrastar um token já o move. Antes, o primeiro gesto só selecionava, porque o redesenho da Sala recriava os ouvintes do ponteiro. Agora a seleção vem de um clique sem arrastar.
- **Item 13 — Permissão de movimento dos tokens (pedido de 2026-10-03):** o Narrador decide quem move cada token.
  - **Por token:** um cadeado na lista "Tokens da cena". Token de personagem de jogador liberado: o dono move. Token de NPC, monstro ou sem dono liberado: só os jogadores que o Narrador escolher (opção B do usuário). Bloqueado: só o Narrador;
  - **Em lote, na seção "Tokens da cena":** "Bloquear todos", "Só personagens principais" (libera os tokens de personagens de jogador e bloqueia o resto) e "Liberar todos";
  - **Padrão ao colocar:** token de personagem de jogador entra liberado; NPC e monstro entram bloqueados;
  - **Quem garante é o servidor:** ele recusa o movimento de token bloqueado. Migração `0024` (coluna `movimento_liberado`; os tokens existentes ficam liberados, como se comportavam).
- **Item 14 — Seções retráteis na aba Cena (pedido de 2026-10-03):** "Cenas", "Personagens dos jogadores", "NPCs e monstros" e "Tokens da cena" abrem e fecham pelo título, com a quantidade ao lado, e ficam lembradas neste navegador.
- **Refinos do item 12 (pedidos de 2026-10-03):**
  - **Tamanho do mapa:** o formulário com "Aplicar" virou uma barra de arrastar, aplicada ao soltar. Com "Manter proporção" ligada, há uma barra só; desligada, uma para colunas e outra para linhas;
  - **Mapa da cena:** os links "Trocar/Remover mapa da cena" deram lugar a um quadro com a amostra do mapa no board, ou a um quadro vazio tracejado quando não há mapa. Clicar no quadro envia ou troca a imagem, e um "×" no canto a remove.
- **Item 15 — Seção "Tokens" (pedido de 2026-10-03):** para o Narrador, uma seção retrátil única "Tokens" reúne a dica, a chave "Colocar oculto dos jogadores" e, como seções retráteis internas, os personagens dos jogadores e, separados deles, os NPCs e monstros, além dos tokens da cena. O jogador continua vendo só "Tokens da cena".
- **Itens seguintes:** a definir com o usuário e acrescentados a esta proposta. A direção do item 2 indica, por exemplo, abrir ficha, cartas e registro sem sair da Sala, mas nada disso está decidido.

## Non-goals

- Não remover nem renomear seções da mesa. Só a Sala muda de posição, para o primeiro lugar.
- Não mudar regras do grid, validação no servidor, camadas, movimento nem baús da cena. A Sala reorganiza onde essas coisas aparecem.
- Não trazer ainda ficha, cartas ou registro para dentro da Sala. Isso fica para itens futuros, se o usuário pedir.
- Não mexer na barra superior das seções fora da mesa (Início, Campanhas, Personagens, Biblioteca), nem na barra lateral de Campanhas.
- Não mudar a navegação móvel inferior.
- Não guardar a preferência no servidor nem na conta. Ela é conveniência deste navegador, não dado da mesa.
- Não redesenhar o conteúdo dos blocos exclusivos do papel.

## Capabilities

### New Capabilities
- `experiencia-da-mesa`: moldura, navegação e Sala da área da mesa (`/mesas/{id}`) para Narrador e jogador. Cobre a barra lateral retrátil e a Sala como página principal, com o grid tomando a tela.

### Modified Capabilities
<!-- Nenhuma: o requisito de marca em identidade-visual-da-plataforma já prevê a barra lateral recolhida. -->

## Impact

- **Interface:**
  - `platform/frontend/src/app/shells/WorkspaceChrome.tsx`: estado de recolhida, botão e trilho;
  - `platform/frontend/src/design/preview.css` e `tema-telas.css`: grade da `.preview-app` e estilos do trilho.
- **Interface da Sala:**
  - `platform/frontend/src/app/tableNavigation.ts`: Sala como padrão e primeiro item;
  - `shells/NarratorShell.tsx`, `shells/PlayerShell.tsx` e `WorkspaceChrome.tsx`: a Sala sem cabeçalho ilustrado nem rodapé;
  - `room/RoomView.tsx`, `room/RoomCanvas.tsx`, `room/viewport.ts` e `room/room.css`: grid em tela cheia, enquadramento, faixa de cenas e painel lateral.
- **Testes:**
  - `platform/frontend/src/app/shells/shells.test.tsx`;
  - `room/RoomView.test.tsx`;
  - `room/viewport.test.ts`;
  - `TableWorkspace.test.tsx`.
- **Sem impacto até o item 6:** API, banco, migrações, catálogos e `rules/sistema`. **O item 12 acrescenta** a rota `POST /mesas/{mesa_id}/sala/cenas/{cena_id}/area-do-mapa`. **O item 7 muda** a regra de posição da sala em `cursed_platform/sala.py`, os contratos de token em `contracts.py`, a restrição do banco (migração `0023`) e os testes de `cursed_platform/tests/test_sala.py`.
