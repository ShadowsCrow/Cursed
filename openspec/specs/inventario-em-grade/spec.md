# Inventário em grade

## Purpose

Oferecer na plataforma o inventário em grade interativo que executa a regra de carga (a regra só funciona com o site), com validação no servidor, sobrecarga automática, criação de itens com formato e imagens, moedas, corpos genéricos como itens padrão e trocas na sala.

## Requirements

### Requirement: Protótipo de calibração
Antes de fixar os números da regra, a plataforma SHALL oferecer uma página de teste da grade que funcione sem mesa nem servidor. Nela deve ser possível escolher Força e Tamanho, equipar mochilas, montar kits prontos (guerreiro, mago, ladino, carregar companheiro), criar itens com dimensão livre, arrastar, girar e ver a sobrecarga. Os números aprovados no protótipo SHALL ser registrados antes de a regra ser escrita.

#### Scenario: Testar um kit
- **WHEN** o usuário escolhe Médio, Força 3 e o kit de guerreiro no protótipo
- **THEN** a grade mostra os itens do kit encaixados e informa se há sobrecarga

### Requirement: Grade interativa acessível
A grade SHALL permitir colocar, mover e girar itens com mouse, toque e teclado. Pelo teclado: selecionar o item, mover com as setas, girar com uma tecla, confirmar e cancelar. Cada movimento SHALL ser anunciado a leitores de tela.

A área vermelha SHALL aparecer hachurada, com sinal de alerta, e SHALL NOT usar cadeado, porque ela aceita itens. Itens equipados SHALL ter borda dourada e um marcador "equipado", sem depender só da cor. O item selecionado SHALL ter destaque próprio, diferente do de equipado.

Mover SHALL continuar sendo feito arrastando ou pelo teclado a partir do próprio item, e SHALL NOT existir um botão "Mover".

#### Scenario: Mover pelo teclado
- **WHEN** o jogador foca uma poção, pressiona Enter, pressiona a seta para a direita e confirma
- **THEN** a poção vai uma célula para a direita e o leitor de tela anuncia a nova posição

#### Scenario: Grade no celular
- **WHEN** o jogador abre a grade num celular de 400 px de largura
- **THEN** uma grade de até 8 colunas cabe sem rolagem horizontal

#### Scenario: Área vermelha
- **WHEN** a grade é exibida com a linha vermelha vazia
- **THEN** as células vermelhas aparecem hachuradas, com sinal de alerta e sem cadeado, e o jogador pode soltar um item nelas

### Requirement: Empunhadura de arma versátil
A criação e a definição de formato de uma arma de uma mão SHALL permitir marcá-la como versátil. Uma arma versátil SHALL ter uma ação para alternar entre empunhá-la com uma mão e com as duas; o servidor SHALL validar as mãos, gravar a empunhadura com a arrumação e registrar a troca no histórico. Armas que não são versáteis SHALL NOT aceitar a troca.

#### Scenario: Alternar para as duas mãos
- **WHEN** o jogador seleciona uma espada versátil equipada, com a outra mão livre, e escolhe "Empunhar com duas mãos"
- **THEN** a grade passa a contar duas mãos ocupadas, o leitor de tela anuncia a empunhadura e o histórico registra "empunhada com duas mãos"

#### Scenario: Arma comum
- **WHEN** um pedido de arrumação tenta mudar as mãos de uma arma que não é versátil
- **THEN** o servidor recusa sem alterar a grade

### Requirement: Dica da regra de levantar e arrastar
A grade SHALL mostrar junto ao resumo um botão de informação "(i)" que, ao passar o mouse, focar pelo teclado ou tocar, exibe a regra de levantar, empurrar e arrastar objetos e o trabalho em equipe, para jogadores e Narrador. A dica SHALL caber na tela também no celular.

#### Scenario: Consultar a regra
- **WHEN** o jogador passa o mouse ou foca o "(i)" da grade
- **THEN** aparece a regra com o teste `1d20 + Força + Esportes` contra CD 18 e o bônus de +1 por ajudante até +3

### Requirement: Servidor como autoridade
O servidor SHALL validar a posição, a rotação, a sobreposição, os limites, o que pode estar equipado e as mãos ocupadas a cada gravação da grade. A arrumação SHALL ser gravada de uma vez, com versão. Um rascunho local SHALL proteger contra queda de conexão no meio da organização. Arrumações inválidas SHALL ser recusadas sem gravar nada. Colocar um item na grade e retirá-lo para a bandeja SHALL gerar evento no Registro, com o item e o sentido do movimento; mover itens dentro da grade SHALL NOT gerar evento.

#### Scenario: Conexão cai durante a arrumação
- **WHEN** a conexão cai enquanto o jogador reorganiza a grade
- **THEN** o rascunho continua na tela e é enviado quando a conexão volta, ou é descartado se a grade mudou em outro lugar

#### Scenario: Registro da bandeja
- **WHEN** o jogador tira o capuz da grade e depois o coloca de volta
- **THEN** o Registro mostra "Capuz retirado para a bandeja" e "Capuz colocado na grade"

### Requirement: Sobrecarga automática
Quando algum item estiver na área vermelha, a ficha SHALL mostrar o efeito "Sobrecarga", com origem e ícone próprios, e aplicar suas consequências aos valores derivados. O efeito SHALL sair sozinho quando a área vermelha ficar vazia.

#### Scenario: Esvaziar a área vermelha
- **WHEN** o jogador tira da área vermelha o último item
- **THEN** o efeito Sobrecarga some e o deslocamento e a Esquiva voltam ao normal

### Requirement: Criação de item com formato e imagens
A criação de item SHALL pedir tipo, subtipo, dimensão e **raridade**, com prévia na grade e opção de girar. Conforme o tipo, também SHALL pedir:
- limite de pilha, mãos ocupadas e **categoria** (Outros);
- ampliação e Requisito de Força (mochila);
- capacidade de flechas (aljava).

A definição de formato de um item existente SHALL pedir as mesmas informações.

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

### Requirement: Itens sem dimensão
Itens existentes sem dimensão SHALL ficar numa bandeja "Sem dimensão", fora da grade e fora do cálculo, até o Narrador defini-la. O sistema SHALL NOT converter peso em dimensão.

#### Scenario: Ficha migrada
- **WHEN** o Narrador abre uma ficha migrada com itens que tinham peso
- **THEN** os itens aparecem na bandeja "Sem dimensão" com o peso antigo como descrição

### Requirement: Moedas na plataforma
A mesa SHALL ter a configuração "moedas por pilha", editável pelo Narrador. A pilha de moedas SHALL mostrar o total de cobre, prata e ouro e permitir dividir e juntar pilhas.

Adicionar e retirar moedas SHALL dispensar a escolha da pilha:
- ao adicionar, as moedas enchem as pilhas com espaço, na ordem da grade, e o resto vira pilha nova;
- ao retirar, saem das últimas pilhas (fora da grade e área vermelha primeiro), e a pilha que zera some.

Nenhuma pilha muda de lugar, e o editor volta a zero depois de cada operação confirmada. Se o limite diminuir, as moedas que não couberem SHALL ir para a área vermelha, sem perda.

Na aba Inventário, as moedas SHALL aparecer numa barra com o ícone e o total de cada tipo, e SHALL abrir o editor de totais para quem pode editar.

#### Scenario: Adicionar moedas
- **WHEN** a mesa usa 100 moedas por pilha, o personagem tem uma pilha com 40 de cobre e 30 de prata e adiciona 80 de prata e 5 de ouro
- **THEN** a pilha passa a 40 de cobre e 60 de prata, uma pilha nova recebe 50 de prata e 5 de ouro, e o editor volta a zero

#### Scenario: Narrador reduz o limite
- **WHEN** o Narrador muda o limite de 100 para 50 moedas por pilha
- **THEN** as pilhas passam a precisar de mais células, e o que não couber vai para a área vermelha

#### Scenario: Barra de moedas
- **WHEN** o personagem tem 24 de ouro, 17 de prata e 3 de cobre
- **THEN** a barra de moedas mostra os três tipos com esses totais

### Requirement: Corpos genéricos como itens padrão
Cada mesa SHALL ter sempre oito cartas de item padrão de corpo, publicadas e criadas pelo sistema: um corpo inteiro e um corpo "com ajuda" para cada Tamanho carregável, com as dimensões da regra (Minúsculo 2 x 3 e 2 x 2, Pequeno 3 x 4 e 3 x 2, Médio 4 x 5 e 4 x 3, Grande 5 x 7 e 5 x 4). O Narrador SHALL poder conceder um corpo a qualquer personagem, como qualquer carta de item, e SHALL NOT poder editá-las nem arquivá-las. Garantir as cartas SHALL NOT duplicá-las. Não há ação de carregar sobre o token, e mover os tokens continua manual.

#### Scenario: Levar um companheiro desmaiado
- **WHEN** o jogador pede para carregar um companheiro Médio e o Narrador lhe concede o "Corpo Médio"
- **THEN** o corpo 4 x 5 entra no inventário do personagem e passa a ocupar a grade quando colocado

#### Scenario: Carregar com ajuda
- **WHEN** dois personagens carregam juntos um companheiro Médio
- **THEN** o Narrador concede a cada um o "Corpo Médio (com ajuda)", de 4 x 3

#### Scenario: Catálogo de uma mesa nova
- **WHEN** o Narrador abre a biblioteca de uma mesa recém-criada
- **THEN** os oito corpos já estão publicados, uma única vez cada

### Requirement: Chão, baú e trocas
A sala SHALL ter grades compartilhadas de chão e baú por cena. Os jogadores SHALL poder arrastar itens delas para a própria grade, e os itens largados SHALL ir para o chão. Um jogador SHALL poder oferecer um item a outro personagem, que aceita e escolhe onde encaixá-lo. O Narrador SHALL ver todas as grades.

#### Scenario: Saque disputado
- **WHEN** dois jogadores arrastam o mesmo item do baú ao mesmo tempo
- **THEN** só o primeiro pedido confirmado leva o item, e o outro vê que ele não está mais disponível

### Requirement: Inventário numa bolsa que acompanha a grade
A aba Inventário SHALL mostrar a grade dentro de uma bolsa de couro ornamentada que se ajusta a qualquer tamanho de grade: de 2 a 11 colunas mais ampliações, e de 3 a 7 linhas mais mochila e linha vermelha. Na bolsa:
- as bordas e os cantos SHALL acompanhar o tamanho sem distorção;
- a grade SHALL ficar entre duas laterais pintadas, uma de cada lado, que acompanham a altura da bolsa sem distorcer: topo e base inteiros e o miolo repetido. No celular, as laterais SHALL ficar mais finas. Sem as pinturas, a bolsa SHALL usar a alça e os ornamentos em CSS/SVG;
- no alto, a tampa aberta da bolsa SHALL aparecer centralizada, atrás da bolsa, sem esticar; no pé, uma base de couro SHALL acompanhar a largura da bolsa sem distorcer, com as pontas inteiras e o miolo repetido. Nenhuma das duas SHALL cobrir células; sem as pinturas, o alto e o pé SHALL ficar com a costura em SVG;
- a célula SHALL crescer ou encolher com o espaço disponível, com um tamanho máximo para grades pequenas.

A disposição SHALL se adaptar à largura:
- **largo:** bolsa, painel do item e categorias lado a lado;
- **intermediário:** categorias numa fileira acima da grade;
- **celular:** tudo empilhado.

A grade SHALL continuar cabendo no celular conforme o requisito de grade acessível. Grades maiores que isso SHALL rolar na horizontal só dentro da bolsa, com indicação visual de que há mais.

#### Scenario: Grade pequena
- **WHEN** um personagem Minúsculo de Força 1 abre o Inventário numa tela de 1440 pixels
- **THEN** a grade de 2 x 3 aparece com células grandes dentro da bolsa estreita, com os indicadores empilhados no topo dela, entre as duas laterais

#### Scenario: Laterais acompanham a grade
- **WHEN** um personagem Colossal de Força 5 com mochila abre o Inventário, com as pinturas das laterais disponíveis
- **THEN** cada lateral cobre toda a altura da bolsa, com o topo e a base inteiros e o miolo repetido, sem cobrir nenhuma célula

#### Scenario: Laterais sem pintura
- **WHEN** as pinturas das laterais não existem ou não carregam
- **THEN** a bolsa aparece com a alça, a fivela e o pingente em CSS/SVG, sem imagem quebrada

#### Scenario: Grade enorme
- **WHEN** um personagem Colossal de Força 5 com mochila abre o Inventário numa tela de 1280 pixels
- **THEN** a grade inteira aparece sem rolagem da página, e as categorias passam para uma fileira acima da grade

#### Scenario: Celular
- **WHEN** um personagem Médio de Força 3 abre o Inventário num celular de 375 pixels
- **THEN** indicadores, categorias, bolsa, painel do item e moedas aparecem empilhados, sem rolagem horizontal da página

### Requirement: Indicadores da carga sem peso
A bolsa SHALL mostrar:
- a capacidade (células ocupadas de células verdes), com barra;
- as mãos ocupadas de duas;
- o estado da carga, "Normal" ou "Sobrecarga", escrito e com a quantidade de células na área vermelha quando houver.

A aba SHALL NOT mostrar peso de nenhum tipo.

#### Scenario: Personagem em sobrecarga
- **WHEN** duas células de itens estão na área vermelha
- **THEN** o indicador de estado mostra "Sobrecarga" e "2 na área vermelha"

#### Scenario: Sem peso
- **WHEN** o jogador abre o Inventário de qualquer personagem
- **THEN** nenhum valor em quilos ou peso aparece na aba

### Requirement: Painel do item selecionado
Ao selecionar um item, da grade ou de fora dela, a aba SHALL mostrar um painel com:
- a arte ou o ícone do item;
- o nome e as etiquetas de raridade e categoria;
- tipo e subtipo, dimensão atual (considerando a rotação), mãos, quantidade e limite de pilha, cargas e se está equipado, quando aplicáveis;
- a descrição, quando houver;
- os efeitos do item, só como texto.

As ações disponíveis SHALL ser, conforme permissão e situação:
- **Equipar** ou **Desequipar**, como ação principal;
- Empunhar com uma ou duas mãos, nas armas versáteis;
- **Girar**;
- **Largar no chão**;
- **Remover da grade**;
- **Oferecer**.

SHALL NOT existir ação de usar ou consumir o item. Sem item selecionado, o painel SHALL dizer como selecionar um.

#### Scenario: Selecionar uma poção
- **WHEN** o jogador toca na "Poção de Vida Menor", Comum, categoria Consumíveis, com 3 unidades
- **THEN** o painel mostra a imagem, o nome, as etiquetas "Comum" e "Consumíveis", "3 unidades", a descrição e os efeitos em texto, sem botão de usar

#### Scenario: Remover da grade
- **WHEN** o jogador escolhe "Remover da grade" num item selecionado
- **THEN** o item vai para "Fora da grade" e o Registro mostra que ele foi retirado para a bandeja

#### Scenario: Ficha só de leitura
- **WHEN** alguém sem permissão de edição seleciona um item
- **THEN** o painel mostra as informações do item e nenhuma ação

### Requirement: Categorias e busca que destacam
A aba SHALL listar as categorias com a contagem de itens de cada uma e a opção "Todos". SHALL também oferecer uma busca pelo nome. Escolher uma categoria ou buscar SHALL destacar na grade os itens correspondentes e esmaecer os demais, sem escondê-los, sem mudá-los de lugar e sem bloquear a interação com eles. O número de itens correspondentes SHALL ser anunciado a leitores de tela. SHALL NOT existir opção de ordenar o inventário.

#### Scenario: Filtrar Armas
- **WHEN** o jogador escolhe a categoria "Armas" com uma adaga e uma aljava na grade
- **THEN** a adaga aparece destacada, a aljava esmaecida no mesmo lugar, e o leitor de tela anuncia "1 item em Armas"

#### Scenario: Buscar
- **WHEN** o jogador digita "poç" na busca
- **THEN** as poções ficam destacadas e o resto esmaecido, e limpar a busca devolve a grade ao normal

### Requirement: Raridade e categoria do item
Todo item SHALL ter uma raridade entre Comum, Incomum, Raro, Épico e Lendário, e uma categoria:
- Armas, Armaduras, Escudos e Acessórios SHALL vir do tipo do item;
- itens do tipo Outros SHALL ter uma categoria escolhida pelo Narrador entre Consumíveis, Materiais, Chaves, Itens de Missão e Diversos;
- as moedas SHALL ter a categoria Moedas, e os corpos carregados (subtipo criatura), a categoria Criaturas.

A raridade SHALL aparecer como etiqueta com nome escrito e cor própria, sem efeito mecânico. As listas, os rótulos e as cores SHALL vir de um catálogo de dados editável, e não do código. Itens existentes SHALL passar a Comum, e os itens Outros existentes à categoria Diversos.

#### Scenario: Item antigo
- **WHEN** o jogador abre o Inventário com uma corda criada antes desta mudança
- **THEN** a corda aparece como Comum, na categoria Diversos

#### Scenario: Espada
- **WHEN** o Narrador cria uma espada de uma mão
- **THEN** a categoria é Armas sem precisar escolher, e só a raridade é pedida

### Requirement: Descrição do item concedido
Ao conceder um item a partir de uma carta, o texto da carta SHALL acompanhar o item como descrição. Itens já concedidos antes desta mudança SHALL receber o texto da carta de origem, quando ela existir.

#### Scenario: Carta de poção concedida
- **WHEN** o Narrador concede a carta "Poção de Vida Menor", cujo texto é "Uma poção de cor rubra…"
- **THEN** o painel do item mostra esse texto como descrição

### Requirement: Retirada da platina
Na atualização desta mudança:
- as moedas de platina SHALL ser retiradas de todas as pilhas, e a pilha que ficar vazia SHALL sumir;
- cada ficha afetada SHALL ganhar um evento no histórico com a quantidade retirada;
- o Narrador SHALL ver na ficha um aviso de que a platina foi retirada, com a quantidade, para compensar se quiser.

Nenhuma moeda de platina SHALL ser convertida em outro tipo.

#### Scenario: Ficha com platina
- **WHEN** a atualização encontra uma ficha com uma pilha de 10 de ouro e 5 de platina
- **THEN** a pilha fica com 10 de ouro, o histórico registra "5 moedas de platina retiradas (a platina deixou de existir)", e o Narrador vê o aviso na ficha

#### Scenario: Pilha só de platina
- **WHEN** a atualização encontra uma pilha com apenas 8 de platina
- **THEN** a pilha some da grade e o histórico registra as 8 moedas retiradas
