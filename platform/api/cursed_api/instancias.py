"""Instâncias de personagem (instancias-de-personagem, D4): promover uma instância a ficha comum e excluir as
instâncias de um modelo que ficaram fora da cena. Só o Narrador."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, instancias
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import LimpezaDeInstancias, PersonagemResumo
from cursed_platform.persistence import CenaRegistro, PersonagemRegistro
from cursed_platform.repositories import FichaRepository

from .auth import Ator, get_actor
from .characters import _personagem_resumo, registrar_tokens_removidos
from .dependencies import get_correlacao, get_session


router = APIRouter(tags=["Personagens"])


def _narrador(session: Session, mesa_id: str, ator: Ator) -> None:
    decisao = Autorizador(session).decidir(Acao.ADMINISTRAR_ENTIDADES, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Mesa não encontrada." if decisao.ocultar_existencia else "Só o Narrador cuida das instâncias.",
        )


def _personagem(session: Session, mesa_id: str, personagem_id: str) -> PersonagemRegistro:
    personagem = FichaRepository(session).get(mesa_id, personagem_id)
    if personagem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personagem não encontrado.")
    return personagem


@router.post("/mesas/{mesa_id}/personagens/{personagem_id}/promocao", response_model=PersonagemResumo)
def promover_instancia(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> PersonagemResumo:
    """A instância vira uma ficha comum da mesa: sai de baixo do modelo, entra no acervo e serve de modelo."""
    _narrador(session, mesa_id, ator)
    personagem = _personagem(session, mesa_id, personagem_id)
    modelo = session.get(PersonagemRegistro, personagem.instancia_de) if personagem.instancia_de else None
    try:
        instancias.promover(session, personagem)
    except instancias.InstanciaInvalida as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="personagem", acao="personagem.promovido",
        relevancia="organizacional", personagem=personagem,
        resumo=f"{auditoria.nome_personagem(personagem)}: promovido a ficha"
               + (f" (era instância de {auditoria.nome_personagem(modelo)})" if modelo else ""),
        detalhes={"modelo_id": modelo.id if modelo else None}, correlacao_id=correlacao,
    )
    session.commit()
    return _personagem_resumo(personagem, FichaRepository(session))


@router.post("/mesas/{mesa_id}/personagens/{personagem_id}/instancias/limpeza", response_model=LimpezaDeInstancias)
def excluir_instancias_fora_da_cena(
    mesa_id: str, personagem_id: str, cena_id: str = Query(min_length=1, max_length=100),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session), correlacao: str = Depends(get_correlacao),
) -> LimpezaDeInstancias:
    """Envia à lixeira as instâncias do modelo sem token na cena; devolve quantas foram."""
    _narrador(session, mesa_id, ator)
    modelo = _personagem(session, mesa_id, personagem_id)
    cena = session.get(CenaRegistro, cena_id)
    if cena is None or cena.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cena não encontrada.")
    fichas = FichaRepository(session)
    excluidas = []
    for instancia in instancias.fora_da_cena(session, modelo, cena.id):
        if not fichas.excluir(mesa_id, instancia.id, instancia.versao, ator.usuario_id):
            continue
        auditoria.registrar(
            session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="personagem", acao="personagem.excluido",
            relevancia="organizacional", personagem=instancia,
            resumo=f"{auditoria.nome_personagem(instancia)}: enviado à lixeira (instância fora da cena {cena.nome})"[:500],
            correlacao_id=correlacao,
        )
        # Sem token na cena aberta, mas pode ter em outra: a ficha na lixeira não deixa token órfão.
        registrar_tokens_removidos(session, mesa_id, instancia, ator.usuario_id, correlacao)
        excluidas.append(instancia.id)
    session.commit()
    return LimpezaDeInstancias(excluidas=len(excluidas), ids=excluidas)
