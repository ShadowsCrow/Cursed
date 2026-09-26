import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Route, Routes, useNavigate, useParams } from "react-router";
import type { Session } from "@supabase/supabase-js";

import { signInWithPassword, signOut } from "../auth/supabase";
import { CharacterSheetPage } from "./characters/sheet/CharacterSheetPage";
import { extractErrorMessage, type ApiClient } from "./characters/types";
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

function useMesas(api: ApiClient, userId: string) {
  return useQuery({
    queryKey: ["mesas", userId],
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas");
      if (error) throw new Error("Não foi possível carregar as mesas.");
      return data ?? [];
    },
    refetchOnMount: "always",
  });
}

function NewTableForms({ api, userId }: { api: ApiClient; userId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const aposEntrar = (mesa: { id: string }) => {
    void queryClient.invalidateQueries({ queryKey: ["mesas", userId] });
    navigate(routes.table(mesa.id));
  };
  const criar = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/mesas", { body: { nome: nome.trim() } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível criar a mesa."));
      return data as { id: string };
    },
    onSuccess: aposEntrar,
  });
  const aceitar = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/convites/aceitar", { body: { codigo: codigo.trim() } });
      if (error) throw new Error(extractErrorMessage(error, "Convite indisponível."));
      return data as { id: string };
    },
    onSuccess: aposEntrar,
  });
  return (
    <div className="table-forms">
      <form className="panel" onSubmit={(event) => { event.preventDefault(); criar.mutate(); }}>
        <h2>Criar mesa</h2>
        <p>Você será o Narrador da nova mesa.</p>
        <label>Nome da mesa<input required value={nome} onChange={(event) => setNome(event.target.value)} /></label>
        <button type="submit" className="button" disabled={criar.isPending || !nome.trim()}>Criar mesa</button>
        {criar.isError && <p role="alert">{criar.error.message}</p>}
      </form>
      <form className="panel" onSubmit={(event) => { event.preventDefault(); aceitar.mutate(); }}>
        <h2>Entrar com convite</h2>
        <p>Cole o código enviado pelo Narrador.</p>
        <label>Código do convite<input required value={codigo} onChange={(event) => setCodigo(event.target.value)} /></label>
        <button type="submit" className="button" disabled={aceitar.isPending || !codigo.trim()}>Entrar na mesa</button>
        {aceitar.isError && <p role="alert">{aceitar.error.message}</p>}
      </form>
    </div>
  );
}

function Tables({ api, userId, onSignOut }: { api: ApiClient; userId: string; onSignOut: () => void }) {
  const mesas = useMesas(api, userId);

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
      <NewTableForms api={api} userId={userId} />
    </main>
  );
}

export function TablePage({ api, userId, onSignOut }: { api: ApiClient; userId: string; onSignOut: () => void }) {
  const { mesaId } = useParams<"mesaId">();
  const mesas = useMesas(api, userId);
  if (mesas.isPending || mesas.isFetching) return <main className="page"><p>Verificando acesso à mesa…</p></main>;
  if (mesas.isError) return <main className="page"><ErrorNotice error={mesas.error} /><Link to={routes.home()}>Voltar às mesas</Link></main>;
  const mesa = mesas.data.find((item) => item.id === mesaId);
  if (!mesa) return <main className="page"><h1>Mesa indisponível</h1><p>Esta mesa não está entre as suas mesas ativas.</p><Link to={routes.home()}>Voltar às mesas</Link></main>;
  return <TableWorkspace mesa={mesa} api={api} userId={userId} onSignOut={onSignOut} />;
}

function CharacterPage({ api, userId }: { api: ApiClient; userId: string }) {
  const { mesaId, personagemId } = useParams<"mesaId" | "personagemId">();
  const navigate = useNavigate();
  if (!mesaId || !personagemId) {
    return <main className="page"><h1>Personagem indisponível</h1><Link to={routes.home()}>Voltar às mesas</Link></main>;
  }
  return (
    <main className="page">
      <CharacterSheetPage
        api={api}
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

  return <AppRoutes api={clients.api} userId={session.user.id} onSignOut={onSignOut} />;
}

/** Rotas autenticadas, compartilhadas pelo login Supabase e pelo modo de desenvolvimento local. */
export function AppRoutes({ api, userId, onSignOut }: { api: ApiClient; userId: string; onSignOut: () => void }) {
  return (
    <Routes>
      <Route path={routePatterns.home} element={<Tables api={api} userId={userId} onSignOut={onSignOut} />} />
      <Route path={routePatterns.table} element={<TablePage api={api} userId={userId} onSignOut={onSignOut} />} />
      <Route path={routePatterns.character} element={<CharacterPage api={api} userId={userId} />} />
      <Route path="*" element={<main className="page"><h1>Página não encontrada</h1><Link to={routes.home()}>Ir às mesas</Link></main>} />
    </Routes>
  );
}
