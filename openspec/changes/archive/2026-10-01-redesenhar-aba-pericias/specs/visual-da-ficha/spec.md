## ADDED Requirements

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
