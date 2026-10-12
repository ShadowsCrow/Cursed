import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { paresReprovados, razaoContraste, resolverCor, tokensDoEscopo, type Par } from "./contraste";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf-8");
const texto = (frente: string, fundos: string[]): Par[] => fundos.map((fundo) => ({ frente, fundo, minimo: 4.5 }));
const limite = (frente: string, fundos: string[]): Par[] => fundos.map((fundo) => ({ frente, fundo, minimo: 3 }));

const SUPERFICIES_NOITE = ["--surface-app", "--surface", "--surface-raised", "--surface-soft"];
const SUPERFICIES_PERGAMINHO = ["--surface", "--surface-raised", "--surface-soft"];

/** Texto normal (4,5:1), texto grande e limites de controle, inclusive foco (3:1). */
function pares(superficies: string[]): Par[] {
  return [
    ...["--text", "--text-muted", "--text-quiet", "--text-disabled", "--accent", "--danger", "--success", "--arcane"]
      .flatMap((frente) => texto(frente, superficies)),
    ...texto("--action-text", ["--action", "--action-hover"]),
    ...limite("--focus-color", superficies),
    ...limite("--border-control", superficies),
  ];
}

describe("contraste dos tokens do tema", () => {
  it("paleta noturna cumpre 4,5:1 no texto e 3:1 em foco e bordas de controle", () => {
    expect(paresReprovados(css, "noite", [
      ...pares(SUPERFICIES_NOITE),
      ...limite("--border-ornate", ["--surface-app", "--surface"]),
      ...texto("--text-on-parchment", ["--surface-parchment"]),
      ...texto("--text-on-parchment-muted", ["--surface-parchment"]),
    ])).toEqual([]);
  });

  it("paleta de pergaminho cumpre os mesmos mínimos", () => {
    expect(paresReprovados(css, "pergaminho", pares(SUPERFICIES_PERGAMINHO))).toEqual([]);
  });

  it("Resumo da ficha: textos sobre o pergaminho, os quadros recortados e a capitular", () => {
    const tokens = tokensDoEscopo(css, "noite");
    const cor = (nome: string) => resolverCor(tokens, nome);
    // Fundos: o pergaminho da folha e os dois extremos do degradê das molduras (resumo/molduras/*.svg).
    const fundos = [cor("--pergaminho-50"), cor("--pergaminho-100"), cor("--pergaminho-200"), "#fbf2de", "#f1dcb2"];
    for (const frente of ["--tinta-900", "--tinta-700", "--tinta-600"]) {
      for (const fundo of fundos) expect(razaoContraste(cor(frente), fundo), `${frente} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const fundo of [cor("--noite-700"), cor("--noite-950")]) {
      expect(razaoContraste(cor("--ouro-200"), fundo), "capitular").toBeGreaterThanOrEqual(4.5);
    }
  });

  it("o teste acusa um par ruim", () => {
    const ruim = `${css}\n.tema-pergaminho { --text-muted: #c9b48f; }`;
    expect(paresReprovados(ruim, "pergaminho", texto("--text-muted", ["--surface"]))).toHaveLength(1);
    expect(razaoContraste("#777777", "#888888")).toBeLessThan(3);
    expect(razaoContraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });
});
