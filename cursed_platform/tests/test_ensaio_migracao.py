"""O ensaio usa cópias e confirma a remoção do banco descartável."""

from __future__ import annotations

import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

from sqlalchemy import JSON, Column, Integer, MetaData, String, Table, create_engine, text

from cursed_platform.migracao_json import CATALOGOS


RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "platform" / "migration"))
from ensaio_migracao import ensaiar  # noqa: E402


@unittest.skipUnless(os.environ.get("CURSED_TEST_POSTGRES_URL"), "Requer PostgreSQL descartável.")
class EnsaioMigracaoTest(unittest.TestCase):
    def test_copia_rollback_e_remocao_do_banco(self):
        dev = (RAIZ / "platform" / "api" / ".dev").resolve()
        dev.mkdir(parents=True, exist_ok=True)
        with TemporaryDirectory(dir=dev) as diretorio:
            raiz = Path(diretorio).resolve()
            self.assertIn(dev, raiz.parents)
            origem = raiz / "legado.sqlite"
            engine = create_engine(f"sqlite:///{origem.as_posix()}")
            meta = MetaData()
            Table("fichas", meta, Column("id", Integer, primary_key=True),
                Column("nome", String), Column("personagem", JSON), Column("personalidade", JSON),
                Column("atributos", JSON), Column("pericias", JSON))
            for nome in ("ficha_armas", "ficha_armaduras", "ficha_outros", "ficha_efeitos_externos"):
                Table(nome, meta, Column("id", Integer, primary_key=True), Column("ficha_id", Integer),
                      Column("ordem", Integer), Column("dados", JSON))
            Table("equipment_library", meta, Column("id", Integer, primary_key=True),
                  Column("tipo", String), Column("dados", JSON))
            Table("effects_library", meta, Column("id", Integer, primary_key=True), Column("dados", JSON))
            meta.create_all(engine)
            engine.dispose()
            fichas = raiz / "fichas"
            catalogos = raiz / "catalogos"
            fichas.mkdir()
            catalogos.mkdir()
            for nome in CATALOGOS:
                (catalogos / nome).write_text("[]", encoding="utf-8")
            resultado = ensaiar(origem_sqlite=origem,
                postgres_admin_url=os.environ["CURSED_TEST_POSTGRES_URL"], origem_id="teste",
                mesa_id="mesa-ensaio", fichas_dir=fichas, catalogos_dir=catalogos)
            self.assertTrue(resultado["rollback_banco_confirmado"])
            self.assertTrue(resultado["backup_temporario_removido"])
            self.assertTrue(resultado["equivalencia"]["aprovavel"])
            admin = create_engine(os.environ["CURSED_TEST_POSTGRES_URL"])
            try:
                with admin.connect() as conexao:
                    existe = conexao.execute(text("SELECT 1 FROM pg_database WHERE datname = :banco"),
                                             {"banco": resultado["banco_descartavel"]}).scalar()
                self.assertIsNone(existe)
            finally:
                admin.dispose()


if __name__ == "__main__":
    unittest.main()
