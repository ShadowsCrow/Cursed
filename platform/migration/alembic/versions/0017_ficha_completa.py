"""Ficha completa: cartas de catálogo do sistema e ícones de efeitos por mesa.

Mudança OpenSpec `calcular-valores-da-ficha` (design D5 e D8). `card_definitions.origem_sistema`
identifica a carta materializada de uma habilidade do catálogo (ex.: `classes/Druida/habilidades/
Forma Selvagem`), única por mesa; `character_cards.concedida_por` marca a posse concedida por uma
escolha de classe, arquétipo ou raça (ex.: `classe:Druida`), para removê-la numa troca sem tocar nas
cartas obtidas por oferta. `effect_icons` guarda o ícone que o Narrador enviou para um efeito default,
só na mesa dele.

As colunas entram com ADD COLUMN nativo: `card_definitions` e `character_cards` são referenciadas por
outras tabelas, e recriá-las no SQLite com as chaves estrangeiras ativas falha.

Revision ID: 0017_ficha_completa
Revises: 0016_carga_em_grade
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0017_ficha_completa"
down_revision = "0016_carga_em_grade"
branch_labels = None
depends_on = None

TABELAS_NOVAS = ("effect_icons",)


def upgrade() -> None:
    op.add_column("card_definitions", sa.Column("origem_sistema", sa.String(200)))
    op.create_index(
        "uq_card_definitions_origem_sistema", "card_definitions", ["mesa_id", "origem_sistema"], unique=True
    )
    op.add_column("character_cards", sa.Column("concedida_por", sa.String(200)))

    op.create_table(
        "effect_icons",
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("associacao", sa.String(100), primary_key=True),
        sa.Column("objeto", sa.String(500), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
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
    op.drop_index("uq_card_definitions_origem_sistema", table_name="card_definitions")
    # DROP COLUMN nativo (SQLite >= 3.35 e PostgreSQL): as colunas não têm restrições.
    op.execute("ALTER TABLE character_cards DROP COLUMN concedida_por")
    op.execute("ALTER TABLE card_definitions DROP COLUMN origem_sistema")
