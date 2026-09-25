import { useNavigate, useSearchParams } from "react-router";
import type { components } from "../api/generated/schema";
import { routes } from "./routes";
import { NarratorShell } from "./shells/NarratorShell";
import { PlayerShell } from "./shells/PlayerShell";
import { permittedTableView, type TableView } from "./tableNavigation";
import type { ApiClient } from "./characters/types";

type Mesa = components["schemas"]["MesaResumo"];

/**
 * Ponto de entrada do shell autenticado da mesa: decide, a partir de `mesa.papel`
 * (devolvido pela API), qual shell estruturalmente distinto renderizar. O papel
 * decide apenas o que a interface mostra — a autorização real é sempre do servidor.
 */
export function TableWorkspace({
  mesa,
  api,
  userId,
  onSignOut,
}: {
  mesa: Mesa;
  api: ApiClient;
  userId: string;
  onSignOut: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigateTo = useNavigate();
  const role = mesa.papel;
  const view = permittedTableView(role, searchParams.get("painel"));

  function navigate(next: TableView) {
    setSearchParams({ painel: next });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function openCharacter(personagemId: string) {
    navigateTo(routes.character(mesa.id, personagemId));
  }

  if (role === "narrador") {
    return (
      <NarratorShell
        mesa={mesa}
        view={view}
        onNavigate={navigate}
        onSignOut={onSignOut}
        api={api}
        userId={userId}
        onOpenCharacter={openCharacter}
      />
    );
  }
  return (
    <PlayerShell
      mesa={mesa}
      view={view}
      onNavigate={navigate}
      onSignOut={onSignOut}
      api={api}
      userId={userId}
      onOpenCharacter={openCharacter}
    />
  );
}
