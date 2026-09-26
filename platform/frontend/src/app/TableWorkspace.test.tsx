// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { createPlatformClients } from "./clients";
import { TablePage } from "./App";
import { routes } from "./routes";

type Clients = ReturnType<typeof createPlatformClients>;

function renderTable(initialEntry: string, rows: { id: string; nome: string; papel: "narrador" | "jogador" }[], failure = false) {
  const get = failure ? vi.fn().mockRejectedValue(new Error("Sem acesso")) : vi.fn().mockResolvedValue({ data: rows, error: undefined });
  const clients = { api: { GET: get } } as unknown as Clients;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialEntry]}><Link to={routes.table("mesa-b")}>Abrir mesa B</Link><Routes><Route path="/mesas/:mesaId" element={<TablePage api={clients.api} userId="usuario-1" onSignOut={vi.fn()} />} /></Routes></MemoryRouter></QueryClientProvider>);
  return get;
}

describe("shell autenticado da mesa", () => {
  beforeEach(() => { window.scrollTo = vi.fn(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("usa o papel de cada mesa no desktop e na navegação móvel", async () => {
    const get = renderTable("/mesas/mesa-a", [
      { id: "mesa-a", nome: "Campanha do Norte", papel: "narrador" },
      { id: "mesa-b", nome: "Caminhos de Sal", papel: "jogador" },
    ]);
    expect(await screen.findByRole("heading", { name: "A mesa em um relance" })).toBeTruthy();
    const desktop = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const mobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    expect(within(desktop).getByRole("button", { name: "Registro" })).toBeTruthy();
    expect(within(mobile).getByRole("button", { name: "Registro" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Abrir mesa B" }));
    expect(await screen.findByRole("heading", { name: "Seu personagem em foco" })).toBeTruthy();
    expect(screen.getByText("Caminhos de Sal", { selector: ".sidebar__campaign strong" })).toBeTruthy();
    expect(within(screen.getByRole("navigation", { name: "Navegação da mesa" })).getByRole("button", { name: "Minha ficha" })).toBeTruthy();
    expect(within(screen.getByRole("navigation", { name: "Navegação móvel da mesa" })).getByRole("button", { name: "Registro" })).toBeTruthy();
    expect(get).toHaveBeenCalledWith("/mesas");
  });

  it("não apresenta uma mesa fora da lista autorizada, nem aceita um painel inexistente por URL", async () => {
    renderTable("/mesas/mesa-b?painel=inexistente", [{ id: "mesa-b", nome: "Caminhos de Sal", papel: "jogador" }]);
    expect(await screen.findByRole("heading", { name: "Seu personagem em foco" })).toBeTruthy();
    expect(within(screen.getByRole("navigation", { name: "Navegação da mesa" })).getByRole("button", { name: "Registro" })).toBeTruthy();
    cleanup();
    renderTable("/mesas/mesa-oculta", [{ id: "mesa-b", nome: "Caminhos de Sal", papel: "jogador" }]);
    expect(await screen.findByRole("heading", { name: "Mesa indisponível" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Navegação da mesa" })).toBeNull();
  });

  it("não mostra conteúdo de mesa quando a consulta falha", async () => {
    renderTable("/mesas/mesa-a", [], true);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByRole("navigation", { name: "Navegação da mesa" })).toBeNull();
  });
});
