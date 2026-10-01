"""Migração 0019 (reformular-visual-da-ficha): platina retirada, raridade, categoria e descrição dos itens."""

from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, text

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


def _migrar(engine, alvo: str, descer: bool = False) -> None:
    config = Config(str(CONFIG))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        (command.downgrade if descer else command.upgrade)(config, alvo)


def _item(c, id_: str, personagem: str, dados: dict, **colunas) -> None:
    base = {"id": id_, "mesa_id": "m", "personagem_id": personagem, "tipo": "outro", "nome": id_,
            "quantidade": 1, "equipado": False, "dados": json.dumps(dados)}
    base.update(colunas)
    c.execute(text(f"INSERT INTO inventory_items ({', '.join(base)}) VALUES ({', '.join(':' + k for k in base)})"), base)


class MigracaoMoedasRaridadeSqliteTest(unittest.TestCase):
    def setUp(self):
        self.diretorio = TemporaryDirectory()
        self.engine = create_engine(f"sqlite:///{Path(self.diretorio.name) / 'moedas.sqlite'}")

        @event.listens_for(self.engine, "connect")
        def _fk(conexao, _registro):
            conexao.execute("PRAGMA foreign_keys=ON")

        _migrar(self.engine, "0018_perfil_e_campanha")
        with self.engine.begin() as c:
            c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                           "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
            c.execute(text("INSERT INTO table_memberships (mesa_id, usuario_id, papel) VALUES ('m', 'n', 'narrador')"))
            for pid in ("rica", "so_platina", "pobre"):
                c.execute(text("INSERT INTO characters (id, mesa_id, proprietario_id, tipo, visibilidade, versao, ficha, revelacao) "
                               "VALUES (:id, 'm', 'n', 'personagem', 'mesa', 4, '{\"personagem\": {\"nome\": \"X\"}}', '{}')"),
                          {"id": pid})
            moeda = {"subtipo": "moedas", "largura": 1, "altura": 1}
            _item(c, "mista", "rica", {"ouro": 10, "platina": 5}, nome="Moedas (10 ouro, 5 platina)", **moeda)
            _item(c, "pura", "so_platina", {"cobre": 0, "prata": 0, "ouro": 0, "platina": 8}, **moeda)
            _item(c, "cobre", "pobre", {"cobre": 3, "prata": 0, "ouro": 0, "platina": 0}, **moeda)
            _item(c, "corda", "pobre", {"peso": 1})
            _item(c, "espada", "pobre", {}, tipo="arma", subtipo="uma_mao", largura=1, altura=3)
            _item(c, "pocao", "pobre", {}, subtipo="outro", largura=1, altura=1)
            c.execute(text("INSERT INTO card_definitions (id, mesa_id, tipo, criado_por) VALUES ('d', 'm', 'item', 'n')"))
            c.execute(text("INSERT INTO card_versions (id, mesa_id, definicao_id, numero, tipo, conteudo, procedencia, revisao_pendente, publicado_por) "
                           "VALUES ('v', 'm', 'd', 1, 'item', :conteudo, '{}', '[]', 'n')"),
                      {"conteudo": json.dumps({"titulo": "Poção", "texto": "Uma poção de cor rubra.", "item_tipo": "outro",
                                              "ativos": ["mesas/m/mesa/cartas/pocao.webp"]})})
            c.execute(text("INSERT INTO character_cards (id, mesa_id, personagem_id, definicao_id, versao_id, tipo, estado, origem, item_id) "
                           "VALUES ('cc', 'm', 'pobre', 'd', 'v', 'item', 'no_inventario', 'concessao', 'pocao')"))
        _migrar(self.engine, "0019_moedas_raridade_categoria")

    def tearDown(self):
        self.engine.dispose()
        self.diretorio.cleanup()

    def _dados(self, item_id: str):
        with self.engine.connect() as c:
            linha = c.execute(text("SELECT nome, dados FROM inventory_items WHERE id = :i"), {"i": item_id}).one_or_none()
        return None if linha is None else (linha[0], json.loads(linha[1]))

    def _personagem(self, pid: str):
        with self.engine.connect() as c:
            versao, ficha = c.execute(text("SELECT versao, ficha FROM characters WHERE id = :p"), {"p": pid}).one()
        return versao, json.loads(ficha)

    def _eventos(self):
        with self.engine.connect() as c:
            return c.execute(text("SELECT personagem_id, origem, categoria, acao, resumo FROM audit_events ORDER BY personagem_id")).all()

    def test_pilha_mista_perde_a_platina_e_o_nome_e_refeito(self):
        nome, dados = self._dados("mista")
        self.assertEqual((nome, dados["ouro"], "platina" in dados), ("Moedas (10 ouro)", 10, False))
        versao, ficha = self._personagem("rica")
        self.assertEqual((versao, ficha["inventario"]), (5, {"platina_retirada": 5}))

    def test_pilha_so_de_platina_some(self):
        self.assertIsNone(self._dados("pura"))
        self.assertEqual(self._personagem("so_platina")[1]["inventario"], {"platina_retirada": 8})

    def test_historico_registra_a_quantidade_so_de_quem_tinha_platina(self):
        eventos = self._eventos()
        self.assertEqual([e[0] for e in eventos], ["rica", "so_platina"])
        self.assertEqual(tuple(eventos[0][1:4]), ("migracao", "inventario", "platina_retirada"))
        self.assertEqual(eventos[0][4], "5 moedas de platina retiradas (a platina deixou de existir)")
        versao, ficha = self._personagem("pobre")
        self.assertEqual(versao, 4)
        self.assertNotIn("inventario", ficha)
        self.assertEqual(self._dados("cobre")[1], {"cobre": 3, "prata": 0, "ouro": 0, "raridade": "comum"})

    def test_raridade_categoria_e_descricao(self):
        self.assertEqual(self._dados("corda")[1], {"peso": 1, "raridade": "comum", "categoria": "diversos"})
        self.assertEqual(self._dados("espada")[1], {"raridade": "comum"})
        self.assertEqual(self._dados("pocao")[1],
                         {"raridade": "comum", "categoria": "diversos", "descricao": "Uma poção de cor rubra.",
                          "imagem_ativo": "mesas/m/mesa/cartas/pocao.webp"})

    def test_descida_e_nova_subida(self):
        _migrar(self.engine, "0018_perfil_e_campanha", descer=True)
        self.assertEqual(self._dados("mista")[1]["platina"], 0)
        self.assertNotIn("inventario", self._personagem("rica")[1])
        _migrar(self.engine, "0019_moedas_raridade_categoria")
        self.assertNotIn("platina", self._dados("mista")[1])
        # Na nova subida não há platina a retirar: nenhum evento novo.
        self.assertEqual(len(self._eventos()), 2)


if __name__ == "__main__":
    unittest.main()


class MigracaoApresentacaoVistaSqliteTest(unittest.TestCase):
    """Migração 0020: apresentações existentes ganham `vistas` vazio; a descida remove a coluna."""

    def test_coluna_vistas_com_padrao_vazio(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'vista.sqlite'}")
            try:
                _migrar(engine, "0019_moedas_raridade_categoria")
                with engine.begin() as c:
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    c.execute(text("INSERT INTO card_definitions (id, mesa_id, tipo, criado_por) VALUES ('d', 'm', 'magia', 'n')"))
                    c.execute(text("INSERT INTO card_versions (id, mesa_id, definicao_id, numero, tipo, conteudo, procedencia, "
                                   "revisao_pendente, publicado_por) VALUES ('v', 'm', 'd', 1, 'magia', '{}', '{}', '[]', 'n')"))
                    c.execute(text("INSERT INTO card_presentations (id, mesa_id, versao_id, destinatarios, estado, apresentada_por) "
                                   "VALUES ('a', 'm', 'v', '[]', 'apresentada', 'n')"))
                _migrar(engine, "0020_apresentacao_vista")
                with engine.connect() as c:
                    self.assertEqual(json.loads(c.execute(text("SELECT vistas FROM card_presentations")).scalar()), [])
                _migrar(engine, "0019_moedas_raridade_categoria", descer=True)
                with engine.connect() as c:
                    colunas = [linha[1] for linha in c.execute(text("PRAGMA table_info(card_presentations)"))]
                self.assertNotIn("vistas", colunas)
            finally:
                engine.dispose()
