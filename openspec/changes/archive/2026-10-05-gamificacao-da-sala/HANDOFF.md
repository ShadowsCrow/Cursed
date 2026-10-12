# Handoff — gamificacao-da-sala

Arquivada em 2026-10-05, com tudo aprovado pelo usuário, inclusive o parágrafo novo de `rules/sistema/Rolagens.md`, o visual e as pinturas. A proposta, o design e as tarefas aqui ao lado detalham cada item. Os requisitos foram para:
- `openspec/specs/estatisticas-e-mvp-da-mesa/spec.md` (nova);
- `openspec/specs/reacoes-da-sala/spec.md` (nova);
- `experiencia-da-mesa`, `rolador-de-dados` e `catalogo-de-classes-e-racas`.

## Itens

1. **Abas Mestre e Jogador no lugar do Chat:**
   - a aba Mestre só o Narrador vê, com as sub-abas Sessão, Preferências, MVP e Estatísticas;
   - a aba Jogador mostra as estatísticas do próprio jogador.
2. **Sub-abas na aba Cena** (Cenas, Personagens e Tokens), no lugar das seções retráteis.
3. **Sessões de jogo,** numeradas, que o Narrador inicia e encerra. Rolagens e alterações de vida ficam ligadas à sessão, o que separa a sessão da campanha.
4. **Estatísticas do jogador:** vida perdida e recuperada, rolagens, críticos, falhas críticas e "sorte nos dados", na sessão e na campanha.
5. **Placar da mesa:** a chave do Narrador mostra a todos as estatísticas lado a lado.
6. **Destaque de críticos,** que o Narrador liga (desligado por padrão):
   - o dado 3D brilha;
   - aparece a faixa "Crítico!" ou "Falha crítica!" no tabuleiro;
   - o resultado fica marcado no histórico.

   A faixa vem só dos catálogos (`amplia_critico` e `amplia_falha_critica` nas habilidades). Nenhuma habilidade tem valor, e a faixa não aparece para os jogadores.
7. **Reações:** botão discreto no canto inferior direito do grid, com 6 pinturas geradas pelo Codex. Os balões são passageiros e não ficam guardados.
8. **Votação de MVP:**
   - o voto é secreto e ninguém vota em si;
   - em caso de empate, o Narrador decide;
   - o resultado é anunciado no tabuleiro, com selo pintado;
   - a aba Mestre guarda a lista dos MVPs anteriores.

## Decisões do usuário

- **Faixa de crítico só pelos catálogos,** ampliações se somando, registrada em `Rolagens.md` (texto aprovado em 2026-10-05). Cada valor de ampliação é decisão do usuário.
- **Estatísticas por sessão e por campanha,** com sessões iniciadas pelo Mestre.
- **MVP secreto,** sem voto em si, com o Mestre desempatando, e sem bônus mecânico.
- **Não há validação em mesa real.** A verificação foi feita por testes, pelo navegador e pela aprovação do usuário.

## Banco

- **`0027_gamificacao_da_sala`:**
  - tabelas `room_preferences`, `mvp_rounds` e `mvp_votes`;
  - `dice_rolls.sessao_id` e `marcas`;
  - RLS ligado e sem acesso para `anon` e `authenticated`.
- **Supabase de testes:** aplicada no projeto `wvfrwmplruhwfkmwjtvl` em 2026-10-05; o Alembic está em `0030`.

## Verificação

- **Testes:** a suíte Python inteira passa (725 testes). O frontend passa em `npm test` (974 testes), no lint, no TypeScript, no build e no cliente gerado.

## Pendências fora desta mudança

- **Valores de ampliação de crítico:** nenhuma habilidade tem valor ainda; cada um depende de decisão do usuário.
