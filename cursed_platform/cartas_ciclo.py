"""Posse de cartas: concessão, ofertas, aprendizado, itens, efeitos, apresentação e migração de versão.

Ciclos por tipo (design, decisão 8):
- habilidade/magia: disponivel → em_aprendizado → aprendida (ou disponivel ← interrompido);
  somente concessão com exceção explícita cria `aprendida` diretamente.
- item: entra no inventário (`no_inventario`); equipar segue o inventário; `remover` retira o item.
- efeito: aplicado ao personagem (`aplicada`); `remover` encerra o efeito.
Nenhum desses ciclos decide quando a evolução é oferecida: isso continua com o Narrador.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Iterable
from uuid import uuid4

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from cursed_platform import ficha_viva, narrador
from cursed_platform.persistence import (
    ApresentacaoCartaRegistro, CartaPersonagemRegistro, CartaVersaoRegistro, EfeitoAplicadoRegistro,
    FonteEfeitoRegistro, ItemInventarioRegistro, OfertaCandidatoRegistro, OfertaCartasRegistro,
    OfertaDestinatarioRegistro, OfertaEscolhaRegistro, PersonagemRegistro,
)


class RegraCarta(ValueError):
    """Pedido incompatível com o ciclo ou com a oferta (resposta 409 ou 422 conforme o caso)."""


class Conflito(RegraCarta):
    """Estado mudou ou já foi decidido por outra ação."""


APRENDIZAVEIS = {"habilidade", "magia"}
TRANSICOES = {
    # ação: (tipos, estados de origem, estado de destino, exige Narrador)
    "iniciar_aprendizado": (APRENDIZAVEIS, {"disponivel"}, "em_aprendizado", False),
    "interromper_aprendizado": (APRENDIZAVEIS, {"em_aprendizado"}, "disponivel", False),
    "concluir_aprendizado": (APRENDIZAVEIS, {"em_aprendizado"}, "aprendida", True),
    "remover": ({"habilidade", "magia", "item", "efeito"},
                {"disponivel", "em_aprendizado", "aprendida", "no_inventario", "aplicada"}, "removida", True),
}


def _agora() -> datetime:
    return datetime.now(UTC)


def _como_utc(momento: datetime | None) -> datetime | None:
    if momento is not None and momento.tzinfo is None:
        return momento.replace(tzinfo=UTC)
    return momento


def versao_da_mesa(session: Session, mesa_id: str, versao_id: str) -> CartaVersaoRegistro | None:
    versao = session.get(CartaVersaoRegistro, versao_id)
    return versao if versao is not None and versao.mesa_id == mesa_id else None


def _modificadores(declarados: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"alvo": m["alvo"], "valor": m["valor"], "contexto": m.get("contexto")} for m in declarados]


@dataclass
class Aquisicao:
    instancia: CartaPersonagemRegistro
    versao: int


def adquirir(
    session: Session,
    personagem: PersonagemRegistro,
    versao: CartaVersaoRegistro,
    *,
    origem: str,
    versao_esperada: int,
    excecao_aprendizado: bool = False,
) -> Aquisicao:
    """Cria a posse conforme o tipo. Não confirma a transação."""
    conteudo = versao.conteudo
    item_id = efeito_id = None
    if versao.tipo in APRENDIZAVEIS:
        ativa = session.scalar(select(CartaPersonagemRegistro.id).where(
            CartaPersonagemRegistro.personagem_id == personagem.id,
            CartaPersonagemRegistro.definicao_id == versao.definicao_id,
            CartaPersonagemRegistro.estado != "removida",
        ))
        if ativa is not None:
            raise Conflito(f"O personagem já possui “{conteudo['titulo']}”.")
        nova_versao = ficha_viva._avancar_versao(session, personagem, versao_esperada)
        estado = "aprendida" if excecao_aprendizado else "disponivel"
    elif excecao_aprendizado:
        raise RegraCarta("A exceção de aprendizado só se aplica a habilidades e magias.")
    elif versao.tipo == "item":
        previa = ficha_viva.PreviaImportacao(
            tipo="equipamento", item_tipo=conteudo["item_tipo"], formato=conteudo.get("formato"),
            item={**conteudo.get("dados", {}), "nome": conteudo["titulo"], "quantidade": conteudo.get("quantidade", 1)},
            efeitos=[
                ficha_viva.EfeitoImportado(
                    nome=e["nome"], descricao=e["descricao"], versao=1, associacao=None,
                    operacoes=[{"tipo": "modificador", **m} for m in _modificadores(e.get("modificadores", []))],
                    conteudo={"ativacao": {"tipo": e.get("ativacao", "enquanto_equipado")}},
                    ativacao=e.get("ativacao", "enquanto_equipado"),
                )
                for e in conteudo.get("efeitos", [])
            ],
        )
        nova_versao, item, _ = ficha_viva.aplicar_importacao(session, personagem, previa, versao_esperada)
        item_id, estado = item.id, "no_inventario"
    else:
        efeito = narrador.aplicar_efeito(
            session, personagem, versao_esperada=versao_esperada, nome=conteudo["titulo"],
            descricao=conteudo["texto"], modificadores=_modificadores(conteudo.get("modificadores", [])),
            duracao_rodadas=conteudo.get("duracao_rodadas"), origem=f"Carta: {conteudo['titulo']}",
        )
        nova_versao, efeito_id, estado = versao_esperada + 1, efeito.id, "aplicada"
    instancia = CartaPersonagemRegistro(
        id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id,
        definicao_id=versao.definicao_id, versao_id=versao.id, tipo=versao.tipo, estado=estado, origem=origem,
        excecao_aprendizado=excecao_aprendizado, item_id=item_id, efeito_id=efeito_id,
    )
    session.add(instancia)
    session.flush()
    return Aquisicao(instancia, nova_versao)


def transicionar(
    session: Session,
    personagem: PersonagemRegistro,
    instancia: CartaPersonagemRegistro,
    *,
    acao: str,
    narrador_ator: bool,
    versao_esperada: int,
) -> tuple[str, str, int]:
    """Aplica uma transição permitida; devolve (estado anterior, novo estado, nova versão)."""
    if acao not in TRANSICOES:
        raise RegraCarta("Ação desconhecida.")
    tipos, origens, destino, exige_narrador = TRANSICOES[acao]
    if exige_narrador and not narrador_ator:
        raise PermissionError("Ação reservada ao Narrador.")
    if instancia.tipo not in tipos or instancia.estado not in origens:
        raise Conflito(f"Não é possível {acao.replace('_', ' ')} uma carta de {instancia.tipo} em estado {instancia.estado}.")
    nova_versao = ficha_viva._avancar_versao(session, personagem, versao_esperada)
    if acao == "remover" and instancia.tipo == "efeito" and instancia.efeito_id:
        efeito = session.get(EfeitoAplicadoRegistro, instancia.efeito_id)
        if efeito is not None and efeito.estado != "encerrado":
            efeito.estado, efeito.encerrado_em = "encerrado", _agora()
    if acao == "remover" and instancia.tipo == "item" and instancia.item_id:
        vinculados = session.scalars(select(FonteEfeitoRegistro.efeito_id).where(
            FonteEfeitoRegistro.equipamento_id == instancia.item_id,
        )).all()
        for efeito in session.scalars(select(EfeitoAplicadoRegistro).where(EfeitoAplicadoRegistro.id.in_(vinculados))):
            if efeito.estado != "encerrado":
                efeito.estado, efeito.encerrado_em = "encerrado", _agora()
        # O efeito encerrado preserva nome e descrição; o vínculo com o item removido deixa de existir.
        session.execute(delete(FonteEfeitoRegistro).where(FonteEfeitoRegistro.equipamento_id == instancia.item_id))
        session.execute(delete(ItemInventarioRegistro).where(ItemInventarioRegistro.id == instancia.item_id))
    anterior = instancia.estado
    instancia.estado = destino
    session.flush()
    return anterior, destino, nova_versao


# ----------------------------------------------------------------- ofertas

def criar_oferta(
    session: Session,
    *,
    mesa_id: str,
    titulo: str,
    versao_ids: list[str],
    personagem_ids: list[str],
    min_escolhas: int,
    max_escolhas: int,
    expira_em: datetime | None,
    ator_id: str,
) -> OfertaCartasRegistro:
    if not versao_ids or len(set(versao_ids)) != len(versao_ids):
        raise RegraCarta("Informe candidatas distintas.")
    if not personagem_ids or len(set(personagem_ids)) != len(personagem_ids):
        raise RegraCarta("Informe destinatários distintos.")
    if not 0 <= min_escolhas <= max_escolhas or max_escolhas < 1:
        raise RegraCarta("O mínimo precisa estar entre zero e o máximo, e o máximo ser ao menos 1.")
    if max_escolhas > len(versao_ids):
        raise RegraCarta("O máximo de escolhas não pode passar do número de candidatas.")
    if expira_em is not None and _como_utc(expira_em) <= _agora():
        raise RegraCarta("A validade precisa estar no futuro.")
    for versao_id in versao_ids:
        if versao_da_mesa(session, mesa_id, versao_id) is None:
            raise RegraCarta("Candidata inexistente nesta mesa.")
    for personagem_id in personagem_ids:
        personagem = session.get(PersonagemRegistro, personagem_id)
        if personagem is None or personagem.mesa_id != mesa_id or personagem.excluido_em is not None:
            raise RegraCarta("Destinatário inexistente nesta mesa.")
    oferta = OfertaCartasRegistro(
        id=uuid4().hex, mesa_id=mesa_id, titulo=titulo.strip()[:200] or "Oferta", criado_por=ator_id,
        expira_em=expira_em, min_escolhas=min_escolhas, max_escolhas=max_escolhas, estado="aberta",
    )
    session.add(oferta)
    session.flush()
    session.add_all([OfertaCandidatoRegistro(oferta_id=oferta.id, versao_id=v, ordem=i) for i, v in enumerate(versao_ids)])
    session.add_all([OfertaDestinatarioRegistro(oferta_id=oferta.id, personagem_id=p) for p in personagem_ids])
    session.flush()
    return oferta


def expirada(oferta: OfertaCartasRegistro, agora: datetime | None = None) -> bool:
    limite = _como_utc(oferta.expira_em)
    return limite is not None and (agora or _agora()) >= limite


def candidatas(session: Session, oferta_id: str) -> list[CartaVersaoRegistro]:
    return list(session.scalars(
        select(CartaVersaoRegistro)
        .join(OfertaCandidatoRegistro, OfertaCandidatoRegistro.versao_id == CartaVersaoRegistro.id)
        .where(OfertaCandidatoRegistro.oferta_id == oferta_id)
        .order_by(OfertaCandidatoRegistro.ordem)
    ))


def responder_oferta(
    session: Session,
    oferta: OfertaCartasRegistro,
    personagem: PersonagemRegistro,
    escolhas: list[str],
    *,
    ator_id: str,
    versao_esperada: int,
) -> tuple[list[Aquisicao], int]:
    """Confirma as escolhas de um destinatário; tudo ou nada. Não confirma a transação."""
    destinatario = session.get(OfertaDestinatarioRegistro, (oferta.id, personagem.id))
    if destinatario is None:
        raise LookupError("Oferta não encontrada.")
    if oferta.estado != "aberta" or destinatario.estado != "pendente":
        raise Conflito("Esta oferta não aceita mais respostas.")
    if expirada(oferta):
        raise Conflito("Esta oferta expirou.")
    if len(set(escolhas)) != len(escolhas):
        raise RegraCarta("Cada carta só pode ser escolhida uma vez.")
    if not oferta.min_escolhas <= len(escolhas) <= oferta.max_escolhas:
        limite = (f"exatamente {oferta.max_escolhas}" if oferta.min_escolhas == oferta.max_escolhas
                  else f"entre {oferta.min_escolhas} e {oferta.max_escolhas}")
        raise RegraCarta(f"Escolha {limite} carta(s); foram enviadas {len(escolhas)}.")
    por_id = {v.id: v for v in candidatas(session, oferta.id)}
    if any(escolha not in por_id for escolha in escolhas):
        raise RegraCarta("Só é possível escolher cartas desta oferta.")
    reivindicada = session.execute(
        update(OfertaDestinatarioRegistro)
        .where(
            OfertaDestinatarioRegistro.oferta_id == oferta.id,
            OfertaDestinatarioRegistro.personagem_id == personagem.id,
            OfertaDestinatarioRegistro.estado == "pendente",
        )
        .values(estado="respondida", respondido_em=_agora(), respondido_por=ator_id)
        .execution_options(synchronize_session=False)
    )
    if reivindicada.rowcount != 1:
        raise Conflito("Esta oferta já foi respondida.")
    aquisicoes, versao = [], versao_esperada
    for escolha in escolhas:
        session.add(OfertaEscolhaRegistro(oferta_id=oferta.id, personagem_id=personagem.id, versao_id=escolha))
        aquisicao = adquirir(session, personagem, por_id[escolha], origem="oferta", versao_esperada=versao)
        aquisicoes.append(aquisicao)
        versao = aquisicao.versao
    if not escolhas:
        versao = ficha_viva._avancar_versao(session, personagem, versao_esperada)
    session.flush()
    return aquisicoes, versao


def encerrar_oferta(session: Session, oferta: OfertaCartasRegistro, estado: str = "cancelada") -> None:
    if oferta.estado != "aberta":
        raise Conflito("A oferta já foi encerrada.")
    oferta.estado = estado
    session.execute(
        update(OfertaDestinatarioRegistro)
        .where(OfertaDestinatarioRegistro.oferta_id == oferta.id, OfertaDestinatarioRegistro.estado == "pendente")
        .values(estado="cancelada")
        .execution_options(synchronize_session=False)
    )
    session.flush()


# ------------------------------------------------------------- apresentação

def apresentacoes_ativas(session: Session, mesa_id: str, usuario_id: str | None) -> list[ApresentacaoCartaRegistro]:
    """Apresentações visíveis ao usuário (`None` = Narrador, vê todas)."""
    ativas = session.scalars(
        select(ApresentacaoCartaRegistro)
        .where(ApresentacaoCartaRegistro.mesa_id == mesa_id, ApresentacaoCartaRegistro.estado == "apresentada")
        .order_by(ApresentacaoCartaRegistro.apresentada_em, ApresentacaoCartaRegistro.id)
    )
    return [a for a in ativas if usuario_id is None or not a.destinatarios or usuario_id in a.destinatarios]


# ----------------------------------------------------------------- migração

def diferencas(origem: CartaVersaoRegistro, destino: CartaVersaoRegistro) -> list[dict[str, Any]]:
    chaves = sorted(set(origem.conteudo) | set(destino.conteudo))
    return [
        {"campo": chave, "antes": origem.conteudo.get(chave), "depois": destino.conteudo.get(chave)}
        for chave in chaves if origem.conteudo.get(chave) != destino.conteudo.get(chave)
    ]


def migrar(
    session: Session, personagem: PersonagemRegistro, instancia: CartaPersonagemRegistro,
    destino: CartaVersaoRegistro, *, versao_esperada: int,
) -> int:
    """Vincula a posse a outra versão da mesma carta. Itens e efeitos já criados não são reescritos."""
    if destino.definicao_id != instancia.definicao_id:
        raise RegraCarta("A versão de destino pertence a outra carta.")
    if destino.id == instancia.versao_id:
        raise Conflito("A posse já está nesta versão.")
    if instancia.estado == "removida":
        raise Conflito("Uma carta removida não pode ser migrada.")
    nova_versao = ficha_viva._avancar_versao(session, personagem, versao_esperada)
    instancia.versao_id = destino.id
    session.flush()
    return nova_versao
