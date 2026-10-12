# sections/armas.py
import re
import json
import html
from copy import deepcopy
from typing import Any, Dict, List
import streamlit as st
from core.equip_library import load_library
from core.paths import CATALOGS_DIR

# Regex de validação do campo "dano"
DANO_REGEX = re.compile(r"^\d+[dD]\d+(?:[+-]\d+)?$")

def _load_tipos_dano() -> List[str]:
    """Lê o catálogo de tipos de dano aceitando objeto ou lista simples."""
    try:
        with (CATALOGS_DIR / "tipos_dano.json").open("r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "tipos" in data and isinstance(data["tipos"], list):
            return [str(x) for x in data["tipos"]]
        if isinstance(data, list):
            return [str(x) for x in data]
    except Exception:
        pass
    # fallback
    return ["Cortante", "Perfurante", "Concussão", "Fogo", "Gelo", "Ácido", "Relâmpago", "Psíquico"]

def _load_default_effects_map() -> Dict[str, Dict[str, Any]]:
    """
    Carrega o catálogo de efeitos oficiais e indexa por 'associacao'.
    Usado apenas para resolver nome/descrição de efeitos 'default' na visualização do item.
    """
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
    """Mostra os efeitos associados a uma arma (apenas leitura)."""
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
    st.session_state.setdefault("armas", [])
    # token para chaves estáveis de widgets
    st.session_state.setdefault("armas_sync_token", "armas")

def _add_from_library(selected: Dict[str, Any] | None):
    if not selected:
        return
    inst = deepcopy(selected)
    inst.setdefault("quantidade", 1)
    inst.setdefault("equipado", False)
    # mantém "efeitos" se vier no item
    st.session_state["armas"].append(inst)

def _add_empty():
    st.session_state["armas"].append({
        "nome": "",
        "dano": "",
        "tipo_dano": "",
        "critico": 2,
        "quantidade": 1,
        "peso": 0.0,
        "equipado": False,
        "descricao": "",
        # "efeitos": []  # opcional
    })

def _del_index(idx: int):
    if 0 <= idx < len(st.session_state["armas"]):
        st.session_state["armas"].pop(idx)

def render_armas():
    """
    Renderiza a aba ⚔️ Armas com:
      - Picker "Adicionar da biblioteca".
      - Lista editável de armas da FICHA (equipped/descrição/efeitos colapsáveis)
    Retorna a lista atualizada (também fica em st.session_state["armas"]).
    """
    _ensure_state_list()
    tipos_dano = _load_tipos_dano()

    # ----- Adicionar da biblioteca -----
    st.subheader("Adicionar da biblioteca")
    lib = load_library("arma")
    if not lib:
        st.caption("Nenhum item na biblioteca ainda. Use **📥 Importar Equipamento** para popular a biblioteca.")
    else:
        nomes = [it.get("nome", "(sem nome)") for it in lib]
        col_l, col_r = st.columns([3, 1])
        with col_l:
            pick = st.selectbox("Escolha um item da biblioteca", nomes, key=f"armas_pick_{st.session_state['armas_sync_token']}")
        with col_r:
            if st.button("➕ Adicionar", key=f"armas_addlib_{st.session_state['armas_sync_token']}", use_container_width=True):
                _add_from_library(lib[nomes.index(pick)])
                st.rerun()

    st.divider()

    # ----- Lista de armas (inventário da ficha) -----
    st.subheader("Armas da ficha")
    if st.button("➕ Nova arma (manual)", key=f"armas_add_{st.session_state['armas_sync_token']}"):
        _add_empty()
        st.rerun()

    if not st.session_state["armas"]:
        st.info("Nenhuma arma adicionada.")
        return st.session_state["armas"]

    # Desenho dos itens
    for i, arma in enumerate(st.session_state["armas"]):
        key_base = f"arma_{i}_{st.session_state['armas_sync_token']}"
        with st.container(border=True):
            top = st.columns([0.4, 2.2, 1, 1, 0.8, 0.8, 0.6, 0.5])

            # Col 0: equipado (sem 'value', com default no session_state)
            with top[0]:
                eq_key = f"{key_base}_equipped"
                st.session_state.setdefault(eq_key, bool(arma.get("equipado", False)))
                st.checkbox("Equipada", key=eq_key)
                arma["equipado"] = bool(st.session_state[eq_key])

            # Col 1: nome
            with top[1]:
                arma["nome"] = st.text_input("Nome", value=str(arma.get("nome", "")), key=f"{key_base}_nome")

            # Col 2: dano
            with top[2]:
                val = st.text_input("Dano (XdY +/-Z)", value=str(arma.get("dano", "")), key=f"{key_base}_dano")
                if val and not DANO_REGEX.match(val.strip()):
                    st.warning("Formato esperado: 1d8, 2d6+3, 1d12-1 etc.")
                arma["dano"] = val

            # Col 3: tipo de dano
            with top[3]:
                atual = str(arma.get("tipo_dano", "")) or (tipos_dano[0] if tipos_dano else "")
                idx = (tipos_dano.index(atual) if atual in tipos_dano else 0) if tipos_dano else 0
                arma["tipo_dano"] = st.selectbox("Tipo de dano", tipos_dano, index=max(0, idx), key=f"{key_base}_td")

            # Col 4: crítico
            with top[4]:
                arma["critico"] = st.number_input("Crítico (x)", min_value=1, step=1, value=int(arma.get("critico", 2) or 2), key=f"{key_base}_crit")

            # Col 5: quantidade
            with top[5]:
                arma["quantidade"] = st.number_input("Qtd", min_value=1, step=1, value=int(arma.get("quantidade", 1) or 1), key=f"{key_base}_qtd")

            # Col 6: peso
            with top[6]:
                arma["peso"] = st.number_input("Peso", min_value=0.0, step=0.1, value=float(arma.get("peso", 0.0) or 0.0), key=f"{key_base}_peso")

            # Col 7: remover
            with top[7]:
                if st.button("🗑️", key=f"{key_base}_del"):
                    _del_index(i)
                    st.rerun()

            # Descrição colapsável (sem 'value' no checkbox)
            desc_open_key = f"{key_base}_desc_open"
            st.session_state.setdefault(desc_open_key, bool(arma.get("descricao", "")))
            open_desc = st.checkbox("Descrição", key=desc_open_key)
            if open_desc:
                arma["descricao"] = st.text_area("Descrição da arma", value=str(arma.get("descricao", "")), key=f"{key_base}_desc", height=100)

            # Efeitos (do item) — somente leitura
            eff_open_key = f"{key_base}_eff_open"
            st.session_state.setdefault(eff_open_key, bool(arma.get("efeitos")))
            open_eff = st.checkbox("Efeitos (do item)", key=eff_open_key)
            if open_eff:
                _render_item_effects(arma.get("efeitos"))

            # Mantém de volta
            st.session_state["armas"][i] = arma

    return st.session_state["armas"]
