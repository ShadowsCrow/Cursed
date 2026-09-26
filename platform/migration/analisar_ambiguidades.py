"""Relatório de campos legados ambíguos em catálogo e mesa migrada."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
from cursed_platform.migracao_ambiguidades import analisar_catalogo_classes, analisar_mesa_migrada  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Listar custos e campos de armadura que exigem revisão.")
    parser.add_argument("--origem-id", required=True)
    parser.add_argument("--mesa-id", required=True)
    parser.add_argument("--catalogo-classes", type=Path,
                        default=RAIZ / "app_streamlit" / "data" / "catalogs" / "classes.json")
    args = parser.parse_args()
    url = os.environ.get("CURSED_PLATFORM_DATABASE_URL")
    if not url:
        parser.error("Defina CURSED_PLATFORM_DATABASE_URL.")
    engine = create_engine(url)
    try:
        with Session(engine) as session:
            pendencias = [*analisar_catalogo_classes(args.catalogo_classes),
                          *analisar_mesa_migrada(session, origem=args.origem_id, mesa_id=args.mesa_id)]
        print(json.dumps({"total": len(pendencias),
                          "pendencias": [item.serializar() for item in pendencias]},
                         ensure_ascii=False, indent=2))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
