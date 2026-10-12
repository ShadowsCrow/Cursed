from __future__ import annotations

import unittest

from core.desgaste import administrar_efeito, efeitos_vinculados_de_consequencias
from core.efeitos import calcular_modificadores, carregar_catalogo, resolver_efeitos_ativos
from core.equip_codec import decode_equipment, encode_equipment


ORIGEM = {"tipo": "mestre", "nome": "Simulação de mesa"}


class SimulacaoMesaEfeitosTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogo = carregar_catalogo()

    def test_lia_ativa_cego_e_desativa_quando_fumaca_termina(self):
        # O Mestre narra a fumaça; Lia liga diretamente o efeito oficial.
        ativos = ["condicao_cego"]
        efeitos = resolver_efeitos_ativos(ativos, self.catalogo)["efeitos"]
        self.assertEqual(calcular_modificadores(efeitos, alvo="ataque", contextos=["depende_visao"])["total"], -4)
        self.assertEqual(calcular_modificadores(efeitos, alvo="ataque", contextos=["depende_audicao"])["total"], 0)

        # Outro efeito visual não soma a penalidade mais branda.
        ativos.append("condicao_ofuscado")
        efeitos = resolver_efeitos_ativos(ativos, self.catalogo)["efeitos"]
        self.assertEqual(calcular_modificadores(efeitos, alvo="ataque", contextos=["depende_visao"])["total"], -4)

        # A fumaça termina. Ofuscado continua até sua própria causa acabar.
        ativos.remove("condicao_cego")
        efeitos = resolver_efeitos_ativos(ativos, self.catalogo)["efeitos"]
        self.assertEqual(calcular_modificadores(efeitos, alvo="ataque", contextos=["depende_visao"])["total"], -2)

    def test_item_privado_e_ferimento_nao_viram_catalogos_novos(self):
        efeito_privado = {
            "kind": "externo",
            "nome": "Luz que Lê Ecos",
            "descricao": "+2 em Investigação sobrenatural.",
            "modificadores": [{"alvo": "pericia:investigacao_sobrenatural", "valor": 2}],
        }
        codigo = encode_equipment("outro", {"nome": "Lanterna de Nara"}, [efeito_privado])
        importado = decode_equipment(codigo)
        self.assertEqual(importado["efeitos"][0]["modificadores"][0]["valor"], 2)

        ferimento = {
            "categoria": "ferimento_grave",
            "nome": "Tornozelo Esmagado",
            "descricao": "Lesão após o desabamento.",
            "consequencia": "Não pode apoiar o pé.",
            "origem": {"tipo": "outro", "nome": "Desabamento"},
            "tratamento": {"estado": "ativo", "regra": "Estabilizar e tratar."},
            "efeitos_vinculados": [{"associacao": "condicao_imobilizado"}],
        }
        estado, evento = administrar_efeito({}, "criar", ORIGEM, "Queda", efeito=ferimento)
        vinculos = efeitos_vinculados_de_consequencias(estado["efeitos_aplicados"])
        self.assertEqual(vinculos[0]["associacao"], "condicao_imobilizado")
        estado, _ = administrar_efeito(
            estado, "encerrar", ORIGEM, "Tratamento concluído", efeito_id=evento["efeitos_afetados"][0]
        )
        self.assertEqual(efeitos_vinculados_de_consequencias(estado["efeitos_aplicados"]), [])


if __name__ == "__main__":
    unittest.main()
