// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { FichasDoPainel } from "./FichasDoPainel";

vi.mock("../characters/sheet/resumo/ResumoFicha", () => ({
  ResumoFicha: ({ personagemId, onAbrir }: { personagemId: string; onAbrir: (secao: string) => void }) => (
    <div data-testid="resumo">Resumo de {personagemId}<button type="button" onClick={() => onAbrir("atributos")}>Abrir atributos</button></div>
  ),
}));
vi.mock("../characters/sheet/CharacterSheetPage", () => ({
  CharacterSheetPage: ({ personagemId, onBack }: { personagemId: string; onBack: () => void }) => (
    <div>Ficha completa de {personagemId}<button type="button" onClick={onBack}>Voltar à mesa</button></div>
  ),
}));

const personagem = (id: string, nome: string, dono: string | null) => ({
  id, nome, mesa_id: "mesa", versao: 1, proprietario_id: dono, tipo: "personagem", visibilidade: "mesa", retrato_objeto: null,
});

function Endereco() {
  return <output data-testid="endereco">{useLocation().search}</output>;
}

function renderFichas(personagens: ReturnType<typeof personagem>[]) {
  const GET = vi.fn().mockImplementation(async (caminho: string) => {
    if (caminho === "/mesas/{mesa_id}/personagens") return { data: personagens, error: undefined };
    if (caminho.endsWith("/ficha")) return { data: { ficha: {}, versao: 1, tipo: "personagem" }, error: undefined };
    return { data: [], error: undefined };
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/mesas/mesa?painel=room"]}>
    <FichasDoPainel api={{ GET } as unknown as ApiClient} mesaId="mesa" userId="ana" />
    <Endereco />
  </MemoryRouter></QueryClientProvider>);
}

describe("aba Fichas do painel da Sala", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("mostra os retratos com os próprios personagens primeiro e navega pelas setas", async () => {
    renderFichas([
      personagem("p1", "Brom", "beto"), personagem("p2", "Cira", null), personagem("p3", "Dara", "beto"),
      personagem("p4", "Eron", "caio"), personagem("p5", "Lion", "ana"),
    ]);
    const faixa = await screen.findByRole("group", { name: "Personagens" });
    const nomes = () => within(faixa).getAllByRole("button").map((b) => b.textContent);
    expect(nomes()).toEqual(["Lion", "Brom", "Cira", "Dara"]);
    expect(within(faixa).getByRole("button", { name: "Lion" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "Personagens anteriores" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Próximos personagens" }));
    expect(nomes()).toEqual(["Brom", "Cira", "Dara", "Eron"]);
    expect((screen.getByRole("button", { name: "Próximos personagens" }) as HTMLButtonElement).disabled).toBe(true);
    expect((await screen.findByTestId("resumo")).textContent).toContain("Resumo de p5");
  });

  it("escolher um retrato mostra o resumo dele", async () => {
    renderFichas([personagem("p5", "Lion", "ana"), personagem("p1", "Brom", "beto")]);
    fireEvent.click(await screen.findByRole("button", { name: "Brom" }));
    expect(screen.getByRole("button", { name: "Brom" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: "Brom" })).toBeTruthy();
    expect((await screen.findByTestId("resumo")).textContent).toContain("Resumo de p1");
  });

  it("abre a ficha completa numa janela por cima da Sala e fecha voltando à Sala", async () => {
    renderFichas([personagem("p5", "Lion", "ana")]);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir ficha completa" }));
    const janela = screen.getByRole("dialog", { name: "Ficha de Lion" });
    expect(janela.textContent).toContain("Ficha completa de p5");
    fireEvent.click(within(janela).getByRole("button", { name: "Voltar à mesa" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("endereco").textContent).toBe("?painel=room");
  });

  it("um atalho do resumo abre a ficha completa na seção pedida", async () => {
    renderFichas([personagem("p5", "Lion", "ana")]);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir atributos" }));
    expect(screen.getByRole("dialog", { name: "Ficha de Lion" })).toBeTruthy();
    expect(screen.getByTestId("endereco").textContent).toContain("secao=atributos");
    fireEvent.click(screen.getByRole("button", { name: "Fechar ficha" }));
    expect(screen.getByTestId("endereco").textContent).not.toContain("secao");
  });

  it("sem personagens, avisa que não há o que mostrar", async () => {
    renderFichas([]);
    expect(await screen.findByText("Ainda não há personagens para mostrar.")).toBeTruthy();
  });
});
