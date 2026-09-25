import { useSearchParams } from "react-router";
import type { components } from "../api/generated/schema";
import { NarratorShell } from "./shells/NarratorShell";
import { PlayerShell } from "./shells/PlayerShell";
import { permittedTableView, type TableView } from "./tableNavigation";

type Mesa = components["schemas"]["MesaResumo"];

/**
 * Ponto de entrada do shell autenticado da mesa: decide, a partir de `mesa.papel`
 * (devolvido pela API), qual shell estruturalmente distinto renderizar. O papel
 * decide apenas o que a interface mostra — a autorização real é sempre do servidor.
 */
export function TableWorkspace({ mesa, onSignOut }: { mesa: Mesa; onSignOut: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = mesa.papel;
  const view = permittedTableView(role, searchParams.get("painel"));

  function navigate(next: TableView) {
    setSearchParams({ painel: next });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  if (role === "narrador") {
    return <NarratorShell mesa={mesa} view={view} onNavigate={navigate} onSignOut={onSignOut} />;
  }
  return <PlayerShell mesa={mesa} view={view} onNavigate={navigate} onSignOut={onSignOut} />;
}
