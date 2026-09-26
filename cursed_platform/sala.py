"""Sala e grid: visibilidade, controle, comandos autoritativos, snapshot e eventos.

O banco é a fonte de verdade. Cada comando valida autorização e versão, grava e
emite um evento pelo Realtime do Supabase (`realtime.send`) dentro da mesma
transação — a entrega só acontece depois do commit. Eventos sobre elementos
ocultos vão apenas ao tópico do Narrador e nunca carregam dados do elemento
para o tópico da mesa. Fora do PostgreSQL com Realtime, a emissão é ignorada.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any
from uuid import uuid4

from sqlalchemy import delete, select, text, update
from sqlalchemy.orm import Session

from cursed_platform.acesso_privado import objeto_compartilhado_da_mesa, topico_mesa, topico_narrador
from cursed_platform.observabilidade import registrar
from cursed_platform.persistence import CamadaCenaRegistro, CenaRegistro, PersonagemRegistro, TokenRegistro
from cursed_platform.repositories import MesaRepository


MODULO = "sala"


class RegraSala(ValueError):
    """Pedido inválido para a sala (422)."""


class ConflitoSala(RegraSala):
    """Versão desatualizada ou estado incompatível (409)."""


class SemControle(PermissionError):
    """O participante não controla o token."""


@dataclass(frozen=True)
class Leitor:
    usuario_id: str
    narrador: bool


def modulo_ativo(session: Session, mesa_id: str) -> bool:
    return MODULO in MesaRepository(session).modulos_ativos(mesa_id)


# ---------------------------------------------------------------- eventos

def _realtime_disponivel(session: Session) -> bool:
    if session.get_bind().dialect.name != "postgresql":
        return False
    return bool(session.execute(text("SELECT to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NOT NULL")).scalar())


def emitir(session: Session, mesa_id: str, evento: str, payload: dict[str, Any], *, publico: bool) -> None:
    """Enfileira o evento na transação corrente; só é entregue se ela for confirmada."""
    try:
        if not _realtime_disponivel(session):
            return
        session.execute(
            text("SELECT realtime.send(CAST(:payload AS jsonb), :evento, :topico, true)"),
            {"payload": json.dumps(payload), "evento": evento,
             "topico": topico_mesa(mesa_id) if publico else topico_narrador(mesa_id)},
        )
    except Exception as erro:
        registrar("realtime_falha", operacao="enviar", escopo="mesa" if publico else "narrador",
                  classe_erro=type(erro).__name__)
        raise


# ---------------------------------------------------------- visibilidade

def _camadas(session: Session, cena_id: str) -> dict[str, CamadaCenaRegistro]:
    return {c.id: c for c in session.scalars(select(CamadaCenaRegistro).where(CamadaCenaRegistro.cena_id == cena_id))}


def token_visivel(token: TokenRegistro, camada: CamadaCenaRegistro, personagem: PersonagemRegistro | None) -> bool:
    """Visível a jogadores: camada da mesa, token não oculto e personagem ligado não oculto."""
    if camada.visibilidade != "mesa" or token.oculto:
        return False
    return personagem is None or (personagem.visibilidade == "mesa" and personagem.excluido_em is None)


def pode_controlar(token: TokenRegistro, leitor: Leitor, visivel: bool, personagem: PersonagemRegistro | None) -> bool:
    if leitor.narrador:
        return True
    if not visivel:
        return False
    dono = personagem is not None and personagem.proprietario_id == leitor.usuario_id
    return dono or leitor.usuario_id in (token.controladores or [])


def _contexto_token(session: Session, token: TokenRegistro) -> tuple[CamadaCenaRegistro, PersonagemRegistro | None, bool]:
    camada = session.get(CamadaCenaRegistro, token.camada_id)
    personagem = session.get(PersonagemRegistro, token.personagem_id) if token.personagem_id else None
    return camada, personagem, token_visivel(token, camada, personagem)


# -------------------------------------------------------------- snapshot

def token_publico(token: TokenRegistro, controlavel: bool) -> dict[str, Any]:
    return {"id": token.id, "camada_id": token.camada_id, "personagem_id": token.personagem_id,
            "rotulo": token.rotulo, "x": token.x, "y": token.y, "tamanho": token.tamanho,
            "versao": token.versao, "controlavel": controlavel}


def snapshot(session: Session, mesa_id: str, leitor: Leitor, cena_id: str | None = None) -> dict[str, Any]:
    """Estado confirmado que o leitor pode ver. Jogadores só veem a cena ativa."""
    cenas = list(session.scalars(select(CenaRegistro).where(CenaRegistro.mesa_id == mesa_id).order_by(CenaRegistro.criado_em)))
    ativa = next((c for c in cenas if c.ativa), None)
    alvo = ativa
    if leitor.narrador and cena_id:
        alvo = next((c for c in cenas if c.id == cena_id), None)
    resultado: dict[str, Any] = {
        "modulo_ativo": modulo_ativo(session, mesa_id),
        "cenas": [{"id": c.id, "nome": c.nome, "ativa": c.ativa} for c in cenas] if leitor.narrador else [],
        "cena": None,
    }
    if alvo is None:
        return resultado
    camadas = _camadas(session, alvo.id)
    tokens = []
    for token in session.scalars(select(TokenRegistro).where(TokenRegistro.cena_id == alvo.id).order_by(TokenRegistro.id)):
        personagem = session.get(PersonagemRegistro, token.personagem_id) if token.personagem_id else None
        visivel = token_visivel(token, camadas[token.camada_id], personagem)
        if leitor.narrador or visivel:
            dados = token_publico(token, pode_controlar(token, leitor, visivel, personagem))
            if leitor.narrador:
                dados |= {"oculto": token.oculto, "visivel_para_jogadores": visivel, "controladores": list(token.controladores or [])}
            tokens.append(dados)
    resultado["cena"] = {
        "id": alvo.id, "nome": alvo.nome, "colunas": alvo.colunas, "linhas": alvo.linhas, "ativa": alvo.ativa,
        "versao": alvo.versao, "mapa_objeto": alvo.mapa_objeto,
        "camadas": [
            {"id": c.id, "nome": c.nome, "visibilidade": c.visibilidade, "ordem": c.ordem}
            for c in sorted(camadas.values(), key=lambda c: c.ordem) if leitor.narrador or c.visibilidade == "mesa"
        ],
        "tokens": tokens,
    }
    return resultado


# -------------------------------------------------------------- comandos

def _avancar_cena(session: Session, cena: CenaRegistro) -> int:
    cena.versao += 1
    session.flush()
    return cena.versao


def criar_cena(
    session: Session, mesa_id: str, nome: str, colunas: int, linhas: int, mapa_objeto: str | None = None,
) -> CenaRegistro:
    if not nome.strip():
        raise RegraSala("Dê um nome à cena.")
    if mapa_objeto is not None and not objeto_compartilhado_da_mesa(mesa_id, mapa_objeto):
        raise RegraSala("O mapa deve ser um arquivo compartilhado desta mesa.")
    cena = CenaRegistro(
        id=uuid4().hex, mesa_id=mesa_id, nome=nome.strip()[:200],
        colunas=colunas, linhas=linhas, mapa_objeto=mapa_objeto,
    )
    session.add(cena)
    session.flush()
    session.add_all([
        CamadaCenaRegistro(id=uuid4().hex, mesa_id=mesa_id, cena_id=cena.id, nome="Tokens", visibilidade="mesa", ordem=1),
        CamadaCenaRegistro(id=uuid4().hex, mesa_id=mesa_id, cena_id=cena.id, nome="Narrador", visibilidade="narrador", ordem=2),
    ])
    session.flush()
    return cena


def ativar_cena(session: Session, cena: CenaRegistro) -> None:
    session.execute(update(CenaRegistro).where(CenaRegistro.mesa_id == cena.mesa_id, CenaRegistro.id != cena.id)
                    .values(ativa=False).execution_options(synchronize_session=False))
    cena.ativa = True
    _avancar_cena(session, cena)
    emitir(session, cena.mesa_id, "sala.atualizada", {"cena_id": cena.id, "motivo": "cena_ativada"}, publico=True)


def _dentro(cena: CenaRegistro, x: int, y: int, tamanho: int) -> None:
    if x < 0 or y < 0 or x + tamanho > cena.colunas or y + tamanho > cena.linhas:
        raise RegraSala("O token precisa ficar dentro da grade da cena.")


def criar_token(
    session: Session, cena: CenaRegistro, *, camada_id: str, rotulo: str, x: int, y: int, tamanho: int = 1,
    personagem_id: str | None = None, controladores: list[str] | None = None, oculto: bool = False,
) -> TokenRegistro:
    camadas = _camadas(session, cena.id)
    if camada_id not in camadas:
        raise RegraSala("Camada inexistente nesta cena.")
    if personagem_id is not None:
        personagem = session.get(PersonagemRegistro, personagem_id)
        if personagem is None or personagem.mesa_id != cena.mesa_id or personagem.excluido_em is not None:
            raise RegraSala("Personagem inexistente nesta mesa.")
    membros = {m.usuario_id for m in MesaRepository(session).listar_membros(cena.mesa_id)}
    if any(c not in membros for c in controladores or []):
        raise RegraSala("Controladores precisam participar da mesa.")
    if not rotulo.strip():
        raise RegraSala("Dê um rótulo ao token.")
    _dentro(cena, x, y, tamanho)
    token = TokenRegistro(
        id=uuid4().hex, mesa_id=cena.mesa_id, cena_id=cena.id, camada_id=camada_id, personagem_id=personagem_id,
        rotulo=rotulo.strip()[:100], x=x, y=y, tamanho=tamanho, oculto=oculto, controladores=list(controladores or []),
    )
    session.add(token)
    session.flush()
    _, _, visivel = _contexto_token(session, token)
    versao = _avancar_cena(session, cena)
    emitir(session, cena.mesa_id, "sala.atualizada", {"cena_id": cena.id, "cena_versao": versao}, publico=visivel)
    return token


def mover_token(session: Session, token: TokenRegistro, leitor: Leitor, x: int, y: int, versao_esperada: int) -> TokenRegistro:
    """Movimento autoritativo: controle, limites e versão validados antes de gravar."""
    cena = session.get(CenaRegistro, token.cena_id)
    _, personagem, visivel = _contexto_token(session, token)
    if not pode_controlar(token, leitor, visivel, personagem):
        raise SemControle("Você não controla este token.")
    if not cena.ativa and not leitor.narrador:
        raise ConflitoSala("A cena não está ativa.")
    _dentro(cena, x, y, token.tamanho)
    resultado = session.execute(
        update(TokenRegistro).where(TokenRegistro.id == token.id, TokenRegistro.versao == versao_esperada)
        .values(x=x, y=y, versao=TokenRegistro.versao + 1).execution_options(synchronize_session=False)
    )
    if resultado.rowcount != 1:
        raise ConflitoSala("O token foi alterado por outra pessoa; a posição confirmada foi recarregada.")
    session.refresh(token)
    versao = _avancar_cena(session, cena)
    emitir(session, cena.mesa_id, "token.movido", {
        "cena_id": cena.id, "cena_versao": versao,
        "token": {"id": token.id, "x": token.x, "y": token.y, "versao": token.versao},
    }, publico=visivel)
    return token


def alterar_visibilidade(
    session: Session, token: TokenRegistro, *, versao_esperada: int, camada_id: str | None = None, oculto: bool | None = None,
) -> TokenRegistro:
    cena = session.get(CenaRegistro, token.cena_id)
    if camada_id is not None and camada_id not in _camadas(session, cena.id):
        raise RegraSala("Camada inexistente nesta cena.")
    _, _, antes = _contexto_token(session, token)
    valores: dict[str, Any] = {"versao": TokenRegistro.versao + 1}
    if camada_id is not None:
        valores["camada_id"] = camada_id
    if oculto is not None:
        valores["oculto"] = oculto
    resultado = session.execute(
        update(TokenRegistro).where(TokenRegistro.id == token.id, TokenRegistro.versao == versao_esperada)
        .values(**valores).execution_options(synchronize_session=False)
    )
    if resultado.rowcount != 1:
        raise ConflitoSala("O token foi alterado por outra pessoa.")
    session.refresh(token)
    _, _, depois = _contexto_token(session, token)
    versao = _avancar_cena(session, cena)
    # Revelar ou esconder muda o que os jogadores veem: eles recarregam o snapshot autorizado.
    # O Narrador também assina o tópico da mesa, então um único evento basta.
    emitir(session, cena.mesa_id, "sala.atualizada", {"cena_id": cena.id, "cena_versao": versao}, publico=antes or depois)
    return token


def remover_token(session: Session, token: TokenRegistro, versao_esperada: int) -> None:
    cena = session.get(CenaRegistro, token.cena_id)
    _, _, visivel = _contexto_token(session, token)
    resultado = session.execute(
        delete(TokenRegistro).where(TokenRegistro.id == token.id, TokenRegistro.versao == versao_esperada)
        .execution_options(synchronize_session=False)
    )
    if resultado.rowcount != 1:
        raise ConflitoSala("O token foi alterado por outra pessoa.")
    versao = _avancar_cena(session, cena)
    emitir(session, cena.mesa_id, "sala.atualizada", {"cena_id": cena.id, "cena_versao": versao}, publico=visivel)
