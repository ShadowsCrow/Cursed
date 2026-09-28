// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { NarratorShell } from "./NarratorShell";
import { PlayerShell } from "./PlayerShell";

const mesa = { id: "mesa-a", nome: "O Véu de Aram", papel: "narrador" as const, sistema: "cursed" as const };

const api = {
  GET: vi.fn().mockResolvedValue({ data: [], error: undefined }),
} as unknown as ApiClient;

function withProviders(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}

describe("shells de Narrador e jogador", () => {
  beforeEach(() => { window.scrollTo = vi.fn(); });
  afterEach(() => cleanup());

  it("a mesa oferece o caminho de volta para a campanha em Campanhas", () => {
    render(withProviders(<PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(screen.getByRole("link", { name: "Campanhas" }).getAttribute("href")).toBe("/campanhas/mesa-a");
    expect(screen.getByRole("link", { name: "Voltar às campanhas" }).getAttribute("href")).toBe("/campanhas/mesa-a");
  });

  it("o shell do Narrador tem uma estrutura própria: fila de pendências e atalhos exclusivos na lateral", () => {
    render(withProviders(<NarratorShell mesa={mesa} view="overview" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(screen.getByRole("complementary", { name: "Fila do Narrador" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Ferramentas do Narrador" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Seu personagem" })).toBeNull();
  });

  it("o shell do jogador tem uma estrutura própria: cartão do personagem na lateral, sem a fila do Narrador", () => {
    render(withProviders(<PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    expect(screen.getByRole("region", { name: "Seu personagem" })).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Fila do Narrador" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Ferramentas do Narrador" })).toBeNull();
  });

  it("a navegação de cada shell reflete o papel, no desktop e na navegação móvel", () => {
    render(withProviders(<NarratorShell mesa={mesa} view="overview" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    const desktop = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const mobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    for (const nav of [desktop, mobile]) {
      expect(within(nav).getByRole("button", { name: "Registro" })).toBeTruthy();
      expect(within(nav).getByRole("button", { name: "Personagens" })).toBeTruthy();
    }

    cleanup();
    render(withProviders(<PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    const playerDesktop = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const playerMobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    for (const nav of [playerDesktop, playerMobile]) {
      expect(within(nav).getByRole("button", { name: "Minha ficha" })).toBeTruthy();
      expect(within(nav).getByRole("button", { name: "Registro" })).toBeTruthy();
    }
  });

  it("a navegação móvel é utilizável: tocar em um item aciona a navegação", () => {
    const onNavigate = vi.fn();
    render(withProviders(<NarratorShell mesa={mesa} view="overview" onNavigate={onNavigate} onSignOut={vi.fn()} api={api} userId="usuario-1" onOpenCharacter={vi.fn()} />));
    const mobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    fireEvent.click(within(mobile).getByRole("button", { name: "Registro" }));
    expect(onNavigate).toHaveBeenCalledWith("activity");
  });
});
