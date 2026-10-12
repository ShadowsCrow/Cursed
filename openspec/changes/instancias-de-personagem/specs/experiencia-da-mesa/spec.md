# Spec Delta

## MODIFIED Requirements

### Requirement: NPCs e monstros na cena
Na aba Cena, o Narrador SHALL ver, separada da lista dos jogadores, a lista **NPCs e monstros**, com os personagens da mesa sem dono que são modelos (não instâncias). Cada item SHALL mostrar o retrato redondo, o nome, o tipo (NPC, Monstro ou Personagem) e, quando a ficha estiver oculta dos jogadores, a marca "ficha oculta". Sob cada modelo, a lista SHALL mostrar as instâncias dele, com a marca "na cena" quando têm token na cena aberta (capacidade `instancias-de-personagem`). Colocar um modelo na cena SHALL funcionar como para os jogadores ("Colocar" ou arrastar para o grid), mas SHALL criar uma instância nova e ligar o token a ela, e não ao modelo; colocar uma instância que já existe e está fora da cena SHALL ligar o token a ela mesma.

A ficha oculta SHALL NOT esconder o token: ela só impede o jogador de abrir a ficha. Quem decide se o jogador vê o token é o Narrador:
- ao colocá-lo, pelo botão **"Colocar oculto"** (olho cortado) ao lado de "Colocar" em cada personagem das duas listas, que põe o token já oculto; "Colocar" e o arraste põem o token visível (melhorias-da-sala, item 4, que retirou a chave geral "Colocar oculto dos jogadores");
- depois, pelo olho da lista de tokens.

O token visível SHALL mostrar o nome real e a foto do personagem (ou a arte padrão do tipo). Com a ficha oculta, o jogador SHALL receber o token sem o vínculo com a ficha, e a foto SHALL vir por uma rota do token que segue a visibilidade do token. O jogador SHALL NOT ver essa lista.

#### Scenario: Pôr um monstro de ficha oculta, visível
- **WHEN** o Narrador coloca, com "Colocar", um monstro marcado "ficha oculta"
- **THEN** a instância é criada com a ficha oculta, e o token dela aparece para os jogadores com o nome e a foto do monstro, sem que eles consigam abrir a ficha

#### Scenario: Pôr já oculto
- **WHEN** o Narrador escolhe o olho cortado ao lado de "Colocar" no monstro
- **THEN** a instância é criada e o token dela entra oculto: aparece translúcido para o Narrador e não aparece para os jogadores

#### Scenario: Token oculto
- **WHEN** o Narrador oculta esse token pelo botão de olho
- **THEN** o token some para os jogadores

#### Scenario: Listas separadas
- **WHEN** a mesa tem Lion (de um jogador), um NPC e um monstro
- **THEN** Lion aparece em "Personagens dos jogadores" e o NPC e o monstro em "NPCs e monstros"

#### Scenario: Sem chave geral
- **WHEN** o Narrador abre a seção "Tokens" da aba Cena
- **THEN** não há a chave "Colocar oculto dos jogadores"; cada personagem tem "Colocar" e o olho cortado, e o arraste põe o token visível

#### Scenario: Colocar cria a instância e a marca na cena
- **WHEN** o Narrador escolhe "Colocar" no modelo "Lagarto-macaco", que já tem "Lagarto-macaco 1" na cena
- **THEN** a cena ganha o token de "Lagarto-macaco 2", e a lista mostra as duas instâncias sob o modelo, ambas "na cena", e o modelo sem a marca

#### Scenario: Voltar com uma instância
- **WHEN** "Lagarto-macaco 2" está fora da cena, com 4 PV, e o Narrador escolhe "Colocar" nela
- **THEN** o token volta ligado à mesma instância, com os 4 PV
