"""Motor da grade no servidor: mesmos casos que a suíte TypeScript (`fixtures/grade/casos.json`)."""

from __future__ import annotations

import json
from pathlib import Path
import unittest

from cursed_platform.domain import grade as g

CASOS = json.loads((Path(__file__).resolve().parents[2] / "fixtures" / "grade" / "casos.json").read_text(encoding="utf-8"))


def _parametros(caso: dict) -> dict:
    p = caso["parametros"]
    return {"forca": p["forca"], "tamanho": p["tamanho"], "ampliacoes": g.ampliacoes_de_json(p.get("ampliacoes"))}


def _itens(caso: dict) -> list[g.ItemGrade]:
    return [g.item_de_json(i) for i in caso["itens"]]


class CasosCompartilhadosTest(unittest.TestCase):
    def test_grade(self):
        for caso in CASOS["grade"]:
            with self.subTest(caso["nome"]):
                grade = g.calcular_grade(itens=_itens(caso), **_parametros(caso))
                self.assertEqual(
                    {"colunasVerdes": grade.colunas_verdes, "linhasVerdes": grade.linhas_verdes}, caso["esperado"],
                )

    def test_posicao(self):
        for caso in CASOS["posicao"]:
            with self.subTest(caso["nome"]):
                itens = _itens(caso)
                grade = g.calcular_grade(itens=itens, **_parametros(caso))
                mover = caso["mover"]
                item = next(i for i in itens if i.id == mover["id"])
                resultado = g.validar_posicao(grade, itens, item, mover["coluna"], mover["linha"], mover["girado"])
                self.assertEqual(resultado.como_dict(), caso["esperado"])

    def test_avaliacao(self):
        for caso in CASOS["avaliacao"]:
            with self.subTest(caso["nome"]):
                itens = _itens(caso)
                resultado = g.avaliar(g.calcular_grade(itens=itens, **_parametros(caso)), itens).como_dict()
                self.assertEqual({k: resultado[k] for k in caso["esperado"]}, caso["esperado"])

    def test_equipar(self):
        for caso in CASOS["equipar"]:
            with self.subTest(caso["nome"]):
                itens = _itens(caso)
                item = next(i for i in itens if i.id == caso["equipar"])
                resultado = g.validar_equipar(itens, item, caso["forca"])
                self.assertEqual(resultado.ok, caso["esperado"]["ok"])
                self.assertEqual(resultado.motivo, caso["esperado"].get("motivo"))

    def test_moedas(self):
        for caso in CASOS["moedas"]:
            with self.subTest(caso["nome"]):
                pilhas = g.distribuir_moedas(caso["bolsa"], caso["porPilha"])
                if "esperado" in caso:
                    self.assertEqual(pilhas, caso["esperado"])
                if "esperadoQuantidade" in caso:
                    self.assertEqual(len(pilhas), caso["esperadoQuantidade"])


class ComportamentoComplementarTest(unittest.TestCase):
    def test_limites_estendem_ate_itens_em_linhas_perdidas(self):
        itens = [g.ItemGrade("c", "Corda", "outro", 1, 2, coluna=3, linha=5)]
        grade = g.calcular_grade(2, "medio")
        self.assertEqual(g.limites_fisicos(grade, itens), (5, 7))

    def test_moedas_por_pilha_invalido(self):
        with self.assertRaises(ValueError):
            g.distribuir_moedas({"cobre": 1}, 0)

    def test_regras_de_calibracao_substituem_os_numeros(self):
        regras = g.RegrasGrade(linhas_base=3, colunas_por_tamanho={**g.COLUNAS_POR_TAMANHO, "medio": 5})
        grade = g.calcular_grade(3, "medio", regras=regras)
        self.assertEqual((grade.colunas_verdes, grade.linhas_verdes), (5, 6))


class MoedasIncrementaisTest(unittest.TestCase):
    def test_adicionar_enche_na_ordem_e_cria_pilhas_novas(self):
        existentes, novas = g.adicionar_moedas([{"cobre": 90}, {"prata": 10}], {"cobre": 15, "ouro": 190}, 100)
        self.assertEqual(existentes, [{"cobre": 100, "prata": 0, "ouro": 0, "platina": 0},
                                      {"cobre": 5, "prata": 10, "ouro": 85, "platina": 0}])
        self.assertEqual(novas, [{"cobre": 0, "prata": 0, "ouro": 100, "platina": 0},
                                 {"cobre": 0, "prata": 0, "ouro": 5, "platina": 0}])

    def test_retirar_da_ultima_para_a_primeira(self):
        pilhas = g.retirar_moedas([{"prata": 60, "cobre": 40}, {"prata": 35, "ouro": 12}], {"prata": 40, "ouro": 12})
        self.assertEqual(pilhas, [{"cobre": 40, "prata": 55, "ouro": 0, "platina": 0},
                                  {"cobre": 0, "prata": 0, "ouro": 0, "platina": 0}])

    def test_retirar_mais_do_que_ha(self):
        with self.assertRaises(ValueError):
            g.retirar_moedas([{"ouro": 5}], {"ouro": 6})


if __name__ == "__main__":
    unittest.main()
