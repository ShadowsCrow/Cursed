"""Os ids das migrações cabem na coluna `alembic_version.version_num`, que no PostgreSQL é varchar(32)."""

from __future__ import annotations

from pathlib import Path
import unittest

from alembic.config import Config
from alembic.script import ScriptDirectory

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"
LIMITE = 32


class IdsDasMigracoesTest(unittest.TestCase):
    def test_todo_id_cabe_em_alembic_version(self):
        scripts = ScriptDirectory.from_config(Config(str(CONFIG)))
        longos = [rev.revision for rev in scripts.walk_revisions() if len(rev.revision) > LIMITE]
        self.assertEqual(longos, [])


if __name__ == "__main__":
    unittest.main()
