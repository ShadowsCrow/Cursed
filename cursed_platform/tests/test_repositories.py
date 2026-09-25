from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
import os
import unittest
from uuid import uuid4

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from cursed_platform.persistence import (
    Base, EfeitoAplicadoRegistro, FonteEfeitoRegistro, ItemInventarioRegistro,
    MembroRegistro, MesaRegistro, OperacaoEfeitoRegistro, PersonagemRegistro,
)
from cursed_platform.repositories import (
    EfeitoRepository, FichaRepository, InventarioRepository, MesaRepository,
)


class RepositoryContractTest(unittest.TestCase):
    def test_same_repository_contract_on_local_and_disposable_postgres(self):
        databases = [("local", "sqlite:///:memory:")]
        postgres_url = os.environ.get("CURSED_TEST_POSTGRES_URL")
        if postgres_url:
            databases.append(("postgres", postgres_url))

        for name, url in databases:
            with self.subTest(database=name):
                engine = create_engine(url)
                if name == "local":
                    @event.listens_for(engine, "connect")
                    def enable_foreign_keys(connection, _record):
                        connection.execute("PRAGMA foreign_keys=ON")

                    Base.metadata.create_all(engine)
                mesa_id = f"mesa-{uuid4()}"
                personagem_id = f"personagem-{uuid4()}"
                effect_id = f"efeito-{uuid4()}"
                item_id = f"item-{uuid4()}"
                with engine.connect() as connection:
                    transaction = connection.begin()
                    try:
                        with Session(connection) as session:
                            session.add(MesaRegistro(id=mesa_id, nome="Mesa", narrador_id="mestre"))
                            session.flush()
                            session.add(MembroRegistro(mesa_id=mesa_id, usuario_id="mestre", papel="narrador"))
                            session.flush()
                            session.add(
                                PersonagemRegistro(
                                    id=personagem_id, mesa_id=mesa_id, proprietario_id="mestre", ficha={}
                                )
                            )
                            session.flush()
                            session.add_all(
                                [
                                    ItemInventarioRegistro(
                                        id=item_id, mesa_id=mesa_id, personagem_id=personagem_id,
                                        tipo="outro", nome="Lanterna", dados={},
                                    ),
                                    EfeitoAplicadoRegistro(
                                        id=effect_id, mesa_id=mesa_id, personagem_id=personagem_id,
                                        nome="Luz", descricao="Ilumina.", conteudo={},
                                    ),
                                ]
                            )
                            session.flush()
                            session.add_all(
                                [
                                    FonteEfeitoRegistro(
                                        id=f"fonte-{uuid4()}", mesa_id=mesa_id,
                                        personagem_id=personagem_id, efeito_id=effect_id,
                                        tipo="equipamento", equipamento_id=item_id,
                                    ),
                                    OperacaoEfeitoRegistro(
                                        id=f"operacao-{uuid4()}", efeito_id=effect_id,
                                        tipo="modificador", alvo="visao", valor=Decimal("1"),
                                    ),
                                ]
                            )
                            session.flush()

                            self.assertEqual(MesaRepository(session).get(mesa_id).nome, "Mesa")
                            self.assertEqual(
                                MesaRepository(session).membro(mesa_id, "mestre").papel, "narrador"
                            )
                            outra_mesa = f"outra-{uuid4()}"
                            session.add(MesaRegistro(id=outra_mesa, nome="Outra mesa", narrador_id="mestre"))
                            session.flush()
                            mesas = MesaRepository(session)
                            mesas.configurar_modulo(mesa_id, "grid", True)
                            session.flush()
                            self.assertEqual(mesas.modulos_ativos(mesa_id), {"grid"})
                            self.assertEqual(mesas.modulos_ativos(outra_mesa), set())
                            mesas.configurar_modulo(mesa_id, "grid", False)
                            session.flush()
                            self.assertEqual(mesas.modulos_ativos(mesa_id), set())
                            self.assertEqual(mesas.modulos_ativos(outra_mesa), set())
                            sheets = FichaRepository(session)
                            self.assertEqual(sheets.get(mesa_id, personagem_id).versao, 0)
                            self.assertTrue(sheets.substituir_se_versao(
                                mesa_id, personagem_id, 0, {"personagem": {"nome": "Ari"}}
                            ))
                            self.assertFalse(sheets.substituir_se_versao(
                                mesa_id, personagem_id, 0, {"personagem": {"nome": "Sobrescrita"}}
                            ))
                            session.expire_all()
                            self.assertEqual(sheets.get(mesa_id, personagem_id).versao, 1)
                            self.assertEqual(
                                sheets.get(mesa_id, personagem_id).ficha["personagem"]["nome"], "Ari"
                            )
                            self.assertEqual(
                                [item.id for item in InventarioRepository(session).listar(mesa_id, personagem_id)],
                                [item_id],
                            )
                            self.assertEqual(
                                [effect.id for effect in EfeitoRepository(session).listar(mesa_id, personagem_id)],
                                [effect_id],
                            )
                            self.assertEqual(
                                [source.equipamento_id for source in EfeitoRepository(session).fontes(
                                    mesa_id, personagem_id, effect_id
                                )],
                                [item_id],
                            )

                            MesaRepository(session).get(mesa_id).retencao_personagens_dias = 7
                            excluido_em = datetime(2026, 9, 1, tzinfo=UTC)
                            self.assertTrue(sheets.excluir(
                                mesa_id, personagem_id, 1, "mestre", agora=excluido_em
                            ))
                            session.flush()
                            self.assertIsNone(sheets.get(mesa_id, personagem_id))
                            self.assertEqual(sheets.listar(mesa_id), [])
                            self.assertFalse(sheets.substituir_se_versao(
                                mesa_id, personagem_id, 2, {"personagem": {"nome": "Invisível"}}
                            ))
                            self.assertTrue(sheets.restaurar(
                                mesa_id, personagem_id, 2, agora=excluido_em + timedelta(days=6)
                            ))
                            session.flush()
                            self.assertEqual(sheets.get(mesa_id, personagem_id).ficha["personagem"]["nome"], "Ari")
                            self.assertTrue(sheets.excluir(
                                mesa_id, personagem_id, 3, "mestre",
                                agora=excluido_em + timedelta(days=10),
                            ))
                            self.assertFalse(sheets.restaurar(
                                mesa_id, personagem_id, 4, agora=excluido_em + timedelta(days=18)
                            ))
                            self.assertIsNone(sheets.get(mesa_id, personagem_id))
                    finally:
                        transaction.rollback()
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
