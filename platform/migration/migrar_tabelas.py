"""Execução controlada da migração das tabelas legadas de fichas.

Exemplo: definir CURSED_LEGACY_DATABASE_URL e CURSED_PLATFORM_DATABASE_URL,
depois executar `python platform/migration/migrar_tabelas.py --origem-id copia-2026-09 --mesa-id ...`.
Sem `--aplicar`, a operação é uma prévia transacional revertida ao final.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from cursed_platform.migracao_tabelas import migrar_tabelas  # noqa: E402
from cursed_platform.observabilidade import registrar  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrar fichas e tabelas filhas do Streamlit.")
    parser.add_argument("--origem-id", required=True, help="Identidade estável desta base de origem, sem senha ou URL.")
    parser.add_argument("--mesa-id", required=True, help="Mesa de destino já criada.")
    parser.add_argument("--aplicar", action="store_true", help="Confirmar a transação; sem esta opção, reverter após a prévia.")
    args = parser.parse_args()
    origem_url = os.environ.get("CURSED_LEGACY_DATABASE_URL")
    destino_url = os.environ.get("CURSED_PLATFORM_DATABASE_URL")
    if not origem_url or not destino_url:
        parser.error("Defina CURSED_LEGACY_DATABASE_URL e CURSED_PLATFORM_DATABASE_URL.")
    origem = create_engine(origem_url)
    destino = create_engine(destino_url)
    try:
        with Session(destino) as session:
            relatorio = migrar_tabelas(origem, session, origem=args.origem_id, mesa_id=args.mesa_id)
            if args.aplicar:
                session.commit()
            else:
                session.rollback()
            print(json.dumps({
                "aplicado": args.aplicar, "origem": relatorio.origem,
                "versao_origem": relatorio.versao_origem, "mesa_id": relatorio.mesa_id,
                "convertidos": relatorio.convertidos, "existentes": relatorio.existentes,
            }, ensure_ascii=False, sort_keys=True))
            registrar("migracao", etapa="tabelas", aplicado=args.aplicar,
                      convertidos=sum(relatorio.convertidos.values()),
                      existentes=sum(relatorio.existentes.values()))
    finally:
        origem.dispose()
        destino.dispose()


if __name__ == "__main__":
    main()
