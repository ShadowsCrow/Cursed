# Carga e Transporte

Tudo o que um personagem leva ocupa espaço numa **grade de carga**. Cada item tem um formato, e o jogador decide como encaixar o que leva: o que levar, como arrumar e o que abandonar. O que não cabe transborda para a **área vermelha** e deixa o personagem em **Sobrecarga**.

A carga em grade é jogada com a ficha digital da mesa, onde fica a grade de cada personagem.

## A grade

A grade representa **tudo o que o personagem leva**: o que está nas mãos, o que está vestido e o que está guardado. Não é uma mochila literal.

```
Linhas = 2 + Força atual
Colunas = conforme o Tamanho
```

|Tamanho|Colunas|
|---|---|
|Minúsculo|2|
|Pequeno|4|
|Médio|5|
|Grande|7|
|Enorme|9|
|Colossal|11|

Abaixo da grade existe sempre **uma linha vermelha extra**.

Exemplo: um personagem Médio com Força 3 tem uma grade de 5 colunas por 5 linhas, mais a linha vermelha.

Use o Tamanho do personagem: o da raça ou, se ele for fora da média, o Tamanho vizinho escolhido na criação (ver [Criação de Personagem](Cria%C3%A7%C3%A3o%20de%20Personagem.md)). Quando um efeito muda o Tamanho, vale o Tamanho atual enquanto o efeito durar.

### Força ou Tamanho reduzidos

A grade acompanha a Força atual e o Tamanho atual. Quando um deles diminui, as linhas ou colunas perdidas **ficam vermelhas** em vez de sumir: os itens que estavam nelas continuam lá, mas passam a causar Sobrecarga. Quando o efeito termina, elas voltam ao normal.

### Só é levado o que está na grade

Um item só conta como levado quando ocupa um lugar na grade. O que não foi colocado na grade não está com o personagem: não pode ser usado nem equipado e não conta na carga. Para levá-lo, é preciso abrir espaço e colocá-lo na grade.

## Itens

Cada item tem uma **dimensão** (largura × altura, em células) definida quando é criado. A dimensão nunca é estimada depois. Um peso aproximado pode aparecer na descrição do item, mas não tem efeito nas regras.

Itens podem ser **girados** em 90°. Dois itens nunca ocupam a mesma célula.

|Tipo|Subtipos|
|---|---|
|Armadura|peitoral, capacete, luvas, botas|
|Armas|uma mão, duas mãos|
|Escudo|—|
|Acessórios|mochila, aljava|
|Outros|itens que não se equipam, mas ocupam espaço|

### Dimensões de referência

São referências para criar itens; cada item pode ter outra dimensão.

|Item|Dimensão|
|---|---|
|Peitoral leve / pesado|2 × 2 / 2 × 3|
|Capacete, luvas|1 × 1|
|Botas|1 × 2|
|Arma de uma mão (adaga / espada)|1 × 2 / 1 × 3|
|Arma de duas mãos (arco / cajado, montante)|1 × 3 / 1 × 4|
|Escudo|2 × 2|
|Aljava|1 × 2|
|Odre, tocha|1 × 2|
|Provisões (3 dias)|2 × 1|
|Poção, ferramentas, bolsa de componentes|1 × 1|

### O que pode estar equipado ao mesmo tempo

No máximo **um peitoral, um capacete, um par de luvas, um par de botas, uma mochila e uma aljava**.

O personagem tem **duas mãos**:

- arma de uma mão ocupa uma;
- arma de duas mãos ocupa as duas;
- escudo ocupa uma;
- uma arma **versátil** ocupa uma ou duas mãos, conforme o jogador a empunhe naquele momento;
- itens do tipo Outros ocupam 0, 1 ou 2 mãos, conforme definido na criação (uma tocha acesa ocupa uma).

A soma nunca passa de duas mãos. Itens equipados continuam ocupando a grade.

### Armadura e RDB

A Armadura e o RDB do personagem vêm **somente do peitoral e do escudo**. Capacete, luvas e botas não dão Armadura nem RDB; eles só carregam os efeitos que cada um declarar.

### Pilhas

Itens do tipo Outros podem **empilhar** numa célula até o limite definido na criação (por exemplo, três poções). Os demais tipos não empilham.

### Moedas

As moedas são de três tipos: **cobre, prata e ouro**. Uma pilha de moedas ocupa uma célula e pode misturar tipos. Quantas moedas cabem numa pilha é uma **configuração da campanha**, definida pelo Narrador. Não há câmbio entre tipos de moeda.

## Ampliações

A grade cresce com:

- **Mochila equipada:** não ocupa célula e acrescenta linhas ou colunas. Tem Requisito de Força. Só uma mochila fica equipada por vez; uma mochila que não está equipada é um item como outro qualquer e ocupa o próprio tamanho.
- **Magias e habilidades:** declaram a ampliação no próprio texto (por exemplo, "+1 coluna" ou "grade extra de 2 × 2 enquanto durar").

Ampliações de fontes diferentes se somam; duas da mesma fonte não se somam: vale a maior.

Quando uma ampliação termina, os itens que estavam nela vão para a área vermelha e, se não couberem, para o chão.

**Largar a mochila** é uma interação livre. Os itens que estavam nas linhas ou colunas acrescentadas por ela vão para o chão junto com a mochila, como uma pilha que pode ser recuperada. Os itens da grade base continuam com o personagem.

### Mochilas de referência

|Mochila|Dimensão|Ampliação|Requisito de Força|
|---|---|---|---|
|Bolsa de cintura|1 × 1|+1 coluna|0|
|Mochila de viagem|2 × 2|+1 linha|2|
|Mochila de expedição|2 × 3|+2 linhas|3|
|Cesto de carga|3 × 3|+2 linhas e +1 coluna|4|

### Aljava

A aljava ocupa um tamanho fixo na grade, mesmo vazia, e guarda a quantidade de flechas indicada até a sua capacidade, definida quando ela é criada. As flechas dentro dela não ocupam células próprias.

## Acesso em combate

- **Equipado ou empunhado:** acesso imediato.
- **Qualquer outro item da grade:** pegá-lo custa uma Ação de Movimento numa Cena de Disputa.
- Reorganizar a grade é livre fora de cenas de tensão.
- Largar a mochila é uma interação livre.

## Sobrecarga

Qualquer item na **área vermelha** (a linha extra abaixo da grade, mais as linhas ou colunas perdidas por Força ou Tamanho reduzidos) coloca o personagem em **Sobrecarga**. Há um só nível de Sobrecarga.

|Efeito|Sobrecarga|
|---|---|
|Deslocamento|metade|
|Esquiva|-4|
|Correr|não pode|
|Saltar, escalar, nadar|não pode normalmente|
|Altura Segura|-2 m|
|Exaustão|+1 a cada 10 rodadas consecutivas agindo ou se movendo, ou a cada 30 minutos viajando|

A Sobrecarga termina assim que a área vermelha fica vazia, e a contagem de Exaustão recomeça do zero.

A Sobrecarga não reduz diretamente o Bloqueio. Suas penalidades acumulam com armaduras, Exaustão, terreno, condições e outros efeitos; não existe um limite geral para a soma.

Um item que não cabe nem na área vermelha **não pode ser levado**: precisa ser largado, arrastado ou dividido com outro personagem.

## Carregar uma criatura

Uma criatura carregada ocupa a grade de quem carrega como um item, com a dimensão do seu Tamanho:

|Tamanho|Sozinho|Com ajuda (cada carregador)|
|---|---|---|
|Minúsculo|2 × 3|2 × 2|
|Pequeno|3 × 4|3 × 2|
|Médio|4 × 5|4 × 3|
|Grande|5 × 7|5 × 4|

- O equipamento da criatura continua com ela e não é somado.
- **Com ajuda**, cada carregador leva metade da criatura: metade da altura, arredondada para cima.
- Uma criatura que não cabe nem com a área vermelha só pode ser **arrastada**: 1 m por ação inteira.
- **Soltar** a criatura é uma interação livre.

## Levantar, empurrar e arrastar objetos

- **Levantar:** o que cabe na grade, inclusive na área vermelha, o personagem ergue e leva sem teste. Para sustentar algo que não cabe na grade, faça `1d20 + Força + Esportes` contra CD 18 (CD 22 em condições desfavoráveis). Com sucesso, o personagem sustenta o objeto até o início do próximo turno, move-se no máximo 1 m e não pode Correr; para continuar sustentando, repete o teste.
- **Empurrar ou arrastar:** usa a ação inteira e move o objeto até 1 m. Em condições desfavoráveis, o Narrador pode pedir `Força + Esportes` contra CD 18, ou CD 22 em situações severas.
- **Pesado demais:** o Narrador decide quando um objeto está além do que uma pessoa consegue erguer ou arrastar; nesse caso, é preciso ajuda, ferramenta, habilidade ou magia.

### Trabalho em equipe

Um personagem faz o teste e recebe `+1` por ajudante, até o máximo de `+3`. Todos precisam alcançar o objeto e ter espaço e apoio para ajudar.

## Água profunda

Em água profunda, o personagem nada normalmente, a menos que o equipamento ou a carga o atrapalhem.

|Situação|Efeito|
|---|---|
|Sem Sobrecarga e sem arrasto|Natação normal|
|Vestindo peitoral pesado ou empunhando escudo|Natação prejudicada|
|Em Sobrecarga|Afundando|
|Em Sobrecarga vestindo peitoral pesado ou empunhando escudo|Afundamento Crítico|

Peitoral pesado é o de categoria Pesada. Um escudo guardado na grade, e não empunhado, não causa arrasto.

### Natação prejudicada

`-2` nos testes de natação, deslocamento aquático pela metade e não pode Correr ou usar equivalente aquático.

### Afundando

A cada rodada:

```
1d20 + Vigor + Esportes contra CD 18
```

- Sucesso: mantém a profundidade ou sobe 1 m.
- Falha: afunda 1 m.

O personagem não pode Esquivar e se move horizontalmente no máximo 1 m por ação.

### Afundamento Crítico

O personagem afunda automaticamente 3 m por rodada e não pode Esquivar.

Pode realizar:

```
1d20 + Força + Esportes contra CD 22
```

Em caso de sucesso, afunda apenas 1 m naquela rodada. Esse teste não permite subir.

### Equipamentos especiais na água

- **Hidrodinâmico:** não causa arrasto quando vestido ou empunhado.
- **Flutuante:** enquanto flutua, não causa Sobrecarga na água, mesmo que esteja na área vermelha.
- **Liberação Rápida:** pode ser removido ou largado em menos tempo que um equipamento comum.

### Água rasa

Enquanto o personagem consegue se apoiar no fundo, use as regras normais de Carga, somadas ao terreno e à correnteza. As regras de água profunda passam a valer quando ele precisa nadar.
