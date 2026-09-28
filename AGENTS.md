# Instruções para agentes

- Idioma: Português (Brasil) em código, interface, documentos e commits.
- Fluxo: OpenSpec (`openspec/`). Mudança ativa: `navegacao-inicial-e-perfil`. Leia `openspec/changes/navegacao-inicial-e-perfil/HANDOFF.md` antes de continuar. A `criacao-guiada-e-nova-estetica` ainda tem as tarefas 7.3 e 7.4 abertas (ver o `HANDOFF.md` dela).
- Regras de mesa (`rules/sistema`) não mudam sem decisão do usuário; a aplicação representa as regras, não as define. Nunca inferir valores mecânicos ausentes.
- Marque uma tarefa `[x]` só quando o comportamento estiver implementado **e verificado** por testes.
- Git: `git -c safe.directory=F:/Cursed ...`. Nunca versionar `secrets.toml`, arquivos `.env*` nem skills fora das `openspec-*`.
