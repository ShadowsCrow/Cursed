import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { components } from "../../../api/generated/schema";

import { extractErrorMessage, type ApiClient } from "../types";

export type ClasseCatalogo = components["schemas"]["ClasseCatalogoResumo"];
export type RacaCatalogo = components["schemas"]["RacaCatalogoResumo"];
export type ListasFicha = components["schemas"]["ListasFichaResumo"];
export type EfeitoDefault = components["schemas"]["EfeitoDefaultResumo"];
export type EstadoCatalogo = components["schemas"]["EstadoCatalogoResumo"];
export type IconeResumo = components["schemas"]["IconeResumo"];
export type CatalogoItens = components["schemas"]["CatalogoItensResumo"];
export type CatalogoFramework = components["schemas"]["CatalogoFrameworkResumo"];

/** Catálogos do sistema (JSON da plataforma); a leitura passa pela mesa. */
export const catalogoKeys = {
  classes: (mesaId: string) => ["catalogo", mesaId, "classes"] as const,
  racas: (mesaId: string) => ["catalogo", mesaId, "racas"] as const,
  listas: (mesaId: string) => ["catalogo", mesaId, "listas-ficha"] as const,
  efeitosDefault: (mesaId: string) => ["catalogo", mesaId, "efeitos-default"] as const,
  estado: (mesaId: string) => ["catalogo", mesaId, "estado"] as const,
  itens: (mesaId: string) => ["catalogo", mesaId, "itens"] as const,
  framework: (mesaId: string) => ["catalogo", mesaId, "framework"] as const,
};

/** Raridades e categorias de item (reformular-visual-da-ficha); vêm do JSON do sistema, nunca do código. */
export function useCatalogoItens(api: ApiClient | undefined, mesaId: string | undefined): UseQueryResult<CatalogoItens, Error> {
  return useQuery({
    queryKey: catalogoKeys.itens(mesaId ?? ""),
    enabled: Boolean(api && mesaId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await api!.GET("/mesas/{mesa_id}/catalogos/itens", { params: { path: { mesa_id: mesaId! } } });
      // Sem as duas listas, a tela segue sem raridade e categorias em vez de quebrar.
      if (error || !data || !Array.isArray(data.raridades) || !Array.isArray(data.categorias)) {
        throw new Error(extractErrorMessage(error, "Não foi possível carregar o catálogo de itens."));
      }
      return data;
    },
  });
}

/** Tabelas do Framework de Criação (adaptar-cartas-ao-framework): graus, Custo de Uso e opções fechadas. */
export function useCatalogoFramework(api: ApiClient | undefined, mesaId: string | undefined): UseQueryResult<CatalogoFramework, Error> {
  return useQuery({
    queryKey: catalogoKeys.framework(mesaId ?? ""),
    enabled: Boolean(api && mesaId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await api!.GET("/mesas/{mesa_id}/catalogos/framework", { params: { path: { mesa_id: mesaId! } } });
      if (error || !data || !Array.isArray(data.graus)) {
        throw new Error(extractErrorMessage(error, "Não foi possível carregar as tabelas do Framework."));
      }
      return data;
    },
  });
}

export function useClasses(api: ApiClient, mesaId: string): UseQueryResult<ClasseCatalogo[], Error> {
  return useQuery({
    queryKey: catalogoKeys.classes(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/catalogos/classes", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar as classes."));
      return data ?? [];
    },
  });
}

export function useRacas(api: ApiClient, mesaId: string): UseQueryResult<RacaCatalogo[], Error> {
  return useQuery({
    queryKey: catalogoKeys.racas(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/catalogos/racas", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar as raças."));
      return data ?? [];
    },
  });
}

export function useListasFicha(api: ApiClient, mesaId: string): UseQueryResult<ListasFicha, Error> {
  return useQuery({
    queryKey: catalogoKeys.listas(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/catalogos/listas-ficha", { params: { path: { mesa_id: mesaId } } });
      if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível carregar as listas da ficha."));
      return data;
    },
  });
}

export function useEfeitosDefault(api: ApiClient, mesaId: string, enabled = true): UseQueryResult<EfeitoDefault[], Error> {
  return useQuery({
    queryKey: catalogoKeys.efeitosDefault(mesaId),
    enabled,
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/catalogos/efeitos-default", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar os efeitos default."));
      return data ?? [];
    },
  });
}

export function useEstadoCatalogo(api: ApiClient, mesaId: string, enabled: boolean): UseQueryResult<EstadoCatalogo, Error> {
  return useQuery({
    queryKey: catalogoKeys.estado(mesaId),
    enabled,
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/catalogos/estado", { params: { path: { mesa_id: mesaId } } });
      if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível consultar o catálogo."));
      return data;
    },
  });
}

/** Mesma forma comparável do servidor (`catalogos.chave`): sem acento, minúsculas e espaços simples. */
export function chaveCatalogo(texto: string | undefined | null): string {
  return (texto ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

export function acharPorNome<T extends { nome: string }>(lista: T[] | undefined, nome: string | undefined): T | undefined {
  const alvo = chaveCatalogo(nome);
  return alvo ? lista?.find((item) => chaveCatalogo(item.nome) === alvo) : undefined;
}
