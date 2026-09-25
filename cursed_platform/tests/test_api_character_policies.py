from __future__ import annotations

from itertools import product
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro, PedidoAlteracaoRegistro, PersonagemRegistro
from cursed_platform.policies import avaliar_campos, campos_alterados


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


class ApiCharacterPoliciesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([
                MesaRegistro(id="mesa-1", nome="Mesa", narrador_id="mestre"),
                MesaRegistro(id="mesa-2", nome="Outra", narrador_id="outro-mestre"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="jogador", papel="jogador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="outro-jogador", papel="jogador"),
                MembroRegistro(mesa_id="mesa-2", usuario_id="outro-mestre", papel="narrador"),
            ])
            session.commit()
        settings = PlatformSettings(
            environment="test", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",),
        )
        self.app = create_app(settings, engine=self.engine)
        self.actor = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor)
        self.client = TestClient(self.app)
        self.policy_path = "/mesas/mesa-1/politicas"

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def policy(self, *, create=True, edit=True, delete=True, blocked=None, approval=None):
        return {
            "permitir_criacao_propria": create,
            "permitir_edicao_propria": edit,
            "permitir_exclusao_propria": delete,
            "campos_bloqueados": blocked or [],
            "campos_exigem_aprovacao": approval or [],
        }

    def set_policy(self, **kwargs):
        self.actor = "mestre"
        response = self.client.put(self.policy_path, json=self.policy(**kwargs))
        self.assertEqual(response.status_code, 200, response.text)

    def create_character(self, name="Lia"):
        response = self.client.post(
            "/mesas/mesa-1/personagens", json={"ficha": {"personagem": {"nome": name}}},
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["personagem_id"]

    def update(self, character_id, *, name="Lia Nova", level=None, version=0):
        ficha = {"personagem": {"nome": name}}
        if level is not None:
            ficha["personagem"]["nivel"] = level
        return self.client.put(
            f"/mesas/mesa-1/personagens/{character_id}/ficha",
            json={
                "id": "cmd-1", "mesa_id": "mesa-1", "ator_id": self.actor,
                "versao_esperada": version, "personagem_id": character_id, "ficha": ficha,
            },
        )

    def test_create_edit_delete_policy_combinations_and_ownership(self):
        for create, edit, delete in product((False, True), repeat=3):
            with self.subTest(create=create, edit=edit, delete=delete):
                self.set_policy()
                self.actor = "jogador"
                character_id = self.create_character("Original")
                self.set_policy(create=create, edit=edit, delete=delete)
                self.actor = "jogador"
                created = self.client.post(
                    "/mesas/mesa-1/personagens", json={"ficha": {"personagem": {"nome": "Nova"}}},
                )
                self.assertEqual(created.status_code, 201 if create else 403, created.text)
                changed = self.update(character_id)
                self.assertEqual(changed.status_code, 200 if edit else 403, changed.text)
                self.assertEqual(
                    self.client.delete(
                        f"/mesas/mesa-1/personagens/{character_id}?versao_esperada={1 if edit else 0}"
                    ).status_code,
                    204 if delete else 403,
                )
                self.actor = "mestre"
                narrator_created = self.create_character("Narrador")
                self.assertEqual(self.update(narrator_created).status_code, 200)

        self.set_policy(create=True, edit=True, delete=True)
        self.actor = "jogador"
        character_id = self.create_character()
        self.assertEqual(self.update(character_id).status_code, 200)
        self.assertEqual(self.update(character_id, version=0).status_code, 409)
        self.actor = "outro-jogador"
        self.assertEqual(self.update(character_id, version=1).status_code, 404)
        self.actor = "jogador"
        self.assertEqual(
            self.client.delete(f"/mesas/mesa-1/personagens/{character_id}?versao_esperada=0").status_code,
            409,
        )
        self.assertEqual(
            self.client.delete(f"/mesas/mesa-1/personagens/{character_id}?versao_esperada=1").status_code,
            204,
        )
        self.assertEqual(self.client.get(f"/mesas/mesa-1/personagens/{character_id}/ficha").status_code, 404)

    def test_policy_configuration_is_narrator_only_and_table_scoped(self):
        self.actor = "jogador"
        self.assertEqual(self.client.put(self.policy_path, json=self.policy(create=False)).status_code, 403)
        self.actor = "externo"
        self.assertEqual(self.client.get(self.policy_path).status_code, 404)
        self.assertEqual(self.client.get("/mesas/mesa-2/solicitacoes").status_code, 404)
        self.set_policy(create=False, blocked=["personagem.nivel"])
        self.actor = "jogador"
        self.assertFalse(self.client.get(self.policy_path).json()["permitir_criacao_propria"])
        self.actor = "outro-mestre"
        self.assertEqual(self.client.get("/mesas/mesa-2/politicas").json()["campos_bloqueados"], [])
        self.assertEqual(self.client.put(self.policy_path, json=self.policy()).status_code, 404)
        self.actor = "mestre"
        self.assertEqual(
            self.client.put(self.policy_path, json=self.policy(blocked=["personagem..nivel"])).status_code,
            422,
        )

    def test_locked_approval_rejection_and_stale_decision(self):
        self.set_policy(blocked=["personagem.nivel"], approval=["personagem.nome"])
        self.actor = "jogador"
        character_id = self.create_character()
        self.assertEqual(self.update(character_id, level=2).status_code, 403)
        path = f"/mesas/mesa-1/personagens/{character_id}/ficha"
        self.assertEqual(self.client.get(path).json()["versao"], 0)
        pending = self.update(character_id)
        self.assertEqual(pending.status_code, 202, pending.text)
        self.assertEqual(pending.json()["estado"], "pendente")
        self.assertEqual(self.client.get(path).json()["ficha"]["personagem"]["nome"], "Lia")
        self.assertEqual(self.client.get("/mesas/mesa-1/solicitacoes").status_code, 403)
        self.actor = "mestre"
        queue = self.client.get("/mesas/mesa-1/solicitacoes")
        self.assertEqual([item["id"] for item in queue.json()], [pending.json()["id"]])
        decision_path = f"/mesas/mesa-1/solicitacoes/{pending.json()['id']}/decisao"
        self.assertEqual(self.client.post(decision_path, json={"aprovar": False}).json()["estado"], "rejeitado")
        self.assertEqual(self.client.post(decision_path, json={"aprovar": True}).status_code, 409)
        self.actor = "jogador"
        pending = self.update(character_id)
        self.assertEqual(pending.status_code, 202, pending.text)
        self.actor = "mestre"
        decision_path = f"/mesas/mesa-1/solicitacoes/{pending.json()['id']}/decisao"
        self.assertEqual(self.client.post(decision_path, json={"aprovar": True}).json()["estado"], "aprovado")
        self.assertEqual(self.client.get(path).json()["ficha"]["personagem"]["nome"], "Lia Nova")
        self.assertEqual(self.client.get(path).json()["versao"], 1)
        self.actor = "jogador"
        stale = self.update(character_id, name="Outra", version=1)
        self.assertEqual(stale.status_code, 202)
        self.actor = "mestre"
        self.assertEqual(self.update(character_id, name="Mestre", version=1).status_code, 200)
        stale_path = f"/mesas/mesa-1/solicitacoes/{stale.json()['id']}/decisao"
        self.assertEqual(self.client.post(stale_path, json={"aprovar": True}).status_code, 409)
        with Session(self.engine) as session:
            request = session.scalar(select(PedidoAlteracaoRegistro).where(PedidoAlteracaoRegistro.id == stale.json()["id"]))
            self.assertEqual(request.estado, "pendente")
            self.assertEqual(session.get(PersonagemRegistro, character_id).ficha["personagem"]["nome"], "Mestre")

    def test_nested_policy_protects_parent_removal(self):
        changed = campos_alterados({"personagem": {"nivel": 2}}, {})
        self.assertEqual(changed, {"personagem"})
        result = avaliar_campos(changed, bloqueados=["personagem.nivel"], exigem_aprovacao=[])
        self.assertEqual(result.bloqueados, frozenset({"personagem"}))


if __name__ == "__main__":
    unittest.main()
