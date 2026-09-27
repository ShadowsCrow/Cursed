"""Ícone de cada efeito: mesa → catálogo → padrão (calcular-valores-da-ficha, D8).

- **mesa:** ícone que o Narrador enviou para um efeito default, só na mesa dele (`effect_icons`);
- **efeito:** ícone enviado para um efeito personalizado (`conteudo.imagem_ativo`);
- **catalogo:** ícone do sistema citado pelo catálogo (`imagem`/`icone`), servido pelo frontend
  em `/icones/efeitos/<nome>.webp`;
- **padrao:** a interrogação na moldura dourada, para qualquer efeito sem ícone.

Nada aqui confirma a transação.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any, Mapping

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from cursed_platform.persistence import IconeEfeitoRegistro

PASTA_PUBLICA = "/icones/efeitos"
ICONE_PADRAO = f"{PASTA_PUBLICA}/padrao.webp"


@dataclass(frozen=True)
class IconeEfeito:
    origem: str  # mesa | efeito | catalogo | padrao
    caminho: str  # objeto do armazenamento (mesa, efeito) ou caminho público (catalogo, padrao)


def icone_do_sistema(nome: Any) -> str | None:
    """``"cc_above.png"`` ou ``"cc_above"`` -> ``/icones/efeitos/cc_above.webp``."""
    texto = str(nome or "").strip()
    if not texto or "/" in texto or "\\" in texto or ".." in texto:
        return None
    return f"{PASTA_PUBLICA}/{PurePosixPath(texto).stem}.webp"


def icones_da_mesa(session: Session, mesa_id: str) -> dict[str, str]:
    return {i.associacao: i.objeto for i in session.scalars(
        select(IconeEfeitoRegistro).where(IconeEfeitoRegistro.mesa_id == mesa_id))}


def resolver(
    *, associacao: str | None, conteudo: Mapping[str, Any] | None, catalogo: Mapping[str, Mapping[str, Any]],
    icones_mesa: Mapping[str, str],
) -> IconeEfeito:
    """``catalogo`` é o índice atual de efeitos default por associação."""
    conteudo = conteudo or {}
    if associacao and associacao in icones_mesa:
        return IconeEfeito("mesa", icones_mesa[associacao])
    proprio = conteudo.get("imagem_ativo")
    if isinstance(proprio, str) and proprio.strip():
        return IconeEfeito("efeito", proprio.strip())
    referencia = catalogo.get(associacao or "") or {}
    do_sistema = icone_do_sistema(referencia.get("icone") or referencia.get("imagem") or conteudo.get("icone"))
    if do_sistema:
        return IconeEfeito("catalogo", do_sistema)
    return IconeEfeito("padrao", ICONE_PADRAO)


def definir_da_mesa(session: Session, mesa_id: str, associacao: str, objeto: str) -> None:
    atual = session.get(IconeEfeitoRegistro, (mesa_id, associacao))
    if atual is None:
        session.add(IconeEfeitoRegistro(mesa_id=mesa_id, associacao=associacao, objeto=objeto))
    else:
        atual.objeto = objeto
    session.flush()


def remover_da_mesa(session: Session, mesa_id: str, associacao: str) -> bool:
    resultado = session.execute(delete(IconeEfeitoRegistro).where(
        IconeEfeitoRegistro.mesa_id == mesa_id, IconeEfeitoRegistro.associacao == associacao))
    session.flush()
    return bool(resultado.rowcount)
