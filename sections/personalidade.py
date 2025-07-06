import streamlit as st
import random

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

    exemplos_favorito = [
        "uma pedra de estimação", "cogumelos brilhantes", "instrumentos antigos",
        "tatuagens rúnicas", "pintar mapas", "andar descalço na chuva"
    ]
    exemplos_odeio = [
        "cheiro de enxofre", "mentirosos", "gatos falantes", "perder tempo",
        "vozes sussurrando", "luz do sol"
    ]
    exemplos_vivo_para = [
        "descobrir os segredos do mundo", "vingar sua família",
        "criar a poção perfeita", "tornar-se uma lenda",
        "provar que os deuses estão errados", "salvar alguém que ama"
    ]

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

        # Exemplo aleatório, apenas se não houver valor carregado da ficha
        coisa_favorita_default = dados.get("coisa_favorita", random.choice(exemplos_favorito))
        odeia_default = dados.get("odeia", random.choice(exemplos_odeio))
        vivo_para_default = dados.get("vivo_para", random.choice(exemplos_vivo_para))

        col3, col4 = st.columns(2)
        with col3:
            coisa_favorita = st.text_input("Coisa favorita:", value=coisa_favorita_default)
        with col4:
            odeia = st.text_input("O que odeia:", value=odeia_default)
        vivo_para = st.text_input("Vivo para:", value=vivo_para_default)

    return {
        "alinhamento": alinhamento,
        "pecado": pecado,
        "coisa_favorita": coisa_favorita,
        "odeia": odeia,
        "vivo_para": vivo_para,
        "emoji_pecado": pecados_emojis[pecado]
    }
