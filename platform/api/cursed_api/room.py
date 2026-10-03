"""Sala e grid: módulos da mesa, snapshot autorizado e comandos autoritativos sobre tokens."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, sala
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    CriarCenaRequest, AreaDoMapaRequest, CriarTokenRequest, PermissoesEmLoteRequest, PermitirMovimentoRequest, ModulosMesa, MoverTokenRequest, SalaSnapshot, TokenSala,
    VisibilidadeTokenRequest,
)
from cursed_platform.persistence import CenaRegistro, PersonagemRegistro, TokenRegistro
from cursed_platform.repositories import MesaRepository

from .assets import AtivoResposta, ler_imagem
from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session


router = APIRouter(tags=["Sala"])


def _negar(decisao) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
        detail="Mesa não encontrada." if decisao.ocultar_existencia else decisao.motivo,
    )


def _leitor(session: Session, mesa_id: str, ator: Ator) -> sala.Leitor:
    autorizador = Autorizador(session)
    decisao = autorizador.decidir(Acao.LER_MESA, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        _negar(decisao)
    narrador = autorizador.decidir(Acao.ADMINISTRAR_SALA, usuario_id=ator.usuario_id, mesa_id=mesa_id).permitido
    return sala.Leitor(ator.usuario_id, narrador)


def _exigir_narrador(session: Session, mesa_id: str, ator: Ator) -> None:
    decisao = Autorizador(session).decidir(Acao.ADMINISTRAR_SALA, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        _negar(decisao)


def _exigir_modulo(session: Session, mesa_id: str) -> None:
    if not sala.modulo_ativo(session, mesa_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="O módulo Sala está desativado nesta mesa.")


def _cena(session: Session, mesa_id: str, cena_id: str) -> CenaRegistro:
    cena = session.get(CenaRegistro, cena_id)
    if cena is None or cena.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cena não encontrada.")
    return cena


def _token(session: Session, mesa_id: str, token_id: str, leitor: sala.Leitor) -> TokenRegistro:
    """Tokens que o leitor não pode ver respondem como inexistentes."""
    token = session.get(TokenRegistro, token_id)
    if token is not None and token.mesa_id == mesa_id:
        _, _, visivel = sala._contexto_token(session, token)
        if leitor.narrador or visivel:
            return token
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token não encontrado.")


def _erro(erro: Exception, session: Session) -> HTTPException:
    session.rollback()
    if isinstance(erro, sala.SemControle):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(erro))
    if isinstance(erro, sala.ConflitoSala):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))


ERROS = (sala.RegraSala, sala.SemControle)


def _token_resposta(session: Session, token: TokenRegistro, leitor: sala.Leitor) -> TokenSala:
    _, personagem, visivel = sala._contexto_token(session, token)
    return TokenSala(**sala.token_para(token, leitor, visivel, personagem))



# ---------------------------------------------------------------- módulos

@router.get("/mesas/{mesa_id}/modulos", response_model=ModulosMesa)
def ler_modulos(mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session)) -> ModulosMesa:
    _leitor(session, mesa_id, ator)
    return ModulosMesa(sala=sala.modulo_ativo(session, mesa_id))


@router.put("/mesas/{mesa_id}/modulos", response_model=ModulosMesa)
def configurar_modulos(
    mesa_id: str, pedido: ModulosMesa,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ModulosMesa:
    decisao = Autorizador(session).decidir(Acao.CONFIGURAR_MODULO, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        _negar(decisao)
    antes = sala.modulo_ativo(session, mesa_id)
    if antes != pedido.sala:
        MesaRepository(session).configurar_modulo(mesa_id, sala.MODULO, pedido.sala)
        auditoria.registrar(
            session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="modulo.configurado",
            relevancia="organizacional", resumo=f"Módulo Sala {'ativado' if pedido.sala else 'desativado'}",
            mudancas=[{"campo": "modulos.sala", "antes": antes, "depois": pedido.sala, "completo": True}],
            correlacao_id=correlacao,
        )
        sala.emitir(session, mesa_id, "sala.atualizada", {"motivo": "modulo"}, publico=True)
        session.commit()
    return ModulosMesa(sala=pedido.sala)


# --------------------------------------------------------------- snapshot

@router.get("/mesas/{mesa_id}/sala", response_model=SalaSnapshot)
def ler_sala(
    mesa_id: str, cena_id: str | None = Query(default=None, max_length=100),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> SalaSnapshot:
    """Estado confirmado visível ao leitor; clientes o recarregam ao entrar e ao reconectar."""
    leitor = _leitor(session, mesa_id, ator)
    return SalaSnapshot(**sala.snapshot(session, mesa_id, leitor, cena_id))


# --------------------------------------------------------------- comandos

@router.post("/mesas/{mesa_id}/sala/cenas", response_model=SalaSnapshot, status_code=status.HTTP_201_CREATED)
def criar_cena(
    mesa_id: str, pedido: CriarCenaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> SalaSnapshot:
    _exigir_narrador(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    try:
        cena = sala.criar_cena(session, mesa_id, **pedido.model_dump())
    except ERROS as erro:
        raise _erro(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="cena.criada",
        relevancia="narrativa", alvo_tipo="cena", alvo_id=cena.id, visibilidade="narrador",
        resumo=f"Cena criada: {cena.nome} ({cena.colunas}×{cena.linhas})"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return SalaSnapshot(**sala.snapshot(session, mesa_id, sala.Leitor(ator.usuario_id, True), cena.id))


@router.post("/mesas/{mesa_id}/sala/cenas/{cena_id}/ativacao", response_model=SalaSnapshot)
def ativar_cena(
    mesa_id: str, cena_id: str,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> SalaSnapshot:
    _exigir_narrador(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    cena = _cena(session, mesa_id, cena_id)
    sala.ativar_cena(session, cena)
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="cena.ativada",
        relevancia="narrativa", alvo_tipo="cena", alvo_id=cena.id,
        resumo=f"Cena ativa: {cena.nome}"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return SalaSnapshot(**sala.snapshot(session, mesa_id, sala.Leitor(ator.usuario_id, True), cena.id))


@router.post("/mesas/{mesa_id}/sala/cenas/{cena_id}/area-do-mapa", response_model=SalaSnapshot)
def redimensionar_mapa(
    mesa_id: str, cena_id: str, pedido: AreaDoMapaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> SalaSnapshot:
    """Quantas casas o mapa da cena ocupa no grid; só o Narrador (experiencia-da-mesa, item 12)."""
    _exigir_narrador(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    cena = _cena(session, mesa_id, cena_id)
    try:
        sala.redimensionar_mapa(session, cena, pedido.colunas, pedido.linhas)
    except ERROS as erro:
        raise _erro(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="cena.mapa_redimensionado",
        relevancia="narrativa", alvo_tipo="cena", alvo_id=cena.id,
        resumo=f"Mapa da cena {cena.nome}: {pedido.colunas} x {pedido.linhas} casas"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return SalaSnapshot(**sala.snapshot(session, mesa_id, sala.Leitor(ator.usuario_id, True), cena.id))


@router.post("/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens", response_model=TokenSala, status_code=status.HTTP_201_CREATED)
def criar_token(
    mesa_id: str, cena_id: str, pedido: CriarTokenRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> TokenSala:
    _exigir_narrador(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    cena = _cena(session, mesa_id, cena_id)
    try:
        token = sala.criar_token(session, cena, **pedido.model_dump())
    except ERROS as erro:
        raise _erro(erro, session) from None
    _, _, visivel = sala._contexto_token(session, token)
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="token.criado",
        relevancia="narrativa", alvo_tipo="token", alvo_id=token.id, visibilidade="mesa" if visivel else "narrador",
        resumo=f"Token colocado na cena {cena.nome}: {token.rotulo}"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return _token_resposta(session, token, sala.Leitor(ator.usuario_id, True))


@router.get("/mesas/{mesa_id}/sala/tokens/{token_id}/retrato", response_model=AtivoResposta)
def retrato_do_token(
    mesa_id: str, token_id: str, request: Request,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> AtivoResposta:
    """O retrato do personagem ligado ao token, para quem vê o token (experiencia-da-mesa, item 12).

    O jogador vê a foto de um monstro no mapa sem poder abrir a ficha dele: a autorização é a do token, não a da
    ficha. Sem retrato enviado, 404, e o cliente usa a arte padrão do tipo.
    """
    leitor = _leitor(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    token = _token(session, mesa_id, token_id, leitor)
    personagem = session.get(PersonagemRegistro, token.personagem_id) if token.personagem_id else None
    caminho = ((personagem.ficha or {}).get("personagem") or {}).get("imagem_ativo") if personagem else None
    if not isinstance(caminho, str) or not caminho.startswith(f"mesas/{mesa_id}/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Este token não tem retrato.")
    return ler_imagem(request, caminho, exibicao=True)


@router.post("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento", response_model=TokenSala)
def mover_token(
    mesa_id: str, token_id: str, pedido: MoverTokenRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> TokenSala:
    """Movimentos não geram evento de auditoria: são estado tático frequente, não decisões a revisar."""
    leitor = _leitor(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    token = _token(session, mesa_id, token_id, leitor)
    try:
        sala.mover_token(session, token, leitor, pedido.x, pedido.y, pedido.versao_esperada)
    except ERROS as erro:
        raise _erro(erro, session) from None
    session.commit()
    return _token_resposta(session, token, leitor)


@router.post("/mesas/{mesa_id}/sala/tokens/{token_id}/visibilidade", response_model=TokenSala)
def alterar_visibilidade(
    mesa_id: str, token_id: str, pedido: VisibilidadeTokenRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> TokenSala:
    _exigir_narrador(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    leitor = sala.Leitor(ator.usuario_id, True)
    token = _token(session, mesa_id, token_id, leitor)
    try:
        sala.alterar_visibilidade(session, token, versao_esperada=pedido.versao_esperada,
                                  camada_id=pedido.camada_id, oculto=pedido.oculto)
    except ERROS as erro:
        raise _erro(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="token.visibilidade_alterada",
        relevancia="narrativa", alvo_tipo="token", alvo_id=token.id, visibilidade="narrador",
        resumo=f"Visibilidade do token {token.rotulo} alterada"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return _token_resposta(session, token, leitor)


@router.post("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento-permitido", response_model=TokenSala)
def permitir_movimento(
    mesa_id: str, token_id: str, pedido: PermitirMovimentoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> TokenSala:
    """Libera ou bloqueia o movimento do token pelos jogadores; só o Narrador (experiencia-da-mesa, item 13)."""
    _exigir_narrador(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    leitor = sala.Leitor(ator.usuario_id, True)
    token = _token(session, mesa_id, token_id, leitor)
    try:
        sala.permitir_movimento(session, token, liberado=pedido.liberado, controladores=pedido.controladores,
                                versao_esperada=pedido.versao_esperada)
    except ERROS as erro:
        raise _erro(erro, session) from None
    except sala.ConflitoSala as erro:
        raise _erro(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="token.movimento_permitido",
        relevancia="narrativa", alvo_tipo="token", alvo_id=token.id, visibilidade="narrador",
        resumo=f"Movimento do token {token.rotulo} {'liberado' if pedido.liberado else 'bloqueado'}"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return _token_resposta(session, token, leitor)


@router.post("/mesas/{mesa_id}/sala/cenas/{cena_id}/permissoes", response_model=SalaSnapshot)
def permissoes_em_lote(
    mesa_id: str, cena_id: str, pedido: PermissoesEmLoteRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> SalaSnapshot:
    """Bloquear todos, só personagens principais ou liberar todos; só o Narrador (experiencia-da-mesa, item 13)."""
    _exigir_narrador(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    cena = _cena(session, mesa_id, cena_id)
    try:
        sala.permissoes_em_lote(session, cena, pedido.modo)
    except ERROS as erro:
        raise _erro(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="cena.permissoes_de_movimento",
        relevancia="narrativa", alvo_tipo="cena", alvo_id=cena.id, visibilidade="narrador",
        resumo=f"Permissões de movimento na cena {cena.nome}: {pedido.modo}"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return SalaSnapshot(**sala.snapshot(session, mesa_id, sala.Leitor(ator.usuario_id, True), cena.id))


@router.delete("/mesas/{mesa_id}/sala/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_token(
    mesa_id: str, token_id: str, versao_esperada: int = Query(ge=0),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> None:
    _exigir_narrador(session, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    token = _token(session, mesa_id, token_id, sala.Leitor(ator.usuario_id, True))
    rotulo, _, visivel = token.rotulo, *sala._contexto_token(session, token)[1:]
    try:
        sala.remover_token(session, token, versao_esperada)
    except ERROS as erro:
        raise _erro(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="mesa", acao="token.removido",
        relevancia="narrativa", alvo_tipo="token", alvo_id=token_id, visibilidade="mesa" if visivel else "narrador",
        resumo=f"Token removido: {rotulo}"[:500], correlacao_id=correlacao,
    )
    session.commit()
