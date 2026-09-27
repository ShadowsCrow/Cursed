"""Descanso administrado pelo Narrador: prévia sem gravação e confirmação transacional."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, catalogos
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    ConfirmarDescansoRequest, PreviaDescansoRequest, ResultadoDescansoPersonagem, ResultadoDescansoResumo,
    ResultadoRecursoDescanso, ResultadoTrilhaDescanso,
)
from cursed_platform.domain import descanso, recursos
from cursed_platform.domain.ficha import FichaDraft
from cursed_platform.persistence import PersonagemRegistro
from cursed_platform.repositories import FichaRepository

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session


router = APIRouter(prefix="/mesas/{mesa_id}/descansos", tags=["Ferramentas do Narrador"])


def _calcular(
    session: Session, mesa_id: str, pedido: PreviaDescansoRequest, ator: Ator,
) -> tuple[descanso.ParametrosDescanso, list[tuple[PersonagemRegistro, descanso.ResultadoDescanso]]]:
    decisao = Autorizador(session).decidir(Acao.ADMINISTRAR_DESCANSO, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Mesa não encontrada." if decisao.ocultar_existencia else decisao.motivo,
        )
    parametros = descanso.ParametrosDescanso(pedido.tipo, pedido.conforto, pedido.seguranca)
    fichas = FichaRepository(session)
    calculados = []
    try:
        parametros.validar()
        for alvo in pedido.alvos:
            personagem = fichas.get(mesa_id, alvo.personagem_id)
            if personagem is None:
                raise ValueError(f"Personagem indisponível para o descanso: {alvo.personagem_id}.")
            ficha = FichaDraft.de_payload(personagem.ficha).para_payload()
            calculados.append((personagem, descanso.calcular(
                ficha, parametros, calculado=recursos.calcular(ficha, catalogos.obter()),
                foco=alvo.foco, ajustes=dict(alvo.ajustes),
            )))
    except ValueError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    return parametros, calculados


def _resumo(
    parametros: descanso.ParametrosDescanso,
    calculados: list[tuple[PersonagemRegistro, descanso.ResultadoDescanso]],
) -> ResultadoDescansoResumo:
    return ResultadoDescansoResumo(
        tipo=parametros.tipo, conforto=parametros.conforto, seguranca=parametros.seguranca,
        permite_foco=parametros.permite_foco,
        resultados=[
            ResultadoDescansoPersonagem(
                personagem_id=personagem.id, nome=auditoria.nome_personagem(personagem), versao=personagem.versao,
                foco=resultado.foco,
                recursos=[ResultadoRecursoDescanso(**vars(r)) for r in resultado.recursos],
                trilhas=[ResultadoTrilhaDescanso(**vars(t)) for t in resultado.trilhas],
                avisos=resultado.avisos, altera=resultado.altera,
            )
            for personagem, resultado in calculados
        ],
    )


@router.post("/previa", response_model=ResultadoDescansoResumo)
def previsualizar_descanso(
    mesa_id: str, pedido: PreviaDescansoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> ResultadoDescansoResumo:
    """Resultado previsto por personagem; nada é gravado."""
    parametros, calculados = _calcular(session, mesa_id, pedido, ator)
    return _resumo(parametros, calculados)


@router.post("", response_model=ResultadoDescansoResumo)
def confirmar_descanso(
    mesa_id: str, pedido: ConfirmarDescansoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ResultadoDescansoResumo:
    """Recalcula no servidor e aplica a todos os alvos, ou a nenhum."""
    parametros, calculados = _calcular(session, mesa_id, pedido, ator)
    desatualizados = [
        auditoria.nome_personagem(p) for p, _ in calculados if pedido.versoes.get(p.id) != p.versao
    ]
    if desatualizados:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Fichas alteradas desde a prévia: {', '.join(desatualizados)}. Revise e confirme novamente.",
        )
    fichas = FichaRepository(session)
    motivo = (pedido.motivo or "").strip() or None
    rotulo = "Descanso Curto" if parametros.tipo == "curto" else (
        f"Descanso Longo (Conforto {parametros.conforto}, Segurança {parametros.seguranca})"
    )
    for personagem, resultado in calculados:
        if not resultado.altera:
            continue
        anterior = FichaDraft.de_payload(personagem.ficha).para_payload()
        nova = descanso.aplicar(anterior, resultado)
        if not fichas.substituir_se_versao(mesa_id, personagem.id, personagem.versao, nova):
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ficha alterada durante a confirmação: {auditoria.nome_personagem(personagem)}.",
            )
        alteracoes = auditoria.mudancas(anterior, nova)
        auditoria.registrar(
            session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="ficha", acao="descanso.aplicado",
            relevancia="mecanica", personagem=personagem,
            resumo=(f"{auditoria.nome_personagem(personagem)}: {rotulo}" + (f" — {motivo}" if motivo else ""))[:500],
            mudancas=alteracoes,
            detalhes={
                "motivo": motivo, "tipo": parametros.tipo, "conforto": parametros.conforto,
                "seguranca": parametros.seguranca, "foco": resultado.foco,
                "calculado": {r.recurso: r.calculado for r in resultado.recursos}
                | {t.trilha: t.calculado for t in resultado.trilhas},
                "aplicado": {r.recurso: r.aplicado for r in resultado.recursos}
                | {t.trilha: t.aplicado for t in resultado.trilhas},
            },
            correlacao_id=correlacao,
        )
    session.commit()
    for personagem, _ in calculados:
        session.refresh(personagem)
    return _resumo(parametros, calculados)
