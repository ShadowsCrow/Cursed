// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListaCategorias } from "../InventarioFicha";

describe("ListaCategorias com rótulos das cartas", () => {
  afterEach(() => cleanup());

  it("usa título, rótulo de todos e unidade próprios e mantém opções vazias quando pedido", () => {
    const onEscolher = vi.fn();
    render(
      <ListaCategorias variante="lista" titulo="Origem" rotuloTodos="Todas" unidade={["carta", "cartas"]} manterVazias
        total={3} ativa="raca" onEscolher={onEscolher}
        categorias={[
          { id: "classe", rotulo: "Da classe", icone: "origem_classe", total: 3 },
          { id: "raca", rotulo: "Da raça", icone: "origem_raca", total: 0 },
        ]} />,
    );
    const nav = screen.getByRole("navigation", { name: "Origem" });
    expect(nav.querySelector("h3")?.textContent).toBe("Origem");
    expect(screen.getByRole("button", { name: /Todas/ }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /Da raça/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByLabelText("3 cartas")).toHaveLength(2);
    expect(screen.getByLabelText("0 cartas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Da classe/ }));
    expect(onEscolher).toHaveBeenCalledWith("classe");
  });

  it("sem opções, continua a lista do Inventário", () => {
    render(<ListaCategorias variante="lista" total={1} ativa={null} onEscolher={vi.fn()}
      categorias={[{ id: "armas", rotulo: "Armas", icone: "armas", total: 1 }, { id: "chaves", rotulo: "Chaves", icone: "chaves", total: 0 }]} />);
    expect(screen.getByRole("navigation", { name: "Categorias" })).toBeTruthy();
    expect(screen.getAllByLabelText("1 item")).toHaveLength(2);
    expect(screen.queryByText("Chaves")).toBeNull();
  });
});
