import { useCallback, useEffect, useRef, useState } from "react";

import type { Rolagem } from "./dados";
import type { MesaDeDados } from "./dados3d/cena";
import { dadosParaAnimar } from "./dados3d/rotulos";

/** Acima disso, o resultado aparece direto, sem animação (spec: Rolagem animada no tabuleiro). */
export const MAXIMO_DE_DADOS_ANIMADOS = 30;
/** Tempo com os dados parados na tela antes de sumirem. */
export const TEMPO_PARADOS_MS = 3000;
const TEMPO_SUMINDO_MS = 450;

/**
 * Camada dos dados 3D por cima do tabuleiro (melhorias-da-sala, item 3). `animar` resolve quando os dados
 * param, ou na hora se não houver o que animar ou o navegador não desenhar em 3D. A camada não recebe
 * cliques e é ignorada por leitores de tela.
 */
export function useDadosNoTabuleiro() {
  const camada = useRef<HTMLDivElement>(null);
  const mesa = useRef<MesaDeDados | null>(null);
  const vez = useRef(0);
  const temporizadores = useRef<number[]>([]);
  const [sumindo, setSumindo] = useState(false);

  const desmontar = useCallback(() => {
    temporizadores.current.forEach((id) => window.clearTimeout(id));
    temporizadores.current = [];
    mesa.current?.destruir();
    mesa.current = null;
  }, []);
  useEffect(() => desmontar, [desmontar]);

  const animar = useCallback(async (rolagem: Pick<Rolagem, "grupos">): Promise<void> => {
    const dados = rolagem.grupos.flatMap((grupo) => grupo.valores.flatMap((valor) => dadosParaAnimar(grupo.faces, valor)));
    const elemento = camada.current;
    if (!elemento || dados.length === 0 || dados.length > MAXIMO_DE_DADOS_ANIMADOS) return;
    const minha = ++vez.current;
    desmontar();
    setSumindo(false);
    try {
      const { criarMesaDeDados } = await import("./dados3d/cena");
      if (minha !== vez.current) return;
      mesa.current = await criarMesaDeDados(elemento);
      if (minha !== vez.current) return;
      await mesa.current.rolar(dados);
    } catch {
      // Sem WebGL (ou com falha ao desenhar), o resultado aparece direto.
      if (minha === vez.current) desmontar();
      return;
    }
    if (minha !== vez.current) return;
    temporizadores.current.push(window.setTimeout(() => {
      setSumindo(true);
      temporizadores.current.push(window.setTimeout(() => { if (minha === vez.current) { desmontar(); setSumindo(false); } }, TEMPO_SUMINDO_MS));
    }, TEMPO_PARADOS_MS));
  }, [desmontar]);

  const elemento = <div ref={camada} className={`dados-no-tabuleiro${sumindo ? " dados-no-tabuleiro--sumindo" : ""}`}
    aria-hidden="true" />;
  return { camada: elemento, animar };
}
