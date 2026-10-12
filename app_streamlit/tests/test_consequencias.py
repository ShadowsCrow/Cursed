from __future__ import annotations

import unittest

from core.desgaste import (
    adicionar_ou_resolver_efeito,
    administrar_efeito,
    aplicar_alteracao,
    efeitos_vinculados_de_consequencias,
    normalizar_efeito_aplicado,
    progredir_aflicao,
    resolver_exposicao_aflicao,
    suprimir_sintoma_aflicao,
)
from core.efeitos import carregar_catalogo, resolver_efeitos_ativos


ORIGEM = {"tipo": "mestre", "nome": "Teste de consequências"}


def consequencia(nome="Tornozelo Esmagado", categoria="ferimento_grave", origem_id="queda"):
    return {
        "categoria": categoria,
        "nome": nome,
        "descricao": "Uma consequência persistente de teste.",
        "origem": {"tipo": "outro", "id": origem_id, "nome": origem_id},
        "manifestacao": "Limitação ligada à ficção.",
        "efeito_atual": "Movimento prejudicado.",
        "tratamento": {"estado": "ativo", "regra": "Estabilizar e tratar."},
        "efeitos_vinculados": [{"associacao": "condicao_imobilizado"}],
    }


def aflicao(nome="Veneno Pálido", origem_id="aranha"):
    dados = consequencia(nome, "aflicao", origem_id)
    dados["descricao"] = "Veneno que avança por estágios."
    dados["progressao"] = {
        "indice": 0,
        "estagio": "latente",
        "gatilhos_avanco": ["fim do descanso"],
        "estagios": [
            {"id": "latente", "efeito_atual": "Sem sintoma visível."},
            {
                "id": "febril",
                "efeito_atual": "Febre e desorientação.",
                "efeitos_vinculados": [{"associacao": "condicao_ofuscado"}],
            },
        ],
    }
    dados["efeitos_vinculados"] = []
    return dados


class RegistroConsequenciasTest(unittest.TestCase):
    def test_normalizacao_inclui_categoria_estado_progressao_e_preserva_extensoes(self):
        legado = consequencia()
        legado["campo_futuro"] = {"valor": 7}
        normalizado = normalizar_efeito_aplicado(legado, estrito=True)
        self.assertEqual(normalizado["estado"], "ativo")
        self.assertEqual(normalizado["progressao"]["intensidade"], 1)
        self.assertEqual(normalizado["campo_futuro"], {"valor": 7})

    def test_transicoes_de_tratamento_sao_espelhadas_e_historicas(self):
        estado, evento = administrar_efeito({}, "criar", ORIGEM, "Queda", efeito=consequencia())
        efeito_id = evento["efeitos_afetados"][0]
        estado, _ = administrar_efeito(
            estado, "iniciar_tratamento", ORIGEM, "Imobilização médica", efeito_id=efeito_id
        )
        efeito = estado["efeitos_aplicados"][0]
        self.assertEqual(efeito["estado"], "em_tratamento")
        self.assertEqual(efeito["tratamento"]["estado"], "em_tratamento")
        self.assertGreaterEqual(len(efeito["historico"]), 2)

        recuperado, _ = aplicar_alteracao(estado, "exaustao", -5, ORIGEM)
        self.assertEqual(recuperado["efeitos_aplicados"][0]["estado"], "em_tratamento")

    def test_equivalencia_permite_manter_atualizar_ou_intensificar(self):
        lista, primeiro, _ = adicionar_ou_resolver_efeito([], consequencia())
        lista, mantido, operacao = adicionar_ou_resolver_efeito(
            lista, consequencia(), decisao_equivalente="manter"
        )
        self.assertEqual(operacao, "mantido")
        self.assertEqual(mantido["id"], primeiro["id"])

        alterada = consequencia()
        alterada["efeito_atual"] = "Agora usa uma tala."
        lista, atualizado, operacao = adicionar_ou_resolver_efeito(
            lista, alterada, decisao_equivalente="atualizar"
        )
        self.assertEqual(operacao, "atualizado")
        self.assertEqual(atualizado["efeito_atual"], "Agora usa uma tala.")

        lista, intensificado, operacao = adicionar_ou_resolver_efeito(
            lista, consequencia(), decisao_equivalente="intensificar"
        )
        self.assertEqual(operacao, "intensificado")
        self.assertEqual(intensificado["intensidade"], 2)

        lista, _, operacao = adicionar_ou_resolver_efeito(
            lista, consequencia("Costelas Fraturadas", origem_id="golpe")
        )
        self.assertEqual(operacao, "criado")
        self.assertEqual(len(lista), 2)


class VinculoEfeitosTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogo = carregar_catalogo()

    def test_consequencia_indica_efeito_oficial(self):
        lista, efeito, _ = adicionar_ou_resolver_efeito([], consequencia())
        vinculos = efeitos_vinculados_de_consequencias(lista)
        resolucao = resolver_efeitos_ativos([item["associacao"] for item in vinculos], self.catalogo)
        self.assertEqual(resolucao["efeitos"][0]["associacao"], "condicao_imobilizado")
        self.assertEqual(vinculos[0]["origem"]["id"], efeito["id"])

    def test_encerrar_consequencia_mantem_efeito_com_outra_causa(self):
        estado, evento = administrar_efeito({}, "criar", ORIGEM, "Queda", efeito=consequencia())
        efeito_id = evento["efeitos_afetados"][0]
        efeito_da_magia = "condicao_imobilizado"
        antes = [efeito_da_magia] + [
            item["associacao"] for item in efeitos_vinculados_de_consequencias(estado["efeitos_aplicados"])
        ]
        self.assertEqual(len(resolver_efeitos_ativos(antes, self.catalogo)["efeitos"]), 1)

        encerrado, _ = administrar_efeito(
            estado, "encerrar", ORIGEM, "Tratamento concluído", efeito_id=efeito_id
        )
        depois = [efeito_da_magia] + [
            item["associacao"] for item in efeitos_vinculados_de_consequencias(encerrado["efeitos_aplicados"])
        ]
        self.assertEqual(len(resolver_efeitos_ativos(depois, self.catalogo)["efeitos"]), 1)
        self.assertEqual(efeitos_vinculados_de_consequencias(encerrado["efeitos_aplicados"]), [])

    def test_campo_legado_e_convertido_sem_perder_registro(self):
        legado = consequencia()
        legado.pop("efeitos_vinculados")
        legado["condicoes_vinculadas"] = [{"condicao": "imobilizado"}]
        normalizado = normalizar_efeito_aplicado(legado)
        self.assertEqual(normalizado["efeitos_vinculados"][0]["associacao"], "condicao_imobilizado")
        self.assertEqual(normalizado["condicoes_vinculadas"], legado["condicoes_vinculadas"])


class AflicoesTest(unittest.TestCase):
    def test_resistencia_impede_criacao(self):
        lista, criada, operacao = resolver_exposicao_aflicao([], aflicao(), resistiu=True)
        self.assertEqual(lista, [])
        self.assertIsNone(criada)
        self.assertEqual(operacao, "resistida")

    def test_aflicao_progride_somente_por_gatilho_e_aplica_sintoma(self):
        lista, criada, _ = resolver_exposicao_aflicao([], aflicao(), resistiu=False)
        with self.assertRaises(ValueError):
            progredir_aflicao(lista, criada["id"], gatilho="evento errado")
        lista, progredida, operacao = progredir_aflicao(
            lista, criada["id"], gatilho="fim do descanso"
        )
        self.assertEqual(operacao, "progrediu")
        self.assertEqual(progredida["progressao"]["estagio"], "febril")
        self.assertEqual(
            efeitos_vinculados_de_consequencias(lista)[0]["associacao"], "condicao_ofuscado"
        )

    def test_suprimir_sintoma_nao_cura_aflicao(self):
        lista, criada, _ = resolver_exposicao_aflicao([], aflicao(), resistiu=False)
        lista, progredida, _ = progredir_aflicao(lista, criada["id"], gatilho="fim do descanso")
        lista, suprimida = suprimir_sintoma_aflicao(
            lista, progredida["id"], "ofuscado", justificativa="Antídoto temporário"
        )
        self.assertEqual(suprimida["estado"], "ativo")
        self.assertEqual(efeitos_vinculados_de_consequencias(lista), [])

    def test_aflicao_sem_progressao_permanece_estavel(self):
        simples = aflicao("Marca Estável")
        simples.pop("progressao")
        lista, criada, _ = resolver_exposicao_aflicao([], simples, resistiu=False)
        _, _, operacao = progredir_aflicao(lista, criada["id"], gatilho="qualquer")
        self.assertEqual(operacao, "estavel")


if __name__ == "__main__":
    unittest.main()
