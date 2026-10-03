"""Leitura de imagens privadas após autorização da mesa."""

from __future__ import annotations

import base64
from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from cursed_platform.acesso_privado import AutorizadorRecursos, BUCKET_PRIVADO
from cursed_platform.imagens import caminho_exibicao
from cursed_platform.migracao_ativos import AtivoInvalido

from .auth import Ator, get_actor
from .dependencies import get_session


router = APIRouter(prefix="/mesas/{mesa_id}/ativos", tags=["Ativos"])


class AtivoResposta(BaseModel):
    tipo: str
    base64: str


@router.get("", response_model=AtivoResposta)
def ler_ativo(mesa_id: str, caminho: str, request: Request, exibicao: bool = False,
              ator: Ator = Depends(get_actor), session: Session = Depends(get_session)) -> AtivoResposta:
    """``exibicao=true`` entrega a versão reduzida (WEBP) quando ela existe; senão, a original."""
    prefixo = f"mesas/{mesa_id}/"
    if not caminho.startswith(prefixo) or not AutorizadorRecursos(session).decidir_objeto(
        ator.usuario_id, BUCKET_PRIVADO, caminho
    ).permitido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado.")
    return ler_imagem(request, caminho, exibicao)


def ler_imagem(request: Request, caminho: str, exibicao: bool) -> AtivoResposta:
    """Lê uma imagem já autorizada do armazenamento privado (a reduzida, com ``exibicao``, quando existe)."""
    armazenamento = request.app.state.armazenamento_objetos
    if armazenamento is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Armazenamento indisponível.")
    try:
        reduzida = armazenamento.ler(BUCKET_PRIVADO, caminho_exibicao(caminho)) if exibicao else None
        if reduzida is not None:
            return AtivoResposta(tipo="image/webp", base64=base64.b64encode(reduzida).decode("ascii"))
        dados = armazenamento.ler(BUCKET_PRIVADO, caminho)
    except AtivoInvalido as erro:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao ler o ativo.") from erro
    if dados is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo não encontrado.")
    extensao = PurePosixPath(caminho).suffix.lower()
    tipos = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
             ".gif": "image/gif", ".webp": "image/webp"}
    tipo = tipos.get(extensao)
    if tipo is None:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Tipo de imagem inválido.")
    return AtivoResposta(tipo=tipo, base64=base64.b64encode(dados).decode("ascii"))
