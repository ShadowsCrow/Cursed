# sections/efeitos_import.py
import html
import streamlit as st
from typing import Any, Dict
from utils.effect_codec import decode_effect
from utils.effects_library import add_to_effects_library

def _push_to_character(effect: Dict[str, Any]):
    st.session_state.setdefault("efeitos_externos", [])
    st.session_state["efeitos_externos"].append(effect)

def render_efeitos_import():
    """
    Expander para importar efeito externo E1, pré-visualizar, adicionar à biblioteca e/ou à ficha atual.
    """
    if "efeitos_import_expanded" not in st.session_state:
        st.session_state["efeitos_import_expanded"] = False

    with st.expander("📥 Importar Efeito Externo", expanded=st.session_state["efeitos_import_expanded"]):
        st.caption("Cole um **código E1**. Você pode **adicionar à biblioteca** e/ou **à ficha atual**.")
        code = st.text_area("Código do efeito (E1:...)", key="efeito_import_code", height=80, placeholder="E1:...")

        c1, c2, c3 = st.columns([1,1,1])
        with c1:
            do_preview = st.button("🔍 Pré-visualizar", use_container_width=True, key="ef_prev_btn")
        with c2:
            add_library = st.button("📚 Adicionar à biblioteca", use_container_width=True, key="ef_add_lib_btn")
        with c3:
            add_char = st.button("➕ Adicionar à ficha", use_container_width=True, key="ef_add_char_btn")

        parsed: Dict[str, Any] | None = None
        if do_preview or add_library or add_char:
            try:
                parsed = decode_effect(code)
                st.session_state["__efeito_preview__"] = parsed
                if do_preview:
                    st.success("Pré-visualização pronta.")
            except Exception as e:
                st.session_state.pop("__efeito_preview__", None)
                st.error(f"Não foi possível decodificar: {e}")

        preview = st.session_state.get("__efeito_preview__")
        if preview:
            nome = html.escape(str(preview.get("nome", "Efeito")))
            desc = html.escape(str(preview.get("descricao", "")))
            b64 = preview.get("imagem_base64", "")
            img_html = (f"<img src='data:image/png;base64,{b64}' style='width:76px;height:76px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,.15);'/>"
                        if isinstance(b64, str) and b64.strip()
                        else "<div style='width:76px;height:76px;border-radius:12px;border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;opacity:.7;'>✨</div>")
            st.markdown(
                f"""
                <div style='display:flex;gap:14px;align-items:flex-start;border:1px solid rgba(255,255,255,.12);
                     background:rgba(255,255,255,.03);border-radius:12px;padding:10px;max-width:780px'>
                  <div>{img_html}</div>
                  <div style='flex:1 1 auto'>
                    <div style='font-weight:600;margin-bottom:2px'>{nome}</div>
                    <div style='font-size:13px;line-height:1.5;white-space:pre-wrap'>{desc}</div>
                  </div>
                </div>
                """,
                unsafe_allow_html=True
            )

            if add_library:
                try:
                    add_to_effects_library(preview)
                    st.success("Adicionado à biblioteca de efeitos!")
                except Exception as e:
                    st.error(f"Falha ao adicionar à biblioteca: {e}")

            if add_char:
                try:
                    _push_to_character(preview)
                    st.success("Efeito adicionado à ficha atual!")
                except Exception as e:
                    st.error(f"Falha ao adicionar à ficha: {e}")
