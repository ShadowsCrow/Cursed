"""Entrada ASGI para execução do serviço HTTP."""

from .main import create_app


app = create_app()
