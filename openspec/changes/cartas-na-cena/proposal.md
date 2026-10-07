# Proposal

## Why

As cartas de habilidade e magia já têm os campos do Framework, custo e posse por personagem, mas na Sala elas são só leitura: ninguém "joga" uma carta. Num combate, o jogador lê a carta na ficha, avisa em voz alta, o Narrador anota o PP de cabeça e o tabuleiro não reage. O modo turno sabe de quem é a vez, mas não sabe o que a pessoa fez na vez dela.

O usuário pediu (2026-10-05) que as cartas passem a ser usadas nas cenas, a começar pelos combates, como mais um passo da gamificação da plataforma. Esta é a **fase 1** do plano aprovado em conversa (2026-10-05 e 2026-10-06): a mão de cartas, o uso com custo e o controle das ações do turno. Teste, defesa e alcance ficam para a fase 2; dano, cura e condições, para a fase 3.

Classificação: ferramenta da aplicação que representa regras do **núcleo** (Ações do turno em `Turnos e Ações.md`; Custo de Uso e custo das habilidades de classe em `Framework de Criação...md` e `Progressão e Proficiência.md`). Não muda nenhuma regra.

## What Changes

**Mão de cartas na parte de baixo da Sala (pedido do usuário, 2026-10-06)**
- A Sala ganha, na parte de baixo da tela, a **mão de cartas** em leque, como se a pessoa segurasse as cartas: as habilidades e magias **aprendidas** do personagem, com a arte da carta (ou as iniciais do título), o custo em PP e a marca de reação.
- Só entram as cartas ativas ou de reação **com custo em PP definido**. O que não gasta PP explicitamente (passivas, custos variáveis como "+1 PP sobre o custo do feitiço", custos sem PP) fica fora da mão até o usuário decidir (decisão do usuário, 2026-10-06). A primeira versão já é a mecânica final, só não tem todas as habilidades.
- O jogador vê a mão de um personagem seu com token na cena, e escolhe qual quando tem mais de um; na vez dele na disputa, a mão é a do personagem da vez.
- Para o Narrador, a mão é sempre a da criatura com a vez, inclusive NPCs e monstros; fora da disputa, a do token escolhido. Na aba Mestre, a chave **Ver as cartas dos jogadores** liga ou desliga a mão dos personagens dos jogadores na tela dele.
- A carta fica **apagada, com o motivo** vindo do servidor: a disputa ainda não começou, não é a vez, a ação já foi gasta ou falta PP.
- A mão pode ser recolhida; a escolha fica neste navegador.

**Usar carta**
- Clicar numa carta abre o **quadro de uso** sobre a mão: o texto, o custo, a ação, o Alvo ou Área, os avisos e os alvos marcados. Com o quadro aberto, clicar em tokens do grid marca e desmarca alvos, com um aro próprio.
- Usar uma carta é um comando do servidor. Ele valida: a posse está `aprendida`; a carta é ativa ou de reação e tem custo em PP; com o modo turno aberto, a disputa começou, a ativa só na própria vez e a reação a qualquer momento com a Reação disponível; o personagem tem PP atual suficiente.
- O servidor **debita o Custo de Uso do PP atual** da ficha, com auditoria no padrão de `recursos.pp.atual`, e grava o **uso** com sessão, disputa, rodada, personagem, versão da carta, alvos e custo pago. O uso entra no registro da mesa e chega à Sala de todos sem recarregar.
- O Narrador pode **desfazer** o último uso de um personagem, pela cabeça da mão: o PP volta e as ações voltam. Isso cobre o engano de clique sem precisar de "voltar turno".
- Custos secundários escritos no texto (Exaustão, PV, materiais) **não** são debitados: a carta mostra o aviso "Custo extra: 1 de Exaustão", e a Exaustão continua pela aba de desgaste. Fica para a fase 3.

**Custo em PP das cartas do catálogo**
- Habilidades de classe e arquétipo têm custo especial escrito no campo `custo` de `classes.json`, e **não** seguem a Potência de Uso do Framework (decisão do usuário, 2026-10-06). Em 2026-10-06 o usuário aprovou os custos das habilidades que faltavam.
- O catálogo passa a ler desse texto a **parte em PP** (`"2 PP + 1 de Exaustão"` → 2 PP; `"+1 PP sobre o custo do feitiço"` → custo variável, sem débito automático) e a levá-la à carta como `custo_uso`. O texto inteiro continua em `custo_legado`, visível na carta.
- Cartas criadas pelo Narrador já têm `custo_uso` pelo Framework ou pelo valor registrado; nada muda nelas.

**Ações do turno**
- Cada participante da disputa passa a ter os três recursos da regra: **Ação Padrão**, **Ação Bônus** e **Reação**. Eles voltam ao receber a vez (a Reação volta "no começo do seu próximo turno", como a regra diz).
- Usar uma carta gasta a ação que o Lançamento dela declara: ação (Padrão), Ação Bônus ou Reação. Lançamento em texto que não se encaixa (ritual, minutos, "instantâneo após gatilho") é tratado como Ação Padrão, e a carta avisa.
- **Correr** passa a marcar a Ação Padrão como gasta, porque a regra troca a Ação Padrão por um segundo movimento. Correr com a Ação Padrão já gasta é recusado.
- A barra mostra os três recursos ao Narrador e ao dono ("Ação · Bônus · Reação", apagados quando gastos). O Narrador pode **devolver** qualquer um deles.
- O jogador pode **encerrar a própria vez** pelo botão "Encerrar meu turno" na barra (decisão do usuário, 2026-10-06, que desfaz o non-goal do modo turno). O servidor aceita só de quem controla o personagem da vez, com o mesmo travamento de quem falta rolar.
- **Controle** (decisão do usuário, 2026-10-06): o jogador joga por todo personagem que controla, não só pela ficha própria. Um companion criado pelo Narrador entra quando o Narrador libera o token dele para o jogador ("Liberar movimento" com o jogador escolhido). Vale para a mão, usar cartas, rolar iniciativa, mover, Correr e encerrar a vez.
- **Ação Livre** e **Ação de Movimento** não entram: o movimento já é controlado pelo Deslocamento.

**Alvos**
- Antes de usar, o jogador pode marcar alvos clicando tokens no grid; a carta diz quantos. A fase 1 **não valida alcance nem quantidade**: os alvos são registro e destino da animação.

**Tabuleiro e histórico**
- Ao usar, a carta sobe do token de quem usou e **voa até cada alvo** (ou gira sobre o próprio token, sem alvo), com a faixa "Lia usa Lança de Fogo" por alguns segundos, para toda a mesa. Usos de NPCs e monstros com token oculto não aparecem aos jogadores.
- O uso entra no **histórico da aba Dados** junto das rolagens, em ordem, como "Lia usou Lança de Fogo (3 PP) em Goblin 2". O histórico passa a ser dos **acontecimentos** da mesa, não só das rolagens.
- Preferência "Animação das cartas" ao lado de "Animação dos dados".

**Estatísticas**
- A aba Jogador ganha, por sessão e por campanha: **PP gasto**, **cartas usadas** e a **carta favorita** (a mais usada). O placar da mesa e a aba Mestre mostram o mesmo.

## Capabilities

### New Capabilities
- `uso-de-cartas-na-cena`: a mão de cartas na parte de baixo da Sala, o comando de usar carta com validação e débito de PP, o registro de usos, os alvos, a animação no tabuleiro, o desfazer do Narrador e o custo em PP lido do catálogo.

### Modified Capabilities
- `modo-de-turno`: os participantes ganham Ação Padrão, Ação Bônus e Reação, que voltam ao receber a vez; Correr gasta a Ação Padrão; o Narrador devolve ações; a barra mostra os recursos.
- `catalogo-de-classes-e-racas`: o campo `custo` textual das habilidades passa a dar o `custo_uso` em PP da carta, e o Lançamento vai à carta.
- `rolador-de-dados`: o histórico da aba Dados passa a mostrar também os usos de carta, em ordem com as rolagens, e ganha a opção "Animação das cartas".
- `estatisticas-e-mvp-da-mesa`: estatísticas de PP gasto, cartas usadas e carta favorita; a preferência "Ver as cartas dos jogadores" do Narrador.

## Impact

- **Banco:** migração `0031_uso_de_cartas`, depois da `0030`: tabela `card_uses`, colunas `acao_padrao_gasta`, `acao_bonus_gasta` e `reacao_gasta` em `turn_participants` e `room_preferences.mao_dos_jogadores_visivel`. RLS no padrão das tabelas da Sala. Aplicar no Supabase de testes só com autorização do usuário.
- **Servidor:** módulos novos `cursed_platform/uso_cartas.py` e `cursed_platform/recursos_ficha.py`; `turno.py` (ações do turno, Correr); `catalogos.py` e `cartas_catalogo.py` (PP e Lançamento do texto); `estatisticas.py`; `preferencias_sala.py`; rotas novas em `platform/api/cursed_api/usos.py` e a devolução de ação em `turno.py`; evento `sala.uso`; `openapi.json` e `schema.ts` regenerados.
- **Catálogo:** `classes.json` já recebeu os custos aprovados; a sincronização cria a versão nova das cartas do catálogo com `custo_uso` e `lancamento`.
- **Frontend:** `MaoDeCartas` (a mão na parte de baixo e o quadro de uso), `BarraDeTurno` (ações da vez), `RoomCanvas` (aro de alvo e voo da carta), `useRolador`/`RoladorDeDados` (histórico de acontecimentos e a opção de animação), `MestreDoPainel` (chave da mão dos jogadores), `EstatisticasDaSala`, hooks novos `useUsoDeCartas` e `useArteDaCarta`.
- **Regras:** nenhuma mudança em `rules/sistema`.
- **Specs:** a spec `rolador-de-dados` ganha acontecimentos no histórico; não há leitura mecânica nova (acerto, defesa ou dano ficam para as fases 2 e 3).

## Non-goals

- Não valida alcance, forma, área nem quantidade de alvos (fase 2).
- Não rola o Teste da carta, não pede defesa, não aplica dano, cura, condições nem efeitos no alvo (fases 2 e 3).
- Não debita Exaustão, PV, materiais nem outros custos secundários do texto.
- Não controla Ação Livre, Concentração, Combos, Reação por Persistência nem gatilhos de Reação.
- Não cria cartas para armas nem itens; a mão é só de habilidades e magias.
- Não decide o custo das habilidades sem PP explícito (passivas, custos variáveis, custos sem PP): ficam fora da mão até o usuário decidir.
- Não acrescenta "Usar" à aba Cartas do painel: a mão na parte de baixo é o único caminho.
- Não muda nenhuma regra de `rules/sistema`.
