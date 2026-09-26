"""JSONs históricos e catálogos: conversão segura, pendências e repetição."""

from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from sqlalchemy import JSON, Column, Integer, MetaData, String, Table, create_engine, func, select
from sqlalchemy.orm import Session

from cursed_platform.migracao_json import migrar_json_catalogos
from cursed_platform.persistence import (
    Base, CartaDefinicaoRegistro, EfeitoAplicadoRegistro, ItemInventarioRegistro,
    MesaRegistro, MigracaoLegadaRegistro, OperacaoEfeitoRegistro, PersonagemRegistro,
)


RAIZ = Path(__file__).resolve().parents[2]
CATALOGOS = RAIZ / "app_streamlit" / "data" / "catalogs"
FICHA = RAIZ / "fixtures" / "legacy" / "ficha_complexa.json"


class MigracaoJsonTest(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.fichas = Path(self.tmp.name)
        (self.fichas / "nara.json").write_bytes(FICHA.read_bytes())
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"))
            session.commit()

    def tearDown(self):
        self.engine.dispose()
        self.tmp.cleanup()

    def executar(self):
        with Session(self.engine) as session:
            relatorio = migrar_json_catalogos(session, origem="copia-2026", mesa_id="mesa",
                                               fichas_dir=self.fichas, catalogos_dir=CATALOGOS)
            session.commit()
            return relatorio

    def test_ficha_e_catalogos_idempotentes_com_pendencias_explicitas(self):
        primeira = self.executar()
        segunda = self.executar()
        self.assertGreater(primeira.contagens["convertido"], 1)
        self.assertEqual(primeira.contagens["rejeitado"], 0)
        self.assertEqual(segunda.contagens["existente"], primeira.contagens["convertido"])
        self.assertEqual(segunda.contagens["convertido"], 0)
        self.assertFalse(primeira.aprovavel)
        pendentes = {(item.fonte, item.identificador) for item in primeira.registros
                     if item.situacao == "pendente"}
        self.assertIn(("json:racas.json", "0"), pendentes)
        self.assertIn(("json:tipos_dano.json", "0"), pendentes)
        self.assertIn(("json:classes.json", "0"), pendentes)
        self.assertIn(("json:efeitos_externos_lib.json", "0"), pendentes)

        with Session(self.engine) as session:
            [personagem] = session.scalars(select(PersonagemRegistro)).all()
            origem = json.loads(FICHA.read_text(encoding="utf-8"))
            self.assertEqual(personagem.ficha, origem)
            self.assertIsNone(personagem.proprietario_id)
            self.assertEqual(session.scalar(select(func.count()).select_from(ItemInventarioRegistro)), 3)
            self.assertEqual(session.scalar(select(func.count()).select_from(EfeitoAplicadoRegistro)), 1)
            self.assertEqual(session.scalar(select(func.count()).select_from(OperacaoEfeitoRegistro)), 1)
            cartas = session.scalars(select(CartaDefinicaoRegistro)).all()
            custo = next(c for c in cartas if c.rascunho["conteudo"]["titulo"] == "Manifestar Gêmeo")
            self.assertEqual(custo.rascunho["conteudo"]["custo_legado"], "2 PP")
            for campo in ("custo_aprendizado", "descansos_minimos", "potencia_uso", "custo_uso"):
                self.assertNotIn(campo, custo.rascunho["conteudo"])
            self.assertEqual(custo.rascunho["procedencia"]["dados_originais"]["custo"], "2 PP")
            self.assertEqual(session.scalar(select(func.count()).select_from(MigracaoLegadaRegistro)),
                             sum(item.destino_id is not None for item in primeira.registros))

    def test_json_invalido_e_origem_alterada_sao_rejeitados_sem_sobrescrita(self):
        self.executar()
        caminho = self.fichas / "nara.json"
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        dados["personagem"]["nome"] = "Nome alterado"
        caminho.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")
        (self.fichas / "corrompido.json").write_text("{", encoding="utf-8")
        segunda = self.executar()
        rejeitados = [item for item in segunda.registros if item.situacao == "rejeitado"]
        self.assertEqual({item.identificador for item in rejeitados}, {"nara.json", "corrompido.json"})
        self.assertFalse(segunda.aprovavel)
        with Session(self.engine) as session:
            [personagem] = session.scalars(select(PersonagemRegistro)).all()
            self.assertEqual(personagem.ficha["personagem"]["nome"], "Nara Exemplo")

    def test_nome_ja_existente_exige_associacao_em_vez_de_duplicar(self):
        with Session(self.engine) as session:
            session.add(PersonagemRegistro(id="existente", mesa_id="mesa", ficha={
                "personagem": {"nome": "Nara Exemplo"}}))
            session.commit()
        relatorio = self.executar()
        ficha = next(item for item in relatorio.registros if item.fonte == "json:ficha")
        self.assertEqual(ficha.situacao, "pendente")
        with Session(self.engine) as session:
            self.assertEqual(session.scalar(select(func.count()).select_from(PersonagemRegistro)), 1)

    def test_bibliotecas_sql_entram_com_procedencia_e_repetem_sem_duplicar(self):
        legado = create_engine("sqlite:///:memory:")
        meta = MetaData()
        equipamentos = Table("equipment_library", meta,
            Column("id", Integer, primary_key=True), Column("tipo", String(32)), Column("dados", JSON))
        efeitos = Table("effects_library", meta,
            Column("id", Integer, primary_key=True), Column("dados", JSON))
        meta.create_all(legado)
        with legado.begin() as conexao:
            conexao.execute(equipamentos.insert().values(id=10, tipo="arma",
                dados={"nome": "Sabre", "descricao": "Lâmina antiga.", "dano": "1d6"}))
            conexao.execute(efeitos.insert().values(id=20,
                dados={"nome": "Bênção", "descricao": "+1 em Vontade."}))
        try:
            with Session(self.engine) as session:
                primeira = migrar_json_catalogos(session, origem="copia-2026", mesa_id="mesa",
                    fichas_dir=self.fichas, catalogos_dir=CATALOGOS, origem_engine=legado)
                session.commit()
            with Session(self.engine) as session:
                segunda = migrar_json_catalogos(session, origem="copia-2026", mesa_id="mesa",
                    fichas_dir=self.fichas, catalogos_dir=CATALOGOS, origem_engine=legado)
                session.commit()
                sabre = session.scalar(select(CartaDefinicaoRegistro).where(
                    CartaDefinicaoRegistro.rascunho["conteudo"]["titulo"].as_string() == "Sabre"))
                self.assertEqual(sabre.rascunho["conteudo"]["dados"]["dano"], "1d6")
            self.assertEqual([(r.fonte, r.situacao) for r in primeira.registros
                              if r.fonte.startswith("sql:")],
                             [("sql:equipment_library", "convertido"), ("sql:effects_library", "convertido")])
            self.assertEqual([(r.fonte, r.situacao) for r in segunda.registros
                              if r.fonte.startswith("sql:")],
                             [("sql:equipment_library", "existente"), ("sql:effects_library", "existente")])
        finally:
            legado.dispose()


if __name__ == "__main__":
    unittest.main()
