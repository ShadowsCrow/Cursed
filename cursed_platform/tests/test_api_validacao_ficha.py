"""Validação da ficha nos caminhos de gravação da API (tarefa 4.3 de calcular-valores-da-ficha)."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import (
    Base, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro, PedidoAlteracaoRegistro, PersonagemRegistro,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

FICHA = {
    "personagem": {"nome": "Lia", "classe": "Mago", "arquetipo": "Mutante Arcano", "raca": "Elfo", "nivel": 1},
    "personalidade": {"alinhamento": "Neutro | Bom", "pecado": "Orgulho", "meu_lema": "Adiante"},
    "atributos": {"valores": {"Força": 1, "Destreza": 2, "Vigor": 3, "Proposito": 2}, "ajustes": {}},
    "pericias": {"valores": {"Furtividade": 2}, "ajustes": {}},
}
BASE = "/mesas/mesa/personagens"


class _ApiFicha(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        irregular = deepcopy(FICHA)
        irregular["atributos"]["valores"]["Força"] = 0
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre",
                                     campos_exigem_aprovacao=["atributos.valores.Destreza"]))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana", versao=0, ficha=deepcopy(FICHA)),
                PersonagemRegistro(id="velha", mesa_id="mesa", proprietario_id="ana", versao=0, ficha=irregular),
            ])
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

    def gravar(self, personagem_id: str, alterar, versao: int = 0):
        ficha = self.client.get(f"{BASE}/{personagem_id}/ficha").json()["ficha"]
        alterar(ficha)
        return self.client.put(f"{BASE}/{personagem_id}/ficha", json={
            "id": "cmd", "mesa_id": "mesa", "ator_id": self.ator, "personagem_id": personagem_id,
            "versao_esperada": versao, "ficha": ficha,
        })

    def ficha(self, personagem_id: str) -> dict:
        with Session(self.engine) as session:
            return session.get(PersonagemRegistro, personagem_id).ficha


class ApiValidacaoFichaTest(_ApiFicha):
    def test_edicao_direta_fora_do_limite_e_recusada_com_o_campo(self):
        resposta = self.gravar("lia", lambda f: f["atributos"]["valores"].update(Força=0))
        self.assertEqual(resposta.status_code, 422)
        [problema] = resposta.json()["detail"]["problemas"]
        self.assertEqual(problema["campo"], "atributos.valores.Força")
        self.assertIn("1 a 5", problema["mensagem"])
        self.assertEqual(self.ficha("lia")["atributos"]["valores"]["Força"], 1)

    def test_ficha_irregular_aceita_gravar_outro_campo(self):
        resposta = self.gravar("velha", lambda f: f["personalidade"].update(meu_lema="Nunca recuar"))
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(self.ficha("velha")["atributos"]["valores"]["Força"], 0)

    def test_pedido_do_jogador_com_valor_invalido_nem_chega_a_ser_criado(self):
        resposta = self.gravar("lia", lambda f: f["atributos"]["valores"].update(Destreza=9))
        self.assertEqual(resposta.status_code, 422)
        with Session(self.engine) as session:
            self.assertEqual(session.query(PedidoAlteracaoRegistro).count(), 0)

    def test_pedido_aprovado_com_destreza_9_e_recusado_e_continua_pendente(self):
        proposta = deepcopy(FICHA)
        proposta["atributos"]["valores"]["Destreza"] = 9
        with Session(self.engine) as session:
            session.add(PedidoAlteracaoRegistro(
                id="pedido", mesa_id="mesa", personagem_id="lia", solicitante_id="ana", versao_base=0,
                ficha_proposta=proposta, campos_alterados=["atributos.valores.Destreza"], estado="pendente",
            ))
            session.commit()
        self.ator = "mestre"
        resposta = self.client.post("/mesas/mesa/solicitacoes/pedido/decisao", json={"aprovar": True})
        self.assertEqual(resposta.status_code, 422)
        self.assertEqual(resposta.json()["detail"]["problemas"][0]["campo"], "atributos.valores.Destreza")
        with Session(self.engine) as session:
            self.assertEqual(session.get(PedidoAlteracaoRegistro, "pedido").estado, "pendente")
            self.assertEqual(session.get(PersonagemRegistro, "lia").ficha["atributos"]["valores"]["Destreza"], 2)
        # Rejeitar continua possível.
        self.assertEqual(self.client.post("/mesas/mesa/solicitacoes/pedido/decisao", json={"aprovar": False}).status_code, 200)

    def test_personagem_novo_segue_o_catalogo(self):
        ficha = deepcopy(FICHA)
        ficha["personagem"]["raca"] = "Centauro"
        resposta = self.client.post(BASE, json={"ficha": ficha})
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("não existe no catálogo", resposta.json()["detail"]["problemas"][0]["mensagem"])
        self.assertEqual(self.client.post(BASE, json={"ficha": FICHA}).status_code, 201)

    def test_monstro_do_narrador_nao_e_recusado(self):
        self.ator = "mestre"
        ficha = {"personagem": {"nome": "Lobo Sombrio", "raca": "Lobo"}, "atributos": {"valores": {"Vigor": 6}}}
        resposta = self.client.post("/mesas/mesa/entidades", json={"tipo": "monstro", "ficha": ficha})
        self.assertEqual(resposta.status_code, 201, resposta.text)

    def test_personagem_do_narrador_segue_os_limites(self):
        self.ator = "mestre"
        ficha = deepcopy(FICHA)
        ficha["atributos"]["valores"]["Vigor"] = 6
        resposta = self.client.post("/mesas/mesa/entidades", json={"tipo": "personagem", "ficha": ficha})
        self.assertEqual(resposta.status_code, 422)


class CamposExclusivosDoNarradorTest(_ApiFicha):
    """Tarefa 4.4: nível, Tamanho atual e ajustes de PV/PP só pelo Narrador, antes da política da mesa."""

    def test_jogador_nao_altera_o_nivel_mesmo_com_edicao_liberada(self):
        resposta = self.gravar("lia", lambda f: f["personagem"].update(nivel=5))
        self.assertEqual(resposta.status_code, 403)
        self.assertIn("nível", resposta.json()["detail"])
        self.assertEqual(self.ficha("lia")["personagem"]["nivel"], 1)

    def test_jogador_nao_informa_tamanho_nem_ajustes(self):
        self.assertEqual(self.gravar("lia", lambda f: f["personagem"].update(tamanho="Grande")).status_code, 403)
        ajuste = [{"alvo": "pv_maximo", "valor": 3, "origem": "x", "justificativa": "y"}]
        self.assertEqual(self.gravar("lia", lambda f: f.setdefault("recursos", {}).update(ajustes=ajuste)).status_code, 403)

    def test_narrador_sobe_o_nivel(self):
        self.ator = "mestre"
        resposta = self.gravar("lia", lambda f: f["personagem"].update(nivel=5))
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(self.ficha("lia")["personagem"]["nivel"], 5)

    def test_personagem_novo_comeca_no_nivel_1_e_jogador_nao_escolhe_outro(self):
        criado = self.client.post(BASE, json={"ficha": {"personagem": {"nome": "Rui"}}})
        self.assertEqual(criado.status_code, 201, criado.text)
        self.assertEqual(criado.json()["ficha"]["personagem"]["nivel"], 1)
        self.assertEqual(self.client.post(BASE, json={"ficha": {"personagem": {"nome": "Rui", "nivel": 3}}}).status_code, 403)
        self.ator = "mestre"
        pelo_narrador = self.client.post("/mesas/mesa/entidades", json={
            "tipo": "personagem", "ficha": {"personagem": {"nome": "Veterana", "nivel": 7}}})
        self.assertEqual(pelo_narrador.status_code, 201, pelo_narrador.text)

    def test_grade_usa_a_excecao_e_depois_a_nova_raca_sem_valor_antigo(self):
        # carga-por-espacos 4.6: a exceção só vale enquanto confirmada para a raça atual.
        grade = lambda: self.client.get(f"{BASE}/lia/inventario/grade").json()  # noqa: E731
        self.assertEqual((grade()["tamanho"], grade()["tamanho_origem"]), ("medio", "raca"))
        self.ator = "mestre"
        self.gravar("lia", lambda f: f["personagem"].update(tamanho="Grande"))
        self.assertEqual((grade()["tamanho"], grade()["tamanho_origem"]), ("grande", "ficha"))
        self.assertEqual(self.gravar("lia", lambda f: f["personagem"].update(raca="Anão"), versao=1).status_code, 422)
        self.assertEqual(grade()["tamanho"], "grande")
        self.gravar("lia", lambda f: f["personagem"].update(raca="Anão", tamanho=""), versao=1)
        self.assertEqual((grade()["tamanho"], grade()["tamanho_origem"]), ("pequeno", "raca"))

    def test_nivel_da_migracao_avisa_ate_o_narrador_confirmar(self):
        with Session(self.engine) as session:
            lia = session.get(PersonagemRegistro, "lia")
            lia.ficha = {**lia.ficha, "personagem": {**lia.ficha["personagem"], "nivel_pela_migracao": True}}
            session.commit()
        avisos = {a["campo"]: a["mensagem"] for a in self.client.get(f"{BASE}/lia/ficha").json()["avisos"]}
        self.assertIn("migração", avisos["personagem.nivel"])
        self.assertEqual(self.gravar("lia", lambda f: f["personagem"].update(nivel_pela_migracao=False)).status_code, 403)
        self.ator = "mestre"
        confirmada = self.gravar("lia", lambda f: f["personagem"].update(nivel_pela_migracao=False))
        self.assertEqual(confirmada.status_code, 200, confirmada.text)
        self.assertNotIn("nivel_pela_migracao", self.ficha("lia")["personagem"])
        self.assertEqual(confirmada.json()["avisos"], [])

    def test_troca_de_raca_exige_limpar_ou_reconfirmar_o_tamanho(self):
        self.ator = "mestre"
        self.assertEqual(self.gravar("lia", lambda f: f["personagem"].update(tamanho="Grande")).status_code, 200)
        self.assertEqual(self.ficha("lia")["personagem"]["tamanho_raca"], "Elfo")

        silenciosa = self.gravar("lia", lambda f: f["personagem"].update(raca="Anão"), versao=1)
        self.assertEqual(silenciosa.status_code, 422)
        self.assertEqual(silenciosa.json()["detail"]["problemas"][0]["campo"], "personagem.tamanho")
        self.assertEqual(self.ficha("lia")["personagem"]["raca"], "Elfo")

        reconfirmada = self.gravar("lia", lambda f: f["personagem"].update(raca="Anão", tamanho_raca="Anão"), versao=1)
        self.assertEqual(reconfirmada.status_code, 200, reconfirmada.text)
        self.assertEqual(self.ficha("lia")["personagem"]["tamanho"], "Grande")

        limpa = self.gravar("lia", lambda f: f["personagem"].update(raca="Gnomo", tamanho=""), versao=2)
        self.assertEqual(limpa.status_code, 200, limpa.text)
        self.assertNotIn("tamanho_raca", self.ficha("lia")["personagem"])


class RecursosAtuaisTest(_ApiFicha):
    """Tarefa 4.5: o atual nunca passa do máximo recalculado; personagem novo começa cheio."""

    def pv(self, personagem_id: str) -> int | None:
        return ((self.ficha(personagem_id).get("recursos") or {}).get("pv") or {}).get("atual")

    def test_personagem_recem_criado_comeca_com_o_maximo(self):
        criado = self.client.post(BASE, json={"ficha": FICHA})
        self.assertEqual(criado.status_code, 201, criado.text)
        recursos = criado.json()["ficha"]["recursos"]
        self.assertEqual((recursos["pv"]["atual"], recursos["pp"]["atual"]), (15, 10))

    def test_subida_de_nivel_com_pv_gasto_nao_recupera(self):
        self.ator = "mestre"
        # Mago Vigor 3: PV máximo 15 no nível 1 e 35 no nível 5.
        self.assertEqual(self.gravar("lia", lambda f: f.update(recursos={"pv": {"atual": 10}})).status_code, 200)
        self.assertEqual(self.gravar("lia", lambda f: f["personagem"].update(nivel=5), versao=1).status_code, 200)
        self.assertEqual(self.pv("lia"), 10)

    def test_maximo_diminui_abaixo_do_atual(self):
        self.ator = "mestre"
        self.gravar("lia", lambda f: f["personagem"].update(nivel=5))
        self.gravar("lia", lambda f: f.update(recursos={"pv": {"atual": 33}}), versao=1)
        self.assertEqual(self.pv("lia"), 33)
        # Nível 4: PV máximo 30.
        resposta = self.gravar("lia", lambda f: f["personagem"].update(nivel=4), versao=2)
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(self.pv("lia"), 30)
        with Session(self.engine) as session:
            evento = session.query(EventoAuditoriaRegistro).order_by(EventoAuditoriaRegistro.id.desc()).first()
            campos = {m["campo"] for m in evento.detalhes["mudancas"]}
        self.assertTrue({"personagem.nivel", "recursos.pv.atual"} <= campos, campos)

    def test_jogador_nao_passa_do_maximo(self):
        self.assertEqual(self.gravar("lia", lambda f: f.update(recursos={"pv": {"atual": 99}})).status_code, 200)
        self.assertEqual(self.pv("lia"), 15)


if __name__ == "__main__":
    unittest.main()
