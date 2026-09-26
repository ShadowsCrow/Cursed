"""Migração idempotente das tabelas de ficha do Streamlit para uma mesa explícita.

Não importa Streamlit nem altera a origem. O chamador controla a transação de
destino e informa uma identidade estável da origem; mudanças posteriores numa
linha já migrada são recusadas para revisão, sem sobrescrever a ficha em uso.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
from typing import Any
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import Engine, MetaData, Table, select
from sqlalchemy.orm import Session

from cursed_platform.narrador import modificadores_validos
from cursed_platform.persistence import (
    EfeitoAplicadoRegistro, ItemInventarioRegistro, MesaRegistro, MigracaoLegadaRegistro,
    OperacaoEfeitoRegistro, PersonagemRegistro,
)


TABELAS = {
    "ficha_armas": "arma", "ficha_armaduras": "armadura", "ficha_outros": "outro",
}


class DivergenciaMigracao(ValueError):
    """Entrada inválida ou alterada desde uma migração anterior."""


@dataclass
class RelatorioTabelas:
    origem: str
    versao_origem: str | None
    mesa_id: str
    convertidos: dict[str, int] = field(default_factory=dict)
    existentes: dict[str, int] = field(default_factory=dict)

    def contar(self, tipo: str, criado: bool) -> None:
        destino = self.convertidos if criado else self.existentes
        destino[tipo] = destino.get(tipo, 0) + 1


def _id(origem: str, tipo: str, identificador: str) -> str:
    return uuid5(NAMESPACE_URL, f"cursed:{origem}:{tipo}:{identificador}").hex


def _hash(dados: Any) -> str:
    serializado = json.dumps(dados, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serializado.encode("utf-8")).hexdigest()


def _objeto(dados: Any, contexto: str) -> dict[str, Any]:
    if not isinstance(dados, dict):
        raise DivergenciaMigracao(f"{contexto}: o conteúdo precisa ser um objeto JSON.")
    return dados


def _registrar(
    session: Session, *, origem: str, versao_origem: str | None, mesa_id: str,
    tipo: str, identificador: str, dados: Any, destino: str,
) -> tuple[str, bool]:
    identificador = str(identificador)
    atual = session.scalar(select(MigracaoLegadaRegistro).where(
        MigracaoLegadaRegistro.origem == origem,
        MigracaoLegadaRegistro.tipo_origem == tipo,
        MigracaoLegadaRegistro.id_origem == identificador,
    ))
    assinatura = _hash(dados)
    if atual:
        if atual.hash_conteudo != assinatura or atual.mesa_id != mesa_id or atual.tipo_destino != destino:
            raise DivergenciaMigracao(f"{tipo}#{identificador}: origem alterada ou mesa de destino diferente.")
        return atual.id_destino, False
    destino_id = _id(origem, tipo, identificador)
    session.add(MigracaoLegadaRegistro(
        id=_id(origem, "procedencia", f"{tipo}:{identificador}"),
        origem=origem, versao_origem=versao_origem, tipo_origem=tipo, id_origem=identificador,
        hash_conteudo=assinatura, mesa_id=mesa_id, tipo_destino=destino, id_destino=destino_id,
    ))
    return destino_id, True


def migrar_tabelas(origem_engine: Engine, destino_session: Session, *, origem: str, mesa_id: str) -> RelatorioTabelas:
    """Converte fichas e tabelas filhas; confirmar ou desfazer cabe ao chamador."""
    if not origem or len(origem) > 200 or not mesa_id:
        raise DivergenciaMigracao("Informe identidade estável da origem e mesa de destino.")
    if destino_session.get(MesaRegistro, mesa_id) is None:
        raise DivergenciaMigracao("A mesa de destino não existe; escolha-a explicitamente.")
    with origem_engine.connect() as conexao:
        meta = MetaData()
        try:
            tabelas = {nome: Table(nome, meta, autoload_with=conexao) for nome in (
                "fichas", *TABELAS, "ficha_efeitos_externos",
            )}
        except Exception as erro:
            raise DivergenciaMigracao(f"Esquema legado incompleto: {erro}") from erro
        versao = None
        if origem_engine.dialect.has_table(conexao, "app_meta"):
            metadados = Table("app_meta", meta, autoload_with=conexao)
            versao = conexao.execute(select(metadados.c.value).where(metadados.c.key == "schema_version")).scalar()
        relatorio = RelatorioTabelas(origem=origem, versao_origem=versao, mesa_id=mesa_id)
        filhos: dict[str, dict[int, list[dict[str, Any]]]] = {}
        for nome in (*TABELAS, "ficha_efeitos_externos"):
            tabela = tabelas[nome]
            agrupados: dict[int, list[dict[str, Any]]] = {}
            for row in conexao.execute(select(tabela).order_by(tabela.c.ficha_id, tabela.c.ordem, tabela.c.id)).mappings():
                agrupados.setdefault(row["ficha_id"], []).append(dict(row))
            filhos[nome] = agrupados

        for ficha in conexao.execute(select(tabelas["fichas"]).order_by(tabelas["fichas"].c.id)).mappings():
            legado_id = ficha["id"]
            secoes = {campo: _objeto(ficha[campo], f"fichas#{legado_id}.{campo}") for campo in (
                "personagem", "personalidade", "atributos", "pericias",
            )}
            secoes.update({campo: [
                _objeto(item["dados"], f"{tabela}#{item['id']}")
                for item in filhos[tabela].get(legado_id, [])
            ] for campo, tabela in (
                ("armas", "ficha_armas"), ("armaduras", "ficha_armaduras"),
                ("outros", "ficha_outros"), ("efeitos_externos", "ficha_efeitos_externos"),
            )})
            personagem_id, criado = _registrar(
                destino_session, origem=origem, versao_origem=versao, mesa_id=mesa_id,
                tipo="fichas", identificador=legado_id,
                dados={"nome": ficha["nome"], **secoes}, destino="characters",
            )
            if criado:
                destino_session.add(PersonagemRegistro(
                    id=personagem_id, mesa_id=mesa_id, proprietario_id=None,
                    ficha=secoes, tipo="personagem", visibilidade="mesa",
                ))
                destino_session.flush()
            elif destino_session.get(PersonagemRegistro, personagem_id) is None:
                raise DivergenciaMigracao(f"fichas#{legado_id}: destino não encontrado.")
            relatorio.contar("fichas", criado)

            for tabela, tipo in TABELAS.items():
                for item in filhos[tabela].get(legado_id, []):
                    dados = _objeto(item["dados"], f"{tabela}#{item['id']}")
                    if not isinstance(dados.get("nome"), str) or not dados["nome"].strip():
                        raise DivergenciaMigracao(f"{tabela}#{item['id']}: nome ausente.")
                    quantidade = dados.get("quantidade", 1)
                    if isinstance(quantidade, bool) or not isinstance(quantidade, int) or quantidade <= 0:
                        raise DivergenciaMigracao(f"{tabela}#{item['id']}: quantidade inválida.")
                    item_id, novo = _registrar(
                        destino_session, origem=origem, versao_origem=versao, mesa_id=mesa_id,
                        tipo=tabela, identificador=item["id"], dados={"ficha_id": legado_id, "dados": dados},
                        destino="inventory_items",
                    )
                    if novo:
                        destino_session.add(ItemInventarioRegistro(
                            id=item_id, mesa_id=mesa_id, personagem_id=personagem_id,
                            tipo=tipo, nome=dados["nome"], quantidade=quantidade,
                            equipado=dados.get("equipado") is True, dados=dados,
                        ))
                    elif destino_session.get(ItemInventarioRegistro, item_id) is None:
                        raise DivergenciaMigracao(f"{tabela}#{item['id']}: destino não encontrado.")
                    relatorio.contar(tabela, novo)

            for item in filhos["ficha_efeitos_externos"].get(legado_id, []):
                dados = _objeto(item["dados"], f"ficha_efeitos_externos#{item['id']}")
                if not isinstance(dados.get("nome"), str) or not dados["nome"].strip():
                    raise DivergenciaMigracao(f"ficha_efeitos_externos#{item['id']}: nome ausente.")
                modificadores = modificadores_validos(dados.get("modificadores") or [])
                efeito_id, novo = _registrar(
                    destino_session, origem=origem, versao_origem=versao, mesa_id=mesa_id,
                    tipo="ficha_efeitos_externos", identificador=item["id"],
                    dados={"ficha_id": legado_id, "dados": dados}, destino="character_effects",
                )
                if novo:
                    destino_session.add(EfeitoAplicadoRegistro(
                        id=efeito_id, mesa_id=mesa_id, personagem_id=personagem_id,
                        nome=dados["nome"], descricao=str(dados.get("descricao") or ""),
                        conteudo=dados, estado="ativo", versao=1,
                    ))
                    for indice, modificador in enumerate(modificadores):
                        destino_session.add(OperacaoEfeitoRegistro(
                            id=_id(origem, "operacao_efeito", f"{item['id']}:{indice}"),
                            efeito_id=efeito_id, tipo="modificador", alvo=modificador["alvo"],
                            valor=modificador["valor"], contexto=modificador.get("contexto"),
                        ))
                elif destino_session.get(EfeitoAplicadoRegistro, efeito_id) is None:
                    raise DivergenciaMigracao(f"ficha_efeitos_externos#{item['id']}: destino não encontrado.")
                relatorio.contar("ficha_efeitos_externos", novo)
        destino_session.flush()
        return relatorio
