"""Código portátil de criações do Framework: ``CR1:`` (mudança `adaptar-cartas-ao-framework`, D6).

Mesmo formato dos códigos de efeito e equipamento: prefixo, dois-pontos e o JSON
comprimido com zlib e codificado em base64 seguro para URL. O conteúdo é o
rascunho de uma carta de habilidade ou magia (``tipo`` mais os campos aceitos pela
carta). Grau e Descansos Mínimos são aceitos só para conferência: saem do
Custo de Aprendizado, e a divergência vira aviso.

Linha de comando, usada pela skill ``arquiteto-de-magias``::

    python -m cursed_platform.domain.criacao_codec codificar criacao.json
    python -m cursed_platform.domain.criacao_codec decodificar CR1:...
"""

from __future__ import annotations

import json
import sys
from typing import Any, Mapping

from cursed_platform import catalogos
from cursed_platform.catalogos import chave
from cursed_platform.domain import criacao
from cursed_platform.domain.efeitos_codec import _decode_payload, _encode_payload

PREFIXO = "CR1"
_CONFERIDOS = ("grau", "descansos_minimos")


def decodificar(codigo: str) -> dict[str, Any]:
    """JSON do código, sem validação de conteúdo. ``ValueError`` se o código não puder ser lido."""
    return _decode_payload(codigo, PREFIXO)


def preparar(payload: Mapping[str, Any]) -> tuple[str, dict[str, Any], list[str]]:
    """Separa o tipo, descarta Grau e Descansos Mínimos e compara com o cálculo.

    Devolve ``(tipo, rascunho, avisos)``. A validação dos campos fica com ``cartas.validar``.
    """
    tipo = payload.get("tipo")
    if tipo not in criacao.NATUREZAS:
        raise ValueError("O código CR1 precisa declarar o tipo: 'habilidade' ou 'magia'.")
    rascunho = {k: v for k, v in payload.items() if k != "tipo" and k not in _CONFERIDOS}
    framework = catalogos.obter().framework
    calculados = criacao.calcular(framework, tipo, rascunho)
    avisos: list[str] = []
    grau = payload.get("grau")
    if grau is not None:
        rotulo = framework.rotulo("graus", calculados.grau) if calculados.grau else None
        if calculados.grau is None:
            avisos.append(f"Grau do código ({grau}) ignorado: sem Custo de Aprendizado válido, o Grau fica indefinido.")
        elif chave(grau) not in {chave(calculados.grau), chave(rotulo)}:
            avisos.append(f"Grau do código ({grau}) substituído pelo calculado ({rotulo}).")
    descansos = payload.get("descansos_minimos")
    if descansos is not None and descansos != calculados.descansos_minimos:
        calculado = calculados.descansos_minimos if calculados.descansos_minimos is not None else "indefinido"
        avisos.append(f"Descansos Mínimos do código ({descansos}) substituídos pelos calculados ({calculado}).")
    return tipo, rascunho, avisos


def codificar(payload: Mapping[str, Any]) -> str:
    """Código ``CR1`` de uma criação válida. ``ValueError`` com os problemas se a plataforma a recusaria."""
    from cursed_platform import cartas  # cartas importa este módulo para a importação

    tipo, rascunho, _ = preparar(payload)
    _, validacao = cartas.validar(tipo, rascunho, "skill", para_publicar=False)
    if not validacao.valida:
        raise ValueError("; ".join(f"{p.campo}: {p.mensagem}" for p in validacao.problemas))
    return _encode_payload(PREFIXO, {"tipo": tipo, **rascunho})


def _main(argv: list[str]) -> int:
    if len(argv) != 2 or argv[0] not in {"codificar", "decodificar"}:
        print("Uso: python -m cursed_platform.domain.criacao_codec codificar <arquivo.json> | decodificar <código>",
              file=sys.stderr)
        return 2
    acao, valor = argv
    try:
        if acao == "codificar":
            with open(valor, encoding="utf-8") as arquivo:
                payload = json.load(arquivo)
            if not isinstance(payload, dict):
                raise ValueError("O arquivo precisa conter um objeto JSON.")
            tipo, _, avisos = preparar(payload)
            for aviso in avisos:
                print(f"Aviso: {aviso}", file=sys.stderr)
            print(codificar(payload))
        else:
            print(json.dumps(decodificar(valor), ensure_ascii=False, indent=2))
    except (OSError, ValueError, json.JSONDecodeError) as erro:
        print(f"Erro: {erro}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    raise SystemExit(_main(sys.argv[1:]))
