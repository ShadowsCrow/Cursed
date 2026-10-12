import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeSession } from "./RoomPresence";
import {
  comBalao, DURACAO_DO_BALAO_MS, EVENTO_DE_REACAO, LimiteDeReacoes, reacaoValida, type Balao, type Reacao,
} from "./reacoes";

type Ponto = { x: number; y: number };
type Sinal = Ponto & { usuarioId: string; recebidoEm: number };
type Arraste = Sinal & { tokenId: string };

export function useRoomEphemera(mesaId: string, userId: string, realtime?: RealtimeSession) {
  const canalRef = useRef<RealtimeChannel | null>(null);
  const [cursores, setCursores] = useState<Record<string, Sinal>>({});
  const [pings, setPings] = useState<Sinal[]>([]);
  const [arrastes, setArrastes] = useState<Record<string, Arraste>>({});
  // Reações (gamificacao-da-sala): balões passageiros, com o limite de uma por segundo por pessoa.
  const [baloes, setBaloes] = useState<Balao[]>([]);
  const limite = useRef(new LimiteDeReacoes());
  const temporizadores = useRef(new Set<number>());
  const mostrarBalao = useCallback((usuarioId: string, reacao: Reacao) => {
    const agora = Date.now();
    if (!limite.current.permitir(usuarioId, agora)) return false;
    const balao: Balao = { id: `${usuarioId}-${agora}-${Math.random().toString(36).slice(2, 7)}`, usuarioId, reacao, criadoEm: agora };
    setBaloes((atuais) => comBalao(atuais, balao));
    const id = window.setTimeout(() => {
      temporizadores.current.delete(id);
      setBaloes((atuais) => atuais.filter((item) => item.id !== balao.id));
    }, DURACAO_DO_BALAO_MS);
    temporizadores.current.add(id);
    return true;
  }, []);
  useEffect(() => () => { temporizadores.current.forEach((id) => window.clearTimeout(id)); }, []);
  const client = realtime?.client;
  const accessToken = realtime?.accessToken;

  useEffect(() => {
    if (!client || !accessToken) return;
    let ativo = true;
    let canal: RealtimeChannel | undefined;
    void (async () => {
      try {
        await client.realtime.setAuth(accessToken);
        if (!ativo) return;
        canal = client.channel(`mesa:${mesaId}`, { config: { private: true } });
        canal.on("broadcast", { event: "sala.cursor" }, ({ payload }) => {
          const sinal = receberPonto(payload, userId);
          if (ativo && sinal) setCursores((atual) => ({ ...atual, [sinal.usuarioId]: sinal }));
        });
        canal.on("broadcast", { event: "sala.ping" }, ({ payload }) => {
          const sinal = receberPonto(payload, userId);
          if (ativo && sinal) setPings((atual) => [...atual.slice(-4), sinal]);
        });
        canal.on("broadcast", { event: "sala.arraste" }, ({ payload }) => {
          const sinal = receberPonto(payload, userId);
          if (!ativo || !sinal || typeof payload.token_id !== "string") return;
          setArrastes((atual) => {
            const proximo = { ...atual };
            if (payload.ativo === false) delete proximo[payload.token_id];
            else proximo[payload.token_id] = { ...sinal, tokenId: payload.token_id };
            return proximo;
          });
        });
        canal.on("broadcast", { event: EVENTO_DE_REACAO }, ({ payload }) => {
          if (!ativo || typeof payload.usuario_id !== "string" || payload.usuario_id === userId) return;
          if (reacaoValida(payload.reacao)) mostrarBalao(payload.usuario_id, payload.reacao);
        });
        canal.subscribe((status) => {
          if (!ativo) return;
          if (status === "SUBSCRIBED") canalRef.current = canal ?? null;
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            canalRef.current = null;
            setCursores({}); setPings([]); setArrastes({});
          }
        });
      } catch {
        // Sinais efêmeros podem se perder; o snapshot confirmado permanece na API.
      }
    })();
    const expirar = window.setInterval(() => {
      const limite = Date.now() - 5000;
      setCursores((atual) => Object.fromEntries(Object.entries(atual).filter(([, sinal]) => sinal.recebidoEm >= limite)));
      setPings((atual) => atual.filter((sinal) => sinal.recebidoEm >= limite));
      setArrastes((atual) => Object.fromEntries(Object.entries(atual).filter(([, sinal]) => sinal.recebidoEm >= limite)));
    }, 1000);
    return () => {
      ativo = false;
      canalRef.current = null;
      window.clearInterval(expirar);
      if (canal) void client.removeChannel(canal);
    };
  }, [client, accessToken, mesaId, userId, mostrarBalao]);

  const enviar = useCallback((evento: string, dados: Record<string, unknown>) => {
    if (canalRef.current) void canalRef.current.send({ type: "broadcast", event: evento,
      payload: { ...dados, usuario_id: userId } });
  }, [userId]);
  return {
    cursores: Object.values(cursores), pings, arrastes: Object.values(arrastes),
    cursor: (x: number, y: number) => enviar("sala.cursor", { x, y }),
    ping: (x: number, y: number) => enviar("sala.ping", { x, y }),
    arraste: (tokenId: string, x: number, y: number) => enviar("sala.arraste", { token_id: tokenId, x, y, ativo: true }),
    cancelarArraste: (tokenId: string) => enviar("sala.arraste", { token_id: tokenId, x: 0, y: 0, ativo: false }),
    baloes,
    /** Lança a reação: quem lança vê o balão na hora, e a mesa o recebe pelo tempo real, quando houver. */
    reagir: (reacao: Reacao) => {
      if (mostrarBalao(userId, reacao)) enviar(EVENTO_DE_REACAO, { reacao });
    },
  };
}

function receberPonto(payload: Record<string, unknown>, proprioId: string): Sinal | null {
  if (typeof payload.usuario_id !== "string" || payload.usuario_id === proprioId ||
      typeof payload.x !== "number" || typeof payload.y !== "number" ||
      !Number.isInteger(payload.x) || !Number.isInteger(payload.y) ||
      payload.x < 0 || payload.y < 0) return null;
  return { usuarioId: payload.usuario_id, x: payload.x, y: payload.y, recebidoEm: Date.now() };
}
