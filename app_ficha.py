# app_ficha.py
import streamlit as st
import json
import base64
from utils.carregar_fichas_salvas import carregar_fichas_salvas

# -----------------------------
# Boot / dados base
# -----------------------------
st.set_page_config(page_title="Ficha de Personagem", layout="wide")

with open("data/classes.json", "r", encoding="utf-8") as f:
    dados_classes = json.load(f)

# Carrega raças (com fallback elegante)
try:
    with open("data/racas.json", "r", encoding="utf-8") as f:
        dados_racas = json.load(f)
    if not isinstance(dados_racas, list):
        st.warning("⚠️ Formato inesperado em data/racas.json (esperado: lista). Usando lista vazia.")
        dados_racas = []
except FileNotFoundError:
    st.warning("ℹ️ data/racas.json não encontrado. O campo Raça ficará como texto livre.")
    dados_racas = []

st.title("📜 Ficha de Personagem")

# -----------------------------
# Seleção de fichas salvas
# -----------------------------
fichas = carregar_fichas_salvas()
nomes_fichas = [f["nome"] for f in fichas]
ficha_selecionada = st.selectbox("📂 Carregar ficha existente", ["-- Selecione uma ficha --"] + nomes_fichas)

# -----------------------------
# Função de hidratação de estado
# -----------------------------
def _hydrate_state_from_dados(dados: dict, ficha_nome: str):
    st.session_state["personagem"] = dados.get("personagem", {})
    st.session_state["personalidade"] = dados.get("personalidade", {})

    armas_json = dados.get("armas", dados.get("equipamentos", [])) or []
    armaduras_json = dados.get("armaduras", []) or []
    st.session_state["armas"] = [dict(a) for a in armas_json]
    st.session_state["armaduras"] = [dict(p) for p in armaduras_json]
    st.session_state.setdefault("outros", dados.get("outros", []))

    # Efeitos externos (por FICHA)
    st.session_state["efeitos_externos"] = dados.get("efeitos_externos", [])

    if "imagem_base64" in st.session_state["personagem"]:
        st.session_state["imagem_base64"] = st.session_state["personagem"]["imagem_base64"]
    else:
        st.session_state.pop("imagem_base64", None)

    atributos_json = dados.get("atributos", {})
    for nome, v in (atributos_json.get("valores", {}) or {}).items():
        st.session_state[f"valor_{nome}"] = v
    for nome, v in (atributos_json.get("ajustes", {}) or {}).items():
        st.session_state[f"vant_{nome}"] = v

    pericias_json = dados.get("pericias", {})
    for nome, v in (pericias_json.get("valores", {}) or {}).items():
        st.session_state[f"pericia_valor_{nome}"] = v
    for nome, v in (pericias_json.get("ajustes", {}) or {}).items():
        st.session_state[f"pericia_ajuste_{nome}"] = v

    pers = st.session_state["personalidade"]
    st.session_state["coisa_favorita"] = pers.get("coisa_favorita", "")
    st.session_state["odeia"] = pers.get("odeia", "")
    st.session_state["vivo_para"] = pers.get("vivo_para", "")
    st.session_state["alinhamento"] = pers.get("alinhamento", "Neutro | Neutro")
    st.session_state["pecado"] = pers.get("pecado", "Ira")

    st.session_state.setdefault("armas", [])
    st.session_state.setdefault("armaduras", [])
    st.session_state.setdefault("outros", [])
    st.session_state.setdefault("efeitos_externos", [])

    st.session_state["armas_sync_token"] = ficha_nome
    st.session_state["armadura_sync_token"] = ficha_nome
    st.session_state["outros_sync_token"] = ficha_nome
    st.session_state["ficha_carregada_nome"] = ficha_nome

# -----------------------------
# Reset quando NENHUMA ficha
# -----------------------------
if ficha_selecionada == "-- Selecione uma ficha --":
    if st.session_state.get("ficha_carregada_nome") is not None:
        st.session_state.pop("personagem", None)
        st.session_state.pop("personalidade", None)
        st.session_state.pop("imagem_base64", None)
        st.session_state.pop("armas", None)
        st.session_state.pop("armaduras", None)
        st.session_state.pop("outros", None)
        st.session_state.pop("efeitos_externos", None)
        st.session_state.pop("armas_sync_token", None)
        st.session_state.pop("armadura_sync_token", None)
        st.session_state.pop("outros_sync_token", None)
        st.session_state["ficha_carregada_nome"] = None

    st.session_state.setdefault("armas", [])
    st.session_state.setdefault("armaduras", [])
    st.session_state.setdefault("outros", [])
    st.session_state.setdefault("efeitos_externos", [])
    st.warning("🧹 Ficha limpa. Nenhuma ficha selecionada.")

# -----------------------------
# Carga (deferida) da ficha
# -----------------------------
else:
    if st.session_state.get("ficha_carregada_nome") != ficha_selecionada and not st.session_state.get("__needs_hydration"):
        ficha = next((f for f in fichas if f["nome"] == ficha_selecionada), None)
        if ficha:
            st.session_state["__ficha_raw"] = ficha["dados"]
            st.session_state["__target_ficha_nome"] = ficha_selecionada
            st.session_state["__needs_hydration"] = True

if st.session_state.get("__needs_hydration"):
    dados_raw = st.session_state.get("__ficha_raw", {})
    alvo_nome = st.session_state.get("__target_ficha_nome", None)
    if dados_raw and alvo_nome:
        _hydrate_state_from_dados(dados_raw, alvo_nome)
    st.session_state["__needs_hydration"] = False
    st.session_state.pop("__ficha_raw", None)
    st.session_state.pop("__target_ficha_nome", None)
    st.rerun()

# -----------------------------
# Mostrar retrato no topo
# -----------------------------
from sections.retrato import render_retrato
render_retrato(top_level=True)

# -----------------------------
# Importar seções
# -----------------------------
from sections.info_basica import render_info_basica
from sections.personalidade import render_personalidade
from sections.atributos import render_atributos
from sections.habilidades import render_habilidades
from sections.resumo import render_resumo
from sections.pericias import render_pericias
from sections.equipamento_tabs import render_equipamento_tabs
from sections.armas import render_armas
from sections.armadura import render_armadura
from sections.outros import render_outros
from sections.status import render_status
from sections.efeitos import render_efeitos
from sections.equip_import import render_equip_import   # mantém import de equipamento
from sections.efeitos_import import render_efeitos_import  # NOVO: import de efeito

# -----------------------------
# Render das seções
# -----------------------------
personagem = render_info_basica(dados_classes, dados_racas)

abas_equip = [
    ("⚔️ Armas", render_armas),
    ("🛡️ Armadura", render_armadura),
    ("🎒 Outros", render_outros),
]
equipamento_data = render_equipamento_tabs(abas_equip)

personalidade = render_personalidade()
atributos = render_atributos()
pericias = render_pericias()
render_habilidades(personagem["classe_dados"], personagem["arquetipo_dados"])

armas = equipamento_data.get("⚔️ Armas", st.session_state.get("armas", []))
armaduras = equipamento_data.get("🛡️ Armadura", st.session_state.get("armaduras", []))
outros = equipamento_data.get("🎒 Outros", st.session_state.get("outros", []))

# 🔽 Importações por código
render_equip_import()        # Importar equipamentos (mantido)
render_efeitos_import()      # NOVO: Importar efeitos externos (E1)

status = render_status(personagem, atributos, pericias, armaduras, dados_racas)
efeitos_info = render_efeitos(personagem, atributos, pericias, dados_racas)
render_resumo(personagem, personalidade, atributos, pericias, armas, armaduras)
