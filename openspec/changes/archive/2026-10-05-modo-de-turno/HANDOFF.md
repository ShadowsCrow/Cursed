# Handoff — modo-de-turno

Arquivada em 2026-10-05, com tudo aprovado pelo usuário. A proposta, o design e as tarefas aqui ao lado detalham cada item. Os requisitos foram para:
- `openspec/specs/modo-de-turno/spec.md` (nova);
- `calculo-de-valores-da-ficha`;
- `catalogo-de-classes-e-racas`.

## Itens

1. **Entrar em modo turno:** como no Baldur's Gate 3, só o Narrador abre, e só com sessão em andamento. Participam os personagens com token na cena ativa; os tokens da mesma ficha que estão na cena ao abrir formam um grupo.
2. **Iniciativa:**
   - a rolagem é `1d20 + Raciocínio + Prontidão`, pela ficha, sorteada pelo servidor;
   - o jogador vê o aviso "Role iniciativa";
   - o Narrador rola pelos NPCs e monstros, juntos ou um a um;
   - o desempate é pelo Raciocínio, depois pela Prontidão e por fim por d20, só entre os empatados.
3. **Começar a disputa:** o nome não é "combate", porque o modo serve a qualquer disputa. O Narrador avança a vez e as rodadas.
4. **Barra de ordem** no topo do grid, com retratos, a vez em destaque, a rodada e quem falta rolar.
5. **Deslocamento na disputa:**
   - o jogador só move na própria vez, até o saldo;
   - a diagonal custa 1 m;
   - "Correr" dobra o saldo;
   - o Deslocamento vem da raça, de itens, efeitos e habilidades (`deslocamento` no catálogo).
6. **Narrador na disputa:**
   - mover quem está na vez gasta o saldo;
   - com a chave "Movimento livre" (ou Alt) o movimento não gasta, e só assim ele move quem está fora da vez.
7. **Prévia tracejada do arraste,** com os metros e o "restam/faltam", em legenda de 18 px em qualquer zoom.
8. **Entrar no meio da disputa:**
   - todo token posto com o modo turno aberto entra sem iniciativa e trava o Próximo turno até rolar;
   - um token de ficha que já participa joga sozinho ("Goblin 2"), com iniciativa, vez e saldo próprios.
9. **Brilho do token da vez:** halo dourado que pulsa, parado para quem pede menos movimento.
10. **Destaque do token escolhido:** aro azul-gelo no grid, e um novo clique na aba Tokens tira a escolha.

## Decisões do usuário

- **Diagonal = 1 m:** decidida em 2026-10-04 e registrada em `rules/sistema/Iniciativa, Movimento e Posicionamento.md`.
- **Quem entra rola e trava o Próximo turno:** vale para qualquer participante na cena sem iniciativa (2026-10-05).
- **Fora da vez, o Narrador só move com o Movimento livre,** para não mover a peça errada sem querer.
- **Não há validação em mesa real.** A verificação foi feita por testes, pelo navegador e pela aprovação do usuário.

## Banco

- **`0028_modo_de_turno`:** tabelas `turn_combats` e `turn_participants`, e `dice_rolls.finalidade`.
- **`0029_deslocamento_no_turno`:** `movimento_gasto` e `correndo` em `turn_participants`.
- **`0030_token_proprio_no_turno`:** `turn_participants.token_id`; a restrição única passa a ser por token.
- **Permissões:** RLS ligado e sem acesso para `anon` e `authenticated`.
- **Supabase de testes:** as três foram aplicadas no projeto `wvfrwmplruhwfkmwjtvl` em 2026-10-05; o Alembic está em `0030`.

## Verificação

- **Testes:** a suíte Python inteira passa (725 testes). O frontend passa em `npm test` (974 testes), no lint, no TypeScript, no build e no cliente gerado.

## Pendências fora desta mudança

- **Bônus de Deslocamento:** nenhuma habilidade tem valor de `deslocamento` ainda; cada um depende de decisão do usuário.
- **Ambiente local:** o lançador da Sala local (5197) agora religa a API e o Vite quando a recarga da API no Windows manda Ctrl+C. O lançador fica fora do repositório.
