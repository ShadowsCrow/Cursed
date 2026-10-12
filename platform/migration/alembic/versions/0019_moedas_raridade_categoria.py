"""Moedas sem platina; raridade, categoria e descrição dos itens existentes.

Mudança OpenSpec `reformular-visual-da-ficha` (design D6 e D7), por decisão do usuário de 2026-09-28:

- as moedas passam a três tipos (cobre, prata e ouro). A platina é retirada das pilhas, sem conversão;
  a pilha que zera some. Cada personagem afetado ganha um evento no histórico com a quantidade e a
  marca ``inventario.platina_retirada`` na ficha, que vira aviso até o Narrador confirmar;
- itens existentes passam a raridade Comum, e os do tipo Outros à categoria Diversos;
- itens concedidos por carta recebem o texto da carta como descrição e a arte da carta como foto,
  quando ainda não têm.

Só dados mudam (colunas JSON); nenhuma coluna ou restrição nova. A descida devolve a chave ``platina``
zerada às pilhas e apaga as marcas; as moedas retiradas não voltam (o evento registra quantas eram).

Revision ID: 0019_moedas_raridade_categoria
Revises: 0018_perfil_e_campanha
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from alembic import op
import sqlalchemy as sa


revision = "0019_moedas_raridade_categoria"
down_revision = "0018_perfil_e_campanha"
branch_labels = None
depends_on = None

TIPOS_MOEDA = ("cobre", "prata", "ouro")
MUDANCA = "reformular-visual-da-ficha"

itens = sa.table(
    "inventory_items",
    sa.column("id", sa.String), sa.column("mesa_id", sa.String), sa.column("personagem_id", sa.String),
    sa.column("tipo", sa.String), sa.column("subtipo", sa.String), sa.column("nome", sa.String),
    sa.column("dados", sa.JSON),
)
itens_chao = sa.table(
    "scene_stash_items",
    sa.column("id", sa.String), sa.column("subtipo", sa.String), sa.column("nome", sa.String), sa.column("dados", sa.JSON),
)
personagens = sa.table(
    "characters",
    sa.column("id", sa.String), sa.column("mesa_id", sa.String), sa.column("versao", sa.Integer),
    sa.column("ficha", sa.JSON),
)
eventos = sa.table(
    "audit_events",
    sa.column("mesa_id", sa.String), sa.column("origem", sa.String), sa.column("categoria", sa.String),
    sa.column("acao", sa.String), sa.column("relevancia", sa.String), sa.column("visibilidade", sa.String),
    sa.column("personagem_id", sa.String), sa.column("alvo_tipo", sa.String), sa.column("alvo_id", sa.String),
    sa.column("resumo", sa.String), sa.column("detalhes", sa.JSON),
)
posses = sa.table(
    "character_cards",
    sa.column("mesa_id", sa.String), sa.column("versao_id", sa.String), sa.column("item_id", sa.String),
)
versoes = sa.table("card_versions", sa.column("mesa_id", sa.String), sa.column("id", sa.String), sa.column("conteudo", sa.JSON))


def _rotulo(pilha: dict[str, Any]) -> str:
    partes = [f"{pilha[t]} {t}" for t in TIPOS_MOEDA if pilha.get(t)]
    return "Moedas (" + ", ".join(partes) + ")" if partes else "Moedas"


def _inteiro(valor: Any) -> int:
    return valor if isinstance(valor, int) and not isinstance(valor, bool) and valor > 0 else 0


def _retirar_platina(conexao, tabela) -> dict[tuple[str, str], int]:
    """Tira a platina das pilhas de ``tabela``; devolve a quantidade por (mesa, personagem) quando houver dono."""
    retiradas: dict[tuple[str, str], int] = defaultdict(int)
    colunas = [tabela.c.id, tabela.c.dados] + ([tabela.c.mesa_id, tabela.c.personagem_id] if hasattr(tabela.c, "personagem_id") else [])
    for linha in conexao.execute(sa.select(*colunas).where(tabela.c.subtipo == "moedas")).all():
        dados = dict(linha.dados or {})
        if "platina" not in dados:
            continue
        quantidade = _inteiro(dados.pop("platina"))
        if quantidade and hasattr(tabela.c, "personagem_id"):
            retiradas[(linha.mesa_id, linha.personagem_id)] += quantidade
        if not any(_inteiro(dados.get(t)) for t in TIPOS_MOEDA):
            conexao.execute(sa.delete(tabela).where(tabela.c.id == linha.id))
        else:
            conexao.execute(sa.update(tabela).where(tabela.c.id == linha.id).values(dados=dados, nome=_rotulo(dados)))
    return retiradas


def upgrade() -> None:
    conexao = op.get_bind()

    retiradas = _retirar_platina(conexao, itens)
    _retirar_platina(conexao, itens_chao)
    for (mesa_id, personagem_id), quantidade in retiradas.items():
        linha = conexao.execute(sa.select(personagens.c.versao, personagens.c.ficha).where(
            personagens.c.mesa_id == mesa_id, personagens.c.id == personagem_id)).one_or_none()
        if linha is None:
            continue
        ficha = dict(linha.ficha or {})
        inventario = dict(ficha.get("inventario") or {})
        inventario["platina_retirada"] = _inteiro(inventario.get("platina_retirada")) + quantidade
        ficha["inventario"] = inventario
        # A versão sobe: telas abertas com a ficha antiga recebem conflito em vez de sobrescrever.
        conexao.execute(sa.update(personagens).where(personagens.c.mesa_id == mesa_id, personagens.c.id == personagem_id)
                        .values(ficha=ficha, versao=(linha.versao or 0) + 1))
        conexao.execute(sa.insert(eventos).values(
            mesa_id=mesa_id, origem="migracao", categoria="inventario", acao="platina_retirada", relevancia="mecanica",
            visibilidade="mesa", personagem_id=personagem_id, alvo_tipo="personagem", alvo_id=personagem_id,
            resumo=f"{quantidade} moedas de platina retiradas (a platina deixou de existir)",
            detalhes={"quantidade": quantidade, "mudanca": MUDANCA},
        ))

    cartas_dos_itens = {
        (linha.mesa_id, linha.item_id): linha.conteudo or {}
        for linha in conexao.execute(
            sa.select(posses.c.mesa_id, posses.c.item_id, versoes.c.conteudo)
            .join(versoes, sa.and_(versoes.c.mesa_id == posses.c.mesa_id, versoes.c.id == posses.c.versao_id))
            .where(posses.c.item_id.is_not(None))
        ).all()
    }
    for linha in conexao.execute(sa.select(itens.c.id, itens.c.mesa_id, itens.c.tipo, itens.c.subtipo, itens.c.dados)).all():
        dados = dict(linha.dados or {})
        antes = dict(dados)
        dados.setdefault("raridade", "comum")
        if (linha.subtipo == "outro" or (linha.subtipo is None and linha.tipo == "outro")) and not dados.get("categoria"):
            dados["categoria"] = "diversos"
        carta = cartas_dos_itens.get((linha.mesa_id, linha.id), {})
        texto = carta.get("texto")
        if isinstance(texto, str) and texto.strip() and not dados.get("descricao"):
            dados["descricao"] = texto.strip()
        ativos = carta.get("ativos")
        if isinstance(ativos, list) and ativos and isinstance(ativos[0], str) and not dados.get("imagem_ativo"):
            dados["imagem_ativo"] = ativos[0]
        if dados != antes:
            conexao.execute(sa.update(itens).where(itens.c.id == linha.id).values(dados=dados))


def downgrade() -> None:
    conexao = op.get_bind()
    for tabela in (itens, itens_chao):
        for linha in conexao.execute(sa.select(tabela.c.id, tabela.c.dados).where(tabela.c.subtipo == "moedas")).all():
            conexao.execute(sa.update(tabela).where(tabela.c.id == linha.id)
                            .values(dados={**(linha.dados or {}), "platina": 0}))
    for linha in conexao.execute(sa.select(personagens.c.mesa_id, personagens.c.id, personagens.c.ficha)).all():
        ficha = dict(linha.ficha or {})
        inventario = ficha.get("inventario")
        if isinstance(inventario, dict) and "platina_retirada" in inventario:
            inventario = {k: v for k, v in inventario.items() if k != "platina_retirada"}
            if inventario:
                ficha["inventario"] = inventario
            else:
                ficha.pop("inventario")
            conexao.execute(sa.update(personagens).where(personagens.c.mesa_id == linha.mesa_id, personagens.c.id == linha.id)
                            .values(ficha=ficha))
