// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImportDialog } from "./ImportDialog";
import type { ApiClient, PermissoesFicha } from "../types";

const permissoes: PermissoesFicha = {
  papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
};

function renderDialog(api: ApiClient, onImported = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ImportDialog api={api} mesaId="mesa-1" personagemId="pj-1" versao={4} permissoes={permissoes} onImported={onImported} />
    </QueryClientProvider>,
  );
  return { onImported };
}

describe("ImportDialog — 6.8 importação com pré-visualização", () => {
  afterEach(() => cleanup());

  it("sucesso: pré-visualiza sem gravar e só grava ao confirmar", async () => {
    const previa = {
      tipo: "equipamento" as const,
      item: { tipo: "armadura" as const, nome: "Cota de malha", dados: { armadura: 2 } },
      efeitos: [{ nome: "Bênção da armadura", descricao: "Reforça a proteção.", modificadores: [{ alvo: "defesa:armadura", valor: 2, contexto: null }] }],
      avisos: [],
    };
    const resultado = { versao: 5, item: { id: "item-9", tipo: "armadura" as const, nome: "Cota de malha", quantidade: 1, equipado: false, cargas_atuais: null, cargas_maximas: null, dados: {}, efeitos: [] }, efeitos: [] };
    const POST = vi.fn()
      .mockImplementationOnce(async () => ({ data: previa, error: undefined }))
      .mockImplementationOnce(async () => ({ data: resultado, error: undefined }));
    const api = { POST } as unknown as ApiClient;
    const { onImported } = renderDialog(api);

    fireEvent.click(screen.getByRole("button", { name: "Importar código" }));
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "EQ1:xyz" } });
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));

    expect(await screen.findByText(/Cota de malha \(armadura\)/)).toBeTruthy();
    expect(screen.getByText(/Bênção da armadura/)).toBeTruthy();
    expect(POST).toHaveBeenCalledTimes(1);
    expect(POST).toHaveBeenNthCalledWith(1,
      "/mesas/{mesa_id}/personagens/{personagem_id}/importacoes/previa",
      expect.objectContaining({ body: { codigo: "EQ1:xyz" } }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(resultado));
    expect(POST).toHaveBeenNthCalledWith(2,
      "/mesas/{mesa_id}/personagens/{personagem_id}/importacoes",
      expect.objectContaining({ body: { codigo: "EQ1:xyz", versao_esperada: 4 } }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancelamento: fecha sem jamais chamar o endpoint de gravação", async () => {
    const previa = { tipo: "efeito" as const, item: null, efeitos: [{ nome: "Vigília", descricao: "Alerta.", modificadores: [] }], avisos: [] };
    const POST = vi.fn().mockResolvedValue({ data: previa, error: undefined });
    const api = { POST } as unknown as ApiClient;
    renderDialog(api);

    fireEvent.click(screen.getByRole("button", { name: "Importar código" }));
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "E1:abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    expect(await screen.findByText(/Vigília/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(POST).toHaveBeenCalledTimes(1);
    expect(POST).toHaveBeenCalledWith(
      "/mesas/{mesa_id}/personagens/{personagem_id}/importacoes/previa",
      expect.anything(),
    );
  });

  it("erro: a mensagem do servidor aparece e nada muda", async () => {
    const POST = vi.fn().mockResolvedValue({ data: undefined, error: { detail: "Código não reconhecido. Use um código de efeito (E1/E2) ou de equipamento (EQ1/EQ2)." } });
    const api = { POST } as unknown as ApiClient;
    const { onImported } = renderDialog(api);

    fireEvent.click(screen.getByRole("button", { name: "Importar código" }));
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "XYZ" } });
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Código não reconhecido. Use um código de efeito (E1/E2) ou de equipamento (EQ1/EQ2).",
    );
    expect(screen.queryByRole("button", { name: "Confirmar" })).toHaveProperty("disabled", true);
    expect(onImported).not.toHaveBeenCalled();
    expect(POST).toHaveBeenCalledTimes(1);
  });

  it("não mostra o diálogo de importação para quem não tem permissão de editar", () => {
    const api = { POST: vi.fn() } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ImportDialog api={api} mesaId="mesa-1" personagemId="pj-1" versao={4} permissoes={{ ...permissoes, editar: false }} onImported={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Importar código" })).toBeNull();
  });
});
