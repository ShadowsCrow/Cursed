// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicEntities } from "./PublicEntities";
import type { ApiClient, EntidadePublica } from "./types";

function renderPublicEntities(entidades: EntidadePublica[]) {
  const GET = vi.fn(async (path: string) => {
    if (path === "/mesas/{mesa_id}/entidades-publicas") return { data: entidades, error: undefined };
    throw new Error(`GET não simulado: ${path}`);
  });
  const api = { GET } as unknown as ApiClient;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PublicEntities api={api} mesaId="mesa-1" />
    </QueryClientProvider>,
  );
  return { GET };
}

describe("PublicEntities — 8.2 visão Grupo (nome público e retrato, nunca a ficha)", () => {
  afterEach(() => cleanup());

  it("mostra nome público e retrato de uma entidade revelada", async () => {
    const { GET } = renderPublicEntities([{ id: "npc-1", nome_publico: "Guarda Real", imagem: "ZmFrZQ==" }]);

    expect(await screen.findByText("Guarda Real")).toBeTruthy();
    const img = screen.getByRole("img", { name: "Retrato de Guarda Real" }) as HTMLImageElement;
    expect(img.src).toBe("data:image/png;base64,ZmFrZQ==");
    expect(GET).toHaveBeenCalledWith("/mesas/{mesa_id}/entidades-publicas", expect.objectContaining({ params: { path: { mesa_id: "mesa-1" } } }));
  });

  it("mostra 'Figura desconhecida' quando só o retrato foi revelado", async () => {
    renderPublicEntities([{ id: "npc-2", nome_publico: null, imagem: "ZmFrZQ==" }]);

    expect(await screen.findByText("Figura desconhecida")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Retrato de Figura desconhecida" })).toBeTruthy();
  });

  it("mostra iniciais quando só o nome foi revelado, sem imagem", async () => {
    renderPublicEntities([{ id: "npc-3", nome_publico: "Comerciante", imagem: null }]);

    expect(await screen.findByText("Comerciante")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Retrato ilustrativo de Comerciante" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: /^Retrato de/ })).toBeNull();
  });

  it("não expõe nenhum outro dado da ficha além de nome público e retrato", async () => {
    renderPublicEntities([{ id: "npc-4", nome_publico: "Sombra", imagem: null }]);
    await screen.findByText("Sombra");
    // O contrato EntidadePublica só carrega id/nome_publico/imagem; a asserção
    // acima já comprova que nada além disso é renderizado na lista.
    expect(screen.queryByText(/vida|poder|atributo|perícia/i)).toBeNull();
  });

  it("lista vazia mostra aviso claro sem quebrar", async () => {
    renderPublicEntities([]);
    expect(await screen.findByText("Nenhuma entidade revelada ao grupo ainda.")).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    renderPublicEntities([{ id: "npc-1", nome_publico: "Guarda Real", imagem: null }]);
    await screen.findByText("Guarda Real");
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
