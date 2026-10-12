from __future__ import annotations

import json
from pathlib import Path
import unittest

from cursed_platform.domain.equip_codec import (
    decode_equipment,
    encode_equipment,
    normalizar_equipamento_eq1,
)
from cursed_platform.domain.efeitos_codec import decode_effect, encode_effect


FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "legacy"


def load_fixture(name: str):
    with (FIXTURES_DIR / name).open(encoding="utf-8") as fixture:
        return json.load(fixture)


class DomainCodecsTest(unittest.TestCase):
    def test_e1_fixture_round_trip(self):
        effect = load_fixture("efeito_legado.json")
        self.assertEqual(decode_effect(encode_effect(effect)), effect)

    def test_eq1_fixture_round_trip(self):
        equipment = load_fixture("equipamento_legado.json")
        self.assertEqual(
            decode_equipment(
                encode_equipment(equipment["tipo"], equipment["item"], equipment["efeitos"])
            ),
            equipment,
        )

    def test_invalid_codes_and_equipment_are_rejected(self):
        with self.assertRaises(ValueError):
            decode_effect("E1:not-valid")
        with self.assertRaises(ValueError):
            decode_equipment("EQ1:not-valid")
        with self.assertRaises(ValueError):
            normalizar_equipamento_eq1({"tipo": "reliquia", "item": {}, "efeitos": []})


if __name__ == "__main__":
    unittest.main()
