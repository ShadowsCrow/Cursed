import streamlit as st

def render_atributos():
    atributos = {
        "Físicos": {
            "Força": "💪",
            "Destreza": "🏃",
            "Vigor": "🛡️"
        },
        "Sociais": {
            "Carisma": "🎭",
            "Manipulação": "🗣️",
            "Aparência": "✨"
        },
        "Mentais": {
            "Percepção": "👁️",
            "Inteligência": "🧠",
            "Raciocínio": "⚙️"
        }
    }

    if "atributos_expandidos" not in st.session_state:
        st.session_state["atributos_expandidos"] = True

    with st.expander("🧱 Atributos", expanded=st.session_state["atributos_expandidos"]):
        st.markdown("#### 🎲 Distribuição 5 / 3 / 2  | Máximo de 3 contando o inicial")

        valores = {}
        totais = {}
        ajustes = {}

        col_grupos = st.columns(3)
        for idx, (grupo, lista_atributos) in enumerate(atributos.items()):
            with col_grupos[idx]:
                st.markdown(f"### {grupo}")
                for nome, emoji in lista_atributos.items():
                    st.markdown(f"**{emoji} {nome}**")

                    col_valor, col_ajuste, col_total = st.columns([1.5, 1, 1.2])

                    with col_valor:
                        valor = st.number_input(
                            "", min_value=1, max_value=5, value=1,
                            key=f"valor_{nome}", label_visibility="collapsed"
                        )
                    with col_ajuste:
                        ajuste = st.number_input(
                            "", min_value=-5, max_value=5, value=0, step=1,
                            key=f"vant_{nome}", label_visibility="collapsed"
                        )
                    with col_total:
                        total = valor + ajuste
                        st.text_input(
                            "", f"{total}", disabled=True,
                            key=f"total_{nome}", label_visibility="collapsed"
                        )

                    valores[nome] = valor
                    totais[nome] = total
                    ajustes[nome] = ajuste

    return {
        "valores": valores,
        "totais": totais,
        "ajustes": ajustes
    }
