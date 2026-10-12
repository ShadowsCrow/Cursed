"""Modelo e instâncias de personagem (instancias-de-personagem, D2; aprovado pelo usuário em 2026-10-06).

A ficha de NPC ou monstro do Narrador é o **modelo** e nunca entra na cena. Cada "Colocar" cria uma **instância**:
um personagem novo da mesa, cópia completa e independente da ficha (identidade, classe, atributos, perícias,
retrato, inventário e cartas aprendidas), com PV e PP cheios e sem a história (desgaste, consequências e efeitos
aplicados). O nome é numerado por modelo ("Lagarto-macaco 1", "Lagarto-macaco 2"…) e o número nunca se repete,
nem depois de uma exclusão. Promover tira o vínculo com o modelo: a instância vira uma ficha comum.

Nenhuma função confirma a transação.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm import object_mapper

from cursed_platform import catalogos
from cursed_platform.domain import recursos
from cursed_platform.persistence import (
    CartaPersonagemRegistro, ItemInventarioRegistro, PersonagemRegistro, TokenRegistro,
)

TIPOS_DE_MODELO = ("npc", "monstro")
# O que é história e não vem na cópia (acervo.ficha_da_copia zera também o equipamento; aqui ele vem).
CHAVES_DE_HISTORIA = ("desgaste", "consequencias")
LISTAS_DE_HISTORIA = ("efeitos_externos",)
# Posses de carta que acompanham a instância: habilidades e magias; as de item nascem com o inventário copiado.
TIPOS_DE_CARTA_COPIADOS = ("habilidade", "magia")


class InstanciaInvalida(ValueError):
    """O personagem não é um modelo (ou não é uma instância) para o que foi pedido (409)."""


def eh_modelo(personagem: PersonagemRegistro | None) -> bool:
    return personagem is not None and personagem.tipo in TIPOS_DE_MODELO and personagem.instancia_de is None


def eh_instancia(personagem: PersonagemRegistro | None) -> bool:
    return personagem is not None and personagem.instancia_de is not None


def numero_de(personagem: PersonagemRegistro) -> int | None:
    dados = ((personagem.procedencia or {}).get("instancia") or {})
    numero = dados.get("numero")
    return numero if isinstance(numero, int) and not isinstance(numero, bool) else None


def instancias_de(session: Session, modelo: PersonagemRegistro, *, com_excluidas: bool = False) -> list[PersonagemRegistro]:
    consulta = select(PersonagemRegistro).where(PersonagemRegistro.mesa_id == modelo.mesa_id,
                                                PersonagemRegistro.instancia_de == modelo.id)
    if not com_excluidas:
        consulta = consulta.where(PersonagemRegistro.excluido_em.is_(None))
    lista = list(session.scalars(consulta))
    return sorted(lista, key=lambda p: (numero_de(p) or 0, p.id))


def proximo_numero(session: Session, modelo: PersonagemRegistro) -> int:
    """O número seguinte ao maior já usado pelo modelo, inclusive em instâncias excluídas."""
    maior = max((numero_de(p) or 0 for p in instancias_de(session, modelo, com_excluidas=True)), default=0)
    return maior + 1


def _nome(ficha: dict[str, Any]) -> str:
    nome = (ficha.get("personagem") or {}).get("nome")
    return nome.strip() if isinstance(nome, str) and nome.strip() else "Personagem"


def ficha_da_instancia(modelo: PersonagemRegistro, numero: int) -> dict[str, Any]:
    """A ficha do modelo inteira, com o nome numerado, sem a história e com PV e PP cheios."""
    ficha = deepcopy(modelo.ficha or {})
    for chave in CHAVES_DE_HISTORIA:
        ficha.pop(chave, None)
    for chave in LISTAS_DE_HISTORIA:
        if chave in ficha:
            ficha[chave] = []
    personagem = ficha.setdefault("personagem", {})
    personagem["nome"] = f"{_nome(ficha)} {numero}"
    recursos.ajustar_atuais(ficha, recursos.calcular(ficha, catalogos.obter()), novo=True)
    return ficha


def _copiar_registro(origem: Any, **substituicoes: Any) -> dict[str, Any]:
    """Todas as colunas do registro, com as substituições; serve para inventário e posses."""
    valores = {atributo.key: getattr(origem, atributo.key) for atributo in object_mapper(origem).column_attrs}
    valores.update(substituicoes)
    return valores


def copiar_inventario(session: Session, modelo: PersonagemRegistro, instancia: PersonagemRegistro) -> dict[str, str]:
    """Copia cada item do inventário (equipado, cargas e lugar na grade iguais); devolve {id antigo: id novo}."""
    mapa: dict[str, str] = {}
    itens = session.scalars(select(ItemInventarioRegistro).where(
        ItemInventarioRegistro.mesa_id == modelo.mesa_id, ItemInventarioRegistro.personagem_id == modelo.id))
    for item in itens:
        novo_id = uuid4().hex
        mapa[item.id] = novo_id
        session.add(ItemInventarioRegistro(**_copiar_registro(item, id=novo_id, personagem_id=instancia.id)))
    session.flush()
    return mapa


def copiar_cartas(session: Session, modelo: PersonagemRegistro, instancia: PersonagemRegistro,
                  itens: dict[str, str]) -> int:
    """Copia as posses de habilidade e magia concedidas à mão (as de catálogo vêm pela concessão da classe) e as
    posses de item dos itens copiados; posses de efeito não vêm. Devolve quantas foram copiadas."""
    posses = session.scalars(select(CartaPersonagemRegistro).where(
        CartaPersonagemRegistro.mesa_id == modelo.mesa_id, CartaPersonagemRegistro.personagem_id == modelo.id,
        CartaPersonagemRegistro.estado != "removida"))
    copiadas = 0
    for posse in posses:
        if posse.tipo in TIPOS_DE_CARTA_COPIADOS and posse.concedida_por is None:
            session.add(CartaPersonagemRegistro(**_copiar_registro(
                posse, id=uuid4().hex, personagem_id=instancia.id, adquirida_em=datetime.now(UTC))))
            copiadas += 1
        elif posse.tipo == "item" and posse.item_id in itens:
            session.add(CartaPersonagemRegistro(**_copiar_registro(
                posse, id=uuid4().hex, personagem_id=instancia.id, item_id=itens[posse.item_id],
                adquirida_em=datetime.now(UTC))))
            copiadas += 1
    session.flush()
    return copiadas


def criar(session: Session, modelo: PersonagemRegistro) -> PersonagemRegistro:
    """Cria a instância do modelo: ficha numerada e cheia, inventário e cartas copiados. Quem chama concede as
    cartas de catálogo (`atualizar_cartas`) e audita."""
    if not eh_modelo(modelo) or modelo.excluido_em is not None:
        raise InstanciaInvalida("Só um NPC ou monstro da mesa, que não seja instância, serve de modelo.")
    numero = proximo_numero(session, modelo)
    instancia = PersonagemRegistro(
        id=uuid4().hex, mesa_id=modelo.mesa_id, proprietario_id=None, tipo=modelo.tipo, visibilidade=modelo.visibilidade,
        versao=0, ficha=ficha_da_instancia(modelo, numero), revelacao=deepcopy(modelo.revelacao or {}),
        instancia_de=modelo.id,
        procedencia={"instancia": {"modelo_id": modelo.id, "numero": numero, "criada_em": datetime.now(UTC).isoformat()}},
    )
    session.add(instancia)
    session.flush()
    itens = copiar_inventario(session, modelo, instancia)
    copiar_cartas(session, modelo, instancia, itens)
    return instancia


def promover(session: Session, instancia: PersonagemRegistro) -> PersonagemRegistro:
    """A instância vira uma ficha comum: sem vínculo com o modelo, no acervo e servindo de modelo."""
    if not eh_instancia(instancia):
        raise InstanciaInvalida("Este personagem não é uma instância.")
    procedencia = dict(instancia.procedencia or {})
    dados = dict(procedencia.get("instancia") or {})
    dados["promovida_em"] = datetime.now(UTC).isoformat()
    procedencia["instancia"] = dados
    instancia.procedencia = procedencia
    instancia.instancia_de = None
    session.flush()
    return instancia


def fora_da_cena(session: Session, modelo: PersonagemRegistro, cena_id: str) -> list[PersonagemRegistro]:
    """As instâncias do modelo sem token na cena, para a limpeza."""
    com_token = set(session.scalars(select(TokenRegistro.personagem_id).where(
        TokenRegistro.cena_id == cena_id, TokenRegistro.personagem_id.is_not(None))))
    return [p for p in instancias_de(session, modelo) if p.id not in com_token]


def contar(session: Session, mesa_id: str) -> int:
    return session.scalar(select(func.count()).select_from(PersonagemRegistro).where(
        PersonagemRegistro.mesa_id == mesa_id, PersonagemRegistro.instancia_de.is_not(None))) or 0
