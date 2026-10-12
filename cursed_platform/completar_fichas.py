"""Completa as fichas existentes de uma mesa para a ficha calculada (calcular-valores-da-ficha, 8.1).

Para cada personagem de jogador:
- nível ``1`` onde faltar, marcado como "definido pela migração" até o Narrador confirmar, e PV/PP
  atuais iguais aos máximos calculados;
- classe, arquétipo e raça vinculados ao catálogo quando o nome coincide depois de normalizar
  maiúsculas e espaços; os que não coincidem ficam como estão e são sinalizados;
- Tamanho explícito igual ao da raça é limpo; divergente fica e é sinalizado para o Narrador
  confirmar, sem escolher um motivo;
- cartas de habilidade da classe, do arquétipo e da raça concedidas.

A prévia não grava nada. Repetir a aplicação não muda o que já foi completado. NPCs e monstros
ficam de fora: as regras de limites e catálogo valem para personagens.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from cursed_platform import auditoria, cartas_catalogo
from cursed_platform.catalogos import Catalogos, chave
from cursed_platform.domain import recursos
from cursed_platform.domain.validacao_ficha import validar_ficha
from cursed_platform.persistence import PersonagemRegistro
from cursed_platform.policies import campos_alterados
from cursed_platform.repositories import FichaRepository


def _normalizar(texto: Any) -> str:
    """Só maiúsculas e espaços: acentos e grafias diferentes não vinculam sozinhos."""
    return " ".join(str(texto or "").casefold().split())


def _vincular(nome: Any, opcoes: list[str]) -> str | None:
    alvo = _normalizar(nome)
    return next((opcao for opcao in opcoes if _normalizar(opcao) == alvo), None) if alvo else None


@dataclass
class ResultadoFicha:
    personagem_id: str
    nome: str
    alteracoes: list[str] = field(default_factory=list)
    sinalizacoes: list[str] = field(default_factory=list)
    erros: list[str] = field(default_factory=list)
    cartas_previstas: int = 0

    @property
    def altera(self) -> bool:
        return bool(self.alteracoes) and not self.erros


@dataclass
class RelatorioCompletar:
    mesa_id: str
    aplicado: bool
    fichas: list[ResultadoFicha] = field(default_factory=list)
    ignoradas: list[str] = field(default_factory=list)  # NPCs e monstros

    def contagens(self) -> dict[str, int]:
        return {
            "fichas": len(self.fichas),
            "alteradas": sum(f.altera for f in self.fichas),
            "sinalizadas": sum(bool(f.sinalizacoes) for f in self.fichas),
            "com_erro": sum(bool(f.erros) for f in self.fichas),
            "ignoradas": len(self.ignoradas),
        }


def planejar(ficha: dict[str, Any], catalogo: Catalogos) -> tuple[dict[str, Any], list[str], list[str]]:
    """Ficha completada, alterações e sinalizações. Não grava nada."""
    nova = deepcopy(ficha)
    personagem = nova.setdefault("personagem", {})
    alteracoes: list[str] = []
    sinalizacoes: list[str] = []

    classe_nome = personagem.get("classe")
    classe = None
    if str(classe_nome or "").strip():
        vinculada = _vincular(classe_nome, [c.nome for c in catalogo.classes])
        if vinculada is None:
            sinalizacoes.append(f"Classe \"{classe_nome}\" fora do catálogo: o Narrador precisa vincular.")
        else:
            classe = catalogo.classe(vinculada)
            if vinculada != classe_nome:
                personagem["classe"] = vinculada
                alteracoes.append(f"Classe vinculada: \"{classe_nome}\" → {vinculada}.")
    arquetipo_nome = personagem.get("arquetipo")
    if str(arquetipo_nome or "").strip():
        vinculado = _vincular(arquetipo_nome, [a.nome for a in classe.arquetipos]) if classe else None
        if vinculado is None:
            sinalizacoes.append(f"Arquétipo \"{arquetipo_nome}\" não vinculado à classe do catálogo.")
        elif vinculado != arquetipo_nome:
            personagem["arquetipo"] = vinculado
            alteracoes.append(f"Arquétipo vinculado: \"{arquetipo_nome}\" → {vinculado}.")
    raca_nome = personagem.get("raca")
    raca = None
    if str(raca_nome or "").strip():
        vinculada = _vincular(raca_nome, [r.nome for r in catalogo.racas])
        if vinculada is None:
            sinalizacoes.append(f"Raça \"{raca_nome}\" fora do catálogo: o Narrador precisa vincular.")
        else:
            raca = catalogo.raca(vinculada)
            if vinculada != raca_nome:
                personagem["raca"] = vinculada
                alteracoes.append(f"Raça vinculada: \"{raca_nome}\" → {vinculada}.")

    tamanho = personagem.get("tamanho")
    if str(tamanho or "").strip() and not personagem.get("tamanho_raca"):
        if raca is not None and raca.tamanho and chave(raca.tamanho) == chave(tamanho):
            personagem.pop("tamanho", None)
            alteracoes.append(f"Tamanho {tamanho} igual ao da raça {raca.nome}: passa a vir da raça.")
        else:
            sinalizacoes.append(
                f"Tamanho {tamanho} diferente da base racial"
                + (f" ({raca.tamanho} para {raca.nome})" if raca is not None and raca.tamanho else "")
                + ": o Narrador precisa confirmar a exceção."
            )

    if personagem.get("nivel") in (None, ""):
        personagem["nivel"] = 1
        personagem["nivel_pela_migracao"] = True
        alteracoes.append("Nível 1 definido pela migração; o Narrador confirma ou corrige.")
        calculado = recursos.calcular(nova, catalogo)
        for recurso, rotulo in (("pv", "PV"), ("pp", "PP")):
            maximo = calculado.maximo(recurso)
            if maximo is None:
                sinalizacoes.append(f"{rotulo} não calculável: {calculado[f'{recurso}_maximo'].motivo}")
                continue
            secao = nova.setdefault("recursos", {})
            atual = dict(secao.get(recurso) or {})
            atual["atual"] = maximo
            secao[recurso] = atual
            alteracoes.append(f"{rotulo} atual = máximo calculado ({maximo}).")
    return nova, alteracoes, sinalizacoes


def completar(session: Session, mesa_id: str, catalogo: Catalogos, *, aplicar: bool = False) -> RelatorioCompletar:
    """Prévia (padrão) ou aplicação na mesa. Quem chama confirma ou desfaz a transação."""
    relatorio = RelatorioCompletar(mesa_id, aplicar)
    personagens = session.scalars(select(PersonagemRegistro).where(
        PersonagemRegistro.mesa_id == mesa_id, PersonagemRegistro.excluido_em.is_(None),
    ).order_by(PersonagemRegistro.id))
    for personagem in personagens:
        nome = auditoria.nome_personagem(personagem)
        if personagem.tipo != "personagem":
            relatorio.ignoradas.append(nome)
            continue
        anterior = deepcopy(personagem.ficha or {})
        nova, alteracoes, sinalizacoes = planejar(anterior, catalogo)
        resultado = ResultadoFicha(personagem.id, nome, alteracoes, sinalizacoes,
                                   cartas_previstas=len(cartas_catalogo.habilidades_da_ficha(nova, catalogo)))
        # Só os campos que a migração muda são validados; irregularidades antigas continuam como avisos.
        # Vincular "elfo" a "Elfo" não é trocar de raça: a comparação parte dos nomes já vinculados.
        referencia = deepcopy(anterior)
        referencia.setdefault("personagem", {}).update(
            {campo: nova["personagem"].get(campo) for campo in ("classe", "arquetipo", "raca") if campo in nova["personagem"]})
        resultado.erros = [f"{e.caminho}: {e.mensagem}" for e in validar_ficha(referencia, nova, catalogo)]
        relatorio.fichas.append(resultado)
        if not aplicar or resultado.erros:
            continue
        if campos_alterados(anterior, nova):
            if not FichaRepository(session).substituir_se_versao(mesa_id, personagem.id, personagem.versao, nova):
                resultado.erros.append("A ficha mudou durante a migração; rode de novo.")
                continue
            session.refresh(personagem)
            auditoria.registrar(
                session, mesa_id=mesa_id, ator_id=None, origem="migracao", categoria="ficha", acao="ficha.completada",
                relevancia="mecanica", personagem=personagem,
                resumo=f"{nome}: ficha completada pela migração ({len(alteracoes)} alteração(ões))",
                mudancas=auditoria.mudancas(anterior, nova), detalhes={"sinalizacoes": sinalizacoes},
            )
        concessao = cartas_catalogo.conceder(session, personagem, nova, catalogo)
        cartas_catalogo.auditar(session, personagem, concessao, ator_id=None, correlacao_id=None, origem="migracao")
        if concessao.concedidas:
            resultado.alteracoes.append(f"{len(concessao.concedidas)} carta(s) de habilidade concedida(s).")
    return relatorio
