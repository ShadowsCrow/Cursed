from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch


PROJECT_ROOT = Path(__file__).resolve().parents[2]
STREAMLIT_ROOT = PROJECT_ROOT / "app_streamlit"
sys.path.insert(0, str(STREAMLIT_ROOT))

from core.equip_codec import decode_equipment, encode_equipment  # noqa: E402
from core.efeitos_codec import decode_effect, encode_effect  # noqa: E402
from core.persist_data import salvar_ficha_json  # noqa: E402


FIXTURES_DIR = PROJECT_ROOT / "fixtures" / "legacy"


def load_fixture(name: str):
    with (FIXTURES_DIR / name).open(encoding="utf-8") as fixture:
        return json.load(fixture)


class LegacyFixturesTest(unittest.TestCase):
    def test_sanitized_sheets_are_loadable_by_current_persistence_adapter(self):
        with patch("core.persist_data.salvar_ficha", side_effect=lambda **kwargs: kwargs["nome"]) as save:
            for name in ("ficha_simples.json", "ficha_complexa.json"):
                with self.subTest(name=name):
                    sheet = load_fixture(name)
                    self.assertEqual(salvar_ficha_json(sheet["personagem"]["nome"], sheet), sheet["personagem"]["nome"])
            self.assertEqual(save.call_count, 2)

    def test_effect_fixture_round_trips_through_e1(self):
        effect = load_fixture("efeito_legado.json")
        self.assertEqual(decode_effect(encode_effect(effect)), effect)

    def test_equipment_fixture_round_trips_through_eq1(self):
        equipment = load_fixture("equipamento_legado.json")
        decoded = decode_equipment(encode_equipment(equipment["tipo"], equipment["item"], equipment["efeitos"]))
        self.assertEqual(decoded["tipo"], equipment["tipo"])
        self.assertEqual(decoded["item"], equipment["item"])

    def test_skill_fixture_preserves_ambiguous_legacy_cost(self):
        skill = load_fixture("habilidade_legada.json")
        self.assertIn("custo", skill)
        self.assertNotIn("custo_uso", skill)


if __name__ == "__main__":
    unittest.main()
