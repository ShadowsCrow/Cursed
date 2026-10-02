"""Cartas de habilidade e magia no formato do Framework de Criação (adaptar-cartas-ao-framework).

Grau e Descansos Mínimos deixam de ser guardados: saem do Custo de Aprendizado pelas tabelas do
catálogo `framework.json`. Esta migração tira `grau` e `descansos_minimos` dos rascunhos de habilidades
e magias e move `ativacao: "passiva"` para `ativacao_legado`, porque o Tipo do Framework distingue
passiva condicional de permanente e só o Narrador pode decidir qual das duas cada carta é. As versões
publicadas são imutáveis (gatilho `card_versions_no_update`) e ficam como estão: a plataforma ignora
nelas `grau` e `descansos_minimos` e mostra os valores calculados. As cartas alteradas vão para o log,
com os valores removidos e o aviso quando os Descansos Mínimos guardados eram diferentes do cálculo.

A descida devolve `passiva` a `ativacao`, mas não recria `grau` nem `descansos_minimos`, que passam a
ser calculados.

Revision ID: 0022_cartas_campos_do_framework
Revises: 0021_remover_equipados_sem_subtipo
"""

from __future__ import annotations

import logging
from typing import Any

from alembic import op
import sqlalchemy as sa


revision = "0022_cartas_campos_do_framework"
down_revision = "0021_remover_equipados_sem_subtipo"
branch_labels = None
depends_on = None

LOG = logging.getLogger("alembic.runtime.migration")
REMOVIDOS = ("grau", "descansos_minimos")

_definicoes = sa.table("card_definitions", sa.column("id", sa.String), sa.column("tipo", sa.String), sa.column("rascunho", sa.JSON))


def _subir(tipo: str, conteudo: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    from cursed_platform import catalogos
    from cursed_platform.domain import criacao

    novo = {k: v for k, v in conteudo.items() if k not in REMOVIDOS}
    removidos = [f"{k}={conteudo[k]!r}" for k in REMOVIDOS if conteudo.get(k) is not None]
    calculados = criacao.calcular(catalogos.obter().framework, tipo, novo)
    if conteudo.get("descansos_minimos") is not None and conteudo["descansos_minimos"] != calculados.descansos_minimos:
        removidos.append(f"descansos diferentes do cálculo ({calculados.descansos_minimos})")
    if novo.get("ativacao") == "passiva":
        novo["ativacao"] = None
        novo["ativacao_legado"] = "passiva"
        removidos.append("ativacao=passiva")
    return novo, removidos


def _descer(_tipo: str, conteudo: dict[str, Any]) -> dict[str, Any]:
    novo = {k: v for k, v in conteudo.items() if k != "ativacao_legado"}
    if conteudo.get("ativacao_legado") == "passiva" and not conteudo.get("ativacao"):
        novo["ativacao"] = "passiva"
    return novo


def _percorrer(bind, transformar) -> list[str]:
    alteradas: list[str] = []
    criacoes = ("habilidade", "magia")
    for linha in bind.execute(sa.select(_definicoes.c.id, _definicoes.c.tipo, _definicoes.c.rascunho).where(_definicoes.c.tipo.in_(criacoes))).all():
        rascunho = dict(linha.rascunho or {})
        conteudo = rascunho.get("conteudo")
        if not isinstance(conteudo, dict):
            continue
        novo, detalhe = transformar(linha.tipo, conteudo)
        if novo != conteudo:
            bind.execute(_definicoes.update().where(_definicoes.c.id == linha.id).values(rascunho={**rascunho, "conteudo": novo}))
            alteradas.append(f"rascunho {linha.id}: {', '.join(detalhe)}")
    return alteradas


def upgrade() -> None:
    for alteracao in _percorrer(op.get_bind(), _subir):
        LOG.info("0022 cartas: %s", alteracao)


def downgrade() -> None:
    _percorrer(op.get_bind(), lambda tipo, conteudo: (_descer(tipo, conteudo), ["ativacao_legado"]))
