import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useState } from "react";

import type { ProblemaValidacao } from "./types";

/*
 * Problemas de validação junto do campo (simplificar-criacao-de-cartas, D5). O servidor devolve o caminho do
 * campo (`dados.tipo_dano`, `efeitos.0.modificadores`); o editor nunca o mostra. Cada caminho vira uma âncora
 * (o quadro que o Narrador vê), e cada quadro se registra com o rótulo da tela. Problema sem quadro na tela
 * aparece no topo da página, com o rótulo da âncora.
 */

const ITENS_DO_FORMATO = new Set(["mochila", "aljava", "categoria", "maos", "pilha_max", "versatil"]);

/** O quadro a que um caminho do servidor pertence. */
export function ancoraDoProblema(campo: string): string {
  const [raiz = "", segundo] = campo.split(".");
  if (raiz === "formato") {
    if (segundo === "largura" || segundo === "altura") return "formato.dimensao";
    if (segundo === "raridade") return "raridade";
    if (segundo === "icone_grade") return "icone";
    if (segundo && ITENS_DO_FORMATO.has(segundo)) return `formato.${segundo}`;
    return "formato";
  }
  if (raiz === "item_tipo") return "formato";
  if ((raiz === "dados" || raiz === "efeitos" || raiz === "custos_adicionais") && segundo) return `${raiz}.${segundo}`;
  if (raiz === "ativos" || raiz === "ativos_privados") return "arte";
  return raiz || "carta";
}

/** Rótulo das âncoras para o topo da página, quando o quadro não está na tela. */
const ROTULOS: Record<string, string> = {
  titulo: "Título", texto: "Descrição", requisitos: "Requisitos", tags: "Marcações", ativacao: "Tipo",
  escola: "Escola", grau: "Grau", custo_aprendizado: "Custo de Aprendizado", descansos_minimos: "Descansos Mínimos",
  potencia_uso: "Potência de Uso", custo_uso: "Custo de Uso", custo_legado: "Custo legado", formato: "O que é?",
  "formato.dimensao": "Espaço na bolsa", raridade: "Raridade", icone: "Ícone na bolsa", arte: "Arte da carta",
  quantidade: "Quantidade", modificadores: "Modificadores", duracao_rodadas: "Duração", tipo: "Tipo da carta",
  // Campos do Framework (adaptar-cartas-ao-framework).
  disciplina: "Disciplina", lancamento: "Lançamento", combo: "Combo", persistencia: "Persistência", alcance: "Alcance",
  forma: "Forma", alvo_area: "Alvo ou Área", impactos: "Impactos", duracao: "Duração", efeito_principal: "Efeito principal",
  efeitos_secundarios: "Efeitos secundários", efeitos_condicionais: "Efeitos condicionais", teste: "Teste",
  componentes: "Componentes", limitacoes: "Limitações", escalonamento: "Escalonamento",
};

export function rotuloDaAncora(ancora: string): string {
  if (ROTULOS[ancora]) return ROTULOS[ancora];
  const [raiz, indice] = ancora.split(".");
  if (raiz === "efeitos") return `Efeito ${Number(indice) + 1}`;
  if (raiz === "custos_adicionais") return `Custo adicional ${Number(indice) + 1}`;
  if (raiz === "dados") return "Campo do item";
  return "Carta";
}

/** Avisos de revisão (textos do servidor) vão para o quadro a que se referem. */
export function ancoraDoAviso(aviso: string): string {
  if (/custo legado/i.test(aviso)) return "custo_legado";
  if (/^Custo de Uso/.test(aviso)) return "custo_uso";
  if (/^Custo de Aprendizado/.test(aviso)) return "custo_aprendizado";
  if (/^Tipo:/.test(aviso)) return "ativacao";
  if (/arte|imagem|ícone/i.test(aviso)) return "arte";
  if (/dimens|formato|grade/i.test(aviso)) return "formato";
  return "carta";
}

interface Registro { id: string; rotulo: string }

export interface ContextoDosProblemas {
  problemas: (ancora: string) => string[];
  avisos: (ancora: string) => string[];
  registrar: (ancora: string, registro: Registro) => () => void;
}

export const ContextoDeProblemas = createContext<ContextoDosProblemas | null>(null);

export interface UsoDosProblemas {
  /** Total de problemas (pendências da publicação). */
  total: number;
  /** Problemas sem quadro na tela, com o rótulo. */
  soltos: { rotulo: string; mensagem: string }[];
  /** Avisos de revisão sem quadro na tela. */
  avisosSoltos: string[];
  /** Leva o foco ao primeiro quadro com problema; devolve se achou um. */
  focarPrimeiro: () => boolean;
  /** Valor do `ProvedorDeProblemas` que envolve o formulário. */
  contexto: ContextoDosProblemas;
}

function agrupar<T>(itens: readonly T[], chave: (item: T) => string, valor: (item: T) => string): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const item of itens) mapa.set(chave(item), [...(mapa.get(chave(item)) ?? []), valor(item)]);
  return mapa;
}

export function useProblemasDoEditor(problemas: ProblemaValidacao[], avisos: string[]): UsoDosProblemas {
  const [registros, setRegistros] = useState<ReadonlyMap<string, Registro>>(new Map());
  const porAncora = useMemo(() => agrupar(problemas, (p) => ancoraDoProblema(p.campo), (p) => p.mensagem), [problemas]);
  const avisosPorAncora = useMemo(() => agrupar(avisos, ancoraDoAviso, (a) => a), [avisos]);

  const registrar = useCallback((ancora: string, registro: Registro) => {
    setRegistros((atual) => new Map(atual).set(ancora, registro));
    return () => setRegistros((atual) => {
      if (atual.get(ancora) !== registro) return atual;
      const proximo = new Map(atual);
      proximo.delete(ancora);
      return proximo;
    });
  }, []);
  const contexto = useMemo<ContextoDosProblemas>(() => ({
    problemas: (ancora) => porAncora.get(ancora) ?? [],
    avisos: (ancora) => avisosPorAncora.get(ancora) ?? [],
    registrar,
  }), [porAncora, avisosPorAncora, registrar]);

  const soltos = problemas
    .filter((p) => !registros.has(ancoraDoProblema(p.campo)))
    .map((p) => ({ rotulo: rotuloDaAncora(ancoraDoProblema(p.campo)), mensagem: p.mensagem }));
  const avisosSoltos = avisos.filter((a) => !registros.has(ancoraDoAviso(a)));

  const focarPrimeiro = useCallback(() => {
    for (const problema of problemas) {
      const registro = registros.get(ancoraDoProblema(problema.campo));
      const elemento = registro && document.getElementById(registro.id);
      if (elemento) {
        const alvo = elemento.querySelector<HTMLElement>("input, select, textarea, button") ?? elemento;
        alvo.focus();
        return true;
      }
    }
    return false;
  }, [problemas, registros]);

  return { total: problemas.length, soltos, avisosSoltos, focarPrimeiro, contexto };
}

/** Registra o quadro de uma âncora e devolve os ids e as mensagens dele. */
export function useProblemasDoCampo(ancora: string, rotulo: string) {
  const contexto = useContext(ContextoDeProblemas);
  const id = useId();
  const descricao = `${id}-problemas`;
  const registrar = contexto?.registrar;
  useLayoutEffect(() => registrar?.(ancora, { id, rotulo }), [registrar, ancora, id, rotulo]);
  const mensagens = contexto?.problemas(ancora) ?? [];
  const avisos = contexto?.avisos(ancora) ?? [];
  return { id, descricao: mensagens.length || avisos.length ? descricao : undefined, mensagens, avisos };
}
