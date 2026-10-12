# Spec Delta

## MODIFIED Requirements

### Requirement: Habilidades de classe, arquétipo e raça como cartas
Cada habilidade de classe, arquétipo e raça do catálogo SHALL existir como carta de habilidade publicada na mesa, com título, texto, ativação (passiva ou ativa) e Lançamento do catálogo e procedência que identifique a classe, o arquétipo ou a raça de origem. Habilidades placeholder, como uma habilidade chamada "nome" com descrição "descricao", SHALL NOT virar carta.

O custo das habilidades de classe e arquétipo é especial e vem do campo de custo escrito no catálogo; ele SHALL NOT ser calculado pela Potência de Uso do Framework. A carta SHALL receber como Custo de Uso a parte em PP desse texto quando ela é um número fixo no começo ("2 PP + 1 de Exaustão" dá 2 PP), e SHALL ficar sem Custo de Uso quando o texto não começa com um número de PP ("Variável", "+1 PP sobre o custo do feitiço", "10 componentes"). O texto inteiro SHALL continuar na carta. Custos que o catálogo não declara SHALL ficar vazios, sem inferência. Mudar o custo ou o Lançamento no catálogo SHALL gerar nova versão da carta, como texto e ativação já fazem.

#### Scenario: Cartas da classe na biblioteca da mesa
- **WHEN** um personagem da mesa escolhe a classe Druida pela primeira vez
- **THEN** as habilidades do Druida aparecem na biblioteca do Narrador como cartas publicadas, marcadas com a origem "Classe: Druida"

#### Scenario: Raça sem habilidade real
- **WHEN** o personagem é Humano, cuja única habilidade no catálogo é um placeholder
- **THEN** nenhuma carta de raça é criada e a ficha informa que não há habilidades registradas para a raça

#### Scenario: Custo em PP lido do texto
- **WHEN** o catálogo diz custo "2 PP + 1 (ou 2) de Exaustão" e Lançamento "Bônus" para "Palavra da Cura"
- **THEN** a carta mostra Custo de Uso 2 PP, o texto completo do custo e o Lançamento "Bônus"

#### Scenario: Custo sem PP fixo
- **WHEN** o catálogo diz custo "Variável (ver lista de totens)" para "Entalhe Místico"
- **THEN** a carta mostra o texto e fica sem Custo de Uso

#### Scenario: Custo alterado no JSON
- **WHEN** o usuário muda o custo de "Rajada de Energia" de "1 PP" para "2 PP" no catálogo
- **THEN** a carta ganha uma versão nova com Custo de Uso 2 PP, e as posses concedidas passam para ela
