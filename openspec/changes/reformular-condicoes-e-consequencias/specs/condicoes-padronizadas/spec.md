# Condições Padronizadas

## Purpose

Definir efeitos oficiais com nomes previsíveis para controle, sentidos, mobilidade e incapacidade, de modo que a mesa ative diretamente o efeito narrado e consulte a mesma regra em qualquer criação.

## ADDED Requirements

### Requirement: Condição é o próprio efeito oficial

Cada condição padronizada MUST possuir associação estável, nome e descrição no catálogo oficial. Quando o Narrador determinar que a condição começou, o jogador SHALL ativar o próprio efeito na ficha e SHALL desativá-lo quando a última causa terminar. Não SHALL haver um segundo registro obrigatório de aplicação da condição.

#### Scenario: Fumaça cega Lia

- **WHEN** a fumaça deixa Lia Cega
- **THEN** Lia ativa o efeito oficial Cego e consulta sua descrição
- **AND** não precisa ligar outro efeito derivado de Cego

#### Scenario: Duas causas sustentam Cego

- **WHEN** magia e fumaça deixam Lia Cega
- **THEN** Cego é mantido uma vez
- **AND** termina somente quando ambas as causas deixam de valer

### Requirement: A descrição é a regra completa

Uma condição MUST descrever suas restrições, resultados e modo comum de encerramento. Modificadores numéricos MAY ser adicionados como metadados opcionais para cálculo digital, mas o sistema não SHALL inferir números, testes ou proibições a partir da descrição.

#### Scenario: Efeito apenas descritivo

- **WHEN** um efeito não possui metadados de modificador
- **THEN** a mesa ainda aplica sua descrição
- **AND** a ficha não inventa um modificador numérico

### Requirement: Modificadores são contextuais e sobreposição é explícita

Um modificador MUST identificar alvo e valor numérico, e MUST identificar contexto quando não se aplicar a toda rolagem daquele alvo. Quando Cego e Ofuscado estiverem ativos, Cego SHALL substituir Ofuscado no mesmo aspecto visual; proibições iguais não SHALL ser aplicadas duas vezes.

#### Scenario: Cego e Ofuscado

- **WHEN** ambos estão ativos durante um ataque dependente da visão
- **THEN** a penalidade visual é `-4`, sem somar `-2`

#### Scenario: Ataque guiado pela audição

- **WHEN** Cego está ativo, mas o ataque não depende da visão
- **THEN** o modificador visual de Cego não é aplicado automaticamente

### Requirement: A lista oficial é fechada

O núcleo SHALL reconhecer os seguintes efeitos padronizados:

|Grupo|Efeitos|
|---|---|
|Abertura e mobilidade|Surpreso, Derrubado, Agarrado, Imobilizado, Contido|
|Sentidos e comunicação|Ofuscado, Cego, Silenciado, Invisível|
|Capacidade|Sem Reação, Atordoado, Paralisado, Incapacitado, Inconsciente|
|Exposição e dano|Exposto, Controlado, Sangrando|

Cada efeito MUST seguir a descrição completa de `rules/sistema/Condições e Tipos de Dano.md`. Uma criação MAY combinar efeitos oficiais com resultados próprios, mas não SHALL redefinir silenciosamente um nome padronizado.

#### Scenario: Criatura petrificada

- **WHEN** uma criação chama sua ficção de “Petrificação”
- **THEN** ela declara os efeitos oficiais e as regras adicionais que realmente produz
- **AND** não altera a definição de Paralisado ou Incapacitado

### Requirement: Controle mantém limites e escolhas

Atordoado SHALL permitir escolher entre Ações e Movimento no turno, sem Reações. Controlado SHALL exigir autorização expressa da fonte para ações diretamente autodestrutivas. Exposto SHALL ser desativado após o próximo ataque válido que o consome.

#### Scenario: Turno Atordoado

- **WHEN** um personagem Atordoado escolhe realizar Ações
- **THEN** não realiza Movimento voluntário naquele turno

#### Scenario: Ordem autodestrutiva

- **WHEN** uma fonte de Controlado tenta impor autodestruição sem autorização expressa
- **THEN** a ordem não pode ser executada

#### Scenario: Ataque consome Exposto

- **WHEN** o próximo ataque válido contra um alvo Exposto termina
- **THEN** a mesa desativa Exposto

### Requirement: Sangrando tem uma perda fixa

Sangrando SHALL causar perda de `1 PV` no fim de cada turno enquanto ativo. Duas causas de Sangrando não SHALL duplicar essa perda; efeitos mais graves precisam declarar o acréscimo separadamente. A mesa SHALL desativar Sangrando quando todas as causas relevantes forem tratadas.

#### Scenario: Dois ferimentos sangram

- **WHEN** duas causas sustentam Sangrando no fim do turno
- **THEN** o personagem perde `1 PV` por Sangrando

### Requirement: Estados e resultados próprios não são condições livres

Desarmar SHALL ser um resultado imediato, Morrendo SHALL ser derivado das regras de PV e Vulnerabilidade MUST declarar um tipo, fonte ou todos os danos. Tipos de dano não SHALL criar condições ou consequências automaticamente.

#### Scenario: Dano de Fogo isolado

- **WHEN** uma fonte causa Fogo sem efeito adicional declarado
- **THEN** causa apenas dano de Fogo

#### Scenario: Chegar a zero PV

- **WHEN** um personagem chega a `0 PV` sem morte imediata
- **THEN** as regras derivam Morrendo e o jogador ativa Inconsciente

#### Scenario: Desarmar

- **WHEN** uma fonte desarma um personagem
- **THEN** o objeto cai e nenhum efeito persistente Desarmado é criado

### Requirement: Compartilhamento preserva definições oficiais e itens privados

Uma criação MAY referenciar efeito oficial por associação estável ou transportar um efeito externo incorporado no item ou código recebido. E1 e EQ1 SHALL continuar legíveis com nome, descrição, imagem opcional e modificadores numéricos opcionais; o conteúdo privado não SHALL ser inserido no catálogo oficial ao importar.

#### Scenario: Recompensa singular

- **WHEN** o Narrador distribui um item EQ1 com efeito próprio para uma personagem
- **THEN** a personagem recebe o efeito e seus metadados sem torná-lo público

### Requirement: Compatibilidade terminológica

“Completamente Incapacitado” SHALL ser lido como Incapacitado e “Completamente Controlado” como Controlado durante migração. Conteúdo novo MUST usar os nomes atuais.

#### Scenario: Habilidade legada

- **WHEN** uma habilidade antiga menciona Completamente Incapacitado
- **THEN** a mesa aplica a descrição atual de Incapacitado
