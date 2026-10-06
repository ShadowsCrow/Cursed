"""Gamificação da Sala (gamificacao-da-sala): preferências da Sala, votação de MVP, sessão e marcas nas rolagens.

- ``room_preferences``: uma linha por mesa com o destaque de críticos e o placar visível, escolhidos pelo Narrador.
- ``mvp_rounds`` e ``mvp_votes``: votações de MVP e os votos secretos; no máximo uma votação não encerrada por mesa.
- ``dice_rolls.sessao_id``: a sessão em andamento quando a rolagem foi sorteada.
- ``dice_rolls.marcas``: crítico e falha crítica de cada d20, gravados no sorteio pela faixa do personagem.

Revision ID: 0027_gamificacao_da_sala
Revises: 0026_musica_da_sala
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0027_gamificacao_da_sala"
down_revision = "0026_musica_da_sala"
branch_labels = None
depends_on = None

TABELAS_NOVAS = ("room_preferences", "mvp_rounds", "mvp_votes")


def upgrade() -> None:
    op.create_table(
        "room_preferences",
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("destaque_criticos", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("estatisticas_visiveis", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("alterada_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("alterada_por", sa.String(100), nullable=False),
    )
    op.create_table(
        "mvp_rounds",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sessao_id", sa.String(100), sa.ForeignKey("table_sessions.id", ondelete="SET NULL")),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("aberta_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("aberta_por", sa.String(100), nullable=False),
        sa.Column("encerrada_em", sa.DateTime(timezone=True)),
        sa.Column("vencedor_id", sa.String(100)),
        sa.Column("votos_do_vencedor", sa.Integer()),
        sa.Column("empatados", sa.JSON()),
        sa.CheckConstraint("estado IN ('aberta', 'desempate', 'encerrada')", name="ck_mvp_rounds_estado"),
    )
    op.create_index("ix_mvp_rounds_mesa", "mvp_rounds", ["mesa_id", "aberta_em"])
    op.create_index("uq_mvp_rounds_uma_aberta", "mvp_rounds", ["mesa_id"], unique=True,
                    sqlite_where=sa.text("estado <> 'encerrada'"), postgresql_where=sa.text("estado <> 'encerrada'"))
    op.create_table(
        "mvp_votes",
        sa.Column("votacao_id", sa.String(100), sa.ForeignKey("mvp_rounds.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("eleitor_id", sa.String(100), primary_key=True),
        sa.Column("candidato_id", sa.String(100), nullable=False),
        sa.Column("votado_em", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("eleitor_id <> candidato_id", name="ck_mvp_votes_nao_em_si"),
    )
    with op.batch_alter_table("dice_rolls") as tabela:
        tabela.add_column(sa.Column("sessao_id", sa.String(100)))
        tabela.add_column(sa.Column("marcas", sa.JSON()))
        tabela.create_foreign_key("fk_dice_rolls_sessao", "table_sessions", ["sessao_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_dice_rolls_mesa_sessao", "dice_rolls", ["mesa_id", "sessao_id"])

    if op.get_bind().dialect.name == "postgresql":
        papeis = [p for p in ("anon", "authenticated") if op.get_bind().execute(
            sa.text("SELECT 1 FROM pg_roles WHERE rolname = :p"), {"p": p}).scalar()]
        for tabela in TABELAS_NOVAS:
            op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY")
            if papeis:
                op.execute(f"REVOKE ALL ON public.{tabela} FROM {', '.join(papeis)}")


def downgrade() -> None:
    op.drop_index("ix_dice_rolls_mesa_sessao", table_name="dice_rolls")
    with op.batch_alter_table("dice_rolls") as tabela:
        tabela.drop_constraint("fk_dice_rolls_sessao", type_="foreignkey")
        tabela.drop_column("marcas")
        tabela.drop_column("sessao_id")
    op.drop_table("mvp_votes")
    op.drop_index("uq_mvp_rounds_uma_aberta", table_name="mvp_rounds")
    op.drop_index("ix_mvp_rounds_mesa", table_name="mvp_rounds")
    op.drop_table("mvp_rounds")
    op.drop_table("room_preferences")
