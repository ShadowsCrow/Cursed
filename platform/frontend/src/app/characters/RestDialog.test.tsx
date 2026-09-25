// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RestDialog } from "./RestDialog";
import type { ApiClient, PersonagemResumo, ResultadoDescansoResumo } from "./types";

function personagem(overrides: Partial<PersonagemResumo> = {}): PersonagemResumo {
  return {
    id: "pj-1", mesa_id: "mesa-1", nome: "Nara Exemplo", tipo: "personagem", visibilidade: "mesa",
    proprietario_id: "usuario-1", versao: 3, excluido_em: null, restauravel_ate: null, ...overrides,
  };
}

function resultado(overrides: Partial<ResultadoDescansoResumo> = {}): ResultadoDescansoResumo {
  return {
    tipo: "curto",
    conforto: null,
    seguranca: null,
    permite_foco: false,
    resultados: [
      {
        personagem_id: "pj-1", nome: "Nara Exemplo", versao: 3, foco: null, altera: true,
        avisos: ["Escala de PV não registrada"],
        recursos: [{ recurso: "pv", antes: 10, maximo: 20, calculado: 5, aplicado: 5, depois: 15, aviso: null }],
        trilhas: [{ trilha: "exaustao", antes: 2, calculado: 1, aplicado: 1, depois: 1, faixa_antes: "Leve", faixa_depois: "Nenhuma" }],
      },
    ],
    ...overrides,
  };
}

interface Fixture {
  personagens?: PersonagemResumo[];
  previa?: (body: unknown) => Promise<{ data?: unknown; error?: unknown }>;
  confirmar?: (body: unknown) => Promise<{ data?: unknown; error?: unknown }>;
}

function createApi(fixture: Fixture = {}) {
  const GET = vi.fn(async (path: string) => {
    if (path === "/mesas/{mesa_id}/personagens") return { data: fixture.personagens ?? [personagem()], error: undefined };
    throw new Error(`GET não simulado: ${path}`);
  });
  const POST = vi.fn(async (path: string, options: { body: unknown }) => {
    if (path === "/mesas/{mesa_id}/descansos/previa") {
      return fixture.previa ? fixture.previa(options.body) : { data: resultado(), error: undefined };
    }
    if (path === "/mesas/{mesa_id}/descansos") {
      return fixture.confirmar ? fixture.confirmar(options.body) : { data: resultado(), error: undefined };
    }
    throw new Error(`POST não simulado: ${path}`);
  });
  const api = { GET, POST } as unknown as ApiClient;
  return { api, GET, POST };
}

function renderDialog(api: ApiClient) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RestDialog api={api} mesaId="mesa-1" />
    </QueryClientProvider>,
  );
}

async function openAndSelect() {
  fireEvent.click(screen.getByRole("button", { name: "Preparar descanso" }));
  const dialog = await screen.findByRole("dialog");
  const checkbox = await within(dialog).findByLabelText("Nara Exemplo");
  fireEvent.click(checkbox);
  return dialog;
}

describe("RestDialog — 8.4/8.5 preparação e confirmação de descanso", () => {
  afterEach(() => cleanup());

  it("a prévia renderiza antes → depois e os avisos do servidor, sem gravar nada", async () => {
    const { api, POST } = createApi();
    renderDialog(api);
    const dialog = await openAndSelect();

    fireEvent.click(within(dialog).getByRole("button", { name: "Pré-visualizar" }));

    expect(await screen.findByText("Escala de PV não registrada")).toBeTruthy();
    const table = screen.getByText("Recursos de Nara Exemplo").closest("table") as HTMLElement;
    expect(within(table).getByText("10")).toBeTruthy();
    expect(within(table).getByText("15")).toBeTruthy();
    expect(POST).toHaveBeenCalledTimes(1);
    expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/descansos/previa", expect.anything());
  });

  it("cancelar fecha o diálogo sem jamais chamar o endpoint de confirmação", async () => {
    const { api, POST } = createApi();
    renderDialog(api);
    const dialog = await openAndSelect();

    fireEvent.click(within(dialog).getByRole("button", { name: "Pré-visualizar" }));
    await screen.findByText("Recursos de Nara Exemplo");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(POST).not.toHaveBeenCalledWith("/mesas/{mesa_id}/descansos", expect.anything());
  });

  it("confirmar envia as mesmas versões vistas na prévia e o motivo informado", async () => {
    const { api, POST } = createApi();
    renderDialog(api);
    const dialog = await openAndSelect();

    fireEvent.click(within(dialog).getByRole("button", { name: "Pré-visualizar" }));
    await screen.findByText("Recursos de Nara Exemplo");

    fireEvent.change(within(dialog).getByLabelText("Motivo (opcional)"), { target: { value: "Acampamento na trilha" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/descansos",
        expect.objectContaining({
          body: expect.objectContaining({ versoes: { "pj-1": 3 }, motivo: "Acampamento na trilha" }),
        }),
      ),
    );
    expect(await screen.findByText("Descanso aplicado")).toBeTruthy();
  });

  it("o Foco de Repouso fica desabilitado quando a prévia informa permite_foco: false", async () => {
    const { api } = createApi();
    renderDialog(api);
    const dialog = await openAndSelect();

    expect(within(dialog).getByLabelText("Foco de Repouso")).toHaveProperty("disabled", true);

    fireEvent.click(within(dialog).getByRole("button", { name: "Pré-visualizar" }));
    await screen.findByText("Recursos de Nara Exemplo");
    expect(within(dialog).getByLabelText("Foco de Repouso")).toHaveProperty("disabled", true);
  });

  it("o Foco de Repouso é habilitado quando a prévia informa permite_foco: true", async () => {
    const { api } = createApi({ previa: async () => ({ data: resultado({ permite_foco: true }), error: undefined }) });
    renderDialog(api);
    const dialog = await openAndSelect();

    fireEvent.click(within(dialog).getByRole("button", { name: "Pré-visualizar" }));
    await screen.findByText("Recursos de Nara Exemplo");
    expect(within(dialog).getByLabelText("Foco de Repouso")).toHaveProperty("disabled", false);
  });

  it("um 409 na confirmação mostra o motivo do servidor e oferece refazer a prévia, sem perder a seleção", async () => {
    const { api } = createApi({
      confirmar: async () => ({ data: undefined, error: { detail: "A ficha de Nara Exemplo mudou desde a prévia." } }),
    });
    renderDialog(api);
    const dialog = await openAndSelect();

    fireEvent.click(within(dialog).getByRole("button", { name: "Pré-visualizar" }));
    await screen.findByText("Recursos de Nara Exemplo");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("A ficha de Nara Exemplo mudou desde a prévia.")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Refazer prévia" })).toBeTruthy();
    expect(within(dialog).getByLabelText("Nara Exemplo")).toHaveProperty("checked", true);
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente, com a prévia visível", async () => {
    const { api } = createApi();
    renderDialog(api);
    await openAndSelect();
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    await screen.findByText("Recursos de Nara Exemplo");

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
