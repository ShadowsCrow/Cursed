// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import Leitura from "./Leitura";

function montar(markdown: string) {
  return render(<MemoryRouter><Leitura markdown={markdown} indice /></MemoryRouter>);
}

describe("leitura das regras (8.2)", () => {
  afterEach(() => cleanup());

  it("HTML embutido não é executado nem vira elemento", () => {
    const { container } = montar("# Título\n\n<script>window.invadido = true</script>\n\n<b onclick=\"x()\">negrito</b> texto");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect((window as unknown as { invadido?: boolean }).invadido).toBeUndefined();
  });

  it("tabela vira <table> num contêiner rolável; links entre documentos viram links da Biblioteca", () => {
    montar("# Doc\n\n## Primeira\n\n|A|B|\n|---|---|\n|1|2|\n\n## Segunda\n\nVeja [Carga](Carga.md#a-grade) e [site](https://exemplo.com).");
    expect(screen.getByRole("region", { name: "Tabela" }).querySelector("table")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Carga" }).getAttribute("href")).toBe("/biblioteca/regras/carga#a-grade");
    expect(screen.getByRole("link", { name: "site" }).getAttribute("rel")).toContain("noopener");
    const indice = screen.getByRole("navigation", { name: "Seções do documento" });
    expect(Array.from(indice.querySelectorAll("a"), (a) => a.getAttribute("href"))).toEqual(["#primeira", "#segunda"]);
    expect(document.getElementById("primeira")?.tagName).toBe("H2");
  });

  it("link para documento fora da Biblioteca não vira link quebrado", () => {
    montar("Veja [o roteiro](Roadmap.md).");
    expect(screen.queryByRole("link", { name: "o roteiro" })).toBeNull();
    expect(screen.getByText("o roteiro")).toBeTruthy();
  });
});
