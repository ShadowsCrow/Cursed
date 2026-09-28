"""Jornada inicial de criação, convite e participação em mesas."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256
import secrets
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from cursed_platform import auditoria, corpos, perfis
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    AceitarConviteRequest, AtualizarMesaRequest, ConviteCriado, CriarConviteRequest,
    CriarMesaRequest, MesaDetalhe, MesaResumo, ParticipanteResumo,
)
from cursed_platform.persistence import ConviteMesaRegistro, MembroRegistro, MesaRegistro
from cursed_platform.repositories import MesaRepository

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session


router = APIRouter(tags=["Mesas"])


def _resumo(mesa: MesaRegistro, papel: str) -> MesaResumo:
    return MesaResumo(id=mesa.id, nome=mesa.nome, papel=papel, sistema=mesa.sistema or "cursed",
                      sinopse=mesa.sinopse, capa_objeto=mesa.capa_objeto)


def _participantes(session: Session, mesa_id: str) -> list[ParticipanteResumo]:
    membros = MesaRepository(session).listar_membros(mesa_id)
    ids = [m.usuario_id for m in membros]
    conhecidos, com_foto = perfis.nomes(session, ids), perfis.fotos(session, ids)
    return [
        ParticipanteResumo(usuario_id=m.usuario_id, papel=m.papel, nome=conhecidos.get(m.usuario_id),
                           tem_foto=m.usuario_id in com_foto)
        for m in membros
    ]


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
    correlacao: str = Depends(get_correlacao),
) -> MesaResumo:
    nome = pedido.nome.strip()
    if not nome:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Nome da mesa vazio.")
    mesa_id = uuid4().hex
    mesa = MesaRegistro(id=mesa_id, nome=nome, narrador_id=ator.usuario_id, sistema="cursed")
    session.add(mesa)
    session.flush()
    session.add(MembroRegistro(mesa_id=mesa_id, usuario_id=ator.usuario_id, papel="narrador"))
    session.flush()
    corpos.garantir(session, mesa_id)
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="mesa.criada",
        relevancia="organizacional", resumo=f"Mesa criada: {nome}"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return _resumo(mesa, "narrador")


@router.get("/mesas", response_model=list[MesaResumo])
def listar_mesas(
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> list[MesaResumo]:
    return [_resumo(mesa, papel) for mesa, papel in MesaRepository(session).listar_para_usuario(ator.usuario_id)]


@router.get("/mesas/{mesa_id}", response_model=MesaDetalhe)
def detalhar_mesa(
    mesa_id: str,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> MesaDetalhe:
    """Apresentação da campanha: dados, capa e participantes com apelido e foto."""
    mesa = _mesa_e_narrador(session, mesa_id, ator, Acao.LER_MESA)
    membro = MesaRepository(session).membro(mesa_id, ator.usuario_id)
    assert membro is not None
    return MesaDetalhe(**_resumo(mesa, membro.papel).model_dump(), participantes=_participantes(session, mesa_id))


@router.put("/mesas/{mesa_id}", response_model=MesaResumo)
def atualizar_mesa(
    mesa_id: str,
    pedido: AtualizarMesaRequest,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> MesaResumo:
    mesa = _mesa_e_narrador(session, mesa_id, ator, Acao.EDITAR_CAMPANHA)
    nome = pedido.nome.strip()
    if not nome:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Nome da campanha vazio.")
    sinopse = (pedido.sinopse or "").strip() or None
    alterados = [campo for campo, antes, depois in (("nome", mesa.nome, nome), ("sinopse", mesa.sinopse, sinopse))
                 if antes != depois]
    mesa.nome, mesa.sinopse = nome, sinopse
    if alterados:
        auditoria.registrar(
            session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="mesa.atualizada",
            relevancia="organizacional", resumo=f"Campanha atualizada: {', '.join(alterados)}",
            detalhes={"campos": alterados}, correlacao_id=correlacao,
        )
    session.commit()
    return _resumo(mesa, "narrador")


@router.post("/mesas/{mesa_id}/convites", response_model=ConviteCriado, status_code=status.HTTP_201_CREATED)
def criar_convite(
    mesa_id: str,
    pedido: CriarConviteRequest,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
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
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="convite.criado",
        relevancia="organizacional", resumo=f"Convite criado, válido por {pedido.validade_dias} dia(s)",
        visibilidade="narrador", correlacao_id=correlacao,
    )
    session.commit()
    return ConviteCriado(codigo=codigo, expira_em=expira_em)


@router.post("/convites/aceitar", response_model=MesaResumo)
def aceitar_convite(
    pedido: AceitarConviteRequest,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
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
    session.flush()
    auditoria.registrar(
        session, mesa_id=mesa.id, ator_id=ator.usuario_id, categoria="mesa", acao="participante.entrou",
        relevancia="organizacional", resumo="Participante entrou na mesa por convite",
        alvo_tipo="participante", alvo_id=ator.usuario_id, correlacao_id=correlacao,
    )
    session.commit()
    return _resumo(mesa, "jogador")


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
    return _participantes(session, mesa_id)


@router.delete("/mesas/{mesa_id}/participantes/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_participante(
    mesa_id: str,
    usuario_id: str,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> None:
    _mesa_e_narrador(session, mesa_id, ator, Acao.REMOVER_PARTICIPANTE)
    if usuario_id == ator.usuario_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="O Narrador não pode remover a si mesmo.")
    membro = MesaRepository(session).membro(mesa_id, usuario_id)
    if membro is None or not membro.ativo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participante não encontrado.")
    membro.ativo = False
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="permissao", acao="participante.removido",
        relevancia="organizacional", resumo="Participante removido da mesa",
        alvo_tipo="participante", alvo_id=usuario_id, correlacao_id=correlacao,
    )
    session.commit()
