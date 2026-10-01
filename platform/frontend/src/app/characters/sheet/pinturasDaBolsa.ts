import { useEffect, useState } from "react";

/*
 * Pinturas da bolsa do Inventário (D1, itens 4 e 5): as laterais, como um lanche, e a tampa aberta no
 * alto com a base no pé. Todas são opcionais (arte/prompts.md) e carregam em dois grupos
 * independentes. Enquanto um grupo carrega, a bolsa já reserva o espaço dele, sem desenhar nada, e
 * nada se move quando as imagens chegam. Só se alguma parte falhar a bolsa volta ao desenho em
 * SVG/CSS, e esse salto acontece uma vez só: o resultado vale para a sessão inteira.
 */
export type EstadoPinturas = "carregando" | "prontas" | "ausentes";
export type Grupo = "laterais" | "tampa-e-base";

const PASTA = "/arte/inventario";
export const PARTES_DO_LADO = ["topo", "miolo", "base"] as const;
export const PARTES_DA_BASE = ["esquerda", "miolo", "direita"] as const;
export const arteDoLado = (lado: "esquerdo" | "direito", parte: (typeof PARTES_DO_LADO)[number]) =>
  `${PASTA}/inventario-lado-${lado}-${parte}.webp`;
export const ARTE_DA_TAMPA = `${PASTA}/inventario-tampa.webp`;
export const arteDaBase = (parte: (typeof PARTES_DA_BASE)[number]) => `${PASTA}/inventario-base-${parte}.webp`;

export const ARTES: Record<Grupo, readonly string[]> = {
  laterais: (["esquerdo", "direito"] as const).flatMap((lado) => PARTES_DO_LADO.map((parte) => arteDoLado(lado, parte))),
  "tampa-e-base": [ARTE_DA_TAMPA, ...PARTES_DA_BASE.map(arteDaBase)],
};

const estados = new Map<Grupo, EstadoPinturas>();
// Tamanho natural de cada parte, lido no pré-carregamento: o <img> nasce com a proporção certa e
// não empurra nada quando termina de decodificar.
const tamanhos = new Map<string, { width: number; height: number }>();

export function tamanhoDaArte(url: string) {
  return tamanhos.get(url);
}

export function usePinturas(grupo: Grupo): EstadoPinturas {
  const [estado, setEstado] = useState<EstadoPinturas>(
    () => estados.get(grupo) ?? (typeof Image === "undefined" ? "ausentes" : "carregando"));
  useEffect(() => {
    if (estados.has(grupo) || typeof Image === "undefined") return undefined;
    let ativo = true;
    let faltam = ARTES[grupo].length;
    const concluir = (resultado: EstadoPinturas) => {
      if (estados.has(grupo)) return;
      estados.set(grupo, resultado);
      if (ativo) setEstado(resultado);
    };
    const imagens = ARTES[grupo].map((url) => {
      const imagem = new Image();
      imagem.onload = () => {
        tamanhos.set(url, { width: imagem.naturalWidth, height: imagem.naturalHeight });
        faltam -= 1;
        if (faltam === 0) concluir("prontas");
      };
      imagem.onerror = () => concluir("ausentes");
      imagem.src = url;
      return imagem;
    });
    return () => { ativo = false; for (const imagem of imagens) { imagem.onload = null; imagem.onerror = null; } };
  }, [grupo]);
  return estado;
}

/** Só para testes: esquece o carregamento das pinturas. */
export function esquecerPinturas() { estados.clear(); tamanhos.clear(); }
