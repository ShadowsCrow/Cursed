import { useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link, Route, Routes, useNavigate, useParams } from "react-router";

import { AppRoutes } from "../App";
import { criarApiDeDemonstracao, estadoDeDemonstracao } from "./apiDemonstracao";
import { Entrada } from "./entrada/Entrada";
import { MolduraOrnamentada } from "../../ui/Ornamentos";
import { routes } from "../routes";

/**
 * A mesa, a ficha e o assistente de criação precisam do servidor de verdade: na prévia, esses
 * endereços explicam isso em vez de abrir uma tela que não tem dados de exemplo.
 */
function ForaDaPrevia() {
  const { mesaId } = useParams<"mesaId">();
  return (
    <main className="boas-vindas">
      <MolduraOrnamentada tipo="painel" className="perfil" role="status">
        <h1 className="lateral__titulo">Só no ambiente completo</h1>
        <p>A mesa, a ficha e a criação de personagem precisam do servidor e do banco de verdade, então não abrem nesta prévia com dados de exemplo.</p>
        <p>Para testá-las, use o ambiente local completo (API e banco de teste).</p>
        <Link className="button button--primary" to={mesaId ? routes.campanha(mesaId) : routes.campanhas()}>Voltar às campanhas</Link>
      </MolduraOrnamentada>
    </main>
  );
}

/** Autenticação de mentira para a prévia: nada sai do navegador; entrar sempre "funciona". */
function authDeDemonstracao(irParaInicio: () => void): SupabaseClient {
  const aceitar = async () => ({ data: {}, error: null });
  return {
    auth: {
      signInWithPassword: async () => { irParaInicio(); return { data: {}, error: null }; },
      signUp: aceitar, resetPasswordForEmail: aceitar, updateUser: aceitar, signInWithOAuth: aceitar,
    },
  } as unknown as SupabaseClient;
}

/**
 * Prévia visual da navegação inicial (tarefa 4.2): as telas reais com dados ilustrativos, montadas
 * sob `/preview/plataforma`. `?novo=1` mostra o primeiro acesso.
 */
export function ProvaDaPlataforma() {
  const navigate = useNavigate();
  const { api } = useMemo(() => {
    const estado = estadoDeDemonstracao();
    if (new URLSearchParams(window.location.search).has("novo")) estado.perfil.apelido = null;
    return criarApiDeDemonstracao(estado);
  }, []);
  const auth = useMemo(() => authDeDemonstracao(() => navigate("/")), [navigate]);
  return (
    <Routes>
      <Route path="/entrar" element={<Entrada auth={auth} modo="entrar" loginGoogle />} />
      <Route path="/cadastro" element={<Entrada auth={auth} modo="cadastro" loginGoogle />} />
      <Route path="/recuperar-senha" element={<Entrada auth={auth} modo="recuperar" />} />
      <Route path="/mesas/:mesaId/*" element={<ForaDaPrevia />} />
      <Route path="*" element={<AppRoutes api={api} userId="voce" onSignOut={() => navigate("/entrar")} />} />
    </Routes>
  );
}
