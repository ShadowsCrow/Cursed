"""Rolagens de dados da Sala (melhorias-da-sala, item 3): sorteadas e guardadas pelo servidor.

O navegador só pede a montagem (quantos dados de cada tipo e o modificador). O servidor valida os limites,
sorteia cada dado com `secrets.randbelow` (uniforme, sem viés entre as faces), grava e avisa a mesa pelo
Realtime (`sala.rolagem`, só com o id). A rolagem não interpreta o resultado: nada de crítico, sucesso ou CD.

Rolagem pela ficha (item 8): Atributo e Perícia da ficha entram como parcelas com o total que o servidor calcula
(`ficha_viva.calcular_valores_derivados`); o navegador só diz quais.

Rolagem oculta (item 5): só o Narrador pode ocultar as próprias rolagens. Os jogadores não as recebem, nem na
lista nem no aviso, que vai só para o tópico do Narrador.

Críticos (gamificacao-da-sala, D2): a única leitura do resultado é a marca de crítico e de falha crítica em cada d20,
pela faixa do personagem no sorteio (`criticos`), gravada sempre e enviada só com o destaque da mesa ligado. A rolagem
também guarda a sessão em andamento, para as estatísticas.
"""

from __future__ import annotations

import secrets
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import sessoes
from cursed_platform.criticos import PADRAO, Faixa
from cursed_platform.persistence import RolagemRegistro
from cursed_platform.sala import emitir


TIPOS_DE_DADO = (4, 6, 8, 10, 12, 20, 100)
MAXIMO_POR_DADO = 99
LIMITE_DO_MODIFICADOR = 99
LIMITE_DA_LISTA = 50
EVENTO = "sala.rolagem"


class RolagemInvalida(ValueError):
    """Montagem fora dos limites (422)."""


class OcultarSoNarrador(PermissionError):
    """Só o Narrador rola oculto (403)."""


def validar(dados: dict[int, int], modificador: int) -> dict[int, int]:
    """Quantidade por tipo, sem os zeros e na ordem dos tipos. Recusa o que o rolador da Sala não monta."""
    for faces, quantidade in dados.items():
        if faces not in TIPOS_DE_DADO:
            raise RolagemInvalida(f"Dado d{faces} não existe no rolador.")
        if not 0 <= quantidade <= MAXIMO_POR_DADO:
            raise RolagemInvalida(f"Cada tipo de dado aceita de 0 a {MAXIMO_POR_DADO} dados.")
    if not -LIMITE_DO_MODIFICADOR <= modificador <= LIMITE_DO_MODIFICADOR:
        raise RolagemInvalida(f"O modificador vai de -{LIMITE_DO_MODIFICADOR} a +{LIMITE_DO_MODIFICADOR}.")
    limpos = {faces: dados[faces] for faces in TIPOS_DE_DADO if dados.get(faces, 0) > 0}
    if not limpos:
        raise RolagemInvalida("Escolha ao menos um dado.")
    return limpos


def _sinal(valor: int) -> str:
    return f"+{valor}" if valor >= 0 else f"\u2212{-valor}"


def descrever(dados: dict[int, int], modificador: int, termos: list[dict[str, Any]] | None = None) -> str:
    """Mesma expressão da aba Dados: `1d20 + Destreza (+3) + 2`, com o sinal de menos tipográfico (−)."""
    partes = " + ".join([f"{quantidade}d{faces}" for faces, quantidade in dados.items()]
                        + [f"{termo['rotulo']} ({_sinal(termo['valor'])})" for termo in termos or []])
    if modificador > 0:
        return f"{partes} + {modificador}"
    if modificador < 0:
        return f"{partes} \u2212 {-modificador}"
    return partes


def _sortear(faces: int) -> int:
    return secrets.randbelow(faces) + 1


def marcar(grupos: list[dict[str, Any]], faixa: Faixa = PADRAO) -> list[dict[str, Any]] | None:
    """Marca cada d20 natural na faixa de crítico ou de falha crítica; outros dados não são marcados."""
    marcas = [{"faces": 20, "indice": indice, "tipo": tipo}
              for grupo in grupos if grupo["faces"] == 20
              for indice, valor in enumerate(grupo["valores"])
              if (tipo := faixa.marca(valor)) is not None]
    return marcas or None


def rolar(session: Session, mesa_id: str, autor_id: str, dados: dict[int, int], modificador: int,
          sortear: Callable[[int], int] = _sortear, *, oculta: bool = False, narrador: bool = False,
          personagem_id: str | None = None, termos: list[dict[str, Any]] | None = None,
          faixa: Faixa = PADRAO, finalidade: str | None = None) -> RolagemRegistro:
    if oculta and not narrador:
        raise OcultarSoNarrador("Só o Narrador pode rolar oculto dos jogadores.")
    limpos = validar(dados, modificador)
    grupos = [{"faces": faces, "valores": [sortear(faces) for _ in range(quantidade)]} for faces, quantidade in limpos.items()]
    termos = list(termos or [])
    total = sum(sum(grupo["valores"]) for grupo in grupos) + sum(t["valor"] for t in termos) + modificador
    rolagem = RolagemRegistro(mesa_id=mesa_id, autor_id=autor_id, expressao=descrever(limpos, modificador, termos),
                              grupos=grupos, modificador=modificador, total=total, oculta=oculta,
                              personagem_id=personagem_id, termos=termos or None,
                              marcas=marcar(grupos, faixa), sessao_id=sessoes.ativa(session, mesa_id),
                              finalidade=finalidade)
    session.add(rolagem)
    session.flush()
    emitir(session, mesa_id, EVENTO, {"id": rolagem.id}, publico=not oculta)
    return rolagem


def listar(session: Session, mesa_id: str, depois: int | None = None, limite: int = LIMITE_DA_LISTA, *,
           narrador: bool = True) -> list[RolagemRegistro]:
    """As rolagens da mesa depois do id dado (todas, sem ele), em ordem, até `limite` (as mais recentes).
    Para quem não é Narrador, as rolagens ocultas não existem."""
    consulta = select(RolagemRegistro).where(RolagemRegistro.mesa_id == mesa_id)
    if not narrador:
        consulta = consulta.where(RolagemRegistro.oculta.is_(False))
    if depois is not None:
        consulta = consulta.where(RolagemRegistro.id > depois)
    recentes = list(session.scalars(consulta.order_by(RolagemRegistro.id.desc()).limit(limite)))
    return list(reversed(recentes))


def para_resposta(rolagem: RolagemRegistro, destaque: bool = False) -> dict[str, Any]:
    """Sem o destaque de críticos ligado, as marcas não saem do servidor."""
    return {
        "id": rolagem.id, "autor_id": rolagem.autor_id, "expressao": rolagem.expressao,
        "grupos": rolagem.grupos, "modificador": rolagem.modificador, "total": rolagem.total,
        "oculta": rolagem.oculta, "personagem_id": rolagem.personagem_id, "termos": rolagem.termos or [],
        "criado_em": rolagem.criado_em, "marcas": (rolagem.marcas or []) if destaque else [],
        "finalidade": rolagem.finalidade,
    }
