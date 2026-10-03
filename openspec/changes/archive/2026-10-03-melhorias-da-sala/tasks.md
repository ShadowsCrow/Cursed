# Tasks

## 1. Item 1: Rolador de dados

- [x] 1.1 Criar `platform/frontend/src/app/room/dados.ts` com sorteio por rejeição, rolagem da montagem e descrição da expressão; verificar com `dados.test.ts` (9 testes: faixa 1..N, descarte dos valores com viés, total com modificador, ordem e formato da expressão, limites de 99 dados e ±99).
- [x] 1.2 Criar o hook `useRolador` (em `useRolador.ts`) (montagem, último resultado, histórico de até 20, rolar de novo, limpar) e o componente `RoladorDeDados.tsx`; verificar com `RoladorDeDados.test.tsx` (montar `2d6 + 1d20 + 3`, "Rolar" desativado sem dados, Limpar, resultado e total anunciado, histórico de 20 e "Rolar de novo").
- [x] 1.3 Acrescentar a aba `dados` em segundo lugar em `abasDoPainel.ts`, o ícone `dice` em `Display.tsx` e o conteúdo da aba no `RoomView.tsx`, com o estado no `RoomView`; verificar com testes do `RoomView` (ordem das abas, seta de Cena leva a Dados, montagem e histórico preservados ao trocar de aba) e confirmar que nenhuma rolagem chama a API.
- [x] 1.4 Estilizar o rolador em `room.css` no visual do painel (botões de dado, total em destaque, histórico) e conferir no navegador em painel largo, estreito e na gaveta até 760 px. Conferido em 2026-10-03 em 1400, 1000 e 375 px de largura.
- [x] 1.5 Fazer "Limpar" zerar também o resultado do visor, mantendo o histórico (pedido do usuário em 2026-10-03); verificado com testes do `RoladorDeDados` (visor sem total depois de Limpar, histórico mantido, Limpar desativado sem nada a limpar).
- [x] 1.6 Gerar pelo Codex as pinturas dos sete dados no estilo do jogo, com o número do tipo na face da frente e fundo transparente; preparar os webp em `public/arte/sala/` com `preparar_arte.py` (verificado com `test_preparar_arte`: recorte pela transparência ou sem o pergaminho, centralizado em 192 px) e mostrá-las nos botões com a silhueta como reserva; conferir no navegador. Feito em 2026-10-03: os sete dados com o número certo e fundo transparente; `test_preparar_arte` passou (41 testes) e o navegador mostrou as sete pinturas, quatro por linha.

## 2. Item 2: Controle de zoom compacto

- [x] 2.1 Em `RoomCanvas.tsx`, trocar o texto "Centralizar" pelo ícone `crosshair` (novo em `Display.tsx`) com `aria-label` e `title`, e dar dica aos botões − e +; restilizar `.room-canvas__controls` em `room.css` (moldura do sistema, botões de 1,75 rem, altura máxima 2,25 rem). Verificar com os testes existentes da Sala passando e com um teste que acha "Centralizar" pelo nome acessível (`RoomCanvas.test.tsx`). No navegador, o controle passou a medir 146 × 36 px.

## 3. Item 3: Rolagem animada e rolagens da mesa

- [x] 3.1 Instalar `three`, `@types/three` e `cannon-es` no frontend; verificar com `npm run build` sem erros e com o módulo 3D num pedaço separado do pacote principal. Feito em 2026-10-03: `three` 0.186, `cannon-es` 0.20; `npm run build` sem erros, com a cena 3D num pedaço próprio (`cena-*.js`, 157 KB comprimido) carregado só na primeira rolagem animada.
- [x] 3.2 Criar `dados3d/geometria.ts` com os sete sólidos (vértices, faces, normais para fora, d10 trapezoedro); verificar com testes: número de faces e vértices de cada sólido, normais apontando para fora e convexidade. Feito: `geometria.test.ts` (8 testes).
- [x] 3.3 Criar `dados3d/rotulos.ts`: face ou vértice de cima a partir da orientação, distribuição dos números forçando o valor sorteado, e divisão do d100 em dezenas e unidades. Verificar com testes, incluindo arremessos simulados no `cannon-es` (`dados3d/fisica.ts`) em que o número de cima é sempre o sorteado, para todos os tipos e valores. Feito: `rotulos.test.ts` (7 testes), com 42 arremessos simulados em todos os tipos de dado, todos parados dentro das paredes e mostrando o valor sorteado.
- [x] 3.4 Gerar pelo Codex a textura de pedra azul-noite dos dados, a partir do d20 aprovado, e prepará-la com `preparar_arte.py` em `public/arte/sala/`; verificar com `test_preparar_arte`. Feito: `dados-pedra.png` gerada pelo Codex a partir do d20; `public/arte/sala/dados-pedra.webp` (512 px); `test_preparar_arte` passou.
- [x] 3.5 Criar a cena 3D (`dados3d/cena.ts`) e a camada `DadosNoTabuleiro` no palco da Sala: renderizador transparente, paredes nas bordas da área visível fora do painel, simulação, reprodução, sumiço depois de 3 s, destruição do contexto e queda para o resultado direto sem WebGL ou acima de 30 dados. Verificar com testes da camada (sem WebGL: resultado direto; nenhum clique bloqueado; `aria-hidden`) e no navegador, com captura de tela dos dados rolando e parados no resultado. Feito: `useDadosNoTabuleiro.test.tsx` (4 testes) e capturas no navegador em 1400 × 820 e 800 × 560, com os dados rolando, parando espalhados e mostrando em cima os valores do visor (ex.: d100 57 com dezenas 50; d12 5; d8 4; d20 3). Ajustes de luz, tamanho e força do arremesso feitos a partir das capturas. Números tortos (pedido do usuário): algarismos alinhados, centrados pela tinta e d6 paralelo às arestas, conferidos numa folha com todas as faces de cada dado e numa rolagem real.
- [x] 3.6 Enviar e receber `sala.rolagem` pelo canal em tempo real (`useRoomEphemera`), com validação e o nome de quem rolou. Verificar com testes de canal simulado: envio ao rolar, recebimento entrando no histórico com o nome, mensagens inválidas descartadas, "Só as minhas" ignorando as dos outros. Feito: `useRoomEphemera.test.tsx`, `rolagensDaMesa.test.ts` e `RoomView.dados.test.tsx`. O envio entre duas pessoas reais depende do tempo real do Supabase e foi verificado só com canal simulado.
- [x] 3.7 Na aba Dados, as opções "Mostrar rolagens" e "Animação dos dados" (padrão pela preferência de movimento, guardadas no navegador) e o visor revelando o total quando os dados param. Verificar com testes do `RoladorDeDados` e do `RoomView`. Feito: `RoomView.dados.test.tsx` (6 testes: "Rolando…" até os dados pararem, animação desligada, menos movimento, De toda a mesa, Só as minhas, mensagem adulterada).

## 4. Item 3: rolagens pelo servidor (decisão do usuário em 2026-10-03)

- [x] 4.1 Criar a tabela `dice_rolls` (`RolagemRegistro` e migração `0025_rolagens_de_dados`) e `cursed_platform/rolagens.py` (validação, sorteio com `secrets`, expressão, listagem e aviso `sala.rolagem`); verificar com `test_rolagens.py` (limites, valores entre 1 e as faces, total, expressão, listagem por `depois`, isolamento entre mesas, aviso emitido) e com a migração aplicada no SQLite local. Feito em 2026-10-03: `test_rolagens.py` (11 testes, incluindo a migração subindo e descendo no SQLite).
- [x] 4.2 Rotas `POST` e `GET /mesas/{mesa_id}/sala/rolagens` com os contratos em `contracts.py`; regenerar o cliente (`npm run generate:client`); verificar com testes de API (jogador e Narrador rolam; quem não é da mesa recebe 404; Sala desativada recebe 409; pedidos fora dos limites recebem 422). Feito: `openapi.json` e `schema.ts` regenerados (`check:client` e `export_openapi --check` em dia); testes de API em `test_rolagens.py`.
- [x] 4.3 No frontend, "Rolar" pede ao servidor (erro avisado na aba) e as rolagens dos outros chegam pela consulta periódica ou pelo aviso `sala.rolagem`; as anteriores à abertura não animam; retirar o envio de navegador a navegador. Verificar com testes do `RoomView` e no navegador, com o mestre e o jogador em duas janelas no ambiente local. Feito: `RoomView.dados.test.tsx` (7 testes) e, no navegador, mestre (`localhost:5197`) e jogador (`127.0.0.1:5197`) num ambiente local separado: o jogador rolou 1d6 + 1d20 e 1d100, e as duas rolagens apareceram no histórico do mestre com o nome "Lion", rolando no tabuleiro dele, em até 2 s. Janela oculta não consulta; ao voltar o foco, busca na hora, e a animação conta o tempo a partir do primeiro quadro desenhado.
- [x] 4.4 Aplicar a migração `0025` no Supabase de testes (sem dados a alterar) e conferir a versão do Alembic. Aplicada em 2026-10-03 a pedido do usuário, no projeto `wvfrwmplruhwfkmwjtvl`: Alembic em `0025`, as 11 colunas de `dice_rolls`, RLS ligado e sem acesso de `anon`/`authenticated`.

## 5. Item 4: Colocar token já oculto

- [x] 5.1 Botão "Colocar oculto" (olho cortado) ao lado de "Colocar" em cada personagem das duas listas, mandando `oculto: true` sem mexer na chave; "Colocar" e o arraste seguem a chave. Verificado com teste do `RoomView` (botão manda oculto com a chave desligada, que continua desligada; "Colocar" depois manda visível) e no navegador, com o botão ao lado de "Colocar" no Lion.
- [x] 5.2 Retirar a chave geral "Colocar oculto dos jogadores" (pedido do usuário): "Colocar" e o arraste põem visível, o olho cortado põe oculto. Verificado com os testes do `RoomView` (sem a chave; olho cortado manda oculto; "Colocar" manda visível; a seção "Tokens" recolhe as listas).

## 6. Item 5: Rolagens ocultas do Narrador

- [x] 6.1 Coluna `oculta` em `dice_rolls` (na `0025`), recusa para jogador, lista filtrada para quem não é Narrador e aviso só no tópico do Narrador. Verificado com `test_rolagens.py` (14 testes).
- [x] 6.2 Chave "Rolar oculto dos jogadores" na aba Dados, só para o Narrador, ligada por padrão e guardada no navegador; marca "oculta" no visor e no histórico. Verificado com `RoomView.dados.test.tsx` e no navegador (ambiente local separado): o d20 oculto do mestre não chegou ao jogador nem pela API, e o d8 com a chave desligada chegou como "Mestre 1d8".

## 7. Item 6: Tamanho do token

- [x] 7.1 `sala.redimensionar_token` e a rota `POST /mesas/{mesa_id}/sala/tokens/{token_id}/tamanho` (só o Narrador, 1 a 10, limite da cena, versão conferida, auditoria e aviso `sala.atualizada`); OpenAPI e cliente regenerados. Verificado com `test_sala.py` (2 testes novos).
- [x] 7.2 Controle "Tamanho" (− e +) para o token escolhido, só para o Narrador, e marca do tamanho na lista. Verificado com teste do `RoomView` e no navegador (ambiente local separado): o Ogro foi de 1×1 a 3×3, o grid o desenhou cobrindo 3×3 casas, e a sala do jogador recebeu o tamanho 3.
- [x] 7.3 Menu do botão direito sobre o token no grid (pedido do usuário), só para o Narrador, com o mesmo controle (`MenuDoToken.tsx`); o botão direito não arrasta mais o token nem a vista. Verificado com teste do `RoomView` (abre com foco, + manda o tamanho, Escape fecha, o jogador não tem o menu) e no navegador: botão direito no Ogro abriu o menu junto ao cursor, − levou de 3×3 a 2×2 no grid, e um clique fora fechou.

## 8. Item 7: Histórico com rolagem própria

- [x] 8.1 Histórico com barra de rolagem própria (só ele rola em tela larga e alta; altura máxima nas outras; lista focável), opções num bloco "Opções" fechado por padrão, visor e itens mais compactos. Verificado com os testes da Sala e no navegador em 1280 × 800: com 12 rolagens, o painel não rolou (sem sobra de altura) e só o histórico rolou.

## 9. Item 8: Rolagem pela ficha

- [x] 9.1 Servidor: `personagem_id`, `atributo` e `pericia` no pedido; totais buscados na ficha pelo servidor, com a autorização de leitura da ficha; ficha e parcelas guardadas (colunas na `0025`); expressão com as parcelas. Verificado com `test_rolagens.py` (17 testes: soma de Destreza 3 + ajuste 1 e Furtividade 2, jogador recusado na ficha de outro, Narrador aceito, chaves inválidas recusadas).
- [x] 9.2 Aba Dados: faixa de retratos compacta com "Sem ficha" (fichas do jogador; para o Narrador, as da cena), seletores de Atributo e Perícia com os valores da ficha, 1d20 posto sozinho e expressão com as parcelas; o histórico mostra o personagem. Verificado com `RoomView.dados.test.tsx` (jogador e Narrador) e no navegador (ambiente local separado): o jogador rolou pela ficha de Lion com Destreza (+3) e Furtividade (+2), e o servidor deu 9 + 3 + 2 = 14; o mestre viu "Sem ficha" e Lion, que tem token na cena.

## 10. Item 9: Sala sempre ligada

- [x] 10.1 Servidor: tirar a exigência do módulo das rotas da Sala, das rolagens e do chão e baús; tirar as rotas `/modulos` e o campo `modulo_ativo`; regenerar OpenAPI e cliente. Verificar com `test_sala.py`, `test_rolagens.py` e os testes do chão e baús, sem ativar módulo. Feito em 2026-10-03: `test_sala.py` e `test_rolagens.py` sem ativar módulo (27 testes); suíte Python inteira (617 testes) passando; OpenAPI e cliente regenerados; no navegador, uma mesa nova abriu a Sala direto, com o convite para a primeira cena.
- [x] 10.2 Interface: sair a tela "Sala desativada" (botão "Ativar sala" e atalho do jogador para a ficha). Verificado com testes do `RoomView` e do `TableWorkspace` (mesa sem cena mostra o convite ou o aviso de cena, nunca a tela de desativada).

## 11. Item 10: Tirar dado com o botão direito

- [x] 11.1 `removerDado`, `remover` no `useRolador` e botão direito, Delete e Backspace no botão do dado (que não fica mais desativado no máximo, para ainda poder tirar). Verificado com `dados.test.ts`, `RoladorDeDados.test.tsx` (botão direito e Delete tiram um, sem menu do navegador, e sem dado não mudam nada) e no navegador: um clique direito de verdade levou 3d6 a 2d6.

## 12. Verificação

- [x] 12.1 Rodar `npm test` e `npm run lint` no frontend, todos passando. Verificado em 2026-10-03 depois das rolagens pelo servidor: 104 arquivos, 867 testes; lint sem problemas; `npm run build` sem erros; suíte Python inteira (610 testes) passando.
- [x] 12.2 Mostrar ao usuário a aba Dados, os dados rolando no tabuleiro e o novo controle de zoom no navegador e obter a aprovação visual. Aprovado pelo usuário em 2026-10-03 ("tudo aprovado").
