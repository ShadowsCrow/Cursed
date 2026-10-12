import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { Dialog } from "../../../ui/primitives";
import type { ApiClient } from "../../characters/types";
import { routes } from "../../routes";
import { chaves, criarCampanha, salvarLado } from "../dados";

/** Pede o nome, cria a campanha (a pessoa vira Narradora) e a abre em Campanhas, na lista Narrando. */
export function DialogoCriarCampanha({ api, userId, aberto, onFechar }: {
  api: ApiClient; userId: string; aberto: boolean; onFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const criar = useMutation({
    mutationFn: () => criarCampanha(api, nome.trim()),
    onSuccess: async (mesa) => {
      await queryClient.invalidateQueries({ queryKey: chaves.mesas(userId) });
      salvarLado(userId, "narrando");
      setNome("");
      onFechar();
      navigate(routes.campanha(mesa.id));
    },
  });
  return (
    <Dialog open={aberto} onClose={onFechar} title="Criar campanha" initialFocusRef={campo}
      description="Você será a pessoa que narra esta campanha. Os jogadores entram depois, por convite.">
      <form className="formulario-dialogo" onSubmit={(evento) => { evento.preventDefault(); if (nome.trim()) criar.mutate(); }}>
        <label>Nome da campanha
          <input ref={campo} required maxLength={200} value={nome} onChange={(evento) => setNome(evento.target.value)} />
        </label>
        {criar.isError && <p role="alert" className="field-error">{criar.error.message}</p>}
        <button type="submit" className="button button--primary" disabled={criar.isPending || !nome.trim()}>
          {criar.isPending ? "Criando…" : "Criar campanha"}
        </button>
      </form>
    </Dialog>
  );
}
