"""Jornadas de paridade da ficha (docs/migration/parity-criteria.md), contra a API real."""

from __future__ import annotations

import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.domain.efeitos_codec import encode_effect
from cursed_platform.domain.equip_codec import encode_equipment
from cursed_platform.ficha_viva import chave
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro


PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

FIXTURES = PROJECT_ROOT / "fixtures" / "legacy"
SETTINGS = PlatformSettings(
    environment="test", database_url="sqlite:///:memory:",
    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",),
)
CAMPOS_CRITICOS = ("personagem", "personalidade", "atributos", "pericias", "armas", "armaduras", "outros",
                   "efeitos_externos", "campo_desconhecido")


def fixture(nome: str):
    return json.loads((FIXTURES / nome).read_text(encoding="utf-8"))


def preparar_banco(engine) -> None:
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
        session.flush()
        session.add_all([
            MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
            MembroRegistro(mesa_id="mesa", usuario_id="jogador", papel="jogador"),
        ])
        session.commit()


class ParidadeFichaTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        preparar_banco(self.engine)
        self.app = create_app(SETTINGS, engine=self.engine)
        self.actor = "jogador"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def criar(self, ficha) -> str:
        response = self.client.post("/mesas/mesa", json={"ficha": ficha}) if False else \
            self.client.post("/mesas/mesa/personagens", json={"ficha": ficha})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["personagem_id"]

    def test_create_character_authorization(self):
        response = self.client.post("/mesas/mesa/personagens", json={"ficha": fixture("ficha_simples.json")})
        self.assertEqual(response.status_code, 201, response.text)
        corpo = response.json()
        self.assertTrue(corpo["personagem_id"])
        self.assertEqual((corpo["mesa_id"], corpo["versao"]), ("mesa", 0))
        [resumo] = self.client.get("/mesas/mesa/personagens").json()
        self.assertEqual(resumo["proprietario_id"], "jogador")

        self.actor = "mestre"
        self.client.put("/mesas/mesa/politicas", json={
            "permitir_criacao_propria": False, "permitir_edicao_propria": True, "permitir_exclusao_propria": True,
        })
        self.actor = "jogador"
        negado = self.client.post("/mesas/mesa/personagens", json={"ficha": fixture("ficha_simples.json")})
        self.assertEqual(negado.status_code, 403)
        self.assertEqual(len(self.client.get("/mesas/mesa/personagens").json()), 1)

    def test_complex_sheet_round_trip(self):
        original = fixture("ficha_complexa.json")
        personagem_id = self.criar(original)
        lida = self.client.get(f"/mesas/mesa/personagens/{personagem_id}/ficha").json()["ficha"]
        for campo in CAMPOS_CRITICOS:
            with self.subTest(campo=campo):
                self.assertEqual(lida[campo], original[campo])
        # Totais derivados da ficha nova coincidem com os totais gravados pelo Streamlit
        # quando não há efeitos nas tabelas (o efeito legado ainda não foi migrado).
        derivados = {
            v["chave"]: v["total"]
            for v in self.client.get(f"/mesas/mesa/personagens/{personagem_id}/valores-derivados").json()
        }
        for grupo, secao in (("atributo", "atributos"), ("pericia", "pericias")):
            for nome, total in original[secao]["totais"].items():
                with self.subTest(valor=chave(grupo, nome)):
                    self.assertEqual(derivados[chave(grupo, nome)], total)

    def test_character_update_conflict(self):
        personagem_id = self.criar(fixture("ficha_complexa.json"))
        caminho = f"/mesas/mesa/personagens/{personagem_id}/ficha"
        ficha = self.client.get(caminho).json()["ficha"]
        ficha["personalidade"]["pecado"] = "Ira"
        comando = {"id": "c1", "mesa_id": "mesa", "personagem_id": personagem_id, "ator_id": "jogador",
                   "versao_esperada": 0, "ficha": ficha}
        self.assertEqual(self.client.put(caminho, json=comando).status_code, 200)
        depois = self.client.get(caminho).json()
        self.assertEqual(depois["versao"], 1)
        self.assertEqual(depois["ficha"]["personalidade"]["pecado"], "Ira")
        self.assertEqual(depois["ficha"]["personagem"], fixture("ficha_complexa.json")["personagem"])

        ficha["personalidade"]["pecado"] = "Gula"
        self.assertEqual(self.client.put(caminho, json={**comando, "id": "c2"}).status_code, 409)
        self.assertEqual(self.client.get(caminho).json()["ficha"]["personalidade"]["pecado"], "Ira")

    def test_equip_and_unequip_recalculates_effects(self):
        personagem_id = self.criar({"personagem": {"nome": "Teste"},
                                    "pericias": {"valores": {"Investigação": 2}}})
        base = f"/mesas/mesa/personagens/{personagem_id}"
        legado = fixture("equipamento_legado.json")
        legado["efeitos"][0]["modificadores"] = [{"alvo": "pericia:investigacao", "valor": 1}]
        codigo = encode_equipment(legado["tipo"], legado["item"], legado["efeitos"])
        item_id = self.client.post(f"{base}/importacoes", json={"codigo": codigo, "versao_esperada": 0}).json()["item"]["id"]

        def investigacao():
            valor = next(v for v in self.client.get(f"{base}/valores-derivados").json()
                         if v["chave"] == "pericia:investigacao")
            return valor["total"], [(f["tipo"], f["item_id"]) for f in valor["fontes"] if f["tipo"] == "efeito"]

        self.assertEqual(investigacao(), (2, []))
        self.client.post(f"{base}/inventario/{item_id}/equipar", json={"equipado": True, "versao_esperada": 1})
        self.assertEqual(investigacao(), (3, [("efeito", item_id)]))
        self.client.post(f"{base}/inventario/{item_id}/equipar", json={"equipado": False, "versao_esperada": 2})
        self.assertEqual(investigacao(), (2, []))

    def test_effect_lifecycle_audit(self):
        personagem_id = self.criar({"personagem": {"nome": "Teste"}, "pericias": {"valores": {"Esquiva": 2}}})
        base = f"/mesas/mesa/personagens/{personagem_id}"
        self.actor = "mestre"
        aplicado = self.client.post(f"{base}/efeitos", json={
            "nome": "Atordoado", "descricao": "−1 em Esquiva.", "duracao_rodadas": 2, "origem": "Golpe na nuca",
            "modificadores": [{"alvo": "pericia:esquiva", "valor": -1}], "versao_esperada": 0,
        }).json()["efeito"]
        caminho = f"{base}/efeitos/{aplicado['id']}"
        self.client.patch(caminho, json={"duracao_rodadas": 1, "versao_esperada": 1})
        self.client.post(f"{caminho}/suspender", json={"versao_esperada": 2})
        self.client.post(f"{caminho}/encerrar", json={"versao_esperada": 3, "motivo": "Fim do combate"})
        acoes = [e["acao"] for e in self.client.get("/mesas/mesa/auditoria", params={"categoria": "efeito"}).json()["eventos"]]
        self.assertEqual(acoes, ["efeito.encerrado", "efeito.suspenso", "efeito.ajustado", "efeito.aplicado"])

        self.actor = "jogador"
        negado = self.client.post(f"{base}/efeitos", json={"nome": "X", "descricao": "Y", "versao_esperada": 4})
        self.assertEqual(negado.status_code, 403)
        self.assertEqual(self.client.get(f"{base}/efeitos").json(), [])
        esquiva = next(v for v in self.client.get(f"{base}/valores-derivados").json() if v["chave"] == "pericia:esquiva")
        self.assertEqual(esquiva["total"], 2)

    def test_portable_import_preview_and_rejection(self):
        personagem_id = self.criar({"personagem": {"nome": "Teste"}})
        base = f"/mesas/mesa/personagens/{personagem_id}"
        efeito = encode_effect(fixture("efeito_legado.json"))
        previa = self.client.post(f"{base}/importacoes/previa", json={"codigo": efeito})
        self.assertEqual(previa.status_code, 200)
        self.assertEqual(previa.json()["efeitos"][0]["nome"], "Luz de teste")
        self.assertEqual(self.client.get(f"{base}/efeitos").json(), [])

        criado = self.client.post(f"{base}/importacoes", json={"codigo": efeito, "versao_esperada": 0})
        self.assertEqual(criado.status_code, 201)
        [atual] = self.client.get(f"{base}/efeitos").json()
        self.assertEqual((atual["nome"], atual["modificadores"][0]["alvo"]), ("Luz de teste", "pericia:investigacao"))

        invalido = self.client.post(f"{base}/importacoes", json={"codigo": "E1:###", "versao_esperada": 1})
        self.assertEqual(invalido.status_code, 422)
        self.assertEqual(len(self.client.get(f"{base}/efeitos").json()), 1)
        self.assertEqual(self.client.get(f"{base}/ficha").json()["versao"], 1)

    def test_persistent_snapshot_after_restart(self):
        with TemporaryDirectory() as pasta:
            url = f"sqlite:///{Path(pasta) / 'paridade.sqlite'}"
            antes = create_engine(url)
            preparar_banco(antes)
            primeiro = create_app(SETTINGS, engine=antes)
            primeiro.dependency_overrides[get_actor] = lambda: Ator("jogador")
            with TestClient(primeiro) as cliente:
                personagem_id = cliente.post(
                    "/mesas/mesa/personagens", json={"ficha": fixture("ficha_complexa.json")}
                ).json()["personagem_id"]
                cliente.post(f"/mesas/mesa/personagens/{personagem_id}/importacoes", json={
                    "codigo": encode_effect(fixture("efeito_legado.json")), "versao_esperada": 0,
                })
            antes.dispose()

            depois = create_engine(url)
            segundo = create_app(SETTINGS, engine=depois)
            segundo.dependency_overrides[get_actor] = lambda: Ator("jogador")
            with TestClient(segundo) as cliente:
                snapshot = cliente.get(f"/mesas/mesa/personagens/{personagem_id}/ficha").json()
                self.assertEqual((snapshot["mesa_id"], snapshot["versao"]), ("mesa", 1))
                self.assertEqual(snapshot["ficha"]["personagem"]["nome"], "Nara Exemplo")
                self.assertEqual(len(cliente.get(f"/mesas/mesa/personagens/{personagem_id}/efeitos").json()), 1)
            segundo.dependency_overrides[get_actor] = lambda: Ator("externo")
            with TestClient(segundo) as cliente:
                self.assertEqual(cliente.get(f"/mesas/mesa/personagens/{personagem_id}/ficha").status_code, 404)
            depois.dispose()


if __name__ == "__main__":
    unittest.main()
