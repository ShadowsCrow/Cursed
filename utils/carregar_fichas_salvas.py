import os
import json

def carregar_fichas_salvas(caminho="fichas"):
    fichas = []
    if not os.path.exists(caminho):
        return fichas

    for nome_arquivo in os.listdir(caminho):
        if nome_arquivo.endswith(".json"):
            try:
                with open(os.path.join(caminho, nome_arquivo), "r", encoding="utf-8") as f:
                    dados = json.load(f)

                nome_base = os.path.splitext(nome_arquivo)[0]  # Remove o .json
                fichas.append({
                    "nome": nome_base,
                    "arquivo": nome_arquivo,
                    "dados": dados
                })

            except Exception as e:
                print(f"Erro ao carregar {nome_arquivo}: {e}")
                continue

    return fichas
