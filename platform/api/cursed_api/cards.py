"""Catálogo de cartas do Narrador: rascunho, validação, publicação, versões e importação."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import auditoria, cartas
from cursed_platform.migracao_ativos import AtivoInvalido
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    CartaDefinicaoResumo, CartaVersaoResumo, CriarCartaRequest, ImportarCartaRequest, PreviaImportacaoCarta,
    PublicarCartaRequest, SalvarRascunhoRequest, ValidacaoCarta,
)
from cursed_platform.persistence import CartaDefinicaoRegistro, CartaVersaoRegistro

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session


router = APIRouter(prefix="/mesas/{mesa_id}/cartas", tags=["Cartas"])


def _exigir_narrador(session: Session, mesa_id: str, ator: Ator) -> None:
    decisao = Autorizador(session).decidir(Acao.GERENCIAR_CARTAS, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Mesa não encontrada." if decisao.ocultar_existencia else decisao.motivo,
        )


def _definicao(session: Session, mesa_id: str, carta_id: str) -> CartaDefinicaoRegistro:
    definicao = session.get(CartaDefinicaoRegistro, carta_id)
    if definicao is None or definicao.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta não encontrada.")
    return definicao


def versao_resumo(versao: CartaVersaoRegistro) -> CartaVersaoResumo:
    return CartaVersaoResumo(
        id=versao.id, definicao_id=versao.definicao_id, numero=versao.numero, tipo=versao.tipo,
        conteudo=versao.conteudo, procedencia=versao.procedencia, revisao_pendente=versao.revisao_pendente,
        publicado_por=versao.publicado_por, publicado_em=versao.publicado_em,
    )


def _resumo(session: Session, definicao: CartaDefinicaoRegistro) -> CartaDefinicaoResumo:
    publicada = cartas.versao_publicada(session, definicao)
    rascunho = definicao.rascunho or {}
    return CartaDefinicaoResumo(
        id=definicao.id, tipo=definicao.tipo, versao=definicao.versao, rascunho=rascunho.get("conteudo"),
        procedencia_rascunho=rascunho.get("procedencia") or {}, versao_publicada=definicao.versao_publicada,
        publicada=versao_resumo(publicada) if publicada is not None else None, arquivada=definicao.arquivada,
    )


@router.get("", response_model=list[CartaDefinicaoResumo])
def listar_catalogo(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[CartaDefinicaoResumo]:
    _exigir_narrador(session, mesa_id, ator)
    definicoes = session.scalars(
        select(CartaDefinicaoRegistro).where(CartaDefinicaoRegistro.mesa_id == mesa_id)
        .order_by(CartaDefinicaoRegistro.criado_em, CartaDefinicaoRegistro.id)
    )
    return [_resumo(session, d) for d in definicoes]


@router.post("", response_model=CartaDefinicaoResumo, status_code=status.HTTP_201_CREATED)
def criar_carta(
    mesa_id: str, pedido: CriarCartaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> CartaDefinicaoResumo:
    _exigir_narrador(session, mesa_id, ator)
    definicao = cartas.criar_definicao(
        session, mesa_id=mesa_id, tipo=pedido.tipo, rascunho=pedido.rascunho, ator_id=ator.usuario_id,
    )
    session.commit()
    return _resumo(session, definicao)


@router.put("/{carta_id}/rascunho", response_model=CartaDefinicaoResumo)
def salvar_rascunho(
    mesa_id: str, carta_id: str, pedido: SalvarRascunhoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> CartaDefinicaoResumo:
    """Rascunhos não geram auditoria: somente a publicação é uma alteração confirmada."""
    _exigir_narrador(session, mesa_id, ator)
    definicao = _definicao(session, mesa_id, carta_id)
    try:
        cartas.salvar_rascunho(session, definicao, pedido.rascunho, pedido.versao_esperada)
    except cartas.ConflitoRascunho:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Rascunho alterado por outra edição.") from None
    session.commit()
    return _resumo(session, definicao)


@router.post("/{carta_id}/validacao", response_model=ValidacaoCarta)
def validar_rascunho(
    mesa_id: str, carta_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> ValidacaoCarta:
    _exigir_narrador(session, mesa_id, ator)
    definicao = _definicao(session, mesa_id, carta_id)
    _, validacao = cartas.validar(definicao.tipo, (definicao.rascunho or {}).get("conteudo"), mesa_id)
    return validacao


@router.post("/{carta_id}/publicacao", response_model=CartaVersaoResumo, status_code=status.HTTP_201_CREATED)
def publicar_carta(
    mesa_id: str, carta_id: str, pedido: PublicarCartaRequest,
    request: Request,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> CartaVersaoResumo:
    _exigir_narrador(session, mesa_id, ator)
    definicao = _definicao(session, mesa_id, carta_id)
    try:
        versao, validacao = cartas.publicar(
            session, definicao, ator_id=ator.usuario_id, versao_esperada=pedido.versao_esperada,
            promover_ativos=pedido.promover_ativos,
            armazenamento=request.app.state.armazenamento_objetos,
        )
    except cartas.ConflitoRascunho:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Rascunho alterado por outra edição.") from None
    except AtivoInvalido as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    if versao is None:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"mensagem": "A carta tem problemas de validação.",
                    "problemas": [p.model_dump() for p in validacao.problemas]},
        )
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="carta.publicada",
        relevancia="mecanica", alvo_tipo="carta", alvo_id=definicao.id, visibilidade="narrador",
        resumo=f"Carta publicada: {versao.conteudo['titulo']} (versão {versao.numero})"[:500],
        detalhes={"versao_id": versao.id, "revisao_pendente": versao.revisao_pendente},
        correlacao_id=correlacao,
    )
    session.commit()
    return versao_resumo(versao)


@router.get("/{carta_id}/versoes", response_model=list[CartaVersaoResumo])
def listar_versoes(
    mesa_id: str, carta_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[CartaVersaoResumo]:
    _exigir_narrador(session, mesa_id, ator)
    _definicao(session, mesa_id, carta_id)
    return [
        versao_resumo(v) for v in session.scalars(
            select(CartaVersaoRegistro).where(CartaVersaoRegistro.definicao_id == carta_id)
            .order_by(CartaVersaoRegistro.numero)
        )
    ]


def _previa(codigo: str, mesa_id: str) -> tuple[str, dict, list[str], dict, ValidacaoCarta]:
    try:
        tipo, rascunho, avisos, procedencia = cartas.rascunho_de_codigo(codigo)
    except ValueError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    _, validacao = cartas.validar(tipo, rascunho, mesa_id)
    return tipo, rascunho, avisos, procedencia, validacao


@router.post("/importacoes/previa", response_model=PreviaImportacaoCarta)
def previsualizar_importacao_carta(
    mesa_id: str, pedido: ImportarCartaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PreviaImportacaoCarta:
    """Mostra conteúdo, procedência e avisos sem alterar o catálogo."""
    _exigir_narrador(session, mesa_id, ator)
    tipo, rascunho, avisos, _, validacao = _previa(pedido.codigo, mesa_id)
    return PreviaImportacaoCarta(tipo=tipo, rascunho=rascunho, validacao=validacao, avisos=avisos)


@router.post("/importacoes", response_model=CartaDefinicaoResumo, status_code=status.HTTP_201_CREATED)
def importar_carta(
    mesa_id: str, pedido: ImportarCartaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> CartaDefinicaoResumo:
    """Cria um rascunho a partir do código; publicar continua sendo uma decisão do Narrador."""
    _exigir_narrador(session, mesa_id, ator)
    tipo, rascunho, _, procedencia, validacao = _previa(pedido.codigo, mesa_id)
    if not validacao.valida:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"mensagem": "O conteúdo importado é inválido.",
                    "problemas": [p.model_dump() for p in validacao.problemas]},
        )
    definicao = cartas.criar_definicao(
        session, mesa_id=mesa_id, tipo=tipo, rascunho=rascunho, ator_id=ator.usuario_id,
        procedencia={**procedencia, "autor": ator.usuario_id},
    )
    session.commit()
    return _resumo(session, definicao)
