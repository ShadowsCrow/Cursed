from typing import List, Dict, Any

from core.db import add_equipment_library_item, load_equipment_library


def load_library(tipo: str) -> List[Dict[str, Any]]:
    return load_equipment_library(tipo)


def add_to_library(tipo: str, item: Dict[str, Any]) -> None:
    add_equipment_library_item(tipo, item)
