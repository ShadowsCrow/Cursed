"""Preferências da Sala escolhidas pelo Narrador (gamificacao-da-sala, D3): destaque de críticos e placar visível.

Sem linha na tabela, as duas ficam desligadas. A mudança avisa a mesa (`sala.preferencias`). Nenhuma função
confirma a transação.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from cursed_platform.persistence import PreferenciasSalaRegistro
from cursed_platform.sala import emitir

EVENTO = "sala.preferencias"
ROTULOS = {"destaque_criticos": "Destaque de críticos", "estatisticas_visiveis": "Estatísticas da mesa visíveis"}


def ler(session: Session, mesa_id: str) -> dict[str, bool]:
    registro = session.get(PreferenciasSalaRegistro, mesa_id)
    return {
        "destaque_criticos": bool(registro and registro.destaque_criticos),
        "estatisticas_visiveis": bool(registro and registro.estatisticas_visiveis),
    }


def destaque_ligado(session: Session, mesa_id: str) -> bool:
    return ler(session, mesa_id)["destaque_criticos"]


def alterar(session: Session, mesa_id: str, autor_id: str, *, destaque_criticos: bool,
            estatisticas_visiveis: bool) -> dict[str, Any]:
    """Grava as duas preferências e devolve as que mudaram, como {chave: (antes, depois)}."""
    antes = ler(session, mesa_id)
    registro = session.get(PreferenciasSalaRegistro, mesa_id)
    if registro is None:
        registro = PreferenciasSalaRegistro(mesa_id=mesa_id)
        session.add(registro)
    registro.destaque_criticos = destaque_criticos
    registro.estatisticas_visiveis = estatisticas_visiveis
    registro.alterada_em = datetime.now(UTC)
    registro.alterada_por = autor_id
    session.flush()
    depois = ler(session, mesa_id)
    mudancas = {chave: (antes[chave], depois[chave]) for chave in depois if antes[chave] != depois[chave]}
    if mudancas:
        emitir(session, mesa_id, EVENTO, {}, publico=True)
    return mudancas


def descrever(mudancas: dict[str, Any]) -> str:
    return "; ".join(f"{ROTULOS[chave]}: {'ligado' if depois else 'desligado'}" for chave, (_, depois) in mudancas.items())
