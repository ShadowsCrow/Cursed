"""Modo turno da Sala (modo-de-turno): Rodadas, Turnos e Iniciativa de uma Cena de Disputa.

Regras (`Iniciativa, Movimento e Posicionamento.md`): iniciativa `1d20 + Raciocínio + Prontidão`; empate desfeito pelo
maior Raciocínio, depois pela maior Prontidão e, por fim, por nova rolagem só entre os ainda empatados; uma rolagem
para um grupo de criaturas idênticas (aqui, os tokens de uma mesma ficha); a ordem fica a mesma até o fim.

- **Participantes:** os personagens com token na cena ativa ao entrar, um por ficha (os tokens da mesma ficha formam
  um grupo); tokens sem personagem ficam de fora. Com o modo turno aberto, o token posto de uma ficha nova entra como
  grupo; o de uma ficha que já participa vira participante sozinho, com iniciativa e vez próprias (D8c, D8d).
- **Ordem calculada (D1):** `(rolou, total, raciocínio, prontidão, *desempate)`, decrescente; quem falta rolar fica no
  fim. A vez aponta para um participante, não para uma posição.
- **Desempate (D2):** d20 sorteados pelo servidor, guardados por nível; só os ainda empatados rolam, e um desempate
  resolvido não é refeito.

Nenhuma função confirma a transação.
"""

from __future__ import annotations

from datetime import UTC, datetime
import secrets
from typing import Any, Callable, Iterable
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import sessoes
from cursed_platform.persistence import (
    CamadaCenaRegistro, CenaRegistro, CombateRegistro, ParticipanteCombateRegistro, PersonagemRegistro, TokenRegistro,
)
from cursed_platform.sala import Leitor, emitir, ficha_oculta, token_visivel

EVENTO = "sala.turno"


class TurnoInvalido(ValueError):
    """Pedido fora das condições do modo turno (422)."""


class ConflitoTurno(ValueError):
    """A fase do modo turno não permite o pedido (409)."""


class ForaDaVez(PermissionError):
    """O jogador tenta mover ou correr fora da vez do próprio personagem (403)."""


class SemDeslocamento(ValueError):
    """O movimento passa do saldo do turno (422)."""


FORA_DA_VEZ_NARRADOR = "Fora da vez: ligue o Movimento livre para mover."

# Deslocamento calculado da ficha de um personagem, em metros (D7); vem de quem chama, que tem o caminho da ficha.
Deslocamento = Callable[[str], int]


def _d20() -> int:
    return secrets.randbelow(20) + 1


def aberto(session: Session, mesa_id: str) -> CombateRegistro | None:
    return session.scalar(select(CombateRegistro).where(
        CombateRegistro.mesa_id == mesa_id, CombateRegistro.estado != "encerrado"))


def participantes(session: Session, combate: CombateRegistro) -> list[ParticipanteCombateRegistro]:
    return list(session.scalars(select(ParticipanteCombateRegistro)
                                .where(ParticipanteCombateRegistro.combate_id == combate.id)
                                .order_by(ParticipanteCombateRegistro.id)))


def _tokens_por_personagem(session: Session, cena_id: str) -> dict[str, list[TokenRegistro]]:
    por: dict[str, list[TokenRegistro]] = {}
    for token in session.scalars(select(TokenRegistro).where(TokenRegistro.cena_id == cena_id,
                                                             TokenRegistro.personagem_id.is_not(None))
                                 .order_by(TokenRegistro.id)):
        por.setdefault(token.personagem_id, []).append(token)
    return por


def tokens_dos_participantes(session: Session, combate: CombateRegistro,
                             lista: list[ParticipanteCombateRegistro] | None = None) -> dict[str, list[TokenRegistro]]:
    """Tokens na cena de cada participante: o de token próprio fica só com o dele; o grupo, com os demais da ficha."""
    lista = participantes(session, combate) if lista is None else lista
    por_personagem = _tokens_por_personagem(session, combate.cena_id)
    proprios = {p.token_id for p in lista if p.token_id}
    return {p.id: [t for t in por_personagem.get(p.personagem_id, [])
                   if (t.id == p.token_id if p.token_id else t.id not in proprios)] for p in lista}


# ------------------------------------------------------------------ entrar

def entrar(session: Session, mesa_id: str, autor_id: str) -> CombateRegistro:
    """Abre o modo turno na fase de iniciativa, com os personagens que têm token na cena ativa."""
    if aberto(session, mesa_id) is not None:
        raise ConflitoTurno("O modo turno já está aberto.")
    sessao_id = sessoes.ativa(session, mesa_id)
    if sessao_id is None:
        raise TurnoInvalido("Inicie uma sessão antes de entrar em modo turno.")
    cena = session.scalar(select(CenaRegistro).where(CenaRegistro.mesa_id == mesa_id, CenaRegistro.ativa.is_(True)))
    if cena is None:
        raise TurnoInvalido("Não há cena ativa.")
    personagens = [pid for pid in _tokens_por_personagem(session, cena.id)
                   if (p := session.get(PersonagemRegistro, pid)) is not None and p.excluido_em is None]
    if not personagens:
        raise TurnoInvalido("A cena ativa não tem nenhum personagem com token.")
    combate = CombateRegistro(id=uuid4().hex, mesa_id=mesa_id, sessao_id=sessao_id, cena_id=cena.id, estado="iniciativa",
                              rodada=0, aberto_em=datetime.now(UTC), aberto_por=autor_id)
    session.add(combate)
    session.flush()
    session.add_all([ParticipanteCombateRegistro(id=uuid4().hex, combate_id=combate.id, personagem_id=pid, desempate=[])
                     for pid in personagens])
    session.flush()
    emitir(session, mesa_id, EVENTO, {}, publico=True)
    return combate


# ------------------------------------------------------------------ ordem e desempate

def chave_de_ordem(participante: ParticipanteCombateRegistro) -> tuple:
    """Maior primeiro: quem rolou antes de quem falta; depois total, Raciocínio, Prontidão e os d20 de desempate."""
    rolou = participante.total is not None
    return (rolou, participante.total or 0, participante.raciocinio or 0, participante.prontidao or 0,
            *(participante.desempate or []))


def ordenar(lista: Iterable[ParticipanteCombateRegistro]) -> list[ParticipanteCombateRegistro]:
    return sorted(lista, key=lambda p: (chave_de_ordem(p), p.id), reverse=True)


def desempatar(lista: Iterable[ParticipanteCombateRegistro], sortear: Callable[[], int] = _d20) -> None:
    """Rola d20 de desempate só para os ainda empatados, nível a nível, até não haver empate. Altera `desempate`."""
    grupos: dict[tuple[int, int, int], list[ParticipanteCombateRegistro]] = {}
    for p in lista:
        if p.total is not None:
            grupos.setdefault((p.total, p.raciocinio or 0, p.prontidao or 0), []).append(p)

    def resolver(empatados: list[ParticipanteCombateRegistro], nivel: int) -> None:
        if len(empatados) < 2:
            return
        for p in empatados:
            valores = list(p.desempate or [])
            if len(valores) <= nivel:
                valores.append(sortear())
                p.desempate = valores
        por_valor: dict[int, list[ParticipanteCombateRegistro]] = {}
        for p in empatados:
            por_valor.setdefault(p.desempate[nivel], []).append(p)
        for subgrupo in por_valor.values():
            resolver(subgrupo, nivel + 1)

    for empatados in grupos.values():
        resolver(empatados, 0)


def registrar_iniciativa(session: Session, combate: CombateRegistro, participante: ParticipanteCombateRegistro, *,
                         rolagem_id: int, total: int, raciocinio: int, prontidao: int,
                         sortear: Callable[[], int] = _d20) -> None:
    if combate.estado == "encerrado":
        raise ConflitoTurno("O modo turno já terminou.")
    if participante.total is not None:
        raise ConflitoTurno("Este participante já rolou a iniciativa.")
    participante.rolagem_id, participante.total = rolagem_id, total
    participante.raciocinio, participante.prontidao = raciocinio, prontidao
    desempatar(participantes(session, combate), sortear)
    session.flush()
    emitir(session, combate.mesa_id, EVENTO, {}, publico=True)


# ------------------------------------------------------------------ vez e rodadas

def _na_cena(session: Session, combate: CombateRegistro) -> set[str]:
    """Ids dos participantes com algum token na cena."""
    return {pid for pid, tokens in tokens_dos_participantes(session, combate).items() if tokens}


def _elegivel(p: ParticipanteCombateRegistro, na_cena: set[str]) -> bool:
    return p.total is not None and p.id in na_cena


def comecar(session: Session, combate: CombateRegistro) -> CombateRegistro:
    if combate.estado != "iniciativa":
        raise ConflitoTurno("A disputa já começou.")
    na_cena = _na_cena(session, combate)
    elegiveis = [p for p in ordenar(participantes(session, combate)) if _elegivel(p, na_cena)]
    if not elegiveis:
        raise TurnoInvalido("Ninguém na cena rolou a iniciativa ainda.")
    combate.estado, combate.rodada, combate.vez_participante_id = "combate", 1, elegiveis[0].id
    _receber_a_vez(elegiveis[0])
    session.flush()
    emitir(session, combate.mesa_id, EVENTO, {}, publico=True)
    return combate


def pendentes(session: Session, combate: CombateRegistro) -> list[ParticipanteCombateRegistro]:
    """Participantes na cena ainda sem iniciativa, na ordem: travam o Próximo turno (D8c)."""
    na_cena = _na_cena(session, combate)
    return [p for p in ordenar(participantes(session, combate)) if p.total is None and p.id in na_cena]


def proximo(session: Session, combate: CombateRegistro) -> ParticipanteCombateRegistro:
    """Passa a vez ao próximo da ordem, pulando quem saiu da cena; depois do último, nova rodada. Enquanto alguém na
    cena estiver sem iniciativa, recusa (decisão do usuário, 2026-10-05)."""
    if combate.estado != "combate":
        raise ConflitoTurno("A disputa ainda não começou.")
    faltam = pendentes(session, combate)
    if faltam:
        nomes = ", ".join(nome_do_participante(session, combate, p) for p in faltam)
        raise ConflitoTurno(f"Falta rolar a iniciativa de {nomes}.")
    ordem = ordenar(participantes(session, combate))
    na_cena = _na_cena(session, combate)
    if not any(_elegivel(p, na_cena) for p in ordem):
        raise TurnoInvalido("Não há ninguém na cena para ter a vez.")
    atual = next((i for i, p in enumerate(ordem) if p.id == combate.vez_participante_id), -1)
    indice = atual
    while True:
        indice += 1
        if indice >= len(ordem):
            indice = 0
            combate.rodada += 1
        if _elegivel(ordem[indice], na_cena):
            break
    combate.vez_participante_id = ordem[indice].id
    _receber_a_vez(ordem[indice])
    session.flush()
    emitir(session, combate.mesa_id, EVENTO, {}, publico=True)
    return ordem[indice]


def _grupo(session: Session, combate: CombateRegistro, personagem_id: str) -> ParticipanteCombateRegistro | None:
    return session.scalar(select(ParticipanteCombateRegistro).where(
        ParticipanteCombateRegistro.combate_id == combate.id, ParticipanteCombateRegistro.personagem_id == personagem_id,
        ParticipanteCombateRegistro.token_id.is_(None)))


def incluir(session: Session, mesa_id: str, token: TokenRegistro) -> ParticipanteCombateRegistro | None:
    """Token novo na cena do modo turno aberto, já gravado, entra sem iniciativa (D8c, D8d; decisões do usuário de
    2026-10-05):
    - de uma ficha que ainda não participa, entra como o grupo da ficha;
    - de uma ficha cujo grupo ainda tem token na cena, vira participante sozinho, com iniciativa e vez próprias;
    - de uma ficha cujo grupo saiu da cena, volta ao grupo e mantém a iniciativa dele."""
    combate = aberto(session, mesa_id)
    if combate is None or token.personagem_id is None or token.cena_id != combate.cena_id:
        return None
    personagem = session.get(PersonagemRegistro, token.personagem_id)
    if personagem is None or personagem.excluido_em is not None:
        return None
    grupo = _grupo(session, combate, token.personagem_id)
    if grupo is not None:
        outros = [t for t in tokens_dos_participantes(session, combate)[grupo.id] if t.id != token.id]
        if not outros:
            return None
    participante = ParticipanteCombateRegistro(id=uuid4().hex, combate_id=combate.id, personagem_id=token.personagem_id,
                                               token_id=token.id if grupo is not None else None, desempate=[])
    session.add(participante)
    session.flush()
    emitir(session, mesa_id, EVENTO, {}, publico=True)
    return participante


def _receber_a_vez(participante: ParticipanteCombateRegistro) -> None:
    """O saldo de movimento volta ao inteiro no começo de cada vez (D8)."""
    participante.movimento_gasto, participante.correndo = 0, False


# ------------------------------------------------------------------ movimento (D8, D9)

def custo(de_x: int, de_y: int, x: int, y: int) -> int:
    """Metros de um movimento no grid: cada casa vale 1 m, inclusive na diagonal (regra decidida em 2026-10-04)."""
    return max(abs(x - de_x), abs(y - de_y))


def limite(deslocamento: int, correndo: bool) -> int:
    return max(0, deslocamento) * (2 if correndo else 1)


def _participante_do_token(session: Session, combate: CombateRegistro,
                           token: TokenRegistro) -> ParticipanteCombateRegistro | None:
    if token.personagem_id is None or token.cena_id != combate.cena_id:
        return None
    proprio = session.scalar(select(ParticipanteCombateRegistro).where(
        ParticipanteCombateRegistro.combate_id == combate.id, ParticipanteCombateRegistro.token_id == token.id))
    return proprio or _grupo(session, combate, token.personagem_id)


def checar_movimento(session: Session, mesa_id: str, token: TokenRegistro, leitor: Leitor, x: int, y: int,
                     deslocamento: Deslocamento, *, livre: bool = False) -> tuple[ParticipanteCombateRegistro, int] | None:
    """Antes de mover, no modo turno (D8):
    - o jogador só move o próprio personagem na vez dele, até o saldo;
    - o Narrador, ao mover quem está na vez, também gasta o saldo, salvo com `livre` (empurrão, queda, teleporte ou
      correção) (decisão do usuário, 2026-10-04); fora da vez, só move com `livre`, para não mover a peça errada sem
      querer (decisão do usuário, 2026-10-05).
    Devolve o participante e o custo a cobrar depois do movimento, ou nada quando o movimento não gasta saldo."""
    if livre and not leitor.narrador:
        raise ForaDaVez("Só o Narrador faz movimento livre.")
    combate = aberto(session, mesa_id)
    if combate is None:
        return None
    participante = _participante_do_token(session, combate, token)
    if participante is None:
        return None
    if leitor.narrador:
        if livre:
            return None
        if combate.estado != "combate" or participante.id != combate.vez_participante_id:
            raise ForaDaVez(FORA_DA_VEZ_NARRADOR)
        return participante, _dentro_do_saldo(participante, token, x, y, deslocamento)
    if combate.estado != "combate":
        raise ForaDaVez("A disputa ainda não começou: espere a sua vez.")
    personagem = session.get(PersonagemRegistro, participante.personagem_id)
    if participante.id != combate.vez_participante_id or personagem is None or personagem.proprietario_id != leitor.usuario_id:
        raise ForaDaVez("Não é a sua vez.")
    return participante, _dentro_do_saldo(participante, token, x, y, deslocamento)


def _dentro_do_saldo(participante: ParticipanteCombateRegistro, token: TokenRegistro, x: int, y: int,
                     deslocamento: Deslocamento) -> int:
    gasto = custo(token.x, token.y, x, y)
    teto = limite(deslocamento(participante.personagem_id), participante.correndo)
    if participante.movimento_gasto + gasto > teto:
        falta = max(0, teto - participante.movimento_gasto)
        raise SemDeslocamento(f"Faltam {falta} m de Deslocamento; o movimento custa {gasto} m.")
    return gasto


def cobrar(session: Session, combate_mesa_id: str, participante: ParticipanteCombateRegistro, gasto: int) -> None:
    participante.movimento_gasto += gasto
    session.flush()
    emitir(session, combate_mesa_id, EVENTO, {}, publico=True)


def correr(session: Session, mesa_id: str, leitor: Leitor) -> ParticipanteCombateRegistro:
    """Correr (D9): troca a Ação Padrão por outro movimento; o saldo da vez dobra até o fim dela."""
    combate = aberto(session, mesa_id)
    if combate is None or combate.estado != "combate":
        raise ConflitoTurno("Só dá para Correr durante a disputa.")
    participante = session.get(ParticipanteCombateRegistro, combate.vez_participante_id) if combate.vez_participante_id else None
    if participante is None:
        raise ConflitoTurno("Ninguém está na vez.")
    personagem = session.get(PersonagemRegistro, participante.personagem_id)
    if not leitor.narrador and (personagem is None or personagem.proprietario_id != leitor.usuario_id):
        raise ForaDaVez("Não é a sua vez.")
    if not participante.correndo:
        participante.correndo = True
        session.flush()
        emitir(session, mesa_id, EVENTO, {}, publico=True)
    return participante


def encerrar(session: Session, combate: CombateRegistro) -> CombateRegistro:
    if combate.estado == "encerrado":
        raise ConflitoTurno("O modo turno já terminou.")
    combate.estado, combate.encerrado_em = "encerrado", datetime.now(UTC)
    session.flush()
    emitir(session, combate.mesa_id, EVENTO, {}, publico=True)
    return combate


def encerrar_aberto(session: Session, mesa_id: str) -> CombateRegistro | None:
    """Encerra o modo turno aberto da mesa, se houver (ao encerrar a sessão)."""
    combate = aberto(session, mesa_id)
    return encerrar(session, combate) if combate is not None else None


# ------------------------------------------------------------------ leitura

def _nome_base(session: Session, participante: ParticipanteCombateRegistro, tokens: list[TokenRegistro]) -> str:
    """Nome do primeiro token do participante na cena (o que a mesa vê), ou o da ficha."""
    if tokens:
        return tokens[0].rotulo
    personagem = session.get(PersonagemRegistro, participante.personagem_id)
    nome = ((personagem.ficha or {}).get("personagem") or {}).get("nome") if personagem else None
    return nome or "Personagem"


def _numerar(itens: list[tuple[ParticipanteCombateRegistro, str]]) -> dict[str, str]:
    """Nomes repetidos ganham número: o grupo fica com o nome puro e os tokens próprios viram "Goblin 2", "Goblin 3"
    (na ordem dos tokens, que não muda com as rolagens)."""
    nomes: dict[str, str] = {}
    por_nome: dict[str, list[ParticipanteCombateRegistro]] = {}
    for participante, nome in itens:
        por_nome.setdefault(nome, []).append(participante)
    for nome, iguais in por_nome.items():
        iguais.sort(key=lambda p: (p.token_id is not None, p.token_id or "", p.id))
        for posicao, participante in enumerate(iguais, start=1):
            nomes[participante.id] = nome if len(iguais) == 1 or posicao == 1 else f"{nome} {posicao}"
    return nomes


def nome_do_participante(session: Session, combate: CombateRegistro, participante: ParticipanteCombateRegistro) -> str:
    lista = participantes(session, combate)
    tokens = tokens_dos_participantes(session, combate, lista)
    return _numerar([(p, _nome_base(session, p, tokens[p.id])) for p in lista])[participante.id]


def estado(session: Session, mesa_id: str, leitor: Leitor, deslocamento: Deslocamento | None = None) -> dict[str, Any]:
    """O modo turno aberto como o leitor pode vê-lo (D5): o jogador não vê quem não tem token visível nem o total
    de NPCs e monstros; o nome é o do token que ele vê. O saldo de movimento da vez (D8) vai só ao Narrador e ao dono."""
    combate = aberto(session, mesa_id)
    if combate is None:
        return {"combate": None}
    todos = ordenar(participantes(session, combate))
    tokens = tokens_dos_participantes(session, combate, todos)
    camadas: dict[str, CamadaCenaRegistro | None] = {}
    lista = []
    vistos: list[tuple[ParticipanteCombateRegistro, str]] = []
    for p in todos:
        personagem = session.get(PersonagemRegistro, p.personagem_id)
        dono = personagem.proprietario_id if personagem else None
        da_cena = tokens[p.id]
        visiveis = []
        for token in da_cena:
            if token.camada_id not in camadas:
                camadas[token.camada_id] = session.get(CamadaCenaRegistro, token.camada_id)
            camada = camadas[token.camada_id]
            if leitor.narrador or (camada is not None and token_visivel(token, camada, personagem)):
                visiveis.append(token)
        fora = not da_cena
        if not leitor.narrador and not visiveis:
            continue
        mostra_total = leitor.narrador or dono is not None
        vistos.append((p, _nome_base(session, p, visiveis if visiveis else da_cena)))
        lista.append({
            "id": p.id,
            "personagem_id": p.personagem_id if leitor.narrador or not ficha_oculta(personagem) else None,
            "nome": "",
            "token_id": visiveis[0].id if visiveis else None,
            "tokens": len(visiveis) if visiveis else 0,
            "token_ids": [t.id for t in visiveis],
            "rolou": p.total is not None,
            "total": p.total if mostra_total else None,
            "meu": dono is not None and dono == leitor.usuario_id,
            "do_jogador": dono is not None,
            "fora_da_cena": fora,
            "movimento": (
                {"gasto": p.movimento_gasto, "limite": limite(deslocamento(p.personagem_id), p.correndo), "correndo": p.correndo}
                if deslocamento is not None and combate.estado == "combate" and p.id == combate.vez_participante_id
                and (leitor.narrador or (dono is not None and dono == leitor.usuario_id)) else None
            ),
        })
    # Numera só entre os que o leitor vê, para o número não revelar token oculto.
    nomes = _numerar(vistos)
    for item in lista:
        item["nome"] = nomes[item["id"]]
    return {"combate": {
        "id": combate.id, "estado": combate.estado, "rodada": combate.rodada,
        "vez_participante_id": combate.vez_participante_id if any(i["id"] == combate.vez_participante_id for i in lista)
        else None,
        "participantes": lista,
    }}
