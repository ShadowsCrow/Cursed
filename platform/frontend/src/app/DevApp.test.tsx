// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DevApp } from "./DevApp";

function montar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/"]}><DevApp apiUrl="http://api.invalida" /></MemoryRouter></QueryClientProvider>);
}

describe("entrada do modo de desenvolvimento", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("é a mesma tela de entrar do site, sem escolha de papel nem contas prontas", () => {
    montar();
    expect(screen.getByRole("heading", { level: 1, name: "Entrar" })).toBeTruthy();
    expect(screen.getByText(/Modo de desenvolvimento: qualquer e-mail entra/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Narrador|Jogador|Conta de teste/ })).toBeNull();
  });

  it("qualquer e-mail entra; a identidade vem da parte antes do @", async () => {
    montar();
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "Iris.Souza@exemplo.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "qualquer" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText("iris-souza");
    expect(window.localStorage.getItem("cursed-dev-identidade")).toBe("iris-souza");
  });
});
