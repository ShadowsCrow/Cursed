"""Ponto de entrada HTTP da nova plataforma Cursed."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import sessionmaker

from cursed_platform.config import PlatformSettings, load_settings

from .sheets import router as sheets_router
from .tables import router as tables_router
from .characters import router as characters_router
from .channels import router as channels_router


class HealthResponse(BaseModel):
    status: str


def create_app(settings: PlatformSettings | None = None, *, engine: Engine | None = None) -> FastAPI:
    configuracao = settings or load_settings()
    api = FastAPI(
        title="Cursed — Plataforma Colaborativa",
        version="0.1.0",
        description="API autoritativa da plataforma colaborativa Cursed.",
    )
    api.add_middleware(
        CORSMiddleware,
        allow_origins=list(configuracao.cors_origins),
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    api.state.settings = configuracao
    api.state.session_factory = sessionmaker(
        bind=engine or create_engine(configuracao.database_url), expire_on_commit=False
    )
    api.include_router(sheets_router)
    api.include_router(tables_router)
    api.include_router(characters_router)
    api.include_router(channels_router)

    @api.get("/health", response_model=HealthResponse, tags=["Operação"])
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    return api
