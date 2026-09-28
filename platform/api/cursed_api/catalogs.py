"""Catálogos do sistema para os participantes da mesa (calcular-valores-da-ficha, D6).

Os catálogos são iguais para todas as mesas, mas a leitura passa pela mesa: só participantes
consultam, e a lista de efeitos já traz o ícone resolvido para aquela mesa.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import catalogos, icones_efeitos
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.catalogos import Base, Habilidade
from cursed_platform.contracts import (
    ArquetipoResumo, BaseClasseResumo, CampoPersonalidadeResumo, ClasseCatalogoResumo, EfeitoDefaultResumo,
    ErroCatalogoResumo, EstadoCatalogoResumo, FaixaAlturaResumo, HabilidadeCatalogoResumo, IconeResumo,
    IntervaloAlturaResumo, ListasFichaResumo, ModificadorCatalogoResumo, PecadoResumo, RacaCatalogoResumo,
)
from cursed_platform.domain.efeitos import indexar_catalogo

from .auth import Ator, get_actor
from .dependencies import get_session

router = APIRouter(prefix="/mesas/{mesa_id}/catalogos", tags=["Catálogos"])


def _exigir(session: Session, mesa_id: str, ator: Ator, acao: Acao = Acao.LER_MESA) -> None:
    decisao = Autorizador(session).decidir(acao, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Mesa não encontrada." if decisao.ocultar_existencia else decisao.motivo,
        )


def _base(base: Base | None) -> BaseClasseResumo | None:
    return BaseClasseResumo(valor=base.valor, atributo=base.atributo, texto=base.texto) if base else None


def _habilidades(lista: tuple[Habilidade, ...]) -> list[HabilidadeCatalogoResumo]:
    return [HabilidadeCatalogoResumo(nome=h.nome, descricao=h.descricao, tipo=h.tipo) for h in lista]


@router.get("/classes", response_model=list[ClasseCatalogoResumo])
def listar_classes(mesa_id: str, ator: Ator = Depends(get_actor),
                   session: Session = Depends(get_session)) -> list[ClasseCatalogoResumo]:
    _exigir(session, mesa_id, ator)
    return [
        ClasseCatalogoResumo(
            nome=c.nome, cor=c.cor, pv=_base(c.pv), escala_pv=_base(c.escala_pv), pp=_base(c.pp),
            escala_pp=_base(c.escala_pp), habilidades=_habilidades(c.habilidades),
            arquetipos=[ArquetipoResumo(nome=a.nome, conceito=a.conceito, habilidades=_habilidades(a.habilidades))
                        for a in c.arquetipos],
        )
        for c in catalogos.obter().classes
    ]


@router.get("/racas", response_model=list[RacaCatalogoResumo])
def listar_racas(mesa_id: str, ator: Ator = Depends(get_actor),
                 session: Session = Depends(get_session)) -> list[RacaCatalogoResumo]:
    _exigir(session, mesa_id, ator)
    return [RacaCatalogoResumo(nome=r.nome, deslocamento=r.deslocamento, tamanho=r.tamanho,
                               habilidades=_habilidades(r.habilidades),
                               altura=IntervaloAlturaResumo(minima=r.altura.minima, maxima=r.altura.maxima) if r.altura else None)
            for r in catalogos.obter().racas]


@router.get("/listas-ficha", response_model=ListasFichaResumo)
def listar_listas(mesa_id: str, ator: Ator = Depends(get_actor),
                  session: Session = Depends(get_session)) -> ListasFichaResumo:
    _exigir(session, mesa_id, ator)
    listas = catalogos.obter().listas
    return ListasFichaResumo(
        sexos=list(listas.sexos), alinhamentos=list(listas.alinhamentos),
        pecados=[PecadoResumo(nome=p.nome, icone=p.icone, equivalentes=list(p.equivalentes)) for p in listas.pecados],
        campos_personalidade=[CampoPersonalidadeResumo(chave=c.chave, rotulo=c.rotulo, dica=c.dica, longo=c.longo, limite=c.limite)
                              for c in listas.campos_personalidade],
        faixas_de_altura=[FaixaAlturaResumo(tamanho=f.tamanho, minima=f.intervalo.minima, maxima=f.intervalo.maxima)
                          for f in listas.faixas_de_altura],
        icones_ficha=dict(listas.icones_ficha),
    )


@router.get("/efeitos-default", response_model=list[EfeitoDefaultResumo])
def listar_efeitos_default(mesa_id: str, ator: Ator = Depends(get_actor),
                           session: Session = Depends(get_session)) -> list[EfeitoDefaultResumo]:
    _exigir(session, mesa_id, ator)
    catalogo = catalogos.obter()
    indice = indexar_catalogo(catalogo.efeitos_default)
    icones_mesa = icones_efeitos.icones_da_mesa(session, mesa_id)
    resposta = []
    for efeito in catalogo.efeitos_aplicaveis():
        icone = icones_efeitos.resolver(associacao=efeito["associacao"], conteudo=None, catalogo=indice,
                                        icones_mesa=icones_mesa)
        resposta.append(EfeitoDefaultResumo(
            associacao=efeito["associacao"], nome=efeito["nome"], descricao=efeito["descricao"],
            grupo=efeito.get("grupo"),
            modificadores=[ModificadorCatalogoResumo(alvo=m["alvo"], valor=m["valor"], quando=m.get("quando"))
                           for m in efeito.get("modificadores") or []],
            substitui=list(efeito.get("substitui") or []),
            substitui_nomes=[indice[a]["nome"] for a in efeito.get("substitui") or [] if a in indice],
            icone=IconeResumo(origem=icone.origem, caminho=icone.caminho),
        ))
    return resposta


@router.get("/estado", response_model=EstadoCatalogoResumo)
def estado_do_catalogo(mesa_id: str, ator: Ator = Depends(get_actor),
                       session: Session = Depends(get_session)) -> EstadoCatalogoResumo:
    """Versão carregada e último erro de recarga do JSON, para o Narrador."""
    _exigir(session, mesa_id, ator, Acao.LER_CONTEUDO_NARRADOR)
    versao = catalogos.obter().versao
    erro = catalogos.CARREGADOR.erro()
    return EstadoCatalogoResumo(
        versao=versao,
        erro=ErroCatalogoResumo(arquivo=erro.arquivo, motivo=erro.motivo, em=erro.em) if erro else None,
    )
