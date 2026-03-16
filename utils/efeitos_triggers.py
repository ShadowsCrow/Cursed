# utils/efeitos_triggers.py
from typing import Any, Dict, List, Set
import unicodedata

def _norm(txt: str) -> str:
    if not isinstance(txt, str):
        return ""
    return "".join(ch for ch in unicodedata.normalize("NFD", txt) if unicodedata.category(ch) != "Mn").lower().strip()

# ----------------- Helpers genéricos (sem Streamlit) -----------------
def attr_total(atributos: Dict[str, Any], nome: str) -> int:
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

def tamanho_modifier_from_raca(raca: str, dados_racas: List[Dict[str, Any]] | None) -> float:
    if not raca or not dados_racas:
        return 1.0
    alvo = None
    rnorm = _norm(raca)
    for r in dados_racas:
        if isinstance(r, dict) and _norm(r.get("nome", "")) == rnorm:
            alvo = r.get("tamanho")
            break
    mapa = {
        "pequena": 0.75, "pequeno": 0.75,
        "media": 1.0, "medio": 1.0, "média": 1.0, "médio": 1.0,
        "grande": 2.0,
        "enorme": 3.0,
    }
    return float(mapa.get(_norm(str(alvo)), 1.0))

def sum_peso_armas(armas: List[Dict[str, Any]] | None) -> float:
    if not armas:
        return 0.0
    tot = 0.0
    for a in armas:
        try:
            peso = float(a.get("peso", 0.0) or 0.0)
            qtd = int(a.get("quantidade", 1) or 1)
            tot += max(0.0, peso) * max(1, qtd)
        except Exception:
            continue
    return tot

def sum_peso_armaduras(armaduras: List[Dict[str, Any]] | None) -> float:
    if not armaduras:
        return 0.0
    tot = 0.0
    for p in armaduras:
        try:
            peso = float(p.get("peso", 0.0) or 0.0)
            qtd = int(p.get("quantidade", 1) or 1)
            tot += max(0.0, peso) * max(1, qtd)
        except Exception:
            continue
    return tot

def sum_peso_outros(outros: List[Dict[str, Any]] | None) -> float:
    if not outros:
        return 0.0
    tot = 0.0
    for it in outros:
        try:
            peso = float(it.get("peso", 0.0) or 0.0)
            qtd = int(it.get("quantidade", 1) or 1)  # compat futuro
            tot += max(0.0, peso) * max(1, qtd)
        except Exception:
            continue
    return tot

# ----------------- Engine de gatilhos -----------------
def evaluate_triggers(
    personagem: Dict[str, Any],
    atributos: Dict[str, Any],
    pericias: Dict[str, Any],
    dados_racas: List[Dict[str, Any]],
    armas: List[Dict[str, Any]],
    armaduras: List[Dict[str, Any]],
    outros: List[Dict[str, Any]],
    bonus_cc: float = 0.0,
) -> Set[str]:
    """
    Retorna um conjunto de 'associacao' de efeitos default ativos.
    Implementado: 'cc_above' (sobrepeso).
    """
    ativos: Set[str] = set()

    # Capacidade de carga
    mod_tam = tamanho_modifier_from_raca(personagem.get("raca", ""), dados_racas)
    forca_total = attr_total(atributos, "Força") or attr_total(atributos, "Forca")
    cc_base = float(forca_total) * 20.0 * float(mod_tam)
    cc_total = cc_base + float(bonus_cc or 0.0)

    # Peso total (inclui não equipados)
    peso_total = sum_peso_armas(armas) + sum_peso_armaduras(armaduras) + sum_peso_outros(outros)

    # Gatinho: cc_above
    if peso_total > cc_total:
        ativos.add("cc_above")

    # (Futuro: outros gatilhos aqui)
    return ativos
