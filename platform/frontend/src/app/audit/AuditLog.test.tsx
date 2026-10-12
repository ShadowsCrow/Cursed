// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditLog } from "./AuditLog";
import type { EventoAuditoriaResumo } from "./api";
import type { ApiClient, ParticipanteResumo, PersonagemResumo } from "../characters/types";

function evento(overrides: Partial<EventoAuditoriaResumo> = {}): EventoAuditoriaResumo {
  return {
    id: 1,
    ocorrido_em: "2026-01-10T18:30:00Z",
    sessao_id: null,
    ator_id: "ana",
    origem: "usuario",
    categoria: "ficha",
    acao: "ficha.atualizada",
    relevancia: "mecanica",
    personagem_id: "pj-1",
    alvo_tipo: "personagem",
    alvo_id: "pj-1",
    resumo: "Lia: Vigor de 2 para 3",
    mudancas: [{ campo: "atributos.valores.Vigor", antes: 2, depois: 3, rotulo: null, completo: true }],
    motivo: null,
    correlacao_id: null,
    corrige_evento_id: null,
    corrigido_por: [],
    corrigivel: false,
    ...overrides,
  };
}

function personagem(overrides: Partial<PersonagemResumo> = {}): PersonagemResumo {
  return {
    id: "pj-1", mesa_id: "mesa-1", nome: "Lia", tipo: "personagem", visibilidade: "mesa",
    proprietario_id: "ana", versao: 3, excluido_em: null, restauravel_ate: null, ...overrides,
  };
}

interface ApiFixture {
  eventos?: EventoAuditoriaResumo[];
  personagensAtivos?: PersonagemResumo[];
  personagensExcluidos?: PersonagemResumo[];
  participantes?: ParticipanteResumo[];
  post?: (path: string, options: unknown) => Promise<{ data?: unknown; error?: unknown }>;
}

function createApi(fixture: ApiFixture = {}) {
  const GET = vi.fn(async (path: string, options: { params?: { query?: Record<string, unknown> } }) => {
    if (path === "/mesas/{mesa_id}/auditoria") {
      const q = options?.params?.query ?? {};
      let filtrado = fixture.eventos ?? [];
      if (q.sessao_id) filtrado = filtrado.filter((e) => e.sessao_id === q.sessao_id);
      if (q.ator_id) filtrado = filtrado.filter((e) => e.ator_id === q.ator_id);
      if (q.personagem_id) filtrado = filtrado.filter((e) => e.personagem_id === q.personagem_id);
      if (q.categoria) filtrado = filtrado.filter((e) => e.categoria === q.categoria);
      if (q.relevancia) filtrado = filtrado.filter((e) => e.relevancia === q.relevancia);
      if (typeof q.antes_de === "number") filtrado = filtrado.filter((e) => e.id < (q.antes_de as number));
      const limite = typeof q.limite === "number" ? q.limite : 30;
      const pagina = filtrado.slice(0, limite);
      const proximo = filtrado.length > limite ? pagina[limite - 1]!.id : null;
      return { data: { eventos: pagina, proximo_cursor: proximo }, error: undefined };
    }
    if (path === "/mesas/{mesa_id}/personagens") {
      const excluidos = options?.params?.query?.excluidos ?? false;
      return { data: excluidos ? (fixture.personagensExcluidos ?? []) : (fixture.personagensAtivos ?? []), error: undefined };
    }
    if (path === "/mesas/{mesa_id}/participantes") {
      return { data: fixture.participantes ?? [], error: undefined };
    }
    throw new Error(`GET não simulado: ${path}`);
  });
  const POST = vi.fn(fixture.post ?? (async () => ({ data: undefined, error: { detail: "Não simulado." } })));
  const api = { GET, POST } as unknown as ApiClient;
  return { api, GET, POST };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderAuditLog(props: Partial<Parameters<typeof AuditLog>[0]> & { api: ApiClient }, initialEntry = "/mesas/mesa-1?painel=activity") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <AuditLog mesaId="mesa-1" role="narrador" {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AuditLog — 7.4/7.5/7.6 registro de auditoria", () => {
  afterEach(() => cleanup());

  it("exibe os eventos do mais recente ao mais antigo, com detalhes de mudanças, motivo e vínculos navegáveis", async () => {
    const eventos = [
      evento({
        id: 20, resumo: "Lia: correção de 1 campo", ator_id: "mestre", acao: "correcao.aplicada",
        corrige_evento_id: 10, motivo: "Valor digitado errado",
        mudancas: [{ campo: "atributos.valores.Vigor", antes: 9, depois: 2, rotulo: null, completo: true }],
      }),
      evento({
        id: 10, resumo: "Lia: Vigor de 2 para 9", corrigido_por: [20],
        mudancas: [
          { campo: "atributos.valores.Vigor", antes: 2, depois: 9, rotulo: null, completo: true },
          { campo: "personagem.notas", antes: "x".repeat(20), depois: "y".repeat(20), rotulo: "Notas", completo: false },
        ],
      }),
    ];
    const { api } = createApi({ eventos, personagensAtivos: [personagem()] });
    renderAuditLog({ api });

    await screen.findByText("Lia: correção de 1 campo");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0] as HTMLElement).getByText("Lia: correção de 1 campo")).toBeTruthy();
    expect(within(items[1] as HTMLElement).getByText("Lia: Vigor de 2 para 9")).toBeTruthy();

    fireEvent.click(within(items[1] as HTMLElement).getByText("Ver detalhes"));
    expect(within(items[1] as HTMLElement).getByText("2 → 9")).toBeTruthy();
    expect(within(items[1] as HTMLElement).getByText("valor extenso omitido")).toBeTruthy();

    fireEvent.click(within(items[0] as HTMLElement).getByText("Ver detalhes"));
    expect(within(items[0] as HTMLElement).getByText(/Valor digitado errado/)).toBeTruthy();
    const link = within(items[0] as HTMLElement).getByRole("button", { name: "Corrige o evento #10" });
    fireEvent.click(link);
    expect(document.getElementById("evento-auditoria-10")?.className).toContain("audit-event--highlight");
  });

  it("Carregar mais busca a próxima página com antes_de igual ao cursor devolvido", async () => {
    const eventos = Array.from({ length: 32 }, (_, i) => evento({ id: 32 - i, resumo: `Evento ${32 - i}` }));
    const { api, GET } = createApi({ eventos, personagensAtivos: [personagem()] });
    renderAuditLog({ api });

    await screen.findByText("Evento 32");
    expect(screen.queryByText("Evento 1")).toBeNull();
    const carregarMais = await screen.findByRole("button", { name: "Carregar mais" });
    fireEvent.click(carregarMais);

    await screen.findByText("Evento 1");
    expect(GET).toHaveBeenCalledWith(
      "/mesas/{mesa_id}/auditoria",
      expect.objectContaining({ params: expect.objectContaining({ query: expect.objectContaining({ antes_de: 3 }) }) }),
    );
    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull();
  });

  it("combina os filtros de personagem e categoria, refletindo-os na URL e na consulta enviada", async () => {
    const { api, GET } = createApi({
      eventos: [evento({ categoria: "inventario", acao: "item.equipado", resumo: "Escudo equipado" })],
      personagensAtivos: [personagem({ id: "pj-1", nome: "Lia" }), personagem({ id: "pj-2", nome: "Bram" })],
    });
    renderAuditLog({ api });

    await screen.findByText("Escudo equipado");
    fireEvent.change(screen.getByRole("combobox", { name: "Personagem" }), { target: { value: "pj-1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Categoria" }), { target: { value: "inventario" } });

    await waitFor(() =>
      expect(GET).toHaveBeenLastCalledWith(
        "/mesas/{mesa_id}/auditoria",
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({ personagem_id: "pj-1", categoria: "inventario" }),
          }),
        }),
      ),
    );
    expect(screen.getByTestId("location").textContent).toContain("personagem_id=pj-1");
    expect(screen.getByTestId("location").textContent).toContain("categoria=inventario");

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).not.toContain("personagem_id"));
    expect(screen.getByTestId("location").textContent).not.toContain("categoria");
  });

  it("combina os filtros de ator e relevância, refletindo-os na URL e na consulta enviada", async () => {
    const { api, GET } = createApi({
      eventos: [evento({ ator_id: "ana", relevancia: "narrativa", resumo: "Apelido alterado" })],
      personagensAtivos: [personagem()],
      participantes: [{ usuario_id: "ana", papel: "jogador", tem_foto: false }, { usuario_id: "mestre", papel: "narrador", tem_foto: false }],
    });
    renderAuditLog({ api });

    await screen.findByText("Apelido alterado");
    fireEvent.change(await screen.findByRole("combobox", { name: "Ator" }), { target: { value: "ana" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Relevância" }), { target: { value: "narrativa" } });

    await waitFor(() =>
      expect(GET).toHaveBeenLastCalledWith(
        "/mesas/{mesa_id}/auditoria",
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({ ator_id: "ana", relevancia: "narrativa" }),
          }),
        }),
      ),
    );
    expect(screen.getByTestId("location").textContent).toContain("ator_id=ana");
    expect(screen.getByTestId("location").textContent).toContain("relevancia=narrativa");
  });

  it("combina os filtros de sessão e ator, derivando as sessões dos eventos já carregados", async () => {
    const { api, GET } = createApi({
      eventos: [evento({ sessao_id: "s1", ator_id: "ana", resumo: "Evento da sessão 1" })],
      personagensAtivos: [personagem()],
      participantes: [{ usuario_id: "ana", papel: "jogador", tem_foto: false }],
    });
    renderAuditLog({ api });

    await screen.findByText("Evento da sessão 1");
    fireEvent.change(await screen.findByRole("combobox", { name: "Sessão" }), { target: { value: "s1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Ator" }), { target: { value: "ana" } });

    await waitFor(() =>
      expect(GET).toHaveBeenLastCalledWith(
        "/mesas/{mesa_id}/auditoria",
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({ sessao_id: "s1", ator_id: "ana" }),
          }),
        }),
      ),
    );
    expect(screen.getByTestId("location").textContent).toContain("sessao_id=s1");
  });

  it("Narrador corrige um evento com sucesso: POST com motivo e versão, timeline recarregada e vínculo exibido", async () => {
    const events: EventoAuditoriaResumo[] = [
      evento({ id: 1, resumo: "Lia: Vigor de 2 para 9", corrigivel: true }),
    ];
    const { api, POST } = createApi({
      eventos: events,
      personagensAtivos: [personagem({ id: "pj-1", versao: 1 })],
      post: async (_path, options) => {
        const body = (options as { body: { motivo?: string | null; versao_esperada: number } }).body;
        const novo = evento({
          id: 2, resumo: "Lia: correção de 1 campo", ator_id: "mestre", acao: "correcao.aplicada",
          corrige_evento_id: 1, motivo: body.motivo ?? null, corrigivel: false,
        });
        events[0] = { ...events[0]!, corrigido_por: [2] };
        events.unshift(novo);
        return { data: novo, error: undefined };
      },
    });
    renderAuditLog({ api });

    await screen.findByText("Lia: Vigor de 2 para 9");
    fireEvent.click(screen.getByRole("button", { name: "Corrigir" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Motivo (opcional)"), { target: { value: "Valor digitado errado" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Corrigir" }));

    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith(
        "/mesas/{mesa_id}/auditoria/{evento_id}/correcao",
        expect.objectContaining({
          params: { path: { mesa_id: "mesa-1", evento_id: 1 } },
          body: { motivo: "Valor digitado errado", versao_esperada: 1 },
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText("Lia: correção de 1 campo")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Ver detalhes")[1]!);
    expect(screen.getByText("Corrigido pelo evento #2")).toBeTruthy();
  });

  it("erro 409 ao corrigir mostra o detail no diálogo, que permanece aberto, sem alterar a lista", async () => {
    const { api, POST } = createApi({
      eventos: [evento({ id: 1, resumo: "Lia: Vigor de 2 para 9", corrigivel: true })],
      personagensAtivos: [personagem({ id: "pj-1", versao: 1 })],
      post: async () => ({ data: undefined, error: { detail: "O valor mudou depois deste evento; revise antes de corrigir." } }),
    });
    renderAuditLog({ api });

    await screen.findByText("Lia: Vigor de 2 para 9");
    fireEvent.click(screen.getByRole("button", { name: "Corrigir" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Corrigir" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "O valor mudou depois deste evento; revise antes de corrigir.");
    expect(POST).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getAllByText("Lia: Vigor de 2 para 9").length).toBeGreaterThan(0);
  });

  it("não mostra o botão Corrigir quando o evento não é corrigível", async () => {
    const { api } = createApi({
      eventos: [evento({ id: 1, resumo: "Lia: Vigor de 2 para 9", corrigivel: false })],
      personagensAtivos: [personagem({ id: "pj-1" })],
    });
    renderAuditLog({ api });
    await screen.findByText("Lia: Vigor de 2 para 9");
    expect(screen.queryByRole("button", { name: "Corrigir" })).toBeNull();
  });

  it("Jogador vê o registro sem filtros de ator/sessão, sem botão Corrigir, e não inventa nome para personagem desconhecido", async () => {
    const { api } = createApi({
      eventos: [
        evento({ id: 1, resumo: "Sua ficha mudou", personagem_id: "pj-1", corrigivel: false }),
        evento({ id: 2, resumo: "Ficha de outro personagem mudou", personagem_id: "pj-oculto", corrigivel: false }),
      ],
      personagensAtivos: [personagem({ id: "pj-1", nome: "Lia" })],
    });
    renderAuditLog({ api, role: "jogador" });

    await screen.findByText("Sua ficha mudou");
    const timeline = screen.getByRole("list");
    expect(within(timeline).getByText("Lia")).toBeTruthy();
    expect(within(timeline).getAllByText("Personagem").length).toBeGreaterThan(0);
    expect(screen.queryByText("pj-oculto")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Ator" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Sessão" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Personagem" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Categoria" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Relevância" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Corrigir" })).toBeNull();
  });

  it("mostra o estado vazio quando não há eventos com os filtros aplicados", async () => {
    const { api } = createApi({ eventos: [], personagensAtivos: [personagem()] });
    renderAuditLog({ api });
    expect(await screen.findByText("Nenhuma alteração com esses filtros.")).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    const { api } = createApi({
      eventos: [
        evento({ id: 2, resumo: "Lia: correção de 1 campo", corrige_evento_id: 1, motivo: "Ajuste" }),
        evento({ id: 1, resumo: "Lia: Vigor de 2 para 9", corrigivel: true, corrigido_por: [2] }),
      ],
      personagensAtivos: [personagem({ id: "pj-1", versao: 2 })],
      participantes: [{ usuario_id: "ana", papel: "jogador", tem_foto: false }],
    });
    renderAuditLog({ api });
    await screen.findByText("Lia: correção de 1 campo");
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
