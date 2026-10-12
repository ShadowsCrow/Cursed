import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ler = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = ler("./tokens.css");
// Arquivos do tema: toda animação usa as durações de token, que o movimento reduzido zera.
const TEMA = ["../ui/tema.css", "../app/characters/creation/assistente.css"];

describe("movimento do tema", () => {
  it("com movimento reduzido, todas as durações de tema são 0", () => {
    const definidas = [...tokens.matchAll(/(--motion-[\w-]+)\s*:/g)].map((m) => m[1]);
    const reduzido = /@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(tokens)?.[1] ?? "";
    expect(definidas.length).toBeGreaterThan(0);
    for (const token of new Set(definidas)) expect(reduzido).toMatch(new RegExp(`${token}:\\s*0ms`));
  });

  it("animações e transições do tema usam as durações de token", () => {
    for (const arquivo of TEMA) {
      const css = ler(arquivo);
      for (const [declaracao] of css.matchAll(/(?:animation|transition)(?:-duration)?\s*:[^;]+;/g)) {
        if (/:\s*none\s*;/.test(declaracao)) continue;
        expect(declaracao, arquivo).toMatch(/var\(--motion-/);
        expect(declaracao.replace(/var\([^)]*\)/g, ""), arquivo).not.toMatch(/\d+m?s\b/);
      }
    }
  });
});
