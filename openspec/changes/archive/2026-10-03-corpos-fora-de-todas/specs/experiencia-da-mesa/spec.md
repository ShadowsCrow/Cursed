## MODIFIED Requirements

### Requirement: Cartas no painel da Sala
Na aba Cartas, o Narrador SHALL ver as cartas publicadas do catálogo da mesa, com busca pelo título. De cada carta, ele SHALL poder:
- **enviar** a um personagem;
- **ofertar**, criando uma oferta que já começa com essa carta;
- **apresentar** à mesa.

As regras de cada ação SHALL ser as mesmas da Biblioteca. A aba SHALL NOT oferecer criar, editar nem importar cartas.

**Filtro por tipo (item 5):** a aba SHALL ter um filtro por tipo, para o Narrador e para o jogador:
- opções: Todas, Habilidades, Magias, Itens, Efeitos e Corpos, cada uma com contagem, mostrando só os tipos presentes;
- "Todas" SHALL NOT incluir as cartas de corpo, nem na lista nem na contagem: elas aparecem só com o filtro "Corpos" (pedido do usuário de 2026-10-03).;
- o filtro se soma à busca do Narrador;
- a opção atual é anunciada como pressionada.

**Imagem e colunas (item 5):** cada carta SHALL mostrar uma miniatura da arte, sem aumentar a altura da carta além de uma linha de miniatura. A arte é a imagem própria enviada pelo Narrador; sem ela, a pintura da categoria; sem nenhuma das duas, um marcador do tipo. Com o painel largo o bastante, as cartas SHALL ficar lado a lado, em pelo menos duas colunas.

O jogador SHALL ver, por personagem próprio, as cartas que o personagem tem, com tipo, título e estado, e SHALL ver as ofertas que aguardam a escolha dele, podendo escolher por ali. O jogador SHALL NOT ver o catálogo do Narrador.

#### Scenario: Narrador envia uma carta
- **WHEN** o Narrador busca "Bola de fogo" na aba Cartas, escolhe "Enviar" e escolhe Lion
- **THEN** a carta é concedida a Lion pelas mesmas regras da Biblioteca, e o resultado é anunciado

#### Scenario: Narrador oferta a partir de uma carta
- **WHEN** o Narrador escolhe "Ofertar" numa carta
- **THEN** abre a criação de oferta com essa carta já escolhida entre as candidatas

**Corpos (item 6):** as cartas de corpo do sistema SHALL ter um filtro e uma categoria próprios, **Corpos**, separados de Itens, com a etiqueta "Corpo". A imagem SHALL ser uma figura humanoide, ou a pintura própria de corpos quando existir. A pintura de Criaturas SHALL NOT ser usada para corpos.

#### Scenario: Corpos separados dos itens
- **WHEN** o Narrador abre a aba Cartas numa mesa com os oito corpos do sistema e uma espada
- **THEN** o filtro mostra "Itens 1" e "Corpos 8", e escolher "Corpos" mostra só os corpos, cada um com a figura humanoide

#### Scenario: Filtrar por tipo
- **WHEN** o Narrador escolhe "Magias" no filtro da aba Cartas
- **THEN** só as magias aparecem, e "Magias" é anunciada como pressionada

#### Scenario: Duas colunas com o painel largo
- **WHEN** o Narrador alarga o painel pela alça até o máximo
- **THEN** as cartas passam a aparecer em duas colunas, cada uma com a miniatura da arte

#### Scenario: Jogador vê as próprias cartas
- **WHEN** o jogador abre a aba Cartas
- **THEN** vê as cartas dos próprios personagens e as ofertas pendentes, e não vê o catálogo do Narrador nem as ações de enviar, ofertar ou apresentar

#### Scenario: Corpos fora de "Todas"
- **WHEN** o Narrador abre a aba Cartas numa mesa com os oito corpos do sistema, cinco habilidades e uma espada
- **THEN** "Todas" mostra a contagem 6 e só as habilidades e a espada, e os corpos aparecem só ao escolher "Corpos 8"
