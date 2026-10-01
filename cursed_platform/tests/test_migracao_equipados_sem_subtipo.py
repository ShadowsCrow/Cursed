"""Migração 0021: itens equipados sem subtipo (de antes da grade) saem do banco com o que os cita."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, text

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


def _migrar(engine, alvo: str) -> None:
    config = Config(str(CONFIG))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, alvo)


def _item(c, id_: str, *, equipado: bool, subtipo: str | None) -> None:
    c.execute(text("INSERT INTO inventory_items (id, mesa_id, personagem_id, tipo, nome, quantidade, equipado, dados, subtipo) "
                   "VALUES (:id, 'm', 'p', 'armadura', :id, 1, :equipado, '{}', :subtipo)"),
              {"id": id_, "equipado": equipado, "subtipo": subtipo})


def _efeito(c, id_: str, item_id: str) -> None:
    c.execute(text("INSERT INTO character_effects (id, mesa_id, personagem_id, nome, descricao, versao, estado, conteudo) "
                   "VALUES (:id, 'm', 'p', :id, 'Efeito', 1, 'ativo', '{}')"), {"id": id_})
    c.execute(text("INSERT INTO effect_operations (id, efeito_id, tipo, alvo, valor) "
                   "VALUES (:op, :id, 'modificador', 'defesa:armadura', 1)"), {"op": f"op-{id_}", "id": id_})
    c.execute(text("INSERT INTO effect_sources (id, mesa_id, personagem_id, efeito_id, tipo, equipamento_id) "
                   "VALUES (:f, 'm', 'p', :id, 'equipamento', :item)"), {"f": f"f-{id_}", "id": id_, "item": item_id})


class MigracaoEquipadosSemSubtipoSqliteTest(unittest.TestCase):
    def setUp(self):
        self.diretorio = TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.diretorio.name) / 'legado.sqlite'}")

        @event.listens_for(self.engine, "connect")
        def _fk(conexao, _registro):
            conexao.execute("PRAGMA foreign_keys=ON")

        _migrar(self.engine, "0020_apresentacao_vista")
        with self.engine.begin() as c:
            c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                           "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
            c.execute(text("INSERT INTO table_memberships (mesa_id, usuario_id, papel) VALUES ('m', 'n', 'narrador')"))
            c.execute(text("INSERT INTO characters (id, mesa_id, proprietario_id, tipo, visibilidade, ficha, revelacao, versao) "
                           "VALUES ('p', 'm', 'n', 'personagem', 'mesa', '{}', '{}', 4)"))
            c.execute(text("INSERT INTO characters (id, mesa_id, proprietario_id, tipo, visibilidade, ficha, revelacao, versao) "
                           "VALUES ('q', 'm', 'n', 'personagem', 'mesa', '{}', '{}', 7)"))
            _item(c, "legado", equipado=True, subtipo=None)
            _item(c, "importado", equipado=False, subtipo=None)
            _item(c, "peitoral", equipado=True, subtipo="peitoral")
            _efeito(c, "e-legado", "legado")
            _efeito(c, "e-peitoral", "peitoral")
            c.execute(text("INSERT INTO card_definitions (id, mesa_id, tipo, criado_por) VALUES ('d', 'm', 'item', 'n')"))
            c.execute(text("INSERT INTO card_versions (id, mesa_id, definicao_id, numero, tipo, conteudo, procedencia, "
                           "revisao_pendente, publicado_por) VALUES ('v', 'm', 'd', 1, 'item', '{}', '{}', '[]', 'n')"))
            c.execute(text("INSERT INTO character_cards (id, mesa_id, personagem_id, definicao_id, versao_id, tipo, estado, "
                           "origem, item_id) VALUES ('c', 'm', 'p', 'd', 'v', 'item', 'no_inventario', 'concessao', 'legado')"))
            c.execute(text("INSERT INTO item_offers (id, mesa_id, item_id, de_personagem_id, para_personagem_id, estado) "
                           "VALUES ('o', 'm', 'legado', 'p', 'q', 'pendente')"))
        _migrar(self.engine, "0021_remover_equipados_sem_subtipo")

    def tearDown(self):
        self.engine.dispose()
        self.diretorio.cleanup()

    def consultar(self, sql: str) -> list:
        with self.engine.connect() as c:
            return [tuple(linha) for linha in c.execute(text(sql))]

    def test_so_o_equipado_sem_subtipo_sai(self):
        self.assertEqual(self.consultar("SELECT id FROM inventory_items ORDER BY id"), [("importado",), ("peitoral",)])

    def test_efeitos_do_item_removido_saem_com_operacoes_e_fontes(self):
        self.assertEqual(self.consultar("SELECT id FROM character_effects"), [("e-peitoral",)])
        self.assertEqual(self.consultar("SELECT efeito_id FROM effect_operations"), [("e-peitoral",)])
        self.assertEqual(self.consultar("SELECT efeito_id FROM effect_sources"), [("e-peitoral",)])

    def test_carta_removida_oferta_cancelada_e_versao_avancada(self):
        self.assertEqual(self.consultar("SELECT estado FROM character_cards"), [("removida",)])
        self.assertEqual(self.consultar("SELECT estado FROM item_offers"), [("cancelada",)])
        self.assertEqual(self.consultar("SELECT id, versao FROM characters ORDER BY id"), [("p", 5), ("q", 7)])


if __name__ == "__main__":
    unittest.main()
