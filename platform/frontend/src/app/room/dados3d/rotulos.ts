/**
 * Números das faces dos dados 3D (melhorias-da-sala, item 3, D9). Depois de simular o arremesso, a face
 * (no d4, o vértice) que parou em cima recebe o valor sorteado pelo rolador, trocando de lugar com o número
 * que estaria nela. A física e o movimento gravado não mudam.
 */
import type { Faces } from "../dados";
import { dot, solido, type Forma, type Vetor } from "./geometria";

/** Comum: 1 a N. O d100 vira o par de porcentagem: dezenas (00 a 90) e unidades (0 a 9). */
export type Conjunto = "comum" | "dezenas" | "unidades";

export interface DadoParaAnimar {
  forma: Forma;
  conjunto: Conjunto;
  /** O que deve aparecer em cima quando o dado parar. */
  rotulo: string;
  /** Brilho ao parar (gamificacao-da-sala): dourado no crítico, rubro na falha crítica. */
  destaque?: "critico" | "falha_critica";
}

/** Quatérnio [x, y, z, w]. */
export type Quaternio = readonly [number, number, number, number];

const CIMA: Vetor = [0, 1, 0];

/** Dados a lançar para um resultado do rolador: um por dado, e dois no d100. */
export function dadosParaAnimar(faces: Faces, valor: number): DadoParaAnimar[] {
  if (faces === 100) {
    const resto = valor % 100;
    return [
      { forma: "d10", conjunto: "dezenas", rotulo: String(Math.floor(resto / 10) * 10).padStart(2, "0") },
      { forma: "d10", conjunto: "unidades", rotulo: String(valor % 10) },
    ];
  }
  return [{ forma: `d${faces}` as Forma, conjunto: "comum", rotulo: String(valor) }];
}

/** Valor do par de porcentagem: 00 e 0 valem 100. */
export function valorDoPercentual(dezenas: string, unidades: string): number {
  const total = Number(dezenas) + Number(unidades);
  return total === 0 ? 100 : total;
}

/**
 * Números iniciais, por face (no d4, por vértice). Faces opostas somam N + 1, como nos dados de verdade.
 */
export function rotulosIniciais(forma: Forma, conjunto: Conjunto = "comum"): string[] {
  const s = solido(forma);
  const quantos = forma === "d4" ? s.vertices.length : s.faces.length;
  const texto = (k: number) => conjunto === "dezenas" ? String((k % 10) * 10).padStart(2, "0")
    : conjunto === "unidades" ? String(k % 10) : String(k);
  if (forma === "d4") return Array.from({ length: quantos }, (_, i) => texto(i + 1));
  const rotulos: string[] = new Array(quantos).fill("");
  let proximo = 1;
  s.normais.forEach((normal, i) => {
    if (rotulos[i]) return;
    const oposta = s.normais.findIndex((m, j) => j !== i && !rotulos[j] && dot(normal, m) < -0.999);
    rotulos[i] = texto(proximo);
    if (oposta >= 0) rotulos[oposta] = texto(quantos + 1 - proximo);
    proximo += 1;
  });
  return rotulos;
}

export function girar(q: Quaternio, v: Vetor): Vetor {
  const [x, y, z, w] = q;
  // v' = v + 2w(q × v) + 2 q × (q × v)
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

/** Índice da face (no d4, do vértice) que está em cima com a orientação dada. */
export function indiceDeCima(forma: Forma, orientacao: Quaternio): number {
  const s = solido(forma);
  const candidatos = forma === "d4" ? s.vertices : s.normais;
  let melhor = 0;
  let maior = -Infinity;
  candidatos.forEach((v, i) => {
    const altura = dot(girar(orientacao, v), CIMA);
    if (altura > maior) { maior = altura; melhor = i; }
  });
  return melhor;
}

/** Troca os números para que o índice de cima mostre o rótulo desejado. */
export function forcarResultado(rotulos: string[], indiceCima: number, desejado: string): string[] {
  const onde = rotulos.indexOf(desejado);
  if (onde < 0) throw new Error(`Rótulo ${desejado} não existe neste dado.`);
  const saida = [...rotulos];
  [saida[indiceCima], saida[onde]] = [saida[onde]!, saida[indiceCima]!];
  return saida;
}

/** No d4, os números que cada face mostra: um perto de cada vértice dela, na ordem dos vértices da face. */
export function rotulosDaFaceDoD4(rotulosDosVertices: string[], face: number): string[] {
  return solido("d4").faces[face]!.map((vertice) => rotulosDosVertices[vertice]!);
}
