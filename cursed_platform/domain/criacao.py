"""Cálculos do Framework de Criação (mudança `adaptar-cartas-ao-framework`, decisão D5).

Autoridade do servidor. Precisa responder exatamente como
`platform/frontend/src/app/cards/criacao.ts`; os casos de
`fixtures/criacao/casos.json` são executados pelas duas suítes.

Só o que é consulta direta de tabela: Grau e Descansos Mínimos pelo Custo de
Aprendizado e Custo de Uso pela Potência de Uso. A pontuação da criação continua
com o Narrador.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any, Mapping

from cursed_platform.catalogos import CatalogoFramework, FaixaGrau

NATUREZAS = ("habilidade", "magia")


@dataclass(frozen=True)
class Calculados:
    grau: str | None
    descansos_minimos: int | None
    custo_uso_framework: int | None
    abaixo_do_minimo: bool


def faixa(framework: CatalogoFramework, natureza: str, custo: int | None) -> FaixaGrau | None:
    """Faixa de grau do custo; ``None`` sem custo ou abaixo do mínimo da natureza."""
    if custo is None:
        return None
    return next(
        (f for f in framework.naturezas[natureza].faixas if custo >= f.minimo and (f.maximo is None or custo <= f.maximo)),
        None,
    )


def abaixo_do_minimo(framework: CatalogoFramework, natureza: str, custo: int | None) -> bool:
    return custo is not None and custo < framework.naturezas[natureza].custo_minimo


def custo_de_uso(framework: CatalogoFramework, potencia: int | None, tipo: str | None) -> int | None:
    """``Potência² ÷ divisor``, arredondado para cima, com o mínimo; tipos sem custo dão 0."""
    if tipo in framework.sem_custo_uso:
        return 0
    if potencia is None:
        return None
    return max(framework.minimo_uso, math.ceil(potencia * potencia / framework.divisor_uso))


def calcular(framework: CatalogoFramework, natureza: str, conteudo: Mapping[str, Any]) -> Calculados:
    custo = conteudo.get("custo_aprendizado")
    custo = custo if isinstance(custo, int) and not isinstance(custo, bool) else None
    potencia = conteudo.get("potencia_uso")
    potencia = potencia if isinstance(potencia, int) and not isinstance(potencia, bool) else None
    encontrada = faixa(framework, natureza, custo)
    return Calculados(
        grau=encontrada.grau if encontrada else None,
        descansos_minimos=encontrada.descansos if encontrada else None,
        custo_uso_framework=custo_de_uso(framework, potencia, conteudo.get("ativacao")),
        abaixo_do_minimo=abaixo_do_minimo(framework, natureza, custo),
    )


def custo_uso_efetivo(conteudo: Mapping[str, Any], calculados: Calculados) -> int | None:
    """O valor registrado pelo Narrador prevalece; sem ele, o do Framework."""
    registrado = conteudo.get("custo_uso")
    return registrado if isinstance(registrado, int) else calculados.custo_uso_framework
