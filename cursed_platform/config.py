"""Configuração validável da plataforma, sem carregar ou expor segredos."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Mapping


class ConfigurationError(ValueError):
    """Indica configuração ausente ou incompatível com o ambiente selecionado."""


@dataclass(frozen=True)
class PlatformSettings:
    environment: str
    database_url: str
    api_host: str
    api_port: int
    cors_origins: tuple[str, ...]
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_service_role_key: str = ""
    local_objects_dir: str = ""
    # Identidades locais sem Supabase (token `dev:<id>`); proibido em produção.
    dev_auth: bool = False


def _required(values: Mapping[str, str], key: str) -> str:
    value = values.get(key, "").strip()
    if not value:
        raise ConfigurationError(f"Variável obrigatória ausente: {key}")
    return value


def _port(values: Mapping[str, str], key: str, default: str) -> int:
    raw = values.get(key, default).strip()
    try:
        port = int(raw)
    except ValueError as error:
        raise ConfigurationError(f"{key} deve ser uma porta numérica.") from error
    if not 1 <= port <= 65535:
        raise ConfigurationError(f"{key} deve estar entre 1 e 65535.")
    return port


def load_settings(environ: Mapping[str, str] | None = None) -> PlatformSettings:
    values = os.environ if environ is None else environ
    environment = values.get("CURSED_ENV", "development").strip().lower()
    if environment not in {"development", "test", "production"}:
        raise ConfigurationError("CURSED_ENV deve ser development, test ou production.")

    database_url = _required(values, "CURSED_PLATFORM_DATABASE_URL")
    origins = tuple(
        origin.strip()
        for origin in values.get("CURSED_CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    )
    if not origins:
        raise ConfigurationError("CURSED_CORS_ORIGINS deve conter ao menos uma origem.")

    dev_auth = values.get("CURSED_DEV_AUTH", "").strip().lower() in {"1", "true", "sim"}
    if dev_auth and environment == "production":
        raise ConfigurationError("CURSED_DEV_AUTH não pode ser usado com CURSED_ENV=production.")

    return PlatformSettings(
        environment=environment,
        database_url=database_url,
        api_host=values.get("CURSED_API_HOST", "127.0.0.1").strip() or "127.0.0.1",
        api_port=_port(values, "CURSED_API_PORT", "8000"),
        cors_origins=origins,
        supabase_url=values.get("CURSED_SUPABASE_URL", "").strip().rstrip("/"),
        supabase_publishable_key=values.get("CURSED_SUPABASE_PUBLISHABLE_KEY", "").strip(),
        supabase_service_role_key=values.get("CURSED_SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        local_objects_dir=values.get("CURSED_LOCAL_OBJECTS_DIR", "").strip(),
        dev_auth=dev_auth,
    )
