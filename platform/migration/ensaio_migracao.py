"""Ensaio isolado sobre backup SQLite e banco PostgreSQL descartável.

Não escreve na origem nem no projeto Supabase. Remove o banco de ensaio e o
backup temporário ao final, inclusive quando uma etapa falha.
"""

from __future__ import annotations

import argparse
from collections import Counter
from contextlib import closing
import json
import os
from pathlib import Path
import shutil
import sqlite3
import sys
from tempfile import mkdtemp
from time import perf_counter
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
from cursed_platform.migracao_ativos import (  # noqa: E402
    ArmazenamentoLocal, migrar_ativos, migrar_ativos_catalogos,
)
from cursed_platform import catalogos  # noqa: E402
from cursed_platform.completar_fichas import completar  # noqa: E402
from cursed_platform.migracao_equivalencia import gerar_relatorio_equivalencia  # noqa: E402
from cursed_platform.migracao_json import migrar_json_catalogos  # noqa: E402
from cursed_platform.migracao_tabelas import migrar_tabelas  # noqa: E402
from cursed_platform.observabilidade import registrar  # noqa: E402
from cursed_platform.persistence import CartaPersonagemRegistro, MembroRegistro, MesaRegistro  # noqa: E402


def ensaiar(*, origem_sqlite: Path, postgres_admin_url: str, origem_id: str,
            mesa_id: str, fichas_dir: Path, catalogos_dir: Path) -> dict:
    dev = (RAIZ / "platform" / "api" / ".dev").resolve()
    dev.mkdir(parents=True, exist_ok=True)
    temporario = Path(mkdtemp(prefix="ensaio-migracao-", dir=dev)).resolve()
    if dev not in temporario.parents:
        raise RuntimeError("Diretório de ensaio fora da área local permitida.")
    banco = f"cursed_ensaio_{uuid4().hex}"
    admin = create_engine(make_url(postgres_admin_url), isolation_level="AUTOCOMMIT")
    destino = None
    origem = None
    banco_criado = False
    inicio = perf_counter()
    duracoes: dict[str, float] = {}
    resultado: dict = {"origem_id": origem_id, "mesa_id": mesa_id, "banco_descartavel": banco}
    try:
        copia = temporario / "origem.sqlite"
        comeco = perf_counter()
        with closing(sqlite3.connect(f"file:{origem_sqlite.resolve().as_posix()}?mode=ro", uri=True)) as entrada:
            with closing(sqlite3.connect(copia)) as saida:
                entrada.backup(saida)
        duracoes["backup"] = round(perf_counter() - comeco, 3)
        origem = create_engine(f"sqlite:///{copia.as_posix()}")

        comeco = perf_counter()
        with admin.connect() as conexao:
            conexao.execute(text(f'CREATE DATABASE "{banco}"'))
        banco_criado = True
        destino = create_engine(make_url(postgres_admin_url).set(database=banco))
        config = Config(str(RAIZ / "platform" / "migration" / "alembic.ini"))
        with destino.begin() as conexao:
            config.attributes["connection"] = conexao
            command.upgrade(config, "head")
        with Session(destino) as session:
            session.add(MesaRegistro(id=mesa_id, nome="Mesa de ensaio", narrador_id="narrador-ensaio"))
            session.flush()
            session.add(MembroRegistro(mesa_id=mesa_id, usuario_id="narrador-ensaio", papel="narrador"))
            session.commit()
        duracoes["preparacao_postgresql"] = round(perf_counter() - comeco, 3)

        comeco = perf_counter()
        with Session(destino) as session:
            tabelas = migrar_tabelas(origem, session, origem=origem_id, mesa_id=mesa_id)
            session.commit()
        resultado["tabelas"] = {"convertidos": tabelas.convertidos, "existentes": tabelas.existentes}
        duracoes["tabelas"] = round(perf_counter() - comeco, 3)

        comeco = perf_counter()
        with Session(destino) as session:
            jsons = migrar_json_catalogos(session, origem=origem_id, mesa_id=mesa_id,
                fichas_dir=fichas_dir, catalogos_dir=catalogos_dir, origem_engine=origem)
            session.commit()
        resultado["json_e_catalogos"] = jsons.contagens
        resultado["pendencias_por_fonte"] = dict(Counter(
            item.fonte for item in jsons.registros if item.situacao == "pendente"))
        resultado["rejeicoes_por_fonte"] = dict(Counter(
            item.fonte for item in jsons.registros if item.situacao == "rejeitado"))
        duracoes["json_e_catalogos"] = round(perf_counter() - comeco, 3)

        comeco = perf_counter()
        with Session(destino) as session:
            armazenamento = ArmazenamentoLocal(temporario / "objetos")
            previa = migrar_ativos(session, armazenamento,
                                   origem=origem_id, mesa_id=mesa_id)
            resultado["ativos"] = {"encontrados": previa.encontrados,
                                  "rejeitados": len(previa.rejeitados)}
            if not previa.rejeitados:
                aplicados = migrar_ativos(session, armazenamento,
                                          origem=origem_id, mesa_id=mesa_id, aplicar=True)
                session.commit()
                resultado["ativos"].update({"criados": aplicados.criados,
                                            "reutilizados": aplicados.reutilizados})
            else:
                session.rollback()
            previa_catalogos = migrar_ativos_catalogos(
                session, armazenamento, origem=origem_id, mesa_id=mesa_id,
                catalogos_dir=catalogos_dir,
                icons_dir=RAIZ / "app_streamlit" / "data" / "assets" / "effects-icons",
                origem_engine=origem,
            )
            resultado["ativos_catalogos"] = {
                "encontrados": previa_catalogos.encontrados,
                "rejeitados": len(previa_catalogos.rejeitados),
            }
            if not previa_catalogos.rejeitados:
                aplicados_catalogos = migrar_ativos_catalogos(
                    session, armazenamento, origem=origem_id, mesa_id=mesa_id,
                    catalogos_dir=catalogos_dir,
                    icons_dir=RAIZ / "app_streamlit" / "data" / "assets" / "effects-icons",
                    origem_engine=origem, aplicar=True,
                )
                session.commit()
                resultado["ativos_catalogos"].update({
                    "criados": aplicados_catalogos.criados,
                    "reutilizados": aplicados_catalogos.reutilizados,
                })
            else:
                session.rollback()
        duracoes["ativos"] = round(perf_counter() - comeco, 3)

        comeco = perf_counter()
        with Session(destino) as session:
            equivalencia = gerar_relatorio_equivalencia(session, origem=origem_id,
                mesa_id=mesa_id, origem_engine=origem, fichas_dir=fichas_dir,
                catalogos_dir=catalogos_dir)
            session.rollback()
        resultado["equivalencia"] = {
            "aprovavel": equivalencia.aprovavel,
            "contagens": equivalencia.contagens,
            "divergencias_por_motivo": dict(Counter(item["motivo"] for item in equivalencia.divergencias)),
            "pendencias_por_motivo": dict(Counter(item["motivo"] for item in equivalencia.pendencias)),
        }
        duracoes["equivalencia"] = round(perf_counter() - comeco, 3)

        # Depois da equivalência (que compara a importação com a origem), a ficha é completada:
        # nível, PV/PP, vínculo com o catálogo e cartas de classe (calcular-valores-da-ficha, 8.1).
        comeco = perf_counter()
        catalogo = catalogos.obter()
        with Session(destino) as session:
            previa_fichas = completar(session, mesa_id, catalogo)
            session.rollback()
            aplicado_fichas = completar(session, mesa_id, catalogo, aplicar=True)
            session.commit()
            repeticao_fichas = completar(session, mesa_id, catalogo, aplicar=True)
            session.commit()
            cartas_concedidas = session.scalar(select(func.count()).select_from(CartaPersonagemRegistro).where(
                CartaPersonagemRegistro.concedida_por.is_not(None)))
        resultado["completar_fichas"] = {
            "previa": previa_fichas.contagens(),
            "aplicado": aplicado_fichas.contagens(),
            "repeticao_alteradas": repeticao_fichas.contagens()["alteradas"],
            "cartas_de_catalogo_concedidas": cartas_concedidas,
            "sinalizacoes": [s for f in aplicado_fichas.fichas for s in f.sinalizacoes],
            "erros": [e for f in aplicado_fichas.fichas for e in f.erros],
        }
        duracoes["completar_fichas"] = round(perf_counter() - comeco, 3)
    finally:
        if origem is not None:
            origem.dispose()
        if destino is not None:
            destino.dispose()
        if banco_criado:
            if not banco.startswith("cursed_ensaio_"):
                raise RuntimeError("Recusa remover banco fora do prefixo de ensaio.")
            with admin.connect() as conexao:
                conexao.execute(text(f'DROP DATABASE "{banco}" WITH (FORCE)'))
            resultado["rollback_banco_confirmado"] = True
        admin.dispose()
        if dev not in temporario.parents:
            raise RuntimeError("Recusa remover diretório fora da área local permitida.")
        shutil.rmtree(temporario)
        resultado["backup_temporario_removido"] = not temporario.exists()
        resultado["duracao_total_segundos"] = round(perf_counter() - inicio, 3)
        resultado["duracoes_segundos"] = duracoes
    return resultado


def main() -> None:
    parser = argparse.ArgumentParser(description="Ensaiar migração em cópias descartáveis.")
    parser.add_argument("--origem-sqlite", type=Path, required=True)
    parser.add_argument("--origem-id", required=True)
    parser.add_argument("--mesa-id", required=True)
    parser.add_argument("--fichas-dir", type=Path,
                        default=RAIZ / "app_streamlit" / "storage" / "legacy-sheets" / "fichas")
    parser.add_argument("--catalogos-dir", type=Path,
                        default=RAIZ / "app_streamlit" / "data" / "catalogs")
    args = parser.parse_args()
    admin_url = os.environ.get("CURSED_TEST_POSTGRES_URL")
    if not admin_url:
        parser.error("Defina CURSED_TEST_POSTGRES_URL para um PostgreSQL descartável.")
    resultado = ensaiar(origem_sqlite=args.origem_sqlite, postgres_admin_url=admin_url,
        origem_id=args.origem_id, mesa_id=args.mesa_id, fichas_dir=args.fichas_dir,
        catalogos_dir=args.catalogos_dir)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    registrar("migracao", etapa="ensaio", aplicado=False,
              duracao_ms=round(resultado["duracao_total_segundos"] * 1000, 2),
              aprovavel=resultado["equivalencia"]["aprovavel"],
              pendentes=resultado["json_e_catalogos"]["pendente"],
              rejeitados=resultado["json_e_catalogos"]["rejeitado"])


if __name__ == "__main__":
    main()
