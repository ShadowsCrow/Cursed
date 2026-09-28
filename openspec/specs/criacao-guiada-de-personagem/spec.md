# criacao-guiada-de-personagem Specification

## Purpose
Conduzir o jogador pela criação de um personagem, etapa por etapa, conforme o capítulo "Criação de Personagem" do livro de regras, explicando cada escolha e mostrando seus efeitos antes de gravar, para que uma pessoa nova no sistema termine com uma ficha coerente sem conhecer as regras de cor.

## Requirements

### Requirement: Criação de personagem pelo assistente
Quando a política da mesa permitir que o jogador crie a própria ficha, a ação de criar personagem SHALL abrir um assistente em etapas no lugar de um diálogo com um único campo. O assistente SHALL cobrir, nesta ordem: Conceito, Identidade, Raça, Classe e arquétipo, Atributos, Perícias, Personalidade e Conferência. As etapas do livro que a plataforma ainda não representa (Vantagens e Desvantagens, equipamento inicial, Acessos e Escola de Especialização) SHALL NOT aparecer como etapa; a Conferência SHALL informar que elas serão combinadas com o Narrador fora do assistente. A criação de NPCs e monstros pelo Narrador SHALL continuar como está.

#### Scenario: Jogador inicia a criação
- **WHEN** um jogador com permissão de criar a própria ficha escolhe "Criar personagem"
- **THEN** o assistente abre na etapa Conceito, mostra as oito etapas e a posição atual

#### Scenario: Mesa que não permite criação
- **WHEN** a política da mesa não permite que o jogador crie a própria ficha
- **THEN** a ação de criar não é oferecida e a lista informa que a criação não é permitida nesta mesa

#### Scenario: Narrador cria uma entidade
- **WHEN** o Narrador escolhe "Nova entidade"
- **THEN** abre o diálogo de entidade já existente, e não o assistente

### Requirement: Navegação e explicação por etapa
Cada etapa SHALL apresentar, em linguagem de mesa, o que o livro pede naquele passo e por quê, antes dos campos. O jogador SHALL poder voltar a qualquer etapa já visitada sem perder o que preencheu e SHALL poder avançar apenas quando a etapa atual estiver válida. Etapas não visitadas SHALL NOT poder ser puladas por meio da lista de etapas. Uma etapa inválida SHALL indicar o que falta junto ao campo ou ao contador correspondente, e não apenas desabilitar o botão de avançar.

#### Scenario: Voltar sem perder dados
- **WHEN** o jogador preencheu Raça e Classe, avança até Atributos e volta para Raça
- **THEN** a escolha de raça e a de classe continuam preenchidas e nada é reenviado

#### Scenario: Avanço bloqueado com motivo
- **WHEN** o jogador tenta avançar da etapa Identidade sem informar o nome
- **THEN** o assistente permanece na etapa e indica junto ao campo Nome que o nome é obrigatório

#### Scenario: Etapa futura não acessível
- **WHEN** o jogador está na etapa Raça e ativa "Perícias" na lista de etapas
- **THEN** o assistente permanece em Raça, porque as etapas intermediárias ainda não foram concluídas

### Requirement: Identidade do personagem
A etapa Identidade SHALL pedir o nome (obrigatório), a idade (inteiro maior ou igual a `0`, opcional) e o sexo (uma das opções da lista de sexo do sistema, opcional). O assistente SHALL NOT pedir nível: o personagem novo começa no nível `1`, conforme o livro, e níveis maiores são definidos pelo Narrador na ficha.

#### Scenario: Idade negativa
- **WHEN** o jogador digita idade `-3`
- **THEN** o campo indica que a idade não pode ser negativa e a etapa não avança

#### Scenario: Nível não é perguntado
- **WHEN** o jogador percorre todas as etapas
- **THEN** nenhuma etapa pergunta o nível, e o personagem criado está no nível `1`

### Requirement: Escolha de raça, classe e arquétipo com significado visível
Raça, classe e arquétipo SHALL ser escolhidos das listas do catálogo, com a mesma dependência da ficha: a lista de arquétipos mostra apenas os da classe escolhida, e trocar a classe limpa um arquétipo que não pertença à nova. Ao escolher, a etapa SHALL mostrar o que a escolha implica, exatamente como o catálogo registra: Tamanho e Deslocamento da raça; as quatro bases de PV e PP da classe; o conceito do arquétipo; e os nomes das habilidades que o personagem receberá já aprendidas. Habilidades placeholder SHALL NOT ser listadas, e uma raça sem habilidade real SHALL ser informada como tal. O assistente SHALL NOT sugerir Proficiência ou Acesso pelo nome da classe ou do arquétipo. Valores que o catálogo não traz SHALL aparecer como "não informado", sem estimativa.

#### Scenario: Arquétipo depende da classe
- **WHEN** o jogador escolhe a classe Gatuno
- **THEN** a lista de arquétipos mostra somente Ladrão, Assassino e Psionico

#### Scenario: Troca de classe limpa o arquétipo
- **WHEN** o jogador escolheu Gatuno e Assassino e muda a classe para Mago
- **THEN** o arquétipo fica vazio, a etapa avisa que é preciso escolher outro, e não avança sem ele

#### Scenario: Significado da classe
- **WHEN** o jogador escolhe a classe Mago
- **THEN** a etapa mostra PV base `12`, Escala de PV `2`, PP base `8` e Escala de PP `5`, como no catálogo, e as habilidades que receberá

#### Scenario: Raça sem habilidade real
- **WHEN** o jogador escolhe Humano, cuja única habilidade no catálogo é um placeholder
- **THEN** a etapa informa que não há habilidades registradas para a raça e não lista o placeholder

### Requirement: Altura e Tamanho fora da média
Na etapa Raça, depois de escolher a raça, o jogador SHALL poder informar a altura do personagem em metros, vendo o intervalo típico da raça, e SHALL poder marcar que o personagem é fora da média da raça. Na média, o Tamanho SHALL ser o da raça e a altura SHALL ficar dentro do intervalo típico da raça. Fora da média, o jogador SHALL escolher entre mais alto e mais baixo; o Tamanho SHALL passar ao Tamanho vizinho (um passo) e a altura SHALL ficar dentro da faixa desse Tamanho. Um passo inexistente (abaixo de Minúsculo, acima de Colossal) SHALL NOT ser oferecido; a faixa do Colossal SHALL NOT ter limite superior. O Deslocamento SHALL continuar o da raça. Intervalos e faixas SHALL vir dos dados do sistema, nunca do código, e o servidor SHALL recusar na criação um Tamanho que não seja o da raça nem um passo dele, e uma altura fora do intervalo aplicável. A altura é opcional; depois da criação, o Tamanho continua exclusivo do Narrador.

#### Scenario: Humano na média
- **WHEN** o jogador escolhe Humano e informa altura `1,75`
- **THEN** a etapa mostra o intervalo `1,55` a `1,90`, o Tamanho continua Médio e a etapa avança

#### Scenario: Altura fora do intervalo da raça
- **WHEN** o jogador, na média, informa altura `2,20` para um Humano
- **THEN** o campo indica que a altura de um Humano na média vai de `1,55` a `1,90` e sugere marcar fora da média, e a etapa não avança

#### Scenario: Humano mais alto que a média
- **WHEN** o jogador marca fora da média, escolhe mais alto e informa `2,30`
- **THEN** o Tamanho passa a Grande, a etapa mostra a faixa `2,10` a `3,00` e a ficha criada tem Tamanho Grande e altura `2,30`

#### Scenario: Passo inexistente
- **WHEN** a raça é de Tamanho Colossal
- **THEN** a opção mais alto não é oferecida, porque não há Tamanho acima, e a opção mais baixo continua disponível

#### Scenario: Colossal sem teto
- **WHEN** um Golias marca fora da média, mais alto, e informa `12`
- **THEN** o Tamanho passa a Colossal e a altura é aceita

#### Scenario: Servidor recusa Tamanho a dois passos
- **WHEN** a criação de um Humano chega com Tamanho Enorme
- **THEN** o servidor recusa com problema no campo Tamanho, explicando que fora da média o Tamanho fica um passo acima ou abaixo do da raça

### Requirement: Distribuição guiada dos Atributos
A etapa Atributos SHALL conduzir a distribuição do livro: entre os nove Atributos, um recebe `3`, quatro recebem `2` e quatro recebem `1`, totalizando `15` pontos. A etapa SHALL mostrar contadores do que falta atribuir para cada valor e SHALL impedir que um valor seja atribuído a mais Atributos do que a distribuição permite. A etapa SHALL avançar apenas quando os nove Atributos tiverem valor e a distribuição fechar, ou quando o jogador tiver escolhido seguir sem a distribuição padrão. Os valores gravados SHALL respeitar o limite de `1` a `5` por Atributo.

#### Scenario: Distribuição completa
- **WHEN** o jogador atribui `3` a Vigor, `2` a quatro Atributos e `1` aos outros quatro
- **THEN** os contadores mostram tudo atribuído e a etapa permite avançar

#### Scenario: Valor excedido
- **WHEN** o jogador já atribuiu `3` a um Atributo e tenta atribuir `3` a outro
- **THEN** o assistente não aceita e indica que o único `3` já foi usado, mostrando onde

#### Scenario: Atributo sem valor
- **WHEN** restam Atributos sem valor
- **THEN** a etapa não avança e os contadores indicam quantos `3`, `2` e `1` ainda faltam

### Requirement: Distribuição guiada das Perícias
A etapa Perícias SHALL conduzir a distribuição do livro: uma Perícia recebe `3`, três recebem `2`, quatro recebem `1` e todas as demais ficam em `0`, totalizando `13` pontos. As Perícias SHALL ser agrupadas como na ficha (Talentos, Técnicas, Conhecimentos). A etapa SHALL mostrar contadores do que falta e SHALL avançar apenas quando a distribuição fechar, ou quando o jogador tiver escolhido seguir sem a distribuição padrão. Os valores gravados SHALL respeitar o limite de `0` a `5` por Perícia. As Perícias não escolhidas SHALL ficar em `0` sem exigir ação do jogador.

#### Scenario: Perícias restantes em zero
- **WHEN** o jogador atribui `3`, três `2` e quatro `1` e não toca nas demais
- **THEN** a etapa considera a distribuição completa e as demais Perícias ficam em `0`

#### Scenario: Excesso de Perícias com valor
- **WHEN** o jogador atribui `1` a cinco Perícias
- **THEN** a etapa indica que só quatro Perícias podem ter `1` e não avança até corrigir

### Requirement: Saída explícita da distribuição padrão
Nas etapas Atributos e Perícias, o jogador SHALL poder escolher "seguir sem a distribuição padrão" para campanhas que usem regra própria. Nesse modo, os contadores SHALL virar informativos e apenas os limites de valor SHALL ser exigidos. A escolha SHALL ser reversível enquanto o assistente estiver aberto, SHALL ser registrada como aviso na Conferência, e SHALL NOT alterar nenhuma regra ou limite do servidor.

#### Scenario: Campanha com regra própria
- **WHEN** o jogador escolhe seguir sem a distribuição padrão nos Atributos e atribui `4` a dois Atributos
- **THEN** a etapa avança, e a Conferência mostra o aviso de que os Atributos não seguem a distribuição do livro

#### Scenario: Volta ao padrão
- **WHEN** o jogador desfaz a saída da distribuição padrão
- **THEN** os contadores voltam a bloquear o avanço até a distribuição fechar

#### Scenario: Limite do servidor continua valendo
- **WHEN** o jogador, sem a distribuição padrão, digita Vigor `6`
- **THEN** o campo indica que o Atributo base vai de `1` a `5`, e a etapa não avança

### Requirement: Personalidade opcional com dicas
A etapa Personalidade SHALL oferecer Alinhamento e Pecado Capital (listas do sistema) e os campos narrativos de personalidade da ficha, cada um com a dica de preenchimento do sistema, e todos SHALL ser opcionais. As listas e as dicas SHALL vir dos mesmos dados do sistema que a ficha usa, e SHALL NOT ser repetidas em código.

#### Scenario: Pular a personalidade
- **WHEN** o jogador avança da etapa Personalidade sem preencher nada
- **THEN** o assistente segue para a Conferência sem erro

#### Scenario: Dica sem gravar
- **WHEN** o campo "Vivo para" está vazio
- **THEN** o campo mostra a dica do sistema e não a grava como valor

### Requirement: Prévia dos valores calculada pelo servidor
A Conferência SHALL mostrar PV, PP e suas Escalas do rascunho, calculados pelo servidor com o mesmo cálculo da ficha viva, junto das fontes de cada valor (base da classe e Atributo usado). A prévia SHALL NOT gravar nada, SHALL NOT criar personagem, cartas ou registro de auditoria, e o cliente SHALL NOT recalcular esses valores por conta própria. Quando faltar uma entrada (por exemplo, a classe), o valor SHALL aparecer como "não calculável" com o motivo, sem estimativa.

#### Scenario: Mago com Vigor e Propósito
- **WHEN** o rascunho é um Mago com Vigor `2` e Propósito `2`
- **THEN** a Conferência mostra PV máximo `14`, Escala de PV `4`, PP máximo `10` e Escala de PP `7`, com as fontes de cada valor

#### Scenario: Classe ainda não escolhida
- **WHEN** a prévia é pedida para um rascunho sem classe
- **THEN** PV e PP aparecem como "não calculáveis" informando que falta a classe

#### Scenario: Prévia não cria nada
- **WHEN** a prévia é pedida várias vezes
- **THEN** nenhum personagem novo aparece na lista e nenhum evento de auditoria é registrado

### Requirement: Conferência final
A Conferência SHALL resumir todas as escolhas por etapa, com atalho para editar cada uma, e SHALL listar: avisos (como distribuição fora do padrão, campos opcionais vazios), problemas de validação do servidor por campo e o aviso de que Vantagens e Desvantagens, equipamento inicial e Acessos serão definidos com o Narrador. O botão de concluir SHALL ficar indisponível enquanto houver problema de validação que impeça a criação. Avisos SHALL NOT impedir a conclusão.

#### Scenario: Conferência com aviso
- **WHEN** o jogador chegou à Conferência tendo seguido sem a distribuição padrão de Perícias
- **THEN** a Conferência mostra o aviso e o botão de concluir continua disponível

#### Scenario: Problema do servidor
- **WHEN** a prévia informa que o arquétipo escolhido não pertence à classe
- **THEN** a Conferência mostra o problema junto ao resumo da etapa Classe e arquétipo, com atalho para corrigi-la, e o botão de concluir fica indisponível

### Requirement: Criação atômica
O personagem SHALL passar a existir somente quando o jogador concluir na Conferência, com uma única gravação contendo todos os dados do assistente. Até lá, nenhuma ficha parcial SHALL aparecer na lista, na mesa ou para o Narrador. Se a gravação falhar, o assistente SHALL permanecer aberto na Conferência com o erro do servidor e com todo o rascunho preservado. Concluída a criação, o assistente SHALL abrir a ficha do novo personagem e oferecer o envio do retrato.

#### Scenario: Criação concluída
- **WHEN** o jogador conclui a Conferência
- **THEN** o personagem é criado no nível `1` com Atributos, Perícias, raça, classe, arquétipo e personalidade escolhidos, as cartas das habilidades concedidas já aprendidas, e a ficha abre com a oferta de retrato

#### Scenario: Falha na gravação
- **WHEN** a gravação falha por erro de rede ou de validação
- **THEN** o assistente continua na Conferência, mostra o erro e mantém todas as escolhas, sem criar personagem duplicado ao tentar de novo

#### Scenario: Abandono no meio
- **WHEN** o jogador fecha o assistente na etapa Atributos
- **THEN** nenhum personagem foi criado

### Requirement: Rascunho recuperável
O progresso do assistente SHALL ser guardado no navegador do jogador, separado por mesa e por usuário, a cada alteração. Ao reabrir o assistente, o jogador SHALL poder retomar de onde parou ou descartar o rascunho e começar de novo. O rascunho SHALL ser removido ao concluir a criação e ao ser descartado. Se o armazenamento do navegador estiver indisponível, o assistente SHALL funcionar normalmente, sem recuperação. O rascunho SHALL NOT ser enviado ao servidor.

#### Scenario: Retomar depois de recarregar
- **WHEN** o jogador preencheu até Atributos, recarrega a página e escolhe "Criar personagem"
- **THEN** o assistente oferece "Continuar rascunho" e, ao aceitar, volta à etapa Atributos com tudo preenchido

#### Scenario: Descartar
- **WHEN** o jogador escolhe descartar o rascunho
- **THEN** o assistente abre vazio na etapa Conceito e o rascunho anterior não pode mais ser recuperado

#### Scenario: Rascunho de outra mesa
- **WHEN** o mesmo usuário abre o assistente em outra mesa
- **THEN** o rascunho da primeira mesa não aparece

#### Scenario: Armazenamento indisponível
- **WHEN** o navegador bloqueia o armazenamento local
- **THEN** o assistente funciona até o fim e não oferece a retomada

### Requirement: Uso por teclado, leitor de tela e telas pequenas
O assistente SHALL poder ser percorrido inteiramente pelo teclado e SHALL anunciar a etapa atual e seu progresso a leitores de tela. Ao mudar de etapa, o foco SHALL ir para o título da nova etapa. Erros SHALL ser associados ao campo a que se referem. Em telas de até `360` pixels de largura o assistente SHALL ser utilizável sem rolagem horizontal, com a lista de etapas condensada em indicador de progresso.

#### Scenario: Foco ao avançar
- **WHEN** o jogador avança de Raça para Classe e arquétipo usando o teclado
- **THEN** o foco vai para o título da etapa Classe e arquétipo e o leitor de tela anuncia "etapa 4 de 8"

#### Scenario: Tela pequena
- **WHEN** o assistente é aberto numa tela de `360` pixels de largura
- **THEN** todas as etapas cabem sem rolagem horizontal e a distribuição de Atributos continua operável
