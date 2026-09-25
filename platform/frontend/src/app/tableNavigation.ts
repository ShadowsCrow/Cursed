import type { GlyphName } from "../ui/Display";

export type TableRole = "narrador" | "jogador";
export type TableView = "overview" | "character" | "activity" | "cards" | "room";

export const tableNavigation: Record<TableRole, { id: TableView; label: string; icon: GlyphName }[]> = {
  narrador: [
    { id: "overview", label: "Visão geral", icon: "grid" },
    { id: "character", label: "Personagens", icon: "users" },
    { id: "activity", label: "Registro", icon: "scroll" },
    { id: "cards", label: "Biblioteca", icon: "cards" },
    { id: "room", label: "Sala", icon: "map" },
  ],
  jogador: [
    { id: "character", label: "Minha ficha", icon: "shield" },
    { id: "overview", label: "Grupo", icon: "users" },
    { id: "cards", label: "Biblioteca", icon: "cards" },
    { id: "room", label: "Sala", icon: "map" },
  ],
};

export function defaultTableView(role: TableRole): TableView {
  return role === "narrador" ? "overview" : "character";
}

export function permittedTableView(role: TableRole, candidate: string | null): TableView {
  return tableNavigation[role].find((item) => item.id === candidate)?.id ?? defaultTableView(role);
}
