"""Nomes de exibição dos participantes.

Revision ID: 0011_perfis
Revises: 0010_cartas
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0011_perfis"
down_revision = "0010_cartas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("usuario_id", sa.String(100), primary_key=True),
        sa.Column("nome", sa.String(120), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY")
        papeis = list(op.get_bind().exec_driver_sql(
            "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname"
        ).scalars())
        if papeis:
            op.execute(f"REVOKE ALL ON public.user_profiles FROM {', '.join(papeis)}")


def downgrade() -> None:
    op.drop_table("user_profiles")
