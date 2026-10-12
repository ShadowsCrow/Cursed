/**
 * Sólidos dos dados 3D da Sala (melhorias-da-sala, item 3, D10): vértices e faces de cada dado.
 * A mesma definição alimenta a física (cannon-es) e o desenho (three). Sem dependências: só aritmética.
 */

export type Vetor = readonly [number, number, number];
export type Forma = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export interface Solido {
  forma: Forma;
  vertices: Vetor[];
  /** Índices dos vértices de cada face, em sentido anti-horário visto de fora. */
  faces: number[][];
  /** Normal unitária de cada face, para fora. */
  normais: Vetor[];
}

const PHI = (1 + Math.sqrt(5)) / 2;
const EPS = 1e-6;

export const sub = (a: Vetor, b: Vetor): Vetor => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: Vetor, b: Vetor) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vetor, b: Vetor): Vetor => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norma = (a: Vetor) => Math.hypot(a[0], a[1], a[2]);
export const unitario = (a: Vetor): Vetor => { const n = norma(a); return [a[0] / n, a[1] / n, a[2] / n]; };
const escalar = (a: Vetor, k: number): Vetor => [a[0] * k, a[1] * k, a[2] * k];
const soma = (vetores: Vetor[]): Vetor => vetores.reduce<Vetor>((t, v) => [t[0] + v[0], t[1] + v[1], t[2] + v[2]], [0, 0, 0]);

function combinacoes(sinais: number[][]): Vetor[] {
  return sinais.map((v) => [v[0]!, v[1]!, v[2]!] as Vetor);
}

function trocasDeSinal(base: Vetor): Vetor[] {
  const saida: Vetor[] = [];
  for (const sx of base[0] ? [1, -1] : [1]) for (const sy of base[1] ? [1, -1] : [1]) for (const sz of base[2] ? [1, -1] : [1])
    saida.push([base[0] * sx, base[1] * sy, base[2] * sz]);
  return saida;
}

/**
 * Altura do anel do d10 para as faces em pipa serem planas, com o ápice em `altura` e o anel de raio 1:
 * o ápice, o meio da corda entre dois vértices de cima e o vértice de baixo entre eles ficam alinhados.
 */
export function deslocamentoDoAnel(altura: number): number {
  const c = Math.cos(Math.PI / 5);
  return altura * (1 - c) / (1 + c);
}

function verticesDe(forma: Forma): Vetor[] {
  switch (forma) {
    case "d4": return combinacoes([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]);
    case "d6": return trocasDeSinal([1, 1, 1]);
    case "d8": return [...trocasDeSinal([1, 0, 0]), ...trocasDeSinal([0, 1, 0]), ...trocasDeSinal([0, 0, 1])];
    case "d10": {
      const altura = 1.05;
      const d = deslocamentoDoAnel(altura);
      const anel = Array.from({ length: 10 }, (_, i) => {
        const angulo = (i * Math.PI) / 5;
        return [Math.cos(angulo), i % 2 === 0 ? d : -d, Math.sin(angulo)] as Vetor;
      });
      return [[0, altura, 0], [0, -altura, 0], ...anel];
    }
    case "d12": return [...trocasDeSinal([1, 1, 1]), ...trocasDeSinal([0, 1 / PHI, PHI]),
      ...trocasDeSinal([1 / PHI, PHI, 0]), ...trocasDeSinal([PHI, 0, 1 / PHI])];
    case "d20": return [...trocasDeSinal([0, 1, PHI]), ...trocasDeSinal([1, PHI, 0]), ...trocasDeSinal([PHI, 0, 1])];
  }
}

/** Faces do envoltório convexo: cada plano por três vértices que deixa todos os outros do mesmo lado. */
export function facesDoEnvoltorio(vertices: Vetor[]): { faces: number[][]; normais: Vetor[] } {
  const centro = escalar(soma(vertices), 1 / vertices.length);
  const faces: number[][] = [];
  const normais: Vetor[] = [];
  const vistas = new Set<string>();
  for (let a = 0; a < vertices.length; a += 1) for (let b = a + 1; b < vertices.length; b += 1)
    for (let c = b + 1; c < vertices.length; c += 1) {
      let n = cross(sub(vertices[b]!, vertices[a]!), sub(vertices[c]!, vertices[a]!));
      if (norma(n) < EPS) continue;
      n = unitario(n);
      if (dot(n, sub(vertices[a]!, centro)) < 0) n = escalar(n, -1);
      const k = dot(n, vertices[a]!);
      const distancias = vertices.map((v) => dot(n, v) - k);
      if (distancias.some((d) => d > 1e-4)) continue;
      const naFace = distancias.flatMap((d, i) => (Math.abs(d) <= 1e-4 ? [i] : []));
      const chave = naFace.join(",");
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      faces.push(ordenarNaFace(vertices, naFace, n));
      normais.push(n);
    }
  return { faces, normais };
}

/** Ordena os vértices de uma face em sentido anti-horário visto de fora (pela normal). */
function ordenarNaFace(vertices: Vetor[], indices: number[], normal: Vetor): number[] {
  const centro = escalar(soma(indices.map((i) => vertices[i]!)), 1 / indices.length);
  const u = unitario(sub(vertices[indices[0]!]!, centro));
  const v = cross(normal, u);
  const angulo = (i: number) => { const d = sub(vertices[i]!, centro); return Math.atan2(dot(d, v), dot(d, u)); };
  return [...indices].sort((x, y) => angulo(x) - angulo(y));
}

/** Gira a ordem de uma face para começar no vértice mais distante do centro dela (o ápice da pipa do d10). */
function comecarNoApice(vertices: Vetor[], face: number[]): number[] {
  const centro = escalar(soma(face.map((i) => vertices[i]!)), 1 / face.length);
  let melhor = 0;
  face.forEach((i, k) => { if (norma(sub(vertices[i]!, centro)) > norma(sub(vertices[face[melhor]!]!, centro)) + EPS) melhor = k; });
  return [...face.slice(melhor), ...face.slice(0, melhor)];
}

/** Raio da esfera que envolve o dado, em unidades do mundo (o d6 fica um pouco menor, como na mesa). */
const RAIO: Record<Forma, number> = { d4: 1.05, d6: 0.95, d8: 1, d10: 1, d12: 1.05, d20: 1.08 };

const cache = new Map<Forma, Solido>();

export function solido(forma: Forma): Solido {
  const pronto = cache.get(forma);
  if (pronto) return pronto;
  const brutos = verticesDe(forma);
  const maior = Math.max(...brutos.map(norma));
  const vertices = brutos.map((v) => escalar(v, RAIO[forma] / maior));
  const { faces, normais } = facesDoEnvoltorio(vertices);
  const resultado: Solido = { forma, vertices, normais, faces: forma === "d10" ? faces.map((f) => comecarNoApice(vertices, f)) : faces };
  cache.set(forma, resultado);
  return resultado;
}

export const FACES_ESPERADAS: Record<Forma, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };

export function centroDaFace(s: Solido, face: number): Vetor {
  const indices = s.faces[face]!;
  return escalar(soma(indices.map((i) => s.vertices[i]!)), 1 / indices.length);
}
