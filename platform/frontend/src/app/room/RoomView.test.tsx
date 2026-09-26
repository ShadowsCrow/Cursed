// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../characters/types";
import { RoomView } from "./RoomView";

vi.mock("./RoomCanvas", () => ({
  RoomCanvas: ({ cena }: { cena: { tokens: { id: string; x: number; y: number }[] } }) =>
    <div data-testid="grid">{cena.tokens.map((token) => `${token.id}:${token.x},${token.y}`).join(";")}</div>,
}));

const snapshot = {
  modulo_ativo: true,
  cenas: [],
  cena: {
    id: "cena", nome: "Pátio", colunas: 8, linhas: 6, mapa_objeto: null, ativa: true, versao: 1,
    camadas: [{ id: "camada", nome: "Tokens", visibilidade: "mesa", ordem: 1 }],
    tokens: [{ id: "heroi", camada_id: "camada", personagem_id: null, rotulo: "Herói",
      x: 1, y: 1, tamanho: 1, versao: 0, controlavel: true }],
  },
};

describe("movimento da sala", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("mostra a prévia e restaura a posição confirmada quando a rede falha", async () => {
    const GET = vi.fn().mockResolvedValue({ data: snapshot, error: undefined });
    let rejeitar!: (erro: Error) => void;
    const POST = vi.fn().mockImplementation(() => new Promise((_resolve, reject) => { rejeitar = reject; }));
    const api = { GET, POST } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><RoomView api={api} mesaId="mesa" userId="ana" narrator={false} /></QueryClientProvider>);
    expect((await screen.findByTestId("grid")).textContent).toContain("heroi:1,1");
    fireEvent.click(screen.getByRole("button", { name: /Herói \(1, 1\)/ }));
    fireEvent.change(screen.getByLabelText("Coluna de destino"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Linha de destino"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar movimento" }));
    await waitFor(() => expect(screen.getByTestId("grid").textContent).toContain("heroi:4,3"));
    expect(screen.getByText("Prévia local, aguardando confirmação…")).toBeTruthy();
    rejeitar(new Error("Conexão perdida"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Conexão perdida"));
    expect(screen.getByTestId("grid").textContent).toContain("heroi:1,1");
    expect(screen.getByRole("alert").textContent).toContain("última posição confirmada foi restaurada");
    expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento", {
      params: { path: { mesa_id: "mesa", token_id: "heroi" } },
      body: { x: 4, y: 3, versao_esperada: 0 },
    });
    expect(GET).toHaveBeenCalledTimes(1);
  });
});
