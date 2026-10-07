"""Cartas usadas na cena (cartas-na-cena, tarefas 3.1 a 3.5 e 4.1 a 4.2): domínio e API."""

from __future__ import annotations

import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from cursed_platform import recursos_ficha, uso_cartas
from cursed_platform.config import PlatformSettings
from cursed_platform.ficha_viva import ConflitoVersao
from cursed_platform.persistence import (
    CartaDefinicaoRegistro, CartaPersonagemRegistro, CartaVersaoRegistro, EventoAuditoriaRegistro, PersonagemRegistro,
    UsoDeCartaRegistro,
)
from cursed_platform.tests.test_rolagens import Ator, create_app, get_actor
from cursed_platform.tests.test_turno import banco, montar_mesa


def ficha(nome: str, pp_atual: int | None = 10) -> dict:
    """Mago de nível 1 com Propósito 2: PP máximo 10 (8 + Propósito)."""
    dados = {"personagem": {"nome": nome, "classe": "Mago", "nivel": 1},
             "atributos": {"valores": {"Raciocínio": 2, "Propósito": 2, "Vigor": 1}},
             "pericias": {"valores": {"Prontidão": 1}}}
    if pp_atual is not None:
        dados["recursos"] = {"pp": {"atual": pp_atual}}
    return dados


CARTAS = {
    "lanca": {"titulo": "Lança de Fogo", "texto": "Fogo.", "ativacao": "ativa", "custo_uso": 3, "lancamento": "Instantâneo",
              "alvo_area": "1 criatura", "custo_legado": "3 PP"},
    "egide": {"titulo": "Égide", "texto": "Escudo.", "ativacao": "reacao", "custo_uso": 1, "custo_legado": "1 PP"},
    "rito": {"titulo": "Rito", "texto": "Ritual.", "ativacao": "ativa", "custo_uso": 2, "lancamento": "Ritual (10 min)"},
    "furia": {"titulo": "Fúria", "texto": "Raiva.", "ativacao": "ativa", "custo_uso": 1, "lancamento": "Bônus",
              "custo_legado": "1 PP + 1 de Exaustão"},
    "pele": {"titulo": "Pele de Pedra", "texto": "Dura.", "ativacao": "passiva_permanente", "potencia_uso": 8},
    "metamagia": {"titulo": "Metamagia", "texto": "Muda.", "ativacao": "ativa", "custo_legado": "+1 PP sobre o custo do feitiço"},
    "mordida": {"titulo": "Mordida Suja", "texto": "Dentes.", "ativacao": "ativa", "custo_uso": 1},
}


def _cartas(session: Session, mesa_id: str, posses: dict[str, list[str]]) -> dict[str, str]:
    """Publica as cartas e dá as posses aprendidas; devolve {chave: versao_id}."""
    versoes: dict[str, str] = {}
    for chave, conteudo in CARTAS.items():
        definicao = CartaDefinicaoRegistro(id=f"def-{chave}", mesa_id=mesa_id, tipo="habilidade", criado_por="mestre",
                                           versao=1, versao_publicada=1, rascunho={})
        session.add(definicao)
        session.flush()
        versao = CartaVersaoRegistro(id=f"ver-{chave}", mesa_id=mesa_id, definicao_id=definicao.id, numero=1,
                                     tipo="habilidade", conteudo={**conteudo, "tipo": "habilidade", "requisitos": [],
                                                                  "tags": [], "ativos": []},
                                     procedencia={}, revisao_pendente=[], publicado_por="mestre")
        session.add(versao)
        versoes[chave] = versao.id
    session.flush()
    for personagem_id, chaves in posses.items():
        for chave in chaves:
            session.add(CartaPersonagemRegistro(
                id=uuid4().hex, mesa_id=mesa_id, personagem_id=personagem_id, definicao_id=f"def-{chave}",
                versao_id=versoes[chave], tipo="habilidade", estado="aprendida" if chave != "rito" else "aprendida",
                origem="concessao", excecao_aprendizado=True,
            ))
    session.flush()
    return versoes


def _sorteio(*valores):
    return patch("cursed_platform.rolagens.secrets.randbelow", side_effect=[v - 1 for v in valores])


class LeituraDaCartaTest(unittest.TestCase):
    def test_acao_da_carta_pelo_lancamento(self):
        casos = [
            ({"ativacao": "reacao", "lancamento": "Instantâneo"}, ("reacao", False)),
            ({"ativacao": "ativa", "lancamento": "Bônus"}, ("bonus", False)),
            ({"ativacao": "ativa", "lancamento": "Livre (Antes do ataque)"}, ("nenhuma", False)),
            ({"ativacao": "ativa", "lancamento": "Instantâneo"}, ("padrao", False)),
            ({"ativacao": "ativa", "lancamento": "1 Ação"}, ("padrao", False)),
            ({"ativacao": "ativa", "lancamento": "Ação Completa"}, ("padrao", False)),
            ({"ativacao": "ativa", "lancamento": "Ritual (10 min)"}, ("padrao", True)),
            ({"ativacao": "ativa", "lancamento": "Concentração"}, ("padrao", True)),
            ({"ativacao": "ativa"}, ("padrao", False)),
        ]
        for conteudo, esperado in casos:
            with self.subTest(conteudo=conteudo):
                self.assertEqual(uso_cartas.acao_da_carta(conteudo), esperado)

    def test_custo_em_pp_registrado_ou_pela_potencia(self):
        self.assertEqual(uso_cartas.custo_em_pp("habilidade", {"custo_uso": 3}), 3)
        self.assertEqual(uso_cartas.custo_em_pp("magia", {"potencia_uso": 20, "ativacao": "ativa"}), 5)
        self.assertEqual(uso_cartas.custo_em_pp("habilidade", {"ativacao": "passiva_permanente", "potencia_uso": 8}), 0)
        self.assertIsNone(uso_cartas.custo_em_pp("habilidade", {"custo_legado": "+1 PP sobre o custo do feitiço"}))
        self.assertIsNone(uso_cartas.custo_em_pp("item", {"custo_uso": 3}))
        self.assertEqual(uso_cartas.custo_extra({"custo_legado": "1 PP + 1 de Exaustão"}), "1 de Exaustão")


class RecursoAtualTest(unittest.TestCase):
    def setUp(self):
        self.engine = banco()
        montar_mesa(self.engine)
        self.session = Session(self.engine)
        self.lion = self.session.get(PersonagemRegistro, "lion")
        self.lion.ficha = ficha("Lion")
        self.session.flush()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_debita_devolve_e_audita_no_campo_do_atual(self):
        antes, depois, evento = recursos_ficha.alterar_atual(self.session, self.lion, "pp", -3, ator_id="ana",
                                                             acao="carta.pp_gasto", origem="Uso de Lança")
        self.assertEqual((antes, depois), (10, 7))
        self.assertEqual(self.lion.ficha["recursos"]["pp"]["atual"], 7)
        self.assertEqual(self.lion.versao, 1)
        self.assertEqual([m["campo"] for m in evento.detalhes["mudancas"]], ["recursos.pp.atual"])
        self.assertEqual((evento.detalhes["mudancas"][0]["antes"], evento.detalhes["mudancas"][0]["depois"]), (10, 7))
        self.assertIn("PP -3", evento.resumo)
        # Devolver passa do máximo? Não: limita ao máximo calculado.
        _, depois, _ = recursos_ficha.alterar_atual(self.session, self.lion, "pp", 5, ator_id="mestre",
                                                    acao="carta.pp_devolvido", origem="Desfeito")
        self.assertEqual(depois, 10)

    def test_atual_ausente_vale_o_maximo_e_sem_pp_recusa(self):
        self.lion.ficha = ficha("Lion", pp_atual=None)
        self.assertEqual(recursos_ficha.atual(self.lion.ficha, "pp"), 10)
        with self.assertRaises(recursos_ficha.RecursoInsuficiente) as erro:
            recursos_ficha.alterar_atual(self.session, self.lion, "pp", -11, ator_id="ana", acao="x", origem="x")
        self.assertEqual(erro.exception.falta, 1)
        self.lion.ficha = {"personagem": {"nome": "Lion"}}
        with self.assertRaises(recursos_ficha.RecursoInvalido):
            recursos_ficha.alterar_atual(self.session, self.lion, "pp", -1, ator_id="ana", acao="x", origem="x")

    def test_versao_desatualizada_e_conflito(self):
        # Outra gravação avançou a versão no banco sem a sessão saber (trava otimista).
        self.session.execute(update(PersonagemRegistro).where(PersonagemRegistro.id == "lion").values(versao=3)
                             .execution_options(synchronize_session=False))
        with self.assertRaises(ConflitoVersao):
            recursos_ficha.alterar_atual(self.session, self.lion, "pp", -1, ator_id="ana", acao="x", origem="x")

    def test_pv_tambem_e_a_estatistica_le(self):
        from cursed_platform import estatisticas
        self.lion.ficha = {**ficha("Lion"), "recursos": {"pv": {"atual": 12}}}
        _, _, evento = recursos_ficha.alterar_atual(self.session, self.lion, "pv", -5, ator_id="mestre", acao="dano", origem="Goblin")
        self.assertEqual(estatisticas.deltas_de_pv(evento), [-5])


class _UsoApi(unittest.TestCase):
    def setUp(self):
        self.engine = banco()
        self.ids = montar_mesa(self.engine)
        with Session(self.engine) as session:
            for pid, nome in (("lion", "Lion"), ("kira", "Kira"), ("goblin", "Goblin"), ("ogro", "Ogro Mau")):
                session.get(PersonagemRegistro, pid).ficha = ficha(nome)
            self.versoes = _cartas(session, "mesa", {
                "lion": ["lanca", "egide", "rito", "furia", "pele", "metamagia"], "kira": ["lanca"],
                "goblin": ["mordida"], "ogro": ["mordida"],
            })
            session.commit()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.ator = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def como(self, ator):
        self.ator = ator
        return self.client

    def tokens(self) -> dict[str, list[str]]:
        cena = self.como("mestre").get("/mesas/mesa/sala").json()["cena"]
        por: dict[str, list[str]] = {}
        for token in cena["tokens"]:
            por.setdefault(token["rotulo"], []).append(token["id"])
        return por

    def mao(self, ator, personagem_id):
        resposta = self.como(ator).get(f"/mesas/mesa/sala/mao?personagem_id={personagem_id}")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return resposta.json()

    def usar(self, ator, personagem_id, chave, alvos=()):
        return self.como(ator).post("/mesas/mesa/sala/usos", json={
            "personagem_id": personagem_id, "versao_id": self.versoes[chave], "alvos": list(alvos)})

    def pp(self, personagem_id):
        with Session(self.engine) as session:
            return session.get(PersonagemRegistro, personagem_id).ficha["recursos"]["pp"]["atual"]

    def auditados(self, acao):
        with Session(self.engine) as session:
            return list(session.scalars(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == acao)))

    def entrar_na_disputa(self):
        """Modo turno com a ordem Kira (18), Lion (10), Goblin (2) e Ogro (1): a vez começa com Kira."""
        self.como("mestre").post("/mesas/mesa/sala/sessoes")
        combate = self.client.post("/mesas/mesa/sala/turno").json()["combate"]
        ids = {p["nome"]: p["id"] for p in combate["participantes"]}
        with _sorteio(18, 10, 2, 1):
            for nome in ("Kira", "Lion", "Goblin", "Ogro"):
                self.client.post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": ids[nome]})
        comecado = self.client.post("/mesas/mesa/sala/turno/inicio").json()["combate"]
        self.assertEqual(comecado["vez_participante_id"], ids["Kira"])
        return ids

    def proximo(self):
        resposta = self.como("mestre").post("/mesas/mesa/sala/turno/proximo")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return resposta.json()["combate"]

    def participante(self, ator, nome):
        combate = self.como(ator).get("/mesas/mesa/sala/turno").json()["combate"]
        return next(p for p in combate["participantes"] if p["nome"] == nome)


class MaoTest(_UsoApi):
    def test_mao_so_com_cartas_jogaveis_e_com_custo_em_pp(self):
        mao = self.mao("ana", "lion")
        self.assertEqual((mao["personagem_nome"], mao["pp_atual"], mao["pp_maximo"]), ("Lion", 10, 10))
        por_titulo = {c["titulo"]: c for c in mao["cartas"]}
        # Passiva permanente e carta sem custo em PP ficam fora (decisão do usuário, 2026-10-06).
        self.assertEqual(set(por_titulo), {"Lança de Fogo", "Égide", "Rito", "Fúria"})
        self.assertEqual((por_titulo["Lança de Fogo"]["acao"], por_titulo["Lança de Fogo"]["custo_uso"]), ("padrao", 3))
        self.assertEqual((por_titulo["Égide"]["ativacao"], por_titulo["Égide"]["acao"]), ("reacao", "reacao"))
        self.assertEqual((por_titulo["Rito"]["acao"], por_titulo["Rito"]["aviso_lancamento"]), ("padrao", True))
        self.assertEqual((por_titulo["Fúria"]["acao"], por_titulo["Fúria"]["custo_extra"]), ("bonus", "1 de Exaustão"))
        self.assertTrue(all(c["motivo_indisponivel"] is None for c in mao["cartas"]))

    def test_jogador_so_pede_a_propria_mao(self):
        self.assertEqual(self.como("bia").get("/mesas/mesa/sala/mao?personagem_id=lion").status_code, 403)
        self.assertEqual(self.como("outro").get("/mesas/mesa/sala/mao?personagem_id=lion").status_code, 404)
        self.assertEqual(self.mao("mestre", "goblin")["cartas"][0]["titulo"], "Mordida Suja")

    def test_motivo_de_pp_insuficiente(self):
        with Session(self.engine) as session:
            session.get(PersonagemRegistro, "lion").ficha = ficha("Lion", pp_atual=2)
            session.commit()
        por_titulo = {c["titulo"]: c["motivo_indisponivel"] for c in self.mao("ana", "lion")["cartas"]}
        self.assertEqual(por_titulo["Lança de Fogo"], "Faltam 1 PP.")
        self.assertIsNone(por_titulo["Égide"])


class UsarForaDoTurnoTest(_UsoApi):
    def test_usa_debita_registra_e_audita(self):
        goblins = self.tokens()["Goblin"]
        resposta = self.usar("ana", "lion", "lanca", [goblins[1]])
        self.assertEqual(resposta.status_code, 201, resposta.text)
        uso = resposta.json()
        self.assertEqual((uso["titulo"], uso["custo_pago"], uso["acao"], uso["desfeito"]), ("Lança de Fogo", 3, "padrao", False))
        self.assertEqual(uso["alvos"], [{"token_id": goblins[1], "personagem_id": "goblin", "rotulo": "Goblin"}])
        self.assertIsNone(uso["combate_id"])
        self.assertEqual(self.pp("lion"), 7)
        usada, = self.auditados("carta.usada")
        self.assertEqual(usada.resumo, "Lion usou Lança de Fogo (3 PP) em Goblin")
        self.assertEqual(usada.visibilidade, "mesa")
        gasto, = self.auditados("carta.pp_gasto")
        self.assertEqual(gasto.detalhes["mudancas"][0], {"campo": "recursos.pp.atual", "antes": 10, "depois": 7,
                                                           "ausente_antes": False, "ausente_depois": False, "completo": True})
        lista = self.como("bia").get("/mesas/mesa/sala/usos").json()
        self.assertEqual([u["id"] for u in lista], [uso["id"]])
        self.assertEqual(self.como("bia").get(f"/mesas/mesa/sala/usos?depois={uso['id']}").json(), [])

    def test_recusas(self):
        self.assertEqual(self.usar("bia", "lion", "lanca").status_code, 403)
        self.assertEqual(self.usar("ana", "kira", "lanca").status_code, 403)
        self.assertEqual(self.usar("ana", "lion", "mordida").status_code, 422)  # não aprendida
        self.assertEqual(self.usar("ana", "lion", "pele").status_code, 422)  # passiva
        self.assertEqual(self.usar("ana", "lion", "metamagia").status_code, 422)  # sem custo em PP
        self.assertEqual(self.usar("ana", "lion", "lanca", ["token-inexistente"]).status_code, 422)
        with Session(self.engine) as session:
            session.get(PersonagemRegistro, "lion").ficha = ficha("Lion", pp_atual=2)
            session.commit()
        faltou = self.usar("ana", "lion", "lanca")
        self.assertEqual((faltou.status_code, faltou.json()["detail"]), (409, "Faltam 1 PP."))
        self.assertEqual(self.pp("lion"), 2)
        self.assertEqual(self.auditados("carta.usada"), [])

    def test_custo_extra_nao_debita_exaustao(self):
        resposta = self.usar("ana", "lion", "furia")
        self.assertEqual(resposta.json()["custo_extra"], "1 de Exaustão")
        self.assertEqual(self.pp("lion"), 9)
        with Session(self.engine) as session:
            self.assertNotIn("desgaste", session.get(PersonagemRegistro, "lion").ficha)

    def test_jogador_nao_marca_alvo_oculto_e_nao_ve_uso_de_personagem_oculto(self):
        ogro = self.tokens()["Ogro"][0]
        self.assertEqual(self.usar("ana", "lion", "lanca", [ogro]).status_code, 422)
        mestre = self.usar("mestre", "ogro", "mordida", [self.tokens()["Lion"][0]])
        self.assertEqual(mestre.status_code, 201, mestre.text)
        self.assertEqual(self.como("ana").get("/mesas/mesa/sala/usos").json(), [])
        self.assertEqual(len(self.como("mestre").get("/mesas/mesa/sala/usos").json()), 1)
        self.assertEqual(self.auditados("carta.usada")[0].visibilidade, "narrador")

    def test_estatisticas_de_pp_gasto_e_carta_favorita(self):
        self.como("mestre").post("/mesas/mesa/sala/sessoes")
        self.usar("ana", "lion", "lanca")
        self.usar("ana", "lion", "lanca")
        egide = self.usar("ana", "lion", "egide").json()
        ana = next(j for j in self.como("ana").get("/mesas/mesa/sala/estatisticas").json()["jogadores"]
                   if j["usuario_id"] == "ana")
        self.assertEqual((ana["sessao"]["pp_gasto"], ana["sessao"]["cartas_usadas"]), (7, 3))
        self.assertEqual(ana["sessao"]["carta_favorita"], {"titulo": "Lança de Fogo", "usos": 2})
        self.assertEqual(ana["campanha"]["pp_gasto"], 7)
        # Desfazer o último uso tira o Égide da conta.
        self.assertEqual(self.como("mestre").post(f"/mesas/mesa/sala/usos/{egide['id']}/desfazer").status_code, 200)
        ana = next(j for j in self.como("ana").get("/mesas/mesa/sala/estatisticas").json()["jogadores"]
                   if j["usuario_id"] == "ana")
        self.assertEqual((ana["sessao"]["pp_gasto"], ana["sessao"]["cartas_usadas"]), (6, 2))
        bia = next(j for j in self.como("mestre").get("/mesas/mesa/sala/estatisticas").json()["jogadores"]
                   if j["usuario_id"] == "bia")
        self.assertIsNone(bia["campanha"]["carta_favorita"])


class UsarNaDisputaTest(_UsoApi):
    def test_ativa_so_na_vez_reacao_fora_dela_e_acoes_do_turno(self):
        ids = self.entrar_na_disputa()
        # Vez de Kira: Lion não usa ativa, mas usa a Reação.
        fora = self.usar("ana", "lion", "lanca")
        self.assertEqual((fora.status_code, fora.json()["detail"]), (403, "Não é a vez deste personagem."))
        motivos = {c["titulo"]: c["motivo_indisponivel"] for c in self.mao("ana", "lion")["cartas"]}
        self.assertEqual(motivos["Lança de Fogo"], "Não é a vez deste personagem.")
        self.assertIsNone(motivos["Égide"])
        reagiu = self.usar("ana", "lion", "egide")
        self.assertEqual((reagiu.status_code, reagiu.json()["rodada"]), (201, 1), reagiu.text)
        self.assertIsNotNone(reagiu.json()["combate_id"])
        self.assertEqual(self.participante("ana", "Lion")["acoes"], {"padrao": True, "bonus": True, "reacao": False})
        self.assertEqual(self.usar("ana", "lion", "egide").status_code, 409)
        # O jogador não vê as ações dos outros; o Narrador vê todas.
        self.assertIsNone(self.participante("ana", "Kira")["acoes"])
        self.assertIsNotNone(self.participante("mestre", "Goblin")["acoes"])
        # Vez de Lion: a Ação Padrão é gasta pela carta, e a segunda ativa de Ação Padrão é recusada.
        self.proximo()
        self.assertEqual(self.usar("ana", "lion", "lanca", [self.tokens()["Goblin"][0]]).status_code, 201)
        self.assertEqual(self.participante("ana", "Lion")["acoes"], {"padrao": False, "bonus": True, "reacao": True})
        segunda = self.usar("ana", "lion", "rito")
        self.assertEqual((segunda.status_code, segunda.json()["detail"]), (409, "Ação Padrão já usada nesta vez."))
        self.assertEqual(self.pp("lion"), 6)
        # Fúria usa a Ação Bônus, que ainda está livre.
        self.assertEqual(self.usar("ana", "lion", "furia").status_code, 201)
        self.assertEqual(self.participante("ana", "Lion")["acoes"], {"padrao": False, "bonus": False, "reacao": True})
        # Correr com a Ação Padrão gasta é recusado; o Narrador devolve e aí Correr passa.
        correr = self.como("ana").post("/mesas/mesa/sala/turno/correr")
        self.assertEqual((correr.status_code, correr.json()["detail"]), (409, "Ação Padrão já usada nesta vez."))
        devolvida = self.como("mestre").post("/mesas/mesa/sala/turno/acoes/devolucao",
                                             json={"participante_id": ids["Lion"], "acao": "padrao"})
        self.assertEqual(devolvida.status_code, 200, devolvida.text)
        self.assertEqual(len(self.auditados("turno.acao_devolvida")), 1)
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/correr").status_code, 200)
        self.assertEqual(self.participante("mestre", "Lion")["acoes"]["padrao"], False)
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/acoes/devolucao",
                                               json={"participante_id": ids["Lion"], "acao": "padrao"}).status_code, 403)
        # Na próxima vez de Lion, tudo volta.
        for _ in range(4):
            self.proximo()
        self.assertEqual(self.participante("ana", "Lion")["acoes"], {"padrao": True, "bonus": True, "reacao": True})

    def test_jogador_encerra_a_propria_vez(self):
        """Decisão do usuário (2026-10-06): o jogador encerra o próprio turno; fora da vez dele, não."""
        ids = self.entrar_na_disputa()  # vez de Kira (bia)
        recusado = self.como("ana").post("/mesas/mesa/sala/turno/proximo")
        self.assertEqual(recusado.status_code, 403)
        passou = self.como("bia").post("/mesas/mesa/sala/turno/proximo")
        self.assertEqual(passou.status_code, 200, passou.text)
        self.assertEqual(passou.json()["combate"]["vez_participante_id"], ids["Lion"])
        evento, = self.auditados("turno.vez")
        self.assertTrue(evento.detalhes["encerrado_pelo_jogador"])
        self.assertIn("Kira encerrou o turno", evento.resumo)
        # Agora é a vez de Lion (ana): Bia não encerra por ele; Ana encerra.
        self.assertEqual(self.como("bia").post("/mesas/mesa/sala/turno/proximo").status_code, 403)
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/proximo").status_code, 200)
        # Na vez do Goblin, só o Narrador.
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/proximo").status_code, 403)
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/turno/proximo").status_code, 200)
        self.assertEqual(self.como("outro").post("/mesas/mesa/sala/turno/proximo").status_code, 404)

    def test_jogador_controla_o_companion_liberado_pelo_narrador(self):
        """Decisão do usuário (2026-10-06): o jogador joga por todo personagem que controla, inclusive um companion
        criado pelo Narrador e liberado para ele pelo token."""
        with Session(self.engine) as session:
            session.add(PersonagemRegistro(id="bolota", mesa_id="mesa", proprietario_id=None, tipo="npc", ficha=ficha("Bolota")))
            session.commit()
            session.add(CartaPersonagemRegistro(
                id="posse-bolota", mesa_id="mesa", personagem_id="bolota", definicao_id="def-lanca", versao_id=self.versoes["lanca"],
                tipo="habilidade", estado="aprendida", origem="concessao", excecao_aprendizado=True))
            session.commit()
        sala_ = self.como("mestre").get("/mesas/mesa/sala").json()["cena"]
        camada = next(c["id"] for c in sala_["camadas"] if c["visibilidade"] == "mesa")
        criado = self.client.post(f"/mesas/mesa/sala/cenas/{sala_['id']}/tokens", json={
            "camada_id": camada, "rotulo": "Bolota", "x": 6, "y": 6, "tamanho": 1, "personagem_id": "bolota", "oculto": False,
            "controladores": ["ana"]})
        self.assertEqual(criado.status_code, 201, criado.text)
        # Ana vê a mão e usa pelo companion; Bia não. O token diz a Ana que ela o controla.
        self.assertEqual(self.mao("ana", "bolota")["personagem_nome"], "Bolota")
        self.assertEqual(self.como("bia").get("/mesas/mesa/sala/mao?personagem_id=bolota").status_code, 403)
        self.assertEqual(self.usar("ana", "bolota", "lanca").status_code, 201)
        self.assertEqual(self.usar("bia", "bolota", "lanca").status_code, 403)
        token = next(t for t in self.como("ana").get("/mesas/mesa/sala").json()["cena"]["tokens"] if t["rotulo"] == "Bolota")
        self.assertTrue(token["controlador"])
        self.assertFalse(next(t for t in self.como("bia").get("/mesas/mesa/sala").json()["cena"]["tokens"] if t["rotulo"] == "Bolota")["controlador"])
        # Na disputa, Bolota é "meu" para Ana, que rola a iniciativa, corre e encerra a vez por ele.
        self.como("mestre").post("/mesas/mesa/sala/sessoes")
        combate = self.client.post("/mesas/mesa/sala/turno").json()["combate"]
        bolota = next(p for p in combate["participantes"] if p["nome"] == "Bolota")
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": bolota["id"]}).status_code, 201)
        self.assertTrue(self.participante("ana", "Bolota")["meu"])
        self.assertFalse(self.participante("bia", "Bolota")["meu"])

    def test_liberar_um_token_da_ficha_nao_da_a_vez_dos_outros(self):
        """Correção do bug relatado pelo usuário (2026-10-06): com o "Goblin 2" liberado para Ana, ela encerra só a
        vez do Goblin 2, e não a do grupo (Goblin) nem a de outros tokens da mesma ficha."""
        self.entrar_na_disputa()
        sala_ = self.como("mestre").get("/mesas/mesa/sala").json()["cena"]
        camada = next(c["id"] for c in sala_["camadas"] if c["visibilidade"] == "mesa")
        criado = self.client.post(f"/mesas/mesa/sala/cenas/{sala_['id']}/tokens", json={
            "camada_id": camada, "rotulo": "Goblin", "x": 7, "y": 7, "tamanho": 1, "personagem_id": "goblin", "oculto": False,
            "controladores": ["ana"]})
        self.assertEqual(criado.status_code, 201, criado.text)
        proprio = next(p for p in self.estado_do_turno("mestre")["participantes"] if p["nome"] == "Goblin 2")
        with _sorteio(3):
            self.assertEqual(self.client.post("/mesas/mesa/sala/turno/iniciativa", json={"participante_id": proprio["id"]}).status_code, 201)
        # Para Ana, só o Goblin 2 é "meu"; o grupo Goblin, não.
        por_nome = {p["nome"]: p["meu"] for p in self.estado_do_turno("ana")["participantes"]}
        self.assertEqual((por_nome["Goblin"], por_nome["Goblin 2"], por_nome["Lion"], por_nome["Kira"]), (False, True, True, False))
        # Na vez do grupo Goblin, Ana não encerra nem usa; na vez do Goblin 2, sim.
        self.avancar_ate("Goblin")
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/proximo").status_code, 403)
        self.assertEqual(self.usar("ana", "goblin", "mordida").status_code, 403)
        motivos = {c["titulo"]: c["motivo_indisponivel"] for c in self.mao("ana", "goblin")["cartas"]}
        self.assertEqual(motivos["Mordida Suja"], "Não é a vez deste personagem.")
        self.avancar_ate("Goblin 2")
        self.assertIsNone(self.mao("ana", "goblin")["cartas"][0]["motivo_indisponivel"])
        self.assertEqual(self.usar("ana", "goblin", "mordida").status_code, 201)
        self.assertEqual(self.como("ana").post("/mesas/mesa/sala/turno/proximo").status_code, 200)

    def estado_do_turno(self, ator):
        return self.como(ator).get("/mesas/mesa/sala/turno").json()["combate"]

    def avancar_ate(self, nome):
        """O Narrador passa a vez até ela chegar ao participante com este nome."""
        for _ in range(8):
            combate = self.estado_do_turno("mestre")
            vez = next(p for p in combate["participantes"] if p["id"] == combate["vez_participante_id"])
            if vez["nome"] == nome:
                return
            self.proximo()
        self.fail(f"A vez não chegou a {nome}.")

    def test_narrador_usa_pelo_monstro_na_vez_dele(self):
        self.entrar_na_disputa()
        self.proximo()
        self.proximo()  # vez do Goblin
        self.assertEqual(self.usar("mestre", "goblin", "mordida", [self.tokens()["Lion"][0]]).status_code, 201)
        self.assertEqual(self.pp("goblin"), 9)
        self.assertEqual(self.usar("mestre", "ogro", "mordida").status_code, 403)  # Ogro não está na vez

    def test_antes_da_disputa_comecar_nada_e_usado(self):
        self.como("mestre").post("/mesas/mesa/sala/sessoes")
        self.client.post("/mesas/mesa/sala/turno")
        self.assertEqual(self.usar("ana", "lion", "egide").status_code, 409)
        self.assertEqual(self.mao("ana", "lion")["cartas"][0]["motivo_indisponivel"], "A disputa ainda não começou.")


class DesfazerTest(_UsoApi):
    def test_narrador_desfaz_o_ultimo_uso_na_mesma_rodada(self):
        ids = self.entrar_na_disputa()
        self.proximo()  # vez de Lion
        primeiro = self.usar("ana", "lion", "furia").json()
        segundo = self.usar("ana", "lion", "lanca").json()
        self.assertEqual(self.pp("lion"), 6)
        self.assertEqual(self.como("ana").post(f"/mesas/mesa/sala/usos/{segundo['id']}/desfazer").status_code, 403)
        self.assertEqual(self.como("mestre").post(f"/mesas/mesa/sala/usos/{primeiro['id']}/desfazer").status_code, 409)
        desfeito = self.como("mestre").post(f"/mesas/mesa/sala/usos/{segundo['id']}/desfazer")
        self.assertEqual(desfeito.status_code, 200, desfeito.text)
        self.assertTrue(desfeito.json()["desfeito"])
        self.assertEqual(self.pp("lion"), 9)
        self.assertEqual(self.participante("ana", "Lion")["acoes"], {"padrao": True, "bonus": False, "reacao": True})
        self.assertEqual(self.como("mestre").post(f"/mesas/mesa/sala/usos/{segundo['id']}/desfazer").status_code, 409)
        self.assertEqual(len(self.auditados("carta.uso_desfeito")), 1)
        self.assertEqual(len(self.auditados("carta.pp_devolvido")), 1)
        # A lista mostra o uso riscado, e a rodada seguinte fecha a janela do primeiro.
        lista = self.como("ana").get("/mesas/mesa/sala/usos").json()
        self.assertEqual([u["desfeito"] for u in lista], [False, True])
        for _ in range(4):
            self.proximo()
        self.assertEqual(self.como("mestre").post(f"/mesas/mesa/sala/usos/{primeiro['id']}/desfazer").status_code, 409)
        self.assertEqual(self.como("mestre").post("/mesas/mesa/sala/usos/999/desfazer").status_code, 404)
        self.assertIn("Lion", ids)

    def test_fora_do_modo_turno_desfaz_o_ultimo(self):
        uso = self.usar("ana", "lion", "lanca").json()
        self.assertEqual(self.como("mestre").post(f"/mesas/mesa/sala/usos/{uso['id']}/desfazer").status_code, 200)
        self.assertEqual(self.pp("lion"), 10)
        with Session(self.engine) as session:
            registro = session.get(UsoDeCartaRegistro, uso["id"])
            self.assertEqual(registro.desfeito_por, "mestre")


if __name__ == "__main__":
    unittest.main()
