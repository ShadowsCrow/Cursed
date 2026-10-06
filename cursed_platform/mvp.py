"""Votação de MVP da mesa (gamificacao-da-sala, D6).

O Narrador abre a votação (com ao menos dois jogadores), cada jogador vota em outro jogador e pode trocar o voto,
e o Narrador encerra. Um mais votado vira o MVP; um empate passa a "desempate", e o Narrador escolhe entre os
empatados; sem votos, a votação termina sem MVP. Os votos são secretos: nenhuma resposta traz contagem por candidato
nem quem votou em quem, só quantos votaram e, no fim, o vencedor com os votos dele. O MVP não tem efeito mecânico.
Nenhuma função confirma a transação.
"""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from cursed_platform import sessoes
from cursed_platform.persistence import MembroRegistro, SessaoRegistro, VotacaoMvpRegistro, VotoMvpRegistro
from cursed_platform.sala import emitir

EVENTO = "sala.votacao"
MINIMO_DE_JOGADORES = 2
LIMITE_DO_HISTORICO = 20


class VotacaoInvalida(ValueError):
    """Pedido fora das regras da votação (422)."""


class ConflitoVotacao(ValueError):
    """Estado da votação não permite o pedido (409)."""


class SoJogadores(PermissionError):
    """Só jogadores da mesa votam (403)."""


def jogadores(session: Session, mesa_id: str) -> list[str]:
    return list(session.scalars(
        select(MembroRegistro.usuario_id)
        .where(MembroRegistro.mesa_id == mesa_id, MembroRegistro.papel == "jogador", MembroRegistro.ativo.is_(True))
        .order_by(MembroRegistro.usuario_id)
    ))


def _pendente(session: Session, mesa_id: str) -> VotacaoMvpRegistro | None:
    return session.scalar(select(VotacaoMvpRegistro).where(
        VotacaoMvpRegistro.mesa_id == mesa_id, VotacaoMvpRegistro.estado != "encerrada"))


def _ultima(session: Session, mesa_id: str) -> VotacaoMvpRegistro | None:
    return session.scalar(select(VotacaoMvpRegistro).where(VotacaoMvpRegistro.mesa_id == mesa_id)
                          .order_by(VotacaoMvpRegistro.aberta_em.desc(), VotacaoMvpRegistro.id.desc()).limit(1))


def _votos(session: Session, votacao_id: str) -> dict[str, str]:
    return dict(session.execute(select(VotoMvpRegistro.eleitor_id, VotoMvpRegistro.candidato_id)
                                .where(VotoMvpRegistro.votacao_id == votacao_id)).all())


def abrir(session: Session, mesa_id: str, autor_id: str) -> VotacaoMvpRegistro:
    if len(jogadores(session, mesa_id)) < MINIMO_DE_JOGADORES:
        raise VotacaoInvalida("A votação de MVP precisa de ao menos dois jogadores na mesa.")
    if _pendente(session, mesa_id) is not None:
        raise ConflitoVotacao("Já há uma votação de MVP aberta.")
    votacao = VotacaoMvpRegistro(id=uuid4().hex, mesa_id=mesa_id, sessao_id=sessoes.ativa(session, mesa_id),
                                 estado="aberta", aberta_em=datetime.now(UTC), aberta_por=autor_id)
    session.add(votacao)
    session.flush()
    emitir(session, mesa_id, EVENTO, {}, publico=True)
    return votacao


def votar(session: Session, mesa_id: str, eleitor_id: str, candidato_id: str) -> None:
    da_mesa = jogadores(session, mesa_id)
    if eleitor_id not in da_mesa:
        raise SoJogadores("Só os jogadores votam no MVP.")
    votacao = _pendente(session, mesa_id)
    if votacao is None or votacao.estado != "aberta":
        raise ConflitoVotacao("Não há votação de MVP aberta.")
    if candidato_id == eleitor_id:
        raise VotacaoInvalida("Não dá para votar em si mesmo.")
    if candidato_id not in da_mesa:
        raise VotacaoInvalida("Vote em um jogador desta mesa.")
    voto = session.get(VotoMvpRegistro, (votacao.id, eleitor_id))
    if voto is None:
        session.add(VotoMvpRegistro(votacao_id=votacao.id, eleitor_id=eleitor_id, candidato_id=candidato_id,
                                    votado_em=datetime.now(UTC)))
    else:
        voto.candidato_id, voto.votado_em = candidato_id, datetime.now(UTC)
    session.flush()
    emitir(session, mesa_id, EVENTO, {}, publico=True)


def encerrar(session: Session, mesa_id: str) -> VotacaoMvpRegistro:
    votacao = _pendente(session, mesa_id)
    if votacao is None or votacao.estado != "aberta":
        raise ConflitoVotacao("Não há votação de MVP aberta.")
    contagem = Counter(_votos(session, votacao.id).values())
    if not contagem:
        votacao.estado, votacao.encerrada_em = "encerrada", datetime.now(UTC)
    else:
        maximo = max(contagem.values())
        primeiros = sorted(c for c, n in contagem.items() if n == maximo)
        if len(primeiros) == 1:
            votacao.estado, votacao.encerrada_em = "encerrada", datetime.now(UTC)
            votacao.vencedor_id, votacao.votos_do_vencedor = primeiros[0], maximo
        else:
            votacao.estado, votacao.empatados = "desempate", primeiros
    session.flush()
    emitir(session, mesa_id, EVENTO, {}, publico=True)
    return votacao


def desempatar(session: Session, mesa_id: str, vencedor_id: str) -> VotacaoMvpRegistro:
    votacao = _pendente(session, mesa_id)
    if votacao is None or votacao.estado != "desempate":
        raise ConflitoVotacao("Não há empate para desfazer.")
    if vencedor_id not in (votacao.empatados or []):
        raise VotacaoInvalida("Escolha um dos jogadores empatados.")
    votacao.estado, votacao.encerrada_em = "encerrada", datetime.now(UTC)
    votacao.vencedor_id = vencedor_id
    votacao.votos_do_vencedor = Counter(_votos(session, votacao.id).values())[vencedor_id]
    session.flush()
    emitir(session, mesa_id, EVENTO, {}, publico=True)
    return votacao


def _numero_da_sessao(session: Session, sessao_id: str | None) -> int | None:
    return session.scalar(select(SessaoRegistro.numero).where(SessaoRegistro.id == sessao_id)) if sessao_id else None


def estado(session: Session, mesa_id: str, leitor_id: str, narrador: bool) -> dict[str, Any]:
    """A votação pendente (ou a última encerrada, para o anúncio) e o histórico de MVPs, vistos por este leitor."""
    da_mesa = jogadores(session, mesa_id)
    votacao = _pendente(session, mesa_id) or _ultima(session, mesa_id)
    atual = None
    if votacao is not None:
        votos = _votos(session, votacao.id) if votacao.estado != "encerrada" else {}
        votaram = len(votos) if votacao.estado != "encerrada" else session.scalar(
            select(func.count()).select_from(VotoMvpRegistro).where(VotoMvpRegistro.votacao_id == votacao.id))
        atual = {
            "id": votacao.id, "estado": votacao.estado, "aberta_em": votacao.aberta_em,
            "encerrada_em": votacao.encerrada_em, "votaram": votaram, "total": len(da_mesa),
            "candidatos": [j for j in da_mesa if j != leitor_id] if leitor_id in da_mesa else da_mesa,
            "meu_voto": votos.get(leitor_id) if votacao.estado == "aberta" else None,
            "empatados": list(votacao.empatados or []) if narrador and votacao.estado == "desempate" else [],
            "vencedor_id": votacao.vencedor_id, "votos_do_vencedor": votacao.votos_do_vencedor,
            "sessao_numero": _numero_da_sessao(session, votacao.sessao_id),
        }
    anteriores = session.scalars(
        select(VotacaoMvpRegistro)
        .where(VotacaoMvpRegistro.mesa_id == mesa_id, VotacaoMvpRegistro.estado == "encerrada",
               VotacaoMvpRegistro.vencedor_id.is_not(None))
        .order_by(VotacaoMvpRegistro.encerrada_em.desc()).limit(LIMITE_DO_HISTORICO)
    )
    historico = [{"votacao_id": v.id, "vencedor_id": v.vencedor_id, "votos": v.votos_do_vencedor or 0,
                  "sessao_numero": _numero_da_sessao(session, v.sessao_id), "encerrada_em": v.encerrada_em}
                 for v in anteriores]
    return {"votacao": atual, "historico": historico, "jogadores": da_mesa}
