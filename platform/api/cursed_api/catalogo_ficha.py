"""Cartas de classe, arquétipo e raça concedidas junto com a gravação da ficha (D5)."""

from __future__ import annotations

from typing import Any, Mapping

from sqlalchemy.orm import Session

from cursed_platform import cartas_catalogo, catalogos
from cursed_platform.persistence import PersonagemRegistro

CAMPOS_DE_ESCOLHA = ("classe", "arquetipo", "raca")


def escolha_mudou(anterior: Mapping[str, Any] | None, nova: Mapping[str, Any]) -> bool:
    antes = (anterior or {}).get("personagem") or {}
    depois = nova.get("personagem") or {}
    return any(antes.get(campo) != depois.get(campo) for campo in CAMPOS_DE_ESCOLHA)


def atualizar_cartas(
    session: Session, personagem: PersonagemRegistro, anterior: Mapping[str, Any] | None, nova: Mapping[str, Any],
    *, ator_id: str, correlacao_id: str | None,
) -> None:
    """Concede e retira as cartas de catálogo quando classe, arquétipo ou raça mudam; audita na mesma transação."""
    if not escolha_mudou(anterior, nova):
        return
    resultado = cartas_catalogo.conceder(session, personagem, nova, catalogos.obter())
    cartas_catalogo.auditar(session, personagem, resultado, ator_id=ator_id, correlacao_id=correlacao_id)
