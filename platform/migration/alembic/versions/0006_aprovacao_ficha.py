"""Solicitações de alteração de ficha sujeitas ao Narrador.

Revision ID: 0006_aprovacao_ficha
Revises: 0005_convites_mesa
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_aprovacao_ficha"
down_revision = "0005_convites_mesa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "character_change_requests",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("mesa_id", sa.String(length=100), nullable=False),
        sa.Column("personagem_id", sa.String(length=100), nullable=False),
        sa.Column("solicitante_id", sa.String(length=100), nullable=False),
        sa.Column("versao_base", sa.Integer(), nullable=False),
        sa.Column("ficha_proposta", sa.JSON(), nullable=False),
        sa.Column("campos_alterados", sa.JSON(), nullable=False),
        sa.Column("estado", sa.String(length=20), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("decidido_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decidido_por", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(
            ["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
            name="fk_character_change_requests_character",
        ),
        sa.CheckConstraint(
            "estado IN ('pendente', 'aprovado', 'rejeitado')",
            name="ck_character_change_requests_estado",
        ),
    )
    op.create_index("ix_character_change_requests_mesa_id", "character_change_requests", ["mesa_id"])
    op.create_index("ix_character_change_requests_personagem_id", "character_change_requests", ["personagem_id"])


def downgrade() -> None:
    op.drop_index("ix_character_change_requests_personagem_id", table_name="character_change_requests")
    op.drop_index("ix_character_change_requests_mesa_id", table_name="character_change_requests")
    op.drop_table("character_change_requests")
