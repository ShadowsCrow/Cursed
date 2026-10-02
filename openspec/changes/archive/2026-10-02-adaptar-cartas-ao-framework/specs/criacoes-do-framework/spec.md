# Spec Delta

## Purpose

Representa nas cartas de habilidade e magia os campos e as tabelas do Framework de Criação, calcula os valores que são consulta direta de tabela e permite trazer uma criação pronta por um código de importação.

## ADDED Requirements

### Requirement: Campos do Framework na carta
Cartas de habilidade e de magia SHALL poder guardar, cada um em separado, os campos do Framework de Criação: Tipo, Lançamento, Combo, Persistência, Alcance, Forma, Alvo ou Área, Impactos, Duração, Efeito Principal, Efeitos Secundários, Efeitos Condicionais, Teste, Componentes, Limitações e Escalonamento. Magias SHALL guardar também a Escola; habilidades, a Disciplina. O Acesso do Framework SHALL ser o campo Requisitos que a carta já tem, mostrado com o rótulo "Acesso" em habilidades e magias. A Natureza da criação SHALL ser o próprio tipo da carta (Habilidade ou Magia), sem campo à parte. Todos os campos SHALL ser opcionais: um campo vazio significa que ele não se aplica ou ainda não foi definido, e SHALL NOT ser preenchido pelo sistema.

#### Scenario: Narrador registra uma magia de área
- **WHEN** o Narrador salva uma magia com Alcance de 15 metros, Forma "Círculo", Alvo ou Área "Área de 5 metros" e Duração "Instantânea; Imobilizado por até um minuto"
- **THEN** a carta guarda cada valor no campo correspondente, e a descrição continua só com o texto que o Narrador escreveu

#### Scenario: Habilidade sem campos de magia
- **WHEN** o Narrador salva uma habilidade de combo com Combo "Bloqueio → Ataque Leve → Ataque Leve" e Disciplina "Técnica de Combate"
- **THEN** a carta guarda o Combo e a Disciplina, e não aceita o campo Escola

### Requirement: Opções fechadas do Framework
O Tipo SHALL ser uma destas opções: Ativa, Reação, Passiva condicional ou Passiva permanente. A Escola SHALL ser uma das oito escolas do livro de regras: Elemental, Somática, Perceptiva, Psíquica, Dimensional, Oculta, Sagrada da Criação ou Druídica. A Forma SHALL ser uma destas: Círculo, Esfera, Cone, Linha, Quadrado, Cubo, Golpe, Projétil, Corrente ou Aura. As opções SHALL vir do catálogo do sistema, não do código. Um valor fora das opções SHALL ser recusado na validação, com a mensagem junto do campo.

#### Scenario: Escola inexistente
- **WHEN** o Narrador tenta publicar uma magia com a Escola "Arcana"
- **THEN** a publicação é recusada e o problema aparece junto do campo Escola, com as opções válidas

### Requirement: Alcance em opções e metros
O Alcance SHALL ser uma destas opções: Pessoal, Toque, Alcance da arma ou uma distância em metros. A distância SHALL ser um número inteiro de metros, de `1` para cima, escolhido de 1 em 1 metro. As opções sem distância SHALL vir do catálogo do sistema. Na carta, o Alcance SHALL aparecer como "Pessoal", "Toque", "Alcance da arma" ou "{n} metros". Uma distância com fração, zero ou negativa SHALL ser recusada, com a mensagem junto do campo.

#### Scenario: Magia a 12 metros
- **WHEN** o Narrador escolhe a distância em metros e informa `12`
- **THEN** a carta guarda o alcance de 12 metros e o mostra como "12 metros"

#### Scenario: Toque
- **WHEN** o Narrador escolhe Toque
- **THEN** a carta mostra "Toque" e não pede distância

#### Scenario: Distância inválida
- **WHEN** um código de importação traz o alcance de `7,5` metros
- **THEN** a importação é recusada e o problema aponta o Alcance

### Requirement: Grau e Descansos Mínimos calculados
O sistema SHALL calcular o Grau e os Descansos Mínimos a partir do Custo de Aprendizado e da natureza da carta, pelas faixas do Framework guardadas no catálogo. O Grau SHALL ser mostrado pelo nome: Básica, Simples, Intermediária, Avançada, Especialista, Mestra ou Lendária. Sem Custo de Aprendizado, Grau e Descansos Mínimos SHALL ficar indefinidos. Um Custo de Aprendizado abaixo do mínimo da natureza (`6 PP` para habilidades, `12 PP` para magias) SHALL deixar o Grau indefinido e SHALL produzir um aviso. O Narrador SHALL NOT digitar Grau nem Descansos Mínimos.

#### Scenario: Magia de 26 PP
- **WHEN** o Narrador informa Custo de Aprendizado `26` numa magia
- **THEN** a carta mostra Grau "Intermediária" e Descansos Mínimos `6`

#### Scenario: Habilidade de 26 PP
- **WHEN** o Narrador informa Custo de Aprendizado `26` numa habilidade
- **THEN** a carta mostra Grau "Avançada" e Descansos Mínimos `8`

#### Scenario: Magia abaixo do mínimo
- **WHEN** o Narrador informa Custo de Aprendizado `10` numa magia
- **THEN** o Grau fica indefinido e um aviso diz que magias custam no mínimo `12 PP` para aprender

#### Scenario: Lendária
- **WHEN** o Narrador informa Custo de Aprendizado `87` numa magia
- **THEN** a carta mostra Grau "Lendária" e Descansos Mínimos `25`

### Requirement: Custo de Uso calculado pela Potência
O sistema SHALL calcular o Custo de Uso a partir da Potência de Uso pela fórmula do Framework guardada no catálogo: `Potência² ÷ 80`, arredondado para cima, com mínimo de `1 PP`. Uma carta de Tipo "Passiva permanente" SHALL ter Custo de Uso `0 PP`. O Narrador SHALL poder registrar outro Custo de Uso; nesse caso, a carta SHALL guardar o valor do Narrador e SHALL mostrar um aviso com o valor calculado pelo Framework, sem impedir a publicação. Sem Potência de Uso, o Custo de Uso SHALL ficar indefinido, salvo se o Narrador o registrar.

#### Scenario: Potência 20
- **WHEN** o Narrador informa Potência de Uso `20` numa magia ativa
- **THEN** a carta mostra Custo de Uso `5 PP`

#### Scenario: Potência 54
- **WHEN** o Narrador informa Potência de Uso `54`
- **THEN** a carta mostra Custo de Uso `37 PP`

#### Scenario: Valor do Narrador diferente do Framework
- **WHEN** o Narrador informa Potência de Uso `1` e registra Custo de Uso `3 PP`
- **THEN** a carta guarda `3 PP`, mostra um aviso de que o Framework daria `1 PP` e pode ser publicada

#### Scenario: Passiva permanente
- **WHEN** o Narrador marca uma habilidade como "Passiva permanente" e informa Potência de Uso `8`
- **THEN** a carta mostra Custo de Uso `0 PP`

### Requirement: Tabelas do Framework no catálogo
As faixas de Grau e de Descansos Mínimos de cada natureza, os custos mínimos, a fórmula do Custo de Uso e as opções de Tipo, Escola e Forma SHALL ficar num catálogo JSON do sistema, lido pela plataforma como os demais catálogos e registrado na procedência dos catálogos. Um catálogo inválido SHALL impedir a carga da plataforma com uma mensagem que diga o arquivo e o problema. Os valores do catálogo SHALL ser iguais aos de `rules/sistema` na data da mudança.

#### Scenario: Ajuste futuro de uma faixa
- **WHEN** o usuário altera, no catálogo, o limite superior da faixa Básica de magias
- **THEN** as cartas passam a mostrar o Grau pela faixa nova sem mudança no código

#### Scenario: Catálogo com faixas sobrepostas
- **WHEN** o catálogo declara duas faixas de Grau de magia que se sobrepõem
- **THEN** a plataforma não carrega o catálogo e informa o arquivo e as faixas em conflito

### Requirement: Código de importação de criações
O sistema SHALL aceitar um código de criação com o prefixo `CR1`, no mesmo formato portátil dos códigos de efeito e equipamento: o prefixo, dois-pontos e o conteúdo JSON comprimido e codificado em base64 seguro para URL. O conteúdo SHALL declarar a natureza (habilidade ou magia), o título e a descrição, e MAY trazer qualquer campo do Framework, a Potência de Uso, o Custo de Aprendizado, o Custo de Uso, os custos adicionais, os requisitos e as marcações. Grau e Descansos Mínimos presentes no código SHALL ser ignorados e recalculados; se divergirem do cálculo, a pré-visualização SHALL avisar. Um código com campo desconhecido, opção fora das listas ou valor inválido SHALL ser recusado sem criar nada, com os problemas explicados.

#### Scenario: Código válido de magia
- **WHEN** o Narrador cola um código `CR1` de uma magia Druídica com Custo de Aprendizado `31` e Potência de Uso `20`
- **THEN** a pré-visualização mostra os campos, o Grau "Intermediária", os Descansos Mínimos `6` e o Custo de Uso `5 PP` antes de criar o rascunho

#### Scenario: Grau divergente no código
- **WHEN** o código traz Custo de Aprendizado `26` e Grau "Básica"
- **THEN** a pré-visualização mostra o Grau "Intermediária" e avisa que o Grau do código foi substituído pelo calculado

#### Scenario: Código corrompido
- **WHEN** o Narrador cola um código `CR1` cujo conteúdo não pode ser lido
- **THEN** a importação é recusada, nenhuma carta é criada e a mensagem diz que o código é inválido

### Requirement: Skill de criação gera o código
A skill `arquiteto-de-magias` SHALL terminar cada criação calculada (modos Geração, Cálculo e Revisão) com um código `CR1` pronto para colar na importação de cartas. O código SHALL ser produzido pelo codificador do próprio projeto, a partir dos valores apresentados na resposta, e SHALL NOT ser montado à mão. Quando faltarem dados para calcular, a skill SHALL NOT gerar código.

#### Scenario: Geração de uma magia
- **WHEN** o Narrador pede à skill uma magia de grau Intermediário
- **THEN** a resposta termina com um código `CR1` que, importado, reproduz os mesmos campos, custos e o mesmo Grau da resposta

#### Scenario: Dados insuficientes
- **WHEN** o Narrador pede o cálculo de uma criação sem informar o alcance
- **THEN** a skill pergunta o alcance e não gera código até ter os dados

### Requirement: Pré-visualização da importação como revelação da carta
A pré-visualização de um código de importação SHALL mostrar a carta importada como protagonista, no estilo de uma revelação de carta (decisão do usuário em 2026-10-01, com o conceito escolhido em `arte/conceito-previa.png` desta mudança): a carta grande, com o mesmo desenho das cartas da ficha, sobre um fundo escuro com brilho; ao lado, ou abaixo em telas estreitas, os valores calculados em destaque (Grau, Custo de Uso e Potência de Uso, quando a carta é habilidade ou magia), os demais campos preenchidos, os avisos e os problemas, e as ações "Criar rascunho" e "Cancelar". Antes da pré-visualização, a tela SHALL mostrar só o campo do código. Molduras e ornamentos SHALL ser SVG ou CSS; pinturas SHALL ser opcionais, sem imagem quebrada quando faltam. O brilho e a inclinação da carta SHALL respeitar `prefers-reduced-motion`. O resultado SHALL ser aprovado pelo usuário por comparação com o conceito.

#### Scenario: Código de magia válido
- **WHEN** o Narrador cola o código CR1 da Lume de Brasa e pré-visualiza
- **THEN** a carta aparece grande, com os destaques Grau "Básica", Custo de Uso `1 PP` e Potência `6`, os demais campos, a indicação de que não há avisos e o botão "Criar rascunho" disponível

#### Scenario: Código com problemas
- **WHEN** o código traz um alcance inválido
- **THEN** a carta aparece, os problemas aparecem com o rótulo do campo e "Criar rascunho" fica indisponível

#### Scenario: Celular
- **WHEN** a pré-visualização abre numa tela de 375 pixels
- **THEN** a carta fica acima das informações, sem rolagem horizontal

