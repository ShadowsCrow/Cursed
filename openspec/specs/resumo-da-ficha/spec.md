# resumo-da-ficha Specification

## Purpose
Apresentar o personagem de relance numa aba inicial da ficha, bonita e só de leitura, que reúne ilustração, identidade, recursos, atributos, perícias de destaque, equipamentos, habilidades e história, sempre refletindo os valores atuais da ficha.

## Requirements

### Requirement: Aba Resumo como entrada da ficha
A ficha SHALL ter uma aba "Resumo" como primeira aba. Ao abrir a ficha sem indicar uma seção, o sistema SHALL mostrar o Resumo. Endereços que indicam outra seção, inclusive os nomes antigos de seção, SHALL continuar abrindo a seção pedida.

#### Scenario: Jogador abre a própria ficha
- **WHEN** o jogador abre a ficha do personagem pela mesa, sem seção no endereço
- **THEN** a aba Resumo aparece selecionada e seu conteúdo é exibido

#### Scenario: Link antigo para Perícias
- **WHEN** alguém abre a ficha com o endereço indicando a seção Perícias
- **THEN** a aba Perícias abre selecionada, e a aba Resumo continua disponível como a primeira da lista

### Requirement: Composição do Resumo
O Resumo SHALL apresentar, sobre fundo de pergaminho e com molduras ornadas da identidade visual da plataforma:
- a imagem do personagem ao centro;
- um quadro de **identidade** com nome, classe, arquétipo, raça e nível;
- um quadro de **recursos** com PV e PP (valor atual e máximo) e Defesa (Esquiva) em destaque, e Defesa (Armadura) e RDB (Armadura) em destaque menor;
- quadros de **Atributos**, **Perícias**, **Equipamentos** e **Habilidades** nas laterais da imagem;
- uma faixa de **História** abaixo.

O Resumo SHALL mostrar apenas valores que a ficha guarda ou que o servidor calcula, e SHALL NOT calcular, estimar ou completar valores mecânicos no cliente. Campo ausente SHALL aparecer como "—" ou com o estado vazio do quadro, nunca com um valor inventado.

#### Scenario: Mago Elfo completo
- **WHEN** o jogador abre o Resumo de um Mago Elfo de nível 3 com ilustração, atributos, perícias, itens equipados, habilidades aprendidas e história preenchidos
- **THEN** o Resumo mostra a ilustração ao centro, "Mago", o arquétipo, "Elfo" e o nível 3 no quadro de identidade, e os demais quadros com os valores da ficha

#### Scenario: Recurso não calculável
- **WHEN** a ficha não tem classe e o servidor informa que o PV máximo não é calculável
- **THEN** o medalhão de PV mostra "—" e o motivo informado pelo servidor fica disponível por foco ou toque, sem exibir um número

### Requirement: Imagem central
A imagem central SHALL ser a ilustração do personagem. Sem ilustração, SHALL ser o retrato; sem ilustração nem retrato, SHALL ser a arte padrão de retrato vazio da plataforma. A imagem SHALL ser exibida na vertical sem distorção, recortada para preencher a moldura, e SHALL ter texto alternativo com o nome do personagem.

Quem pode editar a ficha SHALL poder enviar, trocar ou remover a ilustração por uma ação junto à imagem, no próprio Resumo. Quem só pode ler a ficha SHALL NOT ver essa ação.

#### Scenario: Personagem só com retrato
- **WHEN** o personagem tem retrato e não tem ilustração
- **THEN** o Resumo mostra o retrato ao centro, na moldura vertical

#### Scenario: Jogador envia a ilustração
- **WHEN** o jogador, numa mesa que permite editar a ficha, envia uma imagem de corpo inteiro pela ação junto à imagem do Resumo
- **THEN** a ilustração substitui a imagem central, e o retrato do cabeçalho das outras abas não muda

#### Scenario: Leitor sem permissão
- **WHEN** outro participante que só pode ler a ficha abre o Resumo
- **THEN** ele vê a imagem central sem a ação de enviar ilustração

### Requirement: Quadro de Atributos
O quadro de Atributos SHALL mostrar os nove atributos da ficha, agrupados em Físicos, Sociais e Mentais na ordem do livro, cada um com seu valor total calculado pelo servidor.

#### Scenario: Atributo alterado por efeito
- **WHEN** um efeito ativo soma `+1` à Força cujo valor base é `3`
- **THEN** o quadro de Atributos mostra Força `4`

### Requirement: Quadro de Perícias com as mais altas
O quadro de Perícias SHALL mostrar as **seis** perícias de maior valor total calculado pelo servidor, em ordem decrescente de valor. Perícias de valor total `0` SHALL NOT aparecer. Em caso de empate, SHALL prevalecer a ordem das perícias no livro (Talentos, Técnicas, Conhecimentos, e a ordem dentro de cada grupo). Sem nenhuma perícia acima de `0`, o quadro SHALL mostrar um estado vazio que diga isso.

#### Scenario: Personagem recém-criado
- **WHEN** o personagem tem Arcanismo `3`, Ocultismo `2`, Investigação `2`, Esquiva `2`, e Prontidão, Furtividade, Medicina e Natureza com `1`
- **THEN** o quadro mostra Arcanismo `3`, Esquiva `2`, Investigação `2`, Ocultismo `2`, Prontidão `1` e Furtividade `1`, nessa ordem

#### Scenario: Nenhuma perícia treinada
- **WHEN** todas as perícias do personagem têm valor total `0`
- **THEN** o quadro de Perícias informa que nenhuma perícia tem valor acima de 0 e oferece o atalho para a aba Perícias

### Requirement: Quadro de Equipamentos
O quadro de Equipamentos SHALL mostrar os itens **equipados** do personagem, cada um com sua arte ou ícone de grade quando houver, nome e quantidade quando maior que `1`. Itens apenas carregados no inventário SHALL NOT aparecer. Com mais de cinco itens equipados, o quadro SHALL mostrar os cinco primeiros e a indicação "e mais N".

#### Scenario: Espada equipada e corda na mochila
- **WHEN** o personagem tem uma espada equipada e uma corda só no inventário
- **THEN** o quadro de Equipamentos mostra a espada e não mostra a corda

#### Scenario: Nada equipado
- **WHEN** o personagem não tem itens equipados
- **THEN** o quadro de Equipamentos informa que nada está equipado e oferece o atalho para a aba Equipamentos

### Requirement: Quadro de Habilidades
O quadro de Habilidades SHALL mostrar as cartas de habilidade e de magia que o personagem já **aprendeu**, com arte (ou ícone do tipo, sem arte) e nome, na ordem em que foram adquiridas. Cartas disponíveis, em aprendizado, de item, de efeito ou removidas SHALL NOT aparecer. Com mais de quatro cartas aprendidas, o quadro SHALL mostrar as quatro primeiras e a indicação "e mais N".

#### Scenario: Carta em aprendizado
- **WHEN** o personagem aprendeu "Projétil Arcano" e ainda está aprendendo "Passo Etéreo"
- **THEN** o quadro de Habilidades mostra "Projétil Arcano" e não mostra "Passo Etéreo"

### Requirement: Faixa de História
A faixa de História SHALL mostrar o texto da História do personagem, preservando as quebras de parágrafo, com a primeira letra em capitular decorativa que não altera o texto lido por leitores de tela. Sem História, a faixa SHALL mostrar um convite a escrevê-la com atalho para a aba Personalidade, para quem pode editar, e um aviso neutro de "História não escrita" para quem só lê.

#### Scenario: História longa
- **WHEN** a História tem três parágrafos
- **THEN** a faixa mostra os três parágrafos, com a capitular apenas no primeiro

#### Scenario: Ficha antiga sem História
- **WHEN** o jogador abre o Resumo de uma ficha migrada que não tem História
- **THEN** a faixa convida a escrever a História e leva à aba Personalidade

### Requirement: Resumo só de leitura com atalhos
O Resumo SHALL NOT oferecer edição de valores. Cada quadro SHALL ter um atalho acessível por teclado que abre a aba correspondente (Informações básicas, Status, Atributos, Perícias, Equipamentos, Habilidades e cartas, Personalidade), mantendo o personagem e sem recarregar os dados.

#### Scenario: Atalho de Perícias
- **WHEN** o jogador aciona o atalho do quadro de Perícias
- **THEN** a aba Perícias abre selecionada e o endereço passa a indicar essa seção

### Requirement: Resumo acompanha a ficha
O Resumo SHALL refletir as alterações da ficha feitas nas outras abas, pelo Narrador ou por efeitos, sem exigir recarregar a página, usando os mesmos dados já carregados pela ficha.

#### Scenario: Item equipado em outra aba
- **WHEN** o jogador equipa um escudo na aba Equipamentos e volta ao Resumo
- **THEN** o escudo aparece no quadro de Equipamentos e a Defesa mostrada é a recalculada pelo servidor

#### Scenario: Dano recebido
- **WHEN** o PV atual do personagem cai de `20` para `14` durante a sessão
- **THEN** o medalhão de PV do Resumo mostra `14` de PV atual

### Requirement: Acessibilidade e celular
Ornamentos, molduras e ícones decorativos do Resumo SHALL ser ignorados por leitores de tela. Cada quadro SHALL ter um título de seção, e os valores SHALL ser lidos junto com seus rótulos. O texto sobre o pergaminho SHALL manter contraste de pelo menos `4,5:1`. Em telas estreitas (a partir de `360 px`), o Resumo SHALL empilhar imagem, identidade, recursos, atributos, perícias, equipamentos, habilidades e história nessa ordem, sem rolagem horizontal.

#### Scenario: Leitor de tela no quadro de recursos
- **WHEN** um usuário de leitor de tela chega ao medalhão de PV
- **THEN** ouve o rótulo "Pontos de Vida" com o valor atual e o máximo, sem a descrição do ornamento

#### Scenario: Celular de 360 px
- **WHEN** o jogador abre o Resumo num celular de `360 px` de largura
- **THEN** os quadros aparecem empilhados abaixo da imagem, sem rolagem horizontal
