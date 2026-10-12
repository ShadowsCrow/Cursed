// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useInclinacao } from "./useInclinacao";

function Carta() {
  const inclinacao = useInclinacao();
  return <button type="button" {...inclinacao}>carta</button>;
}

function Figura() {
  const inclinacao = useInclinacao();
  return <div role="img" aria-label="figura" {...inclinacao} />;
}

const CAIXA = { left: 100, top: 200, width: 200, height: 300, right: 300, bottom: 500, x: 100, y: 200, toJSON: () => ({}) } as DOMRect;

function carta() {
  const botao = screen.getByRole("button", { name: "carta" });
  botao.getBoundingClientRect = () => CAIXA;
  return botao;
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("useInclinacao", () => {
  it("vira a carta para o lado do mouse e a devolve ao plano ao sair", () => {
    render(<Carta />);
    const botao = carta();

    // Canto superior direito: a carta vira para a direita (rotateY +) e para cima (rotateX +).
    fireEvent.pointerMove(botao, { clientX: 300, clientY: 200, pointerType: "mouse" });
    expect(botao.style.getPropertyValue("--inc-y")).toBe("12.00deg");
    expect(botao.style.getPropertyValue("--inc-x")).toBe("12.00deg");
    expect(botao.hasAttribute("data-inclinada")).toBe(true);

    // No centro, fica plana.
    fireEvent.pointerMove(botao, { clientX: 200, clientY: 350, pointerType: "mouse" });
    expect(Number.parseFloat(botao.style.getPropertyValue("--inc-y"))).toBeCloseTo(0);
    expect(Number.parseFloat(botao.style.getPropertyValue("--inc-x"))).toBeCloseTo(0);

    fireEvent.pointerLeave(botao);
    expect(botao.style.getPropertyValue("--inc-x")).toBe("");
    expect(botao.hasAttribute("data-inclinada")).toBe(false);
  });

  it("também serve à carta que é só figura, como na pré-visualização", () => {
    render(<Figura />);
    const figura = screen.getByRole("img", { name: "figura" });
    figura.getBoundingClientRect = () => CAIXA;
    fireEvent.pointerMove(figura, { clientX: 100, clientY: 500, pointerType: "mouse" });
    expect(figura.style.getPropertyValue("--inc-y")).toBe("-12.00deg");
    expect(figura.style.getPropertyValue("--inc-x")).toBe("-12.00deg");
    fireEvent.pointerLeave(figura);
    expect(figura.hasAttribute("data-inclinada")).toBe(false);
  });

  it("ignora toque e movimento reduzido", () => {
    render(<Carta />);
    const botao = carta();
    fireEvent.pointerMove(botao, { clientX: 300, clientY: 200, pointerType: "touch" });
    expect(botao.hasAttribute("data-inclinada")).toBe(false);
    cleanup();

    vi.stubGlobal("matchMedia", (consulta: string) => ({
      matches: true, media: consulta, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }));
    render(<Carta />);
    const reduzido = carta();
    fireEvent.pointerMove(reduzido, { clientX: 300, clientY: 200, pointerType: "mouse" });
    expect(reduzido.hasAttribute("data-inclinada")).toBe(false);
  });
});
