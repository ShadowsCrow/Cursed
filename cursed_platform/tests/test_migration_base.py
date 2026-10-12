from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from cursed_platform.persistence import MembroRegistro, MesaRegistro, PersonagemRegistro, SessaoRegistro


CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"


class MigrationBaseTest(unittest.TestCase):
    def test_upgrade_and_downgrade_on_disposable_local_database(self):
        with TemporaryDirectory() as directory:
            engine = create_engine(f"sqlite:///{Path(directory) / 'platform.sqlite'}")
            config = Config(str(CONFIG))
            with engine.begin() as connection:
                config.attributes["connection"] = connection
                command.upgrade(config, "head")
            tables = set(inspect(engine).get_table_names())
            self.assertTrue({"rpg_tables", "table_memberships", "characters", "table_sessions"} <= tables)
            with engine.begin() as connection:
                config.attributes["connection"] = connection
                command.downgrade(config, "base")
            tables = set(inspect(engine).get_table_names())
            self.assertFalse({"rpg_tables", "table_memberships", "characters", "table_sessions"} & tables)
            engine.dispose()

    def test_membership_ownership_role_and_session_constraints(self):
        with TemporaryDirectory() as directory:
            engine = create_engine(f"sqlite:///{Path(directory) / 'integrity.sqlite'}")

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

            invalid_records = (
                MembroRegistro(mesa_id="mesa", usuario_id="invalido", papel="administrador"),
                PersonagemRegistro(
                    id="sem-dono", mesa_id="mesa", proprietario_id="ausente", ficha={}
                ),
                PersonagemRegistro(
                    id="versao-invalida", mesa_id="mesa", versao=-1, ficha={}
                ),
                SessaoRegistro(id="sessao-zero", mesa_id="mesa", numero=0),
            )
            for record in invalid_records:
                with self.subTest(record=record):
                    with self.assertRaises(IntegrityError):
                        with Session(engine) as session:
                            session.add(record)
                            session.commit()
            with Session(engine) as session:
                session.add(SessaoRegistro(id="sessao-1", mesa_id="mesa", numero=1))
                session.commit()
            with self.assertRaises(IntegrityError):
                with Session(engine) as session:
                    session.add(SessaoRegistro(id="sessao-duplicada", mesa_id="mesa", numero=1))
                    session.commit()
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
