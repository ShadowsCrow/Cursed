# Tasks

## 1. Migração e persistência

- [x] 1.1 Criar a migração `0028_modo_de_turno`, depois da `0027`:
  - `turn_combats`, com índice único parcial de um modo turno não encerrado por mesa;
  - `turn_participants`, com `personagem_id` único por disputa;
  - `dice_rolls.finalidade`;
  - RLS no padrão de `room_music`.

  Também criar os registros em `persistence.py`. Teste: subir e descer a migração, e as restrições.

## 2. Domínio

- [x] 2.1 Criar `cursed_platform/turno.py` com a entrada (D1). A entrada:
  - exige sessão em andamento, cena ativa e ao menos um personagem com token;
  - junta os tokens de uma mesma ficha num participante só.

  Testes:
  - jogadores, NPC e monstro entram;
  - o objeto sem personagem fica de fora;
  - os dois Goblins da mesma ficha viram um participante;
  - sem sessão, sem cena ou sem personagens, há recusa;
  - um segundo modo turno aberto é recusado.
- [x] 2.2 Escrever a ordem calculada e o desempate pela regra (D2). Testes:
  - maior total primeiro;
  - empate desfeito por Raciocínio, depois por Prontidão;
  - empate total gera d20 só para os empatados, repetidos até desempatar, sem mudar o total;
  - um desempate resolvido não é refeito quando outro empata depois;
  - quem falta rolar fica no fim;
  - a ordem é estável.
- [x] 2.3 Escrever a vez e as rodadas:
  - começar põe a rodada 1 e a vez no primeiro;
  - avançar pula quem falta rolar e quem está fora da cena;
  - passar do último volta ao primeiro e soma uma rodada;
  - o pendente que rola no meio entra na posição dele, e a vez continua com o mesmo participante;
  - sair encerra.

  Testes de cada caso.

## 3. Servidor

- [x] 3.1 Gravar `finalidade` em `rolagens.rolar` e enviá-la em `para_resposta`; acrescentar o campo a `RolagemDeDados`. Teste.
- [x] 3.2 Criar as rotas de `turno.py` (D3, D4): entrar, rolar iniciativa, rolar os NPCs, começar, próximo turno, sair e ler. Também emitir `sala.turno`, auditar, e fazer o encerramento da sessão encerrar o modo turno. Testes:
  - o jogador rola só pelos próprios personagens (403 por outro);
  - o Narrador rola por qualquer um, e pelos NPCs ocultos;
  - uma segunda rolagem dá 409;
  - uma ficha sem Prontidão dá 422 com o nome;
  - as escritas do Narrador dão 403 ao jogador e 404 a quem não é da mesa;
  - encerrar a sessão encerra o modo turno;
  - os eventos de auditoria saem.
- [x] 3.3 Fazer a leitura filtrada por leitor (D5). Testes:
  - o jogador não vê o participante com todos os tokens ocultos;
  - o jogador vê o nome do token, e não o da ficha oculta;
  - o total de NPC vem nulo para o jogador e completo para o Narrador;
  - `meu` vem só nos personagens do leitor;
  - quem está fora da cena vem marcado.
- [x] 3.4 Regenerar `openapi.json` e `schema.ts` (`generate-client.mjs`). A conferência do cliente deve passar.

## 4. Interface

- [x] 4.1 Criar o hook `useModoDeTurno`, com a consulta, as ações e a invalidação por `sala.turno` no `RoomPresence`. A rolagem própria anima no tabuleiro e entra no histórico. Testes.
- [x] 4.2 Criar `BarraDeTurno`, conforme D6: retratos na ordem, vez em destaque, "Rodada N", controles do Narrador, "falta rolar", anúncio da vez, rolagem de lado e posição com o painel aberto. Para o Narrador, o quadro da fase de iniciativa. Testes.
- [x] 4.3 Criar `AvisoDeIniciativa` para o jogador, com um botão por personagem dele que falta, que some quando todos rolaram. Testes.
- [x] 4.4 Pôr na aba Mestre, sub-aba Sessão, "Entrar em modo turno" ou "Sair do modo turno", com o motivo quando desativado. Mostrar a marca "Iniciativa" no histórico da aba Dados. Testes.

## 6. Deslocamento no modo turno (pedido do usuário, 2026-10-04)

- [x] 6.1 Escrever a frase da diagonal em `rules/sistema/Iniciativa, Movimento e Posicionamento.md`, na seção "Espaço e alcance" (D10).
- [x] 6.2 No catálogo, criar o campo opcional `deslocamento` nas habilidades (inteiro diferente de zero), levado em `HabilidadeCatalogo`. Testes: lê o valor, recusa 0 e texto.
- [x] 6.3 Criar o valor calculado `deslocamento` em `calcular_valores_derivados` (D7). Testes:
  - a raça como base;
  - sem raça, 9 m;
  - item equipado e efeito ativo com alvo `deslocamento`;
  - situacional fora do total;
  - bônus de habilidade do catálogo;
  - mínimo 0.
- [x] 6.4 Escrever a migração `0029_deslocamento_no_turno` (`turn_participants.movimento_gasto` e `correndo`) e o saldo do turno no domínio: zerar ao receber a vez, o custo `max(|dx|, |dy|)`, o limite com Correr. Testes de domínio e da migração.
- [x] 6.5 Fazer o movimento do token cobrar o saldo no modo turno (D8) e criar a rota de Correr (D9); o estado traz `movimento` para quem pode ver. Testes de API:
  - aceita até o Deslocamento;
  - recusa o que passa, com a mensagem;
  - diagonal;
  - fora da vez (403);
  - na fase de iniciativa (403);
  - o Narrador sem limite;
  - tokens da mesma ficha dividem o saldo;
  - o saldo volta na próxima vez;
  - Correr dobra e é recusado fora da vez;
  - `movimento` só para o dono e o Narrador.

  Regenerar o OpenAPI e o cliente.
- [x] 6.6 Na barra, mostrar "Deslocamento: X de Y m" (e "Correndo") ao Narrador e ao dono, e o botão "Correr" para o dono na vez dele e para o Narrador. Testes de interface.

- [x] 6.7 Fazer o Narrador gastar o saldo ao mover quem está na vez e criar o "Movimento livre" (pedido do usuário, 2026-10-04):
  - `livre` no pedido de movimento, só para o Narrador;
  - botão na barra e Alt ao soltar;
  - o Narrador fora da vez continua livre.

  Testes de domínio, de API (inclusive o 403 ao jogador que pede `livre`) e de interface.

- [x] 6.8 Fazer a prévia tracejada do arraste no modo turno (D8b, pedido do usuário, 2026-10-04):
  - contorno na origem, linha até o destino e rótulo com os metros;
  - "restam" ou "faltam" na vez, "livre", "fora da vez" e "Não é a sua vez";
  - some ao soltar ou cancelar, e não aparece fora da disputa.

  Testes da função de medida e do canvas.

- [x] 6.9 Pedidos do usuário de 2026-10-05:
  - "Movimento livre" vira chave liga/desliga na barra (sem o texto "ligado" e sem o aviso);
  - no modo turno, o Narrador só move participante fora da vez com o Movimento livre (403 sem ele, e prévia em vermelho);
  - a legenda da prévia fica maior (18 px) e com o mesmo tamanho em qualquer zoom.

  Testes de domínio, API e interface.

- [x] 6.10 Fazer com que quem entra no meio da disputa role a iniciativa e trave o Próximo turno (D8c, pedidos do usuário de 2026-10-05):
  - o token novo de personagem que não participa cria um participante sem iniciativa, com auditoria;
  - o Próximo turno fica bloqueado por qualquer participante na cena sem iniciativa, com 409 e os nomes;
  - na barra, o botão desativado com o motivo e o quadro de pendentes também durante a disputa.

  Testes de domínio, API e interface.

- [x] 6.11 Fazer cada token posto com o modo turno aberto, de uma ficha que já participa, jogar sozinho (D8d, pedido do usuário de 2026-10-05):
  - migração `0030_token_proprio_no_turno` com `turn_participants.token_id` e a restrição única por token;
  - iniciativa, vez e saldo próprios, e nomes numerados ("Goblin 2");
  - o grupo que volta à cena mantém a iniciativa.

  Testes de domínio, API e da migração.

- [x] 6.12 Fazer os tokens da vez brilharem com um halo animado (D8e, pedido do usuário de 2026-10-05):
  - `token_ids` em cada participante, que também liga o token arrastado ao participante certo na prévia;
  - halo que pulsa e fica parado com menos movimento pedido.

  Testes do brilho e da prévia.

- [x] 6.13 Destacar no grid, com aro azul-gelo, o token escolhido na aba Tokens ou no grid; o item da lista na mesma cor e um novo clique tira a escolha (pedido do usuário, 2026-10-05). Testes do aro e da Sala.

## 5. Verificação

- [x] 5.1 Rodar a suíte completa (`unittest`, `vitest`, `tsc`, lint) sem falhas.
- [x] 5.2 Fazer a verificação no navegador, no ambiente local, com Narrador e jogador em origens diferentes, cobrindo: Aprovado pelo usuário em 2026-10-05.
  - entrar;
  - o aviso e a rolagem do jogador;
  - os NPCs pelo Narrador;
  - começar com um pendente;
  - avançar até a rodada 2;
  - um monstro oculto;
  - sair.

  Mandar as capturas ao usuário. A tarefa fecha com a aprovação visual dele.
- [x] 5.3 Aplicar a `0028`, a `0029` e a `0030` no Supabase de testes, depois da `0026` e da `0027`, com autorização do usuário, e anotar no `AGENTS.md`. Aplicada no Supabase de testes (`wvfrwmplruhwfkmwjtvl`) em 2026-10-05, a pedido do usuário; Alembic em `0030`, RLS ligado e sem acesso para `anon` e `authenticated`.
