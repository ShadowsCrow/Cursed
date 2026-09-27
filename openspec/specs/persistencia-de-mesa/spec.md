# Persistência de Mesa Specification

## Purpose

Garante que cada mesa preserve seu estado confirmado entre sessões e possa ser retomada com consistência após saída, falha ou reconexão dos participantes.

## Requirements

### Requirement: Estado confirmado persistente
O sistema SHALL persistir o estado confirmado de mesas, personagens, cenas, cartas, entidades e configurações que devam sobreviver ao encerramento de uma sessão.

#### Scenario: Todos deixam a mesa
- **WHEN** o último participante desconecta e a mesa é aberta posteriormente
- **THEN** o sistema apresenta o último estado confirmado sem depender da memória do navegador anterior

### Requirement: Sessões identificáveis
O Narrador SHALL poder iniciar e encerrar sessões vinculadas à mesa, e alterações ocorridas durante uma sessão SHALL manter essa associação quando aplicável.

#### Scenario: Narrador consulta uma sessão anterior
- **WHEN** o Narrador filtra a atividade por uma sessão encerrada
- **THEN** o sistema apresenta os eventos associados àquela sessão

### Requirement: Concorrência controlada
O sistema MUST impedir que uma gravação baseada em versão antiga substitua silenciosamente uma alteração confirmada mais recente.

#### Scenario: Dois clientes editam o mesmo recurso
- **WHEN** o segundo cliente tenta confirmar uma alteração baseada em uma versão desatualizada
- **THEN** o sistema rejeita ou reconcilia explicitamente a alteração e informa o conflito ao cliente

### Requirement: Módulos configuráveis por mesa
O sistema SHALL persistir quais módulos opcionais estão ativos em cada mesa sem alterar os dados de outras campanhas.

#### Scenario: Grid está desabilitado em uma mesa
- **WHEN** um participante abre uma mesa sem o módulo de grid
- **THEN** o sistema mantém as demais capacidades disponíveis e não exige configuração de cenas ou mapas
