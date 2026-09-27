# Spec Delta

## Purpose

Permite criar e administrar personagens dentro de uma mesa com propriedade explícita, autoridade do Narrador e proteção contra alterações ou exclusões indevidas.

## ADDED Requirements

### Requirement: Personagem pertence a uma mesa
Todo personagem SHALL pertencer a uma mesa e SHALL possuir proprietário jogador, proprietário Narrador ou controle exclusivo do Narrador.

#### Scenario: Jogador cria personagem próprio
- **WHEN** um jogador autorizado cria uma ficha na mesa
- **THEN** o sistema vincula o personagem à mesa e registra o jogador como proprietário

### Requirement: Acesso às fichas próprias
O jogador SHALL poder consultar suas fichas e SHALL poder editá-las ou excluí-las somente conforme a política definida pelo Narrador.

#### Scenario: Edição própria está permitida
- **WHEN** o proprietário altera um campo autorizado da ficha
- **THEN** o sistema salva a alteração e registra a ação na auditoria

### Requirement: Autoridade do Narrador sobre personagens
O Narrador SHALL poder consultar os personagens da mesa, ajustar propriedade, bloquear campos, autorizar ações pendentes e administrar fichas sem proprietário jogador.

#### Scenario: Narrador bloqueia progressão mecânica
- **WHEN** um jogador tenta alterar um campo de progressão bloqueado
- **THEN** o sistema impede a alteração direta e oferece o fluxo de solicitação definido para a mesa

### Requirement: Exclusão recuperável
A exclusão de personagem SHALL remover seu uso normal sem destruir imediatamente histórico, auditoria ou dados necessários para recuperação administrativa.

#### Scenario: Jogador exclui uma ficha por engano
- **WHEN** o Narrador restaura uma ficha ainda dentro do período de retenção
- **THEN** o personagem retorna com seus vínculos e estado confirmados anteriores à exclusão
