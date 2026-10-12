/**
 * Contraste dos tokens do tema (requisito "Contraste, foco e estados sem depender de cor").
 * Lê o texto de `tokens.css`, resolve `var()` por escopo (`:root` e `.tema-pergaminho`) e
 * calcula a razão de contraste da WCAG 2.
 */

export type Escopo = "noite" | "pergaminho";

const BLOCOS: Record<Escopo, string[]> = {
  noite: [":root"],
  pergaminho: [":root", ".tema-pergaminho"],
};

/** Declarações `--nome: valor` de cada bloco, na ordem em que aparecem. */
function declaracoes(css: string): { seletor: string; nome: string; valor: string }[] {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const saida: { seletor: string; nome: string; valor: string }[] = [];
  for (const bloco of semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, cabeca = "", corpo = ""] = bloco;
    const seletores = cabeca.split(",").map((s) => s.trim());
    for (const [, nome = "", valor = ""] of corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      for (const seletor of seletores) saida.push({ seletor, nome, valor: valor.trim() });
    }
  }
  return saida;
}

export function tokensDoEscopo(css: string, escopo: Escopo): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const { seletor, nome, valor } of declaracoes(css)) {
    if (BLOCOS[escopo].includes(seletor)) mapa.set(nome, valor);
  }
  return mapa;
}

export function resolverCor(tokens: Map<string, string>, nome: string, profundidade = 0): string {
  if (profundidade > 20) throw new Error(`Referência circular em ${nome}.`);
  const valor = tokens.get(nome);
  if (valor === undefined) throw new Error(`Token ${nome} não definido.`);
  const referencia = /^var\((--[\w-]+)\)$/.exec(valor);
  return referencia?.[1] ? resolverCor(tokens, referencia[1], profundidade + 1) : valor;
}

function canais(hex: string): [number, number, number] {
  const limpo = hex.replace("#", "");
  const completo = limpo.length === 3 ? limpo.split("").map((c) => c + c).join("") : limpo;
  if (!/^[0-9a-f]{6}$/i.test(completo)) throw new Error(`Cor sem suporte no teste de contraste: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(completo.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function luminancia(hex: string): number {
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = canais(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function razaoContraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export interface Par {
  frente: string;
  fundo: string;
  minimo: 4.5 | 3;
}

/** Pares abaixo do mínimo, com a razão encontrada. */
export function paresReprovados(css: string, escopo: Escopo, pares: Par[]): string[] {
  const tokens = tokensDoEscopo(css, escopo);
  return pares.flatMap(({ frente, fundo, minimo }) => {
    const razao = razaoContraste(resolverCor(tokens, frente), resolverCor(tokens, fundo));
    return razao >= minimo ? [] : [`${escopo}: ${frente} sobre ${fundo} = ${razao.toFixed(2)} (mínimo ${minimo})`];
  });
}
