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
