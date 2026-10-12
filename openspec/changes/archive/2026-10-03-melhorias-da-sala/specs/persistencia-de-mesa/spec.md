# Spec Delta

## MODIFIED Requirements

### Requirement: Módulos configuráveis por mesa
O sistema SHALL persistir quais módulos opcionais estão ativos em cada mesa sem alterar os dados de outras campanhas. A Sala (grid, cenas, tokens e rolagens) SHALL NOT ser um módulo opcional: ela está sempre ligada em toda mesa e não há como desligá-la (melhorias-da-sala, item 9).

#### Scenario: Grid está desabilitado em uma mesa
- **WHEN** um participante abre uma mesa criada antes desta mudança, em que o módulo de grid tinha ficado desabilitado
- **THEN** a Sala abre normalmente, porque o registro antigo do módulo é ignorado, e as demais capacidades seguem disponíveis

#### Scenario: Módulo opcional desligado em uma mesa
- **WHEN** um participante abre uma mesa sem um módulo opcional
- **THEN** o sistema mantém as demais capacidades disponíveis e não exige configurar esse módulo

#### Scenario: Sala sempre ligada
- **WHEN** o Narrador cria uma mesa nova e a abre
- **THEN** a Sala já está disponível, sem nenhuma ativação, e as rotas da Sala não recusam pedidos por módulo desligado
