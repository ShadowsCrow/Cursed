"""Rotas de catálogo (tarefa 6.1 de calcular-valores-da-ficha)."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform import catalogos
from cursed_platform.catalogos import ErroCatalogo
from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

BASE = "/mesas/mesa/catalogos"


class ApiCatalogosTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                             MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador")])
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

    def test_classes_com_bases_e_arquetipos(self):
        classes = {c["nome"]: c for c in self.client.get(f"{BASE}/classes").json()}
        self.assertEqual(len(classes), 9)
        mago = classes["Mago"]
        self.assertEqual((mago["pv"]["valor"], mago["pv"]["atributo"]), (12, "vigor"))
        self.assertEqual(mago["cor"], "#5B2C6F")
        self.assertEqual([a["nome"] for a in classes["Gatuno"]["arquetipos"]], ["Ladrão", "Assassino", "Psionico"])

    def test_racas_sem_placeholders(self):
        racas = {r["nome"]: r for r in self.client.get(f"{BASE}/racas").json()}
        self.assertEqual((racas["Golias"]["tamanho"], racas["Golias"]["deslocamento"]), ("Enorme", 10))
        self.assertTrue(all(r["habilidades"] == [] for r in racas.values()))

    def test_listas_da_ficha(self):
        listas = self.client.get(f"{BASE}/listas-ficha").json()
        self.assertEqual(listas["sexos"], ["Masculino", "Feminino", "Outro"])
        ganancia = next(p for p in listas["pecados"] if p["nome"] == "Ganância")
        self.assertEqual(ganancia["equivalentes"], ["Ganancia"])
        self.assertEqual(len(listas["campos_personalidade"]), 10)
        historia = next(c for c in listas["campos_personalidade"] if c["chave"] == "historia")
        self.assertEqual((historia["rotulo"], historia["longo"], historia["limite"]), ("História", True, 4000))
        lema = next(c for c in listas["campos_personalidade"] if c["chave"] == "meu_lema")
        self.assertEqual((lema["longo"], lema["limite"]), (False, None))
        self.assertEqual(listas["icones_ficha"]["Proposito"], "proposito")

    def test_efeitos_default_sem_sobrepeso_com_grupo_substituicao_e_icone(self):
        efeitos = {e["associacao"]: e for e in self.client.get(f"{BASE}/efeitos-default").json()}
        self.assertEqual(len(efeitos), 17)
        self.assertNotIn("cc_above", efeitos)
        self.assertNotIn("Sobrepeso", {e["nome"] for e in efeitos.values()})
        cego = efeitos["condicao_cego"]
        self.assertEqual((cego["grupo"], cego["substitui_nomes"]), ("Sentidos e comunicação", ["Ofuscado"]))
        self.assertEqual(cego["icone"], {"origem": "padrao", "caminho": "/icones/efeitos/padrao.webp"})

    def test_nao_participante_nao_acessa(self):
        self.ator = "estranho"
        for rota in ("classes", "racas", "listas-ficha", "efeitos-default", "estado"):
            with self.subTest(rota=rota):
                self.assertEqual(self.client.get(f"{BASE}/{rota}").status_code, 404)

    def test_estado_so_para_o_narrador_e_mostra_o_erro(self):
        self.assertEqual(self.client.get(f"{BASE}/estado").status_code, 403)
        self.ator = "mestre"
        estado = self.client.get(f"{BASE}/estado").json()
        self.assertEqual((estado["versao"], estado["erro"]), (catalogos.obter().versao, None))
        from datetime import UTC, datetime
        erro = ErroCatalogo("classes.json", "JSON inválido (linha 3).", datetime.now(UTC))
        with patch.object(catalogos.CARREGADOR, "erro", return_value=erro):
            estado = self.client.get(f"{BASE}/estado").json()
        self.assertEqual((estado["erro"]["arquivo"], estado["erro"]["motivo"]), ("classes.json", "JSON inválido (linha 3)."))


if __name__ == "__main__":
    unittest.main()
