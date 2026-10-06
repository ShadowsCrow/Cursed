# Spec Delta

## Purpose

Levar à Sala as Rodadas, os Turnos e a Iniciativa de uma Cena de Disputa: o Narrador entra em modo turno, todos os participantes da cena rolam iniciativa pela regra, e uma barra com os retratos em ordem mostra de quem é a vez e em que rodada a mesa está.

## ADDED Requirements

### Requirement: Entrar em modo turno
Na aba Mestre, na sub-aba Sessão, o Narrador SHALL ter **Entrar em modo turno**. Só o Narrador SHALL poder entrar; o servidor SHALL recusar o pedido de qualquer outra pessoa.

O servidor SHALL recusar a entrada quando:
- não há sessão em andamento;
- a mesa não tem cena ativa;
- a cena ativa não tem nenhum token ligado a personagem;
- já há um modo turno aberto na mesa.

O botão SHALL ficar desativado nesses casos, com o motivo escrito.

Ao entrar, os **participantes** SHALL ser os personagens com ao menos um token na cena ativa: os dos jogadores, os NPCs e os monstros. Tokens sem personagem SHALL ficar de fora. Os tokens de uma mesma ficha que estão na cena ao entrar SHALL formar um participante só (o grupo da ficha), com uma rolagem, mostrado com a quantidade de tokens.

O modo turno SHALL começar na fase de **iniciativa**. Entrar SHALL entrar no registro da mesa e chegar à Sala de todos sem recarregar.

#### Scenario: Entrar com sessão e cena
- **WHEN** há uma sessão em andamento, a cena ativa tem os tokens de Lion, Kira e dois Goblins (mesma ficha) e um baú sem personagem, e o Narrador escolhe "Entrar em modo turno"
- **THEN** o modo turno abre na fase de iniciativa com três participantes: Lion, Kira e Goblin (×2)

#### Scenario: Sem sessão em andamento
- **WHEN** não há sessão em andamento
- **THEN** "Entrar em modo turno" fica desativado, com o aviso de iniciar uma sessão antes, e o servidor recusa o pedido

#### Scenario: Jogador não entra em modo turno
- **WHEN** um jogador pede ao servidor para entrar em modo turno
- **THEN** o servidor recusa, e nada muda

### Requirement: Teste de iniciativa
Na fase de iniciativa, cada jogador SHALL ver, sobre o grid, o aviso **Role iniciativa**, com um botão por personagem dele que ainda não rolou. O teste SHALL ser `1d20 + Raciocínio + Prontidão`:
- o servidor sorteia o d20 e soma os valores de Raciocínio e Prontidão calculados da ficha;
- a rolagem SHALL ser guardada como as demais, com as parcelas, e marcada como **Iniciativa**;
- a rolagem SHALL rolar no tabuleiro e entrar no histórico da aba Dados, com a marca "Iniciativa".

Quem pode rolar:
- o jogador, só pelos próprios personagens;
- o Narrador, por qualquer participante, inclusive por um jogador que demorar.

O Narrador SHALL ter **Rolar todos os NPCs e monstros**, que rola de uma vez os NPCs e monstros que faltam. As rolagens do Narrador por NPCs e monstros SHALL sair ocultas dos jogadores, e as rolagens pelos personagens dos jogadores SHALL ser vistas pela mesa.

Cada participante SHALL rolar uma vez só; o servidor SHALL recusar uma segunda rolagem. Se a ficha não tiver valor calculável de Raciocínio ou de Prontidão, o servidor SHALL recusar a rolagem, dizendo qual falta, sem inferir valor. Esse participante continua sem rolar.

O Narrador SHALL ver a lista dos participantes com o resultado de quem já rolou e "falta rolar" para os demais, com "Rolar por ele" em cada pendente.

#### Scenario: Jogador rola a própria iniciativa
- **WHEN** Lion tem Raciocínio 2 e Prontidão 1 e o jogador escolhe "Rolar iniciativa" para Lion, e o d20 sai 14
- **THEN** a iniciativa de Lion é 17, os dados rolam no tabuleiro, e o histórico mostra a rolagem `1d20 + Raciocínio (+2) + Prontidão (+1)` com a marca "Iniciativa"

#### Scenario: Jogador não rola por outro
- **WHEN** o jogador de Lion pede ao servidor a iniciativa de Kira
- **THEN** o servidor recusa

#### Scenario: Narrador rola pelos NPCs
- **WHEN** o Narrador escolhe "Rolar todos os NPCs e monstros"
- **THEN** cada NPC e monstro que faltava ganha a sua iniciativa, e as rolagens ficam ocultas dos jogadores

#### Scenario: Narrador rola por quem demorou
- **WHEN** Kira ainda não rolou e o Narrador escolhe "Rolar por ele" em Kira
- **THEN** a iniciativa de Kira é sorteada pelo servidor com os valores da ficha dela, e a mesa vê a rolagem

#### Scenario: Ficha sem Prontidão
- **WHEN** a ficha de um monstro não tem valor calculável de Prontidão e o Narrador rola por ele
- **THEN** o servidor recusa, avisa que falta Prontidão, e o monstro continua sem rolar

#### Scenario: Rolar duas vezes
- **WHEN** Lion já rolou e alguém pede de novo a iniciativa de Lion
- **THEN** o servidor recusa, e o resultado de Lion não muda

### Requirement: Ordem de iniciativa e desempate
A ordem SHALL ser do maior total para o menor. Em empate, o servidor SHALL comparar, nesta ordem:
1. o maior Raciocínio;
2. a maior Prontidão;
3. uma nova rolagem de 1d20, só entre os participantes ainda empatados, repetida até não haver empate.

A nova rolagem de desempate SHALL ser feita pelo servidor e guardada com o participante. Ela SHALL servir só para ordenar, sem mudar o total de iniciativa. A ordem SHALL ficar a mesma até o fim da disputa.

#### Scenario: Empate desfeito pelo Raciocínio
- **WHEN** Lion e Kira tiram total 15, e Kira tem Raciocínio 3 contra 2 de Lion
- **THEN** Kira vem antes de Lion

#### Scenario: Empate total
- **WHEN** dois participantes empatam no total, no Raciocínio e na Prontidão
- **THEN** o servidor rola 1d20 de desempate só para os dois, repete se empatar de novo, e ordena pelo resultado, sem mudar o total mostrado

### Requirement: Começar a disputa e quem falta rolar
O Narrador SHALL ter **Começar a disputa** na fase de iniciativa, disponível mesmo com participantes que ainda não rolaram. Ao começar:
- a vez SHALL ir para o primeiro da ordem;
- a rodada SHALL ser 1;
- quem ainda não rolou SHALL ficar no fim da fila, marcado como "falta rolar".

Enquanto houver na cena qualquer participante sem iniciativa, o **Próximo turno** SHALL ficar bloqueado (decisão do usuário, 2026-10-05):
- o botão fica desativado, com o nome de quem falta;
- o servidor recusa o pedido com "Falta rolar a iniciativa de …".

O Narrador SHALL continuar podendo "Rolar por ele" e "Rolar todos os NPCs e monstros" durante a disputa, para destravar.

O aviso "Role iniciativa" SHALL continuar para quem falta. Quando um pendente rolar depois do começo, ele SHALL entrar na posição do seu resultado, e a vez atual SHALL continuar com o mesmo participante.

#### Scenario: Começar com um pendente
- **WHEN** todos rolaram menos Kira e o Narrador escolhe "Começar a disputa"
- **THEN** a rodada 1 começa com a vez do maior resultado, e Kira aparece no fim da barra como "falta rolar"

#### Scenario: Próximo turno travado por quem falta rolar
- **WHEN** a disputa começou com Kira sem iniciativa e o Narrador escolhe "Próximo turno"
- **THEN** o botão está desativado com "Falta rolar a iniciativa de Kira", e o servidor recusa o pedido

#### Scenario: Pendente rola no meio da disputa
- **WHEN** Kira rola 19 durante a rodada 1, na vez de Lion
- **THEN** Kira passa a ocupar a posição do seu resultado na ordem, e a vez continua com Lion

### Requirement: Vez e rodadas
Durante a disputa, só o Narrador SHALL avançar a vez, com **Próximo turno**. A vez SHALL passar ao próximo participante da ordem, pulando quem não tem mais token na cena ativa. Enquanto alguém na cena estiver sem iniciativa, avançar a vez SHALL ser recusado (requisito "Começar a disputa e quem falta rolar"). Depois do último, a vez SHALL voltar ao primeiro, e a rodada SHALL aumentar em 1. O servidor SHALL recusar o pedido de quem não é o Narrador.

Avançar a vez SHALL entrar no registro da mesa e chegar à Sala de todos sem recarregar.

#### Scenario: Avançar a vez
- **WHEN** a ordem é Kira, Goblin e Lion, é a vez de Kira e o Narrador escolhe "Próximo turno"
- **THEN** a vez passa ao Goblin, para toda a mesa

#### Scenario: Nova rodada
- **WHEN** é a vez de Lion, o último da ordem, e o Narrador escolhe "Próximo turno"
- **THEN** a vez volta a Kira, e a barra mostra "Rodada 2"

#### Scenario: Participante fora da cena
- **WHEN** o Narrador retira o último token do Goblin da cena e avança a vez de Kira
- **THEN** a vez pula o Goblin e vai a Lion, e o Goblin some da barra

### Requirement: Barra de ordem
Durante o modo turno, a Sala SHALL mostrar no topo do grid uma barra no estilo do Baldur's Gate 3:
- os retratos dos participantes na ordem, com o nome, e a quantidade quando a ficha tem mais de um token;
- a vez atual em destaque;
- o contador **Rodada N**.

Na fase de iniciativa, a barra SHALL mostrar quem já rolou e quem falta.

O que cada pessoa vê:
- o Narrador vê todos os participantes e todos os totais, e tem "Próximo turno" e "Sair do modo turno" na barra;
- os jogadores veem os totais dos personagens dos jogadores e nunca os dos NPCs e monstros;
- os participantes cujos tokens estão todos ocultos dos jogadores SHALL NOT aparecer para eles, e o nome mostrado SHALL ser o mesmo do token que eles veem.

A vez atual SHALL ser anunciada a leitores de tela quando mudar, por exemplo "Vez de Lion, rodada 2". A barra SHALL caber em telas estreitas, rolando de lado sem empurrar o grid. Com o painel aberto, ela SHALL ficar à esquerda dele.

#### Scenario: Jogador vê a vez
- **WHEN** a vez passa a Lion
- **THEN** o retrato de Lion fica em destaque na barra de todos, e leitores de tela anunciam "Vez de Lion, rodada 1"

#### Scenario: Monstro oculto
- **WHEN** um monstro com o token oculto participa da disputa
- **THEN** o Narrador o vê na barra, e os jogadores não

#### Scenario: Total do NPC escondido
- **WHEN** um jogador olha a barra
- **THEN** vê o próprio total de iniciativa e o dos outros jogadores, mas não o dos NPCs e monstros

### Requirement: Sair do modo turno
O Narrador SHALL poder **Sair do modo turno** a qualquer momento, na barra ou na aba Mestre. Encerrar a sessão SHALL encerrar também o modo turno aberto. Ao sair, a barra e o aviso de iniciativa SHALL sumir para todos, e a mesa SHALL poder entrar num novo modo turno depois. Sair SHALL entrar no registro da mesa, com a quantidade de rodadas.

#### Scenario: Sair da disputa
- **WHEN** o Narrador escolhe "Sair do modo turno" na rodada 4
- **THEN** a barra some para todos, e o registro da mesa mostra que a disputa terminou na rodada 4

#### Scenario: Encerrar a sessão
- **WHEN** o Narrador encerra a sessão com o modo turno aberto
- **THEN** o modo turno também é encerrado

### Requirement: Movimento limitado ao Deslocamento na disputa
Durante a disputa (depois de "Começar a disputa"), o servidor SHALL limitar o movimento dos tokens movidos por jogadores:
- o jogador SHALL mover só tokens do personagem que está na vez, e só se o personagem for dele. Fora da própria vez, o servidor SHALL recusar o movimento com "Não é a sua vez";
- na fase de iniciativa, o jogador SHALL NOT mover tokens de participantes;
- tokens que não são de participantes da disputa seguem as regras de movimento de sempre.

Cada movimento SHALL custar, em metros, o maior entre a diferença de colunas e a diferença de linhas entre a casa de origem e a de destino. Cada casa vale 1 m, inclusive na diagonal (decisão do usuário, registrada nas regras).

Os movimentos do personagem na vez SHALL se somar até o **saldo do turno**, que é o Deslocamento calculado da ficha. O servidor SHALL recusar o movimento que passar do saldo, dizendo quanto falta e quanto o movimento custa, e o token SHALL voltar à posição confirmada. Os tokens do grupo de uma ficha SHALL dividir o mesmo saldo; um token que joga sozinho (requisito "Entrar no meio da disputa") SHALL ter o saldo dele.

O saldo SHALL voltar ao inteiro no começo de cada vez daquele participante.

O Narrador (decisão do usuário, 2026-10-04):
- quando move um token do participante que está na vez (NPC, monstro ou personagem de jogador), o movimento SHALL gastar o saldo daquele participante, com o mesmo limite;
- SHALL poder marcar o movimento como **Movimento livre** (pela chave da barra ou segurando Alt ao soltar o token), para empurrões, quedas, teleporte e correções. O movimento livre SHALL NOT gastar saldo, e só o Narrador SHALL poder pedi-lo; o servidor SHALL recusar o pedido de um jogador;
- fora da vez do participante (inclusive na fase de iniciativa), SHALL mover o token **só com o Movimento livre**. Sem ele, o servidor SHALL recusar com "Fora da vez: ligue o Movimento livre para mover", para o Narrador não mover a peça errada sem querer (decisão do usuário, 2026-10-05);
- tokens que não são de participantes seguem livres para o Narrador.

A barra SHALL mostrar o saldo da vez atual ao Narrador e ao dono do personagem, por exemplo "Deslocamento: 4 de 9 m".

#### Scenario: Andar até o Deslocamento
- **WHEN** é a vez de Lion, com Deslocamento 9, e o jogador move o token 4 casas e depois 5 casas
- **THEN** os dois movimentos são aceitos e a barra mostra "Deslocamento: 0 de 9 m"

#### Scenario: Passar do saldo
- **WHEN** Lion já andou 6 m na vez e o jogador tenta mover mais 4 casas
- **THEN** o servidor recusa, avisa que faltam 3 m e que o movimento custa 4 m, e o token volta

#### Scenario: Diagonal custa 1 m por casa
- **WHEN** o jogador move Lion da casa (2, 2) para a (5, 4)
- **THEN** o movimento custa 3 m

#### Scenario: Fora da vez
- **WHEN** é a vez do Goblin e o jogador de Lion tenta mover Lion
- **THEN** o servidor recusa com "Não é a sua vez", e o token volta

#### Scenario: Saldo volta na próxima vez
- **WHEN** Lion gastou todo o Deslocamento na rodada 1 e chega a vez dele na rodada 2
- **THEN** o saldo volta a 9 m

#### Scenario: Narrador move o NPC na vez dele
- **WHEN** é a vez do Goblin, com Deslocamento 6, e o Narrador move o Goblin 4 casas e depois mais 3
- **THEN** o primeiro movimento gasta 4 m, e o segundo é recusado porque faltam 2 m

#### Scenario: Movimento livre
- **WHEN** é a vez do Goblin e o Narrador, com "Movimento livre" ligado, arrasta o Goblin 10 casas por causa de um empurrão
- **THEN** o movimento é aceito e o saldo do Goblin não muda

#### Scenario: Jogador não pede movimento livre
- **WHEN** o jogador de Lion pede ao servidor um movimento livre na vez de Lion
- **THEN** o servidor recusa

#### Scenario: Narrador fora da vez sem Movimento livre
- **WHEN** o Narrador, com o Movimento livre desligado, arrasta o token de Lion na vez do Goblin
- **THEN** o servidor recusa com "Fora da vez: ligue o Movimento livre para mover", e o token volta

#### Scenario: Narrador fora da vez com Movimento livre
- **WHEN** o Narrador liga o Movimento livre e arrasta o token de Lion 15 casas na vez do Goblin
- **THEN** o movimento é aceito e o saldo de Lion não muda

### Requirement: Correr
Na própria vez, o jogador SHALL poder escolher **Correr**, que troca a Ação Padrão por uma segunda Ação de Movimento, como manda a regra. Com isso, o saldo do turno SHALL passar a ser o dobro do Deslocamento, mantendo o que já foi gasto. Correr SHALL valer só até o fim daquela vez e SHALL NOT poder ser desfeito nela. O Narrador SHALL poder marcar Correr para qualquer participante na vez.

O servidor SHALL recusar Correr fora da vez do personagem ou fora da disputa. A barra SHALL mostrar "Correndo" junto do saldo.

#### Scenario: Correr dobra o saldo
- **WHEN** Lion tem Deslocamento 9, já andou 5 m na vez e o jogador escolhe "Correr"
- **THEN** o saldo passa a "Deslocamento: 13 de 18 m · Correndo"

#### Scenario: Correr fora da vez
- **WHEN** o jogador de Lion pede Correr na vez do Goblin
- **THEN** o servidor recusa

### Requirement: Prévia do movimento no modo turno
Durante a disputa, ao arrastar um token de participante, o grid SHALL mostrar, enquanto o arraste durar (pedido do usuário, 2026-10-04):
- um contorno tracejado na casa de onde o token saiu, do tamanho do token;
- uma linha tracejada do centro da casa de origem ao centro da casa onde o token está agora;
- junto ao destino, um rótulo com o custo do movimento em metros, calculado como no servidor (o maior entre a diferença de colunas e a de linhas).

O rótulo SHALL dizer:
- na vez do participante, quanto sobra depois do movimento, por exemplo "4 m · restam 5 m", ou, se passar do saldo, quanto falta, em vermelho, por exemplo "7 m · faltam 2 m";
- no movimento livre do Narrador (chave ou Alt), "4 m · livre";
- quando o Narrador arrasta um participante fora da vez dele sem o Movimento livre, "Fora da vez: ligue o Movimento livre", em vermelho;
- quando o jogador arrasta o próprio token fora da vez, "Não é a sua vez", em vermelho.

A prévia SHALL sumir ao soltar ou cancelar o arraste, e SHALL NOT aparecer fora do modo turno. Na fase de iniciativa, SHALL aparecer só para o Narrador: o aviso de ligar o Movimento livre ou, com ele ligado, os metros com "livre". Ela é só visual: quem decide é o servidor.

#### Scenario: Prévia dentro do saldo
- **WHEN** é a vez de Lion, com 9 m de saldo, e o jogador arrasta o token 4 casas
- **THEN** a casa de origem fica com contorno tracejado, uma linha tracejada liga origem e destino, e o rótulo mostra "4 m · restam 5 m"

#### Scenario: Prévia além do saldo
- **WHEN** Lion tem 5 m de saldo e o jogador arrasta o token 7 casas
- **THEN** o rótulo mostra "7 m · faltam 2 m", em vermelho

#### Scenario: Prévia some ao soltar
- **WHEN** o jogador solta o token
- **THEN** o contorno, a linha e o rótulo somem

#### Scenario: Fora do modo turno
- **WHEN** não há modo turno aberto e alguém arrasta um token
- **THEN** não aparece prévia tracejada nem rótulo de metros

### Requirement: Entrar no meio da disputa
Com o modo turno aberto (na fase de iniciativa ou durante a disputa), cada token com personagem que o Narrador põe na cena ativa SHALL entrar como participante novo, sem iniciativa (decisões do usuário, 2026-10-05):
- de um personagem que ainda não participa, ele entra como o grupo da ficha;
- de uma ficha que já participa (por exemplo, outro Goblin), ele SHALL jogar sozinho, com iniciativa, vez e saldo próprios. Na barra, os nomes repetidos ganham número: "Goblin", "Goblin 2", "Goblin 3".

A partir daí:
- o dono do personagem SHALL ver o aviso "Role iniciativa"; o Narrador rola pelos NPCs e monstros, como no começo;
- o Próximo turno SHALL ficar bloqueado até ele rolar;
- quando rolar, ele SHALL entrar na posição do seu resultado, e a vez atual SHALL continuar com o mesmo participante.

Um grupo que saiu todo da cena e volta SHALL manter a iniciativa que já tinha. Um token que jogava sozinho e sai da cena SHALL ficar fora da barra e ser pulado, sem travar o Próximo turno. A entrada SHALL ficar no registro da mesa e chegar à Sala de todos sem recarregar.

#### Scenario: Monstro chega no meio da disputa
- **WHEN** na rodada 2, vez de Lion, o Narrador põe na cena o token de um Lobo que não participava
- **THEN** o Lobo aparece na barra como "falta rolar", o Próximo turno trava, e a vez continua com Lion

#### Scenario: Jogador chega no meio da disputa
- **WHEN** o Narrador põe na cena o token do personagem de Bia durante a disputa
- **THEN** Bia vê o aviso "Role iniciativa", e, depois que ela rola, o personagem entra na posição do resultado e o Próximo turno destrava

#### Scenario: Outro token da mesma ficha
- **WHEN** com dois Goblins da mesma ficha na disputa desde o começo, o Narrador põe mais um Goblin
- **THEN** a barra mostra "Goblin (×2)" e "Goblin 2", que falta rolar; o Próximo turno trava até o Goblin 2 rolar, e ele tem a vez e o Deslocamento próprios

### Requirement: Brilho do token da vez
Durante a disputa, os tokens de quem está na vez SHALL brilhar no grid com um halo dourado que pulsa devagar (pedido do usuário, 2026-10-05), para todos que veem esses tokens. Com a preferência do sistema por menos movimento, o halo SHALL ficar parado. Na fase de iniciativa e fora do modo turno, nenhum token brilha.

#### Scenario: Vez do Goblin 2
- **WHEN** a vez passa ao Goblin 2, um token próprio da ficha do Goblin
- **THEN** só o token dele brilha, pulsando; os Goblins do grupo não brilham

#### Scenario: Menos movimento
- **WHEN** a pessoa usa a preferência do sistema por menos movimento
- **THEN** o token da vez tem o halo, parado

### Requirement: Destaque do token escolhido
O token escolhido na aba Tokens ou no grid SHALL ganhar no grid um aro azul-gelo, de cor diferente do brilho dourado da vez (pedido do usuário, 2026-10-05). O item escolhido na lista SHALL usar a mesma cor. Um novo clique no item escolhido SHALL tirar a escolha e o destaque.

#### Scenario: Escolher na aba Tokens
- **WHEN** o Narrador clica no Lobo na aba Tokens
- **THEN** o token do Lobo ganha o aro azul-gelo no grid, e o item do Lobo fica marcado na mesma cor

#### Scenario: Tirar a escolha
- **WHEN** ele clica de novo no Lobo
- **THEN** o aro e a marca somem
