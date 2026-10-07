"""Ordem de entrada dos participantes do modo turno (cartas-na-cena, D9).

- ``turn_participants.ordem_de_entrada``: posição em que o participante entrou no modo turno (1, 2, 3…), dada por
  ``turno.entrar`` e ``turno.incluir``. É ela que numera os nomes repetidos ("Goblin 2", "Goblin 3") e ordena quem
  ainda não rolou, de forma estável; antes, isso seguia os ids aleatórios. Linhas antigas ficam com 0.

Revision ID: 0033_ordem_de_entrada_no_turno
Revises: 0032_instancias_de_personagem
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0033_ordem_de_entrada_no_turno"
down_revision = "0032_instancias_de_personagem"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("turn_participants") as tabela:
        tabela.add_column(sa.Column("ordem_de_entrada", sa.Integer(), nullable=False, server_default=sa.text("0")))


def downgrade() -> None:
    with op.batch_alter_table("turn_participants") as tabela:
        tabela.drop_column("ordem_de_entrada")
