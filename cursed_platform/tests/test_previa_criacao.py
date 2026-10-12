"""Prévia de ficha não gravada (tarefa 2.1 de criacao-guiada-e-nova-estetica)."""

from __future__ import annotations

import unittest

from cursed_platform import catalogos
from cursed_platform.domain import previa_criacao


def _rascunho(**personagem):
    return {
        "personagem": {"nome": "Lia", **personagem},
        "atributos": {"valores": {"Força": 1, "Destreza": 2, "Vigor": 2, "Carisma": 1, "Manipulação": 1,
                                  "Propósito": 2, "Percepção": 3, "Inteligência": 2, "Raciocínio": 1}},
    }


class PreviaCriacaoTest(unittest.TestCase):
    catalogo = catalogos.ler()

    def test_mago_com_vigor_e_proposito_2(self):
        previa = previa_criacao.previa(_rascunho(classe="Mago"), self.catalogo)
        v = previa.valores
        self.assertEqual((v.maximo("pv"), v.escala("pv"), v.maximo("pp"), v.escala("pp")), (14, 4, 10, 7))
        self.assertEqual([(f.tipo, f.valor) for f in v["pv_maximo"].fontes], [("classe", 12), ("atributo", 2)])
        self.assertEqual([(f.tipo, f.rotulo) for f in v["escala_pp"].fontes],
                         [("classe", "Base de Escala de PP do Mago"), ("atributo", "Propósito")])
        self.assertEqual(previa.problemas, ())

    def test_sem_classe_nao_e_calculavel(self):
        v = previa_criacao.previa(_rascunho(), self.catalogo).valores
        for nome in ("pv_maximo", "escala_pv", "pp_maximo", "escala_pp"):
            self.assertFalse(v[nome].calculavel)
            self.assertIsNone(v[nome].total)
            self.assertEqual(v[nome].motivo, "Classe não definida.")

    def test_ficha_nova_comeca_no_nivel_1_sem_alterar_o_rascunho(self):
        rascunho = _rascunho(classe="Mago")
        self.assertEqual(previa_criacao.ficha_nova(rascunho)["personagem"]["nivel"], 1)
        self.assertNotIn("nivel", rascunho["personagem"])

    def test_problemas_por_campo(self):
        rascunho = _rascunho(nome="", classe="Mago", arquetipo="Assassino")
        rascunho["atributos"]["valores"]["Vigor"] = 6
        campos = {p.caminho for p in previa_criacao.previa(rascunho, self.catalogo).problemas}
        self.assertEqual(campos, {"personagem.nome", "personagem.arquetipo", "atributos.valores.Vigor"})


if __name__ == "__main__":
    unittest.main()
