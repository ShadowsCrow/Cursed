from __future__ import annotations

import unittest

from cursed_platform import catalogos
from cursed_platform.domain import recursos


def _ficha(classe="Mago", nivel=1, vigor=3, proposito=2, ajustes_attr=None, recursos_=None, **personagem):
    return {
        "personagem": {"classe": classe, "nivel": nivel, **personagem},
        "atributos": {
            "valores": {"Vigor": vigor, "Proposito": proposito, "Força": 1},
            "ajustes": ajustes_attr or {},
        },
        "recursos": recursos_ or {},
    }


class CalculoRecursosTest(unittest.TestCase):
    catalogo = catalogos.ler()

    def calc(self, ficha):
        return recursos.calcular(ficha, self.catalogo)

    def test_mago_nivel_1(self):
        r = self.calc(_ficha())
        self.assertEqual(r.maximo("pv"), 15)
        self.assertEqual(r.maximo("pp"), 10)
        self.assertEqual(r.escala("pv"), 5)
        self.assertEqual(r.escala("pp"), 7)

    def test_mago_nivel_5(self):
        r = self.calc(_ficha(nivel=5))
        self.assertEqual(r.maximo("pv"), 35)
        self.assertEqual(r.maximo("pp"), 24)

    def test_fontes_do_pv_maximo_no_nivel_5(self):
        fontes = self.calc(_ficha(nivel=5))["pv_maximo"].fontes
        self.assertEqual([(f.tipo, f.valor) for f in fontes], [("classe", 12), ("atributo", 3), ("nivel", 20)])
        self.assertIn("4 aumentos de Escala de PV (5)", fontes[2].rotulo)

    def test_pp_so_sobe_nos_niveis_pares(self):
        self.assertEqual(self.calc(_ficha(nivel=2)).maximo("pp"), 17)
        self.assertEqual(self.calc(_ficha(nivel=3)).maximo("pp"), 17)

    def test_valor_permanente_e_base_mais_ajuste_da_ficha(self):
        r = self.calc(_ficha(ajustes_attr={"Vigor": 1}))
        self.assertEqual(r.maximo("pv"), 16)
        self.assertEqual(r.escala("pv"), 6)

    def test_efeito_temporario_nao_altera_o_maximo(self):
        # Efeitos ficam fora da ficha (efeitos aplicados); o cálculo só lê base e ajuste.
        ficha = _ficha()
        ficha["efeitos_externos"] = [{"nome": "Força do Urso", "modificadores": [{"alvo": "atributo:Vigor", "valor": 2}]}]
        self.assertEqual(self.calc(ficha).maximo("pv"), 15)

    def test_aumento_permanente_de_vigor_recalcula(self):
        r = self.calc(_ficha(vigor=4, nivel=2))
        self.assertEqual((r["pv_inicial"].total, r.escala("pv"), r.maximo("pv")), (16, 6, 22))

    def test_troca_de_classe_usa_novas_bases(self):
        r = self.calc(_ficha(classe="Furioso"))
        self.assertEqual((r.maximo("pv"), r.maximo("pp")), (28, 6))

    def test_classe_fora_do_catalogo_nao_e_calculavel(self):
        r = self.calc(_ficha(classe="Cavaleiro Negro"))
        for nome in recursos.ROTULOS:
            with self.subTest(nome=nome):
                self.assertFalse(r[nome].calculavel)
                self.assertIsNone(r[nome].total)
                self.assertIn("vincule a classe", r[nome].motivo)

    def test_classe_com_grafia_diferente_casa_pelo_nome_normalizado(self):
        self.assertEqual(self.calc(_ficha(classe="  mago ")).maximo("pv"), 15)

    def test_atributo_ausente_nao_e_estimado(self):
        ficha = _ficha()
        del ficha["atributos"]["valores"]["Proposito"]
        r = self.calc(ficha)
        self.assertEqual(r.maximo("pv"), 15)
        self.assertFalse(r["pp_maximo"].calculavel)
        self.assertIn("Propósito", r["pp_maximo"].motivo)

    def test_nivel_ausente_ou_invalido_deixa_so_os_maximos_nao_calculaveis(self):
        for nivel in (None, 0, 21, "x"):
            with self.subTest(nivel=nivel):
                r = self.calc(_ficha(nivel=nivel))
                self.assertEqual(r["pv_inicial"].total, 15)
                self.assertFalse(r["pv_maximo"].calculavel)
                self.assertIn("ível", r["pv_maximo"].motivo)

    def test_ajuste_do_narrador_soma_as_fontes(self):
        ajuste = {"alvo": "pv_maximo", "valor": 3, "origem": "Bênção do Templo", "justificativa": "Campanha"}
        r = self.calc(_ficha(recursos_={"ajustes": [ajuste]}))
        self.assertEqual(r.maximo("pv"), 18)
        self.assertEqual(r["pv_maximo"].fontes[-1].tipo, "ajuste_narrador")
        self.assertEqual(r["pv_maximo"].fontes[-1].rotulo, "Bênção do Templo")

    def test_ajuste_na_escala_entra_nos_aumentos_do_maximo(self):
        ajuste = {"alvo": "escala_pv", "valor": 1, "origem": "Regra da raça"}
        r = self.calc(_ficha(nivel=3, recursos_={"ajustes": [ajuste]}))
        self.assertEqual(r.escala("pv"), 6)
        self.assertEqual(r.maximo("pv"), 27)

    def test_maximo_legado_divergente_e_informado_e_ignorado(self):
        r = self.calc(_ficha(recursos_={"pv": {"atual": 10, "maximo": 20, "escala": 5}}))
        self.assertEqual(r.maximo("pv"), 15)
        self.assertEqual(r["pv_maximo"].divergencia_legada, 20)
        self.assertIsNone(r["escala_pv"].divergencia_legada)


if __name__ == "__main__":
    unittest.main()
