from __future__ import annotations

import unittest

from cursed_platform import catalogos
from cursed_platform.domain import recursos
from cursed_platform.domain.descanso import ParametrosDescanso, aplicar
from cursed_platform.domain.descanso import calcular as calcular_descanso
from cursed_platform.domain.recursos import FonteRecurso, Recursos, ValorRecurso


def _valor(nome: str, total):
    if total is None:
        return ValorRecurso(f"recurso:{nome}", nome, False, motivo="Classe não definida.")
    return ValorRecurso(f"recurso:{nome}", nome, True, (FonteRecurso("classe", "Base", total),))


def calcular(f, parametros, **kwargs):
    """Isola a regra do descanso: máximo e Escala dos fixtures entram como valores calculados."""
    calculado = {}
    for recurso in ("pv", "pp"):
        dados = f.get("recursos", {}).get(recurso, {})
        calculado[f"{recurso}_maximo"] = _valor(f"{recurso}_maximo", dados.get("maximo"))
        calculado[f"escala_{recurso}"] = _valor(f"escala_{recurso}", dados.get("escala"))
    return calcular_descanso(f, parametros, calculado=Recursos(calculado), **kwargs)


def ficha(pv=(2, 20, 8), pp=(0, 12, 6), exaustao=7, estresse=5):
    return {
        "personagem": {"nome": "Teste"},
        "recursos": {
            "pv": dict(zip(("atual", "maximo", "escala"), pv)),
            "pp": dict(zip(("atual", "maximo", "escala"), pp)),
        },
        "desgaste": {"exaustao": exaustao, "estresse": estresse},
    }


def valores(resultado):
    return (
        {r.recurso: r.aplicado for r in resultado.recursos},
        {t.trilha: t.aplicado for t in resultado.trilhas},
    )


class DescansoTest(unittest.TestCase):
    def test_exemplo_do_livro_descanso_longo(self):
        conforto3 = calcular(ficha(), ParametrosDescanso("longo", 3, 2))
        self.assertEqual(valores(conforto3), ({"pv": 6, "pp": 4}, {"exaustao": 1, "estresse": 1}))
        refugio = calcular(ficha(), ParametrosDescanso("longo", 4, 4))
        self.assertEqual(valores(refugio), ({"pv": 8, "pp": 6}, {"exaustao": 2, "estresse": 2}))

    def test_tabela_de_conforto_sem_minimo_no_descanso_longo(self):
        esperado = {0: (0, 0, 0, 0), 1: (2, 1, 0, 0), 2: (4, 3, 1, 1), 3: (6, 4, 1, 1), 4: (8, 6, 2, 2)}
        for conforto, (pv, pp, estresse, exaustao) in esperado.items():
            with self.subTest(conforto=conforto):
                r = calcular(ficha(), ParametrosDescanso("longo", conforto, 0))
                self.assertEqual(valores(r), ({"pv": pv, "pp": pp}, {"exaustao": exaustao, "estresse": estresse}))
        pequena = calcular(ficha(pv=(0, 10, 3)), ParametrosDescanso("longo", 1, 1))
        self.assertEqual(pequena.recursos[0].aplicado, 0)

    def test_descanso_curto_com_minimo_de_um_e_sem_estresse(self):
        r = calcular(ficha(pv=(0, 10, 1), pp=(0, 10, 5)), ParametrosDescanso("curto"))
        self.assertEqual(valores(r), ({"pv": 1, "pp": 2}, {"exaustao": 1, "estresse": 0}))

    def test_foco_de_repouso_exige_quatro_e_quatro(self):
        r = calcular(ficha(), ParametrosDescanso("longo", 4, 4), foco="pv")
        self.assertEqual(r.recursos[0].aplicado, 12)
        r = calcular(ficha(), ParametrosDescanso("longo", 4, 4), foco="estresse")
        self.assertEqual(r.trilhas[1].aplicado, 3)
        with self.assertRaisesRegex(ValueError, "Conforto 4 e Segurança 4"):
            calcular(ficha(), ParametrosDescanso("longo", 4, 3), foco="pv")

    def test_limites_de_maximo_e_zero_e_faixas(self):
        r = calcular(ficha(pv=(18, 20, 8), exaustao=1, estresse=0), ParametrosDescanso("longo", 4, 4))
        self.assertEqual((r.recursos[0].aplicado, r.recursos[0].depois), (2, 20))
        self.assertEqual([(t.aplicado, t.depois) for t in r.trilhas], [(1, 0), (0, 0)])
        faixas = calcular(ficha(exaustao=6), ParametrosDescanso("curto")).trilhas[0]
        self.assertEqual((faixas.faixa_antes, faixas.faixa_depois), ("Cansado", "Estável"))

    def test_ausencias_nao_inventam_valores(self):
        sem_escala = {"recursos": {"pv": {"atual": 1, "maximo": 10}}, "desgaste": {}}
        r = calcular(sem_escala, ParametrosDescanso("longo", 4, 4))
        self.assertEqual([(x.calculado, x.aplicado) for x in r.recursos], [(None, 0), (None, 0)])
        self.assertEqual(len(r.avisos), 2)
        self.assertEqual(aplicar(sem_escala, r), sem_escala)
        manual = calcular(sem_escala, ParametrosDescanso("longo", 4, 4), ajustes={"pv": 3})
        self.assertEqual(manual.recursos[0].aplicado, 3)

    def test_ajustes_e_aplicacao(self):
        r = calcular(ficha(), ParametrosDescanso("longo", 2, 2), ajustes={"pv": 1, "estresse": 0})
        self.assertEqual(valores(r), ({"pv": 1, "pp": 3}, {"exaustao": 1, "estresse": 0}))
        nova = aplicar(ficha(), r)
        self.assertEqual((nova["recursos"]["pv"]["atual"], nova["recursos"]["pp"]["atual"]), (3, 3))
        self.assertEqual(nova["desgaste"], {"exaustao": 6, "estresse": 5})
        self.assertEqual(nova["personagem"], {"nome": "Teste"})
        for invalido in ({"pv": -1}, {"xp": 1}):
            with self.subTest(ajuste=invalido), self.assertRaises(ValueError):
                calcular(ficha(), ParametrosDescanso("curto"), ajustes=invalido)
        for parametros in (ParametrosDescanso("longo", None, 2), ParametrosDescanso("longo", 5, 2),
                           ParametrosDescanso("medio")):
            with self.subTest(parametros=parametros), self.assertRaises(ValueError):
                calcular(ficha(), parametros)


    def test_escala_vem_da_classe_e_ignora_a_gravada(self):
        # Mago com Vigor 3: Escala de PV 5; a escala 99 gravada numa ficha antiga não conta.
        mago = {
            "personagem": {"nome": "Ayla", "classe": "Mago", "nivel": 1},
            "atributos": {"valores": {"Vigor": 3, "Proposito": 2}},
            "recursos": {"pv": {"atual": 0, "maximo": 99, "escala": 99}, "pp": {"atual": 0}},
        }
        calculado = recursos.calcular(mago, catalogos.ler())
        r = calcular_descanso(mago, ParametrosDescanso("curto"), calculado=calculado)
        self.assertEqual([(x.calculado, x.maximo) for x in r.recursos], [(2, 15), (3, 10)])

    def test_descanso_curto_apos_subida_de_vigor(self):
        mago = {"personagem": {"classe": "Mago", "nivel": 1}, "atributos": {"valores": {"Vigor": 5, "Proposito": 2}},
                "recursos": {"pv": {"atual": 0}, "pp": {"atual": 0}}}
        r = calcular_descanso(mago, ParametrosDescanso("curto"), calculado=recursos.calcular(mago, catalogos.ler()))
        self.assertEqual(r.recursos[0].calculado, 3)  # Escala de PV 2 + 5 = 7; metade, arredondada para baixo

    def test_recurso_nao_calculavel_informa_o_motivo(self):
        sem_classe = {"personagem": {"classe": "Bardo Errante", "nivel": 1}, "recursos": {"pv": {"atual": 1}}}
        r = calcular_descanso(sem_classe, ParametrosDescanso("longo", 4, 4),
                              calculado=recursos.calcular(sem_classe, catalogos.ler()))
        self.assertEqual([x.aplicado for x in r.recursos], [0, 0])
        self.assertIn("não está no catálogo", r.avisos[0])

if __name__ == "__main__":
    unittest.main()
