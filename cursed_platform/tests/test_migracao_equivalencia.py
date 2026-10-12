"""Divergências e pendências impedem aprovação da migração."""

from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from sqlalchemy import JSON, Column, ForeignKey, Integer, MetaData, String, Table, create_engine, select, update
from sqlalchemy.orm import Session

from cursed_platform.migracao_equivalencia import gerar_relatorio_equivalencia
from cursed_platform.migracao_json import CATALOGOS, migrar_json_catalogos
from cursed_platform.migracao_tabelas import migrar_tabelas
from cursed_platform.persistence import Base, ItemInventarioRegistro, MesaRegistro


class EquivalenciaTest(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        raiz = Path(self.tmp.name)
        self.fichas_dir = raiz / "fichas"
        self.catalogos_dir = raiz / "catalogos"
        self.fichas_dir.mkdir()
        self.catalogos_dir.mkdir()
        for nome in CATALOGOS:
            (self.catalogos_dir / nome).write_text("[]", encoding="utf-8")
        self.origem = create_engine("sqlite:///:memory:")
        self.destino = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.destino)
        meta = MetaData()
        fichas = Table("fichas", meta, Column("id", Integer, primary_key=True),
            Column("nome", String), Column("personagem", JSON), Column("personalidade", JSON),
            Column("atributos", JSON), Column("pericias", JSON))
        filhos = {}
        for nome in ("ficha_armas", "ficha_armaduras", "ficha_outros", "ficha_efeitos_externos"):
            filhos[nome] = Table(nome, meta, Column("id", Integer, primary_key=True),
                Column("ficha_id", Integer, ForeignKey("fichas.id")), Column("ordem", Integer),
                Column("dados", JSON))
        Table("equipment_library", meta, Column("id", Integer, primary_key=True),
              Column("tipo", String), Column("dados", JSON))
        Table("effects_library", meta, Column("id", Integer, primary_key=True), Column("dados", JSON))
        meta.create_all(self.origem)
        with self.origem.begin() as conexao:
            conexao.execute(fichas.insert().values(id=7, nome="Ari", personagem={"nome": "Ari"},
                personalidade={}, atributos={}, pericias={}))
            conexao.execute(filhos["ficha_armas"].insert().values(id=8, ficha_id=7, ordem=0,
                dados={"nome": "Espada", "dano": "1d6"}))
        with Session(self.destino) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.commit()

    def tearDown(self):
        self.origem.dispose()
        self.destino.dispose()
        self.tmp.cleanup()

    def migrar(self):
        with Session(self.destino) as session:
            migrar_tabelas(self.origem, session, origem="copia", mesa_id="mesa")
            migrar_json_catalogos(session, origem="copia", mesa_id="mesa",
                fichas_dir=self.fichas_dir, catalogos_dir=self.catalogos_dir, origem_engine=self.origem)
            session.commit()

    def relatorio(self):
        with Session(self.destino) as session:
            resultado = gerar_relatorio_equivalencia(session, origem="copia", mesa_id="mesa",
                origem_engine=self.origem, fichas_dir=self.fichas_dir,
                catalogos_dir=self.catalogos_dir)
            session.rollback()
            return resultado

    def test_contagens_campos_e_amostras_equivalentes(self):
        self.migrar()
        resultado = self.relatorio()
        self.assertTrue(resultado.aprovavel, resultado.divergencias + resultado.pendencias)
        self.assertEqual(resultado.contagens["fichas"], {"origem": 1, "procedencias": 1})
        self.assertEqual(resultado.contagens["ficha_armas"], {"origem": 1, "procedencias": 1})
        self.assertEqual(resultado.amostras[0]["fonte"], "fichas#7")
        self.assertEqual(resultado.amostras[0]["origem"], resultado.amostras[0]["destino"])

    def test_campo_critico_divergente_bloqueia_aprovacao(self):
        self.migrar()
        with Session(self.destino) as session:
            arma = session.scalars(select(ItemInventarioRegistro)).one()
            arma.dados = {"nome": "Espada", "dano": "9d9"}
            session.commit()
        resultado = self.relatorio()
        self.assertFalse(resultado.aprovavel)
        self.assertTrue(any(d["fonte"] == "ficha_armas#8" for d in resultado.divergencias))

    def test_origem_alterada_desde_a_migracao_bloqueia_aprovacao(self):
        self.migrar()
        meta = MetaData()
        arma = Table("ficha_armas", meta, autoload_with=self.origem)
        with self.origem.begin() as conexao:
            conexao.execute(update(arma).where(arma.c.id == 8).values(
                dados={"nome": "Espada", "dano": "9d9"}))
        resultado = self.relatorio()
        self.assertFalse(resultado.aprovavel)
        self.assertTrue(any(d["motivo"].startswith("Hash") for d in resultado.divergencias))

    def test_catalogo_pendente_e_destino_ausente_bloqueiam_aprovacao(self):
        self.migrar()
        # Raça fora do catálogo da plataforma continua pendente e bloqueia a aprovação.
        (self.catalogos_dir / "racas.json").write_text(json.dumps([{"nome": "Centauro"}]), encoding="utf-8")
        (self.fichas_dir / "novo.json").write_text(json.dumps({
            "personagem": {"nome": "Nova"}, "personalidade": {}, "atributos": {}, "pericias": {},
        }), encoding="utf-8")
        resultado = self.relatorio()
        self.assertFalse(resultado.aprovavel)
        self.assertTrue(any(p["fonte"] == "json:racas.json#0" for p in resultado.pendencias))
        self.assertTrue(any(d["fonte"] == "json:ficha#novo.json" for d in resultado.divergencias))
        with Session(self.destino) as session:
            self.assertEqual(session.query(ItemInventarioRegistro).count(), 1)


if __name__ == "__main__":
    unittest.main()
