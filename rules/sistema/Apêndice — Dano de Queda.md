# Apêndice C — Dano de Queda

## C.1. Referência rápida

```
Destreza de Queda =Destreza limitada ao máximo de 2
```

```
Altura Segura = 3 m + Destreza de Queda - 2 m se estiver em Sobrecarga
```

```
Dano de Queda =metros completos acima da Altura Segura
```

---

## C.2. Tabela de Altura Segura

|Destreza atual|Sem Sobrecarga|Em Sobrecarga|
|---|---|---|
|0|3 m|1 m|
|1|4 m|2 m|
|2 ou mais|5 m|3 m|

A Destreza acima de 2 não aumenta a Altura Segura.

Penalidades que reduzam a Destreza são aplicadas antes de limitar seu valor.

---

## C.3. Exemplo — Sem Sobrecarga

Um personagem possui Destreza 1 e não está em Sobrecarga.

```
Altura Segura = 3 + 1Altura Segura = 4 m
```

|Queda|Dano|
|---|---|
|3 m|0|
|4 m|0|
|5 m|1|
|6 m|2|
|8 m|4|

---

## C.4. Exemplo — Destreza elevada

Um personagem possui Destreza 4 e não está em Sobrecarga.

Sua Destreza de Queda continua limitada a 2.

```
Altura Segura = 3 + 2Altura Segura = 5 m
```

Uma queda de `9 m` causa:

```
9 - 5 = 4 de dano
```

---

## C.5. Exemplo — Em Sobrecarga

Um personagem possui Destreza 1 e está em Sobrecarga, com um fardo na área vermelha da grade.

```
Altura Segura = 3 + 1 - 2Altura Segura = 2 m
```

Uma queda de `5 m` causa:

```
5 - 2 = 3 de dano
```

---

## C.6. Frações de metro

Apenas metros completos acima da Altura Segura causam dano.

Um personagem possui Altura Segura de `4 m` e cai `5,5 m`.

```
5,5 - 4 = 1,5 m
```

Apenas um metro completo é considerado.

```
Dano = 1
```

Uma queda de `5,9 m` também causaria `1 ponto`, enquanto uma queda de `6 m` causaria `2 pontos`.

---

## C.7. Queda causada por um ataque

Um ataque causa `5 pontos de dano` e empurra o alvo de uma plataforma de `7 m`.

O alvo possui Altura Segura de `4 m`.

Primeiro, resolva o dano do ataque:

```
Dano do ataque = 5
```

Depois, resolva a queda:

```
7 - 4 = 3
```

O dano total recebido é:

```
5 + 3 = 8
```

As duas fontes são resolvidas separadamente.

---

## C.8. Queda em múltiplas etapas

Um personagem possui Altura Segura de `3 m`.

Ele cai `5 m` até atingir uma plataforma e depois mais `4 m` até o chão.

Primeiro impacto:

```
5 - 3 = 2 de dano
```

Segundo impacto:

```
4 - 3 = 1 de dano
```

Dano total:

```
2 + 1 = 3
```

Cada trecho só é calculado separadamente quando a superfície realmente interromper ou amortecer a queda.

Se o personagem atravessar uma estrutura frágil sem reduzir significativamente sua velocidade, o Narrador pode considerar tudo uma única queda.

---

## C.9. RDB e proteção contra quedas

O RDB comum não reduz dano de queda.

Isso inclui:

- RDB da armadura;
- RDB do escudo;
- RDB utilizado em Bloqueios;
- reduções genéricas que não mencionem impacto ou queda.

Um efeito pode reduzir o dano quando declarar expressamente algo como:

- reduz dano de queda;
- reduz dano de impacto;
- desacelera a queda;
- amortece aterrissagens;
- permite levitar;
- cria uma superfície protetora.

---

## C.10. Esquiva e Bloqueio

Uma queda não é um ataque comum.

Por isso, não permite automaticamente:

- Esquiva;
- Bloqueio;
- Defesa oposta;
- acerto crítico.

A Destreza já contribui para o cálculo da Altura Segura.

Uma habilidade pode permitir uma rolagem especial, desde que determine:

- Atributo e Perícia;
- CD;
- efeito do sucesso;
- efeito da falha;
- quanto dano é reduzido ou evitado.

---

## C.11. Altura Segura reduzida

A Altura Segura nunca pode ser inferior a `0 m`.

Caso penalidades futuras reduzam seu resultado abaixo de zero:

```
Altura Segura = 0 m
```

Nesse caso, cada metro completo de queda causa `1 ponto de dano`.

Uma simples queda da própria altura não é necessariamente tratada como uma queda vertical de metros completos, salvo quando a situação ou efeito disser o contrário.