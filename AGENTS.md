# Instruções para agentes

- Idioma: Português (Brasil) em código, interface, documentos e commits.
- Fluxo: OpenSpec (`openspec/`). Mudança ativa: `migrar-para-plataforma-rpg-colaborativa`. Leia `openspec/changes/migrar-para-plataforma-rpg-colaborativa/HANDOFF.md` antes de continuar.
- Regras de mesa (`rules/sistema`) não mudam sem decisão do usuário; a aplicação representa as regras, não as define. Nunca inferir valores mecânicos ausentes.
- Marque uma tarefa `[x]` só quando o comportamento estiver implementado **e verificado** por testes.
- Git: `git -c safe.directory=F:/Cursed ...`. Nunca versionar `secrets.toml`, arquivos `.env*` nem skills fora das `openspec-*`.
