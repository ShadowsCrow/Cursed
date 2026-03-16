# sections/efeitos.py
import os
import json
import html
import base64
import re
import streamlit as st
from typing import Any, Dict, List, Set, Tuple

from utils.efeitos_triggers import evaluate_triggers
from utils.effects_library import load_effects_library, delete_from_effects_library

DEFAULT_ICON_DIR = "data/efeitos_default_icons"
DEFAULT_JSON_PATH = "data/efeitos_default.json"

# ====== Configs visuais rápidas ======
TILE_SIZE = 80          # tamanho do ícone (largura/altura) -> AUMENTADO
COLS_ATIVOS = 8         # nº de colunas por linha na aba "Ativos" -> MENOS colunas
COLS_BIBLIOTECA = 6     # nº de colunas por linha na aba "Biblioteca" -> MENOS colunas

def _mtime_or_zero(path: str) -> float:
    try:
        return os.path.getmtime(path)
    except Exception:
        return 0.0

@st.cache_data(show_spinner=False)
def _load_json_list(path: str, mtime: float) -> List[Dict[str, Any]]:
    try:
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []

def _collect_default_effects_by_assoc(efeitos_default: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for ef in efeitos_default:
        if isinstance(ef, dict):
            assoc = str(ef.get("associacao", "")).strip()
            if assoc:
                out[assoc] = ef
    return out

@st.cache_data(show_spinner=False)
def _img_file_to_b64(path_or_name: str, file_mtime: float) -> str:
    if not isinstance(path_or_name, str) or not path_or_name.strip():
        return ""
    p = path_or_name
    if not os.path.isabs(p):
        p = os.path.join(DEFAULT_ICON_DIR, path_or_name)
    try:
        with open(p, "rb") as f:
            return base64.b64encode(f.read()).decode("ascii")
    except Exception:
        return ""

def _sanitize_key(k: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]+", "_", k)

def _effect_tile(html_img: str, nome: str, desc: str) -> str:
    tip_html = f"<b>{html.escape(nome)}</b>" + (("<br>" + html.escape(desc)) if desc else "")
    return (f"<div class='eff'>{html_img}<span class='tip'>{tip_html}</span></div>")

def _build_active_effects(personagem: Dict[str, Any],
                          atributos: Dict[str, Any],
                          pericias: Dict[str, Any],
                          dados_racas: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Retorna (deduped_effects, default_by_assoc).
    Cada effect: {nome, descricao, b64, key, origin, ext_index?}
      origin in {"default","eq","externo"}
      ext_index: índice no st.session_state["efeitos_externos"] quando origin=="externo"
    """
    efeitos_default = _load_json_list(DEFAULT_JSON_PATH, _mtime_or_zero(DEFAULT_JSON_PATH))
    default_by_assoc = _collect_default_effects_by_assoc(efeitos_default)

    armas = st.session_state.get("armas", [])
    armaduras = st.session_state.get("armaduras", [])
    outros = st.session_state.get("outros", [])
    bonus_cc = float(st.session_state.get("status_ext_cc", 0.0) or 0.0)

    gatilhos_ativos = evaluate_triggers(
        personagem=personagem, atributos=atributos, pericias=pericias, dados_racas=dados_racas,
        armas=armas, armaduras=armaduras, outros=outros, bonus_cc=bonus_cc
    )

    ativos: List[Dict[str, Any]] = []

    # 1) Defaults engatilhados
    for assoc in gatilhos_ativos:
        ef = default_by_assoc.get(assoc)
        if isinstance(ef, dict):
            nome = str(ef.get("nome", "Efeito"))
            desc = str(ef.get("descricao", ""))
            b64 = ""
            img_file = str(ef.get("imagem", "")).strip()
            if img_file:
                b64 = _img_file_to_b64(img_file, _mtime_or_zero(os.path.join(DEFAULT_ICON_DIR, img_file)))
            elif isinstance(ef.get("imagem_base64", ""), str):
                b64 = ef.get("imagem_base64", "")
            key = f"default:{assoc}"
            ativos.append({"nome": nome, "descricao": desc, "b64": b64, "key": key, "origin": "default"})
        else:
            ativos.append({"nome": assoc, "descricao": "Efeito padrão sem configuração.", "b64": "", "key": f"default:{assoc}", "origin": "default"})

    # 2) Externos por FICHA
    for idx, ef in enumerate(st.session_state.get("efeitos_externos", [])):
        if not isinstance(ef, dict):
            continue
        nome = str(ef.get("nome", "Efeito"))
        desc = str(ef.get("descricao", ""))
        b64 = ef.get("imagem_base64", "")
        key = f"externo:{nome}:{idx}"
        ativos.append({"nome": nome, "descricao": desc, "b64": b64 if isinstance(b64, str) else "", "key": key, "origin": "externo", "ext_index": idx})

    # 3) De equipamentos equipados
    def _add_from_items(items: List[Dict[str, Any]], prefix: str):
        for it in items or []:
            if not it or not it.get("equipado", False):
                continue
            efeitos = it.get("efeitos", [])
            if not isinstance(efeitos, list):
                continue
            for j, ef in enumerate(efeitos):
                if not isinstance(ef, dict) or "kind" not in ef:
                    continue
                if ef["kind"] == "default":
                    assoc = str(ef.get("associacao", "")).strip()
                    if not assoc:
                        continue
                    meta = default_by_assoc.get(assoc, {})
                    nome = str(ef.get("nome") or meta.get("nome") or assoc)
                    desc = str(ef.get("descricao") or meta.get("descricao") or "")
                    b64 = ""
                    img_file = str(meta.get("imagem", "")).strip()
                    if img_file:
                        b64 = _img_file_to_b64(img_file, _mtime_or_zero(os.path.join(DEFAULT_ICON_DIR, img_file)))
                    elif isinstance(meta.get("imagem_base64", ""), str):
                        b64 = meta.get("imagem_base64", "")
                    key = f"eq:{prefix}:default:{assoc}:{j}"
                    ativos.append({"nome": nome, "descricao": desc, "b64": b64, "key": key, "origin": "eq"})
                elif ef["kind"] == "externo":
                    nome = str(ef.get("nome", "Efeito"))
                    desc = str(ef.get("descricao", ""))
                    b64 = ef.get("imagem_base64", "")
                    key = f"eq:{prefix}:externo:{nome}:{j}"
                    ativos.append({"nome": nome, "descricao": desc, "b64": b64 if isinstance(b64, str) else "", "key": key, "origin": "eq"})

    _add_from_items(armas, "arma")
    _add_from_items(armaduras, "armadura")
    _add_from_items(outros, "outro")

    # Dedup (por key)
    seen: Set[str] = set()
    deduped: List[Dict[str, Any]] = []
    for ef in ativos:
        if ef["key"] in seen:
            continue
        seen.add(ef["key"])
        deduped.append(ef)

    return deduped, default_by_assoc

def render_efeitos(personagem: Dict[str, Any], atributos: Dict[str, Any], pericias: Dict[str, Any], dados_racas: List[Dict[str, Any]]):
    """
    Sessão 'Efeitos' com duas abas:
      - Ativos: mostra os efeitos atuais (ícones clicáveis para remover/ocultar)
      - Biblioteca: mostra os efeitos externos da biblioteca (➕ adicionar à ficha, 🗑️ apagar da biblioteca)
    """
    if "efeitos_expanded" not in st.session_state:
        st.session_state["efeitos_expanded"] = True
    st.session_state.setdefault("efeitos_externos", [])
    st.session_state.setdefault("efeitos_enabled_map", {})  # mapa de ocultação para default/eq (não remove fonte)

    deduped, _default_by_assoc = _build_active_effects(personagem, atributos, pericias, dados_racas)

    # Inicializa enable map para chaves novas
    enabled_map: Dict[str, bool] = st.session_state["efeitos_enabled_map"]
    for ef in deduped:
        enabled_map.setdefault(ef["key"], True)
    # Remove órfãos
    keys_now = {e["key"] for e in deduped}
    for k in list(enabled_map.keys()):
        if k not in keys_now:
            enabled_map.pop(k, None)
    st.session_state["efeitos_enabled_map"] = enabled_map

    with st.expander("✨ Efeitos", expanded=st.session_state["efeitos_expanded"]):
        # Estilos
        st.markdown(
            f"""
            <style>
              .efeitos-grid {{ display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; padding-bottom:10px; }}
              /* wrapper para centralizar o tile dentro das colunas */
              .eff-cell {{ display:flex; justify-content:center; }}
              .eff {{ position:relative; width:{TILE_SIZE}px; height:{TILE_SIZE}px; display:flex; align-items:center; justify-content:center;
                     border-radius:12px; overflow:visible; border:1px solid rgba(255,255,255,0.15);
                     background:rgba(250,250,250,0.05); box-shadow:0 2px 10px rgba(0,0,0,0.18) inset; }}
              .eff img {{ width:100%; height:100%; object-fit:cover; display:block; border-radius:12px; }}
              .eff .tip {{ visibility:hidden; opacity:0; transition:opacity .12s ease; position:absolute; z-index:1000;
                          top:50%; left:calc(100% + 12px); transform:translateY(-50%);
                          background:rgba(20,20,20,0.96); color:#fff; padding:12px 14px; border-radius:12px;
                          min-width:260px; max-width:460px; font-size:13px; line-height:1.5;
                          box-shadow:0 10px 24px rgba(0,0,0,0.35); white-space:pre-wrap; overflow-wrap:anywhere; hyphens:auto; }}
              .eff .tip:after{{ content:""; position:absolute; left:-6px; top:50%; transform:translateY(-50%);
                               border-width:6px; border-style:solid; border-color:transparent rgba(20,20,20,0.96) transparent transparent; }}
              .eff:hover .tip {{ visibility:visible; opacity:1; }}
              .eff-empty {{ font-size:11px; color:rgba(255,255,255,0.75); text-align:center; padding:8px 0 0 0; }}
            </style>
            """,
            unsafe_allow_html=True,
        )

        tab_ativos, tab_biblio = st.tabs(["Ativos", "Biblioteca"])

        # -------------------- ABA ATIVOS --------------------
        with tab_ativos:
            ativos_visiveis = [e for e in deduped if enabled_map.get(e["key"], True)]
            if not ativos_visiveis:
                st.markdown("<div class='eff-empty'>Nenhum efeito ativo no momento.</div>", unsafe_allow_html=True)
            else:
                cols_per_row = COLS_ATIVOS
                rows = (len(ativos_visiveis) + cols_per_row - 1) // cols_per_row
                idx_global = 0
                for _ in range(rows):
                    cols = st.columns(cols_per_row)
                    for col_i in range(cols_per_row):
                        if idx_global >= len(ativos_visiveis):
                            break
                        ef = ativos_visiveis[idx_global]
                        nome = str(ef.get("nome", "Efeito"))
                        desc = str(ef.get("descricao", ""))
                        b64 = ef.get("b64", "")
                        if isinstance(b64, str) and b64.strip():
                            src = f"data:image/png;base64,{b64}"
                            img_html = f"<img alt='{html.escape(nome)}' src='{src}' />"
                        else:
                            img_html = ("<div style='width:100%;height:100%;display:flex;align-items:center;justify-content:center;"
                                        "font-size:28px;opacity:.7;'>✨</div>")
                        with cols[col_i]:
                            st.markdown("<div class='eff-cell'>" + _effect_tile(img_html, nome, desc) + "</div>", unsafe_allow_html=True)
                            btn_key = f"eff_rm_{_sanitize_key(ef['key'])}"
                            if st.button("✖", key=btn_key, help="Clique para remover (externo) ou ocultar (default/equip.)", use_container_width=True):
                                if ef["origin"] == "externo" and "ext_index" in ef:
                                    idx = int(ef["ext_index"])
                                    lista = st.session_state.get("efeitos_externos", [])
                                    if 0 <= idx < len(lista):
                                        lista.pop(idx)
                                        st.session_state["efeitos_externos"] = lista
                                else:
                                    enabled_map[ef["key"]] = False
                                st.rerun()
                        idx_global += 1

        # -------------------- ABA BIBLIOTECA --------------------
        with tab_biblio:
            lib = load_effects_library()
            if not lib:
                st.caption("Biblioteca vazia. Use **📥 Importar Efeito Externo** para adicionar.")
            else:
                cols_per_row = COLS_BIBLIOTECA
                rows = (len(lib) + cols_per_row - 1) // cols_per_row
                li = 0
                for _ in range(rows):
                    cols = st.columns(cols_per_row)
                    for c in range(cols_per_row):
                        if li >= len(lib):
                            break
                        ef = lib[li] or {}
                        nome = str(ef.get("nome", "Efeito"))
                        desc = str(ef.get("descricao", ""))
                        b64 = ef.get("imagem_base64", "")
                        if isinstance(b64, str) and b64.strip():
                            src = f"data:image/png;base64,{b64}"
                            img_html = f"<img alt='{html.escape(nome)}' src='{src}' />"
                        else:
                            img_html = ("<div style='width:100%;height:100%;display:flex;align-items:center;justify-content:center;"
                                        "font-size:28px;opacity:.7;'>✨</div>")
                        with cols[c]:
                            st.markdown("<div class='eff-cell'>" + _effect_tile(img_html, nome, desc) + "</div>", unsafe_allow_html=True)
                            c1, c2 = st.columns(2)
                            with c1:
                                if st.button("➕", key=f"lib_add_{li}", help="Adicionar à ficha", use_container_width=True):
                                    st.session_state.setdefault("efeitos_externos", [])
                                    st.session_state["efeitos_externos"].append(ef)
                                    st.rerun()
                            with c2:
                                if st.button("🗑️", key=f"lib_del_{li}", help="Apagar da biblioteca", use_container_width=True):
                                    if delete_from_effects_library(li):
                                        st.rerun()
                        li += 1

    ativos_nomes = [e["nome"] for e in deduped if st.session_state["efeitos_enabled_map"].get(e["key"], True)]
    return {"ativos": ativos_nomes, "qtde": len(ativos_nomes)}
