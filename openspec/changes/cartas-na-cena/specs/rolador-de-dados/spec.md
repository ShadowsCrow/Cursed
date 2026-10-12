# Spec Delta

## MODIFIED Requirements

### Requirement: Histórico das rolagens
A aba SHALL mostrar, abaixo do resultado, os **acontecimentos** anteriores da mesa, da mais recente para a mais antiga, até os 20 mais recentes: as rolagens, com a expressão, o total e os valores de cada dado, e os **usos de carta**, como "Lia usou Lança de Fogo (3 PP) em Goblin 2", com a arte da carta em miniatura. Cada rolagem SHALL ter **Rolar de novo**, que rola a mesma expressão como uma rolagem nova de quem escolheu; os usos não têm. Um uso desfeito pelo Narrador SHALL aparecer riscado. Um botão SHALL limpar o histórico. Os acontecimentos de outras pessoas SHALL mostrar o nome de quem rolou ou usou. Usos de personagens com token oculto SHALL aparecer só ao Narrador.

O histórico da aba mostra os acontecimentos desde que a Sala foi aberta neste navegador. Ele SHALL ter barra de rolagem própria (item 7): em telas com mais de 760 px de largura e 620 px de altura, o histórico ocupa o espaço que sobra no painel e só ele rola, enquanto o visor, os dados, o modificador e as opções ficam parados; em telas menores, ele tem altura máxima com rolagem própria, e o painel rola como antes. A lista do histórico SHALL poder receber o foco, para rolar pelo teclado. As opções da aba ficam num bloco **Opções** que abre e fecha, fechado por padrão, e SHALL incluir **Animação das cartas**, ligada por padrão. A rolagem montada, o último resultado e o histórico SHALL sobreviver à troca de aba do painel e ao recolher o painel.

#### Scenario: Histórico mantém as últimas 20
- **WHEN** o jogador faz 21 rolagens
- **THEN** o histórico mostra as 20 mais recentes, com a última no topo

#### Scenario: Rolar de novo pelo histórico
- **WHEN** o jogador monta `1d8 + 1`, rola, monta outra rolagem e escolhe "Rolar de novo" no item `1d8 + 1`
- **THEN** sai um novo resultado de `1d8 + 1`, que entra no topo do histórico

#### Scenario: Só o histórico rola
- **WHEN** o Narrador, numa tela de 1280 × 800, faz 12 rolagens
- **THEN** o painel não rola: o histórico mostra as rolagens com a própria barra de rolagem, e o visor e os dados continuam à vista

#### Scenario: Trocar de aba e voltar
- **WHEN** o jogador monta `2d6`, rola, abre a aba Fichas e volta para Dados
- **THEN** a montagem `2d6`, o último resultado e o histórico continuam lá

#### Scenario: Uso de carta no histórico
- **WHEN** Lia usa "Lança de Fogo" no Goblin 2 e depois rola `1d20 + Inteligência + Arcanismo`
- **THEN** o histórico de todos mostra a rolagem no topo e, abaixo, "Lia usou Lança de Fogo (3 PP) em Goblin 2" com a miniatura da carta e sem "Rolar de novo"

#### Scenario: Uso desfeito
- **WHEN** o Narrador desfaz o último uso de Lia
- **THEN** o item do uso fica riscado no histórico de todos
