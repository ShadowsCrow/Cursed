# Forjador de Códigos — Efeitos (E1) e Equipamentos (EQ1)
# Execução: streamlit run app/forjador.py

import io
import json
import zlib
import base64
from typing import Any, Dict, List
import streamlit as st

from core.paths import CATALOGS_DIR

# ----------------------------
# Helpers (codec)
# ----------------------------
def _urlsafe_b64encode_no_pad(data: bytes) -> str:
    tok = base64.urlsafe_b64encode(data).decode("ascii")
    return tok.rstrip("=")

def _encode_payload(prefix: str, payload: Dict[str, Any]) -> str:
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    comp = zlib.compress(raw, 9)
    return f"{prefix}:{_urlsafe_b64encode_no_pad(comp)}"

def encode_effect_E1(effect: Dict[str, Any]) -> str:
    """
    effect: {nome: str, descricao: str, imagem_base64?: str}
    """
    if not isinstance(effect, dict):
        raise ValueError("effect deve ser dict")
    if not (isinstance(effect.get("nome"), str) and effect["nome"].strip()):
        raise ValueError("Efeito: 'nome' obrigatório")
    if not (isinstance(effect.get("descricao"), str) and effect["descricao"].strip()):
        raise ValueError("Efeito: 'descricao' obrigatória")
    payload = {
        "nome": effect["nome"].strip(),
        "descricao": effect["descricao"].strip(),
    }
    img = effect.get("imagem_base64")
    if isinstance(img, str) and img.strip():
        payload["imagem_base64"] = img.strip()
    return _encode_payload("E1", payload)

VALID_EQUIP_TYPES = {"arma", "armadura", "outro"}

def encode_equipment_EQ1(tipo: str, item: Dict[str, Any], efeitos: List[Dict[str, Any]]) -> str:
    """
    tipo in {"arma","armadura","outro"}
    item: dict com campos do equipamento
    efeitos: lista com objetos:
      - default: {"kind":"default","associacao":"...", "nome?":"...", "descricao?":"..."}
      - externo: {"kind":"externo","nome":"...","descricao":"...","imagem_base64?":"..."}
    """
    t = (tipo or "").strip().lower()
    if t not in VALID_EQUIP_TYPES:
        raise ValueError("tipo inválido (use: arma | armadura | outro)")
    if not isinstance(item, dict) or not item:
        raise ValueError("item inválido (dict esperado)")
    if not isinstance(efeitos, list):
        raise ValueError("efeitos inválidos (lista esperada)")
    for ef in efeitos:
        if not isinstance(ef, dict) or "kind" not in ef:
            raise ValueError("efeito malformado (dict com 'kind' esperado)")
        if ef["kind"] == "default":
            if not (isinstance(ef.get("associacao"), str) and ef["associacao"].strip()):
                raise ValueError("efeito default requer 'associacao'")
        elif ef["kind"] == "externo":
            if not (isinstance(ef.get("nome"), str) and ef.get("descricao")):
                raise ValueError("efeito externo requer 'nome' e 'descricao'")
        else:
            raise ValueError("efeito.kind desconhecido")
    payload = {"tipo": t, "item": item, "efeitos": efeitos}
    return _encode_payload("EQ1", payload)

# ----------------------------
# Helpers (UI/arquivos)
# ----------------------------
def file_to_b64(file) -> str:
    """Converte o arquivo enviado (PNG/JPG) para base64 (sem cabeçalho data:)."""
    if file is None:
        return ""
    data = file.read()
    return base64.b64encode(data).decode("ascii")

def tipos_dano_opcoes() -> List[str]:
    # Tenta ler o catálogo de tipos de dano, com fallback.
    try:
        with (CATALOGS_DIR / "tipos_dano.json").open("r", encoding="utf-8") as f:
            raw = json.load(f)
        if isinstance(raw, dict) and isinstance(raw.get("tipos"), list):
            return [str(x) for x in raw["tipos"]]
        if isinstance(raw, list):
            return [str(x) for x in raw]
    except Exception:
        pass
    return ["Cortante", "Perfurante", "Concussão", "Fogo", "Gelo", "Ácido", "Relâmpago", "Psíquico"]

def download_text_button(label: str, filename: str, content: str, key: str):
    b = content.encode("utf-8")
    st.download_button(label, data=b, file_name=filename, mime="text/plain", key=key, use_container_width=True)

def show_code_block(code: str):
    st.text_area("Código gerado", value=code, height=120, label_visibility="collapsed")

# ----------------------------
# App
# ----------------------------
st.set_page_config(page_title="Forjador de Códigos — Cursed RPG", layout="centered")
st.title("🛠️ Forjador de Códigos — Cursed RPG")

tabs = st.tabs(["✨ Efeito externo (E1)", "⚔️🛡️🎒 Equipamento (EQ1)"])

# ----------------------------
# Aba 1: Efeito Externo (E1)
# ----------------------------
with tabs[0]:
    st.subheader("Criar código de efeito externo (E1)")
    col1, col2 = st.columns([2, 1])
    with col1:
        ef_nome = st.text_input("Nome do efeito", key="ef_nome")
        ef_desc = st.text_area("Descrição do efeito", key="ef_desc", height=120)
    with col2:
        up = st.file_uploader("Imagem (PNG/JPG)", type=["png", "jpg", "jpeg"], key="ef_img")
        ef_b64 = file_to_b64(up) if up else ""

    if st.button("Gerar código E1", type="primary", use_container_width=True, key="btn_make_e1"):
        try:
            code = encode_effect_E1({"nome": ef_nome, "descricao": ef_desc, "imagem_base64": ef_b64})
            st.success("Código E1 gerado!")
            show_code_block(code)
            download_text_button("⬇️ Baixar .txt", "efeito_E1.txt", code, key="dl_e1")
        except Exception as e:
            st.error(f"Falha ao gerar: {e}")

    with st.expander("JSON pré-visualização"):
        st.code(
            json.dumps(
                {
                    "nome": ef_nome,
                    "descricao": ef_desc,
                    **({"imagem_base64": ef_b64[:32] + "..."} if ef_b64 else {}),
                },
                ensure_ascii=False,
                indent=2,
            ),
            language="json",
        )

# ----------------------------
# Aba 2: Equipamento (EQ1)
# ----------------------------
with tabs[1]:
    st.subheader("Criar código de equipamento (EQ1)")

    # Efeitos associados no equipamento (guardados no state enquanto monta o item)
    st.session_state.setdefault("eq_efeitos", [])

    # Tipo de equipamento
    tipo = st.selectbox("Tipo", ["arma", "armadura", "outro"], key="eq_tipo")

    # Campos do ITEM
    item: Dict[str, Any] = {"nome": st.text_input("Nome do item", key="it_nome")}
    if tipo == "arma":
        td_ops = tipos_dano_opcoes()
        c1, c2, c3 = st.columns(3)
        with c1:
            item["dano"] = st.text_input("Dano (XdY +/-Z)", key="it_dano")
        with c2:
            item["tipo_dano"] = st.selectbox("Tipo de dano", td_ops, key="it_tipodano")
        with c3:
            item["critico"] = st.number_input("Crítico (x)", min_value=1, step=1, value=2, key="it_crit")
        c4, c5 = st.columns(2)
        with c4:
            item["quantidade"] = st.number_input("Quantidade", min_value=1, step=1, value=1, key="it_qtd")
        with c5:
            item["peso"] = st.number_input("Peso (kg)", min_value=0.0, step=0.1, value=0.0, key="it_peso")
        item["descricao"] = st.text_area("Descrição", key="it_desc", height=80)

    elif tipo == "armadura":
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            item["armadura"] = st.number_input("CA (armadura)", min_value=0, step=1, value=0, key="it_ca")
        with c2:
            item["rdb"] = st.number_input("RDB", min_value=0, step=1, value=0, key="it_rdb")
        with c3:
            item["penalidade_destreza"] = st.number_input("Penal. Destreza", min_value=0, step=1, value=0, key="it_pdx")
        with c4:
            item["penalidade_deslocamento"] = st.number_input("Penal. Desloc.", min_value=0, step=1, value=0, key="it_pdesl")
        c5, c6 = st.columns(2)
        with c5:
            item["categoria"] = st.selectbox("Categoria", ["Leve", "Média", "Pesada", "Escudo"], key="it_cat")
        with c6:
            item["quantidade"] = st.number_input("Quantidade", min_value=1, step=1, value=1, key="it_qtd")
        item["peso"] = st.number_input("Peso (kg)", min_value=0.0, step=0.1, value=0.0, key="it_peso")
        item["descricao"] = st.text_area("Descrição", key="it_desc", height=80)

    else:  # outro
        c1, c2 = st.columns(2)
        with c1:
            item["peso"] = st.number_input("Peso (kg)", min_value=0.0, step=0.1, value=0.0, key="it_peso")
        with c2:
            item["quantidade"] = st.number_input("Quantidade", min_value=1, step=1, value=1, key="it_qtd")
        item["descricao"] = st.text_area("Descrição", key="it_desc", height=80)

    st.markdown("---")

    # -----------------------------------
    # Efeitos associados ao equipamento
    # -----------------------------------
    st.markdown("### Efeitos associados (opcional)")
    with st.container(border=True):
        t = st.radio("Tipo de efeito", ["default (associação)", "externo (com imagem opcional)"], horizontal=True, key="ef_kind_pick")

        if t.startswith("default"):
            colA, colB = st.columns([2, 1])
            with colA:
                assoc = st.text_input("associacao (ex.: cc_above)", key="ef_assoc")
            with colB:
                st.caption("Opcional (override):")
                ov_nome = st.text_input("nome (override)", key="ef_ov_nome")
            ov_desc = st.text_area("descricao (override)", key="ef_ov_desc", height=80)  # <- ajustado para 80
            if st.button("➕ Adicionar efeito default", key="btn_add_def", use_container_width=True):
                if not assoc.strip():
                    st.warning("Informe 'associacao' para o efeito default.")
                else:
                    st.session_state["eq_efeitos"].append(
                        {"kind": "default", "associacao": assoc.strip(), **({"nome": ov_nome.strip()} if ov_nome.strip() else {}), **({"descricao": ov_desc.strip()} if ov_desc.strip() else {})}
                    )
                    st.success("Efeito default adicionado!")

        else:
            col1, col2 = st.columns([2, 1])
            with col1:
                en_nome = st.text_input("Nome do efeito externo", key="en_nome")
                en_desc = st.text_area("Descrição do efeito externo", key="en_desc", height=80)  # <- ajustado para 80
            with col2:
                up2 = st.file_uploader("Imagem do efeito (PNG/JPG)", type=["png", "jpg", "jpeg"], key="en_img")
                en_b64 = file_to_b64(up2) if up2 else ""
            if st.button("➕ Adicionar efeito externo", key="btn_add_ext", use_container_width=True):
                if not (en_nome.strip() and en_desc.strip()):
                    st.warning("Preencha nome e descrição do efeito externo.")
                else:
                    ef = {"kind": "externo", "nome": en_nome.strip(), "descricao": en_desc.strip()}
                    if en_b64:
                        ef["imagem_base64"] = en_b64
                    st.session_state["eq_efeitos"].append(ef)
                    st.success("Efeito externo adicionado!")

        # Lista atual
        st.markdown("#### Efeitos atuais do item")
        if not st.session_state["eq_efeitos"]:
            st.caption("Nenhum efeito associado ainda.")
        else:
            for idx, ef in enumerate(st.session_state["eq_efeitos"]):
                lbl = f"[{ef['kind']}] " + (ef.get("associacao", ef.get("nome", "sem nome")))
                colx, coly = st.columns([6, 1])
                with colx:
                    st.write(f"• {lbl}")
                with coly:
                    if st.button("🗑️", key=f"del_ef_{idx}", use_container_width=True):
                        st.experimental_rerun()

    st.markdown("---")

    # Gerar código EQ1
    if st.button("Gerar código EQ1", type="primary", use_container_width=True, key="btn_make_eq1"):
        try:
            code = encode_equipment_EQ1(tipo, item, st.session_state["eq_efeitos"])
            st.success("Código EQ1 gerado!")
            show_code_block(code)
            download_text_button("⬇️ Baixar .txt", f"equip_{tipo}_EQ1.txt", code, key="dl_eq1")
        except Exception as e:
            st.error(f"Falha ao gerar: {e}")

    with st.expander("JSON pré-visualização"):
        preview = {
            "tipo": tipo,
            "item": item,
            "efeitos": [
                {**ef, **({"imagem_base64": (ef["imagem_base64"][:32] + "...")} if isinstance(ef.get("imagem_base64"), str) and ef["imagem_base64"] else {})}
                for ef in st.session_state["eq_efeitos"]
            ],
        }
        st.code(json.dumps(preview, ensure_ascii=False, indent=2), language="json")

    st.caption("Dica: cole o EQ1 gerado em **📥 Importar Equipamento** da sua ficha.")
