# Condições, Efeitos e Tipos de Dano

Este documento pertence ao **núcleo** do jogo. Uma condição como **Cego** tem regras próprias. O Narrador descreve o que a causou e por quanto tempo ela pode persistir; enquanto a causa permanecer, aplicam-se as regras da condição.

## Aplicar condições na mesa

```text
Narrador: “Lia está Cega pela fumaça.”
Enquanto a fumaça impedir sua visão, Lia sofre os efeitos de Cego.
Quando a fumaça se dispersa, Cego termina, salvo se outra causa ainda a impedir de enxergar.
```

Se duas causas sustentarem a mesma condição, ela continua até ambas terminarem, sem duplicar suas penalidades. Anote as causas quando isso ajudar a acompanhar seu encerramento. Resistência, escape e duração dependem da magia, habilidade, item ou situação que causou a condição.

Uma regra só altera uma rolagem quando indica quais testes afeta e em que circunstâncias. Por exemplo, a penalidade de Cego se aplica a ataques e Defesas que dependam da visão, não a testes baseados apenas em audição.

## Sobreposição

Proibições idênticas não se aplicam duas vezes. **Cego substitui Ofuscado** no aspecto visual: uma rolagem visual sofre `-4`, e não `-4 -2`. As duas causas ainda devem ser acompanhadas para saber quando cada uma termina. **Contido** já limita o movimento; não é necessário somar as mesmas restrições de Imobilizado.

## Condições

### Abertura e mobilidade

|Condição|Regra|
|---|---|
|**Surpreso**|Até o começo de seu primeiro turno no conflito, não pode realizar Reações, Esquiva ou Bloqueio.|
|**Derrubado**|Não possui Movimento voluntário normal e precisa gastar uma Ação de Movimento para se levantar.|
|**Agarrado**|Seu Movimento voluntário é `0`, mas ainda pode agir e se defender. A fonte define escape e movimento do alvo.|
|**Imobilizado**|Seu Movimento voluntário é `0` e não pode Esquivar. Ainda pode Bloquear se conseguir mover a proteção.|
|**Contido**|Seu Movimento voluntário é `0`, não pode Esquivar e só pode Bloquear se a fonte permitir o movimento necessário.|

Levantar-se encerra Derrubado quando nenhuma outra regra impedir. Agarrado não remove Ações ou Defesas por si só.

### Sentidos e comunicação

|Condição|Regra|
|---|---|
|**Ofuscado**|Sofre `-2` em ataques que dependam da visão e em testes de Percepção visual.|
|**Cego**|Não enxerga, falha em testes que dependam apenas da visão e sofre `-4` em ataques e Defesas que dependam dela.|
|**Silenciado**|Não pode falar, emitir comandos verbais nem utilizar componentes verbais.|
|**Invisível**|Não pode ser visto por meios visuais comuns. Sua posição ainda pode ser descoberta por outros sentidos e evidências.|

Cego não penaliza automaticamente uma ação que dependa apenas de audição e tato. Invisível não torna uma criatura silenciosa, intangível ou indetectável.

### Capacidade

|Condição|Regra|
|---|---|
|**Sem Reação**|Não pode gastar sua Reação. Isso não impede Defesas, salvo regra expressa.|
|**Atordoado**|Não pode realizar Reações e, em seu turno, escolhe realizar Ações ou Movimento, não ambos.|
|**Paralisado**|Não pode se mover, realizar ações físicas, Esquivar ou Bloquear. Pode perceber e realizar ações puramente mentais que não exijam movimento ou fala.|
|**Incapacitado**|Não pode realizar Ações, Movimento voluntário, Reações, Esquiva ou Bloqueio, mas ainda percebe o ambiente salvo outro efeito.|
|**Inconsciente**|Não percebe o ambiente e sofre todas as restrições de Incapacitado.|

Em materiais anteriores, **Completamente Incapacitado** significa Incapacitado.

### Exposição, controle e dano contínuo

|Condição|Regra|
|---|---|
|**Exposto**|O próximo ataque válido que escolha o alvo e exija rolagem acerta automaticamente; o alvo não pode Esquivar nem Bloquear esse ataque. Exposto termina após a resolução.|
|**Controlado**|A origem decide as Ações e o Movimento do alvo. Ações diretamente autodestrutivas exigem autorização expressa da fonte.|
|**Sangrando**|No fim de cada turno, perde `1 PV` uma única vez enquanto a condição persistir. Sangrando termina quando uma estabilização ou outra fonte parar o sangramento correspondente.|

Em materiais anteriores, **Completamente Controlado** significa Controlado. Se houver várias causas de sangramento, Sangrando persiste até que todas sejam tratadas; perdas mais graves precisam de regra específica.

## Fenômenos diferentes de efeitos temporários

**Desarmar** é um resultado imediato: o objeto cai no espaço definido pela fonte. Recuperá-lo depende da posição e das Ações disponíveis. Não há um efeito persistente Desarmado.

**Morrendo** é um estado derivado das regras de PV e morte, e não uma condição que uma fonte causa livremente. Ao chegar a `0 PV`, o personagem fica **Inconsciente** conforme [Morte e Inconsciência](Morte%20e%20Inconsciência.md). Ao sair de Morrendo, deixa de estar Inconsciente se nenhuma outra causa o mantiver nesse estado.

**Vulnerabilidade** é uma relação de dano: a fonte precisa indicar um tipo, uma origem específica ou todos os danos. “Vulnerável” sem escopo está incompleto.

**Consequências** como Trauma, Ferimento Grave, Sequela e Aflição exigem tratamento próprio. Podem manter uma condição enquanto forem relevantes. Se “Tornozelo Esmagado” mantiver Imobilizado, a condição termina após o tratamento adequado, desde que não haja outra causa. Recuperar PV, Exaustão ou Estresse não encerra a consequência por si só.

## Tipos de dano

O tipo de dano só produz diferença mecânica quando uma regra o considera, como Proteção, Resistência, Vulnerabilidade, Imunidade ou uma habilidade específica. Sem uma regra desse tipo, sua função é descritiva e ficcional.

### Físicos

|Tipo|Exemplos|
|---|---|
|**Cortante**|Espadas, machados, garras e lâminas.|
|**Perfurante**|Flechas, lanças, presas e projéteis penetrantes.|
|**Concussão**|Martelos, impactos, colisões e esmagamento.|

### Elementais e materiais

|Tipo|Exemplos|
|---|---|
|**Fogo**|Chamas, calor extremo e combustão.|
|**Gelo**|Congelamento e extração intensa de calor.|
|**Elétrico**|Descargas e correntes elétricas.|
|**Ácido**|Substâncias e efeitos corrosivos.|
|**Veneno**|Toxinas, peçonhas e substâncias nocivas ao organismo.|

### Sobrenaturais

|Tipo|Exemplos|
|---|---|
|**Força**|Impacto de energia pura, pressão mágica e efeitos cinéticos sobrenaturais.|
|**Trovejante**|Som concentrado, vibração e ondas de pressão.|
|**Arcano**|Energia mágica bruta que não se manifesta como outro tipo mais apropriado.|
|**Psíquico**|Agressões à mente, percepção ou consciência.|
|**Necrótico**|Deterioração sobrenatural da vida e da matéria orgânica.|
|**Radiante**|Luz destrutiva e energia proveniente de forças, entidades ou símbolos sagrados.|

Terra, água, ar, plantas, luz, sombra e outros temas não determinam sozinhos um tipo. Use o tipo que descreve o resultado concreto. Uma pedra arremessada normalmente causa Concussão; água fervente pode causar Fogo; espinhos causam Perfurante.

Descrições antigas que mencionem **Esmagamento**, **Frio**, **Sagrado** ou **Sônico** usam, respectivamente, Concussão, Gelo, Radiante ou Trovejante.

O tipo não causa efeitos adicionais implicitamente. Dano Cortante não causa Sangrando, Fogo não cria queimadura e Veneno não cria Aflição sem que a fonte declare esses resultados separadamente.

## Proteção, Resistência, Vulnerabilidade e Imunidade

Ao sofrer dano, aplique os modificadores nesta ordem:

1. reduza o dano pela **Redução de Dano por Bloqueio (RDB)** aplicável;
2. aplique **Resistência**, reduzindo pela metade o dano restante e arredondando para baixo;
3. aplique **Vulnerabilidade**, dobrando o dano restante do escopo afetado;
4. aplique **Imunidade**, reduzindo a `0` o dano do tipo correspondente.

Se a criatura possuir Resistência e Vulnerabilidade ao mesmo tipo, ambas se anulam antes do cálculo. Imunidade continua prevalecendo.

Quando um ataque causar mais de um tipo, separe os valores antes de aplicar Resistências, Vulnerabilidades ou Imunidades. RDB só se aplica quando a regra de Bloqueio ou a fonte da proteção permitir.

## Pontos de Vida Temporários

**PV Temporários** absorvem dano antes dos PV. Depois de aplicar a ordem acima, subtraia o dano restante primeiro dos PV Temporários; o que sobrar passa aos PV.

- PV Temporários não acumulam. Ao receber novos, a criatura fica com o maior valor entre os atuais e os novos.
- Não são recuperação: não contam como cura, não estabilizam e não encerram a contagem de Morrendo.
- Terminam quando chegam a `0` ou quando a duração declarada pela fonte acaba.
