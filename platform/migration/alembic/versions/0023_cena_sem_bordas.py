"""A cena não tem bordas: tokens em qualquer casa, até o limite de sanidade (experiencia-da-mesa, item 7).

Decisão do usuário (2026-10-02): a cena é um espaço próprio da mesa, não um tabuleiro de colunas × linhas.
Colunas e linhas da cena passam a ser só a área onde o mapa é desenhado. A restrição de posição dos tokens
deixa de exigir x e y não negativos e passa a valer só como limite de sanidade de ±2000 casas, o mesmo de
`cursed_platform.sala.LIMITE_DA_CENA` e dos contratos da API.

A descida volta à restrição antiga e para, antes de mexer na tabela, se houver token em coordenada
negativa; o log diz quantos são.

Revision ID: 0023_cena_sem_bordas
Revises: 0022_cartas_campos_do_framework
"""

from __future__ import annotations

import logging

from alembic import op
import sqlalchemy as sa


revision = "0023_cena_sem_bordas"
down_revision = "0022_cartas_campos_do_framework"
branch_labels = None
depends_on = None

NOVA = "x BETWEEN -2000 AND 2000 AND y BETWEEN -2000 AND 2000"
ANTIGA = "x >= 0 AND y >= 0"
log = logging.getLogger("alembic.runtime.migration")


def _trocar(condicao: str) -> None:
    with op.batch_alter_table("scene_tokens") as tabela:
        tabela.drop_constraint("ck_scene_tokens_posicao", type_="check")
        tabela.create_check_constraint("ck_scene_tokens_posicao", condicao)


def upgrade() -> None:
    _trocar(NOVA)


def downgrade() -> None:
    negativos = op.get_bind().execute(sa.text("SELECT count(*) FROM scene_tokens WHERE x < 0 OR y < 0")).scalar_one()
    if negativos:
        # Para antes de recriar a tabela: no SQLite o DDL não volta atrás, e sobraria a tabela temporária.
        mensagem = f"0023: {negativos} token(s) em coordenada negativa impedem voltar à restrição {ANTIGA}."
        log.error(mensagem)
        raise RuntimeError(mensagem)
    _trocar(ANTIGA)
