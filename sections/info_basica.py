import streamlit as st

def render_info_basica(dados_classes):

    if "info_basica_expandida" not in st.session_state:
        st.session_state["info_basica_expandida"] = True

    with st.expander("📘 Informações Básicas", expanded=st.session_state["info_basica_expandida"]):
        nomes_classes = [c["nome"] for c in dados_classes]
        classe_escolhida = st.selectbox("Classe:", nomes_classes)

        classe_dados = next((c for c in dados_classes if c["nome"] == classe_escolhida), None)
        cor_classe = classe_dados.get("cor", "#333")

        st.markdown(f"<h2 style='color:{cor_classe};'>🧭 Classe: {classe_escolhida}</h2>", unsafe_allow_html=True)

        nomes_arquetipos = [a["nome"] for a in classe_dados["arquetipos"]]
        arquetipo_escolhido = st.selectbox("Arquetipo:", nomes_arquetipos)

        arquetipo_dados = next((a for a in classe_dados["arquetipos"] if a["nome"] == arquetipo_escolhido), None)

        col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
        with col1:
            nome = st.text_input("Nome:")
        with col2:
            idade = st.number_input("Idade:", min_value=0, step=1)
        with col3:
            sexo = st.selectbox("Sexo:", ["", "Masculino", "Feminino", "Outro"])
        with col4:
            raca = st.text_input("Raça:")

    return {
        "nome": nome,
        "idade": idade,
        "sexo": sexo,
        "raca": raca,
        "classe": classe_escolhida,
        "classe_dados": classe_dados,
        "arquetipo": arquetipo_escolhido,
        "arquetipo_dados": arquetipo_dados,
        "cor_classe": cor_classe
    }
