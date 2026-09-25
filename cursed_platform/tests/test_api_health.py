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
