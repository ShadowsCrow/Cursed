# Armaduras e Escudos

Armaduras são equipamentos defensivos que podem favorecer **Esquiva**, **Bloqueio** ou ambos.

O peso da armadura entra normalmente na **Carga Atual** e na **Carga Aquática**.

## Campos da armadura

```
Nome:Categoria:Perfil:Peso:Bônus de Esquiva:Armadura:RDB:Penalidade de Esquiva:Penalidade de Destreza:Penalidade de Furtividade:Penalidade de Deslocamento:Requisito de Força:Propriedades:Descrição:
```

Campos sem efeito possuem valor `0` ou podem ser omitidos.

---

## Categorias e perfis

|Categoria|Perfis comuns|
|---|---|
|Leve|Esquiva|
|Média|Esquiva, Bloqueio ou Híbrido|
|Pesada|Bloqueio|

### Armadura leve

Armaduras leves favorecem mobilidade e concedem **Bônus de Esquiva**.

Por padrão, não concedem Armadura nem RDB.

### Armadura média

Armaduras médias podem possuir três perfis:

- **Esquiva:** concede Bônus de Esquiva;
- **Bloqueio:** concede Armadura e RDB;
- **Híbrido:** concede valores menores de Esquiva, Armadura e RDB, com penalidades mais brandas.

### Armadura pesada

Armaduras pesadas favorecem exclusivamente o Bloqueio.

Concedem Armadura e RDB elevados, mas normalmente possuem maior peso, penalidades e Requisito de Força.

Não concedem Bônus de Esquiva.

Itens especiais criados pelo Narrador podem quebrar essas regras.

---

## Esquiva com armadura

Quando a armadura concede Bônus de Esquiva:

```
Esquiva =1d20 + Destreza + Perícia Esquiva + Bônus de Esquiva - Penalidade de Destreza - Penalidade de Esquiva + outros modificadores
```

O RDB da armadura não é aplicado quando o personagem escolhe Esquiva.

---

## Bloqueio com armadura

O valor de **Armadura** é somado à rolagem de Bloqueio:

```
Bloqueio = 1d20 + Vigor + Armadura + bônus do Escudo + outros modificadores
```

Se o Bloqueio for bem-sucedido, o ataque não causa dano.

Se o Bloqueio falhar:

```
Dano recebido = Dano causado - RDB da armadura - RDB do escudo - outras reduções compatíveis
```

O RDB de uma armadura só é aplicado quando ela participa de um Bloqueio.

Equipamentos com RDB, mas sem Armadura, são possíveis, porém raros e normalmente especiais.

---

## Penalidades

### Penalidade de Esquiva

Aplica-se somente às rolagens de Esquiva.

### Penalidade de Destreza

Aplica-se a todas as rolagens que utilizem Destreza, inclusive Esquiva e Furtividade.

### Penalidade de Furtividade

Aplica-se somente às rolagens de Furtividade e representa ruído, reflexos ou volume do equipamento.

```
Furtividade = 1d20 + Destreza + Perícia Furtividade - Penalidade de Destreza - Penalidade de Furtividade + outros modificadores
```

### Penalidade de Deslocamento

Reduz diretamente o deslocamento do personagem em metros.

As penalidades acumulam com Carga, Exaustão, condições e outras fontes aplicáveis.

---

## Requisito de Força

Qualquer personagem pode utilizar armaduras, sem necessidade de treinamento.

Quando uma armadura possuir Requisito de Força, o personagem só poderá utilizá-la se sua Força atual for igual ou superior ao requisito.

```
Força atual ≥ Requisito de Força: pode utilizar.
Força atual < Requisito de Força: não pode utilizar.
```

O personagem ainda pode carregar ou transportar a armadura normalmente.
## Escudos

Escudos são equipamentos defensivos utilizados em conjunto com armaduras ou outras formas de Bloqueio.

Um escudo pode possuir:

```
Nome:Categoria:Peso:Armadura:RDB:Penalidade de Esquiva:Penalidade de Destreza:Penalidade de Furtividade:Penalidade de Deslocamento:Requisito de Força:Propriedades:Descrição:
```

O escudo só concede seus valores quando:

- está empunhado;
- é utilizado na Defesa;
- consegue interceptar o ataque;
- o personagem escolhe Bloqueio.

Sua Armadura é somada à rolagem:

```
Bloqueio =1d20+ Vigor+ Armadura da proteção+ Armadura do escudo+ outros modificadores
```

Se o Bloqueio falhar:

```
RDB total =RDB da armadura+ RDB do escudo+ outras reduções compatíveis
```

O RDB do escudo não é aplicado quando o personagem escolhe Esquiva.

Apenas um escudo pode conceder seus benefícios na mesma Defesa.

Escudos normalmente ocupam uma mão. Escudos especiais podem possuir regras diferentes.

Escudos apropriados podem permitir Bloqueio contra cones, rajadas ou ataques em área vindos de uma direção definida. Explosões que envolvam completamente o personagem normalmente não podem ser bloqueadas por um escudo comum.

O peso do escudo entra na Carga Atual e, quando estiver empunhado, é contabilizado novamente na Carga Aquática.

# Armas

Armas definem o Atributo, a Perícia, o dano e a forma de ataque utilizada pelo personagem.

Armas comuns não concedem bônus direto na rolagem de ataque.

## Campos da arma

```
Nome:Categoria:Família de Proficiência:Peso:Empunhadura:Atributo de Ataque:Perícia de Ataque:Dano:Atributo de Dano:Tipo de Dano:Alcance Normal:Alcance Máximo:Requisito de Força:Propriedades:Descrição:
```

Campos que não se aplicarem podem ser omitidos.

---

## Rolagem de ataque

```
Ataque =1d20+ Atributo de Ataque+ Perícia de Ataque+ outros modificadores
```

Cada arma determina quais Atributos podem ser utilizados.

Exemplos:

- Adaga: Destreza + Armas Brancas;
- Espada longa: Força + Armas Brancas;
- Espada curta: Força ou Destreza + Armas Brancas;
- Arco: Destreza + Longo Alcance;
- Faca arremessada: Destreza + Longo Alcance;
- Objeto pesado arremessado: Força + Longo Alcance;
- Ataque desarmado: Força ou Destreza + Briga.

Quando a arma permitir mais de um Atributo, o jogador escolhe qual utilizar no ataque. O mesmo Atributo é normalmente utilizado no dano.

---

## Dano

```
Dano =Dados da arma+ Atributo de Dano+ outros modificadores
```

Exemplos:

```
Adaga: 1d4 + DestrezaEspada curta: 1d6 + Força ou DestrezaEspada longa: 1d8 + ForçaArco: 1d8 + Destreza
```

A arma deve informar um dos tipos físicos de dano:

- Cortante;
- Perfurante;
- Contundente.

Armas especiais podem possuir outros tipos.

---

## Empunhadura

### Uma mão

Pode ser utilizada com uma mão, permitindo que a outra segure um escudo, arma ou objeto.

### Duas mãos

Exige as duas mãos para ser utilizada corretamente.

### Versátil

Possui valores diferentes conforme a empunhadura.

Exemplo:

```
Uma mão: 1d8 + ForçaDuas mãos: 1d10 + Força
```

---

## Alcance

Armas de longo alcance e arremesso possuem:

```
Alcance Normal / Alcance Máximo
```

- Até o Alcance Normal: ataque sem penalidade.
- Acima do Alcance Normal e até o Máximo: `-2` no ataque.
- Acima do Alcance Máximo: o ataque não pode ser realizado normalmente.

Armas exclusivamente corpo a corpo não precisam possuir esses campos.

---

## Proficiência

A Proficiência representa treinamento com uma família de armas.

Exemplos:

- Armas Brancas Leves;
- Armas Brancas de Uma Mão;
- Armas Brancas Pesadas;
- Armas de Haste;
- Arcos;
- Bestas;
- Armas de Arremesso;
- Armas de Fogo;
- Armas Exóticas.

A Proficiência pode ser concedida por classe, arquétipo, origem, habilidade ou treinamento.

### Uso com Proficiência

```
Ataque =1d20+ Atributo+ Perícia+ modificadores
```

### Uso sem Proficiência

O personagem ainda pode utilizar uma arma comum, mas não adiciona a Perícia ao ataque.

```
Ataque sem Proficiência =1d20+ Atributo+ modificadores
```

O dano da arma permanece normal caso o ataque acerte.

Sem Proficiência, o personagem também não pode utilizar:

- habilidades que exijam domínio daquela família;
- combos específicos da arma;
- propriedades técnicas que exijam treinamento.

Propriedades físicas, como Duas Mãos, Versátil, Peso e Alcance, continuam funcionando normalmente.

Armas Exóticas podem exigir Proficiência específica para serem utilizadas funcionalmente.

---

## Requisito de Força

Algumas armas pesadas possuem Requisito de Força.

```
Força atual ≥ Requisito:pode utilizar.Força atual < Requisito:não pode utilizar corretamente.
```

O personagem ainda pode carregar ou transportar a arma normalmente.

---

## Propriedades

Uma arma pode possuir uma ou mais propriedades.

Exemplos:

- **Leve:** apropriada para técnicas rápidas ou combate com duas armas.
- **Pesada:** possui Requisito de Força ou grande peso.
- **Versátil:** possui dano diferente com uma ou duas mãos.
- **Arremesso:** pode ser utilizada como ataque à distância.
- **Alcance:** atinge inimigos a uma distância corpo a corpo maior.
- **Munição:** exige munição para atacar.
- **Recarga:** precisa ser preparada após determinados ataques.
- **Defensiva:** pode participar de Bloqueios permitidos por habilidades.
- **Ocultável:** pode ser escondida com facilidade.
- **Exótica:** exige Proficiência específica.

As propriedades só precisam ser incluídas quando alterarem mecanicamente o funcionamento da arma.

# Armas e Armaduras


