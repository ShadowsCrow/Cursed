"""Valores de recurso, avisos da ficha e ajuste do Narrador (tarefa 6.2 de calcular-valores-da-ficha)."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro, PersonagemRegistro

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

MAGO = {"personagem": {"nome": "Lia", "classe": "Mago", "nivel": 5},
        "atributos": {"valores": {"Vigor": 3, "Proposito": 2, "Força": 0}},
        "recursos": {"pv": {"atual": 30, "maximo": 20}}}
BASE = "/mesas/mesa/personagens"


class ApiRecursosTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana", versao=0, ficha=MAGO),
                PersonagemRegistro(id="velho", mesa_id="mesa", proprietario_id="ana", versao=0,
                                   ficha={"personagem": {"nome": "Velho", "classe": "Guerreiro", "nivel": 1}}),
            ])
            session.commit()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.ator = "ana"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def recursos(self, personagem_id: str) -> dict:
        valores = self.client.get(f"{BASE}/{personagem_id}/valores-derivados").json()
        return {v["chave"]: v for v in valores if v["grupo"] == "recurso"}

    def ajustar(self, **corpo):
        return self.client.post(f"{BASE}/lia/recursos/ajustes", json={
            "versao_esperada": 0, "alvo": "pv_maximo", "valor": 3, "origem": "Bênção do Templo",
            "justificativa": "Campanha da Montanha", **corpo})

    def test_pv_maximo_com_fontes_e_divergencia_legada(self):
        pv = self.recursos("lia")["recurso:pv_maximo"]
        self.assertEqual((pv["total"], pv["calculavel"], pv["divergencia_legada"]), (35, True, 20))
        self.assertEqual([(f["tipo"], f["valor"]) for f in pv["fontes"]], [("classe", 12), ("atributo", 3), ("nivel", 20)])
        self.assertEqual(self.recursos("lia")["recurso:pp_maximo"]["total"], 24)

    def test_classe_fora_do_catalogo_nao_e_calculavel(self):
        pv = self.recursos("velho")["recurso:pv_maximo"]
        self.assertEqual((pv["total"], pv["calculavel"]), (None, False))
        self.assertIn("vincule a classe", pv["motivo"])

    def test_ficha_traz_avisos_sem_alterar_valores(self):
        corpo = self.client.get(f"{BASE}/lia/ficha").json()
        self.assertIn("atributos.valores.Força", {a["campo"] for a in corpo["avisos"]})
        self.assertEqual(corpo["ficha"]["atributos"]["valores"]["Força"], 0)
        self.assertIn("personagem.classe", {a["campo"] for a in self.client.get(f"{BASE}/velho/ficha").json()["avisos"]})

    def test_narrador_registra_ajuste_com_origem(self):
        self.ator = "mestre"
        resposta = self.ajustar()
        self.assertEqual(resposta.status_code, 201, resposta.text)
        pv = next(v for v in resposta.json()["valores"] if v["chave"] == "recurso:pv_maximo")
        self.assertEqual(pv["total"], 38)
        self.assertEqual((pv["fontes"][-1]["tipo"], pv["fontes"][-1]["descricao"], pv["fontes"][-1]["valor"]),
                         ("ajuste_narrador", "Bênção do Templo", 3))
        with Session(self.engine) as session:
            evento = session.scalar(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == "recurso.ajustado"))
            ajustes = session.get(PersonagemRegistro, "lia").ficha["recursos"]["ajustes"]
        self.assertIn("Bênção do Templo", evento.resumo)
        self.assertEqual((ajustes[0]["autor_id"], ajustes[0]["justificativa"]), ("mestre", "Campanha da Montanha"))

    def test_ajuste_sem_origem_e_recusado(self):
        self.ator = "mestre"
        self.assertEqual(self.ajustar(origem="").status_code, 422)

    def test_jogador_nao_registra_ajuste(self):
        self.assertEqual(self.ajustar(origem="Eu", justificativa="Quero").status_code, 403)


if __name__ == "__main__":
    unittest.main()
