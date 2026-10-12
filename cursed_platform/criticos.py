"""Faixas de crítico e de falha crítica de cada personagem (gamificacao-da-sala, D1).

A faixa padrão é a das regras (`Rolagens.md`): crítico em 20 natural, falha crítica em 1 natural. Habilidades do
catálogo (`classes.json` e `racas.json`) podem ampliá-la pelos campos `amplia_critico` e `amplia_falha_critica`; as
ampliações das cartas de catálogo que o personagem aprendeu se somam. A faixa só existe no servidor: não entra no
conteúdo das cartas nem em resposta nenhuma, só nas marcas que ela produz nas rolagens.
"""

from __future__ import annotations

from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import cartas_catalogo, catalogos
from cursed_platform.catalogos import Catalogos
from cursed_platform.persistence import CartaDefinicaoRegistro, CartaPersonagemRegistro

INICIO_CRITICO_MINIMO = 2
FIM_FALHA_MAXIMO = 19


class Faixa(NamedTuple):
    inicio_critico: int = 20
    fim_falha: int = 1

    def marca(self, natural: int) -> str | None:
        """"critico", "falha_critica" ou nada. Um valor nas duas faixas conta só como crítico."""
        if natural >= self.inicio_critico:
            return "critico"
        if natural <= self.fim_falha:
            return "falha_critica"
        return None


PADRAO = Faixa()


def ampliacoes_por_origem(catalogo: Catalogos) -> dict[str, tuple[int, int]]:
    """origem_sistema -> (ampliação de crítico, ampliação de falha), só das habilidades que ampliam algo."""
    return {h.origem: h.ampliacao for h in cartas_catalogo.todas_as_habilidades(catalogo) if any(h.ampliacao)}


def faixa_do_personagem(session: Session, mesa_id: str, personagem_id: str,
                        catalogo: Catalogos | None = None) -> Faixa:
    """Soma as ampliações das cartas de catálogo aprendidas pelo personagem, em definições não arquivadas."""
    ampliacoes = ampliacoes_por_origem(catalogo or catalogos.obter())
    if not ampliacoes:
        return PADRAO
    origens = session.scalars(
        select(CartaDefinicaoRegistro.origem_sistema)
        .join(CartaPersonagemRegistro, CartaPersonagemRegistro.definicao_id == CartaDefinicaoRegistro.id)
        .where(
            CartaPersonagemRegistro.mesa_id == mesa_id, CartaPersonagemRegistro.personagem_id == personagem_id,
            CartaPersonagemRegistro.estado == "aprendida", CartaDefinicaoRegistro.mesa_id == mesa_id,
            CartaDefinicaoRegistro.arquivada.is_(False), CartaDefinicaoRegistro.origem_sistema.is_not(None),
        )
    )
    critico = falha = 0
    for origem in set(origens):
        mais_critico, mais_falha = ampliacoes.get(origem, (0, 0))
        critico += mais_critico
        falha += mais_falha
    return Faixa(max(INICIO_CRITICO_MINIMO, 20 - critico), min(FIM_FALHA_MAXIMO, 1 + falha))
