## MODIFIED Requirements

### Requirement: JSON prevalece sobre as cartas de catálogo
As cartas de habilidade de classe, arquétipo e raça SHALL ter o JSON do catálogo como única fonte, inclusive para Custo de Aprendizado, Descansos Mínimos, Potência de Uso e Custo de Uso. Esses quatro custos SHALL ser opcionais por habilidade no JSON; sem o campo, o custo SHALL ficar indefinido e SHALL NOT ser inferido do campo legado `custo`. O Narrador SHALL NOT poder editar essas cartas na mesa: a biblioteca SHALL NOT oferecer a edição, e o servidor SHALL recusar salvar rascunho ou publicar versão delas. Quando uma habilidade mudar no JSON, inclusive só num dos custos, a carta correspondente em cada mesa SHALL receber uma nova versão com o conteúdo do JSON. As cartas concedidas pelo catálogo SHALL passar para a nova versão. Uma habilidade nova no JSON SHALL ser concedida aos personagens daquela classe, arquétipo ou raça, e uma habilidade removida SHALL ter a carta arquivada e retirada deles. Cartas obtidas por outras vias SHALL NOT ser tocadas. Cada operação SHALL entrar no histórico.

#### Scenario: Texto de habilidade corrigido no JSON
- **WHEN** o usuário corrige no JSON o texto de uma habilidade do Druida
- **THEN** a carta dessa habilidade ganha uma nova versão em cada mesa, e os Druidas passam a ver o texto novo

#### Scenario: Edição do Narrador substituída
- **WHEN** a carta de uma habilidade do Druida tem uma versão editada pelo Narrador antes desta regra e depois o JSON dessa habilidade muda
- **THEN** a nova versão usa o conteúdo do JSON, e a versão do Narrador continua no histórico da carta

#### Scenario: Custo informado no JSON
- **WHEN** o usuário escreve no JSON o Custo de Aprendizado `3` de uma habilidade do Druida que não tinha custo
- **THEN** a carta dessa habilidade ganha uma nova versão com Custo de Aprendizado `3`, e os outros três custos continuam indefinidos

#### Scenario: Custo ausente não é inferido
- **WHEN** uma habilidade do JSON tem só o campo legado `custo`
- **THEN** a carta mostra os quatro custos como indefinidos

#### Scenario: Narrador não edita carta do catálogo
- **WHEN** o Narrador abre a biblioteca da mesa
- **THEN** as cartas de classe, arquétipo e raça não têm a opção de editar, e as cartas criadas por ele continuam editáveis

#### Scenario: Edição recusada pela API
- **WHEN** uma chamada tenta salvar o rascunho ou publicar uma versão de uma carta de habilidade do catálogo do sistema
- **THEN** o servidor recusa com conflito, informa que a carta vem do catálogo do sistema e não cria versão

#### Scenario: Conferência repetida
- **WHEN** a conferência roda de novo sem mudança no JSON
- **THEN** nenhuma versão nova é criada
