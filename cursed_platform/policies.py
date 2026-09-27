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


# Campos que só o Narrador altera, avaliados antes da política da mesa (calcular-valores-da-ficha, D4):
# o jogador recebe 403 mesmo que a mesa libere a edição.
CAMPOS_EXCLUSIVOS_NARRADOR: tuple[str, ...] = (
    "personagem.nivel",
    "personagem.nivel_pela_migracao",
    "personagem.tamanho",
    "personagem.tamanho_raca",
    "recursos.ajustes",
)
ROTULOS_EXCLUSIVOS = {
    "personagem.nivel": "nível",
    "personagem.nivel_pela_migracao": "nível",
    "personagem.tamanho": "Tamanho atual",
    "personagem.tamanho_raca": "Tamanho atual",
    "recursos.ajustes": "ajustes de PV e PP",
}


def _no_caminho(ficha: Any, caminho: str) -> Any:
    atual = ficha
    for parte in caminho.split("."):
        if not isinstance(atual, Mapping):
            return None
        atual = atual.get(parte)
    return None if atual in ("", [], {}) else atual


def campos_exclusivos_do_narrador(anterior: Mapping[str, Any] | None, nova: Mapping[str, Any]) -> list[str]:
    """Rótulos dos campos exclusivos do Narrador cujo valor muda de ``anterior`` para ``nova``.

    Compara o valor de cada campo (vazio conta como ausente), para que criar uma seção inteira,
    como ``recursos``, não conte como alterar os ajustes que ela não traz.
    """
    rotulos: list[str] = []
    for regra in CAMPOS_EXCLUSIVOS_NARRADOR:
        if _no_caminho(anterior or {}, regra) != _no_caminho(nova, regra) and ROTULOS_EXCLUSIVOS[regra] not in rotulos:
            rotulos.append(ROTULOS_EXCLUSIVOS[regra])
    return rotulos


def normalizar_confirmacao_de_nivel(anterior: Mapping[str, Any] | None, nova: dict[str, Any]) -> None:
    """Trocar o nível confirma o nível: a marca de "definido pela migração" deixa de valer."""
    personagem = nova.get("personagem")
    if not isinstance(personagem, dict):
        return
    antes = (anterior or {}).get("personagem") or {}
    if antes.get("nivel") != personagem.get("nivel") or personagem.get("nivel_pela_migracao") is False:
        personagem.pop("nivel_pela_migracao", None)


def normalizar_excecao_de_tamanho(anterior: Mapping[str, Any] | None, nova: dict[str, Any]) -> None:
    """Registra para qual raça o Tamanho atual foi informado; sem Tamanho, apaga o registro.

    A troca de raça com Tamanho preenchido só é aceita quando o comando limpa o Tamanho ou
    reconfirma a exceção informando a nova raça em ``tamanho_raca`` (ver ``validacao_ficha``).
    """
    personagem = nova.get("personagem")
    if not isinstance(personagem, dict):
        return
    tamanho = personagem.get("tamanho")
    if tamanho is None or (isinstance(tamanho, str) and not tamanho.strip()):
        personagem.pop("tamanho_raca", None)
        return
    antes = (anterior or {}).get("personagem") or {}
    if antes.get("tamanho") != tamanho:
        personagem["tamanho_raca"] = personagem.get("raca")
