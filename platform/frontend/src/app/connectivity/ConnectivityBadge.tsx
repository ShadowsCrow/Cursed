import { useConnectivityStatus, type ConnectivityStatus } from "./useConnectivityStatus";

const copy: Record<ConnectivityStatus, string> = {
  online: "Online",
  offline: "Offline",
  reconectando: "Reconectando…",
};

/**
 * Indicador de estado de conectividade (online/offline/reconectando), anunciado
 * discretamente via `aria-live="polite"` para leitores de tela ao mudar de estado.
 */
export function ConnectivityBadge() {
  const status = useConnectivityStatus();
  return (
    <span className={`connectivity-badge connectivity-badge--${status}`} role="status" aria-live="polite">
      <span className="connectivity-badge__dot" aria-hidden="true" />
      {copy[status]}
    </span>
  );
}
