# Rolagens de Atributos e Perícias

Os testes são realizados somando um Atributo e uma Perícia a uma rolagem de `1d20`.

A Iniciativa usa uma combinação fixa e está descrita em [Iniciativa, Movimento e Posicionamento](Iniciativa,%20Movimento%20e%20Posicionamento.md).

```
Teste = 1d20 + Atributo + Perícia + outros modificadores
```

O Narrador determina quais combinações representam melhor a ação realizada.

Exemplos:

```
Inteligência + ArcanismoDestreza + FurtividadePercepção + ProntidãoForça + Armas BrancasCarisma + Liderança
```

O resultado do teste deve ser igual ou superior à Classe de Dificuldade para que a ação seja bem-sucedida.

```
Resultado ≥ CD: sucessoResultado < CD: falha
```

---

# Dificuldades

As dificuldades abaixo utilizam como referência um personagem com bônus total de `+6`, proveniente da soma de Atributo e Perícia.

|Dificuldade|CD|Resultado necessário no d20|Chance com +6|
|---|---|---|---|
|Fácil|15|9 ou mais|60%|
|Média|18|12 ou mais|45%|
|Difícil|22|16 ou mais|25%|
|Extrema|26|20|5%|

Uma ação verdadeiramente impossível não permite rolagem sem que o personagem obtenha primeiro alguma condição, recurso ou vantagem narrativa que torne a tentativa possível.

As chances apresentadas são apenas referências. A chance real depende do bônus total do personagem.

---

# Rolagens de Ataque

Quando um personagem realiza um ataque, deve rolar:

```
Ataque = 1d20 + Atributo de ataque + Perícia de ataque + outros modificadores
```

A combinação utilizada depende do ataque.

Exemplos:

```
Força + Armas BrancasDestreza + Longo AlcanceDestreza + BrigaInteligência + Arcanismo
```

O ataque pode ser enfrentado por uma Defesa, caso o efeito permita.

---

# Defesa

Defesa é o termo geral utilizado para representar as formas pelas quais um personagem evita ou impede um ataque.

As duas formas principais de Defesa são:

- **Esquiva**
- **Bloqueio**

Quando um ataque é declarado, o defensor escolhe qual Defesa utilizar antes que as rolagens sejam realizadas.

Depois da escolha, atacante e defensor fazem suas rolagens.

## Esquiva

A Esquiva representa sair da trajetória do ataque.

```
Esquiva =1d20+ Destreza+ Esquiva+ bônus de Esquiva de equipamentos+ outros modificadores
```

## Bloqueio

O Bloqueio representa resistir, aparar ou impedir fisicamente o ataque.

```
Bloqueio =1d20+ Vigor+ Armadura+ outros modificadores
```

O funcionamento detalhado, as vantagens e as limitações de Esquiva e Bloqueio são definidos em suas respectivas seções.

---

# Resolução de Ataque contra Defesa

O combate segue esta ordem:

1. O atacante declara o ataque e o alvo.
2. O defensor escolhe Esquiva ou Bloqueio.
3. O atacante realiza sua rolagem de ataque.
4. O defensor realiza sua rolagem de Defesa.
5. Os resultados são comparados.

```
Defesa ≥ Ataque: o ataque é defendido.Ataque > Defesa: o ataque acerta.
```

Em um empate comum, a Defesa vence.

---

# Exemplo de Ataque contra Esquiva

Um atacante possui:

```
Força 3Armas Brancas 2Bônus de ataque = 5
```

O defensor possui:

```
Destreza 3Esquiva 2Armadura de couro: +1 de EsquivaBônus de Esquiva = 6
```

As rolagens são:

```
Ataque:1d20 = 55 + 5 = 10Esquiva:1d20 = 1515 + 6 = 21
```

Como a Defesa foi maior que o Ataque, o golpe não acerta.

---

# Defesas Sucessivas

Um personagem pode realizar várias Defesas antes do início de seu próximo turno.

Cada Defesa depois da primeira sofre uma penalidade cumulativa de `-1`.

|Defesa realizada|Penalidade|
|---|---|
|Primeira|0|
|Segunda|-1|
|Terceira|-2|
|Quarta|-3|
|Quinta|-4|
|Cada Defesa seguinte|-1 adicional|

A penalidade é aplicada independentemente de o personagem alternar entre Esquiva e Bloqueio.

Exemplo:

```
Primeira Defesa: Esquiva sem penalidadeSegunda Defesa: Bloqueio com -1Terceira Defesa: Esquiva com -2
```

A contagem é reiniciada no início do turno do personagem que realizou as Defesas.

---

# Resultados Naturais

O valor natural é o resultado mostrado diretamente no `1d20`, antes da aplicação de qualquer bônus ou penalidade.

## 1 natural no ataque

Um `1 natural` no ataque é uma falha automática.

O ataque falha independentemente dos modificadores.

Como o golpe já falhou, o alvo não precisa realizar uma rolagem de Defesa.

O Narrador pode aplicar uma consequência narrativa proporcional à situação, mas um `1 natural` não deve provocar automaticamente consequências extremas.

## 1 natural na Defesa

Um `1 natural` na Defesa é uma falha automática.

Caso o ataque não tenha falhado, o golpe acerta independentemente do total defensivo.

## 20 natural no ataque

Um `20 natural` no ataque supera qualquer Defesa cujo dado natural tenha resultado entre `1` e `19`, mesmo que o total numérico da Defesa seja maior.

Exemplo:

```
Ataque:20 natural + 4 = 24Defesa:19 natural + 10 = 29
```

Apesar de a Defesa possuir total `29`, o ataque vence porque obteve um `20 natural` e a Defesa não.

Um ataque que vence dessa forma é considerado um acerto crítico.

## 20 natural na Defesa

Um `20 natural` na Defesa supera qualquer ataque cujo dado natural tenha resultado entre `1` e `19`, mesmo que o total numérico do ataque seja maior.

Exemplo:

```
Ataque:19 natural + 10 = 29Defesa:20 natural + 4 = 24
```

A Defesa é bem-sucedida porque obteve um `20 natural`.

---

# Ataque e Defesa com 20 natural

Quando atacante e defensor obtêm `20 natural`, os totais normais não são utilizados como primeiro critério de desempate.

Compare apenas os Atributos utilizados nas duas rolagens.

Exemplo:

```
Ataque:Força 3 + Armas Brancas 2Defesa:Destreza 2 + Esquiva 4
```

Para o desempate, compare:

```
Força 3 contra Destreza 2
```

O atacante vence porque seu Atributo é maior.

As Perícias, bônus de equipamentos e outros modificadores não entram nesse desempate.

## Atributos iguais

Caso os dois Atributos também sejam iguais, atacante e defensor realizam uma nova rolagem de `1d20` apenas para desempatar.

```
Maior resultado vence.
```

Caso a nova rolagem também termine empatada, ela é repetida até existir um vencedor.

Essa rolagem não representa um novo ataque ou uma nova Defesa. Ela apenas determina quem venceu o confronto entre os dois resultados naturais `20`.

Se o atacante vencer, o ataque continua sendo um acerto crítico.

Se o defensor vencer, o ataque é defendido.

---

# Acerto Crítico

Um ataque é crítico quando:

- o atacante obtém `20 natural`;
- o defensor não vence o confronto pelas regras de resultados naturais.

Em um acerto crítico, o atacante realiza normalmente a rolagem completa de dano e depois repete essa mesma rolagem, somando os dois resultados.

```
Dano crítico =Rolagem completa de dano+ uma nova rolagem completa de dano
```

Dados e modificadores fixos são aplicados nas duas rolagens.

## Exemplo

Um ataque causa:

```
1d8 + 3
```

Em um crítico, o dano será:

```
(1d8 + 3) + (1d8 + 3)
```

Exemplo de resultados:

```
Primeira rolagem:1d8 = 55 + 3 = 8Segunda rolagem:1d8 = 66 + 3 = 9Dano crítico total:8 + 9 = 17
```

O crítico não dobra automaticamente valores já rolados. Ele concede uma segunda rolagem completa de dano.

Ataques em área que não realizam rolagem de ataque não podem gerar acertos críticos do atacante.

---

# Rolagem de Dano

Cada arma, magia ou habilidade determina seus próprios dados e modificadores de dano.

Exemplos:

```
1d61d8 + Força2d6 + Inteligência1d10 + Destreza
```

Após o ataque acertar:

1. realize a rolagem de dano;
2. aplique efeitos que alterem o dano;
3. subtraia a Redução de Dano por Bloqueio, quando aplicável;
4. aplique o dano restante diretamente aos Pontos de Vida do alvo.

```
Dano recebido = Dano total - RDB
```

O dano recebido não pode ser reduzido abaixo de zero.

A forma exata como o RDB funciona será definida junto às regras de Bloqueio e Armadura.
