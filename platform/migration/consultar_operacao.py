"""Resume eventos operacionais JSONL exportados dos logs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from cursed_platform.observabilidade import resumir  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Resumir comandos, conflitos, erros e migrações.")
    parser.add_argument("arquivo", type=Path, help="Arquivo JSONL exportado dos logs operacionais.")
    args = parser.parse_args()
    with args.arquivo.open(encoding="utf-8") as entrada:
        print(json.dumps(resumir(entrada), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
