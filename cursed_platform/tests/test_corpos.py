"""Corpos genéricos por Tamanho como cartas de item padrão (carga-por-espacos 6.1)."""

from __future__ import annotations

import unittest

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from cursed_platform import corpos
from cursed_platform.persistence import CartaDefinicaoRegistro, CartaVersaoRegistro
from cursed_platform.tests import test_api_recipientes as base

ESPERADOS = {
    "Corpo Minúsculo": (2, 3), "Corpo Minúsculo (com ajuda)": (2, 2),
    "Corpo Pequeno": (3, 4), "Corpo Pequeno (com ajuda)": (3, 2),
    "Corpo Médio": (4, 5), "Corpo Médio (com ajuda)": (4, 3),
    "Corpo Grande": (5, 7), "Corpo Grande (com ajuda)": (5, 4),
}


class CorposPadraoTest(unittest.TestCase):
    """Mesmo cenário do chão e baú: mesa criada direto no banco, sem os corpos."""

    tearDown = base.ApiRecipientesTest.tearDown
    as_ = base.ApiRecipientesTest.as_
    versao = base.ApiRecipientesTest.versao

    def setUp(self):
        base.ApiRecipientesTest.setUp(self)

    def corpos(self, mesa: str = "mesa") -> dict[str, dict]:
        resposta = self.as_("mestre").get(f"/mesas/{mesa}/cartas")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return {d["publicada"]["conteudo"]["titulo"]: d for d in resposta.json()
                if d["procedencia_rascunho"].get("origem") == "sistema"}

    def test_mesa_nova_ja_tem_os_oito_corpos_publicados(self):
        mesa = self.as_("mestre").post("/mesas", json={"nome": "Outra mesa"}).json()["id"]
        with Session(self.engine) as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(CartaDefinicaoRegistro).where(
                CartaDefinicaoRegistro.mesa_id == mesa)), 8)
        vistos = self.corpos(mesa)
        self.assertEqual({t: (d["publicada"]["conteudo"]["formato"]["largura"], d["publicada"]["conteudo"]["formato"]["altura"])
                          for t, d in vistos.items()}, ESPERADOS)
        medio = vistos["Corpo Médio"]["publicada"]["conteudo"]
        self.assertEqual((medio["item_tipo"], medio["formato"]["subtipo"]), ("outro", "outro"))

    def test_mesa_existente_recebe_os_corpos_uma_unica_vez(self):
        self.assertEqual(set(self.corpos()), set(ESPERADOS))
        self.assertEqual(set(self.corpos()), set(ESPERADOS))
        with Session(self.engine) as session:
            self.assertEqual(corpos.garantir(session, "mesa"), 0)
            self.assertEqual(session.scalar(select(func.count()).select_from(CartaVersaoRegistro).where(
                CartaVersaoRegistro.definicao_id.like("corpo-%"))), 8)

    def test_metade_da_altura_arredonda_para_cima(self):
        self.assertEqual([corpos.dimensoes(t, True) for t in ("minusculo", "pequeno", "medio", "grande")],
                         [(2, 2), (3, 2), (4, 3), (5, 4)])

    def test_corpos_nao_se_editam_nem_se_republicam(self):
        medio = self.corpos()["Corpo Médio"]
        rascunho = self.as_("mestre").put(f"/mesas/mesa/cartas/{medio['id']}/rascunho", json={
            "rascunho": {**medio["rascunho"], "titulo": "Outro"}, "versao_esperada": medio["versao"]})
        self.assertEqual(rascunho.status_code, 409)
        publicada = self.as_("mestre").post(f"/mesas/mesa/cartas/{medio['id']}/publicacao",
                                            json={"versao_esperada": medio["versao"]})
        self.assertEqual(publicada.status_code, 409)
        self.assertEqual(self.corpos()["Corpo Médio"]["publicada"]["numero"], 1)

    def test_narrador_concede_o_corpo_e_ele_ocupa_a_grade(self):
        medio = self.corpos()["Corpo Médio"]
        concedido = self.as_("mestre").post("/mesas/mesa/personagens/lia/cartas", json={
            "versao_id": medio["publicada"]["id"], "excecao_aprendizado": False, "versao_esperada": self.versao("lia")})
        self.assertIn(concedido.status_code, {200, 201}, concedido.text)
        grade = self.as_("ana").get("/mesas/mesa/personagens/lia/inventario/grade").json()
        [corpo] = [i for i in grade["itens"] if i["nome"] == "Corpo Médio"]
        self.assertEqual((corpo["subtipo"], corpo["largura"], corpo["altura"], corpo["coluna"]), ("outro", 4, 5, None))
        arrumado = self.as_("ana").put("/mesas/mesa/personagens/lia/inventario/arrumacao", json={
            "versao_esperada": grade["versao"],
            "itens": [{"item_id": corpo["id"], "coluna": 0, "linha": 0, "girado": False, "equipado": False}]})
        self.assertEqual(arrumado.status_code, 200, arrumado.text)
        self.assertEqual((arrumado.json()["celulas_ocupadas"], arrumado.json()["sobrecarga"]), (20, False))


if __name__ == "__main__":
    unittest.main()
