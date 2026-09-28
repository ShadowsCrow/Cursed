"""PV, PP e Escalas calculados pelas regras (`Criação de Personagem.md` e `Progressão e Proficiência.md`).

    PV inicial = base de PV da classe + Vigor        Escala de PV = base de Escala de PV + Vigor
    PP inicial = base de PP da classe + Propósito    Escala de PP = base de Escala de PP + Propósito
    PV máximo  = PV inicial + (nível - 1) x Escala de PV
    PP máximo  = PP inicial + piso(nível / 2) x Escala de PP

Vigor e Propósito entram pelo valor permanente (base + ajuste da ficha); efeitos nunca contam.
Os máximos e as Escalas não são gravados: são calculados na leitura. Faltando uma entrada, o
valor fica "não calculável" com o motivo, sem estimativa.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Mapping

from cursed_platform.catalogos import chave

if TYPE_CHECKING:
    from cursed_platform.catalogos import Base, Catalogos, Classe

NIVEL_MINIMO, NIVEL_MAXIMO = 1, 20
ALVOS_AJUSTE = ("pv_maximo", "pp_maximo", "escala_pv", "escala_pp")
ROTULOS = {
    "pv_inicial": "PV inicial",
    "escala_pv": "Escala de PV",
    "pv_maximo": "PV máximo",
    "pp_inicial": "PP inicial",
    "escala_pp": "Escala de PP",
    "pp_maximo": "PP máximo",
}
_ATRIBUTOS = {"vigor": "Vigor", "proposito": "Propósito"}


@dataclass(frozen=True)
class FonteRecurso:
    tipo: str  # classe | atributo | nivel | ajuste_narrador
    rotulo: str
    valor: int


@dataclass(frozen=True)
class ValorRecurso:
    chave: str  # ex.: "recurso:pv_maximo"
    rotulo: str
    calculavel: bool
    fontes: tuple[FonteRecurso, ...] = ()
    motivo: str | None = None
    # Valor gravado à mão numa ficha antiga, quando difere do calculado. Só informativo.
    divergencia_legada: int | None = None

    @property
    def total(self) -> int | None:
        return sum(f.valor for f in self.fontes) if self.calculavel else None


@dataclass(frozen=True)
class Recursos:
    valores: dict[str, ValorRecurso] = field(default_factory=dict)

    def __getitem__(self, nome: str) -> ValorRecurso:
        return self.valores[nome]

    def maximo(self, recurso: str) -> int | None:
        return self.valores[f"{recurso}_maximo"].total

    def escala(self, recurso: str) -> int | None:
        return self.valores[f"escala_{recurso}"].total


def _inteiro(valor: Any) -> int | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, int):
        return valor
    if isinstance(valor, float) and valor.is_integer():
        return int(valor)
    if isinstance(valor, str):
        try:
            return int(valor.strip())
        except ValueError:
            return None
    return None


def nivel_da_ficha(ficha: Mapping[str, Any]) -> tuple[int | None, str | None]:
    """Nível válido ou o motivo de não haver um."""
    bruto = (ficha.get("personagem") or {}).get("nivel")
    if bruto is None or bruto == "":
        return None, "Nível não definido: o Narrador precisa informar o nível."
    nivel = _inteiro(bruto)
    if nivel is None or not NIVEL_MINIMO <= nivel <= NIVEL_MAXIMO:
        return None, f"Nível inválido ({bruto}): vai de {NIVEL_MINIMO} a {NIVEL_MAXIMO}."
    return nivel, None


def atributo_permanente(ficha: Mapping[str, Any], atributo: str) -> tuple[int | None, str | None]:
    """Base + ajuste da ficha, casando o nome sem acento e sem diferenciar maiúsculas."""
    dados = ficha.get("atributos") or {}
    valores = dados.get("valores") or {}
    ajustes = dados.get("ajustes") or {}
    rotulo = _ATRIBUTOS.get(atributo, atributo)
    nome = next((n for n in valores if chave(n) == atributo), None)
    if nome is None:
        return None, f"{rotulo} não está registrado na ficha."
    base = _inteiro(valores.get(nome))
    ajuste = _inteiro(ajustes.get(nome, 0)) if ajustes.get(nome) not in (None, "") else 0
    if base is None or ajuste is None:
        return None, f"{rotulo} não é um número inteiro na ficha."
    return base + ajuste, None


def ajustes_do_narrador(ficha: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    brutos = (ficha.get("recursos") or {}).get("ajustes") or []
    return [a for a in brutos if isinstance(a, Mapping) and a.get("alvo") in ALVOS_AJUSTE and _inteiro(a.get("valor")) is not None]


def _fontes_ajuste(ajustes: list[Mapping[str, Any]], alvo: str) -> list[FonteRecurso]:
    return [
        FonteRecurso("ajuste_narrador", str(a.get("origem") or "Ajuste do Narrador"), _inteiro(a["valor"]) or 0)
        for a in ajustes if a["alvo"] == alvo
    ]


def _legado(ficha: Mapping[str, Any], recurso: str, campo: str, total: int | None) -> int | None:
    bruto = ((ficha.get("recursos") or {}).get(recurso) or {})
    if not isinstance(bruto, Mapping):
        return None
    valor = _inteiro(bruto.get(campo))
    return valor if valor is not None and total is not None and valor != total else None


def _nao_calculavel(nome: str, motivo: str) -> ValorRecurso:
    return ValorRecurso(f"recurso:{nome}", ROTULOS[nome], False, motivo=motivo)


def _motivo_classe(ficha: Mapping[str, Any], catalogo: "Catalogos") -> tuple["Classe | None", str | None]:
    nome = str((ficha.get("personagem") or {}).get("classe") or "").strip()
    if not nome:
        return None, "Classe não definida."
    classe = catalogo.classe(nome)
    if classe is None:
        return None, f"A classe \"{nome}\" não está no catálogo: vincule a classe."
    return classe, None


def calcular(ficha: Mapping[str, Any], catalogo: "Catalogos") -> Recursos:
    classe, motivo_classe = _motivo_classe(ficha, catalogo)
    nivel, motivo_nivel = nivel_da_ficha(ficha)
    ajustes = ajustes_do_narrador(ficha)
    valores: dict[str, ValorRecurso] = {}

    for recurso, atributo, passos in (("pv", "vigor", lambda n: n - 1), ("pp", "proposito", lambda n: n // 2)):
        sigla = recurso.upper()
        inicial, escala = f"{recurso}_inicial", f"escala_{recurso}"
        if classe is None:
            for nome in (inicial, escala, f"{recurso}_maximo"):
                valores[nome] = _nao_calculavel(nome, motivo_classe or "")
            continue
        permanente, motivo_atributo = atributo_permanente(ficha, atributo)
        rotulo_atributo = _ATRIBUTOS[atributo]

        def por_base(nome: str, base: "Base | None", rotulo_base: str) -> ValorRecurso:
            if base is None:
                return _nao_calculavel(nome, f"A classe {classe.nome} não tem {rotulo_base} registrada.")
            if base.atributo != atributo:
                return _nao_calculavel(nome, f"A {rotulo_base} do {classe.nome} usa um atributo inesperado ({base.texto}).")
            if permanente is None:
                return _nao_calculavel(nome, motivo_atributo or "")
            fontes = [
                FonteRecurso("classe", f"{rotulo_base[:1].upper()}{rotulo_base[1:]} do {classe.nome}", base.valor),
                FonteRecurso("atributo", rotulo_atributo, permanente),
            ]
            return ValorRecurso(f"recurso:{nome}", ROTULOS[nome], True, tuple(fontes))

        base_inicial = classe.pv if recurso == "pv" else classe.pp
        base_escala = classe.escala_pv if recurso == "pv" else classe.escala_pp
        valor_inicial = por_base(inicial, base_inicial, f"base de {sigla}")
        valor_escala = por_base(escala, base_escala, f"base de Escala de {sigla}")
        if valor_escala.calculavel:
            fontes = valor_escala.fontes + tuple(_fontes_ajuste(ajustes, escala))
            valor_escala = ValorRecurso(valor_escala.chave, valor_escala.rotulo, True, fontes,
                                        divergencia_legada=_legado(ficha, recurso, "escala", sum(f.valor for f in fontes)))
        valores[inicial], valores[escala] = valor_inicial, valor_escala

        maximo = f"{recurso}_maximo"
        if not valor_inicial.calculavel:
            valores[maximo] = _nao_calculavel(maximo, valor_inicial.motivo or "")
        elif nivel is None:
            valores[maximo] = _nao_calculavel(maximo, motivo_nivel or "")
        elif not valor_escala.calculavel and passos(nivel) > 0:
            valores[maximo] = _nao_calculavel(maximo, valor_escala.motivo or "")
        else:
            aumentos = passos(nivel)
            fontes = list(valor_inicial.fontes)
            if aumentos:
                escala_total = valor_escala.total or 0
                fontes.append(FonteRecurso(
                    "nivel", f"{aumentos} aumento{'s' if aumentos != 1 else ''} de Escala de {sigla} ({escala_total})",
                    aumentos * escala_total,
                ))
            fontes.extend(_fontes_ajuste(ajustes, maximo))
            total = sum(f.valor for f in fontes)
            valores[maximo] = ValorRecurso(f"recurso:{maximo}", ROTULOS[maximo], True, tuple(fontes),
                                           divergencia_legada=_legado(ficha, recurso, "maximo", total))
    return Recursos(valores)


def ajustar_atuais(ficha: dict[str, Any], calculado: Recursos, *, novo: bool) -> None:
    """Mantém PV e PP atuais coerentes com os máximos calculados. Altera ``ficha``.

    Personagem novo começa com o atual igual ao máximo. Depois disso, subir o máximo não recupera
    nada; se o máximo cair abaixo do atual, o atual é limitado. Máximo não calculável não mexe no atual.
    """
    for recurso in ("pv", "pp"):
        maximo = calculado.maximo(recurso)
        if maximo is None:
            continue
        recursos = ficha.setdefault("recursos", {})
        if not isinstance(recursos, dict):
            continue
        atual_bruto = recursos.get(recurso)
        estado = dict(atual_bruto) if isinstance(atual_bruto, Mapping) else {}
        atual = _inteiro(estado.get("atual"))
        if novo:
            estado["atual"] = maximo
        elif atual is not None and atual > maximo:
            estado["atual"] = maximo
        else:
            continue
        recursos[recurso] = estado
