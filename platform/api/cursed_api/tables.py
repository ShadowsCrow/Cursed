"""Jornada inicial de criação, convite e participação em mesas."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256
import secrets
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    AceitarConviteRequest, ConviteCriado, CriarConviteRequest,
    CriarMesaRequest, MesaResumo, ParticipanteResumo,
)
from cursed_platform.persistence import ConviteMesaRegistro, MembroRegistro, MesaRegistro
from cursed_platform.repositories import MesaRepository

from .auth import Ator, get_actor
from .dependencies import get_session


router = APIRouter(tags=["Mesas"])


def _mesa_e_narrador(session: Session, mesa_id: str, ator: Ator, acao: Acao) -> MesaRegistro:
    decisao = Autorizador(session).decidir(
        acao, usuario_id=ator.usuario_id, mesa_id=mesa_id
    )
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Mesa não encontrada." if decisao.ocultar_existencia else decisao.motivo,
        )
    mesa = MesaRepository(session).get(mesa_id)
    assert mesa is not None
    return mesa


@router.post("/mesas", response_model=MesaResumo, status_code=status.HTTP_201_CREATED)
def criar_mesa(
    pedido: CriarMesaRequest,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> MesaResumo:
    nome = pedido.nome.strip()
    if not nome:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Nome da mesa vazio.")
    mesa_id = uuid4().hex
    session.add(MesaRegistro(id=mesa_id, nome=nome, narrador_id=ator.usuario_id))
    session.flush()
    session.add(MembroRegistro(mesa_id=mesa_id, usuario_id=ator.usuario_id, papel="narrador"))
    session.commit()
    return MesaResumo(id=mesa_id, nome=nome, papel="narrador")


@router.get("/mesas", response_model=list[MesaResumo])
def listar_mesas(
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> list[MesaResumo]:
    return [
        MesaResumo(id=mesa.id, nome=mesa.nome, papel=papel)
        for mesa, papel in MesaRepository(session).listar_para_usuario(ator.usuario_id)
    ]


@router.post("/mesas/{mesa_id}/convites", response_model=ConviteCriado, status_code=status.HTTP_201_CREATED)
def criar_convite(
    mesa_id: str,
    pedido: CriarConviteRequest,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> ConviteCriado:
    _mesa_e_narrador(session, mesa_id, ator, Acao.CONVIDAR)
    codigo = secrets.token_urlsafe(32)
    expira_em = datetime.now(UTC) + timedelta(days=pedido.validade_dias)
    session.add(
        ConviteMesaRegistro(
            id=uuid4().hex,
            mesa_id=mesa_id,
            token_hash=sha256(codigo.encode("utf-8")).hexdigest(),
            criado_por=ator.usuario_id,
            expira_em=expira_em,
        )
    )
    session.commit()
    return ConviteCriado(codigo=codigo, expira_em=expira_em)


@router.post("/convites/aceitar", response_model=MesaResumo)
def aceitar_convite(
    pedido: AceitarConviteRequest,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> MesaResumo:
    digest = sha256(pedido.codigo.encode("utf-8")).hexdigest()
    convite = session.scalar(select(ConviteMesaRegistro).where(ConviteMesaRegistro.token_hash == digest))
    agora = datetime.now(UTC)
    validade = convite.expira_em if convite is not None else None
    if validade is not None and validade.tzinfo is None:
        validade = validade.replace(tzinfo=UTC)
    if convite is None or convite.usado_em is not None or validade is None or agora >= validade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convite indisponível.")
    mesa = session.get(MesaRegistro, convite.mesa_id)
    if mesa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convite indisponível.")
    membro = MesaRepository(session).membro(mesa.id, ator.usuario_id)
    if membro is not None and membro.ativo:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Usuário já participa da mesa.")
    resultado = session.execute(
        update(ConviteMesaRegistro)
        .where(
            ConviteMesaRegistro.id == convite.id,
            ConviteMesaRegistro.usado_em.is_(None),
            ConviteMesaRegistro.expira_em > agora,
        )
        .values(usado_em=agora, usado_por=ator.usuario_id)
        .execution_options(synchronize_session=False)
    )
    if resultado.rowcount != 1:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convite indisponível.")
    if membro is None:
        session.add(MembroRegistro(mesa_id=mesa.id, usuario_id=ator.usuario_id, papel="jogador"))
    else:
        membro.ativo = True
        membro.papel = "jogador"
    session.commit()
    return MesaResumo(id=mesa.id, nome=mesa.nome, papel="jogador")


@router.get("/mesas/{mesa_id}/participantes", response_model=list[ParticipanteResumo])
def listar_participantes(
    mesa_id: str,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> list[ParticipanteResumo]:
    decisao = Autorizador(session).decidir(
        Acao.LISTAR_PARTICIPANTES, usuario_id=ator.usuario_id, mesa_id=mesa_id
    )
    if not decisao.permitido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mesa não encontrada.")
    mesas = MesaRepository(session)
    return [
        ParticipanteResumo(usuario_id=participante.usuario_id, papel=participante.papel)
        for participante in mesas.listar_membros(mesa_id)
    ]


@router.delete("/mesas/{mesa_id}/participantes/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_participante(
    mesa_id: str,
    usuario_id: str,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> None:
    _mesa_e_narrador(session, mesa_id, ator, Acao.REMOVER_PARTICIPANTE)
    if usuario_id == ator.usuario_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="O Narrador não pode remover a si mesmo.")
    membro = MesaRepository(session).membro(mesa_id, usuario_id)
    if membro is None or not membro.ativo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participante não encontrado.")
    membro.ativo = False
    session.commit()
