# Spec Delta

## ADDED Requirements

### Requirement: Ações do turno
Cada participante da disputa SHALL ter os três recursos da regra: **Ação Padrão**, **Ação Bônus** e **Reação**. Ao receber a vez, os três SHALL voltar a disponíveis. Usar uma carta SHALL gastar a ação que o Lançamento dela declara: Ação Bônus quando o Lançamento diz "Bônus"; Reação quando a carta é de reação; nenhuma quando o Lançamento diz "Livre"; Ação Padrão nos demais casos, inclusive rituais e lançamentos em minutos, e a carta SHALL avisar quando o Lançamento foi lido como Ação Padrão por falta de encaixe.

A barra SHALL mostrar os três recursos ao Narrador e ao dono do personagem da vez, apagando o que foi gasto. O Narrador SHALL poder **devolver** qualquer recurso de qualquer participante. Ação Livre e Ação de Movimento SHALL NOT ser controladas.

#### Scenario: Recursos voltam na vez
- **WHEN** Lia gastou a Ação Padrão e a Reação na rodada 1 e recebe a vez na rodada 2
- **THEN** a barra mostra Ação Padrão, Ação Bônus e Reação disponíveis

#### Scenario: Reação gasta fora da vez
- **WHEN** na vez do Goblin Lia usa uma carta de reação
- **THEN** a Reação de Lia fica gasta até o começo da próxima vez dela, e as outras ações não mudam

#### Scenario: Narrador devolve a ação
- **WHEN** Lia usou uma carta de Ação Bônus por engano e o Narrador escolhe "Devolver Ação Bônus"
- **THEN** a Ação Bônus de Lia volta a disponível, sem mexer no PP

#### Scenario: Lançamento sem encaixe
- **WHEN** Lia usa "Rito de Consagração", cujo Lançamento é "Ritual (10 min)"
- **THEN** a Ação Padrão fica gasta, e a carta mostra o aviso de que o Lançamento foi lido como Ação Padrão

### Requirement: Numeração estável dos nomes repetidos
Os nomes repetidos da barra ("Goblin", "Goblin 2", "Goblin 3") SHALL seguir a ordem em que cada participante entrou no modo turno: o grupo da ficha fica com o nome puro e os tokens próprios recebem os números na ordem em que foram postos na cena. Essa numeração SHALL ser a mesma em toda leitura, para todos, e SHALL NOT mudar com as rolagens de iniciativa nem com a vez. Os participantes que ainda não rolaram SHALL aparecer, entre si, na ordem de entrada.

#### Scenario: Dois Goblins postos em sequência
- **WHEN** com o grupo "Goblin" na disputa, o Narrador põe mais um Goblin e, depois, outro
- **THEN** o primeiro posto é "Goblin 2" e o segundo é "Goblin 3", em todas as telas e em toda leitura, antes e depois de rolarem

#### Scenario: Pendentes na ordem de chegada
- **WHEN** o Goblin 2 e o Goblin 3 ainda não rolaram
- **THEN** a barra e o aviso "Falta rolar a iniciativa de Goblin 2, Goblin 3" os listam nessa ordem

## MODIFIED Requirements

### Requirement: Vez e rodadas
Durante a disputa, o Narrador SHALL avançar a vez com **Próximo turno**, e o jogador SHALL poder encerrar a própria vez com **Encerrar meu turno**, na barra, quando a vez for de um participante que ele controla: a ficha própria ou um participante cujo token o Narrador liberou para ele (decisão do usuário, 2026-10-06). O controle é por token: com só o "Lagarto-macaco 2" liberado, o jogador encerra a vez do 2, e não a do 1 nem a do grupo da mesma ficha. O mesmo vale para rolar a iniciativa, mover e Correr. A vez SHALL passar ao próximo participante da ordem, pulando quem não tem mais token na cena ativa. Enquanto alguém na cena estiver sem iniciativa, avançar a vez SHALL ser recusado para os dois (requisito "Começar a disputa e quem falta rolar"). Depois do último, a vez SHALL voltar ao primeiro, e a rodada SHALL aumentar em 1. O servidor SHALL recusar o pedido de quem não é o Narrador nem controla o personagem da vez.

Avançar a vez SHALL entrar no registro da mesa, dizendo quando foi o jogador que encerrou, e chegar à Sala de todos sem recarregar.

#### Scenario: Avançar a vez
- **WHEN** a ordem é Kira, Goblin e Lion, é a vez de Kira e o Narrador escolhe "Próximo turno"
- **THEN** a vez passa ao Goblin, para toda a mesa

#### Scenario: Nova rodada
- **WHEN** é a vez de Lion, o último da ordem, e o Narrador escolhe "Próximo turno"
- **THEN** a vez volta a Kira, e a barra mostra "Rodada 2"

#### Scenario: Participante fora da cena
- **WHEN** o Narrador retira o último token do Goblin da cena e avança a vez de Kira
- **THEN** a vez pula o Goblin e vai a Lion, e o Goblin some da barra

#### Scenario: Jogador encerra a própria vez
- **WHEN** é a vez de Kira e a jogadora dela escolhe "Encerrar meu turno"
- **THEN** a vez passa ao Goblin, para toda a mesa, e o registro diz que Kira encerrou o turno

#### Scenario: Jogador fora da vez
- **WHEN** é a vez de Kira e o jogador de Lion pede ao servidor para avançar a vez
- **THEN** o servidor recusa, e Lion não vê "Encerrar meu turno" na barra

#### Scenario: Companion na vez
- **WHEN** é a vez de Bolota, companion sem dono cujo token o Narrador liberou para Ana, e Ana escolhe "Encerrar meu turno"
- **THEN** a vez passa ao próximo, e o jogador de Lion não tem o botão

#### Scenario: Só o token liberado
- **WHEN** o Narrador libera para Ana só o token "Goblin 2", de uma ficha com o grupo "Goblin" na disputa, e é a vez do grupo
- **THEN** Ana não tem "Encerrar meu turno" e o servidor recusa; na vez do Goblin 2, ela encerra

#### Scenario: Jogador travado por quem falta rolar
- **WHEN** é a vez de Lion, o Ogro entrou na cena sem rolar iniciativa, e o jogador de Lion tenta "Encerrar meu turno"
- **THEN** o botão está desativado com "Falta rolar a iniciativa de Ogro.", e o servidor recusa o pedido

### Requirement: Correr
Na própria vez, o jogador SHALL poder escolher **Correr**, que troca a Ação Padrão por uma segunda Ação de Movimento, como manda a regra. Com isso, o saldo do turno SHALL passar a ser o dobro do Deslocamento, mantendo o que já foi gasto, e a **Ação Padrão SHALL ficar gasta**. Correr SHALL ser recusado quando a Ação Padrão já foi gasta na vez. Correr SHALL valer só até o fim daquela vez e SHALL NOT poder ser desfeito nela, salvo pelo Narrador devolvendo a Ação Padrão. O Narrador SHALL poder marcar Correr para qualquer participante na vez.

O servidor SHALL recusar Correr fora da vez do personagem ou fora da disputa. A barra SHALL mostrar "Correndo" junto do saldo.

#### Scenario: Correr dobra o saldo
- **WHEN** Lion tem Deslocamento 9, já andou 5 m na vez e o jogador escolhe "Correr"
- **THEN** o saldo passa a "Deslocamento: 13 de 18 m · Correndo", e a Ação Padrão aparece gasta

#### Scenario: Correr fora da vez
- **WHEN** o jogador de Lion pede Correr na vez do Goblin
- **THEN** o servidor recusa

#### Scenario: Correr com a Ação Padrão gasta
- **WHEN** Lion já usou uma carta de Ação Padrão nesta vez e o jogador pede Correr
- **THEN** o servidor recusa, e o botão "Correr" aparece desativado com "Ação Padrão já usada"
