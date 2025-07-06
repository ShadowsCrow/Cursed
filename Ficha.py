import streamlit as st
import json
import random

# Configuração da página
st.set_page_config(page_title="Ficha de Personagem", layout="wide")
st.title("📜 Ficha de Personagem")

# Carregar JSON de classes
with open("classes.json", "r", encoding="utf-8") as f:
    dados_classes = json.load(f)

# Lista de classes disponíveis
nomes_classes = [c["nome"] for c in dados_classes]

# --- Seção: Informações Básicas ---
with st.expander("📘 Informações Básicas"):
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

# --- Seção: Personalidade e Comportamento ---
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

with st.expander("🧠 Personalidade e Comportamento"):
    col1, col2 = st.columns(2)
    with col1:
        alinhamento = st.selectbox("Alinhamento:", alinhamentos)
    with col2:
        pecado = st.selectbox(
            "Pecado Capital:",
            list(pecados_emojis.keys()),
            format_func=lambda p: f"{pecados_emojis[p]} {p}"
        )

    if "coisa_favorita_exemplo" not in st.session_state:
        st.session_state["coisa_favorita_exemplo"] = random.choice(exemplos_favorito)
    if "odeia_exemplo" not in st.session_state:
        st.session_state["odeia_exemplo"] = random.choice(exemplos_odeio)
    if "vivo_para_exemplo" not in st.session_state:
        st.session_state["vivo_para_exemplo"] = random.choice(exemplos_vivo_para)

    col3, col4 = st.columns(2)
    with col3:
        coisa_favorita = st.text_input("Coisa favorita:", value=st.session_state["coisa_favorita_exemplo"])
    with col4:
        odeia = st.text_input("O que odeia:", value=st.session_state["odeia_exemplo"])
    vivo_para = st.text_input("Vivo para:", value=st.session_state["vivo_para_exemplo"])

# --- Seção: Atributos ---
atributos = {
    "Força": "💪",
    "Destreza": "🏹",
    "Constituição": "🛡️",
    "Inteligência": "🧠",
    "Sabedoria": "📘",
    "Carisma": "🎭"
}

def calcular_mod(valor):
    return (valor - 10) // 2

with st.expander("🧱 Atributos"):
    colunas = st.columns(3)
    valores_atributos = {}
    modificadores = {}
    vantagens = {}

    idx = 0
    for nome, emoji in atributos.items():
        with colunas[idx]:
            st.markdown(f"### {emoji} {nome}")
            valor = st.number_input(f"{nome}", min_value=1, max_value=30, value=10, key=f"valor_{nome}")
            vant = st.number_input("Vant/Desv", min_value=-5, max_value=5, value=0, step=1, key=f"vant_{nome}")
            mod_base = calcular_mod(valor)
            mod_total = mod_base + vant
            st.text_input("Modificador", f"{'+' if mod_total >= 0 else ''}{mod_total}", disabled=True, key=f"mod_{nome}")
            valores_atributos[nome] = valor
            modificadores[nome] = mod_total
            vantagens[nome] = vant
        idx = (idx + 1) % 3

# --- Seção: Habilidades ---
st.markdown(f"<div style='background-color:{cor_classe}20; padding: 10px; border-radius: 10px;'>", unsafe_allow_html=True)
st.markdown("### 🧠 Habilidades da Classe")
for hab in classe_dados["habilidades"]:
    st.markdown(f"- **{hab['nome']}**: {hab['descricao']}")
st.markdown("</div>", unsafe_allow_html=True)

st.markdown("### 🧬 Habilidades do Arquetipo")
for hab in arquetipo_dados["habilidades"]:
    st.markdown(f"- **{hab['nome']}**: {hab['descricao']}")

# --- Salvar Ficha ---
if st.button("Salvar Ficha"):
    st.success("🎉 Ficha salva com sucesso!")
    st.write("**Resumo da Ficha:**")
    st.write(f"- Nome: {nome}")
    st.write(f"- Classe: {classe_escolhida}")
    st.write(f"- Arquetipo: {arquetipo_escolhido}")
    st.write(f"- Idade: {idade}")
    st.write(f"- Sexo: {sexo}")
    st.write(f"- Raça: {raca}")
    st.write(f"- Alinhamento: {alinhamento}")
    st.write(f"- Pecado Capital: {pecado} {pecados_emojis[pecado]}")
    st.write(f"- Coisa Favorita: {coisa_favorita}")
    st.write(f"- Odeia: {odeia}")
    st.write(f"- Vive para: {vivo_para}")
    st.markdown("**Atributos:**")
    for nome in atributos:
        base = calcular_mod(valores_atributos[nome])
        bonus = vantagens[nome]
        total = modificadores[nome]
        st.write(f"- {nome}: {valores_atributos[nome]} (Base: {base:+}, Ajuste: {bonus:+}, Total: {total:+})")
