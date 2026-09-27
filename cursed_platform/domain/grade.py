"""Motor da grade de carga (mudança `carga-por-espacos`, decisão D1).

Autoridade do servidor. Precisa responder exatamente como
`platform/frontend/src/app/inventory/gridEngine.ts`; os casos de
`fixtures/grade/casos.json` são executados pelas duas suítes.

Coordenadas absolutas (D2): coluna e linha a partir de 0. Toda célula fora das
colunas ou linhas verdes é vermelha. Colocar um item só é permitido na área verde
mais a linha vermelha extra; itens que já estavam em linhas ou colunas perdidas
(Força ou Tamanho reduzidos) continuam onde estão, contando como sobrecarga.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Any, Iterable, Literal, Mapping, Sequence

Tamanho = Literal["minusculo", "pequeno", "medio", "grande", "enorme", "colossal"]
Subtipo = Literal[
    "peitoral", "capacete", "luvas", "botas", "uma_mao", "duas_maos", "escudo",
    "mochila", "aljava", "moedas", "outro", "criatura",
]
FonteAmpliacao = Literal["mochila", "magia", "habilidade"]

SUBTIPOS: tuple[str, ...] = (
    "peitoral", "capacete", "luvas", "botas", "uma_mao", "duas_maos", "escudo",
    "mochila", "aljava", "moedas", "outro", "criatura",
)
TAMANHOS: tuple[str, ...] = ("minusculo", "pequeno", "medio", "grande", "enorme", "colossal")

# Números aprovados na calibração de 2026-09-27 (docs/regras/calibracao-carga-em-grade.md).
COLUNAS_POR_TAMANHO: dict[str, int] = {
    "minusculo": 2, "pequeno": 4, "medio": 5, "grande": 7, "enorme": 9, "colossal": 11,
}
LINHAS_BASE = 2
LINHAS_VERMELHAS_EXTRAS = 1

DIMENSAO_CRIATURA: dict[str, tuple[int, int]] = {
    "minusculo": (2, 3), "pequeno": (3, 4), "medio": (4, 5), "grande": (5, 7),
}

PECAS_UNICAS = frozenset({"peitoral", "capacete", "luvas", "botas", "mochila", "aljava"})
NAO_EQUIPAVEIS = frozenset({"moedas", "criatura"})

ROTULO_SUBTIPO: dict[str, str] = {
    "peitoral": "peitoral", "capacete": "capacete", "luvas": "luvas", "botas": "botas",
    "uma_mao": "arma de uma mão", "duas_maos": "arma de duas mãos", "escudo": "escudo",
    "mochila": "mochila", "aljava": "aljava", "moedas": "moedas", "outro": "item", "criatura": "criatura",
}

TIPOS_MOEDA: tuple[str, ...] = ("cobre", "prata", "ouro", "platina")


@dataclass(frozen=True)
class Ampliacao:
    fonte: str
    rotulo: str
    linhas: int
    colunas: int


@dataclass(frozen=True)
class ItemGrade:
    id: str
    nome: str
    subtipo: str
    largura: int
    altura: int
    coluna: int | None = None
    linha: int | None = None
    girado: bool = False
    equipado: bool = False
    maos: int | None = None
    requisito_forca: int | None = None
    ampliacao: tuple[int, int] | None = None  # (linhas, colunas)

    @property
    def na_grade(self) -> bool:
        return self.coluna is not None and self.linha is not None

    def dimensoes(self, girado: bool | None = None) -> tuple[int, int]:
        g = self.girado if girado is None else girado
        return (self.altura, self.largura) if g else (self.largura, self.altura)

    def celulas(self) -> list[tuple[int, int]]:
        if self.coluna is None or self.linha is None:
            return []
        largura, altura = self.dimensoes()
        return [(c, l) for l in range(self.linha, self.linha + altura) for c in range(self.coluna, self.coluna + largura)]


@dataclass(frozen=True)
class RegrasGrade:
    linhas_base: int = LINHAS_BASE
    colunas_por_tamanho: Mapping[str, int] = field(default_factory=lambda: dict(COLUNAS_POR_TAMANHO))


@dataclass(frozen=True)
class Grade:
    colunas_verdes: int
    linhas_verdes: int
    ampliacoes: tuple[Ampliacao, ...] = ()

    def eh_vermelha(self, coluna: int, linha: int) -> bool:
        return coluna >= self.colunas_verdes or linha >= self.linhas_verdes


def item_de_json(dados: Mapping[str, Any]) -> ItemGrade:
    """Converte o formato camelCase dos casos compartilhados e da API."""
    ampliacao = dados.get("ampliacao")
    return ItemGrade(
        id=str(dados["id"]),
        nome=str(dados.get("nome", "")),
        subtipo=str(dados["subtipo"]),
        largura=int(dados["largura"]),
        altura=int(dados["altura"]),
        coluna=None if dados.get("coluna") is None else int(dados["coluna"]),
        linha=None if dados.get("linha") is None else int(dados["linha"]),
        girado=bool(dados.get("girado", False)),
        equipado=bool(dados.get("equipado", False)),
        maos=None if dados.get("maos") is None else int(dados["maos"]),
        requisito_forca=None if dados.get("requisitoForca") is None else int(dados["requisitoForca"]),
        ampliacao=None if not ampliacao else (int(ampliacao.get("linhas", 0)), int(ampliacao.get("colunas", 0))),
    )


def ampliacoes_de_json(lista: Iterable[Mapping[str, Any]] | None) -> list[Ampliacao]:
    return [
        Ampliacao(str(a["fonte"]), str(a.get("rotulo", "")), int(a.get("linhas", 0)), int(a.get("colunas", 0)))
        for a in (lista or [])
    ]


def calcular_grade(
    forca: int,
    tamanho: str,
    itens: Sequence[ItemGrade] = (),
    ampliacoes: Sequence[Ampliacao] = (),
    regras: RegrasGrade | None = None,
) -> Grade:
    """Uma ampliação por fonte: se houver duas da mesma fonte, vale a maior."""
    regras = regras or RegrasGrade()
    candidatas = list(ampliacoes)
    for item in itens:
        if item.subtipo == "mochila" and item.equipado and item.ampliacao:
            candidatas.append(Ampliacao("mochila", item.nome, item.ampliacao[0], item.ampliacao[1]))
    por_fonte: dict[str, Ampliacao] = {}
    for ampliacao in candidatas:
        atual = por_fonte.get(ampliacao.fonte)
        if atual is None or ampliacao.linhas + ampliacao.colunas > atual.linhas + atual.colunas:
            por_fonte[ampliacao.fonte] = ampliacao
    aplicadas = tuple(por_fonte.values())
    forca = max(0, math.floor(forca))
    return Grade(
        colunas_verdes=regras.colunas_por_tamanho[tamanho] + sum(a.colunas for a in aplicadas),
        linhas_verdes=regras.linhas_base + forca + sum(a.linhas for a in aplicadas),
        ampliacoes=aplicadas,
    )


def limites_fisicos(grade: Grade, itens: Sequence[ItemGrade]) -> tuple[int, int]:
    """(colunas, linhas) exibidas: verde + linha vermelha, estendida até itens em áreas perdidas."""
    colunas = grade.colunas_verdes
    linhas = grade.linhas_verdes + LINHAS_VERMELHAS_EXTRAS
    for item in itens:
        if item.coluna is None or item.linha is None:
            continue
        largura, altura = item.dimensoes()
        colunas = max(colunas, item.coluna + largura)
        linhas = max(linhas, item.linha + altura)
    return colunas, linhas


@dataclass(frozen=True)
class ResultadoPosicao:
    ok: bool
    motivo: str | None = None
    conflitos: tuple[str, ...] = ()

    def como_dict(self) -> dict[str, Any]:
        if self.ok:
            return {"ok": True}
        dados: dict[str, Any] = {"ok": False, "motivo": self.motivo}
        if self.conflitos:
            dados["conflitos"] = list(self.conflitos)
        return dados


def validar_posicao(
    grade: Grade, itens: Sequence[ItemGrade], item: ItemGrade, coluna: int, linha: int, girado: bool,
) -> ResultadoPosicao:
    largura, altura = item.dimensoes(girado)
    limite_linhas = grade.linhas_verdes + LINHAS_VERMELHAS_EXTRAS
    if coluna < 0 or linha < 0 or coluna + largura > grade.colunas_verdes or linha + altura > limite_linhas:
        return ResultadoPosicao(False, "fora_da_grade")
    pedidas = {(c, l) for l in range(linha, linha + altura) for c in range(coluna, coluna + largura)}
    conflitos = tuple(o.id for o in itens if o.id != item.id and any(celula in pedidas for celula in o.celulas()))
    return ResultadoPosicao(False, "sobreposicao", conflitos) if conflitos else ResultadoPosicao(True)


def encontrar_espaco(
    grade: Grade, itens: Sequence[ItemGrade], item: ItemGrade, permitir_vermelho: bool = True,
) -> tuple[int, int, bool] | None:
    """Primeira posição livre em ordem de leitura, na orientação original e depois girada."""
    limite_linhas = grade.linhas_verdes + (LINHAS_VERMELHAS_EXTRAS if permitir_vermelho else 0)
    orientacoes = [item.girado] if item.largura == item.altura else [item.girado, not item.girado]
    for linha in range(limite_linhas):
        for coluna in range(grade.colunas_verdes):
            for girado in orientacoes:
                _, altura = item.dimensoes(girado)
                if linha + altura > limite_linhas:
                    continue
                if validar_posicao(grade, itens, item, coluna, linha, girado).ok:
                    return coluna, linha, girado
    return None


def maos_do_item(item: ItemGrade) -> int:
    if item.subtipo == "uma_mao":
        # Arma versátil empunhada com as duas mãos ocupa as duas.
        return 2 if item.maos == 2 else 1
    if item.subtipo == "escudo":
        return 1
    if item.subtipo == "duas_maos":
        return 2
    if item.subtipo == "outro":
        return item.maos or 0
    return 0


def maos_ocupadas(itens: Iterable[ItemGrade]) -> int:
    return sum(maos_do_item(i) for i in itens if i.equipado)


@dataclass(frozen=True)
class ResultadoEquipar:
    ok: bool
    motivo: str | None = None
    mensagem: str | None = None


def validar_equipar(itens: Sequence[ItemGrade], item: ItemGrade, forca: int) -> ResultadoEquipar:
    if item.subtipo in NAO_EQUIPAVEIS or (item.subtipo == "outro" and maos_do_item(item) == 0):
        return ResultadoEquipar(False, "nao_equipavel", f"{item.nome} não pode ser equipado.")
    # Só o que está na grade é levado; a mochila equipada é a exceção, porque não ocupa célula.
    if item.subtipo != "mochila" and not item.na_grade:
        return ResultadoEquipar(False, "fora_da_grade", f"{item.nome} precisa estar na grade para ser levado e equipado.")
    outros = [i for i in itens if i.id != item.id and i.equipado]
    if item.subtipo in PECAS_UNICAS:
        repetida = next((i for i in outros if i.subtipo == item.subtipo), None)
        if repetida is not None:
            return ResultadoEquipar(
                False, "peca_repetida",
                f"Só um item de {ROTULO_SUBTIPO[item.subtipo]} fica equipado por vez: {repetida.nome} já está. Desequipe antes.",
            )
    if maos_ocupadas(outros) + maos_do_item(item) > 2:
        return ResultadoEquipar(False, "maos_insuficientes", f"{item.nome} precisa de mãos livres. Solte algo antes.")
    if item.requisito_forca is not None and forca < item.requisito_forca:
        return ResultadoEquipar(False, "requisito_forca", f"{item.nome} exige Força {item.requisito_forca}.")
    return ResultadoEquipar(True)


@dataclass(frozen=True)
class Avaliacao:
    sobrecarga: bool
    itens_em_sobrecarga: tuple[str, ...]
    sobreposicoes: tuple[tuple[str, str], ...]
    maos_ocupadas: int
    celulas_ocupadas: int
    celulas_verdes: int

    def como_dict(self) -> dict[str, Any]:
        return {
            "sobrecarga": self.sobrecarga,
            "itensEmSobrecarga": list(self.itens_em_sobrecarga),
            "sobreposicoes": [list(par) for par in self.sobreposicoes],
            "maosOcupadas": self.maos_ocupadas,
            "celulasOcupadas": self.celulas_ocupadas,
            "celulasVerdes": self.celulas_verdes,
        }


def avaliar(grade: Grade, itens: Sequence[ItemGrade]) -> Avaliacao:
    dono: dict[tuple[int, int], str] = {}
    sobreposicoes: list[tuple[str, str]] = []
    em_sobrecarga: list[str] = []
    ocupadas = 0
    for item in itens:
        vermelho = False
        for celula in item.celulas():
            ocupadas += 1
            anterior = dono.get(celula)
            if anterior is not None and (anterior, item.id) not in sobreposicoes:
                sobreposicoes.append((anterior, item.id))
            dono[celula] = item.id
            if grade.eh_vermelha(*celula):
                vermelho = True
        if vermelho:
            em_sobrecarga.append(item.id)
    return Avaliacao(
        sobrecarga=bool(em_sobrecarga),
        itens_em_sobrecarga=tuple(em_sobrecarga),
        sobreposicoes=tuple(sobreposicoes),
        maos_ocupadas=maos_ocupadas(itens),
        celulas_ocupadas=ocupadas,
        celulas_verdes=grade.colunas_verdes * grade.linhas_verdes,
    )


def adicionar_moedas(
    pilhas: Sequence[Mapping[str, int]], entrada: Mapping[str, int], por_pilha: int,
) -> tuple[list[dict[str, int]], list[dict[str, int]]]:
    """Enche as pilhas existentes, na ordem dada, até o limite; o resto vira pilhas novas.
    Devolve (pilhas existentes atualizadas, na mesma ordem; pilhas novas)."""
    if not isinstance(por_pilha, int) or por_pilha < 1:
        raise ValueError("Moedas por pilha deve ser um inteiro positivo.")
    existentes = [{tipo: int(p.get(tipo, 0)) for tipo in TIPOS_MOEDA} for p in pilhas]
    novas: list[dict[str, int]] = []
    for tipo in TIPOS_MOEDA:
        restante = max(0, int(entrada.get(tipo, 0)))
        for pilha in [*existentes, *novas]:
            if restante == 0:
                break
            cabe = min(restante, por_pilha - sum(pilha.values()))
            if cabe > 0:
                pilha[tipo] += cabe
                restante -= cabe
        while restante > 0:
            nova = {t: 0 for t in TIPOS_MOEDA}
            nova[tipo] = min(restante, por_pilha)
            restante -= nova[tipo]
            novas.append(nova)
    return existentes, novas


def retirar_moedas(pilhas: Sequence[Mapping[str, int]], saida: Mapping[str, int]) -> list[dict[str, int]]:
    """Tira as moedas das pilhas da última para a primeira, na ordem dada. Devolve as pilhas na mesma ordem;
    as que zerarem ficam vazias. Recusa retirar mais do que há de algum tipo."""
    resultado = [{tipo: int(p.get(tipo, 0)) for tipo in TIPOS_MOEDA} for p in pilhas]
    for tipo in TIPOS_MOEDA:
        pedido = max(0, int(saida.get(tipo, 0)))
        total = sum(p[tipo] for p in resultado)
        if pedido > total:
            raise ValueError(f"Não há {pedido} de {tipo}: há só {total}.")
        for pilha in reversed(resultado):
            if pedido == 0:
                break
            sai = min(pedido, pilha[tipo])
            pilha[tipo] -= sai
            pedido -= sai
    return resultado


def distribuir_moedas(bolsa: Mapping[str, int], por_pilha: int) -> list[dict[str, int]]:
    """Pilhas mistas de até `por_pilha`, na ordem cobre, prata, ouro, platina."""
    if not isinstance(por_pilha, int) or por_pilha < 1:
        raise ValueError("Moedas por pilha deve ser um inteiro positivo.")
    pilhas: list[dict[str, int]] = []
    atual = {tipo: 0 for tipo in TIPOS_MOEDA}
    ocupadas = 0
    for tipo in TIPOS_MOEDA:
        restante = max(0, math.floor(bolsa.get(tipo, 0)))
        while restante > 0:
            cabe = min(restante, por_pilha - ocupadas)
            atual[tipo] += cabe
            ocupadas += cabe
            restante -= cabe
            if ocupadas == por_pilha:
                pilhas.append(atual)
                atual = {tipo_: 0 for tipo_ in TIPOS_MOEDA}
                ocupadas = 0
    if ocupadas:
        pilhas.append(atual)
    return pilhas
