"""Retenção configurável e tombstone de personagem.

Revision ID: 0003_exclusao_recuperavel
Revises: 0002_inventario_efeitos
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_exclusao_recuperavel"
down_revision = "0002_inventario_efeitos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rpg_tables",
        sa.Column("retencao_personagens_dias", sa.Integer(), nullable=False, server_default="30"),
    )
    op.add_column("characters", sa.Column("excluido_em", sa.DateTime(timezone=True), nullable=True))
    op.add_column("characters", sa.Column("excluido_por", sa.String(length=100), nullable=True))
    op.create_index("ix_characters_excluido_em", "characters", ["excluido_em"])


def downgrade() -> None:
    op.drop_index("ix_characters_excluido_em", table_name="characters")
    op.drop_column("characters", "excluido_por")
    op.drop_column("characters", "excluido_em")
    op.drop_column("rpg_tables", "retencao_personagens_dias")
