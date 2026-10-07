"""Preferências da Sala escolhidas pelo Narrador (gamificacao-da-sala, D3; cartas-na-cena): destaque de críticos,
placar visível e a mão de cartas dos jogadores à vista do Narrador.

Sem linha na tabela, o destaque e o placar ficam desligados e a mão dos jogadores fica ligada. A mudança avisa a mesa
(`sala.preferencias`). Nenhuma função confirma a transação.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from cursed_platform.persistence import PreferenciasSalaRegistro
from cursed_platform.sala import emitir

EVENTO = "sala.preferencias"
ROTULOS = {
    "destaque_criticos": "Destaque de críticos",
    "estatisticas_visiveis": "Estatísticas da mesa visíveis",
    "mao_dos_jogadores_visivel": "Mão de cartas dos jogadores à vista do Narrador",
}
PADRAO = {"destaque_criticos": False, "estatisticas_visiveis": False, "mao_dos_jogadores_visivel": True}


def ler(session: Session, mesa_id: str) -> dict[str, bool]:
    registro = session.get(PreferenciasSalaRegistro, mesa_id)
    if registro is None:
        return dict(PADRAO)
    return {chave: bool(getattr(registro, chave)) for chave in PADRAO}


def destaque_ligado(session: Session, mesa_id: str) -> bool:
    return ler(session, mesa_id)["destaque_criticos"]


def alterar(session: Session, mesa_id: str, autor_id: str, *, destaque_criticos: bool,
            estatisticas_visiveis: bool, mao_dos_jogadores_visivel: bool = True) -> dict[str, Any]:
    """Grava as preferências e devolve as que mudaram, como {chave: (antes, depois)}."""
    antes = ler(session, mesa_id)
    registro = session.get(PreferenciasSalaRegistro, mesa_id)
    if registro is None:
        registro = PreferenciasSalaRegistro(mesa_id=mesa_id)
        session.add(registro)
    registro.destaque_criticos = destaque_criticos
    registro.estatisticas_visiveis = estatisticas_visiveis
    registro.mao_dos_jogadores_visivel = mao_dos_jogadores_visivel
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
