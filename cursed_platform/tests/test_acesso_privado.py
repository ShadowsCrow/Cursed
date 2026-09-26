from __future__ import annotations

from datetime import UTC, datetime
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from uuid import uuid4

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from cursed_platform.acesso_privado import BUCKET_PRIVADO, AutorizadorRecursos
from cursed_platform import sala
from cursed_platform.config import PlatformSettings
from cursed_platform.persistence import Base, MembroRegistro, MesaRegistro, PersonagemRegistro


API_ROOT = Path(__file__).resolve().parents[2] / "platform" / "api"
sys.path.insert(0, str(API_ROOT))
with patch.dict("os.environ", {"CURSED_PLATFORM_DATABASE_URL": "sqlite:///:memory:"}):
    from cursed_api.auth import Ator, get_actor  # noqa: E402
    from cursed_api.main import create_app  # noqa: E402

CONFIG = Path(__file__).resolve().parents[2] / "platform" / "migration" / "alembic.ini"

# Identidades em formato UUID, como as emitidas pelo Supabase Auth.
MESTRE = "00000000-0000-4000-8000-000000000001"
JOGADOR_A = "00000000-0000-4000-8000-000000000002"
JOGADOR_B = "00000000-0000-4000-8000-000000000003"
REMOVIDO = "00000000-0000-4000-8000-000000000004"
EXTERNO = "00000000-0000-4000-8000-000000000005"
USUARIOS = (MESTRE, JOGADOR_A, JOGADOR_B, REMOVIDO, EXTERNO)


def popular(session: Session) -> None:
    session.add_all([
        MesaRegistro(id="a", nome="A", narrador_id=MESTRE),
        MesaRegistro(id="b", nome="B", narrador_id=JOGADOR_A),
    ])
    session.flush()
    session.add_all([
        MembroRegistro(mesa_id="a", usuario_id=MESTRE, papel="narrador"),
        MembroRegistro(mesa_id="a", usuario_id=JOGADOR_A, papel="jogador"),
        MembroRegistro(mesa_id="a", usuario_id=JOGADOR_B, papel="jogador"),
        MembroRegistro(mesa_id="a", usuario_id=REMOVIDO, papel="jogador", ativo=False),
        MembroRegistro(mesa_id="b", usuario_id=JOGADOR_A, papel="narrador"),
        MembroRegistro(mesa_id="b", usuario_id=MESTRE, papel="jogador"),
    ])
    session.flush()
    session.add_all([
        PersonagemRegistro(id="heroi", mesa_id="a", proprietario_id=JOGADOR_A, ficha={}),
        PersonagemRegistro(id="rival", mesa_id="a", proprietario_id=JOGADOR_B, ficha={}),
        PersonagemRegistro(
            id="disfarce", mesa_id="a", proprietario_id=JOGADOR_A, visibilidade="narrador", ficha={}
        ),
        PersonagemRegistro(id="npc", mesa_id="a", tipo="npc", visibilidade="narrador", ficha={}),
        PersonagemRegistro(
            id="morto", mesa_id="a", proprietario_id=JOGADOR_A, ficha={},
            excluido_em=datetime(2026, 1, 1, tzinfo=UTC), excluido_por=JOGADOR_A,
        ),
        PersonagemRegistro(id="aliado", mesa_id="b", proprietario_id=MESTRE, ficha={}),
    ])
    session.commit()


TOPICOS = (
    "mesa:a", "mesa:b", "mesa:a:narrador", "mesa:b:narrador",
    "mesa:a:personagem:heroi", "mesa:a:personagem:rival", "mesa:a:personagem:disfarce",
    "mesa:a:personagem:npc", "mesa:a:personagem:morto", "mesa:a:personagem:inexistente",
    "mesa:b:personagem:aliado", "mesa:b:personagem:heroi", "mesa:inexistente",
    # Nomes fora da convenção.
    "", "mesa:", "mesa:a:", "mesa:a:jogador", "mesa:a:personagem:", "mesa:a:narrador:extra",
    "sala:a", "MESA:a", "mesa:a/../b", "mesa:a:personagem:heroi:extra",
)

OBJETOS = (
    "mesas/a/mesa/mapa.png", "mesas/a/mesa/cenas/1/fundo.webp", "mesas/b/mesa/mapa.png",
    "mesas/a/narrador/segredo.png", "mesas/b/narrador/segredo.png",
    "mesas/a/personagens/heroi/retrato.png", "mesas/a/personagens/rival/retrato.png",
    "mesas/a/personagens/disfarce/retrato.png", "mesas/a/personagens/npc/retrato.png",
    "mesas/a/personagens/morto/retrato.png", "mesas/b/personagens/aliado/retrato.png",
    # Nomes fora da convenção.
    "mesas/a/mesa/", "mesas/a/mesa", "mesas/a/outros/x.png", "mesas/a/personagens/heroi",
    "mesas/a/mesa/../narrador/segredo.png", "mesas/a/mesa/./x.png", "mesas/a/mesa//x.png",
    "mesas/a/narrador/..", "/mesas/a/mesa/x.png", "mesas/a b/mesa/x.png", "retratos/heroi.png",
)

ESPERADO_TOPICOS = {
    MESTRE: {
        "mesa:a", "mesa:b", "mesa:a:narrador", "mesa:a:personagem:heroi",
        "mesa:a:personagem:rival", "mesa:a:personagem:disfarce", "mesa:a:personagem:npc",
        "mesa:b:personagem:aliado",
    },
    JOGADOR_A: {
        "mesa:a", "mesa:b", "mesa:b:narrador", "mesa:a:personagem:heroi",
        "mesa:b:personagem:aliado",
    },
    JOGADOR_B: {"mesa:a", "mesa:a:personagem:rival"},
    REMOVIDO: set(),
    EXTERNO: set(),
}

ESPERADO_OBJETOS = {
    MESTRE: {
        "mesas/a/mesa/mapa.png", "mesas/a/mesa/cenas/1/fundo.webp", "mesas/b/mesa/mapa.png",
        "mesas/a/narrador/segredo.png", "mesas/a/personagens/heroi/retrato.png",
        "mesas/a/personagens/rival/retrato.png", "mesas/a/personagens/disfarce/retrato.png",
        "mesas/a/personagens/npc/retrato.png", "mesas/b/personagens/aliado/retrato.png",
    },
    JOGADOR_A: {
        "mesas/a/mesa/mapa.png", "mesas/a/mesa/cenas/1/fundo.webp", "mesas/b/mesa/mapa.png",
        "mesas/b/narrador/segredo.png", "mesas/a/personagens/heroi/retrato.png",
        "mesas/b/personagens/aliado/retrato.png",
    },
    JOGADOR_B: {
        "mesas/a/mesa/mapa.png", "mesas/a/mesa/cenas/1/fundo.webp",
        "mesas/a/personagens/rival/retrato.png",
    },
    REMOVIDO: set(),
    EXTERNO: set(),
}


class AcessoPrivadoPythonTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        popular(self.session)
        self.recursos = AutorizadorRecursos(self.session)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_topicos_seguem_associacoes_da_mesa(self):
        for usuario in USUARIOS:
            permitidos = {
                t for t in TOPICOS if self.recursos.decidir_topico(usuario, t).permitido
            }
            self.assertEqual(permitidos, ESPERADO_TOPICOS[usuario], usuario)

    def test_objetos_seguem_associacoes_da_mesa(self):
        for usuario in USUARIOS:
            permitidos = {
                o for o in OBJETOS
                if self.recursos.decidir_objeto(usuario, BUCKET_PRIVADO, o).permitido
            }
            self.assertEqual(permitidos, ESPERADO_OBJETOS[usuario], usuario)

    def test_negacao_nao_revela_existencia(self):
        for usuario, recurso in (
            (EXTERNO, "mesa:a"), (REMOVIDO, "mesa:a"), (JOGADOR_B, "mesa:a:personagem:heroi"),
            (JOGADOR_A, "mesa:a:personagem:npc"), (JOGADOR_B, "mesa:a:narrador"),
            (MESTRE, "mesa:inexistente"),
        ):
            with self.subTest(usuario=usuario, recurso=recurso):
                decisao = self.recursos.decidir_topico(usuario, recurso)
                self.assertFalse(decisao.permitido)
                self.assertTrue(decisao.ocultar_existencia)

    def test_bucket_publico_ou_desconhecido_e_negado(self):
        self.assertFalse(
            self.recursos.decidir_objeto(MESTRE, "public", "mesas/a/mesa/mapa.png").permitido
        )

    def test_usuario_vazio_e_negado(self):
        self.assertFalse(self.recursos.decidir_topico("", "mesa:a").permitido)
        self.assertFalse(self.recursos.decidir_objeto("", BUCKET_PRIVADO, "mesas/a/mesa/x.png").permitido)


class CanaisApiTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as session:
            popular(session)
        settings = PlatformSettings(
            environment="test", database_url="sqlite:///:memory:",
            api_host="127.0.0.1", api_port=8000, cors_origins=("http://localhost:5173",),
        )
        self.app = create_app(settings, engine=self.engine)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.engine.dispose()

    def _canais(self, usuario: str, mesa: str):
        self.app.dependency_overrides[get_actor] = lambda: Ator(usuario)
        return self.client.get(f"/mesas/{mesa}/canais")

    def test_lista_somente_topicos_autorizados(self):
        for usuario in (MESTRE, JOGADOR_A, JOGADOR_B):
            with self.subTest(usuario=usuario):
                resposta = self._canais(usuario, "a")
                self.assertEqual(resposta.status_code, 200)
                topicos = {canal["topico"] for canal in resposta.json()}
                esperado = {t for t in ESPERADO_TOPICOS[usuario] if t.startswith("mesa:a")}
                self.assertEqual(topicos, esperado)

    def test_externo_e_removido_nao_enumeram_mesa(self):
        for usuario, mesa in ((EXTERNO, "a"), (REMOVIDO, "a"), (MESTRE, "inexistente")):
            with self.subTest(usuario=usuario, mesa=mesa):
                resposta = self._canais(usuario, mesa)
                self.assertEqual(resposta.status_code, 404)
                self.assertEqual(resposta.json(), {"detail": "Mesa não encontrada."})

    def test_matriz_negativa_outra_mesa_ficha_arquivo_e_canal(self):
        """Recusas não revelam se mesa, personagem ou recurso privado existe."""
        self.app.dependency_overrides[get_actor] = lambda: Ator(JOGADOR_B)
        mesa_proibida = self.client.get("/mesas/b/canais")
        mesa_inexistente = self.client.get("/mesas/inexistente/canais")
        self.assertEqual((mesa_proibida.status_code, mesa_proibida.json()),
                         (mesa_inexistente.status_code, mesa_inexistente.json()))
        for personagem_id in ("heroi", "npc", "inexistente"):
            resposta = self.client.get(f"/mesas/a/personagens/{personagem_id}/ficha")
            self.assertEqual(resposta.status_code, 404)
            self.assertEqual(resposta.json(), {"detail": "Ficha não encontrada."})
        with Session(self.engine) as session:
            recursos = AutorizadorRecursos(session)
            for caminho in ("mesas/b/mesa/mapa.png", "mesas/a/personagens/heroi/retrato.png",
                            "mesas/a/narrador/segredo.png"):
                decisao = recursos.decidir_objeto(JOGADOR_B, BUCKET_PRIVADO, caminho)
                self.assertFalse(decisao.permitido, caminho)
                self.assertTrue(decisao.ocultar_existencia, caminho)
            for topico in ("mesa:b", "mesa:a:personagem:heroi", "mesa:a:narrador"):
                decisao = recursos.decidir_topico(JOGADOR_B, topico)
                self.assertFalse(decisao.permitido, topico)
                self.assertTrue(decisao.ocultar_existencia, topico)


# Subconjunto dos esquemas do Supabase usado pelas políticas; o comportamento
# de `auth.uid()` e `realtime.topic()` segue o dos serviços reais.
SUPABASE_STUB = (
    "DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "CREATE SCHEMA auth",
    """CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(coalesce(
            current_setting('request.jwt.claim.sub', true),
            current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
        ), '')::uuid $$""",
    "GRANT USAGE ON SCHEMA auth TO anon, authenticated",
    "CREATE SCHEMA storage",
    "CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean DEFAULT false)",
    """CREATE TABLE storage.objects (
        id bigserial PRIMARY KEY, bucket_id text REFERENCES storage.buckets(id), name text NOT NULL)""",
    "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY",
    "GRANT USAGE ON SCHEMA storage TO anon, authenticated",
    "GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated",
    "GRANT USAGE ON ALL SEQUENCES IN SCHEMA storage TO anon, authenticated",
    "CREATE SCHEMA realtime",
    """CREATE TABLE realtime.messages (
        id bigserial PRIMARY KEY, topic text NOT NULL, extension text NOT NULL,
        payload jsonb, private boolean DEFAULT true)""",
    "ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY",
    """CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('realtime.topic', true), '') $$""",
    "GRANT USAGE ON SCHEMA realtime TO anon, authenticated",
    "GRANT ALL ON realtime.messages TO anon, authenticated",
    "GRANT USAGE ON ALL SEQUENCES IN SCHEMA realtime TO anon, authenticated",
    """CREATE FUNCTION realtime.send(payload jsonb, evento text, topico text, privado boolean)
        RETURNS void LANGUAGE plpgsql AS $$ BEGIN
        INSERT INTO realtime.messages (topic, extension, payload, private)
        VALUES (topico, 'broadcast', jsonb_build_object('evento', evento, 'dados', payload), privado);
        END $$""",
    # Supabase concede privilégios amplos em public por padrão.
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated",
    # Política permissiva alheia que não pode abrir o bucket privado.
    "CREATE POLICY outra_politica_aberta ON storage.objects FOR SELECT TO authenticated USING (true)",
)


@unittest.skipUnless(
    os.environ.get("CURSED_TEST_POSTGRES_URL"),
    "Defina CURSED_TEST_POSTGRES_URL para verificar as políticas no PostgreSQL.",
)
class AcessoPrivadoPostgresTest(unittest.TestCase):
    """Executa a mesma matriz contra as políticas RLS em um banco descartável."""

    @classmethod
    def setUpClass(cls):
        base_url = make_url(os.environ["CURSED_TEST_POSTGRES_URL"])
        cls.database = f"cursed_acesso_{uuid4().hex}"
        cls.admin = create_engine(base_url, isolation_level="AUTOCOMMIT")
        with cls.admin.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{cls.database}"'))
        cls.engine = create_engine(base_url.set(database=cls.database))
        with cls.engine.begin() as connection:
            for comando in SUPABASE_STUB:
                connection.exec_driver_sql(comando)
            config = Config(str(CONFIG))
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        with Session(cls.engine) as session:
            popular(session)
        with cls.engine.begin() as connection:
            connection.exec_driver_sql("INSERT INTO storage.buckets (id, name) VALUES ('public', 'public')")
            for nome in OBJETOS:
                connection.execute(
                    text("INSERT INTO storage.objects (bucket_id, name) VALUES (:b, :n), ('public', :n)"),
                    {"b": BUCKET_PRIVADO, "n": nome},
                )

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()
        with cls.admin.connect() as connection:
            connection.execute(text(f'DROP DATABASE IF EXISTS "{cls.database}" WITH (FORCE)'))
        cls.admin.dispose()

    def _como(self, connection, usuario: str | None, topico: str | None = None) -> None:
        connection.exec_driver_sql("SET LOCAL ROLE " + ("authenticated" if usuario else "anon"))
        connection.execute(
            text("SELECT set_config('request.jwt.claim.sub', :u, true), set_config('realtime.topic', :t, true)"),
            {"u": usuario or "", "t": topico or ""},
        )

    def test_objetos_listados_seguem_a_mesma_matriz(self):
        for usuario in USUARIOS:
            with self.subTest(usuario=usuario), self.engine.connect() as connection:
                with connection.begin():
                    self._como(connection, usuario)
                    visiveis = set(connection.execute(text(
                        "SELECT name FROM storage.objects WHERE bucket_id = :b"
                    ), {"b": BUCKET_PRIVADO}).scalars())
                self.assertEqual(visiveis, ESPERADO_OBJETOS[usuario])

    def test_topicos_seguem_a_mesma_matriz(self):
        for usuario in USUARIOS:
            with self.subTest(usuario=usuario), self.engine.connect() as connection:
                with connection.begin():
                    self._como(connection, usuario)
                    permitidos = {
                        t for t in TOPICOS
                        if connection.execute(
                            text("SELECT cursed_acesso.pode_ler_topico(:t)"), {"t": t}
                        ).scalar()
                    }
                self.assertEqual(permitidos, ESPERADO_TOPICOS[usuario])

    def test_mensagens_realtime_so_chegam_a_participantes_autorizados(self):
        with self.engine.begin() as connection:
            connection.exec_driver_sql(
                "INSERT INTO realtime.messages (topic, extension) VALUES "
                "('mesa:a', 'broadcast'), ('mesa:a:narrador', 'broadcast'), ('mesa:a', 'postgres_changes')"
            )
        casos = (
            (JOGADOR_B, "mesa:a", 1), (JOGADOR_B, "mesa:a:narrador", 0), (MESTRE, "mesa:a:narrador", 1),
            (EXTERNO, "mesa:a", 0), (REMOVIDO, "mesa:a", 0), (None, "mesa:a", 0),
        )
        for usuario, topico, esperado in casos:
            with self.subTest(usuario=usuario, topico=topico), self.engine.connect() as connection:
                with connection.begin():
                    self._como(connection, usuario, topico)
                    recebidas = connection.execute(text(
                        "SELECT count(*) FROM realtime.messages WHERE topic = :t"
                    ), {"t": topico}).scalar()
                self.assertEqual(recebidas, esperado)

    def test_envio_realtime_exige_autorizacao_no_topico(self):
        for usuario, topico, permitido in (
            (JOGADOR_B, "mesa:a", True), (JOGADOR_B, "mesa:a:narrador", False),
            (EXTERNO, "mesa:a", False), (JOGADOR_A, "sala:livre", False),
        ):
            with self.subTest(usuario=usuario, topico=topico), self.engine.connect() as connection:
                transacao = connection.begin()
                try:
                    self._como(connection, usuario, topico)
                    connection.execute(text(
                        "INSERT INTO realtime.messages (topic, extension) VALUES (:t, 'broadcast')"
                    ), {"t": topico})
                    self.assertTrue(permitido)
                except ProgrammingError as erro:
                    self.assertFalse(permitido)
                    self.assertIn("row-level security", str(erro))
                finally:
                    transacao.rollback()

    def test_clientes_nao_gravam_no_bucket_privado(self):
        with self.engine.connect() as connection:
            transacao = connection.begin()
            try:
                self._como(connection, MESTRE)
                with self.assertRaisesRegex(ProgrammingError, "row-level security"):
                    connection.execute(text(
                        "INSERT INTO storage.objects (bucket_id, name) VALUES (:b, 'mesas/a/mesa/novo.png')"
                    ), {"b": BUCKET_PRIVADO})
            finally:
                transacao.rollback()

    def test_tabelas_de_dominio_fechadas_para_clientes(self):
        for papel in ("anon", "authenticated"):
            with self.subTest(papel=papel), self.engine.connect() as connection:
                transacao = connection.begin()
                try:
                    connection.exec_driver_sql(f"SET LOCAL ROLE {papel}")
                    with self.assertRaisesRegex(ProgrammingError, "permission denied"):
                        connection.exec_driver_sql("SELECT id FROM public.characters")
                finally:
                    transacao.rollback()

    def test_funcao_interna_nao_e_executavel_por_clientes(self):
        with self.engine.connect() as connection:
            transacao = connection.begin()
            try:
                self._como(connection, EXTERNO)
                with self.assertRaisesRegex(ProgrammingError, "permission denied"):
                    connection.execute(text(
                        "SELECT cursed_acesso.pode_ler(:u, 'a', 'mesa', NULL)"
                    ), {"u": MESTRE})
            finally:
                transacao.rollback()

    def test_revogacao_interrompe_novos_acessos(self):
        with self.engine.begin() as connection:
            connection.exec_driver_sql(
                f"UPDATE table_memberships SET ativo = false WHERE mesa_id = 'a' AND usuario_id = '{JOGADOR_B}'"
            )
        try:
            with self.engine.connect() as connection, connection.begin():
                self._como(connection, JOGADOR_B, "mesa:a")
                self.assertFalse(connection.execute(
                    text("SELECT cursed_acesso.pode_ler_topico('mesa:a')")
                ).scalar())
                self.assertEqual(connection.execute(text(
                    "SELECT count(*) FROM storage.objects WHERE bucket_id = :b"
                ), {"b": BUCKET_PRIVADO}).scalar(), 0)
        finally:
            with self.engine.begin() as connection:
                connection.exec_driver_sql(
                    f"UPDATE table_memberships SET ativo = true WHERE mesa_id = 'a' AND usuario_id = '{JOGADOR_B}'"
                )

    def test_eventos_da_sala_so_aparecem_apos_commit_e_respeitam_topico(self):
        self.addCleanup(self._limpar_eventos_da_sala)
        with Session(self.engine) as session:
            cena = sala.criar_cena(session, "a", "Pátio", 8, 6)
            sala.ativar_cena(session, cena)
            camadas = sala._camadas(session, cena.id)
            compartilhada = next(c for c in camadas.values() if c.visibilidade == "mesa")
            privada = next(c for c in camadas.values() if c.visibilidade == "narrador")
            publico = sala.criar_token(
                session, cena, camada_id=compartilhada.id, rotulo="Herói", x=1, y=1,
                personagem_id="heroi",
            )
            segredo = sala.criar_token(
                session, cena, camada_id=privada.id, rotulo="Monstro secreto", x=2, y=2,
                personagem_id="npc",
            )
            cena_id, publico_id, segredo_id = cena.id, publico.id, segredo.id
            session.commit()
        with self.engine.begin() as connection:
            connection.exec_driver_sql("DELETE FROM realtime.messages")

        with Session(self.engine) as session:
            sala.mover_token(session, session.get(sala.TokenRegistro, publico_id),
                             sala.Leitor(JOGADOR_A, False), 3, 4, 0)
            # A mensagem faz parte da transação e ainda não alcança outro cliente.
            with self.engine.connect() as outra:
                self.assertEqual(outra.execute(text("SELECT count(*) FROM realtime.messages")).scalar(), 0)
            session.commit()

        with Session(self.engine) as primeiro, Session(self.engine) as segundo:
            a = sala.snapshot(primeiro, "a", sala.Leitor(JOGADOR_A, False))["cena"]
            b = sala.snapshot(segundo, "a", sala.Leitor(JOGADOR_B, False))["cena"]
            token_a = next(t for t in a["tokens"] if t["id"] == publico_id)
            token_b = next(t for t in b["tokens"] if t["id"] == publico_id)
            self.assertEqual((token_a["x"], token_a["y"], token_a["versao"]), (3, 4, 1))
            self.assertEqual(token_a["versao"], token_b["versao"])
            self.assertEqual(a["id"], cena_id)

        with Session(self.engine) as session:
            sala.mover_token(session, session.get(sala.TokenRegistro, segredo_id),
                             sala.Leitor(MESTRE, True), 4, 4, 0)
            session.commit()
        with Session(self.engine) as session:
            sala.mover_token(session, session.get(sala.TokenRegistro, segredo_id),
                             sala.Leitor(MESTRE, True), 5, 5, 1)
            session.rollback()
        with self.engine.connect() as connection:
            eventos = list(connection.execute(text(
                "SELECT topic, payload FROM realtime.messages ORDER BY id"
            )))
        self.assertEqual([topico for topico, _ in eventos], ["mesa:a", "mesa:a:narrador"])
        self.assertEqual(eventos[0][1]["dados"]["token"]["versao"], 1)
        self.assertEqual(eventos[1][1]["dados"]["token"]["id"], segredo_id)
        self.assertNotIn(segredo_id, str(eventos[0][1]))
        self.assertNotIn("Monstro secreto", str(eventos[0][1]))
        with self.engine.connect() as connection, connection.begin():
            self._como(connection, JOGADOR_A, "mesa:a")
            recebidos = list(connection.execute(text(
                "SELECT payload FROM realtime.messages WHERE topic = 'mesa:a'"
            )).scalars())
            self.assertEqual(len(recebidos), 1)
            self.assertNotIn(segredo_id, str(recebidos))
        with self.engine.connect() as connection, connection.begin():
            self._como(connection, JOGADOR_A, "mesa:a:narrador")
            self.assertEqual(connection.execute(text(
                "SELECT count(*) FROM realtime.messages WHERE topic = 'mesa:a:narrador'"
            )).scalar(), 0)
        with Session(self.engine) as session:
            self.assertEqual((session.get(sala.TokenRegistro, segredo_id).x,
                              session.get(sala.TokenRegistro, segredo_id).y), (4, 4))

    def _limpar_eventos_da_sala(self):
        with self.engine.begin() as connection:
            connection.exec_driver_sql("DELETE FROM realtime.messages")


if __name__ == "__main__":
    unittest.main()
