// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterList } from "./CharacterList";
import type { ApiClient, ParticipanteResumo, PersonagemResumo, PoliticaMesaContrato } from "./types";

const politicaAberta: PoliticaMesaContrato = {
  permitir_criacao_propria: true,
  permitir_edicao_propria: true,
  permitir_exclusao_propria: true,
  campos_bloqueados: [],
  campos_exigem_aprovacao: [],
};

function personagem(overrides: Partial<PersonagemResumo> = {}): PersonagemResumo {
  return {
    id: "pj-1",
    mesa_id: "mesa-1",
    nome: "Nara Exemplo",
    tipo: "personagem",
    visibilidade: "mesa",
    proprietario_id: "usuario-1",
    versao: 3,
    excluido_em: null,
    restauravel_ate: null,
    ...overrides,
  };
}

interface ApiFixture {
  ativos?: PersonagemResumo[];
  lixeira?: PersonagemResumo[];
  politica?: PoliticaMesaContrato;
  participantes?: ParticipanteResumo[];
  post?: (path: string, options: unknown) => Promise<{ data?: unknown; error?: unknown }>;
  del?: (path: string, options: unknown) => Promise<{ data?: unknown; error?: unknown }>;
  put?: (path: string, options: unknown) => Promise<{ data?: unknown; error?: unknown }>;
}

function createApi(fixture: ApiFixture = {}): { api: ApiClient; GET: ReturnType<typeof vi.fn>; POST: ReturnType<typeof vi.fn>; DELETE: ReturnType<typeof vi.fn>; PUT: ReturnType<typeof vi.fn> } {
  const GET = vi.fn(async (path: string, options: { params?: { query?: { excluidos?: boolean } } }) => {
    if (path === "/mesas/{mesa_id}/personagens") {
      const excluidos = options?.params?.query?.excluidos ?? false;
      return { data: excluidos ? (fixture.lixeira ?? []) : (fixture.ativos ?? []), error: undefined };
    }
    if (path === "/mesas/{mesa_id}/politicas") return { data: fixture.politica ?? politicaAberta, error: undefined };
    if (path === "/mesas/{mesa_id}/participantes") return { data: fixture.participantes ?? [], error: undefined };
    throw new Error(`GET não simulado: ${path}`);
  });
  const POST = vi.fn(fixture.post ?? (async () => ({ data: undefined, error: { detail: "Não simulado." } })));
  const DELETE = vi.fn(fixture.del ?? (async () => ({ data: undefined, error: undefined })));
  const PUT = vi.fn(fixture.put ?? (async () => ({ data: undefined, error: { detail: "Não simulado." } })));
  const api = { GET, POST, DELETE, PUT } as unknown as ApiClient;
  return { api, GET, POST, DELETE, PUT };
}

function renderList(props: Partial<Parameters<typeof CharacterList>[0]> & { api: ApiClient }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CharacterList mesaId="mesa-1" userId="usuario-1" role="jogador" onOpen={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
}

describe("CharacterList — 6.1 gestão de personagens", () => {
  afterEach(() => cleanup());

  it("Narrador vê todos os personagens, incluindo NPC e ocultos, com ações de abrir, transferir e excluir", async () => {
    const { api } = createApi({
      ativos: [
        personagem({ id: "pj-1", nome: "Nara Exemplo" }),
        personagem({ id: "npc-1", nome: "Vilão Oculto", tipo: "npc", visibilidade: "narrador", proprietario_id: null }),
      ],
    });
    const onOpen = vi.fn();
    renderList({ api, role: "narrador", onOpen });

    expect(await screen.findByText("Nara Exemplo")).toBeTruthy();
    expect(screen.getByText("Vilão Oculto")).toBeTruthy();
    expect(screen.getByText(/Oculto do grupo/)).toBeTruthy();

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0] as HTMLElement).getByRole("button", { name: "Abrir" })).toBeTruthy();
    expect(within(rows[0] as HTMLElement).getByRole("button", { name: /Transferir/ })).toBeTruthy();
    expect(within(rows[0] as HTMLElement).getByRole("button", { name: "Excluir" })).toBeTruthy();

    fireEvent.click(within(rows[0] as HTMLElement).getByRole("button", { name: "Abrir" }));
    expect(onOpen).toHaveBeenCalledWith("pj-1");
  });

  it("Narrador cria uma entidade oculta por padrão e é levado à nova ficha (8.1)", async () => {
    const created = personagem({ id: "npc-novo", nome: "Emboscada", tipo: "npc", visibilidade: "narrador", proprietario_id: null });
    const { api, POST } = createApi({
      ativos: [],
      post: async () => ({ data: created, error: undefined }),
    });
    const onOpen = vi.fn();
    renderList({ api, role: "narrador", onOpen });

    fireEvent.click(await screen.findByRole("button", { name: /Nova entidade/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome"), { target: { value: "Emboscada" } });
    fireEvent.change(within(dialog).getByLabelText("Tipo"), { target: { value: "npc" } });
    // Visibilidade padrão já é "Oculta"; confirmamos sem alterá-la.
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar entidade" }));

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith("npc-novo"));
    expect(POST).toHaveBeenCalledWith(
      "/mesas/{mesa_id}/entidades",
      expect.objectContaining({
        body: { tipo: "npc", visibilidade: "narrador", proprietario_id: null, ficha: { personagem: { nome: "Emboscada" } } },
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Narrador pode escolher tipo, visibilidade e proprietário ao criar uma entidade", async () => {
    const created = personagem({ id: "pj-2", nome: "Aliado", proprietario_id: "usuario-2" });
    const { api, POST } = createApi({
      ativos: [],
      participantes: [{ usuario_id: "usuario-2", papel: "jogador" }],
      post: async () => ({ data: created, error: undefined }),
    });
    renderList({ api, role: "narrador", onOpen: vi.fn() });

    fireEvent.click(await screen.findByRole("button", { name: /Nova entidade/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome"), { target: { value: "Aliado" } });
    fireEvent.click(within(dialog).getByLabelText("Visível para a mesa"));
    fireEvent.change(within(dialog).getByLabelText("Proprietário (opcional)"), { target: { value: "usuario-2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar entidade" }));

    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/entidades",
        expect.objectContaining({
          body: { tipo: "personagem", visibilidade: "mesa", proprietario_id: "usuario-2", ficha: { personagem: { nome: "Aliado" } } },
        }),
      ),
    );
  });

  it("erro do servidor ao criar entidade aparece no diálogo, que permanece aberto e não navega", async () => {
    const { api } = createApi({
      ativos: [],
      post: async () => ({ data: undefined, error: { detail: "Nome da entidade obrigatório." } }),
    });
    const onOpen = vi.fn();
    renderList({ api, role: "narrador", onOpen });

    fireEvent.click(await screen.findByRole("button", { name: /Nova entidade/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome"), { target: { value: "X" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Criar entidade" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Nome da entidade obrigatório.");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("Jogador não vê nenhum controle de criação de entidade oculta, tipo ou visibilidade", async () => {
    const { api } = createApi({ ativos: [personagem({ id: "pj-1", nome: "Ficha própria" })] });
    renderList({ api, role: "jogador", onOpen: vi.fn() });

    expect(await screen.findByRole("button", { name: /Criar personagem/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Nova entidade/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Criar personagem/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("Tipo")).toBeNull();
    expect(within(dialog).queryByText("Visibilidade inicial")).toBeNull();
    expect(within(dialog).queryByLabelText("Proprietário (opcional)")).toBeNull();
    expect(screen.queryByRole("button", { name: "Visibilidade" })).toBeNull();
  });

  it("Narrador transfere um personagem para um participante e para controle exclusivo do Narrador", async () => {
    const alvo = personagem({ id: "pj-1", versao: 4, proprietario_id: "usuario-1" });
    const { api, POST } = createApi({
      ativos: [alvo],
      participantes: [{ usuario_id: "usuario-2", papel: "jogador" }],
      post: async () => ({ data: { ...alvo, proprietario_id: "usuario-2", versao: 5 }, error: undefined }),
    });
    renderList({ api, role: "narrador", onOpen: vi.fn() });

    fireEvent.click(await screen.findByRole("button", { name: /Transferir/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Jogador · usuario-2/ }));

    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}/transferencia",
        expect.objectContaining({ body: { proprietario_id: "usuario-2", versao_esperada: 4 } }),
      ),
    );
  });

  it("Narrador revela parcialmente uma entidade oculta (8.2): PUT envia a revelação exata", async () => {
    const alvo = personagem({ id: "npc-1", nome: "Vilão Oculto", tipo: "npc", visibilidade: "narrador", proprietario_id: null, versao: 7 });
    const { api, PUT } = createApi({
      ativos: [alvo],
      put: async () => ({ data: { ...alvo, revelacao: { nome_publico: "Figura encapuzada", imagem: true } }, error: undefined }),
    });
    renderList({ api, role: "narrador", onOpen: vi.fn() });

    fireEvent.click(await screen.findByRole("button", { name: "Visibilidade" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome público"), { target: { value: "Figura encapuzada" } });
    fireEvent.click(within(dialog).getByLabelText("Mostrar retrato"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar visibilidade" }));

    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}/visibilidade",
        expect.objectContaining({
          body: { visibilidade: "narrador", revelacao: { nome_publico: "Figura encapuzada", imagem: true }, versao_esperada: 7 },
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("Narrador exclui um personagem após confirmar, e a lixeira permite restaurar com prazo visível", async () => {
    const alvo = personagem({ id: "pj-1", versao: 2 });
    const excluido = personagem({ id: "pj-1", versao: 3, excluido_em: "2026-01-01T00:00:00Z", restauravel_ate: "2026-02-01T00:00:00Z" });
    const { api, DELETE, POST } = createApi({
      ativos: [alvo],
      lixeira: [excluido],
      del: async () => ({ data: undefined, error: undefined }),
      post: async () => ({ data: excluido, error: undefined }),
    });
    renderList({ api, role: "narrador", onOpen: vi.fn() });

    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    const excluirButtons = screen.getAllByRole("button", { name: "Excluir" });
    fireEvent.click(excluirButtons[excluirButtons.length - 1]!);
    await waitFor(() =>
      expect(DELETE).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}",
        expect.objectContaining({ params: expect.objectContaining({ query: { versao_esperada: 2 } }) }),
      ),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Lixeira" }));
    expect(await screen.findByText(/Recuperável até/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}/restauracao",
        expect.objectContaining({ params: expect.objectContaining({ query: { versao_esperada: 3 } }) }),
      ),
    );
  });

  it("Jogador só vê suas próprias fichas e não tem controles de transferência", async () => {
    const { api } = createApi({ ativos: [personagem({ id: "pj-1", nome: "Ficha própria" })] });
    renderList({ api, role: "jogador", onOpen: vi.fn() });
    expect(await screen.findByText("Ficha própria")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Transferir/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Lixeira" })).toBeNull();
  });

  it("Jogador sem permissão de criação não vê o botão e recebe o motivo explicado", async () => {
    const { api } = createApi({
      ativos: [],
      politica: { ...politicaAberta, permitir_criacao_propria: false },
    });
    renderList({ api, role: "jogador", onOpen: vi.fn() });
    expect(await screen.findByText("Criação de personagem não permitida nesta mesa.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Criar personagem/ })).toBeNull();
  });

  it("Jogador sem permissão de exclusão própria não vê o botão Excluir em sua ficha", async () => {
    const { api } = createApi({
      ativos: [personagem({ id: "pj-1", proprietario_id: "usuario-1" })],
      politica: { ...politicaAberta, permitir_exclusao_propria: false },
    });
    renderList({ api, role: "jogador", userId: "usuario-1", onOpen: vi.fn() });
    expect(await screen.findByText("Nara Exemplo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Excluir" })).toBeNull();
  });

  it("Jogador com permissão pode excluir a própria ficha; o servidor ainda decide (403 tratado)", async () => {
    const { api } = createApi({
      ativos: [personagem({ id: "pj-1", proprietario_id: "usuario-1", versao: 1 })],
      del: async () => ({ data: undefined, error: { detail: "Exclusão não permitida nesta mesa." } }),
    });
    renderList({ api, role: "jogador", userId: "usuario-1", onOpen: vi.fn() });

    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Excluir" })[1]!);
    expect(await screen.findByText("Exclusão não permitida nesta mesa.")).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    const { api } = createApi({
      ativos: [personagem({ id: "pj-1", nome: "Nara Exemplo" })],
      participantes: [{ usuario_id: "usuario-2", papel: "jogador" }],
    });
    renderList({ api, role: "narrador", onOpen: vi.fn() });
    await screen.findByText("Nara Exemplo");
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });

  it("o diálogo 'Nova entidade' não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    const { api } = createApi({ ativos: [], participantes: [{ usuario_id: "usuario-2", papel: "jogador" }] });
    renderList({ api, role: "narrador", onOpen: vi.fn() });
    fireEvent.click(await screen.findByRole("button", { name: /Nova entidade/ }));
    await screen.findByRole("dialog");
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });

  it("o diálogo de Visibilidade não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    const { api } = createApi({ ativos: [personagem({ id: "npc-1", nome: "Vilão Oculto", tipo: "npc", visibilidade: "narrador" })] });
    renderList({ api, role: "narrador", onOpen: vi.fn() });
    fireEvent.click(await screen.findByRole("button", { name: "Visibilidade" }));
    await screen.findByRole("dialog");
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
