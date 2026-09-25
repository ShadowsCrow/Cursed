# Apêndice A — Carga e Transporte

## A.1. Referência rápida

### Capacidade de Carga

```
CC = Força × 20 kg × Modificador de Tamanho
```

|Tamanho|Modificador|
|---|---|
|Minúsculo|×0,50|
|Pequeno|×0,75|
|Médio|×1,00|
|Grande|×2,00|
|Enorme|×3,00|
|Colossal|×5,00|

### Faixas de Carga

|Faixa|Limite|
|---|---|
|Carga Normal|Até 100% da CC|
|Carga Excedente|Acima de 100% até 150%|
|Excesso Crítico|Acima de 150%|

### Efeitos

|Faixa|Deslocamento|Esquiva|Correr|Altura Segura|
|---|---|---|---|---|
|Normal|Normal|Normal|Sim|Sem penalidade|
|Excedente|-3 m|-2|Não|-1 m|
|Excesso Crítico|1 m por ação|Não pode|Não|-2 m|

---

## A.2. Exemplo — Personagem Médio

Um personagem Médio possui Força 3.

```
CC = 3 × 20 × 1CC = 60 kg
```

Seu limite de Carga Excedente é:

```
60 × 1,5 = 90 kg
```

Portanto:

- até `60 kg`: Carga Normal;
- acima de `60 kg` até `90 kg`: Carga Excedente;
- acima de `90 kg`: Excesso Crítico.

O personagem está carregando:

|Item|Peso|
|---|---|
|Armadura|15 kg|
|Arma|4 kg|
|Escudo|5 kg|
|Mochila e suprimentos|28 kg|
|Tesouro|18 kg|
|**Total**|**70 kg**|

Com `70 kg`, o personagem está em Carga Excedente.

Ele sofre:

- `-3 m` de deslocamento;
- `-2` em Esquiva;
- não pode Correr;
- `-1 m` na Altura Segura.

---

## A.3. Exemplo — Personagem Pequeno

Um personagem Pequeno possui Força 3.

```
CC = 3 × 20 × 0,75CC = 45 kg
```

Seu limite de 150% é:

```
45 × 1,5 = 67,5 kg
```

Como os limites são arredondados para baixo:

```
Limite = 67 kg
```

Portanto:

- até `45 kg`: Carga Normal;
- de `45,5 kg` até `67 kg`: Carga Excedente;
- acima de `67 kg`: Excesso Crítico.

Caso carregue `50 kg`, estará em Carga Excedente mesmo que um personagem Médio com a mesma Força pudesse carregar esse peso sem penalidades.

---

## A.4. Exemplo — Criatura Grande

Uma criatura Grande possui Força 6.

```
CC = 6 × 20 × 2CC = 240 kg
```

Seu limite de 150% é:

```
240 × 1,5 = 360 kg
```

Portanto:

- até `240 kg`: Carga Normal;
- acima de `240 kg` até `360 kg`: Carga Excedente;
- acima de `360 kg`: Excesso Crítico.

Uma montaria carregando cavaleiro, sela, armadura e equipamentos com peso total de `300 kg` está em Carga Excedente.

---

## A.5. Alterações temporárias de Força

A CC é recalculada imediatamente quando a Força mudar.

Um personagem Médio com Força 3 possui:

```
CC = 60 kg
```

Ele está carregando `55 kg`, permanecendo em Carga Normal.

Uma condição reduz sua Força para 2:

```
Nova CC = 2 × 20Nova CC = 40 kg
```

Com `55 kg`, o personagem passa imediatamente para Carga Excedente.

Caso sua Força seja reduzida para 1:

```
Nova CC = 20 kgLimite de 150% = 30 kg
```

Com os mesmos `55 kg`, ele entra em Excesso Crítico.

Quando o efeito terminar, sua CC volta ao valor normal.

---

## A.6. Alterações de Tamanho

Mudanças de Tamanho também recalculam imediatamente a CC.

Um personagem com Força 3 e Tamanho Médio possui:

```
CC = 60 kg
```

Caso uma transformação aumente seu Tamanho para Grande:

```
CC = 3 × 20 × 2CC = 120 kg
```

Caso ele volte ao Tamanho Médio, sua CC retorna para `60 kg`.

Os equipamentos não mudam automaticamente de peso, salvo quando a transformação ou efeito declarar isso.

---

## A.7. Carregar outra criatura

Uma criatura carregada conta como:

```
Peso corporal + Carga Atual da criatura
```

Uma criatura pesa `70 kg` e possui:

|Equipamento|Peso|
|---|---|
|Armadura|10 kg|
|Armas|4 kg|
|Mochila|8 kg|
|**Carga Atual**|**22 kg**|

Seu peso total para quem a carregar será:

```
70 + 22 = 92 kg
```

Se a criatura largar a mochila de `8 kg`:

```
Peso transportado = 84 kg
```

Carregar a criatura nos braços, costas ou ombros utiliza as faixas normais de Carga.

Arrastá-la utiliza as regras de Empurrar e Arrastar.

---

## A.8. Levantar peso acima da CC

Um personagem possui CC de `60 kg`.

Ele tenta levantar uma pedra de `100 kg`.

Como o peso está entre sua CC e `2 × CC`:

```
Limite máximo = 60 × 2Limite máximo = 120 kg
```

Ele pode tentar:

```
1d20 + Força + Esportes contra CD 18
```

Em caso de sucesso:

- levanta a pedra;
- sustenta o peso até o início do próximo turno;
- move-se no máximo `1 m`;
- não pode Correr;
- precisa repetir o teste caso continue sustentando-a.

Em caso de falha:

- não consegue levantá-la; ou
- precisa soltá-la caso já estivesse sustentando-a.

Uma pedra de `130 kg` está acima de `2 × CC` e não pode ser levantada sem ajuda, ferramenta, magia ou habilidade.

---

## A.9. Condições difíceis para levantamento

A CD pode aumentar de `18` para `22` quando houver dificuldades relevantes.

Exemplos:

- objeto sem ponto adequado para segurar;
- terreno instável;
- necessidade de manter equilíbrio;
- personagem ferido;
- objeto escorregadio;
- vento forte;
- peso se movendo;
- necessidade de levantar acima da cabeça.

A dificuldade representa a situação, não apenas o peso.

---

## A.10. Empurrar e arrastar

Um personagem com CC de `60 kg` pode empurrar ou arrastar até:

```
60 × 5 = 300 kg
```

Em superfície favorável, ele pode mover o objeto até `1 m` usando sua ação inteira.

O Narrador pode exigir:

```
Força + Esportes contra CD 18
```

em situações como:

- terreno irregular;
- lama;
- pouco apoio;
- objeto de formato difícil;
- inclinação leve.

Use CD 22 para:

- inclinação acentuada;
- objeto parcialmente preso;
- obstáculos;
- terreno extremamente ruim;
- resistência adicional relevante.

Acima de `300 kg`, o personagem precisa de ajuda, ferramentas ou outra solução.

---

## A.11. Trabalho em equipe

Três personagens possuem:

|Personagem|CC|
|---|---|
|A|60 kg|
|B|40 kg|
|C|80 kg|
|**CC Coletiva**|**180 kg**|

Eles podem tentar levantar brevemente até:

```
180 × 2 = 360 kg
```

E podem empurrar ou arrastar até:

```
180 × 5 = 900 kg
```

Um dos personagens realiza o teste e recebe `+1` por ajudante.

Com dois ajudantes:

```
Bônus de ajuda = +2
```

O bônus máximo por ajudantes é `+3`, independentemente da quantidade total de participantes.

Todos precisam conseguir alcançar o objeto e possuir espaço e apoio para ajudar.

---

## A.12. Penalidades acumuladas

Um personagem está:

- usando uma armadura que concede `-2` em Esquiva;
- em Carga Excedente, que concede `-2`;
- com uma condição que concede `-1`.

Sua penalidade total será:

```
-2 -2 -1 = -5 em Esquiva
```

Não existe um limite geral para penalidades.

Entretanto, a mesma fonte não deve ser contada duas vezes, salvo quando sua regra declarar expressamente o contrário.

---

## A.13. Exaustão por Excesso Crítico

Um personagem em Excesso Crítico começa um combate.

Ele realiza ações durante cinco rodadas consecutivas:

```
Rodada 1Rodada 2Rodada 3Rodada 4Rodada 5
```

Ao completar a quinta rodada, recebe:

```
+1 de Exaustão
```

Caso continue carregando o mesmo peso e realizando ações, recebe outro ponto após mais cinco rodadas.

A contagem é interrompida se ele:

- apoiar o peso;
- largar parte da carga;
- receber ajuda;
- reduzir sua carga para 150% da CC ou menos;
- permanecer parado sem sustentar ativamente o peso.

Fora de combate, o mesmo ocorre a cada dez minutos consecutivos de transporte.

---

# Apêndice B — Carga Aquática

## B.1. Referência rápida

```
Capacidade Aquática = CC ÷ 2
```

```
Carga Aquática =Carga Atual+ peso da armadura vestida+ peso do escudo empunhado
```

|Faixa|Efeito|
|---|---|
|Até 50%|Natação normal|
|Acima de 50% até 100%|Natação prejudicada|
|Acima de 100% até 150%|Afundando|
|Acima de 150%|Afundamento Crítico|

---

## B.2. Exemplo — Natação Normal

Um personagem Médio com Força 3 possui:

```
CC = 60 kgCapacidade Aquática = 30 kg
```

Ele veste uma armadura de `5 kg` e carrega outros `5 kg`.

```
Carga Atual = 10 kgCarga Aquática = 10 + 5Carga Aquática = 15 kg
```

Como `15 kg` corresponde a 50% de sua Capacidade Aquática, ele permanece em Natação Normal.

---

## B.3. Exemplo — Natação Prejudicada

O mesmo personagem possui Capacidade Aquática de `30 kg`.

Ele veste uma armadura de `8 kg` e carrega outros `6 kg`.

```
Carga Atual = 14 kgCarga Aquática = 14 + 8Carga Aquática = 22 kg
```

Como `22 kg` está acima de 50%, mas não ultrapassa `30 kg`, ele está em Natação Prejudicada.

Ele sofre:

- `-2` nos testes de natação;
- deslocamento aquático pela metade;
- não pode Correr ou usar equivalente aquático.

---

## B.4. Exemplo — Afundando

O personagem veste:

|Equipamento|Peso|
|---|---|
|Armadura|12 kg|
|Escudo empunhado|4 kg|
|Outros itens|8 kg|

Sua Carga Atual é:

```
12 + 4 + 8 = 24 kg
```

Sua Carga Aquática é:

```
24 + 12 + 4 = 40 kg
```

Sua Capacidade Aquática é `30 kg`.

O limite de 150% é:

```
30 × 1,5 = 45 kg
```

Como sua Carga Aquática é `40 kg`, ele está Afundando.

A cada rodada, realiza:

```
1d20 + Vigor + Esportes contra CD 18
```

Em caso de sucesso:

- mantém a profundidade; ou
- sobe `1 m`.

Em caso de falha:

- afunda `1 m`.

---

## B.5. Exemplo — Afundamento Crítico

Um personagem possui Capacidade Aquática de `30 kg`.

Ele veste uma armadura de `25 kg`, empunha um escudo de `6 kg` e carrega outros `5 kg`.

```
Carga Atual = 25 + 6 + 5Carga Atual = 36 kg
```

```
Carga Aquática = 36 + 25 + 6Carga Aquática = 67 kg
```

Como `67 kg` ultrapassa 150% de sua Capacidade Aquática, ele entra em Afundamento Crítico.

A cada rodada:

- afunda automaticamente `3 m`;
- não pode Esquivar;
- não consegue subir normalmente.

Pode realizar:

```
1d20 + Força + Esportes contra CD 22
```

Em caso de sucesso, afunda apenas `1 m` naquela rodada.

---

## B.6. Descartando equipamento na água

O personagem do exemplo anterior possui Carga Aquática de `67 kg`.

Ele larga o escudo de `6 kg`.

Como o escudo contava uma vez na Carga Atual e uma segunda vez por estar empunhado, sua Carga Aquática diminui em `12 kg`.

```
67 - 12 = 55 kg
```

Ele ainda permanece em Afundamento Crítico.

Depois, solta uma mochila de `10 kg`.

Como a mochila contava apenas uma vez:

```
55 - 10 = 45 kg
```

Com `45 kg`, ele passa para a faixa Afundando, pois não está acima de 150% da Capacidade Aquática.

A Carga Aquática é recalculada imediatamente sempre que um item é removido.

---

## B.7. Escudo guardado e escudo empunhado

Um escudo de `5 kg` guardado nas costas entra apenas uma vez na Carga Aquática.

```
Peso considerado = 5 kg
```

Quando empunhado, ele entra uma segunda vez por causa do arrasto.

```
Peso considerado = 10 kg
```

A mesma lógica se aplica apenas quando o escudo estiver sendo efetivamente empunhado.

---

## B.8. Água rasa

Um personagem com água até a cintura ainda consegue apoiar-se no fundo.

Nesse caso, não utiliza as faixas de Carga Aquática.

Aplicam-se:

- Carga terrestre;
- penalidades do terreno;
- efeitos de correnteza;
- possíveis dificuldades de movimentação.

As regras aquáticas passam a ser utilizadas quando o personagem não consegue mais permanecer apoiado e precisa nadar.

---

## B.9. Equipamentos especiais

### Flutuante

O item não entra na Carga Aquática enquanto mantiver sua flutuação.

### Auxílio de Flutuação

Reduz a Carga Aquática do usuário pelo valor indicado.

Exemplo:

```
Carga Aquática normal = 35 kgAuxílio de Flutuação = 10 kgCarga Aquática efetiva = 25 kg
```

### Absorvente

O item ganha peso adicional quando molhado ou submerso.

### Liberação Rápida

Pode ser removido ou descartado em menos tempo que um equipamento normal.

### Hidrodinâmico

Não é contabilizado uma segunda vez por arrasto quando vestido ou empunhado.
