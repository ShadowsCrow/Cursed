import { useCallback, useState } from "react";

/** Chave da barra lateral da mesa: vale para todas as mesas e os dois papéis neste navegador. */
export const CHAVE_BARRA_RECOLHIDA = "cursed:mesa:barra-recolhida";

function ler(chave: string): boolean | null {
  try {
    const valor = window.localStorage?.getItem(chave);
    return valor === "1" ? true : valor === "0" ? false : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: boolean) {
  try {
    window.localStorage?.setItem(chave, valor ? "1" : "0");
  } catch {
    // Armazenamento bloqueado: a escolha vale só até recarregar.
  }
}

/**
 * Preferência booleana de interface guardada neste navegador. É conveniência de quem usa, não dado
 * da mesa: nunca vai ao servidor. Sem a chave ou sem acesso ao armazenamento, vale `padrao`.
 */
export function usePreferenciaLocal(chave: string, padrao: boolean): [boolean, (valor: boolean) => void] {
  const [valor, setValor] = useState(() => ler(chave) ?? padrao);
  const definir = useCallback((novo: boolean) => {
    setValor(novo);
    gravar(chave, novo);
  }, [chave]);
  return [valor, definir];
}

/** Estado da barra lateral da mesa: começa expandida. */
export function useBarraRecolhida() {
  return usePreferenciaLocal(CHAVE_BARRA_RECOLHIDA, false);
}

function lerNumero(chave: string): number | null {
  try {
    const bruto = window.localStorage?.getItem(chave);
    if (bruto == null) return null;
    const valor = Number(bruto);
    return Number.isFinite(valor) ? valor : null;
  } catch {
    return null;
  }
}

/** Como `usePreferenciaLocal`, para um número (ex.: largura de um painel em px). */
export function usePreferenciaNumerica(chave: string, padrao: number): [number, (valor: number) => void] {
  const [valor, setValor] = useState(() => lerNumero(chave) ?? padrao);
  const definir = useCallback((novo: number) => {
    setValor(novo);
    try {
      window.localStorage?.setItem(chave, String(novo));
    } catch {
      // Armazenamento bloqueado: a escolha vale só até recarregar.
    }
  }, [chave]);
  return [valor, definir];
}

/** Como `usePreferenciaLocal`, para um texto curto (ex.: a aba escolhida de um painel). */
export function usePreferenciaTexto(chave: string, padrao: string): [string, (valor: string) => void] {
  const [valor, setValor] = useState(() => {
    try {
      return window.localStorage?.getItem(chave) ?? padrao;
    } catch {
      return padrao;
    }
  });
  const definir = useCallback((novo: string) => {
    setValor(novo);
    try {
      window.localStorage?.setItem(chave, novo);
    } catch {
      // Armazenamento bloqueado: a escolha vale só até recarregar.
    }
  }, [chave]);
  return [valor, definir];
}
