from typing import List, Dict, Any

from core.db import add_effect_library_item, delete_effect_library_item, load_effects_library_items

def load_effects_library() -> List[Dict[str, Any]]:
    return load_effects_library_items()

def add_to_effects_library(effect: Dict[str, Any]) -> None:
    add_effect_library_item(effect)

def delete_from_effects_library(index: int) -> bool:
    return delete_effect_library_item(index)
