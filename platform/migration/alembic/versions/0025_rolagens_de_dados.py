"""Rolagens de dados da Sala sorteadas pelo servidor (melhorias-da-sala, item 3).

Cada rolagem fica guardada com quem rolou, a expressão, os valores de cada dado, o modificador, o total e se é
uma rolagem oculta do Narrador (só ele a vê). Na rolagem pela ficha, guarda também o personagem e as parcelas
somadas da ficha (Atributo e Perícia, com o total calculado pelo servidor).
O `id` numérico cresce na ordem das rolagens e serve de cursor para os clientes buscarem as novas.

Revision ID: 0025_rolagens_de_dados
Revises: 0024_movimento_dos_tokens
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0025_rolagens_de_dados"
down_revision = "0024_movimento_dos_tokens"
branch_labels = None
depends_on = None

TABELAS_NOVAS = ("dice_rolls",)


def upgrade() -> None:
    op.create_table(
        "dice_rolls",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer(), "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("autor_id", sa.String(100), nullable=False),
        sa.Column("expressao", sa.String(200), nullable=False),
        sa.Column("grupos", sa.JSON(), nullable=False),
        sa.Column("modificador", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("oculta", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("personagem_id", sa.String(100)),
        sa.Column("termos", sa.JSON()),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("modificador BETWEEN -99 AND 99", name="ck_dice_rolls_modificador"),
    )
    op.create_index("ix_dice_rolls_mesa_id", "dice_rolls", ["mesa_id"])

    if op.get_bind().dialect.name == "postgresql":
        papeis = [p for p in ("anon", "authenticated") if op.get_bind().execute(
            sa.text("SELECT 1 FROM pg_roles WHERE rolname = :p"), {"p": p}).scalar()]
        for tabela in TABELAS_NOVAS:
            op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY")
            if papeis:
                op.execute(f"REVOKE ALL ON public.{tabela} FROM {', '.join(papeis)}")


def downgrade() -> None:
    op.drop_index("ix_dice_rolls_mesa_id", table_name="dice_rolls")
    for tabela in TABELAS_NOVAS:
        op.drop_table(tabela)
