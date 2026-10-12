# Tasks

## 1. Biblioteca

- [x] 1.1 Copiar as 7 faixas do teste para `platform/frontend/public/musica/` e criar `cursed_platform/catalogos/musicas.json` com título, autor, licença, links, duração, Momento, Cenário e "repete sem emenda"
- [x] 1.2 `cursed_platform/musica.py`: listas fixas de Momentos e Cenários, leitura e validação da biblioteca; teste de que toda faixa tem licença CC BY ou CC0, Momento e Cenário válidos e arquivo existente

## 2. Estado da música no servidor

- [x] 2.1 Migração `0026_musica_da_sala` (tabela `room_music`, RLS ligado e sem acesso direto no Postgres) e `MusicaRegistro` na persistência; teste de subir e descer a migração
- [x] 2.2 Domínio: ler o estado (padrão sem faixa, parado, repetir ligado), alterar com validação (faixa da biblioteca, posição ≥ 0), aviso `sala.musica`; testes
- [x] 2.3 API: `GET /musicas`, `GET /mesas/{mesa_id}/sala/musica` (com `agora`) e `PUT /mesas/{mesa_id}/sala/musica` (só Narrador, auditoria); testes de permissão (jogador 403, fora da mesa 404), faixa inexistente e posição negativa (422)
- [x] 2.4 Regenerar o cliente da API do frontend

## 3. Tocador da mesa

- [x] 3.1 Funções puras: posição esperada (com relógio do servidor, repetir e fim da faixa), filtros por Momento e Cenário com opções desativadas; testes
- [x] 3.2 `useMusicaDaSala` no `RoomView`: consulta do estado, aviso `sala.musica` no `RoomPresence`, áudio na posição esperada, correção acima de 1,5 s, troca suave (1,5 s) e pausa suave (0,4 s) por temporizador, repetir, volume e silenciar locais, liberação do som no primeiro gesto, parar ao sair; testes

## 4. Aba Música

- [x] 4.1 `MusicaDoPainel`: Narrador com "Tocando agora" (Pausar/Continuar, Parar, Repetir, tempo), filtros e lista com "Tocar" e créditos; jogador com "Tocando agora" sem controles; volume, "Silenciar" e "Ativar som" para todos; testes
- [x] 4.2 Ligar a aba no `RoomView` no lugar do espaço reservado e atualizar o teste das abas

## 5. Duas camadas: Ambiente e Música (pedido do usuário)

- [x] 5.1 Biblioteca com `tipo` (2 ambientes, 5 músicas; "Cathedral in the Forest" é música), ambiente só com Cenário, Momento "Ambiente" trocado por "Exploração / Viagem"; validação e testes
- [x] 5.2 Estado por mesa e camada (`room_music` com `camada` na chave, ainda na `0026`), `PUT /mesas/{mesa_id}/sala/musica/{camada}`, faixa só na camada do seu tipo; testes; cliente regenerado
- [x] 5.3 Um tocador por camada, volume de cada camada e "Silenciar" para as duas; testes
- [x] 5.4 Aba: "Tocando agora" com os quadros Ambiente e Música, biblioteca separada em Ambientes (filtro por Cenário) e Músicas (Momento e Cenário), cada uma com o próprio filtro; testes
- [x] 5.5 Catálogo de sons relido quando o arquivo muda, sem reiniciar o servidor; teste

- [x] 5.6 Biblioteca ampliada com as faixas aprovadas (17 ambientes e 29 músicas, medievais e modernos), Cenários "Moderno / Urbano" e "Ficção científica", listas de Momentos e Cenários no catálogo JSON; testes
- [x] 5.8 Estilo de jogo (Medieval, Moderno, Ficção científica) como divisão principal, com uma ou mais por faixa; Cenário só como lugar, opcional; seletor de estilo na biblioteca e filtros só com os valores presentes; testes
- [x] 5.9 Favoritas: estrela em cada faixa e filtro "Favoritas" combinável com os outros, guardados neste navegador; testes
- [x] 5.7 Converter os áudios para um formato menor antes do commit (depende de o usuário autorizar a instalação do `ffmpeg`). Feito em 2026-10-05, com o `ffmpeg` autorizado pelo usuário: as 46 faixas viraram Opus em Ogg (música a 96 kbps, ambiente a 64 kbps), de 242,7 MB para 90,5 MB, com as durações conferidas; teste do formato no catálogo.

## 6. Verificação

- [x] 6.1 Rodar os testes do backend e do frontend, `typecheck` e `lint`
- [x] 6.2 Ver no ambiente local da Sala (5197) com o Narrador e o jogador ao mesmo tempo: tocar, trocar, pausar, continuar, parar, entrar no meio, filtros, volume, e mostrar ao usuário Aprovado pelo usuário em 2026-10-05.
- [x] 6.3 Remover o teste solto `platform/frontend/public/musica-teste/` e a linha dele no `.git/info/exclude`
