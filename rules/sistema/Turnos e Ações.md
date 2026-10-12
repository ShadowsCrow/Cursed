# Turnos e Ações

Uma **rodada** é o ciclo completo em que todos os participantes têm um turno. Um **turno** é o momento de um participante dentro dessa rodada.

A ordem dos turnos, o Deslocamento e os ataques de oportunidade estão em [Iniciativa, Movimento e Posicionamento](Iniciativa,%20Movimento%20e%20Posicionamento.md).

## Cenas

Uma **cena** é um contexto narrativo com começo e fim definidos pelo Narrador. Ela reúne acontecimentos que compartilham lugar, tempo, objetivo ou conflito relevante.

Existem dois tipos de cena:

|Tipo|Uso|
|---|---|
|**Cena Livre**|Exploração, conversa, investigação, viagem, preparação e outros momentos sem disputa estruturada.|
|**Cena de Disputa**|Uma situação com objetivos em conflito e resultado incerto, como batalha, perseguição, jogo, debate, competição ou outro confronto.|

Uma Cena de Disputa usa Rodadas, Turnos e Iniciativa quando a ordem e o tempo das ações forem relevantes. O Narrador pode resolver disputas mais simples com um ou mais testes, sem iniciar Rodadas.

O Narrador declara o início e o fim da cena. Uma pausa breve, uma troca de fala ou a passagem de poucos minutos não encerra uma cena por si só. Uma Cena Livre pode se tornar uma Cena de Disputa, e uma Disputa pode retornar a Livre, sem iniciar uma nova cena se o contexto narrativo continuar o mesmo.

Efeitos limitados a uma vez por cena, Combos ativos e contadores que terminam no fim da cena são reiniciados apenas quando a cena realmente termina.

## Recursos do turno

Em seu turno, um personagem possui:

|Recurso|Uso|
|---|---|
|Ação Padrão|Ação principal do turno: atacar, lançar uma magia, usar uma habilidade ou realizar outra tarefa relevante.|
|Ação de Movimento|Deslocar-se ou realizar uma ação que declare expressamente exigir Movimento.|
|Ação Bônus|Ação adicional concedida por uma habilidade, magia, equipamento ou efeito específico.|
|Ações Livres|Interações breves que não exigem esforço ou tempo relevante.|

O personagem pode trocar sua Ação Padrão por uma segunda Ação de Movimento.

Uma magia, habilidade, equipamento ou condição deve declarar qual recurso exige. Se não declarar, o Narrador define o recurso conforme o impacto e o tempo necessários.

## Ação Padrão

Use uma Ação Padrão para atividades que exigem atenção, esforço ou execução deliberada.

Exemplos comuns:

- realizar um ataque;
- lançar uma magia que exija uma ação;
- usar uma habilidade ativa;
- ajudar alguém em uma tarefa relevante;
- interagir demoradamente com um objeto, mecanismo ou cenário.

## Manobras de combate

Uma criatura só pode utilizar uma manobra quando uma classe, habilidade, arma ou outro efeito lhe conceder acesso a ela. As manobras abaixo usam uma Ação Padrão, salvo quando sua fonte disser o contrário.

### Ataque Leve

O **Ataque Leve** é um ataque normal com uma arma, ataque desarmado ou outra fonte de ataque permitida. Ele utiliza a rolagem e o dano normais da fonte.

Quando uma regra de Combo exigir um Ataque Leve, apenas um ataque declarado como Ataque Leve pode preencher essa etapa.

### Ataque Pesado

O **Ataque Pesado** é um ataque normal realizado com uma arma. Se acertar, role um dado adicional de dano da arma e some o resultado ao dano normal. Não adicione novamente o Atributo de Dano nem outros modificadores fixos.

Depois de declarar o Ataque Pesado, o usuário fica **Exposto** até o fim de seu próximo turno. O primeiro ataque válido que o escolher como alvo e exigir uma rolagem de ataque nesse prazo acerta automaticamente; o usuário não pode Esquivar ou Bloquear esse ataque. O dano ainda é calculado normalmente e o acerto não se torna crítico apenas por ser automático.

O Ataque Pesado conta como uma etapa de Combo apenas quando a fonte que concedeu a manobra também permitir seu uso em Combos.

## Ação de Movimento

A Ação de Movimento permite ao personagem usar seu deslocamento normal ou realizar uma atividade de mobilidade indicada por uma regra, habilidade ou condição.

Trocar a Ação Padrão por Movimento não cria uma segunda Ação Padrão; o personagem fica apenas com duas Ações de Movimento naquele turno.

## Ação Bônus

Um personagem possui no máximo uma Ação Bônus por turno.

Ela só pode ser usada quando uma habilidade, magia, equipamento ou efeito declarar expressamente que utiliza uma Ação Bônus. Uma Ação Bônus não pode ser convertida em Ação Padrão, Ação de Movimento ou Reação, nem esses recursos podem ser convertidos em Ação Bônus.

## Ações Livres

Ações Livres são rápidas e não substituem uma ação que tenha consequência mecânica relevante.

Exemplos comuns:

- falar brevemente;
- soltar um objeto que já esteja na mão;
- fazer um gesto simples;
- interromper voluntariamente um efeito que permita isso;
- sacar ou guardar um objeto quando outra regra permitir essa interação como livre.

O Narrador pode limitar Ações Livres que tentem produzir um efeito relevante em combate ou explorar uma brecha de tempo.

## Reações

Uma Reação ocorre fora do turno do personagem em resposta a um gatilho. A habilidade, magia, equipamento ou condição que a concede deve indicar qual é o gatilho e quando a Reação pode ser usada.

Cada personagem pode manter no máximo `1 Reação` disponível. Depois de gastá-la, só a recupera no começo de seu próximo turno. O personagem escolhe qual efeito utilizar quando mais de um puder responder ao mesmo gatilho.

Esquiva e Bloqueio seguem suas próprias regras de Defesa. Em particular, as Defesas Sucessivas de [Rolagens](Rolagens.md) determinam a quantidade e as penalidades de Defesas antes do próximo turno do personagem.

Uma condição que remova Reações impede apenas as Reações que dependem desse recurso, salvo se também declarar que impede Esquiva, Bloqueio ou outra forma de Defesa.

A Reação por Persistência é uma mecânica automática diferente desse recurso. Suas regras estão em [Mecânicas Únicas do Sistema](Mecânicas%20Únicas%20do%20Sistema.md).

## Ordem de resolução

Quando mais de um efeito ocorrer no mesmo instante, resolva nesta ordem:

1. gatilho declarado pela ação, habilidade ou magia;
2. Reações permitidas pelo gatilho;
3. testes e Defesas necessários;
4. dano, cura, condições e demais consequências;
5. efeitos que dependam do resultado, como crítico, queda ou Reação por Persistência.

Uma regra específica de uma habilidade ou magia tem prioridade quando estabelecer uma ordem diferente.
