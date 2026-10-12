// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import listasDoSistema from "../../../../../../cursed_platform/catalogos/listas_ficha.json";
import type { ApiClient, FichaSnapshot } from "../types";
import { CharacterSheetPage } from "./CharacterSheetPage";

/*
 * A História é um campo só (reformular-personalidade-da-ficha, tarefa 8.3): o que o jogador salva na aba
 * Personalidade é o mesmo texto que o Resumo mostra.
 */

function apiDeTeste() {
  let snapshot: FichaSnapshot = {
    mesa_id: "mesa-1", personagem_id: "pj-1", versao: 1, tipo: "personagem",
    ficha: { personagem: { nome: "Lion" }, personalidade: {} },
  };
  const permissoes = { papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [] };
  const GET = vi.fn(async (caminho: string) => {
    if (caminho.endsWith("/ficha")) return { data: snapshot, error: undefined };
    if (caminho.endsWith("/permissoes")) return { data: permissoes, error: undefined };
    if (caminho.endsWith("/catalogos/listas-ficha")) return { data: listasDoSistema, error: undefined };
    // O resto da ficha (valores, inventário, efeitos, cartas, catálogos) vazio: não entra neste teste.
    return { data: [], error: undefined };
  });
  const PUT = vi.fn(async (caminho: string, opcoes: { body: { ficha: FichaSnapshot["ficha"] } }) => {
    if (!caminho.endsWith("/ficha")) throw new Error(`PUT não simulado: ${caminho}`);
    snapshot = { ...snapshot, versao: snapshot.versao + 1, ficha: opcoes.body.ficha };
    return { data: snapshot, error: undefined, response: { status: 200 } };
  });
  return { api: { GET, POST: vi.fn(), PUT } as unknown as ApiClient, PUT };
}

describe("História compartilhada entre a aba Personalidade e o Resumo", () => {
  afterEach(() => cleanup());

  it("salvar a História na aba Personalidade faz o Resumo mostrar o mesmo texto", async () => {
    const { api, PUT } = apiDeTeste();
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={["/ficha?secao=personalidade"]}>
          <CharacterSheetPage api={api} mesaId="mesa-1" personagemId="pj-1" userId="usuario-1" onBack={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Editar História" }));
    fireEvent.change(screen.getByLabelText("História", { selector: "textarea" }), { target: { value: "Veio de terras antigas." } });
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" }).at(-1)!);
    await waitFor(() => expect(PUT).toHaveBeenCalled());
    expect(PUT.mock.calls[0]![1].body.ficha.personalidade).toEqual({ historia: "Veio de terras antigas." });

    const aba = document.querySelector("#painel-personalidade")!;
    await waitFor(() => expect(aba.querySelector(".personalidade-historia__texto")?.textContent).toBe("Veio de terras antigas."));

    fireEvent.click(screen.getByRole("tab", { name: /Resumo/ }));
    const resumo = document.querySelector<HTMLElement>("#painel-resumo")!;
    await waitFor(() => expect(within(resumo).getByText("Veio de terras antigas.")).toBeTruthy());
  });
});
