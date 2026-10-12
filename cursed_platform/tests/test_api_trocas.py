"""Ofertas de item entre personagens: oferecer, aceitar escolhendo o lugar, recusar e cancelar (carga-por-espacos 6.3)."""

from __future__ import annotations

import os
from pathlib import Path
import threading
import unittest
from uuid import uuid4

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session

from cursed_platform import recipientes, trocas
from cursed_platform.persistence import (
    CartaPersonagemRegistro, EventoAuditoriaRegistro, CartaVersaoRegistro, ItemInventarioRegistro, OfertaItemRegistro,
    PersonagemRegistro,
)
from cursed_platform.tests import test_api_recipientes as base


class ApiTrocasTest(unittest.TestCase):
    """Mesmo cenário do chão e baú: mesa, Lia de Ana, Teo de Bruno e um baú com a espada rúnica."""

    tearDown = base.ApiRecipientesTest.tearDown
    as_ = base.ApiRecipientesTest.as_
    versao = base.ApiRecipientesTest.versao
    bau_com_espada = base.ApiRecipientesTest.bau_com_espada

    def setUp(self):
        base.ApiRecipientesTest.setUp(self)
        bau, espada = self.bau_com_espada()
        pego = self.as_("ana").post(f"/mesas/mesa/sala/recipientes/{bau}/itens/{espada}/pegar", json={
            "personagem_id": "lia", "versao_esperada": self.versao("lia"), "coluna": 0, "linha": 0})
        self.assertEqual(pego.status_code, 200, pego.text)
        self.espada = pego.json()["id"]

    def ofertar(self, ator: str = "ana", personagem: str = "lia", item: str | None = None, para: str = "teo"):
        return self.as_(ator).post(f"/mesas/mesa/personagens/{personagem}/inventario/{item or self.espada}/ofertas",
                                   json={"para_personagem_id": para})

    def ofertas(self, ator: str) -> list[dict]:
        resposta = self.as_(ator).get("/mesas/mesa/ofertas-item")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return resposta.json()

    def test_oferecer_e_aceitar_escolhendo_o_lugar_leva_efeitos_e_carta(self):
        oferta = self.ofertar()
        self.assertEqual(oferta.status_code, 201, oferta.text)
        corpo = oferta.json()
        self.assertEqual((corpo["item_nome"], corpo["de_nome"], corpo["para_nome"], corpo["estado"]),
                         ("Espada rúnica", "Lia", "Teo", "pendente"))
        for ator in ("ana", "bruno", "mestre"):
            self.assertEqual([o["id"] for o in self.ofertas(ator)], [corpo["id"]], ator)
        versao_lia, versao_teo = self.versao("lia"), self.versao("teo")
        aceita = self.as_("bruno").post(f"/mesas/mesa/ofertas-item/{corpo['id']}/aceitar", json={
            "versao_esperada": versao_teo, "coluna": 2, "linha": 1})
        self.assertEqual(aceita.status_code, 200, aceita.text)
        item = aceita.json()
        self.assertEqual((item["coluna"], item["linha"], item["subtipo"], item["equipado"]), (2, 1, "uma_mao", False))
        self.assertEqual(len(item["efeitos"]), 1)
        self.assertEqual((self.versao("lia"), self.versao("teo")), (versao_lia + 1, versao_teo + 1))
        self.assertEqual(self.ofertas("bruno"), [])
        efeitos = self.as_("bruno").get("/mesas/mesa/personagens/teo/efeitos").json()
        self.assertEqual([(e["nome"], e["estado"]) for e in efeitos], [("Runas", "suspenso")])
        with Session(self.engine) as session:
            self.assertEqual([i.personagem_id for i in session.scalars(select(ItemInventarioRegistro))], ["teo"])
            posses = {p.personagem_id: p.estado for p in session.scalars(select(CartaPersonagemRegistro))}
            self.assertEqual(posses, {"lia": "removida", "teo": "no_inventario"})
            self.assertEqual(session.get(OfertaItemRegistro, corpo["id"]).estado, "aceita")
            acoes = set(session.scalars(select(EventoAuditoriaRegistro.acao)))
            self.assertTrue({"item.oferecido", "item.trocado"} <= acoes)

    def test_aceitar_sem_lugar_deixa_o_item_fora_da_grade(self):
        oferta = self.ofertar().json()
        aceita = self.as_("bruno").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/aceitar",
                                        json={"versao_esperada": self.versao("teo")})
        self.assertEqual(aceita.status_code, 200, aceita.text)
        self.assertEqual((aceita.json()["coluna"], aceita.json()["linha"]), (None, None))

    def test_lugar_ocupado_recusa_o_aceite_sem_mover_o_item(self):
        with Session(self.engine) as session:
            session.add(ItemInventarioRegistro(id="pedra", mesa_id="mesa", personagem_id="teo", tipo="outro", nome="Pedra",
                                               quantidade=1, equipado=False, dados={}, subtipo="outro", largura=1, altura=1,
                                               coluna=0, linha=1))
            session.commit()
        oferta = self.ofertar().json()
        aceita = self.as_("bruno").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/aceitar", json={
            "versao_esperada": self.versao("teo"), "coluna": 0, "linha": 0})
        self.assertEqual(aceita.status_code, 422, aceita.text)
        self.assertEqual([o["estado"] for o in self.ofertas("bruno")], ["pendente"])
        with Session(self.engine) as session:
            self.assertEqual(session.get(ItemInventarioRegistro, self.espada).personagem_id, "lia")

    def test_recusar_mantem_o_item_e_permite_nova_oferta(self):
        oferta = self.ofertar().json()
        recusada = self.as_("bruno").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/recusar")
        self.assertEqual((recusada.status_code, recusada.json()["estado"]), (200, "recusada"))
        self.assertEqual(self.ofertas("ana"), [])
        with Session(self.engine) as session:
            self.assertEqual(session.get(ItemInventarioRegistro, self.espada).personagem_id, "lia")
        self.assertEqual(self.ofertar().status_code, 201)
        decidida = self.as_("bruno").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/aceitar",
                                          json={"versao_esperada": self.versao("teo")})
        self.assertEqual(decidida.status_code, 409)

    def test_so_quem_oferece_cancela_e_so_quem_recebe_responde(self):
        oferta = self.ofertar().json()
        self.assertIn(self.as_("ana").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/aceitar",
                                           json={"versao_esperada": 0}).status_code, {403, 404})
        self.assertIn(self.as_("ana").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/recusar").status_code, {403, 404})
        self.assertIn(self.as_("bruno").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/cancelar").status_code, {403, 404})
        cancelada = self.as_("ana").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/cancelar")
        self.assertEqual((cancelada.status_code, cancelada.json()["estado"]), (200, "cancelada"))
        self.assertEqual(self.as_("estranho").get("/mesas/mesa/ofertas-item").status_code, 404)

    def test_pedidos_invalidos(self):
        self.assertEqual(self.ofertar().status_code, 201)
        self.assertEqual(self.ofertar().status_code, 409, "segunda oferta do mesmo item")
        self.assertIn(self.ofertar(ator="bruno").status_code, {403, 404}, "oferecer item alheio")
        with Session(self.engine) as session:
            session.add(PersonagemRegistro(id="sombra", mesa_id="mesa", proprietario_id=None, ficha={"personagem": {"nome": "?"}},
                                           tipo="npc", visibilidade="narrador"))
            session.add(ItemInventarioRegistro(id="corda", mesa_id="mesa", personagem_id="lia", tipo="outro", nome="Corda",
                                               quantidade=1, equipado=False, dados={}))
            session.commit()
        self.assertEqual(self.ofertar(item="corda", para="sombra").status_code, 404, "NPC oculto não existe para o jogador")
        self.assertEqual(self.ofertar(item="corda", para="lia").status_code, 422, "oferecer a si mesmo")

    def test_entidades_ocultas_nao_revelam_o_nome_real(self):
        with Session(self.engine) as session:
            session.add(PersonagemRegistro(id="velada", mesa_id="mesa", proprietario_id=None, tipo="npc", visibilidade="narrador",
                                           ficha={"personagem": {"nome": "Rainha Velada"}},
                                           revelacao={"nome_publico": "Figura encapuzada", "imagem": False}))
            session.add(ItemInventarioRegistro(id="anel", mesa_id="mesa", personagem_id="velada", tipo="outro", nome="Anel",
                                               quantidade=1, equipado=False, dados={}, subtipo="outro", largura=1, altura=1))
            session.commit()
        recusada = self.ofertar(para="velada")
        self.assertEqual(recusada.status_code, 422, "revelada, mas oculta: não recebe trocas de jogadores")
        self.assertNotIn("Rainha", recusada.text)
        oferta = self.ofertar(ator="mestre", personagem="velada", item="anel", para="lia")
        self.assertEqual(oferta.status_code, 201, oferta.text)
        self.assertEqual(oferta.json()["de_nome"], "Rainha Velada", "o Narrador vê o nome real")
        [vista] = self.ofertas("ana")
        self.assertEqual(vista["de_nome"], "Figura encapuzada")
        aceita = self.as_("ana").post(f"/mesas/mesa/ofertas-item/{vista['id']}/aceitar", json={"versao_esperada": self.versao("lia")})
        self.assertEqual(aceita.status_code, 200, aceita.text)
        with Session(self.engine) as session:
            resumos = " ".join(session.scalars(select(EventoAuditoriaRegistro.resumo)))
        self.assertNotIn("Rainha", resumos)
        self.assertIn("Figura encapuzada", resumos)

    def test_item_que_saiu_cancela_a_oferta(self):
        oferta = self.ofertar().json()
        largado = self.as_("ana").post(f"/mesas/mesa/personagens/lia/inventario/{self.espada}/largar",
                                       json={"versao_esperada": self.versao("lia")})
        self.assertEqual(largado.status_code, 200, largado.text)
        self.assertEqual(self.ofertas("bruno"), [])
        aceita = self.as_("bruno").post(f"/mesas/mesa/ofertas-item/{oferta['id']}/aceitar",
                                        json={"versao_esperada": self.versao("teo")})
        self.assertEqual(aceita.status_code, 409)
        with Session(self.engine) as session:
            self.assertEqual(session.get(OfertaItemRegistro, oferta["id"]).estado, "cancelada")
            self.assertEqual(session.scalar(select(func.count()).select_from(ItemInventarioRegistro).where(
                ItemInventarioRegistro.personagem_id == "teo")), 0)


@unittest.skipUnless(os.environ.get("CURSED_TEST_POSTGRES_URL"), "Defina CURSED_TEST_POSTGRES_URL para a disputa no PostgreSQL.")
class RespostaSimultaneaPostgresTest(unittest.TestCase):
    def test_aceitar_e_cancelar_ao_mesmo_tempo_so_um_vale(self):
        from alembic import command
        from alembic.config import Config
        from sqlalchemy.engine import make_url

        url = make_url(os.environ["CURSED_TEST_POSTGRES_URL"])
        banco = f"cursed_troca_{uuid4().hex}"
        admin = create_engine(url, isolation_level="AUTOCOMMIT")
        with admin.connect() as conexao:
            conexao.execute(text(f'CREATE DATABASE "{banco}"'))
        engine = create_engine(url.set(database=banco))
        try:
            config = Config(str(Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"))
            with engine.begin() as conexao:
                config.attributes["connection"] = conexao
                command.upgrade(config, "head")
            with Session(engine) as session:
                versao_id = base.popular(session)
                bau = recipientes.criar_bau(session, "mesa", "Baú", 4, 3)
                retrato = recipientes.colocar_carta(session, bau, session.get(CartaVersaoRegistro, versao_id))
                lia = session.get(PersonagemRegistro, "lia")
                _, item = recipientes.pegar(session, lia, bau, retrato.id, lia.versao)
                oferta = trocas.ofertar(session, lia, item, session.get(PersonagemRegistro, "teo"))
                session.commit()
                oferta_id = oferta.id

            barreira, resultados = threading.Barrier(2), []

            def responder(acao: str) -> None:
                with Session(engine) as session:
                    # A oferta é lida antes do travamento, como faz a API ao autorizar.
                    session.get(OfertaItemRegistro, oferta_id)
                    barreira.wait()
                    try:
                        travada = trocas.travar_pendente(session, "mesa", oferta_id)
                        assert travada is not None
                        if acao == "aceitar":
                            teo = session.get(PersonagemRegistro, "teo")
                            trocas.aceitar(session, travada, teo.versao)
                        else:
                            trocas.decidir(travada, "cancelada")
                        session.commit()
                        resultados.append(acao)
                    except trocas.OfertaIndisponivel:
                        session.rollback()
                        resultados.append("recusado")

            threads = [threading.Thread(target=responder, args=(a,)) for a in ("aceitar", "cancelar")]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=30)
            self.assertEqual(len(resultados), 2)
            self.assertEqual(resultados.count("recusado"), 1, resultados)
            with Session(engine) as session:
                estado = session.get(OfertaItemRegistro, oferta_id).estado
                donos = list(session.scalars(select(ItemInventarioRegistro.personagem_id)))
            vencedor = next(r for r in resultados if r != "recusado")
            self.assertEqual((estado, donos), ("aceita", ["teo"]) if vencedor == "aceitar" else ("cancelada", ["lia"]))
        finally:
            engine.dispose()
            with admin.connect() as conexao:
                conexao.execute(text(f'DROP DATABASE IF EXISTS "{banco}" WITH (FORCE)'))
            admin.dispose()


if __name__ == "__main__":
    unittest.main()
