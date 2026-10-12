# Spec Delta

## Purpose

Permitir que as cartas de habilidade e magia sejam jogadas na Sala: a mão de cartas na parte de baixo da tela, o comando de usar uma carta com validação e débito de PP pelo servidor, o registro dos usos com alvos, a animação da carta no tabuleiro e o desfazer do Narrador.

## ADDED Requirements

### Requirement: Mão de cartas na parte de baixo da Sala
A Sala SHALL mostrar, na parte de baixo da tela e em leque, como cartas seguradas na mão, a **mão de cartas** de um personagem: as cartas de habilidade e magia que ele tem no estado "aprendida", com ativação ativa ou de reação e com Custo de Uso em PP definido, cada uma com a arte da carta (ou as iniciais do título, sem arte), o Custo de Uso e a marca de reação. Cartas passivas e cartas sem Custo de Uso em PP SHALL ficar fora da mão nesta versão (decisão do usuário, 2026-10-06: o que não gasta PP explicitamente fica para decidir depois).

De quem é a mão:
- o **jogador** SHALL ver a mão de qualquer personagem que ele **controla** com token na cena: a ficha própria e os personagens cujo token o Narrador liberou para ele (um companion criado pelo Narrador, por exemplo; decisão do usuário, 2026-10-06). Com mais de um, SHALL poder escolher qual, e na vez de um deles na disputa a mão SHALL ser a dele;
- o **Narrador** SHALL ver, durante a disputa, a mão de quem está com a vez, inclusive NPCs e monstros; fora da disputa, a do personagem do token escolhido. A mão de um personagem de jogador SHALL aparecer ao Narrador só com a preferência "Ver as cartas dos jogadores" ligada (requisito da capacidade `estatisticas-e-mvp-da-mesa`).

A cabeça da mão SHALL mostrar o nome do personagem e o PP atual e máximo. A mão SHALL poder ser recolhida e aberta, com a escolha lembrada neste navegador.

Uma carta SHALL ficar **apagada, com o motivo escrito**, calculado pelo servidor, quando:
- a disputa ainda não começou (fase de iniciativa);
- a carta é ativa e não é a vez do personagem;
- a ação que a carta usa (Ação Padrão, Ação Bônus ou Reação) já foi gasta no turno;
- o PP atual do personagem é menor que o Custo de Uso.

#### Scenario: Mão da jogadora
- **WHEN** Lia, personagem de Ana com token na cena, tem aprendidas "Rajada de Energia" (ativa, 1 PP), "Metamagia Espontânea" (ativa, custo "+1 PP sobre o custo do feitiço") e uma passiva, e Lia tem 10 PP
- **THEN** Ana vê na parte de baixo da Sala a mão de Lia com "10 de 10 PP" e só a carta "Rajada de Energia", marcada com "1 PP"

#### Scenario: PP insuficiente
- **WHEN** Lia tem 2 PP atuais e "Surto Arcano" custa 3 PP
- **THEN** a carta aparece apagada com "Faltam 1 PP."

#### Scenario: Ação já gasta
- **WHEN** Lia já usou uma carta de Ação Padrão nesta vez e "Rajada de Energia" também usa a Ação Padrão
- **THEN** "Rajada de Energia" aparece apagada com "Ação Padrão já usada nesta vez."

#### Scenario: Fora da vez
- **WHEN** é a vez do Goblin e Ana olha a mão de Lia
- **THEN** as cartas ativas aparecem apagadas com "Não é a vez deste personagem.", e a carta de reação continua disponível

#### Scenario: Narrador vê a mão do monstro
- **WHEN** é a vez do Goblin, que tem a habilidade aprendida "Golpe de Ressonância" (1 PP)
- **THEN** o Narrador vê a mão do Goblin e pode usar a carta por ele

#### Scenario: Narrador sem a preferência
- **WHEN** a preferência "Ver as cartas dos jogadores" está desligada e é a vez de Lia
- **THEN** o Narrador não vê mão nenhuma; ao ligar a preferência, a mão de Lia aparece

### Requirement: Usar carta
Usar uma carta SHALL ser um comando ao servidor, pedido por quem controla o personagem (o dono da ficha ou um jogador posto como controlador de um token dele na cena ativa) ou pelo Narrador. O servidor SHALL recusar quando:
- a posse da carta pelo personagem não está no estado "aprendida";
- a carta não é de habilidade nem de magia, ou não é ativa nem de reação;
- a carta não tem Custo de Uso em PP definido;
- com o modo turno aberto, a disputa ainda não começou;
- com o modo turno aberto, a carta é ativa e não é a vez do personagem;
- com o modo turno aberto, a ação que a carta usa já foi gasta no turno;
- o PP atual do personagem é menor que o Custo de Uso;
- quem pede não controla o personagem nem é o Narrador.

Fora do modo turno (cena livre) SHALL valer só a posse, o tipo, o custo e o PP.

Custos secundários escritos no custo da carta (Exaustão, PV, materiais, ouro) SHALL NOT ser debitados: a carta SHALL mostrar o aviso "Custo extra: 1 de Exaustão", e o registro do uso SHALL guardar esse texto.

Ao aceitar, o servidor SHALL:
- debitar o Custo de Uso do PP atual da ficha, registrando a alteração no registro da mesa como as demais alterações de recursos, com a origem no uso da carta;
- marcar como gasta a ação da carta no participante da vez, quando há disputa;
- gravar o **uso** com sessão, disputa, rodada, personagem, versão da carta, alvos, custo pago e quem pediu;
- avisar a Sala de todos sem recarregar.

#### Scenario: Uso com débito de PP
- **WHEN** é a vez de Lia, ela tem 10 PP, e Ana usa "Rajada de Energia" (1 PP, Ação Padrão) no Goblin
- **THEN** o PP atual de Lia passa a 9, a Ação Padrão dela fica gasta, e o uso fica registrado com o Goblin como alvo

#### Scenario: Carta não aprendida
- **WHEN** Ana tenta usar uma carta que Lia tem "em aprendizado"
- **THEN** o servidor recusa e nada muda

#### Scenario: Ativa fora da vez
- **WHEN** é a vez do Goblin e Ana pede para usar "Rajada de Energia"
- **THEN** o servidor recusa, dizendo que não é a vez de Lia

#### Scenario: Reação fora da vez
- **WHEN** é a vez do Goblin, Lia tem a Reação disponível e Ana usa uma carta de reação de 1 PP
- **THEN** o servidor aceita, debita 1 PP e marca a Reação de Lia como gasta até o começo do próximo turno dela

#### Scenario: Carta sem Custo de Uso
- **WHEN** Ana pede para usar "Metamagia Espontânea", cujo custo é "+1 PP sobre o custo do feitiço"
- **THEN** o servidor recusa, dizendo que a carta ainda não tem custo em PP definido

#### Scenario: Custo extra no texto
- **WHEN** Lia usa "Surto Arcano", de custo "3 PP + 1 de Exaustão"
- **THEN** o servidor debita 3 PP, a Exaustão não muda, e a mesa vê o aviso "Custo extra: 1 de Exaustão"

#### Scenario: Cena livre
- **WHEN** não há modo turno aberto e Ana usa "Rajada de Energia" pela mão
- **THEN** o servidor debita 1 PP e registra o uso sem disputa nem rodada

#### Scenario: Outro jogador
- **WHEN** outro jogador pede para usar uma carta de Lia
- **THEN** o servidor recusa

#### Scenario: Companion liberado para a jogadora
- **WHEN** o Narrador cria Bolota sem dono, põe o token dele na cena com Ana como controladora, e Ana usa uma carta de Bolota
- **THEN** o servidor aceita, Ana vê a mão de Bolota ao lado da de Lia, e outro jogador não vê nem usa

### Requirement: Alvos do uso
Com o quadro de uso de uma carta aberto, clicar num token visível do grid SHALL marcar ou desmarcar o token como **alvo**, com um aro próprio sobre ele, distinto do aro do token escolhido e do brilho da vez. O quadro SHALL listar os alvos e permitir tirar cada um. O servidor SHALL guardar os alvos como registro e destino da animação, SHALL recusar um alvo fora da cena ativa ou que o leitor não vê, e SHALL NOT validar alcance, forma, área nem quantidade. Uma carta SHALL poder ser usada sem alvo.

#### Scenario: Marcar dois alvos
- **WHEN** Ana abre "Rajada de Energia", clica nos tokens Goblin e Goblin 2 e confirma
- **THEN** o uso é registrado com os dois alvos, mesmo que a carta diga "1 criatura"

#### Scenario: Sem alvo
- **WHEN** Ana usa uma carta pessoal sem clicar em nenhum token
- **THEN** o uso é registrado sem alvos

#### Scenario: Alvo oculto
- **WHEN** Ana tenta marcar como alvo um token oculto dos jogadores
- **THEN** o servidor recusa o uso

### Requirement: Carta jogada no tabuleiro
Quando um uso é aceito, a Sala de todos SHALL mostrar a carta subindo do token de quem usou e **voando até cada alvo**, até seis; sem alvo, a carta SHALL dar uma volta sobre o próprio token. Junto, a faixa "Lia usa Rajada de Energia" SHALL aparecer por alguns segundos, no estilo da faixa de crítico. A animação SHALL respeitar a preferência **Animação das cartas** da aba Dados, ligada por padrão, e a preferência de movimento reduzido do sistema. Usos de personagens cujos tokens estão todos ocultos SHALL NOT chegar aos jogadores; o Narrador vê todos.

#### Scenario: Carta voa até o alvo
- **WHEN** Lia usa "Rajada de Energia" no Goblin
- **THEN** toda a mesa vê a carta sair do token de Lia e chegar ao token do Goblin, com a faixa "Lia usa Rajada de Energia"

#### Scenario: Animação desligada
- **WHEN** o jogador desligou "Animação das cartas"
- **THEN** no navegador dele a faixa aparece, mas a carta não voa

#### Scenario: Monstro oculto
- **WHEN** o Narrador usa uma carta por um Goblin cujo único token está oculto
- **THEN** os jogadores não recebem o uso, nem animação nem faixa; o Narrador vê

### Requirement: Uso no histórico e no registro da mesa
Cada uso SHALL entrar no histórico da aba Dados, em ordem de chegada com as rolagens, como "Lia usou Rajada de Energia (1 PP) em Goblin", com a arte da carta em miniatura quando conhecida e sem "Rolar de novo". Usos de personagem oculto SHALL aparecer só ao Narrador. O uso SHALL entrar no registro da mesa, ligado à sessão em andamento, com o personagem, a carta, o custo e os alvos, e o débito de PP SHALL entrar como alteração do PP atual.

#### Scenario: Histórico com uso e rolagem
- **WHEN** Lia usa "Rajada de Energia" e em seguida rola `1d20 + Inteligência + Arcanismo`
- **THEN** o histórico mostra a rolagem no topo e, abaixo, o uso

#### Scenario: Registro da mesa
- **WHEN** o Narrador abre o registro da mesa depois da disputa
- **THEN** vê "Lia usou Rajada de Energia (1 PP) em Goblin", ligado à sessão em andamento

### Requirement: Desfazer o último uso
O Narrador SHALL poder **desfazer o último uso** de um personagem, pela cabeça da mão dele, enquanto a disputa continuar na mesma rodada ou, fora do modo turno, enquanto for o último uso do personagem. Desfazer SHALL devolver o PP pago, devolver a ação gasta e marcar o uso como desfeito, sem apagá-lo. O desfazer SHALL entrar no registro da mesa e chegar à Sala de todos. O jogador SHALL NOT desfazer.

#### Scenario: Engano de clique
- **WHEN** Ana usa "Rajada de Energia" sem querer e o Narrador escolhe "Desfazer último uso" na mão de Lia
- **THEN** o PP de Lia volta, a Ação Padrão volta, o uso aparece riscado no histórico, e as estatísticas não o contam

#### Scenario: Rodada seguinte
- **WHEN** a rodada já avançou desde o uso
- **THEN** o servidor recusa desfazer aquele uso

### Requirement: Custo em PP das cartas do catálogo
As cartas das habilidades de classe e arquétipo SHALL ter o Custo de Uso em PP lido da **parte em PP** do custo escrito no catálogo (por exemplo, "2 PP + 1 de Exaustão" dá 2 PP), e SHALL NOT ser calculado pela Potência de Uso do Framework. Um custo cujo PP não é um número fixo no começo do texto (como "+1 PP sobre o custo do feitiço" ou "Variável") SHALL deixar o Custo de Uso indefinido, e a carta fica fora da mão. O texto inteiro do custo SHALL continuar visível na carta.

#### Scenario: Custo fixo com extra
- **WHEN** o catálogo diz "1 PP + 1 de Exaustão" para "Fúria Descontrolada"
- **THEN** a carta mostra Custo de Uso 1 PP e o texto "1 PP + 1 de Exaustão"

#### Scenario: Custo variável
- **WHEN** o catálogo diz "+1 PP sobre o custo do feitiço" para "Metamagia Espontânea"
- **THEN** a carta fica sem Custo de Uso definido e não entra na mão
