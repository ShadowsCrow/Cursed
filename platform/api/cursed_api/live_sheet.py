"""Consultas e comandos da ficha viva: inventário, efeitos, valores derivados e importação."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, catalogos, ficha_viva, icones_efeitos
from cursed_platform.domain import recursos
from cursed_platform.domain.efeitos import indexar_catalogo
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform import inventario_grade, recipientes
from cursed_platform.domain import grade as motor_grade
from cursed_platform.contracts import (
    AjustarRecursoRequest, AjusteRecursoResposta, AmpliacaoGradeResumo, ArrumacaoGradeRequest, DefinirFormatoRequest, GradeInventario, MoedasRequest,
    ProblemaArrumacao, VersaoRequest,
    EfeitoPrevia, EfeitoResumo, IconeResumo, EquiparItemRequest, EquiparItemResposta, FonteEfeitoResumo,
    FonteValorResumo, ImportacaoResultado, ImportarCodigoRequest, ItemInventarioResumo, ItemPrevia,
    ModificadorResumo, PermissoesFicha, PreviaImportacaoRequest, PreviaImportacaoResumo,
    SituacionalResumo, TrilhaDesgaste, ValorDerivadoResumo,
)
from cursed_platform.domain.desgaste import RECURSOS as TRILHAS_DESGASTE, resumo_trilha
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
        subtipo=item.subtipo, largura=item.largura, altura=item.altura, coluna=item.coluna, linha=item.linha,
        girado=item.girado, maos=item.maos, pilha_max=item.pilha_max,
    )


def _grade_resumo(
    session: Session, personagem: PersonagemRegistro, ctx: inventario_grade.ContextoGrade, versao: int,
) -> GradeInventario:
    avaliacao = motor_grade.avaliar(ctx.grade, ctx.itens)
    colunas, linhas = motor_grade.limites_fisicos(ctx.grade, ctx.itens)
    efeitos = ficha_viva.efeitos(session, personagem.mesa_id, personagem.id)
    return GradeInventario(
        versao=versao, forca=ctx.forca, tamanho=ctx.tamanho, tamanho_origem=ctx.tamanho_origem,
        colunas_verdes=ctx.grade.colunas_verdes, linhas_verdes=ctx.grade.linhas_verdes, colunas=colunas, linhas=linhas,
        ampliacoes=[AmpliacaoGradeResumo(fonte=a.fonte, rotulo=a.rotulo, linhas=a.linhas, colunas=a.colunas)
                    for a in ctx.grade.ampliacoes],
        sobrecarga=avaliacao.sobrecarga, itens_em_sobrecarga=list(avaliacao.itens_em_sobrecarga),
        maos_ocupadas=avaliacao.maos_ocupadas, celulas_ocupadas=avaliacao.celulas_ocupadas,
        celulas_verdes=avaliacao.celulas_verdes,
        itens=[_item_resumo(r, efeitos) for r in inventario_grade.itens_do_personagem(session, personagem)],
    )


def _contexto_ou_erro(session: Session, personagem: PersonagemRegistro) -> inventario_grade.ContextoGrade:
    try:
        return inventario_grade.contexto(session, personagem)
    except inventario_grade.TamanhoIndefinido as erro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from None


def _efeito_resumo(efeito: ficha_viva.EfeitoAtual, icone: IconeResumo) -> EfeitoResumo:
    return EfeitoResumo(
        id=efeito.id, nome=efeito.nome, descricao=efeito.descricao, estado=efeito.estado,
        duracao_rodadas=efeito.duracao_rodadas,
        ativacao=(efeito.conteudo.get("ativacao") or {}).get("tipo"),
        modificadores=[ModificadorResumo(alvo=m.alvo, valor=m.valor, contexto=m.contexto) for m in efeito.modificadores],
        fontes=[
            FonteEfeitoResumo(tipo=f.tipo, descricao=f.descricao, equipamento_id=f.equipamento_id)
            for f in efeito.fontes
        ],
        derivado=bool(efeito.conteudo.get("derivado")),
        consequencias=list(efeito.conteudo.get("consequencias") or []),
        associacao=efeito.associacao, icone=icone,
    )


def icones_para(session: Session, mesa_id: str):
    """Resolve o ícone de cada efeito da mesa: mesa → catálogo → padrão."""
    indice = indexar_catalogo(catalogos.obter().efeitos_default)
    da_mesa = icones_efeitos.icones_da_mesa(session, mesa_id)

    def resolver(associacao: str | None, conteudo: dict | None) -> IconeResumo:
        icone = icones_efeitos.resolver(associacao=associacao, conteudo=conteudo, catalogo=indice, icones_mesa=da_mesa)
        return IconeResumo(origem=icone.origem, caminho=icone.caminho)

    return resolver


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
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    icone = icones_para(session, mesa_id)
    return [_efeito_resumo(e, icone(e.associacao, e.conteudo))
            for e in inventario_grade.efeitos_com_derivados(session, personagem)]


@router.get("/valores-derivados", response_model=list[ValorDerivadoResumo])
def listar_valores_derivados(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[ValorDerivadoResumo]:
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    valores = ficha_viva.calcular_valores_derivados(
        personagem.ficha or {},
        ficha_viva.itens(session, mesa_id, personagem_id),
        inventario_grade.efeitos_com_derivados(session, personagem),
    )
    return [
        *(
            ValorDerivadoResumo(
                chave=v.chave, rotulo=v.rotulo, grupo=v.grupo, total=v.total,
                fontes=[FonteValorResumo(**vars(f)) for f in v.fontes],
                situacionais=[SituacionalResumo(**vars(s)) for s in v.situacionais],
            )
            for v in valores
        ),
        *valores_de_recurso(personagem.ficha or {}),
    ]


def valores_de_recurso(ficha: dict) -> list[ValorDerivadoResumo]:
    """PV, PP e Escalas calculados pela classe, atributos e nível (grupo "recurso")."""
    calculado = recursos.calcular(ficha, catalogos.obter())
    return [
        ValorDerivadoResumo(
            chave=v.chave, rotulo=v.rotulo, grupo="recurso", total=v.total, calculavel=v.calculavel, motivo=v.motivo,
            divergencia_legada=v.divergencia_legada,
            fontes=[FonteValorResumo(tipo=f.tipo, descricao=f.rotulo, valor=f.valor) for f in v.fontes],
        )
        for v in calculado.valores.values()
    ]


@router.post("/recursos/ajustes", response_model=AjusteRecursoResposta, status_code=status.HTTP_201_CREATED)
def ajustar_recurso(
    mesa_id: str, personagem_id: str, pedido: AjustarRecursoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> AjusteRecursoResposta:
    """O Narrador soma um ajuste com origem e justificativa a PV/PP máximo ou a uma Escala."""
    decisao = Autorizador(session).decidir(Acao.APLICAR_EFEITO, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Ficha não encontrada." if decisao.ocultar_existencia else "Somente o Narrador ajusta PV e PP.",
        )
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    anterior = deepcopy(personagem.ficha or {})
    nova = deepcopy(anterior)
    ajuste = {
        "alvo": pedido.alvo, "valor": pedido.valor, "origem": pedido.origem.strip(),
        "justificativa": pedido.justificativa.strip(), "autor_id": ator.usuario_id, "em": datetime.now(UTC).isoformat(),
    }
    secao = nova.setdefault("recursos", {})
    secao["ajustes"] = [*(secao.get("ajustes") or []), ajuste]
    recursos.ajustar_atuais(nova, recursos.calcular(nova, catalogos.obter()), novo=False)
    if not FichaRepository(session).substituir_se_versao(mesa_id, personagem_id, pedido.versao_esperada, nova):
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.")
    rotulo = recursos.ROTULOS[pedido.alvo]
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="ficha", acao="recurso.ajustado",
        relevancia="mecanica", personagem=personagem,
        resumo=f"{auditoria.nome_personagem(personagem)}: {rotulo} {pedido.valor:+d} ({ajuste['origem']})",
        mudancas=auditoria.mudancas(anterior, nova),
        detalhes={"ajuste": {k: ajuste[k] for k in ("alvo", "valor", "origem", "justificativa")}},
        correlacao_id=correlacao,
    )
    session.commit()
    return AjusteRecursoResposta(versao=pedido.versao_esperada + 1, valores=valores_de_recurso(nova))


@router.get("/desgaste", response_model=list[TrilhaDesgaste])
def ler_desgaste(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[TrilhaDesgaste]:
    """Exaustão e Estresse com faixa e penalidade vindas do domínio; a interface não recalcula regras."""
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    desgaste = (personagem.ficha or {}).get("desgaste")
    registrado = isinstance(desgaste, dict)
    return [
        TrilhaDesgaste(**resumo_trilha(recurso, desgaste), registrado=registrado and recurso in desgaste)
        for recurso in TRILHAS_DESGASTE
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
    if pedido.equipado and not item.equipado and (item.subtipo is None or item.largura is None):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail=f"{item.nome} ainda não tem formato: defina o formato e coloque o item na grade antes de equipar.")
    if pedido.equipado and not item.equipado:
        ctx = _contexto_ou_erro(session, personagem)
        alvo = next(i for i in ctx.itens if i.id == item.id)
        resultado = motor_grade.validar_equipar(list(ctx.itens), alvo, ctx.forca)
        if not resultado.ok:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=resultado.mensagem)
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


@router.get("/inventario/grade", response_model=GradeInventario)
def ler_grade(
    mesa_id: str, personagem_id: str,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> GradeInventario:
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    return _grade_resumo(session, personagem, _contexto_ou_erro(session, personagem), personagem.versao)


@router.put(
    "/inventario/arrumacao", response_model=GradeInventario,
    responses={422: {"description": "Arrumação inválida; nada foi gravado.", "model": list[ProblemaArrumacao]}},
)
def gravar_arrumacao(
    mesa_id: str, personagem_id: str, pedido: ArrumacaoGradeRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> GradeInventario:
    """Grava a arrumação inteira da grade (tudo ou nada). Mover itens dentro da grade não gera evento no
    histórico; colocar na grade, retirar para a bandeja, equipar, desequipar e entrar ou sair de sobrecarga geram."""
    personagem = _exigir_edicao(session, mesa_id, personagem_id, ator, "inventario.arrumacao")
    _contexto_ou_erro(session, personagem)
    pedidos = [
        inventario_grade.PedidoPosicao(p.item_id, p.coluna, p.linha, p.girado, p.equipado, p.maos) for p in pedido.itens
    ]
    try:
        resultado = inventario_grade.aplicar_arrumacao(session, personagem, pedidos, pedido.versao_esperada)
    except inventario_grade.ArrumacaoInvalida as erro:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[ProblemaArrumacao(item_id=p.item_id, motivo=p.motivo, mensagem=p.mensagem).model_dump()
                    for p in erro.problemas],
        ) from None
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.") from None
    nomes = {r.id: r.nome for r in inventario_grade.itens_do_personagem(session, personagem)}
    mudancas = [
        *({"campo": f"inventario.{i}.na_grade", "antes": False, "depois": True, "completo": True, "rotulo": nomes[i]}
          for i in resultado.colocados),
        *({"campo": f"inventario.{i}.na_grade", "antes": True, "depois": False, "completo": True, "rotulo": nomes[i]}
          for i in resultado.retirados),
        *({"campo": f"inventario.{i}.maos", "antes": 3 - m, "depois": m, "completo": True, "rotulo": nomes[i]}
          for i, m in resultado.empunhaduras),
        *({"campo": f"inventario.{i}.equipado", "antes": False, "depois": True, "completo": True, "rotulo": nomes[i]}
          for i in resultado.equipados),
        *({"campo": f"inventario.{i}.equipado", "antes": True, "depois": False, "completo": True, "rotulo": nomes[i]}
          for i in resultado.desequipados),
    ]
    if resultado.sobrecarga_antes != resultado.sobrecarga_depois:
        mudancas.append({"campo": "inventario.sobrecarga", "antes": resultado.sobrecarga_antes,
                         "depois": resultado.sobrecarga_depois, "completo": True, "rotulo": "Sobrecarga"})
    if mudancas:
        partes = ([f"{nomes[i]} colocado na grade" for i in resultado.colocados]
                  + [f"{nomes[i]} retirado para a bandeja" for i in resultado.retirados]
                  + [f"{nomes[i]} empunhada com {'duas mãos' if m == 2 else 'uma mão'}" for i, m in resultado.empunhaduras]
                  + [f"{nomes[i]} equipado" for i in resultado.equipados]
                  + [f"{nomes[i]} desequipado" for i in resultado.desequipados])
        if resultado.sobrecarga_antes != resultado.sobrecarga_depois:
            partes.append("entrou em sobrecarga" if resultado.sobrecarga_depois else "saiu da sobrecarga")
        auditoria.registrar(
            session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao="grade.arrumada",
            relevancia="mecanica", personagem=personagem, alvo_tipo="personagem", alvo_id=personagem.id,
            resumo=f"{auditoria.nome_personagem(personagem)}: {', '.join(partes)}",
            mudancas=mudancas, correlacao_id=correlacao,
        )
    session.commit()
    return _grade_resumo(session, personagem, resultado.contexto, resultado.versao)


@router.post("/inventario/mochila/largar", response_model=GradeInventario)
def largar_mochila(
    mesa_id: str, personagem_id: str, pedido: VersaoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> GradeInventario:
    """Interação livre: a mochila vai para o chão da cena ativa com os itens das linhas que ela acrescentava."""
    personagem = _exigir_edicao(session, mesa_id, personagem_id, ator, "inventario.arrumacao")
    _contexto_ou_erro(session, personagem)
    try:
        resultado = recipientes.largar_mochila(session, personagem, pedido.versao_esperada)
    except (recipientes.SemCenaAtiva, recipientes.SemMochila) as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro)) from None
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.") from None
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao="mochila.largada",
        relevancia="mecanica", personagem=personagem, alvo_tipo="personagem", alvo_id=personagem.id,
        resumo=f"{auditoria.nome_personagem(personagem)} largou {resultado.mochila} no chão ({len(resultado.largados)} item(ns))",
        detalhes={"itens": list(resultado.largados)}, correlacao_id=correlacao,
    )
    session.commit()
    return _grade_resumo(session, personagem, _contexto_ou_erro(session, personagem), resultado.versao)


def _resumo_moedas(personagem: PersonagemRegistro, antes: dict[str, int], depois: dict[str, int]) -> str:
    entrou = [f"{depois[t] - antes[t]} de {t}" for t in antes if depois[t] > antes[t]]
    saiu = [f"{antes[t] - depois[t]} de {t}" for t in antes if depois[t] < antes[t]]
    partes = ([f"adicionou {', '.join(entrou)}"] if entrou else []) + ([f"retirou {', '.join(saiu)}"] if saiu else [])
    return f"{auditoria.nome_personagem(personagem)}: moedas — {'; '.join(partes)}"


@router.put("/inventario/moedas", response_model=GradeInventario)
def gravar_moedas(
    mesa_id: str, personagem_id: str, pedido: MoedasRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> GradeInventario:
    """Adiciona ou retira moedas, define os totais (o servidor junta em pilhas) ou as pilhas (para dividir).
    Nenhuma moeda some: pilhas sem espaço vão para a área vermelha ou ficam fora da grade."""
    personagem = _exigir_edicao(session, mesa_id, personagem_id, ator, "inventario.moedas")
    mesa = session.get(MesaRegistro, mesa_id)
    assert mesa is not None
    try:
        ficha_viva._avancar_versao(session, personagem, pedido.versao_esperada)
        if pedido.adicionar is not None or pedido.retirar is not None:
            antes, depois, _ = inventario_grade.ajustar_no_personagem(
                session, personagem, mesa.moedas_por_pilha,
                adicionar=pedido.adicionar.model_dump() if pedido.adicionar else None,
                retirar=pedido.retirar.model_dump() if pedido.retirar else None,
            )
        else:
            pilhas = ([p.model_dump() for p in pedido.pilhas] if pedido.pilhas is not None
                      else motor_grade.distribuir_moedas(pedido.bolsa.model_dump() if pedido.bolsa else {}, mesa.moedas_por_pilha))
            antes, depois, _ = inventario_grade.distribuir_no_personagem(session, personagem, mesa.moedas_por_pilha, pilhas)
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.") from None
    except inventario_grade.MoedasInvalidas as erro:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    if antes != depois:
        auditoria.registrar(
            session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao="moedas.alteradas",
            relevancia="mecanica", personagem=personagem, alvo_tipo="personagem", alvo_id=personagem.id,
            resumo=_resumo_moedas(personagem, antes, depois),
            mudancas=[{"campo": f"moedas.{t}", "antes": antes[t], "depois": depois[t], "completo": True, "rotulo": t}
                      for t in antes if antes[t] != depois[t]],
            correlacao_id=correlacao,
        )
    session.commit()
    session.refresh(personagem)
    return _grade_resumo(session, personagem, _contexto_ou_erro(session, personagem), personagem.versao)


@router.put("/inventario/{item_id}/formato", response_model=EquiparItemResposta)
def definir_formato(
    mesa_id: str, personagem_id: str, item_id: str, pedido: DefinirFormatoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> EquiparItemResposta:
    """O Narrador define tipo e dimensão de um item (por exemplo, os que chegaram sem dimensão).
    Se o formato muda, o item sai da grade para ser recolocado; se o subtipo muda, ele é desequipado."""
    _personagem(session, mesa_id, personagem_id, ator)
    personagem = _personagem(session, mesa_id, personagem_id, ator, Acao.DEFINIR_FORMATO_ITEM)
    item = session.get(ItemInventarioRegistro, item_id)
    if item is None or item.mesa_id != mesa_id or item.personagem_id != personagem_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")
    antes = {"subtipo": item.subtipo, "largura": item.largura, "altura": item.altura}
    formato = pedido.formato.model_dump(mode="json")
    try:
        versao = ficha_viva._avancar_versao(session, personagem, pedido.versao_esperada)
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.") from None
    if item.equipado and item.subtipo != formato["subtipo"]:
        item.equipado = False
        ficha_viva.alternar_efeitos_vinculados(session, personagem, item, False)
    retirado = ficha_viva.aplicar_formato(item, formato)
    if retirado and item.equipado and item.subtipo != "mochila":
        # Fora da grade o item não é levado: volta para a bandeja desequipado.
        item.equipado = False
        ficha_viva.alternar_efeitos_vinculados(session, personagem, item, False)
    session.flush()
    depois = {"subtipo": item.subtipo, "largura": item.largura, "altura": item.altura}
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="inventario", acao="item.formato_definido",
        relevancia="mecanica", personagem=personagem, alvo_tipo="item", alvo_id=item.id,
        resumo=(f"{auditoria.nome_personagem(personagem)}: formato de {item.nome} definido como "
                f"{item.largura} x {item.altura}" + (" (saiu da grade para ser recolocado)" if retirado else "")),
        mudancas=[{"campo": f"formato.{k}", "antes": antes[k], "depois": depois[k], "completo": True, "rotulo": item.nome}
                  for k in antes if antes[k] != depois[k]],
        correlacao_id=correlacao,
    )
    session.commit()
    return EquiparItemResposta(versao=versao, item=_item_resumo(item, ficha_viva.efeitos(session, mesa_id, personagem_id)))


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
    icone = icones_para(session, mesa_id)
    return ImportacaoResultado(
        versao=versao,
        item=_item_resumo(item, atuais) if item is not None else None,
        efeitos=[_efeito_resumo(e, icone(e.associacao, e.conteudo)) for e in atuais if e.id in ids],
    )
