"""Chão e baú da cena, e o retrato de itens que saem de um personagem (carga-por-espacos D8).

Um item de inventário pertence sempre a um personagem; os efeitos vinculados a ele usam a chave
(mesa, personagem, item). Quando o item sai do personagem (largado, deixado no baú, trocado), ele
vira um retrato em `scene_stash_items` com os efeitos e a posse de carta. Os efeitos originais
ficam encerrados no histórico, como na remoção de carta. Quem pega o item recebe uma cópia nova,
com efeitos e posse recriados. Nenhuma função confirma a transação.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, Sequence
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from cursed_platform import ficha_viva, inventario_grade
from cursed_platform.domain import grade as motor
from cursed_platform.persistence import (
    CartaPersonagemRegistro, CartaVersaoRegistro, CenaRegistro, EfeitoAplicadoRegistro, FonteEfeitoRegistro, ItemInventarioRegistro,
    ItemRecipienteRegistro, OperacaoEfeitoRegistro, PersonagemRegistro, RecipienteCenaRegistro,
)

TAMANHO_CHAO = (10, 10)


class SemCenaAtiva(ValueError):
    """Sem cena ativa não há chão onde largar."""


class SemMochila(ValueError):
    pass


def _agora() -> datetime:
    return datetime.now(UTC)


def cena_ativa(session: Session, mesa_id: str) -> CenaRegistro:
    cena = session.scalar(select(CenaRegistro).where(CenaRegistro.mesa_id == mesa_id, CenaRegistro.ativa.is_(True)))
    if cena is None:
        raise SemCenaAtiva("Não há cena ativa: ative uma cena para ter um chão onde largar itens.")
    return cena


def chao_da_cena(session: Session, mesa_id: str) -> RecipienteCenaRegistro:
    cena = cena_ativa(session, mesa_id)
    chao = session.scalar(select(RecipienteCenaRegistro).where(
        RecipienteCenaRegistro.mesa_id == mesa_id, RecipienteCenaRegistro.cena_id == cena.id,
        RecipienteCenaRegistro.tipo == "chao",
    ))
    if chao is None:
        chao = RecipienteCenaRegistro(
            id=uuid4().hex, mesa_id=mesa_id, cena_id=cena.id, tipo="chao", nome=f"Chão — {cena.nome}",
            colunas=TAMANHO_CHAO[0], linhas=TAMANHO_CHAO[1], versao=0,
        )
        session.add(chao)
        session.flush()
    return chao


def itens_do_recipiente(session: Session, recipiente: RecipienteCenaRegistro) -> list[ItemRecipienteRegistro]:
    return list(session.scalars(
        select(ItemRecipienteRegistro).where(ItemRecipienteRegistro.stash_id == recipiente.id)
        .order_by(ItemRecipienteRegistro.criado_em, ItemRecipienteRegistro.id)
    ))


def _numero(valor: Decimal | None) -> float | None:
    return None if valor is None else float(valor)


def _posicionar(recipiente: RecipienteCenaRegistro, existentes: Sequence[ItemRecipienteRegistro], novo: ItemRecipienteRegistro) -> None:
    """Primeira posição livre na grade do recipiente; sem espaço, o item fica listado sem posição."""
    if novo.largura is None or novo.altura is None:
        return
    grade = motor.Grade(colunas_verdes=recipiente.colunas, linhas_verdes=recipiente.linhas)
    ocupados = [
        motor.ItemGrade(e.id, e.nome, e.subtipo or "outro", e.largura, e.altura, e.coluna, e.linha, e.girado)
        for e in existentes if e.largura is not None and e.coluna is not None
    ]
    candidato = motor.ItemGrade(novo.id, novo.nome, novo.subtipo or "outro", novo.largura, novo.altura, girado=novo.girado)
    lugar = motor.encontrar_espaco(grade, ocupados, candidato, permitir_vermelho=False)
    if lugar is not None:
        novo.coluna, novo.linha, novo.girado = lugar


_CAMPOS_ITEM = ("tipo", "subtipo", "nome", "quantidade", "largura", "altura", "girado", "maos", "pilha_max",
                "cargas_atuais", "cargas_maximas")


def _capturar(
    session: Session, personagem: PersonagemRegistro, item: ItemInventarioRegistro,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Encerra os efeitos vinculados ao item e a posse de carta; devolve (dados, efeitos) para recriá-lo."""
    efeitos_ids = list(session.scalars(select(FonteEfeitoRegistro.efeito_id).where(
        FonteEfeitoRegistro.mesa_id == personagem.mesa_id, FonteEfeitoRegistro.personagem_id == personagem.id,
        FonteEfeitoRegistro.equipamento_id == item.id,
    )))
    efeitos: list[dict[str, Any]] = []
    for efeito in session.scalars(select(EfeitoAplicadoRegistro).where(EfeitoAplicadoRegistro.id.in_(efeitos_ids))):
        if efeito.estado == "encerrado":
            continue
        operacoes = session.scalars(select(OperacaoEfeitoRegistro).where(OperacaoEfeitoRegistro.efeito_id == efeito.id))
        efeitos.append({
            "associacao": efeito.associacao, "nome": efeito.nome, "descricao": efeito.descricao, "versao": efeito.versao,
            "duracao_rodadas": efeito.duracao_rodadas, "conteudo": efeito.conteudo or {},
            "operacoes": [{"tipo": o.tipo, "alvo": o.alvo, "valor": _numero(o.valor), "contexto": o.contexto,
                           "modo": o.modo, "recurso": o.recurso, "evento": o.evento} for o in operacoes],
        })
        efeito.estado, efeito.encerrado_em = "encerrado", _agora()
    session.execute(delete(FonteEfeitoRegistro).where(
        FonteEfeitoRegistro.mesa_id == personagem.mesa_id, FonteEfeitoRegistro.personagem_id == personagem.id,
        FonteEfeitoRegistro.equipamento_id == item.id,
    ))
    dados = dict(item.dados or {})
    posse = session.scalar(select(CartaPersonagemRegistro).where(
        CartaPersonagemRegistro.personagem_id == personagem.id, CartaPersonagemRegistro.item_id == item.id,
        CartaPersonagemRegistro.estado != "removida",
    ))
    if posse is not None:
        dados["_carta"] = {"definicao_id": posse.definicao_id, "versao_id": posse.versao_id, "origem": posse.origem}
        posse.estado = "removida"
    return dados, efeitos


def retratar(
    session: Session, personagem: PersonagemRegistro, item: ItemInventarioRegistro, recipiente: RecipienteCenaRegistro,
    grupo: str | None = None,
) -> ItemRecipienteRegistro:
    """Tira o item do personagem e o guarda no recipiente, com efeitos vinculados e posse de carta."""
    dados, efeitos = _capturar(session, personagem, item)
    if grupo:
        dados["_grupo"] = grupo
    retrato = ItemRecipienteRegistro(
        id=uuid4().hex, mesa_id=personagem.mesa_id, stash_id=recipiente.id,
        **{campo: getattr(item, campo) for campo in _CAMPOS_ITEM},
        dados=dados, efeitos=efeitos, origem_personagem_id=personagem.id,
    )
    _posicionar(recipiente, itens_do_recipiente(session, recipiente), retrato)
    session.add(retrato)
    session.delete(item)
    recipiente.versao += 1
    session.flush()
    return retrato


def _recriar(
    session: Session, personagem: PersonagemRegistro, campos: dict[str, Any],
    dados_capturados: dict[str, Any], efeitos: Sequence[dict[str, Any]],
) -> ItemInventarioRegistro:
    """Cria no personagem uma cópia do item, fora da grade e desequipada, com efeitos e posse."""
    dados = {k: v for k, v in dados_capturados.items() if k not in {"_carta", "_grupo"}}
    item = ItemInventarioRegistro(
        id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id, equipado=False, dados=dados, **campos,
    )
    session.add(item)
    session.flush()
    for declarado in efeitos:
        efeito = EfeitoAplicadoRegistro(
            id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id,
            associacao=declarado.get("associacao"), nome=declarado["nome"], descricao=declarado["descricao"],
            versao=int(declarado.get("versao") or 1), estado="suspenso", duracao_rodadas=declarado.get("duracao_rodadas"),
            conteudo=declarado.get("conteudo") or {},
        )
        session.add(efeito)
        session.flush()
        for operacao in declarado.get("operacoes") or []:
            session.add(OperacaoEfeitoRegistro(
                id=uuid4().hex, efeito_id=efeito.id, tipo=operacao["tipo"], alvo=operacao["alvo"],
                valor=None if operacao.get("valor") is None else Decimal(str(operacao["valor"])),
                contexto=operacao.get("contexto"), modo=operacao.get("modo"), recurso=operacao.get("recurso"),
                evento=operacao.get("evento"),
            ))
        session.add(FonteEfeitoRegistro(
            id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id, efeito_id=efeito.id,
            tipo="equipamento", equipamento_id=item.id, descricao=item.nome,
        ))
    carta = dados_capturados.get("_carta")
    if carta:
        session.add(CartaPersonagemRegistro(
            id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id, definicao_id=carta["definicao_id"],
            versao_id=carta["versao_id"], tipo="item", estado="no_inventario", origem=carta.get("origem") or "concessao",
            item_id=item.id,
        ))
    session.flush()
    return item


def recriar(session: Session, personagem: PersonagemRegistro, retrato: ItemRecipienteRegistro) -> ItemInventarioRegistro:
    """Cria no personagem uma cópia do item retratado e apaga o retrato."""
    item = _recriar(session, personagem, {campo: getattr(retrato, campo) for campo in _CAMPOS_ITEM},
                    dict(retrato.dados or {}), list(retrato.efeitos or []))
    session.delete(retrato)
    session.flush()
    return item


def transferir(
    session: Session, de: PersonagemRegistro, para: PersonagemRegistro, item: ItemInventarioRegistro,
) -> ItemInventarioRegistro:
    """Passa o item de um personagem a outro, com efeitos e posse de carta, sem passar pelo chão."""
    campos = {campo: getattr(item, campo) for campo in _CAMPOS_ITEM}
    dados, efeitos = _capturar(session, de, item)
    session.delete(item)
    session.flush()
    return _recriar(session, para, campos, dados, efeitos)


@dataclass(frozen=True)
class ResultadoLargarMochila:
    versao: int
    mochila: str
    largados: tuple[str, ...]


def largar_mochila(session: Session, personagem: PersonagemRegistro, versao_esperada: int) -> ResultadoLargarMochila:
    """Interação livre: a mochila equipada vai para o chão junto com os itens das linhas e colunas
    que ela acrescentava. Os itens da grade base ficam com o personagem."""
    registros = inventario_grade.itens_do_personagem(session, personagem)
    mochila = next((r for r in registros if r.subtipo == "mochila" and r.equipado), None)
    if mochila is None:
        raise SemMochila("Não há mochila equipada.")
    chao = chao_da_cena(session, personagem.mesa_id)
    ctx = inventario_grade.contexto(session, personagem, registros)
    sem_mochila = motor.calcular_grade(
        ctx.forca, ctx.tamanho, [i for i in ctx.itens if i.id != mochila.id],
        [a for a in ctx.grade.ampliacoes if a.fonte != "mochila"],
    )
    nos_acrescimos = [
        r for r in registros
        if r.id != mochila.id and r.coluna is not None and any(
            sem_mochila.linhas_verdes <= l < ctx.grade.linhas_verdes or sem_mochila.colunas_verdes <= c < ctx.grade.colunas_verdes
            for c, l in inventario_grade.para_motor(r).celulas()
        )
    ]
    versao = ficha_viva._avancar_versao(session, personagem, versao_esperada)
    grupo = uuid4().hex
    mochila.equipado = False
    ficha_viva.alternar_efeitos_vinculados(session, personagem, mochila, False)
    largados = [mochila.nome]
    retratar(session, personagem, mochila, chao, grupo)
    for registro in nos_acrescimos:
        largados.append(registro.nome)
        retratar(session, personagem, registro, chao, grupo)
    return ResultadoLargarMochila(versao=versao, mochila=mochila.nome, largados=tuple(largados))


# ------------------------------------------------------------ chão, baú e saque

class ItemIndisponivel(ValueError):
    """O item já foi pego por outro pedido confirmado antes."""


class RegraRecipiente(ValueError):
    pass


def recipientes_da_cena(session: Session, mesa_id: str) -> list[RecipienteCenaRegistro]:
    cena = session.scalar(select(CenaRegistro).where(CenaRegistro.mesa_id == mesa_id, CenaRegistro.ativa.is_(True)))
    if cena is None:
        return []
    return list(session.scalars(select(RecipienteCenaRegistro).where(
        RecipienteCenaRegistro.mesa_id == mesa_id, RecipienteCenaRegistro.cena_id == cena.id,
    ).order_by(RecipienteCenaRegistro.tipo.desc(), RecipienteCenaRegistro.nome)))


def criar_bau(session: Session, mesa_id: str, nome: str, colunas: int, linhas: int) -> RecipienteCenaRegistro:
    cena = cena_ativa(session, mesa_id)
    bau = RecipienteCenaRegistro(id=uuid4().hex, mesa_id=mesa_id, cena_id=cena.id, tipo="bau", nome=nome.strip(),
                                 colunas=colunas, linhas=linhas, versao=0)
    session.add(bau)
    session.flush()
    return bau


def colocar_carta(session: Session, recipiente: RecipienteCenaRegistro, versao: CartaVersaoRegistro) -> ItemRecipienteRegistro:
    """O Narrador põe no recipiente um item de uma carta publicada (o saque)."""
    if versao.tipo != "item" or versao.mesa_id != recipiente.mesa_id:
        raise RegraRecipiente("Só cartas de item desta mesa podem ser colocadas como saque.")
    conteudo = versao.conteudo or {}
    formato = conteudo.get("formato")
    if not formato:
        raise RegraRecipiente("A carta não tem formato na grade.")
    provisorio = ItemInventarioRegistro(id="x", mesa_id=recipiente.mesa_id, personagem_id="x", tipo=conteudo["item_tipo"],
                                        nome=conteudo["titulo"], quantidade=conteudo.get("quantidade", 1), dados=dict(conteudo.get("dados") or {}))
    ficha_viva.aplicar_formato(provisorio, formato)
    efeitos = [{
        "associacao": None, "nome": e["nome"], "descricao": e["descricao"], "versao": 1, "duracao_rodadas": None,
        "conteudo": {"ativacao": {"tipo": e.get("ativacao", "enquanto_equipado")}},
        "operacoes": [{"tipo": "modificador", "alvo": m["alvo"], "valor": m["valor"], "contexto": m.get("contexto")}
                      for m in e.get("modificadores") or []],
    } for e in conteudo.get("efeitos") or []]
    retrato = ItemRecipienteRegistro(
        id=uuid4().hex, mesa_id=recipiente.mesa_id, stash_id=recipiente.id, tipo=provisorio.tipo, subtipo=provisorio.subtipo,
        nome=provisorio.nome, quantidade=provisorio.quantidade, largura=provisorio.largura, altura=provisorio.altura,
        girado=False, maos=provisorio.maos, pilha_max=provisorio.pilha_max,
        dados={**provisorio.dados, "_carta": {"definicao_id": versao.definicao_id, "versao_id": versao.id, "origem": "concessao"}},
        efeitos=efeitos,
    )
    _posicionar(recipiente, itens_do_recipiente(session, recipiente), retrato)
    session.add(retrato)
    recipiente.versao += 1
    session.flush()
    return retrato


def largar_item(
    session: Session, personagem: PersonagemRegistro, item: ItemInventarioRegistro, recipiente: RecipienteCenaRegistro,
    versao_esperada: int,
) -> tuple[int, ItemRecipienteRegistro]:
    versao = ficha_viva._avancar_versao(session, personagem, versao_esperada)
    if item.equipado:
        item.equipado = False
        ficha_viva.alternar_efeitos_vinculados(session, personagem, item, False)
    if item.subtipo == "mochila":
        raise RegraRecipiente("Para largar a mochila use a ação de largar mochila, que leva junto o que está nela.")
    return versao, retratar(session, personagem, item, recipiente)


def pegar(
    session: Session, personagem: PersonagemRegistro, recipiente: RecipienteCenaRegistro, retrato_id: str,
    versao_esperada: int, coluna: int | None = None, linha: int | None = None, girado: bool = False,
) -> tuple[int, ItemInventarioRegistro]:
    """Leva o item para o personagem. A linha do retrato fica travada até o fim da transação: se dois
    pedidos disputam o mesmo item, o segundo encontra o item já levado."""
    retrato = session.scalar(
        select(ItemRecipienteRegistro).where(
            ItemRecipienteRegistro.id == retrato_id, ItemRecipienteRegistro.stash_id == recipiente.id,
        ).with_for_update()
    )
    if retrato is None:
        raise ItemIndisponivel("O item não está mais disponível: alguém o pegou antes.")
    versao = ficha_viva._avancar_versao(session, personagem, versao_esperada)
    item = recriar(session, personagem, retrato)
    if coluna is not None and linha is not None and item.largura is not None:
        ctx = inventario_grade.contexto(session, personagem)
        candidato = inventario_grade.para_motor(item, coluna=coluna, linha=linha, girado=girado)
        resultado = motor.validar_posicao(ctx.grade, [i for i in ctx.itens if i.id != item.id], candidato, coluna, linha, girado)
        if not resultado.ok:
            raise RegraRecipiente("Não há espaço nesse lugar da grade." if resultado.motivo == "sobreposicao" else "Esse lugar fica fora da grade.")
        item.coluna, item.linha, item.girado = coluna, linha, girado
    recipiente.versao += 1
    session.flush()
    return versao, item
