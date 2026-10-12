"""Convites de entrada de uso único e validade limitada.

Revision ID: 0005_convites_mesa
Revises: 0004_modulos_mesa
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_convites_mesa"
down_revision = "0004_modulos_mesa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "table_invitations",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("mesa_id", sa.String(length=100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False, unique=True),
        sa.Column("criado_por", sa.String(length=100), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("usado_por", sa.String(length=100), nullable=True),
    )
    op.create_index("ix_table_invitations_mesa_id", "table_invitations", ["mesa_id"])


def downgrade() -> None:
    op.drop_index("ix_table_invitations_mesa_id", table_name="table_invitations")
    op.drop_table("table_invitations")
