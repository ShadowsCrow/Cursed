"""Gera ou confere o contrato OpenAPI versionado a partir da API real."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from cursed_platform.config import PlatformSettings


ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "platform" / "api"
OUTPUT = API_ROOT / "openapi.json"


def render_openapi() -> str:
    sys.path.insert(0, str(API_ROOT))
    from cursed_api.main import create_app

    settings = PlatformSettings(
        environment="test",
        database_url="sqlite://",
        api_host="127.0.0.1",
        api_port=8000,
        cors_origins=("http://localhost:5173",),
    )
    document = create_app(settings).openapi()
    return json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Falha se o contrato versionado estiver desatualizado.")
    args = parser.parse_args()
    rendered = render_openapi()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != rendered:
            print("OpenAPI desatualizado: gere novamente com python -m cursed_platform.export_openapi.", file=sys.stderr)
            return 1
        print("OpenAPI atualizado.")
        return 0
    OUTPUT.write_text(rendered, encoding="utf-8")
    print(f"OpenAPI gerado: {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
