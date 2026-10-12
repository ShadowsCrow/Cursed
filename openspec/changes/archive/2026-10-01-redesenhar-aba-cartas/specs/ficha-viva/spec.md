## MODIFIED Requirements

### Requirement: Seções modulares preservadas
A ficha SHALL oferecer resumo, retrato, informações básicas, personalidade, atributos, perícias, cartas, equipamentos, inventário, status e efeitos como seções organizáveis sem perder o conteúdo atualmente suportado. A seção de cartas SHALL se chamar "Cartas", porque habilidades, magias, itens e efeitos são todos cartas, e links antigos para a seção de habilidades SHALL abri-la. O resumo SHALL ser a primeira seção e a seção aberta quando nenhuma outra for indicada.

#### Scenario: Jogador navega entre seções
- **WHEN** o jogador seleciona uma seção da ficha
- **THEN** o sistema mantém o contexto do personagem e apresenta a seção sem exigir recarregamento manual dos dados

#### Scenario: Ficha aberta sem seção indicada
- **WHEN** o jogador abre a ficha sem indicar uma seção
- **THEN** o sistema apresenta a seção de resumo

#### Scenario: Link antigo para habilidades
- **WHEN** o jogador abre a ficha por um link com a seção "habilidades"
- **THEN** a ficha abre na aba "Cartas"
