import { useState } from "react";

import { useConfigurarPolitica, usePoliticaMesa } from "../characters/api";
import type { ApiClient } from "../characters/types";

/** Configuração do Narrador: quantas moedas (de qualquer tipo) cabem numa pilha, ou seja, numa célula. */
export function CoinStackSetting({ api, mesaId }: { api: ApiClient; mesaId: string }) {
  const politica = usePoliticaMesa(api, mesaId);
  const salvar = useConfigurarPolitica(api, mesaId);
  const [valor, setValor] = useState<string | null>(null);
  if (politica.isPending) return <p>Carregando…</p>;
  if (politica.isError) return <p role="alert">{politica.error.message}</p>;
  const atual = politica.data.moedas_por_pilha ?? null;
  const texto = valor ?? (atual === null ? "" : String(atual));
  const numero = Math.trunc(Number(texto));
  const valido = texto !== "" && Number.isFinite(numero) && numero >= 1 && numero <= 10_000;
  const reduz = valido && atual !== null && numero < atual;
  return (
    <form className="moedas__form" onSubmit={(e) => {
      e.preventDefault();
      if (!valido) return;
      salvar.mutate({ ...politica.data, moedas_por_pilha: numero }, { onSuccess: () => setValor(null) });
    }}>
      <label htmlFor={`moedas-por-pilha-${mesaId}`}>Moedas por pilha (uma célula da grade)</label>
      <input id={`moedas-por-pilha-${mesaId}`} type="number" min={1} max={10_000} value={texto}
        aria-describedby={`moedas-por-pilha-dica-${mesaId}`} onChange={(e) => setValor(e.target.value)} />
      <p id={`moedas-por-pilha-dica-${mesaId}`} className="preview-note">
        {reduz
          ? "Reduzir o limite reorganiza as moedas de todos: as pilhas que não couberem vão para a área vermelha, sem perda."
          : "Vale para toda a mesa. Nenhuma moeda é perdida quando o limite muda."}
      </p>
      {salvar.isError && <p role="alert">{salvar.error.message}</p>}
      {salvar.isSuccess && valor === null && <p role="status">Limite salvo.</p>}
      <div className="dialog__actions">
        <button type="submit" className="button button--secondary" disabled={!valido || numero === atual || salvar.isPending}>
          {salvar.isPending ? "Salvando…" : "Salvar limite"}
        </button>
      </div>
    </form>
  );
}
