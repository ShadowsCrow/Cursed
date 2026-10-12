from __future__ import annotations

from copy import deepcopy
import json
import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping


from core.paths import CATALOGS_DIR


DEFAULT_EFFECTS_PATH = CATALOGS_DIR / "efeitos_default.json"

TIPOS_OPERACAO = {
    "modificador",
    "restricao",
    "falha_automatica",
    "alteracao_recurso",
    "consumir_aplicacao",
}

CAMPOS_EXECUTAVEIS = {
    "callable",
    "codigo",
    "code",
    "comando",
    "command",
    "eval",
    "expressao",
    "expression",
    "funcao",
    "function",
    "python",
    "script",
}


def _texto(valor: Any) -> str:
    return str(valor or "").strip()


def _numero(valor: Any) -> int | float | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        return valor if math.isfinite(valor) else None
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(numero):
        return None
    return int(numero) if numero.is_integer() else numero


def normalizar_modificador(valor: Any) -> Dict[str, Any]:
    """Metadado numÃ©rico opcional; a descriÃ§Ã£o continua sendo a regra."""
    if not isinstance(valor, Mapping):
        raise ValueError("Um modificador precisa ser um objeto.")
    validar_conteudo_declarativo(valor)
    modificador = deepcopy(dict(valor))
    alvo = _texto(modificador.get("alvo"))
    numero = _numero(modificador.get("valor"))
    if not alvo or numero is None:
        raise ValueError("Modificador precisa de alvo e valor numÃ©rico finito.")
    modificador["alvo"] = alvo
    modificador["valor"] = numero
    if "quando" in modificador:
        quando = _texto(modificador["quando"])
        if not quando:
            raise ValueError("O contexto do modificador nÃ£o pode ser vazio.")
        modificador["quando"] = quando
    return modificador


def _chaves_executaveis(valor: Any, caminho: str = "") -> List[str]:
    encontrados: List[str] = []
    if isinstance(valor, Mapping):
        for chave, item in valor.items():
            nome = _texto(chave).casefold()
            atual = f"{caminho}.{chave}" if caminho else str(chave)
            if nome in CAMPOS_EXECUTAVEIS:
                encontrados.append(atual)
            encontrados.extend(_chaves_executaveis(item, atual))
    elif isinstance(valor, list):
        for indice, item in enumerate(valor):
            encontrados.extend(_chaves_executaveis(item, f"{caminho}[{indice}]"))
    return encontrados


def validar_conteudo_declarativo(valor: Any) -> None:
    perigosos = _chaves_executaveis(valor)
    if perigosos:
        raise ValueError(
            "Efeitos estruturados aceitam somente dados declarativos; "
            f"campos executÃ¡veis encontrados: {', '.join(perigosos)}"
        )


def normalizar_operacao(valor: Any, *, estrito: bool = False) -> Dict[str, Any]:
    if not isinstance(valor, Mapping):
        raise ValueError("A operaÃ§Ã£o precisa ser um objeto.")
    operacao = deepcopy(dict(valor))
    tipo = _texto(operacao.get("tipo")).casefold()
    alvo = _texto(operacao.get("alvo"))

    if estrito:
        validar_conteudo_declarativo(operacao)
        if tipo not in TIPOS_OPERACAO:
            raise ValueError(f"Tipo de operaÃ§Ã£o desconhecido: {tipo or '<vazio>'}")
        if not alvo:
            raise ValueError("A operaÃ§Ã£o precisa declarar um alvo.")

    operacao["tipo"] = tipo
    operacao["alvo"] = alvo

    if tipo == "modificador":
        numero = _numero(operacao.get("valor"))
        if estrito and numero is None:
            raise ValueError("Uma operaÃ§Ã£o modificador precisa de valor numÃ©rico.")
        if numero is not None:
            operacao["valor"] = numero
    elif tipo == "restricao":
        modo = _texto(operacao.get("modo")).casefold()
        if estrito and not modo:
            raise ValueError("Uma operaÃ§Ã£o restricao precisa declarar o modo.")
        operacao["modo"] = modo
    elif tipo == "alteracao_recurso":
        recurso = _texto(operacao.get("recurso")).casefold()
        numero = _numero(operacao.get("valor"))
        if estrito and (not recurso or numero is None):
            raise ValueError("alteracao_recurso precisa de recurso e valor numÃ©rico.")
        operacao["recurso"] = recurso
        if numero is not None:
            operacao["valor"] = numero
    elif tipo == "consumir_aplicacao":
        evento = _texto(operacao.get("evento")).casefold()
        if estrito and not evento:
            raise ValueError("consumir_aplicacao precisa declarar o evento.")
        operacao["evento"] = evento

    if "evento" in operacao:
        operacao["evento"] = _texto(operacao.get("evento")).casefold()
    return operacao


def normalizar_efeito(
    valor: Any,
    *,
    estrito: bool = False,
    exigir_associacao: bool = False,
) -> Dict[str, Any]:
    if not isinstance(valor, Mapping):
        raise ValueError("O efeito precisa ser um objeto.")
    efeito = deepcopy(dict(valor))
    associacao = _texto(efeito.get("associacao"))
    nome = _texto(efeito.get("nome"))
    descricao = _texto(efeito.get("descricao"))
    categoria = _texto(efeito.get("categoria")).casefold() or "externo"
    operacoes_brutas = efeito.get("operacoes", [])
    modificadores_brutos = efeito.get("modificadores", [])
    substitui_bruto = efeito.get("substitui", [])

    if not isinstance(operacoes_brutas, list):
        raise ValueError("O campo operacoes precisa ser uma lista.")
    if not isinstance(modificadores_brutos, list):
        raise ValueError("O campo modificadores precisa ser uma lista.")
    if not isinstance(substitui_bruto, list):
        raise ValueError("O campo substitui precisa ser uma lista.")
    if estrito:
        validar_conteudo_declarativo(efeito)
        if exigir_associacao and not associacao:
            raise ValueError("Um efeito default precisa declarar associacao.")
        if not nome or not descricao:
            raise ValueError("Um efeito precisa declarar nome e descricao.")

    operacoes = [normalizar_operacao(item, estrito=estrito) for item in operacoes_brutas]
    modificadores = [normalizar_modificador(item) for item in modificadores_brutos]
    substitui = [_texto(item) for item in substitui_bruto]
    if estrito and any(not item for item in substitui):
        raise ValueError("As associaÃ§Ãµes substituÃ­das precisam ser nomes vÃ¡lidos.")
    versao_padrao = 2 if operacoes else 1
    try:
        versao = int(efeito.get("versao", versao_padrao))
    except (TypeError, ValueError):
        versao = versao_padrao
    if estrito and operacoes and versao != 2:
        raise ValueError("Efeitos estruturados precisam usar versao 2.")

    efeito.update(
        {
            "versao": versao,
            "categoria": categoria,
            "nome": nome,
            "descricao": descricao,
            "operacoes": operacoes,
            "modificadores": modificadores,
            "substitui": substitui,
        }
    )
    if associacao:
        efeito["associacao"] = associacao
    elif exigir_associacao:
        efeito["associacao"] = ""
    return efeito


def validar_catalogo(efeitos: Any) -> List[Dict[str, Any]]:
    if not isinstance(efeitos, list):
        raise ValueError("O catÃ¡logo de efeitos precisa ser uma lista.")
    normalizados: List[Dict[str, Any]] = []
    associacoes: set[str] = set()
    for bruto in efeitos:
        efeito = normalizar_efeito(bruto, estrito=True, exigir_associacao=True)
        associacao = efeito["associacao"]
        if associacao in associacoes:
            raise ValueError(f"AssociaÃ§Ã£o de efeito duplicada: {associacao}")
        associacoes.add(associacao)
        normalizados.append(efeito)
    return normalizados


def carregar_catalogo(path: str | Path = DEFAULT_EFFECTS_PATH) -> List[Dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8") as arquivo:
        return validar_catalogo(json.load(arquivo))


def indexar_catalogo(efeitos: Iterable[Mapping[str, Any]]) -> Dict[str, Dict[str, Any]]:
    indice: Dict[str, Dict[str, Any]] = {}
    for bruto in efeitos:
        efeito = normalizar_efeito(bruto, estrito=True, exigir_associacao=True)
        associacao = efeito["associacao"]
        if associacao in indice:
            raise ValueError(f"AssociaÃ§Ã£o de efeito duplicada: {associacao}")
        indice[associacao] = efeito
    return indice


def resolver_efeitos_ativos(
    associacoes_ativas: Any,
    catalogo: Iterable[Mapping[str, Any]],
    *,
    estrito: bool = False,
) -> Dict[str, Any]:
    """Resolve diretamente os efeitos ligados pela mesa, sem aplicaÃ§Ã£o intermediÃ¡ria."""
    if not isinstance(associacoes_ativas, (list, tuple, set)):
        associacoes_ativas = []
    indice = indexar_catalogo(catalogo)
    efeitos: List[Dict[str, Any]] = []
    avisos: List[str] = []
    vistos: set[str] = set()
    for bruto in associacoes_ativas:
        associacao = _texto(bruto)
        if associacao in vistos:
            continue
        vistos.add(associacao)
        efeito = indice.get(associacao)
        if efeito is None:
            mensagem = f"Efeito default nÃ£o encontrado: {associacao or '<vazio>'}"
            if estrito:
                raise ValueError(mensagem)
            avisos.append(mensagem)
            continue
        efeitos.append(deepcopy(efeito))
    return {"efeitos": efeitos, "avisos": avisos}


def calcular_modificadores(
    efeitos_ativos: Iterable[Mapping[str, Any]],
    *,
    alvo: str,
    contextos: Iterable[str] = (),
) -> Dict[str, Any]:
    """Soma apenas modificadores declarados e pertinentes Ã  rolagem."""
    lista = [normalizar_efeito(item) for item in efeitos_ativos]
    substituidas = {
        associacao
        for efeito in lista
        for associacao in efeito.get("substitui", [])
    }
    contextos_ativos = {_texto(item) for item in contextos}
    aplicados: List[Dict[str, Any]] = []
    for efeito in lista:
        if efeito.get("associacao") in substituidas:
            continue
        for modificador in efeito["modificadores"]:
            if modificador["alvo"] != alvo:
                continue
            quando = modificador.get("quando")
            if quando and quando not in contextos_ativos:
                continue
            aplicados.append(
                {**deepcopy(modificador), "efeito": efeito.get("associacao") or efeito["nome"]}
            )
    return {"total": sum(item["valor"] for item in aplicados), "modificadores": aplicados}
