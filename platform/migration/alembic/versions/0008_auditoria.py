"""Eventos de auditoria append-only.

Revision ID: 0008_auditoria
Revises: 0007_acesso_privado
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

from cursed_platform.persistence import AUDITORIA_IMUTAVEL_POSTGRES, AUDITORIA_IMUTAVEL_SQLITE


revision = "0008_auditoria"
down_revision = "0007_acesso_privado"
branch_labels = None
depends_on = None

ID = sa.BigInteger().with_variant(sa.Integer(), "sqlite")
INDICES = {
    "ix_audit_events_mesa_seq": ["mesa_id", "id"],
    "ix_audit_events_mesa_personagem": ["mesa_id", "personagem_id", "id"],
    "ix_audit_events_mesa_categoria": ["mesa_id", "categoria", "id"],
    "ix_audit_events_mesa_ator": ["mesa_id", "ator_id", "id"],
    "ix_audit_events_mesa_sessao": ["mesa_id", "sessao_id", "id"],
    "ix_audit_events_correlacao_id": ["correlacao_id"],
}


def upgrade() -> None:
    op.create_table(
        "audit_events",
        sa.Column("id", ID, primary_key=True, autoincrement=True),
        sa.Column("mesa_id", sa.String(100), sa.ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("sessao_id", sa.String(100), sa.ForeignKey("table_sessions.id"), nullable=True),
        sa.Column("ocorrido_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ator_id", sa.String(100), nullable=True),
        sa.Column("origem", sa.String(20), nullable=False),
        sa.Column("categoria", sa.String(20), nullable=False),
        sa.Column("acao", sa.String(60), nullable=False),
        sa.Column("relevancia", sa.String(20), nullable=False),
        sa.Column("visibilidade", sa.String(20), nullable=False),
        sa.Column("personagem_id", sa.String(100), nullable=True),
        sa.Column("alvo_tipo", sa.String(40), nullable=True),
        sa.Column("alvo_id", sa.String(100), nullable=True),
        sa.Column("correlacao_id", sa.String(100), nullable=True),
        sa.Column("corrige_evento_id", ID, sa.ForeignKey("audit_events.id"), nullable=True),
        sa.Column("resumo", sa.String(500), nullable=False),
        sa.Column("detalhes", sa.JSON(), nullable=False),
        sa.CheckConstraint(
            "categoria IN ('mesa', 'permissao', 'personagem', 'ficha', 'inventario', 'efeito')",
            name="ck_audit_events_categoria",
        ),
        sa.CheckConstraint("relevancia IN ('mecanica', 'narrativa', 'organizacional')", name="ck_audit_events_relevancia"),
        sa.CheckConstraint("origem IN ('usuario', 'automacao', 'migracao')", name="ck_audit_events_origem"),
        sa.CheckConstraint("visibilidade IN ('mesa', 'narrador')", name="ck_audit_events_visibilidade"),
    )
    for nome, colunas in INDICES.items():
        op.create_index(nome, "audit_events", colunas)
    dialeto = op.get_bind().dialect.name
    if dialeto == "sqlite":
        for comando in AUDITORIA_IMUTAVEL_SQLITE:
            op.execute(comando)
    elif dialeto == "postgresql":
        for comando in AUDITORIA_IMUTAVEL_POSTGRES:
            op.execute(comando)
        op.execute("ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY")
        papeis = list(op.get_bind().exec_driver_sql(
            "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname"
        ).scalars())
        if papeis:
            op.execute(f"REVOKE ALL ON public.audit_events FROM {', '.join(papeis)}")


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS audit_events_no_truncate ON audit_events")
        op.execute("DROP TRIGGER IF EXISTS audit_events_no_change ON audit_events")
        op.execute("DROP FUNCTION IF EXISTS audit_events_append_only()")
    for nome in INDICES:
        op.drop_index(nome, table_name="audit_events")
    op.drop_table("audit_events")
