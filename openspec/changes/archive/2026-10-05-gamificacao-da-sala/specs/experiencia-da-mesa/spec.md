# Spec Delta

## ADDED Requirements

### Requirement: Abas do painel da Sala por papel
O painel direito da Sala SHALL ter abas fixas no topo, nesta ordem: **Cena**, **Dados**, a aba do papel, **Fichas**, **Bolsa**, **Cartas** e **Música** (Bolsa e Música no item 8; Dados na mudança `rolador-de-dados`). A aba do papel SHALL ser **Mestre** para o Narrador da mesa e **Jogador** para os demais participantes; cada pessoa SHALL ver só a do seu papel. Cada aba SHALL ter ícone e nome; com o painel estreito, SHALL mostrar só o ícone, mantendo o nome como nome acessível e dica. As abas SHALL seguir o padrão de abas acessível: lista de abas, a aba atual anunciada como selecionada, troca pelas setas e conteúdo associado à aba.

Um botão "Recolher painel" SHALL fechar o painel. Com o painel fechado, um botão "Abrir painel" no canto superior direito do grid SHALL reabri-lo na última aba usada. A aba escolhida e o estado aberto ou fechado SHALL ser lembrados neste navegador, sem ir ao servidor. A aba padrão é Cena. Uma aba lembrada que não existe mais, como o antigo "Chat", SHALL abrir a aba do papel.

O que cada aba mostra:
- **Cena:** para o Narrador, no topo, o grupo **Cenas** (cena aberta, troca, ativação, criação e envio do mapa); para todos, os tokens da cena; e, só para o Narrador, "Retirar" em cada token e as listas de personagens dos jogadores e de NPCs e monstros;
- **Dados:** o rolador de dados, descrito na capacidade `rolador-de-dados`;
- **Mestre** (só o Narrador) e **Jogador** (só os jogadores): sessões, estatísticas, preferências da Sala e votação de MVP, descritas na capacidade `estatisticas-e-mvp-da-mesa`.

#### Scenario: Trocar de aba
- **WHEN** o jogador escolhe a aba "Fichas"
- **THEN** o painel mostra as fichas, a aba "Fichas" é anunciada como selecionada, e ao recarregar o painel volta em "Fichas"

#### Scenario: Recolher e reabrir
- **WHEN** o Narrador escolhe "Recolher painel" e depois "Abrir painel"
- **THEN** o painel some, o grid fica livre, e depois o painel volta na mesma aba

#### Scenario: Narrador vê a aba Mestre
- **WHEN** o Narrador abre a Sala
- **THEN** a terceira aba do painel é "Mestre", entre "Dados" e "Fichas", e não há aba "Jogador" nem "Chat"

#### Scenario: Jogador vê a aba Jogador
- **WHEN** um jogador abre a Sala
- **THEN** a terceira aba do painel é "Jogador", e não há aba "Mestre" nem "Chat"

#### Scenario: Aba Chat lembrada de antes
- **WHEN** alguém que tinha deixado a aba "Chat" aberta volta à Sala
- **THEN** o painel abre na aba do seu papel (Mestre ou Jogador)

#### Scenario: Dados logo depois de Cena
- **WHEN** alguém abre a Sala
- **THEN** a segunda aba do painel é "Dados", entre "Cena" e a aba do papel, e a seta para a direita a partir de Cena leva a Dados

### Requirement: Sub-abas na aba Cena
Para o Narrador, a aba Cena SHALL ser dividida em sub-abas (pedido do usuário, 2026-10-04, no lugar das seções retráteis), nesta ordem:
- **Cenas:** as cenas da mesa (abrir, chave de cena ativa, criar cena), o envio do mapa e o tamanho do mapa;
- **Personagens:** a dica de arrastar e as listas "Personagens dos jogadores" e "NPCs e monstros", cada uma com título e quantidade, com "Colocar" e o olho cortado em cada personagem;
- **Tokens:** os tokens da cena, com a dica, as ações em lote de movimento, ocultar, cadeado, retirar e o tamanho do token escolhido.

Cada sub-aba SHALL mostrar a quantidade de itens ao lado do nome e seguir o padrão de abas acessível (lista de abas, a atual anunciada como selecionada, setas, Home e End). A sub-aba escolhida SHALL ficar lembrada neste navegador; a padrão é Cenas. Sem cena aberta, Personagens e Tokens SHALL avisar que é preciso criar ou abrir uma cena na sub-aba Cenas. Arrastar um retrato da sub-aba Personagens para o grid SHALL continuar pondo o personagem na cena.

O jogador SHALL ver na aba Cena só "Tokens da cena", com título e quantidade, sem sub-abas e sem abrir e fechar.

#### Scenario: Trocar de sub-aba
- **WHEN** o Narrador está na sub-aba Cenas e aperta a seta para a direita
- **THEN** a sub-aba Personagens fica selecionada, com o foco nela, e mostra as listas de personagens dos jogadores e de NPCs e monstros

#### Scenario: Sub-aba lembrada
- **WHEN** o Narrador escolhe a sub-aba Tokens e recarrega a página
- **THEN** a aba Cena volta na sub-aba Tokens

#### Scenario: Sem cena aberta
- **WHEN** a mesa não tem cena e o Narrador abre a sub-aba Tokens
- **THEN** ela avisa para criar ou abrir uma cena na sub-aba Cenas

#### Scenario: Jogador sem sub-abas
- **WHEN** um jogador abre a aba Cena
- **THEN** vê o título "Tokens da cena" e a lista, sem sub-abas

## REMOVED Requirements

### Requirement: Abas do painel da Sala
**Reason**: A aba Chat, que era só um espaço reservado, sai do painel (pedido do usuário, 2026-10-04). Em seu lugar entra a aba do papel: Mestre para o Narrador e Jogador para os jogadores.
**Migration**: Substituído por "Abas do painel da Sala por papel", que mantém a ordem, o padrão acessível, o recolher e a memória da aba. A aba "Chat" lembrada no navegador abre a aba do papel.

### Requirement: Seções retráteis na aba Cena
**Reason**: O usuário pediu sub-abas no lugar das seções que abrem e fecham (2026-10-04).
**Migration**: Substituído por "Sub-abas na aba Cena": Cenas, Personagens e Tokens, cada uma com a quantidade, e a escolha lembrada neste navegador. O estado antigo de cada seção deixa de ser usado.

### Requirement: Seção "Tokens" na aba Cena
**Reason**: Com as sub-abas, colocar personagens e os tokens da cena ficam em sub-abas próprias (Personagens e Tokens), sem a seção "Tokens" em volta.
**Migration**: Substituído por "Sub-abas na aba Cena". O jogador continua vendo só "Tokens da cena".
