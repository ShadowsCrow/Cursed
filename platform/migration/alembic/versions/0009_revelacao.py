"""Revelação granular de entidades.

Revision ID: 0009_revelacao
Revises: 0008_auditoria
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0009_revelacao"
down_revision = "0008_auditoria"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("characters") as batch:
        batch.add_column(sa.Column("revelacao", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade() -> None:
    with op.batch_alter_table("characters") as batch:
        batch.drop_column("revelacao")
