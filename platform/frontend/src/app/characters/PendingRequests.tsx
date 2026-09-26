import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Confirmation } from "../../ui/primitives";
import { usePersonagens } from "./api";
import { sheetKeys, useFichaSnapshot } from "./sheet/sheetApi";
import { extractErrorMessage, type ApiClient, type PedidoAlteracaoResumo } from "./types";

const chaveSolicitacoes = (mesaId: string) => ["solicitacoes", mesaId] as const;

function noCaminho(dados: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>(
    (atual, parte) => (atual && typeof atual === "object" ? (atual as Record<string, unknown>)[parte] : undefined),
    dados,
  );
}

function exibir(valor: unknown): string {
  if (valor === undefined || valor === null || valor === "") return "—";
  return typeof valor === "string" ? valor : JSON.stringify(valor);
}

function Pedido({ api, mesaId, pedido, nome }: { api: ApiClient; mesaId: string; pedido: PedidoAlteracaoResumo; nome: string }) {
  const queryClient = useQueryClient();
  const ficha = useFichaSnapshot(api, mesaId, pedido.personagem_id);
  const [rejeitando, setRejeitando] = useState(false);
  const decidir = useMutation({
    mutationFn: async (aprovar: boolean) => {
      const { data, error } = await api.POST("/mesas/{mesa_id}/solicitacoes/{pedido_id}/decisao", {
        params: { path: { mesa_id: mesaId, pedido_id: pedido.id } }, body: { aprovar },
      });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível registrar a decisão."));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaveSolicitacoes(mesaId) });
      for (const chave of [sheetKeys.ficha(mesaId, pedido.personagem_id), sheetKeys.valoresDerivados(mesaId, pedido.personagem_id)]) {
        void queryClient.invalidateQueries({ queryKey: chave });
      }
    },
  });
  const desatualizado = ficha.data !== undefined && ficha.data.versao !== pedido.versao_base;
  return (
    <li className="request-item">
      <p><strong>{nome}</strong> — {pedido.campos_alterados.length} campo(s)</p>
      <table className="diff-table">
        <thead><tr><th scope="col">Campo</th><th scope="col">Atual</th><th scope="col">Proposto</th></tr></thead>
        <tbody>
          {pedido.campos_alterados.map((campo) => (
            <tr key={campo}>
              <th scope="row">{campo}</th>
              <td>{ficha.data ? exibir(noCaminho(ficha.data.ficha, campo)) : "…"}</td>
              <td>{exibir(noCaminho(pedido.ficha_proposta, campo))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {desatualizado && (
        <p role="note" className="preview-note">A ficha mudou desde o pedido; aprovar substituiria a versão atual e será recusado.</p>
      )}
      {decidir.isError && <p role="alert">{decidir.error.message}</p>}
      <div className="request-item__actions">
        <button type="button" className="button button--ghost" disabled={decidir.isPending} onClick={() => setRejeitando(true)}>Rejeitar</button>
        <button type="button" className="button" disabled={decidir.isPending} onClick={() => decidir.mutate(true)}>Aprovar</button>
      </div>
      <Confirmation
        open={rejeitando}
        title="Rejeitar alteração?"
        description={`O pedido de ${nome} será encerrado sem alterar a ficha.`}
        confirmLabel="Rejeitar"
        tone="danger"
        onConfirm={() => { setRejeitando(false); decidir.mutate(false); }}
        onCancel={() => setRejeitando(false)}
      />
    </li>
  );
}

/** Fila do Narrador: alterações de jogadores que dependem de aprovação (4.5). */
export function PendingRequests({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const solicitacoes = useQuery({
    queryKey: chaveSolicitacoes(mesaId),
    queryFn: async () => {
      const { data, error } = await api.GET("/mesas/{mesa_id}/solicitacoes", { params: { path: { mesa_id: mesaId } } });
      if (error) throw new Error(extractErrorMessage(error, "Não foi possível carregar as solicitações."));
      return data ?? [];
    },
  });
  const personagens = usePersonagens(api, mesaId, false);
  const nomes = new Map((personagens.data ?? []).map((p) => [p.id, p.nome]));
  if (solicitacoes.isPending) return <p>Carregando solicitações…</p>;
  if (solicitacoes.isError) return <p role="alert">{solicitacoes.error.message}</p>;
  if (solicitacoes.data.length === 0) return <p className="preview-note">Nenhuma alteração aguardando aprovação.</p>;
  return (
    <ul className="request-list" aria-label="Alterações aguardando aprovação">
      {solicitacoes.data.map((pedido) => (
        <Pedido key={pedido.id} api={api} mesaId={mesaId} pedido={pedido} nome={nomes.get(pedido.personagem_id) ?? "Personagem"} />
      ))}
    </ul>
  );
}
