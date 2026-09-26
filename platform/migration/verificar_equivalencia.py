"""Relatório de equivalência da migração; saída aprovável apenas sem pendências."""

from __future__ import annotations

import argparse
from dataclasses import asdict
import json
import os
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
from cursed_platform.migracao_equivalencia import gerar_relatorio_equivalencia  # noqa: E402
from cursed_platform.observabilidade import registrar  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Comparar fontes legadas com destinos migrados.")
    parser.add_argument("--origem-id", required=True)
    parser.add_argument("--mesa-id", required=True)
    parser.add_argument("--fichas-dir", type=Path,
                        default=RAIZ / "app_streamlit" / "storage" / "legacy-sheets" / "fichas")
    parser.add_argument("--catalogos-dir", type=Path,
                        default=RAIZ / "app_streamlit" / "data" / "catalogs")
    parser.add_argument("--amostras", type=int, default=5)
    args = parser.parse_args()
    destino_url = os.environ.get("CURSED_PLATFORM_DATABASE_URL")
    if not destino_url:
        parser.error("Defina CURSED_PLATFORM_DATABASE_URL.")
    origem_url = os.environ.get("CURSED_LEGACY_DATABASE_URL")
    origem = create_engine(origem_url) if origem_url else None
    destino = create_engine(destino_url)
    try:
        with Session(destino) as session:
            relatorio = gerar_relatorio_equivalencia(session, origem=args.origem_id,
                mesa_id=args.mesa_id, origem_engine=origem, fichas_dir=args.fichas_dir,
                catalogos_dir=args.catalogos_dir, limite_amostras=args.amostras)
            session.rollback()
        print(json.dumps({**asdict(relatorio), "aprovavel": relatorio.aprovavel},
                         ensure_ascii=False, indent=2))
        registrar("migracao", etapa="equivalencia", aplicado=False,
                  aprovavel=relatorio.aprovavel, divergencias=len(relatorio.divergencias),
                  pendencias=len(relatorio.pendencias))
        if not relatorio.aprovavel:
            raise SystemExit(2)
    finally:
        if origem is not None:
            origem.dispose()
        destino.dispose()


if __name__ == "__main__":
    main()
