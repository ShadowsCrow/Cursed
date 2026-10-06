# Design

## Contexto

A Sala segue um modelo único para o que é compartilhado: o servidor guarda o estado confirmado, avisa a mesa pelo Realtime (`emitir`, tópico `mesa:{id}`) e os clientes também reconsultam de tempos em tempos (`intervaloDaSala`: 1 s sem tempo real, 15 s com). As rolagens de dados (`melhorias-da-sala`, item 3) usam esse modelo, e a música segue o mesmo caminho.

Um teste fora do sistema (página solta servida no 5197, em 2026-10-03) validou com o usuário a biblioteca, os rótulos e a troca suave. Ele também mostrou um problema: uma transição feita com `requestAnimationFrame` trava quando a aba do navegador fica em segundo plano.

## Decisões

### D0. Duas camadas: Ambiente e Música (decisão do usuário, 2026-10-03)
Vendo o uso real, o usuário pediu para separar ambiente de música e escolheu duas camadas que tocam juntas, em vez de só dividir a biblioteca. Cada faixa tem um `tipo` (`ambiente` ou `musica`) e só toca na camada do seu tipo. O tipo de cada faixa é decisão do usuário: "Cathedral in the Forest" é música, não ambiente.

O ambiente é classificado só por Cenário, porque para som de fundo o Momento não ajuda a escolher. Com isso, o Momento "Ambiente" das músicas ficou ambíguo e virou "Exploração / Viagem"; nenhuma música da primeira versão o usava.

Tudo o que segue vale por camada: estado, tocador, volume e controles. "Silenciar" cala as duas camadas.

### D0b. Estilo de jogo como divisão principal (decisão do usuário, 2026-10-03)
Ao ampliar a biblioteca com sons modernos, o usuário pediu que a divisão entre medieval e moderno fosse tão clara quanto a de ambiente e música, e escolheu três estilos: Medieval, Moderno e Ficção científica. Cada faixa tem uma lista `estilos`, com um ou mais valores, porque sons de natureza servem em mais de um. O Cenário virou só o lugar e é opcional, para faixas de qualquer lugar.

Na aba, o estilo é um seletor no mesmo visual de Ambientes/Músicas, e os filtros mostram só os valores presentes no tipo e estilo escolhidos. O filtro fica guardado por combinação de tipo e estilo.

### D0c. Favoritas no navegador
As favoritas são preferência de cada pessoa, como o volume e "Mostrar rolagens". Ficam no `localStorage` (`cursed:musica:favoritas`, lista de ids), valem em todas as mesas e não vão ao servidor. Com isso não há tabela nem rota nova. A limitação é que elas não acompanham a pessoa em outro navegador; se isso fizer falta, o passo seguinte é guardá-las por usuário no servidor.

### D1. Estado por mesa e camada, com relógio do servidor
Tabela `room_music` com uma linha por mesa e camada: `mesa_id` e `camada` (chave composta; `camada` em `ambiente`/`musica`), `faixa_id` (ou nulo), `tocando`, `posicao_ms`, `repetir`, `alterada_em` (relógio do servidor) e `alterada_por`. A posição esperada é `posicao_ms + (agora_servidor − alterada_em)` enquanto toca. Com "Repetir", o resultado dá a volta pelo tamanho da faixa; sem ele, passa do fim e a faixa terminou.

A resposta do `GET` traz `agora` (relógio do servidor), e o cliente calcula a diferença entre os relógios (`agora − Date.now()` na chegada). Assim, um relógio errado no computador do jogador não tira a música do lugar. A latência da resposta (dezenas de milissegundos) é desprezível perante a tolerância de 1,5 s.

O servidor não sabe quando a faixa termina e não precisa saber: "terminou" é calculado no cliente.

### D2. Comando único e idempotente: `PUT /mesas/{id}/sala/musica/{camada}`
O Narrador envia o estado desejado da camada `{faixa_id, tocando, posicao_ms, repetir}`, e o servidor grava com `alterada_em = agora`. Tocar é `{faixa, tocando: true, posicao_ms: 0}`; pausar é `{mesma faixa, tocando: false, posicao_ms: posição atual}`; continuar é `{tocando: true, posicao_ms: posição pausada}`; parar é `{faixa_id: null, tocando: false, posicao_ms: 0}`.

A posição de pausa vem do cliente do Narrador, porque é o que ele está ouvindo; o servidor só valida que não é negativa. Não há versão nem conflito: só o Narrador muda, e o último pedido vale.

Também emite `sala.musica` (público, com `{camada}`) e registra auditoria `musica.alterada` (categoria `mesa`, relevância `narrativa`, `camada` nos detalhes). A resposta e o `GET` trazem as duas camadas e `agora`.

### D3. Biblioteca como catálogo da plataforma
`cursed_platform/catalogos/musicas.json` é a fonte, lida por `cursed_platform/musica.py`. A API serve a biblioteca em `GET /musicas`, para qualquer pessoa autenticada, e valida por ela o `faixa_id` e o tipo da faixa diante da camada. Como os outros catálogos, o arquivo é relido quando muda (pela data de modificação), sem reiniciar o servidor; um arquivo inválido mantém a última versão válida. Cada faixa traz o `arquivo` com o caminho público do áudio (`/musica/<arquivo>`).

Momentos e Cenários são listas fixas no módulo. Um teste verifica que toda faixa usa valores dessas listas, tem licença CC BY ou CC0 e tem o arquivo em `platform/frontend/public/musica/`.

### D4. Áudio servido pelo frontend, em `public/musica/`
As faixas ficam em `platform/frontend/public/musica/` e o mesmo servidor que entrega a interface as entrega também, com suporte a pedido parcial (Range) do Vite e da hospedagem estática. É o caminho mais curto para o "uso real" que o usuário pediu.

Custo: com a biblioteca ampliada (46 faixas), cerca de 232 MB nos formatos originais, grande demais para o Git. Antes do commit, as faixas devem ser convertidas para um formato único e menor (Opus, por volta de 50 MB no total), o que depende de instalar o `ffmpeg` com autorização do usuário. Os OGG (Vorbis) do OpenGameArt podem não tocar em Safari antigo. Fica como passo seguinte, fora desta mudança: converter tudo para um formato único e menor e mover para o Storage do Supabase quando a biblioteca crescer. Não há `ffmpeg` nesta máquina.

### D5. Tocador da mesa no `RoomView`, fora da aba
O hook `useMusicaDaSala` vive no `RoomView`, como o rolador, para o som seguir com qualquer aba e com o painel recolhido. Ele tem um `TocadorDaMesa` por camada e, para cada uma:
- consulta o estado (`useQuery`, `intervaloDaSala`), invalidado pelo aviso `sala.musica` no `RoomPresence`;
- mantém um `HTMLAudioElement` por faixa em uso. Na troca, a faixa anterior baixa e a nova sobe (1,5 s); pausar e continuar levam 0,4 s;
- a cada consulta e a cada 5 s, compara `audio.currentTime` com a posição esperada e corrige se a diferença passar de 1,5 s;
- liga `loop` conforme "Repetir";
- desmonta e para tudo ao sair da Sala.

As rampas de volume usam `setInterval`, não `requestAnimationFrame`, para terminarem com a aba em segundo plano (lição do teste).

### D6. Liberação do som
`audio.play()` recusado (`NotAllowedError`) marca o estado `bloqueado`. Um ouvinte de `pointerdown`/`keydown` no documento tenta tocar de novo no primeiro gesto e depois se remove. A aba Música mostra "Ativar som" enquanto houver bloqueio e música tocando.

### D7. Volume local
O volume de cada camada (0–1; padrão 0,5 no ambiente e 0,6 na música) e "Silenciar" ficam no `localStorage` (`cursed:mesa:volume-do-ambiente`, `cursed:mesa:volume-da-musica`, `cursed:mesa:musica-silenciada`) e multiplicam a rampa de cada faixa. O servidor não sabe deles.

## Riscos

- **Arquivos grandes no repositório (D4):** aceitável para 7 faixas, mas a biblioteca não deve crescer assim. O passo seguinte está registrado.
- **Diferença entre jogadores:** a tolerância de 1,5 s pode deixar dois jogadores levemente fora de compasso. Para música ambiente isso é inaudível na prática.
- **Faixa sem "Repetir" terminada:** o estado no servidor continua "tocando". Se o Narrador ligar "Repetir" depois do fim, a posição dá a volta e a música reaparece em algum ponto do meio. Isso é aceitável e coerente com a regra da posição esperada.
