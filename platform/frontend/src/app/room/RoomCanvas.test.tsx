// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// O jsdom não desenha WebGL: a aplicação do Pixi nunca termina de iniciar, e só os controles HTML são testados.
vi.mock("pixi.js", () => {
  class Application { init() { return new Promise(() => undefined); } destroy() {} }
  class Vazio {}
  return { Application, Container: Vazio, Graphics: Vazio, Rectangle: Vazio, Sprite: Vazio, Text: Vazio, Texture: Vazio, TilingSprite: Vazio };
});

import { RoomCanvas } from "./RoomCanvas";

const cena = { id: "cena", nome: "Pátio", largura: 20, altura: 15, tamanho_casa: 64, tokens: [] } as unknown as Parameters<typeof RoomCanvas>[0]["cena"];

describe("controle de zoom compacto", () => {
  afterEach(cleanup);

  it("tem reduzir, a porcentagem, ampliar e Centralizar como ícone com nome e dica", () => {
    render(<RoomCanvas cena={cena} onSelectToken={() => undefined} />);
    const controles = screen.getByRole("group", { name: "Controles do mapa" });
    const botoes = within(controles).getAllByRole("button");
    expect(botoes.map((botao) => botao.getAttribute("aria-label"))).toEqual(["Reduzir mapa", "Ampliar mapa", "Centralizar"]);
    expect(botoes.every((botao) => botao.getAttribute("title") === botao.getAttribute("aria-label"))).toBe(true);
    const centralizar = within(controles).getByRole("button", { name: "Centralizar" });
    expect(centralizar.textContent).toBe("");
    expect(centralizar.querySelector("svg")).toBeTruthy();
    expect(controles.querySelector("[aria-live]")?.textContent).toMatch(/^\d+%$/);
  });
});
