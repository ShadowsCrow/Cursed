## ADDED Requirements

### Requirement: Folha da aba Cartas
A aba de cartas da ficha SHALL se chamar "Cartas" na barra de abas. Ela SHALL usar uma folha própria de pergaminho, no lugar da moldura comum das seções, com moldura dourada e cantos em SVG. A folha SHALL abrir com:
- a etiqueta "CARTAS";
- o título "Habilidades, magias, itens e efeitos";
- à direita, a busca "Buscar cartas…" e a escolha de ordem, que começa em "Nome (A-Z)".

Para o Narrador, o cabeçalho SHALL ter também o botão "Conceder carta". Uma gravura pintada em sépia SHALL ficar atrás do lado direito do cabeçalho quando disponível; sem ela, SHALL aparecer um ornamento em SVG. As anotações de habilidades trazidas da ficha antiga SHALL continuar visíveis no fim da folha, quando existirem.

#### Scenario: Jogador abre a aba
- **WHEN** o jogador abre a aba "Cartas" do seu personagem
- **THEN** vê a folha com a etiqueta "CARTAS", o título "Habilidades, magias, itens e efeitos", a busca, a ordem "Nome (A-Z)" e nenhum botão "Conceder carta"

#### Scenario: Narrador abre a aba
- **WHEN** o Narrador abre a aba "Cartas" de um personagem
- **THEN** o cabeçalho tem também o botão "Conceder carta", que abre a concessão como antes

#### Scenario: Gravura indisponível
- **WHEN** a gravura do cabeçalho não carrega
- **THEN** o cabeçalho mostra o ornamento em SVG, sem imagem quebrada

#### Scenario: Personagem sem cartas
- **WHEN** o personagem não tem nenhuma carta
- **THEN** a folha mostra "Este personagem ainda não possui cartas." no lugar da grade

### Requirement: Barra lateral de filtros das cartas
A folha SHALL ter uma barra lateral de filtros, na construção da lista de categorias do Inventário, com dois grupos:
- **Origem**, no topo: "Todas", "Da classe", "Da raça" e "Concedidas".
  - "Da classe" reúne as cartas concedidas automaticamente pela classe ou pelo arquétipo;
  - "Da raça", as concedidas automaticamente pela raça;
  - "Concedidas", todas as demais: dadas pelo Narrador ou escolhidas numa oferta.
- **Tipo**: "Todos", "Habilidades", "Magias", uma opção para cada categoria de item do catálogo de itens (por exemplo "Armas", "Armaduras", "Escudos") e "Efeitos".
  - A categoria de um item vem do seu formato na grade, como no Inventário.

Cada opção SHALL mostrar quantas cartas atende. As opções de tipo sem nenhuma carta SHALL ficar ocultas. As quatro opções de origem SHALL aparecer sempre, com a contagem zero quando for o caso. Escolher uma opção SHALL esconder da grade as cartas que não a atendem. Uma origem e um tipo escolhidos juntos SHALL se combinar, e a busca SHALL se combinar com os dois. As contagens de tipo SHALL considerar a origem escolhida. A opção ativa SHALL ser anunciada como pressionada.

#### Scenario: Só o que vem da raça
- **WHEN** o jogador escolhe "Da raça" num personagem com duas habilidades da raça e cinco da classe
- **THEN** a grade mostra só as duas habilidades da raça, e "Da raça" aparece pressionado com a contagem 2

#### Scenario: Origem e tipo juntos
- **WHEN** o jogador escolhe "Concedidas" e depois "Armas"
- **THEN** a grade mostra só as armas concedidas pelo Narrador ou escolhidas em oferta

#### Scenario: Tipo sem cartas
- **WHEN** o personagem não tem nenhuma magia
- **THEN** a opção "Magias" não aparece na barra

#### Scenario: Filtro sem resultado
- **WHEN** a busca e os filtros escolhidos não atendem nenhuma carta
- **THEN** a folha diz que nenhuma carta atende os filtros e oferece "Limpar filtros", que volta a "Todas", "Todos" e a busca vazia

### Requirement: Busca e ordem das cartas
A busca SHALL procurar, sem diferenciar maiúsculas nem acentos, no título, no texto e nas marcações da carta. A ordem SHALL oferecer "Nome (A-Z)", "Nome (Z-A)" e "Mais recentes", pela data em que o personagem recebeu a carta, e SHALL valer dentro de cada seção de estado.

#### Scenario: Busca sem acento
- **WHEN** o jogador busca "canalizacao"
- **THEN** a carta "Canalização arcana" aparece

#### Scenario: Ordem por nome
- **WHEN** a ordem é "Nome (A-Z)"
- **THEN** "Combinação tática" aparece antes de "Segundo round" na mesma seção

### Requirement: Seções das cartas por estado
A grade SHALL separar as cartas por estado, cada grupo com um título: "Aprendidas", "Em aprendizado", "Disponíveis para aprender", "Itens recebidos" e "Efeitos de cartas". Uma seção sem cartas no filtro atual SHALL ficar oculta. A seção "Disponíveis para aprender" SHALL manter o aviso de que selecionar não é aprender.

#### Scenario: Personagem com cartas aprendidas e em aprendizado
- **WHEN** o personagem tem dez habilidades aprendidas e uma magia em aprendizado
- **THEN** a grade mostra a seção "Aprendidas" com dez cartas e a seção "Em aprendizado" com uma, e nenhuma outra seção

### Requirement: Carta ilustrada da ficha
Cada carta da grade SHALL ter:
- moldura dourada em SVG;
- no alto, uma faixa ilustrada que ocupa toda a largura da carta;
- o tipo em versalete ("HABILIDADE", "MAGIA", "ITEM", "EFEITO");
- o título;
- o texto em até três linhas, terminando em reticências quando for maior;
- em habilidades e magias, o quadro de custos;
- no pé, a pílula da origem.

A faixa SHALL ser preenchida nesta ordem:
1. se a carta tem imagem própria, enviada pelo Narrador, essa imagem ocupa a faixa inteira;
2. senão, a faixa inteira recebe a pintura da categoria da carta (habilidades, magias, efeitos ou a categoria do item). No centro dela fica o mesmo medalhão da arte da categoria mostrada no detalhe da carta (pedido do usuário, 2026-09-30);
3. sem essa pintura, a faixa fica num degradê da cor do tipo, com um medalhão dourado desenhado e o ícone da categoria no centro.

Nenhuma imagem quebrada SHALL aparecer.

Toda carta da grade SHALL ter a mesma altura, a da referência, qualquer que seja o tipo. Em itens e efeitos, que não têm quadro de custos, a pílula da origem SHALL continuar no pé da carta.

O quadro de custos SHALL mostrar:
- ao Narrador, "Custo de aprendizado", "Descansos mínimos", "Potência de uso" e "Custo de uso", em duas colunas;
- aos demais participantes, só "Potência de uso" e "Custo de uso", sem lugar vazio para os outros dois.

Um custo não definido na carta SHALL aparecer como "Não definido", nunca como zero.

A pílula da origem SHALL dizer:
- "Classe: {nome} - automática", "Arquétipo: {nome} - automática" ou "Raça: {nome} - automática", para as concedidas automaticamente;
- "Concedida como aprendida (exceção)", para a exceção ao aprendizado;
- "Escolhida em oferta" ou "Concedida pelo Narrador", nos demais casos.

#### Scenario: Habilidade da classe vista pelo jogador
- **WHEN** o jogador vê a habilidade "Segundo round", concedida pela classe Especialista de Combate e sem custos definidos
- **THEN** a carta mostra "HABILIDADE", "Segundo round", o texto, "Potência de uso: Não definido", "Custo de uso: Não definido" e a pílula "Classe: Especialista de Combate - automática", sem Custo de aprendizado e sem Descansos mínimos

#### Scenario: Mesma habilidade vista pelo Narrador
- **WHEN** o Narrador vê a mesma carta
- **THEN** o quadro mostra os quatro custos em duas colunas, como na referência

#### Scenario: Item com foto própria
- **WHEN** uma espada tem foto enviada pelo Narrador
- **THEN** a foto ocupa a faixa inteira da carta, no lugar da pintura de Armas, e a carta aparece no filtro "Armas"

#### Scenario: Carta sem imagem própria
- **WHEN** uma habilidade não tem imagem própria
- **THEN** a faixa inteira mostra a pintura da categoria Habilidades

#### Scenario: Pintura indisponível
- **WHEN** a pintura da categoria Magias não carrega
- **THEN** a faixa fica no degradê da cor das magias, com o medalhão desenhado e o ícone das magias, sem imagem quebrada

#### Scenario: Item sozinho na seção
- **WHEN** a seção "Itens recebidos" tem só uma espada, sem quadro de custos
- **THEN** a carta da espada tem a mesma altura das cartas de habilidade, com a pílula da origem no pé

#### Scenario: Texto longo
- **WHEN** o texto de uma carta passa de três linhas
- **THEN** a carta mostra três linhas terminando em reticências, e o texto inteiro fica no detalhe

### Requirement: Rolagem própria da grade de cartas
Em telas largas, a caixa das cartas SHALL rolar dentro de si, com barra de rolagem própria, enquanto o cabeçalho e a barra de filtros ficam parados. A altura da caixa SHALL acompanhar a janela e mostrar pelo menos duas linhas de cartas. O título de cada seção de estado SHALL ficar preso no alto da caixa enquanto as cartas dela passam. A caixa SHALL rolar também pelo teclado. Em telas estreitas, onde a barra vira fileiras, a grade SHALL rolar com a página, sem rolagem dentro de rolagem.

#### Scenario: Muitas cartas numa tela larga
- **WHEN** o personagem tem mais cartas do que cabem na caixa, numa tela de 1448 pixels
- **THEN** só a caixa das cartas rola, a barra de filtros continua visível ao lado e o título "Aprendidas" fica preso no alto enquanto as cartas dela passam

#### Scenario: Celular
- **WHEN** a aba é aberta numa tela de 375 pixels
- **THEN** a grade não tem rolagem própria e rola com a página

### Requirement: Detalhe e ações da carta
Acionar uma carta, por clique, toque ou teclado, SHALL abrir o detalhe num diálogo com a forma de um grimório aberto, cópia fiel da referência aprovada pelo usuário (`referencia/detalhe-grimorio.png`, 2026-09-30):
- moldura dourada com filigrana nos cantos e estrelas no alto e no pé, sobre uma cena de velas quando a pintura existe;
- página da esquerda: a arte da carta num quadro ornamentado e, abaixo, o tipo em versalete e o título;
- página da direita: o texto inteiro num quadro de citação e os dados em quadros de duas colunas, cada um com um ícone num círculo, o rótulo em versalete e o valor.

Os quadros de dados SHALL ser, nesta ordem, os que se aplicam à carta:
- Marcações e Origem;
- Versão e Recebida em;
- Potência de uso e Custo de uso, em habilidades e magias;
- Escola e Grau, nas magias;
- Custo de aprendizado e Descansos mínimos, só para o Narrador;
- os custos adicionais, os requisitos e, só para o Narrador, o custo legado.

Marcações vazias SHALL aparecer como "Nenhuma". Molduras, quadros, ícones e ornamentos SHALL ser SVG ou CSS. A cena de fundo SHALL ser pintura opcional, sem imagem quebrada quando falta. Em telas estreitas, as duas páginas SHALL ficar uma sobre a outra, sem rolagem horizontal.

As ações de hoje SHALL ficar no detalhe, com as mesmas permissões:
- "Iniciar aprendizado" e "Interromper aprendizado", para quem edita a ficha;
- "Concluir aprendizado", "Migrar para a versão {n}" e "Remover", para o Narrador.

#### Scenario: Jogador inicia um aprendizado
- **WHEN** o jogador abre o detalhe de uma magia disponível e aciona "Iniciar aprendizado"
- **THEN** a magia passa para a seção "Em aprendizado", como antes

#### Scenario: Participante sem permissão
- **WHEN** um participante sem permissão de edição abre o detalhe de uma carta
- **THEN** vê o conteúdo sem nenhum botão de ação

#### Scenario: Teclado
- **WHEN** o jogador foca uma carta e pressiona Enter
- **THEN** o detalhe abre, e ao fechar o foco volta para a carta

#### Scenario: Grimório de uma habilidade
- **WHEN** o jogador abre "Segundo round", concedida pela classe Especialista de Combate
- **THEN** a página da esquerda mostra a arte, "HABILIDADE" e "Segundo round"; a da direita mostra o texto inteiro no quadro de citação e os quadros Marcações, Origem ("Classe: Especialista de Combate - automática"), Versão, Recebida em, Potência de uso e Custo de uso, sem Custo de aprendizado e sem Descansos mínimos

#### Scenario: Celular
- **WHEN** o detalhe é aberto numa tela de 375 pixels
- **THEN** a página da arte fica acima da página dos dados, e a página não rola na horizontal

### Requirement: Folha de Cartas em telas menores e acessível
A barra lateral SHALL ficar à esquerda da grade em telas largas, e a grade SHALL ter quatro colunas na largura da referência (1448 pixels), com cartas da largura das da referência. Com menos espaço, o número de colunas SHALL cair até uma. Em telas estreitas, a barra SHALL virar duas fileiras roláveis acima da grade, uma de origem e uma de tipo. Nenhuma largura a partir de 320 pixels SHALL rolar a página na horizontal. Ornamentos e pinturas SHALL ficar ocultos a leitores de tela, e cada carta SHALL ser anunciada com o tipo, o título e a origem.

#### Scenario: Tela da referência
- **WHEN** a aba é aberta numa tela de 1448 pixels
- **THEN** a barra lateral fica à esquerda e as cartas aparecem em quatro colunas

#### Scenario: Celular
- **WHEN** a aba é aberta numa tela de 375 pixels
- **THEN** as fileiras de origem e de tipo aparecem acima de uma coluna de cartas, e a página não rola na horizontal
