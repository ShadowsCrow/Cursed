"""Cartas de catálogo pela API e sincronização quando o JSON muda (tarefas 5.2 e 5.6)."""

from __future__ import annotations

import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from cursed_platform import catalogos
from cursed_platform.catalogos import Carregador
from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import (
    Base, CartaPersonagemRegistro, CartaVersaoRegistro, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro,
    PersonagemRegistro,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402
    from cursed_api.sincronizacao import SincronizadorCatalogo  # noqa: E402

FICHA = {"personagem": {"nome": "Lia", "classe": "Mago", "arquetipo": "Mutante Arcano", "raca": "Elfo", "nivel": 1},
         "atributos": {"valores": {"Vigor": 3, "Proposito": 2}}}


class _Base(unittest.TestCase):
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

    def titulos(self, personagem_id: str) -> list[str]:
        with Session(self.engine) as session:
            posses = session.scalars(select(CartaPersonagemRegistro).where(
                CartaPersonagemRegistro.personagem_id == personagem_id, CartaPersonagemRegistro.estado == "aprendida"))
            return sorted(session.get(CartaVersaoRegistro, p.versao_id).conteudo["titulo"] for p in posses)


class ApiCartasCatalogoTest(_Base):
    def test_personagem_novo_recebe_as_cartas_da_classe(self):
        criado = self.client.post("/mesas/mesa/personagens", json={"ficha": FICHA})
        self.assertEqual(criado.status_code, 201, criado.text)
        mago = catalogos.ler().classe("Mago")
        esperado = [h.nome for h in mago.habilidades] + [h.nome for h in mago.arquetipo("Mutante Arcano").habilidades]
        self.assertEqual(self.titulos(criado.json()["personagem_id"]), sorted(esperado))

    def test_troca_de_classe_pela_ficha_audita_na_mesma_gravacao(self):
        personagem_id = self.client.post("/mesas/mesa/personagens", json={"ficha": FICHA}).json()["personagem_id"]
        self.ator = "mestre"
        caminho = f"/mesas/mesa/personagens/{personagem_id}/ficha"
        ficha = self.client.get(caminho).json()["ficha"]
        ficha["personagem"].update(classe="Druida", arquetipo="Animalista")
        resposta = self.client.put(caminho, json={"id": "troca", "mesa_id": "mesa", "ator_id": "mestre",
                                                  "personagem_id": personagem_id, "versao_esperada": 0, "ficha": ficha})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        druida = catalogos.ler().classe("Druida")
        esperado = [h.nome for h in druida.habilidades] + [h.nome for h in druida.arquetipo("Animalista").habilidades]
        self.assertEqual(self.titulos(personagem_id), sorted(esperado))
        with Session(self.engine) as session:
            evento = session.scalar(select(EventoAuditoriaRegistro).where(
                EventoAuditoriaRegistro.acao == "carta.catalogo", EventoAuditoriaRegistro.correlacao_id == "troca"))
        self.assertIn("perdeu", evento.resumo)
        self.assertIn("recebeu", evento.resumo)


class SincronizadorTest(_Base):
    def setUp(self):
        super().setUp()
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        self.pasta = pasta / "catalogos"
        shutil.copytree(catalogos.DIRETORIO, self.pasta)
        self.sincronizador = SincronizadorCatalogo(sessionmaker(bind=self.engine), Carregador(self.pasta))

    def test_texto_alterado_no_json_chega_aos_personagens_sem_reiniciar(self):
        personagem_id = self.client.post("/mesas/mesa/personagens", json={"ficha": FICHA}).json()["personagem_id"]
        self.assertTrue(self.sincronizador.verificar())
        self.assertFalse(self.sincronizador.verificar())

        caminho = self.pasta / "classes.json"
        texto = caminho.read_text(encoding="utf-8")
        mago = catalogos.ler().classe("Mago")
        original = mago.habilidades[0].nome
        caminho.write_text(texto.replace(f'"nome": "{original}"', '"nome": "Mutações Revistas"', 1), encoding="utf-8")
        atual = caminho.stat().st_mtime_ns + 10**9
        os.utime(caminho, ns=(atual, atual))

        self.assertTrue(self.sincronizador.verificar())
        titulos = self.titulos(personagem_id)
        self.assertIn("Mutações Revistas", titulos)
        self.assertNotIn(original, titulos)


if __name__ == "__main__":
    unittest.main()
