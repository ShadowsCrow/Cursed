# sections/armadura.py
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
    st.session_state.setdefault("armaduras", [])
    st.session_state.setdefault("armadura_sync_token", "armadura")

def _add_from_library(selected: Dict[str, Any] | None):
    if not selected:
        return
    inst = deepcopy(selected)
    inst.setdefault("quantidade", 1)
    inst.setdefault("equipado", False)
    st.session_state["armaduras"].append(inst)

def _add_empty():
    st.session_state["armaduras"].append({
        "nome": "",
        "armadura": 0,
        "rdb": 0,
        "penalidade_destreza": 0,
        "penalidade_deslocamento": 0,
        "categoria": "Leve",
        "quantidade": 1,
        "peso": 0.0,
        "equipado": False,
        "descricao": "",
        # "efeitos": []
    })

def _del_index(idx: int):
    if 0 <= idx < len(st.session_state["armaduras"]):
        st.session_state["armaduras"].pop(idx)

def render_armadura():
    """
    Aba 🛡️ Armadura com:
      - "Adicionar da biblioteca".
      - Lista editável com campos extras (rdb, penalidades, categoria)
      - Visualização de efeitos do item (somente leitura)
    """
    _ensure_state_list()

    # ----- Adicionar da biblioteca -----
    st.subheader("Adicionar da biblioteca")
    lib = load_library("armadura")
    if not lib:
        st.caption("Nenhum item na biblioteca ainda. Use **📥 Importar Equipamento** para popular a biblioteca.")
    else:
        nomes = [it.get("nome", "(sem nome)") for it in lib]
        col_l, col_r = st.columns([3, 1])
        with col_l:
            pick = st.selectbox("Escolha um item da biblioteca", nomes, key=f"armad_pick_{st.session_state['armadura_sync_token']}")
        with col_r:
            if st.button("➕ Adicionar", key=f"armad_addlib_{st.session_state['armadura_sync_token']}", use_container_width=True):
                _add_from_library(lib[nomes.index(pick)])
                st.rerun()

    st.divider()

    # ----- Lista -----
    st.subheader("Armaduras da ficha")
    if st.button("➕ Nova armadura (manual)", key=f"armad_add_{st.session_state['armadura_sync_token']}"):
        _add_empty()
        st.rerun()

    if not st.session_state["armaduras"]:
        st.info("Nenhuma armadura adicionada.")
        return st.session_state["armaduras"]

    categorias = ["Leve", "Média", "Pesada", "Escudo"]

    for i, p in enumerate(st.session_state["armaduras"]):
        key_base = f"armad_{i}_{st.session_state['armadura_sync_token']}"
        with st.container(border=True):
            top = st.columns([0.45, 2.2, 0.8, 0.8, 1.1, 1.2, 1.2, 0.8, 0.8, 0.5])

            # Col 0: equipado (sem 'value', com default no session_state)
            with top[0]:
                eq_key = f"{key_base}_equipped"
                st.session_state.setdefault(eq_key, bool(p.get("equipado", False)))
                st.checkbox("Equipada", key=eq_key)
                p["equipado"] = bool(st.session_state[eq_key])

            # Col 1: nome
            with top[1]:
                p["nome"] = st.text_input("Nome", value=str(p.get("nome", "")), key=f"{key_base}_nome")

            # Col 2: CA (armadura)
            with top[2]:
                p["armadura"] = st.number_input("CA", min_value=0, step=1, value=int(p.get("armadura", 0) or 0), key=f"{key_base}_ca")

            # Col 3: RDB
            with top[3]:
                p["rdb"] = st.number_input("RDB", min_value=0, step=1, value=int(p.get("rdb", 0) or 0), key=f"{key_base}_rdb")

            # Col 4: Penalid. Destreza
            with top[4]:
                p["penalidade_destreza"] = st.number_input("Penal. Destreza", min_value=0, step=1, value=int(p.get("penalidade_destreza", 0) or 0), key=f"{key_base}_pdx")

            # Col 5: Penalid. Desloc.
            with top[5]:
                p["penalidade_deslocamento"] = st.number_input("Penal. Desloc.", min_value=0, step=1, value=int(p.get("penalidade_deslocamento", 0) or 0), key=f"{key_base}_pdesl")

            # Col 6: Categoria
            with top[6]:
                atual = str(p.get("categoria", "Leve"))
                if atual not in categorias:
                    atual = "Leve"
                p["categoria"] = st.selectbox("Categoria", categorias, index=categorias.index(atual), key=f"{key_base}_cat")

            # Col 7: quantidade
            with top[7]:
                p["quantidade"] = st.number_input("Qtd", min_value=1, step=1, value=int(p.get("quantidade", 1) or 1), key=f"{key_base}_qtd")

            # Col 8: peso
            with top[8]:
                p["peso"] = st.number_input("Peso", min_value=0.0, step=0.1, value=float(p.get("peso", 0.0) or 0.0), key=f"{key_base}_peso")

            # Col 9: remover
            with top[9]:
                if st.button("🗑️", key=f"{key_base}_del"):
                    _del_index(i)
                    st.rerun()

            # Descrição colapsável
            desc_open_key = f"{key_base}_desc_open"
            st.session_state.setdefault(desc_open_key, bool(p.get("descricao", "")))
            open_desc = st.checkbox("Descrição", key=desc_open_key)
            if open_desc:
                p["descricao"] = st.text_area("Descrição da armadura", value=str(p.get("descricao", "")), key=f"{key_base}_desc", height=100)

            # Efeitos (do item) — somente leitura
            eff_open_key = f"{key_base}_eff_open"
            st.session_state.setdefault(eff_open_key, bool(p.get("efeitos")))
            open_eff = st.checkbox("Efeitos (do item)", key=eff_open_key)
            if open_eff:
                _render_item_effects(p.get("efeitos"))

            st.session_state["armaduras"][i] = p

    return st.session_state["armaduras"]
