# sections/outros.py
import json
import html
from copy import deepcopy
from typing import Any, Dict, List
import streamlit as st
from core.equip_library import load_library
from core.paths import CATALOGS_DIR

def _load_default_effects_map() -> Dict[str, Dict[str, Any]]:
    try:
        with (CATALOGS_DIR / "efeitos_default.json").open("r", encoding="utf-8") as f:
            data = json.load(f)
        out: Dict[str, Dict[str, Any]] = {}
        if isinstance(data, list):
            for it in data:
                if isinstance(it, dict):
                    assoc = str(it.get("associacao", "")).strip()
                    if assoc:
                        out[assoc] = it
        return out
    except Exception:
        return {}

def _render_item_effects(effects: List[Dict[str, Any]] | None):
    st.markdown("**Efeitos (do item)**")
    if not effects:
        st.caption("Nenhum efeito associado a este item.")
        return
    defaults = _load_default_effects_map()
    for ef in effects:
        if not isinstance(ef, dict) or "kind" not in ef:
            continue
        if ef["kind"] == "default":
            assoc = str(ef.get("associacao", "")).strip()
            meta = defaults.get(assoc, {})
            nome = ef.get("nome") or meta.get("nome") or assoc or "Efeito (default)"
            desc = ef.get("descricao") or meta.get("descricao") or ""
            st.markdown(f"• **[Default] {html.escape(str(nome))}**  — _associação:_ `{html.escape(assoc)}`  \n{html.escape(str(desc))}")
        elif ef["kind"] == "externo":
            nome = ef.get("nome", "Efeito")
            desc = ef.get("descricao", "")
            st.markdown(f"• **[Externo] {html.escape(str(nome))}**  \n{html.escape(str(desc))}")

def _ensure_state_list():
    st.session_state.setdefault("outros", [])
    st.session_state.setdefault("outros_sync_token", "outros")

def _add_from_library(selected: Dict[str, Any] | None):
    if not selected:
        return
    inst = deepcopy(selected)
    inst.setdefault("quantidade", 1)
    inst.setdefault("equipado", False)
    st.session_state["outros"].append(inst)

def _add_empty():
    st.session_state["outros"].append({
        "nome": "",
        "peso": 0.0,
        "quantidade": 1,
        "equipado": False,
        "descricao": "",
        # "efeitos": []
    })

def _del_index(idx: int):
    if 0 <= idx < len(st.session_state["outros"]):
        st.session_state["outros"].pop(idx)

def render_outros():
    """
    Aba 🎒 Outros com:
      - "Adicionar da biblioteca".
      - Lista editável, equipado, descrição colapsável
      - Visualização de efeitos do item (somente leitura)
    """
    _ensure_state_list()

    # ----- Adicionar da biblioteca -----
    st.subheader("Adicionar da biblioteca")
    lib = load_library("outro")
    if not lib:
        st.caption("Nenhum item na biblioteca ainda. Use **📥 Importar Equipamento** para popular a biblioteca.")
    else:
        nomes = [it.get("nome", "(sem nome)") for it in lib]
        col_l, col_r = st.columns([3, 1])
        with col_l:
            pick = st.selectbox("Escolha um item da biblioteca", nomes, key=f"outros_pick_{st.session_state['outros_sync_token']}")
        with col_r:
            if st.button("➕ Adicionar", key=f"outros_addlib_{st.session_state['outros_sync_token']}", use_container_width=True):
                _add_from_library(lib[nomes.index(pick)])
                st.rerun()

    st.divider()

    # ----- Lista -----
    st.subheader("Outros itens da ficha")
    if st.button("➕ Novo item (manual)", key=f"outros_add_{st.session_state['outros_sync_token']}"):
        _add_empty()
        st.rerun()

    if not st.session_state["outros"]:
        st.info("Nenhum item adicionado.")
        return st.session_state["outros"]

    for i, it in enumerate(st.session_state["outros"]):
        key_base = f"outro_{i}_{st.session_state['outros_sync_token']}"
        with st.container(border=True):
            top = st.columns([0.5, 2.5, 1.0, 0.7, 0.5])

            # Col 0: equipado (sem 'value', com default no session_state)
            with top[0]:
                eq_key = f"{key_base}_equipped"
                st.session_state.setdefault(eq_key, bool(it.get("equipado", False)))
                st.checkbox("Equipado", key=eq_key)
                it["equipado"] = bool(st.session_state[eq_key])

            # Col 1: nome
            with top[1]:
                it["nome"] = st.text_input("Nome", value=str(it.get("nome", "")), key=f"{key_base}_nome")

            # Col 2: peso
            with top[2]:
                it["peso"] = st.number_input("Peso", min_value=0.0, step=0.1, value=float(it.get("peso", 0.0) or 0.0), key=f"{key_base}_peso")

            # Col 3: quantidade
            with top[3]:
                it["quantidade"] = st.number_input("Qtd", min_value=1, step=1, value=int(it.get("quantidade", 1) or 1), key=f"{key_base}_qtd")

            # Col 4: remover
            with top[4]:
                if st.button("🗑️", key=f"{key_base}_del"):
                    _del_index(i)
                    st.rerun()

            # Descrição colapsável
            desc_open_key = f"{key_base}_desc_open"
            st.session_state.setdefault(desc_open_key, bool(it.get("descricao", "")))
            open_desc = st.checkbox("Descrição", key=desc_open_key)
            if open_desc:
                it["descricao"] = st.text_area("Descrição do item", value=str(it.get("descricao", "")), key=f"{key_base}_desc", height=100)

            # Efeitos (do item) — somente leitura
            eff_open_key = f"{key_base}_eff_open"
            st.session_state.setdefault(eff_open_key, bool(it.get("efeitos")))
            open_eff = st.checkbox("Efeitos (do item)", key=eff_open_key)
            if open_eff:
                _render_item_effects(it.get("efeitos"))

            st.session_state["outros"][i] = it

    return st.session_state["outros"]
