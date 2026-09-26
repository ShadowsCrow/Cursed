# Passagem de trabalho — migrar-para-plataforma-rpg-colaborativa

Estado em 2026-09-26. Progresso no `tasks.md`: 79/89. No PowerShell, use `openspec.cmd instructions apply --change migrar-para-plataforma-rpg-colaborativa --json` (`openspec.ps1` é bloqueado pela política local).

## Onde parou

A seção 10 e as tarefas 11.1–11.7, 12.2, 12.4 e 12.5 estão concluídas e verificadas. O destino conservador da 11.2 mantém `racas.json`, `tipos_dano.json` e classes como **pendências explícitas**, sem entidade ou regra inferida. O relatório de equivalência bloqueia aprovação enquanto elas existirem. A próxima tarefa técnica é 12.1; 8.6 e 9.10 dependem de validação de mesa com pessoas.

## Sala e grid (10.1–10.9)

- `cursed_platform/sala.py`, `platform/api/cursed_api/room.py` e `cursed_platform/tests/test_sala.py`: visibilidade, autorização, integridade, versões, comandos e snapshot. Cena referencia opcionalmente mapa no caminho compartilhado do bucket privado.
- Migração `0013_integridade_sala`: vínculo token–camada–cena, uma cena ativa por mesa e referência de mapa. **Ainda não aplicada no Supabase real.**
- `RoomPresence.tsx`: canal privado com token, Presence e recarga de snapshot na inscrição/reconexão; evento recebido durante a leitura força nova consulta. `useRoomEphemera.ts`: cursor, ping e prévia de arraste por Broadcast privado.
- `RoomCanvas.tsx` e `RoomView.tsx`: PixiJS v8, pan, zoom, grade, tokens, seleção por lista DOM e movimento com `useCommandPreview`. Falha da API restaura posição e anuncia erro. O arraste escolhe destino, que precisa de confirmação explícita.
- `npm.cmd run bench:room`: Chromium renderiza 300 tokens, verifica zoom, pan e arraste cancelado (cerca de 500–700 ms no ambiente local).
- `test_acesso_privado.py` usa stub PostgreSQL de `realtime.send` para verificar commit, rollback, tópicos ocultos e RLS. Movimento não gera auditoria; decisão registrada no `design.md`.

## Migração de tabelas (11.1)

- `cursed_platform/migracao_tabelas.py` lê as tabelas SQL legadas sem Streamlit. Exige origem estável e mesa explícita; converte fichas, armas, armaduras, outros itens e efeitos externos. Preserva payloads brutos e grava modificadores declarados sem inferência.
- Migração `0014_procedencia_legada` cria `legacy_migrations` com origem, versão, hash e destino. **Ainda não aplicada no Supabase real.**
- `platform/migration/migrar_tabelas.py` é prévia transacional por padrão; `--aplicar` confirma. Instruções em `platform/migration/README.md`. `test_migracao_tabelas.py` verifica idempotência em SQLite e PostgreSQL e recusa origem alterada.
- O migrador ainda não foi executado em dados reais. D2/D5 de `docs/migration/parity-report-ficha.md` permanecem abertas até ensaio e revisão.

## Ativos e códigos portáteis (11.3–11.4 concluídas)

- `cursed_platform/migracao_ativos.py`, CLI `platform/migration/migrar_ativos.py` e Alembic `0015_ativos_legados` extraem `imagem_base64` das fichas, itens e efeitos já migrados. Validam formato, tamanho, hash e objeto gravado; deduplicam por personagem e registram procedências. Prévia não grava. Há backend local de ensaio e adaptador HTTP para o bucket privado do Supabase. `Pillow` foi adicionado às dependências.
- `migrar_ativos_catalogos` extrai artes Base64 e ícones estáticos para `mesas/{mesa}/narrador/legado/`, deduplicados por hash, com procedência em `legacy_catalog_assets`. O migrador JSON cria rascunhos sem Base64 embutido e registra pendência de extração. A extração vincula as artes ao rascunho; a API autoriza leitura e a interface resolve `imagem_ativo` e arte de cartas. O Narrador confirma a promoção para `mesas/{mesa}/mesa/cartas/` ao publicar; o servidor verifica integridade de origem e destino. `test_migracao_ativos.py`, `test_cartas.py`, `CardEditor.test.tsx` e `SheetHeader.test.tsx` cobrem o fluxo. **11.3 marcada.** A migração 0015 ainda não foi aplicada no Supabase real e o adaptador HTTP não foi exercitado contra ele.
- `test_migracao_ativos.py` cobre prévia, deduplicação, integridade, imagem inválida e repetição. `test_cartas.py` agora percorre E1 e EQ1 válidos até publicação versionada com procedência, e recusa códigos inválidos sem entidade parcial. A compatibilidade de importação já existia nas APIs de ficha e cartas; **11.4 marcada** após verificação.
- `.github/workflows/platform-contract.yml` executa `compileall`, testes de migração e segurança destacados, toda a suíte Python com PostgreSQL de serviço, gates frontend/contrato e Playwright. Falhas intencionais locais foram detectadas por compilação Python, migrações, segurança, suíte Python, OpenAPI, cliente gerado, typecheck, lint, build, Vitest e Playwright. A sequência completa também passou com PostgreSQL 16 descartável (146 testes Python), 208 testes Vitest e 3 cenários Playwright; `npm ci` passou em diretório temporário limpo. O relatório está em `docs/operations/ci-gates.md`. **12.1 permanece aberta** até observar a execução completa no GitHub Actions.

## JSONs, ambiguidades, equivalência e ensaio (11.2, 11.5–11.7)

- `cursed_platform/migracao_json.py` e `platform/migration/migrar_json.py`: exportações históricas viram personagem, inventário e efeitos; catálogos e bibliotecas SQL viram rascunhos de carta quando seguros. Custo original e payload sem imagens ficam na procedência. Classes, raças, tipos de dano, imagens ainda não extraídas e tipos de ativação sem equivalência geram pendências; JSON inválido ou origem alterada gera rejeição. Prévia padrão e `--aplicar`; repetição não duplica. `test_migracao_json.py` cobre esses casos.
- `migracao_ambiguidades.py` e CLI sinalizam 17 custos no catálogo de classes e armaduras com `defesa` sem `armadura`. `test_migracao_ambiguidades.py` confirma que nenhum custo especializado é preenchido por inferência.
- `migracao_equivalencia.py` e CLI comparam contagens, hashes, campos críticos e amostras serializadas. A saída não aprovável usa código 2; testes alteram origem/destino e confirmam bloqueio. O relatório reavalia JSONs em savepoint revertido.
- Ensaio real documentado em `docs/migration/ensaio-2026-09-26.md`: backup do SQLite local, PostgreSQL descartável, 75 convertidos, 65 pendentes, 0 rejeitados, 0 divergências, 1,695 s, rollback de banco e backup confirmado. A base SQL local tinha 0 fichas; havia 1 JSON histórico. `test_ensaio_migracao.py` verifica ausência do banco após rollback.
- `migracao_ativos.py` agora inclui personagens provenientes de `json:ficha` além das tabelas SQL.

## Observabilidade (12.5)

- `observabilidade.py` emite eventos JSON de comandos, erros, conflitos, falhas realtime e migrações sem payloads privados. O middleware da API registra rota, status e latência; `platform/migration/consultar_operacao.py` resume logs JSONL. Consultas e cuidados operacionais estão em `docs/operations/observabilidade.md`; `test_observabilidade.py` verifica os eventos.

## Verificação e ambiente

- Python: 146 testes passaram com PostgreSQL descartável, incluindo upgrade/downgrade Alembic até `0015`, políticas privadas, repositórios, migradores, promoção de arte e ensaio com rollback. O ensaio em `docs/migration/ensaio-2026-09-26.md` extraiu também artes de catálogo, sem divergências; banco e backup descartáveis foram removidos. O contêiner `cursed-test-pg-ativos-final` foi encerrado. O adaptador HTTP de objetos Supabase ainda não foi exercitado contra o serviço real.
- Frontend: 208 testes, build, lint sem avisos e contrato OpenAPI sincronizado passaram. O benchmark da sala passou antes destas alterações de arte. PixiJS consta em `package.json`.
- Playwright: 3 cenários passaram repetidamente com contextos separados de Narrador e jogador; `npm.cmd run test:e2e` agora sobe API, Vite e SQLite descartável, e o workflow instala Chromium e executa a suíte. A revisão automatizada de acessibilidade passou nas quatro superfícies, com correção do toque no detalhe de efeito. Registro e limites em `docs/validation/revisao-acessibilidade-plataforma.md`; 12.3 segue aberta até teste manual com leitor de tela e verificações adaptativas restantes.
- O contêiner PostgreSQL descartável `cursed-test-pg-sala` foi encerrado após os testes.
- Git: `git -c safe.directory=F:/Cursed ...`. Python: `.venv/Scripts/python.exe -m unittest discover -s cursed_platform/tests -t .`. Frontend: `npm.cmd run typecheck`, `npm.cmd run lint -- --max-warnings 0`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run check:client`, `npm.cmd run bench:room`.
- Após mudar API: `.venv/Scripts/python.exe -m cursed_platform.export_openapi` e `npm.cmd run generate:client` em `platform/frontend`.
- Bases dev em `platform/api/.dev/` precisam `alembic upgrade head` para abrir a sala. Supabase real (projeto `wvfrwmplruhwfkmwjtvl`, sa-east-1) tinha migrações até 0012 antes desta sessão e ainda não tem contas de teste. Credenciais ficam em `.env.supabase` fora do Git.
- 8.6 e 9.10 dependem de validação de mesa pelo usuário. Não mudar `rules/sistema` sem decisão. Nunca versionar `secrets.toml`, `.env*` nem skills fora das `openspec-*`.
