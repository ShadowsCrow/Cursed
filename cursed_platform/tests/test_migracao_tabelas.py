"""Migração reproduzível do esquema SQL legado sem importar Streamlit."""

from __future__ import annotations

import json
import os
from pathlib import Path
import unittest
from uuid import uuid4

from sqlalchemy import JSON, Column, ForeignKey, Integer, MetaData, String, Table, create_engine, func, select, text, update
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from cursed_platform.migracao_tabelas import DivergenciaMigracao, migrar_tabelas
from cursed_platform.persistence import (
    Base, EfeitoAplicadoRegistro, ItemInventarioRegistro, MesaRegistro, MigracaoLegadaRegistro,
    OperacaoEfeitoRegistro, PersonagemRegistro,
)


FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "legacy" / "ficha_complexa.json"


class MigracaoTabelasTest(unittest.TestCase):
    def setUp(self):
        self.legado = create_engine("sqlite:///:memory:")
        self.destino = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.destino)
        with Session(self.destino) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.commit()
        meta = MetaData()
        self.fichas = Table("fichas", meta,
            Column("id", Integer, primary_key=True), Column("nome", String(255), nullable=False),
            Column("personagem", JSON, nullable=False), Column("personalidade", JSON, nullable=False),
            Column("atributos", JSON, nullable=False), Column("pericias", JSON, nullable=False))
        self.filhos = {}
        for nome in ("ficha_armas", "ficha_armaduras", "ficha_outros", "ficha_efeitos_externos"):
            self.filhos[nome] = Table(nome, meta,
                Column("id", Integer, primary_key=True),
                Column("ficha_id", Integer, ForeignKey("fichas.id"), nullable=False),
                Column("ordem", Integer, nullable=False), Column("dados", JSON, nullable=False))
        self.app_meta = Table("app_meta", meta,
            Column("key", String(100), primary_key=True), Column("value", String(255), nullable=False))
        meta.create_all(self.legado)
        self.dados = json.loads(FIXTURE.read_text(encoding="utf-8"))
        with self.legado.begin() as conexao:
            conexao.execute(self.app_meta.insert().values(key="schema_version", value="2"))
            conexao.execute(self.fichas.insert().values(id=17, nome="Nara Exemplo", **{
                campo: self.dados[campo] for campo in ("personagem", "personalidade", "atributos", "pericias")
            }))
            for nome, campo in (
                ("ficha_armas", "armas"), ("ficha_armaduras", "armaduras"),
                ("ficha_outros", "outros"), ("ficha_efeitos_externos", "efeitos_externos"),
            ):
                for ordem, dados in enumerate(self.dados[campo]):
                    conexao.execute(self.filhos[nome].insert().values(
                        id=100 + list(self.filhos).index(nome), ficha_id=17, ordem=ordem, dados=dados,
                    ))

    def tearDown(self):
        self.legado.dispose()
        self.destino.dispose()

    def migrar(self):
        with Session(self.destino) as session:
            relatorio = migrar_tabelas(self.legado, session, origem="copia-2026-09", mesa_id="mesa")
            session.commit()
            return relatorio

    def test_repeticao_nao_duplica_ficha_itens_efeitos_nem_operacoes(self):
        primeira = self.migrar()
        segunda = self.migrar()
        self.assertEqual(primeira.versao_origem, "2")
        self.assertEqual(primeira.convertidos, {
            "fichas": 1, "ficha_armas": 1, "ficha_armaduras": 1,
            "ficha_outros": 1, "ficha_efeitos_externos": 1,
        })
        self.assertEqual(segunda.existentes, primeira.convertidos)
        self.assertEqual(segunda.convertidos, {})
        with Session(self.destino) as session:
            [personagem] = session.scalars(select(PersonagemRegistro)).all()
            self.assertIsNone(personagem.proprietario_id)
            self.assertEqual(personagem.ficha["personagem"], self.dados["personagem"])
            self.assertEqual(personagem.ficha["armaduras"], self.dados["armaduras"])
            itens = session.scalars(select(ItemInventarioRegistro).order_by(ItemInventarioRegistro.tipo)).all()
            self.assertEqual([(item.tipo, item.nome) for item in itens], [
                ("arma", "Adaga de treino"), ("armadura", "Manto reforçado"), ("outro", "Lanterna de Nara"),
            ])
            self.assertIn("defesa", next(item for item in itens if item.tipo == "armadura").dados)
            [efeito] = session.scalars(select(EfeitoAplicadoRegistro)).all()
            self.assertEqual(efeito.conteudo, self.dados["efeitos_externos"][0])
            [operacao] = session.scalars(select(OperacaoEfeitoRegistro)).all()
            self.assertEqual((operacao.alvo, float(operacao.valor)), ("pericia:arcanismo", 2.0))
            self.assertEqual(session.scalar(select(func.count()).select_from(MigracaoLegadaRegistro)), 5)

    def test_itens_migrados_ficam_sem_dimensao_com_peso_so_como_descricao(self):
        """carga-por-espacos 7.1: nada é convertido de kg; o Narrador define o formato depois."""
        with self.legado.begin() as conexao:
            conexao.execute(update(self.filhos["ficha_armas"]).values(
                dados={**self.dados["armas"][0], "peso": 3, "equipado": True}))
            conexao.execute(update(self.filhos["ficha_outros"]).values(
                dados={**self.dados["outros"][0], "peso": 0.5, "quantidade": 4}))
        self.migrar()
        self.migrar()
        with Session(self.destino) as session:
            itens = session.scalars(select(ItemInventarioRegistro).order_by(ItemInventarioRegistro.tipo)).all()
            self.assertEqual([item.nome for item in itens], ["Adaga de treino", "Manto reforçado", "Lanterna de Nara"])
            for item in itens:
                self.assertEqual(
                    (item.subtipo, item.largura, item.altura, item.coluna, item.linha, item.maos, item.pilha_max),
                    (None,) * 7, f"{item.nome} recebeu formato sozinho",
                )
            adaga, _, lanterna = itens
            self.assertEqual((adaga.dados["peso"], adaga.equipado), (3, True))
            self.assertEqual((lanterna.dados["peso"], lanterna.quantidade), (0.5, 4))

    def test_origem_alterada_exige_revisao_sem_sobrescrever_destino(self):
        self.migrar()
        alterado = {**self.dados["armas"][0], "dano": "99d99"}
        with self.legado.begin() as conexao:
            conexao.execute(update(self.filhos["ficha_armas"]).values(dados=alterado))
        with Session(self.destino) as session:
            with self.assertRaisesRegex(DivergenciaMigracao, "origem alterada"):
                migrar_tabelas(self.legado, session, origem="copia-2026-09", mesa_id="mesa")
            session.rollback()
        with Session(self.destino) as session:
            [arma] = session.scalars(select(ItemInventarioRegistro).where(ItemInventarioRegistro.tipo == "arma")).all()
            self.assertEqual(arma.dados["dano"], "1d4")
            self.assertEqual(session.scalar(select(func.count()).select_from(MigracaoLegadaRegistro)), 5)

    def test_exige_mesa_de_destino_existente(self):
        with Session(self.destino) as session:
            with self.assertRaisesRegex(DivergenciaMigracao, "mesa de destino"):
                migrar_tabelas(self.legado, session, origem="copia-2026-09", mesa_id="ausente")

    @unittest.skipUnless(os.environ.get("CURSED_TEST_POSTGRES_URL"), "Requer PostgreSQL descartável.")
    def test_repeticao_em_destino_postgresql(self):
        base = make_url(os.environ["CURSED_TEST_POSTGRES_URL"])
        banco = f"cursed_migracao_{uuid4().hex}"
        admin = create_engine(base, isolation_level="AUTOCOMMIT")
        with admin.connect() as conexao:
            conexao.execute(text(f'CREATE DATABASE "{banco}"'))
        destino_pg = create_engine(base.set(database=banco))
        try:
            Base.metadata.create_all(destino_pg)
            with Session(destino_pg) as session:
                session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
                session.commit()
            with Session(destino_pg) as session:
                primeira = migrar_tabelas(self.legado, session, origem="copia-2026-09", mesa_id="mesa")
                session.commit()
            with Session(destino_pg) as session:
                segunda = migrar_tabelas(self.legado, session, origem="copia-2026-09", mesa_id="mesa")
                session.commit()
                self.assertEqual(session.scalar(select(func.count()).select_from(MigracaoLegadaRegistro)), 5)
            self.assertEqual(segunda.existentes, primeira.convertidos)
        finally:
            destino_pg.dispose()
            with admin.connect() as conexao:
                conexao.execute(text(f'DROP DATABASE IF EXISTS "{banco}" WITH (FORCE)'))
            admin.dispose()


if __name__ == "__main__":
    unittest.main()
