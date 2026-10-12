"""Deslocamento no modo turno (modo-de-turno, D8): saldo de movimento gasto na vez e se o participante está correndo.

Revision ID: 0029_deslocamento_no_turno
Revises: 0028_modo_de_turno
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0029_deslocamento_no_turno"
down_revision = "0028_modo_de_turno"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("turn_participants") as tabela:
        tabela.add_column(sa.Column("movimento_gasto", sa.Integer(), nullable=False, server_default=sa.text("0")))
        tabela.add_column(sa.Column("correndo", sa.Boolean(), nullable=False, server_default=sa.false()))
        tabela.create_check_constraint("ck_turn_participants_movimento", "movimento_gasto >= 0")


def downgrade() -> None:
    with op.batch_alter_table("turn_participants") as tabela:
        tabela.drop_constraint("ck_turn_participants_movimento", type_="check")
        tabela.drop_column("correndo")
        tabela.drop_column("movimento_gasto")
