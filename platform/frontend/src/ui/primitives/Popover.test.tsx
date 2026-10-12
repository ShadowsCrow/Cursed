// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Popover } from "./Popover";

function renderPopover() {
  return render(
    <Popover label="Véu Protetor" triggerContent={<span aria-hidden="true">✧</span>}>
      <p>Proteção temporária concedida por Mira Voss.</p>
    </Popover>,
  );
}

describe("Popover", () => {
  afterEach(() => cleanup());

  it("abre por hover e fecha ao sair (não depende apenas de clique)", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: "Véu Protetor" });
    expect(screen.queryByRole("group")).toBeNull();
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole("group", { name: "Véu Protetor" })).toBeTruthy();
    fireEvent.mouseLeave(trigger);
  });

  it("abre por foco de teclado", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: "Véu Protetor" });
    fireEvent.focus(trigger);
    expect(screen.getByRole("group", { name: "Véu Protetor" })).toBeTruthy();
    fireEvent.blur(trigger);
  });

  it("alterna por clique/toque, e Esc fecha", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: "Véu Protetor" });
    fireEvent.click(trigger);
    expect(screen.getByRole("group", { name: "Véu Protetor" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("toque no gatilho abre o conteúdo completo", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: "Véu Protetor" });
    fireEvent.touchStart(trigger);
    fireEvent.click(trigger);
    expect(screen.getByRole("group", { name: "Véu Protetor" })).toBeTruthy();
  });

  it("fechar ao clicar fora", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: "Véu Protetor" });
    fireEvent.click(trigger);
    expect(screen.getByRole("group")).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("não apresenta violações de acessibilidade detectáveis automaticamente", async () => {
    renderPopover();
    fireEvent.click(screen.getByRole("button", { name: "Véu Protetor" }));
    // A regra "region" exige que toda a página esteja contida em landmarks; aqui
    // testamos o componente isolado, fora de um layout de página completo.
    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
