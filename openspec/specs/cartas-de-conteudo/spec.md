# Cartas de Conteúdo Specification

## Purpose

Define cartas versionadas como linguagem visual para habilidades, magias e itens, incluindo oferta, escolha, aprendizado, concessão, posse e compartilhamento portátil.

## Requirements

### Requirement: Conteúdo publicado possui versão imutável
Cada carta publicada SHALL possuir tipo, versão, texto, requisitos, campos mecânicos aplicáveis, procedência e ativos referenciados; alterações posteriores SHALL criar uma nova versão sem modificar silenciosamente instâncias existentes.

#### Scenario: Narrador corrige uma magia publicada
- **WHEN** publica a correção
- **THEN** o sistema cria uma nova versão e mantém personagens existentes vinculados à versão anterior até uma migração explícita

### Requirement: Campos mecânicos permanecem distintos
Cartas de habilidade e magia SHALL preservar separadamente Custo de Aprendizado, Descansos Mínimos, Potência de Uso, Custo de Uso e custos adicionais quando definidos, e MUST NOT inferir automaticamente esses valores a partir do campo legado `custo`. Grau, Descansos Mínimos e Custo de Uso SHALL ser calculados a partir do Custo de Aprendizado e da Potência de Uso pelas tabelas do Framework, conforme a capacidade `criacoes-do-framework`; o campo legado `custo` SHALL continuar fora desse cálculo.

#### Scenario: Carta legada possui apenas custo textual
- **WHEN** a carta é migrada sem cálculo mecânico validado
- **THEN** o sistema mantém os campos especializados indefinidos e sinaliza revisão em vez de inventar valores

#### Scenario: Carta com custos calculados
- **WHEN** uma magia tem Custo de Aprendizado `22` e Potência de Uso `11`
- **THEN** o sistema mostra Grau "Simples", Descansos Mínimos `4` e Custo de Uso `2 PP`, sem consultar o custo legado

### Requirement: Concessão direta pelo Narrador
O Narrador SHALL poder conceder uma carta diretamente a um personagem, escolhendo o destino correspondente ao tipo e declarando quando a concessão ignora o fluxo normal de aprendizado.

#### Scenario: Narrador concede habilidade como recompensa excepcional
- **WHEN** confirma a concessão imediata
- **THEN** a habilidade entra no estado aprendido e a exceção fica registrada na auditoria

### Requirement: Oferta com quantidade de escolhas
O Narrador SHALL poder criar uma oferta para um ou mais personagens, selecionar as cartas candidatas e definir quantas opções cada destinatário pode escolher.

#### Scenario: Jogador deve escolher duas entre cinco cartas
- **WHEN** o jogador tenta confirmar três escolhas
- **THEN** o sistema rejeita a confirmação, preserva a oferta e informa o limite de duas escolhas

### Requirement: Seleção não equivale a aprendizado
Por padrão, selecionar uma habilidade ou magia SHALL torná-la disponível para aprendizado, mantendo requisitos, PP e Descansos Mínimos; somente regra ou concessão explícita SHALL permitir aprendizado imediato.

#### Scenario: Jogador seleciona uma magia oferecida
- **WHEN** a escolha é confirmada sem exceção do Narrador
- **THEN** a magia aparece entre as opções disponíveis para aprender e não entre as magias aprendidas

### Requirement: Ciclos específicos por tipo
O sistema SHALL manter ciclos distintos para habilidades e magias, itens e efeitos, mesmo quando todos usam apresentação visual em forma de carta.

#### Scenario: Jogador aceita uma carta de item
- **WHEN** a oferta é confirmada
- **THEN** o item entra no inventário e não no fluxo de aprendizado

### Requirement: Apresentação temporária
O Narrador SHALL poder apresentar uma carta a participantes sem transferir sua posse nem torná-la permanentemente disponível. Cada participante SHALL ver a carta apresentada **uma vez**: depois que ele a fecha, ela SHALL NOT voltar a aparecer para ele, nem ao recarregar a página ou abrir em outro aparelho. O Narrador SHALL continuar vendo a apresentação até recolhê-la, com a lista de quem já a viu.

#### Scenario: Narrador revela um artefato durante a sessão
- **WHEN** apresenta temporariamente a carta
- **THEN** os destinatários autorizados visualizam seu conteúdo e nenhuma instância é adicionada aos personagens

#### Scenario: Jogador fecha a carta e recarrega a página
- **WHEN** o jogador fecha a carta apresentada e depois recarrega a página
- **THEN** a carta não é apresentada de novo a ele, e os demais destinatários que ainda não a viram continuam a recebê-la

### Requirement: Importação portátil com pré-visualização
O sistema SHALL continuar aceitando formatos portáteis compatíveis para importação, incluindo o código de criação `CR1` para habilidades e magias, mas SHALL exibir conteúdo, versão, procedência e avisos de validação antes de criar uma carta ou instância.

#### Scenario: Código importado contém conteúdo inválido
- **WHEN** o usuário tenta confirmar a importação
- **THEN** o sistema rejeita o conteúdo sem alterar catálogo ou personagem e explica os problemas encontrados

#### Scenario: Código de criação de uma habilidade
- **WHEN** o Narrador pré-visualiza um código `CR1` de uma habilidade de combo
- **THEN** a pré-visualização mostra o tipo Habilidade, o título, o Combo, os custos calculados e a procedência "importação CR1", e confirmar cria um rascunho no catálogo da mesa

### Requirement: Custos de aprendizado reservados ao Narrador
O Custo de Aprendizado e os Descansos Mínimos de habilidades e magias SHALL ser visíveis só para o Narrador da mesa. Toda carta que o sistema entrega a outro participante MUST NOT conter esses dois valores. Isso vale para as cartas da ficha, as candidatas de uma oferta, a resposta a uma oferta, a resposta a uma mudança de estado da carta e as cartas apresentadas. A Potência de Uso, o Custo de Uso e os custos adicionais SHALL continuar visíveis a quem vê a carta. Os valores guardados, o catálogo do Narrador e o ciclo de aprendizado SHALL continuar como antes.

#### Scenario: Jogador consulta as cartas do personagem
- **WHEN** o jogador pede as cartas do próprio personagem, e uma magia tem Custo de Aprendizado 22 e Descansos Mínimos 4
- **THEN** a resposta traz a magia com a Potência de Uso e o Custo de Uso, sem o Custo de Aprendizado e sem os Descansos Mínimos

#### Scenario: Narrador consulta as mesmas cartas
- **WHEN** o Narrador pede as cartas do mesmo personagem
- **THEN** a resposta traz a magia com Custo de Aprendizado 22 e Descansos Mínimos 4

#### Scenario: Jogador escolhe numa oferta
- **WHEN** o jogador abre uma oferta com duas habilidades
- **THEN** as candidatas chegam sem o Custo de Aprendizado e sem os Descansos Mínimos, e a escolha funciona como antes

#### Scenario: Carta apresentada à mesa
- **WHEN** o Narrador apresenta uma magia aos jogadores
- **THEN** os jogadores veem a magia sem o Custo de Aprendizado e sem os Descansos Mínimos

#### Scenario: Aprendizado continua pelo Narrador
- **WHEN** uma habilidade está em aprendizado e o Narrador a conclui
- **THEN** ela passa a aprendida como antes, e os valores guardados na carta não mudam
