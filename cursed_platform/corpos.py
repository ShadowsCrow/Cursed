"""Corpos genéricos por Tamanho como cartas de item padrão de cada mesa (carga-por-espacos D7).

Carregar alguém é receber do Narrador o corpo adequado: inteiro, ou "com ajuda" (metade da altura,
arredondada para cima) quando dois personagens carregam juntos. As cartas são criadas pelo sistema,
com identificadores fixos por mesa, e não se editam. Nenhuma função confirma a transação.
"""

from __future__ import annotations

import math
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from cursed_platform import cartas
from cursed_platform.domain.grade import DIMENSAO_CRIATURA
from cursed_platform.persistence import CartaDefinicaoRegistro, CartaVersaoRegistro

AUTOR = "sistema"
ROTULO_TAMANHO = {"minusculo": "Minúsculo", "pequeno": "Pequeno", "medio": "Médio", "grande": "Grande"}


def dimensoes(tamanho: str, com_ajuda: bool) -> tuple[int, int]:
    largura, altura = DIMENSAO_CRIATURA[tamanho]
    return (largura, math.ceil(altura / 2)) if com_ajuda else (largura, altura)


def _chave(tamanho: str, com_ajuda: bool) -> str:
    return f"{tamanho}-{'ajuda' if com_ajuda else 'inteiro'}"


def id_definicao(mesa_id: str, tamanho: str, com_ajuda: bool) -> str:
    return f"corpo-{_chave(tamanho, com_ajuda)}-{mesa_id}"


def conteudo(tamanho: str, com_ajuda: bool) -> dict[str, Any]:
    rotulo = ROTULO_TAMANHO[tamanho]
    largura, altura = dimensoes(tamanho, com_ajuda)
    if com_ajuda:
        titulo = f"Corpo {rotulo} (com ajuda)"
        texto = (f"Metade de uma criatura {rotulo}, carregada junto com outro personagem, que leva a outra metade. "
                 "O equipamento da criatura continua com ela.")
    else:
        titulo = f"Corpo {rotulo}"
        texto = f"Uma criatura {rotulo} carregada por inteiro. O equipamento da criatura continua com ela."
    return {
        "titulo": titulo, "texto": texto, "tags": ["corpo", "padrão"], "item_tipo": "outro", "quantidade": 1,
        "formato": {"subtipo": "outro", "largura": largura, "altura": altura},
    }


def eh_padrao(definicao: CartaDefinicaoRegistro) -> bool:
    return definicao.criado_por == AUTOR and definicao.id.startswith("corpo-")


def garantir(session: Session, mesa_id: str) -> int:
    """Cria os corpos que faltam na mesa, já publicados. Devolve quantos criou; repetir não duplica."""
    criados = 0
    for tamanho in DIMENSAO_CRIATURA:
        for com_ajuda in (False, True):
            definicao_id = id_definicao(mesa_id, tamanho, com_ajuda)
            if session.get(CartaDefinicaoRegistro, definicao_id) is not None:
                continue
            dados = conteudo(tamanho, com_ajuda)
            validado, validacao = cartas.validar("item", dados, mesa_id)
            assert validado is not None, validacao.problemas
            procedencia = {"origem": "sistema", "corpo": _chave(tamanho, com_ajuda)}
            try:
                with session.begin_nested():
                    session.add(CartaDefinicaoRegistro(
                        id=definicao_id, mesa_id=mesa_id, tipo="item", criado_por=AUTOR, versao=1, versao_publicada=1,
                        rascunho={"conteudo": {**dados, "tipo": "item"}, "procedencia": procedencia},
                    ))
                    session.flush()
                    session.add(CartaVersaoRegistro(
                        id=f"{definicao_id}-v1"[:100], mesa_id=mesa_id, definicao_id=definicao_id, numero=1, tipo="item",
                        conteudo=validado, procedencia={**procedencia, "publicado_por": AUTOR},
                        revisao_pendente=[], publicado_por=AUTOR,
                    ))
                    session.flush()
                criados += 1
            except IntegrityError:
                # Outra requisição criou o mesmo corpo ao mesmo tempo.
                continue
    return criados
