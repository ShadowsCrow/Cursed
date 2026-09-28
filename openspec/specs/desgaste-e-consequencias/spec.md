# desgaste-e-consequencias Specification

## Purpose
Definir Exaustão e Estresse como recursos temporários de desgaste, separados de Traumas, Ferimentos Graves e Sequelas, preservando escassez, risco e consequências narrativas sem exigir contabilidade oculta ou punições permanentes anônimas.

## Requirements

### Requirement: Trilhas independentes de desgaste

O sistema SHALL representar Exaustão e Estresse como trilhas independentes, com Exaustão limitada ao intervalo de 0 a 15 e Estresse limitado ao intervalo de 0 a 10. Uma origem somente SHALL alterar as duas trilhas quando declarar expressamente os dois efeitos.

#### Scenario: Ganho de Exaustão não altera Estresse

- **WHEN** um personagem recebe 2 pontos de Exaustão de uma marcha forçada
- **THEN** sua Exaustão aumenta em 2, até o limite de 15
- **AND** seu Estresse permanece inalterado

#### Scenario: Ganho acima do limite numérico

- **WHEN** um ganho elevaria Exaustão acima de 15 ou Estresse acima de 10
- **THEN** a trilha correspondente permanece em seu valor máximo
- **AND** o excedente não é armazenado como pontos ocultos ou permanentes

#### Scenario: Origem afeta as duas trilhas expressamente

- **WHEN** um efeito declarar que causa Exaustão e Estresse
- **THEN** cada alteração é aplicada e registrada separadamente

### Requirement: Faixas de Exaustão

O sistema SHALL derivar os efeitos temporários de Exaustão exclusivamente do valor atual da trilha, usando as faixas abaixo:

| Exaustão | Estado | Efeito derivado |
|---:|---|---|
| 0–5 | Estável | Sem penalidade |
| 6–8 | Cansado | −1 em testes físicos |
| 9–11 | Exausto | −2 em testes físicos e −1 em Defesas |
| 12–14 | No Limite | −3 em testes físicos, −1 em testes mentais e sociais e −3 m de Movimento |
| 15 | Colapso Físico | Fica Inconsciente e incapaz de realizar ações até receber auxílio ou recuperação aplicável |

#### Scenario: Mudança automática de faixa

- **WHEN** a Exaustão de um personagem passa de 8 para 9
- **THEN** o estado derivado muda de Cansado para Exausto
- **AND** as penalidades passam a ser −2 em testes físicos e −1 em Defesas

#### Scenario: Recuperação remove penalidade derivada

- **WHEN** a Exaustão de um personagem passa de 6 para 5
- **THEN** o estado derivado passa a Estável
- **AND** a penalidade de Exaustão deixa de ser aplicada sem exigir a remoção manual de um efeito

### Requirement: Esforço físico voluntário

Antes de resolver uma ação física elegível, um personagem que não esteja em Colapso Físico MAY assumir de 1 a 3 pontos de Exaustão. Para cada ponto assumido, ele MUST escolher +1 no teste físico daquela ação ou +1 m de Movimento nela. O bônus e a ação SHALL ser resolvidos antes da aplicação de um eventual Colapso Físico causado por esse esforço.

#### Scenario: Converter esforço em bônus e movimento

- **WHEN** um personagem assume 3 de Exaustão antes de uma ação física e escolhe +2 no teste e +1 m de Movimento
- **THEN** esses benefícios são aplicados somente à ação declarada
- **AND** a Exaustão aumenta em 3 após a resolução da ação

#### Scenario: Último esforço antes do colapso

- **WHEN** um personagem com 14 de Exaustão assume 1 ponto para obter +1 em um teste físico
- **THEN** o teste é resolvido com o bônus escolhido
- **AND** em seguida a Exaustão chega a 15 e o personagem entra em Colapso Físico

#### Scenario: Personagem em colapso não força outra ação

- **WHEN** um personagem está com 15 de Exaustão
- **THEN** ele não pode obter bônus por esforço físico voluntário

### Requirement: Faixas de Estresse

O sistema SHALL derivar os efeitos temporários de Estresse exclusivamente do valor atual da trilha e não SHALL usar matrizes diferentes por nível de personagem. As faixas são:

| Estresse | Estado | Efeito derivado |
|---:|---|---|
| 0–4 | Controlado | Sem penalidade |
| 5–6 | Pressionado | −1 em testes mentais e sociais |
| 7–8 | Abalado | −2 em testes mentais e sociais e −1 em testes físicos |
| 9 | À Beira | −3 em testes mentais e sociais, −1 em testes físicos e não pode assumir Estresse voluntariamente |
| 10 | Colapso Mental | Sofre uma manifestação de colapso coerente com a cena e fica fora de participação efetiva até receber auxílio pertinente ou o conflito imediato terminar |

Classes, habilidades e outros efeitos MAY modificar aquisição, capacidade ou penalidades de Estresse quando declararem isso expressamente, sem recriar uma tabela universal por patamar.

#### Scenario: Mesma faixa para personagens de patamares diferentes

- **WHEN** dois personagens sem modificadores específicos chegam a 7 de Estresse
- **THEN** ambos ficam Abalados e recebem as mesmas penalidades derivadas

#### Scenario: Modificador específico de classe

- **WHEN** uma habilidade de classe declara reduzir em 1 o Estresse recebido de intimidação
- **THEN** essa redução é aplicada à origem indicada
- **AND** as faixas universais permanecem inalteradas

### Requirement: Esforço mental voluntário

Antes de resolver uma ação mental ou social elegível, um personagem abaixo de 9 de Estresse MAY assumir de 1 a 3 pontos de Estresse. Cada ponto assumido concede +1 somente ao teste declarado. O bônus e o teste SHALL ser resolvidos antes da aplicação de um eventual Colapso Mental causado por esse esforço.

#### Scenario: Forçar uma ação mental

- **WHEN** um personagem com 6 de Estresse assume 2 pontos antes de um teste mental
- **THEN** ele recebe +2 nesse teste
- **AND** seu Estresse passa a 8 após a resolução

#### Scenario: Arriscar colapso por uma ação decisiva

- **WHEN** um personagem com 8 de Estresse assume 2 pontos antes de um teste social
- **THEN** o teste é resolvido com +2
- **AND** em seguida o personagem chega a 10 e sofre Colapso Mental

#### Scenario: Estado À Beira impede novo esforço voluntário

- **WHEN** um personagem está com 9 de Estresse
- **THEN** ele não pode assumir Estresse voluntariamente para receber bônus

### Requirement: Colapso Físico e excedente contextual

Chegar a 15 de Exaustão SHALL causar Colapso Físico, mas não SHALL criar por si só Exaustão Permanente, Ferimento Grave, Sequela ou morte. Cada evento que tentaria adicionar Exaustão a um personagem já no limite SHALL produzir no máximo uma consequência física contextual, salvo se a própria origem declarar consequências adicionais. A morte somente SHALL ocorrer quando a origem ou a situação ficcional for explicitamente letal.

#### Scenario: Excedente por esforço continuado

- **WHEN** uma marcha forçada tenta causar Exaustão a um personagem que já está em 15
- **THEN** a Exaustão permanece em 15
- **AND** o mestre aplica uma única consequência física coerente com a marcha, como Debilidade Extrema
- **AND** nenhum ponto de Exaustão Permanente é criado

#### Scenario: Origem já declara Ferimento Grave

- **WHEN** uma origem tenta causar Exaustão acima do limite e já declara que também causa um Ferimento Grave específico
- **THEN** o Ferimento Grave declarado é aplicado
- **AND** o sistema não cria automaticamente uma segunda consequência genérica pelo mesmo evento

#### Scenario: Excedente não causa morte automática

- **WHEN** um personagem inconsciente recebe Exaustão adicional de uma origem não letal
- **THEN** ele não morre apenas por ultrapassar numericamente 15

### Requirement: Colapso Mental gera Trauma ficcional

Ao chegar a 10 de Estresse, o personagem SHALL sofrer uma manifestação imediata de Colapso Mental coerente com a fonte e a cena, e SHALL receber um Trauma relacionado. O jogador MAY escolher a manifestação entre opções ficcionalmente válidas, como paralisar, fugir, render-se ou dissociar, sujeito à validação do mestre. Após receber auxílio pertinente ou quando o conflito imediato terminar, o Estresse SHALL retornar a 8. Se já existir um Trauma equivalente, o sistema SHALL intensificá-lo em vez de criar uma duplicata idêntica.

#### Scenario: Primeiro Colapso Mental

- **WHEN** um personagem chega a 10 de Estresse durante um confronto com uma criatura aterradora
- **THEN** ele manifesta um colapso coerente com o confronto
- **AND** recebe um Trauma relacionado à criatura ou à experiência vivida
- **AND** após o fim do conflito imediato ou auxílio pertinente seu Estresse retorna a 8

#### Scenario: Colapso relacionado a Trauma existente

- **WHEN** um personagem sofre novo Colapso Mental por uma origem equivalente a um Trauma que já possui
- **THEN** o Trauma existente é intensificado conforme sua progressão
- **AND** uma cópia de mesmo nome e origem não é adicionada

### Requirement: Trauma somente por colapso ou origem explícita

O sistema SHALL criar Trauma apenas por Colapso Mental ou por uma origem que declare expressamente causar Trauma. O sistema não SHALL exigir a contagem de três pontos de Estresse provenientes do mesmo contexto.

#### Scenario: Estresse repetido sem colapso

- **WHEN** um personagem recebe Estresse da mesma situação em três ocasiões, mas não chega a 10 e nenhuma origem declara Trauma
- **THEN** nenhum Trauma é criado automaticamente

#### Scenario: Efeito traumático explícito

- **WHEN** uma magia, habilidade, criatura ou decisão do mestre declara causar um Trauma específico
- **THEN** o Trauma é aplicado mesmo que o personagem não esteja em Colapso Mental

### Requirement: Comportamento padrão de Trauma

Todo Trauma SHALL registrar ao menos nome, origem ficcional, gatilho, manifestação ou consequência e condição de tratamento. Na primeira vez em cada cena que o personagem enfrentar diretamente seu gatilho, ele MUST escolher entre receber 1 de Estresse para agir normalmente ou aceitar uma complicação coerente com o Trauma. Apoio relevante, preparação específica ou um efeito que neutralize o gatilho MAY evitar esse custo quando a ficção justificar.

#### Scenario: Personagem enfrenta gatilho e resiste

- **WHEN** o personagem enfrenta pela primeira vez na cena o gatilho de seu Trauma e escolhe agir normalmente
- **THEN** ele recebe 1 de Estresse
- **AND** não sofre novamente o custo do mesmo Trauma naquela cena

#### Scenario: Personagem aceita complicação

- **WHEN** o personagem enfrenta o gatilho e escolhe não receber Estresse
- **THEN** o mestre introduz ou valida uma complicação coerente com a manifestação registrada

#### Scenario: Apoio neutraliza o gatilho

- **WHEN** um aliado oferece apoio relevante antes da reação e a ficção justifica sua eficácia
- **THEN** o personagem pode enfrentar o gatilho sem receber Estresse nem aceitar a complicação padrão

### Requirement: Ferimentos Graves e Sequelas explícitos

Ferimento Grave e Sequela SHALL ser efeitos persistentes nomeados, separados das trilhas de desgaste. Todo Ferimento Grave SHALL definir sua limitação específica e como pode ser estabilizado ou tratado. Toda Sequela SHALL definir sua manifestação duradoura e, quando aplicável, formas de adaptação, mitigação ou remoção excepcional. O sistema não SHALL manter um campo de Exaustão Permanente.

#### Scenario: Ferimento Grave permanece após reduzir Exaustão

- **WHEN** um personagem com Costelas Fraturadas reduz sua Exaustão a 0
- **THEN** o Ferimento Grave permanece ativo até cumprir sua própria condição de tratamento

#### Scenario: Sequela não é penalidade anônima

- **WHEN** uma consequência permanente é aplicada
- **THEN** ela é registrada como uma Sequela nomeada, com origem e manifestação próprias
- **AND** nenhum ponto oculto é somado à Exaustão

### Requirement: Recuperação separa trilhas e consequências persistentes

Descansos e outros meios de recuperação SHALL reduzir Exaustão e Estresse de acordo com suas regras próprias, mas não SHALL remover automaticamente Trauma, Ferimento Grave ou Sequela. Um efeito persistente somente SHALL avançar tratamento, ser mitigado ou ser removido quando sua própria regra ou uma origem aplicável declarar isso.

#### Scenario: Descanso reduz Estresse sem apagar Trauma

- **WHEN** um descanso reduz o Estresse de um personagem que possui Trauma
- **THEN** o valor de Estresse é atualizado
- **AND** o Trauma permanece ativo

#### Scenario: Descanso comum não cura Ferimento Grave

- **WHEN** um personagem com Ferimento Grave completa um descanso que apenas recupera Exaustão
- **THEN** sua Exaustão é reduzida conforme a regra do descanso
- **AND** o Ferimento Grave não é removido

#### Scenario: Tratamento declarado avança recuperação

- **WHEN** um efeito de tratamento satisfaz os requisitos registrados de um Ferimento Grave ou Trauma
- **THEN** o progresso ou estado desse efeito persistente é atualizado conforme sua própria regra

### Requirement: Regras utilizáveis sem a aplicação

As faixas, escolhas e consequências deste sistema SHALL permanecer aplicáveis em uma ficha física ou registro manual. A aplicação SHALL automatizar cálculo e registro, mas não SHALL introduzir regras indispensáveis que estejam ausentes da documentação do sistema.

#### Scenario: Mesa usa registro manual

- **WHEN** uma mesa joga sem acesso à aplicação
- **THEN** consegue determinar a faixa, a penalidade e o resultado de um colapso consultando apenas a documentação
