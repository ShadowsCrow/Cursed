import re
from typing import Any, Dict, List

from core.db import salvar_ficha


def _normalizar_nome(nome: str) -> str:
    nome = (nome or "").strip()
    nome = re.sub(r"\s+", " ", nome)
    return nome


def _garantir_lista(valor: Any) -> List[Dict[str, Any]]:
    if isinstance(valor, list):
        return [item if isinstance(item, dict) else {"valor": item} for item in valor]
    return []


def salvar_ficha_json(nome: str, dados: Dict[str, Any]) -> str:
    nome = _normalizar_nome(nome)

    if not nome:
        raise ValueError("Nome da ficha não pode ser vazio.")

    if not isinstance(dados, dict):
        raise ValueError("Os dados da ficha precisam ser um dicionário.")

    personagem = dados.get("personagem") or {}
    personalidade = dados.get("personalidade") or {}
    atributos = dados.get("atributos") or {}
    pericias = dados.get("pericias") or {}

    armas = _garantir_lista(dados.get("armas"))
    armaduras = _garantir_lista(dados.get("armaduras"))
    outros = _garantir_lista(dados.get("outros"))
    efeitos_externos = _garantir_lista(dados.get("efeitos_externos"))

    return salvar_ficha(
        nome=nome,
        personagem=personagem,
        personalidade=personalidade,
        atributos=atributos,
        pericias=pericias,
        armas=armas,
        armaduras=armaduras,
        outros=outros,
        efeitos_externos=efeitos_externos,
    )
