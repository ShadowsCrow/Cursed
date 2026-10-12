from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

SEGREDO = "Anotação secreta: é a rainha disfarçada"
RETRATO = "aW1hZ2VtLWRvLWxvYm8="


class NarradorTest(unittest.TestCase):
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

    def as_(self, actor: str) -> TestClient:
        self.actor = actor
        return self.client

    def criar_lobo(self, **extra) -> dict:
        corpo = {
            "tipo": "monstro",
            "ficha": {
                "personagem": {"nome": "Lobo Sombrio", "imagem_base64": RETRATO, "notas": SEGREDO},
                "atributos": {"valores": {"Vigor": 6}},
            },
            **extra,
        }
        response = self.as_("mestre").post("/mesas/mesa/entidades", json=corpo)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def conteudo_visivel_ao_jogador(self, entidade_id: str) -> str:
        cliente = self.as_("ana")
        respostas = [
            cliente.get("/mesas/mesa/personagens"),
            cliente.get("/mesas/mesa/entidades-publicas"),
            cliente.get("/mesas/mesa/canais"),
            cliente.get("/mesas/mesa/auditoria"),
        ]
        for caminho in ("ficha", "inventario", "efeitos", "valores-derivados", "permissoes"):
            resposta = cliente.get(f"/mesas/mesa/personagens/{entidade_id}/{caminho}")
            self.assertEqual(resposta.status_code, 404, caminho)
            respostas.append(resposta)
        return " ".join(r.text for r in respostas)

    # ---------------------------------------------------------------- 8.1

    def test_entidade_oculta_nao_existe_para_jogadores(self):
        lobo = self.criar_lobo()
        self.assertEqual((lobo["tipo"], lobo["visibilidade"], lobo["proprietario_id"]), ("monstro", "narrador", None))
        self.as_("mestre").post(f"/mesas/mesa/personagens/{lobo['id']}/efeitos", json={
            "nome": "Fúria", "descricao": "+2 em ataques.", "versao_esperada": 0,
        })
        self.assertIn("Lobo Sombrio", self.as_("mestre").get("/mesas/mesa/personagens").text)

        visivel = self.conteudo_visivel_ao_jogador(lobo["id"])
        for vazamento in ("Lobo Sombrio", lobo["id"], SEGREDO, RETRATO, "Fúria", "monstro"):
            self.assertNotIn(vazamento, visivel)
        self.assertEqual(self.as_("ana").post(f"/mesas/mesa/personagens/{lobo['id']}/efeitos", json={
            "nome": "X", "descricao": "Y", "versao_esperada": 1,
        }).status_code, 403)
        self.assertEqual(self.as_("ana").post("/mesas/mesa/entidades", json={
            "tipo": "npc", "ficha": {"personagem": {"nome": "Intruso"}},
        }).status_code, 403)

    def test_narrador_cria_entidade_de_um_jogador_e_valida_proprietario(self):
        aliado = self.as_("mestre").post("/mesas/mesa/entidades", json={
            "tipo": "personagem", "visibilidade": "mesa", "proprietario_id": "ana",
            "ficha": {"personagem": {"nome": "Aliado"}},
        })
        self.assertEqual(aliado.status_code, 201)
        self.assertEqual([p["nome"] for p in self.as_("ana").get("/mesas/mesa/personagens").json()], ["Aliado"])
        self.assertEqual(self.as_("mestre").post("/mesas/mesa/entidades", json={
            "tipo": "npc", "proprietario_id": "estranho", "ficha": {"personagem": {"nome": "X"}},
        }).status_code, 422)

    # ---------------------------------------------------------------- 8.2

    def test_revelacao_parcial_expoe_somente_nome_publico_e_imagem(self):
        lobo = self.criar_lobo()
        caminho = f"/mesas/mesa/personagens/{lobo['id']}/visibilidade"
        self.assertEqual(self.as_("ana").put(caminho, json={
            "visibilidade": "mesa", "versao_esperada": 0}).status_code, 403)

        so_nome = self.as_("mestre").put(caminho, json={
            "visibilidade": "narrador", "revelacao": {"nome_publico": "Vulto na névoa"}, "versao_esperada": 0,
        })
        self.assertEqual(so_nome.status_code, 200, so_nome.text)
        self.assertEqual(self.as_("ana").get("/mesas/mesa/entidades-publicas").json(),
                         [{"id": lobo["id"], "nome_publico": "Vulto na névoa", "imagem": None}])

        self.as_("mestre").put(caminho, json={
            "visibilidade": "narrador", "revelacao": {"nome_publico": "Vulto na névoa", "imagem": True},
            "versao_esperada": 1,
        })
        [publica] = self.as_("ana").get("/mesas/mesa/entidades-publicas").json()
        self.assertEqual(publica["imagem"], RETRATO)
        visivel = self.conteudo_visivel_ao_jogador(lobo["id"])
        for vazamento in ("Lobo Sombrio", SEGREDO, "Vigor", "monstro"):
            self.assertNotIn(vazamento, visivel)

        desatualizado = self.as_("mestre").put(caminho, json={"visibilidade": "mesa", "versao_esperada": 0})
        self.assertEqual(desatualizado.status_code, 409)
        eventos = self.as_("mestre").get("/mesas/mesa/auditoria", params={"personagem_id": lobo["id"]}).json()
        self.assertEqual([e["acao"] for e in eventos["eventos"]],
                         ["personagem.visibilidade_alterada", "personagem.visibilidade_alterada", "personagem.criado"])

    def test_entidade_visivel_mostra_nome_e_retrato_mas_nao_a_ficha(self):
        lobo = self.criar_lobo(visibilidade="mesa", revelacao={"imagem": False})
        [publica] = self.as_("ana").get("/mesas/mesa/entidades-publicas").json()
        self.assertEqual(publica, {"id": lobo["id"], "nome_publico": "Lobo Sombrio", "imagem": None})
        self.as_("mestre").put(f"/mesas/mesa/personagens/{lobo['id']}/visibilidade", json={
            "visibilidade": "mesa", "revelacao": {"imagem": True}, "versao_esperada": 0,
        })
        self.assertEqual(self.as_("ana").get("/mesas/mesa/entidades-publicas").json()[0]["imagem"], RETRATO)
        self.assertNotIn(SEGREDO, self.conteudo_visivel_ao_jogador(lobo["id"]))

    # ---------------------------------------------------------------- 8.3

    def test_ciclo_de_efeito_preserva_origem_duracao_recalcula_e_audita(self):
        ana = self.as_("ana").post("/mesas/mesa/personagens", json={"ficha": {
            "personagem": {"nome": "Ana"}, "pericias": {"valores": {"Furtividade": 3}},
        }}).json()["personagem_id"]
        base = f"/mesas/mesa/personagens/{ana}"

        def furtividade():
            return next(v["total"] for v in self.as_("ana").get(f"{base}/valores-derivados").json()
                        if v["chave"] == "pericia:furtividade")

        aplicado = self.as_("mestre").post(f"{base}/efeitos", json={
            "nome": "Envenenado", "descricao": "−1 em Furtividade enquanto durar.",
            "modificadores": [{"alvo": "pericia:furtividade", "valor": -1}],
            "duracao_rodadas": 3, "origem": "Picada da aranha", "motivo": "Falhou no teste", "versao_esperada": 0,
        })
        self.assertEqual(aplicado.status_code, 201, aplicado.text)
        efeito = aplicado.json()["efeito"]
        self.assertEqual((efeito["estado"], efeito["duracao_rodadas"]), ("ativo", 3))
        self.assertEqual(efeito["fontes"], [{"tipo": "narrador", "descricao": "Picada da aranha", "equipamento_id": None}])
        [visto] = self.as_("ana").get(f"{base}/efeitos").json()
        self.assertEqual(visto["fontes"][0]["descricao"], "Picada da aranha")
        self.assertEqual(furtividade(), 2)

        caminho = f"{base}/efeitos/{efeito['id']}"
        ajuste = self.as_("mestre").patch(caminho, json={
            "modificadores": [{"alvo": "pericia:furtividade", "valor": -2}], "duracao_rodadas": 2, "versao_esperada": 1,
        })
        self.assertEqual(ajuste.status_code, 200, ajuste.text)
        self.assertEqual(furtividade(), 1)
        self.assertEqual(self.as_("mestre").post(f"{caminho}/suspender", json={"versao_esperada": 2}).status_code, 200)
        self.assertEqual(furtividade(), 3)
        self.assertEqual(self.as_("mestre").post(f"{caminho}/suspender", json={"versao_esperada": 3}).status_code, 409)
        self.assertEqual(self.as_("mestre").post(f"{caminho}/retomar", json={"versao_esperada": 3}).status_code, 200)
        self.assertEqual(furtividade(), 1)
        encerrado = self.as_("mestre").post(f"{caminho}/encerrar", json={"versao_esperada": 4, "motivo": "Antídoto"})
        self.assertEqual(encerrado.json()["efeito"]["estado"], "encerrado")
        self.assertEqual(furtividade(), 3)
        self.assertEqual(self.as_("ana").get(f"{base}/efeitos").json(), [])
        self.assertEqual(self.as_("mestre").patch(caminho, json={"descricao": "x", "versao_esperada": 5}).status_code, 409)

        eventos = self.as_("ana").get("/mesas/mesa/auditoria", params={"categoria": "efeito"}).json()["eventos"]
        self.assertEqual([e["acao"] for e in eventos], [
            "efeito.encerrado", "efeito.retomado", "efeito.suspenso", "efeito.ajustado", "efeito.aplicado",
        ])
        self.assertEqual(eventos[0]["motivo"], "Antídoto")
        self.assertEqual(eventos[-1]["motivo"], "Falhou no teste")
        ajustado = next(e for e in eventos if e["acao"] == "efeito.ajustado")
        self.assertEqual(sorted(m["campo"] for m in ajustado["mudancas"]), ["duracao_rodadas", "modificadores"])

    def test_efeitos_do_catalogo_e_validacao(self):
        ana = self.as_("ana").post("/mesas/mesa/personagens", json={"ficha": {"personagem": {"nome": "Ana"}}}).json()["personagem_id"]
        base = f"/mesas/mesa/personagens/{ana}/efeitos"
        catalogo = self.as_("mestre").post(base, json={"associacao": "condicao_derrubado", "versao_esperada": 0})
        self.assertEqual(catalogo.status_code, 201, catalogo.text)
        self.assertEqual((catalogo.json()["efeito"]["nome"], catalogo.json()["efeito"]["fontes"][0]["tipo"]),
                         ("Derrubado", "catalogo"))
        for corpo in (
            {"associacao": "inexistente", "versao_esperada": 1},
            {"associacao": "cc_above", "versao_esperada": 1},
            {"nome": "Sem descrição", "versao_esperada": 1},
            {"nome": "X", "descricao": "Y", "modificadores": [{"alvo": "", "valor": 1}], "versao_esperada": 1},
        ):
            with self.subTest(corpo=corpo):
                self.assertEqual(self.as_("mestre").post(base, json=corpo).status_code, 422)
        self.assertEqual(self.as_("mestre").post(base, json={"nome": "X", "descricao": "Y", "versao_esperada": 0}).status_code, 409)
        self.assertEqual(len(self.as_("ana").get(f"/mesas/mesa/personagens/{ana}/efeitos").json()), 1)


if __name__ == "__main__":
    unittest.main()


class IlustracaoForaDaVitrineTest(unittest.TestCase):
    """A ilustração do Resumo (aba-resumo-da-ficha) nunca entra na vitrine pública do Narrador."""

    def test_entidade_publica_nao_expoe_a_ilustracao(self):
        from cursed_platform import narrador as regras
        from cursed_platform.persistence import PersonagemRegistro
        ficha = {"personagem": {"nome": "Lobo", "ilustracao_ativo": "mesas/mesa/personagens/lobo/imagens/corpo.png"}}
        for visibilidade, revelacao in (("mesa", None), ("narrador", {"nome_publico": "Vulto", "imagem": True})):
            with self.subTest(visibilidade=visibilidade):
                publica = regras.entidade_publica(PersonagemRegistro(
                    id="lobo", mesa_id="mesa", tipo="monstro", visibilidade=visibilidade, ficha=ficha, revelacao=revelacao))
                self.assertEqual(set(publica), {"id", "nome_publico", "imagem"})
                self.assertNotIn("corpo.png", str(publica))
