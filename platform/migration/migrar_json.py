"""Prévia e aplicação dos JSONs históricos e catálogos sem publicação automática."""

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
from cursed_platform.migracao_json import migrar_json_catalogos  # noqa: E402
from cursed_platform.observabilidade import registrar  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrar exportações JSON e catálogos para rascunhos da mesa.")
    parser.add_argument("--origem-id", required=True)
    parser.add_argument("--mesa-id", required=True)
    parser.add_argument("--fichas-dir", type=Path,
                        default=RAIZ / "app_streamlit" / "storage" / "legacy-sheets" / "fichas")
    parser.add_argument("--catalogos-dir", type=Path,
                        default=RAIZ / "app_streamlit" / "data" / "catalogs")
    parser.add_argument("--aplicar", action="store_true")
    args = parser.parse_args()
    destino_url = os.environ.get("CURSED_PLATFORM_DATABASE_URL")
    if not destino_url:
        parser.error("Defina CURSED_PLATFORM_DATABASE_URL.")
    destino = create_engine(destino_url)
    origem_url = os.environ.get("CURSED_LEGACY_DATABASE_URL")
    origem_sql = create_engine(origem_url) if origem_url else None
    try:
        with Session(destino) as session:
            relatorio = migrar_json_catalogos(session, origem=args.origem_id, mesa_id=args.mesa_id,
                fichas_dir=args.fichas_dir, catalogos_dir=args.catalogos_dir, origem_engine=origem_sql)
            if args.aplicar:
                session.commit()
            else:
                session.rollback()
            print(json.dumps({
                "aplicado": args.aplicar, "aprovavel": relatorio.aprovavel,
                "origem": relatorio.origem, "mesa_id": relatorio.mesa_id,
                "contagens": relatorio.contagens,
                "registros": [asdict(item) for item in relatorio.registros],
            }, ensure_ascii=False, indent=2))
            registrar("migracao", etapa="json_e_catalogos", aplicado=args.aplicar,
                      **relatorio.contagens)
    finally:
        if origem_sql is not None:
            origem_sql.dispose()
        destino.dispose()


if __name__ == "__main__":
    main()
