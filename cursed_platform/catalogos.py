"""Catálogos do sistema: classes, raças, efeitos default, listas da ficha e itens.

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
ARQUIVOS = ("classes.json", "racas.json", "efeitos_default.json", "listas_ficha.json", "itens.json")

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
    # Custo de Aprendizado, Descansos Mínimos, Potência de Uso e Custo de Uso, com os nomes da carta; ausentes
    # ficam indefinidos (cartas-do-catalogo-somente-leitura, D2).
    custos: tuple[tuple[str, int], ...] = ()


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
    # Máximo de caracteres aceito pelo servidor; None = sem limite. Nos traços, o limite de cada traço.
    limite: int | None = None
    # "texto" ou "tracos" (lista de palavras curtas, reformular-personalidade-da-ficha, D3).
    tipo: str = "texto"
    # Quantidade máxima de traços; só no tipo "tracos".
    maximo: int | None = None
    # Ícone da linha na aba Personalidade (um de ICONES_PERSONALIDADE).
    icone: str | None = None


@dataclass(frozen=True)
class GrupoPersonalidade:
    """Quadro da aba Personalidade: emblema, títulos e os campos na ordem de exibição."""
    id: str
    titulo: str
    subtitulo: str
    emblema: str
    campos: tuple[str, ...]


@dataclass(frozen=True)
class TopoPersonalidade:
    """Campos do topo da aba Personalidade: a citação e as etiquetas."""
    citacao: str | None = None
    etiquetas: str | None = None


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
    # Arrumação da aba Personalidade (reformular-personalidade-da-ficha, D2); vazia quando o JSON não a traz.
    personalidade_topo: TopoPersonalidade | None = None
    grupos_personalidade: tuple[GrupoPersonalidade, ...] = ()
    # Ícone dos campos que não estão em `campos_personalidade` (alinhamento e pecado).
    icones_personalidade: tuple[tuple[str, str], ...] = ()

    def campo_personalidade(self, chave_campo: str) -> CampoPersonalidade | None:
        return next((c for c in self.campos_personalidade if c.chave == chave_campo), None)

    def faixa(self, tamanho: Any) -> FaixaAltura | None:
        return next((f for f in self.faixas_de_altura if chave(f.tamanho) == chave(tamanho)), None)

    def pecado(self, valor: Any) -> Pecado | None:
        """Pecado pelo nome ou por uma grafia equivalente (ex.: ``Ganancia``)."""
        alvo = str(valor or "").strip()
        return next((p for p in self.pecados if alvo == p.nome or alvo in p.equivalentes), None)


@dataclass(frozen=True)
class Raridade:
    id: str
    rotulo: str
    cor: str


@dataclass(frozen=True)
class CategoriaItem:
    id: str
    rotulo: str
    icone: str
    # Subtipos que caem nesta categoria sem escolha (ex.: uma_mao e duas_maos em Armas).
    subtipos: tuple[str, ...] = ()
    # Categoria que o Narrador escolhe para itens do tipo Outros.
    escolha_em_outros: bool = False
    # Categoria dos itens Outros sem escolha (itens antigos).
    padrao_outros: bool = False


TIPOS_DE_CAMPO = ("inteiro", "texto", "escolha", "escolhas", "etiquetas")


@dataclass(frozen=True)
class CampoItem:
    """Campo de um item, guardado em ``dados[id]`` (simplificar-criacao-de-cartas, D6)."""

    id: str
    rotulo: str
    tipo: str
    icone: str
    lista: str | None = None
    exemplo: str | None = None
    unidade: str | None = None


@dataclass(frozen=True)
class CampoDoSubtipo:
    campo: str
    # Lista de sugestões, só em campos de etiquetas (ex.: propriedades das armas).
    sugestoes: str | None = None


@dataclass(frozen=True)
class CatalogoItens:
    """Raridades e categorias de item (reformular-visual-da-ficha, D6), sem efeito mecânico, e os campos
    de cada subtipo, tirados de Equipamentos.md (simplificar-criacao-de-cartas, D6)."""

    raridades: tuple[Raridade, ...]
    categorias: tuple[CategoriaItem, ...]
    listas: Mapping[str, tuple[str, ...]] = field(default_factory=dict)
    campos: Mapping[str, CampoItem] = field(default_factory=dict)
    campos_por_subtipo: Mapping[str, tuple[CampoDoSubtipo, ...]] = field(default_factory=dict)

    def campos_do_subtipo(self, subtipo: Any) -> tuple[CampoItem, ...]:
        return tuple(self.campos[c.campo] for c in self.campos_por_subtipo.get(subtipo, ()))

    def problemas_dos_dados(self, subtipo: Any, dados: Mapping[str, Any]) -> list[tuple[str, str]]:
        """``(chave, mensagem)`` para cada valor de ``dados`` que o subtipo não declara ou que não segue o
        tipo do campo. Valores vazios (``None``, texto vazio, lista vazia) não contam."""
        declarados = {c.id: c for c in self.campos_do_subtipo(subtipo)}
        problemas: list[tuple[str, str]] = []
        for chave_dado, valor in dados.items():
            if valor is None or valor == "" or valor == []:
                continue
            campo = declarados.get(chave_dado)
            if campo is None:
                problemas.append((chave_dado, "Não se aplica a este tipo de item."))
                continue
            mensagem = _problema_do_valor(campo, valor, self.listas)
            if mensagem:
                problemas.append((chave_dado, mensagem))
        return problemas

    @property
    def raridade_padrao(self) -> str:
        return self.raridades[0].id

    @property
    def categoria_padrao_outros(self) -> str:
        return next(c.id for c in self.categorias if c.padrao_outros)

    def raridade(self, valor: Any) -> Raridade | None:
        return next((r for r in self.raridades if r.id == valor), None)

    def escolhas_em_outros(self) -> tuple[str, ...]:
        return tuple(c.id for c in self.categorias if c.escolha_em_outros)

    def categoria_do_subtipo(self, subtipo: Any) -> str | None:
        """Categoria derivada do subtipo; ``None`` para ``outro``, que depende da escolha do Narrador."""
        return next((c.id for c in self.categorias if subtipo in c.subtipos), None)

    def categoria_efetiva(self, subtipo: Any, escolhida: Any, tipo: Any = None) -> str:
        """Categoria do item: pelo subtipo; em Outros, a escolhida (ou a padrão). Itens antigos sem
        subtipo usam o tipo (arma, armadura) quando ele basta."""
        derivada = self.categoria_do_subtipo(subtipo)
        if derivada is None and subtipo is None and tipo in ("arma", "armadura"):
            derivada = self.categoria_do_subtipo("uma_mao" if tipo == "arma" else "peitoral")
        if derivada is not None:
            return derivada
        return escolhida if escolhida in self.escolhas_em_outros() else self.categoria_padrao_outros

    def descritivos(self, subtipo: Any, tipo: Any, dados: Mapping[str, Any] | None) -> dict[str, Any]:
        """Raridade, categoria e descrição de um item do inventário, com os padrões aplicados."""
        dados = dados or {}
        raridade = dados.get("raridade")
        descricao = dados.get("descricao")
        return {
            "raridade": raridade if self.raridade(raridade) else self.raridade_padrao,
            "categoria": self.categoria_efetiva(subtipo, dados.get("categoria"), tipo),
            "descricao": descricao.strip() if isinstance(descricao, str) and descricao.strip() else None,
        }


@dataclass(frozen=True)
class Catalogos:
    versao: str
    classes: tuple[Classe, ...]
    racas: tuple[Raca, ...]
    efeitos_default: tuple[dict[str, Any], ...]
    listas: Listas
    itens: CatalogoItens

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


CUSTOS_DE_HABILIDADE = ("custo_aprendizado", "descansos_minimos", "potencia_uso", "custo_uso")


def _custos(bruta: Mapping[str, Any], *, arquivo: str, onde: str) -> tuple[tuple[str, int], ...]:
    custos = []
    for campo in CUSTOS_DE_HABILIDADE:
        valor = bruta.get(campo)
        if valor is None:
            continue
        if not isinstance(valor, int) or isinstance(valor, bool) or valor < 0:
            raise CatalogoInvalido(arquivo, f"{onde}: o campo '{campo}' precisa ser um número inteiro de 0 para cima.")
        custos.append((campo, valor))
    return tuple(custos)


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
            _custos(bruta, arquivo=arquivo, onde=local),
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
        if limite is not None and not _inteiro_positivo(limite):
            raise CatalogoInvalido(arquivo, f"{onde}: 'limite' precisa ser um inteiro maior que zero.")
        chave_campo = _texto(bruto, "chave", arquivo=arquivo, onde=onde)
        onde = f"campo de personalidade '{chave_campo}'"
        if chave_campo in CHAVES_RESERVADAS_PERSONALIDADE:
            raise CatalogoInvalido(arquivo, f"{onde}: a chave é reservada ao {chave_campo}, que tem lista própria.")
        tipo = bruto.get("tipo", "texto")
        if tipo not in TIPOS_CAMPO_PERSONALIDADE:
            raise CatalogoInvalido(arquivo, f"{onde}: 'tipo' precisa ser {' ou '.join(TIPOS_CAMPO_PERSONALIDADE)}.")
        maximo = bruto.get("maximo")
        if tipo == "tracos":
            if not _inteiro_positivo(maximo):
                raise CatalogoInvalido(arquivo, f"{onde}: 'maximo' (quantidade de traços) precisa ser um inteiro maior que zero.")
            if longo:
                raise CatalogoInvalido(arquivo, f"{onde}: traços não podem ser um campo longo.")
        elif maximo is not None:
            raise CatalogoInvalido(arquivo, f"{onde}: 'maximo' só vale para o tipo tracos.")
        icone = bruto.get("icone")
        if icone is not None and icone not in ICONES_PERSONALIDADE:
            raise CatalogoInvalido(arquivo, f"{onde}: o ícone '{icone}' não existe (opções: {', '.join(ICONES_PERSONALIDADE)}).")
        campos.append(CampoPersonalidade(
            chave_campo,
            _texto(bruto, "rotulo", arquivo=arquivo, onde=onde),
            _texto(bruto, "dica", arquivo=arquivo, onde=onde, obrigatorio=False),
            longo,
            limite,
            tipo,
            maximo if tipo == "tracos" else None,
            icone,
        ))
    _unicos([c.chave for c in campos], arquivo=arquivo, tipo="campos_personalidade: chave")
    faixas = converter_faixas(_lista(dados, "faixas_de_altura", arquivo=arquivo, onde="listas"), arquivo)
    topo, grupos, icones = converter_arrumacao_personalidade(dados, tuple(campos), arquivo)
    return Listas(textos("sexos"), textos("alinhamentos"), tuple(pecados), tuple(campos), faixas,
                  converter_icones_ficha(dados.get("icones_ficha", {}), arquivo), topo, grupos, icones)


# Aba Personalidade (reformular-personalidade-da-ficha, D2). Os nomes são os desenhos que a tela conhece: um nome
# novo aqui precisa de um desenho no frontend (`personalidade/icones.tsx`), e o teste confere as duas listas.
ICONES_PERSONALIDADE = (
    "rosa_dos_ventos", "lua_solar", "livro_fechado", "balanca", "livro_aberto", "olho", "louros",
    "aranha", "caveira", "espadas", "mao", "ampulheta", "estrela", "lua_estrela",
)
# Campos com lista própria (fora de `campos_personalidade`) que também entram nos grupos.
CHAVES_RESERVADAS_PERSONALIDADE = ("alinhamento", "pecado")
TIPOS_CAMPO_PERSONALIDADE = ("texto", "tracos")


def _inteiro_positivo(valor: Any) -> bool:
    return isinstance(valor, int) and not isinstance(valor, bool) and valor >= 1


def converter_arrumacao_personalidade(
    dados: Mapping[str, Any], campos: tuple[CampoPersonalidade, ...], arquivo: str = "listas_ficha.json",
) -> tuple[TopoPersonalidade | None, tuple[GrupoPersonalidade, ...], tuple[tuple[str, str], ...]]:
    """Topo, grupos e ícones da aba Personalidade. Sem topo e sem grupos no JSON, não há arrumação a validar.

    Com eles, todo campo curto (e o alinhamento e o pecado) fica em exatamente um lugar, e os longos ficam fora
    dos grupos, no quadro próprio.
    """
    por_chave = {c.chave: c for c in campos}
    icones_brutos = dados.get("icones_personalidade", {})
    if not isinstance(icones_brutos, Mapping):
        raise CatalogoInvalido(arquivo, "'icones_personalidade' precisa ser um objeto de campo para ícone.")
    icones: list[tuple[str, str]] = []
    for nome, icone in icones_brutos.items():
        if nome not in CHAVES_RESERVADAS_PERSONALIDADE and nome not in por_chave:
            raise CatalogoInvalido(arquivo, f"icones_personalidade: o campo '{nome}' não existe.")
        if icone not in ICONES_PERSONALIDADE:
            raise CatalogoInvalido(arquivo, f"icones_personalidade: o ícone '{icone}' de '{nome}' não existe.")
        icones.append((nome, icone))

    topo_bruto = dados.get("personalidade_topo")
    grupos_brutos = dados.get("grupos_personalidade")
    if topo_bruto is None and grupos_brutos is None:
        return None, (), tuple(icones)

    lugar: dict[str, str] = {}

    def colocar(nome: Any, onde: str) -> str:
        if not isinstance(nome, str) or not nome.strip():
            raise CatalogoInvalido(arquivo, f"{onde}: o campo precisa ser a chave de um campo de personalidade.")
        if nome not in CHAVES_RESERVADAS_PERSONALIDADE and nome not in por_chave:
            raise CatalogoInvalido(arquivo, f"{onde}: o campo '{nome}' não existe.")
        if nome in lugar:
            raise CatalogoInvalido(arquivo, f"o campo '{nome}' aparece em mais de um lugar ({lugar[nome]} e {onde}).")
        lugar[nome] = onde
        return nome

    topo = TopoPersonalidade()
    if topo_bruto is not None:
        if not isinstance(topo_bruto, Mapping) or set(topo_bruto) - {"citacao", "etiquetas"}:
            raise CatalogoInvalido(arquivo, "'personalidade_topo' aceita só 'citacao' e 'etiquetas'.")
        citacao = topo_bruto.get("citacao")
        etiquetas = topo_bruto.get("etiquetas")
        if citacao is not None:
            colocar(citacao, "a citação do topo")
            campo = por_chave.get(citacao)
            if not campo or campo.tipo != "texto" or campo.longo:
                raise CatalogoInvalido(arquivo, f"a citação do topo precisa ser um campo de texto curto, e '{citacao}' não é.")
        if etiquetas is not None:
            colocar(etiquetas, "as etiquetas do topo")
            campo = por_chave.get(etiquetas)
            if not campo or campo.tipo != "tracos":
                raise CatalogoInvalido(arquivo, f"as etiquetas do topo precisam ser um campo de traços, e '{etiquetas}' não é.")
        topo = TopoPersonalidade(citacao, etiquetas)

    if grupos_brutos is None:
        grupos_brutos = []
    if not isinstance(grupos_brutos, list):
        raise CatalogoInvalido(arquivo, "'grupos_personalidade' precisa ser uma lista.")
    grupos: list[GrupoPersonalidade] = []
    for indice, bruto in enumerate(grupos_brutos):
        onde = f"grupo de personalidade {indice + 1}"
        if not isinstance(bruto, Mapping):
            raise CatalogoInvalido(arquivo, f"{onde}: precisa ser um objeto.")
        ident = bruto.get("id")
        if not isinstance(ident, str) or not _ID.match(ident):
            raise CatalogoInvalido(arquivo, f"{onde}: 'id' precisa ser um identificador em minúsculas (ex.: essencia).")
        onde = f"grupo '{ident}'"
        emblema = bruto.get("emblema")
        if emblema not in ICONES_PERSONALIDADE:
            raise CatalogoInvalido(arquivo, f"{onde}: o emblema '{emblema}' não existe.")
        nomes = _lista(bruto, "campos", arquivo=arquivo, onde=onde)
        if not nomes:
            raise CatalogoInvalido(arquivo, f"{onde}: precisa ter ao menos um campo.")
        for nome in nomes:
            colocar(nome, onde)
            if nome in por_chave and (por_chave[nome].longo or por_chave[nome].tipo != "texto"):
                raise CatalogoInvalido(arquivo, f"{onde}: o campo '{nome}' não cabe numa linha (é longo ou de traços).")
        grupos.append(GrupoPersonalidade(
            ident, _texto(bruto, "titulo", arquivo=arquivo, onde=onde),
            _texto(bruto, "subtitulo", arquivo=arquivo, onde=onde, obrigatorio=False),
            emblema, tuple(nomes),
        ))
    _unicos([g.id for g in grupos], arquivo=arquivo, tipo="grupos_personalidade: id")

    faltando = [nome for nome in (*CHAVES_RESERVADAS_PERSONALIDADE, *(c.chave for c in campos if not c.longo))
                if nome not in lugar]
    if faltando:
        raise CatalogoInvalido(arquivo, f"campos de personalidade sem lugar na aba (nem num grupo nem no topo): {', '.join(faltando)}.")
    return topo, tuple(grupos), tuple(icones)


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


_ID = re.compile(r"^[a-z][a-z0-9_]*$")
_COR = re.compile(r"^#[0-9A-Fa-f]{6}$")


def converter_itens(dados: Any, arquivo: str = "itens.json") -> CatalogoItens:
    """Raridades e categorias. Todo subtipo que não seja ``outro`` cai em exatamente uma categoria."""
    from cursed_platform.domain.grade import SUBTIPOS

    if not isinstance(dados, Mapping):
        raise CatalogoInvalido(arquivo, "o catálogo de itens precisa ser um objeto.")

    def identificador(bruto: Mapping[str, Any], onde: str) -> str:
        valor = bruto.get("id")
        if not isinstance(valor, str) or not _ID.match(valor):
            raise CatalogoInvalido(arquivo, f"{onde}: 'id' precisa ser um identificador em minúsculas (ex.: itens_de_missao).")
        return valor

    raridades: list[Raridade] = []
    for indice, bruto in enumerate(_lista(dados, "raridades", arquivo=arquivo, onde="itens")):
        onde = f"raridade {indice + 1}"
        if not isinstance(bruto, Mapping):
            raise CatalogoInvalido(arquivo, f"{onde}: precisa ser um objeto.")
        cor = bruto.get("cor")
        if not isinstance(cor, str) or not _COR.match(cor):
            raise CatalogoInvalido(arquivo, f"{onde}: 'cor' precisa ser hexadecimal, como #1F4F8F.")
        raridades.append(Raridade(identificador(bruto, onde), _texto(bruto, "rotulo", arquivo=arquivo, onde=onde), cor.upper()))
    if not raridades:
        raise CatalogoInvalido(arquivo, "'raridades' precisa ter ao menos uma opção; a primeira é a padrão.")
    _unicos([r.id for r in raridades], arquivo=arquivo, tipo="raridades: id")

    categorias: list[CategoriaItem] = []
    for indice, bruto in enumerate(_lista(dados, "categorias", arquivo=arquivo, onde="itens")):
        onde = f"categoria {indice + 1}"
        if not isinstance(bruto, Mapping):
            raise CatalogoInvalido(arquivo, f"{onde}: precisa ser um objeto.")
        subtipos = _lista(bruto, "subtipos", arquivo=arquivo, onde=onde)
        desconhecidos = [s for s in subtipos if s not in SUBTIPOS or s == "outro"]
        if desconhecidos:
            raise CatalogoInvalido(arquivo, f"{onde}: subtipo inválido {desconhecidos[0]!r}.")
        escolha = bruto.get("escolha_em_outros", False)
        padrao = bruto.get("padrao_outros", False)
        if not isinstance(escolha, bool) or not isinstance(padrao, bool):
            raise CatalogoInvalido(arquivo, f"{onde}: 'escolha_em_outros' e 'padrao_outros' precisam ser verdadeiro ou falso.")
        if bool(subtipos) == escolha:
            raise CatalogoInvalido(arquivo, f"{onde}: a categoria precisa ter subtipos ou ser escolha em Outros, e não os dois.")
        if padrao and not escolha:
            raise CatalogoInvalido(arquivo, f"{onde}: só uma escolha em Outros pode ser a padrão.")
        icone = bruto.get("icone")
        if not isinstance(icone, str) or not _ID.match(icone):
            raise CatalogoInvalido(arquivo, f"{onde}: 'icone' precisa ser um identificador em minúsculas.")
        categorias.append(CategoriaItem(identificador(bruto, onde), _texto(bruto, "rotulo", arquivo=arquivo, onde=onde),
                                        icone, tuple(subtipos), escolha, padrao))
    _unicos([c.id for c in categorias], arquivo=arquivo, tipo="categorias: id")
    for subtipo in SUBTIPOS:
        if subtipo == "outro":
            continue
        donas = [c.id for c in categorias if subtipo in c.subtipos]
        if len(donas) != 1:
            raise CatalogoInvalido(arquivo, f"o subtipo '{subtipo}' precisa estar em exatamente uma categoria (está em {len(donas)}).")
    if sum(c.padrao_outros for c in categorias) != 1:
        raise CatalogoInvalido(arquivo, "exatamente uma categoria precisa ser 'padrao_outros'.")
    listas, campos, por_subtipo = _campos_dos_itens(dados, arquivo)
    return CatalogoItens(tuple(raridades), tuple(categorias), listas, campos, por_subtipo)


def _problema_do_valor(campo: CampoItem, valor: Any, listas: Mapping[str, tuple[str, ...]]) -> str | None:
    if campo.tipo == "inteiro":
        if isinstance(valor, bool) or not isinstance(valor, int) or valor < 0:
            return "Use um número inteiro, zero ou maior."
        return None
    if campo.tipo == "texto":
        return None if isinstance(valor, str) else "Use um texto."
    escolhas = listas.get(campo.lista or "", ())
    if campo.tipo == "escolha":
        return None if valor in escolhas else f"Escolha uma das opções de {campo.rotulo}."
    if not isinstance(valor, list) or any(not isinstance(v, str) or not v.strip() for v in valor):
        return "Use uma lista de textos."
    if campo.tipo == "escolhas" and any(v not in escolhas for v in valor):
        return f"Escolha entre as opções de {campo.rotulo}."
    return None


def _campos_dos_itens(dados: Mapping[str, Any], arquivo: str) -> tuple[
    dict[str, tuple[str, ...]], dict[str, CampoItem], dict[str, tuple[CampoDoSubtipo, ...]],
]:
    """Listas, campos e campos por subtipo. Toda referência precisa existir, e todo subtipo criável tem lista."""
    from cursed_platform.domain.grade import SUBTIPOS

    listas: dict[str, tuple[str, ...]] = {}
    brutas = dados.get("listas", {})
    if not isinstance(brutas, Mapping):
        raise CatalogoInvalido(arquivo, "'listas' precisa ser um objeto.")
    for nome, valores in brutas.items():
        if not _ID.match(nome) or not isinstance(valores, list) or not valores \
                or any(not isinstance(v, str) or not v.strip() for v in valores):
            raise CatalogoInvalido(arquivo, f"lista '{nome}': precisa ter um id em minúsculas e ao menos um texto.")
        _unicos(list(valores), arquivo=arquivo, tipo=f"lista {nome}")
        listas[nome] = tuple(valores)

    campos: dict[str, CampoItem] = {}
    brutos = dados.get("campos", {})
    if not isinstance(brutos, Mapping):
        raise CatalogoInvalido(arquivo, "'campos' precisa ser um objeto.")
    for nome, bruto in brutos.items():
        onde = f"campo '{nome}'"
        if not _ID.match(nome) or not isinstance(bruto, Mapping):
            raise CatalogoInvalido(arquivo, f"{onde}: precisa ter um id em minúsculas e ser um objeto.")
        tipo = bruto.get("tipo")
        if tipo not in TIPOS_DE_CAMPO:
            raise CatalogoInvalido(arquivo, f"{onde}: 'tipo' precisa ser um de {', '.join(TIPOS_DE_CAMPO)}.")
        lista = bruto.get("lista")
        if tipo in ("escolha", "escolhas") and lista not in listas:
            raise CatalogoInvalido(arquivo, f"{onde}: 'lista' precisa ser uma das listas do catálogo.")
        if tipo not in ("escolha", "escolhas") and lista is not None:
            raise CatalogoInvalido(arquivo, f"{onde}: só campos de escolha têm 'lista'.")
        icone = bruto.get("icone")
        if not isinstance(icone, str) or not _ID.match(icone):
            raise CatalogoInvalido(arquivo, f"{onde}: 'icone' precisa ser um identificador em minúsculas.")
        extras = {c: bruto.get(c) for c in ("exemplo", "unidade")}
        if any(v is not None and (not isinstance(v, str) or not v.strip()) for v in extras.values()):
            raise CatalogoInvalido(arquivo, f"{onde}: 'exemplo' e 'unidade' precisam ser textos.")
        campos[nome] = CampoItem(nome, _texto(bruto, "rotulo", arquivo=arquivo, onde=onde), tipo, icone, lista,
                                 extras["exemplo"], extras["unidade"])

    criaveis = [s for s in SUBTIPOS if s not in ("moedas", "criatura")]
    por_subtipo: dict[str, tuple[CampoDoSubtipo, ...]] = {}
    brutos = dados.get("campos_por_subtipo", {})
    if not isinstance(brutos, Mapping):
        raise CatalogoInvalido(arquivo, "'campos_por_subtipo' precisa ser um objeto.")
    for subtipo, itens in brutos.items():
        onde = f"campos_por_subtipo '{subtipo}'"
        if subtipo not in criaveis:
            raise CatalogoInvalido(arquivo, f"{onde}: subtipo desconhecido.")
        if not isinstance(itens, list):
            raise CatalogoInvalido(arquivo, f"{onde}: precisa ser uma lista de campos.")
        do_subtipo: list[CampoDoSubtipo] = []
        for item in itens:
            if isinstance(item, str):
                nome, sugestoes = item, None
            elif isinstance(item, Mapping):
                nome, sugestoes = item.get("campo"), item.get("sugestoes")
            else:
                nome, sugestoes = None, None
            if nome not in campos:
                raise CatalogoInvalido(arquivo, f"{onde}: campo desconhecido {nome!r}.")
            if sugestoes is not None and (sugestoes not in listas or campos[nome].tipo != "etiquetas"):
                raise CatalogoInvalido(arquivo, f"{onde}: 'sugestoes' precisa ser uma lista do catálogo, num campo de etiquetas.")
            do_subtipo.append(CampoDoSubtipo(nome, sugestoes))
        _unicos([c.campo for c in do_subtipo], arquivo=arquivo, tipo=onde)
        por_subtipo[subtipo] = tuple(do_subtipo)
    if por_subtipo:
        faltando = [s for s in criaveis if s not in por_subtipo]
        if faltando:
            raise CatalogoInvalido(arquivo, f"campos_por_subtipo: falta o subtipo '{faltando[0]}'.")
    return listas, campos, por_subtipo


def ler(diretorio: Path = DIRETORIO) -> Catalogos:
    """Lê e valida os arquivos. Levanta ``CatalogoInvalido`` com o arquivo e o motivo."""
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
        itens=converter_itens(dados["itens.json"]),
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
