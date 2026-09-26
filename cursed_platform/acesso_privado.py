"""Nomes e autorização de arquivos e tópicos realtime privados de uma mesa.

Arquivos e tópicos reutilizam as mesmas decisões do `Autorizador`; qualquer nome
fora das convenções abaixo é negado sem revelar se o recurso existe.

Tópicos realtime:
    mesa:{mesa_id}                              participantes ativos
    mesa:{mesa_id}:narrador                     somente o Narrador
    mesa:{mesa_id}:personagem:{personagem_id}   quem pode ler a ficha

Objetos no bucket privado:
    mesas/{mesa_id}/mesa/{arquivo}                         participantes ativos
    mesas/{mesa_id}/narrador/{arquivo}                     somente o Narrador
    mesas/{mesa_id}/personagens/{personagem_id}/{arquivo}  quem pode ler a ficha

As políticas SQL da migração `0007_acesso_privado` espelham estas regras e
precisam permanecer equivalentes.
"""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from cursed_platform.authorization import Acao, Autorizador, DecisaoAcesso


BUCKET_PRIVADO = "cursed-privado"

_ID = r"[A-Za-z0-9_-]{1,100}"
_ARQUIVO = r"(?!\.{1,2}(?:/|$))[^/\\]+(?:/(?!\.{1,2}(?:/|$))[^/\\]+)*"
_TOPICO = re.compile(rf"mesa:(?P<mesa>{_ID})(?::(?P<escopo>narrador|personagem:(?P<personagem>{_ID})))?")
_OBJETO = re.compile(
    rf"mesas/(?P<mesa>{_ID})/(?:(?P<escopo>mesa|narrador)|personagens/(?P<personagem>{_ID}))/{_ARQUIVO}"
)

_NEGADO = DecisaoAcesso(False, ocultar_existencia=True)


def topico_mesa(mesa_id: str) -> str:
    return f"mesa:{mesa_id}"


def topico_narrador(mesa_id: str) -> str:
    return f"mesa:{mesa_id}:narrador"


def topico_personagem(mesa_id: str, personagem_id: str) -> str:
    return f"mesa:{mesa_id}:personagem:{personagem_id}"


def objeto_compartilhado_da_mesa(mesa_id: str, caminho: str) -> bool:
    """Confirma que o caminho é um objeto legível por participantes desta mesa."""
    encontrado = _OBJETO.fullmatch(caminho or "")
    return bool(encontrado and encontrado["mesa"] == mesa_id and encontrado["escopo"] == "mesa")


class AutorizadorRecursos:
    def __init__(self, session: Session):
        self.autorizador = Autorizador(session)

    def _decidir(
        self, usuario_id: str, mesa_id: str, escopo: str | None, personagem_id: str | None
    ) -> DecisaoAcesso:
        if personagem_id is not None:
            acao = Acao.LER_FICHA
        elif escopo == "narrador":
            acao = Acao.LER_CONTEUDO_NARRADOR
        else:
            acao = Acao.LER_MESA
        decisao = self.autorizador.decidir(
            acao, usuario_id=usuario_id, mesa_id=mesa_id, personagem_id=personagem_id
        )
        # Arquivos e tópicos não diferenciam "proibido" de "inexistente".
        return decisao if decisao.permitido else _NEGADO

    def decidir_topico(self, usuario_id: str, topico: str) -> DecisaoAcesso:
        encontrado = _TOPICO.fullmatch(topico or "")
        if encontrado is None:
            return _NEGADO
        return self._decidir(
            usuario_id, encontrado["mesa"], encontrado["escopo"], encontrado["personagem"]
        )

    def decidir_objeto(self, usuario_id: str, bucket: str, caminho: str) -> DecisaoAcesso:
        if bucket != BUCKET_PRIVADO:
            return _NEGADO
        encontrado = _OBJETO.fullmatch(caminho or "")
        if encontrado is None:
            return _NEGADO
        return self._decidir(
            usuario_id, encontrado["mesa"], encontrado["escopo"], encontrado["personagem"]
        )
