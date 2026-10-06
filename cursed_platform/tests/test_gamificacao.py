"""Gamificação da Sala no servidor (gamificacao-da-sala, tarefas 4.1 a 5.3)."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import auditoria, estatisticas
from cursed_platform.config import PlatformSettings
from cursed_platform.criticos import Faixa
from cursed_platform.persistence import (
    EventoAuditoriaRegistro, MembroRegistro, PersonagemRegistro, RolagemRegistro, VotoMvpRegistro,
)
from cursed_platform.tests.test_rolagens import Ator, _banco, create_app, get_actor

D20 = [{"faces": 20, "quantidade": 1}]


def _sorteio(*valores):
    """Faz o gerador devolver exatamente estes valores naturais, na ordem."""
    return patch("cursed_platform.rolagens.secrets.randbelow", side_effect=[v - 1 for v in valores])


class _Api(unittest.TestCase):
    def setUp(self):
        self.engine = _banco()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.ator = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def como(self, ator: str) -> TestClient:
        self.ator = ator
        return self.client

    def preferencias(self, **valores):
        corpo = {"destaque_criticos": False, "estatisticas_visiveis": False, **valores}
        resposta = self.como("mestre").put("/mesas/mesa/sala/preferencias", json=corpo)
        self.assertEqual(resposta.status_code, 200, resposta.text)

    def rolar(self, ator, *valores, **extra):
        dados = extra.pop("dados", D20)
        with _sorteio(*valores):
            resposta = self.como(ator).post("/mesas/mesa/sala/rolagens", json={"dados": dados, **extra})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        return resposta.json()

    def auditados(self, acao):
        with Session(self.engine) as session:
            return list(session.scalars(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == acao)))


class SessoesTest(_Api):
    def test_numeracao_sequencial_e_uma_por_vez(self):
        self.assertEqual(self.como("ana").get("/mesas/mesa/sala/sessoes").json(), {"atual": None, "ultima_encerrada": None})
        primeira = self.como("mestre").post("/mesas/mesa/sala/sessoes")
        self.assertEqual(primeira.status_code, 201)
        self.assertEqual(primeira.json()["atual"]["numero"], 1)
        self.assertEqual(self.client.post("/mesas/mesa/sala/sessoes").status_code, 409)
        encerrada = self.client.post("/mesas/mesa/sala/sessoes/atual/encerramento").json()
        self.assertIsNone(encerrada["atual"])
        self.assertEqual(encerrada["ultima_encerrada"]["numero"], 1)
        self.assertEqual(self.client.post("/mesas/mesa/sala/sessoes/atual/encerramento").status_code, 409)
        self.assertEqual(self.client.post("/mesas/mesa/sala/sessoes").json()["atual"]["numero"], 2)
        self.assertEqual(len(self.auditados("sessao.iniciada")), 2)
        self.assertEqual(len(self.auditados("sessao.encerrada")), 1)

    def test_jogador_nao_controla_e_fora_da_mesa_nao_ve(self):
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/sessoes").status_code, 403)
        self.assertEqual(self.como("outro").get("/mesas/mesa/sala/sessoes").status_code, 404)
        self.assertEqual(self.como("outro").post("/mesas/mesa/sala/sessoes").status_code, 404)


class PreferenciasTest(_Api):
    def test_padrao_desligado_gravar_e_ler(self):
        self.assertEqual(self.como("ana").get("/mesas/mesa/sala/preferencias").json(),
                         {"destaque_criticos": False, "estatisticas_visiveis": False})
        self.preferencias(destaque_criticos=True)
        self.assertEqual(self.como("ana").get("/mesas/mesa/sala/preferencias").json(),
                         {"destaque_criticos": True, "estatisticas_visiveis": False})
        self.assertEqual(len(self.auditados("sala.preferencias_alteradas")), 1)
        self.preferencias(destaque_criticos=True)  # sem mudança, sem novo registro
        self.assertEqual(len(self.auditados("sala.preferencias_alteradas")), 1)

    def test_jogador_nao_muda(self):
        resposta = self.como("ana").put("/mesas/mesa/sala/preferencias",
                                        json={"destaque_criticos": True, "estatisticas_visiveis": True})
        self.assertEqual(resposta.status_code, 403)


class MarcasTest(_Api):
    def test_20_natural_com_e_sem_destaque(self):
        self.assertEqual(self.rolar("ana", 20)["marcas"], [])
        self.preferencias(destaque_criticos=True)
        self.assertEqual(self.rolar("ana", 20)["marcas"], [{"faces": 20, "indice": 0, "tipo": "critico"}])
        self.assertEqual(self.rolar("ana", 1)["marcas"], [{"faces": 20, "indice": 0, "tipo": "falha_critica"}])
        self.assertEqual(self.rolar("ana", 19)["marcas"], [])

    def test_ligar_o_destaque_depois_mostra_a_marca_antiga(self):
        rolagem = self.rolar("ana", 20)
        self.assertEqual(rolagem["marcas"], [])
        self.preferencias(destaque_criticos=True)
        lista = self.como("ana").get("/mesas/mesa/sala/rolagens").json()
        self.assertEqual(lista[-1]["marcas"], [{"faces": 20, "indice": 0, "tipo": "critico"}])

    def test_faixa_do_personagem_so_na_rolagem_pela_ficha(self):
        self.preferencias(destaque_criticos=True)
        with patch("cursed_api.room.criticos.faixa_do_personagem", return_value=Faixa(19, 2)) as faixa:
            pela_ficha = self.rolar("ana", 19, personagem_id="ana-p")
            falha = self.rolar("ana", 2, personagem_id="ana-p")
            sem_ficha = self.rolar("ana", 19)
        faixa.assert_called_with(unittest.mock.ANY, "mesa", "ana-p")
        self.assertEqual(pela_ficha["marcas"], [{"faces": 20, "indice": 0, "tipo": "critico"}])
        self.assertEqual(falha["marcas"], [{"faces": 20, "indice": 0, "tipo": "falha_critica"}])
        self.assertEqual(sem_ficha["marcas"], [])
        for rolagem in (pela_ficha, falha):
            self.assertFalse({"faixa", "inicio_critico", "fim_falha"} & set(rolagem))

    def test_varios_d20_e_d100_sem_marca(self):
        self.preferencias(destaque_criticos=True)
        dois = self.rolar("ana", 20, 7, dados=[{"faces": 20, "quantidade": 2}])
        self.assertEqual(dois["marcas"], [{"faces": 20, "indice": 0, "tipo": "critico"}])
        self.assertEqual(self.rolar("ana", 100, dados=[{"faces": 100, "quantidade": 1}])["marcas"], [])

    def test_rolagem_guarda_a_sessao(self):
        self.rolar("ana", 10)
        sessao = self.como("mestre").post("/mesas/mesa/sala/sessoes").json()["atual"]["id"]
        self.rolar("ana", 10)
        with Session(self.engine) as session:
            self.assertEqual([r.sessao_id for r in session.scalars(select(RolagemRegistro).order_by(RolagemRegistro.id))],
                             [None, sessao])


class EstatisticasTest(_Api):
    def pv(self, personagem_id, *valores):
        """Registra a sequência de PV atual do personagem como alterações de ficha."""
        with Session(self.engine) as session:
            personagem = session.get(PersonagemRegistro, personagem_id)
            for antes, depois in zip(valores, valores[1:]):
                auditoria.registrar(
                    session, mesa_id="mesa", ator_id="mestre", categoria="ficha", acao="ficha.atualizada",
                    relevancia="mecanica", resumo="PV", personagem=personagem,
                    mudancas=auditoria.mudancas({"recursos": {"pv": {"atual": antes}}},
                                                {"recursos": {"pv": {"atual": depois}}}),
                )
            session.commit()

    def minhas(self, ator="ana"):
        resposta = self.como(ator).get("/mesas/mesa/sala/estatisticas")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return resposta.json()

    def test_vida_perdida_e_recuperada_na_sessao_e_na_campanha(self):
        self.pv("ana-p", 16, 14)
        self.como("mestre").post("/mesas/mesa/sala/sessoes")
        self.pv("ana-p", 16, 9, 12, 4)
        ana, = self.minhas()["jogadores"]
        self.assertEqual((ana["sessao"]["vida_perdida"], ana["sessao"]["vida_recuperada"]), (15, 3))
        self.assertEqual((ana["campanha"]["vida_perdida"], ana["campanha"]["vida_recuperada"]), (17, 3))

    def test_maximo_e_ficha_nova_nao_contam(self):
        with Session(self.engine) as session:
            personagem = session.get(PersonagemRegistro, "ana-p")
            auditoria.registrar(session, mesa_id="mesa", ator_id="mestre", categoria="ficha", acao="ficha.atualizada",
                                relevancia="mecanica", resumo="x", personagem=personagem,
                                mudancas=auditoria.mudancas({"recursos": {"pv_maximo": 16}}, {"recursos": {"pv_maximo": 21}})
                                + auditoria.mudancas({}, {"recursos": {"pv": {"atual": 16}}}))
            session.commit()
        ana, = self.minhas()["jogadores"]
        self.assertEqual((ana["campanha"]["vida_perdida"], ana["campanha"]["vida_recuperada"]), (0, 0))

    def test_rolagens_sorte_e_ocultas(self):
        for _ in range(12):
            self.rolar("ana", 20)
        self.rolar("mestre", 1, oculta=True)
        ana, = self.minhas()["jogadores"]
        self.assertEqual((ana["campanha"]["rolagens"], ana["campanha"]["dados"]), (12, 12))
        self.assertEqual((ana["campanha"]["sorte"], ana["campanha"]["rotulo_sorte"]), (50.0, "quentes"))
        self.assertIsNone(ana["campanha"]["criticos"])
        self.assertIsNone(ana["sessao"])

    def test_rotulos_da_sorte(self):
        periodo = estatisticas.Periodo()
        self.assertEqual((periodo.sorte, periodo.rotulo_sorte), (None, "poucos_dados"))
        for media, rotulo in ((0.55, "quentes"), (0.45, "frios"), (0.54, "na_media"), (0.46, "na_media")):
            with self.subTest(media=media):
                periodo = estatisticas.Periodo(dados=10, _soma_sorte=media * 10)
                self.assertEqual(periodo.rotulo_sorte, rotulo)

    def test_poucos_dados_e_ultima_sessao_encerrada(self):
        self.como("mestre").post("/mesas/mesa/sala/sessoes")
        self.rolar("ana", 3)
        self.como("mestre").post("/mesas/mesa/sala/sessoes/atual/encerramento")
        dados = self.minhas()
        self.assertEqual(dados["sessao"]["numero"], 1)
        self.assertEqual(dados["jogadores"][0]["sessao"]["rotulo_sorte"], "poucos_dados")
        self.assertEqual(dados["jogadores"][0]["sessao"]["rolagens"], 1)

    def test_criticos_so_com_destaque(self):
        self.rolar("ana", 20)
        self.rolar("ana", 1)
        self.preferencias(destaque_criticos=True)
        ana, = self.minhas()["jogadores"]
        self.assertEqual((ana["campanha"]["criticos"], ana["campanha"]["falhas_criticas"]), (1, 1))

    def test_visibilidade_por_papel_e_placar(self):
        self.assertEqual([j["usuario_id"] for j in self.minhas("ana")["jogadores"]], ["ana"])
        self.assertEqual(sorted(j["usuario_id"] for j in self.minhas("mestre")["jogadores"]), ["ana", "bia"])
        self.preferencias(estatisticas_visiveis=True)
        dados = self.minhas("ana")
        self.assertTrue(dados["placar_visivel"])
        self.assertEqual(sorted(j["usuario_id"] for j in dados["jogadores"]), ["ana", "bia"])
        self.assertEqual(self.como("outro").get("/mesas/mesa/sala/estatisticas").status_code, 404)


class MvpTest(_Api):
    def estado(self, ator):
        return self.como(ator).get("/mesas/mesa/sala/mvp").json()

    def votar(self, ator, candidato):
        return self.como(ator).put("/mesas/mesa/sala/mvp/voto", json={"candidato_id": candidato})

    def com_carla(self):
        with Session(self.engine) as session:
            session.add(MembroRegistro(mesa_id="mesa", usuario_id="carla", papel="jogador"))
            session.commit()

    def test_votar_trocar_e_vencedor_unico(self):
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/mvp").status_code, 201)
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/mvp").status_code, 409)
        self.assertEqual(self.votar("ana", "bia").status_code, 200)
        self.assertEqual(self.estado("ana")["votacao"]["meu_voto"], "bia")
        self.assertEqual(self.estado("ana")["votacao"]["candidatos"], ["bia"])
        narrador = self.estado("mestre")["votacao"]
        self.assertEqual((narrador["votaram"], narrador["total"], narrador["meu_voto"]), (1, 2, None))
        self.assertEqual(self.votar("bia", "ana").status_code, 200)
        self.assertEqual(self.votar("bia", "ana").status_code, 200)  # o último vale
        self.com_carla()
        self.votar("carla", "bia")
        resultado = self.como("mestre").post("/mesas/mesa/sala/mvp/encerramento").json()
        self.assertEqual((resultado["votacao"]["estado"], resultado["votacao"]["vencedor_id"],
                          resultado["votacao"]["votos_do_vencedor"]), ("encerrada", "bia", 2))
        self.assertEqual([h["vencedor_id"] for h in self.estado("ana")["historico"]], ["bia"])
        self.assertIn("bia", self.estado("ana")["apelidos"])
        self.assertEqual(len(self.auditados("mvp.encerrada")), 1)

    def test_recusas(self):
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/mvp").status_code, 403)
        self.assertEqual(self.votar("ana", "bia").status_code, 409)
        self.como("mestre").post("/mesas/mesa/sala/mvp")
        self.assertEqual(self.votar("ana", "ana").status_code, 422)
        self.assertEqual(self.votar("mestre", "ana").status_code, 403)
        self.assertEqual(self.votar("ana", "mestre").status_code, 422)
        self.assertEqual(self.votar("outro", "ana").status_code, 404)

    def test_menos_de_dois_jogadores(self):
        with Session(self.engine) as session:
            session.get(MembroRegistro, ("mesa", "bia")).ativo = False
            session.commit()
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/mvp").status_code, 422)

    def test_empate_e_desempate(self):
        self.como("mestre").post("/mesas/mesa/sala/mvp")
        self.votar("ana", "bia")
        self.votar("bia", "ana")
        empate = self.como("mestre").post("/mesas/mesa/sala/mvp/encerramento").json()["votacao"]
        self.assertEqual((empate["estado"], empate["empatados"], empate["vencedor_id"]), ("desempate", ["ana", "bia"], None))
        self.assertEqual(self.estado("ana")["votacao"]["empatados"], [])
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/mvp/desempate", json={"vencedor_id": "mestre"}).status_code, 422)
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/mvp/desempate", json={"vencedor_id": "ana"}).status_code, 403)
        final = self.como("mestre").post("/mesas/mesa/sala/mvp/desempate", json={"vencedor_id": "ana"}).json()["votacao"]
        self.assertEqual((final["estado"], final["vencedor_id"], final["votos_do_vencedor"]), ("encerrada", "ana", 1))
        self.assertEqual(len(self.auditados("mvp.desempatada")), 1)

    def test_sem_votos_termina_sem_mvp(self):
        self.como("mestre").post("/mesas/mesa/sala/mvp")
        final = self.como("mestre").post("/mesas/mesa/sala/mvp/encerramento").json()
        self.assertEqual((final["votacao"]["estado"], final["votacao"]["vencedor_id"]), ("encerrada", None))
        self.assertEqual(final["historico"], [])

    def test_votos_secretos_e_nao_auditados(self):
        self.como("mestre").post("/mesas/mesa/sala/mvp")
        self.votar("ana", "bia")
        self.votar("bia", "ana")
        self.com_carla()
        self.votar("carla", "bia")
        for ator in ("mestre", "ana", "bia"):
            texto = self.como(ator).get("/mesas/mesa/sala/mvp").text
            with self.subTest(ator=ator):
                self.assertNotIn("contagem", texto)
                self.assertNotIn("eleitor", texto)
        final = self.como("mestre").post("/mesas/mesa/sala/mvp/encerramento").text
        self.assertNotIn("eleitor", final)
        with Session(self.engine) as session:
            eventos = session.scalars(select(EventoAuditoriaRegistro)).all()
            self.assertFalse(any("voto" in e.acao and e.acao != "mvp.encerrada" for e in eventos))
            self.assertFalse(any("carla" in str(e.detalhes) for e in eventos))
            self.assertEqual(len(session.scalars(select(VotoMvpRegistro)).all()), 3)


if __name__ == "__main__":
    unittest.main()
