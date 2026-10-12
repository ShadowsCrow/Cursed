"""Tópicos realtime privados que o participante pode assinar."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform.acesso_privado import (
    AutorizadorRecursos, topico_mesa, topico_narrador, topico_personagem,
)
from cursed_platform.contracts import CanalPrivado
from cursed_platform.repositories import FichaRepository

from .auth import Ator, get_actor
from .dependencies import get_session


router = APIRouter(tags=["Canais privados"])


@router.get("/mesas/{mesa_id}/canais", response_model=list[CanalPrivado])
def listar_canais(
    mesa_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[CanalPrivado]:
    recursos = AutorizadorRecursos(session)
    pode = lambda topico: recursos.decidir_topico(ator.usuario_id, topico).permitido  # noqa: E731
    if not pode(topico_mesa(mesa_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mesa não encontrada.")
    canais = [CanalPrivado(topico=topico_mesa(mesa_id), escopo="mesa")]
    if pode(topico_narrador(mesa_id)):
        canais.append(CanalPrivado(topico=topico_narrador(mesa_id), escopo="narrador"))
    for personagem in sorted(FichaRepository(session).listar(mesa_id), key=lambda p: p.id):
        topico = topico_personagem(mesa_id, personagem.id)
        if pode(topico):
            canais.append(CanalPrivado(topico=topico, escopo="personagem", personagem_id=personagem.id))
    return canais
