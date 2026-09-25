from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, ConviteMesaRegistro


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


class ApiTablesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        settings = PlatformSettings(
            environment="test", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000,
            cors_origins=("http://localhost:5173",),
        )
        self.app = create_app(settings, engine=self.engine)
        self.actor_id = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor_id)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def create_table(self, name: str = "Mesa de teste") -> str:
        response = self.client.post("/mesas", json={"nome": name})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def test_narrator_invites_player_and_revokes_access(self):
        mesa_id = self.create_table()
        created = self.client.post(f"/mesas/{mesa_id}/convites", json={"validade_dias": 7})
        self.assertEqual(created.status_code, 201, created.text)
        code = created.json()["codigo"]
        with Session(self.engine) as session:
            convite = session.scalar(select(ConviteMesaRegistro))
            self.assertNotEqual(convite.token_hash, code)
            self.assertEqual(convite.token_hash, sha256(code.encode("utf-8")).hexdigest())

        self.actor_id = "jogador"
        self.assertEqual(self.client.get("/mesas").json(), [])
        joined = self.client.post("/convites/aceitar", json={"codigo": code})
        self.assertEqual(joined.status_code, 200, joined.text)
        self.assertEqual(joined.json()["papel"], "jogador")
        self.assertEqual(
            [member["usuario_id"] for member in self.client.get(f"/mesas/{mesa_id}/participantes").json()],
            ["jogador", "mestre"],
        )
        self.actor_id = "outro-jogador"
        self.assertEqual(self.client.post("/convites/aceitar", json={"codigo": code}).status_code, 404)
        self.actor_id = "mestre"
        self.assertEqual(
            self.client.delete(f"/mesas/{mesa_id}/participantes/jogador").status_code, 204
        )
        self.actor_id = "jogador"
        self.assertEqual(self.client.get("/mesas").json(), [])
        self.assertEqual(self.client.get(f"/mesas/{mesa_id}/participantes").status_code, 404)

    def test_role_is_scoped_to_each_table(self):
        mesa_narrada = self.create_table("Mesa narrada")
        self.actor_id = "outro-mestre"
        mesa_jogada = self.create_table("Mesa jogada")
        code = self.client.post(f"/mesas/{mesa_jogada}/convites", json={}).json()["codigo"]
        self.actor_id = "mestre"
        self.assertEqual(self.client.post("/convites/aceitar", json={"codigo": code}).status_code, 200)
        roles = {mesa["id"]: mesa["papel"] for mesa in self.client.get("/mesas").json()}
        self.assertEqual(roles, {mesa_narrada: "narrador", mesa_jogada: "jogador"})
        self.assertEqual(self.client.post(f"/mesas/{mesa_narrada}/convites", json={}).status_code, 201)
        self.assertEqual(self.client.post(f"/mesas/{mesa_jogada}/convites", json={}).status_code, 403)

    def test_expired_invite_cannot_be_used(self):
        mesa_id = self.create_table()
        code = self.client.post(f"/mesas/{mesa_id}/convites", json={}).json()["codigo"]
        with Session(self.engine) as session:
            convite = session.scalar(select(ConviteMesaRegistro))
            convite.expira_em = datetime.now(UTC) - timedelta(days=1)
            session.commit()
        self.actor_id = "jogador"
        self.assertEqual(self.client.post("/convites/aceitar", json={"codigo": code}).status_code, 404)


if __name__ == "__main__":
    unittest.main()
