"""Eventos operacionais JSON sem payloads privados da mesa."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
import json
import logging
import sys
from typing import Any, Iterable


LOGGER = logging.getLogger("cursed.operacao")
EVENTOS = {"comando", "conflito", "erro", "realtime_falha", "migracao"}


def configurar() -> None:
    if not LOGGER.handlers:
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter("%(message)s"))
        LOGGER.addHandler(handler)
    LOGGER.setLevel(logging.INFO)
    LOGGER.propagate = False


def registrar(evento: str, **campos: Any) -> None:
    """Emite uma linha JSON; chamadores devem passar apenas metadados sanitizados."""
    if evento not in EVENTOS:
        raise ValueError("Tipo de evento operacional desconhecido.")
    configurar()
    LOGGER.info(json.dumps({"ts": datetime.now(UTC).isoformat(), "evento": evento, **campos},
                           ensure_ascii=False, separators=(",", ":")))


def resumir(linhas: Iterable[str]) -> dict[str, Any]:
    """Consulta mínima sobre linhas JSON exportadas dos logs da API e migradores."""
    eventos = []
    for linha in linhas:
        try:
            item = json.loads(linha)
        except (ValueError, TypeError):
            continue
        if isinstance(item, dict) and item.get("evento") in EVENTOS:
            eventos.append(item)
    contagens = dict(Counter(item["evento"] for item in eventos))
    duracoes = sorted(float(item["duracao_ms"]) for item in eventos
                      if item["evento"] in {"comando", "conflito", "erro"}
                      and isinstance(item.get("duracao_ms"), (int, float)))
    p95 = duracoes[max(0, (95 * len(duracoes) + 99) // 100 - 1)] if duracoes else None
    por_rota = dict(Counter(item.get("rota", "desconhecida") for item in eventos
                           if item["evento"] in {"comando", "conflito", "erro"}))
    migracoes = [item for item in eventos if item["evento"] == "migracao"]
    return {"contagens": contagens, "latencia_p95_ms": p95,
            "comandos_por_rota": por_rota, "migracoes": migracoes[-10:]}
