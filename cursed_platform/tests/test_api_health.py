from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from cursed_platform.config import PlatformSettings


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))

with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.main import create_app  # noqa: E402


class ApiHealthTest(unittest.TestCase):
    def setUp(self):
        settings = PlatformSettings(
            environment="test",
            database_url="sqlite:///:memory:",
            api_host="127.0.0.1",
            api_port=8000,
            cors_origins=("http://localhost:5173",),
        )
        self.client = TestClient(create_app(settings))

    def test_health_and_openapi_are_available(self):
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})
        self.assertEqual(self.client.get("/docs").status_code, 200)
        document = self.client.get("/openapi.json").json()
        self.assertIn("/health", document["paths"])
        self.assertEqual(document["info"]["title"], "Cursed — Plataforma Colaborativa")

    def test_only_configured_frontend_origin_receives_cors_permission(self):
        allowed = self.client.options(
            "/health",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
        )
        self.assertEqual(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173")
        denied = self.client.options(
            "/health",
            headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"},
        )
        self.assertNotIn("access-control-allow-origin", denied.headers)


if __name__ == "__main__":
    unittest.main()


class DevAuthTest(unittest.TestCase):
    def _app(self, dev_auth: bool):
        from sqlalchemy import create_engine
        from sqlalchemy.pool import StaticPool

        from cursed_platform.persistence import Base

        settings = PlatformSettings(
            environment="development", database_url="sqlite:///:memory:", api_host="127.0.0.1", api_port=8000,
            cors_origins=("http://localhost:5173",), dev_auth=dev_auth,
        )
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        return TestClient(create_app(settings, engine=engine))

    def test_token_dev_so_vale_com_o_modo_ligado(self):
        ligado = self._app(True)
        resposta = ligado.post("/mesas", json={"nome": "Mesa dev"}, headers={"Authorization": "Bearer dev:narrador"})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertEqual(ligado.get("/mesas", headers={"Authorization": "Bearer dev:narrador"}).json()[0]["papel"], "narrador")
        for invalido in ("dev:", "dev:Maiusculo", "dev:a/b", "narrador", "dev:" + "x" * 60):
            with self.subTest(token=invalido):
                self.assertEqual(ligado.get("/mesas", headers={"Authorization": f"Bearer {invalido}"}).status_code, 401)
        desligado = self._app(False)
        self.assertEqual(desligado.get("/mesas", headers={"Authorization": "Bearer dev:narrador"}).status_code, 503)


class NomesDeExibicaoTest(unittest.TestCase):
    def test_nomes_derivados_da_identidade(self):
        from cursed_platform.perfis import nome_de_identidade_dev, nome_de_usuario_supabase

        self.assertEqual(nome_de_identidade_dev("jogador-1"), "Jogador 1")
        self.assertEqual(nome_de_identidade_dev("narrador"), "Narrador")
        self.assertEqual(nome_de_usuario_supabase({"user_metadata": {"full_name": "Ana Souza"}, "email": "a@x.com"}), "Ana Souza")
        self.assertEqual(nome_de_usuario_supabase({"user_metadata": {}, "email": "bruno.m@x.com"}), "bruno.m")
        self.assertIsNone(nome_de_usuario_supabase({}))

    def test_participantes_e_registro_trazem_nomes(self):
        cliente = DevAuthTest()._app(True)
        mestre = {"Authorization": "Bearer dev:narrador"}
        mesa = cliente.post("/mesas", json={"nome": "Mesa"}, headers=mestre).json()["id"]
        codigo = cliente.post(f"/mesas/{mesa}/convites", json={"validade_dias": 1}, headers=mestre).json()["codigo"]
        cliente.post("/convites/aceitar", json={"codigo": codigo}, headers={"Authorization": "Bearer dev:jogador-1"})
        participantes = {p["usuario_id"]: p["nome"] for p in cliente.get(f"/mesas/{mesa}/participantes", headers=mestre).json()}
        self.assertEqual(participantes, {"narrador": "Narrador", "jogador-1": "Jogador 1"})
        eventos = cliente.get(f"/mesas/{mesa}/auditoria", headers=mestre).json()["eventos"]
        self.assertEqual({e["ator_id"]: e["ator_nome"] for e in eventos}, {"narrador": "Narrador", "jogador-1": "Jogador 1"})
