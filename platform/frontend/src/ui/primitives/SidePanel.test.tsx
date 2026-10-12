// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { SidePanel } from "./SidePanel";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Ver inventário</button>
      <SidePanel open={open} onClose={() => setOpen(false)} title="Inventário" side="end">
        <button type="button">Item 1</button>
        <button type="button">Item 2</button>
      </SidePanel>
    </div>
  );
}

describe("SidePanel", () => {
  afterEach(() => cleanup());

  it("abre como um diálogo modal rotulado, prende o foco e Esc devolve o foco ao gatilho", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Ver inventário" });
    trigger.focus();
    fireEvent.click(trigger);

    const panel = screen.getByRole("dialog", { name: "Inventário" });
    expect(panel.className).toContain("side-panel");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Item 1" }));

    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("toque no fundo fecha o painel", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Ver inventário" }));
    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.touchStart(overlay);
    fireEvent.mouseDown(overlay);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Ver inventário" }));
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
