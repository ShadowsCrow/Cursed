# musica-da-sala Specification

## Purpose
Som da mesa na Sala: uma biblioteca de faixas com licença aberta, separada em ambientes e músicas, de onde o Narrador escolhe um som ambiente e uma música que tocam juntos, em sincronia para todos, sem ninguém baixar nada.

## Requirements

### Requirement: Biblioteca de sons com licença aberta
A plataforma SHALL oferecer uma biblioteca de sons pronta, igual para todas as mesas, só com faixas sob licença **CC BY** ou **CC0** (licenças que permitem uso comercial). Faixas sob licenças "sem fins comerciais" ou "sem derivações" MUST NOT entrar na biblioteca.

Cada faixa SHALL ser de um de dois tipos (decisão do usuário, 2026-10-03):
- **Ambiente:** som de fundo feito para repetir (masmorra, floresta, chuva);
- **Música:** com um **Momento**.

Toda faixa SHALL ter um ou mais **Estilos de jogo**. Essa é a divisão principal da biblioteca, pedida pelo usuário para separar o medieval do moderno com a mesma clareza que separa ambiente de música. Uma faixa que serve em mais de um estilo SHALL ter todos eles: sons de natureza, por exemplo, ficam em Medieval e em Moderno.

O **Cenário** SHALL ser só o lugar, e é opcional: uma faixa sem Cenário serve em qualquer lugar (a maioria das de combate e de drama).

Cada faixa SHALL ter: identificador estável, tipo, título, autor, licença, link da licença, link de origem, duração em segundos, Estilos, o Momento (só nas músicas), o Cenário (se houver) e a marca "repete sem emenda" (sim ou não).

As listas de Estilos, Momentos e Cenários SHALL fazer parte do catálogo, para uma categoria nova valer sem mudar o sistema. Na primeira versão:
- **Estilos**, nesta ordem: Medieval, Moderno, Ficção científica;
- **Momentos**, nesta ordem: Exploração / Viagem, Combate, Chefe / Épico, Tensão / Suspense, Mistério, Terror, Taverna / Festa, Descanso / Calmo, Drama / Tristeza;
- **Cenários**, nesta ordem: Cidade / Vila, Interior, Natureza, Masmorra / Caverna, Sobrenatural / Sombrio, Nave / Estação. Chuva, vento e tempestade ficam em Natureza.

A biblioteca SHALL ser lida por qualquer pessoa autenticada. A primeira versão SHALL trazer as faixas aprovadas pelo usuário em 2026-10-03:
- **17 ambientes:** os de RPG medieval (masmorra, gotas, floresta, pássaros, grilos, chuva, tempestade, vento, mar e rio, fogueira, chuva na janela) e os modernos (trânsito, trem e três de ficção científica). São todos do OpenGameArt, sob CC0 ou CC BY 3.0;
- **29 músicas:** de Kevin MacLeod, sob CC BY 4.0, medievais e modernas, cobrindo todos os Momentos. Uma delas é Cathedral in the Forest, do OpenGameArt, sob CC0, que é música e não ambiente por decisão do usuário.

#### Scenario: Ler a biblioteca
- **WHEN** uma pessoa autenticada pede a biblioteca
- **THEN** recebe 17 ambientes e 29 músicas, cada faixa com tipo, título, autor, licença, links, duração, Estilos, a marca "repete sem emenda", o Cenário quando a faixa é de um lugar e, nas músicas, o Momento

#### Scenario: Só licenças que permitem uso comercial
- **WHEN** a biblioteca é verificada
- **THEN** toda faixa tem licença CC BY ou CC0, ao menos um Estilo da lista, Cenário da lista (ou nenhum), Momento da lista se for música (e nenhum se for ambiente), e um arquivo de áudio que existe

#### Scenario: Cada estilo tem ambientes e músicas
- **WHEN** a biblioteca é verificada
- **THEN** Medieval, Moderno e Ficção científica têm, cada um, ao menos um ambiente e uma música

### Requirement: Duas camadas escolhidas pelo Narrador
A mesa SHALL ter duas camadas de som que tocam ao mesmo tempo: **Ambiente** e **Música**. Só o Narrador SHALL mudar o que toca em cada camada. Em cada uma, ele SHALL poder:
- tocar uma faixa do tipo da camada, do início;
- pausar e continuar de onde pausou;
- parar, deixando a camada sem faixa;
- ligar ou desligar "Repetir".

Mudar uma camada MUST NOT mudar a outra.

O servidor SHALL guardar, por mesa e por camada:
- a faixa, ou nenhuma;
- se está tocando;
- a posição em milissegundos no momento da última mudança;
- o momento dessa mudança, no relógio do servidor;
- "Repetir".

Uma camada que nunca tocou SHALL estar sem faixa, parada e com "Repetir" ligado.

O servidor SHALL recusar com 422:
- uma faixa que não existe na biblioteca;
- uma faixa de outro tipo (uma música na camada Ambiente, ou o contrário);
- uma camada desconhecida;
- uma posição negativa.

Um pedido de quem não é o Narrador SHALL ser recusado com 403, ou com 404 para quem não é da mesa. Cada mudança SHALL avisar a mesa em tempo real (`sala.musica`) e SHALL ficar na auditoria da mesa.

#### Scenario: Ambiente e música juntos
- **WHEN** o Narrador toca o ambiente "Dungeon Ambience" e depois a música "Clash Defiant"
- **THEN** as duas camadas ficam tocando, cada uma com a sua faixa, e a mesa é avisada a cada mudança

#### Scenario: Parar a música não para o ambiente
- **WHEN** o Narrador para a música com o ambiente tocando
- **THEN** a camada Música fica sem faixa e o ambiente continua tocando

#### Scenario: Pausar e continuar
- **WHEN** o Narrador pausa a música aos 42 s e depois continua
- **THEN** ao pausar a camada guarda a posição de 42 s parada, e ao continuar volta a tocar a partir de 42 s

#### Scenario: Faixa na camada errada
- **WHEN** o Narrador pede uma música na camada Ambiente
- **THEN** o servidor recusa com 422 e nada muda

#### Scenario: Jogador não muda o som
- **WHEN** um jogador tenta mudar uma camada
- **THEN** o servidor recusa com 403 e nada muda

### Requirement: Todos ouvem o mesmo som ao mesmo tempo
Quem é da mesa SHALL poder ler o estado das duas camadas, junto com o horário atual do servidor. Cada navegador na Sala SHALL tocar a faixa de cada camada na posição esperada: a posição guardada mais o tempo passado desde a última mudança, medido pelo relógio do servidor. Com "Repetir" ligado, a posição SHALL dar a volta ao fim da faixa; com "Repetir" desligado, a faixa SHALL parar no fim.

Quem entra na Sala com som tocando SHALL ouvir cada camada já na posição esperada. Se a posição tocada se afastar mais de 1,5 s da esperada, o navegador SHALL corrigi-la. A mudança feita pelo Narrador SHALL chegar pelo aviso em tempo real ou, sem ele, pela consulta periódica da Sala.

O som SHALL continuar tocando com qualquer aba do painel aberta e com o painel recolhido; ao sair da Sala, SHALL parar.

#### Scenario: Jogador entra no meio
- **WHEN** o Narrador tocou uma música há 30 s e um jogador abre a Sala
- **THEN** o navegador do jogador toca a música a partir de cerca de 30 s

#### Scenario: Faixa sem repetir termina
- **WHEN** a música toca até o fim com "Repetir" desligado
- **THEN** o som da camada para, e o quadro dela indica que a faixa terminou

#### Scenario: Faixa com repetir dá a volta
- **WHEN** a posição esperada passa do fim da faixa com "Repetir" ligado
- **THEN** o navegador toca a faixa na posição que dá a volta pelo começo

### Requirement: Troca suave
Ao trocar de faixa numa camada que está tocando, a faixa anterior SHALL sumir aos poucos enquanto a nova entra (cerca de 1,5 s). Pausar e continuar SHALL abaixar e subir o volume aos poucos (cerca de 0,4 s). A transição SHALL terminar também com a aba do navegador em segundo plano.

#### Scenario: Trocar de música tocando
- **WHEN** o Narrador troca "Five Armies" por "Clash Defiant" com a música tocando
- **THEN** no meio da transição as duas soam, a anterior baixando e a nova subindo, e no fim só a nova toca no volume da pessoa

### Requirement: Aba Música
A aba Música SHALL mostrar, para todos, o bloco **Tocando agora** com um quadro por camada (**Ambiente** e **Música**). Cada quadro SHALL mostrar o título, o Cenário (e o Momento, nas músicas), o crédito, o tempo tocado e a duração, ou o aviso de que nada toca na camada. Cada quadro SHALL ter também o volume daquela camada.

Para o **Narrador**, cada quadro SHALL ter ainda:
- "Pausar" ou "Continuar";
- "Parar";
- a chave "Repetir".

Abaixo do bloco Tocando agora, o Narrador SHALL ver a **Biblioteca**, com duas escolhas no topo, no mesmo visual:
- o tipo: **Ambientes** ou **Músicas**;
- o **Estilo de jogo**: Medieval, Moderno ou Ficção científica (começa em Medieval).

A lista SHALL mostrar as faixas do tipo e do estilo escolhidos, e os filtros SHALL funcionar assim:
- Ambientes se filtram por Cenário; Músicas, por Momento e Cenário, combináveis;
- os filtros SHALL mostrar só os Momentos e Cenários que existem naquele tipo e estilo;
- tocar de novo no filtro escolhido o desfaz;
- uma opção sem faixa que combine com o outro filtro SHALL ficar desativada;
- cada combinação de tipo e estilo guarda o próprio filtro.

**Favoritas** (pedido do usuário):
- cada faixa da lista SHALL ter uma estrela para favoritar e desfavoritar;
- junto aos filtros, a opção "Favoritas" SHALL mostrar só as faixas favoritas do tipo e estilo escolhidos;
- os filtros de Momento e Cenário SHALL valer entre as favoritas;
- sem nenhuma favorita ali, a lista SHALL avisar como favoritar;
- as favoritas SHALL ser de cada pessoa, guardadas neste navegador, e valer em todas as mesas.

Cada faixa da lista SHALL mostrar os rótulos, a marca "repete sem emenda" quando houver, o crédito e o botão "Tocar". Na faixa atual, o botão SHALL ser "Pausar" ou "Continuar", e ele age na camada do tipo da faixa.

O **jogador** SHALL ver os quadros sem os controles de tocar e sem a biblioteca.

O volume de cada camada e o botão "Silenciar", que cala as duas, SHALL ser de cada pessoa, guardados neste navegador, e valer só para quem os muda. O crédito de cada faixa SHALL mostrar o autor, a licença com link para o texto da licença e o link de origem.

#### Scenario: Narrador escolhe tipo e estilo
- **WHEN** o Narrador abre a biblioteca
- **THEN** vê os Ambientes do estilo Medieval, filtráveis só pelos Cenários que existem ali, e ao escolher "Moderno" vê os ambientes modernos, incluídos os de natureza, que servem nos dois

#### Scenario: Narrador filtra as músicas por Cenário
- **WHEN** o Narrador escolhe "Músicas", o estilo Medieval e o Cenário "Interior"
- **THEN** a lista mostra só as músicas medievais de interior, e os Momentos sem música ali ficam desativados

#### Scenario: Favoritar e filtrar as favoritas
- **WHEN** o Narrador favorita "Death and Axes" e "Night Vigil" e liga o filtro "Favoritas" nas Músicas medievais
- **THEN** a lista mostra só essas duas, os Momentos sem favorita ficam desativados, e ao recarregar a página as duas continuam favoritas

#### Scenario: Faixa de qualquer lugar
- **WHEN** a música não tem Cenário
- **THEN** ela aparece no seu estilo sem filtro de Cenário, mostrando só o Momento

#### Scenario: Jogador vê o que toca
- **WHEN** o Narrador toca o ambiente "Dungeon Ambience" e a música "Achaidh Cheide", e o jogador abre a aba Música
- **THEN** o jogador vê os dois quadros com as faixas, os rótulos e os créditos (CC0 e CC BY 4.0), sem botões de tocar

#### Scenario: Volume próprio por camada
- **WHEN** o jogador baixa o volume do ambiente para 20% e recarrega a página
- **THEN** o ambiente dele toca a 20%, a música dele continua no volume que estava, e o som dos outros não muda

### Requirement: Ativar som
Como o navegador só toca som depois de um gesto da pessoa, o primeiro clique ou toque em qualquer lugar da Sala SHALL liberar o som. Enquanto o som não estiver liberado e houver alguma camada tocando na mesa, a aba Música SHALL mostrar o botão "Ativar som", que libera as duas camadas e as toca na posição esperada.

#### Scenario: Som bloqueado ao entrar
- **WHEN** o jogador abre a Sala com som tocando e o navegador bloqueia o som
- **THEN** a aba Música mostra "Ativar som", e ao clicar as camadas começam na posição esperada
