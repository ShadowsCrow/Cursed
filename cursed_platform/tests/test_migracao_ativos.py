"""Extração de imagens legadas, deduplicação e integridade."""

from __future__ import annotations

import base64
import hashlib
import json
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from PIL import Image

from cursed_platform.migracao_ativos import (
    ArmazenamentoLocal, AtivoInvalido, migrar_ativos, migrar_ativos_catalogos,
)
from cursed_platform.migracao_json import migrar_json_catalogos
from cursed_platform import cartas
from cursed_platform.persistence import (
    AtivoCatalogoRegistro, AtivoMigradoRegistro, Base, CartaDefinicaoRegistro, EfeitoAplicadoRegistro, MesaRegistro,
    MigracaoLegadaRegistro, PersonagemRegistro,
)


def _png() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (2, 2), "purple").save(buffer, format="PNG")
    return buffer.getvalue()


PNG = _png()


class MigracaoAtivosTest(unittest.TestCase):
    def setUp(self):
        self.temporario = TemporaryDirectory()
        self.armazenamento = ArmazenamentoLocal(Path(self.temporario.name))
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        imagem = base64.b64encode(PNG).decode()
        with Session(self.engine) as session:
            session.add(MesaRegistro(id="mesa", nome="Mesa", narrador_id="narrador"))
            session.add(PersonagemRegistro(id="p1", mesa_id="mesa", tipo="personagem",
                                          visibilidade="mesa", ficha={"personagem": {"imagem_base64": imagem}}))
            session.add(MigracaoLegadaRegistro(id="m1", origem="copia", tipo_origem="fichas",
                id_origem="1", hash_conteudo="a" * 64, mesa_id="mesa", tipo_destino="characters", id_destino="p1"))
            session.add(EfeitoAplicadoRegistro(id="e1", mesa_id="mesa", personagem_id="p1",
                nome="Efeito", descricao="teste", conteudo={"imagem_base64": imagem}, estado="ativo", versao=1))
            session.commit()

    def tearDown(self):
        self.engine.dispose()
        self.temporario.cleanup()

    def test_previa_nao_grava_e_aplicacao_deduplica(self):
        with Session(self.engine) as session:
            previa = migrar_ativos(session, self.armazenamento, origem="copia", mesa_id="mesa")
            self.assertEqual(previa.encontrados, 2)
            self.assertEqual((previa.criados, previa.reutilizados), (1, 1))
            self.assertEqual(session.query(AtivoMigradoRegistro).count(), 0)
            aplicado = migrar_ativos(session, self.armazenamento, origem="copia", mesa_id="mesa", aplicar=True)
            session.commit()
        self.assertEqual((aplicado.criados, aplicado.reutilizados), (1, 1))
        with Session(self.engine) as session:
            [ativo] = session.scalars(select(AtivoMigradoRegistro)).all()
            self.assertEqual(ativo.sha256, hashlib.sha256(PNG).hexdigest())
            self.assertEqual(ativo.tamanho, len(PNG))
            self.assertEqual(ativo.tipo, "image/png")
            self.assertEqual(len(ativo.procedencias), 2)
            self.assertEqual(self.armazenamento.ler(ativo.bucket, ativo.caminho), PNG)
            personagem = session.get(PersonagemRegistro, "p1")
            efeito = session.get(EfeitoAplicadoRegistro, "e1")
            self.assertNotIn("imagem_base64", personagem.ficha["personagem"])
            self.assertEqual(personagem.ficha["personagem"]["imagem_ativo"], ativo.caminho)
            self.assertEqual(efeito.conteudo["imagem_ativo"], ativo.caminho)
            repeticao = migrar_ativos(session, self.armazenamento, origem="copia", mesa_id="mesa", aplicar=True)
            self.assertEqual(repeticao.encontrados, 0)
            self.assertEqual(session.query(AtivoMigradoRegistro).count(), 1)

    def test_imagem_invalida_e_rejeitada_sem_referencia(self):
        with Session(self.engine) as session:
            personagem = session.get(PersonagemRegistro, "p1")
            personagem.ficha = {"personagem": {"imagem_base64": "%%%"}}
            session.commit()
        with Session(self.engine) as session:
            previa = migrar_ativos(session, self.armazenamento, origem="copia", mesa_id="mesa")
            self.assertEqual(len(previa.rejeitados), 1)
            with self.assertRaises(AtivoInvalido):
                migrar_ativos(session, self.armazenamento, origem="copia", mesa_id="mesa", aplicar=True)
            session.rollback()
        with Session(self.engine) as session:
            self.assertEqual(session.query(AtivoMigradoRegistro).count(), 0)
            self.assertIn("imagem_base64", session.get(PersonagemRegistro, "p1").ficha["personagem"])

    def test_objeto_adulterado_bloqueia_aplicacao(self):
        with Session(self.engine) as session:
            migrar_ativos(session, self.armazenamento, origem="copia", mesa_id="mesa", aplicar=True)
            session.commit()
        with Session(self.engine) as session:
            ativo = session.scalars(select(AtivoMigradoRegistro)).one()
            arquivo = self.armazenamento._arquivo(ativo.bucket, ativo.caminho)
            arquivo.write_bytes(b"adulterado")
            # Nova cópia do mesmo Base64 força a conferência do objeto existente.
            personagem = session.get(PersonagemRegistro, "p1")
            personagem.ficha = {"personagem": {"imagem_base64": base64.b64encode(PNG).decode()}}
            session.commit()
        with Session(self.engine) as session:
            with self.assertRaisesRegex(AtivoInvalido, "Integridade"):
                migrar_ativos(session, self.armazenamento, origem="copia", mesa_id="mesa", aplicar=True)

    def test_ficha_historica_json_tambem_e_extraida(self):
        with Session(self.engine) as session:
            session.get(MigracaoLegadaRegistro, "m1").tipo_origem = "json:ficha"
            session.commit()
        with Session(self.engine) as session:
            relatorio = migrar_ativos(session, self.armazenamento, origem="copia",
                                      mesa_id="mesa", aplicar=True)
            session.commit()
            self.assertEqual((relatorio.encontrados, relatorio.criados), (2, 1))
            self.assertEqual(session.query(AtivoMigradoRegistro).count(), 1)

    def test_catalogo_deduplica_preserva_procedencia_e_detecta_adulteracao(self):
        raiz = Path(self.temporario.name)
        catalogos = raiz / "catalogos"
        icones = raiz / "icones"
        catalogos.mkdir()
        icones.mkdir()
        (icones / "icone.png").write_bytes(PNG)
        (catalogos / "efeitos.json").write_text(json.dumps([
            {"nome": "Um", "imagem_base64": base64.b64encode(PNG).decode()},
            {"nome": "Dois", "imagem": "icone.png"},
        ]), encoding="utf-8")
        argumentos = dict(origem="copia", mesa_id="mesa", catalogos_dir=catalogos, icons_dir=icones)
        with Session(self.engine) as session:
            previa = migrar_ativos_catalogos(session, self.armazenamento, **argumentos)
            self.assertEqual((previa.encontrados, previa.criados, previa.reutilizados), (3, 1, 2))
            self.assertEqual(session.query(AtivoCatalogoRegistro).count(), 0)
            aplicado = migrar_ativos_catalogos(session, self.armazenamento, **argumentos, aplicar=True)
            session.commit()
            self.assertEqual((aplicado.criados, aplicado.reutilizados), (1, 2))
        with Session(self.engine) as session:
            [ativo] = session.scalars(select(AtivoCatalogoRegistro)).all()
            self.assertEqual(ativo.sha256, hashlib.sha256(PNG).hexdigest())
            self.assertEqual(len(ativo.procedencias), 3)
            self.assertIn("/narrador/legado/", ativo.caminho)
            self.assertEqual(self.armazenamento.ler(ativo.bucket, ativo.caminho), PNG)
            repeticao = migrar_ativos_catalogos(session, self.armazenamento, **argumentos, aplicar=True)
            self.assertEqual((repeticao.criados, repeticao.reutilizados), (0, 3))
            session.commit()
            self.armazenamento._arquivo(ativo.bucket, ativo.caminho).write_bytes(b"alterado")
        with Session(self.engine) as session:
            with self.assertRaises(AtivoInvalido):
                migrar_ativos_catalogos(session, self.armazenamento, **argumentos, aplicar=True)

    def test_catalogo_rejeita_imagem_invalida_sem_gravar(self):
        raiz = Path(self.temporario.name)
        catalogos = raiz / "catalogos"
        catalogos.mkdir()
        (catalogos / "efeitos.json").write_text('[{"imagem_base64":"%%%"}]', encoding="utf-8")
        argumentos = dict(origem="copia", mesa_id="mesa", catalogos_dir=catalogos, icons_dir=raiz / "ausente")
        with Session(self.engine) as session:
            previa = migrar_ativos_catalogos(session, self.armazenamento, **argumentos)
            self.assertEqual(len(previa.rejeitados), 1)
            with self.assertRaises(AtivoInvalido):
                migrar_ativos_catalogos(session, self.armazenamento, **argumentos, aplicar=True)
            self.assertEqual(session.query(AtivoCatalogoRegistro).count(), 0)

    def test_arte_de_catalogo_liga_rascunho_e_so_publica_com_promocao_confirmada(self):
        raiz = Path(self.temporario.name)
        catalogos = raiz / "catalogos"
        fichas = raiz / "fichas"
        catalogos.mkdir()
        fichas.mkdir()
        (catalogos / "efeitos_default.json").write_text(json.dumps([{
            "nome": "Brilho", "descricao": "Ilumina a sala.",
            "imagem_base64": base64.b64encode(PNG).decode(),
        }]), encoding="utf-8")
        with Session(self.engine) as session:
            relatorio = migrar_json_catalogos(session, origem="copia", mesa_id="mesa",
                fichas_dir=fichas, catalogos_dir=catalogos)
            efeito = next(item for item in relatorio.registros if item.fonte == "json:efeitos_default.json")
            self.assertEqual(efeito.situacao, "pendente")
            carta = session.scalars(select(CartaDefinicaoRegistro)).one()
            self.assertNotIn("imagem_base64", json.dumps(carta.rascunho))
            migrar_ativos_catalogos(session, self.armazenamento, origem="copia", mesa_id="mesa",
                catalogos_dir=catalogos, icons_dir=raiz / "icones", aplicar=True)
            session.commit()
        with Session(self.engine) as session:
            repeticao = migrar_json_catalogos(session, origem="copia", mesa_id="mesa",
                fichas_dir=fichas, catalogos_dir=catalogos)
            efeito = next(item for item in repeticao.registros if item.fonte == "json:efeitos_default.json")
            self.assertEqual(efeito.situacao, "existente")
        with Session(self.engine) as session:
            carta = session.scalars(select(CartaDefinicaoRegistro)).one()
            [privado] = carta.rascunho["conteudo"]["ativos_privados"]
            self.assertIn("/narrador/legado/", privado)
            versao, validacao = cartas.publicar(session, carta, ator_id="narrador", versao_esperada=0)
            self.assertIsNone(versao)
            self.assertFalse(validacao.valida)
            versao, validacao = cartas.publicar(session, carta, ator_id="narrador", versao_esperada=0,
                promover_ativos=True, armazenamento=self.armazenamento)
            self.assertTrue(validacao.valida)
            session.commit()
            [compartilhado] = versao.conteudo["ativos"]
            self.assertIn("/mesa/cartas/", compartilhado)
            self.assertNotIn("ativos_privados", versao.conteudo)
            self.assertEqual(self.armazenamento.ler("cursed-privado", compartilhado), PNG)
            self.assertEqual(versao.procedencia["ativos_promovidos"][0]["sha256"], hashlib.sha256(PNG).hexdigest())


if __name__ == "__main__":
    unittest.main()
