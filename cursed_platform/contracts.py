from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FichaContrato(BaseModel):
    """Representação compatível de uma ficha transportada pela API."""

    model_config = ConfigDict(extra="allow")

    personagem: dict[str, Any] = Field(default_factory=dict)
    personalidade: dict[str, Any] = Field(default_factory=dict)
    atributos: dict[str, Any] = Field(default_factory=dict)
    pericias: dict[str, Any] = Field(default_factory=dict)
    armas: list[dict[str, Any]] = Field(default_factory=list)
    armaduras: list[dict[str, Any]] = Field(default_factory=list)
    outros: list[dict[str, Any]] = Field(default_factory=list)
    efeitos_externos: list[dict[str, Any]] = Field(default_factory=list)


class EfeitoContrato(BaseModel):
    model_config = ConfigDict(extra="forbid")

    versao: int = Field(default=1, ge=1)
    nome: str = Field(min_length=1, max_length=200)
    descricao: str = Field(min_length=1, max_length=10_000)
    categoria: str = Field(default="externo", min_length=1, max_length=100)
    modificadores: list[dict[str, Any]] = Field(default_factory=list)
    operacoes: list[dict[str, Any]] = Field(default_factory=list)
    substitui: list[str] = Field(default_factory=list)
    origem: dict[str, Any] | None = None


class EquipamentoContrato(BaseModel):
    model_config = ConfigDict(extra="forbid")

    versao: int = Field(default=1, ge=1)
    tipo: Literal["arma", "armadura", "outro"]
    item: dict[str, Any]
    efeitos: list[dict[str, Any]] = Field(default_factory=list)


class CartaContrato(BaseModel):
    """Versão publicada de uma carta; custos continuam explicitamente separados."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=100)
    tipo: Literal["habilidade", "magia", "item", "efeito"]
    versao: int = Field(ge=1)
    titulo: str = Field(min_length=1, max_length=200)
    texto: str = Field(min_length=1, max_length=10_000)
    procedencia: dict[str, Any]
    requisitos: list[str] = Field(default_factory=list)
    ativos: list[str] = Field(default_factory=list)
    custo_aprendizado: int | None = Field(default=None, ge=0)
    descansos_minimos: int | None = Field(default=None, ge=0)
    potencia_uso: int | None = Field(default=None, ge=0)
    custo_uso: int | None = Field(default=None, ge=0)
    custos_adicionais: list[dict[str, Any]] = Field(default_factory=list)
    custo_legado: str | None = None


class MesaContrato(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=100)
    nome: str = Field(min_length=1, max_length=200)
    narrador_id: str = Field(min_length=1, max_length=100)
    modulos_ativos: set[str] = Field(default_factory=set)


class CriarMesaRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=200)


class MesaResumo(BaseModel):
    id: str
    nome: str
    papel: Literal["narrador", "jogador"]


class CriarConviteRequest(BaseModel):
    validade_dias: int = Field(default=7, ge=1, le=30)


class ConviteCriado(BaseModel):
    codigo: str
    expira_em: datetime


class AceitarConviteRequest(BaseModel):
    codigo: str = Field(min_length=1)


class ParticipanteResumo(BaseModel):
    usuario_id: str
    papel: Literal["narrador", "jogador"]


class CanalPrivado(BaseModel):
    topico: str
    escopo: Literal["mesa", "narrador", "personagem"]
    personagem_id: str | None = None


class PoliticaMesaContrato(BaseModel):
    permitir_criacao_propria: bool
    permitir_edicao_propria: bool
    permitir_exclusao_propria: bool
    campos_bloqueados: list[str] = Field(default_factory=list, max_length=100)
    campos_exigem_aprovacao: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("campos_bloqueados", "campos_exigem_aprovacao")
    @classmethod
    def validar_caminhos(cls, caminhos: list[str]) -> list[str]:
        for caminho in caminhos:
            if (len(caminho) > 200 or not caminho or
                    any(not trecho.strip() or trecho != trecho.strip() for trecho in caminho.split("."))):
                raise ValueError("Cada campo deve ser um caminho pontuado não vazio de até 200 caracteres.")
        if len(set(caminhos)) != len(caminhos):
            raise ValueError("Campos duplicados não são permitidos.")
        return caminhos


class CriarPersonagemRequest(BaseModel):
    ficha: FichaContrato


class RevelacaoContrato(BaseModel):
    """Informações públicas de uma entidade; em entidades ocultas, nada além disso é exposto."""

    nome_publico: str | None = Field(default=None, max_length=200)
    imagem: bool = False


class PersonagemResumo(BaseModel):
    id: str
    mesa_id: str
    nome: str
    tipo: Literal["personagem", "npc", "monstro"]
    visibilidade: Literal["mesa", "narrador"]
    proprietario_id: str | None
    versao: int
    revelacao: RevelacaoContrato | None = None
    excluido_em: datetime | None = None
    restauravel_ate: datetime | None = None


class TransferirPersonagemRequest(BaseModel):
    proprietario_id: str | None = Field(default=None, min_length=1, max_length=100)
    versao_esperada: int = Field(ge=0)


class PedidoAlteracaoResumo(BaseModel):
    id: str
    mesa_id: str
    personagem_id: str
    solicitante_id: str
    versao_base: int
    campos_alterados: list[str]
    estado: Literal["pendente", "aprovado", "rejeitado"]
    ficha_proposta: FichaContrato


class DecidirPedidoRequest(BaseModel):
    aprovar: bool


class ComandoBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=100)
    mesa_id: str = Field(min_length=1, max_length=100)
    ator_id: str = Field(min_length=1, max_length=100)
    versao_esperada: int = Field(ge=0)


class AtualizarFichaComando(ComandoBase):
    tipo: Literal["atualizar_ficha"] = "atualizar_ficha"
    personagem_id: str = Field(min_length=1, max_length=100)
    ficha: FichaContrato


class EquiparItemComando(ComandoBase):
    tipo: Literal["equipar_item"] = "equipar_item"
    personagem_id: str = Field(min_length=1, max_length=100)
    equipamento_id: str = Field(min_length=1, max_length=100)
    equipado: bool


class AplicarEfeitoComando(ComandoBase):
    tipo: Literal["aplicar_efeito"] = "aplicar_efeito"
    personagem_id: str = Field(min_length=1, max_length=100)
    efeito: EfeitoContrato


class PermissoesFicha(BaseModel):
    papel: Literal["narrador", "jogador"]
    editar: bool
    excluir: bool
    transferir: bool
    campos_bloqueados: list[str] = Field(default_factory=list)
    campos_exigem_aprovacao: list[str] = Field(default_factory=list)


class ItemInventarioResumo(BaseModel):
    id: str
    tipo: Literal["arma", "armadura", "outro"]
    nome: str
    quantidade: int
    equipado: bool
    cargas_atuais: int | None = None
    cargas_maximas: int | None = None
    dados: dict[str, Any] = Field(default_factory=dict)
    efeitos: list[str] = Field(default_factory=list, description="Efeitos cuja fonte é este item.")


class EquiparItemRequest(BaseModel):
    equipado: bool
    versao_esperada: int = Field(ge=0)


class EquiparItemResposta(BaseModel):
    versao: int
    item: ItemInventarioResumo


class ModificadorResumo(BaseModel):
    alvo: str
    valor: float
    contexto: str | None = None


class FonteEfeitoResumo(BaseModel):
    tipo: str
    descricao: str | None = None
    equipamento_id: str | None = None


class EfeitoResumo(BaseModel):
    id: str
    nome: str
    descricao: str
    estado: Literal["ativo", "suspenso", "encerrado"]
    duracao_rodadas: int | None = None
    ativacao: str | None = None
    modificadores: list[ModificadorResumo] = Field(default_factory=list)
    fontes: list[FonteEfeitoResumo] = Field(default_factory=list)


class FonteValorResumo(BaseModel):
    tipo: Literal["base", "ajuste", "atributo", "pericia", "equipamento", "efeito"]
    descricao: str
    valor: float
    efeito_id: str | None = None
    item_id: str | None = None


class SituacionalResumo(BaseModel):
    descricao: str
    valor: float
    contexto: str
    efeito_id: str


class ValorDerivadoResumo(BaseModel):
    chave: str
    rotulo: str
    grupo: Literal["atributo", "pericia", "status"]
    total: float
    fontes: list[FonteValorResumo]
    situacionais: list[SituacionalResumo] = Field(default_factory=list)


class PreviaImportacaoRequest(BaseModel):
    codigo: str = Field(min_length=1, max_length=5_000_000)


class ImportarCodigoRequest(PreviaImportacaoRequest):
    versao_esperada: int = Field(ge=0)


class EfeitoPrevia(BaseModel):
    nome: str
    descricao: str
    ativacao: str | None = None
    modificadores: list[ModificadorResumo] = Field(default_factory=list)


class ItemPrevia(BaseModel):
    tipo: Literal["arma", "armadura", "outro"]
    nome: str
    dados: dict[str, Any] = Field(default_factory=dict)


class PreviaImportacaoResumo(BaseModel):
    tipo: Literal["efeito", "equipamento"]
    item: ItemPrevia | None = None
    efeitos: list[EfeitoPrevia]
    avisos: list[str] = Field(default_factory=list)


class ImportacaoResultado(BaseModel):
    versao: int
    item: ItemInventarioResumo | None = None
    efeitos: list[EfeitoResumo]


class MudancaAuditoria(BaseModel):
    campo: str
    antes: Any = None
    depois: Any = None
    rotulo: str | None = None
    completo: bool = True


class EventoAuditoriaResumo(BaseModel):
    id: int
    ocorrido_em: datetime
    sessao_id: str | None = None
    ator_id: str | None = None
    origem: Literal["usuario", "automacao", "migracao"]
    categoria: Literal["mesa", "permissao", "personagem", "ficha", "inventario", "efeito"]
    acao: str
    relevancia: Literal["mecanica", "narrativa", "organizacional"]
    personagem_id: str | None = None
    alvo_tipo: str | None = None
    alvo_id: str | None = None
    resumo: str
    mudancas: list[MudancaAuditoria] = Field(default_factory=list)
    motivo: str | None = None
    correlacao_id: str | None = None
    corrige_evento_id: int | None = None
    corrigido_por: list[int] = Field(default_factory=list)
    corrigivel: bool = False


class PaginaAuditoria(BaseModel):
    eventos: list[EventoAuditoriaResumo]
    proximo_cursor: int | None = None


class CorrigirEventoRequest(BaseModel):
    motivo: str | None = Field(default=None, max_length=300)
    versao_esperada: int = Field(ge=0)


class CriarEntidadeRequest(BaseModel):
    tipo: Literal["personagem", "npc", "monstro"]
    visibilidade: Literal["mesa", "narrador"] = "narrador"
    proprietario_id: str | None = Field(default=None, min_length=1, max_length=100)
    revelacao: RevelacaoContrato = Field(default_factory=RevelacaoContrato)
    ficha: FichaContrato


class AlterarVisibilidadeRequest(BaseModel):
    visibilidade: Literal["mesa", "narrador"]
    revelacao: RevelacaoContrato = Field(default_factory=RevelacaoContrato)
    versao_esperada: int = Field(ge=0)


class EntidadePublica(BaseModel):
    id: str
    nome_publico: str | None = None
    imagem: str | None = Field(default=None, description="Retrato em base64, quando revelado.")


class AplicarEfeitoRequest(BaseModel):
    associacao: str | None = Field(default=None, max_length=200, description="Efeito do catálogo.")
    nome: str | None = Field(default=None, max_length=200)
    descricao: str | None = Field(default=None, max_length=10_000)
    modificadores: list[ModificadorResumo] = Field(default_factory=list, max_length=50)
    duracao_rodadas: int | None = Field(default=None, gt=0)
    origem: str | None = Field(default=None, max_length=500, description="O que causou o efeito na ficção.")
    motivo: str | None = Field(default=None, max_length=300)
    versao_esperada: int = Field(ge=0)


class AjustarEfeitoRequest(BaseModel):
    """Somente os campos enviados são alterados; `duracao_rodadas: null` remove a duração."""

    descricao: str | None = Field(default=None, max_length=10_000)
    duracao_rodadas: int | None = Field(default=None, gt=0)
    modificadores: list[ModificadorResumo] | None = Field(default=None, max_length=50)
    motivo: str | None = Field(default=None, max_length=300)
    versao_esperada: int = Field(ge=0)


class TransicaoEfeitoRequest(BaseModel):
    motivo: str | None = Field(default=None, max_length=300)
    versao_esperada: int = Field(ge=0)


class EfeitoComandoResposta(BaseModel):
    versao: int
    efeito: EfeitoResumo


CampoDescanso = Literal["pv", "pp", "exaustao", "estresse"]


class AlvoDescanso(BaseModel):
    personagem_id: str = Field(min_length=1, max_length=100)
    foco: CampoDescanso | None = None
    ajustes: dict[CampoDescanso, int] = Field(
        default_factory=dict, description="Substitui a quantidade calculada pela regra (recuperação ou redução).",
    )

    @field_validator("ajustes")
    @classmethod
    def validar_ajustes(cls, ajustes: dict[str, int]) -> dict[str, int]:
        if any(valor < 0 for valor in ajustes.values()):
            raise ValueError("Ajustes não podem ser negativos.")
        return ajustes


class PreviaDescansoRequest(BaseModel):
    tipo: Literal["curto", "longo"]
    conforto: int | None = Field(default=None, ge=0, le=4)
    seguranca: int | None = Field(default=None, ge=0, le=4)
    alvos: list[AlvoDescanso] = Field(min_length=1, max_length=50)

    @field_validator("alvos")
    @classmethod
    def validar_alvos(cls, alvos: list[AlvoDescanso]) -> list[AlvoDescanso]:
        if len({alvo.personagem_id for alvo in alvos}) != len(alvos):
            raise ValueError("Cada personagem pode aparecer uma única vez.")
        return alvos


class ConfirmarDescansoRequest(PreviaDescansoRequest):
    versoes: dict[str, int] = Field(description="Versão esperada de cada personagem selecionado.")
    motivo: str | None = Field(default=None, max_length=300)


class ResultadoRecursoDescanso(BaseModel):
    recurso: Literal["pv", "pp"]
    antes: int | None = None
    maximo: int | None = None
    calculado: int | None = None
    aplicado: int
    depois: int | None = None
    aviso: str | None = None


class ResultadoTrilhaDescanso(BaseModel):
    trilha: Literal["exaustao", "estresse"]
    antes: int
    calculado: int
    aplicado: int
    depois: int
    faixa_antes: str
    faixa_depois: str


class ResultadoDescansoPersonagem(BaseModel):
    personagem_id: str
    nome: str
    versao: int
    foco: CampoDescanso | None = None
    recursos: list[ResultadoRecursoDescanso]
    trilhas: list[ResultadoTrilhaDescanso]
    avisos: list[str] = Field(default_factory=list)
    altera: bool


class ResultadoDescansoResumo(BaseModel):
    tipo: Literal["curto", "longo"]
    conforto: int | None = None
    seguranca: int | None = None
    permite_foco: bool
    resultados: list[ResultadoDescansoPersonagem]
