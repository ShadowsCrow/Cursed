"""Carga em grade: dimensões e posição dos itens, moedas por pilha, chão/baú e trocas.

Mudança OpenSpec `carga-por-espacos`. Os itens continuam pertencendo sempre a um personagem
(os efeitos vinculados usam a chave mesa + personagem + item); item largado ou oferecido vira
um retrato em `scene_stash_items` e é recriado em quem o pega (design D8).

`inventory_items` e `rpg_tables` são referenciadas por outras tabelas; no SQLite, recriá-las com as
chaves estrangeiras ativas falha. Por isso as colunas novas entram com ADD COLUMN nativo e as
restrições de grade só são criadas no PostgreSQL (no SQLite a validação fica no domínio). O `tipo`
continua arma/armadura/outro: escudo, mochila e aljava são distinguidos pelo `subtipo`.

Revision ID: 0016_carga_em_grade
Revises: 0015_ativos_legados
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0016_carga_em_grade"
down_revision = "0015_ativos_legados"
branch_labels = None
depends_on = None

SUBTIPOS = (
    "subtipo IS NULL OR subtipo IN ('peitoral', 'capacete', 'luvas', 'botas', 'uma_mao', 'duas_maos', "
    "'escudo', 'mochila', 'aljava', 'moedas', 'outro')"
)
TABELAS_NOVAS = ("item_offers", "scene_stash_items", "scene_stashes")
COLUNAS_GRADE = ("subtipo", "largura", "altura", "coluna", "linha", "girado", "maos", "pilha_max")
CHECKS_GRADE = {
    "ck_inventory_items_subtipo": SUBTIPOS,
    "ck_inventory_items_dimensao": "(largura IS NULL AND altura IS NULL) OR (largura BETWEEN 1 AND 12 AND altura BETWEEN 1 AND 12)",
    "ck_inventory_items_posicao": "(coluna IS NULL AND linha IS NULL) OR (coluna >= 0 AND linha >= 0 AND largura IS NOT NULL)",
    "ck_inventory_items_maos": "maos IS NULL OR maos BETWEEN 0 AND 2",
    "ck_inventory_items_pilha": "pilha_max IS NULL OR pilha_max >= 1",
}


def _colunas_de_item() -> list[sa.Column]:
    return [
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("subtipo", sa.String(20)),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("largura", sa.Integer()),
        sa.Column("altura", sa.Integer()),
        sa.Column("coluna", sa.Integer()),
        sa.Column("linha", sa.Integer()),
        sa.Column("girado", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("maos", sa.Integer()),
        sa.Column("pilha_max", sa.Integer()),
        sa.Column("cargas_atuais", sa.Integer()),
        sa.Column("cargas_maximas", sa.Integer()),
        sa.Column("dados", sa.JSON(), nullable=False),
    ]


def _postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    op.add_column("inventory_items", sa.Column("subtipo", sa.String(20)))
    op.add_column("inventory_items", sa.Column("largura", sa.Integer()))
    op.add_column("inventory_items", sa.Column("altura", sa.Integer()))
    op.add_column("inventory_items", sa.Column("coluna", sa.Integer()))
    op.add_column("inventory_items", sa.Column("linha", sa.Integer()))
    op.add_column("inventory_items", sa.Column("girado", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("inventory_items", sa.Column("maos", sa.Integer()))
    op.add_column("inventory_items", sa.Column("pilha_max", sa.Integer()))
    op.add_column("rpg_tables", sa.Column("moedas_por_pilha", sa.Integer(), nullable=False, server_default="100"))
    if _postgres():
        for nome, condicao in CHECKS_GRADE.items():
            op.create_check_constraint(nome, "inventory_items", condicao)
        op.create_check_constraint("ck_rpg_tables_moedas_por_pilha", "rpg_tables", "moedas_por_pilha >= 1")

    op.create_table(
        "scene_stashes",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), nullable=False),
        sa.Column("cena_id", sa.String(100), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("colunas", sa.Integer(), nullable=False),
        sa.Column("linhas", sa.Integer(), nullable=False),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["mesa_id", "cena_id"], ["scenes.mesa_id", "scenes.id"], name="fk_scene_stashes_scene"),
        sa.UniqueConstraint("mesa_id", "id", name="uq_scene_stashes_mesa_id"),
        sa.CheckConstraint("tipo IN ('chao', 'bau')", name="ck_scene_stashes_tipo"),
        sa.CheckConstraint("colunas BETWEEN 1 AND 20 AND linhas BETWEEN 1 AND 20", name="ck_scene_stashes_grade"),
        sa.CheckConstraint("versao >= 0", name="ck_scene_stashes_versao"),
    )
    op.create_index("ix_scene_stashes_mesa_id", "scene_stashes", ["mesa_id"])

    op.create_table(
        "scene_stash_items",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), nullable=False),
        sa.Column("stash_id", sa.String(100), nullable=False),
        *_colunas_de_item(),
        sa.Column("efeitos", sa.JSON(), nullable=False),
        sa.Column("origem_personagem_id", sa.String(100)),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["mesa_id", "stash_id"], ["scene_stashes.mesa_id", "scene_stashes.id"],
                                name="fk_scene_stash_items_stash", ondelete="CASCADE"),
        sa.CheckConstraint("tipo IN ('arma', 'armadura', 'outro')", name="ck_scene_stash_items_tipo"),
        sa.CheckConstraint("quantidade > 0", name="ck_scene_stash_items_quantidade"),
    )
    op.create_index("ix_scene_stash_items_stash_id", "scene_stash_items", ["stash_id"])

    op.create_table(
        "item_offers",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), nullable=False),
        sa.Column("item_id", sa.String(100), nullable=False),
        sa.Column("de_personagem_id", sa.String(100), nullable=False),
        sa.Column("para_personagem_id", sa.String(100), nullable=False),
        sa.Column("estado", sa.String(12), nullable=False, server_default="pendente"),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("decidido_em", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["mesa_id", "de_personagem_id"], ["characters.mesa_id", "characters.id"],
                                name="fk_item_offers_de"),
        sa.ForeignKeyConstraint(["mesa_id", "para_personagem_id"], ["characters.mesa_id", "characters.id"],
                                name="fk_item_offers_para"),
        sa.CheckConstraint("estado IN ('pendente', 'aceita', 'recusada', 'cancelada')", name="ck_item_offers_estado"),
        sa.CheckConstraint("de_personagem_id <> para_personagem_id", name="ck_item_offers_distintos"),
    )
    op.create_index("ix_item_offers_mesa_id", "item_offers", ["mesa_id"])

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
    if _postgres():
        op.drop_constraint("ck_rpg_tables_moedas_por_pilha", "rpg_tables", type_="check")
        for nome in CHECKS_GRADE:
            op.drop_constraint(nome, "inventory_items", type_="check")
    # DROP COLUMN nativo (SQLite >= 3.35 e PostgreSQL): as colunas não têm índices nem restrições no SQLite.
    op.execute("ALTER TABLE rpg_tables DROP COLUMN moedas_por_pilha")
    for coluna in COLUNAS_GRADE:
        op.execute(f"ALTER TABLE inventory_items DROP COLUMN {coluna}")
