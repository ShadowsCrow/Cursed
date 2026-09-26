"""Validação inicial da identidade Supabase para comandos protegidos."""

from __future__ import annotations

from dataclasses import dataclass
import re

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx


bearer = HTTPBearer(auto_error=False)
IDENTIDADE_DEV = re.compile(r"dev:([a-z0-9][a-z0-9_-]{0,49})")


@dataclass(frozen=True)
class Ator:
    usuario_id: str


def get_actor(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Ator:
    """Confere o token com o serviço de Auth antes de aceitar uma identidade."""
    if credentials is None or credentials.scheme.casefold() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticação necessária.")

    configuracao = request.app.state.settings
    if configuracao.dev_auth and configuracao.environment != "production":
        # Modo de desenvolvimento local: a identidade é declarada pelo token, sem senha.
        identidade = IDENTIDADE_DEV.fullmatch(credentials.credentials)
        if identidade is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de desenvolvimento inválido.")
        return Ator(usuario_id=identidade.group(1))
    if not configuracao.supabase_url or not configuracao.supabase_publishable_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Identidade não configurada.")

    try:
        response = httpx.get(
            f"{configuracao.supabase_url}/auth/v1/user",
            headers={
                "apikey": configuracao.supabase_publishable_key,
                "Authorization": f"Bearer {credentials.credentials}",
            },
            timeout=5.0,
        )
    except httpx.RequestError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Identidade indisponível.") from error
    if response.status_code >= 500:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Identidade indisponível.")
    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")
    try:
        usuario = response.json()
        usuario_id = usuario.get("id") if isinstance(usuario, dict) else None
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resposta de identidade inválida.") from error
    if not isinstance(usuario_id, str) or not usuario_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resposta de identidade inválida.")
    return Ator(usuario_id=usuario_id)
