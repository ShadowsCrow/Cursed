"""Complemento das fichas existentes (tarefa 8.1 de calcular-valores-da-ficha)."""

from __future__ import annotations

import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from cursed_platform import catalogos
from cursed_platform.completar_fichas import completar
from cursed_platform.persistence import (
    Base, CartaDefinicaoRegistro, CartaPersonagemRegistro, EventoAuditoriaRegistro, MesaRegistro, PersonagemRegistro,
)

CATALOGO = catalogos.ler()


def _ficha(**personagem):
    return {"personagem": {"nome": "Ayla", **personagem},
            "atributos": {"valores": {"Vigor": 3, "Proposito": 2, "Força": 0}},
            "recursos": {"pv": {"atual": 4, "maximo": 30, "escala": 9}}}


class CompletarFichasTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="n"))
        self.session.flush()
        self.session.add_all([
            PersonagemRegistro(id="mago", mesa_id="mesa", versao=0, ficha=_ficha(classe="mago", arquetipo="mutante  arcano", raca="elfo")),
            PersonagemRegistro(id="grande", mesa_id="mesa", versao=0, ficha=_ficha(classe="Mago", raca="Elfo", tamanho="Grande")),
            PersonagemRegistro(id="medio", mesa_id="mesa", versao=0, ficha=_ficha(classe="Mago", raca="Elfo", tamanho="Médio")),
            PersonagemRegistro(id="guerreiro", mesa_id="mesa", versao=0, ficha=_ficha(classe="Guerreiro", raca="Elfa")),
            PersonagemRegistro(id="veterana", mesa_id="mesa", versao=0, ficha={**_ficha(classe="Mago", raca="Elfo"),
                               "personagem": {"nome": "Veterana", "classe": "Mago", "raca": "Elfo", "nivel": 7}}),
            PersonagemRegistro(id="lobo", mesa_id="mesa", versao=0, tipo="monstro", ficha={"personagem": {"nome": "Lobo"}}),
        ])
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def ficha(self, personagem_id):
        self.session.expire_all()
        return self.session.get(PersonagemRegistro, personagem_id).ficha

    def aplicar(self):
        relatorio = completar(self.session, "mesa", CATALOGO, aplicar=True)
        self.session.commit()
        return {f.personagem_id: f for f in relatorio.fichas}, relatorio

    def test_previa_nao_grava_nada(self):
        antes = {p: self.ficha(p) for p in ("mago", "grande", "guerreiro")}
        relatorio = completar(self.session, "mesa", CATALOGO)
        self.session.rollback()
        self.assertEqual({p: self.ficha(p) for p in antes}, antes)
        self.assertEqual(self.session.query(CartaDefinicaoRegistro).count(), 0)
        mago = next(f for f in relatorio.fichas if f.personagem_id == "mago")
        self.assertIn("Nível 1 definido pela migração; o Narrador confirma ou corrige.", mago.alteracoes)
        self.assertGreater(mago.cartas_previstas, 0)

    def test_nivel_1_pv_pp_cheios_e_vinculo_por_nome_normalizado(self):
        resultados, _ = self.aplicar()
        ficha = self.ficha("mago")
        p = ficha["personagem"]
        self.assertEqual((p["classe"], p["arquetipo"], p["raca"], p["nivel"], p["nivel_pela_migracao"]),
                         ("Mago", "Mutante Arcano", "Elfo", 1, True))
        self.assertEqual((ficha["recursos"]["pv"]["atual"], ficha["recursos"]["pp"]["atual"]), (15, 10))
        # Irregularidade antiga não alterada pela migração não bloqueia (Força 0 continua).
        self.assertEqual(ficha["atributos"]["valores"]["Força"], 0)
        self.assertEqual(resultados["mago"].erros, [])

    def test_nivel_existente_e_mantido(self):
        self.aplicar()
        p = self.ficha("veterana")["personagem"]
        self.assertEqual(p["nivel"], 7)
        self.assertNotIn("nivel_pela_migracao", p)

    def test_tamanho_igual_a_raca_e_limpo_e_divergente_so_sinalizado(self):
        resultados, _ = self.aplicar()
        self.assertNotIn("tamanho", self.ficha("medio")["personagem"])
        grande = self.ficha("grande")["personagem"]
        self.assertEqual(grande["tamanho"], "Grande")
        self.assertNotIn("tamanho_raca", grande)
        self.assertTrue(any("confirmar a exceção" in s for s in resultados["grande"].sinalizacoes))

    def test_fora_do_catalogo_e_sinalizado_sem_troca(self):
        resultados, _ = self.aplicar()
        p = self.ficha("guerreiro")["personagem"]
        self.assertEqual((p["classe"], p["raca"]), ("Guerreiro", "Elfa"))
        self.assertEqual(len(resultados["guerreiro"].sinalizacoes), 4)  # classe, raça e PV/PP não calculáveis

    def test_cartas_de_classe_concedidas_e_auditoria_da_migracao(self):
        self.aplicar()
        mago = CATALOGO.classe("Mago")
        esperadas = len(mago.habilidades) + len(mago.arquetipo("Mutante Arcano").habilidades)
        posses = self.session.scalars(select(CartaPersonagemRegistro).where(CartaPersonagemRegistro.personagem_id == "mago")).all()
        self.assertEqual(len(posses), esperadas)
        evento = self.session.scalar(select(EventoAuditoriaRegistro).where(
            EventoAuditoriaRegistro.acao == "ficha.completada", EventoAuditoriaRegistro.personagem_id == "mago"))
        self.assertEqual(evento.origem, "migracao")

    def test_repeticao_nao_duplica_nada_nem_escolhe_motivo_para_o_tamanho(self):
        self.aplicar()
        fichas = {p: self.ficha(p) for p in ("mago", "grande", "medio", "guerreiro", "veterana")}
        contagens = (self.session.query(CartaDefinicaoRegistro).count(), self.session.query(CartaPersonagemRegistro).count(),
                     self.session.query(EventoAuditoriaRegistro).count())
        # Depois de jogar: PV gasto não pode voltar ao máximo numa nova execução.
        mago = self.session.get(PersonagemRegistro, "mago")
        mago.ficha = {**mago.ficha, "recursos": {**mago.ficha["recursos"], "pv": {"atual": 3}}}
        self.session.commit()
        fichas["mago"] = self.ficha("mago")
        resultados, _ = self.aplicar()
        self.assertEqual({p: self.ficha(p) for p in fichas}, fichas)
        self.assertEqual((self.session.query(CartaDefinicaoRegistro).count(), self.session.query(CartaPersonagemRegistro).count(),
                          self.session.query(EventoAuditoriaRegistro).count()), contagens)
        self.assertTrue(any("confirmar a exceção" in s for s in resultados["grande"].sinalizacoes))

    def test_npc_e_monstro_ficam_de_fora(self):
        _, relatorio = self.aplicar()
        self.assertEqual(relatorio.ignoradas, ["Lobo"])
        self.assertEqual(self.ficha("lobo"), {"personagem": {"nome": "Lobo"}})


if __name__ == "__main__":
    unittest.main()
