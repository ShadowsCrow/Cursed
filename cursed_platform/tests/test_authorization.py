from __future__ import annotations

import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro, PersonagemRegistro


class AuthorizationMatrixTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.session.add_all(
            [
                MesaRegistro(id="a", nome="A", narrador_id="mestre"),
                MesaRegistro(id="b", nome="B", narrador_id="jogador-a"),
            ]
        )
        self.session.flush()
        self.session.add_all(
            [
                MembroRegistro(mesa_id="a", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="a", usuario_id="jogador-a", papel="jogador"),
                MembroRegistro(mesa_id="a", usuario_id="jogador-b", papel="jogador"),
                MembroRegistro(mesa_id="a", usuario_id="removido", papel="jogador", ativo=False),
                MembroRegistro(mesa_id="b", usuario_id="jogador-a", papel="narrador"),
                MembroRegistro(mesa_id="b", usuario_id="mestre", papel="jogador"),
            ]
        )
        self.session.flush()
        self.session.add_all(
            [
                PersonagemRegistro(
                    id="visivel", mesa_id="a", proprietario_id="jogador-a", ficha={}
                ),
                PersonagemRegistro(
                    id="oculto", mesa_id="a", proprietario_id="jogador-a",
                    visibilidade="narrador", ficha={},
                ),
                PersonagemRegistro(
                    id="outro", mesa_id="b", proprietario_id="mestre", ficha={}
                ),
            ]
        )
        self.session.flush()
        self.authorizer = Autorizador(self.session)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_allow_deny_matrix(self):
        cases = (
            (Acao.LER_MESA, "mestre", "a", None, True),
            (Acao.LER_MESA, "mestre", "b", None, True),
            (Acao.CONVIDAR, "mestre", "a", None, True),
            (Acao.CONVIDAR, "mestre", "b", None, False),
            (Acao.CONVIDAR, "jogador-a", "b", None, True),
            (Acao.LISTAR_PARTICIPANTES, "jogador-b", "a", None, True),
            (Acao.LER_MESA, "externo", "a", None, False),
            (Acao.LER_MESA, "removido", "a", None, False),
            (Acao.LER_FICHA, "jogador-a", "a", "visivel", True),
            (Acao.LER_FICHA, "jogador-b", "a", "visivel", False),
            (Acao.LER_FICHA, "mestre", "a", "visivel", True),
            (Acao.LER_FICHA, "jogador-a", "a", "oculto", False),
            (Acao.EDITAR_FICHA, "jogador-a", "a", "visivel", True),
            (Acao.EDITAR_FICHA, "jogador-b", "a", "visivel", False),
            (Acao.EDITAR_FICHA, "mestre", "a", "visivel", True),
            (Acao.CRIAR_PERSONAGEM, "jogador-b", "a", None, True),
            (Acao.APLICAR_EFEITO, "jogador-b", "a", None, False),
            (Acao.APLICAR_EFEITO, "mestre", "a", None, True),
            ("acao_desconhecida", "mestre", "a", None, False),
        )
        for action, user, table, character, expected in cases:
            with self.subTest(action=action, user=user, table=table, character=character):
                decision = self.authorizer.decidir(
                    action, usuario_id=user, mesa_id=table, personagem_id=character
                )
                self.assertEqual(decision.permitido, expected)

    def test_table_policy_can_deny_player_actions_without_limiting_narrator(self):
        table = self.session.get(MesaRegistro, "a")
        table.permitir_criacao_propria = False
        table.permitir_edicao_propria = False
        table.permitir_exclusao_propria = False
        self.session.flush()
        for action, character in (
            (Acao.CRIAR_PERSONAGEM, None),
            (Acao.EDITAR_FICHA, "visivel"),
            (Acao.EXCLUIR_PERSONAGEM, "visivel"),
        ):
            with self.subTest(action=action):
                self.assertFalse(self.authorizer.decidir(
                    action, usuario_id="jogador-a", mesa_id="a", personagem_id=character
                ).permitido)
                self.assertTrue(self.authorizer.decidir(
                    action, usuario_id="mestre", mesa_id="a", personagem_id=character
                ).permitido)


if __name__ == "__main__":
    unittest.main()
