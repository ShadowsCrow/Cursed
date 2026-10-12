"""Modo turno pela API (modo-de-turno, tarefas 3.2 e 3.3)."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import EventoAuditoriaRegistro, PersonagemRegistro, RolagemRegistro
from cursed_platform.tests.test_rolagens import Ator, create_app, get_actor
from cursed_platform.tests.test_turno import banco, montar_mesa


def ficha(nome: str, raciocinio: int | None, prontidao: int | None) -> dict:
    return {"personagem": {"nome": nome},
            "atributos": {"valores": {} if raciocinio is None else {"Raciocínio": raciocinio}},
            "pericias": {"valores": {} if prontidao is None else {"Prontidão": prontidao}}}


def _sorteio(*valores):
    return patch("cursed_platform.rolagens.secrets.randbelow", side_effect=[v - 1 for v in valores])


class _TurnoApi(unittest.TestCase):
    """Montagem da API e ajudas; sem testes próprios."""
    def setUp(self):
        self.engine = banco()
        montar_mesa(self.engine)
        with Session(self.engine) as session:
            for pid, nome, r, p in (("lion", "Lion", 2, 1), ("kira", "Kira", 3, 0), ("goblin", "Goblin", 1, 1),
                                    ("ogro", "Ogro Mau", 0, 2)):
                session.get(PersonagemRegistro, pid).ficha = ficha(nome, r, p)
            session.commit()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.ator = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def como(self, ator):
        self.ator = ator
        return self.client

    def entrar(self):
        self.como("mestre").post("/mesas/mesa/sala/sessoes")
        resposta = self.client.post("/mesas/mesa/sala/turno")
        self.assertEqual(resposta.status_code, 201, resposta.text)
        return resposta.json()["combate"]

    def id_de(self, combate, nome):
        return next(p["id"] for p in combate["participantes"] if p["nome"] == nome)

    def estado(self, ator):
        return self.como(ator).get("/mesas/mesa/sala/turno").json()["combate"]

    def auditados(self, acao):
        with Session(self.engine) as session:
            return list(session.scalars(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == acao)))


class TurnoApiTest(_TurnoApi):
    def test_entrar_exige_narrador_e_sessao(self):
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/turno").status_code, 422)
        self.client.post("/mesas/mesa/sala/sessoes")
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno").status_code, 403)
        self.assertEqual(self.como("outro").post("/mesas/mesa/sala/turno").status_code, 404)
        combate = self.entrar()
        self.assertEqual(combate["estado"], "iniciativa")
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/turno").status_code, 409)
        self.assertEqual(len(self.auditados("turno.aberto")), 1)

    def test_jogador_rola_a_propria_iniciativa_pela_ficha(self):
        combate = self.entrar()
        with _sorteio(14):
            resposta = self.como("ana").post("/mesas/mesa/sala/turno/iniciativa",
                                             json={"participante_id": self.id_de(combate, "Lion")})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        rolagem, = resposta.json()["rolagens"]
        self.assertEqual((rolagem["total"], rolagem["finalidade"], rolagem["oculta"]), (17, "iniciativa", False))
        self.assertEqual([t["chave"] for t in rolagem["termos"]], ["atributo:raciocinio", "pericia:prontidao"])
        self.assertEqual(rolagem["expressao"], "1d20 + Raciocínio (+2) + Prontidão (+1)")
        lion = next(p for p in resposta.json()["estado"]["combate"]["participantes"] if p["nome"] == "Lion")
        self.assertEqual((lion["rolou"], lion["total"], lion["meu"]), (True, 17, True))
        # Rolar de novo, ou pelo personagem de outra pessoa, é recusado.
        self.assertEqual(self.client.post("/mesas/mesa/sala/turno/iniciativa",
                                          json={"participante_id": self.id_de(combate, "Lion")}).status_code, 409)
        self.assertEqual(self.client.post("/mesas/mesa/sala/turno/iniciativa",
                                          json={"participante_id": self.id_de(combate, "Kira")}).status_code, 403)

    def test_narrador_rola_por_jogador_e_pelos_npcs_ocultos(self):
        combate = self.entrar()
        resposta = self.como("mestre").post("/mesas/mesa/sala/turno/iniciativa",
                                            json={"participante_id": self.id_de(combate, "Kira")})
        self.assertFalse(resposta.json()["rolagens"][0]["oculta"])
        npcs = self.client.post("/mesas/mesa/sala/turno/iniciativa/npcs")
        self.assertEqual(npcs.status_code, 201, npcs.text)
        self.assertEqual(len(npcs.json()["rolagens"]), 2)
        self.assertTrue(all(r["oculta"] for r in npcs.json()["rolagens"]))
        self.assertEqual(self.client.post("/mesas/mesa/sala/turno/iniciativa/npcs").json()["rolagens"], [])
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/iniciativa/npcs").status_code, 403)
        # As rolagens ocultas não chegam ao jogador.
        visiveis = self.como("ana").get("/mesas/mesa/sala/rolagens").json()
        self.assertEqual([r["personagem_id"] for r in visiveis], ["kira"])

    def test_ficha_sem_prontidao_e_recusada_com_o_nome(self):
        with Session(self.engine) as session:
            session.get(PersonagemRegistro, "goblin").ficha = ficha("Goblin", 1, None)
            session.commit()
        combate = self.entrar()
        resposta = self.como("mestre").post("/mesas/mesa/sala/turno/iniciativa/npcs")
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("Goblin", resposta.json()["detail"])
        with Session(self.engine) as session:
            self.assertEqual(session.scalars(select(RolagemRegistro)).all(), [])
        sozinho = self.client.post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": self.id_de(combate, "Goblin")})
        self.assertEqual(sozinho.status_code, 422)
        self.assertIn("Prontidão", sozinho.json()["detail"])

    def test_comecar_avancar_e_sair(self):
        combate = self.entrar()
        with _sorteio(18, 10, 2):
            for nome in ("Kira", "Lion", "Goblin"):
                self.como("mestre").post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": self.id_de(combate, nome)})
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/inicio").status_code, 403)
        comecado = self.como("mestre").post("/mesas/mesa/sala/turno/inicio").json()["combate"]
        self.assertEqual((comecado["estado"], comecado["rodada"]), ("combate", 1))
        self.assertEqual(comecado["vez_participante_id"], self.id_de(comecado, "Kira"))
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/proximo").status_code, 403)
        # O Ogro ainda não rolou: o Próximo turno fica travado (decisão do usuário, 2026-10-05).
        travado = self.como("mestre").post("/mesas/mesa/sala/turno/proximo")
        self.assertEqual((travado.status_code, travado.json()["detail"]), (409, "Falta rolar a iniciativa de Ogro."))
        with _sorteio(1):
            self.client.post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": self.id_de(combate, "Ogro")})
        for _ in range(4):
            agora = self.como("mestre").post("/mesas/mesa/sala/turno/proximo").json()["combate"]
        # Kira → Lion → Goblin → Ogro → Kira na rodada 2.
        self.assertEqual((agora["rodada"], agora["vez_participante_id"]), (2, self.id_de(agora, "Kira")))
        self.assertEqual(len(self.auditados("turno.vez")), 4)
        self.assertEqual(self.client.post("/mesas/mesa/sala/turno/encerramento").json(), {"combate": None})
        self.assertEqual(self.auditados("turno.encerrado")[0].detalhes["rodadas"], 2)
        self.assertEqual(self.client.post("/mesas/mesa/sala/turno/proximo").status_code, 409)

    def test_token_novo_entra_na_disputa_e_o_dono_rola(self):
        combate = self.entrar()
        self.como("mestre").post("/mesas/mesa/sala/turno/iniciativa/npcs")
        for nome in ("Kira", "Lion"):
            self.client.post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": self.id_de(combate, nome)})
        self.client.post("/mesas/mesa/sala/turno/inicio")
        with Session(self.engine) as session:
            session.add(PersonagemRegistro(id="bolota", mesa_id="mesa", proprietario_id="ana", ficha=ficha("Bolota", 1, 1)))
            session.commit()
        sala_ = self.client.get("/mesas/mesa/sala").json()["cena"]
        camada = sala_["camadas"][0]["id"] if sala_["camadas"][0]["visibilidade"] == "mesa" else sala_["camadas"][1]["id"]
        criado = self.client.post(f"/mesas/mesa/sala/cenas/{sala_['id']}/tokens", json={
            "camada_id": camada, "rotulo": "Bolota", "x": 3, "y": 3, "tamanho": 1, "personagem_id": "bolota", "oculto": False})
        self.assertEqual(criado.status_code, 201, criado.text)
        self.assertEqual(len(self.auditados("turno.entrou")), 1)
        bolota = next(p for p in self.estado("ana")["participantes"] if p["nome"] == "Bolota")
        self.assertEqual((bolota["rolou"], bolota["meu"]), (False, True))
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/turno/proximo").status_code, 409)
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": bolota["id"]}).status_code, 201)
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/turno/proximo").status_code, 200)

    def test_outro_token_do_mesmo_monstro_rola_sozinho(self):
        """O caso do pedido (2026-10-05): com o modo turno aberto, mais dois Goblins da mesma ficha pedem iniciativa."""
        self.entrar()
        sala_ = self.client.get("/mesas/mesa/sala").json()["cena"]
        camada = next(c["id"] for c in sala_["camadas"] if c["visibilidade"] == "mesa")
        for x in (3, 4):
            criado = self.client.post(f"/mesas/mesa/sala/cenas/{sala_['id']}/tokens", json={
                "camada_id": camada, "rotulo": "Goblin", "x": x, "y": 3, "tamanho": 1, "personagem_id": "goblin",
                "oculto": False})
            self.assertEqual(criado.status_code, 201, criado.text)
        self.assertEqual(len(self.auditados("turno.entrou")), 2)
        goblins = [p for p in self.estado("mestre")["participantes"] if p["nome"].startswith("Goblin")]
        self.assertEqual(sorted(p["nome"] for p in goblins), ["Goblin", "Goblin 2", "Goblin 3"])
        self.assertTrue(all(not p["rolou"] for p in goblins))
        # "Rolar todos os NPCs e monstros" rola cada um.
        with _sorteio(5, 6, 7, 8):
            rolado = self.client.post("/mesas/mesa/sala/turno/iniciativa/npcs")
        self.assertEqual((rolado.status_code, len(rolado.json()["rolagens"])), (201, 4))

    def test_encerrar_a_sessao_encerra_o_modo_turno(self):
        self.entrar()
        self.como("mestre").post("/mesas/mesa/sala/sessoes/atual/encerramento")
        self.assertIsNone(self.estado("mestre"))
        self.assertEqual(len(self.auditados("turno.encerrado")), 1)

    def test_leitura_filtrada_por_leitor(self):
        combate = self.entrar()
        self.como("mestre").post("/mesas/mesa/sala/turno/iniciativa/npcs")
        mestre = {p["nome"]: p for p in self.estado("mestre")["participantes"]}
        self.assertEqual(set(mestre), {"Lion", "Kira", "Goblin", "Ogro"})
        self.assertIsNotNone(mestre["Goblin"]["total"])
        ana = {p["nome"]: p for p in self.estado("ana")["participantes"]}
        self.assertEqual(set(ana), {"Lion", "Kira", "Goblin"})
        self.assertIsNone(ana["Goblin"]["total"])
        self.assertEqual(ana["Goblin"]["tokens"], 2)
        self.assertTrue(ana["Lion"]["meu"] and not ana["Kira"]["meu"])
        self.assertEqual(self.como("outro").get("/mesas/mesa/sala/turno").status_code, 404)
        self.assertEqual(len(combate["participantes"]), 4)


if __name__ == "__main__":
    unittest.main()
