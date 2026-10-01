// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { razaoContraste } from "../../../design/contraste";
import { CATALOGO_ITENS } from "../../inventory/catalogoItensTeste";
import type { ApiClient, GradeInventario, ItemInventarioResumo, PermissoesFicha } from "../types";
import { InventoryGridPanel } from "./InventoryGridPanel";
import { ARTES, esquecerPinturas } from "./pinturasDaBolsa";

/* Aba Inventário da ficha (reformular-visual-da-ficha, tarefas 7.1 e 7.4 a 7.7 e 7.10). */

const item = (extra: Partial<ItemInventarioResumo>): ItemInventarioResumo => ({
  id: "x", tipo: "outro", nome: "Item", quantidade: 1, equipado: false, cargas_atuais: null, cargas_maximas: null,
  dados: {}, efeitos: [], girado: false, raridade: "comum", categoria: "diversos", ...extra,
});

const POCAO = item({
  id: "pocao", nome: "Poção de Vida Menor", subtipo: "outro", largura: 1, altura: 1, coluna: 0, linha: 0, quantidade: 3, pilha_max: 5,
  categoria: "consumiveis", descricao: "Uma poção de cor rubra que restaura parte da vitalidade.",
});
const ADAGA = item({ id: "adaga", nome: "Adaga", tipo: "arma", subtipo: "uma_mao", largura: 1, altura: 2, coluna: 1, linha: 0, categoria: "armas" });
const ALJAVA = item({ id: "aljava", nome: "Aljava", subtipo: "aljava", largura: 1, altura: 2, coluna: 2, linha: 0, categoria: "acessorios" });
const MOEDAS = item({ id: "moedas", nome: "Moedas", subtipo: "moedas", largura: 1, altura: 1, coluna: 3, linha: 0, categoria: "moedas",
  dados: { ouro: 24, prata: 17, cobre: 3 } });

function grade(itens: ItemInventarioResumo[], extra: Partial<GradeInventario> = {}): GradeInventario {
  return {
    versao: 3, forca: 3, tamanho: "medio", tamanho_origem: "raca", colunas_verdes: 5, linhas_verdes: 5, colunas: 5, linhas: 6,
    ampliacoes: [], sobrecarga: false, itens_em_sobrecarga: [], maos_ocupadas: 0, celulas_ocupadas: 6, celulas_verdes: 25, itens, ...extra,
  };
}

function montar({ itens = [POCAO, ADAGA, ALJAVA, MOEDAS], editar = true }: { itens?: ItemInventarioResumo[]; editar?: boolean } = {}) {
  const GET = vi.fn(async (caminho: string) => {
    if (caminho.endsWith("/inventario/grade")) return { data: grade(itens), error: undefined };
    if (caminho.endsWith("/politicas")) return { data: { moedas_por_pilha: 100 }, error: undefined };
    if (caminho.endsWith("/ofertas-item")) return { data: [], error: undefined };
    if (caminho.endsWith("/catalogos/itens")) return { data: CATALOGO_ITENS, error: undefined };
    throw new Error(`GET não simulado: ${caminho}`);
  });
  const api = { GET, PUT: vi.fn(), POST: vi.fn() } as unknown as ApiClient;
  const permissoes: PermissoesFicha = {
    papel: "jogador", editar, excluir: false, transferir: false, campos_bloqueados: [], campos_exigem_aprovacao: [],
  };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InventoryGridPanel api={api} mesaId="mesa" personagemId="pj" permissoes={permissoes} versao={3} online
        onVersaoConfirmada={vi.fn()} ferramentas={<button type="button">Importar código</button>} />
    </QueryClientProvider>,
  );
}

function selecionar(nome: RegExp) {
  const botao = screen.getByRole("button", { name: nome });
  fireEvent.pointerDown(botao, { button: 0, clientX: 0, clientY: 0 });
  fireEvent.pointerUp(botao);
}

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe("Aba Inventário da ficha", () => {
  it("moldura da seção com título, busca e as ferramentas da seção", async () => {
    montar();
    expect(await screen.findByRole("heading", { name: "Inventário" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Buscar item" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Importar código" })).toBeTruthy();
  });

  it("indicadores: capacidade, mãos e estado da carga, sem nenhum peso", async () => {
    montar();
    const carga = await screen.findByRole("group", { name: "Carga" });
    expect(carga.textContent).toMatch(/Capacidade.*de 25 células/);
    expect(carga.textContent).toMatch(/Mãos ocupadas0 de 2/);
    expect(carga.textContent).toMatch(/Estado da cargaNormal/);
    expect(document.body.textContent ?? "").not.toMatch(/\bkg\b|peso/i);
  });

  it("painel da poção: etiquetas, quantidade, descrição e ações sem usar", async () => {
    montar();
    await screen.findByRole("button", { name: /^Poção de Vida Menor/ });
    selecionar(/^Poção de Vida Menor/);
    const painel = await screen.findByRole("group", { name: "Ações para Poção de Vida Menor" });
    const detalhes = painel.parentElement as HTMLElement;
    expect(within(detalhes).getByRole("heading", { name: "Poção de Vida Menor" })).toBeTruthy();
    expect(within(detalhes).getByText("Comum")).toBeTruthy();
    expect(within(detalhes).getByText("Consumíveis")).toBeTruthy();
    expect(detalhes.textContent).toMatch(/Quantidade3 de 5 por célula/);
    expect(detalhes.textContent).toMatch(/restaura parte da vitalidade/);
    const acoes = within(painel).getAllByRole("button").map((b) => b.textContent);
    expect(acoes).toEqual(["Equipar", "Girar", "Largar no chão", "Remover da grade", "Oferecer…"]);
    expect(within(painel).queryByRole("button", { name: /Usar|Mover/ })).toBeNull();
  });

  it("sem item selecionado, o painel explica como escolher", async () => {
    montar();
    expect(await screen.findByText(/Toque num item da bolsa/)).toBeTruthy();
  });

  it("modo leitura mostra o painel sem ações", async () => {
    montar({ editar: false });
    await screen.findByRole("button", { name: /^Adaga/ });
    selecionar(/^Adaga/);
    expect(await screen.findByRole("heading", { name: "Adaga" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Ações para Adaga" })).toBeNull();
  });

  it("categoria Armas destaca a adaga e esmaece o resto no mesmo lugar, e anuncia a contagem", async () => {
    montar();
    await screen.findByRole("button", { name: /^Adaga/ });
    const lista = screen.getAllByRole("navigation", { name: "Categorias" })[0] as HTMLElement;
    fireEvent.click(within(lista).getByRole("button", { name: /Armas/ }));
    const adaga = screen.getByRole("button", { name: /^Adaga/ });
    const aljava = screen.getByRole("button", { name: /^Aljava/ });
    expect(adaga.className).toMatch(/destacado/);
    expect(aljava.className).toMatch(/esmaecido/);
    expect(aljava.getAttribute("aria-label")).toMatch(/coluna 3, linha 1/);
    await waitFor(() => expect(screen.getByText("1 item em Armas")).toBeTruthy());
  });

  it("busca sem acento destaca as poções", async () => {
    montar();
    await screen.findByRole("button", { name: /^Adaga/ });
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar item" }), { target: { value: "poc" } });
    expect(screen.getByRole("button", { name: /^Poção/ }).className).toMatch(/destacado/);
    expect(screen.getByRole("button", { name: /^Adaga/ }).className).toMatch(/esmaecido/);
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar item" }), { target: { value: "" } });
    expect(screen.getByRole("button", { name: /^Adaga/ }).className).not.toMatch(/esmaecido/);
  });

  it("barra de moedas com ouro, prata e cobre; o gerenciador abre num diálogo", async () => {
    montar();
    const barra = (await screen.findByRole("heading", { name: "Moedas" })).parentElement as HTMLElement;
    const totais = Object.fromEntries(within(barra).getAllByRole("definition").map((dd) => [
      dd.previousElementSibling?.textContent, dd.textContent,
    ]));
    expect(totais).toEqual({ Ouro: "24", Prata: "17", Cobre: "3" });
    expect(barra.textContent).not.toMatch(/Platina/);
    fireEvent.click(within(barra).getByRole("button", { name: "Gerenciar moedas" }));
    expect(await screen.findByRole("dialog", { name: "Gerenciar moedas" })).toBeTruthy();
  });

  it("cores de raridade legíveis sobre a etiqueta (4,5:1)", () => {
    const fundo = "#f9eed6";
    const misturar = (cor: string) => {
      const canal = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
      const valores = [0, 1, 2].map((i) => Math.round(canal(cor, i) * .12 + canal(fundo, i) * .88));
      return `#${valores.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    };
    for (const raridade of CATALOGO_ITENS.raridades) {
      expect(razaoContraste(raridade.cor, misturar(raridade.cor)), raridade.rotulo).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("Laterais pintadas da bolsa (8.3)", () => {
  afterEach(() => { esquecerPinturas(); vi.unstubAllGlobals(); });

  it("enquanto as pinturas carregam, a bolsa já reserva o espaço delas, sem desenhar nada", async () => {
    montar();
    await screen.findByRole("group", { name: "Carga" });
    const bolsa = document.querySelector(".bolsa")!;
    expect(bolsa.classList.contains("bolsa--lateral")).toBe(true);
    expect(bolsa.classList.contains("bolsa--tampa")).toBe(true);
    expect(bolsa.querySelector(".bolsa__lado, .bolsa__alca, .bolsa__tampa, .bolsa__base")).toBeNull();
  });

  it("sem as pinturas, a bolsa fica com a alça, a fivela e o pingente em CSS", async () => {
    class ImagemQueFalha {
      onerror: (() => void) | null = null;
      set src(_url: string) { queueMicrotask(() => this.onerror?.()); }
    }
    vi.stubGlobal("Image", ImagemQueFalha);
    montar();
    await screen.findByRole("group", { name: "Carga" });
    await waitFor(() => expect(document.querySelector(".bolsa__alca")).toBeTruthy());
    const bolsa = document.querySelector(".bolsa")!;
    expect(bolsa.classList.contains("bolsa--lateral")).toBe(false);
    expect(bolsa.classList.contains("bolsa--tampa")).toBe(false);
    expect(bolsa.querySelector(".bolsa__tampa, .bolsa__base")).toBeNull();
    expect(bolsa.querySelector(".bolsa__lado")).toBeNull();
    expect(document.querySelector(".bolsa__peca, .barra-moedas__saco")).toBeNull();
  });

  it("com todas as partes carregadas, a grade fica entre as laterais, com a tampa e a base, decorativas", async () => {
    const pedidas: string[] = [];
    class ImagemQueCarrega {
      onload: (() => void) | null = null;
      set src(url: string) { pedidas.push(url); queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal("Image", ImagemQueCarrega);
    montar();
    await waitFor(() => expect(document.querySelector(".bolsa__lado")).toBeTruthy());
    await waitFor(() => expect(document.querySelector(".bolsa__tampa")).toBeTruthy());
    expect(pedidas.sort()).toEqual([...ARTES.laterais, ...ARTES["tampa-e-base"]].sort());
    const bolsa = document.querySelector(".bolsa")!;
    expect(bolsa.querySelector(".bolsa__alca")).toBeNull();
    for (const lado of ["esquerdo", "direito"]) {
      const lateral = bolsa.querySelector(`.bolsa__lado--${lado}`)!;
      expect(lateral.getAttribute("aria-hidden")).toBe("true");
      expect(Array.from(lateral.querySelectorAll("img")).map((img) => img.getAttribute("src"))).toEqual([
        `/arte/inventario/inventario-lado-${lado}-topo.webp`, `/arte/inventario/inventario-lado-${lado}-base.webp`,
      ]);
      expect((lateral.querySelector(".bolsa__lado-miolo") as HTMLElement).style.backgroundImage).toContain(`inventario-lado-${lado}-miolo.webp`);
    }
    expect(bolsa.querySelector(".bolsa__tampa")!.getAttribute("aria-hidden")).toBe("true");
    const base = bolsa.querySelector(".bolsa__base")!;
    expect(base.getAttribute("aria-hidden")).toBe("true");
    expect(Array.from(base.querySelectorAll("img")).map((img) => img.getAttribute("src"))).toEqual([
      "/arte/inventario/inventario-base-esquerda.webp", "/arte/inventario/inventario-base-direita.webp",
    ]);
    expect((base.querySelector(".bolsa__base-miolo") as HTMLElement).style.backgroundImage).toContain("inventario-base-miolo.webp");
  });

  it("tampa e base carregam à parte: sem elas, as laterais continuam e o alto fica com a costura", async () => {
    class ImagemSoDasLaterais {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(url: string) { queueMicrotask(() => (url.includes("inventario-lado-") ? this.onload : this.onerror)?.()); }
    }
    vi.stubGlobal("Image", ImagemSoDasLaterais);
    montar();
    await waitFor(() => expect(document.querySelector(".bolsa__lado")).toBeTruthy());
    await waitFor(() => expect(document.querySelector(".bolsa")!.classList.contains("bolsa--tampa")).toBe(false));
    expect(document.querySelector(".bolsa__tampa, .bolsa__base")).toBeNull();
  });
});
