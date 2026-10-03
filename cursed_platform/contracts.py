from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator, model_validator

from cursed_platform import catalogos


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


SistemaCampanha = Literal["cursed"]


class MesaResumo(BaseModel):
    id: str
    nome: str
    papel: Literal["narrador", "jogador"]
    sistema: SistemaCampanha = "cursed"
    sinopse: str | None = None
    capa_objeto: str | None = Field(
        default=None, description="Capa no armazenamento privado da mesa; ler por /mesas/{id}/ativos com exibicao=true."
    )


class AtualizarMesaRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    sinopse: str | None = Field(default=None, max_length=2000)
    sistema: SistemaCampanha | None = Field(default=None, description="Só \"cursed\" nesta versão.")


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
    nome: str | None = None
    tem_foto: bool = Field(default=False, description="A foto do perfil sai em /perfis/{usuario_id}/foto.")


class MesaDetalhe(MesaResumo):
    participantes: list[ParticipanteResumo]


class PerfilResposta(BaseModel):
    usuario_id: str
    apelido: str | None = Field(default=None, description="Vazio até o primeiro acesso ser confirmado.")
    apelido_sugerido: str
    nome_exibido: str
    tem_foto: bool
    email: str | None = None
    provedor: str | None = None
    confirmado: bool


class AtualizarPerfilRequest(BaseModel):
    apelido: str = Field(max_length=200)


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
    moedas_por_pilha: int | None = Field(
        default=None, ge=1, le=10_000,
        description="Moedas (de qualquer tipo) por pilha, ou seja, por célula da grade. Ausente mantém o valor atual.",
    )

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
    retrato_objeto: str | None = Field(default=None, description="Ler por /mesas/{mesa_id}/ativos com exibicao=true.")


class AcervoPersonagem(BaseModel):
    """Personagem visto fora da mesa, no acervo; valores exatamente como estão na ficha."""

    mesa_id: str
    mesa_nome: str
    personagem_id: str
    tipo: Literal["personagem", "npc", "monstro"]
    nome: str
    visibilidade: Literal["mesa", "narrador"]
    classe: str | None = None
    arquetipo: str | None = None
    raca: str | None = None
    nivel: int | None = None
    retrato_objeto: str | None = Field(default=None, description="Ler por /mesas/{mesa_id}/ativos com exibicao=true.")


class CopiarPersonagemRequest(BaseModel):
    mesa_origem_id: str = Field(min_length=1, max_length=100)
    personagem_origem_id: str = Field(min_length=1, max_length=100)


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


SubtipoItemGrade = Literal[
    "peitoral", "capacete", "luvas", "botas", "uma_mao", "duas_maos", "escudo",
    "mochila", "aljava", "moedas", "outro",
]


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
    # Grade de carga (carga-por-espacos). Sem subtipo/dimensão o item fica fora da grade.
    subtipo: SubtipoItemGrade | None = None
    largura: int | None = None
    altura: int | None = None
    coluna: int | None = None
    linha: int | None = None
    girado: bool = False
    maos: int | None = None
    pilha_max: int | None = None
    # Catálogo de itens (reformular-visual-da-ficha): já resolvidos com os padrões.
    raridade: str = Field(default="comum", description="Id da raridade no catálogo de itens.")
    categoria: str = Field(default="diversos", description="Id da categoria no catálogo de itens.")
    descricao: str | None = Field(default=None, description="Texto da carta de origem ou descrição importada.")


class AmpliacaoGradeResumo(BaseModel):
    fonte: Literal["mochila", "magia", "habilidade"]
    rotulo: str
    linhas: int
    colunas: int


class GradeInventario(BaseModel):
    """Grade de carga calculada pelo servidor: é a autoridade sobre posições e sobrecarga."""

    versao: int
    forca: int
    tamanho: Literal["minusculo", "pequeno", "medio", "grande", "enorme", "colossal"]
    tamanho_origem: Literal["ficha", "raca"]
    colunas_verdes: int
    linhas_verdes: int
    colunas: int = Field(description="Colunas exibidas, incluindo áreas perdidas ocupadas.")
    linhas: int = Field(description="Linhas exibidas: verdes, a vermelha extra e áreas perdidas ocupadas.")
    ampliacoes: list[AmpliacaoGradeResumo] = Field(default_factory=list)
    sobrecarga: bool
    itens_em_sobrecarga: list[str] = Field(default_factory=list)
    maos_ocupadas: int
    celulas_ocupadas: int
    celulas_verdes: int
    itens: list[ItemInventarioResumo]


class PosicaoItemGrade(BaseModel):
    item_id: str = Field(min_length=1, max_length=100)
    coluna: int | None = Field(default=None, ge=0, le=40)
    linha: int | None = Field(default=None, ge=0, le=40)
    girado: bool = False
    equipado: bool = False
    maos: int | None = Field(default=None, ge=1, le=2, description="Só armas versáteis: empunhadura com uma ou duas mãos.")


class ArrumacaoGradeRequest(BaseModel):
    versao_esperada: int = Field(ge=0)
    itens: list[PosicaoItemGrade] = Field(max_length=300)


class PilhaMoedas(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cobre: int = Field(default=0, ge=0)
    prata: int = Field(default=0, ge=0)
    ouro: int = Field(default=0, ge=0)


class MoedasRequest(BaseModel):
    """Um modo por pedido: `adicionar` enche as pilhas com espaço e cria novas; `retirar` tira das últimas pilhas;
    `bolsa` define os totais e o servidor junta tudo em pilhas; `pilhas` define cada pilha (para dividir)."""

    versao_esperada: int = Field(ge=0)
    adicionar: PilhaMoedas | None = None
    retirar: PilhaMoedas | None = None
    bolsa: PilhaMoedas | None = None
    pilhas: list[PilhaMoedas] | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def _um_modo(self) -> "MoedasRequest":
        modos = [m for m in (self.adicionar, self.retirar, self.bolsa, self.pilhas) if m is not None]
        if len(modos) != 1:
            raise ValueError("Informe um só modo: adicionar, retirar, bolsa ou pilhas.")
        for delta in (self.adicionar, self.retirar):
            if delta is not None and not any(delta.model_dump().values()):
                raise ValueError("Informe alguma quantidade de moedas.")
        return self


class ItemRecipienteResumo(BaseModel):
    id: str
    nome: str
    tipo: Literal["arma", "armadura", "outro"]
    subtipo: SubtipoItemGrade | None = None
    quantidade: int
    largura: int | None = None
    altura: int | None = None
    coluna: int | None = None
    linha: int | None = None
    girado: bool = False
    grupo: str | None = Field(default=None, description="Itens largados juntos (por exemplo, com a mochila).")
    efeitos: list[str] = Field(default_factory=list, description="Nomes dos efeitos que o item carrega.")
    icone_grade: str | None = None


class RecipienteResumo(BaseModel):
    id: str
    tipo: Literal["chao", "bau"]
    nome: str
    colunas: int
    linhas: int
    versao: int
    itens: list[ItemRecipienteResumo]


class CriarBauRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    colunas: int = Field(ge=1, le=20)
    linhas: int = Field(ge=1, le=20)


class ColocarCartaRequest(BaseModel):
    versao_id: str = Field(min_length=1, max_length=100)


class LargarItemRequest(BaseModel):
    versao_esperada: int = Field(ge=0)
    recipiente_id: str | None = Field(default=None, description="Sem recipiente, vai para o chão da cena ativa.")


class PegarItemRequest(BaseModel):
    personagem_id: str = Field(min_length=1, max_length=100)
    versao_esperada: int = Field(ge=0)
    coluna: int | None = Field(default=None, ge=0, le=40)
    linha: int | None = Field(default=None, ge=0, le=40)
    girado: bool = False


class OfertarItemRequest(BaseModel):
    para_personagem_id: str = Field(min_length=1, max_length=100)


class AceitarOfertaRequest(BaseModel):
    versao_esperada: int = Field(ge=0, description="Versão da ficha de quem recebe.")
    coluna: int | None = Field(default=None, ge=0, le=40, description="Sem lugar, o item chega fora da grade.")
    linha: int | None = Field(default=None, ge=0, le=40)
    girado: bool = False


class OfertaItemResumo(BaseModel):
    id: str
    estado: Literal["pendente", "aceita", "recusada", "cancelada"]
    item_id: str
    item_nome: str
    subtipo: SubtipoItemGrade | None = None
    largura: int | None = None
    altura: int | None = None
    de_personagem_id: str
    de_nome: str
    para_personagem_id: str
    para_nome: str
    criado_em: datetime


class VersaoRequest(BaseModel):
    versao_esperada: int = Field(ge=0)


class DefinirFormatoRequest(BaseModel):
    formato: FormatoItemGrade
    versao_esperada: int = Field(ge=0)


class ProblemaArrumacao(BaseModel):
    item_id: str | None = None
    motivo: str
    mensagem: str


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


class IconeResumo(BaseModel):
    """Ícone resolvido de um efeito: mesa → catálogo → padrão."""

    origem: Literal["mesa", "efeito", "catalogo", "padrao"]
    caminho: str = Field(description="Objeto do armazenamento (mesa, efeito) ou caminho público do frontend.")


class EfeitoResumo(BaseModel):
    id: str
    nome: str
    descricao: str
    estado: Literal["ativo", "suspenso", "encerrado"]
    duracao_rodadas: int | None = None
    ativacao: str | None = None
    modificadores: list[ModificadorResumo] = Field(default_factory=list)
    fontes: list[FonteEfeitoResumo] = Field(default_factory=list)
    derivado: bool = Field(default=False, description="Calculado pelo sistema (ex.: Sobrecarga); não se encerra nem se ajusta.")
    consequencias: list[str] = Field(default_factory=list, description="Consequências sem valor numérico na ficha.")
    associacao: str | None = Field(default=None, description="Código do efeito default, quando vem do catálogo.")
    icone: IconeResumo


class FonteValorResumo(BaseModel):
    tipo: Literal["base", "ajuste", "atributo", "pericia", "equipamento", "efeito", "classe", "nivel", "ajuste_narrador"]
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
    grupo: Literal["atributo", "pericia", "status", "recurso"]
    total: float | None = Field(description="Vazio quando o valor não é calculável.")
    fontes: list[FonteValorResumo]
    situacionais: list[SituacionalResumo] = Field(default_factory=list)
    calculavel: bool = True
    motivo: str | None = Field(default=None, description="Entrada que falta quando o valor não é calculável.")
    divergencia_legada: float | None = Field(
        default=None, description="Valor gravado à mão numa ficha antiga, quando difere do calculado.")


class AjustarRecursoRequest(BaseModel):
    """Ajuste do Narrador em PV/PP máximo ou Escala, quando uma regra específica prevalece."""

    model_config = ConfigDict(extra="forbid")

    versao_esperada: int = Field(ge=0)
    alvo: Literal["pv_maximo", "pp_maximo", "escala_pv", "escala_pp"]
    valor: int
    origem: str = Field(min_length=1, max_length=200)
    justificativa: str = Field(min_length=1, max_length=1000)


class AjusteRecursoResposta(BaseModel):
    versao: int
    valores: list[ValorDerivadoResumo]


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
    ator_nome: str | None = None
    origem: Literal["usuario", "automacao", "migracao"]
    categoria: Literal["mesa", "permissao", "personagem", "ficha", "inventario", "efeito", "carta"]
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


# ------------------------------------------------------------------ cartas

class _ConteudoBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    titulo: str = Field(min_length=1, max_length=200)
    texto: str = Field(min_length=1, max_length=10_000)
    requisitos: list[str] = Field(default_factory=list, max_length=30)
    tags: list[str] = Field(default_factory=list, max_length=30)
    ativos: list[str] = Field(default_factory=list, max_length=10, description="Objetos do armazenamento privado.")


class CustoAdicional(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recurso: str = Field(min_length=1, max_length=100)
    valor: int | None = Field(default=None, ge=0)
    descricao: str | None = Field(default=None, max_length=500)


class AlcanceCriacao(BaseModel):
    """Alcance do Framework: uma opção do catálogo e, para a distância, metros inteiros (adaptar-cartas-ao-framework, D1b)."""

    model_config = ConfigDict(extra="forbid")

    tipo: str = Field(min_length=1, max_length=40)
    metros: StrictInt | None = Field(default=None, ge=1, le=10_000)


_TEXTO_CURTO = 500
_TEXTO_DE_EFEITO = 4_000


class _ConteudoCriacao(_ConteudoBase):
    """Habilidade ou magia pelo Framework de Criação.

    Custos permanecem separados; `custo_legado` é só texto histórico e nunca preenche os demais. Grau e
    Descansos Mínimos não são guardados: saem do Custo de Aprendizado pelas tabelas do catálogo. `custo_uso`
    só existe quando o Narrador registra um valor próprio; sem ele, vale o calculado pela Potência de Uso.
    Tipo (`ativacao`), Forma e Alcance são validados contra as opções do catálogo em `cartas.validar`.
    """

    ativacao: str | None = Field(default=None, max_length=40)
    ativacao_legado: Literal["passiva"] | None = None
    custo_aprendizado: int | None = Field(default=None, ge=0)
    potencia_uso: int | None = Field(default=None, ge=0)
    custo_uso: int | None = Field(default=None, ge=0)
    custos_adicionais: list[CustoAdicional] = Field(default_factory=list, max_length=10)
    custo_legado: str | None = Field(default=None, max_length=500)
    lancamento: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    combo: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    persistencia: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    alcance: AlcanceCriacao | None = None
    forma: str | None = Field(default=None, max_length=40)
    alvo_area: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    impactos: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    duracao: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    efeito_principal: str | None = Field(default=None, max_length=_TEXTO_DE_EFEITO)
    efeitos_secundarios: str | None = Field(default=None, max_length=_TEXTO_DE_EFEITO)
    efeitos_condicionais: str | None = Field(default=None, max_length=_TEXTO_DE_EFEITO)
    teste: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    componentes: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    limitacoes: str | None = Field(default=None, max_length=_TEXTO_CURTO)
    escalonamento: str | None = Field(default=None, max_length=_TEXTO_CURTO)


class ConteudoHabilidade(_ConteudoCriacao):
    tipo: Literal["habilidade"] = "habilidade"
    disciplina: str | None = Field(default=None, max_length=100)


class ConteudoMagia(_ConteudoCriacao):
    tipo: Literal["magia"] = "magia"
    escola: str | None = Field(default=None, max_length=40)


CAMPOS_DO_FRAMEWORK = (
    "lancamento", "combo", "persistencia", "alcance", "forma", "alvo_area", "impactos", "duracao",
    "efeito_principal", "efeitos_secundarios", "efeitos_condicionais", "teste", "componentes", "limitacoes",
    "escalonamento",
)


class EfeitoDeclarado(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str = Field(min_length=1, max_length=200)
    descricao: str = Field(min_length=1, max_length=10_000)
    modificadores: list[ModificadorResumo] = Field(default_factory=list, max_length=50)
    ativacao: Literal["enquanto_equipado", "manual"] = "enquanto_equipado"


CATEGORIA_POR_SUBTIPO: dict[str, str] = {
    "uma_mao": "arma", "duas_maos": "arma",
    "peitoral": "armadura", "capacete": "armadura", "luvas": "armadura", "botas": "armadura", "escudo": "armadura",
    "mochila": "outro", "aljava": "outro", "moedas": "outro", "outro": "outro",
}


class MochilaFormato(BaseModel):
    model_config = ConfigDict(extra="forbid")

    linhas: int = Field(default=0, ge=0, le=4)
    colunas: int = Field(default=0, ge=0, le=4)
    requisito_forca: int | None = Field(default=None, ge=0, le=10)


class AljavaFormato(BaseModel):
    model_config = ConfigDict(extra="forbid")

    capacidade_flechas: int = Field(ge=1, le=200)


class FormatoItemGrade(BaseModel):
    """Formato do item na grade de carga, definido na criação (carga-por-espacos)."""

    model_config = ConfigDict(extra="forbid")

    subtipo: SubtipoItemGrade
    largura: int = Field(ge=1, le=12)
    altura: int = Field(ge=1, le=12)
    maos: int | None = Field(default=None, ge=0, le=2, description="Só itens do tipo Outros.")
    pilha_max: int | None = Field(default=None, ge=1, le=999, description="Só itens do tipo Outros.")
    mochila: MochilaFormato | None = None
    aljava: AljavaFormato | None = None
    icone_grade: str | None = Field(default=None, max_length=500, description="Imagem na proporção da dimensão.")
    versatil: bool = Field(default=False, description="Só armas de uma mão: podem ser empunhadas com uma ou duas mãos.")
    raridade: str = Field(default="comum", max_length=40, description="Id do catálogo de itens; só etiqueta, sem efeito mecânico.")
    categoria: str | None = Field(
        default=None, max_length=40,
        description="Só itens do tipo Outros, entre as escolhas do catálogo; nos demais, a categoria vem do subtipo.",
    )

    @model_validator(mode="after")
    def _catalogo(self) -> "FormatoItemGrade":
        itens = catalogos.obter().itens
        if itens.raridade(self.raridade) is None:
            raise ValueError(f"Raridade desconhecida: {self.raridade}.")
        if self.subtipo != "outro" and self.categoria is not None:
            raise ValueError("Só itens do tipo Outros escolhem a categoria; nos demais, ela vem do tipo.")
        if self.categoria is not None and self.categoria not in itens.escolhas_em_outros():
            raise ValueError(f"Categoria desconhecida para itens Outros: {self.categoria}.")
        return self

    @model_validator(mode="after")
    def _coerente(self) -> "FormatoItemGrade":
        if self.versatil and self.subtipo != "uma_mao":
            raise ValueError("Só armas de uma mão podem ser versáteis.")
        if self.subtipo == "moedas":
            raise ValueError("Moedas são do sistema e não se criam como item.")
        if self.subtipo != "outro" and (self.maos is not None or self.pilha_max is not None):
            raise ValueError("Mãos e pilha só se definem em itens do tipo Outros.")
        if (self.subtipo == "mochila") != (self.mochila is not None):
            raise ValueError("A ampliação da mochila é obrigatória na mochila e só nela.")
        if (self.subtipo == "aljava") != (self.aljava is not None):
            raise ValueError("A capacidade de flechas é obrigatória na aljava e só nela.")
        return self


class ConteudoItem(_ConteudoBase):
    tipo: Literal["item"] = "item"
    item_tipo: Literal["arma", "armadura", "outro"]
    dados: dict[str, Any] = Field(default_factory=dict, description="Campos do subtipo, como dano, armadura e rdb, conforme o catálogo de itens.")
    quantidade: int = Field(default=1, ge=1)
    efeitos: list[EfeitoDeclarado] = Field(default_factory=list, max_length=10)
    formato: FormatoItemGrade | None = Field(default=None, description="Obrigatório para publicar (carga em grade).")

    @model_validator(mode="after")
    def _formato_compativel(self) -> "ConteudoItem":
        if self.formato is not None and CATEGORIA_POR_SUBTIPO[self.formato.subtipo] != self.item_tipo:
            raise ValueError("O tipo do item não combina com o subtipo do formato.")
        return self


class ConteudoEfeito(_ConteudoBase):
    tipo: Literal["efeito"] = "efeito"
    modificadores: list[ModificadorResumo] = Field(default_factory=list, max_length=50)
    duracao_rodadas: int | None = Field(default=None, gt=0)


ConteudoCarta = ConteudoHabilidade | ConteudoMagia | ConteudoItem | ConteudoEfeito


class CriarCartaRequest(BaseModel):
    tipo: Literal["habilidade", "magia", "item", "efeito"]
    rascunho: dict[str, Any] = Field(default_factory=dict, description="Conteúdo em edição; validado ao publicar.")


class SalvarRascunhoRequest(BaseModel):
    rascunho: dict[str, Any]
    versao_esperada: int = Field(ge=0)
    tipo: Literal["habilidade", "magia", "item", "efeito"] | None = Field(
        default=None, description="Troca o tipo da carta; só antes da primeira publicação.",
    )


class PublicarCartaRequest(BaseModel):
    versao_esperada: int = Field(ge=0)
    promover_ativos: bool = False


class ProblemaValidacao(BaseModel):
    campo: str
    mensagem: str


class PreviaCriacaoResposta(BaseModel):
    """PV, PP e Escalas de uma ficha ainda não gravada e os problemas que impediriam criá-la."""

    valores: list[ValorDerivadoResumo]
    problemas: list[ProblemaValidacao] = Field(default_factory=list)


class ValidacaoCarta(BaseModel):
    valida: bool
    problemas: list[ProblemaValidacao] = Field(default_factory=list)
    revisao_pendente: list[str] = Field(default_factory=list)


class CalculadosCarta(BaseModel):
    """Valores que saem das tabelas do Framework (adaptar-cartas-ao-framework, D3); nunca guardados na carta.
    `descansos_minimos` só chega ao Narrador."""

    grau: str | None = Field(default=None, description="Id do grau no catálogo do Framework.")
    descansos_minimos: int | None = None
    custo_uso_framework: int | None = Field(default=None, description="Custo de Uso calculado pela Potência de Uso.")


class CartaVersaoResumo(BaseModel):
    id: str
    definicao_id: str
    numero: int
    tipo: Literal["habilidade", "magia", "item", "efeito"]
    conteudo: dict[str, Any]
    calculados: CalculadosCarta | None = None
    procedencia: dict[str, Any]
    revisao_pendente: list[str] = Field(default_factory=list)
    publicado_por: str
    publicado_em: datetime


class CartaDefinicaoResumo(BaseModel):
    id: str
    tipo: Literal["habilidade", "magia", "item", "efeito"]
    versao: int = Field(description="Versão do rascunho para controle de concorrência.")
    rascunho: dict[str, Any] | None = None
    procedencia_rascunho: dict[str, Any] = Field(default_factory=dict)
    versao_publicada: int | None = None
    publicada: CartaVersaoResumo | None = None
    arquivada: bool = False
    origem_sistema: str | None = Field(
        default=None, description="Habilidade do catálogo que a carta materializa; o JSON prevalece sobre edições.")


class ImportarCartaRequest(BaseModel):
    codigo: str = Field(min_length=1, max_length=5_000_000)


class PreviaImportacaoCarta(BaseModel):
    tipo: Literal["habilidade", "magia", "item", "efeito"]
    rascunho: dict[str, Any]
    calculados: CalculadosCarta | None = None
    validacao: ValidacaoCarta
    avisos: list[str] = Field(default_factory=list)


class CartaVisivel(BaseModel):
    """Conteúdo publicado que um participante pode ver; sem procedência nem notas do catálogo."""

    versao_id: str
    definicao_id: str
    numero: int
    tipo: Literal["habilidade", "magia", "item", "efeito"]
    conteudo: dict[str, Any]
    calculados: CalculadosCarta | None = None


class CartaPersonagemResumo(BaseModel):
    id: str
    personagem_id: str
    tipo: Literal["habilidade", "magia", "item", "efeito"]
    estado: Literal["disponivel", "em_aprendizado", "aprendida", "no_inventario", "aplicada", "removida"]
    origem: Literal["concessao", "oferta"]
    excecao_aprendizado: bool
    item_id: str | None = None
    efeito_id: str | None = None
    adquirida_em: datetime
    carta: CartaVisivel
    versao_mais_recente: int | None = Field(default=None, description="Somente para o Narrador.")
    concedida_por: str | None = Field(
        default=None, description="Escolha que concedeu a carta (ex.: classe:Druida); vazio para ofertas e concessões avulsas.")


class ConcederCartaRequest(BaseModel):
    versao_id: str = Field(min_length=1, max_length=100)
    excecao_aprendizado: bool = False
    motivo: str | None = Field(default=None, max_length=300)
    versao_esperada: int = Field(ge=0)


class TransicaoCartaRequest(BaseModel):
    motivo: str | None = Field(default=None, max_length=300)
    versao_esperada: int = Field(ge=0)


class AquisicaoCartasResposta(BaseModel):
    versao: int
    cartas: list[CartaPersonagemResumo]


class CriarOfertaRequest(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    versao_ids: list[str] = Field(min_length=1, max_length=20)
    personagem_ids: list[str] = Field(min_length=1, max_length=20)
    min_escolhas: int = Field(default=1, ge=0)
    max_escolhas: int = Field(default=1, ge=1)
    expira_em: datetime | None = None


class DestinatarioOferta(BaseModel):
    personagem_id: str
    estado: Literal["pendente", "respondida", "expirada", "cancelada"]
    escolhas: list[str] = Field(default_factory=list)
    respondido_em: datetime | None = None


class OfertaResumo(BaseModel):
    id: str
    titulo: str
    estado: Literal["aberta", "encerrada", "cancelada"]
    min_escolhas: int
    max_escolhas: int
    expira_em: datetime | None = None
    expirada: bool
    criado_em: datetime
    candidatas: list[CartaVisivel]
    destinatarios: list[DestinatarioOferta] = Field(description="Jogadores veem apenas os próprios personagens.")


class ResponderOfertaRequest(BaseModel):
    escolhas: list[str] = Field(default_factory=list, max_length=20)
    versao_esperada: int = Field(ge=0)


class ApresentarCartaRequest(BaseModel):
    versao_id: str = Field(min_length=1, max_length=100)
    destinatarios: list[str] = Field(default_factory=list, max_length=50, description="Usuários; vazio = toda a mesa.")


class ApresentacaoResumo(BaseModel):
    id: str
    estado: Literal["apresentada", "recolhida"]
    apresentada_em: datetime
    carta: CartaVisivel
    destinatarios: list[str] | None = Field(default=None, description="Somente para o Narrador.")
    vista_por: list[str] | None = Field(default=None, description="Somente para o Narrador: quem já viu e fechou a carta.")


class DiferencaCarta(BaseModel):
    campo: str
    antes: Any = None
    depois: Any = None


class PreviaMigracaoCarta(BaseModel):
    origem_numero: int
    destino_numero: int
    diferencas: list[DiferencaCarta]
    observacao: str | None = None


class MigrarCartaRequest(BaseModel):
    versao_destino_id: str = Field(min_length=1, max_length=100)
    versao_esperada: int = Field(ge=0)


class FaixaDesgaste(BaseModel):
    id: str
    nome: str
    efeito: str
    min: int
    max: int


class TrilhaDesgaste(BaseModel):
    """Exaustão ou Estresse com a faixa atual e o próximo limiar, conforme as regras do domínio."""

    recurso: Literal["exaustao", "estresse"]
    atual: int
    maximo: int
    registrado: bool = Field(description="Falso quando a ficha ainda não registra a trilha (valor 0 presumido).")
    faixa: FaixaDesgaste
    proxima_faixa: FaixaDesgaste | None = None
    pontos_ate_proxima: int | None = None


TrilhaNome = Literal["exaustao", "estresse"]
CategoriaConsequencia = Literal["trauma", "ferimento_grave", "sequela", "aflicao", "outro"]


class OrigemConsequencia(BaseModel):
    """O que causou a alteração ou a consequência na ficção (carta, arma, magia, decisão do Narrador...)."""

    tipo: Literal["sistema", "mestre", "arma", "armadura", "magia", "habilidade", "classe", "outro"] = "mestre"
    nome: str = Field(min_length=1, max_length=200)
    id: str | None = Field(default=None, max_length=200)


class ConsequenciaEntrada(BaseModel):
    """Campos mínimos de uma consequência persistente; Trauma também exige gatilho."""

    categoria: CategoriaConsequencia
    nome: str = Field(min_length=1, max_length=200)
    descricao: str = Field(min_length=1, max_length=2_000)
    efeito: str = Field(min_length=1, max_length=2_000, description="Manifestação ou efeito atual.")
    gatilho: str | None = Field(default=None, max_length=500)
    tratamento_regra: str = Field(min_length=1, max_length=1_000, description="Como é tratada ou encerrada.")
    origem: OrigemConsequencia | None = None

    def para_dominio(self) -> dict[str, Any]:
        dados: dict[str, Any] = {
            "categoria": self.categoria, "nome": self.nome.strip(), "descricao": self.descricao.strip(),
            "consequencia": self.efeito.strip(), "efeito_atual": self.efeito.strip(),
            "gatilho": (self.gatilho or "").strip(), "tratamento": {"regra": self.tratamento_regra.strip()},
        }
        if self.origem is not None:
            dados["origem"] = self.origem.model_dump(exclude_none=True)
        return dados


class ColapsoMentalEntrada(BaseModel):
    """Manifestação escolhida e o Trauma que o colapso cria (novo) ou intensifica (existente)."""

    manifestacao: str = Field(min_length=1, max_length=300)
    trauma_id: str | None = Field(default=None, max_length=200)
    trauma: ConsequenciaEntrada | None = None

    def para_dominio(self) -> dict[str, Any]:
        return {"manifestacao": self.manifestacao, "trauma_id": self.trauma_id,
                "trauma": self.trauma.para_dominio() if self.trauma is not None else None}


class PreviaDesgasteRequest(BaseModel):
    trilha: TrilhaNome
    delta: int = Field(ge=-15, le=15)


class AlterarDesgasteRequest(PreviaDesgasteRequest):
    origem: OrigemConsequencia
    justificativa: str | None = Field(default=None, max_length=300)
    colapso_mental: ColapsoMentalEntrada | None = None
    consequencia_excedente: ConsequenciaEntrada | None = None
    versao_esperada: int = Field(ge=0)


class PreviaEsforcoRequest(BaseModel):
    tipo: Literal["fisico", "mental"]
    pontos: int = Field(ge=1, le=3)
    bonus_movimento: int = Field(default=0, ge=0, le=3, description="Pontos convertidos em +1 m cada (só físico).")


class EsforcoRequest(PreviaEsforcoRequest):
    acao: str = Field(min_length=1, max_length=200, description="Ação ou teste em que o esforço foi usado.")
    colapso_mental: ColapsoMentalEntrada | None = None
    versao_esperada: int = Field(ge=0)


class EncerrarColapsoRequest(BaseModel):
    motivo: str = Field(min_length=1, max_length=300, description="Auxílio pertinente ou fim do conflito imediato.")
    versao_esperada: int = Field(ge=0)


class PreviaDesgaste(BaseModel):
    trilha: TrilhaNome
    antes: int
    depois: int
    maximo: int
    delta_solicitado: int
    delta_aplicado: int
    faixa_antes: FaixaDesgaste
    faixa_depois: FaixaDesgaste
    mudou_faixa: bool
    colapso_fisico: bool
    colapso_mental: bool = Field(description="Exige manifestação e Trauma novo ou intensificado.")
    excedente_fisico: bool = Field(description="Já estava em 15: o Narrador aplica no máximo uma consequência física.")
    tipo_esforco: Literal["fisico", "mental"] | None = None
    bonus_teste: int | None = None
    bonus_movimento: int | None = None


class OrigemResumo(BaseModel):
    tipo: str
    nome: str = ""
    id: str | None = None


class TratamentoResumo(BaseModel):
    estado: Literal["ativo", "mitigado", "em_tratamento", "encerrado"]
    progresso: int = 0
    objetivo: int | None = None
    regra: str = ""


class RegistroConsequencia(BaseModel):
    acao: str
    justificativa: str | None = None
    criado_em: str | None = None


class ConsequenciaResumo(BaseModel):
    id: str
    categoria: CategoriaConsequencia
    nome: str
    descricao: str
    origem: OrigemResumo
    gatilho: str = ""
    efeito_atual: str = ""
    intensidade: int = 1
    tratamento: TratamentoResumo
    criado_em: str | None = None
    atualizado_em: str | None = None
    historico: list[RegistroConsequencia] = Field(default_factory=list)


class DesgasteComandoResposta(BaseModel):
    versao: int
    trilhas: list[TrilhaDesgaste]
    consequencias: list[ConsequenciaResumo]
    previa: PreviaDesgaste | None = None


class CriarConsequenciaRequest(BaseModel):
    consequencia: ConsequenciaEntrada
    justificativa: str = Field(min_length=1, max_length=300)
    versao_esperada: int = Field(ge=0)


class EditarConsequenciaRequest(BaseModel):
    """Somente os campos enviados são alterados."""

    nome: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = Field(default=None, min_length=1, max_length=2_000)
    efeito: str | None = Field(default=None, min_length=1, max_length=2_000)
    gatilho: str | None = Field(default=None, max_length=500)
    tratamento_regra: str | None = Field(default=None, min_length=1, max_length=1_000)
    progresso: int | None = Field(default=None, ge=0)
    objetivo: int | None = Field(default=None, ge=0)
    origem: OrigemConsequencia | None = None
    justificativa: str = Field(min_length=1, max_length=300)
    versao_esperada: int = Field(ge=0)


class TransicaoConsequenciaRequest(BaseModel):
    justificativa: str = Field(min_length=1, max_length=300)
    versao_esperada: int = Field(ge=0)


class ConsequenciaComandoResposta(BaseModel):
    versao: int
    consequencias: list[ConsequenciaResumo]
    consequencia: ConsequenciaResumo | None = Field(default=None, description="Ausente quando foi removida.")


# ------------------------------------------------------------------- sala

class ModulosMesa(BaseModel):
    sala: bool = False


class CriarCenaRequest(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    colunas: int = Field(default=20, ge=1, le=200)
    linhas: int = Field(default=15, ge=1, le=200)
    mapa_objeto: str | None = Field(default=None, max_length=500)


class AreaDoMapaRequest(BaseModel):
    """Quantas casas o mapa da cena ocupa (experiencia-da-mesa, item 12)."""
    colunas: int = Field(ge=1, le=200)
    linhas: int = Field(ge=1, le=200)


class PermitirMovimentoRequest(BaseModel):
    """Libera ou bloqueia o movimento do token pelos jogadores (experiencia-da-mesa, item 13)."""
    liberado: bool
    controladores: list[str] | None = Field(default=None, max_length=20, description="Quem pode mover um token sem dono.")
    versao_esperada: int = Field(ge=0)


class PermissoesEmLoteRequest(BaseModel):
    modo: Literal["bloquear_todos", "so_principais", "liberar_todos"]


class CriarTokenRequest(BaseModel):
    camada_id: str = Field(min_length=1, max_length=100)
    rotulo: str = Field(min_length=1, max_length=100)
    # Cena sem bordas (experiencia-da-mesa, item 7): só o limite de sanidade de sala.LIMITE_DA_CENA.
    x: int = Field(ge=-2000, le=2000)
    y: int = Field(ge=-2000, le=2000)
    tamanho: int = Field(default=1, ge=1, le=10)
    personagem_id: str | None = Field(default=None, max_length=100)
    controladores: list[str] = Field(default_factory=list, max_length=20)
    oculto: bool = False


class MoverTokenRequest(BaseModel):
    # Cena sem bordas (experiencia-da-mesa, item 7): só o limite de sanidade de sala.LIMITE_DA_CENA.
    x: int = Field(ge=-2000, le=2000)
    y: int = Field(ge=-2000, le=2000)
    versao_esperada: int = Field(ge=0)


class VisibilidadeTokenRequest(BaseModel):
    camada_id: str | None = Field(default=None, max_length=100)
    oculto: bool | None = None
    versao_esperada: int = Field(ge=0)


class TokenSala(BaseModel):
    id: str
    camada_id: str
    personagem_id: str | None = None
    rotulo: str
    x: int
    y: int
    tamanho: int
    versao: int
    controlavel: bool
    oculto: bool | None = Field(default=None, description="Somente para o Narrador.")
    visivel_para_jogadores: bool | None = Field(default=None, description="Somente para o Narrador.")
    controladores: list[str] | None = Field(default=None, description="Somente para o Narrador.")
    movimento_liberado: bool | None = Field(default=None, description="Somente para o Narrador: jogadores podem mover.")
    tipo_personagem: Literal["personagem", "npc", "monstro"] | None = Field(
        default=None, description="Tipo do personagem ligado (para a arte padrão do retrato); o retrato vem de /sala/tokens/{id}/retrato.")


class CamadaSala(BaseModel):
    id: str
    nome: str
    visibilidade: Literal["mesa", "narrador"]
    ordem: int


class CenaSala(BaseModel):
    id: str
    nome: str
    colunas: int
    linhas: int
    mapa_objeto: str | None = None
    ativa: bool
    versao: int
    camadas: list[CamadaSala]
    tokens: list[TokenSala]


class CenaResumoSala(BaseModel):
    id: str
    nome: str
    ativa: bool


class SalaSnapshot(BaseModel):
    modulo_ativo: bool
    cenas: list[CenaResumoSala] = Field(default_factory=list, description="Somente para o Narrador.")
    cena: CenaSala | None = None


# ------------------------------------------------------------------ catálogos do sistema


class BaseClasseResumo(BaseModel):
    valor: int
    atributo: str = Field(description="Chave normalizada do atributo: vigor ou proposito.")
    texto: str


class HabilidadeCatalogoResumo(BaseModel):
    nome: str
    descricao: str
    tipo: str


class ArquetipoResumo(BaseModel):
    nome: str
    conceito: str
    habilidades: list[HabilidadeCatalogoResumo]


class ClasseCatalogoResumo(BaseModel):
    nome: str
    cor: str | None = None
    pv: BaseClasseResumo | None = None
    escala_pv: BaseClasseResumo | None = None
    pp: BaseClasseResumo | None = None
    escala_pp: BaseClasseResumo | None = None
    habilidades: list[HabilidadeCatalogoResumo]
    arquetipos: list[ArquetipoResumo]


class IntervaloAlturaResumo(BaseModel):
    """Altura em metros; `maxima` vazia é sem limite superior."""

    minima: float
    maxima: float | None = None


class FaixaAlturaResumo(IntervaloAlturaResumo):
    tamanho: str


class RacaCatalogoResumo(BaseModel):
    nome: str
    deslocamento: int | None = None
    tamanho: str | None = None
    habilidades: list[HabilidadeCatalogoResumo]
    altura: IntervaloAlturaResumo | None = Field(default=None, description="Intervalo típico de altura da raça, na média.")


class PecadoResumo(BaseModel):
    nome: str
    icone: str
    equivalentes: list[str] = Field(default_factory=list)


class CampoPersonalidadeResumo(BaseModel):
    chave: str
    rotulo: str
    dica: str
    longo: bool = Field(default=False, description="Texto longo (ex.: História): área de texto maior.")
    limite: int | None = Field(default=None, description="Máximo de caracteres aceito; vazio = sem limite. Nos traços, o de cada traço.")
    tipo: Literal["texto", "tracos"] | None = Field(default=None, description="Texto (vazio também é texto) ou lista de palavras curtas (traços).")
    maximo: int | None = Field(default=None, description="Quantidade máxima de traços; só no tipo tracos.")
    icone: str | None = Field(default=None, description="Ícone da linha na aba Personalidade.")


class GrupoPersonalidadeResumo(BaseModel):
    id: str
    titulo: str
    subtitulo: str
    emblema: str = Field(description="Ícone do medalhão do quadro.")
    campos: list[str] = Field(description="Chaves dos campos, na ordem das linhas; inclui alinhamento e pecado.")


class TopoPersonalidadeResumo(BaseModel):
    citacao: str | None = Field(default=None, description="Campo mostrado como citação no topo da aba.")
    etiquetas: str | None = Field(default=None, description="Campo de traços mostrado como etiquetas no topo da aba.")


class ListasFichaResumo(BaseModel):
    sexos: list[str]
    alinhamentos: list[str]
    pecados: list[PecadoResumo]
    campos_personalidade: list[CampoPersonalidadeResumo]
    faixas_de_altura: list[FaixaAlturaResumo] = Field(
        default_factory=list, description="Faixa de altura de cada Tamanho, do menor ao maior (fora da média).")
    icones_ficha: dict[str, str] = Field(
        default_factory=dict, description="Ícone do Resumo por nome de atributo, perícia ou grupo, como gravado na ficha.")
    personalidade_topo: TopoPersonalidadeResumo | None = Field(
        default=None, description="Campos do topo da aba Personalidade; vazio sem arrumação no catálogo.")
    grupos_personalidade: list[GrupoPersonalidadeResumo] = Field(
        default_factory=list, description="Quadros da aba Personalidade, na ordem de exibição.")
    icones_personalidade: dict[str, str] = Field(
        default_factory=dict, description="Ícone dos campos com lista própria (alinhamento e pecado).")


class RaridadeResumo(BaseModel):
    id: str
    rotulo: str
    cor: str


class CategoriaItemResumo(BaseModel):
    id: str
    rotulo: str
    icone: str
    subtipos: list[str] = Field(default_factory=list, description="Subtipos que caem nesta categoria sem escolha.")
    escolha_em_outros: bool = Field(default=False, description="Escolhida pelo Narrador em itens do tipo Outros.")
    padrao_outros: bool = Field(default=False, description="Categoria dos itens Outros sem escolha.")


class CampoItemResumo(BaseModel):
    """Campo de item, guardado em ``dados[id]`` (simplificar-criacao-de-cartas)."""

    id: str
    rotulo: str
    tipo: Literal["inteiro", "texto", "escolha", "escolhas", "etiquetas"]
    icone: str
    lista: str | None = Field(default=None, description="Lista de escolhas, nos campos de escolha.")
    exemplo: str | None = None
    unidade: str | None = None


class CampoDoSubtipoResumo(BaseModel):
    campo: str
    sugestoes: str | None = Field(default=None, description="Lista de sugestões, nos campos de etiquetas.")


class CatalogoItensResumo(BaseModel):
    """Raridades e categorias de item (reformular-visual-da-ficha), só etiqueta e organização, e os campos de
    cada subtipo, tirados de Equipamentos.md (simplificar-criacao-de-cartas)."""

    raridades: list[RaridadeResumo]
    categorias: list[CategoriaItemResumo]
    listas: dict[str, list[str]] = Field(default_factory=dict)
    campos: list[CampoItemResumo] = Field(default_factory=list)
    campos_por_subtipo: dict[str, list[CampoDoSubtipoResumo]] = Field(default_factory=dict)


class OpcaoResumo(BaseModel):
    id: str
    rotulo: str


class FaixaGrauResumo(BaseModel):
    grau: str
    minimo: int
    maximo: int | None = Field(description="Ausente na última faixa, que é aberta.")
    descansos: int


class NaturezaCriacaoResumo(BaseModel):
    custo_minimo: int
    faixas: list[FaixaGrauResumo]


class CatalogoFrameworkResumo(BaseModel):
    """Tabelas do Framework de Criação (adaptar-cartas-ao-framework, D4): faixas de grau, regra do Custo de Uso
    e opções fechadas de Tipo, Escola, Forma e Alcance."""

    graus: list[OpcaoResumo]
    naturezas: dict[str, NaturezaCriacaoResumo]
    divisor_uso: int
    minimo_uso: int
    sem_custo_uso: list[str]
    tipos: list[OpcaoResumo]
    escolas: list[OpcaoResumo]
    formas: list[OpcaoResumo]
    alcances: list[OpcaoResumo]
    alcance_com_distancia: str


class ModificadorCatalogoResumo(BaseModel):
    alvo: str
    valor: float
    quando: str | None = None


class EfeitoDefaultResumo(BaseModel):
    associacao: str
    nome: str
    descricao: str
    grupo: str | None = None
    modificadores: list[ModificadorCatalogoResumo] = Field(default_factory=list)
    substitui: list[str] = Field(default_factory=list, description="Associações que este efeito encerra ao ser aplicado.")
    substitui_nomes: list[str] = Field(default_factory=list)
    icone: IconeResumo


class ErroCatalogoResumo(BaseModel):
    arquivo: str
    motivo: str
    em: datetime


class EstadoCatalogoResumo(BaseModel):
    versao: str
    erro: ErroCatalogoResumo | None = None


# ------------------------------------------------------------------ envio de imagens


class ImagemResposta(BaseModel):
    """Referência gravada no ponto de envio; a imagem nunca volta na resposta."""

    destino: Literal["retrato", "ilustracao", "item", "icone-grade", "efeito", "carta", "mapa", "icone-efeito", "capa", "foto"]
    alvo: str
    objeto: str | None = Field(default=None, description="Objeto original no armazenamento privado; vazio após remover.")
    exibicao: str | None = Field(default=None, description="Versão reduzida em WEBP, quando o destino tem uma.")
    versao: int | None = Field(default=None, description="Nova versão do personagem ou do rascunho da carta.")
