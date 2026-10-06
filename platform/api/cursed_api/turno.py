"""Modo turno da Sala (modo-de-turno): entrar, rolar iniciativa, começar, passar a vez e sair.

O Narrador conduz; o jogador só rola a iniciativa dos próprios personagens. A rolagem segue o caminho das demais
(`rolagens.rolar`), com Raciocínio e Prontidão da ficha como parcelas e a marca de iniciativa. Cada mudança avisa a
mesa (`sala.turno`) e entra no registro.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, criticos, preferencias_sala, rolagens, turno
from cursed_platform.contracts import (
    EstadoDoTurno, IniciativaRolada, RolagemDeDados, RolarDadosRequest, RolarIniciativaRequest,
)
from cursed_platform.persistence import CombateRegistro, ParticipanteCombateRegistro, PersonagemRegistro
from cursed_platform.sala import Leitor

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session
from .live_sheet import deslocamento_da_ficha
from .room import _exigir_narrador, _leitor, _termos_da_ficha


router = APIRouter(tags=["Sala"])

ATRIBUTO = "atributo:raciocinio"
PERICIA = "pericia:prontidao"


def _estado(session: Session, mesa_id: str, ator: Ator, narrador: bool) -> EstadoDoTurno:
    return EstadoDoTurno(**turno.estado(session, mesa_id, Leitor(ator.usuario_id, narrador),
                                        deslocamento_da_ficha(session, mesa_id)))


def _erro(erro: Exception, session: Session) -> HTTPException:
    session.rollback()
    if isinstance(erro, turno.ConflitoTurno):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))


ERROS = (turno.TurnoInvalido, turno.ConflitoTurno)


def _aberto(session: Session, mesa_id: str) -> CombateRegistro:
    combate = turno.aberto(session, mesa_id)
    if combate is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Não há modo turno aberto.")
    return combate


def _registrar(session: Session, mesa_id: str, ator: Ator, acao: str, resumo: str, correlacao: str,
               combate: CombateRegistro, **detalhes) -> None:
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao=acao, relevancia="narrativa",
        alvo_tipo="combate", alvo_id=combate.id, resumo=resumo, correlacao_id=correlacao, detalhes=detalhes,
    )


@router.get("/mesas/{mesa_id}/sala/turno", response_model=EstadoDoTurno)
def ler_turno(mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session)) -> EstadoDoTurno:
    leitor = _leitor(session, mesa_id, ator)
    return _estado(session, mesa_id, ator, leitor.narrador)


@router.post("/mesas/{mesa_id}/sala/turno", response_model=EstadoDoTurno, status_code=status.HTTP_201_CREATED)
def entrar_em_modo_turno(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EstadoDoTurno:
    """Só o Narrador, com sessão em andamento e cena ativa com personagens."""
    _exigir_narrador(session, mesa_id, ator)
    try:
        combate = turno.entrar(session, mesa_id, ator.usuario_id)
    except ERROS as erro:
        raise _erro(erro, session) from None
    quantos = len(turno.participantes(session, combate))
    _registrar(session, mesa_id, ator, "turno.aberto", f"Modo turno: {quantos} participantes rolam iniciativa",
               correlacao, combate, participantes=quantos)
    session.commit()
    return _estado(session, mesa_id, ator, True)


def _rolar(session: Session, mesa_id: str, ator: Ator, narrador: bool, combate: CombateRegistro,
           participante: ParticipanteCombateRegistro) -> RolagemDeDados:
    """Sorteia `1d20 + Raciocínio + Prontidão` pela ficha e registra no participante. Rolagem do Narrador por NPC ou
    monstro sai oculta dos jogadores."""
    if participante.total is not None:
        raise turno.ConflitoTurno("Este participante já rolou a iniciativa.")
    personagem = session.get(PersonagemRegistro, participante.personagem_id)
    comando = RolarDadosRequest(dados=[{"faces": 20, "quantidade": 1}], personagem_id=participante.personagem_id,
                                atributo=ATRIBUTO, pericia=PERICIA)
    try:
        termos = _termos_da_ficha(session, mesa_id, ator, comando)
    except HTTPException as erro:
        # Diz qual valor falta, sem inferir nenhum (regras: nunca inventar valor mecânico).
        if erro.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT:
            detalhe = str(erro.detail)
            falta = "Raciocínio" if detalhe.startswith(("Atributo", "Raciocínio")) else "Prontidão"
            raise HTTPException(status_code=erro.status_code,
                                detail=f"A ficha não tem valor de {falta} para a iniciativa.") from None
        raise
    valores = {t["chave"]: t["valor"] for t in termos}
    oculta = narrador and (personagem is None or personagem.proprietario_id is None)
    rolagem = rolagens.rolar(
        session, mesa_id, ator.usuario_id, {20: 1}, 0, oculta=oculta, narrador=narrador,
        personagem_id=participante.personagem_id, termos=termos,
        faixa=criticos.faixa_do_personagem(session, mesa_id, participante.personagem_id), finalidade="iniciativa",
    )
    turno.registrar_iniciativa(session, combate, participante, rolagem_id=rolagem.id, total=rolagem.total,
                               raciocinio=valores[ATRIBUTO], prontidao=valores[PERICIA])
    return rolagem


@router.post("/mesas/{mesa_id}/sala/turno/iniciativa", response_model=IniciativaRolada,
             status_code=status.HTTP_201_CREATED)
def rolar_iniciativa(
    mesa_id: str, pedido: RolarIniciativaRequest, ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> IniciativaRolada:
    """O jogador rola pelos próprios personagens; o Narrador, por qualquer participante."""
    leitor = _leitor(session, mesa_id, ator)
    combate = _aberto(session, mesa_id)
    participante = session.get(ParticipanteCombateRegistro, pedido.participante_id)
    if participante is None or participante.combate_id != combate.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participante não encontrado.")
    personagem = session.get(PersonagemRegistro, participante.personagem_id)
    if not leitor.narrador and (personagem is None or personagem.proprietario_id != ator.usuario_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você só rola a iniciativa dos seus personagens.")
    try:
        rolagem = _rolar(session, mesa_id, ator, leitor.narrador, combate, participante)
    except ERROS as erro:
        raise _erro(erro, session) from None
    session.commit()
    session.refresh(rolagem)
    destaque = preferencias_sala.destaque_ligado(session, mesa_id)
    return IniciativaRolada(estado=_estado(session, mesa_id, ator, leitor.narrador),
                            rolagens=[RolagemDeDados(**rolagens.para_resposta(rolagem, destaque))])


@router.post("/mesas/{mesa_id}/sala/turno/iniciativa/npcs", response_model=IniciativaRolada,
             status_code=status.HTTP_201_CREATED)
def rolar_iniciativa_dos_npcs(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> IniciativaRolada:
    """Só o Narrador: rola de uma vez os NPCs e monstros que faltam, ocultos dos jogadores. Um que não tenha os valores
    na ficha interrompe tudo, com o nome dele."""
    _exigir_narrador(session, mesa_id, ator)
    combate = _aberto(session, mesa_id)
    feitas = []
    try:
        for participante in turno.participantes(session, combate):
            personagem = session.get(PersonagemRegistro, participante.personagem_id)
            if participante.total is None and (personagem is None or personagem.proprietario_id is None):
                try:
                    feitas.append(_rolar(session, mesa_id, ator, True, combate, participante))
                except HTTPException as erro:
                    session.rollback()
                    nome = turno.nome_do_participante(session, combate, participante)
                    raise HTTPException(status_code=erro.status_code, detail=f"{nome}: {erro.detail}") from None
    except ERROS as erro:
        raise _erro(erro, session) from None
    session.commit()
    destaque = preferencias_sala.destaque_ligado(session, mesa_id)
    for rolagem in feitas:
        session.refresh(rolagem)
    return IniciativaRolada(estado=_estado(session, mesa_id, ator, True),
                            rolagens=[RolagemDeDados(**rolagens.para_resposta(r, destaque)) for r in feitas])


@router.post("/mesas/{mesa_id}/sala/turno/inicio", response_model=EstadoDoTurno)
def comecar_disputa(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EstadoDoTurno:
    _exigir_narrador(session, mesa_id, ator)
    combate = _aberto(session, mesa_id)
    try:
        turno.comecar(session, combate)
    except ERROS as erro:
        raise _erro(erro, session) from None
    vez = session.get(ParticipanteCombateRegistro, combate.vez_participante_id)
    _registrar(session, mesa_id, ator, "turno.disputa_iniciada",
               f"Disputa começou: rodada 1, vez de {turno.nome_do_participante(session, combate, vez)}",
               correlacao, combate, rodada=1)
    session.commit()
    return _estado(session, mesa_id, ator, True)


@router.post("/mesas/{mesa_id}/sala/turno/proximo", response_model=EstadoDoTurno)
def proximo_turno(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EstadoDoTurno:
    _exigir_narrador(session, mesa_id, ator)
    combate = _aberto(session, mesa_id)
    try:
        vez = turno.proximo(session, combate)
    except ERROS as erro:
        raise _erro(erro, session) from None
    nome = turno.nome_do_participante(session, combate, vez)
    _registrar(session, mesa_id, ator, "turno.vez", f"Rodada {combate.rodada}: vez de {nome}", correlacao, combate,
               rodada=combate.rodada)
    session.commit()
    return _estado(session, mesa_id, ator, True)


@router.post("/mesas/{mesa_id}/sala/turno/encerramento", response_model=EstadoDoTurno)
def sair_do_modo_turno(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EstadoDoTurno:
    _exigir_narrador(session, mesa_id, ator)
    combate = _aberto(session, mesa_id)
    rodadas = combate.rodada
    turno.encerrar(session, combate)
    _registrar(session, mesa_id, ator, "turno.encerrado",
               f"Modo turno encerrado na rodada {rodadas}" if rodadas else "Modo turno encerrado antes da disputa",
               correlacao, combate, rodadas=rodadas)
    session.commit()
    return _estado(session, mesa_id, ator, True)


@router.post("/mesas/{mesa_id}/sala/turno/correr", response_model=EstadoDoTurno)
def correr(mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session)) -> EstadoDoTurno:
    """Correr (D9): o dono do personagem na vez, ou o Narrador, troca a Ação Padrão por outro movimento."""
    leitor = _leitor(session, mesa_id, ator)
    try:
        turno.correr(session, mesa_id, leitor)
    except turno.ForaDaVez as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(erro)) from None
    except ERROS as erro:
        raise _erro(erro, session) from None
    session.commit()
    return _estado(session, mesa_id, ator, leitor.narrador)
