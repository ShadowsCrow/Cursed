"""Migração 0031 do uso de cartas (cartas-na-cena, tarefa 1.1)."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"
ACOES = ("acao_padrao_gasta", "acao_bonus_gasta", "reacao_gasta")


class MigracaoUsoDeCartasSqliteTest(unittest.TestCase):
    def test_cria_tabela_colunas_e_remove(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'usos.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0031_uso_de_cartas")
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    c.execute(text("INSERT INTO card_uses (mesa_id, autor_id, personagem_id, versao_id, titulo, custo_pago, acao, alvos) "
                                   "VALUES ('m', 'ana', 'lion', 'v1', 'Lança de Fogo', 3, 'padrao', '[]')"))
                    self.assertEqual(c.execute(text("SELECT id, custo_pago FROM card_uses")).one(), (1, 3))
                    colunas = {col["name"]: col for col in inspect(c).get_columns("turn_participants")}
                    self.assertTrue(set(ACOES) <= set(colunas))
                    preferencias = {col["name"] for col in inspect(c).get_columns("room_preferences")}
                    self.assertIn("mao_dos_jogadores_visivel", preferencias)
                    c.execute(text("INSERT INTO turn_combats (id, mesa_id, cena_id, estado, aberto_em, aberto_por) "
                                   "VALUES ('c1', 'm', 'cena', 'combate', '2026-10-06 20:00:00', 'n')"))
                    c.execute(text("INSERT INTO turn_participants (id, combate_id, personagem_id, desempate) "
                                   "VALUES ('p1', 'c1', 'lion', '[]')"))
                    self.assertEqual(c.execute(text("SELECT acao_padrao_gasta, reacao_gasta FROM turn_participants")).one(), (0, 0))
                with self.assertRaises(IntegrityError), engine.begin() as c:
                    c.execute(text("INSERT INTO card_uses (mesa_id, autor_id, personagem_id, versao_id, titulo, custo_pago, acao, alvos) "
                                   "VALUES ('m', 'ana', 'lion', 'v1', 'X', 1, 'completa', '[]')"))
                with self.assertRaises(IntegrityError), engine.begin() as c:
                    c.execute(text("INSERT INTO card_uses (mesa_id, autor_id, personagem_id, versao_id, titulo, custo_pago, acao, alvos) "
                                   "VALUES ('m', 'ana', 'lion', 'v1', 'X', -1, 'padrao', '[]')"))
                with engine.begin() as c:
                    command.downgrade(config(c), "0030_token_proprio_no_turno")
                self.assertNotIn("card_uses", inspect(engine).get_table_names())
                self.assertFalse(set(ACOES) & {col["name"] for col in inspect(engine).get_columns("turn_participants")})
                self.assertNotIn("mao_dos_jogadores_visivel", {col["name"] for col in inspect(engine).get_columns("room_preferences")})
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
