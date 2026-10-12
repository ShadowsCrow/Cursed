// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { BolsaDoPainel } from "./BolsaDoPainel";

vi.mock("../characters/sheet/InventoryGridPanel", () => ({
  InventoryGridPanel: ({ personagemId, versao }: { personagemId: string; versao: number }) =>
    <div data-testid="grade">Grade de {personagemId} na versão {versao}</div>,
}));

const personagem = (id: string, nome: string, dono: string | null) => ({
  id, nome, mesa_id: "mesa", versao: 1, proprietario_id: dono, tipo: "personagem", visibilidade: "mesa", retrato_objeto: null,
});

function renderBolsa(narrator: boolean, personagens: ReturnType<typeof personagem>[]) {
  const GET = vi.fn().mockImplementation(async (caminho: string) => {
    if (caminho === "/mesas/{mesa_id}/personagens") return { data: personagens, error: undefined };
    if (caminho.endsWith("/ficha")) return { data: { ficha: {}, versao: 7, tipo: "personagem" }, error: undefined };
    return { data: [], error: undefined };
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>
    <BolsaDoPainel api={{ GET } as unknown as ApiClient} mesaId="mesa" userId="ana" narrator={narrator} />
  </QueryClientProvider>);
}

const mesa = [personagem("p1", "Brom", "beto"), personagem("p2", "Lion", "ana"), personagem("p3", "Cira", null)];

describe("aba Bolsa do painel da Sala", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("o Narrador escolhe de quem é a bolsa pelos retratos", async () => {
    renderBolsa(true, mesa);
    const faixa = await screen.findByRole("group", { name: "Personagens" });
    expect(within(faixa).getAllByRole("button").map((b) => b.textContent)).toEqual(["Brom", "Lion", "Cira"]);
    expect((await screen.findByTestId("grade")).textContent).toBe("Grade de p1 na versão 7");
    fireEvent.click(within(faixa).getByRole("button", { name: "Lion" }));
    expect(within(faixa).getByRole("button", { name: "Lion" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: "Bolsa de Lion" })).toBeTruthy();
    expect((await screen.findByTestId("grade")).textContent).toBe("Grade de p2 na versão 7");
  });

  it("o jogador só vê a bolsa dos próprios personagens", async () => {
    renderBolsa(false, mesa);
    const faixa = await screen.findByRole("group", { name: "Personagens" });
    expect(within(faixa).getAllByRole("button").map((b) => b.textContent)).toEqual(["Lion"]);
    expect((await screen.findByTestId("grade")).textContent).toBe("Grade de p2 na versão 7");
  });

  it("sem personagem, avisa conforme o papel", async () => {
    renderBolsa(false, [personagem("p1", "Brom", "beto")]);
    expect(await screen.findByText("Você ainda não tem personagem nesta mesa.")).toBeTruthy();
    cleanup();
    renderBolsa(true, []);
    expect(await screen.findByText("Ainda não há personagens na mesa.")).toBeTruthy();
  });
});
