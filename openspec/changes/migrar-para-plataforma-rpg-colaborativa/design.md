# Design

## Context

Consulte `proposal.md` para a motivação. A aplicação atual é uma interface Streamlit com estado de edição mantido em `st.session_state`, persistência SQLAlchemy compatível com SQLite e PostgreSQL, catálogos JSON e codecs portáteis para efeitos e equipamentos. Há lógica de domínio testada em `app_streamlit/core`, mas `db.py`, `state.py` e os componentes ainda possuem dependências diretas de Streamlit.

O destino precisa suportar dois painéis, múltiplas mesas persistentes, autorização por mesa, auditoria, cartas versionadas e uma sala realtime. A transição não pode alterar por acidente regras que continuam em revisão nem inferir campos mecânicos ausentes. A aplicação será online-first nesta mudança: reconexão segura é obrigatória, mas edição offline e sincronização local-first não fazem parte do escopo.

## Goals / Non-Goals

**Goals:**

- Separar domínio, aplicação e apresentação para preservar a lógica Python aproveitável.
- Manter o servidor como autoridade sobre permissões, regras e estado persistente.
- Entregar a migração em fatias verticais verificáveis, com coexistência temporária do Streamlit.
- Dar à ficha uma experiência de leitura e jogo, com edição contextual e acessível.
- Representar cartas, ofertas e aquisições com procedência e versões estáveis.
- Sincronizar mesas sem persistir ruído efêmero nem revelar conteúdo oculto.
- Preservar profundidade mecânica enquanto reduz carga operacional e torna causas e consequências visíveis.

**Non-Goals:**

- Oferecer escrita offline ou resolução automática de conflitos após longos períodos desconectados.
- Criar um motor genérico de videogame, uma plataforma pública de conteúdo ou um editor avançado de mapas.
- Reescrever a lógica de regras em TypeScript durante a migração.
- Automatizar decisões narrativas, opções de evolução ou escolhas que pertencem ao Narrador e aos jogadores.

## Decisions

### 1. Arquitetura híbrida com frontend React e domínio Python

O frontend será React com TypeScript e Vite. TanStack Router organizará rotas e estado compartilhável pela URL; TanStack Query administrará estado remoto; Zustand ficará restrito a estado efêmero de interface. Tailwind CSS, componentes controlados no repositório e primitivas acessíveis formarão a base do design system. PixiJS será usado apenas no grid e em superfícies gráficas que justifiquem canvas.

O backend será FastAPI com Pydantic, mantendo Python como linguagem do domínio. A API publicará OpenAPI, do qual será gerado o cliente TypeScript usado pelo frontend. Isso reduz divergência de contratos sem obrigar a reescrita simultânea de efeitos, desgaste e codecs.

Alternativas consideradas:

- **Next.js como aplicação completa:** acrescentaria fronteiras de servidor e cliente sem benefício central para uma aplicação autenticada e intensamente interativa.
- **Backend integral em TypeScript:** simplificaria linguagens, mas exigiria revalidar toda a lógica Python existente durante uma mudança já ampla.
- **Continuar com Streamlit:** não oferece controle suficiente sobre interação, canvas, autorização e sincronização para a experiência desejada.

### 2. PostgreSQL como fonte de verdade e serviços gerenciados do Supabase

PostgreSQL será a fonte de verdade. SQLAlchemy 2 continuará como camada de persistência do backend e Alembic substituirá migrações manuais. Supabase fornecerá PostgreSQL gerenciado, autenticação, armazenamento de arquivos e transporte realtime.

O cliente usará a identidade do Supabase, mas comandos de domínio serão enviados ao FastAPI com o token do usuário. O backend validará identidade, participação, permissão, versão e regra antes de gravar. Clientes não terão uma rota alternativa de escrita direta nas tabelas de domínio. Políticas de banco e de canais privados serão defesa adicional, especialmente para leituras expostas, arquivos e realtime.

Alternativas consideradas:

- **WebSockets próprios no FastAPI:** oferecem controle total, mas adicionam gestão de conexões, escalabilidade e presença antes que isso seja necessário.
- **Firebase ou banco documental:** prejudicaria consultas relacionais, integridade e migração do modelo SQL existente.
- **Redis desde o início:** fica adiado até métricas demonstrarem necessidade de filas, locks distribuídos ou fan-out próprio.

### 3. Comandos autoritativos, consultas e eventos de atualização

Alterações serão expressas como comandos semânticos, por exemplo `equipar_item`, `aplicar_efeito`, `mover_token`, `conceder_carta` e `confirmar_descanso`. Cada comando executará autorização, validação de versão, regra de domínio, transação, auditoria e emissão de atualização.

Consultas devolverão snapshots autorizados adequados ao painel e à visibilidade do usuário. Eventos realtime informarão que o estado confirmado mudou; eles não substituirão o banco como fonte de verdade.

Essa separação evita que o frontend calcule autoridade ou que um autosave gere dezenas de eventos sem valor. Também permite vincular cada alteração a uma ação compreensível no log.

### 4. Modelo de dados híbrido, multi-mesa e versionado

Identidade, mesas, membros, personagens, propriedades, permissões, cartas, ofertas, seleções, cenas, tokens e eventos terão estruturas relacionais. JSONB ficará reservado a seções extensíveis que não precisem de integridade ou consulta relacional frequente. Efeitos, equipamentos, custos, vínculos e estados consultados pelo sistema terão representação explícita.

Todos os recursos pertencentes a uma campanha carregarão `table_id`. Recursos mutáveis sujeitos a concorrência terão `version`. Exclusões relevantes serão recuperáveis durante uma retenção definida, sem apagar auditoria.

O catálogo de cartas separará definição, versão publicada e instância do personagem. Versões publicadas serão imutáveis. Uma instância permanecerá vinculada à versão adquirida até migração explícita.

### 5. Autorização central com papéis, propriedade e políticas

Papéis serão contextualizados por mesa. A decisão de autorização combinará:

- participação ativa;
- papel na mesa;
- propriedade do personagem ou recurso;
- política configurada pelo Narrador;
- visibilidade do objeto;
- ação solicitada.

O padrão será negar. O mesmo serviço de autorização será usado por comandos, consultas, arquivos e construção de tópicos realtime. Isso evita divergência entre “botão escondido” e permissão real.

Alterações narrativas e organizacionais poderão ser imediatas e auditadas. Campos mecânicos poderão ser liberados, bloqueados ou enviados para aprovação por política da mesa. Operações exclusivas, como entidades ocultas e aplicação administrativa de descanso, continuarão sob autoridade do Narrador.

### 6. Auditoria append-only sem event sourcing integral

Cada comando confirmado produzirá evento semântico append-only com ator, alvo, mesa, sessão, categoria, antes/depois seguro, origem e correlação. Dados secretos serão protegidos por classificação de visibilidade e sanitização; o log exibido ao jogador nunca será construído apenas escondendo elementos no cliente.

Correções executarão novo comando e referenciarão o evento anterior. O estado atual continuará em tabelas de domínio, evitando o custo de reconstruir toda a mesa a partir do histórico.

### 7. Ficha orientada a leitura e consequências

A ficha terá um cabeçalho de identidade e recursos, uma faixa de estado ativo e navegação entre módulos. O modo normal será leitura; edição ocorrerá em contexto por popover, diálogo ou painel lateral. Efeitos serão ícones com detalhes acessíveis por mouse, teclado e toque. Equipamentos equipados terão espaço visual distinto do inventário.

Valores derivados mostrarão suas fontes. Essa explicabilidade preserva agência e reduz carga cognitiva: a aplicação pode calcular, mas o jogador continua entendendo por que o resultado mudou. A escassez de PV, PP, cargas e outros recursos continuará visível, sustentando tensão e preparação sem exigir contabilidade manual redundante.

### 7.1 Inventário, efeitos e valores derivados na ficha viva

Decidido durante a implementação da seção 6:

- Inventário, equipamentos e efeitos aplicados usam as tabelas relacionais como fonte de verdade na nova plataforma. As listas `armas`, `armaduras`, `outros` e `efeitos_externos` do JSON da ficha deixam de ser editadas pela nova interface e servem apenas como formato de importação e migração.
- Equipar e desequipar são comandos sobre o item, versionados pela versão do personagem. Efeitos cuja fonte é um equipamento ficam ativos somente enquanto o item está equipado.
- Um valor derivado exibe total e fontes: valor base, ajuste manual e modificadores sem condição de efeitos ativos, inclusive de itens equipados. Modificadores condicionados a um contexto aparecem à parte como situacionais e não entram no total. A regra de mesa não muda; a aplicação apenas torna a soma explícita.
- PV, PP e outros recursos não existem na ficha legada e não recebem fórmula nesta mudança. A ficha pode trazer uma seção `recursos` com valores atuais e máximos; na ausência, a interface informa que o recurso não foi registrado.

### 8. Cartas como apresentação comum e ciclos de domínio distintos

Habilidades, magias e itens compartilharão anatomia visual, arte, tags e versionamento, mas não uma única máquina de estados.

- Habilidade ou magia: oferecida → selecionada → disponível para aprender → em aprendizado → aprendida.
- Item: oferecido → recebido → inventário → equipado, consumido ou removido.
- Efeito: aplicado → ativo → suspenso ou encerrado.
- Apresentação temporária: apresentada → recolhida, sem posse.

Ofertas serão independentes por destinatário na primeira versão. Draft compartilhado, exclusividade competitiva e turnos de escolha ficam fora desta mudança. O Narrador poderá definir candidatos e quantidade de escolhas, mas a aplicação não decidirá quando ou com que frequência a evolução deve ser oferecida.

### 9. Realtime divide estado efêmero e confirmado

Presence informará participantes conectados. Broadcast transportará cursores, pings e prévias de arraste, que podem ser perdidos sem corromper a mesa. Comandos confirmados serão gravados em transação e gerarão eventos privados para os clientes autorizados.

Ao reconectar, o cliente obterá snapshot autorizado e sua versão antes de consumir novos eventos. Não haverá escrita offline: durante indisponibilidade, o cliente distinguirá claramente a prévia local do estado confirmado.

Elementos secretos usarão tópicos e payloads autorizados; não será aceitável enviar dados ocultos e apenas escondê-los visualmente.

### 10. Ativos fora dos documentos e payloads

Retratos, ícones, mapas e artes serão armazenados como objetos, com referência, tipo, tamanho, hash e procedência no banco. Strings Base64 legadas serão extraídas durante a migração. Isso reduz tamanho de JSON, tráfego e duplicação, além de permitir políticas de acesso e cache adequadas.

### 11. Entrega incremental por fatias verticais

A ordem arquitetural será:

1. extrair domínio e estabilizar contratos;
2. criar banco migrado, autenticação e autorização;
3. entregar shell da nova aplicação e gestão de mesas;
4. migrar personagens e ficha viva com paridade;
5. adicionar auditoria e ferramentas do Narrador;
6. entregar cartas, ofertas e aprendizado;
7. adicionar sala, presença e grid;
8. validar migração, operar em paralelo e retirar Streamlit.

Cada fase deverá produzir uma jornada utilizável e testada. O grid não bloqueará a substituição gradual da ficha.

### 12. Estratégia de testes

- Testes Python existentes serão mantidos para regras e codecs.
- Testes unitários e de integração cobrirão autorização, comandos, concorrência e migrações.
- Contratos gerados serão verificados contra OpenAPI.
- Componentes visuais terão testes de interação e acessibilidade.
- Playwright cobrirá jornadas de Narrador e jogador em navegadores separados, incluindo oferta de cartas, edição auditada, segredos e reconexão.
- Migração terá fixtures representativas, execução repetida e comparação de origem com destino.

## Risks / Trade-offs

- **[Duas linguagens aumentam a superfície de manutenção]** → Gerar cliente TypeScript pelo OpenAPI, manter regras somente no domínio Python e proibir duplicação de cálculos autoritativos no frontend.
- **[Escopo amplo pode atrasar valor]** → Trabalhar em fatias verticais, com critérios de paridade por jornada e feature flags por mesa.
- **[Permissões e visibilidade podem vazar segredos]** → Negação por padrão, testes positivos e negativos, payloads sanitizados no servidor e canais privados autorizados.
- **[Realtime pode divergir do banco]** → Banco como fonte de verdade, versões, comandos idempotentes quando necessário e snapshot obrigatório na reconexão.
- **[JSONB pode perpetuar formatos frágeis]** → Usá-lo apenas em extensões de baixa consulta e promover campos para relações explícitas quando participarem de regras ou autorização.
- **[Migração pode atribuir significado errado a dados legados]** → Preservar origem, bloquear inferências incertas, gerar pendências de revisão e comparar resultados.
- **[Visual gamificado pode esconder informação importante]** → Manter densidade controlável, detalhes acessíveis por teclado/toque e visão textual completa para informações mecânicas.
- **[A automação pode reduzir percepção de risco e escassez]** → Mostrar custos, fontes, consequências e prévias antes de operações relevantes, sem escolher pelo jogador.
- **[Dependência de serviços gerenciados]** → Isolar autenticação, arquivos e realtime atrás de adaptadores de aplicação e manter Postgres como fonte portátil dos dados de domínio.

## Migration Plan

1. Criar inventário de jornadas, campos, catálogos e fixtures de dados legados.
2. Extrair módulos de domínio para pacote sem imports de Streamlit e manter uma camada adaptadora para a interface atual.
3. Introduzir FastAPI, modelos Pydantic, OpenAPI e testes de contrato sem alterar o fluxo principal dos usuários.
4. Criar esquema PostgreSQL multi-mesa com Alembic e migradores idempotentes para SQL/JSON/códigos portáteis.
5. Implementar autenticação, autorização e o shell React; liberar somente para mesas de teste.
6. Migrar ficha e personagens por módulos, comparando cálculos e serialização com a aplicação atual.
7. Adicionar auditoria, ferramentas do Narrador e cartas; validar com sessões controladas.
8. Introduzir realtime e grid como módulo opcional depois de os comandos autoritativos estarem estáveis.
9. Executar migração completa em cópia dos dados, comparar resultados e ensaiar rollback.
10. Fazer corte por mesa com período de observação; preservar backup e capacidade de retornar temporariamente ao Streamlit até o aceite dos critérios de paridade.
11. Congelar escritas na interface antiga, executar migração final incremental e só então removê-la como entrada principal.

O rollback antes do congelamento retorna a mesa ao Streamlit e descarta somente dados de teste da nova plataforma. Após o congelamento, qualquer rollback usará backup verificado e replay apenas das operações explicitamente reconciliadas; não haverá escrita concorrente irrestrita nos dois sistemas.

## Open Questions

- Escolher provedor de implantação do frontend e do container FastAPI com base em custo, região e observabilidade quando a primeira fatia estiver pronta; essa escolha não altera os contratos da plataforma.
- Definir duração exata da retenção de personagens excluídos e dos backups antes do corte, mantendo recuperação como comportamento obrigatório.
