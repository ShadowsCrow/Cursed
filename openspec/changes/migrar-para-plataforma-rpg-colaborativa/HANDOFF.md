# Passagem de trabalho — migrar-para-plataforma-rpg-colaborativa

Estado em 2026-09-26. Progresso no `tasks.md`: 60/89. Continue com `openspec instructions apply --change migrar-para-plataforma-rpg-colaborativa`.

## Onde parou (seção 10, sala e grid)

Feito, **ainda sem testes** (por isso 10.x continuam desmarcadas):

- Modelo: `cursed_platform/persistence.py` (`CenaRegistro`, `CamadaCenaRegistro`, `TokenRegistro`) e migração `platform/migration/alembic/versions/0012_sala.py`.
- Domínio: `cursed_platform/sala.py` — visibilidade (camada `mesa` + token não oculto + personagem não oculto), controle (Narrador; dono do personagem; `controladores`), snapshot por leitor, comandos (criar/ativar cena, criar/mover/revelar/remover token) com versão otimista.
- Eventos: `sala.emitir` chama `realtime.send(payload, evento, tópico, private=true)` **na mesma transação** do comando (entrega só após commit; sem chave secreta). Público → `mesa:{id}`; oculto → `mesa:{id}:narrador` (o Narrador assina os dois). No SQLite é ignorado.
- API: `platform/api/cursed_api/room.py` — `GET/PUT /mesas/{m}/modulos`, `GET /mesas/{m}/sala`, cenas, tokens (movimento, visibilidade, remoção). Módulo `sala` precisa estar ativo. Contratos em `cursed_platform/contracts.py` (seção "sala").
- Decisão: **movimento de token não gera auditoria** (ruído, ver 7.3); criar/ativar cena e criar/revelar/remover token geram. Registrar isso em `design.md`.

Próximos passos da seção 10:

1. Testes de API da sala (padrão de `cursed_platform/tests/test_narrador.py`): visibilidade no snapshot, controle (403 sem controle, posição mantida), limites da grade (422), versão (409), módulo desativado (409), token oculto nunca aparece para jogador.
2. Teste PostgreSQL de `emitir`: stub de `realtime.send` gravando em tabela, verificando tópico e ausência de payload de token oculto (10.6, 10.8). Ver `test_acesso_privado.py` para o padrão de banco descartável.
3. 10.1: frontend com `supabase.channel(`mesa:${id}`, { config: { private: true, presence: { key: userId } } })` e `supabase.realtime.setAuth(token)`; presença; recusa para removido (RLS da 0007 já cobre).
4. 10.4: canvas com PixiJS (dependência nova prevista no design), pan/zoom/grid/tokens.
5. 10.5: cursor/ping/prévia de arraste via broadcast do cliente (não persiste).
6. 10.7: ao `SUBSCRIBED`, buscar `GET /mesas/{m}/sala` e só então aplicar eventos (token com `versao` maior).
7. 10.9: movimento com `useCommandPreview` (reverte e avisa se falhar).

## Ambiente

- Git: a pasta pertence a outro usuário do Windows; use `git -c safe.directory=F:/Cursed ...`.
- Python: `.venv/Scripts/python.exe -m unittest discover -s cursed_platform/tests -t .` (Streamlit: `cd app_streamlit && ../.venv/Scripts/python.exe -m unittest discover -s tests`).
- Frontend (`platform/frontend`): `npm run typecheck`, `npm run lint -- --max-warnings 0`, `npm test`, `npm run build`, `npm run check:client`.
- Contrato: após mudar a API, `python -m cursed_platform.export_openapi` e `npm run generate:client`.
- Modo dev local (sem Supabase): API com `CURSED_DEV_AUTH=1` + SQLite em `platform/api/.dev/`; frontend com `platform/frontend/.env.local` (`VITE_DEV_AUTH=1`). Identidade `dev:<id>`, proibida em produção. Os bancos em `platform/api/.dev/` (`cursed-dev.sqlite`, `capturas.sqlite`) estão na 0011: rode o `alembic upgrade head` de `platform/migration` apontando `CURSED_PLATFORM_DATABASE_URL` para eles antes de usar a sala.
- Capturas de tela: `npm run capturas` (API dev na 8001, Vite na 5174; ver `platform/frontend/README.md`).
- Supabase real (projeto `wvfrwmplruhwfkmwjtvl`, sa-east-1): credenciais em `platform/api/.env.supabase` e `platform/frontend/.env.supabase` (fora do Git; carregar com `set -a; . platform/api/.env.supabase; set +a`). Migrações aplicadas até `0012_sala`; RLS 25/25, bucket `cursed-privado`, 5 políticas. **Ainda sem contas de teste** — pedir ao usuário.
- Não versionar: `app_streamlit/.streamlit/secrets.toml`, arquivos `.env*`, as skills copiadas do Codex em `.agents/skills` e `.claude/skills` (fora as `openspec-*`).

## Pendências fora da seção 10

- 8.6 e 9.10: validação com a mesa (roteiros em `docs/validation/`), dependem do usuário.
- Seção 11 (migração de dados) resolve as divergências D2 e D5 de `docs/migration/parity-report-ficha.md`.
- PV/PP/Escala e edição de Exaustão/Estresse: o usuário quer desenhar com calma (explorar antes de implementar).
- Visual: ideias abertas — ações de personagem num menu "Mais ações", ficha dentro do layout da mesa, estética de fantasia nas telas administrativas.
