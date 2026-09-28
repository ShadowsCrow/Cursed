# Instruções para agentes

- Idioma: Português (Brasil) em código, interface, documentos e commits.
- Fluxo: OpenSpec (`openspec/`). Mudança ativa: `navegacao-inicial-e-perfil`. Leia `openspec/changes/navegacao-inicial-e-perfil/HANDOFF.md` antes de continuar. Pendências dela: 2.2 (aplicar a migração 0018 no Supabase de testes, falta a conexão com o banco da plataforma) e 9.3 (login com Google, adiado pelo usuário).
- Regras de mesa (`rules/sistema`) não mudam sem decisão do usuário; a aplicação representa as regras, não as define. Nunca inferir valores mecânicos ausentes.
- Marque uma tarefa `[x]` só quando o comportamento estiver implementado **e verificado** por testes.
- Git: `git -c safe.directory=F:/Cursed ...`. Nunca versionar `secrets.toml`, arquivos `.env*` nem skills fora das `openspec-*`.
