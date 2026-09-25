from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from cursed_platform.persistence import (
    EfeitoAplicadoRegistro,
    FonteEfeitoRegistro,
    ItemInventarioRegistro,
    MembroRegistro,
    MesaRegistro,
    OperacaoEfeitoRegistro,
    PersonagemRegistro,
)


CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


class InventoryEffectsTest(unittest.TestCase):
    def test_queries_and_source_links_stay_with_the_same_character(self):
        with TemporaryDirectory() as directory:
            engine = create_engine(f"sqlite:///{Path(directory) / 'items.sqlite'}")

            @event.listens_for(engine, "connect")
            def enable_foreign_keys(connection, _record):
                connection.execute("PRAGMA foreign_keys=ON")

            config = Config(str(CONFIG))
            with engine.begin() as connection:
                config.attributes["connection"] = connection
                command.upgrade(config, "head")

            with Session(engine) as session:
                session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
                session.commit()
                session.add(MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"))
                session.commit()
                session.add_all(
                    [
                        PersonagemRegistro(id="a", mesa_id="mesa", proprietario_id="mestre", ficha={}),
                        PersonagemRegistro(id="b", mesa_id="mesa", proprietario_id="mestre", ficha={}),
                    ]
                )
                session.commit()
                session.add_all(
                    [
                        ItemInventarioRegistro(
                            id="espada-a", mesa_id="mesa", personagem_id="a", tipo="arma",
                            nome="Espada", quantidade=1, equipado=True, dados={"dano": "1d6"},
                        ),
                        ItemInventarioRegistro(
                            id="escudo-b", mesa_id="mesa", personagem_id="b", tipo="armadura",
                            nome="Escudo", quantidade=1, dados={},
                        ),
                    ]
                )
                session.commit()
                session.add(
                    EfeitoAplicadoRegistro(
                        id="efeito-a", mesa_id="mesa", personagem_id="a", nome="Proteção",
                        descricao="Protege o portador.", conteudo={},
                    )
                )
                session.commit()
                session.add_all(
                    [
                        FonteEfeitoRegistro(
                            id="fonte-a", mesa_id="mesa", personagem_id="a",
                            efeito_id="efeito-a", tipo="equipamento", equipamento_id="espada-a",
                        ),
                        OperacaoEfeitoRegistro(
                            id="operacao-a", efeito_id="efeito-a", tipo="modificador",
                            alvo="defesa", valor=Decimal("2"),
                        ),
                    ]
                )
                session.commit()

                items = session.scalars(
                    select(ItemInventarioRegistro).where(
                        ItemInventarioRegistro.mesa_id == "mesa",
                        ItemInventarioRegistro.personagem_id == "a",
                    )
                ).all()
                effects = session.scalars(
                    select(EfeitoAplicadoRegistro).where(
                        EfeitoAplicadoRegistro.mesa_id == "mesa",
                        EfeitoAplicadoRegistro.personagem_id == "a",
                    )
                ).all()
                sources = session.scalars(
                    select(FonteEfeitoRegistro).where(FonteEfeitoRegistro.efeito_id == "efeito-a")
                ).all()
                self.assertEqual([item.id for item in items], ["espada-a"])
                self.assertEqual([effect.id for effect in effects], ["efeito-a"])
                self.assertEqual([source.equipamento_id for source in sources], ["espada-a"])
                self.assertEqual(session.get(OperacaoEfeitoRegistro, "operacao-a").valor, Decimal("2.0000"))

            with self.assertRaises(IntegrityError):
                with Session(engine) as session:
                    session.add(
                        FonteEfeitoRegistro(
                            id="fonte-cruzada", mesa_id="mesa", personagem_id="a",
                            efeito_id="efeito-a", tipo="equipamento", equipamento_id="escudo-b",
                        )
                    )
                    session.commit()
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
