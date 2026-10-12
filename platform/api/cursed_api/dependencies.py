"""Dependências de sessão SQL para as rotas da API."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import uuid4

from fastapi import Request
from sqlalchemy.orm import Session


def get_session(request: Request) -> Iterator[Session]:
    with request.app.state.session_factory() as session:
        yield session


def get_correlacao(request: Request) -> str:
    """Identificador que liga o evento de auditoria ao pedido que o originou."""
    informado = request.headers.get("X-Correlation-ID", "").strip()
    return informado[:100] if informado else uuid4().hex
