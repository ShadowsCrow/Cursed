# Ponto de entrada da ficha de personagem.
import streamlit as st
import json
from core.carregar_fichas_salvas import carregar_fichas_salvas
from core.db import get_database_info, init_database
from core.paths import CATALOGS_DIR
from core.state import (
    ensure_ficha_state,
    get_ficha_draft,
    replace_ficha_draft,
    reset_ficha_draft,
    sync_draft_from_aliases,
    update_ficha_draft_section,
)
from core.version import APP_VERSION

# -----------------------------
# Boot / dados base
# -----------------------------
st.set_page_config(page_title="Ficha de Personagem", layout="wide")
init_database()
ensure_ficha_state()

with (CATALOGS_DIR / "classes.json").open("r", encoding="utf-8") as f:
    dados_classes = json.load(f)

# Carrega raças (com fallback elegante)
try:
    with (CATALOGS_DIR / "racas.json").open("r", encoding="utf-8") as f:
        dados_racas = json.load(f)
    if not isinstance(dados_racas, list):
        st.warning("⚠️ Formato inesperado no catálogo de raças (esperado: lista). Usando lista vazia.")
        dados_racas = []
except FileNotFoundError:
    st.warning("ℹ️ Catálogo de raças não encontrado. O campo Raça ficará como texto livre.")
    dados_racas = []

st.title("📜 Ficha de Personagem")
db_info = get_database_info()
st.caption(f"Versão {APP_VERSION} • Schema {db_info['schema_version']} • Armazenamento: {db_info['database_label']}")

# -----------------------------
# Seleção de fichas salvas
# -----------------------------
fichas = carregar_fichas_salvas()
nomes_fichas = [f["nome"] for f in fichas]
ficha_selecionada = st.selectbox("📂 Carregar ficha existente", ["-- Selecione uma ficha --"] + nomes_fichas)

if ficha_selecionada == "-- Selecione uma ficha --":
    if st.session_state.get("ficha_carregada_nome") is not None:
        reset_ficha_draft()
    st.warning("🧹 Ficha limpa. Nenhuma ficha selecionada.")
else:
    if st.session_state.get("ficha_carregada_nome") != ficha_selecionada:
        ficha = next((f for f in fichas if f["nome"] == ficha_selecionada), None)
        if ficha:
            replace_ficha_draft(ficha["dados"], ficha_nome=ficha_selecionada)
            st.rerun()

# -----------------------------
# Mostrar retrato no topo
# -----------------------------
from app.sections.retrato import render_retrato
render_retrato(top_level=True)
sync_draft_from_aliases()

# -----------------------------
# Importar seções
# -----------------------------
from app.sections.info_basica import render_info_basica
from app.sections.personalidade import render_personalidade
from app.sections.atributos import render_atributos
from app.sections.habilidades import render_habilidades
from app.sections.resumo import render_resumo
from app.sections.pericias import render_pericias
from app.sections.equipamento_tabs import render_equipamento_tabs
from app.sections.armas import render_armas
from app.sections.armadura import render_armadura
from app.sections.outros import render_outros
from app.sections.status import render_status
from app.sections.efeitos import render_efeitos
from app.sections.equip_import import render_equip_import
from app.sections.efeitos_import import render_efeitos_import

# -----------------------------
# Render das seções
# -----------------------------
personagem = render_info_basica(dados_classes, dados_racas)
update_ficha_draft_section("personagem", personagem)

abas_equip = [
    ("⚔️ Armas", render_armas),
    ("🛡️ Armadura", render_armadura),
    ("🎒 Outros", render_outros),
]
equipamento_data = render_equipamento_tabs(abas_equip)

personalidade = render_personalidade()
update_ficha_draft_section("personalidade", personalidade)
atributos = render_atributos()
update_ficha_draft_section("atributos", atributos)
pericias = render_pericias()
update_ficha_draft_section("pericias", pericias)
render_habilidades(personagem["classe_dados"], personagem["arquetipo_dados"])

armas = equipamento_data.get("⚔️ Armas", st.session_state.get("armas", []))
armaduras = equipamento_data.get("🛡️ Armadura", st.session_state.get("armaduras", []))
outros = equipamento_data.get("🎒 Outros", st.session_state.get("outros", []))
update_ficha_draft_section("armas", armas)
update_ficha_draft_section("armaduras", armaduras)
update_ficha_draft_section("outros", outros)

# 🔽 Importações por código
render_equip_import()        # Importar equipamentos (mantido)
render_efeitos_import()      # NOVO: Importar efeitos externos (E1)
draft = sync_draft_from_aliases()
personagem = draft["personagem"]
personalidade = draft["personalidade"]
atributos = draft["atributos"]
pericias = draft["pericias"]
armas = draft["armas"]
armaduras = draft["armaduras"]

status = render_status(personagem, atributos, pericias, armaduras, dados_racas)
efeitos_info = render_efeitos(personagem, atributos, pericias, dados_racas)
render_resumo(personagem, personalidade, atributos, pericias, armas, armaduras)
