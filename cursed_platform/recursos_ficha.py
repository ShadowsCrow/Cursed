"""PV e PP atuais alterados por comando (cartas-na-cena, D2): o débito de PP de uma carta usada e, no futuro, dano e
cura na Sala.

O atual vive na ficha (`recursos.<recurso>.atual`). O comando lê a ficha, aplica a diferença respeitando 0 e o máximo
calculado, grava a ficha com a trava otimista de versão e registra a auditoria com `mudancas` no campo
`recursos.<recurso>.atual`, o mesmo lugar que as estatísticas da mesa já leem. Nenhuma função confirma a transação.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Mapping

from sqlalchemy.orm import Session

from cursed_platform import auditoria, catalogos
from cursed_platform.domain import recursos
from cursed_platform.ficha_viva import ConflitoVersao
from cursed_platform.persistence import EventoAuditoriaRegistro, PersonagemRegistro
from cursed_platform.repositories import FichaRepository

RECURSOS = ("pv", "pp")
SIGLAS = {"pv": "PV", "pp": "PP"}


class RecursoInvalido(ValueError):
    """O recurso não existe ou a ficha não permite calcular o que falta (422)."""


class RecursoInsuficiente(ValueError):
    """O débito passa do que o personagem tem (409)."""

    def __init__(self, recurso: str, falta: int) -> None:
        super().__init__(f"Faltam {falta} {SIGLAS[recurso]}.")
        self.recurso, self.falta = recurso, falta


def _inteiro(valor: Any) -> int | None:
    return recursos._inteiro(valor)


def maximo(ficha: Mapping[str, Any], recurso: str) -> int | None:
    return recursos.calcular(ficha, catalogos.obter()).maximo(recurso)


def atual(ficha: Mapping[str, Any], recurso: str) -> int | None:
    """O valor atual gravado; sem ele, o máximo calculado (um personagem começa cheio); sem os dois, nada."""
    if recurso not in RECURSOS:
        raise RecursoInvalido(f"Recurso desconhecido: {recurso}.")
    bruto = ((ficha.get("recursos") or {}).get(recurso) or {})
    valor = _inteiro(bruto.get("atual")) if isinstance(bruto, Mapping) else None
    return valor if valor is not None else maximo(ficha, recurso)


def alterar_atual(
    session: Session, personagem: PersonagemRegistro, recurso: str, delta: int, *, ator_id: str, acao: str,
    origem: str, correlacao_id: str | None = None, detalhes: Mapping[str, Any] | None = None,
) -> tuple[int, int, EventoAuditoriaRegistro]:
    """Soma `delta` ao atual (negativo gasta). Devolve (antes, depois, evento de auditoria).

    Um gasto maior que o atual é recusado; uma recuperação para acima do máximo é limitada ao máximo.
    """
    ficha = personagem.ficha or {}
    antes = atual(ficha, recurso)
    if antes is None:
        raise RecursoInvalido(f"A ficha não tem {SIGLAS[recurso]} atual nem máximo calculável.")
    depois = antes + delta
    if depois < 0:
        raise RecursoInsuficiente(recurso, -depois)
    teto = maximo(ficha, recurso)
    if teto is not None and depois > teto:
        depois = teto
    nova = deepcopy(ficha)
    secao = nova.setdefault("recursos", {})
    if not isinstance(secao, dict):
        raise RecursoInvalido("A seção de recursos da ficha está num formato inesperado.")
    estado = dict(secao.get(recurso) or {}) if isinstance(secao.get(recurso), Mapping) else {}
    estado["atual"] = depois
    secao[recurso] = estado
    # O UPDATE com a versão esperada é a trava otimista; a sessão sincroniza `ficha` e `versao` do objeto.
    if not FichaRepository(session).substituir_se_versao(personagem.mesa_id, personagem.id, personagem.versao, nova):
        raise ConflitoVersao()
    sinal = f"{depois - antes:+d}"
    evento = auditoria.registrar(
        session, mesa_id=personagem.mesa_id, ator_id=ator_id, categoria="ficha", acao=acao, relevancia="mecanica",
        personagem=personagem, resumo=f"{auditoria.nome_personagem(personagem)}: {SIGLAS[recurso]} {sinal} ({origem})",
        mudancas=auditoria.mudancas(ficha, nova), detalhes={**(detalhes or {}), "origem": origem},
        correlacao_id=correlacao_id,
    )
    return antes, depois, evento
