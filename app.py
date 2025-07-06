import streamlit as st
import json
from utils.carregar_fichas_salvas import carregar_fichas_salvas

# Carregar dados das classes
with open("data/classes.json", "r", encoding="utf-8") as f:
    dados_classes = json.load(f)

st.set_page_config(page_title="Ficha de Personagem", layout="wide")
st.title("📜 Ficha de Personagem")

# Carregar fichas salvas e selecionar
fichas = carregar_fichas_salvas()
nomes_fichas = [f["nome"] for f in fichas]
ficha_selecionada = st.selectbox("📂 Carregar ficha existente", ["-- Selecione uma ficha --"] + nomes_fichas)

# Verifica se a seleção mudou
if ficha_selecionada != "-- Selecione uma ficha --":
    if st.session_state.get("ficha_carregada_nome") != ficha_selecionada:
        ficha = next((f for f in fichas if f["nome"] == ficha_selecionada), None)
        if ficha:
            dados = ficha["dados"]

            # Preencher session_state
            st.session_state["personagem"] = dados["personagem"]
            st.session_state["personalidade"] = dados["personalidade"]

            for nome in dados["atributos"]["valores"]:
                st.session_state[f"valor_{nome}"] = dados["atributos"]["valores"][nome]
                st.session_state[f"vant_{nome}"] = dados["atributos"]["ajustes"][nome]

            for nome in dados["pericias"]["valores"]:
                st.session_state[f"pericia_valor_{nome}"] = dados["pericias"]["valores"][nome]
                st.session_state[f"pericia_ajuste_{nome}"] = dados["pericias"]["ajustes"][nome]

            # Marcar ficha carregada
            st.session_state["ficha_carregada_nome"] = ficha_selecionada

            st.success(f"✅ Ficha **{ficha_selecionada}** carregada com sucesso!")

# Importar sessões
from sections.info_basica import render_info_basica
from sections.personalidade import render_personalidade
from sections.atributos import render_atributos
from sections.habilidades import render_habilidades
from sections.resumo import render_resumo
from sections.pericias import render_pericias

# Sessão: Informações Básicas
personagem = render_info_basica(dados_classes)

# Sessão: Personalidade
personalidade = render_personalidade()

# Sessão: Atributos
atributos = render_atributos()

# Sessão: Perícias
pericias = render_pericias()

# Sessão: Habilidades
render_habilidades(personagem["classe_dados"], personagem["arquetipo_dados"])

# Botão Final
render_resumo(personagem, personalidade, atributos, pericias)
