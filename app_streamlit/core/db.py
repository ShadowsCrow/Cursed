import os
import json
import hashlib
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import streamlit as st
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, MetaData, String, Table, create_engine, delete, event, func, insert, select, update
from sqlalchemy.engine import Engine

from core.version import APP_VERSION, CURRENT_SCHEMA_VERSION
from core.paths import CATALOGS_DIR, PROJECT_ROOT


if os.name == "nt" and os.getenv("LOCALAPPDATA"):
    LOCAL_DB_PATH = Path(os.getenv("LOCALAPPDATA")) / "Cursed" / "cursed.db"
else:
    LOCAL_DB_PATH = PROJECT_ROOT / ".local" / "cursed.db"

metadata = MetaData()

app_meta_table = Table(
    "app_meta",
    metadata,
    Column("key", String(100), primary_key=True),
    Column("value", String(255), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

fichas_table = Table(
    "fichas",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("nome", String(255), nullable=False, unique=True),
    Column("personagem", JSON, nullable=False, default=dict),
    Column("personalidade", JSON, nullable=False, default=dict),
    Column("atributos", JSON, nullable=False, default=dict),
    Column("pericias", JSON, nullable=False, default=dict),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

ficha_armas_table = Table(
    "ficha_armas",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("ficha_id", Integer, ForeignKey("fichas.id", ondelete="CASCADE"), nullable=False),
    Column("ordem", Integer, nullable=False, default=0),
    Column("dados", JSON, nullable=False, default=dict),
)

ficha_armaduras_table = Table(
    "ficha_armaduras",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("ficha_id", Integer, ForeignKey("fichas.id", ondelete="CASCADE"), nullable=False),
    Column("ordem", Integer, nullable=False, default=0),
    Column("dados", JSON, nullable=False, default=dict),
)

ficha_outros_table = Table(
    "ficha_outros",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("ficha_id", Integer, ForeignKey("fichas.id", ondelete="CASCADE"), nullable=False),
    Column("ordem", Integer, nullable=False, default=0),
    Column("dados", JSON, nullable=False, default=dict),
)

ficha_efeitos_externos_table = Table(
    "ficha_efeitos_externos",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("ficha_id", Integer, ForeignKey("fichas.id", ondelete="CASCADE"), nullable=False),
    Column("ordem", Integer, nullable=False, default=0),
    Column("dados", JSON, nullable=False, default=dict),
)

equipment_library_table = Table(
    "equipment_library",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("tipo", String(32), nullable=False),
    Column("payload_hash", String(64), nullable=False, unique=True),
    Column("dados", JSON, nullable=False, default=dict),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

effects_library_table = Table(
    "effects_library",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("payload_hash", String(64), nullable=False, unique=True),
    Column("dados", JSON, nullable=False, default=dict),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

LEGACY_EQUIPMENT_LIBRARY_PATHS = {
    "arma": CATALOGS_DIR / "armas_lib.json",
    "armadura": CATALOGS_DIR / "armaduras_lib.json",
    "outro": CATALOGS_DIR / "outros_lib.json",
}

LEGACY_EFFECTS_LIBRARY_PATH = CATALOGS_DIR / "efeitos_externos_lib.json"


def _secret_bool(name: str, default: bool = False) -> bool:
    try:
        value = st.secrets.get(name, default)
    except Exception:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def get_database_url() -> str:
    explicit_url = os.getenv("CURSED_DATABASE_URL", "").strip()
    if explicit_url:
        return explicit_url

    if _secret_bool("USE_EXTERNAL_DATABASE", False):
        try:
            secret_url = str(st.secrets.get("DATABASE_URL", "")).strip()
        except Exception:
            secret_url = ""
        if secret_url:
            return secret_url

    LOCAL_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{LOCAL_DB_PATH.as_posix()}"


def is_sqlite_url(url: str) -> bool:
    return url.startswith("sqlite:///")


@lru_cache(maxsize=4)
def _cached_engine(url: str) -> Engine:
    kwargs: Dict[str, Any] = {"future": True, "pool_pre_ping": True}
    if is_sqlite_url(url):
        kwargs["connect_args"] = {"check_same_thread": False}
    engine = create_engine(url, **kwargs)

    if is_sqlite_url(url):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, _connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def get_engine() -> Engine:
    return _cached_engine(get_database_url())


def _set_meta(conn, key: str, value: str) -> None:
    existing = conn.execute(
        select(app_meta_table.c.key).where(app_meta_table.c.key == key)
    ).scalar_one_or_none()
    payload = {"key": key, "value": value, "updated_at": func.now()}
    if existing is None:
        conn.execute(insert(app_meta_table).values(**payload))
    else:
        conn.execute(
            update(app_meta_table)
            .where(app_meta_table.c.key == key)
            .values(value=value, updated_at=func.now())
        )


def _get_meta(conn, key: str, default: str | None = None) -> str | None:
    value = conn.execute(
        select(app_meta_table.c.value).where(app_meta_table.c.key == key)
    ).scalar_one_or_none()
    return default if value is None else value


def _normalize_json_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    return payload


def _payload_hash(payload: Dict[str, Any], scope: str = "") -> str:
    normalized = _normalize_json_payload(payload)
    raw = json.dumps({"scope": scope, "payload": normalized}, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _read_legacy_json_list(path: Path) -> List[Dict[str, Any]]:
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
    except Exception:
        pass
    return []


def _seed_equipment_library_from_legacy_files(conn) -> None:
    total = conn.execute(select(func.count()).select_from(equipment_library_table)).scalar_one()
    if int(total or 0) > 0:
        return

    for tipo, path in LEGACY_EQUIPMENT_LIBRARY_PATHS.items():
        for item in _read_legacy_json_list(path):
            conn.execute(
                insert(equipment_library_table).values(
                    tipo=tipo,
                    payload_hash=_payload_hash(item, scope=f"equipment:{tipo}"),
                    dados=item,
                )
            )


def _seed_effects_library_from_legacy_file(conn) -> None:
    total = conn.execute(select(func.count()).select_from(effects_library_table)).scalar_one()
    if int(total or 0) > 0:
        return

    for effect in _read_legacy_json_list(LEGACY_EFFECTS_LIBRARY_PATH):
        conn.execute(
            insert(effects_library_table).values(
                payload_hash=_payload_hash(effect, scope="effects"),
                dados=effect,
            )
        )


def _run_migration_0_to_1(conn) -> None:
    # Schema 1 is the base relational model currently used by the app.
    _set_meta(conn, "schema_version", "1")


def _run_migration_1_to_2(conn) -> None:
    _seed_equipment_library_from_legacy_files(conn)
    _seed_effects_library_from_legacy_file(conn)
    _set_meta(conn, "schema_version", "2")


def get_schema_version() -> int:
    engine = get_engine()
    inspector = engine.dialect.has_table
    with engine.connect() as conn:
        if not inspector(conn, "app_meta"):
            return 0
        raw = _get_meta(conn, "schema_version", "0") or "0"
    try:
        return int(raw)
    except Exception:
        return 0


def migrate_database() -> int:
    engine = get_engine()
    with engine.begin() as conn:
        current = _get_meta(conn, "schema_version", "0") if engine.dialect.has_table(conn, "app_meta") else "0"
        try:
            current_version = int(current or "0")
        except Exception:
            current_version = 0

        if current_version < 1 and CURRENT_SCHEMA_VERSION >= 1:
            _run_migration_0_to_1(conn)
            current_version = 1

        if current_version < 2 and CURRENT_SCHEMA_VERSION >= 2:
            _run_migration_1_to_2(conn)
            current_version = 2

        _set_meta(conn, "app_version", APP_VERSION)
        return current_version


def init_database() -> None:
    engine = get_engine()
    metadata.create_all(engine)
    migrate_database()


def get_database_label() -> str:
    url = get_database_url()
    if is_sqlite_url(url):
        return f"SQLite local ({LOCAL_DB_PATH.name})"
    return "Banco externo configurado"


def get_database_info() -> Dict[str, Any]:
    return {
        "app_version": APP_VERSION,
        "schema_version": get_schema_version(),
        "database_url": get_database_url(),
        "database_label": get_database_label(),
        "local_db_path": str(LOCAL_DB_PATH),
    }


def _row_to_dict(row: Dict[str, Any]) -> Dict[str, Any]:
    return row.get("dados") or {}


def carregar_fichas() -> List[Dict[str, Any]]:
    engine = get_engine()

    with engine.connect() as conn:
        fichas_rows = conn.execute(
            select(
                fichas_table.c.id,
                fichas_table.c.nome,
                fichas_table.c.personagem,
                fichas_table.c.personalidade,
                fichas_table.c.atributos,
                fichas_table.c.pericias,
            ).order_by(fichas_table.c.nome)
        ).mappings().all()

        if not fichas_rows:
            return []

        ficha_ids = [row["id"] for row in fichas_rows]

        armas_rows = conn.execute(
            select(
                ficha_armas_table.c.ficha_id,
                ficha_armas_table.c.ordem,
                ficha_armas_table.c.dados,
            )
            .where(ficha_armas_table.c.ficha_id.in_(ficha_ids))
            .order_by(ficha_armas_table.c.ficha_id, ficha_armas_table.c.ordem)
        ).mappings().all()

        armaduras_rows = conn.execute(
            select(
                ficha_armaduras_table.c.ficha_id,
                ficha_armaduras_table.c.ordem,
                ficha_armaduras_table.c.dados,
            )
            .where(ficha_armaduras_table.c.ficha_id.in_(ficha_ids))
            .order_by(ficha_armaduras_table.c.ficha_id, ficha_armaduras_table.c.ordem)
        ).mappings().all()

        outros_rows = conn.execute(
            select(
                ficha_outros_table.c.ficha_id,
                ficha_outros_table.c.ordem,
                ficha_outros_table.c.dados,
            )
            .where(ficha_outros_table.c.ficha_id.in_(ficha_ids))
            .order_by(ficha_outros_table.c.ficha_id, ficha_outros_table.c.ordem)
        ).mappings().all()

        efeitos_rows = conn.execute(
            select(
                ficha_efeitos_externos_table.c.ficha_id,
                ficha_efeitos_externos_table.c.ordem,
                ficha_efeitos_externos_table.c.dados,
            )
            .where(ficha_efeitos_externos_table.c.ficha_id.in_(ficha_ids))
            .order_by(ficha_efeitos_externos_table.c.ficha_id, ficha_efeitos_externos_table.c.ordem)
        ).mappings().all()

    armas_por_ficha: Dict[int, List[Dict[str, Any]]] = {}
    for row in armas_rows:
        armas_por_ficha.setdefault(row["ficha_id"], []).append(_row_to_dict(row))

    armaduras_por_ficha: Dict[int, List[Dict[str, Any]]] = {}
    for row in armaduras_rows:
        armaduras_por_ficha.setdefault(row["ficha_id"], []).append(_row_to_dict(row))

    outros_por_ficha: Dict[int, List[Dict[str, Any]]] = {}
    for row in outros_rows:
        outros_por_ficha.setdefault(row["ficha_id"], []).append(_row_to_dict(row))

    efeitos_por_ficha: Dict[int, List[Dict[str, Any]]] = {}
    for row in efeitos_rows:
        efeitos_por_ficha.setdefault(row["ficha_id"], []).append(_row_to_dict(row))

    fichas: List[Dict[str, Any]] = []
    for row in fichas_rows:
        ficha_id = row["id"]
        dados = {
            "personagem": row["personagem"] or {},
            "personalidade": row["personalidade"] or {},
            "atributos": row["atributos"] or {},
            "pericias": row["pericias"] or {},
            "armas": armas_por_ficha.get(ficha_id, []),
            "armaduras": armaduras_por_ficha.get(ficha_id, []),
            "outros": outros_por_ficha.get(ficha_id, []),
            "efeitos_externos": efeitos_por_ficha.get(ficha_id, []),
        }
        fichas.append({"nome": row["nome"], "arquivo": None, "dados": dados})

    return fichas


def salvar_ficha(
    nome: str,
    personagem: Dict[str, Any],
    personalidade: Dict[str, Any],
    atributos: Dict[str, Any],
    pericias: Dict[str, Any],
    armas: List[Dict[str, Any]],
    armaduras: List[Dict[str, Any]],
    outros: List[Dict[str, Any]],
    efeitos_externos: List[Dict[str, Any]],
) -> str:
    engine = get_engine()

    with engine.begin() as conn:
        ficha_id = conn.execute(
            select(fichas_table.c.id).where(fichas_table.c.nome == nome)
        ).scalar_one_or_none()

        payload = {
            "nome": nome,
            "personagem": personagem,
            "personalidade": personalidade,
            "atributos": atributos,
            "pericias": pericias,
            "updated_at": func.now(),
        }

        if ficha_id is None:
            insert_payload = dict(payload)
            insert_payload.pop("updated_at", None)
            result = conn.execute(insert(fichas_table).values(**insert_payload))
            ficha_id = result.inserted_primary_key[0]
        else:
            conn.execute(
                update(fichas_table)
                .where(fichas_table.c.id == ficha_id)
                .values(**payload)
            )

        conn.execute(delete(ficha_armas_table).where(ficha_armas_table.c.ficha_id == ficha_id))
        conn.execute(delete(ficha_armaduras_table).where(ficha_armaduras_table.c.ficha_id == ficha_id))
        conn.execute(delete(ficha_outros_table).where(ficha_outros_table.c.ficha_id == ficha_id))
        conn.execute(delete(ficha_efeitos_externos_table).where(ficha_efeitos_externos_table.c.ficha_id == ficha_id))

        for ordem, item in enumerate(armas):
            conn.execute(insert(ficha_armas_table).values(ficha_id=ficha_id, ordem=ordem, dados=item))
        for ordem, item in enumerate(armaduras):
            conn.execute(insert(ficha_armaduras_table).values(ficha_id=ficha_id, ordem=ordem, dados=item))
        for ordem, item in enumerate(outros):
            conn.execute(insert(ficha_outros_table).values(ficha_id=ficha_id, ordem=ordem, dados=item))
        for ordem, item in enumerate(efeitos_externos):
            conn.execute(insert(ficha_efeitos_externos_table).values(ficha_id=ficha_id, ordem=ordem, dados=item))

        _set_meta(conn, "app_version", APP_VERSION)

    return nome


def load_equipment_library(tipo: str) -> List[Dict[str, Any]]:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            select(equipment_library_table.c.dados)
            .where(equipment_library_table.c.tipo == tipo)
            .order_by(equipment_library_table.c.id)
        ).mappings().all()
    return [row["dados"] for row in rows if isinstance(row.get("dados"), dict)]


def add_equipment_library_item(tipo: str, item: Dict[str, Any]) -> None:
    payload = _normalize_json_payload(item)
    if not payload:
        return

    item_hash = _payload_hash(payload, scope=f"equipment:{tipo}")
    engine = get_engine()
    with engine.begin() as conn:
        existing = conn.execute(
            select(equipment_library_table.c.id).where(equipment_library_table.c.payload_hash == item_hash)
        ).scalar_one_or_none()
        if existing is None:
            conn.execute(
                insert(equipment_library_table).values(
                    tipo=tipo,
                    payload_hash=item_hash,
                    dados=payload,
                )
            )


def load_effects_library_items() -> List[Dict[str, Any]]:
    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            select(effects_library_table.c.dados)
            .order_by(effects_library_table.c.id)
        ).mappings().all()
    return [row["dados"] for row in rows if isinstance(row.get("dados"), dict)]


def add_effect_library_item(effect: Dict[str, Any]) -> None:
    payload = _normalize_json_payload(effect)
    if not payload:
        return

    item_hash = _payload_hash(payload, scope="effects")
    engine = get_engine()
    with engine.begin() as conn:
        existing = conn.execute(
            select(effects_library_table.c.id).where(effects_library_table.c.payload_hash == item_hash)
        ).scalar_one_or_none()
        if existing is None:
            conn.execute(
                insert(effects_library_table).values(
                    payload_hash=item_hash,
                    dados=payload,
                )
            )


def delete_effect_library_item(index: int) -> bool:
    engine = get_engine()
    with engine.begin() as conn:
        ids = conn.execute(
            select(effects_library_table.c.id).order_by(effects_library_table.c.id)
        ).scalars().all()
        if 0 <= index < len(ids):
            conn.execute(delete(effects_library_table).where(effects_library_table.c.id == ids[index]))
            return True
    return False
