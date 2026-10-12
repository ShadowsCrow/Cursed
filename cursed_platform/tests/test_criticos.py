"""Faixas de crítico e de falha crítica pelo catálogo (gamificacao-da-sala, tarefas 2.2 e 2.3)."""

from __future__ import annotations

from dataclasses import replace
import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from cursed_platform import cartas_catalogo, catalogos, criticos
from cursed_platform.catalogos import Habilidade
from cursed_platform.persistence import (
    Base, CartaDefinicaoRegistro, CartaVersaoRegistro, MesaRegistro, PersonagemRegistro,
)

CATALOGO = catalogos.ler()


def _ficha(classe="Druida", arquetipo="Animalista", raca="Elfo"):
    return {"personagem": {"nome": "Ayla", "classe": classe, "arquetipo": arquetipo, "raca": raca, "nivel": 1}}


def _com_ampliacao(catalogo, classe_nome: str, indice: int, critico: int = 0, falha: int = 0):
    classes = []
    for classe in catalogo.classes:
        if classe.nome == classe_nome:
            habilidades = list(classe.habilidades)
            habilidades[indice] = replace(habilidades[indice], amplia_critico=critico, amplia_falha_critica=falha)
            classe = replace(classe, habilidades=tuple(habilidades))
        classes.append(classe)
    return replace(catalogo, classes=tuple(classes))


def _raca_com_habilidade(catalogo, raca_nome: str, falha: int):
    racas = tuple(
        replace(r, habilidades=(Habilidade("Olhos Cansados", "Texto.", "Passiva", amplia_falha_critica=falha),))
        if r.nome == raca_nome else r
        for r in catalogo.racas
    )
    return replace(catalogo, racas=racas)


class FaixaTest(unittest.TestCase):
    def test_marca_pela_faixa(self):
        self.assertEqual(criticos.PADRAO.marca(20), "critico")
        self.assertEqual(criticos.PADRAO.marca(1), "falha_critica")
        self.assertIsNone(criticos.PADRAO.marca(19))
        self.assertIsNone(criticos.PADRAO.marca(2))
        ampla = criticos.Faixa(18, 2)
        self.assertEqual([ampla.marca(v) for v in (17, 18, 2, 3)], [None, "critico", "falha_critica", None])

    def test_valor_nas_duas_faixas_e_critico(self):
        self.assertEqual(criticos.Faixa(5, 10).marca(7), "critico")


class FaixaDoPersonagemTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
        self.session.flush()
        self.personagem = PersonagemRegistro(id="p", mesa_id="mesa", proprietario_id="ana", versao=0, ficha=_ficha())
        self.session.add(self.personagem)
        self.session.flush()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def faixa(self, catalogo):
        cartas_catalogo.conceder(self.session, self.personagem, self.personagem.ficha, catalogo)
        self.session.flush()
        return criticos.faixa_do_personagem(self.session, "mesa", "p", catalogo)

    def test_sem_ampliacao_vale_o_padrao(self):
        self.assertEqual(self.faixa(CATALOGO), criticos.Faixa(20, 1))

    def test_uma_ampliacao_de_critico(self):
        self.assertEqual(self.faixa(_com_ampliacao(CATALOGO, "Druida", 0, critico=1)), criticos.Faixa(19, 1))

    def test_ampliacoes_se_somam(self):
        catalogo = _com_ampliacao(_com_ampliacao(CATALOGO, "Druida", 0, critico=1), "Druida", 1, critico=1)
        self.assertEqual(self.faixa(catalogo), criticos.Faixa(18, 1))

    def test_ampliacao_de_falha_pela_raca(self):
        self.assertEqual(self.faixa(_raca_com_habilidade(CATALOGO, "Elfo", 1)), criticos.Faixa(20, 2))

    def test_habilidade_de_outra_classe_nao_conta(self):
        self.assertEqual(self.faixa(_com_ampliacao(CATALOGO, "Mago", 0, critico=3)), criticos.Faixa(20, 1))

    def test_troca_de_classe_tira_a_ampliacao(self):
        catalogo = _com_ampliacao(CATALOGO, "Druida", 0, critico=1)
        self.assertEqual(self.faixa(catalogo), criticos.Faixa(19, 1))
        self.personagem.ficha = _ficha(classe="Mago", arquetipo="Mutante Arcano")
        self.assertEqual(self.faixa(catalogo), criticos.Faixa(20, 1))

    def test_definicao_arquivada_nao_conta(self):
        catalogo = _com_ampliacao(CATALOGO, "Druida", 0, critico=1)
        self.faixa(catalogo)
        origem = cartas_catalogo._da_classe(catalogo, "Druida")[0].origem
        definicao = self.session.scalar(select(CartaDefinicaoRegistro).where(CartaDefinicaoRegistro.origem_sistema == origem))
        definicao.arquivada = True
        self.session.flush()
        self.assertEqual(criticos.faixa_do_personagem(self.session, "mesa", "p", catalogo), criticos.Faixa(20, 1))

    def test_limites_da_faixa(self):
        catalogo = _raca_com_habilidade(_com_ampliacao(CATALOGO, "Druida", 0, critico=40), "Elfo", 40)
        self.assertEqual(self.faixa(catalogo), criticos.Faixa(2, 19))

    def test_ampliacao_nao_vai_para_a_carta(self):
        """Tarefa 2.3: a ampliação não entra no conteúdo da carta materializada."""
        catalogo = _com_ampliacao(CATALOGO, "Druida", 0, critico=1, falha=1)
        self.faixa(catalogo)
        for versao in self.session.scalars(select(CartaVersaoRegistro)):
            with self.subTest(titulo=versao.conteudo.get("titulo")):
                self.assertFalse(any("amplia" in chave for chave in versao.conteudo))
                self.assertNotIn("amplia", repr(versao.conteudo))


if __name__ == "__main__":
    unittest.main()
