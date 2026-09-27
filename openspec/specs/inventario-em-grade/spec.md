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
A grade SHALL permitir colocar, mover e girar itens com mouse, toque e teclado. Pelo teclado: selecionar o item, mover com as setas, girar com uma tecla, confirmar e cancelar. Cada movimento SHALL ser anunciado a leitores de tela. A área vermelha SHALL ser destacada. Itens equipados SHALL ter borda dourada e um marcador "equipado", sem depender só da cor.

#### Scenario: Mover pelo teclado
- **WHEN** o jogador seleciona uma poção, pressiona a seta para a direita e confirma
- **THEN** a poção vai uma célula para a direita e o leitor de tela anuncia a nova posição

#### Scenario: Grade no celular
- **WHEN** o jogador abre a grade num celular de 400 px de largura
- **THEN** uma grade de até 8 colunas cabe sem rolagem horizontal

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
A criação de item SHALL pedir tipo, subtipo e dimensão, com prévia na grade e opção de girar. Conforme o tipo, também SHALL pedir:
- limite de pilha e mãos ocupadas (Outros);
- ampliação e Requisito de Força (mochila);
- capacidade de flechas (aljava).

O item SHALL aceitar duas imagens: a arte e o ícone de grade. O sistema SHALL avisar quando a proporção do ícone não corresponder à dimensão. Sem ícone de grade, a arte SHALL ser encaixada no formato com moldura; sem arte, SHALL aparecer uma silhueta com o nome.

#### Scenario: Ícone fora de proporção
- **WHEN** o Narrador envia um ícone quadrado para um item 1 x 3
- **THEN** o sistema avisa da proporção e permite continuar

### Requirement: Itens sem dimensão
Itens existentes sem dimensão SHALL ficar numa bandeja "Sem dimensão", fora da grade e fora do cálculo, até o Narrador defini-la. O sistema SHALL NOT converter peso em dimensão.

#### Scenario: Ficha migrada
- **WHEN** o Narrador abre uma ficha migrada com itens que tinham peso
- **THEN** os itens aparecem na bandeja "Sem dimensão" com o peso antigo como descrição

### Requirement: Moedas na plataforma
A mesa SHALL ter a configuração "moedas por pilha", editável pelo Narrador. A pilha de moedas SHALL mostrar o total por tipo e permitir dividir e juntar pilhas. Adicionar e retirar moedas SHALL dispensar a escolha da pilha: ao adicionar, as moedas enchem as pilhas com espaço, na ordem da grade, e o resto vira pilha nova; ao retirar, saem das últimas pilhas (fora da grade e área vermelha primeiro), e a pilha que zera some. Nenhuma pilha muda de lugar, e o editor volta a zero depois de cada operação confirmada. Se o limite diminuir, as moedas que não couberem SHALL ir para a área vermelha, sem perda.

#### Scenario: Adicionar moedas
- **WHEN** a mesa usa 100 moedas por pilha, o personagem tem uma pilha com 40 de cobre e 30 de prata e adiciona 80 de prata e 5 de ouro
- **THEN** a pilha passa a 40 de cobre e 60 de prata, uma pilha nova recebe 50 de prata e 5 de ouro, e o editor volta a zero

#### Scenario: Narrador reduz o limite
- **WHEN** o Narrador muda o limite de 100 para 50 moedas por pilha
- **THEN** as pilhas passam a precisar de mais células, e o que não couber vai para a área vermelha

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
