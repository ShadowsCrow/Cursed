from __future__ import annotations

from copy import deepcopy
import unittest

from cursed_platform import catalogos
from cursed_platform.domain.validacao_ficha import validar_ficha, verificar

CATALOGO = catalogos.ler()


def _ficha(**personagem):
    return {
        "personagem": {"nome": "Ayla", "classe": "Mago", "arquetipo": "Mutante Arcano", "raca": "Elfo", "nivel": 1,
                       **personagem},
        "personalidade": {"alinhamento": "Neutro | Bom", "pecado": "Orgulho", "meu_lema": "Sempre adiante"},
        "atributos": {"valores": {"Força": 1, "Vigor": 3, "Destreza": 2}, "ajustes": {}},
        "pericias": {"valores": {"Furtividade": 2}, "ajustes": {}},
        "recursos": {},
    }


def _com(ficha, caminho, valor):
    nova = deepcopy(ficha)
    alvo = nova
    partes = caminho.split(".")
    for parte in partes[:-1]:
        alvo = alvo.setdefault(parte, {})
    alvo[partes[-1]] = valor
    return nova


class ValidacaoTest(unittest.TestCase):
    def erros(self, anterior, nova):
        return {e.caminho: e.mensagem for e in validar_ficha(anterior, nova, CATALOGO)}

    def alterar(self, caminho, valor, base=None):
        anterior = base or _ficha()
        return self.erros(anterior, _com(anterior, caminho, valor))

    def test_ficha_valida_passa(self):
        self.assertEqual(self.erros(None, _ficha()), {})

    def test_forca_zero(self):
        erros = self.alterar("atributos.valores.Força", 0)
        self.assertIn("vai de 1 a 5", erros["atributos.valores.Força"])

    def test_atributo_acima_do_limite_indica_ajuste(self):
        self.assertIn("exigem ajuste", self.alterar("atributos.valores.Vigor", 6)["atributos.valores.Vigor"])

    def test_atributo_nao_inteiro(self):
        self.assertIn("inteiro", self.alterar("atributos.valores.Vigor", "3")["atributos.valores.Vigor"])

    def test_pericia_no_limite_e_acima(self):
        self.assertEqual(self.alterar("pericias.valores.Furtividade", 5), {})
        self.assertIn("exigem ajuste", self.alterar("pericias.valores.Furtividade", 7)["pericias.valores.Furtividade"])
        self.assertEqual(self.alterar("pericias.valores.Furtividade", 0), {})

    def test_valor_acima_do_limite_por_ajuste(self):
        base = _com(_ficha(), "atributos.valores.Força", 5)
        self.assertEqual(self.alterar("atributos.ajustes", {"Força": 1}, base), {})

    def test_ficha_antiga_irregular_aceita_gravar_outro_campo(self):
        antiga = _com(_ficha(), "atributos.valores.Força", 0)
        self.assertEqual(self.alterar("personalidade.meu_lema", "Nunca recuar", antiga), {})
        self.assertIn("atributos.valores.Força", {a.caminho for a in verificar(antiga, CATALOGO)})

    def test_historia_com_limite_do_json(self):
        self.assertEqual(self.alterar("personalidade.historia", "a" * 4000), {})
        self.assertEqual(self.alterar("personalidade.historia", "Primeiro.\n\nSegundo."), {})
        erro = self.alterar("personalidade.historia", "a" * 4001)["personalidade.historia"]
        self.assertIn("História passa do limite de 4.000 caracteres.", erro)

    def test_ficha_antiga_sem_historia_e_historia_longa_legada(self):
        self.assertEqual(self.alterar("personalidade.meu_lema", "Sempre adiante"), {})
        longa = _com(_ficha(), "personalidade.historia", "a" * 5000)
        self.assertEqual(self.alterar("personalidade.meu_lema", "Nunca recuar", longa), {})
        self.assertIn("personalidade.historia", {a.caminho for a in verificar(longa, CATALOGO)})

    def test_nivel(self):
        for nivel in (0, 21, "5"):
            with self.subTest(nivel=nivel):
                self.assertIn("1 a 20", self.alterar("personagem.nivel", nivel)["personagem.nivel"])
        self.assertEqual(self.alterar("personagem.nivel", 5), {})

    def test_idade_e_sexo(self):
        self.assertEqual(self.erros(_ficha(), _ficha(idade=27, sexo="Feminino")), {})
        self.assertIn("negativa", self.alterar("personagem.idade", -3)["personagem.idade"])
        erro = self.alterar("personagem.sexo", "Indefinido")["personagem.sexo"]
        self.assertIn("Masculino, Feminino, Outro", erro)

    def test_pecado_com_grafia_antiga_e_fora_da_lista(self):
        self.assertEqual(self.alterar("personalidade.pecado", "Ganancia"), {})
        self.assertEqual(self.alterar("personalidade.pecado", "Ganância"), {})
        self.assertIn("personalidade.pecado", self.alterar("personalidade.pecado", "Soberba"))

    def test_alinhamento_antigo_escrito_a_mao_vira_aviso(self):
        antiga = _com(_ficha(), "personalidade.alinhamento", "caótico e bondoso")
        self.assertEqual(self.alterar("personagem.idade", 30, antiga), {})
        self.assertIn("personalidade.alinhamento", {a.caminho for a in verificar(antiga, CATALOGO)})
        self.assertIn("personalidade.alinhamento", self.alterar("personalidade.alinhamento", "Bom e leal"))

    def test_raca_fora_do_catalogo(self):
        self.assertIn("não existe no catálogo", self.alterar("personagem.raca", "Centauro")["personagem.raca"])

    def test_arquetipo_de_outra_classe(self):
        erro = self.alterar("personagem.arquetipo", "Assassino")["personagem.arquetipo"]
        self.assertIn("não pertence à classe Mago", erro)

    def test_troca_de_classe_invalida_o_arquetipo(self):
        erros = self.alterar("personagem.classe", "Gatuno")
        self.assertIn("personagem.arquetipo", erros)
        nova = _com(_com(_ficha(), "personagem.classe", "Gatuno"), "personagem.arquetipo", "Ladrão")
        self.assertEqual(self.erros(_ficha(), nova), {})

    def test_classe_antiga_escrita_a_mao_e_so_aviso(self):
        antiga = _ficha(classe="mago negro", arquetipo="")
        self.assertEqual(self.alterar("personagem.idade", 40, antiga), {})
        self.assertIn("personagem.classe", {a.caminho for a in verificar(antiga, CATALOGO)})

    def test_ajuste_do_narrador_exige_origem_e_justificativa(self):
        sem_origem = [{"alvo": "pv_maximo", "valor": 3, "justificativa": "x"}]
        self.assertIn("origem", self.alterar("recursos.ajustes", sem_origem)["recursos.ajustes"])
        valido = [{"alvo": "pv_maximo", "valor": 3, "origem": "Bênção do Templo", "justificativa": "Campanha"}]
        self.assertEqual(self.alterar("recursos.ajustes", valido), {})
        alvo_errado = [{"alvo": "forca", "valor": 3, "origem": "x", "justificativa": "y"}]
        self.assertIn("recursos.ajustes", self.alterar("recursos.ajustes", alvo_errado))

    def test_troca_de_raca_com_tamanho_explicito(self):
        antiga = _ficha(tamanho="Grande")
        erro = self.alterar("personagem.raca", "Anão", antiga)
        self.assertIn("reconfirme", erro["personagem.tamanho"])
        limpa = _com(_com(antiga, "personagem.raca", "Anão"), "personagem.tamanho", "")
        self.assertEqual(self.erros(antiga, limpa), {})
        reconfirmada = _com(_com(antiga, "personagem.raca", "Anão"), "personagem.tamanho_raca", "Anão")
        self.assertEqual(self.erros(antiga, reconfirmada), {})

    def test_tamanho_desconhecido(self):
        self.assertIn("personagem.tamanho", self.alterar("personagem.tamanho", "Gigantesco"))
        self.assertEqual(self.alterar("personagem.tamanho", "Médio"), {})


if __name__ == "__main__":
    unittest.main()
