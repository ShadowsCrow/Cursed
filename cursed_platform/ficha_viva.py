"""Inventário, efeitos, importação e valores derivados da ficha viva.

Inventário e efeitos aplicados vivem nas tabelas relacionais; a ficha JSON
fornece atributos, perícias e ajustes manuais. Os cálculos reproduzem o Status
da aplicação Streamlit e tornam explícitas as fontes de cada total.

Um modificador contribui para um valor derivado somente quando seu alvo,
normalizado sem acentos e em minúsculas, é igual à chave do valor:
`atributo:<nome>`, `pericia:<nome>`, `defesa:esquiva`, `defesa:armadura`,
`rdb:armadura` ou `carga:peso`. Alvos de rolagem, como `ataque` ou
`teste:percepcao`, não alteram totais.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping
import unicodedata
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from cursed_platform.domain.efeitos import carregar_catalogo, indexar_catalogo
from cursed_platform.domain.efeitos_codec import decode_effect
from cursed_platform.domain.equip_codec import decode_equipment
from cursed_platform.persistence import (
    EfeitoAplicadoRegistro, FonteEfeitoRegistro, ItemInventarioRegistro,
    OperacaoEfeitoRegistro, PersonagemRegistro,
)


def _slug(texto: str) -> str:
    ascii_ = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode("ascii")
    return "_".join(ascii_.casefold().split())


def chave(categoria: str, nome: str) -> str:
    return f"{_slug(categoria)}:{_slug(nome)}"


def _normalizar_alvo(alvo: str) -> str:
    categoria, separador, nome = str(alvo).partition(":")
    return chave(categoria, nome) if separador else _slug(categoria)


def _inteiro(valor: Any) -> int:
    try:
        return int(valor or 0)
    except (TypeError, ValueError):
        return 0


def _inteiro_opcional(valor: Any) -> int | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, int) or (isinstance(valor, float) and valor.is_integer()):
        return max(0, int(valor))
    return None


def _decimal(valor: Any) -> float:
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0.0


# ----------------------------------------------------------------- consultas

@dataclass(frozen=True)
class Modificador:
    alvo: str
    valor: float
    contexto: str | None = None


@dataclass
class EfeitoAtual:
    id: str
    nome: str
    descricao: str
    estado: str
    duracao_rodadas: int | None
    modificadores: list[Modificador]
    fontes: list[FonteEfeitoRegistro]
    conteudo: dict[str, Any] = field(default_factory=dict)

    @property
    def equipamento_id(self) -> str | None:
        return next((f.equipamento_id for f in self.fontes if f.tipo == "equipamento"), None)


def itens(session: Session, mesa_id: str, personagem_id: str) -> list[ItemInventarioRegistro]:
    return list(session.scalars(
        select(ItemInventarioRegistro)
        .where(ItemInventarioRegistro.mesa_id == mesa_id, ItemInventarioRegistro.personagem_id == personagem_id)
        .order_by(ItemInventarioRegistro.tipo, ItemInventarioRegistro.nome, ItemInventarioRegistro.id)
    ))


def efeitos(session: Session, mesa_id: str, personagem_id: str) -> list[EfeitoAtual]:
    """Efeitos ativos e suspensos, com modificadores numéricos e fontes."""
    registros = list(session.scalars(
        select(EfeitoAplicadoRegistro)
        .where(
            EfeitoAplicadoRegistro.mesa_id == mesa_id,
            EfeitoAplicadoRegistro.personagem_id == personagem_id,
            EfeitoAplicadoRegistro.estado != "encerrado",
        )
        .order_by(EfeitoAplicadoRegistro.iniciado_em, EfeitoAplicadoRegistro.id)
    ))
    if not registros:
        return []
    ids = [registro.id for registro in registros]
    operacoes: dict[str, list[Modificador]] = {i: [] for i in ids}
    for op in session.scalars(
        select(OperacaoEfeitoRegistro)
        .where(OperacaoEfeitoRegistro.efeito_id.in_(ids), OperacaoEfeitoRegistro.tipo == "modificador")
        .order_by(OperacaoEfeitoRegistro.id)
    ):
        if op.valor is not None:
            operacoes[op.efeito_id].append(Modificador(op.alvo, float(op.valor), op.contexto))
    fontes: dict[str, list[FonteEfeitoRegistro]] = {i: [] for i in ids}
    for fonte in session.scalars(
        select(FonteEfeitoRegistro)
        .where(
            FonteEfeitoRegistro.mesa_id == mesa_id,
            FonteEfeitoRegistro.personagem_id == personagem_id,
            FonteEfeitoRegistro.efeito_id.in_(ids),
        )
        .order_by(FonteEfeitoRegistro.id)
    ):
        fontes[fonte.efeito_id].append(fonte)
    return [
        EfeitoAtual(
            id=r.id, nome=r.nome, descricao=r.descricao, estado=r.estado,
            duracao_rodadas=r.duracao_rodadas, modificadores=operacoes[r.id],
            fontes=fontes[r.id], conteudo=r.conteudo or {},
        )
        for r in registros
    ]


# ---------------------------------------------------------- valores derivados

@dataclass(frozen=True)
class Fonte:
    tipo: str  # base | ajuste | atributo | pericia | equipamento | efeito
    descricao: str
    valor: float
    efeito_id: str | None = None
    item_id: str | None = None


@dataclass(frozen=True)
class Situacional:
    descricao: str
    valor: float
    contexto: str
    efeito_id: str


@dataclass
class ValorDerivado:
    chave: str
    rotulo: str
    grupo: str  # atributo | pericia | status
    fontes: list[Fonte]
    situacionais: list[Situacional]
    minimo_zero: bool = False

    @property
    def total(self) -> float:
        base = sum(f.valor for f in self.fontes if f.tipo != "efeito")
        if self.minimo_zero:
            base = max(0, base)
        return base + sum(f.valor for f in self.fontes if f.tipo == "efeito")


def _numero(valor: float) -> float | int:
    return int(valor) if float(valor).is_integer() else round(valor, 2)


def calcular_valores_derivados(
    ficha: Mapping[str, Any],
    inventario: Iterable[ItemInventarioRegistro],
    efeitos_atuais: Iterable[EfeitoAtual],
) -> list[ValorDerivado]:
    inventario = list(inventario)
    equipados = {item.id for item in inventario if item.equipado}
    aplicaveis: dict[str, list[tuple[EfeitoAtual, Modificador]]] = {}
    for efeito in efeitos_atuais:
        origem = efeito.equipamento_id
        if efeito.estado != "ativo" or (origem is not None and origem not in equipados):
            continue
        for modificador in efeito.modificadores:
            aplicaveis.setdefault(_normalizar_alvo(modificador.alvo), []).append((efeito, modificador))
    nomes_itens = {item.id: item.nome for item in inventario}

    def com_efeitos(valor: ValorDerivado) -> ValorDerivado:
        for efeito, modificador in aplicaveis.get(valor.chave, []):
            origem = efeito.equipamento_id
            descricao = f"{nomes_itens[origem]} — {efeito.nome}" if origem in nomes_itens else efeito.nome
            if modificador.contexto:
                valor.situacionais.append(
                    Situacional(descricao, modificador.valor, modificador.contexto, efeito.id)
                )
            else:
                valor.fontes.append(Fonte("efeito", descricao, modificador.valor, efeito.id, origem))
        return valor

    resultado: list[ValorDerivado] = []
    totais: dict[str, float] = {}
    for grupo, secao in (("atributo", "atributos"), ("pericia", "pericias")):
        dados = ficha.get(secao) or {}
        valores = dados.get("valores") or {}
        ajustes = dados.get("ajustes") or {}
        for nome in sorted(set(valores) | set(ajustes), key=str.casefold):
            fontes = [Fonte("base", "Valor base", _inteiro(valores.get(nome)))]
            if _inteiro(ajustes.get(nome)):
                fontes.append(Fonte("ajuste", "Ajuste manual", _inteiro(ajustes.get(nome))))
            valor = com_efeitos(ValorDerivado(chave(grupo, nome), nome, grupo, fontes, []))
            totais[valor.chave] = valor.total
            resultado.append(valor)

    def total(categoria: str, nome: str) -> float:
        return totais.get(chave(categoria, nome), 0)

    esquiva = ValorDerivado("defesa:esquiva", "Defesa (Esquiva)", "status", [
        Fonte("atributo", "Destreza", total("atributo", "Destreza")),
        Fonte("pericia", "Esquiva", total("pericia", "Esquiva")),
    ], [], minimo_zero=True)
    armaduras = [i for i in inventario if i.tipo == "armadura" and i.equipado]
    armadura = ValorDerivado("defesa:armadura", "Defesa (Armadura)", "status", [
        Fonte("atributo", "Vigor", total("atributo", "Vigor")),
        *(
            Fonte("equipamento", item.nome, max(0, _inteiro(item.dados.get("armadura"))) * max(1, item.quantidade),
                  item_id=item.id)
            for item in armaduras
        ),
    ], [], minimo_zero=True)
    rdb = ValorDerivado("rdb:armadura", "RDB (Armadura)", "status", [
        Fonte("equipamento", item.nome, max(0, _inteiro(item.dados.get("rdb"))) * max(1, item.quantidade),
              item_id=item.id)
        for item in armaduras
    ], [])
    peso = ValorDerivado("carga:peso", "Peso", "status", [
        Fonte("equipamento", item.nome, max(0.0, _decimal(item.dados.get("peso"))) * max(1, item.quantidade),
              item_id=item.id)
        for item in inventario if _decimal(item.dados.get("peso"))
    ], [])
    resultado.extend(com_efeitos(v) for v in (esquiva, armadura, rdb, peso))
    return resultado


# ------------------------------------------------------------------ comandos

class ConflitoVersao(Exception):
    """A versão do personagem mudou desde a leitura do cliente."""


def _avancar_versao(session: Session, personagem: PersonagemRegistro, versao_esperada: int) -> int:
    resultado = session.execute(
        update(PersonagemRegistro)
        .where(
            PersonagemRegistro.id == personagem.id,
            PersonagemRegistro.mesa_id == personagem.mesa_id,
            PersonagemRegistro.versao == versao_esperada,
            PersonagemRegistro.excluido_em.is_(None),
        )
        .values(versao=PersonagemRegistro.versao + 1)
        .execution_options(synchronize_session=False)
    )
    if resultado.rowcount != 1:
        raise ConflitoVersao()
    return versao_esperada + 1


def definir_equipado(
    session: Session, personagem: PersonagemRegistro, item: ItemInventarioRegistro,
    equipado: bool, versao_esperada: int,
) -> int:
    """Equipa ou desequipa o item e alterna os efeitos que dependem dele. Não confirma a transação."""
    nova_versao = _avancar_versao(session, personagem, versao_esperada)
    item.equipado = equipado
    vinculados = session.scalars(
        select(FonteEfeitoRegistro.efeito_id).where(
            FonteEfeitoRegistro.mesa_id == personagem.mesa_id,
            FonteEfeitoRegistro.personagem_id == personagem.id,
            FonteEfeitoRegistro.equipamento_id == item.id,
        )
    ).all()
    for efeito in session.scalars(
        select(EfeitoAplicadoRegistro).where(
            EfeitoAplicadoRegistro.id.in_(vinculados), EfeitoAplicadoRegistro.estado != "encerrado"
        )
    ):
        if (efeito.conteudo or {}).get("ativacao", {}).get("tipo", "enquanto_equipado") == "enquanto_equipado":
            efeito.estado = "ativo" if equipado else "suspenso"
    return nova_versao


# ----------------------------------------------------------------- importação

@dataclass
class EfeitoImportado:
    nome: str
    descricao: str
    versao: int
    associacao: str | None
    operacoes: list[dict[str, Any]]
    conteudo: dict[str, Any]
    ativacao: str | None = None


@dataclass
class PreviaImportacao:
    tipo: str  # efeito | equipamento
    efeitos: list[EfeitoImportado]
    item: dict[str, Any] | None = None
    item_tipo: str | None = None
    avisos: list[str] = field(default_factory=list)


_ITEM_CAMPOS_TABELA = {"nome", "quantidade", "equipado", "cargas_atuais", "cargas_maximas"}


def _sem_imagem(dados: Mapping[str, Any], avisos: list[str], nome: str) -> dict[str, Any]:
    limpo = {k: deepcopy(v) for k, v in dados.items() if k != "imagem_base64"}
    if limpo.keys() != dados.keys():
        avisos.append(f"A imagem de {nome} não foi importada; imagens passam pelo armazenamento de arquivos.")
    return limpo


def _efeito_importado(efeito: Mapping[str, Any], avisos: list[str], ativacao: str | None = None) -> EfeitoImportado:
    conteudo = _sem_imagem(efeito, avisos, f"“{efeito['nome']}”")
    operacoes = [deepcopy(dict(op)) for op in efeito.get("operacoes") or []]
    operacoes += [
        {"tipo": "modificador", "alvo": m["alvo"], "valor": m["valor"], "contexto": m.get("quando")}
        for m in efeito.get("modificadores") or []
    ]
    if ativacao:
        conteudo["ativacao"] = {"tipo": ativacao}
    return EfeitoImportado(
        nome=efeito["nome"], descricao=efeito["descricao"], versao=2 if efeito.get("operacoes") else 1,
        associacao=efeito.get("associacao") or None, operacoes=operacoes, conteudo=conteudo,
        ativacao=ativacao,
    )


def preparar_importacao(codigo: str, catalogo: list[Mapping[str, Any]] | None = None) -> PreviaImportacao:
    """Decodifica e valida um código portátil sem gravar nada. Levanta ValueError se inválido."""
    texto = (codigo or "").strip()
    prefixo = texto.split(":", 1)[0]
    avisos: list[str] = []
    if prefixo in {"E1", "E2"}:
        return PreviaImportacao("efeito", [_efeito_importado(decode_effect(texto), avisos)], avisos=avisos)
    if prefixo not in {"EQ1", "EQ2"}:
        raise ValueError("Código não reconhecido. Use um código de efeito (E1/E2) ou de equipamento (EQ1/EQ2).")
    equipamento = decode_equipment(texto)
    indice = indexar_catalogo(catalogo if catalogo is not None else carregar_catalogo())
    item = _sem_imagem(equipamento["item"], avisos, "o item")
    if not str(item.get("nome") or "").strip():
        raise ValueError("O equipamento precisa ter nome.")
    atuais = _inteiro_opcional(item.get("cargas_atuais"))
    maximas = _inteiro_opcional(item.get("cargas_maximas"))
    if atuais is not None and maximas is not None and atuais > maximas:
        raise ValueError("As cargas atuais do equipamento não podem exceder as máximas.")
    importados = []
    for bruto in equipamento["efeitos"]:
        ativacao = (bruto.get("ativacao") or {}).get("tipo", "enquanto_equipado")
        if bruto["kind"] == "default":
            referencia = indice.get(bruto["associacao"])
            if referencia is None:
                raise ValueError(f"Efeito do catálogo não encontrado: {bruto['associacao']}.")
            importados.append(_efeito_importado(referencia, avisos, ativacao))
        else:
            importados.append(_efeito_importado(bruto.get("efeito", bruto), avisos, ativacao))
    return PreviaImportacao("equipamento", importados, item=item, item_tipo=equipamento["tipo"], avisos=avisos)


def aplicar_importacao(
    session: Session, personagem: PersonagemRegistro, previa: PreviaImportacao, versao_esperada: int,
) -> tuple[int, ItemInventarioRegistro | None, list[EfeitoAplicadoRegistro]]:
    """Grava a importação inteira ou nada. Não confirma a transação."""
    nova_versao = _avancar_versao(session, personagem, versao_esperada)
    mesa_id, personagem_id = personagem.mesa_id, personagem.id
    item_registro = None
    if previa.tipo == "equipamento":
        assert previa.item is not None and previa.item_tipo is not None
        dados = previa.item
        item_registro = ItemInventarioRegistro(
            id=uuid4().hex, mesa_id=mesa_id, personagem_id=personagem_id, tipo=previa.item_tipo,
            nome=str(dados["nome"]).strip()[:200], quantidade=max(1, _inteiro(dados.get("quantidade") or 1)),
            equipado=False,
            cargas_atuais=_inteiro_opcional(dados.get("cargas_atuais")),
            cargas_maximas=_inteiro_opcional(dados.get("cargas_maximas")),
            dados={k: v for k, v in dados.items() if k not in _ITEM_CAMPOS_TABELA},
        )
        session.add(item_registro)
        session.flush()
    criados = []
    for efeito in previa.efeitos:
        registro = EfeitoAplicadoRegistro(
            id=uuid4().hex, mesa_id=mesa_id, personagem_id=personagem_id, associacao=efeito.associacao,
            nome=efeito.nome[:200], descricao=efeito.descricao, versao=efeito.versao,
            estado="suspenso" if item_registro is not None else "ativo", conteudo=efeito.conteudo,
        )
        session.add(registro)
        session.flush()
        for operacao in efeito.operacoes:
            session.add(OperacaoEfeitoRegistro(
                id=uuid4().hex, efeito_id=registro.id, tipo=operacao["tipo"], alvo=operacao.get("alvo") or "",
                valor=operacao.get("valor"), contexto=operacao.get("contexto"), modo=operacao.get("modo"),
                recurso=operacao.get("recurso"), evento=operacao.get("evento"),
            ))
        session.add(FonteEfeitoRegistro(
            id=uuid4().hex, mesa_id=mesa_id, personagem_id=personagem_id, efeito_id=registro.id,
            tipo="equipamento" if item_registro is not None else "importacao",
            equipamento_id=item_registro.id if item_registro is not None else None,
            descricao=item_registro.nome if item_registro is not None else "Código portátil",
        ))
        criados.append(registro)
    session.flush()
    return nova_versao, item_registro, criados
