"""Migração idempotente de exportações JSON e catálogos legados para uma mesa.

Entradas sem representação segura permanecem no relatório como pendências.
Nenhuma carta importada é publicada automaticamente.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import Engine, MetaData, Table, select
from sqlalchemy.orm import Session

from cursed_platform import cartas
from cursed_platform import catalogos
from cursed_platform.migracao_ambiguidades import preservar_custo_legado
from cursed_platform.migracao_tabelas import DivergenciaMigracao, _registrar
from cursed_platform.narrador import modificadores_validos
from cursed_platform.persistence import (
    CartaDefinicaoRegistro, EfeitoAplicadoRegistro, ItemInventarioRegistro,
    MesaRegistro, MigracaoLegadaRegistro, OperacaoEfeitoRegistro, PersonagemRegistro,
)


CATALOGOS = (
    "classes.json", "racas.json", "tipos_dano.json", "reserva_habilidades.json",
    "armas_lib.json", "efeitos_default.json", "efeitos_externos.json", "efeitos_externos_lib.json",
)
LISTAS_FICHA = {"armas": "arma", "armaduras": "armadura", "outros": "outro"}


class RevisaoPendente(ValueError):
    """Dado legível cujo destino exige escolha explícita."""


@dataclass(frozen=True)
class ResultadoRegistro:
    fonte: str
    identificador: str
    situacao: str
    destino_id: str | None = None
    motivo: str | None = None


@dataclass
class RelatorioJson:
    origem: str
    mesa_id: str
    registros: list[ResultadoRegistro] = field(default_factory=list)

    @property
    def contagens(self) -> dict[str, int]:
        return {situacao: sum(item.situacao == situacao for item in self.registros)
                for situacao in ("convertido", "existente", "pendente", "rejeitado")}

    @property
    def aprovavel(self) -> bool:
        return not any(item.situacao in {"pendente", "rejeitado"} for item in self.registros)

    def adicionar(self, fonte: str, identificador: str, situacao: str,
                 destino_id: str | None = None, motivo: str | None = None) -> None:
        self.registros.append(ResultadoRegistro(fonte, identificador, situacao, destino_id, motivo))


def _id(origem: str, tipo: str, identificador: str) -> str:
    return uuid5(NAMESPACE_URL, f"cursed:{origem}:{tipo}:{identificador}").hex


def _tem_imagem_pendente(dados: Any) -> bool:
    if isinstance(dados, dict):
        return any((chave in {"imagem", "imagem_base64"} and bool(valor))
                   or _tem_imagem_pendente(valor) for chave, valor in dados.items())
    if isinstance(dados, list):
        return any(_tem_imagem_pendente(valor) for valor in dados)
    return False


def _sem_imagens(dados: Any) -> Any:
    """Mantém os dados legados sem embutir imagens no rascunho ou na procedência."""
    if isinstance(dados, dict):
        return {chave: _sem_imagens(valor) for chave, valor in dados.items()
                if chave not in {"imagem", "imagem_base64"}}
    if isinstance(dados, list):
        return [_sem_imagens(valor) for valor in dados]
    return dados


def _rascunho(tipo: str, dados: dict[str, Any], *, item_tipo: str | None = None) -> dict[str, Any]:
    nome = dados.get("nome")
    if not isinstance(nome, str) or not nome.strip():
        raise ValueError("Nome ausente.")
    descricao = dados.get("descricao")
    if not isinstance(descricao, str) or not descricao.strip():
        raise RevisaoPendente("Descrição ausente; revisão editorial necessária.")
    base = {"titulo": nome.strip(), "texto": descricao.strip()}
    if tipo in {"habilidade", "magia"}:
        origem = preservar_custo_legado(dados)
        if origem.get("custo_legado") is not None:
            base["custo_legado"] = origem["custo_legado"]
        ativacao = str(dados.get("tipo") or "").casefold()
        if ativacao in {"ativa", "passiva"}:
            base["ativacao"] = ativacao
        elif ativacao:
            raise RevisaoPendente(f"Tipo de ativação legado sem equivalência: {dados['tipo']}.")
    elif tipo == "item":
        if item_tipo not in LISTAS_FICHA.values():
            raise ValueError("Tipo de item sem destino validado.")
        base.update({"item_tipo": item_tipo, "dados": {k: v for k, v in dados.items()
                     if k not in {"nome", "descricao", "quantidade", "efeitos"}}})
        quantidade = dados.get("quantidade", 1)
        if isinstance(quantidade, bool) or not isinstance(quantidade, int) or quantidade < 1:
            raise ValueError("Quantidade inválida.")
        base["quantidade"] = quantidade
        if dados.get("efeitos"):
            raise RevisaoPendente("Efeitos de item exigem conversão explícita. "
                                  "Tipo e dimensão na grade também ficam pendentes de definição pelo Narrador.")
    elif tipo == "efeito":
        base["modificadores"] = modificadores_validos(dados.get("modificadores") or [])
    return base


def _importar_carta(session: Session, relatorio: RelatorioJson, *, fonte: str,
                   identificador: str, dados: Any, tipo: str, narrador_id: str,
                   item_tipo: str | None = None, contexto: dict[str, str] | None = None) -> None:
    if not isinstance(dados, dict):
        relatorio.adicionar(fonte, identificador, "rejeitado", motivo="Entrada não é objeto JSON.")
        return
    imagem_pendente = _tem_imagem_pendente(dados)
    try:
        rascunho = _rascunho(tipo, _sem_imagens(dados), item_tipo=item_tipo)
        _, validacao = cartas.validar(tipo, rascunho, relatorio.mesa_id, para_publicar=False)
        if not validacao.valida:
            relatorio.adicionar(fonte, identificador, "pendente",
                               motivo="Rascunho requer revisão: " + "; ".join(p.mensagem for p in validacao.problemas))
            return
        destino_id, criado = _registrar(
            session, origem=relatorio.origem, versao_origem="json", mesa_id=relatorio.mesa_id,
            tipo=fonte, identificador=identificador, dados=dados, destino="card_definitions",
        )
    except RevisaoPendente as erro:
        relatorio.adicionar(fonte, identificador, "pendente", motivo=str(erro))
        return
    except (ValueError, DivergenciaMigracao) as erro:
        relatorio.adicionar(fonte, identificador, "rejeitado", motivo=str(erro))
        return
    if criado:
        session.add(CartaDefinicaoRegistro(
            id=destino_id, mesa_id=relatorio.mesa_id, tipo=tipo, criado_por=narrador_id,
            versao=0, rascunho={"conteudo": {**rascunho, "tipo": tipo}, "procedencia": {
                "origem": relatorio.origem, "fonte": fonte, "identificador": identificador,
                "contexto": contexto or {}, "dados_originais": _sem_imagens(dados),
            }},
        ))
    elif session.get(CartaDefinicaoRegistro, destino_id) is None:
        raise DivergenciaMigracao(f"{fonte}#{identificador}: destino não encontrado.")
    pendencias = []
    if cartas.AVISO_CUSTO_LEGADO in validacao.revisao_pendente:
        pendencias.append("Custo legado exige revisão.")
    if cartas.AVISO_FORMATO_PENDENTE in validacao.revisao_pendente:
        pendencias.append("Tipo e dimensão na grade pendentes de definição pelo Narrador; o peso fica só como descrição.")
    imagem_extraida = bool((session.get(CartaDefinicaoRegistro, destino_id).rascunho or {})
                          .get("conteudo", {}).get("ativos_privados"))
    if imagem_pendente and not imagem_extraida:
        pendencias.append("Imagem exige extração para objeto privado.")
    motivo = " ".join(pendencias) or None
    relatorio.adicionar(fonte, identificador,
                       "pendente" if motivo else ("convertido" if criado else "existente"), destino_id, motivo)


def _validar_ficha(dados: Any) -> dict[str, Any]:
    if not isinstance(dados, dict):
        raise ValueError("Ficha não é objeto JSON.")
    for campo in ("personagem", "personalidade", "atributos", "pericias"):
        if not isinstance(dados.get(campo), dict):
            raise ValueError(f"Seção {campo} ausente ou inválida.")
    nome = dados["personagem"].get("nome")
    if not isinstance(nome, str) or not nome.strip():
        raise ValueError("Nome do personagem ausente.")
    for campo in (*LISTAS_FICHA, "efeitos_externos"):
        if campo in dados and not isinstance(dados[campo], list):
            raise ValueError(f"Lista {campo} inválida.")
    for campo in LISTAS_FICHA:
        for item in dados.get(campo, []):
            if not isinstance(item, dict) or not isinstance(item.get("nome"), str) or not item["nome"].strip():
                raise ValueError(f"Item inválido em {campo}.")
            quantidade = item.get("quantidade", 1)
            if isinstance(quantidade, bool) or not isinstance(quantidade, int) or quantidade < 1:
                raise ValueError(f"Quantidade inválida em {campo}.")
    for efeito in dados.get("efeitos_externos", []):
        if not isinstance(efeito, dict) or not isinstance(efeito.get("nome"), str) or not efeito["nome"].strip():
            raise ValueError("Efeito externo inválido.")
        modificadores_validos(efeito.get("modificadores") or [])
    return dados


def _importar_ficha(session: Session, relatorio: RelatorioJson, caminho: Path,
                    raiz: Path) -> None:
    fonte = "json:ficha"
    relativo = caminho.relative_to(raiz).as_posix()
    identificador = hashlib.sha256(relativo.encode("utf-8")).hexdigest()
    try:
        dados = _validar_ficha(json.loads(caminho.read_text(encoding="utf-8")))
        nome = dados["personagem"]["nome"].strip().casefold()
        for outro in session.scalars(select(PersonagemRegistro).where(
            PersonagemRegistro.mesa_id == relatorio.mesa_id)).all():
            if (isinstance(outro.ficha.get("personagem"), dict)
                    and str(outro.ficha["personagem"].get("nome") or "").strip().casefold() == nome):
                anterior = session.scalar(select(MigracaoLegadaRegistro).where(
                    MigracaoLegadaRegistro.origem == relatorio.origem,
                    MigracaoLegadaRegistro.tipo_origem == fonte,
                    MigracaoLegadaRegistro.id_origem == identificador,
                    MigracaoLegadaRegistro.id_destino == outro.id,
                ))
                if anterior is None:
                    relatorio.adicionar(fonte, relativo, "pendente",
                                       motivo="Já existe personagem com esse nome na mesa; associação exige revisão.")
                    return
        destino_id, criado = _registrar(
            session, origem=relatorio.origem, versao_origem="json", mesa_id=relatorio.mesa_id,
            tipo=fonte, identificador=identificador, dados=dados, destino="characters",
        )
    except (OSError, json.JSONDecodeError, ValueError, DivergenciaMigracao) as erro:
        relatorio.adicionar(fonte, relativo, "rejeitado", motivo=str(erro))
        return
    if criado:
        session.add(PersonagemRegistro(
            id=destino_id, mesa_id=relatorio.mesa_id, proprietario_id=None,
            ficha=dados, tipo="personagem", visibilidade="mesa",
        ))
        session.flush()
        for campo, tipo in LISTAS_FICHA.items():
            for indice, item in enumerate(dados.get(campo, [])):
                session.add(ItemInventarioRegistro(
                    id=_id(relatorio.origem, fonte, f"{identificador}:{campo}:{indice}"),
                    mesa_id=relatorio.mesa_id, personagem_id=destino_id,
                    tipo=tipo, nome=item["nome"], quantidade=item.get("quantidade", 1),
                    equipado=item.get("equipado") is True, dados=item,
                ))
        for indice, efeito in enumerate(dados.get("efeitos_externos", [])):
            efeito_id = _id(relatorio.origem, fonte, f"{identificador}:efeitos_externos:{indice}")
            session.add(EfeitoAplicadoRegistro(
                id=efeito_id, mesa_id=relatorio.mesa_id, personagem_id=destino_id,
                nome=efeito["nome"], descricao=str(efeito.get("descricao") or ""),
                conteudo=efeito, estado="ativo", versao=1,
            ))
            for ordem, modificador in enumerate(modificadores_validos(efeito.get("modificadores") or [])):
                session.add(OperacaoEfeitoRegistro(
                    id=_id(relatorio.origem, fonte, f"{identificador}:efeito:{indice}:op:{ordem}"),
                    efeito_id=efeito_id, tipo="modificador", alvo=modificador["alvo"],
                    valor=modificador["valor"], contexto=modificador.get("contexto"),
                ))
    elif session.get(PersonagemRegistro, destino_id) is None:
        raise DivergenciaMigracao(f"{fonte}#{relativo}: destino não encontrado.")
    relatorio.adicionar(fonte, relativo, "convertido" if criado else "existente", destino_id)


def _catalogo_da_plataforma(relatorio: RelatorioJson, fonte: str, ident: str, entrada: Any, tipo: str) -> None:
    if not isinstance(entrada, dict) or not str(entrada.get("nome") or "").strip():
        relatorio.adicionar(fonte, ident, "rejeitado", motivo=f"{tipo.capitalize()} inválida.")
        return
    catalogo = catalogos.obter()
    nome = str(entrada["nome"]).strip()
    encontrado = catalogo.classe(nome) if tipo == "classe" else catalogo.raca(nome)
    if encontrado is None:
        relatorio.adicionar(fonte, ident, "pendente",
                            motivo=f"{tipo.capitalize()} \"{nome}\" não está no catálogo da plataforma.")
    else:
        relatorio.adicionar(fonte, ident, "existente",
                            motivo=f"Coberta pelo catálogo da plataforma ({encontrado.nome}).")


def _catalogos(session: Session, relatorio: RelatorioJson, raiz: Path, narrador_id: str) -> None:
    for nome in CATALOGOS:
        caminho = raiz / nome
        fonte = f"json:{nome}"
        try:
            dados = json.loads(caminho.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as erro:
            relatorio.adicionar(fonte, "arquivo", "rejeitado", motivo=str(erro))
            continue
        if not isinstance(dados, list):
            relatorio.adicionar(fonte, "arquivo", "rejeitado", motivo="Catálogo não é lista JSON.")
            continue
        for indice, entrada in enumerate(dados):
            ident = str(indice)
            if nome == "tipos_dano.json":
                relatorio.adicionar(fonte, ident, "pendente", motivo="Não há entidade de catálogo aprovada.")
            elif nome in {"classes.json", "racas.json"}:
                # Classes e raças são o catálogo da plataforma (calcular-valores-da-ficha): as habilidades
                # viram cartas quando um personagem usa a classe, e não são importadas como cartas avulsas.
                _catalogo_da_plataforma(relatorio, fonte, ident, entrada, "classe" if nome == "classes.json" else "raca")
            elif nome == "armas_lib.json":
                _importar_carta(session, relatorio, fonte=fonte, identificador=ident,
                                dados=entrada, tipo="item", item_tipo="arma", narrador_id=narrador_id)
            elif nome in {"efeitos_default.json", "efeitos_externos.json", "efeitos_externos_lib.json"}:
                _importar_carta(session, relatorio, fonte=fonte, identificador=ident,
                                dados=entrada, tipo="efeito", narrador_id=narrador_id)
            else:
                _importar_carta(session, relatorio, fonte=fonte, identificador=ident,
                                dados=entrada, tipo="habilidade", narrador_id=narrador_id)


def _bibliotecas_sql(origem_engine: Engine, session: Session, relatorio: RelatorioJson,
                     narrador_id: str) -> None:
    with origem_engine.connect() as conexao:
        meta = MetaData()
        for tabela_nome, tipo in (("equipment_library", "item"), ("effects_library", "efeito")):
            if not origem_engine.dialect.has_table(conexao, tabela_nome):
                relatorio.adicionar(f"sql:{tabela_nome}", "tabela", "pendente", motivo="Tabela ausente na origem.")
                continue
            tabela = Table(tabela_nome, meta, autoload_with=conexao)
            for linha in conexao.execute(select(tabela).order_by(tabela.c.id)).mappings():
                _importar_carta(session, relatorio, fonte=f"sql:{tabela_nome}", identificador=str(linha["id"]),
                    dados=linha["dados"], tipo=tipo, narrador_id=narrador_id,
                    item_tipo=linha["tipo"] if tipo == "item" else None)


def migrar_json_catalogos(session: Session, *, origem: str, mesa_id: str,
                          fichas_dir: Path, catalogos_dir: Path,
                          origem_engine: Engine | None = None) -> RelatorioJson:
    """Converte registros seguros; a transação e eventual rollback cabem ao chamador."""
    mesa = session.get(MesaRegistro, mesa_id)
    if not origem or len(origem) > 200 or mesa is None:
        raise DivergenciaMigracao("Informe origem estável e mesa de destino existente.")
    relatorio = RelatorioJson(origem, mesa_id)
    if fichas_dir.is_dir():
        for caminho in sorted(fichas_dir.glob("*.json")):
            _importar_ficha(session, relatorio, caminho, fichas_dir)
    else:
        relatorio.adicionar("json:ficha", "diretorio", "pendente", motivo="Diretório de fichas ausente.")
    _catalogos(session, relatorio, catalogos_dir, mesa.narrador_id)
    if origem_engine is not None:
        _bibliotecas_sql(origem_engine, session, relatorio, mesa.narrador_id)
    else:
        for nome in ("equipment_library", "effects_library"):
            relatorio.adicionar(f"sql:{nome}", "tabela", "pendente",
                               motivo="URL do banco legado não fornecida para esta biblioteca.")
    session.flush()
    return relatorio
