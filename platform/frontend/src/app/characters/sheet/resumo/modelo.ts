/**
 * Modelo de apresentação do Resumo da ficha (aba-resumo-da-ficha). O componente visual só
 * recebe valores prontos: quem monta o modelo lê a ficha e os valores calculados pelo servidor,
 * e nada aqui calcula regra. `null` é valor que o servidor não calcula; `undefined` é campo vazio.
 */
import type { ReactNode } from "react";

import type { NomeIconeFicha } from "./ornamentos";

/** Abas da ficha para onde os atalhos dos quadros levam. */
export type SecaoDoResumo = "informacoes" | "status" | "atributos" | "pericias" | "equipamentos" | "cartas" | "personalidade";

export interface ValorDoResumo {
  valor: number | null;
  /** Por que o servidor não calculou o valor, quando `valor` é `null`. */
  motivo?: string;
}

export interface RecursoDoResumo extends ValorDoResumo {
  /** Valor atual registrado na ficha (PV e PP); ausente quando não registrado. */
  atual?: number;
}

export interface LinhaDoResumo extends ValorDoResumo {
  nome: string;
  icone?: NomeIconeFicha;
}

export interface GrupoDeAtributos {
  titulo: string;
  itens: LinhaDoResumo[];
}

export interface ItemDoResumo {
  nome: string;
  quantidade: number;
  descricao?: string;
  /** URL já resolvida da arte ou do ícone de grade. */
  imagem?: string;
  /** Arte montada por quem chama (ex.: imagem privada carregada sob demanda); tem prioridade sobre `imagem`. */
  arte?: ReactNode;
  tipo: "arma" | "armadura" | "outro";
}

export interface HabilidadeDoResumo {
  nome: string;
  tipo: "habilidade" | "magia";
  descricao?: string;
  imagem?: string;
  arte?: ReactNode;
}

export interface ListaLimitada<T> {
  visiveis: T[];
  /** Quantos ficaram fora da lista ("e mais N"). */
  restantes: number;
}

export interface ModeloDoResumo {
  nome: string;
  classe?: string;
  arquetipo?: string;
  raca?: string;
  nivel?: number;
  /** Cor da classe no catálogo; só complementa o nome escrito. */
  corClasse?: string;
  imagem: { src: string; origem: "ilustracao" | "retrato" | "padrao" };
  recursos: {
    pv: RecursoDoResumo;
    pp: RecursoDoResumo;
    defesa: ValorDoResumo;
    armadura: ValorDoResumo;
    rdb: ValorDoResumo;
  };
  atributos: GrupoDeAtributos[];
  pericias: LinhaDoResumo[];
  equipamentos: ListaLimitada<ItemDoResumo>;
  habilidades: ListaLimitada<HabilidadeDoResumo>;
  historia?: string;
}

export const IMAGEM_PADRAO = "/arte/retrato-vazio.webp";

/** Pinturas opcionais da cena, geradas fora do repositório (`preparar_arte.py`); as que faltarem não aparecem. */
export const ARTE_DO_RESUMO = {
  cena: "/arte/resumo-cena.webp",
  primeiroPlano: "/arte/resumo-primeiro-plano.webp",
  naturezaMorta: "/arte/resumo-natureza-morta.webp",
  bussola: "/arte/resumo-bussola.webp",
} as const;

/** Parágrafos separados por linha em branco; quebras simples ficam dentro do parágrafo. */
export function paragrafosDaHistoria(historia: string | undefined): string[] {
  return (historia ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
