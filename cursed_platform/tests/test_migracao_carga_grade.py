"""Migração 0016 (carga em grade): colunas novas, restrições, dados existentes e descida sem perda."""

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
TABELAS_NOVAS = ("scene_stashes", "scene_stash_items", "item_offers")


def _migrar(engine, alvo: str, descer: bool = False) -> None:
    config = Config(str(CONFIG))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        (command.downgrade if descer else command.upgrade)(config, alvo)


def _popular_antes(engine) -> None:
    with engine.begin() as c:
        c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                       "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
        c.execute(text("INSERT INTO table_memberships (mesa_id, usuario_id, papel) VALUES ('m', 'n', 'narrador')"))
        c.execute(text("INSERT INTO characters (id, mesa_id, proprietario_id, tipo, visibilidade, ficha, revelacao) VALUES ('p', 'm', 'n', 'personagem', 'mesa', '{}', '{}')"))
        c.execute(text("INSERT INTO inventory_items (id, mesa_id, personagem_id, tipo, nome, quantidade, equipado, dados) "
                       "VALUES ('antigo', 'm', 'p', 'arma', 'Espada antiga', 1, 0, '{\"peso\": 3}')"))


def _inserir_item(c, id_: str, **colunas) -> None:
    base = {"id": id_, "mesa_id": "m", "personagem_id": "p", "tipo": "outro", "nome": id_,
            "quantidade": 1, "equipado": False, "dados": "{}"}
    base.update(colunas)
    nomes = ", ".join(base)
    marcadores = ", ".join(f":{k}" for k in base)
    c.execute(text(f"INSERT INTO inventory_items ({nomes}) VALUES ({marcadores})"), base)


class MigracaoCargaGradeSqliteTest(unittest.TestCase):
    def setUp(self):
        self.diretorio = TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.diretorio.name) / 'grade.sqlite'}")

        @event.listens_for(self.engine, "connect")
        def _fk(conexao, _registro):
            conexao.execute("PRAGMA foreign_keys=ON")

        _migrar(self.engine, "0015_ativos_legados")
        _popular_antes(self.engine)
        _migrar(self.engine, "0016_carga_em_grade")

    def tearDown(self):
        self.engine.dispose()
        self.diretorio.cleanup()

    def test_itens_existentes_ficam_sem_dimensao_e_fora_da_grade(self):
        with self.engine.connect() as c:
            linha = c.execute(text("SELECT largura, altura, coluna, linha, girado, dados FROM inventory_items WHERE id = 'antigo'")).one()
        self.assertEqual(tuple(linha[:5]), (None, None, None, None, False))
        self.assertIn("peso", linha[5])

    def test_mesa_ganha_moedas_por_pilha_padrao(self):
        with self.engine.connect() as c:
            self.assertEqual(c.execute(text("SELECT moedas_por_pilha FROM rpg_tables WHERE id = 'm'")).scalar(), 100)

    def test_colunas_novas_aceitam_itens_da_grade(self):
        with self.engine.begin() as c:
            _inserir_item(c, "escudo", tipo="armadura", subtipo="escudo", largura=2, altura=2, coluna=0, linha=0, maos=None)
            _inserir_item(c, "tocha", subtipo="outro", largura=1, altura=2, coluna=2, linha=0, maos=1, pilha_max=1)
        with self.engine.connect() as c:
            linhas = dict(c.execute(text("SELECT id, largura * altura FROM inventory_items WHERE largura IS NOT NULL")).all())
        self.assertEqual(linhas, {"escudo": 4, "tocha": 2})

    def test_tabelas_novas_e_restricoes(self):
        self.assertTrue(set(TABELAS_NOVAS) <= set(inspect(self.engine).get_table_names()))
        with self.assertRaises(IntegrityError), self.engine.begin() as c:
            c.execute(text("INSERT INTO item_offers (id, mesa_id, item_id, de_personagem_id, para_personagem_id) "
                           "VALUES ('o', 'm', 'i', 'p', 'p')"))

    def test_descida_preserva_itens_e_remove_o_que_foi_criado(self):
        with self.engine.begin() as c:
            _inserir_item(c, "escudo", tipo="armadura", subtipo="escudo", largura=2, altura=2, coluna=0, linha=0)
        _migrar(self.engine, "0015_ativos_legados", descer=True)
        with self.engine.connect() as c:
            self.assertEqual(set(c.execute(text("SELECT id FROM inventory_items")).scalars()), {"antigo", "escudo"})
        colunas = {col["name"] for col in inspect(self.engine).get_columns("inventory_items")}
        self.assertFalse({"largura", "coluna", "subtipo", "girado"} & colunas)
        self.assertNotIn("moedas_por_pilha", {col["name"] for col in inspect(self.engine).get_columns("rpg_tables")})
        self.assertFalse(set(TABELAS_NOVAS) & set(inspect(self.engine).get_table_names()))


@unittest.skipUnless(os.environ.get("CURSED_TEST_POSTGRES_URL"), "Defina CURSED_TEST_POSTGRES_URL para o PostgreSQL.")
class MigracaoCargaGradePostgresTest(unittest.TestCase):
    def test_tabelas_novas_com_rls_e_fechadas_para_clientes(self):
        base = make_url(os.environ["CURSED_TEST_POSTGRES_URL"])
        banco = f"cursed_grade_{uuid4().hex}"
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
                        acesso = c.execute(text("SELECT has_table_privilege(:p, :t, 'SELECT')"),
                                           {"p": papel, "t": f"public.{tabela}"}).scalar()
                        self.assertFalse(acesso, f"{papel} lê {tabela}")
                restricoes = set(c.execute(text(
                    "SELECT conname FROM pg_constraint WHERE conrelid = 'public.inventory_items'::regclass"
                )).scalars())
                self.assertTrue({"ck_inventory_items_dimensao", "ck_inventory_items_posicao", "ck_inventory_items_maos",
                                 "ck_inventory_items_subtipo", "ck_inventory_items_pilha"} <= restricoes)
                self.assertIn("ck_rpg_tables_moedas_por_pilha", set(c.execute(text(
                    "SELECT conname FROM pg_constraint WHERE conrelid = 'public.rpg_tables'::regclass"
                )).scalars()))
            _migrar(engine, "0015_ativos_legados", descer=True)
        finally:
            engine.dispose()
            with admin.connect() as c:
                c.execute(text(f'DROP DATABASE IF EXISTS "{banco}" WITH (FORCE)'))
            admin.dispose()


if __name__ == "__main__":
    unittest.main()
