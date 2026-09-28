// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { ProvaDoResumo } from "./ProvaDoResumo";

describe("prova do Resumo", () => {
  afterEach(() => cleanup());

  it("mostra o personagem de exemplo e alterna os estados de exemplo", () => {
    render(<MemoryRouter><ProvaDoResumo /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: "Thalen Aerendir" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trocar ilustração" })).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Só leitura" }));
    expect(screen.getByText("História não escrita.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /ilustração/ })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Ficha vazia" }));
    expect(screen.getByRole("heading", { level: 1, name: "Sem nome" })).toBeTruthy();
    expect(screen.getAllByText("Classe não definida.")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Abrir Perícias" }));
    expect(screen.getByRole("status").textContent).toContain("pericias");
  });
});
