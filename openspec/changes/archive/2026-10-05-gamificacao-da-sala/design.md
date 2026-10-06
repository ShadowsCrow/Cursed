# Design

## Contexto

Estado atual, verificado no código em 2026-10-04:

- **Rolagens** (`cursed_platform/rolagens.py`, tabela `dice_rolls`): o servidor sorteia, grava, emite `sala.rolagem` e não interpreta o resultado. A rolagem pela ficha já traz `personagem_id`.
- **Sessões** (`table_sessions`, `SessaoRegistro`): a tabela existe e a auditoria já liga cada evento à sessão aberta (`auditoria._sessao_ativa`), mas nenhuma rota cria sessões. Por isso `sessao_id` está sempre nulo hoje.
- **PV atual** fica em `ficha.recursos.pv.atual`. Toda alteração de ficha passa por `auditoria.registrar(..., mudancas=auditoria.mudancas(antes, depois))`, e as mudanças vêm por folha (`campo = "recursos.pv.atual"`, `antes` e `depois`). Isso vale para a edição da ficha, o descanso (`descanso.aplicado`), o ajuste do Narrador e a correção.
- **Habilidades do catálogo** viram cartas (`cartas_catalogo.py`) com `origem_sistema` (por exemplo `classes/Druida/habilidades/...`) e `concedida_por`. O JSON é a única fonte.
- **Canal efêmero** `mesa:{id}` (`useRoomEphemera`): cursores, pings e arrastes vão do navegador direto para o Realtime, sem servidor nem banco.
- **Painel**: `abasDoPainel.ts` tem `chat`, e `PainelDaSala.tsx` tem `ChatReservado`.
- A mudança ativa `musica-da-sala` traz a migração `0026`, ainda não versionada. Esta mudança usa a `0027`.

## Goals / Non-Goals

**Goals:**
- Tudo o que conta (marcas de crítico, estatísticas, votos) é decidido e guardado no servidor. O navegador só mostra.
- As faixas de crítico nunca saem do servidor para os jogadores.
- Cabe no modelo da Sala: estado no servidor, aviso em tempo real e consulta periódica como reserva.

**Non-Goals:**
- Não haverá tabela de estatísticas materializadas: elas são calculadas na consulta.
- As reações não terão persistência nem reserva por consulta periódica.

## Decisões

### D1. Faixa de crítico calculada no servidor, a partir das cartas do catálogo
`catalogos.Habilidade` ganha dois campos opcionais, lidos do JSON de cada habilidade: `amplia_critico` e `amplia_falha_critica`. Cada um é um inteiro ≥ 1; qualquer outro valor invalida o catálogo, como os demais erros, e fica valendo a última versão válida.

`cursed_platform/criticos.py` monta a faixa:
- `faixa_do_personagem(session, mesa_id, personagem)` percorre as cartas que o personagem possui, ativas e não arquivadas, com `origem_sistema`;
- para cada uma, procura a habilidade correspondente no catálogo atual e soma as ampliações;
- devolve `(inicio_critico, fim_falha)`, limitados a `≥ 2` e `≤ 19`.

A ampliação **não** entra no `conteudo` da carta. Por isso não chega a nenhuma resposta de carta, e "não visível" fica garantido pela estrutura.

Alternativa descartada: gravar a ampliação na carta. Ela vazaria pela API de cartas e teria de ser filtrada em vários lugares.

### D2. Marca gravada na rolagem
`rolagens.rolar` recebe `faixa` (o padrão é `(20, 1)`). Depois do sorteio, grava em `dice_rolls.marcas` (JSON, nulo quando não há d20) uma lista paralela aos grupos: `[{"faces": 20, "indice": i, "tipo": "critico" | "falha_critica"}]`. Um valor nas duas faixas conta só como crítico.

A rota calcula a faixa só quando há `personagem_id` (rolagem pela ficha); sem ele, usa `(20, 1)`. A marca é gravada sempre, com o destaque ligado ou não. Assim, ligar o destaque depois mostra as marcas antigas, e as estatísticas ficam consistentes.

`para_resposta(rolagem, destaque: bool)` só inclui `marcas` quando o destaque da mesa está ligado. Com ele desligado, a lista vai vazia.

A faixa em si nunca vai na resposta. Um 19 marcado revela, por dedução, que a faixa foi ampliada, e isso é aceito: é o próprio destaque que o usuário pediu.

### D3. Preferências da Sala por mesa
Nova tabela `room_preferences`, com uma linha por mesa (`mesa_id` PK), contendo `destaque_criticos` (bool, falso), `estatisticas_visiveis` (bool, falso), `alterada_em` e `alterada_por`.

- `GET /mesas/{id}/sala/preferencias`: para quem é da mesa.
- `PUT` da mesma rota: só o Narrador, que envia as duas chaves.
- Emite `sala.preferencias` (público) e registra a auditoria `sala.preferencias_alteradas`, na categoria `mesa`.

Alternativa descartada: colunas em `rpg_tables`. Essa tabela é da campanha, e as preferências são da Sala, como `room_music`.

### D4. Sessões
- `POST /mesas/{id}/sala/sessoes` (iniciar) e `POST /mesas/{id}/sala/sessoes/atual/encerramento`: só o Narrador.
- Iniciar com uma sessão aberta dá 409. O número é `max(numero) + 1`, e a unicidade `(mesa_id, numero)` já protege contra corridas.
- `GET /mesas/{id}/sala/sessoes` lista a sessão atual e a última encerrada.
- Emite `sala.sessao` e audita `sessao.iniciada` e `sessao.encerrada`.

`dice_rolls` ganha `sessao_id`, preenchido por `rolar` com a mesma consulta da auditoria, que vira função pública `sessoes.ativa(session, mesa_id)`.

### D5. Estatísticas calculadas na consulta
`cursed_platform/estatisticas.py` calcula as estatísticas de cada jogador (`usuario_id`) em dois períodos: a sessão de referência (a atual ou a última encerrada) e a campanha.

- **Vida:** os eventos de auditoria da mesa com `personagem_id` dos personagens do jogador (`proprietario_id`), filtrados por `sessao_id` no período da sessão. Em cada evento, a mudança `campo == "recursos.pv.atual"` com `antes` e `depois` inteiros dá `delta = depois − antes`. Um delta negativo soma em perdida; um positivo, em recuperada. Uma mudança com o campo ausente antes, como num personagem novo, não conta. O personagem é atribuído ao dono atual. Ajustes de máximo (`recursos.pv_maximo` e semelhantes) ficam de fora por definição do campo.
- **Rolagens:** as `dice_rolls` não ocultas com `autor_id = usuario_id`. A rolagem pela ficha de um NPC feita pelo Narrador não conta para jogador nenhum.
- **Críticos e falhas:** contagem das `marcas`.
- **Sorte:** para cada dado, `(valor − 1) / (faces − 1)`; o d100 conta como faces 100. A média dessas razões menos 0,5, × 100, dá os pontos percentuais. Os rótulos são "Dados quentes" (≥ +5), "Dados frios" (≤ −5) e "Na média" no meio. Com menos de 10 dados aparece "Poucos dados ainda". A normalização por faces permite misturar d6 e d20 numa medida só.
- `GET /mesas/{id}/sala/estatisticas`: o Narrador recebe todos os jogadores. Um jogador recebe só a si, ou todos quando `estatisticas_visiveis` está ligado. A resposta traz `{sessao: {...} | null, jogadores: [{usuario_id, apelido, sessao: Est, campanha: Est}]}`. Os campos de crítico só vêm com o destaque ligado.
- O cliente reconsulta ao receber `sala.rolagem`, `sala.sessao`, `sala.preferencias` ou um aviso de ficha, e também no intervalo da Sala.

Custo: varre a auditoria da mesa filtrando por personagem, e o índice `(mesa_id, personagem_id, id)` já existe. Numa mesa, isso fica na casa de milhares de eventos. Se crescer, um passo seguinte seria guardar os deltas de PV numa coluna derivada.

Alternativa descartada: contadores materializados. Exigiriam ganchos em toda alteração de PV e uma migração de histórico, sem ganho perceptível agora.

### D6. Votação de MVP
Duas tabelas novas:
- `mvp_rounds` (votação): `id`, `mesa_id`, `sessao_id`, `estado` (`aberta`, `desempate` ou `encerrada`), `aberta_em`, `encerrada_em`, `vencedor_id`, `votos_do_vencedor` e `empatados` (JSON). Um índice único parcial garante uma só votação não encerrada por mesa.
- `mvp_votes`: `votacao_id`, `eleitor_id` (PK composta) e `candidato_id`. Votar de novo faz upsert.

Rotas, em `/mesas/{id}/sala/mvp`:
- `POST`: abrir (Narrador, com ≥ 2 jogadores);
- `PUT /voto`: votar (jogador, candidato ≠ eleitor, candidato é jogador da mesa);
- `POST /encerramento`: encerrar (Narrador);
- `POST /desempate {vencedor_id}`: desempatar (Narrador, vencedor ∈ empatados);
- `GET`: estado atual. Traz `{estado, votaram, total}`, o `meu_voto` só para o próprio jogador e o vencedor depois de encerrada. Traz também o histórico de vencedores.

Nenhuma rota devolve a contagem por candidato. Com empate, a resposta ao Narrador inclui os `empatados` (só os ids), sem números.

Avisos: emite `sala.votacao` a cada mudança e audita `mvp.aberta`, `mvp.encerrada` (com o vencedor) e `mvp.desempatada`. O voto não é auditado, para não deixar rastro de quem votou em quem.

O anúncio no tabuleiro aparece quando o cliente vê uma votação mudar para `encerrada` com vencedor depois de a Sala já estar aberta. Ao abrir a Sala, não se anuncia o MVP anterior, como acontece com as rolagens.

### D7. Abas por papel
`AbaDoPainel` troca `chat` por `papel`. A lista `ABAS_DO_PAINEL` vira `abasDoPainel(narrador)`, que devolve `{id: "papel", rotulo: "Mestre" | "Jogador", icone: "star" | "users"}`. `abaValida` mapeia o valor guardado `"chat"` para `"papel"`. `ChatReservado` sai.

As novas abas são `MestreDoPainel.tsx` e `JogadorDoPainel.tsx`, com o hook `useGamificacaoDaSala` (React Query, `intervaloDaSala`; preferências, sessões, estatísticas e votação), invalidado no `RoomPresence` pelos novos eventos. As duas abas recebem o estado pronto, como a aba Música.

A aba Mestre é dividida em sub-abas por tema (decisão do usuário, 2026-10-04, no lugar das seções retráteis): **Sessão**, **Preferências**, **MVP** (votação e MVPs anteriores) e **Estatísticas**. Elas seguem o padrão de abas acessível (setas, Home e End), e a escolhida fica lembrada neste navegador. A sub-aba MVP ganha um ponto de aviso enquanto há votação aberta ou em desempate.

### D8. Destaque visual
- **Tabuleiro (`useDadosNoTabuleiro` e `dados3d`):** quando a rolagem traz marcas, o dado marcado ganha um material emissivo ao parar (dourado no crítico, rubro na falha). Uma faixa HTML sobre o tabuleiro ("Crítico!" ou "Falha crítica!") usa a pintura de faixa no estilo ornamentado e some em 2,5 s.
- **Aba Dados:** selo no valor do d20, no visor e no histórico, com o texto escrito, não só a cor.
- **Leitores de tela:** o anúncio vira, por exemplo, "Total 24, crítico".
- **Menos movimento:** sem brilho pulsante, só a cor estática e a faixa.

### D9. Reações pelo canal efêmero
`useRoomEphemera` ganha o evento `sala.reacao` com `{usuario_id, reacao}`. O apelido vem dos participantes que a Sala já conhece. O cliente valida `reacao` contra a lista fixa e ignora o resto. O limite de uma reação por segundo vale no envio e também na recepção, por usuário, para que um cliente adulterado não inunde os outros.

`BotaoDeReacao.tsx` fica sobre o `RoomCanvas`, acima do zoom, com o padrão de menu (`aria-haspopup`, setas e Esc). `BaloesDeReacao.tsx` é uma camada com `pointer-events: none` e `aria-hidden`, com no máximo 8 balões e animação CSS de 3 s.

Alternativa descartada: guardar as reações no servidor. O usuário as quer passageiras, e o custo de banco e de auditoria não compensa. A limitação é que, no ambiente local sem Realtime, os outros não as recebem, o mesmo que acontece com os pings.

### D10. Arte
Seis pinturas de reação (aplausos, risada, susto, caveira, chama, coração) e um selo de MVP, geradas com o Codex CLI `$imagegen`, uma por chamada. A referência é uma arte aprovada da Sala, o dado pintado do rolador. Os originais vão para `arte-original/`, e os webp, para `public/arte/sala/` (`reacao-*.webp` e `mvp-selo.webp`), pelo `preparar_arte.py`. As faixas de crítico usam a moldura ornamentada já existente, em CSS, sobre uma pintura de faixa se o usuário aprovar. Não se usa SVG no lugar de pintura.

### D11. Regras
`rules/sistema/Rolagens.md`, nas seções de 1 natural e de 20 natural, ganha um parágrafo em linguagem de mesa: habilidades de classe, arquétipo ou raça podem ampliar a faixa de crítico (por exemplo, 19–20) e a de falha crítica (por exemplo, 1–2), e as ampliações se somam. O parágrafo não cita campos nem JSON.

## Impacto no jogo

- **Escassez e risco de combate:** não mudam. O destaque não altera regra nenhuma. A ampliação das faixas é uma ferramenta de catálogo que só vale quando o usuário der valores a habilidades; até lá, todo mundo fica em 20 e 1.
- **Ritmo narrativo:** o destaque e o anúncio de MVP criam picos de emoção sem parar a cena. As reações substituem interrupções faladas.
- **Carga cognitiva:** o Narrador ganha uma aba com quatro controles e não precisa contar nada à mão. Os jogadores não precisam fazer nada de novo.

## Risks / Trade-offs

- [Um jogador deduz a faixa ampliada de um colega ao ver um 19 destacado] → Aceito, pois o destaque é o objetivo. A faixa em si nunca é enviada.
- [Estatísticas de vida dependem da auditoria; uma correção de ficha que volte o PV conta como "recuperada"] → Aceito e documentado. A correção é um evento real de PV. Se incomodar, as correções (`correcao.aplicada`) podem ser excluídas depois.
- [Personagem transferido leva o histórico para o novo dono] → Aceito: as estatísticas são "dos seus personagens".
- [Reações perdidas sem Realtime] → Igual aos pings; não afeta nada guardado.
- [A migração `0027` depende da `0026` da música, ainda não versionada] → A `musica-da-sala` deve ser arquivada e versionada antes. A `down_revision` aponta para a `0026`.
- [Sorte nos dados com poucas rolagens oscila muito] → O limite de 10 dados e a faixa de ±5 pontos evitam rótulos injustos.

## Migration Plan

1. A migração `0027_gamificacao_da_sala` cria `room_preferences`, `mvp_rounds` e `mvp_votes`, e adiciona `dice_rolls.sessao_id` (FK) e `dice_rolls.marcas` (JSON). Não há dados a migrar: rolagens antigas ficam sem marcas e sem sessão.
2. Aplicar no Supabase de testes depois da `0026`, com autorização do usuário.
3. As tabelas novas seguem o mesmo padrão de acesso e de RLS de `room_music`.
4. Rollback: o `downgrade` remove as tabelas e as colunas. O front sem as rotas novas cai no estado vazio, porque as abas tratam erro como "indisponível".

## Open Questions

- Texto exato das faixas e rótulos ("Crítico!", "Dados quentes"): pode ser ajustado na aprovação visual sem mudar nada da estrutura.
