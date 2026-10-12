"""Validação da ficha nos caminhos de gravação da API (design D4)."""

from __future__ import annotations

from typing import Any, Mapping

from fastapi import HTTPException, status

from cursed_platform import catalogos
from cursed_platform.catalogos import chave
from cursed_platform.domain import recursos
from cursed_platform.domain.validacao_ficha import problemas_de_criacao, validar_ficha
from cursed_platform.policies import campos_exclusivos_do_narrador, normalizar_excecao_de_tamanho


# As regras definem limites e catálogo para personagens; NPCs e monstros ficam livres (decisão de 2026-09-27).
TIPOS_VALIDADOS = frozenset({"personagem"})


def exigir_ficha_valida(
    anterior: Mapping[str, Any] | None, nova: Mapping[str, Any], *, tipo: str, criacao_pelo_jogador: bool = False,
) -> None:
    """422 com um problema por campo quando ``nova`` altera algum campo para um valor inválido.

    ``anterior=None`` valida a ficha inteira (personagem novo). Só fichas do tipo personagem são
    recusadas. O formato do erro é o mesmo das cartas: ``{"mensagem": ..., "problemas": [{"campo", "mensagem"}]}``.
    """
    if tipo not in TIPOS_VALIDADOS:
        return
    erros = validar_ficha(anterior, nova, catalogos.obter())
    if criacao_pelo_jogador:
        erros += problemas_de_criacao(nova, catalogos.obter())
    if erros:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "mensagem": "A ficha tem valores fora das regras.",
                "problemas": [{"campo": e.caminho, "mensagem": e.mensagem} for e in erros],
            },
        )


def preparar_ficha_nova(payload: dict[str, Any], *, tipo: str, pelo_narrador: bool) -> None:
    """Personagem novo começa no nível 1, salvo nível informado pelo Narrador; o jogador não
    informa nível nem ajustes de PV e PP (campos exclusivos do Narrador). O Tamanho só pode vir do
    jogador como escolha de fora da média, validada por ``problemas_de_criacao``."""
    personagem = payload.setdefault("personagem", {})
    if not pelo_narrador:
        # Nível ausente ou 1 é o padrão; qualquer outro valor exclusivo precisa do Narrador. O Tamanho
        # fora da média é escolha do jogador na criação (um passo, ver ``problemas_de_criacao``).
        padrao = {"personagem": {
            "nivel": personagem.get("nivel") if personagem.get("nivel") in (None, "") else 1,
            "tamanho": personagem.get("tamanho"), "tamanho_raca": personagem.get("tamanho_raca"),
        }}
        exclusivos = campos_exclusivos_do_narrador(padrao, payload)
        if exclusivos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Somente o Narrador define: {', '.join(exclusivos)}.",
            )
        raca = catalogos.obter().raca(personagem.get("raca")) if personagem.get("raca") else None
        if raca and raca.tamanho and chave(personagem.get("tamanho")) == chave(raca.tamanho):
            # Tamanho igual ao da raça é a média: não há exceção a registrar.
            personagem.pop("tamanho", None)
            personagem.pop("tamanho_raca", None)
    if tipo in TIPOS_VALIDADOS and personagem.get("nivel") in (None, ""):
        personagem["nivel"] = 1
    normalizar_excecao_de_tamanho(None, payload)
    ajustar_recursos_atuais(payload, novo=True)


def ajustar_recursos_atuais(payload: dict[str, Any], *, novo: bool) -> None:
    """PV/PP atuais: iguais ao máximo em personagem novo e nunca acima do máximo recalculado."""
    recursos.ajustar_atuais(payload, recursos.calcular(payload, catalogos.obter()), novo=novo)
