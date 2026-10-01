"""Remove os itens equipados sem subtipo, que vêm de antes da grade de carga.

Decisão do usuário em 2026-09-30: o que vale é o sistema da grade, e itens do sistema legado não
devem existir no banco. No sistema novo, equipar exige formato (subtipo) e posição na grade; um item
equipado sem subtipo só existe porque a `0016` não desequipou o que já estava equipado. Itens sem
subtipo e desequipados continuam: são os importados (EQ1) à espera do formato definido pelo Narrador.

Cada item removido segue a remoção de carta de item (`cartas_ciclo`): os efeitos vinculados a ele
são apagados com suas operações e fontes, a carta de item que o possuía passa a `removida` e as
ofertas pendentes dele são canceladas. A versão das fichas afetadas avança. A descida não recria
os itens.

Revision ID: 0021_remover_equipados_sem_subtipo
Revises: 0020_apresentacao_vista
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0021_remover_equipados_sem_subtipo"
down_revision = "0020_apresentacao_vista"
branch_labels = None
depends_on = None


def _executar(bind, sql: str, **parametros) -> None:
    consulta = sa.text(sql).bindparams(*(sa.bindparam(nome, expanding=True) for nome in parametros))
    bind.execute(consulta, parametros)


def upgrade() -> None:
    bind = op.get_bind()
    itens = bind.execute(sa.text(
        "SELECT id, personagem_id FROM inventory_items WHERE equipado = :sim AND subtipo IS NULL"
    ), {"sim": True}).all()
    if not itens:
        return
    ids = [linha.id for linha in itens]
    personagens = sorted({linha.personagem_id for linha in itens})
    efeitos = list(bind.execute(sa.text(
        "SELECT DISTINCT efeito_id FROM effect_sources WHERE equipamento_id IN :ids"
    ).bindparams(sa.bindparam("ids", expanding=True)), {"ids": ids}).scalars())

    _executar(bind, "UPDATE character_cards SET estado = 'removida' WHERE tipo = 'item' AND item_id IN :ids", ids=ids)
    _executar(bind, "UPDATE item_offers SET estado = 'cancelada' WHERE estado = 'pendente' AND item_id IN :ids", ids=ids)
    if efeitos:
        _executar(bind, "DELETE FROM effect_operations WHERE efeito_id IN :efeitos", efeitos=efeitos)
        _executar(bind, "DELETE FROM effect_sources WHERE efeito_id IN :efeitos", efeitos=efeitos)
    _executar(bind, "DELETE FROM effect_sources WHERE equipamento_id IN :ids", ids=ids)
    if efeitos:
        _executar(bind, "DELETE FROM character_effects WHERE id IN :efeitos", efeitos=efeitos)
    _executar(bind, "DELETE FROM inventory_items WHERE id IN :ids", ids=ids)
    _executar(bind, "UPDATE characters SET versao = versao + 1 WHERE id IN :personagens", personagens=personagens)


def downgrade() -> None:
    # Remoção de dados legados: não há o que recriar.
    pass
