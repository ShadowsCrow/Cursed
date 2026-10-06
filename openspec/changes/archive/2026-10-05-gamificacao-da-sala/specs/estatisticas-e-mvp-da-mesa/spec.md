# Spec Delta

## Purpose

Dar à mesa o que comemorar e acompanhar ao longo do jogo: o Narrador conduz as sessões e as preferências da Sala na aba Mestre, cada jogador vê na aba Jogador as próprias estatísticas da sessão e da campanha, e o grupo elege o MVP por votação secreta. Nada disso dá bônus mecânico.

## ADDED Requirements

### Requirement: Sub-abas da aba Mestre
A aba Mestre SHALL ser dividida em sub-abas por tema (pedido do usuário, 2026-10-04), nesta ordem: **Sessão**, **Preferências** (destaque de críticos e placar visível), **MVP** (votação e MVPs anteriores) e **Estatísticas**. Elas SHALL seguir o padrão de abas acessível (setas, Home e End), e a escolhida SHALL ficar lembrada neste navegador; a padrão é Sessão. Com uma votação aberta ou em desempate, a sub-aba MVP SHALL mostrar um aviso, lido por leitores de tela como "votação aberta".

#### Scenario: Votação aberta avisa
- **WHEN** há uma votação de MVP aberta e o Narrador está na sub-aba Sessão
- **THEN** a sub-aba MVP mostra o aviso de votação aberta

#### Scenario: Sub-aba lembrada
- **WHEN** o Narrador escolhe Estatísticas e volta à Sala depois
- **THEN** a aba Mestre abre em Estatísticas

### Requirement: Sessões de jogo
Na aba Mestre, o Narrador SHALL poder **Iniciar sessão** e **Encerrar sessão**. As sessões SHALL ser numeradas em sequência por mesa (Sessão 1, 2, 3…), e SHALL haver no máximo uma em andamento por mesa. Só o Narrador SHALL iniciar ou encerrar sessões; o servidor SHALL recusar o pedido de qualquer outra pessoa.

Enquanto houver uma sessão em andamento, as rolagens e as alterações registradas na mesa SHALL ficar ligadas a ela. A aba Mestre e a aba Jogador SHALL mostrar a sessão em andamento, com número e hora de início, ou "Nenhuma sessão em andamento". Iniciar e encerrar SHALL entrar no registro da mesa e chegar à Sala de todos sem recarregar.

#### Scenario: Iniciar a primeira sessão
- **WHEN** o Narrador escolhe "Iniciar sessão" numa mesa sem sessões
- **THEN** começa a "Sessão 1", e a aba Jogador de Lion mostra "Sessão 1 em andamento"

#### Scenario: Só uma sessão por vez
- **WHEN** há uma sessão em andamento
- **THEN** a aba Mestre oferece "Encerrar sessão", não "Iniciar sessão", e o servidor recusa um segundo início

#### Scenario: Jogador não controla sessão
- **WHEN** um jogador pede ao servidor para iniciar uma sessão
- **THEN** o servidor recusa, e nada muda

#### Scenario: Rolagem ligada à sessão
- **WHEN** Lion rola durante a Sessão 2
- **THEN** a rolagem conta nas estatísticas da Sessão 2 e da campanha

### Requirement: Estatísticas do jogador
A aba Jogador SHALL mostrar as estatísticas do próprio jogador em dois períodos, **Esta sessão** e **Campanha**. Sem sessão em andamento, "Esta sessão" SHALL mostrar a última sessão encerrada, com o número dela, ou um aviso de que ainda não houve sessão.

As estatísticas SHALL ser calculadas pelo servidor:
- **Vida perdida** e **Vida recuperada**: a soma das quedas e das subidas do PV atual dos personagens do jogador no período, pelas alterações registradas na mesa (dano, cura, descanso, ajustes). Mudanças só do PV máximo SHALL NOT contar;
- **Rolagens**: quantas rolagens o jogador fez no período;
- **Críticos** e **Falhas críticas**: quantos d20 dele receberam cada marca. Esses contadores SHALL aparecer só com o destaque de críticos ligado;
- **Sorte nos dados**: o quanto os valores naturais de todos os dados dele ficaram acima ou abaixo da média esperada de cada dado, em pontos percentuais, com um rótulo: "Dados quentes", "Na média" ou "Dados frios". Com menos de 10 dados no período, SHALL mostrar "Poucos dados ainda" em vez do rótulo.

As rolagens ocultas do Narrador SHALL NOT entrar nas estatísticas de nenhum jogador. Um jogador SHALL NOT poder pedir ao servidor as estatísticas individuais de outro, salvo pelo placar visível (requisito "Placar da mesa visível").

#### Scenario: Vida perdida e recuperada
- **WHEN** na sessão atual o PV de Lion vai de 16 para 9, depois para 12, e depois para 4
- **THEN** a aba Jogador de Lion mostra, em "Esta sessão", vida perdida 15 e vida recuperada 3

#### Scenario: Máximo não conta como cura
- **WHEN** Lion sobe de nível e o PV máximo aumenta, sem mudar o PV atual
- **THEN** a vida recuperada não muda

#### Scenario: Dados quentes
- **WHEN** Lion rolou 12 d20 na campanha e a média dos valores naturais ficou bem acima de 10,5
- **THEN** a aba mostra quantos pontos percentuais ele está acima da média e o rótulo "Dados quentes"

#### Scenario: Poucos dados
- **WHEN** Lion rolou só 3 dados na sessão
- **THEN** "Esta sessão" mostra "Poucos dados ainda" no lugar do rótulo de sorte

#### Scenario: Estatísticas de outro jogador
- **WHEN** o placar está desligado e Lion pede ao servidor as estatísticas de outro jogador
- **THEN** o servidor recusa

### Requirement: Estatísticas na aba Mestre
A aba Mestre SHALL mostrar ao Narrador as estatísticas de cada jogador da mesa, nos mesmos períodos e com os mesmos números da aba Jogador, independente do placar estar visível.

#### Scenario: Narrador compara a mesa
- **WHEN** o Narrador abre a aba Mestre numa mesa com dois jogadores
- **THEN** vê, para cada um, vida perdida e recuperada, rolagens e sorte nos dados da sessão e da campanha

### Requirement: Placar da mesa visível
Na aba Mestre, o Narrador SHALL poder ligar e desligar **Mostrar estatísticas da mesa**. A preferência SHALL ser da mesa, guardada no servidor, e começar desligada. Ligada, a aba Jogador de todos os jogadores SHALL ganhar o **Placar da mesa**, com as estatísticas de cada jogador lado a lado. Desligada, o placar SHALL sumir e o servidor SHALL recusar a jogadores as estatísticas dos outros. A mudança SHALL chegar à Sala de todos sem recarregar.

#### Scenario: Ligar o placar
- **WHEN** o Narrador liga "Mostrar estatísticas da mesa"
- **THEN** a aba Jogador de Lion passa a mostrar o placar com as estatísticas de todos os jogadores

#### Scenario: Desligar o placar
- **WHEN** o Narrador desliga a preferência
- **THEN** o placar some da aba Jogador, e cada jogador volta a ver só as próprias estatísticas

### Requirement: Preferência do destaque de críticos
Na aba Mestre, o Narrador SHALL poder ligar e desligar o **Destaque de críticos** (capacidade `rolador-de-dados`). A preferência SHALL ser da mesa, guardada no servidor, começar desligada e chegar à Sala de todos sem recarregar. Só o Narrador SHALL mudar as preferências da Sala.

#### Scenario: Ligar o destaque
- **WHEN** o Narrador liga "Destaque de críticos"
- **THEN** a próxima rolagem com 20 natural é destacada para toda a mesa

#### Scenario: Jogador não muda preferência
- **WHEN** um jogador pede ao servidor para ligar o destaque de críticos
- **THEN** o servidor recusa

### Requirement: Votação de MVP
Na aba Mestre, o Narrador SHALL poder **Abrir votação de MVP** quando a mesa tiver ao menos dois jogadores, e SHALL haver no máximo uma votação aberta por mesa. Enquanto ela estiver aberta:
- a aba Jogador de cada jogador SHALL mostrar a votação, com os outros jogadores como opções (pelo apelido e pelo retrato do personagem quando houver);
- cada jogador SHALL votar em um outro jogador. O servidor SHALL recusar voto em si mesmo, voto do Narrador e voto de quem não é da mesa;
- o jogador SHALL poder trocar o voto, e vale o último;
- o voto SHALL ser secreto: ninguém, nem o Narrador, SHALL ver em quem cada um votou, nem a contagem parcial;
- a aba Mestre SHALL mostrar só quantos jogadores já votaram, de quantos.

Ao **Encerrar votação**:
- com um mais votado, ele SHALL ser o MVP;
- com empate, a aba Mestre SHALL pedir ao Narrador que escolha entre os empatados, e só então o MVP SHALL ser anunciado;
- sem votos, a votação SHALL terminar sem MVP.

O anúncio do MVP SHALL aparecer para toda a mesa: um selo pintado e o apelido do vencedor sobre o tabuleiro por alguns segundos, anunciado a leitores de tela. A aba Mestre SHALL listar os MVPs anteriores da mesa, com a sessão (quando houver) e a data. Mesmo depois de encerrada, os votos individuais SHALL continuar secretos. O MVP SHALL NOT dar nenhum efeito mecânico. Abrir, encerrar e o resultado SHALL entrar no registro da mesa.

#### Scenario: Votar
- **WHEN** o Narrador abre a votação e Lion vota em Kira
- **THEN** a aba Mestre mostra "1 de 2 votaram", sem dizer em quem

#### Scenario: Não votar em si
- **WHEN** Lion pede ao servidor para votar em si mesmo
- **THEN** o servidor recusa, e a aba de Lion nem oferece essa opção

#### Scenario: Vencedor anunciado
- **WHEN** Kira tem mais votos e o Narrador encerra a votação
- **THEN** toda a mesa vê o selo de MVP com "Kira" sobre o tabuleiro, e a aba Mestre passa a listar Kira entre os MVPs

#### Scenario: Empate
- **WHEN** Lion e Kira empatam e o Narrador encerra a votação
- **THEN** a aba Mestre pede que o Narrador escolha entre Lion e Kira, e só depois da escolha o MVP é anunciado

#### Scenario: Votos secretos
- **WHEN** a votação termina e alguém pede ao servidor os votos
- **THEN** o servidor só informa o vencedor e quantos votos ele teve, nunca quem votou em quem

#### Scenario: Mesa com um jogador
- **WHEN** a mesa tem só um jogador
- **THEN** a aba Mestre não permite abrir a votação e explica que são precisos dois jogadores
