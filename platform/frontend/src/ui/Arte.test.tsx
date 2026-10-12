// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CabecalhoIlustrado, IlustracaoDeEtapa } from "./Arte";

describe("arte do tema", () => {
  afterEach(() => cleanup());

  it("cabeçalho: imagem decorativa com dimensões; sem o arquivo, some e fica o gradiente com o texto", () => {
    const { container } = render(<CabecalhoIlustrado><h1>Criar personagem</h1></CabecalhoIlustrado>);
    const imagem = container.querySelector("img")!;
    expect(imagem.getAttribute("alt")).toBe("");
    expect(imagem.getAttribute("aria-hidden")).toBe("true");
    expect([imagem.getAttribute("width"), imagem.getAttribute("height")]).toEqual(["1536", "768"]);
    expect(imagem.getAttribute("srcset")).toContain("ancora-castelo-768.webp 768w");
    fireEvent.error(imagem);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".cabecalho-ilustrado__arte")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Criar personagem" })).toBeTruthy();
  });

  it("cada etapa tem sua ilustração, e a falta dela não deixa imagem quebrada", () => {
    for (const etapa of ["conceito", "identidade", "raca", "classe", "atributos", "pericias", "personalidade", "conferencia"] as const) {
      const { container } = render(<IlustracaoDeEtapa etapa={etapa}><span>Etapa</span></IlustracaoDeEtapa>);
      const imagem = container.querySelector("img")!;
      expect(imagem.getAttribute("src")).toBe(`/arte/etapa-${etapa}.webp`);
      expect([imagem.getAttribute("width"), imagem.getAttribute("height")]).toEqual(["1200", "800"]);
      fireEvent.error(imagem);
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector(`.ilustracao-etapa--${etapa} .ilustracao-etapa__arte`)).not.toBeNull();
      cleanup();
    }
  });
});
