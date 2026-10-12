from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Mapping


SECOES_FICHA = (
    "personagem",
    "personalidade",
    "atributos",
    "pericias",
    "armas",
    "armaduras",
    "outros",
    "efeitos_externos",
)


def _objeto(valor: Any) -> dict[str, Any]:
    return deepcopy(dict(valor)) if isinstance(valor, Mapping) else {}


def _lista_objetos(valor: Any) -> list[dict[str, Any]]:
    if not isinstance(valor, list):
        return []
    return [deepcopy(dict(item)) for item in valor if isinstance(item, Mapping)]


def _valores_derivados(valor: Any) -> dict[str, Any]:
    dados = _objeto(valor)
    return {
        "valores": _objeto(dados.get("valores")),
        "ajustes": _objeto(dados.get("ajustes")),
        "totais": _objeto(dados.get("totais")),
    }


@dataclass
class FichaDraft:
    """Estado transportável da ficha, independente de uma sessão ou interface."""

    personagem: dict[str, Any] = field(default_factory=dict)
    personalidade: dict[str, Any] = field(default_factory=dict)
    atributos: dict[str, Any] = field(default_factory=lambda: _valores_derivados({}))
    pericias: dict[str, Any] = field(default_factory=lambda: _valores_derivados({}))
    armas: list[dict[str, Any]] = field(default_factory=list)
    armaduras: list[dict[str, Any]] = field(default_factory=list)
    outros: list[dict[str, Any]] = field(default_factory=list)
    efeitos_externos: list[dict[str, Any]] = field(default_factory=list)
    extras: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def vazia(cls) -> "FichaDraft":
        return cls()

    @classmethod
    def de_payload(cls, payload: Mapping[str, Any] | None) -> "FichaDraft":
        if payload is None:
            return cls.vazia()
        if not isinstance(payload, Mapping):
            raise ValueError("O payload da ficha precisa ser um objeto.")
        dados = dict(payload)
        return cls(
            personagem=_objeto(dados.get("personagem")),
            personalidade=_objeto(dados.get("personalidade")),
            atributos=_valores_derivados(dados.get("atributos")),
            pericias=_valores_derivados(dados.get("pericias")),
            armas=_lista_objetos(dados.get("armas") or dados.get("equipamentos")),
            armaduras=_lista_objetos(dados.get("armaduras")),
            outros=_lista_objetos(dados.get("outros")),
            efeitos_externos=_lista_objetos(dados.get("efeitos_externos")),
            extras={chave: deepcopy(valor) for chave, valor in dados.items() if chave not in SECOES_FICHA},
        )

    def para_payload(self) -> dict[str, Any]:
        payload = deepcopy(self.extras)
        payload.update(
            {
                "personagem": deepcopy(self.personagem),
                "personalidade": deepcopy(self.personalidade),
                "atributos": deepcopy(self.atributos),
                "pericias": deepcopy(self.pericias),
                "armas": deepcopy(self.armas),
                "armaduras": deepcopy(self.armaduras),
                "outros": deepcopy(self.outros),
                "efeitos_externos": deepcopy(self.efeitos_externos),
            }
        )
        return payload

    def substituir_secao(self, secao: str, valor: Any) -> None:
        if secao not in SECOES_FICHA:
            raise ValueError(f"Seção de ficha desconhecida: {secao}")
        atualizado = self.de_payload({**self.para_payload(), secao: valor})
        for campo in SECOES_FICHA:
            setattr(self, campo, deepcopy(getattr(atualizado, campo)))
        self.extras = deepcopy(atualizado.extras)


@dataclass
class ServicoFichaDraft:
    """Orquestra um rascunho e sua identidade carregada sem estado de interface."""

    ficha: FichaDraft = field(default_factory=FichaDraft.vazia)
    nome_carregado: str | None = None

    def substituir(self, payload: Mapping[str, Any] | None, *, nome: str | None = None) -> FichaDraft:
        self.ficha = FichaDraft.de_payload(payload)
        self.nome_carregado = nome
        return self.ficha

    def limpar(self) -> FichaDraft:
        return self.substituir(None, nome=None)

    def atualizar_secao(self, secao: str, valor: Any) -> FichaDraft:
        self.ficha.substituir_secao(secao, valor)
        return self.ficha
