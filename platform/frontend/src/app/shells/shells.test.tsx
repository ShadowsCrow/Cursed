// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NarratorShell } from "./NarratorShell";
import { PlayerShell } from "./PlayerShell";

const mesa = { id: "mesa-a", nome: "O Véu de Aram", papel: "narrador" as const };

describe("shells de Narrador e jogador", () => {
  beforeEach(() => { window.scrollTo = vi.fn(); });
  afterEach(() => cleanup());

  it("o shell do Narrador tem uma estrutura própria: fila de pendências e atalhos exclusivos na lateral", () => {
    render(<MemoryRouter><NarratorShell mesa={mesa} view="overview" onNavigate={vi.fn()} onSignOut={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("complementary", { name: "Fila do Narrador" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Ferramentas do Narrador" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Seu personagem" })).toBeNull();
  });

  it("o shell do jogador tem uma estrutura própria: cartão do personagem na lateral, sem a fila do Narrador", () => {
    render(<MemoryRouter><PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole("region", { name: "Seu personagem" })).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Fila do Narrador" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Ferramentas do Narrador" })).toBeNull();
  });

  it("a navegação de cada shell reflete o papel, no desktop e na navegação móvel", () => {
    render(<MemoryRouter><NarratorShell mesa={mesa} view="overview" onNavigate={vi.fn()} onSignOut={vi.fn()} /></MemoryRouter>);
    const desktop = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const mobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    for (const nav of [desktop, mobile]) {
      expect(within(nav).getByRole("button", { name: "Registro" })).toBeTruthy();
      expect(within(nav).getByRole("button", { name: "Personagens" })).toBeTruthy();
    }

    cleanup();
    render(<MemoryRouter><PlayerShell mesa={{ ...mesa, papel: "jogador" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} /></MemoryRouter>);
    const playerDesktop = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const playerMobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    for (const nav of [playerDesktop, playerMobile]) {
      expect(within(nav).getByRole("button", { name: "Minha ficha" })).toBeTruthy();
      expect(within(nav).queryByRole("button", { name: "Registro" })).toBeNull();
    }
  });

  it("a navegação móvel é utilizável: tocar em um item aciona a navegação", () => {
    const onNavigate = vi.fn();
    render(<MemoryRouter><NarratorShell mesa={mesa} view="overview" onNavigate={onNavigate} onSignOut={vi.fn()} /></MemoryRouter>);
    const mobile = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    fireEvent.click(within(mobile).getByRole("button", { name: "Registro" }));
    expect(onNavigate).toHaveBeenCalledWith("activity");
  });
});
