import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

import type { ApiClient } from "../characters/types";

type Estado = "conectando" | "conectado" | "indisponivel" | "sem_acesso";

export interface RealtimeSession {
  client: SupabaseClient;
  accessToken: string;
}

/** O evento de troca não traz dados: cada cliente recarrega só o que o servidor o deixa ver. */
function recarregarTrocas(queryClient: QueryClient, mesaId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["ofertas-item", mesaId] }),
    queryClient.invalidateQueries({ queryKey: ["grade-inventario", mesaId] }),
  ]);
}

/**
 * Assinatura mínima do canal privado da mesa fora da área da mesa (por exemplo, na página da ficha):
 * sem presença, só recarrega as trocas e a grade quando elas mudam.
 */
export function TableEvents({ api, mesaId, realtime }: { api: ApiClient; mesaId: string; realtime: RealtimeSession }) {
  const queryClient = useQueryClient();
  const { client, accessToken } = realtime;
  useEffect(() => {
    let ativo = true;
    let canal: ReturnType<SupabaseClient["channel"]> | undefined;
    const topico = `mesa:${mesaId}`;
    void (async () => {
      try {
        const { data, error } = await api.GET("/mesas/{mesa_id}/canais", { params: { path: { mesa_id: mesaId } } });
        if (!ativo || error || !data?.some((item) => item.topico === topico)) return;
        await client.realtime.setAuth(accessToken);
        if (!ativo) return;
        canal = client.channel(topico, { config: { private: true } });
        canal.on("broadcast", { event: "oferta.alterada" }, () => {
          if (ativo) void recarregarTrocas(queryClient, mesaId);
        });
        canal.subscribe((status) => {
          if (ativo && status === "SUBSCRIBED") void recarregarTrocas(queryClient, mesaId);
        });
      } catch {
        // Sem tempo real, a ficha segue com a consulta periódica das trocas.
      }
    })();
    return () => {
      ativo = false;
      if (canal) void client.removeChannel(canal);
    };
  }, [api, mesaId, client, accessToken, queryClient]);
  return null;
}

/** Presence é efêmera: a lista é substituída em cada sync recebido do servidor. */
export function RoomPresence({
  api, mesaId, userId, realtime,
}: {
  api: ApiClient;
  mesaId: string;
  userId: string;
  realtime: RealtimeSession;
}) {
  const [estado, setEstado] = useState<Estado>("conectando");
  const [participantes, setParticipantes] = useState<string[]>([]);
  const { client, accessToken } = realtime;
  const queryClient = useQueryClient();

  useEffect(() => {
    let ativo = true;
    let canal: ReturnType<SupabaseClient["channel"]> | undefined;
    let inscrito = false;
    let atualizando = false;
    let pendente = false;
    const topico = `mesa:${mesaId}`;

    async function recarregarSnapshot() {
      if (!inscrito || atualizando) {
        pendente = true;
        return;
      }
      atualizando = true;
      try {
        do {
          pendente = false;
          await queryClient.invalidateQueries({ queryKey: ["sala", mesaId] });
        } while (pendente && ativo);
      } finally {
        atualizando = false;
      }
    }

    async function conectar() {
      setEstado("conectando");
      setParticipantes([]);
      try {
        // O servidor confirma a participação antes da inscrição; a política RLS
        // do canal privado faz a mesma checagem no transporte Realtime.
        const { data, error } = await api.GET("/mesas/{mesa_id}/canais", { params: { path: { mesa_id: mesaId } } });
        if (!ativo) return;
        if (error || !data?.some((item) => item.topico === topico)) {
          setEstado("sem_acesso");
          return;
        }
        await client.realtime.setAuth(accessToken);
        if (!ativo) return;
        canal = client.channel(topico, { config: { private: true, presence: { key: userId } } });
        canal.on("presence", { event: "sync" }, () => {
          if (ativo && canal) setParticipantes(Object.keys(canal.presenceState()).sort());
        });
        for (const evento of ["sala.atualizada", "token.movido", "recipiente.alterado"]) {
          canal.on("broadcast", { event: evento }, () => {
            if (ativo) void recarregarSnapshot();
          });
        }
        canal.on("broadcast", { event: "oferta.alterada" }, () => {
          if (ativo) void recarregarTrocas(queryClient, mesaId);
        });
        canal.subscribe((status) => {
          if (!ativo) return;
          if (status === "SUBSCRIBED") {
            inscrito = true;
            void recarregarSnapshot();
            setEstado("conectado");
            void canal?.track({ usuario_id: userId }).catch(() => {
              if (ativo) setEstado("indisponivel");
            });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            inscrito = false;
            setEstado("indisponivel");
            setParticipantes([]);
          }
        });
      } catch {
        if (ativo) setEstado("indisponivel");
      }
    }

    void conectar();
    return () => {
      ativo = false;
      if (canal) void client.removeChannel(canal);
    };
  }, [api, mesaId, userId, client, accessToken, queryClient]);

  if (estado === "sem_acesso") return <span role="status">Presença: acesso à mesa revogado.</span>;
  if (estado === "indisponivel") return <span role="status">Presença indisponível.</span>;
  if (estado === "conectando") return <span role="status">Conectando à mesa…</span>;
  return <span role="status" aria-label={`${participantes.length} participante(s) conectado(s)`}>
    Na mesa: {participantes.length > 0 ? participantes.join(", ") : "aguardando presença"}
  </span>;
}
