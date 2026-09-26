"""Procedência estável dos registros migrados.

Revision ID: 0014_procedencia_legada
Revises: 0013_integridade_sala
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0014_procedencia_legada"
down_revision = "0013_integridade_sala"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "legacy_migrations",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("origem", sa.String(200), nullable=False),
        sa.Column("versao_origem", sa.String(50)),
        sa.Column("tipo_origem", sa.String(100), nullable=False),
        sa.Column("id_origem", sa.String(100), nullable=False),
        sa.Column("hash_conteudo", sa.String(64), nullable=False),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id"), nullable=False),
        sa.Column("tipo_destino", sa.String(100), nullable=False),
        sa.Column("id_destino", sa.String(100), nullable=False),
        sa.Column("migrado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("origem", "tipo_origem", "id_origem", name="uq_legacy_migrations_origem"),
    )
    op.create_index("ix_legacy_migrations_destino", "legacy_migrations", ["tipo_destino", "id_destino"])
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE public.legacy_migrations ENABLE ROW LEVEL SECURITY")
        papeis = list(op.get_bind().exec_driver_sql(
            "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname"
        ).scalars())
        if papeis:
            op.execute(f"REVOKE ALL ON public.legacy_migrations FROM {', '.join(papeis)}")


def downgrade() -> None:
    op.drop_table("legacy_migrations")
