import { useEffect, useRef, useState } from "react";

export type ConnectivityStatus = "online" | "offline" | "reconectando";

function initialStatus(): ConnectivityStatus {
  return typeof navigator === "undefined" || navigator.onLine ? "online" : "offline";
}

/**
 * Estado de conectividade a partir de `navigator.onLine` e dos eventos `online`/`offline`
 * do navegador. Ao voltar a ficar online, passa por um breve "reconectando" antes de
 * confirmar `online` — dando tempo para a interface distinguir uma reconexão de uma
 * conexão já estável, sem exigir nenhuma checagem de servidor nesta etapa.
 */
export function useConnectivityStatus(reconnectDelayMs = 1200): ConnectivityStatus {
  const [status, setStatus] = useState<ConnectivityStatus>(initialStatus);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function clearTimer() {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    }

    function handleOffline() {
      clearTimer();
      setStatus("offline");
    }

    function handleOnline() {
      clearTimer();
      setStatus("reconectando");
      timerRef.current = window.setTimeout(() => setStatus("online"), reconnectDelayMs);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearTimer();
    };
  }, [reconnectDelayMs]);

  return status;
}
