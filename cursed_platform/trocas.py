"""Ofertas de item entre personagens (carga-por-espacos D8).

O item continua com quem oferece até a resposta. Aceitar passa o item ao destinatário, com efeitos e
posse de carta, e pode colocá-lo num lugar escolhido da grade. Só uma oferta pendente por item.
Nenhuma função confirma a transação.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import ficha_viva, inventario_grade, recipientes
from cursed_platform.domain import grade as motor
from cursed_platform.persistence import ItemInventarioRegistro, OfertaItemRegistro, PersonagemRegistro


class OfertaInvalida(ValueError):
    """Pedido que não faz sentido (mesmo personagem, lugar inválido)."""


class OfertaIndisponivel(ValueError):
    """A oferta já foi decidida, ou o item já está oferecido."""


class ItemSaiu(OfertaIndisponivel):
    """O item não está mais com quem o ofereceu; a oferta deve ser cancelada."""


def _agora() -> datetime:
    return datetime.now(UTC)


def _personagem(session: Session, mesa_id: str, personagem_id: str) -> PersonagemRegistro | None:
    return session.scalar(select(PersonagemRegistro).where(
        PersonagemRegistro.mesa_id == mesa_id, PersonagemRegistro.id == personagem_id,
        PersonagemRegistro.excluido_em.is_(None),
    ))


def item_ainda_com_quem_oferece(session: Session, oferta: OfertaItemRegistro) -> ItemInventarioRegistro | None:
    item = session.get(ItemInventarioRegistro, oferta.item_id)
    if item is None or item.mesa_id != oferta.mesa_id or item.personagem_id != oferta.de_personagem_id:
        return None
    return item


def pendentes(session: Session, mesa_id: str) -> list[OfertaItemRegistro]:
    """Ofertas pendentes cujo item ainda está com quem ofereceu."""
    ofertas = session.scalars(select(OfertaItemRegistro).where(
        OfertaItemRegistro.mesa_id == mesa_id, OfertaItemRegistro.estado == "pendente",
    ).order_by(OfertaItemRegistro.criado_em, OfertaItemRegistro.id))
    return [o for o in ofertas if item_ainda_com_quem_oferece(session, o) is not None]


def ofertar(
    session: Session, de: PersonagemRegistro, item: ItemInventarioRegistro, para: PersonagemRegistro,
) -> OfertaItemRegistro:
    if para.id == de.id:
        raise OfertaInvalida("Escolha outro personagem para receber o item.")
    anterior = session.scalar(select(OfertaItemRegistro).where(
        OfertaItemRegistro.item_id == item.id, OfertaItemRegistro.estado == "pendente",
    ))
    if anterior is not None:
        raise OfertaIndisponivel("Este item já está oferecido; cancele a oferta antes de fazer outra.")
    oferta = OfertaItemRegistro(
        id=uuid4().hex, mesa_id=de.mesa_id, item_id=item.id, de_personagem_id=de.id, para_personagem_id=para.id,
        estado="pendente",
    )
    session.add(oferta)
    session.flush()
    return oferta


def travar_pendente(session: Session, mesa_id: str, oferta_id: str) -> OfertaItemRegistro | None:
    """A linha da oferta fica travada até o fim da transação: duas respostas simultâneas não passam juntas."""
    oferta = session.scalar(select(OfertaItemRegistro).where(
        OfertaItemRegistro.id == oferta_id, OfertaItemRegistro.mesa_id == mesa_id,
    ).with_for_update().execution_options(populate_existing=True))
    if oferta is None:
        return None
    if oferta.estado != "pendente":
        raise OfertaIndisponivel("Esta oferta já foi respondida.")
    return oferta


def decidir(oferta: OfertaItemRegistro, estado: str) -> None:
    oferta.estado, oferta.decidido_em = estado, _agora()


def aceitar(
    session: Session, oferta: OfertaItemRegistro, versao_esperada: int,
    coluna: int | None = None, linha: int | None = None, girado: bool = False,
) -> tuple[int, ItemInventarioRegistro]:
    """Passa o item ao destinatário. Sem lugar escolhido, ele chega fora da grade."""
    de = _personagem(session, oferta.mesa_id, oferta.de_personagem_id)
    para = _personagem(session, oferta.mesa_id, oferta.para_personagem_id)
    item = item_ainda_com_quem_oferece(session, oferta)
    if de is None or para is None or item is None:
        raise ItemSaiu("O item não está mais com quem o ofereceu.")
    versao = ficha_viva._avancar_versao(session, para, versao_esperada)
    ficha_viva._avancar_versao(session, de, de.versao)
    novo = recipientes.transferir(session, de, para, item)
    if coluna is not None and linha is not None and novo.largura is not None:
        ctx = inventario_grade.contexto(session, para)
        candidato = inventario_grade.para_motor(novo, coluna=coluna, linha=linha, girado=girado)
        resultado = motor.validar_posicao(ctx.grade, [i for i in ctx.itens if i.id != novo.id], candidato, coluna, linha, girado)
        if not resultado.ok:
            raise OfertaInvalida("Não há espaço nesse lugar da grade." if resultado.motivo == "sobreposicao"
                                 else "Esse lugar fica fora da grade.")
        novo.coluna, novo.linha, novo.girado = coluna, linha, girado
    decidir(oferta, "aceita")
    session.flush()
    return versao, novo
