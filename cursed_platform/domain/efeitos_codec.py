from __future__ import annotations

import base64
from copy import deepcopy
import json
import unicodedata
import zlib
from typing import Any, Dict, Mapping

from cursed_platform.domain.efeitos import normalizar_efeito, normalizar_modificador, validar_conteudo_declarativo


MAX_DECOMPRESSED_BYTES = 5 * 1024 * 1024


def _texto(valor: Any) -> str:
    return str(valor or "").strip()


def _sanitize_token(raw: str) -> str:
    texto = unicodedata.normalize("NFKC", raw or "")
    texto = texto.replace("â€“", "-").replace("â€”", "-").replace("âˆ’", "-")
    ignorados = {"\u200b", "\u200c", "\u200d", "\ufeff"}
    return "".join(
        caractere
        for caractere in texto
        if not caractere.isspace() and caractere not in ignorados and (caractere.isalnum() or caractere in "-_")
    )


def _encode_payload(prefixo: str, payload: Mapping[str, Any]) -> str:
    bruto = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    comprimido = zlib.compress(bruto, 9)
    token = base64.urlsafe_b64encode(comprimido).decode("ascii").rstrip("=")
    return f"{prefixo}:{token}"


def _decode_payload(codigo: str, prefixo: str) -> Dict[str, Any]:
    if not isinstance(codigo, str) or not codigo.strip():
        raise ValueError("CÃ³digo vazio.")
    codigo = codigo.strip()
    esperado = f"{prefixo}:"
    if not codigo.startswith(esperado):
        raise ValueError(f"Formato invÃ¡lido (prefixo esperado: {esperado}).")
    token = _sanitize_token(codigo[len(esperado) :])
    if not token:
        raise ValueError("Token base64 ausente.")
    padding = (-len(token)) % 4
    try:
        comprimido = base64.urlsafe_b64decode((token + "=" * padding).encode("ascii"))
        descompressor = zlib.decompressobj()
        bruto = descompressor.decompress(comprimido, MAX_DECOMPRESSED_BYTES + 1)
        if len(bruto) > MAX_DECOMPRESSED_BYTES or descompressor.unconsumed_tail:
            raise ValueError("Payload excede o tamanho permitido.")
        bruto += descompressor.flush()
        payload = json.loads(bruto.decode("utf-8"))
    except ValueError:
        raise
    except Exception as erro:
        raise ValueError(f"CÃ³digo invÃ¡lido: {erro}") from erro
    if not isinstance(payload, dict):
        raise ValueError("Payload invÃ¡lido: era esperado um objeto JSON.")
    return payload


def normalizar_efeito_e1(effect: Any) -> Dict[str, Any]:
    if not isinstance(effect, Mapping):
        raise ValueError("O efeito E1 precisa ser um objeto.")
    nome = _texto(effect.get("nome"))
    descricao = _texto(effect.get("descricao"))
    if not nome or not descricao:
        raise ValueError("O efeito E1 precisa de nome e descriÃ§Ã£o.")
    payload: Dict[str, Any] = {"nome": nome, "descricao": descricao}
    imagem = effect.get("imagem_base64")
    if isinstance(imagem, str) and imagem.strip():
        payload["imagem_base64"] = imagem.strip()
    if "modificadores" in effect:
        brutos = effect["modificadores"]
        if not isinstance(brutos, list):
            raise ValueError("Os modificadores opcionais precisam formar uma lista.")
        payload["modificadores"] = [normalizar_modificador(item) for item in brutos]
    if "substitui" in effect:
        brutos = effect["substitui"]
        if not isinstance(brutos, list) or any(not _texto(item) for item in brutos):
            raise ValueError("As associaÃ§Ãµes substituÃ­das precisam formar uma lista vÃ¡lida.")
        payload["substitui"] = [_texto(item) for item in brutos]
    return payload


def encode_effect_e1(effect: Mapping[str, Any]) -> str:
    return _encode_payload("E1", normalizar_efeito_e1(effect))


def decode_effect_e1(code: str) -> Dict[str, Any]:
    return normalizar_efeito_e1(_decode_payload(code, "E1"))


def normalizar_efeito_e2(effect: Any) -> Dict[str, Any]:
    efeito = normalizar_efeito(effect, estrito=True)
    if efeito["versao"] != 2:
        raise ValueError("O efeito E2 precisa declarar versao 2.")
    if not efeito["operacoes"]:
        raise ValueError("O efeito E2 precisa declarar ao menos uma operaÃ§Ã£o.")
    efeito = deepcopy(efeito)
    efeito["versao"] = 2
    validar_conteudo_declarativo(efeito)
    return efeito


def encode_effect_e2(effect: Mapping[str, Any]) -> str:
    return _encode_payload("E2", normalizar_efeito_e2(effect))


def decode_effect_e2(code: str) -> Dict[str, Any]:
    return normalizar_efeito_e2(_decode_payload(code, "E2"))


def encode_effect(effect: Mapping[str, Any], *, versao: int = 1) -> str:
    if versao == 1:
        return encode_effect_e1(effect)
    if versao == 2:
        return encode_effect_e2(effect)
    raise ValueError(f"VersÃ£o de efeito nÃ£o suportada: {versao}")


def decode_effect(code: str) -> Dict[str, Any]:
    prefixo = _texto(code).split(":", 1)[0]
    if prefixo == "E1":
        return decode_effect_e1(code)
    if prefixo == "E2":
        return decode_effect_e2(code)
    raise ValueError("Formato invÃ¡lido (prefixos aceitos: E1: ou E2:).")


