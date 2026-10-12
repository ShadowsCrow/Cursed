"""Inventário em grade no servidor (mudança `carga-por-espacos`, decisões D2–D4).

Lê a grade do personagem (Força atual e Tamanho) e grava arrumações inteiras, tudo ou nada,
validando posição, sobreposição, peças únicas, mãos e Requisito de Força com o motor de
`cursed_platform.domain.grade`. Não confirma a transação.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Sequence
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import catalogos, ficha_viva
from cursed_platform.domain import grade as motor
from cursed_platform.persistence import FonteEfeitoRegistro, ItemInventarioRegistro, MesaRegistro, PersonagemRegistro

TAMANHO_POR_ROTULO = {
    "minusculo": "minusculo", "pequeno": "pequeno", "medio": "medio",
    "grande": "grande", "enorme": "enorme", "colossal": "colossal",
}


class TamanhoIndefinido(ValueError):
    """Sem Tamanho informado nem raça do catálogo, a grade não pode ser calculada."""


@dataclass(frozen=True)
class Problema:
    item_id: str | None
    motivo: str
    mensagem: str


class ArrumacaoInvalida(ValueError):
    def __init__(self, problemas: Sequence[Problema]):
        super().__init__("; ".join(p.mensagem for p in problemas))
        self.problemas = list(problemas)


@dataclass(frozen=True)
class ContextoGrade:
    forca: int
    tamanho: str
    tamanho_origem: str  # ficha | raca
    grade: motor.Grade
    itens: tuple[motor.ItemGrade, ...]


def _slug(texto: Any) -> str:
    return ficha_viva._slug(str(texto or ""))


def _racas() -> dict[str, str]:
    return {_slug(r.nome): _slug(r.tamanho) for r in catalogos.obter().racas}


def tamanho_do_personagem(ficha: Mapping[str, Any]) -> tuple[str, str]:
    """Tamanho informado na ficha ou, na falta dele, o da raça no catálogo. Nunca estimado."""
    personagem = ficha.get("personagem") or {}
    informado = TAMANHO_POR_ROTULO.get(_slug(personagem.get("tamanho")))
    if informado:
        return informado, "ficha"
    da_raca = TAMANHO_POR_ROTULO.get(_racas().get(_slug(personagem.get("raca")), ""))
    if da_raca:
        return da_raca, "raca"
    raise TamanhoIndefinido("Tamanho do personagem indefinido: escolha uma raça do catálogo ou informe o Tamanho na ficha.")


def forca_atual(session: Session, personagem: PersonagemRegistro, itens: Sequence[ItemInventarioRegistro]) -> int:
    efeitos = ficha_viva.efeitos(session, personagem.mesa_id, personagem.id)
    for valor in ficha_viva.calcular_valores_derivados(personagem.ficha or {}, itens, efeitos):
        if valor.chave == ficha_viva.chave("atributo", "Força"):
            return int(valor.total)
    return 0


def _dados(item: ItemInventarioRegistro) -> Mapping[str, Any]:
    return item.dados or {}


def para_motor(item: ItemInventarioRegistro, **troca: Any) -> motor.ItemGrade:
    dados = _dados(item)
    ampliacao = dados.get("ampliacao") if item.subtipo == "mochila" else None
    valores = {
        "id": item.id, "nome": item.nome, "subtipo": item.subtipo or "outro",
        "largura": item.largura or 0, "altura": item.altura or 0,
        "coluna": item.coluna, "linha": item.linha, "girado": item.girado, "equipado": item.equipado,
        "maos": item.maos,
        "requisito_forca": dados.get("requisito_forca"),
        "ampliacao": (int(ampliacao.get("linhas", 0)), int(ampliacao.get("colunas", 0))) if isinstance(ampliacao, Mapping) else None,
    }
    valores.update(troca)
    return motor.ItemGrade(**valores)


def itens_do_personagem(session: Session, personagem: PersonagemRegistro) -> list[ItemInventarioRegistro]:
    return list(session.scalars(
        select(ItemInventarioRegistro)
        .where(ItemInventarioRegistro.mesa_id == personagem.mesa_id, ItemInventarioRegistro.personagem_id == personagem.id)
        .order_by(ItemInventarioRegistro.id)
    ))


def _na_grade(item: ItemInventarioRegistro) -> bool:
    return item.subtipo is not None and item.largura is not None


def contexto(session: Session, personagem: PersonagemRegistro, registros: Sequence[ItemInventarioRegistro] | None = None) -> ContextoGrade:
    registros = list(registros) if registros is not None else itens_do_personagem(session, personagem)
    tamanho, origem = tamanho_do_personagem(personagem.ficha or {})
    forca = forca_atual(session, personagem, registros)
    itens = tuple(para_motor(r) for r in registros if _na_grade(r))
    return ContextoGrade(forca, tamanho, origem, motor.calcular_grade(forca, tamanho, itens), itens)


@dataclass(frozen=True)
class PedidoPosicao:
    item_id: str
    coluna: int | None
    linha: int | None
    girado: bool
    equipado: bool
    maos: int | None = None


@dataclass(frozen=True)
class ResultadoArrumacao:
    versao: int
    contexto: ContextoGrade
    equipados: tuple[str, ...]
    desequipados: tuple[str, ...]
    sobrecarga_antes: bool
    sobrecarga_depois: bool
    colocados: tuple[str, ...] = ()
    retirados: tuple[str, ...] = ()
    empunhaduras: tuple[tuple[str, int], ...] = ()


def alternar_efeitos_do_item(session: Session, personagem: PersonagemRegistro, item: ItemInventarioRegistro, equipado: bool) -> None:
    ficha_viva.alternar_efeitos_vinculados(session, personagem, item, equipado)


def aplicar_arrumacao(
    session: Session, personagem: PersonagemRegistro, pedidos: Iterable[PedidoPosicao], versao_esperada: int,
) -> ResultadoArrumacao:
    registros = itens_do_personagem(session, personagem)
    por_id = {r.id: r for r in registros}
    antes = contexto(session, personagem, registros)
    problemas: list[Problema] = []
    novos: dict[str, motor.ItemGrade] = {i.id: i for i in antes.itens}
    alterados: set[str] = set()

    for pedido in pedidos:
        registro = por_id.get(pedido.item_id)
        if registro is None:
            problemas.append(Problema(pedido.item_id, "item_desconhecido", "Item não pertence a este personagem."))
            continue
        if not _na_grade(registro):
            problemas.append(Problema(registro.id, "sem_dimensao", f"{registro.nome} ainda não tem dimensão definida."))
            continue
        if (pedido.coluna is None) != (pedido.linha is None):
            problemas.append(Problema(registro.id, "posicao_incompleta", f"Posição incompleta para {registro.nome}."))
            continue
        atual = novos[registro.id]
        maos = atual.maos
        if pedido.maos is not None and pedido.maos != (registro.maos or 1):
            if registro.subtipo != "uma_mao" or not _dados(registro).get("versatil"):
                problemas.append(Problema(registro.id, "nao_versatil", f"{registro.nome} não pode trocar de empunhadura."))
                continue
            maos = pedido.maos
        novo = para_motor(registro, coluna=pedido.coluna, linha=pedido.linha, girado=pedido.girado, equipado=pedido.equipado,
                          maos=maos)
        if (novo.coluna, novo.linha, novo.girado, novo.equipado, novo.maos) != (
                atual.coluna, atual.linha, atual.girado, atual.equipado, atual.maos):
            alterados.add(registro.id)
        novos[registro.id] = novo

    lista = list(novos.values())
    grade = motor.calcular_grade(antes.forca, antes.tamanho, lista)
    for item in lista:
        atual = next((i for i in antes.itens if i.id == item.id), None)
        mudou_lugar = atual is None or (item.coluna, item.linha, item.girado) != (atual.coluna, atual.linha, atual.girado)
        if item.na_grade and mudou_lugar:
            resultado = motor.validar_posicao(grade, [], item, item.coluna, item.linha, item.girado)
            if not resultado.ok:
                problemas.append(Problema(item.id, resultado.motivo or "fora_da_grade", f"{item.nome} fica fora da grade."))
    avaliacao = motor.avaliar(grade, lista)
    for a, b in avaliacao.sobreposicoes:
        problemas.append(Problema(b, "sobreposicao", f"{novos[a].nome} e {novos[b].nome} ocupam o mesmo lugar."))

    anteriores = {i.id: i.equipado for i in antes.itens}
    for item in lista:
        if item.equipado and not anteriores.get(item.id, False):
            resultado = motor.validar_equipar([i for i in lista if i.id != item.id], item, antes.forca)
            if not resultado.ok:
                problemas.append(Problema(item.id, resultado.motivo or "nao_equipavel", resultado.mensagem or "Não é possível equipar."))
    for item in lista:
        # Só o que está na grade é levado; a mochila equipada não ocupa célula.
        if item.equipado and item.subtipo != "mochila" and not item.na_grade:
            problemas.append(Problema(item.id, "fora_da_grade", f"{item.nome} precisa estar na grade para continuar equipado."))
    if motor.maos_ocupadas(lista) > 2:
        problemas.append(Problema(None, "maos_insuficientes", "Mais de duas mãos ocupadas."))
    for subtipo in motor.PECAS_UNICAS:
        if sum(1 for i in lista if i.equipado and i.subtipo == subtipo) > 1:
            problemas.append(Problema(None, "peca_repetida", f"Mais de um item de {motor.ROTULO_SUBTIPO[subtipo]} equipado."))

    if problemas:
        raise ArrumacaoInvalida(problemas)

    nova_versao = ficha_viva._avancar_versao(session, personagem, versao_esperada) if alterados else personagem.versao
    equipados: list[str] = []
    desequipados: list[str] = []
    colocados: list[str] = []
    retirados: list[str] = []
    empunhaduras: list[tuple[str, int]] = []

    def na_bandeja(item: motor.ItemGrade) -> bool:
        return not item.na_grade and not (item.subtipo == "mochila" and item.equipado)

    for item_id in sorted(alterados):
        registro = por_id[item_id]
        novo = novos[item_id]
        atual = next(i for i in antes.itens if i.id == item_id)
        if na_bandeja(atual) and not na_bandeja(novo):
            colocados.append(item_id)
        elif not na_bandeja(atual) and na_bandeja(novo):
            retirados.append(item_id)
        registro.coluna, registro.linha, registro.girado = novo.coluna, novo.linha, novo.girado
        if registro.subtipo == "uma_mao" and novo.maos != registro.maos and novo.maos is not None:
            registro.maos = novo.maos
            empunhaduras.append((item_id, novo.maos))
        if registro.equipado != novo.equipado:
            registro.equipado = novo.equipado
            alternar_efeitos_do_item(session, personagem, registro, novo.equipado)
            (equipados if novo.equipado else desequipados).append(item_id)
    session.flush()
    depois = contexto(session, personagem)
    return ResultadoArrumacao(
        versao=nova_versao, contexto=depois, equipados=tuple(equipados), desequipados=tuple(desequipados),
        sobrecarga_antes=motor.avaliar(antes.grade, antes.itens).sobrecarga,
        sobrecarga_depois=motor.avaliar(depois.grade, depois.itens).sobrecarga,
        colocados=tuple(colocados), retirados=tuple(retirados), empunhaduras=tuple(empunhaduras),
    )


# ---------------------------------------------------------------- moedas

class MoedasInvalidas(ValueError):
    pass


def _pilha(item: ItemInventarioRegistro) -> dict[str, int]:
    dados = item.dados or {}
    return {tipo: max(0, int(dados.get(tipo) or 0)) for tipo in motor.TIPOS_MOEDA}


def pilhas_de_moedas(registros: Sequence[ItemInventarioRegistro]) -> list[ItemInventarioRegistro]:
    """Pilhas na ordem da grade (linha, coluna); as de fora da grade por último."""
    moedas = [r for r in registros if r.subtipo == "moedas"]
    return sorted(moedas, key=lambda r: (r.linha is None, r.linha or 0, r.coluna or 0, r.id))


def bolsa(registros: Sequence[ItemInventarioRegistro]) -> dict[str, int]:
    total = {tipo: 0 for tipo in motor.TIPOS_MOEDA}
    for pilha in pilhas_de_moedas(registros):
        for tipo, valor in _pilha(pilha).items():
            total[tipo] += valor
    return total


def _rotulo_pilha(pilha: Mapping[str, int]) -> str:
    partes = [f"{pilha[t]} {t}" for t in motor.TIPOS_MOEDA if pilha.get(t)]
    return "Moedas (" + ", ".join(partes) + ")" if partes else "Moedas"


def _nova_pilha(session: Session, personagem: PersonagemRegistro, pilha: Mapping[str, int]) -> bool:
    """Cria uma pilha e procura lugar para ela (inclusive na área vermelha). Devolve se ela entrou na grade."""
    registro = ItemInventarioRegistro(
        id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id, tipo="outro", subtipo="moedas",
        nome=_rotulo_pilha(pilha), quantidade=1, equipado=False, dados=dict(pilha), largura=1, altura=1,
    )
    session.add(registro)
    session.flush()
    try:
        ctx = contexto(session, personagem)
        lugar = motor.encontrar_espaco(ctx.grade, ctx.itens, para_motor(registro))
    except TamanhoIndefinido:
        lugar = None
    if lugar is not None:
        registro.coluna, registro.linha, registro.girado = lugar
    session.flush()
    return lugar is not None


def ajustar_no_personagem(
    session: Session, personagem: PersonagemRegistro, por_pilha: int, *,
    adicionar: Mapping[str, int] | None = None, retirar: Mapping[str, int] | None = None,
) -> tuple[dict[str, int], dict[str, int], int]:
    """Adiciona moedas às pilhas com espaço (na ordem da grade) e cria pilhas novas para o resto, ou retira
    moedas das pilhas da última para a primeira (fora da grade e área vermelha primeiro). Nenhuma pilha muda
    de lugar; as que zeram são apagadas. Devolve (bolsa antes, bolsa depois, pilhas novas fora da grade)."""
    registros = itens_do_personagem(session, personagem)
    antes = bolsa(registros)
    existentes = pilhas_de_moedas(registros)
    atuais = [_pilha(r) for r in existentes]
    try:
        if adicionar is not None:
            atualizadas, novas = motor.adicionar_moedas(atuais, adicionar, por_pilha)
        else:
            atualizadas, novas = motor.retirar_moedas(atuais, retirar or {}), []
    except ValueError as erro:
        raise MoedasInvalidas(str(erro)) from None
    for registro, pilha in zip(existentes, atualizadas):
        if sum(pilha.values()) == 0:
            session.delete(registro)
        elif pilha != _pilha(registro):
            registro.dados, registro.nome = dict(pilha), _rotulo_pilha(pilha)
    session.flush()
    fora = sum(0 if _nova_pilha(session, personagem, pilha) else 1 for pilha in novas)
    return antes, bolsa(itens_do_personagem(session, personagem)), fora


def distribuir_no_personagem(
    session: Session, personagem: PersonagemRegistro, por_pilha: int, pilhas: Sequence[Mapping[str, int]] | None = None,
) -> tuple[dict[str, int], dict[str, int], int]:
    """Refaz as pilhas de moedas do personagem. Pilhas existentes mantêm o lugar na ordem da grade;
    novas procuram espaço (inclusive na área vermelha) e, sem espaço, ficam fora da grade.
    Nenhuma moeda é perdida. Devolve (bolsa antes, bolsa depois, pilhas fora da grade). Não avança versão."""
    registros = itens_do_personagem(session, personagem)
    antes = bolsa(registros)
    if pilhas is None:
        alvo = motor.distribuir_moedas(antes, por_pilha)
    else:
        alvo = [{t: int(p.get(t, 0)) for t in motor.TIPOS_MOEDA} for p in pilhas if any(p.get(t) for t in motor.TIPOS_MOEDA)]
        for indice, pilha in enumerate(alvo):
            if sum(pilha.values()) > por_pilha:
                raise MoedasInvalidas(f"A pilha {indice + 1} passa do limite de {por_pilha} moedas por pilha da mesa.")
    existentes = pilhas_de_moedas(registros)
    for sobra in existentes[len(alvo):]:
        session.delete(sobra)
    session.flush()
    fora = 0
    for indice, pilha in enumerate(alvo):
        if indice < len(existentes):
            registro = existentes[indice]
            registro.dados = dict(pilha)
            registro.nome = _rotulo_pilha(pilha)
            if registro.coluna is None:
                fora += 1
            continue
        if not _nova_pilha(session, personagem, pilha):
            fora += 1
    return antes, bolsa(itens_do_personagem(session, personagem)), fora


def redistribuir_mesa(session: Session, mesa: MesaRegistro) -> int:
    """Aplica um novo limite de moedas por pilha a todos os personagens da mesa. Devolve quantos mudaram."""
    alterados = 0
    personagens = session.scalars(select(PersonagemRegistro).where(
        PersonagemRegistro.mesa_id == mesa.id, PersonagemRegistro.excluido_em.is_(None)))
    for personagem in personagens:
        registros = itens_do_personagem(session, personagem)
        atuais = [_pilha(p) for p in pilhas_de_moedas(registros)]
        if not atuais:
            continue
        if atuais != motor.distribuir_moedas(bolsa(registros), mesa.moedas_por_pilha) or any(
                sum(p.values()) > mesa.moedas_por_pilha for p in atuais):
            distribuir_no_personagem(session, personagem, mesa.moedas_por_pilha)
            alterados += 1
    return alterados


# ---------------------------------------------------------------- sobrecarga

ID_SOBRECARGA = "derivado:sobrecarga"
ESQUIVA_SOBRECARGA = -4
CONSEQUENCIAS_SOBRECARGA = (
    "Deslocamento pela metade",
    "-4 em Esquiva",
    "Não pode Correr",
    "Não pode saltar, escalar nem nadar normalmente",
    "-2 m na Altura Segura",
    "Em água profunda, equivale a Afundando",
)
LEMBRETE_EXAUSTAO = (
    "+1 de Exaustão a cada 10 rodadas consecutivas agindo ou se movendo, ou a cada 30 minutos viajando "
    "(contagem feita pelo Narrador)."
)


def efeito_sobrecarga(session: Session, personagem: PersonagemRegistro) -> ficha_viva.EfeitoAtual | None:
    """Efeito automático enquanto houver item na área vermelha. Não é gravado: nasce e some com a grade."""
    try:
        ctx = contexto(session, personagem)
    except TamanhoIndefinido:
        return None
    avaliacao = motor.avaliar(ctx.grade, ctx.itens)
    if not avaliacao.sobrecarga:
        return None
    nomes = {i.id: i.nome for i in ctx.itens}
    na_area = ", ".join(nomes[i] for i in avaliacao.itens_em_sobrecarga)
    fonte = FonteEfeitoRegistro(
        mesa_id=personagem.mesa_id, personagem_id=personagem.id, efeito_id=ID_SOBRECARGA, tipo="carga",
        descricao=f"Na área vermelha: {na_area}",
    )
    return ficha_viva.EfeitoAtual(
        id=ID_SOBRECARGA, nome="Sobrecarga",
        descricao="; ".join(CONSEQUENCIAS_SOBRECARGA) + ". " + LEMBRETE_EXAUSTAO,
        estado="ativo", duracao_rodadas=None,
        modificadores=[ficha_viva.Modificador("defesa:esquiva", ESQUIVA_SOBRECARGA)],
        fontes=[fonte],
        conteudo={"derivado": True, "origem": "carga", "icone": "cc_above",
                  "consequencias": list(CONSEQUENCIAS_SOBRECARGA), "lembrete": LEMBRETE_EXAUSTAO,
                  "itens": list(avaliacao.itens_em_sobrecarga)},
    )


def efeitos_com_derivados(session: Session, personagem: PersonagemRegistro) -> list[ficha_viva.EfeitoAtual]:
    efeitos = ficha_viva.efeitos(session, personagem.mesa_id, personagem.id)
    sobrecarga = efeito_sobrecarga(session, personagem)
    return [*efeitos, sobrecarga] if sobrecarga else efeitos
