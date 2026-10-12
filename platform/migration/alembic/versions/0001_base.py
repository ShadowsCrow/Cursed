"""Estruturas iniciais de mesa, participação e ficha.

Revision ID: 0001_base
Revises:
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_base"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rpg_tables",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("nome", sa.String(length=200), nullable=False),
        sa.Column("narrador_id", sa.String(length=100), nullable=False),
        sa.Column("permitir_edicao_propria", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("permitir_criacao_propria", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("permitir_exclusao_propria", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("campos_bloqueados", sa.JSON(), nullable=False),
        sa.Column("campos_exigem_aprovacao", sa.JSON(), nullable=False),
    )
    op.create_table(
        "table_memberships",
        sa.Column("mesa_id", sa.String(length=100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("usuario_id", sa.String(length=100), primary_key=True),
        sa.Column("papel", sa.String(length=20), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint("papel IN ('narrador', 'jogador')", name="ck_table_memberships_papel"),
    )
    op.create_table(
        "characters",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("mesa_id", sa.String(length=100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False),
        sa.Column("proprietario_id", sa.String(length=100), nullable=True),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("visibilidade", sa.String(length=20), nullable=False),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ficha", sa.JSON(), nullable=False),
        sa.CheckConstraint("versao >= 0", name="ck_characters_versao"),
        sa.CheckConstraint("tipo IN ('personagem', 'npc', 'monstro')", name="ck_characters_tipo"),
        sa.CheckConstraint("visibilidade IN ('mesa', 'narrador')", name="ck_characters_visibilidade"),
        sa.UniqueConstraint("mesa_id", "id", name="uq_characters_mesa_id"),
        sa.ForeignKeyConstraint(
            ["mesa_id", "proprietario_id"],
            ["table_memberships.mesa_id", "table_memberships.usuario_id"],
            name="fk_characters_owner_membership",
        ),
    )
    op.create_index("ix_characters_mesa_id", "characters", ["mesa_id"])
    op.create_table(
        "table_sessions",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("mesa_id", sa.String(length=100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("iniciada_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("encerrada_em", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("mesa_id", "numero", name="uq_table_sessions_mesa_numero"),
        sa.CheckConstraint("numero > 0", name="ck_table_sessions_numero"),
        sa.CheckConstraint("encerrada_em IS NULL OR encerrada_em >= iniciada_em", name="ck_table_sessions_periodo"),
    )
    op.create_index("ix_table_sessions_mesa_id", "table_sessions", ["mesa_id"])


def downgrade() -> None:
    op.drop_index("ix_table_sessions_mesa_id", table_name="table_sessions")
    op.drop_table("table_sessions")
    op.drop_index("ix_characters_mesa_id", table_name="characters")
    op.drop_table("characters")
    op.drop_table("table_memberships")
    op.drop_table("rpg_tables")
