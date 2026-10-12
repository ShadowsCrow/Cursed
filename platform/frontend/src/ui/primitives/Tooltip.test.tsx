// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Tooltip } from "./Tooltip";

function renderTooltip() {
  return render(
    <Tooltip label="Pontos de Vida atuais">
      <button type="button">PV</button>
    </Tooltip>,
  );
}

describe("Tooltip", () => {
  afterEach(() => cleanup());

  it("mostra a dica por hover", () => {
    renderTooltip();
    const trigger = screen.getByRole("button", { name: "PV" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole("tooltip").textContent).toBe("Pontos de Vida atuais");
    fireEvent.mouseLeave(trigger);
  });

  it("mostra a dica por foco de teclado, não apenas hover", () => {
    renderTooltip();
    const trigger = screen.getByRole("button", { name: "PV" });
    fireEvent.focus(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);
    fireEvent.blur(trigger);
  });

  it("alterna por toque", () => {
    renderTooltip();
    const trigger = screen.getByRole("button", { name: "PV" });
    fireEvent.touchStart(trigger);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.touchStart(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    renderTooltip();
    fireEvent.focus(screen.getByRole("button", { name: "PV" }));
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
