import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Route, Routes, useNavigate, useParams } from "react-router";
import type { Session } from "@supabase/supabase-js";

import { signInWithPassword, signOut } from "../auth/supabase";
import { CharacterSheetPage } from "./characters/sheet/CharacterSheetPage";
import type { createPlatformClients } from "./clients";
import { TableWorkspace } from "./TableWorkspace";
import { routePatterns, routes } from "./routes";

type Clients = ReturnType<typeof createPlatformClients>;

function ErrorNotice({ error }: { error: unknown }) {
  return <p role="alert">{error instanceof Error ? error.message : "Não foi possível carregar os dados."}</p>;
}

function Login({ clients }: { clients: Clients }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signInWithPassword(clients.auth, email, password);
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page">
      <h1>Cursed</h1>
      <p>Entre para acessar suas mesas.</p>
      <p><Link to="/preview">Conhecer a prévia visual</Link></p>
      <form onSubmit={(event) => { void submit(event); }}>
        <label>E-mail<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Senha<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
      </form>
      {error !== null && <ErrorNotice error={error} />}
    </main>
  );
}

function useMesas(clients: Clients, userId: string) {
  return useQuery({
    queryKey: ["mesas", userId],
    queryFn: async () => {
      const { data, error } = await clients.api.GET("/mesas");
      if (error) throw new Error("Não foi possível carregar as mesas.");
      return data ?? [];
    },
    refetchOnMount: "always",
  });
}

function Tables({ clients, userId, onSignOut }: { clients: Clients; userId: string; onSignOut: () => void }) {
  const mesas = useMesas(clients, userId);

  return (
    <main className="page">
      <header className="topbar"><span>CURSED · PLATAFORMA RPG</span><button type="button" onClick={onSignOut}>Sair</button></header>
      <h1>Suas mesas</h1>
      {mesas.isPending && <p>Carregando mesas…</p>}
      {mesas.isError && <ErrorNotice error={mesas.error} />}
      {mesas.isSuccess && mesas.data.length === 0 && <p>Você ainda não participa de uma mesa.</p>}
      {mesas.isSuccess && (
        <ul>{mesas.data.map((mesa) => <li key={mesa.id}><Link to={routes.table(mesa.id)}>{mesa.nome}</Link> — {mesa.papel}</li>)}</ul>
      )}
    </main>
  );
}

export function TablePage({ clients, userId, onSignOut }: { clients: Clients; userId: string; onSignOut: () => void }) {
  const { mesaId } = useParams<"mesaId">();
  const mesas = useMesas(clients, userId);
  if (mesas.isPending || mesas.isFetching) return <main className="page"><p>Verificando acesso à mesa…</p></main>;
  if (mesas.isError) return <main className="page"><ErrorNotice error={mesas.error} /><Link to={routes.home()}>Voltar às mesas</Link></main>;
  const mesa = mesas.data.find((item) => item.id === mesaId);
  if (!mesa) return <main className="page"><h1>Mesa indisponível</h1><p>Esta mesa não está entre as suas mesas ativas.</p><Link to={routes.home()}>Voltar às mesas</Link></main>;
  return <TableWorkspace mesa={mesa} api={clients.api} userId={userId} onSignOut={onSignOut} />;
}

function CharacterPage({ clients, userId }: { clients: Clients; userId: string }) {
  const { mesaId, personagemId } = useParams<"mesaId" | "personagemId">();
  const navigate = useNavigate();
  if (!mesaId || !personagemId) {
    return <main className="page"><h1>Personagem indisponível</h1><Link to={routes.home()}>Voltar às mesas</Link></main>;
  }
  return (
    <main className="page">
      <CharacterSheetPage
        api={clients.api}
        mesaId={mesaId}
        personagemId={personagemId}
        userId={userId}
        onBack={() => navigate(routes.table(mesaId))}
      />
    </main>
  );
}

export function App({ clients }: { clients: Clients }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [authError, setAuthError] = useState<unknown>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    void clients.auth.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error);
      setSession(data.session);
    });
    const { data: subscription } = clients.auth.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        queryClient.clear();
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [clients, queryClient]);

  if (authError) return <main className="page"><ErrorNotice error={authError} /></main>;
  if (session === undefined) return <main className="page"><p>Verificando acesso…</p></main>;
  if (session === null) return <Login clients={clients} />;

  const onSignOut = () => { void signOut(clients.auth).catch(setAuthError); };

  return (
    <Routes>
      <Route path={routePatterns.home} element={<Tables clients={clients} userId={session.user.id} onSignOut={onSignOut} />} />
      <Route path={routePatterns.table} element={<TablePage clients={clients} userId={session.user.id} onSignOut={onSignOut} />} />
      <Route path={routePatterns.character} element={<CharacterPage clients={clients} userId={session.user.id} />} />
      <Route path="*" element={<main className="page"><h1>Página não encontrada</h1><Link to={routes.home()}>Ir às mesas</Link></main>} />
    </Routes>
  );
}
