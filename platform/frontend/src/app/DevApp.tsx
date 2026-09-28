import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router";

import { createAuthenticatedApiClient } from "../api/client";
import { AppRoutes } from "./App";
import { Entrada, type ModoEntrada } from "./plataforma/entrada/Entrada";
import { routePatterns, routes } from "./routes";

const CHAVE = "cursed-dev-identidade";
const VALIDA = /^[a-z0-9][a-z0-9_-]{0,49}$/;

function lerIdentidade(): string | null {
  try {
    const salva = window.localStorage.getItem(CHAVE);
    return salva && VALIDA.test(salva) ? salva : null;
  } catch {
    return null;
  }
}

function salvarIdentidade(id: string | null) {
  try {
    if (id) window.localStorage.setItem(CHAVE, id);
    else window.localStorage.removeItem(CHAVE);
  } catch {
    // Armazenamento indisponível: a identidade vale só nesta aba.
  }
}

/** "Rique.Souza@exemplo.com" -> "rique-souza": a identidade de teste vem da parte antes do @. */
function identidadeDoEmail(email: string): string | null {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const id = local.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "").replace(/-+$/, "").slice(0, 50);
  return VALIDA.test(id) ? id : null;
}

const MODOS: Record<string, ModoEntrada> = { [routePatterns.cadastro]: "cadastro", [routePatterns.recuperarSenha]: "recuperar" };

/**
 * Entrada de desenvolvimento local (VITE_DEV_AUTH=1): a mesma tela de entrar e criar conta do site,
 * mas qualquer e-mail entra e a senha não é conferida. A identidade vai para a API como `dev:<id>`,
 * aceito só com CURSED_DEV_AUTH fora de produção. Ninguém escolhe papel: quem cria uma campanha a
 * narra, quem entra por convite joga.
 */
export function DevApp({ apiUrl }: { apiUrl: string }) {
  const [identidade, setIdentidade] = useState<string | null>(lerIdentidade);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const local = useLocation();
  const api = useMemo(
    () => createAuthenticatedApiClient(apiUrl, async () => (identidade ? `dev:${identidade}` : null)),
    [apiUrl, identidade],
  );

  function entrar(id: string) {
    salvarIdentidade(id);
    queryClient.clear();
    setIdentidade(id);
    navigate(routes.home());
  }

  function sair() {
    salvarIdentidade(null);
    queryClient.clear();
    setIdentidade(null);
    navigate(routes.entrar(), { replace: true });
  }

  const auth = useMemo(() => {
    const comEmail = async ({ email }: { email: string }) => {
      const id = identidadeDoEmail(email);
      if (!id) return { data: {}, error: { message: "Invalid login credentials" } };
      entrar(id);
      return { data: {}, error: null };
    };
    const aceitar = async () => ({ data: {}, error: null });
    return { auth: { signInWithPassword: comEmail, signUp: comEmail, resetPasswordForEmail: aceitar,
      updateUser: aceitar, signInWithOAuth: aceitar } } as unknown as SupabaseClient;
    // `entrar` só usa setters estáveis e o navegador de rotas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!identidade) {
    const modo = MODOS[local.pathname] ?? "entrar";
    return (
      <Entrada key={modo} auth={auth} modo={modo} loginGoogle={false}
        observacao={<>Modo de desenvolvimento: qualquer e-mail entra e a senha não é conferida. Para testar duas pessoas, use outra janela anônima com outro e-mail.</>} />
    );
  }

  return (
    <>
      <div className="dev-banner" role="status">
        Modo dev · você é <strong>{identidade}</strong>
        <button type="button" className="button button--ghost" onClick={sair}>Sair</button>
      </div>
      <AppRoutes api={api} userId={identidade} onSignOut={sair} />
    </>
  );
}
