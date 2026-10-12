"""Resolução de ícone de efeito (tarefa 5.5 de calcular-valores-da-ficha)."""

from __future__ import annotations

from pathlib import Path
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from cursed_platform import catalogos, icones_efeitos
from cursed_platform.domain.efeitos import indexar_catalogo
from cursed_platform.persistence import Base, MesaRegistro

PUBLICO = Path(__file__).resolve().parents[2] / "platform" / "frontend" / "public"
INDICE = indexar_catalogo(catalogos.ler().efeitos_default)


class IconesEfeitosTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.session.add_all([MesaRegistro(id="mesa", nome="Mesa", narrador_id="n"),
                              MesaRegistro(id="outra", nome="Outra", narrador_id="n")])
        self.session.flush()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def icone(self, associacao, mesa="mesa", conteudo=None):
        return icones_efeitos.resolver(associacao=associacao, conteudo=conteudo, catalogo=INDICE,
                                       icones_mesa=icones_efeitos.icones_da_mesa(self.session, mesa))

    def test_condicao_sem_icone_proprio_usa_o_padrao(self):
        self.assertEqual(self.icone("condicao_silenciado"), icones_efeitos.IconeEfeito("padrao", "/icones/efeitos/padrao.webp"))

    def test_icone_do_catalogo(self):
        self.assertEqual(self.icone("cc_above"), icones_efeitos.IconeEfeito("catalogo", "/icones/efeitos/cc_above.webp"))
        # A Sobrecarga derivada reaproveita o ícone pelo conteúdo, sem reativar o Sobrepeso.
        self.assertEqual(self.icone(None, conteudo={"icone": "cc_above"}).origem, "catalogo")

    def test_narrador_personaliza_so_na_mesa_dele_e_remove(self):
        icones_efeitos.definir_da_mesa(self.session, "mesa", "condicao_derrubado", "mesas/mesa/mesa/icones-efeitos/a.webp")
        self.assertEqual(self.icone("condicao_derrubado").origem, "mesa")
        self.assertEqual(self.icone("condicao_derrubado", mesa="outra").origem, "padrao")
        self.assertTrue(icones_efeitos.remover_da_mesa(self.session, "mesa", "condicao_derrubado"))
        self.assertEqual(self.icone("condicao_derrubado").origem, "padrao")

    def test_remover_volta_ao_icone_do_catalogo(self):
        icones_efeitos.definir_da_mesa(self.session, "mesa", "cc_above", "mesas/mesa/mesa/icones-efeitos/b.webp")
        self.assertEqual(self.icone("cc_above").origem, "mesa")
        icones_efeitos.remover_da_mesa(self.session, "mesa", "cc_above")
        self.assertEqual(self.icone("cc_above").origem, "catalogo")

    def test_efeito_personalizado_com_icone_proprio(self):
        conteudo = {"imagem_ativo": "mesas/mesa/mesa/icones-efeitos/c.webp"}
        self.assertEqual(self.icone(None, conteudo=conteudo), icones_efeitos.IconeEfeito("efeito", conteudo["imagem_ativo"]))

    def test_icones_citados_pelo_catalogo_existem_no_frontend(self):
        citados = {icones_efeitos.icone_do_sistema(e.get("icone") or e.get("imagem"))
                   for e in INDICE.values() if e.get("icone") or e.get("imagem")}
        citados.add(icones_efeitos.ICONE_PADRAO)
        for caminho in citados:
            with self.subTest(caminho=caminho):
                self.assertTrue((PUBLICO / caminho.lstrip("/")).is_file())

    def test_nome_de_icone_nao_escapa_da_pasta(self):
        self.assertIsNone(icones_efeitos.icone_do_sistema("../segredo.png"))


if __name__ == "__main__":
    unittest.main()
