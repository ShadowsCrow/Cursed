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
class IntervaloAltura:
    """Altura em metros; ``maxima=None`` é sem limite superior (faixa do Colossal)."""

    minima: float
    maxima: float | None

    def contem(self, altura: float) -> bool:
        return altura >= self.minima and (self.maxima is None or altura <= self.maxima)

    def texto(self) -> str:
        metros = lambda v: f"{v:.2f}".replace(".", ",") + " m"  # noqa: E731
        return f"acima de {metros(self.minima)}" if self.maxima is None else f"de {metros(self.minima)} a {metros(self.maxima)}"


@dataclass(frozen=True)
class FaixaAltura:
    tamanho: str
    intervalo: IntervaloAltura


@dataclass(frozen=True)
class Raca:
    nome: str
    deslocamento: int | None
    tamanho: str | None
    habilidades: tuple[Habilidade, ...]
    # Intervalo típico de altura da raça (Criação de Personagem.md, Altura e Tamanho fora da média).
    altura: IntervaloAltura | None = None


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
    # Texto longo (ex.: História), com área de texto maior na ficha.
    longo: bool = False
    # Máximo de caracteres aceito pelo servidor; None = sem limite.
    limite: int | None = None


@dataclass(frozen=True)
class Listas:
    sexos: tuple[str, ...]
    alinhamentos: tuple[str, ...]
    pecados: tuple[Pecado, ...]
    campos_personalidade: tuple[CampoPersonalidade, ...]
    # Faixa de altura de cada Tamanho, do menor ao maior.
    faixas_de_altura: tuple[FaixaAltura, ...] = ()
    # Ícone do Resumo da ficha por nome de atributo, perícia ou grupo (aba-resumo-da-ficha, D5).
    icones_ficha: tuple[tuple[str, str], ...] = ()

    def faixa(self, tamanho: Any) -> FaixaAltura | None:
        return next((f for f in self.faixas_de_altura if chave(f.tamanho) == chave(tamanho)), None)

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


def _metros(valor: Any) -> float | None:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or valor <= 0:
        return None
    return float(valor)


def _intervalo(bruto: Any, *, arquivo: str, onde: str, sem_teto: bool) -> IntervaloAltura:
    if not isinstance(bruto, Mapping):
        raise CatalogoInvalido(arquivo, f"{onde}: precisa ser um objeto com 'minima' e 'maxima'.")
    minima, maxima_bruta = _metros(bruto.get("minima")), bruto.get("maxima")
    maxima = None if maxima_bruta is None and sem_teto else _metros(maxima_bruta)
    if minima is None or (maxima is None and not (sem_teto and maxima_bruta is None)):
        raise CatalogoInvalido(arquivo, f"{onde}: 'minima' e 'maxima' precisam ser alturas em metros maiores que zero.")
    if maxima is not None and maxima <= minima:
        raise CatalogoInvalido(arquivo, f"{onde}: a altura máxima precisa ser maior que a mínima.")
    return IntervaloAltura(minima, maxima)


def converter_faixas(brutas: list[Any], arquivo: str = "listas_ficha.json") -> tuple[FaixaAltura, ...]:
    """Faixas de altura por Tamanho: todos os Tamanhos, em ordem, contíguas; só o maior sem teto."""
    from cursed_platform.domain.grade import TAMANHOS

    if not brutas:
        return ()
    faixas: list[FaixaAltura] = []
    for indice, bruta in enumerate(brutas):
        onde = f"faixa de altura {indice + 1}"
        if not isinstance(bruta, Mapping):
            raise CatalogoInvalido(arquivo, f"{onde}: precisa ser um objeto.")
        faixas.append(FaixaAltura(_texto(bruta, "tamanho", arquivo=arquivo, onde=onde),
                                  _intervalo(bruta, arquivo=arquivo, onde=onde, sem_teto=indice == len(brutas) - 1)))
    if [chave(f.tamanho) for f in faixas] != list(TAMANHOS):
        raise CatalogoInvalido(arquivo, "'faixas_de_altura' precisa ter todos os Tamanhos, do Minúsculo ao Colossal, nessa ordem.")
    for anterior, seguinte in zip(faixas, faixas[1:]):
        if anterior.intervalo.maxima != seguinte.intervalo.minima:
            raise CatalogoInvalido(arquivo, f"'faixas_de_altura': a faixa de {seguinte.tamanho} precisa começar onde termina a de {anterior.tamanho}.")
    return tuple(faixas)


def validar_alturas(racas: tuple[Raca, ...], listas: Listas, arquivo: str = "racas.json") -> None:
    """A altura típica de cada raça cabe na faixa do Tamanho dela."""
    for raca in racas:
        faixa = listas.faixa(raca.tamanho) if raca.altura and raca.tamanho else None
        if raca.altura and faixa:
            dentro = raca.altura.minima >= faixa.intervalo.minima and (
                faixa.intervalo.maxima is None or (raca.altura.maxima or 0) <= faixa.intervalo.maxima)
            if not dentro:
                raise CatalogoInvalido(arquivo, f"{raca.nome}: a altura típica precisa caber na faixa do Tamanho {faixa.tamanho} ({faixa.intervalo.texto()}).")


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
        altura = bruta.get("altura")
        racas.append(Raca(
            nome=nome,
            deslocamento=deslocamento,
            tamanho=tamanho.strip() if isinstance(tamanho, str) and tamanho.strip() else None,
            habilidades=_habilidades(_lista(bruta, "habilidades", arquivo=arquivo, onde=nome), arquivo=arquivo, onde=nome),
            altura=None if altura is None else _intervalo(altura, arquivo=arquivo, onde=f"{nome}, altura", sem_teto=False),
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
        longo = bruto.get("longo", False)
        if not isinstance(longo, bool):
            raise CatalogoInvalido(arquivo, f"{onde}: 'longo' precisa ser verdadeiro ou falso.")
        limite = bruto.get("limite")
        if limite is not None and (isinstance(limite, bool) or not isinstance(limite, int) or limite < 1):
            raise CatalogoInvalido(arquivo, f"{onde}: 'limite' precisa ser um inteiro maior que zero.")
        campos.append(CampoPersonalidade(
            _texto(bruto, "chave", arquivo=arquivo, onde=onde),
            _texto(bruto, "rotulo", arquivo=arquivo, onde=onde),
            _texto(bruto, "dica", arquivo=arquivo, onde=onde, obrigatorio=False),
            longo,
            limite,
        ))
    _unicos([c.chave for c in campos], arquivo=arquivo, tipo="campos_personalidade: chave")
    faixas = converter_faixas(_lista(dados, "faixas_de_altura", arquivo=arquivo, onde="listas"), arquivo)
    return Listas(textos("sexos"), textos("alinhamentos"), tuple(pecados), tuple(campos), faixas,
                  converter_icones_ficha(dados.get("icones_ficha", {}), arquivo))


_NOME_DE_ICONE = re.compile(r"^[a-z][a-z0-9_]*$")


def converter_icones_ficha(bruto: Any, arquivo: str = "listas_ficha.json") -> tuple[tuple[str, str], ...]:
    """`{nome: ícone}`; o nome é o gravado na ficha (ex.: `Proposito`) e o ícone, um identificador."""
    if not isinstance(bruto, Mapping):
        raise CatalogoInvalido(arquivo, "'icones_ficha' precisa ser um objeto de nome para ícone.")
    pares: list[tuple[str, str]] = []
    for nome, icone in bruto.items():
        if not isinstance(nome, str) or not nome.strip():
            raise CatalogoInvalido(arquivo, "icones_ficha: o nome não pode ficar vazio.")
        if not isinstance(icone, str) or not _NOME_DE_ICONE.match(icone):
            raise CatalogoInvalido(arquivo, f"icones_ficha: o ícone de '{nome}' precisa ser um identificador em minúsculas (ex.: forca).")
        pares.append((nome.strip(), icone))
    _unicos([n for n, _ in pares], arquivo=arquivo, tipo="icones_ficha: nome")
    return tuple(pares)


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
    racas = converter_racas(dados["racas.json"])
    listas = converter_listas(dados["listas_ficha.json"])
    validar_alturas(racas, listas)
    return Catalogos(
        versao=resumo[:16],
        classes=converter_classes(dados["classes.json"]),
        racas=racas,
        efeitos_default=converter_efeitos(dados["efeitos_default.json"]),
        listas=listas,
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


def hash_de_texto(conteudo: bytes) -> str:
    """SHA-256 independente do fim de linha: o mesmo arquivo tem CRLF no Windows e LF no Linux."""
    return hashlib.sha256(conteudo.replace(b"\r\n", b"\n")).hexdigest()


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
            origem_alterada |= not atual.exists() or hash_de_texto(atual.read_bytes()) != esperado
        copia_alterada = False
        if not isinstance(registrado, dict) and not info.get("transformacoes"):
            copia_alterada = hash_de_texto((diretorio / arquivo).read_bytes()) != registrado
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
