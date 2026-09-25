"""Dependências de sessão SQL para as rotas da API."""

from __future__ import annotations

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy.orm import Session


def get_session(request: Request) -> Iterator[Session]:
    with request.app.state.session_factory() as session:
        yield session
