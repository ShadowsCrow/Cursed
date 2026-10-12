"""Caminhos estáveis do projeto, independentes do diretório de execução."""

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
CATALOGS_DIR = DATA_DIR / "catalogs"
RULES_DIR = PROJECT_ROOT.parent / "rules" / "sistema"
ASSETS_DIR = DATA_DIR / "assets"
DEFAULT_EFFECT_ICONS_DIR = ASSETS_DIR / "effects-icons" / "default"
STORAGE_DIR = PROJECT_ROOT / "storage"
LEGACY_SHEETS_DIR = STORAGE_DIR / "legacy-sheets" / "fichas"
