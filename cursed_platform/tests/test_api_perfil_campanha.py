"""Perfil (apelido e foto), dados da campanha e capa (navegacao-inicial-e-perfil, tarefas 3.1 a 3.4)."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform import perfis
from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.config import PlatformSettings
from cursed_platform.migracao_ativos import ArmazenamentoLocal
from cursed_platform.persistence import (
    Base, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro, PerfilUsuarioRegistro,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


def imagem(formato: str = "PNG", tamanho: tuple[int, int] = (64, 48)) -> bytes:
    saida = BytesIO()
    Image.new("RGB", tamanho, (40, 60, 90)).save(saida, formato)
    return saida.getvalue()


class ApiPerfilCampanhaTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add_all([
                MesaRegistro(id="mesa", nome="Sombras de Vigrad", narrador_id="mestre"),
                MesaRegistro(id="longe", nome="Outra", narrador_id="estranho"),
            ])
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                MembroRegistro(mesa_id="mesa", usuario_id="saiu", papel="jogador", ativo=False),
                MembroRegistro(mesa_id="longe", usuario_id="estranho", papel="narrador"),
                PerfilUsuarioRegistro(usuario_id="ana", nome="Ana Souza"),
                PerfilUsuarioRegistro(usuario_id="mestre", nome="mestre.rpg"),
            ])
            session.commit()
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        self.armazenamento = ArmazenamentoLocal(pasta)
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine, armazenamento=self.armazenamento)
        self.ator = "ana"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator, email=f"{self.ator}@exemplo.com",
                                                                provedor="google")
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def como(self, ator: str) -> "ApiPerfilCampanhaTest":
        self.ator = ator
        return self

    def eventos(self, acao: str) -> list[EventoAuditoriaRegistro]:
        with Session(self.engine) as session:
            return list(session.scalars(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == acao)))

    # ------------------------------------------------------------------ perfil (3.1)

    def test_primeiro_acesso_sugere_o_nome_da_identidade(self):
        corpo = self.client.get("/perfil").json()
        self.assertEqual(corpo["apelido"], None)
        self.assertEqual(corpo["apelido_sugerido"], "Ana Souza")
        self.assertFalse(corpo["confirmado"])
        self.assertEqual((corpo["email"], corpo["provedor"]), ("ana@exemplo.com", "google"))

    def test_confirmar_apelido_marca_o_perfil_e_aparece_nas_mesas(self):
        resposta = self.client.put("/perfil", json={"apelido": "  Corvo   Negro "})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(resposta.json()["apelido"], "Corvo Negro")
        self.assertTrue(resposta.json()["confirmado"])
        participantes = {p["usuario_id"]: p["nome"] for p in self.client.get("/mesas/mesa/participantes").json()}
        self.assertEqual(participantes["ana"], "Corvo Negro")
        self.assertEqual(participantes["mestre"], "mestre.rpg")

    def test_apelido_sobrevive_a_novo_login_com_outro_nome(self):
        self.client.put("/perfil", json={"apelido": "Corvo"})
        with Session(self.engine) as session:
            perfis.lembrar(session, "ana", "Ana S. Google")
            self.assertEqual(perfis.nomes(session, ["ana"]), {"ana": "Corvo"})
            self.assertEqual(session.get(PerfilUsuarioRegistro, "ana").nome, "Ana S. Google")

    def test_historico_mostra_o_apelido(self):
        self.client.put("/perfil", json={"apelido": "Corvo"})
        self.como("mestre").client.post("/mesas/mesa/convites", json={"validade_dias": 1})
        self.como("ana")
        with Session(self.engine) as session:
            self.assertEqual(perfis.nomes(session, ["ana", "mestre"]), {"ana": "Corvo", "mestre": "mestre.rpg"})

    def test_apelido_fora_dos_limites_e_recusado(self):
        for apelido in ("R", " ", "x" * 41):
            resposta = self.client.put("/perfil", json={"apelido": apelido})
            self.assertEqual(resposta.status_code, 422, apelido)
            self.assertIn("2 a 40", resposta.json()["detail"])
        self.assertFalse(self.client.get("/perfil").json()["confirmado"])

    def test_perfil_de_identidade_sem_registro_e_criado(self):
        corpo = self.como("novo-id").client.get("/perfil").json()
        self.assertEqual(corpo["usuario_id"], "novo-id")
        self.assertFalse(corpo["confirmado"])

    # ------------------------------------------------------------------ foto (3.2)

    def enviar_foto(self, conteudo: bytes, nome: str = "foto.png"):
        return self.client.put("/perfil/foto", files={"arquivo": (nome, conteudo)})

    def test_enviar_foto_e_colega_de_mesa_le(self):
        resposta = self.enviar_foto(imagem())
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertTrue(resposta.json()["objeto"].startswith("usuarios/ana/foto/"))
        self.assertIsNotNone(self.armazenamento.ler(BUCKET_PRIVADO, resposta.json()["objeto"]))
        self.assertEqual(self.client.get("/perfis/ana/foto").json()["tipo"], "image/webp")
        self.assertEqual(self.como("mestre").client.get("/perfis/ana/foto").status_code, 200)
        participantes = {p["usuario_id"]: p["tem_foto"] for p in self.client.get("/mesas/mesa/participantes").json()}
        self.assertEqual(participantes, {"ana": True, "mestre": False})
        self.assertTrue(self.como("ana").client.get("/perfil").json()["tem_foto"])
        self.assertEqual(self.eventos("imagem.alterada"), [])  # a foto não entra no histórico de mesa

    def test_quem_nao_divide_mesa_ativa_nao_le_a_foto(self):
        self.enviar_foto(imagem())
        self.assertEqual(self.como("estranho").client.get("/perfis/ana/foto").status_code, 404)
        self.assertEqual(self.como("saiu").client.get("/perfis/ana/foto").status_code, 404)
        self.assertEqual(self.como("mestre").client.get("/perfis/ninguem/foto").status_code, 404)

    def test_foto_grande_ou_falsa_e_recusada(self):
        grande = self.enviar_foto(b"\x89PNG\r\n\x1a\n" + b"0" * (5 * 1024 * 1024 + 10))
        self.assertEqual(grande.status_code, 422)
        self.assertIn("5 MB", grande.json()["detail"])
        falsa = self.enviar_foto(b"isto nao e imagem", "foto.png")
        self.assertEqual(falsa.status_code, 422)
        self.assertFalse(self.client.get("/perfil").json()["tem_foto"])

    def test_remover_foto_so_afeta_a_propria(self):
        self.enviar_foto(imagem())
        self.como("mestre").client.delete("/perfil/foto")
        self.assertEqual(self.como("ana").client.get("/perfis/ana/foto").status_code, 200)
        self.assertEqual(self.client.delete("/perfil/foto").status_code, 200)
        self.assertEqual(self.client.get("/perfis/ana/foto").status_code, 404)

    # ------------------------------------------------------------------ campanha (3.3)

    def test_mesa_antiga_aparece_com_padroes(self):
        mesas = self.client.get("/mesas").json()
        self.assertEqual(mesas, [{"id": "mesa", "nome": "Sombras de Vigrad", "papel": "jogador", "sistema": "cursed",
                                  "sinopse": None, "capa_objeto": None}])

    def test_detalhe_traz_participantes_ativos(self):
        corpo = self.client.get("/mesas/mesa").json()
        self.assertEqual(corpo["papel"], "jogador")
        self.assertEqual({p["usuario_id"] for p in corpo["participantes"]}, {"ana", "mestre"})
        self.assertEqual(self.como("estranho").client.get("/mesas/mesa").status_code, 404)

    def test_narrador_edita_nome_e_sinopse_com_historico(self):
        resposta = self.como("mestre").client.put(
            "/mesas/mesa", json={"nome": "Sombras de Vigrad", "sinopse": "  Em Vigrad, a noite nunca é silenciosa. "})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(resposta.json()["sinopse"], "Em Vigrad, a noite nunca é silenciosa.")
        self.assertEqual(self.como("ana").client.get("/mesas").json()[0]["sinopse"],
                         "Em Vigrad, a noite nunca é silenciosa.")
        eventos = self.eventos("mesa.atualizada")
        self.assertEqual([e.resumo for e in eventos], ["Campanha atualizada: sinopse"])

    def test_jogador_nao_edita_a_campanha(self):
        resposta = self.client.put("/mesas/mesa", json={"nome": "Minha"})
        self.assertEqual(resposta.status_code, 403)
        self.assertEqual(self.client.get("/mesas").json()[0]["nome"], "Sombras de Vigrad")

    def test_sistema_diferente_de_cursed_e_recusado(self):
        resposta = self.como("mestre").client.put("/mesas/mesa", json={"nome": "X", "sistema": "dnd5e"})
        self.assertEqual(resposta.status_code, 422)
        longa = self.client.put("/mesas/mesa", json={"nome": "X", "sinopse": "a" * 2001})
        self.assertEqual(longa.status_code, 422)

    def test_criar_mesa_devolve_os_dados_da_campanha(self):
        corpo = self.client.post("/mesas", json={"nome": "Nova"}).json()
        self.assertEqual((corpo["papel"], corpo["sistema"], corpo["capa_objeto"]), ("narrador", "cursed", None))

    # ------------------------------------------------------------------ capa (3.4)

    def enviar_capa(self, conteudo: bytes, alvo: str = "mesa"):
        return self.client.put("/mesas/mesa/imagens/capa", data={"alvo": alvo}, files={"arquivo": ("capa.png", conteudo)})

    def test_narrador_envia_e_remove_a_capa(self):
        resposta = self.como("mestre").enviar_capa(imagem(tamanho=(300, 100)))
        self.assertEqual(resposta.status_code, 200, resposta.text)
        objeto = resposta.json()["objeto"]
        self.assertTrue(objeto.startswith("mesas/mesa/mesa/capa/"))
        self.assertEqual(self.como("ana").client.get("/mesas").json()[0]["capa_objeto"], objeto)
        lido = self.client.get("/mesas/mesa/ativos", params={"caminho": objeto, "exibicao": True})
        self.assertEqual(lido.json()["tipo"], "image/webp")
        self.assertEqual(self.como("estranho").client.get(
            "/mesas/mesa/ativos", params={"caminho": objeto}).status_code, 404)
        self.assertEqual([e.resumo for e in self.eventos("imagem.alterada")], ["capa da campanha alterada"])
        self.assertEqual(self.como("mestre").client.delete(
            "/mesas/mesa/imagens/capa", params={"alvo": "mesa"}).status_code, 200)
        self.assertIsNone(self.client.get("/mesas").json()[0]["capa_objeto"])
        self.assertEqual([e.resumo for e in self.eventos("imagem.removida")], ["capa da campanha removida"])

    def test_jogador_nao_troca_a_capa(self):
        self.assertEqual(self.enviar_capa(imagem()).status_code, 403)
        self.assertEqual(self.como("estranho").enviar_capa(imagem()).status_code, 404)

    def test_capa_tem_limite_de_8_mb(self):
        resposta = self.como("mestre").enviar_capa(b"\x89PNG\r\n\x1a\n" + b"0" * (8 * 1024 * 1024 + 10))
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("8 MB", resposta.json()["detail"])


if __name__ == "__main__":
    unittest.main()
