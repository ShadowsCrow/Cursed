from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.domain.equip_codec import encode_equipment_eq1
from cursed_platform.persistence import (
    Base, CartaDefinicaoRegistro, CartaPersonagemRegistro, MembroRegistro, MesaRegistro, OfertaCartasRegistro,
    PersonagemRegistro,
)


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

BOLA = {"titulo": "Bola de Fogo", "texto": "Explosão em área.", "escola": "Evocação", "grau": 2,
        "custo_aprendizado": 3, "descansos_minimos": 1, "potencia_uso": 4, "custo_uso": 2}
ESPADA = {"titulo": "Espada Rúnica", "texto": "Lâmina antiga.", "item_tipo": "arma", "dados": {"dano": "1d8", "peso": 2},
          "efeitos": [{"nome": "Runas", "descricao": "+1 em Arcanismo.",
                       "modificadores": [{"alvo": "pericia:arcanismo", "valor": 1}]}]}
BENCAO = {"titulo": "Bênção", "texto": "+1 em Vontade.", "modificadores": [{"alvo": "pericia:vontade", "valor": 1}],
          "duracao_rodadas": 3}


class CartasTest(unittest.TestCase):
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
                PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana", ficha={"personagem": {"nome": "Lia"}}),
                PersonagemRegistro(id="bram", mesa_id="mesa", proprietario_id="bruno", ficha={"personagem": {"nome": "Bram"}}),
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

    # ------------------------------------------------------------- apoio

    def as_(self, actor):
        self.actor = actor
        return self.client

    def publicar(self, tipo, conteudo) -> dict:
        definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": tipo, "rascunho": conteudo}).json()
        resposta = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 0})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        return resposta.json()

    def versao(self, personagem):
        return self.as_("mestre").get(f"/mesas/mesa/personagens/{personagem}/ficha").json()["versao"]

    def cartas(self, actor, personagem):
        return self.as_(actor).get(f"/mesas/mesa/personagens/{personagem}/cartas").json()

    def conceder(self, versao_id, personagem="lia", **extra):
        return self.as_("mestre").post(f"/mesas/mesa/personagens/{personagem}/cartas", json={
            "versao_id": versao_id, "versao_esperada": self.versao(personagem), **extra,
        })

    def transicao(self, actor, personagem, carta, acao):
        versao = self.versao(personagem)
        return self.as_(actor).post(
            f"/mesas/mesa/personagens/{personagem}/cartas/{carta}/transicoes/{acao}", json={"versao_esperada": versao},
        )

    # ------------------------------------------------------------- 9.1

    def test_publicacao_cria_versoes_imutaveis(self):
        definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": "magia", "rascunho": BOLA}).json()
        self.assertIsNone(definicao["publicada"])
        v1 = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 0}).json()
        self.assertEqual((v1["numero"], v1["procedencia"]["origem"]), (1, "narrador"))
        self.assertEqual(self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao",
                                          json={"versao_esperada": 0}).status_code, 409)
        self.assertEqual(self.conceder(v1["id"]).status_code, 201)

        rascunho = self.client.put(f"/mesas/mesa/cartas/{definicao['id']}/rascunho", json={
            "rascunho": {**BOLA, "texto": "Explosão maior."}, "versao_esperada": 1,
        })
        self.assertEqual(rascunho.status_code, 200)
        v2 = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 2}).json()
        self.assertEqual(v2["numero"], 2)
        numeros = [v["numero"] for v in self.client.get(f"/mesas/mesa/cartas/{definicao['id']}/versoes").json()]
        self.assertEqual(numeros, [1, 2])
        [posse] = self.cartas("mestre", "lia")
        self.assertEqual((posse["carta"]["numero"], posse["carta"]["conteudo"]["texto"], posse["versao_mais_recente"]),
                         (1, "Explosão em área.", 2))
        with Session(self.engine) as session:
            for comando in ("UPDATE card_versions SET numero = 9", "DELETE FROM card_versions"):
                with self.subTest(comando=comando), self.assertRaises(DBAPIError):
                    session.execute(text(comando))
                session.rollback()
        self.assertEqual(self.as_("ana").get("/mesas/mesa/cartas").status_code, 403)
        eventos = self.as_("ana").get("/mesas/mesa/auditoria").json()["eventos"]
        self.assertNotIn("carta.publicada", [e["acao"] for e in eventos])

    # ------------------------------------------------------------- 9.2

    def test_custos_separados_sem_inferencia_do_legado(self):
        legado = self.publicar("habilidade", {"titulo": "Golpe", "texto": "Ataque forte.", "custo_legado": "2 PP + 1 PV"})
        self.assertEqual([legado["conteudo"][c] for c in ("custo_aprendizado", "descansos_minimos", "potencia_uso", "custo_uso")],
                         [None, None, None, None])
        self.assertEqual(legado["conteudo"]["custo_legado"], "2 PP + 1 PV")
        self.assertEqual(len(legado["revisao_pendente"]), 1)
        completa = self.publicar("magia", {**BOLA, "custo_legado": "3 PP"})
        self.assertEqual((completa["conteudo"]["custo_uso"], completa["revisao_pendente"]), (2, []))

        definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": "item", "rascunho": {
            **ESPADA, "custo_uso": 1, "ativos": ["mesas/outra/mesa/x.png"],
        }}).json()
        with Session(self.engine) as session:
            antes = session.scalar(select(func.count()).select_from(CartaDefinicaoRegistro))
        validacao = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/validacao").json()
        self.assertFalse(validacao["valida"])
        self.assertEqual({p["campo"] for p in validacao["problemas"]}, {"custo_uso"})
        self.client.put(f"/mesas/mesa/cartas/{definicao['id']}/rascunho", json={
            "rascunho": {**ESPADA, "ativos": ["mesas/outra/mesa/x.png"],
                         "efeitos": [{"nome": "X", "descricao": "Y", "modificadores": [{"alvo": "", "valor": 1}]}]},
            "versao_esperada": 0,
        })
        recusa = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 1})
        self.assertEqual(recusa.status_code, 422)
        self.assertEqual({p["campo"] for p in recusa.json()["detail"]["problemas"]},
                         {"efeitos.0.modificadores", "ativos.0"})
        with Session(self.engine) as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(CartaDefinicaoRegistro)), antes)
            self.assertIsNone(session.get(CartaDefinicaoRegistro, definicao["id"]).versao_publicada)

    def test_importacao_portatil_com_previa(self):
        codigo = encode_equipment_eq1("armadura", {"nome": "Escudo", "armadura": 1}, [
            {"kind": "externo", "nome": "Bloqueio", "descricao": "+1 Defesa.",
             "modificadores": [{"alvo": "defesa:armadura", "valor": 1}]}])
        previa = self.as_("mestre").post("/mesas/mesa/cartas/importacoes/previa", json={"codigo": codigo}).json()
        self.assertEqual((previa["tipo"], previa["validacao"]["valida"], previa["rascunho"]["titulo"]), ("item", True, "Escudo"))
        self.assertEqual(self.client.get("/mesas/mesa/cartas").json(), [])
        importada = self.client.post("/mesas/mesa/cartas/importacoes", json={"codigo": codigo}).json()
        self.assertEqual((importada["procedencia_rascunho"]["origem"], importada["publicada"]), ("importacao", None))
        self.assertEqual(self.client.post("/mesas/mesa/cartas/importacoes", json={"codigo": "EQ1:quebrado"}).status_code, 422)
        self.assertEqual(len(self.client.get("/mesas/mesa/cartas").json()), 1)

    # ------------------------------------------------------------- 9.4

    def test_concessao_direta_por_tipo_e_excecao(self):
        bola, espada, bencao = self.publicar("magia", BOLA), self.publicar("item", ESPADA), self.publicar("efeito", BENCAO)
        self.assertEqual(self.as_("ana").post("/mesas/mesa/personagens/lia/cartas", json={
            "versao_id": bola["id"], "versao_esperada": 0}).status_code, 403)
        excecao = self.conceder(bola["id"], excecao_aprendizado=True, motivo="Recompensa do dragão")
        self.assertEqual(excecao.json()["cartas"][0]["estado"], "aprendida")
        self.assertEqual(self.conceder(bola["id"]).status_code, 409)
        self.assertEqual(self.conceder(espada["id"], excecao_aprendizado=True).status_code, 422)
        self.assertEqual(self.conceder(espada["id"]).json()["cartas"][0]["estado"], "no_inventario")
        self.assertEqual(self.conceder(bencao["id"]).json()["cartas"][0]["estado"], "aplicada")

        [item] = self.as_("ana").get("/mesas/mesa/personagens/lia/inventario").json()
        self.assertEqual((item["nome"], item["dados"]["dano"], len(item["efeitos"])), ("Espada Rúnica", "1d8", 1))
        efeitos = {e["nome"]: e["estado"] for e in self.as_("ana").get("/mesas/mesa/personagens/lia/efeitos").json()}
        self.assertEqual(efeitos, {"Runas": "suspenso", "Bênção": "ativo"})
        self.assertEqual({c["estado"] for c in self.cartas("ana", "lia")}, {"aprendida", "no_inventario", "aplicada"})
        eventos = self.as_("ana").get("/mesas/mesa/auditoria", params={"categoria": "carta"}).json()["eventos"]
        self.assertIn("Lia: recebeu “Bola de Fogo” com exceção de aprendizado — Recompensa do dragão",
                      [e["resumo"] for e in eventos])

    # ------------------------------------------------------------- 9.5 / 9.6

    def criar_oferta(self, versoes, personagens, minimo=2, maximo=2, **extra):
        return self.as_("mestre").post("/mesas/mesa/ofertas", json={
            "titulo": "Tesouro", "versao_ids": versoes, "personagem_ids": personagens,
            "min_escolhas": minimo, "max_escolhas": maximo, **extra,
        })

    def test_oferta_com_limite_de_escolhas_independente_por_destinatario(self):
        versoes = [self.publicar("magia", {**BOLA, "titulo": f"Magia {i}"})["id"] for i in range(5)]
        for invalida in ({"maximo": 6, "minimo": 1}, {"maximo": 1, "minimo": 2}):
            with self.subTest(invalida=invalida):
                self.assertEqual(self.criar_oferta(versoes, ["lia"], **invalida).status_code, 422)
        oferta = self.criar_oferta(versoes, ["lia", "bram"]).json()
        caminho = f"/mesas/mesa/ofertas/{oferta['id']}/respostas/lia"

        demais = self.as_("ana").post(caminho, json={"escolhas": versoes[:3], "versao_esperada": 0})
        self.assertEqual(demais.status_code, 422)
        self.assertIn("exatamente 2", demais.json()["detail"])
        self.assertEqual(self.as_("ana").post(caminho, json={"escolhas": [versoes[0], "estranha"], "versao_esperada": 0}).status_code, 422)
        self.assertEqual(self.as_("bruno").post(caminho, json={"escolhas": versoes[:2], "versao_esperada": 0}).status_code, 404)
        [minha] = self.as_("ana").get("/mesas/mesa/ofertas").json()
        self.assertEqual([d["personagem_id"] for d in minha["destinatarios"]], ["lia"])
        self.assertEqual(minha["destinatarios"][0]["estado"], "pendente")

        escolha = self.as_("ana").post(caminho, json={"escolhas": versoes[:2], "versao_esperada": 0})
        self.assertEqual(escolha.status_code, 200, escolha.text)
        self.assertEqual([c["estado"] for c in escolha.json()["cartas"]], ["disponivel", "disponivel"])
        self.assertEqual(self.as_("ana").post(caminho, json={"escolhas": versoes[2:4], "versao_esperada": 1}).status_code, 409)
        estados = {d["personagem_id"]: d["estado"] for d in self.as_("mestre").get("/mesas/mesa/ofertas").json()[0]["destinatarios"]}
        self.assertEqual(estados, {"lia": "respondida", "bram": "pendente"})
        self.assertEqual(self.as_("bruno").post(f"/mesas/mesa/ofertas/{oferta['id']}/respostas/bram",
                                                json={"escolhas": versoes[3:], "versao_esperada": 0}).status_code, 200)

        # 9.6: escolher não é aprender
        cartas = self.cartas("ana", "lia")
        self.assertNotIn("aprendida", {c["estado"] for c in cartas})
        carta = cartas[0]["id"]
        self.assertEqual(self.transicao("mestre", "lia", carta, "concluir_aprendizado").status_code, 409)
        self.assertEqual(self.transicao("ana", "lia", carta, "iniciar_aprendizado").status_code, 200)
        self.assertEqual(self.transicao("ana", "lia", carta, "concluir_aprendizado").status_code, 403)
        concluir = self.transicao("mestre", "lia", carta, "concluir_aprendizado")
        self.assertEqual(concluir.json()["cartas"][0]["estado"], "aprendida")

    def test_oferta_expirada_cancelada_e_invisivel_para_outros(self):
        versoes = [self.publicar("item", {**ESPADA, "titulo": f"Item {i}"})["id"] for i in range(2)]
        oferta = self.criar_oferta(versoes, ["lia"], minimo=1, maximo=1).json()
        self.assertEqual(self.as_("bruno").get("/mesas/mesa/ofertas").json(), [])
        with Session(self.engine) as session:
            session.get(OfertaCartasRegistro, oferta["id"]).expira_em = datetime.now(UTC) - timedelta(minutes=1)
            session.commit()
        self.assertTrue(self.as_("ana").get("/mesas/mesa/ofertas").json()[0]["expirada"])
        self.assertEqual(self.as_("ana").post(f"/mesas/mesa/ofertas/{oferta['id']}/respostas/lia",
                                              json={"escolhas": versoes[:1], "versao_esperada": 0}).status_code, 409)
        segunda = self.criar_oferta(versoes, ["lia"], minimo=0, maximo=1).json()
        self.assertEqual(self.as_("mestre").post(f"/mesas/mesa/ofertas/{segunda['id']}/cancelamento").status_code, 200)
        self.assertEqual(self.as_("ana").post(f"/mesas/mesa/ofertas/{segunda['id']}/respostas/lia",
                                              json={"escolhas": [], "versao_esperada": 0}).status_code, 409)
        with Session(self.engine) as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(CartaPersonagemRegistro)), 0)

    # ------------------------------------------------------------- 9.7

    def test_ciclos_de_item_efeito_e_apresentacao(self):
        espada, bencao, bola = self.publicar("item", ESPADA), self.publicar("efeito", BENCAO), self.publicar("magia", BOLA)
        item_carta = self.conceder(espada["id"]).json()["cartas"][0]["id"]
        efeito_carta = self.conceder(bencao["id"]).json()["cartas"][0]["id"]
        for carta, acao in ((item_carta, "iniciar_aprendizado"), (efeito_carta, "concluir_aprendizado")):
            with self.subTest(acao=acao):
                self.assertEqual(self.transicao("mestre", "lia", carta, acao).status_code, 409)
        self.assertEqual(self.transicao("ana", "lia", item_carta, "remover").status_code, 403)
        self.assertEqual(self.transicao("mestre", "lia", item_carta, "remover").status_code, 200)
        self.assertEqual(self.as_("ana").get("/mesas/mesa/personagens/lia/inventario").json(), [])
        self.assertEqual(self.transicao("mestre", "lia", efeito_carta, "remover").status_code, 200)
        self.assertEqual(self.as_("ana").get("/mesas/mesa/personagens/lia/efeitos").json(), [])
        self.assertEqual(self.cartas("ana", "lia"), [])

        apresentacao = self.as_("mestre").post("/mesas/mesa/apresentacoes", json={
            "versao_id": bola["id"], "destinatarios": ["ana"]}).json()
        [vista] = self.as_("ana").get("/mesas/mesa/apresentacoes").json()
        self.assertEqual((vista["carta"]["conteudo"]["titulo"], vista["destinatarios"]), ("Bola de Fogo", None))
        self.assertEqual(self.as_("bruno").get("/mesas/mesa/apresentacoes").json(), [])
        self.assertEqual(self.cartas("ana", "lia"), [])
        self.as_("mestre").post(f"/mesas/mesa/apresentacoes/{apresentacao['id']}/recolhimento")
        self.assertEqual(self.as_("ana").get("/mesas/mesa/apresentacoes").json(), [])
        self.assertEqual(self.as_("mestre").post("/mesas/mesa/apresentacoes", json={
            "versao_id": bola["id"], "destinatarios": ["estranho"]}).status_code, 422)

    # ------------------------------------------------------------- 9.9

    def test_migracao_explicita_de_versao(self):
        definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": "magia", "rascunho": BOLA}).json()
        v1 = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 0}).json()
        carta = self.conceder(v1["id"]).json()["cartas"][0]["id"]
        self.client.put(f"/mesas/mesa/cartas/{definicao['id']}/rascunho",
                        json={"rascunho": {**BOLA, "custo_uso": 3}, "versao_esperada": 1})
        v2 = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 2}).json()
        outra = self.publicar("magia", {**BOLA, "titulo": "Outra"})

        base = f"/mesas/mesa/personagens/lia/cartas/{carta}/migracao"
        previa = self.as_("mestre").get(f"{base}/previa", params={"versao_destino_id": v2["id"]}).json()
        self.assertEqual((previa["origem_numero"], previa["destino_numero"]), (1, 2))
        self.assertEqual([(d["campo"], d["antes"], d["depois"]) for d in previa["diferencas"]], [("custo_uso", 2, 3)])
        self.assertEqual(self.cartas("mestre", "lia")[0]["carta"]["numero"], 1)
        self.assertEqual(self.as_("ana").get(f"{base}/previa", params={"versao_destino_id": v2["id"]}).status_code, 403)
        self.assertEqual(self.as_("ana").post(base, json={"versao_destino_id": v2["id"], "versao_esperada": 1}).status_code, 403)
        self.assertEqual(self.as_("mestre").post(base, json={"versao_destino_id": outra["id"], "versao_esperada": 1}).status_code, 422)
        migrada = self.as_("mestre").post(base, json={"versao_destino_id": v2["id"], "versao_esperada": 1})
        self.assertEqual(migrada.status_code, 200, migrada.text)
        self.assertEqual(self.cartas("ana", "lia")[0]["carta"]["conteudo"]["custo_uso"], 3)
        [evento] = self.as_("ana").get("/mesas/mesa/auditoria", params={"categoria": "carta"}).json()["eventos"][:1]
        self.assertEqual((evento["acao"], evento["mudancas"][0]["campo"]), ("carta.migrada", "carta.custo_uso"))
        self.assertEqual(self.as_("mestre").post(base, json={"versao_destino_id": v2["id"], "versao_esperada": 2}).status_code, 409)


if __name__ == "__main__":
    unittest.main()


@unittest.skipUnless(
    __import__("os").environ.get("CURSED_TEST_POSTGRES_URL"),
    "Defina CURSED_TEST_POSTGRES_URL para verificar respostas concorrentes no PostgreSQL.",
)
class OfertaConcorrentePostgresTest(unittest.TestCase):
    def test_duas_respostas_simultaneas_aceitam_somente_uma(self):
        import os
        import threading
        from uuid import uuid4

        from alembic import command
        from alembic.config import Config
        from sqlalchemy.engine import make_url

        from cursed_platform import cartas, cartas_ciclo
        from cursed_platform.persistence import CartaDefinicaoRegistro

        base = make_url(os.environ["CURSED_TEST_POSTGRES_URL"])
        banco = f"cursed_cartas_{uuid4().hex}"
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
                session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
                session.flush()
                session.add_all([MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                                 MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador")])
                session.flush()
                session.add(PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana", ficha={}))
                session.flush()
                versoes = []
                for i in range(3):
                    definicao = cartas.criar_definicao(session, mesa_id="mesa", tipo="magia",
                                                       rascunho={**BOLA, "titulo": f"M{i}"}, ator_id="mestre")
                    versao, _ = cartas.publicar(session, definicao, ator_id="mestre", versao_esperada=0)
                    versoes.append(versao.id)
                oferta = cartas_ciclo.criar_oferta(
                    session, mesa_id="mesa", titulo="Duelo", versao_ids=versoes, personagem_ids=["lia"],
                    min_escolhas=1, max_escolhas=1, expira_em=None, ator_id="mestre",
                )
                session.commit()
                oferta_id = oferta.id

            barreira, resultados = threading.Barrier(2), []

            def responder(escolha):
                with Session(engine) as session:
                    oferta = session.get(OfertaCartasRegistro, oferta_id)
                    personagem = session.get(PersonagemRegistro, "lia")
                    barreira.wait()
                    try:
                        cartas_ciclo.responder_oferta(session, oferta, personagem, [escolha],
                                                      ator_id="ana", versao_esperada=0)
                        session.commit()
                        resultados.append("aceita")
                    except (cartas_ciclo.Conflito, __import__("cursed_platform.ficha_viva").ficha_viva.ConflitoVersao):
                        session.rollback()
                        resultados.append("recusada")

            threads = [threading.Thread(target=responder, args=(v,)) for v in versoes[:2]]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=30)
            self.assertEqual(sorted(resultados), ["aceita", "recusada"])
            with Session(engine) as session:
                self.assertEqual(session.scalar(select(func.count()).select_from(CartaPersonagemRegistro)), 1)
                self.assertEqual(session.scalar(select(func.count()).select_from(CartaDefinicaoRegistro)), 3)
        finally:
            engine.dispose()
            with admin.connect() as conexao:
                conexao.execute(text(f'DROP DATABASE IF EXISTS "{banco}" WITH (FORCE)'))
            admin.dispose()
