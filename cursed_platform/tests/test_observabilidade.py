"""Métricas operacionais sem dados privados e consulta mínima de logs."""

from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from cursed_platform import sala
from cursed_platform.config import PlatformSettings
from cursed_platform.observabilidade import resumir


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.main import create_app  # noqa: E402


class ObservabilidadeTest(unittest.TestCase):
    def test_middleware_mede_comando_conflito_e_erro_sem_ids_ou_payload(self):
        engine = create_engine("sqlite:///:memory:")
        settings = PlatformSettings(environment="development", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        app = create_app(settings, engine=engine)

        @app.post("/teste/{segredo}/conflito")
        def conflito(segredo: str):
            raise HTTPException(409, "Mudou.")

        @app.post("/teste/{segredo}/erro")
        def erro(segredo: str):
            raise RuntimeError("conteúdo privado")

        try:
            with patch("cursed_api.main.registrar") as registrar:
                cliente = TestClient(app, raise_server_exceptions=False)
                self.assertEqual(cliente.post("/teste/id-privado/conflito", json={"segredo": "não logar"}).status_code, 409)
                self.assertEqual(cliente.post("/teste/id-privado/erro").status_code, 500)
            self.assertEqual([chamada.args[0] for chamada in registrar.call_args_list], ["conflito", "erro"])
            for chamada in registrar.call_args_list:
                self.assertIn("duracao_ms", chamada.kwargs)
                self.assertEqual(chamada.kwargs["rota"].split("/")[2], "{segredo}")
                self.assertNotIn("id-privado", str(chamada))
                self.assertNotIn("não logar", str(chamada))
                self.assertNotIn("conteúdo privado", str(chamada))
        finally:
            engine.dispose()

    def test_falha_realtime_registra_classe_sem_payload_e_propaga(self):
        session = Mock()
        session.execute.side_effect = RuntimeError("segredo do evento")
        with patch.object(sala, "_realtime_disponivel", return_value=True), \
             patch.object(sala, "registrar") as registrar:
            with self.assertRaises(RuntimeError):
                sala.emitir(session, "mesa-privada", "token.movido", {"segredo": "oculto"}, publico=False)
        self.assertEqual(registrar.call_args.args, ("realtime_falha",))
        self.assertEqual(registrar.call_args.kwargs["classe_erro"], "RuntimeError")
        self.assertNotIn("oculto", str(registrar.call_args))
        self.assertNotIn("mesa-privada", str(registrar.call_args))

    def test_consulta_resume_latencia_conflitos_falhas_e_migracao(self):
        linhas = [json.dumps(item) for item in (
            {"evento": "comando", "rota": "/mesas/{mesa_id}/ficha", "duracao_ms": 10},
            {"evento": "conflito", "rota": "/mesas/{mesa_id}/ficha", "duracao_ms": 30},
            {"evento": "erro", "rota": "/mesas/{mesa_id}/sala", "duracao_ms": 50},
            {"evento": "realtime_falha", "classe_erro": "RuntimeError"},
            {"evento": "migracao", "etapa": "json_e_catalogos", "pendente": 3},
        )]
        resumo = resumir([*linhas, "linha inválida"])
        self.assertEqual(resumo["latencia_p95_ms"], 50)
        self.assertEqual(resumo["contagens"]["conflito"], 1)
        self.assertEqual(resumo["contagens"]["realtime_falha"], 1)
        self.assertEqual(resumo["migracoes"][0]["pendente"], 3)


if __name__ == "__main__":
    unittest.main()
