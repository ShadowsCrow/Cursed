"""Correção de um evento de auditoria como novo comando vinculado ao evento original."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import auditoria, ficha_viva
from cursed_platform.auditoria import _AUSENTE, _valor_no_caminho
from cursed_platform.domain.ficha import FichaDraft
from cursed_platform.persistence import EventoAuditoriaRegistro, ItemInventarioRegistro
from cursed_platform.repositories import FichaRepository, MesaRepository


class CorrecaoIndisponivel(ValueError):
    """O evento não tem correção automática (tipo não suportado ou dados incompletos)."""


class CorrecaoConflitante(ValueError):
    """O estado atual mudou depois do evento; corrigir sobrescreveria outra alteração."""


def tipo_correcao(evento: EventoAuditoriaRegistro) -> str | None:
    reverte = (evento.detalhes or {}).get("reverte")
    if evento.acao in {"ficha.atualizada", "solicitacao.aprovada", "descanso.aplicado"} or reverte == "ficha":
        return "ficha"
    if evento.acao in {"item.equipado", "item.desequipado"} or reverte == "equipamento":
        return "equipamento"
    if evento.acao == "personagem.transferido" or reverte == "transferencia":
        return "transferencia"
    if evento.acao == "personagem.excluido":
        return "exclusao"
    return None


def corrigivel(evento: EventoAuditoriaRegistro) -> bool:
    mudancas = (evento.detalhes or {}).get("mudancas") or []
    tipo = tipo_correcao(evento)
    if tipo is None or evento.personagem_id is None:
        return False
    return tipo == "exclusao" or (bool(mudancas) and all(m.get("completo", True) for m in mudancas))


def _definir(dados: dict[str, Any], caminho: str, valor: Any, remover: bool) -> None:
    partes = caminho.split(".")
    atual = dados
    for parte in partes[:-1]:
        if not isinstance(atual.get(parte), dict):
            atual[parte] = {}
        atual = atual[parte]
    if remover:
        atual.pop(partes[-1], None)
    else:
        atual[partes[-1]] = deepcopy(valor)


def _exigir_atual(atual: Any, esperado: Any, ausente_esperado: bool) -> None:
    if (atual is _AUSENTE) != ausente_esperado or (atual is not _AUSENTE and atual != esperado):
        raise CorrecaoConflitante("O valor mudou depois deste evento; revise antes de corrigir.")


def corrigir(
    session: Session,
    evento: EventoAuditoriaRegistro,
    *,
    ator_id: str,
    motivo: str | None,
    versao_esperada: int,
    correlacao_id: str,
) -> EventoAuditoriaRegistro:
    """Aplica a reversão e registra o evento de correção. Não confirma a transação."""
    if not corrigivel(evento):
        raise CorrecaoIndisponivel("Este evento não pode ser corrigido automaticamente.")
    fichas = FichaRepository(session)
    tipo = tipo_correcao(evento)
    mudancas: list[dict[str, Any]] = (evento.detalhes or {}).get("mudancas") or []
    personagem = fichas.get(evento.mesa_id, evento.personagem_id, incluir_excluido=tipo == "exclusao")
    if personagem is None:
        raise CorrecaoConflitante("O personagem deste evento não está mais disponível.")
    if personagem.versao != versao_esperada:
        raise ficha_viva.ConflitoVersao()
    detalhes = {"reverte": tipo, "motivo": motivo or None, "evento_corrigido": evento.id}
    nome = auditoria.nome_personagem(personagem)

    if tipo == "ficha":
        atual = FichaDraft.de_payload(personagem.ficha).para_payload()
        nova = deepcopy(atual)
        for mudanca in mudancas:
            _exigir_atual(_valor_no_caminho(atual, mudanca["campo"]), mudanca["depois"],
                          mudanca.get("ausente_depois", False))
            _definir(nova, mudanca["campo"], mudanca["antes"], mudanca.get("ausente_antes", False))
        if not fichas.substituir_se_versao(evento.mesa_id, personagem.id, versao_esperada, nova):
            raise ficha_viva.ConflitoVersao()
        alteracoes = auditoria.mudancas(atual, nova)
        categoria, relevancia = "ficha", auditoria.relevancia_da_ficha(m["campo"] for m in alteracoes)
        alvo_tipo, alvo_id = "personagem", personagem.id
        resumo = f"{nome}: correção de {len(alteracoes)} campo(s)"
    elif tipo == "equipamento":
        item = session.get(ItemInventarioRegistro, evento.alvo_id)
        if item is None or item.personagem_id != personagem.id:
            raise CorrecaoConflitante("O item deste evento não existe mais.")
        [equipar] = [m for m in mudancas if m["campo"] == "equipado"]
        _exigir_atual(item.equipado, equipar["depois"], False)
        estados_antes = {e.id: e.estado for e in ficha_viva.efeitos(session, evento.mesa_id, personagem.id)}
        ficha_viva.definir_equipado(session, personagem, item, bool(equipar["antes"]), versao_esperada)
        session.flush()
        alteracoes = [
            {"campo": "equipado", "antes": equipar["depois"], "depois": equipar["antes"],
             "completo": True, "rotulo": item.nome},
            *(
                {"campo": f"efeitos.{e.id}.estado", "antes": estados_antes.get(e.id), "depois": e.estado,
                 "completo": True, "rotulo": e.nome}
                for e in ficha_viva.efeitos(session, evento.mesa_id, personagem.id)
                if estados_antes.get(e.id) != e.estado
            ),
        ]
        categoria, relevancia, alvo_tipo, alvo_id = "inventario", "mecanica", "item", item.id
        resumo = f"{nome}: correção — {item.nome} {'equipado' if equipar['antes'] else 'desequipado'}"
    elif tipo == "transferencia":
        [dono] = mudancas
        _exigir_atual(personagem.proprietario_id, dono["depois"], False)
        anterior = dono["antes"]
        if anterior is not None:
            membro = MesaRepository(session).membro(evento.mesa_id, anterior)
            if membro is None or not membro.ativo:
                raise CorrecaoConflitante("O proprietário anterior não participa mais da mesa.")
        if not fichas.transferir(evento.mesa_id, personagem.id, versao_esperada, anterior):
            raise ficha_viva.ConflitoVersao()
        alteracoes = [{"campo": "proprietario_id", "antes": dono["depois"], "depois": anterior, "completo": True}]
        categoria, relevancia, alvo_tipo, alvo_id = "personagem", "organizacional", "personagem", personagem.id
        resumo = f"{nome}: correção — proprietário restabelecido"
    else:
        if personagem.excluido_em is None:
            raise CorrecaoConflitante("O personagem já não está na lixeira.")
        if not fichas.restaurar(evento.mesa_id, personagem.id, versao_esperada):
            raise CorrecaoConflitante("O período de retenção terminou ou a versão mudou.")
        alteracoes = []
        categoria, relevancia, alvo_tipo, alvo_id = "personagem", "organizacional", "personagem", personagem.id
        resumo = f"{nome}: correção — restaurado da lixeira"

    session.flush()
    session.refresh(personagem)
    return auditoria.registrar(
        session, mesa_id=evento.mesa_id, ator_id=ator_id, categoria=categoria, acao="correcao.aplicada",
        relevancia=relevancia, personagem=personagem, alvo_tipo=alvo_tipo, alvo_id=alvo_id,
        resumo=(resumo + (f" — {motivo.strip()}" if motivo and motivo.strip() else ""))[:500],
        mudancas=alteracoes, detalhes=detalhes, correlacao_id=correlacao_id, corrige_evento_id=evento.id,
    )


def correcoes_de(session: Session, ids: list[int]) -> dict[int, list[int]]:
    resultado: dict[int, list[int]] = {}
    if not ids:
        return resultado
    for original, correcao in session.execute(
        select(EventoAuditoriaRegistro.corrige_evento_id, EventoAuditoriaRegistro.id)
        .where(EventoAuditoriaRegistro.corrige_evento_id.in_(ids))
        .order_by(EventoAuditoriaRegistro.id)
    ):
        resultado.setdefault(original, []).append(correcao)
    return resultado
