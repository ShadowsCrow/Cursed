from __future__ import annotations

import unittest

from core.efeitos import (
    calcular_modificadores,
    carregar_catalogo,
    normalizar_modificador,
    resolver_efeitos_ativos,
)
from core.efeitos_codec import decode_effect, encode_effect
from core.equip_codec import decode_equipment, encode_equipment


class EfeitosDiretosTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogo = carregar_catalogo()

    def test_catalogo_real_contem_condicoes_e_sobrepeso(self):
        associacoes = {item["associacao"] for item in self.catalogo}
        self.assertEqual(len(associacoes), len(self.catalogo))
        self.assertEqual(
            sum(item["categoria"] == "condicao" for item in self.catalogo), 17
        )
        self.assertIn("cc_above", associacoes)
        self.assertEqual([], next(
            item for item in self.catalogo if item["associacao"] == "condicao_cego"
        )["operacoes"])

    def test_cego_aplica_menos_quatro_apenas_ao_ataque_visual(self):
        ativos = resolver_efeitos_ativos(["condicao_cego"], self.catalogo)["efeitos"]
        visual = calcular_modificadores(ativos, alvo="ataque", contextos=["depende_visao"])
        auditivo = calcular_modificadores(ativos, alvo="ataque", contextos=["depende_audicao"])
        self.assertEqual(visual["total"], -4)
        self.assertEqual(auditivo["total"], 0)
        self.assertEqual(calcular_modificadores(ativos, alvo="defesa", contextos=["depende_visao"])["total"], -4)

    def test_cego_substitui_ofuscado_e_efeito_nao_duplica(self):
        ativos = resolver_efeitos_ativos(
            ["condicao_cego", "condicao_ofuscado", "condicao_cego"], self.catalogo
        )["efeitos"]
        self.assertEqual(len(ativos), 2)
        self.assertEqual(
            calcular_modificadores(ativos, alvo="ataque", contextos=["depende_visao"])["total"],
            -4,
        )

    def test_texto_nao_e_inferido_como_numero(self):
        efeito = {"nome": "Sangrando", "descricao": "Perde 1 PV ao fim do turno."}
        self.assertEqual(calcular_modificadores([efeito], alvo="pv")["total"], 0)

    def test_modificador_invalido_nao_entra_no_calculo(self):
        with self.assertRaises(ValueError):
            normalizar_modificador({"alvo": "ataque", "valor": "texto"})
        with self.assertRaises(ValueError):
            normalizar_modificador({"alvo": "ataque", "valor": 2, "script": "executar"})

    def test_referencia_oficial_ausente_e_visivel(self):
        resultado = resolver_efeitos_ativos(["nao_existe"], self.catalogo)
        self.assertEqual(resultado["efeitos"], [])
        self.assertTrue(resultado["avisos"])


class CompartilhamentoAtualTest(unittest.TestCase):
    def test_e1_antigo_continua_legivel(self):
        efeito = {"nome": "Legado", "descricao": "Somente texto"}
        self.assertEqual(decode_effect(encode_effect(efeito)), efeito)

    def test_e1_privado_transporta_modificador_opcional(self):
        efeito = {
            "nome": "Marca Singular",
            "descricao": "+2 em Investigação sobrenatural.",
            "modificadores": [
                {"alvo": "pericia:investigacao_sobrenatural", "valor": 2}
            ],
        }
        importado = decode_effect(encode_effect(efeito))
        self.assertEqual(importado, efeito)
        self.assertEqual(
            calcular_modificadores([importado], alvo="pericia:investigacao_sobrenatural")["total"],
            2,
        )

    def test_eq1_privado_permanece_autocontido(self):
        efeito = {
            "kind": "externo",
            "nome": "Luz que Lê Ecos",
            "descricao": "+2 em Investigação sobrenatural.",
            "modificadores": [{"alvo": "pericia:investigacao_sobrenatural", "valor": 2}],
        }
        codigo = encode_equipment("outro", {"nome": "Lanterna de Nara"}, [efeito])
        importado = decode_equipment(codigo)
        self.assertTrue(codigo.startswith("EQ1:"))
        self.assertEqual(importado["efeitos"][0]["modificadores"], efeito["modificadores"])

    def test_formatos_experimentais_ainda_sao_lidos(self):
        efeito = {
            "versao": 2,
            "nome": "Arquivo experimental",
            "descricao": "Criado antes da simplificação.",
            "operacoes": [{"tipo": "modificador", "alvo": "ataque", "valor": 1}],
        }
        self.assertEqual(decode_effect(encode_effect(efeito, versao=2))["nome"], efeito["nome"])
        codigo = encode_equipment(
            "outro", {"nome": "Item experimental"}, [{"kind": "externo", "efeito": efeito}], versao=2
        )
        self.assertEqual(decode_equipment(codigo)["efeitos"][0]["efeito"]["nome"], efeito["nome"])


if __name__ == "__main__":
    unittest.main()
