# utils/equip_library.py
from typing import List, Dict, Any
import json, os

LIB_PATHS = {
    "arma": "data/armas_lib.json",
    "armadura": "data/armaduras_lib.json",
    "outro": "data/outros_lib.json",
}

def _ensure_dir(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)

def load_library(tipo: str) -> List[Dict[str, Any]]:
    path = LIB_PATHS.get(tipo)
    if not path:
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []

def save_library(tipo: str, lista: List[Dict[str, Any]]) -> None:
    path = LIB_PATHS.get(tipo)
    if not path:
        return
    _ensure_dir(path)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(lista, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def add_to_library(tipo: str, item: Dict[str, Any]) -> None:
    lista = load_library(tipo)
    if item not in lista:
        lista.append(item)
    save_library(tipo, lista)
