import streamlit as st

def render_personalidade():
    alinhamentos = [
        "Leal | Bom", "Neutro | Bom", "Caótico | Bom",
        "Leal | Neutro", "Neutro | Neutro", "Caótico | Neutro",
        "Leal | Mal", "Neutro | Mal", "Caótico | Mal"
    ]

    pecados_emojis = {
        "Ira": "😡", "Gula": "🍔", "Avareza": "💰",
        "Luxúria": "🔥", "Inveja": "👀", "Preguiça": "😴", "Soberba": "👑"
    }

    if "personalidade_expandida" not in st.session_state:
        st.session_state["personalidade_expandida"] = True

    dados = st.session_state.get("personalidade", {})

    with st.expander("🧠 Personalidade", expanded=st.session_state["personalidade_expandida"]):
        col1, col2 = st.columns(2)
        with col1:
            alinhamento = st.selectbox(
                "Alinhamento:",
                alinhamentos,
                index=alinhamentos.index(dados.get("alinhamento", alinhamentos[0]))
            )
        with col2:
            pecado = st.selectbox(
                "Pecado Capital:",
                list(pecados_emojis.keys()),
                index=list(pecados_emojis.keys()).index(dados.get("pecado", "Ira")),
                format_func=lambda p: f"{pecados_emojis[p]} {p}"
            )

        col3, col4 = st.columns(2)
        with col3:
            coisa_favorita = st.text_input("Coisa favorita:", value=dados.get("coisa_favorita", ""), placeholder="Ex: runas antigas")
            odeia = st.text_input("O que odeia:", value=dados.get("odeia", ""), placeholder="Ex: traição")
            quando_me_veem = st.text_input("Quando me veem pensam que:", value=dados.get("quando_me_veem", ""), placeholder="Ex: um sábio distante")
            manias = st.text_input("Manias ou Hábitos:", value=dados.get("manias", ""), placeholder="Ex: roer unha")
        with col4:
            vivo_para = st.text_input("Vivo para:", value=dados.get("vivo_para", ""), placeholder="Ex: proteger os inocentes")
            meu_lema = st.text_input("Meu lema:", value=dados.get("meu_lema", ""), placeholder="Ex: O dever acima de tudo")
            medo = st.text_input("Medo ou Fobia:", value=dados.get("medo", ""), placeholder="Ex: aranhas gigantes")
            valor_inquebravel = st.text_input("Valor inquebrável:", value=dados.get("valor_inquebravel", ""), placeholder="Ex: lealdade")
        
        religiao = st.text_input("Religião ou Crença:", value=dados.get("religiao", ""), placeholder="Ex: Deusa da Lua")

    return {
        "alinhamento": alinhamento,
        "pecado": pecado,
        "coisa_favorita": coisa_favorita,
        "odeia": odeia,
        "vivo_para": vivo_para,
        "emoji_pecado": pecados_emojis[pecado],
        "quando_me_veem": quando_me_veem,
        "meu_lema": meu_lema,
        "manias": manias,
        "medo": medo,
        "valor_inquebravel": valor_inquebravel,
        "religiao": religiao
    }
