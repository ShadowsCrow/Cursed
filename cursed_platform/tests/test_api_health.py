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
