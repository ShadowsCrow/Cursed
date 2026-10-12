# Exaustão, Estresse e Consequências

Este é um sistema de **núcleo**. Exaustão e Estresse são trilhas temporárias de desgaste; Trauma, Ferimento Grave, Sequela, Aflição e Outra Consequência são registros persistentes separados. Um mesmo evento só altera as duas trilhas quando sua regra disser isso expressamente.

Quando Exaustão, Estresse ou uma consequência mudar, acompanhe seu valor, sua causa e seus efeitos. As regras abaixo determinam o que acontece em cada faixa.

## Exaustão

Exaustão representa desgaste físico, esforço extremo e efeitos que consomem a vitalidade. Ela vai de `0` a `15`.

### Faixas de Exaustão

|Exaustão|Estado|Efeito derivado|
|---:|---|---|
|`0–5`|Estável|Sem penalidade.|
|`6–8`|Cansado|`-1` em testes físicos.|
|`9–11`|Exausto|`-2` em testes físicos e `-1` em Defesas.|
|`12–14`|No Limite|`-3` em testes físicos, `-1` em testes mentais e sociais e `-3 m` de Movimento.|
|`15`|Colapso Físico|Fica Inconsciente e incapaz de realizar ações até receber auxílio ou recuperação aplicável.|

Testes físicos são os que usam Força, Destreza ou Vigor. Testes mentais e sociais são os que usam Carisma, Manipulação, Propósito, Percepção, Inteligência ou Raciocínio. Uma regra específica pode declarar outra classificação.

Os efeitos das faixas são **derivados**: entram e saem automaticamente quando a Exaustão muda. Eles não são registrados como ferimentos independentes.

### Ganho de Exaustão

|Fonte|Exaustão ganha|
|---|---|
|Magia, habilidade ou efeito que consuma a vitalidade do próprio usuário|`+1` a `+3`, conforme a criação.|
|Sofrer dano equivalente a 40% ou mais do PV máximo|`+1`.|
|Ação extrema forçada, como correr gravemente ferido|`+1`.|
|Ficar com 1 PV ou menos|`+2`.|
|Efeito mágico, mutação ou outra fonte|Valor declarado pelo efeito.|

O Narrador aplica uma mesma fonte uma única vez para o mesmo evento, salvo quando a regra disser que ela se repete. A Exaustão nunca ultrapassa `15`, e qualquer excedente não vira pontos ocultos ou permanentes.

### Esforço físico

Antes de resolver uma Ação ou teste físico, um personagem com menos de `15` de Exaustão pode assumir de `+1` a `+3` de Exaustão. Para cada ponto assumido, escolha um benefício:

- receber `+1` no teste físico daquela ação; ou
- aumentar seu Movimento em `1 m` durante aquela ação.

O personagem só pode usar Esforço físico uma vez por Ação ou teste. O bônus não aumenta diretamente dano, cura ou Defesa.

O benefício e a ação são resolvidos **antes** de aplicar a Exaustão assumida. Se o custo levar a Exaustão a `15`, o personagem conclui a ação e então entra em Colapso Físico. Um personagem que já esteja em Colapso Físico não pode usar Esforço físico.

### Colapso Físico e excedente

Chegar a `15` causa Colapso Físico, mas não cria automaticamente Ferimento Grave, Sequela ou morte.

Quando um evento tentaria adicionar Exaustão a um personagem que já está em `15`:

1. a Exaustão permanece em `15`;
2. o Narrador aplica no máximo uma consequência física coerente com a fonte, como **Debilidade Extrema**;
3. se a fonte já declarar um Ferimento Grave, uma Sequela ou outra consequência, use a consequência declarada e não crie outra consequência genérica pelo mesmo evento.

Morte só ocorre quando a fonte ou a situação ficcional for expressamente letal. Receber Exaustão adicional de uma origem não letal nunca mata apenas porque o limite já foi alcançado.

## Estresse

Estresse representa pressão mental e emocional. Ele vai de `0` a `10`. As faixas são iguais para todos os personagens; classes, habilidades e outros efeitos podem modificar aquisição, capacidade ou penalidades quando declararem isso expressamente.

### Faixas de Estresse

|Estresse|Estado|Efeito derivado|
|---:|---|---|
|`0–4`|Controlado|Sem penalidade.|
|`5–6`|Pressionado|`-1` em testes mentais e sociais.|
|`7–8`|Abalado|`-2` em testes mentais e sociais e `-1` em testes físicos.|
|`9`|À Beira|`-3` em testes mentais e sociais, `-1` em testes físicos e não pode assumir Estresse voluntariamente.|
|`10`|Colapso Mental|Sofre uma manifestação de colapso coerente com a cena e fica fora de participação efetiva até receber auxílio pertinente ou o conflito imediato terminar.|

Os efeitos das faixas são derivados e deixam de existir automaticamente quando o Estresse diminui.

### Esforço mental

Antes de resolver uma Ação ou teste mental ou social, um personagem com menos de `9` de Estresse pode assumir de `+1` a `+3` de Estresse. Cada ponto assumido concede `+1` somente ao teste declarado.

O personagem só pode usar Esforço mental uma vez por Ação ou teste. O bônus não aumenta diretamente dano, cura, Defesa ou a CD de uma habilidade ou magia.

O benefício e o teste são resolvidos **antes** de aplicar o Estresse assumido. Um personagem com `8` pode assumir `+2`, concluir a ação e então sofrer Colapso Mental. Um personagem À Beira ou em Colapso Mental não pode usar Esforço mental.

### Colapso Mental

Ao chegar a `10` de Estresse:

1. o personagem sofre uma manifestação imediata coerente com a causa e com a cena;
2. o jogador pode escolher entre manifestações ficcionalmente válidas, como paralisar, fugir, render-se ou dissociar, sob validação do Narrador;
3. o personagem fica fora de participação efetiva até receber auxílio pertinente ou o conflito imediato terminar;
4. o Colapso cria um Trauma relacionado ou intensifica um Trauma equivalente já existente;
5. depois do auxílio ou do fim do conflito imediato, o Estresse retorna a `8`.

O retorno a `8` encerra o Colapso derivado, mas não remove o Trauma criado ou intensificado.

## Consequências persistentes

Consequências persistentes não ocupam pontos de Exaustão ou Estresse. Cada uma deve possuir identificador, categoria, nome, descrição, origem, manifestação ou efeito atual, estado e regra própria de tratamento ou encerramento. Gatilho é obrigatório quando ela reagir a uma situação específica; progressão e intensidade são opcionais.

|Categoria|Finalidade|
|---|---|
|**Trauma**|Consequência psicológica com gatilho e manifestação.|
|**Ferimento Grave**|Consequência física específica, estabilizável ou tratável.|
|**Sequela**|Consequência duradoura ou permanente com adaptação, mitigação ou remoção excepcional.|
|**Aflição**|Processo persistente ou progressivo, como doença, intoxicação, veneno, corrupção ou maldição.|
|**Outra Consequência**|Efeito persistente que não pertence às categorias anteriores.|

O estado de tratamento é **Ativo**, **Mitigado**, **Em tratamento** ou **Encerrado**. Uma consequência encerrada pode permanecer no histórico, mas deixa de produzir efeitos ativos.

Uma consequência pode justificar um efeito padronizado enquanto estiver ativa ou em certo estágio. Registre o vínculo na própria consequência; o jogador mantém o efeito oficial ativo enquanto ela o justificar. Ao encerrar a consequência, desative esse efeito apenas se nenhuma outra causa ainda o mantiver.

### Trauma

Trauma é uma consequência psicológica persistente. Ele surge somente:

- de um Colapso Mental; ou
- de uma magia, habilidade, criatura, situação ou decisão do Narrador que declare expressamente causar Trauma.

Receber três ou mais pontos de Estresse do mesmo contexto não cria Trauma por si só.

Todo Trauma registra:

- nome;
- origem ficcional;
- gatilho;
- manifestação ou consequência;
- estado e condição de tratamento;
- intensidade, quando houver progressão.

Na primeira vez em cada cena que o personagem enfrentar diretamente o gatilho de um Trauma, ele escolhe:

- receber `+1` de Estresse para agir normalmente; ou
- aceitar uma complicação coerente com a manifestação registrada.

Apoio relevante, preparação específica ou um efeito que neutralize o gatilho pode evitar ambos os custos quando a ficção justificar. O mesmo Trauma não cobra novamente seu custo padrão naquela cena.

Se um novo Colapso Mental tiver origem equivalente a um Trauma existente, intensifique esse Trauma conforme sua progressão em vez de criar uma cópia idêntica.

### Ferimento Grave

Ferimento Grave é uma consequência física específica e tratável, como **Costelas Fraturadas** ou **Queimadura Profunda**. Ele deve definir:

- a limitação causada;
- como pode ser estabilizado;
- como seu tratamento progride;
- quando é mitigado ou encerrado.

Reduzir Exaustão não cura um Ferimento Grave. Descanso comum só o afeta quando a regra do próprio ferimento ou de um tratamento disser isso expressamente.

### Sequela

Sequela é uma consequência duradoura e rara. Ela deve ser nomeada e ligada à origem que a causou, nunca representada por uma penalidade permanente anônima. Quando aplicável, deve indicar formas de adaptação, mitigação ou remoção excepcional.

Não existe uma trilha ou um campo de “Exaustão Permanente”.

### Aflição

Aflição representa um processo que continua depois da exposição inicial, como doença, veneno persistente, intoxicação, corrupção ou maldição progressiva. A exposição pode causar dano, exigir resistência e criar a Aflição, mas esses resultados são resolvidos separadamente.

Cada Aflição declara seus estágios e gatilhos de progressão quando existirem. Sem progressão declarada, ela permanece estável. Remover um sintoma ou desativar um efeito que ela justificava não cura o processo; curar a Aflição encerra apenas os vínculos sustentados por ela.

### Outra Consequência

Use Outra Consequência para um efeito persistente que não seja Trauma, Ferimento Grave, Sequela ou Aflição. Ela continua exigindo origem, manifestação, estado e caminho de mudança; a categoria não autoriza uma penalidade anônima ou sem encerramento possível quando a ficção permitir tratamento.

## Ciclos de vida dos efeitos

|Ciclo|Fonte de verdade|Exemplos|Quando termina|
|---|---|---|---|
|Derivado|Valor ou condição atual.|Cansado, Abalado, Colapso Físico.|Quando a condição calculada deixa de valer.|
|Vinculado|Uma origem ativa.|Armadura equipada, habilidade sustentada.|Quando a origem é desativada.|
|Aplicado|Uma instância persistente.|Trauma, Ferimento Grave, Sequela, maldição.|Quando sua regra própria ou uma correção do Narrador o encerra.|

Efeitos derivados não devem ser copiados para a lista de efeitos aplicados. Um efeito vinculado deixa de funcionar com sua fonte, mas uma consequência aplicada anteriormente por essa fonte permanece até cumprir a própria regra.

## Recuperação

Os requisitos gerais e a recuperação de PV e PP estão em [Descansos e Recuperação](Descansos%20e%20Recuperação.md).

### Recuperação de Exaustão

|Método|Recuperação|
|---|---|
|Descanso Curto de 3 horas|`-1`.|
|Descanso Longo de 8 horas|Conforme o Conforto do abrigo: `0` nas notas `0–1`, `-1` nas notas `2–3` ou `-2` na nota `4`.|
|Ervas medicinais ou bálsamos consumidos durante o descanso|`-1` adicional.|
|Magia ou mutação específica|Valor declarado pelo efeito.|

### Recuperação de Estresse

|Método|Recuperação|
|---|---|
|Descanso Longo de 8 horas com sono|Conforme o Conforto do abrigo: `0` nas notas `0–1`, `-1` nas notas `2–3` ou `-2` na nota `4`.|
|Magia, habilidade de suporte ou ação de cuidado apropriada|`-1` adicional, no máximo uma vez por dia.|

### Conforto e Segurança do abrigo

As notas independentes de Conforto e Segurança vão de `0` a `4` e são avaliadas pelas condições reais do repouso, não pela quantidade de preparos realizados. Conforto determina a recuperação; Segurança determina se ameaças podem interromper o descanso. Somente Conforto `4` e Segurança `4` juntos permitem escolher um Foco de Repouso, que pode reduzir mais `1` de Exaustão **ou** Estresse. Critérios, valores completos e manutenção do abrigo estão em [Descansos e Recuperação](Descansos%20e%20Recuperação.md).

Reduzir PV perdido, Exaustão ou Estresse não remove automaticamente Trauma, Ferimento Grave, Sequela, Aflição ou Outra Consequência nem as condições ainda vinculadas a elas. Essas consequências só avançam tratamento, são mitigadas ou são encerradas quando sua própria regra ou uma fonte aplicável declarar isso.

## Exemplos completos

### Último esforço físico

Iria está com `14` de Exaustão e precisa saltar uma ponte em colapso. Antes do teste físico, assume `+1` de Exaustão para receber `+1` no teste. Ela resolve o salto com o bônus. Depois da resolução, sua Exaustão chega a `15`: Iria entra em Colapso Físico e fica Inconsciente, mas o salto já foi concluído.

### Excedente no Colapso Físico

Tarek está com `15` de Exaustão após uma marcha e é obrigado a continuar caminhando. A nova Exaustão não aumenta a trilha nem causa morte. Como a marcha não declarou um ferimento específico, o Narrador aplica uma única consequência coerente, **Debilidade Extrema**, definindo seus efeitos e tratamento. Se a marcha já declarasse **Pés Dilacerados** como Ferimento Grave, apenas esse efeito seria aplicado pelo evento.

### Colapso Mental e Trauma novo

Nara está com `8` de Estresse e precisa convencer uma entidade a libertar um aliado. Ela assume `+2` de Estresse para receber `+2` no teste social. O teste é resolvido primeiro. Depois, Nara chega a `10`, escolhe ficar paralisada diante da entidade e recebe o Trauma **Vozes do Vazio**, com a entidade como origem e suas vozes como gatilho. Quando os aliados a retiram do confronto, seu Estresse retorna a `8`; o Trauma permanece.

### Colapso Mental e intensificação

Mais tarde, Nara sofre novo Colapso Mental diante da mesma entidade. Como **Vozes do Vazio** já registra uma origem e um gatilho equivalentes, o efeito existente é intensificado. Uma segunda cópia não é criada.

### Descanso não apaga consequências

Tarek possui **Pés Dilacerados** e `9` de Exaustão. Um Descanso Longo concluído em Conforto `4` reduz sua Exaustão para `7`, fazendo seu estado derivado mudar de Exausto para Cansado. O Ferimento Grave continua ativo porque seu tratamento próprio ainda não foi concluído. Da mesma forma, reduzir o Estresse de Nara não remove **Vozes do Vazio**.

## Diferença entre as trilhas

|Aspecto|Estresse|Exaustão|
|---|---|---|
|Origem típica|Mental e emocional.|Física e corporal.|
|Penaliza|Foco, interação e testes mentais ou sociais.|Capacidade física, Defesas e Movimento.|
|Colapso|Manifestação mental, Trauma e afastamento temporário da participação efetiva.|Inconsciência e incapacidade temporária.|
|Recuperação|Reduz a trilha; não apaga Trauma.|Reduz a trilha; não cura Ferimento Grave ou Sequela.|
