"""Migração 0028 do modo turno (modo-de-turno, tarefa 1.1)."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


class MigracaoTurnoSqliteTest(unittest.TestCase):
    def test_cria_e_remove_tabelas_e_coluna(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'turno.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0028_modo_de_turno")
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    c.execute(text("INSERT INTO turn_combats (id, mesa_id, cena_id, estado, aberto_em, aberto_por) "
                                   "VALUES ('c1', 'm', 'cena', 'iniciativa', '2026-10-04 20:00:00', 'n')"))
                    c.execute(text("INSERT INTO turn_participants (id, combate_id, personagem_id, desempate) "
                                   "VALUES ('p1', 'c1', 'lion', '[]')"))
                    self.assertEqual(c.execute(text("SELECT rodada FROM turn_combats")).scalar(), 0)
                    self.assertIn("finalidade", {col["name"] for col in inspect(c).get_columns("dice_rolls")})
                with self.assertRaises(IntegrityError), engine.begin() as c:
                    c.execute(text("INSERT INTO turn_combats (id, mesa_id, cena_id, estado, aberto_em, aberto_por) "
                                   "VALUES ('c2', 'm', 'cena', 'combate', '2026-10-04 20:01:00', 'n')"))
                with self.assertRaises(IntegrityError), engine.begin() as c:
                    c.execute(text("INSERT INTO turn_participants (id, combate_id, personagem_id, desempate) "
                                   "VALUES ('p2', 'c1', 'lion', '[]')"))
                with engine.begin() as c:
                    c.execute(text("UPDATE turn_combats SET estado = 'encerrado'"))
                    c.execute(text("INSERT INTO turn_combats (id, mesa_id, cena_id, estado, aberto_em, aberto_por) "
                                   "VALUES ('c2', 'm', 'cena', 'iniciativa', '2026-10-04 20:02:00', 'n')"))
                with engine.begin() as c:
                    command.downgrade(config(c), "0027_gamificacao_da_sala")
                self.assertFalse({"turn_combats", "turn_participants"} & set(inspect(engine).get_table_names()))
                self.assertNotIn("finalidade", {col["name"] for col in inspect(engine).get_columns("dice_rolls")})
            finally:
                engine.dispose()

    def test_0030_token_proprio(self):
        """Com a 0030, a mesma ficha pode ter o grupo e vários tokens próprios, mas cada token uma vez só."""
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'turno.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0030_token_proprio_no_turno")
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    c.execute(text("INSERT INTO turn_combats (id, mesa_id, cena_id, estado, aberto_em, aberto_por) "
                                   "VALUES ('c1', 'm', 'cena', 'iniciativa', '2026-10-05 20:00:00', 'n')"))
                    for pid, token in (("p1", None), ("p2", "t2"), ("p3", "t3")):
                        c.execute(text("INSERT INTO turn_participants (id, combate_id, personagem_id, token_id, desempate) "
                                       "VALUES (:id, 'c1', 'goblin', :token, '[]')"), {"id": pid, "token": token})
                with self.assertRaises(IntegrityError), engine.begin() as c:
                    c.execute(text("INSERT INTO turn_participants (id, combate_id, personagem_id, token_id, desempate) "
                                   "VALUES ('p4', 'c1', 'goblin', 't2', '[]')"))
                with engine.begin() as c:
                    command.downgrade(config(c), "0029_deslocamento_no_turno")
                    self.assertEqual(c.execute(text("SELECT id FROM turn_participants")).scalars().all(), ["p1"])
                self.assertNotIn("token_id", {col["name"] for col in inspect(engine).get_columns("turn_participants")})
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
