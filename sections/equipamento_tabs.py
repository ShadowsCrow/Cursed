# sections/equipamento_tabs.py
import streamlit as st

def render_equipamento_tabs(tabs_definicoes):
    """
    tabs_definicoes: lista de tuplas (label, função)
        Exemplo:
        [
            ("⚔️ Armas", render_armas),
            ("🛡️ Armadura", render_armadura),
            ("✨ Efeitos", render_efeitos),
        ]
    """
    if "equip_tabs_expanded" not in st.session_state:
        st.session_state["equip_tabs_expanded"] = True

    with st.expander("⚙️ Equipamento", expanded=st.session_state["equip_tabs_expanded"]):
        # Cria as abas dinamicamente a partir das labels
        tabs = st.tabs([t[0] for t in tabs_definicoes])
        resultados = {}

        # Renderiza cada aba chamando sua função correspondente
        for tab, (label, func) in zip(tabs, tabs_definicoes):
            with tab:
                if callable(func):
                    resultados[label] = func()
                else:
                    st.warning(f"A aba '{label}' não possui função associada.")

    return resultados
