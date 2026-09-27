"""Prévia e aplicação do complemento das fichas de uma mesa (calcular-valores-da-ficha, 8.1).

Uso:
    CURSED_PLATFORM_DATABASE_URL=... python platform/migration/completar_fichas.py --mesa-id <id>
    CURSED_PLATFORM_DATABASE_URL=... python platform/migration/completar_fichas.py --mesa-id <id> --aplicar

Sem ``--aplicar``, mostra o que mudaria e não grava nada.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import time

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from cursed_platform import catalogos  # noqa: E402
from cursed_platform.completar_fichas import completar  # noqa: E402
from cursed_platform.observabilidade import registrar  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Completar as fichas de uma mesa: nível, PV/PP, catálogo e cartas de classe.")
    parser.add_argument("--mesa-id", required=True)
    parser.add_argument("--aplicar", action="store_true")
    args = parser.parse_args()
    destino_url = os.environ.get("CURSED_PLATFORM_DATABASE_URL")
    if not destino_url:
        parser.error("Defina CURSED_PLATFORM_DATABASE_URL.")
    engine = create_engine(destino_url)
    inicio = time.perf_counter()
    try:
        with Session(engine) as session:
            relatorio = completar(session, args.mesa_id, catalogos.obter(), aplicar=args.aplicar)
            if args.aplicar:
                session.commit()
            else:
                session.rollback()
    finally:
        engine.dispose()
    duracao = round(time.perf_counter() - inicio, 3)
    registrar("migracao", etapa="completar_fichas", mesa_id=args.mesa_id, aplicado=args.aplicar,
              duracao_s=duracao, **relatorio.contagens())
    print(json.dumps({
        "mesa_id": relatorio.mesa_id, "aplicado": relatorio.aplicado, "duracao_s": duracao,
        "contagens": relatorio.contagens(), "ignoradas": relatorio.ignoradas,
        "fichas": [
            {"personagem_id": f.personagem_id, "nome": f.nome, "alteracoes": f.alteracoes,
             "sinalizacoes": f.sinalizacoes, "erros": f.erros, "cartas_previstas": f.cartas_previstas}
            for f in relatorio.fichas
        ],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
