# Spec Delta

## MODIFIED Requirements

### Requirement: Resultado da rolagem
Ao escolher **Rolar**, a rolagem SHALL ser sorteada pelo servidor da aplicação, e não pelo navegador: cada dado de forma independente, com todas as faces de 1 até o número de faces igualmente prováveis, usando um gerador aleatório criptográfico. O d100 SHALL dar um valor de 1 a 100. O servidor SHALL recusar tipos de dado fora da lista, mais de 99 dados de um tipo, rolagem sem dados e modificador fora de −99 a +99. Só participantes da mesa, com a Sala ativa, SHALL poder rolar. Se o servidor não responder, a aba SHALL dizer que não foi possível rolar, e nada SHALL entrar no histórico.

O resultado SHALL mostrar o **total** em destaque (soma de todos os dados mais o modificador), a expressão rolada e o valor de cada dado, agrupado por tipo. O total SHALL ser anunciado a leitores de tela. A rolagem montada SHALL continuar montada depois de rolar, para poder rolar de novo. O resultado SHALL ficar no visor até a próxima rolagem ou até "Limpar".

A única leitura mecânica que o resultado SHALL trazer é a marca de crítico e de falha crítica nos d20, e só com o destaque de críticos ligado pelo Narrador (requisito "Destaque de críticos"). O resultado SHALL NOT trazer sucesso, falha comum, CD nem vantagem.

#### Scenario: Rolar 2d6 + 3
- **WHEN** o jogador monta `2d6 + 3`, rola, e os dados saem 4 e 6
- **THEN** o resultado mostra total 13, a expressão `2d6 + 3` e os valores 4 e 6 sob d6

#### Scenario: Faces sem viés
- **WHEN** o servidor sorteia um dado de N faces muitas vezes
- **THEN** todo valor sai entre 1 e N, por um sorteio uniforme do gerador criptográfico

#### Scenario: Rolagem forjada não é aceita
- **WHEN** alguém pede ao servidor uma rolagem de 1d7, ou de 100d20, ou com modificador 150
- **THEN** o servidor recusa o pedido e nenhuma rolagem é guardada

#### Scenario: Servidor fora do ar
- **WHEN** o jogador escolhe "Rolar" e o servidor não responde
- **THEN** a aba avisa que não foi possível rolar, e o histórico não muda

#### Scenario: Rolar de novo a mesma montagem
- **WHEN** o jogador rola `1d20` e escolhe "Rolar" outra vez
- **THEN** sai um novo resultado de `1d20`, sem precisar montar a rolagem de novo

#### Scenario: Sem destaque, sem leitura
- **WHEN** o destaque de críticos está desligado e o jogador tira 20 natural num d20
- **THEN** o resultado mostra só o 20 e o total, sem marca de crítico

## ADDED Requirements

### Requirement: Destaque de críticos
O servidor SHALL avaliar cada d20 de cada rolagem no momento em que a sorteia:
- um valor natural **igual ou maior** que o início da faixa de crítico é **crítico**;
- um valor natural **igual ou menor** que o fim da faixa de falha crítica é **falha crítica**.

Quando um valor cai nas duas faixas, ele SHALL contar só como crítico.

A faixa vem do personagem:
- numa rolagem pela ficha, vale a faixa daquele personagem, definida na capacidade `catalogo-de-classes-e-racas`;
- numa rolagem sem ficha, vale a faixa padrão das regras: crítico em 20 e falha crítica em 1.

Outros tipos de dado, inclusive o d100, SHALL NOT receber marca. A marca SHALL ficar guardada com a rolagem: mudar o catálogo depois não muda rolagens antigas.

Com o destaque de críticos ligado pelo Narrador (aba Mestre), toda pessoa que recebe a rolagem SHALL ver o destaque:
- no visor e no histórico da aba Dados, o d20 marcado com o selo "Crítico" ou "Falha crítica";
- com a animação ligada, o dado 3D marcado brilhando ao parar, dourado no crítico e rubro na falha crítica, e uma faixa curta "Crítico!" ou "Falha crítica!" sobre o tabuleiro, que some sozinha em poucos segundos;
- para leitores de tela, o anúncio do total acrescido de "crítico" ou "falha crítica".

Com o destaque desligado, as marcas SHALL NOT ir aos navegadores, e nada SHALL ser destacado.

As faixas de cada personagem SHALL NOT ser mostradas nem enviadas aos navegadores dos jogadores. O destaque segue as regras de quem vê cada rolagem: rolagens ocultas do Narrador e a escolha "Só as minhas" continuam valendo.

#### Scenario: 20 natural com o destaque ligado
- **WHEN** o destaque está ligado e Lion, sem ampliação de faixa, rola `1d20 + Destreza` pela ficha e tira 20
- **THEN** toda a mesa vê o d20 brilhar dourado, a faixa "Crítico!" aparece no tabuleiro, e o histórico marca o d20 como "Crítico"

#### Scenario: Faixa ampliada pelo catálogo
- **WHEN** o destaque está ligado e o personagem tem uma habilidade do catálogo que amplia o crítico em 1, e tira 19 natural numa rolagem pela ficha
- **THEN** o d20 é destacado como crítico, sem que nenhum jogador veja qual é a faixa do personagem

#### Scenario: Mesmo 19 sem ficha
- **WHEN** o mesmo jogador rola `1d20` sem escolher ficha e tira 19
- **THEN** não há destaque, porque sem ficha vale a faixa padrão

#### Scenario: Falha crítica
- **WHEN** o destaque está ligado e um jogador tira 1 natural num d20
- **THEN** o d20 brilha rubro e a faixa "Falha crítica!" aparece no tabuleiro

#### Scenario: Vários d20
- **WHEN** o destaque está ligado e alguém rola `2d20` e tira 20 e 7
- **THEN** só o d20 que tirou 20 recebe a marca de crítico

#### Scenario: d100 não é marcado
- **WHEN** o destaque está ligado e alguém tira 100 num d100
- **THEN** não há marca de crítico

#### Scenario: Destaque desligado não vaza
- **WHEN** o destaque está desligado e alguém tira 20 num d20
- **THEN** a resposta do servidor não traz marca, e nada é destacado

#### Scenario: Ligar o destaque depois
- **WHEN** um 20 foi tirado com o destaque desligado e o Narrador o liga em seguida
- **THEN** o histórico passa a mostrar a marca daquela rolagem, que foi guardada no momento em que ela foi sorteada
