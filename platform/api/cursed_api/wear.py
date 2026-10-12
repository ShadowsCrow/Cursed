"""Exaustão, Estresse e consequências persistentes: prévia, comandos e leitura.

O Narrador aplica ganhos e reduções, encerra o Colapso Mental e administra consequências.
Quem controla o personagem usa o Esforço voluntário. Cada comando grava a ficha e um
evento de auditoria com as mudanças completas, que a correção de eventos sabe desfazer.
"""

from __future__ import annotations

from typing import Any, Literal, Mapping

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from cursed_platform import auditoria, desgaste_ficha
from cursed_platform.authorization import Acao, Autorizador
from cursed_platform.contracts import (
    AlterarDesgasteRequest, ConsequenciaComandoResposta, ConsequenciaResumo, CriarConsequenciaRequest,
    DesgasteComandoResposta, EditarConsequenciaRequest, EncerrarColapsoRequest, EsforcoRequest, OrigemResumo,
    PreviaDesgaste, PreviaDesgasteRequest, PreviaEsforcoRequest, RegistroConsequencia, TransicaoConsequenciaRequest,
    TratamentoResumo,
)
from cursed_platform.domain.ficha import FichaDraft
from cursed_platform.persistence import PersonagemRegistro
from cursed_platform.repositories import FichaRepository

from .auth import Ator, get_actor
from .dependencies import get_correlacao, get_session
from .live_sheet import _exigir_edicao, _personagem, trilhas_resumo


router = APIRouter(prefix="/mesas/{mesa_id}/personagens/{personagem_id}", tags=["Ficha viva"])

ROTULO_TRILHA = {"exaustao": "Exaustão", "estresse": "Estresse"}
ROTULO_CATEGORIA = {"trauma": "Trauma", "ferimento_grave": "Ferimento Grave", "sequela": "Sequela",
                    "aflicao": "Aflição", "outro": "Outra Consequência"}
VERBO_ACAO = {"intensificar": "intensificada", "mitigar": "mitigada", "iniciar_tratamento": "em tratamento",
              "reativar": "reativada", "encerrar": "encerrada", "remover": "removida"}
EVENTO_ACAO = {"intensificar": "intensificada", "mitigar": "mitigada", "iniciar_tratamento": "em_tratamento",
               "reativar": "reativada", "encerrar": "encerrada", "remover": "removida"}


def consequencia_resumo(dados: Mapping[str, Any]) -> ConsequenciaResumo:
    tratamento = dados.get("tratamento") or {}
    origem = dados.get("origem") or {}
    return ConsequenciaResumo(
        id=dados["id"], categoria=dados["categoria"], nome=dados["nome"], descricao=dados.get("descricao", ""),
        origem=OrigemResumo(tipo=origem.get("tipo", "outro"), nome=origem.get("nome", ""), id=origem.get("id")),
        gatilho=dados.get("gatilho", ""), efeito_atual=dados.get("efeito_atual", ""),
        intensidade=dados.get("intensidade", 1),
        tratamento=TratamentoResumo(estado=tratamento.get("estado", "ativo"), progresso=tratamento.get("progresso", 0),
                                    objetivo=tratamento.get("objetivo"), regra=tratamento.get("regra", "")),
        criado_em=dados.get("criado_em"), atualizado_em=dados.get("atualizado_em"),
        historico=[
            RegistroConsequencia(acao=str(item.get("acao", "")), justificativa=item.get("justificativa"),
                                 criado_em=item.get("criado_em"))
            for item in (dados.get("historico") or [])[-20:]
        ],
    )


def _consequencias(ficha: Mapping[str, Any]) -> list[ConsequenciaResumo]:
    return [consequencia_resumo(c) for c in desgaste_ficha.consequencias(ficha)]


def _exigir_narrador(session: Session, mesa_id: str, ator: Ator, mensagem: str) -> None:
    decisao = Autorizador(session).decidir(Acao.APLICAR_EFEITO, usuario_id=ator.usuario_id, mesa_id=mesa_id)
    if not decisao.permitido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if decisao.ocultar_existencia else status.HTTP_403_FORBIDDEN,
            detail="Ficha não encontrada." if decisao.ocultar_existencia else mensagem,
        )


def _invalido(erro: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))


def _gravar(
    session: Session, personagem: PersonagemRegistro, anterior: dict, nova: dict, versao_esperada: int, *,
    ator: Ator, acao: str, resumo: str, detalhes: Mapping[str, Any], correlacao: str,
) -> int:
    if not FichaRepository(session).substituir_se_versao(
        personagem.mesa_id, personagem.id, versao_esperada, nova,
    ):
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Versão da ficha desatualizada.")
    auditoria.registrar(
        session, mesa_id=personagem.mesa_id, ator_id=ator.usuario_id, categoria="ficha", acao=acao,
        relevancia="mecanica", personagem=personagem, alvo_tipo="personagem", alvo_id=personagem.id,
        resumo=resumo[:500], mudancas=auditoria.mudancas(anterior, nova), detalhes=dict(detalhes),
        correlacao_id=correlacao,
    )
    session.commit()
    return versao_esperada + 1


def _ficha(personagem: PersonagemRegistro) -> dict:
    return FichaDraft.de_payload(personagem.ficha).para_payload()


def _descrever_previa(previa: Mapping[str, Any]) -> str:
    rotulo = ROTULO_TRILHA[previa["trilha"]]
    texto = f"{rotulo} {previa['antes']} → {previa['depois']}"
    if previa["mudou_faixa"]:
        texto += f" ({previa['faixa_antes']['nome']} → {previa['faixa_depois']['nome']})"
    return texto


def _descrever_afetadas(afetadas: list[dict[str, str]]) -> str:
    rotulos = {"criado": "nova consequência", "intensificado": "consequência intensificada"}
    return "; ".join(f"{rotulos.get(item['operacao'], item['operacao'])}: {item['nome']}" for item in afetadas)


def _resposta_desgaste(versao: int, ficha: Mapping[str, Any], previa: Mapping[str, Any] | None) -> DesgasteComandoResposta:
    return DesgasteComandoResposta(
        versao=versao, trilhas=trilhas_resumo(dict(ficha)), consequencias=_consequencias(ficha),
        previa=PreviaDesgaste(**previa) if previa is not None else None,
    )


# ------------------------------------------------------------------- desgaste

@router.post("/desgaste/previa", response_model=PreviaDesgaste)
def previsualizar_alteracao(
    mesa_id: str, personagem_id: str, pedido: PreviaDesgasteRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PreviaDesgaste:
    """Faixa, colapso e exigências de uma alteração; nada é gravado."""
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    try:
        return PreviaDesgaste(**desgaste_ficha.previa_alteracao(personagem.ficha, pedido.trilha, pedido.delta))
    except desgaste_ficha.ComandoInvalido as erro:
        raise _invalido(erro) from None


@router.post("/desgaste/alteracoes", response_model=DesgasteComandoResposta, status_code=status.HTTP_201_CREATED)
def alterar_desgaste(
    mesa_id: str, personagem_id: str, pedido: AlterarDesgasteRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> DesgasteComandoResposta:
    """O Narrador soma ou reduz pontos de uma trilha, com origem, e registra o que a regra exige."""
    _exigir_narrador(session, mesa_id, ator, "Somente o Narrador altera Exaustão e Estresse; use o Esforço.")
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    anterior = _ficha(personagem)
    try:
        nova, previa, afetadas = desgaste_ficha.aplicar_alteracao(
            anterior, pedido.trilha, pedido.delta, pedido.origem.model_dump(exclude_none=True),
            colapso_mental=pedido.colapso_mental.para_dominio() if pedido.colapso_mental else None,
            consequencia_excedente=(pedido.consequencia_excedente.para_dominio()
                                    if pedido.consequencia_excedente else None),
        )
    except desgaste_ficha.ComandoInvalido as erro:
        raise _invalido(erro) from None
    justificativa = (pedido.justificativa or "").strip() or None
    partes = [_descrever_previa(previa), pedido.origem.nome.strip()]
    if pedido.colapso_mental:
        partes.append(f"Colapso Mental: {pedido.colapso_mental.manifestacao.strip()}")
    if afetadas:
        partes.append(_descrever_afetadas(afetadas))
    versao = _gravar(
        session, personagem, anterior, nova, pedido.versao_esperada, ator=ator, acao="desgaste.alterado",
        resumo=f"{auditoria.nome_personagem(personagem)}: " + " — ".join(partes)
        + (f" ({justificativa})" if justificativa else ""),
        detalhes={"origem": pedido.origem.model_dump(exclude_none=True), "justificativa": justificativa,
                  "delta": pedido.delta, "consequencias_afetadas": afetadas,
                  "manifestacao": pedido.colapso_mental.manifestacao if pedido.colapso_mental else None},
        correlacao=correlacao,
    )
    return _resposta_desgaste(versao, nova, previa)


@router.post("/desgaste/esforco/previa", response_model=PreviaDesgaste)
def previsualizar_esforco(
    mesa_id: str, personagem_id: str, pedido: PreviaEsforcoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> PreviaDesgaste:
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    try:
        return PreviaDesgaste(**desgaste_ficha.previa_esforco(
            personagem.ficha, pedido.tipo, pedido.pontos, pedido.bonus_movimento))
    except desgaste_ficha.ComandoInvalido as erro:
        raise _invalido(erro) from None


@router.post("/desgaste/esforco", response_model=DesgasteComandoResposta, status_code=status.HTTP_201_CREATED)
def registrar_esforco(
    mesa_id: str, personagem_id: str, pedido: EsforcoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> DesgasteComandoResposta:
    """Custo do Esforço voluntário, aplicado depois de resolvida a ação com o bônus escolhido."""
    personagem = _exigir_edicao(session, mesa_id, personagem_id, ator, "desgaste")
    anterior = _ficha(personagem)
    try:
        nova, previa, afetadas = desgaste_ficha.aplicar_esforco(
            anterior, pedido.tipo, pedido.pontos, pedido.acao, bonus_movimento=pedido.bonus_movimento,
            colapso_mental=pedido.colapso_mental.para_dominio() if pedido.colapso_mental else None,
        )
    except desgaste_ficha.ComandoInvalido as erro:
        raise _invalido(erro) from None
    bonus = [f"+{previa['bonus_teste']} no teste"] if previa["bonus_teste"] else []
    if previa["bonus_movimento"]:
        bonus.append(f"+{previa['bonus_movimento']} m de Movimento")
    rotulo = "Esforço físico" if pedido.tipo == "fisico" else "Esforço mental"
    partes = [f"{rotulo} em {pedido.acao.strip()} ({', '.join(bonus)})", _descrever_previa(previa)]
    if pedido.colapso_mental:
        partes.append(f"Colapso Mental: {pedido.colapso_mental.manifestacao.strip()}")
    if afetadas:
        partes.append(_descrever_afetadas(afetadas))
    versao = _gravar(
        session, personagem, anterior, nova, pedido.versao_esperada, ator=ator, acao="desgaste.esforco",
        resumo=f"{auditoria.nome_personagem(personagem)}: " + " — ".join(partes),
        detalhes={"tipo": pedido.tipo, "pontos": pedido.pontos, "acao": pedido.acao.strip(),
                  "bonus_teste": previa["bonus_teste"], "bonus_movimento": previa["bonus_movimento"],
                  "consequencias_afetadas": afetadas,
                  "manifestacao": pedido.colapso_mental.manifestacao if pedido.colapso_mental else None},
        correlacao=correlacao,
    )
    return _resposta_desgaste(versao, nova, previa)


@router.post("/desgaste/colapso-mental/encerrar", response_model=DesgasteComandoResposta)
def encerrar_colapso_mental(
    mesa_id: str, personagem_id: str, pedido: EncerrarColapsoRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> DesgasteComandoResposta:
    """Auxílio pertinente ou fim do conflito imediato: Estresse volta a 8 e o Trauma permanece."""
    _exigir_narrador(session, mesa_id, ator, "Somente o Narrador encerra o Colapso Mental.")
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    anterior = _ficha(personagem)
    try:
        nova = desgaste_ficha.encerrar_colapso_mental(anterior)
    except desgaste_ficha.ComandoInvalido as erro:
        raise _invalido(erro) from None
    motivo = pedido.motivo.strip()
    versao = _gravar(
        session, personagem, anterior, nova, pedido.versao_esperada, ator=ator, acao="desgaste.colapso_encerrado",
        resumo=f"{auditoria.nome_personagem(personagem)}: fim do Colapso Mental, Estresse 10 → 8 — {motivo}",
        detalhes={"motivo": motivo}, correlacao=correlacao,
    )
    return _resposta_desgaste(versao, nova, None)


# -------------------------------------------------------------- consequências

@router.get("/consequencias", response_model=list[ConsequenciaResumo])
def listar_consequencias(
    mesa_id: str, personagem_id: str, ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
) -> list[ConsequenciaResumo]:
    """Traumas, Ferimentos Graves, Sequelas, Aflições e Outras Consequências, inclusive encerradas."""
    return _consequencias(_personagem(session, mesa_id, personagem_id, ator).ficha or {})


@router.post("/consequencias", response_model=ConsequenciaComandoResposta, status_code=status.HTTP_201_CREATED)
def criar_consequencia(
    mesa_id: str, personagem_id: str, pedido: CriarConsequenciaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ConsequenciaComandoResposta:
    """Cria a consequência; uma equivalente (mesma categoria, nome e origem) é intensificada."""
    _exigir_narrador(session, mesa_id, ator, "Somente o Narrador registra consequências.")
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    anterior = _ficha(personagem)
    try:
        nova, final, operacao = desgaste_ficha.criar_consequencia(
            anterior, pedido.consequencia.para_dominio(), pedido.justificativa)
    except desgaste_ficha.ComandoInvalido as erro:
        raise _invalido(erro) from None
    verbo = "criado(a)" if operacao == "criado" else "intensificado(a)"
    versao = _gravar(
        session, personagem, anterior, nova, pedido.versao_esperada, ator=ator,
        acao="consequencia.criada" if operacao == "criado" else "consequencia.intensificada",
        resumo=(f"{auditoria.nome_personagem(personagem)}: {ROTULO_CATEGORIA[final['categoria']]} "
                f"{final['nome']} {verbo} — {pedido.justificativa.strip()}"),
        detalhes={"consequencia_id": final["id"], "operacao": operacao,
                  "justificativa": pedido.justificativa.strip()},
        correlacao=correlacao,
    )
    return ConsequenciaComandoResposta(versao=versao, consequencias=_consequencias(nova),
                                       consequencia=consequencia_resumo(final))


@router.patch("/consequencias/{consequencia_id}", response_model=ConsequenciaComandoResposta)
def editar_consequencia(
    mesa_id: str, personagem_id: str, consequencia_id: str, pedido: EditarConsequenciaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ConsequenciaComandoResposta:
    _exigir_narrador(session, mesa_id, ator, "Somente o Narrador edita consequências.")
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    anterior = _ficha(personagem)
    campos = {
        chave: (pedido.origem.model_dump(exclude_none=True) if chave == "origem" and pedido.origem else getattr(pedido, chave))
        for chave in pedido.model_fields_set - {"justificativa", "versao_esperada"}
    }
    try:
        nova, final = desgaste_ficha.editar_consequencia(anterior, consequencia_id, campos, pedido.justificativa)
    except LookupError as erro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(erro)) from None
    except desgaste_ficha.ComandoInvalido as erro:
        raise _invalido(erro) from None
    versao = _gravar(
        session, personagem, anterior, nova, pedido.versao_esperada, ator=ator, acao="consequencia.editada",
        resumo=(f"{auditoria.nome_personagem(personagem)}: {ROTULO_CATEGORIA[final['categoria']]} "
                f"{final['nome']} editado(a) — {pedido.justificativa.strip()}"),
        detalhes={"consequencia_id": consequencia_id, "campos": sorted(campos),
                  "justificativa": pedido.justificativa.strip()},
        correlacao=correlacao,
    )
    return ConsequenciaComandoResposta(versao=versao, consequencias=_consequencias(nova),
                                       consequencia=consequencia_resumo(final))


@router.post("/consequencias/{consequencia_id}/{acao}", response_model=ConsequenciaComandoResposta)
def transicionar_consequencia(
    mesa_id: str, personagem_id: str, consequencia_id: str,
    acao: Literal["intensificar", "mitigar", "iniciar_tratamento", "reativar", "encerrar", "remover"],
    pedido: TransicaoConsequenciaRequest,
    ator: Ator = Depends(get_actor), session: Session = Depends(get_session),
    correlacao: str = Depends(get_correlacao),
) -> ConsequenciaComandoResposta:
    _exigir_narrador(session, mesa_id, ator, "Somente o Narrador administra consequências.")
    personagem = _personagem(session, mesa_id, personagem_id, ator)
    anterior = _ficha(personagem)
    atual = next((c for c in desgaste_ficha.consequencias(anterior) if c["id"] == consequencia_id), None)
    try:
        nova, final = desgaste_ficha.transicionar_consequencia(anterior, consequencia_id, acao, pedido.justificativa)
    except LookupError as erro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(erro)) from None
    except desgaste_ficha.ComandoInvalido as erro:
        raise _invalido(erro) from None
    assert atual is not None
    versao = _gravar(
        session, personagem, anterior, nova, pedido.versao_esperada, ator=ator,
        acao=f"consequencia.{EVENTO_ACAO[acao]}",
        resumo=(f"{auditoria.nome_personagem(personagem)}: {ROTULO_CATEGORIA[atual['categoria']]} "
                f"{atual['nome']} {VERBO_ACAO[acao]} — {pedido.justificativa.strip()}"),
        detalhes={"consequencia_id": consequencia_id, "acao": acao, "justificativa": pedido.justificativa.strip()},
        correlacao=correlacao,
    )
    return ConsequenciaComandoResposta(
        versao=versao, consequencias=_consequencias(nova),
        consequencia=consequencia_resumo(final) if final is not None else None,
    )
