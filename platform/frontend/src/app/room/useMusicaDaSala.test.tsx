// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { CHAVE_VOLUME } from "./musica";
import { useMusicaDaSala } from "./useMusicaDaSala";

const tocadores: { sincronizar: ReturnType<typeof vi.fn>; definirVolume: ReturnType<typeof vi.fn>; destruir: ReturnType<typeof vi.fn> }[] = [];
vi.mock("./tocadorDaMesa", () => ({
  TocadorDaMesa: class {
    sincronizar = vi.fn();
    definirVolume = vi.fn();
    destruir = vi.fn();
    liberar = vi.fn();
    constructor() { tocadores.push(this); }
  },
}));

const BIBLIOTECA = {
  momentos: ["Combate"], cenarios: ["Medieval", "Masmorra / Caverna"],
  faixas: [
    { id: "dungeon-ambience", tipo: "ambiente", titulo: "Dungeon Ambience", autor: "yd (OpenGameArt)", licenca: "CC0",
      licenca_url: "https://creativecommons.org/publicdomain/zero/1.0/", origem_url: "https://opengameart.org",
      arquivo: "/musica/dungeon-ambience.ogg", duracao_s: 206, momento: null, cenario: "Masmorra / Caverna", sem_emenda: true },
    { id: "clash-defiant", tipo: "musica", titulo: "Clash Defiant", autor: "Kevin MacLeod (incompetech.com)", licenca: "CC BY 4.0",
      licenca_url: "https://creativecommons.org/licenses/by/4.0/", origem_url: "https://incompetech.com",
      arquivo: "/musica/clash-defiant.mp3", duracao_s: 376, momento: "Combate", cenario: "Medieval", sem_emenda: false },
  ],
};

const VAZIA = { faixa_id: null, tocando: false, posicao_ms: 0, repetir: true, alterada_em: null };

function montar(estado: Record<string, unknown>) {
  let atual = estado;
  const GET = vi.fn().mockImplementation(async (caminho: string) => ({
    data: caminho === "/musicas" ? BIBLIOTECA : atual, error: undefined,
  }));
  const PUT = vi.fn().mockImplementation(async (_caminho: string, { params, body }: {
    params: { path: { camada: string } }; body: Record<string, unknown>;
  }) => {
    atual = { ...atual, [params.path.camada]: { ...body, alterada_em: new Date().toISOString() }, agora: new Date().toISOString() };
    return { data: atual, error: undefined };
  });
  const api = { GET, PUT } as unknown as ApiClient;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const hook = renderHook(() => useMusicaDaSala({ api, mesaId: "mesa", comTempoReal: false, ativo: true }), { wrapper });
  return { ...hook, GET, PUT };
}

describe("música e ambiente da mesa no navegador", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); tocadores.length = 0; window.localStorage.clear(); });

  it("quem entra no meio ouve as duas camadas na posição esperada, pelo relógio do servidor", async () => {
    const agora = Date.now();
    // Relógio do servidor 60 s à frente deste navegador; a música começou há 30 s e o ambiente há 100 s.
    const { result } = montar({
      ambiente: { faixa_id: "dungeon-ambience", tocando: true, posicao_ms: 0, repetir: true,
        alterada_em: new Date(agora - 40_000).toISOString() },
      musica: { faixa_id: "clash-defiant", tocando: true, posicao_ms: 0, repetir: true,
        alterada_em: new Date(agora + 30_000).toISOString() },
      agora: new Date(agora + 60_000).toISOString(),
    });
    await waitFor(() => expect(result.current.musica.faixaAtual?.titulo).toBe("Clash Defiant"));
    expect(result.current.ambiente.faixaAtual?.titulo).toBe("Dungeon Ambience");
    expect(result.current.musica.posicao().segundos).toBeGreaterThan(29.5);
    expect(result.current.musica.posicao().segundos).toBeLessThan(31);
    expect(result.current.ambiente.posicao().segundos).toBeGreaterThan(99.5);
    expect(tocadores).toHaveLength(2);
    const [doAmbiente, daMusica] = tocadores;
    expect(doAmbiente!.sincronizar.mock.calls.at(-1)![0].faixa.id).toBe("dungeon-ambience");
    expect(daMusica!.sincronizar.mock.calls.at(-1)![0].faixa.id).toBe("clash-defiant");
  });

  it("o Narrador toca, pausa na posição atual, continua e para cada camada", async () => {
    const agora = Date.now();
    const { result, PUT } = montar({
      ambiente: VAZIA,
      musica: { faixa_id: "clash-defiant", tocando: true, posicao_ms: 10_000, repetir: false,
        alterada_em: new Date(agora - 32_000).toISOString() },
      agora: new Date(agora).toISOString(),
    });
    await waitFor(() => expect(result.current.musica.faixaAtual).not.toBeNull());
    act(() => result.current.musica.pausar());
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(1));
    expect(PUT.mock.calls[0]![0]).toBe("/mesas/{mesa_id}/sala/musica/{camada}");
    expect(PUT.mock.calls[0]![1].params.path).toEqual({ mesa_id: "mesa", camada: "musica" });
    const pausa = PUT.mock.calls[0]![1].body;
    expect(pausa).toMatchObject({ faixa_id: "clash-defiant", tocando: false, repetir: false });
    expect(pausa.posicao_ms).toBeGreaterThanOrEqual(41_900);
    expect(pausa.posicao_ms).toBeLessThan(43_000);
    await waitFor(() => expect(result.current.musica.estado?.tocando).toBe(false));
    act(() => result.current.musica.continuar());
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(2));
    expect(PUT.mock.calls[1]![1].body).toEqual({ faixa_id: "clash-defiant", tocando: true, posicao_ms: pausa.posicao_ms, repetir: false });
    act(() => result.current.ambiente.tocar("dungeon-ambience"));
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(3));
    expect(PUT.mock.calls[2]![1].params.path.camada).toBe("ambiente");
    expect(PUT.mock.calls[2]![1].body).toEqual({ faixa_id: "dungeon-ambience", tocando: true, posicao_ms: 0, repetir: true });
    await waitFor(() => expect(result.current.ambiente.faixaAtual?.id).toBe("dungeon-ambience"));
    expect(result.current.musica.estado?.tocando).toBe(true);
    act(() => result.current.musica.parar());
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(4));
    expect(PUT.mock.calls[3]![1].body).toEqual({ faixa_id: null, tocando: false, posicao_ms: 0, repetir: false });
  });

  it("volume de cada camada e silenciar ficam neste navegador e chegam ao tocador", async () => {
    window.localStorage.setItem(CHAVE_VOLUME.ambiente, "0.2");
    const { result } = montar({ ambiente: VAZIA, musica: VAZIA, agora: new Date().toISOString() });
    expect(result.current.ambiente.volume).toBe(0.2);
    expect(result.current.musica.volume).toBe(0.6);
    const [doAmbiente, daMusica] = tocadores;
    expect(doAmbiente!.definirVolume).toHaveBeenLastCalledWith(0.2);
    expect(daMusica!.definirVolume).toHaveBeenLastCalledWith(0.6);
    act(() => result.current.silenciar(true));
    expect(doAmbiente!.definirVolume).toHaveBeenLastCalledWith(0);
    expect(daMusica!.definirVolume).toHaveBeenLastCalledWith(0);
    act(() => result.current.musica.mudarVolume(0.8));
    expect(window.localStorage.getItem(CHAVE_VOLUME.musica)).toBe("0.8");
  });

  it("ao sair da Sala, os dois tocadores param", async () => {
    const { unmount } = montar({ ambiente: VAZIA, musica: VAZIA, agora: "" });
    unmount();
    expect(tocadores.every((t) => t.destruir.mock.calls.length > 0)).toBe(true);
  });
});
