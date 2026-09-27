"""Ponto de entrada HTTP da nova plataforma Cursed."""

from __future__ import annotations

from contextlib import asynccontextmanager
from time import perf_counter
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import sessionmaker

from cursed_platform.config import PlatformSettings, load_settings
from cursed_platform.observabilidade import registrar
from cursed_platform.migracao_ativos import ArmazenamentoLocal, ArmazenamentoObjetos, ArmazenamentoSupabase

from .sheets import router as sheets_router
from .tables import router as tables_router
from .characters import router as characters_router
from .channels import router as channels_router
from .live_sheet import router as live_sheet_router
from .audit import router as audit_router
from .narrator import router as narrator_router
from .rest import router as rest_router
from .cards import router as cards_router
from .card_lifecycle import router as card_lifecycle_router
from .room import router as room_router
from .stashes import router as stashes_router
from .assets import router as assets_router
from .catalogs import router as catalogs_router
from .images import router as images_router
from .sincronizacao import SincronizadorCatalogo


class HealthResponse(BaseModel):
    status: str


def create_app(settings: PlatformSettings | None = None, *, engine: Engine | None = None,
               armazenamento: ArmazenamentoObjetos | None = None) -> FastAPI:
    configuracao = settings or load_settings()
    @asynccontextmanager
    async def ciclo_de_vida(app: FastAPI):
        # Em testes, a sincronização é chamada diretamente; fora deles, o JSON do catálogo é
        # conferido ao subir (sem versão válida o servidor não sobe) e acompanhado depois.
        sincronizador = None
        if configuracao.environment != "test":
            sincronizador = SincronizadorCatalogo(app.state.session_factory)
            sincronizador.iniciar()
        app.state.sincronizador_catalogo = sincronizador
        yield
        if sincronizador is not None:
            sincronizador.parar()

    api = FastAPI(
        lifespan=ciclo_de_vida,
        title="Cursed — Plataforma Colaborativa",
        version="0.1.0",
        description="API autoritativa da plataforma colaborativa Cursed.",
    )
    api.add_middleware(
        CORSMiddleware,
        allow_origins=list(configuracao.cors_origins),
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
    )
    api.state.settings = configuracao
    api.state.armazenamento_objetos = (armazenamento or
        (ArmazenamentoLocal(Path(configuracao.local_objects_dir)) if configuracao.local_objects_dir else None) or
        (ArmazenamentoSupabase(configuracao.supabase_url, configuracao.supabase_service_role_key)
         if configuracao.supabase_url and configuracao.supabase_service_role_key else None))
    api.state.session_factory = sessionmaker(
        bind=engine or create_engine(configuracao.database_url), expire_on_commit=False
    )

    @api.middleware("http")
    async def medir_comandos(request: Request, call_next):
        inicio = perf_counter()
        status = 500
        erro = None
        try:
            resposta = await call_next(request)
            status = resposta.status_code
            return resposta
        except Exception as excecao:
            erro = type(excecao).__name__
            raise
        finally:
            if configuracao.environment != "test" and (
                request.method in {"POST", "PUT", "PATCH", "DELETE"} or status >= 500
            ):
                rota = getattr(request.scope.get("route"), "path", "desconhecida")
                evento = "erro" if status >= 500 else "conflito" if status == 409 else "comando"
                registrar(evento, metodo=request.method, rota=rota, status=status,
                          duracao_ms=round((perf_counter() - inicio) * 1000, 2),
                          **({"classe_erro": erro} if erro else {}))
    api.include_router(sheets_router)
    api.include_router(tables_router)
    api.include_router(characters_router)
    api.include_router(channels_router)
    api.include_router(live_sheet_router)
    api.include_router(audit_router)
    api.include_router(narrator_router)
    api.include_router(rest_router)
    api.include_router(cards_router)
    api.include_router(card_lifecycle_router)
    api.include_router(room_router)
    api.include_router(stashes_router)
    api.include_router(assets_router)
    api.include_router(catalogs_router)
    api.include_router(images_router)

    @api.get("/health", response_model=HealthResponse, tags=["Operação"])
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    return api
