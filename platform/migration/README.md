# Ferramentas de migração

Este diretório contém as migrações de esquema Alembic da nova plataforma.
Conversores de dados legados, relatórios de equivalência e rollback de dados
serão adicionados em tarefas posteriores. Nenhuma migração é executada ao
iniciar a API.

Com `CURSED_PLATFORM_DATABASE_URL` apontando para um banco da nova plataforma:

```text
python -m alembic -c platform/migration/alembic.ini upgrade head
python -m alembic -c platform/migration/alembic.ini current
```

O downgrade `base` existe para ensaios em banco descartável. Ele remove as
tabelas da nova plataforma; não o execute em banco com dados reais.

## Acesso privado (`0007_acesso_privado`)

No PostgreSQL, as tabelas de domínio ficam com RLS ativo e sem privilégios para
`anon` e `authenticated`: clientes leem e alteram dados somente pela API. Em um
projeto Supabase, a migração também cria o bucket privado `cursed-privado` e
políticas em `storage.objects` e `realtime.messages` que aplicam as mesmas
associações de mesa de `cursed_platform/acesso_privado.py`:

| Recurso | Quem acessa |
|---|---|
| Tópico `mesa:{mesa}` e objetos `mesas/{mesa}/mesa/...` | participantes ativos |
| Tópico `mesa:{mesa}:narrador` e objetos `mesas/{mesa}/narrador/...` | Narrador da mesa |
| Tópico `mesa:{mesa}:personagem:{id}` e objetos `mesas/{mesa}/personagens/{id}/...` | quem pode ler a ficha |

Clientes não gravam no bucket privado; envios passarão pela API. Nomes fora
dessas convenções são negados. Alterar uma regra exige mudar Python e SQL
juntos; `test_acesso_privado` compara as duas implementações quando recebe um
PostgreSQL descartável:

```text
docker run -d --rm --name cursed-teste -e POSTGRES_PASSWORD=teste -p 127.0.0.1:55432:5432 postgres:16
CURSED_TEST_POSTGRES_URL=postgresql+psycopg://postgres:teste@127.0.0.1:55432/postgres \
  python -m unittest cursed_platform.tests.test_acesso_privado
```

O teste cria e remove seu próprio banco e simula o subconjunto dos esquemas
`auth`, `storage` e `realtime` usado pelas políticas.
