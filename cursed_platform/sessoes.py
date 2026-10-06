"""Sessões de jogo da mesa (gamificacao-da-sala, D4).

O Narrador inicia e encerra sessões numeradas (1, 2, 3…), no máximo uma em andamento por mesa. Enquanto há uma,
os eventos de auditoria e as rolagens ficam ligados a ela; é isso que separa as estatísticas da sessão das da
campanha. Nenhuma função confirma a transação.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from cursed_platform.persistence import SessaoRegistro

EVENTO = "sala.sessao"


class SessaoJaAberta(ValueError):
    """Já há uma sessão em andamento (409)."""


class SemSessaoAberta(ValueError):
    """Não há sessão em andamento para encerrar (409)."""


def ativa(session: Session, mesa_id: str) -> str | None:
    """Id da sessão em andamento da mesa, ou nada."""
    return session.scalar(
        select(SessaoRegistro.id)
        .where(SessaoRegistro.mesa_id == mesa_id, SessaoRegistro.encerrada_em.is_(None))
        .order_by(SessaoRegistro.numero.desc())
        .limit(1)
    )


def atual(session: Session, mesa_id: str) -> SessaoRegistro | None:
    return session.scalar(
        select(SessaoRegistro)
        .where(SessaoRegistro.mesa_id == mesa_id, SessaoRegistro.encerrada_em.is_(None))
        .order_by(SessaoRegistro.numero.desc())
        .limit(1)
    )


def ultima_encerrada(session: Session, mesa_id: str) -> SessaoRegistro | None:
    return session.scalar(
        select(SessaoRegistro)
        .where(SessaoRegistro.mesa_id == mesa_id, SessaoRegistro.encerrada_em.is_not(None))
        .order_by(SessaoRegistro.numero.desc())
        .limit(1)
    )


def de_referencia(session: Session, mesa_id: str) -> SessaoRegistro | None:
    """A sessão de "Esta sessão": a em andamento ou, sem ela, a última encerrada."""
    return atual(session, mesa_id) or ultima_encerrada(session, mesa_id)


def iniciar(session: Session, mesa_id: str, agora: datetime | None = None) -> SessaoRegistro:
    if ativa(session, mesa_id) is not None:
        raise SessaoJaAberta("Já há uma sessão em andamento.")
    numero = (session.scalar(select(func.max(SessaoRegistro.numero)).where(SessaoRegistro.mesa_id == mesa_id)) or 0) + 1
    registro = SessaoRegistro(id=uuid4().hex, mesa_id=mesa_id, numero=numero, iniciada_em=agora or datetime.now(UTC))
    session.add(registro)
    session.flush()
    return registro


def encerrar(session: Session, mesa_id: str, agora: datetime | None = None) -> SessaoRegistro:
    registro = atual(session, mesa_id)
    if registro is None:
        raise SemSessaoAberta("Nenhuma sessão em andamento.")
    registro.encerrada_em = agora or datetime.now(UTC)
    session.flush()
    return registro
