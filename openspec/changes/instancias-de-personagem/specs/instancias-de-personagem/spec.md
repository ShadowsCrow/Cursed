# Spec Delta

## Purpose

Separar o modelo de NPC ou monstro das criaturas em cena: cada "Colocar" cria uma instância independente, com ficha, PV, PP, token e participante próprios, numerada, ligada ao modelo de origem, promovível a ficha normal e excluível pela lixeira.

## ADDED Requirements

### Requirement: Colocar cria uma instância
Ao colocar na cena uma ficha de NPC ou monstro (pelo botão "Colocar", pelo arraste do retrato ou pelo "Colocar oculto"), o sistema SHALL criar uma **instância**: um personagem novo da mesa, do mesmo tipo do modelo, sem dono, com a visibilidade do modelo, e SHALL ligar o token criado a essa instância, e não ao modelo. Cada "Colocar" SHALL criar uma instância só (decisão do usuário, 2026-10-06: um por um, sem pedir quantos). Personagens de jogadores SHALL continuar entrando na cena como eles mesmos.

A instância SHALL guardar o modelo de origem. A criação SHALL entrar no registro da mesa.

#### Scenario: Três lagartos
- **WHEN** o Narrador escolhe "Colocar" três vezes no modelo "Lagarto-macaco"
- **THEN** a cena ganha três tokens, cada um ligado a uma ficha própria: "Lagarto-macaco 1", "Lagarto-macaco 2" e "Lagarto-macaco 3", e o modelo continua sem token

#### Scenario: Personagem de jogador
- **WHEN** o Narrador coloca Lion, personagem de Ana
- **THEN** o token é ligado à própria ficha de Lion, sem instância

#### Scenario: Colocar oculto
- **WHEN** o Narrador usa o olho cortado no modelo "Goblin"
- **THEN** a instância "Goblin 1" é criada e o token dela entra oculto dos jogadores

### Requirement: Cópia completa e recursos cheios
A instância SHALL ser uma cópia da ficha do modelo com tudo o que define a criatura: identidade, classe, arquétipo, raça, nível, atributos, perícias, personalidade, retrato, equipamento e inventário, e as cartas de habilidade e magia que o modelo tem (no mesmo estado). O que é história SHALL ser zerado: desgaste, consequências e efeitos aplicados. PV e PP atuais SHALL começar iguais aos máximos calculados da instância. Cartas de catálogo (classe, arquétipo e raça) SHALL ser concedidas à instância pela regra que já existe para fichas novas.

#### Scenario: Equipamento e cartas
- **WHEN** o modelo "Capitão Goblin" tem uma lança equipada e a carta "Grito de Guerra" aprendida
- **THEN** "Capitão Goblin 1" nasce com a própria lança equipada e com "Grito de Guerra" aprendida

#### Scenario: História não vem
- **WHEN** o modelo "Lobo" está com 3 de Exaustão, Sangrando e 4 PV de 12
- **THEN** "Lobo 1" nasce com Exaustão 0, sem Sangrando e com 12 de 12 PV

### Requirement: Numeração
O nome da instância SHALL ser o nome do modelo seguido de um número, contado por modelo na mesa: a primeira instância é "1", e cada nova instância recebe o número seguinte ao maior já usado, inclusive de instâncias excluídas, para nunca repetir. O rótulo do token SHALL ser o nome da instância.

#### Scenario: Número não volta
- **WHEN** existem "Goblin 1" e "Goblin 2", o Narrador exclui "Goblin 2" e coloca outro Goblin
- **THEN** a nova instância chama "Goblin 3"

### Requirement: Independência do modelo
Depois de criada, a instância SHALL ser uma ficha independente: editar o modelo SHALL NOT alterar as instâncias já criadas, e editar uma instância SHALL NOT alterar o modelo nem as outras instâncias. Vida, PP, desgaste, efeitos, inventário e cartas SHALL ser de cada instância. No modo turno, cada instância SHALL ser um participante próprio, com a própria iniciativa e a própria vez.

#### Scenario: Dano numa só
- **WHEN** "Lagarto-macaco 2" perde 5 PV
- **THEN** "Lagarto-macaco 1", "Lagarto-macaco 3" e o modelo continuam com o PV de antes

#### Scenario: Modelo editado depois
- **WHEN** o Narrador sobe o Vigor do modelo "Lagarto-macaco"
- **THEN** as instâncias em cena continuam com o Vigor de quando foram criadas, e a próxima instância nasce com o novo

#### Scenario: Iniciativa própria
- **WHEN** o Narrador entra em modo turno com três instâncias de Lagarto-macaco na cena
- **THEN** a barra mostra três participantes, cada um com a própria rolagem, sem o "×3" do grupo da ficha

### Requirement: Lista agrupada e limpeza
Na sub-aba Personagens da aba Cena, a lista "NPCs e monstros" SHALL mostrar os modelos e, sob cada modelo, as instâncias dele, com a marca "na cena" quando têm token na cena aberta. Cada instância SHALL ter **Excluir**, que a envia à lixeira recuperável da mesa pela regra de exclusão que já existe, e **Promover a ficha**. O modelo SHALL ter **Excluir as instâncias fora da cena**, que envia à lixeira as instâncias dele sem token na cena aberta. Retirar o token da cena SHALL NOT excluir a instância, que SHALL continuar na lista, disponível para "Colocar" de novo. O jogador SHALL NOT ver essa lista.

#### Scenario: Instâncias sob o modelo
- **WHEN** a mesa tem o modelo "Goblin" com "Goblin 1" na cena e "Goblin 2" fora dela
- **THEN** a lista mostra "Goblin" e, sob ele, "Goblin 1 · na cena" e "Goblin 2"

#### Scenario: Limpar as que sobraram
- **WHEN** o Narrador escolhe "Excluir as instâncias fora da cena" em "Goblin"
- **THEN** "Goblin 2" vai à lixeira e "Goblin 1" continua

#### Scenario: Tirar o token não exclui
- **WHEN** o Narrador remove da cena o token de "Goblin 4"
- **THEN** "Goblin 4" continua sob o modelo, sem a marca "na cena", e "Colocar" nele põe o token de volta com os mesmos PV e PP

### Requirement: A ficha na lixeira leva os tokens
Enviar uma ficha à lixeira (instância, modelo, NPC, monstro ou personagem de jogador) SHALL remover os tokens dela de todas as cenas da mesa, na mesma operação, e cada token removido SHALL entrar no registro da mesa. Não SHALL existir token ligado a uma ficha excluída. Restaurar a ficha da lixeira SHALL NOT trazer os tokens de volta. O contrário SHALL NOT valer: remover um token SHALL NOT excluir a ficha.

#### Scenario: Excluir a instância pela lista
- **WHEN** "Goblin 2" tem um token na cena aberta e outro numa cena fechada, e o Narrador escolhe "Excluir" nele
- **THEN** "Goblin 2" vai à lixeira e os dois tokens somem das cenas, com um "Token removido com a ficha" no registro para cada um

#### Scenario: Limpeza com token em outra cena
- **WHEN** "Goblin 3" não tem token na cena aberta, mas tem numa cena fechada, e o Narrador escolhe "Excluir as instâncias fora da cena"
- **THEN** "Goblin 3" vai à lixeira e o token da cena fechada some

### Requirement: Promover a ficha
O Narrador SHALL poder **promover** uma instância a ficha normal: ela deixa de apontar para o modelo, passa a aparecer no acervo e nas listas como um NPC ou monstro comum, e passa a servir de modelo para novas instâncias. O nome SHALL ficar como está. Promover SHALL entrar no registro da mesa e SHALL NOT poder ser desfeito pela plataforma. Só o Narrador SHALL promover.

#### Scenario: NPC recorrente
- **WHEN** o Narrador promove "Goblin 2", que sobreviveu e virou o chefe
- **THEN** "Goblin 2" aparece em Monstros no acervo, e "Colocar" nele cria "Goblin 2 1"

#### Scenario: Jogador não promove
- **WHEN** um jogador pede ao servidor para promover uma instância
- **THEN** o servidor recusa

### Requirement: Tokens antigos continuam valendo
Tokens já ligados diretamente a uma ficha de NPC ou monstro (criados antes desta mudança) SHALL continuar funcionando como hoje, inclusive o grupo da ficha no modo turno. Nada é migrado automaticamente.

#### Scenario: Cena antiga
- **WHEN** uma cena criada antes tem dois tokens ligados à mesma ficha "Goblin"
- **THEN** eles continuam ligados a ela e, no modo turno, formam o grupo como antes
