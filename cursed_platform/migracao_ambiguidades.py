"""Pendências de significado encontradas em dados legados, sem cálculo de regras."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform.persistence import ItemInventarioRegistro, MigracaoLegadaRegistro, PersonagemRegistro


CAMPOS_CUSTO = ("custo_aprendizado", "descansos_minimos", "potencia_uso", "custo_uso", "custos_adicionais")


@dataclass(frozen=True)
class PendenciaAmbiguidade:
    origem: str
    caminho: str
    campo: str
    valor_original: Any
    motivo: str
    campos_nao_inferidos: tuple[str, ...] = ()

    def serializar(self) -> dict[str, Any]:
        return asdict(self)


def _examinar_custos(dados: Any, origem: str, caminho: str = "") -> Iterable[PendenciaAmbiguidade]:
    if isinstance(dados, dict):
        if "custo" in dados and dados["custo"] is not None:
            indefinidos = tuple(campo for campo in CAMPOS_CUSTO if campo not in dados)
            yield PendenciaAmbiguidade(
                origem=origem, caminho=caminho or "/", campo="custo",
                valor_original=dados["custo"],
                motivo="Custo legado não distingue aprendizado, treino, potência e uso; requer revisão.",
                campos_nao_inferidos=indefinidos,
            )
        for chave, valor in dados.items():
            yield from _examinar_custos(valor, origem, f"{caminho}/{chave}")
    elif isinstance(dados, list):
        for indice, valor in enumerate(dados):
            yield from _examinar_custos(valor, origem, f"{caminho}/{indice}")


def analisar_catalogo_classes(arquivo: Path) -> list[PendenciaAmbiguidade]:
    """Lê o catálogo histórico sem convertê-lo nem atribuir custos mecânicos."""
    dados = json.loads(arquivo.read_text(encoding="utf-8"))
    return list(_examinar_custos(dados, str(arquivo)))


def analisar_mesa_migrada(session: Session, *, origem: str, mesa_id: str) -> list[PendenciaAmbiguidade]:
    """Examina fichas e armaduras convertidas por 11.1, sem mutar o banco."""
    pendencias: list[PendenciaAmbiguidade] = []
    fichas = session.scalars(select(MigracaoLegadaRegistro).where(
        MigracaoLegadaRegistro.origem == origem,
        MigracaoLegadaRegistro.mesa_id == mesa_id,
        MigracaoLegadaRegistro.tipo_origem == "fichas",
    ).order_by(MigracaoLegadaRegistro.id_origem)).all()
    for procedencia in fichas:
        personagem = session.get(PersonagemRegistro, procedencia.id_destino)
        if personagem is None or personagem.mesa_id != mesa_id:
            raise ValueError(f"Destino de fichas#{procedencia.id_origem} ausente ou em outra mesa.")
        identificador = f"{origem}:fichas#{procedencia.id_origem}"
        pendencias.extend(_examinar_custos(personagem.ficha, identificador))
        armaduras = session.scalars(select(ItemInventarioRegistro).where(
            ItemInventarioRegistro.personagem_id == personagem.id,
            ItemInventarioRegistro.mesa_id == mesa_id,
            ItemInventarioRegistro.tipo == "armadura",
        ).order_by(ItemInventarioRegistro.id)).all()
        for armadura in armaduras:
            if "defesa" in armadura.dados and "armadura" not in armadura.dados:
                pendencias.append(PendenciaAmbiguidade(
                    origem=identificador, caminho=f"/inventory_items/{armadura.id}",
                    campo="defesa", valor_original=armadura.dados["defesa"],
                    motivo="A armadura legada usa defesa; não há equivalência aprovada para o campo armadura.",
                    campos_nao_inferidos=("armadura",),
                ))
    return pendencias


def preservar_custo_legado(dados: dict[str, Any]) -> dict[str, Any]:
    """Prepara uma habilidade para carta sem converter `custo` em mecânica nova."""
    resultado = dict(dados)
    if "custo" not in resultado:
        return resultado
    valor = resultado.pop("custo")
    if valor is not None and not isinstance(valor, str):
        raise ValueError("Custo legado não textual exige revisão antes da conversão.")
    if "custo_legado" in resultado and resultado["custo_legado"] != valor:
        raise ValueError("Custo legado conflitante exige revisão antes da conversão.")
    resultado["custo_legado"] = valor
    return resultado
