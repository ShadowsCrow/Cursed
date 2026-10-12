# Spec Delta

## MODIFIED Requirements

### Requirement: Abas do painel da Sala
O painel direito da Sala SHALL ter abas fixas no topo, nesta ordem: **Cena**, **Dados**, **Chat**, **Fichas**, **Bolsa**, **Cartas** e **Música** (Bolsa e Música no item 8; Dados na mudança `rolador-de-dados`). Cada aba SHALL ter ícone e nome; com o painel estreito, SHALL mostrar só o ícone, mantendo o nome como nome acessível e dica. As abas SHALL seguir o padrão de abas acessível: lista de abas, a aba atual anunciada como selecionada, troca pelas setas e conteúdo associado à aba.

Um botão "Recolher painel" SHALL fechar o painel. Com o painel fechado, um botão "Abrir painel" no canto superior direito do grid SHALL reabri-lo na última aba usada. A aba escolhida e o estado aberto ou fechado SHALL ser lembrados neste navegador, sem ir ao servidor. A aba padrão é Cena.

O que cada aba mostra:
- **Cena:** para o Narrador, no topo, o grupo **Cenas** (cena aberta, troca, ativação, criação e envio do mapa); para todos, os tokens da cena; e, só para o Narrador, "Retirar" em cada token e as listas de personagens dos jogadores e de NPCs e monstros;
- **Dados:** o rolador de dados, descrito na capacidade `rolador-de-dados`;
- **Chat:** nesta etapa, só um espaço reservado. Ele avisa que o chat da mesa ainda vai chegar e que o registro da mesa vai aparecer nele, e o campo de mensagem e o botão de enviar ficam desativados.

#### Scenario: Trocar de aba
- **WHEN** o jogador escolhe a aba "Fichas"
- **THEN** o painel mostra as fichas, a aba "Fichas" é anunciada como selecionada, e ao recarregar o painel volta em "Fichas"

#### Scenario: Recolher e reabrir
- **WHEN** o Narrador escolhe "Recolher painel" e depois "Abrir painel"
- **THEN** o painel some, o grid fica livre, e depois o painel volta na mesma aba

#### Scenario: Chat reservado
- **WHEN** alguém abre a aba "Chat"
- **THEN** vê o aviso de que o chat vem depois, com o campo de mensagem desativado, e nenhuma mensagem é enviada

#### Scenario: Dados logo depois de Cena
- **WHEN** alguém abre a Sala
- **THEN** a segunda aba do painel é "Dados", entre "Cena" e "Chat", e a seta para a direita a partir de Cena leva a Dados

### Requirement: NPCs e monstros na cena
Na aba Cena, o Narrador SHALL ver, separada da lista dos jogadores, a lista **NPCs e monstros**, com os personagens da mesa sem dono. Cada item SHALL mostrar o retrato redondo, o nome, o tipo (NPC, Monstro ou Personagem) e, quando a ficha estiver oculta dos jogadores, a marca "ficha oculta". Os que já têm token na cena SHALL aparecer marcados "na cena". Colocar na cena SHALL funcionar como para os jogadores: "Colocar" ou arrastar para o grid.

A ficha oculta SHALL NOT esconder o token: ela só impede o jogador de abrir a ficha. Quem decide se o jogador vê o token é o Narrador:
- ao colocá-lo, pelo botão **"Colocar oculto"** (olho cortado) ao lado de "Colocar" em cada personagem das duas listas, que põe o token já oculto; "Colocar" e o arraste põem o token visível (melhorias-da-sala, item 4, que retirou a chave geral "Colocar oculto dos jogadores");
- depois, pelo olho da lista de tokens.

O token visível SHALL mostrar o nome real e a foto do personagem (ou a arte padrão do tipo). Com a ficha oculta, o jogador SHALL receber o token sem o vínculo com a ficha, e a foto SHALL vir por uma rota do token que segue a visibilidade do token. O jogador SHALL NOT ver essa lista.

#### Scenario: Pôr um monstro de ficha oculta, visível
- **WHEN** o Narrador coloca, com "Colocar", um monstro marcado "ficha oculta"
- **THEN** o token aparece para os jogadores com o nome e a foto do monstro, e eles não conseguem abrir a ficha

#### Scenario: Pôr já oculto
- **WHEN** o Narrador escolhe o olho cortado ao lado de "Colocar" no monstro
- **THEN** o token entra oculto: aparece translúcido para o Narrador e não aparece para os jogadores

#### Scenario: Token oculto
- **WHEN** o Narrador oculta esse token pelo botão de olho
- **THEN** o token some para os jogadores

#### Scenario: Listas separadas
- **WHEN** a mesa tem Lion (de um jogador), um NPC e um monstro
- **THEN** Lion aparece em "Personagens dos jogadores" e o NPC e o monstro em "NPCs e monstros"

#### Scenario: Sem chave geral
- **WHEN** o Narrador abre a seção "Tokens" da aba Cena
- **THEN** não há a chave "Colocar oculto dos jogadores"; cada personagem tem "Colocar" e o olho cortado, e o arraste põe o token visível

### Requirement: Seção "Tokens" na aba Cena
Para o Narrador, a aba Cena SHALL ter uma seção retrátil única "Tokens" com, nesta ordem: a dica de arrastar, "Colocar" ou o olho cortado (que põe já oculto) e as seções retráteis internas "Personagens dos jogadores", "NPCs e monstros" (separadas) e "Tokens da cena". Fechar "Tokens" SHALL recolher tudo isso de uma vez, e cada seção interna SHALL continuar abrindo e fechando por si e lembrada neste navegador. O jogador SHALL ver só "Tokens da cena", sem a seção em volta.

#### Scenario: Recolher todos os tokens
- **WHEN** o Narrador fecha "Tokens"
- **THEN** a dica, as listas de personagens e os tokens da cena somem, e "Cenas" continua como estava

## ADDED Requirements

### Requirement: Controle de zoom compacto
O controle de zoom da Sala SHALL ocupar pouco espaço do grid e seguir o visual do sistema: a mesma moldura escura, translúcida e com borda ornamentada do nome da cena, e botões sem o fundo cinza padrão do navegador. Ele SHALL ter, nesta ordem: **Reduzir mapa** (−), a porcentagem atual em texto pequeno, **Ampliar mapa** (+) e **Centralizar** como ícone. Cada botão SHALL ter pelo menos 24 px de lado, nome acessível e dica com o nome; a porcentagem SHALL continuar anunciada a leitores de tela. O controle SHALL ter no máximo 2,25 rem de altura em telas com mais de 760 px.

O comportamento SHALL NOT mudar: os mesmos passos de zoom, o mesmo enquadramento em "Centralizar" e a mesma posição no canto inferior direito do grid, à esquerda do painel aberto.

#### Scenario: Centralizar pelo ícone
- **WHEN** o Narrador amplia o mapa e escolhe o ícone "Centralizar"
- **THEN** o mapa volta ao enquadramento, e o botão é anunciado como "Centralizar"

#### Scenario: Controle discreto
- **WHEN** alguém abre a Sala numa tela larga
- **THEN** o controle de zoom aparece numa moldura do sistema, com altura de no máximo 2,25 rem, sem o texto "Centralizar" visível e com a porcentagem atual

### Requirement: Tamanho do token
O Narrador SHALL poder mudar quantas casas um token ocupa, sempre quadrado: de 1×1 a 10×10, a partir da casa de cima à esquerda do token. O controle **Tamanho** tem − e + e o tamanho atual ("2×2 casas"); − fica desativado em 1×1 e + em 10×10. Ele SHALL aparecer:
- no **menu do botão direito sobre o token no grid**, que abre junto ao cursor, sem sair da tela, recebe o foco e fecha com Escape, com um clique fora ou no ×; no grid, o botão direito SHALL NOT arrastar o token nem a vista;
- no painel, abaixo de "Tokens da cena", com o token escolhido, como caminho pelo teclado (some enquanto o menu está aberto). Na lista, os tokens maiores que 1×1 SHALL levar a marca do tamanho ("3×3"). O grid de todos SHALL desenhar o token com o novo tamanho. O servidor SHALL conferir a versão do token, recusar tamanhos fora de 1 a 10 ou que levem o token além do limite da cena, e recusar o pedido de quem não é Narrador. O jogador SHALL NOT ver o controle.

#### Scenario: Aumentar um ogro pelo botão direito
- **WHEN** o Narrador clica com o botão direito no token "Ogro" (1×1) e toca + duas vezes no menu
- **THEN** o Ogro passa a ocupar 3×3 casas no grid do Narrador e dos jogadores, e a lista mostra a marca "3×3"

#### Scenario: Limites
- **WHEN** o token já ocupa 10×10
- **THEN** o + fica desativado, e um pedido de 11×11 ao servidor é recusado

#### Scenario: Jogador não muda o tamanho
- **WHEN** o jogador escolhe um token que controla
- **THEN** não aparece o controle Tamanho, o botão direito no token não abre o menu, e o servidor recusa um pedido de tamanho vindo dele

## REMOVED Requirements

### Requirement: Sala desativada como página principal
**Reason**: Decisão do usuário em 2026-10-03 (melhorias-da-sala, item 9): a Sala deixa de ser um módulo que se liga e desliga; ela está sempre ligada em toda mesa, então não há mais a tela "Sala desativada", o botão "Ativar sala" nem o atalho do jogador para a ficha nessa tela.
**Migration**: Nada a migrar. Mesas que tinham a Sala desligada passam a abri-la com o convite para criar a primeira cena (Narrador) ou o aviso de que ainda não há cena ativa (jogador). O registro antigo do módulo no banco é ignorado.
