"""Ferramentas do Narrador: visão pública de entidades e ciclo de efeitos aplicados."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Mapping
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from cursed_platform import ficha_viva
from cursed_platform.domain.efeitos import carregar_catalogo, indexar_catalogo, normalizar_modificador
from cursed_platform.persistence import (
    EfeitoAplicadoRegistro, FonteEfeitoRegistro, ItemInventarioRegistro, OperacaoEfeitoRegistro,
    PersonagemRegistro,
)


# ---------------------------------------------------------------- entidades

def entidade_publica(personagem: PersonagemRegistro) -> dict[str, Any] | None:
    """O que qualquer participante pode saber da entidade; `None` quando nada foi revelado.

    Entidades visíveis à mesa expõem nome (ou nome público) e retrato, salvo se o
    Narrador ocultar o retrato. Entidades ocultas expõem apenas o que o Narrador
    revelou explicitamente e nunca o nome real.
    """
    if personagem.excluido_em is not None:
        return None
    revelacao = personagem.revelacao or {}
    dados = (personagem.ficha or {}).get("personagem") or {}
    nome_publico = revelacao.get("nome_publico")
    imagem = dados.get("imagem_base64") if isinstance(dados.get("imagem_base64"), str) else None
    if personagem.visibilidade == "mesa":
        nome = nome_publico or (dados.get("nome") if isinstance(dados.get("nome"), str) else None)
        return {"id": personagem.id, "nome_publico": nome,
                "imagem": imagem if revelacao.get("imagem", True) else None}
    revela_imagem = bool(revelacao.get("imagem")) and imagem is not None
    if not nome_publico and not revela_imagem:
        return None
    return {"id": personagem.id, "nome_publico": nome_publico or None, "imagem": imagem if revela_imagem else None}


def normalizar_revelacao(nome_publico: str | None, imagem: bool) -> dict[str, Any]:
    nome = (nome_publico or "").strip()
    return {"nome_publico": nome[:200] or None, "imagem": bool(imagem)}


# ------------------------------------------------------------------ efeitos

class TransicaoInvalida(ValueError):
    """O efeito não admite a transição pedida no estado atual."""


def modificadores_validos(modificadores: list[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Valida os modificadores declarados; ValueError explica o problema."""
    resultado = []
    for bruto in modificadores:
        dados = {"alvo": bruto.get("alvo"), "valor": bruto.get("valor")}
        if bruto.get("contexto"):
            dados["quando"] = bruto["contexto"]
        normalizado = normalizar_modificador(dados)
        resultado.append({"alvo": normalizado["alvo"], "valor": normalizado["valor"],
                          "contexto": normalizado.get("quando")})
    return resultado


def _gravar_operacoes(session: Session, efeito_id: str, modificadores: list[dict[str, Any]]) -> None:
    for modificador in modificadores:
        session.add(OperacaoEfeitoRegistro(
            id=uuid4().hex, efeito_id=efeito_id, tipo="modificador", alvo=modificador["alvo"],
            valor=modificador["valor"], contexto=modificador.get("contexto"),
        ))


def efeito_do_personagem(session: Session, personagem: PersonagemRegistro, efeito_id: str) -> EfeitoAplicadoRegistro | None:
    efeito = session.get(EfeitoAplicadoRegistro, efeito_id)
    if efeito is None or efeito.mesa_id != personagem.mesa_id or efeito.personagem_id != personagem.id:
        return None
    return efeito


def aplicar_efeito(
    session: Session,
    personagem: PersonagemRegistro,
    *,
    versao_esperada: int,
    associacao: str | None = None,
    nome: str | None = None,
    descricao: str | None = None,
    modificadores: list[Mapping[str, Any]] | None = None,
    duracao_rodadas: int | None = None,
    origem: str | None = None,
    catalogo: list[Mapping[str, Any]] | None = None,
) -> EfeitoAplicadoRegistro:
    """Aplica um efeito ativo com origem registrada. Não confirma a transação."""
    if associacao:
        referencia = indexar_catalogo(catalogo if catalogo is not None else carregar_catalogo()).get(associacao)
        if referencia is None:
            raise ValueError(f"Efeito do catálogo não encontrado: {associacao}.")
        nome, descricao = referencia["nome"], referencia["descricao"]
        declarados = [
            {"alvo": m["alvo"], "valor": m["valor"], "contexto": m.get("quando")}
            for m in referencia.get("modificadores") or []
        ]
        conteudo = {k: v for k, v in referencia.items() if k != "imagem_base64"}
        fonte_tipo = "catalogo"
    else:
        if not (nome or "").strip() or not (descricao or "").strip():
            raise ValueError("Informe nome e descrição do efeito ou uma associação do catálogo.")
        declarados = list(modificadores or [])
        conteudo = {}
        fonte_tipo = "narrador"
    validos = modificadores_validos(declarados)
    ficha_viva._avancar_versao(session, personagem, versao_esperada)
    efeito = EfeitoAplicadoRegistro(
        id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id,
        associacao=associacao or None, nome=nome.strip()[:200], descricao=descricao.strip(), versao=1,
        estado="ativo", duracao_rodadas=duracao_rodadas, conteudo=conteudo,
    )
    session.add(efeito)
    session.flush()
    _gravar_operacoes(session, efeito.id, validos)
    session.add(FonteEfeitoRegistro(
        id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id, efeito_id=efeito.id,
        tipo=fonte_tipo, referencia_id=associacao or None,
        descricao=(origem or "").strip()[:500] or ("Catálogo" if associacao else "Narrador"),
    ))
    session.flush()
    return efeito


def ajustar_efeito(
    session: Session,
    personagem: PersonagemRegistro,
    efeito: EfeitoAplicadoRegistro,
    *,
    versao_esperada: int,
    campos: Mapping[str, Any],
) -> dict[str, tuple[Any, Any]]:
    """Altera descrição, duração ou modificadores; devolve {campo: (antes, depois)}."""
    if efeito.estado == "encerrado":
        raise TransicaoInvalida("Um efeito encerrado não pode ser ajustado.")
    alteracoes: dict[str, tuple[Any, Any]] = {}
    novos_modificadores = None
    if "modificadores" in campos:
        novos_modificadores = modificadores_validos(list(campos["modificadores"] or []))
    ficha_viva._avancar_versao(session, personagem, versao_esperada)
    if "descricao" in campos:
        descricao = (campos["descricao"] or "").strip()
        if not descricao:
            raise ValueError("A descrição do efeito não pode ficar vazia.")
        if descricao != efeito.descricao:
            alteracoes["descricao"] = (efeito.descricao, descricao)
            efeito.descricao = descricao
    if "duracao_rodadas" in campos and campos["duracao_rodadas"] != efeito.duracao_rodadas:
        alteracoes["duracao_rodadas"] = (efeito.duracao_rodadas, campos["duracao_rodadas"])
        efeito.duracao_rodadas = campos["duracao_rodadas"]
    if novos_modificadores is not None:
        atuais = [
            {"alvo": op.alvo, "valor": float(op.valor), "contexto": op.contexto}
            for op in session.scalars(
                select(OperacaoEfeitoRegistro)
                .where(OperacaoEfeitoRegistro.efeito_id == efeito.id, OperacaoEfeitoRegistro.tipo == "modificador")
                .order_by(OperacaoEfeitoRegistro.id)
            )
        ]
        comparaveis = [{**m, "valor": float(m["valor"])} for m in novos_modificadores]
        if comparaveis != atuais:
            alteracoes["modificadores"] = (atuais, comparaveis)
            session.execute(delete(OperacaoEfeitoRegistro).where(
                OperacaoEfeitoRegistro.efeito_id == efeito.id, OperacaoEfeitoRegistro.tipo == "modificador",
            ))
            _gravar_operacoes(session, efeito.id, novos_modificadores)
    if alteracoes:
        efeito.versao += 1
    session.flush()
    return alteracoes


def transicionar_efeito(
    session: Session,
    personagem: PersonagemRegistro,
    efeito: EfeitoAplicadoRegistro,
    *,
    acao: str,
    versao_esperada: int,
) -> tuple[str, str]:
    """suspender | retomar | encerrar. Devolve (estado anterior, novo estado)."""
    permitidas = {"suspender": ({"ativo"}, "suspenso"), "retomar": ({"suspenso"}, "ativo"),
                  "encerrar": ({"ativo", "suspenso"}, "encerrado")}
    if acao not in permitidas:
        raise TransicaoInvalida("Ação desconhecida.")
    origens, destino = permitidas[acao]
    if efeito.estado not in origens:
        raise TransicaoInvalida(f"Não é possível {acao} um efeito {efeito.estado}.")
    if acao == "retomar":
        item_id = session.scalar(select(FonteEfeitoRegistro.equipamento_id).where(
            FonteEfeitoRegistro.efeito_id == efeito.id, FonteEfeitoRegistro.tipo == "equipamento",
        ))
        item = session.get(ItemInventarioRegistro, item_id) if item_id else None
        if item is not None and not item.equipado:
            raise TransicaoInvalida("Este efeito depende de um item que não está equipado.")
    ficha_viva._avancar_versao(session, personagem, versao_esperada)
    anterior = efeito.estado
    efeito.estado = destino
    if destino == "encerrado":
        efeito.encerrado_em = datetime.now(UTC)
    efeito.versao += 1
    session.flush()
    return anterior, destino
