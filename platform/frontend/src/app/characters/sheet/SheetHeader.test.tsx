// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SheetHeader } from "./SheetHeader";
import type { ApiClient, FichaContrato } from "../types";

describe("SheetHeader — 6.2 cabeçalho visual da ficha", () => {
  afterEach(() => cleanup());

  it("mostra retrato por iniciais, identidade completa e recursos quando presentes na ficha", () => {
    const ficha = {
      personagem: { nome: "Nara Exemplo", raca: "Elfo", classe: "Feiticeiro", arquetipo: "Arcano", idade: 28 },
      recursos: { pv: { atual: 18, maximo: 24 }, pp: { atual: 7, maximo: 12 } },
    } as unknown as FichaContrato;

    render(<SheetHeader ficha={ficha} />);

    expect(screen.getByRole("img", { name: "Retrato ilustrativo de Nara Exemplo" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nara Exemplo" })).toBeTruthy();
    expect(screen.getByText("Feiticeiro · Elfo")).toBeTruthy();
    expect(screen.getByText("Arcano")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Pontos de Vida" }).getAttribute("aria-valuetext")).toBe("18 de 24");
    expect(screen.getByRole("progressbar", { name: "Pontos de Poder" }).getAttribute("aria-valuetext")).toBe("7 de 12");
  });

  it("informa explicitamente que PV e PP não foram registrados quando ausentes, sem inventar valores", () => {
    const ficha = { personagem: { nome: "Ari Teste" } } as unknown as FichaContrato;
    render(<SheetHeader ficha={ficha} />);

    expect(screen.getByRole("heading", { name: "Ari Teste" })).toBeTruthy();
    expect(screen.queryByRole("progressbar", { name: "Pontos de Vida" })).toBeNull();
    expect(screen.queryByRole("progressbar", { name: "Pontos de Poder" })).toBeNull();
    const notices = screen.getAllByText("Não registrado");
    expect(notices).toHaveLength(2);
  });

  it("mostra o retrato real quando a ficha traz personagem.imagem_base64 (6.2 correção)", () => {
    const ficha = {
      personagem: { nome: "Nara Exemplo", imagem_base64: "ZmFrZS1wbmc=" },
    } as unknown as FichaContrato;

    render(<SheetHeader ficha={ficha} />);

    const img = screen.getByRole("img", { name: "Retrato de Nara Exemplo" }) as HTMLImageElement;
    expect(img.src).toBe("data:image/png;base64,ZmFrZS1wbmc=");
    expect(screen.queryByRole("img", { name: "Retrato ilustrativo de Nara Exemplo" })).toBeNull();
  });

  it("resolve imagem_ativo pelo recurso autorizado da mesa", async () => {
    const ficha = { personagem: { nome: "Nara Exemplo", imagem_ativo: "mesas/mesa/personagens/p1/legado/arte.png" } } as unknown as FichaContrato;
    const GET = vi.fn().mockResolvedValue({ data: { tipo: "image/png", base64: "YWJj" } });
    const api = { GET } as unknown as ApiClient;
    render(<QueryClientProvider client={new QueryClient()}>
      <SheetHeader ficha={ficha} api={api} mesaId="mesa" />
    </QueryClientProvider>);
    const imagem = await screen.findByRole("img", { name: "Retrato de Nara Exemplo" });
    expect(imagem.getAttribute("src")).toBe("data:image/png;base64,YWJj");
    expect(GET).toHaveBeenCalledWith("/mesas/{mesa_id}/ativos", {
      params: { path: { mesa_id: "mesa" }, query: { caminho: "mesas/mesa/personagens/p1/legado/arte.png" } },
    });
  });
});
