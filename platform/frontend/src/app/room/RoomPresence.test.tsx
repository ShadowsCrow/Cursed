// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { RoomPresence } from "./RoomPresence";

function ambiente() {
  let status: (status: "SUBSCRIBED" | "CHANNEL_ERROR") => void = () => {};
  let sincronizar: () => void = () => {};
  const eventos = new Map<string, () => void>();
  let presentes: Record<string, unknown[]> = {};
  const track = vi.fn().mockResolvedValue({});
  const canal = {
    on: vi.fn((tipo: string, filtro: { event: string }, callback: () => void) => {
      if (tipo === "presence") sincronizar = callback;
      else eventos.set(filtro.event, callback);
      return canal;
    }),
    subscribe: vi.fn((callback: typeof status) => { status = callback; return canal; }),
    presenceState: vi.fn(() => presentes),
    track,
  };
  const removeChannel = vi.fn().mockResolvedValue({});
  const setAuth = vi.fn().mockResolvedValue(undefined);
  const channel = vi.fn(() => canal);
  const client = { channel, removeChannel, realtime: { setAuth } } as unknown as SupabaseClient;
  const GET = vi.fn().mockResolvedValue({ data: [{ topico: "mesa:mesa" }], error: undefined });
  const api = { GET } as unknown as ApiClient;
  return {
    api, client, GET, channel, setAuth, track, removeChannel,
    status: (novo: "SUBSCRIBED" | "CHANNEL_ERROR") => status(novo),
    sincronizar: (ids: string[]) => {
      presentes = Object.fromEntries(ids.map((id) => [id, [{}]]));
      sincronizar();
    },
    evento: (nome: string) => eventos.get(nome)?.(),
  };
}

function montar(conteudo: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const resultado = render(<QueryClientProvider client={queryClient}>{conteudo}</QueryClientProvider>);
  return { ...resultado, queryClient };
}

describe("presença privada da mesa", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("autentica antes da inscrição, acompanha sync e remove participantes expirados", async () => {
    const a = ambiente();
    const { unmount } = montar(<RoomPresence api={a.api} mesaId="mesa" userId="ana"
      realtime={{ client: a.client, accessToken: "token" }} />);
    await waitFor(() => expect(a.channel).toHaveBeenCalledOnce());
    expect(a.GET).toHaveBeenCalledWith("/mesas/{mesa_id}/canais", { params: { path: { mesa_id: "mesa" } } });
    expect(a.setAuth).toHaveBeenCalledWith("token");
    expect(a.channel).toHaveBeenCalledWith("mesa:mesa", {
      config: { private: true, presence: { key: "ana" } },
    });
    act(() => { a.status("SUBSCRIBED"); });
    await waitFor(() => expect(a.track).toHaveBeenCalledWith({ usuario_id: "ana" }));
    act(() => { a.sincronizar(["ana", "bia"]); });
    expect(screen.getByLabelText("2 participante(s) conectado(s)").textContent).toContain("ana, bia");
    act(() => { a.sincronizar(["ana"]); });
    expect(screen.getByLabelText("1 participante(s) conectado(s)").textContent).not.toContain("bia");
    unmount();
    expect(a.removeChannel).toHaveBeenCalledOnce();
  });

  it("não inscreve usuário removido e descarta a presença após erro do canal", async () => {
    const a = ambiente();
    const realtime = { client: a.client, accessToken: "token" };
    const { rerender, queryClient } = montar(<RoomPresence api={a.api} mesaId="mesa" userId="ana" realtime={realtime} />);
    await waitFor(() => expect(a.channel).toHaveBeenCalledOnce());
    act(() => {
      a.status("SUBSCRIBED");
      a.sincronizar(["ana"]);
      a.status("CHANNEL_ERROR");
    });
    expect(screen.getByText("Presença indisponível.")).toBeTruthy();
    a.GET.mockResolvedValue({ data: undefined, error: { detail: "Mesa não encontrada." } });
    rerender(<QueryClientProvider client={queryClient}><RoomPresence api={a.api} mesaId="mesa" userId="ana"
      realtime={{ client: a.client, accessToken: "novo-token" }} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText("Presença: acesso à mesa revogado.")).toBeTruthy());
    expect(a.channel).toHaveBeenCalledOnce();
    expect(a.removeChannel).toHaveBeenCalledOnce();
  });

  it("recarrega snapshot na inscrição e novamente após evento recebido durante a consulta", async () => {
    const a = ambiente();
    const { queryClient } = montar(<RoomPresence api={a.api} mesaId="mesa" userId="ana"
      realtime={{ client: a.client, accessToken: "token" }} />);
    await waitFor(() => expect(a.channel).toHaveBeenCalledOnce());
    let concluir!: () => void;
    const primeira = new Promise<void>((resolve) => { concluir = resolve; });
    const atualizar = vi.spyOn(queryClient, "invalidateQueries").mockImplementationOnce(() => primeira)
      .mockResolvedValue(undefined);
    act(() => { a.status("SUBSCRIBED"); });
    expect(atualizar).toHaveBeenCalledTimes(1);
    act(() => { a.evento("token.movido"); });
    expect(atualizar).toHaveBeenCalledTimes(1);
    await act(async () => { concluir(); await primeira; });
    await waitFor(() => expect(atualizar).toHaveBeenCalledTimes(2));
    expect(atualizar).toHaveBeenCalledWith({ queryKey: ["sala", "mesa"] });
  });
});
