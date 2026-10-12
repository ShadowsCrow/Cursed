# Limites de Atributos e Perícias

## Purpose

Garantir que os valores base de Atributos e Perícias respeitem os limites das regras em qualquer gravação da ficha, com aviso na tela antes de salvar e sinalização das fichas antigas fora dos limites.

## Requirements

### Requirement: Limite do valor base de Atributos
O valor base de cada Atributo SHALL ser um inteiro de `1` a `5`, conforme `Criação de Personagem.md` e `Progressão e Proficiência.md`. O servidor SHALL recusar qualquer gravação que coloque um Atributo base fora desse intervalo: edição direta, pedido de alteração aprovado, importação ou migração.

#### Scenario: Força zero
- **WHEN** alguém tenta gravar Força base `0`
- **THEN** o sistema recusa a gravação e informa que o Atributo base vai de `1` a `5`

#### Scenario: Atributo acima do limite
- **WHEN** alguém tenta gravar Vigor base `6`
- **THEN** o sistema recusa a gravação e indica que valores acima de `5` exigem ajuste

#### Scenario: Pedido aprovado com valor inválido
- **WHEN** o Narrador aprova um pedido de alteração que colocaria Destreza base em `9`
- **THEN** a aprovação é recusada, o pedido continua pendente e a ficha não muda

### Requirement: Limites valem para personagens de jogador
Os limites de valor base de Atributos e Perícias e a exigência de classe, arquétipo, raça e listas do catálogo SHALL ser aplicados na gravação apenas a fichas do tipo personagem. Fichas de NPC e de monstro SHALL NOT ser recusadas por esses limites, porque as regras não os definem para criaturas; as irregularidades delas SHALL aparecer só como avisos informativos.

#### Scenario: Monstro acima do limite humano
- **WHEN** o Narrador cria o monstro "Lobo Sombrio" com Vigor base `6` e raça "Lobo"
- **THEN** o sistema aceita a ficha e mostra o Vigor `6` e a raça fora do catálogo apenas como avisos

#### Scenario: Personagem de jogador acima do limite
- **WHEN** alguém grava Vigor base `6` na ficha de um personagem de jogador
- **THEN** o sistema recusa a gravação

### Requirement: Limite do valor base de Perícias
O valor base de cada Perícia SHALL ser um inteiro de `0` a `5`. O limite de `10` da ficha original SHALL NOT valer, porque as regras atuais fixam o limite comum em `5`.

#### Scenario: Perícia no limite
- **WHEN** alguém grava Furtividade base `5`
- **THEN** o sistema aceita

#### Scenario: Perícia acima do limite
- **WHEN** alguém tenta gravar Furtividade base `7`
- **THEN** o sistema recusa a gravação e indica que valores acima de `5` exigem ajuste

### Requirement: Valores acima do limite só por ajuste
Um total acima do limite SHALL vir de ajuste ou de efeito, nunca do valor base. A ficha SHALL mostrar base, ajuste e efeitos separados no detalhe do total.

#### Scenario: Bônus de regra específica
- **WHEN** a ficha tem Força base `5` e ajuste `+1` registrado para uma regra de raça
- **THEN** o total de Força é `6` e o detalhe mostra base `5` e ajuste `+1`

### Requirement: Limites visíveis antes de salvar
A tela de edição de Atributos e Perícias SHALL indicar o mínimo e o máximo de cada valor base e SHALL mostrar a mensagem de erro junto ao campo inválido antes de enviar a gravação.

#### Scenario: Jogador digita valor inválido
- **WHEN** o jogador digita `8` no Vigor base
- **THEN** o campo indica o erro com a faixa permitida e o botão de salvar fica indisponível até a correção

### Requirement: Fichas existentes fora dos limites
Fichas existentes com valores base fora dos limites SHALL continuar legíveis e SHALL ser sinalizadas para o Narrador corrigir. O sistema SHALL NOT alterar esses valores automaticamente. Enquanto o valor não for corrigido, uma gravação que não altere esse campo SHALL ser aceita.

#### Scenario: Ficha migrada com Força 0
- **WHEN** o Narrador abre uma ficha migrada com Força base `0`
- **THEN** a ficha mostra o valor `0` com um aviso de fora do limite, e a Força não é alterada sem ação do Narrador

#### Scenario: Edição de outro campo em ficha irregular
- **WHEN** o jogador altera o lema numa ficha que tem Força base `0`
- **THEN** a gravação do lema é aceita e o aviso sobre a Força continua
