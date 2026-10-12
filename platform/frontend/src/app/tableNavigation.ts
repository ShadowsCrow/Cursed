import type { GlyphName } from "../ui/Display";

export type TableRole = "narrador" | "jogador";
export type TableView = "overview" | "character" | "activity" | "cards" | "room";

export const tableNavigation: Record<TableRole, { id: TableView; label: string; icon: GlyphName }[]> = {
  narrador: [
    { id: "room", label: "Sala", icon: "map" },
    { id: "overview", label: "Visão geral", icon: "grid" },
    { id: "character", label: "Personagens", icon: "users" },
    { id: "activity", label: "Registro", icon: "scroll" },
    { id: "cards", label: "Biblioteca", icon: "cards" },
  ],
  jogador: [
    { id: "room", label: "Sala", icon: "map" },
    { id: "character", label: "Minha ficha", icon: "shield" },
    { id: "overview", label: "Grupo", icon: "users" },
    { id: "activity", label: "Registro", icon: "scroll" },
    { id: "cards", label: "Biblioteca", icon: "cards" },
  ],
};

/** A Sala é a página principal da mesa para os dois papéis (experiencia-da-mesa, item 2). */
export function defaultTableView(): TableView {
  return "room";
}

export function permittedTableView(role: TableRole, candidate: string | null): TableView {
  return tableNavigation[role].find((item) => item.id === candidate)?.id ?? defaultTableView();
}
