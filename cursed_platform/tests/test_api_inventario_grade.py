"""API da grade de carga: leitura e arrumação tudo ou nada (carga-por-espacos, tarefa 4.1)."""

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
from cursed_platform.persistence import (
    Base, CenaRegistro, EfeitoAplicadoRegistro, EventoAuditoriaRegistro, FonteEfeitoRegistro, ItemInventarioRegistro,
    ItemRecipienteRegistro, MembroRegistro, MesaRegistro, OperacaoEfeitoRegistro, PersonagemRegistro,
)

API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

BASE = "/mesas/mesa-1/personagens/bram"
FICHA = {
    "personagem": {"nome": "Bram", "raca": "Humano"},
    "atributos": {"valores": {"Força": 3}, "ajustes": {}, "totais": {}},
    "pericias": {"valores": {}, "ajustes": {}, "totais": {}},
}


def item(id_: str, nome: str, subtipo: str | None, largura: int | None, altura: int | None,
         coluna: int | None = None, linha: int | None = None, **extra) -> ItemInventarioRegistro:
    tipo = {"uma_mao": "arma", "duas_maos": "arma", "peitoral": "armadura", "capacete": "armadura",
            "escudo": "armadura"}.get(subtipo or "", "outro")
    return ItemInventarioRegistro(
        id=id_, mesa_id="mesa-1", personagem_id="bram", tipo=tipo, nome=nome, quantidade=1, equipado=extra.pop("equipado", False),
        dados=extra.pop("dados", {}), subtipo=subtipo, largura=largura, altura=altura, coluna=coluna, linha=linha, **extra,
    )


class ApiInventarioGradeTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa-1", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa-1", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="jogador", papel="jogador"),
                MembroRegistro(mesa_id="mesa-1", usuario_id="outro", papel="jogador"),
            ])
            session.flush()
            session.add(PersonagemRegistro(id="bram", mesa_id="mesa-1", proprietario_id="jogador", ficha=FICHA))
            session.flush()
            session.add_all([
                item("espada", "Espada longa", "uma_mao", 1, 3, 0, 0, equipado=True),
                item("escudo", "Escudo", "escudo", 2, 2, 1, 0),
                item("elmo", "Elmo", "capacete", 2, 2, 1, 2, equipado=True),
                item("capuz", "Capuz", "capacete", 1, 1, 3, 0),
                item("tocha", "Tocha", "outro", 1, 2, 0, 3, maos=1),
                item("antigo", "Espada antiga", None, None, None, dados={"peso": 3}),
            ])
            session.commit()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:", api_host="127.0.0.1",
                                    api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.actor = "jogador"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def grade(self) -> dict:
        resposta = self.client.get(f"{BASE}/inventario/grade")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return resposta.json()

    def arrumar(self, *posicoes: dict, versao: int | None = None):
        atual = self.grade()
        por_id = {i["id"]: i for i in atual["itens"]}
        itens = []
        for p in posicoes:
            base = por_id[p["item_id"]]
            itens.append({"item_id": p["item_id"], "coluna": p.get("coluna", base["coluna"]), "linha": p.get("linha", base["linha"]),
                          "girado": p.get("girado", base["girado"]), "equipado": p.get("equipado", base["equipado"]),
                          **({"maos": p["maos"]} if "maos" in p else {})})
        return self.client.put(f"{BASE}/inventario/arrumacao",
                               json={"versao_esperada": atual["versao"] if versao is None else versao, "itens": itens})

    def eventos(self) -> list[EventoAuditoriaRegistro]:
        with Session(self.engine) as session:
            return list(session.scalars(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == "grade.arrumada")))

    def test_le_grade_pela_forca_e_pela_raca(self):
        grade = self.grade()
        self.assertEqual((grade["forca"], grade["tamanho"], grade["tamanho_origem"]), (3, "medio", "raca"))
        self.assertEqual((grade["colunas_verdes"], grade["linhas_verdes"], grade["linhas"]), (5, 5, 6))
        self.assertFalse(grade["sobrecarga"])
        antigo = next(i for i in grade["itens"] if i["id"] == "antigo")
        self.assertIsNone(antigo["largura"])

    def test_mover_para_a_linha_vermelha_entra_em_sobrecarga_e_registra(self):
        resposta = self.arrumar({"item_id": "tocha", "coluna": 0, "linha": 5, "girado": True})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        self.assertTrue(corpo["sobrecarga"])
        self.assertEqual(corpo["itens_em_sobrecarga"], ["tocha"])
        self.assertEqual(corpo["versao"], 1)
        self.assertEqual(len(self.eventos()), 1)

    def test_retirar_para_a_bandeja_e_colocar_de_volta_ficam_no_registro(self):
        retirado = self.arrumar({"item_id": "capuz", "coluna": None, "linha": None})
        self.assertEqual(retirado.status_code, 200, retirado.text)
        colocado = self.arrumar({"item_id": "capuz", "coluna": 3, "linha": 1})
        self.assertEqual(colocado.status_code, 200, colocado.text)
        [saida, entrada] = self.eventos()
        self.assertEqual(saida.resumo, "Bram: Capuz retirado para a bandeja")
        self.assertEqual(entrada.resumo, "Bram: Capuz colocado na grade")
        self.assertEqual([(m["campo"], m["antes"], m["depois"]) for m in entrada.detalhes["mudancas"]],
                         [("inventario.capuz.na_grade", False, True)])

    def test_item_equipado_nao_vai_para_a_bandeja(self):
        resposta = self.arrumar({"item_id": "elmo", "coluna": None, "linha": None})
        self.assertEqual(resposta.status_code, 422)
        self.assertEqual(resposta.json()["detail"][0]["motivo"], "fora_da_grade")
        tirado = self.arrumar({"item_id": "elmo", "coluna": None, "linha": None, "equipado": False})
        self.assertEqual(tirado.status_code, 200, tirado.text)
        self.assertIn("Elmo retirado para a bandeja", self.eventos()[0].resumo)
        self.assertIn("Elmo desequipado", self.eventos()[0].resumo)

    def test_item_na_bandeja_nao_se_equipa(self):
        self.assertEqual(self.arrumar({"item_id": "capuz", "coluna": None, "linha": None}).status_code, 200)
        com_elmo_fora = self.arrumar({"item_id": "elmo", "equipado": False})
        self.assertEqual(com_elmo_fora.status_code, 200)
        resposta = self.arrumar({"item_id": "capuz", "equipado": True})
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("fora_da_grade", {p["motivo"] for p in resposta.json()["detail"]})

    def test_redefinir_formato_que_tira_da_grade_desequipa(self):
        self.actor = "mestre"
        resposta = self.client.put(f"{BASE}/inventario/espada/formato", json={
            "versao_esperada": self.grade()["versao"], "formato": {"subtipo": "uma_mao", "largura": 1, "altura": 4}})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual((resposta.json()["item"]["coluna"], resposta.json()["item"]["equipado"]), (None, False))

    def tornar_espada_versatil(self):
        self.actor = "mestre"
        resposta = self.client.put(f"{BASE}/inventario/espada/formato", json={
            "versao_esperada": self.grade()["versao"], "formato": {"subtipo": "uma_mao", "largura": 1, "altura": 3, "versatil": True}})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.actor = "jogador"
        # O formato mantém a dimensão, então a espada continua no lugar e equipada.
        espada = next(i for i in self.grade()["itens"] if i["id"] == "espada")
        self.assertEqual((espada["dados"].get("versatil"), espada["maos"], espada["equipado"]), (True, 1, True))

    def test_arma_versatil_alterna_entre_uma_e_duas_maos_e_registra(self):
        self.tornar_espada_versatil()
        duas = self.arrumar({"item_id": "espada", "maos": 2})
        self.assertEqual(duas.status_code, 200, duas.text)
        self.assertEqual(duas.json()["maos_ocupadas"], 2)
        self.assertIn("Espada longa empunhada com duas mãos", self.eventos()[-1].resumo)
        escudo = self.arrumar({"item_id": "escudo", "equipado": True})
        self.assertEqual(escudo.status_code, 422)
        self.assertIn("maos_insuficientes", {p["motivo"] for p in escudo.json()["detail"]})
        uma = self.arrumar({"item_id": "espada", "maos": 1}, {"item_id": "escudo", "equipado": True})
        self.assertEqual(uma.status_code, 200, uma.text)
        self.assertEqual(uma.json()["maos_ocupadas"], 2)

    def test_arma_nao_versatil_nao_troca_de_empunhadura(self):
        resposta = self.arrumar({"item_id": "espada", "maos": 2})
        self.assertEqual(resposta.status_code, 422)
        self.assertEqual(resposta.json()["detail"][0]["motivo"], "nao_versatil")

    def test_so_arma_de_uma_mao_pode_ser_versatil(self):
        self.actor = "mestre"
        resposta = self.client.put(f"{BASE}/inventario/escudo/formato", json={
            "versao_esperada": self.grade()["versao"], "formato": {"subtipo": "escudo", "largura": 2, "altura": 2, "versatil": True}})
        self.assertEqual(resposta.status_code, 422)

    def test_mover_sem_mudar_estado_nao_gera_evento(self):
        resposta = self.arrumar({"item_id": "capuz", "coluna": 3, "linha": 1})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(self.eventos(), [])

    def test_sobreposicao_e_recusada_sem_gravar(self):
        resposta = self.arrumar({"item_id": "capuz", "coluna": 1, "linha": 0})
        self.assertEqual(resposta.status_code, 422)
        self.assertEqual(resposta.json()["detail"][0]["motivo"], "sobreposicao")
        capuz = next(i for i in self.grade()["itens"] if i["id"] == "capuz")
        self.assertEqual((capuz["coluna"], capuz["linha"]), (3, 0))

    def test_fora_da_grade_e_recusado(self):
        resposta = self.arrumar({"item_id": "capuz", "coluna": 3, "linha": 6})
        self.assertEqual(resposta.status_code, 422)
        self.assertEqual(resposta.json()["detail"][0]["motivo"], "fora_da_grade")

    def test_segundo_capacete_e_recusado(self):
        resposta = self.arrumar({"item_id": "capuz", "equipado": True})
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("peca_repetida", {p["motivo"] for p in resposta.json()["detail"]})

    def test_maos_excedidas_sao_recusadas(self):
        resposta = self.arrumar({"item_id": "escudo", "equipado": True}, {"item_id": "tocha", "equipado": True})
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("maos_insuficientes", {p["motivo"] for p in resposta.json()["detail"]})

    def test_arma_e_escudo_cabem_nas_duas_maos(self):
        resposta = self.arrumar({"item_id": "escudo", "equipado": True})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(resposta.json()["maos_ocupadas"], 2)

    def test_conflito_de_versao(self):
        resposta = self.arrumar({"item_id": "capuz", "coluna": 3, "linha": 1}, versao=7)
        self.assertEqual(resposta.status_code, 409)

    def test_item_sem_dimensao_nao_entra_na_grade(self):
        resposta = self.arrumar({"item_id": "antigo", "coluna": 3, "linha": 1})
        self.assertEqual(resposta.status_code, 422)
        self.assertEqual(resposta.json()["detail"][0]["motivo"], "sem_dimensao")

    def test_tamanho_indefinido(self):
        with Session(self.engine) as session:
            p = session.get(PersonagemRegistro, "bram")
            p.ficha = {**FICHA, "personagem": {"nome": "Bram", "raca": "Centauro"}}
            session.commit()
        self.assertEqual(self.client.get(f"{BASE}/inventario/grade").status_code, 409)

    def test_equipar_pelo_comando_antigo_tambem_respeita_a_grade(self):
        resposta = self.client.post(f"{BASE}/inventario/capuz/equipar", json={"equipado": True, "versao_esperada": 0})
        self.assertEqual(resposta.status_code, 422)

    def test_narrador_define_formato_de_item_sem_dimensao(self):
        self.actor = "mestre"
        versao = self.grade()["versao"]
        resposta = self.client.put(f"{BASE}/inventario/antigo/formato", json={
            "versao_esperada": versao, "formato": {"subtipo": "uma_mao", "largura": 1, "altura": 3}})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        item = resposta.json()["item"]
        self.assertEqual((item["tipo"], item["subtipo"], item["largura"], item["altura"], item["coluna"]),
                         ("arma", "uma_mao", 1, 3, None))
        self.assertEqual(item["dados"]["peso"], 3)

    def test_mudar_formato_tira_da_grade_e_desequipa_se_mudar_subtipo(self):
        self.actor = "mestre"
        versao = self.grade()["versao"]
        resposta = self.client.put(f"{BASE}/inventario/elmo/formato", json={
            "versao_esperada": versao, "formato": {"subtipo": "outro", "largura": 1, "altura": 1, "maos": 0}})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        item = resposta.json()["item"]
        self.assertEqual((item["coluna"], item["equipado"], item["tipo"]), (None, False, "outro"))

    def test_jogador_nao_define_formato(self):
        resposta = self.client.put(f"{BASE}/inventario/antigo/formato", json={
            "versao_esperada": 0, "formato": {"subtipo": "uma_mao", "largura": 1, "altura": 3}})
        self.assertEqual(resposta.status_code, 403)

    def test_formato_incoerente_e_recusado(self):
        self.actor = "mestre"
        resposta = self.client.put(f"{BASE}/inventario/antigo/formato", json={
            "versao_esperada": 0, "formato": {"subtipo": "aljava", "largura": 1, "altura": 2}})
        self.assertEqual(resposta.status_code, 422)

    def moedas(self, **corpo):
        versao = self.grade()["versao"]
        return self.client.put(f"{BASE}/inventario/moedas", json={"versao_esperada": versao, **corpo})

    @staticmethod
    def pilhas(grade: dict) -> list[dict]:
        return [{k: i["dados"][k] for k in ("cobre", "prata", "ouro", "platina")}
                for i in sorted((i for i in grade["itens"] if i["subtipo"] == "moedas"),
                                key=lambda i: (i["linha"] is None, i["linha"] or 0, i["coluna"] or 0))]

    def test_moedas_mistas_viram_pilhas_pelo_limite_da_mesa(self):
        resposta = self.moedas(bolsa={"cobre": 40, "prata": 95, "ouro": 12})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(self.pilhas(resposta.json()), [
            {"cobre": 40, "prata": 60, "ouro": 0, "platina": 0},
            {"cobre": 0, "prata": 35, "ouro": 12, "platina": 0},
        ])
        self.assertTrue(all(i["coluna"] is not None for i in resposta.json()["itens"] if i["subtipo"] == "moedas"))
        with Session(self.engine) as session:
            self.assertEqual(session.scalar(select(EventoAuditoriaRegistro.acao).where(
                EventoAuditoriaRegistro.acao == "moedas.alteradas")), "moedas.alteradas")

    def lugares(self) -> dict[str, tuple]:
        return {i["id"]: (i["coluna"], i["linha"]) for i in self.grade()["itens"] if i["subtipo"] == "moedas"}

    def test_adicionar_enche_as_pilhas_com_espaco_e_cria_novas(self):
        self.assertEqual(self.moedas(adicionar={"cobre": 40, "prata": 30}).status_code, 200)
        lugares = self.lugares()
        resposta = self.moedas(adicionar={"prata": 50, "ouro": 12})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(self.pilhas(resposta.json()), [
            {"cobre": 40, "prata": 60, "ouro": 0, "platina": 0},
            {"cobre": 0, "prata": 20, "ouro": 12, "platina": 0},
        ])
        self.assertEqual({k: v for k, v in self.lugares().items() if k in lugares}, lugares, "a pilha antiga não muda de lugar")
        with Session(self.engine) as session:
            resumos = list(session.scalars(select(EventoAuditoriaRegistro.resumo).where(
                EventoAuditoriaRegistro.acao == "moedas.alteradas")))
        self.assertEqual(resumos[-1], "Bram: moedas — adicionou 50 de prata, 12 de ouro")

    def test_retirar_tira_das_ultimas_pilhas_e_apaga_as_que_zeram(self):
        self.moedas(bolsa={"cobre": 40, "prata": 95, "ouro": 12})
        primeira = min(self.lugares().items(), key=lambda kv: (kv[1][1], kv[1][0]))
        resposta = self.moedas(retirar={"prata": 40, "ouro": 12})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(self.pilhas(resposta.json()), [{"cobre": 40, "prata": 55, "ouro": 0, "platina": 0}])
        self.assertEqual(self.lugares(), dict([primeira]), "a primeira pilha fica onde estava")

    def test_retirar_mais_do_que_ha_e_recusado_sem_gravar(self):
        self.moedas(adicionar={"ouro": 5})
        resposta = self.moedas(retirar={"ouro": 6})
        self.assertEqual(resposta.status_code, 422)
        self.assertIn("há só 5", resposta.json()["detail"])
        self.assertEqual(self.pilhas(self.grade()), [{"cobre": 0, "prata": 0, "ouro": 5, "platina": 0}])

    def test_pedido_de_moedas_sem_quantidade_ou_com_dois_modos_e_recusado(self):
        self.assertEqual(self.moedas(adicionar={}).status_code, 422)
        self.assertEqual(self.moedas(adicionar={"ouro": 1}, retirar={"ouro": 1}).status_code, 422)

    def test_reduzir_o_limite_reorganiza_sem_perder_moedas(self):
        self.moedas(bolsa={"cobre": 40, "prata": 95, "ouro": 12})
        self.actor = "mestre"
        politica = self.client.get("/mesas/mesa-1/politicas").json()
        self.assertEqual(politica["moedas_por_pilha"], 100)
        resposta = self.client.put("/mesas/mesa-1/politicas", json={**politica, "moedas_por_pilha": 50})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        pilhas = self.pilhas(self.grade())
        self.assertEqual(len(pilhas), 3)
        self.assertTrue(all(sum(p.values()) <= 50 for p in pilhas))
        self.assertEqual({t: sum(p[t] for p in pilhas) for t in ("cobre", "prata", "ouro", "platina")},
                         {"cobre": 40, "prata": 95, "ouro": 12, "platina": 0})
        sem_campo = {k: v for k, v in politica.items() if k != "moedas_por_pilha"}
        self.client.put("/mesas/mesa-1/politicas", json=sem_campo)
        self.assertEqual(self.client.get("/mesas/mesa-1/politicas").json()["moedas_por_pilha"], 50)

    def test_pilha_acima_do_limite_e_recusada(self):
        resposta = self.moedas(pilhas=[{"ouro": 150}])
        self.assertEqual(resposta.status_code, 422)

    def test_dividir_pilhas_manualmente(self):
        resposta = self.moedas(pilhas=[{"ouro": 10}, {"ouro": 5, "prata": 3}])
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertEqual(len(self.pilhas(resposta.json())), 2)

    def test_sem_lugar_no_verde_as_moedas_vao_para_o_vermelho(self):
        with Session(self.engine) as session:
            for registro in session.scalars(select(ItemInventarioRegistro)):
                session.delete(registro)
            session.flush()
            session.add(item("fardo", "Fardo", "outro", 5, 5, 0, 0))
            session.commit()
        resposta = self.moedas(bolsa={"ouro": 150})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        self.assertTrue(corpo["sobrecarga"])
        self.assertEqual({(i["coluna"], i["linha"]) for i in corpo["itens"] if i["subtipo"] == "moedas"}, {(0, 5), (1, 5)})

    def test_sobrecarga_entra_e_sai_como_efeito_automatico(self):
        self.assertFalse(any(e["nome"] == "Sobrecarga" for e in self.client.get(f"{BASE}/efeitos").json()))
        self.arrumar({"item_id": "tocha", "coluna": 0, "linha": 5, "girado": True})
        efeitos = self.client.get(f"{BASE}/efeitos").json()
        sobrecarga = next(e for e in efeitos if e["nome"] == "Sobrecarga")
        self.assertTrue(sobrecarga["derivado"])
        self.assertIn("Deslocamento pela metade", sobrecarga["consequencias"])
        self.assertIn("Exaustão", sobrecarga["descricao"])
        self.assertIn("Tocha", sobrecarga["fontes"][0]["descricao"])
        esquiva = next(v for v in self.client.get(f"{BASE}/valores-derivados").json() if v["chave"] == "defesa:esquiva")
        self.assertIn(("efeito", -4), {(f["tipo"], f["valor"]) for f in esquiva["fontes"]})
        self.arrumar({"item_id": "tocha", "coluna": 3, "linha": 1, "girado": False})
        self.assertFalse(any(e["nome"] == "Sobrecarga" for e in self.client.get(f"{BASE}/efeitos").json()))

    def test_sobrepeso_antigo_nao_se_aplica_mais(self):
        self.actor = "mestre"
        versao = self.grade()["versao"]
        resposta = self.client.post(f"{BASE}/efeitos", json={"associacao": "cc_above", "versao_esperada": versao})
        self.assertEqual(resposta.status_code, 422, resposta.text)
        self.assertIn("Sobrecarga", resposta.text)

    def _com_mochila(self, cena_ativa: bool = True) -> None:
        with Session(self.engine) as session:
            session.add(item("mochila", "Mochila de viagem", "mochila", 2, 2, equipado=True,
                             dados={"ampliacao": {"linhas": 1, "colunas": 0}, "requisito_forca": 2}))
            session.add(item("amuleto", "Amuleto", "outro", 1, 1, 3, 5, maos=0))
            session.add(item("provisoes", "Provisões", "outro", 2, 1, 1, 5))
            session.flush()
            session.add(EfeitoAplicadoRegistro(id="ef-amuleto", mesa_id="mesa-1", personagem_id="bram", nome="Sorte",
                                               descricao="+1 em Sorte.", estado="ativo", conteudo={}))
            session.flush()
            session.add(OperacaoEfeitoRegistro(id="op-amuleto", efeito_id="ef-amuleto", tipo="modificador", alvo="pericia:sorte", valor=1))
            session.add(FonteEfeitoRegistro(id="fo-amuleto", mesa_id="mesa-1", personagem_id="bram", efeito_id="ef-amuleto",
                                            tipo="equipamento", equipamento_id="amuleto", descricao="Amuleto"))
            if cena_ativa:
                session.add(CenaRegistro(id="cena", mesa_id="mesa-1", nome="Estrada", colunas=10, linhas=10, ativa=True))
            session.commit()

    def test_largar_mochila_leva_os_itens_das_linhas_dela_para_o_chao(self):
        self._com_mochila()
        grade = self.grade()
        self.assertEqual(grade["linhas_verdes"], 6)
        self.assertFalse(grade["sobrecarga"])
        resposta = self.client.post(f"{BASE}/inventario/mochila/largar", json={"versao_esperada": grade["versao"]})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        self.assertEqual(corpo["linhas_verdes"], 5)
        ids = {i["id"] for i in corpo["itens"]}
        self.assertTrue({"espada", "escudo", "elmo", "capuz", "tocha"} <= ids)
        self.assertFalse({"mochila", "amuleto", "provisoes"} & ids)
        with Session(self.engine) as session:
            no_chao = {r.nome: r for r in session.scalars(select(ItemRecipienteRegistro))}
            self.assertEqual(set(no_chao), {"Mochila de viagem", "Amuleto", "Provisões"})
            self.assertEqual(len({r.dados["_grupo"] for r in no_chao.values()}), 1)
            self.assertEqual(no_chao["Amuleto"].efeitos[0]["operacoes"][0]["alvo"], "pericia:sorte")
            self.assertEqual(session.get(EfeitoAplicadoRegistro, "ef-amuleto").estado, "encerrado")
            self.assertEqual(session.scalar(select(EventoAuditoriaRegistro.acao).where(
                EventoAuditoriaRegistro.acao == "mochila.largada")), "mochila.largada")

    def test_desequipar_a_mochila_deixa_os_itens_dela_no_vermelho(self):
        self._com_mochila()
        resposta = self.arrumar({"item_id": "mochila", "equipado": False})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertTrue(resposta.json()["sobrecarga"])
        self.assertEqual(set(resposta.json()["itens_em_sobrecarga"]), {"amuleto", "provisoes"})

    def test_largar_mochila_sem_cena_ativa_ou_sem_mochila(self):
        self.assertEqual(self.client.post(f"{BASE}/inventario/mochila/largar", json={"versao_esperada": 0}).status_code, 409)
        self._com_mochila(cena_ativa=False)
        resposta = self.client.post(f"{BASE}/inventario/mochila/largar", json={"versao_esperada": self.grade()["versao"]})
        self.assertEqual(resposta.status_code, 409)
        self.assertIn("cena ativa", resposta.text)

    def test_outro_jogador_nao_arruma(self):
        self.actor = "outro"
        resposta = self.client.put(f"{BASE}/inventario/arrumacao", json={"versao_esperada": 0, "itens": []})
        self.assertEqual(resposta.status_code, 404)


if __name__ == "__main__":
    unittest.main()
