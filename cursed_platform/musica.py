"""Música e som ambiente da mesa na Sala (musica-da-sala).

A biblioteca é um catálogo da plataforma (``catalogos/musicas.json``), igual para todas as mesas, só com faixas
CC BY ou CC0, que permitem uso comercial (decisão do usuário, 2026-10-03). Há dois tipos de faixa, que tocam em duas
camadas ao mesmo tempo (decisão do usuário): **ambiente** (som de fundo em repetição) e **música** (com Momento). Toda
faixa tem um ou mais **Estilos** de jogo (Medieval, Moderno, Ficção científica: a divisão principal da biblioteca,
pedida pelo usuário) e, se for de um lugar, o **Cenário**; sem Cenário, serve em qualquer lugar. As listas de Estilos,
Momentos e Cenários ficam no próprio catálogo, para uma categoria nova valer sem reiniciar o servidor.

O estado de cada camada de cada mesa fica no servidor: a faixa, se está tocando, a posição no momento da última
mudança e esse momento, no relógio do servidor. Só o Narrador muda. Cada navegador toca a faixa na posição esperada
(posição guardada + tempo passado), com a volta pelo começo quando ``repetir`` está ligado. A mudança avisa a mesa
pelo Realtime (``sala.musica``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Callable

from sqlalchemy.orm import Session

from cursed_platform.persistence import MusicaRegistro
from cursed_platform.sala import emitir


ARQUIVO = Path(__file__).resolve().parent / "catalogos" / "musicas.json"
PASTA_DO_AUDIO = Path(__file__).resolve().parents[1] / "platform" / "frontend" / "public" / "musica"
CAMINHO_PUBLICO = "/musica/"

CAMADAS = ("ambiente", "musica")
NOME_DA_CAMADA = {"ambiente": "Ambiente", "musica": "Música"}
# Só licenças que permitem uso comercial: o sistema pode ter funções pagas no futuro.
LICENCAS = {
    "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
    "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
    "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
}
EVENTO = "sala.musica"


class MusicaInvalida(ValueError):
    """Pedido fora da biblioteca ou dos limites (422)."""


class BibliotecaInvalida(ValueError):
    """O catálogo de músicas não segue o formato esperado."""


@dataclass(frozen=True)
class Faixa:
    id: str
    tipo: str
    titulo: str
    autor: str
    licenca: str
    licenca_url: str
    origem_url: str
    arquivo: str
    duracao_s: int
    estilos: tuple[str, ...]
    momento: str | None
    cenario: str | None
    sem_emenda: bool

    def para_resposta(self) -> dict[str, Any]:
        return {"id": self.id, "tipo": self.tipo, "titulo": self.titulo, "autor": self.autor, "licenca": self.licenca,
                "licenca_url": self.licenca_url, "origem_url": self.origem_url,
                "arquivo": CAMINHO_PUBLICO + self.arquivo, "duracao_s": self.duracao_s,
                "estilos": list(self.estilos), "momento": self.momento, "cenario": self.cenario,
                "sem_emenda": self.sem_emenda}


@dataclass(frozen=True)
class Catalogo:
    estilos: tuple[str, ...]
    momentos: tuple[str, ...]
    cenarios: tuple[str, ...]
    faixas: tuple[Faixa, ...]


def _lista(dados: dict, chave: str) -> tuple[str, ...]:
    valores = dados.get(chave)
    if (not isinstance(valores, list) or not valores or len(set(valores)) != len(valores)
            or not all(isinstance(v, str) and v.strip() for v in valores)):
        raise BibliotecaInvalida(f"O catálogo precisa de uma lista '{chave}' de textos únicos.")
    return tuple(valores)


def validar_catalogo(dados: Any) -> Catalogo:
    """Lê e confere o catálogo: listas de Estilos, Momentos e Cenários; em cada faixa, campos, tipo, licença aberta
    com o link certo, um ou mais Estilos, Momento (só nas músicas) e Cenário (opcional) das listas, e ids únicos."""
    if not isinstance(dados, dict) or not isinstance(dados.get("faixas"), list):
        raise BibliotecaInvalida("O catálogo precisa de uma lista 'faixas'.")
    estilos, momentos, cenarios = _lista(dados, "estilos"), _lista(dados, "momentos"), _lista(dados, "cenarios")
    faixas: list[Faixa] = []
    vistos: set[str] = set()
    for item in dados["faixas"]:
        try:
            faixa = Faixa(**{**item, "estilos": tuple(item.get("estilos") or ())})
        except TypeError as erro:
            raise BibliotecaInvalida(f"Faixa com campos errados: {item!r}") from erro
        if not faixa.id or faixa.id in vistos:
            raise BibliotecaInvalida(f"Id vazio ou repetido: {faixa.id!r}.")
        if faixa.tipo not in CAMADAS:
            raise BibliotecaInvalida(f"{faixa.titulo}: tipo {faixa.tipo!r} não é ambiente nem música.")
        if LICENCAS.get(faixa.licenca) != faixa.licenca_url:
            raise BibliotecaInvalida(f"{faixa.titulo}: só CC BY ou CC0, com o link da licença ({faixa.licenca!r}).")
        if faixa.tipo == "musica" and faixa.momento not in momentos:
            raise BibliotecaInvalida(f"{faixa.titulo}: Momento {faixa.momento!r} fora da lista.")
        if faixa.tipo == "ambiente" and faixa.momento is not None:
            raise BibliotecaInvalida(f"{faixa.titulo}: ambiente não tem Momento.")
        if not faixa.estilos or len(set(faixa.estilos)) != len(faixa.estilos) or not set(faixa.estilos) <= set(estilos):
            raise BibliotecaInvalida(f"{faixa.titulo}: Estilos {list(faixa.estilos)!r} fora da lista.")
        if faixa.cenario is not None and faixa.cenario not in cenarios:
            raise BibliotecaInvalida(f"{faixa.titulo}: Cenário {faixa.cenario!r} fora da lista.")
        if not isinstance(faixa.duracao_s, int) or faixa.duracao_s <= 0:
            raise BibliotecaInvalida(f"{faixa.titulo}: duração inválida.")
        if "/" in faixa.arquivo or "\\" in faixa.arquivo or not faixa.arquivo:
            raise BibliotecaInvalida(f"{faixa.titulo}: o arquivo é só o nome dentro da pasta de música.")
        vistos.add(faixa.id)
        faixas.append(faixa)
    return Catalogo(estilos, momentos, cenarios, tuple(faixas))


_lida: tuple[float, Catalogo] | None = None


def catalogo() -> Catalogo:
    """O catálogo atual. Como os outros catálogos, o arquivo é relido quando muda, sem reiniciar o servidor; um
    arquivo inválido mantém a última versão válida (e, sem nenhuma, levanta o erro)."""
    global _lida
    modificado = ARQUIVO.stat().st_mtime
    if _lida is not None and _lida[0] == modificado:
        return _lida[1]
    try:
        lido = validar_catalogo(json.loads(ARQUIVO.read_text(encoding="utf-8")))
    except (ValueError, OSError):
        if _lida is None:
            raise
        return _lida[1]
    _lida = (modificado, lido)
    return lido


def biblioteca() -> tuple[Faixa, ...]:
    return catalogo().faixas


def faixa(faixa_id: str) -> Faixa | None:
    return next((f for f in biblioteca() if f.id == faixa_id), None)


# ------------------------------------------------------------------ estado da mesa

def relogio() -> datetime:
    return datetime.now(timezone.utc)


def _utc(momento: datetime) -> datetime:
    # O SQLite devolve sem fuso; o valor gravado é sempre UTC.
    return momento if momento.tzinfo is not None else momento.replace(tzinfo=timezone.utc)


def _camada(session: Session, mesa_id: str, camada: str) -> dict[str, Any]:
    registro = session.get(MusicaRegistro, (mesa_id, camada))
    if registro is None:
        return {"faixa_id": None, "tocando": False, "posicao_ms": 0, "repetir": True, "alterada_em": None}
    return {"faixa_id": registro.faixa_id, "tocando": registro.tocando, "posicao_ms": registro.posicao_ms,
            "repetir": registro.repetir, "alterada_em": _utc(registro.alterada_em)}


def estado(session: Session, mesa_id: str) -> dict[str, dict[str, Any]]:
    """O que a mesa está ouvindo, por camada. Camada que nunca tocou: sem faixa, parada, com "Repetir" ligado."""
    return {camada: _camada(session, mesa_id, camada) for camada in CAMADAS}


def alterar(session: Session, mesa_id: str, autor_id: str, camada: str, *, faixa_id: str | None, tocando: bool,
            posicao_ms: int, repetir: bool, agora: Callable[[], datetime] = relogio) -> dict[str, Any]:
    """Grava o estado da camada pedido pelo Narrador (quem chama confere a permissão) e avisa a mesa."""
    if camada not in CAMADAS:
        raise MusicaInvalida("Camada desconhecida: escolha ambiente ou música.")
    if faixa_id is not None:
        escolhida = faixa(faixa_id)
        if escolhida is None:
            raise MusicaInvalida("Essa faixa não está na biblioteca.")
        if escolhida.tipo != camada:
            raise MusicaInvalida(f"{escolhida.titulo} não é {'um ambiente' if camada == 'ambiente' else 'uma música'}.")
    if posicao_ms < 0:
        raise MusicaInvalida("A posição não pode ser negativa.")
    if faixa_id is None:
        tocando, posicao_ms = False, 0
    registro = session.get(MusicaRegistro, (mesa_id, camada))
    if registro is None:
        registro = MusicaRegistro(mesa_id=mesa_id, camada=camada)
        session.add(registro)
    registro.faixa_id = faixa_id
    registro.tocando = tocando
    registro.posicao_ms = posicao_ms
    registro.repetir = repetir
    registro.alterada_em = agora()
    registro.alterada_por = autor_id
    session.flush()
    emitir(session, mesa_id, EVENTO, {"camada": camada}, publico=True)
    return _camada(session, mesa_id, camada)


def descrever(camada: str, antes: dict[str, Any], depois: dict[str, Any]) -> str:
    """Resumo da mudança para a auditoria da mesa."""
    nome = NOME_DA_CAMADA[camada]
    atual = faixa(depois["faixa_id"]) if depois["faixa_id"] else None
    if atual is None:
        return f"{nome} parado" if camada == "ambiente" else f"{nome} parada"
    rotulos = " · ".join(r for r in (atual.momento, atual.cenario) if r)
    if depois["faixa_id"] != antes["faixa_id"]:
        return f"{nome}: {atual.titulo} ({rotulos})" if rotulos else f"{nome}: {atual.titulo}"
    if depois["tocando"] != antes["tocando"]:
        acao = ("continuado" if depois["tocando"] else "pausado") if camada == "ambiente" \
            else ("continuada" if depois["tocando"] else "pausada")
        return f"{nome} {acao}: {atual.titulo}"
    if depois["repetir"] != antes["repetir"]:
        return f"Repetir {'ligado' if depois['repetir'] else 'desligado'}: {atual.titulo}"
    return f"{nome}: {atual.titulo}"
