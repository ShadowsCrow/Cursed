import { useState } from "react";

import { useCommandPreview } from "./useCommandPreview";
import { useConnectivityStatus } from "./useConnectivityStatus";

/**
 * Demonstração autocontida (dados simulados, nenhuma escrita real) do padrão
 * "prévia local vs. confirmação remota": o botão dispara um comando simulado
 * que pode ser configurado para ter sucesso ou falhar, para visualizar os três
 * estados — confirmado, prévia local e erro — no catálogo de componentes.
 */
export function CommandPreviewDemo() {
  const [confirmed, setConfirmed] = useState("Sem arma equipada (simulado)");
  const [shouldFail, setShouldFail] = useState(false);
  const status = useConnectivityStatus();

  const { value, status: commandStatus, errorMessage, execute, isPending } = useCommandPreview<string, { item: string }>({
    confirmed,
    previewFrom: (variables) => `${variables.item} (prévia)`,
    run: async (variables) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (shouldFail) throw new Error("Comando simulado recusado pelo servidor.");
      return variables.item;
    },
    onConfirmed: setConfirmed,
    online: status === "online",
  });

  return (
    <div className="command-preview-demo">
      <p className="command-preview-demo__value">
        <span className="eyebrow">VALOR EXIBIDO (SIMULADO)</span>
        <strong>{value}</strong>
        <span className={`command-preview-demo__status command-preview-demo__status--${commandStatus}`}>
          {commandStatus === "confirmado" && "Confirmado pelo servidor"}
          {commandStatus === "previa-local" && "Prévia local (aguardando confirmação)"}
          {commandStatus === "erro" && "Falhou — valor confirmado restaurado"}
        </span>
      </p>
      <div className="command-preview-demo__actions">
        <label className="command-preview-demo__toggle">
          <input type="checkbox" checked={shouldFail} onChange={(event) => setShouldFail(event.target.checked)} />
          Simular falha do servidor
        </label>
        <button
          type="button"
          className="button button--primary"
          disabled={isPending}
          onClick={() => { void execute({ item: "Lâmina da Vigília (simulado)" }); }}
        >
          {isPending ? "Enviando…" : "Equipar (comando simulado)"}
        </button>
      </div>
      {errorMessage && <p role="alert" aria-live="assertive" className="command-preview-demo__error">{errorMessage}</p>}
    </div>
  );
}
