import { useQuery } from "@tanstack/react-query";

import type { components } from "../../api/generated/schema";
import { extractErrorMessage, type ApiClient } from "../characters/types";

/*
 * Consultas e comandos da navegação inicial (navegacao-inicial-e-perfil). Nada aqui calcula valor
 * de ficha: tudo vem do servidor como está.
 */

export type MesaResumo = components["schemas"]["MesaResumo"];
export type MesaDetalhe = components["schemas"]["MesaDetalhe"];
export type PerfilResposta = components["schemas"]["PerfilResposta"];
export type AcervoPersonagem = components["schemas"]["AcervoPersonagem"];
export type Colecao = "meus" | "npcs" | "monstros";
export type Lado = "narrando" | "jogando";

/** Nome de exibição de cada sistema; o banco guarda só o identificador. */
export const SISTEMAS: Record<MesaResumo["sistema"], string> = { cursed: "Cursed" };

export const chaves = {
  perfil: ["perfil"] as const,
  mesas: (userId: string) => ["mesas", userId] as const,
  mesa: (mesaId: string) => ["mesa", mesaId] as const,
  personagensDaMesa: (mesaId: string) => ["personagens", mesaId] as const,
  acervo: (colecao: Colecao) => ["acervo", colecao] as const,
  foto: (usuarioId: string) => ["foto-perfil", usuarioId] as const,
};

export function usePerfil(api: ApiClient) {
  return useQuery({
    queryKey: chaves.perfil,
    queryFn: async () => {
      const { data, error } = await api.GET("/perfil");
      if (error || !data) throw new Error("Não foi possível carregar o seu perfil.");
      return data;
    },
  });
}

export async function gravarApelido(api: ApiClient, apelido: string): Promise<PerfilResposta> {
  const { data, error } = await api.PUT("/perfil", { body: { apelido } });
  if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível gravar o apelido."));
  return data;
}

export async function enviarFotoDoPerfil(api: ApiClient, arquivo: File): Promise<void> {
  const formulario = new FormData();
  formulario.append("arquivo", arquivo);
  const { error } = await api.PUT("/perfil/foto", {
    body: formulario as unknown as components["schemas"]["Body_enviar_foto_perfil_foto_put"],
    bodySerializer: (corpo) => corpo as unknown as FormData,
  });
  if (error) throw new Error(extractErrorMessage(error, "Não foi possível enviar a foto."));
}

export async function removerFotoDoPerfil(api: ApiClient): Promise<void> {
  const { error } = await api.DELETE("/perfil/foto");
  if (error) throw new Error(extractErrorMessage(error, "Não foi possível remover a foto."));
}

/** Foto do perfil de alguém (própria ou de quem divide mesa). Sem foto ou sem acesso: `null`. */
export function useFotoDoPerfil(api: ApiClient, usuarioId: string, temFoto: boolean) {
  return useQuery({
    queryKey: chaves.foto(usuarioId),
    enabled: temFoto,
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await api.GET("/perfis/{usuario_id}/foto", { params: { path: { usuario_id: usuarioId } } });
      if (error || !data) return null;
      return `data:${data.tipo};base64,${data.base64}`;
    },
  });
}

export function useMesas(api: ApiClient, userId: string) {
  return useQuery({
    queryKey: chaves.mesas(userId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas");
      if (error) throw new Error("Não foi possível carregar as campanhas.");
      return data ?? [];
    },
  });
}

export function useMesaDetalhe(api: ApiClient, mesaId: string | undefined) {
  return useQuery({
    queryKey: chaves.mesa(mesaId ?? ""),
    enabled: Boolean(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}", { params: { path: { mesa_id: mesaId as string } } });
      if (error || !data) throw new Error("Não foi possível carregar a campanha.");
      return data;
    },
  });
}

export function usePersonagensDaMesa(api: ApiClient, mesaId: string | undefined) {
  return useQuery({
    queryKey: chaves.personagensDaMesa(mesaId ?? ""),
    enabled: Boolean(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/personagens", { params: { path: { mesa_id: mesaId as string } } });
      if (error) throw new Error("Não foi possível carregar os personagens.");
      return data ?? [];
    },
  });
}

export function usePoliticaDaMesa(api: ApiClient, mesaId: string | undefined) {
  return useQuery({
    queryKey: ["politicas", mesaId ?? ""],
    enabled: Boolean(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/politicas", { params: { path: { mesa_id: mesaId as string } } });
      if (error || !data) throw new Error("Não foi possível carregar as regras da mesa.");
      return data;
    },
  });
}

export async function criarCampanha(api: ApiClient, nome: string): Promise<MesaResumo> {
  const { data, error } = await api.POST("/mesas", { body: { nome } });
  if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível criar a campanha."));
  return data;
}

export async function atualizarCampanha(api: ApiClient, mesaId: string, nome: string, sinopse: string): Promise<MesaResumo> {
  const { data, error } = await api.PUT("/mesas/{mesa_id}", {
    params: { path: { mesa_id: mesaId } }, body: { nome, sinopse: sinopse.trim() ? sinopse : null },
  });
  if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível gravar a campanha."));
  return data;
}

export async function aceitarConvite(api: ApiClient, codigo: string): Promise<MesaResumo> {
  const { data, error } = await api.POST("/convites/aceitar", { body: { codigo } });
  if (error || !data) throw new Error(extractErrorMessage(error, "Convite indisponível."));
  return data;
}

export async function criarConvite(api: ApiClient, mesaId: string) {
  const { data, error } = await api.POST("/mesas/{mesa_id}/convites", {
    params: { path: { mesa_id: mesaId } }, body: { validade_dias: 7 },
  });
  if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível gerar o convite."));
  return data;
}

export function useAcervo(api: ApiClient, colecao: Colecao) {
  return useQuery({
    queryKey: chaves.acervo(colecao),
    queryFn: async () => {
      const { data, error } = await api.GET("/acervo/personagens", { params: { query: { colecao } } });
      if (error) throw new Error("Não foi possível carregar os personagens.");
      return data ?? [];
    },
  });
}

export async function copiarPersonagem(api: ApiClient, destino: string, origem: AcervoPersonagem) {
  const { data, error } = await api.POST("/mesas/{mesa_id}/personagens/copias", {
    params: { path: { mesa_id: destino } },
    body: { mesa_origem_id: origem.mesa_id, personagem_origem_id: origem.personagem_id },
  });
  if (error || !data) throw new Error(extractErrorMessage(error, "Não foi possível copiar o personagem."));
  return data;
}

// ---------------------------------------------------------------- lado inicial em Campanhas

const CHAVE_LADO = (userId: string) => `cursed:campanhas-lado:v1:${userId}`;

export function lerLadoSalvo(userId: string): Lado | null {
  try {
    const valor = window.localStorage.getItem(CHAVE_LADO(userId));
    return valor === "narrando" || valor === "jogando" ? valor : null;
  } catch {
    return null;
  }
}

export function salvarLado(userId: string, lado: Lado) {
  try {
    window.localStorage.setItem(CHAVE_LADO(userId), lado);
  } catch {
    // Sem armazenamento: o lado vale só nesta visita.
  }
}

/**
 * Lado em que Campanhas abre (spec "Alternância Narrando e Jogando"): o da campanha selecionada;
 * sem seleção, o último usado; sem histórico, o lado que tem campanhas (Narrando se houver nos dois).
 */
export function ladoInicial(mesas: MesaResumo[], selecionada: MesaResumo | undefined, salvo: Lado | null): Lado {
  if (selecionada) return selecionada.papel === "narrador" ? "narrando" : "jogando";
  if (salvo) return salvo;
  const narra = mesas.some((mesa) => mesa.papel === "narrador");
  const joga = mesas.some((mesa) => mesa.papel === "jogador");
  return !narra && joga ? "jogando" : "narrando";
}
