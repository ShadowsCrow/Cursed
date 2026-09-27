"""Apoio a testes que equipam itens importados sem formato: só o que está na grade é levado e equipado."""

from __future__ import annotations

from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from cursed_platform.persistence import ItemInventarioRegistro

_FORMATO_POR_TIPO = {"arma": ("uma_mao", 1, 2, None), "armadura": ("peitoral", 2, 2, None), "outro": ("outro", 1, 1, 1)}


def colocar_na_grade(engine: Engine, item_id: str, coluna: int = 0, linha: int = 0) -> None:
    """Dá ao item um formato compatível com o tipo e o coloca na grade direto no banco, sem gerar evento."""
    with Session(engine) as session:
        item = session.get(ItemInventarioRegistro, item_id)
        assert item is not None
        subtipo, largura, altura, maos = _FORMATO_POR_TIPO[item.tipo]
        item.subtipo, item.largura, item.altura, item.maos = subtipo, largura, altura, maos
        item.coluna, item.linha = coluna, linha
        session.commit()
