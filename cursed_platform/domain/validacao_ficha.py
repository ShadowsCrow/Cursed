"""Validação central da ficha (design D4).

`validar_ficha(anterior, nova, catalogo)` só recusa campos que **mudaram**: fichas antigas
irregulares continuam graváveis nos outros campos. `verificar(ficha, catalogo)` lista todas as
irregularidades, usadas como avisos na leitura. Nenhum valor é corrigido aqui.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Callable, Iterable, Mapping

from cursed_platform.catalogos import chave
from cursed_platform.domain.grade import TAMANHOS
from cursed_platform.domain.recursos import ALVOS_AJUSTE, NIVEL_MAXIMO, NIVEL_MINIMO

if TYPE_CHECKING:
    from cursed_platform.catalogos import Catalogos

ATRIBUTO_MIN, ATRIBUTO_MAX = 1, 5
PERICIA_MIN, PERICIA_MAX = 0, 5


@dataclass(frozen=True)
class ErroCampo:
    caminho: str  # ex.: "atributos.valores.Força"
    mensagem: str


def _inteiro(valor: Any) -> int | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, int):
        return valor
    if isinstance(valor, float) and valor.is_integer():
        return int(valor)
    return None


def _vazio(valor: Any) -> bool:
    return valor is None or (isinstance(valor, str) and not valor.strip())


def _secao(ficha: Mapping[str, Any], nome: str) -> Mapping[str, Any]:
    valor = ficha.get(nome)
    return valor if isinstance(valor, Mapping) else {}


def _valores(ficha: Mapping[str, Any], secao: str) -> Mapping[str, Any]:
    valores = _secao(ficha, secao).get("valores")
    return valores if isinstance(valores, Mapping) else {}


# ------------------------------------------------------------ regras por campo


def _faixa(tipo: str, minimo: int, maximo: int) -> Callable[[Any], str | None]:
    def verificar(valor: Any) -> str | None:
        numero = _inteiro(valor)
        if numero is None:
            return f"O {tipo} base precisa ser um número inteiro de {minimo} a {maximo}."
        if numero > maximo:
            return f"O {tipo} base vai de {minimo} a {maximo}; valores acima de {maximo} exigem ajuste."
        if numero < minimo:
            return f"O {tipo} base vai de {minimo} a {maximo}."
        return None

    return verificar


_atributo = _faixa("Atributo", ATRIBUTO_MIN, ATRIBUTO_MAX)
_pericia = _faixa("Perícia", PERICIA_MIN, PERICIA_MAX)


def _nivel(valor: Any) -> str | None:
    if _vazio(valor):
        return None
    numero = _inteiro(valor)
    if numero is None or not NIVEL_MINIMO <= numero <= NIVEL_MAXIMO:
        return f"O nível vai de {NIVEL_MINIMO} a {NIVEL_MAXIMO}."
    return None


def _idade(valor: Any) -> str | None:
    if _vazio(valor):
        return None
    numero = _inteiro(valor)
    if numero is None:
        return "A idade precisa ser um número inteiro."
    if numero < 0:
        return "A idade não pode ser negativa."
    return None


def _lista(rotulo: str, opcoes: Iterable[str], aceita: Callable[[str], bool] | None = None) -> Callable[[Any], str | None]:
    opcoes = tuple(opcoes)

    def verificar(valor: Any) -> str | None:
        if _vazio(valor):
            return None
        texto = str(valor).strip()
        if (aceita(texto) if aceita else texto in opcoes):
            return None
        return f"{rotulo} fora da lista. Opções: {', '.join(opcoes)}."

    return verificar


def _tamanho(valor: Any) -> str | None:
    if _vazio(valor) or chave(valor) in TAMANHOS:
        return None
    return "Tamanho desconhecido. Opções: Minúsculo, Pequeno, Médio, Grande, Enorme, Colossal."


def _ajustes(valor: Any) -> list[str]:
    if _vazio(valor):
        return []
    if not isinstance(valor, list):
        return ["Os ajustes precisam ser uma lista."]
    erros: list[str] = []
    for indice, ajuste in enumerate(valor, start=1):
        if not isinstance(ajuste, Mapping):
            erros.append(f"Ajuste {indice}: formato inválido.")
            continue
        if ajuste.get("alvo") not in ALVOS_AJUSTE:
            erros.append(f"Ajuste {indice}: escolha PV máximo, PP máximo, Escala de PV ou Escala de PP.")
        if _inteiro(ajuste.get("valor")) is None:
            erros.append(f"Ajuste {indice}: o valor precisa ser um número inteiro.")
        if _vazio(ajuste.get("origem")):
            erros.append(f"Ajuste {indice}: informe a origem (a regra de raça, classe ou campanha).")
        if _vazio(ajuste.get("justificativa")):
            erros.append(f"Ajuste {indice}: informe a justificativa.")
    return erros


# ------------------------------------------------------------ verificação


def _campos(ficha: Mapping[str, Any], catalogo: "Catalogos") -> dict[str, list[str]]:
    """Mensagens por caminho, para todos os campos que têm regra."""
    personagem = _secao(ficha, "personagem")
    personalidade = _secao(ficha, "personalidade")
    listas = catalogo.listas
    mensagens: dict[str, list[str]] = {}

    def registrar(caminho: str, mensagem: str | None) -> None:
        if mensagem:
            mensagens.setdefault(caminho, []).append(mensagem)

    for nome, valor in _valores(ficha, "atributos").items():
        registrar(f"atributos.valores.{nome}", _atributo(valor))
    for nome, valor in _valores(ficha, "pericias").items():
        registrar(f"pericias.valores.{nome}", _pericia(valor))

    registrar("personagem.nivel", _nivel(personagem.get("nivel")))
    registrar("personagem.idade", _idade(personagem.get("idade")))
    registrar("personagem.sexo", _lista("Sexo", listas.sexos)(personagem.get("sexo")))
    registrar("personagem.tamanho", _tamanho(personagem.get("tamanho")))
    registrar("personalidade.alinhamento", _lista("Alinhamento", listas.alinhamentos)(personalidade.get("alinhamento")))
    registrar("personalidade.pecado", _lista(
        "Pecado Capital", [p.nome for p in listas.pecados], lambda t: listas.pecado(t) is not None,
    )(personalidade.get("pecado")))

    classe_nome = personagem.get("classe")
    classe = None if _vazio(classe_nome) else catalogo.classe(classe_nome)
    if not _vazio(classe_nome) and classe is None:
        registrar("personagem.classe", f"A classe \"{str(classe_nome).strip()}\" não existe no catálogo.")
    arquetipo = personagem.get("arquetipo")
    if not _vazio(arquetipo):
        if classe is None:
            registrar("personagem.arquetipo", "Escolha uma classe do catálogo antes do arquétipo.")
        elif classe.arquetipo(arquetipo) is None:
            registrar("personagem.arquetipo", f"O arquétipo \"{str(arquetipo).strip()}\" não pertence à classe {classe.nome}.")
    raca = personagem.get("raca")
    if not _vazio(raca) and catalogo.raca(raca) is None:
        registrar("personagem.raca", f"A raça \"{str(raca).strip()}\" não existe no catálogo.")

    for mensagem in _ajustes(_secao(ficha, "recursos").get("ajustes")):
        registrar("recursos.ajustes", mensagem)
    return mensagens


AVISO_NIVEL_MIGRADO = "Nível definido pela migração: o Narrador precisa confirmar o nível do personagem."


def verificar(ficha: Mapping[str, Any], catalogo: "Catalogos") -> list[ErroCampo]:
    """Todas as irregularidades da ficha, para exibir como avisos."""
    avisos = [ErroCampo(caminho, m) for caminho, lista in _campos(ficha, catalogo).items() for m in lista]
    # Aviso informativo, nunca motivo de recusa: some quando o Narrador confirma ou troca o nível.
    if _secao(ficha, "personagem").get("nivel_pela_migracao"):
        avisos.append(ErroCampo("personagem.nivel", AVISO_NIVEL_MIGRADO))
    return avisos


def _valor(ficha: Mapping[str, Any], caminho: str) -> Any:
    atual: Any = ficha
    partes = caminho.split(".")
    # O nome de um atributo ou perícia pode ter ponto; o que vem depois de "valores" é o nome inteiro.
    if len(partes) > 3 and partes[1] == "valores":
        partes = partes[:2] + [".".join(partes[2:])]
    for parte in partes:
        if not isinstance(atual, Mapping):
            return None
        atual = atual.get(parte)
    return atual


def _mudou(anterior: Mapping[str, Any] | None, nova: Mapping[str, Any], caminho: str) -> bool:
    return anterior is None or _valor(anterior, caminho) != _valor(nova, caminho)


def validar_ficha(
    anterior: Mapping[str, Any] | None, nova: Mapping[str, Any], catalogo: "Catalogos"
) -> list[ErroCampo]:
    """Erros que impedem gravar ``nova``. ``anterior=None`` é uma ficha nova: tudo é validado."""
    erros: list[ErroCampo] = []
    classe_mudou = _mudou(anterior, nova, "personagem.classe")
    for caminho, mensagens in _campos(nova, catalogo).items():
        relevante = _mudou(anterior, nova, caminho) or (caminho == "personagem.arquetipo" and classe_mudou)
        if relevante:
            erros.extend(ErroCampo(caminho, m) for m in mensagens)

    # Tamanho atual é uma exceção à raça: trocar a raça exige limpá-lo ou reconfirmá-lo.
    personagem = _secao(nova, "personagem")
    if anterior is not None and _mudou(anterior, nova, "personagem.raca") and not _vazio(personagem.get("tamanho")):
        if chave(personagem.get("tamanho_raca")) != chave(personagem.get("raca")):
            erros.append(ErroCampo(
                "personagem.tamanho",
                "A raça mudou: limpe o Tamanho atual ou reconfirme a exceção para a nova raça.",
            ))
    return erros
