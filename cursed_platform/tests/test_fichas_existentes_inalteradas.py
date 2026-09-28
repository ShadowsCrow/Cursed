"""Fichas existentes não mudam com o assistente e o novo tema (tarefa 6.1 de criacao-guiada-e-nova-estetica).

As fichas de exemplo (`fixtures/legacy`) são abertas pela API antes e depois de usar a prévia e a
criação pelo assistente; valores, avisos e seções precisam ser idênticos. A mudança não traz
migração de dados nem altera catálogos.
"""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro, PersonagemRegistro

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

from cursed_platform.tests.test_api_previa_criacao import FICHA_ASSISTENTE  # noqa: E402

FIXTURES = PROJECT_ROOT / "fixtures" / "legacy"
FICHAS = ("ficha_simples.json", "ficha_complexa.json")


class FichasExistentesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                             MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador")])
            for indice, nome in enumerate(FICHAS):
                ficha = json.loads((FIXTURES / nome).read_text(encoding="utf-8"))
                session.add(PersonagemRegistro(id=f"legado-{indice}", mesa_id="mesa", proprietario_id="ana", versao=0, ficha=ficha))
            session.commit()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.app.dependency_overrides[get_actor] = lambda: Ator("ana")
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def retrato(self) -> dict:
        saida = {}
        for indice in range(len(FICHAS)):
            base = f"/mesas/mesa/personagens/legado-{indice}"
            ficha = self.client.get(f"{base}/ficha").json()
            valores = self.client.get(f"{base}/valores-derivados").json()
            saida[indice] = {
                "versao": ficha["versao"],
                "ficha": ficha["ficha"],
                "secoes": sorted(ficha["ficha"]),
                "avisos": ficha["avisos"],
                "valores": {v["chave"]: (v["total"], v["calculavel"], [f["valor"] for f in v["fontes"]]) for v in valores},
            }
        return saida

    def test_previa_e_criacao_nao_alteram_fichas_existentes(self):
        antes = self.retrato()
        self.assertTrue(all(r["valores"] for r in antes.values()))
        for _ in range(3):
            self.assertEqual(self.client.post("/mesas/mesa/personagens/previa", json={"ficha": FICHA_ASSISTENTE}).status_code, 200)
        self.assertEqual(self.client.post("/mesas/mesa/personagens", json={"ficha": FICHA_ASSISTENTE}).status_code, 201)
        self.assertEqual(self.retrato(), antes)

    def _git(self, *argumentos: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(["git", "-c", f"safe.directory={PROJECT_ROOT.as_posix()}", *argumentos],
                              cwd=PROJECT_ROOT, capture_output=True, text=True, encoding="utf-8", check=False)

    def test_sem_migracao_e_catalogos_so_com_as_alturas_aprovadas(self):
        migracoes = self._git("status", "--porcelain", "--", "platform/migration/versions")
        if migracoes.returncode != 0:
            self.skipTest("git indisponível")
        self.assertEqual(migracoes.stdout.strip(), "")
        # Alterações de catálogo aprovadas pelo usuário: os dados de altura (seção 8, design D12) e, em
        # aba-resumo-da-ficha, o campo narrativo História e os ícones do Resumo. Nenhum valor mecânico.
        def listas_sem_aprovadas(d):
            limpas = {k: v for k, v in d.items() if k not in ("faixas_de_altura", "icones_ficha")}
            limpas["campos_personalidade"] = [c for c in d.get("campos_personalidade", []) if c.get("chave") != "historia"]
            return limpas

        sem_altura = {
            "racas.json": lambda d: [{k: v for k, v in r.items() if k != "altura"} for r in d],
            "listas_ficha.json": listas_sem_aprovadas,
            "classes.json": lambda d: d,
            "efeitos_default.json": lambda d: d,
        }
        for arquivo, limpar in sem_altura.items():
            anterior = self._git("show", f"HEAD:cursed_platform/catalogos/{arquivo}")
            if anterior.returncode != 0:
                self.skipTest("histórico do git indisponível")
            atual = json.loads((PROJECT_ROOT / "cursed_platform" / "catalogos" / arquivo).read_text(encoding="utf-8"))
            self.assertEqual(limpar(atual), limpar(json.loads(anterior.stdout)), arquivo)

if __name__ == "__main__":
    unittest.main()
