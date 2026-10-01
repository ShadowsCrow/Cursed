// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { contarOfertasPendentes } from "../cards/api";
import type { OfertaResumo } from "../cards/types";
import { NarratorShell } from "../shells/NarratorShell";
import { PlayerShell } from "../shells/PlayerShell";
import { CharacterSheetPage } from "./sheet/CharacterSheetPage";
import type { ApiClient } from "./types";

function comQuery(elemento: React.ReactElement, rota = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[rota]}>{elemento}</MemoryRouter></QueryClientProvider>);
}

const oferta = (estado: OfertaResumo["estado"], expirada: boolean, destinatarios: string[]): OfertaResumo => ({
  id: `o-${estado}-${expirada}`, titulo: "T", estado, min_escolhas: 1, max_escolhas: 1, expira_em: null, expirada,
  criado_em: "2026-09-25T12:00:00Z", candidatas: [],
  destinatarios: destinatarios.map((e, i) => ({ personagem_id: `p${i}`, estado: e as "pendente", escolhas: [], respondido_em: null })),
});

function apiCom(rotas: Record<string, unknown>) {
  const GET = vi.fn(async (caminho: string) => {
    if (caminho in rotas) return { data: rotas[caminho] };
    return { data: [] };
  });
  return { GET } as unknown as ApiClient;
}

describe("Contadores de pendências na navegação", () => {
  afterEach(() => cleanup());

  it("conta só respostas pendentes de ofertas abertas e válidas", () => {
    expect(contarOfertasPendentes([
      oferta("aberta", false, ["pendente", "respondida", "pendente"]),
      oferta("aberta", true, ["pendente"]),
      oferta("cancelada", false, ["pendente"]),
    ])).toBe(2);
    expect(contarOfertasPendentes(undefined)).toBe(0);
  });

  it("jogador vê o contador de ofertas em Biblioteca, também para leitor de tela", async () => {
    const api = apiCom({ "/mesas/{mesa_id}/ofertas": [oferta("aberta", false, ["pendente"])] });
    comQuery(<PlayerShell mesa={{ id: "m", nome: "Mesa", papel: "jogador", sistema: "cursed" }} view="character" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="ana" onOpenCharacter={vi.fn()} />);
    const nav = screen.getByRole("navigation", { name: "Navegação da mesa" });
    const biblioteca = await within(nav).findByRole("button", { name: /Biblioteca, 1 pendente/ });
    expect(within(biblioteca).getByText("1")).toBeTruthy();
    expect(within(nav).getByRole("button", { name: "Minha ficha" })).toBeTruthy();
  });

  it("Narrador vê o contador de aprovações em Visão geral", async () => {
    const api = apiCom({ "/mesas/{mesa_id}/solicitacoes": [{ id: "p1" }, { id: "p2" }] });
    comQuery(<NarratorShell mesa={{ id: "m", nome: "Mesa", papel: "narrador", sistema: "cursed" }} view="cards" onNavigate={vi.fn()} onSignOut={vi.fn()} api={api} userId="mestre" onOpenCharacter={vi.fn()} />);
    const nav = screen.getByRole("navigation", { name: "Navegação móvel da mesa" });
    expect(await within(nav).findByRole("button", { name: /Visão geral, 2 pendente/ })).toBeTruthy();
  });
});

describe("Cartas numa aba só", () => {
  afterEach(() => cleanup());

  it("link antigo abre a aba unificada, com o registro legado rotulado", async () => {
    const api = apiCom({
      "/mesas/{mesa_id}/personagens/{personagem_id}/ficha": { mesa_id: "m", personagem_id: "p", versao: 0,
        ficha: { personagem: { nome: "Lia", habilidades: [{ nome: "Rajada de Energia", tipo: "Ativa" }] } } },
      "/mesas/{mesa_id}/personagens/{personagem_id}/permissoes": { papel: "jogador", editar: true, excluir: false,
        transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [] },
    });
    comQuery(<CharacterSheetPage api={api} mesaId="m" personagemId="p" userId="ana" onBack={vi.fn()} />, "/?secao=habilidades");
    const aba = await screen.findByRole("tab", { name: "Cartas" });
    expect(aba.getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("tab", { name: "Habilidades" })).toBeNull();
    const legado = await screen.findByRole("region", { name: "Habilidades registradas na ficha antiga" });
    expect(within(legado).getByText("Rajada de Energia")).toBeTruthy();
    expect(within(legado).getByText(/Não fazem parte do sistema de cartas/)).toBeTruthy();
  });
});
