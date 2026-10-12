"""Gamificação da Sala (gamificacao-da-sala): sessões de jogo, preferências da Sala, estatísticas e votação de MVP.

O Narrador conduz tudo pela aba Mestre; os jogadores leem e votam pela aba Jogador. Cada mudança avisa a mesa pelo
Realtime (`sala.sessao`, `sala.preferencias`, `sala.votacao`) e, exceto o voto, entra no registro da mesa.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, estatisticas, mvp, perfis, preferencias_sala, sessoes, turno
from cursed_platform.contracts import (
    DesempatarMvpRequest, EstadoDoMvp, EstatisticasDaMesa, EstatisticasDoJogador, EstatisticasDoPeriodo,
    PreferenciasDaSala, SessaoDeJogo, SessoesDaMesa, VotarMvpRequest,
)
from cursed_platform.persistence import SessaoRegistro
from cursed_platform.sala import emitir

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session
from .room import _exigir_narrador, _leitor


router = APIRouter(tags=["Sala"])


def _sessao(registro: SessaoRegistro | None) -> SessaoDeJogo | None:
    if registro is None:
        return None
    return SessaoDeJogo(id=registro.id, numero=registro.numero, iniciada_em=registro.iniciada_em,
                        encerrada_em=registro.encerrada_em)


def _sessoes(session: Session, mesa_id: str) -> SessoesDaMesa:
    return SessoesDaMesa(atual=_sessao(sessoes.atual(session, mesa_id)),
                         ultima_encerrada=_sessao(sessoes.ultima_encerrada(session, mesa_id)))


# --------------------------------------------------------------- sessões

@router.get("/mesas/{mesa_id}/sala/sessoes", response_model=SessoesDaMesa)
def ler_sessoes(mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session)) -> SessoesDaMesa:
    _leitor(session, mesa_id, ator)
    return _sessoes(session, mesa_id)


@router.post("/mesas/{mesa_id}/sala/sessoes", response_model=SessoesDaMesa, status_code=status.HTTP_201_CREATED)
def iniciar_sessao(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> SessoesDaMesa:
    """Só o Narrador inicia uma sessão; com uma em andamento, 409."""
    _exigir_narrador(session, mesa_id, ator)
    try:
        registro = sessoes.iniciar(session, mesa_id)
    except sessoes.SessaoJaAberta as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="sessao.iniciada",
        relevancia="organizacional", alvo_tipo="sessao", alvo_id=registro.id,
        resumo=f"Sessão {registro.numero} iniciada", correlacao_id=correlacao, detalhes={"numero": registro.numero},
    )
    emitir(session, mesa_id, sessoes.EVENTO, {}, publico=True)
    session.commit()
    return _sessoes(session, mesa_id)


@router.post("/mesas/{mesa_id}/sala/sessoes/atual/encerramento", response_model=SessoesDaMesa)
def encerrar_sessao(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> SessoesDaMesa:
    _exigir_narrador(session, mesa_id, ator)
    registro = sessoes.atual(session, mesa_id)
    if registro is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nenhuma sessão em andamento.")
    # Registrado antes de encerrar para ficar ligado à sessão que termina (a auditoria só aceita inclusão).
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="sessao.encerrada",
        relevancia="organizacional", alvo_tipo="sessao", alvo_id=registro.id,
        resumo=f"Sessão {registro.numero} encerrada", correlacao_id=correlacao, detalhes={"numero": registro.numero},
    )
    # Encerrar a sessão encerra também o modo turno aberto (modo-de-turno).
    combate = turno.aberto(session, mesa_id)
    if combate is not None:
        rodadas = combate.rodada
        turno.encerrar(session, combate)
        auditoria.registrar(
            session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="turno.encerrado",
            relevancia="narrativa", alvo_tipo="combate", alvo_id=combate.id, correlacao_id=correlacao,
            resumo=f"Modo turno encerrado com a sessão, na rodada {rodadas}", detalhes={"rodadas": rodadas},
        )
    sessoes.encerrar(session, mesa_id)
    emitir(session, mesa_id, sessoes.EVENTO, {}, publico=True)
    session.commit()
    return _sessoes(session, mesa_id)


# --------------------------------------------------------------- preferências

@router.get("/mesas/{mesa_id}/sala/preferencias", response_model=PreferenciasDaSala)
def ler_preferencias(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PreferenciasDaSala:
    _leitor(session, mesa_id, ator)
    return PreferenciasDaSala(**preferencias_sala.ler(session, mesa_id))


@router.put("/mesas/{mesa_id}/sala/preferencias", response_model=PreferenciasDaSala)
def alterar_preferencias(
    mesa_id: str, pedido: PreferenciasDaSala, ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session), correlacao: str = Depends(get_correlacao),
) -> PreferenciasDaSala:
    """Só o Narrador liga o destaque de críticos e o placar da mesa."""
    _exigir_narrador(session, mesa_id, ator)
    mudancas = preferencias_sala.alterar(session, mesa_id, ator.usuario_id, **pedido.model_dump())
    if mudancas:
        auditoria.registrar(
            session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="sala.preferencias_alteradas",
            relevancia="organizacional", alvo_tipo="sala", alvo_id=mesa_id,
            resumo=preferencias_sala.descrever(mudancas), correlacao_id=correlacao,
            detalhes={"preferencias": {chave: depois for chave, (_, depois) in mudancas.items()}},
        )
    session.commit()
    return PreferenciasDaSala(**preferencias_sala.ler(session, mesa_id))


# --------------------------------------------------------------- estatísticas

@router.get("/mesas/{mesa_id}/sala/estatisticas", response_model=EstatisticasDaMesa)
def ler_estatisticas(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> EstatisticasDaMesa:
    """O Narrador vê todos os jogadores; o jogador vê a si, ou todos com o placar ligado."""
    leitor = _leitor(session, mesa_id, ator)
    preferencias = preferencias_sala.ler(session, mesa_id)
    da_mesa = mvp.jogadores(session, mesa_id)
    if leitor.narrador or preferencias["estatisticas_visiveis"]:
        visiveis = da_mesa
    else:
        visiveis = [ator.usuario_id] if ator.usuario_id in da_mesa else []
    referencia = sessoes.de_referencia(session, mesa_id)
    calculado = estatisticas.calcular(session, mesa_id, visiveis, referencia.id if referencia else None)
    apelidos = perfis.nomes(session, visiveis)
    destaque = preferencias["destaque_criticos"]
    return EstatisticasDaMesa(
        sessao=_sessao(referencia), placar_visivel=preferencias["estatisticas_visiveis"],
        jogadores=[
            EstatisticasDoJogador(
                usuario_id=usuario_id, apelido=apelidos.get(usuario_id, usuario_id),
                sessao=EstatisticasDoPeriodo(**da_sessao.para_resposta(destaque)) if da_sessao else None,
                campanha=EstatisticasDoPeriodo(**campanha.para_resposta(destaque)),
            )
            for usuario_id, (da_sessao, campanha) in calculado.items()
        ],
    )


# --------------------------------------------------------------- MVP

def _estado_mvp(session: Session, mesa_id: str, ator: Ator, narrador: bool) -> EstadoDoMvp:
    dados = mvp.estado(session, mesa_id, ator.usuario_id, narrador)
    citados = set(dados["jogadores"]) | {h["vencedor_id"] for h in dados["historico"]}
    if dados["votacao"] and dados["votacao"]["vencedor_id"]:
        citados.add(dados["votacao"]["vencedor_id"])
    apelidos = perfis.nomes(session, citados)
    return EstadoDoMvp(votacao=dados["votacao"], historico=dados["historico"],
                       apelidos={u: apelidos.get(u, u) for u in citados})


def _erro_mvp(erro: Exception, session: Session) -> HTTPException:
    session.rollback()
    if isinstance(erro, mvp.SoJogadores):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(erro))
    if isinstance(erro, mvp.ConflitoVotacao):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))


ERROS_MVP = (mvp.SoJogadores, mvp.ConflitoVotacao, mvp.VotacaoInvalida)


@router.get("/mesas/{mesa_id}/sala/mvp", response_model=EstadoDoMvp)
def ler_mvp(mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session)) -> EstadoDoMvp:
    leitor = _leitor(session, mesa_id, ator)
    return _estado_mvp(session, mesa_id, ator, leitor.narrador)


@router.post("/mesas/{mesa_id}/sala/mvp", response_model=EstadoDoMvp, status_code=status.HTTP_201_CREATED)
def abrir_mvp(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EstadoDoMvp:
    _exigir_narrador(session, mesa_id, ator)
    try:
        votacao = mvp.abrir(session, mesa_id, ator.usuario_id)
    except ERROS_MVP as erro:
        raise _erro_mvp(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="mvp.aberta",
        relevancia="narrativa", alvo_tipo="votacao", alvo_id=votacao.id, resumo="Votação de MVP aberta",
        correlacao_id=correlacao,
    )
    session.commit()
    return _estado_mvp(session, mesa_id, ator, True)


@router.put("/mesas/{mesa_id}/sala/mvp/voto", response_model=EstadoDoMvp)
def votar_mvp(
    mesa_id: str, pedido: VotarMvpRequest, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> EstadoDoMvp:
    """O voto é secreto e não entra no registro da mesa."""
    leitor = _leitor(session, mesa_id, ator)
    try:
        mvp.votar(session, mesa_id, ator.usuario_id, pedido.candidato_id)
    except ERROS_MVP as erro:
        raise _erro_mvp(erro, session) from None
    session.commit()
    return _estado_mvp(session, mesa_id, ator, leitor.narrador)


def _resultado(session: Session, mesa_id: str, ator: Ator, votacao, correlacao: str, acao: str) -> None:
    if votacao.estado != "encerrada":
        return
    if votacao.vencedor_id:
        nome = perfis.nomes(session, [votacao.vencedor_id]).get(votacao.vencedor_id, votacao.vencedor_id)
        resumo = f"MVP: {nome} ({votacao.votos_do_vencedor} voto{'s' if votacao.votos_do_vencedor != 1 else ''})"
    else:
        resumo = "Votação de MVP encerrada sem votos"
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao=acao, relevancia="narrativa",
        alvo_tipo="votacao", alvo_id=votacao.id, resumo=resumo, correlacao_id=correlacao,
        detalhes={"vencedor_id": votacao.vencedor_id, "votos": votacao.votos_do_vencedor},
    )


@router.post("/mesas/{mesa_id}/sala/mvp/encerramento", response_model=EstadoDoMvp)
def encerrar_mvp(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EstadoDoMvp:
    _exigir_narrador(session, mesa_id, ator)
    try:
        votacao = mvp.encerrar(session, mesa_id)
    except ERROS_MVP as erro:
        raise _erro_mvp(erro, session) from None
    _resultado(session, mesa_id, ator, votacao, correlacao, "mvp.encerrada")
    session.commit()
    return _estado_mvp(session, mesa_id, ator, True)


@router.post("/mesas/{mesa_id}/sala/mvp/desempate", response_model=EstadoDoMvp)
def desempatar_mvp(
    mesa_id: str, pedido: DesempatarMvpRequest, ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session), correlacao: str = Depends(get_correlacao),
) -> EstadoDoMvp:
    _exigir_narrador(session, mesa_id, ator)
    try:
        votacao = mvp.desempatar(session, mesa_id, pedido.vencedor_id)
    except ERROS_MVP as erro:
        raise _erro_mvp(erro, session) from None
    _resultado(session, mesa_id, ator, votacao, correlacao, "mvp.desempatada")
    session.commit()
    return _estado_mvp(session, mesa_id, ator, True)
