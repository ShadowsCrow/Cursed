from __future__ import annotations

import base64
from copy import deepcopy
import json
import unicodedata
import zlib
from typing import Any, Dict, List, Mapping

from cursed_platform.domain.efeitos import validar_conteudo_declarativo
from cursed_platform.domain.efeitos_codec import normalizar_efeito_e1, normalizar_efeito_e2


VALID_TYPES = {"arma", "armadura", "outro"}
MAX_DECOMPRESSED_BYTES = 10 * 1024 * 1024


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
        raise ValueError("Token base64 ausente apÃ³s sanitizaÃ§Ã£o.")
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


def _normalizar_base(tipo: Any, item: Any) -> tuple[str, Dict[str, Any]]:
    tipo_normalizado = _texto(tipo).casefold()
    if tipo_normalizado not in VALID_TYPES:
        raise ValueError("Tipo invÃ¡lido (use arma, armadura ou outro).")
    if not isinstance(item, Mapping) or not item:
        raise ValueError("Item invÃ¡lido: era esperado um objeto nÃ£o vazio.")
    return tipo_normalizado, deepcopy(dict(item))


def normalizar_equipamento_eq1(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, Mapping):
        raise ValueError("O equipamento EQ1 precisa ser um objeto.")
    tipo, item = _normalizar_base(payload.get("tipo"), payload.get("item"))
    efeitos = payload.get("efeitos", [])
    if not isinstance(efeitos, list):
        raise ValueError("Efeitos invÃ¡lidos: era esperada uma lista.")
    normalizados: List[Dict[str, Any]] = []
    for efeito in efeitos:
        if not isinstance(efeito, Mapping):
            raise ValueError("Efeito EQ1 malformado.")
        dados = deepcopy(dict(efeito))
        kind = _texto(dados.get("kind")).casefold()
        if kind == "default":
            associacao = _texto(dados.get("associacao"))
            if not associacao:
                raise ValueError("Efeito default sem associacao.")
            dados["kind"] = "default"
            dados["associacao"] = associacao
        elif kind == "externo":
            dados.update(normalizar_efeito_e1(dados))
            dados["kind"] = "externo"
        else:
            raise ValueError("kind de efeito desconhecido em EQ1.")
        normalizados.append(dados)
    return {"tipo": tipo, "item": item, "efeitos": normalizados}


def encode_equipment_eq1(tipo: str, item: Mapping[str, Any], efeitos: List[Mapping[str, Any]]) -> str:
    payload = normalizar_equipamento_eq1({"tipo": tipo, "item": item, "efeitos": efeitos})
    return _encode_payload("EQ1", payload)


def decode_equipment_eq1(code: str) -> Dict[str, Any]:
    return normalizar_equipamento_eq1(_decode_payload(code, "EQ1"))


def _normalizar_ativacao(valor: Any) -> Dict[str, Any]:
    if valor is None:
        return {"tipo": "enquanto_equipado"}
    if not isinstance(valor, Mapping):
        raise ValueError("A ativacao de um efeito EQ2 precisa ser um objeto.")
    ativacao = deepcopy(dict(valor))
    validar_conteudo_declarativo(ativacao)
    tipo = _texto(ativacao.get("tipo")).casefold()
    if not tipo:
        raise ValueError("A ativacao precisa declarar um tipo.")
    ativacao["tipo"] = tipo
    return ativacao


def normalizar_equipamento_eq2(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, Mapping):
        raise ValueError("O equipamento EQ2 precisa ser um objeto.")
    validar_conteudo_declarativo(payload)
    try:
        versao = int(payload.get("versao", 2))
    except (TypeError, ValueError):
        versao = 0
    if versao != 2:
        raise ValueError("O equipamento EQ2 precisa declarar versao 2.")
    tipo, item = _normalizar_base(payload.get("tipo"), payload.get("item"))
    efeitos = payload.get("efeitos", [])
    if not isinstance(efeitos, list):
        raise ValueError("Efeitos invÃ¡lidos: era esperada uma lista.")

    normalizados: List[Dict[str, Any]] = []
    for efeito in efeitos:
        if not isinstance(efeito, Mapping):
            raise ValueError("Efeito EQ2 malformado.")
        dados = deepcopy(dict(efeito))
        kind = _texto(dados.get("kind")).casefold()
        ativacao = _normalizar_ativacao(dados.get("ativacao"))
        origem = deepcopy(dados.get("origem")) if isinstance(dados.get("origem"), Mapping) else None

        if kind == "default":
            associacao = _texto(dados.get("associacao"))
            if not associacao:
                raise ValueError("Efeito default EQ2 sem associacao.")
            normalizado: Dict[str, Any] = {
                "kind": "default",
                "associacao": associacao,
                "ativacao": ativacao,
            }
        elif kind == "externo":
            efeito_bruto = dados.get("efeito", dados)
            normalizado = {
                "kind": "externo",
                "efeito": normalizar_efeito_e2(efeito_bruto),
                "ativacao": ativacao,
            }
        else:
            raise ValueError("kind de efeito desconhecido em EQ2.")
        if origem is not None:
            normalizado["origem"] = origem
        normalizados.append(normalizado)

    return {"versao": 2, "tipo": tipo, "item": item, "efeitos": normalizados}


def encode_equipment_eq2(tipo: str, item: Mapping[str, Any], efeitos: List[Mapping[str, Any]]) -> str:
    payload = normalizar_equipamento_eq2(
        {"versao": 2, "tipo": tipo, "item": item, "efeitos": efeitos}
    )
    return _encode_payload("EQ2", payload)


def decode_equipment_eq2(code: str) -> Dict[str, Any]:
    return normalizar_equipamento_eq2(_decode_payload(code, "EQ2"))


def encode_equipment(
    tipo: str,
    item: Mapping[str, Any],
    efeitos: List[Mapping[str, Any]],
    *,
    versao: int = 1,
) -> str:
    if versao == 1:
        return encode_equipment_eq1(tipo, item, efeitos)
    if versao == 2:
        return encode_equipment_eq2(tipo, item, efeitos)
    raise ValueError(f"VersÃ£o de equipamento nÃ£o suportada: {versao}")


def decode_equipment(code: str) -> Dict[str, Any]:
    prefixo = _texto(code).split(":", 1)[0]
    if prefixo == "EQ1":
        return decode_equipment_eq1(code)
    if prefixo == "EQ2":
        return decode_equipment_eq2(code)
    raise ValueError("Formato invÃ¡lido (prefixos aceitos: EQ1: ou EQ2:).")


