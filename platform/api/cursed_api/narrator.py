"""Ferramentas do Narrador: entidades ocultas, revelação granular e efeitos aplicados."""

from __future__ import annotations

from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, catalogos, ficha_viva, narrador
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    AjustarEfeitoRequest, AlterarVisibilidadeRequest, AplicarEfeitoRequest, CriarEntidadeRequest,
    EfeitoComandoResposta, EfeitoResumo, EntidadePublica, FonteEfeitoResumo, ModificadorResumo,
    PersonagemResumo, TransicaoEfeitoRequest,
)
from cursed_platform.domain.ficha import FichaDraft
from cursed_platform.persistence import EfeitoAplicadoRegistro, PersonagemRegistro
from cursed_platform.repositories import FichaRepository, MesaRepository

from .auth import Ator, get_actor
from .characters import _personagem_resumo
from .catalogo_ficha import atualizar_cartas
from .live_sheet import icones_para
from .dependencies import get_correlacao, get_session
from .validacao import exigir_ficha_valida, preparar_ficha_nova


router = APIRouter(tags=["Ferramentas do Narrador"])


def _exigir(session: Session, acao: Acao, mesa_id: str, ator: Ator, personagem_id: str | None = None) -> None:
    decisao = Autorizador(session).decidir(
        acao, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=personagem_id,
    )
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Recurso não encontrado." if decisao.ocultar_existencia else decisao.motivo,
        )


def _personagem_do_narrador(session: Session, mesa_id: str, personagem_id: str, ator: Ator, acao: Acao) -> PersonagemRegistro:
    _exigir(session, acao, mesa_id, ator)
    personagem = FichaRepository(session).get(mesa_id, personagem_id)
    if personagem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado.")
    return personagem


def _eh_efeito_default(associacao: str | None) -> bool:
    return bool(associacao) and any(e["associacao"] == associacao for e in catalogos.obter().efeitos_aplicaveis())


def _personagem_para_efeito(
    session: Session, mesa_id: str, personagem_id: str, ator: Ator, *, efeito_default: bool,
) -> PersonagemRegistro:
    """Narrador em qualquer personagem; jogador só com efeito default, no próprio personagem e se a mesa permitir."""
    autorizador = Autorizador(session)
    do_narrador = autorizador.decidir(Acao.APLICAR_EFEITO, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not do_narrador.permitido:
        if do_narrador.ocultar_existencia:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado.")
        if not efeito_default:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Efeitos personalizados são aplicados pelo Narrador.")
        decisao = autorizador.decidir(Acao.APLICAR_EFEITO_PADRAO_PROPRIO, usuario_id=ator.usuario_id,
                                      mesa_id=mesa_id, personagem_id=personagem_id)
        if not decisao.permitido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
                detail="Recurso não encontrado." if decisao.ocultar_existencia else decisao.motivo,
            )
    personagem = FichaRepository(session).get(mesa_id, personagem_id)
    if personagem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado.")
    return personagem


# ---------------------------------------------------------------- entidades

@router.post("/mesas/{mesa_id}/entidades", response_model=PersonagemResumo, status_code=status.HTTP_201_CREATED)
def criar_entidade(
    mesa_id: str, pedido: CriarEntidadeRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> PersonagemResumo:
    """Personagem, NPC ou monstro do Narrador; oculto por padrão."""
    _exigir(session, Acao.ADMINISTRAR_ENTIDADES, mesa_id, ator)
    payload = FichaDraft.de_payload(pedido.ficha.model_dump(mode="json")).para_payload()
    nome = payload["personagem"].get("nome")
    if not isinstance(nome, str) or not nome.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Nome da entidade obrigatório.")
    preparar_ficha_nova(payload, tipo=pedido.tipo, pelo_narrador=True)
    exigir_ficha_valida(None, payload, tipo=pedido.tipo)
    if pedido.proprietario_id is not None:
        membro = MesaRepository(session).membro(mesa_id, pedido.proprietario_id)
        if membro is None or not membro.ativo:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="O proprietário precisa participar da mesa.",
            )
    personagem = PersonagemRegistro(
        id=uuid4().hex, mesa_id=mesa_id, proprietario_id=pedido.proprietario_id, tipo=pedido.tipo,
        visibilidade=pedido.visibilidade, versao=0, ficha=payload,
        revelacao=narrador.normalizar_revelacao(pedido.revelacao.nome_publico, pedido.revelacao.imagem),
    )
    session.add(personagem)
    session.flush()
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="personagem", acao="personagem.criado",
        relevancia="organizacional", personagem=personagem,
        resumo=f"{auditoria.nome_personagem(personagem)}: {pedido.tipo} criado pelo Narrador",
        correlacao_id=correlacao,
    )
    atualizar_cartas(session, personagem, None, payload, ator_id=ator.usuario_id, correlacao_id=correlacao)
    session.commit()
    return _personagem_resumo(personagem)


@router.put("/mesas/{mesa_id}/personagens/{personagem_id}/visibilidade", response_model=PersonagemResumo)
def alterar_visibilidade(
    mesa_id: str, personagem_id: str, pedido: AlterarVisibilidadeRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> PersonagemResumo:
    personagem = _personagem_do_narrador(session, mesa_id, personagem_id, ator, Acao.ADMINISTRAR_ENTIDADES)
    antes = {"visibilidade": personagem.visibilidade, "revelacao": dict(personagem.revelacao or {})}
    depois = {
        "visibilidade": pedido.visibilidade,
        "revelacao": narrador.normalizar_revelacao(pedido.revelacao.nome_publico, pedido.revelacao.imagem),
    }
    alteracoes = auditoria.mudancas(antes, depois)
    if not alteracoes:
        return _personagem_resumo(personagem)
    try:
        ficha_viva._avancar_versao(session, personagem, pedido.versao_esperada)
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.") from None
    session.refresh(personagem)
    personagem.visibilidade = depois["visibilidade"]
    personagem.revelacao = depois["revelacao"]
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="personagem",
        acao="personagem.visibilidade_alterada", relevancia="organizacional", personagem=personagem,
        resumo=f"{auditoria.nome_personagem(personagem)}: visibilidade alterada", mudancas=alteracoes,
        visibilidade="narrador", correlacao_id=correlacao,
    )
    session.commit()
    return _personagem_resumo(personagem)


@router.get("/mesas/{mesa_id}/entidades-publicas", response_model=list[EntidadePublica])
def listar_entidades_publicas(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[EntidadePublica]:
    """O que qualquer participante vê: nome público e retrato, nunca a ficha."""
    _exigir(session, Acao.LER_MESA, mesa_id, ator)
    publicas = (narrador.entidade_publica(p) for p in FichaRepository(session).listar(mesa_id))
    return sorted(
        (EntidadePublica(**dados) for dados in publicas if dados is not None),
        key=lambda e: ((e.nome_publico or "").casefold(), e.id),
    )


# ------------------------------------------------------------------ efeitos

def _efeito_resumo(session: Session, efeito: EfeitoAplicadoRegistro) -> EfeitoResumo:
    atual = next((e for e in ficha_viva.efeitos(session, efeito.mesa_id, efeito.personagem_id) if e.id == efeito.id), None)
    modificadores = atual.modificadores if atual is not None else []
    fontes = atual.fontes if atual is not None else []
    return EfeitoResumo(
        associacao=efeito.associacao, icone=icones_para(session, efeito.mesa_id)(efeito.associacao, efeito.conteudo),
        id=efeito.id, nome=efeito.nome, descricao=efeito.descricao, estado=efeito.estado,
        duracao_rodadas=efeito.duracao_rodadas, ativacao=((efeito.conteudo or {}).get("ativacao") or {}).get("tipo"),
        modificadores=[ModificadorResumo(alvo=m.alvo, valor=m.valor, contexto=m.contexto) for m in modificadores],
        fontes=[FonteEfeitoResumo(tipo=f.tipo, descricao=f.descricao, equipamento_id=f.equipamento_id) for f in fontes],
    )


def _registrar_efeito(
    session: Session, personagem: PersonagemRegistro, efeito: EfeitoAplicadoRegistro, ator: Ator,
    acao: str, descricao: str, mudancas: list[dict], motivo: str | None, correlacao: str,
) -> None:
    auditoria.registrar(
        session, mesa_id=personagem.mesa_id, ator_id=ator.usuario_id, categoria="efeito", acao=acao,
        relevancia="mecanica", personagem=personagem, alvo_tipo="efeito", alvo_id=efeito.id,
        resumo=(f"{auditoria.nome_personagem(personagem)}: {efeito.nome} {descricao}"
                + (f" — {motivo.strip()}" if motivo and motivo.strip() else ""))[:500],
        mudancas=mudancas, detalhes={"motivo": (motivo or "").strip() or None}, correlacao_id=correlacao,
    )


@router.post(
    "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos",
    response_model=EfeitoComandoResposta, status_code=status.HTTP_201_CREATED,
)
def aplicar_efeito(
    mesa_id: str, personagem_id: str, pedido: AplicarEfeitoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EfeitoComandoResposta:
    personagem = _personagem_para_efeito(session, mesa_id, personagem_id, ator,
                                         efeito_default=_eh_efeito_default(pedido.associacao))
    try:
        aplicacao = narrador.aplicar_efeito_substituindo(
            session, personagem, versao_esperada=pedido.versao_esperada, associacao=pedido.associacao,
            nome=pedido.nome, descricao=pedido.descricao,
            modificadores=[m.model_dump() for m in pedido.modificadores],
            duracao_rodadas=pedido.duracao_rodadas, origem=pedido.origem,
        )
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.") from None
    except ValueError as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    efeito = aplicacao.efeito
    resumo = _efeito_resumo(session, efeito)
    _registrar_efeito(
        session, personagem, efeito, ator, "efeito.aplicado", "aplicado",
        [{"campo": "efeito", "antes": None, "completo": True, "rotulo": efeito.nome,
          "depois": " · ".join(filter(None, [
              efeito.descricao,
              f"{efeito.duracao_rodadas} rodada(s)" if efeito.duracao_rodadas else None,
              f"origem: {resumo.fontes[0].descricao}" if resumo.fontes and resumo.fontes[0].descricao else None,
              ", ".join(f"{m.alvo} {m.valor:+g}" + (f" ({m.contexto})" if m.contexto else "") for m in resumo.modificadores) or None,
          ]))}],
        pedido.motivo, correlacao,
    )
    for substituido in aplicacao.substituidos:
        _registrar_efeito(
            session, personagem, substituido, ator, "efeito.encerrado", f"encerrado: substituído por {efeito.nome}",
            [{"campo": "estado", "antes": "ativo", "depois": "encerrado", "completo": True, "rotulo": substituido.nome}],
            None, correlacao,
        )
    session.commit()
    return EfeitoComandoResposta(versao=pedido.versao_esperada + 1, efeito=resumo)


@router.patch("/mesas/{mesa_id}/personagens/{personagem_id}/efeitos/{efeito_id}", response_model=EfeitoComandoResposta)
def ajustar_efeito(
    mesa_id: str, personagem_id: str, efeito_id: str, pedido: AjustarEfeitoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EfeitoComandoResposta:
    personagem = _personagem_do_narrador(session, mesa_id, personagem_id, ator, Acao.APLICAR_EFEITO)
    efeito = narrador.efeito_do_personagem(session, personagem, efeito_id)
    if efeito is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Efeito não encontrado.")
    campos = {
        chave: (
            [m.model_dump() for m in pedido.modificadores] if chave == "modificadores" and pedido.modificadores is not None
            else getattr(pedido, chave)
        )
        for chave in pedido.model_fields_set & {"descricao", "duracao_rodadas", "modificadores"}
    }
    try:
        alteracoes = narrador.ajustar_efeito(
            session, personagem, efeito, versao_esperada=pedido.versao_esperada, campos=campos,
        )
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.") from None
    except narrador.TransicaoInvalida as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from None
    except ValueError as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    if not alteracoes:
        session.rollback()
        return EfeitoComandoResposta(versao=pedido.versao_esperada, efeito=_efeito_resumo(session, efeito))
    _registrar_efeito(
        session, personagem, efeito, ator, "efeito.ajustado", "ajustado",
        [{"campo": campo, "antes": antes, "depois": depois, "completo": True, "rotulo": efeito.nome}
         for campo, (antes, depois) in alteracoes.items()],
        pedido.motivo, correlacao,
    )
    session.commit()
    return EfeitoComandoResposta(versao=pedido.versao_esperada + 1, efeito=_efeito_resumo(session, efeito))


@router.post(
    "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos/{efeito_id}/{acao}",
    response_model=EfeitoComandoResposta,
)
def transicionar_efeito(
    mesa_id: str, personagem_id: str, efeito_id: str, acao: Literal["suspender", "retomar", "encerrar"],
    pedido: TransicaoEfeitoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EfeitoComandoResposta:
    alvo = FichaRepository(session).get(mesa_id, personagem_id)
    registro = narrador.efeito_do_personagem(session, alvo, efeito_id) if alvo is not None else None
    # O jogador só encerra efeitos default; suspender e retomar continuam com o Narrador.
    default = acao == "encerrar" and registro is not None and _eh_efeito_default(registro.associacao)
    personagem = _personagem_para_efeito(session, mesa_id, personagem_id, ator, efeito_default=default)
    efeito = narrador.efeito_do_personagem(session, personagem, efeito_id)
    if efeito is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Efeito não encontrado.")
    try:
        anterior, novo = narrador.transicionar_efeito(
            session, personagem, efeito, acao=acao, versao_esperada=pedido.versao_esperada,
        )
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.") from None
    except narrador.TransicaoInvalida as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from None
    rotulos = {"suspender": "suspenso", "retomar": "retomado", "encerrar": "encerrado"}
    _registrar_efeito(
        session, personagem, efeito, ator, f"efeito.{rotulos[acao]}", rotulos[acao],
        [{"campo": "estado", "antes": anterior, "depois": novo, "completo": True, "rotulo": efeito.nome}],
        pedido.motivo, correlacao,
    )
    session.commit()
    return EfeitoComandoResposta(versao=pedido.versao_esperada + 1, efeito=_efeito_resumo(session, efeito))
