import { useCallback, useEffect, useRef, useState } from "react";

import { destaqueDaRolagem, marcaDoDado, NOME_DA_MARCA, type MarcaDoDado, type Rolagem } from "./dados";
import type { MesaDeDados } from "./dados3d/cena";
import { dadosParaAnimar, type DadoParaAnimar } from "./dados3d/rotulos";

/** Acima disso, o resultado aparece direto, sem animação (spec: Rolagem animada no tabuleiro). */
export const MAXIMO_DE_DADOS_ANIMADOS = 30;
/** Tempo com os dados parados na tela antes de sumirem. */
export const TEMPO_PARADOS_MS = 3000;
/** Tempo da faixa "Crítico!" sobre o tabuleiro (gamificacao-da-sala, D8). */
export const TEMPO_DA_FAIXA_MS = 2500;
const TEMPO_SUMINDO_MS = 450;

/** Os dados a lançar, com o brilho dos d20 marcados (gamificacao-da-sala). */
export function dadosDaRolagem(rolagem: Pick<Rolagem, "grupos" | "marcas">): DadoParaAnimar[] {
  return rolagem.grupos.flatMap((grupo) => grupo.valores.flatMap((valor, indice) => {
    const destaque = marcaDoDado(rolagem, grupo.faces, indice);
    return dadosParaAnimar(grupo.faces, valor).map((dado) => (destaque ? { ...dado, destaque } : dado));
  }));
}

/**
 * Camada dos dados 3D por cima do tabuleiro (melhorias-da-sala, item 3). `animar` resolve quando os dados
 * param, ou na hora se não houver o que animar ou o navegador não desenhar em 3D. A camada não recebe
 * cliques e é ignorada por leitores de tela. Com uma marca de crítico, mostra a faixa "Crítico!" ou "Falha crítica!"
 * quando os dados param; o anúncio para leitores de tela fica com a aba Dados.
 */
export function useDadosNoTabuleiro() {
  const camada = useRef<HTMLDivElement>(null);
  const mesa = useRef<MesaDeDados | null>(null);
  const vez = useRef(0);
  const temporizadores = useRef<number[]>([]);
  const [sumindo, setSumindo] = useState(false);
  const [faixa, setFaixa] = useState<{ tipo: MarcaDoDado["tipo"]; vez: number } | null>(null);

  const desmontar = useCallback(() => {
    temporizadores.current.forEach((id) => window.clearTimeout(id));
    temporizadores.current = [];
    mesa.current?.destruir();
    mesa.current = null;
  }, []);
  useEffect(() => desmontar, [desmontar]);

  const animar = useCallback(async (rolagem: Pick<Rolagem, "grupos" | "marcas">): Promise<void> => {
    const dados = dadosDaRolagem(rolagem);
    const elemento = camada.current;
    if (!elemento || dados.length === 0 || dados.length > MAXIMO_DE_DADOS_ANIMADOS) return;
    const minha = ++vez.current;
    desmontar();
    setSumindo(false);
    setFaixa(null);
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
    const destaque = destaqueDaRolagem(rolagem);
    if (destaque) {
      setFaixa({ tipo: destaque, vez: minha });
      temporizadores.current.push(window.setTimeout(() => setFaixa((atual) => (atual?.vez === minha ? null : atual)),
        TEMPO_DA_FAIXA_MS));
    }
    temporizadores.current.push(window.setTimeout(() => {
      setSumindo(true);
      temporizadores.current.push(window.setTimeout(() => { if (minha === vez.current) { desmontar(); setSumindo(false); } }, TEMPO_SUMINDO_MS));
    }, TEMPO_PARADOS_MS));
  }, [desmontar]);

  const elemento = <>
    <div ref={camada} className={`dados-no-tabuleiro${sumindo ? " dados-no-tabuleiro--sumindo" : ""}`} aria-hidden="true" />
    {faixa && <div key={faixa.vez} className={`faixa-de-critico faixa-de-critico--${faixa.tipo}`} aria-hidden="true">
      <span className="faixa-de-critico__texto">{NOME_DA_MARCA[faixa.tipo]}!</span>
    </div>}
  </>;
  return { camada: elemento, animar };
}
