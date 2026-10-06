"""Música e ambiente da mesa na Sala (musica-da-sala): biblioteca com licença aberta e duas camadas escolhidas
pelo Narrador."""

from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, select, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform import musica
from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, EventoAuditoriaRegistro, MembroRegistro, MesaRegistro, MusicaRegistro


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"
VAZIO = {"faixa_id": None, "tocando": False, "posicao_ms": 0, "repetir": True, "alterada_em": None}


def _banco():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda dbapi, _: dbapi.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([MesaRegistro(id="mesa", nome="Mesa", narrador_id="mestre"),
                         MesaRegistro(id="outra", nome="Outra", narrador_id="outro")])
        session.flush()
        session.add_all([
            MembroRegistro(mesa_id="mesa", usuario_id="mestre", papel="narrador"),
            MembroRegistro(mesa_id="mesa", usuario_id="ana", papel="jogador"),
            MembroRegistro(mesa_id="outra", usuario_id="outro", papel="narrador"),
        ])
        session.commit()
    return engine


class BibliotecaTest(unittest.TestCase):
    def test_biblioteca_aprovada_com_ambientes_e_musicas_de_cada_estilo(self):
        faixas = musica.biblioteca()
        self.assertEqual(sum(f.tipo == "ambiente" for f in faixas), 17)
        self.assertEqual(sum(f.tipo == "musica" for f in faixas), 29)
        self.assertEqual(len({f.id for f in faixas}), len(faixas))
        self.assertEqual(musica.catalogo().estilos, ("Medieval", "Moderno", "Ficção científica"))
        for tipo in ("ambiente", "musica"):
            for estilo in musica.catalogo().estilos:
                self.assertTrue(any(f.tipo == tipo and estilo in f.estilos for f in faixas), (tipo, estilo))
        # Sons de natureza servem em mais de um estilo; combate medieval serve em qualquer lugar.
        self.assertEqual(musica.faixa("amb-rain-loop-1").estilos, ("Medieval", "Moderno"))
        self.assertIsNone(musica.faixa("death-and-axes").cenario)
        # Decisão do usuário: Cathedral in the Forest é música, não ambiente.
        cathedral = musica.faixa("cathedral-in-the-forest")
        self.assertEqual((cathedral.momento, cathedral.cenario, cathedral.estilos), ("Mistério", "Natureza", ("Medieval",)))

    def test_catalogo_e_relido_quando_o_arquivo_muda_e_o_invalido_mantem_a_ultima_versao(self):
        original = musica.ARQUIVO.read_text(encoding="utf-8")
        with TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "musicas.json"
            arquivo.write_text(original, encoding="utf-8")
            with patch.object(musica, "ARQUIVO", arquivo), patch.object(musica, "_lida", None):
                self.assertEqual(len(musica.biblioteca()), 46)
                arquivo.write_text(original.replace('"titulo": "Five Armies"', '"titulo": "Cinco Exércitos"'), encoding="utf-8")
                os.utime(arquivo, (1, 1))
                self.assertEqual(musica.faixa("five-armies").titulo, "Cinco Exércitos")
                arquivo.write_text("{ quebrado", encoding="utf-8")
                os.utime(arquivo, (2, 2))
                self.assertEqual(musica.faixa("five-armies").titulo, "Cinco Exércitos")

    def test_so_licencas_que_permitem_uso_comercial_rotulos_das_listas_e_arquivo_existente(self):
        for faixa in musica.biblioteca():
            with self.subTest(faixa=faixa.titulo):
                self.assertIn(faixa.licenca, ("CC BY 4.0", "CC BY 3.0", "CC0"))
                if faixa.tipo == "musica":
                    self.assertIn(faixa.momento, musica.catalogo().momentos)
                else:
                    self.assertIsNone(faixa.momento)
                self.assertTrue(faixa.cenario is None or faixa.cenario in musica.catalogo().cenarios)
                self.assertTrue(faixa.estilos and set(faixa.estilos) <= set(musica.catalogo().estilos))
                self.assertTrue((musica.PASTA_DO_AUDIO / faixa.arquivo).is_file(), faixa.arquivo)
                self.assertGreater(faixa.duracao_s, 0)
                # Tarefa 5.7 (2026-10-05): tudo em Opus no Ogg, que emenda sem silêncio nos loops.
                with open(musica.PASTA_DO_AUDIO / faixa.arquivo, "rb") as audio:
                    cabeca = audio.read(64)
                self.assertTrue(faixa.arquivo.endswith(".ogg") and cabeca.startswith(b"OggS") and b"OpusHead" in cabeca,
                                faixa.arquivo)

    def test_recusa_licenca_sem_fins_comerciais_rotulo_fora_da_lista_tipo_e_id_repetido(self):
        base = {"id": "x", "tipo": "musica", "estilos": ["Medieval"], "titulo": "X", "autor": "A", "licenca": "CC BY 4.0",
                "licenca_url": "https://creativecommons.org/licenses/by/4.0/", "origem_url": "https://a",
                "arquivo": "x.mp3", "duracao_s": 10, "momento": "Combate", "cenario": "Medieval", "sem_emenda": False}
        base["cenario"] = "Cidade / Vila"
        listas = {"estilos": ["Medieval", "Moderno"], "momentos": ["Combate"], "cenarios": ["Cidade / Vila"]}
        musica.validar_catalogo({**listas, "faixas": [base, {**base, "id": "y", "tipo": "ambiente", "momento": None},
                                                      {**base, "id": "z", "cenario": None, "estilos": ["Medieval", "Moderno"]}]})
        for errada in (
            {**base, "licenca": "CC BY-NC-ND 4.0", "licenca_url": "https://creativecommons.org/licenses/by-nc-nd/4.0/"},
            {**base, "momento": "Batalha"},
            {**base, "momento": None},
            {**base, "tipo": "ambiente"},
            {**base, "tipo": "efeito"},
            {**base, "cenario": "Espaço"},
            {**base, "estilos": []},
            {**base, "estilos": ["Faroeste"]},
            {**base, "estilos": ["Medieval", "Medieval"]},
            {**base, "arquivo": "../segredo.mp3"},
            {**base, "duracao_s": 0},
        ):
            with self.subTest(errada=errada), self.assertRaises(musica.BibliotecaInvalida):
                musica.validar_catalogo({**listas, "faixas": [errada]})
        for catalogo in ({**listas, "faixas": [base, base]}, {"cenarios": ["Cidade / Vila"], "faixas": [base]},
                         {**listas, "cenarios": ["Cidade / Vila", "Cidade / Vila"], "faixas": [base]},
                         {"momentos": ["Combate"], "cenarios": ["Cidade / Vila"], "faixas": [base]}):
            with self.subTest(catalogo=catalogo), self.assertRaises(musica.BibliotecaInvalida):
                musica.validar_catalogo(catalogo)


class EstadoDominioTest(unittest.TestCase):
    def setUp(self):
        self.engine = _banco()
        self.session = Session(self.engine)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_mesa_sem_som_tem_as_duas_camadas_paradas_com_repetir_ligado(self):
        self.assertEqual(musica.estado(self.session, "mesa"), {"ambiente": VAZIO, "musica": VAZIO})

    def test_tocar_pausar_continuar_e_parar(self):
        momento = datetime(2026, 10, 3, 20, 0, tzinfo=timezone.utc)
        relogio = lambda: momento  # noqa: E731
        with patch("cursed_platform.musica.emitir") as emitir:
            tocando = musica.alterar(self.session, "mesa", "mestre", "musica", faixa_id="clash-defiant", tocando=True,
                                     posicao_ms=0, repetir=True, agora=relogio)
        emitir.assert_called_once_with(self.session, "mesa", "sala.musica", {"camada": "musica"}, publico=True)
        self.assertEqual(tocando, {"faixa_id": "clash-defiant", "tocando": True, "posicao_ms": 0, "repetir": True,
                                   "alterada_em": momento})
        pausada = musica.alterar(self.session, "mesa", "mestre", "musica", faixa_id="clash-defiant", tocando=False,
                                 posicao_ms=42_000, repetir=True, agora=relogio)
        self.assertEqual((pausada["tocando"], pausada["posicao_ms"]), (False, 42_000))
        self.assertEqual(musica.descrever("musica", tocando, pausada), "Música pausada: Clash Defiant")
        parada = musica.alterar(self.session, "mesa", "mestre", "musica", faixa_id=None, tocando=True, posicao_ms=9,
                                repetir=False, agora=relogio)
        self.assertEqual((parada["faixa_id"], parada["tocando"], parada["posicao_ms"]), (None, False, 0))
        self.assertEqual(self.session.scalars(select(MusicaRegistro)).one().alterada_por, "mestre")

    def test_ambiente_e_musica_tocam_juntos_cada_um_na_sua_camada(self):
        musica.alterar(self.session, "mesa", "mestre", "ambiente", faixa_id="dungeon-ambience", tocando=True,
                       posicao_ms=0, repetir=True)
        musica.alterar(self.session, "mesa", "mestre", "musica", faixa_id="clash-defiant", tocando=True,
                       posicao_ms=0, repetir=False)
        estado = musica.estado(self.session, "mesa")
        self.assertEqual((estado["ambiente"]["faixa_id"], estado["musica"]["faixa_id"]),
                         ("dungeon-ambience", "clash-defiant"))
        musica.alterar(self.session, "mesa", "mestre", "musica", faixa_id=None, tocando=False, posicao_ms=0, repetir=False)
        self.assertTrue(musica.estado(self.session, "mesa")["ambiente"]["tocando"])
        self.assertEqual(musica.descrever("ambiente", VAZIO, estado["ambiente"]),
                         "Ambiente: Dungeon Ambience (Masmorra / Caverna)")

    def test_faixa_so_toca_na_camada_do_seu_tipo_e_recusa_o_que_nao_existe(self):
        for camada, faixa_id, posicao in (("ambiente", "clash-defiant", 0), ("musica", "dungeon-ambience", 0),
                                          ("musica", "nao-existe", 0), ("musica", "five-armies", -1),
                                          ("efeitos", None, 0)):
            with self.subTest(camada=camada, faixa=faixa_id), self.assertRaises(musica.MusicaInvalida):
                musica.alterar(self.session, "mesa", "mestre", camada, faixa_id=faixa_id, tocando=True,
                               posicao_ms=posicao, repetir=True)
        self.assertEqual(self.session.scalars(select(MusicaRegistro)).all(), [])


class MusicaApiTest(unittest.TestCase):
    def setUp(self):
        self.engine = _banco()
        settings = PlatformSettings(environment="test", database_url="sqlite:///:memory:",
                                    api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",))
        self.app = create_app(settings, engine=self.engine)
        self.ator = "mestre"
        self.app.dependency_overrides[get_actor] = lambda: Ator(self.ator)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def como(self, ator: str) -> TestClient:
        self.ator = ator
        return self.client

    def test_biblioteca_com_tipo_rotulos_credito_e_caminho_do_audio(self):
        resposta = self.como("ana").get("/musicas")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        corpo = resposta.json()
        self.assertEqual(corpo["estilos"], ["Medieval", "Moderno", "Ficção científica"])
        self.assertEqual(corpo["momentos"], list(musica.catalogo().momentos))
        self.assertEqual(corpo["cenarios"], list(musica.catalogo().cenarios))
        self.assertEqual(len(corpo["faixas"]), 46)
        achaidh = next(f for f in corpo["faixas"] if f["id"] == "achaidh-cheide")
        self.assertEqual(achaidh, {
            "id": "achaidh-cheide", "tipo": "musica", "titulo": "Achaidh Cheide",
            "autor": "Kevin MacLeod (incompetech.com)", "licenca": "CC BY 4.0",
            "licenca_url": "https://creativecommons.org/licenses/by/4.0/",
            "origem_url": "https://incompetech.com/music/royalty-free/music.html", "arquivo": "/musica/achaidh-cheide.ogg",
            "duracao_s": 134, "estilos": ["Medieval"], "momento": "Taverna / Festa", "cenario": "Interior",
            "sem_emenda": False})
        masmorra = next(f for f in corpo["faixas"] if f["id"] == "dungeon-ambience")
        self.assertEqual((masmorra["tipo"], masmorra["momento"]), ("ambiente", None))

    def test_narrador_toca_ambiente_e_musica_e_jogador_le_o_mesmo_estado_com_o_relogio_do_servidor(self):
        vazio = self.como("ana").get("/mesas/mesa/sala/musica").json()
        self.assertEqual((vazio["musica"]["faixa_id"], vazio["musica"]["tocando"], vazio["ambiente"]["repetir"]),
                         (None, False, True))
        self.assertIsNotNone(vazio["agora"])
        resposta = self.como("mestre").put("/mesas/mesa/sala/musica/musica",
                                           json={"faixa_id": "clash-defiant", "tocando": True, "posicao_ms": 0, "repetir": False})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        resposta = self.como("mestre").put("/mesas/mesa/sala/musica/ambiente",
                                           json={"faixa_id": "dungeon-ambience", "tocando": True})
        self.assertEqual(resposta.status_code, 200, resposta.text)
        estado = self.como("ana").get("/mesas/mesa/sala/musica").json()
        atual = estado["musica"]
        self.assertEqual((atual["faixa_id"], atual["tocando"], atual["posicao_ms"], atual["repetir"]),
                         ("clash-defiant", True, 0, False))
        self.assertEqual((estado["ambiente"]["faixa_id"], estado["ambiente"]["repetir"]), ("dungeon-ambience", True))
        self.assertLessEqual(atual["alterada_em"][:19], estado["agora"][:19])
        with Session(self.engine) as session:
            resumos = [e.resumo for e in session.scalars(select(EventoAuditoriaRegistro).where(
                EventoAuditoriaRegistro.acao == "musica.alterada").order_by(EventoAuditoriaRegistro.id))]
        self.assertEqual(resumos, ["Música: Clash Defiant (Combate)", "Ambiente: Dungeon Ambience (Masmorra / Caverna)"])

    def test_jogador_nao_muda_e_quem_nao_e_da_mesa_nao_ve(self):
        pedido = {"faixa_id": "five-armies", "tocando": True}
        self.assertEqual(self.como("ana").put("/mesas/mesa/sala/musica/musica", json=pedido).status_code, 403)
        self.assertEqual(self.como("outro").put("/mesas/mesa/sala/musica/musica", json=pedido).status_code, 404)
        self.assertEqual(self.como("outro").get("/mesas/mesa/sala/musica").status_code, 404)
        with Session(self.engine) as session:
            self.assertEqual(session.scalars(select(MusicaRegistro)).all(), [])

    def test_faixa_inexistente_de_outro_tipo_posicao_negativa_e_camada_desconhecida_sao_recusadas(self):
        cliente = self.como("mestre")
        for camada, corpo in (("musica", {"faixa_id": "nao-existe", "tocando": True}),
                              ("musica", {"faixa_id": "five-armies", "tocando": True, "posicao_ms": -5}),
                              ("ambiente", {"faixa_id": "five-armies", "tocando": True}),
                              ("efeitos", {"faixa_id": None, "tocando": False})):
            with self.subTest(camada=camada, corpo=corpo):
                self.assertEqual(cliente.put(f"/mesas/mesa/sala/musica/{camada}", json=corpo).status_code, 422)
        with Session(self.engine) as session:
            self.assertEqual(session.scalars(select(MusicaRegistro)).all(), [])


class MigracaoMusicaSqliteTest(unittest.TestCase):
    def test_cria_e_remove_a_tabela(self):
        with TemporaryDirectory() as pasta:
            engine = create_engine(f"sqlite:///{Path(pasta) / 'musica.sqlite'}")
            try:
                def config(conexao):
                    cfg = Config(str(CONFIG))
                    cfg.attributes["connection"] = conexao
                    return cfg
                with engine.begin() as c:
                    command.upgrade(config(c), "0026_musica_da_sala")
                    c.execute(text("INSERT INTO rpg_tables (id, nome, narrador_id, campos_bloqueados, campos_exigem_aprovacao) "
                                   "VALUES ('m', 'Mesa', 'n', '[]', '[]')"))
                    for camada in ("ambiente", "musica"):
                        c.execute(text("INSERT INTO room_music (mesa_id, camada, alterada_em, alterada_por) "
                                       "VALUES ('m', :c, '2026-10-03 20:00:00', 'n')"), {"c": camada})
                    self.assertEqual(c.execute(text("SELECT camada, tocando, posicao_ms, repetir FROM room_music "
                                                    "ORDER BY camada")).all(),
                                     [("ambiente", 0, 0, 1), ("musica", 0, 0, 1)])
                with engine.begin() as c:
                    command.downgrade(config(c), "0025_rolagens_de_dados")
                self.assertNotIn("room_music", set(inspect(engine).get_table_names()))
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()
