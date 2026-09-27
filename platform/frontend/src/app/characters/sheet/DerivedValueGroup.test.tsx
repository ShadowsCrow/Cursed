// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DerivedValueGroup } from "./DerivedValueGroup";
import type { ValorDerivadoResumo } from "../types";

describe("DerivedValueGroup — 6.7 explicação das fontes de valores derivados", () => {
  afterEach(() => cleanup());

  it("Defesa (Armadura): atributo + equipamento + efeito somam o total, e o situacional fica separado", () => {
    const valores: ValorDerivadoResumo[] = [
      {
        chave: "defesa:armadura",
        rotulo: "Defesa (Armadura)",
        grupo: "status", calculavel: true,
        total: 6,
        fontes: [
          { tipo: "atributo", descricao: "Vigor", valor: 3 },
          { tipo: "equipamento", descricao: "Cota de malha", valor: 2, item_id: "item-1" },
          { tipo: "efeito", descricao: "Cota de malha — Bênção da armadura", valor: 1, efeito_id: "efeito-1", item_id: "item-1" },
        ],
        situacionais: [
          { descricao: "Bênção da armadura", valor: 2, contexto: "contra projéteis", efeito_id: "efeito-1" },
        ],
      },
    ];

    render(<DerivedValueGroup eyebrow="ESTADO" title="Status" valores={valores} grupo="status" emptyMessage="Nenhum status." />);

    expect(screen.getByText("Defesa (Armadura)")).toBeTruthy();
    const trigger = screen.getByRole("button", { name: "Fontes de Defesa (Armadura)" });
    expect(trigger.textContent).toBe("+6");

    fireEvent.click(trigger);
    const details = screen.getByRole("group", { name: "Fontes de Defesa (Armadura)" });
    expect(within(details).getByText("Total")).toBeTruthy();
    expect(within(details).getByText("6")).toBeTruthy();
    expect(within(details).getByText(/Atributo — Vigor/)).toBeTruthy();
    expect(within(details).getByText("+3")).toBeTruthy();
    expect(within(details).getByText(/Equipamento — Cota de malha/)).toBeTruthy();
    expect(within(details).getByText("+1")).toBeTruthy();
    expect(within(details).getByText(/Efeito — Cota de malha — Bênção da armadura/)).toBeTruthy();

    expect(within(details).getByText("Situacionais — não entram no total")).toBeTruthy();
    expect(within(details).getByText(/Bênção da armadura · contra projéteis/)).toBeTruthy();
  });

  it("mostra uma mensagem explícita quando o grupo não tem valores calculados", () => {
    render(<DerivedValueGroup eyebrow="BASE MECÂNICA" title="Atributos" valores={[]} grupo="atributo" emptyMessage="Nenhum atributo registrado." />);
    expect(screen.getByText("Nenhum atributo registrado.")).toBeTruthy();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    const valores: ValorDerivadoResumo[] = [
      { chave: "atributo:vigor", rotulo: "Vigor", grupo: "atributo", calculavel: true, total: 3, fontes: [{ tipo: "base", descricao: "Valor base", valor: 3 }], situacionais: [] },
    ];
    render(<DerivedValueGroup eyebrow="BASE MECÂNICA" title="Atributos" valores={valores} grupo="atributo" emptyMessage="Nenhum." />);
    fireEvent.click(screen.getByRole("button", { name: "Fontes de Vigor" }));
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
