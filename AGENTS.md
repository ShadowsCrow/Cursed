# Instruções para agentes

- Idioma: Português (Brasil) em código, interface, documentos e commits.
- Fluxo: OpenSpec (`openspec/`). Nenhuma mudança ativa (a última, `navegacao-inicial-e-perfil`, foi arquivada em 2026-09-28; ver o `HANDOFF.md` dela em `openspec/changes/archive/`). Pendência externa do usuário: login com Google (botão oculto até `VITE_LOGIN_GOOGLE=1`; falta configurar o provedor no Supabase).
- Regras de mesa (`rules/sistema`) não mudam sem decisão do usuário; a aplicação representa as regras, não as define. Nunca inferir valores mecânicos ausentes.
- Marque uma tarefa `[x]` só quando o comportamento estiver implementado **e verificado** por testes.
- Git: `git -c safe.directory=F:/Cursed ...`. Nunca versionar `secrets.toml`, arquivos `.env*` nem skills fora das `openspec-*`.
