"""Extrai imagens legadas para objetos privados sem inferir semântica de jogo."""

from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass, field
import hashlib
import json
import os
from io import BytesIO
from pathlib import Path
from typing import Any, Protocol
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import NAMESPACE_URL, uuid5

from PIL import Image, UnidentifiedImageError

from sqlalchemy import Engine, MetaData, Table, select
from sqlalchemy.orm import Session

from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.persistence import (
    AtivoCatalogoRegistro, AtivoMigradoRegistro, CartaDefinicaoRegistro, EfeitoAplicadoRegistro, ItemInventarioRegistro,
    MesaRegistro, MigracaoLegadaRegistro, PersonagemRegistro,
)


MAX_IMAGEM = 6 * 1024 * 1024
FORMATOS = (
    (b"\x89PNG\r\n\x1a\n", "image/png", "png"),
    (b"\xff\xd8\xff", "image/jpeg", "jpg"),
    (b"GIF87a", "image/gif", "gif"),
    (b"GIF89a", "image/gif", "gif"),
    (b"RIFF", "image/webp", "webp"),
)


class AtivoInvalido(ValueError):
    """Imagem ou objeto incompatível com a migração."""


class ArmazenamentoObjetos(Protocol):
    def ler(self, bucket: str, caminho: str) -> bytes | None: ...
    def gravar(self, bucket: str, caminho: str, conteudo: bytes, tipo: str) -> None: ...


def _sem_limite_de_caminho(arquivo: Path) -> Path:
    """No Windows, caminhos com mais de 260 caracteres só abrem no formato estendido (`\\\\?\\`).

    Os objetos têm dois ids de 32 caracteres e um nome de 64; numa pasta temporária longa, a versão
    de exibição passa do limite. O formato estendido vale só para caminhos absolutos já resolvidos.
    """
    texto = str(arquivo)
    if os.name == "nt" and len(texto) >= 240 and not texto.startswith("\\\\?\\"):
        return Path("\\\\?\\" + texto)
    return arquivo


class ArmazenamentoLocal:
    """Backend de ensaio com a mesma convenção de caminhos do bucket privado."""

    def __init__(self, raiz: Path):
        self.raiz = raiz.resolve()

    def _arquivo(self, bucket: str, caminho: str) -> Path:
        if "\\" in caminho:
            raise AtivoInvalido("Caminho de objeto inválido.")
        arquivo = (self.raiz / bucket / caminho).resolve()
        if not arquivo.is_relative_to(self.raiz) or bucket != BUCKET_PRIVADO:
            raise AtivoInvalido("Caminho de objeto fora do bucket privado.")
        return _sem_limite_de_caminho(arquivo)

    def ler(self, bucket: str, caminho: str) -> bytes | None:
        arquivo = self._arquivo(bucket, caminho)
        return arquivo.read_bytes() if arquivo.is_file() else None

    def gravar(self, bucket: str, caminho: str, conteudo: bytes, tipo: str) -> None:
        arquivo = self._arquivo(bucket, caminho)
        if arquivo.exists():
            if arquivo.read_bytes() != conteudo:
                raise AtivoInvalido(f"Objeto existente divergente: {caminho}")
            return
        arquivo.parent.mkdir(parents=True, exist_ok=True)
        arquivo.write_bytes(conteudo)


class ArmazenamentoSupabase:
    """Acesso administrativo ao Storage; a chave fica somente no processo migrador."""

    def __init__(self, url: str, chave_servico: str):
        if not url.startswith("https://") or not chave_servico:
            raise ValueError("Informe URL HTTPS e chave de serviço do Storage.")
        self.url = url.rstrip("/")
        self.chave = chave_servico

    def _requisicao(self, bucket: str, caminho: str, metodo: str, dados: bytes | None = None,
                    tipo: str | None = None) -> bytes | None:
        endereco = f"{self.url}/storage/v1/object/{quote(bucket)}/{quote(caminho, safe='/')}"
        cabecalhos = {"Authorization": f"Bearer {self.chave}", "apikey": self.chave}
        if tipo:
            cabecalhos["Content-Type"] = tipo
        try:
            with urlopen(Request(endereco, data=dados, headers=cabecalhos, method=metodo), timeout=30) as resposta:
                return resposta.read()
        except HTTPError as erro:
            if metodo == "GET" and erro.code == 404:
                return None
            raise AtivoInvalido(f"Storage retornou HTTP {erro.code} para {caminho}.") from erro

    def ler(self, bucket: str, caminho: str) -> bytes | None:
        return self._requisicao(bucket, caminho, "GET")

    def gravar(self, bucket: str, caminho: str, conteudo: bytes, tipo: str) -> None:
        existente = self.ler(bucket, caminho)
        if existente is not None:
            if existente != conteudo:
                raise AtivoInvalido(f"Objeto existente divergente: {caminho}")
            return
        try:
            self._requisicao(bucket, caminho, "POST", conteudo, tipo)
        except AtivoInvalido:
            # Outra execução pode ter criado o mesmo objeto entre GET e POST.
            if self.ler(bucket, caminho) != conteudo:
                raise


@dataclass
class RelatorioAtivos:
    encontrados: int = 0
    criados: int = 0
    reutilizados: int = 0
    rejeitados: list[dict[str, str]] = field(default_factory=list)


def _decodificar(valor: str) -> tuple[bytes, str, str]:
    declarado = None
    if valor.startswith("data:"):
        try:
            cabecalho, valor = valor.split(",", 1)
        except ValueError as erro:
            raise AtivoInvalido("Data URL sem conteúdo.") from erro
        if not cabecalho.endswith(";base64"):
            raise AtivoInvalido("Data URL não usa Base64.")
        declarado = cabecalho[5:-7]
    try:
        conteudo = base64.b64decode(valor, validate=True)
    except (ValueError, binascii.Error) as erro:
        raise AtivoInvalido("Base64 inválido.") from erro
    if not conteudo or len(conteudo) > MAX_IMAGEM:
        raise AtivoInvalido("Imagem vazia ou acima de 6 MiB.")
    for assinatura, tipo, extensao in FORMATOS:
        if conteudo.startswith(assinatura) and (tipo != "image/webp" or conteudo[8:12] == b"WEBP"):
            try:
                with Image.open(BytesIO(conteudo)) as imagem:
                    if imagem.width * imagem.height > 20_000_000:
                        raise AtivoInvalido("Imagem excede 20 milhões de pixels.")
                    if Image.MIME.get(imagem.format) != tipo or (declarado and declarado != tipo):
                        raise AtivoInvalido("Assinatura e formato de imagem divergentes.")
                    imagem.verify()
            except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as erro:
                raise AtivoInvalido("Imagem corrompida.") from erro
            return conteudo, tipo, extensao
    raise AtivoInvalido("Formato de imagem não reconhecido.")


def _imagens(dados: Any, caminho: str = ""):
    if isinstance(dados, dict):
        for chave, valor in dados.items():
            atual = f"{caminho}.{chave}" if caminho else chave
            if chave == "imagem_base64" and valor is not None and valor != "":
                yield atual, valor
            else:
                yield from _imagens(valor, atual)
    elif isinstance(dados, list):
        for indice, valor in enumerate(dados):
            yield from _imagens(valor, f"{caminho}[{indice}]")


def _substituir(dados: Any, referencias: dict[str, str], caminho: str = "") -> Any:
    if isinstance(dados, dict):
        novo = {}
        for chave, valor in dados.items():
            atual = f"{caminho}.{chave}" if caminho else chave
            if atual in referencias:
                novo["imagem_ativo"] = referencias[atual]
            else:
                novo[chave] = _substituir(valor, referencias, atual)
        return novo
    if isinstance(dados, list):
        return [_substituir(valor, referencias, f"{caminho}[{indice}]") for indice, valor in enumerate(dados)]
    return dados


def migrar_ativos(session: Session, armazenamento: ArmazenamentoObjetos, *, origem: str,
                  mesa_id: str, aplicar: bool = False) -> RelatorioAtivos:
    """Extrai imagens de fichas migradas; rejeições impedem a confirmação."""
    if aplicar:
        previa = migrar_ativos(session, armazenamento, origem=origem, mesa_id=mesa_id)
        if previa.rejeitados:
            raise AtivoInvalido(f"{len(previa.rejeitados)} imagem(ns) inválida(s); examine a prévia.")
    relatorio = RelatorioAtivos()
    assinaturas_previstas: set[tuple[str, str]] = set()
    procedencias = session.scalars(select(MigracaoLegadaRegistro).where(
        MigracaoLegadaRegistro.origem == origem,
        MigracaoLegadaRegistro.mesa_id == mesa_id,
        MigracaoLegadaRegistro.tipo_origem.in_(("fichas", "json:ficha")),
    )).all()
    for procedencia in procedencias:
        personagem = session.get(PersonagemRegistro, procedencia.id_destino)
        if personagem is None or personagem.mesa_id != mesa_id:
            raise AtivoInvalido(f"Destino ausente para {procedencia.tipo_origem}#{procedencia.id_origem}.")
        if aplicar:
            for ativo in session.scalars(select(AtivoMigradoRegistro).where(
                AtivoMigradoRegistro.personagem_id == personagem.id,
            )):
                conteudo = armazenamento.ler(ativo.bucket, ativo.caminho)
                if (conteudo is None or len(conteudo) != ativo.tamanho
                        or hashlib.sha256(conteudo).hexdigest() != ativo.sha256):
                    raise AtivoInvalido(f"Integridade do objeto falhou: {ativo.caminho}.")
        registros = [(personagem, "ficha")]
        registros += [(item, "dados") for item in session.scalars(select(ItemInventarioRegistro).where(
            ItemInventarioRegistro.personagem_id == personagem.id)).all()]
        registros += [(efeito, "conteudo") for efeito in session.scalars(select(EfeitoAplicadoRegistro).where(
            EfeitoAplicadoRegistro.personagem_id == personagem.id)).all()]
        for registro, atributo in registros:
            dados = getattr(registro, atributo)
            referencias = {}
            for campo, valor in _imagens(dados):
                relatorio.encontrados += 1
                identificador = f"{registro.__tablename__}#{registro.id}.{campo}"
                try:
                    if not isinstance(valor, str):
                        raise AtivoInvalido("Imagem Base64 precisa ser texto.")
                    conteudo, tipo, extensao = _decodificar(valor)
                except AtivoInvalido as erro:
                    relatorio.rejeitados.append({"origem": identificador, "erro": str(erro)})
                    continue
                assinatura = hashlib.sha256(conteudo).hexdigest()
                caminho = f"mesas/{mesa_id}/personagens/{personagem.id}/legado/{assinatura}.{extensao}"
                existente = session.scalar(select(AtivoMigradoRegistro).where(
                    AtivoMigradoRegistro.personagem_id == personagem.id,
                    AtivoMigradoRegistro.sha256 == assinatura,
                ))
                if existente and (existente.caminho != caminho or existente.tamanho != len(conteudo)
                             or existente.tipo != tipo):
                    raise AtivoInvalido(f"Metadados divergentes para {identificador}.")
                if aplicar:
                    armazenamento.gravar(BUCKET_PRIVADO, caminho, conteudo, tipo)
                    if hashlib.sha256(armazenamento.ler(BUCKET_PRIVADO, caminho) or b"").hexdigest() != assinatura:
                        raise AtivoInvalido(f"Integridade do objeto falhou: {identificador}.")
                    if existente is None:
                        session.add(AtivoMigradoRegistro(
                            id=uuid5(NAMESPACE_URL, f"cursed:ativo:{personagem.id}:{assinatura}").hex,
                            mesa_id=mesa_id, personagem_id=personagem.id, bucket=BUCKET_PRIVADO,
                            caminho=caminho, tipo=tipo, tamanho=len(conteudo), sha256=assinatura,
                            procedencias=[{"origem": origem, "campo": identificador}],
                        ))
                        session.flush()
                    else:
                        nova = {"origem": origem, "campo": identificador}
                        if nova not in existente.procedencias:
                            existente.procedencias = [*existente.procedencias, nova]
                chave_prevista = (personagem.id, assinatura)
                if existente is None and chave_prevista not in assinaturas_previstas:
                    relatorio.criados += 1
                else:
                    relatorio.reutilizados += 1
                assinaturas_previstas.add(chave_prevista)
                referencias[campo] = caminho
            if aplicar and referencias and not relatorio.rejeitados:
                setattr(registro, atributo, _substituir(dados, referencias))
    if aplicar and relatorio.rejeitados:
        raise AtivoInvalido(f"{len(relatorio.rejeitados)} imagem(ns) inválida(s); transação deve ser revertida.")
    if aplicar:
        session.flush()
    return relatorio


def _campos_imagem(dados: Any, caminho: str = ""):
    if isinstance(dados, dict):
        for chave, valor in dados.items():
            atual = f"{caminho}/{chave}" if caminho else chave
            if chave in {"imagem_base64", "imagem"} and valor is not None and valor != "":
                yield atual, valor
            else:
                yield from _campos_imagem(valor, atual)
    elif isinstance(dados, list):
        for indice, valor in enumerate(dados):
            yield from _campos_imagem(valor, f"{caminho}/{indice}")


def _ler_imagem_catalogo(valor: str, campo: str, icons_dir: Path) -> tuple[bytes, str, str]:
    if campo.endswith("imagem_base64") or valor.startswith("data:"):
        return _decodificar(valor)
    if Path(valor).name != valor:
        raise AtivoInvalido("Nome de ícone fora do diretório permitido.")
    candidatos = [item for item in icons_dir.rglob(valor) if item.is_file()]
    if len(candidatos) != 1:
        raise AtivoInvalido("Ícone ausente ou ambíguo no diretório de ativos.")
    return _decodificar(base64.b64encode(candidatos[0].read_bytes()).decode("ascii"))


def _origem_carta_da_imagem(fonte: str, identificador: str, campo: str) -> tuple[str, str]:
    """Localiza a habilidade aninhada em classes sem atribuir arte à classe."""
    if fonte != "json:classes.json":
        return fonte, identificador
    partes = campo.split("/")
    if len(partes) >= 2 and partes[0] == "habilidades" and partes[1].isdigit():
        return fonte + ":habilidade", f"{identificador}:base:{partes[1]}"
    if (len(partes) >= 4 and partes[0] == "arquetipos" and partes[1].isdigit()
            and partes[2] == "habilidades" and partes[3].isdigit()):
        return fonte + ":habilidade", f"{identificador}:{partes[1]}:{partes[3]}"
    return fonte, identificador


def migrar_ativos_catalogos(session: Session, armazenamento: ArmazenamentoObjetos, *,
                            origem: str, mesa_id: str, catalogos_dir: Path, icons_dir: Path,
                            origem_engine: Engine | None = None, aplicar: bool = False) -> RelatorioAtivos:
    """Extrai imagens de catálogos para o escopo privado do Narrador."""
    if not origem or len(origem) > 200 or session.get(MesaRegistro, mesa_id) is None:
        raise AtivoInvalido("Informe origem estável e mesa de destino existente.")
    fontes: list[tuple[str, str, str, bytes, str, str]] = []
    relatorio = RelatorioAtivos()

    def acrescentar(fonte: str, identificador: str, campo: str, valor: Any) -> None:
        relatorio.encontrados += 1
        try:
            if not isinstance(valor, str):
                raise AtivoInvalido("Imagem precisa ser texto Base64 ou nome de ícone.")
            conteudo, tipo, extensao = _ler_imagem_catalogo(valor, campo, icons_dir)
            fontes.append((fonte, identificador, campo, conteudo, tipo, extensao))
        except AtivoInvalido as erro:
            relatorio.rejeitados.append({"origem": f"{fonte}#{identificador}/{campo}", "erro": str(erro)})

    if not catalogos_dir.is_dir():
        relatorio.rejeitados.append({"origem": str(catalogos_dir), "erro": "Diretório de catálogos ausente."})
    for arquivo in sorted(catalogos_dir.glob("*.json")):
        try:
            dados = json.loads(arquivo.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as erro:
            relatorio.rejeitados.append({"origem": arquivo.name, "erro": str(erro)})
            continue
        if not isinstance(dados, list):
            relatorio.rejeitados.append({"origem": arquivo.name, "erro": "Catálogo não é lista JSON."})
            continue
        for indice, entrada in enumerate(dados):
            for campo, valor in _campos_imagem(entrada):
                acrescentar(f"json:{arquivo.name}", str(indice), campo, valor)
    if icons_dir.is_dir():
        for arquivo in sorted(icons_dir.rglob("*")):
            if arquivo.is_file() and arquivo.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
                relatorio.encontrados += 1
                try:
                    conteudo, tipo, extensao = _decodificar(base64.b64encode(arquivo.read_bytes()).decode("ascii"))
                    fontes.append(("arquivo:effects-icons", arquivo.relative_to(icons_dir).as_posix(),
                                   "arquivo", conteudo, tipo, extensao))
                except AtivoInvalido as erro:
                    relatorio.rejeitados.append({"origem": str(arquivo), "erro": str(erro)})
    if origem_engine is not None:
        with origem_engine.connect() as conexao:
            meta = MetaData()
            for nome in ("equipment_library", "effects_library"):
                if not origem_engine.dialect.has_table(conexao, nome):
                    continue
                tabela = Table(nome, meta, autoload_with=conexao)
                for linha in conexao.execute(select(tabela).order_by(tabela.c.id)).mappings():
                    for campo, valor in _campos_imagem(linha["dados"]):
                        acrescentar(f"sql:{nome}", str(linha["id"]), campo, valor)

    if aplicar and relatorio.rejeitados:
        raise AtivoInvalido(f"{len(relatorio.rejeitados)} imagem(ns) inválida(s); examine a prévia.")
    if aplicar:
        for ativo in session.scalars(select(AtivoCatalogoRegistro).where(
            AtivoCatalogoRegistro.mesa_id == mesa_id,
        )):
            conteudo = armazenamento.ler(ativo.bucket, ativo.caminho)
            if (conteudo is None or len(conteudo) != ativo.tamanho
                    or hashlib.sha256(conteudo).hexdigest() != ativo.sha256):
                raise AtivoInvalido(f"Integridade do objeto falhou: {ativo.caminho}.")
    previstos: set[str] = set()
    referencias_rascunhos: dict[str, list[str]] = {}
    for fonte, identificador, campo, conteudo, tipo, extensao in fontes:
        assinatura = hashlib.sha256(conteudo).hexdigest()
        caminho = f"mesas/{mesa_id}/narrador/legado/{assinatura}.{extensao}"
        existente = session.scalar(select(AtivoCatalogoRegistro).where(
            AtivoCatalogoRegistro.mesa_id == mesa_id, AtivoCatalogoRegistro.sha256 == assinatura))
        if existente and (existente.caminho != caminho or existente.tipo != tipo
                         or existente.tamanho != len(conteudo)):
            raise AtivoInvalido(f"Metadados divergentes para {fonte}#{identificador}.")
        if aplicar:
            armazenamento.gravar(BUCKET_PRIVADO, caminho, conteudo, tipo)
            if hashlib.sha256(armazenamento.ler(BUCKET_PRIVADO, caminho) or b"").hexdigest() != assinatura:
                raise AtivoInvalido(f"Integridade do objeto falhou: {fonte}#{identificador}.")
            procedencia = {"origem": origem, "fonte": fonte, "identificador": identificador, "campo": campo}
            if existente is None:
                session.add(AtivoCatalogoRegistro(
                    id=uuid5(NAMESPACE_URL, f"cursed:ativo:catalogo:{mesa_id}:{assinatura}").hex,
                    mesa_id=mesa_id, bucket=BUCKET_PRIVADO, caminho=caminho, tipo=tipo,
                    tamanho=len(conteudo), sha256=assinatura, procedencias=[procedencia],
                ))
                session.flush()
            elif procedencia not in existente.procedencias:
                existente.procedencias = [*existente.procedencias, procedencia]
        if existente is None and assinatura not in previstos:
            relatorio.criados += 1
        else:
            relatorio.reutilizados += 1
        previstos.add(assinatura)
        if aplicar:
            fonte_carta, identificador_carta = _origem_carta_da_imagem(fonte, identificador, campo)
            procedencia_carta = session.scalar(select(MigracaoLegadaRegistro).where(
                MigracaoLegadaRegistro.origem == origem,
                MigracaoLegadaRegistro.mesa_id == mesa_id,
                MigracaoLegadaRegistro.tipo_origem == fonte_carta,
                MigracaoLegadaRegistro.id_origem == identificador_carta,
                MigracaoLegadaRegistro.tipo_destino == "card_definitions",
            ))
            if procedencia_carta is not None:
                referencias_rascunhos.setdefault(procedencia_carta.id_destino, []).append(caminho)
    if aplicar:
        for carta_id, caminhos in referencias_rascunhos.items():
            definicao = session.get(CartaDefinicaoRegistro, carta_id)
            if definicao is None or definicao.mesa_id != mesa_id:
                raise AtivoInvalido(f"Rascunho de carta ausente: {carta_id}.")
            rascunho = dict(definicao.rascunho or {})
            conteudo = dict(rascunho.get("conteudo") or {})
            anteriores = conteudo.get("ativos_privados") or []
            conteudo["ativos_privados"] = list(dict.fromkeys([*anteriores, *caminhos]))
            definicao.rascunho = {**rascunho, "conteudo": conteudo}
    if aplicar:
        session.flush()
    return relatorio
