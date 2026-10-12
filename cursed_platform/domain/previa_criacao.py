"""Prévia de uma ficha de personagem ainda não gravada (design D3 de criacao-guiada-e-nova-estetica).

O assistente de criação pede PV, PP e Escalas do rascunho sem gravar nada. A prévia aplica à
ficha a mesma preparação de um personagem novo do jogador (nível `1` quando ausente) e devolve
os valores de `recursos.calcular` e os problemas de `validar_ficha`, sem acesso a banco.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Mapping

from cursed_platform.domain import recursos
from cursed_platform.domain.ficha import FichaDraft
from cursed_platform.domain.validacao_ficha import ErroCampo, problemas_de_criacao, validar_ficha

if TYPE_CHECKING:
    from cursed_platform.catalogos import Catalogos

NOME_OBRIGATORIO = "Nome do personagem obrigatório."


@dataclass(frozen=True)
class PreviaCriacao:
    valores: recursos.Recursos
    problemas: tuple[ErroCampo, ...]


def ficha_nova(payload: Mapping[str, Any] | None) -> dict[str, Any]:
    """Cópia normalizada da ficha como ficará ao ser criada: sem nível informado, nível `1`."""
    ficha = FichaDraft.de_payload(payload).para_payload()
    personagem = ficha.setdefault("personagem", {})
    if personagem.get("nivel") in (None, ""):
        personagem["nivel"] = recursos.NIVEL_MINIMO
    return ficha


def previa(payload: Mapping[str, Any] | None, catalogo: "Catalogos") -> PreviaCriacao:
    ficha = ficha_nova(payload)
    problemas: list[ErroCampo] = []
    nome = ficha["personagem"].get("nome")
    if not isinstance(nome, str) or not nome.strip():
        problemas.append(ErroCampo("personagem.nome", NOME_OBRIGATORIO))
    problemas.extend(validar_ficha(None, ficha, catalogo))
    problemas.extend(problemas_de_criacao(ficha, catalogo))
    return PreviaCriacao(recursos.calcular(ficha, catalogo), tuple(problemas))
