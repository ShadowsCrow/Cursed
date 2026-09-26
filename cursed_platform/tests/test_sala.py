"""Contratos da sala: integridade, visibilidade e comandos autoritativos."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import (
    Base, CamadaCenaRegistro, CenaRegistro, MembroRegistro, MesaRegistro, PersonagemRegistro, TokenRegistro,
)


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


class SalaApiTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        event.listen(self.engine, "connect", lambda dbapi, _: dbapi.execute("PRAGMA foreign_keys=ON"))
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([
                MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"),
                MesaRegistro(id="outra", nome="Outra", narrador_id="outro"),
            ])
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                MembroRegistro(mesa_id="mesa", usuario_id="bia", papel="jogador"),
                MembroRegistro(mesa_id="outra", usuario_id="outro", papel="narrador"),
                PersonagemRegistro(id="ana-p", mesa_id="mesa", proprietario_id="ana", ficha={}),
                PersonagemRegistro(id="bia-p", mesa_id="mesa", proprietario_id="bia", ficha={}),
                PersonagemRegistro(id="npc", mesa_id="mesa", visibilidade="narrador", ficha={}),
                PersonagemRegistro(id="outro-p", mesa_id="outra", ficha={}),
            ])
            session.commit()
        settings = PlatformSettings(
            environment="test", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",),
        )
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

    def preparar_cena(self):
        self.assertEqual(self.como("mestre").put("/mesas/mesa/modulos", json={"sala": True}).status_code, 200)
        criada = self.client.post("/mesas/mesa/sala/cenas", json={"nome": "Pátio", "colunas": 8, "linhas": 6})
        self.assertEqual(criada.status_code, 201, criada.text)
        cena = criada.json()["cena"]
        ativada = self.client.post(f"/mesas/mesa/sala/cenas/{cena['id']}/ativacao")
        self.assertEqual(ativada.status_code, 200, ativada.text)
        camadas = {c["visibilidade"]: c["id"] for c in cena["camadas"]}
        return cena["id"], camadas

    def criar_token(self, cena_id: str, camada_id: str, **extra):
        resposta = self.como("mestre").post(f"/mesas/mesa/sala/cenas/{cena_id}/tokens", json={
            "camada_id": camada_id, "rotulo": "Peça", "x": 2, "y": 3, **extra,
        })
        self.assertEqual(resposta.status_code, 201, resposta.text)
        return resposta.json()

    def test_visibilidade_e_controle_por_personagem_camada_e_token(self):
        cena, camadas = self.preparar_cena()
        proprio = self.criar_token(cena, camadas["mesa"], rotulo="Ana", personagem_id="ana-p")
        delegado = self.criar_token(cena, camadas["mesa"], rotulo="Delegado", controladores=["ana"])
        alheio = self.criar_token(cena, camadas["mesa"], rotulo="Bia", personagem_id="bia-p")
        oculto = self.criar_token(cena, camadas["mesa"], rotulo="Oculto", oculto=True)
        privado = self.criar_token(cena, camadas["narrador"], rotulo="Privado")
        npc = self.criar_token(cena, camadas["mesa"], rotulo="NPC", personagem_id="npc")

        mestre = self.client.get("/mesas/mesa/sala").json()["cena"]
        self.assertEqual(len(mestre["tokens"]), 6)
        self.assertEqual(len(mestre["camadas"]), 2)
        jogador = self.como("ana").get("/mesas/mesa/sala").json()["cena"]
        self.assertEqual(len(jogador["camadas"]), 1)
        tokens = {t["id"]: t for t in jogador["tokens"]}
        self.assertEqual(set(tokens), {proprio["id"], delegado["id"], alheio["id"]})
        self.assertTrue(tokens[proprio["id"]]["controlavel"])
        self.assertTrue(tokens[delegado["id"]]["controlavel"])
        self.assertFalse(tokens[alheio["id"]]["controlavel"])
        for segredo in (oculto, privado, npc):
            self.assertNotIn(segredo["id"], self.como("ana").get("/mesas/mesa/sala").text)
            self.assertEqual(self.client.post(
                f"/mesas/mesa/sala/tokens/{segredo['id']}/movimento",
                json={"x": 1, "y": 1, "versao_esperada": 0},
            ).status_code, 404)

    def test_movimento_exige_controle_limites_e_versao(self):
        cena, camadas = self.preparar_cena()
        token = self.criar_token(cena, camadas["mesa"], personagem_id="bia-p")
        caminho = f"/mesas/mesa/sala/tokens/{token['id']}/movimento"
        pedido = {"x": 5, "y": 4, "versao_esperada": 0}
        self.assertEqual(self.como("ana").post(caminho, json=pedido).status_code, 403)
        self.assertEqual(self.como("bia").post(caminho, json={**pedido, "x": 8}).status_code, 422)
        self.assertEqual(self.client.post(caminho, json=pedido).status_code, 200)
        self.assertEqual(self.client.post(caminho, json={**pedido, "x": 6}).status_code, 409)
        atual = {t["id"]: t for t in self.client.get("/mesas/mesa/sala").json()["cena"]["tokens"]}
        self.assertEqual((atual[token["id"]]["x"], atual[token["id"]]["y"], atual[token["id"]]["versao"]), (5, 4, 1))
        self.assertEqual(self.como("ana").delete(
            f"/mesas/mesa/sala/tokens/{token['id']}?versao_esperada=1"
        ).status_code, 403)
        self.assertEqual(self.como("mestre").delete(
            f"/mesas/mesa/sala/tokens/{token['id']}?versao_esperada=0"
        ).status_code, 409)
        self.assertEqual(self.client.delete(
            f"/mesas/mesa/sala/tokens/{token['id']}?versao_esperada=1"
        ).status_code, 204)

    def test_modulo_desativado_e_isolamento_da_mesa(self):
        self.assertEqual(self.como("mestre").post(
            "/mesas/mesa/sala/cenas", json={"nome": "X", "colunas": 5, "linhas": 5},
        ).status_code, 409)
        self.preparar_cena()
        self.assertEqual(self.como("outro").get("/mesas/outra/modulos").json(), {"sala": False})
        self.assertEqual(self.como("ana").get("/mesas/outra/sala").status_code, 404)
        self.assertEqual(self.como("mestre").post(
            "/mesas/mesa/sala/cenas", json={"nome": "", "colunas": 5, "linhas": 5},
        ).status_code, 422)

    def test_criacao_rejeita_referencias_incompativeis(self):
        cena, camadas = self.preparar_cena()
        caminho = f"/mesas/mesa/sala/cenas/{cena}/tokens"
        base = {"camada_id": camadas["mesa"], "rotulo": "Peça", "x": 2, "y": 3}
        for alteracao in (
            {"personagem_id": "outro-p"}, {"controladores": ["intruso"]},
            {"x": 8}, {"y": 6}, {"tamanho": 7},
        ):
            with self.subTest(alteracao=alteracao):
                self.assertEqual(self.como("mestre").post(
                    caminho, json={**base, **alteracao},
                ).status_code, 422)
        outra = self.client.post("/mesas/mesa/sala/cenas", json={
            "nome": "Interior", "colunas": 5, "linhas": 5,
        }).json()["cena"]
        camada_outra = outra["camadas"][0]["id"]
        self.assertEqual(self.client.post(caminho, json={
            **base, "camada_id": camada_outra,
        }).status_code, 422)

    def test_mapa_referencia_somente_arquivo_compartilhado_da_mesa(self):
        self.assertEqual(self.como("mestre").put("/mesas/mesa/modulos", json={"sala": True}).status_code, 200)
        caminho = "/mesas/mesa/sala/cenas"
        base = {"nome": "Bosque", "colunas": 8, "linhas": 6}
        for objeto in (
            "mesas/outra/mesa/mapa.png", "mesas/mesa/narrador/segredo.png",
            "mesas/mesa/mesa/../narrador/segredo.png", "https://exemplo.test/mapa.png",
        ):
            with self.subTest(objeto=objeto):
                self.assertEqual(self.client.post(caminho, json={
                    **base, "mapa_objeto": objeto,
                }).status_code, 422)
        objeto = "mesas/mesa/mesa/mapas/bosque.webp"
        criada = self.client.post(caminho, json={**base, "mapa_objeto": objeto})
        self.assertEqual(criada.status_code, 201, criada.text)
        cena_id = criada.json()["cena"]["id"]
        self.assertEqual(criada.json()["cena"]["mapa_objeto"], objeto)
        self.client.post(f"{caminho}/{cena_id}/ativacao")
        self.assertEqual(self.como("ana").get("/mesas/mesa/sala").json()["cena"]["mapa_objeto"], objeto)

    def test_integridade_relacional_da_cena(self):
        cena, camadas = self.preparar_cena()
        with Session(self.engine) as session:
            session.add(CenaRegistro(id="segunda", mesa_id="mesa", nome="Outra", colunas=4, linhas=4))
            session.flush()
            session.add(CamadaCenaRegistro(
                id="outra-camada", mesa_id="mesa", cena_id="segunda", nome="Tokens", visibilidade="mesa",
            ))
            session.commit()
        with Session(self.engine) as session, self.assertRaises(IntegrityError):
            session.add(TokenRegistro(
                id="invalido", mesa_id="mesa", cena_id=cena, camada_id="outra-camada",
                rotulo="Invalido", x=0, y=0, controladores=[],
            ))
            session.commit()
        with Session(self.engine) as session, self.assertRaises(IntegrityError):
            session.add(CenaRegistro(id="terceira", mesa_id="mesa", nome="Ativa", colunas=4, linhas=4, ativa=True))
            session.commit()
        self.assertIn("mesa", camadas)


if __name__ == "__main__":
    unittest.main()
