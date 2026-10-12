"""Cartas usadas na cena (cartas-na-cena, D3): a mão de cartas, o comando de usar com débito de PP, o registro dos
usos, os alvos e o desfazer do Narrador.

Regras representadas (`Turnos e Ações.md`, `Framework de Criação...md`, `Progressão e Proficiência.md`): usar uma
habilidade ou magia paga o Custo de Uso em PP; uma ativa usa a ação que o Lançamento declara, na própria vez; uma
reação é usada fora da vez com a Reação disponível. O custo das habilidades de classe é especial, escrito no catálogo
(decisão do usuário, 2026-10-06). Só cartas com Custo de Uso em PP definido entram na mão nesta versão: as demais
ficam fora até o usuário decidir (decisão do usuário, 2026-10-06).

Nenhuma função confirma a transação.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import re
from typing import Any, Mapping

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import catalogos, recursos_ficha, sessoes, turno
from cursed_platform.domain import criacao
from cursed_platform.persistence import (
    CamadaCenaRegistro, CartaPersonagemRegistro, CartaVersaoRegistro, CenaRegistro, CombateRegistro,
    ParticipanteCombateRegistro, PersonagemRegistro, TokenRegistro, UsoDeCartaRegistro,
)
from cursed_platform.sala import Leitor, controla_personagem, emitir, token_visivel

EVENTO = "sala.uso"
LIMITE_DA_LISTA = 50
MAXIMO_DE_ALVOS = 12
NATUREZAS = ("habilidade", "magia")
USAVEIS = ("ativa", "reacao")
ROTULOS_ACAO = {"padrao": "Ação Padrão", "bonus": "Ação Bônus", "reacao": "Reação", "nenhuma": "Ação Livre"}


class UsoInvalido(ValueError):
    """A carta não pode ser usada por este personagem (422)."""


class SemPermissao(PermissionError):
    """Quem pede não é o dono do personagem nem o Narrador (403)."""


class ForaDaVez(PermissionError):
    """Carta ativa fora da vez do personagem na disputa (403)."""


class Conflito(ValueError):
    """PP insuficiente, ação gasta ou janela de desfazer fechada (409)."""


# ------------------------------------------------------------------ leitura da carta

def acao_da_carta(conteudo: Mapping[str, Any]) -> tuple[str, bool]:
    """A ação que a carta gasta e se a leitura foi por falta de encaixe (aviso). Reação pela ativação; "Bônus" no
    Lançamento gasta a Ação Bônus; "Livre", nenhuma; o resto, a Ação Padrão."""
    if conteudo.get("ativacao") == "reacao":
        return "reacao", False
    texto = catalogos.chave(conteudo.get("lancamento") or "")
    if not texto:
        return "padrao", False
    if "bonus" in texto:
        return "bonus", False
    if "livre" in texto:
        return "nenhuma", False
    encaixa = re.search(r"\b(acao|instantaneo|imediato)\b", texto) is not None
    return "padrao", not encaixa


def custo_em_pp(tipo: str, conteudo: Mapping[str, Any]) -> int | None:
    """O Custo de Uso efetivo da carta: o registrado, senão o do Framework pela Potência; nada sem os dois."""
    if tipo not in NATUREZAS:
        return None
    calculados = criacao.calcular(catalogos.obter().framework, tipo, conteudo)
    return criacao.custo_uso_efetivo(conteudo, calculados)


def custo_extra(conteudo: Mapping[str, Any]) -> str | None:
    """A parte do custo escrito que não é PP ("1 de Exaustão"), só para aviso."""
    return catalogos.custo_extra(conteudo.get("custo_legado"))


# ------------------------------------------------------------------ mão de cartas

@dataclass
class CartaDaMao:
    posse_id: str
    versao_id: str
    tipo: str
    titulo: str
    ativacao: str
    custo_uso: int
    custo_extra: str | None
    acao: str
    aviso_lancamento: bool
    lancamento: str | None
    alvo_area: str | None
    texto: str
    ativos: list[str]
    motivo_indisponivel: str | None = None


def _posses_aprendidas(session: Session, mesa_id: str, personagem_id: str) -> list[tuple[CartaPersonagemRegistro, CartaVersaoRegistro]]:
    linhas = session.execute(
        select(CartaPersonagemRegistro, CartaVersaoRegistro)
        .join(CartaVersaoRegistro, CartaVersaoRegistro.id == CartaPersonagemRegistro.versao_id)
        .where(CartaPersonagemRegistro.mesa_id == mesa_id, CartaPersonagemRegistro.personagem_id == personagem_id,
               CartaPersonagemRegistro.estado == "aprendida", CartaPersonagemRegistro.tipo.in_(NATUREZAS))
        .order_by(CartaPersonagemRegistro.adquirida_em, CartaPersonagemRegistro.id)
    ).all()
    return [(posse, versao) for posse, versao in linhas]


def _carta(posse: CartaPersonagemRegistro, versao: CartaVersaoRegistro) -> CartaDaMao | None:
    """A carta como entra na mão, ou nada quando ela não é jogável nesta versão (passiva ou sem custo em PP)."""
    conteudo = versao.conteudo or {}
    ativacao = conteudo.get("ativacao")
    if ativacao not in USAVEIS:
        return None
    custo = custo_em_pp(versao.tipo, conteudo)
    if custo is None:
        return None
    acao, aviso = acao_da_carta(conteudo)
    return CartaDaMao(
        posse_id=posse.id, versao_id=versao.id, tipo=versao.tipo, titulo=conteudo.get("titulo") or "Carta",
        ativacao=ativacao, custo_uso=custo, custo_extra=custo_extra(conteudo), acao=acao, aviso_lancamento=aviso,
        lancamento=conteudo.get("lancamento"), alvo_area=conteudo.get("alvo_area"), texto=conteudo.get("texto") or "",
        ativos=list(conteudo.get("ativos") or []),
    )


def _motivo(carta: CartaDaMao, pp: int | None, combate: CombateRegistro | None,
            participante: ParticipanteCombateRegistro | None, na_vez: bool) -> str | None:
    """Por que a carta está apagada agora, na ordem em que o jogador precisa saber. `na_vez`: o participante é o da
    vez e quem olha o controla (o controle é por token: liberar o "Lagarto-macaco 2" não dá a vez do 1)."""
    if combate is not None and combate.estado == "combate":
        if participante is None:
            return "O personagem não participa da disputa."
        if carta.ativacao == "ativa" and not na_vez:
            return "Não é a vez deste personagem."
        if carta.acao != "nenhuma" and not turno.acoes_de(participante)[carta.acao]:
            return f"{ROTULOS_ACAO[carta.acao]} já usada nesta vez."
    elif combate is not None:
        return "A disputa ainda não começou."
    if pp is None:
        return "A ficha não tem PP calculável."
    if pp < carta.custo_uso:
        return f"Faltam {carta.custo_uso - pp} PP."
    return None


def _na_vez(session: Session, combate: CombateRegistro | None, leitor: Leitor,
            participante: ParticipanteCombateRegistro | None) -> bool:
    return (combate is not None and participante is not None and participante.id == combate.vez_participante_id
            and turno.controla_participante(session, combate, leitor, participante))


def mao(session: Session, mesa_id: str, leitor: Leitor, personagem: PersonagemRegistro) -> list[CartaDaMao]:
    """As cartas jogáveis do personagem, com o motivo de indisponibilidade já calculado pelo servidor."""
    combate = turno.aberto(session, mesa_id)
    participante = turno.participante_do_personagem(session, combate, personagem.id, leitor) if combate else None
    na_vez = _na_vez(session, combate, leitor, participante)
    pp = recursos_ficha.atual(personagem.ficha or {}, "pp")
    cartas = []
    for posse, versao in _posses_aprendidas(session, mesa_id, personagem.id):
        carta = _carta(posse, versao)
        if carta is None:
            continue
        carta.motivo_indisponivel = _motivo(carta, pp, combate, participante, na_vez)
        cartas.append(carta)
    return cartas


# ------------------------------------------------------------------ alvos

def _cena_ativa(session: Session, mesa_id: str) -> CenaRegistro | None:
    return session.scalar(select(CenaRegistro).where(CenaRegistro.mesa_id == mesa_id, CenaRegistro.ativa.is_(True)))


def _alvos(session: Session, mesa_id: str, leitor: Leitor, token_ids: list[str]) -> list[dict[str, Any]]:
    """Tokens da cena ativa que o leitor vê; cada um vira {token_id, personagem_id, rotulo}. Sem validar alcance."""
    if len(token_ids) > MAXIMO_DE_ALVOS:
        raise UsoInvalido(f"Marque até {MAXIMO_DE_ALVOS} alvos.")
    cena = _cena_ativa(session, mesa_id)
    alvos: list[dict[str, Any]] = []
    for token_id in dict.fromkeys(token_ids):
        token = session.get(TokenRegistro, token_id)
        if token is None or token.mesa_id != mesa_id or cena is None or token.cena_id != cena.id:
            raise UsoInvalido("Alvo fora da cena ativa.")
        camada = session.get(CamadaCenaRegistro, token.camada_id)
        personagem = session.get(PersonagemRegistro, token.personagem_id) if token.personagem_id else None
        if not leitor.narrador and not (camada is not None and token_visivel(token, camada, personagem)):
            raise UsoInvalido("Alvo fora da cena ativa.")
        alvos.append({"token_id": token.id, "personagem_id": token.personagem_id, "rotulo": token.rotulo})
    return alvos


# ------------------------------------------------------------------ usar

def _pode_agir(session: Session, leitor: Leitor, personagem: PersonagemRegistro) -> None:
    if not controla_personagem(session, leitor, personagem):
        raise SemPermissao("Só quem controla o personagem, ou o Narrador, usa as cartas dele.")


def usar(session: Session, mesa_id: str, leitor: Leitor, personagem: PersonagemRegistro, versao_id: str,
         token_ids: list[str], *, correlacao_id: str | None = None) -> UsoDeCartaRegistro:
    """Valida, debita o PP, gasta a ação do turno e grava o uso (requisito "Usar carta")."""
    _pode_agir(session, leitor, personagem)
    par = next(((p, v) for p, v in _posses_aprendidas(session, mesa_id, personagem.id) if v.id == versao_id), None)
    if par is None:
        raise UsoInvalido("O personagem não tem esta carta aprendida.")
    posse, versao = par
    carta = _carta(posse, versao)
    if carta is None:
        conteudo = versao.conteudo or {}
        if conteudo.get("ativacao") not in USAVEIS:
            raise UsoInvalido("Esta carta não é ativa nem de reação.")
        raise UsoInvalido("Esta carta ainda não tem custo em PP definido.")
    alvos = _alvos(session, mesa_id, leitor, token_ids)

    combate = turno.aberto(session, mesa_id)
    participante = None
    if combate is not None:
        if combate.estado != "combate":
            raise Conflito("A disputa ainda não começou.")
        participante = turno.participante_do_personagem(session, combate, personagem.id, leitor)
        if participante is None:
            raise UsoInvalido("O personagem não participa da disputa.")
        if carta.ativacao == "ativa" and not _na_vez(session, combate, leitor, participante):
            raise ForaDaVez("Não é a vez deste personagem.")
    pp = recursos_ficha.atual(personagem.ficha or {}, "pp")
    if pp is None:
        raise UsoInvalido("A ficha não tem PP calculável.")
    if pp < carta.custo_uso:
        raise Conflito(f"Faltam {carta.custo_uso - pp} PP.")
    if participante is not None:
        try:
            turno.gastar_acao(session, participante, carta.acao)
        except turno.AcaoGasta as erro:
            raise Conflito(str(erro)) from None
    if carta.custo_uso:
        recursos_ficha.alterar_atual(
            session, personagem, "pp", -carta.custo_uso, ator_id=leitor.usuario_id, acao="carta.pp_gasto",
            origem=f"Uso de {carta.titulo}", correlacao_id=correlacao_id, detalhes={"versao_id": versao.id},
        )
    uso = UsoDeCartaRegistro(
        mesa_id=mesa_id, autor_id=leitor.usuario_id, personagem_id=personagem.id,
        sessao_id=sessoes.ativa(session, mesa_id), combate_id=combate.id if combate else None,
        rodada=combate.rodada if combate else None, versao_id=versao.id, titulo=carta.titulo,
        custo_pago=carta.custo_uso, custo_extra=carta.custo_extra, acao=carta.acao, alvos=alvos,
    )
    session.add(uso)
    session.flush()
    if participante is not None:
        emitir(session, mesa_id, turno.EVENTO, {}, publico=True)
    emitir(session, mesa_id, EVENTO, {"id": uso.id}, publico=not oculto(session, personagem))
    return uso


def oculto(session: Session, personagem: PersonagemRegistro) -> bool:
    """O personagem está oculto dos jogadores quando nenhum token dele na cena ativa é visível."""
    cena = _cena_ativa(session, personagem.mesa_id)
    if cena is None:
        return personagem.proprietario_id is None
    tokens = list(session.scalars(select(TokenRegistro).where(TokenRegistro.cena_id == cena.id,
                                                              TokenRegistro.personagem_id == personagem.id)))
    for token in tokens:
        camada = session.get(CamadaCenaRegistro, token.camada_id)
        if camada is not None and token_visivel(token, camada, personagem):
            return False
    return True


# ------------------------------------------------------------------ desfazer

def ultimo_uso(session: Session, mesa_id: str, personagem_id: str) -> UsoDeCartaRegistro | None:
    return session.scalar(select(UsoDeCartaRegistro)
                          .where(UsoDeCartaRegistro.mesa_id == mesa_id, UsoDeCartaRegistro.personagem_id == personagem_id,
                                 UsoDeCartaRegistro.desfeito_em.is_(None))
                          .order_by(UsoDeCartaRegistro.id.desc()))


def desfazer(session: Session, mesa_id: str, leitor: Leitor, uso: UsoDeCartaRegistro, *,
             correlacao_id: str | None = None) -> UsoDeCartaRegistro:
    """Só o Narrador, só o último uso do personagem, e só na mesma rodada da disputa. Devolve PP e ação."""
    if not leitor.narrador:
        raise SemPermissao("Só o Narrador desfaz um uso.")
    if uso.mesa_id != mesa_id or uso.desfeito_em is not None:
        raise Conflito("Este uso já foi desfeito.")
    ultimo = ultimo_uso(session, mesa_id, uso.personagem_id)
    if ultimo is None or ultimo.id != uso.id:
        raise Conflito("Só o último uso do personagem pode ser desfeito.")
    personagem = session.get(PersonagemRegistro, uso.personagem_id)
    if personagem is None:
        raise Conflito("O personagem não existe mais.")
    combate = turno.aberto(session, mesa_id)
    if uso.combate_id is not None:
        if combate is None or combate.id != uso.combate_id or combate.rodada != uso.rodada:
            raise Conflito("A rodada já avançou: este uso não pode mais ser desfeito.")
        participante = turno.participante_do_personagem(session, combate, uso.personagem_id)
        if participante is not None:
            turno.devolver_acao(session, participante, uso.acao)
    if uso.custo_pago:
        recursos_ficha.alterar_atual(
            session, personagem, "pp", uso.custo_pago, ator_id=leitor.usuario_id, acao="carta.pp_devolvido",
            origem=f"Uso desfeito de {uso.titulo}", correlacao_id=correlacao_id, detalhes={"uso_id": uso.id},
        )
    uso.desfeito_em, uso.desfeito_por = datetime.now(UTC), leitor.usuario_id
    session.flush()
    if uso.combate_id is not None:
        emitir(session, mesa_id, turno.EVENTO, {}, publico=True)
    emitir(session, mesa_id, EVENTO, {"id": uso.id}, publico=not oculto(session, personagem))
    return uso


# ------------------------------------------------------------------ leitura

def listar(session: Session, mesa_id: str, leitor: Leitor, depois: int | None = None,
           limite: int = LIMITE_DA_LISTA) -> list[UsoDeCartaRegistro]:
    """Os usos da mesa depois do id dado, em ordem, até `limite`. O jogador não recebe usos de personagem oculto."""
    consulta = select(UsoDeCartaRegistro).where(UsoDeCartaRegistro.mesa_id == mesa_id)
    if depois is not None:
        consulta = consulta.where(UsoDeCartaRegistro.id > depois)
    recentes = list(session.scalars(consulta.order_by(UsoDeCartaRegistro.id.desc()).limit(limite)))
    if not leitor.narrador:
        ocultos: dict[str, bool] = {}
        filtrados = []
        for uso in recentes:
            if uso.personagem_id not in ocultos:
                personagem = session.get(PersonagemRegistro, uso.personagem_id)
                controla = controla_personagem(session, leitor, personagem)
                ocultos[uso.personagem_id] = not controla and (personagem is None or oculto(session, personagem))
            if not ocultos[uso.personagem_id]:
                filtrados.append(uso)
        recentes = filtrados
    return list(reversed(recentes))


def para_resposta(session: Session, uso: UsoDeCartaRegistro) -> dict[str, Any]:
    personagem = session.get(PersonagemRegistro, uso.personagem_id)
    nome = ((personagem.ficha or {}).get("personagem") or {}).get("nome") if personagem else None
    return {
        "id": uso.id, "autor_id": uso.autor_id, "personagem_id": uso.personagem_id, "personagem_nome": nome or "Personagem",
        "sessao_id": uso.sessao_id, "combate_id": uso.combate_id, "rodada": uso.rodada, "versao_id": uso.versao_id,
        "titulo": uso.titulo, "custo_pago": uso.custo_pago, "custo_extra": uso.custo_extra, "acao": uso.acao,
        "alvos": uso.alvos or [], "desfeito": uso.desfeito_em is not None, "criado_em": uso.criado_em,
    }
