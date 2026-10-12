# atributos-da-ficha Specification

## Purpose
TBD - created by archiving change redesenhar-aba-atributos. Update Purpose after archive.

## Requirements

### Requirement: Composição da aba Atributos
A aba Atributos da ficha SHALL apresentar, sobre uma folha de pergaminho com moldura dourada e cantos ornados:
- um cabeçalho com o sobretítulo "BASE MECÂNICA", o título "Atributos", uma frase de apresentação, três vinhetas ilustradas com legenda (Força do corpo, Presença social, Foco mental) e, para quem pode editar, a ação "Editar valores";
- um cartão por grupo oficial (Físicos, Sociais e Mentais), nessa ordem, cada um com uma faixa ilustrada na cor do grupo, um medalhão com o ícone do grupo, o nome e o subtítulo do grupo;
- em cada cartão, uma tabela com as colunas Nome, Base, Ajuste manual e Total, com uma linha por atributo do grupo, na ordem oficial, e um ícone próprio para cada atributo.

As molduras, medalhões e ornamentos SHALL ser desenhados em SVG/CSS. As ilustrações SHALL ser decorativas e opcionais: sem elas, a aba SHALL continuar completa, com emblemas em SVG no lugar das vinhetas e um degradê na cor do grupo no lugar da cena da faixa, sem imagem quebrada e sem deslocar o conteúdo quando elas carregam.

#### Scenario: Especialista de Combate com atributos preenchidos
- **WHEN** o jogador abre a aba Atributos de um personagem com Força 3, Destreza 2, Vigor 2, Carisma 2, Manipulação 2, Propósito 1, Percepção 1, Inteligência 1 e Raciocínio 1, sem ajustes
- **THEN** a aba mostra os cartões Físicos, Sociais e Mentais, cada um com seus três atributos; a base de Força aparece como 3, o ajuste como "—" e o total como "+3"

#### Scenario: Pinturas indisponíveis
- **WHEN** as pinturas das vinhetas e das faixas não carregam
- **THEN** a aba mostra os emblemas em SVG e as faixas em degradê, com os títulos legíveis, e nenhum elemento de imagem quebrada aparece

### Requirement: Valores exibidos sem cálculo no cliente
A aba SHALL mostrar a base e o ajuste manual gravados na ficha e o total calculado pelo servidor, e SHALL NOT calcular, estimar ou completar valores no cliente. O ajuste manual SHALL aparecer com sinal quando existir e "—" quando não existir. O total SHALL aparecer com sinal e SHALL dar acesso, por foco, clique ou toque, às fontes do valor e aos modificadores situacionais, indicando que os situacionais não entram no total. Um total não calculável SHALL aparecer como "—", com o motivo informado pelo servidor disponível pelo mesmo acesso.

#### Scenario: Total com fontes
- **WHEN** o jogador toca na placa do total de Força, que é 4 por base 3 e bônus de raça +1
- **THEN** abre a lista de fontes com a base e o bônus de raça, cada um com sinal

#### Scenario: Ajuste negativo
- **WHEN** a ficha tem ajuste manual −1 em Percepção
- **THEN** a caixa do ajuste de Percepção mostra "−1"

### Requirement: Edição em lote na aba Atributos
Quem pode editar a ficha SHALL ver a ação "Editar valores". Ao acioná-la, a base e o ajuste manual de cada atributo editável SHALL virar campos numéricos no lugar do disco e da caixa, e o sistema SHALL gravar todas as alterações de uma vez, com as mesmas regras da edição atual:
- a base de personagens SHALL respeitar os limites de `limites-de-atributos-e-pericias`, com a mensagem de erro junto ao campo; NPCs e monstros SHALL NOT ter limite de base;
- o ajuste manual SHALL NOT ter limite;
- alterações que exigem aprovação do Narrador SHALL ser anunciadas antes de salvar e SHALL ir para aprovação;
- Cancelar SHALL descartar o rascunho sem gravar.

Quem só pode ler a ficha SHALL NOT ver a ação "Editar valores" nem campos editáveis.

#### Scenario: Jogador ajusta dois atributos
- **WHEN** o jogador aciona "Editar valores", muda a base de Destreza para 3 e o ajuste de Vigor para 1 e salva
- **THEN** o sistema grava as duas alterações numa única gravação e a aba volta ao modo de leitura com os novos valores

#### Scenario: Base fora do limite
- **WHEN** o jogador digita 6 na base de Força de um personagem
- **THEN** o campo é marcado como inválido, a mensagem indica o intervalo de 1 a 5 e o uso do ajuste, e "Salvar alterações" fica desabilitado

#### Scenario: Leitor sem permissão
- **WHEN** alguém com acesso só de leitura abre a aba Atributos
- **THEN** a aba mostra os valores, sem a ação "Editar valores"

### Requirement: Atributos fora da lista oficial
Atributos gravados na ficha com nomes fora dos nove oficiais SHALL continuar visíveis e editáveis num cartão "Outros registrados na ficha", após os três grupos oficiais, com faixa neutra.

#### Scenario: Ficha antiga com atributo extra
- **WHEN** a ficha tem um atributo "Sorte" com base 2
- **THEN** a aba mostra um cartão "Outros registrados na ficha" com a linha Sorte e base 2

### Requirement: Aba Atributos em telas pequenas e acessível
A aba SHALL caber, sem rolagem horizontal da página, em larguras a partir de 360 px: em telas estreitas, os cartões SHALL ficar em uma coluna e as vinhetas SHALL encolher abaixo do título. Cada cartão SHALL ter um título de nível 3, e cada tabela SHALL ser nomeada pelo título do seu cartão. Ícones, vinhetas, faixas, medalhões e ornamentos SHALL ser ocultos para tecnologias assistivas e SHALL NOT receber foco. Os rótulos acessíveis dos valores SHALL seguir o padrão "Base de {atributo}" e "Ajuste manual de {atributo}".

#### Scenario: Celular de 375 px
- **WHEN** a aba Atributos é aberta numa tela de 375 px
- **THEN** os três cartões aparecem um abaixo do outro, com todas as colunas visíveis, e a página não rola na horizontal

#### Scenario: Leitor de tela na tabela de Sociais
- **WHEN** um usuário de leitor de tela navega até a tabela do cartão Sociais
- **THEN** a tabela é anunciada como "Sociais", e a célula da base de Carisma é anunciada como "Base de Carisma"
