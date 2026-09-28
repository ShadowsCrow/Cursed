"""Prévia de criação e criação com a ficha completa do assistente (tarefas 2.2 e 2.4 de criacao-guiada-e-nova-estetica)."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform import catalogos
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

ATRIBUTOS = {"Força": 1, "Destreza": 2, "Vigor": 2, "Carisma": 1, "Manipulação": 1,
             "Proposito": 2, "Percepção": 1, "Inteligência": 3, "Raciocínio": 2}
PERICIAS = {"Arcanismo": 3, "Acadêmicos": 2, "Investigação": 2, "Prontidão": 2,
            "Ocultismo": 1, "Linguistica": 1, "Medicina": 1, "Esquiva": 1, "Briga": 0}
# Ficha como o assistente a monta: sem nível, PV/PP nem cartas.
FICHA_ASSISTENTE = {
    "personagem": {"nome": "Lia", "idade": 120, "sexo": "Feminino", "raca": "Elfo",
                   "classe": "Mago", "arquetipo": "Mutante Arcano"},
    "atributos": {"valores": ATRIBUTOS},
    "pericias": {"valores": PERICIAS},
    "personalidade": {"alinhamento": "Neutro | Bom", "pecado": "Orgulho", "vivo_para": "Decifrar as runas"},
}
PREVIA = "/mesas/mesa/personagens/previa"


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

    def contagens(self) -> tuple[int, int, int]:
        with Session(self.engine) as session:
            return tuple(session.scalar(select(func.count()).select_from(modelo)) for modelo in (
                PersonagemRegistro, CartaPersonagemRegistro, EventoAuditoriaRegistro))

    def permitir_criacao(self, permitir: bool) -> None:
        with Session(self.engine) as session:
            session.get(MesaRegistro, "mesa").permitir_criacao_propria = permitir
            session.commit()


class ApiPreviaCriacaoTest(_Base):
    def test_previa_valida_com_valores_e_fontes(self):
        resposta = self.client.post(PREVIA, json={"ficha": FICHA_ASSISTENTE})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        self.assertEqual(corpo["problemas"], [])
        valores = {v["chave"]: v for v in corpo["valores"]}
        self.assertEqual([valores[f"recurso:{n}"]["total"] for n in ("pv_maximo", "escala_pv", "pp_maximo", "escala_pp")],
                         [14, 4, 10, 7])
        self.assertEqual([(f["tipo"], f["valor"]) for f in valores["recurso:pv_maximo"]["fontes"]],
                         [("classe", 12), ("atributo", 2)])

    def test_previa_sem_classe_nao_e_calculavel(self):
        ficha = {**FICHA_ASSISTENTE, "personagem": {"nome": "Lia"}}
        valores = {v["chave"]: v for v in self.client.post(PREVIA, json={"ficha": ficha}).json()["valores"]}
        self.assertEqual((valores["recurso:pv_maximo"]["calculavel"], valores["recurso:pv_maximo"]["total"]), (False, None))
        self.assertEqual(valores["recurso:pp_maximo"]["motivo"], "Classe não definida.")

    def test_arquetipo_de_outra_classe_vira_problema_por_campo(self):
        ficha = {**FICHA_ASSISTENTE, "personagem": {**FICHA_ASSISTENTE["personagem"], "arquetipo": "Assassino"}}
        resposta = self.client.post(PREVIA, json={"ficha": ficha})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(resposta.json()["problemas"], [{
            "campo": "personagem.arquetipo", "mensagem": 'O arquétipo "Assassino" não pertence à classe Mago.'}])

    def test_nome_vazio_vira_problema_e_nao_erro(self):
        ficha = {**FICHA_ASSISTENTE, "personagem": {**FICHA_ASSISTENTE["personagem"], "nome": " "}}
        problemas = self.client.post(PREVIA, json={"ficha": ficha}).json()["problemas"]
        self.assertIn({"campo": "personagem.nome", "mensagem": "Nome do personagem obrigatório."}, problemas)

    def test_sem_permissao_recusa_igual_a_criacao(self):
        self.permitir_criacao(False)
        criar = self.client.post("/mesas/mesa/personagens", json={"ficha": FICHA_ASSISTENTE})
        previa = self.client.post(PREVIA, json={"ficha": FICHA_ASSISTENTE})
        self.assertEqual(criar.status_code, 403)
        self.assertEqual((previa.status_code, previa.json()), (criar.status_code, criar.json()))
        self.ator = "estranho"
        criar = self.client.post("/mesas/mesa/personagens", json={"ficha": FICHA_ASSISTENTE})
        previa = self.client.post(PREVIA, json={"ficha": FICHA_ASSISTENTE})
        self.assertEqual((previa.status_code, previa.json()), (criar.status_code, criar.json()))

    def test_nivel_informado_pelo_jogador_e_recusado_como_na_criacao(self):
        ficha = {**FICHA_ASSISTENTE, "personagem": {**FICHA_ASSISTENTE["personagem"], "nivel": 5}}
        criar = self.client.post("/mesas/mesa/personagens", json={"ficha": ficha})
        previa = self.client.post(PREVIA, json={"ficha": ficha})
        self.assertEqual(criar.status_code, 403)
        self.assertEqual((previa.status_code, previa.json()), (criar.status_code, criar.json()))

    def test_varias_previas_nao_gravam_nada(self):
        antes = self.contagens()
        for _ in range(3):
            self.assertEqual(self.client.post(PREVIA, json={"ficha": FICHA_ASSISTENTE}).status_code, 200)
        self.assertEqual(self.contagens(), antes)
        self.assertEqual(self.client.get("/mesas/mesa/personagens").json(), [])


class ApiCriacaoPeloAssistenteTest(_Base):
    def test_ficha_completa_cria_no_nivel_1_com_recursos_cheios_e_cartas(self):
        resposta = self.client.post("/mesas/mesa/personagens", json={"ficha": FICHA_ASSISTENTE})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        personagem_id = resposta.json()["personagem_id"]
        ficha = self.client.get(f"/mesas/mesa/personagens/{personagem_id}/ficha").json()["ficha"]
        self.assertEqual(ficha["personagem"]["nivel"], 1)
        for campo in ("nome", "idade", "sexo", "raca", "classe", "arquetipo"):
            self.assertEqual(ficha["personagem"][campo], FICHA_ASSISTENTE["personagem"][campo])
        self.assertEqual(ficha["atributos"]["valores"], ATRIBUTOS)
        self.assertEqual(ficha["pericias"]["valores"], PERICIAS)
        for campo, valor in FICHA_ASSISTENTE["personalidade"].items():
            self.assertEqual(ficha["personalidade"][campo], valor)
        self.assertEqual((ficha["recursos"]["pv"]["atual"], ficha["recursos"]["pp"]["atual"]), (14, 10))

        catalogo = catalogos.ler()
        mago, elfo = catalogo.classe("Mago"), catalogo.raca("Elfo")
        esperado = sorted([h.nome for h in mago.habilidades]
                          + [h.nome for h in mago.arquetipo("Mutante Arcano").habilidades]
                          + [h.nome for h in elfo.habilidades])
        with Session(self.engine) as session:
            posses = session.scalars(select(CartaPersonagemRegistro).where(
                CartaPersonagemRegistro.personagem_id == personagem_id))
            titulos = sorted((session.get(CartaVersaoRegistro, p.versao_id).conteudo["titulo"], p.estado) for p in posses)
        self.assertEqual(titulos, [(nome, "aprendida") for nome in esperado])


if __name__ == "__main__":
    unittest.main()


def _ficha(**personagem):
    return {**FICHA_ASSISTENTE, "personagem": {**FICHA_ASSISTENTE["personagem"], **personagem}}


class ApiAlturaETamanhoTest(_Base):
    """Altura e Tamanho fora da média (tarefa 8.3, design D12)."""

    def problemas(self, **personagem) -> list[dict]:
        resposta = self.client.post(PREVIA, json={"ficha": _ficha(**personagem)})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return resposta.json()["problemas"]

    def criar(self, **personagem):
        return self.client.post("/mesas/mesa/personagens", json={"ficha": _ficha(**personagem)})

    def test_catalogos_expoem_intervalos_e_faixas(self):
        racas = {r["nome"]: r for r in self.client.get("/mesas/mesa/catalogos/racas").json()}
        self.assertEqual(racas["Humano"]["altura"], {"minima": 1.55, "maxima": 1.9})
        faixas = self.client.get("/mesas/mesa/catalogos/listas-ficha").json()["faixas_de_altura"]
        self.assertEqual([f["tamanho"] for f in faixas], ["Minúsculo", "Pequeno", "Médio", "Grande", "Enorme", "Colossal"])
        self.assertEqual(faixas[-1], {"tamanho": "Colossal", "minima": 5.0, "maxima": None})

    def test_humano_na_media(self):
        self.assertEqual(self.problemas(raca="Humano", altura=1.75), [])
        criado = self.criar(raca="Humano", altura=1.75)
        self.assertEqual(criado.status_code, 201, criado.text)
        personagem = criado.json()["ficha"]["personagem"]
        self.assertEqual(personagem["altura"], 1.75)
        self.assertNotIn("tamanho", personagem)

    def test_altura_fora_do_intervalo_da_raca(self):
        problemas = self.problemas(raca="Humano", altura=2.2)
        self.assertEqual([p["campo"] for p in problemas], ["personagem.altura"])
        self.assertIn("de 1,55 m a 1,90 m", problemas[0]["mensagem"])
        self.assertIn("fora da média", problemas[0]["mensagem"])
        self.assertEqual(self.criar(raca="Humano", altura=2.2).status_code, 422)

    def test_humano_mais_alto_vira_grande_e_a_grade_acompanha(self):
        self.assertEqual(self.problemas(raca="Humano", tamanho="Grande", altura=2.3), [])
        criado = self.criar(raca="Humano", tamanho="Grande", altura=2.3)
        self.assertEqual(criado.status_code, 201, criado.text)
        personagem_id = criado.json()["personagem_id"]
        ficha = self.client.get(f"/mesas/mesa/personagens/{personagem_id}/ficha").json()
        self.assertEqual((ficha["ficha"]["personagem"]["tamanho"], ficha["ficha"]["personagem"]["altura"]), ("Grande", 2.3))
        self.assertEqual(ficha["avisos"], [])
        grade = self.client.get(f"/mesas/mesa/personagens/{personagem_id}/inventario/grade").json()
        self.assertEqual((grade["tamanho"], grade["tamanho_origem"], grade["colunas_verdes"]), ("grande", "ficha", 7))
        # Deslocamento continua o da raça: nada na ficha o altera.
        self.assertNotIn("deslocamento", ficha["ficha"]["personagem"])

    def test_fora_da_media_usa_a_faixa_do_novo_tamanho(self):
        problemas = self.problemas(raca="Humano", tamanho="Grande", altura=1.8)
        self.assertEqual(problemas, [{"campo": "personagem.altura",
                                      "mensagem": "A altura de um personagem Grande vai de 2,10 m a 3,00 m."}])
        self.assertEqual(self.problemas(raca="Humano", tamanho="Pequeno", altura=1.2), [])
        self.assertEqual(self.problemas(raca="Gnomo", tamanho="Minúsculo", altura=0.5), [])

    def test_colossal_sem_teto(self):
        self.assertEqual(self.problemas(raca="Golias", tamanho="Colossal", altura=12), [])
        self.assertEqual(self.criar(raca="Golias", tamanho="Colossal", altura=12).status_code, 201)

    def test_tamanho_a_dois_passos_e_recusado(self):
        problemas = self.problemas(raca="Humano", tamanho="Enorme")
        self.assertEqual([p["campo"] for p in problemas], ["personagem.tamanho"])
        self.assertIn("um passo acima ou abaixo do Tamanho da raça (Médio): Pequeno ou Grande", problemas[0]["mensagem"])
        resposta = self.criar(raca="Humano", tamanho="Enorme")
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("personagem.tamanho", {p["campo"] for p in resposta.json()["detail"]["problemas"]})

    def test_tamanho_igual_ao_da_raca_nao_vira_excecao(self):
        criado = self.criar(raca="Humano", tamanho="Médio", altura=1.7)
        self.assertEqual(criado.status_code, 201, criado.text)
        self.assertNotIn("tamanho", criado.json()["ficha"]["personagem"])

    def test_depois_de_criado_o_tamanho_continua_do_narrador(self):
        personagem_id = self.criar(raca="Humano", tamanho="Grande", altura=2.3).json()["personagem_id"]
        caminho = f"/mesas/mesa/personagens/{personagem_id}/ficha"
        ficha = self.client.get(caminho).json()["ficha"]
        ficha["personagem"]["tamanho"] = "Médio"
        resposta = self.client.put(caminho, json={"id": "c", "mesa_id": "mesa", "ator_id": "ana",
                                                  "personagem_id": personagem_id, "versao_esperada": 0, "ficha": ficha})
        self.assertEqual(resposta.status_code, 403)
        ficha["personagem"]["tamanho"] = "Grande"
        ficha["personagem"]["altura"] = 2.6
        resposta = self.client.put(caminho, json={"id": "c2", "mesa_id": "mesa", "ator_id": "ana",
                                                  "personagem_id": personagem_id, "versao_esperada": 0, "ficha": ficha})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        ficha["personagem"]["altura"] = 4
        resposta = self.client.put(caminho, json={"id": "c3", "mesa_id": "mesa", "ator_id": "ana",
                                                  "personagem_id": personagem_id, "versao_esperada": 1, "ficha": ficha})
        self.assertEqual(resposta.status_code, 422)

    def test_altura_invalida(self):
        for valor in (0, -1, "alto", True):
            self.assertEqual([p["campo"] for p in self.problemas(raca="Humano", altura=valor)], ["personagem.altura"], valor)
