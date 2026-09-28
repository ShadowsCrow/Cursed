# Cálculo de valores da ficha

## Purpose

Calcular automaticamente os valores da ficha que as regras definem por fórmula, começando por PV, PP e suas Escalas, e mostrar de onde vem cada valor, para que a mesa confie no número sem conferi-lo à mão.

## Requirements

### Requirement: Nível do personagem
A ficha SHALL registrar o nível do personagem como um inteiro de `1` a `20`. Somente o Narrador SHALL definir ou alterar o nível. Um personagem novo SHALL começar no nível `1`, salvo quando o Narrador informar outro nível na criação. Fichas existentes sem nível SHALL receber o nível `1` na migração, e o Narrador corrige depois quando o personagem estiver mais avançado.

#### Scenario: Narrador sobe o personagem de nível
- **WHEN** o Narrador altera o nível de um personagem de `4` para `5`
- **THEN** o sistema grava o novo nível, registra a alteração no histórico e recalcula os valores que dependem do nível

#### Scenario: Jogador tenta alterar o nível
- **WHEN** um jogador tenta gravar outro nível na ficha do próprio personagem
- **THEN** o sistema recusa a alteração e mantém o nível anterior

#### Scenario: Ficha migrada sem nível
- **WHEN** uma ficha antiga, que não tinha nível, é migrada
- **THEN** ela passa a ter nível `1`, PV e PP atuais iguais aos máximos calculados, e o histórico registra que o nível veio da migração

#### Scenario: Nível fora do intervalo
- **WHEN** alguém tenta gravar o nível `0` ou `21`
- **THEN** o sistema recusa a gravação e informa que o nível vai de `1` a `20`

### Requirement: Cálculo de PV, PP e Escalas
O sistema SHALL calcular, a partir das bases da classe do personagem e dos valores permanentes de Vigor e Propósito:
- PV inicial = base de PV da classe + Vigor
- Escala de PV = base de Escala de PV da classe + Vigor
- PP inicial = base de PP da classe + Propósito
- Escala de PP = base de Escala de PP da classe + Propósito
- PV máximo = PV inicial + (nível - 1) x Escala de PV
- PP máximo = PP inicial + piso(nível / 2) x Escala de PP

O valor permanente de um Atributo SHALL ser o valor base somado ao ajuste registrado na ficha. Modificadores de efeitos temporários SHALL NOT alterar esses valores.

#### Scenario: Mago no nível 1
- **WHEN** a ficha de um Mago tem Vigor `3`, Propósito `2` e nível `1`
- **THEN** o sistema mostra PV máximo `15`, PP máximo `10`, Escala de PV `5` e Escala de PP `7`

#### Scenario: Mago no nível 5
- **WHEN** o mesmo Mago chega ao nível `5` sem mudar Vigor nem Propósito
- **THEN** o sistema mostra PV máximo `35` e PP máximo `24`

#### Scenario: Efeito temporário não altera o máximo
- **WHEN** um efeito ativo concede `+2` de Vigor ao personagem
- **THEN** o PV máximo e a Escala de PV continuam calculados com o Vigor permanente

### Requirement: Recálculo automático
O sistema SHALL recalcular PV, PP e Escalas sempre que mudarem a classe, o nível, o Vigor permanente ou o Propósito permanente. Nenhum jogador ou Narrador SHALL precisar refazer a conta.

#### Scenario: Aumento permanente de Vigor
- **WHEN** o Vigor base do personagem passa de `3` para `4`
- **THEN** o PV inicial, a Escala de PV e o PV máximo são recalculados com Vigor `4`

#### Scenario: Troca de classe
- **WHEN** o Narrador troca a classe do personagem
- **THEN** PV, PP e Escalas passam a usar as bases da nova classe

### Requirement: Valores atuais preservados
Aumentar o máximo SHALL NOT recuperar PV ou PP gastos. Quando o máximo diminuir, o valor atual SHALL ser limitado ao novo máximo. Um personagem novo SHALL começar com PV e PP atuais iguais aos máximos.

#### Scenario: Subida de nível com PV gasto
- **WHEN** um personagem com PV `20` de `30` sobe de nível e o PV máximo passa a `35`
- **THEN** o PV atual continua `20` e o máximo passa a `35`

#### Scenario: Máximo diminui abaixo do atual
- **WHEN** o PV máximo cai de `35` para `30` e o PV atual era `33`
- **THEN** o PV atual passa a `30`

#### Scenario: Personagem recém-criado
- **WHEN** um personagem é criado com classe, nível e atributos definidos
- **THEN** o PV atual e o PP atual começam iguais aos respectivos máximos

### Requirement: Valor não calculável
Quando faltar uma entrada (classe sem correspondência no catálogo ou classe sem base registrada), o sistema SHALL mostrar o valor como não calculável e informar qual entrada falta. O sistema SHALL NOT estimar nem inferir o valor.

#### Scenario: Classe fora do catálogo
- **WHEN** a ficha tem uma classe escrita à mão que não existe no catálogo
- **THEN** PV, PP e Escalas aparecem como não calculáveis com a indicação de vincular a classe

### Requirement: Fontes visíveis
Cada valor calculado SHALL mostrar o total e a contribuição de cada fonte: base da classe, atributo, nível e ajustes do Narrador.

#### Scenario: Jogador consulta o PV máximo
- **WHEN** o jogador abre o detalhe do PV máximo do Mago nível 5
- **THEN** o sistema mostra PV inicial `15` (base da classe `12` e Vigor `3`) e `4` aumentos de Escala de PV `5`, totalizando `35`

### Requirement: Ajuste do Narrador
O Narrador SHALL poder registrar um ajuste em PV máximo, PP máximo ou nas Escalas, com valor, origem e justificativa, quando uma regra específica de raça, classe ou campanha prevalecer. O ajuste SHALL aparecer como fonte do valor e SHALL ser registrado no histórico. Jogadores SHALL NOT registrar esses ajustes.

#### Scenario: Regra de campanha concede PV extra
- **WHEN** o Narrador registra `+3` no PV máximo com origem "Bênção do Templo" e uma justificativa
- **THEN** o PV máximo aumenta `3`, o detalhe mostra a fonte "Bênção do Templo" e o histórico registra o ajuste

#### Scenario: Ajuste sem origem
- **WHEN** o Narrador tenta registrar um ajuste sem informar a origem
- **THEN** o sistema recusa o ajuste e pede a origem

### Requirement: Nome correto dos recursos
A interface SHALL chamar PP de "Pontos de Propósito" em todos os lugares onde o nome do recurso aparece.

#### Scenario: Cabeçalho da ficha
- **WHEN** o jogador abre a ficha
- **THEN** a barra de PP se chama "Pontos de Propósito", e o nome "Pontos de Poder" não aparece em nenhuma tela

### Requirement: Descanso usa Escalas calculadas
A recuperação por descanso SHALL usar as Escalas de PV e de PP calculadas por esta capacidade. Quando uma Escala for não calculável, o descanso SHALL informar que aquele recurso não é recuperado automaticamente.

#### Scenario: Descanso Curto após subida de Vigor
- **WHEN** o Narrador faz um Descanso Curto depois que o Vigor do personagem aumentou
- **THEN** a recuperação de PV usa a Escala de PV recalculada
