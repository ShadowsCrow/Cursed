# Catálogo de classes e raças

## Purpose

Oferecer classes, arquétipos e raças como catálogo do sistema, com os dados da ficha original, para que a ficha saiba o que cada escolha significa e o cálculo de valores tenha de onde tirar as bases.

## Requirements

### Requirement: Catálogo do sistema com procedência
A plataforma SHALL oferecer um catálogo de classes e um de raças, iguais para todas as mesas, a partir de uma cópia de `classes.json` e `racas.json` da ficha original. Essa cópia SHALL ser a fonte de trabalho enquanto classes e raças estiverem em desenvolvimento: o conteúdo é parametrizado pelo JSON e SHALL NOT ser duplicado em código. Cada classe SHALL ter nome, cor, as quatro bases (PV, Escala de PV, PP, Escala de PP), habilidades e arquétipos; cada arquétipo, nome, conceito e habilidades. Cada raça SHALL ter nome, deslocamento, tamanho e habilidades. O catálogo SHALL registrar de qual arquivo e versão a cópia veio. Valores ausentes SHALL NOT ser preenchidos por inferência. `classes.json` é a fonte oficial das bases de PV e PP.

#### Scenario: Bases preservadas exatamente
- **WHEN** o catálogo é carregado logo após a cópia
- **THEN** o Mago tem base de PV `12`, Escala de PV `2`, PP `8` e Escala de PP `5`, exatamente como em `classes.json`

#### Scenario: Procedência informada sem bloquear
- **WHEN** a cópia da plataforma foi editada e difere da origem registrada
- **THEN** o relatório de procedência informa a diferença, e o catálogo editado continua valendo

### Requirement: Edição do catálogo pelo JSON sem reiniciar
Uma alteração salva nos arquivos JSON do catálogo SHALL valer sem reiniciar o servidor. Se o arquivo salvo for inválido, o sistema SHALL manter a última versão válida e SHALL informar o erro ao Narrador. O sistema SHALL NOT oferecer um editor de catálogo dentro da aplicação nesta mudança.

#### Scenario: Base de classe alterada
- **WHEN** o usuário muda no JSON a base de PV do Mago de `12` para `14` e salva o arquivo
- **THEN** a próxima leitura da ficha de um Mago mostra o PV calculado com base `14`, sem reiniciar o servidor

#### Scenario: JSON com erro
- **WHEN** o arquivo de classes é salvo com um erro de sintaxe ou com uma base fora do formato `N + atributo`
- **THEN** o sistema continua com a última versão válida e o Narrador vê o erro, com o arquivo e o motivo

### Requirement: JSON prevalece sobre as cartas de catálogo
Quando uma habilidade de classe, arquétipo ou raça mudar no JSON, a carta correspondente em cada mesa SHALL receber uma nova versão com o conteúdo do JSON, mesmo que o Narrador a tenha editado. As cartas concedidas pelo catálogo SHALL passar para a nova versão. Uma habilidade nova no JSON SHALL ser concedida aos personagens daquela classe, arquétipo ou raça, e uma habilidade removida SHALL ter a carta arquivada e retirada deles. Cartas obtidas por outras vias SHALL NOT ser tocadas. Cada operação SHALL entrar no histórico.

#### Scenario: Texto de habilidade corrigido no JSON
- **WHEN** o usuário corrige no JSON o texto de uma habilidade do Druida
- **THEN** a carta dessa habilidade ganha uma nova versão em cada mesa, e os Druidas passam a ver o texto novo

#### Scenario: Edição do Narrador substituída
- **WHEN** o Narrador editou a carta de uma habilidade do Druida e depois o JSON dessa habilidade muda
- **THEN** a nova versão usa o texto do JSON, e a versão do Narrador continua no histórico da carta

#### Scenario: Conferência repetida
- **WHEN** a conferência roda de novo sem mudança no JSON
- **THEN** nenhuma versão nova é criada

### Requirement: Escolha de classe, arquétipo e raça
Na ficha, classe, arquétipo e raça SHALL ser escolhidos de listas do catálogo, e não digitados. A lista de arquétipos SHALL mostrar apenas os da classe escolhida. O servidor SHALL recusar a gravação de uma classe, arquétipo ou raça que não exista no catálogo, ou de um arquétipo de outra classe.

#### Scenario: Escolha de arquétipo depende da classe
- **WHEN** o jogador escolhe a classe Gatuno
- **THEN** a lista de arquétipos mostra somente Ladrão, Assassino e Psionico

#### Scenario: Troca de classe invalida o arquétipo
- **WHEN** a classe muda para outra que não tem o arquétipo escolhido
- **THEN** o arquétipo fica vazio e a ficha pede um novo arquétipo antes de gravar

#### Scenario: Valor fora do catálogo pela API
- **WHEN** uma gravação tenta registrar a raça "Centauro", que não existe no catálogo
- **THEN** o sistema recusa a gravação e informa que a raça não existe no catálogo

#### Scenario: Troca de raça com Tamanho atual explícito
- **WHEN** o Narrador troca a raça de um personagem que tem Tamanho atual informado na ficha
- **THEN** o sistema exige limpar ou reconfirmar esse Tamanho, para que a grade não use por acidente um valor da raça anterior

### Requirement: Apresentação da classe e do arquétipo
A ficha SHALL mostrar a cor da classe no cabeçalho e o conceito do arquétipo escolhido, como na ficha original. A cor SHALL ser um complemento: o nome da classe continua escrito.

#### Scenario: Jogador vê o conceito do arquétipo
- **WHEN** o personagem é um Mago Mutante Arcano
- **THEN** a ficha mostra o conceito do arquétipo Mutante Arcano e o cabeçalho usa a cor do Mago junto do nome da classe

### Requirement: Habilidades de classe, arquétipo e raça como cartas
Cada habilidade de classe, arquétipo e raça do catálogo SHALL existir como carta de habilidade publicada na mesa, com título, texto e ativação (passiva ou ativa) do catálogo e procedência que identifique a classe, o arquétipo ou a raça de origem. Custos que o catálogo não declara em campos próprios SHALL ficar vazios, sem inferência. Habilidades placeholder, como uma habilidade chamada "nome" com descrição "descricao", SHALL NOT virar carta.

#### Scenario: Cartas da classe na biblioteca da mesa
- **WHEN** um personagem da mesa escolhe a classe Druida pela primeira vez
- **THEN** as habilidades do Druida aparecem na biblioteca do Narrador como cartas publicadas, marcadas com a origem "Classe: Druida"

#### Scenario: Raça sem habilidade real
- **WHEN** o personagem é Humano, cuja única habilidade no catálogo é um placeholder
- **THEN** nenhuma carta de raça é criada e a ficha informa que não há habilidades registradas para a raça

### Requirement: Concessão automática das habilidades
Ao escolher classe, arquétipo ou raça, o personagem SHALL receber as cartas das habilidades correspondentes já no estado "aprendida", sem custo de aprendizado nem descanso, conforme `Progressão e Proficiência.md` para habilidades automáticas. Ao trocar de classe, arquétipo ou raça, as cartas concedidas pela escolha anterior SHALL ser removidas e as da nova escolha concedidas. Cada concessão e remoção SHALL entrar no histórico. O catálogo não traz o nível de cada habilidade em campo próprio; as indicações de nível dentro do texto são progressões da própria habilidade, e a concessão SHALL NOT depender do nível.

#### Scenario: Personagem vira Druida Animalista
- **WHEN** o Narrador define a classe Druida e o arquétipo Animalista para um personagem
- **THEN** o personagem recebe, já aprendidas, as cartas das habilidades do Druida e do Animalista, identificando de onde vem cada uma

#### Scenario: Troca de arquétipo
- **WHEN** o arquétipo muda de Animalista para Caminho Feral
- **THEN** as cartas do Animalista são removidas, as do Caminho Feral são concedidas, e as cartas da classe continuam

#### Scenario: Habilidades obtidas por outras vias não são tocadas
- **WHEN** o personagem troca de classe e tem uma habilidade aprendida por oferta do Narrador
- **THEN** essa habilidade continua, e só as cartas concedidas pela classe anterior são removidas

### Requirement: Fichas antigas fora do catálogo
Uma ficha existente com classe, arquétipo ou raça escrita à mão que não corresponda ao catálogo SHALL continuar legível, com o valor original visível. O sistema SHALL sinalizar o valor para o Narrador vincular a uma opção do catálogo e SHALL NOT trocá-lo automaticamente.

#### Scenario: Narrador vincula uma classe antiga
- **WHEN** o Narrador abre uma ficha com a classe "mago" em minúsculas escrita à mão
- **THEN** a ficha mostra "mago" com o aviso de valor fora do catálogo e oferece vincular ao Mago; a troca só acontece quando o Narrador confirma
