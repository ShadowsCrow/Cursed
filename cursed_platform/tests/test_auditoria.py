from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, select, text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.config import PlatformSettings
from cursed_platform.domain.equip_codec import encode_equipment_eq1
from cursed_platform.persistence import (
    Base, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro, PersonagemRegistro, SessaoRegistro,
)


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

ESCUDO = encode_equipment_eq1("armadura", {"nome": "Escudo", "armadura": 1}, [
    {"kind": "externo", "nome": "Bloqueio", "descricao": "+1 em Defesa (Armadura).",
     "modificadores": [{"alvo": "defesa:armadura", "valor": 1}]},
])


class AuditoriaTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool,
        )
        event.listen(self.engine, "connect", lambda conexao, _: conexao.execute("PRAGMA foreign_keys=ON"))
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.flush()
            session.add_all([
                MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
                MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
                MembroRegistro(mesa_id="mesa", usuario_id="bruno", papel="jogador"),
            ])
            session.flush()
            session.add(PersonagemRegistro(
                id="npc", mesa_id="mesa", tipo="npc", visibilidade="narrador",
                ficha={"personagem": {"nome": "Rainha Oculta"}, "atributos": {"valores": {"Vigor": 5}}},
            ))
            session.commit()
        settings = PlatformSettings(
            environment="test", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",),
        )
        self.app = create_app(settings, engine=self.engine)
        self.actor = "ana"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.actor)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    # ---------------------------------------------------------------- apoio

    def as_(self, actor: str) -> TestClient:
        self.actor = actor
        return self.client

    def eventos(self, actor: str = "mestre", **filtros) -> list[dict]:
        response = self.as_(actor).get("/mesas/mesa/auditoria", params=filtros)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["eventos"]

    def acoes(self, actor: str = "mestre", **filtros) -> list[str]:
        return [e["acao"] for e in self.eventos(actor, **filtros)]

    def total_eventos(self) -> int:
        with Session(self.engine) as session:
            return len(session.scalars(select(EventoAuditoriaRegistro)).all())

    def criar(self, actor: str, nome: str, **extra) -> str:
        response = self.as_(actor).post("/mesas/mesa/personagens", json={"ficha": {
            "personagem": {"nome": nome}, "atributos": {"valores": {"Vigor": 2}}, **extra,
        }})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["personagem_id"]

    def ficha(self, actor: str, personagem_id: str) -> dict:
        return self.as_(actor).get(f"/mesas/mesa/personagens/{personagem_id}/ficha").json()

    def salvar(self, actor: str, personagem_id: str, alterar, comando_id: str = "cmd"):
        atual = self.ficha(actor, personagem_id)
        ficha = atual["ficha"]
        alterar(ficha)
        return self.as_(actor).put(f"/mesas/mesa/personagens/{personagem_id}/ficha", json={
            "id": comando_id, "mesa_id": "mesa", "personagem_id": personagem_id, "ator_id": actor,
            "versao_esperada": atual["versao"], "ficha": ficha,
        })

    # ---------------------------------------------------------------- 7.1

    def test_eventos_sao_append_only_restritos_e_indexados(self):
        self.criar("ana", "Lia")
        with Session(self.engine) as session:
            evento = session.scalars(select(EventoAuditoriaRegistro)).one()
            for comando in ("UPDATE audit_events SET resumo = 'x'", "DELETE FROM audit_events"):
                with self.subTest(comando=comando), self.assertRaises(DBAPIError):
                    session.execute(text(comando))
                session.rollback()
            with self.assertRaises(IntegrityError):
                session.execute(text("DELETE FROM rpg_tables WHERE id = 'mesa'"))
            session.rollback()
            session.add(EventoAuditoriaRegistro(
                mesa_id="mesa", categoria="inexistente", acao="x", relevancia="mecanica",
                origem="usuario", visibilidade="mesa", resumo="x", detalhes={},
            ))
            with self.assertRaises(IntegrityError):
                session.flush()
            session.rollback()
            self.assertEqual(session.get(EventoAuditoriaRegistro, evento.id).resumo, "Lia: personagem criado")
        indices = {i["name"] for i in inspect(self.engine).get_indexes("audit_events")}
        self.assertTrue({
            "ix_audit_events_mesa_seq", "ix_audit_events_mesa_personagem", "ix_audit_events_mesa_categoria",
            "ix_audit_events_mesa_ator", "ix_audit_events_mesa_sessao", "ix_audit_events_correlacao_id",
        } <= indices)

    # ---------------------------------------------------------------- 7.2

    def test_cada_comando_confirmado_gera_um_evento_semantico(self):
        lia = self.criar("ana", "Lia")
        resposta = self.salvar("ana", lia, lambda f: f["atributos"]["valores"].update(Vigor=3), "cmd-vigor")
        self.assertEqual(resposta.status_code, 200)
        item = self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/importacoes",
                                    json={"codigo": ESCUDO, "versao_esperada": 1}).json()["item"]["id"]
        self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/inventario/{item}/equipar",
                             json={"equipado": True, "versao_esperada": 2})
        self.as_("mestre").put("/mesas/mesa/politicas", json={
            "permitir_criacao_propria": True, "permitir_edicao_propria": True,
            "permitir_exclusao_propria": True, "campos_exigem_aprovacao": ["personalidade"],
        })
        self.as_("mestre").post(f"/mesas/mesa/personagens/{lia}/transferencia",
                                json={"proprietario_id": "bruno", "versao_esperada": 3})
        self.as_("mestre").delete(f"/mesas/mesa/personagens/{lia}?versao_esperada=4")
        self.as_("mestre").post(f"/mesas/mesa/personagens/{lia}/restauracao?versao_esperada=5")
        self.as_("mestre").delete("/mesas/mesa/participantes/bruno")

        self.assertEqual(list(reversed(self.acoes())), [
            "personagem.criado", "ficha.atualizada", "importacao.aplicada", "item.equipado",
            "politica.alterada", "personagem.transferido", "personagem.excluido", "personagem.restaurado",
            "participante.removido",
        ])
        vigor = next(e for e in self.eventos() if e["acao"] == "ficha.atualizada")
        self.assertEqual((vigor["ator_id"], vigor["personagem_id"], vigor["relevancia"], vigor["correlacao_id"]),
                         ("ana", lia, "mecanica", "cmd-vigor"))
        self.assertEqual([(m["campo"], m["antes"], m["depois"]) for m in vigor["mudancas"]],
                         [("atributos.valores.Vigor", 2, 3)])
        self.assertEqual(vigor["resumo"], "Lia: atributos.valores.Vigor de 2 para 3")
        equipou = next(e for e in self.eventos() if e["acao"] == "item.equipado")
        self.assertEqual([m["campo"].split(".")[0] for m in equipou["mudancas"]], ["equipado", "efeitos"])

    def test_falhas_nao_deixam_evento_sem_alteracao_nem_alteracao_sem_evento(self):
        lia = self.criar("ana", "Lia")
        antes = self.total_eventos()
        conflito = self.as_("ana").put(f"/mesas/mesa/personagens/{lia}/ficha", json={
            "id": "c", "mesa_id": "mesa", "personagem_id": lia, "ator_id": "ana", "versao_esperada": 9,
            "ficha": {"personagem": {"nome": "Outra"}},
        })
        self.assertEqual(conflito.status_code, 409)
        self.assertEqual(self.as_("mestre").post(f"/mesas/mesa/personagens/{lia}/transferencia", json={
            "proprietario_id": "estranho", "versao_esperada": 0}).status_code, 422)
        self.assertEqual(self.as_("bruno").delete(f"/mesas/mesa/personagens/{lia}?versao_esperada=0").status_code, 404)
        self.assertEqual(self.total_eventos(), antes)

        with patch("cursed_platform.auditoria.registrar", side_effect=RuntimeError("falha no log")):
            for chamada in (
                lambda: self.salvar("ana", lia, lambda f: f["personagem"].update(nome="Lia Nova")),
                lambda: self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/importacoes",
                                             json={"codigo": ESCUDO, "versao_esperada": 0}),
                lambda: self.as_("mestre").delete(f"/mesas/mesa/personagens/{lia}?versao_esperada=0"),
            ):
                with self.assertRaises(RuntimeError):
                    chamada()
        estado = self.ficha("ana", lia)
        self.assertEqual((estado["versao"], estado["ficha"]["personagem"]["nome"]), (0, "Lia"))
        self.assertEqual(self.as_("ana").get(f"/mesas/mesa/personagens/{lia}/inventario").json(), [])
        self.assertEqual(self.total_eventos(), antes)

    # ---------------------------------------------------------------- 7.3

    def test_edicoes_intermediarias_e_consultas_nao_poluem_o_log(self):
        lia = self.criar("ana", "Lia")

        def varias(f):
            f["personagem"]["nome"] = "Lia Final"
            f.setdefault("personalidade", {})["lema"] = "Sempre adiante"
            f["atributos"]["valores"]["Vigor"] = 4

        self.salvar("ana", lia, varias)
        [evento] = self.eventos(categoria="ficha")
        self.assertEqual(len(evento["mudancas"]), 3)
        self.assertEqual(evento["resumo"], "Lia Final: 3 campos alterados (atributos.valores.Vigor, "
                                           "personagem.nome, personalidade.lema)")

        total = self.total_eventos()
        mesmo = self.salvar("ana", lia, lambda f: None)
        self.assertEqual((mesmo.status_code, mesmo.json()["versao"]), (200, 1))
        self.as_("ana").get(f"/mesas/mesa/personagens/{lia}/valores-derivados")
        self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/importacoes/previa", json={"codigo": ESCUDO})
        item = self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/importacoes",
                                    json={"codigo": ESCUDO, "versao_esperada": 1}).json()["item"]["id"]
        repetido = self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/inventario/{item}/equipar",
                                        json={"equipado": False, "versao_esperada": 2})
        self.assertEqual((repetido.status_code, repetido.json()["versao"]), (200, 2))
        self.assertEqual(self.total_eventos(), total + 1)

    # ---------------------------------------------------------------- 7.4

    def test_filtros_combinados_e_paginacao(self):
        lia = self.criar("ana", "Lia")
        with Session(self.engine) as session:
            session.add(SessaoRegistro(id="s1", mesa_id="mesa", numero=1))
            session.commit()
        bram = self.criar("bruno", "Bram")
        item = self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/importacoes",
                                    json={"codigo": ESCUDO, "versao_esperada": 0}).json()["item"]["id"]
        self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/inventario/{item}/equipar",
                             json={"equipado": True, "versao_esperada": 1})
        self.salvar("bruno", bram, lambda f: f["personagem"].update(apelido="B"))

        casos = (
            ({"personagem_id": lia, "categoria": "inventario"}, ["item.equipado", "importacao.aplicada"]),
            ({"personagem_id": lia, "categoria": "inventario", "relevancia": "mecanica", "ator_id": "ana"},
             ["item.equipado", "importacao.aplicada"]),
            ({"ator_id": "bruno"}, ["ficha.atualizada", "personagem.criado"]),
            ({"ator_id": "bruno", "relevancia": "narrativa"}, ["ficha.atualizada"]),
            ({"sessao_id": "s1"}, ["ficha.atualizada", "item.equipado", "importacao.aplicada", "personagem.criado"]),
            ({"sessao_id": "s1", "ator_id": "ana"}, ["item.equipado", "importacao.aplicada"]),
            ({"categoria": "personagem", "sessao_id": "s1"}, ["personagem.criado"]),
            ({"personagem_id": bram, "categoria": "inventario"}, []),
        )
        for filtros, esperado in casos:
            with self.subTest(**filtros):
                self.assertEqual(self.acoes(**filtros), esperado)

        primeira = self.as_("mestre").get("/mesas/mesa/auditoria", params={"limite": 2}).json()
        segunda = self.as_("mestre").get(
            "/mesas/mesa/auditoria", params={"limite": 2, "antes_de": primeira["proximo_cursor"]}
        ).json()
        ids = [e["id"] for e in primeira["eventos"] + segunda["eventos"]]
        self.assertEqual(ids, sorted(ids, reverse=True))
        self.assertEqual(len(set(ids)), 4)

    # ---------------------------------------------------------------- 7.5

    def test_correcao_cria_novo_evento_vinculado_e_preserva_o_original(self):
        lia = self.criar("ana", "Lia")
        self.salvar("ana", lia, lambda f: f["atributos"]["valores"].update(Vigor=9))
        original = self.eventos(categoria="ficha")[0]
        self.assertTrue(original["corrigivel"])
        self.assertFalse(self.eventos("ana", categoria="ficha")[0]["corrigivel"])

        caminho = f"/mesas/mesa/auditoria/{original['id']}/correcao"
        self.assertEqual(self.as_("ana").post(caminho, json={"versao_esperada": 1}).status_code, 403)
        self.assertEqual(self.as_("mestre").post(caminho, json={"versao_esperada": 0}).status_code, 409)
        correcao = self.as_("mestre").post(caminho, json={"versao_esperada": 1, "motivo": "Valor digitado errado"})
        self.assertEqual(correcao.status_code, 201, correcao.text)
        corpo = correcao.json()
        self.assertEqual((corpo["acao"], corpo["corrige_evento_id"], corpo["ator_id"], corpo["motivo"]),
                         ("correcao.aplicada", original["id"], "mestre", "Valor digitado errado"))
        self.assertEqual([(m["campo"], m["antes"], m["depois"]) for m in corpo["mudancas"]],
                         [("atributos.valores.Vigor", 9, 2)])
        self.assertEqual(self.ficha("ana", lia)["ficha"]["atributos"]["valores"]["Vigor"], 2)

        historico = {e["id"]: e for e in self.eventos(categoria="ficha")}
        self.assertEqual(historico[original["id"]]["resumo"], original["resumo"])
        self.assertEqual(historico[original["id"]]["corrigido_por"], [corpo["id"]])

        self.salvar("ana", lia, lambda f: f["atributos"]["valores"].update(Vigor=5))
        conflito = self.as_("mestre").post(caminho, json={"versao_esperada": 3})
        self.assertEqual(conflito.status_code, 409)
        self.assertIn("mudou depois", conflito.json()["detail"])
        criado = next(e for e in self.eventos() if e["acao"] == "personagem.criado")
        self.assertEqual(self.as_("mestre").post(f"/mesas/mesa/auditoria/{criado['id']}/correcao",
                                                 json={"versao_esperada": 3}).status_code, 422)

    def test_correcao_de_equipamento_transferencia_e_exclusao(self):
        lia = self.criar("ana", "Lia")
        item = self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/importacoes",
                                    json={"codigo": ESCUDO, "versao_esperada": 0}).json()["item"]["id"]
        self.as_("ana").post(f"/mesas/mesa/personagens/{lia}/inventario/{item}/equipar",
                             json={"equipado": True, "versao_esperada": 1})
        equipou = self.eventos(categoria="inventario")[0]
        resposta = self.as_("mestre").post(f"/mesas/mesa/auditoria/{equipou['id']}/correcao", json={"versao_esperada": 2})
        self.assertEqual(resposta.status_code, 201, resposta.text)
        self.assertFalse(self.as_("ana").get(f"/mesas/mesa/personagens/{lia}/inventario").json()[0]["equipado"])
        self.assertEqual(self.as_("ana").get(f"/mesas/mesa/personagens/{lia}/efeitos").json()[0]["estado"], "suspenso")

        self.as_("mestre").post(f"/mesas/mesa/personagens/{lia}/transferencia",
                                json={"proprietario_id": "bruno", "versao_esperada": 3})
        transferiu = self.eventos(categoria="personagem")[0]
        self.assertEqual(self.as_("mestre").post(f"/mesas/mesa/auditoria/{transferiu['id']}/correcao",
                                                 json={"versao_esperada": 4}).status_code, 201)
        self.assertEqual(self.as_("ana").get("/mesas/mesa/personagens").json()[0]["id"], lia)

        self.as_("ana").delete(f"/mesas/mesa/personagens/{lia}?versao_esperada=5")
        excluiu = self.eventos(categoria="personagem")[0]
        self.assertEqual(excluiu["acao"], "personagem.excluido")
        self.assertEqual(self.as_("mestre").post(f"/mesas/mesa/auditoria/{excluiu['id']}/correcao",
                                                 json={"versao_esperada": 6}).status_code, 201)
        self.assertEqual(self.ficha("ana", lia)["versao"], 7)
        self.assertEqual(sum(1 for e in self.eventos() if e["acao"] == "correcao.aplicada"), 3)

    # ---------------------------------------------------------------- 7.6

    def test_jogadores_nao_descobrem_recursos_ocultos_pelo_log(self):
        lia = self.criar("ana", "Lia")
        bram = self.criar("bruno", "Bram")
        self.as_("mestre").post("/mesas/mesa/convites", json={"validade_dias": 3})
        self.salvar("mestre", "npc", lambda f: f["atributos"]["valores"].update(Vigor=7))
        npc_evento = next(e for e in self.eventos() if e["personagem_id"] == "npc")
        self.as_("mestre").post(f"/mesas/mesa/auditoria/{npc_evento['id']}/correcao", json={"versao_esperada": 1})
        self.salvar("ana", lia, lambda f: f["personagem"].update(apelido="Li"))

        narrador = self.as_("mestre").get("/mesas/mesa/auditoria").text
        self.assertIn("Rainha Oculta", narrador)
        for jogador, proprio, alheio in (("ana", lia, bram), ("bruno", bram, lia)):
            with self.subTest(jogador=jogador):
                resposta = self.as_(jogador).get("/mesas/mesa/auditoria")
                self.assertEqual(resposta.status_code, 200)
                self.assertNotIn("Rainha Oculta", resposta.text)
                self.assertNotIn("npc", resposta.text)
                self.assertNotIn("convite", resposta.text)
                personagens = {e["personagem_id"] for e in resposta.json()["eventos"]}
                self.assertIn(proprio, personagens)
                self.assertNotIn(alheio, personagens)
                self.assertEqual(self.as_(jogador).get(
                    "/mesas/mesa/auditoria", params={"personagem_id": "npc"}).json()["eventos"], [])

        with Session(self.engine) as session:
            session.get(PersonagemRegistro, lia).visibilidade = "narrador"
            session.commit()
        self.assertNotIn(lia, {e["personagem_id"] for e in self.eventos("ana")})
        for externo in ("estranho",):
            self.assertEqual(self.as_(externo).get("/mesas/mesa/auditoria").status_code, 404)


if __name__ == "__main__":
    unittest.main()
