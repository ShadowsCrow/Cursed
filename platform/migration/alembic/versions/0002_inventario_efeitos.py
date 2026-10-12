"""Inventário, efeitos aplicados, operações e fontes vinculadas.

Revision ID: 0002_inventario_efeitos
Revises: 0001_base
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_inventario_efeitos"
down_revision = "0001_base"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inventory_items",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("mesa_id", sa.String(length=100), nullable=False),
        sa.Column("personagem_id", sa.String(length=100), nullable=False),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("nome", sa.String(length=200), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column("equipado", sa.Boolean(), nullable=False),
        sa.Column("cargas_atuais", sa.Integer(), nullable=True),
        sa.Column("cargas_maximas", sa.Integer(), nullable=True),
        sa.Column("dados", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(
            ["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
            name="fk_inventory_items_character",
        ),
        sa.UniqueConstraint("mesa_id", "personagem_id", "id", name="uq_inventory_items_owner_id"),
        sa.CheckConstraint("tipo IN ('arma', 'armadura', 'outro')", name="ck_inventory_items_tipo"),
        sa.CheckConstraint("quantidade > 0", name="ck_inventory_items_quantidade"),
        sa.CheckConstraint("cargas_atuais IS NULL OR cargas_atuais >= 0", name="ck_inventory_items_cargas_atuais"),
        sa.CheckConstraint("cargas_maximas IS NULL OR cargas_maximas >= 0", name="ck_inventory_items_cargas_maximas"),
        sa.CheckConstraint(
            "cargas_atuais IS NULL OR cargas_maximas IS NULL OR cargas_atuais <= cargas_maximas",
            name="ck_inventory_items_limite_cargas",
        ),
    )
    op.create_index("ix_inventory_items_mesa_id", "inventory_items", ["mesa_id"])
    op.create_index("ix_inventory_items_personagem_id", "inventory_items", ["personagem_id"])

    op.create_table(
        "character_effects",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("mesa_id", sa.String(length=100), nullable=False),
        sa.Column("personagem_id", sa.String(length=100), nullable=False),
        sa.Column("associacao", sa.String(length=200), nullable=True),
        sa.Column("nome", sa.String(length=200), nullable=False),
        sa.Column("descricao", sa.String(length=10_000), nullable=False),
        sa.Column("versao", sa.Integer(), nullable=False),
        sa.Column("estado", sa.String(length=20), nullable=False),
        sa.Column("duracao_rodadas", sa.Integer(), nullable=True),
        sa.Column("iniciado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("encerrado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("conteudo", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(
            ["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
            name="fk_character_effects_character",
        ),
        sa.UniqueConstraint("mesa_id", "personagem_id", "id", name="uq_character_effects_owner_id"),
        sa.CheckConstraint("estado IN ('ativo', 'suspenso', 'encerrado')", name="ck_character_effects_estado"),
        sa.CheckConstraint("versao > 0", name="ck_character_effects_versao"),
        sa.CheckConstraint("duracao_rodadas IS NULL OR duracao_rodadas > 0", name="ck_character_effects_duracao"),
    )
    op.create_index("ix_character_effects_mesa_id", "character_effects", ["mesa_id"])
    op.create_index("ix_character_effects_personagem_id", "character_effects", ["personagem_id"])

    op.create_table(
        "effect_operations",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("efeito_id", sa.String(length=100), sa.ForeignKey("character_effects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("alvo", sa.String(length=200), nullable=False),
        sa.Column("valor", sa.Numeric(12, 4), nullable=True),
        sa.Column("contexto", sa.String(length=200), nullable=True),
        sa.Column("modo", sa.String(length=100), nullable=True),
        sa.Column("recurso", sa.String(length=100), nullable=True),
        sa.Column("evento", sa.String(length=100), nullable=True),
        sa.CheckConstraint(
            "tipo IN ('modificador', 'restricao', 'falha_automatica', 'alteracao_recurso', 'consumir_aplicacao')",
            name="ck_effect_operations_tipo",
        ),
    )
    op.create_index("ix_effect_operations_efeito_id", "effect_operations", ["efeito_id"])

    op.create_table(
        "effect_sources",
        sa.Column("id", sa.String(length=100), primary_key=True),
        sa.Column("mesa_id", sa.String(length=100), nullable=False),
        sa.Column("personagem_id", sa.String(length=100), nullable=False),
        sa.Column("efeito_id", sa.String(length=100), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("equipamento_id", sa.String(length=100), nullable=True),
        sa.Column("referencia_id", sa.String(length=100), nullable=True),
        sa.Column("descricao", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(
            ["mesa_id", "personagem_id", "efeito_id"],
            ["character_effects.mesa_id", "character_effects.personagem_id", "character_effects.id"],
            name="fk_effect_sources_effect",
        ),
        sa.ForeignKeyConstraint(
            ["mesa_id", "personagem_id", "equipamento_id"],
            ["inventory_items.mesa_id", "inventory_items.personagem_id", "inventory_items.id"],
            name="fk_effect_sources_equipment",
        ),
        sa.CheckConstraint(
            "tipo IN ('equipamento', 'narrador', 'condicao', 'consequencia', 'importacao', 'catalogo')",
            name="ck_effect_sources_tipo",
        ),
        sa.CheckConstraint(
            "(tipo = 'equipamento' AND equipamento_id IS NOT NULL) OR "
            "(tipo <> 'equipamento' AND equipamento_id IS NULL)",
            name="ck_effect_sources_equipment_required",
        ),
    )
    op.create_index("ix_effect_sources_mesa_id", "effect_sources", ["mesa_id"])
    op.create_index("ix_effect_sources_personagem_id", "effect_sources", ["personagem_id"])
    op.create_index("ix_effect_sources_efeito_id", "effect_sources", ["efeito_id"])


def downgrade() -> None:
    op.drop_index("ix_effect_sources_efeito_id", table_name="effect_sources")
    op.drop_index("ix_effect_sources_personagem_id", table_name="effect_sources")
    op.drop_index("ix_effect_sources_mesa_id", table_name="effect_sources")
    op.drop_table("effect_sources")
    op.drop_index("ix_effect_operations_efeito_id", table_name="effect_operations")
    op.drop_table("effect_operations")
    op.drop_index("ix_character_effects_personagem_id", table_name="character_effects")
    op.drop_index("ix_character_effects_mesa_id", table_name="character_effects")
    op.drop_table("character_effects")
    op.drop_index("ix_inventory_items_personagem_id", table_name="inventory_items")
    op.drop_index("ix_inventory_items_mesa_id", table_name="inventory_items")
    op.drop_table("inventory_items")
