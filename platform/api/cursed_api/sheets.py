"""Consultas e comandos iniciais para fichas confirmadas."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse
from sqlalchemy.orm import Session

from cursed_platform import auditoria, catalogos
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import AtualizarFichaComando, FichaContrato, PedidoAlteracaoResumo, ProblemaValidacao
from cursed_platform.domain import validacao_ficha
from cursed_platform.domain.ficha import FichaDraft
from cursed_platform.persistence import MesaRegistro, MembroRegistro, PedidoAlteracaoRegistro, PersonagemRegistro
from cursed_platform.policies import (
    avaliar_campos, campos_alterados, campos_exclusivos_do_narrador, normalizar_confirmacao_de_nivel,
    normalizar_excecao_de_tamanho,
)
from cursed_platform.repositories import FichaRepository

from .auth import Ator, get_actor
from .catalogo_ficha import atualizar_cartas
from .dependencies import get_session
from .validacao import ajustar_recursos_atuais, exigir_ficha_valida


router = APIRouter(prefix="/mesas/{mesa_id}/personagens/{personagem_id}", tags=["Fichas"])


class FichaSnapshot(BaseModel):
    mesa_id: str
    personagem_id: str
    versao: int
    ficha: FichaContrato
    tipo: str = Field(default="personagem", description="personagem, npc ou monstro: só personagens seguem limites e catálogo.")
    avisos: list[ProblemaValidacao] = Field(
        default_factory=list, description="Valores fora das regras ou do catálogo, mantidos até o Narrador corrigir.")


def avisos_da_ficha(ficha: dict) -> list[ProblemaValidacao]:
    return [ProblemaValidacao(campo=a.caminho, mensagem=a.mensagem)
            for a in validacao_ficha.verificar(ficha, catalogos.obter())]


def _consultar_autorizado(
    session: Session,
    *,
    mesa_id: str,
    personagem_id: str,
    ator: Ator,
    gravar: bool = False,
) -> PersonagemRegistro:
    decisao = Autorizador(session).decidir(
        Acao.EDITAR_FICHA if gravar else Acao.LER_FICHA,
        usuario_id=ator.usuario_id,
        mesa_id=mesa_id,
        personagem_id=personagem_id,
    )
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Ficha não encontrada." if decisao.ocultar_existencia else decisao.motivo,
        )
    personagem = FichaRepository(session).get(mesa_id, personagem_id)
    assert personagem is not None
    return personagem


@router.get("/ficha", response_model=FichaSnapshot)
def ler_ficha(
    mesa_id: str,
    personagem_id: str,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> FichaSnapshot:
    personagem = _consultar_autorizado(
        session, mesa_id=mesa_id, personagem_id=personagem_id, ator=ator
    )
    return FichaSnapshot(
        mesa_id=mesa_id,
        personagem_id=personagem_id,
        versao=personagem.versao,
        ficha=FichaContrato.model_validate(personagem.ficha),
        tipo=personagem.tipo,
        avisos=avisos_da_ficha(personagem.ficha or {}),
    )


@router.put("/ficha", response_model=FichaSnapshot, responses={202: {"model": PedidoAlteracaoResumo}})
def gravar_ficha(
    mesa_id: str,
    personagem_id: str,
    comando: AtualizarFichaComando,
    ator: Ator = Depends(get_actor),
    session: Session = Depends(get_session),
) -> FichaSnapshot | JSONResponse:
    if (
        comando.mesa_id != mesa_id
        or comando.personagem_id != personagem_id
        or comando.ator_id != ator.usuario_id
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comando não corresponde ao recurso ou ator.")
    personagem = _consultar_autorizado(
        session, mesa_id=mesa_id, personagem_id=personagem_id, ator=ator, gravar=True
    )
    if personagem.versao != comando.versao_esperada:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.")
    payload = FichaDraft.de_payload(comando.ficha.model_dump(mode="json")).para_payload()
    mesa = session.get(MesaRegistro, mesa_id)
    membro = session.get(MembroRegistro, (mesa_id, ator.usuario_id))
    assert mesa is not None and membro is not None
    anterior = FichaDraft.de_payload(personagem.ficha).para_payload()
    normalizar_excecao_de_tamanho(anterior, payload)
    normalizar_confirmacao_de_nivel(anterior, payload)
    alterados = campos_alterados(anterior, payload)
    if not alterados:
        # Confirmação sem diferença não é uma alteração: sem nova versão nem evento.
        return FichaSnapshot(
            mesa_id=mesa_id, personagem_id=personagem_id, versao=personagem.versao,
            ficha=FichaContrato.model_validate(anterior),
        )
    if membro.papel == "jogador":
        exclusivos = campos_exclusivos_do_narrador(anterior, payload)
        if exclusivos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Somente o Narrador altera: {', '.join(exclusivos)}.",
            )
    exigir_ficha_valida(anterior, payload, tipo=personagem.tipo)
    # O limite do atual entra na mesma gravação e, portanto, no mesmo evento de auditoria.
    ajustar_recursos_atuais(payload, novo=False)
    if membro.papel == "jogador":
        politica = avaliar_campos(
            alterados,
            bloqueados=mesa.campos_bloqueados,
            exigem_aprovacao=mesa.campos_exigem_aprovacao,
        )
        if politica.bloqueados:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="A ficha contém campos bloqueados.")
        if politica.exigem_aprovacao:
            pedido = PedidoAlteracaoRegistro(
                id=uuid4().hex,
                mesa_id=mesa_id,
                personagem_id=personagem_id,
                solicitante_id=ator.usuario_id,
                versao_base=comando.versao_esperada,
                ficha_proposta=payload,
                campos_alterados=sorted(alterados),
                estado="pendente",
            )
            session.add(pedido)
            auditoria.registrar(
                session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="ficha",
                acao="solicitacao.criada", relevancia=auditoria.relevancia_da_ficha(alterados),
                personagem=personagem,
                resumo=(
                    f"{auditoria.nome_personagem(personagem)}: alteração enviada para aprovação "
                    f"({len(alterados)} campo(s))"
                ),
                detalhes={"pedido_id": pedido.id, "campos_propostos": sorted(alterados)},
                correlacao_id=comando.id,
            )
            session.commit()
            resumo = PedidoAlteracaoResumo(
                id=pedido.id, mesa_id=mesa_id, personagem_id=personagem_id,
                solicitante_id=ator.usuario_id, versao_base=pedido.versao_base,
                campos_alterados=pedido.campos_alterados, estado="pendente",
                ficha_proposta=FichaContrato.model_validate(payload),
            )
            return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=resumo.model_dump(mode="json"))
    if not FichaRepository(session).substituir_se_versao(
        mesa_id, personagem_id, comando.versao_esperada, payload
    ):
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.")
    alteracoes = auditoria.mudancas(anterior, payload)
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria="ficha", acao="ficha.atualizada",
        relevancia=auditoria.relevancia_da_ficha(alterados), personagem=personagem,
        resumo=auditoria.resumo_mudancas(auditoria.nome_personagem(personagem), alteracoes),
        mudancas=alteracoes, correlacao_id=comando.id,
    )
    atualizar_cartas(session, personagem, anterior, payload, ator_id=ator.usuario_id, correlacao_id=comando.id)
    session.commit()
    return FichaSnapshot(
        mesa_id=mesa_id,
        personagem_id=personagem_id,
        versao=comando.versao_esperada + 1,
        ficha=FichaContrato.model_validate(payload),
        tipo=personagem.tipo,
        avisos=avisos_da_ficha(payload),
    )
