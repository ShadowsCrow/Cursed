from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import re
import unicodedata
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Tuple
from uuid import uuid4

MAXIMOS = {"exaustao": 15, "estresse": 10}
RECURSOS = tuple(MAXIMOS)
HISTORY_LIMIT = 100

FAIXAS: Dict[str, List[Dict[str, Any]]] = {
    "exaustao": [
        {"min": 0, "max": 5, "id": "estavel", "nome": "Estável", "efeito": "Sem penalidade."},
        {"min": 6, "max": 8, "id": "cansado", "nome": "Cansado", "efeito": "−1 em testes físicos."},
        {"min": 9, "max": 11, "id": "exausto", "nome": "Exausto", "efeito": "−2 em testes físicos e −1 em Defesas."},
        {"min": 12, "max": 14, "id": "no_limite", "nome": "No Limite", "efeito": "−3 em testes físicos, −1 em testes mentais e sociais e −3 m de Movimento."},
        {"min": 15, "max": 15, "id": "colapso_fisico", "nome": "Colapso Físico", "efeito": "Inconsciente e incapaz de realizar ações até receber auxílio ou recuperação aplicável."},
    ],
    "estresse": [
        {"min": 0, "max": 4, "id": "controlado", "nome": "Controlado", "efeito": "Sem penalidade."},
        {"min": 5, "max": 6, "id": "pressionado", "nome": "Pressionado", "efeito": "−1 em testes mentais e sociais."},
        {"min": 7, "max": 8, "id": "abalado", "nome": "Abalado", "efeito": "−2 em testes mentais e sociais e −1 em testes físicos."},
        {"min": 9, "max": 9, "id": "a_beira", "nome": "À Beira", "efeito": "−3 em testes mentais e sociais, −1 em testes físicos e não pode assumir Estresse voluntariamente."},
        {"min": 10, "max": 10, "id": "colapso_mental", "nome": "Colapso Mental", "efeito": "Manifestação de colapso e afastamento da participação efetiva até auxílio ou fim do conflito imediato."},
    ],
}

CATEGORIAS_PERSISTENTES = {"trauma", "ferimento_grave", "sequela", "aflicao", "outro"}
ESTADOS_TRATAMENTO = {"ativo", "mitigado", "em_tratamento", "encerrado"}
TIPOS_ORIGEM = {"sistema", "mestre", "arma", "armadura", "magia", "habilidade", "classe", "outro"}


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _texto(valor: Any) -> str:
    return str(valor or "").strip()


def _normalizar_texto(valor: Any) -> str:
    texto = unicodedata.normalize("NFD", _texto(valor))
    texto = "".join(ch for ch in texto if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", texto).strip().casefold()


def _inteiro(valor: Any, padrao: int = 0) -> int:
    try:
        return int(valor)
    except (TypeError, ValueError):
        return padrao


def _clamp(valor: Any, minimo: int, maximo: int) -> int:
    return max(minimo, min(maximo, _inteiro(valor)))


def novo_id(prefixo: str) -> str:
    return f"{prefixo}-{uuid4().hex}"


def normalizar_desgaste(valor: Any) -> Dict[str, int]:
    dados = valor if isinstance(valor, Mapping) else {}
    return {
        recurso: _clamp(dados.get(recurso, 0), 0, maximo)
        for recurso, maximo in MAXIMOS.items()
    }


def obter_faixa(recurso: str, valor: Any) -> Dict[str, Any]:
    if recurso not in MAXIMOS:
        raise ValueError(f"Recurso de desgaste inválido: {recurso}")
    atual = _clamp(valor, 0, MAXIMOS[recurso])
    for faixa in FAIXAS[recurso]:
        if faixa["min"] <= atual <= faixa["max"]:
            return deepcopy(faixa)
    raise RuntimeError(f"Nenhuma faixa configurada para {recurso}={atual}")


def resumo_trilha(recurso: str, desgaste: Any) -> Dict[str, Any]:
    dados = normalizar_desgaste(desgaste)
    atual = dados[recurso]
    faixa = obter_faixa(recurso, atual)
    faixas = FAIXAS[recurso]
    indice = next(i for i, item in enumerate(faixas) if item["id"] == faixa["id"])
    proxima = deepcopy(faixas[indice + 1]) if indice + 1 < len(faixas) else None
    return {
        "recurso": recurso,
        "atual": atual,
        "maximo": MAXIMOS[recurso],
        "faixa": faixa,
        "proxima_faixa": proxima,
        "pontos_ate_proxima": (proxima["min"] - atual) if proxima else None,
    }


def efeitos_derivados(desgaste: Any) -> List[Dict[str, Any]]:
    dados = normalizar_desgaste(desgaste)
    efeitos: List[Dict[str, Any]] = []
    for recurso in RECURSOS:
        faixa = obter_faixa(recurso, dados[recurso])
        if faixa["min"] == 0:
            continue
        efeitos.append(
            {
                "id": f"derivado:{recurso}:{faixa['id']}",
                "categoria": "desgaste",
                "nome": faixa["nome"],
                "descricao": faixa["efeito"],
                "consequencia": faixa["efeito"],
                "ciclo": "derivado",
                "origem": {"tipo": "sistema", "nome": recurso.capitalize()},
                "recurso": recurso,
                "valor": dados[recurso],
            }
        )
    return efeitos


def normalizar_origem(origem: Any, *, exigir: bool = False) -> Dict[str, str]:
    if isinstance(origem, str):
        dados: Mapping[str, Any] = {"tipo": "outro", "nome": origem}
    elif isinstance(origem, Mapping):
        dados = origem
    else:
        dados = {}

    tipo = _normalizar_texto(dados.get("tipo")) or "outro"
    if tipo not in TIPOS_ORIGEM:
        tipo = "outro"
    nome = _texto(dados.get("nome"))
    identificador = _texto(dados.get("id"))
    if exigir and not nome:
        raise ValueError("A origem precisa de um nome ou descrição curta.")
    saida = {"tipo": tipo, "nome": nome}
    if identificador:
        saida["id"] = identificador
    return saida


def normalizar_tratamento(valor: Any, *, exigir_regra: bool = False) -> Dict[str, Any]:
    dados = deepcopy(dict(valor)) if isinstance(valor, Mapping) else {}
    estado = _normalizar_texto(dados.get("estado")) or "ativo"
    if estado not in ESTADOS_TRATAMENTO:
        estado = "ativo"
    regra = _texto(dados.get("regra"))
    if exigir_regra and not regra:
        raise ValueError("O efeito persistente precisa definir sua regra de tratamento ou encerramento.")
    dados.update(
        {
            "estado": estado,
            "progresso": max(0, _inteiro(dados.get("progresso", 0))),
            "objetivo": max(0, _inteiro(dados.get("objetivo", 0))) or None,
            "regra": regra,
        }
    )
    return dados


def _normalizar_progressao(valor: Any, intensidade_padrao: Any = 1) -> Dict[str, Any]:
    dados = deepcopy(dict(valor)) if isinstance(valor, Mapping) else {}
    intensidade = max(1, _inteiro(dados.get("intensidade", intensidade_padrao), 1))
    estagio = dados.get("estagio")
    estagios = dados.get("estagios", [])
    if not isinstance(estagios, list):
        estagios = []
    gatilhos = dados.get("gatilhos_avanco", [])
    if isinstance(gatilhos, str):
        gatilhos = [gatilhos]
    if not isinstance(gatilhos, list):
        gatilhos = []
    dados.update(
        {
            "intensidade": intensidade,
            "estagio": deepcopy(estagio),
            "indice": max(0, _inteiro(dados.get("indice", 0))),
            "estagios": deepcopy(estagios),
            "gatilhos_avanco": [_texto(item) for item in gatilhos if _texto(item)],
        }
    )
    return dados


def _normalizar_efeitos_vinculados(valor: Any, *, legado: bool = False) -> List[Dict[str, Any]]:
    if not isinstance(valor, list):
        return []
    resultado: List[Dict[str, Any]] = []
    for item in valor:
        dados = {"condicao": item} if legado and isinstance(item, str) else (
            {"associacao": item} if isinstance(item, str) else deepcopy(dict(item)) if isinstance(item, Mapping) else {}
        )
        associacao = _texto(dados.get("associacao"))
        if not associacao and legado:
            condicao = _normalizar_texto(dados.get("condicao", dados.get("condicao_id"))).replace(" ", "_")
            if condicao:
                associacao = f"condicao_{condicao}"
        if associacao:
            dados["associacao"] = associacao
            dados.pop("condicao", None)
            dados.pop("condicao_id", None)
            resultado.append(dados)
    return resultado


def normalizar_efeito_aplicado(valor: Any, *, estrito: bool = False) -> Dict[str, Any]:
    if not isinstance(valor, Mapping):
        raise ValueError("O efeito aplicado precisa ser um objeto.")
    efeito = deepcopy(dict(valor))
    categoria = _normalizar_texto(efeito.get("categoria")) or "outro"
    if categoria not in CATEGORIAS_PERSISTENTES:
        categoria = "outro"
    nome = _texto(efeito.get("nome"))
    descricao = _texto(efeito.get("descricao"))
    manifestacao = _texto(efeito.get("manifestacao"))
    consequencia = _texto(efeito.get("consequencia")) or _texto(efeito.get("efeito_atual")) or manifestacao or descricao
    efeito_atual = _texto(efeito.get("efeito_atual")) or consequencia
    gatilho = _texto(efeito.get("gatilho"))
    if estrito and not nome:
        raise ValueError("O efeito persistente precisa de um nome.")
    if estrito and not descricao:
        raise ValueError("O efeito persistente precisa de uma descrição.")
    if estrito and not consequencia:
        raise ValueError("O efeito persistente precisa declarar sua consequência.")
    if estrito and categoria == "trauma" and not gatilho:
        raise ValueError("Um Trauma precisa declarar seu gatilho.")

    tratamento_bruto = deepcopy(dict(efeito.get("tratamento"))) if isinstance(efeito.get("tratamento"), Mapping) else {}
    if efeito.get("estado") and not tratamento_bruto.get("estado"):
        tratamento_bruto["estado"] = efeito.get("estado")
    tratamento = normalizar_tratamento(tratamento_bruto, exigir_regra=estrito)
    progressao = _normalizar_progressao(efeito.get("progressao"), efeito.get("intensidade", 1))
    historico = normalizar_historico(efeito.get("historico"))
    vinculos_brutos = efeito.get("efeitos_vinculados")
    if vinculos_brutos is None:
        vinculos = _normalizar_efeitos_vinculados(efeito.get("condicoes_vinculadas"), legado=True)
    else:
        vinculos = _normalizar_efeitos_vinculados(vinculos_brutos)

    efeito.update(
        {
            "id": _texto(efeito.get("id")) or novo_id("efeito"),
            "categoria": categoria,
            "nome": nome or "Efeito sem nome",
            "descricao": descricao,
            "origem": normalizar_origem(efeito.get("origem"), exigir=estrito),
            "gatilho": gatilho,
            "manifestacao": manifestacao or consequencia,
            "consequencia": consequencia,
            "efeito_atual": efeito_atual,
            "tratamento": tratamento,
            "estado": tratamento["estado"],
            "progressao": progressao,
            "intensidade": progressao["intensidade"],
            "efeitos_vinculados": vinculos,
            "sintomas_suprimidos": [
                _normalizar_texto(item)
                for item in efeito.get("sintomas_suprimidos", [])
                if _texto(item)
            ] if isinstance(efeito.get("sintomas_suprimidos", []), list) else [],
            "historico": historico,
            "ciclo": "aplicado",
        }
    )
    imagem = efeito.get("imagem_base64", efeito.get("imagem"))
    if isinstance(imagem, str) and imagem.strip():
        efeito["imagem_base64"] = imagem.strip()
    return efeito


def normalizar_efeitos_aplicados(valores: Any) -> List[Dict[str, Any]]:
    if not isinstance(valores, list):
        return []
    efeitos: List[Dict[str, Any]] = []
    ids: set[str] = set()
    for item in valores:
        if not isinstance(item, Mapping):
            continue
        efeito = normalizar_efeito_aplicado(item)
        if efeito["id"] in ids:
            efeito["id"] = novo_id("efeito")
        ids.add(efeito["id"])
        efeitos.append(efeito)
    return efeitos


def efeitos_equivalentes(primeiro: Mapping[str, Any], segundo: Mapping[str, Any]) -> bool:
    if _normalizar_texto(primeiro.get("categoria")) != _normalizar_texto(segundo.get("categoria")):
        return False
    if _normalizar_texto(primeiro.get("nome")) != _normalizar_texto(segundo.get("nome")):
        return False
    origem_a = normalizar_origem(primeiro.get("origem"))
    origem_b = normalizar_origem(segundo.get("origem"))
    chave_a = origem_a.get("id") or _normalizar_texto(origem_a.get("nome"))
    chave_b = origem_b.get("id") or _normalizar_texto(origem_b.get("nome"))
    return bool(chave_a) and chave_a == chave_b


def _registrar_historico_consequencia(
    efeito: Mapping[str, Any],
    acao: str,
    *,
    justificativa: str | None = None,
) -> Dict[str, Any]:
    atualizado = deepcopy(dict(efeito))
    historico = normalizar_historico(atualizado.get("historico"))
    historico.append(
        {
            "id": novo_id("transicao"),
            "acao": _normalizar_texto(acao).replace(" ", "_"),
            "justificativa": _texto(justificativa) or None,
            "criado_em": _agora(),
        }
    )
    atualizado["historico"] = historico[-HISTORY_LIMIT:]
    atualizado["atualizado_em"] = _agora()
    return atualizado


def adicionar_ou_resolver_efeito(
    efeitos: Any,
    efeito: Mapping[str, Any],
    *,
    decisao_equivalente: str = "intensificar",
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], str]:
    lista = normalizar_efeitos_aplicados(efeitos)
    novo = normalizar_efeito_aplicado(efeito, estrito=True)
    decisao = _normalizar_texto(decisao_equivalente).replace(" ", "_")
    if decisao not in {"intensificar", "atualizar", "manter"}:
        raise ValueError("Decisão equivalente inválida; use intensificar, atualizar ou manter.")
    for indice, existente in enumerate(lista):
        if not efeitos_equivalentes(existente, novo):
            continue
        if decisao == "manter":
            mantido = _registrar_historico_consequencia(
                existente, "mantido", justificativa="Nova ocorrência equivalente mantida no registro existente"
            )
            lista[indice] = mantido
            return lista, mantido, "mantido"
        if decisao == "atualizar":
            atualizado = deepcopy(existente)
            identificador = atualizado["id"]
            criado_em = atualizado.get("criado_em")
            atualizado.update(deepcopy(novo))
            atualizado["id"] = identificador
            if criado_em:
                atualizado["criado_em"] = criado_em
            atualizado = normalizar_efeito_aplicado(atualizado, estrito=True)
            atualizado = _registrar_historico_consequencia(
                atualizado, "atualizado", justificativa="Nova ocorrência equivalente atualizou o registro"
            )
            lista[indice] = atualizado
            return lista, atualizado, "atualizado"

        atualizado = deepcopy(existente)
        intensidade = max(1, _inteiro(atualizado.get("intensidade", 1), 1)) + 1
        atualizado["intensidade"] = intensidade
        atualizado.setdefault("progressao", {})["intensidade"] = intensidade
        atualizado["tratamento"]["estado"] = "ativo"
        atualizado["estado"] = "ativo"
        atualizado = _registrar_historico_consequencia(
            atualizado, "intensificado", justificativa="Nova ocorrência equivalente intensificou o registro"
        )
        lista[indice] = atualizado
        return lista, atualizado, "intensificado"
    novo.setdefault("criado_em", _agora())
    novo = _registrar_historico_consequencia(novo, "criado")
    lista.append(novo)
    return lista, novo, "criado"


def adicionar_ou_intensificar_efeito(
    efeitos: Any, efeito: Mapping[str, Any]
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], str]:
    """Compatibilidade: resolve qualquer consequência equivalente por intensificação."""
    return adicionar_ou_resolver_efeito(efeitos, efeito, decisao_equivalente="intensificar")


def normalizar_historico(valor: Any) -> List[Dict[str, Any]]:
    if not isinstance(valor, list):
        return []
    return [deepcopy(item) for item in valor[-HISTORY_LIMIT:] if isinstance(item, Mapping)]


def normalizar_estado_desgaste(estado: Any) -> Dict[str, Any]:
    saida = deepcopy(dict(estado)) if isinstance(estado, Mapping) else {}
    saida["desgaste"] = normalizar_desgaste(saida.get("desgaste"))
    saida["efeitos_aplicados"] = normalizar_efeitos_aplicados(saida.get("efeitos_aplicados"))
    saida["historico_desgaste"] = normalizar_historico(saida.get("historico_desgaste"))
    return saida


def simular_alteracao(desgaste: Any, recurso: str, delta: Any) -> Dict[str, Any]:
    if recurso not in MAXIMOS:
        raise ValueError(f"Recurso de desgaste inválido: {recurso}")
    mudanca = _inteiro(delta)
    if mudanca == 0:
        raise ValueError("A alteração precisa ser diferente de zero.")
    antes = normalizar_desgaste(desgaste)
    bruto = antes[recurso] + mudanca
    depois = deepcopy(antes)
    depois[recurso] = _clamp(bruto, 0, MAXIMOS[recurso])
    faixa_antes = obter_faixa(recurso, antes[recurso])
    faixa_depois = obter_faixa(recurso, depois[recurso])
    derivados_antes = {item["id"] for item in efeitos_derivados(antes)}
    derivados_depois = {item["id"] for item in efeitos_derivados(depois)}
    excedente = max(0, bruto - MAXIMOS[recurso]) if mudanca > 0 else 0
    colapso = mudanca > 0 and antes[recurso] < MAXIMOS[recurso] and depois[recurso] == MAXIMOS[recurso]
    return {
        "recurso": recurso,
        "delta_solicitado": mudanca,
        "delta_aplicado": depois[recurso] - antes[recurso],
        "antes": antes,
        "depois": depois,
        "faixa_antes": faixa_antes,
        "faixa_depois": faixa_depois,
        "mudou_faixa": faixa_antes["id"] != faixa_depois["id"],
        "efeitos_derivados_entrando": sorted(derivados_depois - derivados_antes),
        "efeitos_derivados_saindo": sorted(derivados_antes - derivados_depois),
        "excedente": excedente,
        "colapso_fisico": recurso == "exaustao" and colapso,
        "colapso_mental": recurso == "estresse" and colapso,
        "trauma_requerido": recurso == "estresse" and colapso,
        "consequencia_contextual_requerida": recurso == "exaustao" and excedente > 0,
        "morte_automatica": False,
    }


def simular_esforco(
    desgaste: Any,
    tipo: str,
    pontos: Any,
    *,
    bonus_teste: Any | None = None,
    bonus_movimento: Any = 0,
) -> Dict[str, Any]:
    quantidade = _inteiro(pontos)
    if quantidade < 1 or quantidade > 3:
        raise ValueError("O esforço precisa assumir de 1 a 3 pontos.")
    dados = normalizar_desgaste(desgaste)
    if tipo == "fisico":
        if dados["exaustao"] >= 15:
            raise ValueError("Um personagem em Colapso Físico não pode usar Esforço físico.")
        movimento = _inteiro(bonus_movimento)
        teste = quantidade - movimento if bonus_teste is None else _inteiro(bonus_teste)
        if teste < 0 or movimento < 0 or teste + movimento != quantidade:
            raise ValueError("Distribua cada ponto entre bônus de teste e Movimento.")
        previa = simular_alteracao(dados, "exaustao", quantidade)
        previa.update(
            {
                "tipo_esforco": "fisico",
                "bonus_teste": teste,
                "bonus_movimento": movimento,
                "aplicar_depois_da_acao": True,
            }
        )
        return previa
    if tipo == "mental":
        if dados["estresse"] >= 9:
            raise ValueError("Um personagem À Beira ou em Colapso Mental não pode usar Esforço mental.")
        previa = simular_alteracao(dados, "estresse", quantidade)
        previa.update(
            {
                "tipo_esforco": "mental",
                "bonus_teste": quantidade,
                "bonus_movimento": 0,
                "aplicar_depois_da_acao": True,
            }
        )
        return previa
    raise ValueError("Tipo de esforço inválido; use 'fisico' ou 'mental'.")


def _proxima_ordem(historico: Iterable[Mapping[str, Any]]) -> int:
    ordens = [_inteiro(item.get("ordem"), 0) for item in historico]
    return (max(ordens) if ordens else 0) + 1


def _registrar_evento(estado: MutableMapping[str, Any], evento: Dict[str, Any]) -> Dict[str, Any]:
    historico = normalizar_historico(estado.get("historico_desgaste"))
    evento = deepcopy(evento)
    evento.setdefault("id", novo_id("evento"))
    evento.setdefault("ordem", _proxima_ordem(historico))
    evento.setdefault("criado_em", _agora())
    evento.setdefault("desfeito", False)
    evento.setdefault("desfazer_permitido", True)
    historico.append(evento)
    estado["historico_desgaste"] = historico[-HISTORY_LIMIT:]
    return evento


def aplicar_alteracao(
    estado: Any,
    recurso: str,
    delta: Any,
    origem: Any,
    *,
    justificativa: str | None = None,
    trauma: Mapping[str, Any] | None = None,
    efeito_declarado: Mapping[str, Any] | None = None,
    previa: Mapping[str, Any] | None = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    novo = normalizar_estado_desgaste(estado)
    origem_normalizada = normalizar_origem(origem, exigir=True)
    simulacao = deepcopy(dict(previa)) if isinstance(previa, Mapping) else simular_alteracao(novo["desgaste"], recurso, delta)
    if simulacao.get("recurso") != recurso or simulacao.get("antes") != novo["desgaste"]:
        simulacao = simular_alteracao(novo["desgaste"], recurso, delta)

    if simulacao["trauma_requerido"] and trauma is None:
        raise ValueError("O Colapso Mental precisa criar ou intensificar um Trauma relacionado.")
    if simulacao["consequencia_contextual_requerida"] and efeito_declarado is None:
        raise ValueError("Exaustão excedente precisa de uma consequência física contextual.")

    antes_desgaste = deepcopy(novo["desgaste"])
    antes_efeitos = deepcopy(novo["efeitos_aplicados"])
    novo["desgaste"] = normalizar_desgaste(simulacao["depois"])
    afetados: List[str] = []
    operacoes_efeitos: List[Dict[str, str]] = []

    for efeito_bruto in (efeito_declarado, trauma):
        if efeito_bruto is None:
            continue
        efeito_dados = deepcopy(dict(efeito_bruto))
        if efeito_bruto is trauma:
            efeito_dados["categoria"] = "trauma"
        efeito_dados.setdefault("origem", origem_normalizada)
        novo["efeitos_aplicados"], efeito_final, operacao = adicionar_ou_intensificar_efeito(
            novo["efeitos_aplicados"], efeito_dados
        )
        afetados.append(efeito_final["id"])
        operacoes_efeitos.append({"id": efeito_final["id"], "operacao": operacao})

    evento = _registrar_evento(
        novo,
        {
            "tipo": "alteracao_desgaste",
            "recurso": recurso,
            "origem": origem_normalizada,
            "justificativa": _texto(justificativa) or None,
            "antes": antes_desgaste,
            "depois": deepcopy(novo["desgaste"]),
            "efeitos_afetados": afetados,
            "operacoes_efeitos": operacoes_efeitos,
            "detalhes": {chave: deepcopy(valor) for chave, valor in simulacao.items() if chave not in {"antes", "depois"}},
            "_snapshot_antes": {"desgaste": antes_desgaste, "efeitos_aplicados": antes_efeitos},
        },
    )
    return novo, evento


def encerrar_colapso_mental(
    estado: Any, origem: Any, *, justificativa: str = "Auxílio pertinente ou fim do conflito imediato"
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    normalizado = normalizar_estado_desgaste(estado)
    if normalizado["desgaste"]["estresse"] != 10:
        raise ValueError("O personagem não está em Colapso Mental.")
    return aplicar_alteracao(normalizado, "estresse", -2, origem, justificativa=justificativa)


def administrar_efeito(
    estado: Any,
    acao: str,
    origem: Any,
    justificativa: str,
    *,
    efeito_id: str | None = None,
    efeito: Mapping[str, Any] | None = None,
    alteracoes: Mapping[str, Any] | None = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    justificativa_limpa = _texto(justificativa)
    if not justificativa_limpa:
        raise ValueError("A administração manual de um efeito exige uma justificativa curta.")
    origem_normalizada = normalizar_origem(origem, exigir=True)
    novo = normalizar_estado_desgaste(estado)
    antes_desgaste = deepcopy(novo["desgaste"])
    antes_efeitos = deepcopy(novo["efeitos_aplicados"])
    acao_normalizada = _normalizar_texto(acao).replace(" ", "_")
    afetados: List[str] = []

    if acao_normalizada == "criar":
        if efeito is None:
            raise ValueError("Informe o efeito que será criado.")
        dados = deepcopy(dict(efeito))
        dados.setdefault("origem", origem_normalizada)
        novo["efeitos_aplicados"], efeito_final, _ = adicionar_ou_intensificar_efeito(
            novo["efeitos_aplicados"], dados
        )
        afetados.append(efeito_final["id"])
    else:
        indice = next(
            (i for i, item in enumerate(novo["efeitos_aplicados"]) if item.get("id") == efeito_id),
            None,
        )
        if indice is None:
            raise ValueError("Efeito aplicado não encontrado.")
        atual = deepcopy(novo["efeitos_aplicados"][indice])
        afetados.append(atual["id"])
        if acao_normalizada == "editar":
            atual.update(deepcopy(dict(alteracoes or {})))
            atual["id"] = efeito_id
            atual = normalizar_efeito_aplicado(atual, estrito=True)
            novo["efeitos_aplicados"][indice] = _registrar_historico_consequencia(
                atual, "editado", justificativa=justificativa_limpa
            )
        elif acao_normalizada == "intensificar":
            intensidade = max(1, _inteiro(atual.get("intensidade", 1), 1)) + 1
            atual["intensidade"] = intensidade
            atual.setdefault("progressao", {})["intensidade"] = intensidade
            atual["tratamento"]["estado"] = "ativo"
            atual["estado"] = "ativo"
            novo["efeitos_aplicados"][indice] = _registrar_historico_consequencia(
                atual, "intensificado", justificativa=justificativa_limpa
            )
        elif acao_normalizada == "mitigar":
            atual["tratamento"]["estado"] = "mitigado"
            atual["estado"] = "mitigado"
            novo["efeitos_aplicados"][indice] = _registrar_historico_consequencia(
                atual, "mitigado", justificativa=justificativa_limpa
            )
        elif acao_normalizada in {"iniciar_tratamento", "em_tratamento"}:
            atual["tratamento"]["estado"] = "em_tratamento"
            atual["estado"] = "em_tratamento"
            novo["efeitos_aplicados"][indice] = _registrar_historico_consequencia(
                atual, "em_tratamento", justificativa=justificativa_limpa
            )
        elif acao_normalizada in {"ativar", "reativar"}:
            atual["tratamento"]["estado"] = "ativo"
            atual["estado"] = "ativo"
            novo["efeitos_aplicados"][indice] = _registrar_historico_consequencia(
                atual, "ativo", justificativa=justificativa_limpa
            )
        elif acao_normalizada == "encerrar":
            atual["tratamento"]["estado"] = "encerrado"
            atual["estado"] = "encerrado"
            novo["efeitos_aplicados"][indice] = _registrar_historico_consequencia(
                atual, "encerrado", justificativa=justificativa_limpa
            )
        elif acao_normalizada == "remover":
            novo["efeitos_aplicados"].pop(indice)
        else:
            raise ValueError(f"Ação administrativa inválida: {acao}")

    evento = _registrar_evento(
        novo,
        {
            "tipo": "administracao_efeito",
            "acao": acao_normalizada,
            "origem": origem_normalizada,
            "justificativa": justificativa_limpa,
            "antes": antes_desgaste,
            "depois": deepcopy(novo["desgaste"]),
            "efeitos_afetados": afetados,
            "_snapshot_antes": {"desgaste": antes_desgaste, "efeitos_aplicados": antes_efeitos},
        },
    )
    return novo, evento


def efeitos_vinculados_de_consequencias(efeitos: Any) -> List[Dict[str, Any]]:
    referencias: List[Dict[str, Any]] = []
    for consequencia in normalizar_efeitos_aplicados(efeitos):
        if consequencia["estado"] == "encerrado":
            continue
        estado = consequencia["estado"]
        estagio = consequencia.get("progressao", {}).get("estagio")
        suprimidos = set(consequencia.get("sintomas_suprimidos", []))
        for vinculo in consequencia.get("efeitos_vinculados", []):
            quando_estado = vinculo.get("quando_estado")
            if isinstance(quando_estado, str) and _normalizar_texto(quando_estado).replace(" ", "_") != estado:
                continue
            if isinstance(quando_estado, list) and estado not in {
                _normalizar_texto(item).replace(" ", "_") for item in quando_estado
            }:
                continue
            quando_estagio = vinculo.get("quando_estagio")
            if quando_estagio is not None and quando_estagio != estagio:
                continue
            associacao = _texto(vinculo.get("associacao"))
            sintoma = associacao.removeprefix("condicao_")
            if not associacao or sintoma in suprimidos or associacao in suprimidos:
                continue
            referencias.append(
                {
                    "associacao": associacao,
                    "origem": {
                        "tipo": "consequencia",
                        "id": consequencia["id"],
                        "nome": consequencia["nome"],
                    },
                }
            )
    return referencias


def resolver_exposicao_aflicao(
    efeitos: Any,
    aflicao: Mapping[str, Any],
    *,
    resistiu: bool,
    decisao_equivalente: str = "intensificar",
) -> Tuple[List[Dict[str, Any]], Dict[str, Any] | None, str]:
    dados = deepcopy(dict(aflicao))
    dados["categoria"] = "aflicao"
    normalizada = normalizar_efeito_aplicado(dados, estrito=True)
    if resistiu:
        return normalizar_efeitos_aplicados(efeitos), None, "resistida"
    return adicionar_ou_resolver_efeito(
        efeitos, normalizada, decisao_equivalente=decisao_equivalente
    )


def progredir_aflicao(
    efeitos: Any,
    efeito_id: str,
    *,
    gatilho: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], str]:
    lista = normalizar_efeitos_aplicados(efeitos)
    indice = next((i for i, item in enumerate(lista) if item["id"] == efeito_id), None)
    if indice is None:
        raise ValueError("Aflição não encontrada.")
    atual = deepcopy(lista[indice])
    if atual["categoria"] != "aflicao":
        raise ValueError("Somente uma Aflição pode usar progressão de Aflição.")
    if atual["estado"] == "encerrado":
        raise ValueError("Uma Aflição encerrada não pode progredir.")
    progressao = atual["progressao"]
    gatilhos = {_normalizar_texto(item) for item in progressao.get("gatilhos_avanco", [])}
    gatilho_normalizado = _normalizar_texto(gatilho)
    if gatilhos and gatilho_normalizado not in gatilhos:
        raise ValueError("O gatilho informado não progride esta Aflição.")
    estagios = progressao.get("estagios", [])
    if not estagios:
        return lista, atual, "estavel"
    proximo = min(progressao.get("indice", 0) + 1, len(estagios) - 1)
    if proximo == progressao.get("indice", 0):
        return lista, atual, "limite"
    estagio = deepcopy(estagios[proximo])
    progressao["indice"] = proximo
    progressao["estagio"] = estagio.get("id", estagio.get("nome", proximo)) if isinstance(estagio, Mapping) else proximo
    atual["progressao"] = progressao
    if isinstance(estagio, Mapping):
        if _texto(estagio.get("efeito_atual", estagio.get("efeito"))):
            atual["efeito_atual"] = _texto(estagio.get("efeito_atual", estagio.get("efeito")))
        if isinstance(estagio.get("efeitos_vinculados"), list):
            atual["efeitos_vinculados"] = _normalizar_efeitos_vinculados(estagio["efeitos_vinculados"])
        elif isinstance(estagio.get("condicoes_vinculadas"), list):
            atual["efeitos_vinculados"] = _normalizar_efeitos_vinculados(estagio["condicoes_vinculadas"], legado=True)
    atual = _registrar_historico_consequencia(
        atual, "aflicao_progrediu", justificativa=_texto(gatilho)
    )
    lista[indice] = atual
    return lista, atual, "progrediu"


def suprimir_sintoma_aflicao(
    efeitos: Any,
    efeito_id: str,
    condicao: str,
    *,
    justificativa: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    lista = normalizar_efeitos_aplicados(efeitos)
    indice = next((i for i, item in enumerate(lista) if item["id"] == efeito_id), None)
    if indice is None:
        raise ValueError("Aflição não encontrada.")
    atual = deepcopy(lista[indice])
    if atual["categoria"] != "aflicao":
        raise ValueError("Somente Aflições possuem sintomas suprimíveis.")
    condicao_id = _normalizar_texto(condicao).replace(" ", "_")
    if not condicao_id:
        raise ValueError("Informe a condição que será suprimida.")
    suprimidos = set(atual.get("sintomas_suprimidos", []))
    suprimidos.add(condicao_id)
    atual["sintomas_suprimidos"] = sorted(suprimidos)
    atual = _registrar_historico_consequencia(
        atual, "sintoma_suprimido", justificativa=justificativa
    )
    lista[indice] = atual
    return lista, atual


def restaurar_sintoma_aflicao(
    efeitos: Any,
    efeito_id: str,
    condicao: str,
    *,
    justificativa: str,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    lista = normalizar_efeitos_aplicados(efeitos)
    indice = next((i for i, item in enumerate(lista) if item["id"] == efeito_id), None)
    if indice is None:
        raise ValueError("Aflição não encontrada.")
    atual = deepcopy(lista[indice])
    condicao_id = _normalizar_texto(condicao).replace(" ", "_")
    atual["sintomas_suprimidos"] = [
        item for item in atual.get("sintomas_suprimidos", []) if item != condicao_id
    ]
    atual = _registrar_historico_consequencia(
        atual, "sintoma_restaurado", justificativa=justificativa
    )
    lista[indice] = atual
    return lista, atual


def ultimo_evento_desfazivel(historico: Any) -> Dict[str, Any] | None:
    for evento in reversed(normalizar_historico(historico)):
        if evento.get("desfazer_permitido", True) and not evento.get("desfeito", False):
            return evento
    return None


def desfazer_evento(estado: Any, evento_id: str | None = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    novo = normalizar_estado_desgaste(estado)
    alvo = ultimo_evento_desfazivel(novo["historico_desgaste"])
    if alvo is None:
        raise ValueError("Não existe alteração segura para desfazer.")
    if evento_id and alvo.get("id") != evento_id:
        raise ValueError("Há uma alteração posterior; faça uma correção manual rastreável.")
    snapshot = alvo.get("_snapshot_antes")
    if not isinstance(snapshot, Mapping):
        raise ValueError("O evento não possui dados suficientes para uma reversão segura.")

    antes_reversao = {
        "desgaste": deepcopy(novo["desgaste"]),
        "efeitos_aplicados": deepcopy(novo["efeitos_aplicados"]),
    }
    novo["desgaste"] = normalizar_desgaste(snapshot.get("desgaste"))
    novo["efeitos_aplicados"] = normalizar_efeitos_aplicados(snapshot.get("efeitos_aplicados"))
    for evento in novo["historico_desgaste"]:
        if evento.get("id") == alvo.get("id"):
            evento["desfeito"] = True
            evento["desfazer_permitido"] = False
            break
    evento_desfazer = _registrar_evento(
        novo,
        {
            "tipo": "desfazer",
            "origem": {"tipo": "sistema", "nome": "Correção por desfazer"},
            "justificativa": f"Reversão do evento {alvo.get('id')}",
            "antes": antes_reversao["desgaste"],
            "depois": deepcopy(novo["desgaste"]),
            "efeitos_afetados": deepcopy(alvo.get("efeitos_afetados", [])),
            "evento_revertido": alvo.get("id"),
            "desfazer_permitido": False,
        },
    )
    return novo, evento_desfazer


