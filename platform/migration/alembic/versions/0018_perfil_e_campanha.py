"""Perfil (apelido e foto), apresentação da campanha e procedência de cópias.

Mudança OpenSpec `navegacao-inicial-e-perfil` (design D4, D5, D6 e D8). `user_profiles.apelido`
fica nulo até o primeiro acesso; `nome` continua vindo da identidade. `rpg_tables` ganha sinopse,
capa e sistema (sempre `cursed` nesta versão). `characters.procedencia` registra de onde veio uma
cópia independente. Só colunas novas, nulas ou com padrão: nenhum dado existente muda.

Revision ID: 0018_perfil_e_campanha
Revises: 0017_ficha_completa
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0018_perfil_e_campanha"
down_revision = "0017_ficha_completa"
branch_labels = None
depends_on = None

COLUNAS = (
    ("user_profiles", sa.Column("apelido", sa.String(40))),
    ("user_profiles", sa.Column("foto_objeto", sa.String(500))),
    ("user_profiles", sa.Column("perfil_confirmado_em", sa.DateTime(timezone=True))),
    ("rpg_tables", sa.Column("sinopse", sa.String(2000))),
    ("rpg_tables", sa.Column("capa_objeto", sa.String(500))),
    ("rpg_tables", sa.Column("sistema", sa.String(40), nullable=False, server_default="cursed")),
    ("characters", sa.Column("procedencia", sa.JSON())),
)


def upgrade() -> None:
    # ADD COLUMN nativo: `rpg_tables` e `characters` são referenciadas por outras tabelas.
    for tabela, coluna in COLUNAS:
        op.add_column(tabela, coluna)


def downgrade() -> None:
    # DROP COLUMN nativo (SQLite >= 3.35 e PostgreSQL): as colunas não têm restrições.
    for tabela, coluna in reversed(COLUNAS):
        op.execute(f"ALTER TABLE {tabela} DROP COLUMN {coluna.name}")
