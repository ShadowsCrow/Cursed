"""Protege tabelas, arquivos e tópicos realtime com as associações de mesa.

Revision ID: 0007_acesso_privado
Revises: 0006_aprovacao_ficha

Somente PostgreSQL. As tabelas de domínio deixam de ser acessíveis pelos papéis
`anon` e `authenticated` do Supabase: clientes leem e escrevem apenas pela API.
Quando os esquemas `auth`, `storage` e `realtime` do Supabase existem, políticas
RLS liberam leitura de objetos do bucket privado e assinatura de tópicos privados
conforme as mesmas regras de `cursed_platform.acesso_privado`.
"""

from __future__ import annotations

from alembic import op


revision = "0007_acesso_privado"
down_revision = "0006_aprovacao_ficha"
branch_labels = None
depends_on = None


TABELAS = (
    "alembic_version",
    "rpg_tables",
    "table_memberships",
    "table_modules",
    "table_invitations",
    "table_sessions",
    "characters",
    "character_change_requests",
    "inventory_items",
    "character_effects",
    "effect_operations",
    "effect_sources",
)
BUCKET = "cursed-privado"
ID = "[A-Za-z0-9_-]{1,100}"

PODE_LER = """
CREATE FUNCTION cursed_acesso.pode_ler(
    p_usuario text, p_mesa text, p_escopo text, p_personagem text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT coalesce(p_usuario <> '' AND EXISTS (
        SELECT 1
        FROM public.table_memberships m
        JOIN public.rpg_tables t ON t.id = m.mesa_id
        WHERE m.mesa_id = p_mesa AND m.usuario_id = p_usuario AND m.ativo
          AND (
            (m.papel = 'narrador' AND t.narrador_id = p_usuario AND (
                p_escopo IN ('mesa', 'narrador')
                OR (p_escopo = 'personagem' AND EXISTS (
                    SELECT 1 FROM public.characters c
                    WHERE c.mesa_id = p_mesa AND c.id = p_personagem AND c.excluido_em IS NULL
                ))
            ))
            OR (m.papel = 'jogador' AND (
                p_escopo = 'mesa'
                OR (p_escopo = 'personagem' AND EXISTS (
                    SELECT 1 FROM public.characters c
                    WHERE c.mesa_id = p_mesa AND c.id = p_personagem AND c.excluido_em IS NULL
                      AND c.visibilidade <> 'narrador' AND c.proprietario_id = p_usuario
                ))
            ))
          )
    ), false)
$$
"""

PODE_LER_TOPICO = rf"""
CREATE FUNCTION cursed_acesso.pode_ler_topico(p_topico text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT coalesce(cursed_acesso.pode_ler(
        (SELECT auth.uid())::text,
        r[1],
        CASE WHEN r[3] IS NOT NULL THEN 'personagem'
             WHEN r[2] = 'narrador' THEN 'narrador'
             ELSE 'mesa' END,
        r[3]
    ), false)
    FROM (
        SELECT regexp_match(p_topico, '^mesa:({ID})(?::(narrador|personagem:({ID})))?$') AS r
    ) AS topico
$$
"""

PODE_LER_OBJETO = rf"""
CREATE FUNCTION cursed_acesso.pode_ler_objeto(p_bucket text, p_nome text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT coalesce(
        p_bucket = '{BUCKET}'
        AND p_nome !~ '(^|/)\.\.?(/|$)'
        AND cursed_acesso.pode_ler(
            (SELECT auth.uid())::text,
            r[1],
            CASE WHEN r[3] IS NOT NULL THEN 'personagem' ELSE r[2] END,
            r[3]
        ), false)
    FROM (
        SELECT regexp_match(
            p_nome, '^mesas/({ID})/(?:(mesa|narrador)|personagens/({ID}))/[^/]+(?:/[^/]+)*$'
        ) AS r
    ) AS objeto
$$
"""


def _existe(relacao: str) -> bool:
    return bool(op.get_bind().exec_driver_sql(f"SELECT to_regclass('{relacao}') IS NOT NULL").scalar())


def _papeis_supabase() -> list[str]:
    return list(
        op.get_bind().exec_driver_sql(
            "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname"
        ).scalars()
    )


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    papeis = _papeis_supabase()
    for tabela in TABELAS:
        op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY")
        if papeis:
            op.execute(f"REVOKE ALL ON public.{tabela} FROM {', '.join(papeis)}")

    op.execute("CREATE SCHEMA cursed_acesso")
    op.execute("REVOKE ALL ON SCHEMA cursed_acesso FROM PUBLIC")
    op.execute(PODE_LER)
    op.execute("REVOKE ALL ON FUNCTION cursed_acesso.pode_ler(text, text, text, text) FROM PUBLIC")

    auth_disponivel = op.get_bind().exec_driver_sql(
        "SELECT to_regprocedure('auth.uid()') IS NOT NULL"
    ).scalar()
    if not auth_disponivel or "authenticated" not in papeis:
        return
    op.execute("GRANT USAGE ON SCHEMA cursed_acesso TO authenticated")
    op.execute(PODE_LER_TOPICO)
    op.execute(PODE_LER_OBJETO)
    for assinatura in ("pode_ler_topico(text)", "pode_ler_objeto(text, text)"):
        op.execute(f"REVOKE ALL ON FUNCTION cursed_acesso.{assinatura} FROM PUBLIC")
        op.execute(f"GRANT EXECUTE ON FUNCTION cursed_acesso.{assinatura} TO authenticated")

    if _existe("storage.objects") and _existe("storage.buckets"):
        op.execute(
            f"INSERT INTO storage.buckets (id, name, public) VALUES ('{BUCKET}', '{BUCKET}', false) "
            "ON CONFLICT (id) DO UPDATE SET public = false"
        )
        op.execute(
            "CREATE POLICY cursed_objetos_leitura ON storage.objects FOR SELECT TO authenticated "
            "USING (cursed_acesso.pode_ler_objeto(bucket_id, name))"
        )
        # Restritiva: nenhuma outra política do projeto pode abrir o bucket privado.
        op.execute(
            f"CREATE POLICY cursed_objetos_restricao ON storage.objects AS RESTRICTIVE FOR ALL "
            f"TO {', '.join(papeis)} "
            f"USING (bucket_id <> '{BUCKET}' OR cursed_acesso.pode_ler_objeto(bucket_id, name)) "
            f"WITH CHECK (bucket_id <> '{BUCKET}')"
        )

    if _existe("realtime.messages"):
        condicao = (
            "extension IN ('broadcast', 'presence') "
            "AND cursed_acesso.pode_ler_topico((SELECT realtime.topic()))"
        )
        op.execute(
            f"CREATE POLICY cursed_realtime_receber ON realtime.messages FOR SELECT "
            f"TO authenticated USING ({condicao})"
        )
        op.execute(
            f"CREATE POLICY cursed_realtime_enviar ON realtime.messages FOR INSERT "
            f"TO authenticated WITH CHECK ({condicao})"
        )
        op.execute(
            f"CREATE POLICY cursed_realtime_restricao ON realtime.messages AS RESTRICTIVE FOR ALL "
            f"TO {', '.join(papeis)} "
            "USING ((SELECT realtime.topic()) NOT LIKE 'mesa:%' "
            "OR cursed_acesso.pode_ler_topico((SELECT realtime.topic()))) "
            "WITH CHECK ((SELECT realtime.topic()) NOT LIKE 'mesa:%' "
            "OR cursed_acesso.pode_ler_topico((SELECT realtime.topic())))"
        )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    if _existe("realtime.messages"):
        for politica in ("cursed_realtime_restricao", "cursed_realtime_enviar", "cursed_realtime_receber"):
            op.execute(f"DROP POLICY IF EXISTS {politica} ON realtime.messages")
    if _existe("storage.objects"):
        for politica in ("cursed_objetos_restricao", "cursed_objetos_leitura"):
            op.execute(f"DROP POLICY IF EXISTS {politica} ON storage.objects")
    # O bucket e seus objetos são preservados; privilégios revogados de anon e
    # authenticated não são devolvidos, para que o downgrade não exponha tabelas.
    op.execute("DROP SCHEMA IF EXISTS cursed_acesso CASCADE")
    for tabela in TABELAS:
        op.execute(f"ALTER TABLE public.{tabela} DISABLE ROW LEVEL SECURITY")
