import { asArray, asNumber, asRecord, asString, imagemDataUrl, type FichaContrato } from "../types";

export interface PersonagemInfo {
  nome: string;
  raca?: string;
  classe?: string;
  arquetipo?: string;
  idade?: number;
  nivel?: number;
  habilidades: Record<string, unknown>[];
  /** URL de dados do retrato (`personagem.imagem_base64`), quando a ficha traz um. */
  imagemUrl?: string;
  imagemAtivo?: string;
  /** Ilustração de corpo inteiro do Resumo, separada do retrato. */
  ilustracaoAtivo?: string;
}

export function personagemInfo(ficha: FichaContrato): PersonagemInfo {
  const p = asRecord(ficha.personagem);
  return {
    nome: asString(p.nome) ?? "Sem nome",
    raca: asString(p.raca),
    classe: asString(p.classe),
    arquetipo: asString(p.arquetipo),
    idade: asNumber(p.idade),
    nivel: asNumber(p.nivel),
    habilidades: asArray(p.habilidades).map(asRecord),
    imagemUrl: imagemDataUrl(asString(p.imagem_base64)),
    imagemAtivo: asString(p.imagem_ativo),
    ilustracaoAtivo: asString(p.ilustracao_ativo),
  };
}

/** Caracteres como o servidor conta (pontos de código), para o contador bater com a recusa. */
export function contarCaracteres(texto: string): number {
  return Array.from(texto).length;
}

export function personalidadeInfo(ficha: FichaContrato): Record<string, unknown> {
  return asRecord(ficha.personalidade);
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
