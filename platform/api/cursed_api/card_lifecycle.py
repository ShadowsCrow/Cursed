"""Posse de cartas: concessão, ofertas, aprendizado, apresentação e migração de versão."""

from __future__ import annotations

from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import auditoria, cartas_ciclo, ficha_viva
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    ApresentacaoResumo, ApresentarCartaRequest, AquisicaoCartasResposta, CartaPersonagemResumo, CartaVisivel,
    ConcederCartaRequest, CriarOfertaRequest, DestinatarioOferta, DiferencaCarta, MigrarCartaRequest,
    OfertaResumo, PreviaMigracaoCarta, ResponderOfertaRequest, TransicaoCartaRequest,
)
from cursed_platform.persistence import (
    ApresentacaoCartaRegistro, CartaDefinicaoRegistro, CartaPersonagemRegistro, CartaVersaoRegistro,
    OfertaCartasRegistro, OfertaDestinatarioRegistro, OfertaEscolhaRegistro, PersonagemRegistro,
)
from cursed_platform.policies import avaliar_campos
from cursed_platform.repositories import FichaRepository, MesaRepository

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session
from .live_sheet import permissoes


router = APIRouter(tags=["Cartas"])


def _negar(decisao) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
        detail="Recurso não encontrado." if decisao.ocultar_existencia else decisao.motivo,
    )


def _eh_narrador(session: Session, mesa_id: str, ator: Ator) -> bool:
    return Autorizador(session).decidir(Acao.GERENCIAR_CARTAS, usuario_id=ator.usuario_id, mesa_id=mesa_id).permitido


def _exigir_narrador(session: Session, mesa_id: str, ator: Ator) -> None:
    decisao = Autorizador(session).decidir(Acao.GERENCIAR_CARTAS, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        _negar(decisao)


def _personagem(session: Session, mesa_id: str, personagem_id: str, ator: Ator) -> PersonagemRegistro:
    decisao = Autorizador(session).decidir(
        Acao.LER_FICHA, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=personagem_id,
    )
    if not decisao.permitido:
        _negar(decisao)
    personagem = FichaRepository(session).get(mesa_id, personagem_id)
    assert personagem is not None
    return personagem


def _visivel(versao: CartaVersaoRegistro) -> CartaVisivel:
    return CartaVisivel(versao_id=versao.id, definicao_id=versao.definicao_id, numero=versao.numero,
                        tipo=versao.tipo, conteudo=versao.conteudo)


def _instancia_resumo(session: Session, instancia: CartaPersonagemRegistro, narrador: bool) -> CartaPersonagemResumo:
    versao = session.get(CartaVersaoRegistro, instancia.versao_id)
    definicao = session.get(CartaDefinicaoRegistro, instancia.definicao_id)
    return CartaPersonagemResumo(
        id=instancia.id, personagem_id=instancia.personagem_id, tipo=instancia.tipo, estado=instancia.estado,
        origem=instancia.origem, excecao_aprendizado=instancia.excecao_aprendizado, item_id=instancia.item_id,
        efeito_id=instancia.efeito_id, adquirida_em=instancia.adquirida_em, carta=_visivel(versao),
        versao_mais_recente=definicao.versao_publicada if narrador and definicao is not None else None,
    )


def _conflitos(erro: Exception, session: Session) -> HTTPException:
    session.rollback()
    if isinstance(erro, ficha_viva.ConflitoVersao):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão do personagem desatualizada.")
    if isinstance(erro, cartas_ciclo.Conflito):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    if isinstance(erro, PermissionError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(erro))
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))


ERROS = (ficha_viva.ConflitoVersao, cartas_ciclo.RegraCarta, PermissionError, ValueError)


# ------------------------------------------------------------ posse e ciclo

@router.get("/mesas/{mesa_id}/personagens/{personagem_id}/cartas", response_model=list[CartaPersonagemResumo])
def listar_cartas_do_personagem(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[CartaPersonagemResumo]:
    _personagem(session, mesa_id, personagem_id, ator)
    narrador = _eh_narrador(session, mesa_id, ator)
    instancias = session.scalars(
        select(CartaPersonagemRegistro)
        .where(CartaPersonagemRegistro.personagem_id == personagem_id, CartaPersonagemRegistro.estado != "removida")
        .order_by(CartaPersonagemRegistro.adquirida_em, CartaPersonagemRegistro.id)
    )
    return [_instancia_resumo(session, i, narrador) for i in instancias]


@router.post(
    "/mesas/{mesa_id}/personagens/{personagem_id}/cartas",
    response_model=AquisicaoCartasResposta, status_code=status.HTTP_201_CREATED,
)
def conceder_carta(
    mesa_id: str, personagem_id: str, pedido: ConcederCartaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> AquisicaoCartasResposta:
    _exigir_narrador(session, mesa_id, ator)
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    versao = cartas_ciclo.versao_da_mesa(session, mesa_id, pedido.versao_id)
    if versao is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta não encontrada.")
    try:
        aquisicao = cartas_ciclo.adquirir(
            session, personagem, versao, origem="concessao", versao_esperada=pedido.versao_esperada,
            excecao_aprendizado=pedido.excecao_aprendizado,
        )
    except ERROS as erro:
        raise _conflitos(erro, session) from None
    titulo = versao.conteudo["titulo"]
    excecao = " com exceção de aprendizado" if pedido.excecao_aprendizado else ""
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="carta.concedida",
        relevancia="mecanica", personagem=personagem, alvo_tipo="carta", alvo_id=aquisicao.instancia.id,
        resumo=(f"{auditoria.nome_personagem(personagem)}: recebeu “{titulo}”{excecao}"
                + (f" — {pedido.motivo.strip()}" if pedido.motivo and pedido.motivo.strip() else ""))[:500],
        mudancas=[{"campo": "cartas", "antes": None, "depois": aquisicao.instancia.estado, "rotulo": titulo,
                   "completo": True}],
        detalhes={"motivo": (pedido.motivo or "").strip() or None, "versao_id": versao.id,
                  "excecao_aprendizado": pedido.excecao_aprendizado},
        correlacao_id=correlacao,
    )
    session.commit()
    return AquisicaoCartasResposta(versao=aquisicao.versao, cartas=[_instancia_resumo(session, aquisicao.instancia, True)])


def _instancia(session: Session, personagem: PersonagemRegistro, carta_id: str) -> CartaPersonagemRegistro:
    instancia = session.get(CartaPersonagemRegistro, carta_id)
    if instancia is None or instancia.personagem_id != personagem.id or instancia.mesa_id != personagem.mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta não encontrada.")
    return instancia


ROTULOS = {
    "iniciar_aprendizado": "iniciou o aprendizado de", "interromper_aprendizado": "interrompeu o aprendizado de",
    "concluir_aprendizado": "concluiu o aprendizado de", "remover": "perdeu",
}


@router.post(
    "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/transicoes/{acao}",
    response_model=AquisicaoCartasResposta,
)
def transicionar_carta(
    mesa_id: str, personagem_id: str, carta_id: str,
    acao: Literal["iniciar_aprendizado", "interromper_aprendizado", "concluir_aprendizado", "remover"],
    pedido: TransicaoCartaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> AquisicaoCartasResposta:
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    narrador = _eh_narrador(session, mesa_id, ator)
    if not narrador:
        politica = permissoes(session, mesa_id, personagem_id, ator)
        resultado = avaliar_campos(
            {"cartas.aprendizado"}, bloqueados=politica.campos_bloqueados,
            exigem_aprovacao=politica.campos_exigem_aprovacao,
        )
        if not politica.editar or resultado.bloqueados or resultado.exigem_aprovacao:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Alteração não permitida nesta mesa.")
    instancia = _instancia(session, personagem, carta_id)
    try:
        anterior, novo, versao = cartas_ciclo.transicionar(
            session, personagem, instancia, acao=acao, narrador_ator=narrador, versao_esperada=pedido.versao_esperada,
        )
    except ERROS as erro:
        raise _conflitos(erro, session) from None
    titulo = session.get(CartaVersaoRegistro, instancia.versao_id).conteudo["titulo"]
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao=f"carta.{acao}",
        relevancia="mecanica", personagem=personagem, alvo_tipo="carta", alvo_id=instancia.id,
        resumo=(f"{auditoria.nome_personagem(personagem)}: {ROTULOS[acao]} “{titulo}”"
                + (f" — {pedido.motivo.strip()}" if pedido.motivo and pedido.motivo.strip() else ""))[:500],
        mudancas=[{"campo": "estado", "antes": anterior, "depois": novo, "rotulo": titulo, "completo": True}],
        detalhes={"motivo": (pedido.motivo or "").strip() or None},
        correlacao_id=correlacao,
    )
    session.commit()
    return AquisicaoCartasResposta(versao=versao, cartas=[_instancia_resumo(session, instancia, narrador)])


@router.get(
    "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao/previa",
    response_model=PreviaMigracaoCarta,
)
def previsualizar_migracao(
    mesa_id: str, personagem_id: str, carta_id: str, versao_destino_id: str,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PreviaMigracaoCarta:
    _exigir_narrador(session, mesa_id, ator)
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    instancia = _instancia(session, personagem, carta_id)
    destino = cartas_ciclo.versao_da_mesa(session, mesa_id, versao_destino_id)
    if destino is None or destino.definicao_id != instancia.definicao_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versão não encontrada para esta carta.")
    origem = session.get(CartaVersaoRegistro, instancia.versao_id)
    return PreviaMigracaoCarta(
        origem_numero=origem.numero, destino_numero=destino.numero,
        diferencas=[DiferencaCarta(**d) for d in cartas_ciclo.diferencas(origem, destino)],
        observacao=("O item ou efeito já existente na ficha mantém seus dados atuais."
                    if instancia.tipo in {"item", "efeito"} else None),
    )


@router.post(
    "/mesas/{mesa_id}/personagens/{personagem_id}/cartas/{carta_id}/migracao",
    response_model=AquisicaoCartasResposta,
)
def migrar_carta(
    mesa_id: str, personagem_id: str, carta_id: str, pedido: MigrarCartaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> AquisicaoCartasResposta:
    _exigir_narrador(session, mesa_id, ator)
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    instancia = _instancia(session, personagem, carta_id)
    destino = cartas_ciclo.versao_da_mesa(session, mesa_id, pedido.versao_destino_id)
    if destino is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versão não encontrada.")
    origem = session.get(CartaVersaoRegistro, instancia.versao_id)
    try:
        versao = cartas_ciclo.migrar(session, personagem, instancia, destino, versao_esperada=pedido.versao_esperada)
    except ERROS as erro:
        raise _conflitos(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="carta.migrada",
        relevancia="mecanica", personagem=personagem, alvo_tipo="carta", alvo_id=instancia.id,
        resumo=(f"{auditoria.nome_personagem(personagem)}: “{destino.conteudo['titulo']}” migrada da versão "
                f"{origem.numero} para {destino.numero}")[:500],
        mudancas=[{"campo": f"carta.{d['campo']}", **{k: d[k] for k in ("antes", "depois")}, "completo": True}
                  for d in cartas_ciclo.diferencas(origem, destino)],
        detalhes={"versao_origem": origem.id, "versao_destino": destino.id},
        correlacao_id=correlacao,
    )
    session.commit()
    return AquisicaoCartasResposta(versao=versao, cartas=[_instancia_resumo(session, instancia, True)])


# ----------------------------------------------------------------- ofertas

def _oferta_resumo(session: Session, oferta: OfertaCartasRegistro, visiveis: set[str] | None) -> OfertaResumo:
    destinatarios = session.scalars(
        select(OfertaDestinatarioRegistro).where(OfertaDestinatarioRegistro.oferta_id == oferta.id)
        .order_by(OfertaDestinatarioRegistro.personagem_id)
    )
    escolhas: dict[str, list[str]] = {}
    for escolha in session.scalars(select(OfertaEscolhaRegistro).where(OfertaEscolhaRegistro.oferta_id == oferta.id)):
        escolhas.setdefault(escolha.personagem_id, []).append(escolha.versao_id)
    expirada = cartas_ciclo.expirada(oferta)
    return OfertaResumo(
        id=oferta.id, titulo=oferta.titulo, estado=oferta.estado, min_escolhas=oferta.min_escolhas,
        max_escolhas=oferta.max_escolhas, expira_em=oferta.expira_em, expirada=expirada, criado_em=oferta.criado_em,
        candidatas=[_visivel(v) for v in cartas_ciclo.candidatas(session, oferta.id)],
        destinatarios=[
            DestinatarioOferta(
                personagem_id=d.personagem_id,
                estado="expirada" if expirada and d.estado == "pendente" else d.estado,
                escolhas=escolhas.get(d.personagem_id, []), respondido_em=d.respondido_em,
            )
            for d in destinatarios if visiveis is None or d.personagem_id in visiveis
        ],
    )


@router.post("/mesas/{mesa_id}/ofertas", response_model=OfertaResumo, status_code=status.HTTP_201_CREATED)
def criar_oferta(
    mesa_id: str, pedido: CriarOfertaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> OfertaResumo:
    _exigir_narrador(session, mesa_id, ator)
    try:
        oferta = cartas_ciclo.criar_oferta(
            session, mesa_id=mesa_id, titulo=pedido.titulo, versao_ids=pedido.versao_ids,
            personagem_ids=pedido.personagem_ids, min_escolhas=pedido.min_escolhas,
            max_escolhas=pedido.max_escolhas, expira_em=pedido.expira_em, ator_id=ator.usuario_id,
        )
    except ERROS as erro:
        raise _conflitos(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="oferta.criada",
        relevancia="mecanica", alvo_tipo="oferta", alvo_id=oferta.id, visibilidade="narrador",
        resumo=(f"Oferta “{oferta.titulo}”: {len(pedido.versao_ids)} carta(s) para "
                f"{len(pedido.personagem_ids)} personagem(ns), escolher {oferta.min_escolhas}–{oferta.max_escolhas}")[:500],
        detalhes={"candidatas": pedido.versao_ids, "destinatarios": pedido.personagem_ids},
        correlacao_id=correlacao,
    )
    session.commit()
    return _oferta_resumo(session, oferta, None)


@router.get("/mesas/{mesa_id}/ofertas", response_model=list[OfertaResumo])
def listar_ofertas(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[OfertaResumo]:
    autorizador = Autorizador(session)
    decisao = autorizador.decidir(Acao.LER_MESA, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        _negar(decisao)
    ofertas = list(session.scalars(
        select(OfertaCartasRegistro).where(OfertaCartasRegistro.mesa_id == mesa_id)
        .order_by(OfertaCartasRegistro.criado_em.desc(), OfertaCartasRegistro.id)
    ))
    if _eh_narrador(session, mesa_id, ator):
        return [_oferta_resumo(session, o, None) for o in ofertas]
    legiveis = {
        p.id for p in FichaRepository(session).listar(mesa_id)
        if autorizador.decidir(Acao.LER_FICHA, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=p.id).permitido
    }
    resultado = []
    for oferta in ofertas:
        resumo = _oferta_resumo(session, oferta, legiveis)
        if resumo.destinatarios:
            resultado.append(resumo)
    return resultado


@router.post(
    "/mesas/{mesa_id}/ofertas/{oferta_id}/respostas/{personagem_id}", response_model=AquisicaoCartasResposta,
)
def responder_oferta(
    mesa_id: str, oferta_id: str, personagem_id: str, pedido: ResponderOfertaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> AquisicaoCartasResposta:
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    oferta = session.get(OfertaCartasRegistro, oferta_id)
    if oferta is None or oferta.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oferta não encontrada.")
    try:
        aquisicoes, versao = cartas_ciclo.responder_oferta(
            session, oferta, personagem, pedido.escolhas, ator_id=ator.usuario_id,
            versao_esperada=pedido.versao_esperada,
        )
    except LookupError:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oferta não encontrada.") from None
    except ERROS as erro:
        raise _conflitos(erro, session) from None
    titulos = [session.get(CartaVersaoRegistro, a.instancia.versao_id).conteudo["titulo"] for a in aquisicoes]
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="oferta.respondida",
        relevancia="mecanica", personagem=personagem, alvo_tipo="oferta", alvo_id=oferta.id,
        resumo=(f"{auditoria.nome_personagem(personagem)}: escolheu "
                + (", ".join(f"“{t}”" for t in titulos) or "nenhuma carta") + f" em “{oferta.titulo}”")[:500],
        mudancas=[{"campo": "cartas", "antes": None, "depois": a.instancia.estado, "rotulo": t, "completo": True}
                  for a, t in zip(aquisicoes, titulos)],
        correlacao_id=correlacao,
    )
    session.commit()
    narrador = _eh_narrador(session, mesa_id, ator)
    return AquisicaoCartasResposta(
        versao=versao, cartas=[_instancia_resumo(session, a.instancia, narrador) for a in aquisicoes],
    )


@router.post("/mesas/{mesa_id}/ofertas/{oferta_id}/cancelamento", response_model=OfertaResumo)
def cancelar_oferta(
    mesa_id: str, oferta_id: str,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> OfertaResumo:
    _exigir_narrador(session, mesa_id, ator)
    oferta = session.get(OfertaCartasRegistro, oferta_id)
    if oferta is None or oferta.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oferta não encontrada.")
    try:
        cartas_ciclo.encerrar_oferta(session, oferta)
    except ERROS as erro:
        raise _conflitos(erro, session) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="oferta.cancelada",
        relevancia="mecanica", alvo_tipo="oferta", alvo_id=oferta.id, visibilidade="narrador",
        resumo=f"Oferta “{oferta.titulo}” cancelada"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return _oferta_resumo(session, oferta, None)


# ------------------------------------------------------------ apresentação

def _apresentacao_resumo(session: Session, apresentacao: ApresentacaoCartaRegistro, narrador: bool) -> ApresentacaoResumo:
    return ApresentacaoResumo(
        id=apresentacao.id, estado=apresentacao.estado, apresentada_em=apresentacao.apresentada_em,
        carta=_visivel(session.get(CartaVersaoRegistro, apresentacao.versao_id)),
        destinatarios=list(apresentacao.destinatarios) if narrador else None,
    )


@router.post("/mesas/{mesa_id}/apresentacoes", response_model=ApresentacaoResumo, status_code=status.HTTP_201_CREATED)
def apresentar_carta(
    mesa_id: str, pedido: ApresentarCartaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ApresentacaoResumo:
    """Mostra a carta sem criar posse para nenhum personagem."""
    _exigir_narrador(session, mesa_id, ator)
    versao = cartas_ciclo.versao_da_mesa(session, mesa_id, pedido.versao_id)
    if versao is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta não encontrada.")
    membros = {m.usuario_id for m in MesaRepository(session).listar_membros(mesa_id)}
    if any(d not in membros for d in pedido.destinatarios):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail="Todos os destinatários precisam participar da mesa.")
    apresentacao = ApresentacaoCartaRegistro(
        id=uuid4().hex, mesa_id=mesa_id, versao_id=versao.id, destinatarios=sorted(set(pedido.destinatarios)),
        estado="apresentada", apresentada_por=ator.usuario_id,
    )
    session.add(apresentacao)
    session.flush()
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="carta.apresentada",
        relevancia="narrativa", alvo_tipo="apresentacao", alvo_id=apresentacao.id, visibilidade="narrador",
        resumo=f"Carta apresentada: {versao.conteudo['titulo']}"[:500], correlacao_id=correlacao,
    )
    session.commit()
    return _apresentacao_resumo(session, apresentacao, True)


@router.get("/mesas/{mesa_id}/apresentacoes", response_model=list[ApresentacaoResumo])
def listar_apresentacoes(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[ApresentacaoResumo]:
    decisao = Autorizador(session).decidir(Acao.LER_MESA, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        _negar(decisao)
    narrador = _eh_narrador(session, mesa_id, ator)
    return [
        _apresentacao_resumo(session, a, narrador)
        for a in cartas_ciclo.apresentacoes_ativas(session, mesa_id, None if narrador else ator.usuario_id)
    ]


@router.post("/mesas/{mesa_id}/apresentacoes/{apresentacao_id}/recolhimento", response_model=ApresentacaoResumo)
def recolher_carta(
    mesa_id: str, apresentacao_id: str,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ApresentacaoResumo:
    _exigir_narrador(session, mesa_id, ator)
    apresentacao = session.get(ApresentacaoCartaRegistro, apresentacao_id)
    if apresentacao is None or apresentacao.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apresentação não encontrada.")
    if apresentacao.estado != "apresentada":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A carta já foi recolhida.")
    apresentacao.estado = "recolhida"
    apresentacao.recolhida_em = cartas_ciclo._agora()
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="carta", acao="carta.recolhida",
        relevancia="narrativa", alvo_tipo="apresentacao", alvo_id=apresentacao.id, visibilidade="narrador",
        resumo="Carta recolhida", correlacao_id=correlacao,
    )
    session.commit()
    return _apresentacao_resumo(session, apresentacao, True)
