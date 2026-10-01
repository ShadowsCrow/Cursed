import type { FichaContrato } from "../types";
import { GRUPOS_ATRIBUTOS, GRUPOS_PERICIAS } from "../sheet/sheetCatalog";
import { lerAltura } from "./altura";
import type { Valores } from "./distribuicao";

/** Etapas do assistente, na ordem do capítulo "Criação de Personagem" (só o que a ficha modela). */
export const ETAPAS = [
  "conceito", "identidade", "raca", "classe", "atributos", "pericias", "personalidade", "conferencia",
] as const;
export type EtapaId = (typeof ETAPAS)[number];

export const NOMES_ATRIBUTOS = GRUPOS_ATRIBUTOS.flatMap((grupo) => grupo.nomes);
export const NOMES_PERICIAS = GRUPOS_PERICIAS.flatMap((grupo) => grupo.nomes);

/** Nomes gravados sem acento (compatibilidade com fichas antigas) mostrados com a grafia do livro. */
const GRAFIA: Record<string, string> = {
  Proposito: "Propósito", Oficios: "Ofícios", Linguistica: "Linguística", Politica: "Política",
};
export const exibir = (nome: string) => GRAFIA[nome] ?? nome;

export interface FichaRascunho {
  personagem: {
    nome: string;
    /** Texto digitado; vira número só ao montar a ficha. */
    idade: string;
    sexo: string;
    raca: string;
    /** Altura digitada em metros ("1,75"); vira número só ao montar a ficha. */
    altura: string;
    /** Fora da média da raça: o Tamanho passa ao vizinho (design D12). */
    fora_da_media: "" | "acima" | "abaixo";
    /** Tamanho vizinho escolhido fora da média; vazio na média (vale o da raça). */
    tamanho: string;
    classe: string;
    arquetipo: string;
  };
  atributos: Valores;
  pericias: Valores;
  /** Alinhamento, pecado e campos narrativos, pelas chaves da ficha; os Traços são uma lista. */
  personalidade: Record<string, ValorPersonalidade>;
}

/** Texto, ou lista de palavras curtas nos Traços (reformular-personalidade-da-ficha, D3). */
export type ValorPersonalidade = string | string[];

/** O campo tem algo escrito: texto não vazio ou lista com ao menos um traço. */
export function preenchido(valor: ValorPersonalidade | undefined): boolean {
  return Array.isArray(valor) ? valor.some((t) => t.trim()) : Boolean(valor?.trim());
}

export interface EstadoAssistente {
  etapa: EtapaId;
  /** Etapa mais adiantada já alcançada; etapas depois dela não podem ser abertas pela lista. */
  alcancada: EtapaId;
  ficha: FichaRascunho;
  /** Saída explícita "seguir sem a distribuição padrão", por categoria. */
  foraDoPadrao: { atributos: boolean; pericias: boolean };
}

export function fichaVazia(): FichaRascunho {
  return {
    personagem: { nome: "", idade: "", sexo: "", raca: "", altura: "", fora_da_media: "", tamanho: "", classe: "", arquetipo: "" },
    atributos: {},
    pericias: {},
    personalidade: {},
  };
}

export function estadoInicial(): EstadoAssistente {
  return { etapa: "conceito", alcancada: "conceito", ficha: fichaVazia(), foraDoPadrao: { atributos: false, pericias: false } };
}

export function indiceDa(etapa: EtapaId): number {
  return ETAPAS.indexOf(etapa);
}

export function ehEtapa(valor: unknown): valor is EtapaId {
  return typeof valor === "string" && (ETAPAS as readonly string[]).includes(valor);
}

/** Idade digitada: vazia, inteiro válido ou texto inválido. */
export function lerIdade(texto: string): { vazia: true } | { vazia: false; valor: number | null } {
  const limpo = texto.trim();
  if (!limpo) return { vazia: true };
  return { vazia: false, valor: /^-?\d+$/.test(limpo) ? Number(limpo) : null };
}

/**
 * Ficha enviada ao servidor (prévia e criação). Sem nível, PV/PP ou cartas: o servidor começa o
 * personagem no nível 1, enche PV e PP e concede as cartas. Campos opcionais vazios não vão.
 */
export function montarFicha(ficha: FichaRascunho): FichaContrato {
  const p = ficha.personagem;
  const personagem: Record<string, unknown> = { nome: p.nome.trim() };
  const idade = lerIdade(p.idade);
  if (!idade.vazia) personagem.idade = idade.valor ?? p.idade.trim();
  for (const campo of ["sexo", "raca", "classe", "arquetipo"] as const) {
    if (p[campo].trim()) personagem[campo] = p[campo].trim();
  }
  const altura = lerAltura(p.altura);
  if (!altura.vazia) personagem.altura = altura.valor ?? p.altura.trim();
  if (p.fora_da_media && p.tamanho.trim()) personagem.tamanho = p.tamanho.trim();
  const atributos: Record<string, number> = {};
  for (const nome of NOMES_ATRIBUTOS) {
    const valor = ficha.atributos[nome];
    if (valor !== undefined && !Number.isNaN(valor)) atributos[nome] = valor;
  }
  const pericias: Record<string, number> = {};
  for (const nome of NOMES_PERICIAS) {
    const valor = ficha.pericias[nome];
    pericias[nome] = valor === undefined || Number.isNaN(valor) ? 0 : valor;
  }
  const personalidade: Record<string, ValorPersonalidade> = {};
  for (const [chave, valor] of Object.entries(ficha.personalidade)) {
    if (!preenchido(valor)) continue;
    personalidade[chave] = Array.isArray(valor) ? valor.map((t) => t.trim()).filter(Boolean) : valor.trim();
  }
  return {
    personagem,
    atributos: { valores: atributos },
    pericias: { valores: pericias },
    personalidade,
  } as FichaContrato;
}
