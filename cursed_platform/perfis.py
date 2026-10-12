"""Perfis: nome da identidade (lembrado a cada acesso), apelido e foto escolhidos pela pessoa.

O nome mostrado é o apelido quando a pessoa já escolheu um; senão, o nome da identidade. O apelido
nunca é sobrescrito pela identidade (navegacao-inicial-e-perfil, design D4).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Iterable, Mapping

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, aliased

from cursed_platform.persistence import MembroRegistro, PerfilUsuarioRegistro

APELIDO_MIN = 2
APELIDO_MAX = 40


class ApelidoInvalido(ValueError):
    """Motivo legível para quem tentou gravar o apelido."""


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
    """Grava o nome da identidade quando mudou; nunca toca no apelido."""
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
    """Nome mostrado de cada pessoa: o apelido, ou o nome da identidade enquanto não há apelido."""
    ids = {i for i in usuario_ids if i}
    if not ids:
        return {}
    return dict(session.execute(
        select(PerfilUsuarioRegistro.usuario_id,
               func.coalesce(PerfilUsuarioRegistro.apelido, PerfilUsuarioRegistro.nome))
        .where(PerfilUsuarioRegistro.usuario_id.in_(ids))
    ).all())


def fotos(session: Session, usuario_ids: Iterable[str | None]) -> dict[str, str]:
    """Objeto da foto de cada pessoa que tem uma."""
    ids = {i for i in usuario_ids if i}
    if not ids:
        return {}
    return dict(session.execute(
        select(PerfilUsuarioRegistro.usuario_id, PerfilUsuarioRegistro.foto_objeto)
        .where(PerfilUsuarioRegistro.usuario_id.in_(ids), PerfilUsuarioRegistro.foto_objeto.is_not(None))
    ).all())


def obter(session: Session, usuario_id: str) -> PerfilUsuarioRegistro:
    """Perfil da pessoa, criado vazio se ainda não existe (identidade sem nome conhecido)."""
    perfil = session.get(PerfilUsuarioRegistro, usuario_id)
    if perfil is None:
        perfil = PerfilUsuarioRegistro(usuario_id=usuario_id, nome=usuario_id[:120])
        session.add(perfil)
        session.flush()
    return perfil


def sugerir_apelido(perfil: PerfilUsuarioRegistro) -> str:
    """Apelido atual, ou o nome da identidade cortado aos limites do apelido."""
    base = (perfil.apelido or perfil.nome or "").strip()[:APELIDO_MAX].strip()
    return base if len(base) >= APELIDO_MIN else ""


def normalizar_apelido(apelido: str) -> str:
    limpo = " ".join(apelido.split())
    if not APELIDO_MIN <= len(limpo) <= APELIDO_MAX:
        raise ApelidoInvalido(f"O apelido precisa ter de {APELIDO_MIN} a {APELIDO_MAX} caracteres.")
    return limpo


def definir_apelido(session: Session, usuario_id: str, apelido: str) -> PerfilUsuarioRegistro:
    perfil = obter(session, usuario_id)
    perfil.apelido = normalizar_apelido(apelido)
    if perfil.perfil_confirmado_em is None:
        perfil.perfil_confirmado_em = datetime.now(UTC)
    return perfil


def prefixo_foto(usuario_id: str) -> str:
    return f"usuarios/{usuario_id}/foto"


def pode_ver_foto(session: Session, leitor_id: str, dono_id: str) -> bool:
    """A própria pessoa, ou quem participa de ao menos uma mesa ativa com ela."""
    if leitor_id == dono_id:
        return True
    leitor, dono = aliased(MembroRegistro), aliased(MembroRegistro)
    return session.execute(
        select(leitor.mesa_id)
        .join(dono, and_(dono.mesa_id == leitor.mesa_id, dono.usuario_id == dono_id, dono.ativo.is_(True)))
        .where(leitor.usuario_id == leitor_id, leitor.ativo.is_(True))
        .limit(1)
    ).first() is not None
