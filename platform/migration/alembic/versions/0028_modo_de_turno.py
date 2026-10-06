"""Modo turno da Sala (modo-de-turno): combate, participantes e a finalidade das rolagens.

- ``turn_combats``: um modo turno por linha, com a fase (iniciativa, combate ou encerrado), a rodada e a vez; no
  máximo um não encerrado por mesa.
- ``turn_participants``: cada personagem com token na cena ativa, com a rolagem de iniciativa, o total, Raciocínio e
  Prontidão usados no desempate e os d20 de desempate. A ordem é calculada a partir deles.
- ``dice_rolls.finalidade``: marca a rolagem de iniciativa no histórico.

Revision ID: 0028_modo_de_turno
Revises: 0027_gamificacao_da_sala
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0028_modo_de_turno"
down_revision = "0027_gamificacao_da_sala"
branch_labels = None
depends_on = None

TABELAS_NOVAS = ("turn_combats", "turn_participants")


def upgrade() -> None:
    op.create_table(
        "turn_combats",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sessao_id", sa.String(100), sa.ForeignKey("table_sessions.id", ondelete="SET NULL")),
        sa.Column("cena_id", sa.String(100), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("rodada", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("vez_participante_id", sa.String(100)),
        sa.Column("aberto_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("aberto_por", sa.String(100), nullable=False),
        sa.Column("encerrado_em", sa.DateTime(timezone=True)),
        sa.CheckConstraint("estado IN ('iniciativa', 'combate', 'encerrado')", name="ck_turn_combats_estado"),
        sa.CheckConstraint("rodada >= 0", name="ck_turn_combats_rodada"),
    )
    op.create_index("uq_turn_combats_um_aberto", "turn_combats", ["mesa_id"], unique=True,
                    sqlite_where=sa.text("estado <> 'encerrado'"), postgresql_where=sa.text("estado <> 'encerrado'"))
    op.create_table(
        "turn_participants",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("combate_id", sa.String(100), sa.ForeignKey("turn_combats.id", ondelete="CASCADE"), nullable=False),
        sa.Column("personagem_id", sa.String(100), nullable=False),
        sa.Column("rolagem_id", sa.BigInteger().with_variant(sa.Integer(), "sqlite"),
                  sa.ForeignKey("dice_rolls.id", ondelete="SET NULL")),
        sa.Column("total", sa.Integer()),
        sa.Column("raciocinio", sa.Integer()),
        sa.Column("prontidao", sa.Integer()),
        sa.Column("desempate", sa.JSON(), nullable=False),
        sa.UniqueConstraint("combate_id", "personagem_id", name="uq_turn_participants_personagem"),
    )
    with op.batch_alter_table("dice_rolls") as tabela:
        tabela.add_column(sa.Column("finalidade", sa.String(20)))
        tabela.create_check_constraint("ck_dice_rolls_finalidade", "finalidade IS NULL OR finalidade IN ('iniciativa')")

    if op.get_bind().dialect.name == "postgresql":
        papeis = [p for p in ("anon", "authenticated") if op.get_bind().execute(
            sa.text("SELECT 1 FROM pg_roles WHERE rolname = :p"), {"p": p}).scalar()]
        for tabela in TABELAS_NOVAS:
            op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY")
            if papeis:
                op.execute(f"REVOKE ALL ON public.{tabela} FROM {', '.join(papeis)}")


def downgrade() -> None:
    with op.batch_alter_table("dice_rolls") as tabela:
        tabela.drop_constraint("ck_dice_rolls_finalidade", type_="check")
        tabela.drop_column("finalidade")
    op.drop_table("turn_participants")
    op.drop_index("uq_turn_combats_um_aberto", table_name="turn_combats")
    op.drop_table("turn_combats")
