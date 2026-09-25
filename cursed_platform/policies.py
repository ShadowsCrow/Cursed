"""Comparação de alterações e aplicação de bloqueios por campo."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


_MISSING = object()


def campos_alterados(antes: Any, depois: Any, caminho: str = "") -> set[str]:
    if isinstance(antes, Mapping) and isinstance(depois, Mapping):
        alterados: set[str] = set()
        for chave in set(antes) | set(depois):
            proximo = f"{caminho}.{chave}" if caminho else str(chave)
            antigo = antes.get(chave, _MISSING)
            novo = depois.get(chave, _MISSING)
            if antigo is _MISSING or novo is _MISSING:
                alterados.add(proximo)
            else:
                alterados.update(campos_alterados(antigo, novo, proximo))
        return alterados
    return {caminho} if antes != depois else set()


def _atinge(campo: str, regra: str) -> bool:
    return (
        campo == regra
        or campo.startswith(f"{regra}.")
        or regra.startswith(f"{campo}.")
    )


@dataclass(frozen=True)
class ResultadoPoliticaCampos:
    bloqueados: frozenset[str]
    exigem_aprovacao: frozenset[str]


def avaliar_campos(
    alterados: set[str],
    *,
    bloqueados: list[str],
    exigem_aprovacao: list[str],
) -> ResultadoPoliticaCampos:
    travados = frozenset(
        campo for campo in alterados if any(_atinge(campo, regra) for regra in bloqueados)
    )
    pendentes = frozenset(
        campo for campo in alterados - travados
        if any(_atinge(campo, regra) for regra in exigem_aprovacao)
    )
    return ResultadoPoliticaCampos(travados, pendentes)
