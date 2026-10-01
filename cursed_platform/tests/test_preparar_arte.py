"""Script de preparação da arte do tema (tarefa 3.5 de criacao-guiada-e-nova-estetica).

As matrizes ficam fora do Git (`platform/frontend/arte-original/`); sem elas o teste é pulado.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from PIL import Image, ImageChops, ImageDraw, ImageStat

FRONTEND = Path(__file__).resolve().parents[2] / "platform" / "frontend"
_spec = importlib.util.spec_from_file_location("preparar_arte", FRONTEND / "scripts" / "preparar_arte.py")
preparar_arte = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(preparar_arte)

ESPERADO = {
    "ancora-castelo-1536": (1536, 768), "ancora-castelo-768": (768, 384),
    "fundo-noite": (512, 512), "pergaminho": (512, 512),
    "emblema-cursed-256": (256, 256), "emblema-cursed-1024": (1024, 1024),
    "retrato-vazio": (900, 1200),
    **{f"etapa-{etapa}": (1200, 800) for etapa in preparar_arte.ETAPAS},
    "favicon-16": (16, 16), "favicon-32": (32, 32),
    # Pinturas do Resumo da ficha: opcionais, só existem quando a matriz foi gerada.
    **{nome: tamanho for nome, (_, tamanho, *_) in preparar_arte.ARTES_DO_RESUMO.items()
       if (preparar_arte.ORIGEM / f"{nome}.png").exists()},
    # Pinturas de Informações básicas (redesenhar-informacoes-basicas): opcionais por matriz.
    **{nome: tamanho for nome, (_, tamanho, *_) in preparar_arte.ARTES_DAS_INFORMACOES.items()
       if (preparar_arte.ORIGEM / f"{nome}.png").exists()},
    # Pinturas das abas Atributos e Perícias (redesenhar-aba-atributos e redesenhar-aba-pericias): opcionais por matriz.
    **{nome: tamanho for artes in (preparar_arte.ARTES_DOS_ATRIBUTOS, preparar_arte.ARTES_DAS_PERICIAS,
                                   preparar_arte.ARTES_DA_PERSONALIDADE)
       for nome, (_, tamanho, *_) in artes.items() if (preparar_arte.ORIGEM / f"{nome}.png").exists()},
    # Arte da navegação inicial (navegacao-inicial-e-perfil): também opcional por matriz.
    **{saida: tamanho for matriz, recortes in preparar_arte.ARTES_DA_NAVEGACAO.items()
       for saida, _, tamanho, _ in recortes if (preparar_arte.ORIGEM / f"{matriz}.png").exists()},
    preparar_arte.RETRATO_JOGADOR_QUADRADO[0]: preparar_arte.RETRATO_JOGADOR_QUADRADO[2],
    # Pinturas da aba Cartas e do editor (redesenhar-aba-cartas e simplificar-criacao-de-cartas): opcionais por
    # matriz; cada arte quadrada de categoria gera também o medalhão recortado.
    **{nome: tamanho for nome, (_, tamanho, *_) in preparar_arte.artes_das_cartas().items()
       if (preparar_arte.ORIGEM / f"{nome}.png").exists()},
    **{nome.replace("cartas-arte-", "cartas-medalhao-"): (preparar_arte.LADO_DO_MEDALHAO,) * 2
       for nome in preparar_arte.artes_das_cartas()
       if nome.startswith("cartas-arte-") and (preparar_arte.ORIGEM / f"{nome}.png").exists()},
    **{nome: (largura, None) for nome, largura in preparar_arte.PECAS_DO_EDITOR.items()
       if (preparar_arte.ORIGEM / f"{nome}.png").exists()},
    # Couro e peças da bolsa do Inventário (reformular-visual-da-ficha): opcionais por matriz.
    **({"inventario-couro": (preparar_arte.LADO_TEXTURA, preparar_arte.LADO_TEXTURA)}
       if (preparar_arte.ORIGEM / "inventario-couro.png").exists() else {}),
    # Laterais, tampa e base: uma das medidas depende da pintura (None = não conferida).
    **{f"{nome}-{parte}": (preparar_arte.LARGURA_LADO, None) for nome in preparar_arte.LADOS_DO_INVENTARIO
       if (preparar_arte.ORIGEM / f"{nome}.png").exists() for parte in preparar_arte.PARTES_DO_LADO},
    **({"inventario-tampa": (preparar_arte.LARGURA_TAMPA, None)} if (preparar_arte.ORIGEM / "inventario-tampa.png").exists() else {}),
    **({f"inventario-base-{parte}": (None, preparar_arte.ALTURA_BASE) for parte in preparar_arte.PARTES_DA_BASE}
       if (preparar_arte.ORIGEM / "inventario-base.png").exists() else {}),
}


def _media(imagem: Image.Image) -> float:
    return sum(ImageStat.Stat(imagem).mean) / len(imagem.getbands())


def emenda(imagem: Image.Image) -> tuple[float, float]:
    """(diferença entre bordas opostas, diferença média entre pixels vizinhos), nas duas direções."""
    bordas, vizinhos = [], []
    for dx, dy in ((1, 0), (0, 1)):
        diferenca = ImageChops.difference(imagem, ImageChops.offset(imagem, dx, dy))
        largura, altura = imagem.size
        bordas.append(_media(diferenca.crop((0, 0, 1, altura) if dx else (0, 0, largura, 1))))
        vizinhos.append(_media(diferenca.crop((1, 0, largura, altura) if dx else (0, 1, largura, altura))))
    return max(bordas), max(vizinhos)


def pixels_de_halo(imagem: Image.Image) -> int:
    return sum(1 for pixel in imagem.convert("RGBA").get_flattened_data() if preparar_arte.eh_halo(*pixel))


class ArteDoResumoTest(unittest.TestCase):
    """As pinturas do Resumo são opcionais e não dependem das demais matrizes."""

    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.pasta, True)

    def test_sem_matrizes_nada_e_gerado(self):
        self.assertEqual(preparar_arte.preparar_arte_do_resumo(self.pasta, self.pasta / "arte"), [])
        self.assertFalse((self.pasta / "arte").exists())

    def test_cada_matriz_vira_webp_no_tamanho_do_seu_lugar(self):
        for nome in ("resumo-cena", "resumo-primeiro-plano", "resumo-bussola"):
            Image.new("RGB", (1536, 1024), (40, 60, 90)).save(self.pasta / f"{nome}.png")
        saidas = preparar_arte.preparar_arte_do_resumo(self.pasta, self.pasta / "arte")
        tamanhos = {}
        for caminho in saidas:
            with Image.open(caminho) as imagem:
                self.assertEqual(imagem.format, "WEBP")
                tamanhos[caminho.stem] = imagem.size
        self.assertEqual(tamanhos, {"resumo-cena": (1536, 1024), "resumo-primeiro-plano": (1536, 1024), "resumo-bussola": (384, 384)})

    def test_fundo_ligado_as_bordas_some_e_area_clara_cercada_fica(self):
        fundo = (230, 193, 140)
        imagem = Image.new("RGB", (120, 120), fundo)
        desenho = ImageDraw.Draw(imagem)
        desenho.ellipse((20, 20, 100, 100), fill=(90, 60, 30))   # objeto escuro (aro da bússola)
        desenho.ellipse((40, 40, 80, 80), fill=fundo)            # mostrador da mesma cor do fundo
        alfa = preparar_arte.remover_fundo(imagem).getchannel("A")
        self.assertEqual(alfa.getpixel((2, 2)), 0)
        self.assertEqual(alfa.getpixel((60, 60)), 255)
        self.assertEqual(alfa.getpixel((30, 60)), 255)

    def test_fundo_so_na_cena_nao_e_removido(self):
        Image.new("RGB", (1536, 1024), (230, 193, 140)).save(self.pasta / "resumo-cena.png")
        (caminho,) = preparar_arte.preparar_arte_do_resumo(self.pasta, self.pasta / "arte")
        with Image.open(caminho) as imagem:
            self.assertNotIn("A", imagem.getbands())


class ArteDasInformacoesTest(unittest.TestCase):
    """Paisagem e natureza-morta de Informações básicas: opcionais, no formato das pinturas do Resumo."""

    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.pasta, True)

    def test_sem_matrizes_nada_e_gerado(self):
        self.assertEqual(preparar_arte.preparar_arte_das_informacoes(self.pasta, self.pasta / "arte"), [])

    def test_paisagem_mantem_o_fundo_e_natureza_morta_perde(self):
        fundo = (244, 232, 206)
        paisagem = Image.new("RGB", (1800, 1000), fundo)
        ImageDraw.Draw(paisagem).rectangle((1100, 300, 1500, 800), fill=(110, 80, 50))
        paisagem.save(self.pasta / "informacoes-paisagem.png")
        natureza = Image.new("RGB", (900, 1000), (255, 255, 255))
        ImageDraw.Draw(natureza).rectangle((400, 500, 900, 1000), fill=(40, 50, 110))
        natureza.save(self.pasta / "informacoes-conceito-direita.png")

        saidas = {p.stem: p for p in preparar_arte.preparar_arte_das_informacoes(self.pasta, self.pasta / "arte")}

        with Image.open(saidas["informacoes-paisagem"]) as imagem:
            self.assertEqual((imagem.format, imagem.size), ("WEBP", (1536, 1024)))
            self.assertNotIn("A", imagem.getbands())
            # A metade esquerda, só de papel, fica fora: o objeto desenhado passa a ocupar o centro.
            self.assertLess(sum(imagem.getpixel((800, 500))), 400)
            self.assertGreater(sum(imagem.getpixel((20, 20))), 600)
        with Image.open(saidas["informacoes-conceito-direita"]) as imagem:
            self.assertEqual((imagem.format, imagem.size), ("WEBP", (512, 512)))
            alfa = imagem.getchannel("A")
            self.assertEqual(alfa.getpixel((10, 10)), 0)
            self.assertEqual(alfa.getpixel((500, 500)), 255)


class ArteDosAtributosTest(unittest.TestCase):
    """Gravura e faixas da aba Atributos (redesenhar-aba-atributos): opcionais, na pasta `atributos/`."""

    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.pasta, True)

    def test_sem_matrizes_nada_e_gerado(self):
        self.assertEqual(preparar_arte.preparar_arte_dos_atributos(self.pasta, self.pasta / "arte"), [])
        self.assertFalse((self.pasta / "arte" / "atributos").exists())

    def test_gravura_e_faixas_nos_tamanhos_e_com_o_papel(self):
        for nome in preparar_arte.ARTES_DOS_ATRIBUTOS:
            Image.new("RGB", (1536, 1024), (244, 232, 206)).save(self.pasta / f"{nome}.png")

        saidas = preparar_arte.preparar_arte_dos_atributos(self.pasta, self.pasta / "arte")

        tamanhos = {}
        for caminho in saidas:
            self.assertEqual(caminho.parent, self.pasta / "arte" / "atributos")
            with Image.open(caminho) as imagem:
                self.assertEqual(imagem.format, "WEBP")
                # O papel da gravura fica: na tela ela é multiplicada sobre o pergaminho.
                self.assertNotIn("A", imagem.getbands())
                tamanhos[caminho.stem] = imagem.size
        self.assertEqual(tamanhos, {
            "atributos-gravura": (1440, 524),
            "atributos-faixa-fisicos": (1200, 400),
            "atributos-faixa-sociais": (1200, 400),
            "atributos-faixa-mentais": (1200, 400),
        })


class ArteDasPericiasTest(unittest.TestCase):
    """Paisagem e estandartes da aba Perícias (redesenhar-aba-pericias, D7): opcionais, na pasta `pericias/`."""

    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.pasta, True)

    def test_sem_matrizes_nada_e_gerado(self):
        self.assertEqual(preparar_arte.preparar_arte_das_pericias(self.pasta, self.pasta / "arte"), [])
        self.assertFalse((self.pasta / "arte" / "pericias").exists())

    def test_paisagem_e_estandartes_nos_tamanhos_e_com_o_papel(self):
        for nome in preparar_arte.ARTES_DAS_PERICIAS:
            Image.new("RGB", (2048, 768), (244, 232, 206)).save(self.pasta / f"{nome}.png")

        saidas = preparar_arte.preparar_arte_das_pericias(self.pasta, self.pasta / "arte")

        tamanhos = {}
        for caminho in saidas:
            self.assertEqual(caminho.parent, self.pasta / "arte" / "pericias")
            with Image.open(caminho) as imagem:
                self.assertEqual(imagem.format, "WEBP")
                # O papel da paisagem fica: na tela ela é multiplicada sobre o pergaminho.
                self.assertNotIn("A", imagem.getbands())
                tamanhos[caminho.stem] = imagem.size
        self.assertEqual(tamanhos, {
            "pericias-cena": (1536, 384),
            "pericias-talentos": (1200, 400),
            "pericias-tecnicas": (1200, 400),
            "pericias-conhecimentos": (1200, 400),
        })


class ArteDasCartasTest(unittest.TestCase):
    """Gravura e faixas da aba Cartas (redesenhar-aba-cartas, D9): opcionais, na pasta `cartas/`."""

    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.pasta, True)

    def test_sem_matrizes_nada_e_gerado(self):
        self.assertEqual(preparar_arte.preparar_arte_das_cartas(self.pasta, self.pasta / "arte"), [])
        self.assertFalse((self.pasta / "arte" / "cartas").exists())

    def test_medalhao_recortado_da_arte_com_fundo_transparente(self):
        arte = Image.new("RGB", (1000, 1000), (20, 30, 70))
        ImageDraw.Draw(arte).ellipse((170, 170, 830, 830), outline=(230, 180, 80), width=20)
        medalhao = preparar_arte.recortar_medalhao(arte)
        self.assertEqual(medalhao.size, (400, 400))
        self.assertEqual(medalhao.mode, "RGBA")
        self.assertEqual(medalhao.getpixel((0, 0))[3], 0)  # fora do círculo
        self.assertEqual(medalhao.getpixel((200, 200))[3], 255)  # centro
        # O aro (raio de 33% do lado) cabe inteiro no recorte (36%): o pixel do aro, à direita, é opaco.
        self.assertGreater(medalhao.getpixel((200 + round(.33 / .36 * 200), 200))[3], 200)

    def test_uma_faixa_por_categoria_do_catalogo(self):
        catalogo = json.loads(preparar_arte.CATALOGO_DE_ITENS.read_text(encoding="utf-8"))
        categorias = preparar_arte.categorias_das_cartas()
        self.assertEqual(set(categorias), {"habilidades", "magias", "efeitos", *(c["id"] for c in catalogo["categorias"])})
        self.assertEqual((categorias[:2], categorias[-1]), (["habilidades", "magias"], "efeitos"))
        self.assertIn("cartas-faixa-itens-de-missao", preparar_arte.artes_das_cartas())
        self.assertIn("cartas-arte-itens-de-missao", preparar_arte.artes_das_cartas())

    def test_gravura_e_faixas_nos_tamanhos_sem_recorte(self):
        artes = preparar_arte.artes_das_cartas()
        for nome in artes:
            Image.new("RGB", (1536, 1024), (244, 232, 206)).save(self.pasta / f"{nome}.png")

        saidas = preparar_arte.preparar_arte_das_cartas(self.pasta, self.pasta / "arte")

        medalhoes = {f"cartas-medalhao-{n.removeprefix('cartas-arte-')}" for n in artes if n.startswith("cartas-arte-")}
        self.assertEqual({c.stem for c in saidas}, set(artes) | medalhoes)
        for caminho in [s for s in saidas if not s.stem.startswith("cartas-medalhao-")]:
            self.assertEqual(caminho.parent, self.pasta / "arte" / "cartas")
            with Image.open(caminho) as imagem:
                self.assertEqual(imagem.format, "WEBP")
                # Cenas inteiras: o fundo fica (a gravura é multiplicada sobre o papel).
                self.assertNotIn("A", imagem.getbands())
                tamanhos = {"cartas-gravura": (1536, 256), "cartas-detalhe-livro": (1600, 906),
                            "cartas-editor-livro": (1536, 1024)}
                padrao = (800, 800) if caminho.stem.startswith("cartas-arte-") else (1024, 304)
                self.assertEqual(imagem.size, tamanhos.get(caminho.stem, padrao))


    def test_pecas_do_editor_sem_fundo_e_recortadas(self):
        """simplificar-criacao-de-cartas, D9: marcador e selo sobre pergaminho liso perdem o fundo."""
        for nome in preparar_arte.PECAS_DO_EDITOR:
            matriz = Image.new("RGB", (1536, 1024), (233, 220, 192))
            ImageDraw.Draw(matriz).rounded_rectangle((300, 380, 1236, 680), radius=40, fill=(70, 35, 20))
            matriz.save(self.pasta / f"{nome}.png")
        saidas = preparar_arte.preparar_arte_das_cartas(self.pasta, self.pasta / "arte")
        self.assertEqual({s.stem for s in saidas}, set(preparar_arte.PECAS_DO_EDITOR))
        for caminho in saidas:
            with Image.open(caminho) as imagem:
                self.assertEqual(imagem.mode, "RGBA")
                self.assertEqual(imagem.width, 480)
                # Recortada rente ao retângulo (936 × 300): a proporção se mantém.
                self.assertAlmostEqual(imagem.height, round(480 * 301 / 937), delta=3)
                self.assertGreater(imagem.getpixel((imagem.width // 2, imagem.height // 2))[3], 250)
                self.assertLess(imagem.getpixel((0, 0))[3], 255)


@unittest.skipUnless((preparar_arte.ORIGEM / "emblema-cursed.png").exists(), "matrizes da arte ausentes (fora do Git)")
class PrepararArteTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.destino = Path(tempfile.mkdtemp()) / "arte"
        cls.saidas = {p.stem: p for p in preparar_arte.preparar(preparar_arte.ORIGEM, cls.destino)}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.destino.parent, ignore_errors=True)

    def test_todas_as_saidas_em_webp_com_as_dimensoes_esperadas(self):
        self.assertEqual(set(self.saidas), set(ESPERADO))
        for nome, dimensoes in ESPERADO.items():
            with Image.open(self.saidas[nome]) as imagem:
                formato = "PNG" if nome.startswith("favicon") else "WEBP"
                conferidas = tuple(real if esperada is None else esperada for real, esperada in zip(imagem.size, dimensoes))
                self.assertEqual((imagem.format, imagem.size), (formato, conferidas), nome)

    def test_total_abaixo_de_6_mb(self):
        """A arte comum a todas as telas; a da aba Cartas tem orçamento próprio, abaixo."""
        comuns = [p for p in self.saidas.values() if p.parent.name != "cartas"]
        self.assertLess(sum(p.stat().st_size for p in comuns), 6 * 1024 * 1024)

    def test_cartas_abaixo_de_4_mb(self):
        """As pinturas da aba Cartas só carregam nela, por categoria; somadas, ficam abaixo de 4 MB."""
        cartas = [p for p in self.saidas.values() if p.parent.name == "cartas"]
        self.assertLess(sum(p.stat().st_size for p in cartas), 4 * 1024 * 1024)


FUNDO_PERGAMINHO = (230, 193, 140)


def lateral_sintetica(miolo_so_de_couro: bool = True) -> Image.Image:
    """Lateral esquerda de mentira: tira vertical encostada na direita, com degradê de cima a baixo
    (uma emenda apareceria), um "mapa" no alto e um "tecido" embaixo, ambos avançando para a esquerda."""
    imagem = Image.new("RGB", (1024, 1536), FUNDO_PERGAMINHO)
    desenho = ImageDraw.Draw(imagem)
    for y in range(100, 1436):
        tom = 40 + (y - 100) * 80 // 1336
        desenho.line((720, y, 950, y), fill=(tom + 50, tom, 20))
    desenho.ellipse((340, 160, 760, 460), fill=(150, 105, 55))     # mapa, preso à tira
    desenho.rectangle((420, 1120, 740, 1400), fill=(110, 20, 30))  # tecido, preso à tira
    if not miolo_so_de_couro:
        for y in range(500, 1100, 120):
            desenho.rectangle((600, y, 740, y + 70), fill=(90, 90, 90))
    return imagem


def _diferenca_linhas(imagem: Image.Image, a: int, b: int) -> float:
    linha_a = imagem.convert("RGB").crop((0, a, imagem.width, a + 1))
    linha_b = imagem.convert("RGB").crop((0, b, imagem.width, b + 1))
    return _media(ImageChops.difference(linha_a, linha_b))


def tampa_sintetica() -> Image.Image:
    imagem = Image.new("RGB", (1536, 1024), FUNDO_PERGAMINHO)
    ImageDraw.Draw(imagem).polygon([(300, 250), (1236, 250), (1100, 800), (436, 800)], fill=(90, 50, 25))
    return imagem


def base_sintetica(miolo_so_de_couro: bool = True) -> Image.Image:
    """Base de mentira: faixa deitada com degradê da esquerda para a direita e pontas mais altas."""
    imagem = Image.new("RGB", (1536, 1024), FUNDO_PERGAMINHO)
    desenho = ImageDraw.Draw(imagem)
    for x in range(100, 1436):
        tom = 40 + (x - 100) * 80 // 1336
        desenho.line((x, 440, x, 600), fill=(tom + 50, tom, 20))
    desenho.rectangle((100, 360, 300, 680), fill=(70, 45, 25))
    desenho.rectangle((1236, 360, 1436, 680), fill=(70, 45, 25))
    if not miolo_so_de_couro:
        for x in range(420, 1150, 150):
            desenho.ellipse((x, 380, x + 80, 660), fill=(160, 120, 40))
    return imagem


class ArteDoInventarioTest(unittest.TestCase):
    """Couro e laterais da bolsa (reformular-visual-da-ficha, 8.1 e 8.3): opcionais, em public/arte/inventario."""

    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.pasta, True)

    def test_sem_matrizes_nada_e_gerado(self):
        self.assertEqual(preparar_arte.preparar_arte_do_inventario(self.pasta, self.pasta / "arte"), [])
        self.assertFalse((self.pasta / "arte" / "inventario").exists())

    def test_couro_e_as_tres_partes_de_cada_lateral(self):
        Image.new("RGB", (1024, 1024), (90, 55, 30)).save(self.pasta / "inventario-couro.png")
        lateral_sintetica().save(self.pasta / "inventario-lado-esquerdo.png")
        lateral_sintetica().transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(self.pasta / "inventario-lado-direito.png")
        saidas = {p.stem: p for p in preparar_arte.preparar_arte_do_inventario(self.pasta, self.pasta / "arte")}
        esperado = {"inventario-couro"} | {f"inventario-lado-{lado}-{parte}" for lado in ("esquerdo", "direito")
                                           for parte in ("topo", "miolo", "base")}
        self.assertEqual(set(saidas), esperado)
        self.assertTrue(all(p.parent.name == "inventario" for p in saidas.values()))
        with Image.open(saidas["inventario-couro"]) as couro:
            self.assertEqual((couro.format, couro.size), ("WEBP", (512, 512)))
        for lado in ("esquerdo", "direito"):
            for parte in ("topo", "miolo", "base"):
                with Image.open(saidas[f"inventario-lado-{lado}-{parte}"]) as imagem:
                    self.assertEqual((imagem.format, imagem.width), ("WEBP", preparar_arte.LARGURA_LADO))
                    self.assertIn("A", imagem.getbands())

    def test_recorte_rente_e_fundo_transparente(self):
        partes = preparar_arte.preparar_lateral(lateral_sintetica(), "direita")
        topo = partes["topo"]
        # Rente ao objeto: o mapa encosta na borda esquerda e a tira na direita; o canto de cima, acima do mapa, é fundo.
        self.assertEqual(topo.getchannel("A").getpixel((2, 2)), 0)
        self.assertGreater(topo.getchannel("A").getpixel((topo.width - 3, topo.height - 3)), 245)

    def test_miolo_so_com_a_tira_e_topo_e_base_com_os_objetos(self):
        partes = preparar_arte.preparar_lateral(lateral_sintetica(), "direita")
        largura_tira = partes["miolo"].getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
        # A tira ocupa a borda de dentro (direita) e bem menos da metade da largura; mapa e tecido ficaram fora do miolo.
        self.assertGreaterEqual(largura_tira[2], preparar_arte.LARGURA_LADO - 2)
        self.assertLess(largura_tira[2] - largura_tira[0], preparar_arte.LARGURA_LADO * .5)
        for parte in ("topo", "base"):
            caixa = partes[parte].getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
            # O objeto avança bem além da tira, para o lado de fora.
            self.assertLess(caixa[0], largura_tira[0] - 50, parte)

    def test_miolo_repete_sem_emenda_e_emenda_no_topo(self):
        partes = preparar_arte.preparar_lateral(lateral_sintetica(), "direita")
        miolo, topo = partes["miolo"], partes["topo"]
        vizinhos = max(_diferenca_linhas(miolo, y, y + 1) for y in range(miolo.height - 1))
        self.assertLessEqual(_diferenca_linhas(miolo, miolo.height - 1, 0), max(vizinhos * 1.5, 1))
        junto = Image.new("RGBA", (miolo.width, 2))
        junto.paste(topo.crop((0, topo.height - 1, topo.width, topo.height)), (0, 0))
        junto.paste(miolo.crop((0, 0, miolo.width, 1)), (0, 1))
        self.assertLessEqual(_diferenca_linhas(junto, 0, 1), max(vizinhos * 1.5, 1))

    def test_objetos_no_meio_da_pintura_sao_recusados(self):
        with self.assertRaises(ValueError):
            preparar_arte.preparar_lateral(lateral_sintetica(miolo_so_de_couro=False), "direita")


class TampaEBaseTest(unittest.TestCase):
    """Tampa e base da bolsa (reformular-visual-da-ficha, 8.4)."""

    def test_tampa_sem_fundo_rente_ao_objeto(self):
        tampa = preparar_arte.preparar_tampa(tampa_sintetica())
        self.assertEqual(tampa.width, preparar_arte.LARGURA_TAMPA)
        alfa = tampa.getchannel("A")
        self.assertEqual(alfa.getpixel((2, tampa.height - 3)), 0)       # fora do trapézio, embaixo à esquerda
        self.assertGreater(alfa.getpixel((tampa.width // 2, tampa.height // 2)), 245)

    def test_base_em_tres_partes_com_as_pontas_mais_altas(self):
        partes = preparar_arte.preparar_base(base_sintetica())
        self.assertEqual({parte: imagem.height for parte, imagem in partes.items()},
                         {parte: preparar_arte.ALTURA_BASE for parte in preparar_arte.PARTES_DA_BASE})
        altura_opaca = lambda imagem: (lambda c: c[3] - c[1])(imagem.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox())
        self.assertLess(altura_opaca(partes["miolo"]), altura_opaca(partes["esquerda"]) * .7)
        self.assertLess(altura_opaca(partes["miolo"]), altura_opaca(partes["direita"]) * .7)

    def test_miolo_da_base_repete_sem_emenda_e_emenda_na_ponta_esquerda(self):
        partes = preparar_arte.preparar_base(base_sintetica())
        # Girando, as colunas viram linhas e a mesma medida das laterais vale.
        miolo = partes["miolo"].transpose(Image.Transpose.ROTATE_270)
        esquerda = partes["esquerda"].transpose(Image.Transpose.ROTATE_270)
        vizinhos = max(_diferenca_linhas(miolo, y, y + 1) for y in range(miolo.height - 1))
        self.assertLessEqual(_diferenca_linhas(miolo, miolo.height - 1, 0), max(vizinhos * 1.5, 1))
        junto = Image.new("RGBA", (miolo.width, 2))
        junto.paste(esquerda.crop((0, esquerda.height - 1, esquerda.width, esquerda.height)), (0, 0))
        junto.paste(miolo.crop((0, 0, miolo.width, 1)), (0, 1))
        self.assertLessEqual(_diferenca_linhas(junto, 0, 1), max(vizinhos * 1.5, 1))

    def test_faixa_do_miolo_informada_em_fracoes_da_largura(self):
        partes = preparar_arte.preparar_base(base_sintetica(miolo_so_de_couro=False), (.1, .25))
        self.assertLess(partes["miolo"].width, partes["direita"].width)

    def test_objeto_cortado_na_borda_da_pintura_esmaece_desse_lado(self):
        imagem = Image.new("RGBA", (200, 50), (120, 60, 30, 255))
        esmaecida = preparar_arte.esmaecer_bordas_cortadas(imagem, (0, 10, 150, 40), (300, 100))
        alfa = esmaecida.getchannel("A")
        self.assertLess(alfa.getpixel((0, 25)), 30)       # encostava na borda esquerda: esmaece
        self.assertEqual(alfa.getpixel((100, 25)), 255)
        self.assertEqual(alfa.getpixel((199, 25)), 255)   # à direita havia fundo: fica inteira
        intacta = preparar_arte.esmaecer_bordas_cortadas(imagem, (5, 10, 150, 40), (300, 100))
        self.assertEqual(intacta.getchannel("A").getpixel((0, 25)), 255)

    def test_arquivos_da_tampa_e_da_base(self):
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        tampa_sintetica().save(pasta / "inventario-tampa.png")
        base_sintetica().save(pasta / "inventario-base.png")
        nomes = {p.stem for p in preparar_arte.preparar_arte_do_inventario(pasta, pasta / "arte")}
        self.assertEqual(nomes, {"inventario-tampa", "inventario-base-esquerda", "inventario-base-miolo", "inventario-base-direita"})


class NavegacaoSemMatrizesTest(unittest.TestCase):
    def test_navegacao_sem_matrizes_nao_gera_nada(self):
        pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, pasta, True)
        self.assertEqual(preparar_arte.preparar_arte_da_navegacao(pasta, pasta / "arte"), [])
        self.assertFalse((pasta / "arte").exists())


class SemEmendaTest(unittest.TestCase):
    def test_textura_com_degrade_fica_continua_nas_bordas(self):
        textura = Image.linear_gradient("L").resize((128, 128)).convert("RGB")
        self.assertGreater(emenda(textura)[0], 100)
        bordas, vizinhos = emenda(preparar_arte.sem_emenda(textura))
        self.assertLessEqual(bordas, max(vizinhos * 1.5, 2))


if __name__ == "__main__":
    unittest.main()


# Camadas de escurecimento de `platform/frontend/src/ui/tema.css`; mudar lá exige mudar aqui.
NOITE = (7, 11, 16)
TEXTO = (0xF1, 0xE9, 0xDA)  # --osso-100
DESTAQUE = (0xEF, 0xD5, 0x9C)  # --ouro-200, sobretítulos


def _luminancia(cor) -> float:
    canais = [c / 255 for c in cor]
    linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in canais]
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2]


def _razao(a, b) -> float:
    la, lb = sorted((_luminancia(a), _luminancia(b)), reverse=True)
    return (la + .05) / (lb + .05)


def _sobre(cor, camada, alfa):
    return tuple(c * (1 - alfa) + k * alfa for c, k in zip(cor, camada))


def _rampa(posicao: float, paradas) -> float:
    for (p0, a0), (p1, a1) in zip(paradas, paradas[1:]):
        if p0 <= posicao <= p1:
            return a0 + (a1 - a0) * (posicao - p0) / (p1 - p0)
    return paradas[-1][1]


def _pior_fundo(pixels) -> tuple[float, float, float]:
    """Fundo do percentil 99 de luminância: o texto precisa passar sobre quase todo ponto."""
    ordenados = sorted(pixels, key=_luminancia)
    return ordenados[int(len(ordenados) * .99)]


@unittest.skipUnless((preparar_arte.ORIGEM / "emblema-cursed.png").exists(), "matrizes da arte ausentes (fora do Git)")
class ContrasteSobreArteTest(unittest.TestCase):
    """Texto claro sobre a arte já escurecida pelas camadas do tema passa em 4,5:1 (tarefa 3.7)."""

    @classmethod
    def setUpClass(cls):
        cls.destino = Path(tempfile.mkdtemp()) / "arte"
        preparar_arte.preparar(preparar_arte.ORIGEM, cls.destino)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.destino.parent, ignore_errors=True)

    def test_titulo_sobre_o_cabecalho(self):
        imagem = Image.open(self.destino / "ancora-castelo-768.webp").convert("RGB")
        largura, altura = imagem.size
        paradas = [(0, .9), (.4, .78), (.72, .2), (1, 0)]
        pixels = []
        for x in range(0, int(largura * .48)):
            alfa = _rampa(x / largura, paradas)
            for y in range(int(altura * .1), int(altura * .9), 2):
                pixels.append(_sobre(imagem.getpixel((x, y)), NOITE, alfa))
        fundo = _pior_fundo(pixels)
        self.assertGreaterEqual(_razao(TEXTO, fundo), 4.5)
        self.assertGreaterEqual(_razao(DESTAQUE, fundo), 4.5)

    def test_titulo_sobre_cada_etapa(self):
        for etapa in preparar_arte.ETAPAS:
            imagem = Image.open(self.destino / f"etapa-{etapa}.webp").convert("RGB")
            largura, altura = imagem.size
            # Faixa 3:1 visível (object-position 45%) e texto no terço de baixo, 75% da largura.
            topo = .45 * altura / 2
            pixels = []
            for yb in range(int(altura / 2 * .62), int(altura / 2), 2):
                base = 1 - yb / (altura / 2)  # 0 no pé da faixa
                inferior = _rampa(base, [(0, .92), (.38, .7), (.75, 0), (1, 0)])
                for x in range(0, int(largura * .75), 2):
                    cor = _sobre(imagem.getpixel((x, int(topo + yb))), (18, 38, 64), .38)
                    dx, dy = (x / largura - .5) / .5, (yb / (altura / 2) - .45) / .55
                    distancia = min(1.0, (dx * dx + dy * dy) ** .5)
                    vinheta = 0 if distancia < .4 else .7 * (distancia - .4) / .6
                    cor = _sobre(cor, NOITE, vinheta)
                    pixels.append(_sobre(cor, NOITE, inferior))
            fundo = _pior_fundo(pixels)
            self.assertGreaterEqual(_razao(TEXTO, fundo), 4.5, etapa)
            self.assertGreaterEqual(_razao(DESTAQUE, fundo), 4.5, etapa)


@unittest.skipUnless((preparar_arte.ORIGEM / "emblema-cursed.png").exists(), "matrizes da arte ausentes (fora do Git)")
class ContrasteCabecalhoDaFichaTest(unittest.TestCase):
    """Nome e identidade sobre o castelo no cabeçalho da ficha (`.character-hero` em tema-telas.css)."""

    def test_texto_sobre_o_cabecalho_da_ficha(self):
        destino = Path(tempfile.mkdtemp()) / "arte"
        self.addCleanup(shutil.rmtree, destino.parent, True)
        preparar_arte.preparar(preparar_arte.ORIGEM, destino)
        imagem = Image.open(destino / "ancora-castelo-768.webp").convert("RGB")
        largura, altura = imagem.size
        paradas = [(0, .9), (.55, .86), (1, .72)]
        pixels = [_sobre(imagem.getpixel((x, y)), NOITE, _rampa(x / largura, paradas))
                  for x in range(0, largura, 2) for y in range(0, altura, 2)]
        fundo = _pior_fundo(pixels)
        self.assertGreaterEqual(_razao(TEXTO, fundo), 4.5)
        self.assertGreaterEqual(_razao(DESTAQUE, fundo), 4.5)


class IconesDaPersonalidadeTest(unittest.TestCase):
    """Ícones recortados da referência como máscaras (reformular-personalidade-da-ficha, D7)."""

    def test_mascara_opaca_na_tinta_e_transparente_no_pergaminho(self):
        imagem = Image.new("RGB", (100, 100), (242, 220, 180))
        ImageDraw.Draw(imagem).ellipse((40, 40, 60, 60), fill=(90, 56, 22))
        # Mancha clara do papel: não pode virar tinta.
        ImageDraw.Draw(imagem).rectangle((20, 70, 30, 80), fill=(225, 200, 160))
        mascara = preparar_arte.mascara_do_icone(imagem, (30, 30, 70, 70), 48)
        self.assertEqual(mascara.size, (48 * preparar_arte.ESCALA_DOS_ICONES,) * 2)
        alfa = mascara.getchannel("A")
        centro = mascara.width // 2
        self.assertEqual(alfa.getpixel((centro, centro)), 255)
        self.assertEqual(alfa.getpixel((2, 2)), 0)
        # O quadrado vai de 26 a 74 (centro da tinta em 50); a mancha, em (28, 72), fica transparente.
        self.assertEqual(alfa.getpixel(((28 - 26) * 4, (72 - 26) * 4)), 0)

    def test_regiao_sem_desenho_e_recusada(self):
        imagem = Image.new("RGB", (60, 60), (242, 220, 180))
        with self.assertRaises(ValueError):
            preparar_arte.mascara_do_icone(imagem, (0, 0, 60, 60), 48)

    def test_os_14_icones_da_referencia(self):
        with tempfile.TemporaryDirectory() as pasta:
            saidas = preparar_arte.preparar_icones_da_personalidade(destino=Path(pasta))
            self.assertEqual(sorted(p.stem for p in saidas), sorted(preparar_arte.ICONES_DA_PERSONALIDADE))
            for caminho in saidas:
                lado = preparar_arte.ICONES_DA_PERSONALIDADE[caminho.stem][1]
                with Image.open(caminho) as mascara:
                    self.assertEqual(mascara.size, (lado * preparar_arte.ESCALA_DOS_ICONES,) * 2, caminho.stem)
                    alfa = mascara.getchannel("A")
                    # Desenho no meio e cantos transparentes: o ícone ficou inteiro dentro do quadrado.
                    self.assertGreater(ImageStat.Stat(alfa).mean[0], 20, caminho.stem)
                    self.assertEqual(alfa.getpixel((0, 0)), 0, caminho.stem)


class ArteDaPersonalidadeTest(unittest.TestCase):
    """Escrivaninha e natureza-morta da História (reformular-personalidade-da-ficha, D6), na pasta `personalidade/`."""

    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.pasta, True)

    def test_sem_matrizes_nada_e_gerado(self):
        self.assertEqual(preparar_arte.preparar_arte_da_personalidade(self.pasta, self.pasta / "arte"), [])

    def test_as_duas_pinturas_nos_tamanhos_e_com_o_papel(self):
        for nome in preparar_arte.ARTES_DA_PERSONALIDADE:
            Image.new("RGB", (1672, 941), (242, 220, 180)).save(self.pasta / f"{nome}.png")
        saidas = preparar_arte.preparar_arte_da_personalidade(self.pasta, self.pasta / "arte")
        tamanhos = {}
        for caminho in saidas:
            self.assertEqual(caminho.parent, self.pasta / "arte" / "personalidade")
            with Image.open(caminho) as imagem:
                self.assertEqual(imagem.format, "WEBP")
                self.assertNotIn("A", imagem.getbands())
                tamanhos[caminho.stem] = imagem.size
        self.assertEqual(tamanhos, {"personalidade-escrivaninha": (1280, 720), "personalidade-historia": (1280, 640)})

