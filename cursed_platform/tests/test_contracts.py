from __future__ import annotations

import unittest

from cursed_platform.contracts import (
    AplicarEfeitoComando,
    AtualizarFichaComando,
    CartaContrato,
    EquipamentoContrato,
    FichaContrato,
    MesaContrato,
)


class ContractsTest(unittest.TestCase):
    def test_contracts_generate_json_schema(self):
        for model in (
            FichaContrato,
            EquipamentoContrato,
            CartaContrato,
            MesaContrato,
            AtualizarFichaComando,
            AplicarEfeitoComando,
        ):
            with self.subTest(model=model.__name__):
                schema = model.model_json_schema()
                self.assertEqual(schema["type"], "object")
                self.assertIn("properties", schema)

    def test_command_preserves_separate_card_costs_and_embeds_contracts(self):
        carta = CartaContrato(
            id="magia-luz-1",
            tipo="magia",
            versao=1,
            titulo="Luz",
            texto="Cria luz fraca.",
            procedencia={"tipo": "catalogo"},
            custo_legado="2 PP ou foco",
        )
        self.assertIsNone(carta.custo_uso)
        command = AplicarEfeitoComando(
            id="cmd-1",
            mesa_id="mesa-1",
            ator_id="narrador-1",
            versao_esperada=0,
            personagem_id="personagem-1",
            efeito={"nome": "Luz", "descricao": "Ilumina."},
        )
        self.assertEqual(command.efeito.versao, 1)


if __name__ == "__main__":
    unittest.main()
