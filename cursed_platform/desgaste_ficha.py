"""Exaustão, Estresse e consequências persistentes gravados na ficha da plataforma.

A ficha guarda `desgaste = {exaustao, estresse}` e `consequencias` (Traumas, Ferimentos
Graves, Sequelas, Aflições e Outras Consequências no formato normalizado pelo domínio).
Ficha sem essas chaves vale 0 e lista vazia. Não há histórico próprio: cada comando
gera um evento de auditoria, e a correção de eventos desfaz o comando com segurança.

As funções recebem e devolvem o payload da ficha, sem sessão nem interface.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Mapping

from cursed_platform.domain import desgaste as dominio
from cursed_platform.domain.desgaste import MAXIMOS

CHAVE_DESGASTE = "desgaste"
CHAVE_CONSEQUENCIAS = "consequencias"
CATEGORIAS_EXCEDENTE_FISICO = ("ferimento_grave", "sequela", "aflicao", "outro")
ACOES_CONSEQUENCIA = ("intensificar", "mitigar", "iniciar_tratamento", "reativar", "encerrar", "remover")
ESTRESSE_APOS_COLAPSO = 8

# Parte calculável das faixas: só o que a ficha soma em um valor derivado. Penalidades
# em testes e em Movimento continuam no texto da faixa, pois a ficha não calcula testes.
MODIFICADORES_DE_FAIXA: dict[str, tuple[tuple[str, int], ...]] = {
    "exausto": (("defesa:esquiva", -1), ("defesa:armadura", -1)),
}


class ComandoInvalido(ValueError):
    """O comando não respeita as regras de Exaustão, Estresse ou consequências."""


def _texto(valor: Any) -> str:
    return str(valor or "").strip()


def trilhas(ficha: Mapping[str, Any] | None) -> dict[str, int]:
    return dominio.normalizar_desgaste((ficha or {}).get(CHAVE_DESGASTE))


def consequencias(ficha: Mapping[str, Any] | None) -> list[dict[str, Any]]:
    return dominio.normalizar_efeitos_aplicados((ficha or {}).get(CHAVE_CONSEQUENCIAS))


def modificadores_de_faixa(ficha: Mapping[str, Any] | None) -> list[tuple[str, str, str, int]]:
    """(id do efeito derivado, nome da faixa, alvo, valor) de cada penalidade calculável ativa."""
    resultado = []
    for recurso, valor in trilhas(ficha).items():
        faixa = dominio.obter_faixa(recurso, valor)
        for alvo, modificador in MODIFICADORES_DE_FAIXA.get(faixa["id"], ()):
            resultado.append((f"derivado:{recurso}:{faixa['id']}", faixa["nome"], alvo, modificador))
    return resultado


# -------------------------------------------------------------------- prévia

def previa_alteracao(ficha: Mapping[str, Any] | None, trilha: str, delta: int) -> dict[str, Any]:
    """O que acontece se a trilha mudar `delta` pontos. Nada é gravado."""
    try:
        simulacao = dominio.simular_alteracao(trilhas(ficha), trilha, delta)
    except ValueError as erro:
        raise ComandoInvalido(str(erro)) from None
    antes = simulacao["antes"][trilha]
    depois = simulacao["depois"][trilha]
    return {
        "trilha": trilha,
        "antes": antes,
        "depois": depois,
        "maximo": MAXIMOS[trilha],
        "delta_solicitado": simulacao["delta_solicitado"],
        "delta_aplicado": simulacao["delta_aplicado"],
        "faixa_antes": simulacao["faixa_antes"],
        "faixa_depois": simulacao["faixa_depois"],
        "mudou_faixa": simulacao["mudou_faixa"],
        "colapso_fisico": simulacao["colapso_fisico"],
        "colapso_mental": simulacao["colapso_mental"],
        # A regra de excedente vale para quem já estava em 15 antes do evento.
        "excedente_fisico": trilha == "exaustao" and delta > 0 and antes == MAXIMOS["exaustao"],
    }


def previa_esforco(
    ficha: Mapping[str, Any] | None, tipo: str, pontos: int, bonus_movimento: int = 0,
) -> dict[str, Any]:
    try:
        simulacao = dominio.simular_esforco(trilhas(ficha), tipo, pontos, bonus_movimento=bonus_movimento)
    except ValueError as erro:
        raise ComandoInvalido(str(erro)) from None
    previa = previa_alteracao(ficha, simulacao["recurso"], pontos)
    previa.update({"tipo_esforco": tipo, "bonus_teste": simulacao["bonus_teste"],
                   "bonus_movimento": simulacao["bonus_movimento"]})
    return previa


# ------------------------------------------------------------------ comandos

def _origem(origem: Mapping[str, Any] | str) -> dict[str, str]:
    try:
        return dominio.normalizar_origem(origem, exigir=True)
    except ValueError as erro:
        raise ComandoInvalido(str(erro)) from None


def _estado(ficha: Mapping[str, Any]) -> dict[str, Any]:
    return {"desgaste": trilhas(ficha), "efeitos_aplicados": consequencias(ficha)}


def _gravar(ficha: Mapping[str, Any], estado: Mapping[str, Any]) -> dict[str, Any]:
    nova = deepcopy(dict(ficha))
    # Chaves ausentes só são criadas quando o comando as altera, para o evento mostrar só o que mudou.
    if CHAVE_DESGASTE in nova or estado["desgaste"] != trilhas(ficha):
        nova[CHAVE_DESGASTE] = dict(estado["desgaste"])
    lista = list(estado["efeitos_aplicados"])
    if lista or CHAVE_CONSEQUENCIAS in nova:
        nova[CHAVE_CONSEQUENCIAS] = lista
    return nova


def _adicionar(
    lista: list[dict[str, Any]], dados: Mapping[str, Any], origem: Mapping[str, Any], justificativa: str,
) -> tuple[list[dict[str, Any]], dict[str, Any], str]:
    efeito = deepcopy(dict(dados))
    if not dominio.normalizar_origem(efeito.get("origem"))["nome"]:
        efeito["origem"] = dict(origem)
    try:
        lista, final, operacao = dominio.adicionar_ou_intensificar_efeito(lista, efeito)
    except ValueError as erro:
        raise ComandoInvalido(str(erro)) from None
    indice = next(i for i, item in enumerate(lista) if item["id"] == final["id"])
    lista[indice]["historico"][-1]["justificativa"] = justificativa
    return lista, lista[indice], operacao


def _intensificar(lista: list[dict[str, Any]], efeito_id: str, justificativa: str) -> tuple[list, dict]:
    estado = {"desgaste": {}, "efeitos_aplicados": lista}
    try:
        novo, _ = dominio.administrar_efeito(
            estado, "intensificar", {"tipo": "sistema", "nome": "Colapso Mental"}, justificativa, efeito_id=efeito_id,
        )
    except ValueError as erro:
        raise ComandoInvalido(str(erro)) from None
    atualizada = novo["efeitos_aplicados"]
    return atualizada, next(item for item in atualizada if item["id"] == efeito_id)


def _resolver_colapso_mental(
    lista: list[dict[str, Any]], colapso: Mapping[str, Any], origem: Mapping[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any], str]:
    manifestacao = _texto(colapso.get("manifestacao"))
    if not manifestacao:
        raise ComandoInvalido("Descreva a manifestação do Colapso Mental.")
    justificativa = f"Colapso Mental ({origem['nome']}): {manifestacao}"
    trauma_id = _texto(colapso.get("trauma_id"))
    trauma = colapso.get("trauma")
    if bool(trauma_id) == bool(trauma):
        raise ComandoInvalido("Escolha um Trauma existente para intensificar ou descreva um Trauma novo.")
    if trauma_id:
        existente = next((item for item in lista if item["id"] == trauma_id), None)
        if existente is None or existente["categoria"] != "trauma":
            raise ComandoInvalido("Trauma não encontrado nesta ficha.")
        lista, final = _intensificar(lista, trauma_id, justificativa)
        return lista, final, "intensificado"
    dados = {**dict(trauma), "categoria": "trauma"}
    return _adicionar(lista, dados, origem, justificativa)


def aplicar_alteracao(
    ficha: Mapping[str, Any],
    trilha: str,
    delta: int,
    origem: Mapping[str, Any] | str,
    *,
    colapso_mental: Mapping[str, Any] | None = None,
    consequencia_excedente: Mapping[str, Any] | None = None,
) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, str]]]:
    """Aplica a alteração e o que ela exige. Devolve (ficha nova, prévia, consequências afetadas)."""
    origem_normalizada = _origem(origem)
    previa = previa_alteracao(ficha, trilha, delta)
    estado = _estado(ficha)
    afetadas: list[dict[str, str]] = []

    if previa["colapso_mental"]:
        if colapso_mental is None:
            raise ComandoInvalido("O Colapso Mental precisa de uma manifestação e de um Trauma novo ou intensificado.")
        estado["efeitos_aplicados"], final, operacao = _resolver_colapso_mental(
            estado["efeitos_aplicados"], colapso_mental, origem_normalizada,
        )
        afetadas.append({"id": final["id"], "nome": final["nome"], "operacao": operacao})
    elif colapso_mental is not None:
        raise ComandoInvalido("Esta alteração não leva o Estresse a 10; não há Colapso Mental a registrar.")

    if consequencia_excedente is not None:
        if not previa["excedente_fisico"]:
            raise ComandoInvalido("Só há excedente quando a Exaustão já está em 15 e o evento acrescentaria mais.")
        if _texto(consequencia_excedente.get("categoria")) not in CATEGORIAS_EXCEDENTE_FISICO:
            raise ComandoInvalido("A consequência do excedente é física: Ferimento Grave, Sequela, Aflição ou Outra.")
        estado["efeitos_aplicados"], final, operacao = _adicionar(
            estado["efeitos_aplicados"], consequencia_excedente, origem_normalizada,
            f"Excedente de Exaustão ({origem_normalizada['nome']})",
        )
        afetadas.append({"id": final["id"], "nome": final["nome"], "operacao": operacao})

    if previa["delta_aplicado"] == 0 and not afetadas:
        raise ComandoInvalido(
            "A trilha já está no limite; registre a consequência física do excedente ou cancele."
            if previa["excedente_fisico"] else "Nada muda: a trilha já está no limite desta alteração."
        )
    estado["desgaste"][trilha] = previa["depois"]
    return _gravar(ficha, estado), previa, afetadas


def aplicar_esforco(
    ficha: Mapping[str, Any],
    tipo: str,
    pontos: int,
    acao: str,
    *,
    bonus_movimento: int = 0,
    colapso_mental: Mapping[str, Any] | None = None,
) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, str]]]:
    """Registra o custo do esforço depois de resolvida a ação declarada."""
    descricao = _texto(acao)
    if not descricao:
        raise ComandoInvalido("Informe a ação em que o esforço foi usado.")
    previa = previa_esforco(ficha, tipo, pontos, bonus_movimento)
    rotulo = "Esforço físico" if tipo == "fisico" else "Esforço mental"
    nova, _, afetadas = aplicar_alteracao(
        ficha, previa["trilha"], pontos, {"tipo": "sistema", "nome": f"{rotulo}: {descricao}"},
        colapso_mental=colapso_mental,
    )
    return nova, previa, afetadas


def encerrar_colapso_mental(ficha: Mapping[str, Any]) -> dict[str, Any]:
    """Auxílio pertinente ou fim do conflito imediato: Estresse volta a 8; o Trauma permanece."""
    estado = _estado(ficha)
    if estado["desgaste"]["estresse"] != MAXIMOS["estresse"]:
        raise ComandoInvalido("O personagem não está em Colapso Mental.")
    estado["desgaste"]["estresse"] = ESTRESSE_APOS_COLAPSO
    return _gravar(ficha, estado)


def criar_consequencia(
    ficha: Mapping[str, Any], dados: Mapping[str, Any], justificativa: str,
) -> tuple[dict[str, Any], dict[str, Any], str]:
    """Cria a consequência ou, se houver uma equivalente, a intensifica."""
    motivo = _texto(justificativa)
    if not motivo:
        raise ComandoInvalido("Informe uma justificativa curta.")
    estado = _estado(ficha)
    estado["efeitos_aplicados"], final, operacao = _adicionar(
        estado["efeitos_aplicados"], dados, {"tipo": "mestre", "nome": "Narrador"}, motivo,
    )
    return _gravar(ficha, estado), final, operacao


def _administrar(
    ficha: Mapping[str, Any], consequencia_id: str, acao: str, justificativa: str,
    alteracoes: Mapping[str, Any] | None = None,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    motivo = _texto(justificativa)
    if not motivo:
        raise ComandoInvalido("Informe uma justificativa curta.")
    estado = _estado(ficha)
    anterior = next((item for item in estado["efeitos_aplicados"] if item["id"] == consequencia_id), None)
    if anterior is None:
        raise LookupError("Consequência não encontrada.")
    try:
        novo, _ = dominio.administrar_efeito(
            estado, acao, {"tipo": "mestre", "nome": "Narrador"}, motivo,
            efeito_id=consequencia_id, alteracoes=alteracoes,
        )
    except ValueError as erro:
        raise ComandoInvalido(str(erro)) from None
    estado["efeitos_aplicados"] = novo["efeitos_aplicados"]
    final = next((item for item in estado["efeitos_aplicados"] if item["id"] == consequencia_id), None)
    return _gravar(ficha, estado), final


def editar_consequencia(
    ficha: Mapping[str, Any], consequencia_id: str, campos: Mapping[str, Any], justificativa: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    atual = next((item for item in consequencias(ficha) if item["id"] == consequencia_id), None)
    if atual is None:
        raise LookupError("Consequência não encontrada.")
    alteracoes: dict[str, Any] = {}
    for chave in ("nome", "descricao", "gatilho", "manifestacao"):
        if chave in campos:
            alteracoes[chave] = _texto(campos[chave])
    if "efeito" in campos:
        alteracoes["consequencia"] = alteracoes["efeito_atual"] = _texto(campos["efeito"])
    if "origem" in campos:
        alteracoes["origem"] = campos["origem"]
    if any(chave in campos for chave in ("tratamento_regra", "progresso", "objetivo")):
        tratamento = dict(atual["tratamento"])
        if "tratamento_regra" in campos:
            tratamento["regra"] = _texto(campos["tratamento_regra"])
        if "progresso" in campos:
            tratamento["progresso"] = campos["progresso"]
        if "objetivo" in campos:
            tratamento["objetivo"] = campos["objetivo"]
        alteracoes["tratamento"] = tratamento
    if not alteracoes:
        raise ComandoInvalido("Nenhum campo para editar.")
    nova, final = _administrar(ficha, consequencia_id, "editar", justificativa, alteracoes)
    assert final is not None
    return nova, final


def transicionar_consequencia(
    ficha: Mapping[str, Any], consequencia_id: str, acao: str, justificativa: str,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    if acao not in ACOES_CONSEQUENCIA:
        raise ComandoInvalido(f"Ação inválida: {acao}.")
    atual = next((item for item in consequencias(ficha) if item["id"] == consequencia_id), None)
    if atual is None:
        raise LookupError("Consequência não encontrada.")
    destino = {"mitigar": "mitigado", "iniciar_tratamento": "em_tratamento", "reativar": "ativo",
               "encerrar": "encerrado"}.get(acao)
    if destino is not None and atual["estado"] == destino:
        raise ComandoInvalido("A consequência já está neste estado.")
    if acao != "remover" and acao != "reativar" and atual["estado"] == "encerrado":
        raise ComandoInvalido("Reative a consequência encerrada antes de alterá-la.")
    return _administrar(ficha, consequencia_id, acao, justificativa)
