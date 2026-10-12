import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("typed routes", () => {
  it("encodes table and character identifiers as path segments", () => {
    expect(routes.home()).toBe("/");
    expect(routes.table("mesa/1")).toBe("/mesas/mesa%2F1");
    expect(routes.character("mesa 1", "p#1")).toBe("/mesas/mesa%201/personagens/p%231");
  });

  it("gera os endereços das seções da plataforma com a seleção no caminho", () => {
    expect(routes.campanha("a/b")).toBe("/campanhas/a%2Fb");
    expect(routes.personagens()).toBe("/personagens/meus");
    expect(routes.personagemDoAcervo("npcs", "m 1", "p")).toBe("/personagens/npcs/m%201/p");
    expect(routes.documento("dano-de-queda")).toBe("/biblioteca/regras/dano-de-queda");
  });
});
