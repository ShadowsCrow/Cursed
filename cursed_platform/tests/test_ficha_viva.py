from __future__ import annotations

import unittest

from cursed_platform.ficha_viva import calcular_valores_derivados
from cursed_platform.persistence import ItemInventarioRegistro

FICHA = {"atributos": {"valores": {"Vigor": 2, "Destreza": 1}}, "pericias": {"valores": {}}}


def item(id_: str, subtipo: str | None, *, equipado: bool = True,
         armadura: int = 3, rdb: int = 2) -> ItemInventarioRegistro:
    return ItemInventarioRegistro(
        id=id_, mesa_id="mesa", personagem_id="p", tipo="armadura", nome=id_, quantidade=1,
        equipado=equipado, subtipo=subtipo, dados={"armadura": armadura, "rdb": rdb},
    )


class ArmaduraERdbDoPeitoralEDoEscudoTest(unittest.TestCase):
    """carga-em-grade: Armadura e RDB vêm só do peitoral e do escudo equipados."""

    def valor(self, inventario: list[ItemInventarioRegistro], chave: str):
        return next(v for v in calcular_valores_derivados(FICHA, inventario, []) if v.chave == chave)

    def equipamentos(self, inventario: list[ItemInventarioRegistro], chave: str) -> list[tuple[str, float]]:
        return [(f.descricao, f.valor) for f in self.valor(inventario, chave).fontes if f.tipo == "equipamento"]

    def test_peitoral_e_escudo_equipados_somam(self):
        inventario = [item("Cota", "peitoral"), item("Broquel", "escudo", armadura=1, rdb=1)]
        self.assertEqual(self.equipamentos(inventario, "defesa:armadura"), [("Cota", 3), ("Broquel", 1)])
        self.assertEqual(self.equipamentos(inventario, "rdb:armadura"), [("Cota", 2), ("Broquel", 1)])
        self.assertEqual(self.valor(inventario, "defesa:armadura").total, 2 + 3 + 1)

    def test_capacete_luvas_e_botas_nao_somam_mesmo_com_valores(self):
        inventario = [item(s, s) for s in ("capacete", "luvas", "botas")]
        self.assertEqual(self.equipamentos(inventario, "defesa:armadura"), [])
        self.assertEqual(self.equipamentos(inventario, "rdb:armadura"), [])
        self.assertEqual(self.valor(inventario, "defesa:armadura").total, 2)

    def test_item_sem_subtipo_nao_soma(self):
        """Item fora do sistema da grade não conta; o subtipo não é inferido do tipo."""
        inventario = [item("Armadura antiga", None)]
        self.assertEqual(self.equipamentos(inventario, "defesa:armadura"), [])
        self.assertEqual(self.equipamentos(inventario, "rdb:armadura"), [])

    def test_peitoral_desequipado_nao_soma(self):
        self.assertEqual(self.equipamentos([item("Cota", "peitoral", equipado=False)], "defesa:armadura"), [])


if __name__ == "__main__":
    unittest.main()
