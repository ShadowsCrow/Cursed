"""Catálogos do sistema: classes, raças, efeitos default e listas da ficha.

Os arquivos JSON de ``cursed_platform/catalogos/`` são a fonte de trabalho: o
conteúdo ainda está em desenvolvimento e é editado direto no arquivo. A
alteração vale sem reiniciar o servidor; um arquivo inválido mantém a última
versão válida e deixa o erro disponível para o Narrador. Valores ausentes não
são preenchidos por inferência.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import threading
from typing import Any, Mapping

from cursed_platform.domain.efeitos import validar_catalogo

DIRETORIO = Path(__file__).resolve().parent / "catalogos"
RAIZ_PROJETO = DIRETORIO.parents[1]
ARQUIVOS = ("classes.json", "racas.json", "efeitos_default.json", "listas_ficha.json")

_BASE = re.compile(r"^\s*(-?\d+)\s*\+\s*([^\W\d_]+)\s*$")
_ACENTOS = str.maketrans("áàâãäéèêëíìîïóòôõöúùûüç", "aaaaaeeeeiiiiooooouuuuc")


class CatalogoInvalido(ValueError):
    """O arquivo existe, mas o conteúdo não segue o formato esperado."""

    def __init__(self, arquivo: str, motivo: str) -> None:
        super().__init__(f"{arquivo}: {motivo}")
        self.arquivo = arquivo
        self.motivo = motivo


def chave(texto: Any) -> str:
    """Forma comparável de um nome: sem acentos, minúsculas e espaços simples."""
    return " ".join(str(texto or "").casefold().translate(_ACENTOS).split())


@dataclass(frozen=True)
class Base:
    """Base de classe no formato ``N + atributo`` (ex.: ``12 + vigor``)."""

    valor: int
    atributo: str  # chave normalizada: "vigor", "proposito"
    texto: str


@dataclass(frozen=True)
class Habilidade:
    nome: str
    descricao: str
    tipo: str
    # Campo "custo" do catálogo original, só como texto histórico: nunca preenche custos calculados.
    custo_legado: str | None = None


@dataclass(frozen=True)
class Arquetipo:
    nome: str
    conceito: str
    habilidades: tuple[Habilidade, ...]


@dataclass(frozen=True)
class Classe:
    nome: str
    cor: str | None
    pv: Base | None
    escala_pv: Base | None
    pp: Base | None
    escala_pp: Base | None
    habilidades: tuple[Habilidade, ...]
    arquetipos: tuple[Arquetipo, ...]

    def arquetipo(self, nome: Any) -> Arquetipo | None:
        return next((a for a in self.arquetipos if chave(a.nome) == chave(nome)), None)


@dataclass(frozen=True)
class Raca:
    nome: str
    deslocamento: int | None
    tamanho: str | None
    habilidades: tuple[Habilidade, ...]


@dataclass(frozen=True)
class Pecado:
    nome: str
    icone: str
    equivalentes: tuple[str, ...]


@dataclass(frozen=True)
class CampoPersonalidade:
    chave: str
    rotulo: str
    dica: str


@dataclass(frozen=True)
class Listas:
    sexos: tuple[str, ...]
    alinhamentos: tuple[str, ...]
    pecados: tuple[Pecado, ...]
    campos_personalidade: tuple[CampoPersonalidade, ...]

    def pecado(self, valor: Any) -> Pecado | None:
        """Pecado pelo nome ou por uma grafia equivalente (ex.: ``Ganancia``)."""
        alvo = str(valor or "").strip()
        return next((p for p in self.pecados if alvo == p.nome or alvo in p.equivalentes), None)


@dataclass(frozen=True)
class Catalogos:
    versao: str
    classes: tuple[Classe, ...]
    racas: tuple[Raca, ...]
    efeitos_default: tuple[dict[str, Any], ...]
    listas: Listas

    def classe(self, nome: Any) -> Classe | None:
        return next((c for c in self.classes if chave(c.nome) == chave(nome)), None)

    def raca(self, nome: Any) -> Raca | None:
        return next((r for r in self.racas if chave(r.nome) == chave(nome)), None)

    def efeitos_aplicaveis(self) -> list[dict[str, Any]]:
        """Efeitos default que podem ser listados e aplicados (sem os suspensos)."""
        return [dict(e) for e in self.efeitos_default if not e.get("suspenso")]


# ------------------------------------------------------------------ conversão


def converter_base(valor: Any, *, arquivo: str, onde: str) -> Base | None:
    """``"12 + vigor"`` -> Base(12, "vigor"). Ausente -> None; outro formato -> erro."""
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return None
    encontrado = _BASE.match(valor) if isinstance(valor, str) else None
    if encontrado is None:
        raise CatalogoInvalido(arquivo, f"{onde} precisa seguir o formato 'N + atributo' (recebido {valor!r}).")
    return Base(int(encontrado.group(1)), chave(encontrado.group(2)), valor.strip())


def eh_placeholder(habilidade: Mapping[str, Any]) -> bool:
    """Habilidade de exemplo do catálogo original (nome "nome", descrição "descricao")."""
    return chave(habilidade.get("nome")) == "nome" and chave(habilidade.get("descricao")) == "descricao"


def _texto(dados: Mapping[str, Any], campo: str, *, arquivo: str, onde: str, obrigatorio: bool = True) -> str:
    valor = dados.get(campo)
    if valor is None and not obrigatorio:
        return ""
    if not isinstance(valor, str) or (obrigatorio and not valor.strip()):
        raise CatalogoInvalido(arquivo, f"{onde}: o campo '{campo}' precisa ser um texto preenchido.")
    return valor.strip()


def _lista(dados: Mapping[str, Any], campo: str, *, arquivo: str, onde: str) -> list[Any]:
    valor = dados.get(campo, [])
    if not isinstance(valor, list):
        raise CatalogoInvalido(arquivo, f"{onde}: o campo '{campo}' precisa ser uma lista.")
    return valor


def _habilidades(brutas: list[Any], *, arquivo: str, onde: str) -> tuple[Habilidade, ...]:
    habilidades: list[Habilidade] = []
    vistas: set[str] = set()
    for indice, bruta in enumerate(brutas):
        if not isinstance(bruta, Mapping):
            raise CatalogoInvalido(arquivo, f"{onde}, habilidade {indice + 1}: precisa ser um objeto.")
        if eh_placeholder(bruta):
            continue
        local = f"{onde}, habilidade {indice + 1}"
        custo = bruta.get("custo")
        habilidade = Habilidade(
            _texto(bruta, "nome", arquivo=arquivo, onde=local),
            _texto(bruta, "descricao", arquivo=arquivo, onde=local),
            _texto(bruta, "tipo", arquivo=arquivo, onde=local, obrigatorio=False),
            str(custo).strip() if custo not in (None, "") else None,
        )
        if chave(habilidade.nome) in vistas:
            raise CatalogoInvalido(arquivo, f"{onde}: habilidade '{habilidade.nome}' repetida.")
        vistas.add(chave(habilidade.nome))
        habilidades.append(habilidade)
    return tuple(habilidades)


def _unicos(nomes: list[str], *, arquivo: str, tipo: str) -> None:
    vistos: set[str] = set()
    for nome in nomes:
        if chave(nome) in vistos:
            raise CatalogoInvalido(arquivo, f"{tipo} '{nome}' repetida.")
        vistos.add(chave(nome))


def converter_classes(dados: Any, arquivo: str = "classes.json") -> tuple[Classe, ...]:
    if not isinstance(dados, list):
        raise CatalogoInvalido(arquivo, "o catálogo de classes precisa ser uma lista.")
    classes: list[Classe] = []
    for indice, bruta in enumerate(dados):
        if not isinstance(bruta, Mapping):
            raise CatalogoInvalido(arquivo, f"classe {indice + 1}: precisa ser um objeto.")
        nome = _texto(bruta, "nome", arquivo=arquivo, onde=f"classe {indice + 1}")
        arquetipos: list[Arquetipo] = []
        for posicao, arq in enumerate(_lista(bruta, "arquetipos", arquivo=arquivo, onde=nome)):
            if not isinstance(arq, Mapping):
                raise CatalogoInvalido(arquivo, f"{nome}, arquétipo {posicao + 1}: precisa ser um objeto.")
            nome_arq = _texto(arq, "nome", arquivo=arquivo, onde=f"{nome}, arquétipo {posicao + 1}")
            onde = f"{nome} / {nome_arq}"
            arquetipos.append(Arquetipo(
                nome_arq,
                _texto(arq, "conceito", arquivo=arquivo, onde=onde, obrigatorio=False),
                _habilidades(_lista(arq, "habilidades", arquivo=arquivo, onde=onde), arquivo=arquivo, onde=onde),
            ))
        _unicos([a.nome for a in arquetipos], arquivo=arquivo, tipo=f"{nome}: arquétipo")
        cor = bruta.get("cor")
        classes.append(Classe(
            nome=nome,
            cor=cor.strip() if isinstance(cor, str) and cor.strip() else None,
            pv=converter_base(bruta.get("PV"), arquivo=arquivo, onde=f"{nome}, PV"),
            escala_pv=converter_base(bruta.get("Escala_PV"), arquivo=arquivo, onde=f"{nome}, Escala_PV"),
            pp=converter_base(bruta.get("PP"), arquivo=arquivo, onde=f"{nome}, PP"),
            escala_pp=converter_base(bruta.get("Escala_PP"), arquivo=arquivo, onde=f"{nome}, Escala_PP"),
            habilidades=_habilidades(_lista(bruta, "habilidades", arquivo=arquivo, onde=nome), arquivo=arquivo, onde=nome),
            arquetipos=tuple(arquetipos),
        ))
    _unicos([c.nome for c in classes], arquivo=arquivo, tipo="Classe")
    return tuple(classes)


def converter_racas(dados: Any, arquivo: str = "racas.json") -> tuple[Raca, ...]:
    if not isinstance(dados, list):
        raise CatalogoInvalido(arquivo, "o catálogo de raças precisa ser uma lista.")
    racas: list[Raca] = []
    for indice, bruta in enumerate(dados):
        if not isinstance(bruta, Mapping):
            raise CatalogoInvalido(arquivo, f"raça {indice + 1}: precisa ser um objeto.")
        nome = _texto(bruta, "nome", arquivo=arquivo, onde=f"raça {indice + 1}")
        deslocamento = bruta.get("deslocamento")
        if deslocamento is not None and (isinstance(deslocamento, bool) or not isinstance(deslocamento, int)):
            raise CatalogoInvalido(arquivo, f"{nome}: o deslocamento precisa ser um número inteiro.")
        tamanho = bruta.get("tamanho")
        racas.append(Raca(
            nome=nome,
            deslocamento=deslocamento,
            tamanho=tamanho.strip() if isinstance(tamanho, str) and tamanho.strip() else None,
            habilidades=_habilidades(_lista(bruta, "habilidades", arquivo=arquivo, onde=nome), arquivo=arquivo, onde=nome),
        ))
    _unicos([r.nome for r in racas], arquivo=arquivo, tipo="Raça")
    return tuple(racas)


def converter_efeitos(dados: Any, arquivo: str = "efeitos_default.json") -> tuple[dict[str, Any], ...]:
    try:
        efeitos = validar_catalogo(dados)
    except ValueError as erro:
        raise CatalogoInvalido(arquivo, str(erro)) from erro
    for efeito in efeitos:
        suspenso = efeito.get("suspenso")
        if suspenso is not None and not (isinstance(suspenso, Mapping) and str(suspenso.get("motivo") or "").strip()):
            raise CatalogoInvalido(arquivo, f"{efeito['associacao']}: 'suspenso' precisa ter um motivo.")
        grupo = efeito.get("grupo")
        if grupo is not None and not (isinstance(grupo, str) and grupo.strip()):
            raise CatalogoInvalido(arquivo, f"{efeito['associacao']}: 'grupo' precisa ser um texto preenchido.")
    return tuple(efeitos)


def converter_listas(dados: Any, arquivo: str = "listas_ficha.json") -> Listas:
    if not isinstance(dados, Mapping):
        raise CatalogoInvalido(arquivo, "as listas da ficha precisam ser um objeto.")

    def textos(campo: str) -> tuple[str, ...]:
        valores = _lista(dados, campo, arquivo=arquivo, onde="listas")
        if not valores or not all(isinstance(v, str) and v.strip() for v in valores):
            raise CatalogoInvalido(arquivo, f"'{campo}' precisa ser uma lista de textos preenchidos.")
        _unicos(valores, arquivo=arquivo, tipo=f"{campo}: opção")
        return tuple(v.strip() for v in valores)

    pecados: list[Pecado] = []
    for indice, bruto in enumerate(_lista(dados, "pecados", arquivo=arquivo, onde="listas")):
        if not isinstance(bruto, Mapping):
            raise CatalogoInvalido(arquivo, f"pecado {indice + 1}: precisa ser um objeto.")
        onde = f"pecado {indice + 1}"
        equivalentes = _lista(bruto, "equivalentes", arquivo=arquivo, onde=onde)
        if not all(isinstance(e, str) and e.strip() for e in equivalentes):
            raise CatalogoInvalido(arquivo, f"{onde}: 'equivalentes' precisa ser uma lista de textos.")
        pecados.append(Pecado(
            _texto(bruto, "nome", arquivo=arquivo, onde=onde),
            _texto(bruto, "icone", arquivo=arquivo, onde=onde, obrigatorio=False),
            tuple(e.strip() for e in equivalentes),
        ))
    if not pecados:
        raise CatalogoInvalido(arquivo, "'pecados' precisa ter ao menos uma opção.")
    _unicos([p.nome for p in pecados], arquivo=arquivo, tipo="pecados: opção")

    campos: list[CampoPersonalidade] = []
    for indice, bruto in enumerate(_lista(dados, "campos_personalidade", arquivo=arquivo, onde="listas")):
        if not isinstance(bruto, Mapping):
            raise CatalogoInvalido(arquivo, f"campo de personalidade {indice + 1}: precisa ser um objeto.")
        onde = f"campo de personalidade {indice + 1}"
        campos.append(CampoPersonalidade(
            _texto(bruto, "chave", arquivo=arquivo, onde=onde),
            _texto(bruto, "rotulo", arquivo=arquivo, onde=onde),
            _texto(bruto, "dica", arquivo=arquivo, onde=onde, obrigatorio=False),
        ))
    _unicos([c.chave for c in campos], arquivo=arquivo, tipo="campos_personalidade: chave")
    return Listas(textos("sexos"), textos("alinhamentos"), tuple(pecados), tuple(campos))


def ler(diretorio: Path = DIRETORIO) -> Catalogos:
    """Lê e valida os quatro arquivos. Levanta ``CatalogoInvalido`` com o arquivo e o motivo."""
    brutos: dict[str, bytes] = {}
    dados: dict[str, Any] = {}
    for nome in ARQUIVOS:
        try:
            brutos[nome] = (diretorio / nome).read_bytes()
        except OSError as erro:
            raise CatalogoInvalido(nome, f"não foi possível ler o arquivo ({erro.strerror or erro}).") from erro
        try:
            dados[nome] = json.loads(brutos[nome].decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as erro:
            raise CatalogoInvalido(nome, f"JSON inválido ({erro}).") from erro
    resumo = hashlib.sha256(b"".join(hashlib.sha256(brutos[n]).digest() for n in ARQUIVOS)).hexdigest()
    return Catalogos(
        versao=resumo[:16],
        classes=converter_classes(dados["classes.json"]),
        racas=converter_racas(dados["racas.json"]),
        efeitos_default=converter_efeitos(dados["efeitos_default.json"]),
        listas=converter_listas(dados["listas_ficha.json"]),
    )


# ------------------------------------------------------------------ recarga


@dataclass(frozen=True)
class ErroCatalogo:
    arquivo: str
    motivo: str
    em: datetime


@dataclass
class Carregador:
    """Guarda a última versão válida e relê os arquivos quando mudam."""

    diretorio: Path = DIRETORIO
    _atual: Catalogos | None = field(default=None, init=False)
    _assinatura: tuple[Any, ...] | None = field(default=None, init=False)
    _erro: ErroCatalogo | None = field(default=None, init=False)
    _trava: threading.Lock = field(default_factory=threading.Lock, init=False)

    def _assinatura_atual(self) -> tuple[Any, ...]:
        partes: list[Any] = []
        for nome in ARQUIVOS:
            try:
                info = (self.diretorio / nome).stat()
                partes.append((nome, info.st_mtime_ns, info.st_size))
            except OSError:
                partes.append((nome, None, None))
        return tuple(partes)

    def obter(self) -> Catalogos:
        """Catálogo atual. Sem nenhuma versão válida, levanta ``CatalogoInvalido``."""
        with self._trava:
            assinatura = self._assinatura_atual()
            if assinatura != self._assinatura:
                self._assinatura = assinatura
                try:
                    self._atual = ler(self.diretorio)
                    self._erro = None
                except CatalogoInvalido as erro:
                    self._erro = ErroCatalogo(erro.arquivo, erro.motivo, datetime.now(timezone.utc))
                    if self._atual is None:
                        raise
            if self._atual is None:
                assert self._erro is not None
                raise CatalogoInvalido(self._erro.arquivo, self._erro.motivo)
            return self._atual

    def erro(self) -> ErroCatalogo | None:
        """Último erro de recarga, enquanto a versão em uso for a anterior."""
        try:
            self.obter()
        except CatalogoInvalido:
            pass
        return self._erro


CARREGADOR = Carregador()


def obter() -> Catalogos:
    return CARREGADOR.obter()


# ------------------------------------------------------------------ procedência


@dataclass(frozen=True)
class Procedencia:
    arquivo: str
    origem: str
    origem_alterada: bool
    copia_alterada: bool


def relatorio_procedencia(diretorio: Path = DIRETORIO, raiz: Path = RAIZ_PROJETO) -> list[Procedencia]:
    """Informa se a origem mudou desde a cópia e se a cópia foi editada. Nunca bloqueia."""
    manifesto = json.loads((diretorio / "manifesto.json").read_text(encoding="utf-8"))
    relatorio: list[Procedencia] = []
    for arquivo, info in manifesto["arquivos"].items():
        registrado = info["sha256_origem"]
        origens = registrado if isinstance(registrado, dict) else {info["origem"]: registrado}
        origem_alterada = False
        for caminho, esperado in origens.items():
            atual = raiz / caminho
            origem_alterada |= not atual.exists() or hashlib.sha256(atual.read_bytes()).hexdigest() != esperado
        copia_alterada = False
        if not isinstance(registrado, dict) and not info.get("transformacoes"):
            copia_alterada = hashlib.sha256((diretorio / arquivo).read_bytes()).hexdigest() != registrado
        relatorio.append(Procedencia(arquivo, info["origem"], origem_alterada, copia_alterada))
    return relatorio


if __name__ == "__main__":  # python -m cursed_platform.catalogos
    for item in relatorio_procedencia():
        estado = []
        if item.origem_alterada:
            estado.append("a origem mudou desde a cópia")
        if item.copia_alterada:
            estado.append("a cópia foi editada")
        print(f"{item.arquivo}: {'; '.join(estado) or 'igual à cópia registrada'} ({item.origem})")
