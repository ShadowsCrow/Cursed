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
from cursed_platform.persistence import (
    Base, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro, PersonagemRegistro,
)


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


def ficha(nome, classe, vigor, proposito, pv, pp, exaustao, estresse):
    """Máximos e Escalas vêm da classe (calcular-valores-da-ficha); a ficha guarda só o atual."""
    return {
        "personagem": {"nome": nome, "classe": classe, "nivel": 1},
        "atributos": {"valores": {"Vigor": vigor, "Proposito": proposito}},
        "recursos": {"pv": {"atual": pv}, "pp": {"atual": pp}},
        "desgaste": {"exaustao": exaustao, "estresse": estresse},
    }


class ApiDescansoTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                MembroRegistro(mesa_id="mesa", usuario_id="bruno", papel="jogador"),
            ])
            session.flush()
            session.add_all([
                PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana",
                                   ficha=ficha("Lia", "Acolito", 3, 2, 2, 0, 7, 5)),
                PersonagemRegistro(id="bram", mesa_id="mesa", proprietario_id="bruno",
                                   ficha=ficha("Bram", "Especialista de Combate", 1, 1, 24, 1, 0, 2)),
                PersonagemRegistro(id="guia", mesa_id="mesa", tipo="npc", visibilidade="narrador",
                                   ficha=ficha("Guia", "Mago", 4, 1, 0, 0, 3, 0)),
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

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def as_(self, actor):
        self.actor = actor
        return self.client

    def estado(self):
        with Session(self.engine) as session:
            fichas = {p.id: (p.versao, p.ficha) for p in session.scalars(select(PersonagemRegistro))}
            eventos = len(session.scalars(select(EventoAuditoriaRegistro)).all())
        return fichas, eventos

    PEDIDO = {"tipo": "longo", "conforto": 3, "seguranca": 2,
              "alvos": [{"personagem_id": "lia"}, {"personagem_id": "bram"}, {"personagem_id": "guia"}]}

    def test_previa_lista_resultados_e_cancelar_nao_altera_nada(self):
        antes = self.estado()
        previa = self.as_("mestre").post("/mesas/mesa/descansos/previa", json=self.PEDIDO)
        self.assertEqual(previa.status_code, 200, previa.text)
        resultados = {r["personagem_id"]: r for r in previa.json()["resultados"]}
        lia = resultados["lia"]
        self.assertEqual({r["recurso"]: (r["calculado"], r["aplicado"], r["depois"]) for r in lia["recursos"]},
                         {"pv": (6, 6, 8), "pp": (4, 4, 4)})
        self.assertEqual({t["trilha"]: (t["aplicado"], t["depois"], t["faixa_antes"], t["faixa_depois"])
                          for t in lia["trilhas"]},
                         {"exaustao": (1, 6, "Cansado", "Cansado"), "estresse": (1, 4, "Pressionado", "Controlado")})
        self.assertEqual([r["aplicado"] for r in resultados["bram"]["recursos"]], [0, 3])
        self.assertFalse(previa.json()["permite_foco"])
        self.assertEqual(self.estado(), antes)

    def test_confirmacao_aplica_por_personagem_e_audita(self):
        confirmacao = self.as_("mestre").post("/mesas/mesa/descansos", json={
            **self.PEDIDO, "versoes": {"lia": 0, "bram": 0, "guia": 0}, "motivo": "Noite na caverna",
        })
        self.assertEqual(confirmacao.status_code, 200, confirmacao.text)
        fichas, eventos = self.estado()
        self.assertEqual(fichas["lia"][0], 1)
        self.assertEqual(fichas["lia"][1]["recursos"]["pv"]["atual"], 8)
        self.assertEqual(fichas["lia"][1]["desgaste"], {"exaustao": 6, "estresse": 4})
        self.assertEqual(fichas["bram"][1]["recursos"]["pv"]["atual"], 24)
        self.assertEqual(fichas["guia"][1]["recursos"]["pv"]["atual"], 4)
        self.assertEqual(eventos, 3)

        registro = self.as_("mestre").get("/mesas/mesa/auditoria", params={"categoria": "ficha"}).json()["eventos"]
        self.assertEqual({e["personagem_id"] for e in registro}, {"lia", "bram", "guia"})
        self.assertEqual(len({e["correlacao_id"] for e in registro}), 1)
        self.assertTrue(all("Descanso Longo (Conforto 3, Segurança 2) — Noite na caverna" in e["resumo"] for e in registro))
        [da_ana] = self.as_("ana").get("/mesas/mesa/auditoria").json()["eventos"]
        self.assertEqual((da_ana["personagem_id"], da_ana["acao"]), ("lia", "descanso.aplicado"))
        self.assertIn(("recursos.pv.atual", 2, 8), [(m["campo"], m["antes"], m["depois"]) for m in da_ana["mudancas"]])
        self.assertTrue(self.as_("mestre").get("/mesas/mesa/auditoria",
                                               params={"personagem_id": "lia"}).json()["eventos"][0]["corrigivel"])

    def test_confirmacao_e_tudo_ou_nada(self):
        antes = self.estado()
        conflito = self.as_("mestre").post("/mesas/mesa/descansos", json={
            **self.PEDIDO, "versoes": {"lia": 0, "bram": 5, "guia": 0},
        })
        self.assertEqual(conflito.status_code, 409)
        self.assertIn("Bram", conflito.json()["detail"])
        sem_versao = self.as_("mestre").post("/mesas/mesa/descansos", json={**self.PEDIDO, "versoes": {"lia": 0}})
        self.assertEqual(sem_versao.status_code, 409)
        self.assertEqual(self.estado(), antes)

    def test_permissoes_parametros_e_foco(self):
        antes = self.estado()
        self.assertEqual(self.as_("ana").post("/mesas/mesa/descansos/previa", json=self.PEDIDO).status_code, 403)
        self.assertEqual(self.as_("externo").post("/mesas/mesa/descansos/previa", json=self.PEDIDO).status_code, 404)
        invalidos = (
            {**self.PEDIDO, "conforto": None},
            {**self.PEDIDO, "alvos": [{"personagem_id": "fantasma"}]},
            {**self.PEDIDO, "alvos": [{"personagem_id": "lia", "foco": "pv"}]},
            {**self.PEDIDO, "alvos": [{"personagem_id": "lia"}, {"personagem_id": "lia"}]},
            {**self.PEDIDO, "alvos": [{"personagem_id": "lia", "ajustes": {"pv": -1}}]},
        )
        for corpo in invalidos:
            with self.subTest(corpo=corpo):
                self.assertEqual(self.as_("mestre").post("/mesas/mesa/descansos/previa", json=corpo).status_code, 422)
        refugio = self.as_("mestre").post("/mesas/mesa/descansos/previa", json={
            "tipo": "longo", "conforto": 4, "seguranca": 4,
            "alvos": [{"personagem_id": "lia", "foco": "pv", "ajustes": {"estresse": 0}}],
        }).json()
        self.assertTrue(refugio["permite_foco"])
        [lia] = refugio["resultados"]
        self.assertEqual(lia["recursos"][0]["calculado"], 12)
        self.assertEqual({t["trilha"]: t["aplicado"] for t in lia["trilhas"]}, {"exaustao": 2, "estresse": 0})
        curto = self.as_("mestre").post("/mesas/mesa/descansos/previa", json={
            "tipo": "curto", "alvos": [{"personagem_id": "bram"}]}).json()["resultados"][0]
        self.assertEqual([r["calculado"] for r in curto["recursos"]], [2, 2])
        self.assertEqual(self.estado(), antes)


if __name__ == "__main__":
    unittest.main()
