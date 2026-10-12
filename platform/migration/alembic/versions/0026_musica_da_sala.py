"""Música e som ambiente da mesa na Sala (musica-da-sala).

Uma linha por camada (ambiente e música) de cada mesa com o que a mesa está ouvindo, escolhido pelo Narrador: a
faixa da biblioteca (ou nenhuma), se está tocando, a posição no momento da última mudança, o momento dessa mudança
(relógio do servidor), se repete e quem mudou. Os navegadores calculam a posição esperada a partir daí.

Revision ID: 0026_musica_da_sala
Revises: 0025_rolagens_de_dados
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0026_musica_da_sala"
down_revision = "0025_rolagens_de_dados"
branch_labels = None
depends_on = None

TABELAS_NOVAS = ("room_music",)


def upgrade() -> None:
    op.create_table(
        "room_music",
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("camada", sa.String(20), primary_key=True),
        sa.Column("faixa_id", sa.String(100)),
        sa.Column("tocando", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("posicao_ms", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("repetir", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("alterada_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("alterada_por", sa.String(100), nullable=False),
        sa.CheckConstraint("posicao_ms >= 0", name="ck_room_music_posicao"),
        sa.CheckConstraint("camada IN ('ambiente', 'musica')", name="ck_room_music_camada"),
    )

    if op.get_bind().dialect.name == "postgresql":
        papeis = [p for p in ("anon", "authenticated") if op.get_bind().execute(
            sa.text("SELECT 1 FROM pg_roles WHERE rolname = :p"), {"p": p}).scalar()]
        for tabela in TABELAS_NOVAS:
            op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY")
            if papeis:
                op.execute(f"REVOKE ALL ON public.{tabela} FROM {', '.join(papeis)}")


def downgrade() -> None:
    for tabela in TABELAS_NOVAS:
        op.drop_table(tabela)
