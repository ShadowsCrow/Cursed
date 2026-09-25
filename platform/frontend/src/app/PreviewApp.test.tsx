// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreviewApp } from "./PreviewApp";

describe("prévia navegável", () => {
  beforeEach(() => { window.scrollTo = vi.fn(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("mostra o painel do Narrador e abre a ficha pelo menu", () => {
    render(<MemoryRouter><PreviewApp /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /A história espera/i })).toBeTruthy();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegação da mesa" })).getByRole("button", { name: "Personagens" }));
    expect(screen.getByRole("heading", { name: "Ari Teste", level: 1 })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Equipamento" }));
    expect(screen.getByText("Lâmina da Vigília")).toBeTruthy();
  });

  it("altera navegação e conteúdo ao alternar para jogador", () => {
    render(<MemoryRouter><PreviewApp /></MemoryRouter>);
    fireEvent.change(screen.getByRole("combobox", { name: "Visualizar como" }), { target: { value: "jogador" } });
    const desktopNav = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const mobileNav = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    expect(within(desktopNav).getByRole("button", { name: "Minha ficha" })).toBeTruthy();
    expect(within(mobileNav).getByRole("button", { name: "Minha ficha" })).toBeTruthy();
    expect(within(desktopNav).getByRole("button", { name: "Registro" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ari Teste", level: 1 })).toBeTruthy();
  });

  it("exibe os tokens e componentes no guia visual", () => {
    render(<MemoryRouter><PreviewApp /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Abrir guia visual" }));
    expect(screen.getByRole("heading", { name: "Um mundo em detalhes" })).toBeTruthy();
    expect(screen.getByText("#E4BD78")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Pontos de Vida" })).toBeTruthy();
  });
});
