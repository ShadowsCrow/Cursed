"""Migração 0017 (ficha completa): origem das cartas de catálogo, concessão por escolha e ícones por mesa."""

from __future__ import annotations

import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"
TABELAS_NOVAS = ("effect_icons",)


def _migrar(engine, alvo: str, descer: bool = False) -> None:
    config = Config(str(CONFIG))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        (command.downgrade if descer else command.upgrade)(config, alvo)


def _popular_antes(engine) -> None:
    with engine.begin() as c:
        for mesa in ("m", "outra"):
            c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                           "VALUES (:m, 'Mesa', 'n', '[]', '[]')"), {"m": mesa})
        c.execute(text("INSERT INTO card_definitions (id, mesa_id, tipo, criado_por) VALUES ('antiga', 'm', 'habilidade', 'n')"))


def _carta(c, id_: str, mesa: str = "m", origem: str | None = None) -> None:
    c.execute(text("INSERT INTO card_definitions (id, mesa_id, tipo, criado_por, origem_sistema) "
                   "VALUES (:id, :m, 'habilidade', 'n', :o)"), {"id": id_, "m": mesa, "o": origem})


class MigracaoFichaCompletaSqliteTest(unittest.TestCase):
    def setUp(self):
        self.diretorio = TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.diretorio.name) / 'ficha.sqlite'}")

        @event.listens_for(self.engine, "connect")
        def _fk(conexao, _registro):
            conexao.execute("PRAGMA foreign_keys=ON")

        _migrar(self.engine, "0016_carga_em_grade")
        _popular_antes(self.engine)
        _migrar(self.engine, "0017_ficha_completa")

    def tearDown(self):
        self.engine.dispose()
        self.diretorio.cleanup()

    def test_cartas_existentes_ficam_sem_origem_do_sistema(self):
        with self.engine.connect() as c:
            self.assertIsNone(c.execute(text("SELECT origem_sistema FROM card_definitions WHERE id = 'antiga'")).scalar())
        self.assertIn("concedida_por", {col["name"] for col in inspect(self.engine).get_columns("character_cards")})

    def test_origem_do_sistema_e_unica_por_mesa(self):
        origem = "classes/Druida/habilidades/Forma Selvagem"
        with self.engine.begin() as c:
            _carta(c, "a", origem=origem)
            _carta(c, "b", mesa="outra", origem=origem)
            _carta(c, "c")  # várias cartas sem origem do sistema convivem
        with self.assertRaises(IntegrityError), self.engine.begin() as c:
            _carta(c, "d", origem=origem)

    def test_icone_por_mesa_e_associacao(self):
        with self.engine.begin() as c:
            c.execute(text("INSERT INTO effect_icons (mesa_id, associacao, objeto) VALUES ('m', 'condicao_cego', 'x.webp')"))
            c.execute(text("INSERT INTO effect_icons (mesa_id, associacao, objeto) VALUES ('outra', 'condicao_cego', 'y.webp')"))
        with self.assertRaises(IntegrityError), self.engine.begin() as c:
            c.execute(text("INSERT INTO effect_icons (mesa_id, associacao, objeto) VALUES ('m', 'condicao_cego', 'z.webp')"))
        with self.assertRaises(IntegrityError), self.engine.begin() as c:
            c.execute(text("INSERT INTO effect_icons (mesa_id, associacao, objeto) VALUES ('nenhuma', 'condicao_cego', 'z.webp')"))

    def test_descida_preserva_cartas_e_remove_o_que_foi_criado(self):
        with self.engine.begin() as c:
            _carta(c, "materializada", origem="classes/Mago/habilidades/Mutações")
        _migrar(self.engine, "0016_carga_em_grade", descer=True)
        with self.engine.connect() as c:
            self.assertEqual(set(c.execute(text("SELECT id FROM card_definitions")).scalars()), {"antiga", "materializada"})
        self.assertNotIn("origem_sistema", {col["name"] for col in inspect(self.engine).get_columns("card_definitions")})
        self.assertNotIn("concedida_por", {col["name"] for col in inspect(self.engine).get_columns("character_cards")})
        self.assertFalse(set(TABELAS_NOVAS) & set(inspect(self.engine).get_table_names()))
        _migrar(self.engine, "0017_ficha_completa")


@unittest.skipUnless(os.environ.get("CURSED_TEST_POSTGRES_URL"), "Defina CURSED_TEST_POSTGRES_URL para o PostgreSQL.")
class MigracaoFichaCompletaPostgresTest(unittest.TestCase):
    def test_tabela_nova_com_rls_e_fechada_para_clientes(self):
        base = make_url(os.environ["CURSED_TEST_POSTGRES_URL"])
        banco = f"cursed_ficha_{uuid4().hex}"
        admin = create_engine(base, isolation_level="AUTOCOMMIT")
        with admin.connect() as c:
            c.execute(text(f'CREATE DATABASE "{banco}"'))
        engine = create_engine(base.set(database=banco))
        try:
            with engine.begin() as c:
                for papel in ("anon", "authenticated"):
                    c.exec_driver_sql(
                        f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{papel}') "
                        f"THEN CREATE ROLE {papel} NOLOGIN; END IF; END $$"
                    )
                c.exec_driver_sql("GRANT USAGE ON SCHEMA public TO anon, authenticated")
            _migrar(engine, "head")
            with engine.connect() as c:
                rls = dict(c.execute(text(
                    "SELECT relname, relrowsecurity FROM pg_class WHERE relname = ANY(:t)"
                ), {"t": list(TABELAS_NOVAS)}).all())
                self.assertEqual(rls, {t: True for t in TABELAS_NOVAS})
                for tabela in TABELAS_NOVAS:
                    for papel in ("anon", "authenticated"):
                        for privilegio in ("SELECT", "INSERT", "UPDATE", "DELETE"):
                            acesso = c.execute(text("SELECT has_table_privilege(:p, :t, :pr)"),
                                               {"p": papel, "t": f"public.{tabela}", "pr": privilegio}).scalar()
                            self.assertFalse(acesso, f"{papel} tem {privilegio} em {tabela}")
                indices = set(c.execute(text(
                    "SELECT indexname FROM pg_indexes WHERE tablename = 'card_definitions'"
                )).scalars())
                self.assertIn("uq_card_definitions_origem_sistema", indices)
            _migrar(engine, "0016_carga_em_grade", descer=True)
            self.assertNotIn("effect_icons", set(inspect(engine).get_table_names()))
        finally:
            engine.dispose()
            with admin.connect() as c:
                c.execute(text(f'DROP DATABASE IF EXISTS "{banco}" WITH (FORCE)'))
            admin.dispose()


if __name__ == "__main__":
    unittest.main()
