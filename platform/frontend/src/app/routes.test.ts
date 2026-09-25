import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("typed routes", () => {
  it("encodes table and character identifiers as path segments", () => {
    expect(routes.home()).toBe("/");
    expect(routes.table("mesa/1")).toBe("/mesas/mesa%2F1");
    expect(routes.character("mesa 1", "p#1")).toBe("/mesas/mesa%201/personagens/p%231");
  });
});
