from __future__ import annotations

import unittest

from core.desgaste import aplicar_alteracao, encerrar_colapso_mental, simular_esforco


MESTRE = {"tipo": "mestre", "nome": "Simulação de mesa"}


def trauma_vozes():
    return {
        "categoria": "trauma",
        "nome": "Vozes do Vazio",
        "descricao": "A presença da entidade retorna como vozes invasivas.",
        "origem": {"tipo": "outro", "id": "entidade-vazio", "nome": "Entidade do Vazio"},
        "gatilho": "Ouvir as vozes ou encarar a entidade",
        "consequencia": "Na primeira exposição da cena, receber 1 de Estresse ou aceitar uma complicação.",
        "tratamento": {"estado": "ativo", "regra": "Apoio e exposição segura conforme decisão narrativa."},
    }


def debilidade_extrema():
    return {
        "categoria": "outro",
        "nome": "Debilidade Extrema",
        "descricao": "O corpo cedeu após continuar uma marcha durante o Colapso Físico.",
        "origem": {"tipo": "mestre", "nome": "Marcha forçada"},
        "consequencia": "Não pode continuar a marcha sem ser transportado.",
        "tratamento": {"estado": "ativo", "regra": "Receber abrigo, hidratação e repouso seguro."},
    }


class SimulacaoMesaTest(unittest.TestCase):
    def test_roteiro_completo_preserva_decisoes_e_consequencias(self):
        # 1. A marcha aproxima Tarek do limite sem alterar Estresse.
        tarek, _ = aplicar_alteracao(
            {"desgaste": {"exaustao": 12, "estresse": 2}},
            "exaustao",
            2,
            {"tipo": "mestre", "nome": "Marcha sob tempestade"},
        )
        self.assertEqual(tarek["desgaste"], {"exaustao": 14, "estresse": 2})

        # 2. Ele escolhe o último esforço para salvar um aliado e só colapsa depois da ação.
        previa = simular_esforco(tarek["desgaste"], "fisico", 1, bonus_teste=1)
        self.assertTrue(previa["aplicar_depois_da_acao"])
        tarek, _ = aplicar_alteracao(
            tarek,
            "exaustao",
            1,
            {"tipo": "sistema", "nome": "Último esforço físico"},
            previa=previa,
        )
        self.assertEqual(tarek["desgaste"]["exaustao"], 15)
        self.assertEqual(tarek["efeitos_aplicados"], [])

        # 3. Obrigar o corpo colapsado a marchar cria uma consequência, não morte automática.
        tarek, evento_excedente = aplicar_alteracao(
            tarek,
            "exaustao",
            1,
            {"tipo": "mestre", "nome": "Marcha forçada além do limite"},
            efeito_declarado=debilidade_extrema(),
        )
        self.assertFalse(evento_excedente["detalhes"]["morte_automatica"])
        self.assertEqual(tarek["efeitos_aplicados"][0]["nome"], "Debilidade Extrema")

        # 4. Nara aposta tudo numa interação social, colapsa e cria um Trauma.
        nara = {"desgaste": {"exaustao": 1, "estresse": 8}}
        previa_social = simular_esforco(nara["desgaste"], "mental", 2)
        nara, _ = aplicar_alteracao(
            nara,
            "estresse",
            2,
            {"tipo": "outro", "nome": "Confronto com a Entidade do Vazio"},
            trauma=trauma_vozes(),
            previa=previa_social,
        )
        self.assertEqual(nara["desgaste"]["estresse"], 10)
        nara, _ = encerrar_colapso_mental(nara, {"tipo": "outro", "nome": "Apoio dos aliados"})
        self.assertEqual(nara["desgaste"]["estresse"], 8)

        # 5. Novo colapso equivalente intensifica o Trauma existente.
        nara, _ = aplicar_alteracao(
            nara,
            "estresse",
            2,
            {"tipo": "outro", "nome": "Confronto com a Entidade do Vazio"},
            trauma=trauma_vozes(),
        )
        self.assertEqual(len(nara["efeitos_aplicados"]), 1)
        self.assertEqual(nara["efeitos_aplicados"][0]["intensidade"], 2)
        nara, _ = encerrar_colapso_mental(nara, {"tipo": "outro", "nome": "Fim do conflito imediato"})

        # 6. Na primeira exposição de outra cena, Nara escolhe +1 Estresse para agir.
        nara, _ = aplicar_alteracao(
            nara,
            "estresse",
            1,
            {"tipo": "outro", "nome": "Gatilho de Vozes do Vazio"},
        )
        self.assertEqual(nara["desgaste"]["estresse"], 9)

        # 7. Descanso reduz as trilhas, mas não apaga as consequências aplicadas.
        tarek, _ = aplicar_alteracao(tarek, "exaustao", -2, {"tipo": "sistema", "nome": "Descanso Longo neutro"})
        nara, _ = aplicar_alteracao(nara, "estresse", -2, {"tipo": "sistema", "nome": "Descanso Longo"})
        self.assertEqual(tarek["desgaste"]["exaustao"], 13)
        self.assertEqual(tarek["efeitos_aplicados"][0]["nome"], "Debilidade Extrema")
        self.assertEqual(nara["desgaste"]["estresse"], 7)
        self.assertEqual(nara["efeitos_aplicados"][0]["nome"], "Vozes do Vazio")


if __name__ == "__main__":
    unittest.main()
