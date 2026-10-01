# Spec Delta

## MODIFIED Requirements

### Requirement: Criação de item com formato e imagens
A criação de item SHALL começar pelo subtipo ("O que é?"), escolhido numa fila de ícones. Depois SHALL pedir a dimensão, com prévia na grade e opção de girar, e a raridade. Conforme o subtipo, também SHALL pedir:
- limite de pilha, mãos ocupadas e categoria (Outros);
- ampliação e Requisito de Força (mochila);
- capacidade de flechas (aljava).

Os demais campos do item SHALL vir do catálogo de itens, que declara para cada subtipo os campos de `rules/sistema/Equipamentos.md` e as escolhas de cada um:
- **armas de uma ou duas mãos:** Família de Proficiência, Atributo de Ataque, Perícia de Ataque, Dano, Atributo de Dano, Tipo de Dano, Alcance Normal, Alcance Máximo, Requisito de Força e Propriedades; a arma de uma mão também pode ser Versátil;
- **peitoral:** Categoria, Perfil, Bônus de Esquiva, Armadura, RDB, as Penalidades de Esquiva, Destreza, Furtividade e Deslocamento, Requisito de Força e Propriedades;
- **escudo:** Armadura, RDB, as quatro Penalidades, Requisito de Força e Propriedades;
- **capacete, luvas e botas:** só Propriedades e efeitos, sem Armadura nem RDB;
- **mochila, aljava e Outros:** só os campos do formato, Propriedades e efeitos.

A definição de formato de um item existente SHALL pedir as mesmas informações.

O editor SHALL NOT mostrar campos que o catálogo não declara para o subtipo; uma mochila SHALL NOT pedir Dano. A validação SHALL recusar valores em campos que o subtipo não declara. Campos sem valor SHALL ficar vazios: o sistema SHALL NOT preencher valores mecânicos ausentes. Valores numéricos SHALL ser inteiros não negativos. Valores de escolha SHALL estar entre as escolhas do catálogo.

O item SHALL aceitar duas imagens: a arte e o ícone de grade. O sistema SHALL avisar quando a proporção do ícone não corresponder à dimensão. Na grade:
- com ícone de grade, o ícone ocupa o formato do item e gira com ele;
- sem ícone de grade, a arte SHALL ser encaixada no formato com moldura;
- sem nenhuma imagem, SHALL aparecer o desenho padrão do subtipo, com o nome disponível ao leitor de tela e ao passar o mouse.

#### Scenario: Ícone fora de proporção
- **WHEN** o Narrador envia um ícone quadrado para um item 1 x 3
- **THEN** o sistema avisa da proporção e permite continuar

#### Scenario: Criar uma chave
- **WHEN** o Narrador cria um item Outros 1 x 1 chamado "Chave de Ferro", Incomum, na categoria Chaves
- **THEN** a carta publicada guarda raridade Incomum e categoria Chaves, e o item concedido mostra as duas etiquetas

#### Scenario: Foto e ícone na bolsa no criador de itens
- **WHEN** o Narrador escolhe "Duas mãos" (1 x 4) numa carta de item ainda não salva e envia o ícone na bolsa
- **THEN** o rascunho é salvo antes do envio, o ícone é aceito, e o criador mostra a foto e o ícone lado a lado, com a proporção pedida (1 x 4)

#### Scenario: Foto da carta no item concedido
- **WHEN** o Narrador concede uma carta de item publicada com arte
- **THEN** a arte vira a foto do item no painel "Item selecionado", e o ícone na bolsa vem do formato

#### Scenario: Item sem imagem
- **WHEN** um escudo 2 x 2 sem arte nem ícone é colocado na grade
- **THEN** ele aparece com o desenho padrão de escudo ocupando as quatro células

#### Scenario: Mochila sem campos de combate
- **WHEN** o Narrador escolhe Mochila em "O que é?"
- **THEN** o editor pede a dimensão, a ampliação da bolsa, o Requisito de Força e a raridade, e não mostra Dano, Armadura nem RDB

#### Scenario: Espada com os campos da regra
- **WHEN** o Narrador escolhe Uma mão em "O que é?"
- **THEN** o editor mostra os campos de arma da regra de Equipamentos, e Tipo de Dano oferece os tipos de dano da regra, com os físicos primeiro, conforme o catálogo

#### Scenario: Capacete sem Armadura
- **WHEN** o Narrador escolhe Capacete
- **THEN** o editor não mostra Armadura nem RDB, e oferece adicionar efeitos

#### Scenario: Valor fora das escolhas
- **WHEN** uma carta chega à validação com o Tipo de Dano "Gelatinoso" numa espada
- **THEN** a validação aponta o problema no campo Tipo de Dano e recusa a publicação

#### Scenario: Campo fora do subtipo
- **WHEN** uma carta de mochila chega à validação com o campo Dano preenchido
- **THEN** a validação aponta que Dano não se aplica à mochila e recusa a publicação

#### Scenario: Lista de campos alterada no catálogo
- **WHEN** o catálogo de itens passa a declarar um campo novo para o escudo
- **THEN** o editor mostra o campo novo nos escudos sem mudança de código

### Requirement: Itens sem dimensão
Itens existentes sem dimensão SHALL ficar numa bandeja "Sem dimensão", fora da grade e fora do cálculo, até o Narrador defini-la.

#### Scenario: Ficha migrada
- **WHEN** o Narrador abre uma ficha migrada com itens sem dimensão
- **THEN** os itens aparecem na bandeja "Sem dimensão", sem peso, até o Narrador definir o formato

## ADDED Requirements

### Requirement: Sem peso na plataforma
A plataforma SHALL NOT registrar nem mostrar peso de itens ou de cartas: a carga é só a grade. As importações (fichas do sistema antigo e códigos de carta e de equipamento) SHALL descartar o peso que trouxerem, e a validação SHALL recusar o peso como campo de item.

#### Scenario: Código de equipamento com peso
- **WHEN** o Narrador importa um código de equipamento antigo que traz peso 30
- **THEN** o item é criado sem peso, e nenhum lugar da ficha mostra o valor

#### Scenario: Ficha antiga importada
- **WHEN** uma ficha do sistema antigo com itens de peso 3 e 0,5 é importada
- **THEN** os itens chegam sem peso e ficam na bandeja "Sem dimensão"
