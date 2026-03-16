# utils/efeitos_codec.py
from typing import Dict, Any
import json, base64, zlib

SCHEMA_REQUIRED = ("nome", "descricao")
SCHEMA_OPTIONAL = ("imagem_base64",)

def encode_effect(effect: Dict[str, Any]) -> str:
    """
    Gera um código compacto (E1:...) para compartilhar um efeito externo:
      {
        "nome": "Bênção Menor",
        "descricao": "Descrição do efeito...",
        "imagem_base64": "<PNG/JPG base64> (opcional)"
      }
    """
    if not isinstance(effect, dict):
        raise ValueError("effect deve ser um dict")
    for k in SCHEMA_REQUIRED:
        if not isinstance(effect.get(k), str) or not effect.get(k).strip():
            raise ValueError(f"campo obrigatório ausente/ inválido: {k}")
    # garante chaves conhecidas
    payload = {
        "nome": effect.get("nome", "").strip(),
        "descricao": effect.get("descricao", "").strip(),
    }
    img = effect.get("imagem_base64")
    if isinstance(img, str) and img.strip():
        payload["imagem_base64"] = img.strip()

    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    comp = zlib.compress(raw, 9)
    token = base64.urlsafe_b64encode(comp).decode("ascii").rstrip("=")
    return "E1:" + token

def decode_effect(code: str) -> Dict[str, Any]:
    """
    Decodifica um código E1:... em um dict com {nome, descricao, imagem_base64?}
    Valida campos obrigatórios e retorna dict pronto para salvar em efeitos_externos.json
    """
    if not isinstance(code, str) or not code.strip():
        raise ValueError("código vazio")
    code = code.strip()
    if not code.startswith("E1:"):
        raise ValueError("formato inválido (prefixo esperado: E1:)")
    token = code[3:]
    # padding para base64 url-safe
    pad = (-len(token)) % 4
    try:
        comp = base64.urlsafe_b64decode(token + ("=" * pad))
        raw = zlib.decompress(comp)
        obj = json.loads(raw.decode("utf-8"))
    except Exception as e:
        raise ValueError(f"código inválido: {e}")

    if not isinstance(obj, dict):
        raise ValueError("payload inválido (esperado objeto JSON)")

    for k in SCHEMA_REQUIRED:
        v = obj.get(k)
        if not isinstance(v, str) or not v.strip():
            raise ValueError(f"campo obrigatório ausente/ inválido: {k}")

    out = {
        "nome": obj["nome"].strip(),
        "descricao": obj["descricao"].strip(),
    }
    img = obj.get("imagem_base64")
    if isinstance(img, str) and img.strip():
        out["imagem_base64"] = img.strip()

    return out
