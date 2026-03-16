# utils/effects_library.py
import json
import os
from typing import List, Dict, Any

LIB_PATH = "data/efeitos_externos_lib.json"

def _ensure_dir(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)

def load_effects_library() -> List[Dict[str, Any]]:
    try:
        with open(LIB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []

def save_effects_library(lista: List[Dict[str, Any]]) -> None:
    _ensure_dir(LIB_PATH)
    with open(LIB_PATH, "w", encoding="utf-8") as f:
        json.dump(lista, f, ensure_ascii=False, indent=2)

def add_to_effects_library(effect: Dict[str, Any]) -> None:
    lista = load_effects_library()
    if effect not in lista:
        lista.append(effect)
    save_effects_library(lista)

def delete_from_effects_library(index: int) -> bool:
    """
    Remove um efeito pelo índice na biblioteca. Retorna True se removeu.
    """
    lista = load_effects_library()
    if 0 <= index < len(lista):
        lista.pop(index)
        save_effects_library(lista)
        return True
    return False
