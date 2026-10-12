"""Sala: cenas, camadas e tokens do grid.

Revision ID: 0012_sala
Revises: 0011_perfis
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0012_sala"
down_revision = "0011_perfis"
branch_labels = None
depends_on = None

TABELAS = ("scene_tokens", "scene_layers", "scenes")


def upgrade() -> None:
    op.create_table(
        "scenes",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("colunas", sa.Integer(), nullable=False),
        sa.Column("linhas", sa.Integer(), nullable=False),
        sa.Column("ativa", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("colunas BETWEEN 1 AND 200 AND linhas BETWEEN 1 AND 200", name="ck_scenes_grade"),
        sa.CheckConstraint("versao >= 0", name="ck_scenes_versao"),
        sa.UniqueConstraint("mesa_id", "id", name="uq_scenes_mesa_id"),
    )
    op.create_index("ix_scenes_mesa_id", "scenes", ["mesa_id"])
    op.create_table(
        "scene_layers",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), nullable=False),
        sa.Column("cena_id", sa.String(100), nullable=False),
        sa.Column("nome", sa.String(100), nullable=False),
        sa.Column("visibilidade", sa.String(20), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.CheckConstraint("visibilidade IN ('mesa', 'narrador')", name="ck_scene_layers_visibilidade"),
        sa.UniqueConstraint("mesa_id", "id", name="uq_scene_layers_mesa_id"),
        sa.ForeignKeyConstraint(["mesa_id", "cena_id"], ["scenes.mesa_id", "scenes.id"], name="fk_scene_layers_scene"),
    )
    op.create_index("ix_scene_layers_mesa_id", "scene_layers", ["mesa_id"])
    op.create_index("ix_scene_layers_cena_id", "scene_layers", ["cena_id"])
    op.create_table(
        "scene_tokens",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), nullable=False),
        sa.Column("cena_id", sa.String(100), nullable=False),
        sa.Column("camada_id", sa.String(100), nullable=False),
        sa.Column("personagem_id", sa.String(100), nullable=True),
        sa.Column("rotulo", sa.String(100), nullable=False),
        sa.Column("x", sa.Integer(), nullable=False),
        sa.Column("y", sa.Integer(), nullable=False),
        sa.Column("tamanho", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("oculto", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("controladores", sa.JSON(), nullable=False),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint("x >= 0 AND y >= 0", name="ck_scene_tokens_posicao"),
        sa.CheckConstraint("tamanho BETWEEN 1 AND 10", name="ck_scene_tokens_tamanho"),
        sa.CheckConstraint("versao >= 0", name="ck_scene_tokens_versao"),
        sa.ForeignKeyConstraint(["mesa_id", "cena_id"], ["scenes.mesa_id", "scenes.id"], name="fk_scene_tokens_scene"),
        sa.ForeignKeyConstraint(["mesa_id", "camada_id"], ["scene_layers.mesa_id", "scene_layers.id"],
                                name="fk_scene_tokens_layer"),
        sa.ForeignKeyConstraint(["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
                                name="fk_scene_tokens_character"),
    )
    op.create_index("ix_scene_tokens_mesa_id", "scene_tokens", ["mesa_id"])
    op.create_index("ix_scene_tokens_cena_id", "scene_tokens", ["cena_id"])
    if op.get_bind().dialect.name == "postgresql":
        papeis = list(op.get_bind().exec_driver_sql(
            "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname"
        ).scalars())
        for tabela in TABELAS:
            op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY")
            if papeis:
                op.execute(f"REVOKE ALL ON public.{tabela} FROM {', '.join(papeis)}")


def downgrade() -> None:
    for tabela in TABELAS:
        op.drop_table(tabela)
