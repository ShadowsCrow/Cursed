"""Chão e baú da cena: saque, largar, pegar e disputa pelo primeiro pedido confirmado (carga-por-espacos 6.2)."""

from __future__ import annotations

import os
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform import cartas, recipientes
from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import (
    Base, CartaPersonagemRegistro, CartaVersaoRegistro, CenaRegistro, EfeitoAplicadoRegistro, ItemInventarioRegistro, ItemRecipienteRegistro,
    MembroRegistro, MesaRegistro, ModuloMesaRegistro, PersonagemRegistro,
)

API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

FICHA = {"personagem": {"nome": "Lia", "raca": "Humano"}, "atributos": {"valores": {"Força": 3}, "ajustes": {}}}
ESPADA = {
    "titulo": "Espada rúnica", "texto": "Lâmina antiga.", "item_tipo": "arma", "dados": {"dano": "1d8"},
    "formato": {"subtipo": "uma_mao", "largura": 1, "altura": 3},
    "efeitos": [{"nome": "Runas", "descricao": "+1 em Arcanismo.", "modificadores": [{"alvo": "pericia:arcanismo", "valor": 1}]}],
}


def popular(session: Session) -> str:
    """Mesa com Narrador, dois jogadores e seus personagens, módulo Sala e cena ativa. Devolve a versão da carta."""
    session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
    session.flush()
    session.add_all([
        MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
        MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
        MembroRegistro(mesa_id="mesa", usuario_id="bruno", papel="jogador"),
        ModuloMesaRegistro(mesa_id="mesa", modulo="sala", ativo=True),
    ])
    session.flush()
    session.add_all([
        PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana", ficha=FICHA),
        PersonagemRegistro(id="teo", mesa_id="mesa", proprietario_id="bruno", ficha={**FICHA, "personagem": {"nome": "Teo", "raca": "Humano"}}),
        CenaRegistro(id="cena", mesa_id="mesa", nome="Cripta", colunas=10, linhas=10, ativa=True),
    ])
    session.flush()
    definicao = cartas.criar_definicao(session, mesa_id="mesa", tipo="item", rascunho=ESPADA, ator_id="mestre")
    versao, _ = cartas.publicar(session, definicao, ator_id="mestre", versao_esperada=0)
    session.commit()
    return versao.id


class ApiRecipientesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            self.versao_espada = popular(session)
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:", api_host="127.0.0.1",
                                    api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.actor = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def as_(self, ator: str) -> TestClient:
        self.actor = ator
        return self.client

    def versao(self, personagem: str) -> int:
        return self.as_("mestre").get(f"/mesas/mesa/personagens/{personagem}/inventario/grade").json()["versao"]

    def bau_com_espada(self) -> tuple[str, str]:
        bau = self.as_("mestre").post("/mesas/mesa/sala/recipientes", json={"nome": "Baú da cripta", "colunas": 4, "linhas": 3})
        self.assertEqual(bau.status_code, 201, bau.text)
        cheio = self.client.post(f"/mesas/mesa/sala/recipientes/{bau.json()['id']}/cartas", json={"versao_id": self.versao_espada})
        self.assertEqual(cheio.status_code, 201, cheio.text)
        return bau.json()["id"], cheio.json()["itens"][0]["id"]

    def test_narrador_monta_o_saque_e_o_jogador_o_leva_para_a_grade(self):
        bau, espada = self.bau_com_espada()
        vistos = self.as_("ana").get("/mesas/mesa/sala/recipientes").json()
        self.assertEqual([(r["tipo"], [i["nome"] for i in r["itens"]]) for r in vistos], [("bau", ["Espada rúnica"])])
        self.assertEqual(vistos[0]["itens"][0]["efeitos"], ["Runas"])
        pego = self.as_("ana").post(f"/mesas/mesa/sala/recipientes/{bau}/itens/{espada}/pegar", json={
            "personagem_id": "lia", "versao_esperada": self.versao("lia"), "coluna": 3, "linha": 0})
        self.assertEqual(pego.status_code, 200, pego.text)
        self.assertEqual((pego.json()["coluna"], pego.json()["linha"], pego.json()["subtipo"]), (3, 0, "uma_mao"))
        self.assertEqual(len(pego.json()["efeitos"]), 1)
        self.assertEqual(self.as_("ana").get("/mesas/mesa/sala/recipientes").json()[0]["itens"], [])
        with Session(self.engine) as session:
            posse = session.scalar(select(CartaPersonagemRegistro).where(CartaPersonagemRegistro.personagem_id == "lia"))
            self.assertEqual((posse.estado, posse.item_id), ("no_inventario", pego.json()["id"]))
        repetido = self.as_("bruno").post(f"/mesas/mesa/sala/recipientes/{bau}/itens/{espada}/pegar", json={
            "personagem_id": "teo", "versao_esperada": self.versao("teo")})
        self.assertEqual(repetido.status_code, 409)

    def test_largar_no_chao_e_outro_personagem_pega_com_os_efeitos(self):
        bau, espada = self.bau_com_espada()
        pego = self.as_("ana").post(f"/mesas/mesa/sala/recipientes/{bau}/itens/{espada}/pegar", json={
            "personagem_id": "lia", "versao_esperada": self.versao("lia")}).json()
        largado = self.as_("ana").post(f"/mesas/mesa/personagens/lia/inventario/{pego['id']}/largar",
                                       json={"versao_esperada": self.versao("lia")})
        self.assertEqual(largado.status_code, 200, largado.text)
        self.assertEqual((largado.json()["tipo"], largado.json()["itens"][0]["efeitos"]), ("chao", ["Runas"]))
        with Session(self.engine) as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(ItemInventarioRegistro)), 0)
            self.assertTrue(all(e.estado == "encerrado" for e in session.scalars(select(EfeitoAplicadoRegistro))))
        chao = largado.json()
        pego_teo = self.as_("bruno").post(f"/mesas/mesa/sala/recipientes/{chao['id']}/itens/{chao['itens'][0]['id']}/pegar",
                                          json={"personagem_id": "teo", "versao_esperada": self.versao("teo")})
        self.assertEqual(pego_teo.status_code, 200, pego_teo.text)
        efeitos = self.as_("bruno").get("/mesas/mesa/personagens/teo/efeitos").json()
        self.assertEqual([(e["nome"], e["estado"]) for e in efeitos], [("Runas", "suspenso")])

    def test_permissoes(self):
        bau, espada = self.bau_com_espada()
        self.assertEqual(self.as_("ana").post("/mesas/mesa/sala/recipientes", json={"nome": "X", "colunas": 1, "linhas": 1}).status_code, 403)
        alheio = self.as_("ana").post(f"/mesas/mesa/sala/recipientes/{bau}/itens/{espada}/pegar", json={
            "personagem_id": "teo", "versao_esperada": 0})
        self.assertIn(alheio.status_code, {403, 404})

    def test_lugar_ocupado_na_grade_e_recusado_sem_perder_o_item(self):
        bau, espada = self.bau_com_espada()
        with Session(self.engine) as session:
            session.add(ItemInventarioRegistro(id="pedra", mesa_id="mesa", personagem_id="lia", tipo="outro", nome="Pedra",
                                               quantidade=1, equipado=False, dados={}, subtipo="outro", largura=1, altura=1,
                                               coluna=0, linha=1))
            session.commit()
        resposta = self.as_("ana").post(f"/mesas/mesa/sala/recipientes/{bau}/itens/{espada}/pegar", json={
            "personagem_id": "lia", "versao_esperada": self.versao("lia"), "coluna": 0, "linha": 0})
        self.assertEqual(resposta.status_code, 422)
        self.assertEqual(len(self.as_("ana").get("/mesas/mesa/sala/recipientes").json()[0]["itens"]), 1)


@unittest.skipUnless(os.environ.get("CURSED_TEST_POSTGRES_URL"), "Defina CURSED_TEST_POSTGRES_URL para a disputa no PostgreSQL.")
class DisputaPostgresTest(unittest.TestCase):
    def test_dois_pedidos_simultaneos_so_um_leva_o_item(self):
        from alembic import command
        from alembic.config import Config
        from sqlalchemy.engine import make_url

        base = make_url(os.environ["CURSED_TEST_POSTGRES_URL"])
        banco = f"cursed_saque_{uuid4().hex}"
        admin = create_engine(base, isolation_level="AUTOCOMMIT")
        with admin.connect() as conexao:
            conexao.execute(text(f'CREATE DATABASE "{banco}"'))
        engine = create_engine(base.set(database=banco))
        try:
            config = Config(str(Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"))
            with engine.begin() as conexao:
                config.attributes["connection"] = conexao
                command.upgrade(config, "head")
            with Session(engine) as session:
                versao_id = popular(session)
                bau = recipientes.criar_bau(session, "mesa", "Baú", 4, 3)
                retrato = recipientes.colocar_carta(session, bau, session.get(CartaVersaoRegistro, versao_id))
                session.commit()
                bau_id, retrato_id = bau.id, retrato.id

            barreira, resultados = threading.Barrier(2), []

            def pegar(personagem_id: str) -> None:
                with Session(engine) as session:
                    personagem = session.get(PersonagemRegistro, personagem_id)
                    recipiente = session.get(recipientes.RecipienteCenaRegistro, bau_id)
                    barreira.wait()
                    try:
                        recipientes.pegar(session, personagem, recipiente, retrato_id, personagem.versao)
                        session.commit()
                        resultados.append("levou")
                    except recipientes.ItemIndisponivel:
                        session.rollback()
                        resultados.append("indisponivel")

            threads = [threading.Thread(target=pegar, args=(p,)) for p in ("lia", "teo")]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=30)
            self.assertEqual(sorted(resultados), ["indisponivel", "levou"])
            with Session(engine) as session:
                self.assertEqual(session.scalar(select(func.count()).select_from(ItemInventarioRegistro)), 1)
                self.assertEqual(session.scalar(select(func.count()).select_from(ItemRecipienteRegistro)), 0)
        finally:
            engine.dispose()
            with admin.connect() as conexao:
                conexao.execute(text(f'DROP DATABASE IF EXISTS "{banco}" WITH (FORCE)'))
            admin.dispose()


if __name__ == "__main__":
    unittest.main()
