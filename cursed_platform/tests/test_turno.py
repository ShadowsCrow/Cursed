"""Modo turno no domínio (modo-de-turno, tarefas 2.1 a 2.3)."""

from __future__ import annotations

from itertools import count
import unittest

from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform import sala, sessoes, turno
from cursed_platform.persistence import (
    Base, CamadaCenaRegistro, MembroRegistro, MesaRegistro, ParticipanteCombateRegistro, PersonagemRegistro,
)


def montar_mesa(engine) -> dict[str, str]:
    """Mesa com Lion (ana), Kira (bia), dois Goblins (mesma ficha), um Ogro com token oculto e um baú sem personagem."""
    with Session(engine) as session:
        session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
        session.flush()
        session.add_all([MembroRegistro(mesa_id="mesa", usuario_id=u, papel=p)
                         for u, p in (("mestre", "narrador"), ("ana", "jogador"), ("bia", "jogador"))])
        session.flush()
        session.add_all([
            PersonagemRegistro(id="lion", mesa_id="mesa", proprietario_id="ana", ficha={"personagem": {"nome": "Lion"}}),
            PersonagemRegistro(id="kira", mesa_id="mesa", proprietario_id="bia", ficha={"personagem": {"nome": "Kira"}}),
            PersonagemRegistro(id="goblin", mesa_id="mesa", proprietario_id=None, tipo="monstro",
                               ficha={"personagem": {"nome": "Goblin"}}),
            PersonagemRegistro(id="ogro", mesa_id="mesa", proprietario_id=None, tipo="monstro", visibilidade="narrador",
                               ficha={"personagem": {"nome": "Ogro Mau"}}),
        ])
        session.flush()
        cena = sala.criar_cena(session, "mesa", "Ponte", 10, 10)
        sala.ativar_cena(session, cena)
        camada = session.scalar(select(CamadaCenaRegistro).where(CamadaCenaRegistro.cena_id == cena.id,
                                                                  CamadaCenaRegistro.visibilidade == "mesa"))
        for rotulo, pid, oculto in (("Lion", "lion", False), ("Kira", "kira", False), ("Goblin", "goblin", False),
                                    ("Goblin", "goblin", False), ("Ogro", "ogro", True), ("Baú", None, False)):
            sala.criar_token(session, cena, camada_id=camada.id, rotulo=rotulo, x=1, y=1, personagem_id=pid, oculto=oculto)
        session.commit()
        return {"cena": cena.id, "camada": camada.id}


def banco():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda dbapi, _: dbapi.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    return engine


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = banco()
        self.ids = montar_mesa(self.engine)
        self.session = Session(self.engine)
        self.rolagens = count(1)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def com_sessao(self):
        sessoes.iniciar(self.session, "mesa")
        self.session.flush()

    def participante(self, combate, personagem_id) -> ParticipanteCombateRegistro:
        """O grupo da ficha (sem token próprio)."""
        return next(p for p in turno.participantes(self.session, combate)
                    if p.personagem_id == personagem_id and p.token_id is None)

    def rolar(self, combate, personagem_id, total, raciocinio=0, prontidao=0, sortear=None):
        kwargs = {"sortear": sortear} if sortear else {}
        turno.registrar_iniciativa(self.session, combate, self.participante(combate, personagem_id),
                                   rolagem_id=None, total=total, raciocinio=raciocinio, prontidao=prontidao, **kwargs)

    def ordem(self, combate):
        return [p.personagem_id for p in turno.ordenar(turno.participantes(self.session, combate))]


class EntrarTest(_Base):
    def test_participantes_da_cena_com_ficha_unica_por_grupo(self):
        self.com_sessao()
        combate = turno.entrar(self.session, "mesa", "mestre")
        self.assertEqual((combate.estado, combate.rodada), ("iniciativa", 0))
        self.assertEqual(sorted(p.personagem_id for p in turno.participantes(self.session, combate)),
                         ["goblin", "kira", "lion", "ogro"])

    def test_recusas(self):
        with self.assertRaisesRegex(turno.TurnoInvalido, "sessão"):
            turno.entrar(self.session, "mesa", "mestre")
        self.com_sessao()
        turno.entrar(self.session, "mesa", "mestre")
        with self.assertRaises(turno.ConflitoTurno):
            turno.entrar(self.session, "mesa", "mestre")

    def test_sem_cena_ou_sem_personagens(self):
        self.com_sessao()
        for cena in self.session.scalars(select(sala.CenaRegistro)):
            cena.ativa = False
        self.session.flush()
        with self.assertRaisesRegex(turno.TurnoInvalido, "cena ativa"):
            turno.entrar(self.session, "mesa", "mestre")
        vazia = sala.criar_cena(self.session, "mesa", "Vazia", 5, 5)
        sala.ativar_cena(self.session, vazia)
        with self.assertRaisesRegex(turno.TurnoInvalido, "personagem"):
            turno.entrar(self.session, "mesa", "mestre")


class OrdemTest(_Base):
    def setUp(self):
        super().setUp()
        self.com_sessao()
        self.combate = turno.entrar(self.session, "mesa", "mestre")

    def test_maior_total_primeiro_e_pendentes_no_fim(self):
        self.rolar(self.combate, "lion", 12)
        self.rolar(self.combate, "goblin", 17)
        self.assertEqual(self.ordem(self.combate)[:2], ["goblin", "lion"])
        self.assertEqual(set(self.ordem(self.combate)[2:]), {"kira", "ogro"})

    def test_empate_por_raciocinio_e_depois_prontidao(self):
        self.rolar(self.combate, "lion", 15, raciocinio=2, prontidao=3)
        self.rolar(self.combate, "kira", 15, raciocinio=3, prontidao=0)
        self.rolar(self.combate, "goblin", 15, raciocinio=2, prontidao=1)
        self.assertEqual(self.ordem(self.combate)[:3], ["kira", "lion", "goblin"])
        self.assertTrue(all(p.desempate == [] for p in turno.participantes(self.session, self.combate)))

    def test_empate_total_rola_so_os_empatados_ate_desempatar(self):
        dados = iter([10, 10, 4, 18])
        self.rolar(self.combate, "goblin", 9)
        self.rolar(self.combate, "lion", 15, 2, 1)
        self.rolar(self.combate, "kira", 15, 2, 1, sortear=lambda: next(dados))
        lion, kira, goblin = (self.participante(self.combate, i) for i in ("lion", "kira", "goblin"))
        # Primeiro nível empatou (10 a 10); no segundo, 4 contra 18.
        self.assertEqual(sorted([lion.desempate, kira.desempate]), [[10, 4], [10, 18]])
        self.assertEqual(goblin.desempate, [])
        self.assertEqual((lion.total, kira.total), (15, 15))
        primeiro = "lion" if lion.desempate[1] == 18 else "kira"
        self.assertEqual(self.ordem(self.combate)[0], primeiro)

    def test_desempate_resolvido_nao_e_refeito(self):
        dados = iter([12, 5, 9])
        self.rolar(self.combate, "lion", 15, 2, 1)
        self.rolar(self.combate, "kira", 15, 2, 1, sortear=lambda: next(dados))
        antes = {i: list(self.participante(self.combate, i).desempate) for i in ("lion", "kira")}
        self.rolar(self.combate, "goblin", 15, 2, 1, sortear=lambda: next(dados))
        for i in ("lion", "kira"):
            self.assertEqual(self.participante(self.combate, i).desempate, antes[i])
        self.assertEqual(self.participante(self.combate, "goblin").desempate, [9])
        self.assertEqual(self.ordem(self.combate)[:3], ["lion", "goblin", "kira"] if antes["lion"] == [12]
                         else ["kira", "goblin", "lion"])

    def test_rolar_duas_vezes(self):
        self.rolar(self.combate, "lion", 15)
        with self.assertRaises(turno.ConflitoTurno):
            self.rolar(self.combate, "lion", 3)
        self.assertEqual(self.participante(self.combate, "lion").total, 15)


class VezTest(_Base):
    def setUp(self):
        super().setUp()
        self.com_sessao()
        self.combate = turno.entrar(self.session, "mesa", "mestre")

    def vez(self):
        return next(p.personagem_id for p in turno.participantes(self.session, self.combate)
                    if p.id == self.combate.vez_participante_id)

    def test_comecar_sem_ninguem_rolar_e_recusado(self):
        with self.assertRaises(turno.TurnoInvalido):
            turno.comecar(self.session, self.combate)

    def tirar_da_cena(self, personagem_id):
        for token in self.session.scalars(select(sala.TokenRegistro).where(sala.TokenRegistro.personagem_id == personagem_id)):
            self.session.delete(token)
        self.session.flush()

    def test_rodadas_e_pendentes_travam_o_proximo_turno(self):
        """Decisão do usuário (2026-10-05): qualquer participante na cena sem iniciativa trava o Próximo turno."""
        self.rolar(self.combate, "kira", 18)
        self.rolar(self.combate, "goblin", 12)
        self.rolar(self.combate, "lion", 5)
        turno.comecar(self.session, self.combate)
        self.assertEqual((self.combate.rodada, self.vez()), (1, "kira"))
        with self.assertRaisesRegex(turno.ConflitoTurno, "Falta rolar a iniciativa de Ogro"):
            turno.proximo(self.session, self.combate)
        self.assertEqual(self.vez(), "kira")
        self.rolar(self.combate, "ogro", 1)
        for esperado in ("goblin", "lion", "ogro"):
            turno.proximo(self.session, self.combate)
            self.assertEqual(self.vez(), esperado)
        turno.proximo(self.session, self.combate)
        self.assertEqual((self.combate.rodada, self.vez()), (2, "kira"))
        with self.assertRaises(turno.ConflitoTurno):
            turno.comecar(self.session, self.combate)

    def test_pendente_rola_no_meio_e_a_vez_continua(self):
        self.tirar_da_cena("ogro")
        self.rolar(self.combate, "kira", 18)
        self.rolar(self.combate, "lion", 5)
        turno.comecar(self.session, self.combate)
        self.rolar(self.combate, "goblin", 10)
        self.assertEqual(self.vez(), "kira")
        self.assertEqual(self.ordem(self.combate)[:3], ["kira", "goblin", "lion"])
        turno.proximo(self.session, self.combate)
        self.assertEqual(self.vez(), "goblin")

    def test_fora_da_cena_e_pulado_e_nao_trava(self):
        self.tirar_da_cena("ogro")
        self.rolar(self.combate, "kira", 18)
        self.rolar(self.combate, "goblin", 12)
        self.rolar(self.combate, "lion", 5)
        turno.comecar(self.session, self.combate)
        self.tirar_da_cena("goblin")
        turno.proximo(self.session, self.combate)
        self.assertEqual(self.vez(), "lion")

    def test_quem_entra_no_meio_da_disputa(self):
        """Decisão do usuário (2026-10-05): token novo de personagem que não participa entra sem iniciativa."""
        self.tirar_da_cena("ogro")
        for nome, valor in (("kira", 18), ("goblin", 12), ("lion", 5)):
            self.rolar(self.combate, nome, valor)
        turno.comecar(self.session, self.combate)
        cena = self.session.get(sala.CenaRegistro, self.ids["cena"])
        self.session.add(PersonagemRegistro(id="lobo", mesa_id="mesa", proprietario_id=None, tipo="monstro",
                                            ficha={"personagem": {"nome": "Lobo"}}))
        self.session.flush()
        lobo = sala.criar_token(self.session, cena, camada_id=self.ids["camada"], rotulo="Lobo", x=3, y=3, personagem_id="lobo")
        entrou = turno.incluir(self.session, "mesa", lobo)
        self.assertEqual((entrou.personagem_id, entrou.total), ("lobo", None))
        with self.assertRaisesRegex(turno.ConflitoTurno, "Lobo"):
            turno.proximo(self.session, self.combate)
        self.rolar(self.combate, "lobo", 15)
        self.assertEqual(self.vez(), "kira")
        self.assertEqual(self.ordem(self.combate)[:2], ["kira", "lobo"])
        turno.proximo(self.session, self.combate)
        self.assertEqual(self.vez(), "lobo")
        # Quem saiu da mesa e volta rola de novo (decisão do usuário, 2026-10-06): o novo token do Ogro é um participante
        # próprio, sem iniciativa; o grupo antigo fica fora da barra. Token sem ficha não entra.
        volta = sala.criar_token(self.session, cena, camada_id=self.ids["camada"], rotulo="Ogro", x=5, y=5, personagem_id="ogro")
        de_novo = turno.incluir(self.session, "mesa", volta)
        self.assertEqual((de_novo.token_id, de_novo.total), (volta.id, None))
        self.assertEqual([p.id for p in turno.pendentes(self.session, self.combate)], [de_novo.id])
        bau = sala.criar_token(self.session, cena, camada_id=self.ids["camada"], rotulo="Barril", x=6, y=6)
        self.assertIsNone(turno.incluir(self.session, "mesa", bau))
        self.assertEqual(len(turno.participantes(self.session, self.combate)), 6)

    def test_outro_token_da_mesma_ficha_rola_e_joga_sozinho(self):
        """Decisão do usuário (2026-10-05): os Goblins postos com o modo turno aberto rolam a própria iniciativa; os
        que estavam na cena ao abrir seguem agrupados."""
        self.tirar_da_cena("ogro")
        cena = self.session.get(sala.CenaRegistro, self.ids["cena"])
        # Ainda na fase de iniciativa: já vira participante próprio.
        segundo = sala.criar_token(self.session, cena, camada_id=self.ids["camada"], rotulo="Goblin", x=4, y=4,
                                   personagem_id="goblin")
        proprio = turno.incluir(self.session, "mesa", segundo)
        self.assertEqual((proprio.personagem_id, proprio.token_id, proprio.total), ("goblin", segundo.id, None))
        grupo = next(p for p in turno.participantes(self.session, self.combate) if p.token_id is None and p.personagem_id == "goblin")
        tokens = turno.tokens_dos_participantes(self.session, self.combate)
        self.assertEqual([t.id for t in tokens[proprio.id]], [segundo.id])
        self.assertNotIn(segundo.id, [t.id for t in tokens[grupo.id]])
        for nome, valor in (("kira", 18), ("lion", 5)):
            self.rolar(self.combate, nome, valor)
        turno.registrar_iniciativa(self.session, self.combate, grupo, rolagem_id=None, total=12, raciocinio=0, prontidao=0)
        turno.comecar(self.session, self.combate)
        # O Goblin 2 trava o Próximo turno até rolar, com o nome numerado.
        with self.assertRaisesRegex(turno.ConflitoTurno, "Falta rolar a iniciativa de Goblin 2"):
            turno.proximo(self.session, self.combate)
        turno.registrar_iniciativa(self.session, self.combate, proprio, rolagem_id=None, total=8, raciocinio=0, prontidao=0)
        vezes = []
        for _ in range(4):
            turno.proximo(self.session, self.combate)
            vezes.append(turno.nome_do_participante(self.session, self.combate,
                                                    self.session.get(ParticipanteCombateRegistro, self.combate.vez_participante_id)))
        self.assertEqual(vezes, ["Goblin", "Goblin 2", "Lion", "Kira"])
        # Um terceiro, já na disputa, também entra sozinho; o movimento dele não gasta o saldo do grupo.
        terceiro = sala.criar_token(self.session, cena, camada_id=self.ids["camada"], rotulo="Goblin", x=6, y=6,
                                    personagem_id="goblin")
        self.assertEqual(turno.incluir(self.session, "mesa", terceiro).token_id, terceiro.id)
        lidos = turno.estado(self.session, "mesa", sala.Leitor("mestre", True))["combate"]["participantes"]
        nomes = [p["nome"] for p in lidos]
        # Cada participante diz quais tokens são dele, para a prévia do arraste achar o certo.
        self.assertEqual(next(p for p in lidos if p["nome"] == "Goblin 3")["token_ids"], [terceiro.id])
        self.assertNotIn(terceiro.id, next(p for p in lidos if p["nome"] == "Goblin")["token_ids"])
        self.assertEqual(sorted(n for n in nomes if n.startswith("Goblin")), ["Goblin", "Goblin 2", "Goblin 3"])
        self.assertEqual(turno._participante_do_token(self.session, self.combate, terceiro).token_id, terceiro.id)
        self.assertEqual(turno._participante_do_token(self.session, self.combate, segundo).id, proprio.id)

    def test_token_proprio_que_sai_fica_fora_e_nao_trava(self):
        self.tirar_da_cena("ogro")
        cena = self.session.get(sala.CenaRegistro, self.ids["cena"])
        segundo = sala.criar_token(self.session, cena, camada_id=self.ids["camada"], rotulo="Goblin", x=4, y=4,
                                   personagem_id="goblin")
        proprio = turno.incluir(self.session, "mesa", segundo)
        for nome, valor in (("kira", 18), ("goblin", 12), ("lion", 5)):
            self.rolar(self.combate, nome, valor)
        turno.comecar(self.session, self.combate)
        self.session.delete(segundo)
        self.session.flush()
        self.assertEqual(turno.pendentes(self.session, self.combate), [])
        turno.proximo(self.session, self.combate)
        estado = turno.estado(self.session, "mesa", sala.Leitor("mestre", True))["combate"]
        self.assertTrue(next(p for p in estado["participantes"] if p["id"] == proprio.id)["fora_da_cena"])

    def test_sem_modo_turno_nada_entra(self):
        turno.encerrar(self.session, self.combate)
        cena = self.session.get(sala.CenaRegistro, self.ids["cena"])
        token = sala.criar_token(self.session, cena, camada_id=self.ids["camada"], rotulo="Kira 2", x=3, y=3, personagem_id="kira")
        self.assertIsNone(turno.incluir(self.session, "mesa", token))

    def test_sair_e_encerrar_aberto(self):
        turno.encerrar(self.session, self.combate)
        self.assertIsNone(turno.aberto(self.session, "mesa"))
        with self.assertRaises(turno.ConflitoTurno):
            turno.encerrar(self.session, self.combate)
        outro = turno.entrar(self.session, "mesa", "mestre")
        self.assertIs(turno.encerrar_aberto(self.session, "mesa"), outro)
        self.assertIsNone(turno.encerrar_aberto(self.session, "mesa"))


class EstadoTest(_Base):
    def setUp(self):
        super().setUp()
        self.com_sessao()
        self.combate = turno.entrar(self.session, "mesa", "mestre")
        self.rolar(self.combate, "lion", 12)
        self.rolar(self.combate, "goblin", 17)
        self.rolar(self.combate, "ogro", 20)

    def test_narrador_ve_tudo(self):
        dados = turno.estado(self.session, "mesa", sala.Leitor("mestre", True))["combate"]
        nomes = {p["nome"]: p for p in dados["participantes"]}
        self.assertEqual(set(nomes), {"Ogro", "Goblin", "Lion", "Kira"})
        self.assertEqual((nomes["Goblin"]["total"], nomes["Goblin"]["tokens"]), (17, 2))
        self.assertEqual(nomes["Ogro"]["personagem_id"], "ogro")

    def test_jogador_nao_ve_oculto_nem_total_de_npc(self):
        dados = turno.estado(self.session, "mesa", sala.Leitor("ana", False))["combate"]
        nomes = {p["nome"]: p for p in dados["participantes"]}
        self.assertNotIn("Ogro", nomes)
        self.assertIsNone(nomes["Goblin"]["total"])
        self.assertEqual(nomes["Lion"]["total"], 12)
        self.assertTrue(nomes["Lion"]["meu"])
        self.assertFalse(nomes["Kira"]["meu"])
        self.assertFalse(nomes["Kira"]["rolou"])

    def test_sem_modo_turno(self):
        turno.encerrar(self.session, self.combate)
        self.assertEqual(turno.estado(self.session, "mesa", sala.Leitor("ana", False)), {"combate": None})


class NumeracaoTest(unittest.TestCase):
    """A numeração dos nomes repetidos e a ordem de quem falta rolar seguem a ordem de entrada, não os ids (D9)."""

    def test_numeracao_segue_a_ordem_de_entrada_e_nao_os_ids(self):
        # Ids escolhidos ao contrário da entrada: por id, o terceiro viria antes do segundo.
        grupo = ParticipanteCombateRegistro(id="zz-grupo", combate_id="c", personagem_id="goblin", desempate=[],
                                            ordem_de_entrada=1)
        lion = ParticipanteCombateRegistro(id="mm-lion", combate_id="c", personagem_id="lion", desempate=[],
                                           ordem_de_entrada=2)
        segundo = ParticipanteCombateRegistro(id="zz-segundo", combate_id="c", personagem_id="goblin", token_id="zz-t",
                                              desempate=[], ordem_de_entrada=5)
        terceiro = ParticipanteCombateRegistro(id="aa-terceiro", combate_id="c", personagem_id="goblin", token_id="aa-t",
                                               desempate=[], ordem_de_entrada=6)
        nomes = turno._numerar([(terceiro, "Goblin"), (lion, "Lion"), (segundo, "Goblin"), (grupo, "Goblin")])
        self.assertEqual([nomes[p.id] for p in (grupo, segundo, terceiro, lion)], ["Goblin", "Goblin 2", "Goblin 3", "Lion"])
        # Sem rolagem, a barra lista na ordem de entrada; quem rolou vem antes de todos.
        self.assertEqual([p.id for p in turno.ordenar([terceiro, lion, segundo, grupo])],
                         ["zz-grupo", "mm-lion", "zz-segundo", "aa-terceiro"])
        lion.total = 3
        self.assertEqual(turno.ordenar([terceiro, segundo, grupo, lion])[0].id, "mm-lion")


if __name__ == "__main__":
    unittest.main()
