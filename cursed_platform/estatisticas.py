"""Estatísticas dos jogadores na Sala (gamificacao-da-sala, D5), calculadas na consulta.

- Vida perdida e recuperada: as quedas e subidas de ``recursos.pv.atual`` nos eventos de auditoria dos personagens
  do jogador (dono atual). Mudanças só do máximo não contam.
- Rolagens, críticos e falhas: as rolagens não ocultas feitas pelo jogador e as marcas dos d20.
- Sorte: a média de ``(valor − 1) / (faces − 1)`` de todos os dados, menos 0,5, em pontos percentuais. Com menos de
  10 dados no período, não há rótulo.

O período da sessão filtra por ``sessao_id``; o da campanha, pela mesa toda.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform.persistence import EventoAuditoriaRegistro, PersonagemRegistro, RolagemRegistro

CAMPO_PV_ATUAL = "recursos.pv.atual"
MINIMO_DE_DADOS = 10
LIMIAR_DE_SORTE = 5.0


@dataclass
class Periodo:
    vida_perdida: int = 0
    vida_recuperada: int = 0
    rolagens: int = 0
    dados: int = 0
    criticos: int = 0
    falhas_criticas: int = 0
    _soma_sorte: float = 0.0

    @property
    def sorte(self) -> float | None:
        if self.dados < MINIMO_DE_DADOS:
            return None
        return round((self._soma_sorte / self.dados - 0.5) * 100, 1)

    @property
    def rotulo_sorte(self) -> str:
        sorte = self.sorte
        if sorte is None:
            return "poucos_dados"
        if sorte >= LIMIAR_DE_SORTE:
            return "quentes"
        if sorte <= -LIMIAR_DE_SORTE:
            return "frios"
        return "na_media"

    def para_resposta(self, destaque: bool) -> dict[str, Any]:
        return {
            "vida_perdida": self.vida_perdida, "vida_recuperada": self.vida_recuperada, "rolagens": self.rolagens,
            "dados": self.dados, "sorte": self.sorte, "rotulo_sorte": self.rotulo_sorte,
            "criticos": self.criticos if destaque else None,
            "falhas_criticas": self.falhas_criticas if destaque else None,
        }


def _inteiro(valor: Any) -> int | None:
    return valor if isinstance(valor, int) and not isinstance(valor, bool) else None


def deltas_de_pv(evento: EventoAuditoriaRegistro) -> list[int]:
    """Variações do PV atual registradas no evento; um campo ausente antes (ficha nova) não conta."""
    deltas = []
    for mudanca in (evento.detalhes or {}).get("mudancas") or []:
        if mudanca.get("campo") != CAMPO_PV_ATUAL or mudanca.get("ausente_antes") or mudanca.get("ausente_depois"):
            continue
        antes, depois = _inteiro(mudanca.get("antes")), _inteiro(mudanca.get("depois"))
        if antes is not None and depois is not None and antes != depois:
            deltas.append(depois - antes)
    return deltas


def _somar_vida(periodo: Periodo, deltas: Iterable[int]) -> None:
    for delta in deltas:
        if delta < 0:
            periodo.vida_perdida -= delta
        else:
            periodo.vida_recuperada += delta


def _somar_rolagem(periodo: Periodo, rolagem: RolagemRegistro) -> None:
    periodo.rolagens += 1
    for grupo in rolagem.grupos or []:
        faces = grupo.get("faces")
        if not isinstance(faces, int) or faces < 2:
            continue
        for valor in grupo.get("valores") or []:
            periodo.dados += 1
            periodo._soma_sorte += (valor - 1) / (faces - 1)
    for marca in rolagem.marcas or []:
        if marca.get("tipo") == "critico":
            periodo.criticos += 1
        elif marca.get("tipo") == "falha_critica":
            periodo.falhas_criticas += 1


def calcular(session: Session, mesa_id: str, jogadores: Iterable[str],
             sessao_id: str | None) -> dict[str, tuple[Periodo | None, Periodo]]:
    """Para cada jogador, (período da sessão ou nada sem sessão de referência, campanha)."""
    jogadores = list(dict.fromkeys(jogadores))
    resultado: dict[str, tuple[Periodo | None, Periodo]] = {
        j: (Periodo() if sessao_id else None, Periodo()) for j in jogadores
    }
    if not jogadores:
        return resultado
    donos = dict(session.execute(
        select(PersonagemRegistro.id, PersonagemRegistro.proprietario_id)
        .where(PersonagemRegistro.mesa_id == mesa_id, PersonagemRegistro.proprietario_id.in_(jogadores))
    ).all())
    if donos:
        eventos = session.scalars(
            select(EventoAuditoriaRegistro)
            .where(EventoAuditoriaRegistro.mesa_id == mesa_id, EventoAuditoriaRegistro.personagem_id.in_(list(donos)))
        )
        for evento in eventos:
            deltas = deltas_de_pv(evento)
            if not deltas:
                continue
            da_sessao, campanha = resultado[donos[evento.personagem_id]]
            _somar_vida(campanha, deltas)
            if da_sessao is not None and evento.sessao_id == sessao_id:
                _somar_vida(da_sessao, deltas)
    rolagens = session.scalars(
        select(RolagemRegistro)
        .where(RolagemRegistro.mesa_id == mesa_id, RolagemRegistro.oculta.is_(False),
               RolagemRegistro.autor_id.in_(jogadores))
    )
    for rolagem in rolagens:
        da_sessao, campanha = resultado[rolagem.autor_id]
        _somar_rolagem(campanha, rolagem)
        if da_sessao is not None and rolagem.sessao_id == sessao_id:
            _somar_rolagem(da_sessao, rolagem)
    return resultado
