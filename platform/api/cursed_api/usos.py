"""Cartas usadas na cena (cartas-na-cena): a mão de cartas de um personagem, usar uma carta, o histórico de usos e o
desfazer do Narrador.

O dono do personagem ou o Narrador usa; o servidor valida posse, tipo, vez, ação e PP, debita o PP com auditoria e
avisa a mesa (`sala.uso`). Usos de personagem oculto vão só ao canal do Narrador.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, recursos_ficha, turno, uso_cartas
from cursed_platform.contracts import CartaDaMao, MaoDeCartas, UsarCartaRequest, UsoDeCarta
from cursed_platform.ficha_viva import ConflitoVersao
from cursed_platform.persistence import PersonagemRegistro, UsoDeCartaRegistro
from cursed_platform.sala import Leitor, controla_personagem

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session
from .room import _leitor


router = APIRouter(tags=["Sala"])


def _personagem(session: Session, mesa_id: str, personagem_id: str, leitor: Leitor) -> PersonagemRegistro:
    personagem = session.get(PersonagemRegistro, personagem_id)
    if personagem is None or personagem.mesa_id != mesa_id or personagem.excluido_em is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personagem não encontrado.")
    if not controla_personagem(session, leitor, personagem):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Só quem controla o personagem, ou o Narrador.")
    return personagem


def _erro(erro: Exception, session: Session) -> HTTPException:
    session.rollback()
    if isinstance(erro, (uso_cartas.SemPermissao, uso_cartas.ForaDaVez)):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(erro))
    if isinstance(erro, (uso_cartas.Conflito, recursos_ficha.RecursoInsuficiente, turno.AcaoGasta)):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    if isinstance(erro, ConflitoVersao):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A ficha mudou enquanto a carta era usada; tente de novo.")
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))


ERROS = (uso_cartas.UsoInvalido, uso_cartas.SemPermissao, uso_cartas.ForaDaVez, uso_cartas.Conflito,
         recursos_ficha.RecursoInvalido, recursos_ficha.RecursoInsuficiente, turno.AcaoGasta, ConflitoVersao)


def _nome(personagem: PersonagemRegistro) -> str:
    return auditoria.nome_personagem(personagem)


def _resposta(session: Session, uso: UsoDeCartaRegistro) -> UsoDeCarta:
    return UsoDeCarta(**uso_cartas.para_resposta(session, uso))


@router.get("/mesas/{mesa_id}/sala/mao", response_model=MaoDeCartas)
def ler_mao(
    mesa_id: str, personagem_id: str = Query(min_length=1, max_length=100),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> MaoDeCartas:
    """A mão de cartas jogáveis do personagem; o jogador só pede a dos próprios personagens."""
    leitor = _leitor(session, mesa_id, ator)
    personagem = _personagem(session, mesa_id, personagem_id, leitor)
    ficha = personagem.ficha or {}
    return MaoDeCartas(
        personagem_id=personagem.id, personagem_nome=_nome(personagem),
        pp_atual=recursos_ficha.atual(ficha, "pp"), pp_maximo=recursos_ficha.maximo(ficha, "pp"),
        cartas=[CartaDaMao(**vars(carta)) for carta in uso_cartas.mao(session, mesa_id, leitor, personagem)],
    )


@router.post("/mesas/{mesa_id}/sala/usos", response_model=UsoDeCarta, status_code=status.HTTP_201_CREATED)
def usar_carta(
    mesa_id: str, pedido: UsarCartaRequest, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> UsoDeCarta:
    """Usa a carta pelo personagem: valida, debita o PP, gasta a ação do turno e registra."""
    leitor = _leitor(session, mesa_id, ator)
    personagem = _personagem(session, mesa_id, pedido.personagem_id, leitor)
    try:
        uso = uso_cartas.usar(session, mesa_id, leitor, personagem, pedido.versao_id, pedido.alvos, correlacao_id=correlacao)
    except ERROS as erro:
        raise _erro(erro, session) from None
    alvos = ", ".join(a["rotulo"] for a in uso.alvos) or "ninguém"
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="carta.usada", relevancia="mecanica",
        personagem=personagem, alvo_tipo="uso", alvo_id=str(uso.id),
        resumo=f"{_nome(personagem)} usou {uso.titulo} ({uso.custo_pago} PP) em {alvos}", correlacao_id=correlacao,
        detalhes={"uso_id": uso.id, "versao_id": uso.versao_id, "titulo": uso.titulo, "custo_pago": uso.custo_pago,
                  "acao": uso.acao, "alvos": uso.alvos, "rodada": uso.rodada},
        visibilidade="narrador" if uso_cartas.oculto(session, personagem) else "mesa",
    )
    session.commit()
    session.refresh(uso)
    return _resposta(session, uso)


@router.get("/mesas/{mesa_id}/sala/usos", response_model=list[UsoDeCarta])
def listar_usos(
    mesa_id: str, depois: int | None = Query(default=None, ge=0),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[UsoDeCarta]:
    """Usos da mesa depois do id dado, em ordem (até 50). O jogador não recebe usos de personagem oculto."""
    leitor = _leitor(session, mesa_id, ator)
    return [_resposta(session, uso) for uso in uso_cartas.listar(session, mesa_id, leitor, depois)]


@router.post("/mesas/{mesa_id}/sala/usos/{uso_id}/desfazer", response_model=UsoDeCarta)
def desfazer_uso(
    mesa_id: str, uso_id: int, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> UsoDeCarta:
    """Só o Narrador desfaz o último uso de um personagem, na mesma rodada: o PP e a ação voltam."""
    leitor = _leitor(session, mesa_id, ator)
    uso = session.get(UsoDeCartaRegistro, uso_id)
    if uso is None or uso.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uso não encontrado.")
    try:
        uso_cartas.desfazer(session, mesa_id, leitor, uso, correlacao_id=correlacao)
    except ERROS as erro:
        raise _erro(erro, session) from None
    personagem = session.get(PersonagemRegistro, uso.personagem_id)
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="carta.uso_desfeito",
        relevancia="mecanica", personagem=personagem, alvo_tipo="uso", alvo_id=str(uso.id),
        resumo=f"Uso desfeito: {_nome(personagem) if personagem else 'Personagem'}, {uso.titulo} ({uso.custo_pago} PP devolvidos)",
        correlacao_id=correlacao, detalhes={"uso_id": uso.id, "titulo": uso.titulo, "custo_pago": uso.custo_pago},
    )
    session.commit()
    session.refresh(uso)
    return _resposta(session, uso)
