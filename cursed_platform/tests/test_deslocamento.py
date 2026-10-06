"""Deslocamento calculado da ficha (modo-de-turno, tarefa 6.3)."""

from __future__ import annotations

from dataclasses import replace
import unittest

from cursed_platform import catalogos
from cursed_platform.catalogos import Habilidade
from cursed_platform.ficha_viva import EfeitoAtual, Modificador, calcular_valores_derivados, fontes_do_deslocamento
from cursed_platform.persistence import FonteEfeitoRegistro, ItemInventarioRegistro

CATALOGO = catalogos.ler()


def deslocamento(ficha, inventario=(), efeitos=()):
    return next(v for v in calcular_valores_derivados(ficha, list(inventario), list(efeitos)) if v.chave == "deslocamento")


def efeito(id_, valor, *, contexto=None, item_id=None, estado="ativo"):
    fontes = [FonteEfeitoRegistro(tipo="equipamento", equipamento_id=item_id)] if item_id else []
    return EfeitoAtual(id=id_, nome=id_, descricao="", estado=estado, duracao_rodadas=None,
                       modificadores=[Modificador("deslocamento", valor, contexto)], fontes=fontes)


class DeslocamentoTest(unittest.TestCase):
    def test_base_da_raca(self):
        valor = deslocamento({"personagem": {"raca": "Humano"}})
        self.assertEqual((valor.total, valor.grupo, valor.rotulo), (9, "status", "Deslocamento"))
        self.assertEqual([(f.tipo, f.descricao) for f in valor.fontes], [("base", "Raça: Humano")])

    def test_sem_raca_vale_o_padrao_das_regras(self):
        valor = deslocamento({})
        self.assertEqual(valor.total, 9)
        self.assertEqual(valor.fontes[0].descricao, "Padrão das regras")

    def test_efeito_ativo_e_situacional(self):
        valor = deslocamento({}, efeitos=[efeito("Passo Veloz", 6), efeito("Na lama", -3, contexto="em lama"),
                                          efeito("Dormente", 4, estado="suspenso")])
        self.assertEqual(valor.total, 15)
        self.assertEqual([s.descricao for s in valor.situacionais], ["Na lama"])

    def test_item_equipado_soma_e_guardado_nao(self):
        bota = ItemInventarioRegistro(id="bota", mesa_id="m", personagem_id="p", tipo="armadura", nome="Botas Aladas",
                                      quantidade=1, equipado=True, subtipo="botas", dados={})
        guardada = ItemInventarioRegistro(id="velha", mesa_id="m", personagem_id="p", tipo="armadura", nome="Botas Velhas",
                                          quantidade=1, equipado=False, subtipo="botas", dados={})
        valor = deslocamento({}, [bota, guardada], [efeito("Aladas", 3, item_id="bota"), efeito("Velhas", 3, item_id="velha")])
        self.assertEqual(valor.total, 12)
        self.assertIn("Botas Aladas — Aladas", [f.descricao for f in valor.fontes])

    def test_bonus_de_habilidade_do_catalogo(self):
        classes = tuple(
            replace(c, habilidades=(replace(c.habilidades[0], deslocamento=3), *c.habilidades[1:])) if c.nome == "Druida" else c
            for c in CATALOGO.classes)
        racas = tuple(replace(r, habilidades=(Habilidade("Pernas Curtas", "Texto.", "Passiva", deslocamento=-2),))
                      if r.nome == "Humano" else r for r in CATALOGO.racas)
        catalogo = replace(CATALOGO, classes=classes, racas=racas)
        fontes = fontes_do_deslocamento({"personagem": {"classe": "Druida", "raca": "Humano"}}, catalogo)
        nome = CATALOGO.classe("Druida").habilidades[0].nome
        self.assertEqual([(f.tipo, f.descricao, f.valor) for f in fontes], [
            ("base", "Raça: Humano", 9), ("habilidade", f"Classe: Druida — {nome}", 3),
            ("habilidade", "Raça: Humano — Pernas Curtas", -2)])

    def test_nunca_abaixo_de_zero(self):
        self.assertEqual(deslocamento({}, efeitos=[efeito("Raízes", -20)]).total, 0)


if __name__ == "__main__":
    unittest.main()
