// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SheetHeader } from "./SheetHeader";
import type { ApiClient, FichaContrato, ValorDerivadoResumo } from "../types";

describe("SheetHeader — 6.2 cabeçalho visual da ficha", () => {
  afterEach(() => cleanup());

  const maximo = (chave: string, total: number | null, motivo?: string): ValorDerivadoResumo => ({
    chave: `recurso:${chave}_maximo`, rotulo: chave === "pv" ? "PV máximo" : "PP máximo", grupo: "recurso",
    calculavel: total !== null, motivo: motivo ?? null, total, situacionais: [],
    fontes: total === null ? [] : [
      { tipo: "classe", descricao: "Base de PV do Mago", valor: 12 },
      { tipo: "atributo", descricao: "Vigor", valor: 3 },
      { tipo: "nivel", descricao: "4 aumentos de Escala de PV (5)", valor: total - 15 },
    ],
  });

  it("mostra retrato por iniciais, identidade e PV/PP com o máximo calculado", () => {
    const ficha = {
      personagem: { nome: "Nara Exemplo", raca: "Elfo", classe: "Feiticeiro", arquetipo: "Arcano", idade: 28 },
      recursos: { pv: { atual: 18, maximo: 99 }, pp: { atual: 7 } },
    } as unknown as FichaContrato;

    render(<SheetHeader ficha={ficha} recursos={{ valores: [maximo("pv", 35), maximo("pp", 24)] }} />);

    expect(screen.getByRole("img", { name: "Retrato ilustrativo de Nara Exemplo" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nara Exemplo" })).toBeTruthy();
    expect(screen.getByText("Feiticeiro · Elfo")).toBeTruthy();
    expect(screen.getByText("Arcano")).toBeTruthy();
    // O máximo antigo gravado à mão (99) não conta: vale o calculado.
    expect(screen.getByRole("progressbar", { name: "Pontos de Vida" }).getAttribute("aria-valuetext")).toBe("18 de 35");
    expect(screen.getByRole("progressbar", { name: "Pontos de Propósito" }).getAttribute("aria-valuetext")).toBe("7 de 24");
    expect(screen.getAllByRole("button", { name: "Fontes de PV máximo" })).toHaveLength(1);
  });

  it("valor não calculável aparece com o motivo, sem inventar número", () => {
    const ficha = { personagem: { nome: "Ari Teste" } } as unknown as FichaContrato;
    render(<SheetHeader ficha={ficha} recursos={{
      valores: [maximo("pv", null, "A classe \"Guerreiro\" não está no catálogo: vincule a classe."), maximo("pp", null, "Classe não definida.")],
    }} />);

    expect(screen.getByRole("heading", { name: "Ari Teste" })).toBeTruthy();
    expect(screen.queryByRole("progressbar", { name: "Pontos de Vida" })).toBeNull();
    expect(screen.getByText(/Não calculável: A classe "Guerreiro" não está no catálogo/)).toBeTruthy();
    expect(screen.getByText("Não calculável: Classe não definida.")).toBeTruthy();
  });

  it("nível da migração: aviso e confirmação pelo Narrador", () => {
    const confirmar = vi.fn(async () => undefined);
    render(<SheetHeader ficha={{ personagem: { nome: "Lia" } } as unknown as FichaContrato} recursos={{
      valores: [maximo("pv", 15), maximo("pp", 10)],
      avisoNivel: "Nível definido pela migração: o Narrador precisa confirmar o nível do personagem.",
      onConfirmarNivel: confirmar,
    }} />);
    expect(screen.getByRole("note").textContent).toContain("Nível definido pela migração");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar nível" }));
    expect(confirmar).toHaveBeenCalledTimes(1);
  });

  it("Narrador registra ajuste de PV com origem e justificativa", async () => {
    const POST = vi.fn().mockResolvedValue({ data: { versao: 4, valores: [] } });
    const onAjustado = vi.fn();
    render(<SheetHeader ficha={{ personagem: { nome: "Lia" } } as unknown as FichaContrato} recursos={{
      valores: [maximo("pv", 15), maximo("pp", 10)],
      ajuste: { api: { POST } as unknown as ApiClient, mesaId: "m", personagemId: "p", versao: 3, onAjustado },
    }} />);
    fireEvent.click(screen.getByRole("button", { name: "Ajustar PV/PP" }));
    const registrar = screen.getByRole("button", { name: "Registrar ajuste" }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText("Ajuste (positivo ou negativo)"), { target: { value: "3" } });
    expect(registrar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Origem"), { target: { value: "Bênção do Templo" } });
    fireEvent.change(screen.getByLabelText("Justificativa"), { target: { value: "Campanha" } });
    fireEvent.click(registrar);
    await waitFor(() => expect(onAjustado).toHaveBeenCalledWith(4));
    expect(POST).toHaveBeenCalledWith("/mesas/{mesa_id}/personagens/{personagem_id}/recursos/ajustes", {
      params: { path: { mesa_id: "m", personagem_id: "p" } },
      body: { versao_esperada: 3, alvo: "pv_maximo", valor: 3, origem: "Bênção do Templo", justificativa: "Campanha" },
    });
  });

  it("mostra o retrato real quando a ficha traz personagem.imagem_base64 (6.2 correção)", () => {
    const ficha = {
      personagem: { nome: "Nara Exemplo", imagem_base64: "ZmFrZS1wbmc=" },
    } as unknown as FichaContrato;

    render(<SheetHeader ficha={ficha} />);

    const img = screen.getByRole("img", { name: "Retrato de Nara Exemplo" }) as HTMLImageElement;
    expect(img.src).toBe("data:image/png;base64,ZmFrZS1wbmc=");
    expect(screen.queryByRole("img", { name: "Retrato ilustrativo de Nara Exemplo" })).toBeNull();
  });

  it("resolve imagem_ativo pelo recurso autorizado da mesa", async () => {
    const ficha = { personagem: { nome: "Nara Exemplo", imagem_ativo: "mesas/mesa/personagens/p1/legado/arte.png" } } as unknown as FichaContrato;
    const GET = vi.fn().mockResolvedValue({ data: { tipo: "image/png", base64: "YWJj" } });
    const api = { GET } as unknown as ApiClient;
    render(<QueryClientProvider client={new QueryClient()}>
      <SheetHeader ficha={ficha} api={api} mesaId="mesa" />
    </QueryClientProvider>);
    const imagem = await screen.findByRole("img", { name: "Retrato de Nara Exemplo" });
    expect(imagem.getAttribute("src")).toBe("data:image/png;base64,YWJj");
    expect(GET).toHaveBeenCalledWith("/mesas/{mesa_id}/ativos", {
      params: { path: { mesa_id: "mesa" }, query: { caminho: "mesas/mesa/personagens/p1/legado/arte.png", exibicao: true } },
    });
  });
});
