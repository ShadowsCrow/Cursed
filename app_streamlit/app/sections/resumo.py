# sections/resumo.py
import streamlit as st
from typing import Any, Dict, List
from core.persist_data import salvar_ficha_json
from core.state import get_ficha_draft, sync_draft_from_aliases

def _coletar_dados_para_salvar(personagem, personalidade, atributos, pericias, armas, armaduras) -> Dict[str, Any]:
    """
    Monta o dicionário final da ficha a partir das seções + session_state.
    Inclui 'outros' e 'efeitos_externos' para persistir por FICHA.
    """
    dados: Dict[str, Any] = {
        "personagem": personagem or {},
        "personalidade": personalidade or {},
        "atributos": atributos or {},
        "pericias": pericias or {},
        "armas": armas or [],
        "armaduras": armaduras or [],
        "outros": st.session_state.get("outros", []),
        "efeitos_externos": st.session_state.get("efeitos_externos", []),
    }

    # Se a imagem estiver em session_state, garante a cópia em personagem
    img_b64 = st.session_state.get("imagem_base64")
    if img_b64:
        dados.setdefault("personagem", {})
        dados["personagem"]["imagem_base64"] = img_b64

    return dados

def render_resumo(personagem: Dict[str, Any], personalidade: Dict[str, Any],
                  atributos: Dict[str, Any], pericias: Dict[str, Any],
                  armas: List[Dict[str, Any]], armaduras: List[Dict[str, Any]]):
    """
    Seção de resumo/salvamento.
    """
    if "resumo_expanded" not in st.session_state:
        st.session_state["resumo_expanded"] = True

    with st.expander("🧾 Resumo & Salvar", expanded=st.session_state["resumo_expanded"]):
        sync_draft_from_aliases()
        draft = get_ficha_draft()
        dados = _coletar_dados_para_salvar(
            draft.get("personagem", personagem),
            draft.get("personalidade", personalidade),
            draft.get("atributos", atributos),
            draft.get("pericias", pericias),
            draft.get("armas", armas),
            draft.get("armaduras", armaduras),
        )

        st.caption("Prévia dos dados que serão salvos no banco de dados:")
        st.json(dados)

        col1, col2 = st.columns([1, 2])
        with col1:
            salvar = st.button("💾 Salvar Ficha", use_container_width=True, key="btn_salvar_ficha")
        with col2:
            st.write("")

        if salvar:
            nome = (dados.get("personagem", {}) or {}).get("nome", "").strip()
            if not nome:
                st.error("Defina um **nome do personagem** em Informações Básicas antes de salvar.")
            else:
                try:
                    salvar_ficha_json(nome, dados)
                    st.success(f"Ficha **{nome}** salva com sucesso!")
                except Exception as e:
                    st.error(f"Falha ao salvar a ficha: {e}")
