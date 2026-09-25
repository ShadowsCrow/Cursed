"""Decisão central de acesso aos recursos de uma mesa."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from sqlalchemy.orm import Session

from cursed_platform.repositories import FichaRepository, MesaRepository


class Acao(StrEnum):
    LER_MESA = "ler_mesa"
    LISTAR_PARTICIPANTES = "listar_participantes"
    CONVIDAR = "convidar"
    REMOVER_PARTICIPANTE = "remover_participante"
    CONFIGURAR_MODULO = "configurar_modulo"
    CONFIGURAR_POLITICAS = "configurar_politicas"
    DECIDIR_ALTERACAO = "decidir_alteracao"
    CRIAR_PERSONAGEM = "criar_personagem"
    LER_FICHA = "ler_ficha"
    EDITAR_FICHA = "editar_ficha"
    EXCLUIR_PERSONAGEM = "excluir_personagem"
    APLICAR_EFEITO = "aplicar_efeito"
    LER_CONTEUDO_NARRADOR = "ler_conteudo_narrador"
    TRANSFERIR_PERSONAGEM = "transferir_personagem"
    RESTAURAR_PERSONAGEM = "restaurar_personagem"
    CORRIGIR_EVENTO = "corrigir_evento"
    ADMINISTRAR_ENTIDADES = "administrar_entidades"
    ADMINISTRAR_DESCANSO = "administrar_descanso"


@dataclass(frozen=True)
class DecisaoAcesso:
    permitido: bool
    ocultar_existencia: bool = False
    motivo: str = "Acesso negado."


class Autorizador:
    def __init__(self, session: Session):
        self.mesas = MesaRepository(session)
        self.fichas = FichaRepository(session)

    def decidir(
        self,
        acao: Acao | str,
        *,
        usuario_id: str,
        mesa_id: str,
        personagem_id: str | None = None,
    ) -> DecisaoAcesso:
        try:
            acao = Acao(acao)
        except ValueError:
            return DecisaoAcesso(False)
        if not usuario_id or not mesa_id:
            return DecisaoAcesso(False, ocultar_existencia=True)
        mesa = self.mesas.get(mesa_id)
        membro = self.mesas.membro(mesa_id, usuario_id)
        if mesa is None or membro is None or not membro.ativo:
            return DecisaoAcesso(False, ocultar_existencia=True)
        narrador = membro.papel == "narrador" and mesa.narrador_id == usuario_id
        jogador = membro.papel == "jogador"
        if not narrador and not jogador:
            return DecisaoAcesso(False)

        if acao in {Acao.LER_MESA, Acao.LISTAR_PARTICIPANTES}:
            return DecisaoAcesso(True)
        if acao in {
            Acao.CONVIDAR,
            Acao.REMOVER_PARTICIPANTE,
            Acao.CONFIGURAR_MODULO,
            Acao.CONFIGURAR_POLITICAS,
            Acao.DECIDIR_ALTERACAO,
            Acao.APLICAR_EFEITO,
            Acao.LER_CONTEUDO_NARRADOR,
            Acao.TRANSFERIR_PERSONAGEM,
            Acao.RESTAURAR_PERSONAGEM,
            Acao.CORRIGIR_EVENTO,
            Acao.ADMINISTRAR_ENTIDADES,
            Acao.ADMINISTRAR_DESCANSO,
        }:
            return DecisaoAcesso(narrador, motivo="Ação reservada ao Narrador.")
        if acao == Acao.CRIAR_PERSONAGEM:
            return DecisaoAcesso(
                narrador or mesa.permitir_criacao_propria,
                motivo="Criação de personagem não permitida nesta mesa.",
            )

        if personagem_id is None:
            return DecisaoAcesso(False, ocultar_existencia=True)
        personagem = self.fichas.get(mesa_id, personagem_id)
        if personagem is None:
            return DecisaoAcesso(False, ocultar_existencia=True)
        if personagem.visibilidade == "narrador" and not narrador:
            return DecisaoAcesso(False, ocultar_existencia=True)
        proprietario = jogador and personagem.proprietario_id == usuario_id
        if acao == Acao.LER_FICHA:
            return DecisaoAcesso(
                narrador or proprietario,
                ocultar_existencia=not (narrador or proprietario),
            )
        if not narrador and not proprietario:
            return DecisaoAcesso(False, ocultar_existencia=True)
        if acao == Acao.EDITAR_FICHA:
            return DecisaoAcesso(
                narrador or mesa.permitir_edicao_propria,
                motivo="Edição não permitida nesta mesa.",
            )
        if acao == Acao.EXCLUIR_PERSONAGEM:
            return DecisaoAcesso(
                narrador or mesa.permitir_exclusao_propria,
                motivo="Exclusão não permitida nesta mesa.",
            )
        return DecisaoAcesso(False)
