"""Modelo e instâncias de personagem (instancias-de-personagem, tarefas 1.1 a 3.2)."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from uuid import uuid4

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session

from cursed_platform import instancias
from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import (
    CartaDefinicaoRegistro, CartaPersonagemRegistro, CartaVersaoRegistro, EfeitoAplicadoRegistro, EventoAuditoriaRegistro,
    ItemInventarioRegistro, PersonagemRegistro,
)
from cursed_platform.tests.test_rolagens import Ator, create_app, get_actor
from cursed_platform.tests.test_turno import banco, montar_mesa

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


def ficha_do_lagarto() -> dict:
    return {
        "personagem": {"nome": "Lagarto-macaco", "classe": "Feiticeiro", "arquetipo": "Arcano", "raca": "Elfo", "nivel": 2,
                       "imagem_ativo": "mesa/retratos/lagarto.png"},
        "atributos": {"valores": {"Raciocínio": 2, "Propósito": 2, "Vigor": 3}},
        "pericias": {"valores": {"Prontidão": 1}},
        "recursos": {"pv": {"atual": 4}, "pp": {"atual": 1}},
        "desgaste": {"exaustao": 3, "estresse": 2},
        "consequencias": [{"id": "c1", "categoria": "ferimento_grave", "nome": "Perna torta"}],
        "efeitos_externos": [{"nome": "Velho"}],
    }


def _carta(session: Session, mesa_id: str, chave: str, titulo: str) -> str:
    definicao = CartaDefinicaoRegistro(id=f"def-{chave}", mesa_id=mesa_id, tipo="habilidade", criado_por="mestre",
                                       versao=1, versao_publicada=1, rascunho={})
    session.add(definicao)
    session.flush()
    versao = CartaVersaoRegistro(id=f"ver-{chave}", mesa_id=mesa_id, definicao_id=definicao.id, numero=1, tipo="habilidade",
                                 conteudo={"titulo": titulo, "texto": "x", "tipo": "habilidade", "ativacao": "ativa",
                                           "custo_uso": 1, "requisitos": [], "tags": [], "ativos": []},
                                 procedencia={}, revisao_pendente=[], publicado_por="mestre")
    session.add(versao)
    session.flush()
    return versao.id


class MigracaoInstanciasTest(unittest.TestCase):
    def test_coluna_indice_e_vinculo(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'instancias.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0032_instancias_de_personagem")
                    self.assertIn("instancia_de", {col["name"] for col in inspect(c).get_columns("characters")})
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    for pid, modelo in (("modelo", None), ("inst", "modelo")):
                        c.execute(text("INSERT INTO characters (id, mesa_id, tipo, visibilidade, versao, ficha, revelacao, instancia_de) "
                                       "VALUES (:id, 'm', 'monstro', 'mesa', 0, '{}', '{}', :modelo)"), {"id": pid, "modelo": modelo})
                    self.assertEqual(c.execute(text("SELECT instancia_de FROM characters WHERE id = 'inst'")).scalar(), "modelo")
                with engine.begin() as c:
                    command.downgrade(config(c), "0031_uso_de_cartas")
                self.assertNotIn("instancia_de", {col["name"] for col in inspect(engine).get_columns("characters")})
            finally:
                engine.dispose()


class CriarInstanciaTest(unittest.TestCase):
    def setUp(self):
        self.engine = banco()
        montar_mesa(self.engine)
        self.session = Session(self.engine)
        self.modelo = PersonagemRegistro(id="lagarto", mesa_id="mesa", proprietario_id=None, tipo="monstro",
                                         visibilidade="narrador", versao=0, ficha=ficha_do_lagarto(),
                                         revelacao={"nome_publico": "Criatura", "imagem": False})
        self.session.add(self.modelo)
        self.session.flush()
        self.session.add_all([
            ItemInventarioRegistro(id="lanca", mesa_id="mesa", personagem_id="lagarto", tipo="arma", nome="Lança", quantidade=1,
                                   equipado=True, dados={"dano": "1d8"}),
            ItemInventarioRegistro(id="pocao", mesa_id="mesa", personagem_id="lagarto", tipo="outro", nome="Poção", quantidade=2,
                                   equipado=False, dados={}),
        ])
        versao = _carta(self.session, "mesa", "grito", "Grito de Guerra")
        self.session.add(CartaPersonagemRegistro(id="posse-grito", mesa_id="mesa", personagem_id="lagarto", definicao_id="def-grito",
                                                 versao_id=versao, tipo="habilidade", estado="aprendida", origem="concessao"))
        self.session.add(EfeitoAplicadoRegistro(id="ef1", mesa_id="mesa", personagem_id="lagarto", nome="Sangrando", descricao="x",
                                                estado="ativo", conteudo={}))
        self.session.flush()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_copia_completa_sem_historia_e_com_recursos_cheios(self):
        instancia = instancias.criar(self.session, self.modelo)
        self.assertEqual(instancia.ficha["personagem"]["nome"], "Lagarto-macaco 1")
        self.assertEqual((instancia.tipo, instancia.visibilidade, instancia.proprietario_id), ("monstro", "narrador", None))
        self.assertEqual(instancia.revelacao, {"nome_publico": "Criatura", "imagem": False})
        self.assertEqual((instancia.instancia_de, instancias.numero_de(instancia)), ("lagarto", 1))
        # Identidade e retrato vêm; a história não; PV e PP cheios (Feiticeiro nível 2: PV 10 + 3 + 3 = 16? calculado).
        self.assertEqual(instancia.ficha["personagem"]["imagem_ativo"], "mesa/retratos/lagarto.png")
        self.assertEqual(instancia.ficha["atributos"]["valores"]["Vigor"], 3)
        self.assertNotIn("desgaste", instancia.ficha)
        self.assertNotIn("consequencias", instancia.ficha)
        self.assertEqual(instancia.ficha["efeitos_externos"], [])
        from cursed_platform import catalogos
        from cursed_platform.domain import recursos
        calculado = recursos.calcular(instancia.ficha, catalogos.obter())
        self.assertEqual(instancia.ficha["recursos"]["pv"]["atual"], calculado.maximo("pv"))
        self.assertEqual(instancia.ficha["recursos"]["pp"]["atual"], calculado.maximo("pp"))
        self.assertGreater(instancia.ficha["recursos"]["pv"]["atual"], 4)
        # Inventário copiado com ids novos; cartas aprendidas copiadas; efeito aplicado não.
        itens = {i.nome: i for i in self.session.scalars(select(ItemInventarioRegistro).where(ItemInventarioRegistro.personagem_id == instancia.id))}
        self.assertEqual(set(itens), {"Lança", "Poção"})
        self.assertTrue(itens["Lança"].equipado and itens["Lança"].id != "lanca" and itens["Lança"].dados == {"dano": "1d8"})
        posses = list(self.session.scalars(select(CartaPersonagemRegistro).where(CartaPersonagemRegistro.personagem_id == instancia.id)))
        self.assertEqual([(p.versao_id, p.estado) for p in posses], [("ver-grito", "aprendida")])
        self.assertEqual(self.session.scalars(select(EfeitoAplicadoRegistro).where(EfeitoAplicadoRegistro.personagem_id == instancia.id)).all(), [])
        # O modelo não mudou.
        self.assertEqual(self.modelo.ficha["recursos"]["pv"]["atual"], 4)
        self.assertEqual(self.modelo.ficha["personagem"]["nome"], "Lagarto-macaco")

    def test_numeracao_nao_reutiliza_e_modelo_editado_nao_muda_a_instancia(self):
        primeira = instancias.criar(self.session, self.modelo)
        segunda = instancias.criar(self.session, self.modelo)
        self.assertEqual(segunda.ficha["personagem"]["nome"], "Lagarto-macaco 2")
        from datetime import UTC, datetime
        segunda.excluido_em = datetime.now(UTC)
        self.session.flush()
        self.modelo.ficha = {**self.modelo.ficha, "atributos": {"valores": {**self.modelo.ficha["atributos"]["valores"], "Vigor": 5}}}
        self.session.flush()
        terceira = instancias.criar(self.session, self.modelo)
        self.assertEqual(terceira.ficha["personagem"]["nome"], "Lagarto-macaco 3")
        self.assertEqual(terceira.ficha["atributos"]["valores"]["Vigor"], 5)
        self.assertEqual(primeira.ficha["atributos"]["valores"]["Vigor"], 3)
        self.assertEqual([p.id for p in instancias.instancias_de(self.session, self.modelo)], [primeira.id, terceira.id])

    def test_so_modelo_serve_e_promover_tira_o_vinculo(self):
        instancia = instancias.criar(self.session, self.modelo)
        with self.assertRaises(instancias.InstanciaInvalida):
            instancias.criar(self.session, instancia)
        with self.assertRaises(instancias.InstanciaInvalida):
            instancias.criar(self.session, self.session.get(PersonagemRegistro, "lion"))
        with self.assertRaises(instancias.InstanciaInvalida):
            instancias.promover(self.session, self.modelo)
        instancias.promover(self.session, instancia)
        self.assertIsNone(instancia.instancia_de)
        self.assertIn("promovida_em", instancia.procedencia["instancia"])
        self.assertTrue(instancias.eh_modelo(instancia))
        # Promovida vira modelo: a instância dela recebe o nome dela numerado.
        neta = instancias.criar(self.session, instancia)
        self.assertEqual(neta.ficha["personagem"]["nome"], "Lagarto-macaco 1 1")

    def test_fora_da_cena(self):
        from cursed_platform import sala
        cena = self.session.scalar(select(sala.CenaRegistro))
        camada = self.session.scalar(select(sala.CamadaCenaRegistro).where(sala.CamadaCenaRegistro.visibilidade == "mesa"))
        na_cena = instancias.criar(self.session, self.modelo)
        fora = instancias.criar(self.session, self.modelo)
        sala.criar_token(self.session, cena, camada_id=camada.id, rotulo="Lagarto-macaco 1", x=2, y=2, personagem_id=na_cena.id)
        self.assertEqual([p.id for p in instancias.fora_da_cena(self.session, self.modelo, cena.id)], [fora.id])


class InstanciasApiTest(unittest.TestCase):
    def setUp(self):
        self.engine = banco()
        montar_mesa(self.engine)
        with Session(self.engine) as session:
            session.add(PersonagemRegistro(id="lagarto", mesa_id="mesa", proprietario_id=None, tipo="monstro", visibilidade="mesa",
                                           versao=0, ficha=ficha_do_lagarto()))
            session.commit()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.ator = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)
        cena = self.client.get("/mesas/mesa/sala").json()["cena"]
        self.cena = cena["id"]
        self.camada = next(c["id"] for c in cena["camadas"] if c["visibilidade"] == "mesa")

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def como(self, ator):
        self.ator = ator
        return self.client

    def colocar(self, personagem_id, instanciar=True, x=5):
        return self.como("mestre").post(f"/mesas/mesa/sala/cenas/{self.cena}/tokens", json={
            "camada_id": self.camada, "rotulo": "Lagarto-macaco", "x": x, "y": 5, "tamanho": 1, "personagem_id": personagem_id,
            "oculto": False, "instanciar": instanciar})

    def personagens(self):
        return {p["nome"]: p for p in self.como("mestre").get("/mesas/mesa/personagens").json()}

    def test_colocar_tres_vezes_cria_tres_instancias(self):
        tokens = [self.colocar("lagarto", x=x) for x in (5, 6, 7)]
        self.assertTrue(all(t.status_code == 201 for t in tokens), [t.text for t in tokens])
        ids = {t.json()["personagem_id"] for t in tokens}
        self.assertEqual(len(ids), 3)
        self.assertNotIn("lagarto", ids)
        self.assertEqual([t.json()["rotulo"] for t in tokens], ["Lagarto-macaco 1", "Lagarto-macaco 2", "Lagarto-macaco 3"])
        lista = self.personagens()
        self.assertEqual({lista[n]["instancia_de"] for n in ("Lagarto-macaco 1", "Lagarto-macaco 2", "Lagarto-macaco 3")}, {"lagarto"})
        self.assertEqual(lista["Lagarto-macaco 2"]["numero_da_instancia"], 2)
        self.assertIsNone(lista["Lagarto-macaco"]["instancia_de"])
        # Cartas de catálogo (Feiticeiro Arcano) concedidas à instância, e o registro da mesa.
        with Session(self.engine) as session:
            posses = session.scalars(select(CartaPersonagemRegistro).where(CartaPersonagemRegistro.personagem_id == tokens[0].json()["personagem_id"],
                                                                           CartaPersonagemRegistro.estado == "aprendida")).all()
            self.assertTrue(any(p.concedida_por == "classe:Feiticeiro" for p in posses))
            self.assertEqual(session.scalar(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == "personagem.instanciado")).detalhes["numero"], 1)
        # O jogador não coloca.
        self.assertEqual(self.como("ana").post(f"/mesas/mesa/sala/cenas/{self.cena}/tokens", json={
            "camada_id": self.camada, "rotulo": "x", "x": 1, "y": 1, "tamanho": 1, "personagem_id": "lagarto", "oculto": False,
            "instanciar": True}).status_code, 403)

    def test_personagem_de_jogador_e_instancia_entram_como_eles_mesmos(self):
        lion = self.colocar("lion")
        self.assertEqual((lion.status_code, lion.json()["personagem_id"]), (201, "lion"))
        primeira = self.colocar("lagarto").json()["personagem_id"]
        de_novo = self.colocar(primeira)
        self.assertEqual(de_novo.json()["personagem_id"], primeira)
        self.assertEqual(len([p for p in self.personagens().values() if p["instancia_de"]]), 1)

    def test_modo_turno_recebe_cada_instancia_sozinha(self):
        self.como("mestre").post("/mesas/mesa/sala/sessoes")
        for x in (5, 6):
            self.colocar("lagarto", x=x)
        combate = self.client.post("/mesas/mesa/sala/turno").json()["combate"]
        nomes = sorted(p["nome"] for p in combate["participantes"] if p["nome"].startswith("Lagarto"))
        self.assertEqual(nomes, ["Lagarto-macaco 1", "Lagarto-macaco 2"])
        self.assertTrue(all(p["tokens"] == 1 for p in combate["participantes"] if p["nome"].startswith("Lagarto")))

    def test_promover_e_limpar(self):
        primeira = self.colocar("lagarto", x=5).json()["personagem_id"]
        segunda = self.colocar("lagarto", x=6).json()["personagem_id"]
        terceira = self.colocar("lagarto", x=7).json()["personagem_id"]
        token_da_segunda = next(t for t in self.client.get("/mesas/mesa/sala").json()["cena"]["tokens"] if t["personagem_id"] == segunda)
        self.client.delete(f"/mesas/mesa/sala/tokens/{token_da_segunda['id']}", params={"versao_esperada": token_da_segunda["versao"]})
        # Promover só pelo Narrador e só instâncias.
        self.assertEqual(self.como("ana").post(f"/mesas/mesa/personagens/{primeira}/promocao").status_code, 403)
        self.assertEqual(self.como("mestre").post("/mesas/mesa/personagens/lagarto/promocao").status_code, 409)
        promovida = self.client.post(f"/mesas/mesa/personagens/{primeira}/promocao")
        self.assertEqual(promovida.status_code, 200, promovida.text)
        self.assertIsNone(promovida.json()["instancia_de"])
        self.assertEqual(promovida.json()["nome"], "Lagarto-macaco 1")
        # Limpar: a segunda está fora da cena; a terceira, na cena; a promovida não é mais instância.
        limpeza = self.client.post(f"/mesas/mesa/personagens/lagarto/instancias/limpeza", params={"cena_id": self.cena})
        self.assertEqual((limpeza.status_code, limpeza.json()["excluidas"], limpeza.json()["ids"]), (200, 1, [segunda]))
        with Session(self.engine) as session:
            self.assertIsNotNone(session.get(PersonagemRegistro, segunda).excluido_em)
            self.assertIsNone(session.get(PersonagemRegistro, terceira).excluido_em)
        # O acervo lista o modelo e a promovida, não a instância.
        acervo = [p["nome"] for p in self.como("mestre").get("/acervo/personagens", params={"colecao": "monstros"}).json()]
        self.assertIn("Lagarto-macaco", acervo)
        self.assertIn("Lagarto-macaco 1", acervo)
        self.assertNotIn("Lagarto-macaco 3", acervo)

    def test_excluir_a_ficha_leva_os_tokens_e_excluir_o_token_mantem_a_ficha(self):
        """Decisão do usuário em 2026-10-06: a ficha na lixeira não deixa token órfão em cena nenhuma; tirar o token da
        cena mantém a instância disponível para "Colocar" de novo."""
        primeira = self.colocar("lagarto", x=5).json()["personagem_id"]
        segunda = self.colocar("lagarto", x=6).json()["personagem_id"]
        # A primeira também está numa segunda cena, fechada.
        outra = self.client.post("/mesas/mesa/sala/cenas", json={"nome": "Caverna", "colunas": 8, "linhas": 8}).json()["cena"]
        camada = next(c["id"] for c in outra["camadas"] if c["visibilidade"] == "mesa")
        self.assertEqual(self.client.post(f"/mesas/mesa/sala/cenas/{outra['id']}/tokens", json={
            "camada_id": camada, "rotulo": "Lagarto-macaco 1", "x": 1, "y": 1, "tamanho": 1, "personagem_id": primeira,
            "oculto": False, "instanciar": False}).status_code, 201)

        def tokens_de(cena_id, *ids):
            return [t for t in self.client.get("/mesas/mesa/sala", params={"cena_id": cena_id}).json()["cena"]["tokens"]
                    if t["personagem_id"] in (ids or (primeira, segunda))]

        versao = self.personagens()["Lagarto-macaco 1"]["versao"]
        excluida = self.client.delete(f"/mesas/mesa/personagens/{primeira}", params={"versao_esperada": versao})
        self.assertEqual(excluida.status_code, 204, excluida.text)
        self.assertEqual([t["personagem_id"] for t in tokens_de(self.cena)], [segunda])
        self.assertEqual(tokens_de(outra["id"]), [])
        with Session(self.engine) as session:
            removidos = session.scalars(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == "token.removido")).all()
            self.assertEqual(sorted(e.resumo for e in removidos), ["Token removido com a ficha: Lagarto-macaco 1"] * 2)
            self.assertEqual({e.detalhes["cena_id"] for e in removidos}, {self.cena, outra["id"]})
        # O caminho inverso: tirar o token da segunda não mexe na ficha dela, e "Colocar" a traz de volta.
        token = tokens_de(self.cena)[0]
        self.assertEqual(self.client.delete(f"/mesas/mesa/sala/tokens/{token['id']}", params={"versao_esperada": token["versao"]}).status_code, 204)
        self.assertEqual(tokens_de(self.cena), [])
        self.assertIsNone(self.personagens()["Lagarto-macaco 2"].get("excluido_em"))
        with Session(self.engine) as session:
            self.assertIsNone(session.get(PersonagemRegistro, segunda).excluido_em)
        de_volta = self.colocar(segunda, instanciar=False, x=3)
        self.assertEqual((de_volta.status_code, de_volta.json()["personagem_id"]), (201, segunda))
        # A limpeza também tira o token que a instância tinha em outra cena.
        terceira = self.colocar("lagarto", x=7).json()["personagem_id"]
        token = tokens_de(self.cena, terceira)[0]
        self.client.delete(f"/mesas/mesa/sala/tokens/{token['id']}", params={"versao_esperada": token["versao"]})
        self.assertEqual(self.client.post(f"/mesas/mesa/sala/cenas/{outra['id']}/tokens", json={
            "camada_id": camada, "rotulo": "Lagarto-macaco 3", "x": 2, "y": 2, "tamanho": 1, "personagem_id": terceira,
            "oculto": False, "instanciar": False}).status_code, 201)
        limpeza = self.client.post("/mesas/mesa/personagens/lagarto/instancias/limpeza", params={"cena_id": self.cena}).json()
        self.assertEqual(limpeza["ids"], [terceira])
        self.assertEqual(tokens_de(outra["id"], terceira), [])


if __name__ == "__main__":
    unittest.main()
