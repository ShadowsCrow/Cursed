"""Catálogo de cartas: rascunho, validação, publicação de versões imutáveis e importação."""

from __future__ import annotations

import hashlib
from typing import Any, Mapping
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from cursed_platform import ficha_viva, narrador
from cursed_platform.acesso_privado import BUCKET_PRIVADO
from cursed_platform.migracao_ativos import ArmazenamentoObjetos, AtivoInvalido
from cursed_platform.contracts import (
    ConteudoEfeito, ConteudoHabilidade, ConteudoItem, ConteudoMagia, ProblemaValidacao, ValidacaoCarta,
)
from cursed_platform.persistence import AtivoCatalogoRegistro, CartaDefinicaoRegistro, CartaVersaoRegistro


MODELOS = {"habilidade": ConteudoHabilidade, "magia": ConteudoMagia, "item": ConteudoItem, "efeito": ConteudoEfeito}
CUSTOS = ("custo_aprendizado", "descansos_minimos", "potencia_uso", "custo_uso")
AVISO_CUSTO_LEGADO = (
    "Custo legado sem cálculo validado: Custo de Aprendizado, Descansos Mínimos, Potência de Uso e "
    "Custo de Uso ficam indefinidos até revisão."
)
AVISO_ARTE_PRIVADA = "Arte legada privada: a publicação exige confirmação para copiá-la ao espaço da mesa."


class ConflitoRascunho(Exception):
    """O rascunho mudou desde a leitura."""


def _modificadores(conteudo: Mapping[str, Any]) -> list[list[Mapping[str, Any]]]:
    grupos = [conteudo.get("modificadores") or []]
    grupos += [efeito.get("modificadores") or [] for efeito in conteudo.get("efeitos") or []]
    return grupos


def validar(tipo: str, rascunho: Mapping[str, Any] | None, mesa_id: str) -> tuple[dict[str, Any] | None, ValidacaoCarta]:
    """Valida o conteúdo para publicação. Não altera nada."""
    problemas: list[ProblemaValidacao] = []
    dados = {**dict(rascunho or {}), "tipo": tipo}
    privados = dados.pop("ativos_privados", [])
    if not isinstance(privados, list) or any(not isinstance(item, str) for item in privados):
        problemas.append(ProblemaValidacao(campo="ativos_privados", mensagem="Lista de artes privadas inválida."))
    try:
        conteudo = MODELOS[tipo].model_validate(dados).model_dump(mode="json")
    except ValidationError as erro:
        for item in erro.errors():
            campo = ".".join(str(parte) for parte in item["loc"]) or "conteudo"
            problemas.append(ProblemaValidacao(campo=campo, mensagem=item["msg"]))
        return None, ValidacaoCarta(valida=False, problemas=problemas)
    for indice, grupo in enumerate(_modificadores(conteudo)):
        try:
            narrador.modificadores_validos(grupo)
        except ValueError as erro:
            campo = "modificadores" if indice == 0 else f"efeitos.{indice - 1}.modificadores"
            problemas.append(ProblemaValidacao(campo=campo, mensagem=str(erro)))
    prefixo = f"mesas/{mesa_id}/mesa/"
    for indice, ativo in enumerate(conteudo.get("ativos") or []):
        if not ativo.startswith(prefixo) or "/../" in f"/{ativo}/" or ativo.endswith("/"):
            problemas.append(ProblemaValidacao(
                campo=f"ativos.{indice}", mensagem=f"Ativos de cartas precisam ficar em {prefixo}.",
            ))
    revisao = []
    if privados:
        revisao.append(AVISO_ARTE_PRIVADA)
    if tipo in {"habilidade", "magia"} and conteudo.get("custo_legado") and any(conteudo.get(c) is None for c in CUSTOS):
        revisao.append(AVISO_CUSTO_LEGADO)
    return (conteudo if not problemas else None), ValidacaoCarta(
        valida=not problemas, problemas=problemas, revisao_pendente=revisao,
    )


def criar_definicao(
    session: Session, *, mesa_id: str, tipo: str, rascunho: Mapping[str, Any], ator_id: str,
    procedencia: Mapping[str, Any] | None = None,
) -> CartaDefinicaoRegistro:
    definicao = CartaDefinicaoRegistro(
        id=uuid4().hex, mesa_id=mesa_id, tipo=tipo, criado_por=ator_id, versao=0,
        rascunho={"conteudo": {**dict(rascunho), "tipo": tipo},
                  "procedencia": dict(procedencia or {"origem": "narrador", "autor": ator_id})},
    )
    session.add(definicao)
    session.flush()
    return definicao


def salvar_rascunho(
    session: Session, definicao: CartaDefinicaoRegistro, rascunho: Mapping[str, Any], versao_esperada: int,
) -> None:
    procedencia = (definicao.rascunho or {}).get("procedencia") or {}
    resultado = session.execute(
        update(CartaDefinicaoRegistro)
        .where(CartaDefinicaoRegistro.id == definicao.id, CartaDefinicaoRegistro.versao == versao_esperada)
        .values(rascunho={"conteudo": {**dict(rascunho), "tipo": definicao.tipo}, "procedencia": procedencia},
                versao=CartaDefinicaoRegistro.versao + 1)
        .execution_options(synchronize_session=False)
    )
    if resultado.rowcount != 1:
        raise ConflitoRascunho()
    session.refresh(definicao)


def publicar(
    session: Session, definicao: CartaDefinicaoRegistro, *, ator_id: str, versao_esperada: int,
    promover_ativos: bool = False, armazenamento: ArmazenamentoObjetos | None = None,
) -> tuple[CartaVersaoRegistro | None, ValidacaoCarta]:
    """Cria a próxima versão imutável a partir do rascunho, se válido."""
    rascunho = definicao.rascunho or {}
    dados = dict(rascunho.get("conteudo") or {})
    privados = dados.pop("ativos_privados", [])
    if not isinstance(privados, list) or any(not isinstance(item, str) for item in privados):
        return None, ValidacaoCarta(valida=False, problemas=[ProblemaValidacao(
            campo="ativos_privados", mensagem="Lista de artes privadas inválida.")])
    if privados and (not promover_ativos or armazenamento is None):
        return None, ValidacaoCarta(valida=False, problemas=[ProblemaValidacao(
            campo="ativos_privados", mensagem="Confirme a cópia da arte privada para a mesa antes de publicar.")])
    if privados:
        if definicao.versao != versao_esperada:
            raise ConflitoRascunho()
        promovidos = []
        for caminho in dict.fromkeys(privados):
            ativo = session.scalar(select(AtivoCatalogoRegistro).where(
                AtivoCatalogoRegistro.mesa_id == definicao.mesa_id,
                AtivoCatalogoRegistro.bucket == BUCKET_PRIVADO,
                AtivoCatalogoRegistro.caminho == caminho,
            ))
            if ativo is None or not caminho.startswith(f"mesas/{definicao.mesa_id}/narrador/legado/"):
                raise AtivoInvalido("Arte privada sem procedência nesta mesa.")
            objeto = armazenamento.ler(BUCKET_PRIVADO, caminho)
            if objeto is None or len(objeto) != ativo.tamanho or hashlib.sha256(objeto).hexdigest() != ativo.sha256:
                raise AtivoInvalido("Integridade da arte privada falhou.")
            destino = f"mesas/{definicao.mesa_id}/mesa/cartas/{ativo.sha256}.{ativo.caminho.rsplit('.', 1)[-1]}"
            armazenamento.gravar(BUCKET_PRIVADO, destino, objeto, ativo.tipo)
            if hashlib.sha256(armazenamento.ler(BUCKET_PRIVADO, destino) or b"").hexdigest() != ativo.sha256:
                raise AtivoInvalido("Integridade da arte compartilhada falhou.")
            promovidos.append({"origem": caminho, "destino": destino, "sha256": ativo.sha256,
                               "tipo": ativo.tipo, "tamanho": ativo.tamanho})
        dados["ativos"] = list(dict.fromkeys([*(dados.get("ativos") or []),
                                                *(item["destino"] for item in promovidos)]))
    else:
        promovidos = []
    conteudo, validacao = validar(definicao.tipo, dados, definicao.mesa_id)
    if conteudo is None:
        return None, validacao
    numero = (definicao.versao_publicada or 0) + 1
    resultado = session.execute(
        update(CartaDefinicaoRegistro)
        .where(CartaDefinicaoRegistro.id == definicao.id, CartaDefinicaoRegistro.versao == versao_esperada)
        .values(versao_publicada=numero, versao=CartaDefinicaoRegistro.versao + 1)
        .execution_options(synchronize_session=False)
    )
    if resultado.rowcount != 1:
        raise ConflitoRascunho()
    versao = CartaVersaoRegistro(
        id=uuid4().hex, mesa_id=definicao.mesa_id, definicao_id=definicao.id, numero=numero, tipo=definicao.tipo,
        conteudo=conteudo, procedencia={**(rascunho.get("procedencia") or {}), "publicado_por": ator_id,
                                       "ativos_promovidos": promovidos},
        revisao_pendente=validacao.revisao_pendente, publicado_por=ator_id,
    )
    session.add(versao)
    session.flush()
    session.refresh(definicao)
    return versao, validacao


def versao_publicada(session: Session, definicao: CartaDefinicaoRegistro) -> CartaVersaoRegistro | None:
    if definicao.versao_publicada is None:
        return None
    return session.scalar(select(CartaVersaoRegistro).where(
        CartaVersaoRegistro.definicao_id == definicao.id, CartaVersaoRegistro.numero == definicao.versao_publicada,
    ))


def rascunho_de_codigo(codigo: str) -> tuple[str, dict[str, Any], list[str], dict[str, Any]]:
    """Converte um código portátil E/EQ em rascunho de carta. ValueError se inválido."""
    previa = ficha_viva.preparar_importacao(codigo)
    prefixo = (codigo or "").strip().split(":", 1)[0]
    procedencia = {"origem": "importacao", "formato": prefixo}

    def modificadores(efeito: ficha_viva.EfeitoImportado) -> list[dict[str, Any]]:
        return [
            {"alvo": op["alvo"], "valor": op["valor"], "contexto": op.get("contexto")}
            for op in efeito.operacoes if op["tipo"] == "modificador" and op.get("valor") is not None
        ]

    if previa.tipo == "efeito":
        [efeito] = previa.efeitos
        return "efeito", {"titulo": efeito.nome, "texto": efeito.descricao,
                          "modificadores": modificadores(efeito)}, previa.avisos, procedencia
    item = dict(previa.item or {})
    nome = str(item.pop("nome")).strip()
    texto = str(item.pop("descricao", "") or "").strip() or f"{nome}, importado de código {prefixo}."
    quantidade = item.pop("quantidade", 1)
    return "item", {
        "titulo": nome, "texto": texto, "item_tipo": previa.item_tipo, "dados": item,
        "quantidade": quantidade if isinstance(quantidade, int) and quantidade > 0 else 1,
        "efeitos": [
            {"nome": e.nome, "descricao": e.descricao, "modificadores": modificadores(e),
             "ativacao": "enquanto_equipado" if (e.ativacao or "enquanto_equipado") == "enquanto_equipado" else "manual"}
            for e in previa.efeitos
        ],
    }, previa.avisos, procedencia
