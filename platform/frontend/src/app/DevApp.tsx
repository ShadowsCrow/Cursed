import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { createAuthenticatedApiClient } from "../api/client";
import { AppRoutes } from "./App";
import { routes } from "./routes";

const CHAVE = "cursed-dev-identidade";
// Contas de teste, não papéis: narrar ou jogar vem de cada campanha. Os ids seguem os dados de exemplo.
const SUGESTOES = [
  { id: "narrador", rotulo: "Conta de teste 1" },
  { id: "jogador-1", rotulo: "Conta de teste 2" },
  { id: "jogador-2", rotulo: "Conta de teste 3" },
  { id: "jogador-3", rotulo: "Conta de teste 4" },
];
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

/**
 * Entrada de desenvolvimento local (VITE_DEV_AUTH=1): escolhe uma identidade sem senha
 * e a envia como `dev:<id>`. A API só aceita esse formato com CURSED_DEV_AUTH ligado
 * fora de produção.
 */
export function DevApp({ apiUrl }: { apiUrl: string }) {
  const [identidade, setIdentidade] = useState<string | null>(lerIdentidade);
  const [personalizada, setPersonalizada] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
  }

  if (!identidade) {
    return (
      <main className="page dev-login">
        <h1>Cursed · modo de desenvolvimento</h1>
        <p>Escolha uma conta de teste para esta aba. Não há senha: este modo existe só na sua máquina e substitui o login por e-mail.</p>
        <p>Isto não é escolher entre narrar e jogar: o papel vem de cada campanha (quem cria narra, quem entra por convite joga).</p>
        <div className="dev-login__choices">
          {SUGESTOES.map((s) => (
            <button key={s.id} type="button" className="button" onClick={() => entrar(s.id)}>{s.rotulo}</button>
          ))}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); if (VALIDA.test(personalizada)) entrar(personalizada); }}>
          <label>Outra identidade (minúsculas, números, - ou _)
            <input value={personalizada} onChange={(event) => setPersonalizada(event.target.value.trim().toLowerCase())} />
          </label>
          <button type="submit" className="button button--secondary" disabled={!VALIDA.test(personalizada)}>Entrar</button>
        </form>
        <p>Dica: abra outra janela anônima para usar outra conta ao mesmo tempo (por exemplo, quem narra e quem joga).</p>
      </main>
    );
  }

  return (
    <>
      <div className="dev-banner" role="status">
        Modo dev · você é <strong>{identidade}</strong>
        <button type="button" className="button button--ghost" onClick={sair}>Trocar identidade</button>
      </div>
      <AppRoutes api={api} userId={identidade} onSignOut={sair} />
    </>
  );
}
