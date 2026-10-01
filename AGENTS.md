# Instruções para agentes

- Idioma: Português (Brasil) em código, interface, documentos e commits.
- Fluxo: OpenSpec (`openspec/`). Nenhuma mudança ativa. Em 2026-10-01 foram arquivadas, com aprovação do usuário: `reformular-visual-da-ficha`, `redesenhar-informacoes-basicas`, `redesenhar-aba-pericias`, `reformular-personalidade-da-ficha`, `redesenhar-aba-atributos`, `redesenhar-aba-cartas`, `simplificar-criacao-de-cartas` e `cartas-do-catalogo-somente-leitura` (ver os `HANDOFF.md` delas em `openspec/changes/archive/`). Migração `0021_remover_equipados_sem_subtipo` (apaga itens equipados sem subtipo, de antes da grade) ainda não aplicada no Supabase de testes. Pendência externa do usuário: login com Google (botão oculto até `VITE_LOGIN_GOOGLE=1`; falta configurar o provedor no Supabase).
- Regras de mesa (`rules/sistema`) não mudam sem decisão do usuário; a aplicação representa as regras, não as define. Nunca inferir valores mecânicos ausentes.
- Marque uma tarefa `[x]` só quando o comportamento estiver implementado **e verificado** por testes.
- Git: `git -c safe.directory=F:/Cursed ...`. Nunca versionar `secrets.toml`, arquivos `.env*` nem skills fora das `openspec-*`.
