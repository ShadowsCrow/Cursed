import streamlit as st
import json
from utils.carregar_fichas_salvas import carregar_fichas_salvas

# Carregar dados das classes
with open("data/classes.json", "r", encoding="utf-8") as f:
    dados_classes = json.load(f)

st.set_page_config(
    page_title="Ficha de Personagem", 
    layout="wide"
    )

st.title("📜 Ficha de Personagem")

# Carregar fichas salvas e selecionar
fichas = carregar_fichas_salvas()
nomes_fichas = [f["nome"] for f in fichas]
ficha_selecionada = st.selectbox("📂 Carregar ficha existente", ["-- Selecione uma ficha --"] + nomes_fichas)

# Inicializa imagem como None
imagem_base64 = None

# Verifica se a seleção mudou
if ficha_selecionada == "-- Selecione uma ficha --":
    # Resetar todos os campos
    st.session_state.pop("personagem", None)
    st.session_state.pop("personalidade", None)
    st.session_state.pop("imagem_base64", None)
    st.session_state.pop("ficha_carregada_nome", None)

    # Zera atributos e perícias conhecidos
    atributos_comuns = ["Força", "Destreza", "Constituição", "Inteligência", "Sabedoria", "Carisma"]
    pericias_comuns = [
        "Adestrar Animais", "Arcanismo", "Atletismo", "Atuação", "Enganação", "Furtividade", "História",
        "Intimidação", "Intuição", "Investigação", "Lidar com Animais", "Medicina", "Natureza", "Percepção",
        "Persuasão", "Prestidigitação", "Religião", "Sobrevivência"
    ]

    for nome in atributos_comuns:
        st.session_state.setdefault(f"valor_{nome}", 1)
        st.session_state.setdefault(f"vant_{nome}", 0)

    for nome in pericias_comuns:
        st.session_state.setdefault(f"pericia_valor_{nome}", 0)
        st.session_state.setdefault(f"pericia_ajuste_{nome}", 0)


    st.warning("🧹 Ficha limpa. Nenhuma ficha selecionada.")
else:
    if st.session_state.get("ficha_carregada_nome") != ficha_selecionada:
        ficha = next((f for f in fichas if f["nome"] == ficha_selecionada), None)
        if ficha:
            dados = ficha["dados"]

            # Preencher session_state
            st.session_state["personagem"] = dados["personagem"]
            st.session_state["personalidade"] = dados["personalidade"]

            

            if "imagem_base64" in dados["personagem"]:
                st.session_state["imagem_base64"] = dados["personagem"]["imagem_base64"]
                imagem_base64 = dados["personagem"]["imagem_base64"]
            else:
                st.session_state.pop("imagem_base64", None)
                imagem_base64 = None
 
            for nome in dados["atributos"]["valores"]:
                st.session_state[f"valor_{nome}"] = dados["atributos"]["valores"][nome]
                st.session_state[f"vant_{nome}"] = dados["atributos"]["ajustes"][nome]

            for nome in dados["pericias"]["valores"]:
                st.session_state[f"pericia_valor_{nome}"] = dados["pericias"]["valores"][nome]
                st.session_state[f"pericia_ajuste_{nome}"] = dados["pericias"]["ajustes"][nome]

            # Marcar ficha carregada
            st.session_state["ficha_carregada_nome"] = ficha_selecionada

            st.success(f"✅ Ficha **{ficha_selecionada}** carregada com sucesso!")



# Mostrar retrato no topo (após carregar ficha!)
from sections.retrato import render_retrato
imagem_base64 = render_retrato(top_level=True)

# Importar sessões
from sections.info_basica import render_info_basica
from sections.personalidade import render_personalidade
from sections.atributos import render_atributos
from sections.habilidades import render_habilidades
from sections.resumo import render_resumo
from sections.pericias import render_pericias

# Sessão: Informações Básicas
personagem = render_info_basica(dados_classes)

# Adiciona imagem à ficha (apenas se houver)
if imagem_base64:
    personagem["imagem_base64"] = imagem_base64
else:
    personagem.pop("imagem_base64", None)

# Sessão: Personalidade
personalidade = render_personalidade()

# Sessão: Atributos
atributos = render_atributos()

# Sessão: Perícias
pericias = render_pericias()

# Sessão: Habilidades
render_habilidades(personagem["classe_dados"], personagem["arquetipo_dados"])

# Sessão Final
render_resumo(personagem, personalidade, atributos, pericias)
