"""Envio de imagens (tarefa 6.3 de calcular-valores-da-ficha)."""

from __future__ import annotations

import base64
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

from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.config import PlatformSettings
from cursed_platform.migracao_ativos import ArmazenamentoLocal
from cursed_platform.persistence import (
    Base, CartaDefinicaoRegistro, CenaRegistro, EfeitoAplicadoRegistro, EventoAuditoriaRegistro,
    ItemInventarioRegistro, MembroRegistro, MesaRegistro, PersonagemRegistro,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


def imagem(formato: str = "PNG", tamanho: tuple[int, int] = (64, 48), cor=(200, 30, 30)) -> bytes:
    saida = BytesIO()
    Image.new("RGB", tamanho, cor).save(saida, formato)
    return saida.getvalue()


class ApiImagensTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana", versao=0,
                                   ficha={"personagem": {"nome": "Lia"}}),
                PersonagemRegistro(id="oculta", mesa_id="mesa", proprietario_id="ana", versao=0, visibilidade="narrador",
                                   ficha={"personagem": {"nome": "Oculta"}}),
                CenaRegistro(id="cena", mesa_id="mesa", nome="Floresta", colunas=10, linhas=10),
            ])
            session.flush()
            session.add_all([
                ItemInventarioRegistro(id="espada", mesa_id="mesa", personagem_id="lia", tipo="arma", nome="Espada",
                                       quantidade=1, equipado=False, dados={}),
                EfeitoAplicadoRegistro(id="bencao", mesa_id="mesa", personagem_id="lia", nome="Bênção",
                                       descricao="Do templo", versao=1, estado="ativo", conteudo={}),
            ])
            session.commit()
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        self.armazenamento = ArmazenamentoLocal(pasta)
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine, armazenamento=self.armazenamento)
        self.ator = "ana"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def enviar(self, destino: str, alvo: str, conteudo: bytes, versao: int | None = 0, nome: str = "imagem.png"):
        dados = {"alvo": alvo, **({"versao_esperada": str(versao)} if versao is not None else {})}
        return self.client.put(f"/mesas/mesa/imagens/{destino}", data=dados, files={"arquivo": (nome, conteudo)})

    def ficha(self, personagem_id: str) -> dict:
        with Session(self.engine) as session:
            return session.get(PersonagemRegistro, personagem_id).ficha

    def ler(self, objeto: str) -> bytes | None:
        return self.armazenamento.ler(BUCKET_PRIVADO, objeto)

    # ---------------------------------------------------------------- retrato

    def test_mesma_imagem_em_usos_de_tamanhos_diferentes(self):
        """Retrato (512 px), ilustração (1536 px) e arte de item (256 px) com o mesmo arquivo não colidem."""
        mesma = imagem(tamanho=(1600, 1200))
        retrato = self.enviar("retrato", "lia", mesma, versao=0)
        self.assertEqual(retrato.status_code, 200, retrato.text)
        ilustracao = self.enviar("ilustracao", "lia", mesma, versao=1)
        self.assertEqual(ilustracao.status_code, 200, ilustracao.text)
        item = self.enviar("item", "espada", mesma, versao=2)
        self.assertEqual(item.status_code, 200, item.text)
        objetos = [r.json()["objeto"] for r in (retrato, ilustracao, item)]
        self.assertEqual([o.split("/")[-2] for o in objetos], ["retrato", "ilustracao", "item"])
        lados = []
        for resposta in (retrato, ilustracao, item):
            with Image.open(BytesIO(self.ler(resposta.json()["exibicao"]))) as reduzida:
                lados.append(max(reduzida.size))
        self.assertEqual(lados, [512, 1536, 256])

    def test_jogador_envia_o_retrato(self):
        resposta = self.enviar("retrato", "lia", imagem())
        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        self.assertTrue(corpo["objeto"].startswith("mesas/mesa/personagens/lia/imagens/"))
        self.assertEqual(self.ficha("lia")["personagem"]["imagem_ativo"], corpo["objeto"])
        self.assertEqual(self.ler(corpo["objeto"]), imagem())
        lido = self.client.get("/mesas/mesa/ativos", params={"caminho": corpo["objeto"], "exibicao": True}).json()
        self.assertEqual(lido["tipo"], "image/webp")
        self.assertEqual(corpo["versao"], 1)

    def test_historico_registra_a_troca_sem_a_imagem(self):
        self.enviar("retrato", "lia", imagem())
        with Session(self.engine) as session:
            evento = session.scalar(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == "imagem.alterada"))
        self.assertEqual((evento.resumo, evento.ator_id), ("Lia: retrato alterado", "ana"))
        self.assertNotIn(base64.b64encode(imagem()).decode()[:40], str(evento.detalhes))

    def test_arquivo_grande_demais(self):
        grande = imagem() + b"\0" * (12 * 1024 * 1024)
        resposta = self.enviar("retrato", "lia", grande)
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("5 MB para retrato", resposta.json()["detail"])
        self.assertNotIn("imagem_ativo", self.ficha("lia")["personagem"])

    def test_extensao_falsa(self):
        resposta = self.enviar("retrato", "lia", b"isto nao e um png" * 10, nome="falso.png")
        self.assertEqual(resposta.status_code, 422)
        self.assertNotIn("imagem_ativo", self.ficha("lia")["personagem"])
        self.assertFalse(any(Path(self.armazenamento.raiz).rglob("*.png")))

    def test_mesa_bloqueia_edicao_do_jogador(self):
        with Session(self.engine) as session:
            session.get(MesaRegistro, "mesa").permitir_edicao_propria = False
            session.commit()
        self.assertEqual(self.enviar("retrato", "lia", imagem()).status_code, 403)

    def test_retrato_de_personagem_oculto(self):
        self.ator = "mestre"
        objeto = self.enviar("retrato", "oculta", imagem()).json()["objeto"]
        self.ator = "ana"
        self.assertEqual(self.client.get("/mesas/mesa/ativos", params={"caminho": objeto}).status_code, 404)
        self.assertEqual(self.enviar("retrato", "oculta", imagem(), versao=1).status_code, 404)

    def test_remover_o_retrato(self):
        self.enviar("retrato", "lia", imagem())
        resposta = self.client.delete("/mesas/mesa/imagens/retrato", params={"alvo": "lia", "versao_esperada": 1})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertNotIn("imagem_ativo", self.ficha("lia")["personagem"])

    # ---------------------------------------------------------------- ilustração do Resumo

    def test_ilustracao_e_independente_do_retrato(self):
        retrato = self.enviar("retrato", "lia", imagem()).json()["objeto"]
        original = imagem(tamanho=(1024, 1536), cor=(30, 60, 200))
        resposta = self.enviar("ilustracao", "lia", original, versao=1)
        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        personagem = self.ficha("lia")["personagem"]
        self.assertEqual((personagem["ilustracao_ativo"], personagem["imagem_ativo"]), (corpo["objeto"], retrato))
        self.assertTrue(corpo["objeto"].startswith("mesas/mesa/personagens/lia/imagens/"))
        self.assertEqual(self.ler(corpo["objeto"]), original)
        with Image.open(BytesIO(self.ler(corpo["exibicao"]))) as reduzida:
            self.assertEqual((reduzida.format, reduzida.size), ("WEBP", (1024, 1536)))
        with Session(self.engine) as session:
            evento = session.scalars(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == "imagem.alterada")).all()[-1]
        self.assertEqual(evento.resumo, "Lia: ilustração alterada")

    def test_ilustracao_grande_ganha_versao_de_1536(self):
        corpo = self.enviar("ilustracao", "lia", imagem(tamanho=(2048, 3072))).json()
        with Image.open(BytesIO(self.ler(corpo["exibicao"]))) as reduzida:
            self.assertEqual(reduzida.size, (1024, 1536))
        grande = imagem() + b"\0" * (9 * 1024 * 1024)
        resposta = self.enviar("ilustracao", "lia", grande, versao=1)
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("8 MB para ilustração", resposta.json()["detail"])

    def test_remover_a_ilustracao_mantem_o_retrato(self):
        self.enviar("retrato", "lia", imagem())
        self.enviar("ilustracao", "lia", imagem(), versao=1)
        resposta = self.client.delete("/mesas/mesa/imagens/ilustracao", params={"alvo": "lia", "versao_esperada": 2})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        personagem = self.ficha("lia")["personagem"]
        self.assertNotIn("ilustracao_ativo", personagem)
        self.assertIn("imagem_ativo", personagem)

    def test_ilustracao_segue_as_permissoes_da_ficha(self):
        with Session(self.engine) as session:
            session.get(MesaRegistro, "mesa").campos_bloqueados = ["personagem.ilustracao_ativo"]
            session.commit()
        resposta = self.enviar("ilustracao", "lia", imagem())
        self.assertEqual(resposta.status_code, 403)
        self.assertIn("bloqueada pelo Narrador", resposta.json()["detail"])
        self.assertEqual(self.enviar("retrato", "lia", imagem()).status_code, 200)
        self.ator = "mestre"
        objeto = self.enviar("ilustracao", "oculta", imagem()).json()["objeto"]
        self.ator = "ana"
        self.assertEqual(self.client.get("/mesas/mesa/ativos", params={"caminho": objeto}).status_code, 404)

    def test_icone_grande_ganha_versao_reduzida_e_a_original_fica(self):
        original = imagem(tamanho=(1254, 1254))
        corpo = self.enviar("icone-grade", "item:espada", original).json()
        self.assertEqual(self.ler(corpo["objeto"]), original)
        with Image.open(BytesIO(self.ler(corpo["exibicao"]))) as reduzida:
            self.assertEqual((reduzida.format, reduzida.size), ("WEBP", (256, 256)))

    # ---------------------------------------------------------------- itens e efeitos

    def test_arte_e_icone_de_grade_do_item_sao_independentes(self):
        arte = self.enviar("item", "espada", imagem(cor=(1, 2, 3))).json()["objeto"]
        icone = self.enviar("icone-grade", "item:espada", imagem(cor=(4, 5, 6)), versao=1).json()["objeto"]
        self.client.delete("/mesas/mesa/imagens/icone-grade", params={"alvo": "item:espada", "versao_esperada": 2})
        with Session(self.engine) as session:
            dados = session.get(ItemInventarioRegistro, "espada").dados
        self.assertEqual(dados, {"imagem_ativo": arte})
        self.assertNotEqual(arte, icone)

    def test_imagem_do_efeito_personalizado_vira_o_icone_dele(self):
        objeto = self.enviar("efeito", "bencao", imagem()).json()["objeto"]
        [efeito] = self.client.get("/mesas/mesa/personagens/lia/efeitos").json()
        self.assertEqual(efeito["icone"], {"origem": "efeito", "caminho": objeto})

    # ---------------------------------------------------------------- Narrador

    def criar_carta_de_item(self) -> str:
        self.ator = "mestre"
        rascunho = {"titulo": "Escudo", "texto": "Um escudo.", "item_tipo": "armadura", "quantidade": 1,
                    "formato": {"subtipo": "escudo", "largura": 2, "altura": 2}}
        return self.client.post("/mesas/mesa/cartas", json={"tipo": "item", "rascunho": rascunho}).json()["id"]

    def test_troca_isolada_do_icone_de_grade_da_carta_e_publicacao(self):
        carta = self.criar_carta_de_item()
        arte = self.enviar("carta", carta, imagem(cor=(9, 9, 9))).json()
        self.assertTrue(arte["objeto"].startswith("mesas/mesa/narrador/cartas/"))
        icone = self.enviar("icone-grade", f"carta:{carta}", imagem(cor=(8, 8, 8)), versao=arte["versao"]).json()
        with Session(self.engine) as session:
            conteudo = session.get(CartaDefinicaoRegistro, carta).rascunho["conteudo"]
        self.assertEqual(conteudo["ativos_privados"], [arte["objeto"]])
        self.assertEqual(conteudo["formato"]["icone_grade"], icone["objeto"])

        sem_confirmar = self.client.post(f"/mesas/mesa/cartas/{carta}/publicacao", json={"versao_esperada": icone["versao"]})
        self.assertEqual(sem_confirmar.status_code, 422)
        publicada = self.client.post(f"/mesas/mesa/cartas/{carta}/publicacao",
                                     json={"versao_esperada": icone["versao"], "promover_ativos": True})
        self.assertEqual(publicada.status_code, 201, publicada.text)
        versao = publicada.json()["conteudo"]
        self.assertTrue(versao["ativos"][0].startswith("mesas/mesa/mesa/cartas/"))
        self.assertTrue(versao["formato"]["icone_grade"].startswith("mesas/mesa/mesa/cartas/"))
        self.ator = "ana"
        lido = self.client.get("/mesas/mesa/ativos", params={"caminho": versao["ativos"][0]})
        self.assertEqual(lido.status_code, 200)
        self.assertEqual(self.client.get("/mesas/mesa/ativos", params={"caminho": arte["objeto"]}).status_code, 404)

    def test_jogador_nao_envia_arte_de_carta(self):
        carta = self.criar_carta_de_item()
        self.ator = "ana"
        self.assertIn(self.enviar("carta", carta, imagem()).status_code, (403, 404))

    def test_narrador_envia_o_mapa_da_cena_e_jogador_nao(self):
        self.assertEqual(self.enviar("mapa", "cena", imagem(), versao=None).status_code, 403)
        self.ator = "mestre"
        resposta = self.enviar("mapa", "cena", imagem("JPEG", (400, 300)), versao=None)
        self.assertEqual(resposta.status_code, 200, resposta.text)
        with Session(self.engine) as session:
            self.assertEqual(session.get(CenaRegistro, "cena").mapa_objeto, resposta.json()["objeto"])
        self.assertTrue(resposta.json()["objeto"].startswith("mesas/mesa/mesa/mapas/"))
        self.assertIsNone(resposta.json()["exibicao"])

    def test_icone_do_efeito_default_vale_so_na_mesa(self):
        self.assertEqual(self.enviar("icone-efeito", "condicao_derrubado", imagem(), versao=None).status_code, 403)
        self.ator = "mestre"
        objeto = self.enviar("icone-efeito", "condicao_derrubado", imagem(), versao=None).json()["objeto"]
        efeitos = {e["associacao"]: e for e in self.client.get("/mesas/mesa/catalogos/efeitos-default").json()}
        self.assertEqual(efeitos["condicao_derrubado"]["icone"], {"origem": "mesa", "caminho": objeto})
        self.client.delete("/mesas/mesa/imagens/icone-efeito", params={"alvo": "condicao_derrubado"})
        efeitos = {e["associacao"]: e for e in self.client.get("/mesas/mesa/catalogos/efeitos-default").json()}
        self.assertEqual(efeitos["condicao_derrubado"]["icone"]["origem"], "padrao")


if __name__ == "__main__":
    unittest.main()
