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
    return catalogos.hash_de_texto(caminho.read_bytes())


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
        # A cópia editada só é detectada em arquivos sem transformações registradas (classes.json).
        (raiz / "app_streamlit/data/catalogs/racas.json").write_text("[]", encoding="utf-8")
        texto = (destino / "classes.json").read_text(encoding="utf-8").replace('"cor": "#5B2C6F"', '"cor": "#000000"', 1)
        (destino / "classes.json").write_text(texto, encoding="utf-8")

        relatorio = {p.arquivo: p for p in catalogos.relatorio_procedencia(destino, raiz)}

        self.assertTrue(relatorio["racas.json"].origem_alterada)
        self.assertFalse(relatorio["racas.json"].copia_alterada)
        self.assertTrue(relatorio["classes.json"].copia_alterada)
        self.assertFalse(relatorio["classes.json"].origem_alterada)
        # A cópia editada continua valendo: é a fonte de trabalho.
        self.assertEqual(catalogos.ler(destino).classes[0].cor, "#000000")


class ConteudoTest(unittest.TestCase):
    def setUp(self):
        self.catalogo = catalogos.ler()
        self.listas_brutas = json.loads((catalogos.DIRETORIO / "listas_ficha.json").read_text(encoding="utf-8"))

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

    def test_custos_de_habilidade_opcionais_no_json(self):
        """cartas-do-catalogo-somente-leitura 1.1."""
        bruta = {"nome": "Forma", "descricao": "Texto.", "tipo": "Ativa", "custo": "2 PP", "custo_aprendizado": 3, "custo_uso": 0}
        habilidade, = catalogos._habilidades([bruta], arquivo="classes.json", onde="Druida")
        self.assertEqual(dict(habilidade.custos), {"custo_aprendizado": 3, "custo_uso": 0})
        self.assertEqual(habilidade.custo_legado, "2 PP")
        sem, = catalogos._habilidades([{"nome": "Outra", "descricao": "Texto."}], arquivo="classes.json", onde="Druida")
        self.assertEqual(sem.custos, ())
        for valor in (-1, "3", 1.5, True):
            with self.subTest(valor=valor), self.assertRaises(CatalogoInvalido) as erro:
                catalogos._habilidades([{**bruta, "potencia_uso": valor}], arquivo="classes.json", onde="Druida")
            self.assertIn("potencia_uso", str(erro.exception))

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
        self.assertEqual(len(listas.campos_personalidade), 12)

    def test_historia_e_campo_longo_com_limite(self):
        campos = {c.chave: c for c in self.catalogo.listas.campos_personalidade}
        historia = campos["historia"]
        self.assertEqual((historia.rotulo, historia.longo, historia.limite), ("História", True, 4000))
        self.assertEqual(historia.dica, "Ex: de onde veio, o que perdeu e o que o fez partir")
        self.assertEqual((campos["meu_lema"].longo, campos["meu_lema"].limite), (False, None))

    def test_icones_da_ficha_por_nome_gravado(self):
        icones = dict(self.catalogo.listas.icones_ficha)
        self.assertEqual(icones["Proposito"], "proposito")
        self.assertEqual(icones["Arcanismo"], "arcanismo")
        self.assertEqual(icones["Conhecimentos"], "conhecimentos")

    def test_campo_de_personalidade_e_icones_invalidos(self):
        base = {"chave": "historia", "rotulo": "História", "dica": ""}
        # Sem a arrumação da aba: o erro precisa vir do campo, e não de um grupo que cita campos ausentes.
        sem_arrumacao = {k: v for k, v in self.listas_brutas.items()
                         if k not in ("personalidade_topo", "grupos_personalidade", "icones_personalidade")}
        catalogos.converter_listas({**sem_arrumacao, "campos_personalidade": [base]})
        for extra in ({"limite": 0}, {"limite": -5}, {"limite": "4000"}, {"limite": True}, {"longo": "sim"}):
            dados = {**sem_arrumacao, "campos_personalidade": [{**base, **extra}]}
            with self.subTest(extra=extra), self.assertRaises(CatalogoInvalido):
                catalogos.converter_listas(dados)
        for icones in ([], {"Força": "Forca"}, {"Força": ""}, {" ": "forca"}, {"Força": 3}):
            with self.subTest(icones=icones), self.assertRaises(CatalogoInvalido):
                catalogos.converter_listas({**self.listas_brutas, "icones_ficha": icones})

    def test_icones_ausentes_sao_aceitos(self):
        dados = {k: v for k, v in self.listas_brutas.items() if k != "icones_ficha"}
        self.assertEqual(catalogos.converter_listas(dados).icones_ficha, ())


class PersonalidadeTest(unittest.TestCase):
    """Frase marcante, Traços e a arrumação da aba Personalidade (reformular-personalidade-da-ficha)."""

    def setUp(self):
        self.brutas = json.loads((catalogos.DIRETORIO / "listas_ficha.json").read_text(encoding="utf-8"))
        self.listas = catalogos.converter_listas(self.brutas)

    def _com(self, **mudancas) -> dict:
        return json.loads(json.dumps({**self.brutas, **mudancas}))

    def _grupos(self) -> list[dict]:
        return json.loads(json.dumps(self.brutas["grupos_personalidade"]))

    def _campos(self) -> list[dict]:
        return json.loads(json.dumps(self.brutas["campos_personalidade"]))

    def test_frase_e_tracos(self):
        frase = self.listas.campo_personalidade("frase")
        tracos = self.listas.campo_personalidade("tracos")
        self.assertEqual((frase.rotulo, frase.tipo, frase.limite), ("Frase marcante", "texto", 160))
        self.assertEqual((tracos.rotulo, tracos.tipo, tracos.maximo, tracos.limite), ("Traços", "tracos", 6, 24))

    def test_arrumacao_da_referencia(self):
        self.assertEqual(self.listas.personalidade_topo, catalogos.TopoPersonalidade("frase", "tracos"))
        essencia, sombras = self.listas.grupos_personalidade
        self.assertEqual((essencia.titulo, essencia.subtitulo, essencia.emblema),
                         ("Traços e essência", "O que o move, o que acredita e o que o define.", "rosa_dos_ventos"))
        self.assertEqual(essencia.campos, ("alinhamento", "coisa_favorita", "quando_me_veem", "vivo_para", "medo"))
        self.assertEqual((sombras.titulo, sombras.emblema), ("Convicções e sombras", "lua_solar"))
        self.assertEqual(sombras.campos, ("pecado", "odeia", "manias", "meu_lema", "valor_inquebravel", "religiao"))
        self.assertEqual(dict(self.listas.icones_personalidade), {"alinhamento": "balanca", "pecado": "caveira"})
        self.assertEqual(self.listas.campo_personalidade("medo").icone, "aranha")
        self.assertEqual(self.listas.campo_personalidade("historia").icone, "livro_fechado")

    def test_campo_trocado_de_grupo(self):
        grupos = self._grupos()
        grupos[0]["campos"].remove("medo")
        grupos[1]["campos"].append("medo")
        listas = catalogos.converter_listas(self._com(grupos_personalidade=grupos))
        self.assertEqual(listas.grupos_personalidade[1].campos[-1], "medo")

    def test_sem_arrumacao_e_aceito(self):
        dados = {k: v for k, v in self.brutas.items() if k not in ("personalidade_topo", "grupos_personalidade")}
        listas = catalogos.converter_listas(dados)
        self.assertEqual((listas.personalidade_topo, listas.grupos_personalidade), (None, ()))

    def test_recusas_nomeiam_o_campo(self):
        grupos_dois = self._grupos()
        grupos_dois[1]["campos"].append("coisa_favorita")
        grupos_inexistente = self._grupos()
        grupos_inexistente[0]["campos"].append("sonho")
        grupos_longo = self._grupos()
        grupos_longo[0]["campos"].append("historia")
        grupos_sem = self._grupos()
        grupos_sem[1]["campos"].remove("meu_lema")
        grupos_emblema = self._grupos()
        grupos_emblema[0]["emblema"] = "dragao"
        campos_icone = self._campos()
        campos_icone[3]["icone"] = "dragao"
        campos_maximo = self._campos()
        campos_maximo[0]["maximo"] = 3
        campos_novo = self._campos() + [{"chave": "sonho", "rotulo": "Sonho", "dica": ""}]
        casos = [
            ("em dois grupos", self._com(grupos_personalidade=grupos_dois), "coisa_favorita"),
            ("campo inexistente", self._com(grupos_personalidade=grupos_inexistente), "sonho"),
            ("longo num grupo", self._com(grupos_personalidade=grupos_longo), "historia"),
            ("campo curto sem lugar", self._com(grupos_personalidade=grupos_sem), "meu_lema"),
            ("campo novo sem lugar", self._com(campos_personalidade=campos_novo), "sonho"),
            ("emblema desconhecido", self._com(grupos_personalidade=grupos_emblema), "dragao"),
            ("ícone desconhecido", self._com(campos_personalidade=campos_icone), "dragao"),
            ("máximo num campo de texto", self._com(campos_personalidade=campos_maximo), "frase"),
            ("citação em traços", self._com(personalidade_topo={"citacao": "tracos", "etiquetas": "frase"}), "tracos"),
            ("ícone de campo inexistente", self._com(icones_personalidade={"sonho": "olho"}), "sonho"),
        ]
        for caso, dados, nome in casos:
            with self.subTest(caso), self.assertRaises(CatalogoInvalido) as erro:
                catalogos.converter_listas(dados)
            self.assertIn(nome, str(erro.exception))

    def test_icones_iguais_aos_desenhos_da_tela(self):
        """Todo ícone aceito no JSON tem desenho no frontend, e vice-versa (D7)."""
        fonte = (RAIZ / "platform" / "frontend" / "src" / "app" / "characters" / "sheet" / "personalidade"
                 / "nomesDosIcones.ts").read_text(encoding="utf-8")
        bloco = fonte[fonte.index("NOMES_ICONES_PERSONALIDADE = ["):fonte.index("] as const")]
        import re
        self.assertEqual(sorted(re.findall(r'"([a-z_]+)"', bloco)), sorted(catalogos.ICONES_PERSONALIDADE))

    def test_tracos_sem_maximo_e_chave_reservada(self):
        campos = self._campos()
        del campos[1]["maximo"]
        with self.assertRaises(CatalogoInvalido):
            catalogos.converter_listas(self._com(campos_personalidade=campos))
        campos = self._campos() + [{"chave": "pecado", "rotulo": "Pecado", "dica": ""}]
        with self.assertRaises(CatalogoInvalido) as erro:
            catalogos.converter_listas(self._com(campos_personalidade=campos))
        self.assertIn("reservada", str(erro.exception))


class ItensTest(unittest.TestCase):
    def setUp(self):
        self.brutos = json.loads((catalogos.DIRETORIO / "itens.json").read_text(encoding="utf-8"))

    def _com(self, **mudancas) -> dict:
        return {**json.loads(json.dumps(self.brutos)), **mudancas}

    def test_raridades_e_categorias_da_decisao_do_usuario(self):
        itens = catalogos.ler().itens
        self.assertEqual([r.rotulo for r in itens.raridades], ["Comum", "Incomum", "Raro", "Épico", "Lendário"])
        self.assertEqual(itens.raridade_padrao, "comum")
        self.assertEqual(itens.escolhas_em_outros(), ("consumiveis", "materiais", "chaves", "itens_de_missao", "diversos"))
        self.assertEqual(itens.categoria_padrao_outros, "diversos")

    def test_categoria_efetiva(self):
        itens = catalogos.ler().itens
        self.assertEqual(itens.categoria_efetiva("uma_mao", None), "armas")
        # Nos tipos que não são Outros, a categoria vem do subtipo, mesmo que outra tenha sido gravada.
        self.assertEqual(itens.categoria_efetiva("escudo", "chaves"), "escudos")
        self.assertEqual(itens.categoria_efetiva("moedas", None), "moedas")
        self.assertEqual(itens.categoria_efetiva("outro", "chaves"), "chaves")
        self.assertEqual(itens.categoria_efetiva("outro", None), "diversos")
        self.assertEqual(itens.categoria_efetiva("outro", "armas"), "diversos")

    def test_catalogo_de_itens_invalido(self):
        categorias = self.brutos["categorias"]
        armas = next(c for c in categorias if c["id"] == "armas")
        casos = {
            "id repetido": self._com(raridades=[*self.brutos["raridades"], self.brutos["raridades"][0]]),
            "cor inválida": self._com(raridades=[{**self.brutos["raridades"][0], "cor": "verde"}]),
            "sem raridades": self._com(raridades=[]),
            "subtipo sem categoria": self._com(categorias=[c for c in categorias if c["id"] != "escudos"]),
            "subtipo em duas": self._com(categorias=[*categorias, {**armas, "id": "armas_2"}]),
            "dois padrões": self._com(categorias=[{**c, "padrao_outros": True} if c.get("escolha_em_outros") else c
                                                  for c in categorias]),
            "sem padrão": self._com(categorias=[{k: v for k, v in c.items() if k != "padrao_outros"} for c in categorias]),
            "subtipo desconhecido": self._com(categorias=[{**armas, "subtipos": ["uma_mao", "lanca"]}, *categorias[1:]]),
            "subtipos e escolha": self._com(categorias=[{**armas, "escolha_em_outros": True}, *categorias[1:]]),
        }
        for nome, dados in casos.items():
            with self.subTest(caso=nome), self.assertRaises(CatalogoInvalido):
                catalogos.converter_itens(dados)

    def test_campos_por_subtipo_seguem_equipamentos(self):
        itens = catalogos.ler().itens
        ids = lambda subtipo: [c.id for c in itens.campos_do_subtipo(subtipo)]  # noqa: E731
        # Capacete, luvas, botas e acessórios não dão Armadura nem RDB, e nenhum subtipo pede peso.
        for subtipo in ("capacete", "luvas", "botas", "mochila", "aljava", "outro"):
            with self.subTest(subtipo=subtipo):
                self.assertEqual(ids(subtipo), ["propriedades"])
        for subtipo in ("peitoral", "escudo"):
            self.assertTrue({"armadura", "rdb", "requisito_forca"} <= set(ids(subtipo)))
        self.assertEqual(ids("uma_mao"), ids("duas_maos"))
        self.assertTrue({"dano", "tipo_dano", "alcance_normal", "alcance_maximo"} <= set(ids("uma_mao")))
        self.assertNotIn("peso", itens.campos)
        self.assertEqual(itens.listas["tipos_dano"][:3], ("Cortante", "Perfurante", "Contundente"))

    def test_problemas_dos_dados_do_item(self):
        itens = catalogos.ler().itens
        self.assertEqual(itens.problemas_dos_dados("uma_mao", {
            "dano": "1d8", "tipo_dano": "Cortante", "atributo_ataque": ["Força", "Destreza"], "alcance_normal": 0,
            "propriedades": ["Leve", "Feita de osso"], "familia_proficiencia": None, "categoria_arma": "",
        }), [])
        problemas = dict(itens.problemas_dos_dados("uma_mao", {
            "tipo_dano": "Gelatinoso", "alcance_normal": -1, "requisito_forca": True, "atributo_ataque": ["Sorte"],
            "armadura": 2, "peso": 3,
        }))
        self.assertEqual(set(problemas), {"tipo_dano", "alcance_normal", "requisito_forca", "atributo_ataque", "armadura", "peso"})
        self.assertEqual(problemas["armadura"], "Não se aplica a este tipo de item.")
        self.assertEqual(itens.problemas_dos_dados("mochila", {"dano": "1d4"}), [("dano", "Não se aplica a este tipo de item.")])

    def test_campos_por_subtipo_invalidos(self):
        campos = self.brutos["campos"]
        por_subtipo = self.brutos["campos_por_subtipo"]
        casos = {
            "campo inexistente": self._com(campos_por_subtipo={**por_subtipo, "escudo": ["escudo_magico"]}),
            "lista inexistente": self._com(campos={**campos, "tipo_dano": {**campos["tipo_dano"], "lista": "cores"}}),
            "subtipo desconhecido": self._com(campos_por_subtipo={**por_subtipo, "lanca": ["dano"]}),
            "subtipo faltando": self._com(campos_por_subtipo={k: v for k, v in por_subtipo.items() if k != "aljava"}),
            "tipo de campo inválido": self._com(campos={**campos, "dano": {**campos["dano"], "tipo": "dado"}}),
            "sugestões fora de etiquetas": self._com(campos_por_subtipo={**por_subtipo,
                                                                         "escudo": [{"campo": "armadura", "sugestoes": "tipos_dano"}]}),
            "campo repetido": self._com(campos_por_subtipo={**por_subtipo, "capacete": ["propriedades", "propriedades"]}),
        }
        for nome, dados in casos.items():
            with self.subTest(caso=nome), self.assertRaises(CatalogoInvalido):
                catalogos.converter_itens(dados)


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


class FrameworkTest(unittest.TestCase):
    """Tabelas do Framework de Criação (adaptar-cartas-ao-framework, D4)."""

    def setUp(self):
        self.dados = json.loads((catalogos.DIRETORIO / "framework.json").read_text(encoding="utf-8"))

    def _invalido(self, dados) -> str:
        with self.assertRaises(CatalogoInvalido) as erro:
            catalogos.converter_framework(dados)
        self.assertEqual(erro.exception.arquivo, "framework.json")
        return erro.exception.motivo

    def test_faixas_e_opcoes_das_regras(self):
        framework = catalogos.converter_framework(self.dados)
        magia = framework.naturezas["magia"]
        self.assertEqual(magia.custo_minimo, 12)
        self.assertEqual([(f.grau, f.minimo, f.maximo, f.descansos) for f in magia.faixas], [
            ("basica", 12, 16, 3), ("simples", 17, 23, 4), ("intermediaria", 24, 32, 6), ("avancada", 33, 44, 8),
            ("especialista", 45, 59, 12), ("mestra", 60, 79, 18), ("lendaria", 80, None, 25)])
        habilidade = framework.naturezas["habilidade"]
        self.assertEqual(habilidade.custo_minimo, 6)
        self.assertEqual([(f.minimo, f.maximo) for f in habilidade.faixas],
                         [(6, 10), (11, 16), (17, 24), (25, 34), (35, 47), (48, 63), (64, None)])
        self.assertEqual((framework.divisor_uso, framework.minimo_uso, framework.sem_custo_uso), (80, 1, ("passiva_permanente",)))
        self.assertEqual(len(framework.escolas), 8)
        self.assertEqual(framework.rotulo("escolas", "sagrada"), "Sagrada da Criação")
        self.assertEqual([o.id for o in framework.tipos], ["ativa", "reacao", "passiva_condicional", "passiva_permanente"])
        self.assertEqual([o.id for o in framework.alcances], ["pessoal", "toque", "arma", "metros"])
        self.assertEqual(framework.alcance_com_distancia, "metros")
        self.assertIn("framework.json", ARQUIVOS)

    def test_faixas_sobrepostas_sao_recusadas(self):
        self.dados["naturezas"]["magia"]["faixas"][1]["minimo"] = 15
        self.assertIn("'basica' e 'simples' se sobrepõem", self._invalido(self.dados))

    def test_ultima_faixa_precisa_ser_aberta(self):
        self.dados["naturezas"]["habilidade"]["faixas"][-1]["maximo"] = 99
        self.assertIn("última faixa precisa ser aberta", self._invalido(self.dados))

    def test_primeira_faixa_comeca_no_custo_minimo(self):
        self.dados["naturezas"]["magia"]["custo_minimo"] = 10
        self.assertIn("custo mínimo", self._invalido(self.dados))

    def test_id_repetido_e_recusado(self):
        self.dados["escolas"].append({"id": "elemental", "rotulo": "Outra"})
        self.assertIn("escolas: id 'elemental' repetida", self._invalido(self.dados))

    def test_grau_desconhecido_e_alcance_sem_distancia(self):
        self.dados["naturezas"]["magia"]["faixas"][0]["grau"] = "novata"
        self.assertIn("um dos graus declarados", self._invalido(self.dados))
        self.setUp()
        self.dados["alcances"][-1].pop("distancia")
        self.assertIn("'distancia': true", self._invalido(self.dados))
