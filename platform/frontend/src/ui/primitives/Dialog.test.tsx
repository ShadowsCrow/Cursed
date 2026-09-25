// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "./Dialog";

function Harness({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Abrir diálogo</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Aplicar efeito" description="Escolha o alvo e a duração.">
        <label>Alvo<input type="text" /></label>
        <button type="button">Confirmar</button>
      </Dialog>
    </div>
  );
}

describe("Dialog", () => {
  afterEach(() => cleanup());

  it("ao abrir, foca o primeiro campo de conteúdo (não o botão Fechar)", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir diálogo" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Aplicar efeito" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });

  it("prende o Tab: do último elemento volta ao primeiro, e Shift+Tab do primeiro vai ao último", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    const dialog = screen.getByRole("dialog");
    const closeButton = screen.getByRole("button", { name: "Fechar" });
    const confirmButton = screen.getByRole("button", { name: "Confirmar" });

    confirmButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    closeButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirmButton);
  });

  it("o clique no botão Fechar fecha o diálogo e devolve o foco ao gatilho", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir diálogo" });
    trigger.focus();
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("fecha com Esc e devolve o foco ao gatilho", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir diálogo" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("fecha ao clicar no fundo, mas não ao clicar dentro do conteúdo", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Título">
        <p>Conteúdo</p>
      </Dialog>,
    );
    fireEvent.mouseDown(screen.getByText("Conteúdo"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    render(<Harness initialOpen />);
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
