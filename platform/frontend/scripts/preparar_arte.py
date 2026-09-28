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


def cor_do_fundo(imagem: Image.Image, amostra: int = 32) -> tuple[int, int, int]:
    """Cor média do canto superior direito, onde os prompts pedem só fundo liso."""
    canto = imagem.convert("RGB").crop((imagem.width - amostra, 0, imagem.width, amostra))
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


def preparar_arte_do_resumo(origem: Path = ORIGEM, destino: Path = DESTINO) -> list[Path]:
    """Gera as pinturas opcionais do Resumo cujas matrizes existirem em `origem`."""
    saidas: list[Path] = []
    for nome, (proporcao, tamanho, topo, sem_fundo) in ARTES_DO_RESUMO.items():
        matriz = origem / f"{nome}.png"
        if not matriz.exists():
            continue
        destino.mkdir(parents=True, exist_ok=True)
        with Image.open(matriz) as imagem:
            original = imagem.convert("RGB")
            recorte = recortar_proporcao(original, *proporcao, topo=topo).resize(tamanho, Image.LANCZOS)
            # A cor do fundo vem da matriz inteira: o recorte pode ter perdido o canto liso.
            saidas.append(_salvar(remover_fundo(recorte, cor_do_fundo(original)) if sem_fundo else recorte, destino, nome))
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
    saidas.extend(preparar_arte_da_navegacao(origem, destino))
    return saidas


def main() -> None:
    argumentos = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    argumentos.add_argument("--origem", type=Path, default=ORIGEM)
    argumentos.add_argument("--destino", type=Path, default=DESTINO)
    opcoes = argumentos.parse_args()
    saidas = preparar(opcoes.origem, opcoes.destino)
    total = sum(caminho.stat().st_size for caminho in saidas)
    for caminho in saidas:
        print(f"{caminho.name:32} {caminho.stat().st_size / 1024:8.1f} KB")
    print(f"Total: {total / 1024 / 1024:.2f} MB em {opcoes.destino}")


if __name__ == "__main__":
    main()
