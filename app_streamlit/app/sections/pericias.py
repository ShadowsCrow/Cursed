import streamlit as st
from data.catalogs import descricoes_pericias

def render_pericias():
    categorias = {
        "Talentos": [
            "Prontidão", "Esportes", "Briga", "Esquiva", "Empatia",
            "Expressão", "Intimidação", "Liderança", "Conhecimento urbano", "Lábia"
        ],
        "Perícias": [
            "Lidar com animais", "Oficios", "Pilotagem", "Etiqueta", "Longo alcance",
            "Armas Brancas", "Performance", "Prestidigitação", "Furtividade", "Sobrevivência"
        ],
        "Conhecimento": [
            "Acadêmicos", "Arcanismo", "Finanças", "Investigação", "Direito",
            "Linguistica", "Medicina", "Ocultismo", "Politica", "Natureza"
        ]
    }

    if "pericias_expandidas" not in st.session_state:
        st.session_state["pericias_expandidas"] = True

    with st.expander("📚 Perícias", expanded=st.session_state["pericias_expandidas"]):
        st.markdown("#### 🎯 Distribuição 3 em 1 relacionado a Especialização, 2 em 3 relacionados em Hobbie, 1 em 4 relacionado a Experiencia.")

        valores = {}
        totais = {}
        ajustes = {}

        col_grupos = st.columns(3)
        for idx, (grupo, lista) in enumerate(categorias.items()):
            with col_grupos[idx]:
                st.markdown(f"### {grupo}")
                for nome in lista:
                    if nome in descricoes_pericias.descricoes:
                        st.markdown(
                            f"<span style='font-weight:600'>{nome}</span> "
                            f"<span title='{descricoes_pericias.descricoes[nome]}' style='cursor:help;'>ℹ️</span>",
                            unsafe_allow_html=True
                        )
                    else:
                        st.markdown(f"**{nome}**")

                    col_valor, col_ajuste, col_total = st.columns([1.5, 1, 1.2])

                    with col_valor:
                        valor = st.number_input(
                            "", min_value=0, max_value=10, value=0,
                            key=f"pericia_valor_{nome}", label_visibility="collapsed"
                        )
                    with col_ajuste:
                        ajuste = st.number_input(
                            "", min_value=-5, max_value=10, value=0, step=1,
                            key=f"pericia_ajuste_{nome}", label_visibility="collapsed"
                        )
                    with col_total:
                        total = valor + ajuste
                        st.text_input(
                            "", f"{total}", disabled=True,
                            key=f"pericia_total_{nome}", label_visibility="collapsed"
                        )

                    valores[nome] = valor
                    totais[nome] = total
                    ajustes[nome] = ajuste

    return {
        "valores": valores,
        "totais": totais,
        "ajustes": ajustes
    }
