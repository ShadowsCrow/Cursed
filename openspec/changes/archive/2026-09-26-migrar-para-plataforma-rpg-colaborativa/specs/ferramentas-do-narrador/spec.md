# Spec Delta

## Purpose

Concentra operações exclusivas do Narrador para administrar descanso, efeitos, entidades e segredos sem retirar dos jogadores a compreensão das consequências visíveis.

## ADDED Requirements

### Requirement: Administração de descanso
O Narrador SHALL poder iniciar ou registrar um descanso, selecionar participantes, parametrizar o nível de recuperação permitido e pré-visualizar consequências antes da confirmação.

#### Scenario: Descanso oferece recuperação parcial
- **WHEN** o Narrador confirma o descanso para personagens selecionados
- **THEN** o sistema aplica somente a recuperação autorizada, mostra os resultados aos jogadores afetados e registra a operação

### Requirement: Aplicação e encerramento de efeitos
O Narrador SHALL poder aplicar, ajustar, suspender e encerrar efeitos em entidades autorizadas, preservando origem, duração e motivo da mudança.

#### Scenario: Narrador aplica uma condição a um personagem
- **WHEN** confirma a aplicação
- **THEN** o efeito aparece no estado visível do personagem com sua origem e a ação entra no log

### Requirement: Entidades ocultas
O Narrador SHALL poder criar personagens, NPCs, monstros e outros recursos invisíveis para jogadores até que sua visibilidade seja alterada explicitamente.

#### Scenario: Narrador prepara monstro oculto
- **WHEN** salva a entidade sem revelá-la
- **THEN** somente participantes autorizados conseguem descobrir ou consultar sua existência

### Requirement: Visibilidade granular
O Narrador SHALL poder revelar uma entidade inteira ou apenas informações selecionadas, e o sistema MUST aplicar a mesma regra em ficha, grid, cartas, busca, notificações e auditoria.

#### Scenario: Token é revelado sem ficha completa
- **WHEN** o Narrador torna visíveis somente imagem e nome público
- **THEN** jogadores veem o token e essas informações, mas não recebem atributos, efeitos ocultos ou anotações privadas

### Requirement: Pré-visualização de impactos
Operações em massa ou mecanicamente relevantes do Narrador SHALL apresentar alvos, alterações previstas e exceções antes da confirmação.

#### Scenario: Descanso afetará vários personagens
- **WHEN** o Narrador abre a confirmação
- **THEN** o sistema lista resultados calculados por personagem e permite cancelar sem alterar o estado
