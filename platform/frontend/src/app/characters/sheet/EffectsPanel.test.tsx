// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EffectsPanel } from "./EffectsPanel";
import type { ApiClient, EfeitoResumo } from "../types";

const efeitos: EfeitoResumo[] = [
  {
    id: "efeito-1",
    nome: "Bênção da armadura",
    descricao: "Reforça a proteção enquanto a armadura estiver vestida.",
    estado: "ativo",
    duracao_rodadas: null,
    ativacao: "enquanto_equipado",
    fontes: [{ tipo: "equipamento", descricao: "Cota de malha", equipamento_id: "item-1" }],
    modificadores: [
      { alvo: "defesa:armadura", valor: 1, contexto: null },
      { alvo: "defesa:armadura", valor: 2, contexto: "contra projéteis" },
    ],
  },
  {
    id: "efeito-2",
    nome: "Veneno lento",
    descricao: "Reduz o vigor enquanto ativo.",
    estado: "suspenso",
    duracao_rodadas: 3,
    ativacao: null,
    fontes: [],
    modificadores: [{ alvo: "atributo:vigor", valor: -1, contexto: null }],
  },
];

/**
 * `EffectsPanel` agora sempre monta os comandos de efeito do Narrador (8.3)
 * via TanStack Query, ainda que `admin` esteja ausente — por isso todo
 * render, inclusive os de leitura já existentes da seção 6.5, precisa de um
 * `QueryClientProvider` ancestral.
 */
function renderPanel(efeitos: EfeitoResumo[], admin?: Parameters<typeof EffectsPanel>[0]["admin"]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EffectsPanel efeitos={efeitos} admin={admin} />
    </QueryClientProvider>,
  );
}

describe("EffectsPanel — 6.5 efeitos ativos legíveis e acessíveis", () => {
  afterEach(() => cleanup());

  it("cada efeito é um ícone cujo conteúdo completo aparece por clique", () => {
    renderPanel(efeitos);
    fireEvent.click(screen.getByRole("button", { name: "Bênção da armadura" }));
    const details = screen.getByRole("group", { name: "Bênção da armadura" });
    expect(within(details).getByText("Ativo")).toBeTruthy();
    expect(within(details).getByText("Reforça a proteção enquanto a armadura estiver vestida.")).toBeTruthy();
    expect(within(details).getByText(/Cota de malha/)).toBeTruthy();
    expect(within(details).getByText(/Modificador — defesa:armadura/)).toBeTruthy();
    expect(within(details).getByText("Situacionais")).toBeTruthy();
    expect(within(details).getByText(/contra projéteis/)).toBeTruthy();
  });

  it("um efeito suspenso é rotulado como tal e visualmente distinto", () => {
    renderPanel(efeitos);
    const trigger = screen.getByRole("button", { name: "Veneno lento (suspenso)" });
    expect(trigger.className).toContain("effect-icon--suspenso");
    fireEvent.click(trigger);
    const details = screen.getByRole("group", { name: "Veneno lento (suspenso)" });
    expect(within(details).getByText("Suspenso")).toBeTruthy();
    expect(within(details).getByText("3 rodadas")).toBeTruthy();
  });

  it("abre por foco de teclado e por toque, não só por hover ou clique", () => {
    renderPanel(efeitos);
    const trigger = screen.getByRole("button", { name: "Bênção da armadura" });
    fireEvent.focus(trigger);
    expect(screen.getByRole("group", { name: "Bênção da armadura" })).toBeTruthy();
    fireEvent.blur(trigger);

    fireEvent.touchStart(trigger);
    expect(screen.getByRole("group", { name: "Bênção da armadura" })).toBeTruthy();
  });

  it("mostra uma mensagem quando não há efeitos ativos ou suspensos", () => {
    renderPanel([]);
    expect(screen.getByText("Nenhum efeito ativo ou suspenso no momento.")).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    renderPanel(efeitos);
    fireEvent.click(screen.getByRole("button", { name: "Bênção da armadura" }));
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

function efeitoAtivo(overrides: Partial<EfeitoResumo> = {}): EfeitoResumo {
  return {
    id: "efeito-1", nome: "Aturdido", descricao: "Reação atrasada em combate.", estado: "ativo",
    duracao_rodadas: 3, modificadores: [{ alvo: "iniciativa", valor: -2, contexto: null }],
    fontes: [{ tipo: "narrador", descricao: "Golpe na cabeça", equipamento_id: null }],
    ...overrides,
  };
}

function renderAdminPanel(api: ApiClient, efeitosAdmin: EfeitoResumo[], admin = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onVersaoConfirmada = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <EffectsPanel
        efeitos={efeitosAdmin}
        admin={admin ? { api, mesaId: "mesa-1", personagemId: "pj-1", versao: 5, onVersaoConfirmada } : undefined}
      />
    </QueryClientProvider>,
  );
  return { onVersaoConfirmada };
}

describe("EffectsPanel — 8.3 comandos de efeito do Narrador", () => {
  afterEach(() => cleanup());

  it("Narrador aplica um efeito do catálogo com modificador e origem", async () => {
    const POST = vi.fn(async (path: string) => {
      if (path.endsWith("/efeitos")) {
        return { data: { versao: 6, efeito: efeitoAtivo({ id: "efeito-2", nome: "Sangrando" }) }, error: undefined };
      }
      throw new Error(`POST não simulado: ${path}`);
    });
    const api = { POST } as unknown as ApiClient;
    const { onVersaoConfirmada } = renderAdminPanel(api, []);

    fireEvent.click(screen.getByRole("button", { name: /Aplicar efeito/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Associação do catálogo"), { target: { value: "cc_above" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Adicionar modificador" }));
    fireEvent.change(within(dialog).getByLabelText("Alvo"), { target: { value: "defesa" } });
    fireEvent.change(within(dialog).getByLabelText("Valor"), { target: { value: "-1" } });
    fireEvent.change(within(dialog).getByLabelText("Origem (o que causou o efeito na ficção)"), { target: { value: "Queda de uma escada" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar efeito" }));

    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos",
        expect.objectContaining({
          body: expect.objectContaining({
            associacao: "cc_above",
            nome: null,
            descricao: null,
            modificadores: [{ alvo: "defesa", valor: -1, contexto: null }],
            origem: "Queda de uma escada",
            versao_esperada: 5,
          }),
        }),
      ),
    );
    await waitFor(() => expect(onVersaoConfirmada).toHaveBeenCalledWith(6));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Narrador ajusta um efeito existente enviando a versão esperada correta", async () => {
    const PATCH = vi.fn(async () => ({ data: { versao: 7, efeito: efeitoAtivo({ descricao: "Nova descrição" }) }, error: undefined }));
    const api = { PATCH } as unknown as ApiClient;
    renderAdminPanel(api, [efeitoAtivo()]);

    fireEvent.click(screen.getByRole("button", { name: "Ajustar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Descrição"), { target: { value: "Nova descrição" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar ajuste" }));

    await waitFor(() =>
      expect(PATCH).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos/{efeito_id}",
        expect.objectContaining({
          params: { path: { mesa_id: "mesa-1", personagem_id: "pj-1", efeito_id: "efeito-1" } },
          body: expect.objectContaining({ descricao: "Nova descrição", versao_esperada: 5 }),
        }),
      ),
    );
  });

  it("Narrador suspende um efeito ativo com versao_esperada correta", async () => {
    const POST = vi.fn(async () => ({ data: { versao: 6, efeito: efeitoAtivo({ estado: "suspenso" }) }, error: undefined }));
    const api = { POST } as unknown as ApiClient;
    renderAdminPanel(api, [efeitoAtivo({ estado: "ativo" })]);

    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Suspender" }));

    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos/{efeito_id}/{acao}",
        expect.objectContaining({
          params: { path: { mesa_id: "mesa-1", personagem_id: "pj-1", efeito_id: "efeito-1", acao: "suspender" } },
          body: expect.objectContaining({ versao_esperada: 5 }),
        }),
      ),
    );
  });

  it("Narrador retoma um efeito suspenso, com o motivo do estado inválido tratado quando o servidor recusa (409)", async () => {
    const POST = vi.fn(async () => ({ data: undefined, error: { detail: "Efeito de item não equipado não pode ser retomado." } }));
    const api = { POST } as unknown as ApiClient;
    renderAdminPanel(api, [efeitoAtivo({ estado: "suspenso" })]);

    fireEvent.click(screen.getByRole("button", { name: "Retomar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retomar" }));

    expect(await screen.findByText("Efeito de item não equipado não pode ser retomado.")).toBeTruthy();
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos/{efeito_id}/{acao}",
        expect.objectContaining({
          params: { path: { mesa_id: "mesa-1", personagem_id: "pj-1", efeito_id: "efeito-1", acao: "retomar" } },
          body: expect.objectContaining({ versao_esperada: 5 }),
        }),
      ),
    );
  });

  it("Narrador encerra um efeito com versao_esperada correta", async () => {
    const POST = vi.fn(async () => ({ data: { versao: 6, efeito: efeitoAtivo({ estado: "encerrado" }) }, error: undefined }));
    const api = { POST } as unknown as ApiClient;
    renderAdminPanel(api, [efeitoAtivo({ estado: "ativo" })]);

    fireEvent.click(screen.getByRole("button", { name: "Encerrar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Encerrar" }));

    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/personagens/{personagem_id}/efeitos/{efeito_id}/{acao}",
        expect.objectContaining({
          params: { path: { mesa_id: "mesa-1", personagem_id: "pj-1", efeito_id: "efeito-1", acao: "encerrar" } },
          body: expect.objectContaining({ versao_esperada: 5 }),
        }),
      ),
    );
  });

  it("um erro 409/422 aparece no diálogo sem alterar a lista de efeitos", async () => {
    const PATCH = vi.fn(async () => ({ data: undefined, error: { detail: "A versão informada não confere com a ficha atual." } }));
    const api = { PATCH } as unknown as ApiClient;
    renderAdminPanel(api, [efeitoAtivo()]);

    fireEvent.click(screen.getByRole("button", { name: "Ajustar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar ajuste" }));

    expect(await screen.findByText("A versão informada não confere com a ficha atual.")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
    // A lista de efeitos permanece a mesma (ainda "ativo") — nenhuma invalidação ocorreu.
    expect(screen.getByRole("button", { name: "Aturdido" })).toBeTruthy();
  });

  it("o jogador (sem admin) não vê nenhum controle de aplicar, ajustar, suspender, retomar ou encerrar", () => {
    const api = { POST: vi.fn(), PATCH: vi.fn() } as unknown as ApiClient;
    renderAdminPanel(api, [efeitoAtivo()], false);

    expect(screen.queryByRole("button", { name: /Aplicar efeito/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ajustar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Suspender" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Encerrar" })).toBeNull();
    // O efeito em si continua visível para o jogador, incluindo a origem.
    expect(screen.getByRole("button", { name: "Aturdido" })).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    const api = { POST: vi.fn(), PATCH: vi.fn() } as unknown as ApiClient;
    renderAdminPanel(api, [efeitoAtivo()]);
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
