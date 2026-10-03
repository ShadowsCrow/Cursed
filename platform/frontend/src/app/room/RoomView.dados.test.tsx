// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../characters/types";
import { CHAVE_ABA_DO_PAINEL } from "./abasDoPainel";
import { CHAVE_ANIMACAO_DOS_DADOS, CHAVE_MOSTRAR_ROLAGENS } from "./rolagensDaMesa";
import { RoomView } from "./RoomView";

/*
 * Item 3 de melhorias-da-sala na Sala: a rolagem é sorteada pelo servidor, as dos outros chegam pela
 * consulta periódica (sem tempo real), "Mostrar rolagens" filtra, e o total só aparece quando os dados param.
 */
const tabuleiro = vi.hoisted(() => ({ animar: vi.fn() }));
vi.mock("./useDadosNoTabuleiro", () => ({
  useDadosNoTabuleiro: () => ({ camada: <div data-testid="camada-dos-dados" aria-hidden="true" />, animar: tabuleiro.animar }),
}));
vi.mock("./RoomCanvas", () => ({ RoomCanvas: () => <div data-testid="grid" /> }));
vi.mock("./SceneStashes", () => ({ SceneStashes: () => null }));

const sala = {
  cenas: [{ id: "cena", nome: "Pátio", ativa: true }],
  cena: { id: "cena", nome: "Pátio", colunas: 8, linhas: 6, mapa_objeto: null, ativa: true, versao: 1, camadas: [], tokens: [
    { id: "t-lobo", camada_id: "c", personagem_id: "lobo", rotulo: "Lobo", x: 1, y: 1, tamanho: 1, versao: 0, controlavel: true },
  ] },
};
const personagem = (id: string, nome: string, dono: string | null, tipo = "personagem") => ({
  id, nome, mesa_id: "mesa", versao: 1, proprietario_id: dono, tipo, visibilidade: "mesa", retrato_objeto: null,
});
// Lion é da Ana (que joga como "ana" nos testes do jogador); o Lobo está na cena; o Corvo não.
const personagens = [personagem("lion", "Lion", "ana"), personagem("lobo", "Lobo", null, "monstro"), personagem("corvo", "Corvo", null, "npc")];
const derivados = [
  { chave: "atributo:destreza", rotulo: "Destreza", grupo: "atributo", total: 4, fontes: [], calculavel: true },
  { chave: "atributo:forca", rotulo: "Força", grupo: "atributo", total: null, fontes: [], calculavel: false },
  { chave: "pericia:furtividade", rotulo: "Furtividade", grupo: "pericia", total: 2, fontes: [], calculavel: true },
];
const participantes = [
  { usuario_id: "ana", nome: "Ana", papel: "narrador", tem_foto: false },
  { usuario_id: "bia", nome: "Lion", papel: "jogador", tem_foto: false },
];

interface RolagemNoServidor { id: number; autor_id: string; expressao: string; grupos: { faces: number; valores: number[] }[];
  modificador: number; total: number }

function servidor() {
  const rolagens: RolagemNoServidor[] = [];
  let falhar = false;
  const GET = vi.fn().mockImplementation(async (caminho: string, opcoes?: { params?: { query?: { depois?: number } } }) => {
    if (caminho === "/mesas/{mesa_id}/sala") return { data: sala };
    if (caminho === "/mesas/{mesa_id}/participantes") return { data: participantes };
    if (caminho === "/mesas/{mesa_id}/personagens") return { data: personagens };
    if (caminho === "/mesas/{mesa_id}/personagens/{personagem_id}/valores-derivados") return { data: derivados };
    if (caminho === "/mesas/{mesa_id}/sala/rolagens") {
      const depois = opcoes?.params?.query?.depois;
      return { data: rolagens.filter((r) => depois === undefined || r.id > depois) };
    }
    return { data: [] };
  });
  const POST = vi.fn().mockImplementation(async (caminho: string, opcoes: { body: { dados: { faces: number; quantidade: number }[];
    modificador: number; oculta?: boolean; personagem_id?: string; atributo?: string | null; pericia?: string | null } }) => {
    if (caminho !== "/mesas/{mesa_id}/sala/rolagens") return { data: undefined };
    if (falhar) return { data: undefined, error: { detail: "Servidor fora do ar." } };
    const grupos = opcoes.body.dados.map((d) => ({ faces: d.faces, valores: Array.from({ length: d.quantidade }, () => d.faces) }));
    const termos = [opcoes.body.atributo, opcoes.body.pericia].flatMap((chave) => {
      const valor = derivados.find((d) => d.chave === chave);
      return valor && valor.total !== null ? [{ chave: valor.chave, rotulo: valor.rotulo, valor: valor.total }] : [];
    });
    const total = grupos.reduce((t, g) => t + g.valores.reduce((a, b) => a + b, 0), 0) + opcoes.body.modificador
      + termos.reduce((t, termo) => t + termo.valor, 0);
    const rolagem = { id: rolagens.length + 1, autor_id: "ana", grupos, modificador: opcoes.body.modificador, total,
      expressao: [...opcoes.body.dados.map((d) => `${d.quantidade}d${d.faces}`), ...termos.map((t) => `${t.rotulo} (+${t.valor})`)].join(" + "),
      oculta: Boolean(opcoes.body.oculta), personagem_id: opcoes.body.personagem_id ?? null, termos };
    rolagens.push(rolagem);
    return { data: rolagem };
  });
  return {
    GET, POST, rolagens,
    falhar: () => { falhar = true; },
    deOutra: (rolagem: Omit<RolagemNoServidor, "id">) => { rolagens.push({ ...rolagem, id: rolagens.length + 1 }); },
  };
}

async function abrirDados(api = servidor(), narrator = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>
    <RoomView api={api as unknown as ApiClient} mesaId="mesa" userId="ana" narrator={narrator} realtime={undefined} />
  </QueryClientProvider>);
  await screen.findByTestId("grid");
  // O painel do jogador começa fechado.
  if (!narrator) fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
  await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/rolagens", expect.anything()));
  await waitFor(() => expect(api.GET).toHaveBeenCalledWith("/mesas/{mesa_id}/participantes", expect.anything()));
  return api;
}

const resultado = () => document.querySelector(".rolador__resultado")!.textContent;
const historico = () => Array.from(document.querySelectorAll(".rolador__item"), (item) => item.textContent);

describe("rolagens pelo servidor e animação na Sala", () => {
  beforeEach(() => {
    window.localStorage.setItem(CHAVE_ABA_DO_PAINEL, "dados");
    tabuleiro.animar.mockReset();
  });
  afterEach(() => { cleanup(); window.localStorage.clear(); });

  it("a camada dos dados fica no palco, escondida de leitores de tela", async () => {
    await abrirDados();
    expect(screen.getByTestId("camada-dos-dados").getAttribute("aria-hidden")).toBe("true");
  });

  it("pede o sorteio ao servidor e, com a animação ligada, só mostra o total quando os dados param", async () => {
    let terminar: () => void = () => undefined;
    tabuleiro.animar.mockImplementation(() => new Promise<void>((resolver) => { terminar = resolver; }));
    const api = await abrirDados();
    fireEvent.click(screen.getByRole("button", { name: "Acrescentar d20" }));
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    // O Narrador rola oculto dos jogadores por padrão.
    expect(api.POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/rolagens", {
      params: { path: { mesa_id: "mesa" } }, body: { dados: [{ faces: 20, quantidade: 1 }], modificador: 0, oculta: true },
    });
    await waitFor(() => expect(tabuleiro.animar).toHaveBeenCalledOnce());
    expect(resultado()).toContain("Rolando…");
    expect(historico()).toHaveLength(0);
    await act(async () => { terminar(); });
    expect(resultado()).toContain("Resultado de 1d20: 20");
    expect(historico()).toHaveLength(1);
  });

  it("o Narrador pode desligar 'Rolar oculto' e rolar para a mesa; o histórico marca as ocultas", async () => {
    tabuleiro.animar.mockResolvedValue(undefined);
    const api = await abrirDados();
    const chave = screen.getByRole("switch", { name: "Rolar oculto dos jogadores" });
    expect((chave as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Acrescentar d6" }));
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(historico()).toHaveLength(1));
    expect(historico()[0]).toContain("oculta");
    expect(resultado()).toContain("oculta dos jogadores");
    fireEvent.click(chave);
    expect(window.localStorage.getItem("cursed:mesa:rolar-oculto")).toBe("0");
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(historico()).toHaveLength(2));
    expect(api.POST).toHaveBeenLastCalledWith("/mesas/{mesa_id}/sala/rolagens", expect.objectContaining({
      body: expect.objectContaining({ oculta: false }),
    }));
    expect(historico()[0]).not.toContain("oculta");
  });

  it("o jogador não tem a chave de rolar oculto e rola para a mesa", async () => {
    const api = await abrirDados(servidor(), false);
    expect(screen.queryByRole("switch", { name: "Rolar oculto dos jogadores" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Acrescentar d20" }));
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/rolagens", expect.objectContaining({
      body: expect.objectContaining({ oculta: false }),
    })));
  });

  it("o jogador rola pela própria ficha: Atributo + Perícia, com 1d20 posto sozinho", async () => {
    tabuleiro.animar.mockResolvedValue(undefined);
    const api = await abrirDados(servidor(), false);
    const faixa = await screen.findByRole("group", { name: "Personagens" });
    // Só as fichas do jogador, mais "Sem ficha"; a dele já vem escolhida.
    expect(Array.from(faixa.querySelectorAll("button"), (b) => b.textContent)).toEqual(["Sem ficha", "Lion"]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Lion" }).getAttribute("aria-pressed")).toBe("true"));
    const atributo = await screen.findByRole("combobox", { name: "Atributo" });
    expect(Array.from((atributo as HTMLSelectElement).options, (o) => [o.textContent, o.disabled]))
      .toEqual([["Nenhum", false], ["Destreza (+4)", false], ["Força (sem valor)", true]]);
    fireEvent.change(atributo, { target: { value: "atributo:destreza" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Perícia" }), { target: { value: "pericia:furtividade" } });
    expect(document.querySelector(".rolador__expressao")!.textContent).toContain("1d20 + Destreza (+4) + Furtividade (+2)");
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/rolagens", expect.objectContaining({
      body: expect.objectContaining({ dados: [{ faces: 20, quantidade: 1 }], personagem_id: "lion",
        atributo: "atributo:destreza", pericia: "pericia:furtividade" }),
    })));
    await waitFor(() => expect(resultado()).toContain("26"));
    expect(historico()[0]).toContain("Lion");
    // "Sem ficha" volta a rolar só os dados.
    fireEvent.click(screen.getByRole("button", { name: "Sem ficha" }));
    expect(screen.queryByRole("combobox", { name: "Atributo" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(api.POST).toHaveBeenLastCalledWith("/mesas/{mesa_id}/sala/rolagens", expect.objectContaining({
      body: expect.not.objectContaining({ personagem_id: expect.anything() }),
    })));
  });

  it("o Narrador escolhe entre as fichas da cena, começando sem ficha", async () => {
    const api = await abrirDados();
    const faixa = await screen.findByRole("group", { name: "Personagens" });
    await waitFor(() => expect(Array.from(faixa.querySelectorAll("button"), (b) => b.textContent)).toEqual(["Sem ficha", "Lobo"]));
    expect(screen.getByRole("button", { name: "Sem ficha" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Lobo" }));
    fireEvent.change(await screen.findByRole("combobox", { name: "Perícia" }), { target: { value: "pericia:furtividade" } });
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/rolagens", expect.objectContaining({
      body: expect.objectContaining({ personagem_id: "lobo", atributo: null, pericia: "pericia:furtividade", oculta: true }),
    })));
  });

  it("com a animação desligada, o resultado do servidor aparece sem animar", async () => {
    await abrirDados();
    fireEvent.click(screen.getByRole("switch", { name: "Animação dos dados" }));
    expect(window.localStorage.getItem(CHAVE_ANIMACAO_DOS_DADOS)).toBe("0");
    fireEvent.click(screen.getByRole("button", { name: "Acrescentar d6" }));
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    await waitFor(() => expect(resultado()).toContain("Resultado de 1d6: 6"));
    expect(tabuleiro.animar).not.toHaveBeenCalled();
  });

  it("se o servidor falhar, avisa e não muda o histórico", async () => {
    const api = servidor();
    api.falhar();
    await abrirDados(api);
    fireEvent.click(screen.getByRole("button", { name: "Acrescentar d20" }));
    fireEvent.click(screen.getByRole("button", { name: "Rolar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Servidor fora do ar.");
    expect(historico()).toHaveLength(0);
    expect(resultado()).not.toContain("Rolando");
  });

  it("com De toda a mesa, a rolagem nova de outra pessoa chega pela consulta, com o nome, e rola no tabuleiro; as antigas não", async () => {
    tabuleiro.animar.mockResolvedValue(undefined);
    const api = servidor();
    api.deOutra({ autor_id: "bia", expressao: "1d4", grupos: [{ faces: 4, valores: [2] }], modificador: 0, total: 2 });
    await abrirDados(api);
    expect((screen.getByRole("radio", { name: "De toda a mesa" }) as HTMLInputElement).checked).toBe(true);
    act(() => { api.deOutra({ autor_id: "bia", expressao: "1d20 + 2", grupos: [{ faces: 20, valores: [17] }], modificador: 2, total: 19 }); });
    await waitFor(() => expect(historico()).toHaveLength(1), { timeout: 3000 });
    expect(historico()[0]).toContain("Lion");
    expect(historico()[0]).toContain("1d20 + 2");
    expect(historico()[0]).toContain("19");
    expect(tabuleiro.animar).toHaveBeenCalledOnce();
    // O visor continua com a rolagem própria (nenhuma ainda).
    expect(resultado()).not.toContain("19");
  });

  it("com Só as minhas, as rolagens dos outros são ignoradas", async () => {
    const api = await abrirDados();
    fireEvent.click(screen.getByRole("radio", { name: "Só as minhas" }));
    expect(window.localStorage.getItem(CHAVE_MOSTRAR_ROLAGENS)).toBe("minhas");
    act(() => { api.deOutra({ autor_id: "bia", expressao: "1d20", grupos: [{ faces: 20, valores: [17] }], modificador: 0, total: 17 }); });
    const chamadas = api.GET.mock.calls.length;
    await waitFor(() => expect(api.GET.mock.calls.length).toBeGreaterThan(chamadas + 1), { timeout: 3000 });
    expect(historico()).toHaveLength(0);
    expect(tabuleiro.animar).not.toHaveBeenCalled();
  });

  it("com o sistema pedindo menos movimento, a animação começa desligada", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((consulta: string) => ({ matches: consulta.includes("reduced-motion"), addEventListener: () => undefined,
      removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    try {
      await abrirDados();
      expect((screen.getByRole("switch", { name: "Animação dos dados" }) as HTMLInputElement).checked).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});
