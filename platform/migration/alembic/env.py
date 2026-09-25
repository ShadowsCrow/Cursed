"""Ambiente de migração do banco da nova plataforma."""

from __future__ import annotations

from alembic import context
from sqlalchemy import create_engine, pool

from cursed_platform.config import load_settings
from cursed_platform.persistence import Base


config = context.config
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=load_settings().database_url,
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
        return

    engine = create_engine(load_settings().database_url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
