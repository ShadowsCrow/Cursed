// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../characters/types";
import { CHAVE_ABA_DO_PAINEL } from "./abasDoPainel";
import { CHAVE_MOSTRAR_ROLAGENS } from "./rolagensDaMesa";
import { RoomView } from "./RoomView";

/*
 * Gamificação da Sala no RoomView (gamificacao-da-sala): destaque de críticos nas rolagens recebidas, marcas
 * renovadas ao ligar o destaque, anúncio do MVP e o botão de reação.
 */
const tabuleiro = vi.hoisted(() => ({ animar: vi.fn() }));
vi.mock("./useDadosNoTabuleiro", () => ({
  useDadosNoTabuleiro: () => ({ camada: <div data-testid="camada-dos-dados" aria-hidden="true" />, animar: tabuleiro.animar }),
}));
vi.mock("./RoomCanvas", () => ({ RoomCanvas: () => <div data-testid="grid" /> }));
vi.mock("./SceneStashes", () => ({ SceneStashes: () => null }));

const sala = {
  cenas: [{ id: "cena", nome: "Pátio", ativa: true }],
  cena: { id: "cena", nome: "Pátio", colunas: 8, linhas: 6, mapa_objeto: null, ativa: true, versao: 1, camadas: [], tokens: [] },
};
const participantes = [
  { usuario_id: "mestre", nome: "Mestre", papel: "narrador", tem_foto: false },
  { usuario_id: "ana", nome: "Ana", papel: "jogador", tem_foto: false },
  { usuario_id: "kira", nome: "Kira", papel: "jogador", tem_foto: false },
];
const CRITICO = [{ faces: 20, indice: 0, tipo: "critico" }];

interface Estado {
  destaque: boolean;
  rolagens: { id: number; autor_id: string; expressao: string; grupos: { faces: number; valores: number[] }[];
    modificador: number; total: number; marcas: typeof CRITICO }[];
  mvp: unknown;
}

function servidor(estado: Estado) {
  const GET = vi.fn().mockImplementation(async (caminho: string, opcoes?: { params?: { query?: { depois?: number } } }) => {
    if (caminho === "/mesas/{mesa_id}/sala") return { data: sala };
    if (caminho === "/mesas/{mesa_id}/participantes") return { data: participantes };
    if (caminho === "/mesas/{mesa_id}/sala/preferencias") return { data: { destaque_criticos: estado.destaque, estatisticas_visiveis: false } };
    if (caminho === "/mesas/{mesa_id}/sala/mvp") return { data: estado.mvp };
    if (caminho === "/mesas/{mesa_id}/sala/rolagens") {
      const depois = opcoes?.params?.query?.depois;
      // Sem o destaque, o servidor não manda as marcas.
      return { data: estado.rolagens.filter((r) => depois === undefined || r.id > depois)
        .map((r) => ({ ...r, marcas: estado.destaque ? r.marcas : [] })) };
    }
    return { data: [] };
  });
  return { GET, POST: vi.fn(), PUT: vi.fn() };
}

async function abrir(estado: Estado, { narrator = false, userId = "ana" } = {}) {
  const api = servidor(estado);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>
    <RoomView api={api as unknown as ApiClient} mesaId="mesa" userId={userId} narrator={narrator} realtime={undefined} />
  </QueryClientProvider>);
  await screen.findByTestId("grid");
  if (!narrator) fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
  await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/rolagens", expect.anything()));
  await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/mesas/{mesa_id}/participantes", expect.anything()));
  return api;
}

const historico = () => Array.from(document.querySelectorAll(".rolador__item"), (item) => item.textContent ?? "");
const deKira = (id: number) => ({ id, autor_id: "kira", expressao: "1d20", grupos: [{ faces: 20, valores: [20] }],
  modificador: 0, total: 20, marcas: CRITICO });

describe("destaque de críticos na Sala", () => {
  beforeEach(() => {
    window.localStorage.setItem(CHAVE_ABA_DO_PAINEL, "dados");
    tabuleiro.animar.mockReset();
    tabuleiro.animar.mockResolvedValue(undefined);
  });
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  it("com o destaque ligado, o 20 de outra pessoa chega marcado ao histórico e ao tabuleiro", async () => {
    const estado: Estado = { destaque: true, rolagens: [], mvp: null };
    await abrir(estado);
    estado.rolagens.push(deKira(1));
    await waitFor(() => expect(historico()).toHaveLength(1), { timeout: 4000 });
    expect(historico()[0]).toContain("Crítico");
    expect(tabuleiro.animar).toHaveBeenCalledWith(expect.objectContaining({ marcas: [{ faces: 20, indice: 0, tipo: "critico" }] }));
  });

  it("com 'Só as minhas', o crítico dos outros não aparece nem rola", async () => {
    window.localStorage.setItem(CHAVE_MOSTRAR_ROLAGENS, "minhas");
    const estado: Estado = { destaque: true, rolagens: [], mvp: null };
    await abrir(estado);
    estado.rolagens.push(deKira(1));
    await new Promise((r) => setTimeout(r, 1600));
    expect(historico()).toHaveLength(0);
    expect(tabuleiro.animar).not.toHaveBeenCalled();
  });

  it("ao ligar o destaque depois, o histórico ganha a marca guardada no sorteio", async () => {
    const estado: Estado = { destaque: false, rolagens: [], mvp: null };
    await abrir(estado);
    estado.rolagens.push(deKira(1));
    await waitFor(() => expect(historico()).toHaveLength(1), { timeout: 4000 });
    expect(historico()[0]).not.toContain("Crítico");
    estado.destaque = true;
    await waitFor(() => expect(historico()[0]).toContain("Crítico"), { timeout: 4000 });
  });
}, 20000);

describe("anúncio do MVP e reações", () => {
  beforeEach(() => { tabuleiro.animar.mockReset(); });
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  const votacao = (estado: string, vencedor: string | null = null) => ({ votacao: { id: "v1", estado, aberta_em: "2026-10-04T22:00:00Z",
    encerrada_em: null, votaram: 2, total: 2, candidatos: ["kira"], meu_voto: null, empatados: [], vencedor_id: vencedor,
    votos_do_vencedor: vencedor ? 2 : null, sessao_numero: null }, historico: [], apelidos: { kira: "Kira", ana: "Ana" } });

  it("anuncia o MVP quando a votação termina com a Sala aberta", async () => {
    const estado: Estado = { destaque: false, rolagens: [], mvp: votacao("aberta") };
    await abrir(estado);
    await waitFor(() => expect(screen.queryByText("MVP")).toBeNull());
    estado.mvp = votacao("encerrada", "kira");
    await waitFor(() => expect(document.querySelector(".anuncio-do-mvp")?.textContent).toContain("Kira"), { timeout: 4000 });
    // Anunciado a leitores de tela.
    expect(document.querySelector(".anuncio-do-mvp")?.getAttribute("role")).toBe("status");
  });

  it("não anuncia o MVP anterior ao abrir a Sala", async () => {
    const estado: Estado = { destaque: false, rolagens: [], mvp: votacao("encerrada", "kira") };
    const api = await abrir(estado);
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/mvp", expect.anything()));
    await new Promise((r) => setTimeout(r, 1300));
    expect(document.querySelector(".anuncio-do-mvp")).toBeNull();
  });

  it("o botão Reagir abre as reações e quem reage vê o próprio balão", async () => {
    await abrir({ destaque: false, rolagens: [], mvp: null });
    const botao = screen.getByRole("button", { name: "Reagir" });
    expect(botao.getAttribute("aria-haspopup")).toBe("menu");
    fireEvent.click(botao);
    const menu = screen.getByRole("menu", { name: "Reações" });
    expect(within(menu).getAllByRole("menuitem").map((item) => item.getAttribute("aria-label")))
      .toEqual(["Aplausos", "Risada", "Susto", "Caveira", "Chama", "Coração"]);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Chama" }));
    expect(screen.queryByRole("menu")).toBeNull();
    const baloes = document.querySelector(".baloes-de-reacao")!;
    expect(baloes.getAttribute("aria-hidden")).toBe("true");
    expect(baloes.textContent).toContain("Você");
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
  });
}, 20000);
