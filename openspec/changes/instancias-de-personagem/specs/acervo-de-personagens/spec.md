# Spec Delta

## MODIFIED Requirements

### Requirement: Três coleções
A seção Personagens SHALL oferecer, antes da lista, a escolha entre **Meus personagens**, **NPCs** e **Monstros**:
- Meus personagens: personagens de jogador de que a pessoa é proprietária, em mesas ativas;
- NPCs: NPCs de mesas ativas em que a pessoa é Narradora;
- Monstros: monstros de mesas ativas em que a pessoa é Narradora.

Personagens excluídos (na lixeira recuperável) e de mesas das quais a pessoa foi removida SHALL NOT aparecer. Instâncias de um modelo (capacidade `instancias-de-personagem`) SHALL NOT aparecer: as coleções listam só os modelos e as fichas promovidas.

#### Scenario: Jogador sem mesa narrada
- **WHEN** alguém que nunca narrou escolhe "NPCs"
- **THEN** a lista vazia explica que NPCs aparecem aqui quando a pessoa narra uma campanha

#### Scenario: Personagem de mesa da qual saiu
- **WHEN** o jogador foi removido de uma mesa
- **THEN** o personagem dele daquela mesa deixa de aparecer em Meus personagens

#### Scenario: Instâncias fora do acervo
- **WHEN** a campanha tem o modelo "Lagarto-macaco" e três instâncias dele em cena
- **THEN** Monstros lista só "Lagarto-macaco"; ao promover "Lagarto-macaco 2", ele passa a aparecer também
