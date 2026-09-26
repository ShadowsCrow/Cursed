"""Conferência de contagens, conteúdo crítico e amostras da migração legada."""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, MetaData, Table, select
from sqlalchemy.orm import Session

from cursed_platform.migracao_ativos import AtivoInvalido, _decodificar
from cursed_platform.migracao_json import migrar_json_catalogos
from cursed_platform.migracao_tabelas import TABELAS, _hash
from cursed_platform.persistence import (
    AtivoMigradoRegistro, EfeitoAplicadoRegistro, ItemInventarioRegistro,
    MigracaoLegadaRegistro, PersonagemRegistro,
)


@dataclass
class RelatorioEquivalencia:
    origem: str
    mesa_id: str
    contagens: dict[str, dict[str, int]] = field(default_factory=dict)
    divergencias: list[dict[str, str]] = field(default_factory=list)
    pendencias: list[dict[str, str]] = field(default_factory=list)
    amostras: list[dict[str, Any]] = field(default_factory=list)

    @property
    def aprovavel(self) -> bool:
        return not self.divergencias and not self.pendencias


def _equivalente(session: Session, origem: Any, destino: Any, personagem_id: str) -> bool:
    if isinstance(origem, dict) and isinstance(destino, dict):
        if "imagem_base64" in origem and "imagem_ativo" in destino:
            try:
                conteudo, _, _ = _decodificar(origem["imagem_base64"])
            except (AtivoInvalido, TypeError):
                return False
            assinatura = hashlib.sha256(conteudo).hexdigest()
            ativo = session.scalar(select(AtivoMigradoRegistro).where(
                AtivoMigradoRegistro.personagem_id == personagem_id,
                AtivoMigradoRegistro.sha256 == assinatura,
                AtivoMigradoRegistro.caminho == destino["imagem_ativo"],
            ))
            if ativo is None:
                return False
            origem = {chave: valor for chave, valor in origem.items() if chave != "imagem_base64"}
            destino = {chave: valor for chave, valor in destino.items() if chave != "imagem_ativo"}
        return origem.keys() == destino.keys() and all(
            _equivalente(session, valor, destino[chave], personagem_id) for chave, valor in origem.items())
    if isinstance(origem, list) and isinstance(destino, list):
        return len(origem) == len(destino) and all(
            _equivalente(session, antes, depois, personagem_id) for antes, depois in zip(origem, destino))
    return origem == destino


def _amostra(dados: Any) -> Any:
    """Serialização limitada; Base64 grande é representado por tamanho e hash."""
    if isinstance(dados, dict):
        return {chave: ({"sha256_base64": hashlib.sha256(valor.encode()).hexdigest(), "tamanho": len(valor)}
                        if chave == "imagem_base64" and isinstance(valor, str) else _amostra(valor))
                for chave, valor in dados.items()}
    if isinstance(dados, list):
        return [_amostra(valor) for valor in dados[:5]]
    if isinstance(dados, str) and len(dados) > 300:
        return dados[:300] + "…"
    return dados


def _conferir_tabelas(origem_engine: Engine, session: Session, relatorio: RelatorioEquivalencia,
                     limite_amostras: int) -> None:
    with origem_engine.connect() as conexao:
        meta = MetaData()
        nomes = ("fichas", *TABELAS, "ficha_efeitos_externos")
        if any(not origem_engine.dialect.has_table(conexao, nome) for nome in nomes):
            relatorio.divergencias.append({"fonte": "sql", "motivo": "Esquema legado incompleto."})
            return
        tabelas = {nome: Table(nome, meta, autoload_with=conexao) for nome in nomes}
        linhas = {nome: [dict(row) for row in conexao.execute(select(tabela).order_by(tabela.c.id)).mappings()]
                  for nome, tabela in tabelas.items()}
        filhos = {nome: {} for nome in nomes if nome != "fichas"}
        for nome, grupos in filhos.items():
            for linha in linhas[nome]:
                grupos.setdefault(linha["ficha_id"], []).append(linha)
        for ficha in linhas["fichas"]:
            id_legado = str(ficha["id"])
            secoes = {campo: ficha[campo] for campo in ("personagem", "personalidade", "atributos", "pericias")}
            for campo, nome in (("armas", "ficha_armas"), ("armaduras", "ficha_armaduras"),
                                ("outros", "ficha_outros"), ("efeitos_externos", "ficha_efeitos_externos")):
                secoes[campo] = [item["dados"] for item in sorted(
                    filhos[nome].get(ficha["id"], []), key=lambda x: (x["ordem"], x["id"]))]
            procedencia = session.scalar(select(MigracaoLegadaRegistro).where(
                MigracaoLegadaRegistro.origem == relatorio.origem,
                MigracaoLegadaRegistro.mesa_id == relatorio.mesa_id,
                MigracaoLegadaRegistro.tipo_origem == "fichas",
                MigracaoLegadaRegistro.id_origem == id_legado,
            ))
            personagem = session.get(PersonagemRegistro, procedencia.id_destino) if procedencia else None
            motivo = None
            if procedencia is None or personagem is None:
                motivo = "Ficha ou procedência ausente no destino."
            elif procedencia.hash_conteudo != _hash({"nome": ficha["nome"], **secoes}):
                motivo = "Hash da origem diverge da procedência."
            elif personagem.mesa_id != relatorio.mesa_id or not _equivalente(session, secoes, personagem.ficha, personagem.id):
                motivo = "Campos críticos da ficha divergentes."
            if motivo:
                relatorio.divergencias.append({"fonte": f"fichas#{id_legado}", "motivo": motivo})
            if len(relatorio.amostras) < limite_amostras:
                relatorio.amostras.append({"fonte": f"fichas#{id_legado}",
                    "origem": _amostra(secoes), "destino": _amostra(personagem.ficha) if personagem else None})

        for nome in nomes:
            provs = session.scalars(select(MigracaoLegadaRegistro).where(
                MigracaoLegadaRegistro.origem == relatorio.origem,
                MigracaoLegadaRegistro.mesa_id == relatorio.mesa_id,
                MigracaoLegadaRegistro.tipo_origem == nome,
            )).all()
            relatorio.contagens[nome] = {"origem": len(linhas[nome]), "procedencias": len(provs)}
            if len(linhas[nome]) != len(provs):
                relatorio.divergencias.append({"fonte": nome, "motivo": "Contagem de procedências divergente."})
            if nome == "fichas":
                continue
            for linha in linhas[nome]:
                registro = next((p for p in provs if p.id_origem == str(linha["id"])), None)
                classe = EfeitoAplicadoRegistro if nome == "ficha_efeitos_externos" else ItemInventarioRegistro
                destino = session.get(classe, registro.id_destino) if registro else None
                assinatura = _hash({"ficha_id": linha["ficha_id"], "dados": linha["dados"]})
                if registro is None or destino is None:
                    motivo = "Registro ou procedência ausente no destino."
                elif destino.mesa_id != relatorio.mesa_id:
                    motivo = "Registro vinculado a outra mesa."
                elif registro.hash_conteudo != assinatura:
                    motivo = "Hash da origem diverge da procedência."
                elif not _equivalente(session, linha["dados"],
                                      destino.conteudo if nome == "ficha_efeitos_externos" else destino.dados,
                                      destino.personagem_id):
                    motivo = "Payload crítico divergente."
                elif (nome == "ficha_efeitos_externos" and destino.nome != linha["dados"].get("nome")):
                    motivo = "Nome do efeito divergente."
                elif nome in TABELAS and (destino.tipo != TABELAS[nome]
                                          or destino.nome != linha["dados"].get("nome")
                                          or destino.quantidade != linha["dados"].get("quantidade", 1)):
                    motivo = "Campos críticos do item divergentes."
                else:
                    motivo = None
                if motivo:
                    relatorio.divergencias.append({"fonte": f"{nome}#{linha['id']}", "motivo": motivo})
                if len(relatorio.amostras) < limite_amostras:
                    relatorio.amostras.append({"fonte": f"{nome}#{linha['id']}",
                        "origem": _amostra(linha["dados"]),
                        "destino": _amostra(destino.conteudo if nome == "ficha_efeitos_externos" else destino.dados)
                                   if destino else None})


def gerar_relatorio_equivalencia(session: Session, *, origem: str, mesa_id: str,
                                origem_engine: Engine | None, fichas_dir: Path,
                                catalogos_dir: Path, limite_amostras: int = 5) -> RelatorioEquivalencia:
    """Somente leitura no resultado; qualquer divergência ou pendência bloqueia aprovação."""
    if limite_amostras < 1 or limite_amostras > 20:
        raise ValueError("Limite de amostras deve estar entre 1 e 20.")
    relatorio = RelatorioEquivalencia(origem, mesa_id)
    if origem_engine is None:
        relatorio.pendencias.append({"fonte": "sql", "motivo": "Banco legado não informado."})
    else:
        _conferir_tabelas(origem_engine, session, relatorio, limite_amostras)
    # A prévia do migrador JSON usa savepoint e é revertida. `convertido`
    # nesta execução significa que o destino ainda não existia.
    savepoint = session.begin_nested()
    try:
        jsons = migrar_json_catalogos(session, origem=origem, mesa_id=mesa_id,
            fichas_dir=fichas_dir, catalogos_dir=catalogos_dir, origem_engine=origem_engine)
        relatorio.contagens["json_e_catalogos"] = jsons.contagens
        for item in jsons.registros:
            if item.situacao == "convertido":
                relatorio.divergencias.append({"fonte": f"{item.fonte}#{item.identificador}",
                    "motivo": "Destino ainda não migrado."})
            elif item.situacao in {"pendente", "rejeitado"}:
                relatorio.pendencias.append({"fonte": f"{item.fonte}#{item.identificador}",
                    "motivo": item.motivo or item.situacao})
            if item.destino_id and len(relatorio.amostras) < limite_amostras:
                relatorio.amostras.append({"fonte": f"{item.fonte}#{item.identificador}",
                    "situacao": item.situacao, "destino_id": item.destino_id})
    finally:
        savepoint.rollback()
        session.expire_all()
    return relatorio
