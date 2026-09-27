from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro, PersonagemRegistro


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


class ApiCharacterLifecycleTest(unittest.TestCase):
    """Lista, criação, abertura, transferência e exclusão recuperável ponta a ponta."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([
                MesaRegistro(id="mesa-1", nome="Mesa", narrador_id="mestre"),
                MesaRegistro(id="mesa-2", nome="Outra", narrador_id="outro-mestre"),
            ])
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa-1", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="jogador", papel="jogador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="outro-jogador", papel="jogador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="removido", papel="jogador", ativo=False),
                MembroRegistro(mesa_id="mesa-2", usuario_id="outro-mestre", papel="narrador"),
            ])
            session.flush()
            session.add(PersonagemRegistro(
                id="vilao", mesa_id="mesa-1", tipo="npc", visibilidade="narrador",
                ficha={"personagem": {"nome": "Vilão"}},
            ))
            session.commit()
        settings = PlatformSettings(
            environment="test", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",),
        )
        self.app = create_app(settings, engine=self.engine)
        self.actor = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def as_(self, actor: str) -> TestClient:
        self.actor = actor
        return self.client

    def create(self, actor: str, name: str) -> str:
        response = self.as_(actor).post(
            "/mesas/mesa-1/personagens", json={"ficha": {"personagem": {"nome": name, "idade": 20}}},
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["personagem_id"]

    def listed(self, actor: str, **params) -> list[str]:
        response = self.as_(actor).get("/mesas/mesa-1/personagens", params=params)
        self.assertEqual(response.status_code, 200, response.text)
        return [item["nome"] for item in response.json()]

    def summary(self, actor: str, character_id: str) -> dict:
        response = self.as_(actor).get("/mesas/mesa-1/personagens")
        return next(item for item in response.json() if item["id"] == character_id)

    def test_listagem_respeita_propriedade_visibilidade_e_mesa(self):
        self.create("jogador", "Lia")
        self.create("outro-jogador", "Bram")
        self.create("mestre", "Aliada")

        self.assertEqual(self.listed("mestre"), ["Aliada", "Bram", "Lia", "Vilão"])
        self.assertEqual(self.listed("jogador"), ["Lia"])
        self.assertEqual(self.listed("outro-jogador"), ["Bram"])
        for actor in ("externo", "removido", "outro-mestre"):
            with self.subTest(actor=actor):
                response = self.as_(actor).get("/mesas/mesa-1/personagens")
                self.assertEqual(response.status_code, 404)
                self.assertNotIn("Lia", response.text)

    def test_jogador_cria_e_abre_personagem_proprio(self):
        character_id = self.create("jogador", "Lia")
        resumo = self.summary("jogador", character_id)
        self.assertEqual(resumo["proprietario_id"], "jogador")
        self.assertEqual((resumo["tipo"], resumo["visibilidade"], resumo["versao"]), ("personagem", "mesa", 0))

        aberta = self.as_("jogador").get(f"/mesas/mesa-1/personagens/{character_id}/ficha")
        self.assertEqual(aberta.status_code, 200)
        self.assertEqual(aberta.json()["ficha"]["personagem"]["nome"], "Lia")
        self.assertEqual(self.as_("mestre").get(f"/mesas/mesa-1/personagens/{character_id}/ficha").status_code, 200)
        self.assertEqual(
            self.as_("outro-jogador").get(f"/mesas/mesa-1/personagens/{character_id}/ficha").status_code, 404
        )

    def test_transferencia_e_exclusiva_do_narrador_e_muda_quem_acessa(self):
        character_id = self.create("jogador", "Lia")
        path = f"/mesas/mesa-1/personagens/{character_id}/transferencia"

        negado = self.as_("jogador").post(path, json={"proprietario_id": "outro-jogador", "versao_esperada": 0})
        self.assertEqual(negado.status_code, 403)
        self.assertEqual(self.as_("outro-mestre").post(
            path, json={"proprietario_id": "outro-mestre", "versao_esperada": 0}
        ).status_code, 404)

        for destino in ("externo", "removido", "outro-mestre"):
            with self.subTest(destino=destino):
                self.assertEqual(self.as_("mestre").post(
                    path, json={"proprietario_id": destino, "versao_esperada": 0}
                ).status_code, 422)

        transferido = self.as_("mestre").post(path, json={"proprietario_id": "outro-jogador", "versao_esperada": 0})
        self.assertEqual(transferido.status_code, 200, transferido.text)
        self.assertEqual((transferido.json()["proprietario_id"], transferido.json()["versao"]), ("outro-jogador", 1))
        self.assertEqual(self.listed("jogador"), [])
        self.assertEqual(self.listed("outro-jogador"), ["Lia"])
        self.assertEqual(self.as_("jogador").get(f"/mesas/mesa-1/personagens/{character_id}/ficha").status_code, 404)

        desatualizado = self.as_("mestre").post(path, json={"proprietario_id": "jogador", "versao_esperada": 0})
        self.assertEqual(desatualizado.status_code, 409)
        self.assertEqual(self.summary("mestre", character_id)["proprietario_id"], "outro-jogador")

        exclusivo = self.as_("mestre").post(path, json={"proprietario_id": None, "versao_esperada": 1})
        self.assertEqual(exclusivo.status_code, 200)
        self.assertIsNone(exclusivo.json()["proprietario_id"])
        self.assertEqual(self.listed("outro-jogador"), [])

        self.assertEqual(self.as_("mestre").post(
            "/mesas/mesa-1/personagens/inexistente/transferencia",
            json={"proprietario_id": "jogador", "versao_esperada": 0},
        ).status_code, 404)

    def test_exclusao_recuperavel_e_restauracao_pelo_narrador(self):
        character_id = self.create("jogador", "Lia")
        excluido = self.as_("jogador").delete(f"/mesas/mesa-1/personagens/{character_id}?versao_esperada=0")
        self.assertEqual(excluido.status_code, 204)
        self.assertEqual(self.listed("jogador"), [])
        self.assertNotIn("Lia", self.listed("mestre"))
        self.assertEqual(
            self.as_("mestre").post(
                f"/mesas/mesa-1/personagens/{character_id}/transferencia",
                json={"proprietario_id": "outro-jogador", "versao_esperada": 1},
            ).status_code,
            404,
        )

        self.assertEqual(self.as_("jogador").get("/mesas/mesa-1/personagens?excluidos=true").status_code, 403)
        lixeira = self.as_("mestre").get("/mesas/mesa-1/personagens", params={"excluidos": True})
        self.assertEqual(lixeira.status_code, 200)
        [item] = lixeira.json()
        self.assertEqual((item["id"], item["versao"]), (character_id, 1))
        self.assertIsNotNone(item["excluido_em"])
        self.assertIsNotNone(item["restauravel_ate"])

        restore = f"/mesas/mesa-1/personagens/{character_id}/restauracao"
        self.assertEqual(self.as_("jogador").post(f"{restore}?versao_esperada=1").status_code, 403)
        self.assertEqual(self.as_("mestre").post(f"{restore}?versao_esperada=0").status_code, 409)
        restaurado = self.as_("mestre").post(f"{restore}?versao_esperada=1")
        self.assertEqual(restaurado.status_code, 200, restaurado.text)
        self.assertEqual((restaurado.json()["proprietario_id"], restaurado.json()["versao"]), ("jogador", 2))
        self.assertIsNone(restaurado.json()["excluido_em"])

        self.assertEqual(self.listed("jogador"), ["Lia"])
        ficha = self.as_("jogador").get(f"/mesas/mesa-1/personagens/{character_id}/ficha").json()
        self.assertEqual(ficha["ficha"]["personagem"], {"nome": "Lia", "idade": 20, "nivel": 1})
        self.assertEqual(self.as_("mestre").post(f"{restore}?versao_esperada=2").status_code, 404)

    def test_restauracao_fora_da_retencao_e_recusada(self):
        character_id = self.create("jogador", "Lia")
        self.as_("jogador").delete(f"/mesas/mesa-1/personagens/{character_id}?versao_esperada=0")
        with Session(self.engine) as session:
            personagem = session.get(PersonagemRegistro, character_id)
            personagem.excluido_em = datetime.now(UTC) - timedelta(days=31)
            session.commit()

        self.assertEqual(self.as_("mestre").get("/mesas/mesa-1/personagens?excluidos=true").json(), [])
        expirado = self.as_("mestre").post(
            f"/mesas/mesa-1/personagens/{character_id}/restauracao?versao_esperada=1"
        )
        self.assertEqual(expirado.status_code, 410)
        self.assertEqual(self.listed("jogador"), [])


if __name__ == "__main__":
    unittest.main()
