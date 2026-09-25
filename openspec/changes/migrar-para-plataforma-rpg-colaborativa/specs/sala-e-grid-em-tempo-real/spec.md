# Spec Delta

## Purpose

Oferece uma sala compartilhada opcional com presença e grid, mantendo autoridade do servidor, proteção de segredos e recuperação consistente após reconexão.

## ADDED Requirements

### Requirement: Entrada autorizada na sala
Somente participantes autorizados da mesa SHALL poder ingressar nos canais privados e receber presença ou eventos da sala.

#### Scenario: Usuário removido tenta reconectar
- **WHEN** tenta ingressar no canal privado da mesa
- **THEN** o sistema recusa a inscrição e não transmite presença, mapa ou eventos

### Requirement: Presença de participantes
A sala SHALL indicar participantes conectados sem tratar presença efêmera como fonte de verdade para o estado persistente da mesa.

#### Scenario: Jogador perde conexão
- **WHEN** sua presença expira
- **THEN** os demais participantes o veem como desconectado sem remover personagem, token ou alterações confirmadas

### Requirement: Estado do grid validado pelo servidor
Movimentos e alterações persistentes no grid MUST ser autorizados e validados pelo servidor antes de se tornarem o estado confirmado da cena.

#### Scenario: Jogador move token sem controle
- **WHEN** tenta confirmar o movimento de um token não autorizado
- **THEN** o sistema rejeita a ação e mantém a posição confirmada anterior

### Requirement: Separação entre prévia e confirmação
O sistema SHALL tratar cursores, pings e prévias de arraste como eventos efêmeros e SHALL persistir apenas comandos confirmados que alterem a cena.

#### Scenario: Jogador arrasta e cancela um token
- **WHEN** interrompe o gesto antes de confirmar
- **THEN** nenhuma nova posição é persistida e os demais clientes retornam à posição confirmada

### Requirement: Reconexão por snapshot
Após reconectar, o cliente SHALL obter um snapshot autorizado do estado confirmado antes de aplicar novos eventos em tempo real.

#### Scenario: Cliente ficou desconectado durante alterações
- **WHEN** retorna à sala
- **THEN** o sistema carrega o estado atual completo que ele pode ver e somente depois acompanha novos eventos

### Requirement: Camadas ocultas do Narrador
O grid SHALL suportar elementos e informações visíveis apenas ao Narrador ou a destinatários autorizados.

#### Scenario: Monstro oculto é movido
- **WHEN** o Narrador altera sua posição em camada privada
- **THEN** jogadores não recebem evento que revele existência, identidade ou posição do monstro

### Requirement: Comportamento durante indisponibilidade
O cliente MUST informar quando não consegue confirmar comandos e MUST NOT apresentar uma alteração local não confirmada como estado persistido.

#### Scenario: Conexão cai durante um movimento
- **WHEN** a confirmação não chega ao servidor
- **THEN** o cliente sinaliza a falha e restaura ou mantém distinguível a última posição confirmada
