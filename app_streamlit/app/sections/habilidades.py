import streamlit as st

def render_habilidades(classe_dados, arquetipo_dados):
    if "habilidades_expandidas" not in st.session_state:
        st.session_state["habilidades_expandidas"] = True

    with st.expander("🧠 Habilidades", expanded=st.session_state["habilidades_expandidas"]):
        cor_classe = classe_dados.get("cor", "#333")

        st.markdown(f"<div style='background-color:{cor_classe}20; padding: 10px; border-radius: 10px;'>", unsafe_allow_html=True)
        st.markdown("### 💼 Habilidades da Classe")
        for hab in classe_dados["habilidades"]:
            status = " 🚧 *Em desenvolvimento*" if hab.get("placeholder") else ""
            st.markdown(f"- **{hab['nome']}**{status}: {hab['descricao']}")
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown("### 🧬 Habilidades do Arquetipo")
        for hab in arquetipo_dados["habilidades"]:
            status = " 🚧 *Em desenvolvimento*" if hab.get("placeholder") else ""
            st.markdown(f"- **{hab['nome']}**{status}: {hab['descricao']}")
