"""Acervo de personagens entre mesas e cópia independente (navegacao-inicial-e-perfil, tarefas 3.5 e 3.6)."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform import catalogos
from cursed_platform.config import PlatformSettings
from cursed_platform.domain import recursos
from cursed_platform.migracao_ativos import ArmazenamentoLocal
from cursed_platform.persistence import (
    Base, CartaPersonagemRegistro, EfeitoAplicadoRegistro, EventoAuditoriaRegistro, ItemInventarioRegistro,
    MembroRegistro, MesaRegistro, PersonagemRegistro,
)
from cursed_platform.tests.test_api_previa_criacao import FICHA_ASSISTENTE

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


def imagem() -> bytes:
    saida = BytesIO()
    Image.new("RGB", (64, 96), (90, 60, 30)).save(saida, "PNG")
    return saida.getvalue()


class ApiAcervoTest(unittest.TestCase):
    """Mesa A: mestre narra, ana joga. Mesa B: ana narra. Mesa C: estranho narra, ana foi removida."""

    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([
                MesaRegistro(id="a", nome="Sombras de Vigrad", narrador_id="mestre"),
                MesaRegistro(id="b", nome="A Queda de Ceynar", narrador_id="ana"),
                MesaRegistro(id="c", nome="Ordem", narrador_id="estranho"),
            ])
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="a", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="a", usuario_id="ana", papel="jogador"),
                MembroRegistro(mesa_id="b", usuario_id="ana", papel="narrador"),
                MembroRegistro(mesa_id="c", usuario_id="estranho", papel="narrador"),
                MembroRegistro(mesa_id="c", usuario_id="ana", papel="jogador", ativo=False),
            ])
            session.flush()
            session.add_all([
                PersonagemRegistro(id="lobo", mesa_id="a", tipo="monstro", visibilidade="narrador",
                                   ficha={"personagem": {"nome": "Lobo Cinzento"}}),
                PersonagemRegistro(id="velho", mesa_id="b", tipo="npc", visibilidade="mesa",
                                   ficha={"personagem": {"nome": "Velho Barqueiro"}}),
                PersonagemRegistro(id="sumido", mesa_id="b", tipo="npc", visibilidade="mesa",
                                   excluido_em=datetime.now(UTC), ficha={"personagem": {"nome": "Na lixeira"}}),
                PersonagemRegistro(id="antigo", mesa_id="c", proprietario_id="ana", tipo="personagem",
                                   ficha={"personagem": {"nome": "Antigo"}}),
            ])
            session.commit()
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine, armazenamento=ArmazenamentoLocal(pasta))
        self.ator = "ana"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)
        # Personagem da ana na mesa A, criado como pelo assistente, com retrato e estado de história.
        criado = self.client.post("/mesas/a/personagens", json={"ficha": deepcopy(FICHA_ASSISTENTE)})
        self.assertEqual(criado.status_code, 201, criado.text)
        self.caelren = criado.json()["personagem_id"]
        retrato = self.client.put("/mesas/a/imagens/retrato", data={"alvo": self.caelren, "versao_esperada": "0"},
                                  files={"arquivo": ("r.png", imagem())})
        self.assertEqual(retrato.status_code, 200, retrato.text)
        with Session(self.engine) as session:
            origem = session.get(PersonagemRegistro, self.caelren)
            ficha = deepcopy(origem.ficha)
            ficha["recursos"]["pv"]["atual"] = 1
            ficha["desgaste"] = {"exaustao": 2, "estresse": 3}
            ficha["consequencias"] = [{"categoria": "trauma", "nome": "Medo do escuro"}]
            ficha["efeitos_externos"] = [{"nome": "Bênção"}]
            ficha["armas"] = [{"nome": "Adaga"}]
            origem.ficha = ficha
            session.add(ItemInventarioRegistro(id="espada", mesa_id="a", personagem_id=self.caelren, tipo="arma",
                                               nome="Espada", quantidade=1, equipado=False, dados={}))
            session.add(EfeitoAplicadoRegistro(id="bencao", mesa_id="a", personagem_id=self.caelren, nome="Bênção",
                                               descricao="", versao=1, estado="ativo", conteudo={}))
            session.commit()
            self.ficha_origem = deepcopy(ficha)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def como(self, ator: str) -> TestClient:
        self.ator = ator
        return self.client

    def acervo(self, colecao: str, ator: str = "ana") -> list[dict]:
        resposta = self.como(ator).get("/acervo/personagens", params={"colecao": colecao})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return resposta.json()

    def copiar(self, destino: str, mesa_origem: str, personagem: str, ator: str = "ana"):
        return self.como(ator).post(f"/mesas/{destino}/personagens/copias",
                                    json={"mesa_origem_id": mesa_origem, "personagem_origem_id": personagem})

    # ------------------------------------------------------------------ acervo (3.5)

    def test_meus_traz_so_personagens_proprios_de_mesas_ativas(self):
        meus = self.acervo("meus")
        self.assertEqual([(p["nome"], p["mesa_nome"]) for p in meus], [("Lia", "Sombras de Vigrad")])
        lia = meus[0]
        self.assertEqual((lia["classe"], lia["arquetipo"], lia["raca"], lia["nivel"]),
                         ("Mago", "Mutante Arcano", "Elfo", 1))
        self.assertTrue(lia["retrato_objeto"].startswith(f"mesas/a/personagens/{self.caelren}/imagens/"))

    def test_npcs_e_monstros_so_de_mesas_narradas_e_fora_da_lixeira(self):
        self.assertEqual([p["nome"] for p in self.acervo("npcs")], ["Velho Barqueiro"])
        self.assertEqual(self.acervo("monstros"), [])
        self.assertEqual([p["nome"] for p in self.acervo("monstros", "mestre")], ["Lobo Cinzento"])
        self.assertEqual(self.acervo("npcs", "mestre"), [])
        self.assertEqual(self.acervo("meus", "mestre"), [])

    def test_pessoa_de_fora_nao_ve_nada_e_colecao_invalida_e_recusada(self):
        for colecao in ("meus", "npcs", "monstros"):
            self.assertEqual(self.acervo(colecao, "ninguem"), [])
        self.assertEqual(self.como("ana").get("/acervo/personagens", params={"colecao": "todos"}).status_code, 422)

    # ------------------------------------------------------------------ cópia (3.6)

    def test_personagem_proprio_vira_npc_oculto_independente(self):
        resposta = self.copiar("b", "a", self.caelren)
        self.assertEqual(resposta.status_code, 201, resposta.text)
        corpo = resposta.json()
        self.assertEqual((corpo["mesa_id"], corpo["tipo"], corpo["visibilidade"], corpo["proprietario_id"], corpo["nome"]),
                         ("b", "npc", "narrador", None, "Lia"))
        self.assertTrue(corpo["retrato_objeto"].startswith(f"mesas/b/personagens/{corpo['id']}/imagens/"))
        with Session(self.engine) as session:
            copia = session.get(PersonagemRegistro, corpo["id"])
            origem = session.get(PersonagemRegistro, self.caelren)
            ficha = copia.ficha
            maximos = recursos.calcular(ficha, catalogos.obter())
            self.assertEqual(ficha["recursos"]["pv"]["atual"], maximos.maximo("pv"))
            self.assertEqual(ficha["recursos"]["pp"]["atual"], maximos.maximo("pp"))
            self.assertGreater(maximos.maximo("pv"), 1)
            self.assertEqual(ficha["atributos"], self.ficha_origem["atributos"])
            self.assertEqual(ficha["pericias"], self.ficha_origem["pericias"])
            self.assertEqual(ficha["personalidade"], self.ficha_origem["personalidade"])
            self.assertNotIn("desgaste", ficha)
            self.assertNotIn("consequencias", ficha)
            self.assertEqual((ficha["efeitos_externos"], ficha["armas"]), ([], []))
            self.assertEqual(copia.procedencia["mesa_id"], "a")
            self.assertEqual(copia.procedencia["personagem_id"], self.caelren)
            # Retrato copiado com referência nova, no espaço do personagem novo.
            retrato = ficha["personagem"]["imagem_ativo"]
            self.assertTrue(retrato.startswith(f"mesas/b/personagens/{copia.id}/imagens/"))
            self.assertNotEqual(retrato, self.ficha_origem["personagem"]["imagem_ativo"])
            # Sem inventário nem efeitos; cartas só as concedidas pela classe, arquétipo e raça.
            self.assertEqual(session.scalar(select(func.count()).select_from(ItemInventarioRegistro)
                                            .where(ItemInventarioRegistro.personagem_id == copia.id)), 0)
            self.assertEqual(session.scalar(select(func.count()).select_from(EfeitoAplicadoRegistro)
                                            .where(EfeitoAplicadoRegistro.personagem_id == copia.id)), 0)
            cartas = list(session.scalars(select(CartaPersonagemRegistro.concedida_por)
                                          .where(CartaPersonagemRegistro.personagem_id == copia.id)))
            self.assertTrue(cartas)
            self.assertTrue(all(c and c.split(":")[0] in {"classe", "arquetipo", "raca"} for c in cartas))
            # Origem intacta.
            self.assertEqual(origem.ficha, self.ficha_origem)
            self.assertEqual(origem.mesa_id, "a")
            evento = session.scalar(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == "personagem.copiado"))
            self.assertEqual((evento.mesa_id, evento.resumo), ("b", "Lia: npc copiado de Sombras de Vigrad"))
        lida = self.como("ana").get("/mesas/b/ativos", params={"caminho": retrato, "exibicao": True})
        self.assertEqual(lida.status_code, 200)
        self.assertIn("Lia", [p["nome"] for p in self.acervo("npcs")])

    def test_ilustracao_do_resumo_nao_vai_para_a_copia(self):
        with Session(self.engine) as session:
            origem = session.get(PersonagemRegistro, self.caelren)
            ficha = deepcopy(origem.ficha)
            ficha["personagem"]["ilustracao_ativo"] = f"mesas/a/personagens/{self.caelren}/imagens/corpo.png"
            origem.ficha = ficha
            session.commit()
        resposta = self.copiar("b", "a", self.caelren)
        self.assertEqual(resposta.status_code, 201, resposta.text)
        with Session(self.engine) as session:
            self.assertNotIn("ilustracao_ativo", session.get(PersonagemRegistro, resposta.json()["id"]).ficha["personagem"])

    def test_alterar_a_copia_nao_altera_a_origem(self):
        corpo = self.copiar("b", "a", self.caelren).json()
        with Session(self.engine) as session:
            copia = session.get(PersonagemRegistro, corpo["id"])
            ficha = deepcopy(copia.ficha)
            ficha["personagem"]["nome"] = "Lia, a Velha"
            copia.ficha = ficha
            session.commit()
            self.assertEqual(session.get(PersonagemRegistro, self.caelren).ficha["personagem"]["nome"], "Lia")

    def test_monstro_continua_monstro(self):
        self.como("mestre")
        with Session(self.engine) as session:
            session.add(MembroRegistro(mesa_id="b", usuario_id="mestre", papel="jogador"))
            session.commit()
        # O mestre narra A; reaproveita o lobo na própria mesa A.
        resposta = self.copiar("a", "a", "lobo", ator="mestre")
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertEqual((resposta.json()["tipo"], resposta.json()["nome"]), ("monstro", "Lobo Cinzento"))

    def test_valores_fora_do_padrao_sao_preservados_sem_ajuste(self):
        with Session(self.engine) as session:
            origem = session.get(PersonagemRegistro, self.caelren)
            ficha = deepcopy(origem.ficha)
            ficha["atributos"]["valores"]["Força"] = 7
            origem.ficha = ficha
            session.commit()
        resposta = self.copiar("b", "a", self.caelren)
        self.assertEqual(resposta.status_code, 201, resposta.text)
        with Session(self.engine) as session:
            self.assertEqual(session.get(PersonagemRegistro, resposta.json()["id"]).ficha["atributos"]["valores"]["Força"], 7)

    def test_destino_so_jogado_e_recusado(self):
        resposta = self.copiar("a", "b", "velho")
        self.assertEqual(resposta.status_code, 403)
        self.assertEqual(self.copiar("c", "b", "velho").status_code, 404)
        with Session(self.engine) as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(PersonagemRegistro)
                                            .where(PersonagemRegistro.procedencia.is_not(None))), 0)

    def test_origem_sem_acesso_responde_como_inexistente(self):
        self.assertEqual(self.copiar("b", "a", "lobo").status_code, 404)  # monstro da mesa que ela só joga
        self.assertEqual(self.copiar("b", "c", "antigo").status_code, 404)  # mesa da qual foi removida
        self.assertEqual(self.copiar("b", "b", "sumido").status_code, 404)  # lixeira
        self.assertEqual(self.copiar("b", "a", "nao-existe").status_code, 404)


if __name__ == "__main__":
    unittest.main()
