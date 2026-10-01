## MODIFIED Requirements

### Requirement: Alinhamento e Pecado Capital em listas fixas
A personalidade SHALL ter:
- **Alinhamento**: uma das 9 opções `Leal | Bom`, `Neutro | Bom`, `Caótico | Bom`, `Leal | Neutro`, `Neutro | Neutro`, `Caótico | Neutro`, `Leal | Mal`, `Neutro | Mal`, `Caótico | Mal`.
- **Pecado Capital**: uma das 7 opções Ira, Gula, Ganância, Luxúria, Inveja, Preguiça e Orgulho. As opções de escolha SHALL mostrar o ícone correspondente da ficha original. O valor escolhido SHALL aparecer só com o nome, porque a linha do campo já tem o ícone do tema do campo (decisão do usuário, 2026-09-29).

O servidor SHALL recusar valores fora dessas listas. A grafia antiga `Ganancia` SHALL ser aceita como equivalente a `Ganância`.

As listas de sexo, alinhamento e pecado (com os ícones e as grafias equivalentes) SHALL vir de um arquivo JSON de dados do sistema, lido pelo servidor e pela tela, e SHALL NOT ser repetidas em código. Elas são iguais para todas as mesas.

#### Scenario: Lista alterada no JSON
- **WHEN** o usuário troca no JSON o ícone do pecado Ira e salva o arquivo
- **THEN** as opções de escolha do pecado passam a mostrar o novo ícone para Ira, sem mudança de código

#### Scenario: Escolha de pecado
- **WHEN** o jogador escolhe o pecado Orgulho
- **THEN** a linha Pecado Capital mostra "Orgulho", sem o emoji, ao lado do ícone do campo

#### Scenario: Ficha migrada com grafia antiga
- **WHEN** o jogador abre uma ficha migrada com o pecado `Ganancia`
- **THEN** a ficha mostra "Ganância" sem aviso de valor inválido

### Requirement: Campos narrativos de personalidade
A personalidade SHALL ter os campos de texto Coisa favorita, O que odeia, Quando me veem pensam que, Manias ou hábitos, Vivo para, Meu lema, Medo ou fobia, Valor inquebrável, Religião ou crença, **Frase marcante** e **História**, além do campo **Traços**. Cada campo SHALL mostrar uma dica de preenchimento (a da ficha original, quando existia). Esses campos são narrativos e SHALL NOT ter efeito mecânico.

A **Frase marcante** SHALL ser um texto curto, de uma linha, com limite de caracteres definido no JSON. Ela é a fala ou o pensamento que resume o personagem.

Os **Traços** SHALL ser uma lista de palavras curtas, como "Leal" ou "Reservado". A quantidade máxima e o limite de caracteres de cada traço vêm do JSON (6 traços e 24 caracteres na primeira versão). O servidor SHALL recusar uma gravação que:
- passe da quantidade;
- tenha um traço vazio ou acima do limite;
- repita um traço, sem diferenciar maiúsculas e acentos.

A ordem escolhida pelo jogador SHALL ser preservada.

A História SHALL ser um texto longo, opcional, com quebras de parágrafo preservadas e limite de `4000` caracteres. O servidor SHALL recusar gravações acima do limite, informando-o.

A História SHALL ser um único campo da ficha. É o mesmo texto que o jogador escreve na etapa Personalidade da criação guiada, que ele edita na aba Personalidade e que o Resumo mostra. Uma alteração em qualquer um desses lugares SHALL aparecer nos outros dois.

A lista de campos, suas dicas, seus tipos (texto ou traços), qual deles é longo e os limites SHALL vir do mesmo JSON de dados do sistema das listas de personalidade.

#### Scenario: Dados migrados aparecem
- **WHEN** o jogador abre uma ficha migrada que tinha "Medo ou fobia: aranhas gigantes"
- **THEN** o campo Medo ou fobia mostra "aranhas gigantes"

#### Scenario: Campo vazio com dica
- **WHEN** o campo Vivo para está vazio
- **THEN** o campo mostra a dica "Ex: proteger os inocentes" sem gravá-la como valor

#### Scenario: Jogador escreve a História
- **WHEN** o jogador escreve dois parágrafos na História, na aba Personalidade, e salva
- **THEN** a ficha guarda o texto com a quebra de parágrafo, o histórico registra a alteração como "História" e o Resumo passa a mostrá-lo

#### Scenario: História acima do limite
- **WHEN** uma gravação tenta registrar uma História com `4001` caracteres
- **THEN** o sistema recusa a gravação e informa o limite de `4000` caracteres

#### Scenario: História na criação guiada
- **WHEN** o jogador está na etapa Personalidade do assistente de criação
- **THEN** a História aparece como campo opcional, com a mesma dica e o mesmo limite

#### Scenario: História escrita na criação aparece na ficha
- **WHEN** o jogador escreve "Veio de terras antigas." na História durante a criação guiada e conclui o personagem
- **THEN** a aba Personalidade mostra "Veio de terras antigas." no quadro História e o Resumo mostra o mesmo texto

#### Scenario: Jogador escreve a Frase marcante
- **WHEN** o jogador grava a Frase marcante "Conhecimento é a única arma que nunca podem me tirar."
- **THEN** a aba Personalidade mostra a frase como citação no topo e o histórico registra a alteração como "Frase marcante"

#### Scenario: Jogador define os Traços
- **WHEN** o jogador grava os traços "Leal", "Disciplinado", "Reservado" e "Idealista"
- **THEN** a aba Personalidade mostra as quatro etiquetas nessa ordem

#### Scenario: Traços demais pela API
- **WHEN** uma gravação tenta registrar 7 traços
- **THEN** o sistema recusa a gravação e informa o máximo de 6 traços

#### Scenario: Traço repetido
- **WHEN** uma gravação tenta registrar os traços "Leal" e "leal"
- **THEN** o sistema recusa a gravação e informa que o traço está repetido

#### Scenario: Frase e Traços na criação guiada
- **WHEN** o jogador está na etapa Personalidade do assistente de criação
- **THEN** a Frase marcante aparece como texto curto e os Traços como etiquetas que ele pode adicionar e remover, com os mesmos limites da ficha

#### Scenario: Ficha antiga sem os campos novos
- **WHEN** o jogador abre uma ficha criada antes desta mudança
- **THEN** a Frase marcante e os Traços aparecem vazios, com a dica, e a ficha não recebe aviso de valor inválido

## ADDED Requirements

### Requirement: Arrumação da aba Personalidade no JSON
O JSON de dados do sistema das listas de personalidade SHALL definir a arrumação da aba Personalidade:
- os **grupos**, cada um com título, subtítulo, emblema e a lista ordenada dos seus campos;
- o **ícone** de cada campo, por nome, escolhido de um conjunto de ícones da plataforma;
- qual campo ocupa a **citação** do topo e qual ocupa as **etiquetas** do topo.

Alinhamento e Pecado Capital SHALL poder entrar nos grupos como os demais campos. Os campos longos, como a História, SHALL ficar num quadro próprio, abaixo dos grupos.

O servidor SHALL recusar o catálogo, ao carregá-lo, quando:
- um grupo citar um campo que não existe;
- um campo aparecer em mais de um lugar;
- um campo curto ficar fora de todos os lugares;
- um ícone não estiver no conjunto conhecido.

#### Scenario: Campo trocado de grupo no JSON
- **WHEN** o usuário move "Medo ou fobia" do grupo "Traços e essência" para "Convicções e sombras" no JSON e reinicia a plataforma
- **THEN** a aba Personalidade mostra "Medo ou fobia" na coluna "Convicções e sombras", sem mudança de código

#### Scenario: Campo em dois grupos
- **WHEN** o JSON coloca "Meu lema" em dois grupos
- **THEN** o carregamento do catálogo falha com uma mensagem que nomeia o campo repetido

#### Scenario: Campo novo sem lugar
- **WHEN** o JSON ganha um campo curto que não está em nenhum grupo nem no topo
- **THEN** o carregamento do catálogo falha com uma mensagem que nomeia o campo

### Requirement: Aba Personalidade ornamentada
A aba Personalidade SHALL ser uma **cópia fiel** da imagem de referência do usuário (2026-09-29), guardada com a mudança, na largura dela (seção de 1098 pixels). Ela SHALL ter a mesma disposição, as mesmas proporções, a mesma paleta e tipografia, os mesmos ornamentos e os mesmos textos fixos:
- "QUEM É {NOME}";
- "Personalidade";
- "Traços, valores e marcas que definem o personagem.";
- "O passado que moldou o presente.";
- os títulos e subtítulos dos grupos, vindos do JSON.

A fidelidade SHALL ser medida por sobreposição com a referência:
- cada peça marcada no gabarito da mudança fica a no máximo 6 pixels da posição medida;
- o tamanho fica dentro de 8% nas caixas de texto e 4% nos quadros.

A aba SHALL usar a mesma técnica de moldura e ornamento do Resumo e do Inventário: pergaminho, molduras e cantos desenhados em SVG e CSS, e pinturas só como ilustração. Nenhuma moldura SHALL ser uma imagem.

A aba SHALL ter, de cima para baixo:
1. **Topo:** "QUEM É {NOME}", o título "Personalidade" e o subtítulo, a Frase marcante num quadro de citação, os Traços como etiquetas e a pintura da escrivaninha à direita.
2. **Grupos:** um quadro por grupo do JSON, com emblema, título e subtítulo. Cada campo é uma linha com o ícone do tema do campo, o rótulo, o valor e, para quem pode editar, o botão "Editar". Os dois quadros têm a mesma altura, e as linhas repartem essa altura. Nas telas largas, eles ficam lado a lado; nas estreitas, um abaixo do outro.
3. **História:** quadro largo com ícone, título, subtítulo, divisor, o texto com os parágrafos preservados e a pintura da pena e dos livros à direita.

Um campo vazio SHALL mostrar "Não informado" para quem só lê e a dica para quem pode editar. Um topo sem Frase marcante e sem Traços SHALL continuar com o título e a pintura, sem quadros vazios para quem só lê. Os avisos de valor fora da lista (alinhamento e pecado) SHALL continuar visíveis na linha do campo, com a ação "Vincular".

As pinturas SHALL ser decorativas (ignoradas pelo leitor de tela) e opcionais. Sem elas, a aba SHALL ficar completa com ornamentos em SVG, sem imagem quebrada e sem mudar o lugar dos campos.

A aba SHALL caber na largura da tela de 360 a 1920 pixels, sem rolagem horizontal da página. O título "Personalidade" SHALL aparecer uma única vez.

#### Scenario: Sobreposição com a referência
- **WHEN** a prévia da aba com o personagem Lion da referência é fotografada com a seção em 1098 pixels
- **THEN** o relatório de sobreposição mostra todas as peças do gabarito dentro das tolerâncias e gera o lado a lado, a sobreposição e a diferença para a revisão do usuário

#### Scenario: Linhas repartem a altura
- **WHEN** o grupo da esquerda tem 5 campos e o da direita tem 6
- **THEN** os dois quadros terminam na mesma altura e as 5 linhas da esquerda ficam mais altas que as 6 da direita

#### Scenario: Jogador abre a Personalidade de Lion
- **WHEN** o jogador abre a aba Personalidade de Lion, com a frase, quatro traços e todos os campos preenchidos, numa tela de 1440 pixels
- **THEN** ele vê o topo com "QUEM É LION", a citação e as etiquetas; as colunas "Traços e essência" e "Convicções e sombras" lado a lado, com um ícone e o botão "Editar" em cada linha; e o quadro História embaixo

#### Scenario: Ficha só de leitura
- **WHEN** um participante sem permissão de edição abre a aba Personalidade
- **THEN** ele vê os mesmos quadros sem nenhum botão "Editar", e os campos vazios mostram "Não informado"

#### Scenario: Celular
- **WHEN** o jogador abre a aba Personalidade num celular de 375 pixels
- **THEN** os grupos ficam um abaixo do outro, a pintura do topo encolhe ou sai sem cobrir texto e a página não rola na horizontal

#### Scenario: Pinturas indisponíveis
- **WHEN** as pinturas da escrivaninha e da História não carregam
- **THEN** a aba mostra os ornamentos em SVG no lugar delas, sem imagem quebrada, e os campos ficam no mesmo lugar

#### Scenario: Editar pela linha
- **WHEN** o jogador aperta "Editar" na linha "Vivo para", escreve "Proteger os inocentes" e salva
- **THEN** a linha mostra o novo valor e o histórico registra a alteração como "Vivo para"

#### Scenario: Leitor de tela
- **WHEN** um leitor de tela percorre a aba Personalidade
- **THEN** ele anuncia os títulos dos quadros, cada rótulo com seu valor e os botões "Editar {rótulo}", sem anunciar ícones, ornamentos ou pinturas
