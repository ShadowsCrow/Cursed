"""Chão e baú da cena: saque, itens largados e disputa pelo primeiro pedido confirmado (carga-por-espacos D8)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, ficha_viva, recipientes, sala, trocas
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    AceitarOfertaRequest, ColocarCartaRequest, CriarBauRequest, ItemInventarioResumo, ItemRecipienteResumo,
    LargarItemRequest, OfertaItemResumo, OfertarItemRequest, PegarItemRequest, RecipienteResumo,
)
from cursed_platform.persistence import (
    CartaVersaoRegistro, ItemInventarioRegistro, ItemRecipienteRegistro, MesaRegistro, OfertaItemRegistro,
    PersonagemRegistro, RecipienteCenaRegistro,
)
from cursed_platform.narrador import entidade_publica
from cursed_platform.policies import avaliar_campos
from cursed_platform.repositories import FichaRepository

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session

router = APIRouter(tags=["Sala"])


def _decidir(session: Session, acao: Acao, mesa_id: str, ator: Ator, personagem_id: str | None = None) -> None:
    decisao = Autorizador(session).decidir(acao, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=personagem_id)
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Não encontrado." if decisao.ocultar_existencia else decisao.motivo,
        )


def _exigir_modulo(session: Session, mesa_id: str) -> None:
    if not sala.modulo_ativo(session, mesa_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="O módulo Sala está desativado nesta mesa.")


def _editor(session: Session, mesa_id: str, personagem_id: str, ator: Ator) -> PersonagemRegistro:
    """Quem pega ou larga precisa poder arrumar o inventário do personagem (política da mesa)."""
    _decidir(session, Acao.EDITAR_FICHA, mesa_id, ator, personagem_id)
    autorizador = Autorizador(session)
    narrador = autorizador.decidir(Acao.ADMINISTRAR_SALA, usuario_id=ator.usuario_id, mesa_id=mesa_id).permitido
    if not narrador:
        mesa = session.get(MesaRegistro, mesa_id)
        assert mesa is not None
        politica = avaliar_campos({"inventario.arrumacao"}, bloqueados=mesa.campos_bloqueados,
                                  exigem_aprovacao=mesa.campos_exigem_aprovacao)
        if politica.bloqueados or politica.exigem_aprovacao:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Alteração bloqueada pelo Narrador.")
    personagem = FichaRepository(session).get(mesa_id, personagem_id)
    assert personagem is not None
    return personagem


def _recipiente(session: Session, mesa_id: str, recipiente_id: str) -> RecipienteCenaRegistro:
    recipiente = session.get(RecipienteCenaRegistro, recipiente_id)
    if recipiente is None or recipiente.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipiente não encontrado.")
    return recipiente


def _item_resumo(item: ItemRecipienteRegistro) -> ItemRecipienteResumo:
    dados = item.dados or {}
    return ItemRecipienteResumo(
        id=item.id, nome=item.nome, tipo=item.tipo, subtipo=item.subtipo, quantidade=item.quantidade,
        largura=item.largura, altura=item.altura, coluna=item.coluna, linha=item.linha, girado=item.girado,
        grupo=dados.get("_grupo"), efeitos=[e["nome"] for e in item.efeitos or []], icone_grade=dados.get("icone_grade"),
    )


def _resumo(session: Session, recipiente: RecipienteCenaRegistro) -> RecipienteResumo:
    return RecipienteResumo(
        id=recipiente.id, tipo=recipiente.tipo, nome=recipiente.nome, colunas=recipiente.colunas, linhas=recipiente.linhas,
        versao=recipiente.versao, itens=[_item_resumo(i) for i in recipientes.itens_do_recipiente(session, recipiente)],
    )


def _avisar(session: Session, recipiente: RecipienteCenaRegistro) -> None:
    sala.emitir(session, recipiente.mesa_id, "recipiente.alterado",
                {"recipiente_id": recipiente.id, "versao": recipiente.versao}, publico=True)


def _erro(session: Session, erro: Exception) -> HTTPException:
    session.rollback()
    if isinstance(erro, (recipientes.ItemIndisponivel, recipientes.SemCenaAtiva, ficha_viva.ConflitoVersao)):
        detalhe = "Versão da ficha desatualizada." if isinstance(erro, ficha_viva.ConflitoVersao) else str(erro)
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detalhe)
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))


ERROS = (recipientes.ItemIndisponivel, recipientes.SemCenaAtiva, recipientes.RegraRecipiente, ficha_viva.ConflitoVersao)


@router.get("/mesas/{mesa_id}/sala/recipientes", response_model=list[RecipienteResumo])
def listar_recipientes(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[RecipienteResumo]:
    """Chão e baús da cena ativa, visíveis a todos os participantes."""
    _decidir(session, Acao.LER_MESA, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    return [_resumo(session, r) for r in recipientes.recipientes_da_cena(session, mesa_id)]


@router.post("/mesas/{mesa_id}/sala/recipientes", response_model=RecipienteResumo, status_code=status.HTTP_201_CREATED)
def criar_bau(
    mesa_id: str, pedido: CriarBauRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> RecipienteResumo:
    _decidir(session, Acao.ADMINISTRAR_SALA, mesa_id, ator)
    _exigir_modulo(session, mesa_id)
    try:
        bau = recipientes.criar_bau(session, mesa_id, pedido.nome, pedido.colunas, pedido.linhas)
        _avisar(session, bau)
    except ERROS as erro:
        raise _erro(session, erro) from None
    session.commit()
    return _resumo(session, bau)


@router.post("/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/cartas", response_model=RecipienteResumo,
             status_code=status.HTTP_201_CREATED)
def colocar_carta(
    mesa_id: str, recipiente_id: str, pedido: ColocarCartaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> RecipienteResumo:
    _decidir(session, Acao.ADMINISTRAR_SALA, mesa_id, ator)
    recipiente = _recipiente(session, mesa_id, recipiente_id)
    versao = session.get(CartaVersaoRegistro, pedido.versao_id)
    if versao is None or versao.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta não encontrada.")
    try:
        recipientes.colocar_carta(session, recipiente, versao)
        _avisar(session, recipiente)
    except ERROS as erro:
        raise _erro(session, erro) from None
    session.commit()
    return _resumo(session, recipiente)


@router.post("/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/largar", response_model=RecipienteResumo)
def largar_item(
    mesa_id: str, personagem_id: str, item_id: str, pedido: LargarItemRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> RecipienteResumo:
    personagem = _editor(session, mesa_id, personagem_id, ator)
    _exigir_modulo(session, mesa_id)
    item = session.get(ItemInventarioRegistro, item_id)
    if item is None or item.mesa_id != mesa_id or item.personagem_id != personagem_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")
    nome = item.nome
    try:
        recipiente = (_recipiente(session, mesa_id, pedido.recipiente_id) if pedido.recipiente_id
                      else recipientes.chao_da_cena(session, mesa_id))
        recipientes.largar_item(session, personagem, item, recipiente, pedido.versao_esperada)
        _avisar(session, recipiente)
    except ERROS as erro:
        raise _erro(session, erro) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao="item.largado",
        relevancia="mecanica", personagem=personagem, alvo_tipo="item", alvo_id=item_id,
        resumo=f"{auditoria.nome_personagem(personagem)} deixou {nome} em {recipiente.nome}", correlacao_id=correlacao,
    )
    session.commit()
    return _resumo(session, recipiente)


@router.post("/mesas/{mesa_id}/sala/recipientes/{recipiente_id}/itens/{retrato_id}/pegar", response_model=ItemInventarioResumo)
def pegar_item(
    mesa_id: str, recipiente_id: str, retrato_id: str, pedido: PegarItemRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ItemInventarioResumo:
    """O primeiro pedido confirmado leva o item; os seguintes recebem 409."""
    personagem = _editor(session, mesa_id, pedido.personagem_id, ator)
    _exigir_modulo(session, mesa_id)
    recipiente = _recipiente(session, mesa_id, recipiente_id)
    try:
        _, item = recipientes.pegar(session, personagem, recipiente, retrato_id, pedido.versao_esperada,
                                    pedido.coluna, pedido.linha, pedido.girado)
        _avisar(session, recipiente)
    except ERROS as erro:
        raise _erro(session, erro) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao="item.pego",
        relevancia="mecanica", personagem=personagem, alvo_tipo="item", alvo_id=item.id,
        resumo=f"{auditoria.nome_personagem(personagem)} pegou {item.nome} de {recipiente.nome}", correlacao_id=correlacao,
    )
    session.commit()
    return _item_inventario(session, personagem, item)


def _item_inventario(session: Session, personagem: PersonagemRegistro, item: ItemInventarioRegistro) -> ItemInventarioResumo:
    return ItemInventarioResumo(
        id=item.id, tipo=item.tipo, nome=item.nome, quantidade=item.quantidade, equipado=item.equipado,
        cargas_atuais=item.cargas_atuais, cargas_maximas=item.cargas_maximas, dados=item.dados or {},
        efeitos=[e.id for e in ficha_viva.efeitos(session, personagem.mesa_id, personagem.id) if e.equipamento_id == item.id],
        subtipo=item.subtipo, largura=item.largura, altura=item.altura, coluna=item.coluna, linha=item.linha,
        girado=item.girado, maos=item.maos, pilha_max=item.pilha_max,
    )


# ------------------------------------------------------------------ trocas entre personagens

def _nome_visivel(personagem: PersonagemRegistro | None, narrador: bool) -> str:
    """Nome real para o Narrador e para personagens visíveis à mesa; nome público para entidades ocultas."""
    if personagem is None:
        return "Personagem"
    if narrador or personagem.visibilidade == "mesa":
        return auditoria.nome_personagem(personagem)
    return (entidade_publica(personagem) or {}).get("nome_publico") or "Figura desconhecida"


def _eh_narrador(session: Session, ator: Ator, mesa_id: str) -> bool:
    return Autorizador(session).decidir(Acao.LER_CONTEUDO_NARRADOR, usuario_id=ator.usuario_id, mesa_id=mesa_id).permitido


def _oferta_resumo(session: Session, oferta: OfertaItemRegistro, narrador: bool) -> OfertaItemResumo:
    fichas = FichaRepository(session)
    de = fichas.get(oferta.mesa_id, oferta.de_personagem_id)
    para = fichas.get(oferta.mesa_id, oferta.para_personagem_id)
    item = session.get(ItemInventarioRegistro, oferta.item_id)
    return OfertaItemResumo(
        id=oferta.id, estado=oferta.estado, item_id=oferta.item_id, item_nome=item.nome if item else "Item",
        subtipo=item.subtipo if item else None, largura=item.largura if item else None, altura=item.altura if item else None,
        de_personagem_id=oferta.de_personagem_id, de_nome=_nome_visivel(de, narrador),
        para_personagem_id=oferta.para_personagem_id, para_nome=_nome_visivel(para, narrador),
        criado_em=oferta.criado_em,
    )


def _pode_editar(session: Session, ator: Ator, mesa_id: str, personagem_id: str) -> bool:
    return Autorizador(session).decidir(
        Acao.EDITAR_FICHA, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=personagem_id).permitido


def _avisar_ofertas(session: Session, mesa_id: str) -> None:
    """Sem dados no evento: cada cliente recarrega só as ofertas que pode ver."""
    sala.emitir(session, mesa_id, "oferta.alterada", {}, publico=True)


ERROS_TROCA = (trocas.OfertaInvalida, trocas.OfertaIndisponivel, ficha_viva.ConflitoVersao)


def _erro_troca(session: Session, erro: Exception) -> HTTPException:
    session.rollback()
    if isinstance(erro, ficha_viva.ConflitoVersao):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.")
    if isinstance(erro, trocas.OfertaIndisponivel):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))


@router.get("/mesas/{mesa_id}/ofertas-item", response_model=list[OfertaItemResumo])
def listar_ofertas(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[OfertaItemResumo]:
    """Ofertas pendentes em que o usuário pode agir: dadas ou recebidas por personagens que ele edita."""
    _decidir(session, Acao.LER_MESA, mesa_id, ator)
    narrador = _eh_narrador(session, ator, mesa_id)
    return [
        _oferta_resumo(session, o, narrador) for o in trocas.pendentes(session, mesa_id)
        if _pode_editar(session, ator, mesa_id, o.de_personagem_id) or _pode_editar(session, ator, mesa_id, o.para_personagem_id)
    ]


@router.post("/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/ofertas", response_model=OfertaItemResumo,
             status_code=status.HTTP_201_CREATED)
def ofertar_item(
    mesa_id: str, personagem_id: str, item_id: str, pedido: OfertarItemRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> OfertaItemResumo:
    de = _editor(session, mesa_id, personagem_id, ator)
    item = session.get(ItemInventarioRegistro, item_id)
    if item is None or item.mesa_id != mesa_id or item.personagem_id != personagem_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")
    para = FichaRepository(session).get(mesa_id, pedido.para_personagem_id)
    narrador = Autorizador(session).decidir(Acao.LER_CONTEUDO_NARRADOR, usuario_id=ator.usuario_id, mesa_id=mesa_id).permitido
    if para is None or para.excluido_em is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personagem não encontrado.")
    if para.visibilidade != "mesa" and not narrador:
        if entidade_publica(para) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personagem não encontrado.")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail="Este personagem não recebe itens por troca; fale com o Narrador.")
    try:
        oferta = trocas.ofertar(session, de, item, para)
        _avisar_ofertas(session, mesa_id)
    except ERROS_TROCA as erro:
        raise _erro_troca(session, erro) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao="item.oferecido",
        relevancia="mecanica", personagem=de, alvo_tipo="item", alvo_id=item.id,
        resumo=f"{_nome_visivel(de, False)} ofereceu {item.nome} a {_nome_visivel(para, False)}",
        correlacao_id=correlacao,
    )
    session.commit()
    return _oferta_resumo(session, oferta, narrador)


def _oferta_autorizada(session: Session, mesa_id: str, oferta_id: str, ator: Ator, lado: str) -> tuple[
        OfertaItemRegistro, PersonagemRegistro]:
    """Autoriza quem responde (`para`) ou cancela (`de`) antes de revelar o estado da oferta; depois trava a linha."""
    _decidir(session, Acao.LER_MESA, mesa_id, ator)
    oferta = session.get(OfertaItemRegistro, oferta_id)
    if oferta is None or oferta.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oferta não encontrada.")
    personagem = _editor(session, mesa_id, oferta.para_personagem_id if lado == "para" else oferta.de_personagem_id, ator)
    try:
        travada = trocas.travar_pendente(session, mesa_id, oferta_id)
    except trocas.OfertaIndisponivel as erro:
        raise _erro_troca(session, erro) from None
    assert travada is not None
    return travada, personagem


@router.post("/mesas/{mesa_id}/ofertas-item/{oferta_id}/aceitar", response_model=ItemInventarioResumo)
def aceitar_oferta(
    mesa_id: str, oferta_id: str, pedido: AceitarOfertaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ItemInventarioResumo:
    oferta, para = _oferta_autorizada(session, mesa_id, oferta_id, ator, "para")
    de = FichaRepository(session).get(mesa_id, oferta.de_personagem_id)
    de_nome = _nome_visivel(de, False)
    try:
        _, item = trocas.aceitar(session, oferta, pedido.versao_esperada, pedido.coluna, pedido.linha, pedido.girado)
        _avisar_ofertas(session, mesa_id)
    except trocas.ItemSaiu as erro:
        session.rollback()
        cancelada = trocas.travar_pendente(session, mesa_id, oferta_id)
        if cancelada is not None:
            trocas.decidir(cancelada, "cancelada")
            _avisar_ofertas(session, mesa_id)
            session.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from None
    except ERROS_TROCA as erro:
        raise _erro_troca(session, erro) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao="item.trocado",
        relevancia="mecanica", personagem=para, alvo_tipo="item", alvo_id=item.id,
        resumo=f"{_nome_visivel(para, False)} recebeu {item.nome} de {de_nome}", correlacao_id=correlacao,
    )
    session.commit()
    return _item_inventario(session, para, item)


@router.post("/mesas/{mesa_id}/ofertas-item/{oferta_id}/recusar", response_model=OfertaItemResumo)
def recusar_oferta(
    mesa_id: str, oferta_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> OfertaItemResumo:
    oferta, para = _oferta_autorizada(session, mesa_id, oferta_id, ator, "para")
    return _encerrar(session, oferta, "recusada", para, ator, correlacao)


@router.post("/mesas/{mesa_id}/ofertas-item/{oferta_id}/cancelar", response_model=OfertaItemResumo)
def cancelar_oferta(
    mesa_id: str, oferta_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> OfertaItemResumo:
    oferta, de = _oferta_autorizada(session, mesa_id, oferta_id, ator, "de")
    return _encerrar(session, oferta, "cancelada", de, ator, correlacao)


def _encerrar(session: Session, oferta: OfertaItemRegistro, estado: str, personagem: PersonagemRegistro, ator: Ator,
              correlacao: str) -> OfertaItemResumo:
    trocas.decidir(oferta, estado)
    _avisar_ofertas(session, oferta.mesa_id)
    resumo = _oferta_resumo(session, oferta, _eh_narrador(session, ator, oferta.mesa_id))
    publico = _oferta_resumo(session, oferta, False)
    auditoria.registrar(
        session, mesa_id=oferta.mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao=f"oferta.{estado}",
        relevancia="organizacional", personagem=personagem, alvo_tipo="item", alvo_id=oferta.item_id,
        resumo=f"Oferta de {publico.item_nome} de {publico.de_nome} a {publico.para_nome} {estado}", correlacao_id=correlacao,
    )
    session.commit()
    return resumo
