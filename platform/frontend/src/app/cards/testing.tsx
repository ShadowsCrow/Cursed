import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

import type { CatalogoFramework } from "../characters/sheet/catalogoApi";
import type { ApiClient } from "../characters/types";
import framework from "../../../../../cursed_platform/catalogos/framework.json";

/** O catálogo do Framework como a API o entrega, montado do próprio `framework.json`. */
export const CATALOGO_FRAMEWORK: CatalogoFramework = {
  graus: framework.graus,
  naturezas: framework.naturezas,
  divisor_uso: framework.custo_uso.divisor,
  minimo_uso: framework.custo_uso.minimo,
  sem_custo_uso: framework.custo_uso.sem_custo,
  tipos: framework.tipos,
  escolas: framework.escolas,
  formas: framework.formas,
  alcances: framework.alcances.map(({ id, rotulo }) => ({ id, rotulo })),
  alcance_com_distancia: framework.alcances.find((a) => "distancia" in a && a.distancia)?.id ?? "metros",
};

type Resposta = { data?: unknown; error?: unknown; status?: number };
type Rotas = Record<string, Resposta | ((opcoes: { params?: unknown; body?: unknown }) => Resposta)>;

/** Cliente simulado por método e rota; rotas ausentes falham de forma explícita. */
export function apiSimulada(rotas: { GET?: Rotas; POST?: Rotas; PUT?: Rotas }) {
  function metodo(nome: "GET" | "POST" | "PUT") {
    return vi.fn(async (caminho: string, opcoes: { params?: unknown; body?: unknown } = {}) => {
      const rota = rotas[nome]?.[caminho];
      if (!rota) throw new Error(`${nome} não simulado: ${caminho}`);
      const resposta = typeof rota === "function" ? rota(opcoes) : rota;
      return { data: resposta.data, error: resposta.error, response: { status: resposta.status ?? (resposta.error ? 400 : 200) } };
    });
  }
  const GET = metodo("GET");
  const POST = metodo("POST");
  const PUT = metodo("PUT");
  return { api: { GET, POST, PUT } as unknown as ApiClient, GET, POST, PUT };
}

export function renderComQuery(elemento: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{elemento}</QueryClientProvider>);
}

export function versao(id: string, tipo: "habilidade" | "magia" | "item" | "efeito", conteudo: Record<string, unknown>, numero = 1) {
  return {
    id, definicao_id: `def-${id}`, numero, tipo, conteudo: { tipo, ...conteudo },
    procedencia: { origem: "narrador" }, revisao_pendente: [], publicado_por: "mestre", publicado_em: "2026-09-25T12:00:00Z",
  };
}

export function visivel(id: string, tipo: "habilidade" | "magia" | "item" | "efeito", titulo: string, numero = 1) {
  return { versao_id: id, definicao_id: `def-${id}`, numero, tipo, conteudo: { tipo, titulo, texto: `Texto de ${titulo}` } };
}

/** Elemento na posição indicada; falha de forma explícita se não existir. */
export function em<T>(lista: readonly T[], indice: number): T {
  const valor = lista.at(indice);
  if (valor === undefined) throw new Error(`Elemento ${indice} ausente.`);
  return valor;
}
