"""Instâncias de personagem (instancias-de-personagem, D1): a ficha de NPC ou monstro é o modelo, e cada "Colocar"
cria uma instância independente que guarda de qual modelo veio.

- ``characters.instancia_de``: id do modelo; nulo em modelos, personagens de jogador e fichas promovidas. Apagar o
  modelo anula o vínculo (a lixeira não apaga linhas, então na prática ele sobrevive à exclusão recuperável).

Revision ID: 0032_instancias_de_personagem
Revises: 0031_uso_de_cartas
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0032_instancias_de_personagem"
down_revision = "0031_uso_de_cartas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("characters") as tabela:
        tabela.add_column(sa.Column("instancia_de", sa.String(length=100), nullable=True))
        tabela.create_foreign_key("fk_characters_instancia_de", "characters", ["instancia_de"], ["id"], ondelete="SET NULL")
    op.create_index("ix_characters_instancia_de", "characters", ["instancia_de"])


def downgrade() -> None:
    op.drop_index("ix_characters_instancia_de", table_name="characters")
    with op.batch_alter_table("characters") as tabela:
        tabela.drop_constraint("fk_characters_instancia_de", type_="foreignkey")
        tabela.drop_column("instancia_de")
