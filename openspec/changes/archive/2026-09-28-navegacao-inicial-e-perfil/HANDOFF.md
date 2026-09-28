# Passagem de trabalho — navegacao-inicial-e-perfil

> `AGENTS.md` aponta para esta mudança como ativa (tarefa 1.1). A `criacao-guiada-e-nova-estetica` continua com a 7.4 (CI verde) aberta; a 7.3 (validação de mesa) foi removida, porque o usuário proibiu esse requisito em todo o projeto (2026-09-28).

## O que a mudança faz

Classificação: **núcleo, apenas plataforma e interface**. Nenhuma regra de mesa, limite ou catálogo muda; a Biblioteca só exibe `rules/sistema`.

Experiência antes da mesa: conta (cadastro, e-mail/senha, Google atrás de flag, recuperação de senha), perfil com apelido e foto, barra superior (Início, Campanhas, Personagens, Biblioteca), Início com "Criar campanha" e "Gestão de mesas", Campanhas com Narrando/Jogando, acervo de Personagens com cópia independente para outra campanha, Biblioteca com visão geral e regras. Estética das imagens em `platform/frontend/exemplo/`.

Artefatos: `proposal.md`, `design.md` (D1–D11), `specs/` (conta-e-perfil, navegacao-da-plataforma, campanhas, acervo-de-personagens, biblioteca-do-sistema; deltas de envio-de-imagens e gestao-de-personagens), `tasks.md`, `arte/prompts.md`.

## Decisões do usuário (não reabrir sem pedir)

- **Entrada:** e-mail e senha **e Google**. A configuração real do Google (cliente OAuth, provedor no Supabase) fica **para outro momento**; o botão só aparece com `VITE_LOGIN_GOOGLE=1` (tarefa 9.3 adiada).
- **"Gestão de mesas"** no Início leva a Campanhas, onde a pessoa vê as campanhas que criou e as que joga.
- **Reaproveitar personagens:** **cópia independente** (nunca ficha vinculada).
- **Biblioteca:** Regras = documentos de `rules/sistema` só leitura; Visão geral redigida por mim a partir do livro e **aprovada pelo usuário** antes de marcar a 8.3.
- **Documentos duplicados de Dano de Queda:** mostrar os dois.
- **Ordem das Regras:** a da criação de personagem, apêndices por último.
- **Título da abertura do Início:** "Histórias vivem aqui".
- **Moldura (revisão de 2026-09-28):** a versão com cantos por imagem foi **reprovada** ("ficou ridícula de feia"). Molduras usam o **mesmo SVG do Resumo da ficha** por `border-image`, com variações (design D10). Nada de imagem em moldura.
- **Disposição (revisão de 2026-09-28):** lista lateral de cima a baixo, colada à esquerda; painel de conteúdo colado nela; a campanha é uma caixa só com seções separadas por molduras. Seguir a estrutura das referências, não só a paleta.
- **Papel** (Narrador/jogador) só aparece em Campanhas; nunca perguntado ao entrar.

## Cuidados

- **Árvore de trabalho misturada:** a branch `feature/retrato-refinamento` tem alterações de outras mudanças sem commit (ver o `HANDOFF.md` da `criacao-guiada-e-nova-estetica`). Esta mudança é implementada na mesma árvore; os commits precisam ser separados na tarefa 9.5, por decisão do usuário.
- Após mudar a API: `.venv/Scripts/python.exe -m cursed_platform.export_openapi` e `npm run generate:client` (em `platform/frontend`).
- Marcar `[x]` só com o comportamento implementado **e verificado por testes**.

## Estado (2026-09-28)

**25 de 32 tarefas concluídas e verificadas.** Abertas:

- **2.2** aplicar a 0018 no Supabase de testes: precisa de autorização do usuário.
- ~~**4.2**~~ prova visual **aprovada pelo usuário em 2026-09-28** ("ficou excelente, validei"), depois das revisões: layout colado da referência, moldura do Resumo, ilustrações até a moldura, moldura do site contendo a página, Personagens no formato do Resumo, foto do perfil e aviso da mesa na prévia.
- **8.3** texto da Visão geral (`src/app/plataforma/biblioteca/visao-geral.md`) escrito e com links testados; falta a **aprovação do usuário**.
- ~~**9.1**~~ acessibilidade concluída: e2e percorre só com Tab/Enter/Espaço (desktop e 360 px) primeiro acesso, criar campanha, trocar lado, vitrine, cópia e regra; axe sem violações em primeiro acesso, entrar, cadastro e recuperar senha. Achado corrigido: depois de copiar, o foco caía fora do diálogo (Esc parava de fechar); agora vai para "Abrir a campanha".
- **9.3** Google adiado; **9.5** commit/push/CI. A 9.4 (pessoa de fora) foi retirada pela regra do projeto de 2026-09-28 que proíbe validação em mesa ou com jogadores.

## Onde está cada parte

- Servidor: migração `platform/migration/alembic/versions/0018_perfil_e_campanha.py`; `cursed_platform/perfis.py` (apelido, foto, quem vê a foto), `cursed_platform/acervo.py` (consulta entre mesas e ficha da cópia); rotas `platform/api/cursed_api/perfil.py` (`/perfil`, `/perfil/foto`, `/perfis/{id}/foto`), `acervo.py` (`/acervo/personagens`, `/mesas/{id}/personagens/copias`), `tables.py` (`GET/PUT /mesas/{id}`, `MesaResumo` com sistema/sinopse/capa), `images.py` (destino `capa`); `Acao.EDITAR_CAMPANHA` em `authorization.py`; `Ator` com `email` e `provedor`. `PersonagemResumo` ganhou `retrato_objeto`.
- Cliente: `src/app/plataforma/` (`CascoPlataforma`, `Inicio`, `campanhas/`, `personagens/`, `biblioteca/`, `perfil/`, `entrada/`, `dados.ts`, `imagens.ts`, `Miniaturas.tsx`, `ItemLateral.tsx`, `plataforma.css`), componentes em `src/ui/Ornamentos.tsx`, rotas em `src/app/routes.ts` e `App.tsx`. Prévia: `apiDemonstracao.ts` + `ProvaDaPlataforma.tsx` em `/preview/plataforma` (base própria em `main.tsx`).
- Biblioteca: `biblioteca/documentos.ts` (lista, ordem, excluídos; `import.meta.glob` de `rules/sistema`), `Leitura.tsx` (carregado sob demanda), `markdown.ts`. `vite.config.ts` libera `../../rules/sistema` no servidor de desenvolvimento. Dependências novas: `react-markdown`, `remark-gfm`.
- Arte: `scripts/preparar_arte.py` (`ARTES_DA_NAVEGACAO`, `preto_para_alfa`, `preparar_canto_da_moldura`) → `public/arte/` (total 3,1 MB).

## Verificação (2026-09-28, após a revisão visual)

- Frontend: 514 testes verdes, lint limpo; e2e 14/14 (inclui testes novos de outra conversa). **Atenção:** `npm run typecheck`/`build` falham por `src/app/characters/sheet/resumo/ResumoFicha.test.tsx` (usa `node:path` e `process` sem tipos), arquivo da mudança `aba-resumo-da-ficha`, não desta. As molduras desta mudança referenciam os SVGs de `src/app/characters/sheet/resumo/molduras/` (ainda não versionados): commitar as duas mudanças juntas ou mover os SVGs de pergaminho para `src/ui/molduras/`.

## Verificação anterior (2026-09-28, primeira versão)

- Python: 476 testes (16 pulados), incluindo `test_migracao_perfil_campanha.py`, `test_api_perfil_campanha.py` (19), `test_api_acervo.py` (10), `test_preparar_arte.py` (13); `export_openapi --check` verde.
- Frontend: lint e typecheck limpos; 493 testes (novos: `Ornamentos.test.tsx`, `plataforma.test.tsx`, `Entrada.test.tsx`, `Leitura.test.tsx`, `documentos.test.ts`, rotas, catálogo, shells); `check:client` verde; `npm run build` verde (leitura de regras em pedaço próprio, 47 kB gz).
- E2E: 12/12 (dois novos: primeiro acesso + campanha + convite inválido/válido + sinopse + participantes + Biblioteca no celular + sair; acervo com valores da ficha, NPC oculto invisível na campanha e cópia como NPC). A 0018 sobe pelo Alembic no SQLite do e2e.
- Capturas: `29-campanha-narrador` a `34-prova-da-plataforma` em `.screenshots/` (desktop e celular). As capturas precisam do perfil confirmado de narrador e jogador 1 (feito no `main()` do `screenshots.mjs`, não em `semear`, porque o e2e testa o primeiro acesso do jogador 1).

## Registros da implementação

### Arte recebida e revisada (tarefa 1.3, 2026-09-28)

As 9 imagens chegaram em `platform/frontend/exemplo/` e foram movidas para `platform/frontend/arte-original/` (ignorada pelo Git). Nenhuma tem texto legível, logotipo, marca d'água ou moldura indevida; o estilo combina com a âncora.

| Arquivo | Tamanho | Achados |
|---|---|---|
| `abertura-inicio.png` | 1536×1024 | terço esquerdo escuro (luminância média 15, p95 35 de 255): título legível com degradê leve |
| `abertura-entrada.png` | 1536×1024 | centro com o feixe de luz do portão (média do terço esquerdo 35, p95 80): o cartão do formulário precisa de fundo próprio opaco |
| `capa-campanha-padrao.png` | 1536×1024 | cidade reconhecível no centro; funciona em faixa e em miniatura |
| `faixa-visao-geral.png`, `faixa-regras.png` | 1536×1024 | metade esquerda muito escura (média 8–9): ótima para título; páginas e mapa sem letras |
| `retrato-vazio-npc.png`, `retrato-vazio-monstro.png` | 1024×1536 | sem rosto; combinam com `retrato-vazio.png` |
| `moldura-ornamental.png` | 1254², RGB | **escolhida**: fundo preto puro (luminância máx. 1 fora do ouro), cantos idênticos (caixa do canto ≈ 74–215 px), lados = friso duplo liso (duas linhas de ~5 px com 3 px de intervalo) |
| `moldura-ornamental-transparente.png` | 1254², RGBA | **descartada**: alfa binário (0 % de pixels semitransparentes), bordas serrilhadas; a preta dá alfa suave pela luminância |

### Migração 0018 no Supabase de testes (tarefa 2.2, concluída)

- 2026-09-28, pelo conector MCP do Supabase, com autorização do usuário: projeto `cursed` (`wvfrwmplruhwfkmwjtvl`, sa-east-1). Antes: `alembic_version = 0017_ficha_completa`, nenhuma das colunas novas existia, tabelas `rpg_tables`, `user_profiles` e `characters` vazias. O projeto não registra migrações do Supabase (`list_migrations` vazio); o controle é o Alembic.
- Aplicado numa transação o mesmo DDL da `0018_perfil_e_campanha` (`apelido`, `foto_objeto`, `perfil_confirmado_em` em `user_profiles`; `sinopse`, `capa_objeto`, `sistema` com padrão `'cursed'` em `rpg_tables`; `procedencia` JSON em `characters`) e `alembic_version` trocada para `0018_perfil_e_campanha`. O comando terminou sem erro.
- **Verificado:** `alembic_version = 0018_perfil_e_campanha`; as 7 colunas com os tipos da migração (`sistema` `varchar(40)` não nula, padrão `'cursed'`); RLS ligado em `user_profiles`, `rpg_tables` e `characters`; nenhum privilégio `SELECT/INSERT/UPDATE/DELETE` para `anon` ou `authenticated` nessas tabelas. A primeira leitura foi bloqueada pelo modo automático; a segunda, pedida explicitamente pelo usuário, passou.

### Decisões e achados da implementação

- **Personagens no formato do Resumo (decisão do usuário, 2026-09-28):** a vitrine própria saiu; `personagens/Vitrine.tsx` monta o `ResumoFicha` da aba-resumo-da-ficha com as mesmas consultas da página da ficha (ficha, valores derivados, inventário, cartas, classes, listas), sem `permissoes` (só leitura: sem troca de ilustração nem convite para a História). Os atalhos dos quadros abrem `/mesas/{m}/personagens/{p}?secao=…`. Acima, a barra com a campanha, "Abrir ficha" e "Copiar para campanha". O cliente de demonstração responde às rotas do Resumo com valores de exemplo. **Dependência:** esta mudança agora usa componentes da `aba-resumo-da-ficha` (não versionada); commitar as duas juntas ou na ordem Resumo → navegação.

- **Moldura do site contém a página (revisão de 2026-09-28, aprovada pelo usuário):** a moldura era uma camada fixa por cima, e o painel da direita e o conteúdo rolado passavam por fora dela. Agora `.plataforma` tem a altura da janela com 10 px de margem, a moldura é `absolute` dentro dela e só `.plataforma__conteudo` rola, cortado abaixo da barra superior. O painel tem folga de 18/26 px para o desenho da moldura (14 px para fora da caixa), então os cantos encostam na lista à esquerda e ficam dentro da moldura do site. Medido: painel até 1418 px à direita e 878 px embaixo, com conteúdo até 1430 × 890 e moldura a 1435 × 895 numa janela de 1440 × 900.

- **Ilustração dentro da moldura (revisão de 2026-09-28):** faixas, retrato da vitrine e arte da sinopse usam `.sangria-topo`: vão até a linha interna da moldura e são recortadas no chanfro (`clip-path`), com as medidas tiradas dos SVGs (quadro: linha a 7,5 px e chanfro de 14,5 px; painel: 8 px e 26 px; painel no celular: 2 px e 19 px). Antes, sobrava uma faixa do fundo do painel em volta da imagem, e o usuário a viu como a página transbordando a moldura.

- **Moldura por imagem retirada:** o canto recortado da moldura gerada (e `preto_para_alfa`) saiu do script, dos testes e de `public/arte/`. As matrizes `moldura-ornamental*.png` ficam em `arte-original/` sem uso.
- **Cópia (D8, spec ajustado):** NPCs e monstros não seguem os limites de personagem (decisão de 2026-09-27), então a validação da criação de entidades nunca recusa a cópia: o cenário virou "valores fora do padrão preservados". As cartas de classe, arquétipo e raça são concedidas como em qualquer criação; não vão cartas de oferta, inventário, efeitos, Desgaste nem Consequências.
- **Leitura de imagens (D5, ajustado):** o projeto não usa URLs assinadas; capa sai por `/mesas/{id}/ativos` e foto por `/perfis/{id}/foto`, ambos em base64.
- **Retratos na campanha:** `GET /mesas/{id}/personagens` só lista o que a pessoa pode ler (jogador: os próprios), então incluir `retrato_objeto` no resumo não expõe nada novo.
- **Axe achou** blocos de código roláveis sem foco nas regras: `pre` com `tabIndex=0`.
- **Árvore compartilhada:** outra conversa edita `scripts/preparar_arte.py` (arte do Resumo) ao mesmo tempo; as mudanças desta ficaram em funções próprias.

## Integração contínua (tarefa 9.5)

Execução verde do workflow `platform-contract.yml` em 2026-09-28 (https://github.com/ShadowsCrow/Cursed/actions/runs/36414627123), commit `b30096f` na branch `feature/retrato-refinamento`: testes Python, contrato OpenAPI, cliente gerado, typecheck, lint sem avisos, build, Vitest e e2e (Playwright). Os commits foram separados por mudança: `30dbfe8` (arquivamento), `f05470b` (Exaustão e Estresse), `8782e7e` (criação guiada e estética), `736445c` (Resumo) e `b30096f` (navegação); arquivos usados por mais de uma mudança entraram inteiros no commit da mudança com mais conteúdo neles.

## Pendência externa ao arquivar

- **9.3 (login com Google):** adiada por decisão do usuário. O botão existe e fica oculto até `VITE_LOGIN_GOOGLE=1`; falta o usuário criar o cliente OAuth no Google Cloud, ligar o provedor no Supabase (projeto `wvfrwmplruhwfkmwjtvl`) e liberar as URLs de redirecionamento. Não bloqueia o arquivamento (ver a própria tarefa).
