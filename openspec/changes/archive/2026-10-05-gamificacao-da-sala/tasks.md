# Tasks

## 1. Regras

- [x] 1.1 Escrever, em `rules/sistema/Rolagens.md`, o parágrafo sobre a ampliação das faixas de 20 natural e 1 natural por habilidade de classe, arquétipo ou raça, com o exemplo 19–20 e 1–2 e as ampliações se somando, em linguagem de mesa e sem campos nem JSON (D11). A tarefa fecha quando o usuário aprovar o texto. Aprovado pelo usuário em 2026-10-05.

## 2. Dados do catálogo

- [x] 2.1 Fazer `catalogos.Habilidade` ler `amplia_critico` e `amplia_falha_critica` (inteiros ≥ 1, opcionais) de `classes.json` e `racas.json`. Um valor inválido deve invalidar o catálogo e manter a última versão válida. Testes: lê o valor, recusa 0, negativo e texto, e uma habilidade sem o campo continua igual.
- [x] 2.2 Criar `cursed_platform/criticos.py` com `faixa_do_personagem`: soma pelas cartas de catálogo que o personagem possui e que não estão arquivadas, com limites 2 e 19 (D1). Testes:
  - padrão (20, 1);
  - uma e duas ampliações;
  - falha ampliada;
  - troca de classe;
  - carta arquivada não conta;
  - os limites.
- [x] 2.3 Garantir por teste que a ampliação não entra no `conteudo` da carta materializada nem em resposta da API de cartas.

## 3. Migração e persistência

- [x] 3.1 Criar a migração `0027_gamificacao_da_sala`, depois da `0026`:
  - tabelas `room_preferences`, `mvp_rounds` (índice único parcial de votação não encerrada por mesa) e `mvp_votes`;
  - colunas `dice_rolls.sessao_id` e `dice_rolls.marcas`;
  - RLS no padrão de `room_music`.

  Também criar os registros correspondentes em `persistence.py`. Teste: subir e descer a migração.
- [x] 3.2 Tornar pública a consulta da sessão ativa (`sessoes.ativa`) e fazer a auditoria usá-la. Os testes atuais da auditoria devem continuar passando.

## 4. Servidor: sessões, preferências e críticos

- [x] 4.1 Criar as rotas de sessão: iniciar, encerrar e listar (atual e última encerrada), só para o Narrador, com 409 se já houver sessão aberta, aviso `sala.sessao` e auditoria (D4). Testes: numeração sequencial, jogador recebe 403, fora da mesa recebe 404, início duplicado recebe 409.
- [x] 4.2 Criar as rotas de preferências da Sala (`GET` para a mesa, `PUT` só para o Narrador), com aviso `sala.preferencias` e auditoria (D3). Testes: padrão desligado, jogador recebe 403, gravar e ler.
- [x] 4.3 Fazer `rolagens.rolar` gravar `sessao_id` e `marcas` (só d20; um valor nas duas faixas conta como crítico), com a faixa do personagem quando a rolagem é pela ficha e a padrão sem ficha (D2). Fazer `para_resposta` só enviar marcas com o destaque ligado e nunca enviar a faixa. Testes com sorteio fixo:
  - 20 com e sem ficha;
  - 19 com ampliação e sem ficha;
  - 1 e 2 com falha ampliada;
  - `2d20`;
  - d100 sem marca;
  - destaque desligado não envia marcas;
  - ligar o destaque depois mostra a marca antiga.

## 5. Servidor: estatísticas e MVP

- [x] 5.1 Criar `cursed_platform/estatisticas.py` (D5). Testes:
  - vida perdida e recuperada pela auditoria de `recursos.pv.atual` (16→9→12→4 dá 15 e 3);
  - aumento de máximo não conta;
  - campo ausente antes não conta;
  - rolagens ocultas excluídas;
  - sorte normalizada por faces e rótulos nos limites ±5;
  - "Poucos dados" abaixo de 10;
  - período da sessão atual e da última encerrada.
- [x] 5.2 Criar a rota `GET /mesas/{id}/sala/estatisticas`. O Narrador vê todos; o jogador vê só a si ou todos com o placar ligado; os campos de crítico só vêm com o destaque ligado. Testes de permissão e visibilidade.
- [x] 5.3 Criar as rotas do MVP: abrir, votar (com troca), encerrar, desempatar e ler (D6). Testes:
  - menos de 2 jogadores recebe recusa;
  - voto em si, do Narrador e em quem não é jogador recebem recusa;
  - o último voto vale;
  - o vencedor único é anunciado;
  - o empate leva a desempate, e só um empatado é aceito no desempate;
  - sem votos, a votação termina sem MVP;
  - nenhuma resposta traz contagem por candidato nem quem votou em quem;
  - o voto não é auditado;
  - o histórico de vencedores aparece.
- [x] 5.4 Regenerar `openapi.json` e `schema.ts`. Os testes de contrato devem passar.

## 6. Interface: abas por papel

- [x] 6.1 Em `abasDoPainel`, trocar `chat` por `papel` (Mestre ou Jogador conforme o papel) e fazer `"chat"` guardado abrir a aba do papel. Remover `ChatReservado` e o CSS do chat. Atualizar os testes das abas: ordem, setas, rótulo por papel e mapeamento do valor antigo.
- [x] 6.2 Criar o hook `useGamificacaoDaSala` (preferências, sessões, estatísticas e votação, com as ações do Narrador e o voto), com invalidação pelos avisos novos no `RoomPresence` e o intervalo da Sala. Testes dos hooks.
- [x] 6.3 Criar `MestreDoPainel`, em sub-abas Sessão, Preferências, MVP e Estatísticas (pedido do usuário; setas, Home e End; escolha lembrada; aviso de votação aberta):
  - sessão (iniciar e encerrar);
  - chaves "Destaque de críticos" e "Mostrar estatísticas da mesa";
  - estatísticas de cada jogador por período;
  - votação ("Abrir", "x de y votaram", "Encerrar", escolha no empate);
  - lista de MVPs anteriores.

  Testes de cada controle e do estado desabilitado com menos de 2 jogadores.
- [x] 6.4 Criar `JogadorDoPainel`:
  - sessão atual;
  - "Esta sessão" e "Campanha" com vida, rolagens, críticos (só com o destaque) e sorte;
  - placar da mesa quando visível;
  - votação aberta com os outros jogadores, o próprio voto marcado e a troca de voto.

  Testes, incluindo que o jogador não vê a si como opção.

- [x] 6.5 Trocar as seções retráteis da aba Cena por sub-abas (pedido do usuário, 2026-10-04): Cenas, Personagens e Tokens para o Narrador, com quantidade, setas, Home e End e escolha lembrada; o jogador vê só "Tokens da cena". Extrair `SubAbas` para as abas Mestre e Cena e remover `SecaoRetratil`. Atualizar os testes da Sala.

## 7. Interface: destaque de críticos

- [x] 7.1 Na aba Dados, mostrar o selo "Crítico" ou "Falha crítica" no d20, no visor e no histórico, e acrescentar "crítico" ao anúncio do total. Testes com rolagens com e sem marcas.
- [x] 7.2 No tabuleiro: Aprovado pelo usuário em 2026-10-05.
  - brilho dourado ou rubro no dado 3D marcado, ao parar;
  - faixa "Crítico!" ou "Falha crítica!" sobre o tabuleiro, que some em 2,5 s;
  - sem pulsação com menos movimento;
  - o destaque respeita "Só as minhas" e as rolagens ocultas.

  Testes do hook e da camada. Fecha com a aprovação visual do usuário.

## 8. Interface: reações e anúncio do MVP

- [x] 8.1 Gerar com o Codex CLI as 6 pinturas de reação e o selo de MVP, tendo como referência o dado pintado do rolador. Gravar em `arte-original/` e gerar os webp pelo `preparar_arte.py`. A tarefa fecha com a arte aprovada pelo usuário. Aprovado pelo usuário em 2026-10-05.
- [x] 8.2 Acrescentar o evento `sala.reacao` em `useRoomEphemera`, com a lista fixa validada e o limite de 1 por segundo por usuário no envio e na recepção. Testes.
- [x] 8.3 Criar `BotaoDeReacao` (canto inferior direito, acima do zoom, menu com teclado e Esc) e `BaloesDeReacao` (no máximo 8, 3 s, sem subir com menos movimento, sem cliques e `aria-hidden`). Testes de teclado, limite e expiração.
- [x] 8.4 Mostrar o anúncio do MVP sobre o tabuleiro quando a votação é encerrada com a Sala aberta, sem anunciar o MVP anterior ao abrir a Sala, com anúncio para leitores de tela. Testes.

## 9. Verificação

- [x] 9.1 Rodar a suíte completa (`pytest`, `vitest`, `tsc`, lint) sem falhas.
- [x] 9.2 Fazer a verificação no navegador, no ambiente local, com Narrador e jogador em origens diferentes, cobrindo: Aprovado pelo usuário em 2026-10-05.
  - abas por papel;
  - sessão;
  - destaque de 20 e 1;
  - placar;
  - votação completa com empate;
  - reações.

  Mandar as capturas ao usuário. A tarefa fecha com a aprovação visual dele.
- [x] 9.3 Aplicar a `0027` no Supabase de testes, depois da `0026`, com autorização do usuário, e anotar no `AGENTS.md`. Aplicada no Supabase de testes (`wvfrwmplruhwfkmwjtvl`) em 2026-10-05, a pedido do usuário; Alembic em `0030`, RLS ligado e sem acesso para `anon` e `authenticated`.
