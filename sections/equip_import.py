# sections/equip_import.py
import html
import streamlit as st
from typing import Any, Dict
from utils.equip_codec import decode_equipment
from utils.equip_library import add_to_library

def _push_to_inventory(tipo: str, item: Dict[str, Any], efeitos: list):
    key = {"arma": "armas", "armadura": "armaduras", "outro": "outros"}[tipo]
    st.session_state.setdefault(key, [])
    # garante flags/quantidade mínimas e anexa efeitos
    inst = dict(item)
    inst.setdefault("quantidade", 1)
    inst.setdefault("equipado", False)
    if efeitos:
        inst["efeitos"] = efeitos
    st.session_state[key].append(inst)

def render_equip_import():
    if "equip_import_expanded" not in st.session_state:
        st.session_state["equip_import_expanded"] = False

    with st.expander("📥 Importar Equipamento", expanded=st.session_state["equip_import_expanded"]):
        st.caption("Cole um código de equipamento (`EQ1:...`). Você pode adicionar à **biblioteca** e/ou ao **inventário desta ficha**.")
        code = st.text_area("Código do equipamento", key="equip_import_code", height=80, placeholder="EQ1:...")
        c1, c2, c3 = st.columns([1,1,1])
        with c1:
            do_preview = st.button("🔍 Pré-visualizar", use_container_width=True, key="equip_prev_btn")
        with c2:
            add_library = st.button("📚 Adicionar à biblioteca", use_container_width=True, key="equip_add_lib_btn")
        with c3:
            add_inventory = st.button("➕ Adicionar ao inventário", use_container_width=True, key="equip_add_inv_btn")

        parsed: Dict[str, Any] | None = None
        if do_preview or add_library or add_inventory:
            try:
                parsed = decode_equipment(code)
                st.session_state["__equip_preview__"] = parsed
                if do_preview:
                    st.success("Pré-visualização pronta.")
            except Exception as e:
                st.session_state.pop("__equip_preview__", None)
                st.error(f"Não foi possível decodificar: {e}")

        preview = st.session_state.get("__equip_preview__")
        if preview:
            tipo = preview["tipo"]
            item = preview["item"]
            efeitos = preview["efeitos"]

            # Prévia compacta
            nome = html.escape(str(item.get("nome", "Sem nome")))
            desc = html.escape(str(item.get("descricao", "")))
            peso = item.get("peso", "")
            linha2 = " • ".join([p for p in [f"Tipo: {tipo.title()}", f"Peso: {peso}" if peso != "" else ""] if p])

            st.markdown(
                f"""
                <div style='display:flex;gap:14px;align-items:flex-start;border:1px solid rgba(255,255,255,.12);
                     background:rgba(255,255,255,.03);border-radius:12px;padding:10px;max-width:780px'>
                  <div style='flex:0 0 76px;width:76px;height:76px;border:1px solid rgba(255,255,255,.15);
                              border-radius:12px;display:flex;align-items:center;justify-content:center;'>🧰</div>
                  <div style='flex:1 1 auto'>
                    <div style='font-weight:600;margin-bottom:2px'>{nome}</div>
                    <div style='opacity:.9;font-size:12.5px;margin-bottom:6px'>{linha2}</div>
                    <div style='font-size:13px;line-height:1.45;white-space:pre-wrap'>{desc}</div>
                    <div style='opacity:.8;font-size:12px;margin-top:8px'>
                      <b>Efeitos associados:</b> {len(efeitos)} encontrado(s)
                    </div>
                  </div>
                </div>
                """,
                unsafe_allow_html=True
            )

            if add_library:
                try:
                    add_to_library(tipo, {"nome": item.get("nome",""), **item, "efeitos": efeitos})
                    st.success("Adicionado à biblioteca com sucesso!")
                except Exception as e:
                    st.error(f"Falha ao adicionar à biblioteca: {e}")

            if add_inventory:
                try:
                    _push_to_inventory(tipo, item, efeitos)
                    st.success("Adicionado ao inventário desta ficha!")
                except Exception as e:
                    st.error(f"Falha ao adicionar ao inventário: {e}")
