import { useEffect, useState } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

function atual(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(CONSULTA).matches;
}

/** Preferência de movimento reduzido do sistema, acompanhando mudanças em tempo real. */
export function useReducedMotion(): boolean {
  const [reduzido, setReduzido] = useState(atual);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const consulta = window.matchMedia(CONSULTA);
    const ouvir = () => setReduzido(consulta.matches);
    consulta.addEventListener?.("change", ouvir);
    return () => consulta.removeEventListener?.("change", ouvir);
  }, []);
  return reduzido;
}
