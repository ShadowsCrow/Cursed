"""Migração 0024: permissão de movimento dos tokens (experiencia-da-mesa, item 13)."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


def _config(connection) -> Config:
    config = Config(str(CONFIG))
    config.attributes["connection"] = connection
    return config


class MigracaoMovimentoDosTokensSqliteTest(unittest.TestCase):
    def setUp(self):
        self.diretorio = TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.diretorio.name) / 'sala.sqlite'}")
        with self.engine.begin() as c:
            command.upgrade(_config(c), "0023_cena_sem_bordas")
            c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                           "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
            c.execute(text("INSERT INTO scenes (id, mesa_id, nome, colunas, linhas) VALUES ('c', 'm', 'Pátio', 8, 6)"))
            c.execute(text("INSERT INTO scene_layers (id, mesa_id, cena_id, nome, visibilidade, ordem) "
                           "VALUES ('l', 'm', 'c', 'Tokens', 'mesa', 1)"))
            c.execute(text("INSERT INTO scene_tokens (id, mesa_id, cena_id, camada_id, rotulo, x, y, controladores) "
                           "VALUES ('antigo', 'm', 'c', 'l', 'Peça', 2, 3, '[]')"))

    def tearDown(self):
        self.engine.dispose()
        self.diretorio.cleanup()

    def test_tokens_existentes_ficam_liberados_e_a_descida_remove_a_coluna(self):
        with self.engine.begin() as c:
            command.upgrade(_config(c), "0024_movimento_dos_tokens")
        with self.engine.connect() as c:
            self.assertEqual(c.execute(text("SELECT movimento_liberado FROM scene_tokens WHERE id = 'antigo'")).scalar(), 1)
        with self.engine.begin() as c:
            command.downgrade(_config(c), "0023_cena_sem_bordas")
        colunas = {coluna["name"] for coluna in inspect(self.engine).get_columns("scene_tokens")}
        self.assertNotIn("movimento_liberado", colunas)


if __name__ == "__main__":
    unittest.main()
