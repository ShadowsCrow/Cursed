"""Módulos opcionais configurados por mesa.

Revision ID: 0004_modulos_mesa
Revises: 0003_exclusao_recuperavel
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_modulos_mesa"
down_revision = "0003_exclusao_recuperavel"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "table_modules",
        sa.Column("mesa_id", sa.String(length=100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("modulo", sa.String(length=100), primary_key=True),
        sa.Column("ativo", sa.Boolean(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("table_modules")
