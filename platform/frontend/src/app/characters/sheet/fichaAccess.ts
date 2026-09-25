import { asArray, asNumber, asRecord, asString, type FichaContrato } from "../types";

export interface PersonagemInfo {
  nome: string;
  raca?: string;
  classe?: string;
  arquetipo?: string;
  idade?: number;
  habilidades: Record<string, unknown>[];
}

export function personagemInfo(ficha: FichaContrato): PersonagemInfo {
  const p = asRecord(ficha.personagem);
  return {
    nome: asString(p.nome) ?? "Sem nome",
    raca: asString(p.raca),
    classe: asString(p.classe),
    arquetipo: asString(p.arquetipo),
    idade: asNumber(p.idade),
    habilidades: asArray(p.habilidades).map(asRecord),
  };
}

export function personalidadeInfo(ficha: FichaContrato): Record<string, unknown> {
  return asRecord(ficha.personalidade);
}

export interface RecursoValor {
  atual: number;
  maximo: number;
}

/**
 * PV, PP e outros recursos não existem na ficha legada e não têm fórmula nesta
 * mudança (design 7.1). Lemos `ficha.recursos.<chave>` quando presente; na
 * ausência devolvemos `null` para que a interface informe "não registrado" em
 * vez de inventar um valor.
 */
export function recurso(ficha: FichaContrato, chave: string): RecursoValor | null {
  const recursos = asRecord((ficha as Record<string, unknown>).recursos);
  const valor = asRecord(recursos[chave]);
  const atual = asNumber(valor.atual);
  const maximo = asNumber(valor.maximo);
  if (atual === undefined || maximo === undefined) return null;
  return { atual, maximo };
}

/**
 * Devolve uma cópia de `ficha` com o valor em `path` (ex.: "personagem.nome")
 * substituído. Cria objetos intermediários ausentes; nunca modifica o original.
 */
export function withFieldValue(ficha: FichaContrato, path: string, value: unknown): FichaContrato {
  const segments = path.split(".");
  const clone = structuredClone(ficha) as Record<string, unknown>;
  let cursor = clone;
  for (const key of segments.slice(0, -1)) {
    const current = cursor[key];
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  const lastKey = segments[segments.length - 1];
  if (lastKey !== undefined) cursor[lastKey] = value;
  return clone as unknown as FichaContrato;
}

/** Lê o valor em `path` (ex.: "personalidade.meu_lema") de dentro da ficha. */
export function readFieldValue(ficha: FichaContrato, path: string): unknown {
  const segments = path.split(".");
  let cursor: unknown = ficha;
  for (const key of segments) {
    cursor = asRecord(cursor)[key];
  }
  return cursor;
}
