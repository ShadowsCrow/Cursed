# Progressão e Proficiência

Este capítulo propõe a progressão numérica de personagens do nível `1` ao `20`. O Narrador determina quando um nível é recebido; a forma de ganhar experiência ou cumprir marcos de campanha ainda precisa ser definida.

Para montar os valores e escolhas do nível 1, consulte [Criação de Personagem](Cria%C3%A7%C3%A3o%20de%20Personagem.md).

## Valores no nível 1

O personagem começa com o **PV inicial**, o **PP inicial**, a **Escala de PV** e a **Escala de PP** definidos por sua classe. Atributos são somados conforme as fórmulas dessa classe.

Por exemplo, um Mago com `Vigor 3` e `Propósito 2` começa com:

```text
PV inicial = 12 + 3 = 15
PP inicial = 8 + 2 = 10
Escala de PV = 2 + 3 = 5
Escala de PP = 5 + 2 = 7
```

Os números `12`, `8`, `2` e `5` pertencem ao Mago. Outras classes possuem bases e escalas diferentes.

## Ganhos por nível

Ao alcançar um novo nível:

- aumente o PV máximo uma vez pela **Escala de PV** da classe;
- nos níveis **pares**, aumente também o PP máximo uma vez pela **Escala de PP** da classe;
- receba as habilidades de progressão que a classe ou o arquétipo indicar para esse nível;
- receba Pontos de Evolução quando alcançar um Marco de Desenvolvimento;
- atualize o Bônus de Proficiência quando atingir um dos marcos da tabela abaixo.

Essa proposta faz o PV crescer em todos os níveis de `2` a `20` e o PP crescer nos níveis `2, 4, 6, 8, 10, 12, 14, 16, 18 e 20`. O aumento do máximo não recupera automaticamente PV ou PP gastos.

|Nível|Aumentos acumulados de PV|Aumentos acumulados de PP|Bônus de Proficiência|
|---|---:|---:|---:|
|1|0|0|+1|
|2–4|1 a 3|1 a 2|+1|
|5–8|4 a 7|2 a 4|+2|
|9–12|8 a 11|4 a 6|+3|
|13–16|12 a 15|6 a 8|+4|
|17–20|16 a 19|8 a 10|+5|

Para calcular um valor sem percorrer a tabela:

```text
PV máximo = PV inicial + (nível - 1) × Escala de PV
PP máximo = PP inicial + piso(nível ÷ 2) × Escala de PP
```

`piso` significa arredondar para baixo. Use os valores da classe e os Atributos permanentes atuais. Mudanças permanentes de Vigor ou Propósito recalculam os máximos; efeitos temporários só os alteram se disserem isso expressamente.

### Exemplo

O Mago do exemplo chega ao nível `5`, mantendo `Vigor 3` e `Propósito 2`:

```text
PV máximo = 15 + 4 × 5 = 35
PP máximo = 10 + 2 × 7 = 24
Bônus de Proficiência = +2
```

## Habilidades de progressão da classe

Cada classe e arquétipo possui sua própria progressão de habilidades. Essas habilidades e os níveis em que são recebidas devem ser escritos na própria classe, pois não existe uma lista universal de habilidades automáticas.

Quando o personagem alcançar um nível indicado em sua classe ou arquétipo:

1. receba a habilidade descrita naquele marco;
2. aplique qualquer melhoria de uma habilidade anterior;
3. faça escolhas oferecidas pelo marco, caso existam;
4. registre na ficha a fonte e o nível da aquisição.

Uma habilidade automática de classe não consome Pontos de Evolução, salvo quando sua própria regra disser o contrário. Se a classe não possuir uma entrada para determinado nível, o personagem não recebe uma habilidade automática naquele nível.

Habilidades marcadas como placeholder não ficam disponíveis até terem seu funcionamento concluído.

## Progressão personalizável de habilidades e magias

Além das habilidades automáticas da classe, o desenvolvimento de habilidades e magias é personalizável. O Narrador apresenta as opções que cada personagem pode desenvolver ou aprender conforme:

- classe, arquétipo e escolas às quais possui Acesso;
- acontecimentos e necessidades da campanha;
- mestres, livros, pactos, bênçãos, artefatos e outras fontes encontradas;
- interesses e objetivos manifestados pelo jogador;
- requisitos específicos de cada criação.

As opções podem vir de duas fontes:

### Criações prontas

O sistema possui um catálogo de magias e habilidades previamente construídas. Cada opção pronta deve apresentar seus requisitos, Custo de Aprendizado, Descansos Mínimos, Potência de Uso e Custo de Uso, calculados pelas regras do framework.

O Narrador seleciona quais dessas opções estão disponíveis ao personagem naquele momento da campanha. Estar no catálogo não concede Acesso automático.

### Criações sob demanda

O Narrador e o jogador podem criar uma magia ou habilidade para atender ao desenvolvimento do personagem ou a uma necessidade da campanha. A criação deve utilizar o [Framework de Criação, Aprendizado e Uso de Magias e Habilidades](Framework%20de%20Cria%C3%A7%C3%A3o,%20Aprendizado%20e%20Uso%20de%20Magias%20e%20Habilidades.md) para definir efeitos, limites, custos e tempo de aprendizado.

Uma criação sob demanda entra em jogo somente depois de estar escrita, calculada e vinculada a uma fonte de Acesso válida. O Narrador apresenta a versão disponível para aprendizado antes que o personagem invista PP nela.

### Aprendizado e Pontos de Evolução

Aprender uma magia ou habilidade oferecida pelo Narrador utiliza o Custo de Aprendizado em PP e os Descansos Mínimos definidos no framework. Esse processo não consome Pontos de Evolução.

Pontos de Evolução continuam destinados à compra de Atributos, Perícias e Vantagens. Uma habilidade automática de classe também não exige PP, descansos ou Pontos de Evolução, salvo quando sua própria descrição estabelecer um custo.

## Marcos de Desenvolvimento

Nos níveis abaixo, o personagem recebe Pontos de Evolução para personalizar seu crescimento:

|Nível alcançado|Pontos de Evolução recebidos|Total acumulado|
|---:|---:|---:|
|6|`5`|`5`|
|12|`5`|`10`|
|18|`5`|`15`|

Cada marco concede pontos suficientes para combinar diferentes aquisições ou investir em uma melhoria de maior custo.

Pontos não gastos permanecem registrados e podem ser acumulados entre marcos.

## Gastando Pontos de Evolução

|Aquisição|Custo|
|---|---:|
|Aumentar uma Perícia em `+1`|`1 Ponto de Evolução`|
|Comprar uma Vantagem|Custo em pontos indicado pela Vantagem|
|Aumentar um Atributo em `+1`|`3 Pontos de Evolução`|

O jogador pode dividir os pontos como quiser e realizar mais de uma aquisição no mesmo marco, desde que pague todos os custos e respeite os limites.

### Atributos

O limite normal de um Atributo é `5`. Bônus temporários e regras específicas podem ultrapassá-lo quando declararem isso expressamente.

Um aumento permanente de Vigor recalcula o PV inicial, a Escala de PV e o PV máximo. Um aumento permanente de Propósito recalcula o PP inicial, a Escala de PP e o PP máximo. Use as fórmulas da classe com o novo valor.

### Perícias

Cada compra aumenta uma única Perícia em `+1`. Pontos de Evolução podem elevar a Perícia até o limite comum de `5`.

Valores entre `6` e `10` só podem ser alcançados por classes, habilidades, Vantagens, equipamentos, efeitos ou outras fontes que declarem expressamente esse aumento. O limite máximo de uma Perícia é `10`, somando progressão comum e fontes especiais.

### Vantagens

Para comprar uma Vantagem, gaste uma quantidade de Pontos de Evolução igual ao custo indicado em [Vantagens e Desvantagens](Vantagens%20e%20Desvantagens.md). A aquisição precisa cumprir as condições da Vantagem e deve ser registrada na ficha.

Desvantagens concedem Pontos de Vantagem apenas durante a criação do personagem. Adquirir uma Desvantagem durante a campanha não concede Pontos de Evolução nem novos Pontos de Vantagem, salvo quando uma regra ou recompensa disser isso expressamente.

Pontos de Evolução não compram níveis, habilidades automáticas de classe, PV, PP ou Bônus de Proficiência diretamente.

## Bônus de Proficiência

O **Bônus de Proficiência** é um valor numérico que acompanha os marcos de nível da tabela. Ele entra em uma rolagem, dano ou outro cálculo **somente quando a regra da habilidade, magia ou equipamento disser expressamente** `+ Bônus de Proficiência`.

Ele não é somado automaticamente a todos os testes de Atributo, Perícia, ataque ou Defesa. Também não substitui o valor da Perícia. Quando uma regra mencionar apenas `Proficiência` como número, use o Bônus de Proficiência desta seção.

Expressões antigas como `+1d de Proficiência` ou `dados de Proficiência` precisam ser reescritas antes de uso; a progressão atual utiliza bônus numérico e rolagens explícitas.

## Proficiência com armas

A **Proficiência com uma família de armas** indica se o personagem recebeu treinamento para utilizá-la. Ela é concedida por classe, arquétipo, origem, habilidade ou treinamento e segue [Equipamentos](Equipamentos.md).

Ter Proficiência com a família permite incluir a Perícia aplicável no ataque e usar propriedades ou técnicas que a exijam. Não acrescenta o Bônus de Proficiência ao ataque por si só. Sem Proficiência com a família, aplique a regra de ataque sem Proficiência de Equipamentos.
