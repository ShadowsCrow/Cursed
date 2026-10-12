/**
 * Distribuição inicial de Atributos e Perícias (design D4 de criacao-guiada-e-nova-estetica).
 *
 * É a única regra numérica do livro que o cliente conhece, e só como orientação do assistente:
 * o servidor valida apenas os limites. Fonte: `rules/sistema/Criação de Personagem.md`, seções
 * 5 (Atributos: um `3`, quatro `2`, quatro `1`, 15 pontos) e 6 (Perícias: uma `3`, três `2`,
 * quatro `1`, demais `0`, 13 pontos). Se o padrão passar a variar por mesa, estas constantes
 * migram para os dados do sistema.
 */

export type Categoria = "atributos" | "pericias";
export type ValorPadrao = 3 | 2 | 1;
export type Valores = Record<string, number | undefined>;

export const VALORES_PADRAO: ValorPadrao[] = [3, 2, 1];

export const DISTRIBUICAO: Record<Categoria, Record<ValorPadrao, number>> = {
  atributos: { 3: 1, 2: 4, 1: 4 },
  pericias: { 3: 1, 2: 3, 1: 4 },
};

/** Limites do servidor (`validacao_ficha.py`): Atributo base de 1 a 5, Perícia base de 0 a 5. */
export const LIMITES: Record<Categoria, { minimo: number; maximo: number }> = {
  atributos: { minimo: 1, maximo: 5 },
  pericias: { minimo: 0, maximo: 5 },
};

export const TOTAL_PADRAO: Record<Categoria, number> = {
  atributos: 15,
  pericias: 13,
};

const ROTULO: Record<Categoria, { singular: string; plural: string; artigo: string }> = {
  atributos: { singular: "Atributo", plural: "Atributos", artigo: "O" },
  pericias: { singular: "Perícia", plural: "Perícias", artigo: "A" },
};

export interface Excedente {
  valor: number;
  /** Quantos podem ter este valor na distribuição padrão (0 para valores fora dela). */
  permitido: number;
  nomes: string[];
}

export interface EstadoDistribuicao {
  /** Quantos de cada valor ainda faltam atribuir (nunca negativo). */
  faltam: Record<ValorPadrao, number>;
  excedentes: Excedente[];
  /** Nomes sem valor. Perícias sem valor contam como `0`, então só Atributos aparecem aqui. */
  semValor: string[];
  foraDoLimite: { nome: string; valor: number }[];
  /** A distribuição padrão está completa e correta. */
  fecha: boolean;
  /** Todos os valores existem e respeitam os limites do servidor (basta fora do padrão). */
  dentroDosLimites: boolean;
}

/** Valor efetivo: Perícia sem valor é `0`; Atributo sem valor fica ausente. */
export function valorEfetivo(categoria: Categoria, valores: Valores, nome: string): number | undefined {
  const valor = valores[nome];
  if (valor === undefined || Number.isNaN(valor)) return categoria === "pericias" ? 0 : undefined;
  return valor;
}

export function mensagemDeLimite(categoria: Categoria): string {
  const { minimo, maximo } = LIMITES[categoria];
  return `${ROTULO[categoria].artigo} ${ROTULO[categoria].singular} base vai de ${minimo} a ${maximo}.`;
}

export function avaliar(categoria: Categoria, nomes: string[], valores: Valores): EstadoDistribuicao {
  const alvo = DISTRIBUICAO[categoria];
  const { minimo, maximo } = LIMITES[categoria];
  const porValor = new Map<number, string[]>();
  const semValor: string[] = [];
  const foraDoLimite: { nome: string; valor: number }[] = [];

  for (const nome of nomes) {
    const valor = valorEfetivo(categoria, valores, nome);
    if (valor === undefined) {
      semValor.push(nome);
      continue;
    }
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) foraDoLimite.push({ nome, valor });
    porValor.set(valor, [...(porValor.get(valor) ?? []), nome]);
  }

  const faltam = { 3: 0, 2: 0, 1: 0 } as Record<ValorPadrao, number>;
  for (const valor of VALORES_PADRAO) faltam[valor] = Math.max(0, alvo[valor] - (porValor.get(valor)?.length ?? 0));

  const excedentes: Excedente[] = [];
  for (const [valor, lista] of [...porValor.entries()].sort(([a], [b]) => b - a)) {
    if (categoria === "pericias" && valor === 0) continue;
    const permitido = (alvo as Record<number, number>)[valor] ?? 0;
    if (lista.length > permitido) excedentes.push({ valor, permitido, nomes: lista });
  }

  const dentroDosLimites = semValor.length === 0 && foraDoLimite.length === 0;
  const fecha = dentroDosLimites && excedentes.length === 0 && VALORES_PADRAO.every((v) => faltam[v] === 0);
  return { faltam, excedentes, semValor, foraDoLimite, fecha, dentroDosLimites };
}

/**
 * Pode `nome` receber `valor` sem passar da quantidade da distribuição padrão? Devolve quem já
 * ocupa todas as vagas desse valor quando não pode.
 */
export function vagaPara(categoria: Categoria, nomes: string[], valores: Valores, nome: string, valor: number):
  { cabe: true } | { cabe: false; ocupadoPor: string[] } {
  if (categoria === "pericias" && valor === 0) return { cabe: true };
  const permitido = (DISTRIBUICAO[categoria] as Record<number, number>)[valor] ?? 0;
  const ocupadoPor = nomes.filter((outro) => outro !== nome && valorEfetivo(categoria, valores, outro) === valor);
  return ocupadoPor.length < permitido ? { cabe: true } : { cabe: false, ocupadoPor };
}

const NUMERAIS = ["nenhum", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];

function numeral(n: number, feminino: boolean): string {
  if (feminino && n === 1) return "uma";
  if (feminino && n === 2) return "duas";
  return NUMERAIS[n] ?? String(n);
}

export function listar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/** Mensagem para uma escolha recusada, ex.: "O único 3 já foi usado em Vigor." */
export function mensagemSemVaga(categoria: Categoria, valor: number, ocupadoPor: string[]): string {
  const permitido = (DISTRIBUICAO[categoria] as Record<number, number>)[valor] ?? 0;
  if (permitido === 0) return `A distribuição padrão não usa o valor ${valor}.`;
  if (permitido === 1) return `O único ${valor} já foi usado em ${listar(ocupadoPor)}.`;
  return `Os ${numeral(permitido, false)} ${valor} já foram usados em ${listar(ocupadoPor)}.`;
}

/** Problemas da distribuição padrão, em frases, para mostrar junto aos contadores. */
export function problemas(categoria: Categoria, estado: EstadoDistribuicao): string[] {
  const rotulo = ROTULO[categoria];
  const feminino = categoria === "pericias";
  const frases: string[] = [];
  if (estado.semValor.length > 0) {
    frases.push(`${estado.semValor.length === 1 ? `Falta dar valor a 1 ${rotulo.singular}` : `Faltam valores para ${estado.semValor.length} ${rotulo.plural}`}: ${listar(estado.semValor)}.`);
  }
  for (const { valor, permitido, nomes } of estado.excedentes) {
    frases.push(permitido === 0
      ? `A distribuição padrão não usa o valor ${valor} (${listar(nomes)}).`
      : `Só ${numeral(permitido, feminino)} ${permitido === 1 ? rotulo.singular : rotulo.plural} ${permitido === 1 ? "pode" : "podem"} ter ${valor}; hoje são ${nomes.length}: ${listar(nomes)}.`);
  }
  for (const { nome } of estado.foraDoLimite) frases.push(`${nome}: ${mensagemDeLimite(categoria)}`);
  return frases;
}

/** Texto dos contadores, ex.: "Falta 1 de valor 3". */
export function textoFaltam(quantidade: number, valor: number): string {
  if (quantidade === 0) return `Valor ${valor}: completo`;
  return `Valor ${valor}: ${quantidade === 1 ? "falta 1" : `faltam ${quantidade}`}`;
}
