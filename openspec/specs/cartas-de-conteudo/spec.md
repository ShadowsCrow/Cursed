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
Cartas de habilidade e magia SHALL preservar separadamente Custo de Aprendizado, Descansos Mínimos, Potência de Uso, Custo de Uso e custos adicionais quando definidos, e MUST NOT inferir automaticamente esses valores a partir do campo legado `custo`.

#### Scenario: Carta legada possui apenas custo textual
- **WHEN** a carta é migrada sem cálculo mecânico validado
- **THEN** o sistema mantém os campos especializados indefinidos e sinaliza revisão em vez de inventar valores

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
O Narrador SHALL poder apresentar uma carta a participantes sem transferir sua posse nem torná-la permanentemente disponível.

#### Scenario: Narrador revela um artefato durante a sessão
- **WHEN** apresenta temporariamente a carta
- **THEN** os destinatários autorizados visualizam seu conteúdo e nenhuma instância é adicionada aos personagens

### Requirement: Importação portátil com pré-visualização
O sistema SHALL continuar aceitando formatos portáteis compatíveis para importação, mas SHALL exibir conteúdo, versão, procedência e avisos de validação antes de criar uma carta ou instância.

#### Scenario: Código importado contém conteúdo inválido
- **WHEN** o usuário tenta confirmar a importação
- **THEN** o sistema rejeita o conteúdo sem alterar catálogo ou personagem e explica os problemas encontrados
