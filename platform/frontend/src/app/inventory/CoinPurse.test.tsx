// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ItemInventarioResumo } from "../characters/types";
import { CoinPurse, type CoinPurseProps } from "./CoinPurse";

const pilha = (id: string, dados: Record<string, number>, coluna: number | null, linha: number | null): ItemInventarioResumo => ({
  id, tipo: "outro", subtipo: "moedas", nome: "Moedas", quantidade: 1, equipado: false, cargas_atuais: null, cargas_maximas: null,
  dados, efeitos: [], girado: false, largura: 1, altura: 1, coluna, linha,
});

// Ordem da grade: a pilha da linha 1 vem antes da linha 2, e a de fora da grade por último.
const MISTA = pilha("b", { cobre: 40, prata: 60 }, 0, 1);
const PRATA = pilha("a", { prata: 35, ouro: 12 }, 3, 2);
const FORA = pilha("c", { ouro: 5 }, null, null);

function montar(extra: Partial<CoinPurseProps> = {}) {
  const onGuardarBolsa = vi.fn();
  const onGuardarPilhas = vi.fn();
  const onAjustar = vi.fn(async () => true);
  render(<CoinPurse pilhas={[PRATA, FORA, MISTA]} porPilha={100} editavel ocupado={false}
    onGuardarBolsa={onGuardarBolsa} onGuardarPilhas={onGuardarPilhas} onAjustar={onAjustar} {...extra} />);
  return { onGuardarBolsa, onGuardarPilhas, onAjustar };
}

const total = (tipo: string) => within(within(document.querySelector(".moedas__totais") as HTMLElement).getByText(tipo).parentElement as HTMLElement)
  .getByRole("definition").textContent;

afterEach(() => cleanup());

describe("CoinPurse — 5.3 moedas na tela", () => {
  it("mostra o total por tipo e cada pilha na ordem da grade, sem câmbio", () => {
    montar();
    expect(total("Cobre")).toBe("40");
    expect(total("Prata")).toBe("95");
    expect(total("Ouro")).toBe("17");
    expect(screen.queryByText("Platina")).toBeNull();
    expect(screen.getByText(/152 moeda\(s\) em 3 pilha\(s\)\. Cada pilha ocupa uma célula e guarda até 100 moedas/)).toBeTruthy();
    expect(screen.getByText(/Não há câmbio entre tipos/)).toBeTruthy();
    const itens = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(itens[0]).toMatch(/Pilha 1: 40 de cobre, 60 de prata \(coluna 1, linha 2\)/);
    expect(itens[1]).toMatch(/Pilha 2: 35 de prata, 12 de ouro \(coluna 4, linha 3\)/);
    expect(itens[2]).toMatch(/Pilha 3: 5 de ouro \(fora da grade\)/);
  });

  it("juntar envia os totais atuais para o servidor refazer as pilhas", () => {
    const { onGuardarBolsa } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Juntar pilhas" }));
    expect(onGuardarBolsa).toHaveBeenCalledWith({ cobre: 40, prata: 95, ouro: 17 });
  });

  it("não oferece juntar quando as pilhas já são o mínimo possível", () => {
    montar({ pilhas: [MISTA, PRATA] });
    expect(screen.queryByRole("button", { name: "Juntar pilhas" })).toBeNull();
  });

  it("dividir separa parte de uma pilha numa nova, mantendo a ordem das existentes", () => {
    const { onGuardarPilhas } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Dividir pilha 1" }));
    const separar = screen.getByRole("button", { name: "Separar" }) as HTMLButtonElement;
    expect(separar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Prata", { selector: "#dividir-prata" }), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Cobre", { selector: "#dividir-cobre" }), { target: { value: "999" } });
    expect((screen.getByLabelText("Cobre", { selector: "#dividir-cobre" }) as HTMLInputElement).value).toBe("40");
    fireEvent.click(separar);
    expect(onGuardarPilhas).toHaveBeenCalledWith([
      { cobre: 0, prata: 40, ouro: 0 },
      { cobre: 0, prata: 35, ouro: 12 },
      { cobre: 0, prata: 0, ouro: 5 },
      { cobre: 40, prata: 20, ouro: 0 },
    ]);
  });

  it("não deixa dividir movendo a pilha inteira", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Dividir pilha 3" }));
    fireEvent.change(screen.getByLabelText("Ouro", { selector: "#dividir-ouro" }), { target: { value: "5" } });
    expect((screen.getByRole("button", { name: "Separar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("adicionar envia só as moedas digitadas e zera o editor", async () => {
    const { onAjustar } = montar();
    fireEvent.change(screen.getByLabelText("Ouro", { selector: "#ajuste-ouro" }), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Cobre", { selector: "#ajuste-cobre" }), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(onAjustar).toHaveBeenCalledWith("adicionar", { cobre: 5, prata: 0, ouro: 30 });
    await waitFor(() => expect((screen.getByLabelText("Ouro", { selector: "#ajuste-ouro" }) as HTMLInputElement).value).toBe("0"));
    expect((screen.getByLabelText("Cobre", { selector: "#ajuste-cobre" }) as HTMLInputElement).value).toBe("0");
  });

  it("retirar não pede pilha e recusa mais do que há", async () => {
    const { onAjustar } = montar();
    fireEvent.change(screen.getByLabelText("Ouro", { selector: "#ajuste-ouro" }), { target: { value: "18" } });
    expect((screen.getByRole("button", { name: "Retirar" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Não dá para retirar: há só 17 de ouro/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Ouro", { selector: "#ajuste-ouro" }), { target: { value: "17" } });
    fireEvent.click(screen.getByRole("button", { name: "Retirar" }));
    expect(onAjustar).toHaveBeenCalledWith("retirar", { cobre: 0, prata: 0, ouro: 17 });
    await waitFor(() => expect((screen.getByLabelText("Ouro", { selector: "#ajuste-ouro" }) as HTMLInputElement).value).toBe("0"));
  });

  it("se o servidor recusar, o editor mantém os valores", async () => {
    const onAjustar = vi.fn(async () => false);
    montar({ onAjustar });
    fireEvent.change(screen.getByLabelText("Prata", { selector: "#ajuste-prata" }), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    await waitFor(() => expect(onAjustar).toHaveBeenCalled());
    expect((screen.getByLabelText("Prata", { selector: "#ajuste-prata" }) as HTMLInputElement).value).toBe("7");
  });

  it("sem permissão só mostra; ocupado desabilita as ações", () => {
    montar({ editavel: false });
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    montar({ ocupado: true });
    expect((screen.getByRole("button", { name: "Juntar pilhas" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Aguarde a grade ser guardada/)).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Dividir pilha 1" }));
    const resultado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(resultado.violations).toEqual([]);
  });
});
