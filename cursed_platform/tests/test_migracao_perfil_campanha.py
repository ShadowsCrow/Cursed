"""Migração 0018 (perfil e campanha): apelido e foto, apresentação da campanha e procedência."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, inspect, text

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"
NOVAS = {
    "user_profiles": {"apelido", "foto_objeto", "perfil_confirmado_em"},
    "rpg_tables": {"sinopse", "capa_objeto", "sistema"},
    "characters": {"procedencia"},
}


def _migrar(engine, alvo: str, descer: bool = False) -> None:
    config = Config(str(CONFIG))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        (command.downgrade if descer else command.upgrade)(config, alvo)


def _colunas(engine, tabela: str) -> set[str]:
    return {col["name"] for col in inspect(engine).get_columns(tabela)}


class MigracaoPerfilCampanhaSqliteTest(unittest.TestCase):
    def setUp(self):
        self.diretorio = TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.diretorio.name) / 'perfil.sqlite'}")

        @event.listens_for(self.engine, "connect")
        def _fk(conexao, _registro):
            conexao.execute("PRAGMA foreign_keys=ON")

        _migrar(self.engine, "0017_ficha_completa")
        with self.engine.begin() as c:
            c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                           "VALUES ('m', 'Mesa antiga', 'n', '[]', '[]')"))
            c.execute(text("INSERT INTO table_memberships (mesa_id, usuario_id, papel) VALUES ('m', 'n', 'narrador')"))
            c.execute(text("INSERT INTO characters (id, mesa_id, proprietario_id, tipo, visibilidade, ficha, revelacao) "
                           "VALUES ('p', 'm', NULL, 'npc', 'narrador', '{\"personagem\": {\"nome\": \"Velho\"}}', '{}')"))
            c.execute(text("INSERT INTO user_profiles (usuario_id, nome) VALUES ('n', 'Narradora')"))
        _migrar(self.engine, "0018_perfil_e_campanha")

    def tearDown(self):
        self.engine.dispose()
        self.diretorio.cleanup()

    def test_colunas_novas_existem(self):
        for tabela, colunas in NOVAS.items():
            self.assertLessEqual(colunas, _colunas(self.engine, tabela), tabela)

    def test_dados_existentes_ficam_intactos_com_padroes(self):
        with self.engine.connect() as c:
            mesa = c.execute(text("SELECT nome, sistema, sinopse, capa_objeto FROM rpg_tables WHERE id = 'm'")).one()
            self.assertEqual(tuple(mesa), ("Mesa antiga", "cursed", None, None))
            perfil = c.execute(text("SELECT nome, apelido, foto_objeto, perfil_confirmado_em FROM user_profiles")).one()
            self.assertEqual(tuple(perfil), ("Narradora", None, None, None))
            personagem = c.execute(text("SELECT ficha, procedencia FROM characters WHERE id = 'p'")).one()
            self.assertIn("Velho", personagem[0])
            self.assertIsNone(personagem[1])

    def test_mesa_nova_recebe_sistema_cursed(self):
        with self.engine.begin() as c:
            c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                           "VALUES ('nova', 'Nova', 'n', '[]', '[]')"))
            self.assertEqual(c.execute(text("SELECT sistema FROM rpg_tables WHERE id = 'nova'")).scalar(), "cursed")

    def test_descida_remove_colunas_e_preserva_dados(self):
        _migrar(self.engine, "0017_ficha_completa", descer=True)
        for tabela, colunas in NOVAS.items():
            self.assertFalse(colunas & _colunas(self.engine, tabela), tabela)
        with self.engine.connect() as c:
            self.assertEqual(c.execute(text("SELECT nome FROM rpg_tables WHERE id = 'm'")).scalar(), "Mesa antiga")
            self.assertEqual(c.execute(text("SELECT count(*) FROM characters")).scalar(), 1)
        _migrar(self.engine, "0018_perfil_e_campanha")


if __name__ == "__main__":
    unittest.main()
