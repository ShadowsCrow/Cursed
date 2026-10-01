import { useSyncExternalStore } from "react";

import { NOMES_ICONES_PERSONALIDADE, type NomeIconePersonalidade } from "./nomesDosIcones";

/*
 * Ícones da aba Personalidade recortados da referência do usuário (reformular-personalidade-da-ficha, D7): uma
 * máscara WebP por nome, gerada por `preparar_arte.py`. O grupo é pré-carregado uma vez por sessão, como as
 * pinturas da bolsa: com todas carregadas, a tela usa as máscaras; se alguma falhar, fica com os SVG.
 */

export type EstadoDasMascaras = "carregando" | "prontas" | "ausentes";

/** Lado, em px, do quadrado em que cada ícone aparece na referência (o mesmo de `ICONES_DA_PERSONALIDADE`). */
export const LADO_DA_MASCARA: Record<NomeIconePersonalidade, number> = {
  rosa_dos_ventos: 80, lua_solar: 80, livro_fechado: 56,
  balanca: 48, livro_aberto: 48, olho: 48, louros: 48, aranha: 48,
  caveira: 48, espadas: 48, mao: 48, ampulheta: 48, estrela: 48, lua_estrela: 48,
};

export const caminhoDaMascara = (nome: NomeIconePersonalidade) => `/arte/personalidade/icones/${nome}.webp`;

let estado: EstadoDasMascaras = "carregando";
let iniciado = false;
const ouvintes = new Set<() => void>();

function mudar(novo: EstadoDasMascaras) {
  estado = novo;
  for (const ouvir of ouvintes) ouvir();
}

function carregar() {
  if (iniciado) return;
  iniciado = true;
  if (typeof Image === "undefined") { mudar("ausentes"); return; }
  const imagens = NOMES_ICONES_PERSONALIDADE.map((nome) => new Promise<void>((resolver, rejeitar) => {
    const imagem = new Image();
    imagem.onload = () => resolver();
    imagem.onerror = () => rejeitar(new Error(nome));
    imagem.src = caminhoDaMascara(nome);
  }));
  Promise.all(imagens).then(() => mudar("prontas"), () => mudar("ausentes"));
}

function assinar(ouvir: () => void) {
  ouvintes.add(ouvir);
  carregar();
  return () => { ouvintes.delete(ouvir); };
}

/** Estado do grupo de máscaras; o primeiro uso dispara o carregamento. */
export function useMascarasDosIcones(): EstadoDasMascaras {
  return useSyncExternalStore(assinar, () => estado, () => "carregando");
}

/** Só para testes: volta ao estado inicial, para simular outra sessão. */
export function reiniciarMascarasDosIcones() {
  estado = "carregando";
  iniciado = false;
}
