import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { ApiClient } from "../characters/types";
import { cardKeys } from "./api";
import { erroDaApi, type CartaDefinicaoResumo, type TipoCarta, type ValidacaoCarta } from "./types";

/*
 * Salvamento automático do editor de cartas (simplificar-criacao-de-cartas, D2 e D4).
 * - A carta só é criada no servidor no primeiro salvamento, e só quando já tem título.
 * - Um salvamento por vez: o que mudar durante um envio entra no próximo, com a versão devolvida.
 * - Conflito (409) para os salvamentos; o editor oferece recarregar.
 * - Depois de cada salvamento, o servidor valida o rascunho: a validação é dele.
 */
export type EstadoSalvamento = "ocioso" | "salvando" | "salvo" | "falha" | "conflito";

type Rascunho = Record<string, unknown>;

export interface SalvamentoAutomatico {
  definicao: CartaDefinicaoResumo | null;
  estado: EstadoSalvamento;
  erro: string | null;
  validacao: ValidacaoCarta | null;
  /** Há alteração ainda não salva (ou um salvamento em andamento). */
  pendente: boolean;
  /** Avisa que o rascunho mudou; o salvamento vem depois do atraso. */
  marcarAlteracao: () => void;
  /** Salva já o que estiver pendente; devolve a definição salva (ou `null`, se não deu). */
  salvarAgora: () => Promise<CartaDefinicaoResumo | null>;
  /** Garante a carta criada e salva (para enviar uma imagem); falha se não der. */
  garantirSalva: () => Promise<CartaDefinicaoResumo>;
  /** Uma imagem gravada direto no rascunho do servidor mudou a versão. */
  ajustarVersao: (versao: number) => void;
}

export interface OpcoesSalvamento {
  api: ApiClient;
  mesaId: string;
  inicial: CartaDefinicaoResumo | null;
  /** Lê o estado atual do editor no momento do envio. */
  ler: () => { tipo: TipoCarta; rascunho: Rascunho };
  atraso?: number;
}

class ErroDeSalvamento extends Error {
  constructor(message: string, readonly conflito: boolean) { super(message); }
}

const temTitulo = (rascunho: Rascunho) => typeof rascunho.titulo === "string" && rascunho.titulo.trim() !== "";

export function useSalvamentoAutomatico({ api, mesaId, inicial, ler, atraso = 1000 }: OpcoesSalvamento): SalvamentoAutomatico {
  const queryClient = useQueryClient();
  const [definicao, setDefinicao] = useState<CartaDefinicaoResumo | null>(inicial);
  const [estado, setEstado] = useState<EstadoSalvamento>("ocioso");
  const [erro, setErro] = useState<string | null>(null);
  const [validacao, setValidacao] = useState<ValidacaoCarta | null>(null);
  const [pendente, setPendente] = useState(false);

  const definicaoRef = useRef(definicao);
  const lerRef = useRef(ler);
  const sujo = useRef(false);
  const parado = useRef(false);
  const emAndamento = useRef<Promise<CartaDefinicaoResumo | null> | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const montado = useRef(true);
  useEffect(() => { lerRef.current = ler; }, [ler]);
  // Em StrictMode o efeito monta, desmonta e monta de novo: a marca volta a valer na segunda montagem.
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (relogio.current) clearTimeout(relogio.current);
    };
  }, []);

  const atualizarDefinicao = useCallback((nova: CartaDefinicaoResumo) => {
    definicaoRef.current = nova;
    if (montado.current) setDefinicao(nova);
  }, []);

  const validar = useCallback(async (cartaId: string) => {
    const { data, error } = await api.POST("/mesas/{mesa_id}/cartas/{carta_id}/validacao", {
      params: { path: { mesa_id: mesaId, carta_id: cartaId } },
    });
    if (!error && montado.current) setValidacao(data as ValidacaoCarta);
  }, [api, mesaId]);

  const enviar = useCallback(async (): Promise<CartaDefinicaoResumo | null> => {
    const { tipo, rascunho } = lerRef.current();
    const atual = definicaoRef.current;
    if (!atual && !temTitulo(rascunho)) return null;
    sujo.current = false;
    if (montado.current) { setEstado("salvando"); setErro(null); }
    const resposta = atual
      ? await api.PUT("/mesas/{mesa_id}/cartas/{carta_id}/rascunho", {
        params: { path: { mesa_id: mesaId, carta_id: atual.id } },
        body: { rascunho, versao_esperada: atual.versao, ...(tipo !== atual.tipo ? { tipo } : {}) },
      })
      : await api.POST("/mesas/{mesa_id}/cartas", { params: { path: { mesa_id: mesaId } }, body: { tipo, rascunho } });
    if (resposta.error) {
      sujo.current = true;
      const conflito = resposta.response?.status === 409;
      throw new ErroDeSalvamento(erroDaApi(resposta.error, "Não foi possível salvar o rascunho.").message, conflito);
    }
    const salva = resposta.data as CartaDefinicaoResumo;
    atualizarDefinicao(salva);
    void queryClient.invalidateQueries({ queryKey: cardKeys.catalogo(mesaId) });
    await validar(salva.id);
    return salva;
  }, [api, mesaId, atualizarDefinicao, queryClient, validar]);

  const executar = useCallback(async (): Promise<CartaDefinicaoResumo | null> => {
    if (relogio.current) { clearTimeout(relogio.current); relogio.current = null; }
    // Um envio por vez: espera o atual e, se algo mudou nesse meio-tempo, envia de novo.
    while (emAndamento.current) await emAndamento.current.catch(() => null);
    if (parado.current) return null;
    if (!sujo.current) return definicaoRef.current;
    const tarefa = enviar();
    emAndamento.current = tarefa;
    try {
      const salva = await tarefa;
      if (montado.current) {
        setEstado(salva ? "salvo" : "ocioso");
        setPendente(sujo.current);
      }
      return salva;
    } catch (causa) {
      const conflito = causa instanceof ErroDeSalvamento && causa.conflito;
      if (conflito) parado.current = true;
      if (montado.current) {
        setEstado(conflito ? "conflito" : "falha");
        setErro(causa instanceof Error ? causa.message : "Não foi possível salvar o rascunho.");
        setPendente(true);
      }
      return null;
    } finally {
      emAndamento.current = null;
    }
  }, [enviar]);

  const marcarAlteracao = useCallback(() => {
    sujo.current = true;
    setPendente(true);
    if (parado.current) return;
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => { relogio.current = null; void executar(); }, atraso);
  }, [atraso, executar]);

  const garantirSalva = useCallback(async () => {
    if (!definicaoRef.current) sujo.current = true;
    const salva = await executar();
    const atual = salva ?? definicaoRef.current;
    if (!atual || sujo.current) throw new Error("Escreva o título e salve a carta antes de enviar a imagem.");
    return atual;
  }, [executar]);

  const ajustarVersao = useCallback((versao: number) => {
    const atual = definicaoRef.current;
    if (atual) atualizarDefinicao({ ...atual, versao });
  }, [atualizarDefinicao]);

  // A carta que já existe abre com a validação do servidor.
  const idInicial = inicial?.id;
  useEffect(() => { if (idInicial) void validar(idInicial); }, [idInicial, validar]);

  // Fechar a janela do navegador com alteração não salva pede confirmação.
  useEffect(() => {
    if (!pendente) return undefined;
    const avisar = (evento: BeforeUnloadEvent) => { evento.preventDefault(); };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendente]);

  return { definicao, estado, erro, validacao, pendente, marcarAlteracao, salvarAgora: executar, garantirSalva, ajustarVersao };
}
