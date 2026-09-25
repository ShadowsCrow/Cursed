# sections/status.py
import streamlit as st
from typing import Any, Dict, List
import unicodedata

# ----------------- Helpers de normalização e lookup -----------------
def _norm(txt: str) -> str:
    """lower + remove acentos + trim"""
    if not isinstance(txt, str):
        return ""
    return "".join(ch for ch in unicodedata.normalize("NFD", txt) if unicodedata.category(ch) != "Mn").lower().strip()

def _tamanho_modifier_from_raca(raca: str, dados_racas: List[Dict[str, Any]] | None) -> float:
    """
    Busca o tamanho da raça e retorna o modificador:
      Pequena/Pequeno -> 0.75
      Média/Médio     -> 1.0
      Grande          -> 2.0
      Enorme          -> 3.0
    Default: 1.0
    """
    if not raca or not dados_racas:
        return 1.0
    nome_norm = _norm(raca)
    tamanho = None
    for r in dados_racas:
        if not isinstance(r, dict):
            continue
        if _norm(r.get("nome", "")) == nome_norm:
            tamanho = r.get("tamanho")
            break

    mapa = {
        "pequena": 0.75,
        "pequeno": 0.75,
        "media": 1.0,
        "medio": 1.0,
        "média": 1.0,   # tolerância caso venha com acento
        "médio": 1.0,
        "grande": 2.0,
        "enorme": 3.0,
    }
    return float(mapa.get(_norm(str(tamanho)), 1.0))

# ----------------- Funções já existentes -----------------
def _attr_total(atributos: Dict[str, Any], nome: str) -> int:
    if not atributos:
        return 0
    totais = atributos.get("totais", {})
    if nome in totais:
        try:
            return int(totais[nome])
        except Exception:
            pass
    valores = atributos.get("valores", {})
    ajustes = atributos.get("ajustes", {})
    base = int(valores.get(nome, 0) or 0)
    aj = int(ajustes.get(nome, 0) or 0)
    return base + aj

def _skill_total(pericias: Dict[str, Any], nome: str) -> int:
    if not pericias:
        return 0
    totais = pericias.get("totais", {})
    if nome in totais:
        try:
            return int(totais[nome])
        except Exception:
            pass
    valores = pericias.get("valores", {})
    ajustes = pericias.get("ajustes", {})
    base = int(valores.get(nome, 0) or 0)
    aj = int(ajustes.get(nome, 0) or 0)
    return base + aj

def _sum_armadura(armaduras: List[Dict[str, Any]] | None) -> int:
    """Soma da proteção de peças EQUIPADAS (armadura * quantidade)."""
    if not armaduras:
        return 0
    total = 0
    for p in armaduras:
        try:
            if not bool(p.get("equipado", False)):
                continue
            ca = int(p.get("armadura", 0) or 0)
            qtd = int(p.get("quantidade", 1) or 1)
            total += max(0, ca) * max(1, qtd)
        except Exception:
            continue
    return total

def _sum_rdb(armaduras: List[Dict[str, Any]] | None) -> int:
    """Soma de RDB de peças EQUIPADAS (rdb * quantidade)."""
    if not armaduras:
        return 0
    total = 0
    for p in armaduras:
        try:
            if not bool(p.get("equipado", False)):
                continue
            rdb = int(p.get("rdb", 0) or 0)
            qtd = int(p.get("quantidade", 1) or 1)
            total += max(0, rdb) * max(1, qtd)
        except Exception:
            continue
    return total

def _deslocamento_da_raca(raca: str, dados_racas: List[Dict[str, Any]] | None) -> int:
    if not raca or not dados_racas:
        return 0
    for r in dados_racas:
        if isinstance(r, dict) and r.get("nome") == raca:
            try:
                return int(r.get("deslocamento", 0) or 0)
            except Exception:
                return 0
    return 0

# --------- PESO (inclui equipados e NÃO equipados) ----------
def _sum_peso_armas(armas: List[Dict[str, Any]] | None) -> float:
    if not armas:
        return 0.0
    total = 0.0
    for a in armas:
        try:
            peso = float(a.get("peso", 0.0) or 0.0)
            qtd = int(a.get("quantidade", 1) or 1)
            total += max(0.0, peso) * max(1, qtd)
        except Exception:
            continue
    return total

def _sum_peso_armaduras(armaduras: List[Dict[str, Any]] | None) -> float:
    if not armaduras:
        return 0.0
    total = 0.0
    for p in armaduras:
        try:
            peso = float(p.get("peso", 0.0) or 0.0)
            qtd = int(p.get("quantidade", 1) or 1)
            total += max(0.0, peso) * max(1, qtd)
        except Exception:
            continue
    return total

def _sum_peso_outros(outros: List[Dict[str, Any]] | None) -> float:
    if not outros:
        return 0.0
    total = 0.0
    for it in outros:
        try:
            peso = float(it.get("peso", 0.0) or 0.0)
            qtd = int(it.get("quantidade", 1) or 1)  # compatível com futuro
            total += max(0.0, peso) * max(1, qtd)
        except Exception:
            continue
    return total

# --------- Linhas de status ---------
def _row_status(label: str, base_value: int, ext_key: str):
    st.session_state.setdefault(ext_key, 0)
    c1, c2, c3 = st.columns([1.3, 1, 1])
    with c1:
        st.text_input(f"{label} (base)", value=str(base_value), disabled=True, key=f"{ext_key}_base_view")
    with c2:
        st.number_input(f"{label} (bônus externo)", min_value=0, step=1,
                        value=int(st.session_state.get(ext_key, 0)), key=ext_key)
    with c3:
        total = base_value + int(st.session_state.get(ext_key, 0))
        st.text_input(f"{label} (total)", value=str(total), disabled=True, key=f"{ext_key}_total_view")
    return {
        "base": base_value,
        "extra": int(st.session_state.get(ext_key, 0)),
        "total": base_value + int(st.session_state.get(ext_key, 0)),
    }

def _row_status_float(label: str, base_value: float, ext_key: str):
    st.session_state.setdefault(ext_key, 0.0)
    c1, c2, c3 = st.columns([1.3, 1, 1])
    with c1:
        st.text_input(f"{label} (base)", value=f"{base_value:.2f}", disabled=True, key=f"{ext_key}_base_view")
    with c2:
        st.number_input(f"{label} (bônus externo)", min_value=0.0, step=0.1,
                        value=float(st.session_state.get(ext_key, 0.0)), key=ext_key)
    with c3:
        total = float(base_value) + float(st.session_state.get(ext_key, 0.0))
        st.text_input(f"{label} (total)", value=f"{total:.2f}", disabled=True, key=f"{ext_key}_total_view")
    return {
        "base": float(base_value),
        "extra": float(st.session_state.get(ext_key, 0.0)),
        "total": float(base_value) + float(st.session_state.get(ext_key, 0.0)),
    }

# ----------------- Render principal -----------------
def render_status(personagem: Dict[str, Any], atributos: Dict[str, Any], pericias: Dict[str, Any],
                  armaduras: List[Dict[str, Any]], dados_racas: List[Dict[str, Any]]):
    """
    Seção 'Status' (consolidação):
      - Deslocamento: da Raça
      - Defesa (Esquiva): Destreza total + Esquiva total
      - Defesa (Armadura): Vigor total + soma das peças EQUIPADAS de armadura
      - RDB (Armadura): soma do RDB das peças EQUIPADAS
      - Peso: soma de Armas + Armaduras + Outros (inclui não equipados)
      - Capacidade de carga: Força × 20 kg × Modificador de Tamanho
    """
    if "status_expanded" not in st.session_state:
        st.session_state["status_expanded"] = True

    with st.expander("Status", expanded=st.session_state["status_expanded"]):
        # Bases de raça
        raca = personagem.get("raca", "")
        desloc_base = _deslocamento_da_raca(raca, dados_racas)
        mod_tamanho = _tamanho_modifier_from_raca(raca, dados_racas)

        # Atributos/perícias
        destreza_total = _attr_total(atributos, "Destreza")
        esquiva_total = _skill_total(pericias, "Esquiva")
        def_esquiva_base = max(0, destreza_total + esquiva_total)

        vigor_total = _attr_total(atributos, "Vigor")
        soma_armas = _sum_armadura(armaduras)
        def_arm_base = max(0, vigor_total + soma_armas)

        rdb_base = _sum_rdb(armaduras)

        # Peso: pega listas direto do session_state (inclui não equipados)
        armas_ss = st.session_state.get("armas", [])
        armaduras_ss = st.session_state.get("armaduras", [])
        outros_ss = st.session_state.get("outros", [])
        peso_base = _sum_peso_armas(armas_ss) + _sum_peso_armaduras(armaduras_ss) + _sum_peso_outros(outros_ss)
        peso_base = round(peso_base, 2)

        # Capacidade de carga
        # Observação: o nome do atributo pode ser "Força" (com acento). Fazemos um fallback para "Forca".
        forca_total = _attr_total(atributos, "Força")
        if forca_total == 0:
            forca_total = _attr_total(atributos, "Forca")
        cc_base = float(forca_total) * 20.0 * float(mod_tamanho)
        cc_base = round(cc_base, 2)

        # Linhas
        bloco = {}
        bloco["deslocamento"] = _row_status("Deslocamento", desloc_base, "status_ext_deslocamento")
        bloco["defesa_esquiva"] = _row_status("Defesa (Esquiva)", def_esquiva_base, "status_ext_def_esquiva")
        bloco["defesa_armadura"] = _row_status("Defesa (Armadura)", def_arm_base, "status_ext_def_armadura")
        bloco["rdb_armadura"] = _row_status("RDB (Armadura)", rdb_base, "status_ext_rdb_armadura")
        bloco["peso_total"] = _row_status_float("Peso", peso_base, "status_ext_peso")
        bloco["capacidade_carga"] = _row_status_float("Capacidade de carga (kg)", cc_base, "status_ext_cc")

    return bloco
