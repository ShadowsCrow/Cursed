"""Armazenamento local de objetos: caminhos longos (limite de 260 caracteres do Windows)."""

from __future__ import annotations

from pathlib import Path
import shutil
import tempfile
import unittest

from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.migracao_ativos import ArmazenamentoLocal, AtivoInvalido


class ArmazenamentoLocalTest(unittest.TestCase):
    def setUp(self):
        base = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, base, True)
        # Pasta raiz propositalmente longa, como a pasta temporária do ambiente local no Windows.
        self.raiz = base / ("objetos-" + "x" * 60)
        self.armazenamento = ArmazenamentoLocal(self.raiz)

    def test_grava_e_le_objeto_com_caminho_acima_de_260_caracteres(self):
        caminho = (f"mesas/{'m' * 32}/personagens/{'p' * 32}/imagens/ilustracao/{'a' * 64}.exibicao.webp")
        self.assertGreater(len(str(self.raiz / BUCKET_PRIVADO / caminho)), 260)
        self.armazenamento.gravar(BUCKET_PRIVADO, caminho, b"conteudo", "image/webp")
        self.assertEqual(self.armazenamento.ler(BUCKET_PRIVADO, caminho), b"conteudo")
        # Gravar de novo o mesmo conteúdo é idempotente; conteúdo diferente continua recusado.
        self.armazenamento.gravar(BUCKET_PRIVADO, caminho, b"conteudo", "image/webp")
        with self.assertRaises(AtivoInvalido):
            self.armazenamento.gravar(BUCKET_PRIVADO, caminho, b"outro", "image/webp")

    def test_caminho_fora_do_bucket_continua_recusado(self):
        with self.assertRaises(AtivoInvalido):
            self.armazenamento.gravar(BUCKET_PRIVADO, "../../fora.png", b"x", "image/png")


if __name__ == "__main__":
    unittest.main()
