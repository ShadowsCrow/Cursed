// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComponentCatalog } from "./ComponentCatalog";

describe("catálogo visual isolado de componentes", () => {
  beforeEach(() => { window.scrollTo = vi.fn(); });
  afterEach(() => cleanup());

  it("mostra o retrato com e sem imagem", () => {
    render(<MemoryRouter><ComponentCatalog /></MemoryRouter>);
    expect(screen.getByText("Sem imagem (iniciais ilustrativas)")).toBeTruthy();
    expect(screen.getByText("Com imagem (ilustrativa)")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Retrato ilustrativo de Ari Teste" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Retrato de Mira Voss" })).toBeTruthy();
  });

  it("mostra a barra de recurso cheia, parcial, vazia e acima do máximo", () => {
    render(<MemoryRouter><ComponentCatalog /></MemoryRouter>);
    expect(screen.getByRole("progressbar", { name: "Pontos de Vida (cheia)" }).getAttribute("aria-valuetext")).toBe("24 de 24");
    expect(screen.getByRole("progressbar", { name: "Pontos de Poder (parcial)" }).getAttribute("aria-valuetext")).toBe("7 de 12");
    expect(screen.getByRole("progressbar", { name: "Foco (vazio)" }).getAttribute("aria-valuetext")).toContain("esgotado");
    expect(screen.getByRole("progressbar", { name: "Pontos de Vida (acima do máximo)" }).getAttribute("aria-valuetext")).toContain("acima do máximo");
  });

  it("mostra o ícone de efeito com detalhe completo por clique", () => {
    render(<MemoryRouter><ComponentCatalog /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Véu Protetor" }));
    const detail = screen.getByRole("group", { name: "Véu Protetor" });
    expect(within(detail).getByText("Mira Voss")).toBeTruthy();
    expect(within(detail).getByText("3 rodadas")).toBeTruthy();
  });

  it("mostra o slot de equipamento vazio, ocupado e desabilitado", () => {
    render(<MemoryRouter><ComponentCatalog /></MemoryRouter>);
    expect(screen.getAllByText("Lâmina da Vigília").length).toBeGreaterThan(0);
    expect(screen.getByText("Vazio")).toBeTruthy();
    expect(screen.getByText("Amuleto selado")).toBeTruthy();
    expect(screen.getByText("Bloqueado pelo Narrador")).toBeTruthy();
  });

  it("mostra a carta base para habilidade, magia, item e efeito, com custos separados quando informados", () => {
    render(<MemoryRouter><ComponentCatalog /></MemoryRouter>);
    expect(screen.getByText("Vigília Inabalável")).toBeTruthy();
    expect(screen.getAllByText("Custo de aprendizado").length).toBe(2);
    expect(screen.getAllByText("Custo de uso").length).toBe(2);
    expect(screen.getByText("Véu Protetor")).toBeTruthy();
    expect(screen.getAllByText("Lâmina da Vigília").length).toBeGreaterThan(0);
  });

  it("mostra o indicador de conectividade e a demonstração de prévia local vs. confirmação remota", () => {
    render(<MemoryRouter><ComponentCatalog /></MemoryRouter>);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Equipar \(comando simulado\)/ })).toBeTruthy();
  });

  it("abre o diálogo, o painel lateral e a confirmação de exemplo das primitivas", () => {
    render(<MemoryRouter><ComponentCatalog /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    expect(screen.getByRole("dialog", { name: "Aplicar efeito" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    fireEvent.click(screen.getByRole("button", { name: "Abrir painel lateral" }));
    expect(screen.getByRole("dialog", { name: "Inventário" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    fireEvent.click(screen.getByRole("button", { name: "Excluir personagem" }));
    expect(screen.getByRole("dialog", { name: "Excluir personagem?" })).toBeTruthy();
  });
});
