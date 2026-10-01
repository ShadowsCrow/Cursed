"""Gera as imagens otimizadas do tema a partir das matrizes (design D11 de criacao-guiada-e-nova-estetica).

Uso, na raiz do repositório:

    .venv/Scripts/python.exe platform/frontend/scripts/preparar_arte.py

Lê `platform/frontend/arte-original/` (fora do Git) e grava `platform/frontend/public/arte/`.
Só usa Pillow, que já é dependência da plataforma. O guia para regenerar as matrizes está em
`openspec/changes/criacao-guiada-e-nova-estetica/arte/prompts.md`.
"""

from __future__ import annotations

import argparse
import colorsys
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

FRONTEND = Path(__file__).resolve().parents[1]
ORIGEM = FRONTEND / "arte-original"
DESTINO = FRONTEND / "public" / "arte"

ETAPAS = ("conceito", "identidade", "raca", "classe", "atributos", "pericias", "personalidade", "conferencia")
LADO_TEXTURA = 512
QUALIDADE = 78
DOURADO = (221, 184, 114)  # mesmo tom de --ouro-300


def _salvar(imagem: Image.Image, destino: Path, nome: str, qualidade: int = QUALIDADE) -> Path:
    caminho = destino / f"{nome}.webp"
    imagem.save(caminho, "WEBP", quality=qualidade, method=6)
    return caminho


# ------------------------------------------------------------------ texturas sem emenda


def _rampa(tamanho: int, faixa: float) -> Image.Image:
    """Peso horizontal: 0 nas bordas, 1 a partir de `faixa` da largura, com transição suave."""
    valores = []
    for x in range(tamanho):
        distancia = min(x + .5, tamanho - x - .5) / (tamanho * faixa)
        t = max(0.0, min(1.0, distancia))
        valores.append(round(255 * t * t * (3 - 2 * t)))
    linha = Image.new("L", (tamanho, 1))
    linha.putdata(valores)
    return linha.resize((tamanho, tamanho), Image.NEAREST)


def sem_emenda(imagem: Image.Image, faixa: float = .25) -> Image.Image:
    """Mistura a imagem com ela deslocada em meia largura, primeiro na horizontal, depois na vertical.

    Nas bordas fica só a versão deslocada, cujas colunas extremas eram vizinhas na original; no
    centro fica só a original, que esconde a emenda da versão deslocada.
    """
    lado = imagem.width
    peso = _rampa(lado, faixa)
    horizontal = Image.composite(imagem, ImageChops.offset(imagem, lado // 2, 0), peso)
    peso_vertical = peso.transpose(Image.Transpose.ROTATE_90)
    return Image.composite(horizontal, ImageChops.offset(horizontal, 0, lado // 2), peso_vertical)


# ------------------------------------------------------------------ emblema


def _avermelhado(r: int, g: int, b: int) -> bool:
    matiz, saturacao, valor = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return valor > .08 and saturacao > .3 and (matiz * 360 < 18 or matiz * 360 > 330)


def eh_halo(r: int, g: int, b: int, a: int) -> bool:
    """Pixel semitransparente de vermelho dominante. O dourado do emblema fica entre 20° e 60°
    de matiz; o halo das bordas, abaixo de 18°."""
    return 0 < a < 255 and _avermelhado(r, g, b)


def limpar_halo(emblema: Image.Image, passos: int = 8) -> Image.Image:
    """Troca a cor dos pixels avermelhados pela cor dourada vizinha, preservando o alfa.

    Os pixels totalmente transparentes também recebem o dourado vizinho: ao reduzir a imagem, a
    reamostragem mistura a cor deles com a borda, e uma cor escondida avermelhada voltaria como halo."""
    rgba = emblema.convert("RGBA")
    alfa = rgba.getchannel("A")
    rgb = rgba.convert("RGB")
    halo = Image.new("L", rgba.size)
    halo.putdata([255 if a == 0 or _avermelhado(r, g, b) else 0 for r, g, b, a in rgba.get_flattened_data()])
    dourado = ImageChops.subtract(alfa.point(lambda a: 255 if a >= 128 else 0), halo)
    cores = Image.composite(rgb, Image.new("RGB", rgba.size), dourado)
    for _ in range(passos):  # espalha a cor dourada até alcançar a borda
        cores = cores.filter(ImageFilter.MaxFilter(5))
    limpo = Image.composite(cores, rgb, halo)
    # A vizinhança de sombras bronze pode resultar num tom ainda avermelhado: esses poucos pixels
    # recebem o dourado médio do emblema.
    resto = Image.new("L", rgba.size)
    resto.putdata([255 if _avermelhado(*cor) else 0 for cor in limpo.get_flattened_data()])
    limpo = Image.composite(Image.new("RGB", rgba.size, DOURADO), limpo, resto)
    limpo.putalpha(alfa)
    return limpo


# ------------------------------------------------------------------ ícone da aba


def icone_da_aba(lado: int) -> Image.Image:
    """PNG do emblema simplificado (o mesmo desenho de `public/favicon.svg`), para navegadores sem SVG."""
    escala = lado * 8 / 32
    grande = Image.new("RGBA", (lado * 8, lado * 8))
    desenho = ImageDraw.Draw(grande)
    ponto = lambda x, y: (x * escala, y * escala)  # noqa: E731
    anel = 9.5 * escala
    desenho.ellipse((16 * escala - anel, 16 * escala - anel, 16 * escala + anel, 16 * escala + anel),
                    outline=DOURADO, width=max(1, round(2.2 * escala)))
    estrela = [(16, 1), (18.6, 13.4), (31, 16), (18.6, 18.6), (16, 31), (13.4, 18.6), (1, 16), (13.4, 13.4)]
    desenho.polygon([ponto(*p) for p in estrela], fill=DOURADO, outline=(59, 43, 19))
    for pontas in (((16, 16), (22.4, 9.6), (20.1, 14.7)), ((16, 16), (22.4, 22.4), (17.3, 20.1)),
                   ((16, 16), (9.6, 22.4), (11.9, 17.3)), ((16, 16), (9.6, 9.6), (14.7, 11.9))):
        desenho.polygon([ponto(*p) for p in pontas], fill=DOURADO)
    return grande.resize((lado, lado), Image.LANCZOS)


# ------------------------------------------------------------------ recortes


def recortar_proporcao(imagem: Image.Image, largura: int, altura: int, *, topo: float = .5) -> Image.Image:
    """Recorte na proporção `largura:altura`; `topo` posiciona o recorte vertical (0 = topo)."""
    alvo = largura / altura
    if imagem.width / imagem.height > alvo:
        nova = round(imagem.height * alvo)
        x = (imagem.width - nova) // 2
        return imagem.crop((x, 0, x + nova, imagem.height))
    nova = round(imagem.width / alvo)
    y = round((imagem.height - nova) * topo)
    return imagem.crop((0, y, imagem.width, y + nova))


# Pinturas opcionais do Resumo da ficha (aba-resumo-da-ficha, tarefa 4A.2):
# nome -> (proporção do recorte, tamanho final, posição vertical do recorte, remover o fundo).
# Sem a matriz, a pintura não é gerada e o Resumo fica só com os ornamentos em SVG.
ARTES_DO_RESUMO: dict[str, tuple[tuple[int, int], tuple[int, int], float, bool]] = {
    "resumo-cena": ((3, 2), (1536, 1024), .35, False),
    "resumo-primeiro-plano": ((3, 2), (1536, 1024), 1.0, True),
    "resumo-natureza-morta": ((1, 1), (512, 512), .5, True),
    "resumo-bussola": ((1, 1), (384, 384), .5, True),
}
# Distância de cor (maior diferença entre canais) ao fundo: até FUNDO_CHEIO some por inteiro,
# a partir de FUNDO_BORDA fica opaco, e no meio a transparência é gradual (borda suave).
FUNDO_CHEIO, FUNDO_BORDA = 26, 62


def cor_do_fundo(imagem: Image.Image, amostra: int = 32, canto: str = "direita") -> tuple[int, int, int]:
    """Cor média de um canto de cima (o direito, salvo pedido), onde os prompts pedem só fundo liso."""
    x = imagem.width - amostra if canto == "direita" else 0
    canto = imagem.convert("RGB").crop((x, 0, x + amostra, amostra))
    return tuple(round(sum(canal.getdata()) / (amostra * amostra)) for canal in canto.split())  # type: ignore[return-value]


def remover_fundo(imagem: Image.Image, cor: tuple[int, int, int] | None = None) -> Image.Image:
    """Troca o fundo liso de pergaminho por transparência.

    Só apaga o fundo **ligado às bordas**: uma área clara cercada pelo objeto (o mostrador da
    bússola, um pergaminho enrolado) continua opaca, mesmo com cor parecida com a do fundo.
    """
    rgb = imagem.convert("RGB")
    fundo = Image.new("RGB", rgb.size, cor or cor_do_fundo(rgb))
    r, g, b = ImageChops.difference(rgb, fundo).split()
    distancia = ImageChops.lighter(ImageChops.lighter(r, g), b)
    # Candidatos a fundo (255) e, entre eles, os ligados às bordas (128).
    candidatos = distancia.point(lambda v: 255 if v < FUNDO_BORDA else 0)
    largura, altura = candidatos.size
    bordas = [(x, y) for x in range(0, largura, 8) for y in (0, altura - 1)] + [(x, y) for y in range(0, altura, 8) for x in (0, largura - 1)]
    for ponto in bordas:
        if candidatos.getpixel(ponto) == 255:
            ImageDraw.floodfill(candidatos, ponto, 128, thresh=0)
    ligado = candidatos.point(lambda v: 255 if v == 128 else 0)
    faixa = FUNDO_BORDA - FUNDO_CHEIO
    rampa = distancia.point(lambda v: 0 if v <= FUNDO_CHEIO else 255 if v >= FUNDO_BORDA else round((v - FUNDO_CHEIO) * 255 / faixa))
    alfa = Image.composite(rampa, Image.new("L", rgb.size, 255), ligado).filter(ImageFilter.GaussianBlur(.6))
    recortada = rgb.convert("RGBA")
    recortada.putalpha(alfa)
    return recortada


# Pinturas opcionais de Informações básicas (redesenhar-informacoes-basicas, D5 e D6), no formato das do
# Resumo. A paisagem em sépia fica com o fundo de pergaminho: na tela ela é multiplicada sobre o papel.
ARTES_DAS_INFORMACOES: dict[str, tuple[tuple[int, int], tuple[int, int], float, bool]] = {
    "informacoes-paisagem": ((3, 2), (1536, 1024), .5, False),
    "informacoes-conceito-direita": ((1, 1), (512, 512), .5, True),
}
# Área útil da matriz, em frações (x0, y0, x1, y1), recortada antes da proporção. A paisagem de 2026-09-29 tem
# um quarto esquerdo só de papel e muito rio embaixo: sem eles, o castelo, a ponte e a rosa ocupam a altura do
# cabeçalho, e as colinas da esquerda sobram para o esmaecimento.
AREA_UTIL: dict[str, tuple[float, float, float, float]] = {
    "informacoes-paisagem": (.28, .07, 1.0, .80),
}


def preparar_pinturas(artes: dict[str, tuple[tuple[int, int], tuple[int, int], float, bool]],
                      origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera as pinturas opcionais da tabela `artes` cujas matrizes existirem em `origem`."""
    saidas: list[Path] = []
    for nome, (proporcao, tamanho, topo, sem_fundo) in artes.items():
        matriz = origem / f"{nome}.png"
        if not matriz.exists():
            continue
        destino.mkdir(parents=True, exist_ok=True)
        with Image.open(matriz) as imagem:
            original = imagem.convert("RGB")
            if nome in AREA_UTIL:
                x0, y0, x1, y1 = AREA_UTIL[nome]
                largura, altura = original.size
                util = original.crop((round(x0 * largura), round(y0 * altura), round(x1 * largura), round(y1 * altura)))
            else:
                util = original
            recorte = recortar_proporcao(util, *proporcao, topo=topo).resize(tamanho, Image.LANCZOS)
            # A cor do fundo vem da matriz inteira: o recorte pode ter perdido o canto liso.
            saidas.append(_salvar(remover_fundo(recorte, cor_do_fundo(original)) if sem_fundo else recorte, destino, nome))
    return saidas


def preparar_arte_do_resumo(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera as pinturas opcionais do Resumo cujas matrizes existirem em `origem`."""
    return preparar_pinturas(ARTES_DO_RESUMO, origem, destino)


def preparar_arte_das_informacoes(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera as pinturas opcionais de Informações básicas cujas matrizes existirem em `origem`."""
    return preparar_pinturas(ARTES_DAS_INFORMACOES, origem, destino)


# Pinturas opcionais da aba Atributos (redesenhar-aba-atributos, D4), na pasta `atributos/`. A gravura das
# três figuras fica com o fundo de papel: na tela ela é multiplicada sobre o pergaminho.
ARTES_DOS_ATRIBUTOS: dict[str, tuple[tuple[int, int], tuple[int, int], float, bool]] = {
    # 11:4 é a proporção da gravura do usuário: um recorte mais baixo cortaria a cabeça e o halo.
    "atributos-gravura": ((11, 4), (1440, 524), .5, False),
    # O recorte vertical segue o que importa em cada cena: o arqueiro e o castelo no alto, as figuras e o
    # mapa celeste no meio.
    "atributos-faixa-fisicos": ((3, 1), (1200, 400), .3, False),
    "atributos-faixa-sociais": ((3, 1), (1200, 400), .45, False),
    "atributos-faixa-mentais": ((3, 1), (1200, 400), .35, False),
}


# Pinturas da aba Personalidade (reformular-personalidade-da-ficha, D6), na pasta `personalidade/`: a
# escrivaninha do alto e a natureza-morta da História, geradas pelo Codex a partir dos recortes da referência.
# O fundo de pergaminho fica; o esmaecimento para o papel é feito no CSS.
ARTES_DA_PERSONALIDADE: dict[str, tuple[tuple[int, int], tuple[int, int], float, bool]] = {
    "personalidade-escrivaninha": ((16, 9), (1280, 720), .5, False),
    "personalidade-historia": ((2, 1), (1280, 640), .5, False),
}


def preparar_arte_da_personalidade(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera as pinturas opcionais da aba Personalidade cujas matrizes existirem em `origem`."""
    return preparar_pinturas(ARTES_DA_PERSONALIDADE, origem, destino / "personalidade")


def preparar_arte_dos_atributos(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera as pinturas opcionais da aba Atributos cujas matrizes existirem em `origem`."""
    return preparar_pinturas(ARTES_DOS_ATRIBUTOS, origem, destino / "atributos")


# Pinturas opcionais da aba Perícias (redesenhar-aba-pericias, D7), na pasta `pericias/`. A paisagem em sépia
# fica com o fundo de papel, multiplicada sobre o pergaminho como a gravura dos Atributos. Nas matrizes de
# 2026-09-29 (8:3), as figuras ocupam a faixa do meio; nos estandartes, o recorte segue o que importa em cada
# cena: o lanceiro e o castelo, o arqueiro e o alvo, e as velas e a esfera armilar, mais baixas.
ARTES_DAS_PERICIAS: dict[str, tuple[tuple[int, int], tuple[int, int], float, bool]] = {
    "pericias-cena": ((4, 1), (1536, 384), .5, False),
    "pericias-talentos": ((3, 1), (1200, 400), .4, False),
    "pericias-tecnicas": ((3, 1), (1200, 400), .45, False),
    "pericias-conhecimentos": ((3, 1), (1200, 400), .7, False),
}


def preparar_arte_das_pericias(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera as pinturas opcionais da aba Perícias cujas matrizes existirem em `origem`."""
    return preparar_pinturas(ARTES_DAS_PERICIAS, origem, destino / "pericias")


# Pinturas opcionais da aba Cartas (redesenhar-aba-cartas, D9), na pasta `cartas/`. A gravura do cabeçalho
# fica com o fundo de papel, multiplicada sobre o pergaminho. Há uma faixa por categoria de carta: a cena
# com o medalhão e o emblema já pintados no centro. As categorias de item vêm do catálogo do sistema.
CATALOGO_DE_ITENS = FRONTEND.parents[1] / "cursed_platform" / "catalogos" / "itens.json"
CATEGORIAS_DE_CARTA = ("habilidades", "magias", "efeitos")
TAMANHO_DA_FAIXA = (1024, 304)  # a proporção da faixa na carta, 266 × 79 px


def categorias_das_cartas(catalogo: Path = CATALOGO_DE_ITENS) -> list[str]:
    """Habilidades, magias e efeitos, mais as categorias de item do catálogo, na ordem da barra de filtros."""
    itens = [c["id"] for c in json.loads(catalogo.read_text(encoding="utf-8"))["categorias"]]
    return [*CATEGORIAS_DE_CARTA[:2], *itens, CATEGORIAS_DE_CARTA[2]]


# Arte quadrada da categoria no quadro da página esquerda do grimório (D8 revisto): o painel com o medalhão
# e a moldura de filigrana pintados, como no conceito. O gerador deixa uma tira de pergaminho nas bordas.
MARGEM_DA_ARTE = .016


def artes_das_cartas(catalogo: Path = CATALOGO_DE_ITENS) -> dict[str, tuple[tuple[int, int], tuple[int, int], float, bool]]:
    for c in categorias_das_cartas(catalogo):
        m = MARGEM_DA_ARTE
        AREA_UTIL.setdefault(f"cartas-arte-{c.replace('_', '-')}", (m, m, 1 - m, 1 - m))
    return {
        **{f"cartas-arte-{c.replace('_', '-')}": ((1, 1), (800, 800), .5, False) for c in categorias_das_cartas(catalogo)},
        "cartas-gravura": ((6, 1), (1536, 256), .5, False),
        # O grimório do detalhe (D8 revisto): o livro aberto de páginas em branco e a cena de velas em volta,
        # na proporção do diálogo do conceito aprovado (1395 × 790). O conteúdo é posto por cima.
        "cartas-detalhe-livro": ((1395, 790), (1600, 906), .5, False),
        # O editor de cartas (simplificar-criacao-de-cartas, D9): o livro do conceito do editor, de páginas em
        # branco e sem os marcadores, na proporção do conceito (1536 × 1024).
        "cartas-editor-livro": ((3, 2), (1536, 1024), .5, False),
        **{f"cartas-faixa-{c.replace('_', '-')}": (TAMANHO_DA_FAIXA, TAMANHO_DA_FAIXA, .5, False) for c in categorias_das_cartas(catalogo)},
    }


# Medalhão da carta da grade (pedido do usuário, 2026-09-30): o da arte quadrada da categoria, mais bonito que o
# pintado na faixa, recortado num círculo de borda suave e posto por cima do centro da faixa. Frações do lado da
# arte: o aro vai de 17% a 83% e os losangos encostam nele; o recorte pega até 36% do centro.
RAIO_DO_MEDALHAO = .36
SUAVE_DO_MEDALHAO = .025
LADO_DO_MEDALHAO = 400


def recortar_medalhao(arte: Image.Image) -> Image.Image:
    """Círculo central da arte, com transparência fora dele e uma borda que esmaece."""
    lado = min(arte.size)
    quadrado = recortar_proporcao(arte.convert("RGB"), 1, 1)
    raio = RAIO_DO_MEDALHAO * lado
    caixa = (round(lado / 2 - raio), round(lado / 2 - raio), round(lado / 2 + raio), round(lado / 2 + raio))
    recorte = quadrado.crop(caixa).convert("RGBA")
    diametro = recorte.width
    escala = 4  # máscara em alta resolução, para o círculo sair liso
    mascara = Image.new("L", (diametro * escala, diametro * escala), 0)
    ImageDraw.Draw(mascara).ellipse((0, 0, diametro * escala - 1, diametro * escala - 1), fill=255)
    borda = max(1, round(SUAVE_DO_MEDALHAO * lado))
    mascara = mascara.resize((diametro, diametro), Image.LANCZOS).filter(ImageFilter.GaussianBlur(borda / 2))
    recorte.putalpha(mascara)
    return recorte.resize((LADO_DO_MEDALHAO, LADO_DO_MEDALHAO), Image.LANCZOS)


# Peças do editor de cartas (simplificar-criacao-de-cartas, D9), pintadas sobre pergaminho liso: o marcador de
# couro vazio (comum e ativo) e o selo de cera vazio do Publicar. Perdem o fundo e são recortadas rente ao objeto.
# nome -> largura final, em pixels.
PECAS_DO_EDITOR: dict[str, int] = {
    "cartas-editor-marcador": 480,
    "cartas-editor-marcador-ativo": 480,
    "cartas-editor-selo": 480,
}


def preparar_pecas_do_editor(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    saidas: list[Path] = []
    for nome, largura in PECAS_DO_EDITOR.items():
        matriz = origem / f"{nome}.png"
        if not matriz.exists():
            continue
        destino.mkdir(parents=True, exist_ok=True)
        with Image.open(matriz) as imagem:
            objeto, _ = recortar_objeto(imagem, canto="esquerda")
        altura = max(1, round(objeto.height * largura / objeto.width))
        caminho = destino / f"{nome}.webp"
        objeto.resize((largura, altura), Image.LANCZOS).save(caminho, "WEBP", quality=90, method=6)
        saidas.append(caminho)
    return saidas


def preparar_arte_das_cartas(origem: Path = ORIGEM, destino: Path = DESTINO, catalogo: Path = CATALOGO_DE_ITENS) -> list[Path]:
    """Gera as pinturas opcionais da aba Cartas cujas matrizes existirem em `origem`, e os medalhões das artes."""
    saidas = preparar_pinturas(artes_das_cartas(catalogo), origem, destino / "cartas")
    saidas.extend(preparar_pecas_do_editor(origem, destino / "cartas"))
    for arte in [s for s in saidas if s.stem.startswith("cartas-arte-")]:
        with Image.open(arte) as imagem:
            medalhao = recortar_medalhao(imagem)
        caminho = destino / "cartas" / f"{arte.stem.replace('cartas-arte-', 'cartas-medalhao-')}.webp"
        medalhao.save(caminho, "WEBP", quality=90, method=6)
        saidas.append(caminho)
    return saidas


# Pinturas opcionais do Inventário da ficha (reformular-visual-da-ficha, tarefa 8.1): o couro é textura
# que se repete; as peças da bolsa vêm sobre pergaminho liso e perdem o fundo. Sem a matriz, a bolsa usa
# o couro em gradiente do CSS e a peça não aparece.
# nome -> (proporção, tamanho final, remover o fundo, área útil da matriz em frações (x0, y0, x1, y1)).
# O tecido perde o alto da matriz, onde o gerador desenhou um pedaço de bolsa cortado na borda.
# Laterais da bolsa, como um lanche (D1, item 4): nome -> (borda em que fica a tira, a que encosta na
# grade; faixa só de couro que se repete, em frações da altura da pintura, ou None para detectar).
# As faixas valem para as pinturas de 2026-09-29: entre o mapa e a fivela de baixo (esquerda) e entre
# a fivela da alça e a argola do saco de moedas (direita). Pintura nova: conferir ou voltar a None.
LADOS_DO_INVENTARIO: dict[str, tuple[str, tuple[float, float] | None]] = {
    "inventario-lado-esquerdo": ("direita", (.405, .515)),
    "inventario-lado-direito": ("esquerda", (.335, .495)),
}
LARGURA_LADO = 320
PARTES_DO_LADO = ("topo", "miolo", "base")
# Tampa aberta no alto (uma peça, sem esticar) e base no pé, que estica na largura (D1, item 5).
# A faixa do miolo da base, em frações da largura da pintura, ou None para detectar.
LARGURA_TAMPA = 640
ALTURA_BASE = 240
MIOLO_DA_BASE: tuple[float, float] | None = None
PARTES_DA_BASE = ("esquerda", "miolo", "direita")


def manter_objeto_principal(imagem: Image.Image, limiar: int = 96) -> Image.Image:
    """Apaga manchas soltas que sobraram do fundo: fica só o que está ligado ao objeto do centro."""
    alfa = imagem.getchannel("A")
    opaco = alfa.point(lambda v: 255 if v > limiar else 0)
    largura, altura = opaco.size
    # Semente: o ponto opaco mais perto do centro (os prompts pedem o objeto no meio da imagem).
    cx, cy = largura // 2, altura // 2
    semente = next(((cx + dx, cy + dy) for raio in range(0, max(largura, altura), 2)
                    for dx, dy in ((raio, 0), (-raio, 0), (0, raio), (0, -raio))
                    if 0 <= cx + dx < largura and 0 <= cy + dy < altura and opaco.getpixel((cx + dx, cy + dy)) == 255), None)
    if semente is None:
        return imagem
    ImageDraw.floodfill(opaco, semente, 128, thresh=0)
    # A borda suave (alfa baixo) em volta do objeto continua: a máscara cresce alguns pixels.
    ligado = opaco.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(7))
    limpa = imagem.copy()
    limpa.putalpha(ImageChops.darker(alfa, ligado))
    return limpa


def _extensao_por_linha(alfa: Image.Image, limiar: int = 128) -> list[int]:
    """Largura ocupada pelo objeto em cada linha (0 na linha vazia)."""
    opaco = alfa.point(lambda v: 255 if v >= limiar else 0)
    larguras = []
    for y in range(opaco.height):
        caixa = opaco.crop((0, y, opaco.width, y + 1)).getbbox()
        larguras.append(caixa[2] - caixa[0] if caixa else 0)
    return larguras


def achar_miolo(imagem: Image.Image) -> tuple[int, int]:
    """Linhas [início, fim) onde só aparece a tira de couro: a faixa contínua mais longa com a largura mínima.

    O mapa, a fivela, o tecido e o saco avançam para fora da tira e alargam as linhas do topo e da base.
    """
    larguras = _extensao_por_linha(imagem.getchannel("A"))
    altura = len(larguras)
    centrais = [w for w in larguras[altura // 5: altura - altura // 5] if w > 0]
    if not centrais:
        raise ValueError("lateral sem tira de couro no meio da imagem")
    limite = min(centrais) * 1.12 + 2
    melhor, inicio = (0, 0), None
    for y, w in enumerate(larguras + [0]):
        if 0 < w <= limite:
            inicio = y if inicio is None else inicio
        elif inicio is not None:
            melhor = max(melhor, (inicio, y), key=lambda f: f[1] - f[0])
            inicio = None
    comeco, fim = melhor
    # Margem: a sombra de um objeto costuma escurecer as primeiras linhas "só de tira".
    margem = (fim - comeco) // 20
    comeco, fim = comeco + margem, fim - margem
    if fim - comeco < altura * .08:
        raise ValueError("miolo da lateral muito curto: o terço do meio deve ter só a tira de couro")
    return comeco, fim


def dividir_lateral(imagem: Image.Image, mistura: int = 48, miolo: tuple[int, int] | None = None) -> dict[str, Image.Image]:
    """Topo, miolo sem emenda na vertical e base de uma lateral já sem fundo.

    O miolo repetido começa `k` linhas abaixo do início da faixa só de couro; as últimas `k` linhas
    dele se misturam com as `k` primeiras da faixa, que na pintura vinham logo antes. Assim o fim de
    uma repetição emenda no começo da seguinte, e o topo (que vai até ali) emenda no primeiro miolo.
    """
    comeco, fim = miolo or achar_miolo(imagem)
    k = max(1, min(mistura, (fim - comeco) // 3))
    miolo = imagem.crop((0, comeco + k, imagem.width, fim))
    fim_original = imagem.crop((0, fim - k, imagem.width, fim))
    antes_do_miolo = imagem.crop((0, comeco, imagem.width, comeco + k))
    peso = Image.linear_gradient("L").resize((imagem.width, k))
    miolo.paste(Image.composite(antes_do_miolo, fim_original, peso), (0, miolo.height - k))
    return {
        "topo": imagem.crop((0, 0, imagem.width, comeco + k)),
        "miolo": miolo,
        "base": imagem.crop((0, fim, imagem.width, imagem.height)),
    }


def recortar_objeto(matriz: Image.Image, canto: str = "direita") -> tuple[Image.Image, tuple[int, int, int, int]]:
    """Apaga o fundo (medido no canto de cima indicado), fica só com o objeto principal e recorta rente a ele."""
    rgb = matriz.convert("RGB")
    sem_fundo = manter_objeto_principal(remover_fundo(rgb, cor_do_fundo(rgb, canto=canto)))
    caixa = sem_fundo.getchannel("A").point(lambda v: 255 if v >= 32 else 0).getbbox() or (0, 0, *sem_fundo.size)
    return sem_fundo.crop(caixa), caixa


def preparar_lateral(matriz: Image.Image, borda_da_tira: str, miolo: tuple[float, float] | None = None) -> dict[str, Image.Image]:
    """Apaga o fundo (medido no canto de cima oposto à tira), recorta rente ao objeto e divide em três.

    `miolo`: faixa só de couro em frações da altura da matriz; sem ela, a faixa é detectada.
    """
    sem_fundo, caixa = recortar_objeto(matriz, "esquerda" if borda_da_tira == "direita" else "direita")
    escala = LARGURA_LADO / sem_fundo.width
    reduzida = sem_fundo.resize((LARGURA_LADO, round(sem_fundo.height * escala)), Image.LANCZOS)
    linhas = None
    if miolo:
        linhas = tuple(min(reduzida.height, max(0, round((f * matriz.height - caixa[1]) * escala))) for f in miolo)
    return dividir_lateral(reduzida, miolo=linhas)  # type: ignore[arg-type]


def preparar_tampa(matriz: Image.Image) -> Image.Image:
    """Tampa aberta da bolsa: sem fundo, rente ao objeto, com LARGURA_TAMPA de largura."""
    sem_fundo, _ = recortar_objeto(matriz)
    return sem_fundo.resize((LARGURA_TAMPA, round(sem_fundo.height * LARGURA_TAMPA / sem_fundo.width)), Image.LANCZOS)


def esmaecer_bordas_cortadas(imagem: Image.Image, caixa: tuple[int, int, int, int], tamanho: tuple[int, int],
                             faixa: float = .07) -> Image.Image:
    """Esmaece, na horizontal, os lados em que o objeto encostava na borda da pintura (ali ele foi cortado reto)."""
    esquerda, direita = caixa[0] <= 1, caixa[2] >= tamanho[0] - 1
    if not (esquerda or direita):
        return imagem
    largura = max(1, round(imagem.width * faixa))
    rampa = []
    for x in range(imagem.width):
        peso = 1.0
        if esquerda:
            peso = min(peso, (x + .5) / largura)
        if direita:
            peso = min(peso, (imagem.width - x - .5) / largura)
        rampa.append(round(255 * max(0.0, min(1.0, peso))))
    linha = Image.new("L", (imagem.width, 1))
    linha.putdata(rampa)
    resultado = imagem.copy()
    resultado.putalpha(ImageChops.multiply(imagem.getchannel("A"), linha.resize(imagem.size, Image.NEAREST)))
    return resultado


def preparar_base(matriz: Image.Image, miolo: tuple[float, float] | None = None) -> dict[str, Image.Image]:
    """Base da bolsa: a divisão das laterais com a pintura girada (a ponta esquerda vira o topo).

    `miolo`: faixa só de couro em frações da largura da matriz; sem ela, a faixa é detectada.
    """
    sem_fundo, caixa = recortar_objeto(matriz)
    # O pano das pontas pode encostar nas laterais da pintura; o corte reto vira um esmaecido.
    sem_fundo = esmaecer_bordas_cortadas(sem_fundo, caixa, matriz.size)
    escala = ALTURA_BASE / sem_fundo.height
    reduzida = sem_fundo.resize((round(sem_fundo.width * escala), ALTURA_BASE), Image.LANCZOS)
    colunas = None
    if miolo:
        colunas = tuple(min(reduzida.width, max(0, round((f * matriz.width - caixa[0]) * escala))) for f in miolo)
    # Girada 90° no sentido horário, a coluna da esquerda vira a linha de cima.
    partes = dividir_lateral(reduzida.transpose(Image.Transpose.ROTATE_270), miolo=colunas)  # type: ignore[arg-type]
    return {"esquerda": partes["topo"].transpose(Image.Transpose.ROTATE_90),
            "miolo": partes["miolo"].transpose(Image.Transpose.ROTATE_90),
            "direita": partes["base"].transpose(Image.Transpose.ROTATE_90)}


def preparar_arte_do_inventario(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera o couro, as laterais, a tampa e a base da bolsa cujas matrizes existirem em `origem` (saída em `destino/inventario`)."""
    saidas: list[Path] = []
    pasta = destino / "inventario"
    couro = origem / "inventario-couro.png"
    if couro.exists():
        pasta.mkdir(parents=True, exist_ok=True)
        with Image.open(couro) as imagem:
            textura = recortar_proporcao(imagem.convert("RGB"), 1, 1).resize((LADO_TEXTURA, LADO_TEXTURA), Image.LANCZOS)
            saidas.append(_salvar(sem_emenda(textura), pasta, "inventario-couro", qualidade=90))
    for nome, (borda_da_tira, miolo) in LADOS_DO_INVENTARIO.items():
        matriz = origem / f"{nome}.png"
        if not matriz.exists():
            continue
        pasta.mkdir(parents=True, exist_ok=True)
        with Image.open(matriz) as imagem:
            partes = preparar_lateral(imagem, borda_da_tira, miolo)
        saidas.extend(_salvar(partes[parte], pasta, f"{nome}-{parte}", qualidade=86) for parte in PARTES_DO_LADO)
    tampa = origem / "inventario-tampa.png"
    if tampa.exists():
        pasta.mkdir(parents=True, exist_ok=True)
        with Image.open(tampa) as imagem:
            saidas.append(_salvar(preparar_tampa(imagem), pasta, "inventario-tampa", qualidade=86))
    base = origem / "inventario-base.png"
    if base.exists():
        pasta.mkdir(parents=True, exist_ok=True)
        with Image.open(base) as imagem:
            partes = preparar_base(imagem, MIOLO_DA_BASE)
        saidas.extend(_salvar(partes[parte], pasta, f"inventario-base-{parte}", qualidade=86) for parte in PARTES_DA_BASE)
    return saidas


# Arte da navegação inicial (navegacao-inicial-e-perfil, tarefa 1.4):
# nome da matriz -> [(nome da saída, proporção, tamanho final, posição vertical do recorte)].
# Matriz ausente: a saída não é gerada e a tela fica com o gradiente do tema.
ARTES_DA_NAVEGACAO: dict[str, list[tuple[str, tuple[int, int], tuple[int, int], float]]] = {
    "abertura-inicio": [("abertura-inicio-1536", (16, 9), (1536, 864), .45),
                        ("abertura-inicio-768", (16, 9), (768, 432), .45)],
    "abertura-entrada": [("abertura-entrada-1536", (3, 2), (1536, 1024), .5),
                         ("abertura-entrada-768", (3, 4), (768, 1024), .5)],
    "capa-campanha-padrao": [("capa-campanha-padrao-1536", (3, 1), (1536, 512), .42),
                             ("capa-campanha-padrao-miniatura", (3, 4), (240, 320), .5)],
    "faixa-visao-geral": [("faixa-visao-geral-1536", (3, 1), (1536, 512), .5),
                          ("faixa-visao-geral-768", (3, 1), (768, 256), .5)],
    "faixa-regras": [("faixa-regras-1536", (3, 1), (1536, 512), .45),
                     ("faixa-regras-768", (3, 1), (768, 256), .45)],
    "retrato-vazio-npc": [("retrato-vazio-npc", (3, 4), (900, 1200), .2),
                          ("retrato-vazio-npc-256", (1, 1), (256, 256), .12)],
    "retrato-vazio-monstro": [("retrato-vazio-monstro", (3, 4), (900, 1200), .15),
                              ("retrato-vazio-monstro-256", (1, 1), (256, 256), .12)],
}
# O retrato padrão do personagem de jogador também ganha a versão quadrada para avatares da lista.
RETRATO_JOGADOR_QUADRADO = ("retrato-vazio-256", (1, 1), (256, 256), .1)

def preparar_arte_da_navegacao(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera a arte da navegação inicial cujas matrizes existirem em `origem`."""
    saidas: list[Path] = []
    trabalhos = dict(ARTES_DA_NAVEGACAO)
    trabalhos["retrato-vazio"] = [RETRATO_JOGADOR_QUADRADO]
    for matriz, recortes in trabalhos.items():
        caminho = origem / f"{matriz}.png"
        if not caminho.exists():
            continue
        destino.mkdir(parents=True, exist_ok=True)
        with Image.open(caminho) as imagem:
            rgb = imagem.convert("RGB")
            for nome, proporcao, tamanho, topo in recortes:
                recorte = recortar_proporcao(rgb, *proporcao, topo=topo)
                saidas.append(_salvar(recorte.resize(tamanho, Image.LANCZOS), destino, nome))
    return saidas


# Ícones da aba Personalidade recortados da própria referência do usuário (reformular-personalidade-da-ficha,
# D7, revisado em 2026-09-30 a pedido dele): o desenho fica idêntico ao da imagem. Cada ícone: região de busca
# (px da referência inteira) e o lado do quadrado em que ele aparece lá (48 nas linhas, 80 nos emblemas, 56 no
# livro da História). A tela mostra a máscara nesse mesmo tamanho, então a escala é a da referência.
REFERENCIA_DA_PERSONALIDADE = FRONTEND / "e2e" / "fixtures" / "referencias" / "personalidade" / "personalidade.webp"
ICONES_DA_PERSONALIDADE: dict[str, tuple[tuple[int, int, int, int], int]] = {
    "rosa_dos_ventos": ((60, 622, 152, 712), 80),
    "lua_solar": ((588, 622, 680, 712), 80),
    "livro_fechado": ((84, 1108, 152, 1166), 56),
    "balanca": ((66, 722, 130, 768), 48),
    "livro_aberto": ((66, 787, 130, 827), 48),
    "olho": ((66, 852, 130, 889), 48),
    "louros": ((66, 913, 130, 966), 48),
    "aranha": ((66, 986, 130, 1041), 48),
    "caveira": ((590, 720, 656, 766), 48),
    "espadas": ((590, 777, 656, 820), 48),
    "mao": ((590, 828, 656, 879), 48),
    "ampulheta": ((590, 888, 656, 935), 48),
    "estrela": ((590, 946, 656, 999), 48),
    "lua_estrela": ((590, 1009, 656, 1057), 48),
}
ESCALA_DOS_ICONES = 4


def _caixa_de_tinta(cinza: Image.Image, limiar: int = 120) -> tuple[int, int, int, int] | None:
    return cinza.point(lambda v: 255 if v < limiar else 0).getbbox()


def mascara_do_icone(referencia: Image.Image, regiao: tuple[int, int, int, int], lado: int,
                     escala: int = ESCALA_DOS_ICONES) -> Image.Image:
    """Recorta um ícone da referência num quadrado de `lado` px centrado na tinta e o transforma em máscara.

    Amplia `escala` vezes com suavização e converte a luminância em alfa: o pergaminho (mediana da borda do
    recorte) fica transparente e a tinta, opaca. Manchas claras do papel viram alfa zero. A cor da imagem é
    branca: na tela, o formato vem do alfa e a cor vem do tema (`mask-image`).
    """
    busca = referencia.crop(regiao).convert("L")
    tinta = _caixa_de_tinta(busca)
    if tinta is None:
        raise ValueError(f"nenhum desenho na região {regiao}")
    cx = regiao[0] + (tinta[0] + tinta[2]) / 2
    cy = regiao[1] + (tinta[1] + tinta[3]) / 2
    x0, y0 = round(cx - lado / 2), round(cy - lado / 2)
    recorte = referencia.crop((x0, y0, x0 + lado, y0 + lado)).convert("L")
    grande = recorte.resize((lado * escala, lado * escala), Image.LANCZOS).filter(ImageFilter.GaussianBlur(escala * 0.35))
    borda = [grande.getpixel((x, y)) for x in range(0, grande.width, 4) for y in (0, grande.height - 1)]
    borda += [grande.getpixel((x, y)) for y in range(0, grande.height, 4) for x in (0, grande.width - 1)]
    fundo = sorted(borda)[len(borda) // 2]
    escuros = sorted(grande.getdata())
    cor_da_tinta = escuros[len(escuros) // 50]
    faixa = max(1, fundo - cor_da_tinta)

    def alfa(v: int) -> int:
        t = (fundo - v) / faixa
        # Curva em S: bordas firmes, sem o véu das manchas do pergaminho.
        t = 0.0 if t < 0.18 else 1.0 if t > 0.62 else (t - 0.18) / 0.44
        return round(255 * t * t * (3 - 2 * t))

    mascara = Image.new("RGBA", grande.size, (255, 255, 255, 0))
    mascara.putalpha(grande.point(alfa))
    return mascara


def preparar_icones_da_personalidade(referencia: Path = REFERENCIA_DA_PERSONALIDADE, destino: Path = DESTINO) -> list[Path]:
    """Grava uma máscara WebP (sem perda, com alfa) por ícone em `arte/personalidade/icones/`."""
    if not referencia.exists():
        return []
    imagem = Image.open(referencia).convert("RGB")
    pasta = destino / "personalidade" / "icones"
    pasta.mkdir(parents=True, exist_ok=True)
    saidas: list[Path] = []
    for nome, (regiao, lado) in ICONES_DA_PERSONALIDADE.items():
        caminho = pasta / f"{nome}.webp"
        mascara_do_icone(imagem, regiao, lado).save(caminho, "WEBP", lossless=True, method=6)
        saidas.append(caminho)
    return saidas


def preparar(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    destino.mkdir(parents=True, exist_ok=True)
    abrir = lambda nome: Image.open(origem / f"{nome}.png")  # noqa: E731
    saidas: list[Path] = []

    ancora = recortar_proporcao(abrir("ancora-castelo").convert("RGB"), 2, 1, topo=0)
    saidas.append(_salvar(ancora.resize((1536, 768), Image.LANCZOS), destino, "ancora-castelo-1536"))
    saidas.append(_salvar(ancora.resize((768, 384), Image.LANCZOS), destino, "ancora-castelo-768"))

    for nome in ("fundo-noite", "pergaminho"):
        textura = abrir(nome).convert("RGB").resize((LADO_TEXTURA, LADO_TEXTURA), Image.LANCZOS)
        saidas.append(_salvar(sem_emenda(textura), destino, nome, qualidade=95))

    emblema = limpar_halo(abrir("emblema-cursed"))
    for lado in (256, 1024):
        # A reamostragem cria bordas quase transparentes avermelhadas: limpa de novo no tamanho final
        # e grava sem perda, porque a compressão com perda mistura de volta a cor das bordas.
        reduzido = limpar_halo(emblema.resize((lado, lado), Image.LANCZOS))
        caminho = destino / f"emblema-cursed-{lado}.webp"
        reduzido.save(caminho, "WEBP", lossless=True, method=6)
        saidas.append(caminho)

    retrato = recortar_proporcao(abrir("retrato-vazio").convert("RGB"), 3, 4, topo=.3)
    saidas.append(_salvar(retrato.resize((900, 1200), Image.LANCZOS), destino, "retrato-vazio"))

    for lado in (16, 32):
        caminho = destino.parent / f"favicon-{lado}.png"
        icone_da_aba(lado).save(caminho, "PNG", optimize=True)
        saidas.append(caminho)

    for etapa in ETAPAS:
        imagem = abrir(f"etapa-{etapa}").convert("RGB")
        saidas.append(_salvar(recortar_proporcao(imagem, 3, 2).resize((1200, 800), Image.LANCZOS), destino, f"etapa-{etapa}"))

    saidas.extend(preparar_arte_do_resumo(origem, destino))
    saidas.extend(preparar_arte_das_informacoes(origem, destino))
    saidas.extend(preparar_arte_dos_atributos(origem, destino))
    saidas.extend(preparar_arte_da_personalidade(origem, destino))
    saidas.extend(preparar_arte_das_pericias(origem, destino))
    saidas.extend(preparar_arte_das_cartas(origem, destino))
    saidas.extend(preparar_arte_do_inventario(origem, destino))
    saidas.extend(preparar_arte_da_navegacao(origem, destino))
    return saidas


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    argumentos.add_argument("--origem", type=Path, default=ORIGEM)
    argumentos.add_argument("--destino", type=Path, default=DESTINO)
    opcoes = argumentos.parse_args()
    saidas = preparar(opcoes.origem, opcoes.destino)
    # Os ícones da Personalidade saem da referência versionada, não das matrizes de `arte-original/`.
    saidas += preparar_icones_da_personalidade(destino=opcoes.destino)
    total = sum(caminho.stat().st_size for caminho in saidas)
    for caminho in saidas:
        print(f"{caminho.name:32} {caminho.stat().st_size / 1024:8.1f} KB")
    print(f"Total: {total / 1024 / 1024:.2f} MB em {opcoes.destino}")


if __name__ == "__main__":
    main()
