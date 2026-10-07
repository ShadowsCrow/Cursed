"""Migração 0033 da ordem de entrada no modo turno (cartas-na-cena, tarefa 1.2)."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


class MigracaoOrdemDeEntradaSqliteTest(unittest.TestCase):
    def test_cria_coluna_com_zero_e_remove(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'turno.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0032_instancias_de_personagem")
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    c.execute(text("INSERT INTO turn_combats (id, mesa_id, cena_id, estado, aberto_em, aberto_por) "
                                   "VALUES ('c1', 'm', 'cena', 'combate', '2026-10-06 20:00:00', 'n')"))
                    c.execute(text("INSERT INTO turn_participants (id, combate_id, personagem_id, desempate) "
                                   "VALUES ('antigo', 'c1', 'goblin', '[]')"))
                    command.upgrade(config(c), "0033_ordem_de_entrada_no_turno")
                    colunas = {col["name"]: col for col in inspect(c).get_columns("turn_participants")}
                    self.assertIn("ordem_de_entrada", colunas)
                    self.assertFalse(colunas["ordem_de_entrada"]["nullable"])
                    # A linha anterior à migração fica com 0; a nova grava a posição.
                    c.execute(text("INSERT INTO turn_participants (id, combate_id, personagem_id, token_id, desempate, ordem_de_entrada) "
                                   "VALUES ('novo', 'c1', 'goblin', 't2', '[]', 2)"))
                    self.assertEqual(c.execute(text("SELECT id, ordem_de_entrada FROM turn_participants ORDER BY ordem_de_entrada")).all(),
                                     [("antigo", 0), ("novo", 2)])
                with engine.begin() as c:
                    command.downgrade(config(c), "0032_instancias_de_personagem")
                self.assertNotIn("ordem_de_entrada", {col["name"] for col in inspect(engine).get_columns("turn_participants")})
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
