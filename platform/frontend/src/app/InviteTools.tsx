import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { extractErrorMessage, type ApiClient } from "./characters/types";

/** Convite de uso único para um jogador entrar na mesa (4.2). */
export function InviteTools({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const [dias, setDias] = useState(7);
  const gerar = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/convites", {
        params: { path: { mesa_id: mesaId } }, body: { validade_dias: dias },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível gerar o convite."));
      return data as { codigo: string; expira_em: string };
    },
  });
  return (
    <div className="invite-tools">
      <label>Validade do convite (dias)
        <input type="number" min={1} max={30} value={dias} onChange={(event) => setDias(Number(event.target.value) || 1)} />
      </label>
      <button type="button" className="button" disabled={gerar.isPending} onClick={() => gerar.mutate()}>Gerar convite</button>
      {gerar.isError && <p role="alert">{gerar.error.message}</p>}
      {gerar.data && (
        <div role="status">
          <p>Envie este código ao jogador. Ele vale para uma única entrada até {new Date(gerar.data.expira_em).toLocaleString("pt-BR")}.</p>
          <code>{gerar.data.codigo}</code>
        </div>
      )}
    </div>
  );
}
