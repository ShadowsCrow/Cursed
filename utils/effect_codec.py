# utils/effect_codec.py
import json
import zlib
import base64
from typing import Dict, Any

def decode_effect(code: str) -> Dict[str, Any]:
    """
    Decodifica um código de efeito externo no formato E1:<b64(zlib(json))>.
    Retorna um dict: { "nome": str, "descricao": str, "imagem_base64"?: str }
    """
    if not isinstance(code, str) or not code.strip():
        raise ValueError("código vazio")
    code = code.strip()
    if not code.startswith("E1:"):
        raise ValueError("formato inválido (prefixo esperado: E1:)")

    token = code[3:]
    pad = (-len(token)) % 4
    try:
        comp = base64.urlsafe_b64decode(token + ("=" * pad))
        raw = zlib.decompress(comp)
        obj = json.loads(raw.decode("utf-8"))
    except Exception as e:
        raise ValueError(f"código inválido: {e}")

    if not isinstance(obj, dict):
        raise ValueError("payload inválido (esperado objeto JSON)")
    if not obj.get("nome") or not obj.get("descricao"):
        raise ValueError("efeito precisa de 'nome' e 'descricao'")
    return obj
