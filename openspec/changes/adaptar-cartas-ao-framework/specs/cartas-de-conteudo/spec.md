# Spec Delta

## MODIFIED Requirements

### Requirement: Campos mecânicos permanecem distintos
Cartas de habilidade e magia SHALL preservar separadamente Custo de Aprendizado, Descansos Mínimos, Potência de Uso, Custo de Uso e custos adicionais quando definidos, e MUST NOT inferir automaticamente esses valores a partir do campo legado `custo`. Grau, Descansos Mínimos e Custo de Uso SHALL ser calculados a partir do Custo de Aprendizado e da Potência de Uso pelas tabelas do Framework, conforme a capacidade `criacoes-do-framework`; o campo legado `custo` SHALL continuar fora desse cálculo.

#### Scenario: Carta legada possui apenas custo textual
- **WHEN** a carta é migrada sem cálculo mecânico validado
- **THEN** o sistema mantém os campos especializados indefinidos e sinaliza revisão em vez de inventar valores

#### Scenario: Carta com custos calculados
- **WHEN** uma magia tem Custo de Aprendizado `22` e Potência de Uso `11`
- **THEN** o sistema mostra Grau "Simples", Descansos Mínimos `4` e Custo de Uso `2 PP`, sem consultar o custo legado

### Requirement: Importação portátil com pré-visualização
O sistema SHALL continuar aceitando formatos portáteis compatíveis para importação, incluindo o código de criação `CR1` para habilidades e magias, mas SHALL exibir conteúdo, versão, procedência e avisos de validação antes de criar uma carta ou instância.

#### Scenario: Código importado contém conteúdo inválido
- **WHEN** o usuário tenta confirmar a importação
- **THEN** o sistema rejeita o conteúdo sem alterar catálogo ou personagem e explica os problemas encontrados

#### Scenario: Código de criação de uma habilidade
- **WHEN** o Narrador pré-visualiza um código `CR1` de uma habilidade de combo
- **THEN** a pré-visualização mostra o tipo Habilidade, o título, o Combo, os custos calculados e a procedência "importação CR1", e confirmar cria um rascunho no catálogo da mesa
