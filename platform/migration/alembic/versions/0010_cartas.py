"""Catálogo versionado de cartas, posse, ofertas e apresentações.

Revision ID: 0010_cartas
Revises: 0009_revelacao
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

from cursed_platform.persistence import (
    AUDITORIA_IMUTAVEL_SQLITE, VERSOES_IMUTAVEIS_POSTGRES, VERSOES_IMUTAVEIS_SQLITE,
)


revision = "0010_cartas"
down_revision = "0009_revelacao"
branch_labels = None
depends_on = None

TIPOS = "tipo IN ('habilidade', 'magia', 'item', 'efeito')"
CATEGORIAS_ANTES = "categoria IN ('mesa', 'permissao', 'personagem', 'ficha', 'inventario', 'efeito')"
CATEGORIAS_DEPOIS = "categoria IN ('mesa', 'permissao', 'personagem', 'ficha', 'inventario', 'efeito', 'carta')"
TABELAS = (
    "card_presentations", "card_offer_choices", "card_offer_recipients", "card_offer_candidates",
    "card_offers", "character_cards", "card_versions", "card_definitions",
)


def _agora():
    return sa.DateTime(timezone=True)


def _categorias(condicao: str) -> None:
    dialeto = op.get_bind().dialect.name
    if dialeto == "postgresql":
        op.execute("ALTER TABLE audit_events DROP CONSTRAINT ck_audit_events_categoria")
        op.execute(f"ALTER TABLE audit_events ADD CONSTRAINT ck_audit_events_categoria CHECK ({condicao})")
    elif dialeto == "sqlite":
        with op.batch_alter_table("audit_events", recreate="always") as batch:
            batch.drop_constraint("ck_audit_events_categoria", type_="check")
            batch.create_check_constraint("ck_audit_events_categoria", condicao)
        # Recriar a tabela descarta os gatilhos de imutabilidade.
        for comando in AUDITORIA_IMUTAVEL_SQLITE:
            op.execute(comando)


def upgrade() -> None:
    op.create_table(
        "card_definitions",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("criado_por", sa.String(100), nullable=False),
        sa.Column("criado_em", _agora(), nullable=False, server_default=sa.func.now()),
        sa.Column("rascunho", sa.JSON(), nullable=True),
        sa.Column("versao_publicada", sa.Integer(), nullable=True),
        sa.Column("arquivada", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint(TIPOS, name="ck_card_definitions_tipo"),
        sa.CheckConstraint("versao >= 0", name="ck_card_definitions_versao"),
        sa.UniqueConstraint("mesa_id", "id", name="uq_card_definitions_mesa_id"),
    )
    op.create_index("ix_card_definitions_mesa_id", "card_definitions", ["mesa_id"])
    op.create_table(
        "card_versions",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), nullable=False),
        sa.Column("definicao_id", sa.String(100), nullable=False),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("conteudo", sa.JSON(), nullable=False),
        sa.Column("procedencia", sa.JSON(), nullable=False),
        sa.Column("revisao_pendente", sa.JSON(), nullable=False),
        sa.Column("publicado_por", sa.String(100), nullable=False),
        sa.Column("publicado_em", _agora(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(TIPOS, name="ck_card_versions_tipo"),
        sa.CheckConstraint("numero > 0", name="ck_card_versions_numero"),
        sa.UniqueConstraint("definicao_id", "numero", name="uq_card_versions_numero"),
        sa.UniqueConstraint("mesa_id", "id", name="uq_card_versions_mesa_id"),
        sa.ForeignKeyConstraint(["mesa_id", "definicao_id"], ["card_definitions.mesa_id", "card_definitions.id"],
                                name="fk_card_versions_definition"),
    )
    op.create_index("ix_card_versions_mesa_id", "card_versions", ["mesa_id"])
    op.create_index("ix_card_versions_definicao_id", "card_versions", ["definicao_id"])
    op.create_table(
        "character_cards",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), nullable=False),
        sa.Column("personagem_id", sa.String(100), nullable=False),
        sa.Column("definicao_id", sa.String(100), nullable=False),
        sa.Column("versao_id", sa.String(100), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("origem", sa.String(20), nullable=False),
        sa.Column("excecao_aprendizado", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("item_id", sa.String(100), nullable=True),
        sa.Column("efeito_id", sa.String(100), nullable=True),
        sa.Column("adquirida_em", _agora(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(TIPOS, name="ck_character_cards_tipo"),
        sa.CheckConstraint(
            "estado IN ('disponivel', 'em_aprendizado', 'aprendida', 'no_inventario', 'aplicada', 'removida')",
            name="ck_character_cards_estado",
        ),
        sa.CheckConstraint("origem IN ('concessao', 'oferta')", name="ck_character_cards_origem"),
        sa.ForeignKeyConstraint(["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
                                name="fk_character_cards_character"),
        sa.ForeignKeyConstraint(["mesa_id", "versao_id"], ["card_versions.mesa_id", "card_versions.id"],
                                name="fk_character_cards_version"),
    )
    for coluna in ("mesa_id", "personagem_id", "definicao_id"):
        op.create_index(f"ix_character_cards_{coluna}", "character_cards", [coluna])
    op.create_table(
        "card_offers",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("criado_por", sa.String(100), nullable=False),
        sa.Column("criado_em", _agora(), nullable=False, server_default=sa.func.now()),
        sa.Column("expira_em", _agora(), nullable=True),
        sa.Column("min_escolhas", sa.Integer(), nullable=False),
        sa.Column("max_escolhas", sa.Integer(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.CheckConstraint("estado IN ('aberta', 'encerrada', 'cancelada')", name="ck_card_offers_estado"),
        sa.CheckConstraint("min_escolhas >= 0 AND max_escolhas >= 1 AND min_escolhas <= max_escolhas",
                           name="ck_card_offers_limites"),
    )
    op.create_index("ix_card_offers_mesa_id", "card_offers", ["mesa_id"])
    op.create_table(
        "card_offer_candidates",
        sa.Column("oferta_id", sa.String(100), sa.ForeignKey("card_offers.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("versao_id", sa.String(100), sa.ForeignKey("card_versions.id"), primary_key=True),
        sa.Column("ordem", sa.Integer(), nullable=False),
    )
    op.create_table(
        "card_offer_recipients",
        sa.Column("oferta_id", sa.String(100), sa.ForeignKey("card_offers.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("personagem_id", sa.String(100), primary_key=True),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("respondido_em", _agora(), nullable=True),
        sa.Column("respondido_por", sa.String(100), nullable=True),
        sa.CheckConstraint("estado IN ('pendente', 'respondida', 'expirada', 'cancelada')",
                           name="ck_card_offer_recipients_estado"),
    )
    op.create_table(
        "card_offer_choices",
        sa.Column("oferta_id", sa.String(100), primary_key=True),
        sa.Column("personagem_id", sa.String(100), primary_key=True),
        sa.Column("versao_id", sa.String(100), primary_key=True),
        sa.ForeignKeyConstraint(["oferta_id", "versao_id"],
                                ["card_offer_candidates.oferta_id", "card_offer_candidates.versao_id"],
                                name="fk_card_offer_choices_candidate"),
        sa.ForeignKeyConstraint(["oferta_id", "personagem_id"],
                                ["card_offer_recipients.oferta_id", "card_offer_recipients.personagem_id"],
                                name="fk_card_offer_choices_recipient"),
    )
    op.create_table(
        "card_presentations",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("versao_id", sa.String(100), sa.ForeignKey("card_versions.id"), nullable=False),
        sa.Column("destinatarios", sa.JSON(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("apresentada_por", sa.String(100), nullable=False),
        sa.Column("apresentada_em", _agora(), nullable=False, server_default=sa.func.now()),
        sa.Column("recolhida_em", _agora(), nullable=True),
        sa.CheckConstraint("estado IN ('apresentada', 'recolhida')", name="ck_card_presentations_estado"),
    )
    op.create_index("ix_card_presentations_mesa_id", "card_presentations", ["mesa_id"])

    dialeto = op.get_bind().dialect.name
    for comando in {"sqlite": VERSOES_IMUTAVEIS_SQLITE, "postgresql": VERSOES_IMUTAVEIS_POSTGRES}.get(dialeto, ()):
        op.execute(comando)
    if dialeto == "postgresql":
        papeis = list(op.get_bind().exec_driver_sql(
            "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname"
        ).scalars())
        for tabela in TABELAS:
            op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY")
            if papeis:
                op.execute(f"REVOKE ALL ON public.{tabela} FROM {', '.join(papeis)}")
    _categorias(CATEGORIAS_DEPOIS)


def downgrade() -> None:
    _categorias(CATEGORIAS_ANTES)
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS card_versions_no_change ON card_versions")
        op.execute("DROP FUNCTION IF EXISTS card_versions_imutavel()")
    for tabela in TABELAS:
        op.drop_table(tabela)
