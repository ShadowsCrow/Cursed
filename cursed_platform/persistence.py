"""Estruturas iniciais para fichas confirmadas na nova plataforma."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DDL, DateTime, ForeignKey, ForeignKeyConstraint,
    Index, Integer, JSON, Numeric, String, UniqueConstraint, event, false as sa_false, func, text, true,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class MesaRegistro(Base):
    __tablename__ = "rpg_tables"
    __table_args__ = (CheckConstraint("moedas_por_pilha >= 1", name="ck_rpg_tables_moedas_por_pilha"),)

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    narrador_id: Mapped[str] = mapped_column(String(100), nullable=False)
    permitir_edicao_propria: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
    permitir_criacao_propria: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
    permitir_exclusao_propria: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
    campos_bloqueados: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    campos_exigem_aprovacao: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    retencao_personagens_dias: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30, server_default="30"
    )
    # Quantas moedas (de qualquer tipo) cabem numa pilha, ou seja, numa célula da grade de carga.
    moedas_por_pilha: Mapped[int] = mapped_column(Integer, nullable=False, default=100, server_default="100")


class MembroRegistro(Base):
    __tablename__ = "table_memberships"
    __table_args__ = (
        CheckConstraint("papel IN ('narrador', 'jogador')", name="ck_table_memberships_papel"),
    )

    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="CASCADE"), primary_key=True
    )
    usuario_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    papel: Mapped[str] = mapped_column(String(20), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())


class ModuloMesaRegistro(Base):
    __tablename__ = "table_modules"

    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="CASCADE"), primary_key=True
    )
    modulo: Mapped[str] = mapped_column(String(100), primary_key=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ConviteMesaRegistro(Base):
    __tablename__ = "table_invitations"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    criado_por: Mapped[str] = mapped_column(String(100), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    usado_por: Mapped[str | None] = mapped_column(String(100))


class PedidoAlteracaoRegistro(Base):
    __tablename__ = "character_change_requests"
    __table_args__ = (
        ForeignKeyConstraint(
            ["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
            name="fk_character_change_requests_character",
        ),
        CheckConstraint(
            "estado IN ('pendente', 'aprovado', 'rejeitado')",
            name="ck_character_change_requests_estado",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    personagem_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    solicitante_id: Mapped[str] = mapped_column(String(100), nullable=False)
    versao_base: Mapped[int] = mapped_column(Integer, nullable=False)
    ficha_proposta: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    campos_alterados: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    decidido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decidido_por: Mapped[str | None] = mapped_column(String(100))


class PersonagemRegistro(Base):
    __tablename__ = "characters"
    __table_args__ = (
        CheckConstraint("versao >= 0", name="ck_characters_versao"),
        CheckConstraint("tipo IN ('personagem', 'npc', 'monstro')", name="ck_characters_tipo"),
        CheckConstraint("visibilidade IN ('mesa', 'narrador')", name="ck_characters_visibilidade"),
        UniqueConstraint("mesa_id", "id", name="uq_characters_mesa_id"),
        ForeignKeyConstraint(
            ["mesa_id", "proprietario_id"],
            ["table_memberships.mesa_id", "table_memberships.usuario_id"],
            name="fk_characters_owner_membership",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False, index=True
    )
    proprietario_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="personagem")
    visibilidade: Mapped[str] = mapped_column(String(20), nullable=False, default="mesa")
    versao: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    ficha: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    # Informações públicas escolhidas pelo Narrador: {"nome_publico": str | None, "imagem": bool}.
    revelacao: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    excluido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    excluido_por: Mapped[str | None] = mapped_column(String(100))


class SessaoRegistro(Base):
    __tablename__ = "table_sessions"
    __table_args__ = (
        UniqueConstraint("mesa_id", "numero", name="uq_table_sessions_mesa_numero"),
        CheckConstraint("numero > 0", name="ck_table_sessions_numero"),
        CheckConstraint("encerrada_em IS NULL OR encerrada_em >= iniciada_em", name="ck_table_sessions_periodo"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="CASCADE"), nullable=False, index=True
    )
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    iniciada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    encerrada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ItemInventarioRegistro(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        ForeignKeyConstraint(
            ["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
            name="fk_inventory_items_character",
        ),
        UniqueConstraint("mesa_id", "personagem_id", "id", name="uq_inventory_items_owner_id"),
        CheckConstraint("tipo IN ('arma', 'armadura', 'outro')", name="ck_inventory_items_tipo"),
        CheckConstraint("quantidade > 0", name="ck_inventory_items_quantidade"),
        CheckConstraint(
            "subtipo IS NULL OR subtipo IN ('peitoral', 'capacete', 'luvas', 'botas', 'uma_mao', 'duas_maos', "
            "'escudo', 'mochila', 'aljava', 'moedas', 'outro')",
            name="ck_inventory_items_subtipo",
        ),
        CheckConstraint(
            "(largura IS NULL AND altura IS NULL) OR (largura BETWEEN 1 AND 12 AND altura BETWEEN 1 AND 12)",
            name="ck_inventory_items_dimensao",
        ),
        CheckConstraint(
            "(coluna IS NULL AND linha IS NULL) OR (coluna >= 0 AND linha >= 0 AND largura IS NOT NULL)",
            name="ck_inventory_items_posicao",
        ),
        CheckConstraint("maos IS NULL OR maos BETWEEN 0 AND 2", name="ck_inventory_items_maos"),
        CheckConstraint("pilha_max IS NULL OR pilha_max >= 1", name="ck_inventory_items_pilha"),
        CheckConstraint(
            "cargas_atuais IS NULL OR cargas_atuais >= 0", name="ck_inventory_items_cargas_atuais"
        ),
        CheckConstraint(
            "cargas_maximas IS NULL OR cargas_maximas >= 0", name="ck_inventory_items_cargas_maximas"
        ),
        CheckConstraint(
            "cargas_atuais IS NULL OR cargas_maximas IS NULL OR cargas_atuais <= cargas_maximas",
            name="ck_inventory_items_limite_cargas",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    personagem_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    equipado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cargas_atuais: Mapped[int | None] = mapped_column(Integer)
    cargas_maximas: Mapped[int | None] = mapped_column(Integer)
    dados: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    # Grade de carga (mudança carga-por-espacos): sem dimensão/posição o item fica fora da grade.
    # Escudo, mochila e aljava são distinguidos pelo subtipo; o tipo continua arma/armadura/outro.
    subtipo: Mapped[str | None] = mapped_column(String(20))
    largura: Mapped[int | None] = mapped_column(Integer)
    altura: Mapped[int | None] = mapped_column(Integer)
    coluna: Mapped[int | None] = mapped_column(Integer)
    linha: Mapped[int | None] = mapped_column(Integer)
    girado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=sa_false())
    maos: Mapped[int | None] = mapped_column(Integer)
    pilha_max: Mapped[int | None] = mapped_column(Integer)


class EfeitoAplicadoRegistro(Base):
    __tablename__ = "character_effects"
    __table_args__ = (
        ForeignKeyConstraint(
            ["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
            name="fk_character_effects_character",
        ),
        UniqueConstraint("mesa_id", "personagem_id", "id", name="uq_character_effects_owner_id"),
        CheckConstraint("estado IN ('ativo', 'suspenso', 'encerrado')", name="ck_character_effects_estado"),
        CheckConstraint("versao > 0", name="ck_character_effects_versao"),
        CheckConstraint(
            "duracao_rodadas IS NULL OR duracao_rodadas > 0", name="ck_character_effects_duracao"
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    personagem_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    associacao: Mapped[str | None] = mapped_column(String(200))
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[str] = mapped_column(String(10_000), nullable=False)
    versao: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="ativo")
    duracao_rodadas: Mapped[int | None] = mapped_column(Integer)
    iniciado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    encerrado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    conteudo: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


class OperacaoEfeitoRegistro(Base):
    __tablename__ = "effect_operations"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('modificador', 'restricao', 'falha_automatica', 'alteracao_recurso', 'consumir_aplicacao')",
            name="ck_effect_operations_tipo",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    efeito_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("character_effects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    alvo: Mapped[str] = mapped_column(String(200), nullable=False)
    valor: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    contexto: Mapped[str | None] = mapped_column(String(200))
    modo: Mapped[str | None] = mapped_column(String(100))
    recurso: Mapped[str | None] = mapped_column(String(100))
    evento: Mapped[str | None] = mapped_column(String(100))


class FonteEfeitoRegistro(Base):
    __tablename__ = "effect_sources"
    __table_args__ = (
        ForeignKeyConstraint(
            ["mesa_id", "personagem_id", "efeito_id"],
            ["character_effects.mesa_id", "character_effects.personagem_id", "character_effects.id"],
            name="fk_effect_sources_effect",
        ),
        ForeignKeyConstraint(
            ["mesa_id", "personagem_id", "equipamento_id"],
            ["inventory_items.mesa_id", "inventory_items.personagem_id", "inventory_items.id"],
            name="fk_effect_sources_equipment",
        ),
        CheckConstraint(
            "tipo IN ('equipamento', 'narrador', 'condicao', 'consequencia', 'importacao', 'catalogo')",
            name="ck_effect_sources_tipo",
        ),
        CheckConstraint(
            "(tipo = 'equipamento' AND equipamento_id IS NOT NULL) OR "
            "(tipo <> 'equipamento' AND equipamento_id IS NULL)",
            name="ck_effect_sources_equipment_required",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    personagem_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    efeito_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    equipamento_id: Mapped[str | None] = mapped_column(String(100))
    referencia_id: Mapped[str | None] = mapped_column(String(100))
    descricao: Mapped[str | None] = mapped_column(String(500))


CATEGORIAS_AUDITORIA = ("mesa", "permissao", "personagem", "ficha", "inventario", "efeito", "carta")
RELEVANCIAS_AUDITORIA = ("mecanica", "narrativa", "organizacional")


class EventoAuditoriaRegistro(Base):
    """Evento semântico append-only; correções geram novos eventos vinculados."""

    __tablename__ = "audit_events"
    __table_args__ = (
        CheckConstraint(
            "categoria IN ('mesa', 'permissao', 'personagem', 'ficha', 'inventario', 'efeito', 'carta')",
            name="ck_audit_events_categoria",
        ),
        CheckConstraint(
            "relevancia IN ('mecanica', 'narrativa', 'organizacional')", name="ck_audit_events_relevancia"
        ),
        CheckConstraint("origem IN ('usuario', 'automacao', 'migracao')", name="ck_audit_events_origem"),
        CheckConstraint("visibilidade IN ('mesa', 'narrador')", name="ck_audit_events_visibilidade"),
        Index("ix_audit_events_mesa_seq", "mesa_id", "id"),
        Index("ix_audit_events_mesa_personagem", "mesa_id", "personagem_id", "id"),
        Index("ix_audit_events_mesa_categoria", "mesa_id", "categoria", "id"),
        Index("ix_audit_events_mesa_ator", "mesa_id", "ator_id", "id"),
        Index("ix_audit_events_mesa_sessao", "mesa_id", "sessao_id", "id"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False
    )
    sessao_id: Mapped[str | None] = mapped_column(String(100), ForeignKey("table_sessions.id"))
    ocorrido_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ator_id: Mapped[str | None] = mapped_column(String(100))
    origem: Mapped[str] = mapped_column(String(20), nullable=False, default="usuario")
    categoria: Mapped[str] = mapped_column(String(20), nullable=False)
    acao: Mapped[str] = mapped_column(String(60), nullable=False)
    relevancia: Mapped[str] = mapped_column(String(20), nullable=False)
    visibilidade: Mapped[str] = mapped_column(String(20), nullable=False, default="mesa")
    personagem_id: Mapped[str | None] = mapped_column(String(100))
    alvo_tipo: Mapped[str | None] = mapped_column(String(40))
    alvo_id: Mapped[str | None] = mapped_column(String(100))
    correlacao_id: Mapped[str | None] = mapped_column(String(100), index=True)
    corrige_evento_id: Mapped[int | None] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), ForeignKey("audit_events.id")
    )
    resumo: Mapped[str] = mapped_column(String(500), nullable=False)
    detalhes: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


# Imutabilidade garantida pelo banco, também quando o esquema nasce de create_all.
AUDITORIA_IMUTAVEL_SQLITE = (
    "CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events "
    "BEGIN SELECT RAISE(ABORT, 'audit_events é append-only'); END",
    "CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events "
    "BEGIN SELECT RAISE(ABORT, 'audit_events é append-only'); END",
)
AUDITORIA_IMUTAVEL_POSTGRES = (
    "CREATE FUNCTION audit_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ "
    "BEGIN RAISE EXCEPTION 'audit_events é append-only'; END $$",
    "CREATE TRIGGER audit_events_no_change BEFORE UPDATE OR DELETE ON audit_events "
    "FOR EACH ROW EXECUTE FUNCTION audit_events_append_only()",
    "CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON audit_events "
    "FOR EACH STATEMENT EXECUTE FUNCTION audit_events_append_only()",
)
for _comando in AUDITORIA_IMUTAVEL_SQLITE:
    event.listen(
        EventoAuditoriaRegistro.__table__, "after_create", DDL(_comando).execute_if(dialect="sqlite")
    )
for _comando in AUDITORIA_IMUTAVEL_POSTGRES:
    event.listen(
        EventoAuditoriaRegistro.__table__, "after_create", DDL(_comando).execute_if(dialect="postgresql")
    )


# ------------------------------------------------------------------ cartas

TIPOS_CARTA = "tipo IN ('habilidade', 'magia', 'item', 'efeito')"


class CartaDefinicaoRegistro(Base):
    """Carta do catálogo da mesa: rascunho editável e ponteiro para a última versão publicada."""

    __tablename__ = "card_definitions"
    __table_args__ = (
        CheckConstraint(TIPOS_CARTA, name="ck_card_definitions_tipo"),
        CheckConstraint("versao >= 0", name="ck_card_definitions_versao"),
        UniqueConstraint("mesa_id", "id", name="uq_card_definitions_mesa_id"),
        Index("uq_card_definitions_origem_sistema", "mesa_id", "origem_sistema", unique=True),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    criado_por: Mapped[str] = mapped_column(String(100), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    rascunho: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    versao_publicada: Mapped[int | None] = mapped_column(Integer)
    arquivada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=sa_false())
    versao: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # Habilidade do catálogo do sistema que esta carta materializa (ex.: "classes/Druida/habilidades/Forma Selvagem").
    origem_sistema: Mapped[str | None] = mapped_column(String(200))


class CartaVersaoRegistro(Base):
    """Versão publicada e imutável de uma carta."""

    __tablename__ = "card_versions"
    __table_args__ = (
        CheckConstraint(TIPOS_CARTA, name="ck_card_versions_tipo"),
        CheckConstraint("numero > 0", name="ck_card_versions_numero"),
        UniqueConstraint("definicao_id", "numero", name="uq_card_versions_numero"),
        UniqueConstraint("mesa_id", "id", name="uq_card_versions_mesa_id"),
        ForeignKeyConstraint(
            ["mesa_id", "definicao_id"], ["card_definitions.mesa_id", "card_definitions.id"],
            name="fk_card_versions_definition",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    definicao_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    conteudo: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    procedencia: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    revisao_pendente: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    publicado_por: Mapped[str] = mapped_column(String(100), nullable=False)
    publicado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CartaPersonagemRegistro(Base):
    """Posse de uma versão de carta por um personagem, com ciclo próprio do tipo."""

    __tablename__ = "character_cards"
    __table_args__ = (
        CheckConstraint(TIPOS_CARTA, name="ck_character_cards_tipo"),
        CheckConstraint(
            "estado IN ('disponivel', 'em_aprendizado', 'aprendida', 'no_inventario', 'aplicada', 'removida')",
            name="ck_character_cards_estado",
        ),
        CheckConstraint("origem IN ('concessao', 'oferta')", name="ck_character_cards_origem"),
        ForeignKeyConstraint(
            ["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
            name="fk_character_cards_character",
        ),
        ForeignKeyConstraint(
            ["mesa_id", "versao_id"], ["card_versions.mesa_id", "card_versions.id"],
            name="fk_character_cards_version",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    personagem_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    definicao_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    versao_id: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False)
    origem: Mapped[str] = mapped_column(String(20), nullable=False)
    excecao_aprendizado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=sa_false())
    # Escolha que concedeu a carta (ex.: "classe:Druida"); vazio para cartas obtidas por outras vias.
    concedida_por: Mapped[str | None] = mapped_column(String(200))
    item_id: Mapped[str | None] = mapped_column(String(100))
    efeito_id: Mapped[str | None] = mapped_column(String(100))
    adquirida_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class OfertaCartasRegistro(Base):
    __tablename__ = "card_offers"
    __table_args__ = (
        CheckConstraint("estado IN ('aberta', 'encerrada', 'cancelada')", name="ck_card_offers_estado"),
        CheckConstraint(
            "min_escolhas >= 0 AND max_escolhas >= 1 AND min_escolhas <= max_escolhas",
            name="ck_card_offers_limites",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    criado_por: Mapped[str] = mapped_column(String(100), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expira_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    min_escolhas: Mapped[int] = mapped_column(Integer, nullable=False)
    max_escolhas: Mapped[int] = mapped_column(Integer, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="aberta")


class OfertaCandidatoRegistro(Base):
    __tablename__ = "card_offer_candidates"

    oferta_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("card_offers.id", ondelete="CASCADE"), primary_key=True
    )
    versao_id: Mapped[str] = mapped_column(String(100), ForeignKey("card_versions.id"), primary_key=True)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class OfertaDestinatarioRegistro(Base):
    __tablename__ = "card_offer_recipients"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendente', 'respondida', 'expirada', 'cancelada')",
            name="ck_card_offer_recipients_estado",
        ),
    )

    oferta_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("card_offers.id", ondelete="CASCADE"), primary_key=True
    )
    personagem_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")
    respondido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    respondido_por: Mapped[str | None] = mapped_column(String(100))


class OfertaEscolhaRegistro(Base):
    __tablename__ = "card_offer_choices"
    __table_args__ = (
        ForeignKeyConstraint(
            ["oferta_id", "versao_id"], ["card_offer_candidates.oferta_id", "card_offer_candidates.versao_id"],
            name="fk_card_offer_choices_candidate",
        ),
        ForeignKeyConstraint(
            ["oferta_id", "personagem_id"],
            ["card_offer_recipients.oferta_id", "card_offer_recipients.personagem_id"],
            name="fk_card_offer_choices_recipient",
        ),
    )

    oferta_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    personagem_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    versao_id: Mapped[str] = mapped_column(String(100), primary_key=True)


class ApresentacaoCartaRegistro(Base):
    """Carta mostrada temporariamente, sem posse. `destinatarios` vazio significa toda a mesa."""

    __tablename__ = "card_presentations"
    __table_args__ = (
        CheckConstraint("estado IN ('apresentada', 'recolhida')", name="ck_card_presentations_estado"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    versao_id: Mapped[str] = mapped_column(String(100), ForeignKey("card_versions.id"), nullable=False)
    destinatarios: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="apresentada")
    apresentada_por: Mapped[str] = mapped_column(String(100), nullable=False)
    apresentada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    recolhida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


VERSOES_IMUTAVEIS_SQLITE = (
    "CREATE TRIGGER card_versions_no_update BEFORE UPDATE ON card_versions "
    "BEGIN SELECT RAISE(ABORT, 'card_versions é imutável'); END",
    "CREATE TRIGGER card_versions_no_delete BEFORE DELETE ON card_versions "
    "BEGIN SELECT RAISE(ABORT, 'card_versions é imutável'); END",
)
VERSOES_IMUTAVEIS_POSTGRES = (
    "CREATE FUNCTION card_versions_imutavel() RETURNS trigger LANGUAGE plpgsql AS $$ "
    "BEGIN RAISE EXCEPTION 'card_versions é imutável'; END $$",
    "CREATE TRIGGER card_versions_no_change BEFORE UPDATE OR DELETE ON card_versions "
    "FOR EACH ROW EXECUTE FUNCTION card_versions_imutavel()",
)
for _comando in VERSOES_IMUTAVEIS_SQLITE:
    event.listen(CartaVersaoRegistro.__table__, "after_create", DDL(_comando).execute_if(dialect="sqlite"))
for _comando in VERSOES_IMUTAVEIS_POSTGRES:
    event.listen(CartaVersaoRegistro.__table__, "after_create", DDL(_comando).execute_if(dialect="postgresql"))



class PerfilUsuarioRegistro(Base):
    """Nome de exibição da identidade autenticada, atualizado a cada acesso."""

    __tablename__ = "user_profiles"

    usuario_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )



# ------------------------------------------------------------------- sala

class CenaRegistro(Base):
    """Cena da sala com grade; a cena ativa é a que os jogadores veem."""

    __tablename__ = "scenes"
    __table_args__ = (
        CheckConstraint("colunas BETWEEN 1 AND 200 AND linhas BETWEEN 1 AND 200", name="ck_scenes_grade"),
        CheckConstraint("versao >= 0", name="ck_scenes_versao"),
        UniqueConstraint("mesa_id", "id", name="uq_scenes_mesa_id"),
        Index("uq_scenes_ativa_mesa", "mesa_id", unique=True,
              postgresql_where=text("ativa"), sqlite_where=text("ativa")),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("rpg_tables.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    colunas: Mapped[int] = mapped_column(Integer, nullable=False)
    linhas: Mapped[int] = mapped_column(Integer, nullable=False)
    mapa_objeto: Mapped[str | None] = mapped_column(String(500))
    ativa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=sa_false())
    versao: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CamadaCenaRegistro(Base):
    __tablename__ = "scene_layers"
    __table_args__ = (
        CheckConstraint("visibilidade IN ('mesa', 'narrador')", name="ck_scene_layers_visibilidade"),
        UniqueConstraint("mesa_id", "id", name="uq_scene_layers_mesa_id"),
        UniqueConstraint("mesa_id", "cena_id", "id", name="uq_scene_layers_mesa_cena_id"),
        ForeignKeyConstraint(["mesa_id", "cena_id"], ["scenes.mesa_id", "scenes.id"], name="fk_scene_layers_scene"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    cena_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    visibilidade: Mapped[str] = mapped_column(String(20), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class TokenRegistro(Base):
    """Peça no grid; posição em células. Controle: Narrador, dono do personagem ou controladores listados."""

    __tablename__ = "scene_tokens"
    __table_args__ = (
        CheckConstraint("x >= 0 AND y >= 0", name="ck_scene_tokens_posicao"),
        CheckConstraint("tamanho BETWEEN 1 AND 10", name="ck_scene_tokens_tamanho"),
        CheckConstraint("versao >= 0", name="ck_scene_tokens_versao"),
        ForeignKeyConstraint(["mesa_id", "cena_id"], ["scenes.mesa_id", "scenes.id"], name="fk_scene_tokens_scene"),
        ForeignKeyConstraint(["mesa_id", "camada_id"], ["scene_layers.mesa_id", "scene_layers.id"],
                             name="fk_scene_tokens_layer"),
        ForeignKeyConstraint(["mesa_id", "cena_id", "camada_id"],
                             ["scene_layers.mesa_id", "scene_layers.cena_id", "scene_layers.id"],
                             name="fk_scene_tokens_layer_scene"),
        ForeignKeyConstraint(["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
                             name="fk_scene_tokens_character"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    cena_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    camada_id: Mapped[str] = mapped_column(String(100), nullable=False)
    personagem_id: Mapped[str | None] = mapped_column(String(100))
    rotulo: Mapped[str] = mapped_column(String(100), nullable=False)
    x: Mapped[int] = mapped_column(Integer, nullable=False)
    y: Mapped[int] = mapped_column(Integer, nullable=False)
    tamanho: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    oculto: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=sa_false())
    controladores: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    versao: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")


class RecipienteCenaRegistro(Base):
    """Chão ou baú de uma cena: grade compartilhada de itens largados ou saque (carga-por-espacos D8)."""

    __tablename__ = "scene_stashes"
    __table_args__ = (
        ForeignKeyConstraint(["mesa_id", "cena_id"], ["scenes.mesa_id", "scenes.id"], name="fk_scene_stashes_scene"),
        UniqueConstraint("mesa_id", "id", name="uq_scene_stashes_mesa_id"),
        CheckConstraint("tipo IN ('chao', 'bau')", name="ck_scene_stashes_tipo"),
        CheckConstraint("colunas BETWEEN 1 AND 20 AND linhas BETWEEN 1 AND 20", name="ck_scene_stashes_grade"),
        CheckConstraint("versao >= 0", name="ck_scene_stashes_versao"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    cena_id: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    colunas: Mapped[int] = mapped_column(Integer, nullable=False)
    linhas: Mapped[int] = mapped_column(Integer, nullable=False)
    versao: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")


class ItemRecipienteRegistro(Base):
    """Retrato de um item fora de personagem, com os efeitos vinculados; recriado em quem o pega."""

    __tablename__ = "scene_stash_items"
    __table_args__ = (
        ForeignKeyConstraint(["mesa_id", "stash_id"], ["scene_stashes.mesa_id", "scene_stashes.id"],
                             name="fk_scene_stash_items_stash", ondelete="CASCADE"),
        CheckConstraint("tipo IN ('arma', 'armadura', 'outro')", name="ck_scene_stash_items_tipo"),
        CheckConstraint("quantidade > 0", name="ck_scene_stash_items_quantidade"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False)
    stash_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    subtipo: Mapped[str | None] = mapped_column(String(20))
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    largura: Mapped[int | None] = mapped_column(Integer)
    altura: Mapped[int | None] = mapped_column(Integer)
    coluna: Mapped[int | None] = mapped_column(Integer)
    linha: Mapped[int | None] = mapped_column(Integer)
    girado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=sa_false())
    maos: Mapped[int | None] = mapped_column(Integer)
    pilha_max: Mapped[int | None] = mapped_column(Integer)
    cargas_atuais: Mapped[int | None] = mapped_column(Integer)
    cargas_maximas: Mapped[int | None] = mapped_column(Integer)
    dados: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    efeitos: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    origem_personagem_id: Mapped[str | None] = mapped_column(String(100))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class OfertaItemRegistro(Base):
    """Item oferecido por um personagem a outro; aceitar move o item (carga-por-espacos D8)."""

    __tablename__ = "item_offers"
    __table_args__ = (
        ForeignKeyConstraint(["mesa_id", "de_personagem_id"], ["characters.mesa_id", "characters.id"],
                             name="fk_item_offers_de"),
        ForeignKeyConstraint(["mesa_id", "para_personagem_id"], ["characters.mesa_id", "characters.id"],
                             name="fk_item_offers_para"),
        CheckConstraint("estado IN ('pendente', 'aceita', 'recusada', 'cancelada')", name="ck_item_offers_estado"),
        CheckConstraint("de_personagem_id <> para_personagem_id", name="ck_item_offers_distintos"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(100), nullable=False)
    de_personagem_id: Mapped[str] = mapped_column(String(100), nullable=False)
    para_personagem_id: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(String(12), nullable=False, default="pendente", server_default="pendente")
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    decidido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class MigracaoLegadaRegistro(Base):
    """Vínculo imutável entre um registro de origem e sua entidade convertida."""

    __tablename__ = "legacy_migrations"
    __table_args__ = (
        UniqueConstraint("origem", "tipo_origem", "id_origem", name="uq_legacy_migrations_origem"),
        Index("ix_legacy_migrations_destino", "tipo_destino", "id_destino"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    origem: Mapped[str] = mapped_column(String(200), nullable=False)
    versao_origem: Mapped[str | None] = mapped_column(String(50))
    tipo_origem: Mapped[str] = mapped_column(String(100), nullable=False)
    id_origem: Mapped[str] = mapped_column(String(100), nullable=False)
    hash_conteudo: Mapped[str] = mapped_column(String(64), nullable=False)
    mesa_id: Mapped[str] = mapped_column(String(100), ForeignKey("rpg_tables.id"), nullable=False)
    tipo_destino: Mapped[str] = mapped_column(String(100), nullable=False)
    id_destino: Mapped[str] = mapped_column(String(100), nullable=False)
    migrado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class AtivoMigradoRegistro(Base):
    """Objeto privado extraído de payload legado, deduplicado por personagem e hash."""

    __tablename__ = "legacy_assets"
    __table_args__ = (
        UniqueConstraint("personagem_id", "sha256", name="uq_legacy_assets_personagem_hash"),
        UniqueConstraint("bucket", "caminho", name="uq_legacy_assets_objeto"),
        ForeignKeyConstraint(["mesa_id", "personagem_id"], ["characters.mesa_id", "characters.id"],
                             name="fk_legacy_assets_character"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), ForeignKey("rpg_tables.id"), nullable=False, index=True)
    personagem_id: Mapped[str] = mapped_column(String(100), nullable=False)
    bucket: Mapped[str] = mapped_column(String(100), nullable=False)
    caminho: Mapped[str] = mapped_column(String(500), nullable=False)
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    tamanho: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    procedencias: Mapped[list[dict[str, str]]] = mapped_column(JSON, nullable=False)


class AtivoCatalogoRegistro(Base):
    """Arte legada em escopo privado do Narrador enquanto a carta é revisada."""

    __tablename__ = "legacy_catalog_assets"
    __table_args__ = (
        UniqueConstraint("mesa_id", "sha256", name="uq_legacy_catalog_assets_mesa_hash"),
        UniqueConstraint("bucket", "caminho", name="uq_legacy_catalog_assets_objeto"),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    mesa_id: Mapped[str] = mapped_column(String(100), ForeignKey("rpg_tables.id"), nullable=False, index=True)
    bucket: Mapped[str] = mapped_column(String(100), nullable=False)
    caminho: Mapped[str] = mapped_column(String(500), nullable=False)
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    tamanho: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    procedencias: Mapped[list[dict[str, str]]] = mapped_column(JSON, nullable=False)


class IconeEfeitoRegistro(Base):
    """Ícone que o Narrador enviou para um efeito default, válido só na mesa dele."""

    __tablename__ = "effect_icons"

    mesa_id: Mapped[str] = mapped_column(String(100), ForeignKey("rpg_tables.id", ondelete="RESTRICT"), primary_key=True)
    associacao: Mapped[str] = mapped_column(String(100), primary_key=True)
    objeto: Mapped[str] = mapped_column(String(500), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
