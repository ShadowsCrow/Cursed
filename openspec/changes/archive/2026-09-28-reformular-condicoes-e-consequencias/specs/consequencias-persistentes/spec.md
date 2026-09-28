# Consequências Persistentes

## Purpose

Definir consequências abertas e ligadas à ficção que permaneçam além de uma cena, registrem sua origem e evolução e exijam tratamento próprio sem serem escondidas em condições temporárias ou trilhas numéricas.

## ADDED Requirements

### Requirement: Consequências formam um catálogo aberto

O sistema SHALL permitir consequências persistentes específicas à ficção, sem limitar seus nomes a uma lista fechada. Uma consequência MUST usar uma categoria padronizada, mas seu nome, manifestação, gatilhos e tratamento MAY ser definidos pela fonte ou pelo Narrador.

#### Scenario: Ferimento específico da ficção

- **WHEN** uma queda causa um Ferimento Grave
- **THEN** a consequência pode ser registrada como “Tornozelo Esmagado” com efeitos e tratamento próprios
- **AND** não exige a criação de uma condição universal com esse nome

#### Scenario: Maldição singular

- **WHEN** um artefato causa uma maldição que não corresponde às categorias especializadas
- **THEN** ela pode ser registrada como Outra Consequência com nome e regras próprios

### Requirement: Categorias de consequência

Toda consequência MUST pertencer a uma das categorias abaixo:

|Categoria|Finalidade|
|---|---|
|Trauma|Consequência psicológica com gatilho, manifestação e tratamento.|
|Ferimento Grave|Consequência física específica, estabilizável ou tratável.|
|Sequela|Consequência duradoura ou permanente, com adaptação, mitigação ou remoção excepcional quando aplicável.|
|Aflição|Processo que pode evoluir por estágios, como doença, intoxicação, veneno persistente, corrupção ou maldição progressiva.|
|Outra Consequência|Efeito persistente que não pertence às categorias anteriores.|

#### Scenario: Veneno persistente vira Aflição

- **WHEN** um veneno continua produzindo efeitos depois do dano inicial
- **THEN** seu processo persistente é registrado como Aflição
- **AND** o dano de Veneno inicial permanece um evento separado

#### Scenario: Perda duradoura vira Sequela

- **WHEN** uma consequência altera o personagem de forma duradoura e não representa somente um ferimento em tratamento
- **THEN** ela é registrada como Sequela

### Requirement: Registro mínimo de consequência

Toda consequência MUST registrar identificador estável, categoria, nome, descrição, origem, manifestação ou efeito atual, estado e regra de tratamento ou encerramento. Gatilho MUST ser informado quando a consequência reagir a uma situação específica. Progressão, intensidade, observações e imagem MAY ser registrados quando aplicáveis.

#### Scenario: Trauma possui dados suficientes

- **WHEN** um Trauma é criado
- **THEN** seu registro permite identificar de onde veio, o que o aciona, como se manifesta e como pode ser tratado

#### Scenario: Registro incompleto

- **WHEN** uma consequência não informa origem ou regra de tratamento e encerramento
- **THEN** ela deve ser completada antes de ser usada como consequência persistente

### Requirement: Estados de tratamento são explícitos

Uma consequência SHALL possuir um dos estados `ativo`, `mitigado`, `em tratamento` ou `encerrado`. Alterar seu estado não SHALL apagar sua origem nem seu histórico. Uma consequência encerrada MAY permanecer no registro como memória narrativa sem continuar aplicando efeitos mecânicos.

#### Scenario: Ferimento é mitigado

- **WHEN** primeiros socorros reduzem temporariamente os efeitos de um Ferimento Grave sem curá-lo
- **THEN** seu estado passa a Mitigado
- **AND** o Ferimento e sua origem permanecem registrados

#### Scenario: Consequência encerrada permanece como história

- **WHEN** uma consequência cumpre sua condição de encerramento
- **THEN** deixa de aplicar seus efeitos ativos
- **AND** pode permanecer registrada como encerrada

### Requirement: Recuperação comum não remove consequências

Reduzir PV perdido, Exaustão ou Estresse e concluir um descanso comum não SHALL remover ou avançar automaticamente Trauma, Ferimento Grave, Sequela ou Aflição. Uma consequência somente SHALL mudar quando sua regra própria, um tratamento ou uma fonte aplicável declarar isso.

#### Scenario: Cura de PV não encerra fratura

- **WHEN** um personagem com um Ferimento Grave recupera todos os seus PV
- **THEN** o Ferimento Grave permanece no estado anterior

#### Scenario: Descanso reduz Estresse sem tratar Trauma

- **WHEN** um descanso reduz o Estresse de um personagem com Trauma
- **THEN** o Trauma não avança tratamento apenas por essa redução

### Requirement: Progressão pertence à consequência

Uma consequência MAY possuir intensidade ou estágios próprios. A regra da consequência MUST declarar os gatilhos de progressão, regressão e transição quando esses mecanismos existirem. O sistema não SHALL criar uma tabela universal de progressão para todas as categorias.

#### Scenario: Aflição avança por estágio

- **WHEN** o gatilho de progressão de uma Aflição é satisfeito
- **THEN** ela avança para o estágio descrito em sua própria regra
- **AND** aplica somente os efeitos declarados para esse estágio

#### Scenario: Consequência sem progressão

- **WHEN** uma consequência não declara intensidade nem estágios
- **THEN** ela permanece com o mesmo funcionamento até ser mitigada ou encerrada

### Requirement: Consequências equivalentes não duplicam sem necessidade

Quando uma nova origem ou evento corresponder à mesma consequência já ativa, o Narrador MUST decidir, conforme a regra da fonte, entre intensificar, atualizar ou manter o registro existente. O sistema não SHALL criar automaticamente uma cópia idêntica com mesmo nome e origem. Consequências distintas podem coexistir mesmo quando compartilham categoria.

#### Scenario: Trauma equivalente retorna

- **WHEN** um personagem sofre novo evento equivalente a um Trauma ativo da mesma origem
- **THEN** o Trauma existente é intensificado ou atualizado conforme sua regra
- **AND** uma cópia idêntica não é criada

#### Scenario: Dois ferimentos diferentes coexistem

- **WHEN** um personagem sofre “Costelas Fraturadas” e “Tornozelo Esmagado”
- **THEN** ambos permanecem como Ferimentos Graves separados

### Requirement: Consequência pode indicar efeitos oficiais

Uma consequência MAY indicar um ou mais efeitos oficiais enquanto um gatilho, estágio ou estado permanecer válido. O vínculo MUST identificar a consequência como causa. Desativar um efeito temporário não SHALL remover a consequência, salvo quando sua regra disser isso; encerrar a consequência SHALL retirar somente o vínculo sustentado por ela.

#### Scenario: Ferimento vincula Imobilizado

- **WHEN** “Tornozelo Esmagado” declara Imobilizado enquanto não estiver estabilizado
- **THEN** o Ferimento Grave indica o efeito oficial Imobilizado enquanto o justificar
- **AND** o jogador mantém Imobilizado ativo na ficha
- **AND** estabilizar o ferimento permite desativá-lo se não houver outra causa

#### Scenario: Condição também possui outra origem

- **WHEN** uma consequência encerrada e uma magia ativa são origens separadas de Cego
- **THEN** encerrar a consequência remove somente seu vínculo com Cego
- **AND** Cego permanece pela magia
- **AND** a penalidade de Cego continua aplicada uma única vez

### Requirement: Condições temporárias não se tornam consequências por duração

Uma condição não SHALL virar consequência apenas por durar muitas cenas, e uma consequência não SHALL virar condição apenas por impor uma restrição mecânica. A classificação SHALL depender de sua função: condição é palavra-chave mecânica padronizada; consequência é registro persistente e específico ligado à ficção.

#### Scenario: Cego persiste por uma maldição

- **WHEN** uma maldição deixa um personagem Cego até ser quebrada
- **THEN** a maldição é registrada como consequência
- **AND** o efeito oficial Cego permanece ativo enquanto a maldição o justificar

#### Scenario: Ferimento impõe penalidade sem condição apropriada

- **WHEN** um Ferimento Grave causa uma limitação que não corresponde a uma condição padronizada
- **THEN** a limitação fica descrita na consequência
- **AND** uma nova condição não é criada informalmente

### Requirement: Aflições separam exposição de processo persistente

Quando uma doença, veneno, corrupção ou maldição possuir efeitos posteriores à exposição inicial, a exposição e a Aflição SHALL ser resolvidas separadamente. Resistir à exposição MAY impedir a Aflição quando a fonte declarar; remover dano ou uma condição causada por ela não SHALL encerrar automaticamente seu processo persistente.

#### Scenario: Resistência impede Aflição

- **WHEN** uma fonte permite teste para resistir a uma doença e o alvo obtém sucesso
- **THEN** a Aflição não é criada
- **AND** outros efeitos imediatos da exposição ainda seguem a descrição da fonte

#### Scenario: Sintoma é removido temporariamente

- **WHEN** um tratamento remove uma condição causada por uma Aflição sem curar seu processo
- **THEN** a condição termina conforme o tratamento
- **AND** a Aflição permanece e pode voltar a gerar sintomas conforme sua regra

### Requirement: Consequências preservam autoridade e agência

O Narrador SHALL definir ou validar consequências coerentes com a origem e a ficção, mas MUST comunicar seus efeitos ativos, gatilhos e caminhos de mudança aos jogadores. Uma consequência não SHALL retirar permanentemente o controle de um personagem sem que a fonte, os riscos e a decisão narrativa que a permite estejam claros.

#### Scenario: Consequência é apresentada ao jogador

- **WHEN** uma consequência persistente é aplicada
- **THEN** o jogador consegue saber por que ela existe, o que faz atualmente e como pode ser tratada, mitigada ou enfrentada

#### Scenario: Consequência ameaça controle permanente

- **WHEN** uma consequência pode retirar de forma duradoura a agência do personagem
- **THEN** esse risco é explicitado antes da resolução sempre que a ficção permitir
- **AND** a aplicação depende de uma fonte que autorize expressamente esse resultado
