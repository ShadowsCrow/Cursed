# Acesso e Mesas Specification

## Purpose

Define identidades, mesas e permissões contextualizadas para que cada participante acesse somente recursos e ações autorizados naquela campanha.

## Requirements

### Requirement: Acesso autenticado
O sistema SHALL exigir uma identidade autenticada para acessar mesas, personagens e salas privadas.

#### Scenario: Usuário não autenticado tenta abrir uma mesa
- **WHEN** uma pessoa sem sessão válida tenta acessar uma mesa privada
- **THEN** o sistema bloqueia o conteúdo e solicita autenticação

### Requirement: Papéis pertencem à mesa
O sistema SHALL associar papéis e participação à mesa, permitindo que a mesma pessoa tenha responsabilidades diferentes em mesas distintas.

#### Scenario: Usuário é Narrador em uma mesa e jogador em outra
- **WHEN** o usuário alterna entre as duas mesas
- **THEN** o sistema aplica somente as permissões correspondentes ao papel exercido na mesa atual

### Requirement: Autorização por recurso e ação
O sistema MUST validar no servidor a participação, o papel, a propriedade e as permissões específicas antes de ler ou alterar recursos de uma mesa, adotando negação por padrão.

#### Scenario: Jogador tenta alterar personagem de outro jogador
- **WHEN** um jogador envia uma alteração sem a permissão necessária
- **THEN** o sistema rejeita a ação sem modificar o personagem e registra a tentativa de forma segura

### Requirement: Configuração de permissões dos jogadores
O Narrador SHALL poder configurar por mesa se jogadores podem criar, editar e excluir personagens próprios e quais alterações mecânicas exigem aprovação.

#### Scenario: Criação de personagens está desabilitada
- **WHEN** um jogador tenta criar um personagem em uma mesa cuja política não permite criação
- **THEN** o sistema explica a restrição e não cria o personagem

### Requirement: Revogação de participação
O sistema SHALL interromper novos acessos privados quando a participação de um usuário for removida, preservando o histórico das ações já realizadas.

#### Scenario: Jogador é removido da mesa
- **WHEN** o Narrador remove a participação de um jogador
- **THEN** o jogador perde acesso aos recursos e canais privados da mesa sem apagar eventos históricos atribuídos a ele
