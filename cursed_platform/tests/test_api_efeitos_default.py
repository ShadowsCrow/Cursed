"""Efeitos default na mesa: substituição e aplicação pelo jogador (tarefas 5.3 e 5.4)."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import (
    Base, EfeitoAplicadoRegistro, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro, PersonagemRegistro,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "platform" / "api"))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                MembroRegistro(mesa_id="mesa", usuario_id="bruno", papel="jogador"),
                PersonagemRegistro(id="lia", mesa_id="mesa", proprietario_id="ana", versao=0,
                                   ficha={"personagem": {"nome": "Lia"}}),
                PersonagemRegistro(id="bram", mesa_id="mesa", proprietario_id="bruno", versao=0,
                                   ficha={"personagem": {"nome": "Bram"}}),
            ])
            session.commit()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.ator = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def versao(self, personagem_id: str) -> int:
        with Session(self.engine) as session:
            return session.get(PersonagemRegistro, personagem_id).versao

    def aplicar(self, personagem_id: str, corpo: dict, ator: str | None = None):
        if ator:
            self.ator = ator
        return self.client.post(f"/mesas/mesa/personagens/{personagem_id}/efeitos",
                                json={"versao_esperada": self.versao(personagem_id), **corpo},
                                headers={"X-Correlation-ID": "cmd"})

    def estados(self, personagem_id: str) -> dict[str, str]:
        with Session(self.engine) as session:
            return {e.associacao or e.nome: e.estado for e in session.scalars(
                select(EfeitoAplicadoRegistro).where(EfeitoAplicadoRegistro.personagem_id == personagem_id))}

    def politica(self, editar: bool) -> None:
        with Session(self.engine) as session:
            session.get(MesaRegistro, "mesa").permitir_edicao_propria = editar
            session.commit()


class SubstituicaoTest(_Base):
    def test_cego_encerra_ofuscado_com_dois_eventos(self):
        self.assertEqual(self.aplicar("lia", {"associacao": "condicao_ofuscado"}).status_code, 201)
        resposta = self.aplicar("lia", {"associacao": "condicao_cego"})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertEqual(self.estados("lia"), {"condicao_ofuscado": "encerrado", "condicao_cego": "ativo"})
        with Session(self.engine) as session:
            eventos = [(e.acao, e.resumo) for e in session.scalars(select(EventoAuditoriaRegistro).where(
                EventoAuditoriaRegistro.categoria == "efeito", EventoAuditoriaRegistro.correlacao_id == "cmd",
            ).order_by(EventoAuditoriaRegistro.id))]
        acoes = [a for a, _ in eventos]
        self.assertEqual(acoes.count("efeito.aplicado"), 2)
        self.assertEqual(acoes[-1], "efeito.encerrado")
        self.assertIn("substituído por Cego", eventos[-1][1])

    def test_sem_ofuscado_nada_e_encerrado(self):
        self.assertEqual(self.aplicar("lia", {"associacao": "condicao_cego"}).status_code, 201)
        self.assertEqual(self.estados("lia"), {"condicao_cego": "ativo"})


class JogadorAplicaCondicaoTest(_Base):
    def test_jogador_marca_que_caiu(self):
        resposta = self.aplicar("lia", {"associacao": "condicao_derrubado"}, ator="ana")
        self.assertEqual(resposta.status_code, 201, resposta.text)
        with Session(self.engine) as session:
            evento = session.scalar(select(EventoAuditoriaRegistro).where(EventoAuditoriaRegistro.acao == "efeito.aplicado"))
        self.assertEqual(evento.ator_id, "ana")
        efeito_id = resposta.json()["efeito"]["id"]
        encerrado = self.client.post(f"/mesas/mesa/personagens/lia/efeitos/{efeito_id}/encerrar",
                                     json={"versao_esperada": self.versao("lia")})
        self.assertEqual(encerrado.status_code, 200, encerrado.text)
        self.assertEqual(self.estados("lia"), {"condicao_derrubado": "encerrado"})

    def test_jogador_nao_aplica_em_outro_personagem(self):
        self.assertIn(self.aplicar("bram", {"associacao": "condicao_agarrado"}, ator="ana").status_code, (403, 404))
        self.assertEqual(self.estados("bram"), {})

    def test_mesa_bloqueia_edicao_do_jogador(self):
        self.politica(editar=False)
        self.assertEqual(self.aplicar("lia", {"associacao": "condicao_derrubado"}, ator="ana").status_code, 403)
        self.assertEqual(self.estados("lia"), {})

    def test_jogador_nao_cria_efeito_personalizado(self):
        corpo = {"nome": "Bênção", "descricao": "Inventada", "modificadores": [{"alvo": "ataque", "valor": 5}]}
        self.assertEqual(self.aplicar("lia", corpo, ator="ana").status_code, 403)
        self.assertEqual(self.estados("lia"), {})

    def test_jogador_nao_encerra_efeito_personalizado(self):
        corpo = {"nome": "Maldição", "descricao": "Do Narrador"}
        efeito_id = self.aplicar("lia", corpo).json()["efeito"]["id"]
        self.ator = "ana"
        resposta = self.client.post(f"/mesas/mesa/personagens/lia/efeitos/{efeito_id}/encerrar",
                                    json={"versao_esperada": self.versao("lia")})
        self.assertEqual(resposta.status_code, 403)

    def test_sobrepeso_continua_fora(self):
        resposta = self.aplicar("lia", {"associacao": "cc_above"}, ator="ana")
        self.assertEqual(resposta.status_code, 403)
        self.assertEqual(self.aplicar("lia", {"associacao": "cc_above"}, ator="mestre").status_code, 422)


class IconeNoEfeitoTest(_Base):
    def test_efeito_traz_icone_estavel_e_o_da_mesa_prevalece(self):
        derrubado = self.aplicar("lia", {"associacao": "condicao_derrubado"}).json()["efeito"]
        self.assertEqual(derrubado["icone"], {"origem": "padrao", "caminho": "/icones/efeitos/padrao.webp"})
        self.assertEqual(derrubado["associacao"], "condicao_derrubado")
        with Session(self.engine) as session:
            from cursed_platform import icones_efeitos
            icones_efeitos.definir_da_mesa(session, "mesa", "condicao_derrubado", "mesas/mesa/mesa/icones-efeitos/x.webp")
            session.commit()
        [listado] = self.client.get("/mesas/mesa/personagens/lia/efeitos").json()
        self.assertEqual(listado["icone"], {"origem": "mesa", "caminho": "mesas/mesa/mesa/icones-efeitos/x.webp"})


if __name__ == "__main__":
    unittest.main()
