// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Marca, Moldura, Pergaminho, Selo, TituloOrnado } from "./Tema";

describe("componentes de tema", () => {
  afterEach(() => cleanup());

  it("moldura: cantos decorativos ocultos e sem foco, conteúdo intacto", () => {
    const { container } = render(<Moldura as="section" aria-label="Painel"><button type="button">Agir</button></Moldura>);
    const secao = screen.getByRole("region", { name: "Painel" });
    expect(secao.tagName).toBe("SECTION");
    const cantos = container.querySelectorAll(".moldura__canto");
    expect(cantos).toHaveLength(4);
    cantos.forEach((canto) => {
      expect(canto.getAttribute("aria-hidden")).toBe("true");
      expect(canto.getAttribute("focusable")).toBe("false");
    });
    expect(screen.getByRole("button", { name: "Agir" })).toBeTruthy();
  });

  it("pergaminho aplica o escopo de tokens de leitura", () => {
    render(<Pergaminho aria-label="Etapa" role="region"><p>Texto</p></Pergaminho>);
    const regiao = screen.getByRole("region", { name: "Etapa" });
    expect(regiao.classList.contains("tema-pergaminho")).toBe(true);
    expect(regiao.querySelector("img")).toBeNull();
  });

  it("título ornado: nível correto, divisor oculto e foco programático", () => {
    const ref = createRef<HTMLHeadingElement>();
    const { container } = render(<TituloOrnado ref={ref} nivel={1} sobretitulo="Etapa 1 de 8" tabIndex={-1}>Conceito</TituloOrnado>);
    const titulo = screen.getByRole("heading", { level: 1, name: "Conceito" });
    ref.current?.focus();
    expect(document.activeElement).toBe(titulo);
    expect(container.querySelector(".titulo-ornado__divisor")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("Etapa 1 de 8")).toBeTruthy();
  });

  it("selo diz o estado em texto", () => {
    render(<Selo tom="sangue">Ativo</Selo>);
    expect(screen.getByText("Ativo").className).toContain("selo--sangue");
  });

  it("marca: nome em texto e, se a imagem falhar, emblema em SVG sem imagem quebrada", () => {
    const { container } = render(<Marca />);
    expect(screen.getByText("CURSED")).toBeTruthy();
    const imagem = container.querySelector("img");
    expect(imagem?.getAttribute("alt")).toBe("");
    fireEvent.error(imagem!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".emblema-simples")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("CURSED")).toBeTruthy();
  });
});
