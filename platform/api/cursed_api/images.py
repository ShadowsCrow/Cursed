"""Envio, troca e remoção de imagens da mesa (calcular-valores-da-ficha, D7).

``PUT /mesas/{m}/imagens/{destino}`` recebe ``multipart/form-data`` com ``arquivo``, ``alvo`` e
``versao_esperada``; ``DELETE`` recebe ``alvo`` e ``versao_esperada`` na consulta. O servidor
autoriza pelo destino e pelo alvo, valida a imagem, grava no espaço de visibilidade do recurso
(nome pelo conteúdo), atualiza só a referência daquele ponto e registra a troca sem a imagem.

Destinos e alvos:
    retrato        personagem          personagens/{p}/imagens/  ficha.personagem.imagem_ativo
    ilustracao     personagem          personagens/{p}/imagens/  ficha.personagem.ilustracao_ativo (Resumo da ficha)
    item           item do inventário  personagens/{p}/imagens/  item.dados.imagem_ativo
    icone-grade    item:{id}           personagens/{p}/imagens/  item.dados.icone_grade
                   carta:{id}          narrador/cartas/          rascunho.formato.icone_grade
    efeito         efeito aplicado     personagens/{p}/imagens/  efeito.conteudo.imagem_ativo
    carta          carta               narrador/cartas/          rascunho.ativos_privados
    mapa           cena                mesa/mapas/               cena.mapa_objeto
    icone-efeito   associação default  mesa/icones-efeitos/      effect_icons (só nesta mesa)
    capa           a própria mesa      mesa/capa/                rpg_tables.capa_objeto (só o Narrador)

A arte e o ícone de grade enviados para uma carta ficam no espaço do Narrador até a publicação,
que os copia para o espaço da mesa (``promover_ativos``).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, cartas, catalogos, corpos, ficha_viva, icones_efeitos, imagens, sala
from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import ImagemResposta
from cursed_platform.migracao_ativos import AtivoInvalido
from cursed_platform.persistence import (
    CartaDefinicaoRegistro, CenaRegistro, EfeitoAplicadoRegistro, ItemInventarioRegistro, MembroRegistro,
    MesaRegistro, PersonagemRegistro,
)
from cursed_platform.policies import avaliar_campos
from cursed_platform.repositories import FichaRepository

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session

router = APIRouter(prefix="/mesas/{mesa_id}/imagens", tags=["Imagens"])

NomeDestino = Literal["retrato", "ilustracao", "item", "icone-grade", "efeito", "carta", "mapa", "icone-efeito", "capa"]


@dataclass
class Alvo:
    """Onde a imagem é gravada e como a referência é trocada (``None`` remove)."""

    prefixo: str
    aplicar: Callable[[str | None], int | None]
    rotulo: str
    categoria: str
    personagem: PersonagemRegistro | None = None
    visibilidade: str | None = None
    feminino: bool = False  # concordância do resumo: "capa alterada", "retrato alterado"


def _negar(decisao, recurso: str = "Recurso não encontrado.") -> None:
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail=recurso if decisao.ocultar_existencia else decisao.motivo,
        )


def _exigir_versao(versao_esperada: int | None) -> int:
    if versao_esperada is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Informe a versão esperada.")
    return versao_esperada


def _personagem_editavel(session: Session, mesa_id: str, personagem_id: str, ator: Ator, campo: str) -> PersonagemRegistro:
    """Narrador, ou dono do personagem quando a mesa permite editar a ficha e o campo não está bloqueado."""
    _negar(Autorizador(session).decidir(Acao.EDITAR_FICHA, usuario_id=ator.usuario_id, mesa_id=mesa_id,
                                        personagem_id=personagem_id))
    membro = session.get(MembroRegistro, (mesa_id, ator.usuario_id))
    mesa = session.get(MesaRegistro, mesa_id)
    if membro is not None and membro.papel == "jogador" and mesa is not None:
        politica = avaliar_campos({campo}, bloqueados=mesa.campos_bloqueados, exigem_aprovacao=[])
        if politica.bloqueados:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Alteração bloqueada pelo Narrador.")
    personagem = FichaRepository(session).get(mesa_id, personagem_id)
    if personagem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado.")
    return personagem


def _avancar(session: Session, personagem: PersonagemRegistro, versao_esperada: int | None) -> int:
    try:
        return ficha_viva._avancar_versao(session, personagem, _exigir_versao(versao_esperada))
    except ficha_viva.ConflitoVersao:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.") from None


def _alvo_retrato(session, mesa_id, alvo, ator, versao, chave: str = "imagem_ativo", rotulo: str = "retrato",
                  feminino: bool = False) -> Alvo:
    """Retrato do cabeçalho ou ilustração do Resumo: a mesma regra, cada um no seu campo da ficha."""
    personagem = _personagem_editavel(session, mesa_id, alvo, ator, f"personagem.{chave}")

    def aplicar(objeto: str | None) -> int:
        ficha = dict(personagem.ficha or {})
        dados = dict(ficha.get("personagem") or {})
        if objeto:
            dados[chave] = objeto
        else:
            dados.pop(chave, None)
        ficha["personagem"] = dados
        if not FichaRepository(session).substituir_se_versao(mesa_id, personagem.id, _exigir_versao(versao), ficha):
            session.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão desatualizada.")
        return _exigir_versao(versao) + 1

    return Alvo(f"mesas/{mesa_id}/personagens/{personagem.id}/imagens", aplicar, rotulo, "ficha", personagem,
                feminino=feminino)


def _alvo_item(session, mesa_id, item_id, ator, versao, chave: str, rotulo: str) -> Alvo:
    item = session.get(ItemInventarioRegistro, item_id)
    if item is None or item.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")
    personagem = _personagem_editavel(session, mesa_id, item.personagem_id, ator, "inventario")

    def aplicar(objeto: str | None) -> int:
        nova = _avancar(session, personagem, versao)
        dados = {k: v for k, v in (item.dados or {}).items() if k != chave}
        item.dados = {**dados, chave: objeto} if objeto else dados
        return nova

    return Alvo(f"mesas/{mesa_id}/personagens/{personagem.id}/imagens", aplicar, f"{rotulo} de {item.nome}",
                "inventario", personagem)


def _alvo_efeito(session, mesa_id, efeito_id, ator, versao) -> Alvo:
    efeito = session.get(EfeitoAplicadoRegistro, efeito_id)
    if efeito is None or efeito.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Efeito não encontrado.")
    if efeito.associacao:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail="Efeito do catálogo: o Narrador troca o ícone dele pela mesa (icone-efeito).")
    personagem = _personagem_editavel(session, mesa_id, efeito.personagem_id, ator, "efeitos")

    def aplicar(objeto: str | None) -> int:
        nova = _avancar(session, personagem, versao)
        conteudo = {k: v for k, v in (efeito.conteudo or {}).items() if k != "imagem_ativo"}
        efeito.conteudo = {**conteudo, "imagem_ativo": objeto} if objeto else conteudo
        efeito.versao += 1
        return nova

    return Alvo(f"mesas/{mesa_id}/personagens/{personagem.id}/imagens", aplicar, f"imagem de {efeito.nome}",
                "efeito", personagem)


def _carta_do_narrador(session: Session, mesa_id: str, carta_id: str, ator: Ator) -> CartaDefinicaoRegistro:
    _negar(Autorizador(session).decidir(Acao.GERENCIAR_CARTAS, usuario_id=ator.usuario_id, mesa_id=mesa_id))
    definicao = session.get(CartaDefinicaoRegistro, carta_id)
    if definicao is None or definicao.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carta não encontrada.")
    if corpos.eh_padrao(definicao) or definicao.origem_sistema:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cartas do sistema não recebem imagens.")
    return definicao


def _alvo_carta(session, mesa_id, carta_id, ator, versao, *, icone: bool) -> Alvo:
    definicao = _carta_do_narrador(session, mesa_id, carta_id, ator)
    if icone and definicao.tipo != "item":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail="Só cartas de item têm ícone de grade.")

    def aplicar(objeto: str | None) -> int:
        conteudo = dict((definicao.rascunho or {}).get("conteudo") or {})
        conteudo.pop("tipo", None)
        if icone:
            if not conteudo.get("formato"):
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                    detail="Defina o tipo e a dimensão do item antes do ícone de grade.")
            conteudo["formato"] = {**conteudo["formato"], "icone_grade": objeto}
        else:
            # Uma arte por carta: a nova substitui a anterior, publicada ou não.
            conteudo["ativos"] = []
            conteudo["ativos_privados"] = [objeto] if objeto else []
        try:
            cartas.salvar_rascunho(session, definicao, conteudo, _exigir_versao(versao))
        except cartas.ConflitoRascunho:
            session.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Rascunho alterado por outra edição.") from None
        return definicao.versao

    titulo = str(((definicao.rascunho or {}).get("conteudo") or {}).get("titulo") or "carta")
    return Alvo(cartas.prefixo_enviado(mesa_id).rstrip("/"), aplicar,
                f"{'ícone de grade' if icone else 'arte'} de {titulo}", "carta", visibilidade="narrador")


def _alvo_mapa(session, mesa_id, cena_id, ator) -> Alvo:
    _negar(Autorizador(session).decidir(Acao.ADMINISTRAR_SALA, usuario_id=ator.usuario_id, mesa_id=mesa_id))
    cena = session.get(CenaRegistro, cena_id)
    if cena is None or cena.mesa_id != mesa_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cena não encontrada.")

    def aplicar(objeto: str | None) -> int:
        cena.mapa_objeto = objeto
        versao = sala._avancar_cena(session, cena)
        sala.emitir(session, mesa_id, "sala.atualizada", {"cena_id": cena.id, "cena_versao": versao}, publico=True)
        return versao

    return Alvo(f"mesas/{mesa_id}/mesa/mapas", aplicar, f"mapa de {cena.nome}", "mesa")


def _alvo_icone_efeito(session, mesa_id, associacao, ator) -> Alvo:
    _negar(Autorizador(session).decidir(Acao.APLICAR_EFEITO, usuario_id=ator.usuario_id, mesa_id=mesa_id))
    efeito = next((e for e in catalogos.obter().efeitos_default if e["associacao"] == associacao), None)
    if efeito is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Efeito default não encontrado.")

    def aplicar(objeto: str | None) -> None:
        if objeto:
            icones_efeitos.definir_da_mesa(session, mesa_id, associacao, objeto)
        else:
            icones_efeitos.remover_da_mesa(session, mesa_id, associacao)
        return None

    return Alvo(f"mesas/{mesa_id}/mesa/icones-efeitos", aplicar, f"ícone de {efeito['nome']}", "efeito")


def _alvo_capa(session, mesa_id, alvo, ator) -> Alvo:
    _negar(Autorizador(session).decidir(Acao.EDITAR_CAMPANHA, usuario_id=ator.usuario_id, mesa_id=mesa_id),
           "Mesa não encontrada.")
    if alvo != mesa_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="O alvo da capa é a própria mesa.")
    mesa = session.get(MesaRegistro, mesa_id)
    assert mesa is not None

    def aplicar(objeto: str | None) -> None:
        mesa.capa_objeto = objeto
        return None

    return Alvo(f"mesas/{mesa_id}/mesa/capa", aplicar, "capa da campanha", "mesa", feminino=True)


def _alvo(session: Session, mesa_id: str, destino: str, alvo: str, ator: Ator, versao: int | None) -> Alvo:
    if destino == "capa":
        return _alvo_capa(session, mesa_id, alvo, ator)
    if destino == "retrato":
        return _alvo_retrato(session, mesa_id, alvo, ator, versao)
    if destino == "ilustracao":
        return _alvo_retrato(session, mesa_id, alvo, ator, versao, "ilustracao_ativo", "ilustração", feminino=True)
    if destino == "item":
        return _alvo_item(session, mesa_id, alvo, ator, versao, "imagem_ativo", "arte")
    if destino == "icone-grade":
        tipo, _, identificador = alvo.partition(":")
        if tipo == "carta":
            return _alvo_carta(session, mesa_id, identificador, ator, versao, icone=True)
        if tipo == "item":
            return _alvo_item(session, mesa_id, identificador, ator, versao, "icone_grade", "ícone de grade")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail="Informe o alvo do ícone de grade como item:{id} ou carta:{id}.")
    if destino == "efeito":
        return _alvo_efeito(session, mesa_id, alvo, ator, versao)
    if destino == "carta":
        return _alvo_carta(session, mesa_id, alvo, ator, versao, icone=False)
    if destino == "mapa":
        return _alvo_mapa(session, mesa_id, alvo, ator)
    return _alvo_icone_efeito(session, mesa_id, alvo, ator)


def _auditar(session: Session, mesa_id: str, destino: Alvo, ator: Ator, acao: str, objeto: str | None,
             nome_destino: str, alvo: str, correlacao: str) -> None:
    sujeito = auditoria.nome_personagem(destino.personagem) + ": " if destino.personagem is not None else ""
    auditoria.registrar(
        session, mesa_id=mesa_id, ator_id=ator.usuario_id, categoria=destino.categoria, acao=acao,
        relevancia="organizacional", personagem=destino.personagem, visibilidade=destino.visibilidade,
        resumo=f"{sujeito}{destino.rotulo} {'alterad' if acao == 'imagem.alterada' else 'removid'}"
               f"{'a' if destino.feminino else 'o'}",
        # Só a referência: o conteúdo da imagem nunca entra no evento.
        detalhes={"destino": nome_destino, "alvo": alvo, "objeto": objeto}, correlacao_id=correlacao,
    )


@router.put("/{destino}", response_model=ImagemResposta)
def enviar_imagem(
    mesa_id: str, destino: NomeDestino, request: Request,
    arquivo: UploadFile = File(...), alvo: str = Form(..., min_length=1, max_length=200),
    versao_esperada: int | None = Form(default=None, ge=0),
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ImagemResposta:
    configuracao = imagens.DESTINOS[destino]
    ponto = _alvo(session, mesa_id, destino, alvo, ator, versao_esperada)
    # Lê no máximo um byte além do limite: arquivo grande é recusado sem ser decodificado.
    conteudo = arquivo.file.read(configuracao.limite_mb * imagens.MB + 1)
    try:
        imagem = imagens.validar(conteudo, configuracao)
    except imagens.ImagemRecusada as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro)) from None
    armazenamento = request.app.state.armazenamento_objetos
    if armazenamento is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Armazenamento indisponível.")
    # Imagens de personagem ficam numa subpasta por uso: a mesma imagem pode ser retrato (512 px),
    # ilustração (1536 px) ou item (256 px), e a versão de exibição, derivada do nome, não colide.
    subpasta = f"/{destino}" if ponto.personagem is not None else ""
    objeto = f"{ponto.prefixo}{subpasta}/{imagem.nome}"
    exibicao = None
    try:
        armazenamento.gravar(BUCKET_PRIVADO, objeto, imagem.conteudo, imagem.tipo)
        if configuracao.lado_exibicao:
            exibicao = imagens.caminho_exibicao(objeto)
            armazenamento.gravar(BUCKET_PRIVADO, exibicao, imagens.versao_exibicao(imagem, configuracao.lado_exibicao),
                                 "image/webp")
    except AtivoInvalido as erro:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Falha ao gravar a imagem.") from erro
    versao = ponto.aplicar(objeto)
    _auditar(session, mesa_id, ponto, ator, "imagem.alterada", objeto, destino, alvo, correlacao)
    session.commit()
    return ImagemResposta(destino=destino, alvo=alvo, objeto=objeto, exibicao=exibicao, versao=versao)


@router.delete("/{destino}", response_model=ImagemResposta)
def remover_imagem(
    mesa_id: str, destino: NomeDestino, alvo: str, versao_esperada: int | None = None,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ImagemResposta:
    ponto = _alvo(session, mesa_id, destino, alvo, ator, versao_esperada)
    versao = ponto.aplicar(None)
    _auditar(session, mesa_id, ponto, ator, "imagem.removida", None, destino, alvo, correlacao)
    session.commit()
    return ImagemResposta(destino=destino, alvo=alvo, versao=versao)
