// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { destaqueDaRolagem, type Rolagem } from "./dados";
import { RoladorDeDados } from "./RoladorDeDados";
import { useRolador } from "./useRolador";
import { dadosDaRolagem, TEMPO_DA_FAIXA_MS, useDadosNoTabuleiro } from "./useDadosNoTabuleiro";
import { useRoomEphemera } from "./useRoomEphemera";
import { comBalao, DURACAO_DO_BALAO_MS, LimiteDeReacoes, MAXIMO_DE_BALOES, reacaoValida, type Balao } from "./reacoes";
import { BaloesDeReacao, BotaoDeReacao } from "./ReacoesDaSala";
import { marcasDoServidor } from "./rolagensDaMesa";

const criar = vi.hoisted(() => vi.fn());
vi.mock("./dados3d/cena", () => ({ criarMesaDeDados: criar }));

const VINTE: Rolagem = {
  id: 7, expressao: "2d20", grupos: [{ faces: 20, valores: [20, 7] }], modificador: 0, total: 27,
  montagem: { dados: { 20: 2 }, modificador: 0 }, marcas: [{ faces: 20, indice: 0, tipo: "critico" }],
};

/** Rolador com o sorteio "do servidor" devolvendo a rolagem dada. */
function Rolador({ rolagem, destaque }: { rolagem: Rolagem; destaque?: boolean }) {
  const rolador = useRolador({ sortear: async () => rolagem });
  useEffect(() => { rolador.acrescentar(20); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <RoladorDeDados rolador={rolador} destaque={destaque} />;
}

describe("destaque de críticos na aba Dados", () => {
  afterEach(cleanup);

  it("marca o d20 crítico no visor, no anúncio e no histórico", async () => {
    render(<Rolador rolagem={VINTE} />);
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("27"));
    expect(screen.getByRole("status").textContent).toContain(", Crítico");
    const valores = document.querySelectorAll(".rolador__visor .rolador__valor");
    expect(valores[0]!.className).toContain("rolador__valor--critico");
    expect(valores[0]!.textContent).toContain("(crítico)");
    expect(valores[1]!.className).not.toContain("--critico");
    expect(within(screen.getByRole("region", { name: "Histórico" })).getAllByText("Crítico").length).toBeGreaterThan(0);
  });

  it("falha crítica tem selo próprio", async () => {
    render(<Rolador rolagem={{ ...VINTE, grupos: [{ faces: 20, valores: [1] }], total: 1,
      marcas: [{ faces: 20, indice: 0, tipo: "falha_critica" }] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Falha crítica"));
  });

  it("com o destaque desligado, nada é marcado", async () => {
    render(<Rolador rolagem={VINTE} destaque={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("27"));
    expect(screen.getByRole("status").textContent).not.toContain("Crítico");
    expect(document.querySelector(".rolador__valor--critico")).toBeNull();
  });

  it("atualizarMarcas dá as marcas às rolagens do histórico e do visor", async () => {
    const { result } = renderHook(() => useRolador({ sortear: async () => ({ ...VINTE, marcas: undefined }) }));
    act(() => { result.current.acrescentar(20); });
    act(() => { result.current.rolarMontagem(); });
    await waitFor(() => expect(result.current.historico).toHaveLength(1));
    expect(result.current.ultima?.marcas).toBeUndefined();
    act(() => { result.current.atualizarMarcas(new Map([[7, VINTE.marcas!]])); });
    expect(result.current.historico[0]!.marcas).toEqual(VINTE.marcas);
    expect(result.current.ultima?.marcas).toEqual(VINTE.marcas);
  });

  it("crítico vence falha na mesma rolagem, e só d20 conhecidos vêm do servidor", () => {
    expect(destaqueDaRolagem({ marcas: [{ faces: 20, indice: 1, tipo: "falha_critica" }, { faces: 20, indice: 0, tipo: "critico" }] }))
      .toBe("critico");
    expect(destaqueDaRolagem({})).toBeNull();
    expect(marcasDoServidor({ marcas: [{ faces: 20, indice: 0, tipo: "critico" }, { faces: 7, indice: 0, tipo: "critico" }] }))
      .toEqual([{ faces: 20, indice: 0, tipo: "critico" }]);
  });
});

type Animar = ReturnType<typeof useDadosNoTabuleiro>["animar"];

/** Monta a camada e entrega o `animar` ao teste. */
function Palco({ aoPronto }: { aoPronto: (animar: Animar) => void }) {
  const dados = useDadosNoTabuleiro();
  useEffect(() => { aoPronto(dados.animar); }, [dados.animar, aoPronto]);
  return dados.camada;
}

describe("destaque de críticos no tabuleiro", () => {
  afterEach(() => { cleanup(); criar.mockReset(); vi.useRealTimers(); });

  it("o d20 marcado brilha e os outros não", () => {
    expect(dadosDaRolagem(VINTE)).toEqual([
      { forma: "d20", conjunto: "comum", rotulo: "20", destaque: "critico" },
      { forma: "d20", conjunto: "comum", rotulo: "7" },
    ]);
  });

  it("a faixa 'Crítico!' aparece quando os dados param e some sozinha", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const rolar = vi.fn().mockResolvedValue(undefined);
    criar.mockResolvedValue({ rolar, destruir: vi.fn() });
    let animar: Animar = async () => undefined;
    render(<Palco aoPronto={(a) => { animar = a; }} />);
    await act(async () => { await animar(VINTE); });
    expect(rolar).toHaveBeenCalledWith(dadosDaRolagem(VINTE));
    const faixa = document.querySelector(".faixa-de-critico");
    expect(faixa?.textContent).toBe("Crítico!");
    expect(faixa?.getAttribute("aria-hidden")).toBe("true");
    await act(async () => { vi.advanceTimersByTime(TEMPO_DA_FAIXA_MS + 10); });
    expect(document.querySelector(".faixa-de-critico")).toBeNull();
  });

  it("sem marca, não há faixa", async () => {
    criar.mockResolvedValue({ rolar: vi.fn().mockResolvedValue(undefined), destruir: vi.fn() });
    let animar: Animar = async () => undefined;
    render(<Palco aoPronto={(a) => { animar = a; }} />);
    await act(async () => { await animar({ grupos: [{ faces: 20, valores: [20] }] }); });
    expect(document.querySelector(".faixa-de-critico")).toBeNull();
  });
});

describe("reações", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it("uma por segundo por pessoa, só da lista, no máximo 8 balões", () => {
    const limite = new LimiteDeReacoes();
    expect(limite.permitir("ana", 1000)).toBe(true);
    expect(limite.permitir("ana", 1500)).toBe(false);
    expect(limite.permitir("kira", 1500)).toBe(true);
    expect(limite.permitir("ana", 2000)).toBe(true);
    expect(reacaoValida("chama")).toBe(true);
    expect(reacaoValida("<script>")).toBe(false);
    let baloes: Balao[] = [];
    for (let i = 0; i < 10; i += 1) baloes = comBalao(baloes, { id: String(i), usuarioId: "ana", reacao: "chama", criadoEm: i });
    expect(baloes).toHaveLength(MAXIMO_DE_BALOES);
    expect(baloes[0]!.id).toBe("2");
  });

  it("envia a reação, mostra o próprio balão na hora e recebe a dos outros, com limite e expiração", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const handlers = new Map<string, (mensagem: { payload: Record<string, unknown> }) => void>();
    let status: (valor: "SUBSCRIBED") => void = () => {};
    const send = vi.fn().mockResolvedValue({});
    const canal = {
      on: vi.fn((_tipo: string, filtro: { event: string }, handler: (mensagem: { payload: Record<string, unknown> }) => void) => {
        handlers.set(filtro.event, handler); return canal;
      }),
      subscribe: vi.fn((callback: typeof status) => { status = callback; return canal; }),
      send,
    };
    const client = { channel: vi.fn(() => canal), removeChannel: vi.fn().mockResolvedValue({}),
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) } } as unknown as SupabaseClient;
    const { result } = renderHook(() => useRoomEphemera("mesa", "ana", { client, accessToken: "token" }));
    await waitFor(() => expect(handlers.has("sala.reacao")).toBe(true));
    act(() => { status("SUBSCRIBED"); });
    act(() => { result.current.reagir("chama"); });
    expect(send).toHaveBeenCalledWith({ type: "broadcast", event: "sala.reacao", payload: { reacao: "chama", usuario_id: "ana" } });
    expect(result.current.baloes.map((b) => [b.usuarioId, b.reacao])).toEqual([["ana", "chama"]]);
    // Rajada: a segunda reação no mesmo segundo é ignorada e nem é enviada.
    act(() => { result.current.reagir("risada"); });
    expect(send).toHaveBeenCalledOnce();
    act(() => {
      handlers.get("sala.reacao")?.({ payload: { usuario_id: "kira", reacao: "susto" } });
      handlers.get("sala.reacao")?.({ payload: { usuario_id: "kira", reacao: "caveira" } });
      handlers.get("sala.reacao")?.({ payload: { usuario_id: "rui", reacao: "invalida" } });
    });
    expect(result.current.baloes.map((b) => b.reacao)).toEqual(["chama", "susto"]);
    await act(async () => { vi.advanceTimersByTime(DURACAO_DO_BALAO_MS + 10); });
    expect(result.current.baloes).toEqual([]);
  });

  it("sem tempo real, quem reage ainda vê o próprio balão", () => {
    const { result } = renderHook(() => useRoomEphemera("mesa", "ana", undefined));
    act(() => { result.current.reagir("aplausos"); });
    expect(result.current.baloes).toHaveLength(1);
  });

  it("a bandeja abre, anda pelas setas, fecha com Esc e devolve o foco ao botão", () => {
    const reagir = vi.fn();
    render(<BotaoDeReacao onReagir={reagir} />);
    const botao = screen.getByRole("button", { name: "Reagir" });
    fireEvent.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    const menu = screen.getByRole("menu", { name: "Reações" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Aplausos");
    fireEvent.keyDown(menu, { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Risada");
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Coração");
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(botao);
    fireEvent.click(botao);
    fireEvent.click(screen.getByRole("menuitem", { name: "Aplausos" }));
    expect(reagir).toHaveBeenCalledWith("aplausos");
    expect(document.activeElement).toBe(botao);
    fireEvent.click(botao);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("os balões mostram o nome de quem reagiu e ficam fora dos leitores de tela", () => {
    const { container } = render(<BaloesDeReacao baloes={[{ id: "1", usuarioId: "kira", reacao: "risada", criadoEm: 0 }]}
      nomeDe={(id) => (id === "kira" ? "Kira" : "?")} />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).toContain("Kira");
  });
});
