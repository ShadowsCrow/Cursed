from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict

import streamlit as st


ATTRIBUTE_NAMES = [
    "Força",
    "Destreza",
    "Vigor",
    "Carisma",
    "Manipulação",
    "Proposito",
    "Percepção",
    "Inteligência",
    "Raciocínio",
]

SKILL_NAMES = [
    "Prontidão",
    "Esportes",
    "Briga",
    "Esquiva",
    "Empatia",
    "Expressão",
    "Intimidação",
    "Liderança",
    "Conhecimento urbano",
    "Lábia",
    "Lidar com animais",
    "Oficios",
    "Pilotagem",
    "Etiqueta",
    "Longo alcance",
    "Armas Brancas",
    "Performance",
    "Prestidigitação",
    "Furtividade",
    "Sobrevivência",
    "Acadêmicos",
    "Arcanismo",
    "Finanças",
    "Investigação",
    "Direito",
    "Linguistica",
    "Medicina",
    "Ocultismo",
    "Politica",
    "Natureza",
]


def make_empty_ficha_draft() -> Dict[str, Any]:
    return {
        "personagem": {},
        "personalidade": {},
        "atributos": {"valores": {}, "ajustes": {}, "totais": {}},
        "pericias": {"valores": {}, "ajustes": {}, "totais": {}},
        "armas": [],
        "armaduras": [],
        "outros": [],
        "efeitos_externos": [],
    }


def ensure_ficha_state() -> None:
    if "ficha_draft" not in st.session_state:
        st.session_state["ficha_draft"] = make_empty_ficha_draft()
    if "ficha_carregada_nome" not in st.session_state:
        st.session_state["ficha_carregada_nome"] = None
    bind_legacy_aliases()


def get_ficha_draft() -> Dict[str, Any]:
    ensure_ficha_state()
    return st.session_state["ficha_draft"]


def replace_ficha_draft(data: Dict[str, Any] | None, ficha_nome: str | None = None) -> Dict[str, Any]:
    draft = make_empty_ficha_draft()
    if isinstance(data, dict):
        draft["personagem"] = deepcopy(data.get("personagem") or {})
        draft["personalidade"] = deepcopy(data.get("personalidade") or {})
        draft["atributos"] = deepcopy(data.get("atributos") or {"valores": {}, "ajustes": {}, "totais": {}})
        draft["pericias"] = deepcopy(data.get("pericias") or {"valores": {}, "ajustes": {}, "totais": {}})
        draft["armas"] = [deepcopy(item) for item in (data.get("armas") or data.get("equipamentos") or []) if isinstance(item, dict)]
        draft["armaduras"] = [deepcopy(item) for item in (data.get("armaduras") or []) if isinstance(item, dict)]
        draft["outros"] = [deepcopy(item) for item in (data.get("outros") or []) if isinstance(item, dict)]
        draft["efeitos_externos"] = [deepcopy(item) for item in (data.get("efeitos_externos") or []) if isinstance(item, dict)]

    st.session_state["ficha_draft"] = draft
    st.session_state["ficha_carregada_nome"] = ficha_nome
    st.session_state["armas_sync_token"] = ficha_nome or "armas"
    st.session_state["armadura_sync_token"] = ficha_nome or "armadura"
    st.session_state["outros_sync_token"] = ficha_nome or "outros"
    seed_widget_state_from_draft(draft)
    bind_legacy_aliases()
    return draft


def reset_ficha_draft() -> Dict[str, Any]:
    return replace_ficha_draft(make_empty_ficha_draft(), ficha_nome=None)


def bind_legacy_aliases() -> None:
    if "ficha_draft" not in st.session_state:
        st.session_state["ficha_draft"] = make_empty_ficha_draft()
    draft = st.session_state["ficha_draft"]
    st.session_state["personagem"] = draft["personagem"]
    st.session_state["personalidade"] = draft["personalidade"]
    st.session_state["armas"] = draft["armas"]
    st.session_state["armaduras"] = draft["armaduras"]
    st.session_state["outros"] = draft["outros"]
    st.session_state["efeitos_externos"] = draft["efeitos_externos"]

    imagem_base64 = draft["personagem"].get("imagem_base64")
    if imagem_base64:
        st.session_state["imagem_base64"] = imagem_base64
    else:
        st.session_state.pop("imagem_base64", None)


def sync_draft_from_aliases() -> Dict[str, Any]:
    draft = get_ficha_draft()
    draft["personagem"] = deepcopy(st.session_state.get("personagem", draft["personagem"]))
    draft["personalidade"] = deepcopy(st.session_state.get("personalidade", draft["personalidade"]))
    draft["armas"] = [deepcopy(item) for item in st.session_state.get("armas", [])]
    draft["armaduras"] = [deepcopy(item) for item in st.session_state.get("armaduras", [])]
    draft["outros"] = [deepcopy(item) for item in st.session_state.get("outros", [])]
    draft["efeitos_externos"] = [deepcopy(item) for item in st.session_state.get("efeitos_externos", [])]

    imagem_base64 = st.session_state.get("imagem_base64")
    if imagem_base64:
        draft["personagem"]["imagem_base64"] = imagem_base64
    else:
        draft["personagem"].pop("imagem_base64", None)

    st.session_state["ficha_draft"] = draft
    bind_legacy_aliases()
    return draft


def seed_widget_state_from_draft(draft: Dict[str, Any] | None = None) -> None:
    if draft is None:
        draft = get_ficha_draft()

    atributos = draft.get("atributos") or {}
    attr_values = atributos.get("valores") or {}
    attr_adjust = atributos.get("ajustes") or {}
    for nome in ATTRIBUTE_NAMES:
        st.session_state[f"valor_{nome}"] = int(attr_values.get(nome, 1) or 1)
        st.session_state[f"vant_{nome}"] = int(attr_adjust.get(nome, 0) or 0)

    pericias = draft.get("pericias") or {}
    skill_values = pericias.get("valores") or {}
    skill_adjust = pericias.get("ajustes") or {}
    for nome in SKILL_NAMES:
        st.session_state[f"pericia_valor_{nome}"] = int(skill_values.get(nome, 0) or 0)
        st.session_state[f"pericia_ajuste_{nome}"] = int(skill_adjust.get(nome, 0) or 0)

    personalidade = draft.get("personalidade") or {}
    st.session_state["coisa_favorita"] = personalidade.get("coisa_favorita", "")
    st.session_state["odeia"] = personalidade.get("odeia", "")
    st.session_state["vivo_para"] = personalidade.get("vivo_para", "")
    st.session_state["alinhamento"] = personalidade.get("alinhamento", "Neutro | Neutro")
    st.session_state["pecado"] = personalidade.get("pecado", "Ira")


def update_ficha_draft_section(section: str, value: Any) -> Dict[str, Any]:
    draft = get_ficha_draft()
    draft[section] = deepcopy(value)
    st.session_state["ficha_draft"] = draft
    bind_legacy_aliases()
    return draft
