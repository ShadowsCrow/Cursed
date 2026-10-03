# Spec Delta

## Purpose

Define a moldura e a navegação da área da mesa (`/mesas/{id}`), comuns ao Narrador e ao jogador, para que o conteúdo da cena tenha o espaço de que precisa durante a sessão.

## ADDED Requirements

### Requirement: Barra lateral retrátil da mesa
Em telas com mais de 760 px de largura, a barra lateral da mesa SHALL poder ser recolhida e expandida por um botão no topo da própria barra. O botão SHALL ser alcançável pelo teclado. Ele SHALL anunciar se a barra está expandida e SHALL ter um nome que diga a ação: "Recolher barra lateral" ou "Expandir barra lateral". A mudança SHALL valer para o Narrador e para o jogador, em todas as seções da mesa.

#### Scenario: Recolher a barra
- **WHEN** o jogador, na mesa, escolhe "Recolher barra lateral"
- **THEN** a barra vira um trilho estreito, o conteúdo da mesa ocupa a largura liberada e o botão passa a se chamar "Expandir barra lateral"

#### Scenario: Expandir a barra
- **WHEN** o Narrador, com a barra recolhida, escolhe "Expandir barra lateral"
- **THEN** a barra volta à largura cheia, com o cartão da campanha atual e os atalhos do Narrador

#### Scenario: Pelo teclado
- **WHEN** alguém chega ao botão com Tab e aperta Enter
- **THEN** a barra alterna entre recolhida e expandida, e o foco continua no botão

### Requirement: Navegação com a barra recolhida
Com a barra recolhida, o trilho SHALL manter acessíveis:
- a marca, na versão simplificada;
- todas as seções da mesa, como ícones;
- o caminho de volta a Campanhas.

Cada ícone SHALL ter o nome da seção como nome acessível e como dica visível ao passar o ponteiro ou receber foco. A seção atual SHALL continuar indicada por mais de um sinal além da cor e anunciada como página atual. Uma seção com pendências SHALL mostrar um indicador visual no ícone e anunciar a quantidade a leitores de tela.

O cartão "Campanha atual" e os blocos exclusivos do papel SHALL aparecer só com a barra expandida. Os blocos exclusivos são os atalhos do Narrador e o cartão do personagem do jogador.

#### Scenario: Trocar de seção com a barra recolhida
- **WHEN** o jogador, com a barra recolhida, escolhe o ícone "Registro"
- **THEN** a mesa abre o Registro, e o ícone "Registro" é anunciado como página atual

#### Scenario: Pendência com a barra recolhida
- **WHEN** o jogador tem 2 ofertas de cartas pendentes e a barra está recolhida
- **THEN** o ícone da Biblioteca mostra um indicador de pendência, e o leitor de tela anuncia "Biblioteca, 2 pendente(s)"

#### Scenario: Voltar a Campanhas com a barra recolhida
- **WHEN** o Narrador, com a barra recolhida, escolhe o ícone "Campanhas"
- **THEN** Campanhas abre com aquela campanha selecionada

### Requirement: Preferência da barra lembrada no navegador
A escolha entre recolhida e expandida SHALL ser lembrada neste navegador e valer para todas as mesas e os dois papéis. Na primeira visita, ou quando o navegador não permitir guardar a preferência, a barra SHALL começar expandida e continuar funcionando, sem erro. A preferência SHALL NOT ser enviada ao servidor.

#### Scenario: Recarregar com a barra recolhida
- **WHEN** o jogador recolhe a barra e recarrega a página da mesa
- **THEN** a mesa abre com a barra recolhida

#### Scenario: Outra mesa no mesmo navegador
- **WHEN** a pessoa recolhe a barra numa mesa em que é Narradora e depois entra numa mesa em que é jogadora
- **THEN** a segunda mesa também abre com a barra recolhida

#### Scenario: Armazenamento bloqueado
- **WHEN** o navegador bloqueia o armazenamento local e o jogador entra na mesa
- **THEN** a barra abre expandida, ainda pode ser recolhida, e nenhum erro aparece

### Requirement: Barra retrátil em telas estreitas e com movimento reduzido
Até 760 px de largura, a mesa SHALL continuar sem barra lateral e com a navegação inferior, qualquer que seja a preferência guardada. A transição entre recolhida e expandida SHALL ser instantânea quando o sistema pedir movimento reduzido. Nenhuma largura a partir de 320 px SHALL rolar a página na horizontal, com a barra recolhida ou expandida.

#### Scenario: Celular com preferência recolhida
- **WHEN** a preferência guardada é "recolhida" e a pessoa abre a mesa numa tela de 375 px
- **THEN** a mesa mostra a navegação inferior, sem barra lateral nem trilho

#### Scenario: Movimento reduzido
- **WHEN** o sistema pede movimento reduzido e o jogador recolhe a barra
- **THEN** a barra muda de largura sem animação

### Requirement: Sala como página principal da mesa
Ao entrar na mesa sem uma seção pedida no endereço, Narrador e jogador SHALL cair na **Sala**. A Sala SHALL ser o primeiro item da navegação da mesa, na barra lateral, no trilho e na navegação inferior. Um endereço com uma seção válida (`?painel=`) SHALL continuar abrindo essa seção. Um endereço com uma seção desconhecida SHALL abrir a Sala.

#### Scenario: Entrar pela campanha
- **WHEN** o jogador escolhe "Entrar na mesa" em Campanhas
- **THEN** a mesa abre na Sala, e "Sala" é o primeiro item da navegação, anunciado como página atual

#### Scenario: Link para outra seção
- **WHEN** o Narrador abre `/mesas/{id}?painel=activity`
- **THEN** a mesa abre no Registro

#### Scenario: Seção desconhecida
- **WHEN** alguém abre `/mesas/{id}?painel=inexistente`
- **THEN** a mesa abre na Sala

### Requirement: Sala sem cabeçalho e com o grid tomando a tela
Em telas com mais de 760 px de largura, a Sala SHALL NOT mostrar o cabeçalho ilustrado nem o rodapé da plataforma, e a barra superior da mesa SHALL continuar visível. Com uma cena aberta, o grid SHALL ocupar toda a área abaixo da barra superior e à direita da barra lateral ou do trilho, sem rolar a página.

As linhas da grade SHALL cobrir a área inteira da Sala, inclusive por trás do nome da cena, dos controles do mapa e do painel, e SHALL continuar ao arrastar e ao mudar o zoom. A cena SHALL NOT ter borda nem área destacada (item 7): toda a grade é a cena. O mapa enviado pelo Narrador, quando houver, é desenhado na área do mapa, sem moldura.

Ao abrir uma cena, ao abrir ou fechar o painel, ou quando a área mudar de tamanho por recolher a barra lateral, SHALL acontecer o enquadramento: o mapa e os tokens ficam visíveis, centralizados e no maior zoom que caiba na parte da área que o painel aberto não cobre. Sem mapa e sem tokens, a origem da grade fica no centro, em 100%. O botão "Centralizar" SHALL refazer esse enquadramento. O zoom e o arraste da pessoa SHALL ser mantidos até ela pedir "Centralizar" ou abrir outra cena.

Até 760 px, o grid SHALL ocupar a altura entre a barra superior e a navegação inferior.

#### Scenario: Abrir a Sala
- **WHEN** o Narrador entra na mesa com uma cena que tem mapa, numa tela de 1440 por 900 px
- **THEN** não há cabeçalho ilustrado nem rodapé, o grid preenche a área abaixo da barra superior, o mapa inteiro aparece centralizado, e a página não rola

#### Scenario: Grade sem quadrado
- **WHEN** o Narrador abre a Sala numa cena sem mapa
- **THEN** a grade aparece igual em toda a área, sem quadrado, borda ou fundo destacado

#### Scenario: Centralizar depois de mexer
- **WHEN** o jogador amplia o mapa, arrasta para um canto e escolhe "Centralizar"
- **THEN** o mapa e os tokens voltam a aparecer centralizados na área

#### Scenario: Recolher a barra lateral na Sala
- **WHEN** o Narrador recolhe a barra lateral com a Sala aberta e sem ter mexido no zoom
- **THEN** o grid ganha a largura liberada e o mapa se enquadra de novo

### Requirement: Controles da Sala por cima do grid
Os controles da Sala SHALL ficar por cima do grid, e não empilhados abaixo dele:
- **nome da cena aberta:** no alto, à esquerda. A troca, a ativação e a criação de cenas e o envio do mapa ficam na aba Cena do painel, só para o Narrador (item 5);
- **controles do mapa:** zoom e "Centralizar";
- **painel lateral à direita, recolhível, por cima do grid:** com os tokens da cena (e "Retirar" para o Narrador) e, para o Narrador, os personagens dos jogadores e os NPCs e monstros (itens 9 a 11).

O painel SHALL ter um botão com nome acessível e estado anunciado ("Mostrar painel da cena" ou "Ocultar painel da cena"). Recolhido, o painel SHALL deixar o grid livre. Até 760 px, o painel SHALL abrir como gaveta de baixo. Nenhum controle que exista hoje na Sala SHALL deixar de existir. O jogador SHALL NOT ver a gestão de cenas nem "Colocar token".

Os sinais temporários (pings, cursores e prévias de arraste) e as mensagens de prévia, confirmação e erro do movimento SHALL continuar anunciados a leitores de tela.

#### Scenario: Narrador cria uma cena
- **WHEN** o Narrador digita "Pântano" no grupo Cenas da aba Cena e escolhe "Criar cena"
- **THEN** a cena é criada e aberta no grid, sem a página rolar

#### Scenario: Escolher um token pelo painel
- **WHEN** o jogador abre o painel e escolhe o próprio token na lista "Tokens da cena"
- **THEN** a posição do token e se ele o controla são anunciadas

#### Scenario: Ocultar o painel
- **WHEN** o Narrador escolhe "Ocultar painel da cena"
- **THEN** o painel some, o grid fica livre por inteiro e o botão passa a se chamar "Mostrar painel da cena"

#### Scenario: Jogador não vê ferramentas do Narrador
- **WHEN** o jogador abre a Sala
- **THEN** não aparecem a gestão de cenas, as listas de personagens, NPCs e monstros, nem "Retirar"

### Requirement: Sala desativada como página principal
Quando o módulo da Sala estiver desligado na mesa, a Sala SHALL mostrar um aviso no lugar do grid:
- **para o Narrador:** o botão "Ativar sala";
- **para o jogador:** um atalho para Minha ficha.

#### Scenario: Jogador numa mesa sem Sala
- **WHEN** o jogador entra numa mesa com o módulo da Sala desligado
- **THEN** ele vê o aviso de Sala desativada e um atalho "Abrir minha ficha" que leva à seção Minha ficha

#### Scenario: Narrador ativa a Sala
- **WHEN** o Narrador entra numa mesa com a Sala desligada e escolhe "Ativar sala"
- **THEN** o módulo é ativado e a Sala mostra o grid ou o convite para criar a primeira cena

### Requirement: Largura ajustável do painel da cena
Em telas com mais de 760 px, o painel da cena SHALL ter uma alça na borda esquerda para ajustar a largura.

**Pelo ponteiro:** arrastar a alça para a esquerda SHALL alargar o painel, e para a direita, estreitá-lo. Dois cliques na alça SHALL voltar à largura padrão de 22 rem.

**Pelo teclado:** a alça SHALL ser alcançável e anunciada como separador ajustável, com nome "Largura do painel da cena" e o valor atual. A seta para a esquerda SHALL alargar e a seta para a direita, estreitar; com Shift, o passo é maior. Home SHALL levar ao mínimo e End, ao máximo.

**Limites:** a largura SHALL ficar entre 18 rem e 40 rem, sem passar de 60% da largura da Sala.

**Memória e enquadramento:** a largura escolhida SHALL ser lembrada neste navegador, para todas as mesas, e SHALL NOT ir ao servidor. Sem valor guardado, ou com o armazenamento bloqueado, vale a largura padrão. Ao terminar o ajuste, o enquadramento da cena SHALL considerar a nova largura, salvo se a pessoa tiver mexido no zoom ou no arraste. Até 760 px, o painel SHALL continuar como gaveta de baixo, sem alça.

#### Scenario: Alargar arrastando
- **WHEN** o Narrador arrasta a alça do painel 100 px para a esquerda e solta
- **THEN** o painel fica 100 px mais largo, e a cena se reenquadra na parte livre

#### Scenario: Ajuste pelo teclado
- **WHEN** o jogador foca a alça e aperta a seta para a esquerda
- **THEN** o painel alarga um passo, e o novo valor é anunciado

#### Scenario: Limite
- **WHEN** alguém tenta estreitar o painel abaixo de 18 rem
- **THEN** o painel para em 18 rem

#### Scenario: Largura lembrada
- **WHEN** o Narrador alarga o painel e recarrega a página
- **THEN** o painel abre com a largura escolhida

### Requirement: Abas do painel da Sala
O painel direito da Sala SHALL ter abas fixas no topo, nesta ordem: **Cena**, **Chat**, **Fichas**, **Bolsa**, **Cartas** e **Música** (Bolsa e Música no item 8). Cada aba SHALL ter ícone e nome; com o painel estreito, SHALL mostrar só o ícone, mantendo o nome como nome acessível e dica. As abas SHALL seguir o padrão de abas acessível: lista de abas, a aba atual anunciada como selecionada, troca pelas setas e conteúdo associado à aba.

Um botão "Recolher painel" SHALL fechar o painel. Com o painel fechado, um botão "Abrir painel" no canto superior direito do grid SHALL reabri-lo na última aba usada. A aba escolhida e o estado aberto ou fechado SHALL ser lembrados neste navegador, sem ir ao servidor. A aba padrão é Cena.

O que cada aba mostra:
- **Cena:** para o Narrador, no topo, o grupo **Cenas** (cena aberta, troca, ativação, criação e envio do mapa); para todos, os tokens da cena; e, só para o Narrador, "Retirar" em cada token e as listas de personagens dos jogadores e de NPCs e monstros;
- **Chat:** nesta etapa, só um espaço reservado. Ele avisa que o chat da mesa ainda vai chegar e que o registro da mesa vai aparecer nele, e o campo de mensagem e o botão de enviar ficam desativados.

#### Scenario: Trocar de aba
- **WHEN** o jogador escolhe a aba "Fichas"
- **THEN** o painel mostra as fichas, a aba "Fichas" é anunciada como selecionada, e ao recarregar o painel volta em "Fichas"

#### Scenario: Recolher e reabrir
- **WHEN** o Narrador escolhe "Recolher painel" e depois "Abrir painel"
- **THEN** o painel some, o grid fica livre, e depois o painel volta na mesma aba

#### Scenario: Chat reservado
- **WHEN** alguém abre a aba "Chat"
- **THEN** vê o aviso de que o chat vem depois, com o campo de mensagem desativado, e nenhuma mensagem é enviada

### Requirement: Fichas no painel da Sala
A aba Fichas SHALL ter, no alto, uma faixa de retratos circulares dos personagens que a pessoa pode ver. O Narrador vê todos os personagens da mesa. O jogador vê os que o servidor lhe mostra: os próprios e os que a mesa deixa visíveis, com os próprios primeiro.

A faixa SHALL ter setas para trás e para frente quando os retratos não couberem, e cada retrato SHALL ser um botão com o nome do personagem, com o escolhido anunciado como selecionado. Abaixo da faixa, a aba SHALL mostrar o resumo da ficha do personagem escolhido, só para leitura.

Um botão "Abrir ficha completa" SHALL abrir a ficha inteira numa janela flutuante por cima da Sala, sem sair dela. As permissões de leitura e edição da ficha SHALL continuar as mesmas da página da ficha. Fechar a janela SHALL voltar à Sala como estava.

#### Scenario: Escolher um personagem
- **WHEN** o Narrador abre a aba Fichas numa mesa com cinco personagens e avança pela seta
- **THEN** a faixa mostra os retratos seguintes, e escolher "Lion" mostra o resumo da ficha de Lion abaixo

#### Scenario: Ficha completa sem sair da Sala
- **WHEN** o jogador escolhe "Abrir ficha completa" no resumo do próprio personagem
- **THEN** a ficha inteira abre numa janela por cima da Sala, e fechá-la mostra a Sala de novo, com o grid e o painel como estavam

#### Scenario: Mesa sem personagens
- **WHEN** a mesa ainda não tem personagens visíveis para a pessoa
- **THEN** a aba Fichas diz que não há personagens para mostrar

### Requirement: Cartas no painel da Sala
Na aba Cartas, o Narrador SHALL ver as cartas publicadas do catálogo da mesa, com busca pelo título. De cada carta, ele SHALL poder:
- **enviar** a um personagem;
- **ofertar**, criando uma oferta que já começa com essa carta;
- **apresentar** à mesa.

As regras de cada ação SHALL ser as mesmas da Biblioteca. A aba SHALL NOT oferecer criar, editar nem importar cartas.

**Filtro por tipo (item 5):** a aba SHALL ter um filtro por tipo, para o Narrador e para o jogador:
- opções: Todas, Habilidades, Magias, Itens e Efeitos, cada uma com contagem, mostrando só os tipos presentes;
- o filtro se soma à busca do Narrador;
- a opção atual é anunciada como pressionada.

**Imagem e colunas (item 5):** cada carta SHALL mostrar uma miniatura da arte, sem aumentar a altura da carta além de uma linha de miniatura. A arte é a imagem própria enviada pelo Narrador; sem ela, a pintura da categoria; sem nenhuma das duas, um marcador do tipo. Com o painel largo o bastante, as cartas SHALL ficar lado a lado, em pelo menos duas colunas.

O jogador SHALL ver, por personagem próprio, as cartas que o personagem tem, com tipo, título e estado, e SHALL ver as ofertas que aguardam a escolha dele, podendo escolher por ali. O jogador SHALL NOT ver o catálogo do Narrador.

#### Scenario: Narrador envia uma carta
- **WHEN** o Narrador busca "Bola de fogo" na aba Cartas, escolhe "Enviar" e escolhe Lion
- **THEN** a carta é concedida a Lion pelas mesmas regras da Biblioteca, e o resultado é anunciado

#### Scenario: Narrador oferta a partir de uma carta
- **WHEN** o Narrador escolhe "Ofertar" numa carta
- **THEN** abre a criação de oferta com essa carta já escolhida entre as candidatas

**Corpos (item 6):** as cartas de corpo do sistema SHALL ter um filtro e uma categoria próprios, **Corpos**, separados de Itens, com a etiqueta "Corpo". A imagem SHALL ser uma figura humanoide, ou a pintura própria de corpos quando existir. A pintura de Criaturas SHALL NOT ser usada para corpos.

#### Scenario: Corpos separados dos itens
- **WHEN** o Narrador abre a aba Cartas numa mesa com os oito corpos do sistema e uma espada
- **THEN** o filtro mostra "Itens 1" e "Corpos 8", e escolher "Corpos" mostra só os corpos, cada um com a figura humanoide

#### Scenario: Filtrar por tipo
- **WHEN** o Narrador escolhe "Magias" no filtro da aba Cartas
- **THEN** só as magias aparecem, e "Magias" é anunciada como pressionada

#### Scenario: Duas colunas com o painel largo
- **WHEN** o Narrador alarga o painel pela alça até o máximo
- **THEN** as cartas passam a aparecer em duas colunas, cada uma com a miniatura da arte

#### Scenario: Jogador vê as próprias cartas
- **WHEN** o jogador abre a aba Cartas
- **THEN** vê as cartas dos próprios personagens e as ofertas pendentes, e não vê o catálogo do Narrador nem as ações de enviar, ofertar ou apresentar

### Requirement: Chão e baús embaixo do grid
O chão e os baús da cena ativa SHALL ficar num menu retrátil na parte de baixo do grid, e não no painel direito. Fechado, o menu SHALL mostrar só um botão "Chão e baús". Aberto, ele SHALL mostrar o chão e os baús por cima do grid, com rolagem própria. Os controles do mapa e os avisos SHALL subir para não ficarem cobertos. O estado aberto ou fechado SHALL ser lembrado neste navegador. O comportamento de largar, levar e guardar itens SHALL continuar o mesmo.

#### Scenario: Abrir o chão
- **WHEN** o jogador escolhe "Chão e baús" embaixo do grid
- **THEN** o menu abre com o chão e os baús da cena, o botão é anunciado como expandido, e o zoom continua visível acima dele

### Requirement: Cena sem bordas
Uma cena SHALL ser um espaço próprio da mesa, sem limite de casas: tokens SHALL poder ser colocados e movidos para qualquer casa da grade, inclusive com coordenadas negativas, dentro de um limite de sanidade de ±2000 casas em cada eixo, validado pelo servidor. As colunas e linhas da cena SHALL valer só como a área onde o mapa enviado é desenhado. Movimentos continuam exigindo controle do token e a versão esperada, como antes. Pings e prévias de arraste SHALL valer em qualquer casa.

#### Scenario: Token além do antigo limite
- **WHEN** o jogador move o próprio token para a coluna 35, linha −4, numa cena criada com 20 por 15
- **THEN** o servidor confirma o movimento e o token aparece lá para todos

#### Scenario: Valor absurdo
- **WHEN** alguém tenta mover um token para a coluna 5000
- **THEN** o servidor recusa o pedido e a posição confirmada continua a mesma

#### Scenario: Pôr um personagem em qualquer lugar
- **WHEN** o Narrador arrasta um personagem para a casa da coluna −10, linha 40
- **THEN** o token é criado nessa casa

### Requirement: Bolsa e Música no painel da Sala
A aba **Bolsa** SHALL ter, no alto, a mesma faixa de retratos da aba Fichas:
- o Narrador vê todos os personagens da mesa e escolhe de quem é a bolsa;
- o jogador vê só os próprios personagens.

Abaixo da faixa, a aba SHALL mostrar o inventário em grade do personagem escolhido, o mesmo da ficha. As regras de ver, arrumar e editar itens SHALL ser as da ficha, com a autorização do servidor.

A aba **Música** SHALL ser, nesta etapa, só um espaço reservado, que avisa que a música da mesa ainda vai chegar, sem tocar nada.

#### Scenario: Narrador olha a bolsa de um jogador
- **WHEN** o Narrador abre a aba Bolsa e escolhe o retrato de Lion
- **THEN** o inventário em grade de Lion aparece abaixo da faixa

#### Scenario: Jogador só vê a própria bolsa
- **WHEN** o jogador abre a aba Bolsa numa mesa com o personagem dele e o de outro jogador
- **THEN** a faixa mostra só o retrato do próprio personagem, com a bolsa dele

#### Scenario: Música reservada
- **WHEN** alguém abre a aba Música
- **THEN** vê o aviso de que a música da mesa ainda vai chegar, e nada toca

### Requirement: Movimento direto do token
Soltar no grid um token que a pessoa controla SHALL movê-lo na hora, sem passo de confirmação, mostrando-o já no destino enquanto o servidor valida. O servidor SHALL continuar validando controle, limite da cena e versão. Se o servidor recusar ou a conexão falhar, o token SHALL voltar à última posição confirmada e o motivo SHALL ser anunciado. Por decisão do usuário (item 11), o movimento é só por arraste no grid; o painel não tem mais campos de coordenada.

#### Scenario: Arrastar e soltar
- **WHEN** o jogador arrasta o próprio token e solta numa casa
- **THEN** o token fica na casa na hora e o movimento é enviado ao servidor, sem botão de confirmar

#### Scenario: Movimento recusado
- **WHEN** o servidor recusa o movimento porque outra pessoa moveu o token antes
- **THEN** o token volta à última posição confirmada e a mensagem do servidor é anunciada

### Requirement: Personagens dos jogadores na cena
Na aba Cena, o Narrador SHALL ver a lista dos personagens dos jogadores (personagens com dono), cada um com o retrato redondo e o nome. Os que já têm token na cena aberta SHALL aparecer marcados como "na cena". O Narrador SHALL poder colocar um personagem na cena de dois jeitos:
- arrastando-o da lista para uma casa do grid;
- pelo botão "Colocar", que o põe na casa do centro da vista.

O token criado SHALL ficar ligado ao personagem, na camada visível à mesa, com o nome do personagem como rótulo. Assim o dono do personagem passa a controlá-lo. O jogador SHALL NOT ver essa lista.

#### Scenario: Arrastar um personagem para o grid
- **WHEN** o Narrador arrasta o retrato de Lion da lista para a casa (4, 2)
- **THEN** um token de Lion é criado nessa casa, ligado ao personagem, e Lion aparece como "na cena" na lista

#### Scenario: Colocar pelo botão
- **WHEN** o Narrador escolhe "Colocar" em Brom
- **THEN** um token de Brom é criado na casa do centro da vista

### Requirement: Token redondo com retrato
O token ligado a um personagem SHALL ser desenhado como um círculo com o retrato do personagem (o enviado ou o padrão do tipo) e um aro: dourado se a pessoa o controla, prateado se não. O token sem personagem SHALL ser um círculo com as iniciais do rótulo.

#### Scenario: Token de personagem
- **WHEN** a cena tem um token ligado a Lion
- **THEN** o token aparece redondo, com o retrato de Lion e o aro dourado para quem o controla

### Requirement: NPCs e monstros na cena
Na aba Cena, o Narrador SHALL ver, separada da lista dos jogadores, a lista **NPCs e monstros**, com os personagens da mesa sem dono. Cada item SHALL mostrar o retrato redondo, o nome, o tipo (NPC, Monstro ou Personagem) e, quando a ficha estiver oculta dos jogadores, a marca "ficha oculta". Os que já têm token na cena SHALL aparecer marcados "na cena". Colocar na cena SHALL funcionar como para os jogadores: "Colocar" ou arrastar para o grid.

A ficha oculta SHALL NOT esconder o token: ela só impede o jogador de abrir a ficha. Quem decide se o jogador vê o token é o Narrador:
- ao colocá-lo, pela chave **"Colocar oculto dos jogadores"**, que fica acima das listas, vale para "Colocar" e para o arraste e é lembrada neste navegador;
- depois, pelo olho da lista de tokens.

O token visível SHALL mostrar o nome real e a foto do personagem (ou a arte padrão do tipo). Com a ficha oculta, o jogador SHALL receber o token sem o vínculo com a ficha, e a foto SHALL vir por uma rota do token que segue a visibilidade do token. O jogador SHALL NOT ver essa lista.

#### Scenario: Pôr um monstro de ficha oculta, visível
- **WHEN** o Narrador, com "Colocar oculto dos jogadores" desligada, coloca um monstro marcado "ficha oculta"
- **THEN** o token aparece para os jogadores com o nome e a foto do monstro, e eles não conseguem abrir a ficha

#### Scenario: Pôr já oculto
- **WHEN** o Narrador liga "Colocar oculto dos jogadores" e coloca o monstro
- **THEN** o token entra oculto: aparece translúcido para o Narrador e não aparece para os jogadores

#### Scenario: Token oculto
- **WHEN** o Narrador oculta esse token pelo botão de olho
- **THEN** o token some para os jogadores

#### Scenario: Listas separadas
- **WHEN** a mesa tem Lion (de um jogador), um NPC e um monstro
- **THEN** Lion aparece em "Personagens dos jogadores" e o NPC e o monstro em "NPCs e monstros"

### Requirement: Retirar token da mesa
Na lista "Tokens da cena", o Narrador SHALL ter um botão "Retirar" em cada token, com o nome do token no nome acessível. Retirar SHALL tirar o token da cena para todos, com a versão conferida pelo servidor. Se o token mudou nesse meio-tempo, a recusa SHALL ser anunciada e nada é retirado. O jogador SHALL NOT ter esse botão. A aba Cena SHALL NOT ter mais "Enviar ping neste token", campos de coordenada com "Mover" nem o formulário "Colocar token"; o ping continua com dois cliques no mapa.

#### Scenario: Retirar um token
- **WHEN** o Narrador escolhe "Retirar Batedor"
- **THEN** o token do Batedor sai do grid e da lista, para todos

#### Scenario: Token alterado antes
- **WHEN** o Narrador escolhe "Retirar" num token que outra pessoa acabou de mover
- **THEN** o servidor recusa, a mensagem é anunciada e o token continua na mesa

### Requirement: Ocultar e mostrar token
Na lista "Tokens da cena", o Narrador SHALL ter, em cada token, um botão para ocultá-lo ou mostrá-lo, com o nome do token e o estado ("Ocultar Lion" ou "Mostrar Lion", anunciado como pressionado quando oculto). Ocultar SHALL tirar o token da vista dos jogadores, inclusive do dono, e mostrar SHALL devolvê-lo, com a versão conferida pelo servidor. No grid do Narrador, o token oculto SHALL aparecer translúcido, e na lista, com a marca "oculto". O jogador SHALL NOT ter esse botão.

#### Scenario: Ocultar um token
- **WHEN** o Narrador escolhe "Ocultar Capanga"
- **THEN** o token do Capanga some para os jogadores e fica translúcido no grid do Narrador

#### Scenario: Mostrar de novo
- **WHEN** o Narrador escolhe "Mostrar Capanga"
- **THEN** o token volta a aparecer para os jogadores

### Requirement: Tamanho do mapa na grade
Na aba Cena, o Narrador SHALL poder mudar quantas casas o mapa ocupa: colunas e linhas, de 1 a 200 cada, por barras de arrastar que mostram o tamanho enquanto se arrasta e aplicam ao soltar (pelo ponteiro, pelo teclado ou ao sair da barra), sem botão "Aplicar". Com a opção "Manter proporção" ligada, SHALL haver uma barra só, "Tamanho", que muda colunas e linhas pela proporção atual; desligada, SHALL haver uma barra para colunas e outra para linhas. A escolha fica lembrada neste navegador. Ao aplicar, o servidor SHALL gravar a nova área do mapa e avisar a mesa, e o mapa SHALL ser redesenhado nessa área, com o enquadramento refeito. Os tokens SHALL ficar nas casas em que estavam. O jogador SHALL NOT ter esse controle.

#### Scenario: Mapa maior
- **WHEN** o Narrador muda o mapa do Pântano de 20 × 15 para 32 × 24 casas e aplica
- **THEN** o mapa passa a ocupar 32 × 24 casas no grid, para todos, e os tokens continuam nas mesmas casas

#### Scenario: Manter proporção
- **WHEN** a proporção está mantida e o Narrador arrasta a barra "Tamanho" de 20 × 15 até 40 × 30 casas e solta
- **THEN** o mapa passa a 40 × 30 casas, sem outro clique

#### Scenario: Sem proporção
- **WHEN** o Narrador desliga "Manter proporção"
- **THEN** aparecem duas barras, "Colunas" e "Linhas", e soltar uma delas aplica só a medida mudada

#### Scenario: Amostra do mapa no envio
- **WHEN** a cena tem mapa
- **THEN** a aba Cena mostra um quadro com a amostra do mapa ("Trocar mapa da cena", com os formatos e o limite na dica) e um "×" para remover; sem mapa, um quadro vazio tracejado "Enviar mapa da cena"

#### Scenario: Arrastar sem selecionar antes
- **WHEN** o jogador pressiona o próprio token, sem tê-lo escolhido, arrasta e solta noutra casa
- **THEN** o token vai para a casa nova já nesse primeiro gesto

### Requirement: Sala atualizada sem recarregar
O jogador SHALL ver o que o Narrador muda na Sala sem recarregar a página: tokens postos, movidos, ocultados, mostrados ou retirados, troca de cena ativa e mapa. Com tempo real, os avisos do servidor SHALL recarregar a Sala na hora. Sem tempo real (por exemplo, no ambiente local), a Sala SHALL se reconsultar sozinha a cada 1 segundo. Com tempo real, a reconsulta SHALL acontecer a cada 15 segundos, como rede de segurança. Dados iguais SHALL NOT redesenhar a tela.

#### Scenario: Narrador oculta um token
- **WHEN** o Narrador oculta um token enquanto o jogador está na Sala, num ambiente sem tempo real
- **THEN** em até cerca de 1 segundo o token some da tela do jogador, sem recarregar a página

### Requirement: Permissão de movimento dos tokens
Cada token SHALL estar liberado ou bloqueado para movimento pelos jogadores, decisão só do Narrador, e o servidor SHALL recusar (403) o movimento de quem não tem permissão:
- **bloqueado:** só o Narrador move;
- **liberado, token de personagem de jogador:** o dono do personagem move, além dos jogadores escolhidos;
- **liberado, token sem dono** (NPC, monstro ou objeto): só os jogadores que o Narrador escolheu para aquele token.

Na lista "Tokens da cena", o Narrador SHALL ter um cadeado por token ("Liberar movimento de X" ou "Bloquear movimento de X", anunciado como pressionado quando bloqueado). Ao liberar um token sem dono, SHALL escolher os jogadores. Na seção, SHALL haver as ações em lote "Bloquear todos", "Só personagens principais" (libera os de personagens de jogador e bloqueia o resto) e "Liberar todos". Ao colocar, o token de personagem de jogador SHALL entrar liberado, e o de NPC ou monstro, bloqueado. Tokens que já existiam SHALL continuar como se comportavam (liberados).

#### Scenario: Bloquear um token de jogador
- **WHEN** o Narrador bloqueia o movimento de Lion
- **THEN** o dono de Lion não consegue mais mover o token (o servidor recusa), e o Narrador continua movendo

#### Scenario: Liberar um NPC para jogadores escolhidos
- **WHEN** o Narrador libera o movimento da Carroça e escolhe Ana
- **THEN** Ana consegue mover a Carroça, e os outros jogadores não

#### Scenario: Só personagens principais
- **WHEN** o Narrador escolhe "Só personagens principais"
- **THEN** os tokens de personagens de jogador ficam liberados e os de NPCs e monstros, bloqueados

### Requirement: Seções retráteis na aba Cena
As seções "Cenas", "Personagens dos jogadores", "NPCs e monstros" e "Tokens da cena" SHALL abrir e fechar pelo título, um botão com estado anunciado (expandido ou não), com a quantidade de itens ao lado. O estado de cada seção SHALL ficar lembrado neste navegador; o padrão é aberta.

#### Scenario: Fechar a lista de tokens
- **WHEN** o Narrador fecha "Tokens da cena" e recarrega a página
- **THEN** a seção continua fechada, e as outras como estavam

### Requirement: Seção "Tokens" na aba Cena
Para o Narrador, a aba Cena SHALL ter uma seção retrátil única "Tokens" com, nesta ordem: a dica de arrastar ou "Colocar", a chave "Colocar oculto dos jogadores" e as seções retráteis internas "Personagens dos jogadores", "NPCs e monstros" (separadas) e "Tokens da cena". Fechar "Tokens" SHALL recolher tudo isso de uma vez, e cada seção interna SHALL continuar abrindo e fechando por si e lembrada neste navegador. O jogador SHALL ver só "Tokens da cena", sem a seção em volta.

#### Scenario: Recolher todos os tokens
- **WHEN** o Narrador fecha "Tokens"
- **THEN** a chave, as listas de personagens e os tokens da cena somem, e "Cenas" continua como estava
