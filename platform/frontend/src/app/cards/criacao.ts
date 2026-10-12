import type { components } from "../../api/generated/schema";
import type { CatalogoFramework } from "../characters/sheet/catalogoApi";

/*
 * Cálculos do Framework de Criação (adaptar-cartas-ao-framework, D5): Grau e Descansos Mínimos pelo Custo de
 * Aprendizado e Custo de Uso pela Potência de Uso. Precisa responder exatamente como
 * `cursed_platform/domain/criacao.py`; os casos de `fixtures/criacao/casos.json` são executados pelas duas suítes.
 * O servidor continua a autoridade: aqui é só para o editor mostrar o valor enquanto o Narrador digita.
 */

export type Natureza = "habilidade" | "magia";
/** Os valores calculados como a API os entrega (`CalculadosCarta`). */
export type CalculadosCarta = components["schemas"]["CalculadosCarta"];

export interface Calculados {
  grau: string | null;
  descansos: number | null;
  custoUsoFramework: number | null;
  abaixoDoMinimo: boolean;
}

export interface Alcance {
  tipo: string;
  metros?: number | null;
}

export function ehNatureza(tipo: string): tipo is Natureza {
  return tipo === "habilidade" || tipo === "magia";
}

function inteiro(valor: unknown): number | null {
  return typeof valor === "number" && Number.isInteger(valor) ? valor : null;
}

export function faixa(framework: CatalogoFramework, natureza: Natureza, custo: number | null) {
  if (custo === null) return undefined;
  return framework.naturezas[natureza]?.faixas.find((f) => custo >= f.minimo && (f.maximo == null || custo <= f.maximo));
}

export function custoDeUso(framework: CatalogoFramework, potencia: number | null, tipo: string | null | undefined): number | null {
  if (tipo && framework.sem_custo_uso.includes(tipo)) return 0;
  if (potencia === null) return null;
  return Math.max(framework.minimo_uso, Math.ceil((potencia * potencia) / framework.divisor_uso));
}

export function calcular(framework: CatalogoFramework, natureza: Natureza, conteudo: Record<string, unknown>): Calculados {
  const custo = inteiro(conteudo.custo_aprendizado);
  const encontrada = faixa(framework, natureza, custo);
  const minimo = framework.naturezas[natureza]?.custo_minimo ?? 0;
  return {
    grau: encontrada?.grau ?? null,
    descansos: encontrada?.descansos ?? null,
    custoUsoFramework: custoDeUso(framework, inteiro(conteudo.potencia_uso), typeof conteudo.ativacao === "string" ? conteudo.ativacao : null),
    abaixoDoMinimo: custo !== null && custo < minimo,
  };
}

type ListaDeOpcoes = "graus" | "tipos" | "escolas" | "formas" | "alcances";

export function rotulo(framework: CatalogoFramework | undefined, lista: ListaDeOpcoes, id: unknown): string | null {
  if (typeof id !== "string" || !id) return null;
  return framework?.[lista].find((o) => o.id === id)?.rotulo ?? null;
}

/** "Pessoal", "Toque", "Alcance da arma" ou "12 metros". */
export function textoDoAlcance(framework: CatalogoFramework | undefined, alcance: unknown): string | null {
  if (!alcance || typeof alcance !== "object") return null;
  const { tipo, metros } = alcance as Alcance;
  if (framework && tipo === framework.alcance_com_distancia) {
    return typeof metros === "number" ? `${metros} ${metros === 1 ? "metro" : "metros"}` : null;
  }
  return rotulo(framework, "alcances", tipo);
}

/** Os mesmos valores que o servidor devolve em `calculados`, calculados aqui (biblioteca do Narrador, editor). */
export function calculadosDoConteudo(
  framework: CatalogoFramework | undefined, tipo: string, conteudo: Record<string, unknown>,
): CalculadosCarta | null {
  if (!framework || !ehNatureza(tipo)) return null;
  const calculados = calcular(framework, tipo, conteudo);
  return { grau: calculados.grau, descansos_minimos: calculados.descansos, custo_uso_framework: calculados.custoUsoFramework };
}

/** Custo de Uso que vale: o registrado pelo Narrador ou, sem ele, o do Framework. */
export function custoDeUsoEfetivo(conteudo: Record<string, unknown>, calculados: CalculadosCarta | null | undefined): number | null {
  return inteiro(conteudo.custo_uso) ?? calculados?.custo_uso_framework ?? null;
}
