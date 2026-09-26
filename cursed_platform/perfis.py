"""Nomes de exibição: derivados da identidade e lembrados para mostrar pessoas, não ids."""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform.persistence import PerfilUsuarioRegistro


def nome_de_identidade_dev(usuario_id: str) -> str:
    """"jogador-1" → "Jogador 1"."""
    return " ".join(parte.capitalize() for parte in usuario_id.replace("_", "-").split("-") if parte) or usuario_id


def nome_de_usuario_supabase(usuario: Mapping[str, Any]) -> str | None:
    metadados = usuario.get("user_metadata") if isinstance(usuario.get("user_metadata"), Mapping) else {}
    for chave in ("display_name", "full_name", "name", "user_name"):
        valor = metadados.get(chave)
        if isinstance(valor, str) and valor.strip():
            return valor.strip()[:120]
    email = usuario.get("email")
    if isinstance(email, str) and "@" in email:
        return email.split("@", 1)[0][:120]
    return None


def lembrar(session: Session, usuario_id: str, nome: str | None) -> None:
    """Grava o nome quando mudou; falhas aqui nunca impedem a requisição."""
    if not nome:
        return
    perfil = session.get(PerfilUsuarioRegistro, usuario_id)
    if perfil is not None and perfil.nome == nome:
        return
    if perfil is None:
        session.add(PerfilUsuarioRegistro(usuario_id=usuario_id, nome=nome))
    else:
        perfil.nome = nome
    session.commit()


def nomes(session: Session, usuario_ids: Iterable[str | None]) -> dict[str, str]:
    ids = {i for i in usuario_ids if i}
    if not ids:
        return {}
    return dict(session.execute(
        select(PerfilUsuarioRegistro.usuario_id, PerfilUsuarioRegistro.nome)
        .where(PerfilUsuarioRegistro.usuario_id.in_(ids))
    ).all())
