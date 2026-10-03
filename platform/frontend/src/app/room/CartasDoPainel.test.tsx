// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../characters/types";
import { CartasDoPainel } from "./CartasDoPainel";

// No jsdom as imagens nunca carregam; a pintura da categoria é dada como pronta só quando o teste pede.
const pinturaPronta = vi.hoisted(() => ({ valor: false }));
vi.mock("../characters/sheet/cartas/pinturasDasCartas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../characters/sheet/cartas/pinturasDasCartas")>()),
  usePintura: () => (pinturaPronta.valor ? "pronta" : "carregando"),
}));

const versao = (id: string, titulo: string, tipo = "magia") => ({
  id, definicao_id: `d-${id}`, numero: 1, tipo, conteudo: { titulo }, publicado_em: "2026-10-01", publicado_por: "narrador",
});
const definicao = (id: string, titulo: string, extra: Record<string, unknown> = {}, tipo = "magia") => ({
  id: `d-${id}`, tipo, versao: 1, arquivada: false, publicada: versao(id, titulo, tipo), ...extra,
});
const personagem = (id: string, nome: string, dono: string | null) => ({
  id, nome, mesa_id: "mesa", versao: 1, proprietario_id: dono, tipo: "personagem", visibilidade: "mesa", retrato_objeto: null,
});

function renderCartas(narrator: boolean, respostas: Record<string, unknown>) {
  const GET = vi.fn().mockImplementation(async (caminho: string, opcoes?: { params?: { path?: { personagem_id?: string } } }) => {
    const chave = caminho === "/mesas/{mesa_id}/personagens/{personagem_id}/cartas"
      ? `${caminho}#${opcoes?.params?.path?.personagem_id}` : caminho;
    return { data: respostas[chave] ?? [], error: undefined };
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}>
    <CartasDoPainel api={{ GET } as unknown as ApiClient} mesaId="mesa" userId="ana" narrator={narrator} />
  </QueryClientProvider>);
  return GET;
}

const catalogo = {
  "/mesas/{mesa_id}/cartas": [
    definicao("v1", "Bola de fogo"), definicao("v2", "Escudo arcano"),
    definicao("v3", "Rascunho", { publicada: null }), definicao("v4", "Velha", { arquivada: true }),
  ],
  "/mesas/{mesa_id}/personagens": [personagem("p1", "Lion", "ana")],
};

describe("aba Cartas do painel da Sala", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); pinturaPronta.valor = false; });

  it("o Narrador vê só as publicadas e busca pelo título, sem acento nem caixa", async () => {
    renderCartas(true, catalogo);
    expect(await screen.findByText("Bola de fogo")).toBeTruthy();
    expect(screen.getByText("Escudo arcano")).toBeTruthy();
    expect(screen.queryByText("Rascunho")).toBeNull();
    expect(screen.queryByText("Velha")).toBeNull();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar cartas" }), { target: { value: "ESCUDO ARCANO" } });
    expect(screen.queryByText("Bola de fogo")).toBeNull();
    expect(screen.getByText("Escudo arcano")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar cartas" }), { target: { value: "trovão" } });
    expect(screen.getByText("Nenhuma carta com esse filtro.")).toBeTruthy();
  });

  it("enviar, ofertar e apresentar abrem os diálogos da Biblioteca com a carta escolhida", async () => {
    renderCartas(true, catalogo);
    fireEvent.click(await screen.findByRole("button", { name: "Enviar “Bola de fogo”" }));
    expect(screen.getByRole("dialog", { name: "Enviar “Bola de fogo”" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    fireEvent.click(screen.getByRole("button", { name: "Ofertar “Escudo arcano”" }));
    const oferta = screen.getByRole("dialog", { name: "Nova oferta de cartas" });
    expect((within(oferta).getByRole("checkbox", { name: /Escudo arcano/ }) as HTMLInputElement).checked).toBe(true);
    expect((within(oferta).getByRole("checkbox", { name: /Bola de fogo/ }) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(within(oferta).getByRole("button", { name: "Cancelar" }));

    fireEvent.click(screen.getByRole("button", { name: "Apresentar “Bola de fogo”" }));
    expect(screen.getByRole("dialog", { name: "Apresentar “Bola de fogo”" })).toBeTruthy();
  });

  it("o jogador vê as cartas dos próprios personagens, sem catálogo nem ações do Narrador", async () => {
    const GET = renderCartas(false, {
      "/mesas/{mesa_id}/personagens": [personagem("p1", "Lion", "ana"), personagem("p2", "Brom", "beto")],
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas#p1": [
        { id: "c1", personagem_id: "p1", tipo: "magia", estado: "aprendida", origem: "concessao", adquirida_em: "", excecao_aprendizado: false,
          carta: { versao_id: "v1", definicao_id: "d1", numero: 1, tipo: "magia", conteudo: { titulo: "Bola de fogo" } } },
        { id: "c2", personagem_id: "p1", tipo: "item", estado: "removida", origem: "concessao", adquirida_em: "", excecao_aprendizado: false,
          carta: { versao_id: "v9", definicao_id: "d9", numero: 1, tipo: "item", conteudo: { titulo: "Perdida" } } },
      ],
    });
    const lion = await screen.findByRole("region", { name: "Cartas de Lion" });
    expect(await within(lion).findByText("Bola de fogo")).toBeTruthy();
    expect(within(lion).getByText("Aprendida")).toBeTruthy();
    expect(within(lion).queryByText("Perdida")).toBeNull();
    expect(screen.queryByRole("region", { name: "Cartas de Brom" })).toBeNull();
    expect(screen.queryByRole("searchbox", { name: "Buscar cartas" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Enviar/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "Cartas oferecidas a você" })).toBeTruthy();
    expect(GET).not.toHaveBeenCalledWith("/mesas/{mesa_id}/cartas", expect.anything());
  });

  it("o filtro por tipo mostra só os tipos presentes, com contagem, e se soma à busca", async () => {
    renderCartas(true, {
      ...catalogo,
      "/mesas/{mesa_id}/cartas": [
        definicao("v1", "Bola de fogo"), definicao("v2", "Escudo arcano"),
        definicao("v5", "Espada longa", {}, "item"), definicao("v6", "Golpe certeiro", {}, "habilidade"),
      ],
    });
    const filtro = await screen.findByRole("group", { name: "Filtrar por tipo" });
    expect(within(filtro).getAllByRole("button").map((b) => b.textContent)).toEqual(["Todas 4", "Habilidades 1", "Magias 2", "Itens 1"]);
    expect(within(filtro).getByRole("button", { name: /Todas/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(filtro).getByRole("button", { name: /Magias/ }));
    expect(within(filtro).getByRole("button", { name: /Magias/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Bola de fogo")).toBeTruthy();
    expect(screen.queryByText("Espada longa")).toBeNull();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar cartas" }), { target: { value: "escudo" } });
    expect(screen.queryByText("Bola de fogo")).toBeNull();
    expect(screen.getByText("Escudo arcano")).toBeTruthy();
  });

  it("a miniatura usa a imagem própria quando há e a pintura da categoria quando não há", async () => {
    pinturaPronta.valor = true;
    const comImagem = { ...definicao("v1", "Bola de fogo"), publicada: { ...versao("v1", "Bola de fogo"), conteudo: { titulo: "Bola de fogo", ativos: ["mesa/cartas/bola.webp"] } } };
    renderCartas(true, {
      ...catalogo,
      "/mesas/{mesa_id}/cartas": [comImagem, definicao("v2", "Escudo arcano")],
      "/mesas/{mesa_id}/ativos": { tipo: "image/webp", base64: "QUJD" },
    });
    const bola = (await screen.findByText("Bola de fogo")).closest("li")!;
    await vi.waitFor(() => expect(bola.querySelector(".cartas-painel__miniatura")?.getAttribute("data-arte")).toBe("propria"));
    expect(bola.querySelector("img")?.getAttribute("src")).toBe("data:image/webp;base64,QUJD");
    const escudo = screen.getByText("Escudo arcano").closest("li")!;
    expect(escudo.querySelector(".cartas-painel__miniatura")?.getAttribute("data-arte")).toBe("categoria");
    expect(escudo.querySelector("img")?.getAttribute("src")).toContain("cartas-medalhao-magias");
  });

  it("sem imagem própria nem pintura, a miniatura mostra o ícone da categoria", async () => {
    renderCartas(true, catalogo);
    const bola = (await screen.findByText("Bola de fogo")).closest("li")!;
    expect(bola.querySelector(".cartas-painel__miniatura")?.getAttribute("data-arte")).toBe("reserva");
    expect(bola.querySelector(".cartas-painel__miniatura .icone-categoria")).toBeTruthy();
  });

  it("o jogador filtra as cartas dos próprios personagens por tipo", async () => {
    const carta = (id: string, tipo: string, titulo: string) => ({
      id, personagem_id: "p1", tipo, estado: "aprendida", origem: "concessao", adquirida_em: "", excecao_aprendizado: false,
      carta: { versao_id: `v-${id}`, definicao_id: `d-${id}`, numero: 1, tipo, conteudo: { titulo } },
    });
    renderCartas(false, {
      "/mesas/{mesa_id}/personagens": [personagem("p1", "Lion", "ana")],
      "/mesas/{mesa_id}/personagens/{personagem_id}/cartas#p1": [carta("c1", "magia", "Bola de fogo"), carta("c2", "item", "Espada longa"),
        { ...carta("c3", "item", "Corpo Médio"), carta: { ...carta("c3", "item", "Corpo Médio").carta, conteudo: { titulo: "Corpo Médio", tags: ["corpo", "padrão"] } } }],
    });
    const filtro = await screen.findByRole("group", { name: "Filtrar por tipo" });
    // Também para o jogador, "Todas" não traz os corpos.
    expect(within(filtro).getAllByRole("button").map((b) => b.textContent)).toEqual(["Todas 2", "Magias 1", "Itens 1", "Corpos 1"]);
    expect(await screen.findByText("Bola de fogo")).toBeTruthy();
    expect(screen.queryByText("Corpo Médio")).toBeNull();
    fireEvent.click(within(filtro).getByRole("button", { name: /Itens/ }));
    const lion = screen.getByRole("region", { name: "Cartas de Lion" });
    expect(within(lion).getByText("Espada longa")).toBeTruthy();
    expect(within(lion).queryByText("Bola de fogo")).toBeNull();
  });

  it("os corpos do sistema têm filtro próprio, separado de Itens, e figura humanoide em vez da pintura de Criaturas", async () => {
    const corpo = (id: string, titulo: string) => ({
      ...definicao(id, titulo, {}, "item"),
      publicada: { ...versao(id, titulo, "item"), conteudo: { titulo, item_tipo: "outro", tags: ["corpo", "padrão"], formato: { subtipo: "outro", largura: 4, altura: 5 } } },
    });
    renderCartas(true, {
      ...catalogo,
      "/mesas/{mesa_id}/cartas": [corpo("c1", "Corpo Médio"), corpo("c2", "Corpo Médio (com ajuda)"), definicao("v5", "Espada longa", {}, "item")],
    });
    const filtro = await screen.findByRole("group", { name: "Filtrar por tipo" });
    // "Todas" deixa os corpos de fora, na contagem e na lista; eles aparecem só com "Corpos".
    expect(within(filtro).getAllByRole("button").map((b) => b.textContent)).toEqual(["Todas 1", "Itens 1", "Corpos 2"]);
    expect(screen.getByText("Espada longa")).toBeTruthy();
    expect(screen.queryByText("Corpo Médio")).toBeNull();
    fireEvent.click(within(filtro).getByRole("button", { name: /Corpos/ }));
    expect(screen.queryByText("Espada longa")).toBeNull();
    const medio = screen.getByText("Corpo Médio").closest("li")!;
    // Sem pintura própria de corpos, a reserva é a figura humanoide; nunca a pintura do lobo de Criaturas.
    expect(medio.querySelector("img")).toBeNull();
    expect(medio.querySelector(".cartas-painel__miniatura .icone-categoria")).toBeTruthy();
    expect(medio.querySelector(".cartas-painel__tipo")?.textContent).toBe("Corpo");
  });

  it("se houver pintura de corpos, ela é usada, e nunca a de Criaturas", async () => {
    pinturaPronta.valor = true;
    renderCartas(true, {
      ...catalogo,
      "/mesas/{mesa_id}/cartas": [{
        ...definicao("c1", "Corpo Grande", {}, "item"),
        publicada: { ...versao("c1", "Corpo Grande", "item"), conteudo: { titulo: "Corpo Grande", tags: ["corpo", "padrão"], item_tipo: "outro" } },
      }],
    });
    fireEvent.click(await screen.findByRole("button", { name: /Corpos/ }));
    const grande = (await screen.findByText("Corpo Grande")).closest("li")!;
    expect(grande.querySelector("img")?.getAttribute("src")).toContain("cartas-medalhao-corpos");
  });
});
