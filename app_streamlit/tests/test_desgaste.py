from __future__ import annotations

import unittest

from core.desgaste import (
    adicionar_ou_intensificar_efeito,
    administrar_efeito,
    aplicar_alteracao,
    desfazer_evento,
    efeitos_derivados,
    encerrar_colapso_mental,
    normalizar_desgaste,
    normalizar_estado_desgaste,
    obter_faixa,
    simular_alteracao,
    simular_esforco,
)


ORIGEM = {"tipo": "mestre", "nome": "Teste de mesa"}


def trauma(nome: str = "Vozes do Vazio"):
    return {
        "categoria": "trauma",
        "nome": nome,
        "descricao": "As vozes retornam em lugares escuros.",
        "origem": {"tipo": "outro", "id": "entidade-vazio", "nome": "Entidade do Vazio"},
        "gatilho": "Ouvir as vozes da entidade",
        "consequencia": "Receber 1 de Estresse ou aceitar uma complicação na primeira exposição da cena.",
        "tratamento": {"estado": "ativo", "regra": "Progredir com apoio e confronto seguro do gatilho."},
    }


def ferimento(nome: str = "Pés Dilacerados"):
    return {
        "categoria": "ferimento_grave",
        "nome": nome,
        "descricao": "Feridas profundas causadas pela marcha.",
        "origem": {"tipo": "mestre", "nome": "Marcha forçada"},
        "consequencia": "Não pode realizar outra marcha até ser estabilizado.",
        "tratamento": {"estado": "ativo", "regra": "Estabilizar com Medicina e repousar em segurança."},
    }


class FaixasTest(unittest.TestCase):
    def test_normalizacao_limita_as_duas_trilhas(self):
        self.assertEqual(normalizar_desgaste({"exaustao": -3, "estresse": 99}), {"exaustao": 0, "estresse": 10})

    def test_todas_as_transicoes_de_exaustao(self):
        casos = {
            0: "Estável",
            5: "Estável",
            6: "Cansado",
            8: "Cansado",
            9: "Exausto",
            11: "Exausto",
            12: "No Limite",
            14: "No Limite",
            15: "Colapso Físico",
        }
        for valor, esperado in casos.items():
            with self.subTest(valor=valor):
                self.assertEqual(obter_faixa("exaustao", valor)["nome"], esperado)

    def test_todas_as_transicoes_de_estresse(self):
        casos = {
            0: "Controlado",
            4: "Controlado",
            5: "Pressionado",
            6: "Pressionado",
            7: "Abalado",
            8: "Abalado",
            9: "À Beira",
            10: "Colapso Mental",
        }
        for valor, esperado in casos.items():
            with self.subTest(valor=valor):
                self.assertEqual(obter_faixa("estresse", valor)["nome"], esperado)

    def test_efeitos_derivados_sao_unicos_e_saem_ao_recuperar(self):
        ativos = efeitos_derivados({"exaustao": 9, "estresse": 7})
        self.assertEqual(len(ativos), 2)
        self.assertEqual(len({efeito["id"] for efeito in ativos}), 2)
        recuperados = efeitos_derivados({"exaustao": 5, "estresse": 4})
        self.assertEqual(recuperados, [])


class AlteracoesTest(unittest.TestCase):
    def test_alteracao_de_exaustao_nao_muda_estresse(self):
        previa = simular_alteracao({"exaustao": 3, "estresse": 6}, "exaustao", 2)
        self.assertEqual(previa["depois"], {"exaustao": 5, "estresse": 6})

    def test_previa_informa_mudanca_de_faixa(self):
        previa = simular_alteracao({"exaustao": 8, "estresse": 0}, "exaustao", 1)
        self.assertTrue(previa["mudou_faixa"])
        self.assertEqual(previa["faixa_antes"]["nome"], "Cansado")
        self.assertEqual(previa["faixa_depois"]["nome"], "Exausto")

    def test_esforco_fisico_resolve_antes_do_colapso(self):
        previa = simular_esforco({"exaustao": 14, "estresse": 0}, "fisico", 1, bonus_teste=1)
        self.assertTrue(previa["aplicar_depois_da_acao"])
        self.assertTrue(previa["colapso_fisico"])
        self.assertEqual(previa["bonus_teste"], 1)
        self.assertEqual(previa["depois"]["exaustao"], 15)

    def test_esforco_fisico_distribui_teste_e_movimento(self):
        previa = simular_esforco({"exaustao": 3, "estresse": 0}, "fisico", 3, bonus_teste=2, bonus_movimento=1)
        self.assertEqual(previa["bonus_teste"], 2)
        self.assertEqual(previa["bonus_movimento"], 1)

    def test_colapso_fisico_nao_cria_consequencia_ao_chegar_em_15(self):
        estado, evento = aplicar_alteracao(
            {"desgaste": {"exaustao": 14, "estresse": 0}}, "exaustao", 1, ORIGEM
        )
        self.assertEqual(estado["desgaste"]["exaustao"], 15)
        self.assertEqual(estado["efeitos_aplicados"], [])
        self.assertFalse(evento["detalhes"]["morte_automatica"])

    def test_excedente_fisico_exige_consequencia_e_nao_mata(self):
        with self.assertRaises(ValueError):
            aplicar_alteracao({"desgaste": {"exaustao": 15, "estresse": 0}}, "exaustao", 1, ORIGEM)
        estado, evento = aplicar_alteracao(
            {"desgaste": {"exaustao": 15, "estresse": 0}},
            "exaustao",
            1,
            ORIGEM,
            efeito_declarado=ferimento(),
        )
        self.assertEqual(estado["desgaste"]["exaustao"], 15)
        self.assertEqual(len(estado["efeitos_aplicados"]), 1)
        self.assertFalse(evento["detalhes"]["morte_automatica"])

    def test_esforco_mental_em_8_pode_levar_ao_colapso(self):
        previa = simular_esforco({"exaustao": 0, "estresse": 8}, "mental", 2)
        self.assertTrue(previa["colapso_mental"])
        self.assertEqual(previa["bonus_teste"], 2)
        with self.assertRaises(ValueError):
            simular_esforco({"exaustao": 0, "estresse": 9}, "mental", 1)

    def test_colapso_mental_exige_trauma_e_retorna_a_8_apos_auxilio(self):
        inicial = {"desgaste": {"exaustao": 0, "estresse": 8}}
        with self.assertRaises(ValueError):
            aplicar_alteracao(inicial, "estresse", 2, ORIGEM)
        colapsado, _ = aplicar_alteracao(inicial, "estresse", 2, ORIGEM, trauma=trauma())
        self.assertEqual(colapsado["desgaste"]["estresse"], 10)
        self.assertEqual(len(colapsado["efeitos_aplicados"]), 1)
        recuperado, _ = encerrar_colapso_mental(colapsado, {"tipo": "sistema", "nome": "Auxílio de aliado"})
        self.assertEqual(recuperado["desgaste"]["estresse"], 8)
        self.assertEqual(len(recuperado["efeitos_aplicados"]), 1)


class EfeitosPersistentesTest(unittest.TestCase):
    def test_trauma_equivalente_e_intensificado(self):
        lista, primeiro, operacao = adicionar_ou_intensificar_efeito([], trauma())
        self.assertEqual(operacao, "criado")
        lista, segundo, operacao = adicionar_ou_intensificar_efeito(lista, trauma())
        self.assertEqual(operacao, "intensificado")
        self.assertEqual(len(lista), 1)
        self.assertEqual(primeiro["id"], segundo["id"])
        self.assertEqual(segundo["intensidade"], 2)

    def test_recuperar_exaustao_nao_remove_ferimento(self):
        estado, _ = administrar_efeito(
            {"desgaste": {"exaustao": 9, "estresse": 0}},
            "criar",
            ORIGEM,
            "Aplicado pelo evento físico",
            efeito=ferimento(),
        )
        recuperado, _ = aplicar_alteracao(estado, "exaustao", -9, ORIGEM)
        self.assertEqual(recuperado["desgaste"]["exaustao"], 0)
        self.assertEqual(len(recuperado["efeitos_aplicados"]), 1)

    def test_acoes_administrativas_exigem_justificativa_e_ficam_no_historico(self):
        with self.assertRaises(ValueError):
            administrar_efeito({}, "criar", ORIGEM, "", efeito=ferimento())
        estado, evento = administrar_efeito({}, "criar", ORIGEM, "Consequência da marcha", efeito=ferimento())
        efeito_id = evento["efeitos_afetados"][0]
        mitigado, _ = administrar_efeito(estado, "mitigar", ORIGEM, "Tratamento parcial", efeito_id=efeito_id)
        self.assertEqual(mitigado["efeitos_aplicados"][0]["tratamento"]["estado"], "mitigado")
        self.assertEqual(len(mitigado["historico_desgaste"]), 2)


class HistoricoTest(unittest.TestCase):
    def test_desfazer_restaura_desgaste_e_efeito_criado(self):
        inicial = {"desgaste": {"exaustao": 0, "estresse": 8}}
        colapsado, evento = aplicar_alteracao(inicial, "estresse", 2, ORIGEM, trauma=trauma())
        restaurado, evento_desfazer = desfazer_evento(colapsado, evento["id"])
        self.assertEqual(restaurado["desgaste"]["estresse"], 8)
        self.assertEqual(restaurado["efeitos_aplicados"], [])
        self.assertEqual(evento_desfazer["evento_revertido"], evento["id"])

    def test_nao_desfaz_evento_antigo_com_alteracao_posterior(self):
        primeiro_estado, primeiro = aplicar_alteracao({}, "exaustao", 2, ORIGEM)
        segundo_estado, _ = aplicar_alteracao(primeiro_estado, "estresse", 1, ORIGEM)
        with self.assertRaises(ValueError):
            desfazer_evento(segundo_estado, primeiro["id"])

    def test_estado_legado_recebe_padrao_sem_perder_extensoes(self):
        estado = normalizar_estado_desgaste({"campo_futuro": {"valor": 7}})
        self.assertEqual(estado["desgaste"], {"exaustao": 0, "estresse": 0})
        self.assertEqual(estado["campo_futuro"], {"valor": 7})


if __name__ == "__main__":
    unittest.main()
