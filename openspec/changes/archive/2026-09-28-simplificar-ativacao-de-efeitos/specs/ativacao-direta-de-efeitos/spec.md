# Spec Delta

## Purpose

Permitir que a mesa ative diretamente efeitos descritos pelo Narrador e que uma ficha digital calcule modificadores numéricos opcionais sem exigir um segundo registro de condição.

## ADDED Requirements

### Requirement: Condição é um efeito oficial ativável

Cada condição padronizada SHALL corresponder a uma única definição no catálogo oficial. Ao dizer que um personagem está Cego, a mesa SHALL ativar o efeito Cego diretamente e SHALL desativá-lo quando a causa terminar. O jogador não SHALL precisar criar uma aplicação técnica separada.

#### Scenario: Fumaça cega Lia

- **WHEN** o Narrador informa que Lia está Cega pela fumaça
- **THEN** Lia ativa o efeito oficial Cego
- **AND** a descrição do efeito governa suas ações até que seja desativado

### Requirement: Descrição governa a regra e modificadores são opcionais

Toda definição de efeito MUST possuir nome e descrição. Um efeito MAY declarar modificadores numéricos com alvo e contexto explícitos. A ausência de metadados não SHALL invalidar a regra descrita nem autorizar a ficha a inferir números do texto. Cálculos só SHALL usar metadados aplicáveis ao teste solicitado.

#### Scenario: Ataque que depende da visão

- **WHEN** Cego está ativo e o personagem faz um ataque que depende da visão
- **THEN** a ficha pode incluir `-4` se o cálculo desse ataque consumir os metadados
- **AND** a pessoa consegue consultar a descrição para resolver o restante do efeito

#### Scenario: Ação guiada por audição

- **WHEN** Cego está ativo e a ação não depende da visão
- **THEN** o modificador visual não é aplicado automaticamente

### Requirement: Efeitos sobrepostos não duplicam a mesma penalidade

Uma definição MAY declarar quais efeitos mais brandos substitui. Quando Cego e Ofuscado estiverem ativos, o cálculo de uma mesma rolagem visual SHALL usar Cego sem somar a penalidade visual de Ofuscado. O registro manual da mesa continua responsável por decidir quando cada efeito termina.

#### Scenario: Cego e Ofuscado simultâneos

- **WHEN** Cego e Ofuscado estão ativos em um ataque visual
- **THEN** o modificador visual total dessas duas definições é `-4`

### Requirement: Compartilhamento atual aceita metadados opcionais

Efeitos e equipamentos compartilhados nos formatos E1 e EQ1 SHALL continuar legíveis. Um efeito privado MAY trazer modificadores numéricos opcionais nesses formatos, mantendo nome e descrição completos e sem exigir um novo formato ou cadastro no catálogo oficial. Campos que pedem execução de código não SHALL ser interpretados como modificadores.

#### Scenario: Item exclusivo com bônus

- **WHEN** o Narrador compartilha um equipamento EQ1 com efeito privado e um modificador numérico
- **THEN** o receptor obtém o efeito e seus metadados dentro do item
- **AND** o catálogo oficial não é alterado

### Requirement: Consequências permanecem independentes do efeito temporário

Trauma, Ferimento Grave, Sequela e Aflição SHALL manter seus registros e tratamento próprios. Uma consequência MAY indicar efeitos oficiais relevantes ao estado atual; encerrar a consequência SHALL retirar somente sua indicação, enquanto a mesa SHALL manter o efeito se outra causa ainda estiver válida.

#### Scenario: Ferimento e fumaça causam Cego

- **WHEN** um ferimento e uma fumaça justificam Cego ao mesmo tempo
- **THEN** a mesa mantém Cego ativo até ambas as causas terminarem
- **AND** não soma duas cópias da penalidade

### Requirement: Exemplos não criam catálogo de produção

Exemplos e amostras de teste SHALL ficar fora da pasta de dados de produção. O catálogo oficial e as bibliotecas externas existentes SHALL continuar sendo os únicos arquivos de definições de efeitos utilizados por suas respectivas rotinas.

#### Scenario: Consultar efeitos disponíveis

- **WHEN** o sistema carrega seus efeitos reais
- **THEN** não carrega um arquivo de exemplos como biblioteca adicional
