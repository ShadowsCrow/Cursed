"""Registro e consulta de eventos semânticos de auditoria.

Cada comando confirmado registra um único evento na mesma transação da
alteração. O evento guarda o que mudou (campo, antes, depois) e a visibilidade
no momento da ação; a consulta ainda aplica as permissões atuais do leitor, de
modo que jogadores nunca recebem eventos de recursos que não podem ler.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any, Iterable, Mapping

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.persistence import EventoAuditoriaRegistro, PersonagemRegistro, SessaoRegistro
from cursed_platform.policies import campos_alterados


LIMITE_VALOR = 10_000
_AUSENTE = object()

CAMPOS_MECANICOS = (
    "atributos", "pericias", "armas", "armaduras", "outros", "efeitos_externos", "recursos",
    "personagem.habilidades", "personagem.nivel", "personagem.raca", "personagem.classe",
    "personagem.arquetipo",
)


def _valor_no_caminho(dados: Any, caminho: str) -> Any:
    atual = dados
    for parte in caminho.split(".") if caminho else []:
        if not isinstance(atual, Mapping) or parte not in atual:
            return _AUSENTE
        atual = atual[parte]
    return atual


def _registravel(valor: Any) -> tuple[Any, bool]:
    """Devolve o valor e se ele foi preservado integralmente."""
    if valor is _AUSENTE:
        return None, True
    if len(json.dumps(valor, ensure_ascii=False, default=str)) > LIMITE_VALOR:
        return {"omitido": "valor extenso"}, False
    return valor, True


def mudancas(antes: Mapping[str, Any], depois: Mapping[str, Any]) -> list[dict[str, Any]]:
    resultado = []
    for campo in sorted(campos_alterados(antes, depois)):
        anterior, completo_antes = _registravel(_valor_no_caminho(antes, campo))
        novo, completo_depois = _registravel(_valor_no_caminho(depois, campo))
        resultado.append({
            "campo": campo, "antes": anterior, "depois": novo,
            "ausente_antes": _valor_no_caminho(antes, campo) is _AUSENTE,
            "ausente_depois": _valor_no_caminho(depois, campo) is _AUSENTE,
            "completo": completo_antes and completo_depois,
        })
    return resultado


def relevancia_da_ficha(campos: Iterable[str]) -> str:
    mecanico = any(
        campo == prefixo or campo.startswith(f"{prefixo}.") for campo in campos for prefixo in CAMPOS_MECANICOS
    )
    return "mecanica" if mecanico else "narrativa"


def _curto(valor: Any) -> str:
    texto = valor if isinstance(valor, str) else json.dumps(valor, ensure_ascii=False, default=str)
    return texto if len(texto) <= 40 else f"{texto[:37]}…"


ROTULOS_CAMPOS = {
    "permitir_criacao_propria": "criação de personagens",
    "permitir_edicao_propria": "edição das próprias fichas",
    "permitir_exclusao_propria": "exclusão das próprias fichas",
    "campos_bloqueados": "campos bloqueados",
    "campos_exigem_aprovacao": "campos com aprovação",
}


def resumo_mudancas(nome: str, lista: list[dict[str, Any]]) -> str:
    if len(lista) == 1:
        item = lista[0]
        return f"{nome}: {item['campo']} de {_curto(item['antes'])} para {_curto(item['depois'])}"[:500]
    campos = ", ".join(ROTULOS_CAMPOS.get(item["campo"], item["campo"]) for item in lista[:5])
    extra = f" e mais {len(lista) - 5}" if len(lista) > 5 else ""
    return f"{nome}: {len(lista)} campos alterados ({campos}{extra})"[:500]


def nome_personagem(personagem: PersonagemRegistro) -> str:
    nome = (personagem.ficha or {}).get("personagem", {}).get("nome")
    return nome.strip() if isinstance(nome, str) and nome.strip() else "Personagem sem nome"


def _sessao_ativa(session: Session, mesa_id: str) -> str | None:
    return session.scalar(
        select(SessaoRegistro.id)
        .where(SessaoRegistro.mesa_id == mesa_id, SessaoRegistro.encerrada_em.is_(None))
        .order_by(SessaoRegistro.numero.desc())
        .limit(1)
    )


def registrar(
    session: Session,
    *,
    mesa_id: str,
    ator_id: str | None,
    categoria: str,
    acao: str,
    relevancia: str,
    resumo: str,
    personagem: PersonagemRegistro | None = None,
    alvo_tipo: str | None = None,
    alvo_id: str | None = None,
    mudancas: list[dict[str, Any]] | None = None,
    detalhes: Mapping[str, Any] | None = None,
    correlacao_id: str | None = None,
    corrige_evento_id: int | None = None,
    origem: str = "usuario",
    visibilidade: str | None = None,
) -> EventoAuditoriaRegistro:
    """Adiciona o evento à transação corrente; quem chama confirma alteração e evento juntos."""
    if visibilidade is None:
        visibilidade = "narrador" if personagem is not None and personagem.visibilidade == "narrador" else "mesa"
    evento = EventoAuditoriaRegistro(
        mesa_id=mesa_id, sessao_id=_sessao_ativa(session, mesa_id), ator_id=ator_id, origem=origem,
        categoria=categoria, acao=acao, relevancia=relevancia, visibilidade=visibilidade,
        personagem_id=personagem.id if personagem is not None else None,
        alvo_tipo=alvo_tipo or ("personagem" if personagem is not None else None),
        alvo_id=alvo_id or (personagem.id if personagem is not None else None),
        correlacao_id=correlacao_id, corrige_evento_id=corrige_evento_id, resumo=resumo[:500],
        detalhes={**(detalhes or {}), "mudancas": mudancas or []},
    )
    session.add(evento)
    session.flush()
    return evento


@dataclass(frozen=True)
class FiltrosAuditoria:
    sessao_id: str | None = None
    ator_id: str | None = None
    personagem_id: str | None = None
    categoria: str | None = None
    relevancia: str | None = None


def consultar(
    session: Session,
    *,
    mesa_id: str,
    usuario_id: str,
    filtros: FiltrosAuditoria,
    antes_de: int | None = None,
    limite: int = 50,
) -> tuple[list[EventoAuditoriaRegistro], int | None] | None:
    """Eventos visíveis ao leitor, do mais recente ao mais antigo. `None` se a mesa não é acessível."""
    autorizador = Autorizador(session)
    if not autorizador.decidir(Acao.LER_MESA, usuario_id=usuario_id, mesa_id=mesa_id).permitido:
        return None
    narrador = autorizador.decidir(Acao.LER_CONTEUDO_NARRADOR, usuario_id=usuario_id, mesa_id=mesa_id).permitido
    consulta = select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.mesa_id == mesa_id)
    if not narrador:
        legiveis = [
            p.id for p in session.scalars(select(PersonagemRegistro).where(PersonagemRegistro.mesa_id == mesa_id))
            if autorizador.decidir(
                Acao.LER_FICHA, usuario_id=usuario_id, mesa_id=mesa_id, personagem_id=p.id
            ).permitido
        ]
        consulta = consulta.where(
            EventoAuditoriaRegistro.visibilidade == "mesa",
            or_(
                EventoAuditoriaRegistro.personagem_id.is_(None),
                EventoAuditoriaRegistro.personagem_id.in_(legiveis),
            ),
        )
    for coluna, valor in (
        (EventoAuditoriaRegistro.sessao_id, filtros.sessao_id),
        (EventoAuditoriaRegistro.ator_id, filtros.ator_id),
        (EventoAuditoriaRegistro.personagem_id, filtros.personagem_id),
        (EventoAuditoriaRegistro.categoria, filtros.categoria),
        (EventoAuditoriaRegistro.relevancia, filtros.relevancia),
    ):
        if valor is not None:
            consulta = consulta.where(coluna == valor)
    if antes_de is not None:
        consulta = consulta.where(EventoAuditoriaRegistro.id < antes_de)
    eventos = list(session.scalars(consulta.order_by(EventoAuditoriaRegistro.id.desc()).limit(limite + 1)))
    proximo = eventos[limite - 1].id if len(eventos) > limite else None
    return eventos[:limite], proximo
