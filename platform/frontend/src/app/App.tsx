import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router";
import type { Session } from "@supabase/supabase-js";

import { signOut } from "../auth/supabase";
import { CharacterSheetPage } from "./characters/sheet/CharacterSheetPage";
import { CriarPersonagemPage } from "./characters/creation/CriarPersonagemPage";
import type { ApiClient } from "./characters/types";
import type { createPlatformClients } from "./clients";
import { TableWorkspace } from "./TableWorkspace";
import { routePatterns, routes } from "./routes";
import { TableEvents, type RealtimeSession } from "./room/RoomPresence";
import { EstadoDePagina } from "../ui/Tema";
import { Biblioteca } from "./plataforma/biblioteca/Biblioteca";
import { Campanhas } from "./plataforma/campanhas/Campanhas";
import { CascoPlataforma } from "./plataforma/CascoPlataforma";
import { Entrada, type ModoEntrada } from "./plataforma/entrada/Entrada";
import { Inicio } from "./plataforma/Inicio";
import { BoasVindas, MeuPerfil } from "./plataforma/perfil/Perfil";
import { Personagens } from "./plataforma/personagens/Personagens";

type Clients = ReturnType<typeof createPlatformClients>;

function ErrorNotice({ error }: { error: unknown }) {
  return <p role="alert">{error instanceof Error ? error.message : "Não foi possível carregar os dados."}</p>;
}

function useMesas(api: ApiClient, userId: string) {
  return useQuery({
    queryKey: ["mesas", userId],
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas");
      if (error) throw new Error("Não foi possível carregar as campanhas.");
      return data ?? [];
    },
    refetchOnMount: "always",
  });
}

function VoltarAsCampanhas() {
  return <Link to={routes.campanhas()}>Voltar às campanhas</Link>;
}

export function TablePage({ api, userId, onSignOut, realtime, pagina = "mesa" }: { api: ApiClient; userId: string; onSignOut: () => void; realtime?: RealtimeSession; pagina?: "mesa" | "criar-personagem" }) {
  const { mesaId } = useParams<"mesaId">();
  const mesas = useMesas(api, userId);
  if (mesas.isPending || mesas.isFetching) return <EstadoDePagina><p>Verificando acesso à mesa…</p></EstadoDePagina>;
  if (mesas.isError) return <EstadoDePagina><ErrorNotice error={mesas.error} /><VoltarAsCampanhas /></EstadoDePagina>;
  const mesa = mesas.data.find((item) => item.id === mesaId);
  if (!mesa) return <main className="page"><h1>Mesa indisponível</h1><p>Esta mesa não está entre as suas campanhas ativas.</p><VoltarAsCampanhas /></main>;
  if (pagina === "criar-personagem") return <CriarPersonagemPage mesa={mesa} api={api} userId={userId} onSignOut={onSignOut} />;
  return <TableWorkspace mesa={mesa} api={api} userId={userId} onSignOut={onSignOut} realtime={realtime} />;
}

function CharacterPage({ api, userId, realtime }: { api: ApiClient; userId: string; realtime?: RealtimeSession }) {
  const { mesaId, personagemId } = useParams<"mesaId" | "personagemId">();
  const navigate = useNavigate();
  if (!mesaId || !personagemId) {
    return <main className="page"><h1>Personagem indisponível</h1><VoltarAsCampanhas /></main>;
  }
  return (
    <main className="page page--ficha">
      {realtime && <TableEvents api={api} mesaId={mesaId} realtime={realtime} />}
      <p><Link to={routes.campanha(mesaId)}>Campanhas</Link></p>
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

/** Telas antes de entrar: cada modo tem endereço próprio; qualquer outro endereço mostra "Entrar". */
function RotasPublicas({ clients }: { clients: Clients }) {
  const local = useLocation();
  const modos: Record<string, ModoEntrada> = {
    [routePatterns.cadastro]: "cadastro",
    [routePatterns.recuperarSenha]: "recuperar",
  };
  const modo = modos[local.pathname] ?? "entrar";
  return <Entrada key={modo} auth={clients.auth} modo={modo} />;
}

export function App({ clients }: { clients: Clients }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [authError, setAuthError] = useState<unknown>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void clients.auth.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error);
      setSession(data.session);
    });
    const { data: subscription } = clients.auth.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      // O link de redefinição cria uma sessão temporária: antes de tudo, a pessoa escolhe a nova senha.
      if (event === "PASSWORD_RECOVERY") setRecuperandoSenha(true);
      setSession(next);
      queryClient.clear();
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [clients, queryClient]);

  if (authError) return <EstadoDePagina alerta><ErrorNotice error={authError} /></EstadoDePagina>;
  if (session === undefined) return <EstadoDePagina><p>Verificando acesso…</p></EstadoDePagina>;
  if (session === null) return <RotasPublicas clients={clients} />;
  if (recuperandoSenha) {
    return <Entrada auth={clients.auth} modo="redefinir"
      onSenhaRedefinida={() => { setRecuperandoSenha(false); navigate(routes.home(), { replace: true }); }} />;
  }

  const onSignOut = () => {
    queryClient.clear();
    navigate(routes.entrar(), { replace: true });
    void signOut(clients.auth).catch(setAuthError);
  };

  return <AppRoutes api={clients.api} userId={session.user.id} onSignOut={onSignOut}
    realtime={{ client: clients.auth, accessToken: session.access_token }} />;
}

/** Rotas autenticadas, compartilhadas pelo login Supabase e pelo modo de desenvolvimento local. */
export function AppRoutes({ api, userId, onSignOut, realtime }: { api: ApiClient; userId: string; onSignOut: () => void; realtime?: RealtimeSession }) {
  const props = { api, userId };
  return (
    <Routes>
      <Route element={<CascoPlataforma api={api} userId={userId} onSignOut={onSignOut} />}>
        <Route index element={<Inicio {...props} />} />
        <Route path={routePatterns.campanhas} element={<Campanhas {...props} />} />
        <Route path={routePatterns.campanha} element={<Campanhas {...props} />} />
        <Route path={routePatterns.personagens} element={<Navigate to={routes.personagens()} replace />} />
        <Route path={routePatterns.colecao} element={<Personagens {...props} />} />
        <Route path={routePatterns.personagemDoAcervo} element={<Personagens {...props} />} />
        <Route path={routePatterns.biblioteca} element={<Biblioteca />} />
        <Route path={routePatterns.regras} element={<Biblioteca />} />
        <Route path={routePatterns.documento} element={<Biblioteca />} />
        <Route path={routePatterns.perfil} element={<MeuPerfil {...props} />} />
        <Route path="*" element={<main className="page"><h1>Página não encontrada</h1><Link to={routes.home()}>Ir ao Início</Link></main>} />
      </Route>
      <Route path={routePatterns.boasVindas} element={<BoasVindas {...props} />} />
      {/* Endereços de entrada abertos já com sessão (ex.: link de confirmação) levam ao Início. */}
      {[routePatterns.entrar, routePatterns.cadastro, routePatterns.recuperarSenha, routePatterns.redefinirSenha].map((caminho) => (
        <Route key={caminho} path={caminho} element={<Navigate to={routes.home()} replace />} />
      ))}
      <Route path={routePatterns.table} element={<TablePage api={api} userId={userId} onSignOut={onSignOut} realtime={realtime} />} />
      <Route path={routePatterns.createCharacter} element={<TablePage api={api} userId={userId} onSignOut={onSignOut} pagina="criar-personagem" />} />
      <Route path={routePatterns.character} element={<CharacterPage api={api} userId={userId} realtime={realtime} />} />
    </Routes>
  );
}
