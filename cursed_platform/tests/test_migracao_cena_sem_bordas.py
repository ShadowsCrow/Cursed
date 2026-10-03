"""Migração 0023: a cena não tem bordas, só o limite de sanidade de ±2000 casas (experiencia-da-mesa, item 7)."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


def _config(connection) -> Config:
    config = Config(str(CONFIG))
    config.attributes["connection"] = connection
    return config


def _token(conexao, id_: str, x: int, y: int) -> None:
    conexao.execute(text("INSERT INTO scene_tokens (id, mesa_id, cena_id, camada_id, rotulo, x, y, controladores) "
                         "VALUES (:id, 'm', 'c', 'l', 'Peça', :x, :y, '[]')"), {"id": id_, "x": x, "y": y})


class MigracaoCenaSemBordasSqliteTest(unittest.TestCase):
    def setUp(self):
        self.diretorio = TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.diretorio.name) / 'sala.sqlite'}")
        with self.engine.begin() as c:
            command.upgrade(_config(c), "0022_cartas_campos_do_framework")
            c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                           "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
            c.execute(text("INSERT INTO scenes (id, mesa_id, nome, colunas, linhas) VALUES ('c', 'm', 'Pátio', 8, 6)"))
            c.execute(text("INSERT INTO scene_layers (id, mesa_id, cena_id, nome, visibilidade, ordem) "
                           "VALUES ('l', 'm', 'c', 'Tokens', 'mesa', 1)"))
            _token(c, "antigo", 2, 3)

    def tearDown(self):
        self.engine.dispose()
        self.diretorio.cleanup()

    def subir(self) -> None:
        with self.engine.begin() as c:
            command.upgrade(_config(c), "0023_cena_sem_bordas")

    def test_antes_da_migracao_coordenada_negativa_e_recusada(self):
        with self.assertRaises(IntegrityError), self.engine.begin() as c:
            _token(c, "negativo", -1, 0)

    def test_depois_aceita_negativos_e_alem_da_area_mas_recusa_alem_do_limite(self):
        self.subir()
        with self.engine.begin() as c:
            _token(c, "longe", 35, -4)
            _token(c, "canto", -2000, 2000)
        with self.assertRaises(IntegrityError), self.engine.begin() as c:
            _token(c, "absurdo", 2001, 0)
        with self.engine.connect() as c:
            self.assertEqual(c.execute(text("SELECT x, y FROM scene_tokens WHERE id = 'antigo'")).one(), (2, 3))

    def test_descida_volta_a_restricao_antiga_e_falha_com_token_negativo(self):
        self.subir()
        with self.engine.begin() as c:
            _token(c, "negativo", -3, 1)
        with self.assertRaises(RuntimeError), self.assertLogs("alembic.runtime.migration", "ERROR") as log, \
                self.engine.begin() as c:
            command.downgrade(_config(c), "0022_cartas_campos_do_framework")
        self.assertIn("1 token(s) em coordenada negativa", "\n".join(log.output))
        with self.engine.begin() as c:
            c.execute(text("DELETE FROM scene_tokens WHERE id = 'negativo'"))
            command.downgrade(_config(c), "0022_cartas_campos_do_framework")
        with self.assertRaises(IntegrityError), self.engine.begin() as c:
            _token(c, "de-novo", -1, 0)


if __name__ == "__main__":
    unittest.main()
