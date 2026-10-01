from __future__ import annotations

from datetime import UTC, datetime, timedelta
import base64
import hashlib
from io import BytesIO
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from PIL import Image

from cursed_platform.config import PlatformSettings
from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.migracao_ativos import ArmazenamentoLocal
from cursed_platform.domain.equip_codec import encode_equipment_eq1
from cursed_platform.domain.efeitos_codec import encode_effect_e1
from cursed_platform.persistence import (
    ItemInventarioRegistro,
    AtivoCatalogoRegistro, Base, CartaDefinicaoRegistro, CartaPersonagemRegistro, MembroRegistro, MesaRegistro, OfertaCartasRegistro,
    PersonagemRegistro,
)


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

BOLA = {"titulo": "Bola de Fogo", "texto": "Explosão em área.", "escola": "Evocação", "grau": 2,
        "custo_aprendizado": 3, "descansos_minimos": 1, "potencia_uso": 4, "custo_uso": 2}
ESPADA = {"titulo": "Espada Rúnica", "texto": "Lâmina antiga.", "item_tipo": "arma", "dados": {"dano": "1d8", "tipo_dano": "Cortante"},
          "formato": {"subtipo": "uma_mao", "largura": 1, "altura": 3},
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

    def test_arte_privada_exige_confirmacao_e_recurso_respeita_visibilidade(self):
        buffer = BytesIO()
        Image.new("RGB", (2, 2), "purple").save(buffer, format="PNG")
        imagem = buffer.getvalue()
        sha = hashlib.sha256(imagem).hexdigest()
        privado = f"mesas/mesa/narrador/legado/{sha}.png"
        with TemporaryDirectory() as diretorio:
            armazenamento = ArmazenamentoLocal(Path(diretorio))
            armazenamento.gravar(BUCKET_PRIVADO, privado, imagem, "image/png")
            self.app.state.armazenamento_objetos = armazenamento
            with Session(self.engine) as session:
                session.add(AtivoCatalogoRegistro(id="arte-1", mesa_id="mesa", bucket=BUCKET_PRIVADO,
                    caminho=privado, tipo="image/png", tamanho=len(imagem), sha256=sha, procedencias=[]))
                session.commit()
            definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": "efeito", "rascunho": {
                "titulo": "Brilho", "texto": "Ilumina.", "ativos_privados": [privado],
            }}).json()
            self.assertEqual(self.as_("ana").get("/mesas/mesa/ativos", params={"caminho": privado}).status_code, 404)
            leitura = self.as_("mestre").get("/mesas/mesa/ativos", params={"caminho": privado})
            self.assertEqual(base64.b64decode(leitura.json()["base64"]), imagem)
            endereco = f"/mesas/mesa/cartas/{definicao['id']}/publicacao"
            self.assertEqual(self.client.post(endereco, json={"versao_esperada": 0}).status_code, 422)
            publicada = self.client.post(endereco, json={"versao_esperada": 0, "promover_ativos": True})
            self.assertEqual(publicada.status_code, 201, publicada.text)
            [compartilhado] = publicada.json()["conteudo"]["ativos"]
            self.assertEqual(base64.b64decode(self.as_("ana").get(
                "/mesas/mesa/ativos", params={"caminho": compartilhado}).json()["base64"]), imagem)
            self.assertEqual(self.as_("ana").get(
                "/mesas/outra/ativos", params={"caminho": compartilhado}).status_code, 404)
            self.assertEqual(self.as_("ana").get(
                "/mesas/mesa/ativos", params={"caminho": "mesas/mesa/mesa/..\\narrador/legado/arte.png"}).status_code, 404)

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

    def catalogo_do_narrador(self) -> list[dict]:
        """Catálogo sem os corpos padrão, que o sistema cria em toda mesa."""
        return [d for d in self.client.get("/mesas/mesa/cartas").json() if d["procedencia_rascunho"].get("origem") != "sistema"]

    def test_importacao_portatil_com_previa(self):
        codigo = encode_equipment_eq1("armadura", {"nome": "Escudo", "armadura": 1}, [
            {"kind": "externo", "nome": "Bloqueio", "descricao": "+1 Defesa.",
             "modificadores": [{"alvo": "defesa:armadura", "valor": 1}]}])
        previa = self.as_("mestre").post("/mesas/mesa/cartas/importacoes/previa", json={"codigo": codigo}).json()
        self.assertEqual((previa["tipo"], previa["validacao"]["valida"], previa["rascunho"]["titulo"]), ("item", True, "Escudo"))
        self.assertEqual(self.catalogo_do_narrador(), [])
        importada = self.client.post("/mesas/mesa/cartas/importacoes", json={"codigo": codigo}).json()
        self.assertEqual((importada["procedencia_rascunho"]["origem"], importada["publicada"]), ("importacao", None))
        self.assertEqual(self.client.post("/mesas/mesa/cartas/importacoes", json={"codigo": "EQ1:quebrado"}).status_code, 422)
        self.assertEqual(len(self.catalogo_do_narrador()), 1)

    def test_e1_eq1_viram_versoes_publicadas_com_procedencia(self):
        codigos = [
            ("E1", encode_effect_e1({"nome": "Foco", "descricao": "+1 em Arcanismo.",
                "modificadores": [{"alvo": "pericia:arcanismo", "valor": 1}]}), "efeito"),
            ("EQ1", encode_equipment_eq1("arma", {"nome": "Lança", "dano": "1d6", "peso": 4}, []), "item"),
        ]
        for formato, codigo, tipo in codigos:
            with self.subTest(formato=formato):
                importada = self.as_("mestre").post("/mesas/mesa/cartas/importacoes", json={"codigo": codigo})
                self.assertEqual(importada.status_code, 201, importada.text)
                definicao = importada.json()
                self.assertEqual(definicao["tipo"], tipo)
                self.assertEqual(definicao["procedencia_rascunho"]["formato"], formato)
                if tipo == "item":
                    # O peso do código antigo é descartado (simplificar-criacao-de-cartas, D7a).
                    self.assertEqual(definicao["rascunho"]["dados"], {"dano": "1d6"})
                    # Código antigo não traz dimensão: publicar exige o formato na grade.
                    sem_formato = self.as_("mestre").post(
                        f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 0})
                    self.assertEqual(sem_formato.status_code, 422, sem_formato.text)
                    conteudo = {**definicao["rascunho"], "formato": {"subtipo": "duas_maos", "largura": 1, "altura": 4}}
                    salvo = self.as_("mestre").put(f"/mesas/mesa/cartas/{definicao['id']}/rascunho", json={
                        "rascunho": conteudo, "versao_esperada": definicao["versao"]})
                    self.assertEqual(salvo.status_code, 200, salvo.text)
                    definicao = salvo.json()
                publicada = self.as_("mestre").post(
                    f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": definicao["versao"]})
                self.assertEqual(publicada.status_code, 201, publicada.text)
                self.assertEqual(publicada.json()["numero"], 1)
                self.assertEqual(publicada.json()["procedencia"]["formato"], formato)
        with Session(self.engine) as session:
            antes = session.scalar(select(func.count()).select_from(CartaDefinicaoRegistro))
        for codigo in ("E1:quebrado", "EQ1:quebrado"):
            self.assertEqual(self.as_("mestre").post(
                "/mesas/mesa/cartas/importacoes", json={"codigo": codigo}).status_code, 422)
        with Session(self.engine) as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(CartaDefinicaoRegistro)), antes)

    # ------------------------------------------------------------- 9.4

    def test_item_concedido_chega_com_o_formato_da_grade(self):
        mochila = self.publicar("item", {
            "titulo": "Mochila de viagem", "texto": "Mais espaço.", "item_tipo": "outro",
            "ativos": ["mesas/mesa/mesa/cartas/mochila-foto.png"],
            "formato": {"subtipo": "mochila", "largura": 2, "altura": 2,
                        "mochila": {"linhas": 1, "requisito_forca": 2}, "icone_grade": "mesas/mesa/mesa/mochila.png"},
        })
        self.assertEqual(self.conceder(mochila["id"]).status_code, 201)
        with Session(self.engine) as session:
            item = session.scalar(select(ItemInventarioRegistro).where(ItemInventarioRegistro.nome == "Mochila de viagem"))
            self.assertEqual((item.tipo, item.subtipo, item.largura, item.altura, item.coluna), ("outro", "mochila", 2, 2, None))
            self.assertEqual(item.dados["ampliacao"], {"linhas": 1, "colunas": 0})
            self.assertEqual((item.dados["requisito_forca"], item.dados["icone_grade"]), (2, "mesas/mesa/mesa/mochila.png"))
            # A arte da carta vira a foto do item (painel "Item selecionado"); o ícone da bolsa vem do formato.
            self.assertEqual(item.dados["imagem_ativo"], "mesas/mesa/mesa/cartas/mochila-foto.png")

    def test_item_concedido_traz_raridade_categoria_e_descricao(self):
        chave = self.publicar("item", {
            "titulo": "Chave de Ferro", "texto": "Abre a porta da cripta.", "item_tipo": "outro",
            "formato": {"subtipo": "outro", "largura": 1, "altura": 1, "raridade": "incomum", "categoria": "chaves"},
        })
        espada = self.publicar("item", ESPADA)
        self.assertEqual(self.conceder(chave["id"]).status_code, 201)
        self.assertEqual(self.conceder(espada["id"]).status_code, 201)
        itens = {i["nome"]: i for i in self.as_("ana").get("/mesas/mesa/personagens/lia/inventario").json()}
        self.assertEqual((itens["Chave de Ferro"]["raridade"], itens["Chave de Ferro"]["categoria"]), ("incomum", "chaves"))
        self.assertEqual(itens["Chave de Ferro"]["descricao"], "Abre a porta da cripta.")
        self.assertNotIn("imagem_ativo", itens["Chave de Ferro"]["dados"])
        # Sem escolha: raridade padrão e categoria pelo subtipo.
        self.assertEqual((itens[ESPADA["titulo"]]["raridade"], itens[ESPADA["titulo"]]["categoria"]), ("comum", "armas"))

    def test_formato_incoerente_ou_ausente_impede_publicar(self):
        invalidos = {
            "categoria em arma": {"subtipo": "uma_mao", "largura": 1, "altura": 3, "categoria": "chaves"},
            "raridade desconhecida": {"subtipo": "uma_mao", "largura": 1, "altura": 3, "raridade": "mitica"},
            "categoria fora do catálogo": {"subtipo": "outro", "largura": 1, "altura": 1, "categoria": "armas"},
            "mãos em arma": {"subtipo": "uma_mao", "largura": 1, "altura": 3, "maos": 1},
            "mochila sem ampliação": {"subtipo": "mochila", "largura": 2, "altura": 2},
            "moedas como item": {"subtipo": "moedas", "largura": 1, "altura": 1},
            "largura zero": {"subtipo": "outro", "largura": 0, "altura": 1},
            "ícone fora da mesa": {"subtipo": "uma_mao", "largura": 1, "altura": 3, "icone_grade": "mesas/outra/mesa/x.png"},
        }
        for nome, formato in invalidos.items():
            with self.subTest(nome):
                definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={
                    "tipo": "item", "rascunho": {**ESPADA, "formato": formato}}).json()
                resposta = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 0})
                self.assertEqual(resposta.status_code, 422, resposta.text)
        sem_formato = {k: v for k, v in ESPADA.items() if k != "formato"}
        definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": "item", "rascunho": sem_formato}).json()
        resposta = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 0})
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("dimensão", resposta.text)
        armadura_como_arma = {**ESPADA, "item_tipo": "armadura"}
        definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": "item", "rascunho": armadura_como_arma}).json()
        resposta = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 0})
        self.assertEqual(resposta.status_code, 422)

    def test_tipo_trocavel_ate_a_primeira_publicacao(self):
        base = "/mesas/mesa/cartas"
        definicao = self.as_("mestre").post(base, json={"tipo": "magia", "rascunho": BOLA}).json()
        comum = {"titulo": "Passo Leve", "texto": BOLA["texto"]}
        trocada = self.client.put(f"{base}/{definicao['id']}/rascunho", json={
            "rascunho": comum, "versao_esperada": 0, "tipo": "habilidade"})
        self.assertEqual(trocada.status_code, 200, trocada.text)
        self.assertEqual((trocada.json()["tipo"], trocada.json()["rascunho"]["titulo"]), ("habilidade", "Passo Leve"))
        # Sem o tipo no pedido, o comportamento de antes: o tipo continua.
        mantida = self.client.put(f"{base}/{definicao['id']}/rascunho", json={"rascunho": comum, "versao_esperada": 1})
        self.assertEqual(mantida.json()["tipo"], "habilidade")
        conflito = self.client.put(f"{base}/{definicao['id']}/rascunho", json={
            "rascunho": comum, "versao_esperada": 0, "tipo": "efeito"})
        self.assertEqual(conflito.status_code, 409)
        publicada = self.client.post(f"{base}/{definicao['id']}/publicacao", json={"versao_esperada": 2})
        self.assertEqual((publicada.status_code, publicada.json()["tipo"]), (201, "habilidade"))
        recusa = self.client.put(f"{base}/{definicao['id']}/rascunho", json={
            "rascunho": comum, "versao_esperada": 3, "tipo": "magia"})
        self.assertEqual(recusa.status_code, 409)
        self.assertIn("tipo de uma carta publicada", recusa.text)
        # Mandar o mesmo tipo depois de publicar não é troca.
        igual = self.client.put(f"{base}/{definicao['id']}/rascunho", json={
            "rascunho": comum, "versao_esperada": 3, "tipo": "habilidade"})
        self.assertEqual(igual.status_code, 200, igual.text)

    def test_dados_do_item_seguem_os_campos_do_subtipo(self):
        mochila = {"subtipo": "mochila", "largura": 2, "altura": 2, "mochila": {"linhas": 1, "colunas": 0}}
        casos = {
            "tipo de dano fora da lista": ({**ESPADA, "dados": {"tipo_dano": "Gelatinoso"}}, {"dados.tipo_dano"}),
            "armadura negativa": ({**ESPADA, "item_tipo": "armadura", "formato": {"subtipo": "peitoral", "largura": 2, "altura": 3},
                                   "dados": {"armadura": -1}}, {"dados.armadura"}),
            "dano em mochila": ({**ESPADA, "item_tipo": "outro", "formato": mochila, "dados": {"dano": "1d4"}}, {"dados.dano"}),
            "peso em qualquer subtipo": ({**ESPADA, "dados": {"dano": "1d8", "peso": 2}}, {"dados.peso"}),
        }
        for nome, (rascunho, campos) in casos.items():
            with self.subTest(nome):
                definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": "item", "rascunho": rascunho}).json()
                resposta = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/publicacao", json={"versao_esperada": 0})
                self.assertEqual(resposta.status_code, 422, resposta.text)
                problemas = resposta.json()["detail"]["problemas"]
                self.assertEqual({p["campo"] for p in problemas}, campos)
                if nome == "dano em mochila":
                    self.assertEqual(problemas[0]["mensagem"], "Não se aplica a este tipo de item.")
        # Sem formato, os dados ainda não são conferidos: a falta do formato é a pendência.
        sem_formato = {k: v for k, v in ESPADA.items() if k != "formato"}
        definicao = self.as_("mestre").post("/mesas/mesa/cartas", json={"tipo": "item", "rascunho": {
            **sem_formato, "dados": {"dano": "1d4", "armadura": 3}}}).json()
        validacao = self.client.post(f"/mesas/mesa/cartas/{definicao['id']}/validacao").json()
        self.assertEqual({p["campo"] for p in validacao["problemas"]}, {"formato"})
        espada = self.publicar("item", {**ESPADA, "dados": {
            "dano": "1d8", "tipo_dano": "Cortante", "atributo_ataque": ["Força", "Destreza"], "alcance_normal": 0,
            "propriedades": ["Versátil", "Lâmina de família"]}})
        self.assertEqual(espada["conteudo"]["dados"]["atributo_ataque"], ["Força", "Destreza"])

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

    def test_apresentacao_vista_uma_vez_por_participante(self):
        bola = self.publicar("magia", BOLA)
        apresentacao = self.as_("mestre").post("/mesas/mesa/apresentacoes", json={
            "versao_id": bola["id"], "destinatarios": []}).json()
        caminho = f"/mesas/mesa/apresentacoes/{apresentacao['id']}/visualizacao"
        self.assertEqual(len(self.as_("ana").get("/mesas/mesa/apresentacoes").json()), 1)
        # Ana fecha a carta: ao recarregar, ela não volta; Bruno ainda não viu e continua recebendo.
        self.assertEqual(self.as_("ana").post(caminho).status_code, 204)
        self.assertEqual(self.as_("ana").post(caminho).status_code, 204)
        self.assertEqual(self.as_("ana").get("/mesas/mesa/apresentacoes").json(), [])
        self.assertEqual(len(self.as_("bruno").get("/mesas/mesa/apresentacoes").json()), 1)
        [narrador] = self.as_("mestre").get("/mesas/mesa/apresentacoes").json()
        self.assertEqual(narrador["vista_por"], ["ana"])
        # Recolhida, não se marca mais; e quem não é destinatário não marca.
        restrita = self.as_("mestre").post("/mesas/mesa/apresentacoes", json={
            "versao_id": bola["id"], "destinatarios": ["ana"]}).json()
        self.assertEqual(self.as_("bruno").post(f"/mesas/mesa/apresentacoes/{restrita['id']}/visualizacao").status_code, 404)
        self.as_("mestre").post(f"/mesas/mesa/apresentacoes/{apresentacao['id']}/recolhimento")
        self.assertEqual(self.as_("bruno").post(caminho).status_code, 404)

    # ------------------------------------------------------- redesenhar-aba-cartas

    def test_custos_de_aprendizado_so_para_o_narrador(self):
        reservados = {"custo_aprendizado", "descansos_minimos", "custo_legado"}
        adicional = [{"recurso": "Exaustão", "valor": 1}]
        magia = self.publicar("magia", {**BOLA, "custo_legado": "3 PP e 1 descanso", "custos_adicionais": adicional})
        outra = self.publicar("magia", {**BOLA, "titulo": "Raio"})

        def conferir(conteudo, narrador):
            with self.subTest(narrador=narrador, titulo=conteudo["titulo"]):
                if narrador:
                    self.assertEqual((conteudo["custo_aprendizado"], conteudo["descansos_minimos"]), (3, 1))
                else:
                    self.assertFalse(reservados & set(conteudo), conteudo)
                self.assertEqual((conteudo["potencia_uso"], conteudo["custo_uso"]), (4, 2))

        # Ficha: lista e transição.
        carta = self.conceder(magia["id"]).json()["cartas"][0]
        conferir(carta["carta"]["conteudo"], narrador=True)
        [minha] = self.cartas("ana", "lia")
        conferir(minha["carta"]["conteudo"], narrador=False)
        self.assertEqual(minha["carta"]["conteudo"]["custos_adicionais"], [{**adicional[0], "descricao": None}])
        conferir(self.cartas("mestre", "lia")[0]["carta"]["conteudo"], narrador=True)
        iniciada = self.transicao("ana", "lia", carta["id"], "iniciar_aprendizado").json()["cartas"][0]
        conferir(iniciada["carta"]["conteudo"], narrador=False)
        concluida = self.transicao("mestre", "lia", carta["id"], "concluir_aprendizado").json()["cartas"][0]
        self.assertEqual(concluida["estado"], "aprendida")
        conferir(concluida["carta"]["conteudo"], narrador=True)
        self.assertEqual(self.cartas("mestre", "lia")[0]["carta"]["conteudo"]["custo_legado"], "3 PP e 1 descanso")

        # Oferta: candidatas e resposta.
        oferta = self.criar_oferta([outra["id"]], ["bram"], minimo=1, maximo=1).json()
        conferir(oferta["candidatas"][0]["conteudo"], narrador=True)
        [vista] = self.as_("bruno").get("/mesas/mesa/ofertas").json()
        conferir(vista["candidatas"][0]["conteudo"], narrador=False)
        conferir(self.as_("mestre").get("/mesas/mesa/ofertas").json()[0]["candidatas"][0]["conteudo"], narrador=True)
        resposta = self.as_("bruno").post(f"/mesas/mesa/ofertas/{oferta['id']}/respostas/bram",
                                          json={"escolhas": [outra["id"]], "versao_esperada": 0})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        conferir(resposta.json()["cartas"][0]["carta"]["conteudo"], narrador=False)

        # Apresentação.
        self.as_("mestre").post("/mesas/mesa/apresentacoes", json={"versao_id": outra["id"], "destinatarios": []})
        conferir(self.as_("ana").get("/mesas/mesa/apresentacoes").json()[0]["carta"]["conteudo"], narrador=False)
        conferir(self.as_("mestre").get("/mesas/mesa/apresentacoes").json()[0]["carta"]["conteudo"], narrador=True)

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
