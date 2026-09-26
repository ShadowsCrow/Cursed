// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PendingRequests } from "./PendingRequests";
import { ActiveStateStrip } from "./sheet/ActiveStateStrip";
import { CharacterSheetPage } from "./sheet/CharacterSheetPage";
import type { TrilhaDesgaste } from "./sheet/sheetApi";
import type { ApiClient, EfeitoResumo } from "./types";

function comQuery(elemento: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter>{elemento}</MemoryRouter></QueryClientProvider>);
}

const faixa = (id: string, nome: string, efeito: string, min: number, max: number) => ({ id, nome, efeito, min, max });
const DESGASTE: TrilhaDesgaste[] = [
  { recurso: "exaustao", atual: 9, maximo: 15, registrado: true,
    faixa: faixa("exausto", "Exausto", "−2 em testes físicos e −1 em Defesas.", 9, 11),
    proxima_faixa: faixa("no_limite", "No Limite", "…", 12, 14), pontos_ate_proxima: 3 },
  { recurso: "estresse", atual: 0, maximo: 10, registrado: false,
    faixa: faixa("controlado", "Controlado", "Sem penalidade.", 0, 4),
    proxima_faixa: faixa("pressionado", "Pressionado", "…", 5, 6), pontos_ate_proxima: 5 },
];
const EFEITOS: EfeitoResumo[] = [
  { id: "e1", nome: "Envenenado", descricao: "−1 em Furtividade.", estado: "ativo", modificadores: [], fontes: [] },
  { id: "e2", nome: "Runas", descricao: "+1.", estado: "suspenso", modificadores: [], fontes: [] },
];

describe("Faixa de estado ativo", () => {
  afterEach(() => cleanup());

  it("mostra trilhas com faixa em texto, penalidade e efeitos ativos", async () => {
    render(<ActiveStateStrip desgaste={DESGASTE} efeitos={EFEITOS} />);
    const exaustao = screen.getByRole("button", { name: "Exaustão: 9 de 15, Exausto" });
    expect(exaustao.className).toContain("wear-chip--penalty");
    expect(screen.getByRole("button", { name: "Estresse: 0 de 10, Controlado" }).className).not.toContain("penalty");
    fireEvent.click(exaustao);
    expect(await screen.findByText("−2 em testes físicos e −1 em Defesas.")).toBeTruthy();
    expect(screen.getByText(/Próxima faixa/).textContent).toContain("No Limite");
    expect(screen.getByRole("button", { name: "Envenenado" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Runas/ })).toBeNull();
    expect(screen.getByText("1 suspenso(s)")).toBeTruthy();
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});

function apiDaFila(decisao: { data?: unknown; error?: unknown } = { data: {} }) {
  const GET = vi.fn(async (caminho: string) => {
    if (caminho === "/mesas/{mesa_id}/solicitacoes") return { data: [{
      id: "p1", mesa_id: "mesa", personagem_id: "lia", solicitante_id: "ana", versao_base: 2, estado: "pendente",
      campos_alterados: ["personagem.nivel"], ficha_proposta: { personagem: { nome: "Lia", nivel: 5 } },
    }] };
    if (caminho === "/mesas/{mesa_id}/personagens") return { data: [{ id: "lia", nome: "Lia" }] };
    if (caminho === "/mesas/{mesa_id}/personagens/{personagem_id}/ficha") return { data: { versao: 3, ficha: { personagem: { nome: "Lia", nivel: 4 } } } };
    throw new Error(`GET não simulado: ${caminho}`);
  });
  const POST = vi.fn(async () => ({ ...decisao, response: { status: decisao.error ? 409 : 200 } }));
  return { api: { GET, POST } as unknown as ApiClient, POST };
}

describe("Fila de aprovação do Narrador", () => {
  afterEach(() => cleanup());

  it("mostra atual e proposto, aprova e rejeita somente após confirmar", async () => {
    const { api, POST } = apiDaFila();
    comQuery(<PendingRequests api={api} mesaId="mesa" />);
    const linha = await screen.findByRole("row", { name: /personagem\.nivel/ });
    await waitFor(() => expect(within(linha).getByText("4")).toBeTruthy());
    expect(within(linha).getByText("5")).toBeTruthy();
    expect(screen.getByText(/A ficha mudou desde o pedido/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Rejeitar" }));
    expect(POST).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Rejeitar" }).at(-1) as HTMLElement);
    await waitFor(() => expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/solicitacoes/{pedido_id}/decisao",
      { params: { path: { mesa_id: "mesa", pedido_id: "p1" } }, body: { aprovar: false } }));
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await waitFor(() => expect(POST).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ body: { aprovar: true } })));
  });

  it("exibe o conflito devolvido pelo servidor", async () => {
    const { api } = apiDaFila({ error: { detail: "Ficha alterada desde a solicitação." } });
    comQuery(<PendingRequests api={api} mesaId="mesa" />);
    fireEvent.click(await screen.findByRole("button", { name: "Aprovar" }));
    expect(await screen.findByText("Ficha alterada desde a solicitação.")).toBeTruthy();
  });
});

describe("Abas da ficha", () => {
  afterEach(() => cleanup());

  it("seguem o padrão de abas: setas, Home/End, foco e painéis ligados", async () => {
    const GET = vi.fn(async (caminho: string) => {
      if (caminho.endsWith("/ficha")) return { data: { mesa_id: "m", personagem_id: "p", versao: 0, ficha: { personagem: { nome: "Lia" } } } };
      if (caminho.endsWith("/permissoes")) return { data: { papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [] } };
      if (caminho.endsWith("/desgaste") || caminho.endsWith("/efeitos") || caminho.endsWith("/inventario") || caminho.endsWith("/valores-derivados") || caminho.endsWith("/cartas")) return { data: [] };
      throw new Error(`GET não simulado: ${caminho}`);
    });
    comQuery(<CharacterSheetPage api={{ GET } as unknown as ApiClient} mesaId="m" personagemId="p" userId="ana" onBack={vi.fn()} />);
    const primeira = await screen.findByRole("tab", { name: "Informações básicas" });
    expect(primeira.getAttribute("tabindex")).toBe("0");
    expect(primeira.getAttribute("aria-controls")).toBe("painel-informacoes");
    expect(screen.getByRole("tabpanel", { name: "Informações básicas" })).toBeTruthy();

    primeira.focus();
    fireEvent.keyDown(primeira, { key: "ArrowRight" });
    const segunda = screen.getByRole("tab", { name: "Personalidade" });
    await waitFor(() => expect(segunda.getAttribute("aria-selected")).toBe("true"));
    expect(document.activeElement).toBe(segunda);
    expect(primeira.getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(segunda, { key: "End" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Cartas" }).getAttribute("aria-selected")).toBe("true"));
    fireEvent.keyDown(screen.getByRole("tab", { name: "Cartas" }), { key: "ArrowRight" });
    await waitFor(() => expect(primeira.getAttribute("aria-selected")).toBe("true"));
  });
});
