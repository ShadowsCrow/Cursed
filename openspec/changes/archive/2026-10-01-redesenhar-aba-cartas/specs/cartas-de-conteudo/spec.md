## ADDED Requirements

### Requirement: Custos de aprendizado reservados ao Narrador
O Custo de Aprendizado e os Descansos Mínimos de habilidades e magias SHALL ser visíveis só para o Narrador da mesa. Toda carta que o sistema entrega a outro participante MUST NOT conter esses dois valores. Isso vale para as cartas da ficha, as candidatas de uma oferta, a resposta a uma oferta, a resposta a uma mudança de estado da carta e as cartas apresentadas. A Potência de Uso, o Custo de Uso e os custos adicionais SHALL continuar visíveis a quem vê a carta. Os valores guardados, o catálogo do Narrador e o ciclo de aprendizado SHALL continuar como antes.

#### Scenario: Jogador consulta as cartas do personagem
- **WHEN** o jogador pede as cartas do próprio personagem, e uma magia tem Custo de Aprendizado 22 e Descansos Mínimos 4
- **THEN** a resposta traz a magia com a Potência de Uso e o Custo de Uso, sem o Custo de Aprendizado e sem os Descansos Mínimos

#### Scenario: Narrador consulta as mesmas cartas
- **WHEN** o Narrador pede as cartas do mesmo personagem
- **THEN** a resposta traz a magia com Custo de Aprendizado 22 e Descansos Mínimos 4

#### Scenario: Jogador escolhe numa oferta
- **WHEN** o jogador abre uma oferta com duas habilidades
- **THEN** as candidatas chegam sem o Custo de Aprendizado e sem os Descansos Mínimos, e a escolha funciona como antes

#### Scenario: Carta apresentada à mesa
- **WHEN** o Narrador apresenta uma magia aos jogadores
- **THEN** os jogadores veem a magia sem o Custo de Aprendizado e sem os Descansos Mínimos

#### Scenario: Aprendizado continua pelo Narrador
- **WHEN** uma habilidade está em aprendizado e o Narrador a conclui
- **THEN** ela passa a aprendida como antes, e os valores guardados na carta não mudam
