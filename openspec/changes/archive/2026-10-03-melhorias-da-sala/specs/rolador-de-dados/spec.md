# Spec Delta

## Purpose

Rolador de dados dentro da Sala, na aba Dados do painel, para que jogadores e Narrador rolem dados sem sair da mesa, de forma tão direta quanto o rolador do Google.

## ADDED Requirements

### Requirement: Montagem da rolagem
A aba Dados SHALL ter um botão para cada dado: **d4**, **d6**, **d8**, **d10**, **d12**, **d20** e **d100**. Cada toque num botão SHALL acrescentar um dado daquele tipo à rolagem em montagem; o clique com o botão direito SHALL tirar um dado daquele tipo, sem abrir o menu do navegador, e Delete ou Backspace com o foco no botão SHALL fazer o mesmo (item 10). Sem nenhum dado daquele tipo, tirar não muda nada. A aba SHALL ter um modificador inteiro, começando em 0, com botões **−** e **+** que o diminuem ou aumentam em 1.

A aba SHALL mostrar a expressão montada, com os dados agrupados por tipo na ordem d4, d6, d8, d10, d12, d20, d100 e o modificador no fim quando diferente de 0 (por exemplo `2d6 + 1d20 + 3` ou `1d20 − 1`). Sem dados, a expressão SHALL avisar que é preciso escolher ao menos um dado.

Um botão **Limpar** SHALL zerar os dados, o modificador e o resultado mostrado no visor; o histórico continua (ele tem o próprio "Limpar histórico"). "Limpar" SHALL ficar desativado quando não houver nada a limpar. O botão **Rolar** SHALL ficar desativado enquanto não houver nenhum dado. Cada tipo de dado SHALL aceitar no máximo 99 dados, e o modificador SHALL ficar entre −99 e +99; o botão que passaria do limite SHALL ficar desativado.

Cada botão de dado SHALL mostrar a pintura daquele dado, no estilo das artes do jogo, com o número do tipo na face da frente (4, 6, 8, 10, 12, 20, 100) e o nome (`d20`) abaixo. Enquanto a pintura carrega, ou se ela faltar, o botão SHALL mostrar um desenho em traço do dado no mesmo espaço, sem mudar de tamanho.

#### Scenario: Montar 2d6 + 1d20 + 3
- **WHEN** o jogador toca d6 duas vezes, d20 uma vez e + três vezes
- **THEN** a expressão mostra `2d6 + 1d20 + 3` e "Rolar" fica ativo

#### Scenario: Tirar um dado com o botão direito
- **WHEN** a rolagem está em `3d6 + 1d20` e o jogador clica com o botão direito no d6
- **THEN** a rolagem passa a `2d6 + 1d20`, e o menu do navegador não aparece

#### Scenario: Sem dados não rola
- **WHEN** alguém abre a aba Dados sem tocar em nenhum dado
- **THEN** a expressão pede para escolher um dado e "Rolar" fica desativado, mesmo com o modificador diferente de 0

#### Scenario: Dados pintados
- **WHEN** alguém abre a aba Dados
- **THEN** cada botão mostra a pintura do seu dado e o nome dele, e o botão "Acrescentar d20" mostra o d20 com o número 20

#### Scenario: Limpar
- **WHEN** o Narrador monta `3d8 + 2`, rola e escolhe "Limpar"
- **THEN** a rolagem volta a não ter dados, o modificador volta a 0, o visor deixa de mostrar o total e os valores, e a rolagem continua no histórico

### Requirement: Resultado da rolagem
Ao escolher **Rolar**, a rolagem SHALL ser sorteada pelo servidor da aplicação, e não pelo navegador: cada dado de forma independente, com todas as faces de 1 até o número de faces igualmente prováveis, usando um gerador aleatório criptográfico. O d100 SHALL dar um valor de 1 a 100. O servidor SHALL recusar tipos de dado fora da lista, mais de 99 dados de um tipo, rolagem sem dados e modificador fora de −99 a +99. Só participantes da mesa, com a Sala ativa, SHALL poder rolar. Se o servidor não responder, a aba SHALL dizer que não foi possível rolar, e nada SHALL entrar no histórico.

O resultado SHALL mostrar o **total** em destaque (soma de todos os dados mais o modificador), a expressão rolada e o valor de cada dado, agrupado por tipo. O total SHALL ser anunciado a leitores de tela. A rolagem montada SHALL continuar montada depois de rolar, para poder rolar de novo. O resultado SHALL ficar no visor até a próxima rolagem ou até "Limpar".

O resultado SHALL NOT trazer nenhuma leitura mecânica: nada de sucesso, falha, crítico, CD ou vantagem.

#### Scenario: Rolar 2d6 + 3
- **WHEN** o jogador monta `2d6 + 3`, rola, e os dados saem 4 e 6
- **THEN** o resultado mostra total 13, a expressão `2d6 + 3` e os valores 4 e 6 sob d6

#### Scenario: Faces sem viés
- **WHEN** o servidor sorteia um dado de N faces muitas vezes
- **THEN** todo valor sai entre 1 e N, por um sorteio uniforme do gerador criptográfico

#### Scenario: Rolagem forjada não é aceita
- **WHEN** alguém pede ao servidor uma rolagem de 1d7, ou de 100d20, ou com modificador 150
- **THEN** o servidor recusa o pedido e nenhuma rolagem é guardada

#### Scenario: Servidor fora do ar
- **WHEN** o jogador escolhe "Rolar" e o servidor não responde
- **THEN** a aba avisa que não foi possível rolar, e o histórico não muda

#### Scenario: Rolar de novo a mesma montagem
- **WHEN** o jogador rola `1d20` e escolhe "Rolar" outra vez
- **THEN** sai um novo resultado de `1d20`, sem precisar montar a rolagem de novo

### Requirement: Histórico das rolagens
A aba SHALL mostrar, abaixo do resultado, as rolagens anteriores, da mais recente para a mais antiga, com a expressão, o total e os valores de cada dado, até as 20 mais recentes. Cada item SHALL ter **Rolar de novo**, que rola a mesma expressão como uma rolagem nova de quem escolheu. Um botão SHALL limpar o histórico. As rolagens de outras pessoas SHALL mostrar o nome de quem rolou.

O histórico da aba mostra as rolagens feitas desde que a Sala foi aberta neste navegador. Ele SHALL ter barra de rolagem própria (item 7): em telas com mais de 760 px de largura e 620 px de altura, o histórico ocupa o espaço que sobra no painel e só ele rola, enquanto o visor, os dados, o modificador e as opções ficam parados; em telas menores, ele tem altura máxima com rolagem própria, e o painel rola como antes. A lista do histórico SHALL poder receber o foco, para rolar pelo teclado. As opções da aba ficam num bloco **Opções** que abre e fecha, fechado por padrão. A rolagem montada, o último resultado e o histórico SHALL sobreviver à troca de aba do painel e ao recolher o painel.

#### Scenario: Histórico mantém as últimas 20
- **WHEN** o jogador faz 21 rolagens
- **THEN** o histórico mostra as 20 mais recentes, com a última no topo

#### Scenario: Rolar de novo pelo histórico
- **WHEN** o jogador monta `1d8 + 1`, rola, monta outra rolagem e escolhe "Rolar de novo" no item `1d8 + 1`
- **THEN** sai um novo resultado de `1d8 + 1`, que entra no topo do histórico

#### Scenario: Só o histórico rola
- **WHEN** o Narrador, numa tela de 1280 × 800, faz 12 rolagens
- **THEN** o painel não rola: o histórico mostra as rolagens com a própria barra de rolagem, e o visor e os dados continuam à vista

#### Scenario: Trocar de aba e voltar
- **WHEN** o jogador monta `2d6`, rola, abre a aba Fichas e volta para Dados
- **THEN** a montagem `2d6`, o último resultado e o histórico continuam lá

### Requirement: Rolagens da mesa
Cada rolagem SHALL ficar guardada no servidor da mesa, com quem rolou, a expressão, os valores de cada dado, o modificador, o total e o momento, e SHALL chegar às outras pessoas da Sala: na hora, pelo aviso em tempo real quando houver, e senão pela consulta periódica da Sala (a cada segundo). Só participantes da mesa SHALL ver as rolagens dela. Ao abrir a Sala, as rolagens anteriores SHALL NOT rolar no tabuleiro; só as que chegarem depois.

Na aba Dados, cada pessoa SHALL escolher **Mostrar rolagens**: **Só as minhas** ou **De toda a mesa**. O padrão é De toda a mesa. Com De toda a mesa, a rolagem recebida SHALL entrar no histórico com o nome de quem rolou e, com a animação ligada, rolar no tabuleiro; com Só as minhas, ela SHALL ser ignorada. A escolha SHALL ficar guardada neste navegador. 

#### Scenario: Ver a rolagem de outra pessoa
- **WHEN** Lion rola `1d20` e o Narrador está com "De toda a mesa"
- **THEN** o Narrador vê a rolagem de Lion no topo do histórico, com o nome "Lion", e os dados rolam no tabuleiro dele

#### Scenario: Ver só as próprias rolagens
- **WHEN** o Narrador escolhe "Só as minhas" e Lion rola `1d20`
- **THEN** a rolagem de Lion não aparece para o Narrador, nem no histórico nem no tabuleiro

#### Scenario: Sem tempo real
- **WHEN** Lion rola `1d20` numa mesa sem o tempo real (ambiente local) e o Narrador está com "De toda a mesa"
- **THEN** em até alguns segundos a rolagem de Lion aparece no histórico do Narrador e rola no tabuleiro dele

#### Scenario: Rolagens de outra mesa
- **WHEN** alguém de outra mesa pede as rolagens desta mesa
- **THEN** o servidor responde como se a mesa não existisse

### Requirement: Rolagem pela ficha
No topo da aba Dados, uma faixa compacta de retratos (a mesma das abas Fichas e Bolsa, menor) SHALL mostrar as fichas pelas quais a pessoa pode rolar, começando por **Sem ficha**:
- o jogador vê as fichas dele, e a primeira já vem escolhida;
- o Narrador vê as fichas dos personagens com token na cena aberta, e começa em "Sem ficha"; se a ficha escolhida sai da cena, a escolha volta a "Sem ficha".

Com uma ficha escolhida, a aba SHALL mostrar dois seletores, **Atributo** e **Perícia**, cada um com "Nenhum"/"Nenhuma" e os valores da ficha como ela os mostra (por exemplo "Destreza (+3)"); valores que a ficha não calcula ficam indisponíveis. Ao escolher um Atributo ou uma Perícia sem nenhum dado montado, a aba SHALL montar 1d20. A expressão SHALL mostrar as parcelas da ficha antes do modificador manual: `1d20 + Destreza (+3) + Furtividade (+2) + 1`.

Ao rolar, o navegador SHALL dizer só qual ficha, qual Atributo e qual Perícia; o servidor SHALL buscar os totais da própria ficha (os mesmos que a ficha mostra), somá-los e guardar a ficha e as parcelas na rolagem. O servidor SHALL recusar Atributo ou Perícia sem ficha, chaves que não existem na ficha ou sem valor calculável, e a rolagem por uma ficha que a pessoa não pode ler: o jogador só rola pelas próprias fichas, o Narrador por qualquer uma da mesa. O histórico SHALL mostrar o nome do personagem quando quem vê o conhece. "Rolar de novo" repete a mesma ficha, Atributo e Perícia.

#### Scenario: Jogador rola Destreza + Furtividade
- **WHEN** o jogador, com a ficha de Lion escolhida, escolhe Destreza (+3) e Furtividade (+2) sem montar dados, e rola
- **THEN** a aba monta 1d20, o servidor sorteia 9 e soma os valores da ficha, o total é 14, e o histórico mostra "Lion" e `1d20 + Destreza (+3) + Furtividade (+2)`

#### Scenario: Narrador rola por uma ficha da cena
- **WHEN** o Narrador escolhe o Lobo na faixa (o Lobo tem token na cena) e a Perícia Furtividade, e rola
- **THEN** a rolagem soma a Furtividade do Lobo e sai oculta dos jogadores, como as demais do Narrador

#### Scenario: Jogador não rola pela ficha de outro
- **WHEN** um jogador pede ao servidor uma rolagem pela ficha de outro jogador
- **THEN** o servidor recusa, e a faixa desse jogador nem mostra a ficha

#### Scenario: Sem ficha
- **WHEN** a pessoa escolhe "Sem ficha"
- **THEN** os seletores somem e a rolagem leva só os dados e o modificador

### Requirement: Rolagens ocultas do Narrador
As rolagens do Narrador SHALL sair, por padrão, ocultas dos jogadores: só o Narrador as vê, no histórico e no tabuleiro. Na aba Dados, só o Narrador SHALL ter a chave **Rolar oculto dos jogadores**, ligada por padrão e guardada neste navegador; desligada, as rolagens dele vão para a mesa como as de qualquer pessoa.

O servidor SHALL NOT entregar uma rolagem oculta a quem não é Narrador, nem na lista de rolagens nem no aviso em tempo real. Só o Narrador SHALL poder pedir uma rolagem oculta; o pedido de um jogador SHALL ser recusado. No visor e no histórico do Narrador, a rolagem oculta SHALL levar a marca "oculta".

#### Scenario: Rolagem do Narrador oculta por padrão
- **WHEN** o Narrador rola `1d20` sem mexer nas opções
- **THEN** a rolagem aparece para ele com a marca "oculta", e os jogadores não a recebem

#### Scenario: Narrador mostra as rolagens
- **WHEN** o Narrador desliga "Rolar oculto dos jogadores" e rola `1d8`
- **THEN** os jogadores com "De toda a mesa" veem a rolagem do Narrador no histórico e no tabuleiro

#### Scenario: Jogador não rola oculto
- **WHEN** um jogador pede ao servidor uma rolagem oculta
- **THEN** o servidor recusa, e o jogador não vê a chave na aba Dados

### Requirement: Rolagem animada no tabuleiro
Com a animação ligada, ao rolar, a Sala SHALL lançar dados 3D por cima do tabuleiro, um por dado da rolagem, no visual do jogo: pedra azul-noite, filetes e números dourados. O d100 SHALL aparecer como o par de d10 de porcentagem: dezenas (00 a 90) e unidades (0 a 9), em que 00 e 0 valem 100. Os dados SHALL girar, quicar e bater nas bordas da área visível do tabuleiro (fora do painel aberto), e SHALL parar mostrando na face de cima exatamente o valor sorteado pelo rolador. O d4 SHALL mostrar o resultado no vértice de cima.

O resultado SHALL aparecer na aba Dados quando os dados pararem. Os dados SHALL sumir sozinhos alguns segundos depois de parar, ou quando outra rolagem começar. A camada dos dados SHALL NOT receber cliques: o tabuleiro continua usável por baixo. Ela SHALL ser ignorada por leitores de tela; o resultado continua anunciado pela aba Dados.

Na aba Dados, cada pessoa SHALL poder ligar ou desligar a **Animação dos dados**. O padrão é ligada, salvo quando o sistema pede menos movimento; a escolha SHALL ficar guardada neste navegador. Com a animação desligada, numa rolagem com mais de 30 dados, ou se o navegador não conseguir desenhar em 3D, o resultado SHALL aparecer na hora, sem animação.

#### Scenario: Dados rolam e param no resultado
- **WHEN** o jogador rola `2d6 + 1d20` com a animação ligada, e o rolador sorteia 3, 5 e 17
- **THEN** três dados rolam pelo tabuleiro, batem nas bordas, param com 3 e 5 em cima dos d6 e 17 em cima do d20, e só então o total 25 aparece na aba Dados

#### Scenario: Animação desligada
- **WHEN** a pessoa desliga "Animação dos dados" e rola `1d20`
- **THEN** nenhum dado aparece no tabuleiro e o resultado aparece na hora na aba Dados

#### Scenario: Menos movimento
- **WHEN** alguém com a preferência do sistema por menos movimento abre a aba Dados pela primeira vez
- **THEN** "Animação dos dados" vem desligada

#### Scenario: Percentual
- **WHEN** o rolador sorteia 100 num d100 com a animação ligada
- **THEN** rolam um d10 de dezenas e um d10 de unidades, que param em 00 e 0
