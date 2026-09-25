"""Políticas por mesa e ciclo de vida de personagens próprios."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    CriarPersonagemRequest, DecidirPedidoRequest, FichaContrato,
    PedidoAlteracaoResumo, PersonagemResumo, PoliticaMesaContrato,
    TransferirPersonagemRequest,
)
from cursed_platform.domain.ficha import FichaDraft
from cursed_platform.persistence import MesaRegistro, PedidoAlteracaoRegistro, PersonagemRegistro
from cursed_platform.repositories import FichaRepository, MesaRepository

from .auth import Ator, get_actor
from .dependencies import get_session
from .sheets import FichaSnapshot


router = APIRouter(tags=["Personagens e políticas"])


def _exigir(
    session: Session, acao: Acao, mesa_id: str, ator: Ator,
    personagem_id: str | None = None,
) -> None:
    decisao = Autorizador(session).decidir(
        acao, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=personagem_id,
    )
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Recurso não encontrado." if decisao.ocultar_existencia else decisao.motivo,
        )


def _politica(mesa: MesaRegistro) -> PoliticaMesaContrato:
    return PoliticaMesaContrato(
        permitir_criacao_propria=mesa.permitir_criacao_propria,
        permitir_edicao_propria=mesa.permitir_edicao_propria,
        permitir_exclusao_propria=mesa.permitir_exclusao_propria,
        campos_bloqueados=mesa.campos_bloqueados,
        campos_exigem_aprovacao=mesa.campos_exigem_aprovacao,
    )


def _resumo(pedido: PedidoAlteracaoRegistro) -> PedidoAlteracaoResumo:
    return PedidoAlteracaoResumo(
        id=pedido.id, mesa_id=pedido.mesa_id, personagem_id=pedido.personagem_id,
        solicitante_id=pedido.solicitante_id, versao_base=pedido.versao_base,
        campos_alterados=pedido.campos_alterados, estado=pedido.estado,
        ficha_proposta=FichaContrato.model_validate(pedido.ficha_proposta),
    )


@router.get("/mesas/{mesa_id}/politicas", response_model=PoliticaMesaContrato)
def ler_politicas(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PoliticaMesaContrato:
    _exigir(session, Acao.LER_MESA, mesa_id, ator)
    mesa = session.get(MesaRegistro, mesa_id)
    assert mesa is not None
    return _politica(mesa)


@router.put("/mesas/{mesa_id}/politicas", response_model=PoliticaMesaContrato)
def configurar_politicas(
    mesa_id: str, politica: PoliticaMesaContrato,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PoliticaMesaContrato:
    _exigir(session, Acao.CONFIGURAR_POLITICAS, mesa_id, ator)
    mesa = session.get(MesaRegistro, mesa_id)
    assert mesa is not None
    mesa.permitir_criacao_propria = politica.permitir_criacao_propria
    mesa.permitir_edicao_propria = politica.permitir_edicao_propria
    mesa.permitir_exclusao_propria = politica.permitir_exclusao_propria
    mesa.campos_bloqueados = politica.campos_bloqueados
    mesa.campos_exigem_aprovacao = politica.campos_exigem_aprovacao
    session.commit()
    return _politica(mesa)


def _personagem_resumo(
    personagem: PersonagemRegistro, fichas: FichaRepository | None = None,
) -> PersonagemResumo:
    nome = (personagem.ficha or {}).get("personagem", {}).get("nome")
    return PersonagemResumo(
        id=personagem.id, mesa_id=personagem.mesa_id,
        nome=nome if isinstance(nome, str) and nome.strip() else "Sem nome",
        tipo=personagem.tipo, visibilidade=personagem.visibilidade,
        proprietario_id=personagem.proprietario_id, versao=personagem.versao,
        excluido_em=personagem.excluido_em,
        restauravel_ate=fichas.prazo_restauracao(personagem) if fichas else None,
    )


@router.get("/mesas/{mesa_id}/personagens", response_model=list[PersonagemResumo])
def listar_personagens(
    mesa_id: str, excluidos: bool = False,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[PersonagemResumo]:
    """Personagens que o ator pode abrir; excluídos recuperáveis somente para o Narrador."""
    _exigir(session, Acao.LER_MESA, mesa_id, ator)
    fichas = FichaRepository(session)
    if excluidos:
        _exigir(session, Acao.RESTAURAR_PERSONAGEM, mesa_id, ator)
        agora = datetime.now(UTC)
        return [
            resumo for resumo in (
                _personagem_resumo(p, fichas)
                for p in sorted(fichas.listar_excluidos(mesa_id), key=lambda p: p.id)
            )
            if resumo.restauravel_ate is not None and resumo.restauravel_ate >= agora
        ]
    autorizador = Autorizador(session)
    visiveis = [
        personagem for personagem in fichas.listar(mesa_id)
        if autorizador.decidir(
            Acao.LER_FICHA, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=personagem.id,
        ).permitido
    ]
    return [
        _personagem_resumo(p)
        for p in sorted(visiveis, key=lambda p: (_personagem_resumo(p).nome.casefold(), p.id))
    ]


@router.post(
    "/mesas/{mesa_id}/personagens/{personagem_id}/transferencia", response_model=PersonagemResumo,
)
def transferir_personagem(
    mesa_id: str, personagem_id: str, pedido: TransferirPersonagemRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PersonagemResumo:
    """Narrador define o proprietário; `null` deixa o personagem sob controle exclusivo do Narrador."""
    _exigir(session, Acao.TRANSFERIR_PERSONAGEM, mesa_id, ator)
    fichas = FichaRepository(session)
    if fichas.get(mesa_id, personagem_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado.")
    if pedido.proprietario_id is not None:
        membro = MesaRepository(session).membro(mesa_id, pedido.proprietario_id)
        if membro is None or not membro.ativo:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="O novo proprietário precisa participar da mesa.",
            )
    if not fichas.transferir(mesa_id, personagem_id, pedido.versao_esperada, pedido.proprietario_id):
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.")
    session.commit()
    personagem = fichas.get(mesa_id, personagem_id)
    assert personagem is not None
    session.refresh(personagem)
    return _personagem_resumo(personagem)


@router.post(
    "/mesas/{mesa_id}/personagens/{personagem_id}/restauracao", response_model=PersonagemResumo,
)
def restaurar_personagem(
    mesa_id: str, personagem_id: str,
    versao_esperada: int = Query(ge=0),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PersonagemResumo:
    _exigir(session, Acao.RESTAURAR_PERSONAGEM, mesa_id, ator)
    fichas = FichaRepository(session)
    personagem = fichas.get(mesa_id, personagem_id, incluir_excluido=True)
    if personagem is None or personagem.excluido_em is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado.")
    prazo = fichas.prazo_restauracao(personagem)
    if prazo is None or datetime.now(UTC) > prazo:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Período de retenção encerrado.")
    if not fichas.restaurar(mesa_id, personagem_id, versao_esperada):
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.")
    session.commit()
    session.refresh(personagem)
    return _personagem_resumo(personagem)


@router.post(
    "/mesas/{mesa_id}/personagens", response_model=FichaSnapshot,
    status_code=status.HTTP_201_CREATED,
)
def criar_personagem(
    mesa_id: str, pedido: CriarPersonagemRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> FichaSnapshot:
    _exigir(session, Acao.CRIAR_PERSONAGEM, mesa_id, ator)
    payload = FichaDraft.de_payload(pedido.ficha.model_dump(mode="json")).para_payload()
    nome = payload["personagem"].get("nome")
    if not isinstance(nome, str) or not nome.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Nome do personagem obrigatório.")
    personagem_id = uuid4().hex
    session.add(PersonagemRegistro(
        id=personagem_id, mesa_id=mesa_id, proprietario_id=ator.usuario_id,
        tipo="personagem", visibilidade="mesa", versao=0, ficha=payload,
    ))
    session.commit()
    return FichaSnapshot(
        mesa_id=mesa_id, personagem_id=personagem_id, versao=0,
        ficha=FichaContrato.model_validate(payload),
    )


@router.delete(
    "/mesas/{mesa_id}/personagens/{personagem_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def excluir_personagem(
    mesa_id: str, personagem_id: str,
    versao_esperada: int = Query(ge=0),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> None:
    _exigir(session, Acao.EXCLUIR_PERSONAGEM, mesa_id, ator, personagem_id)
    if not FichaRepository(session).excluir(
        mesa_id, personagem_id, versao_esperada, ator.usuario_id,
    ):
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.")
    session.commit()


@router.get("/mesas/{mesa_id}/solicitacoes", response_model=list[PedidoAlteracaoResumo])
def listar_solicitacoes(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[PedidoAlteracaoResumo]:
    _exigir(session, Acao.DECIDIR_ALTERACAO, mesa_id, ator)
    pedidos = session.scalars(
        select(PedidoAlteracaoRegistro)
        .where(PedidoAlteracaoRegistro.mesa_id == mesa_id, PedidoAlteracaoRegistro.estado == "pendente")
        .order_by(PedidoAlteracaoRegistro.criado_em, PedidoAlteracaoRegistro.id)
    )
    return [_resumo(pedido) for pedido in pedidos]


@router.post(
    "/mesas/{mesa_id}/solicitacoes/{pedido_id}/decisao",
    response_model=PedidoAlteracaoResumo,
)
def decidir_solicitacao(
    mesa_id: str, pedido_id: str, decisao: DecidirPedidoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PedidoAlteracaoResumo:
    _exigir(session, Acao.DECIDIR_ALTERACAO, mesa_id, ator)
    pedido = session.scalar(
        select(PedidoAlteracaoRegistro)
        .where(PedidoAlteracaoRegistro.id == pedido_id, PedidoAlteracaoRegistro.mesa_id == mesa_id)
        .with_for_update()
    )
    if pedido is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada.")
    if pedido.estado != "pendente":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Solicitação já decidida.")
    if decisao.aprovar and not FichaRepository(session).substituir_se_versao(
        mesa_id, pedido.personagem_id, pedido.versao_base, pedido.ficha_proposta,
    ):
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ficha alterada desde a solicitação.")
    pedido.estado = "aprovado" if decisao.aprovar else "rejeitado"
    pedido.decidido_por = ator.usuario_id
    pedido.decidido_em = datetime.now(UTC)
    session.commit()
    return _resumo(pedido)
