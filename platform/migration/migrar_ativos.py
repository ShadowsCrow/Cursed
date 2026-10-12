"""Prévia e aplicação da extração de imagens de fichas legadas já migradas."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from cursed_platform.migracao_ativos import (  # noqa: E402
    ArmazenamentoLocal, ArmazenamentoSupabase, AtivoInvalido,
    migrar_ativos, migrar_ativos_catalogos,
)
from cursed_platform.observabilidade import registrar  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrair retratos e artes legadas para objetos privados.")
    parser.add_argument("--origem-id", required=True)
    parser.add_argument("--mesa-id", required=True)
    parser.add_argument("--aplicar", action="store_true")
    parser.add_argument("--diretorio-objetos", type=Path, help="Diretório local para ensaio; omita para Supabase.")
    parser.add_argument("--catalogos-dir", type=Path, default=Path("app_streamlit/data/catalogs"))
    parser.add_argument("--icons-dir", type=Path, default=Path("app_streamlit/data/assets/effects-icons"))
    args = parser.parse_args()
    destino_url = os.environ.get("CURSED_PLATFORM_DATABASE_URL")
    if not destino_url:
        parser.error("Defina CURSED_PLATFORM_DATABASE_URL.")
    if args.diretorio_objetos:
        armazenamento = ArmazenamentoLocal(args.diretorio_objetos)
    else:
        url = os.environ.get("CURSED_SUPABASE_URL", "")
        chave = os.environ.get("CURSED_SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not chave:
            parser.error("Defina CURSED_SUPABASE_URL e CURSED_SUPABASE_SERVICE_ROLE_KEY ou use --diretorio-objetos.")
        armazenamento = ArmazenamentoSupabase(url, chave)
    engine = create_engine(destino_url)
    origem_url = os.environ.get("CURSED_LEGACY_DATABASE_URL")
    origem_engine = create_engine(origem_url) if origem_url else None
    try:
        with Session(engine) as session:
            if args.aplicar:
                previa_personagens = migrar_ativos(session, armazenamento, origem=args.origem_id,
                                                    mesa_id=args.mesa_id)
                previa_catalogos = migrar_ativos_catalogos(
                    session, armazenamento, origem=args.origem_id, mesa_id=args.mesa_id,
                    catalogos_dir=args.catalogos_dir, icons_dir=args.icons_dir,
                    origem_engine=origem_engine,
                )
                if previa_personagens.rejeitados or previa_catalogos.rejeitados:
                    raise AtivoInvalido("Há imagens inválidas; examine a prévia antes de aplicar.")
            personagens = migrar_ativos(session, armazenamento, origem=args.origem_id,
                                         mesa_id=args.mesa_id, aplicar=args.aplicar)
            catalogos = migrar_ativos_catalogos(
                session, armazenamento, origem=args.origem_id, mesa_id=args.mesa_id,
                catalogos_dir=args.catalogos_dir, icons_dir=args.icons_dir,
                origem_engine=origem_engine, aplicar=args.aplicar,
            )
            if args.aplicar:
                session.commit()
            else:
                session.rollback()
            print(json.dumps({"aplicado": args.aplicar, "personagens": vars(personagens),
                              "catalogos": vars(catalogos)}, ensure_ascii=False))
            registrar("migracao", etapa="ativos", aplicado=args.aplicar,
                      encontrados=personagens.encontrados + catalogos.encontrados,
                      criados=personagens.criados + catalogos.criados,
                      reutilizados=personagens.reutilizados + catalogos.reutilizados,
                      rejeitados=len(personagens.rejeitados) + len(catalogos.rejeitados))
    finally:
        engine.dispose()
        if origem_engine is not None:
            origem_engine.dispose()


if __name__ == "__main__":
    main()
