"""Acervo de personagens entre mesas e cópia independente (navegacao-inicial-e-perfil, design D7 e D8).

É o primeiro código que cruza mesas: toda consulta parte das participações **ativas** da pessoa e
nega por padrão. A cópia é uma ficha nova, sem vínculo com a origem além da procedência registrada.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform.persistence import MembroRegistro, MesaRegistro, PersonagemRegistro

Colecao = Literal["meus", "npcs", "monstros"]
TIPO_DA_COLECAO: dict[str, str] = {"npcs": "npc", "monstros": "monstro"}
# Personagem de jogador vira NPC ao ser copiado; NPC e monstro mantêm o tipo.
TIPO_DA_COPIA: dict[str, str] = {"personagem": "npc", "npc": "npc", "monstro": "monstro"}
# Estado de uma história que não acompanha a cópia: equipamento, efeitos, Desgaste e Consequências.
CHAVES_DE_ESTADO_LISTA = ("armas", "armaduras", "outros", "efeitos_externos")
CHAVES_DE_ESTADO_REMOVIDAS = ("desgaste", "consequencias")


def listar(session: Session, usuario_id: str, colecao: Colecao) -> list[tuple[PersonagemRegistro, MesaRegistro]]:
    """Personagens da coleção, de mesas ativas da pessoa, fora da lixeira, ordenados por nome da mesa."""
    consulta = (
        select(PersonagemRegistro, MesaRegistro)
        .join(MesaRegistro, MesaRegistro.id == PersonagemRegistro.mesa_id)
        .join(MembroRegistro, (MembroRegistro.mesa_id == MesaRegistro.id)
              & (MembroRegistro.usuario_id == usuario_id) & MembroRegistro.ativo.is_(True))
        .where(PersonagemRegistro.excluido_em.is_(None))
    )
    if colecao == "meus":
        consulta = consulta.where(PersonagemRegistro.tipo == "personagem",
                                  PersonagemRegistro.proprietario_id == usuario_id)
    else:
        consulta = consulta.where(PersonagemRegistro.tipo == TIPO_DA_COLECAO[colecao],
                                  MembroRegistro.papel == "narrador", MesaRegistro.narrador_id == usuario_id)
    linhas = session.execute(consulta.order_by(MesaRegistro.nome, PersonagemRegistro.id)).all()
    return sorted(((p, m) for p, m in linhas), key=lambda par: (nome(par[0]).casefold(), par[1].nome.casefold()))


def nome(personagem: PersonagemRegistro) -> str:
    valor = ((personagem.ficha or {}).get("personagem") or {}).get("nome")
    return valor.strip() if isinstance(valor, str) and valor.strip() else "Sem nome"


def dados_da_vitrine(personagem: PersonagemRegistro) -> dict[str, Any]:
    """Campos de identificação que a lista mostra, sem cálculo: exatamente o que a ficha tem."""
    dados = (personagem.ficha or {}).get("personagem") or {}

    def texto(chave: str) -> str | None:
        valor = dados.get(chave)
        return valor.strip() if isinstance(valor, str) and valor.strip() else None

    nivel = dados.get("nivel")
    return {
        "classe": texto("classe"), "arquetipo": texto("arquetipo"), "raca": texto("raca"),
        "nivel": nivel if isinstance(nivel, int) and not isinstance(nivel, bool) else None,
        "retrato_objeto": texto("imagem_ativo"),
    }


def ficha_da_copia(origem: PersonagemRegistro) -> dict[str, Any]:
    """Ficha da origem sem o estado da história (equipamento, efeitos, Desgaste, Consequências, retrato)."""
    ficha = deepcopy(origem.ficha or {})
    for chave in CHAVES_DE_ESTADO_LISTA:
        if chave in ficha:
            ficha[chave] = []
    for chave in CHAVES_DE_ESTADO_REMOVIDAS:
        ficha.pop(chave, None)
    personagem = ficha.get("personagem")
    if isinstance(personagem, dict):
        personagem.pop("imagem_ativo", None)
        # A ilustração do Resumo (aba-resumo-da-ficha) aponta para o espaço da mesa de origem.
        personagem.pop("ilustracao_ativo", None)
    return ficha


def procedencia(origem: PersonagemRegistro) -> dict[str, Any]:
    return {"mesa_id": origem.mesa_id, "personagem_id": origem.id, "copiado_em": datetime.now(UTC).isoformat()}
