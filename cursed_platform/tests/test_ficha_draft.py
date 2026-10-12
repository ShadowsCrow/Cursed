from __future__ import annotations

import json
from pathlib import Path
import unittest

from cursed_platform.domain.ficha import FichaDraft, ServicoFichaDraft


FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "legacy"


def load_fixture(name: str):
    with (FIXTURES_DIR / name).open(encoding="utf-8") as fixture:
        return json.load(fixture)


class FichaDraftTest(unittest.TestCase):
    def test_fixtures_round_trip_without_interface_state(self):
        for name in ("ficha_simples.json", "ficha_complexa.json"):
            with self.subTest(name=name):
                fixture = load_fixture(name)
                self.assertEqual(FichaDraft.de_payload(fixture).para_payload(), fixture)

    def test_service_replaces_updates_and_clears_the_draft(self):
        service = ServicoFichaDraft()
        service.substituir(load_fixture("ficha_simples.json"), nome="Ari Teste")
        service.atualizar_secao("personagem", {"nome": "Ari Atualizada"})
        self.assertEqual(service.nome_carregado, "Ari Teste")
        self.assertEqual(service.ficha.personagem, {"nome": "Ari Atualizada"})
        self.assertEqual(service.limpar().para_payload(), FichaDraft.vazia().para_payload())

    def test_unknown_section_and_non_object_payload_are_rejected(self):
        with self.assertRaises(ValueError):
            FichaDraft.de_payload([])
        with self.assertRaises(ValueError):
            FichaDraft.vazia().substituir_secao("sessao", {})


if __name__ == "__main__":
    unittest.main()
