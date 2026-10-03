import { describe, expect, it } from "vitest";

import { centroDaFace, cross, deslocamentoDoAnel, dot, FACES_ESPERADAS, norma, solido, sub, unitario, type Forma } from "./geometria";

const FORMAS: Forma[] = ["d4", "d6", "d8", "d10", "d12", "d20"];
const VERTICES: Record<Forma, number> = { d4: 4, d6: 8, d8: 6, d10: 12, d12: 20, d20: 12 };
const LADOS: Record<Forma, number> = { d4: 3, d6: 4, d8: 3, d10: 4, d12: 5, d20: 3 };

describe("sólidos dos dados 3D", () => {
  for (const forma of FORMAS) {
    it(`${forma}: faces, vértices, normais para fora e convexidade`, () => {
      const s = solido(forma);
      expect(s.vertices).toHaveLength(VERTICES[forma]);
      expect(s.faces).toHaveLength(FACES_ESPERADAS[forma]);
      s.faces.forEach((face, i) => {
        expect(face).toHaveLength(LADOS[forma]);
        const normal = s.normais[i]!;
        expect(norma(normal)).toBeCloseTo(1, 6);
        // Para fora: a normal aponta no mesmo sentido do centro da face.
        expect(dot(normal, centroDaFace(s, i))).toBeGreaterThan(0);
        // Todos os vértices ficam atrás ou sobre o plano da face (convexo).
        const k = dot(normal, s.vertices[face[0]!]!);
        for (const v of s.vertices) expect(dot(normal, v) - k).toBeLessThan(1e-4);
        // Ordem anti-horária vista de fora: o produto vetorial das arestas acompanha a normal.
        const [a, b, c] = face.map((indice) => s.vertices[indice]!);
        expect(dot(unitario(cross(sub(b!, a!), sub(c!, a!))), normal)).toBeGreaterThan(0.99);
      });
    });
  }

  it("cada face de um dado comum tem uma oposta paralela (menos no d4)", () => {
    for (const forma of ["d6", "d8", "d10", "d12", "d20"] as Forma[]) {
      const s = solido(forma);
      for (const n of s.normais) expect(s.normais.some((m) => dot(n, m) < -0.999)).toBe(true);
    }
  });

  it("o d10 tem faces em pipa planas, começando pelo ápice", () => {
    const s = solido("d10");
    expect(deslocamentoDoAnel(1)).toBeCloseTo(0.1056, 3);
    for (const face of s.faces) {
      const apice = s.vertices[face[0]!]!;
      expect(Math.abs(apice[1])).toBeGreaterThan(0.9);
    }
  });
});
