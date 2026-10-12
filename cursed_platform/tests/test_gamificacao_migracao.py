"""Migração 0027 da gamificação da Sala (gamificacao-da-sala, tarefa 3.1)."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


class MigracaoGamificacaoSqliteTest(unittest.TestCase):
    def test_cria_e_remove_tabelas_e_colunas(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'gamificacao.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0027_gamificacao_da_sala")
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    c.execute(text("INSERT INTO room_preferences (mesa_id, alterada_em, alterada_por) "
                                   "VALUES ('m', '2026-10-04 20:00:00', 'n')"))
                    self.assertEqual(c.execute(text("SELECT destaque_criticos, estatisticas_visiveis FROM room_preferences")).one(),
                                     (0, 0))
                    c.execute(text("INSERT INTO mvp_rounds (id, mesa_id, estado, aberta_em, aberta_por) "
                                   "VALUES ('v1', 'm', 'aberta', '2026-10-04 20:00:00', 'n')"))
                    colunas = {col["name"] for col in inspect(c).get_columns("dice_rolls")}
                    self.assertTrue({"sessao_id", "marcas"} <= colunas)
                with self.assertRaises(IntegrityError), engine.begin() as c:
                    c.execute(text("INSERT INTO mvp_rounds (id, mesa_id, estado, aberta_em, aberta_por) "
                                   "VALUES ('v2', 'm', 'desempate', '2026-10-04 20:01:00', 'n')"))
                with self.assertRaises(IntegrityError), engine.begin() as c:
                    c.execute(text("INSERT INTO mvp_votes (votacao_id, eleitor_id, candidato_id, votado_em) "
                                   "VALUES ('v1', 'ana', 'ana', '2026-10-04 20:01:00')"))
                with engine.begin() as c:
                    c.execute(text("UPDATE mvp_rounds SET estado = 'encerrada'"))
                    c.execute(text("INSERT INTO mvp_rounds (id, mesa_id, estado, aberta_em, aberta_por) "
                                   "VALUES ('v2', 'm', 'aberta', '2026-10-04 20:02:00', 'n')"))
                with engine.begin() as c:
                    command.downgrade(config(c), "0026_musica_da_sala")
                tabelas = set(inspect(engine).get_table_names())
                self.assertFalse({"room_preferences", "mvp_rounds", "mvp_votes"} & tabelas)
                self.assertFalse({"sessao_id", "marcas"} & {col["name"] for col in inspect(engine).get_columns("dice_rolls")})
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
