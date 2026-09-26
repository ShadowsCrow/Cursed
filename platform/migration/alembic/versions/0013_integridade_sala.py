"""Garante camada da própria cena e uma única cena ativa por mesa.

Revision ID: 0013_integridade_sala
Revises: 0012_sala
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0013_integridade_sala"
down_revision = "0012_sala"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scenes", sa.Column("mapa_objeto", sa.String(500), nullable=True))
    with op.batch_alter_table("scene_layers") as tabela:
        tabela.create_unique_constraint("uq_scene_layers_mesa_cena_id", ["mesa_id", "cena_id", "id"])
    with op.batch_alter_table("scene_tokens") as tabela:
        tabela.create_foreign_key(
            "fk_scene_tokens_layer_scene", "scene_layers",
            ["mesa_id", "cena_id", "camada_id"], ["mesa_id", "cena_id", "id"],
        )
    op.create_index(
        "uq_scenes_ativa_mesa", "scenes", ["mesa_id"], unique=True,
        postgresql_where=sa.text("ativa"), sqlite_where=sa.text("ativa"),
    )


def downgrade() -> None:
    op.drop_index("uq_scenes_ativa_mesa", table_name="scenes")
    with op.batch_alter_table("scene_tokens") as tabela:
        tabela.drop_constraint("fk_scene_tokens_layer_scene", type_="foreignkey")
    with op.batch_alter_table("scene_layers") as tabela:
        tabela.drop_constraint("uq_scene_layers_mesa_cena_id", type_="unique")
    op.drop_column("scenes", "mapa_objeto")
