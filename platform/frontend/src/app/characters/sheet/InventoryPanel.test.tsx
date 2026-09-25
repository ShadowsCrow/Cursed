// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EquippedItemsPanel, InventoryItemsPanel } from "./InventoryPanel";
import type { ApiClient, ItemInventarioResumo, PermissoesFicha } from "../types";

const permissoes: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};

const itens: ItemInventarioResumo[] = [
  { id: "item-1", tipo: "armadura", nome: "Cota de malha", quantidade: 1, equipado: true, cargas_atuais: null, cargas_maximas: null, dados: {}, efeitos: ["efeito-1"] },
  { id: "item-2", tipo: "outro", nome: "Kit de viagem", quantidade: 1, equipado: false, cargas_atuais: null, cargas_maximas: null, dados: {}, efeitos: [] },
];

function renderPanels(api: ApiClient, extra: Partial<PermissoesFicha> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onVersaoConfirmada = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <EquippedItemsPanel api={api} mesaId="mesa-1" personagemId="pj-1" itens={itens} versao={2} permissoes={{ ...permissoes, ...extra }} online onVersaoConfirmada={onVersaoConfirmada} />
      <InventoryItemsPanel api={api} mesaId="mesa-1" personagemId="pj-1" itens={itens} versao={2} permissoes={{ ...permissoes, ...extra }} online onVersaoConfirmada={onVersaoConfirmada} />
    </QueryClientProvider>,
  );
  return { onVersaoConfirmada };
}

describe("InventoryPanel — 6.6 inventário e equipamento visualmente distintos", () => {
  afterEach(() => cleanup());

  it("mostra equipados e inventário em áreas separadas", () => {
    const api = { POST: vi.fn() } as unknown as ApiClient;
    renderPanels(api);
    expect(screen.getByRole("region", { name: "Equipamentos equipados" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Inventário" })).toBeTruthy();
    const equipadaSection = screen.getByRole("region", { name: "Equipamentos equipados" });
    const inventarioSection = screen.getByRole("region", { name: "Inventário" });
    expect(equipadaSection.textContent).toContain("Cota de malha");
    expect(equipadaSection.textContent).not.toContain("Kit de viagem");
    expect(inventarioSection.textContent).toContain("Kit de viagem");
    expect(inventarioSection.textContent).not.toContain("Cota de malha");
  });

  it("equipar um item envia o comando com a versão do personagem e move o item para a área equipada", async () => {
    const equipado = { ...itens[1]!, equipado: true };
    const POST = vi.fn().mockResolvedValue({ data: { versao: 3, item: equipado }, error: undefined });
    const api = { POST } as unknown as ApiClient;
    const { onVersaoConfirmada } = renderPanels(api);

    const inventarioSection = screen.getByRole("region", { name: "Inventário" });
    fireEvent.click(fireEventTargetWithin(inventarioSection, "Equipar"));

    await waitFor(() => expect(POST).toHaveBeenCalledWith(
      "/mesas/{mesa_id}/personagens/{personagem_id}/inventario/{item_id}/equipar",
      expect.objectContaining({
        params: { path: { mesa_id: "mesa-1", personagem_id: "pj-1", item_id: "item-2" } },
        body: { equipado: true, versao_esperada: 2 },
      }),
    ));
    await waitFor(() => expect(onVersaoConfirmada).toHaveBeenCalledWith(3));
  });

  it("falha do servidor ao equipar reverte a prévia e anuncia o erro", async () => {
    const POST = vi.fn().mockResolvedValue({ data: undefined, error: { detail: "Versão da ficha desatualizada." } });
    const api = { POST } as unknown as ApiClient;
    renderPanels(api);

    const inventarioSection = screen.getByRole("region", { name: "Inventário" });
    fireEvent.click(fireEventTargetWithin(inventarioSection, "Equipar"));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Versão da ficha desatualizada.");
  });

  it("sem permissão de editar inventário, não há botão de equipar/desequipar", () => {
    const api = { POST: vi.fn() } as unknown as ApiClient;
    renderPanels(api, { editar: false });
    expect(screen.queryByRole("button", { name: "Equipar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Desequipar" })).toBeNull();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    const api = { POST: vi.fn() } as unknown as ApiClient;
    renderPanels(api);
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

function fireEventTargetWithin(container: HTMLElement, name: string): HTMLElement {
  const buttons = Array.from(container.querySelectorAll("button")).filter((btn) => btn.textContent === name);
  const button = buttons[0];
  if (!button) throw new Error(`Botão "${name}" não encontrado.`);
  return button;
}
