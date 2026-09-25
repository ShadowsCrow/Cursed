// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SheetHeader } from "./SheetHeader";
import type { FichaContrato } from "../types";

describe("SheetHeader — 6.2 cabeçalho visual da ficha", () => {
  afterEach(() => cleanup());

  it("mostra retrato por iniciais, identidade completa e recursos quando presentes na ficha", () => {
    const ficha = {
      personagem: { nome: "Nara Exemplo", raca: "Elfo", classe: "Feiticeiro", arquetipo: "Arcano", idade: 28 },
      recursos: { pv: { atual: 18, maximo: 24 }, pp: { atual: 7, maximo: 12 } },
    } as unknown as FichaContrato;

    render(<SheetHeader ficha={ficha} />);

    expect(screen.getByRole("img", { name: "Retrato ilustrativo de Nara Exemplo" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nara Exemplo" })).toBeTruthy();
    expect(screen.getByText("Feiticeiro · Elfo")).toBeTruthy();
    expect(screen.getByText("Arcano")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Pontos de Vida" }).getAttribute("aria-valuetext")).toBe("18 de 24");
    expect(screen.getByRole("progressbar", { name: "Pontos de Poder" }).getAttribute("aria-valuetext")).toBe("7 de 12");
  });

  it("informa explicitamente que PV e PP não foram registrados quando ausentes, sem inventar valores", () => {
    const ficha = { personagem: { nome: "Ari Teste" } } as unknown as FichaContrato;
    render(<SheetHeader ficha={ficha} />);

    expect(screen.getByRole("heading", { name: "Ari Teste" })).toBeTruthy();
    expect(screen.queryByRole("progressbar", { name: "Pontos de Vida" })).toBeNull();
    expect(screen.queryByRole("progressbar", { name: "Pontos de Poder" })).toBeNull();
    const notices = screen.getAllByText("Não registrado");
    expect(notices).toHaveLength(2);
  });
});
