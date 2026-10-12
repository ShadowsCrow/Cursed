# acervo-de-personagens Specification

## Purpose
Mostrar, fora das mesas, os personagens que a pessoa joga e os NPCs e monstros que criou como Narradora, e permitir reaproveitá-los em outra campanha como cópias independentes.

## Requirements

### Requirement: Três coleções
A seção Personagens SHALL oferecer, antes da lista, a escolha entre **Meus personagens**, **NPCs** e **Monstros**:
- Meus personagens: personagens de jogador de que a pessoa é proprietária, em mesas ativas;
- NPCs: NPCs de mesas ativas em que a pessoa é Narradora;
- Monstros: monstros de mesas ativas em que a pessoa é Narradora.

Personagens excluídos (na lixeira recuperável) e de mesas das quais a pessoa foi removida SHALL NOT aparecer.

#### Scenario: Jogador sem mesa narrada
- **WHEN** alguém que nunca narrou escolhe "NPCs"
- **THEN** a lista vazia explica que NPCs aparecem aqui quando a pessoa narra uma campanha

#### Scenario: Personagem de mesa da qual saiu
- **WHEN** o jogador foi removido de uma mesa
- **THEN** o personagem dele daquela mesa deixa de aparecer em Meus personagens

### Requirement: Lista e vitrine
A lista lateral SHALL mostrar retrato, nome e uma linha com a classe (ou tipo) e a campanha de cada personagem; sem retrato, a miniatura SHALL usar o retrato padrão do tema correspondente ao tipo (personagem, NPC ou monstro). O personagem selecionado SHALL aparecer no **mesmo formato do Resumo da ficha** (a aba que abre primeiro na ficha): mesma composição, mesmos quadros e os mesmos valores, calculados pelo servidor. No acervo o Resumo SHALL ser só de leitura (sem trocar a ilustração nem convite para escrever a História), e os atalhos de cada quadro SHALL abrir a ficha completa na seção correspondente. Acima do Resumo SHALL haver **Abrir ficha** e **Copiar para campanha**. A vitrine SHALL NOT calcular valores próprios.

#### Scenario: Vitrine de personagem próprio
- **WHEN** o jogador seleciona o próprio personagem em Meus personagens
- **THEN** aparece o Resumo da ficha dele, com nome, classe, raça, nível, recursos, Atributos e Perícias iguais aos da aba Resumo da ficha

#### Scenario: Atalho de um quadro
- **WHEN** a pessoa usa o atalho do quadro de Atributos no Resumo do acervo
- **THEN** a ficha completa abre na seção Atributos

#### Scenario: Sem retrato na lista
- **WHEN** um NPC não tem retrato
- **THEN** a miniatura da lista usa o retrato padrão de NPC do tema

### Requirement: Cópia independente para outra campanha
Numa vitrine, a pessoa SHALL poder escolher **Copiar para campanha** e uma campanha de destino em que é Narradora (inclusive a mesma campanha de origem). A cópia SHALL seguir a regra de gestão de personagens: nova ficha independente na campanha de destino, como NPC quando a origem é personagem de jogador ou NPC, e como monstro quando a origem é monstro. Sem campanha narrada disponível, a ação SHALL explicar que é preciso narrar uma campanha.

#### Scenario: Personagem próprio vira NPC
- **WHEN** a jogadora copia o próprio personagem "Caelren" para uma campanha que narra
- **THEN** "Caelren" aparece como NPC oculto nessa campanha e passa a constar em NPCs no acervo dela, e o personagem original não muda

#### Scenario: Reaproveitar monstro
- **WHEN** o Narrador copia o monstro "Lobo Cinzento" da campanha A para a campanha B
- **THEN** a campanha B ganha um monstro "Lobo Cinzento" independente, e alterar um não altera o outro

#### Scenario: Destino não narrado
- **WHEN** alguém tenta copiar para uma campanha em que é jogador
- **THEN** o servidor recusa e nada é criado
