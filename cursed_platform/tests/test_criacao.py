"""Cálculos do Framework no servidor: mesmos casos que a suíte TypeScript (`fixtures/criacao/casos.json`)."""

from __future__ import annotations

import json
from pathlib import Path
import unittest

from cursed_platform import catalogos
from cursed_platform.domain import criacao

CASOS = json.loads((Path(__file__).resolve().parents[2] / "fixtures" / "criacao" / "casos.json").read_text(encoding="utf-8"))


class CriacaoTest(unittest.TestCase):
    def setUp(self):
        self.framework = catalogos.obter().framework

    def test_grau_e_descansos(self):
        for caso in CASOS["graus"]:
            with self.subTest(caso["nome"]):
                calculados = criacao.calcular(self.framework, caso["natureza"], {"custo_aprendizado": caso["custo"]})
                esperado = caso["esperado"]
                self.assertEqual(calculados.grau, esperado["grau"])
                self.assertEqual(calculados.descansos_minimos, esperado["descansos"])
                self.assertEqual(calculados.abaixo_do_minimo, esperado["abaixo_do_minimo"])

    def test_custo_de_uso(self):
        for caso in CASOS["custo_uso"]:
            with self.subTest(caso["nome"]):
                self.assertEqual(criacao.custo_de_uso(self.framework, caso["potencia"], caso["tipo"]), caso["esperado"])

    def test_valor_do_narrador_prevalece(self):
        conteudo = {"potencia_uso": 1, "custo_uso": 3, "ativacao": "ativa"}
        calculados = criacao.calcular(self.framework, "habilidade", conteudo)
        self.assertEqual(calculados.custo_uso_framework, 1)
        self.assertEqual(criacao.custo_uso_efetivo(conteudo, calculados), 3)
        self.assertEqual(criacao.custo_uso_efetivo({"potencia_uso": 1}, calculados), 1)


class CodigoCR1Test(unittest.TestCase):
    """Código de importação de criações (adaptar-cartas-ao-framework, 4.1)."""

    RAIZES = {
        "tipo": "magia", "titulo": "Raízes do Brejo Faminto", "texto": "Raízes espinhosas brotam do solo.",
        "escola": "druidica", "ativacao": "ativa", "alcance": {"tipo": "metros", "metros": 15}, "forma": "circulo",
        "custo_aprendizado": 31, "potencia_uso": 20,
    }

    def test_ida_e_volta(self):
        from cursed_platform.domain import criacao_codec

        codigo = criacao_codec.codificar(self.RAIZES)
        self.assertTrue(codigo.startswith("CR1:"))
        self.assertEqual(criacao_codec.decodificar(codigo), self.RAIZES)
        tipo, rascunho, avisos = criacao_codec.preparar(criacao_codec.decodificar(codigo))
        self.assertEqual((tipo, avisos), ("magia", []))
        self.assertNotIn("tipo", rascunho)

    def test_grau_e_descansos_do_codigo_sao_conferidos_e_descartados(self):
        from cursed_platform.domain import criacao_codec

        _, rascunho, avisos = criacao_codec.preparar({**self.RAIZES, "custo_aprendizado": 26, "grau": "Básica", "descansos_minimos": 6})
        self.assertNotIn("grau", rascunho)
        self.assertNotIn("descansos_minimos", rascunho)
        self.assertEqual(avisos, ["Grau do código (Básica) substituído pelo calculado (Intermediária)."])
        _, _, avisos = criacao_codec.preparar({**self.RAIZES, "grau": "intermediaria", "descansos_minimos": 4})
        self.assertEqual(avisos, ["Descansos Mínimos do código (4) substituídos pelos calculados (6)."])
        codigo = criacao_codec.codificar({**self.RAIZES, "grau": "Intermediária"})
        self.assertNotIn("grau", criacao_codec.decodificar(codigo))

    def test_codigo_corrompido_ou_sem_tipo(self):
        from cursed_platform.domain import criacao_codec

        with self.assertRaisesRegex(ValueError, "Código inválido"):
            criacao_codec.decodificar("CR1:quebrado")
        with self.assertRaisesRegex(ValueError, "tipo"):
            criacao_codec.preparar({"titulo": "Sem tipo", "texto": "x"})

    def test_codificar_recusa_o_que_a_plataforma_recusaria(self):
        from cursed_platform.domain import criacao_codec

        with self.assertRaisesRegex(ValueError, "escola: Escolha uma destas escolas"):
            criacao_codec.codificar({**self.RAIZES, "escola": "arcana"})
        with self.assertRaisesRegex(ValueError, "cor: Este campo não pertence"):
            criacao_codec.codificar({**self.RAIZES, "cor": "verde"})
        with self.assertRaisesRegex(ValueError, "alcance.metros"):
            criacao_codec.codificar({**self.RAIZES, "alcance": {"tipo": "metros", "metros": 7.5}})

    def test_linha_de_comando(self):
        import subprocess
        import sys
        import tempfile

        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "raizes.json"
            arquivo.write_text(json.dumps(self.RAIZES, ensure_ascii=False), encoding="utf-8")
            comando = [sys.executable, "-m", "cursed_platform.domain.criacao_codec"]
            raiz = Path(__file__).resolve().parents[2]
            codificado = subprocess.run([*comando, "codificar", str(arquivo)], capture_output=True, text=True,
                                        encoding="utf-8", cwd=raiz, check=True).stdout.strip()
            self.assertTrue(codificado.startswith("CR1:"))
            decodificado = subprocess.run([*comando, "decodificar", codificado], capture_output=True, text=True,
                                          encoding="utf-8", cwd=raiz, check=True).stdout
            self.assertEqual(json.loads(decodificado), self.RAIZES)
            arquivo.write_text(json.dumps({**self.RAIZES, "escola": "arcana"}), encoding="utf-8")
            recusado = subprocess.run([*comando, "codificar", str(arquivo)], capture_output=True, text=True,
                                      encoding="utf-8", cwd=raiz)
            self.assertEqual(recusado.returncode, 1)
            self.assertIn("escola", recusado.stderr)


if __name__ == "__main__":
    unittest.main()
