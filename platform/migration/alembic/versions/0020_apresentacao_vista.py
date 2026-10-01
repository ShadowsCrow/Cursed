"""Apresentação de carta vista uma vez por participante.

Correção pedida pelo usuário em 2026-09-28: fechar a carta apresentada só a escondia na página, e ela
voltava a cada recarga até o Narrador recolher. `card_presentations.vistas` guarda quem já viu e
fechou; para essas pessoas a carta não é mais apresentada. Coluna nova com padrão vazio: nenhum dado
existente muda (apresentações ainda ativas aparecem mais uma vez e, fechadas, não voltam).

Revision ID: 0020_apresentacao_vista
Revises: 0019_moedas_raridade_categoria
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0020_apresentacao_vista"
down_revision = "0019_moedas_raridade_categoria"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("card_presentations", sa.Column("vistas", sa.JSON(), nullable=False, server_default="[]"))


def downgrade() -> None:
    # DROP COLUMN nativo (SQLite >= 3.35 e PostgreSQL): a coluna não tem restrições.
    op.execute("ALTER TABLE card_presentations DROP COLUMN vistas")
