"""Envio de imagens pela API: validação, nome por conteúdo e versão de exibição (D7).

Só PNG, JPEG e WEBP cujo conteúdo corresponde ao formato; o limite de bytes é checado antes de
decodificar e o limite de pixels protege contra bombas de descompressão. O nome do objeto é o
SHA-256 do conteúdo. Retratos, itens e ícones ganham uma cópia WEBP reduzida ao lado da original.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
from io import BytesIO
from pathlib import PurePosixPath

from PIL import Image, UnidentifiedImageError

MB = 1024 * 1024
MAX_PIXELS = 20_000_000
FORMATOS = (
    (b"\x89PNG\r\n\x1a\n", "image/png", "png", "PNG"),
    (b"\xff\xd8\xff", "image/jpeg", "jpg", "JPEG"),
    (b"RIFF", "image/webp", "webp", "WEBP"),
)
SUFIXO_EXIBICAO = ".exibicao.webp"


@dataclass(frozen=True)
class Destino:
    nome: str
    rotulo: str
    limite_mb: int
    lado_exibicao: int | None  # maior lado da versão de exibição; None = sem versão reduzida


DESTINOS: dict[str, Destino] = {d.nome: d for d in (
    Destino("retrato", "retrato", 5, 512),
    # Imagem de corpo inteiro do Resumo da ficha (aba-resumo-da-ficha, D7).
    Destino("ilustracao", "ilustração", 8, 1536),
    Destino("item", "arte do item", 5, 256),
    Destino("icone-grade", "ícone de grade", 5, 256),
    Destino("efeito", "imagem do efeito", 5, 256),
    Destino("carta", "arte da carta", 8, None),
    Destino("mapa", "mapa da cena", 15, None),
    Destino("icone-efeito", "ícone do efeito", 5, 256),
    Destino("capa", "capa da campanha", 8, 1600),
    Destino("foto", "foto do perfil", 5, 256),
)}


class ImagemRecusada(ValueError):
    """Motivo legível para quem enviou; nada é gravado."""


@dataclass(frozen=True)
class ImagemValida:
    conteudo: bytes
    tipo: str
    extensao: str
    sha256: str
    largura: int
    altura: int

    @property
    def nome(self) -> str:
        return f"{self.sha256}.{self.extensao}"


def validar(conteudo: bytes, destino: Destino) -> ImagemValida:
    limite = destino.limite_mb * MB
    if not conteudo:
        raise ImagemRecusada("O arquivo está vazio.")
    if len(conteudo) > limite:
        raise ImagemRecusada(f"A imagem passa do limite de {destino.limite_mb} MB para {destino.rotulo}.")
    for assinatura, tipo, extensao, formato in FORMATOS:
        if not conteudo.startswith(assinatura) or (formato == "WEBP" and conteudo[8:12] != b"WEBP"):
            continue
        try:
            with Image.open(BytesIO(conteudo)) as imagem:
                if imagem.width * imagem.height > MAX_PIXELS:
                    raise ImagemRecusada("A imagem tem pixels demais (limite de 20 milhões).")
                if imagem.format != formato:
                    raise ImagemRecusada("O conteúdo não corresponde ao formato da imagem.")
                largura, altura = imagem.size
                imagem.verify()
        except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as erro:
            raise ImagemRecusada("A imagem está corrompida ou incompleta.") from erro
        return ImagemValida(conteudo, tipo, extensao, hashlib.sha256(conteudo).hexdigest(), largura, altura)
    raise ImagemRecusada("Envie uma imagem PNG, JPEG ou WEBP.")


def versao_exibicao(imagem: ImagemValida, lado: int) -> bytes:
    """Cópia WEBP com o maior lado limitado a ``lado`` pixels; a original é preservada à parte."""
    with Image.open(BytesIO(imagem.conteudo)) as original:
        copia = original.convert("RGBA" if "A" in original.getbands() or original.mode == "P" else "RGB")
        copia.thumbnail((lado, lado), Image.LANCZOS)
        saida = BytesIO()
        copia.save(saida, "WEBP", quality=85, method=6)
        return saida.getvalue()


def caminho_exibicao(caminho: str) -> str:
    """``.../abc.png`` -> ``.../abc.exibicao.webp``."""
    atual = PurePosixPath(caminho)
    return str(atual.with_name(f"{atual.stem}{SUFIXO_EXIBICAO}"))
