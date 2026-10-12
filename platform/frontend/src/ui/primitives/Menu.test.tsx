// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Menu } from "./Menu";

function renderMenu(onSelect: (id: string) => void) {
  return render(
    <Menu
      label="Ações do personagem"
      items={[
        { id: "equip", label: "Equipar", onSelect: () => onSelect("equip") },
        { id: "unequip", label: "Desequipar", onSelect: () => onSelect("unequip") },
        { id: "discard", label: "Descartar", onSelect: () => onSelect("discard") },
      ]}
    />,
  );
}

describe("Menu", () => {
  afterEach(() => cleanup());

  it("abre com Enter/seta para baixo e foca o primeiro item", () => {
    renderMenu(vi.fn());
    const trigger = screen.getByRole("button", { name: "Ações do personagem" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("menu", { name: "Ações do personagem" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Equipar" }));
  });

  it("navega com as setas, incluindo o ciclo do último item para o primeiro", () => {
    renderMenu(vi.fn());
    fireEvent.click(screen.getByRole("button", { name: "Ações do personagem" }));
    const equip = screen.getByRole("menuitem", { name: "Equipar" });
    fireEvent.keyDown(equip, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Desequipar" }));
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Desequipar" }), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Descartar" }));
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Descartar" }), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Equipar" }));
  });

  it("End vai ao último item e Home volta ao primeiro", () => {
    renderMenu(vi.fn());
    fireEvent.click(screen.getByRole("button", { name: "Ações do personagem" }));
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Equipar" }), { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Descartar" }));
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Descartar" }), { key: "Home" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Equipar" }));
  });

  it("Esc fecha e devolve o foco ao gatilho", () => {
    renderMenu(vi.fn());
    const trigger = screen.getByRole("button", { name: "Ações do personagem" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Equipar" }), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("selecionar um item aciona o comando e fecha o menu", () => {
    const onSelect = vi.fn();
    renderMenu(onSelect);
    fireEvent.click(screen.getByRole("button", { name: "Ações do personagem" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Desequipar" }));
    expect(onSelect).toHaveBeenCalledWith("unequip");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("clicar fora fecha o menu", () => {
    renderMenu(vi.fn());
    fireEvent.click(screen.getByRole("button", { name: "Ações do personagem" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    renderMenu(vi.fn());
    fireEvent.click(screen.getByRole("button", { name: "Ações do personagem" }));
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
