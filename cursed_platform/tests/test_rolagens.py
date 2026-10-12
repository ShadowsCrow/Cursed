"""Rolagens de dados da Sala sorteadas pelo servidor (melhorias-da-sala, item 3)."""

from __future__ import annotations

from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform import rolagens
from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro, PersonagemRegistro, RolagemRegistro


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


def _banco():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda dbapi, _: dbapi.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"),
                         MesaRegistro(id="outra", nome="Outra", narrador_id="outro")])
        session.flush()
        session.add_all([
            MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
            MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
            MembroRegistro(mesa_id="outra", usuario_id="outro", papel="narrador"),
            MembroRegistro(mesa_id="mesa", usuario_id="bia", papel="jogador"),
        ])
        session.flush()
        ficha = {"personagem": {"nome": "Lion"}, "atributos": {"valores": {"Destreza": 3, "Força": 1}, "ajustes": {"Destreza": 1}},
                 "pericias": {"valores": {"Furtividade": 2}}}
        session.add_all([PersonagemRegistro(id="ana-p", mesa_id="mesa", proprietario_id="ana", ficha=ficha),
                         PersonagemRegistro(id="bia-p", mesa_id="mesa", proprietario_id="bia", ficha=ficha)])
        session.commit()
    return engine


class RolagensDominioTest(unittest.TestCase):
    def setUp(self):
        self.engine = _banco()
        self.session = Session(self.engine)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_valores_entre_1_e_as_faces_e_total_com_modificador(self):
        for faces in rolagens.TIPOS_DE_DADO:
            rolagem = rolagens.rolar(self.session, "mesa", "ana", {faces: 40}, -3)
            valores = rolagem.grupos[0]["valores"]
            self.assertEqual(len(valores), 40)
            self.assertTrue(all(1 <= v <= faces for v in valores))
            self.assertEqual(rolagem.total, sum(valores) - 3)

    def test_sorteio_uniforme_pelo_gerador_criptografico(self):
        with patch("cursed_platform.rolagens.secrets.randbelow", side_effect=[0, 5, 19]) as sorteio:
            rolagem = rolagens.rolar(self.session, "mesa", "ana", {20: 1, 6: 2}, 2)
        self.assertEqual([chamada.args for chamada in sorteio.call_args_list], [(6,), (6,), (20,)])
        self.assertEqual(rolagem.grupos, [{"faces": 6, "valores": [1, 6]}, {"faces": 20, "valores": [20]}])
        self.assertEqual(rolagem.total, 29)
        self.assertEqual(rolagem.expressao, "2d6 + 1d20 + 2")

    def test_expressao_igual_a_da_aba(self):
        self.assertEqual(rolagens.descrever({20: 1}, -1), "1d20 − 1")
        self.assertEqual(rolagens.descrever({8: 3}, 0), "3d8")

    def test_limites(self):
        for dados, modificador in [({7: 1}, 0), ({20: 100}, 0), ({20: 1}, 100), ({}, 0), ({20: 0}, 3), ({20: -1}, 0)]:
            with self.subTest(dados=dados, modificador=modificador), self.assertRaises(rolagens.RolagemInvalida):
                rolagens.rolar(self.session, "mesa", "ana", dados, modificador)

    def test_lista_por_mesa_em_ordem_e_depois_do_cursor(self):
        primeira = rolagens.rolar(self.session, "mesa", "ana", {20: 1}, 0)
        segunda = rolagens.rolar(self.session, "mesa", "mestre", {6: 1}, 0)
        rolagens.rolar(self.session, "outra", "outro", {4: 1}, 0)
        self.assertEqual([r.id for r in rolagens.listar(self.session, "mesa")], [primeira.id, segunda.id])
        self.assertEqual([r.id for r in rolagens.listar(self.session, "mesa", depois=primeira.id)], [segunda.id])
        self.assertEqual([r.id for r in rolagens.listar(self.session, "mesa", limite=1)], [segunda.id])

    def test_avisa_a_mesa_pelo_realtime(self):
        with patch("cursed_platform.rolagens.emitir") as emitir:
            rolagem = rolagens.rolar(self.session, "mesa", "ana", {20: 1}, 0)
        emitir.assert_called_once_with(self.session, "mesa", "sala.rolagem", {"id": rolagem.id}, publico=True)

    def test_rolagem_oculta_so_do_narrador_e_avisada_so_a_ele(self):
        with self.assertRaises(rolagens.OcultarSoNarrador):
            rolagens.rolar(self.session, "mesa", "ana", {20: 1}, 0, oculta=True, narrador=False)
        with patch("cursed_platform.rolagens.emitir") as emitir:
            oculta = rolagens.rolar(self.session, "mesa", "mestre", {20: 1}, 0, oculta=True, narrador=True)
        emitir.assert_called_once_with(self.session, "mesa", "sala.rolagem", {"id": oculta.id}, publico=False)
        visivel = rolagens.rolar(self.session, "mesa", "mestre", {6: 1}, 0, narrador=True)
        self.assertEqual([r.id for r in rolagens.listar(self.session, "mesa", narrador=False)], [visivel.id])
        self.assertEqual([r.id for r in rolagens.listar(self.session, "mesa", narrador=True)], [oculta.id, visivel.id])


class FinalidadeTest(unittest.TestCase):
    """modo-de-turno, tarefa 3.1: a rolagem de iniciativa é marcada; as demais não."""

    def test_finalidade_gravada_e_enviada(self):
        engine = _banco()
        with Session(engine) as session:
            livre = rolagens.rolar(session, "mesa", "ana", {20: 1}, 0)
            iniciativa = rolagens.rolar(session, "mesa", "ana", {20: 1}, 0, finalidade="iniciativa")
            self.assertIsNone(rolagens.para_resposta(livre)["finalidade"])
            self.assertEqual(rolagens.para_resposta(iniciativa)["finalidade"], "iniciativa")
        engine.dispose()


class RolagensApiTest(unittest.TestCase):
    def setUp(self):
        self.engine = _banco()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.ator = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def como(self, ator: str) -> TestClient:
        self.ator = ator
        return self.client

    def test_jogador_e_narrador_rolam_e_veem_as_rolagens_da_mesa(self):
        resposta = self.como("ana").post("/mesas/mesa/sala/rolagens",
                                         json={"dados": [{"faces": 20, "quantidade": 1}, {"faces": 6, "quantidade": 2}], "modificador": 3})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        rolagem = resposta.json()
        self.assertEqual(rolagem["autor_id"], "ana")
        self.assertEqual(rolagem["expressao"], "2d6 + 1d20 + 3")
        self.assertEqual([g["faces"] for g in rolagem["grupos"]], [6, 20])
        self.assertEqual(rolagem["total"], sum(sum(g["valores"]) for g in rolagem["grupos"]) + 3)
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/rolagens", json={"dados": [{"faces": 100, "quantidade": 1}]}).status_code, 201)
        lista = self.como("ana").get("/mesas/mesa/sala/rolagens").json()
        self.assertEqual([r["autor_id"] for r in lista], ["ana", "mestre"])
        depois = self.como("mestre").get("/mesas/mesa/sala/rolagens", params={"depois": rolagem["id"]}).json()
        self.assertEqual([r["autor_id"] for r in depois], ["mestre"])

    def test_quem_nao_e_da_mesa_nao_rola_nem_ve(self):
        self.como("ana").post("/mesas/mesa/sala/rolagens", json={"dados": [{"faces": 20, "quantidade": 1}]})
        self.assertEqual(self.como("outro").get("/mesas/mesa/sala/rolagens").status_code, 404)
        self.assertEqual(self.como("outro").post("/mesas/mesa/sala/rolagens", json={"dados": [{"faces": 20, "quantidade": 1}]}).status_code, 404)

    def test_pedidos_fora_dos_limites_sao_recusados_e_nada_e_guardado(self):
        for corpo in ({"dados": [{"faces": 7, "quantidade": 1}]}, {"dados": [{"faces": 20, "quantidade": 100}]},
                      {"dados": [{"faces": 20, "quantidade": 1}], "modificador": 150}, {"dados": []},
                      {"dados": [{"faces": 20, "quantidade": 0}]}):
            with self.subTest(corpo=corpo):
                self.assertEqual(self.como("ana").post("/mesas/mesa/sala/rolagens", json=corpo).status_code, 422)
        with Session(self.engine) as session:
            self.assertEqual(session.query(RolagemRegistro).count(), 0)

    def test_rolagem_oculta_do_narrador_nao_chega_aos_jogadores(self):
        oculta = self.como("mestre").post("/mesas/mesa/sala/rolagens",
                                          json={"dados": [{"faces": 20, "quantidade": 1}], "oculta": True})
        self.assertEqual(oculta.status_code, 201, oculta.text)
        self.assertTrue(oculta.json()["oculta"])
        self.como("mestre").post("/mesas/mesa/sala/rolagens", json={"dados": [{"faces": 6, "quantidade": 1}], "oculta": False})
        self.assertEqual([r["expressao"] for r in self.como("ana").get("/mesas/mesa/sala/rolagens").json()], ["1d6"])
        self.assertEqual([r["oculta"] for r in self.como("mestre").get("/mesas/mesa/sala/rolagens").json()], [True, False])
        depois = self.como("ana").get("/mesas/mesa/sala/rolagens", params={"depois": 0}).json()
        self.assertEqual([r["expressao"] for r in depois], ["1d6"])

    def test_jogador_nao_rola_oculto(self):
        resposta = self.como("ana").post("/mesas/mesa/sala/rolagens", json={"dados": [{"faces": 20, "quantidade": 1}], "oculta": True})
        self.assertEqual(resposta.status_code, 403)
        with Session(self.engine) as session:
            self.assertEqual(session.query(RolagemRegistro).count(), 0)

    def test_rolagem_pela_ficha_soma_atributo_e_pericia_calculados_pelo_servidor(self):
        """melhorias-da-sala, item 8: o navegador diz quais; o servidor soma os totais da ficha."""
        with patch("cursed_platform.rolagens.secrets.randbelow", return_value=9):
            resposta = self.como("ana").post("/mesas/mesa/sala/rolagens", json={
                "dados": [{"faces": 20, "quantidade": 1}], "modificador": 1, "personagem_id": "ana-p",
                "atributo": "atributo:destreza", "pericia": "pericia:furtividade"})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        rolagem = resposta.json()
        self.assertEqual(rolagem["personagem_id"], "ana-p")
        self.assertEqual([(t["chave"], t["valor"]) for t in rolagem["termos"]],
                         [("atributo:destreza", 4), ("pericia:furtividade", 2)])
        self.assertEqual(rolagem["total"], 10 + 4 + 2 + 1)
        self.assertEqual(rolagem["expressao"], "1d20 + Destreza (+4) + Furtividade (+2) + 1")

    def test_quem_nao_le_a_ficha_nao_rola_por_ela(self):
        corpo = {"dados": [{"faces": 20, "quantidade": 1}], "personagem_id": "bia-p", "atributo": "atributo:forca"}
        self.assertIn(self.como("ana").post("/mesas/mesa/sala/rolagens", json=corpo).status_code, (403, 404))
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/rolagens", json=corpo).status_code, 201)

    def test_atributo_ou_pericia_invalidos(self):
        base = {"dados": [{"faces": 20, "quantidade": 1}]}
        for extra in ({"atributo": "atributo:destreza"}, {"personagem_id": "ana-p", "atributo": "atributo:voo"},
                      {"personagem_id": "ana-p", "atributo": "pericia:furtividade"}):
            with self.subTest(extra=extra):
                self.assertEqual(self.como("ana").post("/mesas/mesa/sala/rolagens", json={**base, **extra}).status_code, 422)
        with Session(self.engine) as session:
            self.assertEqual(session.query(RolagemRegistro).count(), 0)



class MigracaoRolagensSqliteTest(unittest.TestCase):
    def test_cria_e_remove_a_tabela(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'rolagens.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0025_rolagens_de_dados")
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    c.execute(text("INSERT INTO dice_rolls (mesa_id, autor_id, expressao, grupos, modificador, total) "
                                   "VALUES ('m', 'n', '1d20', '[{\"faces\": 20, \"valores\": [7]}]', 0, 7)"))
                    self.assertEqual(c.execute(text("SELECT id, oculta FROM dice_rolls")).one(), (1, 0))
                with engine.begin() as c:
                    command.downgrade(config(c), "0024_movimento_dos_tokens")
                self.assertNotIn("dice_rolls", set(inspect(engine).get_table_names()))
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
