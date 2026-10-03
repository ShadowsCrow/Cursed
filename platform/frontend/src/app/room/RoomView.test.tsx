// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../characters/types";
import { CHAVE_ABA_DO_PAINEL } from "./abasDoPainel";
import { intervaloDaSala } from "./atualizacao";
import {
  CHAVE_CHAO_ABERTO, CHAVE_LARGURA_PAINEL, CHAVE_PAINEL_DA_CENA, LARGURA_PAINEL_MAXIMA, LARGURA_PAINEL_MINIMA, LARGURA_PAINEL_PADRAO, RoomView,
} from "./RoomView";

vi.mock("./SceneStashes", () => ({ SceneStashes: () => <p>Conteúdo do chão</p> }));
vi.mock("./FichasDoPainel", () => ({ FichasDoPainel: () => <p>Conteúdo das fichas</p> }));
vi.mock("./BolsaDoPainel", () => ({ BolsaDoPainel: ({ narrator }: { narrator: boolean }) => <p>Bolsa do {narrator ? "Narrador" : "jogador"}</p> }));
vi.mock("./CartasDoPainel", () => ({ CartasDoPainel: ({ narrator }: { narrator: boolean }) => <p>Cartas do {narrator ? "Narrador" : "jogador"}</p> }));

vi.mock("./RoomCanvas", () => ({
  RoomCanvas: ({ cena, reservaDireita, retratos, onDragEnd, onSoltarPersonagem }: {
    cena: { tokens: { id: string; x: number; y: number }[] }; reservaDireita?: number; retratos?: Record<string, string>;
    onDragEnd?: (id: string, x: number, y: number) => void; onSoltarPersonagem?: (id: string, x: number, y: number) => void;
  }) => <>
    <div data-testid="grid" data-reserva={reservaDireita ?? 0} data-retratos={JSON.stringify(retratos ?? {})}>
      {cena.tokens.map((token) => `${token.id}:${token.x},${token.y}`).join(";")}</div>
    <button type="button" onClick={() => onDragEnd?.(cena.tokens[0]?.id ?? "", 4, 3)}>soltar o primeiro token em 4,3</button>
    {onSoltarPersonagem && <button type="button" onClick={() => onSoltarPersonagem("lion", 4, 2)}>soltar Lion em 4,2</button>}
    {onSoltarPersonagem && <button type="button" onClick={() => onSoltarPersonagem("lion", -10, 40)}>soltar Lion em -10,40</button>}
  </>,
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

/** GET por rota: a sala devolve o snapshot; as demais consultas (personagens, ativos…) vêm de `extras` ou vazias. */
function rotas(sala: unknown, extras: Record<string, unknown> = {}) {
  return vi.fn().mockImplementation(async (caminho: string) => ({
    data: caminho === "/mesas/{mesa_id}/sala" ? sala : (extras[caminho] ?? []), error: undefined,
  }));
}

function renderSala(api: ApiClient, narrator: boolean, onAbrirFicha?: () => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>
    <RoomView api={api} mesaId="mesa" userId="ana" narrator={narrator} onAbrirFicha={onAbrirFicha} />
  </QueryClientProvider>);
}

const comCenas = { ...snapshot, cenas: [
  { id: "cena", nome: "Pátio", ativa: true },
  { id: "brejo", nome: "Brejo", ativa: false },
] };

describe("movimento da sala", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  it("mostra a prévia e restaura a posição confirmada quando a rede falha", async () => {
    const GET = rotas(snapshot);
    let rejeitar!: (erro: Error) => void;
    const POST = vi.fn().mockImplementation(() => new Promise((_resolve, reject) => { rejeitar = reject; }));
    const api = { GET, POST } as unknown as ApiClient;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><RoomView api={api} mesaId="mesa" userId="ana" narrator={false} /></QueryClientProvider>);
    expect((await screen.findByTestId("grid")).textContent).toContain("heroi:1,1");
    fireEvent.click(screen.getByRole("button", { name: "soltar o primeiro token em 4,3" }));
    await waitFor(() => expect(screen.getByTestId("grid").textContent).toContain("heroi:4,3"));
    expect(screen.getByText("Movendo token…")).toBeTruthy();
    rejeitar(new Error("Conexão perdida"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Conexão perdida"));
    expect(screen.getByTestId("grid").textContent).toContain("heroi:1,1");
    expect(screen.getByRole("alert").textContent).toContain("última posição confirmada foi restaurada");
    expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento", {
      params: { path: { mesa_id: "mesa", token_id: "heroi" } },
      body: { x: 4, y: 3, versao_esperada: 0 },
    });
    expect(GET.mock.calls.filter(([caminho]) => caminho === "/mesas/{mesa_id}/sala")).toHaveLength(1);
  });
});

describe("sala de página única", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  it("o jogador vê o grid com o painel fechado, sem faixa de cenas nem 'Colocar token'", async () => {
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, false);
    await screen.findByTestId("grid");
    expect(screen.getByRole("heading", { level: 1, name: "Sala — Pátio" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Cenas" })).toBeNull();
    const alternar = screen.getByRole("button", { name: "Abrir painel" });
    expect(alternar.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("complementary", { name: "Painel da Sala" })).toBeNull();
    fireEvent.click(alternar);
    const painel = screen.getByRole("complementary", { name: "Painel da Sala" });
    expect(within(painel).getByRole("heading", { name: "Tokens da cena" })).toBeTruthy();
    expect(within(painel).queryByRole("region", { name: "Personagens dos jogadores" })).toBeNull();
    expect(within(painel).queryByRole("button", { name: /^Retirar/ })).toBeNull();
    // Aberto, o botão do grid some e o painel traz as abas e o "Recolher painel".
    expect(screen.queryByRole("button", { name: "Abrir painel" })).toBeNull();
    expect(within(painel).getByRole("button", { name: "Recolher painel" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("o Narrador abre com o painel e a faixa de cenas; pode ocultar o painel e a escolha fica guardada", async () => {
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    const faixa = screen.getByRole("group", { name: "Cenas" });
    expect(within(faixa).getByRole("button", { name: "Pátio" }).getAttribute("aria-current")).toBe("true");
    // A ativa é uma chave ligada e travada; a outra cena tem a chave desligada, que a ativa.
    const ativa = within(faixa).getByRole("switch", { name: "Cena ativa: Pátio" }) as HTMLInputElement;
    expect(ativa.checked && ativa.disabled).toBe(true);
    const brejo = within(faixa).getByRole("switch", { name: "Cena ativa: Brejo" }) as HTMLInputElement;
    expect(brejo.checked || brejo.disabled).toBe(false);
    const painel = screen.getByRole("complementary", { name: "Painel da Sala" });
    expect(within(painel).getByRole("region", { name: "Personagens dos jogadores" })).toBeTruthy();
    // A gestão de cenas fica no topo da aba Cena, não sobre o grid (item 5); sobre o grid fica só o nome.
    expect(painel.contains(faixa)).toBe(true);
    expect(document.querySelector(".room-view__topo .room-view__cena")?.textContent).toBe("Pátio");
    // Aberto, o painel fica por cima do grid à direita, e o enquadramento desconta a largura dele.
    expect(Number(screen.getByTestId("grid").getAttribute("data-reserva"))).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Recolher painel" }));
    expect(screen.queryByRole("complementary", { name: "Painel da Sala" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir painel" })).toBeTruthy();
    expect(window.localStorage.getItem(CHAVE_PAINEL_DA_CENA)).toBe("0");
    // Fechado, o painel não cobre o grid: o enquadramento usa a área toda.
    expect(screen.getByTestId("grid").getAttribute("data-reserva")).toBe("0");
  });

  it("o Narrador cria uma cena pela aba Cena e ela abre no grid", async () => {
    const GET = rotas(comCenas);
    const POST = vi.fn().mockResolvedValue({ data: { cena: { id: "pantano" } }, error: undefined });
    renderSala({ GET, POST } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    const faixa = screen.getByRole("group", { name: "Cenas" });
    fireEvent.change(within(faixa).getByRole("textbox", { name: "Nova cena" }), { target: { value: "Pântano" } });
    fireEvent.click(within(faixa).getByRole("button", { name: "Criar cena" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas", {
      params: { path: { mesa_id: "mesa" } }, body: { nome: "Pântano", colunas: 20, linhas: 15 },
    }));
    await waitFor(() => expect(GET).toHaveBeenCalledWith("/mesas/{mesa_id}/sala", {
      params: { path: { mesa_id: "mesa" }, query: { cena_id: "pantano" } },
    }));
  });

  it("com o armazenamento bloqueado, o painel segue o padrão do papel e ainda alterna", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("bloqueado"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("bloqueado"); });
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    expect(screen.getByRole("complementary", { name: "Painel da Sala" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recolher painel" }));
    expect(screen.queryByRole("complementary", { name: "Painel da Sala" })).toBeNull();
  });

  it("os sinais temporários ficam numa região anunciada a leitores de tela", async () => {
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, false);
    await screen.findByTestId("grid");
    const sinais = screen.getByLabelText("Sinais temporários da mesa");
    expect(sinais.getAttribute("aria-live")).toBe("polite");
  });

  it("Sala desativada: o jogador tem o atalho para a ficha e o Narrador ativa o módulo", async () => {
    const desligada = { modulo_ativo: false, cenas: [], cena: null };
    const abrirFicha = vi.fn();
    renderSala({ GET: rotas(desligada) } as unknown as ApiClient, false, abrirFicha);
    expect(await screen.findByRole("heading", { name: "Sala desativada" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ativar sala" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir minha ficha" }));
    expect(abrirFicha).toHaveBeenCalledTimes(1);
    cleanup();
    const PUT = vi.fn().mockResolvedValue({ error: undefined });
    renderSala({ GET: rotas(desligada), PUT } as unknown as ApiClient, true);
    fireEvent.click(await screen.findByRole("button", { name: "Ativar sala" }));
    await waitFor(() => expect(PUT).toHaveBeenCalledWith("/mesas/{mesa_id}/modulos", {
      params: { path: { mesa_id: "mesa" } }, body: { sala: true },
    }));
    expect(screen.queryByRole("button", { name: "Abrir minha ficha" })).toBeNull();
  });

  it("a alça ajusta a largura do painel pelo teclado, nos limites, e a largura fica guardada", async () => {
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    const alca = screen.getByRole("separator", { name: "Largura do painel da Sala" });
    expect(alca.getAttribute("aria-valuenow")).toBe(String(LARGURA_PAINEL_PADRAO));
    expect(alca.getAttribute("aria-controls")).toBe("painel-da-cena");
    expect(screen.getByTestId("grid").getAttribute("data-reserva")).toBe(String(LARGURA_PAINEL_PADRAO));
    fireEvent.keyDown(alca, { key: "ArrowLeft" });
    expect(alca.getAttribute("aria-valuenow")).toBe(String(LARGURA_PAINEL_PADRAO + 16));
    expect(window.localStorage.getItem(CHAVE_LARGURA_PAINEL)).toBe(String(LARGURA_PAINEL_PADRAO + 16));
    // O enquadramento acompanha a largura confirmada.
    expect(screen.getByTestId("grid").getAttribute("data-reserva")).toBe(String(LARGURA_PAINEL_PADRAO + 16));
    fireEvent.keyDown(alca, { key: "ArrowRight", shiftKey: true });
    expect(alca.getAttribute("aria-valuenow")).toBe(String(LARGURA_PAINEL_PADRAO + 16 - 64));
    fireEvent.keyDown(alca, { key: "Home" });
    expect(alca.getAttribute("aria-valuenow")).toBe(String(LARGURA_PAINEL_MINIMA));
    fireEvent.keyDown(alca, { key: "ArrowRight" });
    expect(alca.getAttribute("aria-valuenow")).toBe(String(LARGURA_PAINEL_MINIMA));
    fireEvent.keyDown(alca, { key: "End" });
    expect(alca.getAttribute("aria-valuenow")).toBe(String(LARGURA_PAINEL_MAXIMA));
    fireEvent.doubleClick(alca);
    expect(alca.getAttribute("aria-valuenow")).toBe(String(LARGURA_PAINEL_PADRAO));
    // Clicar na alça dá o foco a ela, para seguir pelo teclado.
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.pointerDown(alca, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(alca, { pointerId: 1 });
    expect(document.activeElement).toBe(alca);
  });

  it("a largura guardada volta na próxima abertura, e a alça some com o painel fechado", async () => {
    window.localStorage.setItem(CHAVE_LARGURA_PAINEL, "420");
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    expect(screen.getByRole("separator", { name: "Largura do painel da Sala" }).getAttribute("aria-valuenow")).toBe("420");
    fireEvent.click(screen.getByRole("button", { name: "Recolher painel" }));
    expect(screen.queryByRole("separator", { name: "Largura do painel da Sala" })).toBeNull();
  });
});

describe("painel da Sala com abas e chão embaixo", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });
  const api = () => ({ GET: rotas(comCenas) } as unknown as ApiClient);

  it("tem as abas Cena, Chat, Fichas, Bolsa, Cartas e Música, com Cena selecionada e troca pelo clique e pelas setas", async () => {
    renderSala(api(), true);
    await screen.findByTestId("grid");
    const abas = within(screen.getByRole("tablist", { name: "Painel da Sala" })).getAllByRole("tab");
    expect(abas.map((aba) => aba.textContent)).toEqual(["Cena", "Chat", "Fichas", "Bolsa", "Cartas", "Música"]);
    // Com o painel estreito só o ícone aparece; o nome continua acessível e como dica.
    expect(abas.every((aba) => aba.querySelector("svg") && aba.getAttribute("title") === aba.textContent)).toBe(true);
    expect(screen.getByRole("tab", { name: "Cena" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toContain("Tokens da cena");
    // A aba Cena não traz mais o chão: ele foi para baixo do grid.
    expect(within(screen.getByRole("tabpanel")).queryByText("Conteúdo do chão")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
    expect(screen.getByRole("tab", { name: "Chat" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Chat" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Fichas" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Fichas" }));
    expect(screen.getByRole("tabpanel").textContent).toContain("Conteúdo das fichas");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Fichas" }), { key: "ArrowRight" });
    expect(screen.getByRole("tabpanel").textContent).toContain("Bolsa do Narrador");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Bolsa" }), { key: "ArrowRight" });
    expect(screen.getByRole("tabpanel").textContent).toContain("Cartas do Narrador");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Cartas" }), { key: "End" });
    expect(screen.getByRole("tab", { name: "Música" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toContain("A música da mesa ainda vai chegar");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Música" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "Cena" }).getAttribute("aria-selected")).toBe("true");
  });

  it("o Chat é só um espaço reservado, com o campo e o envio desativados", async () => {
    renderSala(api(), false);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
    const painel = screen.getByRole("tabpanel");
    expect(painel.textContent).toContain("O chat da mesa ainda vai chegar");
    expect(painel.textContent).toContain("registro da mesa");
    expect((within(painel).getByRole("textbox", { name: "Mensagem" }) as HTMLTextAreaElement).disabled).toBe(true);
    expect((within(painel).getByRole("button", { name: "Enviar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("a aba fica lembrada, e recolher e reabrir volta na mesma aba", async () => {
    renderSala(api(), true);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("tab", { name: "Cartas" }));
    expect(window.localStorage.getItem(CHAVE_ABA_DO_PAINEL)).toBe("cartas");
    fireEvent.click(screen.getByRole("button", { name: "Recolher painel" }));
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    expect(screen.getByRole("tab", { name: "Cartas" }).getAttribute("aria-selected")).toBe("true");
    cleanup();
    renderSala(api(), true);
    await screen.findByTestId("grid");
    expect(screen.getByRole("tab", { name: "Cartas" }).getAttribute("aria-selected")).toBe("true");
  });

  it("uma aba guardada inválida cai em Cena", async () => {
    window.localStorage.setItem(CHAVE_ABA_DO_PAINEL, "inexistente");
    renderSala(api(), true);
    await screen.findByTestId("grid");
    expect(screen.getByRole("tab", { name: "Cena" }).getAttribute("aria-selected")).toBe("true");
  });

  it("o chão e os baús ficam num menu retrátil embaixo do grid, lembrado neste navegador", async () => {
    renderSala(api(), false);
    await screen.findByTestId("grid");
    const botao = screen.getByRole("button", { name: "Chão e baús" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Conteúdo do chão")).toBeNull();
    fireEvent.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Conteúdo do chão")).toBeTruthy();
    expect(window.localStorage.getItem(CHAVE_CHAO_ABERTO)).toBe("1");
    expect(document.querySelector(".room-view--chao-aberto")).toBeTruthy();
    cleanup();
    renderSala(api(), false);
    await screen.findByTestId("grid");
    expect(screen.getByRole("button", { name: "Chão e baús" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("cena sem bordas: o Narrador põe um personagem em coordenada negativa, além da área do mapa", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comCenas, { "/mesas/{mesa_id}/personagens": [{ id: "lion", nome: "Lion", mesa_id: "mesa", versao: 1,
      proprietario_id: "ana", tipo: "personagem", visibilidade: "mesa", retrato_objeto: null }] }), POST } as unknown as ApiClient, true);
    fireEvent.click(await screen.findByRole("button", { name: "soltar Lion em -10,40" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens", expect.objectContaining({
      body: expect.objectContaining({ personagem_id: "lion", x: -10, y: 40 }),
    })));
  });
});

describe("tokens da cena (item 9)", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  const lion = { id: "lion", nome: "Lion", mesa_id: "mesa", versao: 1, proprietario_id: "ana", tipo: "personagem",
    visibilidade: "mesa", retrato_objeto: null };
  const capanga = { ...lion, id: "capanga", nome: "Capanga", proprietario_id: null, tipo: "npc", visibilidade: "narrador" };
  const comLion = { ...comCenas, cena: { ...comCenas.cena, tokens: [
    ...comCenas.cena.tokens,
    { id: "t-lion", camada_id: "camada", personagem_id: "lion", rotulo: "Lion", x: 2, y: 2, tamanho: 1, versao: 0, controlavel: true,
      tipo_personagem: "personagem" },
  ] } };

  it("soltar o token no grid já o move, sem confirmar, e manda o movimento ao servidor", async () => {
    let concluir!: (valor: unknown) => void;
    const POST = vi.fn().mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
    // O "servidor" passa a devolver a posição nova depois que o movimento é gravado.
    let estado: typeof snapshot = snapshot;
    const GET = vi.fn().mockImplementation(async (caminho: string) => ({
      data: caminho === "/mesas/{mesa_id}/sala" ? estado : [], error: undefined }));
    renderSala({ GET, POST } as unknown as ApiClient, false);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "soltar o primeiro token em 4,3" }));
    // Já no destino, antes da resposta do servidor, e sem nenhum botão de confirmar.
    expect(screen.getByTestId("grid").textContent).toContain("heroi:4,3");
    expect(screen.queryByRole("button", { name: /Confirmar/ })).toBeNull();
    expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento", {
      params: { path: { mesa_id: "mesa", token_id: "heroi" } }, body: { x: 4, y: 3, versao_esperada: 0 },
    });
    const movido = { ...snapshot.cena.tokens[0]!, x: 4, y: 3, versao: 1 };
    estado = { ...snapshot, cena: { ...snapshot.cena, tokens: [movido] } };
    concluir({ data: movido, error: undefined });
    await waitFor(() => expect(screen.queryByText("Movendo token…")).toBeNull());
    expect(screen.getByTestId("grid").textContent).toContain("heroi:4,3");
  });

  it("o Narrador vê os personagens dos jogadores, com os já postos marcados, e coloca pelo botão", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comLion, { "/mesas/{mesa_id}/personagens": [lion, capanga] }), POST } as unknown as ApiClient, true);
    const lista = await screen.findByRole("region", { name: "Personagens dos jogadores" });
    expect(within(lista).getByText("Lion")).toBeTruthy();
    expect(within(lista).queryByText("Capanga")).toBeNull();
    expect(within(lista).getByText("na cena")).toBeTruthy();
    // NPCs e monstros numa lista à parte (item 10), com tipo e a marca de oculto.
    const npcs = screen.getByRole("region", { name: "NPCs e monstros" });
    expect(within(npcs).getByText("Capanga")).toBeTruthy();
    expect(within(npcs).getByText("NPC")).toBeTruthy();
    expect(within(npcs).getByText("ficha oculta")).toBeTruthy();
    expect(within(npcs).queryByText("Lion")).toBeNull();
    fireEvent.click(within(lista).getByRole("button", { name: "Colocar Lion" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens", {
      params: { path: { mesa_id: "mesa", cena_id: "cena" } },
      body: { camada_id: "camada", rotulo: "Lion", x: 0, y: 0, tamanho: 1, personagem_id: "lion", oculto: false },
    }));
  });

  it("soltar um personagem da lista no grid cria o token naquela casa", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comCenas, { "/mesas/{mesa_id}/personagens": [lion] }), POST } as unknown as ApiClient, true);
    fireEvent.click(await screen.findByRole("button", { name: "soltar Lion em 4,2" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens", expect.objectContaining({
      body: expect.objectContaining({ personagem_id: "lion", x: 4, y: 2 }),
    })));
  });

  it("o jogador não vê a lista nem pode soltar personagens no grid", async () => {
    renderSala({ GET: rotas(comCenas, { "/mesas/{mesa_id}/personagens": [lion] }) } as unknown as ApiClient, false);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    expect(screen.queryByRole("region", { name: "Personagens dos jogadores" })).toBeNull();
    expect(screen.queryByRole("button", { name: "soltar Lion em 4,2" })).toBeNull();
  });

  it("o token ligado a um personagem recebe o retrato dele (o padrão, sem imagem enviada)", async () => {
    renderSala({ GET: rotas(comLion, { "/mesas/{mesa_id}/personagens": [lion] }) } as unknown as ApiClient, false);
    const grid = await screen.findByTestId("grid");
    await waitFor(() => expect(JSON.parse(grid.getAttribute("data-retratos") ?? "{}")["t-lion"]).toContain("retrato-vazio-256"));
    expect(JSON.parse(grid.getAttribute("data-retratos") ?? "{}").heroi).toBeUndefined();
  });

  it("o Narrador põe um NPC na cena pela lista à parte", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comCenas, { "/mesas/{mesa_id}/personagens": [lion, capanga] }), POST } as unknown as ApiClient, true);
    const npcs = await screen.findByRole("region", { name: "NPCs e monstros" });
    fireEvent.click(within(npcs).getByRole("button", { name: "Colocar Capanga" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens", expect.objectContaining({
      body: expect.objectContaining({ personagem_id: "capanga", rotulo: "Capanga" }),
    })));
  });

  it("o jogador não vê a lista de NPCs e monstros", async () => {
    renderSala({ GET: rotas(comCenas, { "/mesas/{mesa_id}/personagens": [lion, capanga] }) } as unknown as ApiClient, false);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    expect(screen.queryByRole("region", { name: "NPCs e monstros" })).toBeNull();
  });
});

describe("retirar token e aba Cena enxuta (item 11)", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  it("o Narrador retira um token pela lista, com a versão conferida", async () => {
    const DELETE = vi.fn().mockResolvedValue({ error: undefined });
    renderSala({ GET: rotas(comCenas), DELETE } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Retirar Herói" }));
    await waitFor(() => expect(DELETE).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}", {
      params: { path: { mesa_id: "mesa", token_id: "heroi" }, query: { versao_esperada: 0 } },
    }));
  });

  it("a recusa do servidor ao retirar é anunciada", async () => {
    const DELETE = vi.fn().mockResolvedValue({ error: { detail: "O token foi alterado por outra pessoa." } });
    renderSala({ GET: rotas(comCenas), DELETE } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Retirar Herói" }));
    expect((await screen.findByRole("alert")).textContent).toContain("alterado por outra pessoa");
  });

  it("a aba Cena não tem mais ping por token, coordenadas com Mover nem o formulário Colocar token", async () => {
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: /Herói \(1, 1\)/ }));
    const painel = screen.getByRole("tabpanel");
    expect(within(painel).queryByRole("button", { name: "Enviar ping neste token" })).toBeNull();
    expect(within(painel).queryByLabelText("Coluna de destino")).toBeNull();
    expect(within(painel).queryByRole("button", { name: "Mover" })).toBeNull();
    expect(within(painel).queryByRole("heading", { name: "Colocar token" })).toBeNull();
    expect(within(painel).getByRole("status").textContent).toContain("Herói: coluna 1, linha 1");
  });
});

describe("cenas com chave de ativa", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  it("ligar a chave de outra cena a ativa", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comCenas), POST } as unknown as ApiClient, true);
    const chave = await screen.findByRole("switch", { name: "Cena ativa: Brejo" });
    fireEvent.click(chave);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/ativacao", {
      params: { path: { mesa_id: "mesa", cena_id: "brejo" } },
    }));
  });
});

describe("ocultar tokens e tamanho do mapa (item 12)", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });
  const comOculto = { ...comCenas, cena: { ...comCenas.cena, tokens: [
    ...comCenas.cena.tokens,
    { id: "capanga", camada_id: "camada", personagem_id: null, rotulo: "Capanga", x: 3, y: 3, tamanho: 1, versao: 2,
      controlavel: true, oculto: true },
  ] } };

  it("o Narrador oculta um token visível e mostra um oculto, com a versão conferida", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comOculto), POST } as unknown as ApiClient, true);
    const ocultar = await screen.findByRole("button", { name: "Ocultar Herói" });
    expect(ocultar.getAttribute("aria-pressed")).toBe("false");
    const mostrar = screen.getByRole("button", { name: "Mostrar Capanga" });
    expect(mostrar.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("oculto", { selector: ".tokens-cena__oculto" })).toBeTruthy();
    fireEvent.click(ocultar);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}/visibilidade", {
      params: { path: { mesa_id: "mesa", token_id: "heroi" } }, body: { oculto: true, versao_esperada: 0 },
    }));
    fireEvent.click(mostrar);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}/visibilidade", {
      params: { path: { mesa_id: "mesa", token_id: "capanga" } }, body: { oculto: false, versao_esperada: 2 },
    }));
  });

  it("o tamanho do mapa: uma barra com a proporção mantida, duas sem; aplica ao soltar", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comCenas), POST } as unknown as ApiClient, true);
    const grupo = await screen.findByRole("group", { name: "Tamanho do mapa" });
    const barra = within(grupo).getByRole("slider", { name: "Tamanho" });
    expect(within(grupo).getAllByRole("slider")).toHaveLength(1);
    expect(barra.getAttribute("aria-valuetext")).toBe("8 × 6 casas");
    fireEvent.change(barra, { target: { value: "16" } });
    expect(barra.getAttribute("aria-valuetext")).toBe("16 × 12 casas");
    // Arrastar não aplica; soltar aplica.
    expect(POST).not.toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/area-do-mapa", expect.anything());
    fireEvent.pointerUp(barra);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/area-do-mapa", {
      params: { path: { mesa_id: "mesa", cena_id: "cena" } }, body: { colunas: 16, linhas: 12 },
    }));
    // Sem a proporção, duas barras independentes.
    fireEvent.click(within(grupo).getByRole("checkbox", { name: "Manter proporção" }));
    expect(within(grupo).getAllByRole("slider")).toHaveLength(2);
    const linhas = within(grupo).getByRole("slider", { name: "Linhas" });
    fireEvent.change(linhas, { target: { value: "20" } });
    fireEvent.keyUp(linhas, { key: "ArrowRight" });
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/area-do-mapa", {
      params: { path: { mesa_id: "mesa", cena_id: "cena" } }, body: { colunas: 16, linhas: 20 },
    }));
  });

  it("o mapa da cena aparece como amostra no quadro de envio; sem mapa, um quadro vazio convida a enviar", async () => {
    const comMapa = { ...comCenas, cena: { ...comCenas.cena, mapa_objeto: "mesa/mapas/patio.webp" } };
    renderSala({ GET: rotas(comMapa, { "/mesas/{mesa_id}/ativos": { tipo: "image/webp", base64: "QUJD" } }) } as unknown as ApiClient, true);
    const trocar = await screen.findByRole("button", { name: "Trocar mapa da cena" });
    await waitFor(() => expect(trocar.querySelector("img")?.getAttribute("src")).toBe("data:image/webp;base64,QUJD"));
    expect(trocar.getAttribute("title")).toContain("PNG, JPEG ou WEBP");
    expect(screen.getByRole("button", { name: "Remover mapa da cena" })).toBeTruthy();
    cleanup();
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, true);
    const enviar = await screen.findByRole("button", { name: "Enviar mapa da cena" });
    expect(enviar.classList.contains("image-upload__quadro--vazio")).toBe(true);
    expect(enviar.querySelector("img")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover mapa da cena" })).toBeNull();
    expect(screen.queryByText(/PNG, JPEG ou WEBP/)).toBeNull();
  });

  it("o jogador não tem ocultar nem o tamanho do mapa", async () => {
    renderSala({ GET: rotas(comOculto) } as unknown as ApiClient, false);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    expect(screen.queryByRole("button", { name: /^(Ocultar|Mostrar) / })).toBeNull();
    expect(screen.queryByRole("group", { name: "Tamanho do mapa" })).toBeNull();
  });

  it("ligar 'Colocar oculto dos jogadores' faz o token entrar oculto", async () => {
    const lion = { id: "lion", nome: "Lion", mesa_id: "mesa", versao: 1, proprietario_id: "ana", tipo: "personagem",
      visibilidade: "mesa", retrato_objeto: null };
    const capanga = { ...lion, id: "capanga", nome: "Capanga", proprietario_id: null, tipo: "npc", visibilidade: "narrador" };
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comCenas, { "/mesas/{mesa_id}/personagens": [lion, capanga] }), POST } as unknown as ApiClient, true);
    const chave = await screen.findByRole("switch", { name: "Colocar oculto dos jogadores" });
    expect((chave as HTMLInputElement).checked).toBe(false);
    fireEvent.click(chave);
    fireEvent.click(screen.getByRole("button", { name: "Colocar Capanga" }));
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/tokens", expect.objectContaining({
      body: expect.objectContaining({ personagem_id: "capanga", oculto: true }),
    })));
  });

  it("o retrato do token vem da rota do token, inclusive para o jogador e para ficha oculta", async () => {
    const comLion = { ...comCenas, cena: { ...comCenas.cena, tokens: [
      { id: "t-lion", camada_id: "camada", personagem_id: null, rotulo: "Macaco", x: 2, y: 2, tamanho: 1, versao: 0,
        controlavel: false, tipo_personagem: "monstro" },
    ] } };
    const GET = vi.fn().mockImplementation(async (caminho: string) => {
      if (caminho === "/mesas/{mesa_id}/sala") return { data: comLion, error: undefined };
      if (caminho === "/mesas/{mesa_id}/sala/tokens/{token_id}/retrato") return { data: { tipo: "image/webp", base64: "QUJD" }, error: undefined };
      return { data: [], error: undefined };
    });
    renderSala({ GET } as unknown as ApiClient, false);
    const grid = await screen.findByTestId("grid");
    await waitFor(() => expect(JSON.parse(grid.getAttribute("data-retratos") ?? "{}")["t-lion"]).toBe("data:image/webp;base64,QUJD"));
    expect(GET).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}/retrato", {
      params: { path: { mesa_id: "mesa", token_id: "t-lion" } },
    });
  });

  it("a Sala se atualiza sozinha: a cada 1 s sem tempo real, a cada 15 s com tempo real", () => {
    expect(intervaloDaSala(false)).toBe(1_000);
    expect(intervaloDaSala(true)).toBe(15_000);
  });

  it("sem tempo real, o jogador recebe o que o Narrador mudou sem recarregar a página", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let estado: typeof comCenas = comCenas;
      const GET = vi.fn().mockImplementation(async (caminho: string) => ({
        data: caminho === "/mesas/{mesa_id}/sala" ? estado : [], error: undefined }));
      renderSala({ GET } as unknown as ApiClient, false);
      expect((await screen.findByTestId("grid")).textContent).toContain("heroi:1,1");
      // O Narrador oculta o token: ele some do snapshot autorizado do jogador.
      estado = { ...comCenas, cena: { ...comCenas.cena, tokens: [] } };
      await vi.advanceTimersByTimeAsync(1_100);
      await waitFor(() => expect(screen.getByTestId("grid").textContent).not.toContain("heroi"));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("seções retráteis da aba Cena (item 14)", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });

  it("cada seção abre e fecha pelo título, mostra a quantidade e fica lembrada", async () => {
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    const titulo = screen.getByRole("button", { name: "Tokens da cena" });
    expect(titulo.getAttribute("aria-expanded")).toBe("true");
    expect(titulo.textContent).toContain("1");
    expect(screen.getByRole("button", { name: /Herói \(1, 1\)/ })).toBeTruthy();
    fireEvent.click(titulo);
    expect(titulo.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /Herói \(1, 1\)/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Cenas" }).getAttribute("aria-expanded")).toBe("true");
    cleanup();
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, true);
    await screen.findByTestId("grid");
    expect(screen.getByRole("button", { name: "Tokens da cena" }).getAttribute("aria-expanded")).toBe("false");
  });
  it("para o Narrador, a barra de colocar e as três listas ficam dentro de uma seção 'Tokens' (item 15)", async () => {
    const personagens = [
      { id: "lion", nome: "Lion", proprietario_id: "bia", tipo: "personagem", visibilidade: "mesa", retrato_objeto: null },
      { id: "lobo", nome: "Lobo", proprietario_id: null, tipo: "monstro", visibilidade: "mesa", retrato_objeto: null },
    ];
    renderSala({ GET: rotas(comCenas, { "/mesas/{mesa_id}/personagens": personagens }) } as unknown as ApiClient, true);
    const grupo = await screen.findByRole("region", { name: "Tokens" });
    await within(grupo).findByRole("button", { name: "Colocar Lion" });
    expect(within(grupo).getByRole("switch", { name: "Colocar oculto dos jogadores" })).toBeTruthy();
    // Jogadores e os demais separados, cada um retrátil, e os tokens em cena junto.
    for (const nome of ["Personagens dos jogadores", "NPCs e monstros", "Tokens da cena"]) {
      expect(within(grupo).getByRole("heading", { level: 3, name: nome })).toBeTruthy();
    }
    expect(within(grupo).getByRole("button", { name: "Colocar Lobo" })).toBeTruthy();
    // Fechar "Tokens" recolhe tudo de uma vez.
    fireEvent.click(screen.getByRole("button", { name: "Tokens" }));
    expect(screen.queryByRole("switch", { name: "Colocar oculto dos jogadores" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tokens da cena" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cenas" })).toBeTruthy();
  });

  it("o jogador vê só a lista da cena, sem a seção 'Tokens' em volta", async () => {
    renderSala({ GET: rotas(comCenas) } as unknown as ApiClient, false);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    expect(screen.getByRole("heading", { level: 2, name: "Tokens da cena" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tokens" })).toBeNull();
  });
});

describe("permissão de movimento dos tokens (item 13)", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.localStorage.clear(); });
  const comPermissoes = { ...comCenas, cena: { ...comCenas.cena, tokens: [
    { id: "t-lion", camada_id: "camada", personagem_id: "lion", rotulo: "Lion", x: 1, y: 1, tamanho: 1, versao: 3,
      controlavel: true, movimento_liberado: true, controladores: [], tipo_personagem: "personagem" },
    { id: "t-carroca", camada_id: "camada", personagem_id: null, rotulo: "Carroça", x: 2, y: 2, tamanho: 1, versao: 5,
      controlavel: true, movimento_liberado: false, controladores: [] },
  ] } };
  const extras = {
    "/mesas/{mesa_id}/personagens": [{ id: "lion", nome: "Lion", proprietario_id: "bia", tipo: "personagem", visibilidade: "mesa", retrato_objeto: null }],
    "/mesas/{mesa_id}/participantes": [
      { usuario_id: "mestre", nome: "Mestre", papel: "narrador", tem_foto: false },
      { usuario_id: "ana", nome: "Ana", papel: "jogador", tem_foto: false },
      { usuario_id: "bia", nome: "Bia", papel: "jogador", tem_foto: false },
    ],
  };

  it("o cadeado bloqueia o token de um jogador, com a versão conferida", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comPermissoes, extras), POST } as unknown as ApiClient, true);
    const bloquear = await screen.findByRole("button", { name: "Bloquear movimento de Lion" });
    expect(bloquear.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Liberar movimento de Carroça" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("bloqueado")).toBeTruthy();
    fireEvent.click(bloquear);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento-permitido", {
      params: { path: { mesa_id: "mesa", token_id: "t-lion" } }, body: { liberado: false, versao_esperada: 3 },
    }));
  });

  it("liberar um token sem dono pede os jogadores que podem movê-lo (só jogadores, não o Narrador)", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comPermissoes, extras), POST } as unknown as ApiClient, true);
    fireEvent.click(await screen.findByRole("button", { name: "Liberar movimento de Carroça" }));
    const dialogo = await screen.findByRole("dialog", { name: "Quem pode mover Carroça" });
    expect(within(dialogo).queryByRole("checkbox", { name: "Mestre" })).toBeNull();
    const liberar = within(dialogo).getByRole("button", { name: "Liberar movimento" }) as HTMLButtonElement;
    expect(liberar.disabled).toBe(true);
    fireEvent.click(await within(dialogo).findByRole("checkbox", { name: "Ana" }));
    fireEvent.click(liberar);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/tokens/{token_id}/movimento-permitido", {
      params: { path: { mesa_id: "mesa", token_id: "t-carroca" } }, body: { liberado: true, versao_esperada: 5, controladores: ["ana"] },
    }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("as ações em lote mandam o modo escolhido para a cena", async () => {
    const POST = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    renderSala({ GET: rotas(comPermissoes, extras), POST } as unknown as ApiClient, true);
    const lote = await screen.findByRole("group", { name: "Movimento dos jogadores" });
    for (const [rotulo, modo] of [["Bloquear todos", "bloquear_todos"], ["Só personagens principais", "so_principais"], ["Liberar todos", "liberar_todos"]]) {
      fireEvent.click(within(lote).getByRole("button", { name: rotulo }));
      await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/sala/cenas/{cena_id}/permissoes", {
        params: { path: { mesa_id: "mesa", cena_id: "cena" } }, body: { modo },
      }));
    }
  });

  it("a recusa do servidor é anunciada, e o jogador não tem cadeado nem ações em lote", async () => {
    const POST = vi.fn().mockResolvedValue({ data: undefined, error: { detail: "O token foi alterado por outra pessoa." } });
    renderSala({ GET: rotas(comPermissoes, extras), POST } as unknown as ApiClient, true);
    fireEvent.click(await screen.findByRole("button", { name: "Bloquear movimento de Lion" }));
    expect((await screen.findByRole("alert")).textContent).toContain("alterado por outra pessoa");
    cleanup();
    renderSala({ GET: rotas(comPermissoes, extras) } as unknown as ApiClient, false);
    await screen.findByTestId("grid");
    fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    expect(screen.queryByRole("button", { name: /movimento de/ })).toBeNull();
    expect(screen.queryByRole("group", { name: "Movimento dos jogadores" })).toBeNull();
  });
});
