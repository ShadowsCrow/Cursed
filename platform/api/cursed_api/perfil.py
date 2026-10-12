"""Perfil da pessoa: apelido, primeiro acesso e foto (navegacao-inicial-e-perfil, design D4 e D5).

A foto fica em ``usuarios/{id}/foto/`` no armazenamento privado, fora de qualquer mesa, e não entra no
histórico de mesa. Só a própria pessoa e quem divide ao menos uma mesa ativa com ela conseguem lê-la.
"""

from __future__ import annotations

import base64

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from cursed_platform import imagens, perfis
from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.contracts import AtualizarPerfilRequest, ImagemResposta, PerfilResposta
from cursed_platform.migracao_ativos import AtivoInvalido

from .assets import AtivoResposta
from .auth import Ator, get_actor
from .dependencies import get_session

router = APIRouter(tags=["Perfil"])


def _resposta(perfil, ator: Ator) -> PerfilResposta:
    return PerfilResposta(
        usuario_id=perfil.usuario_id,
        apelido=perfil.apelido,
        apelido_sugerido=perfis.sugerir_apelido(perfil),
        nome_exibido=perfil.apelido or perfil.nome,
        tem_foto=perfil.foto_objeto is not None,
        email=ator.email,
        provedor=ator.provedor,
        confirmado=perfil.perfil_confirmado_em is not None,
    )


def _armazenamento(request: Request):
    armazenamento = request.app.state.armazenamento_objetos
    if armazenamento is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Armazenamento indisponível.")
    return armazenamento


@router.get("/perfil", response_model=PerfilResposta)
def ler_perfil(ator: Ator = Depends(get_actor), session: Session = Depends(get_session)) -> PerfilResposta:
    perfil = perfis.obter(session, ator.usuario_id)
    session.commit()
    return _resposta(perfil, ator)


@router.put("/perfil", response_model=PerfilResposta)
def atualizar_perfil(
    pedido: AtualizarPerfilRequest, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PerfilResposta:
    try:
        perfil = perfis.definir_apelido(session, ator.usuario_id, pedido.apelido)
    except perfis.ApelidoInvalido as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    session.commit()
    return _resposta(perfil, ator)


@router.put("/perfil/foto", response_model=ImagemResposta)
def enviar_foto(
    request: Request, arquivo: UploadFile = File(...),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> ImagemResposta:
    configuracao = imagens.DESTINOS["foto"]
    conteudo = arquivo.file.read(configuracao.limite_mb * imagens.MB + 1)
    try:
        imagem = imagens.validar(conteudo, configuracao)
    except imagens.ImagemRecusada as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    armazenamento = _armazenamento(request)
    objeto = f"{perfis.prefixo_foto(ator.usuario_id)}/{imagem.nome}"
    exibicao = imagens.caminho_exibicao(objeto)
    try:
        armazenamento.gravar(BUCKET_PRIVADO, objeto, imagem.conteudo, imagem.tipo)
        armazenamento.gravar(BUCKET_PRIVADO, exibicao, imagens.versao_exibicao(imagem, configuracao.lado_exibicao or 256),
                             "image/webp")
    except AtivoInvalido as erro:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao gravar a imagem.") from erro
    perfis.obter(session, ator.usuario_id).foto_objeto = objeto
    session.commit()
    return ImagemResposta(destino="foto", alvo=ator.usuario_id, objeto=objeto, exibicao=exibicao)


@router.delete("/perfil/foto", response_model=ImagemResposta)
def remover_foto(ator: Ator = Depends(get_actor), session: Session = Depends(get_session)) -> ImagemResposta:
    perfis.obter(session, ator.usuario_id).foto_objeto = None
    session.commit()
    return ImagemResposta(destino="foto", alvo=ator.usuario_id)


@router.get("/perfis/{usuario_id}/foto", response_model=AtivoResposta)
def ler_foto(
    usuario_id: str, request: Request, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> AtivoResposta:
    """Versão de exibição da foto; 404 igual para "sem foto" e "sem permissão"."""
    objeto = perfis.fotos(session, [usuario_id]).get(usuario_id)
    if objeto is None or not perfis.pode_ver_foto(session, ator.usuario_id, usuario_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagem não encontrada.")
    armazenamento = _armazenamento(request)
    try:
        dados = armazenamento.ler(BUCKET_PRIVADO, imagens.caminho_exibicao(objeto))
        tipo = "image/webp"
        if dados is None:
            dados = armazenamento.ler(BUCKET_PRIVADO, objeto)
            tipo = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}.get(objeto.rsplit(".", 1)[-1], "")
    except AtivoInvalido as erro:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao ler a imagem.") from erro
    if not dados or not tipo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagem não encontrada.")
    return AtivoResposta(tipo=tipo, base64=base64.b64encode(dados).decode("ascii"))
