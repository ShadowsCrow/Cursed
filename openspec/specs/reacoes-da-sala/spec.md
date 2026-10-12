# reacoes-da-sala Specification

## Purpose
Deixar a mesa reagir ao que acontece na cena sem interromper ninguém: um botão discreto no grid lança balões passageiros com figuras pintadas, vistos por toda a Sala.

## Requirements

### Requirement: Botão de reação no grid
A Sala SHALL ter, no canto inferior direito do grid, acima do controle de zoom, um botão flutuante e discreto **Reagir**, visível a todos os participantes. Ao escolhê-lo, SHALL abrir uma bandeja pequena com as reações, cada uma com a pintura própria e o nome como nome acessível e dica. As reações SHALL ser: **Aplausos**, **Risada**, **Susto**, **Caveira**, **Chama** e **Coração**. Escolher uma reação SHALL lançá-la e fechar a bandeja. A bandeja SHALL fechar com Esc ou com um clique fora, devolvendo o foco ao botão, e SHALL poder ser usada pelo teclado. O botão e a bandeja SHALL NOT bloquear o uso do grid fora deles.

Cada pessoa SHALL poder lançar no máximo uma reação por segundo; as que passarem disso SHALL ser ignoradas.

#### Scenario: Reagir
- **WHEN** Lion abre "Reagir" e escolhe "Chama"
- **THEN** a bandeja fecha e sobe um balão com a figura da chama

#### Scenario: Pelo teclado
- **WHEN** o jogador chega ao botão "Reagir" pelo Tab, abre a bandeja com Enter e escolhe "Aplausos" pelas setas
- **THEN** a reação é lançada e o foco volta ao botão

#### Scenario: Reações em rajada
- **WHEN** alguém clica cinco reações em menos de um segundo
- **THEN** só a primeira é lançada

### Requirement: Balões de reação
Uma reação lançada SHALL aparecer para todos na Sala como um balão pequeno com a pintura da reação e o apelido de quem reagiu. O balão SHALL subir pelo canto direito do grid, perto do botão, e sumir sozinho em cerca de 3 segundos. Vários balões SHALL poder aparecer ao mesmo tempo, sem se sobrepor por completo, e no máximo 8 de uma vez; os mais antigos saem primeiro. Com a preferência do sistema por menos movimento, o balão SHALL aparecer e sumir sem subir.

Os balões SHALL NOT receber cliques e SHALL ser ignorados por leitores de tela. As reações SHALL ser passageiras: SHALL chegar pelo tempo real da Sala, sem ficar guardadas no servidor nem no registro da mesa. Quem lança SHALL ver o próprio balão na hora. Sem o tempo real, os outros SHALL NOT receber a reação, e nada mais na Sala deixa de funcionar.

#### Scenario: Toda a mesa vê
- **WHEN** Lion lança "Risada" numa mesa com tempo real
- **THEN** o Narrador e os outros jogadores veem subir o balão da risada com "Lion"

#### Scenario: Balão some sozinho
- **WHEN** um balão aparece
- **THEN** ele some em cerca de 3 segundos, sem nenhuma ação

#### Scenario: Menos movimento
- **WHEN** quem recebe a reação prefere menos movimento no sistema
- **THEN** o balão aparece e some no lugar, sem subir

#### Scenario: Reação não fica guardada
- **WHEN** alguém recarrega a Sala depois de várias reações
- **THEN** nenhuma reação antiga reaparece, e o registro da mesa não as lista
