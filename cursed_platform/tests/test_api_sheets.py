from __future__ import annotations

import json
from dataclasses import replace
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro, PersonagemRegistro
from cursed_platform.repositories import FichaRepository


PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


class ApiSheetsTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all(
                [
                    MesaRegistro(id="mesa-1", nome="Mesa de teste", narrador_id="narrador-1"),
                    MembroRegistro(mesa_id="mesa-1", usuario_id="narrador-1", papel="narrador"),
                    MembroRegistro(mesa_id="mesa-1", usuario_id="jogador-1", papel="jogador"),
                    MembroRegistro(mesa_id="mesa-1", usuario_id="jogador-2", papel="jogador"),
                    PersonagemRegistro(
                        id="personagem-1", mesa_id="mesa-1", proprietario_id="jogador-1",
                        versao=0, ficha={},
                    ),
                ]
            )
            session.commit()
        settings = PlatformSettings(
            environment="test", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000,
            cors_origins=("http://localhost:5173",),
        )
        self.app = create_app(settings, engine=self.engine)
        self.actor_id = "jogador-1"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor_id)
        self.client = TestClient(self.app)
        self.path = "/mesas/mesa-1/personagens/personagem-1/ficha"
        with (PROJECT_ROOT / "fixtures" / "legacy" / "ficha_complexa.json").open(encoding="utf-8") as fixture:
            self.fixture = json.load(fixture)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def command(self, *, version: int = 0, actor_id: str = "jogador-1"):
        return {
            "id": "cmd-1", "mesa_id": "mesa-1", "ator_id": actor_id,
            "versao_esperada": version, "personagem_id": "personagem-1",
            "ficha": self.fixture,
        }

    def test_complex_legacy_sheet_is_saved_and_read_without_losing_fields(self):
        written = self.client.put(self.path, json=self.command())
        self.assertEqual(written.status_code, 200, written.text)
        self.assertEqual(written.json()["versao"], 1)
        self.assertEqual(written.json()["ficha"], self.fixture)
        loaded = self.client.get(self.path)
        self.assertEqual(loaded.status_code, 200)
        self.assertEqual(loaded.json()["ficha"], self.fixture)
        with Session(self.engine) as session:
            self.assertEqual(session.get(PersonagemRegistro, "personagem-1").ficha, self.fixture)

    def test_stale_version_and_actor_spoofing_are_rejected(self):
        self.assertEqual(self.client.put(self.path, json=self.command()).status_code, 200)
        self.assertEqual(self.client.put(self.path, json=self.command()).status_code, 409)
        self.assertEqual(
            self.client.put(self.path, json=self.command(version=1, actor_id="narrador-1")).status_code,
            400,
        )

    def test_membership_ownership_and_policy_gate_access(self):
        self.actor_id = "jogador-2"
        self.assertEqual(self.client.get(self.path).status_code, 404)
        self.assertEqual(self.client.put(self.path, json=self.command(actor_id="jogador-2")).status_code, 404)
        self.actor_id = "jogador-1"
        with Session(self.engine) as session:
            session.get(MesaRegistro, "mesa-1").permitir_edicao_propria = False
            session.commit()
        self.assertEqual(self.client.get(self.path).status_code, 200)
        self.assertEqual(self.client.put(self.path, json=self.command()).status_code, 403)

    def test_hidden_character_is_not_visible_to_its_player_owner(self):
        with Session(self.engine) as session:
            session.get(PersonagemRegistro, "personagem-1").visibilidade = "narrador"
            session.commit()
        self.assertEqual(self.client.get(self.path).status_code, 404)
        self.actor_id = "narrador-1"
        self.assertEqual(self.client.get(self.path).status_code, 200)

    def test_soft_deleted_sheet_disappears_from_normal_http_reads(self):
        with Session(self.engine) as session:
            self.assertTrue(FichaRepository(session).excluir(
                "mesa-1", "personagem-1", 0, "narrador-1"
            ))
            session.commit()
        self.assertEqual(self.client.get(self.path).status_code, 404)

    def test_missing_token_is_denied_by_default(self):
        self.app.dependency_overrides.clear()
        self.assertEqual(self.client.get(self.path).status_code, 401)

    def test_supabase_identity_is_checked_before_reading_a_sheet(self):
        self.app.dependency_overrides.clear()
        self.app.state.settings = replace(
            self.app.state.settings,
            supabase_url="https://identity.example",
            supabase_publishable_key="public-test-key",
        )
        with patch("cursed_api.auth.httpx.get", return_value=httpx.Response(200, json={"id": "jogador-1"})) as verify:
            response = self.client.get(self.path, headers={"Authorization": "Bearer valid-test-token"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(verify.call_args.kwargs["headers"]["Authorization"], "Bearer valid-test-token")
        for token in ("invalid-test-token", "expired-test-token"):
            with self.subTest(token=token):
                with patch("cursed_api.auth.httpx.get", return_value=httpx.Response(401)):
                    self.assertEqual(
                        self.client.get(self.path, headers={"Authorization": f"Bearer {token}"}).status_code,
                        401,
                    )
        with patch("cursed_api.auth.httpx.get", return_value=httpx.Response(503)):
            self.assertEqual(
                self.client.get(self.path, headers={"Authorization": "Bearer valid-test-token"}).status_code,
                503,
            )


if __name__ == "__main__":
    unittest.main()
