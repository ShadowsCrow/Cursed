// @vitest-environment jsdom
import { act, cleanup, render, renderHook, waitFor } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { RoomPresence } from "./RoomPresence";
import { PREFERENCIAS_PADRAO, useGamificacaoDaSala } from "./useGamificacaoDaSala";

const RESPOSTAS: Record<string, unknown> = {
  "/mesas/{mesa_id}/sala/preferencias": { destaque_criticos: true, estatisticas_visiveis: false },
  "/mesas/{mesa_id}/sala/sessoes": { atual: { id: "s1", numero: 1, iniciada_em: "2026-10-04T20:00:00Z" }, ultima_encerrada: null },
  "/mesas/{mesa_id}/sala/estatisticas": { sessao: null, placar_visivel: false, jogadores: [] },
  "/mesas/{mesa_id}/sala/mvp": { votacao: null, historico: [], apelidos: {} },
};

function montar(api: ApiClient) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(() => useGamificacaoDaSala({ api, mesaId: "mesa", comTempoReal: true, ativo: true }), { wrapper }) };
}

describe("useGamificacaoDaSala", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("lê preferências, sessões, estatísticas e MVP da mesa", async () => {
    const GET = vi.fn(async (caminho: string) => ({ data: RESPOSTAS[caminho], error: undefined }));
    const { result } = montar({ GET } as unknown as ApiClient);
    await waitFor(() => expect(result.current.preferencias.destaque_criticos).toBe(true));
    await waitFor(() => expect(result.current.sessoes?.atual?.numero).toBe(1));
    expect(result.current.estatisticas?.jogadores).toEqual([]);
    expect(result.current.mvp?.historico).toEqual([]);
    expect(GET).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/preferencias", { params: { path: { mesa_id: "mesa" } } });
  });

  it("sem resposta válida, as preferências ficam desligadas", async () => {
    const GET = vi.fn(async () => ({ data: [], error: undefined }));
    const { result } = montar({ GET } as unknown as ApiClient);
    await waitFor(() => expect(GET).toHaveBeenCalled());
    expect(result.current.preferencias).toEqual(PREFERENCIAS_PADRAO);
    expect(result.current.sessoes).toBeNull();
  });

  it("as ações pedem ao servidor e renovam as consultas", async () => {
    const GET = vi.fn(async (caminho: string) => ({ data: RESPOSTAS[caminho], error: undefined }));
    const POST = vi.fn(async () => ({ data: {}, error: undefined }));
    const PUT = vi.fn(async () => ({ data: {}, error: undefined }));
    const { result, queryClient } = montar({ GET, POST, PUT } as unknown as ApiClient);
    await waitFor(() => expect(result.current.preferencias.destaque_criticos).toBe(true));
    const renovar = vi.spyOn(queryClient, "invalidateQueries");
    act(() => result.current.mudarPreferencias({ estatisticas_visiveis: true }));
    await waitFor(() => expect(PUT).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/preferencias", {
      params: { path: { mesa_id: "mesa" } }, body: { destaque_criticos: true, estatisticas_visiveis: true } }));
    await waitFor(() => expect(renovar).toHaveBeenCalledWith({ queryKey: ["sala-mvp", "mesa"] }));
    act(() => result.current.iniciarSessao());
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/sessoes", { params: { path: { mesa_id: "mesa" } } }));
    act(() => result.current.votar("kira"));
    await waitFor(() => expect(PUT).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/mvp/voto", {
      params: { path: { mesa_id: "mesa" } }, body: { candidato_id: "kira" } }));
    act(() => result.current.desempatar("ana"));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/mvp/desempate", {
      params: { path: { mesa_id: "mesa" } }, body: { vencedor_id: "ana" } }));
  });

  it("mostra o erro do servidor", async () => {
    const GET = vi.fn(async (caminho: string) => ({ data: RESPOSTAS[caminho], error: undefined }));
    const POST = vi.fn(async () => ({ data: undefined, error: { detail: "Já há uma sessão em andamento." } }));
    const { result } = montar({ GET, POST } as unknown as ApiClient);
    act(() => result.current.iniciarSessao());
    await waitFor(() => expect(result.current.erro).toBe("Já há uma sessão em andamento."));
  });
});

describe("avisos da gamificação no RoomPresence", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("renova as consultas certas a cada aviso", async () => {
    let status: (valor: "SUBSCRIBED") => void = () => {};
    const eventos = new Map<string, () => void>();
    const canal = {
      on: vi.fn((tipo: string, filtro: { event: string }, callback: () => void) => {
        if (tipo !== "presence") eventos.set(filtro.event, callback);
        return canal;
      }),
      subscribe: vi.fn((callback: typeof status) => { status = callback; return canal; }),
      presenceState: vi.fn(() => ({})), track: vi.fn().mockResolvedValue({}),
    };
    const client = { channel: vi.fn(() => canal), removeChannel: vi.fn().mockResolvedValue({}),
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) } } as unknown as SupabaseClient;
    const api = { GET: vi.fn().mockResolvedValue({ data: [{ topico: "mesa:mesa" }], error: undefined }) } as unknown as ApiClient;
    const queryClient = new QueryClient();
    render(<QueryClientProvider client={queryClient}>
      <RoomPresence api={api} mesaId="mesa" userId="ana" realtime={{ client, accessToken: "token" }} /></QueryClientProvider>);
    await waitFor(() => expect(eventos.has("sala.votacao")).toBe(true));
    const renovar = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
    await act(async () => { status("SUBSCRIBED"); });
    const chamadas = (evento: string) => {
      renovar.mockClear();
      eventos.get(evento)?.();
      return renovar.mock.calls.map(([filtro]) => (filtro as { queryKey: string[] }).queryKey[0]);
    };
    expect(chamadas("sala.preferencias")).toEqual(["sala-preferencias", "sala-estatisticas", "rolagens"]);
    expect(chamadas("sala.sessao")).toEqual(["sala-sessoes", "sala-estatisticas"]);
    expect(chamadas("sala.votacao")).toEqual(["sala-mvp"]);
    expect(chamadas("sala.rolagem")).toEqual(["rolagens", "sala-estatisticas"]);
    expect(chamadas("sala.turno")).toEqual(["sala-turno", "rolagens", "sala-mao"]);
    // Carta usada ou uso desfeito (cartas-na-cena): histórico, mão, ações do turno, estatísticas e PP da ficha.
    expect(chamadas("sala.uso")).toEqual(["usos", "sala-mao", "sala-turno", "sala-estatisticas", "valores-derivados"]);
  });
});
