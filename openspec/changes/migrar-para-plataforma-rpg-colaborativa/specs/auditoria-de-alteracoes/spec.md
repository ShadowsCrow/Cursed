# Spec Delta

## Purpose

Fornece ao Narrador uma trilha confiável das alterações relevantes da mesa, favorecendo transparência e correção sem registrar ruído de digitação ou expor conteúdo oculto.

## ADDED Requirements

### Requirement: Eventos semânticos imutáveis
O sistema SHALL registrar ações confirmadas em eventos semânticos com ator, mesa, alvo, horário, origem e resumo da mudança, e MUST NOT substituir ou apagar eventos para simular correções.

#### Scenario: Jogador altera um atributo
- **WHEN** a alteração é confirmada
- **THEN** o log registra o atributo, o valor anterior, o novo valor, o jogador e o personagem afetado em um único evento compreensível

### Requirement: Ausência de ruído de edição
O sistema MUST NOT criar eventos permanentes para cada tecla, foco, prévia de arraste ou autosave intermediário que não represente uma mudança confirmada.

#### Scenario: Jogador digita e corrige uma anotação antes de salvar
- **WHEN** o jogador confirma a versão final
- **THEN** o log contém somente a alteração confirmada, não cada estado intermediário do texto

### Requirement: Consulta pelo Narrador
O Narrador SHALL poder filtrar a atividade por sessão, ator, personagem, categoria e relevância mecânica.

#### Scenario: Narrador investiga alterações de inventário
- **WHEN** filtra o log de um personagem pela categoria de inventário
- **THEN** o sistema apresenta as ações correspondentes em ordem temporal com detalhes suficientes para compreensão

### Requirement: Correção rastreável
Uma restauração ou correção SHALL criar uma nova ação vinculada à anterior e SHALL preservar ambos os eventos.

#### Scenario: Narrador restaura um valor anterior
- **WHEN** confirma a restauração e informa um motivo opcional
- **THEN** o sistema aplica a mudança autorizada e registra quem restaurou, o que foi restaurado e qual evento motivou a correção

### Requirement: Respeito à visibilidade
O log MUST ocultar de cada participante eventos e detalhes provenientes de recursos aos quais ele não possui acesso.

#### Scenario: Narrador altera um NPC oculto
- **WHEN** um jogador consulta a atividade disponível para ele
- **THEN** o sistema não revela a existência, o nome ou os detalhes do NPC oculto
