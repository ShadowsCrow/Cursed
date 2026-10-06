"""Deslocamento no modo turno pela API (modo-de-turno, tarefa 6.5)."""

from __future__ import annotations

import unittest

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform.persistence import TokenRegistro

from cursed_platform.tests.test_turno_api import _TurnoApi, _sorteio


class MovimentoApiTest(_TurnoApi):
    """Fichas sem raça: Deslocamento 9 m (o padrão das regras). Todos os tokens começam em (1, 1)."""

    def setUp(self):
        super().setUp()
        # Kira e o Ogro saem da cena: sem iniciativa, travariam o Próximo turno (D8c).
        with Session(self.engine) as session:
            for token in session.scalars(select(TokenRegistro).where(TokenRegistro.personagem_id.in_(["kira", "ogro"]))):
                session.delete(token)
            session.commit()
        combate = self.entrar()
        with _sorteio(18, 10):
            for nome in ("Lion", "Goblin"):
                self.como("mestre").post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": self.id_de(combate, nome)})
        self.como("mestre").post("/mesas/mesa/sala/turno/inicio")

    def token(self, rotulo, indice=0):
        tokens = self.como("mestre").get("/mesas/mesa/sala").json()["cena"]["tokens"]
        return [t for t in tokens if t["rotulo"] == rotulo][indice]

    def mover(self, ator, rotulo, x, y, indice=0, livre=False):
        alvo = self.token(rotulo, indice)
        return self.como(ator).post(f"/mesas/mesa/sala/tokens/{alvo['id']}/movimento",
                                    json={"x": x, "y": y, "versao_esperada": alvo["versao"], "livre": livre})

    def movimento(self, ator):
        participantes = self.como(ator).get("/mesas/mesa/sala/turno").json()["combate"]["participantes"]
        return next(p for p in participantes if p["nome"] == "Lion")["movimento"]

    def test_anda_ate_o_deslocamento_e_recusa_o_que_passa(self):
        self.assertEqual(self.mover("ana", "Lion", 5, 1).status_code, 200)
        self.assertEqual(self.movimento("ana"), {"gasto": 4, "limite": 9, "correndo": False})
        # Diagonal: de (5, 1) para (8, 4) custa 3 m.
        self.assertEqual(self.mover("ana", "Lion", 8, 4).status_code, 200)
        recusa = self.mover("ana", "Lion", 8, 8)
        self.assertEqual(recusa.status_code, 422)
        self.assertEqual(recusa.json()["detail"], "Faltam 2 m de Deslocamento; o movimento custa 4 m.")
        self.assertEqual((self.token("Lion")["x"], self.token("Lion")["y"]), (8, 4))
        self.assertEqual(self.movimento("mestre"), {"gasto": 7, "limite": 9, "correndo": False})
        self.assertIsNone(self.movimento("bia"))

    def test_fora_da_vez_o_narrador_sem_limite_e_o_saldo_volta(self):
        self.como("mestre").post("/mesas/mesa/sala/turno/proximo")
        recusa = self.mover("ana", "Lion", 2, 1)
        self.assertEqual((recusa.status_code, recusa.json()["detail"]), (403, "Não é a sua vez."))
        # Fora da vez, o Narrador só move com o movimento livre (decisão do usuário, 2026-10-05).
        fora = self.mover("mestre", "Lion", 9, 9)
        self.assertEqual((fora.status_code, fora.json()["detail"]), (403, "Fora da vez: ligue o Movimento livre para mover."))
        self.assertEqual(self.mover("mestre", "Lion", 9, 9, livre=True).status_code, 200)
        self.assertEqual(self.mover("mestre", "Goblin", 9, 1).status_code, 200)
        self.como("mestre").post("/mesas/mesa/sala/turno/proximo")
        self.assertEqual(self.movimento("ana"), {"gasto": 0, "limite": 9, "correndo": False})

    def test_narrador_gasta_na_vez_e_movimento_livre_nao(self):
        self.como("mestre").post("/mesas/mesa/sala/turno/proximo")  # vez do Goblin (9 m, ficha sem raça)
        self.assertEqual(self.mover("mestre", "Goblin", 7, 1).status_code, 200)
        recusa = self.mover("mestre", "Goblin", 7, 6)
        self.assertEqual((recusa.status_code, recusa.json()["detail"]), (422, "Faltam 3 m de Deslocamento; o movimento custa 5 m."))
        self.assertEqual(self.mover("mestre", "Goblin", 7, 9, livre=True).status_code, 200)
        goblin = next(p for p in self.como("mestre").get("/mesas/mesa/sala/turno").json()["combate"]["participantes"]
                      if p["nome"] == "Goblin")
        self.assertEqual(goblin["movimento"], {"gasto": 6, "limite": 9, "correndo": False})

    def test_jogador_nao_pede_movimento_livre(self):
        recusa = self.mover("ana", "Lion", 2, 1, livre=True)
        self.assertEqual((recusa.status_code, recusa.json()["detail"]), (403, "Só o Narrador faz movimento livre."))

    def test_correr_dobra_e_e_recusado_fora_da_vez(self):
        self.assertEqual(self.mover("ana", "Lion", 6, 1).status_code, 200)
        self.assertEqual(self.como("bia").post("/mesas/mesa/sala/turno/correr").status_code, 403)
        resposta = self.como("ana").post("/mesas/mesa/sala/turno/correr")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(self.movimento("ana"), {"gasto": 5, "limite": 18, "correndo": True})
        self.assertEqual(self.mover("ana", "Lion", 6, 9).status_code, 200)
        self.como("mestre").post("/mesas/mesa/sala/turno/proximo")
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/correr").status_code, 403)

    def test_fase_de_iniciativa_e_fora_do_modo_turno(self):
        self.como("mestre").post("/mesas/mesa/sala/turno/encerramento")
        # Sem modo turno, o movimento segue livre.
        self.assertEqual(self.mover("ana", "Lion", 9, 9).status_code, 200)
        self.como("mestre").post("/mesas/mesa/sala/turno")
        recusa = self.mover("ana", "Lion", 8, 8)
        self.assertEqual(recusa.status_code, 403)
        self.assertIn("ainda não começou", recusa.json()["detail"])
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/correr").status_code, 409)



if __name__ == "__main__":
    unittest.main()
