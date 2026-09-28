"""Alturas por raça e faixas por Tamanho (tarefas 8.1 e 8.2 de criacao-guiada-e-nova-estetica)."""

from __future__ import annotations

import json
from pathlib import Path
import re
import shutil
import tempfile
import unittest

from cursed_platform import catalogos
from cursed_platform.catalogos import CatalogoInvalido

LIVRO = Path(__file__).resolve().parents[2] / "rules" / "sistema" / "Criação de Personagem.md"
# Valores aprovados pelo usuário em 2026-09-28 (design D12).
FAIXAS = {"Minúsculo": (0.10, 0.60), "Pequeno": (0.60, 1.40), "Médio": (1.40, 2.10),
          "Grande": (2.10, 3.00), "Enorme": (3.00, 5.00), "Colossal": (5.00, None)}
RACAS = {"Humano": (1.55, 1.90), "Elfo": (1.60, 1.95), "Drow": (1.55, 1.85), "Troll": (1.80, 2.10),
         "Anão": (1.10, 1.40), "Gnomo": (0.90, 1.20), "Goblin": (0.80, 1.20), "Orc": (2.10, 2.50), "Golias": (3.00, 3.80)}


def _metros(texto: str) -> float:
    return float(texto.replace(",", "."))


def tabelas_do_livro() -> tuple[dict, dict]:
    secao = LIVRO.read_text(encoding="utf-8").split("### Altura e Tamanho fora da média", 1)[1].split("\n## ", 1)[0]
    racas, faixas = {}, {}
    for linha in secao.splitlines():
        celulas = [c.strip() for c in linha.strip().strip("|").split("|")]
        numeros = re.findall(r"`(\d+,\d+) m`", linha)
        if len(celulas) == 3 and len(numeros) == 2:
            racas[celulas[0]] = (_metros(numeros[0]), _metros(numeros[1]))
        elif len(celulas) == 2 and numeros:
            faixas[celulas[0]] = (_metros(numeros[0]), _metros(numeros[1]) if len(numeros) == 2 else None)
    return racas, faixas


class AlturasTest(unittest.TestCase):
    def setUp(self):
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        self.pasta = pasta / "catalogos"
        shutil.copytree(catalogos.DIRETORIO, self.pasta)

    def editar(self, arquivo: str, mudar) -> None:
        caminho = self.pasta / arquivo
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        mudar(dados)
        caminho.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")

    def test_valores_aprovados_carregados(self):
        c = catalogos.ler()
        self.assertEqual({r.nome: (r.altura.minima, r.altura.maxima) for r in c.racas}, RACAS)
        self.assertEqual({f.tamanho: (f.intervalo.minima, f.intervalo.maxima) for f in c.listas.faixas_de_altura}, FAIXAS)
        self.assertTrue(c.listas.faixa("colossal").intervalo.contem(1000))

    def test_livro_e_dados_tem_os_mesmos_numeros(self):
        racas, faixas = tabelas_do_livro()
        self.assertEqual(racas, RACAS)
        self.assertEqual(faixas, FAIXAS)
        texto = LIVRO.read_text(encoding="utf-8").split("### Altura e Tamanho fora da média", 1)[1].split("\n## ", 1)[0]
        for termo in ("json", "aplicação", "ficha digital", "campo"):
            self.assertNotIn(termo, texto.lower())

    def test_faixa_fora_de_ordem_recusada(self):
        def trocar(d):
            f = d["faixas_de_altura"]
            f[1], f[2] = f[2], f[1]
        self.editar("listas_ficha.json", trocar)
        with self.assertRaisesRegex(CatalogoInvalido, "nessa ordem"):
            catalogos.ler(self.pasta)

    def test_faixa_descontinua_recusada(self):
        self.editar("listas_ficha.json", lambda d: d["faixas_de_altura"][3].update(minima=2.2))
        with self.assertRaisesRegex(CatalogoInvalido, "precisa começar onde termina"):
            catalogos.ler(self.pasta)

    def test_so_o_maior_tamanho_fica_sem_teto(self):
        self.editar("listas_ficha.json", lambda d: d["faixas_de_altura"][2].update(maxima=None))
        with self.assertRaises(CatalogoInvalido):
            catalogos.ler(self.pasta)

    def test_raca_fora_da_faixa_do_seu_tamanho_recusada(self):
        self.editar("racas.json", lambda d: next(r for r in d if r["nome"] == "Humano")["altura"].update(maxima=2.4))
        with self.assertRaisesRegex(CatalogoInvalido, "Humano: a altura típica precisa caber na faixa do Tamanho Médio"):
            catalogos.ler(self.pasta)

    def test_intervalo_invalido_recusado(self):
        self.editar("racas.json", lambda d: d[0]["altura"].update(minima=2.0))
        with self.assertRaisesRegex(CatalogoInvalido, "maior que a mínima"):
            catalogos.ler(self.pasta)


if __name__ == "__main__":
    unittest.main()
