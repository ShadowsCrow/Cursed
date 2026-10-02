"""Migração 0022: habilidades e magias no formato do Framework (adaptar-cartas-ao-framework, 6.1)."""

from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


def _config(connection) -> Config:
    config = Config(str(CONFIG))
    config.attributes["connection"] = connection
    return config


class MigracaoCartasFrameworkSqliteTest(unittest.TestCase):
    def setUp(self):
        self.diretorio = TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.diretorio.name) / 'cartas.sqlite'}")
        with self.engine.begin() as c:
            command.upgrade(_config(c), "0021_remover_equipados_sem_subtipo")
            c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                           "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
            cartas = {
                "magia": ("magia", {"titulo": "Bola", "texto": "x", "escola": "elemental", "grau": 2, "descansos_minimos": 1,
                                    "custo_aprendizado": 13, "ativacao": "ativa"}),
                "passiva": ("habilidade", {"titulo": "Pele", "texto": "x", "ativacao": "passiva", "descansos_minimos": 3,
                                           "custo_aprendizado": 7}),
                "item": ("item", {"titulo": "Espada", "texto": "x", "grau": 1}),
            }
            for id_, (tipo, conteudo) in cartas.items():
                rascunho = json.dumps({"conteudo": conteudo, "procedencia": {"origem": "narrador"}})
                c.execute(text("INSERT INTO card_definitions (id, mesa_id, tipo, criado_por, rascunho) VALUES (:id, 'm', :tipo, 'n', :r)"),
                          {"id": id_, "tipo": tipo, "r": rascunho})
                c.execute(text("INSERT INTO card_versions (id, mesa_id, definicao_id, numero, tipo, conteudo, procedencia, "
                               "revisao_pendente, publicado_por) VALUES (:v, 'm', :id, 1, :tipo, :c, '{}', '[]', 'n')"),
                          {"v": f"v-{id_}", "id": id_, "tipo": tipo, "c": json.dumps(conteudo)})
        with self.engine.begin() as c, self.assertLogs("alembic.runtime.migration", "INFO") as self.log:
            command.upgrade(_config(c), "0022_cartas_campos_do_framework")

    def tearDown(self):
        self.engine.dispose()
        self.diretorio.cleanup()

    def conteudo(self, id_: str) -> tuple[dict, dict]:
        with self.engine.connect() as c:
            versao = json.loads(c.execute(text("SELECT conteudo FROM card_versions WHERE id = :v"), {"v": f"v-{id_}"}).scalar())
            rascunho = json.loads(c.execute(text("SELECT rascunho FROM card_definitions WHERE id = :id"), {"id": id_}).scalar())
        return versao, rascunho["conteudo"]

    def test_grau_e_descansos_saem_dos_rascunhos(self):
        _, rascunho = self.conteudo("magia")
        self.assertNotIn("grau", rascunho)
        self.assertNotIn("descansos_minimos", rascunho)
        self.assertEqual((rascunho["escola"], rascunho["custo_aprendizado"], rascunho["ativacao"]), ("elemental", 13, "ativa"))

    def test_versoes_publicadas_continuam_imutaveis(self):
        versao, _ = self.conteudo("magia")
        self.assertEqual((versao["grau"], versao["descansos_minimos"]), (2, 1))
        versao, _ = self.conteudo("passiva")
        self.assertEqual(versao["ativacao"], "passiva")

    def test_passiva_vai_para_o_legado(self):
        _, rascunho = self.conteudo("passiva")
        self.assertEqual((rascunho["ativacao"], rascunho["ativacao_legado"]), (None, "passiva"))

    def test_itens_nao_mudam(self):
        for conteudo in self.conteudo("item"):
            self.assertEqual(conteudo["grau"], 1)

    def test_log_com_as_cartas_alteradas_e_a_divergencia(self):
        texto = "\n".join(self.log.output)
        self.assertIn("rascunho magia: grau=2, descansos_minimos=1, descansos diferentes do cálculo (3)", texto)
        self.assertIn("rascunho passiva: descansos_minimos=3, ativacao=passiva", texto)
        self.assertNotIn("rascunho item", texto)

    def test_descida_devolve_a_passiva(self):
        with self.engine.begin() as c:
            command.downgrade(_config(c), "0021_remover_equipados_sem_subtipo")
        _, rascunho = self.conteudo("passiva")
        self.assertEqual(rascunho["ativacao"], "passiva")
        self.assertNotIn("ativacao_legado", rascunho)
        _, rascunho = self.conteudo("magia")
        self.assertNotIn("grau", rascunho)


if __name__ == "__main__":
    unittest.main()
