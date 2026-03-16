# utils/equip_codec.py
from typing import Dict, Any
import json, base64, zlib, unicodedata

VALID_TYPES = {"arma", "armadura", "outro"}

def _sanitize_token(raw: str) -> str:
    """
    Normaliza e 'limpa' o token base64 url-safe:
    - Normaliza Unicode (NFKC)
    - Troca hífens tipográficos por '-'
    - Remove espaços/brancos e caracteres de largura zero
    - Mantém apenas [A-Za-z0-9_-]
    """
    if not isinstance(raw, str):
        return ""
    s = unicodedata.normalize("NFKC", raw)
    s = s.replace("–", "-").replace("—", "-").replace("−", "-")
    zero_width = {"\u200b", "\u200c", "\u200d", "\ufeff"}
    s = "".join(ch for ch in s if not ch.isspace() and ch not in zero_width)
    # mantém apenas base64 url-safe
    s = "".join(ch for ch in s if ch.isalnum() or ch in "-_")
    return s

def _b64decode_loose(token: str) -> bytes:
    """
    Decodifica base64 aceitando pequenas variações:
    - Usa urlsafe_b64decode primeiro; se falhar, tenta b64 padrão.
    - Repara padding automaticamente.
    """
    if not token:
        raise ValueError("token vazio")
    # padding mínimo
    pad = (-len(token)) % 4
    padded = token + ("=" * pad)
    # 1) url-safe
    try:
        return base64.urlsafe_b64decode(padded.encode("ascii"))
    except Exception:
        pass
    # 2) padrão
    try:
        return base64.b64decode(padded.encode("ascii"))
    except Exception as e:
        raise ValueError(f"base64 inválido: {e}")

def _decompress_loose(blob: bytes) -> bytes:
    """
    Tenta descomprimir como zlib; se falhar, tenta gzip.
    """
    try:
        return zlib.decompress(blob)
    except Exception:
        # tenta gzip (wbits=16+MAX_WBITS)
        try:
            return zlib.decompress(blob, wbits=16 + zlib.MAX_WBITS)
        except Exception as e:
            raise ValueError(f"compressão inválida: {e}")

def decode_equipment(code: str) -> Dict[str, Any]:
    """
    Decodifica um código EQ1:... em:
      {
        "tipo": "arma" | "armadura" | "outro",
        "item": { ...campos... },
        "efeitos": [
          { "kind":"default","associacao":"...", "nome?":"...", "descricao?":"..." } |
          { "kind":"externo", "nome":"...", "descricao":"...", "imagem_base64":"..." }
        ]
      }
    """
    if not isinstance(code, str) or not code.strip():
        raise ValueError("código vazio")
    code = code.strip()
    if not code.startswith("EQ1:"):
        raise ValueError("formato inválido (prefixo esperado: EQ1:)")

    raw_token = code[4:]
    token = _sanitize_token(raw_token)
    if not token:
        raise ValueError("token base64 ausente após sanitização")

    blob = _b64decode_loose(token)
    raw = _decompress_loose(blob)

    try:
        obj = json.loads(raw.decode("utf-8"))
    except Exception as e:
        raise ValueError(f"JSON inválido: {e}")

    if not isinstance(obj, dict):
        raise ValueError("payload inválido (esperado objeto JSON)")

    tipo = (obj.get("tipo") or "").strip().lower()
    if tipo not in VALID_TYPES:
        raise ValueError("tipo inválido (esperado: arma|armadura|outro)")

    item = obj.get("item", {})
    if not isinstance(item, dict) or not item:
        raise ValueError("item inválido (esperado objeto não-vazio)")

    efeitos = obj.get("efeitos", [])
    if not isinstance(efeitos, list):
        raise ValueError("efeitos inválidos (esperado lista)")
    for ef in efeitos:
        if not isinstance(ef, dict) or "kind" not in ef:
            raise ValueError("efeito malformado (esperado dict com 'kind')")
        if ef["kind"] == "default":
            if not isinstance(ef.get("associacao"), str) or not ef["associacao"].strip():
                raise ValueError("efeito default sem 'associacao'")
        elif ef["kind"] == "externo":
            if not (isinstance(ef.get("nome"), str) and isinstance(ef.get("descricao"), str)):
                raise ValueError("efeito externo precisa de 'nome' e 'descricao'")
        else:
            raise ValueError("kind de efeito desconhecido")

    return {"tipo": tipo, "item": item, "efeitos": efeitos}
