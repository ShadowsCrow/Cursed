"""Campos ambíguos permanecem íntegros e exigem revisão explícita."""

from __future__ import annotations

from pathlib import Path
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from cursed_platform.contracts import ConteudoHabilidade
from cursed_platform.migracao_ambiguidades import (
    analisar_catalogo_classes, analisar_mesa_migrada, preservar_custo_legado,
)
from cursed_platform.persistence import (
    Base, ItemInventarioRegistro, MesaRegistro, MigracaoLegadaRegistro, PersonagemRegistro,
)


CATALOGO = Path(__file__).resolve().parents[2] / "app_streamlit" / "data" / "catalogs" / "classes.json"


class MigracaoAmbiguidadesTest(unittest.TestCase):
    def test_catalogo_sinaliza_custos_originais_sem_atribuir_campos_mecanicos(self):
        pendencias = analisar_catalogo_classes(CATALOGO)
        self.assertEqual(len(pendencias), 17)
        self.assertTrue(any(item.valor_original == "1 PP + 1 de Exaustão" for item in pendencias))
        self.assertTrue(all(item.campo == "custo" for item in pendencias))
        self.assertTrue(all("custo_uso" in item.campos_nao_inferidos for item in pendencias))
        self.assertTrue(all(item.caminho.startswith("/") for item in pendencias))

    def test_preparacao_preserva_texto_e_nao_inventa_custos(self):
        origem = {"titulo": "Intervenção Menor", "texto": "Teste",
                  "custo": "1 PP + 1 de Exaustão"}
        resultado = preservar_custo_legado(origem)
        carta = ConteudoHabilidade.model_validate(resultado)
        self.assertEqual(origem["custo"], carta.custo_legado)
        self.assertNotIn("custo", resultado)
        self.assertTrue(all(getattr(carta, campo) is None for campo in (
            "custo_aprendizado", "potencia_uso", "custo_uso")))
        self.assertEqual(origem["custo"], "1 PP + 1 de Exaustão")
        with self.assertRaisesRegex(ValueError, "não textual"):
            preservar_custo_legado({"custo": 3})
        with self.assertRaisesRegex(ValueError, "conflitante"):
            preservar_custo_legado({"custo": "2 PP", "custo_legado": "3 PP"})

    def test_mesa_sinaliza_custo_e_defesa_sem_modificar_registros(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        try:
            with Session(engine) as session:
                session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="narrador"))
                session.add(PersonagemRegistro(id="p1", mesa_id="mesa", ficha={
                    "personagem": {"habilidades": [{"nome": "Foco", "custo": "2 PP"}]}}))
                session.add(MigracaoLegadaRegistro(id="m1", origem="copia", tipo_origem="fichas",
                    id_origem="17", hash_conteudo="a" * 64, mesa_id="mesa",
                    tipo_destino="characters", id_destino="p1"))
                session.add(ItemInventarioRegistro(id="i1", mesa_id="mesa", personagem_id="p1",
                    tipo="armadura", nome="Manto", dados={"nome": "Manto", "defesa": 1}))
                session.commit()
            with Session(engine) as session:
                pendencias = analisar_mesa_migrada(session, origem="copia", mesa_id="mesa")
                self.assertEqual([(p.campo, p.valor_original) for p in pendencias],
                                 [("custo", "2 PP"), ("defesa", 1)])
                self.assertEqual(pendencias[0].caminho, "/personagem/habilidades/0")
                self.assertEqual(pendencias[1].campos_nao_inferidos, ("armadura",))
                self.assertEqual(session.get(ItemInventarioRegistro, "i1").dados,
                                 {"nome": "Manto", "defesa": 1})
                self.assertNotIn("custo_uso", session.get(PersonagemRegistro, "p1").ficha["personagem"]["habilidades"][0])
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
