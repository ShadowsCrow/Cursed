"""Exaustão, Estresse e consequências pela API (tarefas 3 e 4 de reformular-exaustao-estresse-e-consequencias)."""

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
from cursed_platform.persistence import Base, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro, PersonagemRegistro

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

BASE = "/mesas/mesa/personagens"
MARCHA = {"tipo": "mestre", "nome": "Marcha forçada"}
TRAUMA = {
    "categoria": "trauma", "nome": "Medo do Abismo", "descricao": "Pavor de lugares sem fundo.",
    "efeito": "Paralisa diante de precipícios.", "gatilho": "Beiradas e poços escuros",
    "tratamento_regra": "Três cenas enfrentando alturas com apoio.",
    "origem": {"tipo": "mestre", "nome": "Poço de Varn"},
}
FRATURA = {
    "categoria": "ferimento_grave", "nome": "Costelas Fraturadas", "descricao": "Queda durante a marcha.",
    "efeito": "Não pode Correr.", "tratamento_regra": "Estabilizar e repousar uma semana.",
}


def ficha(nome: str, **extra) -> dict:
    return {"personagem": {"nome": nome}, "atributos": {"valores": {"Destreza": 2, "Vigor": 1}},
            "pericias": {"valores": {"Esquiva": 1}}, **extra}


class ApiDesgasteTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                MembroRegistro(mesa_id="mesa", usuario_id="bia", papel="jogador"),
                PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana", versao=0, ficha=ficha("Lia")),
            ])
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

    # ---------------------------------------------------------------- apoio

    def definir(self, **campos):
        with Session(self.engine) as session:
            personagem = session.get(PersonagemRegistro, "lia")
            personagem.ficha = {**personagem.ficha, **campos}
            session.commit()

    def versao(self) -> int:
        with Session(self.engine) as session:
            return session.get(PersonagemRegistro, "lia").versao

    def gravada(self) -> dict:
        with Session(self.engine) as session:
            return session.get(PersonagemRegistro, "lia").ficha

    def alterar(self, trilha="exaustao", delta=1, **corpo):
        return self.client.post(f"{BASE}/lia/desgaste/alteracoes", json={
            "trilha": trilha, "delta": delta, "origem": MARCHA, "versao_esperada": self.versao(), **corpo})

    def esforco(self, tipo="fisico", pontos=1, **corpo):
        return self.client.post(f"{BASE}/lia/desgaste/esforco", json={
            "tipo": tipo, "pontos": pontos, "acao": "Saltar o fosso", "versao_esperada": self.versao(), **corpo})

    def consequencias(self) -> list[dict]:
        return self.client.get(f"{BASE}/lia/consequencias").json()

    def evento(self, acao: str) -> EventoAuditoriaRegistro:
        with Session(self.engine) as session:
            return session.scalars(
                select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == acao)
                .order_by(EventoAuditoriaRegistro.id.desc())
            ).first()

    # --------------------------------------------------- 3.1 alteração do Narrador

    def test_previa_anuncia_mudanca_de_faixa_sem_gravar(self):
        self.definir(desgaste={"exaustao": 8, "estresse": 0})
        previa = self.client.post(f"{BASE}/lia/desgaste/previa", json={"trilha": "exaustao", "delta": 1}).json()
        self.assertEqual((previa["antes"], previa["depois"], previa["mudou_faixa"]), (8, 9, True))
        self.assertEqual((previa["faixa_antes"]["nome"], previa["faixa_depois"]["nome"]), ("Cansado", "Exausto"))
        self.assertEqual(self.versao(), 0)

    def test_previa_sem_mudanca_de_faixa(self):
        self.definir(desgaste={"exaustao": 0, "estresse": 8})
        previa = self.client.post(f"{BASE}/lia/desgaste/previa", json={"trilha": "estresse", "delta": -1}).json()
        self.assertEqual((previa["depois"], previa["mudou_faixa"], previa["faixa_depois"]["nome"]), (7, False, "Abalado"))

    def test_narrador_altera_com_origem_e_evento(self):
        resposta = self.alterar(delta=2, justificativa="Dois dias sem descanso")
        self.assertEqual(resposta.status_code, 201, resposta.text)
        corpo = resposta.json()
        self.assertEqual(corpo["versao"], 1)
        self.assertEqual(corpo["trilhas"][0]["atual"], 2)
        self.assertEqual(self.gravada()["desgaste"], {"exaustao": 2, "estresse": 0})
        self.assertNotIn("historico_desgaste", self.gravada())
        evento = self.evento("desgaste.alterado")
        self.assertIn("Exaustão 0 → 2", evento.resumo)
        self.assertIn("Marcha forçada", evento.resumo)
        self.assertEqual(evento.detalhes["origem"]["nome"], "Marcha forçada")

    def test_ficha_sem_desgaste_vale_zero_e_nao_ganha_chave_ao_ler(self):
        trilhas = self.client.get(f"{BASE}/lia/desgaste").json()
        self.assertEqual([(t["atual"], t["registrado"]) for t in trilhas], [(0, False), (0, False)])
        self.assertNotIn("desgaste", self.gravada())

    def test_origem_obrigatoria(self):
        resposta = self.alterar(origem={"tipo": "mestre", "nome": ""})
        self.assertEqual(resposta.status_code, 422)

    def test_jogador_nao_altera_trilha(self):
        self.ator = "ana"
        self.assertEqual(self.alterar().status_code, 403)

    def test_chegar_a_15_e_colapso_sem_consequencia_obrigatoria(self):
        self.definir(desgaste={"exaustao": 13, "estresse": 0})
        resposta = self.alterar(delta=3)
        self.assertEqual(resposta.status_code, 201, resposta.text)
        previa = resposta.json()["previa"]
        self.assertEqual((previa["depois"], previa["colapso_fisico"], previa["excedente_fisico"]), (15, True, False))
        self.assertEqual(self.consequencias(), [])

    def test_excedente_em_15_registra_no_maximo_uma_consequencia_fisica(self):
        self.definir(desgaste={"exaustao": 15, "estresse": 0})
        self.assertEqual(self.alterar().status_code, 422)
        resposta = self.alterar(consequencia_excedente=FRATURA)
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertEqual(self.gravada()["desgaste"]["exaustao"], 15)
        [fratura] = self.consequencias()
        self.assertEqual((fratura["categoria"], fratura["origem"]["nome"]), ("ferimento_grave", "Marcha forçada"))
        self.assertEqual(self.alterar(consequencia_excedente={**TRAUMA}).status_code, 422)

    def test_consequencia_de_excedente_fora_do_limite_e_recusada(self):
        self.definir(desgaste={"exaustao": 10, "estresse": 0})
        self.assertEqual(self.alterar(consequencia_excedente=FRATURA).status_code, 422)

    def test_colapso_mental_exige_manifestacao_e_trauma(self):
        self.definir(desgaste={"exaustao": 0, "estresse": 8})
        self.assertEqual(self.alterar("estresse", 2).status_code, 422)
        resposta = self.alterar("estresse", 2, colapso_mental={"manifestacao": "Fugir", "trauma": TRAUMA})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        corpo = resposta.json()
        self.assertTrue(corpo["previa"]["colapso_mental"])
        [trauma] = corpo["consequencias"]
        self.assertEqual((trauma["nome"], trauma["intensidade"], trauma["origem"]["nome"]),
                         ("Medo do Abismo", 1, "Poço de Varn"))
        self.assertIn("Fugir", trauma["historico"][-1]["justificativa"])
        self.assertIn("Colapso Mental: Fugir", self.evento("desgaste.alterado").resumo)

    def test_trauma_sem_gatilho_e_recusado(self):
        self.definir(desgaste={"exaustao": 0, "estresse": 9})
        sem_gatilho = {**TRAUMA, "gatilho": ""}
        resposta = self.alterar("estresse", 1, colapso_mental={"manifestacao": "Paralisar", "trauma": sem_gatilho})
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("gatilho", resposta.text)

    def test_colapso_equivalente_intensifica_em_vez_de_duplicar(self):
        self.definir(desgaste={"exaustao": 0, "estresse": 9})
        self.alterar("estresse", 1, colapso_mental={"manifestacao": "Fugir", "trauma": TRAUMA})
        self.definir(desgaste={"exaustao": 0, "estresse": 9})
        resposta = self.alterar("estresse", 1, colapso_mental={"manifestacao": "Dissociar", "trauma": TRAUMA})
        [trauma] = resposta.json()["consequencias"]
        self.assertEqual(trauma["intensidade"], 2)

    def test_colapso_pode_intensificar_trauma_escolhido(self):
        self.definir(desgaste={"exaustao": 0, "estresse": 9})
        [trauma] = self.alterar("estresse", 1, colapso_mental={"manifestacao": "Fugir", "trauma": TRAUMA}).json()["consequencias"]
        self.definir(desgaste={"exaustao": 0, "estresse": 9})
        resposta = self.alterar("estresse", 1, origem={"tipo": "magia", "nome": "Grito do Vazio"},
                                colapso_mental={"manifestacao": "Render-se", "trauma_id": trauma["id"]})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertEqual(resposta.json()["consequencias"][0]["intensidade"], 2)

    def test_colapso_mental_fora_do_colapso_e_recusado(self):
        resposta = self.alterar("estresse", 1, colapso_mental={"manifestacao": "Fugir", "trauma": TRAUMA})
        self.assertEqual(resposta.status_code, 422)

    # ----------------------------------------------------------- 3.2 esforço

    def test_dono_usa_esforco_fisico_com_movimento(self):
        self.ator = "ana"
        resposta = self.esforco(pontos=3, bonus_movimento=1)
        self.assertEqual(resposta.status_code, 201, resposta.text)
        previa = resposta.json()["previa"]
        self.assertEqual((previa["bonus_teste"], previa["bonus_movimento"], previa["depois"]), (2, 1, 3))
        self.assertIn("Esforço físico em Saltar o fosso (+2 no teste, +1 m de Movimento)",
                      self.evento("desgaste.esforco").resumo)

    def test_ultimo_esforco_leva_ao_colapso_fisico(self):
        self.ator = "ana"
        self.definir(desgaste={"exaustao": 14, "estresse": 0})
        resposta = self.esforco()
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertTrue(resposta.json()["previa"]["colapso_fisico"])
        self.assertEqual(self.esforco().status_code, 422)  # em 15 não há novo esforço

    def test_esforco_mental_bloqueado_a_partir_de_9(self):
        self.ator = "ana"
        self.definir(desgaste={"exaustao": 0, "estresse": 9})
        resposta = self.esforco("mental")
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("À Beira", resposta.text)

    def test_esforco_mental_ate_o_colapso_registra_trauma(self):
        self.ator = "ana"
        self.definir(desgaste={"exaustao": 0, "estresse": 8})
        self.assertEqual(self.esforco("mental", 2).status_code, 422)
        resposta = self.esforco("mental", 2, colapso_mental={"manifestacao": "Paralisar", "trauma": TRAUMA})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        corpo = resposta.json()
        self.assertEqual((corpo["previa"]["bonus_teste"], corpo["trilhas"][1]["atual"]), (2, 10))
        self.assertEqual(len(corpo["consequencias"]), 1)

    def test_distribuicao_invalida_e_recusada(self):
        self.ator = "ana"
        self.assertEqual(self.esforco(pontos=1, bonus_movimento=2).status_code, 422)

    def test_quem_nao_controla_o_personagem_nao_usa_esforco(self):
        self.ator = "bia"
        self.assertIn(self.esforco().status_code, {403, 404})

    # ------------------------------------------------ 3.3 fim do Colapso Mental

    def test_encerrar_colapso_volta_a_8_e_mantem_trauma(self):
        self.definir(desgaste={"exaustao": 0, "estresse": 9})
        self.alterar("estresse", 1, colapso_mental={"manifestacao": "Fugir", "trauma": TRAUMA})
        self.ator = "ana"
        corpo = {"motivo": "Fim do combate", "versao_esperada": self.versao()}
        self.assertEqual(self.client.post(f"{BASE}/lia/desgaste/colapso-mental/encerrar", json=corpo).status_code, 403)
        self.ator = "mestre"
        resposta = self.client.post(f"{BASE}/lia/desgaste/colapso-mental/encerrar", json=corpo)
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(resposta.json()["trilhas"][1]["atual"], 8)
        self.assertEqual(resposta.json()["consequencias"][0]["tratamento"]["estado"], "ativo")
        repetido = {"motivo": "De novo", "versao_esperada": self.versao()}
        self.assertEqual(self.client.post(f"{BASE}/lia/desgaste/colapso-mental/encerrar", json=repetido).status_code, 422)

    # -------------------------------------------- 3.4 exclusividade e correção

    def test_jogador_nao_altera_desgaste_pela_ficha(self):
        self.ator = "ana"
        nova = {**self.gravada(), "desgaste": {"exaustao": 0, "estresse": 0}, "consequencias": []}
        nova["desgaste"]["estresse"] = 0
        comando = {"id": "c1", "mesa_id": "mesa", "ator_id": "ana", "versao_esperada": 0, "personagem_id": "lia",
                   "ficha": {**nova, "desgaste": {"exaustao": 3, "estresse": 0}}}
        resposta = self.client.put(f"{BASE}/lia/ficha", json=comando)
        self.assertEqual(resposta.status_code, 403)
        self.assertIn("Exaustão e Estresse", resposta.text)

    def test_correcao_reverte_trilha_e_trauma_juntos(self):
        self.definir(desgaste={"exaustao": 0, "estresse": 9})
        self.alterar("estresse", 1, colapso_mental={"manifestacao": "Fugir", "trauma": TRAUMA})
        evento = self.evento("desgaste.alterado")
        resposta = self.client.post(f"/mesas/mesa/auditoria/{evento.id}/correcao",
                                    json={"motivo": "Lançado por engano", "versao_esperada": self.versao()})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertEqual(self.gravada()["desgaste"]["estresse"], 9)
        self.assertEqual(self.consequencias(), [])

    def test_correcao_bloqueada_apos_alteracao_posterior(self):
        self.alterar(delta=2)
        primeiro = self.evento("desgaste.alterado")
        self.alterar(delta=1)
        resposta = self.client.post(f"/mesas/mesa/auditoria/{primeiro.id}/correcao",
                                    json={"motivo": "Engano", "versao_esperada": self.versao()})
        self.assertEqual(resposta.status_code, 409)
        self.assertEqual(self.gravada()["desgaste"]["exaustao"], 3)

    def corrigir(self, evento_id: int):
        return self.client.post(f"/mesas/mesa/auditoria/{evento_id}/correcao",
                                json={"motivo": "Engano", "versao_esperada": self.versao()})

    def test_evento_com_dependente_posterior_nao_e_desfeito_direto(self):
        self.definir(desgaste={"exaustao": 13, "estresse": 0})
        self.alterar(delta=2)
        colapso = self.evento("desgaste.alterado")
        self.alterar(consequencia_excedente=FRATURA)  # só existe porque a Exaustão chegou a 15
        excedente = self.evento("desgaste.alterado")
        resposta = self.corrigir(colapso.id)
        self.assertEqual(resposta.status_code, 409)
        self.assertIn("alteração posterior", resposta.text)
        self.assertEqual(self.corrigir(excedente.id).status_code, 201)
        self.assertEqual(self.consequencias(), [])
        self.assertEqual(self.corrigir(colapso.id).status_code, 201)
        self.assertEqual(self.gravada()["desgaste"]["exaustao"], 13)

    # ------------------------------------------------ 4.1 consequências

    def criar(self, dados=None, **corpo):
        return self.client.post(f"{BASE}/lia/consequencias", json={
            "consequencia": dados or FRATURA, "justificativa": "Queda no desfiladeiro",
            "versao_esperada": self.versao(), **corpo})

    def transicionar(self, consequencia_id, acao, justificativa="Decisão do Narrador"):
        return self.client.post(f"{BASE}/lia/consequencias/{consequencia_id}/{acao}",
                                json={"justificativa": justificativa, "versao_esperada": self.versao()})

    def test_criar_exige_campos_minimos_e_justificativa(self):
        self.assertEqual(self.criar({**FRATURA, "tratamento_regra": ""}).status_code, 422)
        self.assertEqual(self.criar(justificativa="").status_code, 422)
        self.assertEqual(self.criar({**TRAUMA, "gatilho": None}).status_code, 422)
        resposta = self.criar()
        self.assertEqual(resposta.status_code, 201, resposta.text)
        consequencia = resposta.json()["consequencia"]
        self.assertEqual((consequencia["origem"]["nome"], consequencia["tratamento"]["regra"]),
                         ("Narrador", "Estabilizar e repousar uma semana."))
        self.assertEqual(consequencia["historico"][-1]["justificativa"], "Queda no desfiladeiro")

    def test_criar_equivalente_intensifica(self):
        self.criar(TRAUMA)
        resposta = self.criar(TRAUMA)
        self.assertEqual(len(resposta.json()["consequencias"]), 1)
        self.assertEqual(resposta.json()["consequencia"]["intensidade"], 2)
        self.assertIsNotNone(self.evento("consequencia.intensificada"))

    def test_ciclo_de_administracao(self):
        consequencia_id = self.criar().json()["consequencia"]["id"]
        editada = self.client.patch(f"{BASE}/lia/consequencias/{consequencia_id}", json={
            "efeito": "Não pode Correr nem saltar.", "progresso": 1, "objetivo": 3,
            "justificativa": "Correção após a cena", "versao_esperada": self.versao()})
        self.assertEqual(editada.status_code, 200, editada.text)
        dados = editada.json()["consequencia"]
        self.assertEqual((dados["efeito_atual"], dados["tratamento"]["progresso"], dados["tratamento"]["objetivo"]),
                         ("Não pode Correr nem saltar.", 1, 3))
        self.assertEqual(self.transicionar(consequencia_id, "intensificar").json()["consequencia"]["intensidade"], 2)
        for acao, estado in (("iniciar_tratamento", "em_tratamento"), ("mitigar", "mitigado"),
                             ("encerrar", "encerrado"), ("reativar", "ativo")):
            resposta = self.transicionar(consequencia_id, acao)
            self.assertEqual(resposta.status_code, 200, resposta.text)
            self.assertEqual(resposta.json()["consequencia"]["tratamento"]["estado"], estado)
        self.assertEqual(self.transicionar(consequencia_id, "reativar").status_code, 422)
        self.assertEqual(self.transicionar(consequencia_id, "encerrar", justificativa="").status_code, 422)
        removida = self.transicionar(consequencia_id, "remover")
        self.assertEqual((removida.json()["consequencia"], removida.json()["consequencias"]), (None, []))
        self.assertIsNotNone(self.evento("consequencia.removida"))

    def test_reduzir_trilhas_nao_encerra_consequencias(self):
        self.definir(desgaste={"exaustao": 9, "estresse": 0})
        self.criar()
        self.alterar(delta=-9)
        [fratura] = self.consequencias()
        self.assertEqual(fratura["tratamento"]["estado"], "ativo")

    def test_jogador_le_mas_nao_administra(self):
        consequencia_id = self.criar().json()["consequencia"]["id"]
        self.ator = "ana"
        self.assertEqual(len(self.consequencias()), 1)
        self.assertEqual(self.criar().status_code, 403)
        self.assertEqual(self.transicionar(consequencia_id, "encerrar").status_code, 403)

    def test_consequencia_inexistente(self):
        self.assertEqual(self.transicionar("nao-existe", "encerrar").status_code, 404)

    # --------------------------------------------- 4.2 penalidades nos totais

    def fontes_esquiva(self) -> list[tuple[str, float]]:
        valores = self.client.get(f"{BASE}/lia/valores-derivados").json()
        esquiva = next(v for v in valores if v["chave"] == "defesa:esquiva")
        return [(f["descricao"], f["valor"]) for f in esquiva["fontes"] if f["tipo"] == "efeito"]

    def test_exausto_reduz_defesas_como_fonte_identificada(self):
        self.assertEqual(self.fontes_esquiva(), [])
        self.definir(desgaste={"exaustao": 9, "estresse": 0})
        self.assertEqual(self.fontes_esquiva(), [("Exausto (Exaustão)", -1)])
        valores = self.client.get(f"{BASE}/lia/valores-derivados").json()
        armadura = next(v for v in valores if v["chave"] == "defesa:armadura")
        self.assertIn(("Exausto (Exaustão)", -1), [(f["descricao"], f["valor"]) for f in armadura["fontes"]])
        self.definir(desgaste={"exaustao": 12, "estresse": 0})
        self.assertEqual(self.fontes_esquiva(), [])
        self.assertNotIn("consequencias", self.gravada())
        self.assertEqual([e["id"] for e in self.client.get(f"{BASE}/lia/efeitos").json()], [])


if __name__ == "__main__":
    unittest.main()
