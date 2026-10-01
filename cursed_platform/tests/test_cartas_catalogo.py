"""Cartas de habilidade de classe, arquétipo e raça (tarefas 5.1, 5.2 e 5.6 de calcular-valores-da-ficha)."""

from __future__ import annotations

from dataclasses import replace
import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from cursed_platform import cartas, cartas_catalogo, cartas_ciclo, catalogos
from cursed_platform.catalogos import Habilidade
from cursed_platform.tests import test_api_recipientes as base_api
from cursed_platform.persistence import (
    Base, CartaDefinicaoRegistro, CartaPersonagemRegistro, CartaVersaoRegistro, MesaRegistro, PersonagemRegistro,
)

CATALOGO = catalogos.ler()


def _ficha(classe="Druida", arquetipo="Animalista", raca="Elfo"):
    return {"personagem": {"nome": "Ayla", "classe": classe, "arquetipo": arquetipo, "raca": raca, "nivel": 1}}


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.session.add_all([MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"),
                              MesaRegistro(id="outra", nome="Outra", narrador_id="mestre")])
        self.session.flush()
        self.personagem = PersonagemRegistro(id="p", mesa_id="mesa", proprietario_id="ana", versao=0, ficha=_ficha())
        self.session.add(self.personagem)
        self.session.flush()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def definicoes(self, mesa="mesa"):
        return list(self.session.scalars(select(CartaDefinicaoRegistro).where(CartaDefinicaoRegistro.mesa_id == mesa)))

    def posses(self, estado=None):
        consulta = select(CartaPersonagemRegistro).where(CartaPersonagemRegistro.personagem_id == "p")
        if estado:
            consulta = consulta.where(CartaPersonagemRegistro.estado == estado)
        return list(self.session.scalars(consulta))

    def titulos(self):
        return sorted(self.session.get(CartaVersaoRegistro, p.versao_id).conteudo["titulo"] for p in self.posses("aprendida"))

    def conceder(self, catalogo=CATALOGO):
        return cartas_catalogo.conceder(self.session, self.personagem, self.personagem.ficha, catalogo)


class MaterializacaoTest(_Base):
    def test_habilidades_viram_cartas_publicadas_com_origem_e_custos_vazios(self):
        druida = cartas_catalogo._da_classe(CATALOGO, "Druida")
        cartas_catalogo.materializar(self.session, "mesa", druida)
        definicoes = self.definicoes()
        self.assertEqual(len(definicoes), len(CATALOGO.classe("Druida").habilidades))
        for definicao in definicoes:
            versao = cartas.versao_publicada(self.session, definicao)
            self.assertTrue(definicao.origem_sistema.startswith("classes/Druida/habilidades/"))
            self.assertIn("classe:Druida", versao.conteudo["tags"])
            self.assertTrue(all(versao.conteudo[c] is None for c in ("custo_aprendizado", "custo_uso", "potencia_uso")))

    def test_repetir_nao_duplica_nem_versiona(self):
        habilidades = cartas_catalogo.habilidades_da_ficha(_ficha(), CATALOGO)
        primeira = cartas_catalogo.materializar(self.session, "mesa", habilidades)
        segunda = cartas_catalogo.materializar(self.session, "mesa", habilidades)
        self.assertEqual(len(primeira.criadas), len(habilidades))
        self.assertEqual((segunda.criadas, segunda.atualizadas), ([], []))
        self.assertEqual(len(self.definicoes()), len(habilidades))
        self.assertEqual({d.versao_publicada for d in self.definicoes()}, {1})

    def test_cada_mesa_tem_suas_cartas(self):
        habilidades = cartas_catalogo._da_classe(CATALOGO, "Mago")
        cartas_catalogo.materializar(self.session, "mesa", habilidades)
        cartas_catalogo.materializar(self.session, "outra", habilidades)
        self.assertEqual(len(self.definicoes("outra")), len(habilidades))

    def test_nenhuma_carta_de_raca_hoje(self):
        todas = cartas_catalogo.todas_as_habilidades(CATALOGO)
        self.assertTrue(todas)
        self.assertEqual([h for h in todas if h.origem.startswith("racas/")], [])

    def test_tipo_sem_ativacao_propria_vira_tag(self):
        gatuno = {h.conteudo["titulo"]: h.conteudo for h in cartas_catalogo.todas_as_habilidades(CATALOGO)
                  if h.concedida_por.startswith(("classe:Gatuno", "arquetipo:Gatuno"))}
        reacoes = [c for c in gatuno.values() if "Reação" in c["tags"]]
        self.assertTrue(reacoes)
        self.assertTrue(all(c["ativacao"] is None for c in reacoes))


class ConcessaoTest(_Base):
    def test_druida_animalista_recebe_as_cartas_ja_aprendidas(self):
        resultado = self.conceder()
        esperado = [h.nome for h in CATALOGO.classe("Druida").habilidades] + \
                   [h.nome for h in CATALOGO.classe("Druida").arquetipo("Animalista").habilidades]
        self.assertEqual(self.titulos(), sorted(esperado))
        self.assertTrue(all(p.excecao_aprendizado and p.origem == "concessao" for p in self.posses()))
        self.assertEqual({o for _, o in resultado.concedidas}, {"Classe: Druida", "Arquétipo: Animalista"})

    def test_troca_de_arquetipo_mantem_as_da_classe(self):
        self.conceder()
        self.personagem.ficha = _ficha(arquetipo="Caminho Feral")
        resultado = self.conceder()
        druida = CATALOGO.classe("Druida")
        esperado = [h.nome for h in druida.habilidades] + [h.nome for h in druida.arquetipo("Caminho Feral").habilidades]
        self.assertEqual(self.titulos(), sorted(esperado))
        self.assertEqual({o for _, o in resultado.removidas}, {"Arquétipo: Animalista"})
        self.assertEqual({o for _, o in resultado.concedidas}, {"Arquétipo: Caminho Feral"})

    def test_troca_de_classe_nao_toca_cartas_de_oferta(self):
        self.conceder()
        definicao = cartas.criar_definicao(self.session, mesa_id="mesa", tipo="habilidade",
                                           rascunho={"titulo": "Truque do Templo", "texto": "Um truque."}, ator_id="mestre")
        versao, _ = cartas.publicar(self.session, definicao, ator_id="mestre", versao_esperada=0)
        cartas_ciclo.adquirir(self.session, self.personagem, versao, origem="oferta", versao_esperada=0)
        self.personagem.ficha = _ficha(classe="Mago", arquetipo="Mutante Arcano")
        self.conceder()
        titulos = self.titulos()
        self.assertNotIn(CATALOGO.classe("Druida").habilidades[0].nome, titulos)
        self.assertIn(CATALOGO.classe("Mago").habilidades[0].nome, titulos)
        oferta = [p for p in self.posses() if p.concedida_por is None]
        self.assertEqual([(p.origem, p.estado) for p in oferta], [("oferta", "disponivel")])

    def test_classe_fora_do_catalogo_nao_concede_nada(self):
        self.personagem.ficha = _ficha(classe="Bardo Errante", arquetipo="")
        self.assertFalse(self.conceder().altera)
        self.assertEqual(self.posses(), [])

    def test_repetir_nao_muda_nada(self):
        self.conceder()
        self.assertFalse(self.conceder().altera)


class SincronizacaoTest(_Base):
    """O JSON prevalece sobre as cartas materializadas (decisão de 2026-09-27)."""

    def _com_texto(self, nome_classe: str, indice: int, texto: str):
        classes = []
        for classe in CATALOGO.classes:
            if classe.nome == nome_classe:
                habilidades = list(classe.habilidades)
                habilidades[indice] = replace(habilidades[indice], descricao=texto)
                classe = replace(classe, habilidades=tuple(habilidades))
            classes.append(classe)
        return replace(CATALOGO, classes=tuple(classes))

    def test_texto_corrigido_no_json_gera_nova_versao_e_move_as_posses(self):
        self.conceder()
        novo = self._com_texto("Druida", 0, "Texto revisado.")
        resultado = self.conceder(novo)
        nome = CATALOGO.classe("Druida").habilidades[0].nome
        self.assertEqual(resultado.atualizadas, [nome])
        posse = next(p for p in self.posses("aprendida")
                     if self.session.get(CartaVersaoRegistro, p.versao_id).conteudo["titulo"] == nome)
        versao = self.session.get(CartaVersaoRegistro, posse.versao_id)
        self.assertEqual((versao.numero, versao.conteudo["texto"]), (2, "Texto revisado."))

    def test_edicao_do_narrador_e_substituida(self):
        self.conceder()
        nome = CATALOGO.classe("Druida").habilidades[0].nome
        definicao = next(d for d in self.definicoes() if d.origem_sistema.endswith(f"/{nome}"))
        cartas.salvar_rascunho(self.session, definicao, {"titulo": nome, "texto": "Versão da mesa."}, definicao.versao)
        cartas.publicar(self.session, definicao, ator_id="mestre", versao_esperada=definicao.versao)
        self.conceder(self._com_texto("Druida", 0, "Versão do JSON."))
        vigente = cartas.versao_publicada(self.session, definicao)
        self.assertEqual((vigente.numero, vigente.conteudo["texto"]), (3, "Versão do JSON."))
        textos = {v.numero: v.conteudo["texto"] for v in self.session.scalars(
            select(CartaVersaoRegistro).where(CartaVersaoRegistro.definicao_id == definicao.id))}
        self.assertEqual(textos[2], "Versão da mesa.")

    def test_custo_informado_no_json_gera_nova_versao(self):
        """cartas-do-catalogo-somente-leitura 2.1: os custos vêm do JSON e entram na conferência."""
        self.conceder()
        nome = CATALOGO.classe("Druida").habilidades[0].nome
        classes = tuple(
            replace(c, habilidades=(replace(c.habilidades[0], custos=(("custo_aprendizado", 3),)), *c.habilidades[1:]))
            if c.nome == "Druida" else c for c in CATALOGO.classes
        )
        resultado = self.conceder(replace(CATALOGO, classes=classes))
        self.assertEqual(resultado.atualizadas, [nome])
        definicao = next(d for d in self.definicoes() if d.origem_sistema.endswith(f"/{nome}"))
        vigente = cartas.versao_publicada(self.session, definicao)
        self.assertEqual(vigente.numero, 2)
        self.assertEqual([vigente.conteudo.get(c) for c in cartas.CUSTOS], [3, None, None, None])

    def test_custo_legado_nao_preenche_os_custos(self):
        legado = Habilidade("Golpe Antigo", "Texto.", "Ativa", custo_legado="2 PP")
        conteudo = cartas_catalogo._conteudo(legado, "classe:Druida")
        self.assertEqual(conteudo["custo_legado"], "2 PP")
        self.assertTrue(all(c not in conteudo for c in cartas.CUSTOS))

    def test_habilidade_removida_do_json_e_arquivada_e_retirada(self):
        self.conceder()
        nome = CATALOGO.classe("Druida").habilidades[0].nome
        classes = tuple(replace(c, habilidades=c.habilidades[1:]) if c.nome == "Druida" else c for c in CATALOGO.classes)
        resultado = cartas_catalogo.sincronizar_mesa(self.session, "mesa", replace(CATALOGO, classes=classes))
        self.assertNotIn(nome, self.titulos())
        definicao = next(d for d in self.definicoes() if d.origem_sistema.endswith(f"/{nome}"))
        self.assertTrue(definicao.arquivada)
        self.assertIn(nome, resultado.arquivadas)

    def test_habilidade_nova_no_json_e_concedida(self):
        self.conceder()
        classes = tuple(
            replace(c, habilidades=(*c.habilidades, Habilidade("Raiz Profunda", "Nova habilidade.", "Passiva")))
            if c.nome == "Druida" else c for c in CATALOGO.classes
        )
        cartas_catalogo.sincronizar_mesa(self.session, "mesa", replace(CATALOGO, classes=classes))
        self.assertIn("Raiz Profunda", self.titulos())

    def test_conferencia_repetida_nao_cria_versoes(self):
        self.conceder()
        antes = self.session.query(CartaVersaoRegistro).count()
        cartas_catalogo.sincronizar_mesa(self.session, "mesa", CATALOGO)
        cartas_catalogo.sincronizar_mesa(self.session, "mesa", CATALOGO)
        self.assertEqual(self.session.query(CartaVersaoRegistro).count(), antes)



class EdicaoPelaApiTest(unittest.TestCase):
    """cartas-do-catalogo-somente-leitura 3.1: a mesa não edita as cartas do catálogo do sistema."""

    tearDown = base_api.ApiRecipientesTest.tearDown
    as_ = base_api.ApiRecipientesTest.as_

    def setUp(self):
        base_api.ApiRecipientesTest.setUp(self)
        with Session(self.engine) as session:
            cartas_catalogo.materializar(session, "mesa", cartas_catalogo._da_classe(CATALOGO, "Druida"))
            session.commit()

    def carta_do_catalogo(self):
        resposta = self.as_("mestre").get("/mesas/mesa/cartas")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        return next(d for d in resposta.json() if d.get("origem_sistema"))

    def test_rascunho_e_publicacao_recusados_sem_nova_versao(self):
        carta = self.carta_do_catalogo()
        rascunho = self.as_("mestre").put(f"/mesas/mesa/cartas/{carta['id']}/rascunho", json={
            "rascunho": {**carta["rascunho"], "texto": "Versão da mesa."}, "versao_esperada": carta["versao"]})
        self.assertEqual(rascunho.status_code, 409)
        self.assertIn("catálogo do sistema", rascunho.json()["detail"])
        publicada = self.as_("mestre").post(f"/mesas/mesa/cartas/{carta['id']}/publicacao",
                                            json={"versao_esperada": carta["versao"]})
        self.assertEqual(publicada.status_code, 409)
        depois = self.carta_do_catalogo()
        self.assertEqual((depois["publicada"]["numero"], depois["publicada"]["conteudo"]["texto"]),
                         (1, carta["publicada"]["conteudo"]["texto"]))


if __name__ == "__main__":
    unittest.main()
