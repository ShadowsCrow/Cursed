from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest

from cursed_platform import catalogos
from cursed_platform.catalogos import ARQUIVOS, CatalogoInvalido, Carregador, converter_base

RAIZ = Path(__file__).resolve().parents[2]
ORIGEM = RAIZ / "app_streamlit" / "data" / "catalogs"
GRUPOS_DAS_REGRAS = {
    "Abertura e mobilidade", "Sentidos e comunicação", "Capacidade", "Exposição, controle e dano contínuo",
}


def _sha(caminho: Path) -> str:
    return hashlib.sha256(caminho.read_bytes()).hexdigest()


class ManifestoTest(unittest.TestCase):
    def setUp(self):
        self.manifesto = json.loads((catalogos.DIRETORIO / "manifesto.json").read_text(encoding="utf-8"))

    def test_manifesto_registra_origem_hash_e_data_de_cada_arquivo(self):
        self.assertEqual(set(self.manifesto["arquivos"]), set(ARQUIVOS))
        for arquivo, info in self.manifesto["arquivos"].items():
            with self.subTest(arquivo=arquivo):
                self.assertTrue(info["origem"])
                self.assertRegex(info["copiado_em"], r"^\d{4}-\d{2}-\d{2}$")
                hashes = info["sha256_origem"]
                for valor in (hashes.values() if isinstance(hashes, dict) else [hashes]):
                    self.assertRegex(valor, r"^[0-9a-f]{64}$")
                self.assertIsInstance(info["transformacoes"], list)

    @unittest.skipUnless(ORIGEM.exists(), "app_streamlit ausente")
    def test_hash_registrado_e_o_da_origem_no_momento_da_copia(self):
        # A cópia de classes e raças foi feita sem transformação: nasceu igual à origem.
        for nome in ("classes.json", "racas.json", "efeitos_default.json"):
            with self.subTest(arquivo=nome):
                self.assertEqual(self.manifesto["arquivos"][nome]["sha256_origem"], _sha(ORIGEM / nome))

    def test_efeitos_documentam_a_transformacao_da_copia(self):
        transformacoes = " ".join(self.manifesto["arquivos"]["efeitos_default.json"]["transformacoes"])
        self.assertIn("grupo", transformacoes)
        self.assertIn("suspenso", transformacoes)


class ProcedenciaTest(unittest.TestCase):
    def _copiar(self) -> tuple[Path, Path]:
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        destino = pasta / "catalogos"
        shutil.copytree(catalogos.DIRETORIO, destino)
        raiz = pasta / "raiz"
        manifesto = json.loads((destino / "manifesto.json").read_text(encoding="utf-8"))
        for info in manifesto["arquivos"].values():
            origens = info["sha256_origem"]
            for caminho in (origens if isinstance(origens, dict) else {info["origem"]: None}):
                alvo = raiz / caminho
                alvo.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(RAIZ / caminho, alvo)
        return destino, raiz

    @unittest.skipUnless(ORIGEM.exists(), "app_streamlit ausente")
    def test_divergencia_com_a_origem_e_informada_sem_falhar(self):
        destino, raiz = self._copiar()
        (raiz / "app_streamlit/data/catalogs/classes.json").write_text("[]", encoding="utf-8")
        texto = (destino / "racas.json").read_text(encoding="utf-8").replace('"deslocamento": 9', '"deslocamento": 10', 1)
        (destino / "racas.json").write_text(texto, encoding="utf-8")

        relatorio = {p.arquivo: p for p in catalogos.relatorio_procedencia(destino, raiz)}

        self.assertTrue(relatorio["classes.json"].origem_alterada)
        self.assertFalse(relatorio["classes.json"].copia_alterada)
        self.assertTrue(relatorio["racas.json"].copia_alterada)
        self.assertFalse(relatorio["racas.json"].origem_alterada)
        # A cópia editada continua valendo: é a fonte de trabalho.
        self.assertEqual(catalogos.ler(destino).raca("Humano").deslocamento, 10)


class ConteudoTest(unittest.TestCase):
    def setUp(self):
        self.catalogo = catalogos.ler()

    def test_mago_tem_as_bases_de_classes_json(self):
        mago = self.catalogo.classe("Mago")
        self.assertEqual((mago.pv.valor, mago.escala_pv.valor, mago.pp.valor, mago.escala_pp.valor), (12, 2, 8, 5))
        self.assertEqual((mago.pv.atributo, mago.escala_pv.atributo), ("vigor", "vigor"))
        self.assertEqual((mago.pp.atributo, mago.escala_pp.atributo), ("proposito", "proposito"))

    def test_as_36_bases_das_9_classes_sao_convertidas(self):
        self.assertEqual(len(self.catalogo.classes), 9)
        bases = [b for c in self.catalogo.classes for b in (c.pv, c.escala_pv, c.pp, c.escala_pp)]
        self.assertEqual(len(bases), 36)
        self.assertTrue(all(b is not None for b in bases))
        self.assertTrue(all(b.atributo in {"vigor", "proposito"} for b in bases))

    def test_formato_inesperado_de_base_e_erro(self):
        for valor in ("doze", "12 + 2", "12 vigor", 12):
            with self.subTest(valor=valor), self.assertRaises(CatalogoInvalido):
                converter_base(valor, arquivo="classes.json", onde="Mago, PV")
        self.assertIsNone(converter_base(None, arquivo="classes.json", onde="Mago, PV"))

    def test_arquetipos_da_classe(self):
        self.assertEqual([a.nome for a in self.catalogo.classe("Gatuno").arquetipos], ["Ladrão", "Assassino", "Psionico"])
        self.assertTrue(self.catalogo.classe("mago").arquetipo("mutante  arcano"))

    def test_placeholders_de_raca_nao_viram_habilidade(self):
        self.assertEqual(len(self.catalogo.racas), 9)
        self.assertTrue(all(r.habilidades == () for r in self.catalogo.racas))
        self.assertEqual(self.catalogo.raca("Golias").tamanho, "Enorme")

    def test_efeitos_default_nos_grupos_das_regras_e_sobrepeso_suspenso(self):
        aplicaveis = self.catalogo.efeitos_aplicaveis()
        self.assertEqual(len(aplicaveis), 17)
        self.assertEqual({e["grupo"] for e in aplicaveis}, GRUPOS_DAS_REGRAS)
        self.assertNotIn("cc_above", {e["associacao"] for e in aplicaveis})
        sobrepeso = next(e for e in self.catalogo.efeitos_default if e["associacao"] == "cc_above")
        self.assertIn("Sobrecarga", sobrepeso["suspenso"]["motivo"])

    def test_listas_da_ficha(self):
        listas = self.catalogo.listas
        self.assertEqual(listas.sexos, ("Masculino", "Feminino", "Outro"))
        self.assertEqual(len(listas.alinhamentos), 9)
        self.assertEqual([p.nome for p in listas.pecados],
                         ["Ira", "Gula", "Ganância", "Luxúria", "Inveja", "Preguiça", "Orgulho"])
        self.assertEqual(listas.pecado("Ganancia").nome, "Ganância")
        self.assertIsNone(listas.pecado("Soberba"))
        self.assertEqual(len(listas.campos_personalidade), 9)


class RecargaTest(unittest.TestCase):
    def setUp(self):
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        self.pasta = pasta / "catalogos"
        shutil.copytree(catalogos.DIRETORIO, self.pasta)
        self.carregador = Carregador(self.pasta)

    def _gravar(self, nome: str, texto: str) -> None:
        caminho = self.pasta / nome
        anterior = caminho.stat().st_mtime_ns
        caminho.write_text(texto, encoding="utf-8")
        # Garante data de modificação diferente mesmo em sistemas de arquivos com baixa resolução.
        os.utime(caminho, ns=(anterior + 10**9, anterior + 10**9))

    def _classes(self) -> str:
        return (self.pasta / "classes.json").read_text(encoding="utf-8")

    def test_alteracao_vale_sem_reiniciar(self):
        self.assertEqual(self.carregador.obter().classe("Mago").pv.valor, 12)
        versao = self.carregador.obter().versao

        self._gravar("classes.json", self._classes().replace('"12 + vigor"', '"14 + vigor"', 1))

        atual = self.carregador.obter()
        self.assertEqual(atual.classe("Mago").pv.valor, 14)
        self.assertNotEqual(atual.versao, versao)

    def test_json_invalido_mantem_a_ultima_versao_valida_e_guarda_o_erro(self):
        self.carregador.obter()
        original = self._classes()

        self._gravar("classes.json", original.replace('"12 + vigor"', '"doze"', 1))
        self.assertEqual(self.carregador.obter().classe("Mago").pv.valor, 12)
        erro = self.carregador.erro()
        self.assertEqual(erro.arquivo, "classes.json")
        self.assertIn("Mago, PV", erro.motivo)

        self._gravar("classes.json", "{ quebrado")
        self.assertEqual(self.carregador.obter().classe("Mago").pv.valor, 12)
        self.assertIn("JSON inválido", self.carregador.erro().motivo)

        self._gravar("classes.json", original)
        self.carregador.obter()
        self.assertIsNone(self.carregador.erro())

    def test_sem_versao_valida_a_leitura_falha_com_o_motivo(self):
        self._gravar("listas_ficha.json", "[]")
        with self.assertRaises(CatalogoInvalido) as contexto:
            self.carregador.obter()
        self.assertEqual(contexto.exception.arquivo, "listas_ficha.json")


if __name__ == "__main__":
    unittest.main()
