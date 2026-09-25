"""Linha do tempo de auditoria da mesa e correções rastreáveis."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, correcoes, ficha_viva
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    CorrigirEventoRequest, EventoAuditoriaResumo, MudancaAuditoria, PaginaAuditoria,
)
from cursed_platform.persistence import EventoAuditoriaRegistro

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session


router = APIRouter(prefix="/mesas/{mesa_id}/auditoria", tags=["Auditoria"])


def _resumo(
    evento: EventoAuditoriaRegistro, corrigido_por: list[int], narrador: bool,
) -> EventoAuditoriaResumo:
    detalhes = evento.detalhes or {}
    return EventoAuditoriaResumo(
        id=evento.id, ocorrido_em=evento.ocorrido_em, sessao_id=evento.sessao_id, ator_id=evento.ator_id,
        origem=evento.origem, categoria=evento.categoria, acao=evento.acao, relevancia=evento.relevancia,
        personagem_id=evento.personagem_id, alvo_tipo=evento.alvo_tipo, alvo_id=evento.alvo_id,
        resumo=evento.resumo,
        mudancas=[
            MudancaAuditoria(
                campo=m["campo"], antes=m.get("antes"), depois=m.get("depois"),
                rotulo=m.get("rotulo"), completo=m.get("completo", True),
            )
            for m in detalhes.get("mudancas") or []
        ],
        motivo=detalhes.get("motivo"), correlacao_id=evento.correlacao_id,
        corrige_evento_id=evento.corrige_evento_id, corrigido_por=corrigido_por,
        corrigivel=narrador and correcoes.corrigivel(evento),
    )


@router.get("", response_model=PaginaAuditoria)
def listar_eventos(
    mesa_id: str,
    sessao_id: str | None = None,
    ator_id: str | None = None,
    personagem_id: str | None = None,
    categoria: Literal["mesa", "permissao", "personagem", "ficha", "inventario", "efeito"] | None = None,
    relevancia: Literal["mecanica", "narrativa", "organizacional"] | None = None,
    antes_de: int | None = Query(default=None, ge=1),
    limite: int = Query(default=50, ge=1, le=200),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PaginaAuditoria:
    """Eventos do mais recente ao mais antigo; jogadores recebem somente o que podem ver."""
    resultado = auditoria.consultar(
        session, mesa_id=mesa_id, usuario_id=ator.usuario_id,
        filtros=auditoria.FiltrosAuditoria(sessao_id, ator_id, personagem_id, categoria, relevancia),
        antes_de=antes_de, limite=limite,
    )
    if resultado is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mesa não encontrada.")
    eventos, proximo = resultado
    narrador = Autorizador(session).decidir(
        Acao.CORRIGIR_EVENTO, usuario_id=ator.usuario_id, mesa_id=mesa_id,
    ).permitido
    visiveis = {e.id for e in eventos}
    ligacoes = correcoes.correcoes_de(session, [e.id for e in eventos])
    return PaginaAuditoria(
        eventos=[
            # Correções que o leitor não pode ver também não são mencionadas.
            _resumo(e, [c for c in ligacoes.get(e.id, []) if narrador or c in visiveis], narrador)
            for e in eventos
        ],
        proximo_cursor=proximo,
    )


@router.post("/{evento_id}/correcao", response_model=EventoAuditoriaResumo, status_code=status.HTTP_201_CREATED)
def corrigir_evento(
    mesa_id: str, evento_id: int, pedido: CorrigirEventoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EventoAuditoriaResumo:
    decisao = Autorizador(session).decidir(Acao.CORRIGIR_EVENTO, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Mesa não encontrada." if decisao.ocultar_existencia else decisao.motivo,
        )
    evento = session.get(EventoAuditoriaRegistro, evento_id)
    if evento is None or evento.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")
    try:
        correcao = correcoes.corrigir(
            session, evento, ator_id=ator.usuario_id, motivo=pedido.motivo,
            versao_esperada=pedido.versao_esperada, correlacao_id=correlacao,
        )
    except correcoes.CorrecaoIndisponivel as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    except correcoes.CorrecaoConflitante as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from None
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão do personagem desatualizada.") from None
    session.commit()
    return _resumo(correcao, [], True)
