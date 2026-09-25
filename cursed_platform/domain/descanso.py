"""Recuperação de descansos conforme `rules/sistema/Descansos e Recuperação.md`.

Módulo isolado porque a revisão de Descanso continua aberta: uma mudança de
regra altera apenas este arquivo e seus testes. O cálculo é puro — recebe a ficha
e devolve o resultado previsto — e nunca inventa valores ausentes: sem Escala de
PV/PP registrada, o recurso não é recuperado e a ausência é informada.

A ficha usa `recursos.pv|pp = {atual, maximo, escala}` e
`desgaste = {exaustao, estresse}`.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from fractions import Fraction
import math
from typing import Any, Mapping

from cursed_platform.domain.desgaste import MAXIMOS, normalizar_desgaste, obter_faixa


# Conforto → (fração da Escala de PV, fração da Escala de PP, Estresse reduzido, Exaustão reduzida)
TABELA_CONFORTO = {
    0: (Fraction(0), Fraction(0), 0, 0),
    1: (Fraction(1, 4), Fraction(1, 4), 0, 0),
    2: (Fraction(1, 2), Fraction(1, 2), 1, 1),
    3: (Fraction(3, 4), Fraction(3, 4), 1, 1),
    4: (Fraction(1), Fraction(1), 2, 2),
}
FOCOS = ("pv", "pp", "estresse", "exaustao")
RECURSOS = ("pv", "pp")
TRILHAS = ("exaustao", "estresse")


@dataclass(frozen=True)
class ParametrosDescanso:
    tipo: str  # curto | longo
    conforto: int | None = None
    seguranca: int | None = None

    def validar(self) -> None:
        if self.tipo not in {"curto", "longo"}:
            raise ValueError("O descanso precisa ser curto ou longo.")
        if self.tipo == "longo":
            for nome, nota in (("Conforto", self.conforto), ("Segurança", self.seguranca)):
                if nota is None or not 0 <= nota <= 4:
                    raise ValueError(f"O Descanso Longo precisa de nota de {nome} entre 0 e 4.")

    @property
    def permite_foco(self) -> bool:
        return self.tipo == "longo" and self.conforto == 4 and self.seguranca == 4


@dataclass
class ResultadoRecurso:
    recurso: str
    antes: int | None
    maximo: int | None
    calculado: int | None  # recuperação pela regra; None quando falta a Escala
    aplicado: int  # recuperação efetiva após ajuste e limite do máximo
    depois: int | None
    aviso: str | None = None


@dataclass
class ResultadoTrilha:
    trilha: str
    antes: int
    calculado: int
    aplicado: int
    depois: int
    faixa_antes: str
    faixa_depois: str


@dataclass
class ResultadoDescanso:
    recursos: list[ResultadoRecurso]
    trilhas: list[ResultadoTrilha]
    foco: str | None
    avisos: list[str] = field(default_factory=list)

    @property
    def altera(self) -> bool:
        return any(r.aplicado for r in self.recursos) or any(t.aplicado for t in self.trilhas)


def _inteiro(valor: Any) -> int | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, int):
        return valor
    if isinstance(valor, float) and valor.is_integer():
        return int(valor)
    return None


def _recuperacao_regra(parametros: ParametrosDescanso, escala: int, recurso: str, foco: str | None) -> int:
    if parametros.tipo == "curto":
        return max(1, math.floor(Fraction(escala, 2)))
    fracao = TABELA_CONFORTO[parametros.conforto][RECURSOS.index(recurso)]
    base = math.floor(fracao * escala)
    return base + (math.floor(Fraction(escala, 2)) if foco == recurso else 0)


def _reducao_regra(parametros: ParametrosDescanso, trilha: str, foco: str | None) -> int:
    if parametros.tipo == "curto":
        return 1 if trilha == "exaustao" else 0
    estresse, exaustao = TABELA_CONFORTO[parametros.conforto][2:]
    base = exaustao if trilha == "exaustao" else estresse
    return base + (1 if foco == trilha else 0)


def calcular(
    ficha: Mapping[str, Any],
    parametros: ParametrosDescanso,
    *,
    foco: str | None = None,
    ajustes: Mapping[str, int] | None = None,
) -> ResultadoDescanso:
    """Resultado previsto para um personagem. `ajustes` substitui a quantidade calculada."""
    parametros.validar()
    if foco is not None:
        if foco not in FOCOS:
            raise ValueError("Foco de Repouso inválido.")
        if not parametros.permite_foco:
            raise ValueError("Foco de Repouso exige Descanso Longo com Conforto 4 e Segurança 4.")
    ajustes = dict(ajustes or {})
    for chave, valor in ajustes.items():
        if chave not in FOCOS or not isinstance(valor, int) or valor < 0:
            raise ValueError("Ajustes aceitam pv, pp, exaustao e estresse com valores inteiros não negativos.")

    avisos: list[str] = []
    recursos_ficha = ficha.get("recursos") if isinstance(ficha.get("recursos"), Mapping) else {}
    recursos = []
    for recurso in RECURSOS:
        dados = recursos_ficha.get(recurso) if isinstance(recursos_ficha.get(recurso), Mapping) else {}
        atual, maximo, escala = (_inteiro(dados.get(chave)) for chave in ("atual", "maximo", "escala"))
        rotulo = recurso.upper()
        calculado = _recuperacao_regra(parametros, escala, recurso, foco) if escala and escala > 0 else None
        pedido = ajustes.get(recurso, calculado)
        if atual is None or maximo is None:
            aviso = f"{rotulo} atual ou máximo não registrado; nada foi recuperado."
            recursos.append(ResultadoRecurso(recurso, atual, maximo, calculado, 0, atual, aviso))
            avisos.append(aviso)
            continue
        aviso = None
        if calculado is None and recurso not in ajustes:
            aviso = f"Escala de {rotulo} não registrada; informe a recuperação manualmente se couber."
            avisos.append(aviso)
        aplicado = max(0, min(pedido or 0, maximo - atual))
        recursos.append(ResultadoRecurso(recurso, atual, maximo, calculado, aplicado, atual + aplicado, aviso))

    desgaste = normalizar_desgaste(ficha.get("desgaste"))
    trilhas = []
    for trilha in TRILHAS:
        antes = desgaste[trilha]
        calculado = _reducao_regra(parametros, trilha, foco)
        aplicado = min(ajustes.get(trilha, calculado), antes)
        depois = antes - aplicado
        trilhas.append(ResultadoTrilha(
            trilha, antes, calculado, aplicado, depois,
            obter_faixa(trilha, antes)["nome"], obter_faixa(trilha, depois)["nome"],
        ))
    return ResultadoDescanso(recursos, trilhas, foco, avisos)


def aplicar(ficha: Mapping[str, Any], resultado: ResultadoDescanso) -> dict[str, Any]:
    """Nova ficha com os valores do resultado; demais campos intactos."""
    nova = deepcopy(dict(ficha))
    for item in resultado.recursos:
        if item.aplicado:
            nova.setdefault("recursos", {}).setdefault(item.recurso, {})["atual"] = item.depois
    if any(t.aplicado for t in resultado.trilhas):
        desgaste = normalizar_desgaste(nova.get("desgaste"))
        for trilha in resultado.trilhas:
            desgaste[trilha.trilha] = max(0, min(MAXIMOS[trilha.trilha], trilha.depois))
        nova["desgaste"] = desgaste
    return nova
