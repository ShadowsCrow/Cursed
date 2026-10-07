"""Uso de cartas na cena (cartas-na-cena, D1 e D4): registro dos usos, ações do turno e a preferência da mão.

- ``card_uses``: cada carta jogada na Sala, com a sessão, a disputa, a rodada, o personagem, a versão da carta, os
  alvos, o custo pago em PP e a ação gasta. ``id`` cresce na ordem dos usos e serve de cursor para o histórico.
- ``turn_participants``: Ação Padrão, Ação Bônus e Reação gastas na vez.
- ``room_preferences.mao_dos_jogadores_visivel``: o Narrador vê a mão dos personagens dos jogadores (ligado por
  padrão).

Revision ID: 0031_uso_de_cartas
Revises: 0030_token_proprio_no_turno
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0031_uso_de_cartas"
down_revision = "0030_token_proprio_no_turno"
branch_labels = None
depends_on = None

TABELAS_NOVAS = ("card_uses",)
ACOES_DO_TURNO = ("acao_padrao_gasta", "acao_bonus_gasta", "reacao_gasta")


def upgrade() -> None:
    op.create_table(
        "card_uses",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer(), "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False),
        sa.Column("autor_id", sa.String(100), nullable=False),
        sa.Column("personagem_id", sa.String(100), nullable=False),
        sa.Column("sessao_id", sa.String(100), sa.ForeignKey("table_sessions.id", ondelete="SET NULL")),
        sa.Column("combate_id", sa.String(100), sa.ForeignKey("turn_combats.id", ondelete="SET NULL")),
        sa.Column("rodada", sa.Integer()),
        sa.Column("versao_id", sa.String(100), nullable=False),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("custo_pago", sa.Integer(), nullable=False),
        sa.Column("custo_extra", sa.String(500)),
        sa.Column("acao", sa.String(20), nullable=False),
        sa.Column("alvos", sa.JSON(), nullable=False),
        sa.Column("desfeito_em", sa.DateTime(timezone=True)),
        sa.Column("desfeito_por", sa.String(100)),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("custo_pago >= 0", name="ck_card_uses_custo"),
        sa.CheckConstraint("acao IN ('padrao', 'bonus', 'reacao', 'nenhuma')", name="ck_card_uses_acao"),
    )
    op.create_index("ix_card_uses_mesa", "card_uses", ["mesa_id", "id"])
    op.create_index("ix_card_uses_mesa_sessao", "card_uses", ["mesa_id", "sessao_id"])
    with op.batch_alter_table("turn_participants") as tabela:
        for coluna in ACOES_DO_TURNO:
            tabela.add_column(sa.Column(coluna, sa.Boolean(), nullable=False, server_default=sa.false()))
    with op.batch_alter_table("room_preferences") as tabela:
        tabela.add_column(sa.Column("mao_dos_jogadores_visivel", sa.Boolean(), nullable=False, server_default=sa.true()))

    if op.get_bind().dialect.name == "postgresql":
        papeis = [p for p in ("anon", "authenticated") if op.get_bind().execute(
            sa.text("SELECT 1 FROM pg_roles WHERE rolname = :p"), {"p": p}).scalar()]
        for tabela in TABELAS_NOVAS:
            op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY")
            if papeis:
                op.execute(f"REVOKE ALL ON public.{tabela} FROM {', '.join(papeis)}")


def downgrade() -> None:
    with op.batch_alter_table("room_preferences") as tabela:
        tabela.drop_column("mao_dos_jogadores_visivel")
    with op.batch_alter_table("turn_participants") as tabela:
        for coluna in reversed(ACOES_DO_TURNO):
            tabela.drop_column(coluna)
    op.drop_index("ix_card_uses_mesa_sessao", table_name="card_uses")
    op.drop_index("ix_card_uses_mesa", table_name="card_uses")
    op.drop_table("card_uses")
