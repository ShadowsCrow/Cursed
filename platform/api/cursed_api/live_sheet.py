"""Consultas e comandos da ficha viva: inventário, efeitos, valores derivados e importação."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, ficha_viva
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    EfeitoPrevia, EfeitoResumo, EquiparItemRequest, EquiparItemResposta, FonteEfeitoResumo,
    FonteValorResumo, ImportacaoResultado, ImportarCodigoRequest, ItemInventarioResumo, ItemPrevia,
    ModificadorResumo, PermissoesFicha, PreviaImportacaoRequest, PreviaImportacaoResumo,
    SituacionalResumo, ValorDerivadoResumo,
)
from cursed_platform.persistence import ItemInventarioRegistro, MembroRegistro, MesaRegistro, PersonagemRegistro
from cursed_platform.policies import avaliar_campos
from cursed_platform.repositories import FichaRepository

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session


router = APIRouter(prefix="/mesas/{mesa_id}/personagens/{personagem_id}", tags=["Ficha viva"])


def permissoes(session: Session, mesa_id: str, personagem_id: str, ator: Ator) -> PermissoesFicha:
    autorizador = Autorizador(session)
    pode = lambda acao: autorizador.decidir(  # noqa: E731
        acao, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=personagem_id,
    ).permitido
    membro = session.get(MembroRegistro, (mesa_id, ator.usuario_id))
    mesa = session.get(MesaRegistro, mesa_id)
    assert membro is not None and mesa is not None
    jogador = membro.papel == "jogador"
    return PermissoesFicha(
        papel=membro.papel,
        editar=pode(Acao.EDITAR_FICHA),
        excluir=pode(Acao.EXCLUIR_PERSONAGEM),
        transferir=pode(Acao.TRANSFERIR_PERSONAGEM),
        campos_bloqueados=list(mesa.campos_bloqueados) if jogador else [],
        campos_exigem_aprovacao=list(mesa.campos_exigem_aprovacao) if jogador else [],
    )


def _personagem(
    session: Session, mesa_id: str, personagem_id: str, ator: Ator, acao: Acao = Acao.LER_FICHA,
) -> PersonagemRegistro:
    decisao = Autorizador(session).decidir(
        acao, usuario_id=ator.usuario_id, mesa_id=mesa_id, personagem_id=personagem_id,
    )
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Ficha não encontrada." if decisao.ocultar_existencia else decisao.motivo,
        )
    personagem = FichaRepository(session).get(mesa_id, personagem_id)
    assert personagem is not None
    return personagem


def _exigir_edicao(session: Session, mesa_id: str, personagem_id: str, ator: Ator, campo: str) -> PersonagemRegistro:
    """Comandos mecânicos seguem as mesmas políticas de campo aplicadas à ficha."""
    personagem = _personagem(session, mesa_id, personagem_id, ator, Acao.EDITAR_FICHA)
    politica = permissoes(session, mesa_id, personagem_id, ator)
    resultado = avaliar_campos(
        {campo}, bloqueados=politica.campos_bloqueados, exigem_aprovacao=politica.campos_exigem_aprovacao,
    )
    if resultado.bloqueados:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Alteração bloqueada pelo Narrador.")
    if resultado.exigem_aprovacao:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta alteração exige aprovação do Narrador; peça que ele a realize.",
        )
    return personagem


def _item_resumo(item: ItemInventarioRegistro, efeitos: list[ficha_viva.EfeitoAtual]) -> ItemInventarioResumo:
    return ItemInventarioResumo(
        id=item.id, tipo=item.tipo, nome=item.nome, quantidade=item.quantidade, equipado=item.equipado,
        cargas_atuais=item.cargas_atuais, cargas_maximas=item.cargas_maximas, dados=item.dados or {},
        efeitos=[e.id for e in efeitos if e.equipamento_id == item.id],
    )


def _efeito_resumo(efeito: ficha_viva.EfeitoAtual) -> EfeitoResumo:
    return EfeitoResumo(
        id=efeito.id, nome=efeito.nome, descricao=efeito.descricao, estado=efeito.estado,
        duracao_rodadas=efeito.duracao_rodadas,
        ativacao=(efeito.conteudo.get("ativacao") or {}).get("tipo"),
        modificadores=[ModificadorResumo(alvo=m.alvo, valor=m.valor, contexto=m.contexto) for m in efeito.modificadores],
        fontes=[
            FonteEfeitoResumo(tipo=f.tipo, descricao=f.descricao, equipamento_id=f.equipamento_id)
            for f in efeito.fontes
        ],
    )


@router.get("/permissoes", response_model=PermissoesFicha)
def ler_permissoes(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PermissoesFicha:
    _personagem(session, mesa_id, personagem_id, ator)
    return permissoes(session, mesa_id, personagem_id, ator)


@router.get("/inventario", response_model=list[ItemInventarioResumo])
def listar_inventario(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[ItemInventarioResumo]:
    _personagem(session, mesa_id, personagem_id, ator)
    efeitos = ficha_viva.efeitos(session, mesa_id, personagem_id)
    return [_item_resumo(item, efeitos) for item in ficha_viva.itens(session, mesa_id, personagem_id)]


@router.get("/efeitos", response_model=list[EfeitoResumo])
def listar_efeitos(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[EfeitoResumo]:
    _personagem(session, mesa_id, personagem_id, ator)
    return [_efeito_resumo(e) for e in ficha_viva.efeitos(session, mesa_id, personagem_id)]


@router.get("/valores-derivados", response_model=list[ValorDerivadoResumo])
def listar_valores_derivados(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[ValorDerivadoResumo]:
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    valores = ficha_viva.calcular_valores_derivados(
        personagem.ficha or {},
        ficha_viva.itens(session, mesa_id, personagem_id),
        ficha_viva.efeitos(session, mesa_id, personagem_id),
    )
    return [
        ValorDerivadoResumo(
            chave=v.chave, rotulo=v.rotulo, grupo=v.grupo, total=v.total,
            fontes=[FonteValorResumo(**vars(f)) for f in v.fontes],
            situacionais=[SituacionalResumo(**vars(s)) for s in v.situacionais],
        )
        for v in valores
    ]


@router.post("/inventario/{item_id}/equipar", response_model=EquiparItemResposta)
def equipar_item(
    mesa_id: str, personagem_id: str, item_id: str, pedido: EquiparItemRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EquiparItemResposta:
    personagem = _exigir_edicao(session, mesa_id, personagem_id, ator, "inventario.equipado")
    item = session.get(ItemInventarioRegistro, item_id)
    if item is None or item.mesa_id != mesa_id or item.personagem_id != personagem_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")
    if item.equipado == pedido.equipado:
        # Repetir o estado atual não é uma alteração: sem nova versão nem evento.
        return EquiparItemResposta(
            versao=personagem.versao, item=_item_resumo(item, ficha_viva.efeitos(session, mesa_id, personagem_id)),
        )
    estados_antes = {e.id: e.estado for e in ficha_viva.efeitos(session, mesa_id, personagem_id)}
    try:
        versao = ficha_viva.definir_equipado(session, personagem, item, pedido.equipado, pedido.versao_esperada)
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.") from None
    session.flush()
    efeitos_depois = ficha_viva.efeitos(session, mesa_id, personagem_id)
    alterados = [
        {"campo": f"efeitos.{e.id}.estado", "antes": estados_antes.get(e.id), "depois": e.estado,
         "completo": True, "rotulo": e.nome}
        for e in efeitos_depois if estados_antes.get(e.id) != e.estado
    ]
    verbo = "equipado" if pedido.equipado else "desequipado"
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao=f"item.{verbo}",
        relevancia="mecanica", personagem=personagem, alvo_tipo="item", alvo_id=item.id,
        resumo=f"{auditoria.nome_personagem(personagem)}: {item.nome} {verbo}",
        mudancas=[{"campo": "equipado", "antes": not pedido.equipado, "depois": pedido.equipado,
                   "completo": True, "rotulo": item.nome}, *alterados],
        correlacao_id=correlacao,
    )
    session.commit()
    return EquiparItemResposta(versao=versao, item=_item_resumo(item, efeitos_depois))


def _preparar(codigo: str) -> ficha_viva.PreviaImportacao:
    try:
        return ficha_viva.preparar_importacao(codigo)
    except ValueError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None


def _campo_importacao(previa: ficha_viva.PreviaImportacao) -> str:
    return "inventario" if previa.tipo == "equipamento" else "efeitos"


@router.post("/importacoes/previa", response_model=PreviaImportacaoResumo)
def previsualizar_importacao(
    mesa_id: str, personagem_id: str, pedido: PreviaImportacaoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PreviaImportacaoResumo:
    """Valida o código e mostra o que será criado, sem gravar nada."""
    _personagem(session, mesa_id, personagem_id, ator, Acao.EDITAR_FICHA)
    previa = _preparar(pedido.codigo)
    _exigir_edicao(session, mesa_id, personagem_id, ator, _campo_importacao(previa))
    return PreviaImportacaoResumo(
        tipo=previa.tipo,
        item=ItemPrevia(tipo=previa.item_tipo, nome=str(previa.item["nome"]), dados=previa.item)
        if previa.item is not None else None,
        efeitos=[
            EfeitoPrevia(
                nome=e.nome, descricao=e.descricao, ativacao=e.ativacao,
                modificadores=[
                    ModificadorResumo(alvo=op["alvo"], valor=float(op["valor"]), contexto=op.get("contexto"))
                    for op in e.operacoes if op["tipo"] == "modificador" and op.get("valor") is not None
                ],
            )
            for e in previa.efeitos
        ],
        avisos=previa.avisos,
    )


@router.post("/importacoes", response_model=ImportacaoResultado, status_code=status.HTTP_201_CREATED)
def importar_codigo(
    mesa_id: str, personagem_id: str, pedido: ImportarCodigoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ImportacaoResultado:
    _personagem(session, mesa_id, personagem_id, ator, Acao.EDITAR_FICHA)
    previa = _preparar(pedido.codigo)
    personagem = _exigir_edicao(session, mesa_id, personagem_id, ator, _campo_importacao(previa))
    try:
        versao, item, criados = ficha_viva.aplicar_importacao(session, personagem, previa, pedido.versao_esperada)
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.") from None
    except Exception:
        session.rollback()
        raise
    nomes = ", ".join(e.nome for e in criados) or "sem efeitos"
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id,
        categoria="inventario" if item is not None else "efeito", acao="importacao.aplicada",
        relevancia="mecanica", personagem=personagem,
        alvo_tipo="item" if item is not None else "efeito",
        alvo_id=item.id if item is not None else (criados[0].id if criados else None),
        resumo=(
            f"{auditoria.nome_personagem(personagem)}: importou "
            + (f"{item.nome} ({nomes})" if item is not None else nomes)
        ),
        detalhes={"item_id": item.id if item is not None else None, "efeitos": [e.id for e in criados],
                  "avisos": previa.avisos},
        correlacao_id=correlacao,
    )
    session.commit()
    atuais = ficha_viva.efeitos(session, mesa_id, personagem_id)
    ids = {registro.id for registro in criados}
    return ImportacaoResultado(
        versao=versao,
        item=_item_resumo(item, atuais) if item is not None else None,
        efeitos=[_efeito_resumo(e) for e in atuais if e.id in ids],
    )
