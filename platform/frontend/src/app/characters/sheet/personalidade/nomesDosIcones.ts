/**
 * Nomes dos ícones da aba Personalidade (reformular-personalidade-da-ficha, D7): os de `ICONES_PERSONALIDADE` em
 * `cursed_platform/catalogos.py`; o teste confere as duas listas. Os desenhos ficam em `icones.tsx`.
 */
export const NOMES_ICONES_PERSONALIDADE = [
  "rosa_dos_ventos", "lua_solar", "livro_fechado", "balanca", "livro_aberto", "olho", "louros",
  "aranha", "caveira", "espadas", "mao", "ampulheta", "estrela", "lua_estrela",
] as const;

export type NomeIconePersonalidade = (typeof NOMES_ICONES_PERSONALIDADE)[number];

export function ehIconePersonalidade(nome: unknown): nome is NomeIconePersonalidade {
  return typeof nome === "string" && (NOMES_ICONES_PERSONALIDADE as readonly string[]).includes(nome);
}
