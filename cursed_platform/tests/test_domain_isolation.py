from __future__ import annotations

from pathlib import Path
import unittest

from cursed_platform.domain import desgaste, efeitos


class DomainIsolationTest(unittest.TestCase):
    def test_domain_modules_do_not_import_streamlit(self):
        domain_dir = Path(efeitos.__file__).parent
        for module in domain_dir.glob("*.py"):
            source = module.read_text(encoding="utf-8").lower()
            self.assertNotIn("import streamlit", source)
            self.assertNotIn("from core.", source)
            self.assertNotIn("session_state", source)

    def test_effect_catalog_and_fatigue_logic_are_usable_independently(self):
        catalog = efeitos.carregar_catalogo()
        active = efeitos.resolver_efeitos_ativos(["condicao_cego"], catalog)["efeitos"]
        self.assertEqual(efeitos.calcular_modificadores(active, alvo="ataque", contextos=["depende_visao"])["total"], -4)
        self.assertEqual(desgaste.normalizar_desgaste({"exaustao": 99, "estresse": -1}), {"exaustao": 15, "estresse": 0})


if __name__ == "__main__":
    unittest.main()
