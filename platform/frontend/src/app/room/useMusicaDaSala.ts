/**
 * Música e ambiente da mesa (musica-da-sala): biblioteca, estado das duas camadas e um tocador por camada neste
 * navegador. Vive no `RoomView`, e não na aba Música, para o som seguir com qualquer aba e com o painel recolhido (D5).
 * Só o Narrador muda o que a mesa ouve; o volume de cada camada e "Silenciar" são de cada pessoa, guardados neste
 * navegador (D7).
 */
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { extractErrorMessage, type ApiClient } from "../characters/types";
import { usePreferenciaLocal, usePreferenciaNumerica } from "../shells/usePreferenciaLocal";
import { intervaloDaSala } from "./atualizacao";
import {
  CHAVE_MUSICA_SILENCIADA, CHAVE_VOLUME, diferencaDoRelogio, posicaoEsperada, VOLUME_PADRAO,
  type Camada, type EstadoDaCamada, type EstadoDaMusica, type FaixaDeMusica, type Posicao,
} from "./musica";
import { TocadorDaMesa } from "./tocadorDaMesa";

export const chaveDaMusica = (mesaId: string) => ["musica", mesaId] as const;
/** De quanto em quanto tempo o tocador confere se está no compasso, além de cada mudança. */
const CONFERENCIA_MS = 5000;

interface EstadoComRelogio {
  estado: EstadoDaMusica | null;
  /** Quanto o relógio do servidor está à frente deste navegador. */
  diferencaMs: number;
}

type PedidoDaCamada = { faixa_id: string | null; tocando: boolean; posicao_ms: number; repetir: boolean };

function comRelogio(dados: unknown): EstadoComRelogio {
  const estado = dados && typeof dados === "object" && "musica" in dados && "ambiente" in dados ? dados as EstadoDaMusica : null;
  return { estado, diferencaMs: diferencaDoRelogio(estado?.agora, Date.now()) };
}

export interface CamadaDaSala {
  camada: Camada;
  estado: EstadoDaCamada | null;
  faixaAtual: FaixaDeMusica | null;
  /** Onde a faixa atual deve estar agora. */
  posicao: () => Posicao;
  volume: number;
  mudarVolume: (volume: number) => void;
  /** Ações do Narrador. */
  tocar: (faixaId: string) => void;
  pausar: () => void;
  continuar: () => void;
  parar: () => void;
  mudarRepetir: (repetir: boolean) => void;
}

export interface MusicaDaSala {
  faixas: FaixaDeMusica[];
  /** Estilos de jogo (Medieval, Moderno, Ficção científica): a divisão principal da biblioteca. */
  estilos: string[];
  momentos: string[];
  cenarios: string[];
  ambiente: CamadaDaSala;
  musica: CamadaDaSala;
  /** O navegador recusou tocar som antes de um gesto da pessoa. */
  bloqueado: boolean;
  ativarSom: () => void;
  silenciada: boolean;
  silenciar: (silenciada: boolean) => void;
  pendente: boolean;
  erro: string | null;
}

/** Uma camada: o tocador dela, o volume da pessoa e as ações do Narrador. */
function useCamada(camada: Camada, { estado, faixas, diferencaMs, silenciada, alterar, aoBloquear }: {
  estado: EstadoDaCamada | null; faixas: FaixaDeMusica[]; diferencaMs: number; silenciada: boolean;
  alterar: (camada: Camada, pedido: PedidoDaCamada) => void; aoBloquear: (camada: Camada, bloqueado: boolean) => void;
}): CamadaDaSala & { tocador: TocadorDaMesa } {
  const [volume, mudarVolume] = usePreferenciaNumerica(CHAVE_VOLUME[camada], VOLUME_PADRAO[camada]);
  const [tocador] = useState(() => new TocadorDaMesa((bloqueado) => aoBloquear(camada, bloqueado)));
  const faixaAtual = (estado?.faixa_id && faixas.find((f) => f.id === estado.faixa_id)) || null;
  const posicao = useCallback((): Posicao => (estado && faixaAtual
    ? posicaoEsperada(estado, faixaAtual.duracao_s, Date.now(), diferencaMs)
    : { segundos: 0, terminou: false }), [estado, faixaAtual, diferencaMs]);

  // O tocador segue o estado a cada mudança e confere o compasso de tempos em tempos.
  const tocando = Boolean(estado?.tocando);
  const repetir = estado?.repetir ?? true;
  useEffect(() => {
    const alvo = { faixa: faixaAtual, tocando, repetir, posicao };
    tocador.sincronizar(alvo);
    const conferir = window.setInterval(() => tocador.sincronizar(alvo), CONFERENCIA_MS);
    return () => window.clearInterval(conferir);
  }, [tocador, faixaAtual, tocando, repetir, posicao]);
  useEffect(() => { tocador.definirVolume(silenciada ? 0 : volume); }, [tocador, volume, silenciada]);
  useEffect(() => () => tocador.destruir(), [tocador]);

  const agoraMs = () => Math.round(posicao().segundos * 1000);
  return {
    camada, estado, faixaAtual, posicao, volume, mudarVolume, tocador,
    tocar: (faixaId) => alterar(camada, { faixa_id: faixaId, tocando: true, posicao_ms: 0, repetir }),
    pausar: () => {
      if (faixaAtual) alterar(camada, { faixa_id: faixaAtual.id, tocando: false, posicao_ms: agoraMs(), repetir });
    },
    continuar: () => {
      if (!faixaAtual || !estado) return;
      // Faixa que terminou sem "Repetir" volta do começo.
      alterar(camada, { faixa_id: faixaAtual.id, tocando: true, posicao_ms: posicao().terminou ? 0 : estado.posicao_ms, repetir });
    },
    parar: () => alterar(camada, { faixa_id: null, tocando: false, posicao_ms: 0, repetir }),
    mudarRepetir: (novo) => alterar(camada, {
      faixa_id: faixaAtual?.id ?? null, tocando: Boolean(estado?.tocando && faixaAtual),
      // A posição recomeça a contar agora; a faixa terminada volta do começo ao ligar "Repetir".
      posicao_ms: faixaAtual ? (posicao().terminou && novo ? 0 : agoraMs()) : 0, repetir: novo,
    }),
  };
}

export function useMusicaDaSala({ api, mesaId, comTempoReal, ativo }: {
  api: ApiClient; mesaId: string; comTempoReal: boolean; ativo: boolean;
}): MusicaDaSala {
  const queryClient = useQueryClient();
  const [silenciada, silenciar] = usePreferenciaLocal(CHAVE_MUSICA_SILENCIADA, false);
  const [bloqueios, setBloqueios] = useState<Record<Camada, boolean>>({ ambiente: false, musica: false });
  const aoBloquear = useCallback((camada: Camada, bloqueado: boolean) => {
    setBloqueios((atual) => (atual[camada] === bloqueado ? atual : { ...atual, [camada]: bloqueado }));
  }, []);

  const biblioteca = useQuery({
    queryKey: ["musicas"],
    enabled: ativo,
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await api.GET("/musicas");
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar a biblioteca de sons."));
      return data;
    },
  });
  const consulta = useQuery({
    queryKey: chaveDaMusica(mesaId),
    enabled: ativo,
    retry: false,
    refetchInterval: intervaloDaSala(comTempoReal),
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/sala/musica", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar o som da mesa."));
      return comRelogio(data);
    },
  });
  const mudanca = useMutation({
    mutationFn: async ({ camada, pedido }: { camada: Camada; pedido: PedidoDaCamada }) => {
      const { data, error } = await api.PUT("/mesas/{mesa_id}/sala/musica/{camada}", {
        params: { path: { mesa_id: mesaId, camada } }, body: pedido,
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível mudar o som da mesa."));
      return data;
    },
    onSuccess: (data) => { queryClient.setQueryData(chaveDaMusica(mesaId), comRelogio(data)); },
  });
  const mutar = mudanca.mutate;
  const alterar = useCallback((camada: Camada, pedido: PedidoDaCamada) => mutar({ camada, pedido }), [mutar]);

  const faixas = Array.isArray(biblioteca.data?.faixas) ? biblioteca.data.faixas : [];
  const diferencaMs = consulta.data?.diferencaMs ?? 0;
  const comum = { faixas, diferencaMs, silenciada, alterar, aoBloquear };
  const { tocador: tocadorDoAmbiente, ...ambiente } = useCamada("ambiente", { ...comum, estado: consulta.data?.estado?.ambiente ?? null });
  const { tocador: tocadorDaMusica, ...musica } = useCamada("musica", { ...comum, estado: consulta.data?.estado?.musica ?? null });

  // Som bloqueado: o primeiro clique ou tecla em qualquer lugar libera, dentro do próprio gesto (D6).
  const ativarSom = useCallback(() => {
    tocadorDoAmbiente.liberar();
    tocadorDaMusica.liberar();
  }, [tocadorDoAmbiente, tocadorDaMusica]);
  const algumBloqueado = bloqueios.ambiente || bloqueios.musica;
  useEffect(() => {
    if (!algumBloqueado) return;
    document.addEventListener("pointerdown", ativarSom, true);
    document.addEventListener("keydown", ativarSom, true);
    return () => {
      document.removeEventListener("pointerdown", ativarSom, true);
      document.removeEventListener("keydown", ativarSom, true);
    };
  }, [algumBloqueado, ativarSom]);

  const tocandoAlgo = [ambiente, musica].some((c) => Boolean(c.estado?.tocando && c.faixaAtual));
  return {
    faixas,
    estilos: Array.isArray(biblioteca.data?.estilos) ? biblioteca.data.estilos : [],
    momentos: Array.isArray(biblioteca.data?.momentos) ? biblioteca.data.momentos : [],
    cenarios: Array.isArray(biblioteca.data?.cenarios) ? biblioteca.data.cenarios : [],
    ambiente,
    musica,
    bloqueado: algumBloqueado && tocandoAlgo,
    ativarSom,
    silenciada,
    silenciar,
    pendente: mudanca.isPending,
    erro: mudanca.isError ? mudanca.error.message : (biblioteca.isError ? biblioteca.error.message : null),
  };
}
