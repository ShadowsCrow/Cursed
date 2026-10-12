# Spec Delta

## ADDED Requirements

### Requirement: Preferência da mão dos jogadores
Na aba Mestre, sub-aba Preferências, o Narrador SHALL ter a chave **Ver as cartas dos jogadores**, ligada por padrão. Ligada, na vez de um personagem de jogador a mão de cartas dele SHALL aparecer também para o Narrador; desligada, o Narrador SHALL ver só a mão de NPCs e monstros. A preferência SHALL ser guardada pelo servidor com as demais preferências da Sala, SHALL entrar no registro da mesa quando mudar e SHALL NOT mudar o que o jogador vê.

#### Scenario: Desligar a mão dos jogadores
- **WHEN** o Narrador desliga "Ver as cartas dos jogadores" e é a vez de Lia
- **THEN** a mão de Lia some da tela do Narrador e continua na tela de Ana

#### Scenario: Só o Narrador muda
- **WHEN** um jogador tenta mudar a preferência pelo servidor
- **THEN** o servidor recusa

## MODIFIED Requirements

### Requirement: Estatísticas do jogador
A aba Jogador SHALL mostrar as estatísticas do próprio jogador em dois períodos, **Esta sessão** e **Campanha**. Sem sessão em andamento, "Esta sessão" SHALL mostrar a última sessão encerrada, com o número dela, ou um aviso de que ainda não houve sessão.

As estatísticas SHALL ser calculadas pelo servidor:
- **Vida perdida** e **Vida recuperada**: a soma das quedas e das subidas do PV atual dos personagens do jogador no período, pelas alterações registradas na mesa (dano, cura, descanso, ajustes). Mudanças só do PV máximo SHALL NOT contar;
- **Rolagens**: quantas rolagens o jogador fez no período;
- **Críticos** e **Falhas críticas**: quantos d20 dele receberam cada marca. Esses contadores SHALL aparecer só com o destaque de críticos ligado;
- **Sorte nos dados**: o quanto os valores naturais de todos os dados dele ficaram acima ou abaixo da média esperada de cada dado, em pontos percentuais, com um rótulo: "Dados quentes", "Na média" ou "Dados frios". Com menos de 10 dados no período, SHALL mostrar "Poucos dados ainda" em vez do rótulo;
- **PP gasto**: a soma do PP pago nos usos de carta dos personagens do jogador no período;
- **Cartas usadas**: quantos usos de carta os personagens do jogador fizeram no período;
- **Carta favorita**: o título da carta mais usada no período, com a quantidade; em empate, a usada por último. Sem uso, SHALL mostrar "Nenhuma ainda".

Usos desfeitos pelo Narrador SHALL NOT contar. As rolagens ocultas do Narrador SHALL NOT entrar nas estatísticas de nenhum jogador. Um jogador SHALL NOT poder pedir ao servidor as estatísticas individuais de outro, salvo pelo placar visível (requisito "Placar da mesa visível").

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

#### Scenario: PP gasto e carta favorita
- **WHEN** na sessão atual Lia usou "Lança de Fogo" (3 PP) duas vezes e "Égide" (1 PP) uma vez
- **THEN** a aba Jogador de Lia mostra, em "Esta sessão", PP gasto 7, cartas usadas 3 e carta favorita "Lança de Fogo (2)"

#### Scenario: Uso desfeito não conta
- **WHEN** o Narrador desfaz um dos usos de "Lança de Fogo"
- **THEN** PP gasto passa a 4 e cartas usadas a 2
