# Design

## Contexto

Estado atual (2026-10-04):
- **Sessões** (`cursed_platform/sessoes.py`, mudança `gamificacao-da-sala`): no máximo uma em andamento por mesa. O encerramento passa por `platform/api/cursed_api/gamificacao.py`.
- **Rolagens** (`cursed_platform/rolagens.py`): o servidor sorteia e grava `RolagemRegistro` com `termos` (as parcelas da ficha), marcas de crítico e `sessao_id`, e emite `sala.rolagem`. Os navegadores recebem as rolagens dos outros por `useRolagensDaMesa`, que já anima no tabuleiro e põe no histórico.
- **Parcelas da ficha**: `valores_da_ficha` (em `live_sheet.py`) devolve os valores derivados com chave `atributo:<nome>` e `pericia:<nome>`, e `_termos_da_ficha` (em `room.py`) monta as parcelas. Para a iniciativa, as chaves são `atributo:raciocinio` e `pericia:prontidao`.
- **Tokens** (`TokenRegistro`): ligados ou não a um personagem (`personagem_id`), com `oculto` e `rotulo`. O snapshot da Sala já filtra o que cada leitor vê (`sala.token_visivel` e `sala.token_para`), e os retratos vêm por token (`useRetratosDosTokens`).
- **Regras**:
  - Iniciativa: `1d20 + Raciocínio + Prontidão`, com desempate por Raciocínio, depois Prontidão e nova rolagem só entre os empatados;
  - uma rolagem para um grupo de criaturas idênticas;
  - a ordem fica a mesma até o fim do conflito.

## Goals / Non-Goals

**Goals:**
- O servidor decide tudo o que conta: os participantes, os sorteios, o desempate, a ordem, a vez e a rodada. O navegador só mostra.
- Cada pessoa vê só o que pode ver, filtrado no servidor como o snapshot da Sala.
- A rolagem de iniciativa reaproveita o caminho que já existe, com o tabuleiro, o histórico, as estatísticas e o destaque de críticos.

**Non-Goals:**
- O movimento não aplica sozinho reduções, condições nem terreno difícil, e não há controle de ações e reações (veja a proposta).

## Decisões

### D1. Disputa e participantes em tabelas próprias
**`turn_combats`**, com uma linha por modo turno:
- `id`, `mesa_id`, `sessao_id` e `cena_id`;
- `estado`: `iniciativa`, `combate` ou `encerrado`;
- `rodada`, com 0 na fase de iniciativa;
- `vez_participante_id`;
- `aberto_em`, `aberto_por` e `encerrado_em`.

Um índice único parcial garante um só modo turno não encerrado por mesa.

**`turn_participants`**, com:
- `id`, `combate_id` e `personagem_id` (único por disputa);
- `rolagem_id`, nulo enquanto falta rolar;
- `total`, `raciocinio` e `prontidao`, copiados da rolagem;
- `desempate` (JSON), a lista de d20 de desempate.

A **ordem é calculada**, não guardada. A chave é `(rolou, total, raciocínio, prontidão, *desempate)`, em ordem decrescente, com quem falta rolar no fim. Assim, um pendente que rola depois entra sozinho na posição certa. A vez aponta para um participante, e não para uma posição, para continuar com a mesma pessoa quando a ordem muda.

Alternativa descartada: guardar a posição de cada um. Ela teria de ser recalculada a cada rolagem atrasada e pode divergir da regra.

### D2. Desempate pela regra, guardado
Depois de cada rolagem, o servidor agrupa os participantes que já rolaram pela chave `(total, raciocínio, prontidão)`. Em cada grupo com mais de um, ele percorre os níveis de desempate:
- no nível *i*, quem ainda não tem o *i*-ésimo d20 ganha um, sorteado com `secrets.randbelow`;
- quem continua empatado no nível *i* segue para o nível *i + 1*.

Só os ainda empatados rolam. Um desempate já resolvido não é refeito, porque os d20 antigos ficam guardados, e a ordem fica estável até o fim da disputa. Esses d20 não são `RolagemRegistro`: não aparecem no histórico nem nas estatísticas, só ordenam.

### D3. Rolagem de iniciativa pelo caminho que já existe
`POST /mesas/{id}/sala/turno/iniciativa` recebe `{participante_id}`.

Permissão:
- o dono do personagem pode rolar;
- o Narrador pode rolar por qualquer participante;
- os demais recebem 403.

O que a rota faz:
- monta as parcelas com `_termos_da_ficha`, com Raciocínio e Prontidão. Sem um dos dois, responde 422 com o nome do que falta;
- chama `rolagens.rolar` com `{20: 1}`, as parcelas, a faixa de crítico do personagem e `finalidade="iniciativa"`;
- marca a rolagem como oculta quando o Narrador rola por um personagem sem dono (NPC ou monstro);
- grava `rolagem_id`, `total` (o total da rolagem), `raciocinio` e `prontidao` no participante;
- roda o desempate.

`POST /sala/turno/iniciativa/npcs` (só o Narrador) faz o mesmo para todos os participantes sem dono que faltam, numa transação.

`dice_rolls` ganha a coluna `finalidade` (nula ou `iniciativa`), e `RolagemDeDados` ganha o campo `finalidade`. O histórico mostra a marca "Iniciativa".

Para animar a própria rolagem, o navegador a recebe na resposta e a passa a `dadosNoTabuleiro.animar` e a `rolador.receber`. As rolagens dos outros já chegam por `useRolagensDaMesa`.

### D4. Rotas e avisos
Rotas em `platform/api/cursed_api/turno.py`, sob `/mesas/{id}/sala/turno`:
- `GET`: o estado visto pelo leitor;
- `POST` (entrar), `POST /iniciativa`, `POST /iniciativa/npcs`, `POST /inicio` (começar), `POST /proximo` e `POST /encerramento`;
- todas as escritas, salvo a rolagem do próprio jogador, só do Narrador;
- recusas com 409 (estado errado), 422 (sem sessão, sem cena, sem participantes ou ficha sem valor) e 403/404 pelo padrão da Sala.

Cada mudança emite `sala.turno` (público, sem dados) e audita:
- `turno.aberto`, com a quantidade de participantes;
- `turno.combate_iniciado`;
- `turno.vez`, com o nome e a rodada;
- `turno.encerrado`, com as rodadas.

O nome no registro é o do token visível a quem lê o registro, pelas regras de visibilidade que a auditoria já aplica a personagens ocultos.

`encerrar_sessao` chama `turno.encerrar_aberto` antes de fechar a sessão.

Detalhes decididos na implementação:
- "Começar a disputa" exige que ao menos um participante na cena já tenha rolado. Sem isso, não há quem receba a vez, e o servidor responde 422. Na barra, o botão fica desativado.
- Uma ficha sem Raciocínio ou Prontidão é recusada com a mensagem "A ficha não tem valor de X para a iniciativa".
- Em "Rolar todos os NPCs e monstros", uma ficha incompleta interrompe tudo, com o nome do participante.

### D5. Estado filtrado por leitor
`turno.estado(session, mesa_id, leitor)` devolve `{combate: null}` ou a disputa com:
- `estado`, `rodada` e `vez_participante_id`;
- `participantes` na ordem, cada um com `id`, `personagem_id`, `nome`, `token_id` (o primeiro token visível, para o retrato), `tokens`, `rolou`, `total`, `meu` e `fora_da_cena`.

Filtros para jogadores:
- some o participante sem token visível (`sala.token_visivel`);
- o `nome` é o `rotulo` do token visível;
- o `total` só vem para personagens com dono.

O Narrador recebe tudo. "Fora da cena" é calculado na hora pelos tokens da cena ativa: quem não tem mais token sai da barra e é pulado ao avançar a vez.

### D6. Interface
- Hook `useModoDeTurno`: estado (React Query, `intervaloDaSala`, invalidado por `sala.turno` no `RoomPresence`) e as ações.
- `BarraDeTurno.tsx`, no topo do grid, abaixo da moldura do nome da cena:
  - retratos circulares na ordem, a vez com moldura dourada e um leve brilho, e o rótulo "Rodada N";
  - para o Narrador, "Próximo turno" e "Sair do modo turno";
  - rolagem de lado em telas estreitas;
  - à esquerda do painel aberto (`--largura-painel`), como os outros controles;
  - uma região `aria-live` anuncia "Vez de X, rodada N".
- Na fase de iniciativa, a barra mostra "falta rolar" nos pendentes. Para o Narrador, abre logo abaixo um quadro com "Rolar todos os NPCs e monstros", "Rolar por ele" em cada pendente e "Começar a disputa".
- `AvisoDeIniciativa.tsx`: um quadro para o jogador com "Role iniciativa" e um botão por personagem dele que falta. Some quando todos os dele rolaram.
- Aba Mestre, sub-aba Sessão: "Entrar em modo turno" ou "Sair do modo turno", com o motivo quando estiver desativado.

### D7. Deslocamento como valor calculado
`calcular_valores_derivados` ganha o valor `deslocamento` ("Deslocamento", grupo `status`). Assim, ele aparece no Status da ficha com as fontes, e os modificadores com alvo `deslocamento` de itens equipados e de efeitos ativos já somam pelo mecanismo existente (`com_efeitos`).

As fontes fixas são:
- **base:** "Raça: X", com `Raca.deslocamento` do catálogo; sem raça, "Padrão das regras" com 9 m;
- **habilidades do catálogo:** "Classe/Arquétipo/Raça: nome", com o campo opcional `deslocamento` (inteiro diferente de zero) das habilidades concedidas pela ficha (`cartas_catalogo.habilidades_da_ficha`).

O mínimo é 0.

### D8. Saldo do turno e custo do movimento
`turn_participants` ganha `movimento_gasto` (m, 0) e `correndo` (bool). Ao receber a vez (em `comecar` e em `proximo`), o participante zera os dois.

O movimento de token (`room.mover_token`) consulta o modo turno antes de mover. O pedido ganha `livre` (bool, falso por padrão), que só o Narrador pode mandar (403 para jogador).
- O Narrador com `livre` passa direto.
- O Narrador sem `livre`, movendo um participante que **não** está na vez (ou na fase de iniciativa), recebe 403 "Fora da vez: ligue o Movimento livre para mover" (decisão do usuário, 2026-10-05: evita mover a peça errada sem querer).
- O Narrador sem `livre`, movendo o participante que está na vez, paga custo e limite como abaixo (decisão do usuário, 2026-10-04: o andar do NPC na vez dele conta).
- O jogador, se o token é de um participante:
  - na fase de iniciativa, o jogador recebe 403;
  - na disputa, o jogador recebe 403 "Não é a sua vez" se o participante não está na vez ou se o personagem não é dele;
  - o custo é `max(|dx|, |dy|)`, e o limite é `deslocamento × (2 se correndo)`. Se `gasto + custo > limite`, o jogador recebe 422 "Faltam N m; o movimento custa M m";
  - se cabe, `gasto += custo`.
- Tokens que não são de participantes seguem só a permissão de movimento já existente.

O Deslocamento é calculado na hora, por `valores_da_ficha`, para considerar itens e efeitos atuais.

A recusa volta ao navegador pelo caminho de erro que o movimento já tem: o token volta à posição confirmada e a mensagem aparece. O estado do turno traz `movimento: {gasto, limite, correndo}` só para o participante na vez e só ao Narrador e ao dono.

No navegador, o Narrador liga a chave "Movimento livre" na barra (uma chave liga/desliga, como as demais da Sala; fica ligada até desligar, só nesta aba) ou segura Alt ao soltar o token. A Sala acompanha a tecla Alt por `keydown`/`keyup` na janela, sem mexer no canvas.

### D8b. Prévia tracejada do arraste
O `RoomCanvas` ganha `medirArraste(tokenId, origem, destino)`, que devolve `{texto, excede}` ou nada.

O texto é montado no `RoomView` por uma função pura (`medidaDoArraste.ts`), a partir de:
- o estado do turno e o saldo da vez;
- quem está arrastando;
- o movimento livre (botão ou Alt).

O canvas desenha numa camada própria (`rastro`, acima dos tokens e sem receber eventos):
- o contorno tracejado da origem e a linha tracejada até o destino, feitos com segmentos curtos, porque o PixiJS não tem tracejado nativo;
- o rótulo com fundo escuro, dourado ou vermelho.

A camada é redesenhada a cada casa nova do arraste, refeita se a cena redesenhar no meio dele e limpa ao soltar ou cancelar. Fora da disputa, a função devolve nada e não há prévia.

### D8c. Entrar no meio da disputa e bloqueio do Próximo turno
A rota de criar token chama `turno.incluir(session, mesa_id, token)` depois de criar. Com modo turno aberto, se o token está na cena do modo turno e o personagem dele ainda não é participante (nem está excluído), cria-se um participante sem iniciativa, com auditoria `turno.entrou` e o aviso `sala.turno`.

`proximo` recusa com 409 "Falta rolar a iniciativa de A, B." enquanto houver participante com token na cena sem total. Os nomes são os do token. Na barra, o "Próximo turno" fica desativado com esse texto como dica, e o quadro de pendentes do Narrador ("Rolar por ele", "Rolar todos os NPCs e monstros") aparece também durante a disputa.

### D8d. Token próprio para a mesma ficha
O usuário pôs mais dois Largatos-macaco com o modo turno aberto e esperava que eles rolassem; com o grupo por ficha, nada acontecia (2026-10-05). Então `turn_participants` ganha `token_id` (migração `0030_token_proprio_no_turno`):
- sem `token_id`, o participante é o grupo da ficha: os tokens dela na cena, menos os que têm participante próprio;
- com `token_id`, é só aquele token, com iniciativa, vez e saldo próprios.

A restrição única passa de `(combate_id, personagem_id)` para `(combate_id, token_id)`; o grupo único por ficha fica a cargo de `turno.incluir`. Ele cria o grupo quando a ficha não participa; cria o token próprio quando o grupo ainda tem outro token na cena; e não cria nada quando o grupo está todo fora (o token volta ao grupo, com a iniciativa dele). `_participante_do_token` procura primeiro o próprio e depois o grupo. Os nomes repetidos ganham número na ordem dos tokens, e para o jogador o número conta só os que ele vê, para não revelar token oculto.

Na descida da `0030`, os participantes de token próprio são apagados antes de voltar a restrição antiga.

### D8e. Brilho do token da vez
A Sala passa ao `RoomCanvas` os `token_ids` do participante da vez (só na disputa). Cada um desses tokens ganha, atrás do retrato, um halo de anéis dourados de opacidade baixa e um aro fino (`brilhoDaVez.ts`). O relógio do PixiJS faz o halo pulsar num período de 2,4 s (opacidade de 0,45 a 1 e escala de 1 a 1,08). Com `prefers-reduced-motion`, o relógio não é usado e o halo fica parado.

### D9. Correr
`POST /mesas/{id}/sala/turno/correr` marca `correndo` no participante da vez:
- o dono do personagem ou o Narrador podem pedir;
- fora da disputa dá 409; fora da vez, ou quem não é dono, recebe 403;
- uma segunda vez não muda nada.

Emite `sala.turno`.

### D10. Regras
Em `Iniciativa, Movimento e Posicionamento.md`, seção "Espaço e alcance", entra uma frase: no grid, um passo para qualquer casa vizinha, inclusive na diagonal, custa 1 metro. A decisão é do usuário (2026-10-04).

## Impacto no jogo

- **Escassez e risco de disputa:** não mudam; nenhuma regra muda.
- **Ritmo narrativo:** a transição de Cena Livre para Cena de Disputa fica explícita e rápida. A barra deixa claro de quem é a vez, o que diminui as perguntas e acelera a disputa.
- **Carga cognitiva:** a soma, o desempate e a contagem de rodadas saem do Narrador. Os jogadores só clicam em "Rolar iniciativa".

## Interações com outras mecânicas

- Destaque de críticos: um 20 natural na iniciativa ganha o destaque, como qualquer d20. Isso não muda a ordem, porque a regra não dá efeito ao crítico de iniciativa.
- Estatísticas: a iniciativa conta como rolagem do jogador.
- Rolagens ocultas: as dos NPCs não aparecem para os jogadores.
- Permissão de movimento: não muda.

## Risks / Trade-offs

- [Um participante com ficha incompleta não consegue rolar] → Recusa explícita, com o que falta. A disputa pode começar mesmo assim, e ele fica no fim até a ficha ser corrigida e ele rolar. Não se infere valor.
- [Um jogador demora a rolar e trava a disputa] → O Narrador rola por ele ("Rolar por ele"), que destrava na hora.
- [O registro da mesa ganha um evento por turno] → Aceito: o registro é a memória da mesa; uma disputa longa gera dezenas de linhas.
- [Muitos participantes numa barra estreita] → A barra rola de lado e os retratos são compactos (36 px).
- [Dependência da `0027`] → A `0028` vem depois dela, e esta mudança é arquivada depois de `gamificacao-da-sala`.

## Migration Plan

1. A migração `0030_token_proprio_no_turno` (D8d) vem depois da `0029`; sem dados a migrar.
1. A migração `0028_modo_de_turno` cria `turn_combats` e `turn_participants` (RLS no padrão de `room_music`) e adiciona `dice_rolls.finalidade`. Não há dados a migrar.
2. Aplicar no Supabase de testes depois da `0026` e da `0027`, com autorização do usuário.
3. Rollback: o `downgrade` remove as tabelas e a coluna. O navegador sem as rotas mostra a Sala sem modo turno.
