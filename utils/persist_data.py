import os
import json

def salvar_ficha_json(personagem, personalidade, atributos, pericias, armas=None, armaduras=None, caminho="fichas"):
    if not os.path.exists(caminho):
        os.makedirs(caminho)

    nome_personagem = (personagem.get("nome", "") or "ficha_sem_nome").strip()
    nome_arquivo = nome_personagem.replace(" ", "_").lower() + ".json"

    dados = {
        "personagem": personagem,
        "personalidade": personalidade,
        "atributos": atributos,
        "pericias": pericias,
        "armas": armas or [],   # <<-- salva armas!
        "armaduras": armaduras or []
    }

    with open(os.path.join(caminho, nome_arquivo), "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    return nome_arquivo
