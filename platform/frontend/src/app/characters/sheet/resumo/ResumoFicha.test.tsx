// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient, FichaContrato, PermissoesFicha, ValorDerivadoResumo } from "../../types";
import { ResumoFicha } from "./ResumoFicha";

/** Ficha antiga do Streamlit, sem História nem ilustração (fixtures/legacy; caminho relativo a platform/frontend, onde os testes rodam). */
const LEGADA = JSON.parse(readFileSync("../../fixtures/legacy/ficha_complexa.json", "utf-8")) as FichaContrato;

const EDITAR: PermissoesFicha = { papel: "jogador", editar: true, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [] };

function montar(ficha: FichaContrato, { permissoes = EDITAR, valores = [] as ValorDerivadoResumo[] } = {}) {
  const GET = vi.fn(async (_caminho: string, opcoes: { params: { query: { caminho: string } } }) =>
    ({ data: { tipo: "image/webp", base64: btoa(opcoes.params.query.caminho) }, error: undefined }));
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cliente}>
      <ResumoFicha api={{ GET } as unknown as ApiClient} mesaId="mesa-1" personagemId="pj-1" ficha={ficha} versao={3}
        valores={valores} inventario={[]} cartas={[]} permissoes={permissoes} onAbrir={vi.fn()} onIlustracaoAlterada={vi.fn()} />
    </QueryClientProvider>,
  );
  return GET;
}

describe("ResumoFicha com dados da ficha", () => {
  afterEach(() => cleanup());

  it("ficha antiga sem História nem ilustração mostra os estados vazios, sem inventar valores", () => {
    montar(LEGADA);
    expect(screen.getByRole("heading", { level: 1, name: "Nara Exemplo" })).toBeTruthy();
    const identidade = screen.getByRole("region", { name: "Nara Exemplo" });
    expect(within(identidade).getByText("Feiticeiro")).toBeTruthy();
    expect(within(identidade).getByText("Elfo")).toBeTruthy();
    expect(within(identidade).getByLabelText("Não informado")).toBeTruthy(); // nível ausente
    expect(screen.getByRole("img", { name: "Nara Exemplo, ainda sem imagem" })).toBeTruthy();
    expect(screen.getByText("A história de Nara Exemplo ainda não foi escrita.")).toBeTruthy();
    expect(screen.getByText("Nada equipado no momento.")).toBeTruthy();
    expect(screen.getByText("Nenhuma habilidade ou magia aprendida ainda.")).toBeTruthy();
    expect(screen.getByText("Nenhuma perícia tem valor acima de 0.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enviar ilustração" })).toBeTruthy();
  });

  it("com ilustração, ela ocupa o centro e a ação vira trocar; o retrato não é usado", async () => {
    const ficha = { ...LEGADA, personagem: { ...LEGADA.personagem as object, imagem_ativo: "r.png", ilustracao_ativo: "i.png" } } as FichaContrato;
    const GET = montar(ficha);
    const imagem = await screen.findByRole("img", { name: "Ilustração de Nara Exemplo" });
    await vi.waitFor(() => expect(imagem.getAttribute("src")).toBe(`data:image/webp;base64,${btoa("i.png")}`));
    expect(screen.getByRole("button", { name: "Trocar ilustração" })).toBeTruthy();
    expect(GET.mock.calls.some(([, opcoes]) => opcoes.params.query.caminho === "i.png")).toBe(true);
  });

  it("acompanha a ficha: dano recebido e carta aprendida aparecem sem recarregar", () => {
    const GET = vi.fn();
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const valores = [{ chave: "recurso:pv_maximo", rotulo: "PV máximo", grupo: "recurso", total: 22, fontes: [] }] as unknown as ValorDerivadoResumo[];
    const carta = {
      id: "c1", personagem_id: "pj-1", tipo: "magia", estado: "aprendida", origem: "concessao", excecao_aprendizado: false,
      adquirida_em: "2026-01-01T00:00:00Z", carta: { versao_id: "v", definicao_id: "d", numero: 1, tipo: "magia", conteudo: { titulo: "Projétil Arcano" } },
    };
    const tela = (atual: number, cartas: unknown[]) => (
      <QueryClientProvider client={cliente}>
        <ResumoFicha api={{ GET } as unknown as ApiClient} mesaId="mesa-1" personagemId="pj-1" versao={3}
          ficha={{ ...LEGADA, recursos: { pv: { atual } } } as FichaContrato} valores={valores} inventario={[]}
          cartas={cartas as never} permissoes={EDITAR} onAbrir={vi.fn()} onIlustracaoAlterada={vi.fn()} />
      </QueryClientProvider>
    );
    const { rerender } = render(tela(20, []));
    expect(screen.getByText("20 de 22")).toBeTruthy();
    rerender(tela(14, [carta]));
    expect(screen.getByText("14 de 22")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Habilidades" })).getByText("Projétil Arcano")).toBeTruthy();
  });

  it("sem permissão de editar, nem ação de ilustração nem convite para a História", () => {
    montar(LEGADA, { permissoes: { ...EDITAR, editar: false } });
    expect(screen.queryByRole("button", { name: /ilustração/ })).toBeNull();
    expect(screen.getByText("História não escrita.")).toBeTruthy();
  });
});
