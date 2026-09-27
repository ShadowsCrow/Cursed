"""Aplica o JSON do catálogo às cartas das mesas quando ele muda (calcular-valores-da-ficha, D1 e D5).

Ao subir, o servidor exige uma versão válida do catálogo e sincroniza as mesas. Depois, uma tarefa
em segundo plano confere a versão a cada poucos segundos e sincroniza de novo quando o arquivo muda.
A sincronização compara conteúdo, então repeti-la não cria versões.
"""

from __future__ import annotations

import threading
from typing import Callable

from sqlalchemy.orm import Session

from cursed_platform import cartas_catalogo
from cursed_platform.catalogos import CARREGADOR, CatalogoInvalido, Carregador
from cursed_platform.observabilidade import registrar

INTERVALO_SEGUNDOS = 5.0


class SincronizadorCatalogo:
    def __init__(self, session_factory: Callable[[], Session], carregador: Carregador = CARREGADOR,
                 intervalo: float = INTERVALO_SEGUNDOS) -> None:
        self.session_factory = session_factory
        self.carregador = carregador
        self.intervalo = intervalo
        self.versao_sincronizada: str | None = None
        self._parar = threading.Event()
        self._tarefa: threading.Thread | None = None

    def verificar(self) -> bool:
        """Sincroniza se a versão carregada mudou desde a última vez. Devolve se sincronizou."""
        catalogo = self.carregador.obter()
        if catalogo.versao == self.versao_sincronizada:
            return False
        with self.session_factory() as session:
            resultados = cartas_catalogo.sincronizar_todas(session, catalogo)
            session.commit()
        self.versao_sincronizada = catalogo.versao
        registrar("catalogo", acao="sincronizado", versao=catalogo.versao, mesas=len(resultados),
                  cartas_atualizadas=sum(len(r.atualizadas) for r in resultados.values()),
                  cartas_arquivadas=sum(len(r.arquivadas) for r in resultados.values()))
        return True

    def _laco(self) -> None:
        while not self._parar.wait(self.intervalo):
            try:
                self.verificar()
            except CatalogoInvalido:
                continue  # sem versão válida nova: o erro fica em GET /catalogos/estado
            except Exception as erro:  # noqa: BLE001 — a tarefa não pode morrer por uma falha pontual
                registrar("catalogo", acao="falha_sincronizacao", classe_erro=type(erro).__name__)

    def iniciar(self) -> None:
        self.verificar()  # sem catálogo válido, levanta e o servidor não sobe
        self._tarefa = threading.Thread(target=self._laco, name="sincronizador-catalogo", daemon=True)
        self._tarefa.start()

    def parar(self) -> None:
        self._parar.set()
        if self._tarefa is not None:
            self._tarefa.join(timeout=self.intervalo + 1)
