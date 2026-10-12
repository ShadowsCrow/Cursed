"""Permissão de movimento dos tokens (experiencia-da-mesa, item 13).

O Narrador libera ou bloqueia o movimento de cada token pelos jogadores. Bloqueado, só o Narrador move; liberado,
o dono do personagem ligado ou os controladores escolhidos. Os tokens existentes ficam liberados, que é como se
comportavam antes desta migração.

Revision ID: 0024_movimento_dos_tokens
Revises: 0023_cena_sem_bordas
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0024_movimento_dos_tokens"
down_revision = "0023_cena_sem_bordas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scene_tokens", sa.Column("movimento_liberado", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    with op.batch_alter_table("scene_tokens") as tabela:
        tabela.drop_column("movimento_liberado")
