"""Deslocamento no modo turno, no domínio e na migração (modo-de-turno, tarefa 6.4)."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, select, text

from cursed_platform import sala, turno
from cursed_platform.persistence import TokenRegistro
from cursed_platform.tests.test_turno import _Base

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"
NOVE = {"lion": 9, "kira": 9, "goblin": 6, "ogro": 6}


class MovimentoTest(_Base):
    def setUp(self):
        super().setUp()
        self.com_sessao()
        self.combate = turno.entrar(self.session, "mesa", "mestre")
        # Kira e o Ogro saem da cena: sem iniciativa, travariam o Próximo turno (D8c).
        for token in self.session.scalars(select(TokenRegistro).where(TokenRegistro.personagem_id.in_(["kira", "ogro"]))):
            self.session.delete(token)
        self.session.flush()
        self.rolar(self.combate, "lion", 18)
        self.rolar(self.combate, "goblin", 12)
        turno.comecar(self.session, self.combate)
        self.lion = self.session.scalar(select(TokenRegistro).where(TokenRegistro.personagem_id == "lion"))
        self.ana = sala.Leitor("ana", False)

    def mover(self, leitor, token, x, y, livre=False):
        cobranca = turno.checar_movimento(self.session, "mesa", token, leitor, x, y, NOVE.__getitem__, livre=livre)
        token.x, token.y = x, y
        if cobranca:
            turno.cobrar(self.session, "mesa", *cobranca)
        return cobranca

    def test_custo_com_diagonal_de_1_m(self):
        self.assertEqual(turno.custo(2, 2, 5, 4), 3)
        self.assertEqual(turno.custo(5, 5, 1, 1), 4)
        self.assertEqual(turno.custo(1, 1, 1, 1), 0)
        self.assertEqual((turno.limite(9, False), turno.limite(9, True), turno.limite(-2, True)), (9, 18, 0))

    def test_anda_ate_o_deslocamento_e_recusa_o_que_passa(self):
        self.lion.x, self.lion.y = 0, 0
        self.mover(self.ana, self.lion, 4, 0)
        self.mover(self.ana, self.lion, 4, 3)
        with self.assertRaisesRegex(turno.SemDeslocamento, "Faltam 2 m de Deslocamento; o movimento custa 4 m"):
            self.mover(self.ana, self.lion, 8, 3)
        self.mover(self.ana, self.lion, 6, 5)
        self.assertEqual(self.participante(self.combate, "lion").movimento_gasto, 9)

    def test_fora_da_vez_e_de_outra_pessoa(self):
        turno.proximo(self.session, self.combate)
        with self.assertRaisesRegex(turno.ForaDaVez, "Não é a sua vez"):
            self.mover(self.ana, self.lion, self.lion.x + 1, self.lion.y)
        turno.proximo(self.session, self.combate)
        with self.assertRaises(turno.ForaDaVez):
            self.mover(sala.Leitor("bia", False), self.lion, self.lion.x + 1, self.lion.y)

    def test_narrador_gasta_o_saldo_de_quem_esta_na_vez(self):
        """Decisão do usuário (2026-10-04): o andar do NPC na vez dele conta, mesmo movido pelo Narrador."""
        mestre = sala.Leitor("mestre", True)
        turno.proximo(self.session, self.combate)  # vez do Goblin, Deslocamento 6
        goblin = self.session.scalar(select(TokenRegistro).where(TokenRegistro.personagem_id == "goblin"))
        goblin.x, goblin.y = 0, 0
        self.mover(mestre, goblin, 4, 0)
        with self.assertRaisesRegex(turno.SemDeslocamento, "Faltam 2 m"):
            self.mover(mestre, goblin, 7, 0)
        self.assertEqual(self.participante(self.combate, "goblin").movimento_gasto, 4)

    def test_token_proprio_tem_saldo_e_vez_dele(self):
        """Decisão do usuário (2026-10-05): o Goblin posto no meio da disputa joga sozinho."""
        mestre = sala.Leitor("mestre", True)
        cena = self.session.get(sala.CenaRegistro, self.ids["cena"])
        novo = sala.criar_token(self.session, cena, camada_id=self.ids["camada"], rotulo="Goblin", x=0, y=0,
                                personagem_id="goblin")
        proprio = turno.incluir(self.session, "mesa", novo)
        turno.registrar_iniciativa(self.session, self.combate, proprio, rolagem_id=None, total=3, raciocinio=0, prontidao=0)
        turno.proximo(self.session, self.combate)  # vez do grupo dos Goblins: o novo não anda
        with self.assertRaises(turno.ForaDaVez):
            self.mover(mestre, novo, 2, 0)
        turno.proximo(self.session, self.combate)  # vez do Goblin 2
        self.mover(mestre, novo, 6, 0)
        self.assertEqual((proprio.movimento_gasto, self.participante(self.combate, "goblin").movimento_gasto), (6, 0))

    def test_movimento_livre_nao_gasta_e_objetos_seguem_livres(self):
        mestre = sala.Leitor("mestre", True)
        self.assertIsNone(self.mover(mestre, self.lion, 15, 9, livre=True))
        bau = self.session.scalar(select(TokenRegistro).where(TokenRegistro.personagem_id.is_(None)))
        self.assertIsNone(self.mover(self.ana, bau, 3, 3))
        self.assertIsNone(self.mover(mestre, bau, 4, 4))
        self.assertEqual(self.participante(self.combate, "lion").movimento_gasto, 0)

    def test_narrador_fora_da_vez_so_com_movimento_livre(self):
        """Decisão do usuário (2026-10-05): fora da vez, o Narrador não move a peça errada sem querer."""
        mestre = sala.Leitor("mestre", True)
        turno.proximo(self.session, self.combate)  # vez do Goblin
        with self.assertRaisesRegex(turno.ForaDaVez, "ligue o Movimento livre"):
            self.mover(mestre, self.lion, 0, 0)
        self.assertIsNone(self.mover(mestre, self.lion, 0, 0, livre=True))
        self.assertEqual(self.participante(self.combate, "lion").movimento_gasto, 0)

    def test_na_iniciativa_o_narrador_so_move_com_movimento_livre(self):
        turno.encerrar(self.session, self.combate)
        turno.entrar(self.session, "mesa", "mestre")
        mestre = sala.Leitor("mestre", True)
        with self.assertRaises(turno.ForaDaVez):
            self.mover(mestre, self.lion, self.lion.x + 1, self.lion.y)
        self.assertIsNone(self.mover(mestre, self.lion, self.lion.x + 1, self.lion.y, livre=True))

    def test_so_o_narrador_faz_movimento_livre(self):
        with self.assertRaisesRegex(turno.ForaDaVez, "Só o Narrador"):
            self.mover(self.ana, self.lion, self.lion.x + 1, self.lion.y, livre=True)

    def test_saldo_volta_na_proxima_vez_e_correr_dobra(self):
        self.lion.x, self.lion.y = 0, 0
        self.mover(self.ana, self.lion, 5, 0)
        turno.correr(self.session, "mesa", self.ana)
        self.mover(self.ana, self.lion, 5, 9)
        lion = self.participante(self.combate, "lion")
        self.assertEqual((lion.movimento_gasto, lion.correndo), (14, True))
        turno.proximo(self.session, self.combate)
        with self.assertRaises(turno.ForaDaVez):
            turno.correr(self.session, "mesa", self.ana)
        turno.proximo(self.session, self.combate)
        lion = self.participante(self.combate, "lion")
        self.assertEqual((lion.movimento_gasto, lion.correndo, self.combate.rodada), (0, False, 2))

    def test_tokens_da_mesma_ficha_dividem_o_saldo(self):
        turno.proximo(self.session, self.combate)  # vez do Goblin, que não tem dono: o jogador não o move
        goblins = list(self.session.scalars(select(TokenRegistro).where(TokenRegistro.personagem_id == "goblin")))
        with self.assertRaises(turno.ForaDaVez):
            self.mover(self.ana, goblins[0], goblins[0].x + 1, goblins[0].y)
        # Um personagem de jogador com dois tokens divide o saldo entre eles.
        turno.proximo(self.session, self.combate)
        outro = sala.criar_token(self.session, self.session.get(sala.CenaRegistro, self.ids["cena"]),
                                 camada_id=self.ids["camada"], rotulo="Lion (reflexo)", x=0, y=0, personagem_id="lion")
        self.lion.x, self.lion.y = 0, 0
        self.mover(self.ana, self.lion, 6, 0)
        with self.assertRaises(turno.SemDeslocamento):
            self.mover(self.ana, outro, 4, 0)

    def test_na_fase_de_iniciativa_o_jogador_nao_move(self):
        turno.encerrar(self.session, self.combate)
        turno.entrar(self.session, "mesa", "mestre")
        with self.assertRaisesRegex(turno.ForaDaVez, "ainda não começou"):
            self.mover(self.ana, self.lion, self.lion.x + 1, self.lion.y)

    def test_estado_mostra_o_saldo_so_ao_dono_e_ao_narrador(self):
        self.lion.x, self.lion.y = 0, 0
        self.mover(self.ana, self.lion, 4, 0)
        def movimento(leitor):
            dados = turno.estado(self.session, "mesa", leitor, NOVE.__getitem__)["combate"]["participantes"]
            return next(p for p in dados if p["nome"] == "Lion")["movimento"]
        self.assertEqual(movimento(self.ana), {"gasto": 4, "limite": 9, "correndo": False})
        self.assertEqual(movimento(sala.Leitor("mestre", True)), {"gasto": 4, "limite": 9, "correndo": False})
        self.assertIsNone(movimento(sala.Leitor("bia", False)))


class MigracaoDeslocamentoSqliteTest(unittest.TestCase):
    def test_sobe_e_desce(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'desl.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0029_deslocamento_no_turno")
                    colunas = {col["name"] for col in inspect(c).get_columns("turn_participants")}
                    self.assertTrue({"movimento_gasto", "correndo"} <= colunas)
                with engine.begin() as c:
                    command.downgrade(config(c), "0028_modo_de_turno")
                colunas = {col["name"] for col in inspect(engine).get_columns("turn_participants")}
                self.assertFalse({"movimento_gasto", "correndo"} & colunas)
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
