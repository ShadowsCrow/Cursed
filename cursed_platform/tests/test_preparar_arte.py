"""Script de preparação da arte do tema (tarefa 3.5 de criacao-guiada-e-nova-estetica).

As matrizes ficam fora do Git (`platform/frontend/arte-original/`); sem elas o teste é pulado.
"""

from __future__ import annotations

import importlib.util
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
    # Arte da navegação inicial (navegacao-inicial-e-perfil): também opcional por matriz.
    **{saida: tamanho for matriz, recortes in preparar_arte.ARTES_DA_NAVEGACAO.items()
       for saida, _, tamanho, _ in recortes if (preparar_arte.ORIGEM / f"{matriz}.png").exists()},
    preparar_arte.RETRATO_JOGADOR_QUADRADO[0]: preparar_arte.RETRATO_JOGADOR_QUADRADO[2],
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
                self.assertEqual((imagem.format, imagem.size), (formato, dimensoes), nome)

    def test_total_abaixo_de_6_mb(self):
        self.assertLess(sum(p.stat().st_size for p in self.saidas.values()), 6 * 1024 * 1024)


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
