import os
import json

def salvar_ficha_json(personagem, personalidade, atributos, pericias, caminho="fichas"):
    if not os.path.exists(caminho):
        os.makedirs(caminho)

    # Tratativa para nome inválido ou vazio
    nome_personagem = personagem.get("nome", "").strip()
    if not nome_personagem:
        nome_personagem = "ficha_sem_nome"

    nome_arquivo = nome_personagem.replace(" ", "_").lower() + ".json"

    dados = {
        "personagem": personagem,
        "personalidade": personalidade,
        "atributos": atributos,
        "pericias": pericias
    }

    with open(os.path.join(caminho, nome_arquivo), "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    return nome_arquivo
