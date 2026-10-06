"""Token próprio no modo turno (modo-de-turno, D8d): um token posto com o modo turno aberto, de uma ficha que já
participa, vira participante sozinho, com iniciativa e vez próprias.

Revision ID: 0030_token_proprio_no_turno
Revises: 0029_deslocamento_no_turno
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0030_token_proprio_no_turno"
down_revision = "0029_deslocamento_no_turno"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("turn_participants") as tabela:
        tabela.add_column(sa.Column("token_id", sa.String(length=100), nullable=True))
        tabela.drop_constraint("uq_turn_participants_personagem", type_="unique")
        tabela.create_unique_constraint("uq_turn_participants_token", ["combate_id", "token_id"])


def downgrade() -> None:
    # Os participantes de token próprio não cabem na restrição antiga (um por ficha): saem antes.
    op.execute("DELETE FROM turn_participants WHERE token_id IS NOT NULL")
    with op.batch_alter_table("turn_participants") as tabela:
        tabela.drop_constraint("uq_turn_participants_token", type_="unique")
        tabela.create_unique_constraint("uq_turn_participants_personagem", ["combate_id", "personagem_id"])
        tabela.drop_column("token_id")
