# Design

## Contexto

Ver `proposal.md` para a motivação. O que já existe e condiciona o desenho:

- **Cartas:** definição → versões imutáveis (`card_versions.conteudo`) → posse por personagem (`character_cards`, estado `aprendida`). O conteúdo de habilidade e magia já tem `ativacao` (ativa, reacao, passiva_condicional, passiva_permanente), `lancamento` (texto), `custo_uso`, `custo_legado`, `alvo_area` e `ativos` (arte). O Custo de Uso efetivo é `custo_uso` da carta ou o calculado pela Potência (`domain/criacao.custo_uso_efetivo`).
- **Cartas do catálogo:** `cartas_catalogo._conteudo` monta a carta só com título, texto, ativação, tags e `custo_legado`; `lancamento`, `alcance` e `duracao` do JSON não são lidos. `custos` do catálogo aceita só `custo_aprendizado`, `potencia_uso` e `custo_uso` numéricos, e nenhuma habilidade os tem. A decisão do usuário (2026-10-06) é que o custo das habilidades de classe é especial, no texto `custo`, e nunca vem da Potência.
- **PP atual:** `characters.ficha.recursos.pp.atual`. Só muda pelo PUT da ficha inteira (com `auditoria.mudancas` e `recursos.pp.atual` nas mudanças), pelos descansos e por `ajustar_atuais`. Não há comando de recurso na Sala.
- **Modo turno:** `turn_combats` e `turn_participants` (`movimento_gasto`, `correndo`, `token_id`). `_receber_a_vez` zera o saldo. `correr` só liga `correndo`. O estado filtrado por leitor vem de `turno.estado`.
- **Rolagens e histórico:** `dice_rolls` com cursor por `id`; o cliente busca `GET /sala/rolagens?depois=` e o `useRolador` guarda 20 itens locais. O evento `sala.rolagem {id}` avisa os outros.
- **Estatísticas:** `estatisticas.calcular` soma vida pela auditoria (`recursos.pv.atual`) e rolagens por `dice_rolls`, por jogador, em dois períodos (`Periodo`).
- **Tempo real:** `sala.emitir` dentro da transação; o cliente invalida a query. Polling de reserva de 15 s ou 1 s.
- **Tabuleiro:** PixiJS; `useDadosNoTabuleiro` anima os dados e a faixa "Crítico!"; `brilhoDaVez` conhece os tokens da vez.

## Goals / Non-Goals

**Goals:**
- Um único comando de uso, usado pela mão de cartas e pela aba Cartas, com toda a validação no servidor.
- O débito de PP passa pelo mesmo caminho de auditoria que as outras alterações de recursos, para que registro e estatísticas continuem lendo um só lugar.
- As ações do turno ficam no participante, ao lado do saldo de movimento, e seguem o mesmo ciclo de "receber a vez".
- O histórico da aba Dados vira um fluxo de acontecimentos sem trocar o mecanismo de cursor que já funciona.

**Non-Goals:**
- Estruturar Alvo ou Área, Duração e Teste da carta (fase 2 e 3). Aqui esses campos são só texto mostrado.
- Debitar Exaustão, PV ou materiais do texto do custo.
- Cartas de item e armas na mão.

## Decisões

### D1. Tabela `card_uses` própria, e não linhas em `dice_rolls`

Um uso não é uma rolagem: não tem dados, tem alvos, custo e carta. Juntar na mesma tabela forçaria colunas nulas e misturaria as estatísticas de sorte. A tabela `card_uses`:

| coluna | tipo | nota |
|---|---|---|
| `id` | BigInteger autoincremento | cursor do histórico, como em `dice_rolls` |
| `mesa_id`, `autor_id`, `personagem_id` | | quem pediu e por quem |
| `sessao_id` | FK `table_sessions`, SET NULL | preenchida com `sessoes.ativa` |
| `combate_id` | FK `turn_combats`, SET NULL | nula fora do modo turno |
| `rodada` | int, nula | rodada no momento do uso |
| `versao_id` | FK composta `card_versions` | a versão exata da carta usada |
| `titulo` | texto | cópia para o histórico não depender de join |
| `custo_pago` | int ≥ 0 | PP debitado |
| `custo_extra` | texto, nulo | o texto do custo que não é PP ("1 de Exaustão") |
| `acao` | enum `padrao`, `bonus`, `reacao`, `nenhuma` | a ação gasta |
| `alvos` | JSON `[{token_id, personagem_id, rotulo}]` | registro e destino da animação |
| `desfeito_em`, `desfeito_por` | | nulos enquanto vale |
| `criado_em` | | |

RLS ligado e sem acesso para `anon` e `authenticated`, como as outras tabelas da Sala. Índice `(mesa_id, id)` e `(mesa_id, sessao_id)`.

*Alternativa descartada:* só auditoria. O registro da mesa é append-only e genérico; o histórico e as estatísticas precisariam varrer `detalhes` JSON a cada consulta, como já acontece com a vida e já tem aviso de lentidão no design da gamificação.

### D2. Débito de PP por um comando de recurso, não pelo PUT da ficha

Criar em `ficha_viva` (ou módulo novo `recursos_ficha.py`) a função `alterar_atual(session, personagem, recurso, delta, origem, correlacao)`, que:
- lê a ficha, aplica o delta em `recursos.<recurso>.atual` respeitando 0 e o máximo calculado;
- avança `characters.versao`;
- registra auditoria com `mudancas=[{campo: "recursos.pp.atual", antes, depois}]`, categoria `ficha`, relevância `mecanica`, para que `estatisticas.deltas_de_pv` e qualquer leitor futuro de PP continuem funcionando sem mudar.

O PUT da ficha continua para edição manual. Esse comando é o que a fase 3 vai reusar para dano e cura, então ele nasce genérico em `recurso` ("pv" ou "pp").

*Alternativa descartada:* chamar `gravar_ficha` com a ficha inteira. Gera conflito de versão com quem está editando a ficha no mesmo instante e audita como "edição", não como gasto.

### D3. Módulo `cursed_platform/uso_cartas.py`

Funções puras sobre a sessão, sem confirmar a transação (padrão de `turno.py`):
- `carta_aprendida(session, mesa_id, personagem_id, versao_id)`: a posse `aprendida`, ou `UsoInvalido`.
- `acao_da_carta(conteudo) -> "padrao" | "bonus" | "reacao" | "nenhuma"` com `aviso: bool`: `ativacao == "reacao"` → reação; `lancamento` contém "bônus"/"bonus" → bônus; contém "livre" → nenhuma; senão padrão, com `aviso=True` quando o texto existe e não contém "ação"/"acao"/"instantâneo".
- `custo_em_pp(conteudo) -> int | None`: `custo_uso_efetivo` da carta; `None` quando indefinido.
- `usar(session, mesa_id, leitor, personagem, versao_id, alvos)`: valida tudo do requisito "Usar carta", chama `turno.gastar_acao` quando há disputa, `alterar_atual(..., -custo)`, grava `card_uses`, emite `sala.uso {id}`. Não há PP informado por quem usa: carta sem Custo de Uso em PP fica fora da mão e é recusada (decisão do usuário, 2026-10-06: o que não gasta PP explicitamente fica para decidir depois).
- `mao(session, mesa_id, personagem)`: as cartas jogáveis (aprendidas, ativas ou de reação, com custo em PP) com `motivo_indisponivel` já calculado: fase de iniciativa, fora da vez, ação gasta, PP insuficiente.
- `desfazer(session, mesa_id, uso)`: só Narrador; checa a janela (mesma rodada ou último uso), devolve PP com `alterar_atual(+custo)` e a ação com `turno.devolver_acao`, marca `desfeito_em`.
- `listar(session, mesa_id, leitor, depois)`: até 50 usos depois do cursor, filtrados: usos de personagens sem token visível ao leitor saem. A visibilidade usa `sala.token_visivel` sobre os tokens atuais do personagem na cena, como o turno faz.

Erros: `UsoInvalido` (422), `ForaDaVez` reaproveitado de `turno` (403), `SemPP` (409, com quanto falta), `Conflito` (409).

### D4. Ações do turno no participante

Migração `0031_uso_de_cartas` acrescenta a `turn_participants`: `acao_padrao_gasta`, `acao_bonus_gasta`, `reacao_gasta` (bool, padrão falso). Em `turno.py`:
- `_receber_a_vez` zera os três junto do movimento. Isso cumpre "a Reação volta no começo do seu próximo turno".
- `gastar_acao(participante, acao)` recusa com `AcaoGasta` (409) se já gasta; `nenhuma` não faz nada.
- `correr` passa a chamar `gastar_acao(p, "padrao")` antes de ligar `correndo`.
- `devolver_acao(participante, acao)` só pelo Narrador, pela rota `POST /sala/turno/acoes/devolucao {participante_id, acao}`.
- `pode_passar_a_vez(session, combate, leitor)`: o Narrador sempre; o jogador só na vez de um personagem seu. `POST /sala/turno/proximo` passa a usá-la em vez de exigir o Narrador, e o evento `turno.vez` ganha `encerrado_pelo_jogador` e o nome de quem encerrou no resumo. A barra mostra "Encerrar meu turno" ao dono da vez, travado pelo mesmo motivo do "Próximo turno".
- `estado` devolve `acoes {padrao, bonus, reacao}` (gastas ou não) para o participante da vez, ao Narrador e ao dono, junto de `movimento`. Para reação fora da vez, o dono precisa saber a própria Reação: `acoes` vai também para os participantes do próprio leitor, mesmo fora da vez.

A reação fora da vez acha o participante pelo `personagem_id`; com tokens próprios da mesma ficha (`token_id`), a Reação é gasta no grupo e nos tokens próprios ao mesmo tempo, porque a regra é por criatura e a plataforma trata os tokens de uma ficha como a mesma ficha de PP. Isso fica registrado como limitação conhecida.

### D9. Ordem de entrada dos participantes

Os nomes repetidos da barra ("Goblin", "Goblin 2", "Goblin 3") e a ordem de quem ainda não rolou eram decididos pelos ids dos participantes e dos tokens, que são uuid4: a numeração podia trocar entre o Goblin 2 e o Goblin 3 de uma leitura para outra do mesmo banco, e `test_outro_token_da_mesma_ficha_rola_e_joga_sozinho` falhava conforme a sorte dos ids (encontrado em 2026-10-06). Nem `scene_tokens` nem `turn_participants` guardam quando foram criados, então a ordem de criação não era recuperável.

Migração `0033_ordem_de_entrada_no_turno`, depois da `0032_instancias_de_personagem`: `turn_participants.ordem_de_entrada` (inteiro, não nulo, padrão 0). `turno.entrar` numera os grupos de 1 em diante, na ordem em que lista os personagens da cena; `turno.incluir` dá ao participante novo uma posição a mais que a maior da disputa. Em `turno.py`:
- `participantes` lista por `ordem_de_entrada` e depois pelo id (o id só desempata linhas anteriores à migração, que ficam com 0);
- `_numerar` numera os nomes iguais pelo grupo primeiro e depois pela ordem de entrada: o token posto antes é o "Goblin 2", sempre;
- `ordenar` desempata quem ainda não rolou pela ordem de entrada, então "Falta rolar a iniciativa de X, Y" e a barra listam os pendentes na ordem em que chegaram.

Alternativas descartadas: um `criado_em` (empates no mesmo instante voltariam a cair nos ids) e ids ordenáveis no tempo (uuid7), que esconderiam a regra no formato do id. Nenhum contrato da API muda: a posição não sai no `estado`.

### D5. Custo em PP lido do texto do catálogo

Em `catalogos.py`, `Habilidade` ganha `custo_pp: int | None` e `lancamento: str | None`, lidos do JSON: `custo_pp` é `int(m.group(1))` quando o texto casa com `^\s*(\d+)\s*PP\b`, senão `None`. Nada mais do texto é interpretado. `cartas_catalogo._conteudo` passa a emitir `custo_uso = custo_pp` (quando há) e `lancamento`, além do `custo_legado` que já emitia. Como o conteúdo muda, `sincronizar_mesa` cria a versão nova e passa as posses, pelo mecanismo que já existe. Nenhum campo do Framework é inferido: `potencia_uso` continua vazio.

A carta mostra "Custo de Uso: 2 PP" e, abaixo, o texto inteiro, para o jogador ver o extra. O texto do custo que sobra depois do PP fixo (por exemplo "+ 1 de Exaustão") vira `custo_extra` no uso, por `custo_legado` sem o prefixo casado.

*Alternativa descartada:* um campo `custo_pp` novo e separado no JSON. Duplicaria o que o usuário já escreveu em 44 habilidades e abriria divergência entre os dois.

### D6. Rotas

Em `platform/api/cursed_api/usos.py`:
- `POST /mesas/{id}/sala/usos` `{personagem_id, versao_id, alvos: [token_id]}` → `UsoDeCarta` (201). Dono ou Narrador.
- `GET /mesas/{id}/sala/usos?depois={id}` → até 50, filtrados pelo leitor.
- `POST /mesas/{id}/sala/usos/{uso_id}/desfazer` → só Narrador.
- `GET /mesas/{id}/sala/mao?personagem_id=` → `MaoDeCartas {personagem_id, personagem_nome, pp_atual, pp_maximo, cartas}`: cada carta com `posse_id`, `versao_id`, `tipo`, `titulo`, `ativacao`, `custo_uso`, `custo_extra`, `acao`, `aviso_lancamento`, `lancamento`, `alvo_area`, `texto`, `ativos` e `motivo_indisponivel` já calculado pelo servidor. A interface não recalcula regra nenhuma.

Em `turno.py` (API): `POST /sala/turno/acoes/devolucao {participante_id, acao}` (só Narrador) e `POST /sala/turno/correr` responde 409 com a Ação Padrão gasta. Em `gamificacao.py`, `PUT /sala/preferencias` leva também `mao_dos_jogadores_visivel`. Eventos: `sala.uso {id}` (público e, para usos de personagem oculto, só `mesa:{id}:narrador`), e `sala.turno` depois de gastar ou devolver ação. Auditoria: `carta.usada` e `carta.uso_desfeito` (categoria `carta`), `carta.pp_gasto` e `carta.pp_devolvido` (categoria `ficha`, com `mudancas` em `recursos.pp.atual`), `turno.acao_devolvida`; `visibilidade` "narrador" quando o personagem está oculto.

### D7. Interface

- **`MaoDeCartas`** (pedido do usuário, 2026-10-06): seção fixa na parte de baixo da Sala, centrada na área livre do grid, acima do botão "Chão e baús". Cabeça com o nome do personagem (ou um seletor, quando o jogador tem mais de um na cena), o PP atual e máximo, "Desfazer último uso" para o Narrador e o botão de recolher. O **leque** é uma lista de cartas de 5,2 × 7,3 rem com a arte (`useArteDaCarta`: imagem própria → pintura da categoria `cartas-arte-habilidades`/`cartas-arte-magias` → iniciais), o custo no canto, a marca "R" nas reações e o título embaixo; cada carta gira `(i − centro) × 5°` e sobe ao passar o ponteiro ou receber o foco. A carta apagada tem `aria-disabled` e o motivo no rótulo; clicar nela abre o quadro com o motivo e sem "Usar". O **quadro de uso** abre acima do leque: texto, custo e custo extra, ação e Lançamento, Alvo ou Área, avisos, a lista dos alvos marcados (com "tirar" e "Limpar alvos") e "Usar em X"; o foco vai para o quadro ao abrir.
- **Alvos:** com o quadro aberto, `onSelectToken` do `RoomCanvas` marca ou desmarca o token em vez de escolhê-lo; os alvos recebem o aro tracejado `criarAroDeAlvo` (vermelho-alaranjado), distinto do azul-gelo da escolha e do dourado da vez. Fechar o quadro limpa os alvos.
- **De quem é a mão:** o jogador vê a de um personagem seu com token na cena (o da vez primeiro, depois o escolhido, depois o primeiro); o Narrador, durante a disputa, a de quem está com a vez (a de um jogador só com `mao_dos_jogadores_visivel`), e fora da disputa a do token escolhido. Sem personagem, a mão não aparece.
- **`AcoesDaVez`** ao lado de `SaldoDaVez`: três selos "Ação", "Bônus", "Reação", riscados quando gastos; para o Narrador cada selo gasto tem "↺" (Devolver). "Correr" fica desativado com a Ação Padrão gasta.
- **Animação da carta** (`vooDaCarta.ts` para a geometria, `cartaVoadora.ts` para o cartão): o cartão de 46 × 64 px do mundo sobe do centro do token de quem usou (350 ms), voa em arco até cada alvo (700 ms, mais 220 ms parado), até seis, e some (320 ms); sem alvo, dá uma volta sobre o token (1,1 s). Fica no palco do PixiJS, convertido do mundo a cada quadro, para sobreviver aos redesenhos da cena. A arte troca as iniciais quando carrega. Faixa "Lia usa X" pelo mesmo estilo da faixa de crítico, variante `--carta`, por 2,5 s. Respeita `prefers-reduced-motion` e a preferência `CHAVE_ANIMACAO_DAS_CARTAS` (padrão ligada) em `localStorage`, na aba Dados ao lado de "Animação dos dados".
- **Histórico de acontecimentos:** `useRolador` ganha `usos`, `receberUso` e `atualizarUso`, e numera rolagens e usos numa mesma ordem de chegada; `acontecimentos()` junta os dois para a aba Dados, até 20. `useUsosDaMesa` acompanha os usos com cursor e relê uma janela dos últimos 20 ids a cada consulta, para perceber um uso desfeito por outra pessoa. O evento `sala.uso` invalida `["usos"]`, `["sala-mao"]`, `["sala-turno"]`, `["sala-estatisticas"]` e `["valores-derivados"]`; `sala.turno` invalida também `["sala-mao"]`.
- **Aba Mestre:** a chave "Ver as cartas dos jogadores" entra na sub-aba Preferências, guardada pelo servidor com as demais.
- **Estatísticas:** `Periodo` ganha `pp_gasto`, `cartas_usadas`, `carta_favorita {titulo, usos} | null`; `EstatisticasDaSala` mostra os três.

*Alternativa descartada:* a mão dentro da barra de turno e "Usar" na aba Cartas (desenho inicial). O usuário pediu a mão na parte de baixo, como cartas seguradas, e sempre à mostra; com isso a aba Cartas não precisa de "Usar".

### D8. Visibilidade e controle

**Quem joga por um personagem** (`sala.controla_personagem`, decisão do usuário de 2026-10-06): o Narrador, o dono da ficha ou um jogador posto como controlador de um token do personagem na cena ativa (o mecanismo que já existe em "Liberar movimento" para um companion criado pelo Narrador). Vale para abrir a mão, usar cartas de reação, ver os usos e rolar iniciativa. **Na disputa, o controle é por participante** (`turno.controla_participante`: dono da ficha ou controlador de um token *daquele participante*): mover, Correr, "Encerrar meu turno", usar carta ativa na vez e a marca `meu`. Correção do bug relatado pelo usuário em 2026-10-06: liberar o "Lagarto-macaco 2" dava ao jogador a vez do 1 e do grupo, porque o controle era pela ficha. Para o jogador, o token da Sala traz `controlador`, e `personagensControlados` monta a lista de personagens da mão a partir dos tokens, com o nome do token quando a ficha não está na lista dele.

Um uso é visível a quem vê ao menos um token do personagem na cena ativa (regra de `sala.token_visivel`), ou ao Narrador, ou a quem controla o personagem. O filtro vale para `GET /sala/usos`, para o evento (`sala.uso` de personagem oculto vai só ao canal do Narrador) e para a mão (um jogador só pede a mão dos próprios personagens; 403 nos outros). Um jogador também não marca como alvo um token que não vê (422).

## Impacto no jogo

- **Escassez:** o PP passa a cair sozinho a cada carta jogada, à vista de todos. Isso torna a escassez concreta sem mudar nenhum número, e é o efeito desejado pelo projeto. O risco é o jogador sentir "cobrança automática" onde antes negociava com o Narrador; o desfazer do Narrador e o campo de PP informado nas cartas sem custo fixo preservam a negociação.
- **Risco de combate:** só muda a visibilidade: o grupo vê quanto cada um já gastou e quais ações sobraram. Dano e consequências continuam manuais.
- **Ritmo narrativo:** usar carta vira um clique com animação, mais rápido do que anunciar e anotar. O quadro de alvos é opcional para não travar quem prefere só declarar. Cenas livres continuam sem modo turno.
- **Carga cognitiva:** a mão só aparece na vez, com no máximo o que o personagem sabe; os três selos de ação são a única informação nova permanente na barra. Para o Narrador, a mão dos monstros substitui consultar a ficha deles.

## Interações com outras mecânicas

- **Correr:** passa a gastar a Ação Padrão (requisito modificado). Quem corre não joga carta de Ação Padrão na mesma vez, como manda a regra.
- **Deslocamento:** inalterado. Movimento e ações são saldos separados no mesmo participante.
- **Reações:** gastas pela carta, voltam na vez. Esquiva e Bloqueio não gastam Reação e não entram aqui.
- **Destaque de críticos e estatísticas:** o uso não é rolagem; não entra na sorte nem nos críticos.
- **Descansos:** recuperam PP pelo caminho atual; o PP gasto pelas cartas aparece como queda e o descanso como subida, se um dia a estatística de PP perdido e recuperado for pedida.
- **Sincronização do catálogo:** a nova versão das cartas de catálogo (com `custo_uso` e `lancamento`) passa as posses, pelo mecanismo existente. Cartas já em `card_versions` criadas pelo Narrador não mudam.
- **Passivas e custos sem PP:** ficam fora da mão até o usuário decidir (passivas condicional ou permanente, pendência já listada no `AGENTS.md`; custos variáveis e custos sem PP, decisão de 2026-10-06).

## Risks / Trade-offs

- [Lançamento em texto lido por palavra-chave erra a ação] → aviso visível na carta quando a leitura foi por falta de encaixe; o Narrador devolve a ação; a fase 2 pode estruturar o Lançamento.
- [PP debitado em conflito com edição da ficha ao mesmo tempo] → o comando de recurso avança a versão e usa a ficha recém-lida; o PUT da ficha concorrente recebe 409 pela trava otimista que já existe.
- [Jogador fica sem PP por engano de clique] → quadro de confirmação antes de usar e desfazer do Narrador na mesma rodada.
- [A mão cobre o grid em telas baixas] → a mão pode ser recolhida, e a escolha fica no navegador; o leque fica acima do botão "Chão e baús" e sobe com o chão aberto.
- [Histórico misto confunde] → ícone e cor próprios do item de uso, sem "Rolar de novo", e miniatura da carta.
- [Cartas do catálogo mudam de versão para todo mundo ao aplicar] → é o comportamento já especificado para mudança de conteúdo; as posses migram sozinhas e nada é perdido.
- [Reação de ficha com vários tokens é uma só] → limitação documentada em D4; o Narrador devolve se a mesa decidir diferente.
- [Animação pesada com muitos alvos] → cap de 6 alvos animados por uso; o resto só entra no registro.

## Migration Plan

1. Migração `0031_uso_de_cartas`: `card_uses`, as três colunas em `turn_participants` e `room_preferences.mao_dos_jogadores_visivel`, com RLS. Descida: apaga as colunas e a tabela.
2. Aplicar no ambiente local ao reiniciar. No Supabase de testes, só com autorização do usuário, e anotar no `AGENTS.md`.
3. Ao subir o servidor, `sincronizar_todas` cria a versão nova das cartas de catálogo com `custo_uso` e `lancamento`.
4. Regenerar `openapi.json` e `schema.ts`.
5. Rollback: descer a `0031`; as versões de carta criadas ficam (são imutáveis e inofensivas sem o código novo).
6. Migração `0033_ordem_de_entrada_no_turno` (D9), depois da `0032_instancias_de_personagem`: `turn_participants.ordem_de_entrada`. Descida: apaga a coluna. Disputas abertas antes dela ficam com 0 em todos e seguem numeradas pelos ids, como antes, até encerrar.

## Open Questions

- Se a mesa quiser que a mão também mostre itens equipados com efeito manual (poções), isso entra numa fase posterior; não muda nada aqui.
