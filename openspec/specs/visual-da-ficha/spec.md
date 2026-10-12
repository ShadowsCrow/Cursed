# visual-da-ficha Specification

## Purpose
Dar à ficha do personagem, fora do Resumo, a aparência ornamentada da nova estética: cabeçalho com retrato e recursos, faixa de estado, barra de abas com ícones e moldura comum às seções, sem mudar o que cada seção faz.

## Requirements

### Requirement: Cabeçalho ornamentado da ficha
Em todas as seções da ficha, exceto no Resumo, que já traz identidade e recursos, o topo SHALL mostrar um cabeçalho na paleta noturna, com moldura dourada recortada e uma ilustração de fundo. Ele SHALL conter:
- o retrato do personagem dentro de moldura ornamentada;
- classe e raça, com a cor da classe como complemento do nome escrito;
- o nome do personagem em fonte de exibição;
- as etiquetas de arquétipo e idade, quando existirem;
- um quadro de Pontos de Vida e Pontos de Propósito, com o atual, o máximo e uma barra.

Quem pode editar a ficha SHALL ver, junto ao retrato, as ações de trocar e remover o retrato. Os valores e ações do cabeçalho SHALL ser os mesmos de antes.

#### Scenario: Jogador abre o Inventário
- **WHEN** o jogador abre a aba Inventário da própria ficha
- **THEN** o topo mostra o retrato emoldurado, "Especialista de Combate · Elfo", o nome, as etiquetas e o quadro com PV 25/25 e PP 6/6, sobre o fundo ilustrado

#### Scenario: Personagem sem retrato
- **WHEN** o personagem não tem retrato enviado
- **THEN** a moldura mostra o retrato ilustrativo padrão, sem imagem quebrada

#### Scenario: Ficha só de leitura
- **WHEN** um jogador abre a ficha de outro personagem em modo de leitura
- **THEN** o cabeçalho aparece completo, sem as ações de trocar e remover o retrato

### Requirement: Faixa de estado com ícones
Abaixo do cabeçalho, a faixa de estado SHALL mostrar:
- Exaustão e Estresse em placas com ícone, valor, limite e faixa atual escrita;
- Esforço como botão destacado, para quem pode usá-lo;
- os Efeitos ativos ou a palavra "Nenhum".

O estado SHALL continuar comunicado por texto, e não só por cor. As ações existentes da faixa SHALL continuar disponíveis.

#### Scenario: Estresse pressionado
- **WHEN** o personagem está com Estresse 5 de 10 na faixa Pressionado
- **THEN** a placa de Estresse mostra o ícone, "5/10" e "Pressionado" escrito

#### Scenario: Nenhum efeito ativo
- **WHEN** o personagem não tem efeitos ativos
- **THEN** a faixa mostra "Efeitos ativos" seguido de "Nenhum"

### Requirement: Barra de abas com ícones
Cada uma das dez seções SHALL ter, na barra de abas, um ícone decorativo e o nome escrito. A aba ativa SHALL se destacar como placa dourada e SHALL ser identificável também por forma ou peso do texto, e não só por cor. Quando as abas não couberem na largura, a barra SHALL rolar na horizontal dentro de si, sem rolar a página, e SHALL manter a aba ativa visível. A navegação por teclado e a semântica de abas SHALL continuar como antes.

#### Scenario: Tela de 1440 pixels
- **WHEN** a ficha é aberta numa tela de 1440 pixels de largura
- **THEN** as dez abas aparecem numa só fileira, cada uma com ícone e nome

#### Scenario: Celular
- **WHEN** a ficha é aberta num celular de 375 pixels e a aba ativa é "Inventário"
- **THEN** a barra de abas rola na horizontal, a aba Inventário está visível e a página não tem rolagem horizontal

#### Scenario: Teclado
- **WHEN** o jogador foca a barra de abas e pressiona a seta para a direita
- **THEN** o foco vai para a próxima aba, que fica visível na barra

### Requirement: Moldura comum das seções
Cada seção da ficha, exceto o Resumo e Informações básicas, que têm folha própria, SHALL ficar sobre pergaminho, dentro de moldura dourada recortada. Ela SHALL abrir com um cabeçalho que tem medalhão com o ícone da seção, título, uma frase curta de subtítulo e, à direita, as ferramentas da seção quando houver. O conteúdo de cada seção SHALL ser o mesmo de antes.

#### Scenario: Aba Atributos
- **WHEN** o jogador abre a aba Atributos
- **THEN** a seção aparece emoldurada, com o medalhão e o título "Atributos", e a tabela de atributos funciona como antes

#### Scenario: Ferramentas da seção
- **WHEN** o jogador abre a aba Inventário
- **THEN** o cabeçalho da seção mostra a busca e o botão "Importar código" à direita do título

### Requirement: Ornamentos da ficha em SVG e CSS
Molduras, cantos, chanfros e frisos da ficha SHALL ser desenhados em SVG ou CSS e SHALL esticar com o conteúdo, sem distorcer os cantos. Pinturas SHALL ser usadas só como ilustração: fundo do cabeçalho, couro e laterais pintadas da bolsa do inventário. Ornamentos e pinturas SHALL ser decorativos, ocultos de tecnologias assistivas e sem capturar cliques. Sem uma pintura, SHALL restar um fundo liso coerente, sem imagem quebrada.

#### Scenario: Pintura indisponível
- **WHEN** a ilustração de fundo do cabeçalho não carrega
- **THEN** o cabeçalho mostra o fundo noturno liso com a moldura, e todo o conteúdo continua legível

#### Scenario: Leitor de tela no cabeçalho
- **WHEN** um leitor de tela percorre o cabeçalho
- **THEN** lê o nome, a classe, a raça, as etiquetas e os recursos, e nenhum ornamento

### Requirement: Ficha ornamentada no celular
Em telas de até 760 pixels:
- o cabeçalho SHALL empilhar retrato e identidade acima do quadro de recursos;
- a faixa de estado SHALL quebrar em linhas;
- ornamentos que ocupem espaço necessário ao conteúdo SHALL ser simplificados ou omitidos.

Nenhuma tela a partir de 360 pixels SHALL ter rolagem horizontal da página.

#### Scenario: Cabeçalho num celular de 360 pixels
- **WHEN** a ficha é aberta numa tela de 360 pixels
- **THEN** retrato, nome e recursos aparecem empilhados, sem sobreposição e sem rolagem horizontal

### Requirement: Folha de Informações básicas
A aba Informações básicas SHALL usar a folha de pergaminho do Resumo, com moldura dupla e cantos ornamentados. O cabeçalho da folha SHALL mostrar a etiqueta "IDENTIDADE", o título "Informações básicas" e o subtítulo "Dados fundamentais sobre o personagem.".

Os campos SHALL ficar em dois quadros emoldurados, cada um com título e emblema:
- **Características pessoais**: Nome, Arquétipo, Nível, Altura (m) e Tamanho base;
- **Classificação e origem**: Classe, Raça, Idade, Sexo e Tamanho atual.

Cada campo SHALL ocupar uma linha com ícone decorativo, rótulo, valor e, para quem pode editar aquele campo, o botão "Editar". A edição, as permissões por campo, as consequências das trocas e os avisos do servidor SHALL continuar como antes. O Tamanho base SHALL aparecer sem botão de edição, com a indicação da raça de onde vem.

Quando o arquétipo tiver conceito no catálogo, uma faixa emoldurada SHALL mostrar "Conceito do arquétipo {nome}" e o texto do conceito. Sem conceito, a faixa SHALL não aparecer.

#### Scenario: Jogador abre Informações básicas
- **WHEN** o jogador abre a aba Informações básicas do Lion, Especialista de Combate, Antimago, Elfo
- **THEN** vê o título "Informações básicas", o quadro "Características pessoais" com Nome "Lion" e Arquétipo "Antimago", o quadro "Classificação e origem" com Classe "Especialista de Combate" e Raça "Elfo", e a faixa "Conceito do arquétipo Antimago" com o texto do catálogo

#### Scenario: Edição de um campo
- **WHEN** o jogador aciona "Editar" na linha Raça e escolhe outra raça
- **THEN** a mesma superfície de edição de antes abre, com as cartas que saem e entram, e a troca é salva do mesmo jeito

#### Scenario: Campo só do Narrador
- **WHEN** o jogador abre a aba
- **THEN** as linhas Nível e Tamanho atual mostram o valor sem o botão "Editar", e o Narrador vê o botão nas duas

#### Scenario: Ficha só de leitura
- **WHEN** um jogador abre a ficha de outro personagem em modo de leitura
- **THEN** todas as linhas aparecem sem o botão "Editar"

#### Scenario: Arquétipo sem conceito
- **WHEN** o personagem não tem arquétipo ou o arquétipo não tem conceito no catálogo
- **THEN** a faixa do conceito não aparece

### Requirement: Pinturas e ornamentos da folha de Informações básicas
Cantos, flores, frisos, emblemas e ícones das linhas SHALL ser desenhados em SVG ou CSS, decorativos e ocultos de tecnologias assistivas. A folha SHALL poder mostrar três pinturas opcionais: uma paisagem em sépia no cabeçalho e uma natureza-morta de cada lado da faixa do conceito. Uma pintura que não carregar SHALL desaparecer sem imagem quebrada; sem a paisagem, SHALL aparecer a rosa dos ventos em SVG. O texto SHALL nunca ficar por baixo de uma pintura.

#### Scenario: Pinturas indisponíveis
- **WHEN** nenhuma das pinturas da aba carrega
- **THEN** a folha aparece completa, com moldura, cantos, quadros e a rosa dos ventos, e o texto do conceito ocupa a largura da faixa

#### Scenario: Leitor de tela
- **WHEN** um leitor de tela percorre a aba
- **THEN** lê o título, os títulos dos quadros, os rótulos, os valores e os botões, e nenhum ícone, ornamento ou pintura

### Requirement: Informações básicas em telas estreitas
Na folha de Informações básicas:
- em telas largas, os dois quadros SHALL ficar lado a lado;
- quando a folha tiver menos de 900 pixels, os quadros SHALL se empilhar;
- quando a folha tiver menos de 640 pixels, a paisagem e as pinturas da faixa SHALL ser omitidas.

Nenhuma tela a partir de 360 pixels SHALL ter rolagem horizontal da página.

#### Scenario: Tela de 1440 pixels
- **WHEN** a aba é aberta numa tela de 1440 pixels
- **THEN** os dois quadros aparecem lado a lado, com a mesma altura

#### Scenario: Celular de 375 pixels
- **WHEN** a aba é aberta num celular de 375 pixels
- **THEN** os quadros aparecem empilhados, cada linha mostra rótulo, valor e "Editar" sem sobreposição, e a página não rola na horizontal

### Requirement: Folha da aba Perícias
A aba Perícias SHALL usar uma folha própria de pergaminho, no lugar da moldura comum das seções, com moldura dourada e cantos em SVG. A folha SHALL abrir com a etiqueta "ESPECIALIDADES", o título "Perícias" e o texto "As perícias representam o que seu personagem sabe, pratica e é capaz de fazer no mundo.". O botão "Editar valores" SHALL ficar no canto superior direito, e só para quem pode editar alguma perícia. Uma paisagem pintada em sépia SHALL ficar atrás do cabeçalho quando disponível; sem ela, SHALL aparecer um ornamento em SVG.

Os valores, os limites, a edição em lote, a aprovação do Narrador e o cálculo do total SHALL continuar exatamente como antes.

#### Scenario: Jogador abre a aba
- **WHEN** o jogador abre a aba Perícias do seu personagem
- **THEN** vê a folha com o título "Perícias", o texto de apresentação e o botão "Editar valores"

#### Scenario: Ficha só de leitura
- **WHEN** um participante sem permissão de edição abre a aba Perícias
- **THEN** a folha aparece completa, sem o botão "Editar valores"

#### Scenario: Paisagem indisponível
- **WHEN** a pintura do cabeçalho não carrega
- **THEN** o cabeçalho mostra o ornamento em SVG, sem imagem quebrada, e todo o texto continua legível

### Requirement: Quadros dos grupos de perícias
Talentos, Técnicas e Conhecimentos SHALL aparecer cada um num quadro com moldura dourada em SVG, um estandarte no alto e um medalhão sobre ele. Cada estandarte SHALL mostrar o nome do grupo e o lema: "Instinto e ação", "Prática e ofício" e "Sabedoria e mundo". O medalhão SHALL ter o símbolo do grupo: braço, espadas cruzadas e livro aberto. O estandarte SHALL ter a pintura do grupo quando disponível; sem ela, um degradê na cor do grupo: vinho, verde e azul. Perícias registradas na ficha fora da lista oficial SHALL aparecer num quarto quadro, "Outros registrados na ficha".

#### Scenario: Três grupos lado a lado
- **WHEN** a aba Perícias é aberta numa tela de 1448 pixels
- **THEN** Talentos, Técnicas e Conhecimentos aparecem lado a lado, na mesma largura, cada um com estandarte, medalhão, nome e lema

#### Scenario: Perícia fora da lista oficial
- **WHEN** a ficha tem a perícia "Navegação", que não está na lista oficial
- **THEN** ela aparece no quadro "Outros registrados na ficha", com base, ajuste e total

### Requirement: Linha de cada perícia
Cada perícia SHALL ocupar uma linha com:
- ícone próprio;
- nome;
- base;
- ajuste manual numa caixa: o valor ou "—" quando não há ajuste;
- total numa placa dourada com sinal, por exemplo "+6", que abre as fontes do valor.

O ícone de cada perícia SHALL vir do catálogo de dados da ficha. A maior base entre as perícias da ficha SHALL aparecer num selo escuro: todas as empatadas o recebem, e nenhuma quando a maior base é 0. O selo SHALL ser anunciado a leitores de tela como "maior base" e não SHALL ter efeito mecânico. Fora da edição, a caixa do ajuste SHALL ser só de leitura.

#### Scenario: Maior base em destaque
- **WHEN** Prontidão tem base 3, com ajuste 3, e nenhuma outra perícia passa de 2
- **THEN** a base 3 de Prontidão aparece no selo, a caixa de ajuste mostra 3 e o total mostra "+6"

#### Scenario: Maior base empatada
- **WHEN** Briga e Esquiva têm base 2 e nenhuma outra perícia passa de 2
- **THEN** as duas bases aparecem no selo

#### Scenario: Nenhuma perícia treinada
- **WHEN** todas as perícias têm base 0
- **THEN** nenhuma base aparece no selo

#### Scenario: Fontes do total
- **WHEN** o jogador aciona a placa do total de Arcanismo
- **THEN** vê as fontes que somam o total e os modificadores situacionais à parte, como antes

### Requirement: Edição dos valores na folha
"Editar valores" SHALL trocar a base e o ajuste de cada perícia editável por campos nas mesmas caixas. O pé da folha SHALL ter "Cancelar" e "Salvar alterações (n)". Os limites da base, as mensagens de erro, o aviso de aprovação do Narrador e a gravação em lote SHALL ser os mesmos da tabela de atributos.

#### Scenario: Base acima do limite
- **WHEN** o jogador digita 6 na base de Esquiva do seu personagem
- **THEN** o campo é marcado com "Vai de 0 a 5; acima disso, use o ajuste." e o botão de salvar fica desativado

#### Scenario: Salvar em lote
- **WHEN** o jogador muda a base de Briga para 2 e o ajuste de Lábia para 1, e salva
- **THEN** as duas alterações são gravadas numa única operação, e a folha volta à leitura com os valores novos

### Requirement: Folha de Perícias em telas menores
A folha SHALL mostrar os três quadros lado a lado em telas largas, dois por linha em telas médias e um por linha em telas estreitas. No celular, a pintura do cabeçalho e os ornamentos que tomem espaço do conteúdo SHALL ser reduzidos ou omitidos. Nenhuma tela a partir de 360 pixels SHALL ter rolagem horizontal.

#### Scenario: Celular de 360 pixels
- **WHEN** a aba Perícias é aberta numa tela de 360 pixels
- **THEN** os quadros aparecem um abaixo do outro, com nome, base, ajuste e total legíveis em cada linha e sem rolagem horizontal

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
- Escola e Grau, nas magias, com o Grau pelo nome (Básica a Lendária); Disciplina e Grau, nas habilidades, só quando definidos;
- os campos do Framework preenchidos, na ordem da ficha de criação do Framework (Tipo, Lançamento, Combo, Persistência, Alcance, Forma, Alvo ou Área, Impactos, Duração, Efeito Principal, Efeitos Secundários, Efeitos Condicionais, Teste, Componentes, Limitações e Escalonamento); campos vazios SHALL NOT aparecer;
- Custo de aprendizado e Descansos mínimos, só para o Narrador;
- os custos adicionais, os requisitos (com o rótulo "Acesso" em habilidades e magias) e, só para o Narrador, o custo legado.

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

#### Scenario: Magia com campos do Framework
- **WHEN** o jogador abre uma magia Druídica com Alcance "15 metros", Forma "Círculo" e Teste preenchidos, e Combo vazio
- **THEN** a página da direita mostra Escola "Druídica", o Grau pelo nome e os quadros Alcance, Forma e Teste, sem quadro de Combo e sem Custo de aprendizado

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
