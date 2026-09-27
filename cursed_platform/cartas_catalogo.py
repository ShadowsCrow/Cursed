"""Habilidades de classe, arquétipo e raça como cartas da mesa (calcular-valores-da-ficha, D5).

- **Materialização:** cada habilidade do catálogo vira uma carta de habilidade publicada na mesa,
  identificada por ``origem_sistema`` (ex.: ``classes/Druida/habilidades/Forma Selvagem``), única
  por mesa. Placeholders do catálogo não viram carta; custos ficam vazios.
- **Concessão:** a escolha de classe, arquétipo ou raça concede as cartas já aprendidas
  (``excecao_aprendizado``), marcadas com ``concedida_por`` (ex.: ``classe:Druida``). Numa troca, só
  as cartas concedidas pela escolha anterior saem; cartas obtidas por oferta não são tocadas.
- **Sincronização:** o JSON do catálogo prevalece. Texto ou ativação diferente gera nova versão,
  mesmo que o Narrador tenha editado a carta; as posses concedidas passam para ela. Habilidade nova
  é concedida a quem tem a escolha; habilidade removida é arquivada e retirada.

Nenhuma função confirma a transação.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping
from uuid import NAMESPACE_URL, uuid4, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import auditoria, cartas
from cursed_platform.catalogos import Catalogos, Habilidade
from cursed_platform.persistence import (
    CartaDefinicaoRegistro, CartaPersonagemRegistro, CartaVersaoRegistro, PersonagemRegistro,
)

AUTOR = "sistema"
ATIVACAO = {"passiva": "passiva", "ativa": "ativa"}


@dataclass(frozen=True)
class HabilidadeCatalogo:
    origem: str  # origem_sistema da carta
    concedida_por: str  # classe:Druida | arquetipo:Druida/Animalista | raca:Elfo
    rotulo_origem: str  # "Classe: Druida"
    conteudo: dict[str, Any]


def _conteudo(habilidade: Habilidade, tag: str) -> dict[str, Any]:
    tipo = habilidade.tipo.strip()
    ativacao = ATIVACAO.get(tipo.casefold())
    tags = [tag]
    if tipo and ativacao is None:
        # Reação, Ritual etc. não têm ativação própria na carta: o tipo original fica visível como tag.
        tags.append(tipo)
    conteudo: dict[str, Any] = {"titulo": habilidade.nome, "texto": habilidade.descricao, "ativacao": ativacao, "tags": tags}
    if habilidade.custo_legado:
        conteudo["custo_legado"] = habilidade.custo_legado
    return conteudo


def _da_classe(catalogo: Catalogos, nome: Any) -> list[HabilidadeCatalogo]:
    classe = catalogo.classe(nome)
    if classe is None:
        return []
    return [
        HabilidadeCatalogo(f"classes/{classe.nome}/habilidades/{h.nome}", f"classe:{classe.nome}",
                           f"Classe: {classe.nome}", _conteudo(h, f"classe:{classe.nome}"))
        for h in classe.habilidades
    ]


def _do_arquetipo(catalogo: Catalogos, classe_nome: Any, nome: Any) -> list[HabilidadeCatalogo]:
    classe = catalogo.classe(classe_nome)
    arquetipo = classe.arquetipo(nome) if classe is not None else None
    if arquetipo is None:
        return []
    chave = f"{classe.nome}/{arquetipo.nome}"
    return [
        HabilidadeCatalogo(f"classes/{classe.nome}/arquetipos/{arquetipo.nome}/habilidades/{h.nome}",
                           f"arquetipo:{chave}", f"Arquétipo: {arquetipo.nome}",
                           _conteudo(h, f"arquetipo:{arquetipo.nome}"))
        for h in arquetipo.habilidades
    ]


def _da_raca(catalogo: Catalogos, nome: Any) -> list[HabilidadeCatalogo]:
    raca = catalogo.raca(nome)
    if raca is None:
        return []
    return [
        HabilidadeCatalogo(f"racas/{raca.nome}/habilidades/{h.nome}", f"raca:{raca.nome}",
                           f"Raça: {raca.nome}", _conteudo(h, f"raca:{raca.nome}"))
        for h in raca.habilidades
    ]


def habilidades_da_ficha(ficha: Mapping[str, Any], catalogo: Catalogos) -> list[HabilidadeCatalogo]:
    """Habilidades que a classe, o arquétipo e a raça da ficha concedem (só valores do catálogo)."""
    personagem = ficha.get("personagem") if isinstance(ficha.get("personagem"), Mapping) else {}
    return [
        *_da_classe(catalogo, personagem.get("classe")),
        *_do_arquetipo(catalogo, personagem.get("classe"), personagem.get("arquetipo")),
        *_da_raca(catalogo, personagem.get("raca")),
    ]


def todas_as_habilidades(catalogo: Catalogos) -> list[HabilidadeCatalogo]:
    lista: list[HabilidadeCatalogo] = []
    for classe in catalogo.classes:
        lista += _da_classe(catalogo, classe.nome)
        for arquetipo in classe.arquetipos:
            lista += _do_arquetipo(catalogo, classe.nome, arquetipo.nome)
    for raca in catalogo.racas:
        lista += _da_raca(catalogo, raca.nome)
    return lista


def _id_definicao(mesa_id: str, origem: str) -> str:
    return f"sis-{uuid5(NAMESPACE_URL, f'cursed:{mesa_id}:{origem}').hex}"


def _definicao(session: Session, mesa_id: str, origem: str) -> CartaDefinicaoRegistro | None:
    return session.scalar(select(CartaDefinicaoRegistro).where(
        CartaDefinicaoRegistro.mesa_id == mesa_id, CartaDefinicaoRegistro.origem_sistema == origem,
    ))


def _comparavel(conteudo: Mapping[str, Any]) -> tuple[Any, ...]:
    return (conteudo.get("titulo"), conteudo.get("texto"), conteudo.get("ativacao"), tuple(conteudo.get("tags") or ()),
            conteudo.get("custo_legado"))


@dataclass
class ResultadoMaterializacao:
    criadas: list[str] = field(default_factory=list)  # origem_sistema
    atualizadas: list[str] = field(default_factory=list)
    versoes: dict[str, CartaVersaoRegistro] = field(default_factory=dict)  # origem -> versão vigente


def _publicar(session: Session, definicao: CartaDefinicaoRegistro, habilidade: HabilidadeCatalogo) -> CartaVersaoRegistro:
    validado, validacao = cartas.validar("habilidade", habilidade.conteudo, definicao.mesa_id)
    if validado is None:
        raise ValueError(f"{habilidade.origem}: {'; '.join(p.mensagem for p in validacao.problemas)}")
    numero = (definicao.versao_publicada or 0) + 1
    procedencia = {"origem": "sistema", "catalogo": habilidade.origem, "concedida_por": habilidade.concedida_por}
    definicao.versao_publicada = numero
    definicao.versao = (definicao.versao or 0) + 1
    definicao.arquivada = False
    definicao.rascunho = {"conteudo": {**habilidade.conteudo, "tipo": "habilidade"}, "procedencia": procedencia}
    versao = CartaVersaoRegistro(
        id=uuid4().hex, mesa_id=definicao.mesa_id, definicao_id=definicao.id, numero=numero, tipo="habilidade",
        conteudo=validado, procedencia={**procedencia, "publicado_por": AUTOR}, revisao_pendente=[], publicado_por=AUTOR,
    )
    session.add(versao)
    session.flush()
    return versao


def materializar(session: Session, mesa_id: str, habilidades: Iterable[HabilidadeCatalogo]) -> ResultadoMaterializacao:
    """Garante uma carta publicada e atualizada para cada habilidade. Repetir não duplica nem versiona."""
    resultado = ResultadoMaterializacao()
    for habilidade in habilidades:
        definicao = _definicao(session, mesa_id, habilidade.origem)
        if definicao is None:
            definicao = CartaDefinicaoRegistro(
                id=_id_definicao(mesa_id, habilidade.origem), mesa_id=mesa_id, tipo="habilidade", criado_por=AUTOR,
                versao=0, origem_sistema=habilidade.origem,
            )
            session.add(definicao)
            session.flush()
            resultado.versoes[habilidade.origem] = _publicar(session, definicao, habilidade)
            resultado.criadas.append(habilidade.origem)
            continue
        vigente = cartas.versao_publicada(session, definicao)
        if vigente is None or definicao.arquivada or _comparavel(vigente.conteudo) != _comparavel(habilidade.conteudo):
            # O JSON prevalece, inclusive sobre edições do Narrador (decisão de 2026-09-27).
            vigente = _publicar(session, definicao, habilidade)
            resultado.atualizadas.append(habilidade.origem)
        resultado.versoes[habilidade.origem] = vigente
    return resultado


# ------------------------------------------------------------ concessão


@dataclass
class ResultadoConcessao:
    concedidas: list[tuple[str, str]] = field(default_factory=list)  # (título, rótulo de origem)
    removidas: list[tuple[str, str]] = field(default_factory=list)
    atualizadas: list[str] = field(default_factory=list)

    @property
    def altera(self) -> bool:
        return bool(self.concedidas or self.removidas or self.atualizadas)


def _posses_do_catalogo(session: Session, personagem: PersonagemRegistro) -> list[CartaPersonagemRegistro]:
    return list(session.scalars(select(CartaPersonagemRegistro).where(
        CartaPersonagemRegistro.mesa_id == personagem.mesa_id,
        CartaPersonagemRegistro.personagem_id == personagem.id,
        CartaPersonagemRegistro.concedida_por.is_not(None),
        CartaPersonagemRegistro.estado != "removida",
    )))


def _rotulo(concedida_por: str) -> str:
    tipo, _, nome = concedida_por.partition(":")
    prefixo = {"classe": "Classe", "arquetipo": "Arquétipo", "raca": "Raça"}.get(tipo, tipo)
    return f"{prefixo}: {nome.split('/')[-1]}"


def conceder(
    session: Session, personagem: PersonagemRegistro, ficha: Mapping[str, Any], catalogo: Catalogos,
) -> ResultadoConcessao:
    """Deixa as posses de catálogo do personagem iguais às da classe, arquétipo e raça atuais.

    Não avança a versão do personagem: roda dentro da gravação que mudou a ficha (ou da
    sincronização do catálogo).
    """
    desejadas = habilidades_da_ficha(ficha, catalogo)
    materializacao = materializar(session, personagem.mesa_id, desejadas)
    por_definicao = {
        materializacao.versoes[h.origem].definicao_id: (h, materializacao.versoes[h.origem]) for h in desejadas
    }
    resultado = ResultadoConcessao()
    atuais: dict[str, CartaPersonagemRegistro] = {}
    for posse in _posses_do_catalogo(session, personagem):
        if posse.definicao_id in por_definicao and posse.definicao_id not in atuais:
            atuais[posse.definicao_id] = posse
            habilidade, versao = por_definicao[posse.definicao_id]
            if posse.versao_id != versao.id:
                posse.versao_id = versao.id
                resultado.atualizadas.append(versao.conteudo["titulo"])
            continue
        titulo = session.get(CartaVersaoRegistro, posse.versao_id)
        posse.estado = "removida"
        resultado.removidas.append((titulo.conteudo["titulo"] if titulo else posse.definicao_id, _rotulo(posse.concedida_por)))
    for definicao_id, (habilidade, versao) in por_definicao.items():
        if definicao_id in atuais:
            continue
        # Uma posse obtida por outra via (oferta) já conta: a escolha não duplica a carta.
        outra = session.scalar(select(CartaPersonagemRegistro.id).where(
            CartaPersonagemRegistro.personagem_id == personagem.id,
            CartaPersonagemRegistro.definicao_id == definicao_id,
            CartaPersonagemRegistro.estado != "removida",
        ))
        if outra is not None:
            continue
        session.add(CartaPersonagemRegistro(
            id=uuid4().hex, mesa_id=personagem.mesa_id, personagem_id=personagem.id, definicao_id=definicao_id,
            versao_id=versao.id, tipo="habilidade", estado="aprendida", origem="concessao",
            excecao_aprendizado=True, concedida_por=habilidade.concedida_por,
        ))
        resultado.concedidas.append((versao.conteudo["titulo"], habilidade.rotulo_origem))
    session.flush()
    return resultado


def auditar(
    session: Session, personagem: PersonagemRegistro, resultado: ResultadoConcessao, *,
    ator_id: str | None, correlacao_id: str | None, origem: str = "usuario",
) -> None:
    """Um evento por personagem com todas as cartas concedidas, removidas e atualizadas."""
    if not resultado.altera:
        return
    mudancas = [
        *({"campo": "cartas", "antes": None, "depois": "aprendida", "rotulo": f"{t} ({o})", "completo": True}
          for t, o in resultado.concedidas),
        *({"campo": "cartas", "antes": "aprendida", "depois": "removida", "rotulo": f"{t} ({o})", "completo": True}
          for t, o in resultado.removidas),
        *({"campo": "cartas", "antes": "versão anterior", "depois": "versão do catálogo", "rotulo": t, "completo": True}
          for t in resultado.atualizadas),
    ]
    partes = []
    if resultado.concedidas:
        partes.append(f"recebeu {len(resultado.concedidas)} carta(s) do catálogo")
    if resultado.removidas:
        partes.append(f"perdeu {len(resultado.removidas)} carta(s) da escolha anterior")
    if resultado.atualizadas:
        partes.append(f"{len(resultado.atualizadas)} carta(s) atualizada(s) pelo catálogo")
    auditoria.registrar(
        session, mesa_id=personagem.mesa_id, ator_id=ator_id, categoria="carta", acao="carta.catalogo",
        relevancia="mecanica", personagem=personagem, origem=origem,
        resumo=f"{auditoria.nome_personagem(personagem)}: {', '.join(partes)}",
        mudancas=mudancas, correlacao_id=correlacao_id,
    )


# ------------------------------------------------------------ sincronização


@dataclass
class ResultadoSincronizacao:
    atualizadas: list[str] = field(default_factory=list)  # origem_sistema com nova versão
    arquivadas: list[str] = field(default_factory=list)  # títulos das cartas retiradas do catálogo
    personagens: int = 0  # personagens cujas cartas mudaram


def sincronizar_mesa(session: Session, mesa_id: str, catalogo: Catalogos) -> ResultadoSincronizacao:
    """Aplica o JSON atual às cartas de catálogo já materializadas na mesa e às posses concedidas."""
    resultado = ResultadoSincronizacao()
    desejadas = {h.origem: h for h in todas_as_habilidades(catalogo)}
    materializadas = list(session.scalars(select(CartaDefinicaoRegistro).where(
        CartaDefinicaoRegistro.mesa_id == mesa_id, CartaDefinicaoRegistro.origem_sistema.is_not(None),
    )))
    if not materializadas:
        return resultado
    presentes = [desejadas[d.origem_sistema] for d in materializadas if d.origem_sistema in desejadas]
    resultado.atualizadas = materializar(session, mesa_id, presentes).atualizadas
    for definicao in materializadas:
        if definicao.origem_sistema in desejadas or definicao.arquivada:
            continue
        definicao.arquivada = True
        vigente = cartas.versao_publicada(session, definicao)
        resultado.arquivadas.append(vigente.conteudo["titulo"] if vigente else definicao.origem_sistema)
    session.flush()
    personagens = session.scalars(select(PersonagemRegistro).where(
        PersonagemRegistro.mesa_id == mesa_id, PersonagemRegistro.excluido_em.is_(None),
    ))
    for personagem in personagens:
        concessao = conceder(session, personagem, personagem.ficha or {}, catalogo)
        if concessao.altera:
            resultado.personagens += 1
            auditar(session, personagem, concessao, ator_id=None, correlacao_id=None, origem="automacao")
    return resultado


def sincronizar_todas(session: Session, catalogo: Catalogos) -> dict[str, ResultadoSincronizacao]:
    """Sincroniza todas as mesas que têm cartas de catálogo. Quem chama confirma a transação."""
    mesas = session.scalars(select(CartaDefinicaoRegistro.mesa_id).where(
        CartaDefinicaoRegistro.origem_sistema.is_not(None)).distinct())
    return {mesa_id: sincronizar_mesa(session, mesa_id, catalogo) for mesa_id in list(mesas)}
