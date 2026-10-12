"""Metadados de objetos extraídos de Base64 legado.

Revision ID: 0015_ativos_legados
Revises: 0014_procedencia_legada
"""

from alembic import op
import sqlalchemy as sa


revision = "0015_ativos_legados"
down_revision = "0014_procedencia_legada"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "legacy_assets",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id"), nullable=False),
        sa.Column("personagem_id", sa.String(100), nullable=False),
        sa.Column("bucket", sa.String(100), nullable=False),
        sa.Column("caminho", sa.String(500), nullable=False),
        sa.Column("tipo", sa.String(100), nullable=False),
        sa.Column("tamanho", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("procedencias", sa.JSON(), nullable=False),
        sa.UniqueConstraint("personagem_id", "sha256", name="uq_legacy_assets_personagem_hash"),
        sa.UniqueConstraint("bucket", "caminho", name="uq_legacy_assets_objeto"),
        sa.ForeignKeyConstraint(["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
                                name="fk_legacy_assets_character"),
    )
    op.create_index("ix_legacy_assets_mesa_id", "legacy_assets", ["mesa_id"])
    op.create_table(
        "legacy_catalog_assets",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id"), nullable=False),
        sa.Column("bucket", sa.String(100), nullable=False),
        sa.Column("caminho", sa.String(500), nullable=False),
        sa.Column("tipo", sa.String(100), nullable=False),
        sa.Column("tamanho", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("procedencias", sa.JSON(), nullable=False),
        sa.UniqueConstraint("mesa_id", "sha256", name="uq_legacy_catalog_assets_mesa_hash"),
        sa.UniqueConstraint("bucket", "caminho", name="uq_legacy_catalog_assets_objeto"),
    )
    op.create_index("ix_legacy_catalog_assets_mesa_id", "legacy_catalog_assets", ["mesa_id"])
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE public.legacy_assets ENABLE ROW LEVEL SECURITY")
        op.execute("ALTER TABLE public.legacy_catalog_assets ENABLE ROW LEVEL SECURITY")
        papeis = list(op.get_bind().exec_driver_sql(
            "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname"
        ).scalars())
        if papeis:
            op.execute(f"REVOKE ALL ON public.legacy_assets FROM {', '.join(papeis)}")
            op.execute(f"REVOKE ALL ON public.legacy_catalog_assets FROM {', '.join(papeis)}")


def downgrade() -> None:
    op.drop_table("legacy_catalog_assets")
    op.drop_table("legacy_assets")
